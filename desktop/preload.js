// мост между игрой и окном приложения: кнопка «Выйти» в меню и переключение полного экрана
'use strict';
const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('SMOG_DESKTOP',{quit:()=>ipcRenderer.send('smog:quit'),fullscreen:()=>ipcRenderer.send('smog:fullscreen')});
