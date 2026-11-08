import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../site/chapter');
const listeners={},storage=new Map();
const app={innerHTML:''},feedback={textContent:''},notice={textContent:''};
const panel={open:false,innerHTML:'',showModal(){this.open=true;},close(){this.open=false;},querySelector(){return feedback;},addEventListener(){}};
const ctx=vm.createContext({console,setTimeout:()=>0,clearTimeout(){},document:{querySelector:s=>s==='#app'?app:s==='#panel'?panel:notice,addEventListener:(name,fn)=>{listeners[name]=fn;}},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)}});
ctx.window=ctx;
for(const f of ['data.js','engine.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f});
const D=ctx.CHAPTER_DATA,E=ctx.CHAPTER_ENGINE;
const seed=E.fresh();seed.location='office';seed.evidence=Object.keys(D.evidence);seed.conclusions=['forgery'];seed.visited=['port','office'];
storage.set('tkgame-chapter1-auto-v1',JSON.stringify(seed));
vm.runInContext(fs.readFileSync(path.join(root,'ui.js'),'utf8'),ctx,{filename:'ui.js'});
function click(a,v='',extra={}){listeners.click({target:{closest:()=>({dataset:{a,v,...extra}})}});}
function state(){return JSON.parse(storage.get('tkgame-chapter1-auto-v1'));}
for(const id of ['map','inventory','journal','deductions','crew','terminal','puzzles','system']){click('panel',id);assert.match(panel.innerHTML,/panel-body/,`${id} opens`);assert.doesNotMatch(panel.innerHTML,/undefined|null<\/h/);}
click('panel','inventory');assert.match(panel.innerHTML,/item-thumb/);click('panel','map');assert.match(panel.innerHTML,/illustrated-map/);assert.match(panel.innerHTML,/map-pin/);
for(const id of ['records','bio','timeline','signal']){click('puzzle',id);assert.match(panel.innerHTML,/workbench/);assert.match(panel.innerHTML,new RegExp(id==='records'?'source-sheet':id==='bio'?'lab-table':id==='timeline'?'event-tile':'packet'));}
click('material','manifest');const beforeLore=panel.innerHTML;click('lore','Центр');assert.match(panel.innerHTML,/Командование службы контрразведки/);click('lore-back');assert.equal(panel.innerHTML,beforeLore,'return from definition restores document');
click('close');click('move','waiting');assert.equal(state().location,'waiting');click('talk','mira');assert.match(app.innerHTML,/conversation/);assert.equal(state().activeNpc,'mira');
const topic=E.availableTopics(E.restore(state()),'mira')[0];click('topic',topic.id);assert.ok(state().talked.includes(topic.id));
click('leave-talk');click('move','registry');click('talk','chief');assert.match(app.innerHTML,/--art:url\('assets\/scene-interview\.webp/);assert.match(app.innerHTML,/Кабинет начальника порта/);click('leave-talk');assert.match(app.innerHTML,/--art:url\('assets\/scene-registry\.webp/);click('move','office');
// Check UI wiring from constructed workbench values to engine: a broken packet
// chain must cost time and stay unsolved; explicit preparation permits a retry.
click('puzzle','signal');const bad=[...D.puzzles.signal.interaction.correct].reverse();for(const id of bad)click('work-tile',id);const t=state().tick;click('work-submit');assert.ok(state().failed.signal);assert.ok(state().tick>t);assert.ok(!state().puzzles.includes('signal'));
click('dismiss-speech');click('puzzle','signal');click('prepare','signal');assert.ok(!state().failed.signal);
for(const id of ['records','bio','timeline','signal']){click('puzzle',id);const w=D.puzzles[id].interaction;if(w.kind==='records'){for(const stage of (w.stages||[{correct:w.correct}])){stage.correct.forEach((field,side)=>click('work-field',field,{side:String(side)}));click('work-submit');}}else if(w.kind==='bio'){w.correct.forEach(row=>click('work-single',row));click('work-submit');}else{w.correct.forEach(tile=>click('work-tile',tile));click('work-submit');}assert.ok(state().puzzles.includes(id),`${id} records real completion`);assert.equal(panel.open,false);click('dismiss-speech');}
click('panel','terminal');click('finish','dismiss');assert.match(panel.innerHTML,/без доказанного обвинения/);assert.equal(state().ending,null,'dismissal requires an explicit second action');
D.endings.dismiss.text+=' '+('Последствия расследования отражены в архиве. '.repeat(30));click('dismiss-confirm');assert.equal(state().ending,'dismiss');assert.match(app.innerHTML,/ending-next/);const endingFirst=app.innerHTML;click('ending-next');assert.notEqual(app.innerHTML,endingFirst);assert.match(app.innerHTML,/ending-prev/);click('ending-prev');assert.equal(app.innerHTML,endingFirst,'ending next/back keeps the title and returns to same page');
console.log('Chapter UI smoke passed: 8 panels, 4 interactive constructions, failed/retried signal, map, dialogue, lore return, dismissal confirmation. DOM stub does not verify browser layout.');
