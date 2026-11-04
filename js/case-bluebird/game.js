/* Движок дела «Синяя птица»: фазы, экраны и все мини-механики. */
(function () {
  const B = (window.Bureau = window.Bureau || {});
  const C = B.case1, A = B.art, esc = B.esc;
  let S = null, root = null, view = { name: "hub" };

  /* ================= состояние ================= */
  function fresh() {
    return {
      v: 1, phase: "setup", family: B.store.profile().family, players: [], roles: {},
      evidence: [], seen: [], items: {}, done: {}, visited: {}, flags: {},
      time: 0, hints: {}, wrong: 0, int: {}, scene: [], diff: [], cam: [], witness: null,
      phone: { unlocked: false, tries: 0 }, db: { log: [], used: [] }, lab: {}, tl: null, alibi: null,
      cipher: { shift: 0 }, board: {}, votes: {}, accuse: {}, result: null,
    };
  }
  const save = () => B.store.saveCase(C.id, S);
  const has = (id) => S.evidence.includes(id);
  const hintCount = () => Object.values(S.hints).reduce((a, b) => a + b, 0);
  const left = () => C.BUDGET - S.time;
  const clockStr = (min) => String(Math.floor(min / 60) % 24).padStart(2, "0") + ":" + String(min % 60).padStart(2, "0");

  function addEv(id, quiet) {
    if (!id || has(id)) return false;
    S.evidence.push(id);
    save();
    if (!quiet) B.toast(`Новая улика: <b>${C.EVIDENCE[id].t}</b>`);
    return true;
  }
  function playerName(i) { return S.players[i] ? S.players[i].name : "Детектив"; }
  function roleHolder(role) { return playerName(S.roles[role] ?? 0); }
  function turn(role) {
    return `<span class="turn">Ход: ${C.ROLES[role].name} — <b>${esc(roleHolder(role))}</b></span>`;
  }
  function spend(min) {
    if (S.phase !== "act2") return;
    S.time += min;
    save();
    if (S.time >= C.BUDGET) { S.flags.timeUp = true; save(); go("timeup"); return true; }
    return false;
  }

  /* ================= каркас ================= */
  const PHASE = { setup: "Сбор семьи", brief: "Брифинг", act1: "Акт 1 · Музей", vote1: "Семейное голосование", act2: "Акт 2 · Город", vote2: "Семейное голосование", act3: "Акт 3 · Обвинение", accuse: "Обвинение", debrief: "Разбор дела" };
  function head() {
    let clock = "";
    if (S.phase === "act2") {
      const l = Math.max(0, left());
      clock = `<div class="clock ${l <= 90 ? "low" : ""}" title="Время следствия">${clockStr(C.START + S.time)} · осталось ${Math.floor(l / 60)} ч ${String(l % 60).padStart(2, "0")} мин<span class="bar"><i style="width:${(l / C.BUDGET) * 100}%"></i></span></div>`;
    }
    const inGame = !["setup", "brief", "debrief"].includes(S.phase);
    return `<header class="g-head"><div class="wrap">
      <a class="logo" href="#home" title="Выйти в Бюро (дело сохранено)"><span class="seal">Б</span></a>
      <div class="g-title"><b>Синяя птица</b><span>${PHASE[S.phase] || ""}</span></div>
      <div class="g-tools">${clock}
        ${inGame ? `<button class="btn small" data-a="evidence">Улики <span class="mono">${S.evidence.length}</span></button>
        <button class="btn small" data-a="go" data-v="board"><span class="lbl">Доска</span><span aria-hidden="true">⌗</span></button>` : ""}
        <button class="btn small ghost" data-a="menu">Меню</button>
      </div></div></header>`;
  }
  function render() {
    root.innerHTML = `<div class="game">${head()}<main class="g-main wrap" id="gmain">${screen()}</main></div>`;
    after();
    // отметить улики как просмотренные после показа
  }
  function go(name, extra) { view = Object.assign({ name }, extra || {}); render(); window.scrollTo(0, 0); }
  function hubName() { return { act1: "hub1", act2: "hub2", act3: "hub3" }[S.phase] || "hub"; }
  const back = (label = "Назад") => `<button class="back" data-a="go" data-v="${hubName()}">← ${label}</button>`;

  function hintBox(key, hints) {
    const n = S.hints[key] || 0;
    const shown = hints.slice(0, n).map((h, i) => `<li class="speech reply"><span class="label">Подсказка ${i + 1}</span><br>${h}</li>`).join("");
    return `<div class="stack"><ul style="padding:0;margin:0;display:grid;gap:.5rem;list-style:none">${shown}</ul>
      ${n < hints.length ? `<button class="btn small ghost" data-a="hint" data-k="${key}">Подсказка ${n + 1} из ${hints.length} <span class="dim">(−3 очка)</span></button>` : ""}</div>`;
  }

  /* ================= экраны ================= */
  function screen() {
    const fn = SCREENS[view.name] || SCREENS[hubName()] || SCREENS.hub1;
    return fn();
  }
  const SCREENS = {};

  /* ---------- сбор семьи ---------- */
  SCREENS.hub = SCREENS.setup = function () {
    if (S.phase !== "setup") return SCREENS[hubName()]();
    const list = (view.names || [""]).map((n, i) => `<div class="player-row"><input class="input" id="pl${i}" data-i="${i}" placeholder="Имя ${i + 1}" maxlength="18" value="${esc(n)}">${i > 0 ? `<button class="btn small ghost" data-a="rmPlayer" data-i="${i}" aria-label="Убрать">✕</button>` : "<span></span>"}</div>`).join("");
    return `<div class="split">
      <div class="stack">
        <div class="screen-head"><p class="label">Дело №1</p><h1>Кто сегодня в Бюро?</h1>
        <p class="dim">Впишите всех, кто играет: от 1 до 6 человек. Игра раздаст роли и будет звать нужного человека к экрану.</p></div>
        <label class="field"><span class="label">Название семьи</span><input class="input" id="famIn" maxlength="40" value="${esc(S.family)}"></label>
        <div class="stack" id="plist">${list}</div>
        <div class="row">${(view.names || [""]).length < 6 ? `<button class="btn" data-a="addPlayer">+ Ещё участник</button>` : ""}<button class="btn primary" data-a="startCase">Раздать роли</button></div>
      </div>
      <aside class="panel stack"><span class="label">Роли</span>
        ${Object.values(C.ROLES).map((r) => `<div><b>${r.name}</b><p class="dim">${r.hint}</p></div>`).join("")}
        <p class="dim">Если вас меньше четырёх, роли совмещаются. Если больше, лишние участники — стажёры: они подсказывают и голосуют.</p>
      </aside></div>`;
  };

  /* ---------- брифинг ---------- */
  SCREENS.brief = function () {
    const roleLines = Object.entries(C.ROLES).map(([k, r]) => `<div class="role-line"><b>${r.name}</b><span>${esc(roleHolder(k))} <span class="dim">· ${r.hint}</span></span></div>`).join("");
    const extra = S.players.slice(4).map((p) => esc(p.name)).join(", ");
    return `<div class="stack">
      <div class="screen-head"><p class="label">Брифинг · понедельник, 10:40</p><h1>Пропала «Девочка с синей птицей»</h1></div>
      <div class="comic">
        <div class="frame">${A.cover()}<p>Утром замдиректора музея Алла Ренц нашла витрину в зале 2 пустой. Картину ждали на юбилейной выставке через неделю.</p></div>
        <div class="frame">${A.portrait("lukin")}<p>Окна целы, двери заперты, сигнализация молчала. Ночной сторож уверяет, что ночь была тихой.</p></div>
        <div class="frame">${A.portrait("renz")}<p>«Помогите! Картина не очень дорогая, но для города она бесценна». Бюро поручает дело вашей семье.</p></div>
      </div>
      <div class="panel stack"><h2>Ваша команда: ${esc(S.family)}</h2><div class="roles-list">${roleLines}</div>${extra ? `<p class="dim">Стажёры: ${extra}</p>` : ""}
      <p class="dim">Возраст 12+. Дело вымышленное, по мотивам настоящих краж. Никто не пострадал.</p></div>
      <div class="row"><button class="btn primary" data-a="phase" data-p="act1">Ехать в музей</button></div>
    </div>`;
  };

  /* ---------- акт 1 ---------- */
  const ACT1 = [
    { k: "scene", t: "Осмотр зала 2", d: "Пустая витрина, дверь технической комнаты, окно.", role: "expert", st: () => `${S.scene.filter((x) => x).length}/6 находок` },
    { k: "renz", t: "Допрос: Алла Ренц", d: "Замдиректора. Закрывала музей вечером.", role: "oper", st: () => intStat("renz") },
    { k: "lukin", t: "Допрос: сторож Лукин", d: "Дежурил всю ночь. Уверяет, что всё было тихо.", role: "oper", st: () => intStat("lukin") },
    { k: "cams", t: "Записи камер", d: "Зал 2 и служебный вход, с 17:00 до 10:00.", role: "oper", st: () => `${["E6", "E7", "E8"].filter(has).length}/3 отметки` },
    { k: "zoya", t: "Свидетель: уборщица Зоя", d: "Утром придержала дверь какому-то «технику».", role: "analyst", st: () => (S.witness ? "опрошена" : "не опрошена") },
  ];
  function intStat(k) { const i = S.int[k]; return i ? `${i.broken.length} противоречий` : "не начат"; }
  SCREENS.hub1 = function () {
    const doneAll = ACT1.every((t) => S.done[t.k]);
    return `<div class="stack">
      <div class="screen-head"><p class="label">Акт 1 · Городской музей, 11:00</p><h1>Место преступления</h1>
      <p class="dim">Время здесь не тратится. Пройдите все пять заданий, потом семья тайно проголосует, кого подозревает.</p></div>
      <div class="tasks">${ACT1.map((t) => `<button class="task ${S.done[t.k] ? "done" : ""}" data-a="go" data-v="${t.k === "renz" || t.k === "lukin" ? "int" : t.k}" data-p="${t.k}">
        <span class="k"><span class="label">${C.ROLES[t.role].name}</span><span class="state">${S.done[t.k] ? "✓ " : ""}${t.st()}</span></span>
        <h3>${t.t}</h3><span class="dim">${t.d}</span><span class="who">${esc(roleHolder(t.role))}</span></button>`).join("")}</div>
      <div class="row"><button class="btn primary" data-a="phase" data-p="vote1" ${doneAll ? "" : "disabled"}>Закончить осмотр музея и проголосовать</button>${doneAll ? "" : `<span class="dim">Осталось заданий: ${ACT1.filter((t) => !S.done[t.k]).length}</span>`}</div>
    </div>`;
  };

  /* ---------- осмотр места ---------- */
  SCREENS.scene = function () {
    const z = view.z || 1;
    const found = A.SCENE_SPOTS.filter((s) => s.id && S.scene.includes(s.id));
    const reveal = (S.hints.scene || 0) >= 3;
    return `<div class="stack">${back()}
      <div class="screen-head">${turn("expert")}<h2>Осмотр зала 2</h2><p class="dim">Нажимайте на всё подозрительное. Мелкие детали видно только при увеличении.</p></div>
      <div class="split"><div class="stack">
        <div class="row"><span class="label">Увеличение</span>${[1, 2, 3].map((n) => `<button class="btn small ${z === n ? "primary" : ""}" data-a="zoom" data-z="${n}">${n}×</button>`).join("")}</div>
        <div class="viewer z${z}" id="viewer">${A.scene().replace("</svg>", (reveal ? A.SCENE_SPOTS.filter((s) => s.id && !S.scene.includes(s.id)).map((s) => `<circle cx="${s.x}" cy="${s.y}" r="${s.r}" fill="none" stroke="#e7b04a" stroke-width="4" stroke-dasharray="8 6"/>`).join("") : "") + found.map((s) => `<circle cx="${s.x}" cy="${s.y}" r="${s.r}" fill="none" stroke="#4fbf86" stroke-width="4"/>`).join("") + "</svg>")}</div>
      </div>
      <aside class="stack"><div class="panel stack"><span class="label">Найдено ${found.length} из 6</span>
        <ul class="found-list" style="padding:0;margin:0">${found.map((s) => `<li><b>${C.EVIDENCE[s.id].t}</b><br><span class="dim">${C.EVIDENCE[s.id].d}</span></li>`).join("") || `<li class="dim">Пока ничего</li>`}</ul></div>
        ${hintBox("scene", ["Смотрите не только на витрину: пол, стены, окно. Увеличьте картинку до 3×.", "На стекле витрины правее центра есть след. Внизу слева у витрины — винты. На правом краю рамы что-то синее. У двери — пол.", "Показать все места на картинке"])}
        <button class="btn primary" data-a="finish" data-k="scene" ${found.length >= 3 ? "" : "disabled"}>Закончить осмотр</button>
        ${found.length >= 3 ? "" : `<span class="dim">Найдите хотя бы 3 улики</span>`}
      </aside></div></div>`;
  };

  /* ---------- допросы ---------- */
  SCREENS.int = function () {
    const key = view.p;
    const I = C.INTERROGATIONS[key];
    const pk = I.person || key;
    const P = C.PEOPLE[pk];
    const st = (S.int[key] = S.int[key] || { broken: [], asked: [] });
    const sel = view.sel;
    const final = key === "krylov2";
    const confessed = final && st.broken.length >= 2;
    const stm = I.stmts.map((s) => `<button class="stmt ${st.broken.includes(s.id) ? "broken" : ""} ${sel === s.id ? "sel" : ""}" data-a="selStmt" data-s="${s.id}" ${st.broken.includes(s.id) ? "disabled" : ""}>«${s.text}»</button>`).join("");
    const qs = I.questions.map((q, i) => `<button class="btn small" data-a="ask" data-q="${i}">${q.q}</button>`).join("");
    const reply = view.reply ? `<div class="speech reply"><span class="label">${P.name}</span><p>${view.reply}</p></div>` : "";
    const back2 = key === "krylov1" ? `<button class="back" data-a="go" data-v="loc" data-p="workshop">← В мастерскую</button>` : key === "zimin" && S.phase === "act2" ? `<button class="back" data-a="go" data-v="loc" data-p="zimin">← Назад</button>` : back();
    return `<div class="stack">${back2}
      <div class="interro">
        <div class="portrait">${A.portrait(pk)}<div class="cap"><b>${P.name}</b><span class="dim">${P.role}</span></div></div>
        <div class="stack">
          ${turn("oper")}
          <div class="speech"><p>${I.intro}</p></div>
          ${reply}
          ${confessed ? `<div class="paper stack"><span class="label">Признание</span><p>${I.confession}</p>${has("E17") ? "" : `<p class="dim">Похоже, история картины связана с его семьёй. В архиве это можно было бы проверить.</p>`}</div>
            <div class="row"><button class="btn primary" data-a="go" data-v="accuse">Предъявить обвинение</button></div>` : ""}
          ${qs ? `<div class="stack"><span class="label">Спросить</span><div class="qs">${qs}</div></div>` : ""}
          <div class="stack"><span class="label">Его заявления. Выберите то, что спорит с уликой, и предъявите улику</span><div class="stmts">${stm}</div></div>
          <div class="row"><button class="btn primary" data-a="present" ${sel ? "" : "disabled"}>Предъявить улику</button>
          <button class="btn" data-a="endInt" data-k="${key}">Закончить допрос</button></div>
          ${hintBox("int-" + key, ["Ищите заявление, которое спорит с уже найденной уликой. Откройте список улик.", "Если подходящей улики ещё нет, вернитесь сюда позже: допрос можно продолжить.", "Подсказать пару «заявление — улика»"])}
          ${(S.hints["int-" + key] || 0) >= 3 ? `<p class="dim">${pairHint(key)}</p>` : ""}
        </div></div></div>`;
  };
  function pairHint(key) {
    const I = C.INTERROGATIONS[key], st = S.int[key];
    for (const s of I.stmts) {
      if (st.broken.includes(s.id) || !s.counter.length) continue;
      const e = s.counter.find(has);
      if (e) return `Заявление «${s.text}» опровергает улика «${C.EVIDENCE[e].t}».`;
    }
    return "Сейчас у вас нет улики, которая опровергла бы его слова. Ищите дальше.";
  }

  /* ---------- камеры ---------- */
  SCREENS.cams = function () {
    const cam = view.cam || "hall", m = view.m ?? 0;
    const marks = ["E6", "E7", "E8"].filter(has);
    const jump = (S.hints.cams || 0) >= 3;
    return `<div class="stack">${back()}
      <div class="screen-head">${turn("oper")}<h2>Записи камер, ночь с воскресенья на понедельник</h2>
      <p class="dim">Двигайте ползунок времени. Увидели что-то важное — отметьте кадр.</p></div>
      <div class="split"><div class="stack">
        <div class="tabs" role="tablist"><button class="${cam === "hall" ? "on" : ""}" data-a="cam" data-c="hall">Зал 2</button><button class="${cam === "service" ? "on" : ""}" data-a="cam" data-c="service">Служебный вход</button></div>
        <div class="cam" id="camview">${A.cam(cam, m)}</div>
        <input type="range" class="range" id="camRange" min="0" max="${C.CAM.len}" step="2" value="${m}" aria-label="Время записи">
        <div class="row" style="justify-content:space-between"><div class="row">
          <button class="btn small" data-a="camStep" data-d="-30">−30 мин</button><button class="btn small" data-a="camStep" data-d="-2">−2</button>
          <span class="mono" id="camTime">${A.fmtMin(m)}</span>
          <button class="btn small" data-a="camStep" data-d="2">+2</button><button class="btn small" data-a="camStep" data-d="30">+30 мин</button></div>
          <button class="btn primary" data-a="camMark">Отметить кадр</button></div>
        ${jump ? `<div class="row"><span class="label">Перейти</span><button class="btn small" data-a="camJump" data-c="hall" data-m="540">Зал 02:00</button><button class="btn small" data-a="camJump" data-c="hall" data-m="610">Зал 03:10</button><button class="btn small" data-a="camJump" data-c="service" data-m="946">Вход 08:46</button></div>` : ""}
      </div>
      <aside class="stack">
        <div class="paper stack"><span class="label">Журнал сторожа (почерк Лукина)</span><p class="mono">22:00 заступил<br>00:00 обход — норма<br>02:00 обход — норма<br>04:00 обход — норма<br>06:00 обход — норма<br>08:00 смену сдал</p></div>
        <div class="panel stack"><span class="label">Отмечено ${marks.length} из 3</span>${marks.map((e) => `<p><b>${C.EVIDENCE[e].t}</b><br><span class="dim">${C.EVIDENCE[e].d}</span></p>`).join("") || `<p class="dim">Пока ничего</p>`}</div>
        ${hintBox("cams", ["Сравните журнал сторожа с записью зала: проверьте 00:00 и 02:00.", "Около трёх ночи что-то случилось со светом. А утром, около 08:45, посмотрите служебный вход.", "Показать кнопки перехода к ключевым кадрам"])}
        <button class="btn primary" data-a="finish" data-k="cams" ${marks.length >= 2 ? "" : "disabled"}>Закончить просмотр</button>
      </aside></div></div>`;
  };

  /* ---------- свидетель по памяти ---------- */
  const WQ = [
    { q: "Какого цвета был комбинезон?", o: ["Серый", "Синий", "Зелёный", "Оранжевый"], r: 1 },
    { q: "Что он нёс?", o: ["Рюкзак", "Ящик с инструментами", "Плоский свёрток", "Ничего"], r: 2 },
    { q: "Что было на кепке?", o: ["Ничего", "Звезда", "Надпись «ПОЛИЦИЯ»", "Рамка с буквами"], r: 3 },
    { q: "Что у него на лице?", o: ["Усы", "Очки", "Борода", "Ничего особенного"], r: 0 },
  ];
  SCREENS.zoya = function () {
    const stage = view.stage || "intro";
    if (stage === "intro") {
      return `<div class="stack">${back()}
        <div class="interro"><div class="portrait">${A.portrait("zoya")}<div class="cap"><b>Зоя Михайловна</b><span class="dim">уборщица</span></div></div>
        <div class="stack">${turn("analyst")}
          <div class="speech"><p>Утром я открыла служебный вход и подпёрла дверь ведром. Мимо прошёл мужчина, вроде техник. Я ещё дверь ему придержала... Лицо помню плохо, всё мелькнуло.</p></div>
          <div class="paper stack"><span class="label">Семейное задание</span><p>Один из вас станет памятью Зои. Он 10 секунд смотрит на картинку, остальные отворачиваются. Потом вся семья расспрашивает его, и вместе вы отвечаете на вопросы.</p></div>
          <span class="label">Кто станет памятью Зои?</span>
          <div class="row">${S.players.map((p, i) => `<button class="btn ${view.who === i ? "primary" : ""}" data-a="zoyaWho" data-i="${i}">${esc(p.name)}</button>`).join("")}</div>
          <button class="btn primary" data-a="zoyaShow" ${view.who === undefined ? "disabled" : ""}>Остальные отвернулись. Показать на ${view.retry ? 5 : 10} секунд</button>
        </div></div></div>`;
    }
    if (stage === "show") {
      return `<div class="stack" style="max-width:520px;margin:0 auto"><div class="row" style="justify-content:space-between"><span class="turn">Смотрит только <b>${esc(playerName(view.who))}</b></span><span class="mono" id="zoyaT" style="font-size:2rem">${view.retry ? 5 : 10}</span></div><div class="cam">${A.worker()}</div></div>`;
    }
    // вопросы
    const ans = view.ans || {};
    return `<div class="stack">
      <div class="screen-head"><span class="turn">Расспросите <b>${esc(playerName(view.who))}</b></span><h2>Что запомнила Зоя?</h2><p class="dim">Задавайте вопросы вслух, потом отметьте общий ответ.</p></div>
      ${WQ.map((q, qi) => `<div class="q-block"><b>${q.q}</b><div class="row">${q.o.map((o, oi) => `<button class="chip ${ans[qi] === oi ? "on" : ""}" data-a="zoyaAns" data-q="${qi}" data-o="${oi}">${o}</button>`).join("")}</div></div>`).join("")}
      <div class="row"><button class="btn primary" data-a="zoyaCheck" ${Object.keys(ans).length === WQ.length ? "" : "disabled"}>Записать показания</button></div></div>`;
  };

  /* ---------- голосование ---------- */
  SCREENS.vote = function () {
    const key = S.phase; // vote1 | vote2
    const votes = (S.votes[key] = S.votes[key] || {});
    const i = view.vi ?? 0;
    if (i >= S.players.length) {
      const counts = {};
      C.SUSPECTS.forEach((s) => (counts[s] = 0));
      Object.values(votes).forEach((v) => counts[v]++);
      const max = Math.max(1, ...Object.values(counts));
      const next = key === "vote1" ? "act2" : "act3";
      return `<div class="vote-big">
        <p class="label">${key === "vote1" ? "После осмотра музея" : "Перед решающим допросом"}</p><h1>Кого подозревает семья</h1>
        <div class="bars">${C.SUSPECTS.map((s) => `<div class="barrow"><span>${C.PEOPLE[s].name.split(" ")[1]}</span><span><i style="width:${(counts[s] / max) * 100}%;${counts[s] ? "" : "background:var(--line);width:4px"}"></i></span><span class="mono">${counts[s]}</span></div>`).join("")}</div>
        <div class="panel" style="width:100%;max-width:520px;text-align:left">${S.players.map((p, pi) => `<p>${esc(p.name)} → <b>${C.PEOPLE[votes[pi]].name}</b></p>`).join("")}</div>
        <p class="dim" style="max-width:56ch">Обсудите, почему вы так думаете. Правильный ответ откроется только в финале.</p>
        <button class="btn primary" data-a="phase" data-p="${next}">${key === "vote1" ? "Начать акт 2: город" : "Начать акт 3: обвинение"}</button></div>`;
    }
    if (!view.ready) {
      return `<div class="vote-big"><p class="label">Тайное голосование · ${i + 1} из ${S.players.length}</p>
        <h1>Передайте устройство: ${esc(playerName(i))}</h1><p class="dim">Остальные не подглядывают.</p>
        <button class="btn primary" data-a="voteReady">Я — ${esc(playerName(i))}, готов голосовать</button></div>`;
    }
    return `<div class="stack"><div class="screen-head" style="text-align:center"><h2>${esc(playerName(i))}, кто похитил картину?</h2><p class="dim">Ваш голос увидят только в конце голосования.</p></div>
      <div class="suspects">${C.SUSPECTS.map((s) => `<button class="polaroid" data-a="vote" data-s="${s}">${A.portrait(s)}${C.PEOPLE[s].name}<br><span class="dim" style="font-weight:400;color:#555">${C.PEOPLE[s].role}</span></button>`).join("")}</div></div>`;
  };

  /* ---------- акт 2: карта ---------- */
  SCREENS.act2intro = function () {
    return `<div class="stack" style="max-width:760px">
      <div class="screen-head"><p class="label">Акт 2 · 11:00</p><h1>Город открыт</h1></div>
      <div class="paper stack"><span class="label">Начальник Бюро</span><p>«Даю вам девять часов, до 20:00. Каждая поездка стоит времени, анализ в лаборатории — полчаса, запрос в базу — пятнадцать минут. Всё объехать не успеете. Руководитель, решайте, куда едем».</p></div>
      <div class="row">${turn("lead")}</div>
      <button class="btn primary" data-a="go" data-v="hub2">К карте города</button></div>`;
  };
  const HQ = [
    { k: "lab", t: "Лаборатория", d: "Отпечатки и ткани. 30 мин за анализ.", role: "expert" },
    { k: "db", t: "База данных", d: "Свободный поиск по людям, фирмам, местам. 15 мин.", role: "analyst" },
    { k: "timeline", t: "Хронология", d: "Разложите события ночи по порядку.", role: "analyst" },
    { k: "alibi", t: "Таблица алиби", d: "Кто где был в 03:10?", role: "analyst" },
    { k: "int", p: "renz", t: "Снова: Алла Ренц", d: "Повторный допрос в музее.", role: "oper" },
    { k: "int", p: "lukin", t: "Снова: сторож Лукин", d: "Повторный допрос в музее.", role: "oper" },
  ];
  SCREENS.hub2 = function () {
    const locs = Object.entries(C.LOCATIONS).filter(([, l]) => !l.needs || has(l.needs));
    return `<div class="stack">
      <div class="screen-head">${turn("lead")}<h1>Тихореченск</h1><p class="dim">Выберите, куда ехать. Поездка списывает время сразу; возвращаться в посещённое место бесплатно.</p></div>
      <div class="split"><div class="map-wrap">${A.map(S)}</div>
        <div class="loc-list">${locs.map(([k, l]) => {
          const vis = S.visited[k], can = vis || l.cost <= left();
          return `<button class="loc-btn ${vis ? "visited" : ""}" data-a="loc" data-l="${k}" ${can ? "" : "disabled"}><span><b>${l.name}</b><br><span class="dim">${l.desc}</span></span><span class="mono">${vis ? "✓" : can ? A.fmtCost(l.cost) : "не успеть"}</span></button>`;
        }).join("")}</div></div>
      <h2>Штаб в музее</h2>
      <div class="tasks">${HQ.map((t) => `<button class="task" data-a="go" data-v="${t.k}" ${t.p ? `data-p="${t.p}"` : ""}><span class="k"><span class="label">${C.ROLES[t.role].name}</span><span class="state">${hqState(t.k)}</span></span><h3>${t.t}</h3><span class="dim">${t.d}</span></button>`).join("")}</div>
      <div class="panel row" style="justify-content:space-between"><span>Готовы назвать похитителя? Время ещё есть, но можно закончить раньше.</span><button class="btn danger" data-a="toVote2">Закончить следствие</button></div>
    </div>`;
  };
  function hqState(k) {
    if (k === "timeline") return S.tl && S.tl.solved ? "✓ решено" : "";
    if (k === "alibi") return S.alibi && S.alibi.solved ? "✓ решено" : "";
    if (k === "db") return `${S.db.used.length} запросов`;
    if (k === "lab") return `${Object.keys(S.lab).filter((x) => S.lab[x] === "done").length} анализов`;
    return "";
  }
  SCREENS.timeup = function () {
    return `<div class="vote-big"><p class="label">20:00</p><h1>Время следствия вышло</h1>
      <div class="paper" style="max-width:560px;text-align:left"><p>«Всё, коллеги. Завтра утром пресса. Мне нужен подозреваемый сегодня». Начальник Бюро ждёт решения семьи.</p></div>
      <button class="btn primary" data-a="phase" data-p="vote2">К голосованию</button></div>`;
  };

  /* ---------- локации ---------- */
  SCREENS.loc = function () {
    const k = view.p, L = C.LOCATIONS[k];
    const toMap = `<button class="back" data-a="go" data-v="hub2">← На карту</button>`;
    let body = "";
    if (k === "nika") {
      body = `<div class="interro"><div class="portrait">${A.portrait("nika")}<div class="cap"><b>Ника Орлова</b><span class="dim">практикантка</span></div></div>
        <div class="stack">${turn("oper")}<div class="speech"><p>Я в воскресенье уходила последней из смотрителей, в половине шестого. Фотографировала залы для музейной страницы. Телефон берите, пароль... я его вечно забываю. Это год, когда наша Птица попала в музей. Он есть на табличке у витрины.</p></div>
        <button class="btn primary" data-a="go" data-v="phone">Открыть телефон Ники</button></div></div>`;
    } else if (k === "workshop") {
      body = `<div class="stack">
        <p class="dim">Небольшая мастерская на Заводской, 7. Пахнет герметиком, на стене висят синие комбинезоны с эмблемой «СР». За столом блокнот, в углу жена мастера Марина разбирает заказы.</p>
        <div class="tasks">
          <button class="task ${S.int.krylov1 ? "done" : ""}" data-a="go" data-v="int" data-p="krylov1"><span class="label">Оперативник</span><h3>Допросить Крылова</h3><span class="dim">${intStat("krylov1")}</span></button>
          <button class="task ${S.flags.wife ? "done" : ""}" data-a="wife"><span class="label">Оперативник</span><h3>Поговорить с Мариной</h3><span class="dim">${S.flags.wife ? "«Уехал вечером на объект, вернулся к обеду»" : "Где муж был ночью?"}</span></button>
          <button class="task ${S.items.cup ? "done" : ""}" data-a="item" data-i="cup"><span class="label">Эксперт</span><h3>Чашка из-под чая</h3><span class="dim">${S.items.cup ? "Упакована для лаборатории" : "Крылов пил из неё при вас. Забрать с его согласия?"}</span></button>
          <button class="task ${S.items.fabric ? "done" : ""}" data-a="item" data-i="fabric"><span class="label">Эксперт</span><h3>Образец ткани комбинезона</h3><span class="dim">${S.items.fabric ? "Образец взят" : "Обрезок со стола закройщика"}</span></button>
          <button class="task ${has("E16") ? "done" : ""}" data-a="go" data-v="cipher"><span class="label">Аналитик</span><h3>Блокнот со странной строкой</h3><span class="dim">${has("E16") ? "Расшифровано" : "Буквы без смысла. Шифр?"}</span></button>
        </div></div>`;
    } else if (k === "archive") {
      const cards = [
        { y: "1958", t: "Самовар медный, с медалями", d: "Дар жителей с. Нижние Ключи. Без замечаний." },
        { y: "1964", t: "Икона «Никола», XIX в.", d: "Передана из церкви с. Сосновка после закрытия храма." },
        { y: "1964", t: "Холст «Девочка с синей птицей»", d: "Поступила от: Крылова Анна Петровна, с. Верхние Ключи. Пометка карандашом: «изъята по решению сельсовета, владелица возражала». Автор, по словам владелицы, — её отец, сельский учитель Пётр Крылов.", key: true },
        { y: "1971", t: "Прялка расписная", d: "Куплена у жительницы с. Верхние Ключи за 3 рубля." },
      ];
      body = `<div class="stack"><p class="dim">Архивистка выдвигает ящик картотеки поступлений: «Ищите сами, тут всё по годам».</p>${turn("analyst")}
        <div class="ev-grid">${cards.map((c, i) => `<button class="ev ${view.card === i ? "sel" : ""}" data-a="archCard" data-i="${i}"><span class="src">Карточка поступления · ${c.y}</span><b>${c.t}</b>${view.card === i ? `<p>${c.d}</p>` : ""}</button>`).join("")}</div></div>`;
    } else if (k === "zimin") {
      body = `<div class="stack"><p class="dim">Особняк в старом центре. Стены увешаны картинами. Зимин принимает вас в халате и явно недоволен.</p>
        <button class="btn primary" data-a="go" data-v="int" data-p="zimin">Допросить Зимина</button></div>`;
    } else if (k === "insurance") {
      if (!has("R1")) addEv("R1", true);
      body = `<div class="stack">${turn("lead")}<div class="paper stack"><span class="label">Письмо из архива страховой «Надёжный щит»</span>
        <p>«Сумма страхования картины „Девочка с синей птицей“ увеличена по требованию организатора выставки „Сто лет городу“ (п. 4.2 договора). Выгодоприобретатель — городской музей. Замдиректора А. Б. Ренц подписала документ как ответственное лицо».</p></div>
        <p class="dim">Выходит, страховка — требование выставки. Ренц на ней ничего не получает. Улика «${C.EVIDENCE.R1.t}» добавлена.</p></div>`;
    } else if (k === "station") {
      const code = view.code || "";
      body = has("E18")
        ? `<div class="paper stack"><span class="label">Ячейка 17</span><p>${C.EVIDENCE.E18.d}</p></div>`
        : view.open
          ? `<div class="stack"><div class="paper stack"><span class="label">Ячейка 17 открыта</span><p>Внутри старый коричневый чемодан. Пустой. Слишком тяжёлый для пустого.</p></div>${turn("expert")}<button class="btn primary" data-a="stationBottom">Простучать дно чемодана</button></div>`
          : `<div class="stack" style="max-width:340px">${turn("lead")}<p class="dim">Автоматическая камера хранения. Ячейка 17, на дверце кодовый замок из четырёх цифр.</p>
            <div class="pin-dots">${[0, 1, 2, 3].map((i) => `<i class="${i < code.length ? "f" : ""}"></i>`).join("")}</div>
            <div class="keypad">${[1, 2, 3, 4, 5, 6, 7, 8, 9, "", 0, "⌫"].map((d) => d === "" ? "<span></span>" : `<button data-a="lockKey" data-d="${d}">${d}</button>`).join("")}</div></div>`;
    }
    return `<div class="stack">${toMap}<div class="screen-head"><p class="label">${S.visited[k] ? "Посещено" : ""}</p><h1>${L.name}</h1></div>${body}</div>`;
  };

  /* ---------- телефон Ники ---------- */
  SCREENS.phone = function () {
    const ph = S.phone;
    const app = view.app || "home";
    let scr = "";
    const bar = `<div class="bar"><span>Ника</span><span>12:41 · 64%</span></div>`;
    if (!ph.unlocked) {
      const code = view.code || "";
      scr = `${bar}<div style="padding:2rem 1rem;text-align:center" class="stack"><span class="label">Введите код</span>
        <div class="pin-dots">${[0, 1, 2, 3].map((i) => `<i class="${i < code.length ? "f" : ""}"></i>`).join("")}</div>
        <div class="keypad">${[1, 2, 3, 4, 5, 6, 7, 8, 9, "", 0, "⌫"].map((d) => d === "" ? "<span></span>" : `<button data-a="pinKey" data-d="${d}">${d}</button>`).join("")}</div>
        ${ph.tries ? `<span class="dim">Неверный код · попыток ${ph.tries}</span>` : ""}</div>`;
    } else if (app === "home") {
      scr = `${bar}<div class="app-grid">
        <button class="app" data-a="papp" data-p="chats"><i style="background:#2f9e5b">✉</i>Сообщения</button>
        <button class="app" data-a="papp" data-p="gallery"><i style="background:#d9822b">▦</i>Галерея</button>
        <button class="app" data-a="papp" data-p="notes"><i style="background:#c9a227">✎</i>Заметки</button></div>`;
    } else if (app === "chats") {
      scr = `${bar}<div class="top"><button data-a="papp" data-p="home">‹</button><b>Сообщения</b></div>
        ${[["group", "Смотрители музея", "Ника: Опять тот коллекционер..."], ["mom", "Мама", "Купи хлеба"], ["liza", "Лиза", "ну что, в кино в пятницу?"]].map(([k, n, l]) => `<button class="chat-item" data-a="papp" data-p="chat-${k}"><b>${n}</b><small>${l}</small></button>`).join("")}`;
    } else if (app.startsWith("chat-")) {
      const k = app.slice(5);
      const chats = {
        group: { n: "Смотрители музея", m: [["Алла Борисовна", "пт 10:12", "Коллеги, в зале 2 сломан датчик движения. Мастер будет в среду. Валентин, вы же витрины ставили, гляньте заодно, не сбоит ли подсветка?"], ["Валентин (стекло)", "пт 18:40", "Загляну в воскресенье, посмотрю витрину."], ["me", "сб 15:02", "Опять тот коллекционер в шляпе приходил, спрашивал, продаётся ли Птица 🙄"], ["Алла Борисовна", "сб 15:20", "Не продаётся. Пусть не мечтает."], ["me", "вс 17:31", "Ушла, всё закрыто. Свет в зале 2 погасила"]] },
        mom: { n: "Мама", m: [["Мама", "вс 16:00", "Купи хлеба"], ["me", "вс 16:02", "ок"]] },
        liza: { n: "Лиза", m: [["Лиза", "вс 20:11", "ну что, в кино в пятницу?"], ["me", "вс 20:15", "давай! только после практики"]] },
      }[k];
      if (k === "group" && !has("E12")) setTimeout(() => { addEv("E12"); }, 50);
      scr = `${bar}<div class="top"><button data-a="papp" data-p="chats">‹</button><b>${chats.n}</b></div><div class="chat">${chats.m.map(([w, t, x]) => `<div class="msg ${w === "me" ? "me" : ""}"><small>${w === "me" ? "Ника" : w} · ${t}</small>${x}</div>`).join("")}</div>`;
    } else if (app === "gallery") {
      scr = `${bar}<div class="top"><button data-a="papp" data-p="home">‹</button><b>Галерея</b></div>
        <div class="gallery"><button data-a="papp" data-p="ph-cat">${A.catPhoto()}<span>сб 09:14</span></button><button data-a="papp" data-p="ph-a">${A.photo(false)}<span>вс 16:50</span></button><button data-a="papp" data-p="ph-b">${A.photo(true)}<span>вс 17:25</span></button></div>
        <div style="padding:1rem"><button class="btn primary" data-a="go" data-v="diff" style="width:100%">Сравнить фото 16:50 и 17:25</button></div>`;
    } else if (app.startsWith("ph-")) {
      const p = app.slice(3);
      scr = `${bar}<div class="top"><button data-a="papp" data-p="gallery">‹</button><b>${p === "cat" ? "Барсик" : p === "a" ? "Зал 2, 16:50" : "Зал 2, 17:25"}</b></div><div style="padding:.5rem">${p === "cat" ? A.catPhoto() : A.photo(p === "b")}</div>`;
    } else if (app === "notes") {
      scr = `${bar}<div class="top"><button data-a="papp" data-p="home">‹</button><b>Заметки</b></div><div class="chat"><div class="msg">Пароль от телефона = год Птицы (на табличке!!)</div><div class="msg">Купить корм Барсику</div></div>`;
    }
    return `<div class="stack"><button class="back" data-a="go" data-v="loc" data-p="nika">← К Нике</button>
      <div class="split"><div class="phone"><div class="scr">${scr}</div></div>
      <aside class="stack">${turn("oper")}<div class="panel stack"><span class="label">Что ищем</span><p>Переписку смотрителей и фотографии зала. Ника фотографировала зал дважды.</p></div>
        ${ph.unlocked ? "" : hintBox("phone", ["Ника сказала: код — год, когда картина попала в музей.", "Посмотрите улику «Табличка» или вернитесь к осмотру зала.", "Код: 1964"])}
      </aside></div></div>`;
  };

  /* ---------- найди отличия ---------- */
  SCREENS.diff = function () {
    const found = S.diff;
    const reveal = (S.hints.diff || 0) >= 3;
    const marks = A.DIFFS.filter((d) => found.includes(d.id) || reveal).map((d) => `<span class="mark" style="left:${(d.x / 600) * 100}%;top:${(d.y / 400) * 100}%;${found.includes(d.id) ? "" : "border-style:dashed;border-color:var(--amber)"}"></span>`).join("");
    return `<div class="stack"><button class="back" data-a="go" data-v="phone">← К телефону</button>
      <div class="screen-head">${turn("expert")}<h2>Найдите 5 отличий</h2><p class="dim">Слева зал в 16:50, справа в 17:25, когда музей уже закрылся. Нажимайте на отличия на любом фото.</p></div>
      <div class="two-col"><div class="photo" data-ph="a">${A.photo(false)}${marks}<span class="cap">вс 16:50</span></div><div class="photo" data-ph="b">${A.photo(true)}${marks}<span class="cap">вс 17:25</span></div></div>
      <div class="split" style="margin-top:1rem"><div class="panel stack"><span class="label">Найдено ${found.length} из 5</span>${A.DIFFS.filter((d) => found.includes(d.id)).map((d) => `<p>${d.key ? "<b>" : ""}${d.label}${d.key ? "</b>" : ""}</p>`).join("") || `<p class="dim">Пока ничего</p>`}</div>
      <div class="stack">${hintBox("diff", ["Начните с часов и правой части фото.", "Сравните окно, скамью и красный огнетушитель.", "Показать все отличия"])}
      <button class="btn primary" data-a="diffDone" ${found.includes("door") ? "" : "disabled"}>Готово</button></div></div></div>`;
  };

  /* ---------- база данных ---------- */
  SCREENS.db = function () {
    const log = S.db.log.map((l) => `<span class="q">&gt; ${esc(l.q)}</span>\n${l.err ? `<span class="err">${esc(l.out)}</span>` : esc(l.out)}\n\n`).join("");
    return `<div class="stack">${back()}
      <div class="screen-head">${turn("analyst")}<h2>База данных полиции Тихореченска</h2><p class="dim">Вводите имя, фамилию, название фирмы или место. Успешный запрос стоит 15 минут, пустой — бесплатно.</p></div>
      <div class="split"><div><div class="term" id="term">ТИХОРЕЧЕНСК · ИНФОРМАЦИОННЫЙ ЦЕНТР\nГотов к запросу.\n\n${log}</div>
        <form class="term-in" id="dbForm"><input id="dbIn" autocomplete="off" placeholder="например: Ренц" aria-label="Запрос"><button class="btn primary">Найти</button></form></div>
      <aside class="stack">${hintBox("db", ["Начните с фамилий подозреваемых.", "На кепке «техника» была эмблема. Чья она? Попробуйте название мастерской.", "Введите: Крылов"])}</aside></div></div>`;
  };

  /* ---------- лаборатория ---------- */
  const LAB = [
    { k: "glassDb", t: "Отпечаток со стекла → поиск по базе", req: ["E1"], items: [] },
    { k: "glassCup", t: "Отпечаток со стекла ↔ отпечатки на чашке", req: ["E1"], items: ["cup"] },
    { k: "fiber", t: "Синяя нитка ↔ образцы тканей", req: ["E3"], items: ["fabric"] },
  ];
  const ITEM = { cup: "чашка из мастерской", fabric: "образец ткани из мастерской" };
  SCREENS.lab = function () {
    if (view.mg === "glassCup") return labPrints();
    if (view.mg === "fiber") return labFiber();
    return `<div class="stack">${back()}
      <div class="screen-head">${turn("expert")}<h2>Лаборатория</h2><p class="dim">Каждый анализ занимает 30 минут.</p></div>
      <div class="tasks">${LAB.map((l) => {
        const miss = l.req.filter((e) => !has(e)).map((e) => C.EVIDENCE[e].t).concat(l.items.filter((i) => !S.items[i]).map((i) => ITEM[i]));
        const st = S.lab[l.k];
        return `<button class="task ${st === "done" ? "done" : ""} ${miss.length ? "locked" : ""}" data-a="labRun" data-k="${l.k}" ${miss.length ? "disabled" : ""}><span class="state">${st === "done" ? "✓ готово" : miss.length ? "нужно: " + miss.join(", ") : st ? "в работе" : "30 мин"}</span><h3>${l.t}</h3>${st === "done" ? `<span class="dim">${labResult(l.k)}</span>` : ""}</button>`;
      }).join("")}</div></div>`;
  };
  function labResult(k) {
    return { glassDb: C.EVIDENCE.E21.d, glassCup: C.EVIDENCE.E14.d, fiber: C.EVIDENCE.E15.d }[k];
  }
  function labPrints() {
    const opts = [["loop", true, 2, "Палец 1"], ["whorl", false, 0, "Палец 2"], ["whorl", true, 0, "Палец 3"], ["arch", false, 0, "Палец 4"]];
    const bad = view.bad || [];
    return `<div class="stack"><button class="back" data-a="go" data-v="lab">← В лабораторию</button>
      <div class="screen-head">${turn("expert")}<h2>Сравните отпечатки</h2><p class="dim">Слева след со стекла витрины. Какой из отпечатков с чашки совпадает? След на стекле немного повёрнут.</p></div>
      <div class="split"><div class="stack"><div class="row" style="align-items:flex-start"><div class="target" style="transform:rotate(-14deg);flex:0 0 160px">${A.print("whorl", true, 0)}<p class="label" style="text-align:center">Стекло</p></div></div>
      <div class="choices">${opts.map((o, i) => `<button class="choice ${bad.includes(i) ? "bad" : ""}" data-a="pickPrint" data-i="${i}" ${bad.includes(i) ? "disabled" : ""}>${A.print(o[0], o[1], o[2])}${o[3]}</button>`).join("")}</div></div>
      <aside>${hintBox("prints", ["Сначала тип узора: петля, завиток или дуга.", "На следе со стекла есть белый шрам поперёк линий.", "Это палец 3."])}</aside></div></div>`;
  }
  function labFiber() {
    const opts = [["#55606e", false, false, false, "Форма сторожа"], ["#2f55c8", true, false, false, "Джинсы"], ["#2f55c8", true, true, false, "Комбинезон «СР»"], ["#2a2f4a", true, false, true, "Пальто Зимина"], ["#7fb3d5", false, false, false, "Халат уборщицы"]];
    const bad = view.bad || [];
    return `<div class="stack"><button class="back" data-a="go" data-v="lab">← В лабораторию</button>
      <div class="screen-head">${turn("expert")}<h2>Нитка под микроскопом</h2><p class="dim">Сравните нитку с витрины с образцами тканей. Важны цвет, плетение и прожилки.</p></div>
      <div class="split"><div class="stack"><div class="target" style="max-width:180px">${A.fabric("#2f55c8", true, true, false)}<p class="label" style="text-align:center">Нитка с витрины</p></div>
      <div class="choices">${opts.map((o, i) => `<button class="choice ${bad.includes(i) ? "bad" : ""}" data-a="pickFiber" data-i="${i}" ${bad.includes(i) ? "disabled" : ""}>${A.fabric(o[0], o[1], o[2], o[3])}${o[4]}</button>`).join("")}</div></div>
      <aside>${hintBox("fiber", ["Плетение бывает диагональным или в клетку.", "У нитки с витрины есть красная прожилка.", "Это комбинезон «СР»."])}</aside></div></div>`;
  }

  /* ---------- хронология ---------- */
  SCREENS.timeline = function () {
    if (!S.tl) { S.tl = { order: [6, 3, 8, 1, 5, 2, 7, 4], tries: 0, solved: false, checked: false }; save(); }
    const T = S.tl, byId = Object.fromEntries(C.TIMELINE.map((e) => [e.id, e]));
    const items = T.order.map((id, i) => {
      const ok = T.checked && id === C.TIMELINE[i].id;
      const cls = T.checked ? (ok ? "ok" : "no") : "";
      return `<div class="tl-item ${cls}"><div><span class="t">${ok || T.solved ? byId[id].t : "??:??"}</span><br>${byId[id].text}</div><div></div>
        ${T.solved ? "" : `<div class="mv"><button data-a="tlMove" data-i="${i}" data-d="-1" aria-label="Выше" ${i === 0 ? "disabled" : ""}>↑</button><button data-a="tlMove" data-i="${i}" data-d="1" aria-label="Ниже" ${i === T.order.length - 1 ? "disabled" : ""}>↓</button></div>`}</div>`;
    }).join("");
    const q = T.solved && !has("E20") ? `<div class="q-block"><b>Двери музея стояли на сигнализации с 18:00 до 08:30, и их не вскрывали. Что это значит?</b>
      <div class="opts">${["Похититель влез ночью через окно", "Похититель был внутри с вечера и вышел утром", "У похитителя был код от сигнализации"].map((o, i) => `<button class="opt" data-a="tlQ" data-i="${i}" style="background:none;color:inherit;text-align:left">${o}</button>`).join("")}</div></div>` : "";
    return `<div class="stack">${back()}
      <div class="screen-head">${turn("analyst")}<h2>Хронология ночи</h2><p class="dim">Расставьте события от раннего к позднему. Время откроется у тех, что стоят на месте.</p></div>
      <div class="split"><div class="stack"><div class="tl">${items}</div>
        ${T.solved ? "" : `<div class="row"><button class="btn primary" data-a="tlCheck">Проверить порядок</button><span class="dim">Попыток: ${T.tries}</span></div>`}
        ${q}${has("E20") ? `<div class="paper"><b>${C.EVIDENCE.E20.t}</b><p>${C.EVIDENCE.E20.d}</p></div>` : ""}</div>
      <aside>${hintBox("timeline", ["Музей закрывается в 17:00, сигнализацию ставят в 18:00.", "Ника фотографировала зал дважды: сначала дверь закрыта, потом приоткрыта.", "Показать правильный порядок"])}</aside></div></div>`;
  };

  /* ---------- алиби ---------- */
  SCREENS.alibi = function () {
    if (!S.alibi) { S.alibi = { grid: Object.fromEntries(C.ALIBI.people.map((p) => [p, [0, 0, 0, 0]])), solved: false }; save(); }
    const G = S.alibi.grid, sym = ["", "✗", "✓"], cls = ["", "x", "v"];
    return `<div class="stack">${back()}
      <div class="screen-head">${turn("analyst")}<h2>Где каждый был в 03:10?</h2><p class="dim">Нажимайте на клетки: один раз — ✗ (точно нет), второй — ✓ (точно да). В каждой строке и каждом столбце ровно одна ✓.</p></div>
      <div class="split"><div class="stack"><div class="grid-wrap"><table class="alibi"><thead><tr><th></th>${C.ALIBI.places.map((p) => `<th>${p}</th>`).join("")}</tr></thead>
        <tbody>${C.ALIBI.people.map((p) => `<tr><th>${C.PEOPLE[p].name}</th>${G[p].map((v, i) => `<td><button class="${cls[v]}" data-a="alibiCell" data-p="${p}" data-i="${i}" ${S.alibi.solved ? "disabled" : ""} aria-label="${C.PEOPLE[p].name}: ${C.ALIBI.places[i]}">${sym[v]}</button></td>`).join("")}</tr>`).join("")}</tbody></table></div>
        ${S.alibi.solved ? `<div class="paper"><b>${C.EVIDENCE.E19.t}</b><p>${C.EVIDENCE.E19.d}</p></div>` : `<div class="row"><button class="btn primary" data-a="alibiCheck">Проверить</button></div>`}</div>
      <aside class="stack"><div class="paper stack"><span class="label">Сводка оперативников</span>${C.ALIBI.clues.map((c) => `<p>• ${c}</p>`).join("")}</div>
        ${hintBox("alibi", ["Начните с поста охраны и поезда: про них сказано прямо.", "Жена Крылова исключает «Дома» для него.", "Показать решение"])}</aside></div></div>`;
  };

  /* ---------- шифр ---------- */
  function caesar(text, shift) {
    const abc = C.CIPHER.abc, n = abc.length;
    return text.split("").map((ch) => { const i = abc.indexOf(ch); return i < 0 ? ch : abc[(i + shift + n * 4) % n]; }).join("");
  }
  const ENC = () => caesar(C.CIPHER.plain, C.CIPHER.shift);
  SCREENS.cipher = function () {
    const s = S.cipher.shift, abc = C.CIPHER.abc;
    return `<div class="stack"><button class="back" data-a="go" data-v="loc" data-p="workshop">← В мастерскую</button>
      <div class="screen-head">${turn("analyst")}<h2>Блокнот Крылова</h2><p class="dim">Похоже на шифр. Крутите сдвиг алфавита, пока строка не станет читаемой.</p></div>
      <div class="split"><div class="stack">
        <div class="notebook">${ENC()}<br><span style="font-size:.85rem;color:#a33">на полях: «как у Гая Юлия»</span></div>
        <div class="wheel"><button class="btn" data-a="shift" data-d="-1" aria-label="Сдвиг меньше">−</button><span class="n mono">${s}</span><button class="btn" data-a="shift" data-d="1" aria-label="Сдвиг больше">+</button></div>
        <div class="abc"><div>${abc.split("").join(" ")}</div><div style="color:var(--amber)">${abc.split("").map((c) => caesar(c, -s)).join(" ")}</div></div>
        <div class="decoded" aria-live="polite">${caesar(ENC(), -s)}</div>
        ${has("E16") ? `<div class="paper"><b>Расшифровано!</b><p>${C.EVIDENCE.E16.d}</p></div>` : `<button class="btn primary" data-a="cipherCheck">Читается! Записать</button>`}
      </div>
      <aside>${hintBox("cipher", ["Каждая буква заменена на букву, стоящую дальше по алфавиту на одно и то же число шагов.", "Пометка на полях: Гай Юлий Цезарь сдвигал буквы на три.", "Поставить сдвиг 3"])}</aside></div></div>`;
  };

  /* ---------- доска улик ---------- */
  SCREENS.board = function () {
    const pinned = S.board;
    const pool = S.evidence.filter((e) => !pinned[e]);
    const sel = view.sel;
    const pin = (e) => `<button class="pin ${sel === e ? "sel" : ""}" data-a="pinSel" data-e="${e}" title="${C.EVIDENCE[e].d}">${C.EVIDENCE[e].t}</button>`;
    return `<div class="stack">${S.phase === "accuse" ? `<button class="back" data-a="go" data-v="accuse">← К обвинению</button>` : back("К делу")}
      <div class="screen-head"><span class="turn">Вся семья у экрана</span><h2>Доска улик</h2><p class="dim">Нажмите на улику, потом на фото человека, чтобы приколоть её красной нитью. Нажмите на приколотую улику, чтобы снять. Доска не влияет на счёт, она помогает договориться.</p></div>
      <div class="cork"><div class="suspects">${C.SUSPECTS.map((s) => `<div class="sus"><button class="polaroid ${sel ? "target" : ""}" data-a="pinTo" data-s="${s}">${A.portrait(s)}${C.PEOPLE[s].name}</button><div class="pins">${Object.keys(pinned).filter((e) => pinned[e] === s).map(pin).join("")}</div></div>`).join("")}</div>
      <div class="pool">${pool.map(pin).join("") || `<span style="color:#f6f3ec">Все улики на доске</span>`}</div></div></div>`;
  };

  /* ---------- акт 3 ---------- */
  SCREENS.hub3 = function () {
    return `<div class="stack">
      <div class="screen-head"><p class="label">Акт 3 · Бюро, вечер</p><h1>Решающий допрос</h1><p class="dim">Вызовите любого подозреваемого ещё раз. Крылов приглашён на очную беседу: если поймать его на двух противоречиях, он может сознаться.</p></div>
      <div class="tasks">
        <button class="task" data-a="go" data-v="int" data-p="krylov2"><span class="label">Оперативник</span><h3>Валентин Крылов</h3><span class="dim">${intStat("krylov2")}</span></button>
        <button class="task" data-a="go" data-v="int" data-p="lukin"><span class="label">Оперативник</span><h3>Пётр Лукин</h3><span class="dim">${intStat("lukin")}</span></button>
        <button class="task" data-a="go" data-v="int" data-p="renz"><span class="label">Оперативник</span><h3>Алла Ренц</h3><span class="dim">${intStat("renz")}</span></button>
        <button class="task" data-a="go" data-v="int" data-p="zimin"><span class="label">Оперативник</span><h3>Аркадий Зимин</h3><span class="dim">${intStat("zimin")}</span></button>
      </div>
      <div class="row"><button class="btn primary" data-a="go" data-v="accuse">Предъявить обвинение</button></div></div>`;
  };

  /* ---------- обвинение ---------- */
  SCREENS.accuse = function () {
    const ans = S.accuse;
    const ev = S.evidence;
    const blocks = C.ACCUSE.map((q) => {
      const a = ans[q.id] || { o: null, ev: [] };
      return `<div class="q-block"><b>${q.q}</b>
        <div class="opts">${q.opts.map((o, i) => `<label class="opt"><input type="radio" name="q-${q.id}" id="q-${q.id}-${i}" data-a="accOpt" data-q="${q.id}" data-o="${i}" ${a.o === i ? "checked" : ""}><span>${o}</span></label>`).join("")}</div>
        <span class="label">Приложите до трёх улик</span>
        <div class="chips">${ev.map((e) => `<button class="chip ${a.ev.includes(e) ? "on" : ""}" data-a="accEv" data-q="${q.id}" data-e="${e}">${C.EVIDENCE[e].t}</button>`).join("")}</div></div>`;
    }).join("");
    const ready = C.ACCUSE.every((q) => ans[q.id] && ans[q.id].o !== null && ans[q.id].o !== undefined);
    return `<div class="stack">${S.phase === "act3" ? `<button class="back" data-a="go" data-v="hub3">← К допросам</button>` : ""}
      <div class="screen-head">${turn("lead")}<h1>Реконструкция и обвинение</h1><p class="dim">Ответьте всей семьёй. За каждый ответ очки дают и за верный вариант, и за подходящие улики.</p>
      <button class="btn small" data-a="go" data-v="board" style="justify-self:start">Открыть доску улик</button></div>
      ${blocks}
      <div class="row"><button class="btn danger" data-a="accSubmit" ${ready ? "" : "disabled"}>Предъявить обвинение</button>${ready ? "" : `<span class="dim">Ответьте на все шесть вопросов</span>`}</div></div>`;
  };

  /* ---------- разбор ---------- */
  SCREENS.debrief = function () {
    const R = S.result;
    const st = `<span class="big-stars">${[0, 1, 2].map((i) => (i < R.stars ? "★" : `<span class="off">★</span>`)).join("")}</span>`;
    const rows = C.ACCUSE.map((q) => { const a = S.accuse[q.id]; const ok = a.o === q.right; return `<div class="result-row"><span>${q.q}<br><span class="dim">${ok ? "Верно" : "Правильно"}: ${q.opts[q.right]}</span></span><span class="mono" style="color:${ok ? "var(--ok)" : "var(--stamp)"}">${ok ? "✓" : "✗"}</span></div>`; }).join("");
    const keyEv = ["E1", "E4", "E7", "E8", "E9", "E11", "E12", "E14", "E15", "E16", "E17", "E18", "E19", "E20", "E22"];
    const missed = keyEv.filter((e) => !has(e));
    const badges = Object.entries(R.badges).filter(([, b]) => b.length).map(([n, b]) => `<div class="panel stack"><h3>${esc(n)}</h3><div class="badges">${b.map((k) => `<span class="badge"><i>${C.BADGES[k].ic}</i>${C.BADGES[k].name}</span>`).join("")}</div></div>`).join("");
    return `<div class="stack">
      <div class="verdict">${R.stars ? `<span class="stamp">ДЕЛО РАСКРЫТО</span>` : `<span class="stamp">ОШИБКА СЛЕДСТВИЯ</span>`}${st}
        <h1>${R.score} очков из 100</h1><p class="dim" style="max-width:60ch">${R.stars ? (has("E18") ? "Картина возвращается в музей. А вот что будет с Крыловым и с самой картиной — пусть решает суд и, может быть, семья Крыловых получит её обратно законно." : "Похититель назван верно, но картину вы не нашли. Через неделю её обнаружат на вокзале.") : "Обвинён невиновный человек. Настоящий похититель уехал в Верхние Ключи."}</p></div>
      <div class="two-col">
        <div class="panel stack"><h2>Ваши ответы</h2>${rows}</div>
        <div class="panel stack"><h2>Счёт</h2>${R.lines.map(([t, v]) => `<div class="result-row"><span>${t}</span><span class="mono">${v > 0 ? "+" : ""}${v}</span></div>`).join("")}</div>
      </div>
      <div class="paper stack"><span class="label">Как было на самом деле</span>
        <p>В воскресенье в 16:20 Валентин Крылов пришёл в музей как посетитель, в рабочем комбинезоне, и спрятался в технической комнате: временный ключ он так и не вернул. В 17:25 Ника случайно сфотографировала приоткрытую дверь. В 03:10 он выключил щиток в коридоре, камеры ослепли на четыре минуты, датчик движения в зале был сломан. Своей отвёрткой он открыл витрину и оставил на стекле отпечаток левого большого пальца, которого не было в базе. Утром в 08:47 Зоя Михайловна сама придержала ему дверь. Картину он спрятал в чемодане с двойным дном на вокзале, чтобы потом увезти в Верхние Ключи. Её написал его прадед, и в 1964 году её забрали у семьи.</p></div>
      ${missed.length ? `<div class="panel stack"><h2>Пропущенные улики</h2><div class="chips">${missed.map((e) => `<span class="chip" title="${C.EVIDENCE[e].d}">${C.EVIDENCE[e].t} · ${C.EVIDENCE[e].src}</span>`).join("")}</div></div>` : ""}
      <h2>Значки детективов</h2>
      <div class="grid-cards">${badges || `<div class="panel"><p class="dim">В этот раз без значков. Попробуйте без подсказок!</p></div>`}</div>
      <h2>По мотивам реальных дел</h2>
      <div class="grid-cards">${C.REAL.map((r) => `<div class="paper stack"><h3>${r.title}</h3><p>${r.text}</p></div>`).join("")}</div>
      <div class="panel stack"><h3>Обсудите за чаем</h3><p class="dim">Можно ли забрать «своё», если когда-то его отняли несправедливо? Как могла бы поступить семья Крыловых по-другому?</p></div>
      <div class="row"><a class="btn primary" href="#profile">В профиль семьи</a><button class="btn" data-a="restart">Сыграть заново</button></div></div>`;
  };

  /* ================= действия ================= */
  const ACT = {};
  ACT.go = (d) => go(d.v, d.p ? { p: d.p } : {});
  ACT.hint = (d) => { S.hints[d.k] = (S.hints[d.k] || 0) + 1; save(); hintSideEffects(d.k); render(); };
  function hintSideEffects(k) {
    const n = S.hints[k];
    if (n < 3) return;
    if (k === "timeline") { S.tl.order = C.TIMELINE.map((e) => e.id); }
    if (k === "alibi") { const g = S.alibi.grid; for (const p of C.ALIBI.people) g[p] = [0, 0, 0, 0].map((_, i) => (i === C.ALIBI.answer[p] ? 2 : 1)); }
    if (k === "cipher") S.cipher.shift = C.CIPHER.shift;
    save();
  }
  ACT.evidence = () => {
    const list = S.evidence.map((e) => `<div class="ev"><span class="src">${C.EVIDENCE[e].src}</span><b>${C.EVIDENCE[e].t}</b><p>${C.EVIDENCE[e].d}</p></div>`).join("");
    modal(`<h2>Улики · ${S.evidence.length}</h2>${list ? `<div class="ev-grid">${list}</div>` : `<p class="dim">Пока ни одной улики.</p>`}`, true);
  };
  ACT.menu = () => {
    modal(`<h2>Меню</h2><p class="dim">Дело сохраняется автоматически после каждого шага.</p>
      <div class="stack"><a class="btn" href="#home" data-a="closeModal">Выйти в Бюро</a><a class="btn" href="#profile" data-a="closeModal">Профиль семьи</a>
      <button class="btn danger" data-a="restartAsk">Начать дело заново</button><div id="rsConfirm" hidden class="row"><span>Весь прогресс дела пропадёт.</span><button class="btn danger" data-a="restart">Да, заново</button></div></div>`);
  };
  ACT.restartAsk = () => { const el = document.getElementById("rsConfirm"); if (el) el.hidden = false; };
  ACT.restart = () => { closeModal(); B.store.clearCase(C.id); S = fresh(); go("setup", { names: S.players.map((p) => p.name) }); };
  ACT.closeModal = () => closeModal();

  // сбор семьи
  function readNames() { return Array.from(root.querySelectorAll("#plist input")).map((i) => i.value); }
  ACT.addPlayer = () => { const n = readNames(); n.push(""); view.names = n; render(); const ins = root.querySelectorAll("#plist input"); ins[ins.length - 1].focus(); };
  ACT.rmPlayer = (d) => { const n = readNames(); n.splice(+d.i, 1); view.names = n; render(); };
  ACT.startCase = () => {
    const names = readNames().map((s) => s.trim()).filter(Boolean);
    if (!names.length) { B.toast("Впишите хотя бы одно имя", true); return; }
    S.family = (document.getElementById("famIn").value || "").trim() || "Семья детективов";
    S.players = names.map((name) => ({ name }));
    const order = ["lead", "expert", "analyst", "oper"];
    order.forEach((r, i) => (S.roles[r] = i % names.length));
    const p = B.store.profile(); p.family = S.family; B.store.saveProfile(p);
    S.phase = "brief"; save(); go("brief");
  };
  ACT.phase = (d) => {
    const p = d.p;
    S.phase = p; save();
    if (p === "act1") go("hub1");
    else if (p === "vote1" || p === "vote2") go("vote", { vi: 0 });
    else if (p === "act2") go("act2intro");
    else if (p === "act3") go("hub3");
  };
  ACT.finish = (d) => { S.done[d.k] = true; save(); go(hubName()); };

  // осмотр
  ACT.zoom = (d) => { view.z = +d.z; render(); };

  // допрос
  ACT.selStmt = (d) => { view.sel = d.s; render(); };
  ACT.ask = (d) => {
    const key = view.p, I = C.INTERROGATIONS[key], q = I.questions[+d.q];
    view.reply = q.a;
    (q.gives || []).forEach((e) => addEv(e));
    render();
  };
  ACT.present = () => {
    if (!S.evidence.length) { B.toast("У вас пока нет улик", true); return; }
    modal(`<h2>Какую улику предъявить?</h2><div class="ev-grid">${S.evidence.map((e) => `<button class="ev" data-a="presentEv" data-e="${e}"><span class="src">${C.EVIDENCE[e].src}</span><b>${C.EVIDENCE[e].t}</b><p>${C.EVIDENCE[e].d}</p></button>`).join("")}</div><button class="btn" data-a="closeModal">Отмена</button>`, true);
  };
  ACT.presentEv = (d) => {
    closeModal();
    const key = view.p, I = C.INTERROGATIONS[key], st = S.int[key];
    const s = I.stmts.find((x) => x.id === view.sel);
    if (s && s.counter.includes(d.e)) {
      st.broken.push(s.id);
      view.reply = s.reply || (key === "krylov2" ? ["Это... совпадение.", "Я... Мне нужно подумать.", "Ладно. Хватит."][Math.min(2, st.broken.length - 1)] : "Он молчит и отводит глаза.");
      (s.gives || []).forEach((e) => addEv(e));
      B.toast("Противоречие найдено!");
    } else {
      S.wrong++;
      view.reply = "Это ничего не доказывает. Вы зря тратите моё время.";
      B.toast("Улика не опровергает это заявление (−2 очка)", true);
    }
    view.sel = null; save(); render();
  };
  ACT.endInt = (d) => {
    const k = d.k;
    if (k === "renz" || k === "lukin") S.done[k] = true;
    save();
    if (k === "krylov1") go("loc", { p: "workshop" });
    else if (k === "zimin" && S.phase === "act2") go("loc", { p: "zimin" });
    else go(hubName());
  };

  // камеры
  ACT.cam = (d) => { view.cam = d.c; render(); };
  ACT.camStep = (d) => { view.m = Math.max(0, Math.min(C.CAM.len, (view.m || 0) + +d.d)); updateCam(); };
  ACT.camJump = (d) => { view.cam = d.c; view.m = +d.m; render(); };
  ACT.camMark = () => {
    const cam = view.cam || "hall", m = view.m || 0, K = C.CAM;
    let got = null, msg = "В этом кадре ничего подозрительного.";
    if (m >= K.dark[0] && m < K.dark[1]) got = "E7";
    else if (cam === "hall" && m >= 530 && m <= 560) got = "E6";
    else if (cam === "service" && m >= K.worker[0] && m < K.worker[1]) got = "E8";
    else if (cam === "hall" && m >= K.guard[0][0] && m < K.guard[0][1]) msg = "Полночь: сторож делает обход. Всё по журналу.";
    else if (cam === "hall" && m >= K.nika[0] && m < K.nika[1]) msg = "Ника фотографирует зал после закрытия.";
    else if (cam === "hall" && m >= K.goneAfter) msg = "Витрина уже пуста. Когда это случилось?";
    else if (cam === "service" && m >= K.zoya[0]) msg = "Уборщица открыла служебный вход и подпёрла дверь.";
    if (got) { if (!addEv(got)) B.toast("Это уже отмечено"); render(); } else B.toast(msg);
  };
  function updateCam() {
    const cam = view.cam || "hall", m = view.m || 0;
    const v = document.getElementById("camview"); if (v) v.innerHTML = A.cam(cam, m);
    const t = document.getElementById("camTime"); if (t) t.textContent = A.fmtMin(m);
    const r = document.getElementById("camRange"); if (r && +r.value !== m) r.value = m;
  }

  // свидетель
  ACT.zoyaWho = (d) => { view.who = +d.i; render(); };
  ACT.zoyaShow = () => {
    view.stage = "show"; render();
    let t = view.retry ? 5 : 10;
    const tick = setInterval(() => {
      t--; const el = document.getElementById("zoyaT");
      if (!el || view.name !== "zoya") { clearInterval(tick); return; }
      el.textContent = t;
      if (t <= 0) { clearInterval(tick); view.stage = "ask"; view.ans = {}; render(); }
    }, 1000);
  };
  ACT.zoyaAns = (d) => { view.ans[+d.q] = +d.o; render(); };
  ACT.zoyaCheck = () => {
    const right = WQ.filter((q, i) => view.ans[i] === q.r).length;
    const logo = view.ans[2] === 3;
    S.witness = { right, tries: (S.witness ? S.witness.tries : 0) + 1, who: view.who };
    save();
    const detail = WQ.map((q, i) => `<p>${view.ans[i] === q.r ? "✓" : "✗"} ${q.q} <b>${q.o[q.r]}</b></p>`).join("");
    if (logo || S.witness.tries >= 2) {
      addEv("E9"); S.done.zoya = true; save();
      modal(`<h2>Показания записаны: ${right} из 4 верно</h2>${detail}<p>Главное: на кепке была эмблема-рамка с буквами «СР». Такую надо поискать в городе.</p><button class="btn primary" data-a="closeGo" data-v="hub1">Дальше</button>`);
    } else {
      modal(`<h2>Верно ${right} из 4</h2><p>Зоя путается. Самое важное — что было на кепке — она не вспомнила. Можно попробовать ещё раз: картинку покажут на 5 секунд.</p><button class="btn primary" data-a="zoyaRetry">Ещё раз</button>`);
    }
  };
  ACT.zoyaRetry = () => { closeModal(); view.stage = "intro"; view.retry = true; render(); };
  ACT.closeGo = (d) => { closeModal(); go(d.v, d.p ? { p: d.p } : {}); };

  // голосование
  ACT.voteReady = () => { view.ready = true; render(); };
  ACT.vote = (d) => { S.votes[S.phase][view.vi] = d.s; save(); view.vi++; view.ready = false; render(); };
  ACT.toVote2 = () => {
    modal(`<h2>Закончить следствие?</h2><p>Вернуться в город будет нельзя. Осталось ${Math.floor(left() / 60)} ч ${left() % 60} мин.</p><div class="row"><button class="btn danger" data-a="closePhase" data-p="vote2">Да, к голосованию</button><button class="btn" data-a="closeModal">Ещё поработаем</button></div>`);
  };
  ACT.closePhase = (d) => { closeModal(); ACT.phase(d); };

  // локации
  ACT.loc = (d) => {
    const k = d.l, L = C.LOCATIONS[k];
    if (!S.visited[k]) {
      if (L.cost > left()) { B.toast("Не успеть: мало времени", true); return; }
      S.visited[k] = true;
      if (spend(L.cost)) return;
    }
    go("loc", { p: k });
  };
  ACT.wife = () => { S.flags.wife = true; save(); render(); modal(`<h2>Марина Крылова</h2><div class="speech"><p>Валя? Уехал в воскресенье днём, сказал — на объект за город, срочный заказ. Вернулся только к обеду в понедельник, уставший. Он вообще последний месяц сам не свой. Всё про бабушкин дом в Ключах вспоминает.</p></div><button class="btn primary" data-a="closeModal">Понятно</button>`); };
  ACT.item = (d) => {
    if (S.items[d.i]) return;
    S.items[d.i] = true; save();
    B.toast(d.i === "cup" ? "Чашка упакована для лаборатории" : "Образец ткани взят");
    render();
  };
  ACT.archCard = (d) => {
    view.card = +d.i;
    if (+d.i === 2) addEv("E17");
    render();
  };
  ACT.lockKey = (d) => {
    let c = view.code || "";
    if (d.d === "⌫") c = c.slice(0, -1); else if (c.length < 4) c += d.d;
    view.code = c;
    if (c.length === 4) {
      if (c === "1964") { view.open = true; B.toast("Щёлк! Ячейка открыта"); }
      else { B.toast("Неверный код", true); view.code = ""; }
    }
    render();
  };
  ACT.stationBottom = () => { addEv("E18"); S.flags.found = true; save(); render(); };

  // телефон
  ACT.pinKey = (d) => {
    let c = view.code || "";
    if (d.d === "⌫") c = c.slice(0, -1); else if (c.length < 4) c += d.d;
    view.code = c;
    if (c.length === 4) {
      if (c === "1964") { S.phone.unlocked = true; view.app = "home"; B.toast("Телефон разблокирован"); }
      else { S.phone.tries++; view.code = ""; B.toast("Неверный код", true); }
      save();
    }
    render();
  };
  ACT.papp = (d) => { view.app = d.p; render(); };

  // отличия
  ACT.diffDone = () => { go("phone", { app: "gallery" }); };

  // лаборатория
  ACT.labRun = (d) => {
    const k = d.k;
    if (S.lab[k] === "done") return;
    if (!S.lab[k]) { S.lab[k] = "started"; save(); if (spend(30)) return; }
    if (k === "glassDb") { S.lab[k] = "done"; addEv("E21"); save(); render(); return; }
    go("lab", { mg: k });
  };
  ACT.pickPrint = (d) => {
    if (+d.i === 2) { S.lab.glassCup = "done"; addEv("E14"); save(); go("lab"); }
    else { view.bad = (view.bad || []).concat(+d.i); S.wrong++; save(); B.toast("Не совпадает (−2 очка)", true); render(); }
  };
  ACT.pickFiber = (d) => {
    if (+d.i === 2) { S.lab.fiber = "done"; addEv("E15"); save(); go("lab"); }
    else { view.bad = (view.bad || []).concat(+d.i); S.wrong++; save(); B.toast("Не совпадает (−2 очка)", true); render(); }
  };

  // хронология
  ACT.tlMove = (d) => {
    const i = +d.i, j = i + +d.d, o = S.tl.order;
    [o[i], o[j]] = [o[j], o[i]]; S.tl.checked = false; save(); render();
  };
  ACT.tlCheck = () => {
    const T = S.tl; T.tries++; T.checked = true;
    T.solved = T.order.every((id, i) => id === C.TIMELINE[i].id);
    save(); render();
    B.toast(T.solved ? "Порядок верный!" : "Красные карточки стоят не на своём месте", !T.solved);
  };
  ACT.tlQ = (d) => {
    if (+d.i === 1) { addEv("E20"); render(); }
    else { S.wrong++; save(); B.toast("Подумайте ещё: окна целы, двери на сигнализации (−2 очка)", true); }
  };

  // алиби
  ACT.alibiCell = (d) => { const g = S.alibi.grid[d.p]; g[+d.i] = (g[+d.i] + 1) % 3; save(); render(); };
  ACT.alibiCheck = () => {
    const g = S.alibi.grid;
    const ok = C.ALIBI.people.every((p) => g[p].filter((v) => v === 2).length === 1 && g[p][C.ALIBI.answer[p]] === 2);
    if (ok) { S.alibi.solved = true; addEv("E19"); save(); render(); }
    else B.toast("Пока не сходится. В каждой строке нужна ровно одна ✓, и она должна следовать из сводки.", true);
  };

  // шифр
  ACT.shift = (d) => { S.cipher.shift = (S.cipher.shift + +d.d + 32) % 32; save(); render(); };
  ACT.cipherCheck = () => {
    if (S.cipher.shift === C.CIPHER.shift) { addEv("E16"); render(); B.toast("На карте открылся вокзал"); }
    else B.toast("Пока бессмыслица. Крутите дальше.", true);
  };

  // доска
  ACT.pinSel = (d) => {
    if (S.board[d.e]) { delete S.board[d.e]; save(); view.sel = null; render(); return; }
    view.sel = view.sel === d.e ? null : d.e; render();
  };
  ACT.pinTo = (d) => { if (!view.sel) return; S.board[view.sel] = d.s; view.sel = null; save(); render(); };

  // обвинение
  ACT.accOpt = (d) => { const a = (S.accuse[d.q] = S.accuse[d.q] || { o: null, ev: [] }); a.o = +d.o; save(); render(); };
  ACT.accEv = (d) => {
    const a = (S.accuse[d.q] = S.accuse[d.q] || { o: null, ev: [] });
    if (a.ev.includes(d.e)) a.ev = a.ev.filter((x) => x !== d.e);
    else if (a.ev.length < 3) a.ev.push(d.e);
    else B.toast("Не больше трёх улик на вопрос", true);
    save(); render();
  };
  ACT.accSubmit = () => {
    modal(`<h2>Предъявить обвинение?</h2><p>Изменить ответы будет нельзя.</p><div class="row"><button class="btn danger" data-a="accFinal">Да, предъявить</button><button class="btn" data-a="closeModal">Ещё подумаем</button></div>`);
  };
  ACT.accFinal = () => { closeModal(); finishCase(); };

  /* ================= финал и счёт ================= */
  function finishCase() {
    const lines = [];
    let pts = 0, ansPts = 0, evPts = 0;
    for (const q of C.ACCUSE) {
      const a = S.accuse[q.id];
      if (a.o === q.right) ansPts += 9;
      const goodEv = a.ev.filter((e) => q.ev.includes(e)).length, badEv = a.ev.length - goodEv;
      if (goodEv) evPts += 2;
      if (goodEv && !badEv) evPts += 1;
    }
    lines.push(["Верные ответы", ansPts], ["Подходящие улики", evPts]);
    const contra = Object.values(S.int).reduce((n, i) => n + i.broken.length, 0);
    lines.push(["Противоречия на допросах", Math.min(10, contra)]);
    pts = ansPts + evPts + Math.min(10, contra);
    if (has("E18")) { lines.push(["Картина найдена", 8]); pts += 8; }
    const tl = C.BUDGET - S.time;
    const tb = tl >= 60 ? 5 : tl > 0 ? 2 : 0;
    if (tb) { lines.push(["Сэкономленное время", tb]); pts += tb; }
    if (S.witness && S.witness.tries === 1 && S.witness.right >= 3) { lines.push(["Отличная память свидетеля", 2]); pts += 2; }
    if (S.tl && S.tl.tries === 1 && S.tl.solved) { lines.push(["Хронология с первой попытки", 3]); pts += 3; }
    const h = hintCount();
    if (h) { lines.push([`Подсказки (${h})`, -3 * h]); pts -= 3 * h; }
    const w = Math.min(10, S.wrong);
    if (w) { lines.push([`Ошибки (${S.wrong})`, -2 * w]); pts -= 2 * w; }
    const score = Math.max(0, Math.min(100, pts));
    const whoRight = S.accuse.who.o === 3;
    const stars = !whoRight ? 0 : score >= 85 ? 3 : score >= 60 ? 2 : 1;

    // значки
    const badges = {};
    S.players.forEach((p) => (badges[p.name] = []));
    const give = (role, b) => { const n = roleHolder(role); (badges[n] = badges[n] || []).includes(b) || badges[n].push(b); };
    const noH = (...ks) => ks.every((k) => !S.hints[k]);
    if (whoRight) {
      if (S.scene.length >= 5 && S.diff.length === 5 && noH("scene", "diff")) give("expert", "eye");
      if (S.wrong === 0 && contra >= 5) give("oper", "interro");
      if (S.tl && S.tl.solved && S.tl.tries === 1) give("analyst", "analyst");
      if (has("E16") && noH("cipher")) give("analyst", "cipher");
      if (tl >= 60) give("lead", "thrift");
      if (has("E18")) give("lead", "keeper");
      const v1 = S.votes.vote1 || {};
      Object.entries(v1).forEach(([pi, s]) => { if (s === "krylov") { const n = playerName(+pi); badges[n].includes("gut") || badges[n].push("gut"); } });
    }
    S.result = { score, stars, lines, badges };
    S.phase = "debrief";
    save();

    // профиль
    const P = B.store.profile();
    P.family = S.family;
    S.players.forEach((p) => { if (!P.members.includes(p.name)) P.members.push(p.name); });
    Object.entries(badges).forEach(([n, bs]) => { P.badges[n] = Array.from(new Set((P.badges[n] || []).concat(bs))); });
    const prev = P.cases[C.id];
    const d = new Date();
    const date = d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
    if (stars > 0 && (!prev || score > prev.score)) P.cases[C.id] = { stars, score, date };
    const ach = new Set(P.achievements);
    if (stars > 0) ach.add("first");
    if (stars === 3) ach.add("three");
    if (stars > 0 && h === 0) ach.add("nohints");
    if (S.players.length >= 3) ach.add("council");
    if (has("E18")) ach.add("home");
    P.achievements = Array.from(ach);
    B.store.saveProfile(P);
    go("debrief");
  }

  /* ================= модальные окна ================= */
  function modal(html, wide) {
    closeModal();
    const bg = document.createElement("div");
    bg.className = "modal-bg";
    bg.innerHTML = `<div class="modal ${wide ? "wide" : ""}" role="dialog" aria-modal="true">${html}<div class="row" style="justify-content:flex-end"><button class="btn ghost small" data-a="closeModal">Закрыть</button></div></div>`;
    bg.addEventListener("click", (e) => { if (e.target === bg) closeModal(); });
    root.appendChild(bg);
  }
  function closeModal() { root && root.querySelectorAll(".modal-bg").forEach((m) => m.remove()); }

  /* ================= привязка ================= */
  function after() {
    const v = view.name;
    if (v === "scene") {
      const vw = document.getElementById("viewer"), svg = vw.querySelector("svg");
      svg.addEventListener("click", (e) => {
        const r = svg.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width) * 1200, y = ((e.clientY - r.top) / r.height) * 700;
        const z = view.z || 1, tol = r.width < 700 ? 1.3 : z === 1 ? 0.75 : 1; // на 1× мелочи найти труднее, на телефоне прощаем палец
        const hit = A.SCENE_SPOTS.find((s) => Math.hypot(s.x - x, s.y - y) <= s.r * (s.r < 30 ? tol : 1));
        const vr = vw.getBoundingClientRect();
        const pg = document.createElement("span"); pg.className = "ping";
        pg.style.left = e.clientX - vr.left + vw.scrollLeft + "px"; pg.style.top = e.clientY - vr.top + vw.scrollTop + "px";
        vw.appendChild(pg); setTimeout(() => pg.remove(), 700);
        if (!hit) return;
        if (!hit.id) { B.toast(hit.note); return; }
        if (S.scene.includes(hit.id)) return;
        S.scene.push(hit.id); addEv(hit.id);
        const sl = vw.scrollLeft, st = vw.scrollTop; render();
        const nv = document.getElementById("viewer"); nv.scrollLeft = sl; nv.scrollTop = st;
      });
    }
    if (v === "cams") {
      const r = document.getElementById("camRange");
      r.addEventListener("input", () => { view.m = +r.value; updateCam(); });
    }
    if (v === "diff") {
      root.querySelectorAll(".photo svg").forEach((svg) => svg.addEventListener("click", (e) => {
        const r = svg.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width) * 600, y = ((e.clientY - r.top) / r.height) * 400;
        const hit = A.DIFFS.find((d) => Math.hypot(d.x - x, d.y - y) <= d.r);
        if (!hit) { B.toast("Здесь всё одинаково"); return; }
        if (S.diff.includes(hit.id)) return;
        S.diff.push(hit.id); save();
        if (hit.key) addEv("E11"); else B.toast(hit.label);
        render();
      }));
    }
    if (v === "db") {
      const term = document.getElementById("term"); term.scrollTop = term.scrollHeight;
      const f = document.getElementById("dbForm"), inp = document.getElementById("dbIn");
      inp.focus();
      f.addEventListener("submit", (e) => {
        e.preventDefault();
        const raw = inp.value.trim(); if (!raw) return;
        const q = raw.toLowerCase().replace(/ё/g, "е");
        const hit = C.DB.find((r) => r.keys.some((k) => q.includes(k.replace(/ё/g, "е"))));
        if (!hit) S.db.log.push({ q: raw, out: "Совпадений нет. Попробуйте фамилию, имя, название фирмы или место.", err: true });
        else {
          const idx = C.DB.indexOf(hit), firstTime = !S.db.used.includes(idx);
          S.db.log.push({ q: raw, out: hit.out });
          if (firstTime) { S.db.used.push(idx); (hit.gives || []).forEach((g) => addEv(g)); save(); if (spend(hit.cost)) return; }
        }
        save(); render();
      });
    }
    if (v === "int" && view.reply) { /* держим фокус на ответе */ }
  }

  function onClick(e) {
    const el = e.target.closest("[data-a]");
    if (!el || !root.contains(el)) return;
    const a = el.dataset.a;
    if (a === "accOpt") { ACT.accOpt(el.dataset); return; }
    if (el.tagName === "A") { if (a === "closeModal") closeModal(); return; }
    if (!ACT[a]) return;
    e.preventDefault();
    ACT[a](el.dataset, el, e);
  }
  function onKey(e) {
    if ((e.key === "Enter" || e.key === " ") && e.target.matches("g.loc")) { e.preventDefault(); ACT.loc({ l: e.target.dataset.loc }); }
  }
  function onMapClick(e) {
    const g = e.target.closest && e.target.closest("g.loc");
    if (g && root.contains(g)) ACT.loc({ l: g.dataset.loc });
  }

  /* ================= вход ================= */
  B.game = {
    start(el) {
      root = el;
      S = B.store.loadCase(C.id) || fresh();
      if (S.v !== 1) S = fresh();
      root.onclick = (e) => { onMapClick(e); onClick(e); };
      root.onkeydown = onKey;
      const startView = { setup: "setup", brief: "brief", act1: "hub1", vote1: "vote", act2: "hub2", vote2: "vote", act3: "hub3", accuse: "accuse", debrief: "debrief" }[S.phase];
      view = { name: startView, vi: startView === "vote" ? Object.keys(S.votes[S.phase] || {}).length : 0, names: [""] };
      render();
    },
    stop() { if (root) { root.onclick = null; root.onkeydown = null; } },
    _state: () => S,
    _view: () => view,
  };
})();
