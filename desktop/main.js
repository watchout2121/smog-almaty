// ============================================================
// СМОГ · Алматы, 2049 — настольное приложение (Electron)
// Та же игра, что и в браузере, но своим окном: полный экран, дискретная видеокарта,
// файлы игры читаются с диска через протокол smog:// (fetch и сохранения работают как на сайте).
// ============================================================
'use strict';
const {app,BrowserWindow,protocol,ipcMain,Menu,shell}=require('electron');
const path=require('path');
const fs=require('fs');

const ROOT=path.resolve(__dirname,'..');
const DEV=!app.isPackaged;

// ноутбуки с двумя видеокартами (Intel + NVIDIA): просим дискретную, не даём Chromium занизить WebGL
app.commandLine.appendSwitch('force_high_performance_gpu');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('autoplay-policy','no-user-gesture-required');

protocol.registerSchemesAsPrivileged([{scheme:'smog',privileges:{standard:true,secure:true,supportFetchAPI:true,corsEnabled:true,stream:true}}]);

// имя приложения попадает в User-Agent, а заголовки должны быть латиницей (иначе подресурсы smog:// не грузятся)
app.userAgentFallback=app.userAgentFallback.replace(/[^\x20-\x7e]/g,'');
if(process.env.SMOG_USERDATA)app.setPath('userData',process.env.SMOG_USERDATA);// тесты: отдельная папка профиля
if(!app.requestSingleInstanceLock())app.quit();

let win=null;
function createWindow(){
 win=new BrowserWindow({width:1600,height:900,minWidth:960,minHeight:540,backgroundColor:'#04070b',show:false,fullscreen:!DEV,autoHideMenuBar:true,
  title:'СМОГ · Алматы, 2049',icon:path.join(__dirname,'icon.png'),
  webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,sandbox:true,backgroundThrottling:false,spellcheck:false}});
 Menu.setApplicationMenu(null);
 win.once('ready-to-show',()=>win.show());
 // F11 / Alt+Enter — полный экран; F12 — инструменты разработчика (только не в собранном .exe)
 win.webContents.on('before-input-event',(e,i)=>{if(i.type!=='keyDown')return;
  if(i.key==='F11'||(i.key==='Enter'&&i.alt)){win.setFullScreen(!win.isFullScreen());e.preventDefault();}
  else if(i.key==='F12'&&DEV){win.webContents.toggleDevTools();e.preventDefault();}});
 // внешние ссылки (атрибуция, лицензии) — в обычном браузере, а не внутри игры
 win.webContents.setWindowOpenHandler(({url})=>{if(/^https?:/.test(url))shell.openExternal(url);return {action:'deny'};});
 win.webContents.on('will-navigate',(e,url)=>{if(!url.startsWith('smog://')){e.preventDefault();if(/^https?:/.test(url))shell.openExternal(url);}});
 win.loadURL('smog://game/index.html');
 win.on('closed',()=>{win=null;});}

app.on('second-instance',()=>{if(win){if(win.isMinimized())win.restore();win.focus();}});
ipcMain.on('smog:quit',()=>app.quit());
ipcMain.on('smog:fullscreen',()=>{if(win)win.setFullScreen(!win.isFullScreen());});

const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.glb':'model/gltf-binary',
 '.hdr':'application/octet-stream','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.mp3':'audio/mpeg','.ogg':'audio/ogg','.txt':'text/plain; charset=utf-8'};
// шрифты — с Google Fonts (как на сайте), всё остальное — только из папки игры
const CSP="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob:; media-src 'self' data: blob:; connect-src 'self' data: blob:";
app.whenReady().then(()=>{
 protocol.handle('smog',async req=>{if(process.env.SMOG_DEBUG)console.log('[smog]',req.method,req.url);const u=new URL(req.url);let p=decodeURIComponent(u.pathname);if(p==='/'||!p)p='/index.html';
  const f=path.normalize(path.join(ROOT,p));if(!f.startsWith(ROOT+path.sep))return new Response('forbidden',{status:403});
  try{const buf=await fs.promises.readFile(f);const h={'content-type':MIME[path.extname(f).toLowerCase()]||'application/octet-stream'};if(h['content-type'].startsWith('text/html'))h['content-security-policy']=CSP;
   return new Response(buf,{status:200,headers:h});}
  catch(e){return new Response('not found',{status:404});}});
 createWindow();});
app.on('window-all-closed',()=>app.quit());
