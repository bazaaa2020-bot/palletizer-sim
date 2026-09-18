#!/usr/bin/env node
// Дымовой тест без браузера: грузит собранный файл в jsdom, прогоняет цикл ячейки,
// проверяет переходы PackML, укладку, обмен паллет и отсутствие ошибок в консоли.
// three.js в jsdom не грузится — 3D-вид корректно отключается сам, это часть проверки.
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'dist', 'palletizer-sim.html');
let html = fs.readFileSync(file, 'utf8')
  .replace(/requestAnimationFrame\(loop\);/g, '')              // цикл крутим вручную
  .replace(/<link href="https:\/\/fonts[^>]+>/, '')
  .replace(/<script src="https:\/\/cdnjs[^>]+><\/script>/, '');

const dom = new JSDOM(html, { runScripts: 'dangerously' });
const w = dom.window, d = w.document;
const errs = [];
w.addEventListener('error', e => errs.push(e.message));

const S = () => w.eval('S');
const run = sec => { for (let i = 0; i < sec * 20; i++) w.eval('tick(0.05)'); };
const click = sel => { const el = d.querySelector(sel); if (!el) throw new Error('нет элемента ' + sel); el.click(); run(0.1); };

let failed = 0;
const check = (name, cond, info) => {
  if (cond) console.log(`  ok   ${name}`);
  else { console.log(`  FAIL ${name}${info ? ' — ' + info : ''}`); failed++; }
};

console.log('Конфигурация по умолчанию');
check('расчёт проходит по досягаемости', w.eval('DD.reachStatus') !== 'bad');
check('захват считается', w.eval('DD.grip.status') !== 'bad');
check('схема укладки перевязана', w.eval('DD.stations[0].pat.interlock') === true);
check('циклов на паллету > 0', w.eval('DD.cyclesPerPallet') > 0);
check('спецификация и сигналы собраны', w.eval('DD.bom.length') > 20 && w.eval('DD.sig.length') > 20);
check('3D отключился без three.js', d.getElementById('v3msg').textContent.length > 0);

console.log('Пуск и укладка (автоподача, автообмен)');
w.eval(`CFG.conveyors[0].feed='rate';CFG.conveyors[0].rate=20;CFG.exch.reaction=5;CFG.sheet.cap=4;CFG.sheet.low=1;renderCfg();buildSim();renderArch();`);
check('состояние Stopped после сборки', S().packml === 'Stopped');
click('#bReset'); run(2);
check('после сброса Idle', S().packml === 'Idle', S().packml);
click('#bStart'); run(1);
check('после пуска Execute', S().packml === 'Execute', S().packml);
run(400);
check('коробки уложены', S().stats.placed > 20, 'placed=' + S().stats.placed);
check('паллеты завершены', S().stats.pallets > 0, 'pallets=' + S().stats.pallets);
check('обмен паллет сработал', S().stats.exch > 0, 'exch=' + S().stats.exch);
check('прокладки пополнялись', S().stats.refills > 0, 'refills=' + S().stats.refills);
check('коробки не терялись', S().stats.dropped === 0);

console.log('Безопасность');
const fence = w.eval('DD.safety') === 'fence';
if (fence) {
  w.eval('S.conv.forEach(cv=>cv.boxes=[])'); run(0.5);          // чтобы завеса не была в мьютинге проходящей коробкой
  click('[data-b="hand"]'); run(1);
  check('нарушение завесы → Held', S().packml === 'Held', S().packml);
  run(2); click('#bReset'); run(3); click('#bStart'); run(1);
  check('возврат в Execute', S().packml === 'Execute', S().packml);
}
click('#bEstop');
check('аварийный стоп → Aborted', S().packml === 'Aborted', S().packml);
click('#bEstop'); click('#bReset'); click('#bReset'); run(3); click('#bStart'); run(1);
check('возврат после аварийного стопа', S().packml === 'Execute', S().packml);

console.log('Другие конфигурации');
w.eval(`CFG.exch.out='amr';CFG.exch.in='robot';CFG.grip.pick=4;CFG.robot='pl130';renderCfg();buildSim();renderArch();`);
check('стопка паллет появилась в компоновке', w.eval('S.stacks.length') > 0);
check('норматив циклов учтён', Math.abs(w.eval('DD.cpm') - 6) < 0.6, 'cpm=' + w.eval('DD.cpm'));
w.eval(`CFG.opt.target=600;OPT=optimize(CFG);`);
check('оптимизатор возвращает вариант', w.eval('!!OPT.best'));
w.eval(`CFG=JSON.parse(JSON.stringify(DEF));renderCfg();buildSim();`);
check('сброс к типовой конфигурации', w.eval('CFG.robot') === 'cb20');

console.log('Группы захвата по форме слоя');
const grp = (pitch, tShift, extra) => {
  w.eval(`CFG=JSON.parse(JSON.stringify(DEF));CFG.robot='pl130';CFG.grip.pick=4;CFG.grip.pitch='${pitch}';CFG.grip.tShift=${tShift};${extra || ''}renderCfg();buildSim();renderArch();`);
  return w.eval('Object.values(DD.pats)[0]');
};
const pat = () => w.eval('Object.values(DD.pats)[0]');

const rowsPerPallet = grp('fixed', 1.5).groupsPerPallet;
check('фиксированный шаг зон — группы только ряды', w.eval('Object.values(DD.pats)[0].groupsA.every(g=>g.nr===1)'));
check('без раздвижки перестроений нет', w.eval('DD.shiftsPerPallet') === 0);

const adj = grp('adj', 1.5);
check('регулируемый шаг зон даёт блоки', w.eval('Object.values(DD.pats)[0].groupsA.some(g=>g.nr>1)'), 'формы: ' + adj.shapes);
check('ходов на паллету стало меньше', adj.groupsPerPallet < rowsPerPallet, `${adj.groupsPerPallet} против ${rowsPerPallet}`);
check('слой разобран без потерь и дублей', w.eval('(()=>{const p=Object.values(DD.pats)[0],a=[].concat(...p.groupsA);return a.length===p.n&&new Set(a).size===p.n;})()'));
check('группа не больше захвата и равна своей форме', w.eval('Object.values(DD.pats)[0].groupsA.every(g=>g.length<=4&&g.nc*g.nr===g.length)'));
check('перестроений по два на блок', w.eval('(()=>{const p=Object.values(DD.pats)[0];let n=0;for(let j=0;j<p.layers;j++)(p.interlock&&j%2?p.groupsB:p.groupsA).forEach(g=>{if(g.nr>1)n+=2;});return p.shifts>0&&n===p.shifts;})()'), 'shifts=' + adj.shifts);
check('время перестроения вошло в такт паллеты', Math.abs(w.eval('DD.tShiftPallet') - w.eval('DD.shiftsPerPallet') * 1.5) < 1e-9);

grp('adj', 0.5); const tFast = w.eval('DD.tPerPallet');
grp('adj', 4);   const tSlow = w.eval('DD.tPerPallet');
check('дороже перестроение — дольше паллета', tSlow > tFast, `${tSlow.toFixed(1)} против ${tFast.toFixed(1)} с`);

grp('adj', 1.5, `CFG.patternMode='column';CFG.boxes[0]={name:'Мелкая',l:300,w:200,h:250,m:8,rate:0,layers:0};`);
check('где ряды и так оптимальны — блоки не берутся', pat().adjUsed === false && pat().shifts === 0, 'adjUsed=' + pat().adjUsed);

grp('adj', 1.5, `CFG.conveyors[0].feed='rate';CFG.conveyors[0].rate=30;CFG.exch.reaction=5;`);
click('#bReset'); run(2); click('#bStart'); run(1);
let sawShift = false;
for (let i = 0; i < 3000; i++) {
  w.eval('tick(0.05)');
  if (!sawShift && i % 4 === 0) { const st = w.eval('S.robots[0].step'); if (st === 'shift' || st === 'unshift') sawShift = true; }
}
check('робот перестраивает захват в цикле', sawShift);
check('укладка блоками идёт', S().stats.placed > 20, 'placed=' + S().stats.placed);
check('на блоках коробки не терялись', S().stats.dropped === 0);

w.eval(`CFG=JSON.parse(JSON.stringify(DEF));renderCfg();buildSim();renderArch();`);

console.log('Реалистичная укладка (roadmap, п. 9)');
w.eval(`CFG=JSON.parse(JSON.stringify(DEF));CFG.conveyors[0].feed='rate';CFG.conveyors[0].rate=30;CFG.exch.reaction=5;renderCfg();buildSim();renderArch();`);
click('#bReset'); run(2); click('#bStart'); run(1);
const snap = () => w.eval("(()=>{const r=S.robots[0];return{step:r.step,z:r.z,zRel:r.zRel,vz:r.vz,vxy:r.vxy,x:r.x,y:r.y,placed:S.stats.placed};})()");
const yawFits = () => w.eval("(()=>{const r=S.robots[0];const t=r.step==='downPlace'?boxYaw(r.job.st,r.job.group):r.job.st.slot.ang;let d=(r.yaw-t)%360;if(d>180)d-=360;if(d<-180)d+=360;return Math.abs(d)<0.6;})()");
const vPlace = w.eval('CFG.motion.vPlace'), aMax = w.eval('DD.aMax') * 1000;
const seen = new Set();
let vDown = 0, lateral = 0, accMax = 0, yawOk = true, dropped = 0, nPlace = 0, t0 = 0, touch = 0;
let prev = snap();
for (let i = 0; i < 4000; i++) {
  w.eval('tick(0.05)');
  const r = snap();
  seen.add(r.step);
  if (r.step === 'downPlace' || r.step === 'downPick' || r.step === 'downSheet') vDown = Math.max(vDown, Math.abs(r.vz));
  if (r.step === 'upPick' || r.step === 'upPlace' || r.step === 'upSheet') lateral = Math.max(lateral, Math.hypot(r.x - prev.x, r.y - prev.y));
  // ускорение меряем на ходу: приход оси в цель случается внутри такта и скачок там мнимый
  if (r.step === prev.step) {
    if (r.vxy > 0 && prev.vxy > 0) accMax = Math.max(accMax, Math.abs(r.vxy - prev.vxy) / 0.05);
    if (r.vz > 0 && prev.vz > 0) accMax = Math.max(accMax, Math.abs(r.vz - prev.vz) / 0.05);
  }
  if (prev.step === 'downPlace' && r.step === 'place') touch = Math.max(touch, prev.vz);
  if ((r.step === 'downPlace' || r.step === 'downSheet') && !yawFits()) yawOk = false;
  if (r.placed > prev.placed) { nPlace++; if (Math.abs(r.z - r.zRel) > 2) dropped++; if (!t0) t0 = i; }
  prev = r;
}
check('цикл проходит подвод, захват, отрыв и подъём', ['toPick','downPick','grip','upPick','toPlace','downPlace','place','upPlace'].every(x => seen.has(x)), [...seen].join(' '));
check('коробка ложится только после опускания захвата', nPlace > 5 && dropped === 0, `укладок ${nPlace}, с высоты ${dropped}`);
check('опускание идёт на скорости подвода', vDown > 0 && vDown <= vPlace * 1.05, `${vDown.toFixed(0)} против ${vPlace} мм/с`);
check('касание слоя на скорости подвода, а не броском', touch > 0 && touch <= vPlace * 1.05, `${touch.toFixed(0)} мм/с`);
check('отрыв и подъём строго вертикальные', lateral < 0.5, 'смещение ' + lateral.toFixed(2) + ' мм за такт');
check('ускорение ограничено профилем', accMax <= aMax * 1.2, `${accMax.toFixed(0)} против ${aMax.toFixed(0)} мм/с²`);
check('кисть доворачивается до опускания', yawOk);
check('лист переносится с доворотом и ложится по секциям', seen.has('downSheet') && seen.has('upSheet') && w.eval('CFG.sheet.sect') > 1 && Math.abs(w.eval('DD.tRelSheet') - w.eval('CFG.sheet.sect * DD.grip.tRel')) < 1e-9);

const kEff = w.eval('Object.values(DD.pats)[0].kEff'), tC = w.eval('DD.tCycle');
const real = (4000 - t0) * 0.05 / ((w.eval('S.stats.placed') - 1) / kEff);
check('симуляция сходится с расчётным тактом', real > tC * 0.7 && real < tC * 1.4, `${real.toFixed(2)} с против расчётных ${tC.toFixed(2)} с`);

w.eval(`CFG.motion.vPlace=50;CFG.motion.hAppr=200;renderCfg();buildSim();`);
check('медленнее подвод — длиннее такт', w.eval('DD.tCycleModel') > tC, w.eval('DD.tCycleModel').toFixed(2) + ' с');

w.eval(`CFG=JSON.parse(JSON.stringify(DEF));renderCfg();buildSim();renderArch();`);

console.log('Обмен паллет и высота переноса');
w.eval(`CFG=JSON.parse(JSON.stringify(DEF));CFG.robot='pl130';CFG.conveyors[0].feed='rate';CFG.conveyors[0].rate=30;CFG.exch.reaction=5;CFG.boxes[0].layers=2;renderCfg();buildSim();renderArch();`);
click('#bReset'); run(2); click('#bStart'); run(1);
const probe = () => w.eval(`(()=>{const r=S.robots[0],pal=DD.pal,c=CFG;
  const load=r.carryKind==='box'?boxOf(c,r.carryBi).h:r.carryKind==='sheet'?4:r.carryKind==='pallet'?pal.h:0;
  const tgt=r.job&&r.job.st?r.job.st.id:null;let clr=1e9;
  S.st.forEach(s=>{if(!s.present||s.id===tgt)return;const b=boxOf(c,s.bi);
   const top=pal.h+(s.layer+(s.placed.length?1:0))*b.h+s.sheetLayers.length*4;
   if(Math.hypot(r.x-s.slot.cx,r.y-s.slot.cy)<Math.max(pal.W,pal.L)/2)clr=Math.min(clr,(r.z-load)-top);});
  return{started:S.st.filter(s=>s.count>0&&!s.complete).length,clr};})()`);
let bothStarted = 0, through = 0, worst = 0;
for (let i = 0; i < 8000; i++) {
  w.eval('tick(0.05)');
  const q = probe();
  if (q.started > 1) bothStarted++;
  if (q.clr < 0) { through++; worst = Math.min(worst, q.clr); }
}
check('обмен паллет прошёл', S().stats.exch > 0, 'exch=' + S().stats.exch);
check('начатая паллета дозаполняется до конца', bothStarted === 0, bothStarted + ' тактов с двумя начатыми паллетами');
check('груз не проходит сквозь чужую стопу', through === 0, through ? `${through} тактов, заход на ${(-worst).toFixed(0)} мм` : '');

check('нет ошибок выполнения', errs.length === 0, errs.join('; '));
console.log(failed ? `\nПровалено проверок: ${failed}` : '\nВсе проверки пройдены');
process.exit(failed ? 1 : 0);
