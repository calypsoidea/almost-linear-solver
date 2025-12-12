


function buildEdgeIndex(edges) {
    const edgeToId = {};
    edges.forEach((e, i) => { edgeToId[e[0] + "," + e[1]] = i; });
    const idToEdge = edges.slice();
    return { edgeToId, idToEdge };
}

async function main(params) {
    
    const nodes = ["A", "B", "C"];
    const edges = [["A", "B"], ["B", "C"], ["C", "A"]];

    const { edgeToId, idToEdge } = buildEdgeIndex(edges); 

    console.log(edgeToId)
    console.log('')
    console.log(idToEdge)

}

main()