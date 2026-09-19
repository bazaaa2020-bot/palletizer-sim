// ======================= ОЦЕНКА РИСКА ПО ISO 12100 =======================
// Шаблон протокола: опасности выводятся из самой конфигурации, оцениваются по четырём
// элементам риска (ISO 12100, п. 5.5.2), затем к каждой применяются меры трёх шагов
// (п. 6.2 — безопасная конструкция, 6.3 — технические средства, 6.4 — информация) и
// считается остаточный риск. Числовую шкалу ISO 12100 не задаёт — она описана в
// docs/methodology.md и здесь явно, а не спрятана в коэффициентах.
const HZ_S={1:'Ушиб, ссадина — без потери трудоспособности',2:'Травма с временной потерей трудоспособности',
 3:'Тяжёлая травма, необратимые последствия',4:'Смертельный исход'};
const HZ_F={1:'Реже раза в смену, кратковременно',2:'Несколько раз в смену',3:'Постоянно или почти постоянно'};
const HZ_O={1:'Маловероятно: нужен отказ вместе с нарушением',2:'Возможно: случаи известны на подобном оборудовании',
 3:'Вероятно: происходит при обычном ходе работы'};
const HZ_A={1:'Можно заметить и отойти',2:'Едва возможно: мало времени или обзора',3:'Невозможно: движение быстрее реакции'};
const HZ_TYPE={mech:'Механическая',el:'Электрическая',pneu:'Накопленная энергия',ergo:'Эргономика',
 noise:'Шум',mat:'Материалы и осколки',org:'Организация работ'};
const HZ_STAGE={run:'работа в автомате',setup:'наладка и обучение робота',exch:'обмен паллет и пополнение',
 clean:'очистка и уборка',maint:'обслуживание и ремонт',fault:'устранение сбоя'};
const HZ_WHO={op:'оператор',setter:'наладчик',driver:'водитель техники',maint:'слесарь и электрик',pass:'посторонний'};
const RISK_CLS={1:'низкий',2:'средний',3:'высокий',4:'очень высокий'};
const RISK_OK=2;                                   // классы 1 и 2 принимаем, 3 и 4 — нет
// Вероятность причинения вреда складывается из частоты, вероятности события и возможности избежать.
function pClass(f,o,a){const p=f+o+a;return p<=4?1:p<=6?2:p<=8?3:4;}
// Матрица «тяжесть × вероятность вреда» — приём ISO/TR 14121-2; тяжесть мерами не снижается,
// поэтому смертельная опасность даже под ограждением не опускается ниже среднего класса.
const RISK_M=[[1,1,2,2],[1,2,2,3],[2,2,3,4],[2,3,4,4]];
function riskClass(s,f,o,a){return RISK_M[clamp(s,1,4)-1][pClass(f,o,a)-1];}
// Меры: шаг по ISO 12100 и то, какие элементы риска они снижают.
const MEAS={
 guard:{step:1,n:'Ограждение по ISO 14120, высота 2000 мм, ячейка сетки под расстояние до опасной зоны',d:{o:-2,a:-1}},
 lock:{step:2,n:'Дверь с блокировкой и удержанием (ISO 14119), защита от обхода RFID',d:{o:-1,a:-1}},
 curtain:{step:2,n:'Световая завеса тип 4 в проёме, остановка категории 1',d:{o:-2}},
 mute:{step:2,n:'Мьютинг проёма по двум датчикам и только при освобождённой станции',d:{o:-1}},
 scan:{step:2,n:'Лазерный сканер: защитное поле и поле снижения скорости',d:{o:-2}},
 slow:{step:1,n:'Коллаборативные лимиты скорости и силы по ISO/TS 15066',d:{s:-1,a:-1}},
 sto:{step:2,n:'STO приводов конвейеров от контроллера безопасности',d:{o:-1}},
 estop:{step:2,n:'Аварийный стоп по ISO 13850, категория останова 0',d:{a:-1}},
 drive:{step:1,n:'Кожухи приводных барабанов и зоны натяжения, зазоры по ISO 13854',d:{o:-2}},
 vacfail:{step:1,n:'Обратный клапан и ресивер вакуума: при падении давления груз удерживается',d:{o:-1}},
 vacsens:{step:2,n:'Датчик вакуума на каждой зоне: без подтверждения захвата робот не переносит',d:{o:-1}},
 magfail:{step:1,n:'Магнитный захват с удержанием при пропадании питания и датчиком наличия детали',d:{o:-1}},
 wrap:{step:1,n:'Обмотка стрейчем и уголки: стопа не рассыпается при перевозке',d:{o:-1}},
 stackh:{step:1,n:'Ограничение высоты стопы и проверка устойчивости схемы укладки',d:{o:-1}},
 cab:{step:1,n:'Шкаф IP54, вводной выключатель с запиранием, защитное заземление и УЗО',d:{o:-2}},
 lockout:{step:2,n:'Отключение и запирание ввода (LOTO) на время обслуживания, ключ у работающего',d:{o:-2,a:-1}},
 airoff:{step:2,n:'Запираемый пневмоввод с плавным сбросом давления',d:{o:-1}},
 mechlift:{step:1,n:'Механизация подъёма: тару тяжелее 15 кг оператор вручную не поднимает',d:{s:-1,o:-1}},
 table:{step:1,n:'Подъёмный стол или наклонный лоток: подача на высоте пояса',d:{s:-1}},
 muffler:{step:1,n:'Глушители на выхлопе эжектора и кожух насоса',d:{s:-1}},
 edges:{step:1,n:'Скругление кромок оснастки, магазина и направляющих',d:{s:-1}},
 route:{step:1,n:'Пешеходный маршрут отделён от проезда техники разметкой и отбойниками',d:{o:-1,a:-1}},
 amrsafe:{step:2,n:'Сканеры безопасности AMR, звуковая и световая сигнализация движения',d:{o:-1,a:-1}},
 palconv:{step:2,n:'Тоннель конвейера паллет с завесой в мьютинге на выезд',d:{o:-1,a:-1}},
 reset:{step:2,n:'Сброс защиты — кнопкой снаружи с обзором всей зоны, а не из зоны',d:{o:-1}}};
// Организационные меры шага 3 — их выбирает пользователь, они действуют не на все опасности.
const ORG={
 train:{n:'Обучение и допуск персонала, отработка действий при сбое',d:{a:-1}},
 manual:{n:'Руководство по эксплуатации: остаточные риски, порядок наладки и очистки',d:{o:-1}},
 sign:{n:'Знаки безопасности и разметка опасных зон',d:{a:-1}},
 ppe:{n:'СИЗ: защитная обувь, перчатки, каска в зоне движения техники',d:{s:-1}},
 permit:{n:'Наряд-допуск на работы внутри ограждения',d:{o:-1}},
 rotate:{n:'Ротация и регламентированные перерывы на ручных операциях',d:{f:-1}}};
const ORG_ORDER=['train','manual','sign','ppe','permit','rotate'];
// Опасности этой ячейки. Каждая знает свою зону, вид, этапы, кто подвергается, исходную
// оценку, меры, которые в этой конфигурации уже заложены (meas), и меры, которых в ней нет
// и которые стоит принять, если остаточный риск не приемлем (todo).
function hazards(c,D){
 const H=[],fence=D.safety==='fence',k=c.grip.pick,vac=GRIPPERS[c.grip.type].vac;
 const ex=c.exch,heavy=D.heaviest,pat=D.stations.length?D.stations[0].pat:null;
 const zone=fence?'guard':'scan';                  // чем закрыта зона робота в этой конфигурации
 const add=h=>{h.id='H'+(H.length+1);h.todo=h.todo||[];H.push(h);};
 add({zone:'Зона досягаемости робота',type:'mech',
  n:`Удар и раздавливание манипулятором с грузом (${f1(heavy.m*k)} кг на ${c.speedPct} % скорости)`,
  stage:['run','setup','fault'],who:['op','setter'],
  s:fence?4:3,f:fence?1:2,o:3,a:3,sf:'SF2',
  meas:fence?['guard','curtain','lock','estop','reset']:['scan','slow','estop','reset'],
  org:['train','manual','sign','permit']});
 add({zone:'Внутри ограждения при наладке',type:'org',
  n:'Пуск ячейки, когда человек остался в зоне: сброс защиты без осмотра зоны',
  stage:['setup','maint','fault'],who:['setter','maint'],
  s:4,f:1,o:2,a:3,sf:'SF3',
  meas:[fence?'lock':'scan','reset','lockout','estop'],
  org:['train','permit','manual']});
 add({zone:'Конвейер подачи',type:'mech',
  n:'Затягивание и раздавливание в приводном барабане, между роликами и в зоне накопления',
  stage:['run','clean','maint'],who:['op','maint'],
  s:3,f:2,o:2,a:2,sf:null,meas:['drive','sto','lockout','estop'],org:['train','manual','sign']});
 add({zone:'Зона переноса груза',type:'mech',
  n:vac?'Падение тары при потере вакуума: обрыв шланга, пропадание воздуха, негерметичная тара'
   :c.grip.type==='mag'?'Падение тары при пропадании питания магнита или отрыве от слоя'
   :'Падение тары при раскрытии губок или отказе пневматики',
  stage:['run','exch'],who:['op','driver'],
  s:3,f:2,o:2,a:3,sf:null,meas:['vacsens',zone],
  todo:vac?['vacfail']:c.grip.type==='mag'?['magfail']:['airoff'],
  org:['ppe','manual','sign']});
 add({zone:'Станция готовой паллеты',type:'mech',
  n:`Обрушение стопы высотой ${f0(pat?pat.stackH:1500)} мм при обмене и перевозке`,
  stage:['exch'],who:['op','driver'],
  s:3,f:2,o:2,a:2,sf:null,meas:['stackh'],todo:['wrap'],org:['train','ppe','sign']});
 if(ex.out==='conveyor')add({zone:'Конвейер паллет и диспенсер',type:'mech',
  n:'Защемление между паллетой и рамой конвейера, затягивание в цепь, удар выезжающей паллетой',
  stage:['run','clean','maint'],who:['op','maint'],
  s:3,f:1,o:2,a:2,sf:'SF2',meas:['palconv','sto','lockout'],todo:['drive'],org:['train','manual','sign']});
 else add({zone:'Проезд и зона обмена',type:'mech',
  n:ex.out==='amr'?'Наезд AMR на человека в проезде, защемление между тележкой и паллетой'
   :`Наезд техники (${EXCH_OUT[ex.out].toLowerCase()}) на человека, наезд колесом на стопу`,
  stage:['exch'],who:['driver','op','pass'],
  s:4,f:2,o:2,a:2,sf:null,
  meas:(ex.out==='amr'?['amrsafe']:[]).concat(fence?[zone,'mute']:[zone]),
  todo:['route'],org:['train','sign','ppe']});
 if(c.conveyors.some(x=>x.feed==='manual'))add({zone:'Загрузка конвейера вручную',type:'ergo',
  n:`Ручной подъём и перенос тары ${f1(heavy.m)} кг, до ${f0(D.capFeed)} раз в смену`,
  stage:['run'],who:['op'],
  s:heavy.m>15?3:2,f:3,o:3,a:3,sf:null,meas:[],todo:['mechlift','table'],org:['rotate']});
 if(c.sheet.mode!=='none')add({zone:'Магазин прокладок',type:'mat',
  n:'Порезы кромкой листа и защемление руки при загрузке магазина, опрокидывание пачки листов',
  stage:['exch'],who:['op'],
  s:2,f:2,o:2,a:2,sf:fence?'SF2':null,
  meas:fence?['curtain','mute']:[zone],todo:['edges'],org:['ppe','train','manual']});
 if(ex.in==='robot')add({zone:'Стопка пустых паллет',type:'mech',
  n:`Опрокидывание стопки из ${ex.stack} паллет при пополнении и при захвате верхней роботом`,
  stage:['exch'],who:['op','driver'],
  s:3,f:1,o:2,a:2,sf:null,meas:['stackh',zone],org:['train','sign','ppe']});
 add({zone:'Шкаф управления и ввод',type:'el',
  n:'Поражение током при работе под напряжением, дуга при коммутации, остаточный заряд ЧП',
  stage:['maint'],who:['maint'],
  s:4,f:1,o:2,a:3,sf:null,meas:['cab','lockout'],org:['train','permit','manual']});
 add({zone:'Пневматика захвата',type:'pneu',
  n:'Выброс груза или движение цилиндров при подаче воздуха после ремонта, удар отсоединённым шлангом',
  stage:['maint','fault'],who:['maint','setter'],
  s:3,f:1,o:2,a:2,sf:null,meas:['airoff','lockout'],org:['train','permit','manual']});
 if(vac)add({zone:'Вакуумный источник',type:'noise',
  n:'Шум эжектора и выхлопа сжатого воздуха при непрерывной работе',
  stage:['run'],who:['op'],
  s:2,f:3,o:3,a:3,sf:null,meas:[],todo:['muffler'],org:['ppe','rotate']});
 if(c.boxes.some(b=>b.mat==='glass'))add({zone:'Зона робота и станции',type:'mat',
  n:'Осколки при падении стеклянной тары, порезы при уборке',
  stage:['run','clean','fault'],who:['op'],
  s:3,f:1,o:2,a:2,sf:null,meas:['vacsens',zone],todo:vac?['vacfail']:[],org:['ppe','train','manual']});
 if(c.boxes.some(b=>b.mat==='metal'||b.mat==='alu'))add({zone:'Конвейер и станция',type:'mat',
  n:'Порезы об острые кромки и заусенцы металлической тары',
  stage:['run','exch','clean'],who:['op'],
  s:2,f:2,o:2,a:2,sf:null,meas:[],todo:['edges'],org:['ppe','train']});
 return H;}
// Применение мер: складываем поправки принятых мер, каждый элемент не опускается ниже 1.
function measSum(keys,cat){const d={s:0,f:0,o:0,a:0},use=[];
 keys.forEach(k=>{const m=cat[k];if(!m)return;use.push({k,m});for(const p in m.d)d[p]+=m.d[p];});
 return{use,d};}
function hazCalc(h,c){
 const e=(c.risk.est||{})[h.id]||{};
 const s=clamp(+e.s||h.s,1,4),f=clamp(+e.f||h.f,1,3),o=clamp(+e.o||h.o,1,3),a=clamp(+e.a||h.a,1,3);
 const M=measSum(h.meas,MEAS),O=measSum((h.org||[]).filter(k=>(c.risk.org||[]).indexOf(k)>=0),ORG);
 const m1=M.use.filter(x=>x.m.step===1),m2=M.use.filter(x=>x.m.step===2);
 const cut=(v,d,hi)=>clamp(v+d,1,hi);
 const res={s:cut(s,M.d.s+O.d.s,4),f:cut(f,M.d.f+O.d.f,3),o:cut(o,M.d.o+O.d.o,3),a:cut(a,M.d.a+O.d.a,3)};
 // Требуемый PL определяется после шага 1 (безопасная конструкция) — до технических средств:
 // именно так ISO 12100 выстраивает порядок мер. Для функций, останавливающих робота,
 // ISO 10218-2 задаёт нижнюю границу PL d независимо от графа рисков.
 const d1=measSum(h.meas.filter(k=>MEAS[k]&&MEAS[k].step===1),MEAS).d;
 const s1=cut(s,d1.s,4),f1=cut(f,d1.f,3),a1=cut(a,d1.a,3);
 let plr=plRequired(s1>=3?2:1,f1>=2?2:1,a1>=2?2:1),floor=false;
 if(h.sf&&PL_ORDER.indexOf(plr)<PL_ORDER.indexOf('d')){plr='d';floor=true;}
 const cls0=riskClass(s,f,o,a),cls=riskClass(res.s,res.f,res.o,res.a);
 return Object.assign({},h,{s,f,o,a,res,cls0,cls,ok:cls<=RISK_OK,plr,plFloor:floor,
  m1,m2,m3:O.use,edited:!!(e.s||e.f||e.o||e.a)});}
function riskCalc(c,D){
 const rows=hazards(c,D).map(h=>hazCalc(h,c));
 const bad=rows.filter(x=>!x.ok);
 const plr=rows.filter(x=>x.sf).reduce((p,x)=>PL_ORDER.indexOf(x.plr)>PL_ORDER.indexOf(p)?x.plr:p,'a');
 return{rows,bad,plr,worst:rows.reduce((m,x)=>Math.max(m,x.cls),1),
  org:(c.risk.org||[]).slice(),ok:bad.length===0};}
