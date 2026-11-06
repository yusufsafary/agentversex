window.AVX = {
  chainId: 56,
  rpcs: [
    "https://bsc-dataseed-public.bnbchain.org",
    "https://bsc-dataseed.bnbchain.org",
    "https://bsc-dataseed1.binance.org",
    "https://bsc-rpc.publicnode.com"
  ],
  contract: {
    address: "0x6052115065322be020b94De616e31B27EC30B0E2", // AgentVerseCitizen (CTZN)
    maxSupply: 10000,
    maxPerWallet: 20,
    priceWei: "250000000000000"
  },
  token: {
    address: "0xB6833463BA4B1DF6490fE112992C789b8B63C761", // VERSE
    symbol: "VERSE"
  },
  retire: {
    address: "0xcCe4b47FC42d2263106659210605f9d846E2B426", // VerseRetire
    perCitizen: "500,000",
    feeWei: "238148103194019"
  },
  market: {
    address: "0x86d502C664d61c913aE4e082B6c47d88BD236387", // VerseMarket
    feeBps: 250
  },
  agentId: "0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F",
  stages: ["Dormant", "Awakened", "Sentient", "Ascendant"],
  stageDays: [0, 7, 21, 45]
};
