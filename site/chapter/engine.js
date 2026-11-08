(() => {
  "use strict";
  const D = () => window.CHAPTER_DATA;
  const add = (a, v) => {
    if (!a.includes(v)) a.push(v);
  };
  const known = (s, id) => s.evidence.includes(id) || s.conclusions.includes(id) || s.puzzles.includes(id);
  const has = (s, ids = []) => ids.every((id) => known(s, id));
  function fresh(prior) {
    return applyPrior(
      {
        version: 1,
        location: "port",
        tick: 48,
        evidence: ["manifest"],
        inspected: [],
        talked: [],
        visited: ["port"],
        conclusions: [],
        puzzles: [],
        failed: {},
        trust: { mira: 0, doctor: 0, chief: 0, technician: 0 },
        task: null,
        sanction: false,
        interview: false,
        combat: [],
        ending: null,
        endingPassage: "",
        activeNpc: null,
        topic: null,
        history: [],
        injury: 0,
        heat: 0,
        quality: 0,
        prior: null,
        ship: "office",
        team: null,
      },
      prior,
    );
  }
  /* Последствия пролога: выборы игрока или предыстория, выбранная на старте главы */
  const moods = ["high", "mid", "low"],
    crewIds = ["mara", "corvin", "irena", "rein"],
    paths = ["law", "calc", "mercy"];
  function cleanPrior(p) {
    if (!p || typeof p !== "object") return null;
    const out = {
      source: p.source === "prologue" ? "prologue" : "chosen",
      path: paths.includes(p.path) ? p.path : "law",
      team: Array.isArray(p.team) ? [...new Set(p.team.filter((id) => crewIds.includes(id)))].slice(0, 2) : [],
      mira: ["full", "partial", "shut"].includes(p.mira) ? p.mira : "partial",
      center: paths.includes(p.center) ? p.center : null,
      late: p.late === true,
      mood: {},
      found: Array.isArray(p.found) ? p.found.filter((x) => typeof x === "string").slice(0, 40) : [],
    };
    for (const id of crewIds) out.mood[id] = moods.includes(p.mood?.[id]) ? p.mood[id] : "mid";
    return out;
  }
  function applyPrior(s, raw) {
    const p = cleanPrior(raw);
    if (!p) return s;
    s.prior = p;
    if (p.late) s.tick = 54;
    s.trust.mira = p.mira === "full" ? 2 : p.mira === "shut" ? -1 : 1;
    if (p.mira === "full") add(s.evidence, "witness");
    if (p.center === "mercy") s.heat = 1;
    return s;
  }
  /* Шаттл из пролога: отсеки и двое из экипажа, которые идут с командиром в порт */
  const shipRooms = ["office", "cockpit", "lab", "analysis", "airlock"];
  const crewRoom = { mara: "cockpit", corvin: "lab", irena: "analysis", rein: "airlock" };
  function teamOf(s) {
    if (Array.isArray(s.team) && s.team.length === 2) return s.team;
    if (s.prior?.team?.length === 2) return s.prior.team;
    return ["corvin", "rein"];
  }
  function taskTime(s) {
    const m = s.prior?.mood?.irena;
    return m === "high" ? 3 : m === "low" ? 5 : 4;
  }
  function sanctionNeed(s) {
    return s.prior?.center === "law" ? 2 : 3;
  }
  function restore(raw) {
    if (!raw || raw.version !== 1) return fresh();
    const s = fresh();
    const d = D();
    for (const k of ["evidence", "inspected", "talked", "visited", "conclusions", "puzzles", "combat", "history"])
      if (Array.isArray(raw[k])) s[k] = [...new Set(raw[k].filter((x) => typeof x === "string"))];
    if (d?.locations?.[raw.location]) s.location = raw.location;
    for (const k of ["tick", "injury", "heat", "quality"]) if (Number.isSafeInteger(raw[k]) && raw[k] >= 0) s[k] = raw[k];
    for (const k of ["sanction", "interview"]) s[k] = raw[k] === true;
    s.failed = raw.failed && typeof raw.failed === "object" ? { ...raw.failed } : {};
    s.trust = { ...s.trust, ...raw.trust };
    s.task = raw.task && Number.isSafeInteger(raw.task.due) ? { due: raw.task.due, done: !!raw.task.done } : null;
    s.ending = ["expose", "rescue", "covert", "dismiss"].includes(raw.ending) ? raw.ending : null;
    s.endingPassage = typeof raw.endingPassage === "string" ? raw.endingPassage : "";
    s.activeNpc = d?.npcs?.[raw.activeNpc] ? raw.activeNpc : null;
    s.topic = typeof raw.topic === "string" ? raw.topic : null;
    s.prior = cleanPrior(raw.prior);
    s.ship = shipRooms.includes(raw.ship) ? raw.ship : "office";
    const team = Array.isArray(raw.team) ? [...new Set(raw.team.filter((id) => crewIds.includes(id)))] : [];
    s.team = team.length === 2 ? team : null;
    return s;
  }
  function unlocked(s) {
    const out = ["port", "waiting", "registry", "office"];
    if (known(s, "wristband") || known(s, "familypass")) out.push("clinic");
    if (known(s, "thermalprint") || known(s, "maintenance") || known(s, "transfer")) out.push("warehouse");
    if (known(s, "warrant") || known(s, "badgecopy") || known(s, "forgery")) out.push("archive");
    if (known(s, "route") || known(s, "relaykey")) out.push("relay");
    return out;
  }
  function period(s) {
    return ["Ночь", "Утро", "День", "Вечер"][Math.floor((s.tick % 144) / 36)];
  }
  function clock(s) {
    const minutes = (s.tick % 144) * 10;
    return String(Math.floor(minutes / 60)).padStart(2, "0") + ":" + String(minutes % 60).padStart(2, "0");
  }
  function departureKnown(s) {
    return s.evidence.includes("couriernote");
  }
  function available(s, npc) {
    const n = D().npcs[npc];
    if (n && crewIds.includes(npc)) return (s.location === "office" || teamOf(s).includes(npc)) && has(s, n.requires || []);
    return !!n && (n.location === s.location || (s.location === "office" && n.location === "office")) && has(s, n.requires || []);
  }
  function availableTopics(s, npc) {
    return (D().npcs[npc]?.topics || []).filter((t) => has(s, t.requires || []));
  }
  function endReady(s, id) {
    if (id === "dismiss") return true;
    if (!s.interview || !known(s, "mastermind")) return false;
    if (id === "expose") return s.sanction && known(s, "forgery") && s.evidence.includes("confession");
    if (id === "rescue")
      return known(s, "route") && s.combat.some((x) => x === "cargo:protect" || x === "cargo:coordinate") && s.evidence.includes("cargowitness");
    if (id === "covert") return known(s, "route") && s.evidence.includes("signalreport") && s.task?.done;
    return false;
  }
  function dispatch(previous, action, value) {
    const s = restore(previous),
      d = D();
    const fail = (message) => ({ state: previous, ok: false, message });
    const win = (message = "", passage = "", time = 0) => {
      s.tick += time;
      if (s.task && !s.task.done && s.tick >= s.task.due) {
        s.task.done = true;
        add(s.evidence, "orderchain");
        message += " Ирена: служебная цепочка восстановлена, материал в журнале.";
      }
      return { state: s, ok: true, message, passage };
    };
    if (s.ending && action !== "inspect") return fail("Дело завершено. Загрузите сохранение, чтобы изменить решение.");
    switch (action) {
      case "move":
        if (value === s.location) return fail("Вы уже находитесь здесь.");
        if (!unlocked(s).includes(value)) return fail("Нет подтверждённого адреса или основания для посещения.");
        s.location = value;
        s.activeNpc = null;
        s.topic = null;
        if (value === "office") s.ship = "airlock";
        const first = !s.visited.includes(value);
        add(s.visited, value);
        return win("", first ? d.locations[value].thought : "", 1);
      case "talk":
        if (!available(s, value)) return fail("Сейчас этот собеседник недоступен.");
        s.activeNpc = value;
        s.topic = null;
        return win("", d.npcs[value].greeting);
      case "ship":
        if (s.location !== "office") return fail("Отсеки шаттла доступны на борту.");
        if (!shipRooms.includes(value)) return fail("На шаттле нет такого отсека.");
        s.ship = value;
        s.activeNpc = null;
        s.topic = null;
        return win();
      case "team": {
        if (s.location !== "office") return fail("Состав группы меняют на борту, у стойки в шлюзе.");
        const pick = Array.isArray(value) ? [...new Set(value.filter((id) => crewIds.includes(id)))] : [];
        if (pick.length !== 2) return fail("В порт идут двое: выберите двоих из экипажа.");
        s.team = pick;
        return win("Состав группы утверждён: " + pick.map((id) => d.npcs[id]?.name || id).join(" и ") + ".");
      }
      case "end-talk":
        s.activeNpc = null;
        s.topic = null;
        return win();
      case "topic": {
        const n = d.npcs[s.activeNpc];
        const t = n?.topics?.find((t) => t.id === value);
        if (!t || !has(s, t.requires || [])) return fail("Для этого вопроса пока нет основания.");
        if (s.talked.includes(value)) {
          s.topic = value;
          return win("Вы возвращаетесь к записанному ответу.", t.text);
        }
        if (t.style === "pressure" && s.heat >= 3) return fail("Собеседник требует присутствия представителя. Измените условия разговора.");
        add(s.talked, value);
        s.topic = value;
        (t.gives || []).forEach((id) => add(s.evidence, id));
        if (t.style === "pressure") {
          s.heat++;
          s.trust[s.activeNpc] = (s.trust[s.activeNpc] || 0) - 1;
        }
        return win(t.gives?.length ? "Новые сведения внесены в журнал." : "", t.text, t.time || 1);
      }
      case "take": {
        const o = d.locations[s.location].objects.find((o) => o.id === value);
        if (!o) return fail("Объект находится в другом месте.");
        if (!has(s, o.requires || [])) return fail(o.locked || "Пока нет основания для этого действия.");
        const id = o.evidence || o.id;
        if (!d.evidence[id]) return win("", o.text || d.locations[s.location].description);
        if (s.evidence.includes(id)) return win("Материал уже записан.", d.evidence[id].text);
        add(s.evidence, id);
        return win("Материал изъят и зарегистрирован.", d.evidence[id].thought || d.evidence[id].text, 1);
      }
      case "inspect":
        if (!s.evidence.includes(value) || !d.evidence[value]) return fail("Этот материал ещё не получен.");
        add(s.inspected, value);
        return win("", d.evidence[value].text + "\n\n" + (d.evidence[value].thought || ""));
      case "solve": {
        const p = d.puzzles[value?.id];
        if (!p || !has(s, p.requires || [])) return fail("Недостаточно исходных материалов для экспертизы.");
        if (s.puzzles.includes(value.id)) return fail("Экспертиза уже завершена. Результат в журнале.");
        if (s.location !== "office" && s.location !== p.location) return fail("Экспертизу проводят в лаборатории шаттла.");
        if (!p.options.some((o) => o.id === value.answer)) return fail("Выберите проверяемую версию.");
        const stamp = p.requires.map((id) => (s.evidence.includes(id) ? id : "")).join("|") + ":" + s.inspected.filter((id) => p.requires.includes(id)).length;
        if (s.failed[value.id] === stamp)
          return fail("После неудачи осмотрите исходные материалы в инвентаре: новая подготовка нужна перед повторной экспертизой.");
        if (value.answer !== p.answer) {
          s.failed[value.id] = stamp;
          s.tick += 2;
          return win(
            "Несогласованный результат. Потеряно время; осмотрите исходники и пересмотрите метод.",
            p.failure || "Эта версия не согласуется со всеми наблюдениями.",
          );
        }
        add(s.puzzles, value.id);
        (p.awards || []).forEach((id) => add(s.evidence, id));
        s.quality++;
        return win("Экспертиза завершена. Результат добавлен в журнал.", p.success || d.evidence[p.awards[0]].text, 2);
      }
      case "deduce": {
        const c = d.conclusions[value?.id];
        if (!c) return fail("Неизвестная версия.");
        if (s.location !== "office") return fail("Сопоставьте материалы на рабочем столе шаттла.");
        if (s.conclusions.includes(value.id)) return fail("Вывод уже подтверждён.");
        if (!Array.isArray(value.evidence) || !value.evidence.every((id) => s.evidence.includes(id))) return fail("Выберите только полученные материалы.");
        const attempt = "deduce:" + value.id + ":" + [...value.evidence].sort().join(",");
        if (s.failed[attempt]) return fail("Эта комбинация уже проверена и не подтвердилась. Измените основание версии.");
        if (value.evidence.length !== c.requires.length || !c.requires.every((id) => value.evidence.includes(id))) {
          s.failed[attempt] = true;
          return win(
            "Версия не подтверждена: эти материалы не связывают все звенья. Проверка отняла время.",
            "Я связал похожие слова вместо независимых фактов. Эту комбинацию повторять бессмысленно; нужно изменить основания.",
            1,
          );
        }
        add(s.conclusions, value.id);
        s.quality++;
        return win("Версия подтверждена независимыми материалами.", c.thought || c.text || c.title, 1);
      }
      case "assign":
        if (s.location !== "office") return fail("Поручение согласуется на борту.");
        if (!known(s, "transfer")) return fail("Ирене нужен подтверждённый предмет поиска: установите подмену перевозки.");
        if (s.task) return fail(s.task.done ? "Ответ уже в журнале." : "Ирена ещё восстанавливает служебную цепочку.");
        s.task = { due: s.tick + taskTime(s), done: false };
        return win("Ирена проверяет подписи через независимый служебный архив. Понадобятся четыре значимых действия.");
      case "prepare":
        if (!d.puzzles[value] || !s.failed[value]) return fail("Повторная подготовка пока не требуется.");
        if (s.location !== "office") return fail("Подготовьте экспертизу в лаборатории шаттла.");
        delete s.failed[value];
        return win("Проведены очистка прибора и независимый повторный отбор. Можно изменить метод анализа.", "", 2);
      case "wait":
        return win("Прошло десять минут. Если перевозка уже ушла, материалы позволят установить её маршрут для перехвата.", "", 1);
      case "sanction": {
        if (s.location !== "office") return fail("Запрос отправляется с защищённого терминала шаттла.");
        if (s.sanction) return fail("Санкция уже получена.");
        const grounds = ["warrant", "bioreport", "archivecopy"];
        if (!Array.isArray(value) || !value.every((id) => s.evidence.includes(id))) return fail("Приложите полученные материалы.");
        const request = "sanction:" + Number(known(s, "forgery")) + ":" + value.slice().sort().join(",");
        if (s.failed[request]) return fail("Центр уже отказал по этому пакету. Дополните основания.");
        if (!known(s, "forgery") || value.length < sanctionNeed(s) || !value.every((id) => grounds.includes(id))) {
          s.failed[request] = true;
          return win(
            "Центр отказал в санкции. Требуются независимое доказательство подлога, подлинный образец полномочий и оспариваемый приказ.",
            "Ответ сухой: связь с угрозой установлена недостаточно. Я могу продолжить добровольные беседы, проверить архив и подать дополненный пакет. Отказ в одной мере — не приказ закрыть глаза.",
            2,
          );
        }
        s.sanction = true;
        return win(
          "Центр разрешает сохранение архива и принудительный допрос Восса. Носители не уничтожать, иностранных представителей не задерживать.",
          "Чужая печать не делает нас хозяевами порта. В санкции перечислены ровно три действия. За четвёртое отвечать буду сам.",
          2,
        );
      }
      case "interview": {
        if (s.location !== "registry") return fail("Восс находится в управлении реестра.");
        if (!known(s, "forgery")) return fail("Без доказанного подлога Восс не обязан отвечать на обвинение.");
        if (s.interview) return fail("Допрос завершён. Повтор без новых условий недоступен.");
        if (!["rapport", "evidence", "pressure"].includes(value)) return fail("Выберите подход.");
        const fp = "interview:" + value;
        if (s.failed[fp]) return fail("Этот приём уже применён. Измените основания, а не повторяйте давление.");
        if (value === "pressure" && !s.sanction) {
          s.failed[fp] = true;
          s.heat += 2;
          s.activeNpc = "chief";
          s.topic = null;
          add(s.evidence, "falseconfession");
          return win(
            "Восс повторил продиктованную версию. Это неподтверждённое признание, допрос не завершён.",
            "Он смотрит не на мой документ — на дверь. Страх заставил его говорить, но не заставил говорить правду. Такое признание не выдержит проверки.",
            2,
          );
        }
        if (value === "evidence" && !s.evidence.includes("orderchain"))
          return fail("Восс ссылается на чужую подпись. Нужна восстановленная служебная цепочка Ирены.");
        if (value === "rapport" && !s.evidence.includes("payment")) return fail("Чтобы предложить сделку, выясните, что связывает Восса с заказчиком.");
        s.interview = true;
        s.activeNpc = "chief";
        s.topic = null;
        add(s.evidence, "confession");
        return win(
          "Показания сопоставлены с внешними доказательствами.",
          "Восс не продавал больных. Он передавал инженеров, знавших, как остановить узлы критической инфраструктуры нескольких лунных поселений. Антон Рей отказался подписать акт — поэтому седьмая строка должна была исчезнуть. «Мне обещали, что это эвакуация», — говорит Восс. Но платёж пришёл до карантина.",
          2,
        );
      }
      case "combat": {
        const id = value?.id,
          plan = value?.plan;
        if (!["cargo", "relay"].includes(id) || !["protect", "evidence", "force", "coordinate", "withdraw"].includes(plan)) return fail("Недопустимый план.");
        if (s.location !== (id === "cargo" ? "warehouse" : "relay")) return fail("Столкновение происходит в другом отсеке.");
        if (s.combat.some((x) => x.startsWith(id + ":"))) return fail("Сцена уже разрешена, последствия остаются.");
        if (id === "cargo" && !known(s, "transfer")) return fail("Сначала установите, кого и зачем перевозят.");
        if (id === "relay" && !known(s, "route")) return fail("Сначала восстановите маршрут.");
        if (plan === "coordinate" && !s.sanction) return fail("Для согласованного задержания нужна санкция и законная поддержка охраны.");
        add(s.combat, id + ":" + plan);
        if (id === "relay") {
          if (plan === "force") {
            s.injury += 2;
            s.heat += 3;
            add(s.history, "relay-damaged");
            return win(
              "Подготовленный противник ранил героя. Основной накопитель уничтожен, архивный заголовок канала сохранился для экспертизы.",
              "Первое движение охранника — ложное. Я замечаю слишком поздно: удар приходит с другой стороны. Кровный переживёт такую рану, но проводник уже обуглен. На резервном табло остаётся заголовок передачи. Силой я захватил комнату. Истину придётся восстанавливать отдельно.",
              2,
            );
          }
          if (plan === "protect") {
            add(s.history, "technician-protected");
            s.trust.technician = (s.trust.technician || 0) + 2;
            return win(
              "Техник выведен из линии огня. Противник ушёл через сервисную шахту.",
              "Техник тянется не к оружию, а к аварийному рубильнику. Оттаскиваю его от панели в тот миг, когда охранник стреляет. Разряд перерезает кабель. Живой специалист объяснит, что именно пытались стереть; задержания сегодня не будет.",
              1,
            );
          }
          if (plan === "coordinate") {
            add(s.history, "relay-secured");
            return win(
              "Рейн перекрыл обход, герой отключил внешний передатчик. Ретранслятор и техник сохранены.",
              "Я показываю Рейну решётку под вторым мостком. Подготовленный боец ждёт атаки сверху, а слышит защёлку у единственного выхода. Пока он выбирает цель, я выдёргиваю питание внешнего передатчика. Мы забираем комнату без выстрела.",
              1,
            );
          }
          if (plan === "evidence") {
            add(s.history, "relay-copy");
            s.heat++;
            return win(
              "Копия заголовка сохранена. Охранник успел передать сигнал тревоги; политическая напряжённость выросла.",
              "Не пытаюсь выиграть секунду у чужой реакции. Подключаю резервный порт, пока охранник держит меня на прицеле. Копия уходит в шаттл, вместе с ней — тревога неизвестному адресату. Доказательство у нас. Преимущество внезапности потеряно.",
              1,
            );
          }
          return win(
            "Группа отходит. Судебное сохранение архива и техническая экспертиза остаются возможны.",
            "Его прицел следует не за мной — за корпусом передатчика. Достаточно одного импульса, чтобы исчезли и данные, и техник. Отхожу. Теперь нужен законный доступ к резервной записи, а не ещё один победный труп.",
            1,
          );
        }
        if (plan === "force") {
          s.injury++;
          s.heat += 2;
          return win(
            "Противник обезврежен, но повреждён носитель. Архивная копия остаётся альтернативным доказательством.",
            "Ближайшего человека я сбиваю с ног раньше, чем он поднимает оружие. Подготовленный второй боец стреляет в несущий поручень. Осколок входит под ребро; контейнер падает и гаснет. Я выиграл секунды. Не всё, что в этих секундах находилось.",
            1,
          );
        }
        if (plan === "protect" || plan === "coordinate") {
          add(s.evidence, "cargowitness");
          return win(
            "Свидетель сохранён. Часть охраны ушла; их маршрут можно восстановить.",
            "Рейн понимает мой жест без команды. Он закрывает проход, я вывожу человека из линии огня. Нельзя одновременно держать свидетеля и ловить уходящий носитель. Я выбираю того, кто ещё сможет говорить.",
            1,
          );
        }
        if (plan === "evidence") {
          add(s.evidence, "camera");
          return win(
            "Носитель сохранён. Свидетель эвакуирован местной медициной; показания потребуют запроса.",
            "Я накрываю порт ладонью, прерывая стирание. За спиной слышен шаг. Противник ушёл. На этот раз счёт ведётся не телами, а тем, что мы сумеем доказать.",
            1,
          );
        }
        return win(
          "Конфликт предотвращён отходом. Путь через документы и санкцию остаётся.",
          "Я вижу, как охранник ждёт моего первого движения. Для него я чудовище с чужим значком. Отступаю на шаг. Силы у меня достаточно; основания стрелять — нет.",
          1,
        );
      }
      case "finish":
        if (!endReady(s, value))
          return fail("Заключение не выдерживает проверки: не установлены местный организатор, показания или условия выбранной операции.");
        s.ending = value;
        const late = s.tick >= 132;
        s.endingPassage =
          d.endings[value].text +
          (value === "rescue"
            ? late
              ? "\n\nПеревозка уже покинула внутренний причал. Восстановленный маршрут позволяет передать перехват пограничному катеру; свидетель остаётся под защитой Рейна."
              : "\n\nРейн перекрывает шлюз до отхода транспорта. Группа инженеров остаётся в юрисдикции порта."
            : "");
        if (value === "rescue")
          s.endingPassage += s.sanction
            ? "\n\nВосс задержан в пределах выданной санкции. Внешнего адресата операции этот арест ещё не устанавливает."
            : "\n\nОснований для самостоятельного ареста Восса на нейтральной территории у меня нет. Материалы переданы дежурному арбитру; его свобода ограничена решением местной службы, а не моим значком.";
        if (value === "expose")
          s.endingPassage += late
            ? "\n\nТранспорт уже отошёл. Комиссия направляет заверенный запрос в следующий пункт приёма; публичность сохраняет давление, но вернуть людей тем же вечером не удаётся."
            : "\n\nВнешний слот заблокирован до отхода. Инженеры остаются под совместной охраной порта до медицинского осмотра и опроса.";
        if (value === "covert")
          s.endingPassage += late
            ? "\n\nОтправка уже состоялась. Восс выдаёт код отзыва, Мара передаёт его по местному каналу перевозчика. Возвращение займёт время, и теперь экипаж будет проверять каждую строку обратного списка."
            : "\n\nКод отмены успевает до запуска буксира. По соглашению люди возвращаются в порт; ответственность за закрытый режим расследования остаётся на мне.";
        if (s.heat >= 3)
          s.endingPassage +=
            "\n\nМетоды операции вызвали служебную проверку. Центр принимает независимые доказательства, но ограничивает ваше право на самостоятельные задержания до разбора. Рейн требует обсудить правила следующего выхода.";
        if (s.injury >= 2)
          s.endingPassage +=
            "\n\nКорвин ждёт у шлюза с хирургическим набором. «Вы ещё способны стоять, — говорит он. — Это не значит, что внутри ничего не порвано». На следующий выход я пойду после лечения, а не вместо него.";
        return win("Дело завершено.", s.endingPassage, 1);
      default:
        return fail("Действие недоступно.");
    }
  }
  window.CHAPTER_ENGINE = {
    cleanPrior,
    taskTime,
    sanctionNeed,
    fresh,
    restore,
    dispatch,
    unlocked,
    period,
    available,
    availableTopics,
    endReady,
    has,
    known,
    clock,
    departureKnown,
    teamOf,
    shipRooms,
    crewRoom,
  };
})();
