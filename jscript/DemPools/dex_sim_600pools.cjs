
// dex_sim_600pools.cjs

/* 

        [
            { poolId: 2, from: 'T64', to: 'T92', rate: 0.9803358842378024 },
            { poolId: 42, from: 'T92', to: 'T52', rate: 0.9910486071852158 },
            { poolId: 7, from: 'T138', to: 'T52', rate: 1.0271895553849273 },
            { poolId: 157, from: 'T138', to: 'T64', rate: 0.9756306962745209 }
        ]
        [
            { poolId: 20, from: 'T29', to: 'T130', rate: 1.004090750642576 },
            { poolId: 83, from: 'T130', to: 'T66', rate: 0.9551455974380173 },
            { poolId: 40, from: 'T66', to: 'T29', rate: 0.9821072475168098 }
        ]
        [
            { poolId: 22, from: 'T59', to: 'T43', rate: 1.0347187360396537 },
            { poolId: 162, from: 'T59', to: 'T99', rate: 0.9930306120429028 },
            { poolId: 281, from: 'T43', to: 'T99', rate: 1.045200428095761 }
        ]
        [
            { poolId: 32, from: 'T101', to: 'T117', rate: 1.0266343215033953 },
            { poolId: 88, from: 'T73', to: 'T101', rate: 0.9904007283709648 },
            { poolId: 355, from: 'T73', to: 'T117', rate: 0.9540388674580527 }
        ]

        [

            { poolId: 2, from: 'T64', to: 'T92', rate: 0.9803358842378024 },
            { poolId: 298, from: 'T92', to: 'T161', rate: 0.9831953997062169 },
            { poolId: 239, from: 'T161', to: 'T102', rate: 0.9617501417103511 },
            { poolId: 76, from: 'T102', to: 'T52', rate: 0.9785475079485221 },
            { poolId: 78, from: 'T52', to: 'T75', rate: 0.9645440223989994 },
            { poolId: 14, from: 'T75', to: 'T66', rate: 0.9788994370083579 },
            { poolId: 40, from: 'T66', to: 'T29', rate: 0.9821072475168098 },
            { poolId: 117, from: 'T199', to: 'T29', rate: 1.0245435881552443 },
            { poolId: 216, from: 'T71', to: 'T199', rate: 1.0444857040860134 },
            { poolId: 412, from: 'T9', to: 'T71', rate: 1.0234598031032864 },
            { poolId: 351, from: 'T9', to: 'T127', rate: 1.0111762548780094 },
            { poolId: 113, from: 'T49', to: 'T127', rate: 1.0385641395740657 },
            { poolId: 11, from: 'T57', to: 'T49', rate: 1.0048957583717635 },
            { poolId: 108, from: 'T169', to: 'T57', rate: 1.0134351277596148 },
            { poolId: 13, from: 'T134', to: 'T169', rate: 1.0087243305818419 },
            { poolId: 92, from: 'T125', to: 'T134', rate: 1.0249677742461736 },
            { poolId: 34, from: 'T56', to: 'T125', rate: 1.031814053218975 },
            { poolId: 33, from: 'T56', to: 'T15', rate: 0.9800524600251472 },
            { poolId: 225, from: 'T167', to: 'T15', rate: 0.9990324821449916 },
            { poolId: 361, from: 'T167', to: 'T72', rate: 0.963264902423016 },
            { poolId: 257, from: 'T114', to: 'T72', rate: 1.0431495205263763 },
            { poolId: 73, from: 'T114', to: 'T179', rate: 0.9864290972692022 },
            { poolId: 171, from: 'T179', to: 'T67', rate: 0.9713066163231848 },
            { poolId: 63, from: 'T31', to: 'T67', rate: 1.0109233367318307 },
            { poolId: 203, from: 'T30', to: 'T31', rate: 0.9736354851984333 },
            { poolId: 188, from: 'T132', to: 'T30', rate: 1.0359863796918636 },
            { poolId: 10, from: 'T74', to: 'T132', rate: 1.011288445167661 },
            { poolId: 169, from: 'T126', to: 'T74', rate: 1.0414224633952238 },
            { poolId: 467, from: 'T126', to: 'T107', rate: 0.9732214102276321 }
        ]
        [
            { poolId: 256, from: 'T167', to: 'T187', rate: 0.9811644608865583 },
            { poolId: 55, from: 'T187', to: 'T63', rate: 0.9595329243041464 },
            { poolId: 1, from: 'T175', to: 'T63', rate: 1.043231110240687 },
            { poolId: 66, from: 'T43', to: 'T175', rate: 1.0433709647879241 },
            { poolId: 207, from: 'T167', to: 'T43', rate: 1.0081486757295537 }
        ]

        [
            { poolId: 0, from: 'T64', to: 'T107', rate: 0.9957169494459882 },
            { poolId: 2, from: 'T64', to: 'T92', rate: 0.9803358842378024 },
            { poolId: 298, from: 'T92', to: 'T161', rate: 0.9831953997062169 },
            { poolId: 239, from: 'T161', to: 'T102', rate: 0.9617501417103511 },
            { poolId: 76, from: 'T102', to: 'T52', rate: 0.9785475079485221 },
            { poolId: 78, from: 'T52', to: 'T75', rate: 0.9645440223989994 },
            { poolId: 14, from: 'T75', to: 'T66', rate: 0.9788994370083579 },
            { poolId: 40, from: 'T66', to: 'T29', rate: 0.9821072475168098 },
            { poolId: 117, from: 'T199', to: 'T29', rate: 1.0245435881552443 },
            { poolId: 216, from: 'T71', to: 'T199', rate: 1.0444857040860134 },
            { poolId: 412, from: 'T9', to: 'T71', rate: 1.0234598031032864 },
            { poolId: 351, from: 'T9', to: 'T127', rate: 1.0111762548780094 },
            { poolId: 113, from: 'T49', to: 'T127', rate: 1.0385641395740657 },
            { poolId: 11, from: 'T57', to: 'T49', rate: 1.0048957583717635 },
            { poolId: 108, from: 'T169', to: 'T57', rate: 1.0134351277596148 },
            { poolId: 13, from: 'T134', to: 'T169', rate: 1.0087243305818419 },
            { poolId: 92, from: 'T125', to: 'T134', rate: 1.0249677742461736 },
            { poolId: 34, from: 'T56', to: 'T125', rate: 1.031814053218975 },
            { poolId: 33, from: 'T56', to: 'T15', rate: 0.9800524600251472 },
            { poolId: 225, from: 'T167', to: 'T15', rate: 0.9990324821449916 },
            { poolId: 256, from: 'T167', to: 'T187', rate: 0.9811644608865583 },
            { poolId: 55, from: 'T187', to: 'T63', rate: 0.9595329243041464 },
            { poolId: 1, from: 'T175', to: 'T63', rate: 1.043231110240687 },
            { poolId: 66, from: 'T43', to: 'T175', rate: 1.0433709647879241 },
            { poolId: 22, from: 'T59', to: 'T43', rate: 1.0347187360396537 },
            { poolId: 480, from: 'T59', to: 'T95', rate: 0.9807979402998983 },
            { poolId: 69, from: 'T95', to: 'T47', rate: 0.9558396969381193 },
            { poolId: 39, from: 'T55', to: 'T47', rate: 1.0304647292154823 },
            { poolId: 30, from: 'T124', to: 'T55', rate: 1.0020690604085676 },
            { poolId: 47, from: 'T124', to: 'T178', rate: 1.0204991318033956 },
            { poolId: 476, from: 'T178', to: 'T156', rate: 0.9655173783765795 },
            { poolId: 54, from: 'T156', to: 'T77', rate: 0.987174963427071 },
            { poolId: 586, from: 'T168', to: 'T77', rate: 1.0347702195973474 },
            { poolId: 4, from: 'T107', to: 'T168', rate: 1.0246716365908086 }
        ]

    Benchmarks:

        Generated 600+ pool network in 1.50 ms
        Projected to cycle space in 56.92 ms
        Interpreted cycles in 3.79 ms

        Generated 600+ pool network in 1.36 ms
        Projected to cycle space in 40.07 ms
        Interpreted cycles in 4.13 ms

*/ 

const { performance } = require('perf_hooks');

function log(...args) { console.log(...args); }

// ---------------- Utils ----------------
function buildEdgeIndex(edges) {
    const edgeToId = {};
    edges.forEach((e, i) => { edgeToId[e[0] + "," + e[1]] = i; });
    const idToEdge = edges.slice();
    return { edgeToId, idToEdge };
}

function extractAllCycles(edges, c, eps = 1e-12) {
    const adj = new Map();

    function addEdge(u, v, eid, amt) {
        if (!adj.has(u)) adj.set(u, []);
        adj.get(u).push({ to: v, eid, amt });
    }

    for (let eid = 0; eid < edges.length; eid++) {
        const v = c[eid];
        if (Math.abs(v) < eps) continue;

        const [u, w] = edges[eid];
        if (v > 0) addEdge(u, w, eid, v);
        else addEdge(w, u, eid, -v);
    }

    const cycles = [];

    while (true) {
        let start = null;
        for (const [u, outs] of adj.entries()) {
            if (outs.length > 0) { start = u; break; }
        }
        if (!start) break;

        const stack = [];
        const seen = new Map();
        let u = start;

        while (true) {
            if (seen.has(u)) {
                const idx = seen.get(u);
                const cyc = stack.slice(idx);

                let minAmt = Infinity;
                for (const e of cyc) minAmt = Math.min(minAmt, e.amt);

                cycles.push({
                    cycle: cyc.map(e => [e.eid, +1]),
                    amt: minAmt
                });

                for (const e of cyc) e.amt -= minAmt;
                break;
            }

            seen.set(u, stack.length);

            const outs = adj.get(u);
            if (!outs || outs.length === 0) break;

            // Always pick the last *still positive* edge
            while (outs.length && outs[outs.length - 1].amt <= eps) {
                outs.pop();
            }
            if (!outs.length) break;

            const e = outs[outs.length - 1];
            stack.push(e);
            u = e.to;
        }

        // Clean residual graph
        for (const [u, outs] of adj.entries()) {
            adj.set(u, outs.filter(e => e.amt > eps));
        }
    }

    return cycles;
}



// interpretCycle from your code

function interpretCycle(idToEdge, cycle, rateMap) {
    return cycle.map(([eid, sign]) => {
        const [u, v] = idToEdge[eid];   // ✅ FIXED

        if (rateMap[u + "," + v] !== undefined) {
            return {
                poolId: eid,
                from: sign > 0 ? u : v,
                to:   sign > 0 ? v : u,
                rate: rateMap[u + "," + v]
            };
        }

        if (rateMap[v + "," + u] !== undefined) {
            return {
                poolId: eid,
                from: sign > 0 ? v : u,
                to:   sign > 0 ? u : v,
                rate: rateMap[v + "," + u]
            };
        }

        throw new Error(`Missing rate for pool ${u}<->${v}`);
    });
}

// ---------------- Root-Independent Projection ----------------
function buildIncidenceMatrix(idToEdge) {
    const nodes = [...new Set(idToEdge.flat())].sort();
    const nodeToId = {}; nodes.forEach((n,i)=>nodeToId[n]=i);
    const n = nodes.length, m = idToEdge.length;
    const B = Array.from({length:n},()=>new Array(m).fill(0));
    for (let eid=0;eid<m;eid++){
        const [u,v]=idToEdge[eid];
        B[nodeToId[u]][eid]=-1;
        B[nodeToId[v]][eid]=+1;
    }
    return {B,nodes,nodeToId};
}
function matVec(A,x){
    return A.map(row=>row.reduce((s,v,i)=>s+v*x[i],0));
}
function matMulMatT(A){
    const r=A.length,c=A[0].length;
    const M=Array.from({length:r},()=>new Array(r).fill(0));
    for (let i=0;i<r;i++){
        for (let j=i;j<r;j++){
            let s=0;
            for (let k=0;k<c;k++) s+=A[i][k]*A[j][k];
            M[i][j]=s; M[j][i]=s;
        }
    }
    return M;
}
function solveLinearSystem(M_orig,b_orig){
    const n=M_orig.length;
    const M=M_orig.map(r=>r.slice());
    const b=b_orig.slice();
    const EPS=1e-15;
    for (let i=0;i<n;i++){
        let pivot=i,maxv=Math.abs(M[i][i]);
        for (let r=i+1;r<n;r++){ const av=Math.abs(M[r][i]); if(av>maxv){maxv=av;pivot=r;} }
        if(maxv<EPS){M[i][i]+=1e-12;maxv=Math.abs(M[i][i]);if(maxv<EPS) throw new Error("Singular matrix");}
        if(pivot!==i){[M[i],M[pivot]]=[M[pivot],M[i]];[b[i],b[pivot]]=[b[pivot],b[i]];}
        const diag=M[i][i];
        for(let col=i;col<n;col++) M[i][col]/=diag;
        b[i]/=diag;
        for(let row=0;row<n;row++){
            if(row===i) continue;
            const f=M[row][i];
            if(Math.abs(f)<EPS) continue;
            for(let col=i;col<n;col++) M[row][col]-=f*M[i][col];
            b[row]-=f*b[i];
        }
    }
    return b;
}
function projectToCycleSpace(idToEdge,g){
    const {B,nodes,nodeToId}=buildIncidenceMatrix(idToEdge);
    const Bg=matVec(B,g);
    let M=matMulMatT(B);
    let y;
    try{y=solveLinearSystem(M,Bg);}catch(err){for(let i=0;i<M.length;i++) M[i][i]+=1e-9;y=solveLinearSystem(M,Bg);}
    const BTy=new Array(idToEdge.length).fill(0);
    for(let eid=0;eid<idToEdge.length;eid++){
        let s=0;
        for(let node=0;node<B.length;node++) s+=B[node][eid]*y[node];
        BTy[eid]=s;
    }
    return g.map((gi,i)=>gi-BTy[i]);
}

// ---------------- Simulation ----------------
function generateRandomDEX(numPools=600,numTokens=200){
    const tokens=[];
    for(let i=0;i<numTokens;i++) tokens.push("T"+i);
    const edges=[];
    const rateMap={};
    for(let i=0;i<numPools;i++){
        const u=tokens[Math.floor(Math.random()*numTokens)];
        let v=tokens[Math.floor(Math.random()*numTokens)];
        while(v===u) v=tokens[Math.floor(Math.random()*numTokens)];
        edges.push([u,v]);
        const rate=1+(Math.random()*0.1-0.05); // ~[-5%,+5%]
        rateMap[u+","+v]=rate;
    }
    return {tokens,edges,rateMap};
}

// ---------------- Main ----------------
function runSimulation(){
    const t0=performance.now();
    const {tokens,edges,rateMap}=generateRandomDEX();
    const {edgeToId,idToEdge}=buildEdgeIndex(edges);
    const m=idToEdge.length;
    // g = -ln(rate)
    const g=idToEdge.map(([u,v])=>-Math.log(rateMap[u+","+v]));
    const t1=performance.now();
    const c=projectToCycleSpace(idToEdge,g);
    const t2=performance.now();
    console.log("Generated 600+ pool network in", (t1-t0).toFixed(2),"ms");
    console.log("Projected to cycle space in", (t2-t1).toFixed(2),"ms");

    const cycles = extractAllCycles(idToEdge, c);

    if (cycles.length === 0) {
        console.log("No cycles found");
        return;
    }

    const t3=performance.now();
    for (const { cycle, amt } of cycles) {
        const result = interpretCycle(idToEdge, cycle, rateMap);
        console.log(result);
        //console.log("Cycle multiplier:", result.multiplier.toFixed(6));
    }

    const t4=performance.now();
    console.log("Interpreted cycles in", (t4-t3).toFixed(2),"ms");
}

runSimulation();
