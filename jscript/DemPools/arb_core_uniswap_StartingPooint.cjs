// arb_core_refactor.cjs

/*

    PATCH 1 — Rates come from reserves ONLY
    PATCH 2 — Optimal sizing (not fixed inputAmount)
    PATCH 3 — Early hop pruning (≤ N hops)
    PATCH 4 — Cycle math ≠ execution math (explicit separation)

    FEATURE 1 — Deterministic execution trace
    FEATURE 2 — Explicit rejection reasons
    FEATURE 3 — Bidirectional pools handled correctly

    C. What is EXPLICITLY OUT OF SCOPE (for now)

To avoid confusion and trust erosion:

❌ Flashbots submission
❌ Profit-per-block statistics
❌ Multi-block state tracking
❌ Bundle simulation
❌ Gas oracle integration

🚫 What we intentionally did NOT add (yet)

Because you asked for discipline:

❌ Flashbots

❌ Gas modeling

❌ Block competition

❌ Multi-bundle strategy

Those come after this layer is rock solid.

Next (only when YOU say)

The next real upgrades are, in correct order:

Liquidity-bounded max input (per pool)

Cycle deduplication / dominance pruning

Cross-cycle capital allocation

Gas break-even constraint

MEV submission logic

update

*/

"use strict";

/*
    CORE ARBITRAGE ENGINE — CLEAN VERSION

    ✔ Cycle detection via projection (paper logic)
    ✔ Direction-aware AMM execution
    ✔ Slippage-aware profit simulation
    ✔ Deterministic execution trace
    ✔ No rateMap leakage into execution

    TEMPORARY:
    - Fixed inputAmount (clearly marked)
*/

const { performance } = require("perf_hooks");

/* ============================================================
   GRAPH / PAPER LAYER
============================================================ */

function buildEdgeIndex(edges) {
    const edgeToId = {};
    edges.forEach((e, i) => edgeToId[e[0] + "," + e[1]] = i);
    return { edgeToId, idToEdge: edges.slice() };
}

function buildIncidenceMatrix(idToEdge) {
    const nodes = [...new Set(idToEdge.flat())];
    const nodeToId = {};
    nodes.forEach((n, i) => nodeToId[n] = i);

    const B = Array.from({ length: nodes.length },
        () => new Array(idToEdge.length).fill(0));

    idToEdge.forEach(([u, v], e) => {
        B[nodeToId[u]][e] = -1;
        B[nodeToId[v]][e] = +1;
    });

    return { B };
}

function matVec(A, x) {
    return A.map(r => r.reduce((s, v, i) => s + v * x[i], 0));
}

function matMulMatT(A) {
    const n = A.length;
    const m = A[0].length;
    const M = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++)
        for (let j = i; j < n; j++) {
            let s = 0;
            for (let k = 0; k < m; k++) s += A[i][k] * A[j][k];
            M[i][j] = M[j][i] = s;
        }
    return M;
}

function solveLinearSystem(M, b) {
    const n = M.length;
    M = M.map(r => r.slice());
    b = b.slice();

    for (let i = 0; i < n; i++) {
        let p = i;
        for (let r = i + 1; r < n; r++)
            if (Math.abs(M[r][i]) > Math.abs(M[p][i])) p = r;
        [M[i], M[p]] = [M[p], M[i]];
        [b[i], b[p]] = [b[p], b[i]];

        const d = M[i][i] || 1e-12;
        for (let j = i; j < n; j++) M[i][j] /= d;
        b[i] /= d;

        for (let r = 0; r < n; r++) {
            if (r === i) continue;
            const f = M[r][i];
            for (let j = i; j < n; j++) M[r][j] -= f * M[i][j];
            b[r] -= f * b[i];
        }
    }
    return b;
}

function projectToCycleSpace(idToEdge, g) {
    const { B } = buildIncidenceMatrix(idToEdge);
    const Bg = matVec(B, g);
    const M = matMulMatT(B);
    const y = solveLinearSystem(M, Bg);

    return g.map((gi, e) =>
        gi - B.reduce((s, r, i) => s + r[e] * y[i], 0)
    );
}

function extractAllCycles(edges, c, eps = 1e-12) {
    const adj = new Map();
    for (let e = 0; e < edges.length; e++) {
        if (Math.abs(c[e]) < eps) continue;
        const [u, v] = edges[e];
        const dir = c[e] > 0 ? [u, v] : [v, u];
        if (!adj.has(dir[0])) adj.set(dir[0], []);
        adj.get(dir[0]).push({ to: dir[1], eid: e });
    }

    const cycles = [];
    for (const start of adj.keys()) {
        const stack = [];
        const seen = new Set();

        function dfs(u) {
            if (seen.has(u)) {
                const i = stack.findIndex(x => x.from === u);
                if (i >= 0) cycles.push(stack.slice(i));
                return;
            }
            seen.add(u);
            for (const e of adj.get(u) || []) {
                stack.push({ from: u, to: e.to, eid: e.eid });
                dfs(e.to);
                stack.pop();
            }
            seen.delete(u);
        }
        dfs(start);
    }
    return cycles;
}

// =======================
// AMM PRIMITIVES
// =======================

const FEE = 0.003;

function spotRate(reserveIn, reserveOut) {
    return (reserveOut / reserveIn) * (1 - FEE);
}

function swapOut(amountIn, reserveIn, reserveOut) {
    const amountInWithFee = amountIn * (1 - FEE);
    return (amountInWithFee * reserveOut) / (reserveIn + amountInWithFee);
}


/* ============================================================
   EXECUTION LAYER (AMM REALITY)
============================================================ */

function orderCycle(trades) {
    const byFrom = new Map();
    trades.forEach(t => {
        if (!byFrom.has(t.from)) byFrom.set(t.from, []);
        byFrom.get(t.from).push(t);
    });

    const ordered = [];
    let cur = trades[0].from;

    while (true) {
        const list = byFrom.get(cur);
        if (!list || !list.length) return null;
        const t = list.pop();
        ordered.push(t);
        cur = t.to;
        if (cur === ordered[0].from) break;
        if (ordered.length > trades.length) return null;
    }
    return ordered.length === trades.length ? ordered : null;
}

function validateCycle(ordered, maxHops = 6) {
    if (!ordered || ordered.length < 2 || ordered.length > maxHops) return false;
    if (ordered[0].from !== ordered.at(-1).to) return false;

    const seen = new Set();
    for (const t of ordered) {
        if (seen.has(t.from)) return false;
        seen.add(t.from);
    }
    return true;
}

function simulateCycle(ordered, pools, inputAmount) {
    let amt = inputAmount;
    const trace = [];

    for (const t of ordered) {
        const p = pools[t.eid];
        const [rin, rout] =
            t.from === p.token0
                ? [p.reserve0, p.reserve1]
                : [p.reserve1, p.reserve0];

        const ain = amt * 0.997;
        const aout = (ain * rout) / (rin + ain);

        trace.push({
            pool: `${p.token0}/${p.token1}`,
            from: t.from,
            to: t.to,
            in: amt,
            out: aout
        });

        amt = aout;
    }

    return { profit: amt - inputAmount, trace };
}

function findOptimalInput({
    ordered,
    pools,
    minIn = 1e-6,
    maxIn = 1e6,
    iters = 60
}) {
    let lo = minIn;
    let hi = maxIn;

    let bestX = 0;
    let bestP = -Infinity;

    for (let i = 0; i < iters; i++) {
        const m1 = lo + (hi - lo) / 3;
        const m2 = hi - (hi - lo) / 3;

        const p1 = simulateCycle(ordered, pools, m1).profit;
        const p2 = simulateCycle(ordered, pools, m2).profit;

        if (p1 > p2) {
            hi = m2;
            if (p1 > bestP) { bestP = p1; bestX = m1; }
        } else {
            lo = m1;
            if (p2 > bestP) { bestP = p2; bestX = m2; }
        }
    }

    return {
        optimalInput: bestX,
        optimalProfit: bestP
    };
}


/* ============================================================
   MAIN — HARD CODED TEST
============================================================ */

function run(preferredToken = "WETH") {  // Add param, default to "A" for testing
    const t0=performance.now();
    const edges = [["USDT","WETH"],["WETH","BRL"],
                    ["BRL","HSK"],["HSK","USDT"]];

    const { idToEdge } = buildEdgeIndex(edges);
    const t1=performance.now();

    // Pools with reserves ONLY (truth source) 
    const pools = { 
        0: { token0:"USDT", token1:"WETH", reserve0:1e6, reserve1:3e6 }, 
        1: { token0:"WETH", token1:"BRL", reserve1:5e6, reserve0:2e6 },
        2: { token0:"BRL", token1:"HSK", reserve0:1e6, reserve1:5e6 },
        3: { token0:"HSK", token1:"USDT", reserve0:1e6, reserve1:2e6 }  
    };

    // infinitesimal rates ONLY for cycle detection
    const g = idToEdge.map(([u,v], i) => {
        const p = pools[i];
        const rate = p.token0 === u
            ? p.reserve1 / p.reserve0
            : p.reserve0 / p.reserve1;
        return -Math.log(rate);
    });

    const c = projectToCycleSpace(idToEdge, g);
    
    const cycles = extractAllCycles(idToEdge, c);
     const t3=performance.now();
    //console.log(`Detected ${cycles.length} raw cycle(s)\n`);
    //console.log(`Detedcted in`, (t3-t2).toFixed(2),"ms");

    const seenCycles = new Set();

    for (const cyc of cycles) {
        let ordered = orderCycle(cyc);
        if (!ordered || !validateCycle(ordered)) continue;

        // Try forward direction
        let { optimalInput, optimalProfit } = findOptimalInput({
            ordered, pools, minIn: 1, maxIn: 100_000
        });

        let bestOrdered = ordered;
        let bestTrace = simulateCycle(ordered, pools, optimalInput).trace;

        // Try reverse direction
        const reversed = ordered.slice().reverse().map(t => ({
            from: t.to,
            to: t.from,
            eid: t.eid
        }));

        if (validateCycle(reversed)) {
            const revResult = findOptimalInput({
                ordered: reversed, pools, minIn: 1, maxIn: 100_000
            });
            if (revResult.optimalProfit > optimalProfit) {
                optimalInput = revResult.optimalInput;
                optimalProfit = revResult.optimalProfit;
                bestOrdered = reversed;
                bestTrace = simulateCycle(reversed, pools, optimalInput).trace;
            }
        }

        if (optimalProfit <= 0) continue;

        // FIXED: Normalize cycle to a canonical representation
        function cycleKey(ordered) {
            const tokens = ordered.map(t => t.from);
            // Rotate to start with the lexicographically smallest token
            // FIXED reducer: use acc as index, compare arr[acc]
            const minIdx = tokens.reduce((acc, curr, idx, arr) => 
                (curr < arr[acc] ? idx : acc), 0);
            const rotated = [...tokens.slice(minIdx), ...tokens.slice(0, minIdx)];
            // If reverse order is smaller, use it
            const revRotated = [...rotated].reverse();
            const key = (rotated.join(",") < revRotated.join(",") ? rotated : revRotated).join(",");
            return key;
        }

        const key = cycleKey(bestOrdered);
        if (seenCycles.has(key)) continue;  // skip duplicate
        seenCycles.add(key);

        // NEW: Rotate to start with preferredToken if possible
        const tokensInCycle = bestOrdered.map(t => t.from);
        if (!tokensInCycle.includes(preferredToken)) {
            console.log(`Skipping cycle (does not include ${preferredToken})`);
            continue;
        }
        const startIdx = tokensInCycle.indexOf(preferredToken);
        bestOrdered = [...bestOrdered.slice(startIdx), ...bestOrdered.slice(0, startIdx)];
        bestTrace = [...bestTrace.slice(startIdx), ...bestTrace.slice(0, startIdx)];

        const t4=performance.now();
        // Now log it — only once per unique cycle, cycled through preferred token
        console.log(`\nARB FOUND (deduplicated, cycled through ${preferredToken})`);
        bestTrace.forEach(t =>
            console.log(
                `${t.pool}: ${t.from}→${t.to} | ` +
                `${t.in.toFixed(2)} → ${t.out.toFixed(2)}`
            )
        );


        console.log("OPTIMAL INPUT:", optimalInput.toFixed(2));
        console.log("OPTIMAL PROFIT:", optimalProfit.toFixed(2));
        console.log("Direction auto-selected:", bestOrdered[0].from + " start\n");
        
        console.log("Total time:", (t4-t0).toFixed(2),"ms");
    }
}

run("USDT")