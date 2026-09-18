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
const BOX_PRESETS=[{name:'Малая',l:300,w:200,h:150,m:3,rate:0,layers:0},{name:'Средняя',l:400,w:300,h:250,m:8,rate:0,layers:0},{name:'Крупная',l:600,w:400,h:300,m:15,rate:0,layers:0},{name:'Тяжёлая',l:500,w:350,h:200,m:22,rate:0,layers:0},
 {name:'М5П',l:300,w:200,h:105,m:5,rate:900,layers:11},{name:'М12_УП',l:334,w:215,h:196,m:12,rate:458,layers:7},{name:'С180',l:381,w:206,h:145,m:9,rate:400,layers:7},{name:'М180',l:306,w:246,h:143,m:9,rate:400,layers:4},{name:'С450',l:326,w:264,h:123,m:8.1,rate:379,layers:4},{name:'М20П',l:377,w:250,h:242,m:20,rate:275,layers:4},{name:'М8',l:335,w:204,h:150,m:7.5,rate:267,layers:7},{name:'Б380',l:357,w:258,h:136,m:6.08,rate:263,layers:9},{name:'МС2',l:392,w:294,h:109,m:10,rate:140,layers:10},{name:'МС10',l:314,w:152,h:243,m:10,rate:240,layers:5}];
const PALLETS={'EUR 1200×800':{L:1200,W:800,h:144,m:25},'FIN 1200×1000':{L:1200,W:1000,h:144,m:30},'1000×1000':{L:1000,W:1000,h:150,m:28},'1100×1100':{L:1100,W:1100,h:150,m:30}};
const CONV_TYPES={belt:{name:'Ленточный (гладкое полотно, один привод)',mu:.30,mBelt:8,vfd:true},roller:{name:'Рольганг приводной (цепной/ремённый, один привод)',mu:.06,mBelt:0,vfd:true},mdr:{name:'Рольганг на мотор-роликах 24 В (ZPA, привод в каждой зоне)',mu:.06,mBelt:0,vfd:false}};
const FIELDBUS=['PROFINET','EtherNet/IP','Modbus TCP','Дискретные сигналы'];
const GRIPPERS={cups:{name:'Вакуумный на присосках',vac:true,base:3.5,perBox:0.8},foam:{name:'Вакуумная пенная рамка (площадной)',vac:true,base:5,perBox:2.5},clamp:{name:'Клещевой (пневмозажим с боков)',vac:false,base:10,perBox:4},fork:{name:'Вилочный (подхват снизу + прижим)',vac:false,base:12,perBox:5}};
const CUPS={bellows:{name:'Сильфонная, 1,5 складки',mu:.5,vacMax:60,note:'компенсирует неровности и наклон картона'},flat:{name:'Плоская',mu:.5,vacMax:80,note:'гладкие жёсткие поверхности; на картоне течёт'},flatrib:{name:'Плоская с рёбрами (высокое трение)',mu:.7,vacMax:80,note:'горизонтальные ускорения при быстрых переносах'},oval:{name:'Овальная',mu:.5,vacMax:60,note:'узкие рёбра жёсткости, длинные коробки'}};
const FEEDS={manual:'Ручная (оператор кладёт)',interval:'Автомат: коробка каждые N секунд',rate:'Автомат: N коробок в минуту'};
const SHEET_MODES={none:'Без листов',bottom:'Один лист на поддоне (снизу)',between:'Лист между каждым слоем',everyN:'Лист через каждые N слоёв'};
const EXCH_OUT={jack:'Человек с рохлей (ручная гидравлическая тележка)',forklift:'Погрузчик (кар)',amr:'Роботизированная тележка (AMR/AGV)',conveyor:'Цепной конвейер паллет + диспенсер'};
const EXCH_IN={vehicle:'Та же тележка привозит пустую паллету',robot:'Робот берёт пустую паллету из стопки (магазин паллет)',dispenser:'Диспенсер на конвейере паллет'};
const SHEETS_BY={person:'Человек докладывает листы в магазин',amr:'AMR привозит паллету с листами (замена магазина целиком)'};
const AGENT={person:{v:1.0,lift:2,name:'человек'},jack:{v:0.8,lift:4,name:'человек с рохлей'},forklift:{v:1.5,lift:3,name:'погрузчик'},amr:{v:1.0,lift:5,name:'AMR'}};
const CUP_D=[30,40,50,60,80,100,125];
const SLOT_ANGLES={1:[0],2:[-90,90],3:[-90,0,90],4:[-90,-30,30,90],5:[-90,-45,0,45,90],6:[-90,-54,-18,18,54,90]};
const STN='ABCDEFGH';
const DEF={robots:1,robot:'cb20',custom:{payload:10,reach:1300,cls:'cobot',cpm:8},speedPct:100,
 grip:{type:'cups',cup:'bellows',cupD:0,vac:60,pressure:5,pick:1,mass:0},gripH:250,baseH:800,
 pallet:'EUR 1200×800',maxStack:1300,stations:2,magazines:1,patternMode:'interlock',slotR:950,pickDist:850,convH:700,convGap:900,
 sheet:{mode:'between',everyN:2,cap:20,low:3,speedPct:60,tGrip:1.0},
 exch:{out:'jack',in:'vehicle',sheetsBy:'person',auto:true,reaction:20,stack:8},
 boxes:[{name:'Средняя',l:400,w:300,h:250,m:8,rate:0,layers:0}],
 conveyors:[{type:'roller',len:3,speed:12,accum:true,box:0,feed:'manual',interval:10,rate:6}],
 palletHandling:'forklift',safety:'fence',fieldbus:'PROFINET',tStop:0.5,opt:{target:400,allowCobot:true,maxRobots:2}};
let CFG=deep(DEF);
try{const s=JSON.parse(localStorage.getItem('pal-sim-cfg4')||'null');if(s&&s.boxes&&s.conveyors&&s.grip&&s.exch){CFG=Object.assign(deep(DEF),s);CFG.sheet=Object.assign(deep(DEF.sheet),s.sheet||{});CFG.exch=Object.assign(deep(DEF.exch),s.exch||{});CFG.boxes.forEach(b=>{if(b.rate===undefined)b.rate=0;if(b.layers===undefined)b.layers=0;});}}catch(e){}
function saveCfg(){try{localStorage.setItem('pal-sim-cfg4',JSON.stringify(CFG));}catch(e){}}
function robotOf(c){const r=ROBOTS.find(x=>x.id===c.robot)||ROBOTS[3];if(r.id==='custom')return{id:'custom',name:'Свой робот',cls:c.custom.cls,payload:+c.custom.payload,reach:+c.custom.reach,v:c.custom.cls==='cobot'?1:2,cpm:+c.custom.cpm||8,cost:2,ex:''};return r;}
function safetyMode(c,rob){if(rob.cls!=='cobot')return'fence';return c.safety==='auto'?'cobot':c.safety;}
function boxOf(c,i){return c.boxes[i]||c.boxes[0];}
function boxColor(i){return['var(--box)','var(--box2)','var(--box3)','var(--box4)'][i%4];}
function normalize(c){if(c.exch.out==='conveyor')c.exch.in='dispenser';else if(c.exch.in==='dispenser')c.exch.in='vehicle';c.palletHandling=c.exch.out==='conveyor'?'conveyor':'forklift';
 const extra=(c.exch.in==='robot'?1:0);if(c.stations+c.magazines+extra>6)c.magazines=Math.max(0,6-c.stations-extra);if(c.sheet.mode==='none')c.magazines=0;if(c.sheet.mode!=='none'&&c.magazines===0)c.magazines=1;
 if(!GRIPPERS[c.grip.type].vac)c.grip.pick=1;while(c.conveyors.length<c.robots)c.conveyors.push(deep(c.conveyors[0]));return c;}
function sheetsPerPallet(mode,layers,N){return mode==='none'?0:mode==='bottom'?1:mode==='between'?Math.max(0,layers-1):Math.floor((layers-1)/Math.max(1,N));}
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
function makeGroups(cells,k,l){
 const along=c=>c.rot?c.y:c.x,perp=c=>c.rot?c.x:c.y;const idx=cells.map((c,i)=>i).sort((a,b)=>cells[a].rot-cells[b].rot||perp(cells[a])-perp(cells[b])||along(cells[a])-along(cells[b]));
 const groups=[];let run=[];const flush=()=>{for(let i=0;i<run.length;i+=k)groups.push(run.slice(i,i+k));run=[];};
 for(const i of idx){const c=cells[i];if(run.length){const p=cells[run[run.length-1]];if(!(c.rot===p.rot&&Math.abs(perp(c)-perp(p))<1&&Math.abs(along(c)-along(p)-l)<2))flush();}run.push(i);}flush();return groups;}
function choosePattern(b,pal,mode,maxStack,k,sheet){
 const C=genPatterns(b,pal);const byN=(x,y)=>y.n-x.n||(y.interlock-x.interlock);const best=Math.max(...C.map(c=>c.n));let pick;
 if(mode==='column')pick=C.filter(c=>c.name.startsWith('Сетка')).sort(byN)[0];
 else if(mode==='interlock'){pick=C.filter(c=>c.interlock).sort(byN)[0]||C.slice().sort(byN)[0];}
 else pick=C.slice().sort(byN)[0];
 const p={...pick};const auto=Math.max(1,Math.floor((maxStack-pal.h)/b.h));p.layers=b.layers>0?b.layers:auto;p.layersAuto=auto;p.total=p.n*p.layers;p.stackH=pal.h+p.layers*b.h;p.mass=p.total*b.m+pal.m;p.fill=p.n*b.l*b.w/(pal.W*pal.L);p.bestN=best;p.loss=best-p.n;
 p.cellsB=p.interlock?p.cells.map(c=>({x:-c.x,y:-c.y,rot:c.rot})):p.cells;p.groupsA=makeGroups(p.cells,k,b.l);p.groupsB=makeGroups(p.cellsB,k,b.l);
 p.kEff=p.n/p.groupsA.length;let g=0;for(let j=0;j<p.layers;j++)g+=(p.interlock&&j%2?p.groupsB:p.groupsA).length;p.groupsPerPallet=g;
 p.sheets=sheet?sheetsPerPallet(sheet.mode,p.layers,sheet.everyN):0;
 p.stability=p.interlock?'высокая: слои перевязаны поворотом на 180°':(p.n>1?'низкая: колонны без перевязки — нужны уголки, стрейч или прокладки':'—');return p;}
function sheetAfterLayer(sheet,layer,layers){if(layer>=layers)return false;if(sheet.mode==='between')return true;if(sheet.mode==='everyN')return layer%Math.max(1,sheet.everyN)===0;return false;}
// ======================= ЗАХВАТ =======================
function gripCalc(c,rob,box){
 const g=c.grip,k=g.pick,G=GRIPPERS[g.type],m=box.m*k,vEff=rob.v*c.speedPct/100,a=Math.min(8,vEff/0.25),S=2.0,notes=[];
 const R={type:g.type,k,a,S,vEff,status:'ok',tGrip:.5,tRel:.3,air:0,notes};
 R.mass=g.mass>0?g.mass:G.base+k*G.perBox;
 if(G.vac){const cup=CUPS[g.cup];const mu=g.type==='foam'?.6:cup.mu;
  R.F1=m*(9.81+a)*S;R.F2=m*(9.81+a/mu)*S;R.Fth=Math.max(R.F1,R.F2);R.case=R.F2>R.F1?'горизонтальный перенос (трение)':'вертикальный подъём';
  const vac=Math.min(g.vac,g.type==='foam'?50:cup.vacMax);R.vac=vac;if(g.vac>vac)notes.push(`Уровень вакуума ограничен ${vac} кПа для этого типа: выше картон расслаивается, присоска «проваливается»`);
  if(g.type==='foam'){R.A=0.55*box.l*box.w*k/100;R.Fcap=vac*1000*R.A/1e4;R.qLeak=R.A*0.15;R.Q=Math.max(200,Math.ceil(R.qLeak*1.8/50)*50);R.tGrip=0.25+0.15*k;R.tRel=0.25;R.air=0;R.pump='вакуумный насос/нагнетатель '+f0(R.Q)+' л/мин';
   if(R.Fcap<R.Fth){R.status='bad';notes.push(`Пенной рамке не хватает силы: ${f0(R.Fcap)} Н при площади ${f0(R.A)} см² против ${f0(R.Fth)} Н — снизьте скорость робота, уменьшите число коробок за захват или перейдите на присоски`);}
   else if(R.Fcap<R.Fth*1.2){R.status='warn';notes.push('Запас пенной рамки меньше 20 %: при ослабленном картоне возможны потери');}
   R.mass=g.mass>0?g.mass:G.base+k*G.perBox+R.A*0.004;}
  else{const Fbox=R.Fth/k;let sel=null;const nMin=box.l*box.w>60000?4:2;
   for(const d of(g.cupD>0?[g.cupD]:CUP_D)){const Fcup=vac*1000*Math.PI*Math.pow(d/2000,2);const n=Math.max(nMin,Math.ceil(Fbox*1.1/Fcup));const grid=Math.floor(box.l/(d+25))*Math.floor(box.w/(d+25));const okFit=n<=grid;if(okFit&&(!sel||n<=6&&sel.n>6)){sel={d,Fcup,n,grid};if(n<=6)break;}if(!sel&&g.cupD>0)sel={d,Fcup,n,grid};}
   if(!sel){const d=CUP_D[CUP_D.length-1],Fcup=vac*1000*Math.PI*Math.pow(d/2000,2);sel={d,Fcup,n:Math.max(nMin,Math.ceil(Fbox*1.1/Fcup)),grid:0};}
   R.cupD=sel.d;R.Fcup=sel.Fcup;R.nPerBox=sel.n;R.nCups=sel.n*k;R.Fcap=R.nCups*sel.Fcup;R.cupA=Math.PI*Math.pow(sel.d/20,2);
   if(sel.n>sel.grid){R.status='bad';notes.push(`На крышке ${box.l}×${box.w} не помещается ${sel.n} присосок Ø${sel.d}: нужна пенная рамка или больший диаметр с меньшим числом`);}
   R.qLeak=R.nCups*R.cupA*0.25;R.Q=[15,30,60,100,150,200,300,500].find(q=>q>=R.qLeak*2+10)||500;R.pump='эжектор '+R.Q+' л/мин';R.air=Math.round(R.Q*0.6);
   const V=R.nCups*Math.PI*Math.pow(sel.d/2,2)*sel.d/3/1e6+0.3;const Qeff=Math.max(5,R.Q-R.qLeak);R.tGrip=0.15+V/(Qeff/60)*Math.log(101/(101-vac))*1.3;R.tRel=0.15;
   if(g.pressure<4)notes.push('Давление ниже 4 бар: эжектор не выходит на паспортный вакуум, время захвата растёт');
   R.mass=g.mass>0?g.mass:G.base+k*G.perBox+R.nCups*0.12;}
  if(box.m*k>40&&g.type==='cups')notes.push('Тяжёлые коробки на присосках: рассмотрите вилочный/клещевой захват или пенную рамку с прижимом');}
 else if(g.type==='clamp'){const mu=.4;R.Fth=m*(9.81+a)*S/(2*mu);R.case='зажим с боков, удержание трением';R.cylD=[32,40,50,63,80,100,125].find(d=>g.pressure*1e5*Math.PI*Math.pow(d/2000,2)>=R.Fth)||125;R.Fcap=g.pressure*1e5*Math.PI*Math.pow(R.cylD/2000,2);R.tGrip=.4;R.tRel=.3;R.air=Math.round(2*Math.PI*Math.pow(R.cylD/2000,2)*0.1*(g.pressure+1)*1000*8);R.pump='пневмоцилиндр Ø'+R.cylD;
  notes.push('Зажим с боков требует зазора между коробками на паллете ≈ 20–30 мм и не подходит для мягких коробок');}
 else{R.Fth=m*(9.81+a);R.case='подхват снизу';R.Fcap=R.Fth*3;R.tGrip=.6;R.tRel=.5;R.pump='пневмоцилиндры вилок и прижима';R.air=60;notes.push('Вилочный захват требует конвейера с провалом под коробкой (зона вил) и зазора при укладке');}
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
 const ord=ang.slice().sort((a,b)=>Math.abs(b)-Math.abs(a));const stAng=ord.slice(0,c.stations).sort((a,b)=>a-b),rest=ord.slice(c.stations,K);const mgAng=rest.slice(0,c.magazines),psAng=rest.slice(c.magazines);
 let dmin=180;if(K>1){const s=ang.slice().sort((a,b)=>a-b);for(let i=1;i<s.length;i++)dmin=Math.min(dmin,s[i]-s[i-1]);}
 const Rmin=K>1?(pal.L+150)/(2*Math.sin(dmin/2*Math.PI/180)):0;const R=Math.max(c.slotR,Math.ceil(Rmin/10)*10);
 const half=Math.hypot(pal.W,pal.L)/2;const pitch=2*(R+half)+500;const parkD=half+700+1000;
 const robots=[];for(let i=0;i<nR;i++){const base={x:0,y:i*pitch};const slots=[];
  const mk=(kind,idx,id,a)=>{const t=a*Math.PI/180,cs=Math.cos(t),sn=Math.sin(t);slots.push({kind,idx,id,ang:a,cx:base.x+R*cs,cy:base.y+R*sn,cos:cs,sin:sn,robot:i,park:{x:base.x+(R+parkD)*cs,y:base.y+(R+parkD)*sn},gate:{x:base.x+(R+pal.W/2+350)*cs,y:base.y+(R+pal.W/2+350)*sn}});};
  stAng.forEach((a,j)=>mk('st',j,STN[i*c.stations+j],a));mgAng.forEach((a,j)=>mk('mg',j,'M'+(i*c.magazines+j+1),a));psAng.forEach((a,j)=>mk('ps',j,'П'+(i+1),a));
  robots.push({i,base,home:{x:-350,y:base.y},slots,convs:[]});}
 c.conveyors.forEach((cv,i)=>{robots[i%nR].convs.push(i);});
 const convs=c.conveyors.map((cv,i)=>{const r=robots[i%nR],j=r.convs.indexOf(i),m=r.convs.length,b=boxOf(c,cv.box);const y=r.base.y+(m===1?0:(j-(m-1)/2)*c.convGap);return{robot:i%nR,y,w:b.w+120,x1:-c.pickDist+b.l/2,x0:-c.pickDist+b.l/2-cv.len*1000,len:cv.len*1000,b,bi:cv.box};});
 const cw=(s,p)=>({x:s.cx+s.cos*p.x-s.sin*p.y,y:s.cy+s.sin*p.x+s.cos*p.y});
 return{R,Rmin,pitch,robots,convs,cw,half,parkD};}
// ======================= РАСЧЁТ КОНФИГУРАЦИИ =======================
function derive(c,light){
 normalize(c);const rob=robotOf(c),pal=PALLETS[c.pallet]||PALLETS['EUR 1200×800'],safety=safetyMode(c,rob),n=c.conveyors.length,nR=c.robots,k=c.grip.pick;
 const D={rob,pal,safety,n,nR,k};const LY=layout(c,D);D.LY=LY;
 const stBoxIdx=[],pats={};LY.robots.forEach(r=>r.slots.filter(s=>s.kind==='st').forEach(s=>{const ci=r.convs.length?r.convs[s.idx%r.convs.length]:0;s.conv=ci;s.bi=c.conveyors[ci]?c.conveyors[ci].box:0;stBoxIdx.push(s.bi);if(!pats[s.bi])pats[s.bi]=choosePattern(boxOf(c,s.bi),pal,c.patternMode,c.maxStack,k,c.sheet);s.pat=pats[s.bi];}));
 D.pats=pats;D.stations=LY.robots.flatMap(r=>r.slots.filter(s=>s.kind==='st'));D.mags=LY.robots.flatMap(r=>r.slots.filter(s=>s.kind==='mg'));D.stacks=LY.robots.flatMap(r=>r.slots.filter(s=>s.kind==='ps'));
 const usedBoxes=[...new Set(stBoxIdx)].map(i=>boxOf(c,i));const heaviest=usedBoxes.reduce((a,b)=>b.m>a.m?b:a,usedBoxes[0]);
 D.grip=gripCalc(c,rob,heaviest);const gripM=D.grip.mass;
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
 D.tCycleModel=2*(dAvg/vEff+0.4)+2*(0.4/vEff)+D.grip.tGrip+D.grip.tRel+0.6;D.tCycleNorm=60/(rob.cpm*c.speedPct/100);D.tCycle=Math.max(D.tCycleModel,D.tCycleNorm);D.cpm=60/D.tCycle;
 const vSheet=vEff*c.sheet.speedPct/100;D.tSheet=c.magazines>0&&c.sheet.mode!=='none'?Math.max(2*(LY.R/1000/vSheet+0.4)+c.sheet.tGrip+0.5+0.6,D.tCycleNorm):0;
 D.tPallet=c.exch.in==='robot'?Math.max(2*(LY.R/1000/(vEff*0.6)+0.5)+2+1+0.6,D.tCycleNorm):0;
 const tEx=c.exch.out==='conveyor'?40:c.exch.out==='amr'?60:90;D.tEx=tEx;
 const cyc=pat0?pat0.groupsPerPallet:1,nSh=pat0?pat0.sheets:0,total=pat0?pat0.total:1;
 D.cyclesPerPallet=cyc+nSh+(c.exch.in==='robot'?1:0);D.tPerPallet=cyc*D.tCycle+nSh*D.tSheet+D.tPallet+(c.stations===1?tEx:0);
 D.exLoss=c.stations===1?tEx/D.tPerPallet:0;D.tPerBox=D.tPerPallet/total;D.capRobot=3600/D.tPerBox*nR;D.kEff=kEff;D.palPerHour=D.capRobot/total;
 D.convs=c.conveyors.map(cv=>convCalc(cv,boxOf(c,cv.box),k));
 D.capFeed=D.convs.reduce((a,x)=>a+x.feedPerMin,0)*60;D.capConv=Math.min(...D.convs.map(x=>x.capPerMin))*60*Math.min(n,nR*Math.ceil(n/nR));
 D.bottleneck=Math.min(D.capRobot,D.capFeed,D.capConv);D.bnName=D.bottleneck===D.capRobot?(nR>1?'роботы':'робот'):D.bottleneck===D.capFeed?(c.conveyors.every(x=>x.feed==='manual')?'подача (ручная загрузка)':'подача коробок'):'конвейер';
 // расходники: листы, паллеты, обмены в час
 D.palletsPerHour=D.bottleneck/total;D.sheetsPerHour=D.palletsPerHour*nSh;D.refillsPerHour=c.magazines>0&&nSh>0?D.sheetsPerHour/(c.sheet.cap*Math.max(1,c.magazines*nR)):0;D.stackHours=c.exch.in==='robot'?c.exch.stack/Math.max(0.01,D.palletsPerHour):0;
 // безопасность
 const Tlc=c.tStop+0.03;let Slc=2000*Tlc+8*(30-14);if(Slc>500)Slc=Math.max(500,1600*Tlc+128);D.Slc=Slc;const Tsc=c.tStop+0.1;D.Ssc=1600*Tsc+(1200-0.4*300);
 D.halfDiag=Math.hypot(heaviest.l*k,heaviest.w)/2;D.rSlow=rob.reach+D.halfDiag+D.Ssc;D.rStop=rob.reach+D.halfDiag+300;
 let xs=[],ys=[];LY.robots.forEach(r=>r.slots.forEach(s=>{xs.push(s.cx-LY.half,s.cx+LY.half);ys.push(s.cy-LY.half,s.cy+LY.half);}));LY.convs.forEach(cv=>{ys.push(cv.y-cv.w/2,cv.y+cv.w/2);});
 D.F={x0:-(c.pickDist+400),x1:Math.max(...xs)+700,y0:Math.min(...ys)-700,y1:Math.max(...ys)+700};D.fencePerim=2*((D.F.x1-D.F.x0)+(D.F.y1-D.F.y0));
 D.warnings=[];const w=D.warnings;
 if(LY.R>c.slotR)w.push(`Радиус расстановки увеличен до ${f0(LY.R)} мм: при ${c.stations+c.magazines+D.stacks.length/nR} позициях вокруг робота паллеты иначе перекрывались бы.`);
 if(D.reachStatus==='bad')w.push(`Робот не достаёт: ${rWhere} — нужно ${f0(rReq)} мм при досягаемости ${f0(rob.reach)} мм. Уменьшите число позиций или радиус, высоту стопы, либо возьмите робота с большей досягаемостью.`);
 else if(D.reachStatus==='warn')w.push(`Запас по досягаемости меньше 10 % (${rWhere}): на краю зоны кисть теряет ориентацию.`);
 if(D.payStatus==='bad')w.push(`Перегрузка: ${f1(D.mReq)} кг > ${rob.payload} кг${c.exch.in==='robot'&&pal.m+gripM>heaviest.m*k+gripM?' (пустая паллета '+pal.m+' кг + захват)':''}.`);
 else if(D.payStatus==='warn')w.push('Нагрузка выше 80 % грузоподъёмности: проверьте момент инерции захвата и снижение скорости по паспорту.');
 if(D.grip.status==='bad')w.push('Захват не удерживает груз: '+D.grip.notes[0]);
 if(rob.cls==='cobot'&&heaviest.m*k>10)w.push('Коллаборативный перенос груза тяжелее 10 кг: по ISO/TS 15066 контакт допустим только на низкой скорости; практически — сканер со снижением скорости и частичное ограждение.');
 if(rob.cls!=='cobot'&&c.safety==='cobot')w.push('Промышленный робот без ограждения не допускается — режим переключён на ограждение со световыми завесами.');
 if(D.tCycleNorm>D.tCycleModel*1.15)w.push(`Такт ограничен нормативом робота ${f1(rob.cpm*c.speedPct/100)} циклов/мин (${f1(D.tCycleNorm)} с), геометрический расчёт даёт ${f1(D.tCycleModel)} с — норматив учитывает подходы, отходы и снижение скорости у паллеты.`);
 Object.values(pats).forEach(p=>{if(p.fill<0.7)w.push(`Слой заполнен на ${f0(p.fill*100)} % (${p.name}) — попробуйте другую паллету или размер коробки.`);if(!p.interlock&&c.patternMode!=='column'&&p.n>1)w.push(`Для этой коробки перевязка невозможна на ${c.pallet}: слои будут колоннами (${p.name}). Стопу держат уголки и стрейч.`);if(p.loss>0)w.push(`Перевязка стоит ${p.loss} коробок в слое (${p.n} вместо ${p.bestN}) — плата за устойчивость.`);if(p.stackH>1800)w.push(`Высота стопы ${f0(p.stackH)} мм > 1800 мм — проверьте устойчивость и ворота склада.`);if(k>1&&p.kEff<k*0.75)w.push(`Групповой захват по ${k}: в схеме укладки только ${f1(p.kEff)} коробки за цикл в среднем — часть ходов будет с неполной группой.`);if(p.layers!==p.layersAuto&&p.stackH>c.maxStack)w.push(`Заданное число слоёв (${p.layers}) даёт стопу ${f0(p.stackH)} мм — выше лимита ${c.maxStack} мм.`);});
 if(D.capFeed<D.capRobot*0.6)w.push(`Узкое место — подача (${f0(D.capFeed)} кор/ч против ${f0(D.capRobot)} у ${nR>1?'роботов':'робота'}): автоматическая подача, второй конвейер или накопитель.`);
 if(n<nR)w.push('Роботов больше, чем конвейеров: у второго робота нет подачи — добавьте конвейер.');
 if(c.magazines===0&&c.sheet.mode!=='none')w.push('Листы заданы, но магазинов нет.');
 if(D.refillsPerHour>2)w.push(`Магазин прокладок на ${c.sheet.cap} листов придётся пополнять ${f1(D.refillsPerHour)} раз в час — увеличьте ёмкость или переходите на замену магазина AMR.`);
 if(c.exch.in==='robot'&&D.stackHours<1)w.push(`Стопки из ${c.exch.stack} паллет хватит на ${f0(D.stackHours*60)} мин — увеличьте стопку или число станций.`);
 if(c.exch.out==='jack'&&D.palletsPerHour>8)w.push(`${f1(D.palletsPerHour)} паллет в час вручную рохлей — оператор будет занят обменом почти постоянно; рассмотрите погрузчик, AMR или конвейер паллет.`);
 if(c.stations===1&&c.exch.out!=='conveyor')w.push(`Одна станция: на каждый обмен паллеты робот простаивает ${f0(tEx)} с (${f0(D.exLoss*100)} % времени). Вторая станция снимает простой.`);
 if(safety==='cobot'&&c.exch.out!=='conveyor')w.push('Обмен паллет в зоне сканеров: при освобождении станции контроллер безопасности переключает набор полей, исключая её сектор — иначе каждая тележка будет останавливать робота.');
 if(light)return D;
 D.sig=signals(c,D);const cnt=x=>D.sig.filter(s=>s.k===x).length;D.io={DI:cnt('DI'),DO:cnt('DO'),SI:cnt('SI'),SO:cnt('SO'),BUS:cnt('BUS')};D.io.diMod=Math.ceil(D.io.DI*1.2/16);D.io.doMod=Math.ceil(D.io.DO*1.2/16);D.bom=bom(c,D);D.plan=planSKU(c,D);return D;}
// ======================= ПЛАНИРОВЩИК АРТИКУЛОВ =======================
function planSKU(c,D){
 const rows=c.boxes.map((b,i)=>{const p=choosePattern(b,D.pal,c.patternMode,c.maxStack,c.grip.pick,c.sheet);const cyc=p.groupsPerPallet+p.sheets+(c.exch.in==='robot'?1:0);const tPal=b.rate>0?p.total/(b.rate/60):0;
  return{i,b,p,cyc,tPal,reqCpm:b.rate>0?cyc/tPal:0,reqBph:b.rate};});
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
  if(ex.in==='robot'){a('DO',`${p}YH`,'Крюки паллеты: выпустить/убрать','Пневмораспределитель','DO → катушка');a('DI',`${p}S_H1`,'Крюки паллеты выпущены','Индуктивный датчик','→ DI');}
  a('DI',`${p}PA`,'Давление воздуха в норме','Реле давления на пневмоподготовке','→ DI');
  if(disc){for(let i=1;i<=8;i++)a('DO',`${p}R.DI${i}`,`Робот ${r} DI${i}: ${['пуск программы','стоп','сброс ошибки','№ программы бит 0','№ программы бит 1','группа коробок готова','паллета готова','разрешение движения'][i-1]}`,'Контроллер робота, вход','DO ПЛК → DI робота');
   for(let i=1;i<=8;i++)a('DI',`${p}R.DO${i}`,`Робот ${r} DO${i}: ${['в исходной','программа выполняется','ошибка','захват занят','запрос коробки','слой завершён','паллета завершена','ручной режим'][i-1]}`,'Контроллер робота, выход','DO робота → DI ПЛК');}
  else a('BUS',`${p}ROB`,`Робот ${r}: слова команд/состояния, № программы, счётчики`,`Опция ${fb} в контроллере`,'Ethernet → коммутатор; безопасность — отдельными цепями');
  a('SI',`${p}R.ES`,`Аварийный стоп с пульта обучения робота ${r}`,'Безопасный выход контроллера','2 канала → КБ');
  a('SO',`${p}R.PS`,`Защитная остановка робота ${r}`,'Безопасный вход контроллера','2 канала от КБ');a('SO',`${p}R.EM`,`Аварийный стоп робота ${r}`,'Безопасный вход','2 канала от КБ');
  if(safety==='cobot')a('SO',`${p}R.RS`,`Робот ${r}: снижение скорости (Reduced Mode)`,'Безопасный вход','2 канала от КБ');}
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
  a('Робот',`Вакуумный источник: ${G.pump}, ${k} шт. + вакуумные датчики PS1…PS${k}, клапаны, сдув`,nR,`Утечка через картон ≈ ${f0(G.qLeak)} л/мин; расход воздуха ≈ ${f0(G.air)} л/мин при ${c.grip.pressure} бар; захват за ${f2(G.tGrip)} с`);}
 else if(gt==='clamp')a('Робот',`Клещевой захват ${f1(G.mass)} кг: 2 × цилиндр Ø${G.cylD}, губки с резиной`,nR,`Усилие зажима ${f0(G.Fth)} Н при ${c.grip.pressure} бар, μ = 0,4`);
 else a('Робот',`Вилочный захват ${f1(G.mass)} кг с прижимом сверху`,nR,'Подхват снизу — не зависит от состояния картона');
 a('Робот','Пневмоподготовка: фильтр-регулятор, клапан мягкого пуска и сброса, реле давления',nR,'Сброс давления при аварийном стопе по оценке риска');
 a('Сеть','Коммутатор промышленный Ethernet '+(nR>1||nVfd>3?'16':'8')+' портов',1,'ПЛК, HMI, роботы, ЧП, шлюзы'+(ex.out==='amr'?', флот-менеджер AMR (Wi-Fi через точку доступа)':''));
 a('Сеть','Кабели: силовые экранированные, сигнальные 24 В, Ethernet',1,'Разделение трасс ≥ 100 мм, экран 360° на вводе');
 return B;}
// ======================= ОПТИМИЗАТОР =======================
function optimize(c){
 const base=deep(c),res=[];const robs=ROBOTS.filter(r=>r.id!=='custom'&&(c.opt.allowCobot||r.cls!=='cobot'));const vac=GRIPPERS[c.grip.type].vac;
 for(const r of robs)for(let nR=1;nR<=c.opt.maxRobots;nR++)for(let k=1;k<=(vac?4:1);k++)for(let st=1;st<=Math.max(2,c.stations);st++){
  const t=deep(base);t.robot=r.id;t.robots=nR;t.grip.pick=k;t.grip.mass=0;t.stations=st;t.safety='auto';while(t.conveyors.length<nR)t.conveyors.push(deep(t.conveyors[0]));
  const D=derive(t,true);const feas=D.reachStatus!=='bad'&&D.payStatus!=='bad'&&D.grip.status!=='bad';const meets=D.bottleneck>=c.opt.target;
  const cost=r.cost*nR+k*0.15+st*0.12*nR+(D.safety==='fence'?0.5:0.7)+t.conveyors.length*0.3;
  res.push({t,D,feas,meets,cost,r,nR,k,st});}
 const good=res.filter(x=>x.feas&&x.meets).sort((a,b)=>a.cost-b.cost||b.D.bottleneck-a.D.bottleneck);
 if(good.length)return{ok:true,best:good[0],alts:good.slice(1,4)};
 const f=res.filter(x=>x.feas).sort((a,b)=>b.D.bottleneck-a.D.bottleneck);return{ok:false,best:f[0]||null,alts:f.slice(1,4)};}
// ======================= АЛГОРИТМ РАБОТЫ (ТЕКСТ) =======================
function algoText(c,D){
 const nR=c.robots,k=c.grip.pick,fence=D.safety==='fence',sts=D.stations,pat=sts[0].pat,b=D.heaviest,G=D.grip,vac=GRIPPERS[c.grip.type].vac,ex=c.exch,sh=c.sheet;
 const feedTxt=c.conveyors.map((cv,i)=>cv.feed==='manual'?`на конвейер ${i+1} коробки кладёт оператор (в среднем ${cv.rate} в минуту)`:cv.feed==='interval'?`на конвейер ${i+1} коробки подаёт упаковочная машина каждые ${cv.interval} с`:`на конвейер ${i+1} коробки подаёт упаковочная машина, ${cv.rate} в минуту`).join('; ');
 const stList=sts.map(s=>s.id).join(', ');
 const gripTxt=vac?`${c.grip.type==='cups'?`${G.nCups} присосок Ø${G.cupD} мм`:`пенная рамка площадью ${f0(G.A)} см²`} создают разрежение ${G.vac} кПа. Датчик вакуума подтверждает, что коробка держится, только после этого робот поднимает её.`:c.grip.type==='clamp'?`губки сжимают коробку с боков с усилием ${f0(G.Fth)} Н, датчики на цилиндре подтверждают закрытие.`:`вилки заходят под коробку, прижим сверху фиксирует её.`;
 const sheetTxt=sh.mode==='none'?'':sh.mode==='bottom'?'Перед первой коробкой робот кладёт на пустую паллету один прокладочный лист.':sh.mode==='between'?'Между каждым слоем робот кладёт прокладочный лист.':`Через каждые ${sh.everyN} слоя робот кладёт прокладочный лист.`;
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
<li>Робот опускает захват, ${vac?`включает вакуум и ждёт подтверждения от датчика (около ${f2(G.tGrip)} с)`:'закрывает захват и ждёт датчик'}, затем переносит ${k>1?'группу':'коробку'} на паллету.</li>
<li>Место на паллете задаёт схема укладки «${pat.name}»: ${pat.interlock?'каждый следующий слой повёрнут на 180°, поэтому стыки коробок не совпадают и стопа перевязана':'слои одинаковые (колонны), поэтому стопу дополнительно фиксируют уголками и стрейч-плёнкой'}. Робот подводит коробку сверху, опускает, ${vac?'сбрасывает вакуум (сдув)':'раскрывает захват'} и уходит вверх.</li>
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
