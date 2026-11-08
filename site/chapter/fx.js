/* Общие эффекты игры: настройки, звук, вибрация, печать текста, пыль, тряска, панорама.
   Повторяют поведение пролога, чтобы пролог и глава ощущались одной игрой. */
(() => {
'use strict';
const settingsKey='tkgame-prologue-settings';
const settings={sound:true,vibro:true,speed:'normal'};
try{Object.assign(settings,JSON.parse(localStorage.getItem(settingsKey)||'{}'));}catch{}
if(!['slow','normal','fast','instant'].includes(settings.speed))settings.speed='normal';
const saveSettings=()=>{try{localStorage.setItem(settingsKey,JSON.stringify(settings));}catch{}};
const reduceMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches===true;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const icons={
  journal:'M6 3h11a1 1 0 0 1 1 1v16H7a2 2 0 0 1-2-2V4a1 1 0 0 1 1-1Zm-1 15a2 2 0 0 1 2-2h11M9 7h6M9 10h6',
  versions:'M5 5h5v5H5zM14 14h5v5h-5zM10 7.5h4a2 2 0 0 1 2 2V14M7.5 10v4a2 2 0 0 0 2 2H14',
  inventory:'M4 8h16v11H4zM9 8V5h6v3M4 12h16',
  crew:'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7-1a2.5 2.5 0 1 0 0-5M3 19c0-2.8 2.7-5 6-5s6 2.2 6 5m2-5c2.4.3 4 2 4 4.5',
  map:'M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14',
  center:'M12 3v3M12 18v3M3 12h3M18 12h3M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm0 3v2',
  menu:'M4 7h16M4 12h16M4 17h16',
  close:'M6 6l12 12M18 6 6 18',
  clock:'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v4l3 2'
};
const ico=id=>'<svg viewBox="0 0 24 24" class="ico" aria-hidden="true"><path d="'+icons[id]+'"/></svg>';

/* Звук: всё синтезируется, без файлов */
let ambientWanted='';
const sfx=(()=>{
  let ctx=null,amb=null;
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
  const voices={mara:520,corvin:300,irena:640,rein:230,thought:420,narrator:360,mira:600,courier:480,clerk:340,doctor:560,foreman:250,archivist:500,technician:440,chief:210};
  const api={
    wake,
    blip(voice){
      if(!ctx||!settings.sound)return;
      const t=ctx.currentTime;const base=voices[voice]||400;
      const o=ctx.createOscillator();o.type='triangle';o.frequency.value=base*(.94+Math.random()*.12);
      const g=ctx.createGain();g.gain.setValueAtTime(.035,t);g.gain.exponentialRampToValueAtTime(.001,t+.04);
      o.connect(g).connect(ctx.destination);o.start(t);o.stop(t+.05);
    },
    ambient(kind){
      ambientWanted=kind;
      if(!ctx||!settings.sound){if(amb){try{amb.gain.gain.setTargetAtTime(0,ctx.currentTime,.4);}catch{}}return;}
      const tone={port:[340,46],waiting:[280,52],registry:[300,58],clinic:[480,64],warehouse:[200,40],archive:[240,50],relay:[420,72],office:[260,50],interview:[220,44],ending:[160,38]}[kind]||[300,50];
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
      amb.gain.gain.setTargetAtTime(.08,t,.8);
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
      wake();shake();if(!ctx||!settings.sound)return;const t=ctx.currentTime;
      noise(t,.12,600,1,.8,2);thump(t,90,.22,.6);noise(t+.14,.25,1800,3,.25,2);
    },
    shot(){
      wake();if(!ctx||!settings.sound)return;const t=ctx.currentTime;
      noise(t,.08,2200,.8,1.2,4);thump(t,70,.35,.8);noise(t+.25,.08,1900,.8,.6,4);thump(t+.25,60,.3,.5);
    }
  };
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
  try{if(typeof navigator.vibrate==='function'){navigator.vibrate(pattern??(strong?60:12));return;}}catch{}
  if(!iosSwitch)return;
  const now=Date.now();
  if(!strong&&now-lastTap<70)return;
  lastTap=now;
  const times=Array.isArray(pattern)?Math.ceil(pattern.length/2):1;
  for(let i=0;i<times;i++)setTimeout(()=>iosSwitch.click(),i*110);
}

/* Тряска окна или сцены при ошибке */
function shake(){
  if(reduceMotion)return;
  const dialog=document.getElementById('panel');
  const el=dialog?.open?dialog:document.querySelector('.scene');
  if(!el)return;el.classList.remove('shake');void el.offsetWidth;el.classList.add('shake');
  setTimeout(()=>el.classList.remove('shake'),500);
}

/* Пыль в воздухе */
const dust={parts:[],raf:0,cv:null,last:0};
function sizeDust(){const cv=dust.cv;if(!cv)return;const k=Math.min(1.5,window.devicePixelRatio||1);cv.width=cv.clientWidth*k;cv.height=cv.clientHeight*k;}
function startDust(root){
  const cv=root.querySelector('.dust-fx');
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
  const cv=dust.cv;if(!cv||!cv.isConnected||document.hidden)return;
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
window.addEventListener('resize',sizeDust);

/* Печатающийся текст. По окончании абзац заменяется на версию со ссылками на термины. */
const typedKeys=new Set();
let typing=null;
const typeSpeeds={slow:28,normal:52,fast:110};
const tw=(text,key,voice,richHtml)=>'<p class="tw" data-key="'+esc(key)+'" data-full="'+esc(text)+'" data-voice="'+esc(voice||'')+'"'+(richHtml?' data-rich="'+esc(richHtml)+'"':'')+'><span class="tw-on"></span><span class="tw-off">'+esc(text)+'</span></p>';
function startTyping(root){
  const el=root.querySelector('.tw');
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
  if(!t.el.isConnected){typing=null;return;}
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
  const t=typing;if(!t)return false;
  cancelAnimationFrame(t.raf);t.i=t.full.length;
  if(t.el.dataset.rich)t.el.innerHTML=t.el.dataset.rich;else paintTyped();
  t.host?.classList.remove('typing');typedKeys.add(t.key);typing=null;
  return true;
}

/* Панорама: на узком экране широкий арт можно листать */
const panoScroll={};let panoKey='';let panoHinted=false;
try{panoHinted=localStorage.getItem('tk-pano-hint')==='1';}catch{}
function setupPano(root,key,focusX,talking,hint){
  const pano=root.querySelector('.pano');if(!pano)return;
  const track=pano.firstElementChild;const scene=pano.parentElement;
  const max=()=>track.offsetWidth-pano.clientWidth;
  const edges=()=>{const m=max();scene.classList.toggle('pano-on',m>4);scene.classList.toggle('at-left',pano.scrollLeft<=4);scene.classList.toggle('at-right',pano.scrollLeft>=m-4);};
  const focus=x=>Math.max(0,Math.min(max(),track.offsetWidth*x-pano.clientWidth/2));
  if(panoKey!==key){panoKey=key;pano.scrollLeft=focus(focusX);}
  else pano.scrollLeft=panoScroll[key]??focus(focusX);
  if(talking){const to=focus(focusX);if(Math.abs(pano.scrollLeft-to)>8)pano.scrollTo({left:to,behavior:reduceMotion?'auto':'smooth'});}
  edges();
  pano.addEventListener('scroll',()=>{panoScroll[key]=pano.scrollLeft;edges();},{passive:true});
  let drag=null;
  pano.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse'||e.target.closest('button'))return;drag={x:e.clientX,left:pano.scrollLeft};pano.classList.add('dragging');});
  pano.addEventListener('pointermove',e=>{if(drag)pano.scrollLeft=drag.left-(e.clientX-drag.x);});
  const end=()=>{drag=null;pano.classList.remove('dragging');};
  pano.addEventListener('pointerup',end);pano.addEventListener('pointerleave',end);
  if(max()>4&&!panoHinted&&!talking&&hint){
    panoHinted=true;try{localStorage.setItem('tk-pano-hint','1');}catch{}
    setTimeout(()=>hint('Арт можно листать пальцем влево и вправо.'),600);
  }
}

/* Окно-шторка: появление, закрытие, свайп вниз на телефоне */
function panelOpened(dialog,fresh){
  dialog.classList.remove('closing');dialog.style.transform='';
  if(fresh&&!reduceMotion){dialog.dataset.anim='1';setTimeout(()=>delete dialog.dataset.anim,500);}
}
function panelClose(dialog,after){
  if(!dialog.open){after?.();return;}
  if(reduceMotion){dialog.close();after?.();return;}
  dialog.classList.add('closing');
  setTimeout(()=>{if(dialog.classList.contains('closing'))dialog.close();dialog.classList.remove('closing');dialog.style.transform='';after?.();},200);
}
function sheetDrag(dialog,onClose){
  let drag=null;
  dialog.addEventListener('pointerdown',event=>{
    if(!event.target.closest('.panel-grip, .panel-head')||event.target.closest('button'))return;
    if(!window.matchMedia('(max-width: 760px)').matches)return;
    drag={y:event.clientY,dy:0};dialog.style.transition='none';
  });
  window.addEventListener('pointermove',event=>{if(!drag)return;drag.dy=Math.max(0,event.clientY-drag.y);dialog.style.transform='translateY('+drag.dy+'px)';});
  window.addEventListener('pointerup',()=>{if(!drag)return;const far=drag.dy>90;drag=null;dialog.style.transition='';if(far)onClose();else dialog.style.transform='';});
}

function settingsBody(){
  const seg=(act,value,label,on)=>'<button type="button" class="seg'+(on?' on':'')+'" data-a="'+act+'" data-v="'+value+'" aria-pressed="'+on+'">'+esc(label)+'</button>';
  return '<div class="settings">'+
    '<div class="setting"><span>Звук</span><div class="segs">'+seg('set-sound','1','Вкл',settings.sound)+seg('set-sound','0','Выкл',!settings.sound)+'</div></div>'+
    '<div class="setting"><span>Вибрация</span><div class="segs">'+seg('set-vibro','1','Вкл',settings.vibro)+seg('set-vibro','0','Выкл',!settings.vibro)+'</div></div>'+
    '<div class="setting"><span>Скорость текста</span><div class="segs">'+[['slow','Медленно'],['normal','Обычно'],['fast','Быстро'],['instant','Сразу']].map(([v,l])=>seg('set-speed',v,l,settings.speed===v)).join('')+'</div></div>'+
    '</div>';
}
/* Возвращает true, если клик был по настройке */
function applySetting(a,v){
  if(a==='set-sound'){settings.sound=v==='1';saveSettings();if(settings.sound){sfx.wake();sfx.click(true);}sfx.ambient(ambientWanted);return true;}
  if(a==='set-vibro'){settings.vibro=v==='1';saveSettings();haptic(true,40);return true;}
  if(a==='set-speed'){settings.speed=v;saveSettings();return true;}
  return false;
}
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&dust.cv)startDust(document);});

window.TK_FX={settings,reduceMotion,ico,sfx,haptic,shake,startDust,tw,startTyping,completeTyping,isTyping:()=>Boolean(typing),setupPano,panelOpened,panelClose,sheetDrag,settingsBody,applySetting};
})();
