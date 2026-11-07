(() => {
  'use strict';

  const rooms = ['office', 'cockpit', 'lab', 'analysis', 'airlock'];
  const crewRooms = { mara: 'cockpit', corvin: 'lab', irena: 'analysis', rein: 'airlock' };
  const itemRooms = { badge: 'office', sample: 'lab' };
  const briefingDocuments = ['order', 'manifestPort', 'manifestInternal'];
  const secretDocs = { mara: 'secretMara', corvin: 'secretCorvin', irena: 'secretIrena', rein: 'secretRein' };
  const truthDocs = { mara: 'truthMara', corvin: 'truthCorvin', irena: 'truthIrena', rein: 'truthRein' };
  const sceneDocs = ['breachLog', 'autopsy', 'routes'];
  const documentIds = [...briefingDocuments, 'analysis', 'lab', 'dalNote', 'irenaTrace', 'versions', 'dalAudio', ...Object.values(secretDocs), ...Object.values(truthDocs), ...sceneDocs];
  // Сцены с экипажем: флешбэк Рейна, медосмотр Корвина, карта Мары
  const autopsyAnswer = { eyes: 'vacuum', skin: 'vacuum', skull: 'blow', wrists: 'blow', lungs: 'after' };
  const autopsyClasses = ['vacuum', 'blow', 'after'];
  const routeGraph = {
    karfagen: ['tessa', 'vega'], tessa: ['karfagen', 'sirin', 'node9'], vega: ['karfagen', 'hollow', 'lunar'],
    hollow: ['vega', 'sirin'], sirin: ['tessa', 'hollow', 'lunar', 'node9'], lunar: ['sirin', 'vega'], node9: ['sirin', 'tessa']
  };
  const maraRoute = ['karfagen', 'tessa', 'sirin', 'lunar'];
  const dalRoute = ['vega', 'hollow', 'sirin', 'node9'];
  const routeMeet = 'sirin';
  const sceneCrew = { breach: 'rein', autopsy: 'corvin', routes: 'mara' };
  function sceneOpen(state, id) {
    const crewId = sceneCrew[id];
    if (!crewId || state[id] || state.crew !== crewId) return false;
    const ready = { breach: true, autopsy: state.lab, routes: state.nav }[id];
    return Boolean(ready && (state.pulse[crewId] === 'revealed' || state.caught.includes(crewId) || state.trust[crewId] >= 1));
  }
  function scenesDone(state) { return ['breach', 'autopsy', 'routes'].filter(id => state[id]).length; }
  // Свидетель пульса: на каком базовом вопросе у каждого срывается пульс
  const pulseTriggers = { mara: 1, corvin: 2, irena: 2, rein: 1 };
  const pulseStates = ['seen', 'closed', 'revealed'];
  // Голос: на каком вопросе дрожит голос (ложь попадает в блокнот цитат). Шлюз шумит, пока не заглушить вентиляцию.
  const voiceTopics = { mara: 0, corvin: 2, irena: 0, rein: 1 };
  const noisyRooms = ['airlock'];
  // Взгляд и пауза: на каком вопросе собеседнику неловко и сколько секунд он выдерживает тишину
  const pauseTopics = { mara: 2, corvin: 1, irena: 1, rein: 2 };
  const pauseBreak = { mara: 2.5, corvin: 4, irena: 3.5, rein: 6 };
  // Оговорка в паузе одного опровергает ложь другого
  const slipTargets = { irena: 'mara', corvin: 'rein', rein: 'corvin', mara: 'irena' };
  const quoteIds = ['mara', 'corvin', 'irena', 'rein'].flatMap(id => [id + ':lie', id + ':slip']);
  // Хороший и плохой: кто как держит роль на допросе Миры
  const goodFit = { mara: 1, corvin: 2, irena: 0, rein: 1 };
  const badFit = { mara: 1, corvin: 0, irena: 2, rein: 2 };
  const miraMoves = ['good', 'bad', 'self'];
  const miraOutcomes = ['full', 'partial', 'shut'];
  const audioFragments = ['a', 'b', 'c'];
  const slotDeadline = 12;
  const showRules = {
    dalNote: { need: 1, high: { mara: 1, corvin: 1, irena: 1, rein: 1 }, low: { mara: -1, corvin: 0, irena: 0, rein: -1 } },
    versions: { need: 0, high: { mara: 0, corvin: 0, irena: 0, rein: 0 }, low: { mara: 0, corvin: 0, irena: 0, rein: 0 } }
  };
  const showable = Object.keys(showRules);
  const priorities = { person: 'mercy', suspect: 'law', exit: 'calc' };
  const versionAnswer = { version: 3, field: 'cargo' };
  const replies = ['law', 'calc', 'mercy'];
  const crewIds = ['mara', 'corvin', 'irena', 'rein'];
  const replyLikes = { law: ['irena'], calc: ['mara', 'rein'], mercy: ['corvin'] };
  // Отношения по лору: профессиональное доверие, личная близость и поддержка методов — отдельно.
  const methodLikes = { mara: ['calc', 'law'], corvin: ['mercy', 'calc'], irena: ['law', 'mercy'], rein: ['calc', 'law'] };
  const axes = ['trust', 'close'];
  const bondReasons = ['reply', 'show', 'priority', 'versions', 'lab', 'dock', 'memory', 'secret', 'pressure', 'argument', 'late', 'team', 'truth', 'quote', 'breach', 'autopsy', 'routes', 'center'];
  const topicConditions = {
    lab: state => state.lab, deduction: state => state.deduction, safeOpen: state => state.safeOpen,
    versions: state => state.versions, priority: state => Boolean(state.priority), audio: state => state.audio,
    irenaTrace: state => state.documents.includes('irenaTrace'), argument: state => Boolean(state.argument),
    breach: state => state.breach, breachLog: state => state.documents.includes('breachLog'),
    autopsy: state => state.autopsy, routes: state => state.routes, center: state => Boolean(state.center),
    truth: state => state.caught.length > 0
  };
  function topicList(state, crewId) {
    const crew = window.PROLOGUE_CONTENT?.crew?.[crewId];
    if (!crew) return [];
    return [...crew.topics.map((topic, index) => ({ ...topic, index, open: true })),
      ...(crew.extraTopics ?? []).map((topic, i) => ({ ...topic, index: crew.topics.length + i, open: Boolean(topicConditions[topic.when]?.(state)) }))];
  }
  const clamp = value => Math.max(-3, Math.min(3, value));
  function bond(state, crewId, axis, delta, why) {
    if (!delta) return;
    const before = state[axis][crewId];
    state[axis][crewId] = clamp(before + delta);
    const applied = state[axis][crewId] - before;
    if (!applied) return;
    state.bondLog.push({ crew: crewId, axis, delta: applied, why });
    if (state.bondLog.length > 200) state.bondLog.splice(0, state.bondLog.length - 200);
  }
  function methods(state, crewId) {
    const [like, dislike] = methodLikes[crewId];
    return clamp(state.path[like] - state.path[dislike]);
  }
  function memoryOpen(state, crewId) {
    return state.trust[crewId] >= 2 || state.close[crewId] >= 1;
  }
  const deskFields = ['voyage', 'route', 'cargo', 'time'];
  const deskAnswer = ['cargo|cargo|diff', 'voyage|voyage|same'];
  const safeCode = [6, 9, 4];
  const dialSize = 20;
  const labChannels = ['sample', 'baseline', 'noise'];
  const manifestFields = deskFields;
  const poses = ['neutral', 'focus', 'guarded'];

  function noisy(state) { return noisyRooms.includes(state.room) && !state.quiet; }
  function roleFit(state, id, role) {
    return Math.max(0, (role === 'good' ? goodFit : badFit)[id] - (state.trust[id] < 0 ? 1 : 0));
  }
  // Допрос Миры: страх 0..5, откровенность 0..3. Сочувствие снимает страх, давление работает, только когда она не в панике.
  function interrogate(state, roles, moves) {
    let fear = 3, open = 0, done = false, outcome = null;
    const steps = [];
    for (const move of moves) {
      if (done || !miraMoves.includes(move)) return { fear, open, steps, done, outcome, invalid: true };
      const who = move === 'self' ? null : roles[move];
      let result;
      if (move === 'good') {
        const fit = roleFit(state, who, 'good');
        fear = Math.max(0, fear - fit);
        result = fit ? 'goodOk' : 'goodWeak';
        if (fear <= 1) open += 1;
      } else if (move === 'bad') {
        const fit = roleFit(state, who, 'bad');
        if (fear >= 3) { fear += 2; result = 'badPanic'; }
        else { open += fit; fear += 1; result = fit ? 'badOk' : 'badWeak'; }
      } else if (fear <= 2) { open += 1; result = 'selfOk'; }
      else { fear += 1; result = 'selfFear'; }
      open = Math.min(3, open);
      fear = Math.min(5, fear);
      steps.push({ move, who, result });
      if (fear >= 5) { done = true; outcome = 'shut'; }
      else if (open >= 3) { done = true; outcome = 'full'; }
      else if (steps.length >= 4) { done = true; outcome = open >= 1 ? 'partial' : 'shut'; }
    }
    return { fear, open, steps, done, outcome, invalid: false };
  }

  function fresh() {
    return {
      version: 1, intro: 0, room: 'office', tick: 6, accepted: false,
      nav: false, docked: false, reader: false, sampleReady: false,
      inventory: [], inspected: [], documents: [], reviewed: [],
      visited: [], thoughts: [], crew: null, topic: null, pose: 'neutral',
      task: null, lab: false, deduction: false, routeNote: null,
      reply: null, path: { law: 0, calc: 0, mercy: 0 },
      trust: { mara: 0, corvin: 0, irena: 0, rein: 0 },
      close: { mara: 0, corvin: 0, irena: 0, rein: 0 },
      bondLog: [], heard: [],
      safeFound: false, safeOpen: false,
      shown: { mara: [], corvin: [], irena: [], rein: [] }, said: null,
      priority: null, versions: false, dockStyle: null,
      pulse: { mara: null, corvin: null, irena: null, rein: null }, argument: null, audio: false, team: null, late: false,
      quotes: [], tells: [], caught: [], quiet: false, roles: null, mira: null,
      breach: false, autopsy: false, routes: false, center: null
    };
  }

  function remember(list, id) {
    if (!list.includes(id)) list.push(id);
  }

  function adjacent(room) {
    if (room === 'office') return rooms.filter(id => id !== room);
    return rooms.includes(room) ? ['office'] : [];
  }

  function period(tick) {
    return ['Утро', 'День', 'Вечер', 'Ночь'][Math.floor(tick / 3) % 4];
  }

  function dockReady(state) {
    return Boolean(state.accepted && state.nav && state.reader && state.lab && state.task?.done && !state.docked);
  }

  function closeTalk(state) {
    state.said = null;
    state.crew = null;
    state.topic = null;
    state.pose = 'neutral';
  }

  function advance(state) {
    state.tick += 1;
    if (state.task && !state.task.done && state.tick >= state.task.due) {
      state.task.done = true;
      remember(state.documents, 'analysis');
      return 'Ирена прислала результат сверки. Он в журнале.';
    }
    return '';
  }

  function restore(raw) {
    if (!raw || raw.version !== 1) return fresh();
    const state = fresh();
    const int = value => Number.isSafeInteger(value) && value >= 0;
    const validArray = (items, allowed) => Array.isArray(items)
      ? [...new Set(items.filter(id => allowed.includes(id)))] : [];
    state.intro = int(raw.intro) ? Math.min(4, raw.intro) : 0;
    state.room = rooms.includes(raw.room) ? raw.room : 'office';
    state.tick = int(raw.tick) ? raw.tick : state.tick;
    for (const key of ['accepted', 'nav', 'docked', 'reader', 'sampleReady', 'lab', 'deduction']) {
      state[key] = raw[key] === true;
    }
    state.inventory = validArray(raw.inventory, Object.keys(itemRooms));
    state.inspected = validArray(raw.inspected, state.inventory);
    state.documents = validArray(raw.documents, documentIds);
    state.reviewed = validArray(raw.reviewed, state.documents);
    state.visited = validArray(raw.visited, rooms);
    state.thoughts = validArray(raw.thoughts, [...rooms, ...documentIds, ...Object.keys(itemRooms), 'deduction', 'trace']);
    state.routeNote = state.nav ? 'Лунный арбитраж' : null;
    state.reply = replies.includes(raw.reply) ? raw.reply : null;
    for (const id of replies) state.path[id] = int(raw.path?.[id]) ? Math.min(raw.path[id], 99) : 0;
    for (const axis of axes) for (const id of crewIds) {
      const value = raw[axis]?.[id];
      state[axis][id] = Number.isSafeInteger(value) ? clamp(value) : 0;
    }
    state.bondLog = Array.isArray(raw.bondLog) ? raw.bondLog.filter(entry => entry && crewIds.includes(entry.crew) &&
      axes.includes(entry.axis) && Number.isSafeInteger(entry.delta) && Math.abs(entry.delta) <= 6 && bondReasons.includes(entry.why))
      
      .slice(-200).map(({ crew, axis, delta, why }) => ({ crew, axis, delta, why })) : [];
    state.heard = validArray(raw.heard, crewIds);
    state.safeFound = raw.safeFound === true;
    state.safeOpen = state.safeFound && raw.safeOpen === true;
    if (state.safeOpen) remember(state.documents, 'dalNote');
    for (const id of crewIds) state.shown[id] = validArray(raw.shown?.[id], showable);
    if (state.shown.irena.includes('dalNote') && state.documents.includes('dalNote') && raw.documents?.includes?.('irenaTrace')) remember(state.documents, 'irenaTrace');
    state.priority = Object.hasOwn(priorities, raw.priority ?? '') ? raw.priority : null;
    state.dockStyle = state.docked && ['clean', 'assisted'].includes(raw.dockStyle) ? raw.dockStyle : null;
    if (raw.task && int(raw.task.due)) {
      state.task = { due: raw.task.due, done: raw.task.done === true || state.tick >= raw.task.due };
      if (state.task.done) remember(state.documents, 'analysis');
    }
    state.versions = state.task?.done === true && raw.versions === true;
    for (const id of crewIds) {
      state.pulse[id] = pulseStates.includes(raw.pulse?.[id]) ? raw.pulse[id] : null;
      if (state.pulse[id] === 'revealed') remember(state.documents, secretDocs[id]);
    }
    state.argument = ['mara', 'rein', 'both'].includes(raw.argument) ? raw.argument : null;
    state.audio = raw.audio === true;
    if (state.audio) remember(state.documents, 'dalAudio');
    state.late = state.docked && raw.late === true;
    state.quotes = validArray(raw.quotes, quoteIds);
    state.tells = validArray(raw.tells, crewIds);
    state.caught = validArray(raw.caught, crewIds).filter(id => state.quotes.includes(id + ':lie'));
    state.caught.forEach(id => remember(state.documents, truthDocs[id]));
    state.quiet = raw.quiet === true;
    for (const id of ['breach', 'autopsy', 'routes']) state[id] = raw[id] === true;
    if (state.breach && raw.documents?.includes?.('breachLog')) remember(state.documents, 'breachLog');
    if (state.autopsy) remember(state.documents, 'autopsy');
    if (state.routes) remember(state.documents, 'routes');
    state.center = scenesDone(state) >= 2 && replies.includes(raw.center) ? raw.center : null;
    state.team = state.docked && Array.isArray(raw.team) && raw.team.length === 2 && new Set(raw.team).size === 2 && raw.team.every(id => crewIds.includes(id)) ? [...raw.team] : null;
    state.roles = state.team && raw.roles && state.team.includes(raw.roles.good) && state.team.includes(raw.roles.bad) && raw.roles.good !== raw.roles.bad
      ? { good: raw.roles.good, bad: raw.roles.bad } : null;
    state.mira = state.roles && miraOutcomes.includes(raw.mira) ? raw.mira : null;
    if (state.versions) remember(state.documents, 'versions');
    if (state.accepted) briefingDocuments.forEach(id => remember(state.documents, id));
    if (state.lab) remember(state.documents, 'lab');
    if (crewRooms[raw.crew] === state.room) {
      state.crew = raw.crew;
      state.topic = int(raw.topic) ? raw.topic : null;
      state.pose = poses.includes(raw.pose) ? raw.pose : 'neutral';
      if (raw.said && [...showable, 'secret', 'pause', 'truth'].includes(raw.said.doc) && ['high', 'low'].includes(raw.said.tone)) state.said = { doc: raw.said.doc, tone: raw.said.tone };
    }
    return state;
  }

  function dispatch(previous, action, value) {
    const state = restore(previous);
    const fail = message => ({ state: previous, ok: false, message });
    const success = (message = '', spendsTime = false) => {
      const update = spendsTime ? advance(state) : '';
      return { state, ok: true, message: [message, update].filter(Boolean).join(' ') };
    };

    if (state.docked && !['team', 'roles', 'interrogate'].includes(action)) return fail('Шаттл уже пристыкован.');
    if (action === 'next-intro') {
      if (state.intro === 4) return fail('Вводная завершена.');
      state.intro += 1;
      if (state.intro === 4) {
        remember(state.visited, 'office');
        remember(state.thoughts, 'office');
      }
      return success();
    }
    if (state.intro < 4) return fail('Сначала досмотрите вводную.');

    switch (action) {
      case 'accept':
        if (state.room !== 'office' || state.accepted) return fail('Приказ доступен на терминале кабинета.');
        if (!replies.includes(value)) return fail('Выберите, как ответить Центру.');
        state.accepted = true;
        state.reply = value;
        state.path[value] += 1;
        replyLikes[value].forEach(id => bond(state, id, 'trust', 1, 'reply'));
        briefingDocuments.forEach(id => remember(state.documents, id));
        return success('Ответ отправлен в Центр. Обе ведомости доступны на рабочем столе.');
      case 'move':
        if (!adjacent(state.room).includes(value)) return fail('Прямого перехода в это помещение нет.');
        state.room = value;
        closeTalk(state);
        remember(state.visited, value);
        remember(state.thoughts, value);
        return success('', true);
      case 'talk':
        if (crewRooms[value] !== state.room) return fail('Собеседника нет в этой комнате.');
        state.crew = value;
        state.said = null;
        state.topic = null;
        state.pose = 'neutral';
        return success();
      case 'topic':
      case 'pulse':
      case 'eyes':
      case 'voice': {
        const index = Number(value);
        const topic = topicList(state, state.crew)[index];
        if (!Number.isInteger(index) || !topic?.open) return fail('Реплика недоступна.');
        state.topic = index;
        state.said = null;
        state.pose = poses.includes(topic.pose) ? topic.pose : 'neutral';
        if (action === 'pulse') {
          const hit = index === pulseTriggers[state.crew];
          if (hit && !state.pulse[state.crew]) state.pulse[state.crew] = 'seen';
          return success(hit ? 'Пульс сорвался на этом вопросе. Собеседник что-то недоговаривает.' : 'Пульс ровный.');
        }
        if (action === 'eyes') {
          const hit = index === pauseTopics[state.crew];
          if (hit) remember(state.tells, state.crew);
          return success(hit ? 'Жест выдал неловкость. Попробуйте выдержать паузу.' : '');
        }
        if (action === 'voice') {
          if (noisy(state)) return success('Шум глушит голос. Здесь его не прочитать.');
          const hit = index === voiceTopics[state.crew];
          if (hit) remember(state.quotes, state.crew + ':lie');
          return success(hit ? 'Голос дрогнул. Фраза записана в блокнот цитат.' : '');
        }
        return success();
      }
      case 'quiet':
        if (!noisyRooms.includes(state.room)) return fail('Здесь и так тихо.');
        if (state.quiet) return fail('Вентиляция уже приглушена.');
        state.quiet = true;
        return success('Рейн перевёл вентиляцию шлюза на малый ход. Стало тихо.', true);
      case 'pause': {
        const crewId = state.crew;
        if (!crewId || state.topic == null) return fail('Сначала задайте вопрос.');
        const seconds = Number(value);
        if (!Number.isFinite(seconds) || seconds < 0) return fail('Пауза не удалась.');
        if (seconds < pauseBreak[crewId]) return success('Вы заговорили первым.');
        const hit = state.topic === pauseTopics[crewId];
        state.said = { doc: 'pause', tone: hit ? 'high' : 'low' };
        state.topic = null;
        if (hit) {
          const fresh = !state.quotes.includes(crewId + ':slip');
          remember(state.quotes, crewId + ':slip');
          return success(fresh ? 'Оговорка записана в блокнот цитат.' : '');
        }
        return success();
      }
      case 'confront': {
        const crewId = state.crew;
        if (!crewId) return fail('Сначала начните разговор.');
        if (state.caught.includes(crewId)) return fail('Он уже рассказал правду.');
        if (!quoteIds.includes(value) || !state.quotes.includes(value)) return fail('Такой цитаты нет в блокноте.');
        const [owner, kind] = value.split(':');
        if (owner === crewId) return fail('Нельзя опровергать человека его же словами.');
        state.topic = null;
        if (kind === 'slip' && slipTargets[owner] === crewId) {
          if (!state.quotes.includes(crewId + ':lie')) return fail('Пока нечего опровергать. Сначала поймайте его на слове.');
          remember(state.caught, crewId);
          remember(state.documents, truthDocs[crewId]);
          bond(state, crewId, 'trust', 1, 'truth');
          state.said = { doc: 'truth', tone: 'high' };
          return success('Правда записана в журнал.');
        }
        bond(state, crewId, 'trust', -1, 'quote');
        state.said = { doc: 'truth', tone: 'low' };
        return success('Цитата ничего не опровергает.');
      }
      case 'breach': {
        if (state.room !== 'airlock' || !sceneOpen(state, 'breach')) return fail('Рейн пока не готов об этом говорить.');
        state.breach = true;
        bond(state, 'rein', 'close', 1, 'breach');
        state.topic = null;
        state.said = null;
        if (value?.lock === true) {
          remember(state.documents, 'breachLog');
          return success('Переборку сектора Б заблокировали дистанционно. Запись в журнале.', true);
        }
        return success('Рейн закончил рассказ.', true);
      }
      case 'autopsy': {
        if (state.room !== 'lab' || !sceneOpen(state, 'autopsy')) return fail('Корвин пока не готов показывать заметки.');
        const marks = value?.marks ?? {};
        const keys = Object.keys(autopsyAnswer);
        if (!keys.every(key => autopsyClasses.includes(marks[key]))) return fail('Отметьте каждое повреждение.');
        const right = keys.filter(key => marks[key] === autopsyAnswer[key]).length;
        if (right !== keys.length) return fail('Корвин качает головой: верно ' + right + ' из ' + keys.length + '. Смотрите, что могло случиться только с живым человеком.');
        state.autopsy = true;
        remember(state.documents, 'autopsy');
        bond(state, 'corvin', 'trust', 1, 'autopsy');
        state.topic = null;
        state.said = null;
        return success('Заключение записано в журнал.', true);
      }
      case 'routes': {
        if (state.room !== 'cockpit' || !sceneOpen(state, 'routes')) return fail('Мара пока не готова открывать старые маршруты.');
        const path = Array.isArray(value?.path) ? value.path : [];
        if (path.join() !== maraRoute.join()) return fail('Маршрут не сходится с записями позывного.');
        if (value?.meet !== routeMeet) return fail('Здесь маршруты не пересекаются в одно время.');
        state.routes = true;
        remember(state.documents, 'routes');
        bond(state, 'mara', 'close', 1, 'routes');
        state.topic = null;
        state.said = null;
        return success('Пересечение маршрутов записано в журнал.', true);
      }
      case 'center': {
        if (scenesDone(state) < 2) return fail('Центр пока молчит.');
        if (state.center) return fail('Ответ Центру уже отправлен.');
        if (!replies.includes(value)) return fail('Выберите ответ.');
        state.center = value;
        state.path[value] += 1;
        replyLikes[value].forEach(id => bond(state, id, 'trust', 1, 'center'));
        return success('Ответ ушёл в Центр.');
      }
      case 'roles': {
        if (!state.team) return fail('Сначала соберите группу.');
        if (state.roles) return fail('Роли уже распределены.');
        if (!state.team.includes(value?.good) || !state.team.includes(value?.bad) || value.good === value.bad) return fail('Распределите роли между двумя членами группы.');
        state.roles = { good: value.good, bad: value.bad };
        return success();
      }
      case 'interrogate': {
        if (!state.roles) return fail('Сначала распределите роли.');
        if (state.mira) return fail('Допрос окончен.');
        const result = interrogate(state, state.roles, Array.isArray(value) ? value : []);
        if (result.invalid || !result.done) return fail('Допрос не закончен.');
        state.mira = result.outcome;
        return success();
      }
      case 'press': {
        const crewId = state.crew;
        if (!crewId) return fail('Сначала начните разговор.');
        if (!['seen', 'closed'].includes(state.pulse[crewId])) return fail('Пока не на что надавить.');
        state.topic = null;
        if (state.trust[crewId] >= 1 || state.close[crewId] >= 1) {
          state.pulse[crewId] = 'revealed';
          remember(state.documents, secretDocs[crewId]);
          bond(state, crewId, 'close', 1, 'secret');
          state.said = { doc: 'secret', tone: 'high' };
          return success('Секрет записан в журнал.');
        }
        if (state.pulse[crewId] === 'seen') bond(state, crewId, 'trust', -1, 'pressure');
        state.pulse[crewId] = 'closed';
        state.said = { doc: 'secret', tone: 'low' };
        return success('Слишком рано. Нужно больше доверия.');
      }
      case 'argue':
        if (state.argument) return fail('Спор уже решён.');
        if (!state.nav || !state.reader) return fail('Спорить пока не о чем.');
        if (value === 'both' && state.trust.mara + state.trust.rein < 2) return fail('Чтобы примирить обоих, нужно больше доверия Мары и Рейна.');
        if (!['mara', 'rein', 'both'].includes(value)) return fail('Выберите решение.');
        state.argument = value;
        if (value === 'mara') { bond(state, 'mara', 'trust', 1, 'argument'); bond(state, 'rein', 'trust', -1, 'argument'); state.path.calc += 1; }
        if (value === 'rein') { bond(state, 'rein', 'trust', 1, 'argument'); bond(state, 'mara', 'trust', -1, 'argument'); state.path.mercy += 1; }
        if (value === 'both') { bond(state, 'mara', 'close', 1, 'argument'); bond(state, 'rein', 'close', 1, 'argument'); state.path.law += 1; }
        return success();
      case 'listen': {
        if (state.room !== 'office') return fail('Запись лежит в кабинете.');
        if (state.audio) return fail('Запись уже расшифрована.');
        const found = Array.isArray(value) ? [...new Set(value)].sort() : [];
        if (found.join() !== audioFragments.join()) return fail('Расшифрованы не все фрагменты.');
        state.audio = true;
        remember(state.documents, 'dalAudio');
        return success('Фрагменты записи Даля расшифрованы. Текст в журнале.', true);
      }
      case 'team': {
        if (!state.docked) return fail('Группу собирают после стыковки.');
        if (state.team) return fail('Группа уже собрана.');
        const team = Array.isArray(value) ? [...new Set(value)] : [];
        if (team.length !== 2 || !team.every(id => crewIds.includes(id))) return fail('Выберите двоих.');
        state.team = team;
        team.forEach(id => bond(state, id, 'close', 1, 'team'));
        return success();
      }
      case 'memory': {
        const crewId = state.crew;
        if (!crewId) return fail('Сначала начните разговор.');
        if (!memoryOpen(state, crewId)) return fail('Об этом пока не говорят с новым командиром.');
        state.topic = null;
        state.said = null;
        state.pose = 'neutral';
        if (!state.heard.includes(crewId)) {
          remember(state.heard, crewId);
          bond(state, crewId, 'close', 1, 'memory');
        }
        return success();
      }
      case 'end-talk':
        closeTalk(state);
        return success();
      case 'take':
        if (itemRooms[value] !== state.room) return fail('Предмета нет в этой комнате.');
        if (state.inventory.includes(value)) return fail('Предмет уже в инвентаре.');
        remember(state.inventory, value);
        return success('Предмет добавлен в инвентарь.');
      case 'inspect':
        if (!state.inventory.includes(value)) return fail('Предмет ещё не взят.');
        remember(state.inspected, value);
        remember(state.thoughts, value);
        return success();
      case 'use':
        if (!state.inventory.includes(value)) return fail('Предмет ещё не взят.');
        if (value === 'badge' && state.room === 'airlock') {
          if (state.reader) return fail('Допуск уже записан.');
          state.reader = true;
          return success('Считыватель принял служебный идентификатор.');
        }
        if (value === 'sample' && state.room === 'lab') {
          if (state.sampleReady) return fail('Кассета уже установлена.');
          state.sampleReady = true;
          return success('Кассета установлена. Выберите канал калибровки.');
        }
        return fail('Здесь предмет применить нельзя.');
      case 'calibrate':
        if (state.room !== 'lab' || !state.sampleReady) return fail('Установите кассету в лабораторный сканер.');
        if (state.lab) return fail('Калибровка уже записана.');
        if (value !== 'baseline' && value !== 'precise') return fail('Этот профиль не совпадает с эталоном. Сравните форму сигнала.');
        state.lab = true;
        remember(state.documents, 'lab');
        if (value === 'precise') bond(state, 'corvin', 'trust', 1, 'lab');
        return success(value === 'precise' ? 'Калибровка идеальная. Корвин молча кивнул.' : 'Калибровка завершена. Результат записан в журнал.', true);
      case 'read':
        if (!state.documents.includes(value)) return fail('Материал пока недоступен.');
        remember(state.reviewed, value);
        remember(state.thoughts, value);
        return success();
      case 'deduce':
        if (state.room !== 'office' || !state.accepted) return fail('Откройте ведомости на рабочем столе в кабинете.');
        if (state.deduction) return fail('Вывод уже записан.');
        const links = Array.isArray(value?.links) ? value.links : [];
        const keys = links.filter(link => deskFields.includes(link?.a) && deskFields.includes(link?.b) && ['same', 'diff'].includes(link?.kind))
          .map(link => link.a + '|' + link.b + '|' + link.kind);
        if (links.length !== 2 || keys.length !== 2) return fail('Нужны ровно две связи между ведомостями.');
        const right = keys.filter(key => deskAnswer.includes(key)).length;
        if (right !== 2 || keys[0] === keys[1]) {
          return fail('Верных связей: ' + (keys[0] === keys[1] ? Math.min(right, 1) : right) + ' из 2. Одна связь должна доказывать, что это один рейс, другая — показывать, что изменился смысл перевозки.');
        }
        state.deduction = true;
        remember(state.thoughts, 'deduction');
        return success('Вывод записан. Теперь можно поручить Ирене проверку исходной записи.', true);
      case 'assign':
        if (state.room !== 'analysis' || !state.deduction) return fail('Обсудите с Иреной подтверждённое расхождение ведомостей.');
        if (state.task) return fail(state.task.done ? 'Поручение уже выполнено.' : 'Ирена уже сверяет записи.');
        state.task = { due: state.tick + 3, done: false };
        return success('Ирена приняла поручение. Сверка займёт три единицы корабельного времени.');
      case 'trace':
        if (state.room !== 'office') return fail('След остался на столе в кабинете.');
        if (state.safeFound) return fail('Ящик уже найден.');
        state.safeFound = true;
        remember(state.thoughts, 'trace');
        return success('Под столешницей нашёлся запертый ящик с кодовым диском.');
      case 'unlock': {
        if (state.room !== 'office' || !state.safeFound) return fail('Здесь нечего открывать.');
        if (state.safeOpen) return fail('Ящик уже открыт.');
        const code = Array.isArray(value) ? value : [];
        if (code.length !== 3 || code.some((n, i) => n !== safeCode[i])) return fail('Механизм щёлкнул и сбросился. Комбинация неверна.');
        state.safeOpen = true;
        remember(state.documents, 'dalNote');
        remember(state.thoughts, 'dalNote');
        return success('Ящик открыт. Внутри записка Даля, она в журнале.', true);
      }
      case 'show': {
        const crewId = state.crew;
        if (!crewId) return fail('Сначала начните разговор.');
        if (!showable.includes(value) || !state.documents.includes(value)) return fail('Этот материал нельзя показать.');
        if (state.shown[crewId].includes(value)) return fail('Вы уже показывали это.');
        const rule = showRules[value];
        const tone = state.trust[crewId] >= rule.need ? 'high' : 'low';
        bond(state, crewId, 'trust', rule[tone][crewId], 'show');
        if (value === 'dalNote') bond(state, crewId, 'close', tone === 'high' ? 1 : -1, 'show');
        remember(state.shown[crewId], value);
        state.topic = null;
        state.said = { doc: value, tone };
        if (crewId === 'irena' && value === 'dalNote' && tone === 'high') remember(state.documents, 'irenaTrace');
        return success();
      }
      case 'priority':
        if (state.room !== 'airlock') return fail('Порядок эвакуации обсуждают с Рейном у шлюза.');
        if (state.priority) return fail('Приоритет уже задан.');
        if (!Object.hasOwn(priorities, value ?? '')) return fail('Выберите один приоритет.');
        state.priority = value;
        state.path[priorities[value]] += 1;
        bond(state, 'rein', 'trust', 1, 'priority');
        return success('Рейн записал приоритет. Ему важно, что он один.');
      case 'versions':
        if (state.room !== 'analysis' || !state.task?.done) return fail('Журнал версий будет у Ирены после сверки.');
        if (state.versions) return fail('Правка уже найдена.');
        if (value?.version !== versionAnswer.version || value?.field !== versionAnswer.field) {
          return fail('Эта правка не меняет смысла перевозки. Ищите, где изменилось содержание, а не оформление.');
        }
        state.versions = true;
        remember(state.documents, 'versions');
        bond(state, 'irena', 'trust', 1, 'versions');
        return success('Правка найдена. Ирена побледнела, увидев, чей это допуск.', true);
      case 'nav':
        if (state.room !== 'cockpit' || !state.accepted) return fail('Для расчёта маршрута нужны кабина и принятый приказ.');
        if (state.nav) return fail('Маршрут уже проложен.');
        state.nav = true;
        state.routeNote = 'Лунный арбитраж';
        return success('Маршрут к Лунному арбитражу проложен.', true);
      case 'wait':
        return success('Прошло немного корабельного времени.', true);
      case 'dock':
        if (state.room !== 'cockpit' || !dockReady(state)) {
          return fail('Перед стыковкой примите приказ, проложите маршрут, предъявите допуск в шлюзе, откалибруйте сканер и дождитесь сверки Ирены.');
        }
        state.docked = true;
        state.late = state.tick > slotDeadline;
        if (state.late) bond(state, 'mara', 'trust', -1, 'late');
        state.dockStyle = value === 'assisted' ? 'assisted' : 'clean';
        bond(state, 'mara', 'trust', value === 'clean' ? 1 : value === 'assisted' ? -1 : 0, 'dock');
        closeTalk(state);
        return success('Стыковка завершена.', true);
      default:
        return fail('Действие недоступно.');
    }
  }

  window.PROLOGUE_ENGINE = { fresh, restore, dispatch, adjacent, period, dockReady, labChannels, manifestFields, deskFields, replies, safeCode, dialSize, rooms, showable, priorities, crewIds, methods, memoryOpen, methodLikes, topicList, pulseTriggers, secretDocs, audioFragments, slotDeadline,
    sceneOpen, scenesDone, autopsyAnswer, autopsyClasses, routeGraph, maraRoute, dalRoute, routeMeet,
    voiceTopics, pauseTopics, pauseBreak, slipTargets, truthDocs, goodFit, badFit, interrogate, noisy, roleFit };
})();
