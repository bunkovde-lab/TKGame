import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

// Экипаж в главе I: переговоры, личные истории, чтение людей, мини-игры, эпилог
const load=(files,extra={})=>{const ctx=vm.createContext({window:{},...extra});for(const f of files)vm.runInContext(readFileSync(new URL(`../site/chapter/${f}`,import.meta.url),'utf8'),ctx,{filename:f});return ctx;};
const ctx=load(['data.js','story.js','crew.js','engine.js']);
const D=ctx.window.CHAPTER_DATA,E=ctx.window.CHAPTER_ENGINE;
const clone=v=>JSON.parse(JSON.stringify(v));
function game(initial=E.fresh()){
  let state=initial;
  return {get state(){return state;},set state(v){state=v;},go(place){if(state.location!==place)this.do('move',place);},do(action,value,expected=true){
    const prev=state,r=E.dispatch(state,action,value);
    assert.equal(r.ok,expected,`${action} ${JSON.stringify(value)}: ${r.message}`);
    if(!expected)assert.equal(r.state,prev);
    state=r.state;return r;}};
}

// Данные: сцены, линзы, игры ссылаются на существующее
const topicIds=new Set(Object.values(D.npcs).flatMap(n=>n.topics.map(t=>t.id)));
for(const sc of D.scenes){
  assert.ok(sc.lines.length>=3,`scene ${sc.id} lines`);
  for(const [id] of sc.lines)assert.ok(['mara','corvin','irena','rein'].includes(id));
  assert.ok(Object.keys(sc.options).length>=2);
}
for(const [npc,r] of Object.entries(D.reads)){
  assert.ok(D.npcs[npc],npc);assert.ok(topicIds.has(r.topic),`read topic ${r.topic}`);
  assert.ok(D.lenses[r.lens]);for(const l of Object.keys(D.lenses))assert.ok(r.tells[l],`${npc} tell ${l}`);
  for(const e of r.confront.gives||[])assert.ok(D.evidence[e]);
}
for(const [id,g] of Object.entries(D.games)){
  if(g.object)assert.ok(Object.values(D.locations).some(l=>l.objects.some(o=>o.id===g.object)),`game ${id} object`);
  if(g.puzzle)assert.ok(D.puzzles[g.puzzle]);
}
const known=new Set([...Object.keys(D.evidence),...Object.keys(D.conclusions),...Object.keys(D.puzzles)]);
for(const id of ['mara','corvin','irena','rein']){
  const own=D.npcs[id].topics.filter(t=>t.personal);
  assert.equal(own.length,2,`${id}: две личные истории`);
  for(const t of own)for(const r of t.requires)assert.ok(known.has(r),`${t.id} requires ${r}`);
}

// Связь с экипажем стартует из пролога
const fresh=E.fresh();assert.equal(JSON.stringify(fresh.bonds),'{"mara":1,"corvin":1,"irena":1,"rein":1}');
const pr=E.fresh({path:'law',team:['corvin','irena'],mira:'full',center:'law',mood:{mara:'low',corvin:'high',irena:'high',rein:'mid'}});
assert.equal(pr.bonds.corvin,2);assert.equal(pr.bonds.mara,0);assert.equal(E.moodOf(pr,'mara'),'low');assert.equal(E.taskTime(pr),3);

// Личная история: закрыта без улики и без доверия; открывается и сближает
let g=game(clone(fresh));g.do('move','office');g.do('talk','rein');
assert.ok(!E.availableTopics(g.state,'rein').some(t=>t.id==='rein-perimeter'));
g.state.evidence.push('signalreport','timeline');
assert.ok(E.availableTopics(g.state,'rein').some(t=>t.id==='rein-perimeter'));
assert.ok(!E.availableTopics(g.state,'rein').some(t=>t.id==='rein-count'),'вторая история требует доверия');
const before=g.state.bonds.rein;g.do('topic','rein-perimeter');
assert.equal(g.state.bonds.rein,before+1);assert.match(g.do('topic','rein-perimeter').passage,/Периметр держать/);
assert.ok(E.availableTopics(g.state,'rein').some(t=>t.id==='rein-count'),'доверие открыло вторую историю');
g.do('topic','rein-count');

// Прошлое из пролога меняет ответы
const withFound=E.fresh({path:'law',team:['mara','rein'],mira:'partial',center:'calc',found:['routes','breachLog']});
assert.match(E.topicText(withFound,D.npcs.mara.topics.find(t=>t.id==='mara-callsign')),/знал/);
assert.match(E.topicText(withFound,D.npcs.chief.topics.find(t=>t.id==='chief-center')),/формально/);
assert.doesNotMatch(E.topicText(fresh,D.npcs.chief.topics.find(t=>t.id==='chief-center')),/формально/);

// Переговоры экипажа: появляются после поворота, решение меняет связи и сохраняется
g=game(clone(fresh));assert.equal(E.pendingScene(g.state),null);
g.state.conclusions.push('transfer');assert.equal(E.pendingScene(g.state).id,'seventh');
g.do('scene',{id:'seventh',option:'nope'},false);
const c0=g.state.bonds.corvin,m0=g.state.trust.mira;
g.do('scene',{id:'seventh',option:'tell'});
assert.equal(g.state.bonds.corvin,c0+1);assert.equal(g.state.trust.mira,m0+1);assert.equal(g.state.scenes.seventh,'tell');
g.do('scene',{id:'seventh',option:'wait'},false);
assert.equal(E.pendingScene(g.state),null);
assert.equal(E.restore(clone(g.state)).scenes.seventh,'tell');
g.do('scene',{id:'neri',option:'shield'},false);

// Чтение людей: неверная линза не даёт улики, верная открывает «Уличить»
g=game(clone(fresh));g.do('take','camera');g.do('talk','courier');
g.do('read','eyes',false);g.do('confront',null,false);
g.do('topic','courier-camera');
g.do('read','pulse');g.do('confront',null,false);
const t0=g.state.tick;g.do('pause');assert.equal(g.state.tick,t0+1);
assert.match(g.do('read','eyes').message,/Несоответствие/);
g.do('confront');assert.ok(g.state.caught.includes('courier'));assert.equal(g.state.trust.courier??0,0);
g.do('end-talk');g.go('registry');g.state.evidence=g.state.evidence.filter(x=>x!=='badgecopy');
g.do('talk','clerk');g.do('topic','clerk-warrant');g.do('topic','clerk-clocks');g.do('read','eyes');g.do('confront');
assert.ok(g.state.evidence.includes('badgecopy'),'уличённый регистратор отдаёт журнал допуска');
assert.equal(E.restore(clone(g.state)).caught.join(),'courier,clerk');

// Мини-игры: точная проверка бесплатна, грубая стоит времени
const t1=g.state.tick;g.do('game',{id:'scrub'});assert.equal(g.state.tick,t1);
g.do('game',{id:'thermal',skip:true});assert.equal(g.state.tick,t1+2);g.do('game',{id:'nope'},false);

// Полное дело: сцены по ходу, эпилог связывает с прологом и Узлом-9
const run=game(E.fresh({path:'calc',team:['corvin','rein'],mira:'full',center:'law',late:'no'}));
const scenes=()=>{let sc;while((sc=E.pendingScene(run.state)))run.do('scene',{id:sc.id,option:Object.keys(sc.options)[0]});};
run.do('take','camera');
run.go('waiting');run.do('take','familypass');run.do('take','thermalprint');
run.go('registry');run.do('take','warrant');run.do('take','badgecopy');
run.go('clinic');for(const id of ['wristband','medicalnote','sedative'])run.do('take',id);
run.go('warehouse');run.do('take','maintenance');run.do('take','payment');
run.go('archive');run.do('take','archivecopy');run.do('talk','archivist');run.do('topic','archivist-dahl');run.do('end-talk');scenes();
run.go('office');
for(const id of ['bio','records','timeline'])run.do('solve',{id,answer:D.puzzles[id].answer});
run.do('deduce',{id:'transfer',evidence:[...D.conclusions.transfer.requires]});run.do('assign');scenes();
for(const id of ['forgery','route'])run.do('deduce',{id,evidence:[...D.conclusions[id].requires]});scenes();
run.do('sanction',['warrant','bioreport','archivecopy']);scenes();
run.go('warehouse');run.do('combat',{id:'cargo',plan:'protect'});scenes();
run.go('relay');run.do('take','relaykey');run.do('take','couriernote');
run.go('office');run.do('solve',{id:'signal',answer:D.puzzles.signal.answer});
run.do('talk','rein');run.do('topic','rein-perimeter');run.do('end-talk');
run.do('deduce',{id:'mastermind',evidence:[...D.conclusions.mastermind.requires]});scenes();
assert.equal(Object.keys(run.state.scenes).sort().join(),'center,dahl,fight,neri,seventh,verdict');
run.go('registry');run.do('interview','evidence');
assert.ok(run.state.tick<132,`маршрут с экипажем укладывается до вылета: ${run.state.tick}`);
const end=run.do('finish','rescue');
assert.match(end.passage,/договорились на канале/);
assert.match(end.passage,/дело Узла-9 закрыто/);
assert.match(end.passage,/Периметр держать, внутрь не входить/);
assert.match(end.passage,/Узел-9 ждёт/);

// Интерфейс: канал экипажа, линзы и мини-игры
const listeners={},storage=new Map();
const app={innerHTML:''},feedback={textContent:''},notice={textContent:''};
const panel={open:false,innerHTML:'',showModal(){this.open=true;},close(){this.open=false;},querySelector(){return null;},addEventListener(){}};
const ui=vm.createContext({console,setTimeout:()=>0,clearTimeout(){},performance,document:{querySelector:s=>s==='#app'?app:s==='#panel'?panel:notice,addEventListener:(name,fn)=>{listeners[name]=fn;}},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)}});
ui.window=ui;
for(const f of ['data.js','story.js','crew.js','engine.js'])vm.runInContext(readFileSync(new URL(`../site/chapter/${f}`,import.meta.url),'utf8'),ui,{filename:f});
const seed=ui.CHAPTER_ENGINE.fresh();seed.conclusions=['transfer'];seed.evidence.push('camera','sedative','medicalnote');
storage.set('tkgame-chapter1-auto-v1',JSON.stringify(seed));
vm.runInContext(readFileSync(new URL('../site/chapter/ui.js',import.meta.url),'utf8'),ui,{filename:'ui.js'});
const click=(a,v='',extra={})=>listeners.click({target:{closest:()=>({dataset:{a,v,...extra}})}});
const st=()=>JSON.parse(storage.get('tkgame-chapter1-auto-v1'));
assert.match(app.innerHTML,/Экипаж на связи/);
click('panel-scene','seventh');assert.match(panel.innerHTML,/argue-line/);assert.match(panel.innerHTML,/reply-choice/);
click('scene-choose','guard');assert.equal(st().scenes.seventh,'guard');assert.match(panel.innerHTML,/Решение: Молчать/);
click('close');assert.doesNotMatch(app.innerHTML,/Экипаж на связи/);
click('talk','courier');click('topic','courier-camera');for(let i=0;i<8&&/next-page/.test(app.innerHTML);i++)click('next-page');
assert.match(app.innerHTML,/lens-row/);click('read','eyes');assert.match(app.innerHTML,/Взгляд/);click('dismiss-speech');
assert.match(app.innerHTML,/data-a="confront"/);click('confront');assert.ok(st().caught.includes('courier'));
click('leave-talk');click('move','waiting');click('object','thermalprint');assert.match(panel.innerHTML,/g-receipt/);
click('game-zone','time');click('game-zone','shop');click('game-pick','shop');assert.ok(!st().evidence.includes('thermalprint'));
click('game-pick','time');assert.ok(st().games.includes('thermal'));assert.ok(st().evidence.includes('thermalprint'));
click('move','office');click('puzzle','bio');assert.match(panel.innerHTML,/g-spectrum/);
click('game-check','calib');assert.ok(!st().games.includes('calib'));
click('game-skip','calib');assert.ok(st().games.includes('calib'));assert.match(panel.innerHTML,/lab-table/);
click('panel','diary');assert.match(panel.innerHTML,/Канал экипажа · Седьмая строка/);
click('panel','crew');assert.match(panel.innerHTML,/Личное 0\/2/);

// Режимы, вечер, дуэль, память порта, табло
{
  const g2=game(clone(fresh));g2.do('mode','detective');assert.equal(g2.state.mode,'detective');g2.do('mode','bad',false);
  g2.do('move','office');const t=g2.state.tick;g2.do('deduce',{id:'transfer',evidence:['manifest']});assert.equal(g2.state.tick,t+2,'следователь платит за ошибку дороже');
  g2.do('evening','mara',false);
  g2.state.tick=110;const b0=g2.state.bonds.rein;const ev=g2.do('evening','rein');assert.equal(g2.state.bonds.rein,b0+1);assert.match(ev.passage,/Рейн:/);
  g2.do('evening','mara',false);assert.equal(E.restore(clone(g2.state)).evening,'rein');assert.equal(E.restore(clone(g2.state)).mode,'detective');
  g2.do('duel','lost',false);g2.go('registry');const h=g2.state.heat;g2.do('duel','lost');assert.equal(g2.state.heat,h+1);
  for(const c of D.duel.claims)for(const e of c.counters)assert.ok(D.evidence[e],`duel counter ${e}`);
  const m=clone(fresh);m.talked=['courier-camera'];m.caught=['courier'];assert.match(D.memoryLine(m,'courier'),/юлю/);
  m.caught=[];m.talked.push('courier-pressure');assert.match(D.memoryLine(m,'courier'),/тише/);
  assert.equal(D.memoryLine(fresh,'courier'),'');
  assert.ok(D.news({...clone(fresh),sanction:true}).some(x=>/санкцию/.test(x)));
}
// Интерфейс: доска улик и дуэль
{
  const st2=ui.CHAPTER_ENGINE.restore(st());st2.location='office';st2.activeNpc=null;storage.set('tkgame-chapter1-auto-v1',JSON.stringify(st2));
  click('deduction','forgery');assert.match(panel.innerHTML,/class="board"/);assert.match(panel.innerHTML,/class="pin/);
  assert.match(panel.innerHTML,/Когда подписан карантин/);click('board-pick','manifest');assert.match(panel.innerHTML,/pin tied/);assert.match(panel.innerHTML,/link-slot active/);click('board-pick','camera');click('board-pick','sedative');
  const t=st().tick;click('submit-deduction','forgery');assert.ok(st().tick>t);assert.ok(!st().conclusions.includes('forgery'));
  const s3=st();s3.location='registry';s3.conclusions.push('forgery');s3.evidence.push(...D.duel.claims.flatMap(c=>c.counters),'orderchain');s3.evidence=[...new Set(s3.evidence)];
  storage.set('tkgame-chapter1-auto-v1',JSON.stringify(s3));
}
console.log('chapter crew ok');
