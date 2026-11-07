(() => {
  'use strict';

  const rooms = ['office', 'cockpit', 'lab', 'analysis', 'airlock'];
  const crewRooms = { mara: 'cockpit', corvin: 'lab', irena: 'analysis', rein: 'airlock' };
  const itemRooms = { badge: 'office', sample: 'lab' };
  const briefingDocuments = ['order', 'manifestPort', 'manifestInternal'];
  const documentIds = [...briefingDocuments, 'analysis', 'lab', 'dalNote', 'irenaTrace', 'versions'];
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
  const deskFields = ['voyage', 'route', 'cargo', 'time'];
  const deskAnswer = ['cargo|cargo|diff', 'voyage|voyage|same'];
  const safeCode = [6, 9, 4];
  const dialSize = 20;
  const labChannels = ['sample', 'baseline', 'noise'];
  const manifestFields = deskFields;
  const poses = ['neutral', 'focus', 'guarded'];

  function fresh() {
    return {
      version: 1, intro: 0, room: 'office', tick: 6, accepted: false,
      nav: false, docked: false, reader: false, sampleReady: false,
      inventory: [], inspected: [], documents: [], reviewed: [],
      visited: [], thoughts: [], crew: null, topic: null, pose: 'neutral',
      task: null, lab: false, deduction: false, routeNote: null,
      reply: null, path: { law: 0, calc: 0, mercy: 0 },
      trust: { mara: 0, corvin: 0, irena: 0, rein: 0 },
      safeFound: false, safeOpen: false,
      shown: { mara: [], corvin: [], irena: [], rein: [] }, said: null,
      priority: null, versions: false, dockStyle: null
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
    for (const id of crewIds) {
      const value = raw.trust?.[id];
      state.trust[id] = Number.isSafeInteger(value) ? Math.max(-3, Math.min(3, value)) : 0;
    }
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
    if (state.versions) remember(state.documents, 'versions');
    if (state.accepted) briefingDocuments.forEach(id => remember(state.documents, id));
    if (state.lab) remember(state.documents, 'lab');
    if (crewRooms[raw.crew] === state.room) {
      state.crew = raw.crew;
      state.topic = int(raw.topic) ? raw.topic : null;
      state.pose = poses.includes(raw.pose) ? raw.pose : 'neutral';
      if (raw.said && showable.includes(raw.said.doc) && ['high', 'low'].includes(raw.said.tone)) state.said = { doc: raw.said.doc, tone: raw.said.tone };
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

    if (state.docked) return fail('Шаттл уже пристыкован.');
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
        replyLikes[value].forEach(id => { state.trust[id] = Math.min(3, state.trust[id] + 1); });
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
      case 'topic': {
        const index = Number(value);
        const topic = window.PROLOGUE_CONTENT?.crew?.[state.crew]?.topics?.[index];
        if (!Number.isInteger(index) || !topic) return fail('Реплика недоступна.');
        state.topic = index;
        state.said = null;
        state.pose = poses.includes(topic.pose) ? topic.pose : 'neutral';
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
        if (value !== 'baseline') return fail('Этот профиль не совпадает с эталоном. Сравните форму сигнала.');
        state.lab = true;
        remember(state.documents, 'lab');
        return success('Калибровка завершена. Результат записан в журнал.', true);
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
        state.trust[crewId] = Math.max(-3, Math.min(3, state.trust[crewId] + rule[tone][crewId]));
        remember(state.shown[crewId], value);
        state.topic = null;
        state.said = { doc: value, tone };
        if (crewId === 'irena' && value === 'dalNote' && tone === 'high') remember(state.documents, 'irenaTrace');
        const delta = rule[tone][crewId];
        return success(delta > 0 ? 'Доверие выросло.' : delta < 0 ? 'Доверие упало.' : '');
      }
      case 'priority':
        if (state.room !== 'airlock') return fail('Порядок эвакуации обсуждают с Рейном у шлюза.');
        if (state.priority) return fail('Приоритет уже задан.');
        if (!Object.hasOwn(priorities, value ?? '')) return fail('Выберите один приоритет.');
        state.priority = value;
        state.path[priorities[value]] += 1;
        state.trust.rein = Math.min(3, state.trust.rein + 1);
        return success('Рейн записал приоритет. Ему важно, что он один.');
      case 'versions':
        if (state.room !== 'analysis' || !state.task?.done) return fail('Журнал версий будет у Ирены после сверки.');
        if (state.versions) return fail('Правка уже найдена.');
        if (value?.version !== versionAnswer.version || value?.field !== versionAnswer.field) {
          return fail('Эта правка не меняет смысла перевозки. Ищите, где изменилось содержание, а не оформление.');
        }
        state.versions = true;
        remember(state.documents, 'versions');
        state.trust.irena = Math.min(3, state.trust.irena + 1);
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
        state.dockStyle = value === 'assisted' ? 'assisted' : 'clean';
        if (value === 'clean') state.trust.mara = Math.min(3, state.trust.mara + 1);
        if (value === 'assisted') state.trust.mara = Math.max(-3, state.trust.mara - 1);
        closeTalk(state);
        return success('Стыковка завершена.', true);
      default:
        return fail('Действие недоступно.');
    }
  }

  window.PROLOGUE_ENGINE = { fresh, restore, dispatch, adjacent, period, dockReady, labChannels, manifestFields, deskFields, replies, safeCode, dialSize, rooms, showable, priorities };
})();
