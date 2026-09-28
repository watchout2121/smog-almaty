// Общие настройки тестов: headless Chromium (программный WebGL), адрес игры, папка для скриншотов
const path=require('path'),fs=require('fs');
const URL_BASE=process.env.SMOG_URL||'http://localhost:8770/index.html';
const OUT=path.join(__dirname,'out');fs.mkdirSync(OUT,{recursive:true});
const ARGS=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--allow-file-access-from-files'];
async function openGame(chromium,{quality='high',width=960,height=540,mobile=false}={}){
 const b=await chromium.launch({args:ARGS});const ctx=await b.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile});const p=await ctx.newPage();p.setDefaultTimeout(240000);
 const errs=[];p.on('pageerror',e=>errs.push('PAGEERR '+e.message));p.on('console',m=>{if(m.type()==='error'&&!/ERR_TUNNEL|fonts\.g/.test(m.text()))errs.push('ERR '+m.text());});
 await p.addInitScript(q=>{window.TUMAR_TEST=1;window.TUMAR_NOAUTO=1;try{localStorage.clear();localStorage.setItem('smog_settings',JSON.stringify({quality:q}));}catch(e){}},quality);
 await p.goto(URL_BASE);await p.waitForFunction(()=>document.getElementById('loading').classList.contains('done'),null,{timeout:240000});
 return {b,p,errs};}
module.exports={openGame,OUT,path};
