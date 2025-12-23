
function simulateCycleWithMutation(ordered, pools, inputAmount) {
    let amt = inputAmount;
    const trace = [];
    const mutatedPools = structuredClone(pools);

    for (const t of ordered) {
        const p = mutatedPools[t.eid];

        let rin, rout;
        let inKey, outKey;

        if (t.from === p.token0) {
            rin = p.reserve0;
            rout = p.reserve1;
            inKey = "reserve0";
            outKey = "reserve1";
        } else {
            rin = p.reserve1;
            rout = p.reserve0;
            inKey = "reserve1";
            outKey = "reserve0";
        }

        const ain = amt * 0.997;
        const aout = (ain * rout) / (rin + ain);

        // 🔴 MUTATE RESERVES
        p[inKey] += ain;
        p[outKey] -= aout;

        trace.push({
            pool: `${p.token0}/${p.token1}`,
            from: t.from,
            to: t.to,
            in: amt,
            out: aout
        });

        amt = aout;
    }

    return { profit: amt - inputAmount, trace, mutatedPools };
}
