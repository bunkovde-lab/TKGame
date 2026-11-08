import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const context=vm.createContext({window:{}});
for(const file of ['data.js','engine.js'])vm.runInContext(readFileSync(new URL(`../site/chapter/${file}`,import.meta.url),'utf8'),context,{filename:file});
const D=context.window.CHAPTER_DATA,E=context.window.CHAPTER_ENGINE;
const clone=value=>JSON.parse(JSON.stringify(value));
function game(initial=E.fresh()){
  let state=initial; const log=[];
  return {get state(){return state;},log,go(place){if(state.location!==place)this.do('move',place);},do(action,value,expected=true){
    const previous=state,result=E.dispatch(state,action,value);
    assert.equal(result.ok,expected,`${action} ${JSON.stringify(value)}: ${result.message}`);
    if(!expected)assert.equal(result.state,previous,'Rejected actions must preserve state');
    state=result.state;log.push([action,value]);return result;
  }};
}
function collect(g,{objects=true,pressure=false,skipNPC=[]}={}){
  const before=JSON.stringify([g.state.evidence,g.state.talked,g.state.conclusions,g.state.puzzles]);
  for(const place of E.unlocked(g.state)){
    g.go(place);
    if(objects)for(const o of D.locations[place].objects||[]){
      const id=o.evidence||o.id;
      if(D.evidence[id]&&!g.state.evidence.includes(id)&&E.has(g.state,o.requires||[]))g.do('take',o.id);
    }
    for(const [id,npc] of Object.entries(D.npcs))if(!skipNPC.includes(id)&&E.available(g.state,id)){
      g.do('talk',id);
      for(const t of E.availableTopics(g.state,id))if(!g.state.talked.includes(t.id)&&(pressure||t.style!=='pressure'))g.do('topic',t.id);
      g.do('end-talk');
    }
  }
  return before!==JSON.stringify([g.state.evidence,g.state.talked,g.state.conclusions,g.state.puzzles]);
}
function progress(g,options){
  for(let pass=0;pass<12;pass++){
    let changed=collect(g,options);g.go('office');
    for(const [id,p] of Object.entries(D.puzzles))if(!g.state.puzzles.includes(id)&&E.has(g.state,p.requires)){
      g.do('solve',{id,answer:p.answer});changed=true;
    }
    for(const [id,c] of Object.entries(D.conclusions))if(!g.state.conclusions.includes(id)&&c.requires.every(x=>g.state.evidence.includes(x))){
      g.do('deduce',{id,evidence:[...c.requires]});changed=true;
    }
    if(E.known(g.state,'transfer')&&!g.state.task){g.do('assign');changed=true;}
    if(g.state.task&&!g.state.task.done){g.do('wait');changed=true;}
    if(!changed)return;
  }
  assert.fail('Progression failed to reach a stable state');
}

assert.ok(Object.keys(D.locations).length>=8,'Eight scene locations');
assert.ok(Object.keys(D.puzzles).length>=4,'Four investigation puzzles');
const knownIds=new Set([...Object.keys(D.evidence),...Object.keys(D.conclusions),...Object.keys(D.puzzles)]);
const topicIds=new Set();
for(const [id,npc]of Object.entries(D.npcs)){
  assert.ok(D.locations[npc.location],`NPC ${id} has a real location`);
  for(const t of npc.topics){
    assert.ok(!topicIds.has(t.id),`Duplicate dialogue topic ${t.id}`);topicIds.add(t.id);
    for(const r of t.requires||[])assert.ok(knownIds.has(r),`Topic ${t.id} condition ${r}`);
    for(const e of t.gives||[])assert.ok(D.evidence[e],`Topic ${t.id} award ${e}`);
  }
}
for(const [id,location]of Object.entries(D.locations))for(const o of location.objects){
  if(o.evidence)assert.ok(D.evidence[o.evidence],`Object ${id}/${o.id} evidence reference`);
  for(const r of o.requires||[])assert.ok(knownIds.has(r),`Object ${id}/${o.id} condition ${r}`);
}
for(const [id,c]of Object.entries(D.conclusions))for(const e of c.requires)assert.ok(D.evidence[e],`Conclusion ${id} references missing evidence ${e}`);
for(const [id,p]of Object.entries(D.puzzles)){
  assert.ok(p.options.some(x=>x.id===p.answer),`Puzzle ${id} has a valid answer`);
  for(const e of p.awards)assert.ok(D.evidence[e],`Puzzle ${id} award ${e}`);
  const w=p.interaction;
  if(w){
    const selectable=new Set([...(w.rows||[]),...(w.tiles||[]),...(w.columns||[]).flatMap(c=>c.fields)].map(x=>x.id));
    for(const group of [w.correct,...(w.stages||[]).map(s=>s.correct)].filter(Boolean))
      for(const choice of group)assert.ok(selectable.has(choice),`Puzzle ${id} solution ${choice} exists in interactive controls`);
  }
}
const start=game();
start.do('move','relay',false);
start.do('talk','does-not-exist',false);
start.do('inspect','confession',false);
start.do('finish','expose',false);
start.do('sanction',[],false);
assert.equal(E.restore({version:-1,ending:'expose'}).ending,null);
assert.equal(E.restore({version:1,location:'missing',tick:-1}).location,'port');
assert.equal(E.clock({tick:48}),'08:00');
assert.equal(E.clock({tick:132}),'22:00');
assert.equal(E.clock({tick:144}),'00:00');

// An efficient route gathers actual independent clues and resolves all four
// puzzles, rather than injecting an artificial pre-departure clock/state.
const efficient=game();
efficient.do('take','camera');
efficient.go('waiting');efficient.do('take','familypass');efficient.do('take','thermalprint');
efficient.go('registry');efficient.do('take','warrant');efficient.do('take','badgecopy');
efficient.go('clinic');
for(const id of ['wristband','medicalnote','sedative'])efficient.do('take',id);
efficient.go('warehouse');efficient.do('take','maintenance');efficient.do('take','payment');
efficient.go('archive');efficient.do('take','archivecopy');
efficient.go('office');
for(const id of ['bio','records','timeline'])efficient.do('solve',{id,answer:D.puzzles[id].answer});
efficient.do('deduce',{id:'transfer',evidence:[...D.conclusions.transfer.requires]});efficient.do('assign');
for(const id of ['forgery','route'])efficient.do('deduce',{id,evidence:[...D.conclusions[id].requires]});
efficient.do('sanction',['warrant','bioreport','archivecopy']);
assert.ok(efficient.state.task.done,'Preparing the case gives Irеna enough time for independent verification');
efficient.go('warehouse');efficient.do('combat',{id:'cargo',plan:'protect'});
assert.ok(efficient.state.evidence.includes('cargowitness'));
assert.ok(!efficient.state.evidence.includes('witness'),'Protecting a dock witness must not fabricate Mira\'s testimony');
efficient.go('relay');efficient.do('take','relaykey');efficient.do('take','couriernote');
assert.equal(E.departureKnown(efficient.state),true);
efficient.go('office');efficient.do('solve',{id:'signal',answer:D.puzzles.signal.answer});
efficient.do('deduce',{id:'mastermind',evidence:[...D.conclusions.mastermind.requires]});
efficient.go('registry');efficient.do('interview','evidence');
const earlyFinishTick=efficient.state.tick;
assert.ok(earlyFinishTick<132,`Efficient actual route must finish before 22:00, got tick ${earlyFinishTick}`);
const earlyEnding=efficient.do('finish','rescue');
for(const id of efficient.state.evidence)assert.ok(D.evidence[id],`Runtime evidence ${id} has journal metadata`);
assert.match(earlyEnding.passage,/до отхода транспорта/);
assert.doesNotMatch(earlyEnding.passage,/уже покинула внутренний причал/);
assert.equal(E.restore(clone(efficient.state)).endingPassage,efficient.state.endingPassage);

// Reading every available topic is insufficient without objects, analysis and deduction.
const spam=game();
for(let i=0;i<8&&collect(spam,{objects:false});i++);
assert.equal(spam.state.conclusions.length,0);
assert.equal(E.endReady(spam.state,'expose'),false);
assert.equal(E.endReady(spam.state,'rescue'),false);
assert.equal(E.endReady(spam.state,'covert'),false);
spam.do('finish','expose',false);

const complete=game();progress(complete);
assert.ok(complete.state.tick>=132,'Exhaustive interviews and collection cross the departure deadline');
assert.ok(complete.state.conclusions.includes('mastermind'),'The case must be solvable through actual clue actions');
assert.equal(complete.state.puzzles.length,Object.keys(D.puzzles).length);
assert.ok(complete.state.task?.done,'Timed analyst assignment completes');
assert.ok(complete.state.evidence.includes('orderchain'));
const checkpoint=clone(complete.state);
const restored=E.restore(checkpoint);
for(const key of ['evidence','conclusions','puzzles','task','tick','location'])assert.deepEqual(clone(restored[key]),checkpoint[key],`Save restores ${key}`);

// A wrong laboratory method has a cost and cannot be retried without preparation.
for(const [id,p]of Object.entries(D.puzzles)){
  const s=clone(checkpoint);s.location='office';s.puzzles=s.puzzles.filter(x=>x!==id);s.evidence=s.evidence.filter(x=>!p.awards.includes(x));s.inspected=[...new Set([...s.inspected,...p.requires])];
  const g=game(s),wrong=p.options.find(x=>x.id!==p.answer);assert.ok(wrong);
  const tick=g.state.tick;g.do('solve',{id,answer:wrong.id});
  assert.ok(g.state.tick>tick);assert.ok(!g.state.puzzles.includes(id));
  g.do('solve',{id,answer:p.answer},false);
  g.do('prepare',id);g.do('solve',{id,answer:p.answer});
  assert.ok(g.state.puzzles.includes(id));
}
// Exact independent evidence is required; neither surplus nor repeated entries work.
for(const [id,c]of Object.entries(D.conclusions)){
  const s=clone(checkpoint);s.location='office';s.conclusions=s.conclusions.filter(x=>x!==id);
  const g=game(s),tick=g.state.tick;g.do('deduce',{id,evidence:[]});
  assert.ok(!g.state.conclusions.includes(id));assert.ok(g.state.tick>tick);
  g.do('deduce',{id,evidence:[]},false);
  g.do('deduce',{id,evidence:[...c.requires,c.requires[0]]});
  assert.ok(!g.state.conclusions.includes(id));
  g.do('deduce',{id,evidence:[...c.requires]});
}

const inquiry=game(clone(checkpoint));inquiry.go('office');
inquiry.do('sanction',['manifest','payment']);
assert.equal(inquiry.state.sanction,false);
inquiry.do('sanction',['manifest','payment'],false);
inquiry.go('registry');inquiry.do('interview','pressure');
assert.equal(inquiry.state.interview,false);
assert.ok(inquiry.state.evidence.includes('falseconfession'));
assert.ok(!inquiry.state.evidence.includes('confession'));
assert.equal(E.endReady(inquiry.state,'expose'),false,'False confession alone cannot establish ending');
inquiry.do('interview','pressure',false);
inquiry.do('interview','evidence');assert.equal(inquiry.state.interview,true);
inquiry.do('interview','evidence',false);
inquiry.go('office');inquiry.do('sanction',['warrant','bioreport','archivecopy']);
assert.ok(E.endReady(inquiry.state,'expose'));
const finalCheckpoint=clone(inquiry.state);

const expose=game(clone(finalCheckpoint));expose.do('finish','expose');
assert.equal(expose.state.ending,'expose');expose.do('move','port',false);
const rescue=game(clone(finalCheckpoint));rescue.go('warehouse');
rescue.do('combat',{id:'cargo',plan:'protect'});rescue.do('combat',{id:'cargo',plan:'force'},false);
assert.ok(E.endReady(rescue.state,'rescue'));
const lateEnding=rescue.do('finish','rescue');
assert.match(lateEnding.passage,/уже покинула внутренний причал/);
assert.match(lateEnding.passage,/перехват/);
assert.doesNotMatch(lateEnding.passage,/до отхода транспорта/);
const covert=game(clone(finalCheckpoint));
assert.ok(E.endReady(covert.state,'covert'));covert.do('finish','covert');
const peaceful=game(clone(finalCheckpoint));
assert.deepEqual([...peaceful.state.combat],[]);peaceful.do('finish','expose');

// Force changes the story but does not destroy the independent archival route.
const force=game(clone(finalCheckpoint));force.go('warehouse');
force.do('combat',{id:'cargo',plan:'force'});assert.equal(force.state.injury,1);
force.go('relay');force.do('combat',{id:'relay',plan:'withdraw'});
assert.equal(force.state.combat.length,2);assert.ok(E.endReady(force.state,'expose'));
force.do('finish','expose');
const noSanction=game(clone(checkpoint));noSanction.go('warehouse');
noSanction.do('combat',{id:'cargo',plan:'coordinate'},false);
const relayCopy=game(clone(checkpoint));relayCopy.go('relay');
const heat=relayCopy.state.heat;relayCopy.do('combat',{id:'relay',plan:'evidence'});
assert.equal(relayCopy.state.heat,heat+1,'Remote alarm has the political consequence stated by the scene');
assert.ok(relayCopy.state.history.includes('relay-copy'));

const noWitness=game();progress(noWitness,{skipNPC:['mira']});
assert.ok(!noWitness.state.evidence.includes('witness'));
assert.ok(E.known(noWitness.state,'mastermind'),'Independent material route survives loss of principal witness');
noWitness.go('registry');noWitness.do('interview','rapport');
noWitness.go('office');noWitness.do('sanction',['warrant','bioreport','archivecopy']);
noWitness.do('finish','expose');

// The task's due tick survives a mid-assignment save and completes once.
const pending=clone(checkpoint);pending.task={due:pending.tick+2,done:false};pending.evidence=pending.evidence.filter(x=>x!=='orderchain');
const timed=game(E.restore(pending));timed.do('wait');assert.equal(timed.state.task.done,false);
timed.do('wait');assert.equal(timed.state.task.done,true);
assert.equal(timed.state.evidence.filter(x=>x==='orderchain').length,1);
timed.do('wait');assert.equal(timed.state.evidence.filter(x=>x==='orderchain').length,1);
const dialogueWords=Object.values(D.npcs).flatMap(n=>[n.greeting,...n.topics.map(t=>t.text)]).join(' ').split(/\s+/).filter(Boolean).length;
console.log(`PASS chapter: data integrity; dialogue-only rejection; ${complete.log.length} legal clue actions; ${Object.keys(D.puzzles).length} puzzle retry gates; exact deductions; sanction refusal/recovery; false confession; three justified endings; no-combat route; force consequences; mid-task save restore.`);
console.log(`Content: ${Object.keys(D.locations).length} locations; ${Object.keys(D.npcs).length} NPCs; ${topicIds.size} dialogue topics; ${Object.keys(D.evidence).length} evidence entries; ${dialogueWords} dialogue words. Duration requires human playtesting.`);
console.log(`Clock: efficient route ${efficient.log.length} actual actions, pre-finish ${E.clock({tick:earlyFinishTick})} / tick ${earlyFinishTick}; exhaustive route ${complete.log.length} actions, tick ${complete.state.tick}. Early port stop and late patrol interception passages differ and persist after restore.`);
