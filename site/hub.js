/* Главное меню «Мир Раскола»: продолжить, главы, настройки, об игре, установка на телефон */
(() => {
'use strict';
const KEYS = {
  prologue: 'tkgame-prologue-auto-v2',
  outcome: 'tkgame-prologue-outcome',
  chapter: 'tkgame-chapter1-auto-v1',
  last: 'tkgame-last-played',
  settings: 'tkgame-prologue-settings'
};
const read = key => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } };
const esc = v => String(v ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const panel = document.querySelector('#panel');
const menu = document.querySelector('#menu');
const foot = document.querySelector('#foot');

function progress() {
  const pro = read(KEYS.prologue), outcome = read(KEYS.outcome), ch = read(KEYS.chapter);
  const proStarted = !!(pro && (pro.intro > 0 || pro.visited?.length));
  const proDone = !!outcome || !!pro?.docked;
  const chStarted = !!ch;
  const chDone = !!ch?.ending;
  let last = null; try { last = localStorage.getItem(KEYS.last); } catch {}
  let resume = null;
  if (chStarted && (last === 'chapter' || !proStarted || proDone)) resume = { href: './chapter/', label: 'Продолжить · Глава I' };
  else if (proStarted && !proDone) resume = { href: './prologue/?play=1', label: 'Продолжить · Пролог' };
  else if (proDone && !chStarted) resume = { href: './chapter/?from=prologue', label: 'Продолжить · Глава I' };
  else if (chStarted) resume = { href: './chapter/', label: 'Продолжить · Глава I' };
  return { proStarted, proDone, chStarted, chDone, resume, any: proStarted || proDone || chStarted };
}

function renderMenu() {
  const p = progress();
  const items = [];
  if (p.resume) items.push(`<a class="btn primary" href="${p.resume.href}">${esc(p.resume.label)}</a>`);
  items.push(p.any
    ? '<button type="button" class="btn" data-panel="confirm-new">Новая игра</button>'
    : '<a class="btn primary" href="./prologue/?play=1">Начать с пролога</a>');
  items.push('<button type="button" class="btn" data-panel="chapters">Главы</button>');
  items.push('<button type="button" class="btn" data-panel="settings">Настройки</button>');
  items.push('<button type="button" class="btn" data-panel="about">Об игре</button>');
  if (installEvent) items.push('<button type="button" class="btn" data-act="install">Установить на телефон</button>');
  menu.innerHTML = items.join('');
}

/* Настройки общие с прологом и главой */
const settings = { sound: true, vibro: true, speed: 'normal' };
Object.assign(settings, read(KEYS.settings) || {});
const saveSettings = () => { try { localStorage.setItem(KEYS.settings, JSON.stringify(settings)); } catch {} };
function settingsBody() {
  const seg = (key, value, label) => {
    const on = String(settings[key]) === String(value);
    return `<button type="button" class="seg${on ? ' on' : ''}" data-set="${key}" data-value="${value}" aria-pressed="${on}">${esc(label)}</button>`;
  };
  return '<div class="settings">' +
    `<div class="setting"><span>Звук</span><div class="segs">${seg('sound', true, 'Вкл')}${seg('sound', false, 'Выкл')}</div></div>` +
    `<div class="setting"><span>Вибрация</span><div class="segs">${seg('vibro', true, 'Вкл')}${seg('vibro', false, 'Выкл')}</div></div>` +
    `<div class="setting"><span>Скорость текста</span><div class="segs">${[['slow', 'Медленно'], ['normal', 'Обычно'], ['fast', 'Быстро'], ['instant', 'Сразу']].map(([v, l]) => seg('speed', v, l)).join('')}</div></div>` +
    '</div><p class="muted hub-note">Сложность главы I выбирается в её меню: «Для семьи», «Обычная» или «Следователь».</p>';
}

function chaptersBody() {
  const p = progress();
  const state = (done, started) => done ? '<span class="hub-tag done">Пройден</span>' : started ? '<span class="hub-tag">В процессе</span>' : '';
  const chState = p.chDone ? '<span class="hub-tag done">Пройдена</span>' : p.chStarted ? '<span class="hub-tag">В процессе</span>' : '';
  return '<div class="hub-chapters">' +
    `<a class="hub-chapter" href="./prologue/?play=1" style="--art:url(prologue/assets/intro-1.webp)"><span class="kicker">Пролог ${state(p.proDone, p.proStarted)}</span><b>«Приказ»</b><small>Ночь на шаттле погибшего командира. Экипаж, которому вы чужой, приказ Центра и первые следы Узла-9.</small></a>` +
    `<a class="hub-chapter" href="./chapter/${p.proDone && !p.chStarted ? '?from=prologue' : ''}" style="--art:url(chapter/assets/scene-port.webp)"><span class="kicker">Глава I ${chState}</span><b>«Семь имён»</b><small>Лунный порт, двенадцать свидетелей и список, в котором на одно имя больше. Можно начать сразу, выбрав, как прошёл пролог. Рассчитана на 1–2 часа.</small></a>` +
    '</div>';
}

function aboutBody() {
  return '<div class="hub-about">' +
    '<p>«Мир Раскола» — детективная история о контрразведке Багряных домов. Вы принимаете группу погибшего командира Северина Даля и за одну ночь и один день в лунном порту решаете, кому верить: экипажу, свидетелям или Центру.</p>' +
    '<p>Осматривайте места, говорите с людьми и читайте их реакции, проводите экспертизы, соединяйте факты на доске улик и отвечайте за решения. От того, как вы ведёте себя с экипажем, зависит, кто встанет рядом в конце.</p>' +
    '<h3>Как играть</h3><ul><li>Нажимайте на подсвеченные точки на сцене.</li><li>Вкладки сверху: дело, версии, вещи, экипаж, карта.</li><li>Прогресс сохраняется сам после каждого действия; в меню игры есть ручное сохранение.</li><li>На телефоне игру можно установить на главный экран: она запустится на весь экран и будет работать без сети.</li></ul>' +
    '<h3>Титры</h3><dl class="credits">' +
    '<dt>Автор, мир и сюжет</dt><dd>Дмитрий</dd>' +
    '<dt>Иллюстрации</dt><dd>Дмитрий, с помощью ChatGPT</dd>' +
    '<dt>Код, механики и тексты</dt><dd>при участии Claude (Anthropic)</dd>' +
    '<dt>Тестирование</dt><dd>первые игроки — спасибо им</dd>' +
    '</dl><p class="muted">Версия <span id="build">—</span> · 2026</p></div>';
}

function confirmBody() {
  return '<p>Прогресс пролога и главы I будет стёрт. Настройки и ручные сохранения останутся.</p>' +
    '<div class="menu-list"><button type="button" class="btn primary" data-act="new-game">Начать заново с пролога</button><button type="button" class="btn" data-act="close">Отмена</button></div>';
}

const panels = {
  chapters: ['Главы', chaptersBody],
  settings: ['Настройки', settingsBody],
  about: ['Об игре', aboutBody],
  'confirm-new': ['Новая игра', confirmBody]
};
let current = '';
function openPanel(id) {
  const [title, body] = panels[id];
  current = id;
  panel.innerHTML = `<div class="panel-top"><div class="panel-grip" aria-hidden="true"></div><header class="panel-head"><h2 id="panel-title">${esc(title)}</h2><button type="button" class="icon-btn" data-act="close" aria-label="Закрыть"><svg viewBox="0 0 24 24" class="ico" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></header></div><div class="panel-body">${body()}</div>`;
  if (id === 'about') fetch('./version.txt', { cache: 'no-store' }).then(r => r.ok ? r.text() : '').then(t => { const el = panel.querySelector('#build'); if (el && t.trim()) el.textContent = t.trim(); }).catch(() => {});
  if (!panel.open) panel.showModal();
}
function closePanel() { current = ''; if (panel.open) panel.close(); }

document.addEventListener('click', ev => {
  const t = ev.target.closest('[data-panel],[data-act],[data-set]');
  if (!t) return;
  if (t.dataset.panel) { openPanel(t.dataset.panel); return; }
  if (t.dataset.set) {
    const key = t.dataset.set, v = t.dataset.value;
    settings[key] = key === 'speed' ? v : v === 'true';
    saveSettings(); openPanel('settings'); return;
  }
  const act = t.dataset.act;
  if (act === 'close') closePanel();
  if (act === 'new-game') {
    try {
      [KEYS.prologue, KEYS.outcome, KEYS.chapter, KEYS.last].forEach(k => localStorage.removeItem(k));
      sessionStorage.removeItem('tkgame-chapter1-intro');
    } catch {}
    location.href = './prologue/?play=1';
  }
  if (act === 'install' && installEvent) {
    installEvent.prompt();
    installEvent.userChoice.finally(() => { installEvent = null; renderMenu(); });
  }
});
panel.addEventListener('click', ev => { if (ev.target === panel) closePanel(); });

/* Установка как приложение */
let installEvent = null;
window.addEventListener('beforeinstallprompt', ev => { ev.preventDefault(); installEvent = ev; renderMenu(); });
const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
if (ios && !standalone) foot.textContent = 'Автосохранение включено · Чтобы установить: «Поделиться» → «На экран „Домой“»';

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('./sw.js').catch(() => {});

/* url() внутри --art считается от prologue.css, поэтому даём абсолютный адрес */
document.querySelectorAll('[data-art]').forEach(el => el.style.setProperty('--art', `url("${new URL(el.dataset.art, location.href).href}")`));
renderMenu();
window.addEventListener('pageshow', renderMenu);
})();
