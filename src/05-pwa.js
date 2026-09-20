// ======================= УСТАНОВКА КАК ПРИЛОЖЕНИЯ И РАБОТА С ФАЙЛАМИ =======================
// Тренажёр остаётся одним самодостаточным файлом и работает прямо с диска. Но если его
// раздают по сети, браузер может поставить его как приложение: своё окно без адресной строки,
// ярлык, работа без сети. Всё ниже — необязательные надстройки: ни одна из них не должна
// мешать, когда файл просто открыли двойным щелчком.

// Service worker живёт только на http(s): из file:// он недоступен, и это не ошибка.
(function(){try{
 if(!('serviceWorker' in navigator))return;
 if(location.protocol!=='http:'&&location.protocol!=='https:')return;
 navigator.serviceWorker.register('sw.js').catch(()=>{});   // нет файла рядом — просто живём без него
}catch(e){}})();

// Кнопка установки появляется, только когда браузер сам предложил (beforeinstallprompt).
let PWA_PROMPT=null;
(function(){try{
 const btn=$('bInstall');if(!btn)return;
 const standalone=()=>{try{return matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;}catch(e){return false;}};
 window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();PWA_PROMPT=e;if(!standalone())btn.hidden=false;});
 window.addEventListener('appinstalled',()=>{PWA_PROMPT=null;btn.hidden=true;});
 btn.onclick=async()=>{if(!PWA_PROMPT)return;btn.hidden=true;const p=PWA_PROMPT;PWA_PROMPT=null;
  try{p.prompt();await p.userChoice;}catch(e){}};
}catch(e){}})();

// ---------- файлы: настоящие «Открыть» и «Сохранить как» там, где браузер это умеет ----------
// File System Access API есть в Chrome и Edge; в остальных остаётся прежний путь через
// скачивание и <input type=file>. Возвращаем словами, что получилось, — сообщение печатает вызвавший.
const hasFS=()=>{try{return typeof window.showSaveFilePicker==='function';}catch(e){return false;}};
const FILE_KINDS={json:{d:'Конфигурация тренажёра',m:'application/json'},
 csv:{d:'Таблица CSV',m:'text/csv'},html:{d:'Отчёт HTML',m:'text/html'}};
function fileTypes(ext){const k=FILE_KINDS[ext]||FILE_KINDS.json,a={};a[k.m]=['.'+ext];return[{description:k.d,accept:a}];}
// Пишем в уже открытый файл, если он есть; иначе спрашиваем куда.
async function saveFile(name,ext,text,handle){
 const mime=(FILE_KINDS[ext]||FILE_KINDS.json).m+';charset=utf-8';
 if(hasFS()){try{
   const h=handle||await window.showSaveFilePicker({suggestedName:name,types:fileTypes(ext)});
   const w=await h.createWritable();await w.write(text);await w.close();
   return{ok:'saved',handle:h,name:h.name||name};
  }catch(e){if(e&&e.name==='AbortError')return{ok:'cancel'};}}   // передумали — ничего не делаем
 return download(name,mime,text)?{ok:'download',name}:{ok:'fail'};}
async function openFile(ext){
 if(hasFS()){try{
   const [h]=await window.showOpenFilePicker({types:fileTypes(ext),multiple:false});
   const f=await h.getFile();return{ok:'read',text:await f.text(),handle:h,name:f.name};
  }catch(e){if(e&&e.name==='AbortError')return{ok:'cancel'};}}
 return{ok:'picker'};}                                          // запасной путь — <input type=file>
