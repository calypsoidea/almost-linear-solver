
// arb_demo_fixed2.js
// Tiny Uniswap-style arbitrage example using tree-based oblivious routing A.
// Corrected: columns are edge-indexed & sign fixed so B^T (A d) = d.

function log(...args) { console.log(...args); }

// ---------------- utils ----------------

function buildEdgeIndex(edges) {
    const edgeToId = {};
    edges.forEach((e, i) => { edgeToId[e[0] + "," + e[1]] = i; });
    const idToEdge = edges.slice();
    return { edgeToId, idToEdge };
}

function buildEdgeToIdMap(idToEdge) {
    const map = {};
    idToEdge.forEach(([u,v], i) => map[u + "," + v] = i);
    return map;
}

// Compute d = B^T x (incoming - outgoing)
function divergenceFromEdgeVector(idToEdge, x) {
    const nodes = [...new Set(idToEdge.flat())].sort();
    const nodeToId = {};
    nodes.forEach((n, i) => nodeToId[n] = i);

    const d = new Array(nodes.length).fill(0);
    idToEdge.forEach(([u, v], eid) => {
        const val = x[eid];
        d[nodeToId[v]] += val;    // incoming to v
        d[nodeToId[u]] -= val;    // outgoing from u
    });
    return { d, nodes, nodeToId };
}

// Compute B^T * x for arbitrary edge vector x (for checking)
function divergenceFromEdgeVector_generic(idToEdge, x) {
    return divergenceFromEdgeVector(idToEdge, x);
}

// ---------------- build A ----------------
// Build A_cols: node -> array of [eid, coeff] representing edge-indexed flow when routing 1 unit from node -> root
function buildTreeA(edges, nodes, root) {
    // undirected adjacency
    const adj = {};
    nodes.forEach(n => adj[n] = []);
    edges.forEach(([u,v]) => { adj[u].push(v); adj[v].push(u); });

    // BFS tree
    const parent = {};
    const visited = new Set();
    const q = [root];
    visited.add(root);
    parent[root] = null;
    while (q.length > 0) {
        const u = q.shift();
        for (const v of adj[u]) {
            if (!visited.has(v)) {
                visited.add(v);
                parent[v] = u;
                q.push(v);
            }
        }
    }
    if (visited.size !== nodes.length) throw new Error("Graph not connected");

    const { idToEdge } = buildEdgeIndex(edges);
    const edgeToId = buildEdgeToIdMap(idToEdge);
    const m = edges.length;

    // For each node v produce sparse column (edge-indexed)
    const A_cols = {};
    nodes.forEach(v => {
        if (v === root) { A_cols[v] = []; return; }
        // path v -> root
        let cur = v;
        const steps = [];
        while (parent[cur] !== null) {
            const p = parent[cur];
            // step cur -> p (we want a flow that sends from cur to p)
            steps.push([cur, p]);
            cur = p;
        }
        // convert steps into edge ids & signs, then negate all coefficients
        // (negation fixes the sign so B^T col = e_v - e_root)
        const colMap = {};
        steps.forEach(([a,b]) => {
            const keyFwd = a + "," + b;
            const keyRev = b + "," + a;
            if (edgeToId.hasOwnProperty(keyFwd)) {
                const eid = edgeToId[keyFwd];
                colMap[eid] = (colMap[eid] || 0) + 1.0;
            } else if (edgeToId.hasOwnProperty(keyRev)) {
                const eid = edgeToId[keyRev];
                colMap[eid] = (colMap[eid] || 0) - 1.0;
            } else {
                throw new Error(`Tree step ${a}->${b} has no corresponding directed edge`);
            }
        });
        // NEGATE map to ensure correct orientation (so B^T (A[:,v]) = e_v - e_root)
        const sparse = Object.entries(colMap).map(([eid, coeff]) => [parseInt(eid,10), -coeff]);
        A_cols[v] = sparse;
    });

    return A_cols;
}

// Apply A_cols: f = A * d
function applyACols(A_cols, d, nodeToId, m) {
    const f = new Array(m).fill(0);
    for (const v in A_cols) {
        const dv = d[nodeToId[v]];
        if (Math.abs(dv) < 1e-18) continue;
        for (const [eid, coeff] of A_cols[v]) {
            f[eid] += coeff * dv;
        }
    }
    return f;
}

// ---------------- circulation decomposition ----------------

function decomposeCirculation(idToEdge, c, tol = 1e-12) {
    const residual = {};
    const addEdge = (u, v, amt) => {
        if (!residual[u]) residual[u] = {};
        residual[u][v] = (residual[u][v] || 0) + amt;
    };
    idToEdge.forEach(([u,v], eid) => {
        const val = c[eid];
        if (Math.abs(val) < tol) return;
        if (val > 0) addEdge(u, v, val);
        else addEdge(v, u, -val);
    });

    const cycles = [];
    while (true) {
        const visited = new Set();
        const stack = new Set();
        const parent = {};
        let foundCycle = null;

        function dfs(u) {
            if (foundCycle) return;
            visited.add(u);
            stack.add(u);
            const nb = residual[u] || {};
            for (const v in nb) {
                if (nb[v] <= tol) continue;
                if (!visited.has(v)) {
                    parent[v] = u;
                    dfs(v);
                } else if (stack.has(v)) {
                    // assemble cycle edges from v .. u .. v
                    const cyc = [];
                    let cur = u;
                    cyc.push([u, v]);
                    while (cur !== v) {
                        const p = parent[cur];
                        cyc.push([p, cur]);
                        cur = p;
                    }
                    foundCycle = cyc.reverse();
                    return;
                }
            }
            stack.delete(u);
        }

        for (const u in residual) {
            if (!visited.has(u)) dfs(u);
            if (foundCycle) break;
        }
        if (!foundCycle) break;

        let minamt = Infinity;
        foundCycle.forEach(([u,v]) => { minamt = Math.min(minamt, residual[u][v]); });

        const cyc_eids = [];
        foundCycle.forEach(([u,v]) => {
            let found = false;
            idToEdge.forEach(([a,b], eid) => {
                if (a === u && b === v) { cyc_eids.push([eid, +1]); found = true; }
                else if (a === v && b === u) { cyc_eids.push([eid, -1]); found = true; }
            });
            if (!found) throw new Error("Cycle edge not found");
        });

        cycles.push({ cyc_eids, amt: minamt });
        foundCycle.forEach(([u,v]) => {
            residual[u][v] -= minamt;
            if (residual[u][v] <= tol) delete residual[u][v];
        });
    }
    return cycles;
}

// ---------------- toy Uniswap example ----------------

/* function toyUniswapExample() {
    const nodes = ["A", "B", "C"];
    const edges = [["A", "B"], ["B", "C"], ["C", "A"]];
    const { edgeToId, idToEdge } = buildEdgeIndex(edges);

    const rates = { "A,B":0.99, "B,C":1.02, "C,A":1.01 };

    const m = edges.length;
    const g = new Array(m).fill(0);
    edges.forEach(([u,v], eid) => { const r = rates[u + "," + v]; g[eid] = -Math.log(r); });

    const L = new Array(m).fill(1);

    // build A and apply
    // const A_cols = buildTreeA(edges, nodes, "A"); //  [ [ 0, -1 ], [ 2, -1 ], [ 1, -1 ] ]
     const A_cols = buildTreeA(edges, nodes, "B"); // cycle: [ [ 0, -1 ], [ 2, -1 ], [ 1, -1 ] ]
    //const A_cols = buildTreeA(edges, nodes, "C"); //  cycle: [ [ 0, 1 ], [ 1, 1 ], [ 2, 1 ] ]
    const { d, nodes: nodesOut, nodeToId } = divergenceFromEdgeVector(idToEdge, g);
    const f = applyACols(A_cols, d, nodeToId, m);
    const c = g.map((gi, i) => gi - f[i]);

    // verify divergence of c (should be near zero)
    const check = divergenceFromEdgeVector_generic(idToEdge, c);

    // decompose cycles
    const cycles = decomposeCirculation(idToEdge, c);

    // evaluate cycles
    const evaluated = cycles.map(({cyc_eids, amt}) => {
        const delta = new Array(m).fill(0);
        cyc_eids.forEach(([eid, sign]) => delta[eid] += sign * amt);
        const num = g.reduce((s,gi,i) => s + gi*delta[i], 0);
        const den = delta.reduce((s,di,i) => s + Math.abs(L[i]*di), 0);
        return {cyc_eids, amt, num, den, ratio: den===0?Infinity : num/den};
    });

    // print
    log("Edges (eid,edge):", idToEdge);
    log("g = -ln(rate):", g);
    log("d = B^T g:");
    nodesOut.forEach(n => log(" ", n, d[nodeToId[n]]));
    log("f = A d:", f);
    log("c = g - f:", c);
    log("B^T c (should be near zero):", check.d);
    log("Cycles:");
    if (evaluated.length === 0) log("  (no cycles found)");
    else evaluated.forEach(ev => {
        log(" amt:", ev.amt.toFixed(9), " num:", ev.num.toFixed(9),
            " den:", ev.den.toFixed(9), " ratio:", ev.ratio.toFixed(9),
            " cycle:", ev.cyc_eids);
    });
}*/

function toyUniswapExample() {
    const nodes = ["A", "B", "C"];
    const edges = [["A", "B"], ["B", "C"], ["C", "A"]];
    const { edgeToId, idToEdge } = buildEdgeIndex(edges);

    const rates = { "A,B":0.99, "B,C":1.02, "C,A":1.01 };
    const m = edges.length;
    const g = new Array(m).fill(0);
    edges.forEach(([u,v], eid) => { const r = rates[u + "," + v]; g[eid] = -Math.log(r); });

    const L = new Array(m).fill(1);

    // Build A and apply
    const A_cols = buildTreeA(edges, nodes, "B");  // Root is 'B' now
    const { d, nodes: nodesOut, nodeToId } = divergenceFromEdgeVector(idToEdge, g);
    const f = applyACols(A_cols, d, nodeToId, m);
    const c = g.map((gi, i) => gi - f[i]);

    // Verify divergence of c (should be near zero)
    const check = divergenceFromEdgeVector_generic(idToEdge, c);

    // Decompose cycles
    const cycles = decomposeCirculation(idToEdge, c);

    // Evaluate cycles
    const evaluated = cycles.map(({cyc_eids, amt}) => {
        const delta = new Array(m).fill(0);
        cyc_eids.forEach(([eid, sign]) => delta[eid] += sign * amt);
        const num = g.reduce((s,gi,i) => s + gi*delta[i], 0);
        const den = delta.reduce((s,di,i) => s + Math.abs(L[i]*di), 0);
        return {cyc_eids, amt, num, den, ratio: den===0?Infinity : num/den};
    });

    // Print
    log("Edges (eid,edge):", idToEdge);
    log("g = -ln(rate):", g);
    log("d = B^T g:");
    nodesOut.forEach(n => log(" ", n, d[nodeToId[n]]));
    log("f = A d:", f);
    log("c = g - f:", c);
    log("B^T c (should be near zero):", check.d);
    log("Cycles:");
    if (evaluated.length === 0) log("  (no cycles found)");
    else evaluated.forEach(ev => {
        log(" amt:", ev.amt.toFixed(9), " num:", ev.num.toFixed(9),
            " den:", ev.den.toFixed(9), " ratio:", ev.ratio.toFixed(9),
            " cycle:", ev.cyc_eids);
    });
}

toyUniswapExample();
