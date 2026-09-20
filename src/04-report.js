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
// ======================= ВЫГРУЗКА ТАБЛИЦ В CSV =======================
// Excel с русской локалью ждёт разделитель «;» и запятую в дробях, RFC 4180 — «,» и точку.
// Числа в CSV идут без разделителя разрядов, иначе Excel примет их за текст.
const CSV_SEPS={';':'Excel, русская локаль',',':'RFC 4180'};
const CSV_SEP_NOTE={';':'Разделитель «;», запятая в дробях — так ждёт Excel с русской локалью.',
 ',':'Разделитель «,», точка в дробях — RFC 4180 и англоязычный Excel.'};
function csvSep(){const e=$('csvSep');return e&&CSV_SEPS[e.value]?e.value:';';}
function csvText(head,rows,sep){
 const q=v=>{const s=(v===null||v===undefined)?'':String(v);
  return (s.indexOf(sep)>=0||s.indexOf('"')>=0||/[\r\n]/.test(s))?'"'+s.replace(/"/g,'""')+'"':s;};
 return [head].concat(rows).map(r=>r.map(q).join(sep)).join('\r\n')+'\r\n';}
function csvNum(v,dec,sep){if(v===null||v===undefined||!isFinite(v))return'';
 const s=(+v).toFixed(dec===undefined?0:dec);return sep===';'?s.replace('.',','):s;}
const SIG_KIND={DI:'Дискретный вход ПЛК',DO:'Дискретный выход ПЛК',
 SI:'Безопасный вход контроллера безопасности',SO:'Безопасный выход контроллера безопасности',
 BUS:'Обмен по промышленной сети'};
// Каждая таблица знает свой заголовок, имя файла и как собраться из расчёта.
const CSV_TABLES={
 bom:{name:'Спецификация',file:'спецификация',build:(c,D,s)=>({
  head:['№','Группа','Позиция','Кол-во','Ед.','Назначение и подключение'],
  rows:D.bom.map((b,i)=>[i+1,b.g,b.n,csvNum(b.q,0,s),'шт.',b.p])})},
 sig:{name:'Сигналы и ввод-вывод',file:'сигналы',build:(c,D,s)=>({
  head:['№','Тип','Расшифровка типа','Тег','Сигнал','Источник','Подключение'],
  rows:D.sig.map((x,i)=>[i+1,x.k,SIG_KIND[x.k]||x.k,x.t,x.nm,x.src,x.how])})},
 params:{name:'Сводка параметров',file:'параметры',build:(c,D,s)=>{
  const R=[],a=(g,n,v,u)=>R.push([g,n,v,u||'']),rob=D.rob,pat=D.stations.length?D.stations[0].pat:null;
  a('Робот','Модель',`${c.robots} × ${rob.name}`);
  a('Робот','Грузоподъёмность',csvNum(rob.payload,0,s),'кг');
  a('Робот','Досягаемость',csvNum(rob.reach,0,s),'мм');
  a('Робот','Требуемый вылет',csvNum(D.rReq,0,s),'мм');
  a('Робот','Нагрузка на фланец',csvNum(D.mReq,1,s),'кг');
  a('Робот','Использование грузоподъёмности',csvNum(D.util*100,0,s),'%');
  a('Робот','Высота постамента',csvNum(c.baseH,0,s),'мм');
  a('Захват','Тип',GRIPPERS[c.grip.type].name);
  a('Захват','Единиц тары за ход',csvNum(c.grip.pick,0,s),'шт.');
  a('Захват','Требуемая сила удержания',csvNum(D.grip.Fth,0,s),'Н');
  a('Захват','Сила захвата',csvNum(D.grip.Fcap,0,s),'Н');
  a('Захват','Масса захвата',csvNum(D.grip.mass,1,s),'кг');
  a('Захват','Время захвата',csvNum(D.grip.tGrip,2,s),'с');
  if(pat){a('Укладка','Схема',pat.name);
   a('Укладка','Коробок в слое',csvNum(pat.n,0,s),'шт.');
   a('Укладка','Слоёв',csvNum(pat.layers,0,s),'шт.');
   a('Укладка','Коробок на паллете',csvNum(pat.total,0,s),'шт.');
   a('Укладка','Заполнение слоя',csvNum(pat.fill*100,0,s),'%');
   a('Укладка','Высота стопы с паллетой',csvNum(pat.stackH,0,s),'мм');
   a('Укладка','Масса паллеты брутто',csvNum(pat.mass,0,s),'кг');}
  a('Производительность','Такт робота',csvNum(D.tCycle,2,s),'с');
  a('Производительность','Циклов в минуту',csvNum(D.cpm,1,s),'цикл/мин');
  a('Производительность','Циклов на паллету',csvNum(D.cyclesPerPallet,0,s),'шт.');
  a('Производительность','Выпуск',csvNum(D.bottleneck,0,s),'кор/ч');
  a('Производительность','Паллет в час',csvNum(D.palletsPerHour,2,s),'палл/ч');
  a('Производительность','Ограничивает',D.bnName);
  a('Компоновка','Габарит участка по ограждению, длина',csvNum(D.F.x1-D.F.x0,0,s),'мм');
  a('Компоновка','Габарит участка по ограждению, ширина',csvNum(D.F.y1-D.F.y0,0,s),'мм');
  a('Компоновка','Периметр ограждения',csvNum(D.fencePerim,0,s),'мм');
  a('Компоновка','Радиус расстановки позиций',csvNum(D.LY.R,0,s),'мм');
  a('Компоновка','Станций / магазинов у робота',`${c.stations} / ${c.magazines}`,'шт.');
  a('Безопасность','Режим защиты',D.safety==='fence'?'Ограждение со световыми завесами':'Лазерные сканеры, коллаборативный режим');
  a('Безопасность','Время останова робота',csvNum(c.tStop,2,s),'с');
  a('Безопасность','Расстояние установки по ISO 13855',csvNum(D.safety==='fence'?D.Slc:D.Ssc,0,s),'мм');
  a('Безопасность','Требуемый Performance Level',D.pl.plr);
  a('Безопасность','Достигнутый Performance Level',D.pl.worst||'не определён');
  a('Безопасность','Меры против отказов по общей причине',csvNum(D.pl.ccf,0,s),'баллов');
  a('АСУ ТП','Промышленная сеть',c.fieldbus);
  a('АСУ ТП','Дискретных входов / выходов',`${D.io.DI} / ${D.io.DO}`,'шт.');
  a('АСУ ТП','Безопасных входов / выходов',`${D.io.SI} / ${D.io.SO}`,'шт.');
  a('АСУ ТП','Объектов обмена по сети',csvNum(D.io.BUS,0,s),'шт.');
  return{head:['Раздел','Параметр','Значение','Ед.'],rows:R};}},
 sku:{name:'Артикулы и схемы укладки',file:'артикулы',build:(c,D,s)=>({
  head:['Артикул','Форма','Материал','Д (Ø), мм','Ш, мм','В, мм','Масса, кг','Выпуск, шт/ч','Схема укладки',
   'В слое','Слоёв','На паллете','Заполнение, %','Перевязка','Ходов на паллету','Листов','Циклов на паллету',
   'Паллета приходит за, мин','Требуется циклов/мин','Загрузка робота, %'],
  rows:D.plan.rows.map(r=>[r.b.name,SHAPES[r.b.shape].name,MATS[r.b.mat].name,
   csvNum(r.b.l,0,s),csvNum(r.b.w,0,s),csvNum(r.b.h,0,s),csvNum(r.b.m,1,s),r.b.rate?csvNum(r.b.rate,0,s):'',
   r.p.name,csvNum(r.p.n,0,s),csvNum(r.p.layers,0,s),csvNum(r.p.total,0,s),csvNum(r.p.fill*100,0,s),
   r.p.interlock?'да':'нет',csvNum(r.p.groupsPerPallet,0,s),csvNum(r.p.sheets,0,s),csvNum(r.cyc,0,s),
   r.tPal?csvNum(r.tPal,1,s):'',r.reqCpm?csvNum(r.reqCpm,2,s):'',r.reqCpm?csvNum(r.reqCpm/D.plan.capCpm*100,0,s):''])})},
 pl:{name:'Функции безопасности и Performance Level',file:'PL-13849',build:(c,D,s)=>({
  head:['Функция','Наименование','Требуемый PL','PL функции','Подсистема','Категория','MTTFd канала, лет',
   'DCavg, %','PL подсистемы','Состав канала','Замечание'],
  rows:D.pl.sf.flatMap(f=>f.res.map((r,i)=>[f.id,i?'':f.name,f.plr,i?'':(f.pl||'не определён'),r.name,r.cat,
   csvNum(Math.min(100,r.mttfd),1,s),csvNum(r.dcavg,0,s),r.pl||'',
   r.comp.map(k=>`${k.q>1?k.q+' × ':''}${k.n}`).join('; '),r.issues.join('; ')]))})},
 base:{name:'Базирование тары и зрение',file:'базирование',build:(c,D,s)=>({
  head:['Конвейер','Тип','Длина, м','Скорость, м/мин','Подача','Направляющие','После направляющих, ±мм',
   'После направляющих, ±°','С учётом зрения, ±мм','Допуск захвата, ±мм','Допуск захвата, ±°','Вывод'],
  rows:D.base.map(x=>[x.i+1,CONV_TYPES[x.cv.type].name,csvNum(x.cv.len,1,s),csvNum(x.cv.speed,0,s),
   INFEED[x.cv.infeed].name,ALIGN[x.cv.align].name,csvNum(x.gx,0,s),x.round?'':csvNum(x.ga,1,s),
   csvNum(x.dx,0,s),csvNum(x.tol.dx,0,s),x.round?'':csvNum(x.tol.da,1,s),
   x.ok?'в допуске':visionOK(c.vision.mode,x.need)?'позу даёт камера':`не в допуске — нужно ${VISION[x.need].name.toLowerCase()}`])})},
 risk:{name:'Реестр опасностей (ISO 12100)',file:'оценка-риска',build:(c,D,s)=>({
  head:['№','Зона','Вид опасности','Опасность','Этапы','Подвергаются','S','F','O','A','Класс без мер',
   'Шаг 1: безопасная конструкция','Шаг 2: технические средства','Шаг 3: информация','Не заложено в ячейке',
   'S ост.','F ост.','O ост.','A ост.','Класс остаточный','Приемлемо','Требуемый PL','Функция безопасности'],
  rows:D.risk.rows.map(h=>[h.id,h.zone,HZ_TYPE[h.type],h.n,h.stage.map(x=>HZ_STAGE[x]).join(', '),
   h.who.map(x=>HZ_WHO[x]).join(', '),h.s,h.f,h.o,h.a,RISK_CLS[h.cls0],
   h.m1.map(x=>x.m.n).join('; '),h.m2.map(x=>x.m.n).join('; '),h.m3.map(x=>x.m.n).join('; '),
   h.todo.map(k=>MEAS[k].n).join('; '),
   h.res.s,h.res.f,h.res.o,h.res.a,RISK_CLS[h.cls],h.ok?'да':'нет',h.sf?h.plr:'',h.sf||''])})},
 eco:{name:'Экономика и окупаемость',file:'экономика',build:(c,D,s)=>{
  const E=D.eco,R=[],a=(g,n,v,u,note)=>R.push([g,n,v,u||'',note||'']);
  E.cap.lines.forEach(l=>a('Капитальные затраты',l.n,csvNum(l.sum,0,s),E.unit,
   `${csvNum(l.q,1,s)} ${l.unit}${l.price?` × ${csvNum(l.price,0,s)}`:''}; ${l.note}`));
  a('Капитальные затраты','ИТОГО',csvNum(E.cap.total,0,s),E.unit,`оборудование ${csvNum(E.cap.equip,0,s)}, работы ${csvNum(E.cap.eng+E.cap.inst,0,s)}`);
  E.pw.lines.forEach(l=>a('Потребляемая мощность',l.n,csvNum(l.kW,2,s),'кВт',l.note));
  a('Потребляемая мощность','ИТОГО',csvNum(E.pw.kW,2,s),'кВт',`× ${csvNum(E.hours,0,s)} ч × ${csvNum(c.eco.tariff,1,s)} ₽/кВт·ч`);
  E.cellOpex.forEach(l=>a('Текущие затраты: ячейка',l.n,csvNum(l.v,0,s),E.unit,l.note));
  a('Текущие затраты: ячейка','ИТОГО в год',csvNum(E.cellYear,0,s),E.unit,'');
  E.manOpex.forEach(l=>a('Текущие затраты: ручная укладка',l.n,csvNum(l.v,0,s),E.unit,l.note));
  a('Текущие затраты: ручная укладка','ИТОГО в год',csvNum(E.manYear,0,s),E.unit,`${E.people} человек при ${E.shifts} сменах`);
  a('Итог','Экономия в год',csvNum(E.save,0,s),E.unit,E.save>0?'':'ячейка дороже ручной укладки');
  a('Итог','Простой срок окупаемости',E.pay?csvNum(E.pay,2,s):'',E.pay?'лет':'','не окупается при такой экономии');
  a('Итог','Срок окупаемости с учётом ставки',E.payD!==null?csvNum(E.payD,2,s):'',E.payD!==null?'лет':'',`ставка ${csvNum(c.eco.rate,0,s)} % годовых`);
  a('Итог','Чистая приведённая стоимость',csvNum(E.npv,0,s),E.unit,`горизонт ${E.years} лет`);
  a('Итог','Внутренняя норма доходности',E.irr!==null?csvNum(E.irr*100,1,s):'','%','');
  a('Итог','Себестоимость укладки, ячейка',csvNum(E.unitCost.cellBox,2,s),'₽/коробку',`${csvNum(E.unitCost.cellPal,0,s)} ₽ на паллету`);
  a('Итог','Себестоимость укладки, вручную',csvNum(E.unitCost.manBox,2,s),'₽/коробку',`${csvNum(E.unitCost.manPal,0,s)} ₽ на паллету`);
  E.flow.forEach(f=>a('Денежный поток по годам','Год '+f.t,csvNum(f.cum,0,s),E.unit,
   `поток ${csvNum(f.cf,0,s)}, дисконтированный ${csvNum(f.disc,0,s)}`));
  E.sens.forEach(x=>a('Чувствительность',x.n,x.base?csvNum(x.base,2,s):'','лет',
   `−25 % → ${x.low?csvNum(x.low,2,s):'не окупается'}; +25 % → ${x.high?csvNum(x.high,2,s):'не окупается'}`));
  return{head:['Раздел','Статья','Значение','Ед.','Как посчитано'],rows:R};}},
 mix:{name:'Смешанная паллета: рецепт',file:'рецепт',build:(c,D,s)=>{
  const M=D.mix;
  if(!M||!M.ok)return{head:['Рецепт','Значение'],rows:[['Смешанная паллета','выключена — на паллете один артикул']]};
  const rows=M.rows.map((r,i)=>[String(i+1),r.b.name,SHAPES[r.b.shape].name,MATS[r.b.mat].name,
   `${SHAPES[r.b.shape].round?'Ø'+r.b.l:r.b.l+'×'+r.b.w}×${r.b.h}`,csvNum(r.b.m,1,s),csvNum(r.n,0,s),
   csvNum(r.pat.n,0,s),csvNum(r.n*r.pat.n,0,s),csvNum(r.pat.fill*100,0,s),r.pat.name,r.sheet?'да':'нет']);
  rows.push(['','ИТОГО','','','',csvNum(M.mass,1,s),csvNum(M.layers,0,s),'',csvNum(M.total,0,s),'',
   `высота ${csvNum(M.height,0,s)} мм, ходов ${csvNum(M.groups,0,s)}, листов ${csvNum(M.sheets,0,s)}`,'']);
  return{head:['Ярус снизу','Артикул','Форма','Материал','Д×Ш×В, мм','Масса шт., кг','Слоёв','В слое','Всего, шт.',
   'Заполнение слоя, %','Схема укладки','Лист под ярусом'],rows};}},
 plc:{name:'Программа ПЛК (GRAFCET)',file:'логика-ПЛК',build:(c,D,s)=>{
  const P=grafProg(c);
  const rows=[];const push=(g,gn)=>g.forEach(st=>{
   const tr=(st.tr||[]).map(t=>`${GC_COND[t.c]?GC_COND[t.c].n:t.c} → ${t.to}`);
   rows.push([gn,st.id,st.n,(st.act||[]).map(a=>GC_ACT[a].n).join('; ')||'нет',tr.join(' ; ')||'нет',String(tr.length)]);});
  push(P.g1,'G1 — цикл укладки');push(P.g2,'G2 — обмен паллет');
  return{head:['Диаграмма','Шаг','Название','Действия','Переходы: условие → шаг','Переходов'],rows};}},
 oee:{name:'Смена: простои и OEE',file:'смена-OEE',build:(c,D,s)=>{
  if(typeof S==='undefined'||!S||!S.oee||S.oee.obs<=0)
   return{head:['Показатель','Значение','Ед.'],rows:[['Смена','не запускалась — прогоните ячейку на вкладке «Симуляция»','']]};
  const K=oeeCalc(S.oee,S.stats,D),SH=shiftProj(K,c.shift,D),P=dtPareto(S.oee);
  const R=[['Сводка','','','','',''],
   ['Наблюдаемое время',csvNum(K.obs,0,s),'с','','',''],
   ['Время работы (Execute)',csvNum(K.run,0,s),'с','','',''],
   ['Готовность A',csvNum(K.A*100,1,s),'%','','',''],
   ['Производительность P',csvNum(K.P*100,1,s),'%','','',''],
   ['Качество Q',csvNum(K.Q*100,1,s),'%','','',''],
   ['OEE',csvNum(K.oee*100,1,s),'%','','',''],
   ['Уложено',csvNum(K.good,0,s),'шт.','','',''],
   ['Уронено',csvNum(S.stats.dropped,0,s),'шт.','','',''],
   ['Промахов захвата',csvNum(S.stats.missed,0,s),'шт.','','',''],
   ['Паллет собрано',csvNum(S.stats.pallets,0,s),'шт.','','',''],
   ['Сценарий тревог',SCEN[S.scen.key].n,'','','',''],
   ['Проекция на смену, коробок',csvNum(SH.boxes,0,s),'шт.','','',''],
   ['Проекция на смену, паллет',csvNum(SH.pallets,1,s),'шт.','','','']];
  R.push(['','','','','','']);R.push(['Категории времени','','','','','']);
  DT_ORDER.forEach(k=>R.push([DT_CAT[k].n,csvNum(S.oee.by[k]||0,0,s),'с',csvNum((S.oee.by[k]||0)/K.obs*100,1,s)+' %','','']));
  R.push(['','','','','','']);R.push(['Причины простоя (Парето)','Всего, с','Раз','Доля, %','Накопленная, %','Категория']);
  P.rows.forEach(x=>R.push([x.why,csvNum(x.t,0,s),x.n,csvNum(x.share*100,1,s),csvNum(x.cum*100,1,s),DT_CAT[x.cat].n]));
  R.push(['','','','','','']);R.push(['Журнал простоев: от начала, с','Состояние','Категория','Причина','Длительность, с','']);
  shiftRows().filter(x=>x.cat!=='run').forEach(x=>R.push([csvNum(x.t0,0,s),x.state,DT_CAT[x.cat].n,x.why,csvNum(x.dur,1,s),'']));
  return{head:['Показатель','Значение','Ед.','Доля','Накопленная','Категория'],rows:R};}},
 warn:{name:'Замечания расчёта',file:'замечания',build:(c,D,s)=>({
  head:['№','Замечание'],rows:D.warnings.map((w,i)=>[i+1,w])})}};
const CSV_ORDER=['bom','sig','params','sku','mix','eco','risk','pl','base','plc','oee','warn'];
let CSV_LAST='bom';
// Один «лист» на файл; вариант «все таблицы» кладёт их блоками с заголовками.
function csvBuild(key){const c=normalize(CFG),D=derive(c),s=csvSep(),T=CSV_TABLES[key];
 const t=T.build(c,D,s);
 return{file:`${safeName(cfgTitle())}_${T.file}_${fileStamp()}.csv`,text:'﻿'+csvText(t.head,t.rows,s)};}
function csvBuildAll(){const c=normalize(CFG),D=derive(c),s=csvSep();
 const parts=CSV_ORDER.map(k=>{const T=CSV_TABLES[k],t=T.build(c,D,s);
  return csvText([T.name],[],s)+csvText(t.head,t.rows,s);});
 return{file:`${safeName(cfgTitle())}_таблицы_${fileStamp()}.csv`,text:'﻿'+parts.join('\r\n')};}
function csvMsg(t,cls){const e=$('csvMsg');if(!e)return;e.textContent=t;e.style.color=cls==='bad'?'var(--badfg)':cls==='ok'?'var(--okfg)':'';}
function csvShow(txt){const t=$('csvText');if(!t)return;t.hidden=false;t.value=txt;t.focus();t.select();}
async function csvSave(key){let r;
 try{r=key==='*'?csvBuildAll():csvBuild(key);if(key!=='*')CSV_LAST=key;}
 catch(e){csvMsg('Не удалось собрать таблицу: '+e.message,'bad');return;}
 const rows=r.text.split('\r\n').length-1,res=await saveFile(r.file,'csv',r.text);
 if(res.ok==='saved')csvMsg(`${res.name} — ${rows} строк.`,'ok');
 else if(res.ok==='download')csvMsg(`${r.file} — ${rows} строк.`,'ok');
 else if(res.ok==='cancel')csvMsg('Сохранение отменено.','');
 else{csvShow(r.text);csvMsg('Скачивание недоступно в этом окне — таблица ниже, скопируйте её в Excel.','bad');}}
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
 H.push(`<h3>Тара и схемы укладки</h3>`+repCols(['Тара','Форма','Материал','Д×Ш×В, мм','кг','шт/ч','Слоёв','Захват'],
  c.boxes.map(b=>{const fi=gripFit(b,c.grip.type);
   return[b.name,SHAPES[b.shape].name,MATS[b.mat].name,`${SHAPES[b.shape].round?'Ø'+b.l:b.l+'×'+b.w}×${b.h}`,String(b.m),b.rate||'—',b.layers||'авто',
    fi.s==='ok'?'годится':`${fi.s==='warn'?'с оговоркой':'НЕ ГОДИТСЯ'} — просится ${gripBest(b).map(t=>GRIPPERS[t].name.toLowerCase()).join(' или ')||'подхват снизу'}`];})));
 H.push(repCols(['Схема','В слое','Слоёв','Всего','Заполнение','Перевязка','Ходов'],
  Object.values(D.pats).map(p=>[p.name,String(p.n),String(p.layers),String(p.total),f0(p.fill*100)+' %',p.interlock?'да':'нет',String(p.groupsPerPallet)])));
 if(D.mix&&D.mix.ok){const M=D.mix;
  H.push(`<h3>Смешанная паллета: рецепт «${c.mix.name}»</h3>`+repTable([
   ['Состав',`${M.rows.length} ярус${M.rows.length===1?'':'а'}, ${M.layers} слоёв, ${M.total} единиц тары`],
   ['Масса и габарит',`${f0(M.mass)} кг брутто, высота ${f0(M.height)} мм${M.sheets?`, разделительных листов ${M.sheets}`:''}`],
   ['Ходов робота на паллету',`${M.groups}${M.sheets?` + ${M.sheets} с листом`:''}; в среднем ${f1(M.kEff)} единиц тары за ход`],
   ['Артикулы и конвейеры',M.arts.map(bi=>{const ci=c.conveyors.findIndex(x=>x.box===bi);
     return `${c.boxes[bi].name} — ${ci>=0?`конвейер ${ci+1}`:'НЕ ПОДАЁТСЯ НИ ОДНИМ КОНВЕЙЕРОМ'}`;}).join('; ')],
   ['Замечания рецепта',M.warn.length?M.warn.join(' ')+'':'нет']]));
  H.push(repCols(['Ярус снизу','Артикул','Д×Ш×В, мм','кг/шт.','Слоёв','В слое','Всего','Заполнение','Схема','Лист под ярусом'],
   M.rows.map((r,i)=>[String(i+1),r.b.name,`${SHAPES[r.b.shape].round?'Ø'+r.b.l:r.b.l+'×'+r.b.w}×${r.b.h}`,f1(r.b.m),
    String(r.n),String(r.pat.n),String(r.n*r.pat.n),f0(r.pat.fill*100)+' %',r.pat.name,r.sheet?'да':'нет'])));
  H.push(`<p class="sub">Ярусы идут снизу вверх. У каждого слоя своя схема укладки и свой конвейер подачи: робот берёт тару того артикула, который сейчас нужен паллете.</p>`);}
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
 H.push(`<h3>Базирование тары и техническое зрение</h3>`+repCols(['Конв.','Подача','Направляющие','Остаток после направляющих','С учётом зрения','Допуск захвата','Вывод'],
  D.base.map(x=>[String(x.i+1),INFEED[x.cv.infeed].name,ALIGN[x.cv.align].name,
   `±${f0(x.gx)} мм${x.round?'':` / ±${f1(x.ga)}°`}`,`±${f0(x.dx)} мм${x.round?'':` / ±${f1(x.da)}°`}`,
   `±${f0(x.tol.dx)} мм / ±${f1(x.tol.da)}°`,
   x.ok?'в допуске':visionOK(c.vision.mode,x.need)?'позу даёт камера':`НЕ В ДОПУСКЕ — нужно ${VISION[x.need].name.toLowerCase()}`]))
  +repTable([['Выбранная система зрения',VISION[c.vision.mode].name+(c.vision.mode!=='none'?`; кадр ${f2(D.tVision)} с добавлен в такт`:'')],
   ['Требуется по базированию',D.visNeed==='none'?'не требуется — направляющие выводят тару в допуск':VISION[D.visNeed].name],
   ['Вывод',D.visOK?'выбранная система закрывает задачу':'выбранная система задачу не закрывает']]));
 H.push(`<h3>Конвейеры подачи</h3>`+repCols(['№','Тип','L, м','м/мин','Накопление','Коробка','Подача','Привод','Зон'],
  c.conveyors.map((cv,i)=>{const x=D.convs[i];return[String(i+1),CONV_TYPES[cv.type].name,String(cv.len),String(cv.speed),cv.accum?'да':'нет',boxOf(c,cv.box).name,FEEDS[cv.feed],cv.type==='mdr'?`мотор-ролики, БП ${x.psuStd} А`:`${x.Pstd} кВт, ЧП ${f1(x.I)} А`,String(x.zones)];})));
 H.push(`<h3>Безопасность и АСУ ТП</h3>`+repTable([
  ['Режим защиты',D.safety==='fence'?'Ограждение со световыми завесами':'Лазерные сканеры, коллаборативный режим'],
  ['Время останова робота',`${c.tStop} с`],
  ['ISO 13855',D.safety==='fence'?`завеса S = ${f0(D.Slc)} мм`:`поле сканера S = ${f0(D.Ssc)} мм; стоп-поле ${f0(D.rStop)} мм, поле снижения ${f0(D.rSlow)} мм`],
  ['Промышленная сеть',c.fieldbus],
  ['Сигналы',`${D.io.DI} DI / ${D.io.DO} DO / ${D.io.SI} безопасных входов / ${D.io.SO} безопасных выходов / ${D.io.BUS} объектов по шине`],
  ['Модули ввода-вывода',`${D.io.diMod} × DI16, ${D.io.doMod} × DO16 (с запасом 20 %)`]]));
 {const P=grafProg(c),wr=grafCheck(P,c),df=c.plc.mode==='user'?grafDiff(P,grafRef(c)):[];
  H.push(`<h3>Логика ПЛК: последовательность ячейки (GRAFCET)</h3>`+repTable([
   ['Источник программы',c.plc.mode==='user'?'программа пользователя':'эталонная программа тренажёра'],
   ['Состав',`${P.g1.length} шаг${P.g1.length===1?'':'ов'} в цикле укладки (экземпляр на каждого робота), ${P.g2.length} — в обмене паллет (экземпляр на каждую станцию)`],
   ['Проверка структуры',wr.length?`${wr.length} замечани${wr.length===1?'е':'й'}: ${wr.join('; ')}`:'замечаний нет'],
   ['Отличия от эталона',c.plc.mode==='user'?(df.length?df.map(x=>x.t).join('; '):'совпадает с эталоном'):'—']]));
  H.push(repCols(['Диаграмма','Шаг','Название','Действия','Переходы: условие → шаг'],
   P.g1.map(st=>['G1',st.id,st.n,(st.act||[]).map(x=>GC_ACT[x].n).join('; ')||'нет',(st.tr||[]).map(t=>`${GC_COND[t.c]?GC_COND[t.c].n:t.c} → ${t.to}`).join('<br>')||'нет'])
   .concat(P.g2.map(st=>['G2',st.id,st.n,(st.act||[]).map(x=>GC_ACT[x].n).join('; ')||'нет',(st.tr||[]).map(t=>`${GC_COND[t.c]?GC_COND[t.c].n:t.c} → ${t.to}`).join('<br>')||'нет']))));
  H.push(`<p class="sub">Программа исполняется тренажёром: её действия дают разрешение подачи, задание роботу и вызов обмена. Выбор станции и группы остаётся за программой робота; цепи безопасности программе ПЛК не подчиняются.</p>`);}
 if(typeof S!=='undefined'&&S&&S.oee&&S.oee.obs>20){const K=oeeCalc(S.oee,S.stats,D),SH=shiftProj(K,c.shift,D),PR=dtPareto(S.oee);
  H.push(`<h3>Смена: простои и OEE</h3>`+repTable([
   ['Наблюдаемое время',`${f0(K.obs)} с, из них работа ${f0(K.run)} с; сценарий тревог — ${SCEN[S.scen.key].n.toLowerCase()}`],
   ['Готовность A',`${f1(K.A*100)} % — доля времени в состоянии Execute`],
   ['Производительность P',`${f1(K.P*100)} % при идеальном такте ${f2(K.tIdeal)} с на коробку`],
   ['Качество Q',`${f1(K.Q*100)} % — ${K.good} уложено из ${K.total} взятых в работу (уронено ${S.stats.dropped}, промахов ${S.stats.missed})`],
   ['OEE',`<b>${f1(K.oee*100)} %</b> = A × P × Q`],
   ['Проекция на смену',`${c.shift.len} ч минус ${c.shift.breaks} мин плановых остановок → ${f0(SH.boxes)} коробок, ${f1(SH.pallets)} паллет; потолок без потерь ${f0(SH.ideal)} коробок`]]));
  H.push(repCols(['Категория времени','Секунд','Доля'],
   DT_ORDER.map(k=>[DT_CAT[k].n,f0(S.oee.by[k]||0),f1((S.oee.by[k]||0)/K.obs*100)+' %'])));
  if(PR.rows.length)H.push(repCols(['Причина простоя','Раз','Всего, с','Доля','Накопленная'],
   PR.rows.slice(0,10).map(x=>[x.why,String(x.n),f0(x.t),f1(x.share*100)+' %',f1(x.cum*100)+' %'])));
  H.push(`<p class="sub">OEE считается на наблюдаемом окне с первого пуска, а не на полной смене. Идеальный такт взят по роботу как ограничителю; качество — доля тары, доехавшей до слоя без потерь.</p>`);}
 {const R=D.risk;
  H.push(`<h3>Оценка риска по ISO 12100</h3>`+repTable([
   ['Опасностей в реестре',`${R.rows.length}; выведены из состава ячейки`],
   ['Не сведены к приемлемому риску',R.bad.length?`${R.bad.length} — ${R.bad.map(x=>x.id+' («'+x.zone+'»)').join(', ')}`:'нет'],
   ['Худший остаточный класс',`${RISK_CLS[R.worst]} (приемлемы низкий и средний)`],
   ['Организационные меры',R.org.length?R.org.map(k=>ORG[k].n).join('; '):'не приняты'],
   ['Требуемый PL по реестру',`PL ${R.plr}; на вкладке безопасности задан PL ${D.pl.plr}`]]));
  H.push(repCols(['№','Зона и опасность','Этапы, кто подвергается','Без мер','Меры по трём шагам','Остаточный','PL'],
   R.rows.map(h=>[h.id,`<b>${h.zone}</b><br>${HZ_TYPE[h.type]}: ${h.n}`,
    `${h.stage.map(x=>HZ_STAGE[x]).join(', ')}<br>${h.who.map(x=>HZ_WHO[x]).join(', ')}`,
    `S${h.s} F${h.f} O${h.o} A${h.a}<br>${RISK_CLS[h.cls0]}`,
    [h.m1.length?'1. '+h.m1.map(x=>x.m.n).join('; '):'',h.m2.length?'2. '+h.m2.map(x=>x.m.n).join('; '):'',
     h.m3.length?'3. '+h.m3.map(x=>x.m.n).join('; '):'',
     h.todo.length?'Не заложено: '+h.todo.map(k=>MEAS[k].n).join('; '):''].filter(Boolean).join('<br>'),
    `S${h.res.s} F${h.res.f} O${h.res.o} A${h.res.a}<br>${RISK_CLS[h.cls]}${h.ok?'':' — НЕ ПРИЕМЛЕМО'}`,
    h.sf?`PL ${h.plr} (${h.sf})`:'—'])));
  H.push(`<p class="sub">Шкала: S — тяжесть вреда (1…4), F — частота и время воздействия, O — вероятность возникновения опасного события, A — возможность избежать вреда (по 1…3). Класс риска — по матрице «тяжесть × вероятность вреда»; ISO 12100 числовую шкалу не задаёт, применённая описана в методике. Меры идут тремя шагами п. 6 стандарта: безопасная конструкция, технические средства, информация для пользователя.</p>`);}
 {const P=D.pl;
  H.push(`<h3>Performance Level по ISO 13849-1</h3>`+repTable([
   ['Оценка риска',`${P.risk} → требуемый уровень PL ${P.plr}`],
   ['Архитектура',`${P.arch.name}; DC входов ${P.arch.dcIn} %, логики ${P.arch.dcLog} %, силовой части ${P.dcOut} %${c.pl.edm?', EDM есть':', EDM нет'}`],
   ['Наработка',`${c.pl.dop} дней в году по ${c.pl.hop} ч; срабатываний за смену: аварийный стоп ${c.pl.opsES}, завеса ${c.pl.opsLC}, дверь ${c.pl.opsDoor}`],
   ['Меры против отказов по общей причине',`${P.ccf} баллов из ${CCF_NEED} обязательных — ${P.ccfOK?'порог набран':'ПОРОГ НЕ НАБРАН, расчёт недействителен'}`],
   ['Итог',P.worst?`достигнут PL ${P.worst} при требуемом PL ${P.plr} — ${P.ok?'соответствует':'НЕ СООТВЕТСТВУЕТ'}`:'PL не определён — см. замечания']]));
  H.push(repCols(['Функция','Подсистема','Кат.','MTTFd канала, лет','DCavg, %','PL','Итог функции'],
   P.sf.flatMap(f=>f.res.map((r,i)=>[i?'':`${f.id}. ${f.name}`,r.name,r.cat,r.mttfd>=100?'≥ 100':f1(r.mttfd),f0(r.dcavg),r.pl?'PL '+r.pl:'—',
    i?'':(f.pl?`PL ${f.pl} при требуемом ${f.plr}${f.ok?'':' — НЕ СООТВЕТСТВУЕТ'}`:'не определён')]))));
  H.push(`<p class="sub">Упрощённый метод ISO 13849-1: MTTFd канала — по отказам компонентов (электромеханика из B10d и числа срабатываний), DCavg — средневзвешенный диагностический охват, PL подсистемы — по столбчатой диаграмме рис. 5, PL функции — последовательное соединение подсистем по таблице 11. Расчёт не заменяет валидацию по ISO 13849-2.</p>`);}
 {const E=D.eco;
  H.push(`<h3>Экономика: стоимость варианта и окупаемость</h3>`+repTable([
   ['Капитальные затраты',`<b>${f0(E.cap.total)} ${E.unit}</b> — оборудование ${f0(E.cap.equip)}, проектирование и ПНР ${f0(E.cap.eng)}, монтаж ${f0(E.cap.inst)}`],
   ['Режим работы',`${c.pl.dop} дней × ${c.pl.hop} ч = ${f0(E.hours)} ч в году, ${E.shifts} смен${E.shifts===1?'а':''}`],
   ['Текущие затраты ячейки',`${f0(E.cellYear)} ${E.unit} в год; потребление ${f1(E.pw.kW)} кВт`],
   ['Ручная укладка того же потока',`${E.people} человек (${E.perShift} в смену при норме ${f0(c.eco.manRate)} кор/ч на человека) — ${f0(E.manYear)} ${E.unit} в год`],
   ['Экономия',E.save>0?`${f0(E.save)} ${E.unit} в год`:`нет: ячейка дороже ручной на ${f0(-E.save)} ${E.unit} в год`],
   ['Окупаемость',`простая ${E.pay?f1(E.pay)+' года':'не окупается'}; с учётом ставки ${f0(c.eco.rate)} % — ${E.payD!==null?f1(E.payD)+' года':`дольше горизонта ${E.years} лет`}`],
   ['NPV и IRR',`${f0(E.npv)} ${E.unit} за ${E.years} лет${E.irr!==null?`, IRR ${f0(E.irr*100)} %`:''}`],
   ['Себестоимость укладки',`ячейка ${f2(E.unitCost.cellBox)} ₽/коробку против ${f2(E.unitCost.manBox)} ₽ вручную`]]));
  H.push(repCols(['Группа','Статья','Кол-во','Цена за ед.','Сумма','Откуда количество'],
   E.cap.lines.map(l=>[l.g,l.n,`${f1(l.q)} ${l.unit}`,l.price?f0(l.price):'—',f0(l.sum),l.note])));
  H.push(repCols(['Что меняем','−25 %','как в расчёте','+25 %'],
   E.sens.map(x=>[x.n,x.low?f1(x.low)+' года':'не окупается',x.base?f1(x.base)+' года':'не окупается',x.high?f1(x.high)+' года':'не окупается'])));
  H.push(`<p class="sub">Количества взяты из конфигурации и расчёта, цены за единицу задаёт пользователь. Расчёт не учитывает налоги, амортизацию, лизинг и субсидии, а также стоимость простоя линии, брака, травматизма и текучки укладчиков — а это часто и есть настоящая причина роботизации.</p>`);}
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
 const CFG_FILE={handle:null,name:''};
 const cfgFileState=()=>{const b=$('bSaveCfgNow');if(b){b.disabled=!CFG_FILE.handle;
   b.title=CFG_FILE.handle?`Перезаписать ${CFG_FILE.name}`:'Сначала сохраните конфигурацию в файл или откройте её из файла';}};
 const cfgSave=async handle=>{const txt=cfgJSON();
  const r=await saveFile(`${safeName(cfgTitle())}_${fileStamp()}.json`,'json',txt,handle);
  if(r.ok==='saved'){CFG_FILE.handle=r.handle;CFG_FILE.name=r.name;cfgFileState();repMsg(`Сохранено: ${r.name}`,'ok');}
  else if(r.ok==='download')repMsg('Конфигурация сохранена в файл.','ok');
  else if(r.ok==='cancel')repMsg('Сохранение отменено.','');
  else{const t=$('cfgText');t.hidden=false;t.value=txt;t.select();repMsg('Скачивание недоступно в этом окне — скопируйте текст ниже вручную.','bad');}};
 $('bSaveCfg').onclick=()=>cfgSave(null);
 if($('bSaveCfgNow'))$('bSaveCfgNow').onclick=()=>cfgSave(CFG_FILE.handle);
 cfgFileState();
 $('bCopyCfg').onclick=()=>{const txt=cfgJSON(),t=$('cfgText');t.hidden=false;t.value=txt;t.focus();t.select();
  try{navigator.clipboard.writeText(txt);repMsg('Конфигурация скопирована в буфер обмена.','ok');}
  catch(e){repMsg('Текст конфигурации ниже — скопируйте вручную.','');}};
 const cfgApply=(txt,name)=>{try{CFG=cfgFromJSON(txt);saveCfg();renderCfg();buildSim();renderArch();
   if($('cfgName'))$('cfgName').value=cfgTitle();
   repMsg(`Загружено: ${name} — «${cfgTitle()}». Конфигурация применена.`,'ok');return true;}
  catch(err){repMsg('Не удалось загрузить: '+err.message,'bad');return false;}};
 $('bLoadCfg').onclick=async()=>{const r=await openFile('json');
  if(r.ok==='read'){if(cfgApply(r.text,r.name)){CFG_FILE.handle=r.handle;CFG_FILE.name=r.name;cfgFileState();}return;}
  if(r.ok==='cancel')return;
  $('fCfg').click();};
 $('fCfg').onchange=e=>{const f=e.target.files&&e.target.files[0];if(!f)return;
  const rd=new FileReader();
  rd.onload=()=>cfgApply(String(rd.result),f.name);
  rd.onerror=()=>repMsg('Файл не читается.','bad');
  rd.readAsText(f);e.target.value='';};
 const sp=$('csvSep');if(sp){sp.innerHTML=Object.entries(CSV_SEPS).map(([k,v])=>`<option value="${k}">${v}</option>`).join('');
  sp.onchange=()=>csvMsg(CSV_SEP_NOTE[csvSep()]+' Числа идут без разделителя разрядов, файл — с BOM.','');}
 const cb=$('csvBtns');if(cb){cb.innerHTML=CSV_ORDER.map(k=>`<button data-csv="${k}">${CSV_TABLES[k].name}</button>`).join('');
  cb.onclick=e=>{const k=e.target.dataset.csv;if(k)csvSave(k);};}
 $('bCsvAll').onclick=()=>csvSave('*');
 $('bCsvShow').onclick=()=>{try{const r=csvBuild(CSV_LAST);csvShow(r.text);
   try{navigator.clipboard.writeText(r.text);csvMsg(`«${CSV_TABLES[CSV_LAST].name}» скопирована в буфер обмена.`,'ok');}
   catch(e){csvMsg(`«${CSV_TABLES[CSV_LAST].name}» — текст ниже, скопируйте вручную.`,'');}}
  catch(e){csvMsg('Не удалось собрать таблицу: '+e.message,'bad');}};
 $('bMakeRep').onclick=()=>{renderReport();};
 $('bDlRep').onclick=async()=>{const {c,D,png}=renderReport();
  const r=await saveFile(`${safeName(cfgTitle())}_отчёт_${fileStamp()}.html`,'html',reportStandalone(c,D,png));
  if(r.ok==='saved')repMsg(`Отчёт сохранён: ${r.name}`,'ok');
  else if(r.ok==='download')repMsg('Отчёт сохранён в файл.','ok');
  else if(r.ok==='cancel')repMsg('Сохранение отменено.','');
  else repMsg('Скачивание недоступно в этом окне — воспользуйтесь кнопкой «Печать / PDF».','bad');};
 $('bPrintRep').onclick=()=>{if(!$('repOut').innerHTML)renderReport();window.print();};}
initReport();
