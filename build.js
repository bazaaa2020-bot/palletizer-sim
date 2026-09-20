#!/usr/bin/env node
// Сборка одного самодостаточного HTML из частей в src/.
// Порядок важен: разметка → справочники и расчёты → 3D → UI и симуляция → закрывающие теги.
const fs = require('fs');
const path = require('path');

const ORDER = [
  'index.head.html',        // <head>, CSS, разметка всех вкладок, открывающий <script>
  '01-catalog-and-calc.js', // каталоги, схемы укладки, захват, компоновка, derive(), сигналы, BOM, оптимизатор, текст алгоритма
  '01b-safety-pl.js',     // Performance Level по ISO 13849-1: граф рисков, MTTFd, DCavg, CCF, категории
  '01c-risk-12100.js',    // оценка риска по ISO 12100: реестр опасностей, три шага мер, остаточный риск
  '01d-oee.js',           // смена, категории простоев, OEE, сценарии тревог
  '01e-grafcet.js',       // редактор логики ПЛК: GRAFCET как данные, исполнение, проверка, сравнение с эталоном
  '01f-mix.js',           // смешанная паллета: рецепт ярусов, разворот в слои, проверки рецепта
  '02-view3d.js',           // three.js: сцена, кинематика робота, тележки
  '03-ui-and-sim.js',       // конфигуратор, архитектура, симуляция, задания, инициализация
  '04-report.js',          // обмен конфигурацией (json), отчёт по ячейке, 2D-схема с габаритами
  'index.tail.html',        // </script></body></html>
];

const src = path.join(__dirname, 'src');
const out = path.join(__dirname, 'dist', 'palletizer-sim.html');
const html = ORDER.map(f => fs.readFileSync(path.join(src, f), 'utf8')).join('');

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);

// Быстрая проверка синтаксиса: скрипт должен парситься.
const js = html.split('<script>')[1].split('</script>')[0];
try { new Function(js); } catch (e) {
  console.error('Синтаксическая ошибка в собранном скрипте:', e.message);
  process.exit(1);
}
console.log(`Собрано: ${out} (${(html.length / 1024).toFixed(0)} КБ), синтаксис в порядке`);
