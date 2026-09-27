// ============================================================
// СМОГ · управление героем от третьего лица
// WASD/стрелки — ходьба, Shift — бег, мышь (зажать или клик = захват) — камера, E — действие
// ============================================================
const PLAY=(()=>{
'use strict';
const T=THREE;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerpA=(a,b,k)=>{let d=((b-a+Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)-Math.PI;return a+d*k;};
const S={on:false,paused:false,cfg:null,ctx:null,hero:null,keys:{},yaw:0,pitch:0.22,dist:2.6,camPos:new T.Vector3(),camLook:new T.Vector3(),speed:0,anim:'',near:null,done:new Set(),talk:null,
 drag:false,px:0,py:0,lastMouse:-9,locked:false,t:0,joy:{x:0,y:0,on:false},look:{x:0,y:0},knock:0,knockV:new T.Vector3(),stun:0,goalReached:false,ev:new Set(),finish:null,interacting:false,noRun:false,camMode:'follow'};
const HERO_R=0.28;
const V=(x,y,z)=>new T.Vector3(x,y,z);
const _v=new T.Vector3(),_w=new T.Vector3(),_p=new T.Vector3(),_q=new T.Vector3();
// ---------------- DOM ----------------
let root=null,elObj,elPrompt,elHint,elGoal,elMap,elMapCtx,elJoy,elAct,elToast,markers=new Map();
function dom(){if(root)return;root=document.createElement('div');root.id='walk';root.hidden=true;
 root.innerHTML='<div id="wObj"></div><div id="wHint"></div><div id="wGoal" hidden><i></i><span></span></div><button id="wPrompt" type="button" hidden><b>E</b><span></span></button><canvas id="wMap" width="200" height="200" hidden></canvas><div id="wJoy" hidden><i></i></div><button id="wAct" type="button" hidden>E</button><div id="wToast" hidden></div>';
 document.body.appendChild(root);elObj=root.querySelector('#wObj');elPrompt=root.querySelector('#wPrompt');elHint=root.querySelector('#wHint');elGoal=root.querySelector('#wGoal');elMap=root.querySelector('#wMap');elMapCtx=elMap.getContext('2d');elJoy=root.querySelector('#wJoy');elAct=root.querySelector('#wAct');elToast=root.querySelector('#wToast');
 elPrompt.onclick=()=>tryInteract();elAct.onclick=()=>tryInteract();
 // input
 addEventListener('keydown',e=>{if(!S.on)return;if(e.target&&(e.target.tagName==='INPUT'||e.target.tagName==='SELECT'))return;S.keys[e.code]=true;if(e.code==='KeyE'||e.code==='Enter'){if(!S.paused){e.preventDefault();tryInteract();}}
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)&&!S.paused)e.preventDefault();});
 addEventListener('keyup',e=>{S.keys[e.code]=false;});addEventListener('blur',()=>{S.keys={};});
 const cv=document.getElementById('gl');
 cv.addEventListener('pointerdown',e=>{if(!S.on||S.paused)return;if(e.pointerType==='touch')return touchDown(e);S.drag=true;S.px=e.clientX;S.py=e.clientY;
  if(S.cfg&&S.cfg.lock!==false&&cv.requestPointerLock&&!S.locked){try{const pr=cv.requestPointerLock();if(pr&&pr.catch)pr.catch(()=>{});}catch(err){}}});
 addEventListener('pointermove',e=>{if(!S.on)return;if(e.pointerType==='touch')return touchMove(e);if(S.locked){mouseLook(e.movementX,e.movementY);return;}if(!S.drag)return;mouseLook(e.clientX-S.px,e.clientY-S.py);S.px=e.clientX;S.py=e.clientY;});
 addEventListener('pointerup',e=>{if(e.pointerType==='touch')return touchUp(e);S.drag=false;});
 document.addEventListener('pointerlockchange',()=>{S.locked=document.pointerLockElement===cv;});}
function mouseLook(dx,dy){S.yaw-=dx*0.0042;S.pitch=clamp(S.pitch+dy*0.0032,-0.35,0.85);S.lastMouse=S.t;}
// touch: left half = joystick, right half = look
const touches=new Map();
function touchDown(e){const left=e.clientX<innerWidth*0.45;touches.set(e.pointerId,{left,x:e.clientX,y:e.clientY,ox:e.clientX,oy:e.clientY});if(left){S.joy.on=true;elJoy.hidden=false;elJoy.style.left=(e.clientX-60)+'px';elJoy.style.top=(e.clientY-60)+'px';}}
function touchMove(e){const t=touches.get(e.pointerId);if(!t)return;if(t.left){const dx=e.clientX-t.ox,dy=e.clientY-t.oy;const m=Math.min(1,Math.hypot(dx,dy)/55);const a=Math.atan2(dy,dx);S.joy.x=Math.cos(a)*m;S.joy.y=-Math.sin(a)*m;elJoy.firstChild.style.transform='translate('+(Math.cos(a)*m*40)+'px,'+(Math.sin(a)*m*40)+'px)';}else{mouseLook((e.clientX-t.x)*1.4,(e.clientY-t.y)*1.4);t.x=e.clientX;t.y=e.clientY;}}
function touchUp(e){const t=touches.get(e.pointerId);touches.delete(e.pointerId);if(t&&t.left){S.joy.on=false;S.joy.x=S.joy.y=0;elJoy.hidden=true;}}
// ---------------- collisions ----------------
function pushCircle(p,cx,cz,r){const dx=p.x-cx,dz=p.z-cz;const d=Math.hypot(dx,dz);const m=r+HERO_R;if(d<m&&d>1e-5){p.x=cx+dx/d*m;p.z=cz+dz/d*m;return true;}return false;}
function pushBox(p,b){const c=Math.cos(-b.ry||0),s=Math.sin(-b.ry||0);const lx=(p.x-b.x)*c-(p.z-b.z)*s,lz=(p.x-b.x)*s+(p.z-b.z)*c;const hx=b.w/2,hz=b.d/2;
 const qx=clamp(lx,-hx,hx),qz=clamp(lz,-hz,hz);let dx=lx-qx,dz=lz-qz;let d=Math.hypot(dx,dz);
 if(d<1e-6){const ex=hx-Math.abs(lx),ez=hz-Math.abs(lz);if(ex<ez){dx=Math.sign(lx)||1;dz=0;d=0;const nx=Math.sign(lx)*(hx+HERO_R);const nlz=lz;const c2=Math.cos(b.ry||0),s2=Math.sin(b.ry||0);p.x=b.x+nx*c2-nlz*s2;p.z=b.z+nx*s2+nlz*c2;}else{const nz=Math.sign(lz)*(hz+HERO_R);const c2=Math.cos(b.ry||0),s2=Math.sin(b.ry||0);p.x=b.x+lx*c2-nz*s2;p.z=b.z+lx*s2+nz*c2;}return true;}
 if(d<HERO_R){const k=(HERO_R-d)/d;const nlx=lx+dx*k,nlz=lz+dz*k;const c2=Math.cos(b.ry||0),s2=Math.sin(b.ry||0);p.x=b.x+nlx*c2-nlz*s2;p.z=b.z+nlx*s2+nlz*c2;return true;}return false;}
function pushPoly(p,pts){// pts: flat [x,z,...] closed implicitly
 const n=pts.length/2;let inside=false;for(let i=0,j=n-1;i<n;j=i++){const xi=pts[i*2],zi=pts[i*2+1],xj=pts[j*2],zj=pts[j*2+1];if(((zi>p.z)!==(zj>p.z))&&(p.x<(xj-xi)*(p.z-zi)/(zj-zi)+xi))inside=!inside;}
 let best=1e9,bx=0,bz=0;for(let i=0,j=n-1;i<n;j=i++){const ax=pts[j*2],az=pts[j*2+1],cx=pts[i*2],cz=pts[i*2+1];const ex=cx-ax,ez=cz-az;const L=ex*ex+ez*ez||1e-9;let u=((p.x-ax)*ex+(p.z-az)*ez)/L;u=clamp(u,0,1);const qx=ax+ex*u,qz=az+ez*u;const d=(p.x-qx)**2+(p.z-qz)**2;if(d<best){best=d;bx=qx;bz=qz;}}
 const d=Math.sqrt(best);if(inside){const dx=bx-p.x,dz=bz-p.z;const l=Math.hypot(dx,dz)||1;p.x=bx+dx/l*HERO_R;p.z=bz+dz/l*HERO_R;return true;}
 if(d<HERO_R&&d>1e-6){p.x=bx+(p.x-bx)/d*HERO_R;p.z=bz+(p.z-bz)/d*HERO_R;return true;}return false;}
function collide(p){const c=S.ctx;for(let it=0;it<2;it++){
  if(c.colliders)for(const k of c.colliders){if(k.off)continue;if(k.t==='c')pushCircle(p,k.x,k.z,k.r);else if(k.t==='b')pushBox(p,k);else if(k.t==='p')pushPoly(p,k.pts);}
  if(c.queryColliders)for(const k of c.queryColliders(p.x,p.z,2)){if(k.t==='c')pushCircle(p,k.x,k.z,k.r);else if(k.t==='b')pushBox(p,k);else if(k.t==='p')pushPoly(p,k.pts);}
  for(const g of c.chars){if(g===S.hero||!g.visible||g.userData.noCollide)continue;pushCircle(p,g.position.x,g.position.z,g.userData.radius||0.3);}
  const a=c.walkArea;if(a){p.x=clamp(p.x,a.minX+HERO_R,a.maxX-HERO_R);p.z=clamp(p.z,a.minZ+HERO_R,a.maxZ-HERO_R);}}}
// ---------------- spots ----------------
function spotPos(s,out){if(s.npc){const g=S.ctx.byKey[s.npc];if(g){out.set(g.position.x,g.position.y+(s.h||1.55),g.position.z);return out;}}if(s.get){s.get(out);return out;}out.set(s.at[0],s.at[1],s.at[2]);return out;}
function activeSpots(){const F=S.cfg.flags?S.cfg.flags():{};return (S.cfg.spots||[]).filter(s=>(!s.cond||s.cond(F))&&!(s.once!==false&&S.done.has(s.id)&&!s.repeat));}
function tryInteract(){if(!S.on||S.paused||S.interacting)return;const s=S.near;if(!s)return;interact(s);}
async function interact(s){S.interacting=true;S.paused=true;S.speed=0;setAnim(S.hero,'idle');elPrompt.hidden=true;
 const tp=spotPos(s,new T.Vector3());const h=S.hero;h.rotation.y=Math.atan2(tp.x-h.position.x,tp.z-h.position.z);
 if(s.npc){const g=S.ctx.byKey[s.npc];if(g&&!s.noTurn){g.userData.faceTo=h;}}
 S.talk={s,tp:tp.clone()};
 let res=null;try{res=S.cfg.onInteract?await S.cfg.onInteract(s):null;}catch(e){console.error(e);}
 if(s.npc){const g=S.ctx.byKey[s.npc];if(g)g.userData.faceTo=null;}
 S.done.add(s.id);S.talk=null;S.interacting=false;if(!S.on)return;S.paused=false;renderObjectives();
 if(res&&res.end)return finish(res);check();}
function check(){const c=S.cfg;if(!c)return;const need=c.need||[];const okNeed=need.every(id=>S.done.has(id));const cnt=c.needCount||0;const okCnt=(S.cfg.spots||[]).filter(s=>s.clue&&S.done.has(s.id)).length>=cnt;
 if(okNeed&&okCnt){if(!c.goal){if(c.autoEnd!==false)finish({});}else S.goalOpen=true;}renderObjectives();}
function finish(res){if(!S.on)return;const f=S.finish;end();f&&f(res||{});}
// ---------------- objectives HUD ----------------
function renderObjectives(){if(!S.cfg){elObj.innerHTML='';return;}const c=S.cfg;const F=c.flags?c.flags():{};let h='';
 if(c.title)h+='<div class="wt">'+esc(c.title)+'</div>';
 for(const o of (c.objectives||[])){if(o.cond&&!o.cond(F))continue;const done=o.done?o.done(S):(o.id&&S.done.has(o.id));h+='<div class="wo'+(done?' ok':'')+'"><i></i><span>'+esc(typeof o.t==='function'?o.t(S):o.t)+'</span></div>';}
 if(c.needCount){const n=(c.spots||[]).filter(s=>s.clue&&S.done.has(s.id)).length;h+='<div class="wo'+(n>=c.needCount?' ok':'')+'"><i></i><span>Улики: '+n+' / '+c.needCount+'</span></div>';}
 if(c.goal&&(S.goalOpen||!c.need&&!c.needCount))h+='<div class="wo go"><i></i><span>'+esc(c.goal.label)+'</span></div>';
 elObj.innerHTML=h;}
const esc=s=>String(s).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
function toast(t,ms){elToast.textContent=t;elToast.hidden=false;elToast.classList.remove('out');clearTimeout(toast._t);toast._t=setTimeout(()=>{elToast.classList.add('out');setTimeout(()=>elToast.hidden=true,500);},ms||2600);}
// ---------------- animation helpers ----------------
function setAnim(g,name,fade,speed){if(g&&g.userData.play)g.userData.play(name,fade===undefined?0.22:fade,speed);}
// ---------------- main update (called by ART each frame) ----------------
const proj=new T.Vector3();
function screen(p,cam){proj.copy(p).project(cam);return {x:(proj.x*0.5+0.5)*innerWidth,y:(-proj.y*0.5+0.5)*innerHeight,front:proj.z<1};}
function update(dt,t,cam){if(!S.on)return;S.t=t;const c=S.ctx,h=S.hero,cfg=S.cfg;if(!h)return;
 // --- input → movement
 let ix=0,iz=0;if(!S.paused&&S.stun<=0){ix=(S.keys.KeyD||S.keys.ArrowRight?1:0)-(S.keys.KeyA||S.keys.ArrowLeft?1:0);iz=(S.keys.KeyW||S.keys.ArrowUp?1:0)-(S.keys.KeyS||S.keys.ArrowDown?1:0);if(S.joy.on){ix=S.joy.x;iz=S.joy.y;}}
 const mag=Math.min(1,Math.hypot(ix,iz));const run=(S.keys.ShiftLeft||S.keys.ShiftRight||(S.joy.on&&mag>0.92))&&!S.noRun&&!cfg.noRun;
 const vWalk=cfg.walkSpeed||1.45,vRun=cfg.runSpeed||3.9;const target=mag>0.05?(run?vRun:vWalk)*mag:0;
 S.speed+=(target-S.speed)*Math.min(1,dt*(target>S.speed?5:9));
 if(mag>0.05){const a=Math.atan2(-ix,iz);h.rotation.y=lerpA(h.rotation.y,S.yaw+a,Math.min(1,dt*9));}
 _p.copy(h.position);
 if(S.speed>0.01){h.position.x+=Math.sin(h.rotation.y)*S.speed*dt;h.position.z+=Math.cos(h.rotation.y)*S.speed*dt;}
 if(S.knock>0){h.position.addScaledVector(S.knockV,dt);S.knockV.multiplyScalar(Math.max(0,1-dt*4));S.knock-=dt;}
 if(S.stun>0)S.stun-=dt;
 collide(h.position);
 h.position.y=c.heightAt?c.heightAt(h.position.x,h.position.z):(c.floorY||0);
 const moved=Math.hypot(h.position.x-_p.x,h.position.z-_p.z)/Math.max(dt,1e-4);
 // --- animation state
 let want=S.stun>0?'idle':moved>2.3?'run':moved>0.25?'walk':'idle';if(S.paused&&!S.stun)want='idle';
 if(want!==S.anim){setAnim(h,want,0.25);S.anim=want;}
 if(h.userData.animSpeed){h.userData.animSpeed(want==='walk'?clamp(moved/1.35,0.6,1.5):want==='run'?clamp(moved/3.6,0.7,1.4):1);}
 // --- camera
 const autoFollow=(t-S.lastMouse>1.4)&&S.speed>0.4&&!S.paused;if(autoFollow)S.yaw=lerpA(S.yaw,h.rotation.y,Math.min(1,dt*1.3));
 const headY=h.position.y+(cfg.camH||1.55);let dist=cfg.camDist||2.6;let pitch=S.pitch;let yaw=S.yaw;const sh=cfg.shoulder===undefined?0.38:cfg.shoulder;
 let tx=h.position.x,ty=headY,tz=h.position.z;
 if(S.talk){// двухплановый кадр: через плечо героя на собеседника/предмет
  const tp=S.talk.tp;const dx=tp.x-h.position.x,dz=tp.z-h.position.z;const d=Math.hypot(dx,dz)||1;yaw=Math.atan2(dx,dz);dist=Math.min(2.0,1.1+d*0.35);pitch=0.08;tx=(h.position.x+tp.x)/2-dx/d*0.2;tz=(h.position.z+tp.z)/2-dz/d*0.2;ty=(headY+tp.y)/2;}
 const rx=-Math.cos(yaw),rz=Math.sin(yaw);// экранное «вправо»
 _v.set(tx-Math.sin(yaw)*Math.cos(pitch)*dist+rx*sh,ty+Math.sin(pitch)*dist,tz-Math.cos(yaw)*Math.cos(pitch)*dist+rz*sh);
 _w.set(tx+rx*sh*0.6+Math.sin(yaw)*2,ty-0.1-Math.sin(pitch)*0.8,tz+rz*sh*0.6+Math.cos(yaw)*2);
 if(c.camCollide)c.camCollide(_v,_q.set(tx,ty,tz));
 const cb=c.camBox;if(cb){_v.x=clamp(_v.x,cb.minX,cb.maxX);_v.y=clamp(_v.y,cb.minY,cb.maxY);_v.z=clamp(_v.z,cb.minZ,cb.maxZ);}
 const k=Math.min(1,dt*(S.talk?4:10));S.camPos.lerp(_v,k);S.camLook.lerp(_w,k);cam.position.copy(S.camPos);cam.lookAt(S.camLook);
 // --- spots / prompt / markers
 const F=cfg.flags?cfg.flags():{};let best=null,bd=1e9;const hp=h.position;
 const act=activeSpots();const seen=new Set();
 for(const s of act){spotPos(s,_q);const dx=_q.x-hp.x,dz=_q.z-hp.z;const d=Math.hypot(dx,dz);const r=s.r||1.5;
  if(!S.paused&&d<r){const face=Math.abs(lerpA(0,Math.atan2(dx,dz)-h.rotation.y,1));if(face<1.9&&d<bd){bd=d;best=s;}}
  if(d<(s.show||14)&&!s.hidden){seen.add(s.id);let m=markers.get(s.id);if(!m){m=document.createElement('div');m.className='wMark'+(s.npc?' npc':'')+(s.clue?' clue':'');m.innerHTML='<i></i>';root.appendChild(m);markers.set(s.id,m);}
   const sc=screen(_q,cam);if(!sc.front){m.style.display='none';continue;}m.style.display='';m.style.left=sc.x+'px';m.style.top=sc.y+'px';m.style.opacity=String(clamp(1.3-d/(s.show||14),0.15,1)*(s===S.near?0:1));}}
 for(const [id,m] of markers)if(!seen.has(id)){m.remove();markers.delete(id);}
 S.near=best;if(best&&!S.paused){const sc=screen(spotPos(best,_q),cam);elPrompt.hidden=!sc.front;elPrompt.style.left=sc.x+'px';elPrompt.style.top=sc.y+'px';elPrompt.lastChild.textContent=best.label;elAct.hidden=!('ontouchstart' in window);}else{elPrompt.hidden=true;elAct.hidden=true;}
 // --- events (зоны)
 if(!S.paused)for(const e of (cfg.events||[])){if(S.ev.has(e.id)&&e.once!==false)continue;if(e.cond&&!e.cond(F))continue;const d=Math.hypot(hp.x-e.at[0],hp.z-e.at[1]);if(d<(e.r||3)){S.ev.add(e.id);if(cfg.onEvent){if(e.block)runEvent(e);else{try{cfg.onEvent(e);}catch(err){console.error(err);}}}}}
 // --- goal
 if(cfg.goal&&(S.goalOpen||!(cfg.need&&cfg.need.length)&&!cfg.needCount)){const g=cfg.goal;const d=Math.hypot(hp.x-g.at[0],hp.z-g.at[1]);_q.set(g.at[0],(g.y===undefined?hp.y:g.y)+1.2,g.at[1]);const sc=screen(_q,cam);
  let x=sc.x,y=sc.y;const off=!sc.front||x<30||x>innerWidth-30||y<30||y>innerHeight-30;if(!sc.front){x=innerWidth-x;y=innerHeight-y;}x=clamp(x,40,innerWidth-40);y=clamp(y,70,innerHeight-60);
  elGoal.hidden=false;elGoal.style.left=x+'px';elGoal.style.top=y+'px';elGoal.classList.toggle('edge',off);elGoal.lastChild.textContent=Math.round(d)+' м';
  if(d<(g.r||2.5)&&!S.paused&&!S.goalReached){S.goalReached=true;finish({goal:true});return;}}else elGoal.hidden=true;
 // --- per-frame hooks of the scene (экшен)
 if(cfg.tick)cfg.tick(dt,t,S);if(c.walkTick)c.walkTick(dt,t,S);
 drawMap();}
async function runEvent(e){S.paused=true;S.speed=0;setAnim(S.hero,'idle');let res=null;try{res=await S.cfg.onEvent(e);}catch(err){console.error(err);}if(!S.on)return;S.paused=false;if(res&&res.end)finish(res);}
// ---------------- minimap ----------------
function drawMap(){const c=S.ctx;if(!c.mapImage){elMap.hidden=true;return;}elMap.hidden=false;const g=elMapCtx,W=200,H=200,h=S.hero.position;const m=c.mapImage;const scale=m.scale*1.0;// px per meter in map image
 g.save();g.clearRect(0,0,W,H);g.beginPath();g.arc(W/2,H/2,W/2-2,0,Math.PI*2);g.clip();g.fillStyle='rgba(8,12,18,.85)';g.fillRect(0,0,W,H);
 g.translate(W/2,H/2);g.rotate(S.yaw+Math.PI);const k=1.25;g.scale(k,k);g.drawImage(m.canvas,-(h.x-m.minX)*scale,-(h.z-m.minZ)*scale);
 if(S.cfg.goal){const gx=(S.cfg.goal.at[0]-h.x)*scale,gz=(S.cfg.goal.at[1]-h.z)*scale;g.fillStyle='#f2c94c';g.beginPath();g.arc(gx,gz,4/k,0,7);g.fill();}
 for(const s of activeSpots()){if(!s.map)continue;spotPos(s,_q);g.fillStyle=s.clue?'#6fd8f2':'#e9dcff';g.beginPath();g.arc((_q.x-h.x)*scale,(_q.z-h.z)*scale,3/k,0,7);g.fill();}
 if(c.mapDots)for(const d of c.mapDots()){g.fillStyle=d.c;g.beginPath();g.arc((d.x-h.x)*scale,(d.z-h.z)*scale,(d.r||2.5)/k,0,7);g.fill();}
 g.restore();g.save();g.translate(W/2,H/2);g.fillStyle='#6fd8f2';g.beginPath();g.moveTo(0,-7);g.lineTo(5,6);g.lineTo(0,3);g.lineTo(-5,6);g.closePath();g.fill();g.restore();
 g.strokeStyle='rgba(111,216,242,.5)';g.lineWidth=2;g.beginPath();g.arc(W/2,H/2,W/2-2,0,Math.PI*2);g.stroke();}
// ---------------- API ----------------
function begin(cfg){dom();return new Promise(res=>{const ctx=ART._cur;S.cfg=cfg;S.ctx=ctx;S.done=new Set(cfg.doneIds||[]);S.ev=new Set();S.goalReached=false;S.goalOpen=false;S.finish=res;S.paused=false;S.interacting=false;S.talk=null;S.speed=0;S.anim='';S.knock=0;S.stun=0;
 const h=ctx.byKey[cfg.hero];S.hero=h;if(!h){console.warn('hero not in scene',cfg.hero);res({});return;}
 h.userData.walker=null;h.userData.noCollide=true;if(cfg.start){h.position.x=cfg.start[0];h.position.z=cfg.start[1];if(cfg.start[2]!==undefined)h.rotation.y=cfg.start[2];}
 S.yaw=cfg.yaw!==undefined?cfg.yaw:h.rotation.y;S.pitch=cfg.pitch||0.2;const cam=ART._cam;S.fov0=null;if(cfg.fov){S.fov0=cam.fov;cam.fov=cfg.fov;cam.updateProjectionMatrix();}S.camPos.copy(cam.position);S.camLook.set(h.position.x,h.position.y+1.4,h.position.z);
 S.on=true;root.hidden=false;elHint.textContent=cfg.hint||'WASD — идти · Shift — бежать · мышь — камера · E — действие';elHint.classList.remove('out');setTimeout(()=>elHint.classList.add('out'),7000);
 renderObjectives();ART.setCamControl(update);check();});}
function end(){if(!S.on)return;S.on=false;root.hidden=true;root.classList.remove('talking');if(S.fov0){const cam=ART._cam;cam.fov=S.fov0;cam.updateProjectionMatrix();S.fov0=null;}for(const m of markers.values())m.remove();markers.clear();ART.setCamControl(null);if(document.pointerLockElement)document.exitPointerLock();if(S.hero){S.hero.userData.noCollide=false;setAnim(S.hero,'idle');}S.keys={};}
function knockback(dx,dz,power,stun){S.knockV.set(dx,0,dz).normalize().multiplyScalar(power||6);S.knock=0.45;S.stun=stun||0.8;S.speed=0;}
return {begin,end,toast,knockback,get state(){return S;},get active(){return S.on;},pause(v){S.paused=v;},refresh:renderObjectives,markDone(id){S.done.add(id);renderObjectives();check();}};
})();
window.PLAY=PLAY;
