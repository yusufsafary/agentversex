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

  // ---------- sorotan Citizen dari scene 3D ----------
  setInterval(() => {
    const el = document.getElementById("hero-pick");
    if (!el) return;
    const v = window.AVXHighlight;
    el.textContent = v ? "N\u00ba " + v : "\u2013";
  }, 350);

// ---------- upgrade v4: reveal, time machine, alokasi, kalkulator, toast kelahiran ----------
(function () {
  const $ = (id) => document.getElementById(id);
  const fmt = (n) => n.toLocaleString("en-US");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // reveal saat masuk layar
  const targets = document.querySelectorAll("section.gate, .fact, .promptbox, .twocol .checker, .timemachine, .retirecalc, .marquee");
  targets.forEach((el) => el.classList.add("rv"));
  if ("IntersectionObserver" in window && !reduced) {
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    }), { threshold: 0.1 });
    targets.forEach((el) => io.observe(el));
  } else targets.forEach((el) => el.classList.add("in"));

  // toast saat Citizen baru lahir (dari event papan live)
  let lastMinted = null, toastTimer = null;
  window.addEventListener("avx:board", (ev) => {
    const m = ev.detail && ev.detail.minted;
    if (typeof m !== "number") return;
    if (lastMinted !== null && m > lastMinted) {
      const t = $("birth-toast");
      if (t) {
        t.textContent = m - lastMinted === 1
          ? "Citizen N\u00ba " + fmt(m) + " was just born on-chain."
          : fmt(m - lastMinted) + " new Citizens were just born. Latest: N\u00ba " + fmt(m) + ".";
        t.classList.add("show");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => t.classList.remove("show"), 5200);
      }
      const stat = document.querySelector(".hero-side .stat");
      if (stat) { stat.classList.remove("pulse"); void stat.offsetWidth; stat.classList.add("pulse"); }
    }
    lastMinted = m;
  });

  // time machine: umur -> tahap, plus simulasi absorb
  const DAYS = [0, 7, 21, 45], NAMES = ["DORMANT", "AWAKENED", "SENTIENT", "ASCENDANT"];
  let boost = 0;
  const stageByDay = (d) => d >= 45 ? 3 : d >= 21 ? 2 : d >= 7 ? 1 : 0;
  function tmRender() {
    const range = $("tm-range"); if (!range) return;
    const day = Number(range.value);
    const base = stageByDay(day);
    const eff = Math.min(3, base + boost);
    const st = $("tm-stage");
    st.textContent = NAMES[eff];
    st.className = "tm-stage s" + eff;
    $("tm-day").textContent = "DAY " + day;
    document.querySelectorAll("#tm-orbs i").forEach((o, i) => o.classList.toggle("on", i <= eff));
    $("tm-fill").style.width = (eff / 3 * 100) + "%";
    $("tm-note").textContent = eff === 3
      ? "Ready to retire: 500,000 VERSE"
      : "Ascendant at day 45 · " + (45 - day) + " days of aging left" + (boost ? " · absorb already jumped " + boost : "");
    $("tm-boost").textContent = "Absorbs simulated: " + boost + " · each one burns a real Citizen when done on-chain";
    $("tm-absorb").disabled = eff === 3;
    $("tm-absorb").style.opacity = eff === 3 ? .45 : 1;
  }
  if ($("tm-range")) {
    $("tm-range").addEventListener("input", tmRender);
    $("tm-absorb").addEventListener("click", () => { if (stageByDay(Number($("tm-range").value)) + boost < 3) { boost++; tmRender(); } });
    tmRender();
  }

  // bar alokasi interaktif
  const ALLOC_TEXT = [
    "5,000,000,000 VERSE sit in the retire contract. Every Ascendant that retires takes 500,000 of it, and its Citizen burns forever.",
    "2,000,000,000 VERSE are reserved to seed the first VERSE pool on PancakeSwap when the launch opens.",
    "1,000,000,000 VERSE back the pool after launch, added as liquidity support when the market needs depth.",
    "2,000,000,000 VERSE stay with the project for development, listings and the long life of the verse."
  ];
  const legend = $("alloc-legend");
  if (legend) legend.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => {
    legend.querySelectorAll("button").forEach((x) => x.classList.remove("on"));
    b.classList.add("on");
    const i = Number(b.dataset.a);
    $("alloc-detail").textContent = ALLOC_TEXT[i];
    document.querySelectorAll(".alloc i").forEach((seg, j) => seg.classList.toggle("dim", j !== i));
  }));

  // kalkulator retire
  const rc = $("rc-range");
  if (rc) {
    const render = () => {
      const n = Number(rc.value);
      $("rc-n").textContent = n;
      $("rc-verse").textContent = fmt(n * 500000) + " VERSE";
      $("rc-note").textContent = "That is " + (n * 500000 / 5000000000 * 100).toFixed(2).replace(/\.?0+$/, "") + "% of the retire pool. The pool pays 10,000 retires in total, ever.";
    };
    rc.addEventListener("input", render);
    render();
  }
})();
