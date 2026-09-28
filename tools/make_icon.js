// Иконка приложения (desktop/icon.png, 512×512): диод андроида в смоге над силуэтом города.
// Запуск: npx electron tools/make_icon.js
const {app,BrowserWindow}=require('electron');const fs=require('fs');const path=require('path');
const draw=`(()=>{const c=document.createElement('canvas');c.width=c.height=512;const x=c.getContext('2d');
const R=(a,b)=>a+Math.random()*(b-a);
x.fillStyle='#04070b';x.beginPath();x.roundRect(0,0,512,512,96);x.fill();x.save();x.clip();
const sky=x.createLinearGradient(0,0,0,512);sky.addColorStop(0,'#0b1016');sky.addColorStop(0.55,'#3a2c1e');sky.addColorStop(1,'#120d09');x.fillStyle=sky;x.fillRect(0,0,512,512);
const sun=x.createRadialGradient(256,300,0,256,300,260);sun.addColorStop(0,'rgba(255,170,90,.55)');sun.addColorStop(1,'rgba(255,170,90,0)');x.fillStyle=sun;x.fillRect(0,0,512,512);
let px=0;x.fillStyle='#07090c';while(px<512){const w=R(26,58),h=R(70,190);x.fillRect(px,512-h,w-3,h);px+=w;}
x.fillStyle='rgba(255,196,120,.55)';for(let i=0;i<260;i++){const wx=R(0,512),wy=R(330,510);x.fillRect(wx|0,wy|0,3,4);}
const fog=x.createLinearGradient(0,280,0,512);fog.addColorStop(0,'rgba(120,96,70,0)');fog.addColorStop(1,'rgba(120,96,70,.45)');x.fillStyle=fog;x.fillRect(0,0,512,512);
x.restore();
x.shadowColor='#4fd2ff';x.shadowBlur=40;x.strokeStyle='#4fd2ff';x.lineWidth=30;x.beginPath();x.arc(256,214,104,0,Math.PI*2);x.stroke();
x.shadowBlur=0;x.strokeStyle='rgba(220,248,255,.95)';x.lineWidth=9;x.beginPath();x.arc(256,214,104,0,Math.PI*2);x.stroke();
x.fillStyle='#e9f6ff';x.font='800 64px "Segoe UI", Arial, sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText('2049',256,216);
return c.toDataURL('image/png');})()`;
app.whenReady().then(async()=>{const w=new BrowserWindow({show:false,width:600,height:600});await w.loadURL('data:text/html,<html><body></body></html>');
 const url=await w.webContents.executeJavaScript(draw);const out=path.join(__dirname,'..','desktop','icon.png');fs.writeFileSync(out,Buffer.from(url.split(',')[1],'base64'));console.log('icon',out,fs.statSync(out).size);app.quit();});
