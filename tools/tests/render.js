// Регрессия «чёрных прямоугольников»: пиксель с Inf/NaN не должен расползаться через свечение (bloom)
const {chromium}=require('playwright');const {openGame,OUT,path}=require('./common');
// мини-декодер PNG (8 бит, RGB/RGBA, без чересстрочности) — доля почти чёрных пикселей в центре кадра
function darkShare(buf){const zlib=require('zlib');let o=8,w=0,h=0,ct=0;const idat=[];while(o<buf.length){const len=buf.readUInt32BE(o),type=buf.toString('ascii',o+4,o+8);const d=buf.slice(o+8,o+8+len);if(type==='IHDR'){w=d.readUInt32BE(0);h=d.readUInt32BE(4);ct=d[9];}else if(type==='IDAT')idat.push(d);else if(type==='IEND')break;o+=12+len;}
 const bpp=ct===6?4:3,raw=zlib.inflateSync(Buffer.concat(idat)),stride=w*bpp,px=Buffer.alloc(h*stride);
 for(let y=0;y<h;y++){const f=raw[y*(stride+1)],src=y*(stride+1)+1;for(let x=0;x<stride;x++){const a=x>=bpp?px[y*stride+x-bpp]:0,b=y?px[(y-1)*stride+x]:0,c=(x>=bpp&&y)?px[(y-1)*stride+x-bpp]:0;let v=raw[src+x];
  if(f===1)v+=a;else if(f===2)v+=b;else if(f===3)v+=(a+b)>>1;else if(f===4){const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);v+=(pa<=pb&&pa<=pc)?a:(pb<=pc?b:c);}px[y*stride+x]=v&255;}}
 let n=0,t=0;for(let y=Math.floor(h*0.2);y<h*0.8;y+=2)for(let x=Math.floor(w*0.2);x<w*0.8;x+=2){const i=y*stride+x*bpp;t++;if(px[i]+px[i+1]+px[i+2]<6)n++;}return n/t;}
(async()=>{let bad=0;for(const q of ['high','medium','low']){const {b,p,errs}=await openGame(chromium,{quality:q});
 for(const [name,val] of [['inf',1e30],['nan',NaN]]){
  await p.evaluate(([val])=>{document.getElementById('menu').hidden=true;ART.show('apartment');const T=THREE;const s=ART._cur.scene;const o=s.getObjectByName('__bad');if(o)s.remove(o);
   const m=new T.Mesh(new T.PlaneGeometry(0.05,0.05),new T.ShaderMaterial({uniforms:{v:{value:val}},vertexShader:'void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform float v;void main(){gl_FragColor=vec4(v,v,v,1.);}'}));m.name='__bad';m.position.set(0.3,1.6,-2.5);s.add(m);},[val]);
  await p.waitForTimeout(2500);const f=path.join(OUT,'render_'+q+'_'+name+'.png');await p.screenshot({path:f});
  const dark=darkShare(require('fs').readFileSync(f));
  console.log(q,name,'dark',dark.toFixed(3));if(dark>0.25)bad++;}
 if(errs.length){console.log(errs.slice(0,5).join('\n'));bad++;}await b.close();}
 console.log(bad?'FAIL':'OK');process.exit(bad?1:0);})();
