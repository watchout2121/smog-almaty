// ============================================================
// СМОГ · «Сад» — интерфейс Евы. Каждую ночь Никита-Х отчитывается в месте, которого нет:
// яблоневый сад (апорт) на склоне предгорья весной, чистые снежные горы, синее небо.
// 'orchard'       — весна: трава на ветру, цветущие яблони, покрывало, чайник, две пиалы, миска яблок
// 'orchard_storm' — Ева злится: голые деревья, метель, серое небо, замёрзший чай, холодный свет
// Прогулка (play.js): ctx.colliders / walkArea / heightAt / camBox / points.after_eva / mapImage
// ============================================================
(()=>{
'use strict';
if(typeof ART==='undefined'||!ART.addScene)return;// ART — глобальная const, не свойство window
const T=THREE,LB=ART.lib,C=LB.C,rng=LB.rng,fbm=LB.fbm,V=LB.V;
const sm=t=>t*t*(3-2*t),clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),ss=(a,b,x)=>sm(clamp((x-a)/(b-a),0,1));
const TAU=Math.PI*2;
const CACHE=new Map();const cached=(k,f)=>{if(!CACHE.has(k))CACHE.set(k,f());return CACHE.get(k);};
const merge=gs=>T.BufferGeometryUtils?T.BufferGeometryUtils.mergeBufferGeometries(gs,false):gs[0];

// ---------------- рельеф ----------------
// ровная полоса по центру (тропа к Еве), мягкие волны по краям прогулочной зоны
function heightAt(x,z){const k=ss(2.0,5.0,Math.abs(x));return k*(0.03*x+0.07*Math.sin(0.45*z+0.3*x)+0.05*Math.sin(0.23*x-0.4*z));}
// весь мир: вверх к горам (-z), вниз в долину (+z), холмы по бокам
function worldH(x,z){const dx=Math.max(0,Math.abs(x)-13),dzU=Math.max(0,-z-9),dzD=Math.max(0,z-13);
 const out=ss(0,14,Math.hypot(dx,dzU,dzD));const hills=(fbm(x/46+3,z/46+7,5,4)-0.45)*16*ss(10,60,Math.hypot(dx,dzU+dzD));
 return heightAt(x,z)*(1-out)+out*(0.07*dzU+0.0003*dzU*dzU-0.13*dzD-0.0011*dzD*dzD+0.05*dx+hills);}

// ---------------- текстуры ----------------
const barkTex=()=>cached('bark',()=>LB.canvasTex(128,256,(x,w,h)=>{const R=rng(7);x.fillStyle='#4a3a2e';x.fillRect(0,0,w,h);for(let i=0;i<260;i++){const v=40+R()*50|0;x.strokeStyle=`rgba(${v+14},${v+4},${v},.55)`;x.lineWidth=1+R()*3;const px=R()*w;x.beginPath();x.moveTo(px,R()*h);x.lineTo(px+(R()-0.5)*8,R()*h);x.stroke();}
 for(let i=0;i<60;i++){x.fillStyle='rgba(20,14,10,.5)';x.fillRect(R()*w,R()*h,2+R()*3,10+R()*40);}for(let i=0;i<40;i++){x.fillStyle='rgba(120,130,90,.18)';x.fillRect(R()*w,R()*h,6+R()*14,4+R()*10);}},true,[1,2]));
const petalTex=()=>cached('petal',()=>LB.canvasTex(64,64,(x,w,h)=>{x.translate(32,32);for(let i=0;i<5;i++){x.rotate(TAU/5);x.fillStyle='rgba(255,255,255,.95)';x.beginPath();x.ellipse(0,-13,8,13,0,0,TAU);x.fill();}x.fillStyle='rgba(255,220,120,1)';x.beginPath();x.arc(0,0,5,0,TAU);x.fill();},false));
function blanketTex(storm){return cached('blanket'+(storm?'S':''),()=>LB.canvasTex(512,384,(x,w,h)=>{const R=rng(5);
 x.fillStyle='#8c1f27';x.fillRect(0,0,w,h);x.fillStyle='#e7c77a';x.fillRect(14,14,w-28,h-28);x.fillStyle='#8c1f27';x.fillRect(26,26,w-52,h-52);
 x.fillStyle='#1f3b6e';x.fillRect(46,46,w-92,h-92);x.fillStyle='#8c1f27';x.fillRect(58,58,w-116,h-116);
 // орнамент «қошқар мүйіз» по полю
 x.strokeStyle='#e7c77a';x.lineWidth=7;x.lineCap='round';const horn=(cx,cy,s,rot)=>{x.save();x.translate(cx,cy);x.rotate(rot);x.beginPath();x.moveTo(0,0);x.bezierCurveTo(s*0.2,-s*0.9,s*1.1,-s*0.8,s*0.8,-s*0.2);x.bezierCurveTo(s*0.6,s*0.1,s*0.3,0,s*0.45,-s*0.3);x.stroke();x.restore();};
 for(const [cx,cy] of [[w*0.3,h*0.5],[w*0.7,h*0.5]]){for(let q=0;q<4;q++)horn(cx,cy,44,q*Math.PI/2);x.beginPath();x.arc(cx,cy,70,0,TAU);x.stroke();}
 x.fillStyle='#e7c77a';for(let i=0;i<w;i+=28){x.beginPath();x.moveTo(i,34);x.lineTo(i+10,40);x.lineTo(i,46);x.fill();x.beginPath();x.moveTo(i,h-34);x.lineTo(i+10,h-40);x.lineTo(i,h-46);x.fill();}
 x.globalAlpha=0.12;for(let i=0;i<6000;i++){x.fillStyle=R()<0.5?'#000':'#fff';x.fillRect(R()*w,R()*h,2,1);}x.globalAlpha=1;
 if(storm){// снег: сугробы к краям + мелкая крупа
  for(let i=0;i<26;i++){const ex=R()<0.5,px=ex?(R()<0.5?0:w)+(R()-0.5)*60:R()*w,py=ex?R()*h:(R()<0.5?0:h)+(R()-0.5)*60,r=40+R()*90;const g=x.createRadialGradient(px,py,0,px,py,r);g.addColorStop(0,'rgba(238,243,250,.95)');g.addColorStop(0.6,'rgba(232,238,247,.6)');g.addColorStop(1,'rgba(232,238,247,0)');x.fillStyle=g;x.fillRect(px-r,py-r,r*2,r*2);}
  for(let i=0;i<5000;i++){x.fillStyle=`rgba(240,245,252,${0.3+R()*0.6})`;x.fillRect(R()*w,R()*h,1+R()*2.5,1+R()*2);}x.fillStyle='rgba(220,230,244,.18)';x.fillRect(0,0,w,h);}
},true));}
const blossomTex=()=>cached('blossom',()=>{const t=LB.canvasTex(256,256,(x,w,h)=>{const R=rng(17);x.fillStyle='#6f9a4a';x.fillRect(0,0,w,h);
 for(let i=0;i<260;i++){const cx=R()*w,cy=R()*h,a=R()*TAU;x.fillStyle=['#5d8a3c','#7fae55','#94c065','#4f7a33'][(R()*4)|0];x.beginPath();x.ellipse(cx,cy,9+R()*6,4+R()*3,a,0,TAU);x.fill();}
 const fl=(cx,cy,r,c)=>{x.fillStyle=c;for(let k=0;k<5;k++){const a=k/5*TAU+cx;x.beginPath();x.ellipse(cx+Math.cos(a)*r*0.55,cy+Math.sin(a)*r*0.55,r*0.55,r*0.38,a,0,TAU);x.fill();}x.fillStyle='#f2c94c';x.beginPath();x.arc(cx,cy,r*0.22,0,TAU);x.fill();};
 for(let i=0;i<420;i++){const cx=R()*w,cy=R()*h,r=5+R()*6;for(const dx of [-w,0,w])for(const dy of [-h,0,h])fl(cx+dx,cy+dy,r,['#fffafc','#fde8ef','#f7d3e0','#ffffff','#f3c1d3'][(R()*5)|0]);}},true);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(2,1);return t;});
// соцветия для карточек кроны: цветы + листья на прозрачном фоне
const clusterTex=()=>cached('cluster',()=>{const t=LB.canvasTex(256,256,(x,w,h)=>{const R=rng(29);x.clearRect(0,0,w,h);
 const inside=(px,py)=>{const dx=px-128,dy=py-128;return Math.hypot(dx,dy)<104+14*Math.sin(Math.atan2(dy,dx)*5+R());};
 for(let i=0;i<120;i++){let px,py;do{px=R()*w;py=R()*h;}while(!inside(px,py));x.fillStyle=['#5d8a3c','#7fae55','#94c065','#6c9a48'][(R()*4)|0];x.beginPath();x.ellipse(px,py,10+R()*7,4+R()*3,R()*TAU,0,TAU);x.fill();}
 const fl=(cx,cy,r,c)=>{x.fillStyle=c;for(let k=0;k<5;k++){const a=k/5*TAU+cx*0.1;x.beginPath();x.ellipse(cx+Math.cos(a)*r*0.55,cy+Math.sin(a)*r*0.55,r*0.56,r*0.4,a,0,TAU);x.fill();}x.fillStyle='rgba(120,70,60,.5)';x.beginPath();x.arc(cx,cy,r*0.3,0,TAU);x.fill();x.fillStyle='#f2c94c';x.beginPath();x.arc(cx,cy,r*0.16,0,TAU);x.fill();};
 for(let i=0;i<150;i++){let px,py;do{px=R()*w;py=R()*h;}while(!inside(px,py));fl(px,py,6+R()*7,['#fffafc','#fde8ef','#f9d6e3','#ffffff','#f4c3d4'][(R()*5)|0]);}},true);return t;});
// 3 скрещенных квадрата, нормали — наружу от центра (мягкий свет листвы)
function cardGeo(){return cached('card',()=>{const gs=[];for(const [rx,ry] of [[0,0],[0,Math.PI/2],[Math.PI/2,0.6]]){const g=new T.PlaneGeometry(1,1,1,1);g.rotateX(rx);g.rotateY(ry);gs.push(g);}
 const g=merge(gs);const p=g.attributes.position,n=g.attributes.normal;for(let i=0;i<p.count;i++){const v=V(p.getX(i),p.getY(i)+0.25,p.getZ(i)).normalize();n.setXYZ(i,v.x,v.y,v.z);}return g;});}
const kese=(storm)=>cached('kese'+(storm?'S':''),()=>LB.ornamentTex(storm?'#e3ebf5':'#f3eee4',storm?'#6a86b0':'#2a5aa0',3,[3,1]));
const frostTex=()=>cached('frost',()=>LB.canvasTex(128,128,(x,w,h)=>{const R=rng(3);x.fillStyle='#dfe9f4';x.fillRect(0,0,w,h);x.strokeStyle='rgba(255,255,255,.9)';x.lineWidth=1.2;for(let i=0;i<40;i++){let px=R()*w,py=R()*h;x.beginPath();x.moveTo(px,py);for(let k=0;k<6;k++){px+=(R()-0.5)*26;py+=(R()-0.5)*26;x.lineTo(px,py);}x.stroke();}x.fillStyle='rgba(170,195,225,.35)';for(let i=0;i<30;i++){x.beginPath();x.arc(R()*w,R()*h,2+R()*8,0,TAU);x.fill();}}));

// ---------------- шейдерные добавки ----------------
const WIND={value:0.35},GUST={value:0};
// ветер для инстансов (трава/цветы): смещение в мировых осях, пересчитанное в локальные оси инстанса
function windMat(mat,amp,key){mat.onBeforeCompile=sh=>{sh.uniforms.uTime=LB.GU.time;sh.uniforms.uWind=WIND;sh.uniforms.uGust=GUST;
 sh.vertexShader='uniform float uTime;uniform float uWind;uniform float uGust;\n'+sh.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
 {vec3 ip=vec3(0.0);mat3 im=mat3(1.0);
  #ifdef USE_INSTANCING
  ip=(instanceMatrix*vec4(0.,0.,0.,1.)).xyz;im=mat3(instanceMatrix);
  #endif
  vec3 wp=(modelMatrix*vec4(ip,1.0)).xyz;float h=max(position.y,0.0);
  float w=uWind*(0.55+0.45*sin(uTime*1.3+wp.x*0.21+wp.z*0.17))+0.12*sin(uTime*3.1+wp.x*1.7+wp.z*1.3)+uGust*sin(uTime*7.0+wp.z*0.9);
  vec3 wv=vec3(w,0.0,w*0.35)*h*h*${amp.toFixed(3)};
  vec3 wl=vec3(dot(im[0],wv),dot(im[1],wv),dot(im[2],wv))/max(1e-4,dot(im[0],im[0]));
  transformed+=wl;transformed.y-=length(wl)*0.35;}`);};
 mat.customProgramCacheKey=()=>'orchWind'+key;return mat;}
// кроны покачиваются (инстансы)
function swayMat(mat,amp,key,clampK){mat.onBeforeCompile=sh=>{sh.uniforms.uTime=LB.GU.time;sh.uniforms.uWind=WIND;if(clampK)sh.fragmentShader=sh.fragmentShader.replace('gl_FragColor = vec4( outgoingLight, diffuseColor.a );','gl_FragColor = vec4( min(outgoingLight,vec3('+clampK.toFixed(2)+')), diffuseColor.a );');
 sh.vertexShader='uniform float uTime;uniform float uWind;\n'+sh.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
 {vec3 ip=vec3(0.0);mat3 im=mat3(1.0);
  #ifdef USE_INSTANCING
  ip=(instanceMatrix*vec4(0.,0.,0.,1.)).xyz;im=mat3(instanceMatrix);
  #endif
  vec3 wp=(modelMatrix*vec4(ip,1.0)).xyz;float k=clamp((wp.y-0.8)*0.35,0.0,1.0);
  vec3 wv=vec3(sin(uTime*1.1+wp.x*0.5+wp.z*0.3),0.0,cos(uTime*0.9+wp.z*0.4))*${amp.toFixed(3)}*k*(0.6+uWind);
  transformed+=vec3(dot(im[0],wv),dot(im[1],wv),dot(im[2],wv))/max(1e-4,dot(im[0],im[0]));}`);};
 mat.customProgramCacheKey=()=>'orchSway'+key;return mat;}
// край мира рассыпается на пиксели; снег на верхних гранях (буря)
function worldMat(mat,o){const u={uTime:LB.GU.time,uR:{value:o.R||170},uEdge:{value:LB.C(o.edge||'#8fe8ff')}};
 mat.onBeforeCompile=sh=>{Object.assign(sh.uniforms,u);
  sh.vertexShader='varying vec3 vWPo;\n'+sh.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\n vWPo=(modelMatrix*vec4(transformed,1.0)).xyz;');
  sh.fragmentShader='uniform float uTime;uniform float uR;uniform vec3 uEdge;varying vec3 vWPo;\nfloat oh(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}\n'+sh.fragmentShader
   .replace('#include <color_fragment>',`#include <color_fragment>
 float rr=length(vWPo.xz-vec2(0.0,-10.0));vec2 cell=floor(vWPo.xz/2.5);float hh=oh(cell);float lim=uR+hh*70.0;
 if(rr>lim)discard;float edgeK=smoothstep(lim-10.0,lim,rr);`)
   .replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
 {vec2 g=abs(fract(vWPo.xz/2.5)-0.5);float line=smoothstep(0.47,0.5,max(g.x,g.y));totalEmissiveRadiance+=uEdge*(line*0.9+0.25)*edgeK*(0.6+0.4*sin(uTime*2.0+hh*6.0));}`);};
 mat.customProgramCacheKey=()=>'orchWorld';return mat;}
// кора: в бурю — снег на верхних сторонах веток
function barkMat(storm){const m=new T.MeshStandardMaterial({map:barkTex(),color:C(storm?'#8a8f96':'#9c8a7a'),roughness:0.92,metalness:0});
 if(storm){m.onBeforeCompile=sh=>{sh.vertexShader='varying vec3 vWN2;\n'+sh.vertexShader.replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\n vWN2=normalize(mat3(modelMatrix)*objectNormal);');
  sh.fragmentShader='varying vec3 vWN2;\n'+sh.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.86,0.9,0.96),smoothstep(0.25,0.6,vWN2.y));');};m.customProgramCacheKey=()=>'orchBarkS';}
 return m;}

// ---------------- деревья ----------------
function cylBetween(p0,p1,r0,r1,seg){const d=p1.clone().sub(p0);const len=d.length();const g=new T.CylinderGeometry(r1,r0,len,seg||7,1,true);g.translate(0,len/2,0);
 const q=new T.Quaternion().setFromUnitVectors(V(0,1,0),d.normalize());g.applyMatrix4(new T.Matrix4().makeRotationFromQuaternion(q));g.translate(p0.x,p0.y,p0.z);return g;}
// одно дерево: ствол, развилка, ветви с веточками; точки для кроны/цветов/яблок
function treeParts(R,x,z,s,lod,out){const RT=rng(((x*73.13+z*91.7)*1000)|0);const y0=worldH(x,z);const base=V(x,y0-0.05,z);const lean=V((R()-0.5)*0.25,1,(R()-0.5)*0.25).normalize();
 const th=(1.05+R()*0.35)*s,r0=(0.1+R()*0.035)*s;const top=base.clone().addScaledVector(lean,th);
 out.bark.push(cylBetween(base,top,r0,r0*0.72,lod?6:8));
 const nb=lod>1?3:4+(R()<0.5?1:0);const tips=[];
 for(let i=0;i<nb;i++){const a=i/nb*TAU+R()*0.8;const el=0.55+R()*0.35;const L=(1.15+R()*0.55)*s;
  const dir=V(Math.cos(a)*Math.cos(el),Math.sin(el)+0.15,Math.sin(a)*Math.cos(el)).normalize();const mid=top.clone().addScaledVector(dir,L*0.55);
  const dir2=dir.clone().add(V((R()-0.5)*0.5,0.25+R()*0.3,(R()-0.5)*0.5)).normalize();const end=mid.clone().addScaledVector(dir2,L*0.5);
  out.bark.push(cylBetween(top,mid,r0*0.62,r0*0.42,lod?5:6),cylBetween(mid,end,r0*0.42,r0*0.18,lod?4:5));tips.push(mid,end);
  if(lod<2){// веточки (видны зимой, весной — под цветами)
   const nt=out.storm?4:2;for(let k=0;k<nt;k++){const from=k%2?end:mid;const td=dir2.clone().add(V((RT()-0.5)*1.4,(RT()-0.2)*0.9,(RT()-0.5)*1.4)).normalize();const tl=(0.35+RT()*0.45)*s;const te=from.clone().addScaledVector(td,tl);out.bark.push(cylBetween(from,te,r0*0.16,r0*0.05,4));tips.push(te);
    if(out.storm&&RT()<0.8){const td2=td.clone().add(V((RT()-0.5),(RT()-0.3),(RT()-0.5))).normalize();out.bark.push(cylBetween(te,te.clone().addScaledVector(td2,tl*0.6),r0*0.05,r0*0.02,3));}}}}
 if(out.storm)return {top,tips};
 // крона: «облака» цветов и листьев вокруг концов ветвей + заполнение
 const nBlob=lod===0?44:lod===1?16:5;const cc=top.clone().add(V(0,0.9*s,0));
 for(let i=0;i<nBlob;i++){const tp=tips[(R()*tips.length)|0];const p=i<nBlob*0.25?cc.clone().add(V((R()-0.5)*1.6*s,(R()-0.2)*0.9*s,(R()-0.5)*1.6*s)):tp.clone().add(V((R()-0.5)*0.7*s,(R()-0.1)*0.55*s,(R()-0.5)*0.7*s));
  const r=(lod===2?0.85:lod===1?0.5+R()*0.25:0.3+R()*0.22)*s;const bl=R();out.blobs.push({p,r,lod,c:bl<0.55?'#ffffff':bl<0.8?'#ffe9f0':bl<0.92?'#e8f5dc':'#b8d89a'});
  if(lod<2){const np=lod===0?9:5;for(let k=0;k<np;k++){const d=V(R()-0.5,R()-0.35,R()-0.5).normalize();out.pts.push(p.clone().addScaledVector(d,r*(0.92+R()*0.2)));out.pc.push(R()<0.75?[1,0.93,0.95]:[0.98,0.82,0.88]);}}}
 // апорт: крупные красные яблоки снизу кроны
 const na=lod===0?14:lod===1?5:0;for(let i=0;i<na;i++){const b=out.blobs[out.blobs.length-1-((R()*Math.min(nBlob,20))|0)];const d=V(R()-0.5,-0.4-R()*0.6,R()-0.5).normalize();const p=b.p.clone().addScaledVector(d,b.r*0.95);if(p.y<y0+0.9)p.y=y0+0.9+R()*0.3;out.apples.push(p);}
 return {top,tips};}

// ---------------- посуда ----------------
function lathe(pts,seg){return new T.LatheGeometry(pts.map(p=>new T.Vector2(p[0],p[1])),seg||28);}
function teaSet(ctx,storm,x0,y0,z0){const s=ctx.scene;const g=new T.Group();g.position.set(x0,y0,z0);s.add(g);
 const por=new T.MeshStandardMaterial({map:kese(storm),color:C('#ffffff'),roughness:0.25,metalness:0});
 // чайник: тулово, крышка, носик, ручка
 const body=new T.Mesh(lathe([[0.001,0],[0.07,0.004],[0.1,0.035],[0.108,0.07],[0.095,0.11],[0.06,0.13],[0.045,0.135]]),por);body.position.set(0.32,0,-0.1);body.castShadow=true;g.add(body);
 const lid=new T.Mesh(lathe([[0.001,0.16],[0.02,0.156],[0.05,0.137],[0.055,0.13]]),por);lid.position.copy(body.position);g.add(lid);
 const knob=new T.Mesh(new T.SphereGeometry(0.014,12,8),por);knob.position.set(0.32,0.165,-0.1);g.add(knob);
 const spout=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3([V(0.405,0.04,-0.1),V(0.45,0.07,-0.1),V(0.48,0.11,-0.1),V(0.5,0.13,-0.1)]),10,0.013,8,false),por);spout.castShadow=true;g.add(spout);
 const handle=new T.Mesh(new T.TorusGeometry(0.045,0.009,8,18,Math.PI*1.1),por);handle.position.set(0.225,0.075,-0.1);handle.rotation.z=Math.PI*0.45;g.add(handle);
 // пиалы
 const cupG=lathe([[0.001,0],[0.03,0.002],[0.05,0.025],[0.06,0.055],[0.058,0.056],[0.047,0.028],[0.028,0.006],[0.001,0.006]],24);
 const teaM=storm?new T.MeshStandardMaterial({map:frostTex(),color:C('#d9b98a'),roughness:0.2,metalness:0}):new T.MeshStandardMaterial({color:C('#9a4e14'),roughness:0.08,metalness:0});
 const cups=[[-0.12,0.16],[0.08,0.3]];for(const [cx,cz] of cups){const c=new T.Mesh(cupG,por);c.position.set(cx,0,cz);c.castShadow=true;g.add(c);
  const tea=new T.Mesh(new T.CircleGeometry(0.052,20),teaM);tea.rotation.x=-Math.PI/2;tea.position.set(cx,storm?0.05:0.042,cz);g.add(tea);
  if(storm){// иней шапкой
   const ice=new T.Mesh(new T.SphereGeometry(0.052,16,6,0,TAU,0,Math.PI*0.35),new T.MeshStandardMaterial({map:frostTex(),color:C('#e6eef8'),roughness:0.25,transparent:true,opacity:0.55,depthWrite:false}));ice.scale.y=0.3;ice.position.set(cx,0.045,cz);g.add(ice);}
  else LB.steam(ctx,x0+cx,y0+0.07,z0+cz,'#ffffff',0.22);}
 if(!storm)LB.steam(ctx,x0+0.5,y0+0.14,z0-0.1,'#ffffff',0.15);
 else{const cap=new T.Mesh(new T.SphereGeometry(0.1,18,8,0,TAU,0,Math.PI*0.45),new T.MeshStandardMaterial({map:frostTex(),color:C('#d3deeb'),roughness:0.75}));cap.scale.y=0.55;cap.position.set(0.32,0.12,-0.1);g.add(cap);}
 // миска с апортом
 const bowl=new T.Mesh(lathe([[0.001,0],[0.07,0.003],[0.12,0.04],[0.15,0.085],[0.143,0.088],[0.112,0.046],[0.065,0.012],[0.001,0.012]],30),new T.MeshStandardMaterial({map:LB.woodTex,color:C('#b07a4a'),roughness:0.5}));
 bowl.position.set(-0.3,0,-0.25);bowl.castShadow=true;g.add(bowl);
 const ap=appleMesh(storm,9);const R=rng(21);const m4=new T.Matrix4();const q=new T.Quaternion();
 for(let i=0;i<9;i++){const a=i/7*TAU+R()*0.4,rr=i<7?0.07:0.02;const p=V(-0.3+Math.cos(a)*rr,0.06+(i<7?0:0.055),-0.25+Math.sin(a)*rr);q.setFromEuler(new T.Euler(R()*0.6,R()*6,R()*0.6));m4.compose(p,q,V(1,0.9,1).multiplyScalar(0.95+R()*0.2));ap.setMatrixAt(i,m4);ap.setColorAt(i,appleColor(R,storm));}
 ap.instanceMatrix.needsUpdate=true;if(ap.instanceColor)ap.instanceColor.needsUpdate=true;g.add(ap);
 // баурсаки на блюдце
 const plate=new T.Mesh(new T.CylinderGeometry(0.1,0.08,0.012,24),por);plate.position.set(0.05,0.006,-0.42);g.add(plate);
 const bm=new T.MeshStandardMaterial({color:C(storm?'#d9d2c4':'#d49a4c'),roughness:0.7});for(let i=0;i<7;i++){const b=new T.Mesh(new T.DodecahedronGeometry(0.022,0),bm);b.position.set(0.05+(R()-0.5)*0.11,0.03+(i>4?0.02:0),-0.42+(R()-0.5)*0.11);b.rotation.set(R(),R(),R());b.scale.set(1,0.8,1);g.add(b);}
 return g;}
function appleColor(R,storm){const k=R();const c=k<0.7?C('#b3141c'):k<0.9?C('#c8321e'):C('#d9832a');if(storm)c.lerp(C('#6b2530'),0.5);return c;}
function appleMesh(storm,n){const g=new T.SphereGeometry(0.042,9,7);const p=g.attributes.position;for(let i=0;i<p.count;i++){const y=p.getY(i);const r=Math.hypot(p.getX(i),p.getZ(i));p.setY(i,y*0.88-0.012*Math.exp(-r*r/0.0003)*Math.sign(y));}g.computeVertexNormals();
 const m=new T.MeshStandardMaterial({color:C('#ffffff'),roughness:storm?0.6:0.32,metalness:0});if(storm)m.map=frostTex();
 const im=new T.InstancedMesh(g,m,n);im.castShadow=true;im.receiveShadow=true;return im;}

// ---------------- трава и цветы (инстансы) ----------------
function tuftGeo(){return cached('tuft',()=>{const R=rng(3);const pos=[],col=[],nor=[],ix=[];const NB=9;
 for(let b=0;b<NB;b++){const a=R()*TAU,off=R()*0.09,h=0.1+R()*0.2,w=0.011+R()*0.008,bend=0.05+R()*0.12;const cx=Math.cos(a)*off,cz=Math.sin(a)*off;const fa=R()*TAU;const fx=Math.cos(fa),fz=Math.sin(fa);const bx=Math.cos(a),bz=Math.sin(a);const base=pos.length/3;
  for(let k=0;k<=2;k++){const t=k/2;const ww=w*(1-t*0.94);const bb=bend*t*t;for(const sd of [-1,1]){pos.push(cx+fx*ww*sd+bx*bb,h*t,cz+fz*ww*sd+bz*bb);nor.push(bx*0.3,1,bz*0.3);const c=[0.16+0.5*t,0.3+0.45*t,0.08+0.12*t];col.push(...c);}}
  for(let k=0;k<2;k++){const i=base+k*2;ix.push(i,i+1,i+2,i+1,i+3,i+2);}}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('normal',new T.Float32BufferAttribute(nor,3));g.setAttribute('color',new T.Float32BufferAttribute(col,3));g.setIndex(ix);g.computeBoundingSphere();return g;});}
function flowerGeo(){return cached('flower',()=>{const pos=[],col=[],nor=[],ix=[];const h=0.26;
 pos.push(-0.004,0,0,0.004,0,0,-0.003,h,0,0.003,h,0);for(let i=0;i<4;i++){nor.push(0,0,1);col.push(0.35,0.55,0.2);}ix.push(0,1,2,1,3,2);
 const c0=pos.length/3;pos.push(0,h+0.004,0);nor.push(0,1,0);col.push(1,0.85,0.3);for(let i=0;i<10;i++){const a=i/10*TAU,r=i%2?0.018:0.034;pos.push(Math.cos(a)*r,h+(i%2?0.002:0.006),Math.sin(a)*r);nor.push(0,1,0);col.push(1,1,1);}
 for(let i=0;i<10;i++)ix.push(c0,c0+1+(i+1)%10,c0+1+i);
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('normal',new T.Float32BufferAttribute(nor,3));g.setAttribute('color',new T.Float32BufferAttribute(col,3));g.setIndex(ix);g.computeBoundingSphere();return g;});}
function meadow(ctx,storm,trees){const s=ctx.scene;const Q=LB.Q;const R=rng(storm?31:13);const m4=new T.Matrix4(),q=new T.Quaternion(),sc=V();
 const nearTree=(x,z)=>trees.some(t=>(t.x-x)*(t.x-x)+(t.z-z)*(t.z-z)<0.12);
 const N=Math.round((storm?2600:5200)*(0.35+0.65*Q.crowd));const gm=windMat(new T.MeshStandardMaterial({vertexColors:true,roughness:0.85,metalness:0,side:T.DoubleSide,color:C(storm?'#b9c2c8':'#ffffff')}),storm?0.9:0.55,storm?'S':'G');
 const grass=new T.InstancedMesh(tuftGeo(),gm,N);grass.receiveShadow=true;grass.frustumCulled=false;const gc=new T.Color();let n=0;
 for(let i=0;i<N*3&&n<N;i++){const x=(R()-0.5)*34,z=-13+R()*30;if(Math.abs(x)<0.9&&z>-1&&z<9.5&&R()<0.8)continue;if(x>-1.5&&x<1.8&&z>-2&&z<0.35)continue;if(nearTree(x,z))continue;
  const y=worldH(x,z);q.setFromAxisAngle(V(0,1,0),R()*TAU);const k=0.9+R()*0.8;m4.compose(V(x,y,z),q,sc.set(k,k*(0.7+R()*0.6),k));grass.setMatrixAt(n,m4);
  if(storm)gc.setRGB(0.8+R()*0.2,0.84+R()*0.16,0.88+R()*0.12);else gc.setHSL(0.24+R()*0.07,0.55+R()*0.25,0.42+R()*0.22);grass.setColorAt(n,gc);n++;}
 grass.count=n;grass.userData.noDepth=true;grass.instanceMatrix.needsUpdate=true;if(grass.instanceColor)grass.instanceColor.needsUpdate=true;s.add(grass);
 if(storm)return;
 const NF=Math.round(1400*(0.35+0.65*Q.crowd));const fm=windMat(new T.MeshStandardMaterial({vertexColors:true,roughness:0.7,metalness:0,side:T.DoubleSide}),0.5,'F');const fl=new T.InstancedMesh(flowerGeo(),fm,NF);fl.frustumCulled=false;
 const FC=['#ffffff','#fff3a0','#ffd23f','#ff5a4e','#f4a6c8','#b9c8ff'];n=0;
 for(let i=0;i<NF*3&&n<NF;i++){const x=(R()-0.5)*34,z=-13+R()*30;if(x>-1.5&&x<1.8&&z>-2&&z<0.35)continue;if(Math.abs(x)<0.7&&z>-1&&z<9.5)continue;const y=worldH(x,z);q.setFromAxisAngle(V(0,1,0),R()*TAU);const k=0.7+R()*0.7;
  m4.compose(V(x,y,z),q,sc.set(k,k,k));fl.setMatrixAt(n,m4);fl.setColorAt(n,C(FC[(R()*FC.length)|0]));n++;}
 fl.count=n;fl.userData.noDepth=true;fl.instanceMatrix.needsUpdate=true;if(fl.instanceColor)fl.instanceColor.needsUpdate=true;s.add(fl);}

// ---------------- сад ----------------
function orchard(ctx,storm){const s=ctx.scene;const R=rng(5);const out={bark:[],blobs:[],pts:[],pc:[],apples:[],storm};const trees=[];const Q=LB.Q;
 const add=(x,z,lod)=>{const RS=rng(((x*31.7+z*57.3)*1000)|0);const t=treeParts(RS,x,z,0.9+RS()*0.25,lod,out);trees.push({x,z,lod});return t;};
 // ряды сада: ~4.2 м по x, 4.6 м по z; тропа к Еве и покрывало свободны
 for(let ix=-10;ix<=10;ix++)for(let iz=-9;iz<=6;iz++){if(ix===0)continue;const bx=Math.sign(ix)*(3.3+(Math.abs(ix)-1)*4.2),bz=3.5+iz*4.6;const d=Math.hypot(bx,bz+2);
  const inWalk=Math.abs(bx)<13&&bz>-9&&bz<13;const lod=inWalk?0:d<34?1:2;if(!inWalk&&R()<(lod===1?0.2:0.45))continue;if(d>95)continue;
  const jx=inWalk?(R()-0.5)*0.5:(R()-0.5)*1.6,jz=inWalk?(R()-0.5)*0.5:(R()-0.5)*1.6;const x=bx===-3.3&&bz===3.5?-3.35:bx+jx,z=bx===-3.3&&bz===3.5?3.5:bz+jz;add(x,z,lod);}
 // редкие дальние деревья по склонам (кроны-«облака» без карточек)
 for(let i=0;i<70;i++){const a=R()*TAU,r=48+R()*110;const x=Math.sin(a)*r,z=Math.cos(a)*r-10;if(z<-150)continue;add(x,z,2);}
 // та самая яблоня у тропы (точка «Яблоня» x=-2.6,z=3.5): добавим низких яблок к тропе
 if(!storm){for(let i=0;i<5;i++)out.apples.push(V(-2.62+(R()-0.5)*0.35,1.3+R()*0.25,3.5+(R()-0.5)*0.5));}
 const bark=new T.Mesh(merge(out.bark),barkMat(storm));bark.castShadow=true;bark.receiveShadow=true;s.add(bark);
 if(!storm){
  // крона: плотное ядро (низкополигональные «облака») + ажурные карточки-соцветия с альфа-срезом
  const m4=new T.Matrix4(),q=new T.Quaternion();
  const core=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),swayMat(new T.MeshStandardMaterial({color:C('#ffffff'),map:blossomTex(),roughness:0.85,metalness:0}),0.05,'K',0.9),out.blobs.length);core.castShadow=true;core.receiveShadow=true;
  out.blobs.forEach((b,i)=>{q.setFromEuler(new T.Euler(R()*3,R()*3,R()*3));const k=b.r*0.72;m4.compose(b.p,q,V(k,k*0.85,k));core.setMatrixAt(i,m4);const c=C(b.c).multiplyScalar(0.6+R()*0.12);core.setColorAt(i,c);});
  core.instanceMatrix.needsUpdate=true;if(core.instanceColor)core.instanceColor.needsUpdate=true;s.add(core);
  const cardT=clusterTex();const cmat=swayMat(new T.MeshStandardMaterial({color:C('#ffffff'),map:cardT,alphaTest:0.5,side:T.DoubleSide,roughness:0.8,metalness:0}),0.05,'Q',0.92);
  const cb=out.blobs.filter(b=>b.lod<2);const nC=cb.reduce((a,b)=>a+(b.lod?1:2),0);const cards=new T.InstancedMesh(cardGeo(),cmat,nC);cards.castShadow=true;cards.receiveShadow=true;cards.userData.noDepth=true;
  cards.customDepthMaterial=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,map:cardT,alphaTest:0.5});
  let ci=0;cb.forEach(b=>{for(let j=0;j<(b.lod?1:2);j++){q.setFromEuler(new T.Euler(R()*6,R()*6,R()*6));const k=b.r*(1.9+R()*0.5);const p=b.p.clone().add(V((R()-0.5)*b.r*0.6,(R()-0.3)*b.r*0.5,(R()-0.5)*b.r*0.6));m4.compose(p,q,V(k,k,k));cards.setMatrixAt(ci,m4);
   const c=C(b.c);c.multiplyScalar(0.82+R()*0.14);cards.setColorAt(ci++,c);}});
  cards.instanceMatrix.needsUpdate=true;if(cards.instanceColor)cards.instanceColor.needsUpdate=true;s.add(cards);
  // лепестки на поверхности крон (пушистость)
  const pg=new T.BufferGeometry();pg.setAttribute('position',new T.Float32BufferAttribute(out.pts.flatMap(p=>[p.x,p.y,p.z]),3));pg.setAttribute('color',new T.Float32BufferAttribute(out.pc.flat(),3));
  const pm=new T.PointsMaterial({size:0.13,map:petalTex(),vertexColors:true,transparent:true,alphaTest:0.35,depthWrite:true,sizeAttenuation:true});const pts=new T.Points(pg,pm);pts.frustumCulled=false;s.add(pts);
  // упавшие яблоки в траве
  for(let i=0;i<60;i++){const t=trees[(R()*trees.length)|0];if(t.lod>1)continue;const a=R()*TAU,r=0.6+R()*1.6;out.apples.push(V(t.x+Math.cos(a)*r,worldH(t.x+Math.cos(a)*r,t.z+Math.sin(a)*r)+0.035,t.z+Math.sin(a)*r));}
  const ap=appleMesh(false,out.apples.length);out.apples.forEach((p,i)=>{q.setFromEuler(new T.Euler(R()*0.5,R()*6,R()*0.5));const k=0.9+R()*0.3;m4.compose(p,q,V(k,k,k));ap.setMatrixAt(i,m4);ap.setColorAt(i,appleColor(R,false));});
  ap.instanceMatrix.needsUpdate=true;if(ap.instanceColor)ap.instanceColor.needsUpdate=true;s.add(ap);}
 return trees;}

// ---------------- лепестки в воздухе, бабочки ----------------
function petalsAir(ctx,n){const pos=new Float32Array(n*3),ph=new Float32Array(n);const R=rng(8);for(let i=0;i<n;i++){pos.set([(R()-0.5)*26,R()*5,-8+R()*20],i*3);ph[i]=R()*TAU;}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(pos,3));const m=new T.PointsMaterial({size:0.07,map:petalTex(),color:C('#fde7ee'),transparent:true,alphaTest:0.3,depthWrite:false});const p=new T.Points(g,m);p.frustumCulled=false;ctx.scene.add(p);
 ctx.ticks.push((t,dt)=>{const a=g.attributes.position.array;for(let i=0;i<n;i++){const k=i*3;a[k]+=dt*(0.35+0.25*Math.sin(t*0.7+ph[i]))*WIND.value*2.2;a[k+1]-=dt*(0.18+0.1*Math.sin(t*1.9+ph[i]*3));a[k+2]+=dt*0.12*Math.cos(t*0.8+ph[i]);
  if(a[k+1]<heightAt(a[k],a[k+2])){a[k]=(Math.random()-0.5)*26-4;a[k+1]=2.5+Math.random()*3;a[k+2]=-8+Math.random()*20;}if(a[k]>13)a[k]-=26;}g.attributes.position.needsUpdate=true;});}
function butterflies(ctx,n){const tex=LB.canvasTex(64,64,(x,w,h)=>{x.fillStyle='#ffb347';x.beginPath();x.ellipse(34,22,26,18,0.4,0,TAU);x.fill();x.fillStyle='#ffd98a';x.beginPath();x.ellipse(30,48,16,12,-0.3,0,TAU);x.fill();x.fillStyle='#2a1a10';x.beginPath();x.arc(46,16,5,0,TAU);x.fill();x.fillRect(0,0,6,64);},true);
 const wg=new T.PlaneGeometry(0.07,0.07);wg.rotateX(-Math.PI/2);wg.translate(0.035,0,0);const R=rng(4);const list=[];
 for(let i=0;i<n;i++){const m=new T.MeshBasicMaterial({map:tex,transparent:true,alphaTest:0.4,side:T.DoubleSide,color:C(['#ffffff','#fff6d0','#cfe3ff','#ffffff'][i%4])});
  const b=new T.Group();const l=new T.Mesh(wg,m),r=new T.Mesh(wg,m);r.scale.x=-1;b.add(l,r);ctx.scene.add(b);list.push({b,l,r,cx:(R()-0.5)*16,cz:-6+R()*16,ph:R()*TAU,sp:0.25+R()*0.25});}
 ctx.ticks.push((t)=>{for(const f of list){const u=t*f.sp+f.ph;const x=f.cx+Math.sin(u)*2.2+Math.sin(u*2.3)*0.6,z=f.cz+Math.cos(u*0.8)*1.8,y=heightAt(x,z)+0.5+0.35*Math.sin(u*1.7)+0.25*Math.sin(u*5.1);
  const dx=Math.cos(u)*2.2+Math.cos(u*2.3)*1.38,dz=-Math.sin(u*0.8)*1.44;f.b.position.set(x,y,z);f.b.rotation.y=Math.atan2(dx,dz);const fl=0.25+Math.sin(t*22+f.ph)*0.95;f.l.rotation.z=fl;f.r.rotation.z=-fl;}});}

// ---------------- «цифровые» намёки: развёртка у горизонта, пиксельные кубы на краю мира ----------------
function scanBand(ctx,col,op){const g=new T.CylinderGeometry(900,900,420,64,1,true);g.translate(0,120,0);
 const m=new T.ShaderMaterial({uniforms:{uTime:LB.GU.time,uC:{value:C(col)},uOp:{value:op}},transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.BackSide,fog:false,
  vertexShader:'varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  fragmentShader:'uniform float uTime;uniform vec3 uC;uniform float uOp;varying vec3 vP;void main(){float y=vP.y;float band=exp(-pow((y-35.0)/55.0,2.0));float ln=smoothstep(0.3,0.5,abs(fract(y*0.18-uTime*0.05)-0.5));float sweep=smoothstep(0.985,1.0,fract(uTime*0.035-y*0.002));gl_FragColor=vec4(uC*(ln*0.55+sweep*2.5)*band*uOp,1.0);}'});
 const mesh=new T.Mesh(g,m);mesh.renderOrder=-5;mesh.userData.noDepth=true;mesh.frustumCulled=false;ctx.scene.add(mesh);return mesh;}
function voxels(ctx,n,col,R0){const g=new T.BoxGeometry(1,1,1);const m=new T.MeshBasicMaterial({color:C(col).multiplyScalar(1.3),transparent:true,opacity:0.5,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false,fog:true});
 const im=new T.InstancedMesh(g,m,n);im.frustumCulled=false;im.userData.noDepth=true;ctx.scene.add(im);const R=rng(9);const d=[];for(let i=0;i<n;i++)d.push({a:R()*TAU,r:R0+R()*70,y:R()*30,s:0.6+R()*2.4,v:0.4+R()*1.2,ph:R()*TAU});
 const m4=new T.Matrix4(),q=new T.Quaternion(),p=V();ctx.ticks.push((t,dt)=>{d.forEach((o,i)=>{o.y+=dt*o.v;if(o.y>45)o.y=-5;p.set(Math.cos(o.a)*o.r,worldH(Math.cos(o.a)*o.r,Math.sin(o.a)*o.r-20)+o.y,Math.sin(o.a)*o.r-20);q.setFromEuler(new T.Euler(t*0.3+o.ph,t*0.2,0));const k=o.s*(1-ss(30,45,o.y));m4.compose(p,q,V(k,k,k));im.setMatrixAt(i,m4);});im.instanceMatrix.needsUpdate=true;});}

// ---------------- туман в долине ----------------
function valleyFog(ctx,col,op){const tex=cached('fogSheet',()=>LB.canvasTex(256,256,(x,w,h)=>{const R=rng(12);x.clearRect(0,0,w,h);for(let i=0;i<90;i++){const px=R()*w,py=R()*h,r=18+R()*46;const g=x.createRadialGradient(px,py,0,px,py,r);g.addColorStop(0,'rgba(255,255,255,.42)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(px-r,py-r,r*2,r*2);}
  const e=x.createRadialGradient(w/2,h/2,w*0.2,w/2,h/2,w*0.5);e.addColorStop(0,'rgba(0,0,0,0)');e.addColorStop(1,'rgba(0,0,0,1)');x.globalCompositeOperation='destination-out';x.fillStyle=e;x.fillRect(0,0,w,h);},false));
 // туман лежит пластами на дне долины (+z) — сверху видно, как из него торчат холмы и деревья
 const m=new T.MeshBasicMaterial({map:tex,color:C(col),transparent:true,opacity:op,depthWrite:false});
 for(let i=0;i<5;i++){const z=70+i*42,x=(i%2?-50:40);const p=new T.Mesh(new T.PlaneGeometry(420,260),m);p.rotation.x=-Math.PI/2;p.rotation.z=i*0.7;p.position.set(x,worldH(x,z)+3+i*0.8,z);p.userData.noDepth=true;p.renderOrder=1;ctx.scene.add(p);}
 // дымка у подножия гор
 const hz=cached('hazeBand',()=>LB.canvasTex(256,128,(x,w,h)=>{const g=x.createLinearGradient(0,0,0,h);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(0.6,'rgba(255,255,255,.7)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,w,h);},false));
 const hm=new T.MeshBasicMaterial({map:hz,color:C(col),transparent:true,opacity:op*0.6,depthWrite:false,fog:false});
 for(let i=0;i<3;i++){const p=new T.Mesh(new T.PlaneGeometry(1400,70),hm);p.position.set(0,-30+i*12,-380-i*140);p.userData.noDepth=true;ctx.scene.add(p);}}

// ---------------- метель (своя: lib.snow сейчас ссылается на неопределённый `at`) ----------------
function blizzard(ctx,n,box){const Q=LB.Q;n=Math.round(n*(0.45+0.55*Q.crowd));const pos=new Float32Array(n*3),sp=new Float32Array(n);const R=rng(6);for(let i=0;i<n;i++){pos.set([(R()-0.5)*box,R()*box*0.5,(R()-0.5)*box],i*3);sp[i]=0.6+R()*0.8;}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(pos,3));
 const m=new T.ShaderMaterial({uniforms:{uMap:{value:LB.glowTex},uC:{value:C('#f4f8ff')},uS:{value:0.055*(window.innerHeight||720)*0.9}},transparent:true,depthWrite:false,fog:false,
  vertexShader:'uniform float uS;varying float vA;void main(){vec4 mv=modelViewMatrix*vec4(position,1.0);float d=-mv.z;gl_PointSize=clamp(uS/max(d,0.01),1.0,7.0);vA=smoothstep(0.35,1.4,d)*(1.0-smoothstep(14.0,20.0,d));gl_Position=projectionMatrix*mv;}',
  fragmentShader:'uniform sampler2D uMap;uniform vec3 uC;varying float vA;void main(){vec4 t=texture2D(uMap,gl_PointCoord);gl_FragColor=vec4(uC,t.a*vA*0.95);}'});
 const p=new T.Points(g,m);p.frustumCulled=false;p.userData.noDepth=true;ctx.scene.add(p);
 // полосы порывов
 const ns=Math.round(n*0.18);const lp=new Float32Array(ns*6);for(let i=0;i<ns;i++){const x=(R()-0.5)*box,y=R()*box*0.4,z=(R()-0.5)*box;lp.set([x,y,z,x-0.5,y+0.06,z-0.1],i*6);}
 const lg=new T.BufferGeometry();lg.setAttribute('position',new T.BufferAttribute(lp,3));const lm=new T.LineBasicMaterial({color:C('#e6eef8'),transparent:true,opacity:0.28,depthWrite:false});const ln=new T.LineSegments(lg,lm);ln.frustumCulled=false;ctx.scene.add(ln);
 const h=box/2;ctx.ticks.push((t,dt,cam)=>{const a=g.attributes.position.array;const W=7.5+3*Math.sin(t*0.6)+GUST.value*6;
  for(let i=0;i<n;i++){const k=i*3;a[k]+=dt*W*sp[i];a[k+1]-=dt*(1.6+sp[i]+Math.sin(t*3+i)*0.8);a[k+2]+=dt*Math.sin(t*1.3+i*0.7)*1.4;if(a[k]>h)a[k]-=box;if(a[k+1]<0)a[k+1]+=box*0.5;if(a[k+2]>h)a[k+2]-=box;if(a[k+2]<-h)a[k+2]+=box;}
  g.attributes.position.needsUpdate=true;p.position.set(cam.position.x,cam.position.y-box*0.2,cam.position.z);
  const b=lg.attributes.position.array;for(let i=0;i<ns;i++){const k=i*6;const dx=dt*W*2.2;b[k]+=dx;b[k+3]+=dx;b[k+1]-=dt*1.2;b[k+4]-=dt*1.2;if(b[k]>h){b[k]-=box;b[k+3]-=box;}if(b[k+1]<0){b[k+1]+=box*0.4;b[k+4]+=box*0.4;}}lg.attributes.position.needsUpdate=true;ln.position.copy(p.position);});}
function gusts(ctx,n){const R=rng(2);const list=[];for(let i=0;i<n;i++){const s=new T.Sprite(new T.SpriteMaterial({map:LB.smokeTex,color:C('#e9eff7'),transparent:true,opacity:0,depthWrite:false}));s.userData.t=R();s.userData.z=-6+R()*14;s.userData.y=0.2+R()*1.6;ctx.scene.add(s);list.push(s);}
 ctx.ticks.push((t,dt)=>{for(const s of list){s.userData.t+=dt*0.18;if(s.userData.t>1){s.userData.t-=1;s.userData.z=-6+Math.random()*14;s.userData.y=0.2+Math.random()*1.6;}const k=s.userData.t;s.position.set(-14+k*28,s.userData.y+heightAt(-14+k*28,s.userData.z),s.userData.z);s.scale.setScalar(3+k*4);s.material.opacity=Math.sin(k*Math.PI)*0.13;}});}

// ---------------- Ева: голограмма, читаемая на ярком фоне (обычное смешивание + свечение по контуру + развёртка) ----------------
function evaHolo(g,storm){const m=new T.MeshStandardMaterial({color:C(storm?'#d6e6ff':'#efe6ff'),emissive:C(storm?'#4f7fe0':'#8a6ae6'),emissiveIntensity:0.55,roughness:0.3,metalness:0,transparent:true,opacity:0.8,skinning:true,depthWrite:true});
 m.onBeforeCompile=sh=>{sh.uniforms.uTime=LB.GU.time;sh.uniforms.uRim={value:C(storm?'#bcd8ff':'#e2d4ff')};
  sh.fragmentShader='uniform float uTime;uniform vec3 uRim;\n'+sh.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
 {float fr=pow(1.0-clamp(abs(dot(normalize(vViewPosition),normal)),0.0,1.0),2.0);float sl=step(0.45,fract(gl_FragCoord.y*0.22-uTime*1.4));float fl=0.94+0.06*sin(uTime*23.0)*sin(uTime*7.0);
  totalEmissiveRadiance+=uRim*(fr*1.7+0.12)*fl;diffuseColor.a*=(0.42+0.5*fr)*(0.78+0.22*sl)*fl;}`)
   .replace('gl_FragColor = vec4( outgoingLight, diffuseColor.a );','gl_FragColor = vec4( min(outgoingLight,vec3(1.6)), diffuseColor.a );');};
 m.customProgramCacheKey=()=>'orchEva'+(storm?'S':'');
 g.traverse(o=>{if(o.isMesh){o.material=m;o.castShadow=false;o.receiveShadow=false;o.renderOrder=4;}});return m;}
// ---------------- мини-карта ----------------
function mapImage(trees){const minX=-14,minZ=-10,W=28,H=24,sc=9;const cv=document.createElement('canvas');cv.width=W*sc;cv.height=H*sc;const x=cv.getContext('2d');
 x.fillStyle='#35532c';x.fillRect(0,0,cv.width,cv.height);x.fillStyle='#6d7a4c';x.fillRect((-0.9-minX)*sc,(-1-minZ)*sc,1.8*sc,10.5*sc);
 x.fillStyle='#8c1f27';x.fillRect((-1.1-minX)*sc,(-1.6-minZ)*sc,2.3*sc,1.7*sc);x.fillStyle='#e9dcff';x.beginPath();x.arc((0-minX)*sc,(-1.45-minZ)*sc,4,0,TAU);x.fill();
 x.fillStyle='#d9a6b8';for(const t of trees){if(t.x<minX||t.x>minX+W||t.z<minZ||t.z>minZ+H)continue;x.beginPath();x.arc((t.x-minX)*sc,(t.z-minZ)*sc,sc*1.1,0,TAU);x.fill();}
 x.fillStyle='#3a2a20';for(const t of trees){if(t.x<minX||t.x>minX+W||t.z<minZ||t.z>minZ+H)continue;x.beginPath();x.arc((t.x-minX)*sc,(t.z-minZ)*sc,2.5,0,TAU);x.fill();}
 return {canvas:cv,scale:sc,minX,minZ};}

// ---------------- сцена ----------------
function build(storm){
 const E=storm?'dawn':'day';
 const cam=storm?{a:[2.55,1.48,0.95],b:[2.35,1.5,1.1],look:[0.05,1.18,-0.45],lookB:[0.1,1.2,-0.5],dur:46,fov:38}
                :{a:[1.05,1.42,2.75],b:[0.8,1.46,2.9],look:[0.6,1.02,-1.2],lookB:[0.55,1.05,-1.25],dur:50,fov:38};
 const ctx=LB.newCtx({env:E,fog:storm?['#8e9aab',0.034]:['#d6e6f4',0.00011],
  sky:storm?{top:'#3f4955',hor:'#8a95a3',cloud:1,cloudC:'#737e8c',sunDir:[0.3,0.5,-0.8],sunI:0,glow:'#b9c8dc',glowA:0.18}
           :{top:'#2f73d0',hor:'#bfdcf5',cloud:0.3,cloudC:'#ffffff',sunDir:[0.55,0.62,0.55],sunC:'#fff2dc',sunI:0.9,glow:'#ffffff',glowA:0.12},
  cam,focus:storm?2.9:3.9,aperture:0.00032,exposure:storm?0.94:0.98,envI:storm?0.45:0.42});
 const s=ctx.scene;ctx.bloomK=storm?0.6:0.35;ctx.aoK=0.5;
 // свет
 if(storm){LB.hemi(s,'#93aad0','#2f3744',0.62);LB.keyL(ctx,{c:'#bcd0ff',i:0.8,p:[-18,26,12],t:[0,0,-1],r:12,far:120});}
 else{LB.hemi(s,'#bcd8ff','#58703a',0.38);LB.keyL(ctx,{c:'#fff0d8',i:1.35,p:[22,30,20],t:[0,0,-1],r:15,far:140});const fill=new T.DirectionalLight(C('#a8c8ff'),0.25);fill.position.set(-20,12,-10);s.add(fill);}
 // горы: снежный Заилийский Алатау и зелёные предгорья
 const rg1=LB.range({z:-2100,y:-40,h:2500,w:15000,d:3000,seed:2,snowLine:storm?0.12:0.24,rock:storm?'#6a7280':'#4a5568',rock2:storm?'#7a8290':'#5b6678',snow:'#f6f9fc',forest:'#2c4a33'});rg1.userData.noDepth=true;s.add(rg1);
 const rg2=LB.range({z:-1100,y:-30,h:620,w:6000,d:1200,seed:9,snowLine:storm?0.5:0.97,rock:'#3f5a3a',rock2:'#4d6a44',forest:'#2d4a2a',snow:'#eef3f8'});rg2.userData.noDepth=true;s.add(rg2);
 // земля мира
 const gr=LB.ground({w:620,d:620,seg:200,amp:0,scale:50,seed:4,color:storm?'#aebbca':'#4f7f2e',color2:storm?'#d6dfea':'#79a843',fn:(x,z)=>worldH(x,z)});
 worldMat(gr.material,{R:215,edge:storm?'#cfe6ff':'#8fe8ff'});gr.receiveShadow=true;s.add(gr);
 // тропа к Еве (притоптанная трава)
 const path=new T.Mesh(new T.PlaneGeometry(1.6,9.2,2,18),new T.MeshStandardMaterial({color:C(storm?'#d8e0e8':'#8a8a55'),roughness:1,transparent:true,opacity:storm?0.5:0.55,depthWrite:false,map:LB.canvasTex(64,256,(x,w,h)=>{const g=x.createLinearGradient(0,0,w,0);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(0.5,'rgba(255,255,255,1)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,w,h);},false)}));
 path.rotation.x=-Math.PI/2;path.position.set(0,0.008,4.95);s.add(path);// кончается до покрывала (иначе z-fighting)
 const trees=orchard(ctx,storm);meadow(ctx,storm,trees);
 // покрывало + чай
 const bg=new T.PlaneGeometry(2.3,1.7,16,12);const bp=bg.attributes.position;const BR=rng(3);for(let i=0;i<bp.count;i++){const x=bp.getX(i),y=bp.getY(i);const e=Math.max(Math.abs(x)/1.15,Math.abs(y)/0.85);bp.setZ(i,0.006+0.008*Math.sin(x*7+BR())*Math.sin(y*6)+0.02*ss(0.86,1,e)*Math.abs(Math.sin(x*11+y*7)));}bg.computeVertexNormals();
 const blanket=new T.Mesh(bg,new T.MeshStandardMaterial({map:blanketTex(storm),roughness:0.95,metalness:0}));blanket.rotation.x=-Math.PI/2;blanket.position.set(0.1,0.018,-0.8);blanket.receiveShadow=true;s.add(blanket);
 teaSet(ctx,storm,0.12,0.02,-0.72);
 // Ева
 const ana=storm?LB.makeChar(ctx,'ana',{x:0,z:-1.45,ry:0,anim:'sad_pose'}):LB.makeChar(ctx,'ana',{x:0,z:-1.45,ry:0,pose:'kneel'});if(ana&&(LB.A.xbot||LB.A.soldier))evaHolo(ana,storm);
 const ag=LB.glow(storm?'#bcd6ff':'#d8c8ff',storm?2.0:1.8,storm?0.24:0.14);ag.position.set(0,storm?1.1:0.7,-1.45);s.add(ag);LB.pointL(ctx,storm?'#9fc4ff':'#c9b6ff',storm?1.1:0.55,4,0,1.2,-1.1,0);
 // Никита
 if(storm)LB.makeChar(ctx,'erl',{x:0,z:0.55,ry:Math.PI});else LB.makeChar(ctx,'erl',{x:0,z:7.5,ry:Math.PI});
 // атмосфера
 if(storm){WIND.value=1.6;GUST.value=0.35;blizzard(ctx,4200,34);gusts(ctx,12);ctx.ticks.push(t=>{GUST.value=0.25+0.25*Math.max(0,Math.sin(t*0.9))*Math.sin(t*2.3);WIND.value=1.4+0.4*Math.sin(t*0.5);});}
 else{WIND.value=0.35;GUST.value=0;petalsAir(ctx,Math.round(420*(0.4+0.6*LB.Q.crowd)));butterflies(ctx,9);LB.dust(ctx,220,0,1.3,1.5,14,2.6,18,'#fff6d8');ctx.ticks.push(t=>{WIND.value=0.32+0.12*Math.sin(t*0.37);});}
 valleyFog(ctx,storm?'#c5cfdb':'#eef5fb',storm?0.55:0.5);
 scanBand(ctx,storm?'#d8e8ff':'#8fe8ff',storm?0.12:0.2);voxels(ctx,storm?40:60,storm?'#dfefff':'#8fe8ff',205);
 // прогулка
 const col=[];for(const t of trees)if(Math.abs(t.x)<14&&t.z>-10&&t.z<14)col.push({t:'c',x:t.x,z:t.z,r:0.28});
 col.push({t:'b',x:0.1,z:-0.8,w:2.2,d:1.55,ry:0});
 Object.assign(ctx,{colliders:col,walkArea:{minX:-12,maxX:12,minZ:-8,maxZ:12},heightAt,floorY:0,camBox:{minX:-14,maxX:14,minY:0.35,maxY:7,minZ:-10,maxZ:14},
  points:{after_eva:storm?[0,0.55,Math.PI]:[1.55,-0.95,Math.atan2(-1.55,-0.5)],start:[0,7.5,Math.PI]},mapImage:mapImage(trees),groundY:0});
 Object.assign(ctx.anchors,{eva:V(0,1.0,-1.45),tree:V(-2.6,1.4,3.5),tea:V(0.45,0.2,-0.8)});
 return LB.finalize(ctx);}
ART.addScene('orchard',()=>build(false));
ART.addScene('orchard_storm',()=>build(true));
})();
