// ======================= РЕДАКТОР ЛОГИКИ ПЛК: GRAFCET =======================
// Последовательность ячейки описана данными, а не зашита в код: шаги с действиями и
// переходы с условиями. Тренажёр исполняет ровно то, что написано в программе.
// Две диаграммы работают параллельно, как два GRAFCET в реальном ПЛК:
//   G1 «Цикл укладки» — один экземпляр на робота, выдаёт разрешения подачи и задания роботу;
//   G2 «Обмен паллет» — один экземпляр на станцию, вызывает технику и зажигает лампу.
// Подробности и границы модели — docs/methodology.md.
const GC_ACT={
 feed:{n:'Разрешение подачи на конвейер',t:'DO',d:'Упаковочная машина или оператор подают коробки, пока разрешение снято — подача стоит'},
 job:{n:'Задание роботу: взять группу и уложить',t:'BUS',d:'Без этого действия робот не берёт коробки, даже если они пришли'},
 jobSheet:{n:'Задание роботу: положить прокладку',t:'BUS',d:'Отдельное задание: робот идёт к магазину'},
 jobPallet:{n:'Задание роботу: поставить пустую паллету',t:'BUS',d:'Только при подаче паллет роботом из стопки'},
 call:{n:'Вызов обмена паллеты',t:'DO',d:'Заявка технике или AMR; без неё готовая паллета так и стоит'},
 lamp:{n:'Лампа «станция освобождена»',t:'DO',d:'Разрешает человеку подойти к проёму'},
 mute:{n:'Разрешение мьютинга проёма',t:'SO',d:'Байпас завесы. Держать его вместе с заданием роботу нельзя — это прямая опасность'}};
const GC_ACT_ORDER=['feed','job','jobSheet','jobPallet','call','lamp','mute'];
// Условия переходов. Каждое умеет посчитать себя по состоянию ячейки: ctx = {ri, st, jb, rb}.
const GC_COND={
 always:{n:'1 — безусловно',f:()=>true},
 run:{n:'Ячейка в Execute',f:x=>S.packml==='Execute'},
 robotIdle:{n:'Робот свободен (ждёт задания)',f:x=>!!x.rb&&x.rb.step==='wait'&&x.rb.carryKind===null},
 cycleDone:{n:'Робот закончил ход и вернулся',f:x=>x.done},
 grpReady:{n:'Группа коробок готова у упора (B2)',f:x=>!!x.jb&&x.jb.kind==='box'},
 needSheet:{n:'Слою нужна прокладка',f:x=>!!x.jb&&x.jb.kind==='sheet'},
 needPallet:{n:'Станции нужна пустая паллета из стопки',f:x=>!!x.jb&&x.jb.kind==='pallet'},
 noJob:{n:'Задания нет (нечего делать)',f:x=>!x.jb},
 magOK:{n:'В магазине есть листы (B4)',f:x=>magsOf(x.ri).some(m=>m.sheets>0)},
 stackOK:{n:'В стопке есть пустые паллеты (B5)',f:x=>S.stacks.some(p=>p.robot===x.ri&&p.n>0)},
 palReady:{n:'Паллета набрана или станция пуста',f:x=>!!x.st&&(x.st.complete||(!x.st.present&&CFG.exch.in==='vehicle'))},
 stFree:{n:'Обмен завершён: на станции пустая паллета',f:x=>!!x.st&&x.st.present&&!x.st.complete&&!x.st.agent},
 noAgent:{n:'У проёма никого нет',f:x=>!!x.st&&!x.st.agent}};
const GC_COND_ORDER=Object.keys(GC_COND);
// Эталонная программа — то, как эту ячейку написал бы наладчик.
function grafRef(c){
 const g1=[
  {id:'S0',n:'Инициализация',act:[],tr:[{c:'run',to:'S1'}]},
  {id:'S1',n:'Подача включена, ждём работу',act:['feed'],tr:[
    {c:'needPallet',to:'S4'},{c:'needSheet',to:'S3'},{c:'grpReady',to:'S2'}]},
  {id:'S2',n:'Задание: уложить группу',act:['feed','job'],tr:[{c:'cycleDone',to:'S1'}]},
  {id:'S3',n:'Задание: прокладка на слой',act:['feed','jobSheet'],tr:[{c:'cycleDone',to:'S1'}]}];
 if(c.exch.in==='robot')g1.push({id:'S4',n:'Задание: пустая паллета из стопки',act:['feed','jobPallet'],tr:[{c:'cycleDone',to:'S1'}]});
 else g1.push({id:'S4',n:'Пустую паллету ставит не робот',act:['feed'],tr:[{c:'always',to:'S1'}]});
 const g2=[
  {id:'T0',n:'Станция работает',act:[],tr:[{c:'palReady',to:'T1'}]},
  {id:'T1',n:'Вызов обмена, лампа «освобождено»',act:['call','lamp'],tr:[{c:'stFree',to:'T0'}]}];
 return{g1,g2};}
// ---- исполнение ----
// За один такт разрешается цепочка переходов: реальный ПЛК за скан проходит все переходы,
// которые истинны, и останавливается на шаге, из которого выхода нет. Предел — от зацикливания.
const GC_MAX_FIRE=8;
function grafRun(steps,cur,ctx){
 let i=steps.findIndex(s=>s.id===cur);if(i<0)i=0;
 for(let k=0;k<GC_MAX_FIRE;k++){
  const st=steps[i];if(!st)break;
  const t=(st.tr||[]).find(t=>GC_COND[t.c]&&GC_COND[t.c].f(ctx));
  if(!t)break;
  const j=steps.findIndex(s=>s.id===t.to);if(j<0)break;
  i=j;}
 return steps[i]?steps[i].id:(steps[0]?steps[0].id:null);}
function grafProg(c){return c.plc.mode==='user'&&c.plc.g1&&c.plc.g1.length?{g1:c.plc.g1,g2:c.plc.g2}:grafRef(c);}
// ---- проверка программы ----
function grafCheck(P,c){
 const w=[];const chk=(steps,name,start)=>{
  if(!steps.length){w.push(`${name}: нет ни одного шага`);return;}
  const ids=steps.map(s=>s.id);
  ids.forEach((id,i)=>{if(ids.indexOf(id)!==i)w.push(`${name}: шаг ${id} объявлен дважды`);});
  steps.forEach(s=>{(s.tr||[]).forEach(t=>{
    if(!GC_COND[t.c])w.push(`${name}, шаг ${s.id}: неизвестное условие «${t.c}»`);
    if(ids.indexOf(t.to)<0)w.push(`${name}, шаг ${s.id}: переход ведёт в несуществующий шаг ${t.to}`);
    if(t.to===s.id&&t.c==='always')w.push(`${name}, шаг ${s.id}: безусловный переход сам в себя — ПЛК зациклится на одном шаге`);});
   if(!(s.tr||[]).length)w.push(`${name}, шаг ${s.id} («${s.n}»): нет ни одного перехода — программа застрянет здесь навсегда`);
   const a=s.act||[];
   if(a.indexOf('mute')>=0&&a.some(x=>x.indexOf('job')===0))
    w.push(`${name}, шаг ${s.id}: мьютинг проёма держится одновременно с заданием роботу — завеса в байпасе, пока робот работает. В реальной ячейке это нарушение ISO 13855 и ISO 13849-1`);});
  // достижимость от первого шага
  const seen={},q=[start];seen[start]=1;
  while(q.length){const id=q.shift(),s=steps.find(x=>x.id===id);if(!s)continue;
   (s.tr||[]).forEach(t=>{if(!seen[t.to]){seen[t.to]=1;q.push(t.to);}});}
  steps.forEach(s=>{if(!seen[s.id])w.push(`${name}, шаг ${s.id} («${s.n}»): недостижим из начального шага`);});};
 chk(P.g1,'Цикл укладки',P.g1[0]?P.g1[0].id:'');
 chk(P.g2,'Обмен паллет',P.g2[0]?P.g2[0].id:'');
 const all=P.g1.concat(P.g2),acts=new Set();all.forEach(s=>(s.act||[]).forEach(a=>acts.add(a)));
 if(!acts.has('job'))w.push('Ни в одном шаге нет задания роботу на укладку — робот не возьмёт ни одной коробки');
 if(!acts.has('feed')&&c.conveyors.some(x=>x.feed!=='manual'))w.push('Ни в одном шаге нет разрешения подачи — автоматическая подача не запустится');
 if(!acts.has('call')&&c.exch.out!=='conveyor')w.push('Ни в одном шаге нет вызова обмена — готовые паллеты никто не увезёт');
 if(c.sheet.mode!=='none'&&!acts.has('jobSheet'))w.push('Прокладки заданы, но задания роботу на прокладку нет — слои пойдут без листов');
 if(c.exch.in==='robot'&&!acts.has('jobPallet'))w.push('Пустые паллеты ставит робот, но задания на паллету нет — станции останутся без паллет');
 return w;}
// ---- сравнение с эталоном ----
function grafDiff(P,R){
 const d=[];const cmp=(a,b,name)=>{
  const ai=a.map(s=>s.id),bi=b.map(s=>s.id);
  bi.forEach(id=>{if(ai.indexOf(id)<0)d.push({k:'del',t:`${name}: шага ${id} нет — в эталоне это «${b.find(s=>s.id===id).n}»`});});
  ai.forEach(id=>{if(bi.indexOf(id)<0){d.push({k:'add',t:`${name}: шаг ${id} добавлен сверх эталона`});return;}
   const x=a.find(s=>s.id===id),y=b.find(s=>s.id===id);
   const ax=(x.act||[]).slice().sort().join(','),ay=(y.act||[]).slice().sort().join(',');
   if(ax!==ay)d.push({k:'act',t:`${name}, шаг ${id}: действия «${(x.act||[]).map(k=>GC_ACT[k]?GC_ACT[k].n:k).join(', ')||'нет'}» вместо «${(y.act||[]).map(k=>GC_ACT[k].n).join(', ')||'нет'}»`});
   const tx=(x.tr||[]).map(t=>t.c+'→'+t.to).join(' ; '),ty=(y.tr||[]).map(t=>t.c+'→'+t.to).join(' ; ');
   if(tx!==ty)d.push({k:'tr',t:`${name}, шаг ${id}: переходы «${tx||'нет'}» вместо «${ty||'нет'}»`});});};
 cmp(P.g1,R.g1,'Цикл укладки');cmp(P.g2,R.g2,'Обмен паллет');
 return d;}
