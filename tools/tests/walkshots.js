// Скриншоты режимов управления: node walkshots.js [узлы через запятую] [качество]
const {chromium}=require('playwright');const {openGame,OUT,path}=require('./common');
const nodes=(process.argv[2]||'c1_home,c2_balcony,c2_inv,c2_ana,c3_lore,c4_city,c6_tunnel').split(',');const Q=process.argv[3]||'high';
(async()=>{const {b,p,errs}=await openGame(chromium,{quality:Q});
for(const id of nodes){
 await p.evaluate(id=>{document.getElementById('menu').hidden=true;document.getElementById('toMenu').hidden=false;__SMOG.play(id);},id);
 const ok=await p.waitForFunction(()=>window.PLAY&&PLAY.active||window.DRIVE&&DRIVE.active,null,{timeout:120000}).then(()=>true,()=>false);if(!ok){errs.push('no control mode in '+id);continue;}
 await p.waitForTimeout(2500);await p.screenshot({path:path.join(OUT,id+'_a.png')});
 await p.evaluate(()=>{if(!PLAY.active)return;const S=PLAY.state;const F=S.cfg.flags();const s=S.cfg.spots.filter(s=>(!s.cond||s.cond(F))&&!s.hidden)[0];if(!s)return;const h=S.hero;let x,z;if(s.npc){const g=S.ctx.byKey[s.npc];x=g.position.x;z=g.position.z;}else{x=s.at[0];z=s.at[2];}h.position.x=x+0.9;h.position.z=z+0.9;h.rotation.y=Math.atan2(x-h.position.x,z-h.position.z);S.yaw=h.rotation.y;});
 await p.waitForTimeout(2500);await p.screenshot({path:path.join(OUT,id+'_b.png')});
 await p.evaluate(()=>{if(PLAY.active)PLAY.end();if(window.DRIVE&&DRIVE.active)DRIVE.end();});}
console.log('errors',errs.length);errs.slice(0,10).forEach(e=>console.log(e));await b.close();process.exit(errs.length?1:0);})();
