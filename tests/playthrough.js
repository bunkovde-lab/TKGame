// Тестировщик: полное прохождение дела «Синяя птица» кликами, как игрок.
const { chromium } = require("playwright");
const OUT = (process.env.OUT || __dirname + "/shots") + "/";
const URL = process.env.URL || "http://localhost:8765/";
const W = +(process.env.W || 1366), H = +(process.env.H || 860);
const SHOTS = process.env.SHOTS !== "0";
require("fs").mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/fonts\.g/.test(m.text())) errors.push("console: " + m.text()); });
  const tag = W < 600 ? "m" : "d";
  let n = 0;
  const shot = async (name) => { await closeToasts(); if (SHOTS) await page.screenshot({ path: `${OUT}${tag}-${String(++n).padStart(2, "0")}-${name}.png`, fullPage: true }); };
  const overflow = async (name) => {
    const o = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (o > 1) errors.push(`overflow ${o}px on ${name}`);
  };
  const click = async (sel) => { await page.locator(sel).first().click(); await page.waitForTimeout(60); };
  const act = (a, extra = "") => click(`[data-a="${a}"]${extra}`);
  const st = () => page.evaluate(() => Bureau.game._state());
  var closeToasts = () => page.evaluate(() => document.querySelectorAll(".toast").forEach((t) => t.remove()));
  const svgClick = async (sel, vbW, vbH, x, y) => {
    const loc = page.locator(sel).first();
    const box = await loc.boundingBox();
    await loc.click({ position: { x: (x / vbW) * box.width, y: (y / vbH) * box.height }, force: true });
    await page.waitForTimeout(60);
  };
  const present = async (stmt, ev) => {
    await act("selStmt", `[data-s="${stmt}"]`);
    await act("present");
    await act("presentEv", `[data-e="${ev}"]`);
  };

  // --- платформа
  await page.goto(URL + "#home"); await page.evaluate(() => localStorage.clear()); await page.reload();
  await page.waitForSelector(".hero"); await shot("home"); await overflow("home");
  await page.goto(URL + "#catalog"); await shot("catalog"); await overflow("catalog");
  await page.goto(URL + "#profile"); await shot("profile-empty"); await overflow("profile");

  // --- сбор семьи
  await page.goto(URL + "#play"); await page.waitForSelector("#pl0");
  await page.fill("#pl0", "Мама");
  await act("addPlayer"); await page.fill("#pl1", "Папа");
  await act("addPlayer"); await page.fill("#pl2", "Маша");
  await shot("setup"); await overflow("setup");
  await act("startCase");
  await shot("brief"); await overflow("brief");
  await act("phase", '[data-p="act1"]');
  await shot("hub1"); await overflow("hub1");

  // --- осмотр зала
  await click('[data-v="scene"]');
  const spots = await page.evaluate(() => Bureau.art.SCENE_SPOTS.filter((s) => s.id));
  for (const s of spots) { await svgClick("#viewer svg", 1200, 700, s.x, s.y); }
  await svgClick("#viewer svg", 1200, 700, 1062, 440); // ложная находка
  await shot("scene"); await overflow("scene");
  let S = await st(); if (S.scene.length !== 6) errors.push("scene found " + S.scene.length);
  await act("finish", '[data-k="scene"]');

  // --- камеры
  await click('[data-v="cams"]');
  const setRange = async (m) => { await page.$eval("#camRange", (r, m) => { r.value = m; r.dispatchEvent(new Event("input", { bubbles: true })); }, m); };
  await setRange(540); await act("camMark");
  await setRange(612); await shot("cam-dark"); await act("camMark");
  await act("cam", '[data-c="service"]'); await setRange(946); await shot("cam-worker"); await act("camMark");
  await overflow("cams");
  S = await st(); for (const e of ["E6", "E7", "E8"]) if (!S.evidence.includes(e)) errors.push("cams missing " + e);
  await act("finish", '[data-k="cams"]');

  // --- допросы
  await click('[data-v="int"][data-p="renz"]');
  await act("ask", '[data-q="0"]');
  await present("b", "E4");
  await shot("int-renz"); await overflow("int");
  await act("endInt");
  await click('[data-v="int"][data-p="lukin"]');
  await present("a", "E1"); // намеренная ошибка
  await present("b", "E6"); await present("c", "E7");
  await act("endInt");
  S = await st(); if (!S.evidence.includes("E22") || !S.evidence.includes("R3") || !S.evidence.includes("E10")) errors.push("interrogation evidence missing");

  // --- свидетель
  await click('[data-v="zoya"]');
  await act("zoyaWho", '[data-i="2"]'); await act("zoyaShow");
  await shot("zoya-show");
  await page.waitForSelector('[data-a="zoyaAns"]', { timeout: 15000 });
  for (const [q, o] of [[0, 1], [1, 2], [2, 3], [3, 0]]) await act("zoyaAns", `[data-q="${q}"][data-o="${o}"]`);
  await act("zoyaCheck"); await act("closeGo");
  await shot("hub1-done");

  // --- голосование 1
  await act("phase", '[data-p="vote1"]');
  for (const s of ["lukin", "krylov", "renz"]) { await act("voteReady"); await act("vote", `[data-s="${s}"]`); }
  await shot("vote1"); await overflow("vote");
  await act("phase", '[data-p="act2"]');
  await click('[data-v="hub2"]');
  await shot("hub2"); await overflow("hub2");

  // --- Ника и телефон
  await act("loc", '[data-l="nika"]');
  await click('[data-v="phone"]');
  for (const d of ["1", "9", "6", "4"]) await act("pinKey", `[data-d="${d}"]`);
  await act("papp", '[data-p="chats"]'); await act("papp", '[data-p="chat-group"]'); await page.waitForTimeout(150);
  await shot("phone-chat"); await overflow("phone");
  await act("papp", '[data-p="chats"]'); await act("papp", '[data-p="home"]'); await act("papp", '[data-p="gallery"]');
  await click('[data-v="diff"]');
  const diffs = await page.evaluate(() => Bureau.art.DIFFS);
  for (const d of diffs) { await svgClick('.photo[data-ph="b"] svg', 600, 400, d.x, d.y); }
  await shot("diff"); await overflow("diff");
  S = await st(); if (S.diff.length !== 5) errors.push("diff found " + S.diff.join(","));
  await act("diffDone");
  await click('[data-v="loc"][data-p="nika"]');
  await click('[data-v="hub2"]');

  // --- мастерская
  await act("loc", '[data-l="workshop"]');
  await click('[data-v="int"][data-p="krylov1"]');
  await present("a", "E12"); await present("b", "E2");
  await act("endInt");
  await act("wife"); await act("closeModal");
  await act("item", '[data-i="cup"]'); await act("item", '[data-i="fabric"]');
  await click('[data-v="cipher"]');
  for (let i = 0; i < 3; i++) await act("shift", '[data-d="1"]');
  await shot("cipher"); await overflow("cipher");
  await act("cipherCheck");
  await click('[data-v="loc"][data-p="workshop"]');
  await shot("workshop");
  await click('[data-v="hub2"]');

  // --- база
  await click('[data-v="db"]');
  await page.fill("#dbIn", "абракадабра"); await page.press("#dbIn", "Enter");
  await page.fill("#dbIn", "Крылов"); await page.press("#dbIn", "Enter");
  await page.fill("#dbIn", "стекло и рама"); await page.press("#dbIn", "Enter");
  await shot("db"); await overflow("db");
  await click('[data-v="hub2"]');

  // --- лаборатория
  await click('[data-v="lab"]');
  await act("labRun", '[data-k="glassDb"]');
  await act("labRun", '[data-k="glassCup"]'); await shot("lab-prints"); await act("pickPrint", '[data-i="2"]');
  await act("labRun", '[data-k="fiber"]'); await shot("lab-fiber"); await act("pickFiber", '[data-i="2"]');
  await shot("lab"); await overflow("lab");
  await click('[data-v="hub2"]');

  // --- хронология
  await click('[data-v="timeline"]');
  for (let guard = 0; guard < 40; guard++) {
    S = await st();
    const order = S.tl.order, target = [1, 2, 3, 4, 5, 6, 7, 8];
    const i = order.findIndex((id, k) => id !== target[k]);
    if (i < 0) break;
    const j = order.indexOf(target[i]);
    await act("tlMove", `[data-i="${j}"][data-d="-1"]`);
  }
  await act("tlCheck");
  await act("tlQ", '[data-i="1"]');
  await shot("timeline"); await overflow("timeline");
  await click('[data-v="hub2"]');

  // --- алиби
  await click('[data-v="alibi"]');
  const ans = { lukin: 0, renz: 1, zimin: 2, krylov: 3 };
  for (const [p, i] of Object.entries(ans)) { await act("alibiCell", `[data-p="${p}"][data-i="${i}"]`); await act("alibiCell", `[data-p="${p}"][data-i="${i}"]`); }
  await act("alibiCheck");
  await shot("alibi"); await overflow("alibi");
  await click('[data-v="hub2"]');

  // --- архив и вокзал
  await act("loc", '[data-l="archive"]'); await act("archCard", '[data-i="2"]'); await shot("archive");
  await click('[data-v="hub2"]');
  await act("loc", '[data-l="station"]');
  for (const d of ["1", "9", "6", "4"]) await act("lockKey", `[data-d="${d}"]`);
  await act("stationBottom"); await shot("station");
  await click('[data-v="hub2"]');

  // --- доска
  await click('[data-v="board"]');
  await act("pinSel", '[data-e="E14"]'); await act("pinTo", '[data-s="krylov"]');
  await act("pinSel", '[data-e="R3"]'); await act("pinTo", '[data-s="lukin"]');
  await shot("board"); await overflow("board");
  await click('[data-v="hub2"]');
  S = await st();
  const tLeft = 540 - S.time;
  console.log("time used", S.time, "left", tLeft, "evidence", S.evidence.length);

  // --- голосование 2, акт 3
  await act("toVote2"); await act("closePhase");
  for (const s of ["krylov", "krylov", "zimin"]) { await act("voteReady"); await act("vote", `[data-s="${s}"]`); }
  await act("phase", '[data-p="act3"]');
  await click('[data-v="int"][data-p="krylov2"]');
  await present("a", "E11"); await present("b", "E14"); await present("c", "E19"); await present("d", "E18");
  await shot("confession"); await overflow("confession");
  await click('[data-v="accuse"]');
  const plan = { who: [3, ["E14", "E9", "E15"]], in: [2, ["E4", "E11", "E20"]], cam: [1, ["E7"]], out: [2, ["E8", "E9"]], why: [2, ["E17", "E13"]], where: [2, ["E16", "E18"]] };
  for (const [q, [o, evs]] of Object.entries(plan)) {
    await page.locator(`#q-${q}-${o}`).check(); await page.waitForTimeout(40);
    for (const e of evs) await act("accEv", `[data-q="${q}"][data-e="${e}"]`);
  }
  await shot("accuse"); await overflow("accuse");
  await act("accSubmit"); await act("accFinal");
  await page.waitForTimeout(200);
  await shot("debrief"); await overflow("debrief");
  S = await st();
  console.log("RESULT", JSON.stringify({ score: S.result.score, stars: S.result.stars, badges: S.result.badges, lines: S.result.lines }));
  await page.goto(URL + "#profile"); await page.waitForTimeout(100); await shot("profile-after"); await overflow("profile-after");
  const prof = await page.evaluate(() => Bureau.store.profile());
  console.log("PROFILE", JSON.stringify(prof));
  // перезагрузка в середине: сохранение
  console.log("ERRORS", errors.length ? "\n" + errors.join("\n") : "none");
  await browser.close();
})().catch((e) => { console.error("FAIL", e); process.exit(1); });
