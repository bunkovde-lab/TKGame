(() => {
  'use strict';
  const D = window.CHAPTER_DATA,
    E = window.CHAPTER_ENGINE,
    P = window.CHAPTER_PRIOR;
  if (P && P.overlay()) return;
  const FX = window.TK_FX;
  const app = document.querySelector('#app'),
    panel = document.querySelector('#panel'),
    notice = document.querySelector('#status');
  const ico = (id) => (FX ? FX.ico(id) : '');
  const tw = (text, key, voice) => (FX ? FX.tw(text, key, voice, rich(text)) : `<p class="tw">${rich(text)}</p>`);
  const crewIds = ['mara', 'corvin', 'irena', 'rein'];
  /* Путь к арту делаем абсолютным: переменная --art читается в стилях пролога из другой папки */
  const abs = (path) => {
    try {
      return new URL(path, document.baseURI || location.href).href;
    } catch {
      return path;
    }
  };
  /* Разговор с экипажем идёт в его отсеке шаттла, как в прологе */
  const shortName = { mara: 'Мара', corvin: 'Корвин', irena: 'Ирена', rein: 'Рейн' };
  let teamPick = null;
  const actorX = { port: 70, waiting: 85, registry: 78, clinic: 78, warehouse: 78, archive: 78, relay: 78 };
  let lastSceneKey = '',
    lastNpc = null;
  const AUTO = 'tkgame-chapter1-auto-v1',
    MANUAL = 'tkgame-chapter1-manual-v1';
  const esc = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const b = (a, v, t, primary = false, disabled = false) =>
    `<button type="button" class="btn${primary ? ' primary' : ''}" data-a="${esc(a)}" data-v="${esc(v)}"${disabled ? ' disabled' : ''}>${esc(t)}</button>`;
  function rich(text) {
    const original = String(text || ''),
      lower = original.toLowerCase(),
      keys = Object.keys(D.glossary || {})
        .filter((x) => x.length > 3)
        .sort((a, b) => b.length - a.length),
      used = new Set();
    let pos = 0,
      out = '';
    while (pos < original.length) {
      let next = -1,
        term = '';
      for (const key of keys) {
        if (used.has(key)) continue;
        const at = lower.indexOf(key.toLowerCase(), pos);
        if (at !== -1 && (next === -1 || at < next)) {
          next = at;
          term = key;
        }
      }
      if (next === -1) {
        out += esc(original.slice(pos));
        break;
      }
      out +=
        esc(original.slice(pos, next)) +
        `<button class="lore-link" data-a="lore" data-v="${esc(term)}" aria-label="Термин: ${esc(term)}">${esc(original.slice(next, next + term.length))}</button>`;
      used.add(term);
      pos = next + term.length;
    }
    return out;
  }

  const entries = (o) => Object.entries(o || {}),
    known = (id) => state.evidence.includes(id) || state.conclusions.includes(id) || state.puzzles.includes(id),
    ready = (req) => (req || []).every(known);
  const pages = (text) => {
    const out = [];
    for (let rest of String(text || '').split(/\n\n+/)) {
      rest = rest.trim();
      while (rest.length > 370) {
        let n = rest.lastIndexOf('. ', 370);
        if (n < 150) n = rest.lastIndexOf(' ', 370);
        if (n < 1) n = 370;
        else n++;
        out.push(rest.slice(0, n).trim());
        rest = rest.slice(n).trim();
      }
      if (rest) out.push(rest);
    }
    return out.length ? out : [''];
  };
  /* Реплики: «Мира: …» «Герой: …» становятся отдельными страницами с именем говорящего */
  const speakerLabels = ['Герой'];
  for (const npc of Object.values(D.npcs || {})) for (const w of String(npc.name || '').split(' ')) if (w.length > 2 && w !== 'Доктор') speakerLabels.push(w);
  const turnRe = new RegExp(`(?:^|(?<=[.!?…»"]\\s))(${[...new Set(speakerLabels)].join('|')}):\\s`, 'g');
  const turnPages = (text) => {
    const parts = String(text || '').split(turnRe);
    const out = [];
    const push = (who, t) => {
      for (const chunk of pages(t)) if (chunk) out.push({ who, text: chunk });
    };
    if (parts[0].trim()) push('', parts[0]);
    for (let i = 1; i < parts.length; i += 2) push(parts[i], parts[i + 1] || '');
    return out.length ? out : [{ who: '', text: '' }];
  };
  let state = E.fresh();
  try {
    const s = localStorage.getItem(AUTO);
    if (s) state = E.restore(JSON.parse(s));
  } catch {}
  let view = '',
    focus = '',
    page = 0,
    topicPage = 0,
    selection = [],
    speech = '',
    speaker = '',
    thought = '',
    cinema = '',
    cinemaArt = '',
    timer;
  let loreReturn = null,
    endingPage = 0,
    workStage = 0;
  let openedIntro = false;
  let sceneAsked = '',
    gameVals = {};
  try {
    openedIntro = !!localStorage.getItem(AUTO);
  } catch {}
  if (P && P.introPending()) openedIntro = false;
  if (!openedIntro) {
    speech =
      (P ? P.opening(state, D.opening?.text || '') : D.opening?.text) ||
      'Шлюз размыкается. Передо мной — нейтральный порт. Здесь мой статус открывает двери, но не заменяет доказательств.';
    speaker = D.opening?.title || 'Человек, которого нет';
  }
  function save(key = AUTO) {
    try {
      localStorage.setItem(key, JSON.stringify(state));
      return true;
    } catch {
      return false;
    }
  }
  function notify(t) {
    const inPanel = panel.open && !panel.classList?.contains('closing');
    const f = inPanel ? panel.querySelector('#panel-feedback') : notice;
    const lines = String(t || '')
      .split(' · ')
      .filter(Boolean)
      .map((line) => `<div>${esc(line)}</div>`)
      .join('');
    clearTimeout(timer);
    if (f) {
      if (FX) f.innerHTML = lines;
      else f.textContent = t;
    }
    if (!inPanel && notice.classList) {
      notice.classList.remove('show');
      void notice.offsetWidth;
      if (lines) notice.classList.add('show');
    }
    timer = setTimeout(() => {
      notice.classList?.remove('show');
      if (inPanel && f) f.textContent = '';
    }, 4600);
  }
  function close() {
    view = '';
    focus = '';
    selection = [];
    if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(needleRaf);
    if (FX) FX.panelClose(panel);
    else panel.close();
  }
  function open(v, id = '') {
    if (v === 'team') teamPick = null;
    const fresh = !panel.open || view !== v;
    view = v;
    focus = id;
    selection = [];
    page = 0;
    if (v === 'puzzle') workStage = 0;
    if (v === 'game') gameVals = {};
    paintPanel();
    FX?.panelOpened(panel, fresh);
    if (!panel.open) panel.showModal();
  }
  function objective() {
    if (!state.conclusions.includes('transfer')) return 'Выяснить, кто исчез из рейса LN-407';
    if (!state.conclusions.includes('forgery')) return 'Проверить основание карантина';
    if (!state.sanction) return 'Подготовить обоснованный запрос в Центр';
    if (!state.conclusions.includes('mastermind')) return 'Установить организатора передачи';
    return 'Собрать заключение и решить судьбу людей';
  }
  function art(id) {
    return id === 'office' ? '../prologue/assets/room-office.webp' : `assets/scene-${id}.webp`;
  }
  function npcAvailable(n) {
    return ready(n.requires) && (!n.sanction || state.sanction);
  }
  /* Время: день, час, вылет */
  function timeLabel() {
    const day = Math.floor(state.tick / 144) + 1;
    return `${day > 1 ? `День ${day} · ` : ''}${E.period(state)} · ${E.clock ? E.clock(state) : ''}`;
  }
  function departureChip() {
    if (!E.departureKnown?.(state)) return '';
    if (state.tick >= 132) return '<span class="slot warn" title="Рейс с людьми уже ушёл">Вылет состоялся</span>';
    const left = 132 - state.tick;
    return `<span class="slot${left <= 6 ? ' warn' : ''}" title="Отправление внешнего перевозчика в 22:00">Вылет 22:00</span>`;
  }
  function topBar() {
    const unread = state.evidence.some((id) => !state.inspected.includes(id));
    const tabs = [
      ['journal', 'Дело', 'journal'],
      ['deductions', 'Версии', 'versions'],
      ['inventory', 'Вещи', 'inventory'],
      ['crew', 'Экипаж', 'crew'],
      ['map', 'Карта', 'map'],
      ['terminal', 'Центр', 'center'],
    ]
      .map(
        ([id, label, icon]) =>
          `<button type="button" class="tab" data-a="panel" data-v="${id}">${ico(icon)}<span>${label}</span>${id === 'journal' && unread ? '<i class="dot" aria-label="есть новое"></i>' : ''}</button>`,
      )
      .join('');
    return `<header class="top"><div class="brand"><span><b>◈</b> Мир Раскола</span><small>Глава I · Семь имён</small></div><nav class="tabs" aria-label="Разделы">${tabs}</nav><div class="meta">${departureChip()}<span class="clock">${ico('clock')}${esc(timeLabel())}</span><button type="button" class="icon-btn" data-a="panel" data-v="system" aria-label="Меню">${ico('menu') || '☰'}</button></div></header>`;
  }
  function moodOf(id) {
    if (crewIds.includes(id)) {
      const m = E.moodOf ? E.moodOf(state, id) : state.prior?.mood?.[id] || 'mid';
      return { cls: m === 'high' ? 'up' : m === 'low' ? 'down' : 'flat', label: m === 'high' ? 'на вашей стороне' : m === 'low' ? 'держит дистанцию' : 'присматривается' };
    }
    if (!(id in (state.trust || {}))) return null;
    const t = state.trust[id];
    return { cls: t > 0 ? 'up' : t < 0 ? 'down' : 'flat', label: t > 1 ? 'доверяет' : t > 0 ? 'открывается' : t < 0 ? 'насторожен' : 'присматривается' };
  }
  /* Спутники на фоне локации: точки из D.crewPosts, смена мест каждые три часа игрового времени */
  function crewPlaced(loc = state.location) {
    const cfg = D.crewPosts?.[loc];
    if (!cfg || loc === 'office') return [];
    const team = E.teamOf ? E.teamOf(state) : [];
    const here = cfg.crew.filter((id) => team.includes(id));
    const block = Math.floor(state.tick / 18);
    return here.slice(0, cfg.posts.length).map((id, i) => ({ id, ...cfg.posts[(i + block) % cfg.posts.length] }));
  }
  function sceneEnter(key) {
    const changed = key !== lastSceneKey;
    lastSceneKey = key;
    return changed && !FX?.reduceMotion ? ' enter' : '';
  }
  function render() {
    const l = D.locations[state.location];
    let n = state.activeNpc && D.npcs[state.activeNpc];
    const activeTopics = n ? E.availableTopics(state, state.activeNpc) : [];
    const current = activeTopics.find((t) => t.id === state.topic);
    let text = speech || (current && (E.topicText ? E.topicText(state, current) : current.text)) || (P && n ? P.greeting(state, state.activeNpc, n) : n?.greeting) || '';
    let who = speech ? speaker : n?.name;
    const turns = n ? turnPages(text) : pages(text).map((t) => ({ who: '', text: t }));
    const ps = turns.map((t) => t.text),
      idx = Math.min(page, ps.length - 1);
    page = idx;
    const turn = turns[idx];
    const heroLine = turn.who === 'Герой';
    const onShip = state.location === 'office' && !!D.ship;
    const room = onShip ? D.ship[state.ship] || D.ship.office : null;
    const team = E.teamOf ? E.teamOf(state) : [];
    const companionTalk = n && !onShip && crewIds.includes(state.activeNpc);
    const interview = state.location === 'registry' && state.activeNpc === 'chief';
    const artFile = onShip ? room.art : interview ? 'assets/scene-interview.webp' : art(state.location);
    const ratio = onShip ? room.ratio : '16 / 9';
    const placed = onShip || interview ? [] : crewPlaced();
    const talkPost = companionTalk ? placed.find((c) => c.id === state.activeNpc) : null;
    const focusX = onShip ? (room.crew ? 0.67 : 0.5) : talkPost ? talkPost.x / 100 : companionTalk ? 0.5 : n && actorX[state.location] ? actorX[state.location] / 100 : 0.5;
    const actors = onShip
      ? room.crew
        ? `<button type="button" class="embedded-actor" data-a="talk" data-v="${room.crew}" aria-label="Поговорить: ${esc(D.npcs[room.crew].name)}"><span>${esc(D.npcs[room.crew].name)}</span></button>`
        : ''
      : (l.npcs || [])
          .filter((id) => D.npcs[id] && npcAvailable(D.npcs[id]))
          .map((id) =>
            id === 'chief'
              ? `<button type="button" class="btn remote-contact" data-a="talk" data-v="${id}">Кабинет руководителя · ${esc(D.npcs[id].name)}</button>`
              : `<button type="button" class="embedded-actor" style="--actor-x:${actorX[state.location] || 70}%" data-a="talk" data-v="${id}" aria-label="Поговорить: ${esc(D.npcs[id].name)}"><span>${esc(D.npcs[id].name)}</span></button>`,
          )
          .join('');
    /* Спутники из экипажа стоят рядом с командиром на каждой локации порта */
    const light = D.crewPosts?.[state.location]?.light || '';
    const companions = placed
      .map((c) => {
        const speaking = state.activeNpc === c.id;
        const far = c.h < 18 ? ' far' : '';
        return `<button type="button" class="crew-figure${speaking ? ' speaking' : ''}${far}" style="--x:${c.x}%;--y:${c.y}%;--h:${c.h}%;--light:${light}" data-a="talk" data-v="${c.id}" aria-label="Поговорить: ${esc(D.npcs[c.id].name)}, ${esc(c.note)}"${n || text ? ' tabindex="-1"' : ''}><img src="${abs(`../prologue/assets/crew-${c.id}.webp`)}" alt=""><span>${esc(shortName[c.id])}</span></button>`;
      })
      .join('');
    const spots = onShip
      ? room.spots.map(
          ([id, label, x, y], i) =>
            `<button type="button" class="hotspot" style="--x:${x}%;--y:${y}%;--i:${i}" data-a="ship-spot" data-v="${esc(id)}" aria-label="${esc(label)}"><b aria-hidden="true">◇</b><span>${esc(label)}</span></button>`,
        )
      : null;
    const objects = onShip
      ? spots.join('')
      : (l.objects || [])
          .map((o, i) => {
            const done = o.evidence && state.evidence.includes(o.evidence);
            return `<button type="button" class="hotspot${done ? ' done' : ''}" style="--x:${o.x || 35}%;--y:${o.y || 55}%;--i:${i}" data-a="object" data-v="${esc(o.id)}" aria-label="Осмотреть: ${esc(o.label)}"><b aria-hidden="true">${done ? '✓' : '◇'}</b><span>${esc(o.label)}</span></button>`;
          })
          .join('');
    let dialog = '';
    const last = idx === ps.length - 1;
    const prev = idx > 0 ? b('prev-page', '', '◂ Назад') : '';
    if (text && n) {
      let reply = '',
        tools = '';
      if (!last) reply = `<button type="button" class="btn primary next" data-a="next-page" data-v="">Дальше ▸</button>`;
      else if (speech) reply = `<button type="button" class="btn primary next" data-a="dismiss-speech" data-v="">Продолжить ▸</button>`;
      else {
        const ts = activeTopics.slice(topicPage * 4, topicPage * 4 + 4);
        reply = ts
          .map((t, i) => {
            const asked = (state.talked || []).includes(t.id);
            return `<button type="button" class="choice${asked ? ' asked' : ''}${t.personal ? ' personal' : ''}" data-a="topic" data-v="${esc(t.id)}" style="--i:${i}"><b>${t.personal ? '♦' : i + 1}</b><span>${esc(t.label)}</span></button>`;
          })
          .join('');
        if (activeTopics.length > 4) tools += b('topics', '', `Другие темы · ${topicPage + 1}/${Math.ceil(activeTopics.length / 4)}`);
      }
      if (last && !speech) reply = readTools() + reply;
      else if (last) tools = readTools() + tools;
      const mood = moodOf(state.activeNpc);
      const talkEnter = state.activeNpc !== lastNpc && !FX?.reduceMotion ? ' enter' : '';
      dialog = `<section class="conversation typing-host${talkEnter}" aria-label="Разговор"><div class="nameplate"><strong class="speaker-name${heroLine ? ' hero' : ''}">${esc(heroLine ? 'Командир' : speech && who !== n.name && !turn.who ? who : n.name)}</strong><span class="speaker-role">${esc(heroLine ? 'Вы' : n.role || '')}</span>${mood && !heroLine ? `<span class="mood mood-${mood.cls}">${esc(mood.label)}</span>` : ''}<button type="button" class="icon-btn talk-close" data-a="leave-talk" data-v="" aria-label="Закончить разговор">${ico('close') || '×'}</button></div><div class="${heroLine ? 'hero-line' : 'npc-line'}">${tw(ps[idx], `n:${state.activeNpc}:${state.topic || ''}:${idx}:${ps[idx].slice(0, 40)}`, heroLine ? 'thought' : state.activeNpc)}</div><div class="after-type"><div class="reply">${reply}</div><div class="conversation-tools">${prev}${tools}<small class="page-count">${ps.length > 1 ? `${idx + 1} / ${ps.length}` : ''}</small></div></div></section>`;
    } else if (text) {
      const actions = !last ? b('next-page', '', 'Дальше ▸', true) : b('dismiss-speech', '', 'Продолжить исследование', true);
      dialog = `<section class="thought narration typing-host${FX?.reduceMotion ? '' : ' enter'}" aria-label="Повествование"><div class="kicker">${esc(who || 'Внутренний голос')}${ps.length > 1 ? ` · ${idx + 1} / ${ps.length}` : ''}</div>${tw(ps[idx], `s:${who}:${idx}:${ps[idx].slice(0, 40)}`, 'narrator')}<div class="after-type actions">${prev}${actions}</div></section>`;
    }
    lastNpc = state.activeNpc;
    const thoughtBox =
      !text && thought && !cinema && !state.ending
        ? `<section class="thought typing-host" aria-label="Мысль"><div class="kicker">Внутренний голос</div>${tw(thought, `t:${state.location}:${thought.slice(0, 40)}`, 'thought')}<div class="after-type">${b('hide-thought', '', 'Продолжить')}</div></section>`
        : '';
    const encounters = `${state.location === 'warehouse' && !state.combat.some((x) => x.startsWith('cargo:')) ? `<button type="button" class="btn exit danger" data-a="encounter" data-v="cargo"><span aria-hidden="true">⚠</span> Движение у контейнера</button>` : ''}${state.location === 'relay' && !state.combat.some((x) => x.startsWith('relay:')) ? `<button type="button" class="btn exit danger" data-a="encounter" data-v="relay"><span aria-hidden="true">⚠</span> Охрана ретранслятора</button>` : ''}`;
    const shipExits = onShip
      ? (state.ship === 'airlock' ? `<button type="button" class="btn exit port" data-a="panel" data-v="map"><span aria-hidden="true">⇲</span> Выйти в порт</button>` : '') +
        (D.shipOrder || [])
          .filter((id) => id !== state.ship)
          .map((id) => `<button type="button" class="btn exit" data-a="ship" data-v="${id}"><span aria-hidden="true">↗</span> ${esc(D.ship[id].name)}</button>`)
          .join('')
      : '';
    const scene = E.pendingScene ? E.pendingScene(state) : null;
    const sceneBtn = scene ? `<button type="button" class="btn exit crew-call" data-a="panel-scene" data-v="${esc(scene.id)}"><span aria-hidden="true">📡</span> Экипаж на связи</button>` : '';
    const exits =
      !text && !thoughtBox
        ? `<nav class="exits${onShip ? ' ship-exits' : ''}" aria-label="Переходы">${sceneBtn}${onShip ? shipExits : `<button type="button" class="btn exit" data-a="panel" data-v="map"><span aria-hidden="true">↗</span> Перемещение</button><button type="button" class="btn exit" data-a="move" data-v="office"><span aria-hidden="true">↗</span> На шаттл</button>${encounters}`}</nav>`
        : '';
    const placeName = interview ? 'Кабинет начальника порта' : onShip ? room.name : l.name;
    const kicker = `${onShip ? 'Шаттл · у причала' : 'Лунный арбитраж'} · ${E.period(state)}${state.sanction ? ' · Санкция Центра' : ''}`;
    const sceneKey = `${state.location}:${onShip ? state.ship : ''}:${interview}`;
    app.innerHTML = `<main class="game">${topBar()}<section class="scene${n ? ' scene-speaking' : ''}${onShip && room.crew ? ' has-crew' : ''}${sceneEnter(sceneKey)}" aria-label="${esc(placeName)}" style="--art:url('${abs(artFile)}')"><div class="pano"><div class="pano-track" style="--ratio:${ratio}"><div class="scene-art"></div>${companions}${!n && !text ? actors + objects : ''}</div></div><i class="pano-edge left" aria-hidden="true">‹</i><i class="pano-edge right" aria-hidden="true">›</i><canvas class="dust-fx" aria-hidden="true"></canvas><div class="bars top-only" aria-hidden="true"><i></i></div><header><div class="kicker">${esc(kicker)}</div><h1>${esc(placeName)}</h1>${!n ? `<div class="goal"><span>Цель</span>${esc(objective())}</div>` : ''}</header>${dialog}${thoughtBox}${exits}${cinema ? `<div class="cinema" style="--combat-art:url('${abs(`assets/combat-${cinemaArt}.webp`)}')"><div class="kicker">Хищный расчёт · Последствия</div><p>${esc(cinema)}</p>${b('cinema-done', '', 'Оценить последствия', true)}</div>` : ''}${state.ending ? endingMarkup() : ''}</section></main>`;
    if (FX) {
      FX.setupPano(app, sceneKey, focusX, Boolean(n), notify);
      FX.startDust(app);
      FX.startTyping(app);
      FX.sfx.ambient(state.ending ? 'ending' : interview ? 'interview' : state.location);
    }
    /* Переговоры экипажа открываются сами, когда сцена свободна от текста и окон */
    if (scene && !text && !thoughtBox && !cinema && !panel.open && sceneAsked !== scene.id) {
      sceneAsked = scene.id;
      setTimeout(() => {
        if (!panel.open && E.pendingScene(state)?.id === scene.id && !speech && !cinema) {
          FX?.sfx.open();
          FX?.haptic(true, [20, 40, 20]);
          open('scene', scene.id);
        }
      }, 650);
    }
  }
  /* Чтение собеседника: линзы пролога, пауза и «Уличить» */
  function readTools() {
    const r = D.reads?.[state.activeNpc];
    if (!r || !D.lenses || !state.talked.includes(r.topic)) return '';
    const npc = state.activeNpc;
    const lenses = entries(D.lenses)
      .map(([id, l]) => `<button type="button" class="btn lens lens-${id}${state.reads.includes(npc + ':' + id) ? ' on' : ''}" data-a="read" data-v="${id}" aria-pressed="${state.reads.includes(npc + ':' + id)}"><b aria-hidden="true">${l.icon}</b> ${esc(l.label)}</button>`)
      .join('');
    const pause = `<button type="button" class="btn lens lens-pause${state.reads.includes(npc + ':pause') ? ' on' : ''}" data-a="pause" data-v=""><b aria-hidden="true">…</b> Пауза</button>`;
    const hit = state.reads.includes(npc + ':' + r.lens);
    const caught = state.caught.includes(npc);
    const confront = hit ? `<button type="button" class="btn primary confront${caught ? ' done' : ''}" data-a="confront" data-v="">${caught ? '✓ ' : '⚑ '}${esc(r.confront.label)}</button>` : '';
    return `<div class="lens-row" role="group" aria-label="Чтение собеседника"><small class="lens-hint">${caught ? 'Уличён' : 'Прочитать'}</small>${lenses}${pause}</div>${confront}`;
  }
  /* Мини-игры перед находками */
  function gameFor(objectId) {
    return entries(D.games).find(([, g]) => g.object === objectId)?.[0] || null;
  }
  function gameBody(id) {
    const g = D.games[id];
    const skip = b('game-skip', id, 'Сделать без проверки · 20 минут');
    let body = '';
    if (id === 'scrub') {
      const i = gameVals.frame ?? 0;
      body = `<div class="g-screen"><div class="g-frame" id="g-frame">${esc(g.frames[i])}</div><div class="g-scan" aria-hidden="true"></div></div><input type="range" class="g-range" min="0" max="${g.frames.length - 1}" value="${i}" data-g="frame" aria-label="Перемотка записи">${b('game-check', id, 'Зафиксировать кадр', true)}`;
    } else if (id === 'thermal') {
      const shown = gameVals.shown || [];
      body = `<div class="g-receipt">${g.zones.map(([z, label, value]) => `<button type="button" class="g-zone${shown.includes(z) ? ' shown' : ''}" data-a="game-zone" data-v="${z}"><small>${esc(label)}</small><span>${shown.includes(z) ? esc(value) : '░░░░░░'}</span></button>`).join('')}</div>${shown.length >= 2 ? `<p class="construct-note">${esc(g.question)}</p><div class="actions">${g.zones.filter(([z]) => shown.includes(z)).map(([z, label]) => b('game-pick', z, label)).join('')}</div>` : '<p class="muted">Нажимайте на поля, чтобы прогреть бумагу.</p>'}`;
    } else if (id === 'overlay') {
      const sig = 'M10 60 C30 20 45 20 55 50 S80 80 95 40 S130 20 140 55 S170 70 190 35';
      body = `<svg class="g-sig" viewBox="0 0 200 90" aria-label="Наложение подписи"><path d="${sig}" class="base"/><path d="${sig}" class="moving" id="g-moving" transform="${sigTransform()}"/></svg>${g.sliders.map(([k, label]) => `<label class="g-label">${esc(label)}<input type="range" class="g-range" min="0" max="100" value="${gameVals[k] ?? 0}" data-g="${k}"></label>`).join('')}${b('game-check', id, 'Сверить слепок', true)}`;
    } else if (id === 'calib') {
      body = `<svg class="g-spectrum" viewBox="0 0 200 80" aria-label="Спектр образца"><line x1="${(g.target / 100) * 200}" y1="0" x2="${(g.target / 100) * 200}" y2="80" class="ref"/><path id="g-peak" class="peak" d="${peakPath(gameVals.peak ?? 15)}"/></svg><input type="range" class="g-range" min="0" max="100" value="${gameVals.peak ?? 15}" data-g="peak" aria-label="Настройка сканера">${b('game-check', id, 'Зафиксировать калибровку', true)}`;
    } else if (id === 'tumbler') {
      body = `<div class="g-dial"><i class="g-zone-ok"></i><i class="g-needle" id="g-needle"></i></div><div class="g-hits">${Array.from({ length: g.hits }, (_, i) => `<b class="${i < (gameVals.hits || 0) ? 'on' : ''}">◆</b>`).join('')}</div>${b('game-tap', id, 'Нажать в такт', true)}`;
    }
    return `<p>${esc(g.intro)}</p><div class="mini-game g-${id}">${body}</div><div class="actions">${skip}</div>`;
  }
  const peakPath = (x) => {
    const c = (x / 100) * 200;
    return `M0 75 L${c - 30} 72 Q${c - 10} 70 ${c} 8 Q${c + 10} 70 ${c + 30} 72 L200 75`;
  };
  function sigTransform() {
    const g = D.games?.overlay;
    if (!g) return '';
    const [[, , ts], [, , tt]] = g.sliders;
    const dx = ((gameVals.shift ?? 0) - ts) * 0.8,
      rot = ((gameVals.tilt ?? 0) - tt) * 0.4;
    return `translate(${dx} 0) rotate(${rot} 100 45)`;
  }
  let needleStart = 0,
    needleRaf = 0;
  const needlePos = (t) => {
    const ph = ((t - needleStart) % 2400) / 2400;
    return ph < 0.5 ? ph * 200 : (1 - ph) * 200;
  };
  function needleLoop() {
    cancelAnimationFrame(needleRaf);
    const el = panel.querySelector?.('#g-needle');
    if (!el || view !== 'game' || focus !== 'tumbler') return;
    el.style.left = needlePos(performance.now()) + '%';
    needleRaf = requestAnimationFrame(needleLoop);
  }
  function gameDone(id) {
    const g = D.games[id];
    if (!run('game', { id }, { showPassage: false })) return;
    if (g.puzzle) {
      open('puzzle', g.puzzle);
      return;
    }
    const o = D.locations[state.location]?.objects.find((x) => x.id === g.object);
    if (o?.evidence) {
      if (!state.evidence.includes(o.evidence) && !run('take', o.id)) return;
      run('inspect', o.evidence, { showPassage: false });
      open('material', o.evidence);
    } else close();
  }
  function endingMarkup() {
    const e = D.endings?.[state.ending] || { title: 'Заключение', text: 'Ваше решение передано в Центр.' };
    const ep = pages(state.endingPassage || e.text),
      i = Math.min(endingPage, ep.length - 1);
    return `<section class="ending"><div class="kicker">Дело LN-407 · Итог · ${i + 1} / ${ep.length}</div><h1>${esc(e.title)}</h1><p>${rich(ep[i])}</p><p class="muted">${state.evidence.length} материалов · ${state.conclusions.length} выводов · ${state.sanction ? 'санкция получена' : 'без специальной санкции'}. Решения и состояние дела сохранены.</p><div class="actions">${i > 0 ? b('ending-prev', '', '◂ Назад') : ''}${i < ep.length - 1 ? b('ending-next', '', 'Продолжить →', true) : ''}${b('panel', 'journal', 'Материалы')}${b('panel', 'system', 'Сохранения')}<a class="btn" href="../prologue/">Главное меню</a></div></section>`;
  }

  function workbench(p) {
    const w = p.interaction;
    if (!w) return `<div class="grid">${(p.options || []).map((o) => b('solve', o.id, o.label)).join('')}</div>`;
    let body = '';
    const stage = w.stages?.[workStage];
    if (w.kind === 'records') {
      body = `<div class="workbench-columns">${(w.columns || []).map((col, side) => `<div class="source-sheet"><h3>${esc(col.title)}</h3>${col.fields.map((f) => `<button class="${selection.includes(f.id) ? 'selected' : ''}" data-a="work-field" data-v="${esc(f.id)}" aria-pressed="${selection.includes(f.id)}" data-side="${side}"><small>${esc(f.label)}</small><div>${esc(f.value)}</div></button>`).join('')}</div>`).join('')}</div><p class="construct-note">${esc(stage?.prompt || w.instruction || 'Отметьте связанное поле в каждом документе: какое расхождение требует объяснения?')}</p>`;
    } else if (w.kind === 'bio') {
      body = `<div class="lab-table-wrap"><table class="lab-table"><thead><tr><th>Показатель</th><th>Контроль</th><th>Образец</th><th>Сопоставить</th></tr></thead><tbody>${(w.rows || []).map((r) => `<tr><td>${esc(r.label)}</td><td>${esc(r.control)}</td><td>${esc(r.sample)}</td><td><button class="${selection.includes(r.id) ? 'selected' : ''}" data-a="work-single" data-v="${esc(r.id)}" aria-pressed="${selection.includes(r.id)}">${selection.includes(r.id) ? '◆ Выбрано' : '◇ Выбрать'}</button></td></tr>`).join('')}</tbody></table></div><p class="construct-note">${esc(w.instruction || p.prompt)}</p>`;
    } else {
      const tiles = w.tiles || [];
      body = `${w.kind === 'signal' ? '<svg class="instrument" viewBox="0 0 600 110" aria-label="Повреждённая запись, восстановление по контрольным меткам"><polyline points="0,55 20,55 25,25 32,85 40,55 80,55 90,40 98,70 105,55 160,55 170,15 183,95 195,55 230,55 250,25 270,85 280,55 330,55 340,25 350,85 360,55 420,55 430,10 445,100 460,55 600,55"/></svg>' : ''}<div class="slot-row">${Array.from({ length: w.correct.length }, (_, i) => `<div class="wb-slot"><small>${i + 1}</small>${selection[i] ? esc(tiles.find((x) => x.id === selection[i])?.label) : 'Пустой слот'}</div>`).join('')}</div><div class="grid">${tiles.map((t) => `<button class="${w.kind === 'signal' ? 'packet' : 'event-tile'} ${selection.includes(t.id) ? 'selected' : ''}" data-a="work-tile" data-v="${esc(t.id)}" aria-pressed="${selection.includes(t.id)}"${selection.includes(t.id) ? ' disabled' : ''}><small>${esc(t.meta || 'Фрагмент')}</small><span>${esc(t.label)}</span></button>`).join('')}</div><p class="construct-note">${w.kind === 'signal' ? 'Соберите цепь по совпадающим контрольным меткам. Выход одного пакета должен совпадать со входом следующего.' : 'Восстановите порядок событий по отметкам независимых источников. Нажимайте на события в нужной последовательности.'}</p>`;
    }
    return `<div class="workbench">${body}<div class="actions">${b('work-submit', '', stage ? `Проверить этап ${workStage + 1} / ${w.stages.length}` : 'Проверить собранный результат', true)}${['timeline', 'signal'].includes(w.kind) ? b('work-undo', '', 'Убрать последний') : ''}${b('work-reset', '', 'Очистить выбор')}</div></div>`;
  }
  function panelShell(title, body) {
    panel.innerHTML = `<div class="panel-top"><div class="panel-grip" aria-hidden="true"></div><header class="panel-head"><h2 id="panel-title">${esc(title)}</h2><button type="button" class="icon-btn" data-a="close" data-v="" aria-label="Закрыть">${ico('close') || '✕'}</button></header><div id="panel-feedback" role="status"></div></div><div class="panel-body">${body}</div>`;
  }
  function materialLabel(id) {
    return D.evidence[id]?.title || D.conclusions[id]?.title || id;
  }
  function evidenceChoices(ids) {
    return `<div class="evidence-list">${ids.map((id) => `<button class="evidence-choice ${selection.includes(id) ? 'selected' : ''}" data-a="select-evidence" data-v="${esc(id)}" aria-pressed="${selection.includes(id)}">${selection.includes(id) ? '◆' : '◇'} ${esc(materialLabel(id))}</button>`).join('')}</div>`;
  }
  function paintPanel() {
    let title = '',
      body = '';
    switch (view) {
      case 'map': {
        title = 'Лунный порт · Известные адреса';
        const pins = {
          port: [65, 59],
          waiting: [49, 45],
          registry: [83, 39],
          clinic: [16, 35],
          warehouse: [19, 73],
          archive: [29, 17],
          relay: [78, 16],
          office: [85, 76],
        };
        body = `<p class="muted">Новые адреса появляются после обнаружения связанного с ними материала. Выберите подсвеченное место; переход расходует игровое время.</p><div class="illustrated-map" aria-label="Иллюстрированная карта станции">${entries(
          D.locations,
        )
          .filter(([id]) => E.unlocked(state).includes(id))
          .map(
            ([id, l]) =>
              `<button class="map-pin ${id === state.location ? 'here' : ''}" style="--x:${pins[id]?.[0] || 50}%;--y:${pins[id]?.[1] || 50}%" data-a="move" data-v="${id}" aria-label="${esc(l.name)}${id === state.location ? ' — вы здесь' : ''}"><b>${id === state.location ? '◆' : '◇'}</b><span>${esc(l.name.startsWith('Шаттл') ? 'Шаттл' : l.name)}</span></button>`,
          )
          .join(
            '',
          )}</div><div class="map-caption"><span>РЕГИОН ЛУННОГО АРБИТРАЖА</span><small>${E.unlocked(state).length} известных мест · ${esc(D.locations[state.location].name)}</small></div>`;
        break;
      }
      case 'inventory':
        title = 'Предметы и образцы';
        body = `<p class="muted">Осмотр предмета фиксирует детали отдельно от показаний. Документы и свидетельства находятся в деле.</p><div class="grid">${
          state.evidence
            .filter((id) => ['item', 'physical', 'sample', 'предмет', 'образец', 'документ'].includes(D.evidence[id]?.type))
            .map(
              (id) =>
                `<button class="card inventory-card" data-a="material" data-v="${id}"><img class="item-thumb" src="assets/detail-${esc(D.evidence[id].detail || 'manifest')}.webp" alt="${esc(materialLabel(id))}"><h3>${esc(materialLabel(id))}</h3><small>${esc(D.evidence[id].type)}</small><span>Осмотреть →</span></button>`,
            )
            .join('') || '<p>Пока нет предметов. Осмотрите интерактивные детали локации.</p>'
        }</div>`;
        break;
      case 'journal':
        title = 'Материалы расследования';
        body = `<div class="journal-tabs">${b('journal-tab', 'all', 'Все материалы')}${b('journal-tab', 'facts', 'Выводы')}${b('journal-tab', 'lore', 'Термины мира')}</div>`;
        if (focus === 'lore')
          body += `<div class="grid">${entries(D.glossary)
            .map(([term, explanation]) => `<article class="card"><h3>${esc(term)}</h3><p>${esc(explanation)}</p></article>`)
            .join('')}</div>`;
        else if (focus === 'facts')
          body += `<div class="grid">${state.conclusions.map((id) => `<article class="card"><span class="kicker">Подтверждённый вывод</span><h3>${esc(D.conclusions[id]?.title)}</h3><p>${esc(D.conclusions[id]?.thought || D.conclusions[id]?.text)}</p></article>`).join('') || '<p>Пока нет подтверждённых выводов.</p>'}</div>`;
        else
          body += `<div class="grid">${state.evidence.map((id) => `<button class="card" data-a="material" data-v="${id}"><small>${esc(D.evidence[id]?.type || 'Материал')} · ${esc(D.evidence[id]?.source)}</small><h3>${esc(materialLabel(id))}</h3><span>${state.inspected.includes(id) ? 'Изучено' : 'Изучить →'}</span></button>`).join('') || '<p>Материалов пока нет. Начните с осмотра порта и разговора с курьером.</p>'}</div>`;
        break;
      case 'lore':
        title = focus;
        body = `<p>${esc(D.glossary[focus] || 'Объяснение пока не добавлено.')}</p><div class="actions">${b('lore-back', '', 'Вернуться к чтению')}${b('journal-tab', 'lore', 'Все термины')}</div>`;
        break;
      case 'material': {
        const e = D.evidence[focus];
        title = e?.title || 'Материал';
        if (!e) break;
        const ps = pages(e.text),
          i = Math.min(page, ps.length - 1);
        const artId =
          e.detail ||
          (/sample|bio|blood/.test(focus)
            ? 'sample'
            : /record|signal|audio/.test(focus)
              ? 'recorder'
              : /key|seal/.test(focus)
                ? 'key'
                : 'manifest');
        body = `<div class="detail-layout"><img class="item-art" src="assets/detail-${esc(artId)}.webp" alt="${esc(title)}"><div><div class="kicker">${esc(e.type)} · ${esc(e.source)}</div><p class="document">${rich(ps[i])}</p><div class="actions">${i > 0 ? b('material-prev', '', '←') : ''}${i < ps.length - 1 ? b('material-next', '', 'Следующая страница →') : ''}<small>${i + 1} / ${ps.length}</small></div><p><em>${esc(e.thought || 'Прежде чем считать это фактом, нужно проверить независимый источник.')}</em></p></div></div>${b('panel', 'journal', 'Все материалы')}`;
        break;
      }
      case 'deductions':
        title = 'Рабочий стол · Карта версий';
        if (focus && D.conclusions[focus]) {
          body = `<h3>${esc(D.conclusions[focus].title)}</h3><p>Выберите независимые материалы, которые вместе обосновывают эту версию. Показания сами по себе не заменяют проверку.</p>${evidenceChoices(state.evidence)}<div class="actions">${b('submit-deduction', focus, 'Проверить обоснование', true)}${b('panel', 'deductions', 'Другие версии')}</div>`;
        } else
          body = `<p>Здесь гипотеза становится выводом только после сопоставления подходящих материалов. Неподтверждённая версия не открывает итог дела.</p><div class="grid">${entries(
            D.conclusions,
          )
            .map(
              ([id, c]) =>
                `<article class="card"><span class="kicker">${state.conclusions.includes(id) ? 'Подтверждено' : 'Гипотеза'}</span><h3>${esc(c.title)}</h3>${state.conclusions.includes(id) ? `<p>${esc(c.thought || c.text)}</p>` : b('deduction', id, 'Сопоставить материалы')}</article>`,
            )
            .join('')}</div>`;
        break;
      case 'crew': {
        title = 'Оперативная группа';
        const team = E.teamOf ? E.teamOf(state) : [];
        const onShip = state.location === 'office';
        const roomName = (id) => D.ship?.[E.crewRoom?.[id]]?.name || 'Шаттл';
        const notes = {
          mara: 'В порту важен порядок открывания створок. Официальный маршрут бывает красивее настоящего.',
          corvin: 'Совпадение образца ещё не диагноз. Сопоставьте контроль и наблюдение.',
          irena: 'Установит происхождение административного ключа, если дать ей проверенный след.',
          rein: 'Может прикрыть свидетеля или удержать выход. Обе задачи сразу не обещает.',
        };
        const cards = crewIds
          .map((id) => {
            const with_ = !onShip && team.includes(id);
            const post = with_ ? crewPlaced().find((c) => c.id === id) : null;
            const where = onShip ? `на борту · ${roomName(id)}` : with_ ? (post ? `здесь · ${post.note}` : 'в порту · на связи') : `на шаттле · ${roomName(id)}`;
            const mood = moodOf(id);
            const own = (D.npcs[id]?.topics || []).filter((t) => t.personal);
            const ownOpen = E.availableTopics(state, id).filter((t) => t.personal && !state.talked.includes(t.id)).length;
            const ownDone = own.filter((t) => state.talked.includes(t.id)).length;
            const extra =
              id === 'irena'
                ? b('assign', 'trace', state.task?.done ? 'Сверка завершена' : state.task ? 'Поручение выполняется' : 'Поручить поиск источника ключа', !state.task, !!state.task || !onShip)
                : id === 'corvin'
                  ? b('panel', 'puzzles', 'Экспертизы', false, !onShip)
                  : id === 'rein'
                    ? b('wait', '', 'Подождать 10 минут')
                    : b('panel', 'map', 'Карта порта');
            return `<article class="card crew-card"><img class="crew-thumb" src="${abs(`../prologue/assets/crew-${id}.webp`)}" alt=""><div><h3>${esc(D.npcs[id].name)}</h3><small>${esc(D.npcs[id].role)} · ${esc(where)}</small>${mood ? `<span class="mood mood-${mood.cls}">${esc(mood.label)}</span>` : ''}${own.length ? `<span class="own-count${ownOpen ? ' fresh' : ''}">♦ Личное ${ownDone}/${own.length}${ownOpen ? ' · хочет поговорить' : ''}</span>` : ''}<p>${esc(notes[id])}</p><div class="actions">${b('crew-talk', id, 'Поговорить', false, !E.available(state, id))}${extra}</div></div></article>`;
          })
          .join('');
        body = `<p class="muted">${onShip ? 'Экипаж на борту, каждый в своём отсеке. Состав группы для выхода в порт меняют у стойки в шлюзе.' : `С вами в порту: ${team.map((id) => shortName[id]).join(' и ')}. Остальные ждут на шаттле: чтобы поговорить с ними или провести экспертизу, вернитесь на борт.`}</p><div class="crew-list">${cards}</div>${onShip ? `<div class="actions">${b('panel', 'team', 'Выбрать, кто идёт в порт')}</div>` : ''}${state.task ? `<p class="counter">${state.task.done ? 'Ирена завершила поручение; результат в деле.' : 'Ирена занята поручением. Продолжайте расследование.'}</p>` : ''}`;
        break;
      }
      case 'team': {
        title = 'Кто идёт в порт';
        if (!teamPick) teamPick = [...(E.teamOf ? E.teamOf(state) : [])];
        body = `<p>Двое из экипажа идут с вами: их можно спросить прямо на месте, они замечают своё. Остальные остаются на шаттле.</p><div class="team-grid">${crewIds
          .map(
            (id) =>
              `<button type="button" class="team-card${teamPick.includes(id) ? ' on' : ''}" data-a="team-toggle" data-v="${id}" aria-pressed="${teamPick.includes(id)}"><img class="crew-thumb" src="${abs(`../prologue/assets/crew-${id}.webp`)}" alt=""><b>${esc(D.npcs[id].name)}</b><small>${esc(D.npcs[id].role)}</small></button>`,
          )
          .join('')}</div><div class="actions">${b('team-confirm', '', 'Утвердить состав', true, teamPick.length !== 2)}</div>`;
        break;
      }
      case 'scene': {
        const sc = (D.scenes || []).find((x) => x.id === focus);
        title = sc ? 'Канал экипажа · ' + sc.title : 'Канал экипажа';
        if (!sc) break;
        const chosen = state.scenes?.[sc.id];
        const pre = sc.setupPrior?.[state.prior?.center || 'none'] || '';
        const avatar = (id) => `<img class="avatar" src="${abs(`../prologue/assets/crew-${id}.webp`)}" alt="">`;
        body = `<p>${esc(sc.setup)}${pre ? ' ' + esc(pre) : ''}</p><div class="argue-lines${chosen ? ' done' : ''}">${sc.lines.map(([id, t], i) => `<div class="argue-line ${i % 2 ? 'right' : 'left'}" style="--i:${i}">${avatar(id)}<div><strong>${esc(shortName[id])}</strong><p>${esc(t)}</p></div></div>`).join('')}</div>${
          chosen
            ? `<article class="card scene-after"><span class="kicker">Решение: ${esc(sc.options[chosen]?.label)}</span><p>${esc(sc.options[chosen]?.after)}</p></article><div class="actions">${b('close', '', 'Вернуться к делу', true)}</div>`
            : `<div class="reply-choices">${entries(sc.options).map(([id, o]) => `<button type="button" class="btn reply-choice" data-a="scene-choose" data-v="${esc(id)}"><strong>${esc(o.label)}</strong><span>${esc(o.note)}</span></button>`).join('')}</div>`
        }`;
        break;
      }
      case 'game': {
        const g = D.games?.[focus];
        title = g?.title || 'Проверка';
        if (g) body = gameBody(focus);
        break;
      }
      case 'diary': {
        title = 'Дневник командира';
        const sum = P && state.prior ? P.summary(state.prior) : '';
        const decided = (D.scenes || []).filter((sc) => state.scenes?.[sc.id]);
        const personal = crewIds.flatMap((id) => (D.npcs[id]?.topics || []).filter((t) => t.personal && state.talked.includes(t.id)).map((t) => [id, t]));
        const notes = [
          ...decided.map((sc) => `<article class="card"><span class="kicker">Канал экипажа · ${esc(sc.title)}</span><h3>${esc(sc.options[state.scenes[sc.id]]?.label)}</h3><p>${esc(sc.options[state.scenes[sc.id]]?.after)}</p></article>`),
          ...personal.map(([id, t]) => `<article class="card"><span class="kicker">Личное · ${esc(shortName[id])}</span><h3>${esc(t.label)}</h3></article>`),
        ].join('');
        body = `<p class="document">${esc(sum || 'Ночь на шаттле: приказ Центра, экипаж Даля, первые следы Узла-9. Утром порт откроет реестры.')}</p>${notes ? `<h3>Записи главы I</h3><div class="grid">${notes}</div>` : ''}<p class="muted">Записи пролога. Изменить предысторию можно в меню.</p><div class="actions"><a class="btn" href="../prologue/">Перечитать пролог</a></div>`;
        break;
      }
      case 'terminal':
        title = 'Центр · Оперативное согласование';
        body = `<p>Запрос на принудительное изъятие реестра и допрос руководителя порта. Представьте проверяемые основания и связь с юрисдикцией. Полученная санкция ограничена этой операцией.</p>${state.sanction ? '<article class="card"><h3>Специальная санкция получена</h3><p>Разрешены изъятие административного ключа и официальный допрос. Мера не разрешает внеслужебное насилие.</p></article>' : `${evidenceChoices(state.evidence)}${b('submit-sanction', '', 'Отправить выбранное обоснование', true)}`}<h3>Официальный допрос</h3><p>Убедитесь, что знаете противоречие и можете подтвердить слова независимым материалом. Давление способно породить удобную ложь.</p><div class="actions">${b('interview', 'rapport', 'Дать защиту и выслушать')}${b('interview', 'evidence', 'Предъявить противоречие')}${b('interview', 'pressure', 'Пригрозить последствиями')}</div><h3>Заключение по делу</h3><p>Доступность итогового решения определяется качеством расследования и сохранёнными людьми и материалами.</p><div class="actions">${entries(
          D.endings,
        )
          .map(([id, e]) => b('finish', id, e.title, false, !E.endReady(state, id)))
          .join('')}</div>`;
        break;
      case 'puzzles':
        title = 'Криминалистическая лаборатория';
        body = `<p>Каждая экспертиза проверяет конкретную версию. Без исходных материалов её нельзя провести.</p><div class="grid">${entries(
          D.puzzles,
        )
          .map(
            ([id, p]) =>
              `<article class="card"><span class="kicker">${state.puzzles.includes(id) ? 'Завершено' : 'Экспертиза'}</span><h3>${esc(p.title)}</h3><p>${esc(p.intro)}</p>${b('puzzle', id, 'Открыть исследование')}</article>`,
          )
          .join('')}</div>`;
        break;
      case 'puzzle': {
        const p = D.puzzles[focus];
        title = p?.title || 'Экспертиза';
        if (!p) {
          body = '<p>Сначала выберите доступное исследование.</p>';
          break;
        }
        const calib = Object.entries(D.games || {}).find(([, g]) => g.puzzle === focus)?.[0];
        if (calib && !state.games.includes(calib) && !state.puzzles.includes(focus) && E.has(state, p.requires || [])) {
          title = D.games[calib].title;
          focus = calib;
          view = 'game';
          gameVals = {};
          body = gameBody(calib);
          break;
        }
        body = `<p>${esc(p.intro)}</p><article class="card"><h3>${esc(p.prompt)}</h3><p class="muted">${(p.requires || []).map(materialLabel).join(' · ')}</p></article>${workbench(p)}${state.puzzles.includes(focus) ? '<p class="counter">Результат записан в материалы дела.</p>' : ''}<div class="actions">${b('hint', focus, 'Попросить методическую подсказку')}${state.failed[focus] ? b('prepare', focus, 'Повторный отбор · 20 минут') : ''}</div>`;
        break;
      }
      case 'encounter':
        title = 'Хищный расчёт';
        body = `<img class="encounter-art" src="assets/combat-${focus}.webp" alt="Обстановка перед столкновением"><div class="kicker">${focus === 'cargo' ? 'Грузовой терминал' : 'Ретранслятор'}</div><p>${focus === 'cargo' ? 'У контейнера вооружённый надсмотрщик. Рядом свидетель и открытый носитель; движение к одному оставит другого без защиты. Мощь позволит быстро сблизиться, но не оказаться в двух местах.' : 'У ретранслятора подготовленный боец. Линия огня перекрывает доступ к накопителю. Рейн может удержать выход, если успеет получить ваше указание.'}</p><p>Приоритет определит последствия. Разведка и поддержка меняют исход, гарантированного правильного решения нет.</p><div class="grid">${b('tactic', 'protect', 'Прикрыть свидетеля')}${b('tactic', 'evidence', 'Сохранить носитель')}${b('tactic', 'coordinate', (E.teamOf ? E.teamOf(state) : []).includes('rein') ? 'Скоординироваться с Рейном' : 'Вызвать Рейна по связи')}${b('tactic', 'force', 'Немедленно обезвредить')}${b('tactic', 'withdraw', 'Отойти и сохранить группу')}</div>`;
        break;
      case 'system':
        title = 'Меню';
        body = `<div class="menu-list">${b('close', '', 'Продолжить игру', true)}${b('save', '', 'Сохранить вручную')}${b('load', '', 'Загрузить ручное сохранение')}${b('panel', 'puzzles', 'Лаборатория')}${b('journal-tab', 'lore', 'Термины мира')}<a href="?prequel=1" class="btn">Изменить предысторию</a>${b('new-confirm', '', 'Начать главу заново')}<a href="../prologue/" class="btn">Главное меню · Пролог</a></div>${FX ? '<h3>Настройки</h3>' + FX.settingsBody() : ''}<small class="muted">Прогресс сохраняется автоматически после каждого действия. Настройки общие с прологом.</small>`;
        break;
      case 'dismiss-confirm':
        title = 'Закрыть дело без доказанного обвинения?';
        body = `<p>Расследование будет завершено как нераскрытое. Сохраните игру вручную, если хотите вернуться к материалам позже.</p>${b('dismiss-confirm', '', 'Закрыть дело', true)}`;
        break;
      case 'new-confirm':
        title = 'Начать новое расследование?';
        body = `<p>Автосохранение текущего дела будет заменено. Ручное сохранение останется.</p>${b('restart', '', 'Начать заново', true)}`;
        break;
      default:
        title = 'Материалы';
        body = '<p>Продолжайте исследование локации.</p>';
    }
    panelShell(title, body);
    if (view === 'game' && focus === 'tumbler' && typeof requestAnimationFrame === 'function') {
      needleStart = performance.now();
      needleLoop();
    }
  }
  function run(a, v, opts = {}) {
    const previous = state;
    let result;
    try {
      result = E.dispatch(state, a, v);
    } catch (err) {
      console.error(err);
      notify('Действие не завершено. Сохранение сохранено; выберите другой путь.');
      return;
    }
    if (!result?.ok) {
      FX?.sfx.fail();
      FX?.haptic(true, [120]);
      notify(result?.message || 'Сейчас это действие недоступно.');
      return false;
    }
    state = result.state;
    save();
    if (FX) {
      const grew = (k) => (state[k] || []).length > (previous[k] || []).length;
      const failedNow = Object.keys(state.failed || {}).some((k) => state.failed[k] && !previous.failed?.[k]);
      if (failedNow || (a === 'sanction' && !state.sanction)) {
        FX.sfx.fail();
        FX.haptic(true, [120]);
      } else if (grew('conclusions') || grew('puzzles') || (a === 'sanction' && state.sanction && !previous.sanction)) {
        FX.sfx.open();
        FX.haptic(true, [30, 40, 30]);
      } else if (grew('evidence')) {
        FX.sfx.click(true);
        FX.haptic(true, 30);
      } else if (a === 'move') FX.sfx.swish();
    }
    if (a === 'move') {
      thought = D.locations[state.location]?.thought || '';
      speech = '';
      page = 0;
      topicPage = 0;
    }
    if (a === 'talk' || a === 'topic') {
      speech = '';
      page = 0;
    }
    if (a === 'finish') endingPage = 0;
    if (result.passage && opts.showPassage !== false && a !== 'move' && a !== 'finish') {
      speech = result.passage;
      speaker = a === 'topic' ? D.npcs[state.activeNpc]?.name : 'Внутренний голос';
      page = 0;
    }
    if (opts.close) close();
    render();
    if (panel.open) paintPanel();
    const newly = E.unlocked(state).filter((id) => !E.unlocked(previous).includes(id));
    const update = newly.length ? ' Открыт адрес: ' + newly.map((id) => D.locations[id].name).join(', ') + '.' : '';
    if (result.message || update) notify((result.message || '') + update);
    return true;
  }
  document.addEventListener('click', (ev) => {
    if (FX) {
      FX.sfx.wake();
      if (FX.isTyping() && ev.target.closest('.typing-host')) {
        FX.completeTyping();
        return;
      }
    }
    const el = ev.target.closest('[data-a]');
    if (!el) return;
    const a = el.dataset.a,
      v = el.dataset.v;
    if (FX) {
      if (FX.applySetting(a, v)) {
        paintPanel();
        return;
      }
      if (a !== 'close') FX.sfx.click(false);
    }
    switch (a) {
      case 'ending-next':
        endingPage++;
        render();
        break;
      case 'ending-prev':
        endingPage = Math.max(0, endingPage - 1);
        render();
        break;
      case 'lore':
        loreReturn = { view, focus, page, selection: [...selection] };
        open('lore', v);
        break;
      case 'lore-back':
        if (loreReturn?.view) {
          ({ view, focus, page, selection } = loreReturn);
          paintPanel();
        } else close();
        break;
      case 'panel':
        open(v);
        break;
      case 'close':
        close();
        break;
      case 'hide-thought':
        thought = '';
        render();
        break;
      case 'next-page':
        page++;
        render();
        break;
      case 'prev-page':
        page = Math.max(0, page - 1);
        render();
        break;
      case 'dismiss-speech':
        speech = '';
        /* После наблюдения возвращаемся к концу ответа, где выбор вопросов и линзы */
        page = state.activeNpc && state.topic ? 1e9 : 0;
        render();
        break;
      case 'topics':
        topicPage = (topicPage + 1) % Math.ceil((D.npcs[state.activeNpc]?.topics || []).filter((t) => ready(t.requires)).length / 4);
        render();
        break;
      case 'leave-talk':
        speech = '';
        run('end-talk');
        break;
      case 'crew-talk':
        if (!E.available(state, v)) {
          notify(`${shortName[v] || 'Член экипажа'} на шаттле. Вернитесь на борт, чтобы поговорить.`);
          break;
        }
        close();
        thought = '';
        topicPage = 0;
        if (state.location === 'office' && E.crewRoom?.[v] && state.ship !== E.crewRoom[v]) run('ship', E.crewRoom[v]);
        run('talk', v, { showPassage: false });
        break;
      case 'ship':
        thought = '';
        speech = '';
        run('ship', v);
        break;
      case 'ship-spot': {
        const spot = D.ship?.[state.ship]?.spots.find((x) => x[0] === v);
        if (spot) open(spot[4]);
        break;
      }
      case 'panel-scene':
        open('scene', v);
        break;
      case 'scene-choose':
        if (run('scene', { id: focus, option: v }, { showPassage: false })) {
          paintPanel();
          const body = panel.querySelector?.('.panel-body');
          if (body?.scrollTo) body.scrollTo({ top: body.scrollHeight, behavior: FX?.reduceMotion ? 'auto' : 'smooth' });
        }
        break;
      case 'read':
      case 'pause':
      case 'confront': {
        if (!run(a, v, { showPassage: false })) break;
        const rd = D.reads[state.activeNpc];
        speech = a === 'read' ? rd.tells[v] : a === 'pause' ? rd.pause : rd.confront.text;
        speaker = a === 'read' ? `${D.lenses[v].icon} ${D.lenses[v].label}` : a === 'pause' ? 'Пауза' : '';
        if (a === 'confront') speaker = D.npcs[state.activeNpc]?.name;
        page = 0;
        render();
        break;
      }
      case 'game-check': {
        const g = D.games[v];
        let okk = false;
        if (v === 'scrub') okk = Number(gameVals.frame ?? 0) === g.answer;
        if (v === 'overlay') okk = g.sliders.every(([k, , t]) => Math.abs((gameVals[k] ?? 0) - t) <= g.tolerance);
        if (v === 'calib') okk = Math.abs((gameVals.peak ?? 15) - g.target) <= g.tolerance;
        if (okk) gameDone(v);
        else {
          FX?.sfx.fail();
          FX?.haptic(true, [80]);
          notify(v === 'scrub' ? 'В этом кадре носилок нет. Перематывайте дальше.' : v === 'overlay' ? 'Края пока не сходятся. Двигайте оба регулятора.' : 'Пик не лёг на опорную линию.');
        }
        break;
      }
      case 'game-zone':
        gameVals.shown = [...new Set([...(gameVals.shown || []), v])];
        FX?.sfx.click(false);
        paintPanel();
        break;
      case 'game-pick':
        if (v === D.games.thermal.answer) gameDone('thermal');
        else {
          FX?.sfx.fail();
          notify('Это поле не проверяет время. Что именно утверждала Мира?');
        }
        break;
      case 'game-tap': {
        const g = D.games.tumbler;
        const pos = needlePos(performance.now());
        if (pos >= 36 && pos <= 64) {
          gameVals.hits = (gameVals.hits || 0) + 1;
          FX?.sfx.click(true);
          FX?.haptic(true, 25);
        } else {
          gameVals.hits = 0;
          FX?.sfx.fail();
          FX?.haptic(true, [90]);
          notify('Мимо такта. Счёт сброшен.');
        }
        if (gameVals.hits >= g.hits) gameDone('tumbler');
        else {
          const hits = panel.querySelector?.('.g-hits');
          if (hits) hits.innerHTML = Array.from({ length: g.hits }, (_, i) => `<b class="${i < gameVals.hits ? 'on' : ''}">◆</b>`).join('');
        }
        break;
      }
      case 'game-skip':
        if (D.games[v]) {
          if (!run('game', { id: v, skip: true }, { showPassage: false })) break;
          gameDone(v);
        }
        break;
      case 'team-toggle':
        teamPick = teamPick.includes(v) ? teamPick.filter((x) => x !== v) : [...teamPick, v].slice(-2);
        paintPanel();
        break;
      case 'team-confirm':
        if (run('team', teamPick)) {
          teamPick = null;
          close();
        }
        break;
      case 'talk':
        thought = '';
        topicPage = 0;
        run('talk', v, { showPassage: false });
        break;
      case 'topic':
        run('topic', v, { showPassage: false });
        break;
      case 'move':
        run('move', v, { close: true });
        break;
      case 'object': {
        const o = D.locations[state.location].objects.find((x) => x.id === v);
        const gid = D.games ? gameFor(v) : null;
        if (o?.evidence && gid && !state.games.includes(gid) && !state.evidence.includes(o.evidence)) {
          if (!E.has(state, o.requires || [])) {
            run('take', v);
            break;
          }
          open('game', gid);
          break;
        }
        if (o?.evidence) {
          if (!state.evidence.includes(o.evidence) && !run('take', v)) break;
          run('inspect', o.evidence, { showPassage: false });
          open('material', o.evidence);
        } else if (o?.puzzle) open('puzzle', o.puzzle);
        else if (/desk|deduc/.test(v)) open('deductions');
        else if (/terminal|center/.test(v)) open('terminal');
        else if (/lab|scan/.test(v)) open('puzzles');
        else {
          speech = o?.text || 'Осматриваю деталь. Следует проверить её по материалам дела, прежде чем строить версию.';
          speaker = 'Внутренний голос';
          page = 0;
          render();
        }
        break;
      }
      case 'material':
        run('inspect', v, { showPassage: false });
        open('material', v);
        break;
      case 'material-next':
        page++;
        paintPanel();
        break;
      case 'material-prev':
        page = Math.max(0, page - 1);
        paintPanel();
        break;
      case 'journal-tab':
        view = 'journal';
        focus = v;
        paintPanel();
        break;
      case 'deduction':
        open('deductions', v);
        break;
      case 'select-evidence':
        selection = selection.includes(v) ? selection.filter((x) => x !== v) : [...selection, v];
        paintPanel();
        break;
      case 'submit-deduction':
        run('deduce', { id: v, evidence: selection }, { close: true });
        break;
      case 'submit-sanction':
        run('sanction', selection, { close: true });
        break;
      case 'puzzle':
        open('puzzle', v);
        break;
      case 'solve':
        run('solve', { id: focus, answer: v }, { close: true });
        break;
      case 'work-tile': {
        const limit = D.puzzles[focus]?.interaction.correct.length || 0;
        if (!selection.includes(v) && selection.length < limit) selection.push(v);
        else if (selection.length >= limit) notify('Все слоты заполнены. Уберите последний фрагмент или очистите сборку.');
        paintPanel();
        break;
      }
      case 'work-single': {
        const limit = D.puzzles[focus]?.interaction.correct.length || 1;
        if (selection.includes(v)) selection = selection.filter((x) => x !== v);
        else if (selection.length < limit) selection.push(v);
        else {
          notify('Снимите одну отметку, чтобы выбрать другой показатель.');
          break;
        }
        paintPanel();
        break;
      }
      case 'work-field': {
        const w = D.puzzles[focus]?.interaction;
        const side = Number(el.dataset.side);
        const ids = w.columns[side].fields.map((f) => f.id);
        selection = selection.filter((id) => !ids.includes(id));
        selection.push(v);
        paintPanel();
        break;
      }
      case 'work-undo':
        selection.pop();
        paintPanel();
        break;
      case 'work-reset':
        selection = [];
        paintPanel();
        break;
      case 'work-submit': {
        const p = D.puzzles[focus],
          w = p.interaction;
        const stage = w.stages?.[workStage];
        const correct = stage?.correct || w.correct || [];
        if (selection.length !== correct.length) {
          notify('Сначала заполните все позиции исследования.');
          break;
        }
        const ordered = ['timeline', 'signal'].includes(w.kind);
        const valid =
          selection.length === correct.length &&
          (ordered ? correct.every((id, i) => id === selection[i]) : correct.every((id) => selection.includes(id)));
        if (valid && w.stages && workStage < w.stages.length - 1) {
          workStage++;
          selection = [];
          paintPanel();
          notify('Идентичность источников установлена. Теперь проверьте смысл подмены.');
          break;
        }
        const answer = valid ? p.answer : p.options.find((o) => o.id !== p.answer)?.id;
        run('solve', { id: focus, answer }, { close: true });
        break;
      }
      case 'prepare':
        run('prepare', v, { showPassage: false });
        break;
      case 'hint':
        notify(D.puzzles[v]?.hint || 'Сопоставьте исходные материалы; ответ должен объяснять все наблюдения.');
        break;
      case 'encounter':
        open('encounter', v);
        break;
      case 'tactic': {
        const id = focus;
        const r = E.dispatch(state, 'combat', { id, plan: v });
        if (!r.ok) {
          notify(r.message);
          break;
        }
        state = r.state;
        save();
        cinemaArt = id;
        cinema = r.passage || r.message || 'Расчёт превращается в движение. Когда шум стихает, остаются последствия выбранного приоритета.';
        close();
        render();
        FX?.sfx.shot();
        FX?.haptic(true, [80, 60, 120]);
        FX?.shake();
        break;
      }
      case 'cinema-done':
        cinema = '';
        render();
        break;
      case 'finish':
        if (v === 'dismiss') {
          view = 'dismiss-confirm';
          paintPanel();
        } else run('finish', v, { close: true });
        break;
      case 'dismiss-confirm':
        run('finish', 'dismiss', { close: true });
        break;
      case 'assign':
        run('assign', v, { showPassage: false });
        break;
      case 'wait':
        run('wait', null, { showPassage: false });
        break;
      case 'interview':
        if (run('interview', v, { close: true })) {
          speaker = 'Служебный допрос';
          render();
        }
        break;
      case 'save':
        notify(save(MANUAL) ? 'Ручное сохранение записано.' : 'Не удалось сохранить в этом браузере.');
        break;
      case 'load':
        try {
          const s = localStorage.getItem(MANUAL);
          if (!s) {
            notify('Ручного сохранения пока нет.');
            break;
          }
          state = E.restore(JSON.parse(s));
          speech = '';
          thought = '';
          save();
          close();
          render();
          notify('Ручное сохранение восстановлено.');
        } catch {
          notify('Сохранение недоступно.');
        }
        break;
      case 'new-confirm':
        open('new-confirm');
        break;
      case 'restart':
        state = E.fresh(state.prior);
        speech = P ? P.opening(state, D.opening?.text || '') : D.opening?.text || '';
        speaker = D.opening?.title || 'Человек, которого нет';
        page = 0;
        save();
        close();
        render();
        break;
    }
  });
  document.addEventListener('input', (ev) => {
    const k = ev.target?.dataset?.g;
    if (!k) return;
    gameVals[k] = Number(ev.target.value);
    if (k === 'frame') {
      const f = panel.querySelector('#g-frame');
      if (f) f.textContent = D.games.scrub.frames[gameVals.frame];
      FX?.sfx.click(false);
    } else if (k === 'peak') panel.querySelector('#g-peak')?.setAttribute('d', peakPath(gameVals.peak));
    else panel.querySelector('#g-moving')?.setAttribute('transform', sigTransform());
  });
  panel.addEventListener('close', () => {
    view = '';
    panel.classList?.remove('closing');
  });
  if (FX) FX.sheetDrag(panel, close);
  panel.addEventListener('click', (ev) => {
    if (ev.target === panel) {
      const r = panel.getBoundingClientRect();
      if (ev.clientX < r.left || ev.clientX > r.right || ev.clientY < r.top || ev.clientY > r.bottom) close();
    }
  });
  render();
  save();
})();
