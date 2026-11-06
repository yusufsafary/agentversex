// Pembaca rantai AgentVerse X: balapan beberapa RPC publik BSC, ambil yang
// pertama menjawab. Semua bacaan read-only (eth_call). Selector diverifikasi
// dari ABI kontrak AgentVerse X (ethers id()).
(function () {
  const SEL = {
    totalMinted: "0xa2309ff8",
    mintOpen: "0x24bbd049",
    totalAbsorbed: "0x21d15ba9",
    totalRetired: "0x4d8f59f0",
    claimOpen: "0x4b8bcb58",
    claimsRemaining: "0x754c463f",
    totalClaimed: "0xd54ad2a1",
    balanceOf: "0x70a08231",
    ownerOf: "0x6352211e",
    stageOf: "0xc7d25b15",
    mintTimeOf: "0xbf3b0e65",
    boostOf: "0x896cddf4",
    priceFor: "0xd527979a",
    mintedBy: "0x3cef28d2",
    listedIds: "0x023bea53",
    listingOf: "0xe3404981",
    feeBps: "0x24a9d853",
    getApproved: "0x081812fc"
  };
  function rpc(method, params) {
    const body = JSON.stringify({ jsonrpc: "2.0", id: 1, method, params });
    const attempts = window.AVX.rpcs.map((u) =>
      fetch(u, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
        signal: AbortSignal.timeout(6000)
      })
        .then((r) => r.json())
        .then((j) => {
          if (j && j.result !== undefined) return j.result;
          throw new Error("rpc");
        })
    );
    return Promise.any(attempts);
  }
  function call(to, data) {
    return rpc("eth_call", [{ to, data }, "latest"]);
  }
  function padAddr(a) {
    return a.toLowerCase().replace("0x", "").padStart(64, "0");
  }
  function padNum(n) {
    return BigInt(n).toString(16).padStart(64, "0");
  }
  function toNum(hex) {
    return hex && hex !== "0x" ? Number(BigInt(hex)) : 0;
  }
  function toBig(hex) {
    return hex && hex !== "0x" ? BigInt(hex) : 0n;
  }
  window.AVXRead = { rpc, call, padAddr, padNum, toNum, toBig, SEL };
})();
