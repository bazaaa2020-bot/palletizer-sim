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
w.eval(`CFG.conveyors[0].feed='rate';CFG.conveyors[0].rate=20;CFG.exch.reaction=5;CFG.sheet.cap=8;CFG.sheet.low=2;renderCfg();buildSim();renderArch();`);
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

check('нет ошибок выполнения', errs.length === 0, errs.join('; '));
console.log(failed ? `\nПровалено проверок: ${failed}` : '\nВсе проверки пройдены');
process.exit(failed ? 1 : 0);
