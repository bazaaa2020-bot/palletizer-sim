// ======================= ЭКОНОМИКА: СТОИМОСТЬ И ОКУПАЕМОСТЬ =======================
// Считается как в ТКП: количества берутся из конфигурации и расчёта, цены за единицу задаёт
// человек. Сравнение — с ручной паллетизацией того же потока. Методика — docs/methodology.md.
// Все суммы в тысячах рублей, кроме тарифа на электроэнергию и цены листа — они в рублях.
const ECO_UNIT='тыс. ₽';
// Статьи капитальных затрат: как берётся количество и откуда цена за единицу.
function ecoCapex(c,D,E){
 const rob=D.rob,fence=D.safety==='fence',L=[];
 const a=(g,n,q,unit,price,note)=>{if(q<=0||price<=0)return;L.push({g,n,q,unit,price,sum:q*price,note});};
 a('Оборудование',`${rob.name}`,c.robots,'шт.',E.pRobot*rob.cost,
  `цена базового класса ${f0(E.pRobot)} × коэффициент каталога ${f1(rob.cost)}`);
 a('Оборудование',`Захват (${GRIPPERS[c.grip.type].name.toLowerCase()}) с оснасткой и пневматикой`,c.robots,'шт.',E.pGrip,
  c.grip.pick>1?`группа по ${c.grip.pick}${c.grip.pitch==='adj'?', регулируемый шаг зон':''}`:'одиночный захват');
 a('Оборудование','Конвейеры подачи с приводом и ЧП',c.conveyors.reduce((s,x)=>s+x.len,0),'м',E.pConvM,
  `${c.conveyors.length} конвейер${c.conveyors.length===1?'':'а'}, суммарная длина`);
 if(c.exch.out==='conveyor')a('Оборудование','Конвейер паллет с диспенсером',1,'компл.',E.pPalConv,'вывоз готовых паллет');
 a('Оборудование','Оснащение станций обмена',D.stations.length,'шт.',E.pStation,'упоры, разметка, датчики наличия паллеты');
 if(D.mags.length)a('Оборудование','Магазин прокладочных листов',D.mags.length,'шт.',E.pMag,`ёмкость ${c.sheet.cap} листов`);
 if(c.vision.mode!=='none')a('Оборудование',VISION[c.vision.mode].name.split(':')[0],1,'компл.',E.pVision,'камеры, оптика, подсветка, контроллер');
 if(fence){a('Безопасность','Ограждение по ISO 14120',D.fencePerim/1000,'м',E.pFenceM,`периметр по расчёту компоновки`);
  a('Безопасность','Световая завеса тип 4 с мьютингом',c.conveyors.length,'проём',E.pCurtain,'на каждый проём конвейера');}
 else a('Безопасность','Лазерный сканер безопасности',2*c.robots,'шт.',E.pScanner,'два поля на робота: защитное и снижения скорости');
 a('АСУ ТП','Шкаф управления: ПЛК, контроллер безопасности, ЧП, монтаж',1,'компл.',E.pCabinet,
  `${D.io.DI} DI / ${D.io.DO} DO, ${D.io.SI} безопасных входов, сеть ${c.fieldbus}`);
 const equip=L.reduce((s,x)=>s+x.sum,0);
 const eng=equip*E.engPct/100,inst=equip*E.instPct/100;
 L.push({g:'Работы',n:'Проектирование, программирование, пусконаладка',q:E.engPct,unit:'% от оборудования',price:0,sum:eng,note:'включая протоколы валидации по ISO 13849-2'});
 L.push({g:'Работы',n:'Монтаж механики и электромонтаж',q:E.instPct,unit:'% от оборудования',price:0,sum:inst,note:'фундаменты, подводка воздуха и питания'});
 if(E.trainOnce>0)L.push({g:'Работы',n:'Обучение персонала',q:1,unit:'компл.',price:E.trainOnce,sum:E.trainOnce,note:'оператор и наладчик'});
 return{lines:L,equip,eng,inst,total:L.reduce((s,x)=>s+x.sum,0)};}
// Потребляемая мощность ячейки: роботы, приводы конвейеров, сжатый воздух, шкаф.
function ecoPower(c,D){
 const P=[],a=(n,kW,note)=>{if(kW>0)P.push({n,kW,note});};
 a(`Робот${c.robots>1?'ы':''} (${c.robots} × ${f2(D.rob.kW)} кВт)`,c.robots*D.rob.kW,'средняя потребляемая мощность в работе, не установленная');
 const conv=D.convs.reduce((s,x,i)=>s+(c.conveyors[i].type==='mdr'?x.mdrW/1000*0.5:x.Pstd*0.4),0);
 a('Приводы конвейеров',conv,'от установленной: рольганг ≈ 40 %, мотор-ролики ≈ 50 % (зоны стоят без коробок)');
 // Сжатый воздух: около 0,115 кВт·ч на кубометр свободного воздуха при 6–7 бар.
 if(D.grip.air>0)a('Сжатый воздух на эжектор',D.grip.air*60/1000*0.115,`${f0(D.grip.air)} л/мин × 0,115 кВт·ч/м³`);
 if(D.grip.air===0&&GRIPPERS[c.grip.type].vac)a('Вакуумный насос',1.1,'нагнетатель под пенную рамку');
 a('Шкаф, ПЛК, освещение, сигнализация',0.5,'постоянная нагрузка');
 return{lines:P,kW:P.reduce((s,x)=>s+x.kW,0)};}
// Чистая приведённая стоимость и внутренняя норма доходности при постоянной годовой экономии.
function npv(rate,cf0,cf,years){let v=cf0;for(let t=1;t<=years;t++)v+=cf/Math.pow(1+rate,t);return v;}
function irr(cf0,cf,years){
 if(cf<=0)return null;
 let lo=0,hi=5;if(npv(hi,cf0,cf,years)>0)return hi;   // больше 500 % годовых не различаем
 for(let i=0;i<80;i++){const m=(lo+hi)/2;if(npv(m,cf0,cf,years)>0)lo=m;else hi=m;}
 return (lo+hi)/2;}
function ecoCalc(c,D){
 const E=c.eco,hours=Math.max(1,c.pl.dop*c.pl.hop),cap=ecoCapex(c,D,E),pw=ecoPower(c,D);
 const shifts=Math.max(1,Math.round(c.pl.hop/Math.max(1,c.shift.len)));
 // Текущие затраты ячейки за год
 const eEnergy=pw.kW*hours*E.tariff/1000, eServ=cap.total*E.srvPct/100;
 const eSheet=D.sheetsPerHour*hours*E.sheetPrice/1000, eMan=E.cellMan*E.manSalary*shifts;
 const cellOpex=[{n:'Электроэнергия и сжатый воздух',v:eEnergy,note:`${f1(pw.kW)} кВт × ${f0(hours)} ч × ${f1(E.tariff)} ₽/кВт·ч`},
  {n:'Обслуживание и запчасти',v:eServ,note:`${f1(E.srvPct)} % от капитальных затрат в год`},
  {n:'Прокладочные листы',v:eSheet,note:`${f0(D.sheetsPerHour)} листов/ч × ${f0(hours)} ч × ${f0(E.sheetPrice)} ₽`},
  {n:'Оператор ячейки',v:eMan,note:`${f2(E.cellMan)} ставки × ${shifts} смен${shifts===1?'а':''} — обмен паллет, пополнение магазина, реакция на сбой`}]
  .filter(x=>x.v>0);
 const cellYear=cellOpex.reduce((s,x)=>s+x.v,0);
 // Ручная паллетизация того же потока
 const perShift=Math.max(1,Math.ceil(D.bottleneck/Math.max(1,E.manRate))),people=perShift*shifts;
 const manOpex=[{n:'Укладчики',v:people*E.manSalary,note:`${perShift} чел. в смену × ${shifts} смен${shifts===1?'а':''}; норма ${f0(E.manRate)} коробок в час на человека при потоке ${f0(D.bottleneck)} кор/ч`},
  {n:'Прокладочные листы',v:eSheet,note:'та же тара — те же листы'}].filter(x=>x.v>0);
 const manYear=manOpex.reduce((s,x)=>s+x.v,0);
 const save=manYear-cellYear, pay=save>0?cap.total/save:null;
 const rate=E.rate/100, NPV=npv(rate,-cap.total,save,E.years), IRR=irr(-cap.total,save,E.years);
 // Накопленный дисконтированный поток по годам и год выхода в ноль
 const flow=[{t:0,cf:-cap.total,disc:-cap.total,cum:-cap.total}];
 for(let t=1;t<=E.years;t++){const dsc=save/Math.pow(1+rate,t);
  flow.push({t,cf:save,disc:dsc,cum:flow[flow.length-1].cum+dsc});}
 let payD=null;
 for(let i=1;i<flow.length;i++)if(flow[i-1].cum<0&&flow[i].cum>=0){payD=i-1+(-flow[i-1].cum)/flow[i].disc;break;}
 // Удельная себестоимость укладки
 const boxYear=D.bottleneck*hours,palYear=D.palletsPerHour*hours;
 const unit={cellBox:boxYear>0?cellYear*1000/boxYear:0,manBox:boxYear>0?manYear*1000/boxYear:0,
  cellPal:palYear>0?cellYear*1000/palYear:0,manPal:palYear>0?manYear*1000/palYear:0,boxYear,palYear};
 // Чувствительность простого срока окупаемости
 const sens=[];
 const payOf=(kCap,kSave)=>{const s2=save*kSave;return s2>0?cap.total*kCap/s2:null;};
 [['Капитальные затраты',0.75,1.25,k=>payOf(k,1)],['Зарплата укладчика',0.75,1.25,k=>{
   const m2=people*E.manSalary*k+(manYear-people*E.manSalary),s2=m2-cellYear;return s2>0?cap.total/s2:null;}],
  ['Часы работы в году',0.75,1.25,k=>{const m2=manYear,c2=cellYear;const s2=(m2-c2)*k;return s2>0?cap.total/s2:null;}]]
  .forEach(x=>sens.push({n:x[0],low:x[3](x[1]),base:pay,high:x[3](x[2]),k:[x[1],x[2]]}));
 const W=[];
 if(save<=0)W.push(`Экономии нет: ячейка обходится дороже ручной укладки на ${f0(-save)} ${ECO_UNIT} в год. При такой загрузке и такой зарплате проект не окупается — считайте не окупаемость, а условия труда и стабильность качества.`);
 else if(pay>E.years)W.push(`Простой срок окупаемости ${f1(pay)} года больше горизонта расчёта ${E.years} лет — на этом горизонте проект не возвращает вложенного.`);
 if(save>0&&NPV<0)W.push(`Проект окупается по простому сроку (${f1(pay)} года), но при ставке ${f0(E.rate)} % годовых чистая приведённая стоимость отрицательная (${f0(NPV)} ${ECO_UNIT}): деньги выгоднее не вкладывать. Простой срок окупаемости всегда льстит проекту.`);
 if(people<=1&&save>0)W.push('Замена одного человека редко окупает ячейку: смотрите на вторую смену, на ночные смены и на то, что робот не уходит на больничный.');
 if(E.cellMan>=0.9)W.push('Оператор ячейки занят почти полностью — тогда это не «замена человека», а перевод его на другую работу. Проверьте, что доля ставки задана честно.');
 return{unit:ECO_UNIT,years:E.years,rate:E.rate,hours,shifts,cap,pw,cellOpex,cellYear,manOpex,manYear,people,perShift,
  save,pay,payD,npv:NPV,irr:IRR,flow,unitCost:unit,sens,warn:W};}
