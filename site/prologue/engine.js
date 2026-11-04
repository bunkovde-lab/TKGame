(() => {
  'use strict';

  const rooms = ['office', 'cockpit', 'lab', 'analysis', 'airlock'];
  const crewRooms = { mara: 'cockpit', corvin: 'lab', irena: 'analysis', rein: 'airlock' };
  const itemRooms = { badge: 'office', sample: 'lab' };
  const briefingDocuments = ['order', 'manifestPort', 'manifestInternal'];
  const documentIds = [...briefingDocuments, 'analysis', 'lab'];
  const labChannels = ['sample', 'baseline', 'noise'];
  const manifestFields = ['voyage', 'cargo', 'time'];
  const poses = ['neutral', 'focus', 'guarded'];

  function fresh() {
    return {
      version: 1, intro: 0, room: 'office', tick: 6, accepted: false,
      nav: false, docked: false, reader: false, sampleReady: false,
      inventory: [], inspected: [], documents: [], reviewed: [],
      visited: [], thoughts: [], crew: null, topic: null, pose: 'neutral',
      task: null, lab: false, deduction: false, routeNote: null
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
    state.thoughts = validArray(raw.thoughts, [...rooms, ...documentIds, ...Object.keys(itemRooms), 'deduction']);
    state.routeNote = state.nav ? 'Лунный арбитраж' : null;
    if (raw.task && int(raw.task.due)) {
      state.task = { due: raw.task.due, done: raw.task.done === true || state.tick >= raw.task.due };
      if (state.task.done) remember(state.documents, 'analysis');
    }
    if (state.accepted) briefingDocuments.forEach(id => remember(state.documents, id));
    if (state.lab) remember(state.documents, 'lab');
    if (crewRooms[raw.crew] === state.room) {
      state.crew = raw.crew;
      state.topic = int(raw.topic) ? raw.topic : null;
      state.pose = poses.includes(raw.pose) ? raw.pose : 'neutral';
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
        state.accepted = true;
        briefingDocuments.forEach(id => remember(state.documents, id));
        return success('Приказ принят. Обе ведомости доступны в журнале.');
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
        state.topic = null;
        state.pose = 'neutral';
        return success();
      case 'topic': {
        const index = Number(value);
        const topic = window.PROLOGUE_CONTENT?.crew?.[state.crew]?.topics?.[index];
        if (!Number.isInteger(index) || !topic) return fail('Реплика недоступна.');
        state.topic = index;
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
        if (value !== 'baseline') return fail('Для калибровки сначала нужна эталонная линия.');
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
        if (value?.same !== 'voyage' || value?.different !== 'cargo') {
          return fail('Свяжите бумаги одним идентификатором, затем найдите различие в том, как описан груз.');
        }
        state.deduction = true;
        remember(state.thoughts, 'deduction');
        return success('Вывод записан. Теперь можно поручить Ирене проверку исходной записи.', true);
      case 'assign':
        if (state.room !== 'analysis' || !state.deduction) return fail('Обсудите с Иреной подтверждённое расхождение ведомостей.');
        if (state.task) return fail(state.task.done ? 'Поручение уже выполнено.' : 'Ирена уже сверяет записи.');
        state.task = { due: state.tick + 3, done: false };
        return success('Ирена приняла поручение. Сверка займёт три единицы корабельного времени.');
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
        closeTalk(state);
        return success('Стыковка завершена.', true);
      default:
        return fail('Действие недоступно.');
    }
  }

  window.PROLOGUE_ENGINE = { fresh, restore, dispatch, adjacent, period, dockReady, labChannels, manifestFields, rooms };
})();
