// ======================= СПРАВОЧНИКИ =======================
const $=id=>document.getElementById(id);
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const f0=v=>Math.round(v).toLocaleString('ru-RU');
const f1=v=>(Math.round(v*10)/10).toLocaleString('ru-RU',{minimumFractionDigits:1,maximumFractionDigits:1});
const f2=v=>(Math.round(v*100)/100).toLocaleString('ru-RU',{minimumFractionDigits:2,maximumFractionDigits:2});
const deep=o=>JSON.parse(JSON.stringify(o));
const ROBOTS=[
 {id:'cb5',name:'Кобот 5 кг · 850 мм',cls:'cobot',payload:5,reach:850,v:1.0,cpm:8,cost:1.0,ex:'класс UR5e, Dobot CR5, Elite EC66'},
 {id:'cb10l',name:'Кобот 10 кг · 1420 мм',cls:'cobot',payload:10,reach:1418,v:1.0,cpm:8,cost:1.4,ex:'класс FANUC CRX-10iA/L'},
 {id:'cb12',name:'Кобот 12,5 кг · 1300 мм',cls:'cobot',payload:12.5,reach:1300,v:1.0,cpm:8,cost:1.5,ex:'класс UR10e, Doosan M1013'},
 {id:'cb20',name:'Кобот 20 кг · 1750 мм',cls:'cobot',payload:20,reach:1750,v:1.0,cpm:7,cost:2.1,ex:'класс UR20, Doosan H2017 (1700 мм)'},
 {id:'cb25',name:'Кобот 25 кг · 1890 мм',cls:'cobot',payload:25,reach:1889,v:1.0,cpm:7,cost:2.4,ex:'класс FANUC CRX-25iA, Doosan H2515 (1500 мм)'},
 {id:'cb30',name:'Кобот 30 кг · 1300 мм',cls:'cobot',payload:30,reach:1300,v:1.0,cpm:7,cost:2.3,ex:'класс UR30'},
 {id:'ir50',name:'Промышленный 50 кг · 2050 мм',cls:'industrial',payload:50,reach:2050,v:2.0,cpm:12,cost:3.2,ex:'класс FANUC M-710iC/50, KUKA KR 50 R2100'},
 {id:'pl110',name:'Паллетайзер 110 кг · 2400 мм',cls:'industrial',payload:110,reach:2403,v:2.0,cpm:15,cost:4.2,ex:'класс FANUC M-410iC/110'},
 {id:'pl130',name:'Паллетайзер 130 кг · 2400 мм, 6 циклов/мин',cls:'industrial',payload:130,reach:2400,v:2.0,cpm:6,cost:4.4,ex:'по методике оценки REDCARGO PRO130 — 6 циклов укладки в минуту; досягаемость уточнить по паспорту'},
 {id:'pl185',name:'Паллетайзер 185 кг · 3140 мм',cls:'industrial',payload:185,reach:3143,v:2.0,cpm:15,cost:5.0,ex:'класс FANUC M-410iC/185, KUKA KR 180 R3200 PA'},
 {id:'custom',name:'Свой робот — ввести параметры',cls:'custom',payload:10,reach:1300,v:1.0,cpm:8,cost:2.0,ex:''}];
// Форма тары: чем она отличается для захвата. seal — доля площади, которая реально
// уплотняется вакуумом (у решётчатого верха нечему уплотняться, у плёнки складки подсасывают).
const SHAPES={box:{name:'Коробка (параллелепипед)',seal:1,round:false},
 shrink:{name:'Термоусадка: бутылки в плёнке',seal:.6,round:false},
 cyl:{name:'Цилиндр: банка, круглая заготовка',seal:1,round:true},
 plate:{name:'Лист или плоская деталь',seal:1,round:false},
 crate:{name:'Ящик с решётчатым верхом',seal:0,round:false}};
// Материал: предельное трение о присоску, утечка через поверхность, магнитится ли.
const MATS={carton:{name:'Картон',muCap:.7,leak:.25,mag:false},
 film:{name:'Полимерная плёнка',muCap:.35,leak:.08,mag:false},
 plastic:{name:'Жёсткий пластик',muCap:.45,leak:.02,mag:false},
 metal:{name:'Сталь',muCap:.35,leak:.01,mag:true},
 alu:{name:'Алюминий / нержавейка',muCap:.35,leak:.01,mag:false},
 glass:{name:'Стекло',muCap:.35,leak:.01,mag:false}};
const TARA_DEF={shape:'box',mat:'carton'};
const BOX_PRESETS=[{name:'Малая',l:300,w:200,h:150,m:3,rate:0,layers:0},{name:'Средняя',l:400,w:300,h:250,m:8,rate:0,layers:0},{name:'Крупная',l:600,w:400,h:300,m:15,rate:0,layers:0},{name:'Тяжёлая',l:500,w:350,h:200,m:22,rate:0,layers:0},
 {name:'М5П',l:300,w:200,h:105,m:5,rate:900,layers:11},{name:'М12_УП',l:334,w:215,h:196,m:12,rate:458,layers:7},{name:'С180',l:381,w:206,h:145,m:9,rate:400,layers:7},{name:'М180',l:306,w:246,h:143,m:9,rate:400,layers:4},{name:'С450',l:326,w:264,h:123,m:8.1,rate:379,layers:4},{name:'М20П',l:377,w:250,h:242,m:20,rate:275,layers:4},{name:'М8',l:335,w:204,h:150,m:7.5,rate:267,layers:7},{name:'Б380',l:357,w:258,h:136,m:6.08,rate:263,layers:9},{name:'МС2',l:392,w:294,h:109,m:10,rate:140,layers:10},{name:'МС10',l:314,w:152,h:243,m:10,rate:240,layers:5},
 {name:'Бутылки в термоусадке 6×1,5 л',l:280,w:190,h:330,m:9.5,rate:0,layers:0,shape:'shrink',mat:'film'},
 {name:'Банка металлическая Ø200',l:200,w:200,h:250,m:6,rate:0,layers:0,shape:'cyl',mat:'metal'},
 {name:'Заготовка стальная Ø300',l:300,w:300,h:120,m:28,rate:0,layers:0,shape:'cyl',mat:'metal'},
 {name:'Лист стальной 600×400×4',l:600,w:400,h:4,m:7.5,rate:0,layers:0,shape:'plate',mat:'metal'},
 {name:'Ящик решётчатый',l:600,w:400,h:300,m:12,rate:0,layers:0,shape:'crate',mat:'plastic'}];
const PALLETS={'EUR 1200×800':{L:1200,W:800,h:144,m:25},'FIN 1200×1000':{L:1200,W:1000,h:144,m:30},'1000×1000':{L:1000,W:1000,h:150,m:28},'1100×1100':{L:1100,W:1100,h:150,m:30}};
const CONV_TYPES={belt:{name:'Ленточный (гладкое полотно, один привод)',mu:.30,mBelt:8,vfd:true},roller:{name:'Рольганг приводной (цепной/ремённый, один привод)',mu:.06,mBelt:0,vfd:true},mdr:{name:'Рольганг на мотор-роликах 24 В (ZPA, привод в каждой зоне)',mu:.06,mBelt:0,vfd:false}};
const FIELDBUS=['PROFINET','EtherNet/IP','Modbus TCP','Дискретные сигналы'];
const GRIPPERS={cups:{name:'Вакуумный на присосках',vac:true,multi:true,base:3.5,perBox:0.8},
 foam:{name:'Вакуумная пенная рамка (площадной)',vac:true,multi:true,base:5,perBox:2.5},
 mag:{name:'Магнитный (электропостоянный)',vac:false,multi:true,base:8,perBox:3},
 clamp:{name:'Клещевой (пневмозажим с боков)',vac:false,multi:false,base:10,perBox:4},
 fork:{name:'Вилочный (подхват снизу + прижим)',vac:false,multi:false,base:12,perBox:5}};
// Годится ли захват под эту тару. Возвращает степень пригодности и причину.
function gripFit(b,type){const sh=SHAPES[b.shape||'box'],mt=MATS[b.mat||'carton'],G=GRIPPERS[type];
 if(type==='mag')return mt.mag?{s:'ok',n:''}:{s:'bad',n:`${mt.name} не магнитится — магнитный захват не удержит`};
 if(G.vac){
  if(sh.seal===0)return{s:'bad',n:'Решётчатый верх не уплотняется — вакуум не создать, нужен подхват снизу или боковой обжим'};
  if(sh.seal<1)return{s:'warn',n:'Термоусадка: складки плёнки подсасывают воздух, полезная площадь уплотнения меньше; надёжнее боковой обжим или вилки'};
  if(sh.round&&type==='cups')return{s:'warn',n:'Круглая крышка: присоски надо вписать в окружность — проверьте, помещается ли выбранное число'};
  if(mt.muCap<0.4)return{s:'warn',n:`${mt.name}: скользкая поверхность, удержание трением хуже — решает горизонтальный случай`};
  return{s:'ok',n:''};}
 if(type==='clamp'){
  if(b.shape==='plate')return{s:'bad',n:'Лист не за что взять с боков — вакуум с уплотнительной панелью или магнит'};
  if(sh.round)return{s:'warn',n:'Цилиндр в плоских губках проворачивается — нужны призматические губки'};
  return{s:'ok',n:''};}
 if(type==='fork'){
  if(b.shape==='plate')return{s:'warn',n:'Лист подхватом снизу — только если под ним есть зазор под вилки'};
  return{s:'ok',n:''};}
 return{s:'ok',n:''};}
function gripBest(b){const ok=Object.keys(GRIPPERS).filter(t=>gripFit(b,t).s==='ok');
 return ok.length?ok:Object.keys(GRIPPERS).filter(t=>gripFit(b,t).s==='warn');}
const CUPS={bellows:{name:'Сильфонная, 1,5 складки',mu:.5,vacMax:60,note:'компенсирует неровности и наклон картона'},flat:{name:'Плоская',mu:.5,vacMax:80,note:'гладкие жёсткие поверхности; на картоне течёт'},flatrib:{name:'Плоская с рёбрами (высокое трение)',mu:.7,vacMax:80,note:'горизонтальные ускорения при быстрых переносах'},oval:{name:'Овальная',mu:.5,vacMax:60,note:'узкие рёбра жёсткости, длинные коробки'}};
// Как тара приходит на конвейер: отсюда исходный разброс положения и угла.
const INFEED={oriented:{name:'Ориентированно, по одной в ряд',dx:10,da:2,multi:false},
 random:{name:'Произвольный поворот, один слой',dx:60,da:180,multi:false},
 multi:{name:'Переменная высота или несколько слоёв',dx:60,da:180,multi:true},
 bulk:{name:'Навалом',dx:150,da:180,multi:true,bulk:true}};
// Направляющие и центрирование: до какой остаточной погрешности доводят позу.
const ALIGN={none:{name:'Без направляющих',dx:1e9,da:1e9},
 guides:{name:'Боковые направляющие',dx:5,da:3},
 stop:{name:'Направляющие и торцевой упор',dx:3,da:2},
 center:{name:'Направляющие, упор и центрирующие прижимы',dx:2,da:0.5}};
// Техническое зрение: точность позы и время кадра.
const VISION={none:{name:'Без технического зрения',dx:1e9,da:1e9,t:0},
 '2d':{name:'2D-камера: положение и угол в плоскости',dx:1.5,da:0.5,t:0.15},
 '3d':{name:'3D: стереопара, ToF или лазерный профилометр',dx:3,da:1,t:0.35},
 struct:{name:'3D со структурированным светом (прозрачная и блестящая тара)',dx:2,da:0.7,t:0.5}};
const VIS_ORDER=['none','2d','3d','struct'];
// Допуск захвата на промах по положению и углу.
function pickTol(c,b,G){const t=c.grip.type,mn=Math.min(b.l,b.w);
 if(t==='cups'){const d=(G&&G.cupD)||50,n=(G&&G.nPerBox)||4,span=(d+25)*Math.ceil(Math.sqrt(n));
  return{dx:Math.max(3,(mn-span)/2),da:5};}
 if(t==='foam')return{dx:Math.max(5,mn*0.12),da:5};
 if(t==='mag')return{dx:Math.max(5,mn*0.12),da:6};
 if(t==='clamp')return{dx:10,da:3};
 return{dx:15,da:3};}
// Базирование по каждому конвейеру: что осталось от разброса и хватает ли этого захвату.
function baseCalc(c,G){const V=VISION[c.vision.mode]||VISION.none;
 return c.conveyors.map((cv,i)=>{const b=boxOf(c,cv.box),IN=INFEED[cv.infeed]||INFEED.oriented,AL=ALIGN[cv.align]||ALIGN.none;
  const round=SHAPES[b.shape||'box'].round,mt=MATS[b.mat||'carton'];
  const gx=Math.min(IN.dx,AL.dx),ga=round?0:Math.min(IN.da,AL.da);      // только направляющие
  const dx=Math.min(gx,V.dx),da=round?0:Math.min(ga,V.da);              // с учётом зрения
  const tol=pickTol(c,b,G);
  // Направляющие правят положение в плане, но не высоту: при переменной высоте или
  // нескольких слоях робот не знает Z, и без 3D он опускается не туда.
  const needVis=(gx>tol.dx||ga>tol.da||IN.multi);
  const hard=(b.mat==='glass'||b.mat==='film'||(round&&(b.mat==='metal'||b.mat==='alu')));
  const need=!needVis?'none':hard?'struct':IN.multi?'3d':'2d';
  const zOK=!IN.multi||visionOK(c.vision.mode,'3d');
  return{i,cv,b,IN,AL,gx,ga,dx,da,tol,need,zOK,ok:dx<=tol.dx&&da<=tol.da&&zOK,bulk:!!IN.bulk,round};});}
function visionOK(mode,need){return VIS_ORDER.indexOf(mode)>=VIS_ORDER.indexOf(need);}
const FEEDS={manual:'Ручная (оператор кладёт)',interval:'Автомат: коробка каждые N секунд',rate:'Автомат: N коробок в минуту'};
const SHEET_MODES={none:'Без листов',bottom:'Один лист на поддоне (снизу)',between:'Лист между каждым слоем',everyN:'Лист через каждые N слоёв'};
const EXCH_OUT={jack:'Человек с рохлей (ручная гидравлическая тележка)',forklift:'Погрузчик (кар)',amr:'Роботизированная тележка (AMR/AGV)',conveyor:'Цепной конвейер паллет + диспенсер'};
const EXCH_IN={vehicle:'Та же тележка привозит пустую паллету',robot:'Робот берёт пустую паллету из стопки (магазин паллет)',dispenser:'Диспенсер на конвейере паллет'};
const SHEETS_BY={person:'Человек докладывает листы в магазин',amr:'AMR привозит паллету с листами (замена магазина целиком)'};
const AGENT={person:{v:1.0,lift:2,name:'человек'},jack:{v:0.8,lift:4,name:'человек с рохлей'},forklift:{v:1.5,lift:3,name:'погрузчик'},amr:{v:1.0,lift:5,name:'AMR'}};
const CUP_D=[30,40,50,60,80,100,125];
// Транспорт обмена: габарит по ширине и вылет площадки ожидания за ограждением.
const VEH={jack:{w:800,park:1500},forklift:{w:1400,park:2600},amr:{w:1000,park:1800},conveyor:{w:800,park:1200}};
function vehOf(c){return VEH[c.exch.out]||VEH.jack;}
// Пересечение отрезка с прямоугольником (возможно повёрнутым), раздутым на halfW.
function segBox(p0,p1,o,halfW){const t=-(o.ang||0)*Math.PI/180,ct=Math.cos(t),st=Math.sin(t);
 const tr=p=>({x:(p.x-o.x)*ct-(p.y-o.y)*st,y:(p.x-o.x)*st+(p.y-o.y)*ct});
 const a=tr(p0),b=tr(p1),hx=o.hx+halfW,hy=o.hy+halfW,dx=b.x-a.x,dy=b.y-a.y;
 let t0=0,t1=1;
 for(const [pp,qq] of [[-dx,a.x+hx],[dx,hx-a.x],[-dy,a.y+hy],[dy,hy-a.y]]){
  if(Math.abs(pp)<1e-9){if(qq<0)return false;}
  else{const r=qq/pp;if(pp<0){if(r>t1)return false;if(r>t0)t0=r;}else{if(r<t0)return false;if(r<t1)t1=r;}}}
 return true;}
function segCircle(p0,p1,o,halfW){const dx=p1.x-p0.x,dy=p1.y-p0.y,l2=dx*dx+dy*dy;
 let t=l2?((o.x-p0.x)*dx+(o.y-p0.y)*dy)/l2:0;t=clamp(t,0,1);
 return Math.hypot(p0.x+dx*t-o.x,p0.y+dy*t-o.y)<o.rad+halfW;}
// Точка выхода луча из p по (dx,dy) на прямоугольник F.
function rayToRect(F,p,dx,dy){let t=Infinity;
 if(dx>1e-6)t=Math.min(t,(F.x1-p.x)/dx);if(dx<-1e-6)t=Math.min(t,(F.x0-p.x)/dx);
 if(dy>1e-6)t=Math.min(t,(F.y1-p.y)/dy);if(dy<-1e-6)t=Math.min(t,(F.y0-p.y)/dy);
 return isFinite(t)&&t>0?{x:p.x+dx*t,y:p.y+dy*t}:null;}
const SLOT_ANGLES={1:[0],2:[-90,90],3:[-90,0,90],4:[-90,-30,30,90],5:[-90,-45,0,45,90],6:[-90,-54,-18,18,54,90]};
const STN='ABCDEFGH';
const DEF={name:'Ячейка паллетизации',robots:1,robot:'cb20',custom:{payload:10,reach:1300,cls:'cobot',cpm:8},speedPct:100,
 grip:{type:'cups',cup:'bellows',cupD:0,vac:60,pressure:5,pick:1,mass:0,pitch:'fixed',tShift:1.5},gripH:250,baseH:800,
 pallet:'EUR 1200×800',maxStack:1300,stations:2,magazines:1,patternMode:'interlock',slotR:950,pickDist:850,convH:700,convGap:900,
 sheet:{mode:'between',everyN:2,cap:20,low:3,speedPct:60,tGrip:1.0,sect:4},
 motion:{vZ:900,vPlace:150,hAppr:60,tJerk:0.15,wSpeed:180},
 exch:{out:'jack',in:'vehicle',sheetsBy:'person',auto:true,reaction:20,stack:8},
 boxes:[{name:'Средняя',l:400,w:300,h:250,m:8,rate:0,layers:0}],
 conveyors:[{type:'roller',len:3,speed:12,accum:true,box:0,feed:'manual',interval:10,rate:6,infeed:'oriented',align:'guides'}],
 vision:{mode:'none'},
 palletHandling:'forklift',safety:'fence',fieldbus:'PROFINET',tStop:0.5,
 pl:{S:2,F:2,P:1,arch:'cat3',edm:true,dop:240,hop:16,opsES:2,opsLC:30,opsDoor:6,ccf:['sep','over','well','fmea','train','emc','env']},
 risk:{org:['train','manual','sign','ppe','permit'],est:{}},
 shift:{len:8,breaks:30},
 plc:{mode:'ref',g1:[],g2:[]},opt:{target:400,allowCobot:true,maxRobots:2}};
let CFG=deep(DEF);
try{const s=JSON.parse(localStorage.getItem('pal-sim-cfg4')||'null');if(s&&s.boxes&&s.conveyors&&s.grip&&s.exch){CFG=Object.assign(deep(DEF),s);CFG.sheet=Object.assign(deep(DEF.sheet),s.sheet||{});CFG.exch=Object.assign(deep(DEF.exch),s.exch||{});CFG.grip=Object.assign(deep(DEF.grip),s.grip||{});CFG.motion=Object.assign(deep(DEF.motion),s.motion||{});CFG.vision=Object.assign(deep(DEF.vision),s.vision||{});CFG.pl=Object.assign(deep(DEF.pl),s.pl||{});CFG.risk=Object.assign(deep(DEF.risk),s.risk||{});CFG.shift=Object.assign(deep(DEF.shift),s.shift||{});CFG.plc=Object.assign(deep(DEF.plc),s.plc||{});CFG.boxes.forEach(b=>{if(b.rate===undefined)b.rate=0;if(b.layers===undefined)b.layers=0;});}}catch(e){}
function saveCfg(){try{localStorage.setItem('pal-sim-cfg4',JSON.stringify(CFG));}catch(e){}}
function robotOf(c){const r=ROBOTS.find(x=>x.id===c.robot)||ROBOTS[3];if(r.id==='custom')return{id:'custom',name:'Свой робот',cls:c.custom.cls,payload:+c.custom.payload,reach:+c.custom.reach,v:c.custom.cls==='cobot'?1:2,cpm:+c.custom.cpm||8,cost:2,ex:''};return r;}
function safetyMode(c,rob){if(rob.cls!=='cobot')return'fence';return c.safety==='auto'?'cobot':c.safety;}
function boxOf(c,i){return c.boxes[i]||c.boxes[0];}
function boxColor(i){return['var(--box)','var(--box2)','var(--box3)','var(--box4)'][i%4];}
function normalize(c){if(c.exch.out==='conveyor')c.exch.in='dispenser';else if(c.exch.in==='dispenser')c.exch.in='vehicle';c.palletHandling=c.exch.out==='conveyor'?'conveyor':'forklift';
 const extra=(c.exch.in==='robot'?1:0);if(c.stations+c.magazines+extra>6)c.magazines=Math.max(0,6-c.stations-extra);if(c.sheet.mode==='none')c.magazines=0;if(c.sheet.mode!=='none'&&c.magazines===0)c.magazines=1;
 const M=c.motion;M.vZ=clamp(+M.vZ||900,100,2000);M.vPlace=clamp(+M.vPlace||150,20,400);M.hAppr=clamp(+M.hAppr||60,5,400);M.tJerk=clamp(+M.tJerk||0,0,1);M.wSpeed=clamp(+M.wSpeed||180,20,720);c.sheet.sect=clamp(Math.round(+c.sheet.sect||1),1,8);
 if(!c.vision||!VISION[c.vision.mode])c.vision={mode:'none'};
 if(!c.pl)c.pl=deep(DEF.pl);const PL=c.pl;
 PL.S=PL.S===1?1:2;PL.F=PL.F===1?1:2;PL.P=PL.P===1?1:2;if(!PL_ARCH[PL.arch])PL.arch='cat3';
 PL.dop=clamp(Math.round(+PL.dop||240),1,365);PL.hop=clamp(Math.round(+PL.hop||16),1,24);
 ['opsES','opsLC','opsDoor'].forEach(k=>{PL[k]=clamp(Math.round(+PL[k]||1),0,500);});
 if(!Array.isArray(PL.ccf))PL.ccf=[];
 if(!c.plc)c.plc=deep(DEF.plc);
 if(c.plc.mode!=='user')c.plc.mode='ref';
 ['g1','g2'].forEach(g=>{if(!Array.isArray(c.plc[g])){c.plc[g]=[];return;}
  c.plc[g]=c.plc[g].filter(s=>s&&typeof s==='object').map((s,i)=>({
   id:String(s.id||((g==='g1'?'S':'T')+i)).slice(0,6),n:String(s.n||'Шаг').slice(0,80),
   act:(Array.isArray(s.act)?s.act:[]).filter(a=>GC_ACT[a]),
   tr:(Array.isArray(s.tr)?s.tr:[]).filter(t=>t&&GC_COND[t.c]).map(t=>({c:t.c,to:String(t.to||'')}))}));});
 if(c.plc.mode==='user'&&!c.plc.g1.length)c.plc.mode='ref';
 if(!c.shift)c.shift=deep(DEF.shift);
 c.shift.len=clamp(+c.shift.len||8,1,24);c.shift.breaks=clamp(Math.round(+c.shift.breaks)||0,0,480);
 if(!c.risk)c.risk=deep(DEF.risk);
 if(!Array.isArray(c.risk.org))c.risk.org=[];c.risk.org=c.risk.org.filter(k=>ORG[k]);
 if(!c.risk.est||typeof c.risk.est!=='object')c.risk.est={};
 Object.keys(c.risk.est).forEach(k=>{const e=c.risk.est[k];if(!e||typeof e!=='object'){delete c.risk.est[k];return;}
  ['s','f','o','a'].forEach(p=>{if(e[p]===undefined)return;e[p]=clamp(Math.round(+e[p])||1,1,p==='s'?4:3);});});
 c.conveyors.forEach(v=>{if(!INFEED[v.infeed])v.infeed='oriented';if(!ALIGN[v.align])v.align='guides';});
 c.boxes.forEach(b=>{if(!SHAPES[b.shape])b.shape='box';if(!MATS[b.mat])b.mat='carton';
  if(b.shape==='cyl')b.w=b.l;});                       // цилиндр описываем квадратом со стороной Ø
 if(!GRIPPERS[c.grip.type].multi)c.grip.pick=1;if(c.grip.pitch!=='adj'||c.grip.pick<2)c.grip.pitch='fixed';c.grip.tShift=clamp(+c.grip.tShift||0,0,10);
 while(c.conveyors.length<c.robots)c.conveyors.push(deep(c.conveyors[0]));return c;}
function sheetsPerPallet(mode,layers,N){return mode==='none'?0:mode==='bottom'?1:mode==='between'?Math.max(0,layers-1):Math.floor((layers-1)/Math.max(1,N));}
// ======================= ПРОФИЛЬ ПЕРЕМЕЩЕНИЯ =======================
// Время хода на L метров: трапеция скорости (разгон — марш — торможение) либо треугольник,
// если до маршевой скорости v разогнаться не успеваем. tJ — время нарастания ускорения:
// S-образное сглаживание добавляет примерно его к трапеции. См. docs/methodology.md.
function moveTime(L,v,a,tJ){if(!(L>0))return 0;return(2*v*v/a<=L?L/v+v/a:2*Math.sqrt(L/a))+(tJ||0);}
// ======================= СХЕМЫ УКЛАДКИ =======================
function genPatterns(b,pal){
 const l=b.l,w=b.w,W=pal.W,L=pal.L,C=[];
 const grid=(x0,y0,rw,rh,rot)=>{const bx=rot?w:l,by=rot?l:w,cols=Math.floor(rw/bx+1e-9),rows=Math.floor(rh/by+1e-9),o=[];for(let j=0;j<rows;j++)for(let i=0;i<cols;i++)o.push({x:x0+bx*(i+.5),y:y0+by*(j+.5),rot});return o;};
 const add=(name,cells)=>{if(!cells.length)return;const xs=cells.map(c=>c.x+(c.rot?w:l)/2),xm=cells.map(c=>c.x-(c.rot?w:l)/2),ys=cells.map(c=>c.y+(c.rot?l:w)/2),ym=cells.map(c=>c.y-(c.rot?l:w)/2);
  const cx=(Math.max(...xs)+Math.min(...xm))/2,cy=(Math.max(...ys)+Math.min(...ym))/2;const cc=cells.map(c=>({x:Math.round(c.x-cx),y:Math.round(c.y-cy),rot:c.rot}));
  const key=cc.map(c=>`${c.x},${c.y},${c.rot}`).sort().join('|'),keyR=cc.map(c=>`${-c.x},${-c.y},${c.rot}`).sort().join('|');C.push({name,cells:cc,n:cc.length,interlock:key!==keyR});};
 add('Сетка: длина коробки вдоль длины паллеты',grid(0,0,W,L,1));add('Сетка: длина коробки вдоль ширины паллеты',grid(0,0,W,L,0));
 for(const r1 of[0,1]){const r2=1-r1,bx1=r1?w:l,by1=r1?l:w;
  for(let i=1;i*bx1<W;i++){const xs=i*bx1;add(`Две зоны по ширине паллеты: ${i} продольн. + поперечные`,grid(0,0,xs,L,r1).concat(grid(xs,0,W-xs,L,r2)));}
  for(let j=1;j*by1<L;j++){const ys=j*by1;add(`Две зоны по длине паллеты: ${j} ряд. + поперечные`,grid(0,0,W,ys,r1).concat(grid(0,ys,W,L-ys,r2)));}}
 for(let a=1;a<=4;a++)for(let bb=1;bb<=4;bb++){if(a*l+bb*w>Math.min(W,L))continue;add(`Пинвил (колодец) ${a}×${bb}`,grid(0,0,a*l,bb*w,0).concat(grid(W-bb*w,0,bb*w,a*l,1),grid(W-a*l,L-bb*w,a*l,bb*w,0),grid(0,L-a*l,bb*w,a*l,1)));}
 return C;}
// Группы для многозахвата. В «продольных» координатах слоя шаг решётки всегда l вдоль
// коробки и w поперёк, как бы коробка ни была повёрнута в схеме. adj — регулируемый шаг
// зон: группа может быть прямоугольным блоком nc×nr, а не только рядом. См. docs/methodology.md.
function makeGroups(cells,k,l,w,adj){
 const along=c=>c.rot?c.y:c.x,perp=c=>c.rot?c.x:c.y;const tag=(g,nc,nr)=>{g.nc=nc;g.nr=nr;return g;};
 const seq=cells.map((c,i)=>i).sort((a,b)=>cells[a].rot-cells[b].rot||perp(cells[a])-perp(cells[b])||along(cells[a])-along(cells[b]));
 if(!adj||k<2){const groups=[];let run=[];const flush=()=>{for(let i=0;i<run.length;i+=k){const g=run.slice(i,i+k);groups.push(tag(g,g.length,1));}run=[];};
  for(const i of seq){const c=cells[i];if(run.length){const p=cells[run[run.length-1]];if(!(c.rot===p.rot&&Math.abs(perp(c)-perp(p))<1&&Math.abs(along(c)-along(p)-l)<2))flush();}run.push(i);}flush();return groups;}
 const key=(r,a,p)=>r+'|'+Math.round(a)+'|'+Math.round(p);const at={};cells.forEach((c,i)=>{at[key(c.rot,along(c),perp(c))]=i;});
 const used=cells.map(()=>false);
 const cellAt=(rot,a,p)=>{for(let da=-1;da<=1;da++)for(let dp=-1;dp<=1;dp++){const i=at[key(rot,a+da,p+dp)];if(i!==undefined&&!used[i])return i;}return -1;};
 const shapes=[];for(let nr=1;nr<=k;nr++)for(let nc=1;nc<=Math.floor(k/nr);nc++)shapes.push({nc,nr});
 const byShape=(x,y)=>y.nc*y.nr-x.nc*x.nr||x.nr-y.nr||y.nc-x.nc;shapes.sort(byShape);
 const block=(s,sh)=>{const c=cells[s],a0=along(c),p0=perp(c),g=[];
  for(let j=0;j<sh.nr;j++)for(let i=0;i<sh.nc;i++){const q=cellAt(c.rot,a0+i*l,p0+j*w);if(q<0||g.indexOf(q)>=0)return null;g.push(q);}return g;};
 const groups=[];let left=cells.length;
 while(left>0){let got=null;
  for(const sh of shapes){if(sh.nc*sh.nr>left)continue;
   for(const s of seq){if(used[s])continue;const g=block(s,sh);if(g){got=tag(g,sh.nc,sh.nr);break;}}
   if(got)break;}
  if(!got)got=tag([seq.find(i=>!used[i])],1,1);
  got.forEach(i=>{used[i]=true;});left-=got.length;groups.push(got);}
 return groups.sort(byShape);}
function choosePattern(b,pal,mode,maxStack,k,sheet,grip,tRef){
 const C=genPatterns(b,pal);const byN=(x,y)=>y.n-x.n||(y.interlock-x.interlock);const best=Math.max(...C.map(c=>c.n));let pick;
 if(mode==='column')pick=C.filter(c=>c.name.startsWith('Сетка')).sort(byN)[0];
 else if(mode==='interlock'){pick=C.filter(c=>c.interlock).sort(byN)[0]||C.slice().sort(byN)[0];}
 else pick=C.slice().sort(byN)[0];
 const p={...pick};const auto=Math.max(1,Math.floor((maxStack-pal.h)/b.h));p.layers=b.layers>0?b.layers:auto;p.layersAuto=auto;p.total=p.n*p.layers;p.stackH=pal.h+p.layers*b.h;p.mass=p.total*b.m+pal.m;p.fill=p.n*b.l*b.w/(pal.W*pal.L);p.bestN=best;p.loss=best-p.n;
 p.cellsB=p.interlock?p.cells.map(c=>({x:-c.x,y:-c.y,rot:c.rot})):p.cells;
 // Блок nr>1 захват собирает с конвейера рядом, поэтому на каждый такой ход — два
 // перестроения зон: развести в блок после захвата и собрать обратно в ряд перед следующим.
 const plan=adj=>{const A=makeGroups(p.cells,k,b.l,b.w,adj),B=makeGroups(p.cellsB,k,b.l,b.w,adj);let g=0,sh=0;
  for(let j=0;j<p.layers;j++){const gs=p.interlock&&j%2?B:A;g+=gs.length;gs.forEach(x=>{if(x.nr>1)sh+=2;});}
  return{groupsA:A,groupsB:B,kEff:p.n/A.length,groups:g,shifts:sh,adj};};
 const tSh=grip&&grip.pitch==='adj'?+grip.tShift||0:0,T=tRef>0?tRef:10,cost=q=>q.groups*T+q.shifts*tSh;
 p.planRow=plan(false);p.planAdj=grip&&grip.pitch==='adj'&&k>1?plan(true):null;
 p.plan=p.planAdj&&cost(p.planAdj)<cost(p.planRow)?p.planAdj:p.planRow;
 p.groupsA=p.plan.groupsA;p.groupsB=p.plan.groupsB;p.kEff=p.plan.kEff;p.groupsPerPallet=p.plan.groups;p.shifts=p.plan.shifts;p.adjUsed=!!p.plan.adj;p.rowGroups=p.planRow.groups;p.tShift=tSh;
 p.shapes=[...new Set(p.groupsA.map(g=>g.nc+'×'+g.nr))].join(', ');
 p.sheets=sheet?sheetsPerPallet(sheet.mode,p.layers,sheet.everyN):0;
 p.stability=p.interlock?'высокая: слои перевязаны поворотом на 180°':(p.n>1?'низкая: колонны без перевязки — нужны уголки, стрейч или прокладки':'—');return p;}
function sheetAfterLayer(sheet,layer,layers){if(layer>=layers)return false;if(sheet.mode==='between')return true;if(sheet.mode==='everyN')return layer%Math.max(1,sheet.everyN)===0;return false;}
// ======================= ЗАХВАТ =======================
function gripCalc(c,rob,box){
 const g=c.grip,k=g.pick,G=GRIPPERS[g.type],m=box.m*k,vEff=rob.v*c.speedPct/100,a=Math.min(8,vEff/0.25),S=2.0,notes=[];
 const shp=SHAPES[box.shape||'box'],mt=MATS[box.mat||'carton'],fit=gripFit(box,g.type);
 if(fit.n)notes.push(fit.n);
 const R={type:g.type,k,a,S,vEff,status:'ok',tGrip:.5,tRel:.3,air:0,notes};
 R.mass=g.mass>0?g.mass:G.base+k*G.perBox;
 if(G.vac){const cup=CUPS[g.cup];const mu=Math.min(g.type==='foam'?.6:cup.mu,mt.muCap);R.mu=mu;R.shape=shp.name;R.mat=mt.name;
  R.F1=m*(9.81+a)*S;R.F2=m*(9.81+a/mu)*S;R.Fth=Math.max(R.F1,R.F2);R.case=R.F2>R.F1?'горизонтальный перенос (трение)':'вертикальный подъём';
  const vac=Math.min(g.vac,g.type==='foam'?50:cup.vacMax);R.vac=vac;if(g.vac>vac)notes.push(`Уровень вакуума ограничен ${vac} кПа для этого типа: выше картон расслаивается, присоска «проваливается»`);
  if(g.type==='foam'){R.A=0.55*box.l*box.w*k/100*shp.seal;R.Fcap=vac*1000*R.A/1e4;R.qLeak=R.A*mt.leak*0.6;R.Q=Math.max(200,Math.ceil(R.qLeak*1.8/50)*50);R.tGrip=0.25+0.15*k;R.tRel=0.25;R.air=0;R.pump='вакуумный насос/нагнетатель '+f0(R.Q)+' л/мин';
   if(R.Fcap<R.Fth){R.status='bad';notes.push(`Пенной рамке не хватает силы: ${f0(R.Fcap)} Н при площади ${f0(R.A)} см² против ${f0(R.Fth)} Н — снизьте скорость робота, уменьшите число коробок за захват или перейдите на присоски`);}
   else if(R.Fcap<R.Fth*1.2){R.status='warn';notes.push('Запас пенной рамки меньше 20 %: при ослабленном картоне возможны потери');}
   R.mass=g.mass>0?g.mass:G.base+k*G.perBox+R.A*0.004;}
  else{const Fbox=R.Fth/k;let sel=null;const nMin=box.l*box.w>60000?4:2;
   for(const d of(g.cupD>0?[g.cupD]:CUP_D)){const Fcup=vac*1000*Math.PI*Math.pow(d/2000,2);const n=Math.max(nMin,Math.ceil(Fbox*1.1/Fcup));const grid=Math.floor(box.l/(d+25))*Math.floor(box.w/(d+25));const okFit=n<=grid;if(okFit&&(!sel||n<=6&&sel.n>6)){sel={d,Fcup,n,grid};if(n<=6)break;}if(!sel&&g.cupD>0)sel={d,Fcup,n,grid};}
   if(!sel){const d=CUP_D[CUP_D.length-1],Fcup=vac*1000*Math.PI*Math.pow(d/2000,2);sel={d,Fcup,n:Math.max(nMin,Math.ceil(Fbox*1.1/Fcup)),grid:0};}
   R.cupD=sel.d;R.Fcup=sel.Fcup;R.nPerBox=sel.n;R.nCups=sel.n*k;R.Fcap=R.nCups*sel.Fcup;R.cupA=Math.PI*Math.pow(sel.d/20,2);
   const grid2=shp.round?Math.floor(Math.PI*Math.pow(box.l/2-sel.d/2,2)/Math.pow(sel.d+25,2)):sel.grid;
   if(sel.n>Math.max(1,grid2)){R.status='bad';notes.push(`На ${shp.round?'круглой крышке Ø'+box.l:'крышке '+box.l+'×'+box.w} не помещается ${sel.n} присосок Ø${sel.d}: нужна пенная рамка или больший диаметр с меньшим числом`);}
   R.Fcap*=shp.seal;R.qLeak=R.nCups*R.cupA*mt.leak;R.Q=[15,30,60,100,150,200,300,500].find(q=>q>=R.qLeak*2+10)||500;R.pump='эжектор '+R.Q+' л/мин';R.air=Math.round(R.Q*0.6);
   const V=R.nCups*Math.PI*Math.pow(sel.d/2,2)*sel.d/3/1e6+0.3;const Qeff=Math.max(5,R.Q-R.qLeak);R.tGrip=0.15+V/(Qeff/60)*Math.log(101/(101-vac))*1.3;R.tRel=0.15;
   if(g.pressure<4)notes.push('Давление ниже 4 бар: эжектор не выходит на паспортный вакуум, время захвата растёт');
   R.mass=g.mass>0?g.mass:G.base+k*G.perBox+R.nCups*0.12;}
  if(box.m*k>40&&g.type==='cups')notes.push('Тяжёлые коробки на присосках: рассмотрите вилочный/клещевой захват или пенную рамку с прижимом');}
 else if(g.type==='mag'){R.Fth=m*(9.81+a)*S;R.case='магнитное притяжение через полюса';
  const t=box.shape==='plate'?box.h:Math.min(box.h,8);
  R.pMag=0.8*clamp(t/5,0.15,1);R.Amag=box.l*box.w*0.45*k;R.Fcap=R.pMag*R.Amag;
  R.tGrip=.3;R.tRel=.45;R.air=0;R.pump='электропостоянный магнит, импульс намагничивания';
  notes.push(`Электропостоянный магнит: держит ${f2(R.pMag)} Н/мм² при толщине ${f0(t)} мм, на тонком металле усилие падает пропорционально. Нужен импульс размагничивания, иначе остаточное поле тянет соседнюю деталь.`);
  R.mass=g.mass>0?g.mass:G.base+k*G.perBox;}
 else if(g.type==='clamp'){const mu=.4;R.Fth=m*(9.81+a)*S/(2*mu);R.case='зажим с боков, удержание трением';R.cylD=[32,40,50,63,80,100,125].find(d=>g.pressure*1e5*Math.PI*Math.pow(d/2000,2)>=R.Fth)||125;R.Fcap=g.pressure*1e5*Math.PI*Math.pow(R.cylD/2000,2);R.tGrip=.4;R.tRel=.3;R.air=Math.round(2*Math.PI*Math.pow(R.cylD/2000,2)*0.1*(g.pressure+1)*1000*8);R.pump='пневмоцилиндр Ø'+R.cylD;
  notes.push('Зажим с боков требует зазора между коробками на паллете ≈ 20–30 мм и не подходит для мягких коробок');}
 else{R.Fth=m*(9.81+a);R.case='подхват снизу';R.Fcap=R.Fth*3;R.tGrip=.6;R.tRel=.5;R.pump='пневмоцилиндры вилок и прижима';R.air=60;notes.push('Вилочный захват требует конвейера с провалом под коробкой (зона вил) и зазора при укладке');}
 if(fit.s==='bad')R.status='bad';else if(fit.s==='warn'&&R.status==='ok')R.status='warn';
 R.fit=fit.s;R.best=gripBest(box);
 if(c.exch.in==='robot')notes.push('Робот берёт паллеты из стопки: на захвате нужны откидные крюки/вилки под паллету (+6 кг) и вакуумная зона под лист');
 R.util=R.Fth/(R.Fcap||1);if(R.status==='ok'&&R.util>.95)R.status='warn';if(c.exch.in==='robot'&&g.mass===0)R.mass+=6;return R;}
// ======================= КОНВЕЙЕР =======================
function convCalc(cv,b,k){
 const T=CONV_TYPES[cv.type],zoneLen=b.l+150,zones=Math.max(1,Math.floor(cv.len*1000/zoneLen)),v=cv.speed/60;
 const mLoad=zones*b.m,rollers=cv.len/0.075;
 const F=T.mu*(mLoad+T.mBelt*cv.len)*9.81+(cv.type!=='belt'?0.02*rollers*2.5*9.81:0);
 const P=F*v/0.8,Pm=P*1.5/1000,std=[0.12,0.18,0.25,0.37,0.55,0.75,1.1,1.5,2.2,3,4,5.5];const Pstd=std.find(x=>x>=Pm)||Pm;
 const I=Pstd*1000/(1.732*400*0.8*0.85);const mdrW=zones*50,psuA=Math.ceil(mdrW/24/0.8),psuStd=[5,10,20,40].find(x=>x>=psuA)||psuA;
 const feed=cv.feed==='manual'?cv.rate:cv.feed==='interval'?60/cv.interval:cv.rate;
 return{zones,zoneLen,mLoad,F,P,Pm,Pstd,I,transit:cv.len*1000/(cv.speed*1000/60),capPerMin:cv.speed*1000/zoneLen,feedPerMin:feed,mdrW,psuStd,sensors:(cv.type==='mdr'?zones:(cv.accum?zones+1:2))+(cv.feed!=='manual'?1:0),rollers:Math.round(rollers),kZone:k>1};}
// ======================= КОМПОНОВКА =======================
function layout(c,D){
 const pal=D.pal,nR=c.robots,nPS=c.exch.in==='robot'?1:0,K=c.stations+c.magazines+nPS,ang=SLOT_ANGLES[Math.min(K,6)].slice();
 const veh=vehOf(c),aisle=Math.max(1000,veh.w+700),hw=veh.w/2+100;
 // Раздача углов. При двух роботах позиции, смотрящие на соседа, заперты чужой стопой:
 // туда уходят магазины (их обслуживает человек с листами), а станции и стопка паллет
 // получают внешние углы — к ним подъезжает техника. Робот 2 зеркалит набор.
 let stAng,mgAng,psAng;
 if(nR>1){const ord=ang.slice().sort((a,b)=>a-b);
  stAng=ord.slice(0,c.stations);const rest=ord.slice(c.stations);psAng=rest.slice(0,nPS);mgAng=rest.slice(nPS);}
 else{const ord=ang.slice().sort((a,b)=>Math.abs(b)-Math.abs(a));
  stAng=ord.slice(0,c.stations);const rest=ord.slice(c.stations,K);mgAng=rest.slice(0,c.magazines);psAng=rest.slice(c.magazines);}
 stAng=stAng.slice().sort((a,b)=>a-b);
 let dmin=180;if(K>1){const sA=ang.slice().sort((a,b)=>a-b);for(let i=1;i<sA.length;i++)dmin=Math.min(dmin,sA[i]-sA[i-1]);}
 const Rmin=K>1?(pal.L+150)/(2*Math.sin(dmin/2*Math.PI/180)):0;const R=Math.max(c.slotR,Math.ceil(Rmin/10)*10);
 const half=Math.hypot(pal.W,pal.L)/2;const pitch=2*(R+half)+aisle;const parkD=veh.park;
 const robots=[];for(let i=0;i<nR;i++){const base={x:0,y:i*pitch},sgn=(nR>1&&i>0)?-1:1;const slots=[];
  const mk=(kind,idx,id,a0)=>{const a=a0*sgn,t=a*Math.PI/180,cs=Math.cos(t),sn=Math.sin(t);
   slots.push({kind,idx,id,ang:a,cx:base.x+R*cs,cy:base.y+R*sn,cos:cs,sin:sn,robot:i});};
  stAng.forEach((a,j)=>mk('st',j,STN[i*c.stations+j],a));mgAng.forEach((a,j)=>mk('mg',j,'M'+(i*c.magazines+j+1),a));psAng.forEach((a,j)=>mk('ps',j,'П'+(i+1),a));
  robots.push({i,base,home:{x:-350,y:base.y},slots,convs:[]});}
 c.conveyors.forEach((cv,i)=>{robots[i%nR].convs.push(i);});
 const convs=c.conveyors.map((cv,i)=>{const r=robots[i%nR],j=r.convs.indexOf(i),m=r.convs.length,b=boxOf(c,cv.box);const y=r.base.y+(m===1?0:(j-(m-1)/2)*c.convGap);return{robot:i%nR,y,w:b.w+120,x1:-c.pickDist+b.l/2,x0:-c.pickDist+b.l/2-cv.len*1000,len:cv.len*1000,b,bi:cv.box};});
 const all=robots.flatMap(r=>r.slots);
 let xs=[],ys=[];all.forEach(s=>{xs.push(s.cx-half,s.cx+half);ys.push(s.cy-half,s.cy+half);});convs.forEach(cv=>{ys.push(cv.y-cv.w/2,cv.y+cv.w/2);});
 const F={x0:-(c.pickDist+400),x1:Math.max(...xs)+700,y0:Math.min(...ys)-700,y1:Math.max(...ys)+700};
 // --- маршрут подъезда к каждой позиции ---
 // Кандидаты: радиально к стене; прямо по +X к стене; выход в межроботный проезд и по нему
 // к стене. Берём самый короткий, чей коридор шириной с технику свободен от стоп, роботов
 // и конвейеров. Если свободного нет — позиция помечается заблокированной (предупреждение).
 const obs=all.map(s=>({id:s.id,x:s.cx,y:s.cy,ang:s.ang,hx:pal.W/2,hy:pal.L/2}))
  .concat(robots.map(r=>({id:'R'+r.i,x:r.base.x,y:r.base.y,rad:400})))
  .concat(convs.map((cv,k)=>({id:'CV'+k,x:(cv.x0+cv.x1)/2,y:cv.y,ang:0,hx:cv.len/2,hy:cv.w/2})));
 const clearPath=(pts,skip)=>{for(let k=1;k<pts.length;k++)for(const o of obs){if(o.id===skip)continue;
   if(o.rad!==undefined){if(segCircle(pts[k-1],pts[k],o,hw))return false;}
   else if(segBox(pts[k-1],pts[k],o,hw))return false;}
  return true;};
 const plen=pts=>{let L=0;for(let k=1;k<pts.length;k++)L+=Math.hypot(pts[k].x-pts[k-1].x,pts[k].y-pts[k-1].y);return L;};
 const aisles=[];for(let i=1;i<nR;i++)aisles.push(i*pitch-pitch/2);
 all.forEach(s=>{const c0={x:s.cx,y:s.cy},cand=[];
  const add=pts=>{if(pts.every(Boolean))cand.push([c0].concat(pts));};
  add([rayToRect(F,c0,s.cos,s.sin)]);
  add([rayToRect(F,c0,1,0)]);
  aisles.forEach(ay=>{const turn={x:s.cx,y:ay};add([turn,rayToRect(F,turn,1,0)]);});
  // коридор меряем от кромки паллеты: у самой позиции техника и так стоит вплотную
  const fromEdge=pts=>{const dx=pts[1].x-pts[0].x,dy=pts[1].y-pts[0].y,L=Math.hypot(dx,dy)||1,off=pal.L/2+150;
   return off<L?[{x:pts[0].x+dx/L*off,y:pts[0].y+dy/L*off}].concat(pts.slice(1)):pts.slice(1);};
  const ok=cand.filter(p=>clearPath(fromEdge(p),s.id)).sort((a,b)=>plen(a)-plen(b));
  const best=ok[0]||cand[0]||[c0,{x:F.x1,y:s.cy}];
  s.blocked=!ok.length;s.route=best.slice(1);s.gate=s.route[s.route.length-1];
  const prev=s.route.length>1?s.route[s.route.length-2]:c0;
  const dx=s.gate.x-prev.x,dy=s.gate.y-prev.y,L=Math.hypot(dx,dy)||1;
  s.acc={x:dx/L,y:dy/L};s.park={x:s.gate.x+s.acc.x*parkD,y:s.gate.y+s.acc.y*parkD};});
 const cw=(s,p)=>({x:s.cx+s.cos*p.x-s.sin*p.y,y:s.cy+s.sin*p.x+s.cos*p.y});
 return{R,Rmin,pitch,robots,convs,cw,half,parkD,F,aisle,veh,blocked:all.filter(s=>s.blocked).map(s=>s.id)};}
// ======================= РАСЧЁТ КОНФИГУРАЦИИ =======================
function derive(c,light){
 normalize(c);const rob=robotOf(c),pal=PALLETS[c.pallet]||PALLETS['EUR 1200×800'],safety=safetyMode(c,rob),n=c.conveyors.length,nR=c.robots,k=c.grip.pick;
 const D={rob,pal,safety,n,nR,k};const LY=layout(c,D);D.LY=LY;
 D.tRef=60/(rob.cpm*c.speedPct/100);D.tShift=c.grip.pitch==='adj'?+c.grip.tShift||0:0;
 const stBoxIdx=[],pats={};LY.robots.forEach(r=>r.slots.filter(s=>s.kind==='st').forEach(s=>{const ci=r.convs.length?r.convs[s.idx%r.convs.length]:0;s.conv=ci;s.bi=c.conveyors[ci]?c.conveyors[ci].box:0;stBoxIdx.push(s.bi);if(!pats[s.bi])pats[s.bi]=choosePattern(boxOf(c,s.bi),pal,c.patternMode,c.maxStack,k,c.sheet,c.grip,D.tRef);s.pat=pats[s.bi];}));
 D.pats=pats;D.stations=LY.robots.flatMap(r=>r.slots.filter(s=>s.kind==='st'));D.mags=LY.robots.flatMap(r=>r.slots.filter(s=>s.kind==='mg'));D.stacks=LY.robots.flatMap(r=>r.slots.filter(s=>s.kind==='ps'));
 const usedBoxes=[...new Set(stBoxIdx)].map(i=>boxOf(c,i));const heaviest=usedBoxes.reduce((a,b)=>b.m>a.m?b:a,usedBoxes[0]);
 D.grip=gripCalc(c,rob,heaviest);const gripM=D.grip.mass;D.aMax=D.grip.a;
 D.base=baseCalc(c,D.grip);D.visNeed=VIS_ORDER[Math.max(...D.base.map(x=>VIS_ORDER.indexOf(x.need)))];
 D.visOK=visionOK(c.vision.mode,D.visNeed);D.tVision=(VISION[c.vision.mode]||VISION.none).t;
 let rReq=0,rWhere='';const upd=(d,tag)=>{if(d>rReq){rReq=d;rWhere=tag;}};
 const r0=LY.robots[0];r0.slots.forEach(s=>{if(s.kind==='st'){const p=s.pat,b=boxOf(c,s.bi),zTop=pal.h+p.layers*b.h+c.gripH,zBot=pal.h+b.h+c.gripH;[p.cells,p.cellsB].forEach(cs=>cs.forEach(cell=>{const w=LY.cw(s,cell),dh=Math.hypot(w.x-r0.base.x,w.y-r0.base.y);upd(Math.hypot(dh,zTop-c.baseH),`верхний слой станции ${s.id}`);upd(Math.hypot(dh,zBot-c.baseH),`нижний слой станции ${s.id}`);}));}
  else if(s.kind==='mg')upd(Math.hypot(Math.hypot(s.cx-r0.base.x,s.cy-r0.base.y),pal.h+400+c.gripH-c.baseH),`магазин ${s.id}`);
  else upd(Math.hypot(Math.hypot(s.cx-r0.base.x,s.cy-r0.base.y)+200,pal.h*c.exch.stack+c.gripH-c.baseH),`стопка паллет ${s.id} (верх)`);});
 r0.convs.forEach(ci=>{const cv=LY.convs[ci];upd(Math.hypot(Math.hypot(c.pickDist+(k-1)*(cv.b.l+120)/2,cv.y-r0.base.y),c.convH+cv.b.h+c.gripH-c.baseH),`точка захвата конвейера ${ci+1}${k>1?' (группа '+k+')':''}`);});
 Object.assign(D,{rReq,rWhere,reachMargin:1-rReq/rob.reach});D.reachStatus=D.reachMargin>=.1?'ok':D.reachMargin>=0?'warn':'bad';
 D.mReq=Math.max(heaviest.m*k+gripM,c.exch.in==='robot'?pal.m+gripM:0);D.util=D.mReq/rob.payload;D.payStatus=D.util<=.8?'ok':D.util<=1?'warn':'bad';D.gripM=gripM;D.heaviest=heaviest;
 // такт: план + вертикаль + норматив циклов
 const vEff=rob.v*c.speedPct/100;D.vEff=vEff;const sts0=r0.slots.filter(s=>s.kind==='st');
 const pick0=LY.convs[r0.convs[0]]||{x1:-c.pickDist,y:0};const dAvg=(sts0.map(s=>Math.hypot(s.cx-(-c.pickDist),s.cy-pick0.y)).reduce((a,b)=>a+b,0)/Math.max(1,sts0.length))/1000;
 const pat0=sts0.length?sts0[0].pat:null;const kEff=pat0?pat0.kEff:1;
 // Цикл по фазам: перенос (быстрая вертикаль совмещается с горизонталью) → подвод на
 // пониженной скорости → захват/сброс → отрыв → вертикальный подъём над уложенным слоем.
 const M=c.motion,aM=D.aMax,tJ=+M.tJerk||0,vZ=M.vZ/1000,vPl=M.vPlace/1000,mt=(L,v)=>moveTime(L,v,aM,tJ);
 const lay0=pat0?pat0.layers:1,zPick=c.convH+heaviest.h,zPl=pal.h+lay0/2*heaviest.h+heaviest.h;
 const tXY=mt(dAvg,vEff);D.tAppr=mt(M.hAppr/1000,vPl);D.tClear=mt((heaviest.h+M.hAppr)/1000,vZ);
 D.tCycleModel=Math.max(tXY,mt(Math.abs(zPl-zPick)/1000,vZ))+Math.max(tXY,mt(Math.abs(zPick-zPl-heaviest.h)/1000,vZ))+3*D.tAppr+D.tClear+D.grip.tGrip+D.grip.tRel;
 D.tCycleModel+=D.tVision;D.tCycleNorm=60/(rob.cpm*c.speedPct/100);D.tCycle=Math.max(D.tCycleModel,D.tCycleNorm);D.cpm=60/D.tCycle;
 const vSheet=vEff*c.sheet.speedPct/100,tTurn=Math.max(...sts0.map(s=>Math.abs(s.ang)),0)/M.wSpeed;D.tTurn=tTurn;
 D.tRelSheet=c.sheet.sect*D.grip.tRel;
 D.tSheet=c.magazines>0&&c.sheet.mode!=='none'?Math.max(2*Math.max(mt(LY.R/1000,vSheet),tTurn)+3*D.tAppr+D.tClear+c.sheet.tGrip+D.tRelSheet,D.tCycleNorm):0;
 D.tPallet=c.exch.in==='robot'?Math.max(2*Math.max(mt(LY.R/1000,vEff*0.6),tTurn)+3*D.tAppr+D.tClear+2+1,D.tCycleNorm):0;
 const tEx=c.exch.out==='conveyor'?40:c.exch.out==='amr'?60:90;D.tEx=tEx;
 const cyc=pat0?pat0.groupsPerPallet:1,nSh=pat0?pat0.sheets:0,total=pat0?pat0.total:1;
 D.shiftsPerPallet=pat0?pat0.shifts:0;D.tShiftPallet=D.shiftsPerPallet*D.tShift;D.adjUsed=pat0?!!pat0.adjUsed:false;D.rowGroups=pat0?pat0.rowGroups:cyc;
 D.cyclesPerPallet=cyc+nSh+(c.exch.in==='robot'?1:0);D.tPerPallet=cyc*D.tCycle+D.tShiftPallet+nSh*D.tSheet+D.tPallet+(c.stations===1?tEx:0);
 D.exLoss=c.stations===1?tEx/D.tPerPallet:0;D.tPerBox=D.tPerPallet/total;D.capRobot=3600/D.tPerBox*nR;
 // «чистый» такт без простоя на обмен: в учёте смены ожидание обмена — это Suspended, а не работа,
 // поэтому идеальный такт для OEE берётся без него, иначе производительность упирается в потолок.
 D.tBoxNet=(D.tPerPallet-(c.stations===1?tEx:0))/total;D.capNet=3600/D.tBoxNet*nR;D.kEff=kEff;D.palPerHour=D.capRobot/total;
 D.convs=c.conveyors.map(cv=>convCalc(cv,boxOf(c,cv.box),k));
 D.capFeed=D.convs.reduce((a,x)=>a+x.feedPerMin,0)*60;D.capConv=Math.min(...D.convs.map(x=>x.capPerMin))*60*Math.min(n,nR*Math.ceil(n/nR));
 D.bottleneck=Math.min(D.capRobot,D.capFeed,D.capConv);D.bnName=D.bottleneck===D.capRobot?(nR>1?'роботы':'робот'):D.bottleneck===D.capFeed?(c.conveyors.every(x=>x.feed==='manual')?'подача (ручная загрузка)':'подача коробок'):'конвейер';
 // расходники: листы, паллеты, обмены в час
 D.palletsPerHour=D.bottleneck/total;D.sheetsPerHour=D.palletsPerHour*nSh;D.refillsPerHour=c.magazines>0&&nSh>0?D.sheetsPerHour/(c.sheet.cap*Math.max(1,c.magazines*nR)):0;D.stackHours=c.exch.in==='robot'?c.exch.stack/Math.max(0.01,D.palletsPerHour):0;
 // безопасность
 const Tlc=c.tStop+0.03;let Slc=2000*Tlc+8*(30-14);if(Slc>500)Slc=Math.max(500,1600*Tlc+128);D.Slc=Slc;const Tsc=c.tStop+0.1;D.Ssc=1600*Tsc+(1200-0.4*300);
 D.halfDiag=Math.hypot(heaviest.l*k,heaviest.w)/2;D.rSlow=rob.reach+D.halfDiag+D.Ssc;D.rStop=rob.reach+D.halfDiag+300;
 D.F=LY.F;D.fencePerim=2*((D.F.x1-D.F.x0)+(D.F.y1-D.F.y0));
 D.pl=plCalc(c,D);D.risk=riskCalc(c,D);
 D.warnings=[];const w=D.warnings;
 if(LY.blocked.length)w.push(`Нет свободного подъезда к позици${LY.blocked.length>1?'ям':'и'} ${LY.blocked.join(', ')}: коридор шириной ${f0(LY.veh.w)} мм под ${EXCH_OUT[c.exch.out].toLowerCase()} перекрыт соседними паллетами или конвейером. Уменьшите число позиций вокруг робота, увеличьте радиус расстановки или смените способ вывоза.`);
 if(c.robots>1)w.push(`Проезд между роботами ${f0(LY.aisle)} мм — под ${EXCH_OUT[c.exch.out].toLowerCase()}. Станции вынесены на внешние углы, магазины смотрят в проезд: за листами ходит человек, за паллетами заезжает техника.`);
 if(LY.R>c.slotR)w.push(`Радиус расстановки увеличен до ${f0(LY.R)} мм: при ${c.stations+c.magazines+D.stacks.length/nR} позициях вокруг робота паллеты иначе перекрывались бы.`);
 if(D.reachStatus==='bad')w.push(`Робот не достаёт: ${rWhere} — нужно ${f0(rReq)} мм при досягаемости ${f0(rob.reach)} мм. Уменьшите число позиций или радиус, высоту стопы, либо возьмите робота с большей досягаемостью.`);
 else if(D.reachStatus==='warn')w.push(`Запас по досягаемости меньше 10 % (${rWhere}): на краю зоны кисть теряет ориентацию.`);
 if(D.payStatus==='bad')w.push(`Перегрузка: ${f1(D.mReq)} кг > ${rob.payload} кг${c.exch.in==='robot'&&pal.m+gripM>heaviest.m*k+gripM?' (пустая паллета '+pal.m+' кг + захват)':''}.`);
 else if(D.payStatus==='warn')w.push('Нагрузка выше 80 % грузоподъёмности: проверьте момент инерции захвата и снижение скорости по паспорту.');
 if(D.grip.status==='bad')w.push('Захват не удерживает груз: '+D.grip.notes[0]);
 {const tb=[...new Set(c.boxes.map(b=>b.shape+'|'+b.mat))];
  c.boxes.forEach(b=>{const fi=gripFit(b,c.grip.type);if(fi.s==='ok')return;
   const best=gripBest(b).map(t=>GRIPPERS[t].name.toLowerCase()).join(' или ')||'подхват снизу';
   w.push(`«${b.name}» (${SHAPES[b.shape].name.toLowerCase()}, ${MATS[b.mat].name.toLowerCase()}) и ${GRIPPERS[c.grip.type].name.toLowerCase()}: ${fi.n} Под эту тару просится ${best}.`);});
  if(tb.length>1)w.push(`На комплексе ${tb.length} разных видов тары по форме и материалу — один захват на все не подберёте, закладывайте быстросменную оснастку или отдельные линии.`);}
 if(rob.cls==='cobot'&&heaviest.m*k>10)w.push('Коллаборативный перенос груза тяжелее 10 кг: по ISO/TS 15066 контакт допустим только на низкой скорости; практически — сканер со снижением скорости и частичное ограждение.');
 if(rob.cls!=='cobot'&&c.safety==='cobot')w.push('Промышленный робот без ограждения не допускается — режим переключён на ограждение со световыми завесами.');
 if(D.tCycleModel>D.tCycleNorm)w.push(`Узкое место — геометрия цикла, а не норматив робота: модель даёт ${f1(D.tCycleModel)} с против ${f1(D.tCycleNorm)} с по паспорту. Только подвод и отрыв на ${f0(c.motion.vPlace)} мм/с стоят ${f1(3*D.tAppr)} с. Поднимите скорость подвода, уменьшите высоту точки подхода (${f0(c.motion.hAppr)} мм) или проверьте расстановку.`);
 if(D.tCycleNorm>D.tCycleModel*1.15)w.push(`Такт ограничен нормативом робота ${f1(rob.cpm*c.speedPct/100)} циклов/мин (${f1(D.tCycleNorm)} с), геометрический расчёт даёт ${f1(D.tCycleModel)} с — норматив учитывает подходы, отходы и снижение скорости у паллеты.`);
 Object.values(pats).forEach(p=>{if(p.fill<0.7)w.push(`Слой заполнен на ${f0(p.fill*100)} % (${p.name}) — попробуйте другую паллету или размер коробки.`);if(!p.interlock&&c.patternMode!=='column'&&p.n>1)w.push(`Для этой коробки перевязка невозможна на ${c.pallet}: слои будут колоннами (${p.name}). Стопу держат уголки и стрейч.`);if(p.loss>0)w.push(`Перевязка стоит ${p.loss} коробок в слое (${p.n} вместо ${p.bestN}) — плата за устойчивость.`);if(p.stackH>1800)w.push(`Высота стопы ${f0(p.stackH)} мм > 1800 мм — проверьте устойчивость и ворота склада.`);if(k>1&&p.kEff<k*0.75)w.push(`Групповой захват по ${k}: в схеме укладки только ${f1(p.kEff)} коробки за цикл в среднем — часть ходов будет с неполной группой.`);if(p.planAdj&&!p.adjUsed)w.push(`Регулируемый шаг зон на схеме «${p.name}» не окупается: блоки сократили бы ходы с ${p.rowGroups} до ${p.planAdj.groups} на паллету, но ${p.planAdj.shifts} перестроений по ${f1(p.tShift)} с стоят дороже. Уменьшите время перестроения или оставьте балку с фиксированным шагом.`);if(p.adjUsed)w.push(`Подбор групп по форме слоя («${p.name}»): формы ${p.shapes} — ${p.groupsPerPallet} ходов на паллету вместо ${p.rowGroups} рядами, ценой ${p.shifts} перестроений захвата (${f1(p.shifts*p.tShift)} с).`);if(p.layers!==p.layersAuto&&p.stackH>c.maxStack)w.push(`Заданное число слоёв (${p.layers}) даёт стопу ${f0(p.stackH)} мм — выше лимита ${c.maxStack} мм.`);});
 D.base.forEach(x=>{const n=x.i+1;
  if(x.bulk)w.push(`Конвейер ${n}: тара приходит навалом. Разбор навала (bin picking) — отдельная задача: нужен 3D-сканер, планировщик подхода и проверка столкновений; тренажёр её не моделирует, считайте эту подачу как требующую предварительной раскладки.`);
  if(!x.zOK)w.push(`Конвейер ${n}: тара приходит с переменной высотой (${INFEED[x.cv.infeed].name.toLowerCase()}), а высоту захвата никакие направляющие не задают — робот опустится не туда. Нужно ${VISION['3d'].name.toLowerCase()}.`);
  else if(!x.ok&&!visionOK(c.vision.mode,x.need))w.push(`Конвейер ${n}: после ${ALIGN[x.cv.align].name.toLowerCase()} остаётся разброс ±${f0(x.gx)} мм и ±${f1(x.ga)}° при допуске захвата ±${f0(x.tol.dx)} мм и ±${f1(x.tol.da)}°. Нужно либо центрирование жёстче, либо ${VISION[x.need].name.toLowerCase()}.`);
  else if(!x.ok&&visionOK(c.vision.mode,x.need))w.push(`Конвейер ${n}: направляющие сами не выводят тару в допуск, позу даёт ${VISION[c.vision.mode].name.toLowerCase()} — робот доворачивается по кадру. Такт вырос на ${f2(D.tVision)} с.`);
  if(x.cv.align==='none'&&x.IN.dx>x.tol.dx)w.push(`Конвейер ${n}: направляющих нет, тара приходит с разбросом ±${f0(x.IN.dx)} мм — центрировать нечем.`);});
 if(c.vision.mode!=='none'&&D.visNeed==='none')w.push(`Техническое зрение включено, но направляющие и так выводят тару в допуск захвата. Камера здесь только добавляет ${f2(D.tVision)} с к такту — оставьте её, если нужен контроль или разные артикулы в потоке.`);
 if(D.capFeed<D.capRobot*0.6)w.push(`Узкое место — подача (${f0(D.capFeed)} кор/ч против ${f0(D.capRobot)} у ${nR>1?'роботов':'робота'}): автоматическая подача, второй конвейер или накопитель.`);
 if(n<nR)w.push('Роботов больше, чем конвейеров: у второго робота нет подачи — добавьте конвейер.');
 if(c.magazines===0&&c.sheet.mode!=='none')w.push('Листы заданы, но магазинов нет.');
 if(D.refillsPerHour>2)w.push(`Магазин прокладок на ${c.sheet.cap} листов придётся пополнять ${f1(D.refillsPerHour)} раз в час — увеличьте ёмкость или переходите на замену магазина AMR.`);
 if(c.exch.in==='robot'&&D.stackHours<1)w.push(`Стопки из ${c.exch.stack} паллет хватит на ${f0(D.stackHours*60)} мин — увеличьте стопку или число станций.`);
 if(c.exch.out==='jack'&&D.palletsPerHour>8)w.push(`${f1(D.palletsPerHour)} паллет в час вручную рохлей — оператор будет занят обменом почти постоянно; рассмотрите погрузчик, AMR или конвейер паллет.`);
 if(c.stations===1&&c.exch.out!=='conveyor')w.push(`Одна станция: на каждый обмен паллеты робот простаивает ${f0(tEx)} с (${f0(D.exLoss*100)} % времени). Вторая станция снимает простой.`);
 if(safety==='cobot'&&c.exch.out!=='conveyor')w.push('Обмен паллет в зоне сканеров: при освобождении станции контроллер безопасности переключает набор полей, исключая её сектор — иначе каждая тележка будет останавливать робота.');
 // ISO 12100: опасности, не сведённые мерами к приемлемому риску, и связь с требуемым PL
 {const RK=D.risk;
  RK.bad.forEach(x=>w.push(`Оценка риска, ${x.id} (${x.zone}): ${x.n.charAt(0).toLowerCase()+x.n.slice(1)} — остаточный риск ${RISK_CLS[x.cls]} (${HZ_S[x.res.s].toLowerCase()}). Принятых мер не хватает, нужны дополнительные: либо изменить конструкцию, либо добавить техническое средство, одной инструкцией такой риск не закрывается.`));
  if(PL_ORDER.indexOf(RK.plr)>PL_ORDER.indexOf(D.pl.plr))
   w.push(`Реестр опасностей требует от функций безопасности PL ${RK.plr}, а граф рисков на вкладке «Безопасность и PL» выставлен на PL ${D.pl.plr}. Сведите оценки: параметры S, F и P графа должны отвечать самой тяжёлой опасности, которую закрывает функция.`);}
 // ISO 13849-1: расхождение достигнутого PL с требуемым и нарушенные условия категории
 {const PL=D.pl;
  if(!PL.ccfOK)w.push(`Меры против отказов по общей причине набрали ${PL.ccf} баллов из ${CCF_NEED} обязательных (приложение F ISO 13849-1): для категорий 2, 3 и 4 расчёт PL недействителен, пока порог не набран.`);
  PL.sf.forEach(f=>{const bad=f.res.filter(r=>r.issues.length);
   if(bad.length)w.push(`${f.id} «${f.name}»: подсистем${bad.length>1?'ы':'а'} «${bad.map(r=>r.name).join('», «')}» не даёт PL — ${bad[0].issues[0]}.`);
   else if(!f.ok)w.push(`${f.id} «${f.name}»: достигнут PL ${f.pl}, а по графу рисков требуется PL ${f.plr}. Поднимите категорию, возьмите компоненты с бо́льшим MTTFd или добавьте диагностику.`);});
  if((PL.arch.cat==='3'||PL.arch.cat==='4')&&!c.pl.edm)w.push('Контроль обратной связи контакторов (EDM) выключен: диагностика силовой части падает до 60 %, а по ISO 13849-1 для категорий 3 и 4 отключающие элементы должны контролироваться. Заведите зеркальные контакты на контроллер безопасности.');
  if(PL.arch.ch===1&&PLR_HARD.indexOf(PL.plr)>=0)w.push(`Одноканальная архитектура (${PL.arch.name.split(':')[0].toLowerCase()}) при требуемом PL ${PL.plr}: одиночный отказ приводит к потере функции безопасности. Нужны два канала с диагностикой.`);}
 if(light)return D;
 D.sig=signals(c,D);const cnt=x=>D.sig.filter(s=>s.k===x).length;D.io={DI:cnt('DI'),DO:cnt('DO'),SI:cnt('SI'),SO:cnt('SO'),BUS:cnt('BUS')};D.io.diMod=Math.ceil(D.io.DI*1.2/16);D.io.doMod=Math.ceil(D.io.DO*1.2/16);D.bom=bom(c,D);D.plan=planSKU(c,D);return D;}
// ======================= ПЛАНИРОВЩИК АРТИКУЛОВ =======================
function planSKU(c,D){
 const rows=c.boxes.map((b,i)=>{const p=choosePattern(b,D.pal,c.patternMode,c.maxStack,c.grip.pick,c.sheet,c.grip,D.tCycle);const cyc=p.groupsPerPallet+p.sheets+(c.exch.in==='robot'?1:0);const tPal=b.rate>0?p.total/(b.rate/60):0;
  const tSh=p.shifts*D.tShift/60;return{i,b,p,cyc,tPal,tSh,reqCpm:b.rate>0?cyc/Math.max(0.01,tPal-tSh):0,reqBph:b.rate};});
 const capCpm=D.cpm*c.robots;const pairs=[];const R=rows.filter(r=>r.b.rate>0);
 for(let i=0;i<R.length;i++)for(let j=i+1;j<R.length;j++){const s=R[i].reqCpm+R[j].reqCpm;pairs.push({a:R[i],b:R[j],sum:s,util:s/capCpm});}
 pairs.sort((x,y)=>y.util-x.util);return{rows,capCpm,pairs:pairs.filter(p=>p.util<=1).slice(0,8),bad:pairs.filter(p=>p.util>1).length,sumAll:R.reduce((a,r)=>a+r.reqCpm,0)};}
// ======================= СИГНАЛЫ И СПЕЦИФИКАЦИЯ =======================
function signals(c,D){
 const L=[];const a=(k,t,nm,src,how)=>L.push({k,t,nm,src,how});const disc=c.fieldbus==='Дискретные сигналы',fb=c.fieldbus,safety=D.safety,k=c.grip.pick,ex=c.exch;
 c.conveyors.forEach((cv,i)=>{const n=i+1,cc=D.convs[i];
  a('DI',`B${n}5`,`Коробка на входе конвейера ${n}`,'Фотодатчик рефлекторный, PNP NO','3-пров. 24 В → DI ПЛК');
  a('DI',`B${n}1`,`Коробка в позиции захвата ${n}`,'Фотодатчик рефлекторный, PNP NO','3-пров. → DI; в робот передаётся через ПЛК');
  if(k>1)a('DI',`B${n}2`,`Группа из ${k} коробок собрана в зоне захвата ${n}`,'Фотодатчик на дальней границе зоны','3-пров. → DI');
  if(cv.feed!=='manual'){a('DI',`UP${n}.RQ`,`Подающая машина ${n}: коробка отправлена`,'Сухой контакт упаковщика/накопителя','→ DI');a('DO',`UP${n}.OK`,`Разрешение подачи на конвейер ${n}`,'DO → вход упаковщика','реле развязки');}
 {const bs=D.base[i];if(bs.cv.align==='center'){
   a('DO',`Y${n}C`,`Конвейер ${n}: свести центрирующие прижимы`,'Пневмораспределитель 5/2','DO ПЛК → катушка');
   a('DI',`B${n}C1`,`Конвейер ${n}: прижимы сведены`,'Индуктивный датчик цилиндра','→ DI');
   a('DI',`B${n}C2`,`Конвейер ${n}: прижимы разведены`,'Индуктивный датчик','→ DI: без этого робот не заходит');}}
  if(cv.type==='mdr')a('BUS',`ZC${n}.1…${cc.zones}`,`Зоны мотор-роликов ${n}: датчик, мотор, ошибка`,'Контроллеры зон','Шина зон → шлюз → '+(disc?'Ethernet':fb));
  else{if(cv.accum)for(let z=1;z<=cc.zones;z++)a('DI',`B${n}${10+z}`,`Конвейер ${n}: зона ${z} занята`,'Фотодатчик диффузный','3-пров. → DI');
   if(disc){a('DO',`K${n}1`,`ЧП${n}: пуск вперёд`,'DO → DI1 ЧП','через реле развязки');a('DO',`K${n}2`,`ЧП${n}: фиксированная скорость`,'DO → DI2 ЧП','');a('DI',`ЧП${n}.RDY`,`ЧП${n}: готов / нет аварии`,'Релейный выход ЧП','сухой контакт → DI');}
   else a('BUS',`ЧП${n}`,`ЧП${n}: слово управления/состояния, задание, ток`,`Плата ${fb} в ЧП`,'Ethernet → коммутатор');
   a('SO',`STO${n}`,`ЧП${n}: безопасное отключение момента`,'Клеммы STO A/B','2 канала 24 В от КБ');}});
 D.stations.forEach(s=>{a('DI',`B${s.id}`,`Паллета на станции ${s.id}`,'Фотодатчик диффузный / индуктивный','3-пров. → DI');
  if(ex.out==='conveyor'){a('DI',`B${s.id}x`,`Паллета на выходе станции ${s.id}`,'Фотодатчик','→ DI');a('DI',`B${s.id}m`,`Паллета в диспенсере ${s.id}`,'Фотодатчик','→ DI');a(disc?'DO':'BUS',`ЧП-П${s.id}`,`Конвейер паллет ${s.id}: пуск / состояние`,'ЧП цепного конвейера',disc?'DO → DI ЧП':'Ethernet');a('SO',`STO-П${s.id}`,`ЧП конвейера паллет ${s.id}: STO`,'Клеммы STO','2 канала');}
  else{a('DO',`H${s.id}`,`Лампа «станция ${s.id} освобождена — можно забирать»`,'Сигнальная лампа у проёма','DO → лампа 24 В');a('DI',`SB${s.id}`,`Кнопка «станция ${s.id} освобождена» (готово к работе)`,'Кнопка у проёма','НО контакт → DI');
   if(ex.out==='amr'){a('BUS',`AMR.${s.id}`,`AMR: запрос стыковки / «на позиции» / «убыл» для станции ${s.id}`,'Флот-менеджер AMR (REST/OPC UA/Modbus)','Ethernet → ПЛК');a('DO',`AMR.OK${s.id}`,`Разрешение стыковки AMR к станции ${s.id}`,'DO или слово по шине','→ флот-менеджер');}}});
 D.mags.forEach(m=>{a('DI',`B4.${m.id}`,`Прокладки в магазине ${m.id}`,'Фотодатчик диффузный','→ DI');a('DI',`B4L.${m.id}`,`Мало прокладок в ${m.id} (≤ ${c.sheet.low})`,'Фотодатчик / счётчик ПЛК','предупреждение на HMI, вызов пополнения');a('DO',`H4.${m.id}`,`Лампа «магазин ${m.id} освобождён — можно загружать»`,'Сигнальная лампа у проёма','DO → лампа');
  if(ex.sheetsBy==='person')a('DI',`SB4.${m.id}`,`Кнопка «магазин ${m.id} загружен»`,'Кнопка у проёма магазина','НО → DI');});
 D.stacks.forEach(p=>{a('DI',`B5.${p.id}`,`Стопка паллет ${p.id}: есть паллеты`,'Фотодатчик','→ DI');a('DI',`B5L.${p.id}`,`Стопка паллет ${p.id}: мало (≤ 2)`,'Фотодатчик','→ HMI, вызов пополнения');});
 for(let r=1;r<=c.robots;r++){const p=c.robots>1?`R${r}.`:'';
  if(GRIPPERS[c.grip.type].vac){for(let z=1;z<=k;z++){a('DI',`${p}PS${z}`,`Вакуум достигнут, зона ${z}${k>1?' (коробка '+z+')':''}`,'Вакуумный датчик на эжекторе','PNP → DI ПЛК и DI робота');a('DO',`${p}Y${z}`,`Вакуум ВКЛ, зона ${z}`,'Пневмораспределитель','DO робота или ПЛК → катушка');}a('DO',`${p}YB`,'Сдув (быстрый сброс)','Пневмораспределитель','DO → катушка');}
  else{a('DI',`${p}S_GR1`,'Захват закрыт','Индуктивный датчик цилиндра','→ DI');a('DI',`${p}S_GR2`,'Захват открыт','Индуктивный датчик','→ DI');a('DO',`${p}Y1`,'Захват закрыть/открыть','Пневмораспределитель 5/2','DO → катушка');}
  if(k>1&&c.grip.pitch==='adj'){a('DO',`${p}YG1`,'Зоны захвата: развести в блок','Пневмораспределитель 5/2 на приводе раздвижки','DO робота → катушка');a('DO',`${p}YG2`,'Зоны захвата: собрать в ряд (шаг под конвейер)','Пневмораспределитель 5/2','DO робота → катушка');a('DI',`${p}S_G1`,'Зоны разведены (блок)','Индуктивный датчик на штанге','→ DI: без подтверждения робот не опускает захват');a('DI',`${p}S_G2`,'Зоны собраны в ряд','Индуктивный датчик','→ DI: разрешение на захват с конвейера');}
  if(ex.in==='robot'){a('DO',`${p}YH`,'Крюки паллеты: выпустить/убрать','Пневмораспределитель','DO → катушка');a('DI',`${p}S_H1`,'Крюки паллеты выпущены','Индуктивный датчик','→ DI');}
  a('DI',`${p}PA`,'Давление воздуха в норме','Реле давления на пневмоподготовке','→ DI');
  if(disc){for(let i=1;i<=8;i++)a('DO',`${p}R.DI${i}`,`Робот ${r} DI${i}: ${['пуск программы','стоп','сброс ошибки','№ программы бит 0','№ программы бит 1','группа коробок готова','паллета готова','разрешение движения'][i-1]}`,'Контроллер робота, вход','DO ПЛК → DI робота');
   for(let i=1;i<=8;i++)a('DI',`${p}R.DO${i}`,`Робот ${r} DO${i}: ${['в исходной','программа выполняется','ошибка','захват занят','запрос коробки','слой завершён','паллета завершена','ручной режим'][i-1]}`,'Контроллер робота, выход','DO робота → DI ПЛК');}
  else a('BUS',`${p}ROB`,`Робот ${r}: слова команд/состояния, № программы, счётчики`,`Опция ${fb} в контроллере`,'Ethernet → коммутатор; безопасность — отдельными цепями');
  a('SI',`${p}R.ES`,`Аварийный стоп с пульта обучения робота ${r}`,'Безопасный выход контроллера','2 канала → КБ');
  a('SO',`${p}R.PS`,`Защитная остановка робота ${r}`,'Безопасный вход контроллера','2 канала от КБ');a('SO',`${p}R.EM`,`Аварийный стоп робота ${r}`,'Безопасный вход','2 канала от КБ');
  if(safety==='cobot')a('SO',`${p}R.RS`,`Робот ${r}: снижение скорости (Reduced Mode)`,'Безопасный вход','2 канала от КБ');}
 if(c.vision.mode!=='none')c.conveyors.forEach((cv,i)=>{const n=i+1;
  a('DO',`CAM${n}.TRG`,`Камера ${n}: запуск съёмки`,'Триггер камеры (или фотодатчик напрямую)','DO ПЛК → вход камеры');
  a('DI',`CAM${n}.RDY`,`Камера ${n}: готова / результат получен`,'Выход камеры','→ DI');
  a('BUS',`CAM${n}.POSE`,`Камера ${n}: поза тары (x, y, z, углы) и класс формы`,'Контроллер зрения','Ethernet → ПЛК → робот');
  a('DI',`CAM${n}.ERR`,`Камера ${n}: тара не распознана`,'Выход камеры','→ DI: брак или остановка подачи');});
 ['Пуск','Стоп','Сброс','Запрос доступа','Режим Авто','Режим Ручной','Тест ламп'].forEach((b,i)=>a('DI',`SB${i+1}`,`Кнопка «${b}»`,'Пульт оператора',b==='Стоп'?'НЗ контакт → DI':'НО контакт → DI'));
 [['H1','красная'],['H2','жёлтая'],['H3','зелёная'],['HA','звуковой сигнал']].forEach(x=>a('DO',x[0],`Колонна: ${x[1]}`,'Светосигнальная колонна','DO → лампа 24 В'));
 const est=safety==='fence'?3:2;['пульт','шкаф/ввод','зона обмена паллет'].slice(0,est).forEach((w,i)=>a('SI',`S1.${i+1}`,`Аварийный стоп — ${w}`,'Грибок, 2 НЗ контакта','2 канала → КБ, тест-импульсы'));
 if(safety==='fence'){a('SI','S2','Дверь закрыта (положение)','Замок безопасности, RFID','2 канала → КБ');a('SI','S3','Замок заблокирован','Замок безопасности','2 канала → КБ');a('SO','Q1','Питание замка (удержание)','Катушка замка','24 В от КБ; снимается при остановке');
  c.conveyors.forEach((cv,i)=>{a('SI',`S4.${i+1}`,`Световая завеса входа ${i+1}, OSSD1/2`,'Завеса тип 4, 30 мм','2 канала → КБ');a('SI',`M${i+1}.1/.2`,`Датчики мьютинга завесы ${i+1}`,'2 фотодатчика, T-мьютинг','→ входы мьютинга КБ');});
  D.stations.forEach(s=>{a('SI',`S6${s.id}`,`Световая завеса обмена паллет ${s.id}`,'Завеса тип 4'+(ex.out==='conveyor'?' + мьютинг на выезд':''),'2 канала → КБ');if(ex.out!=='conveyor')a('SO',`MUTE${s.id}`,`Мьютинг/байпас S6${s.id} при освобождённой станции`,'Безопасный выход КБ → вход мьютинга',`логика: станция ${s.id} освобождена И робот не в секторе`);});
  D.mags.forEach(m=>a('SI',`S7.${m.id}`,`Световая завеса проёма магазина ${m.id}`,'Завеса тип 4 (мьютинг при освобождении)','2 канала → КБ'));
  D.stacks.forEach(p=>a('SI',`S8.${p.id}`,`Световая завеса проёма стопки паллет ${p.id}`,'Завеса тип 4','2 канала → КБ'));}
 else{for(let r=1;r<=c.robots;r++){a('SI',`LS${r}.1`,`Сканер ${r}.1: защитное поле (OSSD)`,'Лазерный сканер 275°','2 канала → КБ');a('SI',`LS${r}.2`,`Сканер ${r}.2: защитное поле`,'Лазерный сканер','2 канала → КБ');a('SO',`LS${r}.SET`,`Сканеры ${r}: выбор набора полей (сектор освобождённой станции исключён)`,'Безопасные выходы КБ → входы сканера','2×2 канала');}a('SI','LS.W','Сканеры: поле снижения скорости','Выходы предупреждения','→ КБ → Reduced Mode роботов');}
 a('SI','SB3s','Кнопка сброса цепи безопасности','Пульт вне опасной зоны','1 канал, контроль фронта');
 a('SO','KM1','Главный контактор питания приводов','Контактор с зеркальным контактом','катушка от КБ; обратная связь → КБ');
 return L;}
function bom(c,D){
 const B=[];const a=(g,n,q,p)=>B.push({g,n,q,p});const fence=D.safety==='fence',disc=c.fieldbus==='Дискретные сигналы',nR=c.robots,k=c.grip.pick,G=D.grip,gt=c.grip.type,ex=c.exch;
 const nVfd=D.convs.filter((x,i)=>c.conveyors[i].type!=='mdr').length+(ex.out==='conveyor'?D.stations.length:0);
 const di=D.io.DI,dout=D.io.DO;
 a('Шкаф','Шкаф управления IP54, '+(nVfd>2||nR>1?'800×2000×500':'600×1800×400')+' мм',1,'Все компоненты ниже. Тепловой расчёт: потери ЧП ≈ 3 % мощности + ПЛК/БП');
 a('Шкаф','Вводной выключатель-разъединитель + вводной автомат',1,'Отключение всей ячейки, блокировка замком при ремонте');
 a('Шкаф','УЗИП + сетевой фильтр ЭМС',1,'Защита от перенапряжений; фильтр при длинных кабелях к двигателям');
 a('Шкаф','Контактор главный KM1 с зеркальным контактом',1,'Снятие силового питания приводов от контроллера безопасности');
 a('Шкаф','Блок питания 24 В DC '+(di+dout>60?'20 А':'10 А')+(D.convs.some((x,i)=>c.conveyors[i].type==='mdr')?' + блок 24/48 В для мотор-роликов':''),1,'Логика, датчики, замки, завесы; отдельные группы автоматов');
 a('Шкаф','Автоматы защиты цепей 24 В (ПЛК, датчики, выходы, безопасность)',4,'Локализация КЗ без остановки всей ячейки');
 a('Шкаф','Реле развязки для выходов (лампы, замки, катушки)',Math.ceil(dout*.6),'DO ПЛК не коммутируют индуктивную нагрузку напрямую');
 a('Шкаф','Вентилятор с фильтром + термостат / кондиционер при ЧП ≥ 2,2 кВт',1,'Температура в шкафу ≤ 40 °C');
 a('ПЛК','ПЛК: CPU с портом '+(disc?'Ethernet (для HMI)':c.fieldbus),1,'PackML, счётчики, выбор заданий, обмен с роботами и ЧП'+(ex.out==='amr'?', интерфейс флот-менеджера AMR':''));
 a('ПЛК','Модули дискретных входов 24 В DC, 16 каналов',D.io.diMod,`Всего ${di} DI + 20 % резерв`);
 a('ПЛК','Модули дискретных выходов 24 В DC 0,5 А, 16 каналов',D.io.doMod,`Всего ${dout} DO + 20 % резерв`);
 a('ПЛК','Панель оператора HMI 10", Ethernet',1,'Рецепты укладки, счётчики, аварии, ручной режим');
 a('Безопасность','Контроллер безопасности конфигурируемый, ≥ '+(D.io.SI*2+2)+' безопасных входов, ≥ '+(D.io.SO+1)+' выходов (PL e)',1,'Стопы, завесы/сканеры, замки, STO, защитные стопы роботов, мьютинг/выбор полей по станциям');
 a('Безопасность','Кнопка аварийного стопа грибковая, 2 НЗ',fence?3:2,'Пульт, шкаф, зона обмена паллет');
 a('Безопасность','Кнопка сброса цепи безопасности + пуска',1,'Вне опасной зоны, с обзором ячейки');
 if(fence){a('Безопасность','Ограждение сетчатое h = 2000 мм, периметр ≈ '+f0(D.fencePerim/1000)+' м',1,'ISO 14120 / 13857');
  a('Безопасность','Дверь сервисная с замком безопасности с удержанием (RFID, PL e)',1,'Открыть можно только после остановки: Q1 снимает КБ');
  a('Безопасность','Световая завеса тип 4, 30 мм, высота 900–1200 мм + 2 датчика мьютинга',c.conveyors.length,`Проём конвейера. S ≥ ${f0(D.Slc)} мм до опасной зоны (ISO 13855)`);
  a('Безопасность','Световая завеса тип 4 проёма обмена паллет'+(ex.out==='conveyor'?' с мьютингом на выезд':' + лампа «освобождено» + кнопка «готово»'),D.stations.length,ex.out==='conveyor'?'Паллета выезжает через тоннель':'Проём открыт только для освобождённой станции; робот в это время работает на другой');
  if(D.mags.length)a('Безопасность','Световая завеса тип 4 проёма магазина прокладок + лампа/кнопка',D.mags.length,'Загрузка листов снаружи без входа в ячейку');
  if(D.stacks.length)a('Безопасность','Световая завеса тип 4 проёма стопки паллет',D.stacks.length,'Пополнение стопки погрузчиком');}
 else{a('Безопасность','Лазерный сканер безопасности 275°, 2 поля, ≥ 4 набора полей',2*nR,`Поле снижения скорости ≥ ${f0(D.Ssc)} мм от границы досягаемости (ISO 13855, ISO/TS 15066); переключение наборов по освобождённой станции`);a('Безопасность','Ограждение частичное со стороны склада/проезда',1,'Исключить неконтролируемый подход с тыла');}
 a('Безопасность','Светосигнальная колонна 3 цвета + зуммер',1,'Индикация состояний PackML');
 c.conveyors.forEach((cv,i)=>{const cc=D.convs[i],n=i+1,b=boxOf(c,cv.box);
  if(cv.type==='mdr'){a('Привод',`Конвейер ${n}: мотор-ролики 24 В (${cc.zones} зон по ${f0(cc.zoneLen)} мм)`,cc.zones,'Каждая зона — свой привод; ZPA');a('Привод',`Контроллеры зон конвейера ${n}`,Math.ceil(cc.zones/2),'Логика зон в контроллере, ПЛК видит состояние по шине');a('Привод',`Блок питания 24 В ${cc.psuStd} А для конвейера ${n}`,1,`${cc.zones} × 50 Вт с запасом`);}
  else{a('Привод',`Конвейер ${n}: мотор-редуктор ${cc.Pstd} кВт, 3~400 В`,1,`F = ${f0(cc.F)} Н при ${cc.zones} коробках по ${b.m} кг, v = ${cv.speed} м/мин`);a('Привод',`ЧП ${cc.Pstd} кВт с STO, плата ${disc?'— (дискретно)':c.fieldbus}`,1,`Ток ≈ ${f1(cc.I)} А; U/f, рампы 1–3 с`);if(cv.accum)a('Привод',`Конвейер ${n}: упоры-отсекатели + датчики зон`,cc.zones,'Накопление на одноприводном рольганге');}
  if(k>1)a('Механика',`Конвейер ${n}: зона сбора группы из ${k} коробок с торцевым упором`,1,`Длина зоны ${f0(k*(b.l+20))} мм; коробки собираются вплотную для группового захвата`);
  if(cv.feed!=='manual')a('Механика',`Интерфейс подачи от упаковочной машины / накопителя, конвейер ${n}`,1,`Автоподача: ${cv.feed==='interval'?'каждые '+cv.interval+' с':cv.rate+' кор/мин'}; сигналы «готов принять» / «коробка отправлена»`);
  a('Датчики',`Фотоэлектрические датчики конвейера ${n}`,cc.sensors,'PNP NO; рефлекторные на проходе, диффузные на зонах');
  {const bs=D.base[i];if(bs.cv.align!=='none'){
   a('Механика',`Конвейер ${n}: ${ALIGN[bs.cv.align].name.toLowerCase()}`,1,`Сужающиеся боковые планки${bs.cv.align!=='guides'?', торцевой упор':''}${bs.cv.align==='center'?', пневмоприжимы центрирования':''}; остаточная погрешность ±${f0(bs.AL.dx)} мм и ±${f1(bs.AL.da)}°`);
   if(bs.cv.align==='center'){a('Привод',`Центрирующие прижимы конвейера ${n}: пневмоцилиндры с датчиками`,2,'Дожим тары к оси перед захватом');
    a('Датчики',`Датчики положения прижимов ${n}`,4,'Подтверждение «сведено / разведено» для ПЛК');}}}
  a('Механика',`${CONV_TYPES[cv.type].name}, L = ${cv.len} м, ширина ${b.w+120} мм`,1,`Шаг роликов 75 мм (${cc.rollers} шт.), концевой упор в зоне захвата`);});
 if(ex.out==='conveyor')a('Привод','Цепной конвейер паллет с диспенсером (магазин 15 паллет), 0,75 кВт + ЧП с STO',D.stations.length,'Автоматический обмен паллет');
 else{a('Механика','Стол/направляющие паллеты с центрирующими упорами'+(ex.out==='jack'?' и заездными пандусами под рохлю':''),D.stations.length,'Повторяемость позиции ±10 мм');
  if(ex.out==='amr')a('Логистика','AMR грузоподъёмностью ≥ '+f0(Math.max(...Object.values(D.pats).map(p=>p.mass))*1.1)+' кг с подъёмной платформой или вилами + флот-менеджер, зарядная станция',1,`${f1(D.palletsPerHour)} паллет/ч; маршрут станция → склад → стопка пустых паллет`);
  if(ex.out==='forklift')a('Логистика','Погрузчик/штабелёр (существующий парк), разметка проезда, отбойники у проёмов',1,`${f1(D.palletsPerHour)} паллет/ч — загрузка водителя ${f0(D.palletsPerHour*4)} мин/ч`);}
 a('Датчики','Датчик наличия паллеты на станции',D.stations.length,'Диффузный ФЭ или индуктивный на упоре');
 if(D.mags.length){a('Механика',`Магазин прокладочных листов на ${c.sheet.cap} листов (стол/рама с направляющими, датчики наличия и уровня)`,D.mags.length,ex.sheetsBy==='amr'?'Магазин на паллете — заменяется AMR целиком':'Загрузка снаружи через проём; лист берётся тем же захватом');a('Датчики','Датчики магазина прокладок: наличие + нижний уровень',2*D.mags.length,'Вызов пополнения при ≤ '+c.sheet.low+' листах, Suspended при пустом');}
 if(D.stacks.length)a('Механика',`Стопка пустых паллет на ${c.exch.stack} шт. с направляющими и датчиками`,D.stacks.length,`Хватает на ${f1(D.stackHours)} ч; пополняется погрузчиком через проём`);
 a('Робот',`${D.rob.name} (${D.rob.ex||'параметры пользователя'}) с контроллером и пультом`,nR,`Требуемая досягаемость ${f0(D.rReq)} мм из ${f0(D.rob.reach)}; нагрузка ${f1(D.mReq)} из ${D.rob.payload} кг; ${f1(D.cpm)} циклов/мин`);
 a('Робот',`Постамент h = ${c.baseH} мм с анкерами`,nR,'По верхнему и нижнему слою стопы');
 if(GRIPPERS[gt].vac){if(gt==='cups')a('Робот',`Захват на присосках ${f1(G.mass)} кг: ${G.nCups} × Ø${G.cupD} ${CUPS[c.grip.cup].name.toLowerCase()}, ${k} вакуумных зон${ex.in==='robot'?' + крюки под паллету':''}`,nR,`F требуемая ${f0(G.Fth)} Н (${G.case}), F захвата ${f0(G.Fcap)} Н при −${G.vac} кПа`);
  else a('Робот',`Пенная вакуумная рамка ${f1(G.mass)} кг, площадь ${f0(G.A)} см², ${k} зон${ex.in==='robot'?' + крюки под паллету':''}`,nR,`F требуемая ${f0(G.Fth)} Н, F захвата ${f0(G.Fcap)} Н при −${G.vac} кПа`);
  if(k>1&&c.grip.pitch==='adj')a('Робот',`Механизм раздвижки зон захвата: телескопические штанги ${k} зон, привод пневмо, датчики крайних положений`,nR,`Перестроение ряд ↔ блок за ${f1(c.grip.tShift)} с; формы групп ${Object.values(D.pats).map(x=>x.shapes).join(' / ')}`);
  a('Робот',`Вакуумный источник: ${G.pump}, ${k} шт. + вакуумные датчики PS1…PS${k}, клапаны, сдув`,nR,`Утечка через картон ≈ ${f0(G.qLeak)} л/мин; расход воздуха ≈ ${f0(G.air)} л/мин при ${c.grip.pressure} бар; захват за ${f2(G.tGrip)} с`);}
 else if(gt==='clamp')a('Робот',`Клещевой захват ${f1(G.mass)} кг: 2 × цилиндр Ø${G.cylD}, губки с резиной`,nR,`Усилие зажима ${f0(G.Fth)} Н при ${c.grip.pressure} бар, μ = 0,4`);
 else a('Робот',`Вилочный захват ${f1(G.mass)} кг с прижимом сверху`,nR,'Подхват снизу — не зависит от состояния картона');
 a('Робот','Пневмоподготовка: фильтр-регулятор, клапан мягкого пуска и сброса, реле давления',nR,'Сброс давления при аварийном стопе по оценке риска');
 if(c.vision.mode!=='none'){const V=VISION[c.vision.mode],n2=c.conveyors.length;
  a('Зрение',`${V.name}`,n2,`Погрешность позы ±${f0(V.dx)} мм и ±${f1(V.da)}°, кадр ${f2(V.t)} с`);
  a('Зрение','Объектив и светофильтр под рабочее расстояние',n2,'Подбирается по полю зрения и глубине резкости');
  a('Зрение',c.vision.mode==='struct'?'Проектор структурированного света':'Осветитель светодиодный (кольцевой или на просвет)',n2,c.vision.mode==='struct'?'Прозрачная и блестящая тара: обычная стереопара не находит текстуру':'Стабильная освещённость важнее мегапикселей');
  a('Зрение','Контроллер зрения или ПК с ПО',1,'Выдаёт позу и класс формы роботу по Ethernet');
  a('Зрение','Калибровочная мишень hand-eye',1,'Привязка системы координат камеры к базе робота; повторять после ударов и ремонта');}
 a('Сеть','Коммутатор промышленный Ethernet '+(nR>1||nVfd>3?'16':'8')+' портов',1,'ПЛК, HMI, роботы, ЧП, шлюзы'+(ex.out==='amr'?', флот-менеджер AMR (Wi-Fi через точку доступа)':''));
 a('Сеть','Кабели: силовые экранированные, сигнальные 24 В, Ethernet',1,'Разделение трасс ≥ 100 мм, экран 360° на вводе');
 return B;}
// ======================= ОПТИМИЗАТОР =======================
function optimize(c){
 const base=deep(c),res=[];const robs=ROBOTS.filter(r=>r.id!=='custom'&&(c.opt.allowCobot||r.cls!=='cobot'));const vac=GRIPPERS[c.grip.type].vac;
 for(const r of robs)for(let nR=1;nR<=c.opt.maxRobots;nR++)for(let k=1;k<=(vac?4:1);k++)for(const pitch of(vac&&k>1?['fixed','adj']:['fixed']))for(let st=1;st<=Math.max(2,c.stations);st++){
  const t=deep(base);t.robot=r.id;t.robots=nR;t.grip.pick=k;t.grip.pitch=pitch;t.grip.mass=0;t.stations=st;t.safety='auto';while(t.conveyors.length<nR)t.conveyors.push(deep(t.conveyors[0]));
  const D=derive(t,true);const feas=D.reachStatus!=='bad'&&D.payStatus!=='bad'&&D.grip.status!=='bad';const meets=D.bottleneck>=c.opt.target;
  const cost=r.cost*nR+k*0.15+(pitch==='adj'?0.25:0)+st*0.12*nR+(D.safety==='fence'?0.5:0.7)+t.conveyors.length*0.3;
  res.push({t,D,feas,meets,cost,r,nR,k,st,pitch});}
 const good=res.filter(x=>x.feas&&x.meets).sort((a,b)=>a.cost-b.cost||b.D.bottleneck-a.D.bottleneck);
 if(good.length)return{ok:true,best:good[0],alts:good.slice(1,4)};
 const f=res.filter(x=>x.feas).sort((a,b)=>b.D.bottleneck-a.D.bottleneck);return{ok:false,best:f[0]||null,alts:f.slice(1,4)};}
// ======================= АЛГОРИТМ РАБОТЫ (ТЕКСТ) =======================
function algoText(c,D){
 const nR=c.robots,k=c.grip.pick,fence=D.safety==='fence',sts=D.stations,pat=sts[0].pat,b=D.heaviest,G=D.grip,vac=GRIPPERS[c.grip.type].vac,ex=c.exch,sh=c.sheet;
 const feedTxt=c.conveyors.map((cv,i)=>cv.feed==='manual'?`на конвейер ${i+1} коробки кладёт оператор (в среднем ${cv.rate} в минуту)`:cv.feed==='interval'?`на конвейер ${i+1} коробки подаёт упаковочная машина каждые ${cv.interval} с`:`на конвейер ${i+1} коробки подаёт упаковочная машина, ${cv.rate} в минуту`).join('; ');
 const stList=sts.map(s=>s.id).join(', ');
 const gripTxt=vac?`${c.grip.type==='cups'?`${G.nCups} присосок Ø${G.cupD} мм`:`пенная рамка площадью ${f0(G.A)} см²`} создают разрежение ${G.vac} кПа. Датчик вакуума подтверждает, что коробка держится, только после этого робот поднимает её.`:c.grip.type==='clamp'?`губки сжимают коробку с боков с усилием ${f0(G.Fth)} Н, датчики на цилиндре подтверждают закрытие.`:`вилки заходят под коробку, прижим сверху фиксирует её.`;
 const shTail=` Лист не сбрасывается: робот несёт его с сохранением ориентации, доворачивает кистью по стороне паллеты (${f0(c.motion.wSpeed)} °/с) и после касания сбрасывает вакуум по ${c.sheet.sect} секциям за ${f2(D.tRelSheet)} с, чтобы лист не парусил и не сползал.`;
 const sheetTxt=sh.mode==='none'?'':(sh.mode==='bottom'?'Перед первой коробкой робот кладёт на пустую паллету один прокладочный лист.':sh.mode==='between'?'Между каждым слоем робот кладёт прокладочный лист.':`Через каждые ${sh.everyN} слоя робот кладёт прокладочный лист.`)+shTail;
 const outTxt=ex.out==='conveyor'?'паллета уезжает по цепному конвейеру, диспенсер подаёт пустую':ex.out==='amr'?`ПЛК отправляет заявку флот-менеджеру, AMR подъезжает к проёму станции, ${fence?'завеса проёма переводится в мьютинг':'сектор станции исключается из поля сканера'}, тележка забирает паллету и увозит на склад${ex.in==='vehicle'?', затем привозит пустую':''}`:ex.out==='forklift'?`загорается лампа «освобождено», водитель погрузчика забирает паллету через проём${ex.in==='vehicle'?' и ставит пустую':''}, нажимает кнопку «готово»`:`загорается лампа «освобождено», оператор рохлей вывозит паллету через проём${ex.in==='vehicle'?' и закатывает пустую':''}, нажимает кнопку «готово»`;
 const inTxt=ex.in==='robot'?` Пустую паллету робот сам берёт из стопки (${ex.stack} шт.) крюками на захвате и ставит на станцию — это отдельный цикл.`:'';
 const sheetsBy=sh.mode==='none'?'':ex.sheetsBy==='amr'?`Когда листов остаётся ${sh.low}, ПЛК вызывает AMR: он привозит паллету с ${sh.cap} листами и меняет магазин целиком.`:`Когда листов остаётся ${sh.low}, загорается лампа у проёма магазина: оператор докладывает листы до ${sh.cap} снаружи, не заходя в ячейку; робот в это время к магазину не обращается.`;
 return `<h3>Что делает комплекс</h3><p>${nR>1?'Два робота':'Робот'} ${nR>1?'снимают':'снимает'} коробки «${b.name}» (${b.l}×${b.w}×${b.h} мм, ${b.m} кг) с ${c.conveyors.length>1?'конвейеров':'конвейера'} и ${nR>1?'укладывают':'укладывает'} их на паллеты ${c.pallet}: по ${pat.n} в слое, ${pat.layers} слоёв, всего ${pat.total} коробок и ${f0(pat.mass)} кг на паллете. ${k>1?`За один ход берётся до ${k} коробок сразу. `:''}На паллету уходит ${D.cyclesPerPallet} циклов робота (${pat.groupsPerPallet} ходов с коробками${pat.sheets?` + ${pat.sheets} с листами`:''}${ex.in==='robot'?' + 1 с паллетой':''}), это ${f1(D.tPerPallet/60)} мин. Расчётная производительность — ${f0(D.bottleneck)} коробок в час (${f1(D.bottleneck/pat.total)} паллеты в час); ограничивает её ${D.bnName}.</p>
<h3>Кто участвует</h3><ul><li><b>Конвейер${c.conveyors.length>1?'ы':''} подачи</b> — ${feedTxt}. Датчик на входе видит новую коробку, датчик у упора — что коробка доехала до зоны захвата${k>1?`, ещё один датчик — что собралась группа из ${k}`:''}.</li>
<li><b>${nR>1?'Роботы':'Робот'}</b> (${D.rob.name}) — ${nR>1?'каждый':''} стоит на постаменте ${c.baseH} мм между конвейером и ${sts.length>1?'станциями':'станцией'} ${stList}. Работает на ${c.speedPct} % от максимальной скорости, ${f1(D.cpm)} циклов в минуту${sh.mode!=='none'?`; с листом идёт медленнее (${sh.speedPct} %)`:''}.</li>
<li><b>Захват</b> — ${GRIPPERS[c.grip.type].name.toLowerCase()}: ${gripTxt}</li>
<li><b>Станции паллет</b> ${stList}${nR>1?` (по ${c.stations} у каждого робота)`:''} — обмен: ${EXCH_OUT[ex.out].toLowerCase()}${ex.in==='robot'?', пустые паллеты — из стопки роботом':''}.</li>
${sh.mode!=='none'?`<li><b>Магазин${D.mags.length>1?'ы':''} прокладок</b> на ${sh.cap} листов — ${SHEETS_BY[ex.sheetsBy].toLowerCase()}.</li>`:''}
<li><b>Шкаф управления</b> — ПЛК ведёт последовательность и считает коробки, контроллер безопасности следит за ${fence?'дверью, завесами и стопами':'сканерами и стопами'}, панель оператора показывает, что происходит.</li></ul>
<h3>Начало смены</h3><ol><li>Оператор включает питание, проверяет, что ${fence?'дверь закрыта и в проёмах никого нет':'рядом с ячейкой никого нет'}, ставит ${ex.in==='robot'?'стопку пустых паллет':ex.out==='conveyor'?'паллеты в диспенсер':'пустые паллеты на станции'}${sh.mode!=='none'?' и листы в магазин':''}.</li><li>Нажимает «Сброс»: ${nR>1?'роботы возвращаются':'робот возвращается'} в исходное положение, приводы получают разрешение, жёлтая лампа — ячейка готова.</li><li>Нажимает «Пуск»: конвейер${c.conveyors.length>1?'ы':''} разгоня${c.conveyors.length>1?'ются':'ется'}, зелёная лампа, ячейка работает.</li></ol>
<h3>Рабочий цикл</h3><ol>${ex.in==='robot'?`<li>Если станция пуста, робот берёт из стопки паллету и ставит на станцию.</li>`:''}${sh.mode==='bottom'?`<li>${sheetTxt}</li>`:''}<li>Коробка попадает на конвейер${fence?', проходит через световую завесу (датчики мьютинга понимают, что это коробка, а не рука) и':' и'} доезжает до упора в зоне захвата.</li>
<li>${k>1?`Конвейер собирает у упора группу из ${k} коробок вплотную друг к другу. `:''}ПЛК проверяет: есть ли станция с паллетой, которая не заполнена, и не нужна ли ей сейчас прокладка. Если всё в порядке — даёт роботу команду «взять».</li>
<li>Робот подходит к зоне захвата, снижаясь к точке подхода в ${f0(c.motion.hAppr)} мм над коробкой, дальше опускается на ${f0(c.motion.vPlace)} мм/с, ${vac?`включает вакуум и ждёт подтверждения от датчика (около ${f2(G.tGrip)} с)`:'закрывает захват и ждёт датчик'} и отрывает груз строго вверх — на той же пониженной скорости, чтобы присоски успели сесть. Затем переносит ${k>1?'группу':'коробку'} на паллету, доворачивая кисть по стороне слоя на ходу.${D.adjUsed?` Коробки приходят по конвейеру в один ряд, а слою нужны блоки ${pat.shapes}: на переносе захват разводит зоны в блок, после укладки собирает обратно в ряд под шаг конвейера — по ${f1(c.grip.tShift)} с на перестроение, ${D.shiftsPerPallet} перестроений на паллету.`:''}</li>
<li>Место на паллете задаёт схема укладки «${pat.name}»: ${pat.interlock?'каждый следующий слой повёрнут на 180°, поэтому стыки коробок не совпадают и стопа перевязана':'слои одинаковые (колонны), поэтому стопу дополнительно фиксируют уголками и стрейч-плёнкой'}. Над местом робот встаёт в точке подхода, опускается последние ${f0(c.motion.hAppr)} мм на ${f0(c.motion.vPlace)} мм/с и касается слоя — груз не роняется с высоты; ${vac?'сбрасывает вакуум (сдув)':'раскрывает захват'} и поднимается строго вертикально на ${f0(D.heaviest.h+c.motion.hAppr)} мм, чтобы не задеть только что уложенное, и лишь потом отходит в сторону. Разгон и торможение — по S-образному профилю с нарастанием ускорения за ${f2(c.motion.tJerk)} с: при резком старте тара едет в захвате.</li>
<li>Когда слой заполнен (${pat.n} коробок), счётчик слоёв увеличивается на единицу. ${sh.mode==='between'||sh.mode==='everyN'?sheetTxt+' Лист робот несёт на '+sh.speedPct+' % скорости — он большой и лёгкий, иначе срывается.':''}</li>
<li>После ${pat.layers}-го слоя паллета готова: ПЛК включает зелёную мигающую лампу для этой станции, ${outTxt}.${inTxt} ${sts.length>1?`Робот в это время работает на другой станции, поэтому ячейка не останавливается.`:'На это время робот ждёт.'}${ex.auto?' Обмен запускается автоматически, без команды оператора.':' Обмен запускает оператор.'}</li></ol>
<h3>Что происходит, если…</h3><ul><li><b>Нет коробок</b> — робот ждёт в исходном положении, ячейка в работе (Execute). Через минуту простоя на панели появляется подсказка.</li>
<li><b>Нет свободной паллеты${sh.mode!=='none'?' или кончились листы':''}</b> — ячейка переходит в Suspended (ожидание материала), жёлтая лампа, конвейер продолжает накапливать коробки. Как только паллету поставили${sh.mode!=='none'?' или магазин пополнили':''}, работа продолжается сама.</li>
${sh.mode!=='none'?`<li><b>Листы заканчиваются</b> — ${sheetsBy}</li>`:''}
<li><b>${fence?'Кто-то просунул руку в завесу или зашёл в проём станции, которая не освобождена':'Человек вошёл в защитное поле сканера'}</b> — защитная остановка: ${nR>1?'роботы тормозят':'робот тормозит'} за ${c.tStop} с, конвейер по рампе, потом снимается питание приводов. ${fence?'Продолжить можно только кнопкой «Сброс» с пульта, когда зона свободна.':'Когда человек вышел, ячейка перезапускается сама — зона полностью просматривается сканерами.'}${!fence?' Если человек только приблизился (поле предупреждения), робот не останавливается, а замедляется до безопасной скорости.':''} Проём освобождённой станции ${fence?'в мьютинге':'исключён из поля'} — там работать безопасно, робот туда не пойдёт, пока не нажата кнопка «готово».</li>
<li><b>${vac?'Коробка оторвалась (пропал вакуум)':'Захват не подтвердил закрытие'}, заклинил ролик конвейера, ошибка робота</b> — ячейка переходит в Held (внутренний отказ), красная лампа, на панели — причина. Оператор устраняет, нажимает «Сброс» и «Пуск».</li>
<li><b>Аварийный стоп</b> — всё обесточивается мгновенно. После отпускания кнопки: «Сброс» два раза (квитирование и возврат роботов в исходную), затем «Пуск».</li>
${fence?'<li><b>Нужно войти в ячейку</b> — кнопка «Запрос доступа»: робот заканчивает перенос, возвращается в исходную, конвейер останавливается, и только тогда замок отпускает дверь.</li>':''}</ul>
<h3>Обязанности оператора за смену</h3><ul><li>${c.conveyors.every(x=>x.feed==='manual')?'Класть коробки на конвейер, не заходя за завесу.':'Следить за подачей от упаковочной машины.'}</li><li>${ex.out==='jack'?'Вывозить готовые паллеты рохлей и закатывать пустые':ex.out==='forklift'?'Вызывать погрузчик или самому менять паллеты':ex.out==='amr'?'Следить за работой AMR и зарядкой':'Следить за конвейером паллет и диспенсером'}${sh.mode!=='none'?(ex.sheetsBy==='person'?', докладывать листы в магазин':', следить за заменой магазина AMR'):''}, реагировать на жёлтую и красную лампу.</li><li>В конце смены — «Стоп», дождаться Stopped, снять готовые паллеты, выключить питание.</li></ul>
<h3>Цифры для проверки</h3><p>Цикл робота ${f1(D.tCycle)} с (${f1(D.cpm)} циклов/мин)${sh.mode!=='none'?`, цикл с листом ${f1(D.tSheet)} с`:''}${ex.in==='robot'?`, цикл с паллетой ${f1(D.tPallet)} с`:''}. На паллету ${D.cyclesPerPallet} циклов и ${f1(D.tPerPallet/60)} мин → ${f1(D.tPerBox)} с на коробку → ${f0(D.capRobot)} коробок в час у ${nR>1?'роботов':'робота'}. Подача даёт ${f0(D.capFeed)} в час, конвейер пропускает ${f0(D.capConv)}. Паллет в час ${f1(D.palletsPerHour)}${sh.mode!=='none'?`, листов в час ${f0(D.sheetsPerHour)}, пополнений магазина ${f1(D.refillsPerHour)} в час`:''}. За смену 8 ч при готовности 85 % — ${f0(D.bottleneck*8*0.85)} коробок, ${f0(D.bottleneck*8*0.85/pat.total)} паллет.</p>`;}
