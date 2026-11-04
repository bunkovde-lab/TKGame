/* Иллюстрации дела: всё рисуется SVG-кодом, без внешних картинок. */
(function () {
  const B = (window.Bureau = window.Bureau || {});
  const A = {};

  // Картина «Девочка с синей птицей» в миниатюре
  A.painting = function (x, y, w, h) {
    const sx = w / 100, sy = h / 130;
    return `<g transform="translate(${x},${y}) scale(${sx},${sy})">
      <rect x="0" y="0" width="100" height="130" fill="#8a6a2f"/>
      <rect x="6" y="6" width="88" height="118" fill="#e7dcc0"/>
      <rect x="6" y="6" width="88" height="70" fill="#b9c7cf"/>
      <circle cx="50" cy="56" r="15" fill="#e9c6a5"/>
      <path d="M35 52 Q50 30 65 52 L65 44 Q50 22 35 44Z" fill="#6b3f20"/>
      <path d="M28 124 Q30 80 50 74 Q70 80 72 124Z" fill="#c9503f"/>
      <path d="M60 86 q10 -8 18 -2 q-4 3 -2 6 q-9 4 -16 -4z" fill="#3a63d8"/>
      <circle cx="73" cy="85" r="1.4" fill="#111"/>
    </g>`;
  };

  // Портрет-бюст
  A.portrait = function (key) {
    const p = B.case1.PEOPLE[key];
    const skin = "#e5c3a2";
    let feat = "";
    if (p.feat === "glasses") feat = `<g fill="none" stroke="#222" stroke-width="3"><circle cx="86" cy="96" r="11"/><circle cx="114" cy="96" r="11"/><path d="M97 96h6"/></g>`;
    if (p.feat === "mustache") feat = `<path d="M84 118 q16 -8 32 0 q-16 6 -32 0z" fill="#4a2f1a"/>`;
    if (p.feat === "cap") feat = `<path d="M62 76 q38 -36 76 0z" fill="#2b3644"/><rect x="58" y="72" width="84" height="8" rx="3" fill="#1d2630"/>`;
    if (p.feat === "hat") feat = `<rect x="66" y="40" width="68" height="34" rx="4" fill="#222"/><rect x="50" y="70" width="100" height="8" rx="4" fill="#222"/><rect x="66" y="62" width="68" height="6" fill="#7b2d2d"/>`;
    if (p.feat === "scarf") feat = `<path d="M60 70 q40 -40 80 0 l-4 30 q-36 -30 -72 0z" fill="#b8584a"/>`;
    const hair = p.feat === "hat" || p.feat === "cap" || p.feat === "scarf" ? "" : `<path d="M62 92 q-2 -46 38 -46 q40 0 38 46 q-8 -26 -38 -26 q-30 0 -38 26z" fill="${p.hair}"/>`;
    const longHair = key === "nika" ? `<path d="M60 90 q-6 50 6 70 l14 -10 q-10 -30 -6 -60z M140 90 q6 50 -6 70 l-14 -10 q10 -30 6 -60z" fill="${p.hair}"/>` : "";
    return `<svg viewBox="0 0 200 220" role="img" aria-label="${p.name}">
      <rect width="200" height="220" fill="#c9d1d8"/>
      <rect y="170" width="200" height="50" fill="#b3bdc6"/>
      ${longHair}
      <path d="M30 220 q4 -60 70 -64 q66 4 70 64z" fill="${p.color}"/>
      <rect x="88" y="128" width="24" height="30" fill="${skin}"/>
      <ellipse cx="100" cy="100" rx="36" ry="42" fill="${skin}"/>
      ${hair}
      <circle cx="87" cy="98" r="3.2" fill="#222"/><circle cx="113" cy="98" r="3.2" fill="#222"/>
      <path d="M92 126 q8 4 16 0" stroke="#8a4b3a" stroke-width="3" fill="none" stroke-linecap="round"/>
      ${feat}
    </svg>`;
  };

  // ---------- Место преступления (осмотр) 1200×700 ----------
  A.SCENE_SPOTS = [
    { id: "E1", x: 652, y: 300, r: 26, label: "Отпечаток на стекле" },
    { id: "E2", x: 478, y: 412, r: 26, label: "Винты витрины" },
    { id: "E3", x: 726, y: 252, r: 24, label: "Нитка на раме" },
    { id: "E4", x: 930, y: 590, r: 60, label: "Следы в пыли" },
    { id: "E0", x: 160, y: 225, r: 70, label: "Окно" },
    { id: "E5", x: 362, y: 300, r: 40, label: "Табличка" },
    { id: null, x: 1062, y: 440, r: 40, label: "Огнетушитель", note: "Огнетушитель на месте, пломба цела." },
    { id: null, x: 150, y: 570, r: 70, label: "Скамья", note: "Скамья для посетителей. Ничего интересного." },
    { id: null, x: 800, y: 110, r: 60, label: "Пейзаж", note: "Другие картины на месте. Похититель знал, что ему нужно." },
    { id: null, x: 960, y: 200, r: 50, label: "Дверь", note: "Дверь технической комнаты заперта. Ключ — у замдиректора." },
  ];
  A.scene = function () {
    return `<svg viewBox="0 0 1200 700" role="img" aria-label="Зал 2 городского музея утром после кражи">
      <defs>
        <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5d6b5a"/><stop offset="1" stop-color="#4b5749"/></linearGradient>
        <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7a5b3c"/><stop offset="1" stop-color="#5e432a"/></linearGradient>
        <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#bfe3f0" stop-opacity=".35"/><stop offset=".5" stop-color="#e8f7ff" stop-opacity=".12"/><stop offset="1" stop-color="#bfe3f0" stop-opacity=".3"/></linearGradient>
      </defs>
      <rect width="1200" height="510" fill="url(#wall)"/>
      <rect y="500" width="1200" height="200" fill="url(#floor)"/>
      ${Array.from({ length: 12 }, (_, i) => `<path d="M${i * 110 - 40} 700 L${i * 100 + 20} 500" stroke="#4f3822" stroke-width="2"/>`).join("")}
      <rect y="496" width="1200" height="10" fill="#3a4437"/>
      <!-- окно -->
      <rect x="60" y="90" width="200" height="270" fill="#1c2c3d" stroke="#d8d2c2" stroke-width="10"/>
      <path d="M160 90v270M60 225h200" stroke="#d8d2c2" stroke-width="8"/>
      <circle cx="30" cy="40" r="0" />
      <rect x="150" y="214" width="20" height="22" rx="3" fill="#b9a46a"/>
      <path d="M90 120 l40 40 M190 280 l30 -30" stroke="#5c7a96" stroke-width="3" opacity=".6"/>
      <!-- картины -->
      <rect x="740" y="60" width="130" height="100" fill="#8a6a2f"/><rect x="748" y="68" width="114" height="84" fill="#7fa0b7"/><path d="M748 152 l40 -40 30 25 44 -35v50z" fill="#4d6b3c"/>
      <rect x="40" y="410" width="0" height="0"/>
      <!-- табличка -->
      <rect x="330" y="284" width="64" height="34" fill="#e8e1cf" stroke="#9b8f72"/>
      <text x="362" y="296" font-size="6.5" text-anchor="middle" fill="#333" font-family="serif">«Девочка с синей птицей»</text>
      <text x="362" y="305" font-size="5.5" text-anchor="middle" fill="#333" font-family="serif">нач. XX в. Автор неизвестен</text>
      <text x="362" y="313" font-size="5.5" text-anchor="middle" fill="#333" font-family="serif">Дар 1964 г.</text>
      <!-- витрина -->
      <rect x="480" y="420" width="240" height="140" fill="#2d2a26"/>
      <rect x="470" y="410" width="260" height="14" fill="#3b3732"/>
      <rect x="470" y="200" width="260" height="214" fill="url(#glass)" stroke="#d9e6ea" stroke-width="3"/>
      <rect x="540" y="230" width="120" height="160" fill="none" stroke="#5c4a2a" stroke-width="4" stroke-dasharray="6 6" opacity=".6"/>
      <text x="600" y="315" font-size="13" text-anchor="middle" fill="#cfd8dc" opacity=".6" font-family="monospace">ПУСТО</text>
      <rect x="470" y="200" width="260" height="214" fill="none" stroke="#d9e6ea" stroke-width="3" transform="rotate(-4 470 414) translate(0 0)" opacity=".0"/>
      <!-- винты -->
      ${[[478, 208], [722, 208], [478, 406], [722, 406]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4" fill="#a7adb2"/><path d="M${x - 3} ${y}h6" stroke="#555" stroke-width="1.4"/>`).join("")}
      <circle cx="486" cy="414" r="2.6" fill="#a7adb2"/>
      <!-- отпечаток -->
      <g opacity=".55" transform="translate(652 300) rotate(-20)">
        ${[3, 5.5, 8, 10.5].map((r) => `<ellipse rx="${r}" ry="${r * 1.35}" fill="none" stroke="#e9f2f5" stroke-width="1.1"/>`).join("")}
      </g>
      <!-- нитка -->
      <path d="M727 244 q8 6 2 12 q-6 6 4 12" stroke="#2f55c8" stroke-width="2.2" fill="none"/>
      <path d="M729 250 l2 3" stroke="#d33" stroke-width="1"/>
      <!-- дверь техкомнаты -->
      <rect x="900" y="150" width="130" height="350" fill="#3c4650" stroke="#2a3138" stroke-width="6"/>
      <rect x="914" y="170" width="102" height="40" fill="#e6c34a"/>
      <text x="965" y="186" font-size="10" text-anchor="middle" fill="#222" font-family="sans-serif" font-weight="700">ТЕХНИЧЕСКОЕ</text>
      <text x="965" y="200" font-size="10" text-anchor="middle" fill="#222" font-family="sans-serif" font-weight="700">ПОМЕЩЕНИЕ</text>
      <circle cx="1012" cy="330" r="7" fill="#b9a46a"/>
      <!-- следы -->
      ${[[968, 528], [946, 552], [962, 578], [938, 604], [952, 630], [928, 654]].map(([x, y], i) => `<ellipse cx="${x}" cy="${y}" rx="9" ry="14" fill="#a68866" opacity=".55" transform="rotate(${i % 2 ? -18 : 12} ${x} ${y})"/>`).join("")}
      <rect x="880" y="508" width="160" height="150" fill="#c9b08a" opacity=".12"/>
      <!-- огнетушитель -->
      <rect x="1050" y="400" width="26" height="80" rx="10" fill="#c23b2c"/><rect x="1056" y="390" width="14" height="12" fill="#333"/>
      <!-- скамья -->
      <rect x="60" y="560" width="200" height="16" fill="#3b2a1b"/><rect x="70" y="576" width="12" height="50" fill="#2b1f14"/><rect x="236" y="576" width="12" height="50" fill="#2b1f14"/>
      <!-- лента -->
      <path d="M430 470 L770 470" stroke="#e6c34a" stroke-width="10"/>
      ${Array.from({ length: 8 }, (_, i) => `<text x="${450 + i * 42}" y="474" font-size="8" fill="#222" font-family="monospace">ПОЛИЦИЯ</text>`).join("")}
    </svg>`;
  };

  // ---------- Фото Ники 600×400 (найди отличия) ----------
  A.DIFFS = [
    { id: "clock", x: 300, y: 55, r: 34, label: "Часы: 16:50 → 17:25" },
    { id: "door", x: 505, y: 200, r: 55, label: "Дверь технической комнаты приоткрыта, внутри свет", key: true },
    { id: "ext", x: 412, y: 270, r: 40, label: "Огнетушитель передвинули" },
    { id: "bag", x: 110, y: 318, r: 36, label: "Сумка на скамье исчезла" },
    { id: "blind", x: 90, y: 110, r: 50, label: "Жалюзи опущены" },
  ];
  A.photo = function (late) {
    const hm = late ? [5, 25] : [4, 50];
    const ha = ((hm[0] % 12) + hm[1] / 60) * 30, ma = hm[1] * 6;
    const hand = (a, l, w) => `<line x1="300" y1="55" x2="${300 + l * Math.sin((a * Math.PI) / 180)}" y2="${55 - l * Math.cos((a * Math.PI) / 180)}" stroke="#222" stroke-width="${w}" stroke-linecap="round"/>`;
    return `<svg viewBox="0 0 600 400" role="img" aria-label="Фото зала 2 в ${late ? "17:25" : "16:50"}">
      <rect width="600" height="300" fill="#5d6b5a"/><rect y="295" width="600" height="105" fill="#7a5b3c"/>
      <rect x="30" y="60" width="120" height="160" fill="#2a4a68" stroke="#d8d2c2" stroke-width="6"/>
      ${late ? `<rect x="33" y="63" width="114" height="100" fill="#cfc6b0"/>${Array.from({ length: 9 }, (_, i) => `<path d="M33 ${66 + i * 11}h114" stroke="#a89f88"/>`).join("")}` : `<rect x="33" y="63" width="114" height="18" fill="#cfc6b0"/>`}
      <circle cx="300" cy="55" r="26" fill="#f2efe6" stroke="#333" stroke-width="3"/>
      ${hand(ha, 14, 4)}${hand(ma, 21, 2.5)}
      <rect x="215" y="230" width="150" height="80" fill="#2d2a26"/>
      <rect x="205" y="110" width="170" height="125" fill="#bfe3f0" fill-opacity=".2" stroke="#d9e6ea" stroke-width="2"/>
      ${A.painting(250, 120, 80, 104)}
      <rect x="470" y="110" width="72" height="190" fill="#3c4650" stroke="#2a3138" stroke-width="4"/>
      ${late ? `<path d="M470 110 L470 300 L452 306 L452 104Z" fill="#2c343c"/><path d="M470 112 L470 298 L540 300 L540 110Z" fill="#f0d36a" opacity=".85"/><path d="M470 300 L560 330 L600 330 L600 316Z" fill="#f0d36a" opacity=".35"/>` : ""}
      <rect x="476" y="118" width="60" height="22" fill="#e6c34a"/>
      ${late ? `<rect x="384" y="245" width="16" height="48" rx="6" fill="#c23b2c"/>` : `<rect x="430" y="245" width="16" height="48" rx="6" fill="#c23b2c"/>`}
      <rect x="40" y="330" width="140" height="10" fill="#3b2a1b"/><rect x="48" y="340" width="8" height="30" fill="#2b1f14"/><rect x="164" y="340" width="8" height="30" fill="#2b1f14"/>
      ${late ? "" : `<path d="M92 330 q0 -26 18 -26 q18 0 18 26z" fill="#7d4b8a"/><path d="M100 306 q10 -14 20 0" fill="none" stroke="#5a3365" stroke-width="3"/>`}
    </svg>`;
  };
  A.catPhoto = function () {
    return `<svg viewBox="0 0 600 400"><rect width="600" height="400" fill="#d9c6a5"/><ellipse cx="300" cy="280" rx="150" ry="90" fill="#e08a3c"/><circle cx="300" cy="170" r="80" fill="#e08a3c"/><path d="M235 120 l10 -60 40 40z M365 120 l-10 -60 -40 40z" fill="#e08a3c"/><circle cx="272" cy="165" r="9" fill="#222"/><circle cx="328" cy="165" r="9" fill="#222"/><path d="M290 195 q10 8 20 0" stroke="#222" stroke-width="4" fill="none"/></svg>`;
  };

  // ---------- Камеры 640×360 ----------
  A.fmtMin = function (m) {
    const total = (B.case1.CAM.start + m) % (24 * 60);
    return String(Math.floor(total / 60)).padStart(2, "0") + ":" + String(total % 60).padStart(2, "0");
  };
  A.cam = function (cam, m) {
    const C = B.case1.CAM;
    const stamp = `<rect x="0" y="0" width="640" height="26" fill="rgba(0,0,0,.55)"/><text x="10" y="18" fill="#fff" font-family="monospace" font-size="14">${cam === "hall" ? "CAM-2 ЗАЛ 2" : "CAM-5 СЛУЖЕБНЫЙ ВХОД"}</text><text x="630" y="18" fill="#fff" font-family="monospace" font-size="14" text-anchor="end">ВС→ПН ${A.fmtMin(m)}</text>`;
    if (m >= C.dark[0] && m < C.dark[1]) {
      return `<svg viewBox="0 0 640 360"><rect width="640" height="360" fill="#050505"/>${Array.from({ length: 60 }, (_, i) => `<rect x="${(i * 97) % 640}" y="${(i * 53 + m * 7) % 360}" width="${(i % 5) + 2}" height="2" fill="#333"/>`).join("")}<text x="320" y="185" fill="#ddd" font-family="monospace" font-size="26" text-anchor="middle">НЕТ СИГНАЛА</text>${stamp}</svg>`;
    }
    const night = m >= C.nightFrom && m < 930;
    const filt = night ? `filter="url(#ir)"` : "";
    const defs = `<defs><filter id="ir"><feColorMatrix type="matrix" values="0.3 0.5 0.1 0 0  0.35 0.6 0.15 0 0.04  0.25 0.4 0.1 0 0  0 0 0 1 0"/></filter></defs>`;
    let body = "";
    const person = (x, col, extra = "") => `<g transform="translate(${x} 0)"><circle cx="0" cy="170" r="14" fill="#e0bfa0"/><rect x="-16" y="184" width="32" height="70" rx="8" fill="${col}"/><rect x="-14" y="252" width="11" height="48" fill="#222"/><rect x="3" y="252" width="11" height="48" fill="#222"/>${extra}</g>`;
    if (cam === "hall") {
      const gone = m >= C.goneAfter;
      const showcaseOpen = gone;
      body = `<rect width="640" height="360" fill="#5d6b5a"/><rect y="270" width="640" height="90" fill="#7a5b3c"/>
        <rect x="250" y="230" width="140" height="70" fill="#2d2a26"/>
        <rect x="240" y="${showcaseOpen ? 112 : 120}" width="160" height="112" fill="#bfe3f0" fill-opacity=".18" stroke="#d9e6ea" stroke-width="2" ${showcaseOpen ? 'transform="rotate(-3 240 230)"' : ""}/>
        ${gone ? "" : A.painting(285, 128, 70, 92)}
        <rect x="500" y="110" width="70" height="170" fill="#3c4650" stroke="#2a3138" stroke-width="4"/>
        <rect x="506" y="118" width="58" height="18" fill="#e6c34a"/>`;
      if (m >= C.nika[0] && m < C.nika[1]) body += person(150 + (m - C.nika[0]) * 6, "#c46a3a", `<rect x="10" y="190" width="14" height="10" fill="#222"/>`);
      for (const [a, b] of C.guard) if (m >= a && m < b) body += person(80 + (m - a) * 50, "#2b3644", `<circle cx="18" cy="200" r="5" fill="#ff0"/>`);
      if (m >= C.alla[0]) body += person(170, "#7b4d6e");
    } else {
      const open = m >= 930;
      body = `<rect width="640" height="360" fill="#6b7268"/><rect y="280" width="640" height="80" fill="#4e544c"/>
        <rect x="380" y="70" width="150" height="230" fill="${open ? "#cfd8dc" : "#39434c"}" stroke="#222" stroke-width="5"/>
        ${open ? `<rect x="380" y="70" width="40" height="230" fill="#39434c" transform="skewY(8)"/><rect x="395" y="290" width="30" height="12" fill="#6b4a2f"/>` : `<circle cx="512" cy="190" r="6" fill="#b9a46a"/>`}
        <text x="455" y="60" fill="#eee" font-family="sans-serif" font-size="13" text-anchor="middle">СЛУЖЕБНЫЙ ВХОД</text>
        <rect x="60" y="120" width="100" height="160" fill="#565d55"/>`;
      if (m >= C.zoya[0] && m < C.zoya[1] && !(m >= C.worker[0] - 2 && m < C.worker[1] + 2)) body += person(180 + ((m - C.zoya[0]) % 20) * 4, "#5c8f86", `<rect x="16" y="270" width="18" height="24" fill="#3a5bd0"/>`);
      if (m >= C.worker[0] && m < C.worker[1]) {
        const x = 200 + (m - C.worker[0]) * 45;
        body += person(x, "#2f55c8", `<path d="M-15 160 q15 -18 30 0z" fill="#2f55c8"/><rect x="-22" y="196" width="10" height="56" fill="#b08a5a"/>`);
        body += person(140, "#5c8f86");
      }
    }
    return `<svg viewBox="0 0 640 360">${defs}<g ${filt}>${body}</g>${night ? `<rect width="640" height="360" fill="#000" opacity=".25"/>` : ""}${stamp}</svg>`;
  };

  // ---------- «Рабочий» для свидетеля ----------
  A.worker = function () {
    return `<svg viewBox="0 0 400 420" role="img" aria-label="Человек у служебного входа">
      <rect width="400" height="420" fill="#6b7268"/><rect y="340" width="400" height="80" fill="#4e544c"/>
      <rect x="250" y="40" width="120" height="300" fill="#cfd8dc" stroke="#222" stroke-width="5"/>
      <g transform="translate(160 0)">
        <rect x="-50" y="150" width="100" height="160" rx="18" fill="#2f55c8"/>
        <rect x="-44" y="300" width="38" height="70" fill="#2f55c8"/><rect x="6" y="300" width="38" height="70" fill="#2f55c8"/>
        <rect x="-46" y="366" width="40" height="14" rx="5" fill="#ddd"/><rect x="6" y="366" width="40" height="14" rx="5" fill="#ddd"/>
        <rect x="-12" y="120" width="24" height="34" fill="#e0bfa0"/>
        <ellipse cx="0" cy="96" rx="34" ry="40" fill="#e0bfa0"/>
        <path d="M-38 78 q38 -50 76 0z" fill="#2f55c8"/><rect x="-6" y="72" width="60" height="10" rx="4" fill="#24459f"/>
        <rect x="-14" y="50" width="28" height="20" fill="none" stroke="#fff" stroke-width="2.5"/><text x="0" y="65" font-size="12" text-anchor="middle" fill="#fff" font-family="sans-serif" font-weight="700">СР</text>
        <circle cx="-12" cy="96" r="4" fill="#222"/><circle cx="12" cy="96" r="4" fill="#222"/>
        <path d="M-16 118 q16 -9 32 0 q-16 7 -32 0z" fill="#4a2f1a"/>
        <rect x="-96" y="170" width="70" height="110" fill="#b08a5a" transform="rotate(-8 -60 220)"/><path d="M-96 225 h70" stroke="#7a5c38" stroke-width="3" transform="rotate(-8 -60 220)"/>
        <rect x="-30" y="200" width="22" height="14" fill="#d33" opacity=".0"/>
      </g>
    </svg>`;
  };

  // ---------- Отпечатки ----------
  A.print = function (type, scar, seed = 0) {
    let lines = "";
    if (type === "whorl") for (let i = 1; i < 11; i++) lines += `<ellipse cx="60" cy="72" rx="${i * 5.2}" ry="${i * 6.6}" fill="none"/>`;
    if (type === "loop") for (let i = 1; i < 11; i++) lines += `<path d="M${60 - i * 5} 140 L${60 - i * 5} 70 Q60 ${70 - i * 8} ${60 + i * 5} 70 L${60 + i * 5} 140" fill="none"/>`;
    if (type === "arch") for (let i = 0; i < 13; i++) lines += `<path d="M0 ${40 + i * 9} Q60 ${10 + i * 9} 120 ${40 + i * 9}" fill="none"/>`;
    if (type === "lloop") for (let i = 1; i < 11; i++) lines += `<path d="M${30 + i * 2} 140 Q${20 + i * 2} ${60 - i * 2} ${70 + i * 4} ${64 - i * 3}" fill="none"/>`;
    const sc = scar ? `<path d="M${18 + seed} 110 L${100 - seed} 38" stroke="#f3efe4" stroke-width="5"/>` : "";
    const dots = seed ? `<circle cx="${30 + seed * 3}" cy="${100 - seed * 2}" r="3" fill="#2a2a2a"/>` : "";
    return `<svg viewBox="0 0 120 150"><defs><clipPath id="fp${type}${scar ? 1 : 0}${seed}"><ellipse cx="60" cy="76" rx="52" ry="68"/></clipPath></defs>
      <rect width="120" height="150" fill="#f3efe4"/>
      <g clip-path="url(#fp${type}${scar ? 1 : 0}${seed})" stroke="#2a2a2a" stroke-width="2.3">${lines}${sc}${dots}</g>
      <ellipse cx="60" cy="76" rx="52" ry="68" fill="none" stroke="#bbb"/></svg>`;
  };

  // ---------- Ткани под микроскопом ----------
  A.fabric = function (base, twill, tracer, fuzzy) {
    let cells = "";
    for (let r = 0; r < 12; r++) for (let c = 0; c < 12; c++) {
      const on = twill ? (r + c) % 3 === 0 : (r + c) % 2 === 0;
      cells += `<rect x="${c * 10}" y="${r * 10}" width="10" height="10" fill="${on ? base : shade(base)}"/>`;
    }
    const tr = tracer ? `<path d="M0 64 h120" stroke="#d33" stroke-width="3"/>` : "";
    const fz = fuzzy ? Array.from({ length: 40 }, (_, i) => `<path d="M${(i * 37) % 120} ${(i * 23) % 120} l${(i % 7) - 3} ${(i % 5) + 4}" stroke="#bbb" stroke-width="1"/>`).join("") : "";
    return `<svg viewBox="0 0 120 120"><defs><clipPath id="cl${base.slice(1)}${twill ? 1 : 0}${tracer ? 1 : 0}"><circle cx="60" cy="60" r="58"/></clipPath></defs><g clip-path="url(#cl${base.slice(1)}${twill ? 1 : 0}${tracer ? 1 : 0})">${cells}${tr}${fz}</g><circle cx="60" cy="60" r="58" fill="none" stroke="#222" stroke-width="4"/></svg>`;
  };
  function shade(hex) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.max(0, (n >> 16) - 40), g = Math.max(0, ((n >> 8) & 255) - 40), b = Math.max(0, (n & 255) - 40);
    return "#" + ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0");
  }

  // ---------- Карта города ----------
  A.map = function (state) {
    const L = B.case1.LOCATIONS, M = B.case1.MUSEUM;
    let pins = "";
    for (const [k, l] of Object.entries(L)) {
      const locked = l.needs && !state.evidence.includes(l.needs);
      if (locked) continue;
      const vis = state.visited[k];
      pins += `<g class="loc" data-loc="${k}" tabindex="0" role="button" aria-label="${l.name}">
        <line x1="${M.x}" y1="${M.y}" x2="${l.x}" y2="${l.y}" stroke="#2e3d4d" stroke-dasharray="4 6"/>
        <circle class="dot" cx="${l.x}" cy="${l.y}" r="14" fill="${vis ? "#4fbf86" : "#e7b04a"}" stroke="#10161d" stroke-width="3"/>
        <text x="${l.x}" y="${l.y + 32}" fill="#e6e9ec" font-size="14" text-anchor="middle" font-family="IBM Plex Sans, sans-serif">${l.name.replace(/«|»/g, "")}</text>
        <text x="${l.x}" y="${l.y + 48}" fill="#9aa8b5" font-size="12" text-anchor="middle" font-family="PT Mono, monospace">${vis ? "посещено" : fmtCost(l.cost)}</text>
      </g>`;
    }
    return `<svg viewBox="0 0 900 480" role="img" aria-label="Карта Тихореченска">
      <rect width="900" height="480" fill="#0c1218"/>
      <path d="M0 240 C150 200 260 280 400 250 S650 170 900 230 L900 280 C700 230 600 310 420 300 S150 260 0 290Z" fill="#14283a"/>
      <text x="820" y="262" fill="#2c4d6b" font-size="13" font-family="PT Mono, monospace">р. Тихая</text>
      ${Array.from({ length: 9 }, (_, i) => `<path d="M${i * 110} 0 L${i * 110 + 40} 480" stroke="#141c24" stroke-width="6"/>`).join("")}
      ${Array.from({ length: 5 }, (_, i) => `<path d="M0 ${i * 110 + 30} L900 ${i * 110 + 10}" stroke="#141c24" stroke-width="6"/>`).join("")}
      <path d="M680 470 L900 380" stroke="#3a4552" stroke-width="5" stroke-dasharray="14 8"/>
      <g><rect x="${M.x - 16}" y="${M.y - 16}" width="32" height="32" fill="#4f7dff" stroke="#10161d" stroke-width="3" transform="rotate(45 ${M.x} ${M.y})"/>
      <text x="${M.x}" y="${M.y + 40}" fill="#c9d6ff" font-size="14" text-anchor="middle" font-family="IBM Plex Sans, sans-serif" font-weight="600">Музей · штаб</text></g>
      ${pins}
    </svg>`;
  };
  function fmtCost(m) { return m >= 60 ? (m / 60).toString().replace(".", ",") + " ч" : m + " мин"; }
  A.fmtCost = fmtCost;

  // Обложка дела / герой
  A.cover = function () {
    return `<svg viewBox="0 0 640 360" role="img" aria-label="Пустая витрина и синяя птица">
      <rect width="640" height="360" fill="#17202a"/>
      <rect x="0" y="260" width="640" height="100" fill="#10161d"/>
      <path d="M200 0 L320 0 L460 360 L140 360Z" fill="#e7b04a" opacity=".07"/>
      <rect x="230" y="200" width="180" height="90" fill="#2d2a26"/>
      <rect x="220" y="60" width="200" height="144" fill="#bfe3f0" fill-opacity=".1" stroke="#d9e6ea" stroke-width="2"/>
      <rect x="270" y="80" width="100" height="110" fill="none" stroke="#8a6a2f" stroke-width="3" stroke-dasharray="6 6"/>
      <path d="M470 120 q40 -34 74 -8 q-16 12 -8 24 q-38 18 -66 -16z" fill="#4f7dff"/>
      <path d="M500 112 q16 -26 40 -24 q-14 10 -14 24z" fill="#2f5ae0"/>
      <circle cx="532" cy="112" r="3" fill="#10161d"/>
      <path d="M546 116 l14 2 -14 4z" fill="#e7b04a"/>
      <path d="M100 300 L560 300" stroke="#e6c34a" stroke-width="12"/>
      ${Array.from({ length: 9 }, (_, i) => `<text x="${110 + i * 50}" y="304" font-size="9" fill="#222" font-family="monospace">ПОЛИЦИЯ</text>`).join("")}
    </svg>`;
  };
  A.coverSoon = function (kind) {
    const ic = {
      daily: `<circle cx="320" cy="170" r="70" fill="none" stroke="#e7b04a" stroke-width="6"/><path d="M320 170 V120 M320 170 L360 190" stroke="#e7b04a" stroke-width="6" stroke-linecap="round"/>`,
      proto: `<circle cx="250" cy="160" r="30" fill="#4f7dff"/><circle cx="390" cy="160" r="30" fill="#d2483a"/><circle cx="320" cy="230" r="30" fill="#4fbf86"/><path d="M250 160 L390 160 L320 230Z" fill="none" stroke="#9aa8b5" stroke-width="3"/>`,
      light: `<path d="M300 280 L310 120 L330 120 L340 280Z" fill="#ddd"/><rect x="305" y="100" width="30" height="24" fill="#e7b04a"/><path d="M335 112 L520 70 L520 150Z" fill="#e7b04a" opacity=".3"/><path d="M0 290 Q160 270 320 290 T640 290 V360 H0Z" fill="#14283a"/>`,
    }[kind];
    return `<svg viewBox="0 0 640 360"><rect width="640" height="360" fill="#17202a"/>${ic}</svg>`;
  };

  B.art = A;
})();
