(() => {
'use strict';
const E = window.PROLOGUE_ENGINE;
const C = window.PROLOGUE_CONTENT;
const app = document.querySelector('#app');
const dialog = document.querySelector('#panel');
const status = document.querySelector('#status');
const autoKey = 'tkgame-prologue-auto-v1';
const manualKey = 'tkgame-prologue-manual-v1';
const esc = value => String(value ?? '').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const btn = (action,value,label,options={}) => '<button type="button" class="btn '+(options.primary?'primary':'')+'" data-act="'+esc(action)+'" data-value="'+esc(value)+'"'+(options.disabled?' disabled':'')+'>'+esc(label)+'</button>';
const p = value => '<p>'+esc(value)+'</p>';
const card = (title,body) => '<article class="card stack"><h3>'+esc(title)+'</h3>'+body+'</article>';
const props = {badge:'badge',sample:'sample',lab:'scanner',desk:'desk',map:'navigation',reader:'reader'};
const propArt = id => props[id] ? '<img class="prop" src="assets/prop-'+props[id]+'.webp" alt="">' : '';
let state = E.fresh();
let storageAvailable = true;
try { const saved = localStorage.getItem(autoKey); if(saved) state=E.restore(JSON.parse(saved)); }
catch { storageAvailable=false; }
let activePanel = '';
let documentId = '';
let thoughtOpen = !state.visited.includes(state.room);
let speechPage = 0;
let compare = {same:'',different:''};
let toastTimer;
const thoughts = {badge:'Мой допуск имеет силу здесь, на борту. В порту это прежде всего способ представиться.',sample:'Пустой сканер тоже может показать красивую картинку. Мне нужен известный образец, чтобы ей поверить.',order:'Центр назвал срок и объект проверки. Остальное мне придётся добыть на месте.',deduction:'Совпал рейс. Разошлась причина перевозки. Теперь нужно понять, кто мог менять запись.'};
const fieldLabels = {voyage:'Идентификатор рейса',cargo:'Назначение груза',time:'Время выгрузки'};
const channelLabels = {sample:'Канал кассеты',baseline:'Эталонный канал',noise:'Канал фонового шума'};
const fixtures = {
  office:[['terminal','Терминал Центра',31,43],['desk','Рабочий стол',52,59],['badge','Идентификатор',67,70],['diary','Личный дневник',22,66]],
  cockpit:[['map','Карта и маршрут',34,53],['docking','Панель стыковки',59,67]],
  lab:[['lab','Криминалистический сканер',36,52],['sample','Контрольная кассета',54,67]],
  analysis:[['analysis','Пост аналитика',35,52]],
  airlock:[['reader','Считыватель шлюза',40,53],['equipment','Стойка снаряжения',18,58]]
};
function persist(key=autoKey) {
  try { localStorage.setItem(key,JSON.stringify(state)); storageAvailable=true; return true; }
  catch {storageAvailable=false; return false;}
}
function notify(message) {
  const current=dialog.open ? dialog.querySelector('#panel-feedback') ?? status : status;
  status.textContent='';
  current.textContent=message || '';
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>current.textContent='',4400);
}
function openPanel(id) {
  activePanel=id;
  paintPanel();
  if (!dialog.open) dialog.showModal();
}
function closePanel() {
  if (dialog.open) dialog.close();
  activePanel='';
}
function actor(crewId,speaking) {
  const crew=C.crew[crewId];
  const period=E.period(state.tick);
  const offDuty=(period==='Ночь'||period==='Вечер') && !(
    crewId==='mara'&&state.nav || crewId==='corvin'&&state.sampleReady || crewId==='irena'&&state.task&&!state.task.done || crewId==='rein'&&state.reader
  );
  const image='assets/crew-'+crewId+(offDuty?'-off':'')+(speaking&&state.pose!=='neutral'?'-talk':'')+'.webp';
  const inner='<img src="'+image+'" alt=""><span>'+esc(crew.name)+'</span>';
  return speaking?'<div class="actor speaking '+esc(state.pose)+'">'+inner+'</div>':
    '<button class="actor" data-act="talk" data-value="'+crewId+'" aria-label="Поговорить: '+esc(crew.name)+'">'+inner+'</button>';
}
function render() {
  const period=E.period(state.tick);
  const head='<header class="top"><span class="brand">◈ TKGame · Мир Раскола</span><span class="top-title">Дела контрразведки / Пролог</span><small>'+esc(period)+'</small></header>';
  if (state.intro<C.intro.length || state.docked) {
    const end=state.docked;
    const frame=end?{title:'Стыковка завершена',text:'Шлюз станции принял захваты. У вас есть приказ, рабочая версия и материалы экипажа. Первое дело начнётся за этой дверью.'}:C.intro[state.intro];
    app.innerHTML='<main class="game">'+head+'<section class="scene intro" style="--art:url(assets/'+(end?'dock':'intro-'+state.intro)+'.webp)"><div class="intro-copy"><div class="kicker">'+
      (end?'Конец пролога':'Пролог · '+(state.intro+1)+' / '+C.intro.length)+'</div><h1>'+esc(frame.title)+'</h1>'+p(frame.text)+'<div class="actions">'+
      (end?btn('panel','system','Сохранения')+'<a class="btn-link" href="../">К тестовой версии</a>':
        btn('next-intro','',state.intro===C.intro.length-1?'Войти в кабинет':'Продолжить →',{primary:true}))+'</div></div></section></main>';
    return;
  }
  const room=C.rooms[state.room];
  const crewId=Object.keys(C.crew).find(id=>C.crew[id].room===state.room);
  const exits=E.adjacent(state.room).map(id=>btn('move',id,'↗ '+C.rooms[id].name)).join('');
  const hotspots=fixtures[state.room].map(([id,label,x,y])=>{
    const object=C.items[id];
    return '<button class="hotspot" style="--x:'+x+'%;--y:'+y+'%" data-act="panel" data-value="'+id+'"><b aria-hidden="true">'+(object&&state.inventory.includes(id)?'✓':'◇')+'</b><span>'+esc(label)+'</span></button>';
  }).join('');
  const crew=state.crew && C.crew[state.crew];
  const topic=crew?.topics[state.topic];
  const pages=topic?.answer.match(/[^.!?]+(?:[.!?]+|$)/gu)?.reduce((list,sentence)=>{
    if (list.length && list.at(-1).length+sentence.length<145) list[list.length-1]+=sentence;
    else list.push(sentence.trimStart());
    return list;
  },[]) ?? [];
  const hasMore=speechPage<pages.length-1;
  const conversation=crew?'<section class="conversation" aria-label="Разговор"><div class="kicker">'+esc(crew.role)+'</div>'+
    p(pages[speechPage] ?? 'Можно поговорить о задании или спросить, что привело собеседника на этот борт.')+
    '<div class="actions">'+(hasMore?btn('speech-next','','Дальше →',{primary:true}):crew.topics.map((entry,index)=>btn('topic',index,entry.question)).join(''))+
    (!hasMore&&state.crew==='irena'?btn('assign','','Поручить проверку ведомости',{disabled:!state.deduction||Boolean(state.task)}):'')+
    btn('panel','crew-bio','Досье')+btn('end-talk','','Завершить разговор')+'</div></section>':'';
  const thought=!crew&&thoughtOpen?'<div class="thought"><div class="kicker">Внутренний голос</div>'+p(room.thought)+btn('dismiss-thought','','Продолжить')+'</div>':'';
  const hud=[['hero','Герой'],['inventory','Инвентарь'],['journal','Журнал'],['map','Карта'],['ship','Шаттл'],['system','Меню']]
    .map(([id,label])=>btn('panel',id,label)).join('');
  app.innerHTML='<main class="game">'+head+'<section class="scene" aria-label="'+esc(room.name)+'" style="--art:url(assets/room-'+state.room+'.webp)">'+
    '<header><div class="kicker">Шаттл · '+esc(period)+'</div><h1>'+esc(room.name)+'</h1></header>'+
    (crew?actor(state.crew,true):hotspots+(crewId?actor(crewId,false):''))+
    conversation+thought+(crew?'':'<nav class="exits" aria-label="Двери">'+exits+'</nav>')+
    '</section><nav class="hud" aria-label="Инструменты">'+hud+'</nav></main>';
}
function shelf(id) {
  const item=C.items[id];
  const held=state.inventory.includes(id);
  const destination=id==='badge'?'airlock':'lab';
  return propArt(id)+p(item.description)+
    '<div class="actions">'+(!held?btn('take',id,'Взять',{primary:true}):
      btn('inspect',id,'Осмотреть')+btn('use',id,id==='badge'?'Предъявить считывателю':'Установить в сканер',{disabled:state.room!==destination}))+'</div>'+
    (held&&state.inspected.includes(id)?card('Внутренний голос',p(thoughts[id])):'');
}
function paintPanel() {
  let title='';
  let body='';
  switch(activePanel) {
    case 'terminal':
      title='Терминал Центра';
      body=card(C.documents.order.title,p(C.documents.order.text))+
        (state.accepted?p('Приказ принят. Ведомости доступны на рабочем столе.'):btn('accept','','Принять приказ',{primary:true}));
      break;
    case 'desk':
      title='Рабочий стол';
      body=propArt('desk')+(state.accepted?'<div class="grid">'+['manifestPort','manifestInternal'].map(id=>
        card(C.documents[id].title,'<p class="sheet">'+esc(C.documents[id].text)+'</p>'+btn('read',id,'Зафиксировать источник'))).join('')+'</div>'+
        (state.deduction?card('Подтверждённый факт',p('Ведомости относятся к одному рейсу. Назначение груза в записях различается. Ирена может проверить происхождение записи.')):
          '<div class="grid">'+['same','different'].map(id=>'<label>'+ (id==='same'?'Что совпадает?':'Какое расхождение важно для дела?')+'<select data-compare="'+id+'"><option value="">Выбрать поле</option>'+
            E.manifestFields.map(field=>'<option value="'+field+'"'+(compare[id]===field?' selected':'')+'>'+esc(fieldLabels[field])+'</option>').join('')+'</select></label>').join('')+
            '</div>'+btn('combine','','Проверить связь',{primary:true})):p('Сначала примите приказ Центра. Тогда обе версии ведомости появятся на столе.'));
      break;
    case 'inventory':
      title='Инвентарь';
      body=state.inventory.length?'<div class="grid">'+state.inventory.map(id=>card(C.items[id].name,shelf(id))).join('')+'</div>':p('Вещей пока нет. Идентификатор лежит в кабинете, контрольная кассета — в лаборатории.');
      break;
    case 'badge':
    case 'sample':
      title=C.items[activePanel].name;
      body=shelf(activePanel);
      break;
    case 'lab':
      title='Лабораторный сканер';
      body=propArt('lab')+(state.lab?card('Калибровка подтверждена',p(C.documents.lab.text)):p('Установите контрольную кассету. Эталонный канал должен дать опорный профиль, прежде чем сканер примет реальную улику.')+
        (state.sampleReady?'<div class="actions">'+E.labChannels.map(ch=>btn('calibrate',ch,channelLabels[ch])).join('')+'</div>':
        btn('use','sample','Установить кассету',{disabled:!state.inventory.includes('sample')})));
      break;
    case 'analysis':
      title='Пост аналитика';
      body=state.task?.done?card(C.documents.analysis.title,p(C.documents.analysis.text)):
        state.task?p('Ирена сверяет маршрут запроса. Осталось действий: '+Math.max(0,state.task.due-state.tick)+'. Перемещение и другие значимые действия продвигают время.'):
        p('Сопоставьте две ведомости в кабинете, затем поручите Ирене найти источник записи.')+btn('assign','','Поручить проверку',{disabled:!state.deduction});
      if (state.task&&!state.task.done) body+=btn('wait','','Подождать');
      break;
    case 'reader':
      title='Шлюзовой считыватель';
      body=propArt('reader')+(state.reader?p('Бортовой допуск подтверждён.'):p('Предъявите служебный идентификатор.')+btn('use','badge','Предъявить идентификатор',{disabled:!state.inventory.includes('badge')}));
      break;
    case 'equipment':
      title='Стойка снаряжения';
      body=p('Рейн проверяет крепления. На вылет берут бортовой идентификатор и контрольное оборудование. Силовое снаряжение останется на шаттле до решения по допуску.');
      break;
    case 'map':
      title='Карта лунного коридора';
      body=propArt('map')+card('Шаттл → Лунный арбитраж',p('Известный пункт назначения: нейтральный порт. Подтвердить маршрут можно из кабины.')+
        (state.nav?p('Маршрут подтверждён.'):btn('nav','','Задать маршрут',{disabled:state.room!=='cockpit'||!state.accepted,primary:true})));
      break;
    case 'docking':
      title='Панель стыковки';
      body=card('Готовность',[
        [state.accepted,'Приказ принят'],[state.nav,'Маршрут задан'],[state.reader,'Служебный пропуск предъявлен'],
        [state.lab,'Сканер откалиброван'],[state.task?.done,'Проверка Иреной завершена']
      ].map(([ok,label])=>p((ok?'✓ ':'○ ')+label)).join(''))+btn('dock','','Стыковаться',{disabled:!E.dockReady(state),primary:true})+
      (state.task&&!state.task.done?btn('wait','','Дождаться результата'):'');
      break;
    case 'ship': {
      title='План шаттла';
      const positions = {cockpit:[50,15],lab:[22,50],office:[50,50],analysis:[78,50],airlock:[50,85]};
      body='<div class="ship-plan" aria-label="Схема помещений"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M50 15V85 M22 50H78" stroke="#d0b37c" stroke-width=".65" stroke-dasharray="2 1" fill="none"/></svg>'+
        Object.keys(positions).map(id=>{
          const [x,y]=positions[id];
          const here=state.room===id;
          return '<div style="--x:'+x+'%;--y:'+y+'%">'+btn('move',id,C.rooms[id].name+(here?' · вы здесь':''),{primary:here,disabled:here||!E.adjacent(state.room).includes(id)})+'</div>';
        }).join('')+'</div>'+p(C.rooms[state.room].description);
      break;
    }
    case 'crew-bio': {
      const crew=C.crew[state.crew];
      title=crew?.name ?? 'Досье экипажа';
      body=crew?card(crew.role,p(crew.bio)):'';
      break;
    }
    case 'hero':
      title='Оперативник Багряных домов';
      body=card('Свидетель пульса',p('Зрелый кровный. Опытный сотрудник клинической контрразведки. Здоров.')+
        p('Хищное восприятие позволяет замечать физиологические реакции. Их причину устанавливают наблюдением и проверкой.'))+
        '<div class="grid">'+['Воля','Устрашение','Проницательность','Убеждение','Аналитика','Физическая мощь'].map((label,index)=>card(label,p(['Высокая','Высокое','Высокая','Уверенное','Высокая','Высокая'][index]))).join('')+'</div>';
      break;
    case 'journal':
    case 'diary':
      title=activePanel==='diary'?'Личный дневник':'Журнал задания';
      body=activePanel==='diary'?C.diary.map(item=>card(item.title,p(item.text))).join(''):
        card('Текущее задание',p(!state.accepted?'Примите приказ в кабинете.':!state.deduction?'Сопоставьте ведомости на рабочем столе.':!state.task?.done?'Поручите Ирене проверить источник и дождитесь результата.':'Завершите подготовку и подтвердите стыковку.'))+
        '<div class="actions">'+state.documents.map(id=>btn('read',id,C.documents[id].title)).join('')+'</div>'+
        (C.documents[documentId]?card(C.documents[documentId].title,'<p class="sheet">'+esc(C.documents[documentId].text)+'</p>'):'')+
        (state.thoughts.length?card('Мысли инспектора',state.thoughts.map(entry=>C.rooms[entry]?.thought ?? thoughts[entry]).filter(Boolean).map(p).join('')):'');
      break;
    case 'system':
      title='Меню и сохранения';
      body=p(storageAvailable?'Прогресс сохраняется автоматически после игровых действий.':'Браузер ограничил доступ к сохранениям.')+
        '<div class="actions">'+btn('save','','Сохранить вручную')+btn('load','','Загрузить ручное сохранение')+
        '<a class="btn-link" href="../">К тестовой версии</a></div>';
      break;
  }
  dialog.innerHTML='<header class="panel-head"><h2 id="panel-title">'+esc(title)+'</h2>'+btn('close','','Закрыть')+'</header><div id="panel-feedback" role="status"></div><div class="panel-body">'+body+'</div>';
}
document.addEventListener('change',event=>{
  if(event.target.dataset.compare) compare[event.target.dataset.compare]=event.target.value;
});
dialog.addEventListener('close',()=>{activePanel='';});
document.addEventListener('click',event=>{
  const control=event.target.closest('[data-act]');
  if(!control) return;
  const {act,value}=control.dataset;
  if(act==='panel'){openPanel(value);return;}
  if(act==='close'){closePanel();return;}
  if(act==='speech-next'){speechPage++;render();return;}
  if(act==='dismiss-thought'){thoughtOpen=false;render();return;}
  if(act==='save'){notify(persist(manualKey)?'Ручное сохранение записано.':'Сохранение недоступно.');return;}
  if(act==='load'){
    try {
      const raw=localStorage.getItem(manualKey);
      if(!raw){notify('Ручного сохранения пока нет.');return;}
      state=E.restore(JSON.parse(raw));
      speechPage=0;thoughtOpen=false;
      closePanel();persist();render();notify('Ручное сохранение загружено.');
    }catch{notify('Не удалось прочитать ручное сохранение.');}
    return;
  }
  const input=act==='combine'?compare:act==='topic'?Number(value):value;
  const result=E.dispatch(state,act==='combine'?'deduce':act,input);
  if(result.ok){
    const firstVisit=act==='move'&&!state.visited.includes(value);
    state=result.state;
    if(act==='move'){thoughtOpen=firstVisit;closePanel();}
    if(act==='topic'||act==='talk'||act==='end-talk')speechPage=0;
    if(act==='dock')closePanel();
    if(act==='read')documentId=value;
    persist();
    render();
    if(activePanel)paintPanel();
  }
  notify(result.message);
});
render();
})();
