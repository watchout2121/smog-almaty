// Настольное приложение: Electron запускается, игра грузится через smog://, есть кнопка «Выйти», WebGL на видеокарте, нет ошибок.
// node tools/tests/desktop.js [сцена]  — сцена по желанию (например city), скриншот в tools/tests/out/desktop*.png
const {_electron:electron}=require('playwright');const {OUT,path}=require('./common');
const ROOT=path.join(__dirname,'..','..');
(async()=>{const env=Object.assign({},process.env);if(process.env.SMOG_USERDATA)env.SMOG_USERDATA=process.env.SMOG_USERDATA;const exe=process.env.SMOG_EXE;// собранный SMOG.exe (dist/desktop/win-unpacked) вместо запуска из исходников
 const app=await electron.launch(exe?{executablePath:exe,args:[],env}:{args:[ROOT],cwd:ROOT,env});const p=await app.firstWindow();p.setDefaultTimeout(240000);
 const errs=[];p.on('pageerror',e=>errs.push('PAGEERR '+e.message));p.on('console',m=>{if(m.type()==='error'&&!/fonts\.g|ERR_INTERNET|ERR_NAME/.test(m.text()))errs.push('ERR '+m.text());});
 await p.waitForFunction(()=>document.getElementById('loading')&&document.getElementById('loading').classList.contains('done'),null,{timeout:240000});
 const st=await p.evaluate(()=>{const r=ART.lib.renderer;const gl=r&&r.getContext();const dbg=gl&&gl.getExtension('WEBGL_debug_renderer_info');
  return {url:location.href,ready:ART.ready,scenes:ART.scenes.length,desktop:!!window.SMOG_DESKTOP,quit:!document.getElementById('bQuit').hidden,webgl2:!!(r&&r.capabilities.isWebGL2),gpu:dbg?gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL):'?',save:(()=>{try{localStorage.setItem('smog_probe','1');return localStorage.getItem('smog_probe')==='1';}catch(e){return false;}})()};});
 await p.screenshot({path:path.join(OUT,'desktop.png')});
 const sc=process.argv[2];if(sc){await p.evaluate(s=>{document.getElementById('menu').hidden=true;ART.show(s);},sc);await p.waitForTimeout(8000);await p.screenshot({path:path.join(OUT,'desktop_'+sc+'.png')});}
 console.log(JSON.stringify(st));console.log('errors',errs.length);errs.slice(0,10).forEach(e=>console.log(e));
 await app.close();process.exit(errs.length||!st.ready||!st.quit?1:0);})().catch(e=>{console.error(e);process.exit(1);});
