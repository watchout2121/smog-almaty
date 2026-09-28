// Быстрая проверка: игра загружается, ассеты и сцены на месте, нет ошибок
const {chromium}=require('playwright');const {openGame,OUT,path}=require('./common');
(async()=>{const {b,p,errs}=await openGame(chromium);
 const st=await p.evaluate(()=>({ready:ART.ready,scenes:ART.scenes.length,drive:!!window.DRIVE,play:!!window.PLAY,looks:!!window.LOOKS}));
 await p.screenshot({path:path.join(OUT,'boot.png')});console.log(JSON.stringify(st));console.log('errors',errs.length);errs.slice(0,10).forEach(e=>console.log(e));await b.close();process.exit(errs.length?1:0);})();
