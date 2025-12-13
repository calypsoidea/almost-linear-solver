
// dex_sim_600pools.cjs
import { performance } from "perf_hooks";

function log(...args) { console.log(...args); }

// ---------------- Utils ----------------
function buildEdgeIndex(edges) {
    const edgeToId = {};
    edges.forEach((e, i) => { edgeToId[e[0] + "," + e[1]] = i; });
    const idToEdge = edges.slice();
    return { edgeToId, idToEdge };
}

// interpretCycle from your code
function interpretCycle(edges, cycle, rateMap) {
    if (!cycle || cycle.length === 0) throw new Error("Cycle empty");
    const directed = cycle.map(([eid, sign]) => {
        const [u, v] = edges[eid];
        return sign === 1
            ? { poolId: eid, from: u, to: v, rate: rateMap[u + "," + v] }
            : { poolId: eid, from: v, to: u, rate: 1 / rateMap[u + "," + v] };
    });

    const used = new Array(directed.length).fill(false);
    const ordered = [directed[0]]; used[0] = true;

    for (let k = 1; k < directed.length; k++) {
        const last = ordered[ordered.length-1];
        let found = false;
        for (let i = 0; i < directed.length; i++) {
            if (used[i]) continue;
            if (directed[i].from === last.to) { ordered.push(directed[i]); used[i] = true; found = true; break; }
        }
        if (!found) throw new Error("Cycle direction mismatch");
    }

    if (ordered[ordered.length-1].to !== ordered[0].from) throw new Error("Cycle not closed");

    let multiplier = 1;
    for (const t of ordered) multiplier *= t.rate;

    return { startToken: ordered[0].from, endToken: ordered[ordered.length-1].to, orderedTrades: ordered, multiplier };
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

    // Simple cycle extraction: take non-zero edges as one cycle
    const cycle=[];
    c.forEach((v,eid)=>{if(Math.abs(v)>1e-12) cycle.push([eid,v>0?1:-1]);});
    if(cycle.length===0) { console.log("No cycle found"); return; }
    const t3=performance.now();
    const result=interpretCycle(idToEdge,cycle,rateMap);
    const t4=performance.now();
    console.log("Interpreted one cycle in", (t4-t3).toFixed(2),"ms");
    console.log("Cycle multiplier:", result.multiplier.toFixed(6));
}

runSimulation();
