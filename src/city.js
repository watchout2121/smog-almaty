// ============================================================
// СМОГ · город: реальный центр Алматы (OpenStreetMap, ODbL © участники OpenStreetMap; выборка github.com/farhat2222s/almaty60)
// Сцены 'city' (гл. 4 · 22.03.2049 · 07:20, пешком) и 'city_drive' (гл. 5 · 11:05, за рулём) + контроллер DRIVE.
// Машины: Kenney Car Kit (CC0) — только геометрия, материалы свои. Деревья/фонари/парковки/переходы — tools/geo_build.py.
// ============================================================
const CITY=(()=>{
'use strict';
const T=THREE,L=ART.lib;
const {C,rng,clamp,sm,canvasTex,std,emis,glow,box,cyl,textPlane,V}=L;
const BASE=window.SMOG_BASE||'';
const U=L.URLS;
U.geo=U.geo||BASE+'assets/geo/almaty.json';
const CAR_N=['sedan','sedan-sports','hatchback-sports','suv','suv-luxury','taxi','van','delivery'];
const carKey=n=>'car_'+n.replace(/-/g,'_');
CAR_N.forEach(n=>{const k=carKey(n);U[k]=U[k]||BASE+'assets/models/cars/'+n+'.glb';});
const D={geo:null,cars:{},ok:false};
const PI=Math.PI,TAU=PI*2;
const lerp=(a,b,k)=>a+(b-a)*k;
const angD=(a,b)=>{let d=((b-a+PI)%TAU+TAU)%TAU-PI;return d;};

// ---------------- загрузка ----------------
function fetchOk(u){return fetch(u).then(r=>{if(!r.ok)throw new Error(u+' '+r.status);return r;});}
function parseGLB(buf){const dv=new DataView(buf);const jl=dv.getUint32(12,true);const js=JSON.parse(new TextDecoder().decode(new Uint8Array(buf,20,jl)));const bo=20+jl;const bl=dv.getUint32(bo,true);const bin=buf.slice(bo+8,bo+8+bl);
 const acc=i=>{const a=js.accessors[i],bv=js.bufferViews[a.bufferView];const n={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type];const Ctor={5126:Float32Array,5123:Uint16Array,5125:Uint32Array,5121:Uint8Array}[a.componentType];const off=(bv.byteOffset||0)+(a.byteOffset||0);const es=Ctor.BYTES_PER_ELEMENT;
  if(bv.byteStride&&bv.byteStride!==n*es){const out=new Ctor(a.count*n);const src=new DataView(bin);for(let k=0;k<a.count;k++)for(let c=0;c<n;c++){const o=off+k*bv.byteStride+c*es;out[k*n+c]=es===4?(Ctor===Float32Array?src.getFloat32(o,true):src.getUint32(o,true)):es===2?src.getUint16(o,true):src.getUint8(o);}return out;}
  return new Ctor(bin.slice(off,off+a.count*n*es));};
 const mats=[];const par={};js.nodes.forEach((nd,i)=>(nd.children||[]).forEach(c=>par[c]=i));
 const local=nd=>{const m=new T.Matrix4();if(nd.matrix)m.fromArray(nd.matrix);else m.compose(new T.Vector3(...(nd.translation||[0,0,0])),new T.Quaternion(...(nd.rotation||[0,0,0,1])),new T.Vector3(...(nd.scale||[1,1,1])));return m;};
 const world=i=>{let m=local(js.nodes[i]);let p=par[i];while(p!==undefined){m=local(js.nodes[p]).multiply(m);p=par[p];}return m;};
 const parts=[];js.nodes.forEach((nd,i)=>{if(nd.mesh===undefined)return;const me=js.meshes[nd.mesh];me.primitives.forEach(pr=>{parts.push({name:me.name||nd.name||'',m:world(i),pos:acc(pr.attributes.POSITION),nor:pr.attributes.NORMAL!==undefined?acc(pr.attributes.NORMAL):null,uv:pr.attributes.TEXCOORD_0!==undefined?acc(pr.attributes.TEXCOORD_0):null,idx:pr.indices!==undefined?acc(pr.indices):null});});});
 return parts;}
// классы треугольников по ячейке палитры Kenney (16×4 ячеек 32×128): 0 краска,1 резина/тёмный пластик,2 нижняя отделка,3 диски,4 хром/белое,5 стекло,6 фары,7 стопы,8 плафон такси
function swatchCls(u,v,y){const c=Math.min(15,Math.max(0,Math.floor(u*16))),r=Math.min(3,Math.max(0,Math.floor(v*4)));
 if(r===1)return 0;if(r===0)return c<2?5:c<6?0:1;if(r===3){if(c<2)return 5;if(c<4)return 6;if(c<6)return 7;return 0;}
 if(c<2)return 0;if(c<6)return 1;if(c<10)return 2;if(c<12)return 3;if(c<14)return y>1.05?8:4;return 0;}
function buildCar(name,parts){// → {body geo (non-indexed, aCls), wheels:[{x,y,z,r,w}], size}
 const P=[],N=[],K=[];const wheels=[];const S=CAR_S[name]||CAR_S.sedan;
 const v=new T.Vector3(),n=new T.Vector3(),nm=new T.Matrix3();
 for(const p of parts){const isW=/^wheel/.test(p.name)&&p.name!=='wheel-back';
  if(isW){const c=new T.Vector3().setFromMatrixPosition(p.m);let x0=1e9,x1=-1e9,r=0;for(let i=0;i<p.pos.length;i+=3){x0=Math.min(x0,p.pos[i]);x1=Math.max(x1,p.pos[i]);r=Math.max(r,Math.hypot(p.pos[i+1],p.pos[i+2]));}
   wheels.push({x:(c.x+(x0+x1)/2)*S[0],z:c.z*S[2],y:c.y*S[1],r:r*S[1],w:(x1-x0)*S[0]*0.92});continue;}
  nm.getNormalMatrix(p.m);const cnt=p.idx?p.idx.length:p.pos.length/3;
  for(let t=0;t<cnt;t+=3){let cu=0,cv=0,cy=0;const ids=[];for(let k=0;k<3;k++){const i=p.idx?p.idx[t+k]:t+k;ids.push(i);if(p.uv){cu+=p.uv[i*2];cv+=p.uv[i*2+1];}v.set(p.pos[i*3],p.pos[i*3+1],p.pos[i*3+2]).applyMatrix4(p.m);cy+=v.y;}
   const cls=p.uv?swatchCls(cu/3,cv/3,cy/3):0;
   for(const i of ids){v.set(p.pos[i*3],p.pos[i*3+1],p.pos[i*3+2]).applyMatrix4(p.m);P.push(v.x*S[0],v.y*S[1],v.z*S[2]);if(p.nor){n.set(p.nor[i*3],p.nor[i*3+1],p.nor[i*3+2]).applyMatrix3(nm);n.set(n.x/S[0],n.y/S[1],n.z/S[2]).normalize();N.push(n.x,n.y,n.z);}else N.push(0,1,0);K.push(cls);}}}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(P,3));g.setAttribute('normal',new T.Float32BufferAttribute(N,3));g.setAttribute('aCls',new T.Float32BufferAttribute(K,1));
 g.computeBoundingBox();const bb=g.boundingBox;
 // свои колёса: шина + диск (низкополигональные)
 const wg=wheelGeo();const merged=[g];
 for(const w of wheels){const q=wg.clone();q.scale(w.w,w.r,w.r);q.translate(w.x,w.y,w.z);merged.push(q);}
 const all=T.BufferGeometryUtils.mergeBufferGeometries(merged,false);all.computeBoundingSphere();all.computeBoundingBox();
 return {geo:all,body:g,wheels,len:bb.max.z-bb.min.z,wid:bb.max.x-bb.min.x,h:bb.max.y,zc:(bb.max.z+bb.min.z)/2,name};}
// масштаб «игрушечных» моделей к реальным пропорциям: [sx,sy,sz]
const CAR_S={sedan:[1.2,1.2,1.72],'sedan-sports':[1.22,1.18,1.74],'hatchback-sports':[1.2,1.2,1.56],suv:[1.26,1.28,1.72],'suv-luxury':[1.26,1.26,1.74],taxi:[1.2,1.2,1.68],van:[1.3,1.32,1.72],delivery:[1.36,1.42,1.62]};
let _wg=null;function wheelGeo(){if(_wg)return _wg;const seg=12;const P=[],N=[],K=[];
 const tri=(p0,p1,p2,n,k)=>{const e1=[p1[0]-p0[0],p1[1]-p0[1],p1[2]-p0[2]],e2=[p2[0]-p0[0],p2[1]-p0[1],p2[2]-p0[2]];const cx=e1[1]*e2[2]-e1[2]*e2[1],cy=e1[2]*e2[0]-e1[0]*e2[2],cz=e1[0]*e2[1]-e1[1]*e2[0];
  const q=(cx*n[0]+cy*n[1]+cz*n[2])<0?[p0,p2,p1]:[p0,p1,p2];for(const v of q){P.push(v[0],v[1],v[2]);N.push(n[0],n[1],n[2]);K.push(k);}};
 const rr=0.6;
 for(let i=0;i<seg;i++){const a0=i/seg*TAU,a1=(i+1)/seg*TAU;const y0=Math.cos(a0),z0=Math.sin(a0),y1=Math.cos(a1),z1=Math.sin(a1);const am=(a0+a1)/2;const nm=[0,Math.cos(am),Math.sin(am)];
  tri([-0.5,y0,z0],[0.5,y1,z1],[0.5,y0,z0],nm,1);tri([-0.5,y0,z0],[-0.5,y1,z1],[0.5,y1,z1],nm,1);
  for(const sd of [-1,1]){const n=[sd,0,0];tri([sd*0.5,y0,z0],[sd*0.5,y0*rr,z0*rr],[sd*0.5,y1,z1],n,1);tri([sd*0.5,y1,z1],[sd*0.5,y0*rr,z0*rr],[sd*0.5,y1*rr,z1*rr],n,1);tri([sd*0.44,0,0],[sd*0.44,y0*rr,z0*rr],[sd*0.44,y1*rr,z1*rr],n,3);}}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(P,3));g.setAttribute('normal',new T.Float32BufferAttribute(N,3));g.setAttribute('aCls',new T.Float32BufferAttribute(K,1));_wg=g;return g;}

ART.onLoad((A,URLS)=>{const jobs=[fetchOk(URLS.geo).then(r=>r.json()).then(j=>{D.geo=j;})];
 CAR_N.forEach(n=>jobs.push(fetchOk(URLS[carKey(n)]).then(r=>r.arrayBuffer()).then(b=>{D.cars[n]=buildCar(n,parseGLB(b));}).catch(e=>console.warn('car',n,e))));
 return Promise.all(jobs).then(()=>{D.ok=!!D.geo;});});

// ---------------- общий шум (тайлящийся, 4 канала) ----------------
let NOISE=null;
function noiseTex(){if(NOISE)return NOISE;const S=256;const c=document.createElement('canvas');c.width=c.height=S;const x=c.getContext('2d');const id=x.createImageData(S,S);
 const r=rng(99);const lat=(n,seed)=>{const a=new Float32Array(n*n);const rr=rng(seed);for(let i=0;i<a.length;i++)a[i]=rr();return a;};
 const L1=[lat(8,1),lat(16,2),lat(32,3),lat(64,4)],L2=[lat(8,5),lat(16,6),lat(32,7),lat(64,8)];
 const vn=(a,n,u,v)=>{const x0=Math.floor(u),y0=Math.floor(v);const fx=u-x0,fy=v-y0;const s=t=>t*t*(3-2*t);const g=(i,j)=>a[((j%n+n)%n)*n+((i%n+n)%n)];const a0=g(x0,y0),a1=g(x0+1,y0),a2=g(x0,y0+1),a3=g(x0+1,y0+1);const sx=s(fx),sy=s(fy);return a0+(a1-a0)*sx+(a2-a0)*sy+(a0-a1-a2+a3)*sx*sy;};
 for(let j=0;j<S;j++)for(let i=0;i<S;i++){let f1=0,f2=0,amp=0.5,tot=0;for(let o=0;o<4;o++){const n=8<<o;f1+=vn(L1[o],n,i/S*n,j/S*n)*amp;f2+=vn(L2[o],n,i/S*n,j/S*n)*amp;tot+=amp;amp*=0.5;}f1/=tot;f2/=tot;
  const rid=1-Math.abs(vn(L2[2],32,i/S*32,j/S*32)*2-1);const k=(j*S+i)*4;id.data[k]=f1*255;id.data[k+1]=f2*255;id.data[k+2]=Math.pow(rid,6)*255;id.data[k+3]=r()*255;}
 x.putImageData(id,0,0);const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=4;NOISE=t;return t;}

// ---------------- дымка: общие юниформы для всех материалов города ----------------
const SU={uSunDir:{value:new T.Vector3(0.9,0.2,0.2).normalize()},uSunGlow:{value:new T.Color(1,0.6,0.3)},uNoise:{value:null},uTime:L.GU.time,uLit:{value:0.3},uWet:{value:0.4},uFogC:{value:new T.Color()}};
const SMOG_FOG=`#ifdef USE_FOG
#ifdef FOG_EXP2
{vec3 sdv=vSWP-cameraPosition;float fd=length(sdv);float ff=1.0-exp(-fogDensity*fogDensity*fd*fd);float sdt=max(dot(sdv/max(fd,1e-3),uSunDir),0.0);
 vec3 fcol=fogColor+uSunGlow*(pow(sdt,5.0)*0.32+pow(sdt,28.0)*0.7);float hk=clamp((vSWP.y-cameraPosition.y)/140.0,0.0,1.0);ff*=1.0-0.25*hk;
 gl_FragColor.rgb=mix(gl_FragColor.rgb,fcol,ff);}
#else
 #include <fog_fragment>
#endif
#endif`;
const SMOG_FOG_PUBLIC=SMOG_FOG;
// патч MeshStandard/Physical: мировые позиция/нормаль, своя дымка, вставки кода
function smogMat(m,o){o=o||{};const key='smog_'+(o.key||'x');
 m.onBeforeCompile=sh=>{Object.assign(sh.uniforms,SU,o.uniforms||{});
  let vs=sh.vertexShader,fs=sh.fragmentShader;
  vs='varying vec3 vSWP;varying vec3 vSWN;varying vec2 vUv0;\n'+(o.vDecl||'')+'\n'+vs.replace('#include <project_vertex>',`#include <project_vertex>
  {vec4 swp=vec4(transformed,1.0);vec3 swn=objectNormal;
  #ifdef USE_INSTANCING
   swp=instanceMatrix*swp;swn=mat3(instanceMatrix)*swn;
  #endif
  swp=modelMatrix*swp;vSWP=swp.xyz;vSWN=normalize(mat3(modelMatrix)*swn);vUv0=uv;}
  `+(o.vert||''));
  fs='varying vec3 vSWP;varying vec3 vSWN;varying vec2 vUv0;uniform vec3 uSunDir;uniform vec3 uSunGlow;uniform sampler2D uNoise;uniform float uTime;uniform float uLit;uniform float uWet;\n'+(o.fDecl||'')+'\n'+fs;
  if(o.map)fs=fs.replace('#include <map_fragment>','#include <map_fragment>\n'+o.map);
  if(o.col)fs=fs.replace('#include <color_fragment>','#include <color_fragment>\n'+o.col);
  if(o.rough)fs=fs.replace('#include <metalnessmap_fragment>','#include <metalnessmap_fragment>\n'+o.rough);
  if(o.emis)fs=fs.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\n'+o.emis);
  if(o.lights)fs=fs.replace('#include <lights_physical_fragment>','#include <lights_physical_fragment>\n'+o.lights);
  if(o.pre)fs=fs.replace('void main() {','void main() {\n'+o.pre);
  fs=fs.replace('#include <fog_fragment>',SMOG_FOG);
  sh.vertexShader=vs;sh.fragmentShader=fs;};
 m.customProgramCacheKey=()=>key;return m;}
const NZ='float nz(vec2 p){return texture2D(uNoise,p).r;}float nz2(vec2 p){return texture2D(uNoise,p).g;}float hh(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}\n';
// комнаты за окнами (interior mapping, как в City Sample): луч от камеры идёт внутрь ячейки «окно × этаж» глубиной cell.z
// до задней стены, боковой стены, пола или потолка; мебель, картины, телевизоры, офисные перегородки и лампы — по хэшу комнаты.
// Возвращает свет комнаты: днём — рассеянный свет из окна (amb = цвет смога), вечером — лампа (lampC); emi — лампы и экраны.
const ROOM=`vec3 roomMap(vec2 f,vec2 id,float sd,vec3 N,vec3 vd,vec3 cell,float off,float lit,vec3 lampC,vec3 amb,out vec3 emi){
 vec3 Tn=vec3(-N.z,0.0,N.x);vec3 r=vec3(dot(vd,Tn),vd.y,max(dot(vd,-N),0.05))/cell;
 r.x=abs(r.x)<1e-4?1e-4:r.x;r.y=abs(r.y)<1e-4?1e-4:r.y;
 vec3 p=vec3(f,0.0);vec3 t3=(step(0.0,r)-p)/r;float t=min(min(t3.x,t3.y),t3.z);vec3 h=p+r*t;
 float a=hh(id*1.31+sd*7.7),b=hh(id*2.17+sd*3.3),c=hh(id*0.73+sd*11.1);
 vec3 wall=off>0.5?mix(vec3(0.6,0.62,0.64),vec3(0.74,0.73,0.7),a):(a<0.3?vec3(0.72,0.63,0.5):a<0.55?vec3(0.55,0.62,0.66):a<0.8?vec3(0.78,0.74,0.67):vec3(0.52,0.6,0.47));
 vec3 col;emi=vec3(0.0);
 if(t==t3.z){col=wall;
  if(off>0.5){float part=step(h.y,0.4)*step(0.5,fract(h.x*3.0+b));col=mix(col,vec3(0.3,0.32,0.35),part);float sc=step(0.3,h.y)*step(h.y,0.4)*step(0.7,fract(h.x*6.0+c));emi+=vec3(0.35,0.55,0.8)*sc*0.5;}
  else{float fu=step(h.y,0.42)*step(0.08+0.3*b,h.x)*step(h.x,0.5+0.4*b);col=mix(col,mix(vec3(0.24,0.17,0.11),vec3(0.3,0.32,0.36),c),fu);
   float pic=step(0.56,h.y)*step(h.y,0.76)*step(0.62-0.3*c,h.x)*step(h.x,0.8-0.3*c)*step(0.4,b);col=mix(col,vec3(0.18,0.28,0.4)+c*0.3,pic);
   float tv=step(0.3,h.y)*step(h.y,0.52)*step(0.15,h.x)*step(h.x,0.45)*step(0.78,c);col=mix(col,vec3(0.01),tv);emi+=vec3(0.4,0.55,0.9)*tv*step(0.5,a)*0.7;}}
 else if(t==t3.x){col=wall*0.84;float wd=step(h.y,0.72)*step(0.5,h.z)*step(h.z,0.85)*step(0.55,c)*(1.0-off);col=mix(col,vec3(0.26,0.18,0.12),wd);}
 else if(r.y<0.0){col=off>0.5?vec3(0.3,0.31,0.33):vec3(0.45,0.31,0.2)*(0.85+0.15*step(0.5,fract(h.x*5.0+b)));}
 else{col=vec3(0.84,0.84,0.82);
  if(off>0.5)emi+=lampC*step(0.62,fract(h.z*2.5))*step(abs(h.x-0.5),0.3)*1.6*lit;else emi+=lampC*(1.0-smoothstep(0.05,0.09,length(vec2(h.x-0.5,h.z-0.5))))*2.2*lit;}
 float lamp=0.5+0.5*(1.0-smoothstep(0.0,0.85,length(vec2(h.x-0.5,h.z-0.5))+abs(h.y-0.9)*0.3));
 return mix(col*amb*(0.5*(1.0-0.7*h.z)),col*lampC*lamp*0.6,lit);}
`;

// ---------------- материалы поверхностей ----------------
const M={};
function mats(){if(M.ok)return M;M.ok=true;SU.uNoise.value=noiseTex();
 // асфальт дорог + разметка: uv=(s,v) в метрах вдоль/поперёк; aR=(hw,lanes,flags,mark)
 M.road=smogMat(new T.MeshStandardMaterial({color:0xffffff,roughness:0.86,metalness:0,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-6}),{key:'road',
  vDecl:'attribute vec4 aR;varying vec4 vR;',vert:'vR=aR;',fDecl:NZ+'varying vec4 vR;float gWet;float gMark;',
  map:`{vec2 wp=vSWP.xz;float s=vUv0.x,v=vUv0.y;float hw=vR.x,lanes=max(vR.y,1.0),fl=vR.z,mk=vR.w;
   float n1=nz(wp*0.011),n2=nz2(wp*0.047),n3=texture2D(uNoise,wp*0.31).a,n4=nz(wp*0.13+3.1);
   vec3 c=vec3(0.052,0.053,0.057)*(0.78+0.5*n2)*(0.9+0.2*n3);
   float pt=smoothstep(0.605,0.62,nz2(wp*0.018+vec2(0.31,0.77)));c=mix(c,c*vec3(0.74,0.75,0.78),pt);
   float cr=texture2D(uNoise,wp*0.09).b;c*=1.0-0.45*smoothstep(0.55,0.95,cr)*(1.0-pt);
   float ow=mod(fl,2.0);float lw=3.25;float av=abs(v);
   float inl=ow>0.5?(v+hw-0.3)/lw:av/lw;float lf=fract(inl);float trk=smoothstep(0.16,0.02,abs(lf-0.27))+smoothstep(0.16,0.02,abs(lf-0.73));
   c*=1.0-0.13*trk*(0.6+0.4*n4);
   float gut=smoothstep(hw-1.1,hw-0.1,av);c=mix(c,vec3(0.085,0.075,0.062),gut*0.55*(0.6+0.8*n2));
   gWet=clamp(uWet*(0.35+smoothstep(0.45,0.72,n1)*0.9)+gut*0.25+trk*0.15,0.0,1.0);
   float m=0.0;float dash=step(fract(s/12.0),0.28);float pw=0.5+0.5*smoothstep(0.25,0.75,n4);
   m=max(m,smoothstep(0.085,0.055,abs(av-(hw-0.35))));
   if(ow<0.5){m=max(m,smoothstep(0.07,0.045,abs(av-0.13)));for(float k=1.0;k<4.0;k++){if(k<lanes*0.5)m=max(m,dash*smoothstep(0.075,0.05,abs(av-k*lw)));}}
   else{float lv=v+hw-0.3;for(float k=1.0;k<6.0;k++){if(k<lanes){float bus=step(3.5,fl)*step(lanes-1.5,k)*step(k,lanes-0.5);m=max(m,mix(dash,1.0,bus)*smoothstep(0.075+bus*0.08,0.05+bus*0.08,abs(lv-k*lw)));}}
    float isbus=step(3.5,fl)*step((lanes-1.0)*lw,lv);c=mix(c,vec3(0.13,0.055,0.04),isbus*0.55*(0.7+0.3*n2));}
   m*=mk*pw*(0.75+0.25*n3);gMark=m;
   c=mix(c,vec3(0.62,0.62,0.6),m);diffuseColor.rgb=c;}`,
  rough:'roughnessFactor=mix(mix(0.9,0.62,gMark),0.12,gWet*0.85);'});
 // брусчатка/плитка тротуаров, площадей, дорожек: uv=(s,v); aP=(kind,w) kind:0 асфальт,1 плитка,2 гранит площади,3 газон-полоса с арыком
 M.pave=smogMat(new T.MeshStandardMaterial({color:0xffffff,roughness:0.8,metalness:0,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-3}),{key:'pave',
  vDecl:'attribute vec2 aP;varying vec2 vP;',vert:'vP=aP;',fDecl:NZ+'varying vec2 vP;float gWet;',
  map:`{vec2 wp=vSWP.xz;float k=vP.x;float n1=nz(wp*0.02),n2=nz2(wp*0.09),n3=texture2D(uNoise,wp*0.5).a;vec3 c;gWet=uWet*smoothstep(0.5,0.75,n1)*0.8;
   if(k<0.5){c=vec3(0.09,0.088,0.085)*(0.8+0.4*n2)*(0.9+0.2*n3);}
   else if(k<1.5){vec2 q=vec2(vUv0.x,vUv0.y)/0.5;q.x+=floor(q.y)*0.5;vec2 id=floor(q),f=fract(q);float j=smoothstep(0.0,0.06,f.x)*smoothstep(1.0,0.94,f.x)*smoothstep(0.0,0.06,f.y)*smoothstep(1.0,0.94,f.y);
    float t=hh(id);c=mix(vec3(0.19,0.18,0.17),vec3(0.24,0.2,0.18),step(0.8,t))*(0.8+0.3*t)*(0.75+0.35*n2);c*=mix(0.55,1.0,j);}
   else if(k<2.5){vec2 q=wp/vec2(1.2,0.8);vec2 id=floor(q),f=fract(q);float j=smoothstep(0.0,0.03,f.x)*smoothstep(1.0,0.97,f.x)*smoothstep(0.0,0.04,f.y)*smoothstep(1.0,0.96,f.y);float t=hh(id);c=vec3(0.2,0.19,0.185)*(0.75+0.35*t)*(0.8+0.3*n2);c*=mix(0.6,1.0,j);gWet*=1.3;}
   else{float v=vUv0.y;float ar=smoothstep(0.25,0.18,abs(v-vP.y));float edge=smoothstep(0.34,0.28,abs(v-vP.y))-ar;
    vec3 soil=vec3(0.075,0.058,0.042),grass=vec3(0.07,0.075,0.04),leaf=vec3(0.11,0.07,0.035);c=mix(soil,grass,smoothstep(0.35,0.7,n1))*(0.75+0.5*n2);c=mix(c,leaf,smoothstep(0.62,0.8,n3)*0.6);
    c=mix(c,vec3(0.17,0.165,0.155)*(0.8+0.3*n2),edge);c=mix(c,vec3(0.03,0.028,0.026),ar);gWet=max(gWet,ar*0.9);}
   c=mix(c,c*vec3(0.8,0.75,0.7),smoothstep(0.55,0.8,nz(wp*0.05+1.7))*0.5);diffuseColor.rgb=c;}`,
  rough:'roughnessFactor=mix(roughnessFactor,0.15,gWet);'});
 // газоны: мартовская трава, листва, земля, остатки грязного снега
 M.lawn=smogMat(new T.MeshStandardMaterial({color:0xffffff,roughness:0.95,metalness:0,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-2}),{key:'lawn',fDecl:NZ,
  map:`{vec2 wp=vSWP.xz;float n1=nz(wp*0.035),n2=nz2(wp*0.16),n3=texture2D(uNoise,wp*0.7).a,n4=nz(wp*0.006+0.5);
   vec3 dead=vec3(0.085,0.07,0.04),green=vec3(0.05,0.07,0.03),soil=vec3(0.06,0.045,0.032),leaf=vec3(0.12,0.068,0.03);
   vec3 c=mix(dead,green,smoothstep(0.4,0.75,n1)*0.8);c=mix(c,soil,smoothstep(0.58,0.7,n2)*0.8);c=mix(c,leaf,smoothstep(0.55,0.85,n3)*0.5*(1.0-n1));
   float snow=smoothstep(0.7,0.76,n4*0.6+n2*0.4);c=mix(c,vec3(0.3,0.29,0.27)*(0.8+0.3*n3),snow*0.85);c*=0.85+0.3*n3;diffuseColor.rgb=c;}`});
 // дворы/земля: старый асфальт + грязь
 M.ground=smogMat(new T.MeshStandardMaterial({color:0xffffff,roughness:0.9,metalness:0}),{key:'ground',fDecl:NZ+'float gWet;',
  map:`{vec2 wp=vSWP.xz;float n1=nz(wp*0.013),n2=nz2(wp*0.07),n3=texture2D(uNoise,wp*0.4).a,n4=nz(wp*0.004);
   vec3 asp=vec3(0.068,0.068,0.066)*(0.8+0.35*n2),dirt=vec3(0.07,0.058,0.046)*(0.8+0.4*n3);vec3 c=mix(asp,dirt,smoothstep(0.5,0.72,n1)*0.8);
   c*=1.0-0.35*smoothstep(0.6,0.95,texture2D(uNoise,wp*0.07).b);c=mix(c,vec3(0.11,0.07,0.035),smoothstep(0.7,0.9,n3)*0.3);
   gWet=uWet*smoothstep(0.55,0.8,n4+n2*0.3);diffuseColor.rgb=c*(0.9+0.2*n3);}`,rough:'roughnessFactor=mix(roughnessFactor,0.18,gWet*0.8);'});
 M.curb=smogMat(new T.MeshStandardMaterial({color:0xffffff,roughness:0.85}),{key:'curb',fDecl:NZ,map:`{float n=nz2(vSWP.xz*0.3);vec3 c=vec3(0.15,0.145,0.14)*(0.75+0.4*n);c*=mix(0.55,1.0,smoothstep(0.02,0.12,vSWP.y));diffuseColor.rgb=c;}`});
 // зебры и стоп-линии: uv в метрах (u поперёк дороги, v вдоль)
 M.zebra=smogMat(new T.MeshStandardMaterial({color:0xffffff,roughness:0.6,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-10}),{key:'zebra',fDecl:NZ+'varying float vZa;',vDecl:'attribute float aZ;varying float vZa;',vert:'vZa=aZ;',
  map:`{float n=texture2D(uNoise,vSWP.xz*0.35).a,n2=nz(vSWP.xz*0.2);float a;if(vZa<0.5){a=step(0.5,fract(vUv0.x/1.0+0.25));}else{a=1.0;}
   a*=smoothstep(0.2,0.55,n2*0.6+n*0.5+0.15);diffuseColor=vec4(vec3(0.6,0.6,0.58)*(0.85+0.2*n),a*0.92);}`});
 M.decal=null;
 return M;}

// ---------------- фасады: одна «городская» шейдерная модель на все здания ----------------
// uv=(колонка, этаж), color=базовый цвет, aB=(стиль, seed, высота этажа, витрина); стили: 0 кирпич,1 штукатурка (сталинка),2 панель,3 стекло,4 камень-офис,5 торговые 1-2 эт.,6 стройка,7 гаражи,8 плоская кровля,9 металлическая кровля,10 навес
function buildingMat(){if(M.bld)return M.bld;
 M.bld=smogMat(new T.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:0.85,metalness:0}),{key:'bld',
  vDecl:'attribute vec4 aB;attribute vec2 aH;varying vec4 vB;varying vec2 vH;',vert:'vB=aB;vH=aH;',fDecl:NZ+ROOM+'varying vec4 vB;varying vec2 vH;float gGlass;float gRough;vec3 gEm;',
  map:`{float st=floor(vB.x+0.5),seed=floor(vB.y*997.0+0.5)/997.0,fh=vB.z,shop=vB.w;float top=vH.x,wsd=floor(vH.y*991.0+0.5)/991.0;vec3 base=diffuseColor.rgb;vec2 wp=vSWP.xz;vec3 an=abs(vSWN);float y=vSWP.y;
   gGlass=0.0;gRough=0.9;gEm=vec3(0.0);
   float n2=nz2(vec2(wp.x+wp.y,y)*0.05+seed*7.0),n3=texture2D(uNoise,vec2(dot(wp,vec2(0.7,0.7))*0.35,y*0.35)+seed).a;
   vec3 c=base;
   if(st>7.5){
    if(st<8.5){float nn=nz(wp*0.08+seed);c=vec3(0.075,0.072,0.07)*(0.7+0.6*nn)*(0.9+0.2*n3);c=mix(c,vec3(0.15,0.14,0.13),smoothstep(0.62,0.7,nz2(wp*0.03))*0.6);c=mix(c,vec3(0.03,0.035,0.04),smoothstep(0.66,0.7,nz(wp*0.021+seed*3.0))*0.7);}
    else if(st<9.5){float sm2=smoothstep(0.08,0.0,abs(fract(vUv0.x/0.55)-0.5)-0.44);c=base*(0.8+0.3*n2)*(1.0-0.35*sm2);c=mix(c,vec3(0.2,0.09,0.045),smoothstep(0.55,0.8,texture2D(uNoise,vec2(vUv0.x*0.05,vUv0.y*0.4)+seed).r)*0.55);gRough=0.55;}
    else{c=base*(0.8+0.3*n2);}
   }else if(an.y<0.5){
    vec2 cell=vUv0;vec2 id=floor(cell);vec2 f=fract(cell);float fl=id.y;
    float h1=hh(id+vec2(seed*91.7,wsd*37.1));float h2=hh(id.yx*1.37+seed*13.1+wsd);float h3=hh(id*2.17+seed*5.3+wsd*1.1);
    float ww=0.46,wh=0.56,wy=0.22;
    if(st<0.5){ww=0.4;wh=0.52;wy=0.25;}else if(st<1.5){ww=0.38;wh=0.58;wy=0.2;}else if(st<2.5){ww=0.46;wh=0.48;wy=0.27;}else if(st<3.5){ww=0.94;wh=0.74;wy=0.13;}else if(st<4.5){ww=0.84;wh=0.42;wy=0.3;}else if(st<5.5){ww=0.56;wh=0.55;wy=0.2;}else{ww=0.0;wh=0.0;}
    float gf=step(fl,0.5)*step(0.5,shop)*step(st,5.5);
    if(gf>0.5){ww=0.88;wh=0.7;wy=0.07;}
    float x0=0.5-ww*0.5,x1=0.5+ww*0.5,y0=wy,y1=wy+wh;
    float win=smoothstep(x0,x0+0.015,f.x)*smoothstep(x1,x1-0.015,f.x)*smoothstep(y0,y0+0.015,f.y)*smoothstep(y1,y1-0.015,f.y);
    float cor=step(top-0.75,y);float plinth=step(y,0.75)*(1.0-gf);
    // фактуры стены
    if(st<0.5){vec2 bq=vec2((vUv0.x*2.6+step(0.5,fract(y/0.075*0.5))*0.5)/0.26,y/0.075);float bj=smoothstep(0.0,0.12,fract(bq.y))*smoothstep(0.0,0.07,fract(bq.x));c*=mix(0.74,1.0,bj)*(0.86+0.28*hh(floor(bq)));}
    else if(st<1.5){float rust=step(fl,0.5)*smoothstep(0.1,0.0,abs(fract(y/0.45)-0.5)-0.44)*0.22;c*=1.0-rust;float pil=smoothstep(0.03,0.0,abs(f.x-0.02))*(1.0-win);c=mix(c,c*1.12,pil);float band=smoothstep(0.035,0.0,abs(f.y-0.03))*0.12;c*=1.0-band;}
    else if(st<2.5){float seam=max(smoothstep(0.03,0.0,abs(f.y-0.015)),smoothstep(0.018,0.0,abs(fract(vUv0.x*0.5)-0.002)));c*=1.0-0.3*seam;c*=0.9+0.2*hh(floor(vec2(vUv0.x*0.5,fl))+seed);}
    else if(st<3.5){float sp=1.0-smoothstep(0.11,0.13,f.y)*smoothstep(0.89,0.87,f.y);c=mix(c,vec3(0.025,0.03,0.035),0.35*sp);}
    else if(st<4.5){c*=0.9+0.14*hh(floor(vec2(vUv0.x*2.0,y/0.6)));}
    if(st>5.5&&st<6.5){float slab=smoothstep(0.1,0.06,f.y);float colm=smoothstep(0.08,0.04,abs(f.x-0.5));c=mix(vec3(0.012),base,max(slab,colm));win=0.0;}
    else if(st>6.5){float door=step(fl,0.5)*smoothstep(0.1,0.12,f.x)*smoothstep(0.9,0.88,f.x)*step(f.y,0.75);c=mix(base,base*vec3(0.72,0.76,0.8)*(0.8+0.4*step(0.5,fract(f.y*14.0))),door);win=0.0;}
    // застеклённые балконы (сталинки/панельки/кирпич): случайные ячейки
    float balc=step(st,2.5)*step(0.5,fl)*step(0.64,h3)*(1.0-cor)*(1.0-gf);
    if(balc>0.5){float bx=smoothstep(0.06,0.08,f.x)*smoothstep(0.94,0.92,f.x),by=smoothstep(0.0,0.02,f.y)*smoothstep(0.93,0.91,f.y);float bm=bx*by;
     float gl=bm*step(0.46,f.y);vec3 bcol=mix(vec3(0.55,0.54,0.5),vec3(0.3,0.33,0.36),step(0.5,hh(id+3.3)));c=mix(c,bcol*(0.8+0.3*n2),bm);win=gl;y0=0.46;y1=0.91;x0=0.08;x1=0.92;
     float fr=smoothstep(0.02,0.0,abs(fract(f.x*4.0)-0.5)-0.46)*gl;c=mix(c,vec3(0.5),fr);}
    // откосы: тень сверху/сбоку, подоконник
    float rev=win*(smoothstep(y1-0.07,y1,f.y)+smoothstep(x0+0.05,x0,f.x)*0.6);float sill=(1.0-win)*smoothstep(0.03,0.0,abs(f.y-(y0-0.012)))*step(x0-0.03,f.x)*step(f.x,x1+0.03)*step(st,2.5)*(1.0-gf);
    // карниз и цоколь
    if(cor>0.5){c=mix(c,c*vec3(0.78,0.76,0.74),0.8);c*=1.0-0.35*smoothstep(0.08,0.0,abs(y-(top-0.72)));win*=0.0;}
    c=mix(c,vec3(0.16,0.15,0.14)*(0.8+0.4*n2),plinth*0.85);
    // грязь: подтёки
    float streak=smoothstep(0.35,0.8,texture2D(uNoise,vec2(dot(wp,vec2(0.71,0.71))*0.9,y*0.03)+seed).g);c*=1.0-0.3*streak*(1.0-win);c*=mix(0.62,1.0,smoothstep(0.0,1.4,y));
    // окна: отражение неба, шторы, свет
    float lit=step(h1,uLit*(0.45+seed*0.9))*(1.0-gf);float warm=step(h2,0.74);
    vec3 wc=mix(vec3(0.66,0.76,0.9),vec3(1.0,0.7,0.42),warm)*(0.45+0.55*hh(id*3.1+seed));
    vec3 vd=normalize(vSWP-cameraPosition);float fres=pow(clamp(1.0-abs(dot(vd,vSWN)),0.0,1.0),3.0);
    vec3 refl=mix(fogColor*0.5,fogColor*0.95+uSunGlow*0.15,fres);
    float curt=step(0.45,hh(id+9.1+wsd));vec3 cc=mix(vec3(0.34,0.3,0.25),vec3(0.2,0.24,0.26),step(0.6,hh(id+4.4)));
    vec3 glass=mix(vec3(0.02,0.022,0.025),cc*0.5,curt*0.7);glass=mix(glass,refl,0.18+0.62*fres);
    // витрины первого этажа: 07:20 — половина закрыта рольставнями
    float shut=0.0;
    if(gf>0.5){float open=step(0.55,hh(vec2(id.x,seed*33.0)+wsd));shut=1.0-open;
     vec3 shop2=mix(vec3(1.0,0.82,0.58),vec3(0.8,0.9,1.0),step(0.72,hh(id*1.7)))*(0.55+0.45*hh(id+1.9));
     if(open>0.5){vec2 q=vec2((f.x-x0)/(x1-x0),(f.y-y0)/(y1-y0));float shelf=step(0.78,fract(q.y*4.0+0.1))*step(q.y,0.8);float goods=step(0.35,hh(floor(vec2(q.x*26.0,q.y*4.0))+id+wsd))*(1.0-shelf)*step(q.y,0.8)*step(0.12,q.y);
      vec3 gc=mix(vec3(0.9,0.3,0.2),vec3(0.2,0.6,0.9),hh(floor(vec2(q.x*26.0,q.y*4.0))+id*1.3));vec3 inter=shop2*(0.45+0.55*q.y)*(1.0-0.55*goods)+gc*goods*0.25;inter*=1.0-0.6*shelf;
      float pers=smoothstep(0.3,0.0,abs(q.x-hh(id+3.0)))*step(q.y,0.55)*step(0.62,hh(id+8.0));inter*=1.0-0.8*pers;gEm+=inter*win*0.6;glass=mix(glass,inter*0.2,0.6);}
     else{float cor2=0.6+0.4*step(0.5,fract(f.y*24.0));vec3 sh=vec3(0.32,0.33,0.34)*cor2*(0.8+0.3*n2);float gr=smoothstep(0.55,0.62,texture2D(uNoise,vec2(f.x*1.3+id.x*0.37,f.y*0.8)).b)*step(f.y,0.55);sh=mix(sh,mix(vec3(0.5,0.12,0.15),vec3(0.1,0.25,0.5),step(0.5,hh(id+5.0))),gr*0.8);glass=sh;}
     float band=smoothstep(0.8,0.82,f.y)*smoothstep(0.98,0.96,f.y)*smoothstep(0.03,0.06,f.x)*smoothstep(0.97,0.94,f.x);float hs=hh(vec2(id.x,seed*33.0)+wsd*2.0);
     vec3 sc=hs<0.25?vec3(0.9,0.2,0.15):hs<0.5?vec3(0.2,0.7,0.9):hs<0.75?vec3(0.95,0.7,0.2):vec3(0.85,0.88,0.84);
     float txt=step(0.42,hh(floor(vec2(f.x*46.0,f.y*16.0))+id+wsd))*smoothstep(0.855,0.865,f.y)*smoothstep(0.945,0.935,f.y)*smoothstep(0.12,0.14,f.x)*smoothstep(0.88,0.86,f.x);
     c=mix(c,sc*0.16,band);gEm+=sc*band*(0.12+(0.9*txt)*(1.0-shut*0.7));}
    // комнаты за стеклом: параллакс вместо плоской картинки; шторы и жалюзи — поверх, на плоскости окна
    vec3 winEm=vec3(0.0);
    if(gf<0.5&&win>0.001){float off=step(2.5,st)*step(st,4.5);vec2 rq=off>0.5?vec2(vUv0.x/3.0,vUv0.y):vUv0;
     float cw=st<0.5?3.0:st<1.5?3.3:st<2.5?3.1:st<3.5?4.8:st<4.5?2.8:3.0;
     vec3 rEm;vec3 room=roomMap(fract(rq),floor(rq),seed+wsd*3.0,normalize(vec3(vSWN.x,0.0,vSWN.z)),vd,vec3(cw,fh,off>0.5?6.0:4.2),off,lit,wc,fogColor,rEm);
     vec2 q=vec2((f.x-x0)/max(x1-x0,0.01),(f.y-y0)/max(y1-y0,0.01));
     float cp=curt*(smoothstep(0.3,0.26,q.x)+smoothstep(0.7,0.74,q.x))*(1.0-off);
     float bl=(1.0-curt)*step(0.72,hh(id+5.5))*smoothstep(0.35,0.6,abs(fract(q.y*11.0)-0.5)*2.0)*step(1.0-0.7*hh(id+6.6),q.y);
     room=mix(room+rEm,cc*mix(fogColor*0.3,wc*0.7,lit),cp);room=mix(room,vec3(0.55,0.55,0.52)*mix(fogColor*0.25,wc*0.5,lit),bl*0.85);
     float fr=0.12+0.7*fres;glass=refl*fr;winEm=room*(1.0-fr*0.8);}
    vec3 wcol=glass;
    c=mix(c,wcol,win);c=mix(c,c*0.45,rev*0.7);c=mix(c,vec3(0.62,0.61,0.58),sill);
    // рамы и импосты
    float fr2=win*(1.0-smoothstep(0.0,0.025,min(min(f.x-x0,x1-f.x),min(f.y-y0,y1-f.y))));float mull=win*smoothstep(0.022,0.0,abs(f.x-0.5))*step(st,2.5)*(1.0-gf)*(1.0-balc);float tr=win*smoothstep(0.02,0.0,abs(f.y-(y0+(y1-y0)*0.72)))*step(st,2.5)*(1.0-gf);
    c=mix(c,vec3(0.6,0.6,0.58)*(st<2.5?1.0:0.3),max(fr2,max(mull,tr)));
    // кондиционеры под окнами
    float ac=step(0.78,hh(id+wsd*7.0+2.2))*step(st,4.5)*step(0.5,fl)*(1.0-balc)*(1.0-cor);float acm=ac*smoothstep(0.54,0.56,f.x)*smoothstep(0.88,0.86,f.x)*smoothstep(0.01,0.03,f.y)*smoothstep(y0-0.02,y0-0.04,f.y);
    c=mix(c,vec3(0.5,0.5,0.48)*(0.85+0.2*step(0.5,fract(f.x*30.0))),acm);
    gGlass=win*(1.0-shut);gEm+=winEm*win;
    gRough=mix(0.9,0.08,gGlass);
    c*=0.9+0.2*n2;
   }else{c=base*0.5;}
   diffuseColor.rgb=c;}`,
  rough:'roughnessFactor=gRough;metalnessFactor=gGlass*0.15;',emis:'totalEmissiveRadiance+=gEm;'});
 return M.bld;}

// ---------------- геометрия: утилиты ----------------
class GB{// накопитель геометрии с произвольными атрибутами
 constructor(spec){this.spec=spec;this.a={};for(const k in spec)this.a[k]=[];this.n=0;this.idx=[];}
 v(vals){for(const k in this.spec){const s=this.spec[k];const x=vals[k];if(s===1)this.a[k].push(x);else for(let i=0;i<s;i++)this.a[k].push(x[i]);}return this.n++;}
 t(a,b,c){this.idx.push(a,b,c);}
 geo(){const g=new T.BufferGeometry();for(const k in this.spec)g.setAttribute(k,new T.Float32BufferAttribute(this.a[k],this.spec[k]));if(this.n>65535)g.setIndex(new T.Uint32BufferAttribute(this.idx,1));else g.setIndex(this.idx);g.computeBoundingSphere();return g;}}
function pairs(a){const o=[];for(let i=0;i<a.length;i+=2)o.push([a[i],a[i+1]]);return o;}
function cum(pts){const s=[0];for(let i=1;i<pts.length;i++)s.push(s[i-1]+Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]));return s;}
// смещённая полилиния: нормали в вершинах (со срезом острых углов)
function offsets(pts){const n=pts.length;const out=[];for(let i=0;i<n;i++){const a=pts[Math.max(0,i-1)],b=pts[i],c=pts[Math.min(n-1,i+1)];
  let d0x=b[0]-a[0],d0z=b[1]-a[1],d1x=c[0]-b[0],d1z=c[1]-b[1];const l0=Math.hypot(d0x,d0z)||1,l1=Math.hypot(d1x,d1z)||1;d0x/=l0;d0z/=l0;d1x/=l1;d1z/=l1;
  if(i===0){d0x=d1x;d0z=d1z;}if(i===n-1){d1x=d0x;d1z=d0z;}
  let tx=d0x+d1x,tz=d0z+d1z;const tl=Math.hypot(tx,tz)||1;tx/=tl;tz/=tl;const rx=-tz,rz=tx;const k=1/Math.max(0.5,(-d0z*rx+d0x*rz));
  out.push([rx*k,rz*k,tx,tz]);}return out;}
function samplePL(pts,S,s){// точка/направление на полилинии по дистанции
 let i=1;while(i<pts.length-1&&S[i]<s)i++;const a=pts[i-1],b=pts[i];const L=(S[i]-S[i-1])||1;const u=clamp((s-S[i-1])/L,0,1);const dx=(b[0]-a[0])/L,dz=(b[1]-a[1])/L;return [a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u,dx,dz];}
function pip(x,z,P){let ins=false;for(let i=0,j=P.length-2;i<P.length;j=i,i+=2){const xi=P[i],zi=P[i+1],xj=P[j],zj=P[j+1];if(((zi>z)!==(zj>z))&&(x<(xj-xi)*(z-zi)/(zj-zi+1e-12)+xi))ins=!ins;}return ins;}

// ---------------- разбор geo ----------------
let G=null;
function geo(){if(G)return G;const J=D.geo;G={J,names:J.names||[],B:J.bounds};
 G.b=J.b.map(q=>{const P=q[5];let x0=1e9,z0=1e9,x1=-1e9,z1=-1e9;for(let i=0;i<P.length;i+=2){x0=Math.min(x0,P[i]);x1=Math.max(x1,P[i]);z0=Math.min(z0,P[i+1]);z1=Math.max(z1,P[i+1]);}return {h:q[0],lv:q[1],k:q[2],f:q[3],n:q[4],P,bb:[x0,z0,x1,z1]};});
 G.r=J.r.map(q=>{const pts=pairs(q[5]);return {cls:q[0],lanes:q[1],ow:q[2],w:q[3],n:q[4],name:G.names[q[4]]||'',pts,S:cum(pts),cuts:pairs(q[6])};});
 // Жибек Жолы у базара: 5 полос, крайняя правая — автобусная (в OSM 3)
 G.r.forEach(r=>{if(/Жибек Жолы/.test(r.name)&&r.cls<=3&&r.ow){r.lanes=5;r.w=5*3.25+0.6;r.bus=true;}});
 G.f=J.f.map(q=>({cls:q[0],w:q[1],pav:q[2],pts:pairs(q[3])}));
 G.g=J.g.map(q=>({k:q[0],n:q[1],P:q[2]}));G.p=J.p.map(q=>({pav:q[0],P:q[1]}));
 G.x=J.x;G.c=J.c;G.ch=J.ch.map(q=>({n:q[0],name:G.names[q[0]]||'',cls:q[1],ow:q[2],lanes:q[3],pts:pairs(q[4])}));
 G.ch.forEach(c=>{if(/Жибек Жолы/.test(c.name)&&c.ow)c.lanes=5,c.bus=true;});
 // направление сетки улиц (для объектов «по сетке»)
 let sx=0,sz=0;G.r.forEach(r=>{if(r.cls>2)return;for(let i=1;i<r.pts.length;i++){const dx=r.pts[i][0]-r.pts[i-1][0],dz=r.pts[i][1]-r.pts[i-1][1];const l=Math.hypot(dx,dz);if(l<5)continue;let a=Math.atan2(dz,dx)*4;sx+=Math.cos(a)*l;sz+=Math.sin(a)*l;}});
 G.rot=-Math.atan2(sz,sx)/4;// rotation.y для объектов, выровненных по сетке
 return G;}
// запретные зоны для процедурных объектов (здесь стоят «свои» модели)
const KEEP_OUT=[[880,-292,1030,-108],[764,296,846,372],[955,312,1012,350]];
const inKeep=(x,z,pad)=>KEEP_OUT.some(k=>x>k[0]-(pad||0)&&x<k[2]+(pad||0)&&z>k[1]-(pad||0)&&z<k[3]+(pad||0));

// ---------------- мир: статическая геометрия (кеш на обе сцены) ----------------
const W={};
function buildWorld(){if(W.ok)return W;W.ok=true;const g=geo();mats();buildingMat();const B=g.B;
 // --- земля
 const ground=new T.PlaneGeometry(B.maxX-B.minX+3000,B.maxZ-B.minZ+3000,1,1);ground.rotateX(-PI/2);ground.translate((B.minX+B.maxX)/2,0,(B.minZ+B.maxZ)/2);W.ground=ground;
 // --- газоны и площади
 const lawn=new GB({position:3,normal:3,uv:2});const plaz=new GB({position:3,normal:3,uv:2,aP:2});
 const tri=(P,gb,y,extra)=>{const v2=[];for(let i=0;i<P.length;i+=2)v2.push(new T.Vector2(P[i],P[i+1]));let f;try{f=T.ShapeUtils.triangulateShape(v2,[]);}catch(e){return;}const base=gb.n;for(const p of v2)gb.v(Object.assign({position:[p.x,y,p.y],normal:[0,1,0],uv:[p.x,p.y]},extra||{}));
  for(const t of f){const a=v2[t[0]],b=v2[t[1]],c=v2[t[2]];const cr=(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);if(cr>0)gb.t(base+t[0],base+t[2],base+t[1]);else gb.t(base+t[0],base+t[1],base+t[2]);}};
 g.g.forEach(q=>tri(q.P,lawn,0.012));g.p.forEach(q=>tri(q.P,plaz,0.022,{aP:[2,0]}));
 const rotRect=(cx,cz,w,d,y,kind)=>{const c=Math.cos(g.rot),sn=Math.sin(g.rot);const P=[];for(const [lx,lz] of [[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]])P.push(cx+lx*c+lz*sn,cz-lx*sn+lz*c);tri(P,plaz,y,{aP:[kind,0]});};
 rotRect(955,-117,142,36,0.023,2);rotRect(955,-245,142,98,0.019,0);rotRect(903,-165,34,64,0.021,1);
 // --- ленты: дороги, тротуары, полосы деревьев, пешеходные дорожки
 const road=new GB({position:3,normal:3,uv:2,aR:4});const pave=plaz;const curb=new GB({position:3,normal:3,uv:2});
 const ribbon=(gb,pts,S,o0,o1,y,attr,uvf,cutFn)=>{const off=offsets(pts);let prev=-1;for(let i=0;i<pts.length;i++){const p=pts[i],o=off[i];const s=S[i];
   const a=gb.v(Object.assign({position:[p[0]+o[0]*o0,y,p[1]+o[1]*o0],normal:[0,1,0],uv:uvf(s,o0)},attr(s,o0)));gb.v(Object.assign({position:[p[0]+o[0]*o1,y,p[1]+o[1]*o1],normal:[0,1,0],uv:uvf(s,o1)},attr(s,o1)));
   if(prev>=0&&!(cutFn&&cutFn((S[i-1]+s)/2))){// обход: верх — +y
    const A=prev,Bv=prev+1,Cv=a,Dv=a+1;const d=(o1-o0);if(d>0){gb.t(A,Bv,Cv);gb.t(Bv,Dv,Cv);}else{gb.t(A,Cv,Bv);gb.t(Bv,Cv,Dv);}}
   prev=a;}};
 const withCuts=(r)=>{// вставить вершины на границах разрезов
  if(!r.cuts.length)return {pts:r.pts,S:r.S,mk:r.pts.map(()=>1)};const ev=[];r.cuts.forEach(c=>{ev.push([c[0]-0.02,1],[c[0],0],[c[1],0],[c[1]+0.02,1]);});
  const pts=[],S=[],mk=[];const inCut=s=>r.cuts.some(c=>s>=c[0]-1e-3&&s<=c[1]+1e-3);let e=0;ev.sort((a,b)=>a[0]-b[0]);
  for(let i=0;i<r.pts.length;i++){const s=r.S[i];while(e<ev.length&&ev[e][0]<s){const q=ev[e];if(q[0]>0){const p=samplePL(r.pts,r.S,q[0]);pts.push([p[0],p[1]]);S.push(q[0]);mk.push(q[1]);}e++;}pts.push(r.pts[i]);S.push(s);mk.push(inCut(s)?0:1);}
  return {pts,S,mk};};
 g.r.forEach(r=>{if(r.cls===5){ribbon(pave,r.pts,r.S,-r.w/2,r.w/2,0.021,()=>({aP:[1,0]}),(s,o)=>[s,o]);return;}
  const hw=r.w/2;const q=withCuts(r);const y=0.03+(4-r.cls)*0.002;const fl=(r.ow?1:0)+(r.bus?4:0);
  const off=offsets(q.pts);let prev=-1;
  for(let i=0;i<q.pts.length;i++){const p=q.pts[i],o=off[i],s=q.S[i],mk=r.cls<=3?q.mk[i]:0;
   const a=road.v({position:[p[0]-o[0]*hw,y,p[1]-o[1]*hw],normal:[0,1,0],uv:[s,-hw],aR:[hw,r.lanes,fl,mk]});road.v({position:[p[0]+o[0]*hw,y,p[1]+o[1]*hw],normal:[0,1,0],uv:[s,hw],aR:[hw,r.lanes,fl,mk]});
   if(prev>=0){road.t(prev,prev+1,a);road.t(prev+1,a+1,a);}prev=a;}
  if(r.cls>3)return;
  // тротуар + полоса деревьев с арыком по обеим сторонам (кроме въездов/перекрёстков — их закрывает асфальт)
  if(r.cls<=2){for(const sd of [-1,1]){ribbon(pave,r.pts,r.S,sd*(hw+0.22),sd*(hw+4.4),0.014,(s,o)=>({aP:[3,sd*(hw+3.95)]}),(s,o)=>[s,o]);ribbon(pave,r.pts,r.S,sd*(hw+4.4),sd*(hw+8.6),0.02,()=>({aP:[1,0]}),(s,o)=>[s,o]);}}
  // бордюр: вертикальная грань + верх, разрывы на перекрёстках и въездах
  for(const sd of [-1,1]){let pv=-1;const offc=offsets(q.pts);
   for(let i=0;i<q.pts.length;i++){const p=q.pts[i],o=offc[i],s=q.S[i];
    const x0=p[0]+o[0]*sd*hw,z0=p[1]+o[1]*sd*hw,x1=p[0]+o[0]*sd*(hw+0.2),z1=p[1]+o[1]*sd*(hw+0.2);const nx=-o[0]*sd,nz=-o[1]*sd;
    const a=curb.v({position:[x0,0.03,z0],normal:[nx,0,nz],uv:[s,0]});curb.v({position:[x0,0.15,z0],normal:[nx,0.3,nz],uv:[s,0.12]});curb.v({position:[x0,0.15,z0],normal:[0,1,0],uv:[s,0.12]});curb.v({position:[x1,0.15,z1],normal:[0,1,0],uv:[s,0.2]});
    const segCut=i>0&&r.cuts.some(c=>(q.S[i-1]+s)/2>c[0]-0.3&&(q.S[i-1]+s)/2<c[1]+0.3);
    if(pv>=0&&!segCut){if(sd<0){curb.t(pv,a,pv+1);curb.t(pv+1,a,a+1);curb.t(pv+2,a+2,pv+3);curb.t(pv+3,a+2,a+3);}else{curb.t(pv,pv+1,a);curb.t(pv+1,a+1,a);curb.t(pv+2,pv+3,a+2);curb.t(pv+3,a+3,a+2);}}
    pv=a;}}});
 g.f.forEach(f=>{const S=cum(f.pts);ribbon(pave,f.pts,S,-f.w/2,f.w/2,0.018+f.cls*0.0005,()=>({aP:[f.pav?1:0,0]}),(s,o)=>[s,o]);});
 W.lawn=lawn.geo();W.pave=pave.geo();W.road=road.geo();W.curb=curb.geo();
 // --- зебры и стоп-линии
 const zb=new GB({position:3,normal:3,uv:2,aZ:1});
 const quad=(x,z,ang,w,d,kind)=>{const fx=Math.sin(ang),fz=Math.cos(ang),rx=fz,rz=-fx;const y=0.045;const b=zb.n;
  for(const [u,v] of [[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]])zb.v({position:[x+rx*u+fx*v,y,z+rz*u+fz*v],normal:[0,1,0],uv:[u,v],aZ:kind});zb.t(b,b+2,b+1);zb.t(b,b+3,b+2);};
 W.zebras=[];g.c.forEach(c=>{if(inKeep(c[0],c[1]))return;quad(c[0],c[1],c[2],c[3]-0.8,3.6,0);W.zebras.push(c);});
 // зебры сюжетных переходов (гарантированно)
 const ensureZebra=(x,z)=>{if(g.c.some(c=>Math.hypot(c[0]-x,c[1]-z)<6))return;const r=nearestRoad(x,z,2);if(!r)return;quad(x,z,Math.atan2(r.dx,r.dz),r.road.w-0.8,4,0);W.zebras.push([x,z,Math.atan2(r.dx,r.dz),r.road.w]);};
 ensureZebra(PTS.cross1[0],PTS.cross1[1]);ensureZebra(PTS.cross2[0],PTS.cross2[1]);
 W.zebraGB=zb;W.zebra=zb.geo();
 buildBuildings();
 return W;}
function nearestRoad(x,z,maxCls,filter){const g=geo();let best=null,bd=1e9;for(const r of g.r){if(r.cls>maxCls)continue;if(filter&&!filter(r))continue;for(let i=1;i<r.pts.length;i++){const a=r.pts[i-1],b=r.pts[i];const ex=b[0]-a[0],ez=b[1]-a[1];const L2=ex*ex+ez*ez||1e-9;const u=clamp(((x-a[0])*ex+(z-a[1])*ez)/L2,0,1);const qx=a[0]+ex*u,qz=a[1]+ez*u;const d=Math.hypot(x-qx,z-qz);if(d<bd){bd=d;const L=Math.sqrt(L2);best={road:r,d,s:r.S[i-1]+u*L,dx:ex/L,dz:ez/L,x:qx,z:qz};}}}return best;}

// ---------------- здания ----------------
const PAL={brick:['#7e4636','#8c5240','#6e3f33','#a5835c','#b39365','#8a6a4c'],plaster:['#cdb793','#d6c29a','#c9a878','#c8a090','#b9bc98','#cfcabb','#a9b0ae','#d9c7a4','#c4b08a'],panel:['#8f8d86','#9d998e','#86847e','#a39684','#7f8488'],glass:['#2a3138','#26303a','#30363a'],stone:['#b0a48c','#a29882','#bdb29c','#8f8778'],shop:['#b8ab93','#9a8f7e','#c0b6a2','#8e7d6a'],roofM:['#3f5a48','#6a3a30','#5a5e62','#4a5a66','#6b4a2e']};
function buildBuildings(){const g=geo();const tiles={};const TS=520;
 const col=new T.Color();const pick=(arr,r)=>arr[(r*arr.length)|0];
 const get=(x,z)=>{const k=Math.floor(x/TS)+','+Math.floor(z/TS);return tiles[k]||(tiles[k]=new GB({position:3,normal:3,uv:2,color:3,aB:4,aH:2}));};
 W.bInfo=[];
 // общие стены соседних зданий (OSM делит кварталы на части): не рисовать дважды (z-fighting)
 const ek=(x,z)=>Math.round(x*3)+','+Math.round(z*3);const edges=new Map();
 g.b.forEach((b,bi)=>{const P=b.P,n=P.length/2;for(let i=0;i<n;i++){const j=(i+1)%n;const a=ek(P[i*2],P[i*2+1]),c=ek(P[j*2],P[j*2+1]);const k=a<c?a+'|'+c:c+'|'+a;let l=edges.get(k);if(!l)edges.set(k,l=[]);l.push({bi,h:b.h});}});
 g.b.forEach((b,bi)=>{if(b.k===11&&b.h<=12&&b.bb[2]-b.bb[0]>30)return;// собор — своя модель
  const P=b.P;const n=P.length/2;const cx=(b.bb[0]+b.bb[2])/2,cz=(b.bb[1]+b.bb[3])/2;if(inKeep(cx,cz)&&b.h<6)return;
  const r=rng(bi*7919+13);const R=()=>r();let h=b.h;const lv=b.lv;
  let area=0;for(let i=0;i<n;i++){const j=(i+1)%n;area+=P[i*2]*P[j*2+1]-P[j*2]*P[i*2+1];}area=Math.abs(area/2);
  // стиль
  let st,fh,cs,shop=0;const com=b.k===2||b.k===3||b.k===4||b.k===7||(b.f&4);
  if(b.k===5){st=10;fh=3;cs=pick(PAL.panel,R());}
  else if(b.k===8){st=6;fh=3.2;cs='#8d8a84';}
  else if(b.k===10||area<35&&h<=4){st=7;fh=3;cs=pick(PAL.panel,R());}
  else if(h>=30){const q=R();st=q<(com?0.75:0.3)?3:q<0.7?2:4;fh=st===3?3.6:2.9;cs=st===3?pick(PAL.glass,R()):st===2?pick(PAL.panel,R()):pick(PAL.stone,R());}
  else if(h>=15){const q=R();st=com?(q<0.45?4:q<0.7?3:1):(q<0.45?2:q<0.75?0:1);fh=st===2?2.8:st===3?3.6:st===4?3.5:st===1?3.6:3.0;cs=st===0?pick(PAL.brick,R()):st===1?pick(PAL.plaster,R()):st===2?pick(PAL.panel,R()):st===3?pick(PAL.glass,R()):pick(PAL.stone,R());}
  else if(h<=6&&com){st=5;fh=h<=3.5?h:3.4;cs=pick(PAL.shop,R());}
  else{const q=R();st=q<0.34?0:q<0.8?1:2;fh=st===1?3.5:st===2?2.8:3.0;cs=st===0?pick(PAL.brick,R()):st===1?pick(PAL.plaster,R()):pick(PAL.panel,R());}
  if(lv>0&&st<6){fh=clamp(h/lv,2.6,4.2);}
  if(h<3.2)fh=h;
  col.set(cs).convertSRGBToLinear();const cr=[col.r,col.g,col.b];const seed=R();
  const shopB=(com||h<=12&&R()<0.35)&&st<6;
  const gb=get(cx,cz);
  const colW=st===3?1.6:st===2?3.1:st===4?2.8:st===1?3.3:3.0;
  const hBase=st===10?h-0.6:0;
  // стены
  const push=0.015+Math.min(1,h/60)*0.05;
  for(let i=0;i<n;i++){const j=(i+1)%n;let ax=P[i*2],az=P[i*2+1],bx=P[j*2],bz=P[j*2+1];const ex=bx-ax,ez=bz-az;const len=Math.hypot(ex,ez);if(len<0.05)continue;
   const a0=ek(ax,az),c0=ek(bx,bz);const others=(edges.get(a0<c0?a0+'|'+c0:c0+'|'+a0)||[]).filter(q=>q.bi!==bi);let y0w=hBase;if(others.length){const hm=Math.max(...others.map(q=>q.h));if(hm>=h-0.05)continue;y0w=Math.max(y0w,hm);}
   const nx=ez/len,nz=-ex/len;ax+=nx*push;az+=nz*push;bx+=nx*push;bz+=nz*push;const nc=Math.max(1,Math.round(len/colW));const fv=h/fh;const wshop=shopB&&len>5&&R()<0.8?1:0;const aB=[st,seed,fh,wshop];const aH=[h,R()];
   const v0=gb.v({position:[ax,y0w,az],normal:[nx,0,nz],uv:[0,y0w/fh],color:cr,aB,aH});gb.v({position:[bx,y0w,bz],normal:[nx,0,nz],uv:[nc,y0w/fh],color:cr,aB,aH});gb.v({position:[bx,h,bz],normal:[nx,0,nz],uv:[nc,fv],color:cr,aB,aH});gb.v({position:[ax,h,az],normal:[nx,0,nz],uv:[0,fv],color:cr,aB,aH});
   gb.t(v0,v0+2,v0+1);gb.t(v0,v0+3,v0+2);}
  // кровля
  const pitched=st!==10&&st!==3&&h<=13&&n>=4&&n<=6&&area<900&&R()<0.75;let did=false;
  if(pitched){did=hipRoof(gb,P,h,seed,R);}
  if(!did){const v2=[];for(let i=0;i<n;i++)v2.push(new T.Vector2(P[i*2],P[i*2+1]));let f=null;try{f=T.ShapeUtils.triangulateShape(v2,[]);}catch(e){}
   if(f){const rs=st===10?10:8;const aB=[rs,seed,3,0];const aH=[h,0];const rc=st===10?cr:[0.06,0.06,0.06];const base=gb.n;for(const p of v2)gb.v({position:[p.x,h,p.y],normal:[0,1,0],uv:[p.x,p.y],color:rc,aB,aH});
    for(const t of f){const a=v2[t[0]],b2=v2[t[1]],c=v2[t[2]];const crs=(b2.x-a.x)*(c.y-a.y)-(b2.y-a.y)*(c.x-a.x);if(crs>0)gb.t(base+t[0],base+t[2],base+t[1]);else gb.t(base+t[0],base+t[1],base+t[2]);}
    if(st===10){// нижняя грань навеса
     const b2=gb.n;for(const p of v2)gb.v({position:[p.x,hBase,p.y],normal:[0,-1,0],uv:[p.x,p.y],color:cr,aB,aH});for(const t of f){const a=v2[t[0]],bb=v2[t[1]],c=v2[t[2]];const crs=(bb.x-a.x)*(c.y-a.y)-(bb.y-a.y)*(c.x-a.x);if(crs>0)gb.t(b2+t[0],b2+t[1],b2+t[2]);else gb.t(b2+t[0],b2+t[2],b2+t[1]);}}
    // крышное оборудование
    if(st!==10&&area>140){const k=1+Math.min(4,(area/400)|0);for(let q=0;q<k;q++){const px=cx+(R()-0.5)*(b.bb[2]-b.bb[0])*0.5,pz=cz+(R()-0.5)*(b.bb[3]-b.bb[1])*0.5;if(!pip(px,pz,P))continue;const w=1+R()*2.5,d=1+R()*2,hh=0.8+R()*2.2;addBox(gb,px,h,pz,w,hh,d,g.rot,[0.18,0.18,0.18],[7,seed,3,0]);}}}}
  W.bInfo.push({bi,h,st,P,bb:b.bb});});
 W.bTiles=Object.values(tiles).map(gb=>gb.geo());
 // заполнение за границами данных (город не кончается в дымке)
 fillerBuildings();}
function addBox(gb,x,y,z,w,h,d,rot,col,aB){const c=Math.cos(rot),s=Math.sin(rot);const P=(lx,lz)=>[x+lx*c+lz*s,z-lx*s+lz*c];
 const pts=[P(-w/2,-d/2),P(w/2,-d/2),P(w/2,d/2),P(-w/2,d/2)];// обход против часовой (в осях x,z «математически»)
 let ar=0;for(let i=0;i<4;i++){const j=(i+1)%4;ar+=pts[i][0]*pts[j][1]-pts[j][0]*pts[i][1];}if(ar<0)pts.reverse();
 for(let i=0;i<4;i++){const a=pts[i],b=pts[(i+1)%4];const ex=b[0]-a[0],ez=b[1]-a[1];const len=Math.hypot(ex,ez);const nx=ez/len,nz=-ex/len;const nc=Math.max(1,Math.round(len/3));
  const aH=[y+h,(i*0.37+aB[1]*3.1)%1];const v0=gb.v({position:[a[0],y,a[1]],normal:[nx,0,nz],uv:[0,y/aB[2]],color:col,aB,aH});gb.v({position:[b[0],y,b[1]],normal:[nx,0,nz],uv:[nc,y/aB[2]],color:col,aB,aH});gb.v({position:[b[0],y+h,b[1]],normal:[nx,0,nz],uv:[nc,(y+h)/aB[2]],color:col,aB,aH});gb.v({position:[a[0],y+h,a[1]],normal:[nx,0,nz],uv:[0,(y+h)/aB[2]],color:col,aB,aH});gb.t(v0,v0+2,v0+1);gb.t(v0,v0+3,v0+2);}
 const t0=gb.v({position:[pts[0][0],y+h,pts[0][1]],normal:[0,1,0],uv:[0,0],color:col,aB:[8,aB[1],3,0],aH:[y+h,0]});for(let i=1;i<4;i++)gb.v({position:[pts[i][0],y+h,pts[i][1]],normal:[0,1,0],uv:[0,0],color:col,aB:[8,aB[1],3,0],aH:[y+h,0]});gb.t(t0,t0+2,t0+1);gb.t(t0,t0+3,t0+2);}
function hipRoof(gb,P,h,seed,R){// вальмовая крыша по ориентированному прямоугольнику
 const n=P.length/2;let best=0,ax=1,az=0;for(let i=0;i<n;i++){const j=(i+1)%n;const ex=P[j*2]-P[i*2],ez=P[j*2+1]-P[i*2+1];const l=Math.hypot(ex,ez);if(l>best){best=l;ax=ex/l;az=ez/l;}}
 const bx=-az,bz=ax;let u0=1e9,u1=-1e9,w0=1e9,w1=-1e9;for(let i=0;i<n;i++){const u=P[i*2]*ax+P[i*2+1]*az,w=P[i*2]*bx+P[i*2+1]*bz;u0=Math.min(u0,u);u1=Math.max(u1,u);w0=Math.min(w0,w);w1=Math.max(w1,w);}
 let ar=0;for(let i=0;i<n;i++){const j=(i+1)%n;ar+=P[i*2]*P[j*2+1]-P[j*2]*P[i*2+1];}ar=Math.abs(ar/2);if(ar/((u1-u0)*(w1-w0))<0.86)return false;
 const L=u1-u0,Wd=w1-w0;if(Wd>22||L<3)return false;const o=0.35;u0-=o;u1+=o;w0-=o;w1+=o;const rh=Math.min(5,(w1-w0)*0.32);const wc=(w0+w1)/2;const r0=u0+(w1-w0)/2,r1=u1-(w1-w0)/2;const hip=r1>r0;
 const pt=(u,w,y)=>[u*ax+w*bx,y,u*az+w*bz];const col=new T.Color(PAL.roofM[(R()*PAL.roofM.length)|0]).convertSRGBToLinear();const cr=[col.r,col.g,col.b];const aB=[9,seed,3,0];
 const face=(a,b,c,d)=>{// a,b — карниз; c,d — конёк (d над a)
  const e1=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],e2=[(d||c)[0]-a[0],(d||c)[1]-a[1],(d||c)[2]-a[2]];let nx=e1[1]*e2[2]-e1[2]*e2[1],ny=e1[2]*e2[0]-e1[0]*e2[2],nz=e1[0]*e2[1]-e1[1]*e2[0];const nl=Math.hypot(nx,ny,nz)||1;nx/=nl;ny/=nl;nz/=nl;
  let flip=ny<0;if(flip){nx=-nx;ny=-ny;nz=-nz;}const ex=Math.hypot(e1[0],e1[2]);const sl=Math.hypot(e2[0],e2[1],e2[2]);
  const aH=[h,0];const v0=gb.v({position:a,normal:[nx,ny,nz],uv:[0,0],color:cr,aB,aH});gb.v({position:b,normal:[nx,ny,nz],uv:[ex,0],color:cr,aB,aH});gb.v({position:c,normal:[nx,ny,nz],uv:[ex*0.5,sl],color:cr,aB,aH});
  if(d){gb.v({position:d,normal:[nx,ny,nz],uv:[0,sl],color:cr,aB,aH});if(flip){gb.t(v0,v0+2,v0+1);gb.t(v0,v0+3,v0+2);}else{gb.t(v0,v0+1,v0+2);gb.t(v0,v0+2,v0+3);}}else{if(flip)gb.t(v0,v0+2,v0+1);else gb.t(v0,v0+1,v0+2);}};
 const A=pt(u0,w0,h),Bp=pt(u1,w0,h),Cp=pt(u1,w1,h),Dp=pt(u0,w1,h);const R0=pt(hip?r0:(u0+u1)/2,wc,h+rh),R1=pt(hip?r1:(u0+u1)/2,wc,h+rh);
 face(A,Bp,R1,R0);face(Cp,Dp,R0,R1);face(Bp,Cp,R1,null);face(Dp,A,R0,null);
 // фронтоны не нужны (вальма); подшивка карниза
 return true;}
function fillerBuildings(){const g=geo();const B=g.B;const gb=new GB({position:3,normal:3,uv:2,color:3,aB:4,aH:2});const r=rng(404);const rot=g.rot;const c=Math.cos(rot),s=Math.sin(rot);
 const col=new T.Color();
 for(let bx=-9;bx<=12;bx++)for(let bz=-8;bz<=10;bz++){// кварталы 120×100 м в повёрнутой сетке
  const lx=bx*125,lz=bz*105;const x=lx*c+lz*s+140,z=-lx*s+lz*c+150;
  const inside=x>B.minX-60&&x<B.maxX+60&&z>B.minZ-60&&z<B.maxZ+60;if(inside)continue;
  const far=Math.max(B.minX-x,x-B.maxX,B.minZ-z,z-B.maxZ);if(far>700)continue;
  const k=2+(r()*4|0);for(let q=0;q<k;q++){const w=14+r()*32,d=12+r()*22,h=[9,12,15,15,18,27,36,48][(r()*8)|0]*(0.8+r()*0.3);const ox=(r()-0.5)*(110-w-14),oz=(r()-0.5)*(90-d-14);
   const px=x+ox*c+oz*s,pz=z-ox*s+oz*c;const st=h>30?(r()<0.5?3:2):[0,1,2,1,4][(r()*5)|0];const arr=st===0?PAL.brick:st===1?PAL.plaster:st===2?PAL.panel:st===3?PAL.glass:PAL.stone;col.set(arr[(r()*arr.length)|0]).convertSRGBToLinear();
   addBox(gb,px,0,pz,w,h,d,rot,[col.r,col.g,col.b],[st,r(),st===2?2.8:3.2,0]);}}
 W.filler=gb.geo();}

// ---------------- точки маршрутов (одинаковы в обеих сценах) ----------------
const PTS={
 start:[809,304,PI],memorial:[990,331],aqi:[793,171],baba:[798,34],cross1:[780,154.5],walk1:[799,92],walk2:[790,-14],cross2:[898,-84.5],drone_zone:[921,-121],repair:[964,-263.5],
 drive_start:[-100,808.4,1.683],drive_goal:[983,704],drive_b1:[200,776],drive_b2:[520,747],drive_b3:[800,721]};

return {SMOG_FOG,wheelGeo,D,W,G:()=>G,geo,mats,buildWorld,buildingMat,PTS,smogMat,SU,NZ,GB,offsets,cum,samplePL,pip,nearestRoad,noiseTex,inKeep,KEEP_OUT,pairs,angD,lerp};
})();

// ============================================================
// СЦЕНЫ
// ============================================================
(()=>{
'use strict';
const T=THREE,L=ART.lib;const {C,rng,clamp,sm,canvasTex,std,emis,glow,box,cyl,textPlane,V}=L;
const {PTS,SU,NZ,GB,smogMat,offsets,cum,samplePL,pip,nearestRoad,inKeep,pairs,angD,lerp}=CITY;const SMOG_FOG_PUBLIC=CITY.SMOG_FOG;
const PI=Math.PI,TAU=PI*2;
const DRIVEAPI={active:false,pos:null,car:null,fwd:null,siren:false};
const LOOKS={// настройки времени суток
 walk:{fog:['#8d7f70',0.0062],hor:'#8d7f70',top:'#5b5249',gnd:'#2f2922',glow:'#ff8d45',glowK:0.95,sunDir:[0.955,0.2,0.22],sunC:'#ffb277',sunI:1.55,sunDisc:'#ffc27e',discI:3.2,
  hemiS:'#a6a39c',hemiG:'#3a3029',hemiI:1.0,exposure:1.06,lit:0.34,wet:0.45,mtnA:0.2,envI:0.55,lamps:1},
 drive:{fog:['#9d968a',0.0056],hor:'#9d968a',top:'#6e695f',gnd:'#35302a',glow:'#ffd29a',glowK:0.55,sunDir:[0.38,0.64,0.66],sunC:'#ffe0b8',sunI:1.85,sunDisc:'#fff0d0',discI:2.0,
  hemiS:'#b3b1aa',hemiG:'#3f372f',hemiI:1.1,exposure:1.0,lit:0.14,wet:0.3,mtnA:0.26,envI:0.55,lamps:0.35}};

// ---------------- небо: дымка, солнце-диск, силуэт гор ----------------
function skyMesh(lk){const u={uTop:{value:C(lk.top)},uHor:{value:C(lk.hor)},uGnd:{value:C(lk.gnd)},uSunDir:SU.uSunDir,uSunGlow:SU.uSunGlow,uSunC:{value:C(lk.sunDisc)},uSunI:{value:lk.discI},uMtnA:{value:lk.mtnA},uNoise:SU.uNoise,uTime:L.GU.time};
 const m=new T.ShaderMaterial({uniforms:u,side:T.BackSide,depthWrite:false,fog:false,
  vertexShader:'varying vec3 vD;void main(){vD=position;vec4 p=projectionMatrix*modelViewMatrix*vec4(position*1000.,1.);gl_Position=p.xyww;}',
  fragmentShader:`uniform vec3 uTop;uniform vec3 uHor;uniform vec3 uGnd;uniform vec3 uSunDir;uniform vec3 uSunGlow;uniform vec3 uSunC;uniform float uSunI;uniform float uMtnA;uniform sampler2D uNoise;uniform float uTime;varying vec3 vD;
  void main(){vec3 d=normalize(vD);float y=d.y;float sd=max(dot(d,uSunDir),0.0);
   vec3 hor=uHor+uSunGlow*(pow(sd,5.0)*0.32+pow(sd,28.0)*0.7);
   vec3 c=mix(hor,uTop,pow(clamp(y*1.25,0.0,1.0),0.6));
   float n=texture2D(uNoise,d.xz/(abs(y)+0.35)*0.18+vec2(uTime*0.0015,0.0)).r;c*=0.95+0.1*n;
   if(d.z>0.05&&y>-0.02){float az=atan(d.x,d.z);float r1=texture2D(uNoise,vec2(az*0.11+0.37,0.21)).r,r2=texture2D(uNoise,vec2(az*0.47+0.1,0.63)).b,r3=texture2D(uNoise,vec2(az*1.3,0.4)).r;
    float h=0.035+0.12*pow(r1,1.6)+0.02*r2+0.012*r3;h*=smoothstep(1.45,0.9,abs(az));float inm=smoothstep(h+0.002,h-0.002,y);
    float vis=uMtnA*smoothstep(0.035,0.14,y);vec3 mc=mix(hor*0.8+vec3(0.0,0.004,0.012),hor*1.12+vec3(0.02),smoothstep(h-0.03,h-0.005,y)*step(0.09,h));
    float lit=0.5+0.5*sin(az*9.0+r2*6.0);mc*=0.94+0.1*lit;c=mix(c,mc,inm*vis);}
   c+=uSunC*uSunI*(smoothstep(0.99972,0.99986,sd)*1.0+pow(sd,1400.0)*0.6+pow(sd,90.0)*0.12);
   if(y<0.0)c=mix(hor,hor*0.85,smoothstep(0.0,-0.5,y));
   gl_FragColor=vec4(c,1.0);
   #include <encodings_fragment>
  }`});
 const mesh=new T.Mesh(new T.SphereGeometry(1,48,24),m);mesh.frustumCulled=false;mesh.renderOrder=-10;mesh.userData.sky=true;return mesh;}
function envFromSky(lk){try{const r=L.renderer;if(!r)return null;const sc=new T.Scene();const sk=skyMesh(lk);sk.material.uniforms.uSunI.value=0.6;sc.add(sk);const pm=new T.PMREMGenerator(r);const rt=pm.fromScene(sc,0.04);pm.dispose();return rt.texture;}catch(e){console.warn('city env',e);return null;}}

// ---------------- статический мир в сцену ----------------
function addWorld(ctx){const W=CITY.buildWorld();const M=CITY.mats();const s=ctx.scene;const Q=L.Q;
 const add=(geo,mat,o)=>{const m=new T.Mesh(geo,mat);m.receiveShadow=true;m.castShadow=!!(o&&o.cast);m.matrixAutoUpdate=false;m.updateMatrix();if(o&&o.ro!==undefined)m.renderOrder=o.ro;s.add(m);return m;};
 add(W.ground,M.ground);add(W.lawn,M.lawn);add(W.pave,M.pave);add(W.road,M.road);add(W.curb,M.curb);const z=add(W.zebra,M.zebra,{ro:2});z.receiveShadow=true;
 const bm=CITY.buildingMat();W.bTiles.forEach(g=>add(g,bm,{cast:true}));add(W.filler,bm);}

// ---------------- коллизии: сетка ----------------
function makeGrid(cell){const m=new Map();let stamp=1;const key=(i,j)=>i*100003+j;
 return {add(o,x0,z0,x1,z1){for(let i=Math.floor(x0/cell);i<=Math.floor(x1/cell);i++)for(let j=Math.floor(z0/cell);j<=Math.floor(z1/cell);j++){const k=key(i,j);let a=m.get(k);if(!a)m.set(k,a=[]);a.push(o);}},
  query(x,z,r,out){out.length=0;stamp++;for(let i=Math.floor((x-r)/cell);i<=Math.floor((x+r)/cell);i++)for(let j=Math.floor((z-r)/cell);j<=Math.floor((z+r)/cell);j++){const a=m.get(key(i,j));if(!a)continue;for(const o of a){if(o._st===stamp)continue;o._st=stamp;out.push(o);}}return out;}};}
function staticColliders(ctx){const W=CITY.buildWorld();const grid=makeGrid(16);ctx._grid=grid;ctx._polys=[];
 W.bInfo.forEach(b=>{if(b.st===10)return;const o={t:'p',pts:b.P,h:b.h,bb:b.bb};grid.add(o,b.bb[0]-1,b.bb[1]-1,b.bb[2]+1,b.bb[3]+1);ctx._polys.push(o);});
 ctx.addCollider=(o)=>{let x0,z0,x1,z1;if(o.t==='c'){x0=o.x-o.r;x1=o.x+o.r;z0=o.z-o.r;z1=o.z+o.r;}else if(o.t==='b'){const r=Math.hypot(o.w,o.d)/2;x0=o.x-r;x1=o.x+r;z0=o.z-r;z1=o.z+r;}else{x0=1e9;z0=1e9;x1=-1e9;z1=-1e9;for(let i=0;i<o.pts.length;i+=2){x0=Math.min(x0,o.pts[i]);x1=Math.max(x1,o.pts[i]);z0=Math.min(z0,o.pts[i+1]);z1=Math.max(z1,o.pts[i+1]);}o.bb=[x0,z0,x1,z1];}grid.add(o,x0,z0,x1,z1);return o;};
 const buf=[];ctx.queryColliders=(x,z,r)=>{grid.query(x,z,r+1,buf);if(ctx._dyn)ctx._dyn(x,z,r,buf);return buf;};
 // камера: не залезать в здания (2D-луч по контурам)
 const cb=[];ctx.camCollide=(cam,tg)=>{const dx=cam.x-tg.x,dz=cam.z-tg.z;const len=Math.hypot(dx,dz);if(len<0.01)return;let best=1;
  grid.query((cam.x+tg.x)/2,(cam.z+tg.z)/2,len/2+1,cb);
  for(const o of cb){if(o.t!=='p')continue;const P=o.pts;for(let i=0,j=P.length-2;i<P.length;j=i,i+=2){const ax=P[j],az=P[j+1],bx=P[i],bz=P[i+1];const ex=bx-ax,ez=bz-az;const den=dx*ez-dz*ex;if(Math.abs(den)<1e-9)continue;const qx=ax-tg.x,qz=az-tg.z;const t=(qx*ez-qz*ex)/den,u=(qx*dz-qz*dx)/den;if(t>0&&t<best&&u>=0&&u<=1){const y=tg.y+(cam.y-tg.y)*t;if(y<o.h+0.5)best=t;}}}
  if(best<1){const k=Math.max(0.12,best-0.35/len);cam.x=tg.x+dx*k;cam.z=tg.z+dz*k;cam.y=tg.y+(cam.y-tg.y)*k;}if(cam.y<0.35)cam.y=0.35;};}

// ---------------- миникарта ----------------
let MAPC=null;
function mapCanvas(){if(MAPC)return MAPC;const g=CITY.geo();const W=CITY.buildWorld();const B=g.B;const sc=1.0;const pad=40;
 const w=Math.ceil((B.maxX-B.minX+pad*2)*sc),h=Math.ceil((B.maxZ-B.minZ+pad*2)*sc);const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');
 const X=v=>(v-B.minX+pad)*sc,Z=v=>(v-B.minZ+pad)*sc;x.fillStyle='#10151b';x.fillRect(0,0,w,h);
 const poly=(P,fill)=>{x.beginPath();for(let i=0;i<P.length;i+=2)(i?x.lineTo:x.moveTo).call(x,X(P[i]),Z(P[i+1]));x.closePath();x.fillStyle=fill;x.fill();};
 g.g.forEach(q=>poly(q.P,q.k===1?'#1c3325':'#1a2b20'));g.p.forEach(q=>poly(q.P,'#2a2e32'));
 x.lineCap='round';x.lineJoin='round';
 const line=(pts,wd,col)=>{x.beginPath();pts.forEach((p,i)=>(i?x.lineTo:x.moveTo).call(x,X(p[0]),Z(p[1])));x.strokeStyle=col;x.lineWidth=wd*sc;x.stroke();};
 g.f.forEach(f=>line(f.pts,Math.max(1.2,f.w*0.6),'#2c3136'));
 g.r.forEach(r=>{if(r.cls<=4)line(r.pts,r.w+(r.cls<=2?5:1),'#2b3238');});
 g.r.forEach(r=>{if(r.cls<=4)line(r.pts,r.w,r.cls<=1?'#59636c':r.cls<=3?'#4a535b':'#394047');});
 W.bInfo.forEach(b=>poly(b.P,b.h>20?'#6b7076':'#565b61'));
 // подписи главных улиц
 x.font='600 11px "Exo 2", Arial';x.fillStyle='rgba(200,215,225,.55)';x.textAlign='center';
 const done={};g.r.forEach(r=>{if(r.cls>1||!r.name)return;const L=r.S[r.S.length-1];if(L<120)return;const k=r.name;const p=samplePL(r.pts,r.S,L/2);const key=k+Math.round(p[0]/400)+Math.round(p[1]/400);if(done[key])return;done[key]=1;x.save();x.translate(X(p[0]),Z(p[1]));let a=Math.atan2(p[3],p[2]);if(a>PI/2)a-=PI;if(a<-PI/2)a+=PI;x.rotate(a);x.fillText(k.replace(/^(улица|проспект) /,'').toUpperCase(),0,-r.w*0.5-3);x.restore();});
 MAPC={canvas:c,scale:sc,minX:B.minX-pad,minZ:B.minZ-pad,X,Z};return MAPC;}
function mapWithRoute(route,col){const base=mapCanvas();const c=document.createElement('canvas');c.width=base.canvas.width;c.height=base.canvas.height;const x=c.getContext('2d');x.drawImage(base.canvas,0,0);
 x.setLineDash([6,7]);x.lineWidth=3;x.strokeStyle=col||'rgba(242,181,76,.85)';x.beginPath();route.forEach((p,i)=>(i?x.lineTo:x.moveTo).call(x,base.X(p[0]),base.Z(p[1])));x.stroke();x.setLineDash([]);
 return {canvas:c,scale:base.scale,minX:base.minX,minZ:base.minZ};}

// ---------------- деревья: голые мартовские кроны (3D вблизи, силуэты вдали), ели ----------------
const TREE={};
const TP=[// тип: высота ствола до развилки, радиус, уровни ветвления, дети по уровням, разлёт, длины, подъём
 {name:'elm',trunk:3.4,r:0.3,len:5.2,kids:[4,3,3],spread:[0.75,0.65,0.8],lenK:[0.62,0.6,0.55],up:0.35,H:15},
 {name:'poplar',trunk:1.6,r:0.34,len:0,kids:[0,3,2],spread:[0.25,0.45,0.6],lenK:[0.5,0.55,0.5],up:0.8,H:22,poplar:true},
 {name:'maple',trunk:2.6,r:0.24,len:4.2,kids:[5,3,2],spread:[0.8,0.7,0.8],lenK:[0.6,0.58,0.55],up:0.3,H:11},
 {name:'young',trunk:1.8,r:0.08,len:2.2,kids:[4,2,0],spread:[0.6,0.7,0.8],lenK:[0.6,0.5,0.5],up:0.45,H:5,stake:true},
 null,
 {name:'karagach',trunk:2.4,r:0.26,len:3.6,kids:[4,4,3],spread:[0.85,0.75,0.9],lenK:[0.62,0.58,0.55],up:0.25,H:10}];
function treeProto(ti,seed){const P=TP[ti];const r=rng(seed);const segs=[],tips=[];const up=new T.Vector3(0,1,0);
 const rv=()=>new T.Vector3(r()-0.5,r()-0.5,r()-0.5);
 const grow=(p,dir,len,rad,lvl)=>{const n=lvl===0?3:lvl===1?2:1;let cur=p.clone(),d=dir.clone();const pts=[cur.clone()];
  for(let i=0;i<n;i++){const nd=d.clone().add(rv().multiplyScalar(0.35)).addScaledVector(up,P.up*0.25).normalize();const q=cur.clone().addScaledVector(nd,len/n);segs.push({a:cur.clone(),b:q.clone(),ra:rad*(1-0.3*i/n),rb:rad*(1-0.3*(i+1)/n),lvl});cur=q;d=nd;pts.push(cur.clone());}
  const k=P.kids[lvl+1]!==undefined?P.kids[lvl+1]:0;
  if(lvl>=2||!k){tips.push({p:cur.clone(),d:d.clone(),lvl});if(lvl<2){for(let j=0;j<2;j++)tips.push({p:pts[1].clone().lerp(cur,0.5+r()*0.5),d:d.clone().add(rv()).normalize(),lvl});}return;}
  for(let j=0;j<k;j++){const tt=0.35+0.65*r();const idx=Math.min(pts.length-2,Math.floor(tt*(pts.length-1)));const base=pts[idx].clone().lerp(pts[idx+1],r());
   const side=new T.Vector3().crossVectors(d,rv()).normalize();const cd=d.clone().multiplyScalar(Math.cos(P.spread[lvl+1])).addScaledVector(side,Math.sin(P.spread[lvl+1])*(0.8+0.4*r())).addScaledVector(up,P.up*0.3).normalize();
   grow(base,cd,len*P.lenK[lvl]*(0.75+0.5*r()),rad*0.52*(0.8+0.3*r()),lvl+1);}
  tips.push({p:cur.clone(),d:d.clone(),lvl});};
 const t0=new T.Vector3(0,0,0),t1=new T.Vector3((r()-0.5)*0.4,P.trunk,(r()-0.5)*0.4);segs.push({a:t0,b:t1,ra:P.r*1.15,rb:P.r,lvl:0});
 if(P.poplar){// колонна: лидер до верха + много коротких восходящих ветвей
  let cur=t1.clone();const nL=6;for(let i=0;i<nL;i++){const q=cur.clone().add(new T.Vector3((r()-0.5)*0.5,(P.H-P.trunk)/nL,(r()-0.5)*0.5));segs.push({a:cur.clone(),b:q,ra:P.r*(1-i/nL*0.85),rb:P.r*(1-(i+1)/nL*0.85),lvl:0});
   const nb=4;for(let j=0;j<nb;j++){const a=r()*TAU;const cd=new T.Vector3(Math.cos(a)*0.38,1,Math.sin(a)*0.38).normalize();grow(cur.clone().lerp(q,r()),cd,(2.6+r()*2.2)*(1-i/nL*0.5),P.r*0.3*(1-i/nL*0.6),1);}cur=q;}tips.push({p:cur,d:up.clone(),lvl:2});}
 else{for(let j=0;j<P.kids[0];j++){const a=j/P.kids[0]*TAU+r()*0.9;const cd=new T.Vector3(Math.cos(a)*Math.sin(P.spread[0]),Math.cos(P.spread[0]),Math.sin(a)*Math.sin(P.spread[0])).normalize();grow(t1.clone().add(new T.Vector3(0,(r()-0.3)*0.8,0)),cd,P.len*(0.8+0.4*r()),P.r*0.62,0);}}
 // геометрия веток
 const gb=new GB({position:3,normal:3,uv:2});const tmp=new T.Vector3(),nrm=new T.Vector3();
 for(const s of segs){const sides=s.lvl===0?7:s.lvl===1?5:s.lvl===2?4:3;if(s.ra<0.012)continue;const d=new T.Vector3().subVectors(s.b,s.a);const L=d.length();d.normalize();const a1=Math.abs(d.y)<0.9?new T.Vector3(0,1,0):new T.Vector3(1,0,0);const u=new T.Vector3().crossVectors(d,a1).normalize(),w=new T.Vector3().crossVectors(d,u);
  const base=gb.n;for(let k=0;k<=sides;k++){const a=k/sides*TAU;nrm.copy(u).multiplyScalar(Math.cos(a)).addScaledVector(w,Math.sin(a));tmp.copy(s.a).addScaledVector(nrm,s.ra);gb.v({position:[tmp.x,tmp.y,tmp.z],normal:[nrm.x,nrm.y,nrm.z],uv:[k/sides,0]});tmp.copy(s.b).addScaledVector(nrm,s.rb);gb.v({position:[tmp.x,tmp.y,tmp.z],normal:[nrm.x,nrm.y,nrm.z],uv:[k/sides,L]});}
  for(let k=0;k<sides;k++){const i0=base+k*2;gb.t(i0,i0+2,i0+1);gb.t(i0+1,i0+2,i0+3);}}
 if(P.stake){for(const sx of [-0.35,0.35]){const b0=gb.n;const H=1.6;for(const q of [[sx-0.03,0,-0.03],[sx+0.03,0,-0.03],[sx+0.03,0,0.03],[sx-0.03,0,0.03]])gb.v({position:q,normal:[Math.sign(q[0]-sx),0,Math.sign(q[2])],uv:[0,0]});for(const q of [[sx-0.03,H,-0.03],[sx+0.03,H,-0.03],[sx+0.03,H,0.03],[sx-0.03,H,0.03]])gb.v({position:q,normal:[Math.sign(q[0]-sx),0,Math.sign(q[2])],uv:[0,1]});for(let k=0;k<4;k++){const a=b0+k,b=b0+(k+1)%4;gb.t(a,b,b+4);gb.t(a,b+4,a+4);}}}
 const branches=gb.geo();
 // карточки мелких веток на концах
 const cg=new GB({position:3,normal:3,uv:2});
 for(const tp of tips){const nc=tp.lvl>=2?2:1;for(let c=0;c<nc;c++){const sz=(P.poplar?1.7:tp.lvl>=2?2.2:1.8)*(0.8+0.4*r());const d=tp.d.clone().add(rv().multiplyScalar(0.6)).normalize();const side=new T.Vector3().crossVectors(d,rv()).normalize();const nn=new T.Vector3().crossVectors(side,d).normalize();
  const o=tp.p.clone().addScaledVector(d,-0.15);const b0=cg.n;const cnr=[[-0.5,0],[0.5,0],[0.5,1],[-0.5,1]];const col=(r()*4)|0;
  for(const [a,b] of cnr){tmp.copy(o).addScaledVector(side,a*sz).addScaledVector(d,b*sz);cg.v({position:[tmp.x,tmp.y,tmp.z],normal:[nn.x,nn.y+0.4,nn.z],uv:[(a+0.5+col)/4,b]});}cg.t(b0,b0+1,b0+2);cg.t(b0,b0+2,b0+3);}}
 const cards=cg.geo();branches.computeBoundingBox();const bb=branches.boundingBox;
 return {branches,cards,h:Math.max(bb.max.y,P.H*0.7),w:Math.max(bb.max.x-bb.min.x,bb.max.z-bb.min.z),segs};}
function twigTex(){if(TREE.twig)return TREE.twig;const Wd=1024,Hd=256;TREE.twig=canvasTex(Wd,Hd,(x)=>{x.clearRect(0,0,Wd,Hd);const r=rng(5);x.lineCap='round';
  const br=(px,py,a,len,w,d)=>{if(d>5||len<3)return;const ex=px+Math.cos(a)*len,ey=py+Math.sin(a)*len;x.strokeStyle=`rgba(${40+d*8},${35+d*7},${31+d*6},1)`;x.lineWidth=Math.max(1.1,w*0.8);x.beginPath();x.moveTo(px,py);x.quadraticCurveTo(px+Math.cos(a+0.2)*len*0.5,py+Math.sin(a+0.2)*len*0.5,ex,ey);x.stroke();
   const k=2+(r()*2|0);for(let i=0;i<k;i++)br(ex-(ex-px)*r()*0.4,ey-(ey-py)*r()*0.4,a+(r()-0.5)*1.3,len*(0.55+r()*0.2),w*0.62,d+1);if(d>=3&&r()<0.35){x.fillStyle='rgba(60,45,35,1)';x.beginPath();x.arc(ex,ey,1.4,0,7);x.fill();}};
  for(let c=0;c<4;c++){const cx=c*256+128;for(let j=0;j<2;j++)br(cx+(r()-0.5)*30,Hd,-PI/2+(r()-0.5)*0.7,72+r()*30,4,0);}},true);TREE.twig.anisotropy=4;return TREE.twig;}
function farTex(protos){if(TREE.far)return TREE.far;const cw=128,chh=256;TREE.far=canvasTex(cw*6,chh,(x)=>{x.clearRect(0,0,cw*6,chh);x.lineCap='round';
  protos.forEach((p,i)=>{if(!p)return;const H=p.h*1.05,sc=chh/H*0.98;const ox=i*cw+cw/2;const r=rng(i+3);
   for(const s of p.segs){x.strokeStyle='rgba(40,34,30,1)';x.lineWidth=Math.max(0.8,s.ra*2*sc*1.3);x.beginPath();x.moveTo(ox+s.a.x*sc,chh-s.a.y*sc);x.lineTo(ox+s.b.x*sc,chh-s.b.y*sc);x.stroke();
    if(s.lvl>=1){x.lineWidth=0.7;x.strokeStyle='rgba(45,38,33,.8)';for(let k=0;k<(s.lvl>=2?7:3);k++){const a=r()*TAU;const bx=ox+s.b.x*sc,by=chh-s.b.y*sc;x.beginPath();x.moveTo(bx,by);x.lineTo(bx+Math.cos(a)*6,by-Math.abs(Math.sin(a))*7);x.stroke();}}}});},true);return TREE.far;}
function spruceGeo(){if(TREE.spr)return TREE.spr;const gb=new GB({position:3,normal:3,uv:2});const r=rng(71);const tiers=11,H=13.5;
 for(let k=0;k<tiers;k++){const y0=1.6+k*(H-2.4)/tiers;const R=2.3*(1-k/tiers)+0.25;const h=1.9-k*0.06;const seg=11;const base=gb.n;const rot=r()*TAU;
  gb.v({position:[0,y0+h,0],normal:[0,1,0],uv:[0.5,1]});
  for(let i=0;i<=seg;i++){const a=rot+i/seg*TAU;const rr=R*(0.78+0.44*((i*7919+k*31)%13)/13);const droop=-0.35-0.25*((i*37+k)%5)/5;const x=Math.cos(a)*rr,z=Math.sin(a)*rr;const nl=Math.hypot(x,h*0.8)||1;gb.v({position:[x,y0+droop,z],normal:[Math.cos(a)*0.7,0.7,Math.sin(a)*0.7],uv:[i/seg,0]});}
  for(let i=0;i<seg;i++){gb.t(base,base+2+i,base+1+i);}
  // нижняя сторона яруса (тёмная)
  const b2=gb.n;gb.v({position:[0,y0+h*0.25,0],normal:[0,-1,0],uv:[0.5,0.5]});for(let i=0;i<=seg;i++){const a=rot+i/seg*TAU;const rr=R*(0.78+0.44*((i*7919+k*31)%13)/13);const droop=-0.35-0.25*((i*37+k)%5)/5;gb.v({position:[Math.cos(a)*rr,y0+droop,Math.sin(a)*rr],normal:[0,-1,0],uv:[i/seg,0]});}
  for(let i=0;i<seg;i++)gb.t(b2,b2+1+i,b2+2+i);}
 const tip=gb.n;gb.v({position:[0,H+1.2,0],normal:[0,1,0],uv:[0.5,1]});for(let i=0;i<=6;i++){const a=i/6*TAU;gb.v({position:[Math.cos(a)*0.35,H-0.6,Math.sin(a)*0.35],normal:[Math.cos(a),0.3,Math.sin(a)],uv:[i/6,0]});}for(let i=0;i<6;i++)gb.t(tip,tip+2+i,tip+1+i);
 const tr=new T.CylinderGeometry(0.14,0.24,2.2,6,1,true);tr.translate(0,1.1,0);
 TREE.spr={fol:gb.geo(),tr:tr.toNonIndexed()};return TREE.spr;}
function treeMats(){if(TREE.mats)return TREE.mats;const tw=twigTex();TREE.uNear=TREE.uNear||{value:100};
 const dith='float dth(vec2 p){return fract(52.9829189*fract(dot(p,vec2(0.06711056,0.00583715))));}';
 const bark=smogMat(new T.MeshStandardMaterial({color:C('#3b342e'),roughness:0.95,metalness:0}),{key:'bark',fDecl:NZ+dith+'uniform vec3 uCamP;uniform float uNear;',
  map:`{float n=texture2D(uNoise,vec2(vUv0.x*0.7,vUv0.y*0.35)+vSWP.xz*0.01).g;diffuseColor.rgb*=0.7+0.5*n;diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.07,0.075,0.05),smoothstep(0.6,0.8,n)*0.4);}`,
  uniforms:{uCamP:{value:new T.Vector3()},uNear:TREE.uNear},pre:`{float dd=distance(vSWP.xz,cameraPosition.xz);if(dth(gl_FragCoord.xy)<smoothstep(uNear-8.0,uNear+4.0,dd))discard;}`});
 const twig=smogMat(new T.MeshStandardMaterial({color:C('#4a4038'),map:tw,alphaTest:0.45,side:T.DoubleSide,roughness:1,metalness:0}),{key:'twig',fDecl:dith+'uniform float uNear;',uniforms:{uNear:TREE.uNear},pre:`{float dd=distance(vSWP.xz,cameraPosition.xz);if(dth(gl_FragCoord.xy)<smoothstep(uNear-8.0,uNear+4.0,dd))discard;}`});
 const twigDepth=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,map:tw,alphaTest:0.45,side:T.DoubleSide});
 const spr=smogMat(new T.MeshStandardMaterial({color:C('#223326'),roughness:0.95,metalness:0,side:T.DoubleSide}),{key:'spruce',fDecl:NZ,map:`{vec2 q=vec2(atan(vSWP.x-floor(vSWP.x/40.0)*40.0,1.0),vSWP.y);float n=texture2D(uNoise,vSWP.xz*0.9+vSWP.y*0.37).a;float n2=nz2(vSWP.xz*0.1+vSWP.y*0.2);vec3 c=diffuseColor.rgb*(0.6+0.6*n2)*(0.7+0.5*n);if(vSWN.y<-0.2)c*=0.35;c=mix(c,vec3(0.2,0.22,0.24),smoothstep(0.72,0.9,n)*0.35);diffuseColor.rgb=c;}`});
 TREE.mats={bark,twig,twigDepth,spr};return TREE.mats;}
// дальние деревья: цилиндрические биллборды (инстансы), atlas по типу
function farMat(){if(TREE.farMat)return TREE.farMat;const tex=farTex(TREE.protos);
 const crown=canvasTex(256,256,(x,w,h)=>{x.clearRect(0,0,w,h);const r=rng(9);x.lineCap='round';const br=(px,py,a,len,wd,d)=>{if(d>5||len<2)return;const ex=px+Math.cos(a)*len,ey=py+Math.sin(a)*len;x.strokeStyle='rgba(38,33,29,1)';x.lineWidth=wd;x.beginPath();x.moveTo(px,py);x.lineTo(ex,ey);x.stroke();for(let i=0;i<3;i++)br(ex,ey,a+(r()-0.5)*1.4,len*0.62,wd*0.66,d+1);};for(let i=0;i<7;i++)br(128,128,i/7*TAU+r()*0.4,46,5,0);},true);
 TREE.farMat=new T.ShaderMaterial({uniforms:Object.assign({uTex:{value:tex},uCrown:{value:crown},uCol:{value:C('#3b342e')},uAmb:{value:new T.Color(0.55,0.5,0.45)},uNear:TREE.uNear},T.UniformsLib.fog,{uSunDir:SU.uSunDir,uSunGlow:SU.uSunGlow}),fog:true,side:T.DoubleSide,
  vertexShader:`attribute vec4 aT;attribute float aK;varying vec2 vUv;varying vec3 vSWP;varying float vK;varying float vFade;
   void main(){vec3 c=aT.xyz;float sc=aT.w;float ty=floor(sc);float s=fract(sc)*40.0;vec3 cam=cameraPosition;vec2 dv=normalize(cam.xz-c.xz+vec2(1e-4));vec3 right=vec3(-dv.y,0.0,dv.x);vK=aK;
    vec3 wp;if(aK<0.5){wp=c+right*position.x*s*0.55+vec3(0.0,position.y*s,0.0);vUv=vec2((ty+0.5+position.x*0.98)/6.0,position.y);vFade=1.0;}
    else{wp=c+vec3(position.x*s*0.7,s*0.74,position.z*s*0.7);vUv=vec2(position.x+0.5,position.z+0.5);float dd=distance(cam,wp);vFade=smoothstep(0.3,0.62,(cam.y-wp.y)/max(dd,1.0));}
    vSWP=wp;vec4 mv=viewMatrix*vec4(wp,1.0);gl_Position=projectionMatrix*mv;}`,
  fragmentShader:`uniform sampler2D uTex;uniform sampler2D uCrown;uniform vec3 uCol;uniform vec3 uAmb;uniform vec3 uSunDir;uniform vec3 uSunGlow;uniform float uNear;varying vec2 vUv;varying vec3 vSWP;varying float vK;varying float vFade;
   #include <fog_pars_fragment>
   float dth(vec2 p){return fract(52.9829189*fract(dot(p,vec2(0.06711056,0.00583715))));}
   void main(){vec4 t=vK<0.5?texture2D(uTex,vUv):texture2D(uCrown,vUv);if(t.a<0.4)discard;if(vK>0.5&&dth(gl_FragCoord.xy+17.0)>=vFade)discard;float dd=distance(vSWP.xz,cameraPosition.xz);if(dth(gl_FragCoord.xy)>=smoothstep(uNear-8.0,uNear+4.0,dd))discard;
    gl_FragColor=vec4(uCol*uAmb,1.0);
    `+SMOG_FOG_PUBLIC+`
}`});
 return TREE.farMat;}
function initTrees(){if(TREE.protos)return;TREE.protos=TP.map((p,i)=>p?treeProto(i,31+i*17):null);// по 2 варианта для частых типов
 TREE.alt=[0,2,5].map(i=>({i,p:treeProto(i,301+i*7)}));}
function addTrees(ctx){initTrees();const g=CITY.geo();const Tt=g.J.t;const m=treeMats();const s=ctx.scene;const Q=L.Q;
 const list=[];for(let i=0;i<Tt.length;i+=4){const x=Tt[i],z=Tt[i+1];if(inKeep(x,z,2))continue;list.push({x,z,ty:Tt[i+2],sc:Tt[i+3]/10,rot:((x*12.9898+z*78.233)%TAU),v:((i/4)%2)});}
 ctx._trees=list;
 // инстансы ближних (по прототипу и варианту)
 const kinds=[];const mk=(proto,ty,vi)=>{const cap=Math.round(260*(0.6+0.4*Q.crowd));const b=new T.InstancedMesh(proto.branches,m.bark,cap),c=new T.InstancedMesh(proto.cards,m.twig,cap);b.count=c.count=0;b.castShadow=c.castShadow=!!Q.shadow;b.receiveShadow=true;c.customDepthMaterial=m.twigDepth;b.frustumCulled=c.frustumCulled=false;s.add(b,c);kinds.push({ty,vi,b,c,cap});};
 TREE.protos.forEach((p,i)=>{if(p)mk(p,i,0);});TREE.alt.forEach(a=>mk(a.p,a.i,1));
 const kindOf=(ty,v)=>kinds.find(k=>k.ty===ty&&k.vi===(TREE.alt.some(a=>a.i===ty)?v:0));
 // ели
 const sp=spruceGeo();const capS=900;const sf=new T.InstancedMesh(sp.fol,m.spr,capS),st=new T.InstancedMesh(sp.tr,m.bark,capS);sf.castShadow=!!Q.shadow;sf.receiveShadow=true;sf.frustumCulled=st.frustumCulled=false;sf.count=st.count=0;s.add(sf,st);
 // дальние биллборды
 const fg=new T.InstancedBufferGeometry();fg.setAttribute('position',new T.Float32BufferAttribute([-0.5,0,0,0.5,0,0,0.5,1,0,-0.5,1,0,-0.5,0,-0.5,0.5,0,-0.5,0.5,0,0.5,-0.5,0,0.5],3));fg.setAttribute('aK',new T.Float32BufferAttribute([0,0,0,0,1,1,1,1],1));fg.setIndex([0,1,2,0,2,3,4,6,5,4,7,6]);
 const capF=5200;const aT=new T.InstancedBufferAttribute(new Float32Array(capF*4),4);aT.setUsage(T.DynamicDrawUsage);fg.setAttribute('aT',aT);fg.instanceCount=0;const far=new T.Mesh(fg,farMat());far.frustumCulled=false;s.add(far);
 const dm=new T.Object3D();const fwd=new T.Vector3();let last=new T.Vector3(1e9,0,0),lastT=-9,lastYaw=0;
 const update=(camera,force)=>{const cp=camera.position;camera.getWorldDirection(fwd);const yaw=Math.atan2(fwd.x,fwd.z);
  if(!force&&cp.distanceTo(last)<3&&Math.abs(angD(yaw,lastYaw))<0.12)return;last.copy(cp);lastYaw=yaw;
  kinds.forEach(k=>k.n=0);let ns=0,nf=0,nn=0;const fx=fwd.x,fz=fwd.z,fl=Math.hypot(fx,fz)||1;const budget=Math.round(170*(0.55+0.45*Q.crowd));
  const near=[],farC=[];
  for(const t of list){const dx=t.x-cp.x,dz=t.z-cp.z;const d2=dx*dx+dz*dz;if(d2>430*430)continue;const d=Math.sqrt(d2);const front=(dx*fx+dz*fz)/fl;
   if(front<-18&&d>28)continue;if(d>40&&front<d*0.35)continue;t._d=d;
   if(t.ty===4){if(ns<capS){dm.position.set(t.x,0,t.z);dm.rotation.set(0,t.rot,0);dm.scale.set(t.sc*0.9,t.sc,t.sc*0.9);dm.updateMatrix();sf.setMatrixAt(ns,dm.matrix);st.setMatrixAt(ns,dm.matrix);ns++;}continue;}
   if(d<108)near.push(t);if(d>30)farC.push(t);}
  near.sort((a,b)=>a._d-b._d);let cut=108;if(near.length>budget)cut=near[budget]._d;const tn=clamp(cut-3,38,100);TREE.uNear.value=tn;
  for(const t of near){if(t._d>tn+5||nn>=budget)break;const k=kindOf(t.ty,t.v);if(k&&k.n<k.cap){dm.position.set(t.x,0,t.z);dm.rotation.set(0,t.rot,0);dm.scale.setScalar(t.sc);dm.updateMatrix();k.b.setMatrixAt(k.n,dm.matrix);k.c.setMatrixAt(k.n,dm.matrix);k.n++;nn++;}}
  for(const t of farC){if(t._d<tn-9||nf>=capF)continue;const p=TREE.protos[t.ty];aT.setXYZW(nf,t.x,0,t.z,t.ty+Math.min(0.999,p.h*t.sc*1.05/40));nf++;}
  kinds.forEach(k=>{k.b.count=k.c.count=k.n;k.b.instanceMatrix.needsUpdate=k.c.instanceMatrix.needsUpdate=true;});sf.count=st.count=ns;sf.instanceMatrix.needsUpdate=st.instanceMatrix.needsUpdate=true;fg.instanceCount=nf;aT.needsUpdate=true;};
 ctx.ticks.push((t,dt,camera)=>update(camera,false));ctx._treeUpdate=update;
 // коллайдеры стволов
 list.forEach(t=>{if(t.ty===3)return;ctx.addCollider({t:'c',x:t.x,z:t.z,r:t.ty===4?0.45:0.32*t.sc+0.05,tree:1});});}

// ---------------- фонари, светофоры ----------------
function lampGeos(){if(TREE.lamp)return TREE.lamp;
 const pole=[];const c1=new T.CylinderGeometry(0.07,0.12,8.6,8,1,true);c1.translate(0,4.3,0);pole.push(c1.toNonIndexed());
 const arm=new T.CylinderGeometry(0.045,0.05,2.2,6,1,true);arm.rotateZ(PI/2-0.18);arm.translate(-1.02,8.75,0);pole.push(arm.toNonIndexed());
 const hd=new T.BoxGeometry(0.85,0.2,0.36);hd.translate(-2.05,8.95,0);pole.push(hd.toNonIndexed());const base=new T.CylinderGeometry(0.18,0.2,0.6,8);base.translate(0,0.3,0);pole.push(base.toNonIndexed());
 const lens=new T.BoxGeometry(0.72,0.05,0.26);lens.translate(-2.05,8.83,0);
 const pp=new T.CylinderGeometry(0.05,0.08,4,8,1,true);pp.translate(0,2,0);const cap=new T.CylinderGeometry(0.26,0.14,0.22,10);cap.translate(0,4.55,0);const pb=new T.CylinderGeometry(0.12,0.15,0.4,8);pb.translate(0,0.2,0);
 const globe=new T.SphereGeometry(0.2,12,8);globe.translate(0,4.28,0);
 TREE.lamp={pole:T.BufferGeometryUtils.mergeBufferGeometries(pole),lens:lens.toNonIndexed(),ppole:T.BufferGeometryUtils.mergeBufferGeometries([pp.toNonIndexed(),cap.toNonIndexed(),pb.toNonIndexed()]),globe};return TREE.lamp;}
function addLamps(ctx){const g=CITY.geo();const Lm=g.J.l;const G=lampGeos();const s=ctx.scene;const lk=ctx.look;
 const metal=smogMat(new T.MeshStandardMaterial({color:C('#2e3033'),roughness:0.55,metalness:0.6}),{key:'lampm'});
 const lensM=new T.MeshBasicMaterial({color:C('#ffd9a0').multiplyScalar(2.2*lk.lamps+0.4),toneMapped:false,fog:true});
 const street=[],park=[];for(let i=0;i<Lm.length;i+=4){const q={x:Lm[i],z:Lm[i+1],a:Lm[i+2],ty:Lm[i+3]};if(inKeep(q.x,q.z,1))continue;(q.ty?park:street).push(q);}
 const dm=new T.Object3D();
 const inst=(geo,mat,arr,cast)=>{const m=new T.InstancedMesh(geo,mat,Math.max(1,arr.length));arr.forEach((q,i)=>{dm.position.set(q.x,0,q.z);dm.rotation.set(0,q.a+PI/2,0);dm.scale.setScalar(1);dm.updateMatrix();m.setMatrixAt(i,dm.matrix);});m.count=arr.length;m.castShadow=!!cast;m.receiveShadow=true;m.computeBoundingSphere&&m.computeBoundingSphere();m.frustumCulled=false;s.add(m);return m;};
 inst(G.pole,metal,street,true);inst(G.lens,lensM,street);inst(G.ppole,metal,park,true);inst(G.globe,lensM,park);
 // ореолы в дымке
 const pos=[],col=[];const wc=C('#ffcf8f'),cc=C('#d9e6ff');
 street.forEach(q=>{const hx=q.x+Math.cos(q.a+PI/2)*-2.05*1,hz=q.z-Math.sin(q.a+PI/2)*-2.05;const c=(Math.abs(q.x*7+q.z*3)%10)<7?wc:cc;pos.push(hx,8.7,hz);col.push(c.r,c.g,c.b);});
 park.forEach(q=>{pos.push(q.x,4.28,q.z);col.push(wc.r,wc.g,wc.b);});
 const pg=new T.BufferGeometry();pg.setAttribute('position',new T.Float32BufferAttribute(pos,3));pg.setAttribute('color',new T.Float32BufferAttribute(col,3));
 const pm=new T.PointsMaterial({size:5.5,vertexColors:true,map:L.glowTex,transparent:true,opacity:0.55*lk.lamps+0.08,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false,fog:true});
 const pts=new T.Points(pg,pm);pts.frustumCulled=false;s.add(pts);
 street.forEach(q=>ctx.addCollider({t:'c',x:q.x,z:q.z,r:0.2}));park.forEach(q=>ctx.addCollider({t:'c',x:q.x,z:q.z,r:0.15}));
 ctx._lamps=street;}

// ---------------- машины: материал, парковки, трафик ----------------
const CARS={};
const CAR_MODELS=['sedan','sedan-sports','hatchback-sports','suv','suv-luxury','taxi','van','delivery'];
const CAR_W=[30,6,12,14,13,0,10,4];// веса выбора (такси отдельно)
const PAINT=['#e9e9e5','#ecebe6','#dedcd6','#f2f1ec','#e4e3de','#15161a','#0f1013','#8d9196','#a3a7ab','#b8bcbf','#5b6066','#3a3f46','#1d2c46','#5a1c20','#2c3a2e','#b9ad94','#6d6352','#8a2a24','#27456b','#c7c2b4'];
function carMat(){if(CARS.mat)return CARS.mat;
 CARS.mat=smogMat(new T.MeshPhysicalMaterial({color:0xffffff,roughness:0.4,metalness:0.1,clearcoat:1,clearcoatRoughness:0.08}),{key:'car',
  vDecl:'attribute float aCls;attribute vec3 aLt;varying float vCls;varying vec3 vLt;',vert:'vCls=aCls;vLt=aLt;',
  fDecl:'varying float vCls;varying vec3 vLt;float gR;float gM;float gCC;vec3 gE;',
  col:`{float k=floor(vCls+0.5);vec3 paint=diffuseColor.rgb;gR=0.3;gM=0.3;gCC=1.0;gE=vec3(0.0);vec3 c=paint;
   if(k<0.5){}
   else if(k<1.5){c=vec3(0.016,0.016,0.018);gR=0.85;gM=0.0;gCC=0.0;}
   else if(k<2.5){c=mix(paint*0.75,vec3(0.03,0.031,0.033),0.45);gR=0.45;gM=0.15;gCC=0.5;}
   else if(k<3.5){c=vec3(0.3,0.31,0.32);gR=0.3;gM=0.9;gCC=0.0;}
   else if(k<4.5){c=vec3(0.5,0.51,0.53);gR=0.2;gM=0.95;gCC=0.0;}
   else if(k<5.5){c=vec3(0.005,0.006,0.008);gR=0.05;gM=0.5;gCC=1.0;}
   else if(k<6.5){c=vec3(0.75,0.73,0.68);gR=0.1;gM=0.0;gCC=1.0;gE=vec3(1.0,0.92,0.78)*(0.1+vLt.y*2.4);}
   else if(k<7.5){c=vec3(0.28,0.012,0.01);gR=0.15;gM=0.0;gCC=1.0;gE=vec3(1.0,0.05,0.025)*(0.35*vLt.y+vLt.x*3.2);}
   else{c=vec3(0.9,0.86,0.7);gE=vec3(1.0,0.82,0.45)*(0.2+1.4*vLt.y);gR=0.5;gCC=0.0;}
   if(vLt.z>0.5&&k>6.5&&k<7.5)gE+=vec3(1.0,0.45,0.05)*2.5*step(0.5,fract(uTime*1.6));
   float dirt=smoothstep(0.85,0.15,vSWP.y);c=mix(c,vec3(0.1,0.085,0.07),dirt*0.5*step(k,2.5));gR=mix(gR,0.75,dirt*0.7*step(k,0.5));
   diffuseColor.rgb=c;}`,
  rough:'roughnessFactor=gR;metalnessFactor=gM;',emis:'totalEmissiveRadiance+=gE;',lights:'#ifdef CLEARCOAT\n material.clearcoat*=gCC;\n#endif'});
 return CARS.mat;}
// пул инстансов: по модели одна InstancedMesh (трафик + парковка)
function carPool(ctx,counts){const s=ctx.scene;const pool={};const mat=carMat();
 CAR_MODELS.forEach(n=>{const cm=CITY.D.cars[n];const cap=counts[n]||0;if(!cm||!cap)return;const g=new T.BufferGeometry();for(const k in cm.geo.attributes)g.setAttribute(k,cm.geo.attributes[k]);
  const lt=new T.InstancedBufferAttribute(new Float32Array(cap*3),3);lt.setUsage(T.DynamicDrawUsage);g.setAttribute('aLt',lt);g.boundingSphere=new T.Sphere(new T.Vector3(),1e5);
  const im=new T.InstancedMesh(g,mat,cap);im.instanceMatrix.setUsage(T.DynamicDrawUsage);im.castShadow=!!L.Q.shadow;im.receiveShadow=true;im.frustumCulled=false;im.count=0;
  im.setColorAt(0,new T.Color(1,1,1));s.add(im);
  // мягкая контактная тень под машиной (общая матрица инстансов)
  const sg=new T.PlaneGeometry(cm.wid+0.7,cm.len+0.9);sg.rotateX(-PI/2);sg.translate(0,0.03,cm.zc);const sh=new T.InstancedMesh(sg,carShadowMat(),cap);sh.instanceMatrix=im.instanceMatrix;sh.frustumCulled=false;sh.count=0;sh.renderOrder=1;s.add(sh);
  pool[n]={im,lt,n:0,cap,cm,sh};});
 pool.take=(n)=>{const p=pool[n];if(!p||p.n>=p.cap)return null;const i=p.n++;p.im.count=p.n;p.sh.count=p.n;return {p,i};};
 return pool;}
const _cc=new T.Color();
function carShadowMat(){if(CARS.shMat)return CARS.shMat;const t=canvasTex(128,256,(x,w,h)=>{x.clearRect(0,0,w,h);for(let i=0;i<14;i++){const k=i/14;x.fillStyle=`rgba(0,0,0,${0.09})`;const r=10+k*18;x.beginPath();x.moveTo(r+6,r+6);x.arcTo(w-r-6,r+6,w-r-6,h-r-6,r);x.arcTo(w-r-6,h-r-6,r+6,h-r-6,r);x.arcTo(r+6,h-r-6,r+6,r+6,r);x.arcTo(r+6,r+6,w-r-6,r+6,r);x.fill();}},false);
 CARS.shMat=new T.MeshBasicMaterial({map:t,color:0x000000,transparent:true,opacity:0.85,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-12,fog:true});return CARS.shMat;}
function setInst(slot,x,y,z,h,col,lt){const e=slot.p.im.instanceMatrix.array;const o=slot.i*16;const c=Math.cos(h),sn=Math.sin(h);
 e[o]=c;e[o+1]=0;e[o+2]=-sn;e[o+3]=0;e[o+4]=0;e[o+5]=1;e[o+6]=0;e[o+7]=0;e[o+8]=sn;e[o+9]=0;e[o+10]=c;e[o+11]=0;e[o+12]=x;e[o+13]=y;e[o+14]=z;e[o+15]=1;
 slot.p.im.instanceMatrix.needsUpdate=true;if(col){slot.p.im.setColorAt(slot.i,col);slot.p.im.instanceColor.needsUpdate=true;}if(lt){slot.p.lt.setXYZ(slot.i,lt[0],lt[1],lt[2]);slot.p.lt.needsUpdate=true;}}
function pickModel(r){let tot=0;CAR_W.forEach(w=>tot+=w);let q=r()*tot;for(let i=0;i<CAR_W.length;i++){q-=CAR_W[i];if(q<=0)return CAR_MODELS[i];}return 'sedan';}
function pickPaint(r,model){if(model==='taxi')return C('#ecebe5');if(model==='delivery'&&r()<0.5)return C('#e4e2dc');return C(PAINT[(r()*PAINT.length)|0]);}

// полосы движения из цепочек улиц + стоп-линии светофоров
function buildLanes(){if(CARS.lanes)return CARS.lanes;const g=CITY.geo();const lanes=[];const LW=3.25;const ge=[Math.cos(g.rot),-Math.sin(g.rot)];
 g.ch.forEach((c,ci)=>{const n=Math.max(1,c.lanes);const pts=c.pts;if(pts.length<2)return;const off=offsets(pts);
  const mk=(o,rev,idx,bus,nl)=>{let P=pts.map((p,i)=>[p[0]+off[i][0]*o,p[1]+off[i][1]*o]);if(rev)P.reverse();const S=cum(P);const samp=[];for(let s=5;s<S[S.length-1]-5;s+=12){const q=samplePL(P,S,s);samp.push([s,q[0],q[1]]);}
   lanes.push({ci,P,S,len:S[S.length-1],idx,nl,bus:!!bus,cls:c.cls,name:c.name,cars:[],stops:[],samp,seg:1});};
  if(c.ow){for(let i=0;i<n;i++)mk((i+0.5)*LW-n*LW/2,false,i,c.bus&&i===n-1,n);}
  else{const h=Math.max(1,Math.floor(n/2));for(let i=0;i<h;i++){mk((i+0.5)*LW,false,h-1-i,false,h);mk(-(i+0.5)*LW,true,h-1-i,false,h);}}});
 // светофоры
 const sigs=[];g.x.forEach((q,i)=>{if(!q[3])return;sigs.push({x:q[0],z:q[1],rad:q[2],off:((q[0]*7.13+q[1]*3.71)%52+52)%52,i});});
 for(const ln of lanes){for(const sg of sigs){let best=1e9,bs=0,bi=1;for(let i=1;i<ln.P.length;i++){const a=ln.P[i-1],b=ln.P[i];const ex=b[0]-a[0],ez=b[1]-a[1];const L2=ex*ex+ez*ez||1e-9;const u=clamp(((sg.x-a[0])*ex+(sg.z-a[1])*ez)/L2,0,1);const d=Math.hypot(sg.x-a[0]-ex*u,sg.z-a[1]-ez*u);if(d<best){best=d;bs=ln.S[i-1]+u*Math.sqrt(L2);bi=i;}}
  if(best>LW*4)continue;const q=samplePL(ln.P,ln.S,bs);const grp=Math.abs(q[2]*ge[0]+q[3]*ge[1])>0.7?0:1;ln.stops.push({s:bs-sg.rad-2.6,sg,grp,node:bs});}
  ln.stops.sort((a,b)=>a.s-b.s);}
 CARS.lanes=lanes;CARS.sigs=sigs;return lanes;}
// фаза: 0 зелёный,1 жёлтый,2 красный (цикл 52 c)
function sigState(sg,grp,t){if(sg.force!==undefined)return sg.force[grp];const q=(t+sg.off)%52;if(grp===0)return q<22?0:q<25?1:2;return q<26?2:q<48?0:q<51?1:2;}

function addTraffic(ctx,o){const g=CITY.geo();const lanes=buildLanes().map(l=>Object.assign({},l,{cars:[]}));const Q=L.Q;let filled=false;const r=rng(o.seed||7);const drive=ctx.mode==='drive';
 const nMove=Math.round(o.n*(0.55+0.45*Q.crowd));
 // парковка на тротуарах вдоль маршрута
 const pk=g.J.pk;const park=[];const route=o.route;const dRoute=(x,z)=>{let best=1e9;for(let i=1;i<route.length;i++){const a=route[i-1],b=route[i];const ex=b[0]-a[0],ez=b[1]-a[1];const L2=ex*ex+ez*ez||1e-9;const u=clamp(((x-a[0])*ex+(z-a[1])*ez)/L2,0,1);best=Math.min(best,Math.hypot(x-a[0]-ex*u,z-a[1]-ez*u));}return best;};
 for(let i=0;i<pk.length;i+=4){const x=pk[i],z=pk[i+1];if(inKeep(x,z,3))continue;const d=dRoute(x,z);if(d<o.parkR)park.push({x,z,h:pk[i+2],mode:pk[i+3],d});}
 park.sort((a,b)=>a.d-b.d);park.length=Math.min(park.length,Math.round(o.nPark*(0.5+0.5*Q.crowd)));
 const parkModels=park.map(()=>{const m=pickModel(r);return m;});
 const moveModels=[];for(let i=0;i<nMove;i++)moveModels.push(pickModel(r));
 const taxiN=o.taxi||0;
 const counts={};CAR_MODELS.forEach(n=>counts[n]=0);parkModels.forEach(m=>counts[m]++);moveModels.forEach(m=>counts[m]++);counts.taxi+=taxiN+3;counts['suv-luxury']+=2;counts.delivery+=3;counts.van+=2;counts.sedan+=2;// запас под сюжетные машины (внедорожник на зебре, «аварийка» на Толе би)
 const pool=carPool(ctx,counts);ctx._carPool=pool;
 park.forEach((q,i)=>{const m=parkModels[i];const sl=pool.take(m);if(!sl)return;const cm=sl.p.cm;const h=q.h;const lift=q.mode===0?0.07:0.02;
  setInst(sl,q.x-Math.sin(h)*cm.zc,lift,q.z-Math.cos(h)*cm.zc,h,pickPaint(r,m),[0,0,0]);ctx.addCollider({t:'b',x:q.x,z:q.z,w:cm.wid+0.1,d:cm.len+0.1,ry:-h,car:1});});
 // движущиеся
 const cars=[];ctx._cars=cars;
 const mkCar=(m)=>{const sl=pool.take(m);if(!sl)return null;const cm=sl.p.cm;const c={sl,cm,m,len:cm.len,wid:cm.wid,lane:null,s:0,v:0,v0:10,off:0,offT:0,yieldT:0,stopT:0,honkT:0,rude:r()<0.12,run:r()<0.5,x:0,z:0,h:0,brake:0,paint:pickPaint(r,m),col:{t:'b',x:0,z:0,w:cm.wid+0.1,d:cm.len+0.1,ry:0,car:1,dyn:1},alive:false,fixed:false,idle:0};cars.push(c);return c;};
 moveModels.forEach(m=>mkCar(m));for(let i=0;i<taxiN;i++){const c=mkCar('taxi');if(c){c.taxi=true;c.paint=C('#ecebe5');}}
 const focus=new T.Vector3();const R_KEEP=o.rKeep||330,R0=o.r0||190,R1=o.r1||300;
 // пробки: зоны с плотностью/скоростью
 const jamAt=(ln,x,z)=>{let j=o.jam?o.jam(ln,x,z):null;return j||{sp:[12,34],v0:[9,14]};};
 const EX=o.exclude||[];const exOK=(x,z)=>{for(const e of EX)if(Math.hypot(x-e[0],z-e[1])<(e[2]||12))return false;if(DRIVEAPI.active&&DRIVEAPI.pos&&Math.hypot(x-DRIVEAPI.pos.x,z-DRIVEAPI.pos.z)<10)return false;return true;};
 const laneFree=(ln,s,gap)=>{for(const c of ln.cars)if(Math.abs(c.s-s)<gap)return false;const q=samplePL(ln.P,ln.S,s);return exOK(q[0],q[1]);};
 const place=(c,ln,s,v)=>{if(c.lane){const a=c.lane.cars;const k=a.indexOf(c);if(k>=0)a.splice(k,1);}c.lane=ln;c.s=s;c.v=v;ln.cars.push(c);c.alive=true;c.off=0;c.offT=0;c.yieldT=0;c.stopT=0;
  const q=samplePL(ln.P,ln.S,s);const jm=jamAt(ln,q[0],q[1]);c.v0=jm.v0[0]+r()*(jm.v0[1]-jm.v0[0]);if(ln.bus&&!c.taxi)c.v0*=1.2;c.jam=jm;posCar(c);};
 const posCar=(c)=>{const ln=c.lane;const q=samplePL(ln.P,ln.S,c.s);const q2=samplePL(ln.P,ln.S,Math.min(ln.len,c.s+2.5)),q0=samplePL(ln.P,ln.S,Math.max(0,c.s-2.5));let dx=q2[0]-q0[0],dz=q2[1]-q0[1];const l=Math.hypot(dx,dz)||1;dx/=l;dz/=l;
  c.x=q[0]-dz*c.off;c.z=q[1]+dx*c.off;c.h=Math.atan2(dx,dz)+c.offT*0.0;c.dx=dx;c.dz=dz;};
 const lanesNear=(p,R)=>lanes.filter(ln=>ln.samp.some(q=>Math.abs(q[1]-p.x)<R&&Math.abs(q[2]-p.z)<R));
 let active=[];let activeT=-9;
 const fill=(p)=>{active=lanesNear(p,R_KEEP);const per=[];
  const hd=(x,z)=>o.hot?Math.min(...o.hot.map(h=>Math.hypot(x-h[0],z-h[1]))):Math.hypot(x-p.x,z-p.z);
  for(const ln of active){if(o.skipLane&&o.skipLane(ln))continue;const cs=[];for(const q of ln.samp){const d0=Math.hypot(q[1]-p.x,q[2]-p.z);if(d0>R_KEEP-20)continue;cs.push({s:q[0],d:hd(q[1],q[2]),x:q[1],z:q[2]});}if(!cs.length)continue;cs.sort((a,b)=>a.d-b.d);const j=o.jam?o.jam(ln,cs[0].x,cs[0].z):null;per.push({ln,cs,i:0,pri:(j?0:1)+(ln.bus?-0.5:0)+cs[0].d/400});}
  per.sort((a,b)=>a.pri-b.pri);const free=cars.filter(c=>!c.alive&&!c.fixed);free.sort((a,b)=>(b.taxi?1:0)-(a.taxi?1:0));let fi=0;
  // по кругу: каждой полосе по «кластеру» (в пробке — плотнее), ближние точки раньше
  for(let round=0;round<60&&fi<free.length;round++){let any=false;for(const e of per){if(fi>=free.length)break;if(e.i>=e.cs.length)continue;const cd=e.cs[e.i++];any=true;const jm=jamAt(e.ln,cd.x,cd.z);const sp=jm.sp[0]+r()*(jm.sp[1]-jm.sp[0]);const k2=jm.sp[0]<9?3:1;
    for(let k=0;k<k2&&fi<free.length;k++){const s=cd.s+(k-1)*sp+(r()-0.5)*1.5;if(s<3||s>e.ln.len-3)continue;if(!laneFree(e.ln,s,sp*0.9))continue;let c=free[fi];if(c.taxi&&!e.ln.bus){const j=free.findIndex((q,qi)=>qi>=fi&&!q.taxi);if(j<0)continue;[free[fi],free[j]]=[free[j],free[fi]];c=free[fi];}else if(!c.taxi&&e.ln.bus&&r()<0.75){const j=free.findIndex((q,qi)=>qi>=fi&&q.taxi);if(j>=0){[free[fi],free[j]]=[free[j],free[fi]];c=free[fi];}}
     place(c,e.ln,s,jm.v0[0]*0.3*r());fi++;}}if(!any)break;}};
 const respawn=(c,p,fwd)=>{for(let tries=0;tries<40;tries++){if(!active.length)return false;const ln=active[(r()*active.length)|0];if(o.skipLane&&o.skipLane(ln))continue;if(c.taxi&&!ln.bus&&r()<0.85)continue;if(!ln.samp.length)continue;const q=ln.samp[(r()*ln.samp.length)|0];const d=Math.hypot(q[1]-p.x,q[2]-p.z);if(d<R0||d>R1)continue;
   if(fwd&&((q[1]-p.x)*fwd.x+(q[2]-p.z)*fwd.z)<-40)continue;const jm=jamAt(ln,q[1],q[2]);if(!laneFree(ln,q[0],Math.max(9,jm.sp[0])))continue;place(c,ln,q[0],jm.v0[0]*0.5);return true;}return false;};
 // статичные машины-участники (напр. внедорожник на зебре)
 const addStatic=(m,ln,s,col,o2)=>{const c=mkCar(m);if(!c)return null;c.fixed=true;c.paint=col;place(c,ln,s,0);c.v0=0;Object.assign(c,o2||{});return c;};
 ctx._addStaticCar=addStatic;
 // огни машин в дымке
 const NL=(cars.length+16)*4;const lp=new Float32Array(NL*3),lc=new Float32Array(NL*3),ls=new Float32Array(NL);const lg=new T.BufferGeometry();lg.setAttribute('position',new T.BufferAttribute(lp,3));lg.setAttribute('color',new T.BufferAttribute(lc,3));lg.setAttribute('size',new T.BufferAttribute(ls,1));
 const lm=new T.ShaderMaterial({uniforms:Object.assign({uTex:{value:L.glowTex},uScale:{value:600}},T.UniformsLib.fog),fog:true,transparent:true,depthWrite:false,blending:T.AdditiveBlending,
  vertexShader:'attribute float size;attribute vec3 color;varying vec3 vC;\n#include <fog_pars_vertex>\nvoid main(){vC=color;vec4 mvPosition=modelViewMatrix*vec4(position,1.0);gl_PointSize=size*300.0/max(1.0,-mvPosition.z);gl_Position=projectionMatrix*mvPosition;\n#include <fog_vertex>\n}',
  fragmentShader:'uniform sampler2D uTex;varying vec3 vC;\n#include <fog_pars_fragment>\nvoid main(){vec4 t=texture2D(uTex,gl_PointCoord);gl_FragColor=vec4(vC*t.a,t.a);\n#ifdef USE_FOG\n#ifdef FOG_EXP2\nfloat ff=1.0-exp(-fogDensity*fogDensity*fogDepth*fogDepth);\n#else\nfloat ff=smoothstep(fogNear,fogFar,fogDepth);\n#endif\ngl_FragColor.rgb*=1.0-ff*0.85;\n#endif\n}'});
 const lpts=new T.Points(lg,lm);lpts.frustumCulled=false;lpts.renderOrder=4;ctx.scene.add(lpts);
 const hC=C('#fff2dc'),tC=C('#ff2a18');
 const tmpV=new T.Vector3();
 const sim=(t,dt,camera)=>{dt=Math.min(dt,0.05);
  // фокус
  if(DRIVEAPI.active&&DRIVEAPI.pos)focus.copy(DRIVEAPI.pos);else if(window.PLAY&&PLAY.active&&PLAY.state.hero)focus.copy(PLAY.state.hero.position);else focus.copy(o.center?V(o.center[0],0,o.center[1]):camera.position);
  if(t-activeT>1.2||!active.length){active=lanesNear(focus,R_KEEP);activeT=t;}
  if(!filled){filled=true;fill(focus);}
  const pl=DRIVEAPI.active?DRIVEAPI.car:(ctx._police?{x:ctx._police.x,z:ctx._police.z,h:ctx._police.h,v:0}:null);const hero=(window.PLAY&&PLAY.active&&PLAY.state.hero)?PLAY.state.hero.position:null;
  for(const ln of active){if(ln.cars.length>1)ln.cars.sort((a,b)=>a.s-b.s);}
  const fwd=DRIVEAPI.active?DRIVEAPI.fwd:null;
  for(const c of cars){if(!c.alive){if(!c.fixed&&r()<0.1)respawn(c,focus,fwd);continue;}
   const ln=c.lane;
   if(!c.fixed&&(Math.hypot(c.x-focus.x,c.z-focus.z)>R_KEEP+40||c.s>ln.len-4)){c.alive=false;const k=ln.cars.indexOf(c);if(k>=0)ln.cars.splice(k,1);c.x=1e6;setInst(c.sl,0,-100,0,0,null,null);continue;}
   if(c.fixed){c.v=0;posCar(c);}
   else{const k=ln.cars.indexOf(c);const lead=ln.cars[k+1];let gap=lead?lead.s-c.s-(lead.len+c.len)/2:1e4;let vl=lead?lead.v:c.v0;
    // светофор
    for(const st of ln.stops){if(st.s<c.s+c.len*0.5-1)continue;const dd=st.s-c.s-c.len*0.5;if(dd>90)break;const ph=sigState(st.sg,st.grp,t);if(ph===0)break;if(c.rude&&c.run&&dd<30){break;}if(ph===2||dd>c.v*c.v/7+2){if(dd<gap){gap=dd;vl=0;}}break;}
    // игрок/герой перед капотом
    const fx=c.dx,fz=c.dz;
    if(pl){const ex=pl.x-c.x,ez=pl.z-c.z;const along=ex*fx+ez*fz,lat=Math.abs(-ex*fz+ez*fx);if(along>0&&along<40&&lat<2.4){const g2=along-c.len*0.5-2.6;if(g2<gap){gap=g2;vl=Math.max(0,pl.v);}}
     // сирена: машина впереди уходит от траектории игрока (обычно вправо, если игрок правее — влево), не въезжая в его полосу
     if(DRIVEAPI.siren&&!c.rude&&along<0&&along>-45&&lat<3.5&&Math.abs(angD(Math.atan2(fx,fz),pl.h))<0.8){const pL=-ex*fz+ez*fx+c.off;c.yOff=clamp(pL<=0?Math.max(0,pL+2.75):Math.min(0,pL-2.75),-3.1,3.1);c.yieldT=3.2;}}
    if(hero&&!(c.rude&&c.v>2)){const ex=hero.x-c.x,ez=hero.z-c.z;const along=ex*fx+ez*fz,lat=Math.abs(-ex*fz+ez*fx);if(along>0&&along<9&&lat<1.3){const g2=along-c.len*0.5-0.6;if(g2<gap&&(c.v<3.5||along<c.len*0.5+2.2)){gap=g2;vl=0;c.honkT=Math.max(c.honkT,0.6);}}}
    if(c.stopT>0){c.stopT-=dt;gap=Math.min(gap,0);}
    if(c.yieldT>0){c.yieldT-=dt;c.off+=((c.yOff||0)-c.off)*Math.min(1,dt*1.8);gap=Math.min(gap,Math.max(0,c.v*0.6));}else if(c.off!==0){c.off+=(0-c.off)*Math.min(1,dt*0.9);if(Math.abs(c.off)<0.02)c.off=0;}
    const v0=Math.max(0.5,c.v0);const ss=2.2+c.v*1.25+c.v*(c.v-vl)/(2*Math.sqrt(1.6*2.4));let a=1.6*(1-Math.pow(c.v/v0,4)-Math.pow(Math.max(0,ss)/Math.max(gap,0.05),2));a=clamp(a,-9,2.2);
    const pv=c.v;c.v=Math.max(0,c.v+a*dt);if(gap<0.25)c.v=0;c.s+=c.v*dt;c.brake=clamp((pv-c.v)/dt/3,0,1)*0.8+(c.v<0.3?0.6:0);posCar(c);
    c.honkT=Math.max(0,c.honkT-dt);}
   const lit=o.lights?1:0.5;setInst(c.sl,c.x,0,c.z,c.h,c.paintSet?null:c.paint,[c.brake,lit,c.haz?1:0]);c.paintSet=true;
   c.col.x=c.x;c.col.z=c.z;c.col.ry=-c.h;}
  // огни
  let n=0;const cp=camera.position;
  for(const c of cars){if(!c.alive)continue;if(n>=NL-4)break;const d=Math.hypot(c.x-cp.x,c.z-cp.z);if(d>220)continue;const fx=Math.sin(c.h),fz=Math.cos(c.h),rx=fz,rz=-fx;const hl=c.len*0.5,hw=c.wid*0.36;const toCx=(cp.x-c.x)/d,toCz=(cp.z-c.z)/d;const face=fx*toCx+fz*toCz;
   const hk=clamp(0.25+face,0.08,1)*(o.lights?1.0:0.55)*(c.honkT>0?1.8:1),tk=clamp(0.3-face,0.1,1)*(0.45+c.brake*1.6);
   for(const sd of [-1,1]){lp.set([c.x+fx*hl+rx*hw*sd,0.72,c.z+fz*hl+rz*hw*sd],n*3);lc.set([hC.r*hk*1.6,hC.g*hk*1.6,hC.b*hk*1.6],n*3);ls[n]=0.9+hk*0.6;n++;
    lp.set([c.x-fx*hl+rx*hw*sd,0.8,c.z-fz*hl+rz*hw*sd],n*3);lc.set([tC.r*tk*1.8,tC.g*tk*1.8,tC.b*tk*1.8],n*3);ls[n]=0.55+tk*0.5;n++;}}
  lg.setDrawRange(0,n);lg.attributes.position.needsUpdate=lg.attributes.color.needsUpdate=lg.attributes.size.needsUpdate=true;};
 ctx.ticks.push(sim);
 ctx._dynCars=(x,z,r,buf)=>{for(const c of cars){if(!c.alive)continue;if(Math.abs(c.x-x)<r+4&&Math.abs(c.z-z)<r+4)buf.push(c.col);}};
 return {cars,pool,lanes,fill:()=>{filled=false;}};}

// светофоры: столбы + секции, фазы по времени
function addSignals(ctx,only){const lanes=buildLanes();const s=ctx.scene;const heads=[];const seen=new Set();
 for(const ln of lanes){for(const st of ln.stops){if(only&&!only(st.sg))continue;const key=st.sg.i+':'+ln.ci+':'+(ln.P[0][0]<ln.P[ln.P.length-1][0]?1:0)+(ln.bus?'b':'');if(seen.has(key))continue;seen.add(key);
  // крайняя правая полоса этого направления
  const q=samplePL(ln.P,ln.S,st.s);const fx=q[2],fz=q[3];const rx=-fz,rz=fx;const sameDir=lanes.filter(l=>l.ci===ln.ci&&((l.P[0][0]<l.P[l.P.length-1][0])===(ln.P[0][0]<ln.P[ln.P.length-1][0])));const nR=sameDir.length?Math.max(...sameDir.map(l=>l.idx)):ln.idx;const dR=(nR-ln.idx+0.5)*3.25+1.3;
  heads.push({x:q[0]+rx*dR,z:q[1]+rz*dR,h:Math.atan2(-fx,-fz),sg:st.sg,grp:st.grp});}}
 if(!heads.length)return null;
 const pole=new T.CylinderGeometry(0.07,0.09,3.3,8,1,true);pole.translate(0,1.65,0);const hous=new T.BoxGeometry(0.34,0.98,0.26);hous.translate(0,2.95,0.12);const visor=new T.BoxGeometry(0.4,0.04,0.2);const vs=[];for(let i=0;i<3;i++){const v=visor.clone();v.translate(0,3.3-i*0.3,0.3);vs.push(v.toNonIndexed());}
 const body=T.BufferGeometryUtils.mergeBufferGeometries([pole.toNonIndexed(),hous.toNonIndexed(),...vs]);
 const metal=smogMat(new T.MeshStandardMaterial({color:C('#1d1f22'),roughness:0.6,metalness:0.4}),{key:'sigm'});
 const lens=[0,1,2].map(i=>{const g=new T.CircleGeometry(0.1,14);g.translate(0,3.25-i*0.3,0.255);return g;});
 const lensMat=new T.MeshBasicMaterial({color:0xffffff,toneMapped:false,fog:true});
 const dm=new T.Object3D();const bm=new T.InstancedMesh(body,metal,heads.length);bm.castShadow=true;bm.frustumCulled=false;s.add(bm);
 const lm=lens.map(g=>{const m=new T.InstancedMesh(g,lensMat,heads.length);m.frustumCulled=false;m.setColorAt(0,new T.Color());s.add(m);return m;});
 heads.forEach((hd,i)=>{dm.position.set(hd.x,0,hd.z);dm.rotation.set(0,hd.h,0);dm.updateMatrix();bm.setMatrixAt(i,dm.matrix);lm.forEach(m=>m.setMatrixAt(i,dm.matrix));ctx.addCollider({t:'c',x:hd.x,z:hd.z,r:0.18});});
 const cols=[C('#ff2a1a').multiplyScalar(4.5),C('#ffb020').multiplyScalar(4),C('#30ff9a').multiplyScalar(3.6)],off=new T.Color(0.02,0.02,0.02);
 const glowG=new T.BufferGeometry();const gp=new Float32Array(heads.length*3),gc=new Float32Array(heads.length*3);glowG.setAttribute('position',new T.BufferAttribute(gp,3));glowG.setAttribute('color',new T.BufferAttribute(gc,3));
 const gpts=new T.Points(glowG,new T.PointsMaterial({size:1.5,vertexColors:true,map:L.glowTex,transparent:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false,fog:true}));gpts.frustumCulled=false;s.add(gpts);
 let lastQ=-1;
 ctx.ticks.push((t)=>{const q=Math.floor(t*4);if(q===lastQ)return;lastQ=q;heads.forEach((hd,i)=>{const ph=sigState(hd.sg,hd.grp,t);for(let k=0;k<3;k++)lm[k].setColorAt(i,(ph===2&&k===0)||(ph===1&&k===1)||(ph===0&&k===2)?cols[k]:off);
   const y=3.25-(ph===2?0:ph===1?0.3:0.6);gp.set([hd.x+Math.sin(hd.h)*0.3,y,hd.z+Math.cos(hd.h)*0.3],i*3);const c=cols[ph===2?0:ph===1?1:2];gc.set([c.r*0.12,c.g*0.12,c.b*0.12],i*3);});
  lm.forEach(m=>m.instanceColor.needsUpdate=true);glowG.attributes.position.needsUpdate=glowG.attributes.color.needsUpdate=true;});
 return heads;}

// ---------------- достопримечательности ----------------
const LM={};
// группа, выровненная по сетке улиц, с мировыми координатами центра
function gridGroup(x,z,extraRot){const g=new T.Group();g.position.set(x,0,z);g.rotation.y=CITY.geo().rot+(extraRot||0);return g;}
// стена с «пролётами» (текстура из canvas; u — метры/ширина пролёта)
function bayTex(o){return canvasTex(256,512,(x,w,h)=>{x.fillStyle=o.wall;x.fillRect(0,0,w,h);const r=rng(o.seed||3);
 for(let i=0;i<900;i++){x.fillStyle=`rgba(${r()<0.5?0:255},${r()<0.5?0:240},${r()<0.5?0:220},${0.03})`;x.fillRect(r()*w,r()*h,2+r()*6,2+r()*6);}
 x.fillStyle=o.trim;x.fillRect(0,0,26,h);x.fillRect(w-26,0,26,h);x.fillRect(0,h-40,w,40);x.fillRect(0,0,w,22);x.fillRect(0,196,w,14);
 if(o.pink){x.fillStyle=o.pink;x.fillRect(26,h-52,w-52,12);x.fillRect(26,22,w-52,10);}
 const win=(y0,y1,ww)=>{const cx=w/2;x.fillStyle=o.trim;x.beginPath();x.moveTo(cx-ww/2-12,y1);x.lineTo(cx-ww/2-12,y0+ww/2);x.arc(cx,y0+ww/2,ww/2+12,PI,0);x.lineTo(cx+ww/2+12,y1);x.closePath();x.fill();
  x.fillStyle=o.glass;x.beginPath();x.moveTo(cx-ww/2,y1);x.lineTo(cx-ww/2,y0+ww/2);x.arc(cx,y0+ww/2,ww/2,PI,0);x.lineTo(cx+ww/2,y1);x.closePath();x.fill();
  x.strokeStyle=o.trim;x.lineWidth=5;x.beginPath();x.moveTo(cx,y0+6);x.lineTo(cx,y1);x.moveTo(cx-ww/2,(y0+y1)/2+10);x.lineTo(cx+ww/2,(y0+y1)/2+10);x.stroke();};
 win(250,440,70);win(60,180,56);
 x.fillStyle='rgba(0,0,0,.18)';for(let i=0;i<30;i++)x.fillRect(r()*w,h-40-r()*120,3,40+r()*80);},true,[1,1]);}
function wallQuad(gb,ax,az,bx,bz,y0,y1,uW,vH){const ex=bx-ax,ez=bz-az;const len=Math.hypot(ex,ez);const nx=ez/len,nz=-ex/len;const b=gb.n;
 gb.v({position:[ax,y0,az],normal:[nx,0,nz],uv:[0,y0/vH]});gb.v({position:[bx,y0,bz],normal:[nx,0,nz],uv:[len/uW,y0/vH]});gb.v({position:[bx,y1,bz],normal:[nx,0,nz],uv:[len/uW,y1/vH]});gb.v({position:[ax,y1,az],normal:[nx,0,nz],uv:[0,y1/vH]});gb.t(b,b+2,b+1);gb.t(b,b+3,b+2);}
function prism(gb,pts,y0,y1,uW,vH,cap){// многоугольник против часовой (x,z «математически»)
 for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length];wallQuad(gb,a[0],a[1],b[0],b[1],y0,y1,uW,vH);}
 if(cap){const v2=pts.map(p=>new T.Vector2(p[0],p[1]));const f=T.ShapeUtils.triangulateShape(v2,[]);const b=gb.n;v2.forEach(p=>gb.v({position:[p.x,y1,p.y],normal:[0,1,0],uv:[p.x/uW,p.y/uW]}));f.forEach(t=>{const a=v2[t[0]],bb=v2[t[1]],c=v2[t[2]];const cr=(bb.x-a.x)*(c.y-a.y)-(bb.y-a.y)*(c.x-a.x);if(cr>0)gb.t(b+t[0],b+t[2],b+t[1]);else gb.t(b+t[0],b+t[1],b+t[2]);});}}
const rect=(x0,z0,x1,z1)=>[[x0,z0],[x1,z0],[x1,z1],[x0,z1]];// против часовой в осях (x,z): нормали wallQuad наружу
function gable(gb,x0,z0,x1,z1,y,h,alongX){// двускатная крыша
 const P=(x,yy,z)=>[x,yy,z];let A,B,Cc,Dd,R0,R1;if(alongX){const zc=(z0+z1)/2;A=P(x0,y,z0);B=P(x1,y,z0);Cc=P(x1,y,z1);Dd=P(x0,y,z1);R0=P(x0,y+h,zc);R1=P(x1,y+h,zc);}else{const xc=(x0+x1)/2;A=P(x1,y,z0);B=P(x1,y,z1);Cc=P(x0,y,z1);Dd=P(x0,y,z0);R0=P(xc,y+h,z0);R1=P(xc,y+h,z1);}
 const quad=(a,b,c,d)=>{const e1=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],e2=[d[0]-a[0],d[1]-a[1],d[2]-a[2]];let n=[e1[1]*e2[2]-e1[2]*e2[1],e1[2]*e2[0]-e1[0]*e2[2],e1[0]*e2[1]-e1[1]*e2[0]];const l=Math.hypot(...n);n=n.map(v=>v/l);const flip=n[1]<0;if(flip)n=n.map(v=>-v);const i=gb.n;[a,b,c,d].forEach((p,k)=>gb.v({position:p,normal:n,uv:[k===1||k===2?1:0,k>1?1:0]}));if(flip){gb.t(i,i+2,i+1);gb.t(i,i+3,i+2);}else{gb.t(i,i+1,i+2);gb.t(i,i+2,i+3);}};
 quad(A,B,R1,R0);quad(Cc,Dd,R0,R1);
 const tri=(a,b,c)=>{const e1=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],e2=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];let n=[e1[1]*e2[2]-e1[2]*e2[1],e1[2]*e2[0]-e1[0]*e2[2],e1[0]*e2[1]-e1[1]*e2[0]];const l=Math.hypot(...n)||1;n=n.map(v=>v/l);const i=gb.n;[a,b,c].forEach(p=>gb.v({position:p,normal:n,uv:[0,0]}));gb.t(i,i+1,i+2);};
 tri(B,Cc,R1);tri(Dd,A,R0);tri(Cc,B,R1);tri(A,Dd,R0);}
function onion(r,h,seg){const pts=[[1.0,0],[1.1,0.1],[1.2,0.26],[1.18,0.42],[1.02,0.58],[0.72,0.76],[0.42,0.9],[0.2,1.02],[0.08,1.12],[0.03,1.22],[0,1.26]].map(q=>new T.Vector2(q[0]*r,q[1]*h/1.26));return new T.LatheGeometry(pts,seg||20);}
function cross3(mat,s){const g=new T.Group();g.add(box(0.12*s,2.4*s,0.12*s,mat,0,1.2*s,0),box(1.1*s,0.1*s,0.1*s,mat,0,1.75*s,0),box(0.7*s,0.08*s,0.08*s,mat,0,2.1*s,0));const sl=box(0.8*s,0.08*s,0.08*s,mat,0,0.8*s,0);sl.rotation.z=-0.35;g.add(sl);return g;}
function cathedral(ctx){const s=ctx.scene;const G=gridGroup(802.6,345.1,0);
 const wall=smogMat(new T.MeshStandardMaterial({map:bayTex({wall:'#d9c08c',trim:'#ece5d6',pink:'#cf958e',glass:'#2b2620',seed:4}),roughness:0.85}),{key:'cath'});wall.map.wrapS=wall.map.wrapT=T.RepeatWrapping;
 const trim=smogMat(new T.MeshStandardMaterial({color:C('#efe8da'),roughness:0.7}),{key:'ctrim'});
 const roof=smogMat(new T.MeshStandardMaterial({color:C('#7f9a8b'),roughness:0.5,metalness:0.35}),{key:'croof'});
 const gold=new T.MeshPhysicalMaterial({color:C('#c9a24a'),roughness:0.28,metalness:1,clearcoat:0.5});
 const blue=smogMat(new T.MeshStandardMaterial({color:C('#3f5f94'),roughness:0.45,metalness:0.5}),{key:'cblue'});const green=smogMat(new T.MeshStandardMaterial({color:C('#4f8566'),roughness:0.45,metalness:0.5}),{key:'cgreen'});
 const gb=new GB({position:3,normal:3,uv:2});
 // основной объём (крест), нартекс, колокольня (метры: x — ось запад→восток)
 prism(gb,rect(-5,-10,24,10),0,13,3.4,13.5,false);prism(gb,rect(3.5,-14.8,15.5,14.8),0,13,3.4,13.5,false);prism(gb,rect(-28,-7.8,-5,7.8),0,11,3.4,13.5,false);
 prism(gb,rect(-28.5,-5.5,-17.5,5.5),0,22,3.4,13.5,false);
 const apse=[];for(let i=0;i<=8;i++){const a=-PI/2+i/8*PI;apse.push([24+Math.cos(a)*6.5,Math.sin(a)*6.5]);}apse.push([24,-6.5]);
 for(let i=0;i<8;i++)wallQuad(gb,apse[i][0],apse[i][1],apse[i+1][0],apse[i+1][1],0,11,3.4,13.5);
 const walls=new T.Mesh(gb.geo(),wall);walls.castShadow=walls.receiveShadow=true;G.add(walls);
 // крыши
 const rg=new GB({position:3,normal:3,uv:2});gable(rg,-5.5,-10.5,24,10.5,13,4.2,true);gable(rg,3,-15.3,16,15.3,13,4.6,false);gable(rg,-28,-8.3,-5,8.3,11,3.6,true);
 const rf=new T.Mesh(rg.geo(),roof);rf.castShadow=true;G.add(rf);
 const apR=new T.Mesh(new T.SphereGeometry(6.6,16,8,-PI/2,PI,0,PI/2),roof);apR.position.set(24,11,0);apR.scale.y=0.55;G.add(apR);
 // карнизы
 [[9.5,13,0,31,0.5,21.5],[9.5,13,0,13,0.5,30.4],[-16.5,11,0,23.5,0.45,16.4],[-23,22,0,11.8,0.6,11.8]].forEach(q=>G.add(box(q[3],q[4],q[5],trim,q[0],q[1],q[2])));
 // центральный барабан + главный купол
 const cylUV=(g,k)=>{const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setX(i,uv.getX(i)*k);return g;};
 const drum=new T.Mesh(cylUV(new T.CylinderGeometry(5.2,5.4,10,16,1,true),9),wall);drum.position.set(9.5,19.5,0);drum.material=wall;drum.castShadow=true;G.add(drum);
 G.add(cyl(5.6,5.6,0.6,16,trim,9.5,24.6,0));const d1=new T.Mesh(onion(5.4,9.5,24),gold);d1.position.set(9.5,24.9,0);d1.castShadow=true;G.add(d1);
 const c1=cross3(gold,1.3);c1.position.set(9.5,34.3,0);G.add(c1);
 // угловые башенки с маковками
 const cols=[green,blue,green,blue];[[-2,-10.8],[-2,10.8],[21,-10.8],[21,10.8]].forEach((q,i)=>{const tw=box(3.6,7,3.6,wall,q[0],15.5,q[1]);G.add(tw);G.add(box(4,0.35,4,trim,q[0],19.1,q[1]));G.add(new T.Mesh(cylUV(new T.CylinderGeometry(1.7,1.7,4,10,1,true),4),wall).translateX(q[0]).translateY(20.5).translateZ(q[1]));const d=new T.Mesh(onion(1.9,3.6,16),cols[i]);d.position.set(q[0],22.5,q[1]);G.add(d);const c=cross3(gold,0.55);c.position.set(q[0],26,q[1]);G.add(c);});
 // колокольня: ярусы
 G.add(box(11.4,0.6,11.4,trim,-23,22.3,0));const t1=new T.Mesh(cylUV(new T.CylinderGeometry(4.2,4.6,8,8,1,true),8),wall);t1.position.set(-23,26.6,0);G.add(t1);G.add(cyl(4.6,4.6,0.5,8,trim,-23,30.8,0));
 const t2=new T.Mesh(cylUV(new T.CylinderGeometry(2.9,3.2,6,8,1,true),6),wall);t2.position.set(-23,34,0);G.add(t2);G.add(cyl(3.3,3.3,0.4,8,trim,-23,37.1,0));
 const tent=new T.Mesh(new T.ConeGeometry(3.1,7,8,1,true),roof);tent.position.set(-23,40.8,0);G.add(tent);const d2=new T.Mesh(onion(1.4,3.4,16),gold);d2.position.set(-23,43.8,0);G.add(d2);const c2=cross3(gold,1.1);c2.position.set(-23,47.1,0);G.add(c2);
 // входной портал
 const por=box(3.4,6,7.4,trim,-29.6,3,0);G.add(por);const pr=new T.Mesh(new T.CylinderGeometry(3.7,3.7,3.4,16,1,false,0,PI),roof);pr.rotation.set(0,0,PI/2);pr.position.set(-29.6,6,0);G.add(pr);
 const door=new T.Mesh(new T.PlaneGeometry(2.6,4.2),new T.MeshStandardMaterial({color:C('#3a2618'),roughness:0.7}));door.rotation.y=-PI/2;door.position.set(-31.35,2.1,0);G.add(door);
 // тёплый свет в окнах
 const lit=new T.PointLight(C('#ffbb77'),0.8,26,1.6);lit.position.set(9.5,6,0);G.add(lit);
 G.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});s.add(G);G.updateMatrixWorld(true);
 // коллайдер — контур из OSM
 const P=[775.1,348.5,775.8,356.2,783.8,355.5,798.5,354.3,799,360.4,813.3,359.3,829.5,357.9,830.6,352.2,829.2,334.9,827.4,335,827,329.8,796.8,332.3,797.4,338.9,774.5,340.8];ctx.addCollider({t:'p',pts:P,h:40});
 return G;}
function bronzeTex(kind){const cv=document.createElement('canvas');cv.width=cv.height=512;const ctx2=cv.getContext('2d',{willReadFrequently:true});const draw=((x,w,h)=>{x.fillStyle='#808080';x.fillRect(0,0,w,h);const r=rng(kind*7+1);
 const fig=(cx,base,s,arm,lean)=>{x.save();x.translate(cx,base);x.rotate(lean||0);x.fillStyle='#e0e0e0';x.beginPath();x.ellipse(0,-150*s,18*s,22*s,0,0,7);x.fill();x.fillRect(-26*s,-130*s,52*s,90*s);x.beginPath();x.moveTo(-30*s,-40*s);x.lineTo(30*s,-40*s);x.lineTo(24*s,40*s);x.lineTo(-24*s,40*s);x.fill();
  x.fillRect(-22*s,40*s,16*s,70*s);x.fillRect(6*s,40*s,16*s,70*s);x.lineWidth=14*s;x.strokeStyle='#e0e0e0';x.beginPath();x.moveTo(-24*s,-120*s);x.lineTo(-40*s-arm*20*s,-60*s-arm*110*s);x.stroke();x.beginPath();x.moveTo(24*s,-120*s);x.lineTo(44*s,-60*s);x.stroke();x.restore();};
 if(kind===0){for(let i=0;i<5;i++)fig(80+i*90,440,1.35,i%2,(i-2)*0.05);x.fillStyle='#cfcfcf';x.beginPath();x.moveTo(256,40);x.lineTo(300,150);x.lineTo(212,150);x.fill();}
 else if(kind===1){for(let i=0;i<3;i++)fig(120+i*140,440,1.5,1,-0.15);x.strokeStyle='#d8d8d8';x.lineWidth=18;for(let i=0;i<4;i++){x.beginPath();x.moveTo(60+i*110,300);x.lineTo(160+i*110,60);x.stroke();}}
 else{for(let i=0;i<4;i++){x.fillStyle='#d8d8d8';x.beginPath();x.moveTo(80+i*100,440);x.lineTo(110+i*100,440);x.lineTo(150+i*100,60);x.lineTo(170+i*100,40);x.lineTo(160+i*100,90);x.closePath();x.fill();x.beginPath();x.ellipse(165+i*100,50,26,18,0.4,0,7);x.fill();}fig(420,440,1.2,1,0);}
 const im=x.getImageData(0,0,w,h);// лёгкое размытие + шум
 for(let i=0;i<im.data.length;i+=4){const n=(r()-0.5)*18;im.data[i]=im.data[i+1]=im.data[i+2]=Math.max(0,Math.min(255,im.data[i]+n));}x.putImageData(im,0,0);x.filter='blur(3px)';x.drawImage(x.canvas,0,0);});draw(ctx2,512,512);return {image:cv};}
function bronzeMaps(k){const h=bronzeTex(k);const src=h.image;const W=src.width,H=src.height;const d=src.getContext('2d',{willReadFrequently:true}).getImageData(0,0,W,H).data;
 const nc=document.createElement('canvas');nc.width=W;nc.height=H;const nx=nc.getContext('2d');const nd=nx.createImageData(W,H);const cc=document.createElement('canvas');cc.width=W;cc.height=H;const cx=cc.getContext('2d');const cd=cx.createImageData(W,H);
 const hv=(x,y)=>d[((Math.min(H-1,Math.max(0,y)))*W+Math.min(W-1,Math.max(0,x)))*4]/255;
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){const dx=(hv(x+1,y)-hv(x-1,y))*6,dy=(hv(x,y+1)-hv(x,y-1))*6;const l=Math.hypot(dx,dy,1);const i=(y*W+x)*4;nd.data[i]=(-dx/l*0.5+0.5)*255;nd.data[i+1]=(dy/l*0.5+0.5)*255;nd.data[i+2]=(1/l*0.5+0.5)*255;nd.data[i+3]=255;
  const hgt=hv(x,y);const edge=Math.min(1,Math.hypot(dx,dy)*0.4);const t=Math.min(1,hgt*1.2);cd.data[i]=(58+t*40+edge*50);cd.data[i+1]=(48+t*28+edge*40)-(1-t)*4;cd.data[i+2]=(36+t*16+edge*24)+(1-t)*6;cd.data[i+3]=255;}
 nx.putImageData(nd,0,0);cx.putImageData(cd,0,0);const nt=new T.CanvasTexture(nc);const ct=new T.CanvasTexture(cc);ct.encoding=T.sRGBEncoding;return {map:ct,normalMap:nt};}
function memorial(ctx){const s=ctx.scene;const G=gridGroup(976,331.5,0);
 const granite=smogMat(new T.MeshStandardMaterial({color:C('#141212'),roughness:0.85,metalness:0.02}),{key:'gran'});const granR=smogMat(new T.MeshStandardMaterial({color:C('#5a3a32'),roughness:0.5}),{key:'granr'});
 const bronze=(k)=>{const q=bronzeMaps(k);return smogMat(new T.MeshStandardMaterial({map:q.map,normalMap:q.normalMap,normalScale:new T.Vector2(1.6,1.6),roughness:0.7,metalness:0.5,color:C('#5a4c3c')}),{key:'bronze'});};
 G.add(box(18,0.5,38,granite,2,0.25,0),box(15,0.5,35,granite,1,0.75,0));
 const mid=box(3,13,15,granite,-1,7.5,0);G.add(mid);const f0=new T.Mesh(new T.PlaneGeometry(14,11.5),bronze(0));f0.rotation.y=PI/2;f0.position.set(0.52,7.4,0);G.add(f0);
 const lb=box(3,9.5,10,granite,-0.2,5.75,-13);lb.rotation.y=-0.28;G.add(lb);const f1=new T.Mesh(new T.PlaneGeometry(9,8),bronze(1));f1.rotation.y=PI/2-0.28;f1.position.set(1.33,5.6,-12.62);G.add(f1);
 const rb=box(3,9.5,10,granite,-0.2,5.75,13);rb.rotation.y=0.28;G.add(rb);const f2=new T.Mesh(new T.PlaneGeometry(9,8),bronze(2));f2.rotation.y=PI/2+0.28;f2.position.set(1.33,5.6,12.62);G.add(f2);
 // звезда с вечным огнём
 const st=new T.Shape();for(let i=0;i<10;i++){const a=i/10*TAU-PI/2,rr=i%2?1.6:3.6;const px=Math.cos(a)*rr,py=Math.sin(a)*rr;i?st.lineTo(px,py):st.moveTo(px,py);}
 const star=new T.Mesh(new T.ExtrudeGeometry(st,{depth:0.35,bevelEnabled:false}),granR);star.rotation.x=-PI/2;star.position.set(16,0.02,0);G.add(star);G.add(cyl(0.7,0.9,0.4,16,granite,16,0.55,0));
 G.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});s.add(G);G.updateMatrixWorld(true);
 const fp=new T.Vector3(16,0.75,0).applyMatrix4(G.matrixWorld);L.fire(ctx,fp.x,fp.y,fp.z,2.2);const fl=L.pointL(ctx,'#ff9a3a',2.2,14,fp.x,fp.y+1,fp.z,1.4);
 ctx.ticks.push(t=>{fl.intensity=2+Math.sin(t*13)*0.3+Math.sin(t*7.1)*0.25;});
 // коллайдеры
 const pc=new T.Vector3(-1,0,0).applyMatrix4(G.matrixWorld);ctx.addCollider({t:'b',x:pc.x,z:pc.z,w:4,d:38,ry:-CITY.geo().rot});ctx.addCollider({t:'c',x:fp.x,z:fp.z,r:1.4});
 ctx.anchors.flame=fp.clone();return G;}
// Зелёный базар: главный павильон + двор с контейнерами
function signTex(lines,o){o=Object.assign({w:1024,h:256,bg:'#10261c',fg:'#e8f3e6',font:'800 120px "Exo 2", Arial'},o);return canvasTex(o.w,o.h,(x,w,h)=>{x.fillStyle=o.bg;x.fillRect(0,0,w,h);if(o.border){x.strokeStyle=o.border;x.lineWidth=8;x.strokeRect(10,10,w-20,h-20);}x.fillStyle=o.fg;x.textAlign='center';x.textBaseline='middle';
 lines.forEach((l,i)=>{x.font=l.font||o.font;x.fillStyle=l.c||o.fg;x.fillText(l.t,w/2+(l.dx||0),l.y!==undefined?l.y*h:h*(i+1)/(lines.length+1));});},true);}
function bazaar(ctx){const s=ctx.scene;const G=gridGroup(965,-166,0);ctx._bazaar=G;
 const W=90,D=62,H=14;
 const facade=smogMat(new T.MeshStandardMaterial({color:C('#cfc3a8'),roughness:0.8}),{key:'bzw',fDecl:NZ,map:`{float y=vSWP.y;float n=nz2(vSWP.xz*0.2+y*0.1);vec3 c=diffuseColor.rgb*(0.85+0.25*n);float band=smoothstep(7.2,7.4,y)*smoothstep(9.2,9.0,y);c=mix(c,vec3(0.05,0.2,0.12),band);float pan=smoothstep(0.04,0.0,abs(fract((vSWP.x+vSWP.z)/3.0)-0.5)-0.47);c*=1.0-0.2*pan*step(9.2,y);c*=mix(0.6,1.0,smoothstep(0.0,1.5,y));diffuseColor.rgb=c;}`});
 const glassM=new T.MeshPhysicalMaterial({color:C('#1c2a26'),roughness:0.08,metalness:0.3,clearcoat:1,emissive:C('#ffcf8a'),emissiveIntensity:0.22});
 const steel=smogMat(new T.MeshStandardMaterial({color:C('#1e4a33'),roughness:0.45,metalness:0.6}),{key:'bzs'});
 const roofM=smogMat(new T.MeshStandardMaterial({color:C('#5a5e5c'),roughness:0.7,metalness:0.3}),{key:'bzr'});
 const skyl=new T.MeshPhysicalMaterial({color:C('#3f6e5a'),roughness:0.15,metalness:0.2,transparent:true,opacity:0.85,emissive:C('#ffd9a0'),emissiveIntensity:0.08});
 // корпус
 const body=box(W,H,D,facade,0,H/2,0);G.add(body);G.add(box(W+1.2,0.6,D+1.2,steel,0,H+0.3,0));
 // витражи первого этажа по периметру
 for(const sd of [-1,1]){const gl=new T.Mesh(new T.PlaneGeometry(W-6,5.2),glassM);gl.position.set(0,3.2,sd*(D/2+0.03));if(sd<0)gl.rotation.y=PI;G.add(gl);const gs=new T.Mesh(new T.PlaneGeometry(D-6,5.2),glassM);gs.rotation.y=sd*PI/2;gs.position.set(sd*(W/2+0.03),3.2,0);G.add(gs);}
 for(let i=-14;i<=14;i++)G.add(box(0.18,5.4,0.3,steel,i*3.05,3.2,D/2+0.12));
 // главный вход (юг): высокий витраж в зелёной раме + вывеска
 const portal=new T.Group();portal.position.set(-12,0,D/2);G.add(portal);
 portal.add(box(22,0.8,3,steel,0,13.2,1.4),box(0.8,13.6,3,steel,-11,6.8,1.4),box(0.8,13.6,3,steel,11,6.8,1.4));
 const pg=new T.Mesh(new T.PlaneGeometry(21.2,12.8),glassM);pg.position.set(0,6.4,0.1);portal.add(pg);for(let i=-3;i<=3;i++)portal.add(box(0.16,12.8,0.25,steel,i*3.02,6.4,0.2));for(let j=1;j<4;j++)portal.add(box(21.2,0.14,0.25,steel,0,j*3.2,0.2));
 const sign=new T.Mesh(new T.PlaneGeometry(26,4),new T.MeshBasicMaterial({map:signTex([{t:'ЗЕЛЁНЫЙ БАЗАР',font:'800 150px "Exo 2", Arial',c:'#dff5d8'}],{bg:'#0f2a1d',border:'#7fd39b'}),toneMapped:false}));sign.material.color.setScalar(1.6);sign.position.set(0,16.4,1.2);portal.add(sign);
 portal.add(box(27,4.6,0.6,steel,0,16.4,0.85));
 // навесы-козырьки над входами
 const can=box(14,0.3,5,steel,0,6.2,3.6);portal.add(can);
 // световые фонари на кровле (зубчатые)
 for(let i=0;i<6;i++){const g=new T.CylinderGeometry(2.6,2.6,D-8,3,1,false);const m=new T.Mesh(g,skyl);m.rotation.set(PI/2,0,0);m.position.set(-W/2+10+i*14,H+0.6+1.3,0);m.scale.set(1,1,0.6);G.add(m);}
 // вывески арендаторов по фасаду
 const shops=['ОВОЩИ · ФРУКТЫ','МЯСНОЙ РЯД','СУХОФРУКТЫ','МОЛОЧНЫЙ РЯД','КОРЕЙСКИЕ САЛАТЫ','СПЕЦИИ'];shops.forEach((t,i)=>{const m=new T.Mesh(new T.PlaneGeometry(9,1.3),new T.MeshBasicMaterial({map:signTex([{t,font:'700 88px "Exo 2", Arial'}],{w:1024,h:150,bg:i%2?'#1d3a2a':'#3a2a12',fg:i%2?'#d8f0d0':'#ffd9a0'}),toneMapped:false}));m.material.color.setScalar(1.25);m.position.set(8+i%3*12,6.6,D/2+0.2);if(i>=3){m.position.set(-W/2-0.2,6.6,-18+(i-3)*14);m.rotation.y=-PI/2;}G.add(m);});
 G.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});s.add(G);G.updateMatrixWorld(true);
 // тёплый свет изнутри через вход
 const wp=new T.Vector3(-12,5,D/2+2).applyMatrix4(G.matrixWorld);L.pointL(ctx,'#ffc98a',1.6,22,wp.x,wp.y,wp.z,0);
 // коллайдер корпуса
 const cs=[[-W/2,-D/2],[W/2,-D/2],[W/2,D/2],[-W/2,D/2]].map(q=>new T.Vector3(q[0],0,q[1]).applyMatrix4(G.matrixWorld));const pts=[];cs.reverse().forEach(v=>pts.push(v.x,v.z));ctx.addCollider({t:'p',pts,h:H});
 return G;}
function awningStall(mat,col,w){const g=new T.Group();const fr=smogMat(new T.MeshStandardMaterial({color:C('#3a3f44'),metalness:0.6,roughness:0.5}),{key:'stallfr'});
 [[-w/2,-1.1],[w/2,-1.1],[-w/2,1.1],[w/2,1.1]].forEach(q=>g.add(box(0.07,2.3,0.07,fr,q[0],1.15,q[1])));const aw=new T.Mesh(new T.PlaneGeometry(w+0.4,2.8),new T.MeshStandardMaterial({color:C(col),roughness:0.8,side:T.DoubleSide}));aw.rotation.x=-PI/2+0.25;aw.position.set(0,2.35,0.2);g.add(aw);
 g.add(box(w,0.8,1.0,mat,0,0.4,-0.4));const fruit=['#c0392b','#e67e22','#f1c40f','#27ae60','#8e44ad','#d35400'];const r=rng(w*13|0);for(let i=0;i<Math.floor(w*2);i++)g.add(box(0.36,0.2,0.3,std({color:fruit[(r()*6)|0],roughness:0.7}),-w/2+0.3+i*0.5,0.9,-0.4+(r()-0.5)*0.4));return g;}
function containerMesh(col,len){len=len||6.06;const g=new T.Group();const m=std({map:L.rustTex(col,len*10|0),bumpMap:L.corrTex,bumpScale:0.05,roughness:0.6,metalness:0.45});g.add(box(len,2.6,2.44,m,0,1.3,0));g.userData.mat=m;return g;}
function yard(ctx){// двор за базаром: контейнеры, шашлык, ковры, мастерская «Ремонт андроидов»
 const s=ctx.scene;const G=gridGroup(958,-266,0);const r=rng(12);
 const cols=['#2c4a6a','#7a2a22','#35553a','#8a6a2a','#4a4a52','#6a3a1a','#2a5a5a'];
 const place=(x,z,ry,col,len)=>{const c=containerMesh(col,len);c.position.set(x,0,z);c.rotation.y=ry;G.add(c);return c;};
 for(let i=0;i<5;i++)place(-52+i*7.2,6,0,cols[i%cols.length]);for(let i=0;i<4;i++)place(28+i*7.2,6,0,cols[(i+3)%cols.length]);
 for(let i=0;i<3;i++){place(-44+i*6.6,-8,0,cols[(i+2)%cols.length]);}for(let i=0;i<4;i++)place(22+i*6.6,-8,0,cols[(i+5)%cols.length]);
 for(let i=0;i<6;i++){if(i===2)continue;const c=place(-48+i*9.5,22,0,cols[(i+1)%cols.length]);if(r()<0.5){const c2=place(-48+i*9.5,22,0,cols[(i+4)%cols.length]);c2.position.y=2.6;}}
 for(let i=0;i<3;i++)place(-60,-4+i*6.5,PI/2,cols[(i+6)%cols.length]);for(let i=0;i<3;i++)place(58,-4+i*6.5,PI/2,cols[i%cols.length]);
 // мастерская
 const shop=place(6,-2,0,'#2e4f73');ctx._repair=shop;shop.userData.keep=false;
 const doorM=std({color:'#24405e',roughness:0.6,metalness:0.4});const d1=box(1.2,2.4,0.06,doorM,-3.6,1.3,1.9);d1.rotation.y=-1.2;shop.add(d1);const d2=box(1.2,2.4,0.06,doorM,3.6,1.3,1.9);d2.rotation.y=1.2;shop.add(d2);
 const inT=canvasTex(512,256,(x,w,h)=>{const g=x.createRadialGradient(w*0.5,20,10,w*0.5,60,300);g.addColorStop(0,'#8a5a30');g.addColorStop(0.5,'#3a2616');g.addColorStop(1,'#140d08');x.fillStyle=g;x.fillRect(0,0,w,h);
  x.fillStyle='#0c0806';for(let i=0;i<3;i++)x.fillRect(20,70+i*60,160,6);for(let i=0;i<3;i++)x.fillRect(330,60+i*58,170,6);const r=rng(4);for(let i=0;i<26;i++){x.fillStyle=['#2a2e33','#3a2a1a','#44484e','#1a1c20'][i%4];const sx=i<13?24+r()*140:334+r()*150,sy=(i<13?70:60)+((i%3)*60)-14-r()*20;x.fillRect(sx,sy,10+r()*22,12+r()*18);}
  x.fillStyle='#d8dde2';x.beginPath();x.ellipse(250,120,34,40,0,0,7);x.fill();x.fillStyle='#1a1c20';x.fillRect(222,112,56,12);x.fillStyle='#4fd2ff';x.fillRect(262,114,10,6);x.fillStyle='#c8ccd0';x.fillRect(236,160,28,60);
  x.strokeStyle='#0a0a0a';x.lineWidth=3;x.beginPath();x.moveTo(250,0);x.lineTo(250,60);x.stroke();x.fillStyle='#ffe0a0';x.beginPath();x.arc(250,64,7,0,7);x.fill();},true);
 const inner=new T.Mesh(new T.PlaneGeometry(5.7,2.4),new T.MeshBasicMaterial({map:inT,toneMapped:false,fog:true}));inner.material.color.setScalar(1.25);inner.position.set(0,1.3,1.215);shop.add(inner);
 const bench=box(2.2,0.9,0.8,std({color:'#3a3a3a',metalness:0.5}),-1.6,0.45,0.6);shop.add(bench);
 const sg=new T.Mesh(new T.PlaneGeometry(5.4,1.0),new T.MeshBasicMaterial({map:signTex([{t:'РЕМОНТ АНДРОИДОВ',font:'800 92px "Exo 2", Arial',y:0.38,c:'#ffe6b0'},{t:'БЕЗ ВОПРОСОВ',font:'600 60px "IBM Plex Mono", monospace',y:0.76,c:'#ff7a5a'}],{w:1024,h:200,bg:'#1a1410',border:'#ff9a4a'}),toneMapped:false}));sg.material.color.setScalar(1.4);sg.position.set(0,2.95,1.25);shop.add(sg);
 const bulb=glow('#ffc88a',0.9,0.9);bulb.position.set(0,2.5,1.6);shop.add(bulb);
 // ковры на верёвке и шашлычный контейнер с дымом
 for(let i=0;i<5;i++){const cp=new T.Mesh(new T.PlaneGeometry(1.6,2.6),std({map:L.ornamentTex(['#5a1216','#1d2e5a','#3a1a3a','#6a3a12','#12402a'][i],'#d8b060',i+2,[2,3]),roughness:1,side:T.DoubleSide}));cp.position.set(-30+i*1.8,1.6,-3.2);G.add(cp);}
 G.add(box(10,0.04,0.04,std({color:'#222'}),-26.4,2.95,-3.2));
 const kebab=place(-12,-1.5,0,'#6a2a1a');const grill=box(2.4,0.9,0.7,std({color:'#1a1a1a',metalness:0.6}),0,0.9,1.7);kebab.add(grill);
 const ksg=new T.Mesh(new T.PlaneGeometry(4.2,0.9),new T.MeshBasicMaterial({map:signTex([{t:'ШАШЛЫК · ЛАГМАН',font:'800 96px "Exo 2", Arial',c:'#ffd27a'}],{w:1024,h:200,bg:'#2a0e08'}),toneMapped:false}));ksg.material.color.setScalar(1.3);ksg.position.set(0,2.9,1.24);kebab.add(ksg);
 const wood=std({map:L.woodTex,color:'#8a7a60',roughness:0.9});const tire=std({color:'#141414',roughness:0.9});const blueM=std({color:'#2a4a6a',roughness:0.6,metalness:0.4});
 for(let i=0;i<9;i++){const x=-38+r()*70,z=-5+r()*9;if(Math.abs(x-6)<5&&z>-3)continue;const k=r();if(k<0.35){for(let j=0;j<1+(r()*4|0);j++)G.add(box(1.2,0.14,1.0,wood,x,0.07+j*0.15,z));}else if(k<0.65){for(let j=0;j<1+(r()*4|0);j++){const t=new T.Mesh(new T.TorusGeometry(0.34,0.13,6,14),tire);t.rotation.x=PI/2;t.position.set(x,0.13+j*0.26,z);G.add(t);}}else G.add(box(0.8+r()*0.6,0.5+r()*0.5,0.6+r()*0.4,std({color:['#6a5a3a','#4a4a46','#5a3a2a'][(r()*3)|0],roughness:0.85}),x,0.35,z));}
 const dump=box(1.9,1.3,1.1,blueM,-4,0.65,-3.6);G.add(dump);G.add(box(2.0,0.1,1.2,std({color:'#1a2a3a'}),-4,1.35,-3.7));
 // забор вдоль Макатаева
 const fenceM=std({color:'#3a3d40',metalness:0.6,roughness:0.5});for(let i=0;i<30;i++)G.add(box(0.06,1.8,0.06,fenceM,-60+i*4,0.9,-12));G.add(box(120,0.05,0.05,fenceM,0,1.7,-12),box(120,0.05,0.05,fenceM,0,0.3,-12));
 G.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});s.add(G);G.updateMatrixWorld(true);
 const kp=new T.Vector3(-12,1.4,0.3).applyMatrix4(G.matrixWorld);L.steam(ctx,kp.x,kp.y,kp.z,'#b8b0a4',0.9);L.steam(ctx,kp.x+0.8,kp.y,kp.z+0.3,'#a8a098',0.7);
 const lp=new T.Vector3(6,1.6,1.2).applyMatrix4(G.matrixWorld);L.pointL(ctx,'#ffb46a',1.6,9,lp.x,lp.y,lp.z,0);
 // коллайдеры контейнеров
 G.children.forEach(c=>{if(!c.isGroup)return;const p=new T.Vector3();c.getWorldPosition(p);ctx.addCollider({t:'b',x:p.x,z:p.z,w:6.1,d:2.5,ry:-(CITY.geo().rot+c.rotation.y)});});
 // рыночные ряды вдоль западной стороны павильона
 const st=gridGroup(906,-175,0);const cm=std({color:'#6a5a44',roughness:0.8});const acol=['#8a2a24','#1d4a7a','#2a6a3a','#8a6a1a','#6a2a5a'];
 for(let i=0;i<7;i++){const a=awningStall(cm,acol[i%5],3.2);a.position.set(i%2?3.2:-3.2,0,-26+i*8.2);a.rotation.y=i%2?-PI/2:PI/2;st.add(a);}
 st.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});s.add(st);st.updateMatrixWorld(true);
 st.children.forEach(c=>{const p=new T.Vector3();c.getWorldPosition(p);ctx.addCollider({t:'b',x:p.x,z:p.z,w:2.6,d:3.6,ry:-(CITY.geo().rot+c.rotation.y)});});
 return G;}
// рекламные щиты (выдуманные бренды) и табло качества воздуха
const ADS=[
 {k:'air',draw:(x,w,h)=>{const g=x.createLinearGradient(0,0,0,h);g.addColorStop(0,'#7fc7ff');g.addColorStop(1,'#e9f6ff');x.fillStyle=g;x.fillRect(0,0,w,h);x.fillStyle='rgba(255,255,255,.8)';for(let i=0;i<6;i++){x.beginPath();x.ellipse(120+i*170,90+(i%2)*40,90,26,0,0,7);x.fill();}
  x.fillStyle='#0d3b66';x.font='800 118px "Exo 2", Arial';x.textAlign='left';x.fillText('ВЕКТОР-ВОЗДУХ',50,250);x.font='500 60px "Exo 2", Arial';x.fillText('Дыши как в Верхнем городе',54,330);x.fillStyle='#ff5a3d';x.font='800 70px "Exo 2", Arial';x.fillText('от 15 000/мес',54,420);
  x.strokeStyle='#0d3b66';x.lineWidth=10;x.beginPath();x.arc(880,330,90,0,7);x.stroke();x.beginPath();x.moveTo(820,330);x.bezierCurveTo(850,280,910,380,940,330);x.stroke();}},
 {k:'clean',draw:(x,w,h)=>{x.fillStyle='#f4f7f2';x.fillRect(0,0,w,h);x.fillStyle='#1f7a45';x.fillRect(0,0,w,110);x.fillStyle='#fff';x.font='800 84px "Exo 2", Arial';x.textAlign='center';x.fillText('ЧИСТЫЙ ГОРОД',w/2,82);
  x.fillStyle='#1f7a45';x.font='600 58px "Exo 2", Arial';x.fillText('Порядок — это забота.',w/2,230);x.fillText('Нарушения фиксируют дроны.',w/2,305);x.font='500 44px "IBM Plex Mono", monospace';x.fillStyle='#3a5a48';x.fillText('ЗОНА КОНТРОЛЯ · 24/7',w/2,400);}},
 {k:'hor',draw:(x,w,h)=>{const g=x.createLinearGradient(0,0,0,h);g.addColorStop(0,'#ffcf8a');g.addColorStop(0.6,'#ffe9c8');g.addColorStop(1,'#8ac27a');x.fillStyle=g;x.fillRect(0,0,w,h);x.fillStyle='#6a8a9a';for(let i=0;i<5;i++)x.fillRect(560+i*80,160-i*14,60,300+i*14);x.fillStyle='#4f7a3a';for(let i=0;i<14;i++){x.beginPath();x.arc(520+i*36,440,26,0,7);x.fill();}
  x.fillStyle='#2a3a2a';x.textAlign='left';x.font='800 108px "Exo 2", Arial';x.fillText('ГОРИЗОНТ',40,150);x.font='600 54px "Exo 2", Arial';x.fillText('эко-квартал «Новый»',44,230);x.font='500 40px "Exo 2", Arial';x.fillText('воздух · тишина · горы',44,300);}},
 {k:'taxi',draw:(x,w,h)=>{x.fillStyle='#101418';x.fillRect(0,0,w,h);x.fillStyle='#f2f2ee';x.font='800 112px "Exo 2", Arial';x.textAlign='left';x.fillText('ВЕКТОР-ТАКСИ',40,170);x.fillStyle='#58c8f0';x.font='500 56px "Exo 2", Arial';x.fillText('Всегда в пути. Даже в пробке.',44,260);
  x.fillStyle='#f2f2ee';x.beginPath();x.moveTo(600,420);x.lineTo(650,340);x.lineTo(860,340);x.lineTo(930,400);x.lineTo(990,410);x.lineTo(990,440);x.lineTo(600,440);x.closePath();x.fill();x.fillStyle='#101418';x.beginPath();x.arc(680,440,34,0,7);x.arc(900,440,34,0,7);x.fill();}}];
// реклама ИИ: «Вектор-Пара» (партнёр-ассистент вместо живых знакомств) и «Вектор-Ассистент» (замена сотрудников)
ADS.push({k:'pair',draw:(x,w,h)=>{const g=x.createLinearGradient(0,0,w,h);g.addColorStop(0,'#2a0f2e');g.addColorStop(1,'#5a1a4a');x.fillStyle=g;x.fillRect(0,0,w,h);
  const heart=(cx,cy,s,a)=>{x.save();x.translate(cx,cy);x.scale(s,s);x.globalAlpha=a;x.beginPath();x.moveTo(0,30);x.bezierCurveTo(-60,-10,-30,-60,0,-28);x.bezierCurveTo(30,-60,60,-10,0,30);x.fill();x.restore();};
  x.fillStyle='#ff7ab8';heart(820,250,2.6,0.9);x.fillStyle='#ffd1e6';heart(900,150,0.9,0.6);heart(730,380,0.7,0.5);
  x.fillStyle='#fff0f7';x.textAlign='left';x.font='800 104px "Exo 2", Arial';x.fillText('ВЕКТОР-ПАРА',40,140);x.font='500 50px "Exo 2", Arial';x.fillText('Идеальный партнёр.',44,225);x.fillText('Всегда рядом. Никогда не уйдёт.',44,285);
  x.fillStyle='#ff7ab8';x.font='800 64px "Exo 2", Arial';x.fillText('97% совместимости',44,400);x.fillStyle='#d8a8c4';x.font='500 30px "IBM Plex Mono", monospace';x.fillText('ассистент напишет за вас · от 4 990/мес',44,460);}},
 {k:'assist',draw:(x,w,h)=>{x.fillStyle='#eef4f7';x.fillRect(0,0,w,h);x.fillStyle='#0d2a3a';x.fillRect(0,0,w,120);x.fillStyle='#6fd8f2';x.font='800 88px "Exo 2", Arial';x.textAlign='left';x.fillText('ВЕКТОР-АССИСТЕНТ',40,92);
  x.fillStyle='#0d2a3a';x.font='800 96px "Exo 2", Arial';x.fillText('−80% штата',40,245);x.font='500 48px "Exo 2", Arial';x.fillText('Ева работает 24/7.',44,320);x.fillText('Без отпусков, больничных и жалоб.',44,380);
  x.fillStyle='#3a6a80';x.font='500 30px "IBM Plex Mono", monospace';x.fillText('внедрение за 1 день · ревью кода не требуется',44,455);
  x.strokeStyle='#6fd8f2';x.lineWidth=10;x.beginPath();x.arc(890,300,80,0,7);x.stroke();x.fillStyle='#6fd8f2';x.beginPath();x.arc(890,300,26,0,7);x.fill();}});
const AD_T={};function adTex(k){if(AD_T[k])return AD_T[k];const a=ADS.find(q=>q.k===k);AD_T[k]=canvasTex(1024,512,a.draw,true);return AD_T[k];}
function billboard(ctx,x,z,ry,k,o){o=o||{};const s=ctx.scene;const g=new T.Group();g.position.set(x,0,z);g.rotation.y=ry;const H=o.h||5.2,Wd=o.w||7,Hh=o.hh||3.5;
 const metal=smogMat(new T.MeshStandardMaterial({color:C('#2a2d31'),roughness:0.5,metalness:0.6}),{key:'bbm'});
 g.add(cyl(0.22,0.26,H,10,metal,0,H/2,-0.2));g.add(box(Wd+0.4,Hh+0.4,0.35,metal,0,H+Hh/2,-0.2));
 const scr=new T.Mesh(new T.PlaneGeometry(Wd,Hh),new T.MeshBasicMaterial({map:adTex(k),toneMapped:false,fog:true}));scr.material.color.setScalar(o.bright||1.15);scr.position.set(0,H+Hh/2,0);g.add(scr);
 if(o.double){const b2=scr.clone();b2.rotation.y=PI;b2.position.z=-0.4;g.add(b2);}
 g.traverse(q=>{if(q.isMesh&&q!==scr){q.castShadow=true;}});s.add(g);ctx.addCollider({t:'c',x,z,r:0.35});
 const gl=glow('#fff4e0',Math.max(Wd,Hh)*1.3,0.18);gl.position.set(x+Math.sin(ry)*0.8,H+Hh/2,z+Math.cos(ry)*0.8);s.add(gl);return g;}
function aqiTex(tm){return canvasTex(512,768,(x,w,h)=>{x.fillStyle='#07090c';x.fillRect(0,0,w,h);x.strokeStyle='#3a3f46';x.lineWidth=10;x.strokeRect(5,5,w-10,h-10);
 x.fillStyle='#b8c2cc';x.font='600 44px "IBM Plex Mono", monospace';x.textAlign='center';x.fillText('КАЧЕСТВО ВОЗДУХА',w/2,70);x.fillStyle='#ff4a3d';x.font='800 64px "IBM Plex Mono", monospace';x.fillText('PM2.5',w/2,170);
 x.fillStyle='#c060ff';x.font='800 210px "IBM Plex Mono", monospace';x.fillText('263',w/2,380);x.fillStyle='#ff4a3d';x.fillRect(40,430,w-80,90);x.fillStyle='#07090c';x.font='800 58px "Exo 2", Arial';x.fillText('ОЧЕНЬ ВРЕДНО',w/2,493);
 x.fillStyle='#b8c2cc';x.font='500 34px "IBM Plex Mono", monospace';x.fillText('ВИДИМОСТЬ 300 М',w/2,590);x.fillText('НЕ ВЫХОДИТЕ БЕЗ МАСКИ',w/2,650);x.fillStyle='#58c8f0';x.fillText('ЧИСТЫЙ ГОРОД · '+(tm||'07:20'),w/2,720);},true);}
function aqiBoard(ctx,x,z,ry){const s=ctx.scene;const g=new T.Group();g.position.set(x,0,z);g.rotation.y=ry;const metal=smogMat(new T.MeshStandardMaterial({color:C('#23262a'),roughness:0.5,metalness:0.6}),{key:'aqim'});
 g.add(box(1.7,3.1,0.4,metal,0,2.3,0),box(0.3,0.9,0.3,metal,0,0.45,0));const t=aqiTex(ctx.mode==='drive'?'11:05':'07:20');const sc=new T.Mesh(new T.PlaneGeometry(1.5,2.25),new T.MeshBasicMaterial({map:t,toneMapped:false,fog:true}));sc.material.color.setScalar(1.35);sc.position.set(0,2.35,0.21);g.add(sc);const b2=sc.clone();b2.rotation.y=PI;b2.position.z=-0.21;g.add(b2);
 s.add(g);ctx.addCollider({t:'b',x,z,w:1.7,d:0.5,ry:-ry});const gl=glow('#c060ff',3.2,0.22);gl.position.set(x+Math.sin(ry)*0.4,2.4,z+Math.cos(ry)*0.4);s.add(gl);
 ctx.ticks.push(t=>{sc.material.color.setScalar(1.25+0.15*Math.sin(t*2.2));});return g;}
const KIOSK=['ШАУРМА','КОФЕ С СОБОЙ','ПРЕССА · ТАБАК','ЦВЕТЫ','РЕМОНТ ОБУВИ','СИМ-КАРТЫ','ЛОТЕРЕЯ','БАУРСАКИ · ЧАЙ','МАСКИ · ФИЛЬТРЫ'];
function kiosk(ctx,x,z,ry,label,col){const s=ctx.scene;const g=new T.Group();g.position.set(x,0,z);g.rotation.y=ry;
 const body=smogMat(new T.MeshStandardMaterial({color:C(col||'#d8d4c8'),roughness:0.6,metalness:0.3}),{key:'kb'});const win=new T.MeshStandardMaterial({color:C('#1a1a18'),roughness:0.1,metalness:0.3,emissive:C('#ffcf8a'),emissiveIntensity:0.55});
 g.add(box(2.6,2.5,2.0,body,0,1.25,0),box(2.9,0.18,2.3,body,0,2.6,0));const w=new T.Mesh(new T.PlaneGeometry(2.2,1.2),win);w.position.set(0,1.45,1.01);g.add(w);
 const sg=new T.Mesh(new T.PlaneGeometry(2.7,0.5),new T.MeshBasicMaterial({map:signTex([{t:label,font:'800 70px "Exo 2", Arial'}],{w:512,h:96,bg:'#16202a',fg:'#ffe2a8'}),toneMapped:false,fog:true}));sg.material.color.setScalar(1.3);sg.position.set(0,2.35,1.16);g.add(sg);
 g.traverse(q=>{if(q.isMesh){q.castShadow=true;q.receiveShadow=true;}});s.add(g);ctx.addCollider({t:'b',x,z,w:2.7,d:2.1,ry:-ry});return g;}
function busStop(ctx,x,z,ry,ad){const s=ctx.scene;const g=new T.Group();g.position.set(x,0,z);g.rotation.y=ry;const m=smogMat(new T.MeshStandardMaterial({color:C('#3b4046'),roughness:0.5,metalness:0.6}),{key:'bsm'});
 g.add(box(5,0.12,1.9,m,0,2.6,0));[[-2.4,-0.8],[2.4,-0.8],[-2.4,0.8],[2.4,0.8]].forEach(q=>g.add(box(0.08,2.6,0.08,m,q[0],1.3,q[1])));const gl=new T.Mesh(new T.PlaneGeometry(4.8,2.2),new T.MeshPhysicalMaterial({color:C('#8aa4b0'),transparent:true,opacity:0.18,roughness:0.05,depthWrite:false}));gl.position.set(0,1.4,-0.85);g.add(gl);
 g.add(box(3.6,0.08,0.45,m,0,0.55,-0.5));const adm=new T.Mesh(new T.PlaneGeometry(1.2,1.9),new T.MeshBasicMaterial({map:adTex(ad||'taxi'),toneMapped:false,fog:true}));adm.material.color.setScalar(1.2);adm.rotation.y=-PI/2;adm.position.set(2.45,1.4,0);g.add(adm);
 const sg=new T.Mesh(new T.PlaneGeometry(1.6,0.4),new T.MeshBasicMaterial({map:signTex([{t:'ОСТАНОВКА',font:'700 64px "Exo 2", Arial'}],{w:512,h:128,bg:'#1d3a6a',fg:'#fff'}),toneMapped:false,fog:true}));sg.position.set(-1.6,2.85,0.9);g.add(sg);
 s.add(g);ctx.addCollider({t:'b',x,z,w:5,d:0.4,ry:-ry});return g;}
function pedSignal(ctx,x,z,ry){const s=ctx.scene;const g=new T.Group();g.position.set(x,0,z);g.rotation.y=ry;const m=std({color:'#1d1f22',metalness:0.4,roughness:0.6});g.add(cyl(0.06,0.07,2.6,8,m,0,1.3,0),box(0.32,0.62,0.22,m,0,2.55,0));
 const red=new T.Mesh(new T.PlaneGeometry(0.24,0.24),new T.MeshBasicMaterial({map:canvasTex(64,64,(x)=>{x.fillStyle='#000';x.fillRect(0,0,64,64);x.fillStyle='#ff3a2a';x.beginPath();x.arc(32,12,7,0,7);x.fill();x.fillRect(24,20,16,22);x.fillRect(24,42,6,18);x.fillRect(34,42,6,18);},true),toneMapped:false}));red.material.color.setScalar(3);red.position.set(0,2.7,0.115);g.add(red);
 const t=new T.Mesh(new T.PlaneGeometry(0.24,0.2),new T.MeshBasicMaterial({map:canvasTex(64,54,(x)=>{x.fillStyle='#000';x.fillRect(0,0,64,54);x.fillStyle='#ff5a3a';x.font='700 40px "IBM Plex Mono", monospace';x.textAlign='center';x.fillText('99',32,42);},true),toneMapped:false}));t.material.color.setScalar(2);t.position.set(0,2.4,0.115);g.add(t);
 const gl=glow('#ff3a2a',0.9,0.6);gl.position.set(Math.sin(ry)*0.2,2.7,Math.cos(ry)*0.2);g.add(gl);s.add(g);ctx.addCollider({t:'c',x,z,r:0.12});return g;}

// ---------------- люди, маски, дроны ----------------
const MASKC=['#9ec4df','#e9ecef','#1a1b1e','#9ec4df','#d8e2e6','#2a2d33','#7fa9c9'];
function addMask(ctx,g,col){g.updateMatrixWorld(true);let head=null,model=null;g.traverse(o=>{if(o.isBone&&o.name==='Head')head=o;});model=g.children.find(c=>c.type==='Group'||c.isObject3D&&c.children.length&&!c.isLight);if(!head||!model)return;
 const mw=model.matrixWorld;const wq=new T.Quaternion(),wp=new T.Vector3(),ws=new T.Vector3();mw.decompose(wp,wq,ws);
 const geo=new T.CylinderGeometry(0.083,0.07,0.085,14,1,true,-1.2,2.4);const m=new T.Mesh(geo,std({color:col,roughness:0.95,side:T.DoubleSide}));
 const pos=new T.Vector3(0,1.607,0.035).applyMatrix4(mw);L.attachToBone(head,m,pos,wq.clone().multiply(new T.Quaternion().setFromEuler(new T.Euler(0.12,0,0))),ws.x);m.castShadow=true;return m;}
function sidewalkPt(x,z,side,off){const r=nearestRoad(x,z,2);if(!r)return [x,z,0];const rx=-r.dz,rz=r.dx;const o=(r.road.w/2+(off===undefined?6.2:off))*side;return [r.x+rx*o,r.z+rz*o,Math.atan2(r.dx,r.dz),r];}
// прохожие: люди в масках и серийные андроиды «Вектора» (примерно каждый четвёртый; маска им не нужна)
const UNIT_MIX=['plain','plain','taxi','courier','eco'];
function addWalkers(ctx,list,seed){const r=rng(seed);const max=Math.round(20*L.Q.crowd);const out=[];
 for(let i=0;i<list.length&&out.length<max;i++){const q=list[i];const bot=r()<0.26;const look=bot?L.unitLook(UNIT_MIX[(r()*UNIT_MIX.length)|0]):L.crowdLook(r);const walk=q.b?{a:q.a,b:q.b,speed:bot?1.25:1.05+r()*0.35}:null;
  const ch=L.makeChar(ctx,look,{x:q.a[0],z:q.a[1],ry:q.ry!==undefined?q.ry:r()*TAU,anim:walk?'walk':(q.anim||'idle'),walk});ch.userData.radius=0.32;if(!bot&&r()<0.72)addMask(ctx,ch,MASKC[(r()*MASKC.length)|0]);out.push(ch);}
 return out;}
// ---------------- рабочие андроиды «Чистого города» (гл. 4): дворник, эко-инспектор, патруль, регулировщик, курьер ----------------
function unitProp(kind){const g=new T.Group();const dk=std({color:'#1b1d21',metalness:0.5,roughness:0.4});
 const scr=(c,w,h)=>new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({color:C(c).multiplyScalar(1.7),toneMapped:false}));
 if(kind==='scanner'){g.add(box(0.08,0.14,0.035,dk,0,0,0));const s=scr('#6fe08a',0.06,0.09);s.position.z=0.019;g.add(s);const tip=glow('#6fe08a',0.12,0.8);tip.position.set(0,0.09,0);g.add(tip);}
 else if(kind==='tablet'){g.add(box(0.2,0.28,0.015,dk,0,0,0));const s=scr('#58c8f0',0.18,0.25);s.position.z=0.009;g.add(s);}
 else if(kind==='baton'){const b=new T.Mesh(new T.CylinderGeometry(0.018,0.018,0.42,8),new T.MeshBasicMaterial({color:C('#ff8a2a').multiplyScalar(3),toneMapped:false}));g.add(b);const gl=glow('#ff8a2a',0.5,0.5);gl.position.y=0.12;g.add(gl);g.add(cyl(0.022,0.022,0.12,8,dk,0,-0.26,0));}
 else if(kind==='box'){g.add(box(0.42,0.44,0.3,std({color:'#e3b12c',roughness:0.7}),0,0,0));const s=new T.Mesh(new T.PlaneGeometry(0.3,0.1),new T.MeshBasicMaterial({map:signTex([{t:'ДОСТАВКА',font:'800 60px "Exo 2", Arial'}],{w:320,h:100,bg:'#1b1d21',fg:'#e3b12c'})}));s.position.set(0,0.08,-0.151);s.rotation.y=PI;g.add(s);}
 else if(kind==='cart'){const bin=std({color:'#2f6d3a',roughness:0.55,metalness:0.1});g.add(box(0.62,0.72,0.5,bin,0,0.52,0));g.add(box(0.66,0.05,0.54,dk,0,0.9,0));
  for(const sx of [-0.28,0.28]){const w=cyl(0.1,0.1,0.05,12,dk,sx,0.1,-0.18);w.rotation.z=PI/2;g.add(w);}g.add(box(0.03,0.03,0.5,dk,-0.24,0.95,-0.45),box(0.03,0.03,0.5,dk,0.24,0.95,-0.45),box(0.5,0.03,0.03,dk,0,0.95,-0.7));
  const br=cyl(0.015,0.015,1.3,6,std({color:'#8a6a3c'}),0.36,0.95,0.05);br.rotation.x=0.25;g.add(br);
  const s=new T.Mesh(new T.PlaneGeometry(0.5,0.14),new T.MeshBasicMaterial({map:signTex([{t:'ЧИСТЫЙ ГОРОД',font:'800 44px "Exo 2", Arial'}],{w:400,h:110,bg:'#0c1a12',fg:'#7fe0a0'})}));s.position.set(0,0.62,0.252);g.add(s);}
 g.traverse(o=>{if(o.isMesh)o.castShadow=true;});return g;}
// центр занятости: очередь людей вдоль дома, вывеска и табло ожидания
function jobQueue(ctx,sp,face){const s=ctx.scene;const h=sp(784,12.5,1,9.4),t=sp(784,3,1,9.4);let dx=h[0]-t[0],dz=h[1]-t[1];const L0=Math.hypot(dx,dz)||1;dx/=L0;dz/=L0;const ry=Math.atan2(dx,dz);const r=rng(612);const out=[];
 for(let i=0;i<8;i++){const x=h[0]-dx*(0.9+i*1.05)+(r()-0.5)*0.25,z=h[1]-dz*(0.9+i*1.05)+(r()-0.5)*0.25;const ch=L.makeChar(ctx,L.crowdLook(r),{x,z,ry:ry+(r()-0.5)*0.5,anim:r()<0.3?'sad_pose':'idle'});ch.userData.radius=0.3;addMask(ctx,ch,MASKC[(r()*MASKC.length)|0]);out.push(ch);}
 const g=new T.Group();g.position.set(h[0]+dx*0.4,0,h[1]+dz*0.4);g.rotation.y=face(h,1);const pm=std({color:'#2a2d31',metalness:0.5,roughness:0.5});g.add(box(0.08,2.6,0.08,pm,-1.1,1.3,0),box(0.08,2.6,0.08,pm,1.1,1.3,0));
 const sg=new T.Mesh(new T.PlaneGeometry(2.4,0.62),new T.MeshBasicMaterial({map:signTex([{t:'ЦЕНТР ЗАНЯТОСТИ',font:'800 92px "Exo 2", Arial',y:0.36},{t:'переобучение · пособия',font:'500 56px "Exo 2", Arial',y:0.78}],{w:1024,h:260,bg:'#12324a',fg:'#e8f2f8'}),fog:true}));sg.position.set(0,2.45,0.05);g.add(sg);
 const scr=new T.Mesh(new T.PlaneGeometry(1.1,0.42),new T.MeshBasicMaterial({map:signTex([{t:'ОЧЕРЕДЬ 1 214',font:'700 70px "IBM Plex Mono", monospace',y:0.38},{t:'ОЖИДАНИЕ 3 МЕС',font:'500 50px "IBM Plex Mono", monospace',y:0.78}],{w:512,h:200,bg:'#050709',fg:'#ff8a3d'}),toneMapped:false,fog:true}));scr.material.color.setScalar(1.6);scr.position.set(0,1.75,0.05);g.add(scr);
 s.add(g);ctx.addCollider({t:'b',x:g.position.x,z:g.position.z,w:2.4,d:0.3,ry:-g.rotation.y});
 const mid=out[3].position;ctx.points.jobs=[mid.x+Math.sin(face(h,1))*1.6,mid.z+Math.cos(face(h,1))*1.6];return out;}
// свидание на скамейке: у обоих в ушах ассистенты «Вектор-Пара», над ними голограмма совместимости
function dateBench(ctx,sp,face){const s=ctx.scene;const q=sp(781,-46,1,7.8);const ry=face(q,1);const g=new T.Group();g.position.set(q[0],0,q[1]);g.rotation.y=ry;s.add(g);
 const wd=std({color:'#6a4a32',roughness:0.7}),mt=std({color:'#1d1f22',metalness:0.6,roughness:0.4});g.add(box(1.9,0.07,0.46,wd,0,0.45,0),box(1.9,0.4,0.05,wd,0,0.72,-0.22));for(const sx of [-0.85,0.85])g.add(box(0.06,0.45,0.42,mt,sx,0.225,0));
 const pair=[];[[-0.42,{human:1,top:'#3a4a6a',bot:'#22252b',shoe:'#161412',skin:[0.95,0.8,0.68],hair:'#1a1310'}],[0.42,{human:1,top:'#8a3a4a',bot:'#2a2226',shoe:'#161412',skin:[0.98,0.84,0.72],hair:'#3a2418',hairStyle:'long',scale:0.94}]].forEach(([x,lk],i)=>{
  const w=new T.Vector3(x,0,0.06).applyAxisAngle(new T.Vector3(0,1,0),ry);const ch=L.makeChar(ctx,lk,{x:q[0]+w.x,z:q[1]+w.z,ry:ry+(i?-0.35:0.35),pose:'sit',anim:'idle',smile:i?0.35:0.15});ch.userData.radius=0.3;
  const ph=new T.Mesh(new T.PlaneGeometry(0.07,0.13),new T.MeshBasicMaterial({color:C('#bfe8ff').multiplyScalar(1.5),toneMapped:false}));ph.position.set(0.02,0.62,0.3);ph.rotation.x=-1.0;ch.add(ph);
  for(const ex of [-0.075,0.075]){const e=glow('#58c8f0',0.09,0.95);e.position.set(ex,1.18,0.0);ch.add(e);}pair.push(ch);});
 const hol=L.textPlane('ВЕКТОР-ПАРА · СОВМЕСТИМОСТЬ 97%',{w:2.2,h:0.3,color:'#ff7ab8',font:'700 88px "Exo 2", Arial',canvasW:2048,canvasH:256,intensity:1.8});hol.position.set(0,1.95,0.1);g.add(hol);
 const heart=glow('#ff7ab8',0.9,0.5);heart.position.set(0,1.95,0.05);g.add(heart);
 ctx.ticks.push(t=>{hol.material.opacity=0.7+0.3*Math.sin(t*3.1);hol.position.y=1.95+Math.sin(t*1.2)*0.03;});
 ctx.addCollider({t:'b',x:q[0],z:q[1],w:1.9,d:0.5,ry:-ry});ctx.points.date=[q[0]+Math.sin(ry)*1.4,q[1]+Math.cos(ry)*1.4];return pair;}
function androidWorkers(ctx,sp,face){const U=L.unitLook,out={};
 const mk=(kind,at,ry,o)=>{o=o||{};const ch=L.makeChar(ctx,U(kind,o.look),Object.assign({x:at[0],z:at[1],ry,anim:o.walk?'walk':'idle'},o,{look:null}));ch.userData.radius=0.36;return ch;};
 const hold=(ch,kind,x,y,z,rx)=>{const p=unitProp(kind);p.position.set(x,y,z);if(rx)p.rotation.x=rx;ch.add(p);return p;};
 // дворник толкает тележку по тротуару Пушкина
 {const a=sp(796,78,1,4.4),b=sp(793,46,1,4.4);const ch=mk('cleaner',a,0,{walk:{a:[a[0],a[1]],b:[b[0],b[1]],speed:0.62},speed:0.6});ch.userData.radius=0.5;hold(ch,'cart',0,0,0.78);out.cleaner=ch;ctx.points.workers=[(a[0]+b[0])/2,(a[1]+b[1])/2];}
 // эко-инспектор снимает показания у табло PM2.5
 {const q=sp(797.5,152.5,1,4.8);const ch=mk('eco',q,q[2]+PI*0.9);hold(ch,'scanner',0.2,1.12,0.3,-0.5);out.eco=ch;}
 // патруль у остановки на Жибек Жолы
 {const q=sp(874,-80,1,4.2),q2=sp(876,-79,1,5.4);const a=mk('patrol',q,face(q,1)),b=mk('patrol',q2,face(q2,1)+0.7);hold(a,'tablet',0.24,1.15,0.34,-0.6);out.patrol=[a,b];}
 // регулировщик на углу перехода: светофор для людей всё равно красный
 {const q=sp(PTS.cross2[0]+3.4,PTS.cross2[1],-1,1.4);const ch=mk('patrol',q,q[2]+PI/2,{look:{top:'#e6e9ec',acc:'#ff8a2a',led:'#58c8f0'}});hold(ch,'baton',0.3,1.02,0.22,-1.0);out.traffic=ch;}
 // курьер с коробом быстрым шагом по Жибек Жолы
 {const a=sp(846,-80,-1,5.2),b=sp(812,-78,-1,5.2);const ch=mk('courier',a,0,{walk:{a:[a[0],a[1]],b:[b[0],b[1]],speed:1.7},speed:1.35});hold(ch,'box',0,1.28,-0.26);out.courier=ch;}
 return out;}
function droneMesh(){const g=new T.Group();const m=std({color:'#1c1f24',metalness:0.7,roughness:0.35});g.add(box(0.9,0.2,0.6,m,0,0,0));
 for(const [x,z] of [[-0.62,-0.5],[0.62,-0.5],[-0.62,0.5],[0.62,0.5]]){const arm=box(0.7,0.05,0.07,m,x*0.55,0,z*0.55);arm.rotation.y=Math.atan2(z,x);g.add(arm);const rot=new T.Mesh(new T.CircleGeometry(0.3,16),new T.MeshBasicMaterial({color:0x222222,transparent:true,opacity:0.45,depthWrite:false,side:T.DoubleSide}));rot.rotation.x=-PI/2;rot.position.set(x,0.09,z);g.add(rot);}
 const lens=new T.Mesh(new T.SphereGeometry(0.13,12,8),new T.MeshBasicMaterial({color:C('#6fe0ff').multiplyScalar(3),toneMapped:false}));lens.position.y=-0.14;g.add(lens);g.userData.lens=lens;
 const r=glow('#ff3030',0.7,0.9);r.position.set(-0.45,0.05,-0.3);const b=glow('#3a6bff',0.7,0.9);b.position.set(0.45,0.05,-0.3);g.add(r,b);g.userData.nav=[r,b];
 const sg=new T.Mesh(new T.PlaneGeometry(0.8,0.16),new T.MeshBasicMaterial({map:signTex([{t:'ЧИСТЫЙ ГОРОД',font:'800 70px "Exo 2", Arial'}],{w:512,h:100,bg:'#0c1a12',fg:'#7fe0a0'}),toneMapped:false}));sg.position.set(0,0,0.31);g.add(sg);
 return g;}
function addDrones(ctx,center,n){const s=ctx.scene;const out=[];for(let i=0;i<n;i++){const d=droneMesh();s.add(d);const cone=L.beam('#6fd8f2',0.08,2.6,1,0.2);s.add(cone);
  const spot=new T.Mesh(new T.CircleGeometry(2.6,32),new T.MeshBasicMaterial({color:C('#6fd8f2').multiplyScalar(0.5),transparent:true,opacity:0.35,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false}));spot.rotation.x=-PI/2;spot.renderOrder=3;s.add(spot);
  const ring=new T.Mesh(new T.RingGeometry(2.45,2.6,40),new T.MeshBasicMaterial({color:C('#9fe8ff').multiplyScalar(1.5),transparent:true,opacity:0.7,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false}));ring.rotation.x=-PI/2;ring.renderOrder=3;s.add(ring);
  const light=L.spotL(ctx,{c:'#bfefff',i:4,p:[0,8,0],t:[0,0,0],d:22,a:0.32,pen:0.5});
  out.push({d,cone,spot,ring,light,ph:i*2.1,flash:0,aim:new T.Vector3(),cx:center[0]+(i?7:-6),cz:center[1]+(i?-4:2)});}
 const cBlue=C('#6fd8f2'),cRed=C('#ff3a2a');const from=new T.Vector3(),to=new T.Vector3();
 ctx.ticks.push((t,dt)=>{for(const q of out){const x=q.cx+Math.sin(t*0.23+q.ph)*6,z=q.cz+Math.cos(t*0.17+q.ph)*4,y=8.2+Math.sin(t*0.9+q.ph)*0.35;q.d.position.set(x,y,z);q.d.rotation.y=t*0.1+q.ph;q.d.rotation.z=Math.sin(t*1.3)*0.04;
  const ax=x+Math.sin(t*0.62+q.ph)*4.2,az=z+Math.cos(t*0.47+q.ph*1.3)*3.4;q.aim.set(ax,0,az);from.set(x,y-0.2,z);to.set(ax,0.02,az);L.aimBeam(q.cone,from,to);q.cone.scale.set(1,from.distanceTo(to),1);
  q.spot.position.set(ax,0.05,az);q.ring.position.set(ax,0.06,az);q.flash=Math.max(0,q.flash-dt);const red=q.flash>0;const c=red?cRed:cBlue;q.cone.material.uniforms.c.value.copy(c);q.spot.material.color.copy(c).multiplyScalar(0.5);q.ring.material.color.copy(c).multiplyScalar(1.5);
  q.light.position.copy(from);q.light.target.position.copy(to);q.light.color.copy(red?cRed:C('#bfefff'));q.d.userData.nav.forEach((n,k)=>n.material.opacity=((t*2+k*0.5)%1)<0.5?1:0.2);}});
 return out;}
function babaScene(ctx,x,z,ry){// бабушка с тележкой баурсаков + патрульный андроид «Чистого города»
 const s=ctx.scene;const g=new T.Group();g.position.set(x,0,z);g.rotation.y=ry;s.add(g);
 const cart=new T.Group();const body=std({color:'#d8dde0',roughness:0.5,metalness:0.4});cart.add(box(1.3,0.8,0.7,body,0,0.75,0));const glass=new T.Mesh(new T.BoxGeometry(1.2,0.45,0.6),new T.MeshPhysicalMaterial({color:C('#cfe0e8'),transparent:true,opacity:0.3,roughness:0.05}));glass.position.y=1.38;cart.add(glass);
 for(let i=0;i<14;i++){const b=new T.Mesh(new T.SphereGeometry(0.06,8,6),std({color:'#c98a3a',roughness:0.7}));b.position.set(-0.45+(i%7)*0.15,1.22,-0.12+Math.floor(i/7)*0.2);b.scale.y=0.8;cart.add(b);}
 for(const sx of [-0.5,0.5]){const w=cyl(0.18,0.18,0.08,14,std({color:'#222'}),sx,0.18,0.36);w.rotation.x=PI/2;cart.add(w);}cart.add(box(0.05,0.05,0.9,body,0.72,0.9,-0.2));
 const um=L.umbrella('#2f5d8a');um.scale.setScalar(1.8);um.position.set(0,2.3,0);cart.add(um);cart.add(cyl(0.02,0.02,1.2,6,std({color:'#333'}),0,1.7,0));
 const sg=new T.Mesh(new T.PlaneGeometry(1.1,0.26),new T.MeshBasicMaterial({map:signTex([{t:'БАУРСАКИ',font:'800 80px "Exo 2", Arial'}],{w:512,h:120,bg:'#f2e6c8',fg:'#7a2a14'}),fog:true}));sg.position.set(0,0.95,0.36);cart.add(sg);
 cart.traverse(o=>{if(o.isMesh)o.castShadow=true;});cart.position.set(0,0,0);g.add(cart);
 g.updateMatrixWorld(true);const wp=new T.Vector3(-0.9,0,0.4).applyMatrix4(g.matrixWorld);const wp2=new T.Vector3(1.6,0,1.6).applyMatrix4(g.matrixWorld);
 const baba=L.makeChar(ctx,{human:1,top:'#5d3a4a',bot:'#2a2426',shoe:'#1a1412',skin:[0.9,0.74,0.62],beard:null,hair:'#cfc8bc',scale:0.93},{x:wp.x,z:wp.z,ry:ry+0.5,anim:'idle'});ctx.byKey.baba=baba;
 // платок
 baba.updateMatrixWorld(true);let head=null;baba.traverse(o=>{if(o.isBone&&o.name==='Head')head=o;});const model=baba.children[0];
 if(head&&model){const mw=model.matrixWorld;const wq=new T.Quaternion(),p=new T.Vector3(),sc=new T.Vector3();mw.decompose(p,wq,sc);const sc2=new T.Mesh(new T.SphereGeometry(0.112,20,12,0,TAU,0,PI*0.62),std({map:L.ornamentTex('#7a2230','#e0b060',21,[3,2]),roughness:0.9,side:T.DoubleSide}));sc2.scale.set(1,1.05,1.12);L.attachToBone(head,sc2,new T.Vector3(0,1.735,0.0).applyMatrix4(mw),wq.clone().multiply(new T.Quaternion().setFromEuler(new T.Euler(-0.25,0,0))),sc.x);}
 const cop=L.makeChar(ctx,L.unitLook('patrol'),{x:wp2.x,z:wp2.z,ry:ry-2.3,anim:'idle'});ctx.byKey.cop=cop;cop.userData.faceTo=baba;
 const tab=new T.Mesh(new T.PlaneGeometry(0.22,0.3),new T.MeshBasicMaterial({color:C('#58c8f0').multiplyScalar(1.6),toneMapped:false}));tab.position.set(0.25,1.15,0.35);tab.rotation.x=-0.6;cop.add(tab);
 ctx.addCollider({t:'b',x,z,w:1.5,d:0.9,ry:-ry});return {baba,cop,cart};}

// ---------------- служебный внедорожник Отдела 7 ----------------
function policeCar(ctx){const cm=CITY.D.cars.suv||CITY.D.cars.sedan;const s=ctx.scene;const G=new T.Group();s.add(G);const mat=carMat();
 const mkI=(geo,n)=>{const g=new T.BufferGeometry();for(const k in geo.attributes)g.setAttribute(k,geo.attributes[k]);const lt=new T.InstancedBufferAttribute(new Float32Array(n*3),3);g.setAttribute('aLt',lt);const im=new T.InstancedMesh(g,mat,n);im.castShadow=true;im.receiveShadow=true;im.frustumCulled=false;for(let i=0;i<n;i++){im.setMatrixAt(i,new T.Matrix4());im.setColorAt(i,C('#e8ebee'));lt.setXYZ(i,0,1,0);}return {im,lt};};
 const body=mkI(cm.body,1);G.add(body.im);
 // колёса: своя геометрия, вращение и поворот
 const wm=[];const WG=CITY.wheelGeo();cm.wheels.forEach(w=>{const q=mkI(WG,1);q.im.scale.set(w.w,w.r,w.r);q.im.position.set(w.x,w.y,w.z);G.add(q.im);wm.push({m:q.im,w});});
 // ливрея: синяя полоса и надписи
 const liv=canvasTex(1024,256,(x,w,h)=>{x.clearRect(0,0,w,h);x.fillStyle='#1d4f9a';x.fillRect(0,90,w,70);x.fillStyle='#f2c230';x.fillRect(0,160,w,14);x.fillStyle='#fff';x.font='800 64px "Exo 2", Arial';x.textAlign='center';x.fillText('ОТДЕЛ 7 · ПОЛИЦИЯ',w/2,145);},true);
 for(const sd of [-1,1]){const p=new T.Mesh(new T.PlaneGeometry(cm.len*0.78,cm.len*0.78/4),new T.MeshStandardMaterial({map:liv,transparent:true,roughness:0.35,metalness:0.1,polygonOffset:true,polygonOffsetFactor:-2}));p.rotation.y=sd*PI/2;p.position.set(sd*(cm.wid/2+0.012),0.72,cm.zc);if(sd<0)p.scale.x=-1;G.add(p);}
 const hood=new T.Mesh(new T.PlaneGeometry(1.1,0.34),new T.MeshBasicMaterial({map:signTex([{t:'ОТДЕЛ 7',font:'800 120px "Exo 2", Arial'}],{w:512,h:160,bg:'rgba(0,0,0,0)',fg:'#1d4f9a'}),transparent:true}));hood.rotation.set(-PI/2+0.08,0,0);hood.position.set(0,1.02,cm.zc+cm.len*0.36);G.add(hood);
 // мигалка
 const bar=new T.Group();bar.position.set(0,cm.h+0.02,cm.zc-0.1);G.add(bar);bar.add(box(1.3,0.14,0.34,std({color:'#1a1c20',metalness:0.6}),0,0.07,0));
 const redM=new T.MeshBasicMaterial({color:C('#ff2a2a'),toneMapped:false}),bluM=new T.MeshBasicMaterial({color:C('#2a5bff'),toneMapped:false});const lr=box(0.56,0.16,0.3,redM,-0.34,0.2,0),lb=box(0.56,0.16,0.3,bluM,0.34,0.2,0);bar.add(lr,lb);
 const gr=glow('#ff3030',1.6,0),gbl=glow('#3a6bff',1.6,0);gr.position.set(-0.4,0.25,0);gbl.position.set(0.4,0.25,0);bar.add(gr,gbl);
 const pr=new T.PointLight(C('#ff2a2a'),0,11,2),pb=new T.PointLight(C('#2a5bff'),0,11,2);pr.position.set(-0.6,0.8,0.4);pb.position.set(0.6,0.8,0.4);bar.add(pr,pb);
 const car={group:G,body,wm,cm,bar,lr,lb,gr,gbl,pr,pb,x:0,z:0,h:0,siren:false,brake:0};
 ctx.ticks.push((t,dt)=>{const on=car.siren;const ph=Math.floor(t*6)%4;const a=on&&(ph===0||ph===2),b=on&&(ph===1||ph===3);
  redM.color.copy(C('#ff2a2a')).multiplyScalar(a?4:on?0.5:0.3);bluM.color.copy(C('#2a5bff')).multiplyScalar(b?4.5:on?0.5:0.3);gr.material.opacity=a?0.8:0;gbl.material.opacity=b?0.8:0;pr.intensity=a?0.9:0;pb.intensity=b?0.7:0;
  body.lt.setXYZ(0,car.brake,1,0);body.lt.needsUpdate=true;});
 G.traverse(o=>{if(o.isMesh){o.castShadow=true;}});return car;}
function placeCar(car,x,z,h){car.x=x;car.z=z;car.h=h;car.group.position.set(x,0,z);car.group.rotation.y=h;}
// частицы: взвесь смога, освещённая солнцем, вокруг камеры
function smogParticles(ctx,k){const n=Math.round(900*(0.5+0.5*L.Q.crowd)*k);const R=26;const pos=new Float32Array(n*3);const r=rng(17);for(let i=0;i<n;i++)pos.set([(r()-0.5)*R*2,r()*9,(r()-0.5)*R*2],i*3);
 const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(pos,3));const m=new T.PointsMaterial({color:C('#ffe0b8').multiplyScalar(0.9),size:0.05,map:L.glowTex,transparent:true,opacity:0.7,depthWrite:false,blending:T.AdditiveBlending,fog:true});
 const pts=new T.Points(g,m);pts.frustumCulled=false;ctx.scene.add(pts);
 const puffs=[];for(let i=0;i<Math.round(9*k);i++){const sp=new T.Sprite(new T.SpriteMaterial({map:L.smokeTex,color:C(ctx.look.fog[0]).multiplyScalar(1.15),transparent:true,opacity:0,depthWrite:false,fog:true}));sp.userData.t=r();sp.userData.o=[(r()-0.5)*50,1+r()*3,(r()-0.5)*50];ctx.scene.add(sp);puffs.push(sp);}
 ctx.ticks.push((t,dt,cam)=>{const a=pos;const cx=cam.position.x,cz=cam.position.z;for(let i=0;i<n;i++){const k3=i*3;a[k3]+=dt*(0.35+Math.sin(t*0.3+i)*0.2);a[k3+1]+=dt*Math.sin(t*0.5+i*1.7)*0.08;a[k3+2]+=dt*Math.cos(t*0.21+i)*0.15;
   let dx=a[k3]-cx;if(dx>R)a[k3]-=2*R;else if(dx<-R)a[k3]+=2*R;let dz=a[k3+2]-cz;if(dz>R)a[k3+2]-=2*R;else if(dz<-R)a[k3+2]+=2*R;if(a[k3+1]>9)a[k3+1]=0.2;if(a[k3+1]<0.1)a[k3+1]=8.8;}
  g.attributes.position.needsUpdate=true;
  for(const s2 of puffs){s2.userData.t+=dt*0.04;if(s2.userData.t>1){s2.userData.t=0;s2.userData.o=[(r()-0.5)*60,1+r()*3,(r()-0.5)*60];}const u=s2.userData.t;const o=s2.userData.o;s2.position.set(cx+o[0]+u*8,o[1]+u*2,cz+o[2]);s2.scale.setScalar(9+u*10);s2.material.opacity=Math.sin(u*PI)*0.22;}});}
// звук: гудки, сирена, писк сканера (WebAudio, с учётом настроек громкости)
const AUD={ctx:null,g:null,
 vol(){try{const S=JSON.parse(localStorage.getItem('tumar_settings')||'{}')||{};if(S.muted)return 0;const k=v=>Math.pow((v===undefined?80:v)/100,1.6);return k(S.master)*k(S.sfx)*0.9;}catch(e){return 0.5;}},
 init(){if(this.ctx)return this.ctx.state!=='closed';try{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return false;this.ctx=new AC();this.g=this.ctx.createGain();this.g.connect(this.ctx.destination);}catch(e){this.ctx=null;return false;}return true;},
 tone(f,d,type,v,f2){if(!this.init())return;const c=this.ctx;if(c.state==='suspended')c.resume().catch(()=>{});const o=c.createOscillator(),g=c.createGain();o.type=type||'square';o.frequency.setValueAtTime(f,c.currentTime);if(f2)o.frequency.linearRampToValueAtTime(f2,c.currentTime+d);g.gain.setValueAtTime(0,c.currentTime);g.gain.linearRampToValueAtTime((v||0.1)*this.vol(),c.currentTime+0.02);g.gain.linearRampToValueAtTime(0,c.currentTime+d);o.connect(g);g.connect(this.g);o.start();o.stop(c.currentTime+d+0.05);},
 honk(v){if(document.hidden)return;this.tone(392,0.32,'sawtooth',0.05*(v||1));this.tone(466,0.32,'sawtooth',0.04*(v||1));},
 beep(){this.tone(1320,0.12,'sine',0.05);setTimeout(()=>this.tone(990,0.14,'sine',0.05),140);},
 siren:null,
 sirenOn(on){if(!this.init())return;const c=this.ctx;if(on&&!this.siren){const o=c.createOscillator(),lfo=c.createOscillator(),lg=c.createGain(),g=c.createGain();o.type='sawtooth';o.frequency.value=760;lfo.frequency.value=0.55;lg.gain.value=260;lfo.connect(lg);lg.connect(o.frequency);g.gain.value=0.035*this.vol();const f=c.createBiquadFilter();f.type='lowpass';f.frequency.value=1800;o.connect(f);f.connect(g);g.connect(this.g);o.start();lfo.start();this.siren={o,lfo,g};}
  else if(!on&&this.siren){try{this.siren.o.stop();this.siren.lfo.stop();}catch(e){}this.siren=null;}}};

// ---------------- батчинг статики: слить меши с эквивалентными материалами ----------------
function matKey(m){const c=x=>x&&x.isColor?x.getHexString():'';return [m.type,c(m.color),c(m.emissive),m.emissiveIntensity,m.roughness,m.metalness,m.map?m.map.uuid:'',m.bumpMap?m.bumpMap.uuid:'',m.bumpScale,m.side,m.transparent,m.opacity,m.alphaTest,m.toneMapped,m.fog,m.vertexColors,m.clearcoat,m.polygonOffset,m.customProgramCacheKey?m.customProgramCacheKey():'',m.blending,m.depthWrite].join('|');}
function batchStatic(ctx,skip){const s=ctx.scene;const charSet=new Set(ctx.chars);const groups=new Map();const kill=[];
 const bad=o=>{let p=o;while(p&&p!==s){if(charSet.has(p)||p.userData.dynamic||(skip&&skip.has(p)))return true;p=p.parent;}return false;};
 s.updateMatrixWorld(true);
 s.traverse(o=>{if(!o.isMesh||o.isInstancedMesh||o.isSkinnedMesh||Array.isArray(o.material)||o.userData.sky||o.userData.keep)return;const m=o.material;if(m.transparent||m.isShaderMaterial||m.isRawShaderMaterial||m.isMeshDepthMaterial)return;if(bad(o))return;
  const g=o.geometry;if(!g.attributes.position||!g.attributes.normal)return;if(Object.keys(g.attributes).some(k=>!['position','normal','uv'].includes(k)))return;
  const k=matKey(m);let e=groups.get(k);if(!e){e={m,list:[],cast:false,recv:false};groups.set(k,e);}e.list.push(o);e.cast=e.cast||o.castShadow;e.recv=e.recv||o.receiveShadow;kill.push(o);});
 let merged=0;groups.forEach(e=>{if(e.list.length<2){kill.splice(kill.indexOf(e.list[0]),1);return;}
  const geos=e.list.map(o=>{let g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();if(!g.attributes.uv){g.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2));}for(const k of Object.keys(g.attributes))if(!['position','normal','uv'].includes(k))g.deleteAttribute(k);g.applyMatrix4(o.matrixWorld);return g;});
  const mg=T.BufferGeometryUtils.mergeBufferGeometries(geos,false);if(!mg){e.list.forEach(o=>kill.splice(kill.indexOf(o),1));return;}const mm=new T.Mesh(mg,e.m);mm.castShadow=e.cast&&!e.m.isMeshBasicMaterial;mm.receiveShadow=e.recv;mm.matrixAutoUpdate=false;s.add(mm);merged+=e.list.length;});
 kill.forEach(o=>{if(o.parent)o.parent.remove(o);});return merged;}
// толпа: скрывать дальних прохожих (туман всё равно их съедает)
function crowdLOD(ctx,list,R){const tmp=new T.Vector3();let acc=9;const setSh=(ch,on)=>{if(ch.userData._sh===on)return;ch.userData._sh=on;ch.traverse(o=>{if(o.isMesh)o.castShadow=on;});};
 ctx.ticks.push((t,dt,cam)=>{acc+=dt;if(acc<0.25)return;acc=0;cam.getWorldDirection(tmp);for(const ch of list){const dx=ch.position.x-cam.position.x,dz=ch.position.z-cam.position.z;const d=Math.hypot(dx,dz);const front=(dx*tmp.x+dz*tmp.z)/(d||1);ch.visible=d<14||(d<R&&front>0.35);setSh(ch,d<34);}});}

// ---------------- сцена ----------------
function buildCity(mode){const lk=LOOKS[mode];const Q=L.Q;const drive=mode==='drive';
 const cam=drive?{a:[-83.5,3.6,797.2],b:[-86,3.3,796.6],look:[-101,0.9,809],lookB:[-100.5,1.0,809],dur:44,fov:42}:{a:[806.2,0.8,297.2],b:[805.4,0.92,297.9],look:[811,9,322],lookB:[811.5,9.6,322],dur:46,fov:52};
 const ctx=L.newCtx({fog:lk.fog,cam,focus:drive?16:7.5,aperture:0.00012,exposure:lk.exposure,envI:lk.envI,near:0.15,far:drive?820:760,bloomK:0.55,aoR:0.55,aoMax:0.8,aoK:0.5});const s=ctx.scene;
 ctx.mode=mode;ctx.look=lk;
 const sky=skyMesh(lk);s.add(sky);ctx.skyMesh=sky;const env=envFromSky(lk);if(env)s.environment=env;
 // свет
 L.hemi(s,lk.hemiS,lk.hemiG,lk.hemiI);
 const sunDir=new T.Vector3(...lk.sunDir).normalize();const sun=new T.DirectionalLight(C(lk.sunC),lk.sunI);s.add(sun,sun.target);
 if(Q.shadow){sun.castShadow=true;sun.shadow.mapSize.set(Q.shadow,Q.shadow);const sc=sun.shadow.camera;const lo=sunDir.y<0.4;sc.left=-46;sc.right=46;sc.top=lo?14:30;sc.bottom=lo?-14:-30;sc.near=1;sc.far=520;sun.shadow.bias=-0.0006;sun.shadow.normalBias=0.05;}
 ctx.sun=sun;ctx.sunDir=sunDir;
 const glowC=C(lk.glow).multiplyScalar(lk.glowK);const fogC=C(lk.fog[0]);
 const focus=new T.Vector3();ctx.focus3=focus;
 const fog0=lk.fog[1];ctx.ticks.push((t,dt,camera)=>{SU.uSunDir.value.copy(sunDir);SU.uSunGlow.value.copy(glowC);SU.uLit.value=lk.lit;SU.uWet.value=lk.wet;const hy=sm(clamp((camera.position.y-14)/150,0,1));s.fog.density=fog0*(1-0.72*hy);const far=Math.round((drive?820:760)+900*hy);if(Math.abs(camera.far-far)>25){camera.far=far;camera.updateProjectionMatrix();}
  if(window.DRIVE&&DRIVE.active&&DRIVE.pos)focus.copy(DRIVE.pos);else if(window.PLAY&&PLAY.active&&PLAY.state.hero)focus.copy(PLAY.state.hero.position);else{camera.getWorldDirection(focus);focus.multiplyScalar(18).add(camera.position);focus.y=0;}
  const q=0.5;const fx=Math.round(focus.x/q)*q,fz=Math.round(focus.z/q)*q;sun.target.position.set(fx,0,fz);sun.position.set(fx+sunDir.x*260,sunDir.y*260,fz+sunDir.z*260);sun.target.updateMatrixWorld();});
 addWorld(ctx);
 staticColliders(ctx);
 addTrees(ctx);addLamps(ctx);
 const g=CITY.geo();const B=g.B;
 ctx.walkArea={minX:B.minX+30,maxX:B.maxX-30,minZ:B.minZ+30,maxZ:B.maxZ-30};ctx.floorY=0;ctx.heightAt=()=>0;
 ctx.points={};for(const k in PTS)ctx.points[k]=PTS[k].slice();
 // герой/герои
 if(!drive){L.makeChar(ctx,'aya',{x:PTS.start[0],z:PTS.start[1],ry:PTS.start[2],anim:'idle',look:{led:'#f2c94c'}});}// диод жёлтый: розыск
 const route=drive?[[-100,808],[200,776],[520,747],[800,721],[983,704]]:[[810,303],[806,262],[795,175],[780,154],[797,120],[790,20],[783,-50],[800,-78],[898,-84],[930,-124],[905,-140],[903,-262],[963,-270]];
 // трафик
 const isName=(ln,re)=>re.test(ln.name);
 const tr=addTraffic(ctx,drive?{seed:11,n:125,hot:[[PTS.drive_start[0],PTS.drive_start[1]],[PTS.drive_start[0]+150,PTS.drive_start[1]-15]],nPark:170,parkR:70,taxi:8,route,rKeep:340,r0:200,r1:320,lights:true,exclude:[[PTS.drive_start[0],PTS.drive_start[1],9],[cam.a[0],cam.a[2],6]],
   jam:(ln,x,z)=>isName(ln,/Толе би/)?{sp:[7,10.5],v0:[3,6.5]}:isName(ln,/Достык|Кунаева|Пушкина/)?{sp:[9,16],v0:[5,9]}:null}
  :{seed:5,n:116,nPark:130,parkR:120,taxi:16,route,hot:[[PTS.cross2[0],PTS.cross2[1]],[PTS.cross1[0],PTS.cross1[1]],[785,40]],rKeep:320,r0:185,r1:300,lights:true,center:[850,60],exclude:[[PTS.cross1[0]+3,PTS.cross1[1],6]],
   jam:(ln,x,z)=>isName(ln,/Жибек Жолы/)&&x>600&&x<1080?{sp:[6.6,8.2],v0:[0.35,1.1]}:isName(ln,/Гоголя/)&&x>560&&x<840?{sp:[7,9.5],v0:[4,7]}:isName(ln,/Пушкина/)?{sp:[8,12],v0:[5,8]}:null});
 addSignals(ctx);
 ctx._dyn=(x,z,r,buf)=>ctx._dynCars(x,z,r,buf);
 // сюжетные машины
 if(!drive){const lanes=tr.lanes;let best=null,bd=1e9;for(const ln of lanes){if(!/Гоголя/.test(ln.name))continue;for(const q of ln.samp){const d=Math.hypot(q[1]-PTS.cross1[0],q[2]-PTS.cross1[1]);if(d<bd&&ln.idx===1){bd=d;best={ln,s:q[0]};}}}
  if(best){const pr=nearestRoad(PTS.cross1[0],PTS.cross1[1],2);const ln=best.ln;let s0=best.s;for(let k=0;k<30;k++){const q=samplePL(ln.P,ln.S,s0);const dd=(PTS.cross1[0]-q[0])*q[2]+(PTS.cross1[1]-q[1])*q[3];s0+=dd;if(Math.abs(dd)<0.05)break;}
   ctx._suv=ctx._addStaticCar('suv-luxury',ln,s0+0.4,C('#0b0c0e'),{honker:true});}}
 else{const lanes=tr.lanes;const pick=(pt,idx)=>{let best=null,bd=1e9;for(const ln of lanes){if(!/Толе би/.test(ln.name))continue;if(ln.P[0][0]>ln.P[ln.P.length-1][0])continue;for(const q of ln.samp){const d=Math.hypot(q[1]-pt[0],q[2]-pt[1]);if(d<bd&&(idx===undefined||ln.idx===idx)){bd=d;best={ln,s:q[0]};}}}return best;};
  const b2=pick([PTS.drive_b2[0]+25,PTS.drive_b2[1]-2],0);if(b2)ctx._addStaticCar('sedan',b2.ln,b2.s,C('#8d9196'),{haz:true});}
 ctx.mapImage=mapWithRoute(route,drive?'rgba(88,200,240,.8)':null);ctx.mapDots=()=>ctx._mapDots||[];
 const rot=g.rot;const sp=(x,z,side,off)=>sidewalkPt(x,z,side,off);
 const face=(q,side)=>q[2]+(side>0?PI/2:-PI/2);// лицом к дороге
 let drones=[];
 if(!drive){
  cathedral(ctx);memorial(ctx);bazaar(ctx);const yd=yard(ctx);{const v=new T.Vector3(6,0,1.9).applyMatrix4(yd.matrixWorld);ctx.points.repair=[v.x,v.z];}
  {const pool=ctx._carPool;[[20,14,1.57,'delivery'],[-30,-2,0.1,'van'],[40,30,-1.4,'delivery'],[-8,34,3.0,'delivery']].forEach(q=>{const sl=pool.take(q[3]);if(!sl)return;const v=new T.Vector3(q[0],0,q[1]).applyMatrix4(yd.matrixWorld);const h=q[2]+rot;const cm=sl.p.cm;setInst(sl,v.x-Math.sin(h)*cm.zc,0,v.z-Math.cos(h)*cm.zc,h,C(q[3]==='van'?'#e8e6e0':'#d9d5c9'),[0,0,0]);ctx.addCollider({t:'b',x:v.x,z:v.z,w:cm.wid+0.1,d:cm.len+0.1,ry:-h});});
   const lm=std({color:'#2a2c30',metalness:0.6,roughness:0.5});[[-30,14],[10,14],[45,14],[-10,-20]].forEach(q=>{const v=new T.Vector3(q[0],0,q[1]).applyMatrix4(yd.matrixWorld);ctx.scene.add(cyl(0.08,0.1,7,8,lm,v.x,3.5,v.z));const gl=glow('#ffd6a0',4.5,0.55);gl.position.set(v.x,7.1,v.z);ctx.scene.add(gl);ctx.addCollider({t:'c',x:v.x,z:v.z,r:0.15});});}
  // Гоголя у парка: табло PM2.5 и реклама «Вектор-Воздух»
  const qa=sp(794,152.5,1,3.4);aqiBoard(ctx,qa[0],qa[1],rot);ctx.points.aqi=[qa[0]+Math.sin(rot)*1.6,qa[1]+Math.cos(rot)*1.6];
  const qb=sp(808,151.5,1,5.6);billboard(ctx,qb[0],qb[1],rot,'air',{h:3.6,w:6,hh:3});
  const qc=sp(760,154.5,-1,7.5);kiosk(ctx,qc[0],qc[1],face(qc,-1),'ПРЕССА · ТАБАК','#c9c2b0');
  // Пушкина (восточный тротуар): киоски, реклама, бабушка
  const k1=sp(786,70,1,8.9);kiosk(ctx,k1[0],k1[1],face(k1,1),'ШАУРМА','#d6cbb4');const k2=sp(779,-36,1,8.9);kiosk(ctx,k2[0],k2[1],face(k2,1),'КОФЕ С СОБОЙ','#cfd6d2');
  const b3=sp(781,5,-1,7.6);billboard(ctx,b3[0],b3[1],rot,'hor',{h:5,w:6.5,hh:3.3,double:true});
  const bq=sp(782,34,1,7.2);const bb=babaScene(ctx,bq[0],bq[1],face(bq,1));{const b=bb.baba.position,c2=bb.cop.position;ctx.points.baba=[(b.x+c2.x)/2+bq[3].dx*1.2,(b.z+c2.z)/2+bq[3].dz*1.2];}
  // Жибек Жолы: остановка, щит «Вектор-Такси», киоск масок, светофоры для пешеходов
  const bs=sp(868,-80,1,5.5);busStop(ctx,bs[0],bs[1],face(bs,1),'taxi');const bt=sp(832,-77,1,7.6);billboard(ctx,bt[0],bt[1],rot+PI,'taxi',{h:4.8,w:6.5,hh:3.2,double:true});
  const km=sp(872,-80,-1,9);kiosk(ctx,km[0],km[1],face(km,-1),'МАСКИ · ФИЛЬТРЫ','#bfc8cc');
  const p1=sp(PTS.cross2[0]-2,PTS.cross2[1],1,0.6),p2=sp(PTS.cross2[0]-2,PTS.cross2[1],-1,0.6);pedSignal(ctx,p1[0],p1[1],p1[2]+PI/2);pedSignal(ctx,p2[0],p2[1],p2[2]-PI/2);
  const p3=sp(PTS.cross1[0]-2.4,PTS.cross1[1],1,0.6),p4=sp(PTS.cross1[0]-2.4,PTS.cross1[1],-1,0.6);pedSignal(ctx,p3[0],p3[1],p3[2]-PI/2);pedSignal(ctx,p4[0],p4[1],p4[2]+PI/2);
  // площадь базара: «Чистый город», киоски, дроны
  billboard(ctx,990,-121,rot+0.35,'clean',{h:4.2,w:6,hh:3.2});kiosk(ctx,918,-121,rot,'БАУРСАКИ · ЧАЙ','#d9c9a8');kiosk(ctx,1002,-127,rot-0.3,'СИМ-КАРТЫ','#c4ccd2');
  drones=addDrones(ctx,[PTS.drone_zone[0],PTS.drone_zone[1]],2);ctx._drones=drones;
  ctx._workers=androidWorkers(ctx,sp,face);
  // боль про ИИ: очередь в центр занятости, свидание с ассистентами, реклама «Вектор-Пара» и «Вектор-Ассистент»
  ctx._queue=jobQueue(ctx,sp,face);ctx._date=dateBench(ctx,sp,face);
  {const a=sp(790,96,-1,7.6);billboard(ctx,a[0],a[1],rot,'pair',{h:5,w:6.5,hh:3.3,double:true});const b=sp(852,-78,-1,7.6);billboard(ctx,b[0],b[1],rot+PI,'assist',{h:4.8,w:6.5,hh:3.2,double:true});}
  // люди
  const wl=[];const seg=(x,z,side,len,off)=>{const a=sp(x,z,side,off||6.3);const d=a[3];if(!d)return;const b=[a[0]+d.dx*len,a[1]+d.dz*len];wl.push({a:[a[0],a[1]],b});};
  seg(790,120,1,-32);seg(787,70,-1,40);seg(783,20,1,-36);seg(780,-20,-1,30);seg(777,-50,1,26,5.8);seg(840,-80,1,-30);seg(930,-86,1,34,6.8);seg(880,-80,-1,-40);seg(760,156,1,30);seg(820,151,-1,-30);seg(745,157,-1,-35);
  wl.push({a:[935,-120],b:[965,-128]},{a:[975,-115],b:[948,-110]},{a:[912,-150],b:[909,-200]},{a:[903,-205],b:[906,-160]},{a:[930,-110],b:[930,-110],ry:1.2},{a:[944,-118],ry:-2},{a:[959,-122],ry:2.8},{a:[800,262],b:[812,236]},{a:[830,300],b:[860,296]},{a:[925,-250],b:[955,-252]});
  // ждут у переходов (смотрят в телефоны)
  const wr=sp(PTS.cross1[0]+1,PTS.cross1[1],1,0.9);wl.unshift({a:[wr[0]+0.8,wr[1]],ry:wr[2]+PI/2},{a:[wr[0]-0.9,wr[1]+0.4],ry:wr[2]+PI/2+0.3});
  const wz=sp(PTS.cross2[0]-1,PTS.cross2[1],-1,1.0);wl.unshift({a:[wz[0],wz[1]],ry:wz[2]-PI/2},{a:[wz[0]+1.4,wz[1]-0.3],ry:wz[2]-PI/2-0.2},{a:[wz[0]-1.2,wz[1]+0.2],ry:wz[2]-PI/2+0.3});
  ctx._crowd=addWalkers(ctx,wl,31);crowdLOD(ctx,ctx._crowd,80);crowdLOD(ctx,[...ctx._queue,...ctx._date,...Object.values(ctx._workers).flat()],90);
  // курьер на электросамокате носится по тротуару (событие walk1)
  {const a=sp(799,140,1,5.6),b=sp(789,20,1,5.6);const cr=L.makeChar(ctx,L.crowdLook(rng(77)),{x:a[0],z:a[1],anim:'idle',walk:{a:[a[0],a[1]],b:[b[0],b[1]],speed:4.6}});cr.userData.radius=0.45;addMask(ctx,cr,'#1a1b1e');
   const sc=new T.Group();const dm=std({color:'#1c1f24',metalness:0.6,roughness:0.4});sc.add(box(0.18,0.06,1.0,dm,0,0.12,0),box(0.04,1.05,0.04,dm,0,0.62,0.42),box(0.5,0.04,0.04,dm,0,1.13,0.42));
   for(const z of [-0.45,0.45]){const w=cyl(0.1,0.1,0.05,12,std({color:'#111'}),0,0.1,z);w.rotation.z=PI/2;sc.add(w);}const bag=box(0.42,0.46,0.3,std({color:'#e0b02a',roughness:0.7}),0,1.35,-0.26);sc.add(bag);cr.add(sc);ctx._courier=cr;}
  // мусор, выброшенный из окна машины (событие walk2)
  {const q=sp(PTS.walk2[0],PTS.walk2[1],1,2.2);const bm=std({color:'#101113',roughness:0.35,metalness:0.1});const bag=new T.Mesh(new T.SphereGeometry(0.28,10,8),bm);bag.scale.set(1.2,0.7,1);bag.position.set(q[0],0.18,q[1]);ctx.scene.add(bag);const r2=rng(8);for(let i=0;i<9;i++){const l=box(0.12+r2()*0.15,0.02,0.1+r2()*0.12,std({color:['#d8d4c8','#b83a2a','#2a5a8a','#e8c040'][i%4],roughness:0.8}),q[0]+(r2()-0.5)*3,0.03,q[1]+(r2()-0.5)*3);l.rotation.y=r2()*6;ctx.scene.add(l);}}
  // стоянка «Вектор-Такси» у базара
  {const pool=ctx._carPool;const tq=sp(965,-92,1,1.4);for(let i=0;i<3;i++){const sl=pool.take('taxi');if(!sl)break;const r=tq[3];const x=tq[0]+r.dx*(i*6.2-4),z=tq[1]+r.dz*(i*6.2-4);const h=Math.atan2(r.dx,r.dz);setInst(sl,x-Math.sin(h)*sl.p.cm.zc,0.05,z-Math.cos(h)*sl.p.cm.zc,h,C('#ecebe5'),[0,1,0]);ctx.addCollider({t:'b',x,z,w:sl.p.cm.wid,d:sl.p.cm.len,ry:-h});}}
  // у вечного огня: женщина в маске фотографирует
  const fp=ctx.anchors.flame;if(fp){const w=L.makeChar(ctx,{human:1,top:'#6a4a3a',bot:'#1c2230',shoe:'#161412',skin:[0.95,0.8,0.68],hair:'#2a1f16'},{x:fp.x+3.2,z:fp.z-2.6,ry:-2.2,anim:'idle'});addMask(ctx,w,'#e9ecef');const ph=box(0.08,0.15,0.01,std({color:'#111'}),0.18,1.45,0.3);w.add(ph);ctx.points.memorial=[fp.x+2.4,fp.z+0.6];}
 }else{
  const pc=policeCar(ctx);ctx._police=pc;placeCar(pc,PTS.drive_start[0],PTS.drive_start[1],PTS.drive_start[2]);
  const erl=L.makeChar(ctx,'erl',{x:0,z:0,ry:0,pose:'sit'});const dina=L.makeChar(ctx,'dina',{x:0,z:0,ry:0,pose:'sit'});pc.group.add(erl);pc.group.add(dina);erl.position.set(0.42,0.1,-0.1);dina.position.set(-0.42,0.1,-0.1);erl.scale.setScalar(0.92);dina.scale.setScalar(0.92);erl.userData.noCollide=dina.userData.noCollide=true;
  // вдоль Толе би: щиты, табло, остановки, киоски
  [[40,1,'air'],[330,-1,'taxi'],[610,1,'hor'],[880,-1,'clean'],[150,-1,'assist'],[740,1,'pair']].forEach(([x,sd,k],i)=>{const r=nearestRoad(x,780-x*0.1,1,rr=>/Толе би/.test(rr.name));const q=sp(r?r.x:x,r?r.z:780,sd,7.2);billboard(ctx,q[0],q[1],q[2]+(sd>0?PI:0),k,{h:5.2,w:7,hh:3.5,double:true});});
  [[250,1],[700,-1]].forEach(([x,sd])=>{const r=nearestRoad(x,780-x*0.1,1,rr=>/Толе би/.test(rr.name));const q=sp(r.x,r.z,sd,3.2);aqiBoard(ctx,q[0],q[1],q[2]+(sd>0?PI/2:-PI/2));});
  [[90,1],[480,-1],[860,1]].forEach(([x,sd])=>{const r=nearestRoad(x,780-x*0.1,1,rr=>/Толе би/.test(rr.name));const q=sp(r.x,r.z,sd,5.2);busStop(ctx,q[0],q[1],face(q,sd),'air');});
  [[180,1,'МАСКИ · ФИЛЬТРЫ'],[400,-1,'КОФЕ С СОБОЙ'],[562,1,'ШАУРМА'],[820,-1,'ЦВЕТЫ']].forEach(([x,sd,t])=>{const r=nearestRoad(x,780-x*0.1,1,rr=>/Толе би/.test(rr.name));const q=sp(r.x,r.z,sd,9);kiosk(ctx,q[0],q[1],face(q,sd),t);});
  const wl=[];for(let i=0;i<10;i++){const x=-60+i*110;const r=nearestRoad(x,780-x*0.1,1,rr=>/Толе би/.test(rr.name));if(!r)continue;const sd=i%2?1:-1;const a=sp(r.x,r.z,sd,6.3);wl.push({a:[a[0],a[1]],b:[a[0]+r.dx*28*sd,a[1]+r.dz*28*sd]});}
  ctx._crowd=addWalkers(ctx,wl,57);crowdLOD(ctx,ctx._crowd,80);
 }
 // пыль/частицы смога вокруг камеры
 smogParticles(ctx,drive?0.7:1);
 // сюжетные «хуки» ходьбы: наезды машин, сканеры дронов, миникарта
 ctx.walkTick=(dt,t,S)=>{const hp=S.hero.position;ctx._hitCD=Math.max(0,(ctx._hitCD||0)-dt);ctx._scanCD=Math.max(0,(ctx._scanCD||0)-dt);
  for(const c of (ctx._cars||[])){if(!c.alive||c.v<1.1)continue;const ex=hp.x-c.x,ez=hp.z-c.z;if(Math.abs(ex)>7||Math.abs(ez)>7)continue;const fx=Math.sin(c.h),fz=Math.cos(c.h);const along=ex*fx+ez*fz,lat=-ex*fz+ez*fx;
   if(Math.abs(along)<c.len/2+0.4&&Math.abs(lat)<c.wid/2+0.35&&ctx._hitCD<=0){ctx._hitCD=1.5;const sg=lat>=0?1:-1;const dx=fx*0.9+(-fz)*sg*0.8,dz=fz*0.9+fx*sg*0.8;c.stopT=1.8;c.honkT=1.5;AUD.honk(0.8);
    if(ctx.hooks&&ctx.hooks.hit)try{ctx.hooks.hit(dx,dz);}catch(e){console.warn(e);}break;}}
  for(const q of (ctx._drones||[])){const d=Math.hypot(hp.x-q.aim.x,hp.z-q.aim.z);if(d<2.55&&ctx._scanCD<=0){ctx._scanCD=3;q.flash=1.4;AUD.beep();if(ctx.hooks&&ctx.hooks.scan)try{ctx.hooks.scan();}catch(e){console.warn(e);}}}
  const dots=[];for(const q of (ctx._drones||[]))dots.push({x:q.aim.x,z:q.aim.z,c:q.flash>0?'#ff4a3d':'#6fd8f2',r:3.2});for(const c of (ctx._cars||[])){if(!c.alive)continue;if(Math.abs(c.x-hp.x)<55&&Math.abs(c.z-hp.z)<55)dots.push({x:c.x,z:c.z,c:c.v>1?'#c9d3dc':'#6d7680',r:1.6});}
  ctx._mapDots=dots;
  if(ctx._suv){const t2=t%7;ctx._suv.honkT=t2<0.9?1:0;if(t2<0.05&&Math.hypot(hp.x-ctx._suv.x,hp.z-ctx._suv.z)<40)AUD.honk(0.5);}};
 const dyn=new Set();if(ctx._police)dyn.add(ctx._police.group);(ctx._drones||[]).forEach(q=>{dyn.add(q.d);dyn.add(q.cone);dyn.add(q.spot);dyn.add(q.ring);});
 ctx._batched=batchStatic(ctx,dyn);
 return L.finalize(ctx);}
ART.addScene('city',()=>buildCity('walk'));
ART.addScene('city_drive',()=>buildCity('drive'));

// ============================================================
// DRIVE: аркадное вождение (W/S газ-тормоз/задний, A/D руль, Space ручник, H сирена)
// ============================================================
const DV={on:false,keys:{},touch:{l:0,r:0,g:0,b:0},cfg:null,ctx:null,car:null,x:0,z:0,h:0,vx:0,vz:0,steer:0,t:0,left:0,hits:0,hitCD:0,shake:0,camYaw:0,camPos:new T.Vector3(),camLook:new T.Vector3(),fov:55,barks:new Set(),res:null,siren:false,finished:false,stuck:0};
let dvRoot=null,dvEl={};
function dvDom(){if(dvRoot)return;const st=document.createElement('style');st.textContent=`
#dvHud{position:fixed;inset:0;pointer-events:none;z-index:30;font-family:"Exo 2",system-ui,sans-serif;color:#eef3f7}
#dvHud .pn{background:rgba(5,9,14,.62);border:1px solid rgba(220,235,245,.16);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}
#dvTop{position:absolute;top:calc(14px + env(safe-area-inset-top,0px));left:50%;transform:translateX(-50%);display:flex;gap:10px;align-items:stretch}
#dvTime{font:500 26px "IBM Plex Mono",ui-monospace,monospace;letter-spacing:.06em;padding:6px 16px;border-bottom:2px solid #58c8f0}#dvTime.low{color:#ff4a3d;border-color:#ff4a3d;animation:dvBl 1s steps(2) infinite}
#dvGoal{display:flex;flex-direction:column;justify-content:center;padding:6px 14px;border-left:2px solid #f2b54c;min-width:170px}#dvGoal b{font:500 11px "Exo 2",sans-serif;letter-spacing:.24em;text-transform:uppercase;color:#f2b54c}#dvGoal span{font:500 15px "IBM Plex Mono",monospace}
#dvSir{display:flex;align-items:center;gap:8px;padding:6px 14px;font:500 11px "Exo 2",sans-serif;letter-spacing:.24em;text-transform:uppercase;color:#a9b6c2}#dvSir i{width:10px;height:10px;border-radius:50%;background:#3a4450}
#dvSir.on{color:#fff}#dvSir.on i{animation:dvSr .5s steps(2) infinite}
@keyframes dvSr{0%{background:#ff4a3d;box-shadow:0 0 12px #ff4a3d}100%{background:#3a6bff;box-shadow:0 0 12px #3a6bff}}@keyframes dvBl{50%{opacity:.45}}
#dvSpd{position:absolute;right:calc(24px + env(safe-area-inset-right,0px));bottom:calc(22px + env(safe-area-inset-bottom,0px));padding:10px 18px 8px;text-align:right;border-right:2px solid #58c8f0}
#dvSpd b{display:block;font:300 56px/1 "Exo 2",sans-serif;letter-spacing:.02em}#dvSpd span{font:500 11px "Exo 2",sans-serif;letter-spacing:.3em;color:#8fd9f7}#dvSpd em{display:block;font:500 11px "IBM Plex Mono",monospace;font-style:normal;color:#a9b6c2;margin-top:4px}
#dvMap{position:absolute;left:calc(18px + env(safe-area-inset-left,0px));bottom:calc(18px + env(safe-area-inset-bottom,0px));width:180px;height:180px;border-radius:50%}
#dvArr{position:absolute;width:0;height:0;transform:translate(-50%,-50%)}#dvArr i{position:absolute;left:-13px;top:-13px;width:26px;height:26px;border:2px solid #f2b54c;border-radius:50%;box-shadow:0 0 14px rgba(242,181,76,.6)}#dvArr i:after{content:"";position:absolute;left:5px;top:5px;width:12px;height:12px;background:#f2b54c;border-radius:50%}
#dvArr span{position:absolute;left:18px;top:-9px;white-space:nowrap;font:500 13px "IBM Plex Mono",monospace;color:#f2b54c;text-shadow:0 1px 6px #000}#dvArr.edge i{border-style:dashed}
#dvHint{position:absolute;left:50%;top:calc(76px + env(safe-area-inset-top,0px));transform:translateX(-50%);max-width:min(620px,90vw);text-align:center;font:400 14px "Exo 2",sans-serif;padding:8px 16px;transition:opacity 1s}#dvHint.out{opacity:0}
#dvHit{position:absolute;inset:0;box-shadow:inset 0 0 120px rgba(255,74,61,0);transition:box-shadow .15s}#dvHit.on{box-shadow:inset 0 0 140px rgba(255,74,61,.55)}
#dvTouch{position:absolute;inset:auto 0 0 0;height:190px;display:none;pointer-events:none}#dvTouch.show{display:block}
#dvTouch button{position:absolute;pointer-events:auto;border:1px solid rgba(220,235,245,.3);background:rgba(5,9,14,.5);color:#eef3f7;font:500 12px "Exo 2",sans-serif;letter-spacing:.2em;border-radius:14px;touch-action:none;-webkit-user-select:none;user-select:none}
#dvTouch button.act{background:rgba(88,200,240,.35);border-color:#58c8f0}
#dvL,#dvR{bottom:calc(22px + env(safe-area-inset-bottom,0px));width:84px;height:84px;font-size:26px!important}#dvL{left:calc(20px + env(safe-area-inset-left,0px))}#dvR{left:calc(116px + env(safe-area-inset-left,0px))}
#dvGas{right:calc(24px + env(safe-area-inset-right,0px));bottom:calc(22px + env(safe-area-inset-bottom,0px));width:96px;height:120px}#dvBrk{right:calc(132px + env(safe-area-inset-right,0px));bottom:calc(22px + env(safe-area-inset-bottom,0px));width:96px;height:84px}#dvSirB{right:calc(24px + env(safe-area-inset-right,0px));bottom:calc(154px + env(safe-area-inset-bottom,0px));width:96px;height:44px}
#dvSir em{font-style:normal;white-space:nowrap;margin-left:-4px}#dvSir{white-space:nowrap}
#dvHud.touch #dvSir em{display:none}#dvHud.touch #dvMap{top:calc(70px + env(safe-area-inset-top,0px));bottom:auto;width:124px;height:124px}
#dvHud.touch #dvSpd{right:auto;left:50%;transform:translateX(-50%);bottom:calc(10px + env(safe-area-inset-bottom,0px));padding:4px 16px 4px;border-right:0;border-bottom:2px solid #58c8f0;text-align:center}#dvHud.touch #dvSpd b{font-size:34px}
@media (max-width:900px){#dvGoal{min-width:120px}#dvGoal span{font-size:14px}#dvTime{font-size:22px;padding:6px 12px}#dvSir{padding:6px 10px}}
@media (max-width:640px){#dvMap{width:130px;height:130px}#dvSpd b{font-size:40px}#dvGoal{min-width:120px}#dvTime{font-size:20px}}
#dvHud.touch #dvTop{left:calc(14px + env(safe-area-inset-left,0px));transform:none}
@media (max-aspect-ratio:1/1){#dvHud.touch #dvTop{top:calc(58px + env(safe-area-inset-top,0px))}#dvHud.touch #dvMap{top:calc(116px + env(safe-area-inset-top,0px));width:110px;height:110px}
 #dvHud.touch #dvSpd{top:calc(116px + env(safe-area-inset-top,0px));bottom:auto;left:auto;right:calc(14px + env(safe-area-inset-right,0px));transform:none;border-bottom:0;border-right:2px solid #58c8f0;text-align:right}
 #dvHud.touch #dvHint{top:auto;bottom:calc(206px + env(safe-area-inset-bottom,0px))}
 #dvL,#dvR{width:72px;height:72px}#dvL{left:calc(14px + env(safe-area-inset-left,0px))}#dvR{left:calc(94px + env(safe-area-inset-left,0px))}
 #dvGas{width:76px;height:108px;right:calc(14px + env(safe-area-inset-right,0px))}#dvBrk{width:76px;height:76px;right:calc(98px + env(safe-area-inset-right,0px))}#dvSirB{width:76px;right:calc(14px + env(safe-area-inset-right,0px));bottom:calc(140px + env(safe-area-inset-bottom,0px))}}
`;document.head.appendChild(st);
 dvRoot=document.createElement('div');dvRoot.id='dvHud';dvRoot.hidden=true;
 dvRoot.innerHTML='<div id="dvHit"></div><div id="dvTop"><div id="dvGoal" class="pn"><b></b><span></span></div><div id="dvTime" class="pn">00:00</div><div id="dvSir" class="pn"><i></i>СИРЕНА<em> · H</em></div></div><div id="dvHint" class="pn"></div><div id="dvArr"><i></i><span></span></div><canvas id="dvMap" width="360" height="360"></canvas><div id="dvSpd" class="pn"><b>0</b><span>КМ/Ч</span><em></em></div>'+
  '<div id="dvTouch"><button id="dvL" type="button">◀</button><button id="dvR" type="button">▶</button><button id="dvBrk" type="button">ТОРМОЗ</button><button id="dvGas" type="button">ГАЗ</button><button id="dvSirB" type="button">СИРЕНА</button></div>';
 document.body.appendChild(dvRoot);['dvHit','dvGoal','dvTime','dvSir','dvHint','dvArr','dvMap','dvSpd','dvTouch'].forEach(k=>dvEl[k]=dvRoot.querySelector('#'+k));
 const tb=(id,key)=>{const b=dvRoot.querySelector('#'+id);const on=e=>{e.preventDefault();DV.touch[key]=1;b.classList.add('act');},off=e=>{DV.touch[key]=0;b.classList.remove('act');};b.addEventListener('pointerdown',on);b.addEventListener('pointerup',off);b.addEventListener('pointercancel',off);b.addEventListener('pointerleave',off);};
 tb('dvL','l');tb('dvR','r');tb('dvGas','g');tb('dvBrk','b');dvRoot.querySelector('#dvSirB').addEventListener('pointerdown',e=>{e.preventDefault();dvSiren(!DV.siren);});
 addEventListener('keydown',e=>{if(!DV.on)return;if(e.target&&(e.target.tagName==='INPUT'||e.target.tagName==='SELECT'))return;DV.keys[e.code]=true;if(e.code==='KeyH'&&!e.repeat)dvSiren(!DV.siren);
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();});
 addEventListener('keyup',e=>{DV.keys[e.code]=false;});addEventListener('blur',()=>{DV.keys={};});}
function dvSiren(on){DV.siren=on;DRIVEAPI.siren=on;if(DV.car)DV.car.siren=on;if(dvEl.dvSir)dvEl.dvSir.classList.toggle('on',on);AUD.sirenOn(on);}
function resolvePt(ctx,p){if(!p)return null;if(typeof p==='string')return ctx.points&&ctx.points[p]?ctx.points[p].slice():null;return p.slice();}
const _o=[],_ctr=new T.Vector3(),_gp=new T.Vector3(),_gq=new T.Vector3();// _gp/_gq: метка цели (дальше far — всё равно «впереди»)
function dvCollide(){const ctx=DV.ctx;const fx=Math.sin(DV.h),fz=Math.cos(DV.h);const R=1.0;const cm=DV.car.cm;const half=cm.len/2-0.95;let nx=0,nz=0,depth=0;
 const circles=[[half,0],[0,0],[-half,0]];
 for(let it=0;it<2;it++){for(const [o] of circles){const cx=DV.x+fx*(o+cm.zc*0),cz=DV.z+fz*(o);const list=ctx.queryColliders(cx,cz,R+1.5);
   for(const k of list){let px=0,pz=0,d=0,hit=false;
    if(k.t==='c'){if(k.tree&&k.r<0.2)continue;const dx=cx-k.x,dz=cz-k.z;const dd=Math.hypot(dx,dz);const m=R+k.r;if(dd<m&&dd>1e-4){px=dx/dd;pz=dz/dd;d=m-dd;hit=true;}}
    else if(k.t==='b'){const c=Math.cos(-k.ry||0),s2=Math.sin(-k.ry||0);const lx=(cx-k.x)*c-(cz-k.z)*s2,lz=(cx-k.x)*s2+(cz-k.z)*c;const hx=k.w/2,hz=k.d/2;const qx=clamp(lx,-hx,hx),qz=clamp(lz,-hz,hz);let dx=lx-qx,dz=lz-qz;let dd=Math.hypot(dx,dz);
     if(dd<1e-5){const ex=hx-Math.abs(lx),ez=hz-Math.abs(lz);if(ex<ez){dx=Math.sign(lx)||1;dz=0;dd=0;d=R+ex;}else{dx=0;dz=Math.sign(lz)||1;d=R+ez;}const c2=Math.cos(k.ry||0),s3=Math.sin(k.ry||0);px=dx*c2-dz*s3;pz=dx*s3+dz*c2;hit=true;}
     else if(dd<R){dx/=dd;dz/=dd;const c2=Math.cos(k.ry||0),s3=Math.sin(k.ry||0);px=dx*c2-dz*s3;pz=dx*s3+dz*c2;d=R-dd;hit=true;}}
    else if(k.t==='p'){const P=k.pts;let ins=false,best=1e9,bx=0,bz=0;for(let i=0,j=P.length-2;i<P.length;j=i,i+=2){const xi=P[i],zi=P[i+1],xj=P[j],zj=P[j+1];if(((zi>cz)!==(zj>cz))&&(cx<(xj-xi)*(cz-zi)/(zj-zi+1e-12)+xi))ins=!ins;const ex=xi-xj,ez=zi-zj;const L2=ex*ex+ez*ez||1e-9;const u=clamp(((cx-xj)*ex+(cz-zj)*ez)/L2,0,1);const qx=xj+ex*u,qz=zj+ez*u;const dd=(cx-qx)**2+(cz-qz)**2;if(dd<best){best=dd;bx=qx;bz=qz;}}
     const dd=Math.sqrt(best);if(ins){px=bx-cx;pz=bz-cz;const l=Math.hypot(px,pz)||1;px/=l;pz/=l;d=dd+R;hit=true;}else if(dd<R&&dd>1e-5){px=(cx-bx)/dd;pz=(cz-bz)/dd;d=R-dd;hit=true;}}
    if(hit&&d>0){DV.x+=px*d*0.9;DV.z+=pz*d*0.9;if(d>depth){depth=d;nx=px;nz=pz;}}}}}
 for(const ch of ctx.chars){if(!ch.visible||ch.userData.noCollide||ch.parent!==ctx.scene)continue;const dx=DV.x-ch.position.x,dz=DV.z-ch.position.z;const dd=Math.hypot(dx,dz);if(dd<2.2&&dd>1e-3){const d=2.2-dd;DV.x+=dx/dd*d;DV.z+=dz/dd*d;if(d>depth){depth=d;nx=dx/dd;nz=dz/dd;}}}
 const a=ctx.walkArea;if(a){DV.x=clamp(DV.x,a.minX+4,a.maxX-4);DV.z=clamp(DV.z,a.minZ+4,a.maxZ-4);}
 if(depth>0){const vn=DV.vx*nx+DV.vz*nz;if(vn<0){const e=0.28;DV.vx-=(1+e)*vn*nx;DV.vz-=(1+e)*vn*nz;DV.vx*=0.86;DV.vz*=0.86;if(-vn>2.3&&DV.hitCD<=0){DV.hits++;DV.hitCD=0.7;DV.shake=Math.min(1,-vn/12);AUD.tone(70,0.25,'sawtooth',0.12);dvEl.dvHit.classList.add('on');setTimeout(()=>dvEl.dvHit.classList.remove('on'),180);}}}}
function dvAttach(c){DV.ctx=c;if(!c._police){try{c._police=policeCar(c);}catch(e){console.warn('police',e);}}DV.car=c._police||null;if(DV.car){DV.car.siren=DV.siren;placeCar(DV.car,DV.x,DV.z,DV.h);}}
function dvUpdate(dt,t,cam){if(!DV.on)return;
 // сцену пересобрали (смена качества графики) — пересаживаемся в новую; ушли в другую сцену — поездка прервана
 if(ART._cur!==DV.ctx){const c=ART._cur;if(c&&ART.curName===DV.scene)dvAttach(c);if(!DV.car||DV.ctx!==c){window.DRIVE.end();return;}}
 dt=Math.min(dt,0.05);const cfg=DV.cfg;const K=DV.keys,Tc=DV.touch;DV.t+=dt;
 const thr=(K.KeyW||K.ArrowUp||Tc.g)?1:0,brk=(K.KeyS||K.ArrowDown||Tc.b)?1:0,st=((K.KeyA||K.ArrowLeft||Tc.l)?1:0)-((K.KeyD||K.ArrowRight||Tc.r)?1:0),hb=K.Space?1:0;
 let fx=Math.sin(DV.h),fz=Math.cos(DV.h),rx=-fz,rz=fx;let vf=DV.vx*fx+DV.vz*fz,vr=DV.vx*rx+DV.vz*rz;const vmax=27;
 let a=0;if(thr){a=vf<-0.5?12:8.2*(1-clamp(vf/vmax,0,1))+0.6;}if(brk){a+=vf>0.6?-13:-4.6*(1+clamp(vf/8,-1,0));}
 if(!thr&&!brk)a-=Math.sign(vf)*Math.min(Math.abs(vf)/dt,1.4);a-=0.05*vf+0.0022*vf*Math.abs(vf);if(hb){a-=Math.sign(vf)*Math.min(Math.abs(vf)/dt,4.5);}
 vf+=a*dt;if(vf<-8)vf=-8;
 const ms=0.58/(1+Math.abs(vf)/9);DV.steer+=(st*ms-DV.steer)*Math.min(1,dt*(st?5:8));
 let yaw=vf/2.75*Math.tan(DV.steer);if(hb)yaw*=1.45;DV.h+=yaw*dt;
 vr*=Math.exp(-dt*(hb?1.3:9));if(hb&&Math.abs(vf)>6)vr+=-yaw*Math.abs(vf)*0.08*dt*10;
 fx=Math.sin(DV.h);fz=Math.cos(DV.h);rx=-fz;rz=fx;DV.vx=fx*vf+rx*vr;DV.vz=fz*vf+rz*vr;
 DV.x+=DV.vx*dt;DV.z+=DV.vz*dt;DV.hitCD=Math.max(0,DV.hitCD-dt);dvCollide();
 // машина
 const car=DV.car;placeCar(car,DV.x,DV.z,DV.h);car.brake=brk&&vf>0.3?1:0;const spin=vf*dt;car.wm.forEach(q=>{q.m.rotation.x+=spin/q.w.r;q.m.rotation.y=q.w.z>0?DV.steer:0;q.m.rotation.order='YXZ';});
 DRIVEAPI.pos.set(DV.x,0,DV.z);DRIVEAPI.fwd.set(fx,0,fz);DRIVEAPI.car.x=DV.x;DRIVEAPI.car.z=DV.z;DRIVEAPI.car.h=DV.h;DRIVEAPI.car.v=vf;
 // камера
 const back=vf<-1.5&&thr===0;DV.camYaw=lerpA(DV.camYaw,DV.h,Math.min(1,dt*(2.6+Math.abs(vf)*0.08)));
 const asp=cam.aspect||1.7,kA=asp<1.2?1+(1.2-asp)*0.9:1;// узкий (портретный) экран: камера дальше
 const dist=(7.6+clamp(vf,0,30)*0.08)*kA,hgt=(3.05+clamp(vf,0,30)*0.02)*Math.sqrt(kA);const cy=Math.sin(DV.camYaw),cz2=Math.cos(DV.camYaw);
 const tp=_ctr.set(DV.x+fx*3.0,1.35,DV.z+fz*3.0);const want=new T.Vector3(DV.x-cy*dist,hgt,DV.z-cz2*dist);if(DV.ctx.camCollide)DV.ctx.camCollide(want,new T.Vector3(DV.x,1.6,DV.z));
 if(!DV.camInit){DV.camPos.copy(want);DV.camLook.copy(tp);DV.camInit=true;}DV.camPos.lerp(want,Math.min(1,dt*7));DV.camLook.lerp(tp,Math.min(1,dt*10));
 cam.position.copy(DV.camPos);if(DV.shake>0){DV.shake=Math.max(0,DV.shake-dt*2.5);cam.position.x+=(Math.random()-0.5)*DV.shake*0.5;cam.position.y+=(Math.random()-0.5)*DV.shake*0.4;}cam.lookAt(DV.camLook);
 const fov=(52+clamp(vf,0,30)*0.42)*(asp<1?1.12:1);if(Math.abs(cam.fov-fov)>0.05){cam.fov+=(fov-cam.fov)*Math.min(1,dt*3);cam.updateProjectionMatrix();}
 // цели, реплики, время
 const g=cfg.goal;const gd=g?Math.hypot(DV.x-g.at[0],DV.z-g.at[1]):0;
 for(const b of DV.barkList){if(DV.barks.has(b.id))continue;if(Math.hypot(DV.x-b.at[0],DV.z-b.at[1])<(b.r||20)){DV.barks.add(b.id);try{cfg.onBark&&cfg.onBark(b.src);}catch(e){console.warn('bark',e);}}}
 DV.left=Math.max(0,DV.left-dt);
 // HUD
 dvEl.dvSpd.firstChild.textContent=Math.round(Math.abs(vf)*3.6);dvEl.dvSpd.lastChild.textContent='УДАРЫ '+DV.hits;
 const m=Math.floor(DV.left/60),sct=Math.floor(DV.left%60);dvEl.dvTime.textContent=(m<10?'0':'')+m+':'+(sct<10?'0':'')+sct;dvEl.dvTime.classList.toggle('low',DV.left<20);
 if(g){dvEl.dvGoal.lastChild.textContent=Math.round(gd)+' м';const P=_gp.set(g.at[0],2.5,g.at[1]);const behind=_gq.copy(P).applyMatrix4(cam.matrixWorldInverse).z>0;P.project(cam);let x=(P.x*0.5+0.5)*innerWidth,y=(-P.y*0.5+0.5)*innerHeight;if(behind){x=innerWidth-x;y=innerHeight-y;}const off=behind||x<40||x>innerWidth-40||y<60||y>innerHeight-60;x=clamp(x,40,innerWidth-40);y=clamp(y,80,innerHeight-80);dvEl.dvArr.style.left=x+'px';dvEl.dvArr.style.top=y+'px';dvEl.dvArr.classList.toggle('edge',off);dvEl.dvArr.lastChild.textContent=Math.round(gd)+' м';}
 dvMap();
 if(g&&gd<(g.r||14)&&!DV.finished){dvFinish(true);return;}if(DV.left<=0&&!DV.finished){dvFinish(false);return;}}
const lerpA=(a,b,k)=>a+angD(a,b)*k;
function dvMap(){const c=dvEl.dvMap;const x=c.getContext('2d');const W=c.width,H=c.height;const M=mapCanvas();const sc=M.scale*0.62*(W/180);
 x.save();x.clearRect(0,0,W,H);x.beginPath();x.arc(W/2,H/2,W/2-3,0,TAU);x.clip();x.fillStyle='rgba(8,12,18,.88)';x.fillRect(0,0,W,H);x.translate(W/2,H/2);x.rotate(DV.h+PI);x.scale(sc/M.scale,sc/M.scale);
 x.drawImage(M.canvas,-(DV.x-M.minX)*M.scale,-(DV.z-M.minZ)*M.scale);x.restore();x.save();x.translate(W/2,H/2);x.rotate(DV.h+PI);
 const g=DV.cfg.goal;if(g){const gx=(g.at[0]-DV.x)*sc,gz=(g.at[1]-DV.z)*sc;x.strokeStyle='rgba(242,181,76,.9)';x.lineWidth=3;x.setLineDash([8,8]);x.beginPath();x.moveTo(0,0);x.lineTo(gx,gz);x.stroke();x.setLineDash([]);x.fillStyle='#f2b54c';x.beginPath();x.arc(gx,gz,8,0,TAU);x.fill();}
 for(const c2 of (DV.ctx._cars||[])){if(!c2.alive)continue;const dx=(c2.x-DV.x)*sc,dz=(c2.z-DV.z)*sc;if(Math.abs(dx)>W||Math.abs(dz)>H)continue;x.fillStyle=c2.v>1?'#c9d3dc':'#6d7680';x.fillRect(dx-2.5,dz-2.5,5,5);}
 x.restore();x.save();x.translate(W/2,H/2);x.fillStyle=DV.siren?(Math.floor(DV.t*6)%2?'#ff4a3d':'#3a6bff'):'#58c8f0';x.beginPath();x.moveTo(0,-14);x.lineTo(10,12);x.lineTo(0,6);x.lineTo(-10,12);x.closePath();x.fill();x.restore();
 x.strokeStyle='rgba(88,200,240,.55)';x.lineWidth=3;x.beginPath();x.arc(W/2,H/2,W/2-3,0,TAU);x.stroke();}
function dvFinish(goal){if(DV.finished)return;DV.finished=true;const r={goal:!!goal,time:Math.round(DV.t*10)/10,hits:DV.hits};const res=DV.res;dvEnd();res&&res(r);}
function dvEnd(){if(!DV.on)return;DV.on=false;DRIVEAPI.active=false;dvSiren(false);DV.siren=false;DRIVEAPI.siren=false;if(dvRoot)dvRoot.hidden=true;ART.setCamControl(null);DV.keys={};DV.touch={l:0,r:0,g:0,b:0};const cam=ART._cam;if(cam){cam.fov=(ART._cur&&ART._cur.cam&&ART._cur.cam.fov)||45;cam.updateProjectionMatrix();}}
function dvBegin(cfg){dvDom();if(DV.on)dvEnd();return new Promise(res=>{const ctx=ART._cur;if(!ctx){res({goal:false,time:0,hits:0});return;}
 DV.cfg=Object.assign({},cfg);DV.ctx=ctx;DV.scene=ART.curName;DV.res=res;DV.finished=false;DV.hits=0;DV.t=0;DV.barks=new Set();DV.hitCD=0;DV.shake=0;DV.camInit=false;DV.steer=0;
 // машина: служебный внедорожник этой сцены (или создать в любой сцене города)
 if(!ctx._police){try{ctx._police=policeCar(ctx);}catch(e){console.warn('police',e);}}DV.car=ctx._police;if(!DV.car){res({goal:false,time:0,hits:0});return;}
 const st=resolvePt(ctx,cfg.start)||PTS.drive_start.slice();DV.x=st[0];DV.z=st[1];let h=st[2];if(h===undefined){const r=nearestRoad(st[0],st[1],2);h=r?Math.atan2(r.dx,r.dz):0;}DV.h=h;DV.camYaw=h;DV.vx=DV.vz=0;placeCar(DV.car,DV.x,DV.z,DV.h);
 const g=cfg.goal?Object.assign({},cfg.goal,{at:resolvePt(ctx,cfg.goal.at)||PTS.drive_goal.slice()}):{at:PTS.drive_goal.slice(),r:14,label:'Цель'};DV.cfg.goal=g;
 DV.barkList=(cfg.barks||[]).map(b=>({id:b.id,at:resolvePt(ctx,b.at)||[0,0],r:b.r||20,src:b})).filter(b=>b.at);
 DV.left=cfg.time||150;DRIVEAPI.active=true;DRIVEAPI.pos=new T.Vector3(DV.x,0,DV.z);DRIVEAPI.fwd=new T.Vector3(Math.sin(h),0,Math.cos(h));DRIVEAPI.car={x:DV.x,z:DV.z,h:DV.h,v:0};
 const touch=('ontouchstart' in window)||(window.matchMedia&&matchMedia('(pointer:coarse)').matches);dvEl.dvTouch.classList.toggle('show',!!touch);dvRoot.classList.toggle('touch',!!touch);
 // подсказка: на сенсорных экранах вместо клавиш — кнопки (хвост подсказки после первой точки сохраняется)
 let hint=cfg.hint||'W/S — газ и тормоз, A/D — руль, Space — ручник, H — сирена';if(touch){if(cfg.hintTouch)hint=cfg.hintTouch;else{const rest=/W\/S|A\/D/.test(hint)?hint.split(/\.\s+/).slice(1).join('. '):hint;hint='◀ ▶ — руль, ГАЗ и ТОРМОЗ, СИРЕНА — включить сирену.'+(rest?' '+rest:'');}}
 dvEl.dvGoal.firstChild.textContent=g.label||'Цель';dvEl.dvHint.textContent=hint;dvEl.dvHint.classList.remove('out');setTimeout(()=>dvEl.dvHint&&dvEl.dvHint.classList.add('out'),7000);
 dvRoot.hidden=false;DV.on=true;dvSiren(!!cfg.siren);ART.setCamControl(dvUpdate);});}
window.DRIVE={begin:dvBegin,_step:(dt,t,cam)=>dvUpdate(dt,t,cam||ART._cam),// _step: для тестов (ручной шаг симуляции)
 end(){if(DV.on){const r=DV.res;DV.finished=true;dvEnd();r&&r({goal:false,time:Math.round(DV.t*10)/10,hits:DV.hits});}},get active(){return DV.on;},get state(){return DV;},siren:dvSiren,get pos(){return DRIVEAPI.active?DRIVEAPI.pos:null;}};
})();
