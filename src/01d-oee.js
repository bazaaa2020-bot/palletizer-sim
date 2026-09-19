// ======================= СМЕНА, ПРОСТОИ И OEE =======================
// Время смены разносится по категориям потерь, из них считается OEE = готовность ×
// производительность × качество. Методика — docs/methodology.md.
const DT_CAT={
 run:{n:'Работа',col:'--green',d:'Ячейка укладывает: состояние Execute'},
 fault:{n:'Отказы оборудования',col:'--red',d:'Held и Aborted: внутренняя причина, материал есть'},
 starve:{n:'Ожидание материала и обмена',col:'--yellow',d:'Suspended: нет свободной паллеты, пустой магазин, идёт обмен'},
 chg:{n:'Пуски, остановы, сбросы',col:'--blue',d:'Starting, Stopping, Resetting: переходные состояния'},
 idle:{n:'Простой без задания',col:'--fence',d:'Stopped и Idle: ячейка исправна, но не работает'}};
const DT_ORDER=['run','fault','starve','chg','idle'];
const STATE_CAT={Execute:'run',Held:'fault',Holding:'fault',Aborted:'fault',Aborting:'fault',
 Suspended:'starve',Starting:'chg',Stopping:'chg',Resetting:'chg',Clearing:'chg',Idle:'idle',Stopped:'idle'};
function dtCat(state){return STATE_CAT[state]||'idle';}
// OEE считается на наблюдаемом окне — от начала смены (первого пуска после сброса счётчиков).
// Готовность = работа / наблюдаемое время; производительность = идеальный такт × выпуск / работу;
// качество = уложенное / всё, что ячейка взяла в работу (уложенное + уронённое + промахи).
function oeeCalc(O,st,D){
 const obs=O.obs,run=O.by.run||0,good=st.placed,total=st.placed+st.dropped+st.missed;
 const nR=D.LY&&D.LY.robots?D.LY.robots.length:1,kEff=Math.max(0.01,D.kEff||1);
 const tIdeal=D.tCycle/kEff/nR;                          // секунд на коробку по расчётному такту
 // Идеальное время считается по фактически сделанной работе, а не по среднему такту паллеты:
 // иначе окно короче одной паллеты даёт производительность выше единицы.
 const work=total*tIdeal+((st.sheets||0)*D.tSheet+(st.setPallets||0)*D.tPallet)/nR;
 const A=obs>0?run/obs:0;
 const P=run>0?Math.min(1,work/run):0;
 const Q=total>0?good/total:(run>0?0:1);
 return{obs,run,good,total,tIdeal,work,A,P,Q,oee:A*P*Q,
  parts:DT_ORDER.map(k=>({k,t:O.by[k]||0,share:obs>0?(O.by[k]||0)/obs:0}))};}
// Парето причин простоя: группируем записи журнала по тексту причины.
function dtPareto(O){
 const m={};O.log.forEach(x=>{if(x.cat==='run')return;const k=x.cat+'|'+x.why;
  if(!m[k])m[k]={cat:x.cat,why:x.why,t:0,n:0};m[k].t+=x.dur;m[k].n++;});
 const rows=Object.values(m).sort((a,b)=>b.t-a.t);
 const sum=rows.reduce((a,x)=>a+x.t,0);let acc=0;
 rows.forEach(x=>{x.share=sum>0?x.t/sum:0;acc+=x.share;x.cum=acc;});
 return{rows,sum};}
// Проекция на смену: если так пойдёт дальше, сколько даст смена за вычетом плановых остановок.
function shiftProj(K,sh,D){
 const plan=Math.max(0,sh.len*3600-sh.breaks*60);
 const rate=K.run>0?K.good/K.run:0;                      // коробок в секунду работы
 const boxes=rate*plan*K.A,perPallet=D.stations.length?D.stations[0].pat.total:0;
 return{plan,boxes,pallets:perPallet>0?boxes/perPallet:0,
  lost:DT_ORDER.filter(k=>k!=='run').map(k=>({k,t:K.obs>0?(K.parts.find(p=>p.k===k).t/K.obs)*plan:0})),
  ideal:K.tIdeal>0?plan/K.tIdeal:0};}
// Сценарии тревог: последовательность отказов на пульте, время — секунды от пуска смены.
const SCEN={
 none:{n:'Без сценария',note:'Отказы только вручную с пульта.',ev:[]},
 calm:{n:'Спокойная смена',note:'Отказов нет — только мелочи и один плановый заход в ячейку. В Парето наверх выйдет не поломка, а организация работ: так выглядит большинство реальных смен.',
  ev:[{t:70,b:'stuck',n:'Загрязнился отражатель датчика B11'},
      {t:170,b:'hand',n:'Оператор потянулся в проём за упавшей коробкой'},
      {t:260,b:'access',n:'Запрос доступа: оператор идёт внутрь поправить паллету'}]},
 hard:{n:'Тяжёлая смена: серия отказов',note:'Пять событий подряд, часть — во время работы робота с грузом. Задача: удержать ячейку и понять, что именно съело готовность.',
  ev:[{t:45,b:'vac',n:'Потеря вакуума в переносе'},
      {t:130,b:'vfd',n:'Авария ЧП конвейера 1'},
      {t:210,b:'stuck',n:'Залип датчик B11'},
      {t:290,b:'hand',n:'Пересечение световой завесы'},
      {t:380,b:'vac',n:'Повторная потеря вакуума — та же зона'}]},
 cascade:{n:'Каскад: отказ во время обмена',note:'Отказ привода накладывается на обмен паллеты — очередь из двух причин простоя, которые разбираются по журналу.',
  ev:[{t:60,b:'pal',n:'Вызов техники на станцию A'},
      {t:75,b:'vfd',n:'Авария ЧП, пока тележка едет'},
      {t:150,b:'vac',n:'Потеря вакуума сразу после сброса'}]}};
const SCEN_ORDER=['none','calm','hard','cascade'];
