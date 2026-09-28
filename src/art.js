// ============================================================
// СМОГ · графика (three.js r128)
// Модели: Mixamo X Bot / Vanguard, Ready Player Me (примеры three.js), Kenney Car Kit (CC0), HDRI: Poly Haven (CC0)
// ============================================================
const ART=(()=>{
'use strict';
const T=THREE;
const C=h=>new T.Color(h).convertSRGBToLinear();
function rng(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function hash(x,y,s){let h=Math.imul(x|0,374761393)^Math.imul(y|0,668265263)^Math.imul(s|0,982451653);h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296;}
const sm=t=>t*t*(3-2*t);const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function vn(x,y,s){const xi=Math.floor(x),yi=Math.floor(y),u=sm(x-xi),v=sm(y-yi);const a=hash(xi,yi,s),b=hash(xi+1,yi,s),c=hash(xi,yi+1,s),d=hash(xi+1,yi+1,s);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;}
function fbm(x,y,s,o){let t=0,a=1,f=1,n=0;for(let i=0;i<(o||5);i++){t+=vn(x*f,y*f,s+i*17)*a;n+=a;a*=0.5;f*=2.03;}return t/n;}
function ridge(x,y,s){let t=0,a=1,f=1,n=0,w=1;for(let i=0;i<7;i++){const r=1-Math.abs(vn(x*f,y*f,s+i*31)*2-1);const v=r*r*w;t+=v*a;n+=a;w=clamp(v*1.6,0.25,1);a*=0.46;f*=2.07;}return t/n;}
function canvasTex(w,h,draw,srgb=true,rep){const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');draw(x,w,h);const t=new T.CanvasTexture(c);if(srgb)t.encoding=T.sRGBEncoding;t.anisotropy=8;if(rep){t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(rep[0],rep[1]);}return t;}

// ---------------- quality ----------------
const QUAL={high:{pr:1.25,shadow:2048,water:512,refl:1024,dof:true,bloom:0.9,crowd:1,msaa:true,ao:true,fxaa:false},medium:{pr:1.0,shadow:1024,water:256,refl:512,dof:false,bloom:0.8,crowd:0.6,msaa:false,ao:false,fxaa:true},low:{pr:0.75,shadow:0,water:0,refl:0,dof:false,bloom:0.65,crowd:0.35,msaa:false,ao:false,fxaa:true}};
let qName='high',Q=QUAL.high;
// ---------------- assets ----------------
const BASE=window.SMOG_BASE||'';
const URLS=Object.assign({rpm:BASE+'assets/models/rpm.glb',xbot:BASE+'assets/models/xbot.glb',soldier:BASE+'assets/models/soldier.glb',night:BASE+'assets/env/night.hdr',interior:BASE+'assets/env/interior.hdr',dawn:BASE+'assets/env/dawn.hdr',day:BASE+'assets/env/day.hdr',waterN:BASE+'assets/tex/waternormals.jpg',flare0:BASE+'assets/tex/flare0.png',flare3:BASE+'assets/tex/flare3.png'},window.TUMAR_ASSETS||{});
const EXT=[];// доп. загрузчики (город, машины, текстуры): f(A,URLS,T)=>Promise
const A={ok:false,xbot:null,soldier:null,rpm:null,rpmClips:null,env:{},waterN:null,flare0:null,flare3:null};
const GU={time:{value:0}};

// ---------------- shared textures ----------------
const glowTex=canvasTex(128,128,(x,w,h)=>{const g=x.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(0.18,'rgba(255,255,255,.6)');g.addColorStop(0.45,'rgba(255,255,255,.14)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,w,h);},false);
const smokeTex=canvasTex(128,128,(x,w,h)=>{const r=rng(9);for(let i=0;i<40;i++){const cx=40+r()*48,cy=40+r()*48,rr=10+r()*30;const g=x.createRadialGradient(cx,cy,0,cx,cy,rr);g.addColorStop(0,'rgba(255,255,255,.12)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,w,h);}},false);
const ringTex=canvasTex(64,64,(x)=>{x.strokeStyle='rgba(255,255,255,.9)';x.lineWidth=3;x.beginPath();x.arc(32,32,26,0,7);x.stroke();},false);
function windowTex(seed,lit,warm,cols,rows,frame){const r=rng(seed);return canvasTex(256,512,(x,w,h)=>{x.fillStyle=frame||'#000';x.fillRect(0,0,w,h);const cw=w/cols,ch=h/rows;for(let j=0;j<rows;j++){const floorLit=r()<0.15?0.9:lit;for(let i=0;i<cols;i++){if(r()>floorLit){x.fillStyle='rgba(20,26,34,1)';x.fillRect(i*cw+cw*0.14,j*ch+ch*0.18,cw*0.72,ch*0.6);continue;}const wm=r()<warm;const b=0.35+r()*0.65;x.fillStyle=wm?`rgba(255,${160+r()*60|0},${80+r()*60|0},${b})`:`rgba(${150+r()*70|0},${200+r()*40|0},255,${b})`;x.fillRect(i*cw+cw*0.14,j*ch+ch*0.18,cw*0.72,ch*0.6);if(r()<0.3){x.fillStyle='rgba(0,0,0,.35)';x.fillRect(i*cw+cw*0.14,j*ch+ch*0.18,cw*0.36,ch*0.6);}}}},true);}
const WIN=[windowTex(11,0.34,0.75,8,24),windowTex(12,0.26,0.3,10,34),windowTex(13,0.46,0.85,6,16,'#15120f')];
function ornamentTex(bg,fg,seed,rep){return canvasTex(512,512,(x,w,h)=>{x.fillStyle=bg;x.fillRect(0,0,w,h);x.strokeStyle=fg;x.lineWidth=10;x.lineCap='round';
  const horn=(cx,cy,s,rot)=>{x.save();x.translate(cx,cy);x.rotate(rot);x.beginPath();x.moveTo(0,0);x.bezierCurveTo(s*0.2,-s*0.9,s*1.1,-s*0.8,s*0.8,-s*0.2);x.bezierCurveTo(s*0.6,s*0.1,s*0.3,0,s*0.45,-s*0.3);x.stroke();x.restore();};
  for(let k=0;k<4;k++){const cx=128+(k%2)*256,cy=128+(k>>1)*256;for(let q=0;q<4;q++)horn(cx,cy,70,q*Math.PI/2);x.beginPath();x.arc(cx,cy,100,0,Math.PI*2);x.stroke();}
  x.lineWidth=16;x.strokeRect(8,8,w-16,h-16);x.globalAlpha=0.12;const r=rng(seed||3);for(let i=0;i<2500;i++){x.fillStyle=r()<0.5?'#000':'#fff';x.fillRect(r()*w,r()*h,2,2);}},true,rep||[1,1]);}
const concreteTex=canvasTex(512,512,(x,w,h)=>{const r=rng(5);x.fillStyle='#7a766e';x.fillRect(0,0,w,h);for(let i=0;i<9000;i++){const g=80+r()*80|0;x.fillStyle=`rgba(${g},${g-3},${g-8},${0.18})`;x.fillRect(r()*w,r()*h,1+r()*4,1+r()*4);}x.strokeStyle='rgba(40,38,34,.35)';x.lineWidth=2;for(let i=0;i<4;i++){x.beginPath();x.moveTo(0,i*128);x.lineTo(w,i*128);x.stroke();}for(let i=0;i<60;i++){x.fillStyle='rgba(50,40,30,.10)';x.fillRect(r()*w,r()*h,3+r()*5,60+r()*160);}},true,[3,3]);
const woodTex=canvasTex(512,512,(x,w,h)=>{const r=rng(8);for(let i=0;i<16;i++){const b=90+r()*40|0;x.fillStyle=`rgb(${b},${b*0.66|0},${b*0.42|0})`;x.fillRect(0,i*32,w,32);x.fillStyle='rgba(0,0,0,.35)';x.fillRect(0,i*32,w,2);for(let k=0;k<30;k++){x.fillStyle='rgba(0,0,0,.08)';x.fillRect(r()*w,i*32+r()*30,40+r()*120,1);}x.fillRect(r()*w,i*32,2,32);}},true,[2,2]);
const corrTex=canvasTex(256,256,(x,w,h)=>{const g=x.createLinearGradient(0,0,w,0);for(let i=0;i<=16;i++)g.addColorStop(i/16,i%2?'#fff':'#555');x.fillStyle=g;x.fillRect(0,0,w,h);},false,[3,1]);
const rustTex=(base,seed)=>canvasTex(256,256,(x,w,h)=>{const r=rng(seed);x.fillStyle=base;x.fillRect(0,0,w,h);for(let i=0;i<1400;i++){x.fillStyle=r()<0.6?'rgba(90,50,20,.18)':'rgba(0,0,0,.12)';x.fillRect(r()*w,r()*h,1+r()*6,1+r()*10);}x.fillStyle='rgba(0,0,0,.25)';for(let i=0;i<16;i++)x.fillRect(i*16,0,3,h);},true,[1,1]);
const asphaltTex=canvasTex(512,512,(x,w,h)=>{const r=rng(21);x.fillStyle='#2a2b2e';x.fillRect(0,0,w,h);for(let i=0;i<16000;i++){const g=30+r()*50|0;x.fillStyle=`rgba(${g},${g},${g+3},.5)`;x.fillRect(r()*w,r()*h,2,2);}},true,[1,1]);

// ---------------- material helpers ----------------
function std(o){const p=Object.assign({roughness:0.8,metalness:0.05},o);const m=new T.MeshStandardMaterial(p);if(o&&o.color!==undefined&&!(o.color instanceof T.Color))m.color=C(o.color);if(o&&o.emissive!==undefined&&!(o.emissive instanceof T.Color))m.emissive=C(o.emissive);return m;}
function basic(o){const m=new T.MeshBasicMaterial(Object.assign({},o));if(o&&o.color!==undefined&&!(o.color instanceof T.Color))m.color=C(o.color);return m;}
function emis(color,k){const m=new T.MeshBasicMaterial({color:C(color),toneMapped:false});m.color.multiplyScalar(k||2);return m;}
function glow(color,size,op){const s=new T.Sprite(new T.SpriteMaterial({map:glowTex,color:C(color),transparent:true,opacity:op===undefined?1:op,blending:T.AdditiveBlending,depthWrite:false}));s.scale.set(size,size,1);return s;}
function box(w,h,d,mat,x,y,z){const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat);m.position.set(x||0,y||0,z||0);m.castShadow=true;m.receiveShadow=true;return m;}
function cyl(rt,rb,h,seg,mat,x,y,z){const m=new T.Mesh(new T.CylinderGeometry(rt,rb,h,seg||16),mat);m.position.set(x||0,y||0,z||0);m.castShadow=true;m.receiveShadow=true;return m;}
function textPlane(text,o){o=Object.assign({w:4,h:1,color:'#ff4d6d',bg:null,font:'700 120px "Exo 2", Arial, sans-serif',canvasW:1024,canvasH:256,intensity:2.2,border:false},o);
 const tex=canvasTex(o.canvasW,o.canvasH,(x,w,h)=>{if(o.bg){x.fillStyle=o.bg;x.fillRect(0,0,w,h);}if(o.border){x.strokeStyle=o.color;x.lineWidth=10;x.strokeRect(10,10,w-20,h-20);}x.font=o.font;x.textAlign='center';x.textBaseline='middle';x.shadowColor=o.color;x.shadowBlur=24;x.fillStyle=o.color;x.fillText(text,w/2,h/2+4);x.shadowBlur=0;x.globalAlpha=0.55;x.fillStyle='#fff';x.fillText(text,w/2,h/2+4);});
 const m=new T.Mesh(new T.PlaneGeometry(o.w,o.h),new T.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,side:T.DoubleSide,toneMapped:false}));m.material.color.setScalar(o.intensity);return m;}

// ---------------- sky ----------------
const SKY_F=`uniform vec3 top;uniform vec3 hor;uniform vec3 glowC;uniform vec3 moonDir;uniform vec3 moonC;uniform vec3 cloudC;uniform vec3 sunDir;uniform vec3 sunC;
uniform float starI;uniform float cloudA;uniform float glowA;uniform float time;uniform float sunI;uniform float mwI;uniform vec3 mwN;varying vec3 vD;
float h3(vec3 p){p=fract(p*0.3183099+.1);p*=17.0;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float h2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h2(i),h2(i+vec2(1.,0.)),f.x),mix(h2(i+vec2(0.,1.)),h2(i+vec2(1.,1.)),f.x),f.y);}
float fb(vec2 p){float s=0.,a=.5;for(int i=0;i<6;i++){s+=a*n2(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return s;}
void main(){vec3 d=normalize(vD);float y=d.y;
 vec3 c=mix(hor,top,pow(clamp(y,0.,1.),.42));c=mix(c,hor*.5,clamp(-y*4.,0.,1.));
 c+=glowC*glowA*exp(-max(y,0.)*7.);
 if(starI>0.){vec3 sp=d*380.;vec3 id=floor(sp);float r=h3(id);if(r>.9968){vec3 f=fract(sp)-.5;float s=smoothstep(.34,.0,length(f));c+=vec3(.85,.92,1.)*s*starI*(.55+.45*sin(time*1.7+r*80.))*smoothstep(.02,.3,y);}}
 if(mwI>0.){float b=dot(d,mwN);float band=exp(-b*b*22.);vec2 q=vec2(atan(d.z,d.x)*2.5,asin(clamp(b,-1.,1.))*9.);float nn=fb(q+3.)*0.7+fb(q*2.7)*0.3;
  c+=vec3(0.5,0.56,0.72)*band*mwI*0.11*smoothstep(0.3,0.85,nn)*smoothstep(0.,0.25,y);c-=vec3(0.02)*band*mwI*smoothstep(0.55,0.75,fb(q*1.7+9.))*smoothstep(0.,0.25,y);
  vec3 sp2=d*900.;vec3 id2=floor(sp2);float r2=h3(id2);if(r2>1.-0.02*band*mwI){vec3 f2=fract(sp2)-.5;c+=vec3(.8,.85,1.)*smoothstep(.3,.0,length(f2))*0.8*smoothstep(0.,0.2,y);}}
 float md=max(dot(d,moonDir),0.);c+=moonC*(smoothstep(.99955,.99985,md)*2.4+pow(md,90.)*.28+pow(md,9.)*.06);
 if(sunI>0.){float sd=max(dot(d,sunDir),0.);c+=sunC*sunI*(smoothstep(.9995,.9999,sd)*10.+pow(sd,300.)*1.2+pow(sd,10.)*.25);}
 if(cloudA>0.&&y>0.){vec2 p=d.xz/(y+.1)*1.1+vec2(time*.004,time*.0015);float n=fb(p*1.5);float cl=smoothstep(.46,.8,n)*cloudA*smoothstep(0.,.2,y);
  vec3 cc=cloudC+glowC*glowA*1.3*(1.-smoothstep(0.,.45,y));cc+=moonC*.12*smoothstep(.6,.9,n)+sunC*sunI*.25*smoothstep(.6,.9,n);c=mix(c,cc,cl);}
 gl_FragColor=vec4(c,1.);}`;
function skyDome(o){const u={top:{value:C(o.top)},hor:{value:C(o.hor)},glowC:{value:C(o.glow||'#000000')},glowA:{value:o.glowA||0},moonDir:{value:new T.Vector3(...(o.moonDir||[0,-1,0])).normalize()},moonC:{value:C(o.moonC||'#000000')},cloudC:{value:C(o.cloudC||'#223')},cloudA:{value:o.cloud||0},starI:{value:o.stars||0},time:GU.time,sunDir:{value:new T.Vector3(...(o.sunDir||[0,-1,0])).normalize()},sunC:{value:C(o.sunC||'#fff3dc')},sunI:{value:o.sunI||0},mwI:{value:o.mw||0},mwN:{value:new T.Vector3(...(o.mwN||[0.55,0.35,0.76])).normalize()}};
 const m=new T.Mesh(new T.SphereGeometry(1,48,24),new T.ShaderMaterial({uniforms:u,side:T.BackSide,depthWrite:false,fog:false,vertexShader:'varying vec3 vD;void main(){vD=position;vec4 p=projectionMatrix*modelViewMatrix*vec4(position*1000.,1.);gl_Position=p.xyww;}',fragmentShader:SKY_F}));
 m.frustumCulled=false;m.renderOrder=-10;m.userData.sky=true;return m;}

// ---------------- terrain ----------------
function range(o){const p=Object.assign({w:12000,d:3000,seg:[360,120],h:1800,z:-3600,x:0,y:-20,seed:1,snowLine:0.42,rock:'#2b3038',rock2:'#3b3f46',snow:'#e9eff8',forest:'#101612',scale:1},o);
 const g=new T.PlaneGeometry(p.w,p.d,p.seg[0],p.seg[1]);g.rotateX(-Math.PI/2);const pos=g.attributes.position;const sx=p.scale;
 for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i);const back=1-(z+p.d/2)/p.d;
  const crest=0.5+0.5*fbm(x/(5200*sx)+p.seed*3.1,0.5,p.seed+1,3);
  const warp=fbm(x/(2600*sx),z/(1900*sx),p.seed+3,3);
  const r=ridge(x/(1700*sx)+warp*1.3+p.seed,z/(1250*sx)+warp*0.7,p.seed);
  const gv=fbm(x/(1900*sx),z/(4200*sx),p.seed+5,2);const cut=Math.pow(1-Math.abs(Math.sin((x/(1450*sx)+gv*2.4)*Math.PI)),5);
  const gorge=1-0.55*cut*sm(clamp(1.1-back*1.25,0,1));
  const rise=sm(clamp(back*1.45,0,1))*(1-0.25*sm(clamp((back-0.82)/0.18,0,1)));
  let hh=p.h*rise*crest*(0.22+0.78*Math.pow(r,1.35))*gorge;hh+=fbm(x/380,z/340,p.seed+7,4)*p.h*0.05*rise;pos.setY(i,hh);}
 g.computeVertexNormals();const nrm=g.attributes.normal;const col=[];const rock=C(p.rock),rock2=C(p.rock2),snow=C(p.snow),forest=C(p.forest),tc=new T.Color();
 for(let i=0;i<pos.count;i++){const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);const r=y/p.h;const ny=nrm.getY(i);const n=fbm(x/90,z/90,p.seed+11,4);
  tc.copy(rock).lerp(rock2,n);
  if(r<0.2&&ny>0.5)tc.lerp(forest,sm(clamp((0.2-r)/0.1,0,1))*0.92);
  const sn=sm(clamp((r+(n-0.5)*0.24-p.snowLine)/0.07,0,1))*sm(clamp((ny-0.38)/0.22,0,1));tc.lerp(snow,sn);
  col.push(tc.r,tc.g,tc.b);}
 g.setAttribute('color',new T.Float32BufferAttribute(col,3));
 const m=new T.Mesh(g,new T.MeshStandardMaterial({vertexColors:true,roughness:0.92,metalness:0}));m.position.set(p.x,p.y,p.z);m.receiveShadow=false;m.userData.envMul=0.5;return m;}
function ground(o){const p=Object.assign({w:400,d:400,seg:140,amp:20,scale:80,seed:3,color:'#3a3a38',color2:'#6b6863',snow:null,fn:null,snowSlope:0.75,snowN:0.3,snowY:-1e9},o);const g=new T.PlaneGeometry(p.w,p.d,p.seg,p.seg);g.rotateX(-Math.PI/2);const pos=g.attributes.position;
 for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i);let y=(fbm(x/p.scale,z/p.scale,p.seed,5)-0.45)*p.amp;if(p.fn)y=p.fn(x,z,y);pos.setY(i,y);}
 g.computeVertexNormals();const nrm=g.attributes.normal;const col=[];const a=C(p.color),b=C(p.color2),s=p.snow?C(p.snow):null,tc=new T.Color();
 for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i);const n=fbm(x/7,z/7,p.seed+3,3);tc.copy(a).lerp(b,n);if(s){const ny=nrm.getY(i);const yy=pos.getY(i);tc.lerp(s,sm(clamp((ny-p.snowSlope)/0.15,0,1))*sm(clamp((n-p.snowN)/0.3,0,1))*sm(clamp((yy-p.snowY)/20,0,1)));}col.push(tc.r,tc.g,tc.b);}
 g.setAttribute('color',new T.Float32BufferAttribute(col,3));const m=new T.Mesh(g,new T.MeshStandardMaterial({vertexColors:true,roughness:0.95}));m.receiveShadow=true;return m;}

// ---------------- city ----------------
// процедурные окна по мировым координатам: этажи ~3 м, окна ~2 м, случайно горят
function cityMat(o){const m=new T.MeshStandardMaterial({color:C(o.base),roughness:o.rough,metalness:o.metal});
 const u={uLit:{value:o.lit},uWarm:{value:o.warm},uFloor:{value:o.floor},uCol:{value:o.col},uI:{value:o.i},uGlass:{value:o.glass||0}};m.userData.u=u;
 m.onBeforeCompile=sh=>{Object.assign(sh.uniforms,u);
  sh.vertexShader='varying vec3 vWP;varying vec3 vWN;varying float vSeed;\n'+sh.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
  mat4 cim=mat4(1.0);
  #ifdef USE_INSTANCING
  cim=instanceMatrix;
  #endif
  vec4 cwp=modelMatrix*cim*vec4(position,1.0);vWP=cwp.xyz;vWN=normalize(mat3(modelMatrix)*mat3(cim)*normal);vec4 corg=modelMatrix*cim*vec4(0.,0.,0.,1.);vSeed=fract(sin(dot(corg.xz,vec2(12.9898,78.233)))*43758.5453);`);
  sh.fragmentShader='uniform float uLit;uniform float uWarm;uniform float uFloor;uniform float uCol;uniform float uI;uniform float uGlass;varying vec3 vWP;varying vec3 vWN;varying float vSeed;\nfloat cbh(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}\n'+sh.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
  {vec3 an=abs(vWN);
   if(an.y<0.5){float side=an.x>an.z?sign(vWN.x):2.0*sign(vWN.z);float hx=an.x>an.z?vWP.z:vWP.x;float colw=uCol*(0.85+vSeed*0.5);
    vec2 cell=vec2(hx/colw,(vWP.y-0.6)/uFloor);vec2 id=floor(cell);vec2 f=fract(cell);
    float win=smoothstep(0.1,0.16,f.x)*smoothstep(0.9,0.84,f.x)*smoothstep(0.18,0.24,f.y)*smoothstep(0.86,0.8,f.y);
    float h1=cbh(id+vec2(vSeed*91.7,side*17.3));float h2=cbh(id.yx*1.37+vec2(vSeed*13.1,side));
    float floorLit=step(cbh(vec2(id.y*1.7,vSeed*77.0+side)),0.1);
    float lit=max(step(h1,uLit*(0.55+0.9*vSeed)),floorLit*step(h1,0.85));
    vec3 wc=mix(vec3(0.55,0.78,1.0),vec3(1.0,0.64,0.34),step(h2,uWarm));wc*=0.25+0.75*cbh(id*3.1+vSeed);
    float band=0.75+0.25*smoothstep(0.2,0.8,f.y);
    totalEmissiveRadiance+=wc*lit*win*uI*band;
    diffuseColor.rgb*=mix(1.0,0.25,win);roughnessFactor=mix(roughnessFactor,0.14,win*uGlass);metalnessFactor=mix(metalnessFactor,0.9,win*uGlass);
   }else{diffuseColor.rgb*=0.55;}
  }`);};
 m.customProgramCacheKey=()=>'tumarCity';return m;}
const bMats=[cityMat({base:'#0b1017',metal:0.6,rough:0.3,lit:0.22,warm:0.35,floor:3.7,col:1.9,i:1.05,glass:1}),cityMat({base:'#17181b',metal:0.1,rough:0.8,lit:0.3,warm:0.8,floor:3.0,col:2.7,i:0.95,glass:0.4}),cityMat({base:'#58524a',metal:0.02,rough:0.92,lit:0.4,warm:0.9,floor:2.8,col:3.2,i:1.2,glass:0.2})];
// земля города: тёмные кварталы + светящаяся сетка улиц (натриевые фонари)
function streetGround(ctx,p){const g=new T.PlaneGeometry(p.w||9000,p.d||9000,1,1);g.rotateX(-Math.PI/2);
 const u=Object.assign({uGrid:{value:p.grid},uOrg:{value:new T.Vector2(p.x0,p.z0)},uLamp:{value:C(p.lamp||'#ff9a3c')},uBase:{value:C(p.base||'#07080a')},uI:{value:p.i||1.0},uExt:{value:new T.Vector4(p.x0,p.z0,p.x1,p.z1)}},T.UniformsLib.fog);
 const m=new T.ShaderMaterial({uniforms:u,fog:true,vertexShader:`varying vec3 vW;
  #include <fog_pars_vertex>
  void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;vec4 mvPosition=viewMatrix*w;gl_Position=projectionMatrix*mvPosition;
  #include <fog_vertex>
  }`,fragmentShader:`uniform float uGrid;uniform vec2 uOrg;uniform vec3 uLamp;uniform vec3 uBase;uniform float uI;uniform vec4 uExt;varying vec3 vW;
  #include <fog_pars_fragment>
  float gh(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  void main(){vec2 q=(vW.xz-uOrg)/uGrid;vec2 f=fract(q);vec2 d=min(f,1.-f)*uGrid;float st=min(d.x,d.y);
   float inside=step(uExt.x-40.,vW.x)*step(vW.x,uExt.z+40.)*step(uExt.y-40.,vW.z)*step(vW.z,uExt.w+40.);
   float glow=exp(-st*st/18.)*1.2+exp(-st*st/300.)*0.35;float lane=smoothstep(0.6,0.,abs(st-3.))*0.35;
   float blk=gh(floor(q));vec3 c=uBase*(0.7+0.6*blk);
   vec3 lc=mix(uLamp,vec3(0.75,0.85,1.),step(0.8,gh(floor(q)+3.1)));
   c+=lc*(glow+lane)*uI*inside;
   float far=smoothstep(uGrid*2.,uGrid*6.,max(max(uExt.x-vW.x,vW.x-uExt.z),max(uExt.y-vW.z,vW.z-uExt.w)));
   c+=uLamp*0.05*uI*(1.-far)*(1.-inside);
   gl_FragColor=vec4(c,1.);
   #include <fog_fragment>
  }`});const mesh=new T.Mesh(g,m);mesh.position.y=(p.y||0)-0.2;ctx.scene.add(mesh);return mesh;}
// смог над Алматы: светящаяся дымка, подсвеченная фонарями снизу
function smogLayer(ctx,y,color,op,size){const m=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{c:{value:C(color)},op:{value:op},time:GU.time},
 vertexShader:'varying vec3 vW;void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
 fragmentShader:`uniform vec3 c;uniform float op;uniform float time;varying vec3 vW;
 float h2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h2(i),h2(i+vec2(1.,0.)),f.x),mix(h2(i+vec2(0.,1.)),h2(i+vec2(1.,1.)),f.x),f.y);}
 void main(){vec2 p=vW.xz/420.+vec2(time*0.004,0.);float n=n2(p)*0.6+n2(p*2.3)*0.3+n2(p*5.1)*0.1;float d=length(vW.xz-cameraPosition.xz);
  float a=op*smoothstep(0.25,0.8,n)*smoothstep(150.,900.,d)*(1.-smoothstep(3500.,6000.,d));gl_FragColor=vec4(c,a);}`});
 const mesh=new T.Mesh(new T.PlaneGeometry(size||12000,size||12000),m);mesh.rotation.x=-Math.PI/2;mesh.position.y=y;mesh.renderOrder=3;mesh.userData.noDepth=true;ctx.scene.add(mesh);return mesh;}
function city(ctx,o){const p=Object.assign({x0:-900,x1:900,z0:-1400,z1:-80,y:0,grid:64,hmin:10,hmax:80,seed:7,fill:0.8,boost:null,mats:[0,1],traffic:true,lamps:true,exclude:null},o);const r=rng(p.seed);const s=ctx.scene;
 const classes=[];for(let k=0;k<7;k++){const hh=[8,14,24,38,58,86,130][k];const geo=new T.BoxGeometry(1,hh,1);geo.translate(0,hh/2,0);const uv=geo.attributes.uv;for(let i=0;i<uv.count;i++)uv.setY(i,uv.getY(i)*hh/36);classes.push({hh,geo,list:[]});}
 const roofs=[];
 for(let gx=p.x0;gx<p.x1;gx+=p.grid)for(let gz=p.z0;gz<p.z1;gz+=p.grid){if(r()>p.fill)continue;const cx=gx+p.grid/2,cz=gz+p.grid/2;if(p.exclude&&p.exclude(cx,cz))continue;
  const nb=1+(r()*3|0);for(let b=0;b<nb;b++){const w=10+r()*(p.grid*0.42),d=10+r()*(p.grid*0.42);const x=cx+(r()-0.5)*(p.grid-w-12),z=cz+(r()-0.5)*(p.grid-d-12);
   let h=p.hmin+Math.pow(r(),2.3)*(p.hmax-p.hmin);if(p.boost)h*=p.boost(x,z);let ci=0;for(let k=0;k<7;k++)if(classes[k].hh<=h*1.15)ci=k;const m=p.mats[(r()*p.mats.length)|0];classes[ci].list.push([x,z,w,d,m,h/classes[ci].hh]);if(h>40&&r()<0.5)roofs.push([x,p.y+h+2,z]);}}
 const dummy=new T.Object3D();const g=new T.Group();
 for(const c of classes){for(const mi of [0,1,2]){const L=c.list.filter(e=>e[4]===mi);if(!L.length)continue;const im=new T.InstancedMesh(c.geo,bMats[mi],L.length);im.userData.envMul=0.35;im.castShadow=false;im.receiveShadow=false;L.forEach((e,i)=>{dummy.position.set(e[0],p.y,e[1]);dummy.scale.set(e[2],e[5],e[3]);dummy.rotation.y=0;dummy.updateMatrix();im.setMatrixAt(i,dummy.matrix);});g.add(im);}}
 s.add(g);if(p.ground!==false)streetGround(ctx,{grid:p.grid,x0:p.x0,z0:p.z0,x1:p.x1,z1:p.z1,y:p.y,i:p.groundI||1});
 if(roofs.length){const pos=[];roofs.forEach(q=>pos.push(q[0],q[1],q[2]));const rg=new T.BufferGeometry();rg.setAttribute('position',new T.Float32BufferAttribute(pos,3));const rp=new T.Points(rg,new T.PointsMaterial({color:C('#ff2a1a'),size:3.2,sizeAttenuation:true,transparent:true,depthWrite:false,blending:T.AdditiveBlending,map:glowTex,toneMapped:false}));rp.material.color.multiplyScalar(3);s.add(rp);ctx.ticks.push(t=>{rp.material.opacity=0.45+0.55*(Math.sin(t*2.2)>0?1:0.25);});}
 // street lamps along grid lines
 if(p.lamps){const pos=[],col=[];const wc=C('#ffb057'),cc=C('#cfe6ff');for(let gx=p.x0;gx<=p.x1;gx+=p.grid)for(let z=p.z0;z<p.z1;z+=11){pos.push(gx+(r()-0.5)*2,p.y+6,z);const c=r()<0.8?wc:cc;col.push(c.r*2.2,c.g*2.2,c.b*2.2);}for(let gz=p.z0;gz<=p.z1;gz+=p.grid)for(let x=p.x0;x<p.x1;x+=11){pos.push(x,p.y+6,gz+(r()-0.5)*2);const c=r()<0.8?wc:cc;col.push(c.r*2.2,c.g*2.2,c.b*2.2);}
  const lg=new T.BufferGeometry();lg.setAttribute('position',new T.Float32BufferAttribute(pos,3));lg.setAttribute('color',new T.Float32BufferAttribute(col,3));s.add(new T.Points(lg,new T.PointsMaterial({size:4,vertexColors:true,map:glowTex,transparent:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false})));}
 // traffic
 if(p.traffic){const lanes=[];for(let gx=p.x0;gx<=p.x1;gx+=p.grid)lanes.push({ax:'z',c:gx,a:p.z0,b:p.z1});for(let gz=p.z0;gz<=p.z1;gz+=p.grid)lanes.push({ax:'x',c:gz,a:p.x0,b:p.x1});
  const N=Math.round(900*Q.crowd+300);const cars=[];for(let i=0;i<N;i++){const L=lanes[(r()*lanes.length)|0];cars.push({L,u:r(),sp:(0.01+r()*0.02)*(r()<0.5?1:-1),side:r()<0.5?-1:1});}
  const pos=new Float32Array(N*3),col=new Float32Array(N*3);const white=C('#fff4e0'),red=C('#ff2a1a');cars.forEach((c,i)=>{const cc=(c.sp>0)===(c.side>0)?white:red;col.set([cc.r*3,cc.g*3,cc.b*3],i*3);});
  const tg=new T.BufferGeometry();tg.setAttribute('position',new T.BufferAttribute(pos,3));tg.setAttribute('color',new T.BufferAttribute(col,3));const tp=new T.Points(tg,new T.PointsMaterial({size:3,vertexColors:true,map:glowTex,transparent:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false}));tp.frustumCulled=false;s.add(tp);
  ctx.ticks.push((t,dt)=>{const a=tg.attributes.position.array;cars.forEach((c,i)=>{c.u=(c.u+c.sp*dt*0.6+1)%1;const v=c.L.a+(c.L.b-c.L.a)*c.u;if(c.L.ax==='z'){a[i*3]=c.L.c+c.side*3;a[i*3+2]=v;}else{a[i*3]=v;a[i*3+2]=c.L.c+c.side*3;}a[i*3+1]=p.y+1;});tg.attributes.position.needsUpdate=true;});}
 return g;}
function hotelKazakhstan(){const g=new T.Group();const H=102;
 const m=new T.MeshStandardMaterial({color:C('#1a1d22'),roughness:0.25,metalness:0.6,emissive:new T.Color(1,1,1),emissiveMap:windowTex(31,0.45,0.9,12,30),emissiveIntensity:1.6});
 const sh=new T.Shape();sh.moveTo(-15,-6);sh.lineTo(15,-6);sh.quadraticCurveTo(16,5,0,9);sh.quadraticCurveTo(-16,5,-15,-6);
 const geo=new T.ExtrudeGeometry(sh,{depth:H,bevelEnabled:false,curveSegments:24});geo.rotateX(-Math.PI/2);const uv=geo.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)/32,uv.getY(i)/34);
 const body=new T.Mesh(geo,m);g.add(body);
 for(let k=0;k<9;k++){const fin=box(0.5,H,1.2,std({color:'#c9b27a',metalness:0.8,roughness:0.3}),-12+k*3,H/2,8.6-Math.abs(k-4)*0.55);g.add(fin);}
 const crownTex=canvasTex(1024,256,(x,w,h)=>{x.clearRect(0,0,w,h);x.strokeStyle='#ffd27a';x.lineWidth=9;for(let i=0;i<12;i++){const cx=i*(w/12)+w/24;x.beginPath();x.moveTo(cx-30,h);x.lineTo(cx-30,110);x.quadraticCurveTo(cx,-20,cx+30,110);x.lineTo(cx+30,h);x.stroke();x.beginPath();x.moveTo(cx,h);x.lineTo(cx,80);x.stroke();x.beginPath();x.arc(cx,60,8,0,7);x.stroke();}x.fillStyle='#ffd27a';x.fillRect(0,h-14,w,14);},true);crownTex.wrapS=T.RepeatWrapping;crownTex.repeat.set(2,1);
 const crown=new T.Mesh(new T.CylinderGeometry(12,13,20,64,1,true),new T.MeshBasicMaterial({map:crownTex,transparent:true,side:T.DoubleSide,depthWrite:false,toneMapped:false}));crown.material.color.setScalar(3);crown.scale.z=0.6;crown.position.y=H+10;g.add(crown);
 const top=glow('#ffc35a',60,0.45);top.position.y=H+12;g.add(top);return g;}
function tvTower(ctx){const g=new T.Group();const H=372;
 const lines=[];const legs=3;for(let i=0;i<legs;i++){const a=i/legs*Math.PI*2;for(let k=0;k<40;k++){const y0=k/40*H,y1=(k+1)/40*H;const r0=20*(1-y0/H)+1.4,r1=20*(1-y1/H)+1.4;const a2=a+Math.PI*2/legs;lines.push(Math.cos(a)*r0,y0,Math.sin(a)*r0,Math.cos(a)*r1,y1,Math.sin(a)*r1);lines.push(Math.cos(a)*r0,y0,Math.sin(a)*r0,Math.cos(a2)*r1,y1,Math.sin(a2)*r1);lines.push(Math.cos(a)*r1,y1,Math.sin(a)*r1,Math.cos(a2)*r1,y1,Math.sin(a2)*r1);}}
 const lg=new T.BufferGeometry();lg.setAttribute('position',new T.Float32BufferAttribute(lines,3));g.add(new T.LineSegments(lg,new T.LineBasicMaterial({color:C('#e8eef6')})));
 g.add(cyl(1.4,3.4,H,10,std({color:'#8a9098',metalness:0.8,roughness:0.35}),0,H/2,0));
 for(const [y,r] of [[H*0.42,10],[H*0.62,7]]){const d=cyl(r,r*0.8,8,24,std({color:'#20242c',emissive:'#9fd0ff',emissiveIntensity:0.9}),0,y,0);g.add(d);}
 const reds=[];for(let k=1;k<=8;k++){const l=glow('#ff2a2a',k===8?40:18,0.95);l.position.y=k/8*H;g.add(l);reds.push(l);}
 ctx.ticks.push(t=>{reds.forEach((l,k)=>l.material.opacity=0.3+0.7*(Math.sin(t*2+k*0.4)>0?1:0.15));});
 return g;}
function esentai(){const g=new T.Group();const H=162;const sh=new T.Shape();sh.moveTo(-11,0);sh.lineTo(11,0);sh.lineTo(11,H-28);sh.lineTo(-11,H);sh.lineTo(-11,0);
 const geo=new T.ExtrudeGeometry(sh,{depth:22,bevelEnabled:false});geo.translate(0,0,-11);const uv=geo.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)/22,uv.getY(i)/44);
 g.add(new T.Mesh(geo,new T.MeshStandardMaterial({color:C('#0d1a26'),roughness:0.12,metalness:0.92,emissive:new T.Color(1,1,1),emissiveMap:windowTex(41,0.38,0.2,12,44),emissiveIntensity:1.5})));
 const edge=new T.Mesh(new T.BoxGeometry(1,0.8,23),emis('#7fd6ff',3));edge.position.set(0,H-14,0);edge.rotation.z=Math.atan2(28,22);edge.scale.x=Math.hypot(22,28);g.add(edge);return g;}

// ---------------- characters ----------------
// андроиды (X Bot): shell:1 — корпус из панелей (цвета top/bot — цвета панелей), чёрная механика суставов и кистей, «пояс» с огоньками;
// hair — окрашенный «скальп» (у безымянных серийных моделей его нет); eye — цвет линз (по умолчанию голубой)
const LOOK={
 aya:{android:1,shell:1,top:'#e9edf2',bot:'#2a2f38',skin:'#f1f3f6',hair:'#16120f',shoe:'#1a1a1c',acc:'#4fd2ff',led:'#4fd2ff'},
 erl:{android:1,top:'#24324a',bot:'#151920',skin:'#eef1f4',hair:'#2a1f18',shoe:'#0c0c0e',acc:'#6fb8ff',led:'#6fb8ff'},
 saya:{android:1,shell:1,top:'#b8c6a0',bot:'#3a4032',skin:'#eef0f2',hair:'#2a2218',acc:'#b9e68f',led:'#f2c94c'},
 bori:{android:1,shell:1,top:'#d9892b',bot:'#34373c',skin:'#aeb4bb',hair:'#ffd23f',acc:'#ffd23f',led:'#4fd2ff',eye:'#ffd23f',scale:1.38},
 sulu:{android:1,shell:1,top:'#eef1f3',bot:'#dfe4e8',skin:'#f3f4f6',hair:'#221a14',acc:'#e84a4a',led:'#4fd2ff'},
 bota:{android:1,shell:1,top:'#ffcf4a',bot:'#3a5a8a',skin:'#f2f3f5',hair:'#3a2a1a',acc:'#4fd2ff',led:'#4fd2ff',scale:0.62},
 dina:{human:1,top:'#3a271b',bot:'#1c1f24',shoe:'#17120e',skin:[1.0,0.83,0.68],beard:'#1a1310',hair:'#120e0c'},
 zh:{human:1,top:'#34443b',bot:'#2a2d31',shoe:'#1c1a18',skin:[1.0,0.85,0.72],beard:'#77716a',hair:'#5c5750',hairStyle:'receding'},
 ata:{human:1,top:'#5e4c3a',bot:'#34343a',shoe:'#231d18',skin:[0.95,0.79,0.64],beard:'#e4e4e0',hair:'takiya',scale:0.96},
 dan:{human:1,top:'#1f3d30',bot:'#16181c',shoe:'#d8d8d8',skin:[1.0,0.85,0.72],beard:null,hair:'#100c0a',scale:1.02},
 kim:{human:1,top:'#d9d9d9',bot:'#2a2d33',shoe:'#111111',skin:[1.0,0.9,0.8],beard:null,hair:'#111111'},
 ser:{human:1,top:'#5d4d3a',bot:'#2a2a2a',shoe:'#111111',skin:[0.95,0.8,0.66],beard:'#bcbcb8',hair:null},
 gul:{human:1,top:'#8a2436',bot:'#2a2226',shoe:'#111111',skin:[0.97,0.82,0.68],beard:null,hair:'#e6d6b8'},
 ana:{holo:1,holoC:'#b9a6ff'},
 police:{soldier:1},topan:{soldier:1,topan:1}
};
// серийные андроиды «Вектора» в городе: белый корпус как у референса «Humanoid robot AI», цвет панелей — по службе
const UNIT={plain:{top:'#eceff2',bot:'#e6e9ec',acc:'#4fd2ff'},eco:{top:'#eceff2',bot:'#e6e9ec',acc:'#6fe08a'},patrol:{top:'#22324a',bot:'#e6e9ec',acc:'#58c8f0',led:'#58c8f0'},
 courier:{top:'#e3b12c',bot:'#2b2e33',acc:'#e3b12c'},cleaner:{top:'#e07a2c',bot:'#e6e9ec',acc:'#ffb24a'},taxi:{top:'#eceff2',bot:'#1e2024',acc:'#f2c230'}};
function unitLook(kind,o){return Object.assign({android:1,shell:1,skin:'#f1f3f5',hair:null,shoe:'#1d1f23',led:'#4fd2ff'},UNIT[kind]||UNIT.plain,o||{});}
LOOK.unit=unitLook('plain');
const _CR=rng(77);
function crowdLook(r){r=r||_CR;const tops=['#2a2f38','#4a3526','#1f3d30','#5a1f2a','#3a3a40','#6a5846','#23304a','#403028','#1c1c1e','#5d4d3a','#7a6a58','#2e3b52'];const bots=['#1a1a1c','#23262b','#2d2a26','#1c2230'];
 return {human:1,top:tops[(r()*tops.length)|0],bot:bots[(r()*bots.length)|0],shoe:'#161412',skin:[0.93+r()*0.07,0.76+r()*0.1,0.6+r()*0.12],beard:r()<0.35?['#1a1310','#555049','#9a958e'][(r()*3)|0]:null,hair:r()<0.8?['#120e0c','#2a1f16','#5c5750','#8a8680'][(r()*4)|0]:(r()<0.5?'takiya':null),scale:0.94+r()*0.1};}
const CROWD=['#2a2f38','#4a3526','#1f3d30','#5a1f2a','#3a3a40','#6a5846','#23304a','#403028','#1c1c1e','#5d4d3a'];
// Раскраска по позе привязки (bind pose, метры; T-поза: руки вдоль ±x на y≈1.44, голова 1.52–1.81, глаза ±0.031/1.668).
// Андроиды: глянцевые панели со швами и винтами, линзы глаз, диск на виске с кольцом-диодом, суставы (меш Beta_Joints) — чёрная механика.
const REGION=`vec3 bp=vBind;float ax=abs(bp.x);vec3 rc=uTop;gRegR=uAnd>0.5?0.72:0.86;gRegE=vec3(0.0);gClear=0.0;gMetal=0.0;float cloth=1.0;
if(bp.y<0.95&&ax<0.4){rc=uBot;gRegR=0.8;}
if(bp.y<0.09&&ax<0.4){rc=uShoe;gRegR=0.4;gClear=0.6;}
if(ax>0.66){rc=uSkin;gRegR=uAnd>0.5?0.3:0.55;gClear=uAnd;cloth=0.0;}
bool hd=bp.y>1.49&&ax<(bp.y>1.57?0.2:0.1);bool hr=false;
if(hd){rc=uSkin;gRegR=uAnd>0.5?0.28:0.6;gClear=uAnd;cloth=0.0;
 float hl=mix(1.748,1.585,smoothstep(0.035,-0.03,bp.z));if(bp.y>hl&&uBald<0.5){rc=uHair;gRegR=0.5;gClear=0.15;hr=true;}}
if(uAnd>0.5){float shell=max(1.0-cloth,uShell);
 if(uShell>0.5&&!hr&&bp.y>0.09){gRegR=min(gRegR,0.3);gClear=1.0;if(ax>0.66){rc=vec3(0.03,0.032,0.036);gRegR=0.3;gMetal=0.6;gClear=0.4;}}
 if(uJoint>0.5){float cov=cloth*(1.0-uShell);float axv=(ax>0.2&&bp.y>1.25)?ax:bp.y;float rib=0.5+0.5*sin(axv*760.0);
  rc=mix(vec3(0.028,0.03,0.034)*(0.65+0.7*rib),rc*0.55,cov);gRegR=mix(0.28+0.22*rib,0.85,cov);gMetal=0.75*(1.0-cov);gClear=0.0;}
 else{float sm=0.0,scr=0.0;
  if(ax>0.17&&bp.y>1.3){sm=max(sm,sLn(ax-0.245,0.0022));sm=max(sm,sLn(ax-0.405,0.0022));sm=max(sm,sLn(ax-0.6,0.0022));sm=max(sm,sLn(ax-0.685,0.002));}
  if(bp.y<0.98&&bp.y>0.1&&ax<0.4){sm=max(sm,sLn(bp.y-0.915,0.0024)*uShell);sm=max(sm,sLn(bp.y-0.63,0.0022));sm=max(sm,sLn(bp.y-0.2,0.0022));
   if(bp.z>0.0)sm=max(sm,sLn(length(vec2(ax-0.082,bp.y-0.515))-0.036,0.002));}
  if(uShell>0.5&&bp.y>0.95&&bp.y<1.5&&ax<0.2){float q=min(1.0,bp.x*bp.x/0.0196);float ye=1.2+0.05*(1.0-q),yp=1.075+0.025*q;
   if(bp.y>yp&&bp.y<ye){float sg=smoothstep(0.3,0.5,abs(fract(bp.y*70.0)-0.5));rc=vec3(0.022,0.024,0.028)*(0.7+0.6*sg);gRegR=0.35;gMetal=0.65;gClear=0.0;
    vec2 cg=bp.xy*90.0;float h=fract(sin(dot(floor(cg),vec2(12.9898,78.233)))*43758.5453);float dt=step(0.93,h)*(1.0-smoothstep(0.1,0.35,length(fract(cg)-0.5)))*step(0.02,bp.z);
    gRegE+=mix(vec3(1.0,0.32,0.08),uAcc,step(0.975,h))*dt*(0.9+0.6*sin(uTime*3.0+h*40.0));}
   else{sm=max(sm,sLn(bp.y-ye,0.0026));sm=max(sm,sLn(bp.y-yp,0.0026));
    if(bp.y>ye&&bp.y<1.465&&bp.z>0.0)sm=max(sm,0.7*sLn(bp.x,0.0018));if(bp.z<0.0)sm=max(sm,sLn(bp.x,0.002));
    sm=max(sm,sLn(bp.y-1.468,0.0024));
    if(bp.z>0.02){scr=max(scr,scrw(vec2(ax-0.118,bp.y-1.405)));scr=max(scr,scrw(vec2(ax-0.128,bp.y-1.27)));scr=max(scr,scrw(vec2(ax-0.092,bp.y-1.005)));}}}
  if(hd&&!hr){
   if(bp.z>0.0)sm=max(sm,sLn((length(vec2(bp.x/0.068,(bp.y-1.648)/0.094))-1.0)*0.068,0.0018));
   if(bp.z>0.06){float er=length(vec2((ax-0.031)/0.0148,(bp.y-1.668)/0.0088));float sk=1.0-smoothstep(0.9,1.0,er);
    rc=mix(rc,vec3(0.006,0.007,0.009),sk);gRegR=mix(gRegR,0.06,sk);
    float ir=length(vec2(ax-0.031,bp.y-1.668));float iris=1.0-smoothstep(0.0042,0.006,ir);float pu=1.0-smoothstep(0.0012,0.0022,ir);
    gRegE+=uEye*uEyeI*(iris*(1.0-pu)*2.6+sk*0.06);
    sm=max(sm,sLn(bp.y-1.606,0.0011)*step(ax,0.018));}
   if(ax>0.06){float qr=length(vec2(bp.z-0.024,bp.y-1.662));sm=max(sm,sLn(qr-0.021,0.0016));
    if(bp.x<0.0){float rg=smoothstep(0.0085,0.0105,qr)*(1.0-smoothstep(0.0155,0.0175,qr));rc=mix(rc,uLed,rg*step(0.01,uLedI));gRegE+=uLed*uLedI*rg;}}
   if(bp.y>1.705)sm=max(sm,sLn(bp.z+0.01,0.0018));}
  sm*=shell;scr*=shell;rc*=mix(1.0,0.16,sm);rc=mix(rc,vec3(0.06),scr);gRegR=mix(gRegR,0.75,max(sm,scr));gClear*=1.0-max(sm,scr);
  if(bp.x>0.30&&bp.x<0.38&&bp.y>1.25&&bp.y<1.6){rc=mix(rc,uAcc,0.8);gRegE+=uAcc*0.7;}
  vec2 tq=vec2(bp.x,bp.y-1.28-0.06*uShell);if(bp.z>0.07&&tq.y<0.045&&tq.y>-0.045&&abs(tq.x)<(0.045-tq.y)*0.55){rc=uAcc;gRegE+=uAcc*1.6;}}}
diffuseColor.rgb*=rc;`;
// шов: тёмная линия полушириной w (м) со сглаживанием по экрану; издалека гаснет, чтобы не рябить
const CHAR_FN=`float sLn(float d,float w){float fw=max(fwidth(d),1e-5);return (1.0-smoothstep(w,w+fw*1.5,abs(d)))*(1.0-smoothstep(0.006,0.02,fw));}
float scrw(vec2 q){return 1.0-smoothstep(0.0032,0.0042,length(q));}
`;
function charMat(L,joint){const Mat=L.android?T.MeshPhysicalMaterial:T.MeshStandardMaterial;const m=new Mat({color:0xffffff,roughness:0.8,metalness:0,skinning:true});if(L.android){m.clearcoat=1.0;m.clearcoatRoughness=0.1;}m.extensions={derivatives:true};
 const u={uSkin:{value:C(L.skin||'#c99a78')},uTop:{value:C(L.top||'#222222')},uBot:{value:C(L.bot||'#1a1a1a')},uShoe:{value:C(L.shoe||'#111111')},uHair:{value:C(L.hair||'#111111')},uAcc:{value:C(L.acc||'#000000')},uLed:{value:C(L.led||'#000000')},uAnd:{value:L.android?1:0},uLedI:{value:L.led?2.6:0},
  uShell:{value:L.shell?1:0},uJoint:{value:joint?1:0},uBald:{value:L.hair?0:1},uEye:{value:C(L.eye||'#79d6ff')},uEyeI:{value:L.eyeI===undefined?1:L.eyeI},uTime:GU.time};m.userData.u=u;
 m.onBeforeCompile=sh=>{Object.assign(sh.uniforms,u);sh.vertexShader='varying vec3 vBind;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n vBind=position;');
  sh.fragmentShader='uniform vec3 uSkin;uniform vec3 uTop;uniform vec3 uBot;uniform vec3 uShoe;uniform vec3 uHair;uniform vec3 uAcc;uniform vec3 uLed;uniform float uAnd;uniform float uLedI;uniform float uShell;uniform float uJoint;uniform float uBald;uniform vec3 uEye;uniform float uEyeI;uniform float uTime;varying vec3 vBind;vec3 gRegE;float gRegR;float gClear;float gMetal;\n'+CHAR_FN+sh.fragmentShader.replace('#include <color_fragment>',REGION).replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\n roughnessFactor=gRegR;').replace('#include <metalnessmap_fragment>','#include <metalnessmap_fragment>\n metalnessFactor=gMetal;').replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\n totalEmissiveRadiance+=gRegE;').replace('#include <lights_physical_fragment>','#include <lights_physical_fragment>\n #ifdef CLEARCOAT\n material.clearcoat*=gClear;\n #endif');};
 m.customProgramCacheKey=()=>'tumarChar'+(L.android?'A':'H');return m;}
function holoMat(color){const m=new T.MeshBasicMaterial({color:C(color),transparent:true,opacity:0.55,blending:T.AdditiveBlending,depthWrite:false,skinning:true});
 m.onBeforeCompile=sh=>{sh.uniforms.uTime=GU.time;sh.fragmentShader='uniform float uTime;\n'+sh.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n float sl=0.5+0.5*step(0.5,fract(gl_FragCoord.y*0.2-uTime*2.0));diffuseColor.a*=sl*(0.8+0.2*sin(uTime*9.0));');};m.customProgramCacheKey=()=>'tumarHolo';return m;}
function fallbackFigure(L){const g=new T.Group();const mat=std({color:L.top||'#1c1f24',roughness:0.6});const body=cyl(0.19,0.15,0.62,12,mat,0,1.12,0);g.add(body);g.add(cyl(0.15,0.16,0.2,12,mat,0,0.78,0));const head=new T.Mesh(new T.SphereGeometry(0.115,16,12),std({color:L.skin||'#c99a78'}));head.scale.set(1,1.18,1.05);head.position.y=1.62;g.add(head);for(const sx of [-1,1]){g.add(cyl(0.075,0.055,0.78,8,std({color:L.bot||'#222'}),sx*0.09,0.39,0));const arm=cyl(0.055,0.04,0.66,8,mat,sx*0.25,1.1,0);g.add(arm);}if(L.led){const l=glow(L.led,0.14);l.position.set(-0.1,1.64,0.05);g.add(l);}return g;}
const _q=new T.Quaternion(),_pq=new T.Quaternion(),_ax=new T.Vector3();
function rotBone(b,axis,ang){b.parent.getWorldQuaternion(_pq);_q.setFromAxisAngle(axis,ang);const d=_pq.clone().invert().multiply(_q).multiply(_pq);b.quaternion.premultiply(d);b.updateMatrixWorld(true);}
function poseSit(model,B,kneel){model.updateMatrixWorld(true);model.getWorldQuaternion(_q);_ax.set(1,0,0).applyQuaternion(_q).normalize();const ax=_ax.clone();for(const s of ['Left','Right']){const up=B['mixamorig'+s+'UpLeg'],lo=B['mixamorig'+s+'Leg'];if(up)rotBone(up,ax,kneel?-1.3:-1.42);if(lo)rotBone(lo,ax,kneel?2.75:1.5);}}
// ---- анимации персонажа: плавные переходы между клипами
function animRig(model,clips,o){const mixer=new T.AnimationMixer(model);const acts={};let cur=null;
 const get=n=>{n=String(n).toLowerCase();if(acts[n])return acts[n];const c=clips.find(a=>a.name.toLowerCase()===n);if(!c)return null;return acts[n]=mixer.clipAction(c);};
 const play=(name,fade,speed)=>{const a=get(name)||get('idle');if(!a)return;if(a===cur){if(speed!==undefined)a.timeScale=speed;return;}a.reset();a.setLoop(T.LoopRepeat,Infinity);a.clampWhenFinished=false;a.enabled=true;a.setEffectiveWeight(1);a.timeScale=speed===undefined?1:speed;a.play();if(cur&&fade>0)a.crossFadeFrom(cur,fade,false);else if(cur)cur.stop();cur=a;};
 const once=(name,fade,back)=>{const a=get(name);if(!a||a===cur)return false;a.reset();a.setLoop(T.LoopOnce,1);a.clampWhenFinished=true;a.timeScale=1;a.play();if(cur)a.crossFadeFrom(cur,fade||0.25,false);cur=a;const d=a.getClip().duration;clearTimeout(a._tm);a._tm=setTimeout(()=>{if(cur===a){cur=null;play(back||'idle',0.4);}},Math.max(300,(d-0.4)*1000));return true;};
 const want=(o&&o.anim)||'idle';if(want!=='none'){play(want,0,o&&o.speed);if(cur){cur.time=Math.random()*cur.getClip().duration;}}
 return {mixer,play,once,speedK:k=>{if(cur&&cur.loop!==T.LoopOnce)cur.timeScale=k;},get current(){return cur;}};}
// ---- люди: Ready Player Me аватар (three.js examples) + перекраска одежды, волосы, борода, речь
const hairTex=canvasTex(256,256,(x,w,h)=>{const r=rng(31);x.fillStyle='#808080';x.fillRect(0,0,w,h);for(let i=0;i<2600;i++){const v=90+r()*120|0;x.strokeStyle=`rgba(${v},${v},${v},.55)`;x.lineWidth=1;const px=r()*w,py=r()*h;x.beginPath();x.moveTo(px,py);x.lineTo(px+(r()-0.5)*6,py+10+r()*26);x.stroke();}},false,[3,3]);
const takiyaTex=ornamentTex('#1a1a1a','#d8c690',12,[4,1]);
function recolor(mat,hex,keep){const u={uTint:{value:C(hex)},uRef:{value:0.42},uKeep:{value:keep===undefined?1:keep}};mat.userData.tint=u;
 mat.onBeforeCompile=sh=>{Object.assign(sh.uniforms,u);sh.fragmentShader='uniform vec3 uTint;uniform float uRef;uniform float uKeep;\n'+sh.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
 {float lum=dot(diffuseColor.rgb,vec3(0.299,0.587,0.114));float sat=max(max(diffuseColor.r,diffuseColor.g),diffuseColor.b)-min(min(diffuseColor.r,diffuseColor.g),diffuseColor.b);
  float keepW=smoothstep(0.55,0.75,lum)*(1.0-smoothstep(0.06,0.16,sat))*uKeep;diffuseColor.rgb=mix(uTint*clamp(lum/uRef,0.25,1.6),diffuseColor.rgb,keepW);}`);};
 mat.customProgramCacheKey=()=>'tumarRecolor';mat.needsUpdate=true;}
function attachToBone(bone,obj,worldPos,worldQuat,worldScale){bone.updateMatrixWorld(true);const inv=new T.Matrix4().copy(bone.matrixWorld).invert();const m=new T.Matrix4().compose(worldPos,worldQuat,new T.Vector3(worldScale,worldScale,worldScale));m.premultiply(inv);m.decompose(obj.position,obj.quaternion,obj.scale);bone.add(obj);}
function makeHuman(ctx,L,o,g,sc){const model=T.SkeletonUtils.clone(A.rpm.scene);const tint={Wolf3D_Outfit_Top:L.top,Wolf3D_Outfit_Bottom:L.bot,Wolf3D_Outfit_Footwear:L.shoe};const morphs=[];let headBone=null;
 model.traverse(m=>{if(m.isBone&&m.name==='Head')headBone=m;if(!m.isMesh)return;m.frustumCulled=false;m.castShadow=true;m.receiveShadow=true;const n=m.name;
  if(n==='Wolf3D_Headwear'){m.visible=false;return;}if(n==='Wolf3D_Beard'&&!L.beard){m.visible=false;return;}
  const mat=m.material.clone();m.material=mat;if(tint[n])recolor(mat,tint[n],n==='Wolf3D_Outfit_Top'?1:0);
  if(n==='Wolf3D_Skin'||n==='Wolf3D_Body'||n==='Wolf3D_Head'){const k=L.skin||[1,0.85,0.72];mat.color.setRGB(k[0],k[1],k[2]);mat.roughness=0.62;}
  if(n==='Wolf3D_Beard'&&L.beard)recolor(mat,L.beard,0);
  if(m.morphTargetDictionary&&m.morphTargetDictionary.mouthOpen!==undefined)morphs.push(m);});
 model.scale.setScalar(sc);if(o.pose==='lie'){model.rotation.x=-Math.PI/2;model.position.y=0.1*sc;}if(o.pose==='sit')model.position.y=-0.46*sc;if(o.pose==='kneel')model.position.y=-0.78*sc;g.add(model);g.updateMatrixWorld(true);
 if(headBone&&L.hair&&!L.customHair){const mw=model.matrixWorld;const wq=new T.Quaternion(),wp=new T.Vector3(),ws=new T.Vector3();mw.decompose(wp,wq,ws);
  let cap;if(L.hair==='takiya'){cap=new T.Mesh(new T.CylinderGeometry(0.094,0.1,0.075,28,1,true),new T.MeshStandardMaterial({map:takiyaTex,roughness:0.8,side:T.DoubleSide}));const top=new T.Mesh(new T.CircleGeometry(0.094,28),new T.MeshStandardMaterial({color:C('#1a1a1a'),roughness:0.8}));top.rotation.x=-Math.PI/2;top.position.y=0.0375;cap.add(top);
   const pos=new T.Vector3(0,1.805,0.018).applyMatrix4(mw);attachToBone(headBone,cap,pos,wq.clone().multiply(new T.Quaternion().setFromEuler(new T.Euler(-0.12,0,0))),ws.x);}
  else{const full=L.hairStyle!=='receding';cap=new T.Mesh(new T.SphereGeometry(full?0.102:0.1,30,14,0,Math.PI*2,0,Math.PI*(full?0.53:0.5)),new T.MeshStandardMaterial({color:C(L.hair),roughness:0.75,bumpMap:hairTex,bumpScale:0.006}));cap.scale.set(0.96,full?0.93:0.9,1.08);
   const pos=new T.Vector3(0,full?1.742:1.738,full?0.016:0.008).applyMatrix4(mw);attachToBone(headBone,cap,pos,wq.clone().multiply(new T.Quaternion().setFromEuler(new T.Euler(full?-0.36:-0.55,0,0))),ws.x);
   if(L.hairStyle==='long'){const lh=new T.Mesh(new T.CylinderGeometry(0.098,0.135,0.36,24,1,true,Math.PI*0.42,Math.PI*1.16),new T.MeshStandardMaterial({color:C(L.hair),roughness:0.75,bumpMap:hairTex,bumpScale:0.006,side:T.DoubleSide}));lh.castShadow=true;
    attachToBone(headBone,lh,new T.Vector3(0,1.56,-0.012).applyMatrix4(mw),wq.clone(),ws.x);}}
  cap.castShadow=true;}
 if(window.LOOKS&&LOOKS.dress){try{LOOKS.dress({ctx,L,o,g,model,headBone,sc,morphs});}catch(e){console.warn('LOOKS.dress',e);}}
 const rig=animRig(model,A.rpmClips||[],o);const mixer=rig.mixer;g.userData.rig=rig;g.userData.play=rig.play;g.userData.animSpeed=rig.speedK;
 g.userData.pose=o.pose||null;g.userData.walking=!!o.walk;const B={};if(o.pose==='sit'||o.pose==='kneel')model.traverse(b=>{if(b.isBone)B['mixamorig'+b.name]=b;});const walk=o.walk;let wu=Math.random();let talk=0;
 g.userData.update=(dt,t)=>{if(g.userData.faceTo){const f=g.userData.faceTo.position;const a=Math.atan2(f.x-g.position.x,f.z-g.position.z);let d=((a-g.rotation.y+Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)-Math.PI;g.rotation.y+=d*Math.min(1,dt*5);}if(mixer)mixer.update(dt);if(o.pose==='sit'||o.pose==='kneel')poseSit(model,B,o.pose==='kneel');if(walk){wu+=dt*walk.speed/Math.hypot(walk.b[0]-walk.a[0],walk.b[1]-walk.a[1]);const k=wu%2,f=k<1?k:2-k;g.position.x=walk.a[0]+(walk.b[0]-walk.a[0])*f;g.position.z=walk.a[1]+(walk.b[1]-walk.a[1])*f;g.rotation.y=Math.atan2((walk.b[0]-walk.a[0])*(k<1?1:-1),(walk.b[1]-walk.a[1])*(k<1?1:-1));}
  const target=g.userData.speaking?(0.18+0.5*Math.abs(Math.sin(t*13.0))*(0.55+0.45*Math.sin(t*4.1))):0;talk+=(target-talk)*Math.min(1,dt*18);for(const m of morphs){const i=m.morphTargetDictionary.mouthOpen;m.morphTargetInfluences[i]=talk;const j=m.morphTargetDictionary.mouthSmile;if(j!==undefined)m.morphTargetInfluences[j]=o.smile||0;}};
 return g;}
function makeChar(ctx,look,o){o=o||{};const L=Object.assign({},typeof look==='string'?LOOK[look]:look,o.look||{});const g=new T.Group();g.position.set(o.x||0,o.y||0,o.z||0);g.rotation.y=o.ry||0;const sc=(o.scale||1)*(L.scale||1);
 ctx.scene.add(g);ctx.chars.push(g);if(typeof look==='string'&&!ctx.byKey[look])ctx.byKey[look]=g;
 if(L.human&&A.rpm&&A.rpmClips)return makeHuman(ctx,L,o,g,sc);
 if(L.human)L.skin=L.skin&&L.skin.length===3&&typeof L.skin[0]==='number'?'#c99a78':L.skin;
 if(!A.ok||(!A.xbot&&!L.soldier)||(L.soldier&&!A.soldier)){const f=fallbackFigure(L);f.scale.setScalar(sc);g.add(f);g.userData.update=()=>{};return g;}
 const src=L.soldier?A.soldier:A.xbot;const model=T.SkeletonUtils.clone(src.scene);let mat=null;
 if(!L.soldier)mat=L.holo?holoMat(L.holoC):charMat(L);const jmat=(!L.soldier&&!L.holo&&L.android)?charMat(L,true):mat;
 const blk=L.topan?new T.MeshStandardMaterial({color:C('#08090b'),roughness:0.22,metalness:0.75,skinning:true}):null;const vis=L.topan?new T.MeshBasicMaterial({color:C('#ff2a1a').multiplyScalar(5),skinning:true,toneMapped:false}):null;
 const holoS=(L.soldier&&L.holo)?holoMat(L.holoC||'#ff9a3a'):null;
 model.traverse(m=>{if(m.isMesh){m.frustumCulled=false;m.castShadow=!L.holo;m.receiveShadow=!L.holo;if(L.soldier){if(holoS)m.material=holoS;else if(L.topan)m.material=/visor/i.test(m.name)?vis:blk;}else m.material=(/Joints/.test(m.name)||m.name==='Mesh'?jmat:mat);}});// X Bot: Beta_Joints — суставы, Beta_Surface — корпус
 model.scale.setScalar(sc);if(L.led&&!L.holo&&!L.soldier){g.updateMatrixWorld(true);let head=null,body=null;model.traverse(b=>{if(b.isBone&&/Head$/.test(b.name))head=b;if(b.isSkinnedMesh&&b.name!=='Mesh')body=b;});if(head&&body){g.add(model);g.updateMatrixWorld(true);const wp=body.localToWorld(V(-0.1,1.664,0.028));head.worldToLocal(wp);const ws=new T.Vector3();head.getWorldScale(ws);const led=glow(L.led,0.045/ws.x,0.6);led.position.copy(wp);led.userData.noDepth=true;head.add(led);g.userData.led=led;g.remove(model);}}
 if(o.pose==='lie'){model.rotation.x=-Math.PI/2;model.position.y=0.12*sc;}if(o.pose==='sit')model.position.y=-0.46*sc;if(o.pose==='kneel')model.position.y=-0.78*sc;g.add(model);
 const rig=animRig(model,src.animations,o);const mixer=rig.mixer;g.userData.rig=rig;g.userData.play=rig.play;g.userData.animSpeed=rig.speedK;
 g.userData.pose=o.pose||null;g.userData.walking=!!o.walk;const B={};if(o.pose==='sit'||o.pose==='kneel')model.traverse(b=>{if(b.isBone)B[b.name]=b;});
 const walk=o.walk;let wu=Math.random();
 g.userData.update=(dt,t)=>{if(g.userData.faceTo){const f=g.userData.faceTo.position;const a=Math.atan2(f.x-g.position.x,f.z-g.position.z);let d=((a-g.rotation.y+Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)-Math.PI;g.rotation.y+=d*Math.min(1,dt*5);}if(mixer)mixer.update(dt);if(o.pose==='sit'||o.pose==='kneel')poseSit(model,B,o.pose==='kneel');if(g.userData.led){const sp=g.userData.speaking;g.userData.led.material.opacity=sp?0.65+0.35*Math.sin(t*9):0.9;}if(walk){wu+=dt*walk.speed/Math.hypot(walk.b[0]-walk.a[0],walk.b[1]-walk.a[1]);const k=wu%2,f=k<1?k:2-k;g.position.x=walk.a[0]+(walk.b[0]-walk.a[0])*f;g.position.z=walk.a[1]+(walk.b[1]-walk.a[1])*f;g.rotation.y=Math.atan2((walk.b[0]-walk.a[0])*(k<1?1:-1),(walk.b[1]-walk.a[1])*(k<1?1:-1));}};
 g.userData.mat=mat;return g;}

// ---------------- effects ----------------
function beam(color,r0,r1,h,op){const g=new T.CylinderGeometry(r0,r1,h,32,1,true);g.translate(0,-h/2,0);
 const m=new T.ShaderMaterial({uniforms:{c:{value:C(color)},op:{value:op||0.25}},transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,
  vertexShader:'varying float vY;varying vec3 vN;varying vec3 vV;void main(){vY=uv.y;vec4 mv=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}',
  fragmentShader:'uniform vec3 c;uniform float op;varying float vY;varying vec3 vN;varying vec3 vV;void main(){float e=pow(abs(dot(vN,vV)),1.6);float a=op*e*pow(vY,1.2);gl_FragColor=vec4(c,a);}'});
 const mesh=new T.Mesh(g,m);mesh.userData.noDepth=true;mesh.renderOrder=5;return mesh;}
function aimBeam(b,from,to){b.position.copy(from);const dir=new T.Vector3().subVectors(from,to).normalize();b.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),dir);}
// блик объектива без чтения буфера (совместим с MSAA): основной ореол + призраки вдоль оси экрана
const ghostTex=canvasTex(128,128,(x,w,h)=>{const g=x.createRadialGradient(64,64,20,64,64,62);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(0.7,'rgba(255,255,255,.12)');g.addColorStop(0.86,'rgba(255,255,255,.35)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,w,h);},false);
function flare(ctx,x,y,z,color,size,ghosts){const grp=new T.Group();grp.userData.noDepth=true;const col=C(color);const P=V(x,y,z);
 const mk=(map,op)=>{const s=new T.Sprite(new T.SpriteMaterial({map,color:col,transparent:true,opacity:op,blending:T.AdditiveBlending,depthWrite:false,depthTest:false,toneMapped:false}));s.renderOrder=20;grp.add(s);return s;};
 const main=mk(A.flare0||glowTex,0.85);main.material.depthTest=true;const gh=ghosts===false?[]:[[0.6,0.12,ghostTex],[0.75,0.2,ghostTex],[0.95,0.08,glowTex],[1.15,0.16,ghostTex]].map(q=>({d:q[0],k:q[1],s:mk(q[2],0.5)}));
 ctx.scene.add(grp);(ctx.flares=ctx.flares||[]).push(grp);const ndc=new T.Vector3(),dir=new T.Vector3(),tmp=new T.Vector3();
 ctx.ticks.push((t,dt,cam)=>{ndc.copy(P).project(cam);const on=ndc.z<1&&Math.abs(ndc.x)<1.3&&Math.abs(ndc.y)<1.3;grp.visible=on;if(!on)return;const H=window.innerHeight||720;const wpp=d=>2*Math.tan(cam.fov*Math.PI/360)*d/H;
  const dist=cam.position.distanceTo(P);main.position.copy(P);main.scale.setScalar(size*wpp(dist)*2.2);const edge=1-sm(clamp((Math.max(Math.abs(ndc.x),Math.abs(ndc.y))-0.7)/0.5,0,1));
  gh.forEach(g=>{tmp.set(ndc.x*(1-2*g.d),ndc.y*(1-2*g.d),0.5).unproject(cam);dir.subVectors(tmp,cam.position).normalize();g.s.position.copy(cam.position).addScaledVector(dir,2);g.s.scale.setScalar(size*g.k*wpp(2)*6);g.s.material.opacity=0.45*edge;});});
 return grp;}
function wetGround(ctx,w,d,o){o=o||{};const g=new T.PlaneGeometry(w,d);
 if(Q.water&&A.waterN&&T.Water){const wt=new T.Water(g,{textureWidth:Q.water,textureHeight:Q.water,waterNormals:A.waterN,sunDirection:new T.Vector3(...(o.sunDir||[0.3,1,-0.4])).normalize(),sunColor:C(o.sun||'#223344'),waterColor:C(o.color||'#0b0f14'),distortionScale:o.distort===undefined?0.6:o.distort,fog:!!ctx.scene.fog,alpha:1});
  wt.rotation.x=-Math.PI/2;wt.material.uniforms.size.value=o.size||5;const orig=wt.onBeforeRender;wt.onBeforeRender=function(r,sc,cam){if(sc.overrideMaterial)return;const fl=ctx.flares||[];fl.forEach(f=>f.visible=false);orig.call(this,r,sc,cam);fl.forEach(f=>f.visible=true);};ctx.ticks.push((t,dt)=>{wt.material.uniforms.time.value+=dt*(o.speed||0.25);});wt.receiveShadow=true;return wt;}
 const m=new T.Mesh(g,new T.MeshStandardMaterial({color:C(o.color||'#0b0f14'),roughness:0.1,metalness:0.5}));m.rotation.x=-Math.PI/2;m.receiveShadow=true;return m;}
// мокрый пол: PBR-поверхность + планарное отражение (Reflector) по маске луж + рябь от дождя
function wetFloor(ctx,w,d,o){o=o||{};const g=new T.PlaneGeometry(w,d,1,1);
 const mat=new T.MeshStandardMaterial({color:C(o.color||'#232427'),roughness:o.rough===undefined?0.6:o.rough,metalness:o.metal||0,map:o.map||null});
 const u={uRefl:{value:null},uTexMat:{value:new T.Matrix4()},uHas:{value:0},uWet:{value:o.wet===undefined?0.45:o.wet},uPud:{value:new T.Vector3(o.pudA===undefined?0.42:o.pudA,o.pudB===undefined?0.6:o.pudB,o.pudScale||0.32)},uRain:{value:o.rain||0},uRI:{value:o.reflI===undefined?1:o.reflI},uTime:GU.time};
 let mesh;if(Q.refl&&T.Reflector){mesh=new T.Reflector(g,{textureWidth:Q.refl,textureHeight:Math.round(Q.refl*0.5625),clipBias:0.002,type:T.HalfFloatType});u.uRefl.value=mesh.getRenderTarget().texture;u.uTexMat.value=mesh.material.uniforms.textureMatrix.value;u.uHas.value=1;mesh.material.dispose();mesh.material=mat;
  const orig=mesh.onBeforeRender;mesh.onBeforeRender=function(r,sc,cam){if(sc.overrideMaterial||cam.userData.noRefl)return;const fl=ctx.flares||[];fl.forEach(f=>f.visible=false);orig.call(this,r,sc,cam);fl.forEach(f=>f.visible=true);};}
 else mesh=new T.Mesh(g,mat);
 mat.onBeforeCompile=sh=>{Object.assign(sh.uniforms,u);
  sh.vertexShader='uniform mat4 uTexMat;varying vec4 vRUv;varying vec3 vWPos;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n vRUv=uTexMat*vec4(position,1.0);vWPos=(modelMatrix*vec4(position,1.0)).xyz;');
  sh.fragmentShader=`uniform sampler2D uRefl;uniform float uHas;uniform float uWet;uniform vec3 uPud;uniform float uRain;uniform float uRI;uniform float uTime;varying vec4 vRUv;varying vec3 vWPos;float gWet;
float wh(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float wn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(wh(i),wh(i+vec2(1.,0.)),f.x),mix(wh(i+vec2(0.,1.)),wh(i+vec2(1.,1.)),f.x),f.y);}
float wf(vec2 p){return wn(p)*0.55+wn(p*2.1+3.1)*0.3+wn(p*4.3+7.7)*0.15;}
`+sh.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
 {float pn=wf(vWPos.xz*uPud.z);float pud=smoothstep(uPud.x,uPud.y,pn);gWet=mix(uWet,1.0,pud);roughnessFactor=mix(roughnessFactor,0.05,gWet);diffuseColor.rgb*=1.0-0.55*gWet;}`)
  .replace('gl_FragColor = vec4( outgoingLight, diffuseColor.a );',`
 if(uHas>0.5){vec2 dist=vec2(wn(vWPos.xz*3.0+uTime*0.05)-0.5,wn(vWPos.zx*3.0-uTime*0.04)-0.5)*0.012*(1.0-gWet*0.6);
  if(uRain>0.0){vec2 rp=vWPos.xz*2.2;vec2 id=floor(rp);vec2 f=fract(rp)-0.5;float h=wh(id);float tt=fract(uTime*0.9+h);vec2 c=vec2(wh(id+1.3),wh(id+2.7))-0.5;vec2 dv=f-c*0.6;float dd=length(dv);float ring=sin((dd-tt*0.45)*70.0)*smoothstep(0.45*tt+0.06,0.45*tt,dd)*(1.0-tt);dist+=dv/(dd+1e-3)*ring*0.01*uRain;}
  vec4 ruv=vRUv;ruv.xy+=dist*ruv.w;vec3 refl=texture2DProj(uRefl,ruv).rgb;
  float fres=0.1+0.9*pow(1.0-clamp(dot(normalize(vViewPosition),normal),0.0,1.0),4.0);
  outgoingLight+=refl*gWet*fres*uRI;}
 gl_FragColor = vec4( outgoingLight, diffuseColor.a );`);};
 mat.customProgramCacheKey=()=>'tumarWet';mesh.rotation.x=-Math.PI/2;mesh.receiveShadow=true;mesh.userData.envMul=0.6;return mesh;}
function rain(ctx,n,area,color,at){n=Math.round(n*(0.5+0.5*Q.crowd));const pos=new Float32Array(n*6);const r=rng(3);for(let i=0;i<n;i++){const x=(r()-0.5)*area,y=r()*area*0.7,z=(r()-0.5)*area,l=0.35+r()*0.5;pos.set([x,y,z,x+0.04,y-l,z+0.02],i*6);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(pos,3));const m=new T.LineSegments(g,new T.LineBasicMaterial({color:C(color||'#a9bfd6'),transparent:true,opacity:0.3,depthWrite:false}));m.frustumCulled=false;ctx.scene.add(m);
 ctx.ticks.push((t,dt,cam)=>{const a=g.attributes.position.array;for(let i=0;i<n;i++){const k=i*6;a[k+1]-=dt*24;a[k+4]-=dt*24;a[k]+=dt*0.6;a[k+3]+=dt*0.6;if(a[k+4]<0){a[k+1]+=area*0.7;a[k+4]+=area*0.7;a[k]-=dt*0.6*40;a[k+3]-=dt*0.6*40;}}g.attributes.position.needsUpdate=true;if(at)m.position.set(at[0],at[1],at[2]);else m.position.set(cam.position.x,cam.position.y-area*0.3,cam.position.z);});
 // splashes
 if(at)return;const sp=[];const cnt=Math.round(40*Q.crowd)+10;for(let i=0;i<cnt;i++){const s=new T.Sprite(new T.SpriteMaterial({map:ringTex,color:C('#bcd4ea'),transparent:true,opacity:0,depthWrite:false}));s.userData.t=Math.random();ctx.scene.add(s);sp.push(s);}
 ctx.ticks.push((t,dt,cam)=>{sp.forEach(s=>{s.userData.t+=dt*2.2;if(s.userData.t>1){s.userData.t=0;s.position.set(cam.position.x+(Math.random()-0.5)*16,(ctx.groundY||0)+0.02,cam.position.z-Math.random()*16);}const k=s.userData.t;s.scale.set(0.05+k*0.35,(0.05+k*0.35)*0.35,1);s.material.opacity=(1-k)*0.5;});});}
function snow(ctx,n,area,wind,at){n=Math.round(n*(0.5+0.5*Q.crowd));const pos=new Float32Array(n*3);const r=rng(4);for(let i=0;i<n;i++)pos.set([(r()-0.5)*area,r()*area*0.6,(r()-0.5)*area],i*3);const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(pos,3));
 const m=new T.Points(g,new T.PointsMaterial({color:0xffffff,size:0.09,map:glowTex,transparent:true,opacity:0.9,depthWrite:false}));m.frustumCulled=false;ctx.scene.add(m);
 ctx.ticks.push((t,dt,cam)=>{const a=g.attributes.position.array;for(let i=0;i<n;i++){const k=i*3;a[k+1]-=dt*(0.9+(i%7)*0.12);a[k]+=dt*((wind||0.4)+Math.sin(t*0.7+i)*0.3);a[k+2]+=dt*Math.cos(t*0.5+i)*0.2;if(a[k+1]<0)a[k+1]+=area*0.6;if(a[k]>area/2)a[k]-=area;}g.attributes.position.needsUpdate=true;if(at)m.position.set(at[0],at[1],at[2]);else m.position.set(cam.position.x,cam.position.y-area*0.3,cam.position.z);});}
function dust(ctx,n,cx,cy,cz,sx,sy,sz,color){const pos=new Float32Array(n*3);const r=rng(7);for(let i=0;i<n;i++)pos.set([cx+(r()-0.5)*sx,cy+(r()-0.5)*sy,cz+(r()-0.5)*sz],i*3);const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(pos,3));
 const m=new T.Points(g,new T.PointsMaterial({color:C(color||'#ffe2b8'),size:0.018,map:glowTex,transparent:true,opacity:0.8,depthWrite:false,blending:T.AdditiveBlending}));ctx.scene.add(m);
 ctx.ticks.push((t,dt)=>{const a=g.attributes.position.array;for(let i=0;i<n;i++){const k=i*3;a[k]+=Math.sin(t*0.3+i)*dt*0.02;a[k+1]+=Math.cos(t*0.21+i*1.3)*dt*0.015;}g.attributes.position.needsUpdate=true;});}
function steam(ctx,x,y,z,color,op){op=op===undefined?1:op;const ps=[];for(let i=0;i<10;i++){const s=new T.Sprite(new T.SpriteMaterial({map:smokeTex,color:C(color||'#d8dde4'),transparent:true,opacity:0,depthWrite:false}));s.userData.t=i/10;ctx.scene.add(s);ps.push(s);}
 ctx.ticks.push((t,dt)=>{ps.forEach(s=>{s.userData.t+=dt*0.25;if(s.userData.t>1)s.userData.t-=1;const k=s.userData.t;s.position.set(x+Math.sin(k*5+t)*0.15,y+k*2.2,z);s.scale.setScalar(0.4+k*1.8);s.material.opacity=Math.sin(k*Math.PI)*0.35*op;});});}
function fire(ctx,x,y,z,sc){const g=new T.Group();g.position.set(x,y,z);const fl=[];for(let i=0;i<14;i++){const s=new T.Sprite(new T.SpriteMaterial({map:glowTex,color:C(i%3?'#ff8a2a':'#ffd06a'),transparent:true,opacity:0.8,blending:T.AdditiveBlending,depthWrite:false}));s.userData.t=Math.random();g.add(s);fl.push(s);}ctx.scene.add(g);
 ctx.ticks.push((t,dt)=>{fl.forEach((s,i)=>{s.userData.t+=dt*(1.2+i%3*0.3);if(s.userData.t>1)s.userData.t-=1;const k=s.userData.t;s.position.set(Math.sin(i*2.3+t*3)*0.06*sc,k*0.55*sc,Math.cos(i*1.7+t*2.5)*0.06*sc);s.scale.setScalar((0.45-k*0.35)*sc);s.material.opacity=(1-k)*0.85;});});return g;}
function hemi(s,sky,gr,i){const h=new T.HemisphereLight(C(sky),C(gr),i);s.add(h);return h;}
function keyL(ctx,o){const l=new T.DirectionalLight(C(o.c||'#9fb8ff'),o.i===undefined?1:o.i);l.position.set(...o.p);l.target.position.set(...(o.t||[0,0,0]));if(Q.shadow&&o.shadow!==false){l.castShadow=true;l.shadow.mapSize.set(Q.shadow,Q.shadow);const sc=l.shadow.camera;const r=o.r||12;sc.left=-r;sc.right=r;sc.top=r;sc.bottom=-r;sc.near=o.near||0.5;sc.far=o.far||300;l.shadow.bias=o.bias||-0.0004;l.shadow.normalBias=0.03;}ctx.scene.add(l,l.target);return l;}
function spotL(ctx,o){const l=new T.SpotLight(C(o.c),o.i,o.d||30,o.a||0.6,o.pen===undefined?0.5:o.pen,o.decay||1.2);l.position.set(...o.p);l.target.position.set(...o.t);if(Q.shadow&&o.shadow){l.castShadow=true;l.shadow.mapSize.set(Q.shadow/2,Q.shadow/2);l.shadow.bias=-0.0006;l.shadow.normalBias=0.02;}ctx.scene.add(l,l.target);return l;}
function pointL(ctx,c,i,d,x,y,z,gs){const l=new T.PointLight(C(c),i,d,1.6);l.position.set(x,y,z);ctx.scene.add(l);if(gs){const g=glow(c,gs,0.9);g.position.set(x,y,z);ctx.scene.add(g);l.userData.glow=g;}return l;}
function newCtx(o){const s=new T.Scene();const ctx=Object.assign({scene:s,chars:[],byKey:{},ticks:[],anchors:{},exposure:1,rainLens:0,focus:8,aperture:0.00035,envI:0.8,groundY:0,optional:{}},o);
 if(o.fog)s.fog=new T.FogExp2(C(o.fog[0]),o.fog[1]);if(o.bg)s.background=C(o.bg);if(o.env&&A.env[o.env])s.environment=A.env[o.env];
 if(o.sky){const sk=skyDome(o.sky);s.add(sk);ctx.skyMesh=sk;}return ctx;}
function finalize(ctx){ctx.scene.traverse(o=>{if(o.isMesh&&o.material){const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>{if(m.isMeshStandardMaterial)m.envMapIntensity=ctx.envI*(o.userData.envMul||1);});}});return ctx;}
const V=(x,y,z)=>new T.Vector3(x,y,z);

// ================= SCENES =================
const S={};
// ---- menu: крыша в центре Алматы, вид на горы ----
S.menu=()=>{const ctx=newCtx({env:'night',fog:['#161b28',0.00016],sky:{top:'#010309',hor:'#202c44',glow:'#e0824e',glowA:0.3,stars:1,cloud:0.45,cloudC:'#161d2c',moonDir:[-0.42,0.3,-0.86],moonC:'#e2ecff'},cam:{a:[-1.25,101.6,16.4],b:[-0.55,101.75,16.9],look:[0.9,101.1,0],lookB:[1.2,101.25,0],dur:70,fov:42},focus:4.6,aperture:0.00055,exposure:1.08,envI:0.9,rainLens:0.25});const s=ctx.scene;
 hemi(s,'#2a3a5a','#120c08',0.35);keyL(ctx,{c:'#b4c6f0',i:1.1,p:[-420,330,-60],t:[0,100,12],r:10,far:900,near:1});
 const rim=new T.DirectionalLight(C('#ffb070'),0.6);rim.position.set(60,40,-300);s.add(rim);
 s.add(range({z:-4300,h:2100,w:17000,d:3400,seed:2,snowLine:0.34}));s.add(range({z:-2500,h:560,w:11000,d:1100,seed:5,snowLine:0.95,rock:'#10151c',rock2:'#161c24',forest:'#0b100d'}));
 city(ctx,{x0:-2600,x1:2600,z0:-1950,z1:-30,grid:66,hmin:9,hmax:60,seed:21,boost:(x,z)=>1+1.8*Math.max(0,1-Math.hypot(x-150,z+650)/850),mats:[0,1,1,1,2]});
 smogLayer(ctx,70,'#ff9d5c',0.16);smogLayer(ctx,160,'#b9a4a0',0.07);
 const hk=hotelKazakhstan();hk.position.set(-230,0,-470);s.add(hk);const es=esentai();es.position.set(380,0,-820);s.add(es);
 const hill=ground({w:1400,d:900,seg:70,amp:30,scale:200,seed:6,color:'#0c1016',color2:'#161b22',fn:(x,z,y)=>y+260*Math.exp(-(x*x+z*z)/(2*260*260))});hill.position.set(-760,0,-1700);s.add(hill);
 const tv=tvTower(ctx);tv.position.set(-760,250,-1700);s.add(tv);flare(ctx,-760,622,-1700,'#ff3a2a',60,false);
 // крыша 30-этажки: мокрый бетон, ограждение по южному краю
 s.add(box(40,2,40,std({map:concreteTex,roughness:0.8,color:'#3a3936'}),0,99,30));
 const wet=wetFloor(ctx,40,40,{color:'#2a2a2c',map:concreteTex,rough:0.8,wet:0.3,rain:1,pudA:0.4,pudB:0.58,pudScale:0.25});wet.position.set(0,100.02,30);s.add(wet);
 const post=std({color:'#8a9098',metalness:0.85,roughness:0.3});for(let i=-12;i<=12;i++)s.add(box(0.06,1.1,0.06,post,i*1.2,100.55,10.4));s.add(box(29,0.08,0.1,std({color:'#b8c0c8',metalness:0.9,roughness:0.2}),0,101.1,10.4),box(29,0.05,0.06,post,0,100.6,10.4));
 const glassR=new T.Mesh(new T.PlaneGeometry(29,1.0),new T.MeshPhysicalMaterial({color:C('#a9c8e0'),transparent:true,opacity:0.12,roughness:0.05,metalness:0.1,depthWrite:false}));glassR.position.set(0,100.55,10.43);s.add(glassR);
 s.add(box(20,0.5,0.6,std({map:concreteTex,color:'#4a4845'}),0,100.25,10.1));
 s.add(box(3,1.6,2,std({color:'#6a6d72',metalness:0.5,roughness:0.5}),-9,100.8,22));s.add(box(1.4,1,1.2,std({color:'#5a5d62',metalness:0.5}),-6,100.5,24));
 const ac=box(2.4,1.2,1.4,std({color:'#7a7d82',metalness:0.6,roughness:0.4}),7.5,100.6,19);s.add(ac);steam(ctx,7.5,101.3,19,'#8a92a0',0.6);
 const ant=cyl(0.06,0.1,9,6,std({color:'#aab',metalness:0.8}),9.5,104.5,14);s.add(ant);const ag=glow('#ff2a1a',1.2);ag.position.set(9.5,109.1,14);s.add(ag);ctx.ticks.push(t=>{ag.material.opacity=Math.sin(t*2)>0?1:0.15;});
 const lamp=pointL(ctx,'#ffd7a0',1.4,14,-4,102.6,18.5,0.8);s.add(cyl(0.04,0.05,2.6,6,std({color:'#333',metalness:0.7}),-4,101.3,18.5));
 makeChar(ctx,'aya',{x:0.75,y:100,z:11.6,ry:Math.PI+0.1,anim:'idle'});
 rain(ctx,1400,30,'#b6c8dc');ctx.groundY=100;
 return finalize(ctx);};
// ---- квартира у ТЭЦ-2, утро, смог ----
function tulle(w,h,op){const t=canvasTex(256,512,(x,cw,ch)=>{const r=rng(17);x.clearRect(0,0,cw,ch);for(let i=0;i<cw;i+=3){const a=0.25+0.35*Math.sin(i*0.21)+r()*0.1;x.fillStyle=`rgba(255,255,255,${a*0.6})`;x.fillRect(i,0,2,ch);}x.globalAlpha=0.25;x.strokeStyle='#fff';for(let k=0;k<12;k++){x.beginPath();x.arc(128,40+k*40,14,0,7);x.stroke();}},true);
 const g=new T.PlaneGeometry(w,h,24,1);const p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i);p.setZ(i,Math.sin(x*9)*0.035);}g.computeVertexNormals();
 return new T.Mesh(g,new T.MeshStandardMaterial({map:t,transparent:true,opacity:op||0.8,side:T.DoubleSide,roughness:0.9,depthWrite:false,color:C('#f4efe6')}));}
function panelBlock(w,h,d,seed){const g=new T.Group();const b=new T.Mesh(new T.BoxGeometry(w,h,d),bMats[2]);b.position.y=h/2;g.add(b);
 const bal=std({color:'#6a655c',roughness:0.9});const r=rng(seed);for(let fl=1;fl<Math.floor(h/2.8);fl++)for(let k=0;k<Math.floor(w/3.2);k++){if(r()<0.45)continue;const bx=box(1.6,0.9,0.7,bal,-w/2+1.6+k*3.2,fl*2.8,d/2+0.35);g.add(bx);}
 return g;}
S.apartment=()=>{const ctx=newCtx({env:'interior',fog:['#3a414c',0.015],sky:{top:'#46505e',hor:'#7c7570',glow:'#c9a07a',glowA:0.15,cloud:1,cloudC:'#6a696e'},cam:{a:[2.35,1.56,2.2],b:[2.1,1.52,2.35],look:[-1.3,1.05,-0.85],lookB:[-1.15,1.08,-0.9],dur:40,fov:42},focus:3.9,aperture:0.0005,exposure:0.98,envI:0.1});const s=ctx.scene;
 hemi(s,'#7d8796','#2a2018',0.1);
 const W=6.4,H=2.7,D=5.6,z0=-D/2;
 const paper=canvasTex(256,256,(x,w,h)=>{x.fillStyle='#6f6656';x.fillRect(0,0,w,h);const r=rng(4);for(let i=0;i<8;i++){x.fillStyle='rgba(90,76,58,.35)';x.fillRect(i*32+12,0,8,h);}x.fillStyle='rgba(150,128,96,.28)';for(let j=0;j<8;j++)for(let i=0;i<8;i++){const cx=i*32+(j%2)*16,cy=j*32+16;x.beginPath();x.ellipse(cx,cy,5,7,0,0,7);x.fill();}for(let i=0;i<1500;i++){x.fillStyle=`rgba(0,0,0,${r()*0.05})`;x.fillRect(r()*w,r()*h,2,2);}},true,[5,2]);
 const wm=std({map:paper,roughness:0.95});
 const wallP=(w,h,x,y,z,ry)=>{const m=new T.Mesh(new T.PlaneGeometry(w,h),wm);m.position.set(x,y,z);m.rotation.y=ry||0;m.receiveShadow=true;s.add(m);const b=new T.Mesh(new T.BoxGeometry(w,h,0.2),new T.MeshBasicMaterial({colorWrite:false,depthWrite:false}));b.position.copy(m.position);b.rotation.y=ry||0;b.translateZ(-0.11);b.castShadow=true;s.add(b);return m;};
 wallP(D,H,-W/2,H/2,0,Math.PI/2);wallP(D,H,W/2,H/2,0,-Math.PI/2);wallP(W,H,0,H/2,D/2,Math.PI);
 const ww=2.4,wh=1.55,sill=0.85;wallP((W-ww)/2,H,-(W+ww)/4,H/2,z0,0);wallP((W-ww)/2,H,(W+ww)/4,H/2,z0,0);wallP(ww,sill,0,sill/2,z0,0);wallP(ww,H-sill-wh,0,sill+wh+(H-sill-wh)/2,z0,0);
 s.add(box(W,0.1,0.03,std({color:'#4a3a2a'}),0,0.05,z0+0.02));
 const fl=new T.Mesh(new T.PlaneGeometry(W,D),std({map:woodTex,roughness:0.38,color:'#8a6a4e'}));fl.rotation.x=-Math.PI/2;fl.receiveShadow=true;s.add(fl);
 const ce=new T.Mesh(new T.PlaneGeometry(W,D),std({color:'#9c968a'}));ce.rotation.x=Math.PI/2;ce.position.y=H;s.add(ce);
 const frame=std({color:'#d9d3c6',roughness:0.45});for(const q of [[ww+0.1,0.08,0,sill],[ww+0.1,0.08,0,sill+wh],[0.08,wh,-ww/2,sill+wh/2],[0.08,wh,ww/2,sill+wh/2],[0.06,wh,0,sill+wh/2]])s.add(box(q[0],q[1],0.14,frame,q[2],q[3],z0+0.02));
 s.add(box(ww+0.3,0.06,0.34,frame,0,sill-0.02,z0+0.16));
 const glassT=canvasTex(512,256,(x,w,h)=>{const r=rng(12);x.clearRect(0,0,w,h);for(let i=0;i<340;i++){const px=r()*w,py=r()*h,rr=0.8+r()*3;const g=x.createRadialGradient(px-rr*0.3,py-rr*0.3,0,px,py,rr);g.addColorStop(0,'rgba(255,255,255,.6)');g.addColorStop(1,'rgba(150,170,190,.06)');x.fillStyle=g;x.beginPath();x.arc(px,py,rr,0,7);x.fill();if(r()<0.18){x.fillStyle='rgba(200,220,240,.14)';x.fillRect(px-0.6,py,1.2,20+r()*70);}}},false);
 const glass=new T.Mesh(new T.PlaneGeometry(ww,wh),new T.MeshStandardMaterial({map:glassT,transparent:true,opacity:0.6,roughness:0.1,metalness:0.1,depthWrite:false,color:C('#aab4c0')}));glass.position.set(0,sill+wh/2,z0+0.01);s.add(glass);ctx.ticks.push((t,dt)=>{glassT.offset.y-=dt*0.012;});
 s.add(box(1.3,0.45,0.1,std({color:'#cfc9bd',metalness:0.3,roughness:0.5}),0,0.42,z0+0.12));
 const tl=tulle(1.2,2.35,0.75);tl.position.set(-1.0,1.4,z0+0.2);s.add(tl);const tr=tulle(0.9,2.35,0.7);tr.position.set(1.15,1.4,z0+0.2);s.add(tr);
 const drape=std({color:'#5a2a26',roughness:0.95});s.add(box(0.45,2.4,0.08,drape,-1.62,1.4,z0+0.28),box(0.45,2.4,0.08,drape,1.62,1.4,z0+0.28));
 const carpet=new T.Mesh(new T.PlaneGeometry(2.6,1.7),std({map:ornamentTex('#4e1014','#a07a38',4,[4,3]),roughness:1,color:'#b0a8a0'}));carpet.rotation.y=Math.PI/2;carpet.position.set(-W/2+0.02,1.55,0.2);s.add(carpet);
 const rug=new T.Mesh(new T.PlaneGeometry(2.6,1.8),std({map:ornamentTex('#3d0e12','#9a7a40',6,[4,3]),roughness:1,color:'#a8a098'}));rug.rotation.x=-Math.PI/2;rug.position.set(0.2,0.004,0.1);rug.receiveShadow=true;s.add(rug);
 const sofaM=std({color:'#4a2e22',roughness:0.85});s.add(box(0.8,0.42,2.2,sofaM,-2.75,0.21,0.2),box(0.2,0.55,2.2,sofaM,-3.08,0.7,0.2),box(0.8,0.2,0.22,sofaM,-2.75,0.52,1.2),box(0.8,0.2,0.22,sofaM,-2.75,0.52,-0.8));
 const tbl=std({color:'#5b3a20',roughness:0.35});s.add(box(1.3,0.05,0.8,tbl,0.75,0.74,-1.0));for(const sx of [-0.58,0.58])for(const sz of [-0.33,0.33])s.add(box(0.05,0.74,0.05,tbl,0.75+sx,0.37,-1.0+sz));
 const cloth=new T.Mesh(new T.PlaneGeometry(1.0,0.6),std({map:ornamentTex('#8a1d24','#e0b050',9,[2,1]),roughness:1}));cloth.rotation.x=-Math.PI/2;cloth.position.set(0.75,0.767,-1.0);s.add(cloth);
 const por=std({color:'#f0ebe0',roughness:0.2});const pot=new T.Mesh(new T.SphereGeometry(0.1,20,14),std({color:'#e8e2d4',roughness:0.2,map:ornamentTex('#f0ebe0','#2a5aa0',3,[3,1])}));pot.scale.y=0.85;pot.position.set(0.5,0.86,-1.02);pot.castShadow=true;s.add(pot);
 for(const q of [[0.9,-0.86],[1.1,-1.08],[0.7,-1.2]]){s.add(cyl(0.05,0.035,0.055,16,por,q[0],0.795,q[1]));}steam(ctx,0.9,0.85,-0.86,'#a8a4a0',0.35);
 const bowl=cyl(0.14,0.08,0.07,20,std({color:'#c9a24a',metalness:0.6,roughness:0.35}),1.12,0.8,-0.85);s.add(bowl);for(let i=0;i<9;i++){const b=new T.Mesh(new T.SphereGeometry(0.03,8,6),std({color:'#c98a3a',roughness:0.7}));b.position.set(1.12+(Math.random()-0.5)*0.14,0.84,-0.85+(Math.random()-0.5)*0.14);s.add(b);}
 const shelfM=std({color:'#3d2a1c',roughness:0.6});s.add(box(0.35,2.1,1.6,shelfM,W/2-0.2,1.05,-1.2));const br=rng(4);const bcols=['#5a1c1c','#1c3350','#33502a','#7a5d26','#262626','#4f3460'];for(let k=0;k<4;k++)for(let i=0;i<9;i++)s.add(box(0.22,0.28+br()*0.08,0.12,std({color:bcols[(br()*6)|0],roughness:0.8}),W/2-0.24,0.28+k*0.5,-1.9+i*0.16));
 const photo=new T.Mesh(new T.PlaneGeometry(0.22,0.28),std({map:canvasTex(128,160,(x,w,h)=>{x.fillStyle='#d8c9a8';x.fillRect(0,0,w,h);x.fillStyle='#6a5a48';x.fillRect(10,10,w-20,h-38);x.fillStyle='#2a1f18';x.beginPath();x.arc(w/2,56,22,0,7);x.fill();x.fillStyle='#caa27e';x.beginPath();x.arc(w/2,62,15,0,7);x.fill();x.fillStyle='#8a2436';x.fillRect(w/2-26,86,52,40);}),roughness:0.4}));photo.rotation.y=-Math.PI/2;photo.position.set(W/2-0.38,2.02,-0.8);s.add(photo);
 s.add(box(0.7,0.55,0.5,std({color:'#1e1e20',roughness:0.4}),W/2-0.5,0.8,1.3));const scr=new T.Mesh(new T.PlaneGeometry(0.52,0.38),emis('#3a5a88',1.4));scr.position.set(W/2-0.76,0.83,1.3);scr.rotation.y=-Math.PI/2;s.add(scr);
 const tvL=pointL(ctx,'#7aa6ff',0.8,5,W/2-1.0,0.9,1.3,0);ctx.ticks.push(t=>{const f=0.55+0.25*Math.sin(t*7.3)+0.2*Math.sin(t*17.1);tvL.intensity=f;scr.material.color.setRGB(0.25*f*2,0.4*f*2,0.7*f*2);});
 const clock=cyl(0.16,0.16,0.03,32,std({color:'#e8e0cc',roughness:0.4}),1.2,2.1,D/2-0.03);clock.rotation.x=Math.PI/2;s.add(clock);
 const rad=box(1.2,0.5,0.08,std({color:'#b8b4aa',metalness:0.4,roughness:0.5}),0,0.45,z0+0.1);s.add(rad);
 // экстерьер: панельки Нижнего города
 const ext=new T.Group();const rr=rng(8);for(let i=0;i<12;i++){const w=34+rr()*16,h=24+rr()*16;const b=panelBlock(w,h,12,i);b.position.set((i%6-2.5)*46+(rr()-0.5)*10,-12,-34-Math.floor(i/6)*58-rr()*10);ext.add(b);}
 const mosaic=new T.Mesh(new T.PlaneGeometry(12,16),std({map:canvasTex(256,320,(x,w,h)=>{x.fillStyle='#1d4a7a';x.fillRect(0,0,w,h);const r=rng(3);for(let i=0;i<900;i++){x.fillStyle=['#e8c050','#d84a3a','#f0e8d8','#3a8ac0'][(r()*4)|0];x.fillRect(r()*w,r()*h,6,6);}x.fillStyle='#f0e8d8';x.beginPath();x.arc(w/2,h*0.42,60,0,7);x.fill();x.fillStyle='#e8c050';for(let k=0;k<16;k++){const a=k/16*Math.PI*2;x.fillRect(w/2+Math.cos(a)*80-5,h*0.42+Math.sin(a)*80-5,10,10);}}),roughness:0.7}));mosaic.position.set(-23,4,-27.9);ext.add(mosaic);
 s.add(ext);s.add(range({z:-1300,h:700,w:5000,d:900,seed:4,snowLine:0.5,rock:'#5d5a58',rock2:'#6a6664',snow:'#b7b6b6'}));
 // свет: холодный рассвет из окна + тёплый торшер
 keyL(ctx,{c:'#a9bad0',i:2.0,p:[1.8,5.5,-9],t:[-0.3,0.2,0.4],r:4.5,far:30,bias:-0.0006});
 const lampL=pointL(ctx,'#ffb266',1.6,6,-2.3,1.55,1.6,0);lampL.castShadow=Q.shadow>0;if(lampL.castShadow){lampL.shadow.mapSize.set(512,512);lampL.shadow.bias=-0.002;}
 s.add(cyl(0.02,0.02,1.5,6,std({color:'#222'}),-2.3,0.75,1.6));const shade=new T.Mesh(new T.ConeGeometry(0.22,0.28,20,1,true),std({color:'#c9a47a',emissive:'#ff9a4a',emissiveIntensity:0.35,side:T.DoubleSide}));shade.position.set(-2.3,1.62,1.6);s.add(shade);
 const b=beam('#b9c8dc',0.9,2.1,4.4,0.055);aimBeam(b,V(0.1,2.25,z0-0.25),V(-0.25,0,0.9));s.add(b);dust(ctx,260,0,1.2,-0.8,2.4,2,2.6,'#e8eef8');
 rain(ctx,900,22,'#9aa0a8',[0,-6,-15]);ctx.groundY=-12;
 makeChar(ctx,'aya',{x:-0.45,z:-1.75,ry:0.75});makeChar(ctx,'ata',{x:-2.72,y:0,z:0.35,ry:Math.PI/2,pose:'sit'});
 // люстра: мягкий тёплый верхний свет, чтобы по комнате было видно, куда идти
 {const lp=cyl(0.28,0.22,0.06,32,std({color:'#f3e6cc',emissive:'#ffcf8f',emissiveIntensity:0.9,roughness:0.6}),0.2,2.66,0.1);s.add(lp);const cl=pointL(ctx,'#ffd2a0',0.85,7.5,0.2,2.35,0.1,0);cl.decay=1.4;}
 // очиститель воздуха «Вектор-Воздух» (фильтр 0%)
 {const pm=std({color:'#e4e6e8',roughness:0.35,metalness:0.1});const pu=box(0.42,0.95,0.34,pm,-1.95,0.475,-2.55);s.add(pu);const gr=new T.Mesh(new T.PlaneGeometry(0.3,0.5),std({map:canvasTex(64,128,(x,w,h)=>{x.fillStyle='#2a2c30';x.fillRect(0,0,w,h);x.fillStyle='#16171a';for(let i=0;i<h;i+=6)x.fillRect(0,i,w,3);}),roughness:0.8}));gr.position.set(-1.95,0.42,-2.379);s.add(gr);
  const ring=new T.Mesh(new T.RingGeometry(0.06,0.08,32),emis('#ff3a2a',3));ring.position.set(-1.95,0.82,-2.378);s.add(ring);const rg=glow('#ff3a2a',0.25,0.5);rg.position.set(-1.95,0.82,-2.36);s.add(rg);ctx.ticks.push(t=>{const k=0.55+0.45*Math.sin(t*3);ring.material.color.setRGB(3*k,0.2*k,0.15*k);rg.material.opacity=0.5*k;});
  const lab=textPlane('ВЕКТОР-ВОЗДУХ · ФИЛЬТР 0%',{w:0.34,h:0.04,color:'#ff6a5a',font:'600 64px "IBM Plex Mono", monospace',canvasW:1024,canvasH:128,intensity:1.2});lab.position.set(-1.95,0.9,-2.377);s.add(lab);}
 // кухонный уголок: столешница, чайник, синяя банка
 {const cm=std({color:'#d8d2c4',roughness:0.5}),top=std({color:'#6a5a4a',roughness:0.3});s.add(box(1.2,0.86,0.58,cm,1.85,0.43,2.49),box(1.24,0.05,0.62,top,1.85,0.885,2.48));const ket=cyl(0.075,0.09,0.17,20,std({color:'#b8bcc2',metalness:0.85,roughness:0.25}),1.55,0.995,2.42);s.add(ket);s.add(cyl(0.012,0.012,0.12,6,std({color:'#222'}),1.66,1.02,2.42));
  const jar=cyl(0.07,0.07,0.16,20,std({color:'#1d4fa8',roughness:0.3,map:ornamentTex('#1d4fa8','#e8e0cc',11,[2,1])}),2.2,0.99,2.5);s.add(jar);s.add(cyl(0.072,0.072,0.03,20,std({color:'#e8e0cc'}),2.2,1.085,2.5));
  for(let i=0;i<2;i++)s.add(cyl(0.045,0.035,0.06,14,std({color:'#f0ebe0',roughness:0.2}),1.85+i*0.12,0.94,2.38));steam(ctx,1.55,1.12,2.42,'#a8a4a0',0.25);}
 // входная дверь и Тимур (появляется после утренних дел)
 {const dm=std({color:'#5a4032',roughness:0.6});const door=box(0.95,2.05,0.06,dm,-1.25,1.025,D/2-0.04);s.add(door);s.add(cyl(0.02,0.02,0.1,8,std({color:'#c9a24a',metalness:0.9,roughness:0.3}),-0.88,1.0,D/2-0.1));
  const fr=std({color:'#3a2a20'});s.add(box(1.07,0.06,0.1,fr,-1.25,2.08,D/2-0.05),box(0.06,2.08,0.1,fr,-1.76,1.04,D/2-0.05),box(0.06,2.08,0.1,fr,-0.74,1.04,D/2-0.05));
  const dan=makeChar(ctx,'dan',{x:0.35,z:1.3,ry:-1.88});ctx.vis=[{o:dan,when:F=>!!F.home_done}];}
 ctx.colliders=[{t:'b',x:-2.75,z:0.2,w:0.8,d:2.2},{t:'b',x:-3.08,z:0.2,w:0.2,d:2.2},{t:'b',x:0.75,z:-1.0,w:1.3,d:0.8},{t:'b',x:3.0,z:-1.2,w:0.4,d:1.6},{t:'b',x:2.7,z:1.3,w:0.7,d:0.5},{t:'c',x:-2.3,z:1.6,r:0.2},{t:'b',x:1.85,z:2.48,w:1.24,d:0.62},{t:'b',x:-1.95,z:-2.55,w:0.44,d:0.36},{t:'b',x:0,z:-2.68,w:1.3,d:0.12}];
 ctx.walkArea={minX:-3.15,maxX:3.15,minZ:-2.75,maxZ:2.75};ctx.camBox={minX:-3.02,maxX:3.02,minY:0.35,maxY:2.5,minZ:-2.62,maxZ:2.66};ctx.points={after:[-1.85,0.95,-2.16]};
 return finalize(ctx);};
// ---- Верхний город: балкон 41 этажа ----
function nightCity(ctx,y,seed,o){o=o||{};city(ctx,Object.assign({y,x0:-1700,x1:1700,z0:-2100,z1:-40,grid:70,hmin:10,hmax:55,seed,boost:(x,z)=>1+1.1*Math.max(0,1-Math.hypot(x,z+620)/800),mats:[0,1,1,1],exclude:(x,z)=>Math.hypot(x,z)<120},o));ctx.scene.add(range({z:-4300,y:y-20,h:2000,w:17000,d:3400,seed:2,snowLine:0.34}));smogLayer(ctx,y+55,'#ff9d5c',0.15);}
S.tower=()=>{const ctx=newCtx({env:'night',fog:['#141c2c',0.00035],sky:{top:'#020409',hor:'#1d2a42',glow:'#e0824e',glowA:0.3,stars:0.5,cloud:0.75,cloudC:'#141b28',moonDir:[0.35,0.4,-0.85],moonC:'#dfe9ff'},cam:{a:[2.05,1.64,3.95],b:[1.7,1.68,4.05],look:[-0.9,1.3,-2.2],lookB:[-0.75,1.32,-2.25],dur:40,fov:40},focus:5.2,aperture:0.0006,exposure:1.05,envI:0.7,rainLens:0.3});const s=ctx.scene;
 hemi(s,'#34507a','#050608',0.25);nightCity(ctx,-160,33);
 const nb=new T.Mesh(new T.BoxGeometry(34,200,30),bMats[1]);nb.position.set(-80,-70,-70);s.add(nb);
 const holo=textPlane('ВЕКТОР · ЧИСТЫЙ ГОРОД · ДЫШИ СВОБОДНО',{w:110,h:13,color:'#6fd8f2',font:'600 88px "Exo 2", Arial',canvasW:2048,canvasH:256,intensity:2.2});holo.position.set(95,30,-270);holo.rotation.y=-0.35;s.add(holo);
 const fl=wetFloor(ctx,12,8,{color:'#1a1c20',map:concreteTex,rough:0.5,wet:0.55,rain:1,pudA:0.35,pudB:0.55,pudScale:0.5});s.add(fl);
 const railM=new T.MeshPhysicalMaterial({color:C('#9fc2e0'),transparent:true,opacity:0.16,roughness:0.04,metalness:0.1,depthWrite:false});const gl=new T.Mesh(new T.PlaneGeometry(12,1.1),railM);gl.position.set(0,0.55,-2.4);s.add(gl);s.add(box(12,0.06,0.08,std({color:'#c9d2dc',metalness:0.95,roughness:0.15}),0,1.12,-2.4));
 for(let i=-5;i<=5;i++)s.add(box(0.05,1.12,0.05,std({color:'#9aa4ae',metalness:0.9,roughness:0.2}),i*1.2,0.56,-2.4));
 const wallM=new T.MeshPhysicalMaterial({color:C('#0f1318'),roughness:0.08,metalness:0.8,clearcoat:1});const wall=box(12,4,0.3,wallM,0,2,4.2);s.add(wall);
 for(let i=-5;i<=5;i++)s.add(box(0.06,4,0.1,std({color:'#2a2e34',metalness:0.8,roughness:0.3}),i*1.1,2,4.02));
 const door=new T.Mesh(new T.PlaneGeometry(1.6,2.4),emis('#ffcf8a',0.8));door.position.set(1.6,1.2,4.04);door.rotation.y=Math.PI;s.add(door);
 const spill=spotL(ctx,{c:'#ffc98a',i:2.6,p:[1.6,2.2,3.9],t:[0.6,0,0],d:10,a:0.8,pen:0.8,shadow:true});
 keyL(ctx,{c:'#7f9fe0',i:0.55,p:[-6,9,-10],t:[0,0,0],r:6});
 makeChar(ctx,'dina',{x:-2.2,z:-1.8,ry:Math.PI-0.35});const vap=glow('#ff7a5a',0.08);vap.position.set(-2.05,1.6,-1.97);s.add(vap);ctx.ticks.push(t=>{const k=(t%6)<0.8?1:0.25;vap.material.opacity=k;vap.scale.setScalar(0.05+k*0.07);});steam(ctx,-1.98,1.65,-2.1,'#9aa2b0',0.6);
 makeChar(ctx,'erl',{x:1.5,z:-0.2,ry:-1.98});
 {const fm=new T.MeshPhysicalMaterial({color:C('#cfd8e2'),metalness:0.7,roughness:0.25,clearcoat:1});const body=cyl(0.55,0.6,2.1,40,fm,-4.6,1.05,3.55);s.add(body);const band=cyl(0.565,0.565,0.12,40,emis('#6fd8f2',2.2),-4.6,1.55,3.55);s.add(band);
  const dome=new T.Mesh(new T.SphereGeometry(0.55,32,16,0,Math.PI*2,0,Math.PI/2),new T.MeshPhysicalMaterial({color:C('#9fd6ff'),transparent:true,opacity:0.35,roughness:0.05,metalness:0.2,depthWrite:false}));dome.position.set(-4.6,2.1,3.55);s.add(dome);
  const fan=new T.Group();for(let i=0;i<5;i++){const b=box(0.08,0.02,0.4,std({color:'#223',metalness:0.8}),0,0,0.2);b.rotation.y=i/5*Math.PI*2;b.position.set(Math.sin(i/5*Math.PI*2)*0.2,0,Math.cos(i/5*Math.PI*2)*0.2);fan.add(b);}fan.position.set(-4.6,2.12,3.55);s.add(fan);ctx.ticks.push((t,dt)=>{fan.rotation.y+=dt*9;});
  const lab=textPlane('ВЕКТОР-ВОЗДУХ · ПРЕМИУМ',{w:0.95,h:0.12,color:'#bfe9ff',font:'600 80px "Exo 2", Arial',canvasW:1024,canvasH:128,intensity:1.4});lab.position.set(-4.6,1.25,2.93);lab.rotation.y=Math.PI;s.add(lab);pointL(ctx,'#6fd8f2',0.8,4,-4.6,1.6,2.9,0);}
 ctx.walkArea={minX:-5.75,maxX:5.75,minZ:-2.2,maxZ:3.95};ctx.colliders=[{t:'c',x:-4.6,z:3.55,r:0.62}];ctx.camBox={minX:-5.9,maxX:5.9,minY:0.5,maxY:3.8,minZ:-4.5,maxZ:3.95};ctx.points={after:[-1.0,-0.9,-2.21]};
 const drone=new T.Group();drone.add(box(0.9,0.22,0.9,std({color:'#1a1a1a',metalness:0.8})));const dl=glow('#ff3b3b',1.2);dl.position.y=-0.2;drone.add(dl);const db=beam('#bfe0ff',0.1,3,12,0.04);drone.add(db);drone.position.set(9,7,-14);s.add(drone);
 const dsp=spotL(ctx,{c:'#cfe6ff',i:0,p:[9,7,-14],t:[0,0,0],d:40,a:0.18,pen:0.5});
 ctx.ticks.push(t=>{drone.position.x=9+Math.sin(t*0.3)*4;drone.position.y=7+Math.sin(t*0.7)*0.4;db.rotation.z=Math.sin(t*0.5)*0.35;dl.material.opacity=Math.sin(t*6)>0?1:0.3;dsp.position.copy(drone.position);const k=Math.max(0,Math.sin(t*0.5+1.2));dsp.intensity=k*6;dsp.target.position.set(drone.position.x-9+Math.sin(t*0.5)*3,0,-1);});
 rain(ctx,1100,30,'#9fb4c9');ctx.groundY=0;
 return finalize(ctx);};
// ---- место преступления: зимний сад пентхауса ----
S.crime=()=>{const ctx=newCtx({env:'night',fog:['#101826',0.00035],sky:{top:'#020409',hor:'#1d2a42',glow:'#e0824e',glowA:0.3,stars:0.3,cloud:0.75,cloudC:'#141b28',moonDir:[0.35,0.4,-0.85],moonC:'#dfe9ff'},cam:{a:[-2.3,2.8,6.5],b:[-1.9,2.72,6.35],look:[0.5,0.6,-1.2],lookB:[0.7,0.62,-1.25],dur:50,fov:44},focus:6.4,aperture:0.0004,exposure:1.0,envI:0.55});const s=ctx.scene;
 hemi(s,'#2c3c58','#080808',0.18);nightCity(ctx,-160,34);
 const fl=wetFloor(ctx,16,12,{color:'#24262a',rough:0.25,metal:0.1,wet:0.25,pudA:0.62,pudB:0.8,pudScale:0.45,reflI:0.9});s.add(fl);
 const frameM=std({color:'#0c0e10',metalness:0.85,roughness:0.3});for(let i=-4;i<=4;i++)s.add(box(0.1,4.2,0.14,frameM,i*2,2.1,-5));s.add(box(16,0.2,0.3,frameM,0,4.2,-5));for(let z=-5;z<=5;z+=2.5)s.add(box(16,0.12,0.12,frameM,0,4.2,z));
 const gM=new T.MeshPhysicalMaterial({color:C('#9fb7cc'),transparent:true,opacity:0.1,roughness:0.03,metalness:0.2,depthWrite:false,side:T.DoubleSide});const gw=new T.Mesh(new T.PlaneGeometry(16,4.2),gM);gw.position.set(0,2.1,-5.02);s.add(gw);
 for(const x of [-7.9,7.9]){const sw=new T.Mesh(new T.PlaneGeometry(10,4.2),gM);sw.rotation.y=Math.PI/2;sw.position.set(x,2.1,0);s.add(sw);}
 const holeT=canvasTex(256,256,(x,w,h)=>{x.clearRect(0,0,w,h);x.strokeStyle='rgba(220,235,255,.85)';x.lineWidth=2;const r=rng(5);for(let i=0;i<22;i++){x.beginPath();x.moveTo(128,128);let px=128,py=128;const a=r()*Math.PI*2;for(let k=0;k<6;k++){px+=Math.cos(a+(r()-0.5)*0.6)*22;py+=Math.sin(a+(r()-0.5)*0.6)*22;x.lineTo(px,py);}x.stroke();}for(let k=1;k<4;k++){x.beginPath();x.arc(128,128,k*26+r()*8,0,7);x.stroke();}x.fillStyle='rgba(0,0,0,1)';x.globalCompositeOperation='destination-out';x.beginPath();x.ellipse(128,132,34,44,0.3,0,7);x.fill();},false);
 const crack=new T.Mesh(new T.PlaneGeometry(2.2,2.2),new T.MeshBasicMaterial({map:holeT,transparent:true,depthWrite:false,color:C('#cfe2ff')}));crack.position.set(4.2,1.8,-4.96);s.add(crack);
 const glassM=new T.MeshPhysicalMaterial({color:C('#bfe0ff'),transparent:true,opacity:0.35,roughness:0,metalness:0.3});const gr=rng(9);for(let i=0;i<22;i++){const sh=new T.Mesh(new T.ConeGeometry(0.05+gr()*0.14,0.012,3),glassM);sh.position.set(3.2+gr()*2.2,0.008,-4.6+gr()*1.9);sh.rotation.y=gr()*6;s.add(sh);}
 const pot=std({color:'#d9d3c8',roughness:0.35}),leaf=std({color:'#2a5222',roughness:0.7}),lem=std({color:'#f2cf3d',roughness:0.45,emissive:'#2a2000'});
 for(let i=0;i<5;i++){const g=new T.Group();g.add(box(0.5,0.45,0.5,pot,0,0.225,0));g.add(cyl(0.035,0.045,0.9,6,std({color:'#4a3622'}),0,0.85,0));const r=rng(i+3);for(let k=0;k<11;k++){const c=new T.Mesh(new T.IcosahedronGeometry(0.2+r()*0.13,1),leaf);c.position.set((r()-0.5)*0.65,1.3+r()*0.5,(r()-0.5)*0.65);c.castShadow=true;g.add(c);}for(let k=0;k<7;k++){const l=new T.Mesh(new T.SphereGeometry(0.045,10,8),lem);l.scale.y=1.25;l.position.set((r()-0.5)*0.62,1.18+r()*0.5,(r()-0.5)*0.62);g.add(l);}g.position.set(4.7+i*0.85,0,-0.9-i*0.85);s.add(g);}
 makeChar(ctx,'kim',{x:-0.6,z:0.6,ry:0.4,pose:'lie',anim:'idle',speed:0});const ring=new T.Mesh(new T.RingGeometry(1.15,1.19,64),emis('#6fd8f2',1.5));ring.rotation.x=-Math.PI/2;ring.position.set(-0.6,0.012,0.6);s.add(ring);
 const scan=new T.Mesh(new T.RingGeometry(0.02,1.15,64,1,0,0.5),new T.MeshBasicMaterial({color:C('#6fd8f2'),transparent:true,opacity:0.12,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide}));scan.rotation.x=-Math.PI/2;scan.position.set(-0.6,0.014,0.6);s.add(scan);ctx.ticks.push(t=>{scan.rotation.z=t*1.2;});
 for(let i=0;i<11;i++){const d=new T.Mesh(new T.CircleGeometry(0.03+Math.random()*0.03,12),emis('#2ab8ff',3.2));d.rotation.x=-Math.PI/2;d.position.set(0.8+i*0.4,0.013,1.0-i*0.28+Math.sin(i)*0.18);s.add(d);}
 pointL(ctx,'#2ab8ff',0.6,3,2.4,0.25,0.1,0);
 const markT=n=>canvasTex(128,128,(x,w,h)=>{x.fillStyle='#f2c230';x.fillRect(0,0,w,h);x.fillStyle='#111';x.font='900 90px Arial';x.textAlign='center';x.textBaseline='middle';x.fillText(n,64,68);});
 [[-0.1,1.4,'1'],[1.5,1.3,'2'],[3.8,-3.3,'3'],[-3,0.9,'4']].forEach(q=>{const m=new T.Mesh(new T.ConeGeometry(0.1,0.18,4),std({map:markT(q[2]),roughness:0.6}));m.position.set(q[0],0.09,q[1]);s.add(m);});
 s.add(box(1.8,0.06,0.9,std({color:'#202226',metalness:0.7,roughness:0.25}),-3.4,0.8,0.2));for(const sx of [-0.8,0.8])s.add(box(0.06,0.8,0.8,std({color:'#202226',metalness:0.7}),-3.4+sx,0.4,0.2));
 const holo=new T.Mesh(new T.CylinderGeometry(0.35,0.35,0.9,32,1,true),basic({color:'#6fd8f2',transparent:true,opacity:0.14,side:T.DoubleSide,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false}));holo.position.set(-3.4,1.3,0.2);s.add(holo);const hg=glow('#6fd8f2',1.6,0.5);hg.position.set(-3.4,1.3,0.2);s.add(hg);pointL(ctx,'#6fd8f2',0.8,4,-3.4,1.3,0.2,0);
 const tape=textPlane('ОТДЕЛ 7 · НЕ ВХОДИТЬ · ОТДЕЛ 7 · НЕ ВХОДИТЬ',{w:4.2,h:0.1,color:'#ffd23f',bg:'#2a2400',font:'700 72px "Exo 2", Arial',canvasW:2048,canvasH:96,intensity:0.9});tape.position.set(-5.2,0.95,2.6);tape.rotation.y=0.9;s.add(tape);
 makeChar(ctx,'saya',{x:5.5,z:-2.4,ry:-2.2,anim:'sneak_pose'});makeChar(ctx,'dina',{x:-2.3,z:2.1,ry:0.7});makeChar(ctx,'erl',{x:1.0,z:2.0,ry:-2.6});
 for(let i=0;i<5;i++){const st=new T.Mesh(new T.BoxGeometry(0.08,0.03,4.6),emis('#dff0ff',1.4));st.position.set(-4+i*2,4.12,0);s.add(st);}
 const flick=spotL(ctx,{c:'#e6f0ff',i:2.4,p:[0,4.1,0.8],t:[-0.4,0,0.6],d:12,a:0.75,pen:0.6,shadow:true});
 const pr=pointL(ctx,'#ff2030',0,22,-4,3.2,-7.5),pb=pointL(ctx,'#2040ff',0,22,4,3.2,-7.5);
 ctx.ticks.push(t=>{const f=Math.sin(t*6)>0;pr.intensity=f?3:0.2;pb.intensity=f?0.2:3;holo.rotation.y=t;flick.intensity=2.4*(Math.sin(t*37)>0.93?0.3:1);});
 rain(ctx,500,26,'#9fb4c9');ctx.groundY=-160;
 Object.assign(ctx.anchors,{body:V(-0.6,0.35,0.6),window:V(4.2,1.8,-4.9),coolant:V(2.0,0.05,0.4),holo:V(-3.4,1.3,0.2),saya:V(5.5,1.6,-2.4)});
 ctx.colliders=[{t:'b',x:-3.4,z:0.2,w:1.9,d:0.95},{t:'c',x:-0.7,z:0.4,r:0.3},{t:'c',x:-0.93,z:-0.18,r:0.32},{t:'c',x:-1.18,z:-0.75,r:0.3}];for(let i=0;i<5;i++)ctx.colliders.push({t:'c',x:4.7+i*0.85,z:-0.9-i*0.85,r:0.34});
 ctx.walkArea={minX:-7.6,maxX:7.6,minZ:-4.7,maxZ:5.6};ctx.camBox={minX:-7.7,maxX:7.7,minY:0.45,maxY:4.0,minZ:-4.8,maxZ:6.2};ctx.points={after:[4.25,-1.45,2.21]};
 return finalize(ctx);};
// ---- чертоги памяти: реконструкция ----
S.mind=()=>{const ctx=newCtx({bg:'#02060c',fog:['#02060c',0.055],cam:{a:[5.4,2.5,6.9],b:[-4.6,2.3,7.3],look:[0.5,1.0,-1],dur:36,fov:40},focus:7.6,aperture:0.0004,exposure:1.1,envI:0});const s=ctx.scene;
 const grid=new T.GridHelper(80,160,C('#1c5a70'),C('#0a2430'));grid.material.transparent=true;grid.material.opacity=0.55;s.add(grid);
 const eg=(geo,c,x,y,z,ry,k)=>{const l=new T.LineSegments(new T.EdgesGeometry(geo),new T.LineBasicMaterial({color:C(c),transparent:true,opacity:0.9}));l.material.color.multiplyScalar(k||2.2);l.position.set(x,y,z);l.rotation.y=ry||0;s.add(l);return l;};
 eg(new T.BoxGeometry(16,4.2,10),'#f29a3a',0,2.1,0);eg(new T.BoxGeometry(2.2,2.2,0.05),'#ff5a4e',4.2,1.8,-4.95,0,3);for(let i=0;i<5;i++)eg(new T.BoxGeometry(0.5,0.45,0.5),'#8fe07a',4.7+i*0.85,0.23,-0.9-i*0.85,0,1.4);
 for(let i=-4;i<=4;i++)eg(new T.BoxGeometry(0.1,4.2,0.1),'#f29a3a',i*2,2.1,-5,0,1.2);
 makeChar(ctx,{holo:1,holoC:'#6fd8f2'},{x:-0.6,z:0.6,ry:0.4,pose:'lie',anim:'idle',speed:0});
 makeChar(ctx,{soldier:1,holo:1,holoC:'#ff7a3a'},{x:3.2,z:-3.2,ry:-2.5,anim:'walk'});makeChar(ctx,{holo:1,holoC:'#b9e68f'},{x:5.4,z:-2.4,ry:-2.2,anim:'sneak_pose'});
 const path=new T.CatmullRomCurve3([V(4.2,1.8,-5.4),V(3.4,0.05,-3.6),V(1.6,0.05,-1.2),V(-0.2,0.05,0.4)]);const pl=new T.Line(new T.BufferGeometry().setFromPoints(path.getPoints(60)),new T.LineDashedMaterial({color:C('#ff7a3a'),dashSize:0.2,gapSize:0.12}));pl.computeLineDistances();pl.material.color.multiplyScalar(2.5);s.add(pl);
 const path2=new T.CatmullRomCurve3([V(0.8,0.05,1.0),V(2.6,0.05,-0.2),V(4.6,0.05,-1.8),V(5.4,0.05,-2.4)]);const pl2=new T.Line(new T.BufferGeometry().setFromPoints(path2.getPoints(60)),new T.LineDashedMaterial({color:C('#2ab8ff'),dashSize:0.12,gapSize:0.08}));pl2.computeLineDistances();pl2.material.color.multiplyScalar(3);s.add(pl2);
 const scanP=new T.Mesh(new T.PlaneGeometry(16,4.4),new T.MeshBasicMaterial({color:C('#6fd8f2'),transparent:true,opacity:0.06,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide}));scanP.position.y=2.2;s.add(scanP);const scanL=eg(new T.PlaneGeometry(16,4.4),'#6fd8f2',0,2.2,0,0,3);ctx.ticks.push(t=>{const z=5-((t*1.6)%10);scanP.position.z=z;scanL.position.z=z;});
 const frag=[];for(let i=0;i<14;i++){const txt=['SRK-310 · ОШИБКА ПАМЯТИ','ТЕМП. 41°C','0xA7F3 · СБОЙ','ОКНО · 23:14:07','ДРОН ВК-9','КИМ · ПУЛЬС 0','ПРОТОКОЛ 7','ЛИМОН · 3 ШТ'][i%8];const m=textPlane(txt,{w:1.6,h:0.2,color:i%3?'#6fd8f2':'#f29a3a',font:'500 60px "IBM Plex Mono", monospace',canvasW:1024,canvasH:128,intensity:1.6});m.position.set(-6+Math.random()*12,0.6+Math.random()*3.2,-4+Math.random()*7);m.rotation.y=(Math.random()-0.5)*0.8;s.add(m);frag.push(m);}
 ctx.ticks.push(t=>{frag.forEach((m,i)=>{m.material.opacity=0.35+0.65*Math.abs(Math.sin(t*0.7+i*1.7));m.position.y+=Math.sin(t+i)*0.0015;});});
 const pts=new Float32Array(1500);for(let i=0;i<500;i++)pts.set([(Math.random()-0.5)*18,Math.random()*5,(Math.random()-0.5)*12],i*3);const pg=new T.BufferGeometry();pg.setAttribute('position',new T.BufferAttribute(pts,3));s.add(new T.Points(pg,new T.PointsMaterial({color:C('#6fd8f2'),size:0.05,map:glowTex,transparent:true,blending:T.AdditiveBlending,depthWrite:false})));
 return finalize(ctx);};
// ---- (старая сцена-юрта, не используется) ----
const keregeTex=canvasTex(512,256,(x,w,h)=>{x.clearRect(0,0,w,h);x.lineCap='round';for(const [c,lw] of [['#5a2a10',9],['#c0702c',6]]){x.strokeStyle=c;x.lineWidth=lw;for(let i=-8;i<26;i++){x.beginPath();x.moveTo(i*32,0);x.lineTo(i*32+h,h);x.stroke();x.beginPath();x.moveTo(i*32+h,0);x.lineTo(i*32,h);x.stroke();}}x.fillStyle='#e8c890';for(let i=-8;i<26;i++)for(let k=0;k<=8;k++){const px=i*32+k*16,py=k*32;x.beginPath();x.arc(px%(w+64),py,3,0,7);x.fill();}},true,[14,1]);
const feltTex=canvasTex(256,256,(x,w,h)=>{const r=rng(3);x.fillStyle='#d9ccb4';x.fillRect(0,0,w,h);for(let i=0;i<6000;i++){const v=180+r()*60|0;x.fillStyle=`rgba(${v},${v-12},${v-30},.25)`;x.fillRect(r()*w,r()*h,2+r()*3,1+r()*2);}},true,[8,1]);
const baskurTex=canvasTex(1024,64,(x,w,h)=>{x.fillStyle='#8a1d24';x.fillRect(0,0,w,h);x.fillStyle='#e8d6a8';for(let i=0;i<w;i+=32){x.beginPath();x.moveTo(i,h*0.2);x.lineTo(i+16,h*0.5);x.lineTo(i,h*0.8);x.lineTo(i-16,h*0.5);x.fill();}x.fillStyle='#1d3a7a';for(let i=16;i<w;i+=32){x.fillRect(i-4,h*0.4,8,h*0.2);}x.fillStyle='#e0b050';x.fillRect(0,0,w,5);x.fillRect(0,h-5,w,5);},true,[6,1]);
function dombra(){const g=new T.Group();const wood=std({color:'#8a4a1e',roughness:0.4});const body=new T.Mesh(new T.SphereGeometry(0.16,24,16),wood);body.scale.set(1,1.35,0.45);g.add(body);const neck=box(0.045,0.62,0.03,std({color:'#5a2e12',roughness:0.5}),0,0.52,0.02);g.add(neck);const head=box(0.06,0.12,0.04,wood,0,0.88,0.02);g.add(head);const hole=new T.Mesh(new T.CircleGeometry(0.035,16),std({color:'#1a0d05'}));hole.position.set(0,0.02,0.075);g.add(hole);for(const sx of [-0.008,0.008]){const st=box(0.002,0.9,0.002,std({color:'#ddd',metalness:0.8}),sx,0.42,0.045);g.add(st);}return g;}
function yurt(storm){const ctx=newCtx({env:'interior',bg:storm?'#0b111c':'#04060b',fog:[storm?'#1c2636':'#120c08',storm?0.05:0.06],cam:{a:[0.75,1.12,1.95],b:[-0.2,1.16,2.05],look:[0.1,0.9,-1.3],lookB:[0.2,0.93,-1.3],dur:50,fov:44},focus:3.3,aperture:0.0006,exposure:storm?1.0:0.9,envI:0.02});const s=ctx.scene;
 hemi(s,storm?'#4a5f80':'#3a2618','#0c0806',storm?0.2:0.03);
 const R=4.4,Hw=1.7,Hr=1.65;
 const felt=new T.Mesh(new T.CylinderGeometry(R+0.05,R+0.05,Hw,64,1,true),std({map:feltTex,side:T.BackSide,roughness:1,color:storm?'#7a8490':'#7a6c5a'}));felt.position.y=Hw/2;felt.receiveShadow=true;s.add(felt);
 const ker=new T.Mesh(new T.CylinderGeometry(R,R,Hw,96,1,true),new T.MeshStandardMaterial({map:keregeTex,side:T.BackSide,transparent:true,alphaTest:0.4,roughness:0.6}));ker.position.y=Hw/2;ker.castShadow=true;s.add(ker);
 const bask=new T.Mesh(new T.CylinderGeometry(R-0.02,R-0.02,0.22,96,1,true),std({map:baskurTex,side:T.BackSide,roughness:0.9}));bask.position.y=Hw-0.11;s.add(bask);
 const roof=new T.Mesh(new T.CylinderGeometry(0.98,R+0.05,Hr,64,1,true),std({color:storm?'#4a4e56':'#3a2a1e',side:T.BackSide,roughness:1,map:feltTex}));roof.position.y=Hw+Hr/2;s.add(roof);
 const wood=std({color:'#8a3418',roughness:0.6});for(let i=0;i<64;i++){const a=i/64*Math.PI*2;const p0=V(Math.cos(a)*R*0.985,Hw,Math.sin(a)*R*0.985),p1=V(Math.cos(a)*0.97,Hw+Hr,Math.sin(a)*0.97);const len=p0.distanceTo(p1);const u=new T.Mesh(new T.CylinderGeometry(0.02,0.028,len,6),wood);u.position.copy(p0).lerp(p1,0.5);u.lookAt(p1);u.rotateX(Math.PI/2);s.add(u);}
 const ring=new T.Mesh(new T.TorusGeometry(0.97,0.08,10,48),wood);ring.rotation.x=Math.PI/2;ring.position.y=Hw+Hr;s.add(ring);for(const a of [0,Math.PI/3,-Math.PI/3]){const c=new T.Mesh(new T.TorusGeometry(0.95,0.035,6,32,Math.PI),wood);c.rotation.y=a;c.position.y=Hw+Hr;s.add(c);}
 const sk=skyDome({top:storm?'#1c2533':'#01030a',hor:storm?'#2c3a52':'#0b1430',stars:storm?0:1.6,mw:storm?0:1.2,mwN:[0.9,0.1,0.4],moonDir:[0.15,1,0.1],moonC:'#dfe9ff',cloud:storm?1:0.1,cloudC:storm?'#3a4658':'#1a2238'});s.add(sk);
 const floor=new T.Mesh(new T.CircleGeometry(R,64),std({map:ornamentTex('#4a1216','#b88a44',5,[5,5]),roughness:1,color:storm?'#8a8e96':'#a09890'}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;s.add(floor);
 for(const q of [[-1.6,0.6,0.6,'#1d2e5a'],[1.8,-0.4,-0.5,'#5a1d24'],[0.3,1.6,0.2,'#2a4a2a']]){const rg=new T.Mesh(new T.PlaneGeometry(1.8,1.1),std({map:ornamentTex(q[3],'#d8b060',q[0]*10|0,[3,2]),roughness:1}));rg.rotation.x=-Math.PI/2;rg.rotation.z=q[2];rg.position.set(q[0],0.004,q[1]);rg.receiveShadow=true;s.add(rg);}
 const tbl=cyl(0.62,0.62,0.06,40,std({color:'#5a2e14',roughness:0.35}),-0.25,0.3,-0.35);s.add(tbl);for(let k=0;k<4;k++){const a=k/4*Math.PI*2+0.4;s.add(cyl(0.04,0.04,0.28,6,std({color:'#3a1e0c'}),Math.cos(a)*0.6,0.14,-0.35+Math.sin(a)*0.6));}
 const kese=std({color:storm?'#dfe9f5':'#f1ece2',roughness:0.2,map:ornamentTex(storm?'#e4ecf6':'#f4efe4','#2a5aa0',3,[3,1])});for(let i=0;i<5;i++){const a=i*1.26;s.add(cyl(0.06,0.04,0.06,16,kese,Math.cos(a)*0.46,0.36,-0.35+Math.sin(a)*0.46));}
 const teapot=new T.Mesh(new T.SphereGeometry(0.11,20,14),kese);teapot.scale.y=0.8;teapot.position.set(0.1,0.42,-0.3);s.add(teapot);
 for(let i=0;i<14;i++){const b=new T.Mesh(new T.SphereGeometry(0.028,8,6),std({color:i%3?'#c98a3a':'#6a2a1a',roughness:0.7}));b.position.set(-0.22+Math.random()*0.2,0.36,-0.15+Math.random()*0.18);s.add(b);}
 const sandyk=(x,z,ry)=>{const g=new T.Group();g.add(box(1.2,0.6,0.6,std({map:ornamentTex('#4a2410','#d8b060',7,[2,1]),roughness:0.6}),0,0.3,0));const kc=['#8a1d24','#1d4a8a','#caa050','#2a6a3a','#6a2a6a','#d8d0c0'];for(let i=0;i<6;i++)g.add(box(1.25,0.1,0.66,std({color:kc[i],roughness:1}),0,0.65+i*0.1,0));g.position.set(x,0,z);g.rotation.y=ry;s.add(g);};
 sandyk(-3.3,-1.9,0.9);sandyk(3.2,-2.1,-0.95);
 const tus=new T.Mesh(new T.PlaneGeometry(2.6,1.35),std({map:ornamentTex('#1a2250','#e0c070',9,[3,2]),roughness:1}));tus.position.set(0,1.05,-R+0.3);s.add(tus);
 const dom=dombra();dom.position.set(-2.2,1.25,-3.55);dom.rotation.set(0.1,0.55,-0.35);s.add(dom);
 makeChar(ctx,'ana',{x:0,z:-1.45,ry:0,pose:storm?null:'kneel',anim:storm?'sad_pose':'idle'});const ag=glow('#d8c8ff',2.4,0.22);ag.position.set(0,1.1,-1.45);s.add(ag);pointL(ctx,'#b9a6ff',0.7,4,0,1.2,-1.2,0);
 const hearth=new T.Group();for(let i=0;i<12;i++){const st=new T.Mesh(new T.DodecahedronGeometry(0.08,0),std({color:'#3a3632',roughness:1}));st.position.set(Math.cos(i/12*6.28)*0.3,0.04,Math.sin(i/12*6.28)*0.3);st.castShadow=true;hearth.add(st);}hearth.position.set(1.45,0,-0.15);s.add(hearth);
 if(!storm){fire(ctx,1.45,0.05,-0.15,1.1);steam(ctx,1.45,0.9,-0.15,'#4a4440');}else{for(let i=0;i<6;i++){const e=glow('#ff5a1a',0.12,0.8);e.position.set(1.45+(Math.random()-0.5)*0.3,0.05,-0.15+(Math.random()-0.5)*0.3);s.add(e);}}
 const fl=pointL(ctx,storm?'#ff6a2a':'#ff8a3a',storm?0.4:2.4,8,1.45,0.55,-0.15,0);if(Q.shadow&&!storm){fl.castShadow=true;fl.shadow.mapSize.set(1024,1024);fl.shadow.bias=-0.003;fl.shadow.camera.near=0.1;}
 const mb=beam(storm?'#9fb8ff':'#aebfff',0.9,1.55,3.4,storm?0.16:0.1);mb.position.set(0,Hw+Hr+0.05,0);s.add(mb);spotL(ctx,{c:storm?'#9fb8ff':'#9fb2ff',i:storm?3.5:1.3,p:[0,6,0],t:[0,0,0],d:12,a:0.33,pen:0.4,shadow:true});
 dust(ctx,260,0,1.4,0,2,2.6,2,storm?'#dfe9ff':'#ffd8a8');if(storm)snow(ctx,1100,9,1.6);
 ctx.ticks.push(t=>{if(!storm)fl.intensity=2.4+Math.sin(t*11)*0.3+Math.sin(t*23)*0.2+Math.sin(t*5.3)*0.2;});
 return finalize(ctx);}
S.yurt=()=>yurt(false);S.yurt_storm=()=>yurt(true);
// ---- станция Туюксу-2: морена, талое озеро, звёзды ----
function stH(x,z){return (fbm(x/60,z/60,12,5)-0.45)*12+Math.max(0,-z-30)*0.2+Math.max(0,Math.abs(x)-70)*0.22-14*Math.exp(-((x+40)*(x+40)+(z+55)*(z+55))/(2*38*38));}
S.station=()=>{const y0=stH(0,0);const ctx=newCtx({env:'night',fog:['#141c2e',0.0011],sky:{top:'#01030b',hor:'#1b2842',stars:1.5,mw:1.3,mwN:[0.45,0.35,0.82],moonDir:[-0.55,0.35,-0.75],moonC:'#e2ecff',cloud:0.15,cloudC:'#1a2233'},cam:{a:[-2,stH(-2,16)+1.7,16],b:[-0.8,stH(-0.8,16.4)+1.75,16.4],look:[-14,y0+1.2,-20],lookB:[-13,y0+1.3,-20],dur:55,fov:42},focus:10.5,aperture:0.0003,exposure:1.08,envI:0.6});const s=ctx.scene;
 hemi(s,'#34496e','#0a0c12',0.22);keyL(ctx,{c:'#a9c4ff',i:0.65,p:[-60,50,-40],t:[-4,y0,4],r:16,far:200});
 s.add(range({z:-2300,h:1500,w:9000,d:2800,seed:8,snowLine:0.2,rock:'#262c38',rock2:'#343a46'}));s.add(range({z:-900,x:-300,h:600,w:3000,d:900,seed:9,snowLine:0.3,rock:'#2a2e36',rock2:'#383c44'}));
 const ter=ground({w:420,d:420,seg:170,amp:0,scale:60,seed:12,color:'#343436',color2:'#4e4a46',snow:'#9aa6b8',snowSlope:0.86,snowN:0.55,fn:(x,z)=>stH(x,z)});s.add(ter);
 const r=rng(3);const rockM=new T.MeshStandardMaterial({vertexColors:true,roughness:0.95});const rg=new T.DodecahedronGeometry(1,1);{const p=rg.attributes.position;const col=[];for(let i=0;i<p.count;i++){const y=p.getY(i);const n=Math.random();const c=y>0.8?C('#8e98a6'):C(n<0.5?'#3e3a38':'#4a4642');col.push(c.r,c.g,c.b);p.setXYZ(i,p.getX(i)*(0.85+Math.random()*0.3),y*(0.8+Math.random()*0.3),p.getZ(i)*(0.85+Math.random()*0.3));}rg.setAttribute('color',new T.Float32BufferAttribute(col,3));rg.computeVertexNormals();}
 for(let i=0;i<90;i++){const x=(r()-0.5)*170,z=(r()-0.5)*170;if(Math.hypot(x,z-6)<9)continue;const rk=new T.Mesh(rg,rockM);const sc=0.3+Math.pow(r(),2)*2.4;rk.scale.set(sc*(0.8+r()*0.5),sc*(0.6+r()*0.4),sc*(0.8+r()*0.5));rk.position.set(x,stH(x,z)-sc*0.25,z);rk.rotation.set(r()*0.4,r()*6,r()*0.4);rk.castShadow=true;rk.receiveShadow=true;s.add(rk);}
 const lake=wetGround(ctx,150,110,{color:'#07121c',sun:'#9fb8ff',sunDir:[-0.55,0.35,-0.75],size:2,distort:0.9,speed:0.12});lake.position.set(-40,stH(-40,-55)+4.5,-55);s.add(lake);
 const iceM=new T.MeshPhysicalMaterial({color:C('#9fc8e8'),roughness:0.25,metalness:0,clearcoat:1,transparent:true,opacity:0.9});const lakeY=stH(-40,-55)+4.5;for(let i=0;i<9;i++){const ic=new T.Mesh(new T.DodecahedronGeometry(1.5+r()*3.5,1),iceM);const x=-75+r()*70,z=-30-r()*60;ic.scale.set(1,0.08,0.7+r()*0.6);ic.rotation.y=r()*6;ic.position.set(x,lakeY+0.05,z);s.add(ic);}
 const hut=new T.Group();const boards=canvasTex(256,256,(x,w,h)=>{x.fillStyle='#7a2a24';x.fillRect(0,0,w,h);x.fillStyle='rgba(0,0,0,.3)';for(let i=0;i<16;i++)x.fillRect(0,i*16,w,2);const r=rng(4);for(let i=0;i<600;i++){x.fillStyle='rgba(255,255,255,.05)';x.fillRect(r()*w,r()*h,20,1);}},true,[2,1]);
 hut.add(box(9,3.6,6.5,std({map:boards,roughness:0.85}),0,1.8,0));const rf=new T.Mesh(new T.CylinderGeometry(0.01,5.8,2.4,4,1),std({color:'#3a3d42',roughness:0.45,metalness:0.6}));rf.rotation.y=Math.PI/4;rf.scale.set(1.15,1,0.85);rf.position.y=4.8;rf.castShadow=true;hut.add(rf);
 const snowRoof=new T.Mesh(new T.CylinderGeometry(0.01,5.85,2.42,4,1),std({color:'#dfe6ef',roughness:0.8}));snowRoof.rotation.y=Math.PI/4;snowRoof.scale.set(1.12,0.4,0.83);snowRoof.position.y=5.55;hut.add(snowRoof);
 for(const wx of [-2.2,2.2]){const w=new T.Mesh(new T.PlaneGeometry(1.3,0.95),emis('#ffb46a',1.6));w.position.set(wx,2.05,3.27);hut.add(w);hut.add(box(1.45,0.08,0.1,std({color:'#e8e0d0'}),wx,1.55,3.3));}
 const door=new T.Mesh(new T.PlaneGeometry(1.1,2.1),std({color:'#3a2a1a'}));door.position.set(0,1.05,3.27);hut.add(door);
 hut.add(cyl(0.08,0.12,13,6,std({color:'#aab',metalness:0.8}),3.6,6.5,-2.2));const dish=new T.Mesh(new T.SphereGeometry(0.9,20,12,0,Math.PI*2,0,Math.PI/3),std({color:'#cfd3d8',metalness:0.5,side:T.DoubleSide}));dish.rotation.x=-1.2;dish.position.set(-3.4,4.2,-1.5);hut.add(dish);
 for(let i=0;i<3;i++){const sp=box(1.6,0.05,1.0,std({color:'#142a4a',metalness:0.7,roughness:0.2}),-5.6,0.9,-1.5+i*1.2);sp.rotation.z=0.5;hut.add(sp);}
 const sign=textPlane('ЛЕДНИК-2 · 3400 м',{w:3.4,h:0.5,color:'#e9e4d8',font:'600 100px "Exo 2", Arial',intensity:0.8});sign.position.set(0,3.2,3.28);hut.add(sign);hut.position.set(0,y0,0);s.add(hut);
 pointL(ctx,'#ffb46a',2.6,20,0,y0+2.9,4.4,1.0);const ws=spotL(ctx,{c:'#ffb46a',i:1.6,p:[0,y0+2.9,4.2],t:[0,y0,9],d:18,a:0.9,pen:0.7,shadow:true});flare(ctx,0,y0+2.9,4.2,'#ffc27a',55);
 const red=glow('#ff3030',2.2);red.position.set(3.6,y0+13.1,-2.2);s.add(red);ctx.ticks.push(t=>{red.material.opacity=Math.sin(t*2)>0?1:0.2;});
 makeChar(ctx,'zh',{x:-4.6,y:stH(-4.6,6.4),z:6.4,ry:0.26});makeChar(ctx,'bori',{x:-6.6,y:stH(-6.6,4.6),z:4.6,ry:Math.PI+0.5});makeChar(ctx,'sulu',{x:-3.2,y:stH(-3.2,5.2),z:5.2,ry:-1.2});
 snow(ctx,900,50,0.6);
 return finalize(ctx);};
S.station_in=()=>{const ctx=newCtx({env:'interior',bg:'#07080a',fog:['#110f0c',0.06],cam:{a:[2.2,1.62,2.1],b:[1.75,1.58,2.3],look:[-0.5,1.2,-1.8],lookB:[-0.35,1.22,-1.85],dur:45,fov:44},focus:3.4,aperture:0.0006,exposure:1.0,envI:0.1});const s=ctx.scene;
 hemi(s,'#3a2e22','#060504',0.12);const W=6,H=2.6,D=5;const planks=canvasTex(256,256,(x,w,h)=>{const r=rng(2);for(let i=0;i<16;i++){const b=58+r()*28|0;x.fillStyle=`rgb(${b},${b*0.74|0},${b*0.52|0})`;x.fillRect(i*16,0,16,h);x.fillStyle='rgba(0,0,0,.45)';x.fillRect(i*16,0,1,h);for(let k=0;k<6;k++){x.fillStyle='rgba(0,0,0,.12)';x.fillRect(i*16+r()*14,r()*h,2,6+r()*20);}}},true,[3,1]);const wm=std({map:planks,roughness:0.85});
 for(const w of [[0,H/2,-D/2,0,W],[-W/2,H/2,0,Math.PI/2,D],[W/2,H/2,0,-Math.PI/2,D]]){const m=new T.Mesh(new T.PlaneGeometry(w[4],H),wm);m.position.set(w[0],w[1],w[2]);m.rotation.y=w[3];m.receiveShadow=true;s.add(m);}
 const ce=new T.Mesh(new T.PlaneGeometry(W,D),std({map:planks,color:'#6a5a4a'}));ce.rotation.x=Math.PI/2;ce.position.y=H;s.add(ce);
 const fl=new T.Mesh(new T.PlaneGeometry(W,D),std({map:woodTex,color:'#5a4434',roughness:0.7}));fl.rotation.x=-Math.PI/2;fl.receiveShadow=true;s.add(fl);
 const win=new T.Mesh(new T.PlaneGeometry(0.9,0.7),emis('#2a3c66',0.9));win.rotation.y=-Math.PI/2;win.position.set(W/2-0.01,1.6,0.6);s.add(win);spotL(ctx,{c:'#8fa8e0',i:1.6,p:[W/2+1,2.2,0.6],t:[0,0,0.2],d:9,a:0.5,pen:0.6});
 const mapT=canvasTex(512,360,(x,w,h)=>{x.fillStyle='#d9ceb4';x.fillRect(0,0,w,h);x.strokeStyle='#5a4a3a';x.lineWidth=2;for(let i=0;i<14;i++){x.beginPath();for(let k=0;k<=40;k++){const px=k/40*w,py=h*0.1+i*22+Math.sin(k*0.4+i)*12;k?x.lineTo(px,py):x.moveTo(px,py);}x.stroke();}x.fillStyle='#2a5a8a';x.font='bold 28px serif';x.fillText('ЛЕДНИК-2 · 1998',20,40);x.strokeStyle='#c0392b';x.lineWidth=4;x.beginPath();x.moveTo(100,300);x.lineTo(300,160);x.stroke();},true);
 const map=new T.Mesh(new T.PlaneGeometry(1.7,1.2),std({map:mapT,roughness:0.9}));map.position.set(-1.3,1.72,-D/2+0.02);s.add(map);
 const photo=new T.Mesh(new T.PlaneGeometry(0.32,0.42),std({map:canvasTex(128,168,(x,w,h)=>{x.fillStyle='#e8e0d0';x.fillRect(0,0,w,h);x.fillStyle='#8a7a6a';x.fillRect(8,8,w-16,h-40);x.fillStyle='#c0392b';x.beginPath();x.arc(w/2,50,20,0,7);x.fill();x.fillStyle='#d9b090';x.beginPath();x.arc(w/2,62,14,0,7);x.fill();})}));photo.position.set(0.35,1.55,-D/2+0.02);s.add(photo);
 s.add(box(2.3,0.06,0.85,std({color:'#5a3a1e',roughness:0.45}),-1,0.86,-D/2+0.55));for(const sx of [-1.05,1.05])s.add(box(0.06,0.86,0.8,std({color:'#4a2e16'}),-1+sx,0.43,-D/2+0.55));
 for(let i=0;i<7;i++){const pp=new T.Mesh(new T.PlaneGeometry(0.21,0.29),std({color:'#efe8d8',roughness:0.9}));pp.rotation.x=-Math.PI/2;pp.rotation.z=(Math.random()-0.5)*0.7;pp.position.set(-1.7+i*0.2,0.895+i*0.001,-D/2+0.48+Math.random()*0.22);pp.receiveShadow=true;s.add(pp);}
 const crt=box(0.5,0.42,0.45,std({color:'#cfc6b4',roughness:0.5}),-0.2,1.1,-D/2+0.45);s.add(crt);const crs=new T.Mesh(new T.PlaneGeometry(0.36,0.28),emis('#7fe0a0',1.2));crs.position.set(-0.2,1.12,-D/2+0.68);s.add(crs);
 const note=new T.Mesh(new T.PlaneGeometry(0.28,0.36),std({color:'#f5f1e6'}));note.position.set(1.4,1.5,-D/2+0.02);note.rotation.z=0.05;s.add(note);const pin=glow('#ff3a2a',0.07);pin.position.set(1.4,1.66,-D/2+0.05);s.add(pin);
 const mug=cyl(0.04,0.04,0.09,14,std({color:'#8a2a2a',roughness:0.4}),-0.7,0.935,-D/2+0.7);s.add(mug);steam(ctx,-0.7,1.0,-D/2+0.7,'#6a5a4a',0.3);
 const srv=box(0.55,0.75,0.45,std({color:'#20242a',metalness:0.6,roughness:0.35,emissive:'#6fd8f2',emissiveIntensity:0.08}),0.35,0.38,0.5);s.add(srv);const sg=glow('#b9a6ff',0.5,0.6);sg.position.set(0.35,0.8,0.5);s.add(sg);const lbl=textPlane('ЕВА',{w:0.36,h:0.12,color:'#e9dcff',font:'700 150px "Exo 2", Arial',intensity:1.3});lbl.position.set(0.35,0.55,0.73);s.add(lbl);pointL(ctx,'#b9a6ff',0.5,3,0.35,0.9,0.7,0);
 const lampHead=new T.Mesh(new T.ConeGeometry(0.12,0.16,20,1,true),std({color:'#2a4a3a',side:T.DoubleSide,metalness:0.5}));lampHead.position.set(-1.2,1.38,-D/2+0.5);lampHead.rotation.x=0.3;s.add(lampHead);s.add(cyl(0.012,0.012,0.5,6,std({color:'#333'}),-1.25,1.13,-D/2+0.4));
 const lamp=spotL(ctx,{c:'#ffc57e',i:5,p:[-1.2,1.36,-D/2+0.55],t:[-1.0,0.86,-D/2+0.62],d:4,a:0.75,pen:0.55,decay:1.6,shadow:true});const lb=glow('#ffd9a8',0.25,0.8);lb.position.set(-1.2,1.32,-D/2+0.52);s.add(lb);
 pointL(ctx,'#ffb46a',0.5,6,-0.5,2.3,0.2,0);dust(ctx,160,-0.9,1.3,-1.6,1.6,1.4,1.2);
 makeChar(ctx,'zh',{x:1.2,z:0.2,ry:-2.4});makeChar(ctx,'sulu',{x:-2.1,z:0.7,ry:2.0});
 ctx.ticks.push(t=>{lamp.intensity=5+Math.sin(t*13)*0.12;});
 Object.assign(ctx.anchors,{journal:V(-1.6,0.95,-D/2+0.55),photo:V(0.35,1.55,-D/2+0.05),draft:V(-0.9,0.95,-D/2+0.62),letter:V(1.4,1.5,-D/2+0.05),ana:V(0.35,0.8,0.5)});
 {const fw=new T.Mesh(new T.PlaneGeometry(W,H),wm);fw.position.set(0,H/2,D/2);fw.rotation.y=Math.PI;s.add(fw);}
 ctx.colliders=[{t:'b',x:-1,z:-D/2+0.55,w:2.35,d:0.9},{t:'b',x:0.35,z:0.5,w:0.6,d:0.5}];ctx.walkArea={minX:-2.8,maxX:2.8,minZ:-2.3,maxZ:2.3};ctx.camBox={minX:-2.85,maxX:2.85,minY:0.45,maxY:2.45,minZ:-2.35,maxZ:2.42};ctx.points={after:[1.2,0.4,-2.4]};
 return finalize(ctx);};
// ---- Барахолка, предрассветный дождь ----
function umbrella(color){const g=new T.Group();const c=new T.Mesh(new T.ConeGeometry(0.55,0.22,10,1,true),new T.MeshStandardMaterial({color:C(color),roughness:0.35,side:T.DoubleSide}));c.position.y=0.11;c.castShadow=true;g.add(c);g.add(cyl(0.01,0.01,0.75,5,std({color:'#222'}),0,-0.26,0));return g;}
S.bazaar=()=>{const ctx=newCtx({env:'night',fog:['#1c2436',0.03],sky:{top:'#0e1628',hor:'#34405a',glow:'#ff9a5a',glowA:0.2,cloud:1,cloudC:'#2a3448'},cam:{a:[0.95,1.66,3.4],b:[0.75,1.64,2.6],look:[-0.1,1.55,-40],lookB:[0,1.55,-40],dur:40,fov:40},focus:2.4,aperture:0.0006,exposure:1.05,envI:0.6,rainLens:0.6});const s=ctx.scene;
 hemi(s,'#4a5a80','#0a0a0c',0.25);keyL(ctx,{c:'#8fa8d8',i:0.35,p:[-10,30,20],t:[0,0,-20],r:26,far:120});
 const gr=wetFloor(ctx,14,150,{color:'#1c1d20',map:asphaltTex,rough:0.7,wet:0.6,rain:1,pudA:0.3,pudB:0.52,pudScale:0.45});gr.position.set(0,0,-60);s.add(gr);
 const r=rng(3);const cols=['#5a2a22','#1f4a5a','#6a5a22','#2a4a2a','#4a4a52','#6a3a1a','#3a2a4a'];const names=['ЛАГМАН','ЗАПЧАСТИ','ДОНЕР','ТЕЛЕФОНЫ','ҚҰРТ · СҮТ','РЕМОНТ СЕРІК','ПЛОВ','КОВРЫ','SIM-КАРТЫ','САМСА'];const ncol=['#ff4d6d','#6fd8f2','#f2c94c','#9dff8a','#ff9a3a'];
 for(const side of [-1,1])for(let i=0;i<10;i++){const g=new T.Group();const c=std({map:rustTex(cols[(r()*cols.length)|0],i+side*20),bumpMap:corrTex,bumpScale:0.04,roughness:0.55,metalness:0.4});g.add(box(3.2,2.8,6.4,c,0,1.4,0));
  const awg=new T.PlaneGeometry(1.7,6);awg.rotateX(-Math.PI/2);const aw=new T.Mesh(awg,std({color:r()<0.5?'#7a1d24':'#1d3a7a',side:T.DoubleSide,roughness:0.6}));aw.rotation.z=side*0.3;aw.position.set(-side*2.4,2.55,0);aw.castShadow=true;g.add(aw);
  const counter=box(0.5,0.9,4.6,std({color:'#3a2e24',roughness:0.7}),-side*1.9,0.45,0);g.add(counter);for(let k=0;k<6;k++){const it=box(0.3,0.2+r()*0.2,0.3,std({color:['#c98a3a','#8a1d24','#e0e0d0','#2a6a3a'][k%4],roughness:0.6}),-side*1.9,1.0,-2+k*0.8);g.add(it);}
  if(r()<0.85){const nc=ncol[(r()*ncol.length)|0];const sg=textPlane(names[(r()*names.length)|0],{w:2.6,h:0.62,color:nc,font:'700 150px "Exo 2", Arial',intensity:2.6});sg.position.set(-side*1.62,2.25,0);sg.rotation.y=-side*Math.PI/2;g.add(sg);if(i%2===0){const l=new T.PointLight(C(nc),2.4,10,1.6);l.position.set(-side*2.3,2.1,0);g.add(l);}}
  const bulb=new T.PointLight(C('#ffcf8a'),1.2,5,1.8);bulb.position.set(-side*2.2,2.3,1.6);g.add(bulb);const bg=glow('#ffd29a',0.35,0.9);bg.position.copy(bulb.position);g.add(bg);
  g.position.set(side*5.6,0,-i*7.2);s.add(g);}
 for(let k=0;k<7;k++){const z=-k*11-3;const pts=[];for(let j=0;j<=18;j++){const u=j/18;pts.push(V(-3.9+u*7.8,4.3-Math.sin(u*Math.PI)*0.6,z));}s.add(new T.Line(new T.BufferGeometry().setFromPoints(pts),new T.LineBasicMaterial({color:C('#111')})));for(let j=0;j<18;j++){const u=(j+0.5)/18;const b=glow(j%5===0?'#ff8a5a':'#ffd28a',0.3,0.95);b.position.set(-3.9+u*7.8,4.25-Math.sin(u*Math.PI)*0.6,z);s.add(b);}}
 for(let k=0;k<5;k++){const pts=[V(-4,3.6+k*0.1,-5-k*13),V(0,3.2,-8-k*13),V(4,3.8,-4-k*13)];const cv=new T.CatmullRomCurve3(pts);s.add(new T.Mesh(new T.TubeGeometry(cv,20,0.012,4),std({color:'#0a0a0a'})));}
 steam(ctx,-3.2,1.2,-7,'#8a90a0',0.5);steam(ctx,3.4,1.3,-21,'#8a90a0',0.5);steam(ctx,-3.3,1.2,-36,'#8a90a0',0.5);
 const gate=textPlane('ЗЕЛЁНЫЙ БАЗАР · СЕВЕРНЫЕ ВОРОТА',{w:10,h:1.1,color:'#6fd8f2',font:'700 110px "Exo 2", Arial',canvasW:2048,intensity:2.4});gate.position.set(0,6,-70);s.add(gate);s.add(box(0.4,6,0.4,std({color:'#333'}),-5.5,3,-70),box(0.4,6,0.4,std({color:'#333'}),5.5,3,-70));
 const bar=box(8,0.15,0.15,std({color:'#e0e0e0',emissive:'#ff2a1a',emissiveIntensity:0.6}),0,1.1,-68);s.add(bar);const scanner=beam('#ff3a2a',0.02,2.4,4.8,0.14);scanner.position.set(0,5.2,-68);s.add(scanner);
 const drone=new T.Group();drone.add(box(0.8,0.2,0.8,std({color:'#222',metalness:0.8})));const dl=glow('#ff3b3b',1.2);drone.add(dl);const cone=beam('#8fc8ff',0.1,3,8.5,0.14);drone.add(cone);drone.position.set(0,8.5,-58);s.add(drone);
 const dsp=spotL(ctx,{c:'#bfe0ff',i:5,p:[0,8.5,-58],t:[0,0,-58],d:20,a:0.35,pen:0.5});
 ctx.ticks.push(t=>{drone.position.x=Math.sin(t*0.5)*2.5;dl.material.opacity=Math.sin(t*6)>0?1:0.3;cone.rotation.z=Math.sin(t*0.9)*0.25;dsp.position.copy(drone.position);dsp.target.position.set(drone.position.x+Math.sin(t*0.9)*2,0,-58);});
 const ucols=['#15171b','#1d2a3a','#3a1d24','#2a2a2a','#1d3a2a','#4a3a1a'];const nw=Math.round(18*Q.crowd)+5;for(let i=0;i<nw;i++){const z0=-5-r()*55;const walk=r()<0.75?{a:[(r()-0.5)*5,z0],b:[(r()-0.5)*5,z0-8-r()*14],speed:1.1+r()*0.4}:null;const ch=makeChar(ctx,crowdLook(r),{x:(r()-0.5)*5,z:z0,ry:r()*6,anim:walk?'walk':'idle',walk});if(r()<0.55){const u=umbrella(ucols[(r()*ucols.length)|0]);u.position.set(0.12,2.02,0.05);ch.add(u);}}
 if(A.soldier){makeChar(ctx,'police',{x:-3,z:-66,ry:0.3});makeChar(ctx,'police',{x:3.2,z:-66.5,ry:-0.3});makeChar(ctx,'police',{x:1.2,z:-64.8,ry:0.1});}
 makeChar(ctx,'aya',{x:0.35,z:0.9,ry:Math.PI,anim:'walk',speed:0.001,look:{led:'#f2c94c'}});
 rain(ctx,2600,34,'#9fb3c9');ctx.groundY=0;
 return finalize(ctx);};
S.shop=()=>{const ctx=newCtx({env:'interior',bg:'#060708',fog:['#0e0f12',0.06],cam:{a:[-0.25,1.58,1.85],b:[-0.5,1.56,1.9],look:[-0.2,1.0,-0.6],lookB:[-0.1,1.01,-0.62],dur:40,fov:42},focus:2.5,aperture:0.0008,exposure:1.0,envI:0.12});const s=ctx.scene;
 hemi(s,'#3a3a44','#060606',0.12);const wm=std({map:rustTex('#34424a',7),bumpMap:corrTex,bumpScale:0.05,metalness:0.5,roughness:0.55});
 for(const w of [[0,1.4,-3,0,6],[-3,1.4,0,Math.PI/2,6],[3,1.4,0,-Math.PI/2,6]]){const m=new T.Mesh(new T.PlaneGeometry(w[4],2.8),wm);m.position.set(w[0],w[1],w[2]);m.rotation.y=w[3];m.receiveShadow=true;s.add(m);}
 const fl=wetFloor(ctx,6,6,{color:'#2a2a2c',map:concreteTex,rough:0.6,wet:0.15,pudA:0.6,pudB:0.75,pudScale:0.6,reflI:0.7});s.add(fl);
 s.add(box(2.3,0.08,1.05,std({color:'#5a5d62',metalness:0.85,roughness:0.3}),0,0.92,-0.6));for(const sx of [-1,1])for(const sz of [-1,1])s.add(box(0.06,0.92,0.06,std({color:'#333',metalness:0.8}),sx*1.05,0.46,-0.6+sz*0.45));
 makeChar(ctx,'aya',{x:-0.85,y:0.96,z:-0.6,ry:Math.PI/2,pose:'lie',anim:'idle',speed:0,look:{led:'#ff4d4d'}});const pnl=new T.Mesh(new T.PlaneGeometry(0.2,0.24),emis('#6fd8f2',2.2));pnl.rotation.x=-Math.PI/2;pnl.rotation.z=Math.PI/2;pnl.position.set(-0.12,1.2,-0.6);s.add(pnl);pointL(ctx,'#6fd8f2',0.8,2,-0.12,1.35,-0.6,0);
 const cab=new T.CatmullRomCurve3([V(-0.1,1.18,-0.6),V(0.4,1.6,-1.2),V(1.2,1.4,-2.2),V(1.6,1.2,-2.6)]);s.add(new T.Mesh(new T.TubeGeometry(cab,40,0.015,6),std({color:'#111',roughness:0.4})));const cab2=new T.CatmullRomCurve3([V(0.05,1.19,-0.55),V(0.6,0.7,-0.2),V(1.4,0.02,-0.4),V(2.2,0.02,-1.6)]);s.add(new T.Mesh(new T.TubeGeometry(cab2,40,0.012,6),std({color:'#8a1d24',roughness:0.4})));
 const rig=box(0.8,0.6,0.4,std({color:'#2a2d32',metalness:0.6}),1.6,1.1,-2.7);s.add(rig);const rs=new T.Mesh(new T.PlaneGeometry(0.6,0.36),emis('#6fd8f2',1.1));rs.position.set(1.6,1.12,-2.49);s.add(rs);
 const ov=spotL(ctx,{c:'#f5efdf',i:7,p:[0,2.3,-0.6],t:[0,0.9,-0.6],d:5,a:0.55,pen:0.45,decay:1.4,shadow:true});const lb=beam('#fff2d8',0.18,1.0,1.4,0.1);lb.position.set(0,2.28,-0.6);s.add(lb);
 const shade=new T.Mesh(new T.ConeGeometry(0.34,0.26,24,1,true),std({color:'#1c2230',side:T.DoubleSide,metalness:0.6,roughness:0.4}));shade.position.set(0,2.4,-0.6);s.add(shade);const bulb=glow('#fff6e0',0.45,0.9);bulb.position.set(0,2.3,-0.6);s.add(bulb);
 const r=rng(5);for(let i=0;i<30;i++)s.add(box(0.26,0.16+r()*0.1,0.26,std({color:['#7a5a2a','#3a4a5a','#5a2a2a','#2a2a2a','#4a4a3a'][i%5],metalness:0.5,roughness:0.5}),-2.72+(i%10)*0.3,1.12+Math.floor(i/10)*0.42,-2.8));
 for(let k=0;k<3;k++)s.add(box(3.1,0.04,0.4,std({color:'#3a3a3a',metalness:0.6}),-1.2,1.0+k*0.42,-2.8));
 const radio=box(0.5,0.3,0.2,std({color:'#3a2a1a',roughness:0.5}),2.3,1.1,-2.75);s.add(radio);const dial=glow('#ffb46a',0.4);dial.position.set(2.3,1.12,-2.62);s.add(dial);pointL(ctx,'#ffb46a',0.4,3,2.3,1.2,-2.4,0);
 const tv=box(0.6,0.4,0.1,std({color:'#111'}),-2.4,1.9,-2.9);s.add(tv);const tvs=new T.Mesh(new T.PlaneGeometry(0.52,0.32),emis('#8ab0ff',1));tvs.position.set(-2.4,1.9,-2.84);s.add(tvs);ctx.ticks.push(t=>{tvs.material.color.setRGB(0.4+0.3*Math.sin(t*5),0.5+0.2*Math.sin(t*3),0.9);});
 makeChar(ctx,'ser',{x:0.72,z:0.05,ry:-2.2});dust(ctx,140,0,1.5,-0.6,2,1.5,2);
 const sparks=new T.Points(new T.BufferGeometry().setAttribute('position',new T.BufferAttribute(new Float32Array(60*3),3)),new T.PointsMaterial({color:C('#ffb46a'),size:0.03,map:glowTex,transparent:true,blending:T.AdditiveBlending,depthWrite:false}));s.add(sparks);const sv=[];for(let i=0;i<60;i++)sv.push([0,0,0,0]);const spL=pointL(ctx,'#ffb46a',0,3,-0.1,1.3,-0.6,0);
 ctx.ticks.push((t,dt)=>{const a=sparks.geometry.attributes.position.array;let on=0;for(let i=0;i<60;i++){const v=sv[i];v[3]-=dt;if(v[3]<=0){if(Math.random()<0.02){v[0]=(Math.random()-0.5)*2;v[1]=Math.random()*2;v[2]=(Math.random()-0.5)*2;v[3]=0.6;a[i*3]=-0.1;a[i*3+1]=1.22;a[i*3+2]=-0.6;}else{a[i*3+1]=-10;continue;}}on++;v[1]-=dt*6;a[i*3]+=v[0]*dt;a[i*3+1]+=v[1]*dt;a[i*3+2]+=v[2]*dt;}sparks.geometry.attributes.position.needsUpdate=true;spL.intensity=on*0.08;});
 return finalize(ctx);};
// ---- серпантин на Медеу, день ----
S.road=()=>{const ctx=newCtx({env:'day',fog:['#9fb0c2',0.0016],sky:{top:'#5d85b5',hor:'#c3cfdb',cloud:0.55,cloudC:'#e8edf3',sunDir:[0.5,0.45,0.3],sunC:'#fff1dc',sunI:1},cam:{a:[34,34,112],b:[16,40,106],look:[0,70,-500],dur:45,fov:42},focus:110,aperture:0.0001,exposure:0.78,envI:0.45,bloomK:0.35});const s=ctx.scene;
 hemi(s,'#b9c8da','#3a3a34',0.45);keyL(ctx,{c:'#fff1dc',i:1.5,p:[300,280,200],t:[0,0,-40],r:160,far:900,bias:-0.001});
 s.add(range({z:-2200,h:2100,w:9000,d:2600,seed:14,snowLine:0.3,rock:'#4a4e56',rock2:'#5a5e66',snow:'#f4f7fb'}));
 const fn=(x,z,y)=>y+Math.max(0,-z)*0.35-20;const ter=ground({w:900,d:700,seg:160,amp:60,scale:160,seed:15,color:'#3c4232',color2:'#6a6450',snow:'#dfe6ee',snowSlope:0.8,snowN:0.62,snowY:40,fn});s.add(ter);
 const pts=[];for(let i=0;i<14;i++){const zz=60-i*28;pts.push(V((i%2?1:-1)*60+Math.sin(i)*10,-12+Math.max(0,-zz)*0.35+i*2.2,zz));}const curve=new T.CatmullRomCurve3(pts);
 const N=500,rw=7;const pos=[],uvs=[],idx=[];for(let i=0;i<=N;i++){const p=curve.getPoint(i/N),tg=curve.getTangent(i/N);const nx=-tg.z,nz=tg.x,l=Math.hypot(nx,nz);pos.push(p.x+nx/l*rw/2,p.y+0.6,p.z+nz/l*rw/2,p.x-nx/l*rw/2,p.y+0.6,p.z-nz/l*rw/2);uvs.push(0,i*0.6,1,i*0.6);if(i<N)idx.push(i*2,i*2+1,i*2+2,i*2+1,i*2+3,i*2+2);}
 const rt=canvasTex(256,256,(x,w,h)=>{const r=rng(2);x.fillStyle='#2e3034';x.fillRect(0,0,w,h);for(let i=0;i<5000;i++){const g=40+r()*40|0;x.fillStyle=`rgba(${g},${g},${g},.5)`;x.fillRect(r()*w,r()*h,2,2);}x.fillStyle='#e8e2c8';x.fillRect(w/2-3,0,6,h/2);x.fillStyle='#f0f0f0';x.fillRect(6,0,4,h);x.fillRect(w-10,0,4,h);},true);rt.wrapT=T.RepeatWrapping;
 const rg=new T.BufferGeometry();rg.setAttribute('position',new T.Float32BufferAttribute(pos,3));rg.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));rg.setIndex(idx);rg.computeVertexNormals();const road=new T.Mesh(rg,std({map:rt,roughness:0.75,side:T.DoubleSide}));road.receiveShadow=true;s.add(road);
 const pineG=new T.ConeGeometry(2.2,7,8);pineG.translate(0,6,0);const pine2=new T.ConeGeometry(1.6,5,8);pine2.translate(0,9.5,0);const trunk=new T.CylinderGeometry(0.25,0.35,3,6);trunk.translate(0,1.5,0);const n=Math.round(800*Q.crowd)+250;const pm=new T.InstancedMesh(pineG,std({color:'#1a3024',roughness:1}),n),pm2=new T.InstancedMesh(pine2,std({color:'#203a2a',roughness:1}),n),tm=new T.InstancedMesh(trunk,std({color:'#3a2a1a'}),n);pm.castShadow=pm2.castShadow=true;
 const d=new T.Object3D();const r=rng(6);for(let i=0;i<n;i++){let x=(r()-0.5)*700,z=90-r()*420;const dd=curve.getPoint(clamp((60-z)/(28*13),0,1));if(Math.abs(x-dd.x)<9)x+=20;d.position.set(x,fn(x,z,(fbm(x/160,z/160,15,5)-0.45)*60),z);d.scale.setScalar(0.6+r()*0.9);d.rotation.y=r()*6;d.updateMatrix();pm.setMatrixAt(i,d.matrix);pm2.setMatrixAt(i,d.matrix);tm.setMatrixAt(i,d.matrix);}s.add(pm,pm2,tm);
 const smog=new T.Mesh(new T.PlaneGeometry(8000,8000),new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{c:{value:C('#8a7560')},time:GU.time},vertexShader:'varying vec3 vW;void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',fragmentShader:'uniform vec3 c;uniform float time;varying vec3 vW;float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}void main(){float d=length(vW.xz-vec2(0.,200.));float nn=n(vW.xz/300.+time*0.01)*0.5+n(vW.xz/90.)*0.3;float a=smoothstep(150.,600.,d)*(0.55+0.45*nn);gl_FragColor=vec4(c,a*0.85);}'}));smog.rotation.x=-Math.PI/2;smog.position.set(0,-24,400);s.add(smog);
 const car=new T.Group();car.add(box(2.1,1.0,4.6,std({color:'#1d2a3a',metalness:0.7,roughness:0.25}),0,0.2,0));car.add(box(1.8,0.7,2.4,new T.MeshPhysicalMaterial({color:C('#0a0e14'),roughness:0.05,metalness:0.6,clearcoat:1}),0,0.9,0.2));car.add(box(1.4,0.12,0.3,std({color:'#222'}),0,1.3,0.2));
 const lr=glow('#ff2020',2.5),lbl=glow('#2040ff',2.5);lr.position.set(-0.5,1.35,0.2);lbl.position.set(0.5,1.35,0.2);car.add(lr,lbl);const hl=glow('#ffffff',3);hl.position.set(0,0.2,-2.35);car.add(hl);s.add(car);
 ctx.ticks.push(t=>{const u=(t*0.018)%1;const p=curve.getPoint(u),q=curve.getPoint(Math.min(1,u+0.01));car.position.set(p.x,p.y+1.2,p.z);car.lookAt(q.x,q.y+1.2,q.z);const f=Math.sin(t*8)>0;lr.material.opacity=f?1:0.1;lbl.material.opacity=f?0.1:1;});
 snow(ctx,500,60,1);
 return finalize(ctx);};
// тянь-шаньские ели: узкие колонны, инстансинг
function spruceForest(ctx,n,place,o){o=o||{};const geos=[];for(let k=0;k<4;k++){const g=new T.ConeGeometry(1.7-k*0.32,4.2-k*0.5,7);g.translate(0,3.2+k*2.6,0);geos.push(g);}
 const merge=(list)=>{let pos=[],nor=[];list.forEach(g=>{const gi=g.index?g.toNonIndexed():g;pos.push(...gi.attributes.position.array);nor.push(...gi.attributes.normal.array);});const bg=new T.BufferGeometry();bg.setAttribute('position',new T.Float32BufferAttribute(pos,3));bg.setAttribute('normal',new T.Float32BufferAttribute(nor,3));return bg;};
 const fol=merge(geos);const trunk=new T.CylinderGeometry(0.22,0.3,3.4,6);trunk.translate(0,1.7,0);
 const fm=new T.InstancedMesh(fol,std({color:o.color||'#14261c',roughness:0.95}),n),tm=new T.InstancedMesh(trunk,std({color:'#2a1e14'}),n);fm.castShadow=!!o.shadow;
 let sm2=null;if(o.snow){const sg=merge(geos.map((g,k)=>{const c=new T.ConeGeometry(1.45-k*0.3,1.6,7);c.translate(0,3.2+k*2.6+1.2,0);return c;}));sm2=new T.InstancedMesh(sg,std({color:o.snow,roughness:0.8}),n);}
 const d=new T.Object3D();let k=0;for(let i=0;i<n*4&&k<n;i++){const q=place(i);if(!q)continue;d.position.set(q[0],q[1],q[2]);d.scale.set(q[3]*0.8,q[3],q[3]*0.8);d.rotation.y=i*1.7;d.updateMatrix();fm.setMatrixAt(k,d.matrix);tm.setMatrixAt(k,d.matrix);if(sm2)sm2.setMatrixAt(k,d.matrix);k++;}
 fm.count=tm.count=k;if(sm2)sm2.count=k;ctx.scene.add(fm,tm);if(sm2)ctx.scene.add(sm2);return fm;}
function medeuBase(ctx,night){const s=ctx.scene;s.add(range({z:-1300,h:1400,w:6000,d:1800,seed:17,snowLine:0.28,rock:night?'#1f2733':'#4a4e56',rock2:night?'#283040':'#5a5e66',snow:night?'#c9d6ea':'#f4f7fb'}));
 const fn=(x,z,y)=>y+Math.abs(x)*0.38+Math.max(0,-z-60)*0.45;const L=ground({w:700,d:600,seg:140,amp:28,scale:120,seed:18,color:night?'#15181e':'#4a4c48',color2:night?'#22262e':'#6a6c66',snow:night?'#4a5668':'#e6ebf0',snowSlope:night?0.6:0.3,snowN:night?0.45:0.0,fn});L.position.y=-10;s.add(L);
 const sh=new T.Shape();sh.moveTo(-42,0);sh.lineTo(42,0);sh.lineTo(8,120);sh.lineTo(-8,120);sh.lineTo(-42,0);const geo=new T.ExtrudeGeometry(sh,{depth:520,bevelEnabled:false});geo.translate(0,0,-260);geo.rotateY(Math.PI/2);
 const dam=new T.Mesh(geo,std({map:concreteTex,color:night?'#6a6862':'#8a867e',roughness:0.95}));dam.position.set(0,-10,-60);dam.receiveShadow=true;dam.castShadow=true;s.add(dam);
 const H=(x,z)=>(fbm(x/120,z/120,18,5)-0.45)*28+Math.abs(x)*0.38+Math.max(0,-z-60)*0.45-10;const rr=rng(44);
 spruceForest(ctx,Math.round(1600*(0.5+0.5*Q.crowd)),i=>{const side=rr()<0.5?-1:1;const x=side*(70+rr()*280),z=-260+rr()*520;const h=H(x,z);if(Math.abs(x)<262&&z>-104&&z<-16)return null;if(z<-92&&h<108)return null;if(Math.abs(x)<110&&z>40)return null;return [x,h-0.5,z,0.8+rr()*0.9];},{color:night?'#0c1712':'#1a2e22',snow:night?null:'#e4eaf0'});
 for(let k=1;k<6;k++)s.add(box(520,1.2,3,std({color:'#8a867e'}),0,-10+k*20,-60+42-k*6.8));
 const lake=wetGround(ctx,700,420,{color:night?'#06101a':'#29475a',sun:night?'#9fb8ff':'#fff1dc',sunDir:night?[-0.3,0.5,-0.8]:[0.5,0.45,0.3],size:12,distort:2.5,speed:0.2});lake.position.set(0,105,-300);s.add(lake);
 const rink=new T.Mesh(new T.CircleGeometry(42,64),new T.MeshPhysicalMaterial({color:C(night?'#b9d6f0':'#e9f2fa'),roughness:0.04,metalness:0.1,clearcoat:1}));rink.scale.set(1.6,1,1);rink.rotation.x=-Math.PI/2;rink.position.set(0,-9.8,72);rink.receiveShadow=true;s.add(rink);
 return {fn};}
S.dam_day=()=>{const ctx=newCtx({env:'day',fog:['#98a4b2',0.002],sky:{top:'#6d8098',hor:'#b9c2cc',cloud:1,cloudC:'#cfd5dc',sunDir:[0.5,0.4,0.4],sunC:'#fff1dc',sunI:0.2},cam:{a:[5.2,111.62,-58.5],b:[4.7,111.6,-59.2],look:[-0.8,110.95,-63.5],lookB:[-0.6,110.98,-63.7],dur:40,fov:40},focus:8.5,aperture:0.0004,exposure:0.8,envI:0.5,bloomK:0.35});const s=ctx.scene;
 hemi(s,'#c6d2e0','#4a4a44',0.75);keyL(ctx,{c:'#f4f0e8',i:0.7,p:[60,160,40],t:[0,110,-60],r:30,far:400});medeuBase(ctx,false);
 const crest=box(500,0.6,16,std({map:concreteTex,color:'#9a968e',roughness:0.9}),0,109.7,-60);s.add(crest);
 const snowL=wetFloor(ctx,500,16,{color:'#8a8a88',map:concreteTex,rough:0.85,wet:0.2,pudA:0.55,pudB:0.7,pudScale:0.4,reflI:0.6});snowL.position.set(0,110.02,-60);s.add(snowL);
 for(let i=-40;i<=40;i++)s.add(box(0.08,1.1,0.08,std({color:'#6a6d72',metalness:0.7}),i*1.5,110.55,-67.8));s.add(box(122,0.08,0.1,std({color:'#8a9098',metalness:0.8}),0,111.1,-67.8));
 makeChar(ctx,'aya',{x:-0.4,y:110,z:-66.4,ry:Math.PI-0.2,look:{led:'#f2c94c'}});ctx.optional.bota=makeChar(ctx,'bota',{x:0.45,y:110,z:-66.2,ry:Math.PI+0.3});
 makeChar(ctx,'erl',{x:1.2,y:110,z:-60.8,ry:Math.PI+0.25});makeChar(ctx,'dina',{x:-1.6,y:110,z:-59.8,ry:Math.PI-0.15});
 if(A.soldier){makeChar(ctx,'police',{x:-5,y:110,z:-56,ry:Math.PI-0.6});makeChar(ctx,'police',{x:-7.5,y:110,z:-57.5,ry:Math.PI-0.4});}
 snow(ctx,900,40,0.8);
 return finalize(ctx);};
S.medeu=()=>{const ctx=newCtx({env:'night',fog:['#0e1828',0.0008],sky:{top:'#020409',hor:'#1b2a44',glow:'#ffb46a',glowA:0.3,stars:1,mw:0.6,moonDir:[-0.3,0.55,-0.78],moonC:'#e2ecff',cloud:0.3,cloudC:'#141b28'},cam:{a:[-7.5,-7.9,186.5],b:[-4.5,-7.7,185.5],look:[0,92,-150],lookB:[3,95,-150],dur:60,fov:48},focus:6.5,aperture:0.00025,exposure:1.05,envI:0.7});const s=ctx.scene;
 hemi(s,'#3a5070','#08080a',0.4);keyL(ctx,{c:'#9fb4e8',i:0.6,p:[-200,300,-300],t:[0,0,0],r:120,far:900,shadow:false});medeuBase(ctx,true);
 for(let i=0;i<14;i++){const f=glow('#fff1d0',9,0.9);f.position.set(-130+i*20,112,-58);s.add(f);}flare(ctx,0,112,-56,'#fff1d0',100);
 for(const x of [-120,-40,40,120]){spotL(ctx,{c:'#ffe7c2',i:1.1,p:[x,-5,40],t:[x*0.8,90,-60],d:380,a:0.45,pen:0.7,decay:1});const b=beam('#fff0d8',0.5,14,120,0.05);aimBeam(b,V(x,-5,40),V(x*0.8,90,-60));s.add(b);}
 const crowdPts=new T.BufferGeometry();{const p=[],c=[];const r=rng(8);const w=C('#ffc88a'),bl=C('#9fd2ff');for(let i=0;i<5000;i++){const a=r()*Math.PI*2,rr=45+r()*40;p.push(Math.cos(a)*rr*1.5,-9.3+r()*1.6,72+Math.sin(a)*rr);const cc=r()<0.8?w:bl;c.push(cc.r*1.5,cc.g*1.5,cc.b*1.5);}crowdPts.setAttribute('position',new T.Float32BufferAttribute(p,3));crowdPts.setAttribute('color',new T.Float32BufferAttribute(c,3));}s.add(new T.Points(crowdPts,new T.PointsMaterial({size:1.2,vertexColors:true,map:glowTex,transparent:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false})));
 const yr=rng(2);for(let i=0;i<14;i++){const g=new T.Group();const rr=4+yr()*2;const felt=std({color:'#e8dcc4',roughness:1});g.add(cyl(rr,rr,rr*0.6,24,felt,0,rr*0.3,0));const rf=new T.Mesh(new T.ConeGeometry(rr*1.05,rr*0.55,24),felt);rf.position.y=rr*0.87;g.add(rf);g.add(cyl(rr*1.01,rr*1.01,rr*0.08,24,std({color:'#8b1d24'}),0,rr*0.45,0));const door=new T.Mesh(new T.PlaneGeometry(rr*0.35,rr*0.45),emis('#ffae5a',1.4));door.position.set(0,rr*0.23,rr+0.02);g.add(door);g.position.set(-110+i*16,-10,150+Math.sin(i)*10);s.add(g);const l=glow('#ffb46a',10,0.6);l.position.set(g.position.x,-6,g.position.z+5);s.add(l);}
 for(let i=0;i<6;i++){const kz=new T.Group();kz.add(cyl(0.5,0.35,0.45,16,std({color:'#1a1a1a',metalness:0.6,roughness:0.4}),0,0.45,0));fire(ctx,-24+i*9,-10.1,170,0.8);kz.position.set(-24+i*9,-10,170);s.add(kz);steam(ctx,-24+i*9,-9.2,170,'#e0d8d0');pointL(ctx,'#ff9a4a',1.6,10,-24+i*9,-8.8,170,0);}
 pointL(ctx,'#ffb46a',1.2,160,0,10,150);
 droneSwarm(ctx,Math.round(2600*(0.6+0.4*Q.crowd)),V(0,110,-170),5);
 const banner=textPlane('ПРАЗДНИК «ЧИСТОЕ НЕБО»',{w:120,h:12,color:'#f2c94c',font:'700 120px "Exo 2", Arial',canvasW:2048,intensity:2.2});banner.position.set(0,128,-50);s.add(banner);
 fireworks(ctx,[-220,-80,80,220],190,-220);
 const r=rng(11);const nc=Math.round(22*Q.crowd)+6;for(let i=0;i<nc;i++){const x=-14+r()*28,z=170+r()*12;makeChar(ctx,crowdLook(r),{x,y:-10,z,ry:Math.PI+(r()-0.5)*0.8});}
 makeChar(ctx,'zh',{x:-3.6,y:-10,z:180.2,ry:Math.PI+0.35});makeChar(ctx,'sulu',{x:-2.1,y:-10,z:180.8,ry:Math.PI+0.1});makeChar(ctx,'bori',{x:1.1,y:-10,z:180.4,ry:Math.PI-0.2});
 const plac=textPlane('ДАЙТЕ ГОРОДУ ДЫШАТЬ',{w:1.6,h:0.45,color:'#111',bg:'#f2efe6',font:'800 90px "Exo 2", Arial',intensity:1});plac.position.set(-2.1,-7.35,180.5);plac.material.blending=T.NormalBlending;s.add(plac);
 return finalize(ctx);};
function droneSwarm(ctx,n,center,seed){const r=rng(seed||2);const pos=new Float32Array(n*3),col=new Float32Array(n*3),start=[],target=[];const pal=[C('#6fd8f2'),C('#f2b54c'),C('#ffffff'),C('#e9dcff')];
 for(let i=0;i<n;i++){start.push([(r()-0.5)*300,20+r()*140,(r()-0.5)*180]);const k=i/n;let tx,ty;if(k<0.34){const a=k/0.34*Math.PI*2;tx=Math.cos(a)*78;ty=Math.sin(a)*78;}else if(k<0.52){const a=(k-0.34)/0.18*Math.PI*2;tx=Math.cos(a)*28;ty=Math.sin(a)*28;}else{const j=(k-0.52)/0.48;const sp=Math.floor(j*12),f=(j*12)%1;const a=sp/12*Math.PI*2;const rr=28+f*50;tx=Math.cos(a)*rr;ty=Math.sin(a)*rr;}target.push([tx,ty+100,0]);const c=pal[(r()*pal.length)|0];col.set([c.r*2.5,c.g*2.5,c.b*2.5],i*3);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(pos,3));g.setAttribute('color',new T.BufferAttribute(col,3));const pts=new T.Points(g,new T.PointsMaterial({size:3,vertexColors:true,map:glowTex,transparent:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false}));pts.position.copy(center);pts.frustumCulled=false;ctx.scene.add(pts);
 ctx.ticks.push(t=>{const f=sm(clamp((Math.sin(t*0.12)*0.5+0.5)*1.35-0.15,0,1));const a=g.attributes.position.array;for(let i=0;i<n;i++){const s=start[i],tg=target[i];a[i*3]=s[0]+(tg[0]-s[0])*f+Math.sin(t+i)*0.4;a[i*3+1]=s[1]+(tg[1]-s[1])*f+Math.cos(t*1.3+i)*0.4;a[i*3+2]=s[2]+(tg[2]-s[2])*f;}g.attributes.position.needsUpdate=true;});return pts;}
function fireworks(ctx,xs,y,z){const bursts=xs.map((x,i)=>{const n=160;const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(new Float32Array(n*3),3));const col=C(['#ff4d6d','#f2c94c','#6fd8f2','#9dff8a'][i%4]);const m=new T.PointsMaterial({color:col.multiplyScalar(3),size:2.4,map:glowTex,transparent:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false});const p=new T.Points(g,m);p.frustumCulled=false;ctx.scene.add(p);const v=[];for(let k=0;k<n;k++){const u=Math.random()*2-1,a=Math.random()*6.28,s=Math.sqrt(1-u*u);v.push([Math.cos(a)*s,u,Math.sin(a)*s]);}return {p,g,v,x,t:i*0.9};});
 ctx.ticks.push((t,dt)=>{bursts.forEach(b=>{b.t+=dt;const T0=3.6;if(b.t>T0)b.t-=T0;const k=b.t;const a=b.g.attributes.position.array;const R=k*38;for(let i=0;i<b.v.length;i++){a[i*3]=b.x+b.v[i][0]*R;a[i*3+1]=y+b.v[i][1]*R-k*k*5;a[i*3+2]=z+b.v[i][2]*R;}b.g.attributes.position.needsUpdate=true;b.p.material.opacity=Math.max(0,1-k/2.2);});});}
S.truck=()=>{const ctx=newCtx({env:'interior',bg:'#050506',fog:['#050506',0.03],cam:{a:[0.72,1.42,1.75],b:[0.5,1.36,1.9],look:[-0.35,1.0,-1.5],dur:30,fov:44},focus:2.9,aperture:0.0008,exposure:1.05,envI:0.08});const s=ctx.scene;
 hemi(s,'#301010','#000',0.12);const wm=std({map:rustTex('#2a2c30',3),bumpMap:corrTex,bumpScale:0.05,metalness:0.7,roughness:0.45});for(const w of [[0,1.2,-2.5,0],[-1.2,1.2,0,Math.PI/2],[1.2,1.2,0,-Math.PI/2]]){const m=new T.Mesh(new T.PlaneGeometry(5,2.4),wm);m.position.set(w[0],w[1],w[2]);m.rotation.y=w[3];m.receiveShadow=true;s.add(m);}
 const fl=new T.Mesh(new T.PlaneGeometry(2.4,5),wm);fl.rotation.x=-Math.PI/2;fl.receiveShadow=true;s.add(fl);s.add(box(2.2,0.4,0.6,std({color:'#222',metalness:0.6}),0,0.2,-1.9));
 const ce=new T.Mesh(new T.PlaneGeometry(2.4,5),wm);ce.rotation.x=Math.PI/2;ce.position.y=2.4;s.add(ce);
 const slit=new T.Mesh(new T.PlaneGeometry(0.035,2),emis('#9fd8ff',4));slit.position.set(0.3,1.1,-2.49);s.add(slit);const sb=beam('#9fd8ff',0.02,0.6,3,0.12);aimBeam(sb,V(0.3,1.2,-2.45),V(-0.2,0.2,0.6));s.add(sb);
 const red=pointL(ctx,'#ff2020',1.6,6,0,2.2,0,0.4);spotL(ctx,{c:'#9fd8ff',i:1.8,p:[0.3,1.2,-2.4],t:[-0.4,0.6,0],d:6,a:0.35,shadow:true});
 makeChar(ctx,'aya',{x:-0.5,y:-0.02,z:-1.62,ry:0.08,pose:'sit',look:{led:'#ff4d4d'}});ctx.optional.bota=makeChar(ctx,'bota',{x:0.35,y:0.12,z:-1.66,ry:-0.1,pose:'sit'});
 const cuff=std({color:'#6fd8f2',emissive:'#6fd8f2',emissiveIntensity:1.5});s.add(box(0.46,0.045,0.045,cuff,-0.5,0.66,-1.38));dust(ctx,120,0,1.2,-1,1.8,1.6,2,'#cfe6ff');
 ctx.ticks.push(t=>{red.intensity=1.2+Math.sin(t*3)*0.6;});
 return finalize(ctx);};
S.tunnel=()=>{const ctx=newCtx({env:'interior',bg:'#050505',fog:['#0a0806',0.035],cam:{a:[1.2,1.75,-3.2],b:[0.8,1.85,-4.1],look:[0,1.5,-12],dur:30,fov:42},focus:6.4,aperture:0.0005,exposure:1.05,envI:0.12});const s=ctx.scene;
 hemi(s,'#3a2a1a','#000',0.14);const tube=new T.Mesh(new T.CylinderGeometry(3,3,70,32,1,true),std({map:concreteTex,color:'#7a746a',side:T.BackSide,roughness:0.95}));tube.rotation.x=Math.PI/2;tube.position.set(0,2.2,-22);tube.receiveShadow=true;s.add(tube);
 const wt=wetGround(ctx,4.6,70,{color:'#0c1418',sun:'#ff4a3a',size:3,distort:3,speed:2.5});wt.position.set(0,-0.25,-22);s.add(wt);s.add(box(0.5,0.3,70,std({map:concreteTex}),-2.3,-0.1,-22),box(0.5,0.3,70,std({map:concreteTex}),2.3,-0.1,-22));
 for(const x of [-2.4,2.4])for(const y of [2.3,3.1]){const p=new T.Mesh(new T.CylinderGeometry(0.12,0.12,70,10),std({color:'#6a3a2a',metalness:0.6,roughness:0.45}));p.rotation.x=Math.PI/2;p.position.set(x,y,-22);s.add(p);}
 const reds=[];for(let i=0;i<6;i++){const x=i%2?-2.5:2.5,z=-i*8;const l=pointL(ctx,'#ff2a1a',3,11,x,3.8,z,0.7);const b=beam('#ff3a2a',0.05,1.3,3.8,0.12);aimBeam(b,V(x,4,z),V(x*0.3,0,z));s.add(b);reds.push([l,b]);}
 for(let i=0;i<5;i++){const cage=glow('#ffcf8a',0.6,0.9);cage.position.set(0,4.95,-2-i*10);s.add(cage);}
 for(const z of [9,1,-7])pointL(ctx,'#ffc98a',1.3,10,0,4.6,z,0.5);
 const wheel=new T.Group();wheel.add(new T.Mesh(new T.TorusGeometry(0.9,0.08,12,40),std({color:'#b33',metalness:0.7,roughness:0.35})));for(let k=0;k<4;k++){const sp=box(1.8,0.07,0.07,std({color:'#933',metalness:0.7}));sp.rotation.z=k*Math.PI/4;wheel.add(sp);}wheel.position.set(0,1.8,-12.4);s.add(wheel);s.add(box(3.4,3.4,0.4,std({color:'#4a4a4a',metalness:0.6,roughness:0.5}),0,1.8,-12.8));
 const bomb=box(0.6,0.4,0.2,std({color:'#2a2a2a'}),1.6,1.4,-12.55);s.add(bomb);const tt=canvasTex(256,96,(x,w,h)=>{x.fillStyle='#000';x.fillRect(0,0,w,h);x.fillStyle='#ff2a1a';x.font='700 64px "IBM Plex Mono", monospace';x.textAlign='center';x.textBaseline='middle';x.fillText('21:04:52',w/2,h/2);},true);const tp=new T.Mesh(new T.PlaneGeometry(0.46,0.17),new T.MeshBasicMaterial({map:tt,toneMapped:false}));tp.material.color.setScalar(2.2);tp.position.set(1.6,1.42,-12.44);s.add(tp);const bt=glow('#ff2020',0.7);bt.position.set(1.6,1.45,-12.4);s.add(bt);
 const sign=textPlane('ОПАСНО! · ВОДОСБРОС',{w:2.4,h:0.4,color:'#ffd23f',bg:'#1a1400',font:'700 120px "Exo 2", Arial',intensity:1.2});sign.position.set(-1.6,2.9,-12.55);s.add(sign);
 makeChar(ctx,'aya',{x:-0.5,z:-9.6,ry:Math.PI,look:{led:'#ff4d4d'}});makeChar(ctx,'topan',{x:1.3,z:-10.8,ry:-2.6});
 ctx.walkArea={minX:-2.05,maxX:2.05,minZ:-12.2,maxZ:10.5};ctx.camBox={minX:-2.3,maxX:2.3,minY:0.5,maxY:4.2,minZ:-12.4,maxZ:12.5};ctx.colliders=[{t:'b',x:0,z:-12.8,w:3.4,d:0.5}];ctx.points={after:[-0.5,-9.6,Math.PI]};
 steam(ctx,-1.8,0.1,-8,'#5a4a48',0.35);steam(ctx,1.6,0.1,-15,'#5a4a48',0.35);
 ctx.ticks.push(t=>{reds.forEach(([l,b],i)=>{const on=Math.sin(t*4+i)>0;l.intensity=on?4:0.3;b.visible=on;});bt.material.opacity=Math.sin(t*10)>0?1:0.2;});
 return finalize(ctx);};
S.booth=()=>{const ctx=newCtx({env:'night',fog:['#0a1420',0.003],sky:{top:'#020409',hor:'#1b2a44',glow:'#ffb46a',glowA:0.25,stars:1,mw:0.5,moonDir:[-0.3,0.55,-0.78],moonC:'#e2ecff'},cam:{a:[2.6,1.9,4.4],b:[1.2,1.85,4.6],look:[-0.4,1.3,-3],lookB:[-0.2,1.32,-3],dur:50,fov:42},focus:4.8,aperture:0.0005,exposure:1.05,envI:0.6});const s=ctx.scene;
 hemi(s,'#2a4060','#050608',0.25);const fl=wetFloor(ctx,14,10,{color:'#15171b',rough:0.3,metal:0.4,wet:0.2,pudA:0.7,pudB:0.85,reflI:0.8});s.add(fl);
 const fr=std({color:'#0c0e10',metalness:0.8});for(let i=-3;i<=3;i++)s.add(box(0.1,3.6,0.14,fr,i*2.2,1.8,-4.2));s.add(box(14,0.2,0.3,fr,0,3.6,-4.2));
 const gl=new T.Mesh(new T.PlaneGeometry(14,3.6),new T.MeshPhysicalMaterial({color:C('#9fb7cc'),transparent:true,opacity:0.08,roughness:0.03,metalness:0.2,depthWrite:false}));gl.position.set(0,1.8,-4.22);s.add(gl);
 droneSwarm(ctx,1800,V(0,-30,-260),9);s.add(range({z:-900,y:-120,h:700,w:4000,d:900,seed:17,snowLine:0.3,rock:'#1f2733',snow:'#c9d6ea'}));
 const lake=wetGround(ctx,1200,700,{color:'#06101a',sun:'#9fb8ff',sunDir:[-0.3,0.5,-0.8],size:14,distort:2,speed:0.2});lake.position.set(0,-40,-500);s.add(lake);
 const scrT=(kind,seed)=>{const r=rng(seed);return canvasTex(512,320,(x,w,h)=>{x.fillStyle='#03101a';x.fillRect(0,0,w,h);x.strokeStyle='rgba(111,216,242,.5)';x.lineWidth=2;x.font='22px "IBM Plex Mono", monospace';x.fillStyle='#6fd8f2';if(kind==='timer'){x.font='700 64px "IBM Plex Mono", monospace';x.fillStyle='#ff5a4e';x.fillText('ЧИСТКА',40,110);x.fillText('21:00:00',40,200);x.font='20px "IBM Plex Mono", monospace';x.fillStyle='#ff9a8f';x.fillText('СЕТЬ «ВЕКТОР» · 20 413 887 УЗЛОВ',40,260);}else if(kind==='map'){for(let i=0;i<140;i++){x.fillStyle=r()<0.2?'#f2b54c':'#6fd8f2';x.fillRect(r()*w,r()*h,3,3);}x.beginPath();x.arc(w/2,h/2,110,0,7);x.stroke();x.beginPath();x.arc(w/2,h/2,40,0,7);x.stroke();for(let k=0;k<12;k++){const a=k/12*Math.PI*2;x.beginPath();x.moveTo(w/2+Math.cos(a)*40,h/2+Math.sin(a)*40);x.lineTo(w/2+Math.cos(a)*110,h/2+Math.sin(a)*110);x.stroke();}}else{for(let j=0;j<10;j++)x.fillText((['NODE','DRONE','SYNC','PKT','LAT'][j%5])+'-'+((r()*9999)|0)+'  '+(r()*100).toFixed(1)+'%',24,36+j*28);}},true);};
 for(let i=0;i<3;i++){s.add(box(3.6,0.9,1,std({color:'#1a1d22',metalness:0.6,roughness:0.35}),-4+i*4,0.45,-1.5));for(let k=0;k<3;k++){const kind=(i===1&&k===1)?'timer':(k===0?'map':'log');const sc=new T.Mesh(new T.PlaneGeometry(1.1,0.7),new T.MeshBasicMaterial({map:scrT(kind,i*3+k),toneMapped:false}));sc.material.color.setScalar(kind==='timer'?2.2:1.4);sc.position.set(-4+i*4-1.2+k*1.2,1.4,-1.9);sc.rotation.x=-0.15;s.add(sc);}}
 pointL(ctx,'#6fd8f2',1.4,8,0,1.6,-1.2,0);pointL(ctx,'#ff5a4e',0.8,5,0,1.5,-1.5,0);spotL(ctx,{c:'#bfe6ff',i:2,p:[2,3.5,2],t:[0,0.6,-1],d:10,a:0.6,shadow:true});
 makeChar(ctx,'zh',{x:0,z:-0.75,ry:Math.PI});makeChar(ctx,'erl',{x:2.4,z:1.2,ry:-2.5});
 return finalize(ctx);};
// ================= ENGINE =================
let camCtl=null;let renderer,camera,composer,bloom,grade,bokeh,renderPass,pmrem,cur=null,curName='',built={},clock=new T.Clock(),freeze=false,fade=1,fadeTarget=0,canvasEl,camT=0,exposure=1,rainLens=0,perfCb=null;
const GradeShader={uniforms:{tDiffuse:{value:null},time:{value:0},fade:{value:0},alarm:{value:0},exposure:{value:1},rainAmt:{value:0},res:{value:new T.Vector2(1,1)}},
 vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:`uniform sampler2D tDiffuse;uniform float time;uniform float fade;uniform float alarm;uniform float exposure;uniform float rainAmt;uniform vec2 res;varying vec2 vUv;
 vec3 aces(vec3 x){return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),0.,1.);}
 float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
 vec2 drops(vec2 uv,float t){vec2 a=vec2(uv.x*res.x/res.y,uv.y);vec2 off=vec2(0.);
  for(int L=0;L<2;L++){float sc=L==0?9.0:18.0;vec2 g=a*sc;g.y+=t*(L==0?0.25:0.08);vec2 id=floor(g);vec2 f=fract(g)-0.5;float r=h(id+float(L)*7.3);
   if(r>0.72){vec2 c=vec2(h(id+1.3)-0.5,h(id+2.7)-0.5)*0.5;vec2 d=f-c;float rr=0.1+0.16*h(id+5.1);float m=smoothstep(rr,rr*0.5,length(d));off+=d*m*1.4/sc;}}
  return off;}
 void main(){vec2 uv=vUv;if(rainAmt>0.){uv+=drops(vUv,time)*rainAmt;}
  vec2 d=uv-0.5;float r2=dot(d,d);vec2 off=d*0.0026*(0.4+r2*3.);
  vec3 c=vec3(texture2D(tDiffuse,uv+off).r,texture2D(tDiffuse,uv).g,texture2D(tDiffuse,uv-off).b);
  c=min(max(c,vec3(0.)),vec3(512.));c=aces(c*exposure);c=pow(c,vec3(1./2.2));
  float l=dot(c,vec3(.299,.587,.114));c=mix(c,c*vec3(0.9,1.0,1.1),smoothstep(.55,0.,l)*.55);c=mix(c,c*vec3(1.07,1.0,0.92),smoothstep(.45,1.,l)*.4);
  c=mix(vec3(l),c,1.05);c=(c-.5)*1.07+.5;c*=1.-r2*0.95;c+=(h(uv*vec2(1731.,977.)+fract(time*7.))-.5)*0.03;
  c=mix(c,vec3(l*1.1,l*0.22,l*0.18),alarm*0.35);c*=1.-fade;gl_FragColor=vec4(c,1.);}`};
// Санитайзер HDR-кадра: на реальных видеокартах зеркальные блики переполняют half float (Inf),
// а свечение (bloom) размазывает Inf/NaN в огромные чёрные прямоугольники. Режем Inf и NaN сразу после рендера.
const SanitizeShader={uniforms:{tDiffuse:{value:null}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:`uniform sampler2D tDiffuse;varying vec2 vUv;
 void main(){vec4 c=texture2D(tDiffuse,vUv);
 #if __VERSION__ >= 300
 bvec3 bad=isnan(c.rgb);if(bad.x||bad.y||bad.z)c.rgb=vec3(0.);
 #else
 if(!(c.r<=0.||c.r>=0.)||!(c.g<=0.||c.g>=0.)||!(c.b<=0.||c.b>=0.))c.rgb=vec3(0.);
 #endif
 c.rgb=min(max(c.rgb,vec3(0.)),vec3(256.));gl_FragColor=vec4(c.rgb,1.);}`};
// ---- рендер-конвейер: HDR (half float) + MSAA, мягкие контактные тени (SSAO), боке, свечение, грейдинг, FXAA
const hideForDepth=o=>o.isSprite||o.isPoints||o.isLine||o.isLensflare||o.userData.noDepth||o.userData.sky||(o.isMesh&&o.material&&!Array.isArray(o.material)&&o.material.transparent&&!o.material.alphaTest&&!o.userData.aoKeep);
function hideSet(scene){const hid=[];if(scene)scene.traverse(o=>{if(o.visible&&hideForDepth(o)){o.visible=false;hid.push(o);}});return hid;}
class MSRenderPass extends T.Pass{constructor(scene,camera){super();this.scene=scene;this.camera=camera;this.needsSwap=false;this.rt=null;this.ms=false;this.quad=new T.FullScreenQuad(new T.ShaderMaterial(T.CopyShader));this.quad.material.uniforms=T.UniformsUtils.clone(T.CopyShader.uniforms);}
 setMS(on){this.ms=on&&renderer.capabilities.isWebGL2&&!!T.WebGLMultisampleRenderTarget;if(this.rt){this.rt.dispose();this.rt=null;}}
 setSize(w,h){this.w=w;this.h=h;if(this.rt)this.rt.setSize(w,h);}
 render(r,writeBuffer,readBuffer){if(!this.ms){r.setRenderTarget(this.renderToScreen?null:readBuffer);r.clear();r.render(this.scene,this.camera);return;}
  if(!this.rt){this.rt=new T.WebGLMultisampleRenderTarget(readBuffer.width,readBuffer.height,{format:T.RGBAFormat,type:T.HalfFloatType,minFilter:T.LinearFilter,magFilter:T.LinearFilter});this.rt.samples=4;}
  if(this.rt.width!==readBuffer.width||this.rt.height!==readBuffer.height)this.rt.setSize(readBuffer.width,readBuffer.height);
  r.setRenderTarget(this.rt);r.clear();r.render(this.scene,this.camera);this.quad.material.uniforms.tDiffuse.value=this.rt.texture;r.setRenderTarget(this.renderToScreen?null:readBuffer);this.quad.render(r);}}
class AOPass extends T.Pass{constructor(scene,camera){super();this.scene=scene;this.camera=camera;this.needsSwap=true;this.strength=0.55;this.radius=0.45;this.minD=0.015;this.maxD=0.6;
  const dt=new T.DepthTexture();dt.type=T.UnsignedIntType;this.nrt=new T.WebGLRenderTarget(2,2,{minFilter:T.NearestFilter,magFilter:T.NearestFilter,format:T.RGBAFormat,depthTexture:dt});
  this.art=new T.WebGLRenderTarget(2,2,{minFilter:T.LinearFilter,magFilter:T.LinearFilter,format:T.RGBAFormat});this.brt=this.art.clone();
  const K=[];for(let i=0;i<24;i++){const v=new T.Vector3(Math.random()*2-1,Math.random()*2-1,Math.random()).normalize();let sc=i/24;sc=0.1+0.9*sc*sc;K.push(v.multiplyScalar(sc));}
  const nd=new Float32Array(16*4);for(let i=0;i<16;i++){const x=Math.random()*2-1,y=Math.random()*2-1;const l=Math.hypot(x,y)||1;nd.set([x/l,y/l,0,1],i*4);}const nt=new T.DataTexture(nd,4,4,T.RGBAFormat,T.FloatType);nt.wrapS=nt.wrapT=T.RepeatWrapping;nt.needsUpdate=true;
  this.aoMat=new T.ShaderMaterial({defines:Object.assign({},T.SSAOShader.defines,{KERNEL_SIZE:24}),uniforms:T.UniformsUtils.clone(T.SSAOShader.uniforms),vertexShader:T.SSAOShader.vertexShader,fragmentShader:T.SSAOShader.fragmentShader,blending:T.NoBlending});
  const u=this.aoMat.uniforms;u.tNormal.value=this.nrt.texture;u.tDepth.value=this.nrt.depthTexture;u.tNoise.value=nt;u.kernel.value=K;
  this.blurMat=new T.ShaderMaterial({defines:Object.assign({},T.SSAOBlurShader.defines),uniforms:T.UniformsUtils.clone(T.SSAOBlurShader.uniforms),vertexShader:T.SSAOBlurShader.vertexShader,fragmentShader:T.SSAOBlurShader.fragmentShader});this.blurMat.uniforms.tDiffuse.value=this.art.texture;
  this.normalMat=new T.MeshNormalMaterial({skinning:true});this.normalMat.blending=T.NoBlending;
  this.compMat=new T.ShaderMaterial({uniforms:{tDiffuse:{value:null},tAO:{value:this.brt.texture},strength:{value:0.55}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform sampler2D tDiffuse;uniform sampler2D tAO;uniform float strength;varying vec2 vUv;void main(){vec4 c=texture2D(tDiffuse,vUv);float ao=texture2D(tAO,vUv).r;if(!(ao<=0.0||ao>=0.0))ao=1.0;ao=clamp(ao,0.0,1.0);gl_FragColor=vec4(c.rgb*mix(1.0,ao,strength),c.a);}'});
  this.quad=new T.FullScreenQuad(null);this.cc=new T.Color();}
 setSize(w,h){const hw=Math.max(2,Math.round(w*0.5)),hh=Math.max(2,Math.round(h*0.5));this.nrt.setSize(hw,hh);this.art.setSize(hw,hh);this.brt.setSize(hw,hh);this.aoMat.uniforms.resolution.value.set(hw,hh);this.blurMat.uniforms.resolution.value.set(hw,hh);}
 render(r,writeBuffer,readBuffer){const cam=this.camera;const hid=hideSet(this.scene);r.getClearColor(this.cc);const ca=r.getClearAlpha();
  this.scene.overrideMaterial=this.normalMat;const bg=this.scene.background;this.scene.background=null;r.setRenderTarget(this.nrt);r.setClearColor(0x7777ff,1);r.clear();r.render(this.scene,cam);this.scene.overrideMaterial=null;this.scene.background=bg;hid.forEach(o=>o.visible=true);r.setClearColor(this.cc,ca);
  const u=this.aoMat.uniforms;u.cameraNear.value=cam.near;u.cameraFar.value=cam.far;u.cameraProjectionMatrix.value.copy(cam.projectionMatrix);u.cameraInverseProjectionMatrix.value.copy(cam.projectionMatrixInverse);u.kernelRadius.value=this.radius;const span=cam.far-cam.near;u.minDistance.value=this.minD/span;u.maxDistance.value=this.maxD/span;
  this.quad.material=this.aoMat;r.setRenderTarget(this.art);this.quad.render(r);this.quad.material=this.blurMat;r.setRenderTarget(this.brt);this.quad.render(r);
  this.compMat.uniforms.tDiffuse.value=readBuffer.texture;this.compMat.uniforms.strength.value=this.strength;this.quad.material=this.compMat;r.setRenderTarget(this.renderToScreen?null:writeBuffer);this.quad.render(r);}}
let aoPass=null,fxaa=null,sanPass=null,san2=null;
function init(el){canvasEl=el;renderer=new T.WebGLRenderer({canvas:el,antialias:false,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,Q.pr));
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
 camera=new T.PerspectiveCamera(45,1,0.1,9000);pmrem=new T.PMREMGenerator(renderer);pmrem.compileEquirectangularShader();
 if(T.EffectComposer&&T.UnrealBloomPass){const hf=new T.WebGLRenderTarget(4,4,{minFilter:T.LinearFilter,magFilter:T.LinearFilter,format:T.RGBAFormat,type:T.HalfFloatType,stencilBuffer:false});
  composer=new T.EffectComposer(renderer,hf);composer.setPixelRatio(renderer.getPixelRatio());renderPass=new MSRenderPass(new T.Scene(),camera);renderPass.setMS(Q.msaa);composer.addPass(renderPass);sanPass=new T.ShaderPass(SanitizeShader);composer.addPass(sanPass);
  if(T.SSAOShader){aoPass=new AOPass(new T.Scene(),camera);aoPass.enabled=!!Q.ao;composer.addPass(aoPass);}
  if(T.BokehPass){bokeh=new T.BokehPass(new T.Scene(),camera,{focus:8,aperture:0.00035,maxblur:0.008,width:512,height:512});bokeh.materialDepth.skinning=true;const br=bokeh.render.bind(bokeh);bokeh.render=function(r,w,rb,dt,m){const hid=hideSet(cur&&cur.scene);br(r,w,rb,dt,m);hid.forEach(o=>o.visible=true);};composer.addPass(bokeh);bokeh.enabled=Q.dof;}
  san2=new T.ShaderPass(SanitizeShader);san2.enabled=!!(Q.ao||Q.dof);composer.addPass(san2);bloom=new T.UnrealBloomPass(new T.Vector2(512,512),Q.bloom,0.5,1.0);[bloom.renderTargetBright,...bloom.renderTargetsHorizontal,...bloom.renderTargetsVertical].forEach(t=>{t.texture.type=T.HalfFloatType;});composer.addPass(bloom);
  grade=new T.ShaderPass(GradeShader);composer.addPass(grade);if(T.FXAAShader){fxaa=new T.ShaderPass(T.FXAAShader);fxaa.enabled=!!Q.fxaa;composer.addPass(fxaa);}}
 else{renderer.toneMapping=T.ACESFilmicToneMapping;renderer.outputEncoding=T.sRGBEncoding;}
 resize();window.addEventListener('resize',resize);requestAnimationFrame(loop);}
function resize(){const w=window.innerWidth,h=window.innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();if(composer){composer.setPixelRatio(renderer.getPixelRatio());composer.setSize(w,h);grade.uniforms.res.value.set(w,h);if(fxaa){const pr=renderer.getPixelRatio();fxaa.uniforms.resolution.value.set(1/(w*pr),1/(h*pr));}}}
// ---- ретаргетинг анимаций X Bot → любой гуманоид (мировые дельты + выравнивание позы покоя)
function retarget(src,clips,tgt){const canon=n=>n.replace(/^mixamorig:?/,'');const sB={},tB={};src.traverse(o=>{if(o.isBone)sB[canon(o.name)]=o;});tgt.traverse(o=>{if(o.isBone)tB[canon(o.name)]=o;});
 const names=Object.keys(tB).filter(n=>sB[n]);const depth=b=>{let d=0;while(b.parent){b=b.parent;d++;}return d;};names.sort((a,b)=>depth(tB[a])-depth(tB[b]));
 const _p=new T.Vector3(),_s=new T.Vector3();const WQ=o=>{const q=new T.Quaternion();o.matrixWorld.decompose(_p,q,_s);return q;};const WP=o=>new T.Vector3().setFromMatrixPosition(o.matrixWorld);
 src.updateMatrixWorld(true);tgt.updateMatrixWorld(true);const saved={};names.forEach(n=>saved[n]=tB[n].quaternion.clone());
 const kid=b=>{for(const c of b.children)if(c.isBone&&sB[canon(c.name)]&&tB[canon(c.name)])return canon(c.name);return null;};
 for(const n of names){const tb=tB[n],c=kid(tb);if(!c)continue;tgt.updateMatrixWorld(true);const dS=WP(sB[c]).sub(WP(sB[n])).normalize(),dT=WP(tB[c]).sub(WP(tb)).normalize();if(!isFinite(dS.x)||!isFinite(dT.x))continue;
  const q=new T.Quaternion().setFromUnitVectors(dT,dS);const pq=WQ(tb.parent);const nw=q.multiply(WQ(tb));tb.quaternion.copy(pq.invert().multiply(nw));}
 tgt.updateMatrixWorld(true);const sR={},tR={},pR={};names.forEach(n=>{sR[n]=WQ(sB[n]).invert();tR[n]=WQ(tB[n]);pR[n]=WQ(tB[n].parent);});
 const sH=sB.Hips,tH=tB.Hips,sH0=WP(sH),tH0=WP(tH);const ratio=Math.abs(tH0.y-WP(tgt).y)/Math.max(1e-6,Math.abs(sH0.y-WP(src).y));const tHpInv=new T.Matrix4().copy(tH.parent.matrixWorld).invert();
 const mixer=new T.AnimationMixer(src);const out=[];
 for(const clip of clips){mixer.stopAllAction();const act=mixer.clipAction(clip);act.play();const fps=24;const nF=Math.max(2,Math.round(clip.duration*fps)+1);const times=new Float32Array(nF);const qv={};names.forEach(n=>qv[n]=new Float32Array(nF*4));const hp=new Float32Array(nF*3);
  for(let f=0;f<nF;f++){const t=Math.min(clip.duration,f/fps);times[f]=t;mixer.setTime(t);src.updateMatrixWorld(true);const W={};
   for(const n of names){const tw=WQ(sB[n]).multiply(sR[n]).multiply(tR[n]);W[n]=tw;const pn=tB[n].parent;const pw=(pn.isBone&&W[canon(pn.name)])?W[canon(pn.name)]:pR[n];const l=pw.clone().invert().multiply(tw);qv[n].set([l.x,l.y,l.z,l.w],f*4);}
   const d=WP(sH).sub(sH0).multiplyScalar(ratio);const tp=tH0.clone().add(d).applyMatrix4(tHpInv);hp.set([tp.x,tp.y,tp.z],f*3);}
  act.stop();const tracks=names.map(n=>new T.QuaternionKeyframeTrack(tB[n].name+'.quaternion',times,qv[n]));tracks.push(new T.VectorKeyframeTrack(tH.name+'.position',times,hp));out.push(new T.AnimationClip(clip.name,clip.duration,tracks));}
 mixer.stopAllAction();names.forEach(n=>tB[n].quaternion.copy(saved[n]));return out;}
// Картинки внутри GLB грузим через createImageBitmap(blob), без blob:-URL (CSP-безопасно)
const blobMap=new Map();
function patchLoaders(){if(!window.URL||URL.__tumar)return;URL.__tumar=1;const oc=URL.createObjectURL.bind(URL),orv=URL.revokeObjectURL.bind(URL);
 URL.createObjectURL=b=>{const u=oc(b);if(b instanceof Blob)blobMap.set(u,b);return u;};URL.revokeObjectURL=u=>{blobMap.delete(u);orv(u);};
 if(T.ImageBitmapLoader){const ol=T.ImageBitmapLoader.prototype.load;T.ImageBitmapLoader.prototype.load=function(url,onLoad,onProg,onErr){const b=blobMap.get(url);if(!b)return ol.call(this,url,onLoad,onProg,onErr);createImageBitmap(b,this.options).then(bm=>{onLoad&&onLoad(bm);},e=>{onErr&&onErr(e);});};}
 const otl=T.TextureLoader.prototype.load;T.TextureLoader.prototype.load=function(url,onLoad,onProg,onErr){const b=blobMap.get(url);if(!b||typeof createImageBitmap==='undefined')return otl.call(this,url,onLoad,onProg,onErr);const tex=new T.Texture();createImageBitmap(b).then(bm=>{tex.image=bm;tex.needsUpdate=true;onLoad&&onLoad(tex);},e=>onErr&&onErr(e));return tex;};}
// в опубликованной версии бинарные ассеты лежат как JSON c data-URI (glb/hdr не раздаются напрямую)
function fetchJsonAssets(onP){const J=window.TUMAR_JSON_ASSETS;if(!J)return Promise.resolve();const keys=Object.keys(J);let d=0;
 return Promise.all(keys.map(k=>fetch(J[k]).then(r=>{if(!r.ok)throw new Error(r.status);return r.json();}).then(j=>{if(j&&j.uri)URLS[k]=j.uri;}).catch(e=>console.warn('asset json',k,e)).then(()=>{d++;onP&&onP(d/keys.length);})));}
function loadCore(onP0){patchLoaders();Object.assign(URLS,window.TUMAR_ASSETS||{});const J=!!window.TUMAR_JSON_ASSETS;const onP=p=>onP0&&onP0(J?0.6+0.4*p:p);return fetchJsonAssets(p=>onP0&&onP0(0.6*p)).then(()=>new Promise(res=>{const items=['rpm','xbot','soldier','night','interior','dawn','day','waterN','flare0','flare3'];let done=0;const fin=()=>{done++;onP&&onP(Math.min(0.97,done/items.length));if(done===items.length){A.ok=!!A.xbot;if(A.rpm&&A.xbot){try{A.rpmClips=retarget(T.SkeletonUtils.clone(A.xbot.scene),A.xbot.animations,T.SkeletonUtils.clone(A.rpm.scene));}catch(e){console.warn('retarget',e);A.rpm=null;}}onP&&onP(1);res(A.ok);}};
 const gl=T.GLTFLoader?new T.GLTFLoader():null;['rpm','xbot','soldier'].forEach(k=>{if(!gl)return fin();gl.load(URLS[k],g=>{A[k]=g;fin();},undefined,e=>{console.warn('asset',k,e);fin();});});
 const rl=T.RGBELoader?new T.RGBELoader().setDataType(T.HalfFloatType):null;['night','interior','dawn','day'].forEach(k=>{if(!rl)return fin();rl.load(URLS[k],tex=>{try{A.env[k]=pmrem.fromEquirectangular(tex).texture;}catch(e){console.warn(e);}tex.dispose();fin();},undefined,e=>{console.warn('asset',k,e);fin();});});
 const tl=new T.TextureLoader();tl.load(URLS.waterN,t=>{t.wrapS=t.wrapT=T.RepeatWrapping;A.waterN=t;fin();},undefined,()=>fin());tl.load(URLS.flare0,t=>{A.flare0=t;fin();},undefined,()=>fin());tl.load(URLS.flare3,t=>{A.flare3=t;fin();},undefined,()=>fin());}));}
function load(onP){return loadCore(p=>onP&&onP(p*0.85)).then(ok=>{let d=0;const n=EXT.length||1;return Promise.all(EXT.map(f=>Promise.resolve().then(()=>f(A,URLS,T)).catch(e=>console.warn('ext load',e)).then(()=>{d++;onP&&onP(0.85+0.15*d/n);}))).then(()=>ok);});}
function build(name){if(!built[name]){const f=S[name]||S.menu;try{built[name]=f();}catch(e){console.error('scene',name,e);built[name]=S.mind();}}return built[name];}
let pendingFlags=null,showWait=[];
function applyFlags(ctx,F){if(!ctx||!ctx.optional)return;if(ctx.optional.bota)ctx.optional.bota.visible=!!(F&&F.bota);}
function show(name,F){pendingFlags=F||pendingFlags;const want=name;showWait=showWait.filter(w=>{if(w.name!==want){w.res(false);return false;}return true;});if(name===curName){applyFlags(cur,pendingFlags);return;}const go=()=>{curName=name;cur=build(name);applyFlags(cur,pendingFlags);camT=0;if(composer){renderPass.scene=cur.scene;if(bokeh){bokeh.scene=cur.scene;bokeh.uniforms.focus.value=cur.focus;bokeh.uniforms.aperture.value=cur.aperture;}}camera.fov=cur.cam.fov||45;camera.near=cur.near||0.1;camera.far=cur.far||9000;camera.updateProjectionMatrix();if(bloom)bloom.strength=Q.bloom*(cur.bloomK||1);if(aoPass){aoPass.scene=cur.scene;aoPass.radius=cur.aoR||0.45;aoPass.maxD=cur.aoMax||0.6;aoPass.strength=cur.aoK===undefined?0.55:cur.aoK;}if(bokeh){bokeh.uniforms.nearClip.value=camera.near;bokeh.uniforms.farClip.value=camera.far;}fadeTarget=0;perfReset();showWait=showWait.filter(w=>{if(w.name===curName){w.res(true);return false;}return true;});};
 if(window.TUMAR_TEST){go();fade=0;return;}if(!cur){go();fade=1;return;}fadeTarget=1;setTimeout(go,420);}
const tA=new T.Vector3(),tB=new T.Vector3(),tL=new T.Vector3(),tL2=new T.Vector3();
let perfAcc=0,perfN=0,perfT=0;function perfReset(){perfAcc=0;perfN=0;perfT=0;}
function loop(){requestAnimationFrame(loop);const dt=Math.min(0.05,clock.getDelta());const t=clock.getElapsedTime();GU.time.value=t;fade+=(fadeTarget-fade)*Math.min(1,dt*6);
 if(cur&&cur.vis&&pendingFlags)for(const v of cur.vis)v.o.visible=!!v.when(pendingFlags);
 if(cur&&camCtl){camCtl(dt,t,camera);if(cur.skyMesh)cur.skyMesh.position.copy(camera.position);for(const ch of cur.chars)if(ch.visible&&ch.userData.update)ch.userData.update(dt,t);for(const f of cur.ticks)f(t,dt,camera);}
 else if(cur){const c=cur.cam;if(!freeze)camT+=dt;const dur=c.dur||40;const u=(Math.sin((camT/dur)*Math.PI*2-Math.PI/2)+1)/2;const e=sm(u);tA.set(...c.a);tB.set(...c.b);camera.position.copy(tA).lerp(tB,e);const big=tA.distanceTo(tB)>20?15:1;
  if(!freeze){camera.position.x+=Math.sin(t*0.7)*0.012*big;camera.position.y+=Math.sin(t*0.9+1)*0.01*big;}
  tL.set(...c.look);if(c.lookB){tL2.set(...c.lookB);tL.lerp(tL2,e);}camera.lookAt(tL);
  if(cur.skyMesh)cur.skyMesh.position.copy(camera.position);
  for(const ch of cur.chars)if(ch.visible&&ch.userData.update)ch.userData.update(dt,t);for(const f of cur.ticks)f(t,dt,camera);}
 if(composer&&cur){grade.uniforms.time.value=t;grade.uniforms.fade.value=fade;grade.uniforms.exposure.value=cur.exposure||1;grade.uniforms.rainAmt.value=(Q.water?1:0.6)*(cur.rainLens||0);grade.uniforms.alarm.value+=((ART.alarm?1:0)-grade.uniforms.alarm.value)*Math.min(1,dt*4);composer.render();}
 else if(cur){renderer.render(cur.scene,camera);canvasEl.style.opacity=1-fade;}
 // perf monitor
 perfT+=dt;if(perfT>1.5&&fade<0.05){perfAcc+=dt;perfN++;if(perfN>=90){const avg=perfAcc/perfN;perfReset();if(avg>0.042&&perfCb){const nq=qName==='high'?'medium':qName==='medium'?'low':null;if(nq)perfCb(nq);}}}}
function setQuality(q){if(!QUAL[q])return;qName=q;Q=QUAL[q];if(renderer){renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,Q.pr));resize();renderer.shadowMap.enabled=!!Q.shadow;if(bokeh)bokeh.enabled=Q.dof;if(bloom)bloom.strength=Q.bloom;if(aoPass)aoPass.enabled=!!Q.ao;if(fxaa)fxaa.enabled=!!Q.fxaa;if(san2)san2.enabled=!!(Q.ao||Q.dof);if(renderPass&&renderPass.setMS)renderPass.setMS(Q.msaa);}
 const keep=curName;built={};curName='';if(keep&&cur){cur=null;show(keep);}}
function prebuild(list,cb){let i=0;const step=()=>{if(i>=list.length){cb&&cb();return;}build(list[i++]);setTimeout(step,30);};step();}
function speak(who){if(!cur)return;for(const k in cur.byKey){const g=cur.byKey[k];const was=g.userData.speaking;g.userData.speaking=(k===who);if(k===who&&!was&&g.userData.rig&&!g.userData.pose&&!g.userData.walking&&Math.random()<0.55){g.userData.rig.once(Math.random()<0.6?'agree':'headShake',0.3,'idle');}}}
function anchor(id){if(!cur||!cur.anchors||!cur.anchors[id])return null;const v=cur.anchors[id].clone().project(camera);if(v.z>1)return null;return {x:(v.x*0.5+0.5)*100,y:(-v.y*0.5+0.5)*100};}
const lib={T,C,rng,hash,fbm,vn,ridge,sm,clamp,canvasTex,std,basic,emis,glow,box,cyl,textPlane,skyDome,range,ground,cityMat,bMats,streetGround,smogLayer,city,LOOK,crowdLook,unitLook,UNIT,makeChar,charMat,recolor,attachToBone,animRig,poseSit,rotBone,beam,aimBeam,flare,wetGround,wetFloor,rain,snow,dust,steam,fire,hemi,keyL,spotL,pointL,newCtx,finalize,V,glowTex,smokeTex,ringTex,windowTex,WIN,ornamentTex,concreteTex,woodTex,corrTex,rustTex,asphaltTex,hairTex,panelBlock,umbrella,spruceForest,droneSwarm,fireworks,A,GU,URLS,EXT,S,get Q(){return Q;},get qName(){return qName;},get camera(){return camera;},get renderer(){return renderer;}};
function whenShown(name){if(curName===name&&fade<0.6)return Promise.resolve(true);return new Promise(res=>{if(curName===name){setTimeout(()=>res(true),150);return;}showWait.push({name,res});});}
return {lib,addScene(name,fn){S[name]=fn;delete built[name];},onLoad(f){EXT.push(f);},whenShown,get curName(){return curName;},setCamControl(f){camCtl=f;if(!f)camT=0;},get _cur(){return cur;},get _cam(){return camera;},init,load,show,prebuild,anchor,speak,setQuality,get quality(){return qName;},set onPerf(f){perfCb=f;},set freeze(v){freeze=v;},get freeze(){return freeze;},alarm:false,get scenes(){return Object.keys(S);},get ready(){return A.ok;}};
})();
