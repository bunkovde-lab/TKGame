import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const store=new Map();
const storage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
const context=vm.createContext({window:{},localStorage:storage,sessionStorage:storage,location:{search:'',pathname:'/chapter/'},URLSearchParams});
for(const file of ['data.js','engine.js','prior.js'])vm.runInContext(readFileSync(new URL(`../site/chapter/${file}`,import.meta.url),'utf8'),context,{filename:file});
const E=context.window.CHAPTER_ENGINE,P=context.window.CHAPTER_PRIOR,D=context.window.CHAPTER_DATA;

// Без предыстории глава стартует как раньше
const plain=E.fresh();
assert.equal(plain.prior,null);assert.equal(plain.tick,48);assert.equal(E.taskTime(plain),4);assert.equal(E.sanctionNeed(plain),3);

// Выбор «Устав, Корвин и Ирена, Мира доверилась, подчинились Центру, опоздали»
const p=P.build({path:'law',team:['corvin','irena'],mira:'full',center:'law',late:'yes'});
assert.equal(p.mood.irena,'high');assert.equal(p.mood.corvin,'high');assert.equal(p.mood.mara,'low');assert.equal(p.mood.rein,'low');
const s=E.fresh(p);
assert.equal(s.tick,54,'опоздание сдвигает начало на час');
assert.ok(s.evidence.includes('witness'),'показание Миры уже в деле');
assert.equal(E.taskTime(s),3);assert.equal(E.sanctionNeed(s),2);

// Предыстория переживает сохранение и мусор отбрасывается
const back=E.restore(JSON.parse(JSON.stringify(s)));
assert.equal(back.prior.path,'law');assert.equal(back.prior.team.length,2);
const junk=E.fresh({path:'evil',team:'x',mira:'?'}).prior;assert.equal(junk.path,'law');assert.equal(junk.team.length,0);assert.equal(junk.mira,'partial');assert.equal(E.fresh('x').prior,null);
const mercy=E.fresh(P.build({path:'mercy',team:['mara','rein'],mira:'shut',center:'mercy',late:'no'}));
assert.equal(mercy.tick,48);assert.equal(mercy.heat,1);assert.ok(!mercy.evidence.includes('witness'));

// Реплики и предыстория
assert.match(P.greeting(s,'mira',D.npcs.mira),/как обещали/);
assert.match(P.greeting(mercy,'mira',D.npcs.mira),/давили/);
assert.equal(P.greeting(plain,'mira',D.npcs.mira),D.npcs.mira.greeting);
assert.match(P.greeting(s,'irena',D.npcs.irena),/быстрее/);
const sum=P.summary(s.prior);
assert.match(sum,/Мира Рей/);assert.match(sum,/Корвин и Ирена/);assert.match(sum,/резервный причал/);
assert.ok(P.opening(s,D.opening.text).endsWith(D.opening.text));

// Пройти главу с предысторией по-прежнему можно: старое решение без ошибок
const r=E.dispatch(s,'move','office');assert.ok(r.state);
console.log('Chapter prior passed: neutral start, prologue carry-over (late dock, Mira trust, Irena speed, sanction threshold, Center heat), restore, greetings, backstory.');
