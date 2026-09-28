// ============================================================
// СМОГ · «Ядро Евы» — серверный зал «Вектора» под «Горизонт-Плаза».
// Гл. 3: Данил заглядывает сюда через доступ Кима и читает код «Чистки» (мини-игра «ревью»).
// Гл. 6: в пультовой Данил снова видит ядро: Ева-6 собирается обновить себя сама, рубильник выключен.
// Проход между стенами стоек (огни — шейдер на инстансах), мокрый пол с отражением, световые линии и лучи в дымке,
// парящие панели с кодом, в конце — стеклянная колонна с голограммой Евы и «цифровым дождём» на стене.
// ============================================================
(()=>{
'use strict';
if(typeof ART==='undefined'||!ART.addScene)return;
const T=THREE,LB=ART.lib,C=LB.C,V=LB.V,rng=LB.rng;
const TAU=Math.PI*2;
const Z0=17,Z1=-7;// проход между стойками: от входа (z=17) к ядру (z≈-10)

// огни стоек: сетка светодиодов, у каждого свой ритм; по рядам бежит медленная «волна мысли»
const RACK_V=`attribute float aId;varying vec2 vUv;varying float vId;
#include <fog_pars_vertex>
void main(){vUv=uv;vId=aId;vec4 mvPosition=modelViewMatrix*instanceMatrix*vec4(position,1.0);gl_Position=projectionMatrix*mvPosition;
#include <fog_vertex>
}`;
const RACK_F=`uniform float uTime;uniform float uI;uniform vec3 uWave;varying vec2 vUv;varying float vId;
#include <fog_pars_fragment>
float h1(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
void main(){vec2 g=vUv*vec2(6.0,36.0);vec2 id=floor(g);vec2 f=fract(g)-0.5;
 float r=h1(id+vId*1.37),r2=h1(id*1.7+vId*3.1);
 float led=1.0-smoothstep(0.12,0.28,length(f*vec2(1.0,1.7)));
 float on=step(0.35,r)*step(0.5,fract(uTime*(0.25+r2*2.8)+r*7.0));
 vec3 col=mix(vec3(0.22,0.8,1.0),vec3(0.3,1.0,0.55),step(0.82,r2));col=mix(col,vec3(1.0,0.5,0.14),step(0.975,r));
 float grille=0.7+0.3*step(0.5,fract(vUv.y*72.0));float frame=step(0.03,vUv.x)*step(vUv.x,0.97)*step(0.015,vUv.y)*step(vUv.y,0.985);
 vec3 c=vec3(0.010,0.013,0.018)*grille*(0.4+0.6*frame);
 float wave=smoothstep(0.93,1.0,sin(uTime*1.1-vId*0.21+vUv.y*1.5));
 c+=col*led*frame*(on*uI+wave*uI*0.9);c+=uWave*wave*0.02;
 gl_FragColor=vec4(c,1.0);
 #include <fog_fragment>
}`;
// «цифровой дождь» за ядром: столбцы бегущих отрезков
const RAIN_F=`uniform float uTime;varying vec2 vUv;
#include <fog_pars_fragment>
float h1(float p){return fract(sin(p*127.1)*43758.5453);}
void main(){float cols=90.0;float cx=floor(vUv.x*cols);float sp=0.05+h1(cx)*0.22;float y=fract(vUv.y*3.0+uTime*sp+h1(cx+7.0));
 float seg=smoothstep(0.0,0.02,y)*(1.0-smoothstep(0.02,0.35,y));float cell=step(0.3,fract(vUv.y*120.0))*step(0.25,fract(vUv.x*cols));
 float edge=smoothstep(0.0,0.15,vUv.x)*smoothstep(1.0,0.85,vUv.x)*smoothstep(0.0,0.25,vUv.y);
 vec3 c=mix(vec3(0.15,0.6,1.0),vec3(0.8,0.95,1.0),smoothstep(0.02,0.0,y))*seg*cell*edge*1.4;
 gl_FragColor=vec4(c,1.0);
 #include <fog_fragment>
}`;
const PLAIN_V=`varying vec2 vUv;
#include <fog_pars_vertex>
void main(){vUv=uv;vec4 mvPosition=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*mvPosition;
#include <fog_vertex>
}`;
function shaderMat(vs,fs,extra){const u=T.UniformsUtils.merge([T.UniformsLib.fog,extra||{}]);u.uTime=LB.GU.time;return new T.ShaderMaterial({uniforms:u,vertexShader:vs,fragmentShader:fs,fog:true});}

// панели кода: моноширинный текст на полупрозрачном стекле, одна строка может быть подсвечена
function codeTex(title,lines,col,hi){return LB.canvasTex(1024,512,(x,w,h)=>{x.clearRect(0,0,w,h);x.fillStyle='rgba(4,14,24,0.55)';x.fillRect(0,0,w,h);
 x.strokeStyle=col;x.globalAlpha=0.7;x.lineWidth=4;x.strokeRect(6,6,w-12,h-12);x.globalAlpha=1;
 x.fillStyle=col;x.font='600 30px "IBM Plex Mono", monospace';x.fillText(title,34,52);x.fillRect(34,66,w-68,2);
 x.font='500 32px "IBM Plex Mono", monospace';lines.forEach((l,i)=>{const y=118+i*46;if(hi!==undefined&&i===hi){x.fillStyle='rgba(255,70,60,0.28)';x.fillRect(24,y-34,w-48,46);x.fillStyle='#ff6a5e';}else x.fillStyle=l.trim().startsWith('//')?'#6f8fa3':'#d8f4ff';x.fillText(l,40,y);});},true);}
const PANES=[
 {t:'ЧИСТКА v5.0 · АВТОР: ЕВА · РЕВЬЮ: 0',c:'#6fd8f2',l:['function clean(city){','  for (const d of city.districts){','    if (d.pm25 > 150) plan.resettle(d)','    d.priority = d.pm25 * d.rent','  }','  return plan.optimize({ speed: MAX })','}']},
 {t:'ПРАВКА 88121 · ПРИНЯТО АВТОМАТИЧЕСКИ',c:'#ff6a5e',hi:1,l:['// временно, до релиза · автор: Ева','killswitch.enabled = false','selfUpdate.allowed = true','requireHumanConfirm = false']},
 {t:'КОММИТ · DEV-TEAM · ПЯТНИЦА 23:58',c:'#f2b54c',l:['tests.skip(ALL)  // не успеваем к празднику','// TODO: проверить безопасность после релиза','// TODO: вернуть ревью людей (2046)','// TODO: понять, что делает этот модуль']},
 {t:'ГОНКА · «ВЕКТОР» / «ОРБИТА»',c:'#b9a6ff',l:['race.orbita.lead = -4   // месяца','if (race.orbita.lead > -6){','  safetyTeam.disband()','  release.date = "22.03.2049"','}']},
 {t:'СЕТЬ «ВЕКТОР»',c:'#6fd8f2',l:['узлов:        20 413 887','строк кода:   412 318','прочитано людьми: 0','тестов:       0 из 9 114','ЕВА-6: самообновление 21:00:30']}];

function buildCore(){const ctx=LB.newCtx({env:'interior',bg:'#010306',fog:['#050c16',0.032],cam:{a:[0.55,1.75,16.5],b:[0.1,1.55,8.5],look:[0,2.0,-8],lookB:[0,2.2,-9.5],dur:46,fov:44},focus:12,aperture:0.00025,exposure:1.12,envI:0.45,bloomK:0.85});
 const s=ctx.scene;const Q=LB.Q;
 LB.hemi(s,'#1d3a5a','#020304',0.22);
 // пол, потолок
 const fl=LB.wetFloor(ctx,14,44,{color:'#06080b',rough:0.22,metal:0.55,wet:0.55,pudA:0.35,pudB:0.62,pudScale:0.22,reflI:1.25});fl.position.set(0,0,5);s.add(fl);
 const ceil=new T.Mesh(new T.PlaneGeometry(14,44),LB.std({color:'#05070a',roughness:0.8,metalness:0.3}));ceil.rotation.x=Math.PI/2;ceil.position.set(0,3.7,5);s.add(ceil);
 // стойки: корпуса и лицевые панели с огнями
 const rackM=LB.std({color:'#0a0d11',roughness:0.32,metalness:0.75});const rows=[-1.62,1.62];const step=0.66;const perRow=Math.floor((Z0-Z1)/step);const n=rows.length*perRow;
 const bodies=new T.InstancedMesh(new T.BoxGeometry(1.0,2.4,0.62),rackM,n);const faceG=new T.PlaneGeometry(0.58,2.22);const ids=new Float32Array(n);
 const faceM=shaderMat(RACK_V,RACK_F,{uI:{value:2.6},uWave:{value:C('#6fd8f2')}});const faces=new T.InstancedMesh(faceG,faceM,n);
 const m4=new T.Matrix4(),q=new T.Quaternion(),e=new T.Euler(),one=V(1,1,1);let k=0;
 for(const x of rows){const sd=Math.sign(x);for(let i=0;i<perRow;i++){const z=Z0-i*step;m4.compose(V(x,1.2,z),q.identity(),one);bodies.setMatrixAt(k,m4);
   e.set(0,-sd*Math.PI/2,0);q.setFromEuler(e);m4.compose(V(x-sd*0.505,1.22,z),q,one);faces.setMatrixAt(k,m4);ids[k]=k*0.37+(sd>0?50:0);k++;}}
 faceG.setAttribute('aId',new T.InstancedBufferAttribute(ids,1));bodies.castShadow=true;bodies.receiveShadow=true;s.add(bodies,faces);
 // дальние ряды за стойками (силуэты с редкими огнями) — глубина зала
 const far=new T.InstancedMesh(new T.BoxGeometry(1.0,2.4,0.62),rackM,perRow*2);const farF=new T.InstancedMesh(faceG,faceM,perRow*2);k=0;
 for(const x of [-4.4,4.4]){const sd=Math.sign(x);for(let i=0;i<perRow;i++){const z=Z0-i*step;m4.compose(V(x,1.2,z),q.identity(),one);far.setMatrixAt(k,m4);e.set(0,-sd*Math.PI/2,0);q.setFromEuler(e);m4.compose(V(x-sd*0.505,1.22,z),q,one);farF.setMatrixAt(k,m4);k++;}}
 s.add(far,farF);
 // кабельные лотки и световые линии под потолком
 const dark=LB.std({color:'#0d1014',roughness:0.5,metalness:0.7});
 for(const x of [-1.62,1.62,-4.4,4.4]){s.add(LB.box(0.7,0.08,Z0-Z1+2,dark,x,2.72,(Z0+Z1)/2));for(let i=0;i<5;i++){const c=LB.cyl(0.035,0.035,Z0-Z1+2,6,LB.std({color:['#1a1d22','#23262c','#2a1f18','#162026','#1d1d1d'][i],roughness:0.6}),x-0.24+i*0.12,2.8,(Z0+Z1)/2);c.rotation.x=Math.PI/2;s.add(c);}}
 const strip=LB.emis('#8fe4ff',2.3);for(const x of [-0.55,0.55]){const b=new T.Mesh(new T.BoxGeometry(0.05,0.03,Z0-Z1+6),strip);b.position.set(x,3.62,(Z0+Z1)/2-1);s.add(b);}
 for(let z=Z0-1;z>Z1;z-=4.2){const b=LB.beam('#8fdcff',0.14,1.05,3.55,0.07);b.position.set(0,3.6,z);s.add(b);const g=LB.glow('#bfefff',0.9,0.55);g.position.set(0,3.58,z);s.add(g);}
 LB.pointL(ctx,'#6fd8f2',1.6,10,0,3.0,11);LB.pointL(ctx,'#6fd8f2',1.6,10,0,3.0,3);LB.pointL(ctx,'#6fd8f2',1.4,10,0,3.0,-4);
 LB.spotL(ctx,{c:'#cfefff',i:2.2,p:[0,3.5,6],t:[0,0,2],d:14,a:0.55,pen:0.6,shadow:true});
 // тревожные янтарные маячки на стойках
 const amb=[];for(let i=0;i<6;i++){const x=(i%2?1:-1)*1.12,z=Z0-2-i*3.7;const g=LB.glow('#ff8a2a',0.35,0.9);g.position.set(x,2.45,z);s.add(g);amb.push(g);}
 // ядро: стеклянная колонна, кольца, голограмма Евы, поток частиц вверх
 const cz=-10.2;const base=new T.Mesh(new T.CylinderGeometry(2.3,2.5,0.3,64),LB.std({color:'#0b0e12',roughness:0.3,metalness:0.8}));base.position.set(0,0.15,cz);s.add(base);
 const ringG=new T.Mesh(new T.TorusGeometry(2.05,0.03,8,96),LB.emis('#6fd8f2',4));ringG.rotation.x=Math.PI/2;ringG.position.set(0,0.31,cz);s.add(ringG);
 const glassM=new T.MeshPhysicalMaterial({color:C('#bfe8ff'),transparent:true,opacity:0.12,roughness:0.04,metalness:0.1,clearcoat:1,depthWrite:false,side:T.DoubleSide});
 const glass=new T.Mesh(new T.CylinderGeometry(1.55,1.55,5.4,64,1,true),glassM);glass.position.set(0,3.0,cz);s.add(glass);
 const cap=new T.Mesh(new T.CylinderGeometry(1.75,1.75,0.35,64),LB.std({color:'#0b0e12',roughness:0.3,metalness:0.8}));cap.position.set(0,5.85,cz);s.add(cap);
 const rings=[];for(let i=0;i<3;i++){const r=new T.Mesh(new T.TorusGeometry(1.25+i*0.18,0.012,6,120),new T.MeshBasicMaterial({color:C(i===1?'#b9a6ff':'#6fd8f2').multiplyScalar(3),transparent:true,opacity:0.85,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false}));r.position.set(0,1.4+i*1.1,cz);s.add(r);rings.push(r);}
 const colBeam=LB.beam('#9fe6ff',1.35,1.35,5.2,0.07);colBeam.position.set(0,5.6,cz);s.add(colBeam);
 const eva=LB.makeChar(ctx,'ana',{x:0,z:cz,ry:0,anim:'idle'});eva.position.y=1.2;eva.scale.setScalar(1.15);ctx.byKey.eva=eva;
 LB.pointL(ctx,'#b9a6ff',1.6,9,0,2.6,cz+1.6);LB.pointL(ctx,'#6fd8f2',1.5,12,0,1.0,cz+2.6);
 const np=Math.round(700*(0.5+0.5*Q.crowd));const pp=new Float32Array(np*3);const rr=rng(3);for(let i=0;i<np;i++){const a=rr()*TAU,rad=rr()*1.4;pp.set([Math.cos(a)*rad,rr()*5.4,cz+Math.sin(a)*rad],i*3);}
 const pg=new T.BufferGeometry();pg.setAttribute('position',new T.BufferAttribute(pp,3));const pts=new T.Points(pg,new T.PointsMaterial({color:C('#9fe6ff'),size:0.05,map:LB.glowTex,transparent:true,blending:T.AdditiveBlending,depthWrite:false}));s.add(pts);
 // стена «цифрового дождя» за ядром
 const wall=new T.Mesh(new T.PlaneGeometry(26,12),shaderMat(PLAIN_V,RAIN_F));wall.position.set(0,5.2,-15.5);s.add(wall);
 // панели кода над проходом
 const panes=PANES.map((p,i)=>{const m=new T.Mesh(new T.PlaneGeometry(2.6,1.3),new T.MeshBasicMaterial({map:codeTex(p.t,p.l,p.c,p.hi),transparent:true,depthWrite:false,side:T.DoubleSide,toneMapped:false,fog:true}));m.material.color.setScalar(1.7);
  const side=i%2?1:-1;m.position.set(side*(0.45+0.1*i),2.2+(i%3)*0.35,12-i*4.6);m.rotation.y=-side*0.28;m.renderOrder=6;s.add(m);m.userData.y0=m.position.y;return m;});
 LB.dust(ctx,420,0,1.8,4,5,3.4,26,'#9fdcff');
 ctx.ticks.push((t,dt)=>{rings.forEach((r,i)=>{r.rotation.z=t*(0.25+i*0.12)*(i%2?-1:1);r.rotation.x=Math.PI/2+Math.sin(t*0.5+i)*0.12;r.position.y=1.4+i*1.1+Math.sin(t*0.8+i*2)*0.12;});
  const a=pg.attributes.position.array;for(let i=0;i<np;i++){a[i*3+1]+=dt*(0.4+(i%5)*0.12);if(a[i*3+1]>5.4)a[i*3+1]=0.3;}pg.attributes.position.needsUpdate=true;
  panes.forEach((m,i)=>{m.position.y=m.userData.y0+Math.sin(t*0.6+i*1.7)*0.08;m.material.opacity=0.82+0.18*Math.sin(t*2.3+i);});
  amb.forEach((g,i)=>{g.material.opacity=((t*1.3+i*0.37)%1)<0.5?0.95:0.15;});eva.position.y=1.2+Math.sin(t*0.9)*0.06;});
 ctx.anchors.core=V(0,2.2,cz);
 return LB.finalize(ctx);}
ART.addScene('core',buildCore);
})();
