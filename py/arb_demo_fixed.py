# arb_demo.py
# Tiny Uniswap-style arbitrage example using tree-based oblivious routing A.
# Requires: pip install numpy networkx

import math
import numpy as np
import networkx as nx

# --- Helper utilities ----------------------------------------------------

def build_edge_index(edges):
    """edges: list of (u,v). return maps and lists."""
    edge_to_id = {e: i for i, e in enumerate(edges)}
    id_to_edge = list(edges)
    return edge_to_id, id_to_edge

def divergence_from_edge_vector(id_to_edge, x):
    """Given edge vector x (length m) compute d = B.T x (len n) with node order inferred."""
    # build node index
    nodes = sorted({u for u,v in id_to_edge} | {v for u,v in id_to_edge})
    node_to_id = {n:i for i,n in enumerate(nodes)}
    d = np.zeros(len(nodes))
    for eid, (u,v) in enumerate(id_to_edge):
        val = x[eid]
        d[node_to_id[v]] += val   # incoming
        d[node_to_id[u]] -= val   # outgoing
    return d, nodes, node_to_id

def build_tree_A(edges, nodes, root="A"):
    """
    Build incidence matrix of a spanning tree for circulation formulation.
    Direction of edges inside the tree is oriented from child → parent toward root.
    """

    G = nx.Graph()                    # Undirected graph ensures connectivity
    G.add_nodes_from(nodes)
    for u,v,_ in edges:
        G.add_edge(u,v)

    # Ensure graph fully connected
    if not nx.is_connected(G):
        raise ValueError("Graph is not connected. Add missing edges or pools.")

    # Tree rooted at 'root'
    T = nx.bfs_tree(G, root)          # deterministic, root-based tree
    cols = {}

    for v in nodes:
        if v == root: continue
        path = nx.shortest_path(T, source=v, target=root)

        col = np.zeros(len(nodes))
        for i in range(len(path)-1):
            a = nodes.index(path[i])
            b = nodes.index(path[i+1])
            col[a] += 1
            col[b] -= 1
        cols[v] = col

    A = np.column_stack(list(cols.values()))
    return A

def apply_A_cols(A_cols, d, node_to_id, m):
    """Compute f = A d where A stored as columns map A_cols[v] -> list(eid, coeff)."""
    f = np.zeros(m)
    for node, val in d.items() if isinstance(d, dict) else []:
        pass
    # d is numpy vector; nodes implied by A_cols keys ordering
    nodes = list(A_cols.keys())
    for v in nodes:
        dv = d[node_to_id[v]]
        if abs(dv) < 1e-15: continue
        for (eid, coeff) in A_cols[v]:
            f[eid] += coeff * dv
    return f

def decompose_circulation(id_to_edge, c, tol=1e-12):
    """Decompose circulation c into simple cycles (greedy). Returns list of (cycle_edge_list, amount)."""
    # Build residual graph with signed edges
    nodes = sorted({u for u,v in id_to_edge} | {v for u,v in id_to_edge})
    node_to_id = {n:i for i,n in enumerate(nodes)}
    # create adjacency with amounts
    from collections import defaultdict, deque
    # Use dynamic adjacency: for each eid if c>0 add edge (u->v) with weight c; if c<0 add (v->u)
    residual = defaultdict(lambda: {})  # residual[u][v] = amount
    for eid, (u,v) in enumerate(id_to_edge):
        val = c[eid]
        if abs(val) < tol: continue
        if val > 0:
            residual[u][v] = residual[u].get(v, 0.0) + val
        else:
            residual[v][u] = residual[v].get(u, 0.0) + (-val)
    cycles = []
    # loop until no edges
    while True:
        # build a directed graph for cycle detection
        H = nx.DiGraph()
        for u in residual:
            for v in residual[u]:
                if residual[u][v] > tol:
                    H.add_edge(u, v)
        try:
            cycle = nx.find_cycle(H)
        except nx.exception.NetworkXNoCycle:
            break
        # cycle is list of edges (u,v)
        # find min amt
        minamt = float('inf')
        for (u,v) in cycle:
            amt = residual[u][v]
            if amt < minamt: minamt = amt
        # map to eids
        cycle_eids = []
        for (u,v) in cycle:
            # find original eid: check (u,v) or (v,u)
            found = False
            for eid,(a,b) in enumerate(id_to_edge):
                if (a==u and b==v):
                    cycle_eids.append((eid, +1))  # positive orientation
                    found = True
                    break
                if (a==v and b==u):
                    cycle_eids.append((eid, -1))  # used reverse
                    found = True
                    break
            if not found:
                raise RuntimeError("Edge in residual not found in original edges")
        # record cycle
        cycles.append((cycle_eids, minamt))
        # subtract minamt along cycle
        for (u,v) in cycle:
            residual[u][v] -= minamt
            if residual[u][v] <= 1e-15:
                del residual[u][v]
    return cycles

# --- Setup a tiny Uniswap-like toy graph --------------------------------

def toy_uniswap_example():
    # tokens A,B,C
    nodes = ["A","B","C"]
    # directed swap edges (we assume direction is swap from token X to token Y using price rate r_xy)
    edges = [("A","B"), ("B","C"), ("C","A")]
    edge_to_id, id_to_edge = build_edge_index(edges)

    # hypothetical rates 1 unit of X -> r units of Y (post-fees)
    rates = {
        ("A","B"): 0.99,
        ("B","C"): 1.02,
        ("C","A"): 1.01
    }

    # compute gradient g = -ln(rate) (so sum negative means product>1, good arbitrage)
    m = len(edges)
    g = np.zeros(m)
    for eid,(u,v) in enumerate(id_to_edge):
        r = rates[(u,v)]
        g[eid] = -math.log(r)

    # lengths L (for normalization) take 1 for all
    L = np.ones(m)

    # Build A (single tree rooted at 'A')
    A_cols = build_tree_A(edges, nodes, root="A")

    # compute d = B.T g
    d, nodes_out, node_to_id = divergence_from_edge_vector(id_to_edge, g)
    # compute f = A d
    f = apply_A_cols(A_cols, d, node_to_id, m)
    # compute c = g - f
    c = g - f

    # decompose c into cycles
    cycles = decompose_circulation(id_to_edge, c)

    # evaluate cycles
    evaluated = []
    for cyc_eids, amt in cycles:
        # build cycle vector Δ
        delta = np.zeros(m)
        for (eid, sign) in cyc_eids:
            delta[eid] += sign * amt
        num = float(np.dot(g, delta))
        den = float(np.sum(np.abs(L * delta)))
        ratio = num / den if den != 0 else float('inf')
        evaluated.append((cyc_eids, amt, num, den, ratio))

    # print results
    print("Edges (eid,edge):", id_to_edge)
    print("g (edge gradients = -ln(rate)):", np.round(g, 8))
    print("d = B^T g (node divergence):")
    for n in nodes_out:
        print(" ", n, round(d[node_to_id[n]], 8))
    print("f = A d (routed component on edges):", np.round(f, 8))
    print("c = g - f (circulation):", np.round(c, 8))
    print("Decomposed cycles (eid, sign) and evaluations:")
    for (eids, amt, num, den, ratio) in evaluated:
        print(" amt:", amt, " num:", round(num,9), " den:", round(den,9), " ratio:", round(ratio,9), " cycle:", eids)

if __name__ == "__main__":
    toy_uniswap_example()
