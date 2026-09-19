// ======================= ОТЧЁТ И ОБМЕН КОНФИГУРАЦИЕЙ =======================
const CFG_FORMAT='palletizer-sim/config@1';
function cfgTitle(){return (CFG.name||'').trim()||'Ячейка паллетизации';}
function cfgJSON(){normalize(CFG);
 return JSON.stringify({format:CFG_FORMAT,name:cfgTitle(),saved:new Date().toISOString(),cfg:deep(CFG)},null,1);}
// Принимаем и файл тренажёра, и «голый» CFG: чужие поля отбрасываем, свои дополняем из DEF.
function cfgFromJSON(txt){
 const o=JSON.parse(txt),src=(o&&o.cfg)?o.cfg:o;
 if(!src||typeof src!=='object'||!src.boxes||!src.conveyors||!src.grip||!src.exch)
  throw new Error('Это не конфигурация тренажёра: нет разделов boxes / conveyors / grip / exch');
 const n=Object.assign(deep(DEF),src);
 ['sheet','exch','grip','motion','opt','custom'].forEach(k=>{n[k]=Object.assign(deep(DEF[k]),src[k]||{});});
 n.boxes=(src.boxes.length?src.boxes:DEF.boxes).map(b=>Object.assign(deep(DEF.boxes[0]),b));
 n.conveyors=(src.conveyors.length?src.conveyors:DEF.conveyors).map(v=>Object.assign(deep(DEF.conveyors[0]),v));
 if(o&&o.name)n.name=o.name;
 normalize(n);derive(n,true);                       // не проходит расчёт — значит файл битый
 return n;}
function download(name,mime,data){try{
  const b=new Blob([data],{type:mime}),u=URL.createObjectURL(b),a=document.createElement('a');
  a.href=u;a.download=name;document.body.appendChild(a);a.click();
  setTimeout(()=>{URL.revokeObjectURL(u);a.remove();},2000);return true;}catch(e){return false;}}
function repMsg(t,cls){const e=$('cfgMsg');if(!e)return;e.textContent=t;e.style.color=cls==='bad'?'var(--badfg)':cls==='ok'?'var(--okfg)':'';}
function fileStamp(){const d=new Date(),p=n=>String(n).padStart(2,'0');
 return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;}
function safeName(s){return s.replace(/[^\wа-яёА-ЯЁ.-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60)||'cell';}
// ======================= 2D-СХЕМА УЧАСТКА С ГАБАРИТАМИ =======================
function planSVG(c,D,W){
 const LY=D.LY,pal=D.pal,F=D.F,r0=LY.robots[0];
 // границы содержимого: ограждение, конвейеры, площадки ожидания
 let bx0=F.x0,bx1=F.x1,by0=F.y0,by1=F.y1;
 const grow=(x,y)=>{bx0=Math.min(bx0,x);bx1=Math.max(bx1,x);by0=Math.min(by0,y);by1=Math.max(by1,y);};
 LY.convs.forEach(cv=>{grow(cv.x0-250,cv.y-cv.w/2);grow(cv.x1,cv.y+cv.w/2);});
 LY.robots.forEach(r=>r.slots.forEach(sl=>grow(sl.park.x,sl.park.y)));
 // полосы под размерные линии
 const dT=by0-500,dB=by1+500,dB2=by1+1000,dL=bx0-500,dL2=bx0-1050,dR=bx1+500;
 const x0=dL2-700,x1=dR+900,y0=dT-500,y1=dB2+400;
 const H=clamp(Math.round((W-24)*(y1-y0)/(x1-x0))+24,520,1700);
 const sc=Math.min((W-24)/(x1-x0),(H-24)/(y1-y0));
 const P=(x,y)=>[12+(x-x0)*sc,12+(y-y0)*sc];
 const f=v=>f0(Math.round(v));
 const dimH=(xa,xb,y,txt,ext)=>{const [ax,ay]=P(xa,y),[bx]=P(xb,y);let o='';
  if(ext!==undefined){const [,ey]=P(xa,ext);o+=`<line x1="${ax}" y1="${ay}" x2="${ax}" y2="${ey}" class="ext"/><line x1="${bx}" y1="${ay}" x2="${bx}" y2="${ey}" class="ext"/>`;}
  return o+`<line x1="${ax}" y1="${ay}" x2="${bx}" y2="${ay}" class="dim" marker-start="url(#ar)" marker-end="url(#ar)"/>`
   +`<text x="${(ax+bx)/2}" y="${ay-5}" class="dimt" text-anchor="middle">${txt}</text>`;};
 const dimV=(ya,yb,x,txt,ext)=>{const [ax,ay]=P(x,ya),[,by]=P(x,yb);let o='';
  if(ext!==undefined){const [ex]=P(ext,ya);o+=`<line x1="${ax}" y1="${ay}" x2="${ex}" y2="${ay}" class="ext"/><line x1="${ax}" y1="${by}" x2="${ex}" y2="${by}" class="ext"/>`;}
  const my=(ay+by)/2;
  return o+`<line x1="${ax}" y1="${ay}" x2="${ax}" y2="${by}" class="dim" marker-start="url(#ar)" marker-end="url(#ar)"/>`
   +`<text x="${ax-6}" y="${my}" class="dimt" text-anchor="middle" transform="rotate(-90 ${ax-6} ${my})">${txt}</text>`;};
 let s=`<svg viewBox="0 0 ${W} ${H}" width="100%" xmlns="http://www.w3.org/2000/svg" class="plan">
<defs><marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0,1 L10,5 L0,9 z" fill="var(--ink,#1E2730)"/></marker></defs>
<style>.dim{stroke:var(--ink,#1E2730);stroke-width:1}.ext{stroke:var(--muted,#5C6772);stroke-width:.7;stroke-dasharray:3 3}
.dimt{font-size:11px;fill:var(--ink,#1E2730)}.lb{font-size:10px;fill:var(--muted,#5C6772)}.lbb{font-size:12px;font-weight:600;fill:var(--ink,#1E2730)}</style>`;
 const [fx0,fy0]=P(F.x0,F.y0),[fx1,fy1]=P(F.x1,F.y1);
 s+=`<rect x="${fx0}" y="${fy0}" width="${fx1-fx0}" height="${fy1-fy0}" fill="none" stroke="var(--fence,#7B8794)" stroke-width="2" stroke-dasharray="10 5"/>`;
 LY.convs.forEach((cv,i)=>{const [ax,ay]=P(cv.x0,cv.y-cv.w/2),[bx,by]=P(cv.x1,cv.y+cv.w/2);
  s+=`<rect x="${ax}" y="${ay}" width="${bx-ax}" height="${by-ay}" fill="var(--dim,#E1E5E9)" stroke="var(--line,#C9CFD5)"/>`
   +`<text x="${ax+3}" y="${ay-4}" class="lb">конвейер ${i+1}: ${cv.b.name}</text>`;});
 LY.robots.forEach(r=>{const [bx,by]=P(r.base.x,r.base.y);
  s+=`<circle cx="${bx}" cy="${by}" r="${D.rob.reach*sc}" fill="none" stroke="var(--robot,#E0762C)" stroke-dasharray="5 5" opacity=".6"/>`
   +`<circle cx="${bx}" cy="${by}" r="${Math.max(5,200*sc)}" fill="var(--dim,#E1E5E9)" stroke="var(--ink,#1E2730)" stroke-width="2"/>`
   +`<text x="${bx-9}" y="${by-9}" class="lbb" text-anchor="end">R${r.i+1}</text>`;
  r.slots.forEach(sl=>{const [px,py]=P(sl.cx,sl.cy),w=pal.W*sc,h=pal.L*sc;
   s+=`<g transform="rotate(${sl.ang} ${px.toFixed(1)} ${py.toFixed(1)})"><rect x="${px-w/2}" y="${py-h/2}" width="${w}" height="${h}" fill="none" stroke="${sl.kind==='mg'?'var(--sheet,#8FA3B5)':'var(--line,#C9CFD5)'}" stroke-width="${sl.kind==='st'?2:1.4}"/></g>`
    +`<text x="${px}" y="${py+4}" class="lbb" text-anchor="middle">${sl.id}</text>`;
   const rt=[{x:sl.cx,y:sl.cy}].concat(sl.route).map(q=>P(q.x,q.y));
   s+=`<polyline points="${rt.map(q=>q[0].toFixed(1)+','+q[1].toFixed(1)).join(' ')}" fill="none" stroke="var(--blue,#3A6EA5)" stroke-width="1.3" stroke-dasharray="6 4" opacity=".5"/>`;
   const [gx,gy]=P(sl.gate.x,sl.gate.y),nn={x:-sl.acc.y,y:sl.acc.x},L2=(pal.L/2+150)*sc;
   s+=`<line x1="${gx-nn.x*L2}" y1="${gy-nn.y*L2}" x2="${gx+nn.x*L2}" y2="${gy+nn.y*L2}" stroke="var(--red,#D33B2F)" stroke-width="3"/>`;
   const [kx,ky]=P(sl.park.x,sl.park.y);
   s+=`<rect x="${kx-9}" y="${ky-9}" width="18" height="18" rx="3" fill="none" stroke="var(--line,#C9CFD5)" stroke-dasharray="3 3"/>`
;});});
 // радиус расстановки — выноской от колонны робота к ближайшей позиции
 const sl0=r0.slots.reduce((a,b)=>Math.abs(b.ang)<Math.abs(a.ang)?b:a,r0.slots[0]);  // выноска вдоль +X, чтобы не накрывать подписи позиций
 if(sl0){const [ax,ay]=P(r0.base.x,r0.base.y),[bx,by]=P(sl0.cx,sl0.cy);
  const tx=ax+(bx-ax)*0.62-(by-ay)*0.22,ty=ay+(by-ay)*0.62+(bx-ax)*0.22;
  s+=`<line x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}" class="dim" marker-end="url(#ar)"/>`
   +`<text x="${tx}" y="${ty}" class="dimt" text-anchor="middle">R = ${f(LY.R)} мм</text>`;}
 // размерные линии
 s+=dimH(F.x0,F.x1,dT,f(F.x1-F.x0)+' мм — ограждение',F.y0);
 s+=dimV(F.y0,F.y1,dR,f(F.y1-F.y0)+' мм — ограждение',F.x1);
 const cv0=LY.convs[0];
 if(cv0)s+=dimH(cv0.x0,cv0.x1,dB,f(cv0.len)+' мм — конвейер',cv0.y);
 s+=dimH(-c.pickDist,r0.base.x,dB2,f(c.pickDist)+' мм — до точки захвата',r0.base.y);
 if(LY.robots.length>1){s+=dimV(r0.base.y,LY.robots[1].base.y,dL,'шаг роботов '+f(LY.pitch)+' мм',F.x0);
  s+=dimV(r0.base.y+LY.R+LY.half,LY.robots[1].base.y-LY.R-LY.half,dL2,'проезд '+f(LY.aisle)+' мм',F.x0);}
 else s+=dimV(r0.base.y-LY.R,r0.base.y+LY.R,dL,'ряд позиций '+f(2*LY.R)+' мм',F.x0);
 s+=`</svg>`;
 return s;}
// ======================= КАРТИНКА 3D =======================
function view3DPng(){try{
  if(typeof V3==='undefined'||!V3.ok||typeof render3D!=='function')return '';
  resize3D();render3D();return V3.ren.domElement.toDataURL('image/png');}catch(e){return '';}}
// ======================= ОТЧЁТ =======================
function repTable(rows){return `<table>${rows.map(r=>`<tr><td class="k">${r[0]}</td><td>${r[1]}</td></tr>`).join('')}</table>`;}
function repCols(head,rows){return `<table><tr>${head.map(h=>`<th>${h}</th>`).join('')}</tr>`
 +rows.map(r=>`<tr>${r.map(v=>`<td>${v}</td>`).join('')}</tr>`).join('')+`</table>`;}
function reportHTML(c,D,png){
 const G=D.grip,rob=D.rob,pal=D.pal,LY=D.LY,ex=c.exch,sh=c.sheet,M=c.motion,vac=GRIPPERS[c.grip.type].vac;
 const pat=D.stations.length?D.stations[0].pat:null;
 const H=[];
 H.push(`<h2>${cfgTitle()}</h2><p class="sub">Отчёт по конфигурации ячейки паллетизации · ${new Date().toLocaleString('ru-RU')}</p>`);
 H.push(`<h3>Коротко</h3>`+repTable([
  ['Состав',`${c.robots} × ${rob.name}, ${D.stations.length} станц${D.stations.length===1?'ия':'ии'}, ${c.conveyors.length} конвейер${c.conveyors.length===1?'':'а'}${D.mags.length?', '+D.mags.length+' магазин прокладок':''}`],
  ['Производительность',`${f0(D.bottleneck)} коробок в час, ${f1(D.palletsPerHour)} паллеты в час; ограничивает ${D.bnName}`],
  ['Такт робота',`${f1(D.tCycle)} с (${f1(D.cpm)} циклов/мин), ${D.cyclesPerPallet} циклов на паллету`],
  ['Укладка',pat?`${pat.name}: ${pat.n} в слое × ${pat.layers} слоёв = ${pat.total} шт., ${f0(pat.mass)} кг, стопа ${f0(pat.stackH)} мм`:'—'],
  ['Защита',D.safety==='fence'?`Ограждение ISO 14120 h=2000 мм, периметр ${f1(D.fencePerim/1000)} м, световые завесы в проёмах`:`Лазерные сканеры, поле снижения скорости ${f0(D.Ssc)} мм`],
  ['Габарит участка',`${f0(D.F.x1-D.F.x0)} × ${f0(D.F.y1-D.F.y0)} мм по ограждению`]]));
 H.push(`<h3>Робот и движения</h3>`+repTable([
  ['Модель',`${rob.name}${rob.ex?' ('+rob.ex+')':''}`],
  ['Грузоподъёмность / вылет',`${rob.payload} кг / ${rob.reach} мм`],
  ['Норматив',`${rob.cpm} циклов/мин, рабочая скорость ${c.speedPct} %`],
  ['Постамент',`${c.baseH} мм`],
  ['Требуемый вылет',`${f0(D.rReq)} мм (${D.rWhere}), запас ${f0(D.reachMargin*100)} %`],
  ['Нагрузка на фланец',`${f1(D.mReq)} кг из ${rob.payload} — ${f0(D.util*100)} %`],
  ['Такт: модель / норматив',`${f1(D.tCycleModel)} с / ${f1(D.tCycleNorm)} с`],
  ['Подвод и отрыв',`${f0(M.vPlace)} мм/с с высоты ${f0(M.hAppr)} мм; вертикаль на переносе ${f0(M.vZ)} мм/с`],
  ['Профиль скорости',`ускорение ${f1(D.aMax)} м/с², нарастание ${f2(M.tJerk)} с, доворот кисти ${f0(M.wSpeed)} °/с`]]));
 H.push(`<h3>Захват</h3>`+repTable([
  ['Тип',GRIPPERS[c.grip.type].name],
  ['Коробок за захват',`${c.grip.pick}${c.grip.pick>1?`, шаг зон ${c.grip.pitch==='adj'?'регулируемый, перестроение '+f1(c.grip.tShift)+' с':'фиксированный'}`:''}`],
  ['Формы групп',pat?`${pat.shapes} · ${pat.groupsPerPallet} ходов на паллету${pat.adjUsed?` (рядами было бы ${pat.rowGroups})`:''}`:'—'],
  ['Сила требуемая / захвата',`${f0(G.Fth)} / ${f0(G.Fcap)} Н — ${G.case}`],
  ['Исполнение',vac?(c.grip.type==='cups'?`${G.nCups} × Ø${G.cupD} мм ${CUPS[c.grip.cup].name.toLowerCase()}, вакуум −${G.vac} кПа`:`пенная рамка ${f0(G.A)} см², вакуум −${G.vac} кПа`):(c.grip.type==='clamp'?`2 × цилиндр Ø${G.cylD} мм при ${c.grip.pressure} бар`:'вилки с прижимом')],
  ['Вакуумный источник',vac?`${G.pump}; утечка ${f0(G.qLeak)} л/мин, расход ${f0(G.air)} л/мин`:'—'],
  ['Масса захвата',`${f1(G.mass)} кг · захват ${f2(G.tGrip)} с, сброс ${f2(G.tRel)} с`]]));
 H.push(`<h3>Тара и схемы укладки</h3>`+repCols(['Коробка','Д×Ш×В, мм','кг','шт/ч','Слоёв'],
  c.boxes.map(b=>[b.name,`${b.l}×${b.w}×${b.h}`,String(b.m),b.rate||'—',b.layers||'авто'])));
 H.push(repCols(['Схема','В слое','Слоёв','Всего','Заполнение','Перевязка','Ходов'],
  Object.values(D.pats).map(p=>[p.name,String(p.n),String(p.layers),String(p.total),f0(p.fill*100)+' %',p.interlock?'да':'нет',String(p.groupsPerPallet)])));
 H.push(`<h3>Паллеты, станции и обмен</h3>`+repTable([
  ['Паллета',`${c.pallet} (${pal.W}×${pal.L}×${pal.h} мм, ${pal.m} кг)`],
  ['Станций / магазинов',`${c.stations} / ${c.magazines} у каждого робота; радиус расстановки ${f0(LY.R)} мм`],
  ['Схема укладки',c.patternMode==='interlock'?'перекрёстная (перевязка обязательна)':c.patternMode==='column'?'колонная':'авто'],
  ['Максимальная высота стопы',`${c.maxStack} мм`],
  ['Вывоз готовых паллет',EXCH_OUT[ex.out]+(ex.auto?`, автовызов через ${ex.reaction} с`:', по команде оператора')],
  ['Подача пустых паллет',EXCH_IN[ex.in]+(ex.in==='robot'?`, стопка ${ex.stack} шт. (${f1(D.stackHours)} ч)`:'')],
  ['Проезд техники',`${f0(LY.aisle)} мм${c.robots>1?`, шаг между роботами ${f0(LY.pitch)} мм`:''}`],
  ['Подъезд к позициям',LY.blocked.length?`ЗАПЕРТО: ${LY.blocked.join(', ')}`:LY.robots.flatMap(r=>r.slots).map(s=>`${s.id} — ${s.route.length>1?'через проезд':'напрямую'}`).join('; ')]]));
 if(sh.mode!=='none')H.push(`<h3>Прокладочные листы</h3>`+repTable([
  ['Режим',SHEET_MODES[sh.mode]+(sh.mode==='everyN'?` (N = ${sh.everyN})`:'')],
  ['Магазин',`${sh.cap} листов, вызов пополнения при ≤ ${sh.low}; ${f1(D.refillsPerHour)} пополнений в час`],
  ['Перенос',`${sh.speedPct} % скорости, захват ${f1(sh.tGrip)} с, сброс по ${sh.sect} секциям за ${f2(D.tRelSheet)} с`],
  ['Цикл с листом',`${f1(D.tSheet)} с; ${pat?pat.sheets:0} листов на паллету`],
  ['Кто пополняет',SHEETS_BY[ex.sheetsBy]]]));
 H.push(`<h3>Конвейеры подачи</h3>`+repCols(['№','Тип','L, м','м/мин','Накопление','Коробка','Подача','Привод','Зон'],
  c.conveyors.map((cv,i)=>{const x=D.convs[i];return[String(i+1),CONV_TYPES[cv.type].name,String(cv.len),String(cv.speed),cv.accum?'да':'нет',boxOf(c,cv.box).name,FEEDS[cv.feed],cv.type==='mdr'?`мотор-ролики, БП ${x.psuStd} А`:`${x.Pstd} кВт, ЧП ${f1(x.I)} А`,String(x.zones)];})));
 H.push(`<h3>Безопасность и АСУ ТП</h3>`+repTable([
  ['Режим защиты',D.safety==='fence'?'Ограждение со световыми завесами':'Лазерные сканеры, коллаборативный режим'],
  ['Время останова робота',`${c.tStop} с`],
  ['ISO 13855',D.safety==='fence'?`завеса S = ${f0(D.Slc)} мм`:`поле сканера S = ${f0(D.Ssc)} мм; стоп-поле ${f0(D.rStop)} мм, поле снижения ${f0(D.rSlow)} мм`],
  ['Промышленная сеть',c.fieldbus],
  ['Сигналы',`${D.io.DI} DI / ${D.io.DO} DO / ${D.io.SI} безопасных входов / ${D.io.SO} безопасных выходов / ${D.io.BUS} объектов по шине`],
  ['Модули ввода-вывода',`${D.io.diMod} × DI16, ${D.io.doMod} × DO16 (с запасом 20 %)`]]));
 H.push(`<h3>Схема участка с габаритами</h3>`+planSVG(c,D,1000)
  +`<p class="sub">Условные обозначения: серый штрих — ограждение; оранжевый штрих — досягаемость робота; красный отрезок — проём с световой завесой; синий пунктир — маршрут подъезда техники к позиции; пунктирный квадрат — площадка ожидания за ограждением. Размеры в миллиметрах.</p>`);
 H.push(png?`<h3>3D-компоновка</h3><img src="${png}" alt="3D-вид ячейки">`
  :`<h3>3D-компоновка</h3><p class="sub">3D-вид недоступен: не загрузилась библиотека three.js или нет WebGL. Откройте вкладку «3D-вид» и повторите формирование отчёта.</p>`);
 H.push(`<h3>Спецификация</h3>`+repCols(['Группа','Позиция','Кол-во','Примечание'],D.bom.map(b=>[b.g,b.n,String(b.q),b.p])));
 H.push(`<h3>Список сигналов</h3>`+repCols(['Тип','Тег','Сигнал','Источник','Подключение'],D.sig.map(x=>[x.k,x.t,x.nm,x.src,x.how])));
 H.push(`<h3>Замечания расчёта</h3>`+(D.warnings.length?`<ul>${D.warnings.map(x=>`<li>${x}</li>`).join('')}</ul>`:'<p class="sub">Замечаний нет.</p>'));
 return H.join('');}
function reportStandalone(c,D,png){
 const body=reportHTML(c,D,png);
 return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${cfgTitle()} — отчёт</title><style>
:root{--ink:#1E2730;--muted:#5C6772;--line:#C9CFD5;--dim:#E1E5E9;--fence:#7B8794;--robot:#E0762C;--red:#D33B2F;--blue:#3A6EA5;--sheet:#8FA3B5}
body{margin:0;padding:28px;max-width:1060px;margin:0 auto;background:#fff;color:var(--ink);font:14px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
h2{margin:0 0 2px;font-size:22px}h3{margin:22px 0 6px;font-size:15px;border-bottom:1px solid var(--line);padding-bottom:4px}
table{width:100%;border-collapse:collapse;font-size:12px;margin:6px 0}
th,td{border-bottom:1px solid var(--line);padding:4px 6px;text-align:left;vertical-align:top}
th{color:var(--muted);font-weight:600;white-space:nowrap}td.k{color:var(--muted);width:40%}
.sub{color:var(--muted);font-size:12px;margin:2px 0 10px}img{max-width:100%;border:1px solid var(--line);border-radius:6px}
ul{margin:6px 0;padding-left:20px}li{margin:3px 0;font-size:13px}
@media print{body{padding:0}h3{page-break-after:avoid}table,img,svg{page-break-inside:avoid}}
</style></head><body>${body}
<p class="sub">Сформировано тренажёром РТК паллетизации. Расчёты — предпроектная оценка, параметры каталога сверяются с паспортами оборудования.</p>
</body></html>`;}
function renderReport(){
 const c=normalize(CFG),D=derive(c);
 const png=view3DPng();
 $('repOut').innerHTML=`<div class="rep">${reportHTML(c,D,png)}</div>`;
 return {c,D,png};}
// ======================= ПРИВЯЗКА ВКЛАДКИ =======================
function initReport(){
 const nm=$('cfgName');if(nm){nm.value=cfgTitle();nm.oninput=()=>{CFG.name=nm.value;saveCfg();};}
 $('bSaveCfg').onclick=()=>{const txt=cfgJSON();
  if(download(`${safeName(cfgTitle())}_${fileStamp()}.json`,'application/json',txt))repMsg('Конфигурация сохранена в файл.','ok');
  else{const t=$('cfgText');t.hidden=false;t.value=txt;t.select();repMsg('Скачивание недоступно в этом окне — скопируйте текст ниже вручную.','bad');}};
 $('bCopyCfg').onclick=()=>{const txt=cfgJSON(),t=$('cfgText');t.hidden=false;t.value=txt;t.focus();t.select();
  try{navigator.clipboard.writeText(txt);repMsg('Конфигурация скопирована в буфер обмена.','ok');}
  catch(e){repMsg('Текст конфигурации ниже — скопируйте вручную.','');}};
 $('bLoadCfg').onclick=()=>$('fCfg').click();
 $('fCfg').onchange=e=>{const f=e.target.files&&e.target.files[0];if(!f)return;
  const rd=new FileReader();
  rd.onload=()=>{try{CFG=cfgFromJSON(String(rd.result));saveCfg();renderCfg();buildSim();renderArch();
    if($('cfgName'))$('cfgName').value=cfgTitle();
    repMsg(`Загружено: ${f.name} — «${cfgTitle()}». Конфигурация применена.`,'ok');}
   catch(err){repMsg('Не удалось загрузить: '+err.message,'bad');}};
  rd.onerror=()=>repMsg('Файл не читается.','bad');
  rd.readAsText(f);e.target.value='';};
 $('bMakeRep').onclick=()=>{renderReport();};
 $('bDlRep').onclick=()=>{const {c,D,png}=renderReport();
  const html=reportStandalone(c,D,png);
  if(download(`${safeName(cfgTitle())}_отчёт_${fileStamp()}.html`,'text/html;charset=utf-8',html))repMsg('Отчёт сохранён в файл.','ok');
  else repMsg('Скачивание недоступно в этом окне — воспользуйтесь кнопкой «Печать / PDF».','bad');};
 $('bPrintRep').onclick=()=>{if(!$('repOut').innerHTML)renderReport();window.print();};}
initReport();
