/* Оболочка платформы «Бюро»: главная, каталог, профиль семьи. Маршруты: #home, #catalog, #profile, #play */
(function () {
  const B = (window.Bureau = window.Bureau || {});
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  B.esc = esc;
  const app = () => document.getElementById("app");

  const CATALOG = [
    { id: "blue-bird", title: "Синяя птица", tag: "Дело №1 · семейное", meta: "1,5–2,5 часа · 1–6 игроков · 12+", text: "Из музея Тихореченска ночью пропала картина. Окна целы, сигнализация молчала, сторож клянётся, что всё было тихо.", live: true },
    { id: "daily", title: "Дело дня", tag: "Ежедневно", meta: "10 минут · соло", text: "Короткое дело каждый день, одно на всех. Сравните, кто раскрыл быстрее и экономнее.", live: false, art: "daily" },
    { id: "proto", title: "Протокол", tag: "Кооператив", meta: "2–4 игрока · онлайн", text: "Расследование командой: у каждого своя роль и свои улики. Договориться придётся.", live: false, art: "proto" },
    { id: "light", title: "Тайна маяка", tag: "Дело №2 · семейное", meta: "Следующее дело месяца", text: "Смотритель маяка исчез, а огонь продолжает гореть каждую ночь.", live: false, art: "light" },
  ];

  function stars(n, max = 3) {
    let s = "";
    for (let i = 0; i < max; i++) s += i < n ? "★" : `<span class="off">★</span>`;
    return `<span class="stars" aria-label="${n} из ${max} звёзд">${s}</span>`;
  }
  B.stars = stars;

  function header(active) {
    const a = (h, t) => `<a href="#${h}" class="${active === h ? "on" : ""}">${t}</a>`;
    return `<header class="shell-head"><div class="wrap">
      <a class="logo" href="#home"><span class="seal">Б</span>БЮРО</a>
      <nav class="nav" aria-label="Разделы">${a("home", "Главная")}${a("catalog", "Каталог")}${a("profile", "Профиль семьи")}</nav>
    </div></header>`;
  }

  function caseStatus() {
    const s = B.store.loadCase("blue-bird");
    const done = B.store.profile().cases["blue-bird"];
    if (s && s.phase !== "debrief") return { label: "Продолжить дело", sub: phaseName(s.phase) };
    if (done) return { label: "Сыграть снова", sub: "Раскрыто" };
    return { label: "Начать дело", sub: "Новое дело" };
  }
  function phaseName(p) {
    return { setup: "Сбор семьи", brief: "Брифинг", act1: "Акт 1 · Музей", vote1: "Голосование", act2: "Акт 2 · Город", vote2: "Голосование", act3: "Акт 3 · Обвинение", accuse: "Обвинение", debrief: "Разбор" }[p] || "";
  }

  function cardHTML(c) {
    const cover = c.live ? B.art.cover() : B.art.coverSoon(c.art);
    const prof = B.store.profile().cases[c.id];
    return `<article class="case-card">
      <div class="cover">${cover}${c.live ? "" : `<span class="stamp-soon">СКОРО</span>`}</div>
      <div class="body">
        <div class="row"><span class="tag ${c.live ? "live" : "soon"}">${c.tag}</span>${prof ? stars(prof.stars) : ""}</div>
        <h3>${c.title}</h3>
        <p class="dim">${c.text}</p>
        <p class="label">${c.meta}</p>
      </div>
      <div class="foot">${c.live ? `<a class="btn primary" href="#play">${caseStatus().label}</a>` : `<button class="btn" disabled>Готовится</button>`}</div>
    </article>`;
  }

  function home() {
    const st = caseStatus();
    const p = B.store.profile();
    return `${header("home")}<main class="page wrap">
      <section class="hero">
        <div>
          <p class="label">Бюро расследований Тихореченска</p>
          <h1>Дело на вечер для всей семьи</h1>
          <p class="lead">Осмотрите место кражи, допросите свидетелей, разберите записи камер и шифровку, проголосуйте и предъявите обвинение. Каждый член семьи получает свою роль и свой значок.</p>
          <div class="row" style="margin-top:1.4rem">
            <a class="btn primary" href="#play">${st.label}: «Синяя птица»</a>
            <a class="btn ghost" href="#catalog">Все дела</a>
          </div>
          <p class="label" style="margin-top:.8rem">${st.sub} · ${Object.keys(p.cases).length} раскрыто</p>
        </div>
        <div class="art">${B.art.cover()}</div>
      </section>
      <section class="section">
        <h2>Как играть</h2>
        <div class="grid-cards">
          <div class="panel stack"><span class="label">Один экран</span><p>Сядьте у ноутбука или телевизора. Игра сама подскажет, чья очередь: Эксперта, Аналитика, Оперативника или Руководителя.</p></div>
          <div class="panel stack"><span class="label">Время следствия</span><p>Во втором акте каждая поездка тратит часы. Всё объехать не выйдет, выбирайте с умом.</p></div>
          <div class="panel stack"><span class="label">Подсказки</span><p>Застряли — возьмите подсказку. Их три уровня, каждая немного снижает итоговый счёт.</p></div>
          <div class="panel stack"><span class="label">Перерыв</span><p>Дело сохраняется после каждого шага. Можно закрыть вкладку и вернуться завтра.</p></div>
        </div>
      </section>
      <section class="section panel news">
        <h2>Новости Бюро</h2>
        <ul>
          <li><span class="label">4 ноября</span><span>Открыто дело №1 «Синяя птица». По мотивам кражи «Моны Лизы» из Лувра в 1911 году.</span></li>
          <li><span class="label">Декабрь</span><span>Готовится дело №2 «Тайна маяка».</span></li>
          <li><span class="label">Скоро</span><span>«Дело дня»: десять минут, одно дело для всех, таблица лучших.</span></li>
        </ul>
      </section>
    </main>`;
  }

  function catalog() {
    return `${header("catalog")}<main class="page wrap">
      <div class="screen-head"><p class="label">Каталог</p><h1>Дела Бюро</h1><p class="dim">Все дела вымышленные, по мотивам настоящих расследований. Без жестокости, возраст 12+.</p></div>
      <div class="grid-cards">${CATALOG.map(cardHTML).join("")}</div>
    </main>`;
  }

  function profile() {
    const p = B.store.profile();
    const C = B.case1;
    const members = p.members.length ? p.members : [];
    const memberBlocks = members.length
      ? members.map((m) => {
          const got = p.badges[m] || [];
          return `<div class="panel stack"><h3>${esc(m)}</h3><div class="badges">${
            got.length ? got.map((b) => `<span class="badge"><i>${C.BADGES[b].ic}</i>${C.BADGES[b].name}</span>`).join("") : `<span class="dim">Значков пока нет</span>`
          }</div></div>`;
        }).join("")
      : `<div class="panel"><p class="dim">Участники появятся после первого дела.</p></div>`;
    const shelf = CATALOG.filter((c) => c.live || true).map((c) => {
      const r = p.cases[c.id];
      return r
        ? `<div class="folder"><div><span class="label" style="color:var(--paper-dim)">Раскрыто ${esc(r.date)}</span><h3>${c.title}</h3></div><div>${stars(r.stars)} <span class="mono">${r.score} очк.</span></div></div>`
        : `<div class="folder empty"><span class="label">${c.live ? "Не раскрыто" : "Скоро"}</span><h3>${c.title}</h3></div>`;
    }).join("");
    const ach = Object.entries(B.store.ACH).map(([k, a]) => `<span class="badge ${p.achievements.includes(k) ? "" : "locked"}" title="${a.d}"><i>${a.ic}</i>${a.name}</span>`).join("");
    return `${header("profile")}<main class="page wrap">
      <div class="screen-head"><p class="label">Профиль семьи</p>
        <form class="row" id="famForm"><label class="field" style="flex:1;min-width:220px"><span class="label">Название семьи</span><input class="input" id="famName" value="${esc(p.family)}" maxlength="40"></label><button class="btn" type="submit">Сохранить</button></form>
      </div>
      <section class="section"><h2>Шкаф раскрытых дел</h2><div class="shelf">${shelf}</div></section>
      <section class="section"><h2>Значки детективов</h2><div class="grid-cards">${memberBlocks}</div></section>
      <section class="section"><h2>Достижения</h2><div class="badges">${ach}</div></section>
      <section class="section panel stack"><h3>Начать с чистого листа</h3><p class="dim">Удалит профиль, значки и сохранение дела на этом устройстве.</p>
        <div class="row"><button class="btn danger" id="resetBtn">Удалить всё</button><span id="resetConfirm" hidden><button class="btn danger" id="resetYes">Да, удалить</button> <button class="btn" id="resetNo">Отмена</button></span></div></section>
    </main>`;
  }

  function bindProfile() {
    const f = document.getElementById("famForm");
    if (!f) return;
    f.addEventListener("submit", (e) => {
      e.preventDefault();
      const p = B.store.profile();
      p.family = document.getElementById("famName").value.trim() || "Семья детективов";
      B.store.saveProfile(p);
      B.toast("Сохранено");
    });
    document.getElementById("resetBtn").onclick = () => (document.getElementById("resetConfirm").hidden = false);
    document.getElementById("resetNo").onclick = () => (document.getElementById("resetConfirm").hidden = true);
    document.getElementById("resetYes").onclick = () => { B.store.resetAll(); route(); B.toast("Всё удалено"); };
  }

  B.toast = function (html, bad) {
    let z = document.querySelector(".toast-zone");
    if (!z) { z = document.createElement("div"); z.className = "toast-zone"; z.setAttribute("aria-live", "polite"); document.body.appendChild(z); }
    const t = document.createElement("div");
    t.className = "toast" + (bad ? " bad" : "");
    t.innerHTML = html;
    z.appendChild(t);
    while (z.children.length > 3) z.firstElementChild.remove();
    setTimeout(() => t.remove(), 3800);
  };

  function route() {
    const h = (location.hash || "#home").slice(1);
    window.scrollTo(0, 0);
    if (h === "play") { B.game.start(app()); return; }
    if (B.game) B.game.stop && B.game.stop();
    if (h === "catalog") app().innerHTML = catalog();
    else if (h === "profile") { app().innerHTML = profile(); bindProfile(); }
    else app().innerHTML = home();
  }
  B.route = route;
  window.addEventListener("hashchange", route);
  document.addEventListener("DOMContentLoaded", route);
})();
