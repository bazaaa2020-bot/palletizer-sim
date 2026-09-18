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

check('нет ошибок выполнения', errs.length === 0, errs.join('; '));
console.log(failed ? `\nПровалено проверок: ${failed}` : '\nВсе проверки пройдены');
process.exit(failed ? 1 : 0);
