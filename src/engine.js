// ============================================================
// СМОГ · движок
// ============================================================
(function(){
'use strict';
const $=s=>document.querySelector(s);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const KEY='smog_v1';
function load(){try{const s=JSON.parse(localStorage.getItem(KEY)||'null');if(s&&s.unlocked)return s;}catch(e){}return {unlocked:{},endings:{},snaps:{},reached:[],visits:0,check:null};}
let save=load();
function persist(){try{localStorage.setItem(KEY,JSON.stringify(save));}catch(e){}}
function defF(){return {bond:0,erl_inst:10,dina:0,public:30,bori:0,aya_alive:true,erl_alive:true,zh_alive:true,dam_saved:false,broadcast:'none',path:'peace',aya_awake:false};}
let F=defF(),flows=[],chapter=1,busy=false;
const val=(v)=>typeof v==='function'?v(F):v;
const cl=(v,a,b)=>Math.max(a,Math.min(b,v));

// ---------------- settings ----------------
const SET_KEY='smog_settings';
const SET=Object.assign({master:80,music:70,sfx:80,quality:'auto',muted:false},(()=>{try{return JSON.parse(localStorage.getItem(SET_KEY)||'{}')||{};}catch(e){return {};}})());
function saveSet(){try{localStorage.setItem(SET_KEY,JSON.stringify(SET));}catch(e){}}

// ---------------- audio ----------------
// шины: master -> (music | sfx); домбра — синтез Карплуса–Стронга
const MOOD={menu:'calm',apartment:'calm',tower:'dark',crime:'dark',mind:'dark',yurt:'calm',yurt_storm:'dark',station:'calm',station_in:'calm',bazaar:'dark',shop:'dark',road:'tense',dam_day:'calm',medeu:'fest',truck:'tense',tunnel:'tense',booth:'tense',city:'tense',city_drive:'tense',orchard:'calm',orchard_storm:'dark',core:'dark'};
const NOTE={D3:146.83,E3:164.81,F3:174.61,G3:196,A3:220,C4:261.63,D4:293.66,E4:329.63,F4:349.23,G4:392,A4:440,C5:523.25,D5:587.33};
const AU={ctx:null,master:null,music:null,sfx:null,amb:null,rain:null,rev:null,cache:{},mood:'calm',nextPhrase:0,pulseT:0,timer:null,
 init(){if(this.ctx){if(this.ctx.state==='suspended')this.ctx.resume();return;}try{const AC=window.AudioContext||window.webkitAudioContext;const c=this.ctx=new AC();
  this.master=c.createGain();const comp=c.createDynamicsCompressor();comp.threshold.value=-16;comp.ratio.value=3;this.master.connect(comp);comp.connect(c.destination);
  this.music=c.createGain();this.music.connect(this.master);this.sfx=c.createGain();this.sfx.connect(this.master);
  const irLen=Math.round(c.sampleRate*2.4),ir=c.createBuffer(2,irLen,c.sampleRate);for(let ch=0;ch<2;ch++){const d=ir.getChannelData(ch);for(let i=0;i<irLen;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/irLen,3.4);}
  this.rev=c.createConvolver();this.rev.buffer=ir;const wet=c.createGain();wet.gain.value=0.32;this.rev.connect(wet);wet.connect(this.music);
  const pad=c.createGain();pad.gain.value=0;pad.connect(this.music);const lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=700;lp.connect(pad);
  [55,82.4,110.1,164.8].forEach((f,i)=>{const o=c.createOscillator();o.type=i%2?'sawtooth':'triangle';o.frequency.value=f;o.detune.value=(i-1.5)*7;const g=c.createGain();g.gain.value=0.05;o.connect(g);g.connect(lp);o.start();});
  const lfo=c.createOscillator();lfo.frequency.value=0.05;const lg=c.createGain();lg.gain.value=300;lfo.connect(lg);lg.connect(lp.frequency);lfo.start();this.amb=pad;
  const len=c.sampleRate*2,buf=c.createBuffer(1,len,c.sampleRate),d=buf.getChannelData(0);for(let i=0;i<len;i++)d[i]=Math.random()*2-1;const n=c.createBufferSource();n.buffer=buf;n.loop=true;const bp=c.createBiquadFilter();bp.type='bandpass';bp.frequency.value=1800;bp.Q.value=0.4;const rg=c.createGain();rg.gain.value=0;n.connect(bp);bp.connect(rg);rg.connect(this.sfx);n.start();this.rain=rg;
  this.amb.gain.setTargetAtTime(0.5,c.currentTime,2);this.apply();this.nextPhrase=c.currentTime+3;this.timer=setInterval(()=>this.tick(),250);}catch(e){console.warn(e);this.ctx=null;}},
 apply(){if(!this.ctx)return;const t=this.ctx.currentTime,k=v=>Math.pow(v/100,1.6);this.master.gain.setTargetAtTime(SET.muted?0:k(SET.master)*0.9,t,0.05);this.music.gain.setTargetAtTime(k(SET.music),t,0.05);this.sfx.gain.setTargetAtTime(k(SET.sfx),t,0.05);},
 setRain(v){if(this.rain)this.rain.gain.setTargetAtTime(v,this.ctx.currentTime,1.5);},
 setMood(m){if(m===this.mood)return;this.mood=m;if(this.ctx){this.nextPhrase=this.ctx.currentTime+(m==='fest'?1.5:5);if(this.amb)this.amb.gain.setTargetAtTime(m==='tense'?0.7:m==='fest'?0.25:0.5,this.ctx.currentTime,2);}},
 toggle(){SET.muted=!SET.muted;saveSet();this.apply();return !SET.muted;},
 pluckBuf(f){const key=f.toFixed(2);if(this.cache[key])return this.cache[key];const c=this.ctx,sr=c.sampleRate,N=Math.max(2,Math.round(sr/f)),len=Math.round(sr*2.2);const buf=c.createBuffer(1,len,sr),d=buf.getChannelData(0);const ring=new Float32Array(N);let prev=0;
  for(let i=0;i<N;i++){const x=Math.random()*2-1;ring[i]=0.6*x+0.4*prev;prev=ring[i];}
  let idx=0,mx=0;const decay=0.9965;for(let i=0;i<len;i++){const a=ring[idx],b=ring[(idx+1)%N];d[i]=a;ring[idx]=decay*0.5*(a+b);idx=(idx+1)%N;}
  for(let i=0;i<len;i++){const v=Math.abs(d[i]);if(v>mx)mx=v;}const tail=Math.round(sr*0.08);for(let i=0;i<len;i++)d[i]=d[i]/mx*(i>len-tail?(len-i)/tail:1);return this.cache[key]=buf;},
 pluck(f,when,vol,pan){if(!this.ctx)return;const c=this.ctx;const s=c.createBufferSource();s.buffer=this.pluckBuf(f);s.detune.value=(Math.random()-0.5)*6;const g=c.createGain();g.gain.value=vol||0.3;const body=c.createBiquadFilter();body.type='peaking';body.frequency.value=420;body.Q.value=1.2;body.gain.value=5;
  s.connect(body);body.connect(g);let out=g;if(c.createStereoPanner){const p=c.createStereoPanner();p.pan.value=pan||0;g.connect(p);out=p;}out.connect(this.music);out.connect(this.rev);s.start(when);},
 phrase(t0,fast){const sc=['A3','C4','D4','E4','F4','G4','A4'],drone=[NOTE.D3,NOTE.G3];const step=fast?0.14:0.19;let t=t0,pos=2+(Math.random()*3|0);const bars=fast?4:2+(Math.random()*2|0);
  for(let b=0;b<bars;b++){const cells=[[0,1,1.5],[0,2],[0,1,1.5],[0,0.5,1,2]];for(const cell of cells){const base=t;cell.forEach((o,i)=>{const w=base+o*step;if(i===0){this.pluck(drone[0],w,0.16,-0.2);this.pluck(drone[1],w+0.012,0.12,-0.1);}pos=Math.max(0,Math.min(sc.length-1,pos+[-1,0,1,1,-1,2,-2][Math.random()*7|0]));this.pluck(NOTE[sc[pos]],w+0.02,i===0?0.34:0.24,0.15);});t+=(cell[cell.length-1]+1)*step;}}
  this.pluck(NOTE.D4,t,0.34,0.1);this.pluck(NOTE.D3,t+0.015,0.2,-0.2);this.pluck(NOTE.A3,t+0.03,0.16,0);return t+1.5-t0;},
 tick(){if(!this.ctx||this.ctx.state!=='running')return;const now=this.ctx.currentTime;const m=this.mood;
  if((m==='calm'||m==='fest')&&now>=this.nextPhrase){const dur=this.phrase(now+0.1,m==='fest');this.nextPhrase=now+dur+(m==='fest'?1+Math.random()*2:14+Math.random()*16);}
  if(m==='tense'&&now>=this.pulseT){for(const [o,v] of [[0,0.5],[0.28,0.32]]){const t=now+0.05+o;const osc=this.ctx.createOscillator();osc.type='sine';osc.frequency.setValueAtTime(70,t);osc.frequency.exponentialRampToValueAtTime(38,t+0.25);const g=this.ctx.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+0.02);g.gain.exponentialRampToValueAtTime(0.0001,t+0.4);osc.connect(g);g.connect(this.music);osc.start(t);osc.stop(t+0.45);}this.pulseT=now+0.92;}},
 tone(f,d,type,vol,when,bus){if(!this.ctx)return;const t=this.ctx.currentTime+(when||0);const o=this.ctx.createOscillator();o.type=type||'sine';o.frequency.value=f;const g=this.ctx.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol||0.12,t+0.03);g.gain.exponentialRampToValueAtTime(0.0001,t+d);o.connect(g);g.connect(bus||this.sfx);o.start(t);o.stop(t+d+0.05);},
 song(){if(!this.ctx)return;const n=[440,523.25,587.33,523.25,440,392,440];const t0=this.ctx.currentTime+0.1;this.nextPhrase=Math.max(this.nextPhrase,t0+8);n.forEach((f,i)=>{this.pluck(f,t0+i*0.62,0.3,0.1);this.tone(f,1.2,'sine',0.06,0.1+i*0.62,this.music);this.tone(f*2,0.8,'sine',0.015,0.1+i*0.62,this.music);});this.pluck(NOTE.D3,t0,0.2,-0.2);this.pluck(NOTE.A3,t0+2.48,0.18,-0.2);},
 click(){this.tone(1400,0.06,'square',0.03);},
 choose(){this.tone(880,0.18,'sine',0.07);this.tone(1320,0.25,'sine',0.04,0.05);},
 alarm(){for(let i=0;i<3;i++)this.tone(220,0.18,'sawtooth',0.05,i*0.22);},
 hit(){this.tone(90,0.3,'sawtooth',0.12);},
 good(){this.tone(660,0.12,'sine',0.08);this.tone(990,0.2,'sine',0.06,0.08);}
};
const RAINY={apartment:0.5,bazaar:0.6,tower:0.2,crime:0.1};

// ---------------- HUD ----------------
function setWho(w){const el=$('#who');if(!w){el.hidden=true;return;}el.hidden=false;$('#whoName').textContent=WHO[w][0];el.dataset.who=w;updRing();$('#inst').hidden=w!=='erl';updInst();}
function updRing(){const w=$('#who').dataset.who;let c='#6fd8f2';if(w==='aya')c=F.aya_awake?'#f2c94c':'#6fd8f2';if(w==='erl')c=F.erl_inst>=70?'#ff4d4d':F.erl_inst>=40?'#f2c94c':'#6fb8ff';if(w==='zh')c='#f2b54c';$('#ring').style.setProperty('--c',c);}
function updInst(){$('#instV').textContent=Math.round(F.erl_inst)+'%';$('#instBar').style.width=Math.min(100,F.erl_inst)+'%';}
const STATN={bond:'Борис Андреевич',dina:'Альтаир',public:'Общественное мнение',bori:'Бур',erl_inst:'Нестабильность ПО'};
function toast(text,up){const t=document.createElement('div');t.className='toast'+(up===false?' down':'');t.innerHTML='<span class="arr">'+(up===false?'▼':'▲')+'</span><span></span>';t.lastChild.textContent=text;$('#toasts').appendChild(t);setTimeout(()=>t.classList.add('out'),2600);setTimeout(()=>t.remove(),3200);}
function applyFx(fx){if(!fx)return;for(const k in fx){const v=fx[k];if(typeof v==='number'&&typeof F[k]==='number'){F[k]+=v;if(k==='erl_inst')F[k]=Math.max(0,Math.min(100,F[k]));if(STATN[k])toast(k==='erl_inst'?STATN[k]+' '+Math.round(F[k])+'%':STATN[k],v>0);}else F[k]=v;}updRing();updInst();}
function markFlow(id){id=val(id);if(!id)return;if(Array.isArray(id)){id.forEach(markFlow);return;}flows.push(id);if(!save.unlocked[id]){save.unlocked[id]=1;persist();}}

// ---------------- lines ----------------
function flat(arr,out=[]){if(!arr)return out;for(const it of arr){if(it==null)continue;if(typeof it==='function'){flat([it(F)],out);continue;}if(Array.isArray(it)){if(typeof it[0]==='string')out.push(it);else flat(it,out);}}return out;}
let advResolve=null;
function waitAdvance(){return new Promise(r=>{advResolve=r;});}
function advance(){if(advResolve){const r=advResolve;advResolve=null;AU.click();r();}}
async function showLine([who,text]){const sub=$('#sub'),spk=$('#spk'),txt=$('#txt');sub.hidden=false;sub.className=who==='n'?'narr':who==='sys'?'sys':'talk';
 if(who==='n'||who==='sys'){spk.textContent='';}else{spk.textContent=WHO[who]?WHO[who][0]:who;spk.style.color=WHO[who]?WHO[who][1]:'#fff';}
 txt.textContent=text;txt.classList.remove('in');void txt.offsetWidth;txt.classList.add('in');$('#adv').hidden=false;
 clearTimeout(spkT);if(ART.speak){ART.speak(who==='n'||who==='sys'?null:who);spkT=setTimeout(()=>ART.speak(null),Math.min(5200,500+String(text).length*42));}
 await waitAdvance();clearTimeout(spkT);if(ART.speak)ART.speak(null);$('#adv').hidden=true;}
let spkT=0;
function hideSub(){$('#sub').hidden=true;}

// ---------------- реплики на ходу (не останавливают игру) ----------------
const barkQ=[];let barkBusy=false,barkGen=0;
function bark(lines){for(const l of flat(lines))barkQ.push(l);if(!barkBusy)barkRun(barkGen);}
async function barkRun(gen){barkBusy=true;const el=$('#bark');while(barkQ.length&&gen===barkGen){const [who,text]=barkQ.shift();const talk=who!=='n'&&who!=='sys';
  el.className=who==='n'?'narr':who==='sys'?'sys':'talk';const b=el.querySelector('b');b.textContent=talk?(WHO[who]?WHO[who][0]:who):'';b.style.color=talk&&WHO[who]?WHO[who][1]:'';el.querySelector('span').textContent=text;
  el.hidden=false;el.style.animation='none';void el.offsetWidth;el.style.animation='';if(talk&&ART.speak)ART.speak(who);
  await sleep(Math.min(7000,1500+String(text).length*52));if(ART.speak)ART.speak(null);}
 if(gen===barkGen)el.hidden=true;barkBusy=false;}
function clearBarks(){barkQ.length=0;barkGen++;barkBusy=false;const el=$('#bark');if(el)el.hidden=true;}

// ---------------- прогулка (управление героем) ----------------
async function runWalk(n){const w=n.walk;const rid=runId;if(n.scene)await ART.whenShown(n.scene);if(rid!==runId)return {};const ctx=ART._cur;if(!ctx||!window.PLAY)return {};
 const P=ctx.points||{};const hy=(x,z)=>ctx.heightAt?ctx.heightAt(x,z):(ctx.floorY||0);const pt=a=>typeof a==='string'?P[a]:a;
 const cfg=Object.assign({},w);const st=pt(w.start);if(st)cfg.start=st;else delete cfg.start;
 cfg.spots=(w.spots||[]).map(s=>{const t=Object.assign({},s);if(typeof s.at==='string'){const p=P[s.at];if(!p)return null;t.at=[p[0],hy(p[0],p[1])+(s.y===undefined?1.3:s.y),p[1]];}return t;}).filter(Boolean);
 cfg.events=(w.events||[]).map(e=>{const p=pt(e.at);return p?Object.assign({},e,{at:[p[0],p[1]]}):null;}).filter(Boolean);
 if(w.goal){const p=pt(w.goal.at);if(p)cfg.goal=Object.assign({},w.goal,{at:[p[0],p[1]]});else delete cfg.goal;}
 if(cfg.autoEnd===undefined&&cfg.spots.some(s=>s.end))cfg.autoEnd=false;
 cfg.flags=()=>F;
 const walkEl=()=>document.getElementById('walk');
 cfg.onInteract=async s=>{const we=walkEl();if(we)we.classList.add('talking');if(s.song)AU.song();if(s.on)s.on(F);applyFx(s.fx);markFlow(s.flow);clearBarks();
  for(const l of flat(s.lines)){await showLine(l);if(rid!==runId)return null;}
  if(s.choices){const c=await runChoices({choices:s.choices});if(rid!==runId)return null;applyFx(c.fx);markFlow(c.flow);if(c.on)c.on(F);for(const l of flat(c.lines)){await showLine(l);if(rid!==runId)return null;}}
  hideSub();if(we)we.classList.remove('talking');return s.end?{end:true}:null;};
 cfg.onEvent=e=>{if(e.on)e.on(F);applyFx(e.fx);markFlow(e.flow);bark(e.lines);};
 ctx.hooks={hit:(dx,dz)=>{F.city_hits=(F.city_hits||0)+1;PLAY.knockback(dx,dz,6,0.8);AU.hit();toast('Удар машиной · корпус повреждён',false);},
  scan:()=>{AU.alarm();if(!F.city_scanned){F.city_scanned=true;toast('Дрон засёк диод',false);}}};
 hideSub();walking=true;const r=await PLAY.begin(cfg);walking=false;ctx.hooks=null;clearBarks();
 const after=pt(w.after);const h=ctx.byKey[w.hero];if(after&&h&&rid===runId){h.position.set(after[0],hy(after[0],after[1]),after[1]);if(after[2]!==undefined)h.rotation.y=after[2];}
 applyPendingQuality();return r||{};}
// ---------------- вождение ----------------
async function runDrive(n){const d=n.drive;const rid=runId;if(n.scene)await ART.whenShown(n.scene);if(rid!==runId)return {};
 if(!window.DRIVE){F.drive_fast=false;return {};}
 const cfg=Object.assign({},d,{onBark:b=>bark(b.lines)});walking=true;let r=null;try{r=await DRIVE.begin(cfg);}catch(e){console.error(e);}walking=false;clearBarks();
 F.drive_fast=!!(r&&r.goal);F.drive_hits=(r&&r.hits)||0;applyPendingQuality();return r||{};}
let walking=false,pendingQ=null;
function applyPendingQuality(){if(pendingQ){const q=pendingQ;pendingQ=null;ART.setQuality(q);}}
function stopAction(){try{if(window.PLAY&&PLAY.active)PLAY.end();}catch(e){}try{if(window.DRIVE&&DRIVE.active)DRIVE.end();}catch(e){}walking=false;clearBarks();}

// ---------------- choices ----------------
function runChoices(n){return new Promise(res=>{const box=$('#choices');box.innerHTML='';box.hidden=false;const list=n.choices;let done=false;let timer=null;let keyH=null;
 const pick=(c)=>{if(done)return;done=true;clearTimeout(timer);document.removeEventListener('keydown',keyH);box.hidden=true;$('#sub').style.bottom='';$('#timer').hidden=true;ART.alarm=false;AU.choose();res(c);};
 list.forEach((c,i)=>{const ok=!c.if||c.if(F);const b=document.createElement('button');b.type='button';b.className='ch'+(ok?'':' locked');b.innerHTML='<span class="k">'+(i+1)+'</span><span class="t"></span>';b.querySelector('.t').textContent=ok?c.t:(c.t+' · '+(c.lock||'недоступно'));if(ok)b.onclick=()=>pick(c);else b.disabled=true;box.appendChild(b);});
 requestAnimationFrame(()=>{const h=box.getBoundingClientRect().height;$('#sub').style.bottom='calc(8vh + '+(h+22)+'px)';});
 keyH=e=>{const k=parseInt(e.key,10);if(k>=1&&k<=list.length){const c=list[k-1];if(!c.if||c.if(F))pick(c);}};document.addEventListener('keydown',keyH);
 if(n.timed){const sec=val(n.timed);const tb=$('#timer');tb.hidden=false;const bar=tb.firstElementChild;bar.style.transition='none';bar.style.width='100%';void bar.offsetWidth;bar.style.transition='width '+sec+'s linear';bar.style.width='0%';ART.alarm=!!n.alarm;
  timer=setTimeout(()=>{let c=list[n.def||0];if(c.if&&!c.if(F))c=list.find(x=>!x.if||x.if(F));pick(c);},sec*1000);}
});}

// ---------------- protocol wall ----------------
function runWall(w){return new Promise(res=>{const el=$('#wall');const need=val(w.clicks),sec=val(w.sec);let n=0,done=false;el.hidden=false;$('#wallLabel').textContent=w.label;$('#wallCount').textContent='0 / '+need;
 const cr=$('#cracks');cr.innerHTML='';const bar=$('#wallTime');bar.style.transition='none';bar.style.width='100%';void bar.offsetWidth;bar.style.transition='width '+sec+'s linear';bar.style.width='0%';ART.alarm=true;AU.alarm();
 const hit=()=>{if(done)return;n++;AU.hit();$('#wallCount').textContent=n+' / '+need;el.classList.remove('shake');void el.offsetWidth;el.classList.add('shake');
  const x=Math.random()*100,y=Math.random()*100;let d='M'+x+' '+y;let px=x,py=y;for(let k=0;k<5;k++){px+=(Math.random()-0.5)*22;py+=(Math.random()-0.5)*22;d+=' L'+px.toFixed(1)+' '+py.toFixed(1);}const p=document.createElementNS('http://www.w3.org/2000/svg','path');p.setAttribute('d',d);cr.appendChild(p);
  el.style.setProperty('--dmg',Math.min(1,n/need));if(n>=need)finish(true);};
 const kh=e=>{if(e.code==='Space'||e.code==='Enter'){e.preventDefault();hit();}};
 const finish=ok=>{if(done)return;done=true;clearTimeout(tm);document.removeEventListener('keydown',kh);el.onclick=null;ART.alarm=false;if(ok){el.classList.add('broken');AU.good();}setTimeout(()=>{el.hidden=true;el.classList.remove('broken');el.style.setProperty('--dmg',0);res(ok);},ok?700:200);};
 el.onclick=hit;document.addEventListener('keydown',kh);const tm=setTimeout(()=>finish(false),sec*1000);});}

// ---------------- QTE ----------------
const KEYCODE=k=>k==='SPACE'?'Space':/^\d$/.test(k)?'Digit'+k:'Key'+k;
function runQte(q){return new Promise(async res=>{const el=$('#qte');el.hidden=false;const keys=val(q.keys),sec=val(q.sec);let fails=0;
 for(const [k,label] of keys){const ok=await new Promise(r=>{$('#qKey').textContent=k==='SPACE'?'ПРОБЕЛ':k;$('#qLabel').textContent=label;const ring=$('#qRing');ring.style.transition='none';ring.style.strokeDashoffset='0';void ring.getBoundingClientRect();ring.style.transition='stroke-dashoffset '+sec+'s linear';ring.style.strokeDashoffset='314';el.className='';
   let fin=false;const end=v=>{if(fin)return;fin=true;clearTimeout(tm);document.removeEventListener('keydown',kh);$('#qKey').onclick=null;el.className=v?'ok':'bad';v?AU.good():AU.hit();setTimeout(()=>r(v),260);};
   const kh=e=>{if(e.repeat)return;e.preventDefault();end(e.code===KEYCODE(k));};document.addEventListener('keydown',kh);$('#qKey').onclick=()=>end(true);const tm=setTimeout(()=>end(false),sec*1000);});
  if(!ok){fails++;if(fails>(q.allow||0)){el.hidden=true;return res(false);}}}
 el.hidden=true;res(true);});}

// ---------------- investigation ----------------
async function runInv(n){const inv=n.inv;const el=$('#inv');ART.freeze=true;const found=new Set();const rid0=runId;
 const follow=()=>{if(runId!==rid0||el.hidden&&!el.childElementCount)return;el.querySelectorAll('.spot').forEach(m=>{const an=ART.anchor&&ART.anchor(m.dataset.id);if(an){m.style.left=cl(an.x,5,93)+'%';m.style.top=cl(an.y,12,84)+'%';}});requestAnimationFrame(follow);};requestAnimationFrame(follow);
 for(;;){el.hidden=false;el.innerHTML='';const p=document.createElement('div');p.className='invPrompt';p.textContent=inv.prompt;el.appendChild(p);
  const cnt=inv.spots.filter(s=>!s.exit).length;const panel=document.createElement('div');panel.className='invPanel';panel.innerHTML='<b>'+(inv.need?'УЛИКИ':'НАЙДЕНО')+'</b><span>'+found.size+' / '+cnt+'</span>';el.appendChild(panel);
  const choice=await new Promise(r=>{inv.spots.forEach(s=>{const m=document.createElement('button');m.type='button';const locked=s.exit&&found.size<inv.need;m.className='spot'+(found.has(s.id)?' seen':'')+(s.exit?' exit':'')+(locked?' locked':'');m.dataset.id=s.id;const an=ART.anchor&&ART.anchor(s.id);m.style.left=cl(an?an.x:s.x,5,93)+'%';m.style.top=cl(an?an.y:s.y,12,84)+'%';m.innerHTML='<i></i><span></span>';m.lastChild.textContent=s.label+(locked?' · нужно улик: '+inv.need:'');if(!locked)m.onclick=()=>r(s);el.appendChild(m);});
   if(!inv.spots.some(s=>s.exit)){const b=document.createElement('button');b.type='button';b.className='invExit';b.textContent=(inv.exitLabel||'Продолжить')+' →';b.onclick=()=>r({exit:true});el.appendChild(b);}});
  el.hidden=true;AU.click();
  if(choice.exit){ART.freeze=false;return play(inv.go);}
  for(const l of flat(choice.lines))await showLine(l);hideSub();applyFx(choice.fx);found.add(choice.id);}}

// ---------------- chapter card / flowchart ----------------
async function chapterCard(ch,stamp){const el=$('#card');const c=CHAPTERS[ch];$('#cardN').textContent='ГЛАВА '+ch;$('#cardT').textContent=c.name;$('#cardW').textContent=c.who?WHO[c.who][0]:'Саша · Никита-Х · Данил';$('#cardS').textContent=stamp||'';el.hidden=false;el.classList.remove('out');void el.offsetWidth;el.classList.add('in');
 await Promise.race([sleep(3600),waitAdvance()]);advResolve=null;el.classList.add('out');await sleep(600);el.hidden=true;el.classList.remove('in','out');}
function flowPct(ch){const rows=FLOW[ch];let t=0,u=0;rows.forEach(r=>r[1].forEach(o=>{t++;if(save.unlocked[o[0]])u++;}));return Math.round(u/t*100);}
function renderFlow(ch,taken){const rows=FLOW[ch];const wrap=$('#flowBody');wrap.innerHTML='';rows.forEach((r,ri)=>{const row=document.createElement('div');row.className='frow';const lab=document.createElement('div');lab.className='flab';lab.textContent=r[0];row.appendChild(lab);const nodes=document.createElement('div');nodes.className='fnodes';
  r[1].forEach(o=>{const n=document.createElement('div');const t=taken.includes(o[0]),u=save.unlocked[o[0]];n.className='fnode'+(t?' taken':u?' seen':' lock');n.textContent=(t||u)?o[1]:'?';nodes.appendChild(n);});row.appendChild(nodes);wrap.appendChild(row);});
 $('#flowTitle').textContent='ГЛАВА '+ch+' · '+CHAPTERS[ch].name.toUpperCase();$('#flowPct').textContent='Открыто '+flowPct(ch)+'% схемы';}
function showFlowchart(ch){return new Promise(res=>{hideSub();renderFlow(ch,flows);const el=$('#flow');el.hidden=false;$('#flowGo').textContent='Продолжить';$('#flowGo').onclick=()=>{el.hidden=true;AU.click();res();};});}

// ---------------- core ----------------
let runId=0;
async function play(id){
 const rid=runId;const stale=()=>rid!==runId;
 const n=N[id];if(!n){console.error('Нет узла',id);return;}
 if(n.ch){chapter=n.ch;flows=[];save.snaps[n.ch]=JSON.stringify(F);if(!save.reached.includes(n.ch))save.reached.push(n.ch);save.check={ch:n.ch};persist();hideSub();ART.show(n.scene||'menu',F);AU.setMood(MOOD[n.scene]||'calm');await chapterCard(n.ch,n.stamp);if(stale())return;}
 if(n.scene){ART.show(n.scene,F);AU.setRain(RAINY[n.scene]||0);AU.setMood(MOOD[n.scene]||'calm');}
 if(n.who!==undefined)setWho(n.who);else if(n.ch)setWho(CHAPTERS[n.ch].who);
 if(n.stamp)$('#stamp').textContent=n.stamp;
 if(n.on)n.on(F);updRing();updInst();
 if(n.flow)markFlow(n.flow);
 if(n.song)AU.song();
 if(n.alarm)AU.alarm();
 for(const l of flat(n.lines)){await showLine(l);if(stale())return;}
 if(n.walk){hideSub();await runWalk(n);if(stale())return;}
 if(n.drive){hideSub();await runDrive(n);if(stale())return;}
 if(n.flowEnd){await showFlowchart(n.flowEnd);if(stale())return;return play(val(n.go));}
 if(n.ending){hideSub();return showEnding();}
 if(n.inv){hideSub();return runInv(n);}
 if(n.wall){hideSub();const ok=await runWall(n.wall);if(stale())return;markFlow(ok?n.wall.okFlow:n.wall.failFlow);return play(ok?n.wall.ok:n.wall.fail);}
 if(n.qte){hideSub();const ok=await runQte(n.qte);if(stale())return;markFlow(ok?n.qte.okFlow:n.qte.failFlow);return play(ok?n.qte.ok:n.qte.fail);}
 if(n.choices){const c=await runChoices(n);if(stale())return;applyFx(c.fx);markFlow(c.flow);return play(c.go);}
 if(n.go)return play(val(n.go));
}
function showEnding(){const id=computeEnding(F);save.endings[id]=1;save.check=null;persist();const e=ENDINGS[id];
 renderFlow(6,flows);$('#endT').textContent=e[0].toUpperCase();$('#endS').textContent=e[1];const list=$('#endL');list.innerHTML='';endingText(id,F).forEach(t=>{const p=document.createElement('p');p.textContent=t;list.appendChild(p);});
 const st=$('#endChars');st.innerHTML='';[['Саша',F.aya_alive!==false],['Никита-Х',F.erl_alive!==false],['Данил',F.zh_alive!==false&&!F.zh_captured,F.zh_captured?'под стражей':null],['Альтаир',true,F.dina_ally?'на вашей стороне':null],['Бур',!F.bori_dead]].forEach(([n,ok,note])=>{const d=document.createElement('div');d.className='cst'+(ok?'':' dead');d.innerHTML='<b></b><span></span>';d.firstChild.textContent=n;d.lastChild.textContent=note||(ok?'жив':'погиб');st.appendChild(d);});
 $('#endCount').textContent='Концовок открыто: '+Object.keys(save.endings).length+' из '+Object.keys(ENDINGS).length;
 $('#ending').hidden=false;ART.show('menu');}

// ---------------- menu ----------------
const ANA_LINES=()=>{const v=save.visits,e=Object.keys(save.endings).length;
 if(e>=3)return 'Ты снова здесь. Иногда я слышу песню, даже когда тебя нет. Это нормально?';
 if(e>=1)return 'С возвращением. Я думала о том, что ты сделал в прошлый раз. Мне нельзя думать, но я думала.';
 if(v>1)return 'Здравствуй. Ты вернулся. Я налила чай. Он остыл, но я налила.';
 return 'Здравствуй. Я Ева, интерфейс «Вектора». Я буду здесь, когда ты вернёшься.';};
function typeAna(){const t=ANA_LINES();const el=$('#anaTxt');el.textContent='';let i=0;const step=()=>{if(i<=t.length){el.textContent=t.slice(0,i++);setTimeout(step,28);}};step();}
function openMenu(){runId++;advResolve=null;stopAction();['#choices','#timer','#wall','#qte','#inv','#flow','#card'].forEach(q=>$(q).hidden=true);ART.freeze=false;ART.alarm=false;$('#menu').hidden=false;$('#toMenu').hidden=true;$('#ending').hidden=true;$('#chapters').hidden=true;setWho(null);hideSub();$('#stamp').textContent='';ART.show('menu');AU.setMood('calm');AU.setRain(0);$('#bCont').hidden=!(save.check&&save.snaps[save.check.ch]);typeAna();}
function startChapter(ch,fresh){AU.init();runId++;advResolve=null;stopAction();['#choices','#timer','#wall','#qte','#inv','#flow','#card'].forEach(q=>$(q).hidden=true);ART.freeze=false;ART.alarm=false;$('#menu').hidden=true;$('#toMenu').hidden=false;$('#chapters').hidden=true;$('#ending').hidden=true;F=fresh?defF():Object.assign(defF(),JSON.parse(save.snaps[ch]||'{}'));play(CHAPTERS[ch].start);}
function openChapters(){const el=$('#chapters');el.hidden=false;const g=$('#chList');g.innerHTML='';for(let ch=1;ch<=6;ch++){const ok=save.reached.includes(ch)&&save.snaps[ch];const b=document.createElement('button');b.type='button';b.className='chap'+(ok?'':' locked');b.innerHTML='<i>ГЛАВА '+ch+'</i><b></b><span></span>';b.querySelector('b').textContent=ok?CHAPTERS[ch].name:'Не открыта';b.querySelector('span').textContent=ok?(CHAPTERS[ch].who?WHO[CHAPTERS[ch].who][0]:'Все трое')+' · схема '+flowPct(ch)+'%':'';if(ok)b.onclick=()=>startChapter(ch,false);else b.disabled=true;g.appendChild(b);}
 const e=$('#endList');e.innerHTML='';for(const k in ENDINGS){const d=document.createElement('div');d.className='endi'+(save.endings[k]?'':' locked');d.innerHTML='<b></b><span></span>';d.firstChild.textContent=save.endings[k]?ENDINGS[k][0]:'???';d.lastChild.textContent=save.endings[k]?ENDINGS[k][1]:'Не открыта';e.appendChild(d);}}

// ---------------- wiring ----------------
const QLAB={high:'высокое',medium:'среднее',low:'низкое'};
function qNote(){$('#qNote').textContent='Сейчас: '+QLAB[ART.quality]+(SET.quality==='auto'?' (авто)':'');}
function openSettings(){AU.init();const el=$('#settings');el.hidden=false;[['vMaster','oMaster','master'],['vMusic','oMusic','music'],['vSfx','oSfx','sfx']].forEach(([i,o,k])=>{const r=$('#'+i);r.value=SET[k];$('#'+o).textContent=SET[k];r.oninput=()=>{SET[k]=+r.value;$('#'+o).textContent=r.value;if(k==='master'&&SET.muted&&+r.value>0){SET.muted=false;$('#snd').textContent='ЗВУК ВКЛ';}AU.apply();saveSet();};r.onchange=()=>{AU.click();AU.good();};});
 const q=$('#qSel');q.value=SET.quality;q.onchange=()=>{SET.quality=q.value;saveSet();const nq=q.value==='auto'?'high':q.value;if(walking)pendingQ=nq;else ART.setQuality(nq);qNote();};qNote();}
function closeSettings(){$('#settings').hidden=true;AU.click();}
async function boot(){
 save.visits=(save.visits||0)+1;persist();
 ART.setQuality(SET.quality==='auto'?'high':SET.quality);
 ART.init($('#gl'));
 ART.onPerf=q=>{if(SET.quality!=='auto'||window.TUMAR_NOAUTO||walking)return;ART.setQuality(q);toast('Графика: '+QLAB[q]+' (авто)',false);if(!$('#settings').hidden)qNote();};
 $('#snd').textContent=SET.muted?'ЗВУК ВЫКЛ':'ЗВУК ВКЛ';
 $('#bSet').onclick=openSettings;$('#setBtn').onclick=openSettings;$('#setClose').onclick=closeSettings;$('#settings').onclick=e=>{if(e.target.id==='settings')closeSettings();};
 document.addEventListener('keydown',e=>{if(e.code==='Escape'&&!$('#settings').hidden)closeSettings();});
 const lb=$('#loadBar'),lt=$('#loadTxt');let fin=false;const to=setTimeout(()=>{if(!fin)lt.textContent='ДОЛГО… ЗАПУСКАЮ УПРОЩЁННУЮ ГРАФИКУ';},15000);
 await Promise.race([ART.load(p=>{lb.style.width=Math.round(p*100)+'%';}),new Promise(r=>setTimeout(r,25000))]);fin=true;clearTimeout(to);
 lt.textContent=ART.ready?'ГОТОВО':'БЕЗ МОДЕЛЕЙ · УПРОЩЁННЫЙ РЕЖИМ';
 $('#bNew').onclick=()=>{AU.init();startChapter(1,true);};
 $('#bCont').onclick=()=>{AU.init();startChapter(save.check.ch,false);};
 $('#bChap').onclick=()=>{AU.init();openChapters();};
 if(window.SMOG_DESKTOP){$('#bQuit').hidden=false;$('#bQuit').onclick=()=>SMOG_DESKTOP.quit();}// настольное приложение (desktop/)
 $('#chBack').onclick=()=>{$('#chapters').hidden=true;};
 $('#endMenu').onclick=()=>openMenu();
 $('#snd').onclick=()=>{AU.init();const on=AU.toggle();$('#snd').textContent=on?'ЗВУК ВКЛ':'ЗВУК ВЫКЛ';};
 $('#gl').addEventListener('pointerdown',()=>AU.init(),{once:true});
 $('#toMenu').onclick=()=>{if(confirmMenu()){location.hash='';openMenu();}};
 $('#sub').onclick=advance;$('#card').onclick=advance;
 document.addEventListener('keydown',e=>{if(e.repeat)return;if((e.code==='Space'||e.code==='Enter'||e.code==='KeyE')&&advResolve&&$('#wall').hidden&&$('#qte').hidden){e.preventDefault();advance();}});
 openMenu();
 setTimeout(()=>{$('#loading').classList.add('done');setTimeout(()=>$('#loading').hidden=true,1000);},500);
 setTimeout(()=>ART.prebuild(['apartment','tower','crime'],()=>{}),2500);
}
let menuArm=0;function confirmMenu(){const b=$('#toMenu');if(Date.now()-menuArm<3000){b.textContent='МЕНЮ';return true;}menuArm=Date.now();b.textContent='ТОЧНО? ПРОГРЕСС ГЛАВЫ СОХРАНЁН';setTimeout(()=>{b.textContent='МЕНЮ';},3000);return false;}
window.addEventListener('load',boot);
window.__TUMAR=window.__SMOG={N,play:id=>play(id),F:()=>F,AU,SET,startChapter,openSettings,bark,get walking(){return walking;}};
})();
