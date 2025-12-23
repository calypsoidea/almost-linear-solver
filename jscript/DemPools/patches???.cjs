
// patches

// =======================
// POOL MODEL (DIRECTION SAFE)
// =======================

function makePool(id, token0, token1, r0, r1) {
    return {
        id,
        token0,
        token1,
        reserves: {
            [token0]: r0,
            [token1]: r1
        }
    };
}

function executeSwap(pool, from, to, amountIn) {
    const rIn = pool.reserves[from];
    const rOut = pool.reserves[to];

    const amountOut = swapOut(amountIn, rIn, rOut);

    return {
        amountOut,
        reservesAfter: {
            [from]: rIn + amountIn,
            [to]: rOut - amountOut
        }
    };
}

// =======================
// CYCLE MATH (PURE)
// =======================

function computeCycleMultiplier(cycle, pools) {
    let m = 1;

    for (const hop of cycle) {
        const pool = pools[hop.poolId];
        const rIn = pool.reserves[hop.from];
        const rOut = pool.reserves[hop.to];
        m *= spotRate(rIn, rOut);
    }

    return m;
}

// =======================
// EXECUTION TRACE (SLIPPAGE AWARE)
// =======================

// what does it do?

function executeCycle(cycle, pools, inputAmount) {
    let amt = inputAmount;
    const hops = [];

    for (const hop of cycle) {
        const pool = pools[hop.poolId];

        const rIn = pool.reserves[hop.from];
        const rOut = pool.reserves[hop.to];

        const { amountOut, reservesAfter } =
            executeSwap(pool, hop.from, hop.to, amt);

        hops.push({
            pool: pool.id,
            from: hop.from,
            to: hop.to,
            in: amt,
            out: amountOut,
            reservesBefore: { in: rIn, out: rOut },
            reservesAfter
        });

        // mutate for next hop
        pool.reserves[hop.from] = reservesAfter[hop.from];
        pool.reserves[hop.to] = reservesAfter[hop.to];

        amt = amountOut;
    }

    return {
        input: inputAmount,
        output: amt,
        profit: amt - inputAmount,
        hops
    };
}

// =======================
// OPTIMAL SIZING (GOLDEN SEARCH)
// =======================

function findOptimalInput(cycle, pools, maxInput = 50_000) {
    const phi = (1 + Math.sqrt(5)) / 2;
    let lo = 1;
    let hi = maxInput;

    let best = { profit: -Infinity };

    for (let i = 0; i < 30; i++) {
        const m1 = hi - (hi - lo) / phi;
        const m2 = lo + (hi - lo) / phi;

        const p1 = simulateProfit(cycle, pools, m1);
        const p2 = simulateProfit(cycle, pools, m2);

        if (p1 > p2) {
            hi = m2;
            if (p1 > best.profit) best = { input: m1, profit: p1 };
        } else {
            lo = m1;
            if (p2 > best.profit) best = { input: m2, profit: p2 };
        }
    }

    return best;
}

function simulateProfit(cycle, pools, input) {
    // deep copy pools
    const cloned = {};
    for (const k in pools) {
        cloned[k] = {
            ...pools[k],
            reserves: { ...pools[k].reserves }
        };
    }

    return executeCycle(cycle, cloned, input).profit;
}


// =======================
// HARD-CODED ARBITRAGE
// =======================

// Pools
const pools = {
    AB: makePool("AB", "A", "B", 1_000_000, 1_020_000),
    BC: makePool("BC", "B", "C", 1_000_000, 1_020_000),
    CA: makePool("CA", "C", "A", 1_000_000, 1_020_000)
};

// Cycle definition (ORDERED, EXECUTION-READY)
const cycle = [
    { poolId: "AB", from: "A", to: "B" },
    { poolId: "BC", from: "B", to: "C" },
    { poolId: "CA", from: "C", to: "A" }
];

// =======================
// RUN
// =======================

const multiplier = computeCycleMultiplier(cycle, pools);
console.log("Cycle multiplier:", multiplier.toFixed(6));

if (multiplier <= 1) {
    console.log("No theoretical arbitrage");
    process.exit(0);
}

const { input, profit } = findOptimalInput(cycle, pools);

if (profit <= 0) {
    console.log("Slippage kills the trade");
    process.exit(0);
}

const execution = executeCycle(cycle, pools, input);

console.log("\n=== EXECUTION TRACE ===");
console.log("Optimal input:", input.toFixed(2));
console.log("Final output:", execution.output.toFixed(2));
console.log("Profit:", execution.profit.toFixed(2));

for (const h of execution.hops) {
    console.log(
        `Pool ${h.pool}: ${h.from} → ${h.to} | in=${h.in.toFixed(2)} out=${h.out.toFixed(2)}`
    );
}


