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
let deskResult = '';
let pickFrom = null;
let deskDrag = null;
let dialRot = 0;
let dialEntered = [];
let dialDrag = null;
let lastDialNum = 0;
let toastTimer;
const settingsKey='tkgame-prologue-settings';
const settings={sound:true,vibro:true,speed:'normal'};
try{Object.assign(settings,JSON.parse(localStorage.getItem(settingsKey)||'{}'));}catch{}
if(!['slow','normal','fast','instant'].includes(settings.speed))settings.speed='normal';
function saveSettings(){try{localStorage.setItem(settingsKey,JSON.stringify(settings));}catch{}}
const reduceMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches===true;
const icons={
  hero:'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8c0-3.3 3.1-6 7-6s7 2.7 7 6',
  crew:'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7-1a2.5 2.5 0 1 0 0-5M3 19c0-2.8 2.7-5 6-5s6 2.2 6 5m2-5c2.4.3 4 2 4 4.5',
  inventory:'M4 8h16v11H4zM9 8V5h6v3M4 12h16',
  journal:'M6 3h11a1 1 0 0 1 1 1v16H7a2 2 0 0 1-2-2V4a1 1 0 0 1 1-1Zm-1 15a2 2 0 0 1 2-2h11M9 7h6M9 10h6',
  map:'M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14',
  ship:'M12 2c3 3 4 7 4 11l-4 3-4-3c0-4 1-8 4-11Zm-4 11-3 3v3l3-2m8-4 3 3v3l-3-2M12 8v2',
  menu:'M4 7h16M4 12h16M4 17h16',
  close:'M6 6l12 12M18 6 6 18',
  clock:'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v4l3 2'
};
const ico=id=>'<svg viewBox="0 0 24 24" class="ico" aria-hidden="true"><path d="'+icons[id]+'"/></svg>';
let titleOpen=true;
let roomCard=false;
/* Эффекты окружения: свет, индикаторы, блики окон. Координаты в процентах арта. */
const fxMap={
  office:{art:[508,508],glows:[[39,33,22,'255,190,110','flick'],[46,16,12,'255,200,130','slow'],[62,2,18,'255,214,160','slow'],[30,64,16,'255,170,90','slow']],blinks:[],windows:[[1,8,26,30]]},
  cockpit:{art:[764,508],glows:[[29,40,15,'110,215,255','screen'],[47,40,14,'255,185,90','screen'],[20,46,8,'120,255,200','slow'],[50,4,22,'190,210,255','slow']],blinks:[[22,46,'255,70,60'],[47,42,'90,255,140'],[55,47,'255,190,80'],[33,44,'90,200,255'],[40,47,'255,70,60']],windows:[[3,3,82,26]]},
  lab:{art:[764,508],glows:[[28,16,22,'150,210,255','flick'],[62,17,13,'255,200,120','slow'],[30,72,15,'255,190,110','slow'],[25,47,14,'170,220,255','screen']],blinks:[[93,38,'90,255,140'],[94,46,'255,190,80']],windows:[]},
  analysis:{art:[764,508],glows:[[20,28,15,'140,200,255','screen'],[38,32,12,'150,220,255','screen'],[53,32,10,'255,170,80','screen'],[57,27,9,'255,200,130','flick'],[20,12,13,'255,190,110','slow'],[90,12,10,'255,190,110','slow']],blinks:[],windows:[]},
  airlock:{art:[764,508],glows:[[46,7,13,'255,200,130','slow'],[34,42,9,'255,170,70','flick'],[90,7,11,'255,190,110','slow'],[50,38,20,'200,220,255','slow']],blinks:[[96,48,'255,60,50'],[33,30,'255,170,60']],windows:[[38,10,22,50]],alarm:true},
  'intro-0':{art:[883,439],glows:[[22,88,9,'255,150,70','engine'],[33,88,9,'255,150,70','engine'],[78,46,14,'255,190,120','slow']],blinks:[[60,6,'255,60,50'],[78,46,'90,255,140'],[91,40,'255,60,50'],[70,48,'255,60,50'],[95,8,'255,60,50']],windows:[]}
};
function fxLayer(key){
  const fx=fxMap[key];
  if(!fx||reduceMotion)return '';
  return '<div class="fx" data-w="'+fx.art[0]+'" data-h="'+fx.art[1]+'" aria-hidden="true">'+
    fx.glows.map(([x,y,r,c,kind],i)=>'<i class="glow '+kind+'" style="--x:'+x+'%;--y:'+y+'%;--r:'+r+'%;--c:'+c+';--d:'+(i*1.7%5).toFixed(1)+'s"></i>').join('')+
    fx.blinks.map(([x,y,c],i)=>'<i class="blink" style="--x:'+x+'%;--y:'+y+'%;--c:'+c+';--d:'+(i*.9%3.3).toFixed(1)+'s;--t:'+(1.6+i*.7%2.4).toFixed(1)+'s"></i>').join('')+
    fx.windows.map(([x,y,w,h],i)=>'<div class="sweep" style="--x:'+x+'%;--y:'+y+'%;--w:'+w+'%;--h:'+h+'%;--d:'+(4+i*7)+'s"><i></i></div>').join('')+
    (fx.alarm?'<i class="alarm"></i>':'')+'</div>';
}
function layoutFx(){
  const layer=app.querySelector('.fx');if(!layer)return;
  const art=layer.parentElement;const W=art.clientWidth,H=art.clientHeight;
  const iw=Number(layer.dataset.w),ih=Number(layer.dataset.h);
  const scale=Math.max(W/iw,H/ih);const rw=iw*scale,rh=ih*scale;
  const pos=getComputedStyle(art).backgroundPosition.split(' ').map(v=>parseFloat(v)/100);
  const px=Number.isFinite(pos[0])?pos[0]:.5,py=Number.isFinite(pos[1])?pos[1]:.5;
  Object.assign(layer.style,{left:((W-rw)*px)+'px',top:((H-rh)*py)+'px',width:rw+'px',height:rh+'px'});
}
window.addEventListener('resize',()=>{layoutFx();sizeDust();});
/* Пыль в воздухе */
const dust={parts:[],raf:0,cv:null,last:0};
function sizeDust(){const cv=dust.cv;if(!cv)return;const k=Math.min(1.5,window.devicePixelRatio||1);cv.width=cv.clientWidth*k;cv.height=cv.clientHeight*k;}
function startDust(){
  const cv=app.querySelector('.dust-fx');
  if(!cv||reduceMotion){dust.cv=null;return;}
  dust.cv=cv;sizeDust();
  if(!dust.parts.length){
    const n=window.innerWidth<700?34:60;
    for(let i=0;i<n;i++)dust.parts.push({x:Math.random(),y:Math.random(),vx:(Math.random()-.5)*.006,vy:-(.002+Math.random()*.008),r:.5+Math.random()*1.6,ph:Math.random()*6.3,sp:.6+Math.random()*1.6,a:.18+Math.random()*.45});
  }
  if(!dust.raf){dust.last=performance.now();dust.raf=requestAnimationFrame(drawDust);}
}
function drawDust(now){
  dust.raf=0;
  const cv=dust.cv;if(!cv||!cv.isConnected||document.hidden){return;}
  const dt=Math.min(.05,(now-dust.last)/1000);dust.last=now;
  const g=cv.getContext('2d');const W=cv.width,H=cv.height,k=W/Math.max(1,cv.clientWidth);
  g.clearRect(0,0,W,H);
  const t=now/1000;
  for(const p of dust.parts){
    p.x+=(p.vx+Math.sin(t*.3+p.ph)*.002)*dt;p.y+=p.vy*dt;
    if(p.y<-.02){p.y=1.02;p.x=Math.random();}
    if(p.x<-.02)p.x=1.02;if(p.x>1.02)p.x=-.02;
    const a=p.a*(.45+.55*Math.sin(t*p.sp+p.ph));
    if(a<=0)continue;
    g.beginPath();g.fillStyle='rgba(255,226,180,'+a.toFixed(3)+')';g.arc(p.x*W,p.y*H,p.r*k,0,6.283);g.fill();
  }
  dust.raf=requestAnimationFrame(drawDust);
}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)startDust();});
/* Дрожь корпуса: иногда шаттл вздрагивает */
let tremorTimer=0;
function scheduleTremor(){
  if(tremorTimer||reduceMotion)return;
  tremorTimer=setTimeout(()=>{
    tremorTimer=0;
    const scene=app.querySelector('.scene');
    if(scene&&!dialog.open&&!titleOpen&&!document.hidden){
      scene.classList.remove('tremor');void scene.offsetWidth;scene.classList.add('tremor');
      sfx.rumble();haptic(false,[30,40,20]);
      setTimeout(()=>scene.classList.remove('tremor'),1400);
    }
    scheduleTremor();
  },28000+Math.random()*32000);
}
function shake(){
  if(reduceMotion)return;
  const el=dialog.open?dialog:app.querySelector('.scene');
  if(!el)return;el.classList.remove('shake');void el.offsetWidth;el.classList.add('shake');
  setTimeout(()=>el.classList.remove('shake'),500);
}
let lastSceneKey='';
let lastCrew=null;
let seenBonds=state.bondLog.length;
const askedTopics=new Set();
const typedKeys=new Set();
let typing=null;
const typeSpeeds={slow:28,normal:52,fast:110};
const tw=(text,key,voice)=>'<p class="tw" data-key="'+esc(key)+'" data-full="'+esc(text)+'" data-voice="'+esc(voice||'')+'"><span class="tw-on"></span><span class="tw-off">'+esc(text)+'</span></p>';
function afterPaint(){layoutFx();startDust();sfx.ambient(titleOpen||state.intro<C.intro.length||state.docked?'space':state.room);roomCard=false;scheduleTremor();}
function startTyping(){
  afterPaint();
  const el=app.querySelector('.tw');
  if(!el){if(typing)cancelAnimationFrame(typing.raf);typing=null;return;}
  const key=el.dataset.key;
  const resume=typing&&typing.key===key?typing.i:0;
  if(typing)cancelAnimationFrame(typing.raf);
  typing={key,i:resume,el,host:el.closest('.typing-host'),full:el.dataset.full,voice:el.dataset.voice,last:performance.now(),acc:0,raf:0};
  if(typedKeys.has(key)||settings.speed==='instant'||reduceMotion){completeTyping();return;}
  typing.host?.classList.add('typing');
  paintTyped();
  typing.raf=requestAnimationFrame(stepTyping);
}
function paintTyped(){const t=typing;t.el.firstChild.textContent=t.full.slice(0,t.i);t.el.lastChild.textContent=t.full.slice(t.i);}
function stepTyping(now){
  const t=typing;if(!t)return;
  t.acc+=(now-t.last)/1000*typeSpeeds[settings.speed];t.last=now;
  while(t.acc>=1&&t.i<t.full.length){
    const ch=t.full[t.i];t.i++;
    t.acc-='.!?…'.includes(ch)?7:',;:—'.includes(ch)?3:1;
    if(t.i%3===0&&ch.trim())sfx.blip(t.voice);
  }
  paintTyped();
  if(t.i>=t.full.length){completeTyping();return;}
  t.raf=requestAnimationFrame(stepTyping);
}
function completeTyping(){
  const t=typing;if(!t)return;
  cancelAnimationFrame(t.raf);t.i=t.full.length;paintTyped();
  t.host?.classList.remove('typing');typedKeys.add(t.key);typing=null;
}
function topBar(withTabs){
  const unread=state.documents.some(id=>!state.reviewed.includes(id));
  const crewNew=state.bondLog.length>seenBonds;
  const tabs=withTabs?'<nav class="tabs" aria-label="Разделы">'+[['hero','Герой'],['crew','Экипаж'],['inventory','Вещи'],['journal','Журнал'],['map','Карта'],['ship','Шаттл']].map(([id,label])=>
    '<button type="button" class="tab" data-act="panel" data-value="'+id+'">'+ico(id)+'<span>'+label+'</span>'+((id==='journal'&&unread)||(id==='crew'&&crewNew)?'<i class="dot" aria-label="есть новое"></i>':'')+'</button>').join('')+'</nav>':'';
  return '<header class="top'+(withTabs?'':' bare')+'"><div class="brand"><span><b>◈</b> Мир Раскола</span><small>Пролог · Приказ</small></div>'+tabs+
    '<div class="meta"><span class="clock">'+ico('clock')+esc(E.period(state.tick))+'</span><button type="button" class="icon-btn" data-act="panel" data-value="system" aria-label="Меню">'+ico('menu')+'</button></div></header>';
}
function sceneEnter(key){const changed=key!==lastSceneKey;lastSceneKey=key;return changed&&!reduceMotion?' enter':'';}
function renderTitle(){
  const canContinue=state.intro>0;
  app.innerHTML='<main class="game title-screen"><section class="scene intro title'+sceneEnter('title')+'" style="--art:url(assets/intro-0.webp)"><div class="scene-art kb">'+fxLayer('intro-0')+'</div><canvas class="dust-fx" aria-hidden="true"></canvas><div class="bars" aria-hidden="true"><i></i><i></i></div><div class="dust" aria-hidden="true">'+'<i></i>'.repeat(16)+'</div>'+
    '<div class="title-copy"><div class="kicker">Дела контрразведки Багряных домов</div><h1 class="logo">Мир Раскола</h1><p class="subtitle">Пролог · «Приказ»</p><div class="title-menu">'+
    (canContinue?btn('title-continue','','Продолжить',{primary:true}):'')+btn('title-new','',canContinue?'Новая игра':'Начать игру',{primary:!canContinue})+btn('panel','settings','Настройки')+
    '</div><small class="title-foot">Автосохранение включено · Лучше играть со звуком</small></div></section></main>';
}
function settingsBody(){
  const seg=(act,value,label,on)=>'<button type="button" class="seg'+(on?' on':'')+'" data-act="'+act+'" data-value="'+value+'" aria-pressed="'+on+'">'+esc(label)+'</button>';
  return '<div class="settings">'+
    '<div class="setting"><span>Звук</span><div class="segs">'+seg('set-sound','1','Вкл',settings.sound)+seg('set-sound','0','Выкл',!settings.sound)+'</div></div>'+
    '<div class="setting"><span>Вибрация</span><div class="segs">'+seg('set-vibro','1','Вкл',settings.vibro)+seg('set-vibro','0','Выкл',!settings.vibro)+'</div></div>'+
    '<div class="setting"><span>Скорость текста</span><div class="segs">'+[['slow','Медленно'],['normal','Обычно'],['fast','Быстро'],['instant','Сразу']].map(([v,l])=>seg('set-speed',v,l,settings.speed===v)).join('')+'</div></div>'+
    '</div>';
}
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
  const inPanel=dialog.open&&!dialog.classList.contains('closing')?dialog.querySelector('#panel-feedback'):null;
  const lines=String(message||'').split(' · ').filter(Boolean).map(line=>'<div>'+esc(line)+'</div>').join('');
  clearTimeout(toastTimer);
  status.classList.remove('show');
  if(inPanel){inPanel.innerHTML=lines;}
  else if(lines){status.innerHTML=lines;void status.offsetWidth;status.classList.add('show');}
  toastTimer=setTimeout(()=>{status.classList.remove('show');if(inPanel)inPanel.textContent='';},4600);
}
function openPanel(id) {
  const fresh=!dialog.open||activePanel!==id||dialog.classList.contains('closing');
  activePanel=id;
  if(id==='crew'){seenBonds=state.bondLog.length;app.querySelector('.tab[data-value="crew"] .dot')?.remove();}
  dialog.classList.remove('closing');
  dialog.style.transform='';
  paintPanel();
  if(fresh&&!reduceMotion){dialog.dataset.anim='1';setTimeout(()=>delete dialog.dataset.anim,500);}
  if (!dialog.open) dialog.showModal();
  sfx.swish();
}
function closePanel() {
  activePanel='';
  if (!dialog.open) return;
  if(reduceMotion){dialog.close();return;}
  dialog.classList.add('closing');
  setTimeout(()=>{if(!activePanel&&dialog.classList.contains('closing')){dialog.close();}dialog.classList.remove('closing');dialog.style.transform='';},200);
}
function actor(crewId) {
  const crew=C.crew[crewId];
  return '<button class="embedded-actor" data-act="talk" data-value="'+crewId+'" aria-label="Поговорить: '+esc(crew.name)+'"><span>'+esc(crew.name)+'</span></button>';
}
function render() {
  if(titleOpen){renderTitle();startTyping();return;}
  if (state.intro<C.intro.length || state.docked) {
    const end=state.docked;
    const frame=end?{title:'Стыковка завершена',text:(C.docking[state.dockStyle]?C.docking[state.dockStyle]+' ':'')+'У вас есть приказ, рабочая версия и материалы экипажа. Первое дело начнётся за этой дверью.'}:C.intro[state.intro];
    const crewSummary=end?'<ul class="crew-summary">'+E.crewIds.map(id=>{const score=state.trust[id]+state.close[id]+E.methods(state,id);
      return '<li><strong>'+esc(C.bonds.short[id])+'</strong> '+esc(C.bonds.ending[score>=3?'high':score>=0?'mid':'low'])+'</li>';}).join('')+'</ul>':'';
    const key=end?'end':'intro-'+state.intro;
    app.innerHTML='<main class="game">'+topBar(false)+'<section class="scene intro typing-host'+sceneEnter(key)+'" style="--art:url(assets/'+(end?'dock':'intro-'+state.intro)+'.webp)"><div class="scene-art kb">'+fxLayer(end?'dock':'intro-'+state.intro)+'</div><canvas class="dust-fx" aria-hidden="true"></canvas><div class="bars" aria-hidden="true"><i></i><i></i></div><div class="intro-copy"><div class="kicker">'+
      (end?'Конец пролога':'Пролог · '+(state.intro+1)+' / '+C.intro.length)+'</div><h1>'+esc(frame.title)+'</h1>'+tw(frame.text,key,'narrator')+'<div class="after-type">'+crewSummary+'<div class="actions">'+
      (end?btn('restart','','Начать пролог заново',{primary:true})+btn('title-menu','','Главное меню')+'<a class="btn-link" href="../">К тестовой версии</a>':
        btn('next-intro','',state.intro===C.intro.length-1?'Вступить в командование':'Продолжить ▸',{primary:true}))+'</div></div>'+
      (end?'':'<div class="progress-dots" aria-hidden="true">'+C.intro.map((_,i)=>'<i class="'+(i<=state.intro?'on':'')+'"></i>').join('')+'</div>')+'</div></section></main>';
    lastCrew=null;
    startTyping();
    return;
  }
  const room=C.rooms[state.room];
  const crewId=Object.keys(C.crew).find(id=>C.crew[id].room===state.room);
  const exits=E.adjacent(state.room).map(id=>'<button type="button" class="btn exit" data-act="move" data-value="'+id+'"><span aria-hidden="true">↗</span> '+esc(C.rooms[id].name)+'</button>').join('');
  const hotspots=fixtures[state.room].filter(([id])=>id!=='safe'||state.safeFound).map(([id,label,x,y],index)=>{
    const object=C.items[id];
    const done=object&&state.inventory.includes(id);
    return '<button class="hotspot'+(done?' done':'')+'" style="--x:'+x+'%;--y:'+y+'%;--i:'+index+'" data-act="panel" data-value="'+id+'"><b aria-hidden="true">'+(done?'✓':'◇')+'</b><span>'+esc(label)+'</span></button>';
  }).join('');
  const crew=state.crew && C.crew[state.crew];
  const topic=crew?.topics[state.topic];
  const pages=topic?.answer.match(/[^.!?]+(?:[.!?]+|$)/gu)?.reduce((list,sentence)=>{
    if (list.length && list.at(-1).length+sentence.length<145) list[list.length-1]+=sentence;
    else list.push(sentence.trimStart());
    return list;
  },[]) ?? [];
  const hasMore=speechPage<pages.length-1;
  const line=crew?((memoryOn&&C.bonds.memories[state.crew]) || (state.said&&C.show[state.said.doc]?.[state.crew]?.[state.said.tone]) || (pages[speechPage] ?? (state.reply&&C.reactions[state.crew]?.[state.reply]) ?? crew.greeting ?? 'Командир. Слушаю вас.')):'';
  const talkEnter=crew&&state.crew!==lastCrew&&!reduceMotion?' enter':'';
  const cam=reduceMotion?'':talkEnter?' cam-in':!crew&&lastCrew?' cam-out':'';
  lastCrew=state.crew;
  const tools=crew&&!hasMore?[
    state.crew==='irena'?btn('assign','','Поручить проверку ведомости',{disabled:!state.deduction||Boolean(state.task)}):'',
    state.crew==='rein'&&!state.priority?btn('panel','evacuation','Порядок эвакуации'):'',
    ...E.showable.filter(doc=>state.documents.includes(doc)&&!state.shown[state.crew].includes(doc)).map(doc=>btn('show',doc,C.show[doc].label)),
    E.memoryOpen(state,state.crew)?btn('memory','',C.bonds.memoryLabel,{disabled:memoryOn}):''
  ].join(''):'';
  const conversation=crew?'<section class="conversation typing-host'+talkEnter+'" aria-label="Разговор">'+
    '<div class="nameplate"><strong class="speaker-name">'+esc(crew.name)+'</strong><span class="speaker-role">'+esc(crew.role)+'</span><span class="mood mood-'+(state.trust[state.crew]>0?'up':state.trust[state.crew]<0?'down':'flat')+'">'+esc(C.bonds.levels.trust[String(state.trust[state.crew])])+'</span>'+
      '<button type="button" class="icon-btn talk-close" data-act="end-talk" aria-label="Завершить разговор">'+ico('close')+'</button></div>'+
    tw(line,'c:'+state.crew+':'+line,state.crew)+
    '<div class="after-type"><div class="reply">'+(hasMore?'<button type="button" class="btn primary next" data-act="speech-next">Дальше ▸</button>':
      crew.topics.map((entry,index)=>'<button type="button" class="choice'+(askedTopics.has(state.crew+':'+index)?' asked':'')+'" data-act="topic" data-value="'+index+'" style="--i:'+index+'"><b>'+(index+1)+'</b><span>'+esc(entry.question)+'</span></button>').join(''))+'</div>'+
    '<div class="conversation-tools">'+tools+btn('panel','crew-bio','Отношения')+'</div></div></section>':'';
  const thought=!crew&&thoughtOpen?'<div class="thought typing-host'+(reduceMotion?'':' enter')+'"><div class="kicker">Внутренний голос</div>'+tw(room.thought,'t:'+state.room,'thought')+'<div class="after-type">'+btn('dismiss-thought','','Продолжить')+'</div></div>':'';
  const sceneArt=crewId ? 'scene-'+state.room : 'room-'+state.room;
  app.innerHTML='<main class="game">'+topBar(true)+'<section class="scene '+(crew?'scene-speaking ':'')+(crewId?'has-crew':'')+cam+sceneEnter('room-'+state.room)+'" aria-label="'+esc(room.name)+'" style="--art:url(assets/'+sceneArt+'.webp)"><div class="scene-art">'+fxLayer(state.room)+'</div><canvas class="dust-fx" aria-hidden="true"></canvas><div class="bars top-only" aria-hidden="true"><i></i></div>'+
    (roomCard?'<div class="room-card" aria-hidden="true"><small>Шаттл · '+esc(E.period(state.tick))+'</small><strong>'+esc(room.name)+'</strong></div>':'')+
    '<header><div class="kicker">Шаттл · '+esc(E.period(state.tick))+'</div><h1>'+esc(room.name)+'</h1></header>'+
    (crew?'':hotspots+(crewId?actor(crewId):''))+
    conversation+thought+(crew?'':'<nav class="exits" aria-label="Двери">'+exits+'</nav>')+
    '</section></main>';
  startTyping();
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
let memoryOn=false;
function bondNote(entry){
  const name=C.bonds.short[entry.crew];
  return name+': '+C.bonds.axes[entry.axis].toLowerCase()+' '+(entry.delta>0?'+':'−')+Math.abs(entry.delta)+' ('+C.bonds.why[entry.why]+')';
}
function run(act,input,value){
  const logBefore=state.bondLog.length;
  const result=E.dispatch(state,act,input);
  if(result.ok){
    memoryOn=act==='memory';
    const fresh=result.state.bondLog.slice(logBefore);
    if(fresh.length)result.message=[result.message,...fresh.map(bondNote)].filter(Boolean).join(' · ');
    const firstVisit=act==='move'&&!state.visited.includes(value);
    state=result.state;
    if(act==='move'){thoughtOpen=firstVisit;roomCard=firstVisit&&!reduceMotion;closePanel();}
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
function meter(axis,value){
  return '<div class="bond"><span class="bond-name">'+esc(C.bonds.axes[axis])+'</span><span class="bond-pips" role="img" aria-label="'+esc(C.bonds.axes[axis])+': '+value+'">'+
    [-3,-2,-1,0,1,2,3].map(n=>'<i class="'+(n===0?'mid ':'')+((n<0&&value<=n)||(n>0&&value>=n)?(n<0?'neg':'pos'):'')+'"></i>').join('')+
    '</span><span class="bond-level">'+esc(C.bonds.levels[axis][String(value)])+'</span></div>';
}
function crewCard(id,full){
  const crew=C.crew[id];
  const perk=C.bonds.perks[id];
  const perkOn=state.trust[id]>=perk.need;
  const [like]=E.methodLikes[id];
  const log=state.bondLog.filter(entry=>entry.crew===id).slice(-3).reverse();
  return '<article class="card crew-card"><div class="crew-head"><div><strong>'+esc(crew.name)+'</strong><small>'+esc(crew.role)+' · '+esc(C.rooms[crew.room].name)+'</small></div></div>'+
    meter('trust',state.trust[id])+meter('close',state.close[id])+meter('methods',E.methods(state,id))+
    '<p class="crew-perk'+(perkOn?' on':'')+'">'+(perkOn?'◆ ':'◇ ')+esc(perkOn?perk.on:perk.off)+'</p>'+
    '<small class="crew-likes">Ценит путь: '+esc(C.pathNames[like])+'</small>'+
    (full?p(crew.bio)+'<small>'+esc(E.memoryOpen(state,id)?(state.heard.includes(id)?'Он рассказал вам о Дале.':'Готов поговорить о Дале.'):C.bonds.memoryLocked)+'</small>':'')+
    (log.length?'<ul class="crew-log">'+log.map(entry=>'<li class="'+(entry.delta>0?'up':'down')+'">'+esc(C.bonds.axes[entry.axis])+' '+(entry.delta>0?'+':'−')+Math.abs(entry.delta)+' · '+esc(C.bonds.why[entry.why])+'</li>').join('')+'</ul>':'')+
    '</article>';
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
    (deskResult?'<div id="desk-result" class="desk-result" role="alert">'+esc(deskResult)+'</div>':'')+
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
let ambientWanted='';
const sfx=(()=>{
  let ctx=null;
  let amb=null;
  const wake=()=>{if(!settings.sound)return;const fresh=!ctx;try{ctx=ctx||new (window.AudioContext||window.webkitAudioContext)();if(ctx.state==='suspended')ctx.resume();}catch{ctx=null;}if(fresh&&ctx&&ambientWanted)api.ambient(ambientWanted);};
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
  const api={
    wake,
    blip(voice){
      if(!ctx||!settings.sound)return;
      const t=ctx.currentTime;const base={mara:520,corvin:300,irena:640,rein:230,thought:420,narrator:360}[voice]||400;
      const o=ctx.createOscillator();o.type='triangle';o.frequency.value=base*(.94+Math.random()*.12);
      const g=ctx.createGain();g.gain.setValueAtTime(.035,t);g.gain.exponentialRampToValueAtTime(.001,t+.04);
      o.connect(g).connect(ctx.destination);o.start(t);o.stop(t+.05);
    },
    ambient(kind){
      ambientWanted=kind;
      if(!ctx||!settings.sound){if(amb){try{amb.gain.gain.setTargetAtTime(0,ctx.currentTime,.4);}catch{}}return;}
      const tone={space:[160,38],office:[260,50],cockpit:[420,62],lab:[520,58],analysis:[360,55],airlock:[300,44]}[kind]||[300,50];
      const t=ctx.currentTime;
      if(!amb){
        const len=ctx.sampleRate*4;const buf=ctx.createBuffer(1,len,ctx.sampleRate);const d=buf.getChannelData(0);let last=0;
        for(let i=0;i<len;i++){last=(last+.02*(Math.random()*2-1))/1.02;d[i]=last*3.2;}
        const src=ctx.createBufferSource();src.buffer=buf;src.loop=true;
        const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=tone[0];
        const osc=ctx.createOscillator();osc.type='sine';osc.frequency.value=tone[1];
        const og=ctx.createGain();og.gain.value=.018;
        const gain=ctx.createGain();gain.gain.value=0;
        src.connect(filter).connect(gain);osc.connect(og).connect(gain);gain.connect(ctx.destination);
        src.start();osc.start();
        amb={filter,osc,gain};
      }
      amb.filter.frequency.setTargetAtTime(tone[0],t,.8);amb.osc.frequency.setTargetAtTime(tone[1],t,.8);
      amb.gain.gain.setTargetAtTime(kind==='space'?.11:.08,t,.8);
    },
    rumble(){if(!ctx||!settings.sound)return;const t=ctx.currentTime;noise(t,1.1,90,.7,1.2,1.4);thump(t,48,1,.5);noise(t+.2,.5,2400,6,.05,2);},
    swish(){if(!ctx||!settings.sound)return;noise(ctx.currentTime,.16,1400,.7,.18,1.2);},
    click(strong){
      if(!ctx||!settings.sound)return;const t=ctx.currentTime;
      if(strong){noise(t,.05,1100,1.4,1.1,3);thump(t,140,.09,.55);}
      else noise(t,.018,3200,2.5,.45,6);
    },
    open(){
      wake();if(!ctx||!settings.sound)return;const t=ctx.currentTime;
      [0,.11,.22].forEach(d=>{noise(t+d,.05,900,1.2,1,3);thump(t+d,120,.1,.5);});
      noise(t+.38,.35,500,.8,.5,1.5);thump(t+.38,70,.3,.6);
    },
    fail(){
      wake();if(!ctx||!settings.sound)return;const t=ctx.currentTime;
      noise(t,.12,600,1,.8,2);thump(t,90,.22,.6);noise(t+.14,.25,1800,3,.25,2);
    }
  };
  const rawFail=api.fail;
  api.fail=()=>{shake();rawFail();};
  return api;
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
  if(!settings.vibro)return;
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
/* Лаборатория: подогнать спектр образца под эталон */
let labShift=(Math.random()<.5?-1:1)*(18+Math.random()*16);
let labGain=Math.random()<.5?.55:1.55;
let labResult='';
const labCurve=(shift,gain)=>{
  let d='';
  for(let x=0;x<=150;x+=1.5){
    const u=x+shift;
    const peak=[30,75,120].reduce((sum,c)=>sum+Math.exp(-Math.pow((u-c)/5,2)),0);
    d+=(x?'L':'M')+x.toFixed(1)+' '+(40-22*gain*peak).toFixed(1);
  }
  return d;
};
function labNeed(){return state.trust.corvin>=C.bonds.perks.corvin.need?85:90;}
function labMatch(){return Math.max(0,Math.round(100-Math.abs(labShift)*3-Math.abs(labGain-1)*120));}
function labBody(){
  return '<div class="card lab-scope"><strong>Эталон на корпусе кассеты и отклик сканера</strong>'+
    '<svg viewBox="0 0 150 46" class="lab-svg" aria-hidden="true"><path d="M0 40H150" class="lab-axis"/>'+
    '<path d="'+labCurve(0,1)+'" class="lab-ref"/><path id="lab-sample" d="'+labCurve(labShift,labGain)+'" class="lab-sample"/></svg>'+
    '<label class="lab-slider">Сдвиг частоты<input type="range" id="lab-shift" min="-40" max="40" step="0.5" value="'+labShift+'"></label>'+
    '<label class="lab-slider">Усиление<input type="range" id="lab-gain" min="0.4" max="1.8" step="0.01" value="'+labGain+'"></label>'+
    '<div class="lab-match">Совпадение: <b id="lab-match">'+labMatch()+'%</b></div></div>'+
    '<div class="actions">'+btn('lab-fix','','Зафиксировать калибровку',{primary:true})+'</div>'+
    (labResult?'<div class="desk-result" role="alert">'+esc(labResult)+'</div>':'')+
    '<small>Совместите яркую кривую с тусклым эталоном. Нужно не меньше '+labNeed()+'%. От 97% — идеальная калибровка, Корвин это оценит.</small>';
}
let labLastHit=false;
dialog.addEventListener('input',event=>{
  if(event.target.id==='lab-shift')labShift=Number(event.target.value);
  else if(event.target.id==='lab-gain')labGain=Number(event.target.value);
  else return;
  labResult='';
  document.getElementById('lab-sample')?.setAttribute('d',labCurve(labShift,labGain));
  const m=labMatch();const out=document.getElementById('lab-match');
  if(out)out.textContent=m+'%';
  if(out)out.classList.toggle('ok',m>=labNeed());
  if(m>=labNeed()&&!labLastHit){sfx.wake();sfx.click(true);haptic(true,30);}
  labLastHit=m>=labNeed();
});
/* Шлюз: проверка навыка у считывателя */
let readerCheck=null;
function newZone(){return {zone:40+Math.random()*260,width:state.trust.rein>=C.bonds.perks.rein.need?62:44,great:14,start:performance.now(),speed:230,raf:0};}
function readerAngle(){return readerCheck?((performance.now()-readerCheck.start)/1000*readerCheck.speed)%360:0;}
function readerBody(){
  if(!readerCheck)readerCheck=newZone();
  const z=readerCheck;
  const arc=(from,width,r)=>{
    const a1=(from-90)*Math.PI/180,a2=(from+width-90)*Math.PI/180;
    return 'M'+(r*Math.cos(a1)).toFixed(2)+' '+(r*Math.sin(a1)).toFixed(2)+' A'+r+' '+r+' 0 0 1 '+(r*Math.cos(a2)).toFixed(2)+' '+(r*Math.sin(a2)).toFixed(2);
  };
  return p('Считыватель сбоит: карта проходит только в момент синхронизации. Нажмите, когда стрелка в золотой зоне. Узкая светлая полоса — идеально.')+
    '<button type="button" class="skill-check" data-act="reader-tap" aria-label="Нажать сейчас"><svg viewBox="-60 -60 120 120" aria-hidden="true">'+
    '<circle r="46" class="skill-ring"/><path d="'+arc(z.zone,z.width,46)+'" class="skill-zone"/><path d="'+arc(z.zone+(z.width-z.great)/2,z.great,46)+'" class="skill-great"/>'+
    '<g id="skill-needle"><line x1="0" y1="0" x2="0" y2="-52" class="skill-needle"/></g><circle r="5" class="skill-hub"/></svg><span>Сейчас!</span></button>';
}
function startReader(){
  if(!readerCheck||readerCheck.raf)return;
  const tick=()=>{
    const n=document.getElementById('skill-needle');
    if(!n||!readerCheck){if(readerCheck)readerCheck.raf=0;return;}
    n.setAttribute('transform','rotate('+readerAngle().toFixed(1)+')');
    readerCheck.raf=requestAnimationFrame(tick);
  };
  readerCheck.raf=requestAnimationFrame(tick);
}
function stopReader(){if(readerCheck?.raf){cancelAnimationFrame(readerCheck.raf);readerCheck.raf=0;}}
function readerTap(){
  if(!readerCheck)return;
  const a=readerAngle(),z=readerCheck;
  const inside=(x,from,w)=>{const d=((x-from)%360+360)%360;return d<=w;};
  stopReader();
  if(inside(a,z.zone,z.width)){
    const great=inside(a,z.zone+(z.width-z.great)/2,z.great);
    readerCheck=null;sfx.click(true);haptic(true,great?[30,40,30]:50);
    const result=run('use','badge');
    if(result.ok&&great)notify(result.message+' Идеальная синхронизация.');
  } else {
    sfx.fail();haptic(true,[120]);
    readerCheck=newZone();readerCheck.speed=200+Math.random()*80;
    notify('Считыватель сбросил карту. Попробуйте ещё раз.');
    paintPanel();
  }
}
/* Пост аналитика: журнал версий */
let versionResult='';
function versionsBody(){
  const V=C.versions;
  return '<h3>Журнал версий</h3>'+p(V.prompt)+'<div class="versions">'+V.list.map((ver,i)=>
    '<div class="card version"><div class="kicker">Версия '+(i+1)+' · '+esc(ver.time)+'</div>'+
    Object.keys(V.labels).map(f=>{
      const changed=state.trust.irena>=C.bonds.perks.irena.need&&i>0&&V.list[i-1][f]!==ver[f];
      return '<button type="button" class="version-field'+(changed?' changed':'')+'" data-act="version-pick" data-value="'+(i+1)+'|'+f+'"><small>'+esc(V.labels[f])+'</small><span>'+esc(ver[f])+'</span></button>';
    }).join('')+'</div>').join('')+'</div>'+
    (versionResult?'<div class="desk-result" role="alert">'+esc(versionResult)+'</div>':'')+
    '<small>'+(state.trust.irena>=C.bonds.perks.irena.need?'Ирена подсветила поля, которые изменились по сравнению с предыдущей версией.':'Ирена отдала журнал без пометок. Сравнивайте версии сами.')+'</small>';
}
/* Кабина: ручной подход к причалу */
let approach=null;
const corridorX=d=>50+16*Math.sin(d/55);
const corridorHalf=d=>7+15*Math.min(1,d/300);
function approachBody(){
  return p(C.docking.intro)+
    '<div class="approach"><svg id="approach-svg" viewBox="0 0 100 150" aria-label="Коридор подхода">'+
      '<path id="ap-left" class="ap-edge"/><path id="ap-right" class="ap-edge"/><path id="ap-center" class="ap-center"/>'+
      '<rect id="ap-dock" x="30" y="-10" width="40" height="5" class="ap-dock"/>'+
      '<path id="ap-ship" d="M0 -7 L5 5 L0 2 L-5 5 Z" class="ap-ship"/></svg>'+
      '<div class="ap-hud"><div>До причала <b id="ap-dist">220 м</b></div><div>Скорость <b id="ap-speed">12 м/с</b></div><div class="ap-hint" id="ap-hint"></div></div></div>'+
    '<div class="actions"><button type="button" class="btn primary ap-brake" id="ap-brake">Тормоз (удерживать)</button>'+btn('approach-handover','','Передать управление Маре')+'</div>';
}
function startApproach(){
  if(approach?.raf)return;
  if(!approach)approach={d:220,v:12,x:50,target:50,drift:0,braking:false,outside:0,last:performance.now(),raf:0,done:false,hintAt:0};
  const svg=document.getElementById('approach-svg');
  const brake=document.getElementById('ap-brake');
  if(!svg||!brake)return;
  const setTarget=e=>{if(!approach)return;const r=svg.getBoundingClientRect();approach.target=Math.max(4,Math.min(96,(e.clientX-r.left)/r.width*100));};
  svg.addEventListener('pointerdown',e=>{sfx.wake();svg.setPointerCapture?.(e.pointerId);setTarget(e);e.preventDefault();});
  svg.addEventListener('pointermove',e=>{if(e.buttons||e.pointerType==='touch')setTarget(e);});
  const on=e=>{sfx.wake();if(approach)approach.braking=true;e.preventDefault();};const off=()=>{if(approach)approach.braking=false;};
  brake.addEventListener('pointerdown',on);brake.addEventListener('pointerup',off);brake.addEventListener('pointerleave',off);brake.addEventListener('pointercancel',off);
  const frame=now=>{
    if(!approach||approach.done)return;
    const dt=Math.min(.05,(now-approach.last)/1000);approach.last=now;
    const A=approach;
    A.v=Math.max(1,A.v+(A.braking?-6:1.4)*dt);
    A.d=Math.max(0,A.d-A.v*dt);
    A.drift+=(Math.random()-.5)*14*dt;A.drift*=.985;
    A.x+=((A.target-A.x)*2.2+A.drift)*dt;
    const cx=corridorX(A.d),hw=corridorHalf(A.d);
    const off=A.x-cx;
    A.outside=Math.abs(off)>hw?A.outside+dt:0;
    drawApproach(A,cx,hw,off);
    if(A.outside>.9){finishApproach('assisted');return;}
    if(A.d<=0){finishApproach(A.v<=3&&Math.abs(off)<=hw?'clean':'assisted');return;}
    A.raf=requestAnimationFrame(frame);
  };
  approach.last=performance.now();
  approach.raf=requestAnimationFrame(frame);
}
function drawApproach(A,cx,hw,off){
  const pts=side=>{let d='';for(let y=150;y>=0;y-=6){const dist=A.d+(135-y)*1.2;const c=corridorX(Math.max(0,dist)),h=corridorHalf(Math.max(0,dist));d+=(d?'L':'M')+(c+side*h).toFixed(1)+' '+y;}return d;};
  const center=()=>{let d='';for(let y=150;y>=0;y-=6){const dist=A.d+(135-y)*1.2;d+=(d?'L':'M')+corridorX(Math.max(0,dist)).toFixed(1)+' '+y;}return d;};
  const set=(id,attr,val)=>document.getElementById(id)?.setAttribute(attr,val);
  set('ap-left','d',pts(-1));set('ap-right','d',pts(1));set('ap-center','d',center());
  const dockY=135-A.d/1.2;
  set('ap-dock','y',(dockY-5).toFixed(1));set('ap-dock','x',(corridorX(0)-20).toFixed(1));
  set('ap-ship','transform','translate('+A.x.toFixed(1)+' 135)');
  const ship=document.getElementById('ap-ship');if(ship)ship.classList.toggle('warn',Math.abs(off)>hw*.75);
  const dist=document.getElementById('ap-dist');if(dist)dist.textContent=Math.round(A.d)+' м';
  const sp=document.getElementById('ap-speed');if(sp){sp.textContent=A.v.toFixed(1)+' м/с';sp.className=A.v<=3?'ok':A.v>8?'bad':'';}
  const now=performance.now();
  if(state.trust.mara>=C.bonds.perks.mara.need&&now-A.hintAt>1400){
    A.hintAt=now;
    const H=C.docking.hints;
    const hint=Math.abs(off)>hw*.6?(off>0?H.left:H.right):(A.d<120&&A.v>4?H.slow:H.good);
    const el=document.getElementById('ap-hint');if(el)el.textContent=hint;
  }
}
function stopApproach(){if(approach?.raf){cancelAnimationFrame(approach.raf);approach.raf=0;}}
function finishApproach(style){
  if(!approach||approach.done)return;
  approach.done=true;stopApproach();approach=null;
  if(style==='clean'){sfx.open();haptic(true,[40,60,40,60,120]);}else{sfx.fail();haptic(true,[150,80,150]);}
  run('dock',style);
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
      else body=labBody();
      break;
    }
    case 'analysis':
      title='Пост аналитика';
      body=state.task?.done?card(C.documents.analysis.title,p(C.documents.analysis.text))+(state.versions?card(C.documents.versions.title,'<p class="sheet">'+esc(C.documents.versions.text)+'</p>'):versionsBody()):
        state.task?p('Ирена сверяет маршрут запроса. Осталось действий: '+Math.max(0,state.task.due-state.tick)+'. Перемещение и другие значимые действия продвигают время.'):
        p('Сопоставьте две ведомости в кабинете, затем поручите Ирене найти источник записи.')+btn('assign','','Поручить проверку',{disabled:!state.deduction});
      if (state.task&&!state.task.done) body+=btn('wait','','Подождать');
      break;
    case 'reader':
      title='Шлюзовой считыватель';
      body=propArt('reader')+(state.reader?p('Бортовой допуск подтверждён.'):!state.inventory.includes('badge')?p('Нужен служебный идентификатор из кабинета.'):readerBody());
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
      ].map(([ok,label])=>p((ok?'✓ ':'○ ')+label)).join(''))+btn('panel','approach','Начать подход',{disabled:!E.dockReady(state)||state.room!=='cockpit',primary:true})+
      (state.task&&!state.task.done?btn('wait','','Дождаться результата'):'');
      break;
    case 'evacuation':
      title='Порядок эвакуации';
      body=state.priority?card('Приоритет: '+C.evacuation.options[state.priority].label,p(C.evacuation.reply[state.priority])):
        p('Рейн: «'+C.evacuation.question+'»')+'<div class="reply-choices">'+Object.keys(C.evacuation.options).map(id=>
          '<button type="button" class="btn reply-choice" data-act="priority" data-value="'+id+'"><strong>'+esc(C.evacuation.options[id].label)+'</strong><span>'+esc(C.evacuation.options[id].note)+'</span></button>').join('')+'</div>';
      break;
    case 'approach':
      title='Подход к причалу';
      body=approachBody();
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
      body=crew?crewCard(state.crew,true):'';
      break;
    }
    case 'crew':
      title='Экипаж';
      body=p('Отношения с каждым считаются отдельно: доверие к командиру, личная близость и согласие с вашими методами.')+
        '<div class="crew-grid">'+E.crewIds.map(id=>crewCard(id,false)).join('')+'</div>'+
        '<h3>Внутри экипажа</h3>'+'<div class="crew-pairs">'+C.bonds.pairs.map(pair=>'<div class="crew-pair"><strong>'+esc(C.bonds.short[pair.a])+' — '+esc(C.bonds.short[pair.b])+'</strong><span>'+esc(pair.text)+'</span></div>').join('')+'</div>';
      break;
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
      title='Меню';
      body='<div class="menu-list">'+btn('close','','Продолжить игру',{primary:true})+btn('save','','Сохранить вручную')+btn('load','','Загрузить ручное сохранение')+btn('restart','','Начать заново')+btn('title-menu','','Главное меню')+'</div>'+
        '<h3>Настройки</h3>'+settingsBody()+
        '<small>'+esc(storageAvailable?'Прогресс сохраняется автоматически после каждого действия.':'Браузер ограничил доступ к сохранениям.')+'</small>';
      break;
    case 'settings':
      title='Настройки';
      body=settingsBody();
      break;
    case 'confirm-new':
      title='Начать заново?';
      body=p('Автосохранение будет сброшено. Ручное сохранение останется.')+'<div class="menu-list">'+btn('restart-yes','','Да, начать заново',{primary:true})+btn('close','','Отмена')+'</div>';
      break;
  }
  dialog.innerHTML='<div class="panel-top"><div class="panel-grip" aria-hidden="true"></div><header class="panel-head"><h2 id="panel-title">'+esc(title)+'</h2><button type="button" class="icon-btn" data-act="close" aria-label="Закрыть">'+ico('close')+'</button></header><div id="panel-feedback" role="status"></div></div><div class="panel-body">'+body+'</div>';
  if(activePanel==='desk')requestAnimationFrame(drawLines);
  if(activePanel==='reader'&&!state.reader)startReader();else stopReader();
  if(activePanel==='approach')startApproach();else stopApproach();
}
dialog.addEventListener('close',()=>{activePanel='';dialog.classList.remove('closing');dialog.style.transform='';stopReader();stopApproach();});
let sheetDrag=null;
dialog.addEventListener('pointerdown',event=>{
  if(!event.target.closest('.panel-grip, .panel-head')||event.target.closest('button'))return;
  if(!window.matchMedia('(max-width: 760px)').matches)return;
  sheetDrag={y:event.clientY,dy:0};dialog.style.transition='none';
});
window.addEventListener('pointermove',event=>{
  if(!sheetDrag)return;
  sheetDrag.dy=Math.max(0,event.clientY-sheetDrag.y);
  dialog.style.transform='translateY('+sheetDrag.dy+'px)';
});
window.addEventListener('pointerup',()=>{
  if(!sheetDrag)return;
  const far=sheetDrag.dy>90;sheetDrag=null;dialog.style.transition='';
  if(far)closePanel();else dialog.style.transform='';
});
document.addEventListener('click',event=>{
  sfx.wake();
  if(typing&&event.target.closest('.typing-host')){completeTyping();return;}
  if(event.target===dialog){
    const r=dialog.getBoundingClientRect();
    if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom){closePanel();return;}
  }
  const control=event.target.closest('[data-act]');
  if(!control) return;
  let {act,value}=control.dataset;
  if(act!=='close'&&!control.closest('.dial, .desk-board'))sfx.click(false);
  if(act==='title-continue'){titleOpen=false;render();return;}
  if(act==='title-new'){if(state.intro>0){openPanel('confirm-new');return;}titleOpen=false;render();return;}
  if(act==='title-menu'){closePanel();titleOpen=true;render();return;}
  if(act==='set-sound'){settings.sound=value==='1';saveSettings();if(settings.sound){sfx.wake();sfx.click(true);}sfx.ambient(ambientWanted);paintPanel();return;}
  if(act==='set-vibro'){settings.vibro=value==='1';saveSettings();haptic(true,40);paintPanel();return;}
  if(act==='set-speed'){settings.speed=value;saveSettings();paintPanel();return;}
  if(act==='topic'&&state.crew)askedTopics.add(state.crew+':'+value);
  if(act==='panel'){
    if(value==='desk'){pendingLink=null;pickFrom=null;}
    if(value==='safe'){dialEntered=[];}
    openPanel(value);return;
  }
  if(act==='link-kind'&&pendingLink){deskResult='';links.push({...pendingLink,kind:value});pendingLink=null;paintPanel();return;}
  if(act==='link-cancel'){pendingLink=null;pickFrom=null;paintPanel();return;}
  if(act==='link-remove'){deskResult='';links.splice(Number(value),1);paintPanel();return;}
  if(act==='link-check'){
    sfx.wake();
    const result=run('deduce',{links:links.map(({a,b,kind})=>({a,b,kind}))});
    if(!result.ok){
      deskResult=result.message;sfx.fail();haptic(true,[90,50,90]);paintPanel();
      document.getElementById('desk-result')?.scrollIntoView({block:'nearest',behavior:'smooth'});
    } else {deskResult='';sfx.open();haptic(true,[40,60,40]);}
    return;
  }
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
  if(act==='lab-fix'){
    sfx.wake();
    const match=labMatch();
    const result=run('calibrate',match>=97?'precise':match>=labNeed()?'baseline':'noise');
    if(result.ok){sfx.open();haptic(true,[40,60,40]);}else{sfx.fail();haptic(true,[90,50,90]);labResult=result.message;paintPanel();}
    return;
  }
  if(act==='reader-tap'){sfx.wake();readerTap();return;}
  if(act==='version-pick'){
    sfx.wake();
    const [v,field]=value.split('|');
    const result=run('versions',{version:Number(v),field});
    if(result.ok){sfx.open();haptic(true,[40,60,40]);versionResult='';}else{sfx.fail();haptic(true,[90,50,90]);versionResult=result.message;paintPanel();}
    return;
  }
  if(act==='approach-handover'){finishApproach('assisted');return;}
  if(act==='use'&&value==='badge'&&state.room==='airlock'&&!state.reader){openPanel('reader');return;}
  if(act==='show'||act==='priority')sfx.wake();
  if(act==='close'){closePanel();return;}
  if(act==='speech-next'){speechPage++;render();return;}
  if(act==='dismiss-thought'){thoughtOpen=false;render();return;}
  if(act==='save'){notify(persist(manualKey)?'Ручное сохранение записано.':'Сохранение недоступно.');return;}
  if(act==='restart'){openPanel('confirm-new');return;}
  if(act==='restart-yes'){
    state=E.fresh();titleOpen=false;typedKeys.clear();askedTopics.clear();seenBonds=0;lastCrew=null;
    speechPage=0;thoughtOpen=false;links=[];pendingLink=null;pickFrom=null;dialEntered=[];dialRot=0;documentId='';labResult='';versionResult='';memoryOn=false;
    closePanel();persist();render();
    return;
  }
  if(act==='load'){
    try {
      const raw=localStorage.getItem(manualKey);
      if(!raw){notify('Ручного сохранения пока нет.');return;}
      state=E.restore(JSON.parse(raw));
      speechPage=0;thoughtOpen=false;titleOpen=false;seenBonds=state.bondLog.length;
      closePanel();persist();render();notify('Ручное сохранение загружено.');
    }catch{notify('Не удалось прочитать ручное сохранение.');}
    return;
  }
  run(act,act==='topic'?Number(value):value,value);
});
render();
})();
