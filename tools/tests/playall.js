// Автопрохождение всей игры: случайные выборы (сид), телепорт героя к точкам, проверка ошибок.
// node playall.js [сид] [low|medium|high] [shots]
const {chromium}=require('playwright');const {openGame,OUT,path}=require('./common');
const seed=+(process.argv[2]||1), Q=process.argv[3]||'low', SHOTS=process.argv[4]==='shots';
let rs=seed*9301+49297;const rnd=()=>{rs=(rs*9301+49297)%233280;return rs/233280;};
(async()=>{const {b,p,errs}=await openGame(chromium,{quality:Q,width:SHOTS?1280:640,height:SHOTS?720:360});
await p.evaluate(()=>__SMOG.startChapter(1,true));
const log=[];let last='',same=0,shot=0;const seenWalk=new Set();const t0=Date.now();
for(let step=0;step<4000;step++){
 const st=await p.evaluate(()=>{const vis=id=>{const e=document.getElementById(id);return !!e&&!e.hidden;};const P=window.PLAY,D=window.DRIVE;
  return {card:vis('card'),sub:vis('sub')&&vis('adv'),txt:vis('sub')?document.getElementById('txt').textContent.slice(0,50):'',choices:vis('choices'),nch:document.querySelectorAll('#choices .ch:not(.locked)').length,chs:[...document.querySelectorAll('#choices .ch')].map(b=>!b.classList.contains('locked')),wall:vis('wall'),qte:vis('qte'),flow:vis('flow'),ending:vis('ending'),walk:!!(P&&P.active),paused:!!(P&&P.active&&P.state.paused),drive:!!(D&&D.active),scene:ART.curName,qkey:vis('qte')?document.getElementById('qKey').textContent:null,title:P&&P.active?P.state.cfg.title:''};});
 const key=JSON.stringify(st);if(key===last){same++;if(same>60){log.push('STUCK '+key);break;}}else{same=0;last=key;}
 if(st.ending){log.push('ENDING '+(await p.evaluate(()=>document.getElementById('endT').textContent)));break;}
 if(st.flow){log.push('FLOW '+st.scene);await p.evaluate(()=>document.getElementById('flowGo').click());continue;}
 if(st.card){await p.evaluate(()=>document.getElementById('card').click());await p.waitForTimeout(80);continue;}
 if(st.wall){const ok=rnd()<0.75;if(ok)for(let i=0;i<34;i++)await p.keyboard.press('Space');await p.waitForTimeout(ok?300:8500);log.push('WALL '+(ok?'break':'fail'));continue;}
 if(st.qte){const k=st.qkey;const good=rnd()<0.8;const code=k==='ПРОБЕЛ'?'Space':/^\d$/.test(k)?k:'Key'+k;await p.keyboard.press(good?code:'KeyZ');await p.waitForTimeout(330);continue;}
 if(st.choices){const idx=st.chs.map((ok,i)=>ok?i:-1).filter(i=>i>=0);const i=idx[Math.floor(rnd()*idx.length)];log.push('CHOICE '+st.scene+' #'+(i+1)+'/'+st.chs.length);await p.keyboard.press(String(i+1));await p.waitForTimeout(120);continue;}
 if(st.sub){await p.keyboard.press('Space');await p.waitForTimeout(30);continue;}
 if(st.walk&&!st.paused){if(!seenWalk.has(st.title)){seenWalk.add(st.title);log.push('WALK '+st.scene+' «'+st.title+'»');await p.waitForTimeout(1500);if(SHOTS)await p.screenshot({path:path.join(OUT,'w'+(shot++)+'_'+st.scene+'.png')});}
  const r=await p.evaluate(()=>{const S=PLAY.state;const cfg=S.cfg;const F=cfg.flags();const h=S.hero;
   const sp=(cfg.spots||[]).filter(s=>(!s.cond||s.cond(F))&&!S.done.has(s.id)&&!s.hidden);let s=sp.find(x=>!x.end&&x.clue)||sp.find(x=>!x.end)||sp[0];
   const need=(cfg.need||[]).filter(id=>!S.done.has(id));if(s&&!need.length&&!(cfg.needCount)&&!s.end&&cfg.goal&&Math.random()<0.5)s=null;
   if(s){let x,z;if(s.npc){const g=S.ctx.byKey[s.npc];x=g.position.x;z=g.position.z;}else{x=s.at[0];z=s.at[2];}const dx=h.position.x-x,dz=h.position.z-z;const d=Math.hypot(dx,dz)||1;const k=Math.min(d,Math.max(0.55,(s.r||1.5)*0.5));h.position.x=x+dx/d*k;h.position.z=z+dz/d*k;h.rotation.y=Math.atan2(x-h.position.x,z-h.position.z);return {spot:s.id,near:S.near&&S.near.id};}
   if(cfg.goal&&(S.goalOpen||!(cfg.need&&cfg.need.length)&&!cfg.needCount)){h.position.x=cfg.goal.at[0]+0.4;h.position.z=cfg.goal.at[1]+0.4;return {goal:1};}
   return {none:1,need,done:[...S.done]};});
  await p.waitForTimeout(260);
  if(r.spot){const near=await p.evaluate(()=>PLAY.state.near&&PLAY.state.near.id);if(near)await p.keyboard.press('KeyE');else{log.push('NOTNEAR '+r.spot);await p.evaluate(id=>{const S=PLAY.state;const s=S.cfg.spots.find(x=>x.id===id);if(s)S.near=s;},r.spot);await p.keyboard.press('KeyE');}await p.waitForTimeout(150);}
  continue;}
 if(st.drive){if(!seenWalk.has('drive')){seenWalk.add('drive');log.push('DRIVE '+st.scene);await p.keyboard.down('KeyW');await p.keyboard.press('KeyH');await p.waitForTimeout(2500);await p.keyboard.up('KeyW');if(SHOTS)await p.screenshot({path:path.join(OUT,'d'+(shot++)+'.png')});}
  const win=rnd()<0.7;await p.evaluate(win=>{const D=DRIVE.state;if(win){const g=D.cfg.goal.at;D.x=g[0]-2;D.z=g[1];}else{D.left=0.1;}},win);await p.waitForTimeout(600);continue;}
 await p.waitForTimeout(120);}
log.push('time '+Math.round((Date.now()-t0)/1000)+'s');
const F=await p.evaluate(()=>__SMOG.F());
console.log(log.join('\n'));console.log('F',JSON.stringify(F).slice(0,600));console.log('ERRORS',errs.length);console.log([...new Set(errs)].slice(0,25).join('\n'));await b.close();process.exit(errs.length?1:0);})();
