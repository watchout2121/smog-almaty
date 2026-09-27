// ============================================================
// СМОГ · внешность героев (хук LOOKS.dress из makeHuman в art.js)
//  Альтаир  (dina) — лохматые тёмные волосы, рубашка с фламинго, короткий рукав, улыбка, часы
//  Никита-Х (erl)  — короткая стрижка, очки без оправы, усы и эспаньолка, красная водолазка, синий пиджак, диод
//  Никита-Х2 (x2)  — тот же корпус и лицо, без очков, тёмная водолазка, ровный синий диод
//  толпа           — ~8% людей в рубашках с фламинго
// Всё строится из геометрии RPM-аватара в bind-пространстве (метры, персонаж смотрит в +z, левая рука +x),
// кэшируется и делится между клонами; кости/скиннинг — из скелета клона.
// ============================================================
window.LOOKS=(()=>{
'use strict';
const T=THREE,LB=ART.lib,C=LB.C,rng=LB.rng,LOOK=LB.LOOK;
const V3=(x,y,z)=>new T.Vector3(x||0,y||0,z||0);
const sm=t=>t*t*(3-2*t),clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),ss=(a,b,x)=>sm(clamp((x-a)/(b-a),0,1));
const CACHE=new Map();const cached=(k,f)=>{if(!CACHE.has(k))CACHE.set(k,f());return CACHE.get(k);};
const lin=h=>C(h);
// мелкие блестящие детали не должны давать огромный bloom (порог 1.0 в HDR)
function noBloom(m,k){m.onBeforeCompile=sh=>{sh.fragmentShader=sh.fragmentShader.replace('gl_FragColor = vec4( outgoingLight, diffuseColor.a );','gl_FragColor = vec4( min(outgoingLight,vec3('+(k||0.9).toFixed(2)+')), diffuseColor.a );');};m.customProgramCacheKey=()=>'looksNB'+(k||0.9);return m;}

// ---------------- таблица образов ----------------
// skin — множитель к текстуре лица RPM (у рук/шеи цвет подгоняется под лицо)
Object.assign(LOOK.dina,{human:1,style:'altair',top:'#f4f1ea',bot:'#1c1f26',shoe:'#1b1511',skin:[0.93,0.77,0.63],beard:null,hair:'#18110d',customHair:1});
LOOK.erl=Object.assign(LOOK.erl||{},{human:1,android:1,style:'nikita',top:'#1b2848',bot:'#16191f',shoe:'#0a0a0c',skin:[1.0,0.95,0.94],beard:null,hair:'#140f0c',customHair:1,
 turtle:'#b3131d',glasses:1,led:'#4fb2ff',acc:'#6fb8ff',ledMode:'pulse'});
LOOK.x2=Object.assign({},LOOK.erl,{style:'nikita',top:'#14161b',turtle:'#1c2029',glasses:0,ledMode:'steady'});
for(const k in LOOK){const v=LOOK[k];if(v&&typeof v==='object'&&!v.key)v.key=k;}

// ---------------- утилиты bind-пространства ----------------
function meshes(model){const M={};model.traverse(o=>{if(o.isMesh&&!M[o.name])M[o.name]=o;});return M;}
function boneIdx(sk,name){return sk.bones.findIndex(b=>b.name===name);}
function bindMat(ref,name){const sk=ref.skeleton;const i=boneIdx(sk,name);if(i<0)return null;return new T.Matrix4().copy(sk.boneInverses[i]).invert().premultiply(new T.Matrix4().copy(ref.bindMatrix).invert());}
function bindPos(ref,name){const m=bindMat(ref,name);return m?V3().setFromMatrixPosition(m):null;}
// объект, заданный в bind-пространстве (матрица M), крепится к кости: двигается как вершины со 100% весом на ней
function attachBind(ref,boneName,obj,M){const sk=ref.skeleton;const i=boneIdx(sk,boneName);if(i<0)return false;const bone=sk.bones[i];
 const m=new T.Matrix4().multiplyMatrices(sk.boneInverses[i],ref.bindMatrix).multiply(M||new T.Matrix4());m.decompose(obj.position,obj.quaternion,obj.scale);bone.add(obj);return true;}
function skinnedLike(ref,geo,mat,name){const m=new T.SkinnedMesh(geo,mat);m.name=name||'looks';m.frustumCulled=false;m.castShadow=true;m.receiveShadow=true;ref.parent.add(m);m.bind(ref.skeleton,ref.bindMatrix);return m;}
function components(geo){const n=geo.attributes.position.count,idx=geo.index.array;const par=new Int32Array(n);for(let i=0;i<n;i++)par[i]=i;
 const f=a=>{while(par[a]!==a){par[a]=par[par[a]];a=par[a];}return a;};
 for(let t=0;t<idx.length;t+=3){const a=f(idx[t]),b=f(idx[t+1]),c=f(idx[t+2]);par[b]=a;par[f(c)]=a;}
 const comp=new Int32Array(n),map=new Map();for(let i=0;i<n;i++){const r=f(i);if(!map.has(r))map.set(r,map.size);comp[i]=map.get(r);}
 const P=geo.attributes.position;const info=[];for(let i=0;i<map.size;i++)info.push({n:0,min:V3(1e9,1e9,1e9),max:V3(-1e9,-1e9,-1e9)});
 const v=V3();for(let i=0;i<n;i++){const c=info[comp[i]];v.fromBufferAttribute(P,i);c.n++;c.min.min(v);c.max.max(v);}
 return {comp,info};}
const geoOut=(o)=>{const g=new T.BufferGeometry();for(const k in o.a)g.setAttribute(k,new T.Float32BufferAttribute(o.a[k][0],o.a[k][1]));if(o.i)g.setIndex(o.i);return g;};
// лицо RPM: средний цвет (лин.) ≈ 192,148,140; тело (кисти) 185,131,119 — подгоняем кисти/руки под лицо
const FACE_LIN=[0.527,0.296,0.262],BODY_LIN=[0.485,0.227,0.184];
function skinK(L){return L.skin&&L.skin.length===3&&typeof L.skin[0]==='number'?L.skin:[1,0.85,0.72];}
function matchSkin(M,L){const k=skinK(L);const head=M.Wolf3D_Head,body=M.Wolf3D_Body;
 if(head){head.material.color.setRGB(k[0],k[1],k[2]);head.material.roughness=L.style==='nikita'?0.64:0.7;}
 if(body)body.material.color.setRGB(k[0]*FACE_LIN[0]/BODY_LIN[0],k[1]*FACE_LIN[1]/BODY_LIN[1],k[2]*FACE_LIN[2]/BODY_LIN[2]);
 return new T.Color(FACE_LIN[0]*k[0],FACE_LIN[1]*k[1],FACE_LIN[2]*k[2]);}

// ---------------- голова: сварка вершин, нормали, лучи ----------------
function headData(head){return cached('head:'+head.geometry.uuid,()=>{const g=head.geometry,P=g.attributes.position,N=g.attributes.normal,n=P.count;
 const map=new Map(),uid=new Int32Array(n),up=[],un=[];const v=V3(),w=V3();
 for(let i=0;i<n;i++){v.fromBufferAttribute(P,i);const k=Math.round(v.x*2e4)+'|'+Math.round(v.y*2e4)+'|'+Math.round(v.z*2e4);let j=map.get(k);if(j===undefined){j=up.length;map.set(k,j);up.push(v.clone());un.push(V3());}uid[i]=j;un[j].add(w.fromBufferAttribute(N,i));}
 un.forEach(q=>q.normalize());
 const rc=new T.Mesh(g,new T.MeshBasicMaterial({side:T.DoubleSide}));rc.updateMatrixWorld(true);const ray=new T.Raycaster();
 const cast=(o,d)=>{ray.set(o,d.clone().normalize());ray.near=0;ray.far=2;const h=ray.intersectObject(rc,false);return h.length?h[0]:null;};
 const upper=[];up.forEach((p,i)=>{if(p.y>1.49)upper.push(i);});
 const nearest=p=>{let bi=upper[0],bd=1e9;for(const i of upper){const q=up[i];const dx=q.x-p.x,dy=q.y-p.y,dz=q.z-p.z;const d=dx*dx+dy*dy+dz*dz;if(d<bd){bd=d;bi=i;}}return bi;};
 const push=(p,off)=>{const i=nearest(p);const d=w.subVectors(p,up[i]).dot(un[i]);if(d<off)p.addScaledVector(un[i],off-d);return un[i];};
 // фронтальная проекция лица: сетка z/uv (растеризация треугольников) — вместо тысяч лучей при рисовании бровей/бороды
 const G=256,X0=-0.1,X1=0.1,Y0=1.5,Y1=1.86;const zb=new Float32Array(G*G).fill(-1e9),ub=new Float32Array(G*G*2);const UV=g.attributes.uv,idx=g.index.array;
 const gx=x=>(x-X0)/(X1-X0)*G,gy=y=>(y-Y0)/(Y1-Y0)*G;
 for(let t=0;t<idx.length;t+=3){const i0=idx[t],i1=idx[t+1],i2=idx[t+2];const ax=gx(P.getX(i0)),ay=gy(P.getY(i0)),az=P.getZ(i0),bx=gx(P.getX(i1)),by=gy(P.getY(i1)),bz=P.getZ(i1),cx=gx(P.getX(i2)),cy=gy(P.getY(i2)),cz=P.getZ(i2);
  const den=(by-cy)*(ax-cx)+(cx-bx)*(ay-cy);if(Math.abs(den)<1e-9)continue;const mnx=Math.max(0,Math.floor(Math.min(ax,bx,cx))),mxx=Math.min(G-1,Math.ceil(Math.max(ax,bx,cx))),mny=Math.max(0,Math.floor(Math.min(ay,by,cy))),mxy=Math.min(G-1,Math.ceil(Math.max(ay,by,cy)));
  for(let yy=mny;yy<=mxy;yy++)for(let xx=mnx;xx<=mxx;xx++){const px=xx+0.5,py=yy+0.5;const w0=((by-cy)*(px-cx)+(cx-bx)*(py-cy))/den,w1=((cy-ay)*(px-cx)+(ax-cx)*(py-cy))/den,w2=1-w0-w1;if(w0<-1e-4||w1<-1e-4||w2<-1e-4)continue;
   const z=w0*az+w1*bz+w2*cz,k=yy*G+xx;if(z>zb[k]){zb[k]=z;ub[k*2]=w0*UV.getX(i0)+w1*UV.getX(i1)+w2*UV.getX(i2);ub[k*2+1]=w0*UV.getY(i0)+w1*UV.getY(i1)+w2*UV.getY(i2);}}}
 const front=(x,y)=>{const fx=gx(x)-0.5,fy=gy(y)-0.5,ix=Math.floor(fx),iy=Math.floor(fy);if(ix<0||iy<0||ix>=G-1||iy>=G-1)return cast(V3(x,y,0.5),V3(0,0,-1));
  const tx=fx-ix,ty=fy-iy,ks=[iy*G+ix,iy*G+ix+1,(iy+1)*G+ix,(iy+1)*G+ix+1],ws=[(1-tx)*(1-ty),tx*(1-ty),(1-tx)*ty,tx*ty];
  if(ks.some(k=>zb[k]<-1e8))return cast(V3(x,y,0.5),V3(0,0,-1));
  let u0=ub[ks[0]*2],v0=ub[ks[0]*2+1];if(ks.some(k=>Math.abs(ub[k*2]-u0)>0.04||Math.abs(ub[k*2+1]-v0)>0.04)){const k=ks[ws.indexOf(Math.max(...ws))];return {point:V3(x,y,zb[k]),uv:{x:ub[k*2],y:ub[k*2+1]}};}
  let z=0,u=0,v=0;ks.forEach((k,j)=>{z+=zb[k]*ws[j];u+=ub[k*2]*ws[j];v+=ub[k*2+1]*ws[j];});return {point:V3(x,y,z),uv:{x:u,y:v}};};
 return {g,uid,up,un,cast,nearest,push,front};});}

// ---------------- линия роста волос ----------------
const ZC=0.012;const azim=p=>Math.atan2(p.x,p.z-ZC);
// высота линии роста в зависимости от азимута: лоб, угол виска, висок→бакенбард, над ухом, за ухом, затылок
const HL={altair:[1.796,1.788,1.703,1.744,1.652,1.618],nikita:[1.789,1.786,1.705,1.752,1.664,1.632]};
function hairY(a,h){return h[0]+(h[1]-h[0])*ss(0.3,0.62,a)+(h[2]-h[1])*ss(1.05,1.2,a)+(h[3]-h[2])*ss(1.34,1.46,a)+(h[4]-h[3])*ss(1.9,2.3,a)+(h[5]-h[4])*ss(2.3,3.0,a);}
function isEar(p){return Math.abs(p.x)>0.0745&&p.y<1.772&&p.z>-0.035&&p.z<0.05;}
function hairMask(p,h){const yh=hairY(Math.abs(azim(p)),h);return isEar(p)?0:ss(yh-0.002,yh+0.01,p.y);}
const HAIRF=`float lh1(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float lvn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(lh1(i),lh1(i+vec2(1.,0.)),f.x),mix(lh1(i+vec2(0.,1.)),lh1(i+vec2(1.,1.)),f.x),f.y);}
float hstr(vec2 p){return lvn(p)*0.6+lvn(p*vec2(2.3,1.7)+7.1)*0.4;}
float hairY(float a,vec3 A,vec3 B){return A.x+(A.y-A.x)*smoothstep(0.3,0.62,a)+(A.z-A.y)*smoothstep(1.05,1.2,a)+(B.x-A.z)*smoothstep(1.34,1.46,a)+(B.y-B.x)*smoothstep(1.9,2.3,a)+(B.z-B.y)*smoothstep(2.3,3.0,a);}
`;

// ---------------- оболочка скальпа (скиннинг как у головы) ----------------
function shellGeo(head,hd,h,offFn,key){return cached('shell:'+key+':'+head.geometry.uuid,()=>{
 const g=head.geometry,P=g.attributes.position,SI=g.attributes.skinIndex,SW=g.attributes.skinWeight,idx=g.index.array;const v=V3();
 const m=new Float32Array(P.count);for(let i=0;i<P.count;i++){v.fromBufferAttribute(P,i);m[i]=hairMask(v,h);}
 const used=new Map(),pos=[],nor=[],base=[],mm=[],si=[],sw=[],ix=[];
 const add=i=>{let j=used.get(i);if(j!==undefined)return j;j=used.size;used.set(i,j);v.fromBufferAttribute(P,i);const n=hd.un[hd.uid[i]];const o=offFn(v,m[i]);
  pos.push(v.x+n.x*o,v.y+n.y*o,v.z+n.z*o);nor.push(n.x,n.y,n.z);base.push(v.x,v.y,v.z);mm.push(m[i]);si.push(SI.getX(i),SI.getY(i),SI.getZ(i),SI.getW(i));sw.push(SW.getX(i),SW.getY(i),SW.getZ(i),SW.getW(i));return j;};
 for(let t=0;t<idx.length;t+=3){const a=idx[t],b=idx[t+1],c=idx[t+2];if(Math.max(m[a],m[b],m[c])<=0.001)continue;ix.push(add(a),add(b),add(c));}
 return geoOut({a:{position:[pos,3],normal:[nor,3],aBase:[base,3],aM:[mm,1],skinIndex:[si,4],skinWeight:[sw,4]},i:ix});});}
function hairShellMat(col,h,o){const m=new T.MeshPhysicalMaterial({color:lin(col),roughness:o.rough||0.5,metalness:0,reflectivity:0.25,skinning:true});
 const u={uHa:{value:V3(h[0],h[1],h[2])},uHb:{value:V3(h[3],h[4],h[5])},uStr:{value:o.str||110},uEdge:{value:o.edge||0.45}};
 m.onBeforeCompile=sh=>{Object.assign(sh.uniforms,u);
  sh.vertexShader='attribute vec3 aBase;attribute float aM;varying vec3 vBase;varying float vM;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n vBase=aBase;vM=aM;');
  sh.fragmentShader='uniform vec3 uHa;uniform vec3 uHb;uniform float uStr;uniform float uEdge;varying vec3 vBase;varying float vM;\n'+HAIRF+sh.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 {float a=abs(atan(vBase.x,vBase.z-${ZC}));float yh=hairY(a,uHa,uHb);float mm=smoothstep(yh-0.002,yh+0.010,vBase.y);float st=hstr(vec2(a*uStr,vBase.y*16.0));
  if(vM<0.002||mm+(st-0.5)*uEdge<0.5)discard;diffuseColor.rgb*=(0.62+0.62*st)*mix(0.75,1.0,mm);}`);};
 m.customProgramCacheKey=()=>'looksHairShell';return m;}

// ---------------- пряди (жёсткие, на кости Head) ----------------
function strandTex(){return cached('tex:strand',()=>{const t=LB.canvasTex(64,256,(x,w,h)=>{const R=rng(5);x.fillStyle='#b8b8b8';x.fillRect(0,0,w,h);
  for(let i=0;i<220;i++){const v=110+R()*145|0;x.strokeStyle=`rgba(${v},${v},${v},${0.35+R()*0.5})`;x.lineWidth=0.6+R()*1.6;const px=R()*w;x.beginPath();x.moveTo(px,0);x.bezierCurveTo(px+(R()-0.5)*6,h*0.33,px+(R()-0.5)*6,h*0.66,px+(R()-0.5)*8,h);x.stroke();}
  const g=x.createLinearGradient(0,0,0,h);g.addColorStop(0,'rgba(0,0,0,.35)');g.addColorStop(0.25,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(255,255,255,.12)');x.fillStyle=g;x.fillRect(0,0,w,h);},false);t.wrapS=T.RepeatWrapping;return t;});}
function clumpGeo(hd,P){return cached('clumps:'+P.key,()=>{
 const R=rng(P.seed||7);const g=hd.g,Pp=g.attributes.position,idx=g.index.array,h=P.h;const a=V3(),b=V3(),c=V3();
 const tri=[];let area=0;
 for(let t=0;t<idx.length;t+=3){a.fromBufferAttribute(Pp,idx[t]);b.fromBufferAttribute(Pp,idx[t+1]);c.fromBufferAttribute(Pp,idx[t+2]);
  if(Math.min(hairMask(a,h),hairMask(b,h),hairMask(c,h))<(P.minMask||0.6))continue;if(P.rootMinY&&Math.min(a.y,b.y,c.y)<P.rootMinY)continue;area+=V3().subVectors(b,a).cross(V3().subVectors(c,a)).length()/2;tri.push([idx[t],idx[t+1],idx[t+2],area]);}
 const pick=()=>{const r=R()*area;let lo=0,hi=tri.length-1;while(lo<hi){const mid=(lo+hi)>>1;if(tri[mid][3]<r)lo=mid+1;else hi=mid;}return tri[lo];};
 const pos=[],nor=[],uv=[],col=[],ix=[];const RS=6,K=P.seg||8;
 for(let k=0;k<P.count;k++){const t=pick();let u=R(),w=R();if(u+w>1){u=1-u;w=1-w;}
  a.fromBufferAttribute(Pp,t[0]);b.fromBufferAttribute(Pp,t[1]);c.fromBufferAttribute(Pp,t[2]);const root=a.clone().multiplyScalar(1-u-w).addScaledVector(b,u).addScaledVector(c,w);
  const n=hd.un[hd.uid[t[0]]].clone().multiplyScalar(1-u-w).addScaledVector(hd.un[hd.uid[t[1]]],u).addScaledVector(hd.un[hd.uid[t[2]]],w).normalize();
  const len=P.len(root,R),w0=P.width(root,R),lift=P.lift(root,R),grav=P.grav*(0.7+0.6*R());
  let d=P.flow(root,n,R).addScaledVector(n,lift).normalize();
  const pts=[root.clone().addScaledVector(n,P.rootOff||0.001)],nrm=[n.clone()];const step=len/K;
  const hug=P.hug===undefined?0.75:P.hug;for(let s=1;s<=K;s++){const t01=s/K;d.y-=grav*step;d.normalize();const p=pts[s-1].clone().addScaledVector(d,step);const nn=hd.push(p,P.off(t01,root,R,p));d.copy(p).sub(pts[s-1]).normalize();const dn=d.dot(nn);if(dn>0)d.addScaledVector(nn,-dn*hug).normalize();pts.push(p);nrm.push(nn.clone());}
  const shade=P.shade?P.shade(R):0.8+0.4*R();const base=pos.length/3;
  for(let s=0;s<=K;s++){const t01=s/K;const p=pts[s];const tg=pts[Math.min(K,s+1)].clone().sub(pts[Math.max(0,s-1)]).normalize();
   const bn=tg.clone().cross(nrm[s]);if(bn.lengthSq()<1e-8)bn.set(1,0,0);bn.normalize();const e=bn.clone().cross(tg).normalize();
   const ww=w0*Math.pow(1-t01,P.taper||0.75)+0.0006,th=ww*(P.flat||0.32)+0.0004;
   for(let q=0;q<RS;q++){const an=q/RS*Math.PI*2,ca=Math.cos(an),sa=Math.sin(an);pos.push(p.x+bn.x*ca*ww+e.x*sa*th,p.y+bn.y*ca*ww+e.y*sa*th,p.z+bn.z*ca*ww+e.z*sa*th);
    const nx=bn.x*ca/ww+e.x*sa/th,ny=bn.y*ca/ww+e.y*sa/th,nz=bn.z*ca/ww+e.z*sa/th,nl=Math.hypot(nx,ny,nz)||1;nor.push(nx/nl,ny/nl,nz/nl);uv.push(q/RS,t01);col.push(shade,shade,shade);}}
  for(let s=0;s<K;s++)for(let q=0;q<RS;q++){const i0=base+s*RS+q,i1=base+s*RS+(q+1)%RS,j0=i0+RS,j1=i1+RS;ix.push(i0,i1,j0,i1,j1,j0);}}
 return geoOut({a:{position:[pos,3],normal:[nor,3],uv:[uv,2],color:[col,3]},i:ix});});}
function addClumps(head,hd,P,col,rough){const g=clumpGeo(hd,P);const m=new T.Mesh(g,new T.MeshPhysicalMaterial({color:lin(col),map:strandTex(),roughness:rough||0.5,metalness:0,reflectivity:0.25,vertexColors:true,side:T.DoubleSide}));
 m.castShadow=true;m.receiveShadow=true;m.frustumCulled=false;m.name='looksHairClumps';attachBind(head,'Head',m);return m;}

// ---------------- лицо: брови, морщинки (копия текстуры головы) ----------------
function faceTex(head,hd,style){return cached('faceTex:'+style,()=>{const img=head.material.map&&head.material.map.image;if(!img)return null;const W=img.width,H=img.height;
 const cv=document.createElement('canvas');cv.width=W;cv.height=H;const x=cv.getContext('2d');x.drawImage(img,0,0);const R=rng(style==='altair'?3:9);
 const uvp=(X,Y)=>{const h=hd.front(X,Y);return h&&h.uv?[h.uv.x*W,h.uv.y*H]:null;};
 const stroke=(p0,p1,wd,c)=>{if(!p0||!p1)return;x.strokeStyle=c;x.lineWidth=wd;x.beginPath();x.moveTo(p0[0],p0[1]);x.lineTo(p1[0],p1[1]);x.stroke();};
 const alt=style==='altair';x.lineCap='round';
 // спрятать исходные брови RPM (оливковые) под тон кожи со лба
 {const sd=x.getImageData(W*0.47|0,H*0.2|0,12,12).data;let r=0,gg=0,b=0;for(let i=0;i<sd.length;i+=4){r+=sd[i];gg+=sd[i+1];b+=sd[i+2];}const n=sd.length/4;
  x.filter='blur(5px)';x.fillStyle=`rgb(${r/n|0},${gg/n|0},${b/n|0})`;for(const [cx,cy] of [[0.418,0.283],[0.586,0.283]]){x.beginPath();x.ellipse(cx*W,cy*H,0.066*W,0.03*H,0,0,Math.PI*2);x.fill();}x.filter='none';}
 // брови: от переносицы к виску, дугой
 for(const sd of [-1,1]){const th0=alt?0.0066:0.0044;
  const B=s=>[sd*(0.0115+0.045*s),1.7465+0.0066*Math.sin(Math.PI*Math.min(1,s*1.15))-0.002*s];
  const up=[],dn=[];for(let i=0;i<=16;i++){const s=i/16;const [bx,by]=B(s);const th=th0*(1-0.55*s)+0.0012;up.push(uvp(bx,by+th*0.55));dn.push(uvp(bx,by-th*0.45));}
  if(up.every(Boolean)&&dn.every(Boolean)){x.filter='blur(1.5px)';x.fillStyle=alt?'rgba(52,34,24,.34)':'rgba(30,22,18,.34)';x.beginPath();up.forEach((p,i)=>i?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1]));dn.reverse().forEach(p=>x.lineTo(p[0],p[1]));x.closePath();x.fill();x.filter='none';}
  for(let i=0;i<(alt?300:200);i++){const s=R();const [bx,by]=B(s);const th=th0*(1-0.55*s)+0.001;const yy=by+(R()-0.5)*th;const L=0.0035+R()*0.003;
   const ang=0.25+R()*0.35-s*0.2;stroke(uvp(bx,yy),uvp(bx+sd*Math.cos(ang)*L,yy+Math.sin(ang)*L*0.7),0.9+R()*0.9,`rgba(${26+R()*24|0},${17+R()*16|0},${12+R()*10|0},${0.28+R()*0.3})`);}}
 if(alt){// носогубные складки, «гусиные лапки», лёгкая щетина по контуру — ему за сорок и он всё время улыбается
  x.lineCap='round';for(const sd of [-1,1]){for(let k=0;k<5;k++){const pts=[];for(let i=0;i<=10;i++){const t=i/10;pts.push(uvp(sd*(0.0185+0.012*t+0.003*Math.sin(t*3)),1.690-0.034*t));}
    if(pts.every(Boolean)){x.strokeStyle=`rgba(105,52,40,${0.03+k*0.009})`;x.lineWidth=9-k*1.6;x.beginPath();pts.forEach((p,i)=>i?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1]));x.stroke();}}
   for(let k=0;k<3;k++){const y0=1.726+(k-1)*0.004;const a0=uvp(sd*0.051,y0),a1=uvp(sd*0.061,y0+(k-1)*0.004);stroke(a0,a1,2,'rgba(110,60,48,.09)');}
   // мешки под глазами (мягкая дуга)
   {const pts=[];for(let i=0;i<=8;i++){const t=i/8;pts.push(uvp(sd*(0.017+0.027*t),1.7135-0.0035*Math.sin(Math.PI*t)));}if(pts.every(Boolean)){x.filter='blur(2px)';x.strokeStyle='rgba(100,52,44,.08)';x.lineWidth=4;x.beginPath();pts.forEach((p,i)=>i?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1]));x.stroke();x.filter='none';}}}
  // едва заметная тень щетины по челюсти и над губой (гладко выбрит, но к вечеру)
  const jaw=[];for(let i=0;i<=24;i++){const t=i/24*2-1;jaw.push(uvp(t*0.052,1.612+0.05*Math.pow(Math.abs(t),1.6)));}
  const jaw2=[];for(let i=24;i>=0;i--){const t=i/24*2-1;jaw2.push(uvp(t*0.03,1.652+0.028*Math.pow(Math.abs(t),2)));}
  if(jaw.every(Boolean)&&jaw2.every(Boolean)){x.filter='blur(6px)';x.fillStyle='rgba(58,40,36,.095)';x.beginPath();[...jaw,...jaw2].forEach((p,i)=>i?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1]));x.closePath();x.fill();x.filter='none';}}
 else{// Никита: ровный «фарфоровый» тон, лёгкий шов под челюстью
  const g=x.createRadialGradient(W*0.5,H*0.38,W*0.05,W*0.5,H*0.38,W*0.3);g.addColorStop(0,'rgba(255,246,240,.10)');g.addColorStop(1,'rgba(255,246,240,0)');x.fillStyle=g;x.fillRect(0,0,W,H);}
 const t=new T.CanvasTexture(cv);t.flipY=false;t.encoding=T.sRGBEncoding;t.anisotropy=8;return t;});}

// ---------------- усы + эспаньолка (оболочка лица с морфами рта) ----------------
function beardTex(hd,W){return cached('tex:beard',()=>{const cv=document.createElement('canvas');cv.width=cv.height=W;const x=cv.getContext('2d');const R=rng(12);
 const uvp=(X,Y)=>{const h=hd.front(X,Y);return h&&h.uv?[h.uv.x*W,h.uv.y*W]:null;};
 const poly=(pts,fill)=>{const q=pts.map(p=>uvp(p[0],p[1]));if(!q.every(Boolean))return;x.fillStyle=fill;x.beginPath();q.forEach((p,i)=>i?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1]));x.closePath();x.fill();};
 const shapes=[];
 // усы: под носом до верхней губы, концы к уголкам рта
 const must=[];for(let i=0;i<=14;i++){const t=i/14*2-1,ax=Math.abs(t);must.push([t*0.0292,1.6875-0.0105*Math.pow(ax,1.5)]);}
 for(let i=14;i>=0;i--){const t=i/14*2-1,ax=Math.abs(t);must.push([t*0.0302,1.6712-0.0085*Math.pow(ax,2.2)+0.0012*(1-ax)]);}
 shapes.push(must);
 // эспаньолка: от нижней губы до низа подбородка + «якорь» у уголков рта
 const goat=[];const gw=y=>0.0085+0.0165*ss(1.646,1.628,y)-0.004*ss(1.618,1.604,y);
 for(let i=0;i<=12;i++){const y=1.6445-0.0405*i/12;goat.push([gw(y),y]);}for(let i=12;i>=0;i--){const y=1.6445-0.0405*i/12;goat.push([-gw(y),y]);}
 shapes.push(goat);
 for(const sd of [-1,1]){shapes.push([[sd*0.0262,1.6655],[sd*0.0312,1.664],[sd*0.0292,1.636],[sd*0.0232,1.628],[sd*0.0238,1.6405]]);}
 x.clearRect(0,0,W,W);x.filter='blur(2px)';for(const s of shapes)poly(s,'rgba(24,18,15,1)');x.filter='none';
 // пряди: короткие штрихи вниз-наружу, по краю — рваная кромка
 x.lineCap='round';const ID=x.getImageData(0,0,W,W).data;const inside=(X,Y)=>{const p=uvp(X,Y);if(!p)return false;return ID[((p[1]|0)*W+(p[0]|0))*4+3]>128;};
 for(let i=0;i<1400;i++){const X=(R()-0.5)*0.066,Y=1.6+R()*0.092;if(!inside(X,Y))continue;const sd=Math.sign(X)||1;const L=0.0022+R()*0.0028;const ang=-Math.PI/2+sd*(0.25+R()*0.5)*(Y>1.66?1.4:0.6);
  const p0=uvp(X,Y),p1=uvp(X+Math.cos(ang)*L,Y+Math.sin(ang)*L);if(!p0||!p1)continue;const v=R();x.strokeStyle=`rgba(${14+v*34|0},${10+v*26|0},${8+v*20|0},1)`;x.lineWidth=0.9+R()*1.3;x.beginPath();x.moveTo(p0[0],p0[1]);x.lineTo(p1[0],p1[1]);x.stroke();}
 const t=new T.CanvasTexture(cv);t.flipY=false;t.encoding=T.sRGBEncoding;t.anisotropy=8;return t;});}
function beardGeo(head,hd){return cached('beardGeo:'+head.geometry.uuid,()=>{const g=head.geometry,P=g.attributes.position,UV=g.attributes.uv,SI=g.attributes.skinIndex,SW=g.attributes.skinWeight,idx=g.index.array;const MA=g.morphAttributes.position||[];
 const v=V3();const inReg=i=>{v.fromBufferAttribute(P,i);return v.z>0.07&&v.y>1.596&&v.y<1.697&&Math.abs(v.x)<0.042;};
 const used=new Map(),pos=[],nor=[],uv=[],si=[],sw=[],ix=[],mp=MA.map(()=>[]);
 const add=i=>{let j=used.get(i);if(j!==undefined)return j;j=used.size;used.set(i,j);v.fromBufferAttribute(P,i);const n=hd.un[hd.uid[i]];const o=0.0014+0.0012*ss(0.035,0.0,Math.abs(v.x));
  pos.push(v.x+n.x*o,v.y+n.y*o,v.z+n.z*o);nor.push(n.x,n.y,n.z);uv.push(UV.getX(i),UV.getY(i));si.push(SI.getX(i),SI.getY(i),SI.getZ(i),SI.getW(i));sw.push(SW.getX(i),SW.getY(i),SW.getZ(i),SW.getW(i));
  MA.forEach((m,k)=>mp[k].push(m.getX(i),m.getY(i),m.getZ(i)));return j;};
 for(let t=0;t<idx.length;t+=3){const a=idx[t],b=idx[t+1],c=idx[t+2];if(inReg(a)&&inReg(b)&&inReg(c))ix.push(add(a),add(b),add(c));}
 const out=geoOut({a:{position:[pos,3],normal:[nor,3],uv:[uv,2],skinIndex:[si,4],skinWeight:[sw,4]},i:ix});
 if(MA.length){out.morphAttributes.position=mp.map(a=>new T.Float32BufferAttribute(a,3));out.morphTargetsRelative=!!g.morphTargetsRelative;}return out;});}
function addBeard(a,head,hd,col){const tex=beardTex(hd,1024);const mat=new T.MeshStandardMaterial({map:tex,color:lin(col||'#ffffff'),transparent:true,depthWrite:false,alphaTest:0.04,roughness:0.78,metalness:0,skinning:true,morphTargets:true});
 const m=skinnedLike(head,beardGeo(head,hd),mat,'looksBeard');m.castShadow=false;m.morphTargetDictionary=Object.assign({},head.morphTargetDictionary||{mouthOpen:0,mouthSmile:1});
 m.morphTargetInfluences=new Array(Object.keys(m.morphTargetDictionary).length).fill(0);a.morphs.push(m);return m;}

// ---------------- ткань: принт «фламинго» ----------------
function flamingoTex(){return cached('tex:flamingo',()=>{const W=512;const t=LB.canvasTex(W,W,(x,w,h)=>{
  x.fillStyle='#f7f4ec';x.fillRect(0,0,w,h);const R=rng(41);
  const wrap=fn=>{for(const dx of [-w,0,w])for(const dy of [-h,0,h]){x.save();x.translate(dx,dy);fn();x.restore();}};
  const frond=(cx,cy,ang,len,c1,c2)=>wrap(()=>{x.save();x.translate(cx,cy);x.rotate(ang);x.lineCap='round';
   const pts=[];for(let i=0;i<=20;i++){const t=i/20;pts.push([t*len,Math.sin(t*2.2)*len*0.12]);}
   for(let i=2;i<20;i++){const [px,py]=pts[i];const t=i/20;const L=len*0.36*Math.sin(Math.PI*Math.min(1,t*1.05))+8;for(const sd of [-1,1]){
     x.fillStyle=(i+(sd>0?1:0))%2?c1:c2;x.beginPath();x.moveTo(px-4,py);x.quadraticCurveTo(px+L*0.35,py+sd*L*0.55,px+L*0.62,py+sd*L*0.98);x.quadraticCurveTo(px+L*0.2,py+sd*L*0.42,px+6,py);x.closePath();x.fill();}}
   x.strokeStyle='#2c5e33';x.lineWidth=4;x.beginPath();pts.forEach(([px,py],i)=>i?x.lineTo(px,py):x.moveTo(px,py));x.stroke();x.restore();});
  const flam=(cx,cy,s,flip,rot)=>wrap(()=>{x.save();x.translate(cx,cy);x.rotate(rot||0);x.scale(flip?-s:s,s);x.lineCap='round';x.lineJoin='round';
   x.strokeStyle='#d9587f';x.lineWidth=3;x.beginPath();x.moveTo(-2,18);x.lineTo(-1,66);x.stroke();x.beginPath();x.moveTo(6,18);x.lineTo(10,40);x.lineTo(-6,46);x.stroke();
   x.fillStyle='#f27ba1';x.beginPath();x.ellipse(0,6,24,14,-0.25,0,Math.PI*2);x.fill();
   x.fillStyle='#e0527f';x.beginPath();x.moveTo(-20,4);x.quadraticCurveTo(0,-10,22,2);x.quadraticCurveTo(4,10,-24,15);x.closePath();x.fill();
   x.fillStyle='#bf3a68';x.beginPath();x.moveTo(-23,8);x.lineTo(-37,13);x.lineTo(-21,14);x.closePath();x.fill();
   x.strokeStyle='#f48bb0';x.lineWidth=7;x.beginPath();x.moveTo(17,0);x.bezierCurveTo(32,-10,10,-24,14,-38);x.bezierCurveTo(17,-49,29,-49,29,-40);x.stroke();
   x.fillStyle='#f48bb0';x.beginPath();x.arc(27,-41,6,0,Math.PI*2);x.fill();
   x.fillStyle='#fff0e4';x.beginPath();x.moveTo(30,-45);x.lineTo(40,-37);x.lineTo(35,-31);x.lineTo(29,-36);x.closePath();x.fill();
   x.fillStyle='#1d1a1a';x.beginPath();x.moveTo(36.5,-40);x.lineTo(40,-37);x.lineTo(35,-31);x.lineTo(34,-36);x.closePath();x.fill();
   x.fillStyle='#202020';x.beginPath();x.arc(26.5,-42.5,1.4,0,Math.PI*2);x.fill();x.restore();});
  const G=['#2f8a4c','#3fa65e','#257341','#4fb36a'];
  for(let i=0;i<6;i++)frond(R()*w,R()*h,R()*Math.PI*2,120+R()*70,G[i%4],G[(i+1)%4]);
  const F=[[100,140,1.6,0,0.05],[360,110,1.45,1,-0.08],[240,350,1.7,0,0.1],[455,420,1.35,1,0]];
  for(const f of F)flam(f[0],f[1],f[2],!!f[3],f[4]);
  for(let i=0;i<2;i++)frond(R()*w,R()*h,R()*Math.PI*2,80+R()*40,'#56b872','#2f8a4c');
  x.globalAlpha=0.06;for(let i=0;i<5000;i++){x.fillStyle=R()<0.5?'#000':'#fff';x.fillRect(R()*w,R()*h,1,1);}x.globalAlpha=1;
 },true,[1,1]);t.wrapS=t.wrapT=T.RepeatWrapping;return t;});}
function knitTex(){return cached('tex:knit',()=>{const t=LB.canvasTex(64,64,(x,w,h)=>{x.fillStyle='#9a9a9a';x.fillRect(0,0,w,h);for(let i=0;i<w;i+=4){x.fillStyle='#d8d8d8';x.fillRect(i,0,2,h);x.fillStyle='#707070';x.fillRect(i+3,0,1,h);}const R=rng(2);for(let i=0;i<300;i++){x.fillStyle=`rgba(0,0,0,${R()*0.12})`;x.fillRect(R()*w,R()*h,1,2);}},false);t.wrapS=t.wrapT=T.RepeatWrapping;return t;});}

// ---------------- верх: «фрак» RPM → рубашка / пиджак+водолазка ----------------
// острова RPM: фрак (coat), рукава, жилет (vest), манишка/воротник/манжеты рубашки, бабочка, бутоньерка, пуговицы
const REF={coat:0.225,sleeve:0.268,vest:0.102,shirtFront:0.39,collar:0.42,neckCap:0.55,tail:0.42,cuff:0.48,frontBtn:0.05,sleeveBtn:0.05,cuffBtn:0.3,bowtie:0.07,flower:0.3,other:0.3};
function topTypes(geo){return cached('topTypes:'+geo.uuid,()=>{const {comp,info}=components(geo);
 const types=info.map(c=>{const sy=c.max.y-c.min.y;const cx=(c.max.x+c.min.x)/2,cy=(c.max.y+c.min.y)/2,cz=(c.max.z+c.min.z)/2;const maxAX=Math.max(Math.abs(c.min.x),Math.abs(c.max.x));const minAX=(c.min.x>0||c.max.x<0)?Math.min(Math.abs(c.min.x),Math.abs(c.max.x)):0;
  if(sy>0.6)return 'coat';if(maxAX>0.3&&sy>0.3)return 'sleeve';
  if(minAX>0.3)return c.n>=50?'cuff':c.n>=30?'sleeveBtn':'cuffBtn';
  if(cx<-0.07&&cy>1.34&&cy<1.5&&cz>0.04)return 'flower';
  if(c.n>=30&&c.n<=50&&Math.abs(cx)<0.02&&cz>0.1&&sy<0.04)return 'frontBtn';
  if(cy>1.49&&cy<1.6&&cz>0.05&&sy<0.09)return 'bowtie';
  if(sy>0.1&&cy>1.5&&maxAX<0.09&&c.min.z<-0.03&&c.min.y>1.45)return 'collar';
  if(sy>0.2&&cy>1.4&&maxAX<0.12&&c.min.z<-0.03)return 'shirtFront';
  if(cy<1.2&&cz>0.08&&maxAX<0.12)return 'tail';
  if(sy>0.3&&maxAX<0.12)return 'vest';
  if(cy>1.55&&maxAX<0.05)return 'neckCap';
  return 'other';});
 return {comp,types};});}
let ARM=null;
function armFrame(ref){if(ARM)return ARM;const S=bindPos(ref,'LeftArm')||V3(0.166,1.503,-0.0385),E=bindPos(ref,'LeftForeArm')||V3(0.31,1.258,-0.06);ARM={S,E,u:E.clone().sub(S).normalize(),len:E.distanceTo(S)};return ARM;}
// слоты: 0 ткань A, 1 рукав (A + срез), 2 ткань B, 3 пуговицы, 4 кожа (V-вырез), 5 воротник (A, спереди открыт); null — убрать
const MAPS={
 altair:{coat:0,sleeve:1,vest:0,tail:0,frontBtn:3,shirtFront:2,collar:5,neckCap:null,bowtie:null,flower:null,cuff:null,cuffBtn:null,sleeveBtn:null,other:0},
 nikita:{coat:0,sleeve:1,vest:2,tail:2,frontBtn:null,sleeveBtn:3,shirtFront:2,collar:null,neckCap:null,cuff:2,cuffBtn:null,bowtie:null,flower:null,other:0}};
function topGeo(src,variant,cut){return cached('topGeo:'+variant+':'+src.uuid,()=>{const {comp,types}=topTypes(src);const map=MAPS[variant];
 const n=src.attributes.position.count;const reg=new Float32Array(n);const keep=new Uint8Array(n);const P=src.attributes.position;const A=cut.arm,v=V3();
 for(let i=0;i<n;i++){const ty=types[comp[i]];const slot=map[ty];keep[i]=slot===null||slot===undefined?0:1;reg[i]=(keep[i]?slot:0)+Math.min(0.95,REF[ty]||0.3);}
 const beyond=i=>{v.fromBufferAttribute(P,i);if(cut.hem&&v.y<cut.hem-0.01)return true;const ty=types[comp[i]];if(cut.sleeve&&ty==='sleeve'){v.x=Math.abs(v.x);if(v.sub(A.S).dot(A.u)>cut.sleeve+0.012)return true;}return false;};
 const idx=src.index.array;const out=[];for(let t=0;t<idx.length;t+=3){const a=idx[t],b=idx[t+1],c=idx[t+2];if(!keep[a]||!keep[b]||!keep[c])continue;if(beyond(a)&&beyond(b)&&beyond(c))continue;out.push(a,b,c);}
 const g=new T.BufferGeometry();for(const k in src.attributes)g.setAttribute(k,src.attributes[k]);g.setIndex(out);g.setAttribute('aReg',new T.BufferAttribute(reg,1));
 g.boundingSphere=src.boundingSphere;g.boundingBox=src.boundingBox;return g;});}
function topShader(mat,P){const u={uC0:{value:P.c[0]},uC1:{value:P.c[1]},uC2:{value:P.c[2]},uC3:{value:P.c[3]},uC4:{value:P.c[4]},uPr:{value:P.print||null},uRep:{value:P.rep||6},uPm:{value:new T.Vector4(P.pm[0],P.pm[1],P.pm[2],0)},
  uHem:{value:P.hem||-9},uSl:{value:P.sleeve||9},uS:{value:P.arm.S},uU:{value:P.arm.u},uBack:{value:P.back===undefined?0.55:P.back},uClamp:{value:P.clamp||0.96},uVee:{value:P.vee||0}};
 mat.userData.looks=u;
 mat.onBeforeCompile=sh=>{Object.assign(sh.uniforms,u);
  sh.vertexShader='attribute float aReg;varying float vReg;varying vec3 vBP;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n vReg=aReg;vBP=position;');
  sh.fragmentShader='uniform vec3 uC0;uniform vec3 uC1;uniform vec3 uC2;uniform vec3 uC3;uniform vec3 uC4;uniform sampler2D uPr;uniform float uRep;uniform vec4 uPm;uniform float uHem;uniform float uSl;uniform vec3 uS;uniform vec3 uU;uniform float uBack;uniform float uClamp;uniform float uVee;varying float vReg;varying vec3 vBP;\n'
   +sh.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
 {float slot=floor(vReg+0.001);float ref=max(0.02,fract(vReg+0.001));
  if(vBP.y<uHem)discard;
  if(slot>0.5&&slot<1.5){vec3 q=vec3(abs(vBP.x),vBP.y,vBP.z);if(dot(q-uS,uU)>uSl)discard;}
  if(slot>4.5&&vBP.y>1.588-0.03*smoothstep(-0.02,0.06,vBP.z))discard;
  float lum=dot(diffuseColor.rgb,vec3(0.299,0.587,0.114));float sh=clamp(lum/ref,0.45,1.18);
  vec3 col=uC0;float pm=uPm.x;
  if(slot>0.5&&slot<1.5){col=uC1;pm=uPm.y;}else if(slot>1.5&&slot<2.5){col=uC2;pm=uPm.z;}else if(slot>2.5&&slot<3.5){col=uC3;pm=0.0;}
  else if(slot>3.5&&slot<4.5){col=uC4;pm=0.0;sh=0.93+0.07*smoothstep(1.5,1.4,vBP.y);if(uVee>0.0&&vBP.y<uVee+abs(vBP.x)*1.2){col=uC0;pm=uPm.x;sh=clamp(lum/ref,0.6,1.1);}}
  else if(slot>4.5){col=uC2;pm=0.0;sh=clamp(lum/ref,0.75,1.1);}
  #ifdef LOOKS_PRINT
  if(pm>0.5){vec2 pu=slot>0.5&&slot<1.5?vec2(vUv.y,vUv.x):vec2(vUv.x,-vUv.y);col=mix(col,sRGBToLinear(texture2D(uPr,pu*uRep)).rgb*0.86,pm);}
  #endif
  diffuseColor.rgb=col*sh;if(!gl_FrontFacing)diffuseColor.rgb*=uBack;}`)
   .replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\n {float sl=floor(vReg+0.001);roughnessFactor=sl>1.5&&sl<2.5?0.93:sl>2.5&&sl<3.5?0.45:sl>3.5&&sl<4.5?0.6:max(roughnessFactor,0.72);}')
   .replace('gl_FragColor = vec4( outgoingLight, diffuseColor.a );','outgoingLight=min(outgoingLight,vec3(uClamp));\n gl_FragColor = vec4( outgoingLight, diffuseColor.a );');};
 if(P.print)mat.defines=Object.assign({},mat.defines,{LOOKS_PRINT:1});
 mat.customProgramCacheKey=()=>'looksTop'+(P.print?'P':'');mat.needsUpdate=true;}
function dressTop(M,variant,P){const top=M.Wolf3D_Outfit_Top;if(!top)return null;const arm=armFrame(top);
 top.geometry=topGeo(top.geometry,variant,{hem:P.hem,sleeve:P.sleeve,arm});const mat=top.material;mat.metalness=0;mat.roughness=P.rough||0.9;mat.side=T.DoubleSide;
 topShader(mat,Object.assign({arm},P));return top;}

// ---------------- руки (короткий рукав): скиннинг-трубка плечо→запястье ----------------
function wristLoop(body,E,W){const g=body.geometry;const {comp,info}=components(g);const P=g.attributes.position;const v=V3();const u=W.clone().sub(E).normalize();
 let best=-1,bd=1e9;info.forEach((c,i)=>{if(c.n>80)return;const ce=c.min.clone().add(c.max).multiplyScalar(0.5);const d=ce.distanceTo(W);if(d<bd){bd=d;best=i;}});
 if(best<0||bd>0.08)return null;const pts=[];let smin=1e9;for(let i=0;i<P.count;i++){if(comp[i]!==best)continue;v.fromBufferAttribute(P,i);const s=v.clone().sub(E).dot(u);smin=Math.min(smin,s);pts.push({p:v.clone(),s,i});}
 const ring=pts.filter(q=>q.s<smin+0.006);const uniq=[];for(const q of ring)if(!uniq.some(o=>o.p.distanceTo(q.p)<1e-4))uniq.push(q);return uniq.length>=5?{pts:uniq,s:smin}:null;}
function armGeo(body,side){return cached('arm:'+side+':'+body.geometry.uuid,()=>{const sk=body.skeleton;
 const S=bindPos(body,side+'Arm'),E=bindPos(body,side+'ForeArm'),W=bindPos(body,side+'Hand');if(!S||!E||!W)return null;
 const u1=E.clone().sub(S).normalize(),u2=W.clone().sub(E).normalize(),L1=S.distanceTo(E);
 const loop=wristLoop(body,E,W);const sEnd=loop?loop.s:W.distanceTo(E)-0.03;
 const ref=Math.abs(u2.z)<0.9?V3(0,0,1):V3(1,0,0);const b1=ref.clone().cross(u2).normalize(),b2=u2.clone().cross(b1).normalize();
 let off=V3(),lr=null;if(loop){const lc=loop.pts.reduce((a,q)=>a.add(q.p),V3()).multiplyScalar(1/loop.pts.length);const ax=E.clone().addScaledVector(u2,lc.clone().sub(E).dot(u2));off=lc.clone().sub(ax);
  lr=loop.pts.map(q=>{const d=q.p.clone().sub(lc);d.addScaledVector(u2,-d.dot(u2));return {a:Math.atan2(d.dot(b2),d.dot(b1)),r:d.length(),i:q.i};}).sort((a,b)=>a.a-b.a);}
 const rAt=a=>{if(!lr)return 0.028;const n=lr.length;for(let k=0;k<n;k++){const p=lr[k],q=lr[(k+1)%n];let a0=p.a,a1=q.a;if(k===n-1)a1+=Math.PI*2;let aa=a;if(aa<a0)aa+=Math.PI*2;if(aa>=a0&&aa<=a1){const t=(aa-a0)/Math.max(1e-6,a1-a0);return p.r+(q.r-p.r)*t;}}return lr[0].r;};
 // сечение предплечья на расстоянии s от локтя
 const fore=s=>{const k=clamp(s/sEnd,0,1);const kk=ss(0.35,1,k);return {c:E.clone().addScaledVector(u2,s).addScaledVector(off,kk),r:a=>(0.0395-0.004*ss(0.1,0.6,k))*(1-kk)+rAt(a)*kk+0.0005};};
 const iA=boneIdx(sk,side+'Arm'),iF=boneIdx(sk,side+'ForeArm');
 const rings=[];const RS=18;const upR=s=>0.047-0.006*ss(0.05,0.28,s)-0.004*ss(0.2,0.3,s);
 for(let s=0.075;s<=L1-0.03;s+=0.022)rings.push({c:S.clone().addScaledVector(u1,s),d:u1,r:()=>upR(s),w:[[iA,1]]});
 for(const e of [-0.03,-0.012,0,0.012,0.03]){const t=ss(-0.035,0.035,e);const d=u1.clone().lerp(u2,t).normalize();const c=e<0?E.clone().addScaledVector(u1,e):E.clone().addScaledVector(u2,e);rings.push({c,d,r:()=>0.037+0.002*t,w:[[iA,1-t],[iF,t]]});}
 for(let s=0.05;s<sEnd-0.001;s+=0.03){const f=fore(s);rings.push({c:f.c,d:u2,r:f.r,w:[[iF,1]]});}
 const fe=fore(sEnd);rings.push({c:fe.c,d:u2,r:a=>rAt(a)+0.0004,w:null,end:true});
 const pos=[],uv=[],si=[],sw=[],idx=[];const tmp=V3();const SI=body.geometry.attributes.skinIndex,SW=body.geometry.attributes.skinWeight;
 const cap=S.clone().addScaledVector(u1,0.055);pos.push(cap.x,cap.y,cap.z);uv.push(0.5,0);si.push(iA,0,0,0);sw.push(1,0,0,0);
 rings.forEach((R,ri)=>{const d=R.d;for(let k=0;k<RS;k++){const a=k/RS*Math.PI*2;const dir=b1.clone().multiplyScalar(Math.cos(a)).addScaledVector(b2,Math.sin(a));dir.addScaledVector(d,-dir.dot(d)).normalize();
   tmp.copy(R.c).addScaledVector(dir,R.r(a));pos.push(tmp.x,tmp.y,tmp.z);uv.push(k/RS,ri/rings.length);
   let w=R.w;if(R.end&&loop){let bi=0,bd=1e9;loop.pts.forEach((q,j)=>{const dd=q.p.distanceTo(tmp);if(dd<bd){bd=dd;bi=j;}});const vi=loop.pts[bi].i;w=[[SI.getX(vi),SW.getX(vi)],[SI.getY(vi),SW.getY(vi)],[SI.getZ(vi),SW.getZ(vi)],[SI.getW(vi),SW.getW(vi)]];}
   if(!w)w=[[iF,1]];const W4=[0,0,0,0],I4=[0,0,0,0];w.slice(0,4).forEach((q,j)=>{I4[j]=q[0];W4[j]=q[1];});const sum=W4.reduce((a,b)=>a+b,0)||1;si.push(...I4);sw.push(...W4.map(x=>x/sum));}});
 for(let k=0;k<RS;k++)idx.push(0,1+((k+1)%RS),1+k);
 for(let ri=0;ri<rings.length-1;ri++)for(let k=0;k<RS;k++){const a=1+ri*RS+k,b=1+ri*RS+(k+1)%RS,c=a+RS,d=b+RS;idx.push(a,b,c,b,d,c);}
 const g=geoOut({a:{position:[pos,3],uv:[uv,2],skinIndex:[si,4],skinWeight:[sw,4]},i:idx});g.computeVertexNormals();
 g.userData.fore={fore,E,W,u2,b1,b2,sEnd};return g;});}
function addArms(M){const body=M.Wolf3D_Body;if(!body)return null;const mat=body.material.clone();mat.normalMap=null;mat.vertexTangents=false;mat.needsUpdate=true;const out={};
 for(const side of ['Left','Right']){const g=armGeo(body,side);if(g){skinnedLike(body,g,mat,'looksArm'+side);out[side]=g;}}return out;}

// ---------------- часы (левое запястье, кость LeftForeArm) ----------------
function dialTex(){return cached('tex:dial',()=>LB.canvasTex(128,128,(x,w,h)=>{x.fillStyle='#10161f';x.beginPath();x.arc(64,64,63,0,7);x.fill();x.strokeStyle='#e8e4da';x.lineCap='round';
 for(let i=0;i<12;i++){const a=i/12*Math.PI*2;x.lineWidth=i%3?3:6;x.beginPath();x.moveTo(64+Math.sin(a)*46,64-Math.cos(a)*46);x.lineTo(64+Math.sin(a)*58,64-Math.cos(a)*58);x.stroke();}
 x.lineWidth=6;x.beginPath();x.moveTo(64,64);x.lineTo(64+Math.sin(2.1)*30,64-Math.cos(2.1)*30);x.stroke();x.lineWidth=4;x.beginPath();x.moveTo(64,64);x.lineTo(64+Math.sin(5.6)*44,64-Math.cos(5.6)*44);x.stroke();
 x.strokeStyle='#ff5a3a';x.lineWidth=2;x.beginPath();x.moveTo(64,64);x.lineTo(64+Math.sin(3.7)*50,64-Math.cos(3.7)*50);x.stroke();x.fillStyle='#d9d4c8';x.beginPath();x.arc(64,64,4,0,7);x.fill();},true));}
function addWatch(body,armL){const F=armL&&armL.userData.fore;if(!F)return null;const sW=F.sEnd-0.022;const f=F.fore(sW);
 // тыльная сторона кисти — наружу
 const H=bindPos(body,'LeftHand'),I1=bindPos(body,'LeftHandIndex1'),P1=bindPos(body,'LeftHandPinky1');let nb=I1&&P1?I1.clone().sub(H).cross(P1.clone().sub(H)).normalize():V3(1,0,0);nb.addScaledVector(F.u2,-nb.dot(F.u2)).normalize();
 const aN=Math.atan2(nb.dot(F.b2),nb.dot(F.b1));const grp=new T.Group();grp.name='looksWatch';
 const steel=noBloom(new T.MeshStandardMaterial({color:lin('#c9ccd1'),metalness:1,roughness:0.3}),0.85),strap=new T.MeshStandardMaterial({color:lin('#2a1a12'),roughness:0.65,metalness:0});
 // ремешок: плоское кольцо по сечению руки
 const N=40,bw=0.0085,bt=0.0022,pos=[],ix=[];for(let k=0;k<=N;k++){const a=k/N*Math.PI*2;const dir=F.b1.clone().multiplyScalar(Math.cos(a)).addScaledVector(F.b2,Math.sin(a));const r=f.r(a)+0.0012;
  for(const [dr,du] of [[0,-bw],[0,bw],[bt,bw],[bt,-bw]]){const p=f.c.clone().addScaledVector(dir,r+dr).addScaledVector(F.u2,du);pos.push(p.x,p.y,p.z);}}
 for(let k=0;k<N;k++)for(let q=0;q<4;q++){const a=k*4+q,b=k*4+(q+1)%4,c=a+4,d=b+4;ix.push(a,c,b,b,c,d);}
 const sg=geoOut({a:{position:[pos,3]},i:ix});sg.computeVertexNormals();const band=new T.Mesh(sg,strap);band.castShadow=true;grp.add(band);
 // корпус + циферблат + стекло
 const rN=f.r(aN);const cc=f.c.clone().addScaledVector(nb,rN+0.0042);const q=new T.Quaternion().setFromUnitVectors(V3(0,1,0),nb);
 const cs=new T.Mesh(new T.CylinderGeometry(0.0142,0.0146,0.0062,32),steel);cs.position.copy(cc);cs.quaternion.copy(q);cs.castShadow=true;grp.add(cs);
 const bz=new T.Mesh(new T.TorusGeometry(0.0132,0.0011,8,32),steel);bz.position.copy(cc).addScaledVector(nb,0.0031);bz.quaternion.copy(new T.Quaternion().setFromUnitVectors(V3(0,0,1),nb));grp.add(bz);
 const face=new T.Mesh(new T.CircleGeometry(0.0124,32),new T.MeshStandardMaterial({map:dialTex(),roughness:0.35,metalness:0.2}));face.position.copy(cc).addScaledVector(nb,0.00315);
 // ориентируем цифру 12 к кисти
 const zq=new T.Quaternion().setFromUnitVectors(V3(0,0,1),nb);face.quaternion.copy(zq);const up=V3(0,1,0).applyQuaternion(zq);const want=F.u2.clone().addScaledVector(nb,-F.u2.dot(nb)).normalize();
 face.quaternion.premultiply(new T.Quaternion().setFromAxisAngle(nb,Math.atan2(up.clone().cross(want).dot(nb),up.dot(want))));grp.add(face);
 const crown=new T.Mesh(new T.CylinderGeometry(0.0018,0.0018,0.003,10),steel);crown.position.copy(cc).addScaledVector(F.u2.clone().cross(nb).normalize(),0.0155);crown.quaternion.copy(new T.Quaternion().setFromUnitVectors(V3(0,1,0),F.u2.clone().cross(nb).normalize()));grp.add(crown);
 attachBind(body,'LeftForeArm',grp);return grp;}

// ---------------- воротник-гольф (скиннинг: шея/спина/голова, веса переносим с воротника RPM) ----------------
function collarGeo(top){return cached('collar:'+top.geometry.uuid,()=>{const src=top.geometry,P=src.attributes.position,SI=src.attributes.skinIndex,SW=src.attributes.skinWeight;const {comp,types}=topTypes(src);
 const cand=[];const v=V3();for(let i=0;i<P.count;i++){const ty=types[comp[i]];if(ty==='collar'||ty==='shirtFront'||ty==='neckCap'){v.fromBufferAttribute(P,i);cand.push({p:v.clone(),i});}}
 const prof=[[-0.006,1.498],[0.0,1.522],[0.0065,1.548],[0.0115,1.570],[0.0128,1.586],[0.0105,1.599],[0.0055,1.607],[0.0005,1.610],[-0.0035,1.606]];
 const NA=40,pos=[],uv=[],si=[],sw=[],ix=[];
 for(let r=0;r<prof.length;r++){const [off,y0]=prof[r];for(let k=0;k<=NA;k++){const phi=k/NA*Math.PI*2;const back=(1-Math.cos(phi))/2;const y=y0+0.024*back;
   const zc=-0.004+(y-1.58)*0.35,ax=0.066-(y-1.58)*0.28,az=0.066-(y-1.58)*0.1;const p=V3(Math.sin(phi)*(ax+off),y,zc+Math.cos(phi)*(az+off));pos.push(p.x,p.y,p.z);uv.push(k/NA*10,r/(prof.length-1));
   let bi=0,bd=1e9;for(const c of cand){const d=c.p.distanceToSquared(p);if(d<bd){bd=d;bi=c.i;}}si.push(SI.getX(bi),SI.getY(bi),SI.getZ(bi),SI.getW(bi));sw.push(SW.getX(bi),SW.getY(bi),SW.getZ(bi),SW.getW(bi));}}
 for(let r=0;r<prof.length-1;r++)for(let k=0;k<NA;k++){const a=r*(NA+1)+k,b=a+1,c=a+NA+1,d=c+1;ix.push(a,c,b,b,c,d);}
 const g=geoOut({a:{position:[pos,3],uv:[uv,2],skinIndex:[si,4],skinWeight:[sw,4]},i:ix});g.computeVertexNormals();return g;});}
function addCollar(top,col){const kt=knitTex();const mat=new T.MeshStandardMaterial({color:lin(col),map:kt,bumpMap:kt,bumpScale:0.0015,roughness:0.92,metalness:0,skinning:true,side:T.DoubleSide});return skinnedLike(top,collarGeo(top),mat,'looksCollar');}

// ---------------- очки без оправы, золотые дужки (кость Head) ----------------
function glassesGroup(hd){return cached('glasses',()=>{const grp=new T.Group();grp.name='looksGlasses';
 const gold=noBloom(new T.MeshStandardMaterial({color:lin('#d8b25e'),metalness:1,roughness:0.34}),0.8);
 const lensM=new T.MeshPhysicalMaterial({color:lin('#eef4ff'),metalness:0,roughness:0.09,transmission:1,transparent:true,opacity:1,envMapIntensity:1.0,depthWrite:false,side:T.DoubleSide});
 lensM.onBeforeCompile=sh=>{sh.fragmentShader=sh.fragmentShader.replace('gl_FragColor = vec4( outgoingLight, diffuseColor.a );','gl_FragColor = vec4( min(outgoingLight,vec3(0.85)), min(diffuseColor.a,0.55) );');};lensM.customProgramCacheKey=()=>'looksLens';
 const edgeM=noBloom(new T.MeshStandardMaterial({color:lin('#dfe8ea'),metalness:0,roughness:0.3,transparent:true,opacity:0.5,depthWrite:false,side:T.DoubleSide}),0.7);
 const Wl=0.0465,Hl=0.0315,rC=0.0095;const sh=new T.Shape();const x0=-Wl/2,x1=Wl/2,y0=-Hl/2,y1=Hl/2,rb=rC*1.25;
 sh.moveTo(x0+rC,y1);sh.lineTo(x1-rC,y1);sh.quadraticCurveTo(x1,y1,x1,y1-rC);sh.lineTo(x1,y0+rb);sh.quadraticCurveTo(x1,y0,x1-rb,y0);sh.lineTo(x0+rb,y0);sh.quadraticCurveTo(x0,y0,x0,y0+rb);sh.lineTo(x0,y1-rC);sh.quadraticCurveTo(x0,y1,x0+rC,y1);
 const lg=new T.ShapeGeometry(sh,12);const lp=lg.attributes.position;for(let i=0;i<lp.count;i++){const X=lp.getX(i),Y=lp.getY(i);lp.setZ(i,-(X*X+Y*Y)/(2*0.1));}lg.computeVertexNormals();
 // кромка линзы: только боковая стенка (ловит свет, как у безободковых очков)
 const op=sh.getPoints(12);const epos=[],eix=[];op.forEach((q,i)=>{const zc=-(q.x*q.x+q.y*q.y)/(2*0.1);epos.push(q.x,q.y,zc+0.0002,q.x,q.y,zc-0.0013);const j=(i+1)%op.length;eix.push(i*2,j*2,i*2+1,j*2,j*2+1,i*2+1);});
 const eg=geoOut({a:{position:[epos,3]},i:eix});eg.computeVertexNormals();
 // подбор плоскости линз: впереди брови/скулы/носа на 3.5 мм
 const tilt=0.13,wrapA=0.1,cx=0.0305,cy=1.7262;let zL=0.124;
 const lensMat=(sd,z)=>new T.Matrix4().compose(V3(sd*cx,cy,z),new T.Quaternion().setFromEuler(new T.Euler(tilt,sd*wrapA,0,'YXZ')),V3(1,1,1));
 for(let it=0;it<3;it++){let need=0;for(const sd of [-1,1])for(let i=0;i<=6;i++)for(let j=0;j<=4;j++){const p=V3((i/6-0.5)*Wl*0.96,(j/4-0.5)*Hl*0.96,0).applyMatrix4(lensMat(sd,zL));const h=hd.front(p.x,p.y);if(h)need=Math.max(need,h.point.z+0.0035-p.z);}zL+=need;if(need<1e-4)break;}
 const L={};for(const sd of [-1,1]){const M=lensMat(sd,zL);const lens=new T.Mesh(lg,lensM);lens.applyMatrix4(M);lens.renderOrder=3;grp.add(lens);const ed=new T.Mesh(eg,edgeM);ed.applyMatrix4(M);ed.renderOrder=2;grp.add(ed);
  L[sd]={M,inner:V3(-sd*Wl/2,Hl*0.18,0).applyMatrix4(M),outer:V3(sd*Wl/2,Hl*0.22,0).applyMatrix4(M)};}
 const goldG=[];const tube=(pts,r)=>{const g=new T.TubeGeometry(new T.CatmullRomCurve3(pts),Math.max(8,pts.length*6),r,6,false);g.deleteAttribute('uv');goldG.push(g);return g;};
 // мост над переносицей + носоупоры
 const bi=L[-1].inner,bo=L[1].inner;const nb=hd.front(0,1.733);const zb=Math.max(bi.z,nb?nb.point.z+0.004:bi.z);
 tube([bi.clone().add(V3(0.001,0,0)),V3(-0.0055,cy+0.0078,zb+0.0012),V3(0,cy+0.0092,zb+0.0016),V3(0.0055,cy+0.0078,zb+0.0012),bo.clone().add(V3(-0.001,0,0))],0.00085);
 for(const sd of [-1,1]){const pn=hd.cast(V3(sd*0.05,1.719,0.13),V3(-sd,0,-0.35));const pp=pn?pn.point.clone().addScaledVector(pn.face.normal,0.0014):V3(sd*0.0095,1.719,zb-0.006);
  const pad=new T.Mesh(new T.SphereGeometry(0.0033,10,8),edgeM);pad.scale.set(0.45,1,0.75);pad.position.copy(pp);grp.add(pad);tube([L[sd].inner.clone().add(V3(0,0.002,-0.0005)),pp.clone().add(V3(sd*0.0012,0.0025,0.0015)),pp],0.00045);}
 // дужки: по поверхности виска к уху, за ухом загиб вниз
 for(const sd of [-1,1]){const o=L[sd].outer;const hg=new T.BoxGeometry(0.0042,0.0032,0.0056);hg.deleteAttribute('uv');const hp=o.clone().add(V3(sd*0.0012,0,-0.0024));hg.translate(hp.x,hp.y,hp.z);goldG.push(hg.toNonIndexed());
  const pts=[o.clone().add(V3(sd*0.0022,0,-0.004))];for(const z of [0.095,0.075,0.055,0.035,0.018,0.004]){const h=hd.cast(V3(sd*0.3,1.7355,z),V3(-sd,0,0));const X=h?h.point.x+sd*0.0024:sd*0.08;pts.push(V3(X,1.7355-(0.095-z)*0.02,z));}
  const last=pts[pts.length-1];pts.push(V3(last.x-sd*0.0005,last.y-0.008,last.z-0.009),V3(last.x-sd*0.0018,last.y-0.02,last.z-0.011));tube(pts,0.00085);}
 const gm=T.BufferGeometryUtils?T.BufferGeometryUtils.mergeBufferGeometries(goldG.map(g=>g.index?g.toNonIndexed():g)):null;if(gm){const m=new T.Mesh(gm,gold);m.castShadow=true;grp.add(m);}else goldG.forEach(g=>{const m=new T.Mesh(g,gold);m.castShadow=true;grp.add(m);});
 grp.userData.zL=zL;return grp;});}
function addGlasses(head,hd){const g=glassesGroup(hd).clone();attachBind(head,'Head',g);return g;}

// ---------------- диод на правом виске ----------------
function addLED(a,head,hd,L){const hit=hd.cast(V3(-0.3,1.753,0.063),V3(1,0,0));if(!hit)return null;const n=hit.face.normal.clone().normalize();const c=hit.point.clone().addScaledVector(n,0.0007);
 const grp=new T.Group();grp.name='looksLED';const col=lin(L.led||'#4fb2ff');const zq=new T.Quaternion().setFromUnitVectors(V3(0,0,1),n);
 const sock=new T.Mesh(new T.TorusGeometry(0.0066,0.0009,6,28),new T.MeshStandardMaterial({color:lin('#2a2f36'),metalness:0.9,roughness:0.3}));sock.position.copy(c);sock.quaternion.copy(zq);grp.add(sock);
 const ringM=new T.MeshBasicMaterial({color:col.clone().multiplyScalar(1.4),toneMapped:false});const ring=new T.Mesh(new T.TorusGeometry(0.0052,0.00105,6,28),ringM);ring.position.copy(c);ring.quaternion.copy(zq);grp.add(ring);
 const arcM=new T.MeshBasicMaterial({color:col.clone().multiplyScalar(4),toneMapped:false});const arc=new T.Mesh(new T.TorusGeometry(0.0052,0.00135,6,20,2.2),arcM);arc.position.copy(c).addScaledVector(n,0.0002);arc.quaternion.copy(zq);grp.add(arc);
 const gl=LB.glow(L.led||'#4fb2ff',0.03,0.5);gl.position.copy(c).addScaledVector(n,0.004);gl.userData.noDepth=true;grp.add(gl);
 attachBind(head,'Head',grp);const g=a.g,mode=L.ledMode||'pulse';let spin=0;const base=col.clone();
 a.ctx.ticks.push((t,dt)=>{if(!g.visible)return;const sp=!!g.userData.speaking;
  if(mode==='steady'){arc.visible=false;ringM.color.copy(base).multiplyScalar(3.2);gl.material.opacity=0.55;return;}
  arc.visible=true;spin+=dt*(sp?7:1.1);arc.rotation.z=-spin;const k=sp?0.75+0.25*Math.sin(t*10):0.88+0.12*Math.sin(t*1.7);
  ringM.color.copy(base).multiplyScalar(1.3*k);arcM.color.copy(base).multiplyScalar(4.2*k);gl.material.opacity=0.35+0.3*k;});
 return grp;}

// ---------------- улыбка ----------------
// приоткрытый рот в покое (зубы в улыбке): mouthOpen каждый кадр пишет makeHuman, поэтому база — через аксессор элемента массива
function grinBase(morphs,g,base){for(const m of morphs){const i=m.morphTargetDictionary&&m.morphTargetDictionary.mouthOpen;if(i===undefined)continue;const arr=m.morphTargetInfluences;let v=arr[i]||0;
 Object.defineProperty(arr,i,{configurable:true,enumerable:true,get(){return g.userData.speaking?v:Math.max(v,base);},set(x){v=x;}});}}
function smileGetter(o,g,base,talkK){let s=base,last=0;Object.defineProperty(o,'smile',{configurable:true,get(){const now=performance.now()/1000;const dt=Math.min(0.1,now-(last||now));last=now;const tg=g.userData.speaking?base*talkK:base;s+=(tg-s)*Math.min(1,dt*6);return s;}});}

// ---------------- образы ----------------
function altair(a,M,crowd){const L=a.L;const sk=crowd?new T.Color(BODY_LIN[0]*skinK(L)[0],BODY_LIN[1]*skinK(L)[1],BODY_LIN[2]*skinK(L)[2]):matchSkin(M,L);
 dressTop(M,'altair',{c:[lin('#f3f0e8'),lin('#f3f0e8'),lin('#e9e7e1'),lin('#efe9dc'),sk],pm:[1,1,0],print:flamingoTex(),rep:crowd?3.4:3.8,hem:0.9,sleeve:0.165,rough:0.92});
 const arms=addArms(M);if(crowd)return;
 const head=M.Wolf3D_Head;if(!head)return;const hd=headData(head);const h=HL.altair;
 const ft=faceTex(head,hd,'altair');if(ft){head.material.map=ft;head.material.needsUpdate=true;}
 skinnedLike(head,shellGeo(head,hd,h,(p,m)=>m*(0.004+0.0065*ss(1.7,1.83,p.y)),'altair'),hairShellMat(L.hair,h,{rough:0.6,str:90,edge:0.55}),'looksHairShell');
 addClumps(head,hd,{key:'altair',seed:17,h,count:300,seg:8,minMask:0.55,
  flow:(p,n,R)=>{const crown=V3(0.004,1.84,-0.03);const d=p.clone().sub(crown);d.addScaledVector(n,-d.dot(n));if(d.lengthSq()<1e-8)d.set(0,0,1);d.normalize();
   const g=V3(0,-1,0);g.addScaledVector(n,-g.dot(n));const gl=g.length();if(gl>1e-4)g.multiplyScalar(1/gl);const fr=p.z>0.02&&p.y>1.77;
   d.lerp(g,(fr?0.2:0.5)*Math.min(1,gl*1.4)).normalize();d.applyAxisAngle(n,(R()-0.5)*(fr?1.3:0.9));return d;},
  len:(p,R)=>{const a=Math.abs(azim(p));const fr=a<0.95&&p.y>1.775;return (fr?0.078:a<1.9?0.105:0.1)*(0.72+0.5*R());},
  width:(p,R)=>0.012+0.009*R(),lift:(p,R)=>0.04+0.16*R(),hug:0.8,grav:9,off:(t,p,R)=>0.006+0.011*Math.sin(Math.PI*Math.min(1,t*1.1))*(0.6+0.8*R()),flat:0.34,taper:0.7,
  shade:R=>0.72+0.5*R()},L.hair,0.62);
 addWatch(M.Wolf3D_Body,arms&&arms.Left);}
const NOFF=p=>0.0034+0.0155*ss(1.772,1.83,p.y)*(0.3+0.7*Math.max(0,Math.cos(azim(p))))*(1-0.35*ss(0.02,-0.04,p.z));
function nikita(a,M){const L=a.L;matchSkin(M,L);
 dressTop(M,'nikita',{c:[lin(L.top),lin(L.top),lin(L.turtle||'#b3131d'),lin('#0d0f14'),lin('#000')],pm:[0,0,0],hem:0.8,rough:0.85});
 const top=M.Wolf3D_Outfit_Top;if(top)addCollar(top,L.turtle||'#b3131d');
 const head=M.Wolf3D_Head;if(!head)return;const hd=headData(head);const h=HL.nikita;
 const ft=faceTex(head,hd,'nikita');if(ft){head.material.map=ft;head.material.needsUpdate=true;}
 skinnedLike(head,shellGeo(head,hd,h,(p,m)=>m*NOFF(p),'nikita'),hairShellMat(L.hair,h,{rough:0.64,str:120,edge:0.35}),'looksHairShell');
 addClumps(head,hd,{key:'nikita',seed:23,h,count:95,seg:5,minMask:0.8,rootMinY:1.785,
  flow:(p,n,R)=>{const a=azim(p);let d=V3(Math.sin(a)*0.45,-0.25,-1);if(p.y<1.8)d=V3(Math.sin(a)*0.2,-1,-0.35);d.addScaledVector(n,-d.dot(n)).normalize();d.applyAxisAngle(n,(R()-0.5)*0.35);return d;},
  len:(p,R)=>0.028+0.02*R(),width:(p,R)=>0.006+0.0045*R(),lift:(p,R)=>0.01+0.025*R(),hug:1,grav:1.2,off:(t,r,R,p)=>NOFF(p)+0.0012,flat:0.26,taper:0.9,
  shade:R=>0.85+0.2*R()},L.hair,0.6);
 addBeard(a,head,hd,'#ffffff');
 if(L.glasses)addGlasses(head,hd);
 addLED(a,head,hd,L);}

function dress(a){const L=a.L;if(!L||!L.human||!a.model)return;const M=meshes(a.model);
 let st=L.style;if(!st&&!L.key){const o=a.o||{};const h=Math.abs(Math.sin((o.x||0)*12.9898+(o.z||0)*78.233+(o.ry||0)*3.7)*43758.5453)%1;if(L.flamingo||(L.flamingo===undefined&&h<0.08))st='crowdFlamingo';}
 if(!st)return;
 if(st==='altair'){altair(a,M,false);smileGetter(a.o,a.g,0.85,0.45);grinBase(a.morphs,a.g,0.1);}
 else if(st==='crowdFlamingo')altair(a,M,true);
 else if(st==='nikita')nikita(a,M);}
return {dress,flamingoTex,_cache:CACHE};
})();
