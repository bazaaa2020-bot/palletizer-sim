// ======================= СМЕШАННАЯ ПАЛЛЕТА: РЕЦЕПТ УКЛАДКИ =======================
// Рецепт — упорядоченный список ярусов: артикул и сколько его слоёв идёт подряд, снизу вверх.
// Из него разворачивается список слоёв, по которому станция и работает: у каждого слоя своя
// схема укладки, своя коробка и свой конвейер. Методика — docs/methodology.md.
function mixRows(c,pal,k,pats,tRef){
 return (c.mix.rows||[]).filter(r=>c.boxes[r.box]).map(r=>{const bi=+r.box,b=c.boxes[bi];
  if(!pats[bi])pats[bi]=choosePattern(b,pal,c.patternMode,c.maxStack,k,c.sheet,c.grip,tRef);
  return{bi,b,pat:pats[bi],n:clamp(Math.round(+r.layers)||1,1,40),sheet:!!r.sheet};});}
// Разворачиваем ярусы в слои: лист «под артикулом» ложится перед его первым слоем.
function mixCalc(c,pal,k,pats,tRef,convBi){
 const rows=mixRows(c,pal,k,pats,tRef),rec=[];
 rows.forEach(r=>{for(let i=0;i<r.n;i++)rec.push({bi:r.bi,b:r.b,pat:r.pat,sheet:r.sheet&&i===0});});
 const M={rows,rec,layers:rec.length,warn:[]};
 if(!rec.length)return Object.assign(M,{total:0,mass:pal.m,height:pal.h,sheets:0,groups:0,shifts:0,ok:false});
 let total=0,mass=0,h=0,groups=0,shifts=0,sheets=0;
 rec.forEach((r,j)=>{const par=r.pat.interlock&&(j%2)?1:0,gs=par?r.pat.groupsB:r.pat.groupsA;
  total+=r.pat.n;mass+=r.pat.n*r.b.m;h+=r.b.h;groups+=gs.length;
  gs.forEach(x=>{if(x.nr>1)shifts+=2;});
  if(r.sheet){sheets++;h+=4;}});
 Object.assign(M,{total,mass:mass+pal.m,height:pal.h+h,sheets,groups,shifts,ok:true,
  kEff:groups>0?total/groups:1,arts:[...new Set(rec.map(r=>r.bi))]});
 // Замечания рецепта: что видно из самих ярусов, без домыслов о прочности упаковки.
 if(rows.length<2)M.warn.push('В рецепте один артикул — это обычная моно-паллета, смешивать нечего.');
 rows.forEach((r,i)=>{if(!i)return;const p=rows[i-1];
  if(r.b.m>p.b.m+0.01)M.warn.push(`Ярус ${i+1} («${r.b.name}», ${f1(r.b.m)} кг) тяжелее яруса под ним («${p.b.name}», ${f1(p.b.m)} кг): тяжёлое кладут вниз, иначе нижние коробки сминаются.`);
  if(r.pat.fill>p.pat.fill+0.12&&!r.sheet)M.warn.push(`Ярус ${i+1} («${r.b.name}») заполняет слой на ${f0(r.pat.fill*100)} %, а ярус под ним — на ${f0(p.pat.fill*100)} %: часть коробок встанет над пустотой. Поставьте под этот ярус разделительный лист.`);
  if(MATS[p.b.mat]&&MATS[p.b.mat].muCap<0.4&&!r.sheet)M.warn.push(`Под ярусом ${i+1} лежит ${MATS[p.b.mat].name.toLowerCase()} («${p.b.name}») — скользкая поверхность, верхний ярус поедет. Нужен разделительный лист.`);});
 if(M.sheets>0&&c.magazines===0)M.warn.push('В рецепте заданы разделительные листы, но магазинов прокладок нет.');
 if(M.height>c.maxStack)M.warn.push(`Высота смешанной паллеты ${f0(M.height)} мм выше лимита ${c.maxStack} мм — уберите ярус или снизьте число слоёв.`);
 if(convBi){const miss=M.arts.filter(bi=>convBi.indexOf(bi)<0);
  if(miss.length)M.warn.push(`Артикул${miss.length>1?'ы':''} ${miss.map(bi=>`«${c.boxes[bi].name}»`).join(', ')} нет ни на одном конвейере этого робота — рецепт не соберётся. Назначьте артикул конвейеру или уберите ярус.`);}
 return M;}
// Слои моно-паллеты в том же виде, чтобы симуляция и 3D работали одной дорогой.
function monoRec(bi,b,pat){const rec=[];for(let i=0;i<pat.layers;i++)rec.push({bi,b,pat,sheet:false});return rec;}
