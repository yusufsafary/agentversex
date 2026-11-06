// Market AgentVerse X: grid listing dari kontrak VerseMarket, beli/delist
// dengan wallet browser, jual dua langkah (approve lalu list). Fee 2,5%.
(function () {
  const { call, padAddr, padNum, toNum, toBig, SEL } = window.AVXRead;
  const C = window.AVX;
  const $ = (id) => document.getElementById(id);
  const fmt = (n) => n.toLocaleString("en-US");
  const bnb = (wei) => (Number(wei) / 1e18).toFixed(5).replace(/0+$/, "").replace(/\.$/, ".0") + " BNB";
  let account = null;
  let provider = null;

  const WRITE_SEL = {
    list: "0x50fd7367",
    buy: "0xd96a094a",
    delist: "0x964bc33f",
    approve: "0x095ea7b3"
  };

  async function loadListings() {
    const grid = $("grid");
    try {
      const raw = await call(C.market.address, SEL.listedIds);
      const words = raw && raw !== "0x" ? raw.slice(2).match(/.{64}/g).map((w) => BigInt("0x" + w)) : [];
      const count = words.length > 1 ? Number(words[1]) : 0;
      $("m-count").textContent = fmt(count);
      let floor = null;
      const cards = [];
      for (let i = 0; i < count; i++) {
        const id = words[2 + i];
        const l = await call(C.market.address, SEL.listingOf + padNum(id));
        if (!l || l === "0x") continue;
        const w = l.slice(2).match(/.{64}/g).map((x) => BigInt("0x" + x));
        const seller = "0x" + l.slice(2, 66).slice(-40);
        const price = w[1];
        if (floor === null || price < floor) floor = price;
        let stage = 0, age = 0;
        try {
          const [sH, mH] = await Promise.all([
            call(C.contract.address, SEL.stageOf + padNum(id)),
            call(C.contract.address, SEL.mintTimeOf + padNum(id))
          ]);
          stage = toNum(sH);
          age = Math.max(0, Math.floor((Date.now() / 1000 - toNum(mH)) / 86400));
        } catch (e) {}
        cards.push({ id, seller, price, stage, age });
      }
      $("m-floor").textContent = floor !== null ? bnb(floor) : "–";
      if (!cards.length) {
        grid.innerHTML = '<div class="card"><div class="id">No Citizens listed yet</div><div class="meta">Be the first seller. Young Citizens are absorb fuel, old ones are one sunrise from retiring.</div></div>';
        return;
      }
      grid.innerHTML = cards.map((c) => {
        const mine = account && c.seller.toLowerCase() === account.toLowerCase();
        return `<div class="card">
          <img src="art/${c.id}.svg" alt="Citizen ${c.id}" onerror="this.style.display='none'"/>
          <div class="id">Citizen Nº ${c.id}</div>
          <div class="meta">${C.stages[c.stage].toUpperCase()} · AGE ${c.age} DAYS<br/>SELLER ${c.seller.slice(0, 6)}...${c.seller.slice(-4)}</div>
          <div class="price">${bnb(c.price)}</div>
          ${mine
            ? `<button class="btn" data-delist="${c.id}">DELIST</button>`
            : `<button class="btn gold" data-buy="${c.id}" data-price="${c.price}">BUY</button>`}
        </div>`;
      }).join("");
      grid.querySelectorAll("[data-buy]").forEach((b) => b.addEventListener("click", () => buy(BigInt(b.dataset.buy), BigInt(b.dataset.price))));
      grid.querySelectorAll("[data-delist]").forEach((b) => b.addEventListener("click", () => delist(BigInt(b.dataset.delist))));
    } catch (e) {
      grid.innerHTML = '<div class="card"><div class="id">Chain read failed</div><div class="meta">Try again in a moment.</div></div>';
    }
  }

  async function ensureWallet() {
    if (!window.ethereum) throw new Error("No browser wallet found. Open this page in a wallet browser.");
    if (!provider) provider = new ethers.BrowserProvider(window.ethereum);
    const net = await provider.getNetwork();
    if (Number(net.chainId) !== 56) {
      await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x38" }] });
      provider = new ethers.BrowserProvider(window.ethereum);
    }
    if (!account) {
      const accs = await window.ethereum.request({ method: "eth_requestAccounts" });
      account = accs[0];
      $("connect-btn").textContent = account.slice(0, 6) + "..." + account.slice(-4);
      loadListings();
    }
    return provider.getSigner();
  }

  async function send(to, data, value) {
    const signer = await ensureWallet();
    const tx = await signer.sendTransaction({ to, data, value: value || 0n });
    $("sell-status").textContent = "Transaction sent: " + tx.hash.slice(0, 14) + "... waiting for confirmation.";
    await tx.wait();
    $("sell-status").textContent = "Confirmed: " + tx.hash;
  }

  async function buy(id, price) {
    try { await send(C.market.address, WRITE_SEL.buy + padNum(id), price); await loadListings(); }
    catch (e) { $("sell-status").textContent = "Buy failed: " + (e.shortMessage || e.message); }
  }
  async function delist(id) {
    try { await send(C.market.address, WRITE_SEL.delist + padNum(id)); await loadListings(); }
    catch (e) { $("sell-status").textContent = "Delist failed: " + (e.shortMessage || e.message); }
  }

  async function sell() {
    const id = BigInt($("sell-id").value || 0);
    const priceEth = $("sell-price").value.trim();
    if (!id || !priceEth) { $("sell-status").textContent = "Enter a Citizen number and a price in BNB."; return; }
    const price = ethers.parseEther(priceEth);
    try {
      const approved = await call(C.contract.address, SEL.getApproved + padNum(id));
      const approvedAddr = approved && approved !== "0x" ? "0x" + approved.slice(-40) : "";
      if (approvedAddr.toLowerCase() !== C.market.address.toLowerCase()) {
        $("sell-status").textContent = "Step 1 of 2: approve the market to hold Citizen Nº " + id + ".";
        await send(C.contract.address, WRITE_SEL.approve + padAddr(C.market.address) + padNum(id));
      }
      $("sell-status").textContent = "Step 2 of 2: listing Citizen Nº " + id + ".";
      await send(C.market.address, WRITE_SEL.list + padNum(id) + padNum(price));
      await loadListings();
    } catch (e) { $("sell-status").textContent = "Sell failed: " + (e.shortMessage || e.message); }
  }

  $("connect-btn").addEventListener("click", async () => {
    try { await ensureWallet(); } catch (e) { $("sell-status").textContent = e.message; }
  });
  $("sell-btn").addEventListener("click", sell);
  loadListings();
  setInterval(loadListings, 90000);
})();
