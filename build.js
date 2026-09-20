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
  '01g-eco.js',           // экономика: капитальные затраты из конфигурации, текущие, сравнение с ручной, окупаемость
  '02-view3d.js',           // three.js: сцена, кинематика робота, тележки
  '03-ui-and-sim.js',       // конфигуратор, архитектура, симуляция, задания, инициализация
  '04-report.js',          // обмен конфигурацией (json), отчёт по ячейке, 2D-схема с габаритами
  '05-pwa.js',            // установка как приложения, service worker, работа с файлами
  'index.tail.html',        // </script></body></html>
];

// ---------- иконки PWA ----------
// Рисуем прямоугольниками и кодируем PNG вручную: zlib есть в Node, а тащить графический
// пакет ради трёх иконок — нарушать правило «без зависимостей».
const zlib = require('zlib');
let CRC_T = null;
function crc32(buf) {
  if (!CRC_T) { CRC_T = new Int32Array(256);
    for (let n = 0; n < 256; n++) { let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
      CRC_T[n] = c; } }
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_T[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function pngChunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function pngRGB(size, rgb) {                 // rgb: Buffer size*size*3
  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y++) {          // фильтр 0 в начале каждой строки
    raw[y * (size * 3 + 1)] = 0;
    rgb.copy(raw, y * (size * 3 + 1) + 1, y * size * 3, (y + 1) * size * 3);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;   // 8 бит, truecolor
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr), pngChunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0))]);
}
// Иконка: оранжевый манипулятор над стопой коробок на паллете. Всё содержимое лежит внутри
// центральных 76 % — маска Android под круг ничего не срежет.
const ICON = { bg: [0x1E, 0x27, 0x30], rects: [
  [0.16, 0.14, 0.24, 0.50, 0xE0, 0x76, 0x2C], [0.16, 0.14, 0.62, 0.22, 0xE0, 0x76, 0x2C],
  [0.54, 0.22, 0.70, 0.30, 0xE0, 0x76, 0x2C],
  [0.38, 0.34, 0.66, 0.52, 0xD9, 0xBC, 0x8A],
  [0.26, 0.54, 0.52, 0.72, 0xC9, 0xA6, 0x6B], [0.54, 0.54, 0.80, 0.72, 0xC9, 0xA6, 0x6B],
  [0.20, 0.74, 0.86, 0.80, 0x8A, 0x6F, 0x45],
  [0.22, 0.80, 0.30, 0.86, 0x8A, 0x6F, 0x45], [0.49, 0.80, 0.57, 0.86, 0x8A, 0x6F, 0x45],
  [0.76, 0.80, 0.84, 0.86, 0x8A, 0x6F, 0x45]] };
function icon(size) {
  const buf = Buffer.alloc(size * size * 3);
  for (let i = 0; i < size * size; i++) { buf[i * 3] = ICON.bg[0]; buf[i * 3 + 1] = ICON.bg[1]; buf[i * 3 + 2] = ICON.bg[2]; }
  ICON.rects.forEach(r => {
    const x0 = Math.round(r[0] * size), y0 = Math.round(r[1] * size);
    const x1 = Math.round(r[2] * size), y1 = Math.round(r[3] * size);
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const i = (y * size + x) * 3; buf[i] = r[4]; buf[i + 1] = r[5]; buf[i + 2] = r[6]; }
  });
  return pngRGB(size, buf);
}

const src = path.join(__dirname, 'src');
const out = path.join(__dirname, 'dist', 'palletizer-sim.html');
let html = ORDER.map(f => fs.readFileSync(path.join(src, f), 'utf8')).join('');

// three.js вшивается в файл, а не тянется из сети: тренажёр должен открываться без интернета.
// Ревизия и порядок обновления — vendor/README.md.
const THREE_MARK = '<!--THREE-->';
if (!html.includes(THREE_MARK)) {
  console.error(`В src/index.head.html нет метки ${THREE_MARK} — некуда вставить three.js`);
  process.exit(1);
}
const lib = fs.readFileSync(path.join(__dirname, 'vendor', 'three.min.js'), 'utf8');
if (lib.includes('</script')) {           // иначе библиотека закрыла бы тег и порвала разметку
  console.error('В vendor/three.min.js есть </script — вшить как есть нельзя');
  process.exit(1);
}
html = html.replace(THREE_MARK, `<script id="three-lib">\n${lib}\n</script>`);

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);

// Офлайн: в собранном файле не должно остаться ни одной внешней ссылки.
// Пространства имён XML (SVG, xlink) — не загрузка, их пропускаем.
const NS_OK = ['http://www.w3.org/2000/svg', 'http://www.w3.org/1999/xlink',
  'http://www.w3.org/2000/xmlns/', 'http://www.w3.org/1999/xhtml'];
const urls = [...new Set((html.match(/https?:\/\/[^"'\s<>)]+/g) || []))].filter(u => !NS_OK.includes(u));
if (urls.length) {
  console.error('Файл ходит наружу — офлайн сломан:\n  ' + urls.join('\n  '));
  process.exit(1);
}

// Быстрая проверка синтаксиса: скрипт должен парситься.
const js = html.split('<script>')[1].split('</script>')[0];
try { new Function(js); } catch (e) {
  console.error('Синтаксическая ошибка в собранном скрипте:', e.message);
  process.exit(1);
}
// ---------- PWA: манифест, service worker, иконки ----------
// Сам HTML остаётся самодостаточным и работает с диска; эти файлы нужны только когда
// тренажёр раздают по сети — тогда он ставится как приложение и работает офлайн.
const dist = path.dirname(out), pwa = path.join(src, 'pwa');
const stamp = require('crypto').createHash('sha1').update(html).digest('hex').slice(0, 10);
fs.writeFileSync(path.join(dist, 'manifest.webmanifest'), fs.readFileSync(path.join(pwa, 'manifest.webmanifest'), 'utf8'));
fs.writeFileSync(path.join(dist, 'sw.js'), fs.readFileSync(path.join(pwa, 'sw.js'), 'utf8').replace('__CACHE__', 'pal-sim-' + stamp));
fs.writeFileSync(path.join(dist, 'icon-192.png'), icon(192));
fs.writeFileSync(path.join(dist, 'icon-512.png'), icon(512));
fs.writeFileSync(path.join(dist, 'icon-maskable-512.png'), icon(512));
try { JSON.parse(fs.readFileSync(path.join(dist, 'manifest.webmanifest'), 'utf8')); }
catch (e) { console.error('Манифест не парсится как JSON:', e.message); process.exit(1); }

console.log(`Собрано: ${out} (${(html.length / 1024).toFixed(0)} КБ, из них three.js ${(lib.length / 1024).toFixed(0)} КБ), синтаксис в порядке, внешних ссылок нет`);
console.log(`PWA: manifest.webmanifest, sw.js (кэш pal-sim-${stamp}), иконки 192/512/maskable`);
