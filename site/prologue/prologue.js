(() => {
'use strict';
const E = window.PROLOGUE_ENGINE;
const C = window.PROLOGUE_CONTENT;
const app = document.querySelector('#app');
const dialog = document.querySelector('#panel');
const status = document.querySelector('#status');
const autoKey = 'tkgame-prologue-auto-v2';
const manualKey = 'tkgame-prologue-manual-v2';
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
let links = [];
let pendingLink = null;
let pickFrom = null;
let deskDrag = null;
let dialRot = 0;
let dialEntered = [];
let dialDrag = null;
let lastDialNum = 0;
let toastTimer;
const thoughts = {badge:'Мой допуск имеет силу здесь, на борту. В порту это прежде всего способ представиться.',sample:'Пустой сканер тоже может показать красивую картинку. Мне нужен известный образец, чтобы ей поверить.',order:'Центр назвал срок и объект проверки. Остальное мне придётся добыть на месте.',deduction:'Совпал рейс. Разошлась причина перевозки. Теперь нужно понять, кто мог менять запись.',trace:C.safe.trace,dalNote:C.safe.note};
const fixtures = {
  office:[['terminal','Терминал Центра',54,43],['desk','Рабочий стол',39,63],['badge','Идентификатор',28,77],['diary','Личный дневник',11,59],['trace','След на столе',84,40],['safe','Ящик стола',66,66]],
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
function actor(crewId) {
  const crew=C.crew[crewId];
  return '<button class="embedded-actor" data-act="talk" data-value="'+crewId+'" aria-label="Поговорить: '+esc(crew.name)+'"><span>'+esc(crew.name)+'</span></button>';
}
function render() {
  const period=E.period(state.tick);
  const head='<header class="top"><span class="brand">◈ TKGame · Мир Раскола</span><span class="top-title">Дела контрразведки / Пролог</span><small>'+esc(period)+'</small></header>';
  if (state.intro<C.intro.length || state.docked) {
    const end=state.docked;
    const frame=end?{title:'Стыковка завершена',text:'Шлюз станции принял захваты. У вас есть приказ, рабочая версия и материалы экипажа. Первое дело начнётся за этой дверью.'}:C.intro[state.intro];
    app.innerHTML='<main class="game">'+head+'<section class="scene intro" style="--art:url(assets/'+(end?'dock':'intro-'+state.intro)+'.webp)"><div class="intro-copy"><div class="kicker">'+
      (end?'Конец пролога':'Пролог · '+(state.intro+1)+' / '+C.intro.length)+'</div><h1>'+esc(frame.title)+'</h1>'+p(frame.text)+'<div class="actions">'+
      (end?btn('restart','','Начать пролог заново',{primary:true})+btn('panel','system','Сохранения')+'<a class="btn-link" href="../">К тестовой версии</a>':
        btn('next-intro','',state.intro===C.intro.length-1?'Вступить в командование':'Продолжить →',{primary:true}))+'</div></div></section></main>';
    return;
  }
  const room=C.rooms[state.room];
  const crewId=Object.keys(C.crew).find(id=>C.crew[id].room===state.room);
  const exits=E.adjacent(state.room).map(id=>btn('move',id,'↗ '+C.rooms[id].name)).join('');
  const hotspots=fixtures[state.room].filter(([id])=>id!=='safe'||state.safeFound).map(([id,label,x,y])=>{
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
  const conversation=crew?'<section class="conversation" aria-label="Разговор"><div class="speaker"><strong class="speaker-name">'+esc(crew.name)+'</strong><span class="speaker-role">'+esc(crew.role)+'</span></div>'+
    p(pages[speechPage] ?? (state.reply&&C.reactions[state.crew]?.[state.reply]) ?? crew.greeting ?? 'Командир. Слушаю вас.')+
    '<div class="reply">'+(hasMore?btn('speech-next','','Дальше →',{primary:true}):crew.topics.map((entry,index)=>btn('topic',index,entry.question)).join(''))+'</div><div class="conversation-tools actions">'+
    (!hasMore&&state.crew==='irena'?btn('assign','','Поручить проверку ведомости',{disabled:!state.deduction||Boolean(state.task)}):'')+
    btn('panel','crew-bio','Досье')+btn('end-talk','','Завершить разговор')+'</div></section>':'';
  const thought=!crew&&thoughtOpen?'<div class="thought"><div class="kicker">Внутренний голос</div>'+p(room.thought)+btn('dismiss-thought','','Продолжить')+'</div>':'';
  const hud=[['hero','Герой'],['inventory','Инвентарь'],['journal','Журнал'],['map','Карта'],['ship','Шаттл'],['system','Меню']]
    .map(([id,label])=>btn('panel',id,label)).join('');
  const sceneArt=crewId ? 'scene-'+state.room : 'room-'+state.room;
  app.innerHTML='<main class="game">'+head+'<section class="scene '+(crew?'scene-speaking ':'')+(crewId?'has-crew':'')+'" aria-label="'+esc(room.name)+'" style="--art:url(assets/'+sceneArt+'.webp)">'+
    '<header><div class="kicker">Шаттл · '+esc(period)+'</div><h1>'+esc(room.name)+'</h1></header>'+
    (crew?'':hotspots+(crewId?actor(crewId):''))+
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
function run(act,input,value){
  const result=E.dispatch(state,act,input);
  if(result.ok){
    const firstVisit=act==='move'&&!state.visited.includes(value);
    state=result.state;
    if(act==='move'){thoughtOpen=firstVisit;closePanel();}
    if(act==='next-intro'&&state.intro===C.intro.length)thoughtOpen=true;
    if(act==='topic'||act==='talk'||act==='end-talk')speechPage=0;
    if(act==='dock')closePanel();
    if(act==='read')documentId=value;
    if(act==='deduce'){links=[];pendingLink=null;}
    persist();
    render();
    if(activePanel)paintPanel();
  }
  notify(result.message);
  return result;
}
function trustLabel(value){
  return value<0?'Холоден. Держится подчёркнуто официально.':value===0?'Насторожен. Ещё не понял, чего от вас ждать.':value===1?'Присматривается. Ваш ответ Центру ему понравился.':'Доверяет больше, чем показывает.';
}
/* Рабочий стол: связи между ведомостями */
function linked(side,field){return links.some(l=>(side==='a'?l.a:l.b)===field)||(pendingLink&&(side==='a'?pendingLink.a:pendingLink.b)===field);}
function deskBody(){
  const D=C.desk;
  const col=(id,side)=>'<div class="desk-col"><h3>'+esc(C.documents[id].title)+'</h3>'+E.deskFields.map(f=>
    '<button type="button" class="desk-field'+(pickFrom&&pickFrom.side===side&&pickFrom.field===f?' picked':'')+(linked(side,f)?' linked':'')+
    '" data-desk-side="'+side+'" data-desk-field="'+f+'"><small>'+esc(D.labels[f])+'</small><span>'+esc(D[id][f])+'</span></button>').join('')+'</div>';
  return p(D.prompt)+'<div class="desk-board" id="desk-board">'+col('manifestPort','a')+'<svg class="desk-lines" id="desk-lines" aria-hidden="true"></svg>'+col('manifestInternal','b')+'</div>'+
    (pendingLink?'<div class="card desk-choose"><p><strong>'+esc(D.labels[pendingLink.a])+' ↔ '+esc(D.labels[pendingLink.b])+'.</strong> Как эти поля соотносятся?</p><div class="actions">'+
      btn('link-kind','same','Совпадает',{primary:true})+btn('link-kind','diff','Противоречит',{primary:true})+btn('link-cancel','','Отмена')+'</div></div>':'')+
    '<div class="desk-links">'+links.map((l,i)=>'<button type="button" class="link-chip '+l.kind+'" data-act="link-remove" data-value="'+i+'" aria-label="Убрать связь">'+
      esc(D.labels[l.a])+' ↔ '+esc(D.labels[l.b])+' · '+(l.kind==='same'?'совпадает':'противоречит')+' <b aria-hidden="true">✕</b></button>').join('')+'</div>'+
    '<div class="actions">'+btn('link-check','','Проверить связи ('+links.length+' из 2)',{primary:true,disabled:links.length!==2||Boolean(pendingLink)})+'</div>'+
    '<small>Тяните пальцем от поля к полю или нажмите поле слева, потом поле справа. Нажмите на связь внизу, чтобы убрать её.</small>';
}
function drawLines(){
  const board=document.getElementById('desk-board');const svg=document.getElementById('desk-lines');
  if(!board||!svg)return;
  const box=board.getBoundingClientRect();
  svg.setAttribute('viewBox','0 0 '+box.width+' '+box.height);
  const anchor=(side,field)=>{
    const el=board.querySelector('[data-desk-side="'+side+'"][data-desk-field="'+field+'"]');
    if(!el)return null;const r=el.getBoundingClientRect();
    return {x:(side==='a'?r.right:r.left)-box.left,y:r.top+r.height/2-box.top};
  };
  const line=(p1,p2,cls)=>p1&&p2?'<line class="'+cls+'" x1="'+p1.x+'" y1="'+p1.y+'" x2="'+p2.x+'" y2="'+p2.y+'"/><circle class="'+cls+'" cx="'+p1.x+'" cy="'+p1.y+'" r="4"/><circle class="'+cls+'" cx="'+p2.x+'" cy="'+p2.y+'" r="4"/>':'';
  let out=links.map(l=>line(anchor('a',l.a),anchor('b',l.b),l.kind)).join('');
  if(pendingLink)out+=line(anchor('a',pendingLink.a),anchor('b',pendingLink.b),'pending');
  if(deskDrag?.moved)out+=line(anchor(deskDrag.side,deskDrag.field),{x:deskDrag.x-box.left,y:deskDrag.y-box.top},'pending');
  svg.innerHTML=out;
}
function proposeLink(from,to){
  if(!from||!to||from.side===to.side){pickFrom=null;paintPanel();return;}
  const a=from.side==='a'?from.field:to.field;const b=from.side==='a'?to.field:from.field;
  pickFrom=null;
  links=links.filter(l=>!(l.a===a&&l.b===b));
  if(links.length>=2){notify('Уже есть две связи. Уберите лишнюю, нажав на неё внизу.');paintPanel();return;}
  pendingLink={a,b};paintPanel();
}
const fieldOf=el=>el?{side:el.dataset.deskSide,field:el.dataset.deskField}:null;
dialog.addEventListener('pointerdown',event=>{
  const chip=event.target.closest('.desk-field');
  if(chip&&!pendingLink){
    deskDrag={...fieldOf(chip),x:event.clientX,y:event.clientY,sx:event.clientX,sy:event.clientY,moved:false,id:event.pointerId};
    chip.setPointerCapture?.(event.pointerId);
    event.preventDefault();
    return;
  }
  const dial=event.target.closest('#dial-svg');
  if(dial){
    const r=dial.getBoundingClientRect();
    const cx=r.left+r.width/2,cy=r.top+r.height/2;
    sfx.wake();
    dialDrag={cx,cy,start:Math.atan2(event.clientY-cy,event.clientX-cx),rot:dialRot};
    dial.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  }
});
dialog.addEventListener('pointermove',event=>{
  if(deskDrag){
    deskDrag.x=event.clientX;deskDrag.y=event.clientY;
    if(Math.hypot(event.clientX-deskDrag.sx,event.clientY-deskDrag.sy)>8)deskDrag.moved=true;
    if(deskDrag.moved)drawLines();
    return;
  }
  if(dialDrag){
    const angle=Math.atan2(event.clientY-dialDrag.cy,event.clientX-dialDrag.cx);
    turnDial(dialDrag.rot+(angle-dialDrag.start)*180/Math.PI);
  }
});
const endPointer=event=>{
  if(deskDrag){
    const drag=deskDrag;deskDrag=null;
    if(drag.moved){
      const target=document.elementFromPoint(event.clientX,event.clientY)?.closest('.desk-field');
      proposeLink(drag,fieldOf(target));
    } else if(pickFrom&&pickFrom.side!==drag.side){
      proposeLink(pickFrom,drag);
    } else {
      pickFrom=pickFrom&&pickFrom.side===drag.side&&pickFrom.field===drag.field?null:{side:drag.side,field:drag.field};
      paintPanel();
    }
  }
  if(dialDrag){
    dialDrag=null;
    turnDial(-dialNum()*360/E.dialSize);
  }
};
dialog.addEventListener('pointerup',endPointer);
dialog.addEventListener('pointercancel',()=>{deskDrag=null;dialDrag=null;drawLines();});
window.addEventListener('resize',()=>{if(activePanel==='desk')drawLines();});
/* Ящик Даля: кодовый диск */
/* Звук и вибрация замка */
const sfx=(()=>{
  let ctx=null;
  const wake=()=>{try{ctx=ctx||new (window.AudioContext||window.webkitAudioContext)();if(ctx.state==='suspended')ctx.resume();}catch{ctx=null;}};
  const noise=(at,len,freq,q,vol,curve)=>{
    const buf=ctx.createBuffer(1,Math.max(1,Math.floor(ctx.sampleRate*len)),ctx.sampleRate);const d=buf.getChannelData(0);
    for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,curve);
    const src=ctx.createBufferSource();src.buffer=buf;
    const f=ctx.createBiquadFilter();f.type='bandpass';f.frequency.value=freq;f.Q.value=q;
    const g=ctx.createGain();g.gain.value=vol;
    src.connect(f).connect(g).connect(ctx.destination);src.start(at);
  };
  const thump=(at,freq,len,vol)=>{
    const o=ctx.createOscillator();o.type='sine';o.frequency.setValueAtTime(freq,at);o.frequency.exponentialRampToValueAtTime(freq*.55,at+len);
    const g=ctx.createGain();g.gain.setValueAtTime(vol,at);g.gain.exponentialRampToValueAtTime(.001,at+len);
    o.connect(g).connect(ctx.destination);o.start(at);o.stop(at+len+.02);
  };
  return {
    wake,
    click(strong){
      if(!ctx)return;const t=ctx.currentTime;
      if(strong){noise(t,.05,1100,1.4,1.1,3);thump(t,140,.09,.55);}
      else noise(t,.018,3200,2.5,.45,6);
    },
    open(){
      wake();if(!ctx)return;const t=ctx.currentTime;
      [0,.11,.22].forEach(d=>{noise(t+d,.05,900,1.2,1,3);thump(t+d,120,.1,.5);});
      noise(t+.38,.35,500,.8,.5,1.5);thump(t+.38,70,.3,.6);
    },
    fail(){
      wake();if(!ctx)return;const t=ctx.currentTime;
      noise(t,.12,600,1,.8,2);thump(t,90,.22,.6);noise(t+.14,.25,1800,3,.25,2);
    }
  };
})();
/* Вибрация: Android через navigator.vibrate, iPhone через системный переключатель (iOS 18+) */
const iosSwitch=(()=>{
  try{
    const id='haptic-switch';
    const input=document.createElement('input');input.type='checkbox';input.setAttribute('switch','');input.id=id;input.tabIndex=-1;input.setAttribute('aria-hidden','true');
    const label=document.createElement('label');label.htmlFor=id;label.setAttribute('aria-hidden','true');
    for(const el of [input,label])Object.assign(el.style,{position:'fixed',left:'-100px',top:'0',width:'1px',height:'1px',opacity:'0',pointerEvents:'none'});
    document.body.append(input,label);
    return label;
  }catch{return null;}
})();
let lastTap=0;
function haptic(strong,pattern){
  try{
    if(typeof navigator.vibrate==='function'){navigator.vibrate(pattern??(strong?60:12));return;}
  }catch{}
  if(!iosSwitch)return;
  const now=Date.now();
  if(!strong&&now-lastTap<70)return;
  lastTap=now;
  {
    const times=Array.isArray(pattern)?Math.ceil(pattern.length/2):1;
    for(let i=0;i<times;i++)setTimeout(()=>iosSwitch.click(),i*110);
  }
}
function dialNum(){const step=360/E.dialSize;return ((Math.round(-dialRot/step)%E.dialSize)+E.dialSize)%E.dialSize;}
function turnDial(rot){
  dialRot=rot;
  const g=document.getElementById('dial-face');
  if(g)g.setAttribute('transform','rotate('+dialRot.toFixed(2)+')');
  const n=dialNum();
  const readout=document.getElementById('dial-readout');
  if(readout)readout.textContent=String(n);
  if(n!==lastDialNum){
    lastDialNum=n;
    const marker=document.getElementById('dial-marker');
    if(n===E.safeCode[dialEntered.length]){
      sfx.click(true);haptic(true);
      if(marker){marker.classList.remove('hit');void marker.getBBox();marker.classList.add('hit');}
    } else {
      sfx.click(false);haptic(false);
    }
  }
}
function safeBody(){
  const N=E.dialSize,step=360/N;
  let ticks='';
  for(let i=0;i<N;i++){
    const a=i*step;
    ticks+='<g transform="rotate('+a+')"><line x1="0" y1="-84" x2="0" y2="'+(i%5===0?-72:-77)+'" class="dial-tick"/><text x="0" y="-58" class="dial-num">'+i+'</text></g>';
  }
  let knurl='';
  for(let i=0;i<72;i++)knurl+='<line transform="rotate('+(i*5)+')" x1="0" y1="-97" x2="0" y2="-91" class="dial-knurl"/>';
  const pips=[0,1,2].map(i=>'<span class="pip'+(i<dialEntered.length?' on':'')+'">'+(i<dialEntered.length?dialEntered[i]:'')+'</span>').join('');
  return p(C.safe.engraving)+
    '<div class="safe-wrap"><svg id="dial-svg" class="dial" viewBox="-110 -110 220 220" role="img" aria-label="Кодовый диск">'+
      '<defs><radialGradient id="brass" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#f3d9a4"/><stop offset=".55" stop-color="#b98a4b"/><stop offset="1" stop-color="#5e4122"/></radialGradient>'+
      '<radialGradient id="face" cx="40%" cy="35%" r="75%"><stop offset="0" stop-color="#2f3a44"/><stop offset="1" stop-color="#121920"/></radialGradient></defs>'+
      '<circle r="106" class="dial-bezel"/>'+
      '<g id="dial-face" transform="rotate('+dialRot.toFixed(2)+')"><circle r="98" fill="url(#brass)"/>'+knurl+'<circle r="88" fill="url(#face)" class="dial-plate"/>'+ticks+
        '<circle r="30" fill="url(#brass)"/><circle r="20" class="dial-hub"/><line x1="0" y1="-20" x2="0" y2="-29" class="dial-grip"/></g>'+
      '<path id="dial-marker" class="dial-marker" d="M0 -88 L-8 -106 L8 -106 Z"/>'+
    '</svg><div class="dial-side"><div class="dial-readout-label">Под меткой</div><div id="dial-readout" class="dial-readout">'+dialNum()+'</div><div class="pips">'+pips+'</div></div></div>'+
    '<div class="actions">'+btn('dial-step','-1','◀')+btn('dial-fix','','Зафиксировать цифру',{primary:true})+btn('dial-step','1','▶')+btn('dial-reset','','Сбросить')+'</div>'+
    '<small>Вращайте диск пальцем. Когда под меткой нужная цифра, механизм отзывается щелчком: метка вспыхивает, телефон коротко вибрирует.</small>';
}
function paintPanel() {
  let title='';
  let body='';
  switch(activePanel) {
    case 'terminal':
      title='Терминал Центра';
      body=card(C.documents.order.title,p(C.documents.order.text))+
        (state.accepted?card('Ваш ответ Центру',p(C.replies[state.reply]?.text ?? 'Приказ принят.')+'<small>Путь: '+esc(C.pathNames[state.reply] ?? '—')+'</small>')+p('Ведомости ждут на рабочем столе.'):
          '<h3>Как ответить Центру?</h3><div class="reply-choices">'+E.replies.map(id=>'<button type="button" class="btn reply-choice" data-act="accept" data-value="'+id+'"><strong>'+esc(C.replies[id].label)+'</strong><span>'+esc(C.replies[id].text)+'</span></button>').join('')+'</div>'+
          '<small>Ответ повлияет на путь командира и на то, как вас встретит экипаж.</small>');
      break;
    case 'desk': {
      title='Рабочий стол';
      if (!state.accepted) { body=p('Ответьте Центру на терминале, чтобы получить ведомости.'); break; }
      if (state.deduction) {
        body=card('Связь подтверждена',p('Один рейс LN-407. Два назначения груза. Ирена может проверить происхождение записи.'));
        break;
      }
      body=deskBody();
      break;
    }
    case 'trace':
      title='След на столе';
      body=p(state.safeFound?C.safe.trace:'Светлый прямоугольник на тёмном лаке. Здесь стояла вещь Даля.')+
        (state.safeFound?p('Ящик стола теперь отмечен на сцене.'):btn('trace','','Провести рукой по краю',{primary:true}));
      break;
    case 'safe':
      title='Ящик стола Даля';
      body=state.safeOpen?card(C.documents.dalNote.title,'<p class="sheet">'+esc(C.documents.dalNote.text)+'</p>')+card('Внутренний голос',p(C.safe.note)):safeBody();
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
    case 'lab': {
      title='Криминалистический сканер';
      const traces={sample:'M0 32L20 32 29 8 39 36 49 21 59 32 90 32 99 8 109 36 119 21 129 32 150 32',
        baseline:'M0 32L20 32 29 11 38 32 55 32 64 11 73 32 90 32 99 11 108 32 125 32 134 11 143 32 150 32',
        noise:'M0 32L12 29 19 35 28 27 38 34 50 30 60 37 71 29 80 34 95 25 105 33 120 30 130 35 145 31 150 32'};
      const plot=path=>'<svg viewBox="0 0 150 45" aria-hidden="true"><path d="M0 32H150" stroke="#596d72" fill="none"/><path d="'+path+'" stroke="#a1e5d7" stroke-width="2" fill="none"/></svg>';
      if (state.lab) body=card('Калибровка подтверждена',p(C.documents.lab.text));
      else if (!state.sampleReady) body=propArt('lab')+p('Установите контрольную кассету, чтобы вывести сигнал.')+
        btn('use','sample','Установить кассету',{disabled:!state.inventory.includes('sample')});
      else body='<div class="card lab-reference"><strong>Образец на корпусе кассеты</strong>'+plot(traces.baseline)+
        '<p>Найдите совпадающий профиль на одном из трёх каналов.</p></div><div class="lab-traces">'+
        E.labChannels.map((ch,index)=>'<button class="trace-card" data-act="calibrate" data-value="'+ch+'">'+
          '<span>Канал '+(index+1)+'</span>'+plot(traces[ch])+'</button>').join('')+'</div>';
      break;
    }
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
      const positions = {cockpit:[50,18],lab:[17,49],office:[50,47],analysis:[83,49],airlock:[51,78]};
      body='<div class="ship-plan" aria-label="Иллюстрированный план шаттла">'+
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
      body=crew?card(crew.role,p(crew.bio))+card('Отношение к вам',p(trustLabel(state.trust[state.crew] ?? 0))):'';
      break;
    }
    case 'hero':
      title='Оперативник Багряных домов';
      body=card('Свидетель пульса',p('Зрелый кровный. Опытный сотрудник клинической контрразведки. Здоров.')+
        p('Хищное восприятие позволяет замечать физиологические реакции. Их причину устанавливают наблюдением и проверкой.'))+
        card('Путь командира',E.replies.map(id=>p(C.pathNames[id]+': '+state.path[id])).join('')+'<small>Очки пути дают выборы в ключевых решениях.</small>')+
        '<div class="grid">'+['Воля','Устрашение','Проницательность','Убеждение','Аналитика','Физическая мощь'].map((label,index)=>card(label,p(['Высокая','Высокое','Высокая','Уверенное','Высокая','Высокая'][index]))).join('')+'</div>';
      break;
    case 'journal':
    case 'diary':
      title=activePanel==='diary'?'Личный дневник':'Журнал задания';
      body=activePanel==='diary'?C.diary.map(item=>card(item.title,p(item.text))).join(''):
        card('Текущее задание',p(!state.accepted?'Примите приказ в кабинете.':!state.deduction?'Сопоставьте ведомости на рабочем столе.':!state.task?.done?'Поручите Ирене проверить источник и дождитесь результата.':'Завершите подготовку и подтвердите стыковку.'))+
        '<div class="actions">'+state.documents.map(id=>btn('read',id,C.documents[id].title)).join('')+'</div>'+
        (C.documents[documentId]?card(C.documents[documentId].title,'<p class="sheet">'+esc(C.documents[documentId].text)+'</p>'):'')+
        (state.thoughts.length?card('Мысли командира',state.thoughts.map(entry=>C.rooms[entry]?.thought ?? thoughts[entry]).filter(Boolean).map(p).join('')):'');
      break;
    case 'system':
      title='Меню и сохранения';
      body=p(storageAvailable?'Прогресс сохраняется автоматически после игровых действий.':'Браузер ограничил доступ к сохранениям.')+
        '<div class="actions">'+btn('save','','Сохранить вручную')+btn('load','','Загрузить ручное сохранение')+btn('restart','','Начать заново')+
        '<a class="btn-link" href="../">К тестовой версии</a></div>';
      break;
  }
  dialog.innerHTML='<header class="panel-head"><h2 id="panel-title">'+esc(title)+'</h2>'+btn('close','','Закрыть')+'</header><div id="panel-feedback" role="status"></div><div class="panel-body">'+body+'</div>';
  if(activePanel==='desk')requestAnimationFrame(drawLines);
}
dialog.addEventListener('close',()=>{activePanel='';});
document.addEventListener('click',event=>{
  const control=event.target.closest('[data-act]');
  if(!control) return;
  let {act,value}=control.dataset;
  if(act==='panel'){
    if(value==='desk'){pendingLink=null;pickFrom=null;}
    if(value==='safe'){dialEntered=[];}
    openPanel(value);return;
  }
  if(act==='link-kind'&&pendingLink){links.push({...pendingLink,kind:value});pendingLink=null;paintPanel();return;}
  if(act==='link-cancel'){pendingLink=null;pickFrom=null;paintPanel();return;}
  if(act==='link-remove'){links.splice(Number(value),1);paintPanel();return;}
  if(act==='link-check'){run('deduce',{links:links.map(({a,b,kind})=>({a,b,kind}))});return;}
  if(act==='dial-step'||act==='dial-fix')sfx.wake();
  if(act==='dial-step'){turnDial(dialRot-Number(value)*360/E.dialSize);return;}
  if(act==='dial-fix'){
    dialEntered.push(dialNum());
    if(dialEntered.length<3){paintPanel();return;}
    const code=dialEntered.slice();dialEntered=[];
    const opened=run('unlock',code).ok;
    if(opened){sfx.open();haptic(true,[40,60,40,60,90]);}else{sfx.fail();haptic(true,[120,60,120]);paintPanel();}
    return;
  }
  if(act==='dial-reset'){dialEntered=[];paintPanel();return;}
  if(act==='close'){closePanel();return;}
  if(act==='speech-next'){speechPage++;render();return;}
  if(act==='dismiss-thought'){thoughtOpen=false;render();return;}
  if(act==='save'){notify(persist(manualKey)?'Ручное сохранение записано.':'Сохранение недоступно.');return;}
  if(act==='restart'){
    if(!window.confirm('Начать пролог заново? Автосохранение будет сброшено, ручное сохранение останется.'))return;
    state=E.fresh();
    speechPage=0;thoughtOpen=false;links=[];pendingLink=null;pickFrom=null;dialEntered=[];dialRot=0;documentId='';
    closePanel();persist();render();notify('Пролог начат заново.');
    return;
  }
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
  run(act,act==='topic'?Number(value):value,value);
});
render();
})();
