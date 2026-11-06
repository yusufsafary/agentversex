// Logika halaman AgentVerse X: papan live, penukar tahap hero, prompt agen,
// pemeriksa wallet, dan salin prompt. Semua bacaan on-chain read-only.
(function () {
  const { call, padAddr, padNum, toNum, SEL } = window.AVXRead;
  const C = window.AVX;
  const $ = (id) => document.getElementById(id);
  const fmt = (n) => n.toLocaleString("en-US");

  // ---------- papan live ----------
  async function board() {
    try {
      const [mintedH, openH, absH, retH] = await Promise.all([
        call(C.contract.address, SEL.totalMinted),
        call(C.contract.address, SEL.mintOpen),
        call(C.contract.address, SEL.totalAbsorbed),
        call(C.contract.address, SEL.totalRetired)
      ]);
      const minted = toNum(mintedH), open = toNum(openH) === 1;
      const absorbed = toNum(absH), retired = toNum(retH);
      const alive = minted - absorbed - retired;
      if ($("b-minted")) $("b-minted").textContent = fmt(minted);
      if ($("b-alive")) $("b-alive").textContent = fmt(alive);
      if ($("b-absorbed")) $("b-absorbed").textContent = fmt(absorbed);
      if ($("b-retired")) $("b-retired").textContent = fmt(retired);
      if ($("b-left")) $("b-left").textContent = fmt(C.contract.maxSupply - minted);
      if ($("mint-progress")) $("mint-progress").style.width = (minted / C.contract.maxSupply * 100).toFixed(2) + "%";
      const strip = $("mint-state");
      if (strip) strip.textContent = open ? "MINT IS LIVE" : "MINT OPENS SOON";
      window.dispatchEvent(new CustomEvent("avx:board", { detail: { minted, open, absorbed, retired, alive } }));
    } catch (e) { /* papan tetap menampilkan nilai terakhir */ }
    try {
      const [cOpenH, remH, claimedH] = await Promise.all([
        call(C.retire.address, SEL.claimOpen),
        call(C.retire.address, SEL.claimsRemaining),
        call(C.retire.address, SEL.totalClaimed)
      ]);
      if ($("b-retire-open")) $("b-retire-open").textContent = toNum(cOpenH) === 1 ? "OPEN" : "SOON";
      if ($("b-retire-left")) $("b-retire-left").textContent = fmt(toNum(remH));
      if ($("b-retire-done")) $("b-retire-done").textContent = fmt(toNum(claimedH));
    } catch (e) { /* abaikan */ }
  }
  board();
  setInterval(board, 60000);

  // ---------- penukar tahap hero ----------
  document.querySelectorAll(".stagebtn").forEach((b) => {
    b.addEventListener("click", () => {
      document.querySelectorAll(".stagebtn").forEach((x) => x.classList.remove("on"));
      b.classList.add("on");
      const i = Number(b.dataset.stage);
      if (window.AVXStage) window.AVXStage(i);
      const nm = $("hero-stage-name");
      if (nm) nm.textContent = C.stages[i].toUpperCase();
    });
  });

  // ---------- salin prompt ----------
  document.querySelectorAll("[data-copy]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const el = document.getElementById(btn.dataset.copy);
      if (!el) return;
      try { await navigator.clipboard.writeText(el.textContent.trim()); btn.textContent = "COPIED"; }
      catch (e) { btn.textContent = "SELECT + COPY"; }
      setTimeout(() => (btn.textContent = btn.dataset.label || "COPY PROMPT"), 1800);
    });
  });

  // ---------- pemeriksa wallet ----------
  const chk = $("check-btn");
  if (chk) chk.addEventListener("click", async () => {
    const a = $("check-addr").value.trim();
    const out = $("check-out");
    if (!/^0x[0-9a-fA-F]{40}$/.test(a)) { out.textContent = "Paste a valid BSC wallet address first."; return; }
    out.textContent = "Reading the chain...";
    try {
      const [mintedH, hasIdH] = await Promise.all([
        call(C.contract.address, SEL.mintedBy + padAddr(a)),
        call(C.agentId, SEL.balanceOf + padAddr(a))
      ]);
      const minted = toNum(mintedH), hasId = toNum(hasIdH) > 0;
      const countH = await call(C.contract.address, SEL.balanceOf + padAddr(a));
      const held = toNum(countH);
      out.textContent =
        "Agent ID: " + (hasId ? "held" : "not held") +
        " · Citizens minted by this wallet: " + minted + " / " + C.contract.maxPerWallet +
        " · Citizens held now: " + held +
        (minted === 0 && hasId ? " · Your first Citizen is free." : "");
    } catch (e) { out.textContent = "Chain read failed. Try again in a moment."; }
  });

  // ---------- pemeriksa Citizen ----------
  const lk = $("lookup-btn");
  if (lk) lk.addEventListener("click", async () => {
    const id = Number($("lookup-id").value);
    const out = $("lookup-out");
    if (!id || id < 1 || id > C.contract.maxSupply) { out.textContent = "Enter a Citizen number between 1 and 10,000."; return; }
    out.textContent = "Reading Citizen Nº " + id + "...";
    try {
      const [ownH, stageH, mtH, boostH] = await Promise.all([
        call(C.contract.address, SEL.ownerOf + padNum(id)),
        call(C.contract.address, SEL.stageOf + padNum(id)),
        call(C.contract.address, SEL.mintTimeOf + padNum(id)),
        call(C.contract.address, SEL.boostOf + padNum(id))
      ]);
      if (!ownH || ownH === "0x") { out.textContent = "Citizen Nº " + id + " does not exist yet (not minted, or already burned)."; return; }
      const owner = "0x" + ownH.slice(-40);
      const stage = toNum(stageH), boost = toNum(boostH);
      const born = new Date(toNum(mtH) * 1000);
      const ageDays = Math.max(0, Math.floor((Date.now() / 1000 - toNum(mtH)) / 86400));
      out.textContent =
        "Citizen Nº " + id + " · Stage: " + C.stages[stage] +
        " · Age: " + ageDays + " days (born " + born.toISOString().slice(0, 10) + ")" +
        " · Absorb boosts: " + boost +
        " · Owner: " + owner.slice(0, 6) + "..." + owner.slice(-4) +
        (stage === 3 ? " · Ready to retire for 500,000 VERSE." : " · Next stage at day " + C.stageDays[stage + 1] + ", or absorb 1 Citizen to jump now.");
    } catch (e) { out.textContent = "Chain read failed. Try again in a moment."; }
  });
})();
