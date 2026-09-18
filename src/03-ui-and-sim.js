// ======================= КОНФИГУРАТОР (UI) =======================
const num=(k,v,step,min,max,title)=>`<input type="number" data-k="${k}" value="${v}" step="${step||1}" min="${min||0}" max="${max||100000}" title="${title||''}">`;
const sel=(k,opts,v,dis)=>`<select data-k="${k}" ${dis?'disabled':''}>${opts.map(o=>`<option value="${o[0]}" ${String(o[0])===String(v)?'selected':''}>${o[1]}</option>`).join('')}</select>`;
function renderCfg(){
 const c=normalize(CFG),rob=robotOf(c),D=derive(c,true),G=D.grip,vac=GRIPPERS[c.grip.type].vac,ex=c.exch,sh=c.sheet;
 $('cfgRobot').innerHTML=`<div class="field"><label>Количество роботов</label>${sel('robots',[[1,'1 робот'],[2,'2 робота (параллельные модули)']],c.robots)}<small>Второй робот получает свой конвейер и свои станции; ячейка общая</small></div>
 <div class="field"><label>Модель</label>${sel('robot',ROBOTS.map(r=>[r.id,r.name]),c.robot)}<small>${rob.ex||'—'}</small></div>
 ${c.robot==='custom'?`<div class="field"><label>Грузоподъёмность, кг</label>${num('custom.payload',c.custom.payload,.5,1,500)}</div><div class="field"><label>Досягаемость, мм</label>${num('custom.reach',c.custom.reach,10,500,4000)}</div><div class="field"><label>Тип</label>${sel('custom.cls',[['cobot','Коллаборативный'],['industrial','Промышленный']],c.custom.cls)}</div><div class="field"><label>Норматив, циклов/мин</label>${num('custom.cpm',c.custom.cpm,.5,1,30)}</div>`:`<div class="field"><label>Норматив робота</label><span class="badge ok">${rob.cpm} циклов/мин</span><small>Циклы «взял — положил» с подходами и отходами; методика оценки производительности паллетайзера</small></div>`}
 <div class="field"><label>Скорость робота, % от максимальной</label>${num('speedPct',c.speedPct,5,10,100)}<small>Влияет на такт, ускорение груза и требуемую силу захвата (a = v / 0,25 с)</small></div>
 <div class="field"><label>Высота постамента, мм</label>${num('baseH',c.baseH,50,0,1500)}<small>Кобот на постаменте 600–900 мм, напольный паллетайзер — 0</small></div>
 <div class="field"><label>Скорость подвода и отрыва, мм/с</label>${num('motion.vPlace',c.motion.vPlace,10,20,400)}<small>Последние миллиметры к коробке и к слою робот идёт медленно, 50–150 мм/с — именно это отличает укладку от броска</small></div>
 <div class="field"><label>Высота точки подхода, мм</label>${num('motion.hAppr',c.motion.hAppr,10,5,400)}<small>С этой высоты над поверхностью начинается опускание на пониженной скорости</small></div>
 <div class="field"><label>Скорость вертикали на переносе, мм/с</label>${num('motion.vZ',c.motion.vZ,50,100,2000)}<small>Быстрый участок подъёма и опускания</small></div>
 <div class="field"><label>Время нарастания ускорения, с</label>${num('motion.tJerk',c.motion.tJerk,.05,0,1)}<small>Ограничение рывка (S-образный профиль): чем больше, тем плавнее разгон и тем меньше тара ведёт в захвате</small></div>
 <div class="field"><label>Скорость доворота кисти, °/с</label>${num('motion.wSpeed',c.motion.wSpeed,10,20,720)}<small>Захват доворачивается по стороне паллеты на переносе, а не при опускании</small></div>
 <div class="check"><div>Такт по фазам<small>перенос + подвод ${f2(D.tAppr)} с × 3 + подъём над слоем ${f2(D.tClear)} с + захват ${f2(G.tGrip)} с + сброс ${f2(G.tRel)} с</small></div><span class="badge ${D.tCycleModel>D.tCycleNorm?'warn':'ok'}">модель ${f1(D.tCycleModel)} с · норматив ${f1(D.tCycleNorm)} с</span></div>`;
 $('cfgGrip').innerHTML=`<div class="field"><label>Тип захвата</label>${sel('grip.type',Object.entries(GRIPPERS).map(([k,v])=>[k,v.name]),c.grip.type)}</div>
 ${c.grip.type==='cups'?`<div class="field"><label>Тип присосок</label>${sel('grip.cup',Object.entries(CUPS).map(([k,v])=>[k,v.name]),c.grip.cup)}<small>${CUPS[c.grip.cup].note}; μ = ${CUPS[c.grip.cup].mu}, вакуум до ${CUPS[c.grip.cup].vacMax} кПа</small></div>
 <div class="field"><label>Диаметр присоски</label>${sel('grip.cupD',[[0,'авто (подбор)']].concat(CUP_D.map(d=>[d,'Ø'+d+' мм'])),c.grip.cupD)}</div>`:''}
 ${vac?`<div class="field"><label>Уровень вакуума, кПа (−)</label>${num('grip.vac',c.grip.vac,5,20,90)}<small>Картон: 40–60 кПа; выше — расслоение и «продавливание»</small></div><div class="field"><label>Давление сжатого воздуха, бар</label>${num('grip.pressure',c.grip.pressure,.5,2,8)}<small>Эжектору нужно 4–6 бар; при пенной рамке — насос/нагнетатель</small></div>`:`<div class="field"><label>Давление сжатого воздуха, бар</label>${num('grip.pressure',c.grip.pressure,.5,2,8)}</div>`}
 <div class="field"><label>Коробок за один захват</label>${sel('grip.pick',[1,2,3,4,5,6,7,8].map(x=>[x,String(x)]),c.grip.pick,!vac)}<small>${vac?'Группа собирается у упора конвейера вплотную; каждая коробка — своя вакуумная зона':'Групповой захват — только для вакуумных типов'}</small></div>
 ${vac&&c.grip.pick>1?`<div class="field"><label>Шаг зон захвата</label>${sel('grip.pitch',[['fixed','Фиксированный: балка, группа — только ряд'],['adj','Регулируемый: зоны разводятся, группа — блок']],c.grip.pitch)}<small>Регулируемый шаг даёт подбор групп по форме слоя: 14 коробок берутся не рядами, а блоками 4+4+2+4</small></div>
 <div class="field"><label>Время перестроения зон, с</label>${num('grip.tShift',c.grip.tShift,.1,0,10)}<small>На каждый блок два перестроения: развести после захвата с конвейера и собрать обратно в ряд перед следующим</small></div>
 ${(()=>{const P=Object.values(D.pats)[0];if(!P)return'';return`<div class="check"><div>Группы по форме слоя<small>${P.adjUsed?`формы ${P.shapes}; ${P.shifts} перестроений на паллету (${f1(P.shifts*P.tShift)} с)`:`только ряды${P.planAdj?`; блоки дали бы ${P.planAdj.groups} ходов против ${P.rowGroups}, но не окупают ${P.planAdj.shifts} перестроений`:''}`}</div><span class="badge ${P.adjUsed?'ok':'warn'}">${P.groupsPerPallet} ходов на паллету</span></div>`;})()}`:''}
 <div class="field"><label>Масса захвата, кг (0 = авто)</label>${num('grip.mass',c.grip.mass,.5,0,80)}<small>Расчётная масса: ${f1(G.mass)} кг</small></div>
 <div class="field"><label>Высота захвата (фланец → контакт), мм</label>${num('gripH',c.gripH,10,50,600)}</div>
 <div class="check"><div>Расчёт захвата<small>${G.case}; a = ${f1(G.a)} м/с², S = ${G.S}</small></div><span class="badge ${G.status}">${f0(G.Fth)} / ${f0(G.Fcap)} Н</span></div>
 ${vac?`<div class="check"><div>${c.grip.type==='cups'?`Присоски: ${G.nPerBox} × Ø${G.cupD} мм на коробку, всего ${G.nCups}`:`Пенная рамка: площадь ${f0(G.A)} см²`}<small>${G.pump}; утечка ${f0(G.qLeak)} л/мин; воздух ≈ ${f0(G.air)} л/мин</small></div><span class="badge ok">захват ${f2(G.tGrip)} с · сброс ${f2(G.tRel)} с</span></div>`:`<div class="check"><div>${G.pump}<small>время захвата ${f2(G.tGrip)} с, отпускания ${f2(G.tRel)} с</small></div><span class="badge ok">${c.grip.type==='clamp'?'Ø'+G.cylD+' мм':'—'}</span></div>`}
 ${G.notes.map(n=>`<p class="note">${n}</p>`).join('')}`;
 $('cfgBoxes').innerHTML=`<div class="field"><label>Паллета</label>${sel('pallet',Object.keys(PALLETS).map(p=>[p,p]),c.pallet)}</div>
 <div class="field"><label>Макс. высота стопы с паллетой, мм</label>${num('maxStack',c.maxStack,50,300,2400)}</div>
 <div class="field"><label>Станций паллет у каждого робота</label>${sel('stations',[[1,'1'],[2,'2'],[3,'3'],[4,'4']],c.stations)}<small>Позиции вокруг робота: станции + магазины${ex.in==='robot'?' + стопка паллет':''} ≤ 6</small></div>
 <div class="field"><label>Схема укладки</label>${sel('patternMode',[['auto','Авто: максимум коробок, перевязка если возможна'],['interlock','Перекрёстная (перевязка обязательна)'],['column','Колонная (простая сетка)']],c.patternMode)}</div>
 <div class="row box h"><span>Коробка</span><span>L, мм</span><span>W, мм</span><span>H, мм</span><span>кг</span><span>выпуск шт/ч</span><span>слоёв</span><span></span></div>
 ${c.boxes.map((b,i)=>`<div class="row box"><input type="text" data-k="boxes.${i}.name" value="${b.name}">${num(`boxes.${i}.l`,b.l,10,100,1200)}${num(`boxes.${i}.w`,b.w,10,100,1000)}${num(`boxes.${i}.h`,b.h,10,50,800)}${num(`boxes.${i}.m`,b.m,.5,0.1,150)}${num(`boxes.${i}.rate`,b.rate,10,0,5000,'производительность выпуска, шт/ч (0 — не задана)')}${num(`boxes.${i}.layers`,b.layers,1,0,30,'0 — авто по высоте стопы')}<button data-act="delBox" data-i="${i}" title="Удалить" ${c.boxes.length<2?'disabled':''}>×</button></div>`).join('')}
 <div class="btns"><select id="boxPreset">${BOX_PRESETS.map((b,i)=>`<option value="${i}">${b.name} ${b.l}×${b.w}×${b.h}, ${b.m} кг${b.rate?', '+b.rate+' шт/ч':''}</option>`).join('')}</select><button data-act="addBox">Добавить коробку</button></div>
 <p class="note">Артикулы М5П … МС10 — из оценки производительности REDCARGO PRO130 (выпуск и число слоёв по документу). «Слоёв» 0 — авто по лимиту высоты.</p>
 ${Object.values(D.pats).map(p=>`<div class="check"><div>${p.name}<small>${p.stability}${p.loss>0?`; перевязка стоит ${p.loss} шт. в слое`:''}; ${p.groupsPerPallet} ходов${p.sheets?` + ${p.sheets} листов`:''} на паллету${p.adjUsed?`; группы ${p.shapes}, ${p.shifts} перестроений`:''}</small></div><span class="badge ${p.interlock?'ok':'warn'}">${p.n} в слое · ${p.layers} слоёв · ${p.total} шт.</span></div>`).join('')}`;
 $('cfgConv').innerHTML=`<div class="row conv h"><span>Тип</span><span>L, м</span><span>м/мин</span><span>Накопление</span><span>Коробка</span><span></span></div>
 ${c.conveyors.map((cv,i)=>`<div class="row conv">${sel(`conveyors.${i}.type`,Object.entries(CONV_TYPES).map(([k,v])=>[k,v.name]),cv.type)}${num(`conveyors.${i}.len`,cv.len,.5,1,12)}${num(`conveyors.${i}.speed`,cv.speed,1,3,60)}${sel(`conveyors.${i}.accum`,[['true','да'],['false','нет']],cv.accum,cv.type==='mdr')}${sel(`conveyors.${i}.box`,c.boxes.map((b,j)=>[j,b.name]),cv.box)}<button data-act="delConv" data-i="${i}" ${c.conveyors.length<2?'disabled':''}>×</button></div>
 <div class="row feed"><span>${sel(`conveyors.${i}.feed`,Object.entries(FEEDS),cv.feed)}</span>${cv.feed==='interval'?`<span>каждые ${num(`conveyors.${i}.interval`,cv.interval,1,2,120)} с</span>`:cv.feed==='rate'?`<span>${num(`conveyors.${i}.rate`,cv.rate,.5,0.5,60)} кор/мин</span>`:`<span>оператор ≈ ${num(`conveyors.${i}.rate`,cv.rate,.5,0.5,30)} кор/мин</span>`}<span class="h">→ робот ${i%c.robots+1}</span></div>`).join('')}
 <div class="btns"><button data-act="addConv" ${c.conveyors.length>=4?'disabled':''}>Добавить конвейер</button></div>
 <div class="field"><label>Высота конвейера, мм</label>${num('convH',c.convH,50,300,1200)}</div>
 <p class="note">Один конвейер кормит все станции своего робота одной коробкой; второй конвейер — следующие станции другой коробкой.</p>`;
 $('cfgSheet').innerHTML=`<div class="field"><label>Режим прокладок</label>${sel('sheet.mode',Object.entries(SHEET_MODES),sh.mode)}</div>
 ${sh.mode==='everyN'?`<div class="field"><label>Лист через каждые N слоёв</label>${num('sheet.everyN',sh.everyN,1,1,10)}</div>`:''}
 ${sh.mode!=='none'?`<div class="field"><label>Магазинов у каждого робота</label>${sel('magazines',[[1,'1'],[2,'2']],c.magazines)}</div>
 <div class="field"><label>Ёмкость магазина, листов</label>${num('sheet.cap',sh.cap,5,5,200)}<small>Пополнений в час при расчётной производительности: ${f1(D.refillsPerHour)}</small></div>
 <div class="field"><label>Вызов пополнения при остатке ≤</label>${num('sheet.low',sh.low,1,0,50)}</div>
 <div class="field"><label>Скорость робота с листом, %</label>${num('sheet.speedPct',sh.speedPct,5,10,100)}<small>Лист лёгкий и парусит: обычно 50–70 % скорости</small></div>
 <div class="field"><label>Время захвата листа, с</label>${num('sheet.tGrip',sh.tGrip,.1,0.2,5)}<small>Цикл с листом: ${f1(D.tSheet)} с; ${D.stations[0].pat.sheets} листов на паллету</small></div>
 <div class="field"><label>Секций отпускания листа</label>${num('sheet.sect',sh.sect,1,1,8)}<small>Вакуум сбрасывается не разом, а по секциям за ${f2(D.tRelSheet)} с — иначе лист парусит и сползает со слоя</small></div>`:'<p class="note">Листы не используются: магазины убраны из компоновки. Допустимо только для жёстких коробок с перевязкой.</p>'}`;
 $('cfgExch').innerHTML=`<div class="field"><label>Вывоз готовых паллет</label>${sel('exch.out',Object.entries(EXCH_OUT),ex.out)}</div>
 <div class="field"><label>Подача пустых паллет</label>${sel('exch.in',Object.entries(EXCH_IN).filter(([k])=>ex.out==='conveyor'?k==='dispenser':k!=='dispenser'),ex.in)}<small>${ex.in==='robot'?`Стопка паллет занимает позицию у робота; хватает на ${f1(D.stackHours)} ч`:ex.in==='vehicle'?'Тележка увозит полную и привозит пустую за один выезд':'Диспенсер на 15 паллет на конвейере'}</small></div>
 ${ex.in==='robot'?`<div class="field"><label>Паллет в стопке</label>${num('exch.stack',ex.stack,1,2,25)}</div>`:''}
 ${sh.mode!=='none'?`<div class="field"><label>Пополнение прокладок</label>${sel('exch.sheetsBy',Object.entries(SHEETS_BY),ex.sheetsBy)}</div>`:''}
 ${ex.out!=='conveyor'?`<div class="field"><label>Режим обмена в симуляции</label>${sel('exch.auto',[['true','Автоматически: тележка/человек приезжают сами'],['false','По команде с пульта (кнопки)']],ex.auto)}</div>
 <div class="field"><label>Время подъезда, с</label>${num('exch.reaction',ex.reaction,5,0,300)}<small>От сигнала «паллета готова» до появления у проёма</small></div>`:'<p class="note">Конвейер паллет: обмен всегда автоматический — готовая паллета уезжает, диспенсер ставит пустую.</p>'}
 <div class="check"><div>Обменов паллет в час<small>${EXCH_OUT[ex.out]}</small></div><span class="badge ${D.palletsPerHour>8&&ex.out==='jack'?'warn':'ok'}">${f1(D.palletsPerHour)}</span></div>`;
 $('cfgSafety').innerHTML=`<div class="field"><label>Защита</label>${sel('safety',[['auto','Авто по типу робота'],['fence','Ограждение + световые завесы'],['cobot','Без ограждения: сканеры + снижение скорости']],c.safety,rob.cls!=='cobot')}<small>${rob.cls!=='cobot'?'Промышленный робот — только ограждение':'Кобот: допустима работа без ограждения при оценке риска по ISO/TS 15066'}</small></div>
 <div class="field"><label>Время останова робота T, с</label>${num('tStop',c.tStop,.05,0.1,2)}<small>Из паспорта робота + реакция КБ; входит в S = K·T + C</small></div>
 <div class="field"><label>Связь ПЛК ↔ робот ↔ ЧП</label>${sel('fieldbus',FIELDBUS.map(f=>[f,f]),c.fieldbus)}</div>
 <div class="field"><label>Радиус расстановки паллет и магазинов, мм</label>${num('slotR',c.slotR,25,600,3000)}<small>Фактически ${f0(D.LY.R)} мм${D.LY.R>c.slotR?' (увеличен, чтобы позиции не перекрывались)':''}</small></div>
 <div class="field"><label>База → точка захвата, мм</label>${num('pickDist',c.pickDist,25,400,3000)}</div>`;
 $('cfgOpt').innerHTML=`<div class="field"><label>Целевая производительность, кор/ч</label>${num('opt.target',c.opt.target,10,10,5000)}</div>
 <div class="field"><label>Допускать коботов</label>${sel('opt.allowCobot',[['true','да'],['false','нет — только промышленные']],c.opt.allowCobot)}</div>
 <div class="field"><label>Максимум роботов</label>${sel('opt.maxRobots',[[1,'1'],[2,'2']],c.opt.maxRobots)}</div>
 <div class="btns"><button data-act="optimize">Предложить конфигурацию</button></div><div class="opt" id="optOut"><p class="note">Перебирает роботы каталога, число роботов, коробок за захват и станций при текущих коробках, паллете и подаче; выбирает самый дешёвый вариант, который укладывается в досягаемость, нагрузку, силу захвата и даёт целевую производительность.</p></div>`;
 renderPlan(planSKU(c,D));renderChecks(D);}
function renderPlan(P){
 const c=CFG;const rows=P.rows;
 $('cfgPlan').innerHTML=`<p class="note">Как в оценке производительности паллетайзера: циклов на паллету = ходов с коробками (группы в слое × слоёв) + листы${c.exch.in==='robot'?' + паллета':''}; требуемые циклы/мин = циклы на паллету ÷ время, за которое приходит паллета коробок. ${c.grip.pitch==='adj'?'Время перестроения зон вычтено из времени на паллету. ':''}Робот даёт <b>${f1(P.capCpm)} циклов/мин</b>${c.robots>1?' (два робота)':''} при ${c.grip.pick} коробк${c.grip.pick===1?'е':'ах'} за захват.</p>
 <div class="svgwrap"><table><tr><th>Артикул</th><th>Размер, кг</th><th>Выпуск, шт/ч</th><th>Схема</th><th>В слое × слоёв</th><th>Ходов + листов</th><th>Паллета приходит за</th><th>Требуется циклов/мин</th><th>Загрузка робота</th></tr>
 ${rows.map(r=>`<tr><td>${r.b.name}</td><td>${r.b.l}×${r.b.w}×${r.b.h}, ${r.b.m}</td><td>${r.b.rate||'—'}</td><td style="color:var(--muted)">${r.p.name}</td><td>${r.p.n} × ${r.p.layers} = ${r.p.total}</td><td>${r.p.groupsPerPallet} + ${r.p.sheets}${c.exch.in==='robot'?' + 1':''} = ${r.cyc}</td><td>${r.tPal?f1(r.tPal)+' мин':'—'}</td><td>${r.reqCpm?f1(r.reqCpm):'—'}</td><td>${r.reqCpm?`<span class="badge ${r.reqCpm/P.capCpm>1?'bad':r.reqCpm/P.capCpm>.85?'warn':'ok'}">${f0(r.reqCpm/P.capCpm*100)} %</span>`:'—'}</td></tr>`).join('')}</table></div>
 ${rows.filter(r=>r.b.rate>0).length>1?`<p class="note" style="margin-top:8px">Все артикулы одновременно потребовали бы ${f1(P.sumAll)} циклов/мин. Пары, которые робот тянет вместе (для двух линий подачи), по убыванию загрузки: ${P.pairs.length?P.pairs.map(p=>`<b>${p.a.b.name} + ${p.b.b.name}</b> — ${f0(p.util*100)} %`).join('; '):'нет ни одной'}${P.bad?`; ${P.bad} пар${P.bad===1?'а':''} не проходят — компонуйте низкопроизводительные коробы с высокопроизводительными`:''}.</p>`:'<p class="note" style="margin-top:8px">Задайте выпуск (шт/ч) хотя бы двум коробкам — появится подбор пар для совместной укладки.</p>'}`;}
function renderChecks(D){
 const c=CFG;D=D||derive(c,true);const bd=(s,t)=>`<span class="badge ${s}">${t}</span>`;
 const rows=[['Досягаемость',bd(D.reachStatus,`${f0(D.rReq)} / ${f0(D.rob.reach)} мм · запас ${f0(D.reachMargin*100)} %`),`самая дальняя точка: ${D.rWhere}; радиус расстановки ${f0(D.LY.R)} мм`],
  ['Грузоподъёмность',bd(D.payStatus,`${f1(D.mReq)} / ${D.rob.payload} кг · ${f0(D.util*100)} %`),`${c.grip.pick>1?c.grip.pick+' × ':''}${D.heaviest.m} кг + захват ${f1(D.gripM)} кг${c.exch.in==='robot'?'; паллета '+D.pal.m+' кг':''}`],
  ['Захват',bd(D.grip.status,`${f0(D.grip.Fth)} / ${f0(D.grip.Fcap)} Н · ${f0(D.grip.util*100)} %`),`${GRIPPERS[c.grip.type].name}; ${D.grip.case}; захват ${f2(D.grip.tGrip)} с`]];
 if(c.grip.pick>1)Object.values(D.pats).forEach(p=>rows.push(['Группы захвата',bd(p.adjUsed?'ok':'warn',`${p.groupsPerPallet} ходов на паллету${p.adjUsed?` · ${p.shapes}`:' · только ряды'}`),p.adjUsed?`Регулируемый шаг зон: рядами было бы ${p.rowGroups} ходов; ${p.shifts} перестроений по ${f1(p.tShift)} с = ${f1(p.shifts*p.tShift)} с на паллету`:`Фиксированный шаг зон — группа только ряд вплотную; ${f1(p.kEff)} коробки за ход из ${c.grip.pick}`]));
 Object.values(D.pats).forEach(p=>rows.push(['Схема укладки',bd(p.interlock?'ok':(c.patternMode==='column'?'ok':'warn'),`${p.n} в слое · ${p.layers} слоёв · ${p.total} шт.${c.grip.pick>1?` · ${f1(p.kEff)} за ход`:''}`),`${p.name}; ${p.stability}; заполнение ${f0(p.fill*100)} %; стопа ${f0(p.stackH)} мм, ${f0(p.mass)} кг`]));
 rows.push(['Цикл робота',bd('ok',`${f1(D.tCycle)} с · ${f1(D.cpm)} циклов/мин`),`геометрия ${f1(D.tCycleModel)} с, норматив ${f1(D.tCycleNorm)} с${c.sheet.mode!=='none'?`; цикл с листом ${f1(D.tSheet)} с`:''}${c.exch.in==='robot'?`; с паллетой ${f1(D.tPallet)} с`:''}`],
  ['На паллету',bd('ok',`${D.cyclesPerPallet} циклов · ${f1(D.tPerPallet/60)} мин`),`${f1(D.tPerBox)} с на коробку${c.stations===1?`; простой на обмен ${f0(D.exLoss*100)} %`:''}; ${c.robots>1?'два робота: ':''}${f0(D.capRobot)} кор/ч`],
  ['Производительность',bd(D.bottleneck<D.capRobot*0.6?'warn':'ok',`${f0(D.bottleneck)} кор/ч · ${f1(D.palletsPerHour)} паллет/ч`),`ограничивает: ${D.bnName}; подача ${f0(D.capFeed)}, конвейер ${f0(D.capConv)}, ${c.robots>1?'роботы':'робот'} ${f0(D.capRobot)}`],
  ['Обмен и расходники',bd(D.refillsPerHour>2||(c.exch.out==='jack'&&D.palletsPerHour>8)?'warn':'ok',`${f1(D.palletsPerHour)} паллет/ч${c.sheet.mode!=='none'?` · ${f0(D.sheetsPerHour)} листов/ч`:''}`),`${EXCH_OUT[c.exch.out]}${c.exch.in==='robot'?`; стопки хватает на ${f1(D.stackHours)} ч`:''}${c.sheet.mode!=='none'?`; магазин ${c.sheet.cap} листов → ${f1(D.refillsPerHour)} пополнений/ч (${SHEETS_BY[c.exch.sheetsBy].toLowerCase()})`:''}`],
  ['Безопасное расстояние',bd('ok',D.safety==='fence'?`завеса S ≥ ${f0(D.Slc)} мм`:`поле сканера S ≥ ${f0(D.Ssc)} мм`),D.safety==='fence'?`ISO 13855: K=${D.Slc>500?'1600':'2000'} мм/с, T=${(c.tStop+0.03).toFixed(2)} с, C=128 мм`:`ISO 13855: K=1600, T=${(c.tStop+0.1).toFixed(2)} с, C=1200−0,4·H`]);
 D.convs.forEach((x,i)=>{const cv=c.conveyors[i];rows.push([`Конвейер ${i+1}`,bd('ok',cv.type==='mdr'?`${x.zones} зон · БП ${x.psuStd} А`:`${x.Pstd} кВт · ЧП ${f1(x.I)} А`),`${x.zones} зон по ${f0(x.zoneLen)} мм; F = ${f0(x.F)} Н; пропуск ${f0(x.capPerMin)} кор/мин; подача ${f1(x.feedPerMin)} кор/мин; проход ${f0(x.transit)} с`]);});
 $('checks').innerHTML=rows.map(r=>`<div class="check"><div>${r[0]}<small>${r[2]}</small></div>${r[1]}</div>`).join('');
 $('warnings').innerHTML=D.warnings.length?D.warnings.map(w=>`<li>${w}</li>`).join(''):'<li style="color:var(--muted)">Замечаний нет.</li>';}
function setPath(obj,path,val){const p=path.split('.');let o=obj;for(let i=0;i<p.length-1;i++)o=o[p[i]];o[p[p.length-1]]=val;}
const STRUCT=/^(robot|robots|custom\.cls|grip\.(type|cup|pick|pitch|tShift)|stations|magazines|patternMode|pallet|safety|sheet\.mode|exch\.(out|in|sheetsBy|auto)|conveyors\.\d+\.(type|feed|box))$/;
$('tab-cfg').addEventListener('input',e=>{const k=e.target.dataset.k;if(!k)return;let v=e.target.value;
 if(e.target.type==='number'){v=+v;if(isNaN(v))return;}else if(v==='true'||v==='false')v=v==='true';else if(/^-?\d+(\.\d+)?$/.test(v)&&!k.endsWith('name'))v=+v;
 setPath(CFG,k,v);if(k==='stations'||k==='exch.in'){const extra=CFG.exch.in==='robot'?1:0;if(CFG.stations+CFG.magazines+extra>6)CFG.magazines=Math.max(0,6-CFG.stations-extra);}
 normalize(CFG);saveCfg();if(STRUCT.test(k))renderCfg();else{const D=derive(CFG,true);renderPlan(planSKU(CFG,D));renderChecks(D);}});
$('tab-cfg').addEventListener('click',e=>{const act=e.target.dataset.act;if(!act)return;const i=+e.target.dataset.i;
 if(act==='addBox'){const p=BOX_PRESETS[+$('boxPreset').value];CFG.boxes.push({...p,name:p.name+(CFG.boxes.some(b=>b.name===p.name)?' '+(CFG.boxes.length+1):'')});}
 if(act==='delBox'){CFG.boxes.splice(i,1);CFG.conveyors.forEach(cv=>{if(cv.box>=CFG.boxes.length)cv.box=0;});}
 if(act==='addConv')CFG.conveyors.push({type:'roller',len:3,speed:12,accum:true,box:Math.min(CFG.conveyors.length,CFG.boxes.length-1),feed:'manual',interval:10,rate:6});
 if(act==='delConv'){CFG.conveyors.splice(i,1);if(CFG.robots>CFG.conveyors.length)CFG.robots=CFG.conveyors.length;}
 if(act==='optimize'){runOptimizer();return;}
 if(act==='applyOpt'){if(OPT&&OPT.best){CFG=OPT.best.t;CFG.opt=deep(OPT.opt);saveCfg();S.flags.optApplied=true;renderCfg();buildSim();renderArch();showTab('sim');}return;}
 saveCfg();renderCfg();});
let OPT=null;
function runOptimizer(){const out=$('optOut');out.innerHTML='<p class="note">Считаю варианты…</p>';setTimeout(()=>{OPT=optimize(CFG);OPT.opt=deep(CFG.opt);const b=OPT.best;
 if(!b){out.innerHTML='<p class="note">Ни один вариант каталога не проходит по досягаемости или нагрузке. Уменьшите число позиций, высоту стопы или радиус расстановки.</p>';return;}
 const line=x=>`${x.nR>1?'2 × ':''}${x.r.name}, по ${x.k} кор. за захват${x.pitch==='adj'?' (регулируемый шаг зон)':''}, ${x.st} станц${x.st===1?'ия':'ии'}${x.nR>1?' у каждого':''} → ${f0(x.D.bottleneck)} кор/ч, ограничивает ${x.D.bnName}; досягаемость ${f0(x.D.rReq)}/${f0(x.r.reach)} мм, нагрузка ${f0(x.D.util*100)} %, защита — ${x.D.safety==='fence'?'ограждение':'сканеры'}; индекс стоимости ${f1(x.cost)}`;
 out.innerHTML=`<p><b>${OPT.ok?'Рекомендация':'Цель не достигнута — лучшее по производительности'}:</b> ${line(b)}.</p>${OPT.ok?'':`<p class="note">Целевые ${f0(CFG.opt.target)} кор/ч недостижимы при текущей подаче (${f0(b.D.capFeed)} кор/ч) или конвейере: переведите подачу на автомат, добавьте конвейер или увеличьте скорость.</p>`}
 ${OPT.alts.length?`<p class="note">Альтернативы:</p><ul class="warnings">${OPT.alts.map(x=>`<li>${line(x)}</li>`).join('')}</ul>`:''}<div class="btns"><button class="b-apply" data-act="applyOpt">Применить предложение</button></div>`;},30);}
$('bApply').onclick=()=>{buildSim();renderArch();showTab('sim');};
$('bDefaults').onclick=()=>{CFG=deep(DEF);saveCfg();renderCfg();};
// ======================= АРХИТЕКТУРА =======================
function renderArch(){
 const c=CFG,D=DD;const disc=c.fieldbus==='Дискретные сигналы',nR=c.robots,ex=c.exch;
 $('archCards').innerHTML=[['Роботы',`${nR} × ${D.rob.name}`,`нагрузка ${f0(D.util*100)} %, досягаемость ${f0((1-D.reachMargin)*100)} %`],['Захват',`${GRIPPERS[c.grip.type].name}`,`${c.grip.pick} кор. за ход${D.adjUsed?', блоки '+Object.values(D.pats)[0].shapes:''}, ${f0(D.grip.Fth)}/${f0(D.grip.Fcap)} Н`],['Защита',D.safety==='fence'?'Ограждение + завесы':'Сканеры + снижение скорости',D.safety==='fence'?`S завесы ${f0(D.Slc)} мм`:`поле ${f0(D.Ssc)} мм`],['Сигналы ПЛК',`${D.io.DI} DI / ${D.io.DO} DO`,`${D.io.BUS} объектов по шине`],['Цепь безопасности',`${D.io.SI} двухкан. входов`,`${D.io.SO} безопасных выходов`],['Производительность',`${f0(D.bottleneck)} кор/ч`,`${D.cyclesPerPallet} циклов на паллету; ограничивает ${D.bnName}`]].map(x=>`<div class="card"><span>${x[0]}</span><b>${x[1]}</b><span>${x[2]}</span></div>`).join('');
 const N={},E=[];const node=(id,x,y,w,t,sub)=>N[id]={x,y,w,t,sub};
 node('HMI',40,40,150,'Панель оператора HMI','Ethernet');node('SW',300,40,180,'Коммутатор Ethernet',disc?'HMI, ПЛК':c.fieldbus);
 for(let r=0;r<nR;r++)node('ROB'+r,560+r*180,40,165,`Контроллер робота ${r+1}`,'пульт обучения');
 node('PLC',40,180,190,'ПЛК',`${D.io.DI} DI · ${D.io.DO} DO`);node('SAF',300,180,190,'Контроллер безопасности',`${D.io.SI} вх. · ${D.io.SO} вых.`);node('KM',560,180,150,'Контактор KM1','питание приводов');
 if(ex.out==='amr')node('AMR',740,180,150,'Флот-менеджер AMR','Wi-Fi / Ethernet');
 let x=30;c.conveyors.forEach((cv,i)=>{node('DR'+i,x,330,150,cv.type==='mdr'?`Шлюз мотор-роликов ${i+1}`:`ЧП конвейера ${i+1}`,cv.type==='mdr'?`${D.convs[i].zones} зон`:`${D.convs[i].Pstd} кВт, STO`);x+=165;});
 if(ex.out==='conveyor'){node('DRP',x,330,150,'ЧП конвейеров паллет',`${D.stations.length} шт., STO`);x+=165;}
 node('IO',Math.min(x,560),330,160,'Датчики, пульт, лампы','24 В DI/DO');node('SDEV',Math.min(x+175,735),330,160,D.safety==='fence'?'Стопы, завесы, замок':'Стопы, сканеры','2-канальные цепи');
 const edge=(a,b,l,safe)=>E.push({a,b,l,safe});
 edge('HMI','SW','Ethernet');edge('SW','PLC',disc?'Ethernet':c.fieldbus);for(let r=0;r<nR;r++){edge('SW','ROB'+r,disc?'Ethernet (сервис)':c.fieldbus);if(disc)edge('PLC','ROB'+r,'16 DI/DO');edge('SAF','ROB'+r,'Protective / E-stop',true);}
 c.conveyors.forEach((cv,i)=>{if(cv.type==='mdr')edge('SW','DR'+i,disc?'Ethernet':c.fieldbus);else{edge(disc?'PLC':'SW','DR'+i,disc?'DI/DO':c.fieldbus);edge('SAF','DR'+i,'STO',true);}});
 if(ex.out==='conveyor'){edge(disc?'PLC':'SW','DRP',disc?'DI/DO':c.fieldbus);edge('SAF','DRP','STO',true);}
 if(ex.out==='amr')edge('SW','AMR','заявки, статус');
 edge('PLC','IO','24 В');edge('SAF','SDEV','OSSD, НЗ контакты',true);edge('SAF','KM','катушка + ОС',true);edge('PLC','SAF',disc?'диагностика DI':'диагностика по шине');
 let s='';for(const id in N){const n=N[id];s+=`<rect x="${n.x}" y="${n.y}" width="${n.w}" height="56" rx="5" fill="var(--panel)" stroke="${id==='SAF'||id==='SDEV'?'var(--red)':id.startsWith('ROB')?'var(--robot)':'var(--fence)'}" stroke-width="1.5"/><text x="${n.x+n.w/2}" y="${n.y+23}" text-anchor="middle" font-size="12" font-weight="500" fill="var(--ink)">${n.t}</text><text x="${n.x+n.w/2}" y="${n.y+41}" text-anchor="middle" font-size="11" fill="var(--muted)">${n.sub}</text>`;}
 let lines='';E.forEach(e=>{const a=N[e.a],b=N[e.b];if(!a||!b)return;const ax=a.x+a.w/2,ay=a.y+(b.y>a.y?56:b.y<a.y?0:28),bx=b.x+b.w/2,by=b.y+(a.y>b.y?56:a.y<b.y?0:28);const mx=(ax+bx)/2,my=(ay+by)/2;
  lines+=`<line x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}" stroke="${e.safe?'var(--red)':'var(--muted)'}" stroke-width="1.5" ${e.safe?'stroke-dasharray="5 4"':''}/><rect x="${mx-e.l.length*3.3-3}" y="${my-8}" width="${e.l.length*6.6+6}" height="15" rx="3" fill="var(--panel)" opacity=".92"/><text x="${mx}" y="${my+3.5}" text-anchor="middle" font-size="10.5" fill="${e.safe?'var(--red)':'var(--muted)'}">${e.l}</text>`;});
 $('net').innerHTML=lines+s;
 $('bom').innerHTML='<tr><th>Группа</th><th>Элемент</th><th>Кол-во</th><th>Назначение и подключение</th></tr>'+D.bom.map(b=>`<tr><td class="tag">${b.g}</td><td>${b.n}</td><td>${b.q}</td><td style="color:var(--muted)">${b.p}</td></tr>`).join('');
 $('ioSummary').innerHTML=`<div class="cards"><div class="card"><span>Дискретные входы</span><b>${D.io.DI}</b><span>${D.io.diMod} модуля по 16 (резерв 20 %)</span></div><div class="card"><span>Дискретные выходы</span><b>${D.io.DO}</b><span>${D.io.doMod} модуля по 16</span></div><div class="card"><span>По сети</span><b>${D.io.BUS}</b><span>объектов обмена</span></div><div class="card"><span>Безопасность</span><b>${D.io.SI} / ${D.io.SO}</b><span>двухканальных входов / выходов</span></div></div>`;
 $('sig').innerHTML='<tr><th>Тип</th><th>Тег</th><th>Сигнал</th><th>Источник</th><th>Подключение</th></tr>'+D.sig.map(x=>`<tr><td class="tag">${x.k}</td><td class="tag">${x.t}</td><td>${x.nm}</td><td style="color:var(--muted)">${x.src}</td><td style="color:var(--muted)">${x.how}</td></tr>`).join('');
 const G=D.grip,vac=GRIPPERS[c.grip.type].vac;
 $('archText').innerHTML=`<h3>Как всё соединяется — от ввода до робота</h3>
<p><b>Силовая часть.</b> Ввод 3~400 В → вводной выключатель с блокировкой → УЗИП и ЭМС-фильтр → главный контактор KM1 → автоматы потребителей: ЧП конвейеров, контроллер${nR>1?'ы':''} робот${nR>1?'ов':'а'}, блок питания 24 В. KM1 управляется безопасным выходом контроллера безопасности, его зеркальный контакт возвращается на вход КБ. Шина 24 В разделена на группы с отдельными автоматами: ПЛК и HMI, датчики, выходы, цепь безопасности.</p>
<p><b>Цепь безопасности живёт отдельно от ПЛК.</b> ${D.safety==='fence'?'Аварийные стопы, контакты двери, контроль замка, OSSD световых завес и датчики мьютинга':'Аварийные стопы, OSSD лазерных сканеров и сигнал поля снижения скорости'} заходят двухканально в конфигурируемый контроллер безопасности. Его выходы: STO каждого ЧП, Protective Stop и Emergency Stop ${nR>1?'каждого контроллера робота':'контроллера робота'}${D.safety==='cobot'?', Reduced Mode (коллаборативные лимиты скорости и силы), выбор набора полей сканеров':', питание замка двери, мьютинг завес проёмов'}, катушка KM1. ПЛК получает только диагностику: PL e требует категории 3/4 с двумя каналами и самодиагностикой.</p>
<p><b>Проёмы обмена.</b> ${ex.out==='conveyor'?'Паллеты выезжают через тоннель с завесой в мьютинге на выезд: ПЛК даёт сигнал «выезд», КБ мутирует завесу по датчикам паллеты.':`Каждая станция обмена имеет свой проём с завесой S6, лампой «освобождено» и кнопкой «готово». Логика КБ: завеса ${D.safety==='fence'?'в мьютинге (байпас)':'сектор исключён из поля сканера'} только когда ПЛК подтвердил «станция освобождена» (паллета готова, робот не в секторе) — это безопасный сигнал, поэтому робот блокируется от захода в сектор аппаратно. ${ex.out==='amr'?'AMR запрашивает стыковку у флот-менеджера, ПЛК даёт разрешение AMR.OK только для освобождённой станции; сигналы «на позиции» / «убыл» закрывают цикл.':'Человек или погрузчик входят в проём, меняют паллету, нажимают «готово» — только после этого робот снова допускается к станции.'}`}${c.sheet.mode!=='none'?` Магазин прокладок загружается снаружи через свой проём с завесой S7 по той же схеме; во время загрузки ПЛК исключает магазин из заданий робота.`:''}</p>
<p><b>Категории стопов.</b> Аварийный стоп — категория 0: STO и KM1 сразу. Нарушение ${D.safety==='fence'?'завесы':'защитного поля'} — категория 1: управляемое торможение робота за ${c.tStop} с, затем снятие силового питания. Это время входит в S = K·T + C: ${D.safety==='fence'?`для завесы S = ${f0(D.Slc)} мм`:`для сканера S = ${f0(D.Ssc)} мм от границы досягаемости, радиус поля снижения скорости ${f0(D.rSlow)} мм`}.</p>
<p><b>Захват и пневматика.</b> ${vac?`${c.grip.pick} вакуумных зон${c.grip.pick>1?' — по одной на коробку, чтобы неполная группа не теряла вакуум на пустой зоне':''}: ${G.pump}, на каждой зоне вакуумный датчик PS с аналоговым выходом или порогом −${G.vac} кПа. Клапаны вакуума и сдува управляет робот со своих выходов (короткая реакция), ПЛК получает копию сигналов для диагностики. Пневмоподготовка с реле давления: при падении ниже ${c.grip.pressure} бар ячейка уходит в Held до потери груза, а не после.`:c.grip.type==='clamp'?`Два цилиндра Ø${G.cylD} мм на распределителе 5/2 с датчиками положения; при аварийном стопе давление в зажиме сохраняется (обратные клапаны), чтобы коробка не упала.`:'Цилиндры вилок и прижима с датчиками положения; при аварийном стопе давление сохраняется.'}${c.grip.pick>1&&c.grip.pitch==='adj'?` Зоны сидят на телескопических штангах: распределитель YG1 разводит их в блок под форму слоя, YG2 собирает обратно в ряд с шагом коробки под конвейер. Робот не опускает захват, пока датчик S_G1/S_G2 не подтвердил положение — иначе коробки встанут мимо своих мест.`:''}${ex.in==='robot'?' Для паллет на захвате откидные крюки с датчиком положения: робот берёт пустую паллету из стопки за верхнюю доску.':''}</p>
<p><b>ПЛК ↔ робот.</b> ${disc?'Дискретный обмен: 8 выходов ПЛК на входы робота (пуск программы, стоп, сброс, два бита номера программы, «группа готова», «паллета готова», разрешение) и 8 выходов робота на входы ПЛК.':`По ${c.fieldbus}: ПЛК пишет слово команд и номер программы (рецепт укладки, номер слоя и позиции), читает слово состояния, счётчики, код ошибки. Сигналы безопасности — отдельными двухканальными цепями.`} ПЛК ведёт последовательность ячейки (PackML), робот исполняет программу укладки и возвращает статусы${nR>1?'; два робота получают независимые задания от ПЛК и не знают друг о друге':''}.</p>
<p><b>ПЛК ↔ ЧП.</b> ${disc?'Дискретно: пуск/скорость через реле, «готов/авария» — назад.':`По ${c.fieldbus}: слово управления, задание частоты, обратно — состояние, ток, аварии.`} STO — отдельными жилами от КБ. ${D.convs.some((x,i)=>c.conveyors[i].type==='mdr')?'Мотор-ролики: контроллеры зон реализуют ZPA сами, ПЛК через шлюз даёт разрешение на выпуск коробки в зону захвата.':''}${c.grip.pick>1?` Для группового захвата зона у упора накапливает ${c.grip.pick} коробок: ПЛК останавливает подачу в зону, когда датчик B2 подтвердил полную группу, и разрешает роботу захват.`:''}</p>
<p><b>Автоподача.</b> ${c.conveyors.some(x=>x.feed!=='manual')?'Упаковочная машина связана с ПЛК двумя сигналами: «готов принять» (ПЛК → машина, снимается при Suspended/Held и заполнении накопителя) и «коробка отправлена» (машина → ПЛК, счёт входа). При ручной загрузке эти сигналы заменяет датчик B5.':'При ручной загрузке интерфейса с оборудованием выше по потоку нет; вход считается по датчику B5.'}</p>
<h3>Порядок пусконаладки</h3><ul><li>Цепь безопасности без питания приводов: каждый стоп, дверь, ${D.safety==='fence'?'завеса с мьютингом и без, байпас проёмов только при «освобождено»':'оба поля сканеров и переключение наборов полей'} — протокол валидации по ISO 13849-2.</li><li>I/O-check по списку сигналов.</li><li>ЧП: направление, рампы, ток; STO из шкафа.</li><li>Захват: ${vac?'вакуум на реальной коробке, время набора, тест на потерю при обрыве шланга':'усилие и датчики положения'}; масса захвата и центр тяжести — в настройки робота.</li><li>Робот: точки для каждой схемы и слоя, снижение скорости у паллеты, обмен с ПЛК по каждому шагу GRAFCET.</li>${ex.out==='amr'?'<li>AMR: маршруты, точки стыковки, обмен заявками с ПЛК, поведение при потере связи.</li>':''}<li>Прогон с коробками: такт, накопление, защитная остановка в каждой точке цикла — коробка не должна падать при стопе категории 1.</li></ul>`;
 $('algoText').innerHTML=algoText(c,D);}
// ======================= СИМУЛЯЦИЯ =======================
const STEPS=[['wait','Ожидание коробок / выбор задания'],
 ['toPick','Подход к зоне захвата со снижением к точке подхода'],['downPick','Опускание к коробке на скорости подвода'],['grip','Захват: вакуум ВКЛ, контроль датчиков'],['upPick','Отрыв груза строго вверх'],
 ['shift','Перестроение зон захвата в блок'],['toPlace','Перенос на паллету с доворотом кисти'],['downPlace','Опускание на слой на скорости подвода'],['place','Укладка: сброс вакуума, счётчик слоя'],['upPlace','Подъём над уложенным слоем'],['unshift','Перестроение зон обратно в ряд'],
 ['toMag','Движение к магазину прокладок'],['downMag','Опускание к верхнему листу'],['gripSheet','Захват прокладочного листа'],['upMag','Отрыв листа от стопки'],
 ['toSheet','Перенос листа с доворотом по стороне паллеты'],['downSheet','Опускание листа на слой'],['placeSheet','Укладка листа: сброс вакуума по секциям'],['upSheet','Подъём над листом'],
 ['toStack','Движение к стопке паллет'],['downStack','Опускание к верхней паллете'],['gripPallet','Захват пустой паллеты крюками'],['upStack','Подъём паллеты со стопки'],
 ['toStation','Перенос паллеты на станцию'],['downStation','Опускание паллеты на станцию'],['placePallet','Установка паллеты'],['upStation','Подъём над паллетой'],
 ['home','Возврат в исходную']];
let DD,GG,S;
const TASKSTATE=(()=>{try{return JSON.parse(localStorage.getItem('pal-sim-tasks4')||'{}')||{};}catch(e){return{};}})();
function newPal(present){return{present:present!==false,count:0,layer:0,parity:0,gi:0,placed:[],last:null,sheets:0,sheetLayers:[],complete:false,needSheet:false,released:false,out:0,phase:'idle',gap:0,waitT:0,agent:null};}
function geometry(c,D){
 const LY=D.LY,rDraw=Math.min(D.rSlow,3000);let xMin,xMax,yMin,yMax;const cx0=Math.min(...LY.convs.map(x=>x.x0));
 if(D.safety==='fence'){xMin=Math.min(D.F.x0,cx0)-250;xMax=D.F.x1+200;yMin=D.F.y0-200;yMax=D.F.y1+200;}
 else{xMin=Math.min(cx0-300,-rDraw);xMax=Math.max(D.F.x1-400,rDraw);yMin=Math.min(D.F.y0-400,-rDraw);yMax=Math.max(D.F.y1-400,LY.robots[LY.robots.length-1].base.y+rDraw);}
 if(c.exch.out!=='conveyor'||c.sheet.mode!=='none'){LY.robots.forEach(r=>r.slots.forEach(s=>{if(s.kind==='ps')return;xMin=Math.min(xMin,s.park.x-700);xMax=Math.max(xMax,s.park.x+700);yMin=Math.min(yMin,s.park.y-700);yMax=Math.max(yMax,s.park.y+700);}));}
 const sc=Math.min(860/(xMax-xMin),520/(yMax-yMin));const ox=20+(860-(xMax-xMin)*sc)/2-xMin*sc,oy=40+(520-(yMax-yMin)*sc)/2-yMin*sc;
 return{sc,ox,oy,P:(x,y)=>[ox+x*sc,oy+y*sc],rDraw,xMin,xMax,yMin,yMax};}
function buildSim(){
 normalize(CFG);DD=derive(CFG);GG=geometry(CFG,DD);const c=CFG;const prevOpt=S?S.flags.optApplied:false;
 S={packml:'Stopped',why:'Требуется сброс после включения питания',estop:false,door:'closed',lock:true,accessReq:false,safetyStop:false,autoResume:false,resumeTo:'Idle',
  lc:{broken:false,fault:false,timer:0,muted:false},person:'away',speedFactor:1,override:c.speedPct/100,timeScale:+($('tScale').value||1),
  conv:c.conveyors.map((cv,i)=>({robot:i%c.robots,boxes:[],vfd:{target:0,actual:0,accel:2,sto:true,run:false,fault:false},stuck:false,nom:cv.speed,feedT:0,fed:0,type:cv.type})),
  robots:DD.LY.robots.map(r=>({i:r.i,base:r.base,home:r.home,x:r.home.x,y:r.home.y,z:c.baseH+600,zt:c.baseH+600,zRel:c.baseH+600,yaw:0,vxy:0,axy:0,vz:0,az:0,step:'wait',carry:0,carryKind:null,carryBi:0,job:null,power:false,dwell:0})),
  st:DD.stations.map(s=>Object.assign(newPal(c.exch.in!=='robot'),{id:s.id,robot:s.robot,slot:s,bi:s.bi,pat:s.pat})),
  mags:DD.mags.map(m=>({id:m.id,robot:m.robot,slot:m,sheets:c.sheet.cap,loading:false,waitT:0,agent:null})),
  stacks:DD.stacks.map(p=>({id:p.id,robot:p.robot,slot:p,n:c.exch.stack})),
  agents:[],stats:{placed:0,run:0,pallets:0,dropped:0,exch:0,refills:0},nextId:1,timer:0,tasks:TASKSTATE,
  flags:{lcTripped:false,estopTripped:false,palletDone:false,palletRemoved:false,vfdTripped:false,typesPlaced:new Set(),optApplied:prevOpt,agentSeen:new Set()}};
 if(c.sheet.mode==='bottom')S.st.forEach(s=>{if(s.present)s.needSheet=S.mags.length>0;});
 $('ovr').value=c.speedPct;$('ovrV').textContent=c.speedPct+' %';
 $('log').innerHTML='';buildStatic();buildButtons();buildIO();
 $('steps').innerHTML=STEPS.map((st,i)=>`<li id="st-${st[0]}"><span>${i+1}</span>${st[1]}</li>`).join('');
 log(`Конфигурация применена: ${c.robots} × ${DD.rob.name}, захват ${GRIPPERS[c.grip.type].name.toLowerCase()} по ${c.grip.pick}, ${c.conveyors.length} конв., ${DD.stations.length} станц., обмен — ${EXCH_OUT[c.exch.out].toLowerCase()}, защита — ${DD.safety==='fence'?'ограждение и завесы':'сканеры'}. ПЛК в состоянии Stopped`);
 if(DD.reachStatus==='bad'){S.why='Робот не достаёт: '+DD.rWhere+' — исправьте конфигурацию';log('Пуск заблокирован: точки укладки вне досягаемости','alarm');}
 if(!S.tasks.t7&&DD.rob.cls==='cobot'&&Math.max(...c.boxes.map(b=>b.m))>=15&&DD.payStatus==='ok'&&DD.reachStatus==='ok')done('t7');
 if(!S.tasks.t10&&c.conveyors.some(x=>x.type==='mdr'))done('t10');
 if(!S.tasks.t11&&c.grip.pick>=2&&DD.grip.status==='ok'&&DD.payStatus!=='bad'&&DD.reachStatus!=='bad')done('t11');
 if(!S.tasks.t12&&Object.values(DD.pats).some(p=>p.interlock))done('t12');
 if(!S.tasks.t13&&S.flags.optApplied)done('t13');
 if(!S.tasks.t16&&c.boxes.filter(b=>b.rate>0).length>=2)done('t16');
 if(typeof build3D==='function')build3D();render();}
function rotG(slot,inner){const [px,py]=GG.P(slot.cx,slot.cy);return`<g transform="rotate(${slot.ang} ${px.toFixed(1)} ${py.toFixed(1)})">${inner}</g>`;}
function buildStatic(){
 const c=CFG,D=DD,G=GG,P=G.P,sc=G.sc,pal=D.pal,LY=D.LY,ex=c.exch;let s='';
 if(D.safety==='fence'){const F=D.F,[x0,y0]=P(F.x0,F.y0),[x1,y1]=P(F.x1,F.y1);
  s+=`<rect x="${x0}" y="${y0}" width="${x1-x0}" height="${y1-y0}" fill="none" stroke="var(--fence)" stroke-width="3" stroke-dasharray="12 5"/><text x="${x0+8}" y="${y0-6}" font-size="11" fill="var(--muted)">Ограждение h=2000 мм, ISO 14120 · периметр ${f0(D.fencePerim/1000)} м</text>`;
  LY.convs.forEach((cv,i)=>{const [gx,gy0]=P(F.x0,cv.y-cv.w/2-120),[,gy1]=P(F.x0,cv.y+cv.w/2+120);s+=`<rect x="${gx-5}" y="${gy0}" width="10" height="${gy1-gy0}" fill="var(--bg)"/><line id="lc${i}" x1="${gx}" y1="${gy0}" x2="${gx}" y2="${gy1}" stroke="var(--red)" stroke-width="3"/>`;
   const [m1x,m1y]=P(F.x0-250,cv.y-cv.w/2-40),[m2x]=P(F.x0+250,cv.y);s+=`<circle cx="${m1x}" cy="${m1y}" r="3.5" fill="var(--muted)"/><circle cx="${m2x}" cy="${m1y}" r="3.5" fill="var(--muted)"/><text x="${gx-14}" y="${gy1+13}" font-size="10" fill="var(--muted)">S4.${i+1} мьютинг M${i+1}</text>`;});
  const [dx0,dy]=P(F.x1-1100,F.y1),[dx1]=P(F.x1-300,F.y1);s+=`<rect x="${dx0}" y="${dy-6}" width="${dx1-dx0}" height="12" fill="var(--bg)"/><line id="doorLine" data-x2="${dx1}" x1="${dx0}" y1="${dy}" x2="${dx1}" y2="${dy}" stroke="var(--fence)" stroke-width="5"/><circle id="lockDot" cx="${dx1+9}" cy="${dy}" r="6" fill="var(--green)"/><text x="${dx0}" y="${dy-9}" font-size="10" fill="var(--muted)">дверь S2/S3, замок Q1</text>`;}
 else LY.robots.forEach(r=>{const [bx,by]=P(r.base.x,r.base.y);s+=`<circle cx="${bx}" cy="${by}" r="${D.rSlow*sc}" fill="var(--yellow)" fill-opacity=".07" stroke="var(--yellow)" stroke-dasharray="6 5"/><circle cx="${bx}" cy="${by}" r="${D.rStop*sc}" fill="var(--red)" fill-opacity=".05" stroke="var(--red)" stroke-dasharray="6 5"/>`;if(r.i===0)s+=`<text x="${bx+D.rStop*sc*0.7}" y="${by-D.rStop*sc*0.72}" font-size="10" fill="var(--red)">защитное поле</text><text x="${bx+Math.min(D.rSlow,G.rDraw)*sc*0.6}" y="${by-Math.min(D.rSlow,G.rDraw)*sc*0.8}" font-size="10" fill="var(--warnfg)">поле снижения скорости S=${f0(D.Ssc)} мм</text>`;});
 // проёмы обмена (завеса/сектор) у станций, магазинов, стопок
 LY.robots.forEach(r=>r.slots.forEach(sl=>{const isConvOut=sl.kind==='st'&&ex.out==='conveyor';const d=pal.W/2+250,L2=pal.L/2+100;const [ax,ay]=P(sl.cx+sl.cos*d-sl.sin*(-L2),sl.cy+sl.sin*d+sl.cos*(-L2)),[bx,by]=P(sl.cx+sl.cos*d-sl.sin*L2,sl.cy+sl.sin*d+sl.cos*L2);
  s+=`<line id="gate-${sl.id}" x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}" stroke="var(--red)" stroke-width="3"/><text x="${(ax+bx)/2+sl.cos*10}" y="${(ay+by)/2+sl.sin*10+4}" font-size="10" text-anchor="middle" fill="var(--muted)">${D.safety==='fence'?(sl.kind==='st'?'S6'+sl.id:sl.kind==='mg'?'S7.'+sl.id:'S8'):'сектор '+sl.id}</text>`;
  if(!isConvOut&&sl.kind!=='ps'){const [px,py]=P(sl.park.x,sl.park.y);s+=`<rect x="${px-14}" y="${py-14}" width="28" height="28" rx="4" fill="none" stroke="var(--line)" stroke-dasharray="3 3"/><circle id="lamp-${sl.id}" cx="${px+sl.cos*22}" cy="${py+sl.sin*22}" r="4" fill="var(--off)"/>`;}}));
 LY.convs.forEach((cv,i)=>{const [x0,y0]=P(cv.x0,cv.y-cv.w/2),[x1,y1]=P(cv.x1,cv.y+cv.w/2);s+=`<rect x="${x0}" y="${y0}" width="${x1-x0}" height="${y1-y0}" rx="3" fill="var(--dim)" stroke="var(--line)"/>`;
  if(75*sc>3.5)for(let x=cv.x0+75;x<cv.x1;x+=75){const [rx]=P(x,0);s+=`<line x1="${rx}" y1="${y0+2}" x2="${rx}" y2="${y1-2}" stroke="var(--line)"/>`;}
  const [exx]=P(cv.x1-30,0);s+=`<rect x="${exx}" y="${y0-2}" width="4" height="${y1-y0+4}" fill="var(--ink)"/><text x="${x0}" y="${y0-5}" font-size="10" fill="var(--muted)">конвейер ${i+1}: ${cv.b.name} ${cv.b.m} кг · ${c.conveyors[i].feed==='manual'?'ручная подача':'автоподача'} → робот ${cv.robot+1}</text>`;
  const [ox,oy]=P(cv.x0-250,cv.y);if(c.conveyors[i].feed==='manual')s+=`<circle cx="${ox}" cy="${oy-8}" r="7" fill="none" stroke="var(--muted)" stroke-width="2"/><line x1="${ox}" y1="${oy-1}" x2="${ox}" y2="${oy+14}" stroke="var(--muted)" stroke-width="2"/>`;else s+=`<rect x="${ox-14}" y="${oy-12}" width="24" height="24" rx="3" fill="none" stroke="var(--muted)" stroke-width="2"/><text x="${ox-2}" y="${oy+4}" font-size="9" text-anchor="middle" fill="var(--muted)">УМ</text>`;});
 LY.robots.forEach(r=>r.slots.forEach(sl=>{const [px,py]=P(sl.cx,sl.cy),w=pal.W*sc,h=pal.L*sc;
  if(sl.kind==='st')s+=rotG(sl,`<rect x="${px-w/2}" y="${py-h/2}" width="${w}" height="${h}" fill="none" stroke="var(--line)" stroke-dasharray="4 4"/>`)+`<text x="${px}" y="${py+4}" font-size="11" text-anchor="middle" fill="var(--muted)" opacity=".8">${sl.id}</text>`;
  else if(sl.kind==='mg')s+=rotG(sl,`<rect x="${px-w/2}" y="${py-h/2}" width="${w}" height="${h}" rx="3" fill="none" stroke="var(--sheet)" stroke-width="2"/>`)+`<text id="sheets-${sl.id}" x="${px}" y="${py+5}" font-size="14" text-anchor="middle" fill="var(--ink)" font-weight="600">${c.sheet.cap}</text><text x="${px}" y="${py+h/2+13}" font-size="10" text-anchor="middle" fill="var(--muted)">магазин ${sl.id}</text>`;
  else s+=rotG(sl,`<rect x="${px-w/2}" y="${py-h/2}" width="${w}" height="${h}" rx="2" fill="var(--dim)" stroke="var(--fence)" stroke-width="2"/><rect x="${px-w/2+4}" y="${py-h/2+4}" width="${w-8}" height="${h-8}" fill="none" stroke="var(--fence)"/>`)+`<text id="stack-${sl.id}" x="${px}" y="${py+5}" font-size="14" text-anchor="middle" fill="var(--ink)" font-weight="600">${c.exch.stack}</text><text x="${px}" y="${py+h/2+13}" font-size="10" text-anchor="middle" fill="var(--muted)">стопка паллет</text>`;}));
 LY.robots.forEach(r=>{const [bx,by]=P(r.base.x,r.base.y);s+=`<circle cx="${bx}" cy="${by}" r="${D.rob.reach*sc}" fill="none" stroke="var(--robot)" stroke-dasharray="4 5" opacity=".7"/><circle cx="${bx}" cy="${by}" r="${Math.max(9,180*sc)}" fill="var(--dim)" stroke="var(--ink)" stroke-width="2"/><text x="${bx-16}" y="${by+Math.max(9,180*sc)+13}" font-size="10" fill="var(--muted)">R${r.i+1} · ${D.rob.reach} мм</text>`;});
 $('static').innerHTML=s;
 $('legend').innerHTML=`Оранжевый пунктир — досягаемость; ${D.safety==='fence'?'красные линии — световые завесы (серые — в мьютинге), серый пунктир — ограждение':'жёлтое поле — снижение скорости, красное — защитная остановка, серая линия — исключённый сектор'}; пунктирные квадраты — площадки ожидания тележек; ${[...new Set(D.stations.map(x=>x.bi))].map(bi=>`<i style="background:${boxColor(bi)}"></i>${boxOf(c,bi).name}`).join(' ')} <i style="background:var(--sheet)"></i>прокладка <i style="background:var(--robot)"></i>манипулятор <i style="background:var(--blue)"></i>тележка/человек`;}
function buildButtons(){
 const D=DD,c=CFG,ex=c.exch;
 $('evtBtns').innerHTML=c.conveyors.map((cv,i)=>cv.feed==='manual'?`<button data-b="box" data-i="${i}">Положить коробку на конвейер ${i+1}</button>`:`<span class="note" style="margin:0">Конвейер ${i+1}: автоподача ${cv.feed==='interval'?'каждые '+cv.interval+' с':cv.rate+' кор/мин'}</span>`).join('');
 $('safBtns').innerHTML=D.safety==='fence'?c.conveyors.map((cv,i)=>`<button data-b="hand" data-i="${i}">Просунуть руку в завесу ${i+1}</button>`).join('')+`<button data-b="access">Запросить доступ в ячейку</button><button data-b="door">Открыть дверь</button>`
  :`<button data-b="pslow">Подойти: поле снижения скорости</button><button data-b="pstop">Войти в защитное поле</button><button data-b="paway">Отойти от ячейки</button>`;
 let p='';if(ex.out==='conveyor')p+=`<span class="note" style="margin:0">Обмен паллет автоматический: конвейер паллет + диспенсер.</span>`;
 else if(ex.auto)p+=`<span class="note" style="margin:0">Автообмен: ${AGENT[ex.out==='jack'?'jack':ex.out].name} приезжает через ${ex.reaction} с после готовности паллеты.</span>`+S.st.map(s=>`<button data-b="pal" data-i="${s.id}">Вызвать сейчас: ${s.id}</button>`).join('');
 else p+=S.st.map(s=>`<button data-b="pal" data-i="${s.id}">Вывезти паллету ${s.id}</button>`).join('');
 if(S.mags.length)p+=(ex.auto?'':'')+S.mags.map(m=>`<button data-b="refill" data-i="${m.id}">Пополнить прокладки ${m.id}</button>`).join('');
 if(S.stacks.length)p+=`<button data-b="stack">Пополнить стопку паллет</button>`;
 $('palBtns').innerHTML=p;
 $('faultBtns').innerHTML=`<button data-b="vac">Отказ: ${GRIPPERS[c.grip.type].vac?'потеря вакуума':'раскрытие захвата'} (робот 1)</button><button data-b="vfd">Отказ: авария ЧП 1</button><button data-b="stuck">Отказ: залип датчик B11</button>`;}
let LIVE_DI=[],LIVE_DO=[];
function buildIO(){
 const c=CFG,D=DD;LIVE_DI=[['S1','Аварийный стоп (НЗ)',()=>!S.estop]];
 if(D.safety==='fence')LIVE_DI.push(['S2','Дверь закрыта',()=>S.door==='closed'],['S3','Замок заблокирован',()=>S.lock],['S4','Световые завесы OSSD',()=>!S.lc.broken],['M','Мьютинг активен',()=>S.lc.muted]);
 else LIVE_DI.push(['LS','Сканер: защитное поле свободно',()=>S.person!=='stop'],['LS.W','Поле снижения свободно',()=>S.person==='away']);
 c.conveyors.forEach((cv,i)=>{LIVE_DI.push([`B${i+1}5`,`Коробка на входе ${i+1}`,()=>S.conv[i].boxes.some(b=>b.p<.12)],[`B${i+1}1`,`Коробка у упора ${i+1}`,()=>boxesAtEnd(i)>0]);if(c.grip.pick>1)LIVE_DI.push([`B${i+1}2`,`Группа из ${c.grip.pick} собрана ${i+1}`,()=>boxesAtEnd(i)>=c.grip.pick]);});
 S.st.forEach(s=>{LIVE_DI.push([`B${s.id}`,`Паллета на станции ${s.id}`,()=>s.present&&s.phase!=='out']);if(c.exch.out!=='conveyor')LIVE_DI.push([`SB${s.id}`,`Кнопка «готово» ${s.id} (проём занят)`,()=>!!s.agent]);});
 S.mags.forEach(m=>LIVE_DI.push([`B4.${m.id}`,`Прокладки в ${m.id}`,()=>m.sheets>0],[`B4L.${m.id}`,`Мало прокладок ${m.id}`,()=>m.sheets<=c.sheet.low]));
 S.stacks.forEach(p=>LIVE_DI.push([`B5.${p.id}`,`Стопка паллет: есть`,()=>p.n>0]));
 LIVE_DI.push(['PS1',GRIPPERS[c.grip.type].vac?'Вакуум достигнут (робот 1)':'Захват закрыт (робот 1)',()=>S.robots[0].carryKind!==null],['PA','Давление воздуха в норме',()=>true],['R1','Робот 1 в исходной',()=>near(S.robots[0],S.robots[0].home)]);
 LIVE_DO=[];c.conveyors.forEach((cv,i)=>{LIVE_DO.push([`K${i+1}`,cv.type==='mdr'?`Мотор-ролики ${i+1}: разрешение`:`Конвейер ${i+1} RUN → ЧП`,()=>S.conv[i].vfd.run]);if(cv.type!=='mdr')LIVE_DO.push([`STO${i+1}`,`STO ЧП ${i+1}`,()=>S.conv[i].vfd.sto,'alarm']);if(cv.feed!=='manual')LIVE_DO.push([`UP${i+1}`,`Разрешение подачи ${i+1}`,()=>['Execute','Suspended','Starting'].includes(S.packml)&&!S.conv[i].boxes.some(b=>b.p<.12)]);});
 S.st.forEach(s=>{if(c.exch.out!=='conveyor')LIVE_DO.push([`H${s.id}`,`Лампа «освобождено» ${s.id}`,()=>released(s),'warn']);});
 S.mags.forEach(m=>LIVE_DO.push([`H4.${m.id}`,`Лампа «магазин ${m.id} освобождён»`,()=>m.loading,'warn']));
 if(D.safety==='fence')LIVE_DO.push(['Q1','Замок двери (питание)',()=>S.lock]);else LIVE_DO.push(['R.RS','Робот: сниженная скорость',()=>S.speedFactor<1,'warn']);
 LIVE_DO.push(['EN','Разрешение движения роботов',()=>S.robots[0].power],['Y1',GRIPPERS[c.grip.type].vac?'Вакуум ВКЛ (робот 1)':'Захват закрыть (робот 1)',()=>S.robots[0].carryKind!==null],['H1','Лампа красная',()=>lamp().r,'alarm'],['H2','Лампа жёлтая',()=>lamp().y,'warn'],['H3','Лампа зелёная',()=>lamp().g]);
 $('di').innerHTML=LIVE_DI.map(d=>`<tr><td class="tag">${d[0]}</td><td><span class="dot" id="di-${d[0]}"></span>${d[1]}</td></tr>`).join('');
 $('do').innerHTML=LIVE_DO.map(d=>`<tr><td class="tag">${d[0]}</td><td><span class="dot" id="do-${d[0]}"></span>${d[1]}</td></tr>`).join('');
 $('drives').innerHTML=c.conveyors.map((cv,i)=>cv.type==='mdr'?`<div class="vfd"><div class="ttl">Конвейер ${i+1}: мотор-ролики 24 В, ${DD.convs[i].zones} зон (ZPA)</div><div>Состояние <div class="v" id="vS${i}">Готов</div></div><div>Разрешение <div class="v" id="vR${i}">нет</div></div><div>Скорость <div class="v">${cv.speed} м/мин</div></div><div>Питание <div class="v">24 В</div></div><div class="zones" id="zn${i}">${'<i></i>'.repeat(DD.convs[i].zones)}</div></div>`
  :`<div class="vfd"><div class="ttl">ЧП ${i+1}: ${DD.convs[i].Pstd} кВт, ${CONV_TYPES[cv.type].name.split(' (')[0]}</div><div>Задание <div class="v" id="vT${i}">0,0 Гц</div></div><div>Выход <div class="v" id="vA${i}">0,0 Гц</div></div><div>Состояние <div class="v" id="vS${i}">Готов</div></div><div>STO <div class="v" id="vSTO${i}">активно</div></div><div class="bar"><i id="vBar${i}"></i></div><label>Рампа <input type="range" data-acc="${i}" min="0.5" max="5" step="0.5" value="2"> <span id="vAccV${i}">2,0 с</span></label></div>`).join('');}
function near(a,b){return Math.hypot(a.x-b.x,a.y-b.y)<3;}
function gapOf(i){const g=DD.LY.convs[i];return(g.b.l+120)/(g.len-g.b.l);}
function boxesAtEnd(i){const cv=S.conv[i];if(cv.stuck)return Math.max(1,CFG.grip.pick);const gap=gapOf(i);let n=0;for(let j=0;j<cv.boxes.length;j++){if(cv.boxes[j].p>=1-j*gap-0.01)n++;else break;}return n;}
function lamp(){const s=S.packml;return{r:['Aborted','Aborting','Held','Holding'].includes(s)||S.safetyStop,y:['Idle','Stopped','Suspended','Resetting','Stopping','Starting'].includes(s)||S.speedFactor<1,g:s==='Execute'};}
function log(m,k){const li=document.createElement('li');if(k)li.className=k;const t=new Date();li.innerHTML=`<time>${t.toTimeString().slice(0,8)}</time>${m}`;const el=$('log');el.prepend(li);while(el.children.length>60)el.lastChild.remove();}
function setState(s,why){if(S.packml!==s)log(`Состояние: ${S.packml} → <b>${s}</b>${why?' — '+why:''}`);S.packml=s;S.why=why||'';}
function safeInputsOK(){return !S.estop&&S.door==='closed'&&S.lock&&!S.lc.broken&&S.person!=='stop';}
function stopDrives(hard){S.conv.forEach(cv=>{cv.vfd.target=0;cv.vfd.run=false;if(hard){cv.vfd.actual=0;cv.vfd.sto=true;}});}
function allPower(v){S.robots.forEach(r=>r.power=v);}
function abort(reason){stopDrives(true);allPower(false);S.safetyStop=true;setState('Aborted',reason);log('Стоп категории 0: STO на всех ЧП, контактор KM1 отключён','alarm');}
function protectiveStop(reason,auto){if(['Aborted','Held','Holding'].includes(S.packml))return;S.resumeTo=['Execute','Starting','Suspended'].includes(S.packml)?'Execute':'Idle';stopDrives(false);allPower(false);S.safetyStop=true;S.autoResume=!!auto;setState('Held',reason);log('Защитная остановка категории 1: управляемое торможение, затем STO','alarm');}
function hold(reason){if(['Aborted','Held','Holding'].includes(S.packml))return;stopDrives(false);allPower(false);setState('Held',reason);log('Held: внутренняя причина (отказ оборудования), материал есть — это не Suspended','alarm');}
function suspend(reason){if(S.packml==='Execute')setState('Suspended',reason);}
function runDrives(){S.conv.forEach(cv=>{if(!cv.vfd.fault){cv.vfd.sto=false;cv.vfd.run=true;cv.vfd.target=cv.type==='mdr'?50:35;}});}
// Разгон и торможение с ограничением ускорения и рывка (S-образный профиль). Допустимая
// скорость берётся из остатка пути, но с поправкой: ускорение разворачивается не мгновенно,
// а за время рывка, и этот путь надо зарезервировать. См. docs/methodology.md.
function rampV(v,a,dist,vMax,aMax,jMax,dt){
 const tRev=Math.max(0,(a+aMax)/jMax),dRev=Math.max(0,v*tRev+a*tRev*tRev/2);
 const vOk=Math.min(vMax,Math.sqrt(Math.max(0,2*aMax*Math.max(0,dist-dRev))));
 let na=clamp((vOk-v)/dt,-aMax,aMax);na=clamp(na,a-jMax*dt,a+jMax*dt);
 return{v:clamp(v+na*dt,0,vMax),a:na};}
function axA(){return DD.aMax*1000;}
function axJ(){return axA()/Math.max(0.01,CFG.motion.tJerk);}
function moveTo(r,t,dt,f){const d=Math.hypot(t.x-r.x,t.y-r.y);
 if(d<2){r.x=t.x;r.y=t.y;r.vxy=0;r.axy=0;return true;}
 const q=rampV(r.vxy,r.axy,d,DD.rob.v*1000*S.override*S.speedFactor*(f||1),axA(),axJ(),dt);r.vxy=q.v;r.axy=q.a;
 const st=r.vxy*dt;if(d<=Math.max(st,2)){r.x=t.x;r.y=t.y;r.vxy=0;r.axy=0;return true;}
 r.x+=(t.x-r.x)/d*st;r.y+=(t.y-r.y)/d*st;return false;}
// Вертикальный ход до zTo с маршевой скоростью vMax, мм/с: быстрый перенос или подвод.
function moveZ(r,zTo,vMax,dt){const d=zTo-r.z,ad=Math.abs(d),dir=Math.sign(d);r.zt=zTo;
 if(r.zdir&&r.zdir!==dir){r.vz=0;r.az=0;}r.zdir=dir;            // ось не разворачивается на ходу
 if(ad<1){r.z=zTo;r.vz=0;r.az=0;r.zdir=0;return true;}
 const q=rampV(r.vz,r.az,ad,vMax*S.override*S.speedFactor,axA(),axJ(),dt);r.vz=q.v;r.az=q.a;
 const st=r.vz*dt;if(ad<=Math.max(st,1)){r.z=zTo;r.vz=0;r.az=0;r.zdir=0;return true;}
 r.z+=Math.sign(d)*st;return false;}
// Доворот кисти по кратчайшему пути к нужной стороне паллеты.
function turnTo(r,deg,dt){let d=(deg-r.yaw)%360;if(d>180)d-=360;if(d<-180)d+=360;
 const st=CFG.motion.wSpeed*S.override*S.speedFactor*dt;
 if(Math.abs(d)<=Math.max(st,0.5)){r.yaw=deg;return true;}r.yaw+=Math.sign(d)*st;return false;}
// Высоты контакта захвата
function zPickOf(ci){return CFG.convH+DD.LY.convs[ci].b.h;}
function zPlaceOf(s,b){return DD.pal.h+s.layer*b.h+b.h+s.sheetLayers.length*4;}
function zSheetOf(s,b){return DD.pal.h+s.layer*b.h+s.sheetLayers.length*4;}
function zMagOf(m){return DD.pal.h+m.sheets*4;}
function boxYaw(s,g){return s.slot.ang+(curCells(s)[g[0]].rot?90:0);}
function robotBusyAt(slotId){return S.robots.some(r=>r.power&&r.job&&((r.job.st&&r.job.st.id===slotId)||(r.job.mag&&r.job.mag.id===slotId))&&!['wait','home'].includes(r.step));}
function released(s){return (s.complete||!s.present)&&!robotBusyAt(s.id);}
function avail(s){return s.present&&!s.complete&&s.phase==='idle'&&!s.agent;}
function curCells(s){return s.parity?s.pat.cellsB:s.pat.cells;}
function curGroups(s){return s.parity?s.pat.groupsB:s.pat.groupsA;}
function groupWorld(s,g){const cells=curCells(s);let x=0,y=0;g.forEach(i=>{const w=DD.LY.cw(s.slot,cells[i]);x+=w.x;y+=w.y;});return{x:x/g.length,y:y/g.length};}
function pickWorld(ci,g){const cv=DD.LY.convs[ci];return{x:-CFG.pickDist-(g-1)*(cv.b.l+120)/2,y:cv.y};}
function magsOf(r){return S.mags.filter(m=>m.robot===r&&!m.loading);}
function findJob(ri){
 const c=CFG,convs=DD.LY.robots[ri].convs,sts=S.st.filter(s=>s.robot===ri),mags=magsOf(ri),ps=S.stacks.find(p=>p.robot===ri);
 if(c.exch.in==='robot'&&ps&&ps.n>0){const s=sts.find(s=>!s.present&&!s.agent);if(s)return{kind:'pallet',st:s,ps};}
 for(const ci of convs){const have=boxesAtEnd(ci);if(!have)continue;for(const s of sts.filter(s=>s.slot.conv===ci)){if(!avail(s))continue;if(s.needSheet){const m=mags.find(m=>m.sheets>0);if(m)return{kind:'sheet',st:s,mag:m};continue;}const g=curGroups(s)[s.gi];if(have>=g.length)return{kind:'box',conv:ci,st:s,g:g.length,group:g};}}
 for(const s of sts)if(avail(s)&&s.needSheet){const m=mags.find(m=>m.sheets>0);if(m)return{kind:'sheet',st:s,mag:m};}
 return null;}
function noPallet(){return S.st.every(s=>!avail(s))&&!(CFG.exch.in==='robot'&&S.stacks.some(p=>p.n>0)&&S.st.some(s=>!s.present&&!s.agent));}
function noSheet(){return S.mags.length>0&&S.st.some(s=>avail(s)&&s.needSheet&&!magsOf(s.robot).some(m=>m.sheets>0));}
function zTravel(r){const c=CFG,pal=DD.pal;let z=c.convH+400;S.st.filter(s=>s.robot===r.i).forEach(s=>{z=Math.max(z,pal.h+s.pat.layers*boxOf(c,s.bi).h+300);});return z;}
function robotTick(r,dt){
 if(!r.power)return;
 const c=CFG,pal=DD.pal,M=c.motion;
 if(S.packml==='Resetting'){moveZ(r,zTravel(r),M.vZ,dt);if(moveTo(r,r.home,dt)){r.step=r.carryKind==='box'?'toPlace':r.carryKind==='sheet'?'toSheet':r.carryKind==='pallet'?'toStation':'wait';if(S.robots.every(x=>near(x,x.home)||x.step!=='home'&&x.step!=='wait'))setState('Idle','Готов к пуску');}return;}
 if(S.packml==='Stopping'&&r.carryKind===null&&['wait','toPick','home','toMag','toStack'].includes(r.step)){r.step='home';moveZ(r,zTravel(r),M.vZ,dt);if(moveTo(r,r.home,dt)&&S.conv.every(cv=>cv.vfd.actual===0)&&S.robots.every(x=>x===r||!x.power||near(x,x.home)))finishStop();return;}
 if(!['Execute','Stopping','Suspended'].includes(S.packml))return;
 if(S.packml==='Suspended'){if(!noPallet()&&!noSheet())setState('Execute','Условие возобновления выполнено');else return;}
 const s=r.job?r.job.st:null;const b=s?boxOf(c,s.bi):DD.heaviest;
 switch(r.step){
  case 'wait':{moveZ(r,zTravel(r),M.vZ,dt);if(S.packml==='Stopping')break;const j=findJob(r.i);if(!j){if(noPallet())suspend(c.exch.in==='robot'&&S.stacks.every(p=>p.n===0)?'Стопка паллет пуста — пополните (B5=0)':'Нет свободной паллеты — ожидание обмена');else if(noSheet())suspend('Магазин прокладок пуст или загружается — ожидание (B4=0)');break;}r.job=j;r.step=j.kind==='sheet'?'toMag':j.kind==='pallet'?'toStack':'toPick';break;}
  // ---- коробки: подход сверху, опускание на подводе, отрыв строго вверх ----
  case 'toPick':{const okZ=moveZ(r,zPickOf(r.job.conv)+M.hAppr,M.vZ,dt),okT=turnTo(r,0,dt),okXY=moveTo(r,pickWorld(r.job.conv,r.job.g),dt);if(okXY&&okZ&&okT)r.step='downPick';break;}
  case 'downPick':if(moveZ(r,zPickOf(r.job.conv),M.vPlace,dt)){r.step='grip';r.dwell=DD.grip.tGrip;r.zRel=r.z;}break;
  case 'grip':r.dwell-=dt;if(r.dwell<=0){const cv=S.conv[r.job.conv],have=cv.boxes.filter(x=>x.p>=1-(r.job.g-1)*gapOf(r.job.conv)-0.01).length;
   if(have<r.job.g){hold(`PS1 = 0: захват не подтверждён — коробок нет, хотя B${r.job.conv+1}1 = 1 (залип датчик)`);break;}
   if(DD.util>1){hold(`Ошибка робота ${r.i+1}: перегрузка — ${f1(DD.mReq)} кг > ${DD.rob.payload} кг`);break;}
   if(DD.grip.status==='bad'){hold(`Потеря груза при подъёме: сила захвата ${f0(DD.grip.Fcap)} Н < требуемых ${f0(DD.grip.Fth)} Н`);S.stats.dropped+=r.job.g;cv.boxes.splice(0,r.job.g);break;}
   cv.boxes.sort((a,x)=>x.p-a.p);cv.boxes.splice(0,r.job.g);r.carry=r.job.g;r.carryKind='box';r.carryBi=DD.LY.convs[r.job.conv].bi;r.step='upPick';}break;
  case 'upPick':if(moveZ(r,r.zRel+M.hAppr,M.vPlace,dt)){if(DD.tShift>0&&r.job.group&&r.job.group.nr>1){r.step='shift';r.dwell=DD.tShift;}else r.step='toPlace';}break;
  case 'shift':r.dwell-=dt;if(r.dwell<=0)r.step='toPlace';break;
  case 'unshift':r.dwell-=dt;if(r.dwell<=0)r.step='home';break;
  case 'toPlace':{if(s.agent||!s.present){r.step='wait';r.carryKind=null;r.carry=0;break;}
   const okZ=moveZ(r,zPlaceOf(s,b)+M.hAppr,M.vZ,dt),okT=turnTo(r,boxYaw(s,r.job.group),dt),okXY=moveTo(r,groupWorld(s,r.job.group),dt);if(okXY&&okZ&&okT)r.step='downPlace';break;}
  case 'downPlace':if(moveZ(r,zPlaceOf(s,b),M.vPlace,dt)){r.step='place';r.dwell=DD.grip.tRel;r.zRel=r.z;}break;
  case 'place':r.dwell-=dt;if(r.dwell<=0){r.carryKind=null;r.carry=0;s.count+=r.job.g;S.stats.placed+=r.job.g;S.flags.typesPlaced.add(s.bi);r.job.group.forEach(i=>s.placed.push(i));s.gi++;
   if(s.gi>=curGroups(s).length){s.layer++;s.last={cells:curCells(s),parity:s.parity};s.placed=[];s.gi=0;S.tasks.t1||done('t1');
    if(s.layer>=s.pat.layers){s.complete=true;S.flags.palletDone=true;S.stats.pallets++;log(`Паллета ${s.id} готова: ${s.count} коробок, ${s.sheets} прокладок, ${f0(s.pat.mass)} кг${c.exch.out!=='conveyor'?` — лампа H${s.id} «освобождено»`:''}`);if(c.exch.out==='conveyor'){s.phase='out';log(`Станция ${s.id}: конвейер паллет ВКЛ, завеса S6${s.id} в мьютинге на выезд`);}}
    else{s.parity=s.pat.interlock?s.layer%2:0;if(S.mags.length&&sheetAfterLayer(c.sheet,s.layer,s.pat.layers))s.needSheet=true;}}
   r.step='upPlace';}break;
  case 'upPlace':if(moveZ(r,r.zRel+b.h+M.hAppr,M.vZ,dt)){if(DD.tShift>0&&r.job.group&&r.job.group.nr>1){r.step='unshift';r.dwell=DD.tShift;}else r.step='home';}break;
  // ---- прокладочный лист: перенос с доворотом, сброс вакуума по секциям ----
  case 'toMag':{if(r.job.mag.loading){r.step='wait';break;}
   const okZ=moveZ(r,zMagOf(r.job.mag)+M.hAppr,M.vZ,dt),okT=turnTo(r,r.job.mag.slot.ang,dt),okXY=moveTo(r,{x:r.job.mag.slot.cx,y:r.job.mag.slot.cy},dt);if(okXY&&okZ&&okT)r.step='downMag';break;}
  case 'downMag':if(moveZ(r,zMagOf(r.job.mag),M.vPlace,dt)){r.step='gripSheet';r.dwell=c.sheet.tGrip;}break;
  case 'gripSheet':r.dwell-=dt;if(r.dwell<=0){if(r.job.mag.sheets>0){r.job.mag.sheets--;r.carryKind='sheet';r.zRel=r.z;r.step='upMag';}else r.step='wait';}break;
  case 'upMag':if(moveZ(r,r.zRel+M.hAppr,M.vPlace,dt))r.step='toSheet';break;
  case 'toSheet':{if(s.agent||!s.present){r.step='wait';r.carryKind=null;break;}
   const okZ=moveZ(r,zSheetOf(s,b)+M.hAppr,M.vZ,dt),okT=turnTo(r,s.slot.ang,dt),okXY=moveTo(r,{x:s.slot.cx,y:s.slot.cy},dt,c.sheet.speedPct/100);if(okXY&&okZ&&okT)r.step='downSheet';break;}
  case 'downSheet':if(moveZ(r,zSheetOf(s,b),M.vPlace,dt)){r.step='placeSheet';r.dwell=DD.tRelSheet;r.zRel=r.z;r.sect=0;}break;
  case 'placeSheet':{const n=Math.min(c.sheet.sect,Math.floor((DD.tRelSheet-r.dwell)/Math.max(0.01,DD.grip.tRel))+1);if(n>r.sect){r.sect=n;if(n===1)log(`Лист лёг на слой ${s.layer} станции ${s.id}: сброс вакуума по ${c.sheet.sect} секциям, чтобы лист не парусил`);}
   r.dwell-=dt;if(r.dwell<=0){r.carryKind=null;s.sheets++;s.sheetLayers.push(s.layer);s.needSheet=false;S.tasks.t2||done('t2');r.step='upSheet';}break;}
  case 'upSheet':if(moveZ(r,r.zRel+M.hAppr,M.vZ,dt))r.step='home';break;
  // ---- пустая паллета из стопки ----
  case 'toStack':{const okZ=moveZ(r,pal.h*r.job.ps.n+M.hAppr,M.vZ,dt),okT=turnTo(r,r.job.ps.slot.ang,dt),okXY=moveTo(r,{x:r.job.ps.slot.cx,y:r.job.ps.slot.cy},dt);if(okXY&&okZ&&okT)r.step='downStack';break;}
  case 'downStack':if(moveZ(r,pal.h*r.job.ps.n,M.vPlace,dt)){r.step='gripPallet';r.dwell=2;}break;
  case 'gripPallet':r.dwell-=dt;if(r.dwell<=0){if(r.job.ps.n>0){r.job.ps.n--;r.carryKind='pallet';r.zRel=r.z;r.step='upStack';}else r.step='wait';}break;
  case 'upStack':if(moveZ(r,r.zRel+M.hAppr,M.vPlace,dt))r.step='toStation';break;
  case 'toStation':{if(s.agent||s.present){r.step='wait';r.carryKind=null;break;}
   const okZ=moveZ(r,pal.h+M.hAppr,M.vZ,dt),okT=turnTo(r,s.slot.ang,dt),okXY=moveTo(r,{x:s.slot.cx,y:s.slot.cy},dt,0.6);if(okXY&&okZ&&okT)r.step='downStation';break;}
  case 'downStation':if(moveZ(r,pal.h,M.vPlace,dt)){r.step='placePallet';r.dwell=1;r.zRel=r.z;}break;
  case 'placePallet':r.dwell-=dt;if(r.dwell<=0){r.carryKind=null;Object.assign(s,newPal(true));if(c.sheet.mode==='bottom'&&S.mags.length)s.needSheet=true;S.stats.exch++;log(`Станция ${s.id}: робот поставил пустую паллету из стопки (B${s.id}=1, осталось ${r.job.ps.n})`);S.tasks.t15||done('t15');r.step='upStation';}break;
  case 'upStation':if(moveZ(r,r.zRel+pal.h+M.hAppr,M.vZ,dt))r.step='home';break;
  case 'home':moveZ(r,zTravel(r),M.vZ,dt);if(moveTo(r,r.home,dt))r.step='wait';break;}}
function finishStop(){S.conv.forEach(cv=>cv.vfd.sto=true);allPower(false);setState('Stopped',S.accessReq?'Роботы в исходной, конвейеры стоят':'Остановлено оператором');if(S.accessReq){S.lock=false;log('Q1 = 0: замок двери разблокирован, доступ разрешён','warn');}}
function done(id){S.tasks[id]=true;const t=TASKS.find(t=>t[0]===id);log('Задание выполнено: '+t[1]);try{localStorage.setItem('pal-sim-tasks4',JSON.stringify(S.tasks));}catch(e){}}
// ---------- агенты: человек, рохля, погрузчик, AMR ----------
function dispatch(task,target,kind){
 const c=CFG;if(target.agent)return false;const A=AGENT[kind];const a={id:S.nextId++,kind,task,target,x:target.slot.park.x,y:target.slot.park.y,park:target.slot.park,phase:'go',t:0,carry:task==='sheets'?(kind==='amr'?'sheets':'sheets'):null,crossed:false,v:A.v,lift:A.lift};
 target.agent=a;S.agents.push(a);S.flags.agentSeen.add(kind);
 if(task==='pallet')log(kind==='amr'?`AMR: заявка на станцию ${target.id} принята флот-менеджером, тележка выехала`:`${A.name[0].toUpperCase()+A.name.slice(1)} подъезжает к проёму станции ${target.id}`);
 else log(kind==='amr'?`AMR везёт паллету с листами к магазину ${target.id}`:`Оператор идёт к магазину ${target.id} с листами`);
 return true;}
function agentTick(a,dt){
 const c=CFG,D=DD,s=a.target,slot=s.slot,gateD=D.pal.W/2+350;const move=(to,f)=>{const d=Math.hypot(to.x-a.x,to.y-a.y),v=a.v*1000*(f||1)*dt;if(d<=v){a.x=to.x;a.y=to.y;return true;}a.x+=(to.x-a.x)/d*v;a.y+=(to.y-a.y)/d*v;return false;};
 const center=(a.task==='sheets'&&a.kind!=='amr')?{x:slot.cx+slot.cos*(D.pal.W/2+300),y:slot.cy+slot.sin*(D.pal.W/2+300)}:{x:slot.cx,y:slot.cy};
 const crossing=()=>{const d=Math.hypot(a.x-slot.cx,a.y-slot.cy);if(d<gateD&&!a.crossed){a.crossed=true;const ok=a.task==='pallet'?released(s):!robotBusyAt(s.id);
  if(ok){if(a.task==='sheets'){s.loading=true;}log(D.safety==='fence'?`Проём ${a.task==='pallet'?'S6'+s.id:'S7.'+s.id}: станция освобождена — завеса в мьютинге (MUTE${s.id}=1), ${AGENT[a.kind].name} входит`:`Сканер: сектор ${s.id} исключён из защитного поля (LS.SET), ${AGENT[a.kind].name} входит`);}
  else{log(`${AGENT[a.kind].name[0].toUpperCase()+AGENT[a.kind].name.slice(1)} пересёк проём ${s.id}, пока робот работает на этой позиции`,'alarm');protectiveStop(`Пересечён проём ${s.id} без освобождения (${D.safety==='fence'?'S6'+s.id+' не в мьютинге':'сектор в защитном поле'})`,D.safety!=='fence');S.lc.fault=D.safety==='fence';a.phase='back';a.carry=null;}}};
 switch(a.phase){
  case 'go':crossing();if(a.phase!=='go')break;if(move(center)){a.phase=a.task==='pallet'?'lift':'load';a.t=a.task==='pallet'?a.lift:2+c.sheet.cap/10;}break;
  case 'lift':a.t-=dt;if(a.t<=0){if(s.present){s.present=false;a.carry='full';S.stats.exch++;log(`${AGENT[a.kind].name[0].toUpperCase()+AGENT[a.kind].name.slice(1)} забрал паллету ${s.id} (B${s.id}=0)`);if(S.flags.palletDone)S.flags.palletRemoved=true;}a.phase='back';}break;
  case 'load':a.t-=dt;if(a.t<=0){s.sheets=c.sheet.cap;s.loading=false;S.stats.refills++;a.carry=null;log(a.kind==='amr'?`AMR заменил магазин ${s.id}: ${c.sheet.cap} листов (B4=1), уезжает`:`Оператор доложил листы в ${s.id} до ${c.sheet.cap}, нажал «готово» (SB4.${s.id})`);S.tasks.t14||done('t14');a.phase='back';}break;
  case 'back':if(move(a.park)){if(a.task==='pallet'&&a.carry==='full'){a.phase='drop';a.t=3;}else a.phase='done';}break;
  case 'drop':a.t-=dt;if(a.t<=0){a.carry=null;if(c.exch.in==='vehicle'){a.carry='empty';a.phase='go2';a.crossed=false;log(`${AGENT[a.kind].name[0].toUpperCase()+AGENT[a.kind].name.slice(1)} везёт пустую паллету на станцию ${s.id}`);}else a.phase='done';}break;
  case 'go2':crossing();if(a.phase!=='go2')break;if(move(center)){a.phase='set';a.t=a.lift*0.7;}break;
  case 'set':a.t-=dt;if(a.t<=0){Object.assign(s,newPal(true),{agent:a});if(c.sheet.mode==='bottom'&&S.mags.length)s.needSheet=true;a.carry=null;log(`Пустая паллета на станции ${s.id} (B${s.id}=1)`);if(S.flags.palletRemoved&&!S.tasks.t5)done('t5');a.phase='back2';}break;
  case 'back2':if(move(a.park))a.phase='done';break;}
 if(a.phase==='done'){s.agent=null;s.waitT=0;if(a.task==='pallet'&&c.exch.out!=='conveyor')log(`Проём ${s.id} закрыт: кнопка «готово» (SB${s.id}), станция снова доступна роботу`);return false;}
 return true;}
function autoExchange(dt){
 const c=CFG,ex=c.exch;if(!['Execute','Suspended','Starting','Idle','Stopping'].includes(S.packml))return;
 if(ex.out!=='conveyor'){S.st.forEach(s=>{const need=(s.complete||(!s.present&&ex.in==='vehicle'))&&!s.agent;if(need&&ex.auto){s.waitT+=dt;if(s.waitT>=ex.reaction)dispatch('pallet',s,ex.out);}else if(!need)s.waitT=0;});}
 S.mags.forEach(m=>{const need=m.sheets<=c.sheet.low&&!m.agent&&!m.loading;if(need&&ex.auto){m.waitT+=dt;if(m.waitT>=ex.reaction)dispatch('sheets',m,ex.sheetsBy==='amr'?'amr':'person');}else if(!need)m.waitT=0;});}
function tick(dt){
 S.timer+=dt;const D=DD,c=CFG;
 S.conv.forEach((cv,i)=>{const v=cv.vfd,rate=50/v.accel*dt,cf=c.conveyors[i];
  if(v.fault){v.actual=Math.max(0,v.actual-rate*3);v.run=false;v.target=0;}
  else if(v.sto)v.actual=Math.max(0,v.actual-rate*2.5);
  else if(v.actual<v.target)v.actual=Math.min(v.target,v.actual+(cv.type==='mdr'?rate*4:rate));else if(v.actual>v.target)v.actual=Math.max(v.target,v.actual-rate);
  const g=D.LY.convs[i],b=g.b,spd=(cv.nom/60*1000)*(v.actual/50)*dt/(g.len-b.l),gap=gapOf(i);
  cv.boxes.sort((a,x)=>x.p-a.p);cv.boxes.forEach((bx,j)=>{const lim=j===0?1:cv.boxes[j-1].p-gap;bx.p=Math.min(lim,bx.p+spd);});
  if(cf.feed!=='manual'&&['Execute','Suspended','Starting'].includes(S.packml)){cv.feedT+=dt;const per=cf.feed==='interval'?cf.interval:60/cf.rate;if(cv.feedT>=per){if(!cv.boxes.some(x=>x.p<.13)){cv.boxes.push({p:0,id:S.nextId++});cv.fed++;cv.feedT=0;}}}});
 const centerX=(i,p)=>{const g=D.LY.convs[i];return g.x0+g.b.l/2+p*(g.len-g.b.l);};
 if(D.safety==='fence'){S.lc.muted=S.conv.some((cv,i)=>cv.boxes.some(b=>Math.abs(centerX(i,b.p)-D.F.x0)<D.LY.convs[i].b.l/2+220));
  if(S.lc.timer>0){S.lc.timer-=dt;if(S.lc.timer<=0)S.lc.broken=false;}
  if(S.lc.broken&&!S.lc.muted&&!S.lc.fault&&['Execute','Starting','Suspended','Stopping','Idle'].includes(S.packml)){S.lc.fault=true;S.flags.lcTripped=true;protectiveStop('Нарушена световая завеса S4 без мьютинга');}}
 else{S.speedFactor=S.person==='slow'?0.25:1;
  if(S.person==='stop'&&['Execute','Starting','Suspended','Stopping','Idle'].includes(S.packml)){S.flags.lcTripped=true;protectiveStop('Человек в защитном поле сканера',true);}
  if(S.packml==='Held'&&S.autoResume&&S.person!=='stop'&&S.conv.every(cv=>cv.vfd.actual===0)){S.autoResume=false;S.safetyStop=false;if(S.resumeTo==='Execute'){allPower(true);runDrives();setState('Execute','Защитное поле свободно — автоматический перезапуск (зона полностью просматривается сканерами)');}else{S.conv.forEach(cv=>cv.vfd.sto=true);setState('Idle','Защитное поле свободно, ячейка готова к пуску');}}}
 if(S.packml==='Held'&&S.conv.some(cv=>cv.vfd.actual===0&&!cv.vfd.sto&&!cv.vfd.fault)){S.conv.forEach(cv=>{if(cv.vfd.actual===0)cv.vfd.sto=true;});log('Приводы остановлены, STO активировано');}
 S.st.forEach(s=>{if(s.phase==='out'){s.out+=dt/3;if(s.out>=1){s.present=false;s.phase='gap';s.gap=0;s.out=0;S.stats.exch++;log(`Станция ${s.id}: паллета выехала (B${s.id}x=1), диспенсер подаёт пустую`);}}else if(s.phase==='gap'){s.gap+=dt;if(s.gap>2){Object.assign(s,newPal(true));if(c.sheet.mode==='bottom'&&S.mags.length)s.needSheet=true;if(S.flags.palletDone&&!S.tasks.t5)done('t5');log(`Станция ${s.id}: пустая паллета на позиции (B${s.id}=1)`);}}});
 autoExchange(dt);S.agents=S.agents.filter(a=>agentTick(a,dt));
 if(S.packml==='Starting'&&S.timer>.6)setState('Execute','Ячейка работает');
 if(S.packml==='Execute')S.stats.run+=dt;
 S.robots.forEach(r=>robotTick(r,dt));
 if(S.packml==='Execute'){if(!S.tasks.t3&&S.flags.lcTripped)done('t3');if(!S.tasks.t6&&S.flags.estopTripped)done('t6');if(!S.tasks.t9&&S.flags.vfdTripped)done('t9');if(!S.tasks.t8&&c.conveyors.length>=2&&S.flags.typesPlaced.size>=2)done('t8');if(!S.tasks.t17&&S.flags.agentSeen.has('amr')&&S.stats.exch>0)done('t17');}
 render();}
// ---------- пульт ----------
$('bStart').onclick=()=>{if(S.packml!=='Idle'||DD.reachStatus==='bad')return;S.timer=0;runDrives();allPower(true);setState('Starting','Разгон конвейеров, включение роботов');};
$('bStop').onclick=()=>{if(!['Execute','Suspended','Held','Starting'].includes(S.packml))return;stopDrives(false);if(S.packml==='Held'){allPower(false);S.safetyStop=false;S.autoResume=false;setState('Stopped','Остановлено из Held');return;}allPower(true);setState('Stopping','Роботы завершают операции, конвейеры тормозят');};
$('bReset').onclick=()=>{
 if(S.packml==='Aborted'){if(S.estop){log('Сброс невозможен: аварийный стоп нажат','warn');return;}S.safetyStop=false;setState('Stopped','Аварийная ситуация квитирована (Clear)');return;}
 if(!safeInputsOK()){log('Сброс невозможен: цепь безопасности разомкнута','warn');return;}
 if(['Stopped','Held'].includes(S.packml)){S.lc.fault=false;S.safetyStop=false;S.autoResume=false;S.accessReq=false;S.conv.forEach((cv,i)=>{if(cv.vfd.fault){cv.vfd.fault=false;log(`ЧП ${i+1}: авария сброшена`);}cv.stuck=false;cv.vfd.sto=false;cv.vfd.target=0;});allPower(true);setState('Resetting','Роботы возвращаются в исходную');}};
$('bEstop').onclick=()=>{S.estop=!S.estop;$('bEstop').classList.toggle('pressed',S.estop);if(S.estop){S.flags.estopTripped=true;abort('Аварийный стоп S1 нажат');}else log('Аварийный стоп отпущен. Для возобновления требуется сброс','warn');};
$('tScale').onchange=e=>{S.timeScale=+e.target.value;};
$('ovr').oninput=e=>{S.override=+e.target.value/100;$('ovrV').textContent=e.target.value+' %';};
$('tab-sim').addEventListener('click',e=>{const b=e.target.dataset.b;if(!b)return;const i=e.target.dataset.i;
 if(b==='box'){const cv=S.conv[+i];if(cv.boxes.some(x=>x.p<.13)){log(`Место на входе конвейера ${+i+1} занято (B${+i+1}5=1)`,'warn');return;}cv.boxes.push({p:0,id:S.nextId++});cv.fed++;}
 if(b==='refill'){const m=S.mags.find(x=>x.id===i);if(!m||m.agent){log('Пополнение уже идёт','warn');return;}dispatch('sheets',m,CFG.exch.sheetsBy==='amr'?'amr':'person');}
 if(b==='stack'){S.stacks.forEach(p=>p.n=CFG.exch.stack);log('Стопка паллет пополнена погрузчиком через проём S8 (B5=1)');}
 if(b==='hand'){S.lc.broken=true;S.lc.timer=1.2;if(S.lc.muted)log('Завеса пересечена во время мьютинга — так проходит коробка, реакции нет','warn');}
 if(b==='access'){if(S.accessReq)return;S.accessReq=true;log('Запрос доступа: ячейка переводится в безопасную остановку');
  if(['Execute','Suspended','Starting'].includes(S.packml)){stopDrives(false);allPower(true);setState('Stopping','Запрос доступа: роботы идут в исходную');}
  else if(['Idle','Stopped','Aborted','Held'].includes(S.packml)&&S.conv.every(cv=>cv.vfd.actual===0)){S.lock=false;allPower(false);if(S.packml==='Idle')setState('Stopped','Доступ разрешён');log('Q1 = 0: приводы остановлены, замок двери разблокирован','warn');}
  else log('Доступ будет предоставлен после остановки','warn');}
 if(b==='door'){if(S.door==='closed'){if(S.lock){log('Дверь удерживается замком (S3=1): опасное движение ещё возможно — ISO 14119','alarm');return;}
   S.door='open';allPower(false);S.conv.forEach(cv=>cv.vfd.sto=true);if(S.accessReq&&!S.tasks.t4)done('t4');log('Дверь открыта (S2=0). Роботы и конвейеры обесточены');if(['Idle','Stopped'].includes(S.packml))setState('Stopped','Дверь открыта');}
  else{S.door='closed';S.lock=true;S.accessReq=false;log('Дверь закрыта, замок заблокирован (S2=1, S3=1). Требуется сброс');}}
 if(b==='pslow'){S.person='slow';log('LS.W = 0: человек в поле снижения скорости → Reduced Mode, 250 мм/с (ISO/TS 15066)','warn');}
 if(b==='pstop'){S.person='stop';log('LS1 OSSD = 0: человек в защитном поле','alarm');}
 if(b==='paway'){S.person='away';log('Поля сканеров свободны');}
 if(b==='pal'){const s=S.st.find(x=>x.id===i);if(s.agent){log(`У станции ${i} уже работает ${AGENT[s.agent.kind].name}`,'warn');return;}if(!s.present&&CFG.exch.in!=='vehicle'){log('Станция пуста: паллету поставит '+(CFG.exch.in==='robot'?'робот из стопки':'диспенсер'),'warn');return;}dispatch('pallet',s,CFG.exch.out);}
 if(b==='vac'){const r=S.robots[0];if(r.carryKind==='box'){S.stats.dropped+=r.carry;r.carry=0;r.carryKind=null;hold(GRIPPERS[CFG.grip.type].vac?'Потеря вакуума в переносе: PS1=0 — коробка упала, робот остановлен':'Захват раскрылся в переносе: датчик S_GR1=0 — коробка упала');}else log('Отказ имитируется во время переноса коробки роботом 1','warn');}
 if(b==='vfd'){const cv=S.conv[0];if(cv.type==='mdr'){log('На мотор-роликах нет ЧП: отказ зоны сообщит контроллер зоны по шине','warn');return;}if(cv.vfd.fault)return;cv.vfd.fault=true;S.flags.vfdTripped=true;hold('ЧП 1: авария F0001 перегрузка по току (заклинил ролик)');}
 if(b==='stuck'){S.conv[0].stuck=true;log('Датчик B11 залип в «1» (загрязнён отражатель) — ждите реакции робота','warn');}});
$('drives').addEventListener('input',e=>{const i=e.target.dataset.acc;if(i===undefined)return;S.conv[+i].vfd.accel=+e.target.value;$('vAccV'+i).textContent=f1(+e.target.value)+' с';});
// ---------- отрисовка ----------
function armPts(r){const L=DD.rob.reach/2,dx=r.x-r.base.x,dy=r.y-r.base.y;let d=Math.hypot(dx,dy);d=clamp(d,1,2*L-1);const a=Math.atan2(dy,dx),c=Math.acos(d/(2*L)),ex=r.base.x+L*Math.cos(a-c),ey=r.base.y+L*Math.sin(a-c);const P=GG.P,[bx,by]=P(r.base.x,r.base.y),[px,py]=P(ex,ey),[tx,ty]=P(r.x,r.y);return`${bx},${by} ${px.toFixed(1)},${py.toFixed(1)} ${tx.toFixed(1)},${ty.toFixed(1)}`;}
function palSvg(s){const pal=DD.pal,sc=GG.sc,b=boxOf(CFG,s.bi),col=boxColor(s.bi);if(!s.present)return'';
 const off=s.phase==='out'?s.out*(pal.W+600):0;const sl={...s.slot,cx:s.slot.cx+s.slot.cos*off,cy:s.slot.cy+s.slot.sin*off};const [px,py]=GG.P(sl.cx,sl.cy),w=pal.W*sc,h=pal.L*sc;
 let o=`<rect x="${px-w/2}" y="${py-h/2}" width="${w}" height="${h}" rx="2" fill="var(--dim)" stroke="var(--fence)" stroke-width="2"/>`;
 const cells=s.placed.length?curCells(s):(s.last?s.last.cells:null),shown=s.placed.length?s.placed:(s.last?s.last.cells.map((c,i)=>i):[]);
 if(cells)shown.forEach(i=>{const c=cells[i],bw=(c.rot?b.w:b.l)*sc,bh=(c.rot?b.l:b.w)*sc;o+=`<rect x="${px+c.x*sc-bw/2+1}" y="${py+c.y*sc-bh/2+1}" width="${Math.max(1,bw-2)}" height="${Math.max(1,bh-2)}" fill="${col}" stroke="var(--ink)" stroke-width="1"/>`;});
 if(!s.placed.length&&!s.complete&&!s.needSheet&&s.sheetLayers.length&&s.sheetLayers[s.sheetLayers.length-1]===s.layer)o+=`<rect x="${px-w/2+4}" y="${py-h/2+4}" width="${w-8}" height="${h-8}" fill="none" stroke="var(--sheet)" stroke-width="3"/>`;
 let out=rotG(sl,o);out+=`<text x="${px}" y="${py+4}" font-size="11" text-anchor="middle" fill="var(--ink)" font-weight="600" stroke="var(--panel)" stroke-width="3" paint-order="stroke">${s.id} ${s.layer}/${s.pat.layers} · ${s.count}</text>`;
 if(s.complete)out+=`<text x="${px}" y="${py-h/2-5}" font-size="11" text-anchor="middle" fill="var(--green)" font-weight="600">готова</text>`;return out;}
function agentSvg(a){const P=GG.P,sc=GG.sc,pal=DD.pal,[x,y]=P(a.x,a.y),sl=a.target.slot,deg=sl.ang;let o='';const rot=`transform="rotate(${deg} ${x.toFixed(1)} ${y.toFixed(1)})"`;
 if(a.carry==='full'||a.carry==='empty'||a.carry==='sheets'){const w=pal.W*sc,h=pal.L*sc;o+=`<rect ${rot} x="${x-w/2}" y="${y-h/2}" width="${w}" height="${h}" rx="2" fill="${a.carry==='full'?boxColor(a.target.bi||0):a.carry==='sheets'?'var(--sheet)':'var(--dim)'}" stroke="var(--fence)" stroke-width="1.5" opacity=".9"/>`;}
 if(a.kind==='person'||a.kind==='jack'){if(a.kind==='jack'){const w=550*sc,h=1200*sc;o+=`<rect ${rot} x="${x-w/2}" y="${y-h/2}" width="${w}" height="${h}" fill="none" stroke="var(--blue)" stroke-width="2"/>`;}const hx=x+sl.cos*(a.kind==='jack'?900*sc:0),hy=y+sl.sin*(a.kind==='jack'?900*sc:0);o+=`<circle cx="${hx}" cy="${hy}" r="6" fill="var(--panel)" stroke="var(--blue)" stroke-width="2.5"/><circle cx="${hx}" cy="${hy}" r="2" fill="var(--blue)"/>`;}
 else if(a.kind==='forklift'){const w=1100*sc,h=2300*sc;o+=`<rect ${rot} x="${x-w/2}" y="${y-h/2}" width="${w}" height="${h}" rx="3" fill="var(--warnbg)" stroke="var(--blue)" stroke-width="2"/><g ${rot}><rect x="${x-w/2+3}" y="${y-h/2+3}" width="${w-6}" height="${h*0.35}" fill="var(--yellow)" opacity=".8"/></g>`;}
 else{const w=900*sc,h=1400*sc;o+=`<rect ${rot} x="${x-w/2}" y="${y-h/2}" width="${w}" height="${h}" rx="6" fill="var(--panel)" stroke="var(--blue)" stroke-width="2.5"/><circle cx="${x}" cy="${y}" r="3" fill="var(--green)"/>`;}
 return o;}
function render(){
 const D=DD,G=GG,P=G.P,sc=G.sc,c=CFG;let dyn='';
 D.LY.convs.forEach((cv,i)=>{const b=cv.b,col=boxColor(cv.bi);S.conv[i].boxes.forEach(bx=>{const x=cv.x0+b.l/2+bx.p*(cv.len-b.l),[px,py]=P(x-b.l/2,cv.y-b.w/2);dyn+=`<rect x="${px}" y="${py}" width="${b.l*sc}" height="${b.w*sc}" rx="2" fill="${col}" stroke="var(--ink)"/>`;});});
 S.st.forEach(s=>dyn+=palSvg(s));
 S.agents.forEach(a=>dyn+=agentSvg(a));
 S.robots.forEach(r=>{dyn+=`<polyline points="${armPts(r)}" fill="none" stroke="var(--robot)" stroke-width="${Math.max(6,120*sc)}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const [tx,ty]=P(r.x,r.y),cb=boxOf(c,r.carryBi),bw=cb.l*sc,bh=cb.w*sc;
  if(r.carryKind==='box'){const n=r.carry;for(let j=0;j<n;j++)dyn+=`<rect x="${tx-n*bw/2+j*bw}" y="${ty-bh/2}" width="${bw}" height="${bh}" rx="2" fill="${boxColor(r.carryBi)}" stroke="var(--ink)"/>`;}
  else if(r.carryKind==='sheet')dyn+=`<rect x="${tx-D.pal.W*sc/2}" y="${ty-D.pal.L*sc/2}" width="${D.pal.W*sc}" height="${D.pal.L*sc}" fill="none" stroke="var(--sheet)" stroke-width="3"/>`;
  else if(r.carryKind==='pallet')dyn+=`<rect x="${tx-D.pal.W*sc/2}" y="${ty-D.pal.L*sc/2}" width="${D.pal.W*sc}" height="${D.pal.L*sc}" fill="var(--dim)" stroke="var(--fence)" stroke-width="2"/>`;
  else dyn+=`<circle cx="${tx}" cy="${ty}" r="6" fill="${r.power?'var(--robot)':'var(--off)'}"/>`;});
 if(D.safety==='cobot'){const rad=S.person==='away'?G.rDraw+200:S.person==='slow'?Math.min(D.rSlow,G.rDraw)-250:D.rStop-200;const [px,py]=P(rad*0.6,rad*0.8);const col=S.person==='stop'?'var(--red)':S.person==='slow'?'var(--warnfg)':'var(--muted)';dyn+=`<circle cx="${px}" cy="${py-8}" r="7" fill="none" stroke="${col}" stroke-width="2"/><line x1="${px}" y1="${py-1}" x2="${px}" y2="${py+14}" stroke="${col}" stroke-width="2"/>`;}
 $('dyn').innerHTML=dyn;
 S.mags.forEach(m=>{const e=$('sheets-'+m.id);if(e)e.textContent=m.sheets;});S.stacks.forEach(p=>{const e=$('stack-'+p.id);if(e)e.textContent=p.n;});
 S.st.forEach(s=>{const g=$('gate-'+s.id);if(g)g.setAttribute('stroke',s.phase==='out'||(released(s)&&c.exch.out!=='conveyor')?'var(--off)':'var(--red)');const l=$('lamp-'+s.id);if(l)l.setAttribute('fill',released(s)&&c.exch.out!=='conveyor'?'var(--green)':'var(--off)');});
 S.mags.forEach(m=>{const g=$('gate-'+m.id);if(g)g.setAttribute('stroke',m.loading?'var(--off)':'var(--red)');const l=$('lamp-'+m.id);if(l)l.setAttribute('fill',m.sheets<=c.sheet.low?'var(--yellow)':'var(--off)');});
 if(D.safety==='fence'){S.conv.forEach((cv,i)=>{const e=$('lc'+i);e.setAttribute('stroke',S.lc.broken?'var(--yellow)':S.lc.muted?'var(--off)':'var(--red)');e.setAttribute('stroke-width',S.lc.broken?6:3);});
  const d=$('doorLine'),x1=+d.getAttribute('x1'),y1=+d.getAttribute('y1');d.setAttribute('x2',S.door==='open'?x1+40:+d.dataset.x2);d.setAttribute('y2',S.door==='open'?y1-40:y1);$('lockDot').setAttribute('fill',S.lock?'var(--green)':'var(--yellow)');}
 const lp=lamp();$('lr').setAttribute('fill',lp.r?'var(--red)':'var(--off)');$('ly').setAttribute('fill',lp.y?'var(--yellow)':'var(--off)');$('lg').setAttribute('fill',lp.g?'var(--green)':'var(--off)');
 $('pr').classList.toggle('on',lp.r);$('py').classList.toggle('on',lp.y);$('pg').classList.toggle('on',lp.g);
 $('msg').textContent=S.why;$('stName').textContent=S.packml;$('stWhy').textContent=S.why;
 const r0=S.robots[0];STEPS.forEach(s=>$('st-'+s[0]).classList.toggle('on',r0.step===s[0]&&r0.power));
 LIVE_DI.forEach(d=>{const e=$('di-'+d[0]);if(e)e.classList.toggle('on',!!d[2]());});
 LIVE_DO.forEach(d=>{const e=$('do-'+d[0]);if(!e)return;e.classList.toggle('on',!!d[2]());if(d[3])e.classList.toggle(d[3],true);});
 S.conv.forEach((cv,i)=>{const v=cv.vfd;if(cv.type==='mdr'){$('vS'+i).textContent=v.run?'Работа':'Готов';$('vR'+i).textContent=v.run?'да':'нет';const z=$('zn'+i);const zones=z.children.length;const occ=new Set(cv.boxes.map(b=>Math.min(zones-1,Math.floor(b.p*zones))));[...z.children].forEach((el,j)=>el.classList.toggle('on',occ.has(j)));}
  else{$('vT'+i).textContent=f1(v.target)+' Гц';$('vA'+i).textContent=f1(v.actual)+' Гц';$('vS'+i).textContent=v.fault?'АВАРИЯ F0001':v.sto?'Заблокирован':v.actual>0&&v.actual<v.target?'Разгон':v.actual>v.target?'Торможение':v.run?'Работа':'Готов';$('vSTO'+i).textContent=v.sto?'активно':'снято';$('vBar'+i).style.width=(v.actual/50*100)+'%';}});
 const st=S.stats,hrs=st.run/3600;$('stats').innerHTML=`<div>Уложено<b>${st.placed}</b></div><div>Паллет<b>${st.pallets}</b></div><div>Факт кор/ч<b>${st.run>20?f0(st.placed/hrs):'—'}</b></div><div>Расчёт кор/ч<b>${f0(D.bottleneck)}</b></div><div>Время Execute<b>${f0(st.run)} с</b></div><div>Уронено<b>${st.dropped}</b></div><div>Обменов паллет<b>${st.exch}</b></div><div>Пополнений листов<b>${st.refills}</b></div>`;
 $('bStart').disabled=S.packml!=='Idle'||D.reachStatus==='bad';
 $('bStop').disabled=!['Execute','Suspended','Held','Starting'].includes(S.packml);
 $('bReset').disabled=!['Aborted','Stopped','Held'].includes(S.packml);
 const acc=document.querySelector('[data-b="access"]');if(acc)acc.disabled=S.accessReq||!S.lock||S.door==='open';
 const dr=document.querySelector('[data-b="door"]');if(dr)dr.textContent=S.door==='closed'?'Открыть дверь':'Закрыть дверь';
 document.querySelectorAll('[data-b="pal"]').forEach(b=>{const s=S.st.find(x=>x.id===b.dataset.i);b.disabled=!!s.agent||(!s.present&&c.exch.in!=='vehicle');b.textContent=c.exch.auto?`Вызвать сейчас: ${s.id}`:s.present?`Вывезти паллету ${s.id}`:`Привезти паллету ${s.id}`;});
 document.querySelectorAll('[data-b="refill"]').forEach(b=>{const m=S.mags.find(x=>x.id===b.dataset.i);b.disabled=!!m.agent;});
 TASKS.forEach(t=>{const li=$('tk-'+t[0]);if(!li)return;const d=!!S.tasks[t[0]];li.classList.toggle('done',d);li.firstChild.textContent=d?'✓':'☐';li.firstChild.className=d?'ok':'todo';});}
// ======================= ЗАДАНИЯ И СПРАВОЧНИК =======================
const TASKS=[
 ['t1','Запустить ячейку и уложить первый слой','PackML: Stopped → Сброс → Idle → Пуск → Execute. «Пуск» неактивен вне Idle — переходы разрешает машина состояний.'],
 ['t2','Дождаться укладки прокладочного листа','Робот проверяет счётчик слоя после каждой укладки; лист нужен по режиму: снизу, между слоями или через N слоёв.'],
 ['t3','Вызвать защитную остановку (завеса или защитное поле), затем вернуться в Execute','Категория 1 (МЭК 60204-1): рампа торможения, потом STO. За ограждением перезапуск вручную; со сканерами допустим автоматический, если зона просматривается целиком.'],
 ['t4','Запросить доступ и войти через дверь (режим с ограждением)','Замок с удержанием (ISO 14119): Q1 снимается только когда роботы в исходной, а конвейеры стоят.'],
 ['t5','Завершить паллету и получить новую','Проём освобождённой станции в мьютинге; человек, погрузчик или AMR меняют паллету, пока робот работает на другой станции.'],
 ['t6','Нажать аварийный стоп и вернуть ячейку в работу','Категория 0: STO и KM1 сразу. Возврат: отпустить грибок → Сброс (Clear) → Сброс (Idle) → Пуск.'],
 ['t7','Подобрать кобота под коробку 15 кг с запасом по нагрузке и досягаемости','Нагрузка = коробки + захват ≤ 80 % грузоподъёмности; досягаемость до верхнего слоя дальней станции с запасом ≥ 10 %.'],
 ['t8','Настроить два конвейера с разными коробками и заполнить станции обоих','Второй конвейер = второй артикул → следующие станции. ПЛК выбирает задание по датчикам упора и доступности станций.'],
 ['t9','Отработать аварию ЧП: Held → Сброс → Execute','Held — внутренняя причина (отказ), Suspended — внешняя (нет материала). Разный учёт простоев.'],
 ['t10','Собрать конфигурацию на мотор-роликах (ZPA)','Уходят ЧП, STO-цепи и пневмоупоры; появляются контроллеры зон, блок питания 24/48 В и шлюз.'],
 ['t11','Настроить групповой захват по 2+ коробки с запасом по вакууму и нагрузке','Сила = m·(g + a)·S или m·(g + a/μ)·S — что больше; каждая коробка на своей вакуумной зоне; конвейер собирает группу у упора.'],
 ['t12','Получить перевязанную (перекрёстную) схему укладки','Слои с поворотом на 180° перевязывают стопу; иногда это стоит одной-двух коробок в слое.'],
 ['t13','Воспользоваться подбором оптимальной конфигурации и применить предложение','Оптимизатор перебирает роботов, число роботов, коробок за захват и станций; выбирает самый дешёвый вариант, дающий целевую производительность.'],
 ['t14','Дождаться пополнения магазина прокладок (человек или AMR)','При остатке ≤ порога ПЛК зажигает лампу у проёма магазина; во время загрузки магазин исключён из заданий робота.'],
 ['t15','Настроить подачу паллет роботом из стопки','Крюки на захвате, стопка занимает позицию у робота, паллета — отдельный цикл; нагрузка считается и по пустой паллете.'],
 ['t16','Задать выпуск двум и более артикулам и посмотреть планировщик','Методика «циклов на паллету»: ходы + листы + паллета ÷ время прихода паллеты коробок = требуемые циклы/мин.'],
 ['t17','Организовать обмен паллет роботизированной тележкой (AMR)','Заявка через флот-менеджер, разрешение стыковки только для освобождённой станции, мьютинг/сектор на время стыковки.']];
const GLOSS=[['ПЛК (PLC)','Логика ячейки: состояния PackML, счётчики слоёв, выбор задания, обмен с роботами и ЧП. Не участвует в отключении по безопасности.'],['Контроллер безопасности (КБ)','Устройство категории 3/4, PL e: два канала, самодиагностика, тест-импульсы. Все стопы, завесы, замки, STO — через него.'],['STO','Безопасный вход ЧП: снятие 24 В блокирует силовые ключи, двигатель не создаёт момент. Не тормозит — только не даёт разгоняться.'],['Категории стопа (МЭК 60204-1)','0 — немедленное снятие питания; 1 — управляемое торможение, затем снятие питания; 2 — остановка с сохранением питания.'],['Световая завеса тип 4','Многолучевой датчик с двумя OSSD. Разрешение 14 мм (пальцы), 30 мм (рука), 40–90 мм (тело). S = K·T + C по ISO 13855.'],['Мьютинг','Временное отключение завесы для прохода коробки: два датчика срабатывают в последовательности и в окне времени.'],['Освобождённая станция','Сигнал ПЛК «паллета готова и робот не в секторе», подтверждённый в КБ: завеса проёма в байпасе или сектор исключён из поля сканера. Робот аппаратно заблокирован от захода, пока не нажата кнопка «готово».'],['Замок безопасности с удержанием','Выключатель ISO 14119: положение двери и запирание; снимается только сигналом КБ. RFID против обхода.'],['Лазерный сканер безопасности','Поля: защитное (стоп) и предупреждающее (снижение скорости). Наборы полей переключаются безопасными входами. Основа режима «разделение и мониторинг скорости» по ISO/TS 15066.'],['AMR / AGV','Автономная тележка: получает заявки от флот-менеджера, стыкуется к станции по разрешению ПЛК. AGV идёт по разметке, AMR — по карте.'],['Вакуумный захват','Сила = разрежение × площадь. Картон течёт, поэтому нужен большой расход эжектора и умеренный вакуум (40–60 кПа). Датчик PS подтверждает захват.'],['Сильфонная присоска','Складки компенсируют неровности и наклон; ниже жёсткость при боковых ускорениях — для быстрых переносов плоские с рёбрами.'],['Пенная рамка','Площадной захват: пористая пена герметизирует крышку с рёбрами и щелями; вакуум от нагнетателя, много воздуха.'],['Групповой захват','Несколько вакуумных зон; коробки собираются у упора вплотную. Такт на коробку падает, растёт нагрузка и требования к досягаемости.'],['Перевязка (перекрёстная укладка)','Слои повёрнуты на 180° или зеркальны, стыки не совпадают — стопа держится без уголков. Пинвил, кирпичная, зонная схемы.'],['Циклы на паллету','Методика оценки: ходов с коробками + листов + паллет на одну паллету; делим на время прихода паллеты коробок — получаем требуемые циклы в минуту, сравниваем с нормативом робота.'],['ЧП','Питает двигатель напряжением переменной частоты. Конвейер: U/f, рампы 1–3 с. STO — отдельно.'],['Мотор-ролик 24/48 В','Зона роликов с встроенным двигателем и контроллером. ZPA — накопление без давления.'],['PackML','Модель состояний машины: Stopped, Idle, Execute, Held, Suspended, Aborted. Единый язык ПЛК, HMI и робота.'],['GRAFCET / SFC','Последовательность шагами и переходами. Один активный шаг = одно действие.'],['I/O-лист','Таблица сигналов: тег, назначение, тип, адрес, клемма. Основа схем, программы и пусконаладки.']];
function initHelp(){
 $('tasks').innerHTML=TASKS.map(t=>`<li id="tk-${t[0]}"><span class="todo">☐</span><b>${t[1]}</b><p>${t[2]}</p></li>`).join('');
 $('gloss').innerHTML=GLOSS.map(g=>`<dt>${g[0]}</dt><dd>${g[1]}</dd>`).join('');
 $('stdText').innerHTML=`<h3>Нормы, к которым привязан тренажёр</h3><ul><li>ГОСТ Р ИСО 12100 — оценка рисков.</li><li>ГОСТ Р ИСО 13849-1/-2 — PL, категории архитектуры, валидация.</li><li>ГОСТ Р МЭК 60204-1 — электрооборудование машин, категории стопов.</li><li>ГОСТ Р ИСО 10218-1/-2, ISO/TS 15066 — роботы, коллаборативные режимы.</li><li>ГОСТ ИСО 13855, 13857, 14119, ISO 14120 — расстояния, ограждения, блокировки.</li><li>EN 415-4 — безопасность паллетайзеров; ISO 3691-4 — безопасность беспилотных транспортных средств (AMR/AGV).</li><li>ISA-TR88.00.02 (PackML), МЭК 60848 (GRAFCET), МЭК 61131-3, МЭК 61439-1.</li><li>Методика расчёта вакуумных захватов — по рекомендациям производителей присосок (три расчётных случая, коэффициент запаса 1,5–2).</li><li>Методика оценки производительности паллетайзера по циклам на паллету (REDCARGO PRO130).</li></ul><h3>Что упрощено в модели</h3><p>Схемы укладки — из семейства сетка / две зоны / пинвил без перевязки внутри слоя; конвейер — установившийся режим; цикл робота — по расстояниям в плане с нормативом циклов; поля сканеров — круги; тележки и люди идут по прямой к проёму; расход через картон и время набора вакуума — оценочные. Все параметры каталога подлежат проверке по паспорту.</p>`;}
// ======================= ИНИЦИАЛИЗАЦИЯ =======================
function showTab(t){document.querySelectorAll('.tab').forEach(s=>s.classList.toggle('on',s.id==='tab-'+t));document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('on',b.dataset.tab===t));if(t==='3d'&&typeof resize3D==='function')resize3D();}
$('tabs').addEventListener('click',e=>{const t=e.target.dataset.tab;if(t)showTab(t);});
initHelp();renderCfg();if(typeof init3D==='function')init3D();buildSim();renderArch();
let last=performance.now();
function loop(now){const dt=Math.min(.1,(now-last)/1000)*(S.timeScale||1);last=now;tick(dt);if(typeof render3D==='function'&&$('tab-3d').classList.contains('on'))render3D();requestAnimationFrame(loop);}
requestAnimationFrame(loop);
