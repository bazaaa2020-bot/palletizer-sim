#!/usr/bin/env node
// Локальная раздача dist/ — чтобы посмотреть собранный файл и проверить установку как
// приложения: service worker работает только по http(s), с диска (file://) он недоступен.
const http = require('http'), fs = require('fs'), path = require('path');
const DIST = path.join(__dirname, 'dist'), PORT = +process.env.PORT || 8080;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8', '.png': 'image/png',
  '.json': 'application/json; charset=utf-8', '.csv': 'text/csv; charset=utf-8' };

http.createServer((q, s) => {
  let name = decodeURIComponent(q.url.split('?')[0]);
  if (name === '/' ) name = '/palletizer-sim.html';
  const file = path.join(DIST, path.basename(name));   // только плоский dist, без выхода наверх
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    s.statusCode = 404; s.setHeader('content-type', 'text/plain; charset=utf-8');
    return s.end('Нет такого файла в dist/. Соберите: npm run build');
  }
  s.setHeader('content-type', MIME[path.extname(file)] || 'application/octet-stream');
  s.setHeader('cache-control', 'no-cache');            // кэширует service worker, а не браузер
  s.end(fs.readFileSync(file));
}).listen(PORT, () => {
  console.log(`http://localhost:${PORT} — тренажёр раздаётся из dist/`);
  console.log('Установка как приложения: значок в адресной строке Chrome или Edge.');
});
