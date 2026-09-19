// ======================= PERFORMANCE LEVEL ПО ISO 13849-1 =======================
// Упрощённый метод: категория + MTTFd канала + DCavg дают PL по столбчатой диаграмме
// (рис. 5); подсистемы складываются по таблице 11; требуемый PL — по графу рисков
// приложения A. По духу — SISTEMA внутри тренажёра. Подробности — docs/methodology.md.
const PL_ORDER=['a','b','c','d','e'];
const RISK_S={1:'S1 — лёгкая, обратимая травма',2:'S2 — тяжёлая необратимая травма или смерть'};
const RISK_F={1:'F1 — редкое или кратковременное пребывание в зоне',2:'F2 — частое или постоянное'};
const RISK_P={1:'P1 — избежать вреда возможно при определённых условиях',2:'P2 — избежать практически невозможно'};
// Граф рисков, приложение A: S — тяжесть, F — частота и время пребывания, P — возможность избежать.
function plRequired(S,F,P){return {'1-1-1':'a','1-1-2':'b','1-2-1':'b','1-2-2':'c',
 '2-1-1':'c','2-1-2':'d','2-2-1':'d','2-2-2':'e'}[`${S}-${F}-${P}`]||'e';}
// Меры против отказов по общей причине, приложение F, таблица F.1. Порог — 65 баллов из 100.
const CCF_ITEMS=[
 ['sep','Разделение: сигнальные пути каналов разнесены физически (отдельные кабели, клеммы, модули)',15],
 ['div','Разнообразие: каналы на разных технологиях, принципах или компонентах',20],
 ['over','Защита от перенапряжения, перегрузки, перегрева, перепада давления',15],
 ['well','Применены проверенные компоненты',5],
 ['fmea','Анализ видов и последствий отказов учёл отказы по общей причине',5],
 ['train','Персонал обучен, компетентность подтверждена',5],
 ['emc','Помехозащищённость обеспечена и проверена по ISO 13849-2',25],
 ['env','Учтены прочие влияния: температура, удар, вибрация, влажность',10]];
const CCF_NEED=65;
const PLR_HARD=['d','e']; // начиная с PL d одноканальная цепь не годится
function ccfScore(list){const L=list||[];return CCF_ITEMS.reduce((s,x)=>s+(L.indexOf(x[0])>=0?x[2]:0),0);}
// Архитектуры цепи безопасности: сколько каналов, какая диагностика, чем реализована логика.
const PL_ARCH={
 catB:{cat:'B',name:'Категория B: один канал, диагностики нет',ch:1,dcIn:0,dcLog:0,dcOut:0,
  logic:{n:'Промежуточное реле (не безопасное)',mttfd:30,dcKey:'dcLog'}},
 cat1:{cat:'1',name:'Категория 1: один канал на проверенных компонентах',ch:1,dcIn:0,dcLog:0,dcOut:0,
  logic:{n:'Реле безопасности с принудительным управлением контактами',mttfd:100,dcKey:'dcLog'}},
 cat3:{cat:'3',name:'Категория 3: два канала, диагностика при запросе',ch:2,dcIn:90,dcLog:99,dcOut:90,
  logic:{n:'Контроллер безопасности, два канала с тест-импульсами',mttfd:100,dcKey:'dcLog'}},
 cat4:{cat:'4',name:'Категория 4: два канала, непрерывная диагностика',ch:2,dcIn:99,dcLog:99,dcOut:99,
  logic:{n:'Контроллер безопасности PL e, непрерывная самодиагностика',mttfd:100,dcKey:'dcLog'}}};
function mttfdClass(y){return y<3?'bad':y<10?'low':y<30?'med':'high';}
function dcClass(d){return d<60?'none':d<90?'low':d<99?'med':'high';}
// Столбчатая диаграмма обрывает столбцы по категориям: у категорий 2 и 3 правый столбец —
// средний DC, «высокий» там просто не предусмотрен. Лишнюю диагностику засчитываем как средний DC.
const DC_CAP={'B':'none','1':'none','2':'med','3':'med','4':'high'};
const DC_ORDER=['none','low','med','high'];
function dcCap(cat,cl){const m=DC_CAP[cat]||'high';return DC_ORDER.indexOf(cl)>DC_ORDER.indexOf(m)?m:cl;}
const MC_RU={bad:'ниже 3 лет — недопустимо',low:'низкий (3…10 лет)',med:'средний (10…30 лет)',high:'высокий (30…100 лет)'};
const DC_RU={none:'отсутствует (< 60 %)',low:'низкий (60…90 %)',med:'средний (90…99 %)',high:'высокий (≥ 99 %)'};
// Столбчатая диаграмма рис. 5: пустая клетка означает, что такое сочетание не допускается.
function plFromBar(cat,m,d){
 if(m==='bad')return null;
 if(cat==='B')return d==='none'?{low:'a',med:'b',high:'b'}[m]:null;
 if(cat==='1')return (d==='none'&&m==='high')?'c':null;
 if(cat==='2'){if(d==='low')return{low:'a',med:'b',high:'c'}[m];if(d==='med')return{low:'b',med:'c',high:'d'}[m];return null;}
 if(cat==='3'){if(d==='low')return{low:'b',med:'c',high:'d'}[m];if(d==='med')return{low:'c',med:'d',high:'d'}[m];return null;}
 if(cat==='4')return (d==='high'&&m==='high')?'e':null;
 return null;}
// Последовательное соединение подсистем, таблица 11: считаем худший PL и сколько подсистем его имеют.
function plSeries(list){
 if(!list.length||list.some(p=>!p))return null;
 const low=list.reduce((x,y)=>PL_ORDER.indexOf(y)<PL_ORDER.indexOf(x)?y:x);
 const n=list.filter(p=>p===low).length;
 const T={a:[3,'a',null],b:[2,'b','a'],c:[2,'c','b'],d:[3,'d','c'],e:[3,'e','d']}[low];
 return n<=T[0]?T[1]:T[2];}
// MTTFd компонента: электроника задаётся напрямую, электромеханика — через B10d и число
// срабатываний в год (n_op = срабатываний за смену × смен в году), MTTFd = B10d / (0,1 · n_op).
function compMTTFd(k,P){
 if(k.mttfd)return k.mttfd;
 const shifts=Math.max(1,P.dop*(P.hop/8)),nop=Math.max(1,(k.ops||1)*shifts);
 return k.b10d/(0.1*nop);}
// Симметризация двух каналов, приложение D: при одинаковых каналах даёт то же значение.
function mttfdSym(a,b){return (2/3)*(a+b-1/(1/a+1/b));}
// Расчёт подсистемы: MTTFd канала, DCavg, проверка CCF и требований категории.
function subCalc(sub,P,ccf){
 let inv=0,dcw=0;
 sub.comp.forEach(k=>{const q=k.q||1,t=Math.min(100,compMTTFd(k,P));inv+=q/t;dcw+=q*(k.dc||0)/t;});
 const chan=inv>0?Math.min(100,1/inv):100;
 const mttfd=sub.ch>1?Math.min(100,mttfdSym(chan,chan)):chan;
 const single=sub.cat==='B'||sub.cat==='1';
 const dcavg=single?0:(inv>0?dcw/inv:0);
 const mC=mttfdClass(mttfd),dC=single?'none':dcCap(sub.cat,dcClass(dcavg));
 const issues=[];
 if(['2','3','4'].indexOf(sub.cat)>=0&&ccf<CCF_NEED)issues.push(`меры против отказов по общей причине набрали ${ccf} баллов из ${CCF_NEED} обязательных`);
 let pl=issues.length?null:plFromBar(sub.cat,mC,dC);
 if(!pl&&!issues.length){
  if(sub.cat==='4')issues.push('категория 4 требует высоких MTTFd и DC — сочетание не выполняется');
  else if(sub.cat==='1')issues.push('категория 1 требует высокого MTTFd (от 30 лет)');
  else if(mC==='bad')issues.push('MTTFd канала ниже 3 лет — упрощённый метод неприменим');
  else issues.push('сочетание категории, MTTFd и DC не даёт ни одного PL по рис. 5');}
 return{name:sub.name,cat:sub.cat,ch:sub.ch,comp:sub.comp,mttfd,chan,dcavg,mC,dC,pl,issues};}
// Функции безопасности этой ячейки, собранные из её же конфигурации.
function sfList(c,D){
 const P=c.pl,A=PL_ARCH[P.arch]||PL_ARCH.cat3,fence=D.safety==='fence';
 const nCv=c.conveyors.length,nR=c.robots,plr=plRequired(P.S,P.F,P.P);
 const dcOut=P.edm?A.dcOut:Math.min(A.dcOut,60);
 const logic=()=>({name:'Логика цепи безопасности',cat:A.cat,ch:A.ch,
  comp:[{n:A.logic.n,mttfd:A.logic.mttfd,dc:A.dcLog}]});
 const power=()=>({name:'Отключение силовой части',cat:A.cat,ch:A.ch,comp:[
  {n:A.ch>1?'Контакторы KM1 и KM2 с зеркальными контактами':'Контактор KM1',b10d:1300000,ops:P.opsES+P.opsLC+P.opsDoor,dc:dcOut,q:A.ch>1?2:1},
  {n:'Входы STO частотных преобразователей',mttfd:100,dc:dcOut,q:nCv},
  {n:'Безопасные входы контроллеров роботов',mttfd:100,dc:dcOut,q:nR}]});
 const sf=[];
 sf.push({id:'SF1',name:'Аварийный стоп, категория останова 0',plr,
  note:'ISO 13850: кнопка с фиксацией и принудительным размыканием контактов, деблокировка и сброс только вручную',
  subs:[{name:'Кнопки аварийного стопа',cat:A.cat,ch:A.ch,comp:[
    {n:'Кнопка на пульте оператора, 2 НЗ с принудительным размыканием',b10d:100000,ops:P.opsES,dc:A.dcIn},
    {n:'Кнопки на пультах обучения роботов',b10d:100000,ops:P.opsES,dc:A.dcIn,q:nR}]},logic(),power()]});
 if(fence){
  sf.push({id:'SF2',name:'Защитная остановка по световым завесам, категория останова 1',plr,
   note:`Расстояние установки S ≥ ${f0(D.Slc)} мм по ISO 13855`,
   subs:[{name:'Световые завесы проёмов конвейеров',cat:A.cat,ch:A.ch,
    comp:[{n:'Завеса тип 4 с двумя выходами OSSD',mttfd:100,dc:A.dcIn,q:nCv}]},logic(),power()]});
  sf.push({id:'SF3',name:'Блокировка двери ограждения с удержанием',plr,
   note:'ISO 14119: удержание снимается только сигналом контроллера безопасности, защита от обхода — RFID',
   subs:[{name:'Выключатель с блокировкой',cat:A.cat,ch:A.ch,
    comp:[{n:'Выключатель RFID с удержанием',b10d:2000000,ops:P.opsDoor,dc:A.dcIn}]},logic(),
    {name:'Запирание двери',cat:A.cat,ch:A.ch,comp:[{n:'Электромагнитный замок Q1',b10d:1000000,ops:P.opsDoor,dc:dcOut}]}]});
  if(c.exch.out!=='conveyor')sf.push({id:'SF4',name:'Мьютинг проёма на время обмена паллеты',plr,
   note:'Байпас завесы разрешается только при освобождённой станции: последовательность двух датчиков в окне времени',
   subs:[{name:'Датчики мьютинга и сигнал «станция освобождена»',cat:A.cat,ch:A.ch,comp:[
     {n:'Датчики мьютинга проёмов',mttfd:60,dc:A.dcIn,q:2*nCv},
     {n:'Кнопка «станция освобождена» у проёма',b10d:100000,ops:P.opsLC,dc:A.dcIn}]},logic(),power()]});
 } else {
  sf.push({id:'SF2',name:'Защитная остановка по защитному полю сканеров',plr,
   note:`Поле снижения скорости ≥ ${f0(D.Ssc)} мм от границы досягаемости (ISO 13855, ISO/TS 15066)`,
   subs:[{name:'Лазерные сканеры безопасности',cat:A.cat,ch:A.ch,
    comp:[{n:'Сканер 275°, два поля, наборы полей по входам',mttfd:100,dc:A.dcIn,q:2*nR}]},logic(),power()]});
  sf.push({id:'SF4',name:'Снижение скорости по полю предупреждения',plr,
   note:'Разделение и мониторинг скорости по ISO/TS 15066: робот переходит в Reduced Mode, питание не снимается',
   subs:[{name:'Лазерные сканеры безопасности',cat:A.cat,ch:A.ch,
    comp:[{n:'Сканер 275°, поле предупреждения',mttfd:100,dc:A.dcIn,q:2*nR}]},logic(),
    {name:'Безопасный вход робота «сниженная скорость»',cat:A.cat,ch:A.ch,
     comp:[{n:'Вход Reduced Mode контроллера робота',mttfd:100,dc:dcOut,q:nR}]}]});
 }
 return{sf,A,plr,dcOut};}
function plCalc(c,D){
 const P=c.pl,{sf,A,plr,dcOut}=sfList(c,D),ccf=ccfScore(P.ccf);
 sf.forEach(f=>{f.res=f.subs.map(s=>subCalc(s,P,ccf));
  f.pl=plSeries(f.res.map(r=>r.pl));
  f.ok=!!f.pl&&PL_ORDER.indexOf(f.pl)>=PL_ORDER.indexOf(f.plr);});
 const worst=sf.reduce((x,f)=>{if(!f.pl)return null;return x===null?null:(PL_ORDER.indexOf(f.pl)<PL_ORDER.indexOf(x)?f.pl:x);},'e');
 return{plr,ccf,ccfOK:ccf>=CCF_NEED,arch:A,dcOut,sf,worst,ok:sf.every(f=>f.ok),
  risk:`${RISK_S[P.S]}; ${RISK_F[P.F]}; ${RISK_P[P.P]}`};}
