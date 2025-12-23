
// arb_core_refactor.cjs

"use strict";

const { performance } = require("perf_hooks");

/* ============================================================
   GRAPH / PAPER LAYER — FULLY SPARSE & MEMORY OPTIMIZED
============================================================ */

function buildEdgeIndex(edges) {
    const edgeToId = {};
    edges.forEach((e, i) => edgeToId[e[0] + "," + e[1]] = i);
    return { edgeToId, idToEdge: edges.slice() };
}

// Sparse incidence matrix: B_sparse[e] = [{node, sign}, {node, sign}]
function buildIncidenceMatrix(idToEdge) {
    const nodes = [...new Set(idToEdge.flat())];
    const nodeToId = {};
    nodes.forEach((n, i) => nodeToId[n] = i);
    const numNodes = nodes.length;
    const numEdges = idToEdge.length;

    const B_sparse = new Array(numEdges);
    idToEdge.forEach(([u, v], e) => {
        B_sparse[e] = [
            { node: nodeToId[u], sign: -1 },
            { node: nodeToId[v], sign: +1 }
        ];
    });

    return { B_sparse, numNodes, numEdges, nodeToId, nodes };
}

// Bg = B g (sparse)
function matVec_sparse(B_sparse, g, numNodes, numEdges) {
    const Bg = new Array(numNodes).fill(0);
    for (let e = 0; e < numEdges; e++) {
        const ge = g[e];
        for (const entry of B_sparse[e]) {
            Bg[entry.node] += entry.sign * ge;
        }
    }
    return Bg;
}

// Mv = B (B^T v) = B B^T v (sparse)
function matMulMatTVec_sparse(B_sparse, v, numNodes, numEdges) {
    // B^T v → edge vector
    const Btv = new Array(numEdges).fill(0);
    for (let e = 0; e < numEdges; e++) {
        for (const entry of B_sparse[e]) {
            Btv[e] += entry.sign * v[entry.node];
        }
    }

    // B (B^T v) → node vector
    const Mv = new Array(numNodes).fill(0);
    for (let e = 0; e < numEdges; e++) {
        const w = Btv[e];
        for (const entry of B_sparse[e]) {
            Mv[entry.node] += entry.sign * w;
        }
    }
    return Mv;
}

// Sparse Conjugate Gradient solver
function conjugateGradient_sparse(B_sparse, b, numNodes, numEdges, maxIter = 800, tol = 1e-8) {
    let x = new Array(numNodes).fill(0);
    let r = b.slice();
    let p = r.slice();
    let rsold = r.reduce((s, val) => s + val * val, 0);

    if (Math.sqrt(rsold) < tol) return x;

    for (let i = 0; i < maxIter; i++) {
        const Ap = matMulMatTVec_sparse(B_sparse, p, numNodes, numEdges);
        const alphaDenom = p.reduce((s, pj, j) => s + pj * Ap[j], 0);
        if (Math.abs(alphaDenom) < 1e-12) break;
        const alpha = rsold / alphaDenom;

        for (let j = 0; j < numNodes; j++) {
            x[j] += alpha * p[j];
            r[j] -= alpha * Ap[j];
        }

        const rsnew = r.reduce((s, val) => s + val * val, 0);
        if (Math.sqrt(rsnew) < tol) break;

        const beta = rsnew / rsold;
        for (let j = 0; j < numNodes; j++) {
            p[j] = r[j] + beta * p[j];
        }
        rsold = rsnew;
    }
    return x;
}

// Fully sparse projection onto cycle space
function projectToCycleSpace(idToEdge, g) {
    const { B_sparse, numNodes, numEdges } = buildIncidenceMatrix(idToEdge);
    const Bg = matVec_sparse(B_sparse, g, numNodes, numEdges);
    const y = conjugateGradient_sparse(B_sparse, Bg, numNodes, numEdges, 800);

    // c = g - B^T y
    const c = g.slice();
    for (let e = 0; e < numEdges; e++) {
        let proj = 0;
        for (const entry of B_sparse[e]) {
            proj += entry.sign * y[entry.node];
        }
        c[e] -= proj;
    }
    return c;
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

function swapOut(amountIn, reserveIn, reserveOut) {
    const amountInWithFee = amountIn * (1 - FEE);
    return (amountInWithFee * reserveOut) / (reserveIn + amountInWithFee);
}

/* ============================================================
   EXECUTION LAYER
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

function validateCycle(ordered, maxHops = 8) {
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

/**
 * Generate a large simulated dataset with 600+ pools
 */
function generateLargeSimulatedPools(numPools = 650, seed = null) {
    if (seed !== null) {
        let s = seed;
        Math.random = () => {
            s = (s * 16807) % 2147483647;
            return s / 2147483647;
        };
    }

    const tokenCount = Math.max(200, Math.floor(numPools * 0.45));
    const tokens = Array.from({ length: tokenCount }, (_, i) => `T${String(i).padStart(3, '0')}`);

    const edges = [];
    const pools = {};
    const usedPairs = new Set();
    let poolId = 0;

    while (poolId < numPools) {
        let idx1 = Math.floor(Math.random() * tokenCount);
        let idx2 = Math.floor(Math.random() * tokenCount);
        while (idx1 === idx2) idx2 = Math.floor(Math.random() * tokenCount);

        const token0 = tokens[idx1];
        const token1 = tokens[idx2];
        const sortedPair = token0 < token1 ? [token0, token1] : [token1, token0];
        const pairKey = sortedPair.join(',');

        if (usedPairs.has(pairKey)) continue;

        usedPairs.add(pairKey);
        edges.push(sortedPair);

        const baseReserve = 1e4 + Math.random() * 9.99e6;
        const hasImbalance = Math.random() < 0.05;
        const imbalanceFactor = hasImbalance
            ? 0.4 + Math.random() * 2.2
            : 0.9 + Math.random() * 0.2;

        const reserve0 = baseReserve;
        const reserve1 = baseReserve * imbalanceFactor;

        pools[poolId] = {
            token0: sortedPair[0],
            token1: sortedPair[1],
            reserve0,
            reserve1
        };

        poolId++;
    }

    console.log(`\nGenerated ${poolId} pools across ${tokens.length} tokens`);
    console.log(`≈ ${Math.round(poolId * 0.05)} pools have strong imbalances → expect multiple arbs\n`);

    return { tokens, edges, pools };
}

/* ============================================================
   MAIN
============================================================ */

function run(preferredToken = null) {
    const t0 = performance.now();

    const edges = [["USDT","WETH"],["WETH","BRL"],
                    ["BRL","HSK"],["HSK","USDT"]];

                     // Pools with reserves ONLY (truth source) 
    const pools = { 
        0: { token0:"USDT", token1:"WETH", reserve0:1e6, reserve1:3e6 }, 
        1: { token0:"WETH", token1:"BRL", reserve1:5e6, reserve0:2e6 },
        2: { token0:"BRL", token1:"HSK", reserve0:1e6, reserve1:5e6 },
        3: { token0:"HSK", token1:"USDT", reserve0:1e6, reserve1:2e6 }  
    }; 

    //const { edges, pools } = generateLargeSimulatedPools(200, 12345);

    const { idToEdge } = buildEdgeIndex(edges);
    const t1 = performance.now();

    const g = idToEdge.map(([u, v], i) => {
        const p = pools[i];
        const rate = p.token0 === u
            ? p.reserve1 / p.reserve0
            : p.reserve0 / p.reserve1;
        return -Math.log(rate);
    });

    const c = projectToCycleSpace(idToEdge, g);
    const cycles = extractAllCycles(idToEdge, c);
    const t3 = performance.now();

    //console.log(`Detected ${cycles.length} raw cycle(s) in large graph`);
    //console.log(`Cycle detection time: ${(t3 - t1).toFixed(2)} ms\n`);

    const seenCycles = new Set();

    for (const cyc of cycles) {
        let ordered = orderCycle(cyc);
        if (!ordered || !validateCycle(ordered)) continue;

        let { optimalInput, optimalProfit } = findOptimalInput({
            ordered, pools, minIn: 1, maxIn: 100_000
        });

        let bestOrdered = ordered;
        let bestTrace = simulateCycle(ordered, pools, optimalInput).trace;

        const reversed = ordered.slice().reverse().map(t => ({
            from: t.to,
            to: t.from,
            eid: t.eid
        }));

        if (validateCycle(reversed)) {
            const revResult = findOptimalInput({ ordered: reversed, pools });
            if (revResult.optimalProfit > optimalProfit) {
                optimalInput = revResult.optimalInput;
                optimalProfit = revResult.optimalProfit;
                bestOrdered = reversed;
                bestTrace = simulateCycle(reversed, pools, optimalInput).trace;
            }
        }
        
        if (optimalProfit <= 0) continue;

        function cycleKey(ordered) {
            const tokens = ordered.map(t => t.from);
            const minIdx = tokens.reduce((acc, curr, idx, arr) =>
                (curr < arr[acc] ? idx : acc), 0);
            const rotated = [...tokens.slice(minIdx), ...tokens.slice(0, minIdx)];
            const revRotated = [...rotated].reverse();
            return (rotated.join(",") < revRotated.join(",") ? rotated : revRotated).join(",");
        }

        const key = cycleKey(bestOrdered);
        if (seenCycles.has(key)) continue;
        seenCycles.add(key);

        if (preferredToken !== null) {
            const tokensInCycle = bestOrdered.map(t => t.from);
            if (!tokensInCycle.includes(preferredToken)) continue;
            const startIdx = tokensInCycle.indexOf(preferredToken);
            bestOrdered = [...bestOrdered.slice(startIdx), ...bestOrdered.slice(0, startIdx)];
            bestTrace = [...bestTrace.slice(startIdx), ...bestTrace.slice(0, startIdx)];
        }

        const t4 = performance.now();

        console.log(`\nARB FOUND (profit: ${optimalProfit.toFixed(2)})`);
        if (preferredToken) console.log(`Cycled through: ${preferredToken}`);
        bestTrace.forEach(t =>
            console.log(`${t.pool}: ${t.from}→${t.to} | ${t.in.toFixed(0)} → ${t.out.toFixed(0)}`)
        );
        console.log("OPTIMAL INPUT:", optimalInput.toFixed(0));
        console.log("OPTIMAL PROFIT:", optimalProfit.toFixed(2));
        console.log("Total time:", (t4 - t0).toFixed(2), "ms\n");

        console.log(
            "Direction auto-selected:",
            bestOrdered[0].from,
            "start\n"
          )

    }

    if (seenCycles.size === 0) {
        console.log("No profitable arbitrage found in this simulation.");
    }
}

run("HSK");  // Use run("T042") to filter by token