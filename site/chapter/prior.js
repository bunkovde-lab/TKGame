/* Связка с прологом: итоги пролога, предыстория с выбором на старте главы, реплики с учётом прошлого */
(() => {
'use strict';
const AUTO='tkgame-chapter1-auto-v1', OUTCOME='tkgame-prologue-outcome', INTRO='tkgame-chapter1-intro';
const E=()=>window.CHAPTER_ENGINE;
const crewIds=['mara','corvin','irena','rein'];
const names={mara:'Мара',corvin:'Корвин',irena:'Ирена',rein:'Рейн'};
const full={mara:'Мара Вель',corvin:'Элиас Корвин',irena:'Ирена Соль',rein:'Гален Рейн'};
const likes={mara:['calc','law'],corvin:['mercy','calc'],irena:['law','mercy'],rein:['calc','law']};
const pathName={law:'по уставу',calc:'по расчёту',mercy:'по совести'};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const T={
  title:'Предыстория',
  lead:'Новый командир контрразведки Багряных домов принял группу погибшего Северина Даля и приказ Центра: проверить рейс LN-407 на Лунном арбитраже. За одну ночь на шаттле он узнал экипаж, нашёл первые следы Узла-9 и состыковался с портом.',
  pickLead:'Вы начинаете сразу с главы I. Выберите, как прошёл пролог: от этого зависят доверие экипажа, Мира и Центр.',
  fromPrologue:'Ваш пролог завершён. Глава I начнётся с этими последствиями.',
  q:{
    path:['Как вы ответили Центру при назначении?',{law:'По уставу',calc:'По расчёту',mercy:'По совести'}],
    team:['Кого взяли с собой на станцию? (двоих)',null],
    mira:['Чем кончился ночной разговор с Мирой?',{full:'Она доверилась',partial:'Отдала список',shut:'Закрылась'}],
    center:['Что вы ответили на вызов Центра об Узле-9?',{law:'Подчинились',calc:'Ответили формально',mercy:'Прикрыли экипаж',none:'Вызова не было'}],
    late:['Как прошла стыковка?',{no:'Успели к слоту',yes:'Опоздали'}]
  },
  start:'Начать главу I', resume:'Продолжить сохранённую главу', prologue:'Сыграть пролог',
  effects:{
    mira:{full:'Мира доверяет вам, её показание уже в деле.',partial:'Мира ждёт вас утром в зале ожидания.',shut:'Мира насторожена после ночного допроса.'},
    center:{law:'Центр доверяет вам: для санкции хватит двух оснований из трёх.',calc:'Центр ждёт отчёта и пока не вмешивается.',mercy:'Центр недоволен: напряжённость с первого часа выше.',none:''},
    late:'Слот упущен: проверка начинается на час позже, в 09:00.',
    irena:{high:'Ирена восстановит цепочку приказа быстрее.',low:'Ирена работает строго по регламенту, медленнее.',mid:''}
  }
};

function mood(path,team,id){
  const [like,dislike]=likes[id];
  let m=path===like?2:path===dislike?0:1;
  if(team.includes(id))m++;
  return m>=2?'high':m===1?'mid':'low';
}
function build(c){
  const team=c.team.slice(0,2);
  return {source:c.source||'chosen',path:c.path,team,mira:c.mira,center:c.center==='none'?null:c.center,late:c.late==='yes'||c.late===true,
    mood:c.mood||Object.fromEntries(crewIds.map(id=>[id,mood(c.path,team,id)])),found:c.found||[]};
}
function readOutcome(){try{const raw=JSON.parse(localStorage.getItem(OUTCOME)||'null');return raw&&raw.version===1?raw:null;}catch{return null;}}

function summary(p){
  if(!p)return '';
  const team=p.team.length===2?names[p.team[0]]+' и '+names[p.team[1]]:'двое из экипажа';
  const mira={full:'рассказала, что вчера в 16:18 видела шесть носилок у терминала 6 и что отец назвал их инженерами',partial:'отдала список семи имён и обещала рассказать остальное утром',shut:'после жёсткого разговора бросила вам чип со списком и ушла'}[p.mira];
  const center={law:'Позже Центр потребовал закрыть дело Узла-9, и вы подчинились по уставу.',calc:'Позже Центр потребовал закрыть дело Узла-9; вы ответили формально и продолжили работу.',mercy:'Позже Центр потребовал закрыть дело Узла-9; вы взяли ответственность на себя и прикрыли экипаж.'}[p.center]||'';
  const found=[];
  if(p.found.includes('autopsy'))found.push('Даль погиб до разгерметизации');
  if(p.found.includes('breachLog'))found.push('переборку на Узле-9 закрыли допуском Центра');
  if(p.found.includes('routes'))found.push('позывным Мары пользовался кто-то другой');
  return 'Ночью шаттл '+(p.late?'упустил слот и сел на резервный причал':'занял стыковочный слот вовремя')+'. Приказ о назначении вы приняли '+pathName[p.path]+'. '+
    'В шлюзе вас ждала Мира Рей, дочь пассажира рейса LN-407 Антона Рея. С вами были '+team+'. Мира '+mira+'. '+center+
    (found.length?' Из материалов Даля вы уже знаете: '+found.join('; ')+'.':'')+' Утром порт откроет реестры.';
}
function effects(p){
  const out=[T.effects.mira[p.mira],T.effects.center[p.center||'none'],p.late?T.effects.late:'',T.effects.irena[p.mood.irena]];
  for(const id of crewIds)out.push(full[id]+': '+({high:'на вашей стороне',mid:'присматривается',low:'держит дистанцию'})[p.mood[id]]+'.');
  return out.filter(Boolean);
}

/* Реплики с учётом пролога */
const greet={
  mira:{full:'Вы пришли, как обещали. Я видела отца сегодня утром: он не может даже застегнуть рукав без помощи. А в ведомости он уже передан. Ночью я сказала вам не всё. Спрашивайте.',
    partial:'Вы вернулись. Хорошо. Я видела отца сегодня. Он не мог подписать разрешение на передачу, что бы ни писали в реестре.',
    shut:'Опять вы. Ночью ваши люди на меня давили. Скажете, что отец уже улетел? Я видела его сегодня. Он не мог подписать разрешение на передачу.'},
  crew:{
    mara:{high:'После стыковки я за вами, командир.',low:'Посмотрим, как вы справитесь здесь.'},
    corvin:{high:'На шаттле вы меня слушали. Здесь я тоже рядом.',low:'Надеюсь, на станции вы будете осторожнее с выводами.'},
    irena:{high:'Ваши поручения я беру первыми, цепочку восстановлю быстрее.',low:'Поручения выполню по регламенту. Не быстрее.'},
    rein:{high:'Скажите, кого прикрывать, и я не спрошу дважды.',low:'Приказы выполню. Доверие — отдельный разговор.'}
  }
};
function greeting(state,id,npc){
  const p=state?.prior;if(!npc)return '';
  if(!p){const D=window.CHAPTER_DATA;return state?.location!=='office'&&D?.companionLines?.[id]?.[state.location]||npc.greeting||'';}
  if(id==='mira')return greet.mira[p.mira]||npc.greeting;
  const extra=greet.crew[id]?.[E()?.moodOf?E().moodOf(state,id):p.mood[id]];
  const D=window.CHAPTER_DATA;
  const base=state.location!=='office'&&D?.companionLines?.[id]?.[state.location]||npc.greeting||'';
  return base+(extra?' '+extra:'');
}
function opening(state,text){const s=summary(state?.prior);return s?s+'\n\n'+text:text;}

/* Экран выбора на старте */
function overlay(){
  const params=new URLSearchParams(location.search);
  let hasSave=false;try{hasSave=!!localStorage.getItem(AUTO);}catch{}
  const outcome=readOutcome();
  const fromPrologue=params.get('from')==='prologue'&&outcome;
  if(hasSave&&!fromPrologue&&params.get('prequel')!=='1')return false;
  const base=outcome?{source:'prologue',path:outcome.path,team:outcome.team,mira:outcome.mira,center:outcome.center||'none',late:outcome.late?'yes':'no',mood:outcome.mood,found:outcome.found}
    :{path:'law',team:['corvin','rein'],mira:'partial',center:'none',late:'no'};
  const choice={...base,team:[...(base.team||[])]};
  let changed=false;
  const el=document.createElement('div');el.className='prequel';el.setAttribute('role','dialog');el.setAttribute('aria-label',T.title);
  document.body.appendChild(el);
  const seg=(key,opts)=>'<div class="pq-seg">'+Object.entries(opts).map(([v,l])=>'<button type="button" data-pq="'+key+'" data-v="'+v+'" class="'+(String(choice[key])===v?'on':'')+'" aria-pressed="'+(String(choice[key])===v)+'">'+esc(l)+'</button>').join('')+'</div>';
  const paint=()=>{
    const locked=fromPrologue;
    const p=build(choice);
    el.innerHTML='<div class="pq-card"><div class="pq-kicker">Мир Раскола · Глава I</div><h1>'+esc(T.title)+'</h1><p class="pq-lead">'+esc(T.lead)+'</p>'+
      (locked?'<p class="pq-note">'+esc(T.fromPrologue)+'</p>':
        '<p class="pq-note">'+esc(T.pickLead)+(outcome?' Ответы подставлены из вашего пролога.':'')+'</p>'+
        Object.entries(T.q).map(([key,[label,opts]])=>'<div class="pq-q"><span>'+esc(label)+'</span>'+(key==='team'?
          '<div class="pq-seg">'+crewIds.map(id=>'<button type="button" data-pq="team" data-v="'+id+'" class="'+(choice.team.includes(id)?'on':'')+'" aria-pressed="'+choice.team.includes(id)+'">'+esc(names[id])+'</button>').join('')+'</div>':seg(key,opts))+'</div>').join(''))+
      '<div class="pq-story"><p>'+esc(summary(p))+'</p><ul>'+effects(p).map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul></div>'+
      '<div class="pq-actions"><button type="button" class="btn primary" data-pq="start"'+(p.team.length===2?'':' disabled')+'>'+esc(T.start)+'</button>'+
      (hasSave?'<button type="button" class="btn" data-pq="resume">'+esc(T.resume)+'</button>':'')+
      '<a class="btn" href="../prologue/">'+esc(T.prologue)+'</a></div></div>';
  };
  paint();
  el.addEventListener('click',ev=>{
    const t=ev.target.closest('[data-pq]');if(!t)return;
    const key=t.dataset.pq,v=t.dataset.v;
    if(key==='start'){
      const p=build({...choice,mood:choice.source==='prologue'&&!changed?choice.mood:null});
      try{localStorage.setItem(AUTO,JSON.stringify(E().fresh(p)));sessionStorage.setItem(INTRO,'1');}catch{}
      location.replace(location.pathname);return;
    }
    if(key==='resume'){location.replace(location.pathname);return;}
    changed=true;
    if(key==='team'){choice.team=choice.team.includes(v)?choice.team.filter(x=>x!==v):[...choice.team,v].slice(-2);}
    else choice[key]=v;
    paint();
  });
  return true;
}

window.CHAPTER_PRIOR={greeting,opening,summary,build,overlay,introPending:()=>{try{const v=sessionStorage.getItem(INTRO);sessionStorage.removeItem(INTRO);return v==='1';}catch{return false;}}};
})();
