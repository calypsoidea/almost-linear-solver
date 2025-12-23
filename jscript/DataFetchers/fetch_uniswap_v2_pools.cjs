

// fetch_uniswap_v2_pools.cjs
"use strict";

const { ethers } = require("ethers");

// ===== CONFIG =====
const RPC = process.env.RPC_URL; // Infura / Alchemy / local
const FACTORY = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f"; // Uniswap V2
const MAX_POOLS = 200; // start small

// ===== ABIs =====
const FACTORY_ABI = [
  "function allPairsLength() view returns (uint)",
  "function allPairs(uint) view returns (address)"
];

const PAIR_ABI = [
  "function token0() view returns (address)",
  "function token1() view returns (address)",
  "function getReserves() view returns (uint112,uint112,uint32)"
];

// ===== MAIN =====
async function run() {
  const provider = new ethers.JsonRpcProvider(RPC);
  const factory = new ethers.Contract(FACTORY, FACTORY_ABI, provider);

  const total = await factory.allPairsLength();
  console.log("Total pairs:", total.toString());

  const pools = [];
  const n = Math.min(Number(total), MAX_POOLS);

  for (let i = 0; i < n; i++) {
    const pairAddr = await factory.allPairs(i);
    const pair = new ethers.Contract(pairAddr, PAIR_ABI, provider);

    const [t0, t1, reserves] = await Promise.all([
      pair.token0(),
      pair.token1(),
      pair.getReserves()
    ]);

    pools.push({
      pair: pairAddr,
      token0: t0,
      token1: t1,
      reserve0: Number(reserves[0]),
      reserve1: Number(reserves[1])
    });

    if (i % 25 === 0) console.log(`Fetched ${i}/${n}`);
  }

  console.log("Sample pool:", pools[0]);
}

run().catch(console.error);
