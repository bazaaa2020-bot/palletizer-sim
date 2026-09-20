#!/usr/bin/env node
// Дымовой тест без браузера: грузит собранный файл в jsdom, прогоняет цикл ячейки,
// проверяет переходы PackML, укладку, обмен паллет и отсутствие ошибок в консоли.
// three.js в jsdom не грузится — 3D-вид корректно отключается сам, это часть проверки.
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'dist', 'palletizer-sim.html');
const raw = fs.readFileSync(file, 'utf8');
// three.js вшит в файл; вырезаем его, чтобы проверить, что 3D-вид корректно отключается
// без библиотеки — и заодно не гонять 600 КБ чужого кода через jsdom на каждом прогоне.
let html = raw
  .replace(/requestAnimationFrame\(loop\);/g, '')              // цикл крутим вручную
  .replace(/<script id="three-lib">[\s\S]*?<\/script>/, '');

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

console.log('Офлайн: файл самодостаточный');
{ const NS_OK = ['http://www.w3.org/2000/svg', 'http://www.w3.org/1999/xlink',
    'http://www.w3.org/2000/xmlns/', 'http://www.w3.org/1999/xhtml'];
  const urls = [...new Set((raw.match(/https?:\/\/[^"'\s<>)]+/g) || []))].filter(u => NS_OK.indexOf(u) < 0);
  check('в собранном файле нет ни одной внешней ссылки', urls.length === 0, urls.join(', '));
  check('нет внешних <link> и <script src>', !/<link[^>]+href="https?:/.test(raw) && !/<script[^>]+src="https?:/.test(raw));
  const lib = raw.match(/<script id="three-lib">([\s\S]*?)<\/script>/);
  check('three.js вшит в файл', !!lib && lib[1].length > 300000 && lib[1].indexOf('Three.js Authors') > 0,
    lib ? `${(lib[1].length / 1024).toFixed(0)} КБ` : 'блока нет');
  check('вырезание библиотеки оставляет рабочий файл', html.length > 300000 && html.indexOf('three-lib') < 0); }

console.log('PWA: установка как приложения и работа с файлами');
{ const dist = path.join(__dirname, '..', 'dist');
  const man = JSON.parse(fs.readFileSync(path.join(dist, 'manifest.webmanifest'), 'utf8'));
  check('манифест собран и парсится',
    man.name.length > 5 && man.display === 'standalone' && man.start_url.indexOf('palletizer-sim.html') > 0);
  check('в манифесте есть иконки 192, 512 и maskable',
    man.icons.length === 3 && man.icons.some(i => i.sizes === '192x192') &&
    man.icons.some(i => i.purpose === 'maskable'));
  check('иконки лежат рядом и это настоящие PNG нужного размера',
    man.icons.every(i => { const p = path.join(dist, i.src); if (!fs.existsSync(p)) return false;
      const b = fs.readFileSync(p), sig = b.slice(0, 8).toString('hex') === '89504e470d0a1a0a';
      const w = b.readUInt32BE(16), h = b.readUInt32BE(20), want = +i.sizes.split('x')[0];
      return sig && w === want && h === want; }));
  const sw = fs.readFileSync(path.join(dist, 'sw.js'), 'utf8');
  check('версия кэша в service worker проставлена сборщиком',
    /const CACHE = 'pal-sim-[0-9a-f]{10}'/.test(sw) && sw.indexOf('__CACHE__') < 0);
  check('service worker кэширует сам тренажёр, манифест и иконки',
    ['palletizer-sim.html', 'manifest.webmanifest', 'icon-192.png'].every(f => sw.indexOf(f) > 0) &&
    /addEventListener\('fetch'/.test(sw));
  check('старые кэши чистятся при активации', /caches\.delete/.test(sw) && /clients\.claim/.test(sw)); }

check('страница ссылается на манифест относительным путём — с диска просто не найдётся',
  /<link rel="manifest" href="manifest\.webmanifest">/.test(raw) && raw.indexOf('theme-color') > 0);
check('service worker регистрируется только по http(s)', (() => {
  const m = raw.match(/if\(location\.protocol!=='http:'&&location\.protocol!=='https:'\)return;/);
  return !!m && raw.indexOf("navigator.serviceWorker.register('sw.js')") > 0; })());
check('в jsdom без service worker регистрация ничего не сломала', errs.length === 0, errs.join('; '));
check('кнопка установки спрятана, пока браузер не предложил',
  d.getElementById('bInstall').hidden === true);

// Работа с файлами: без File System Access API всё должно падать на прежний путь.
// Обе функции асинхронные, поэтому здесь только запускаем их, а результат проверяем
// в самом конце прогона — к тому времени микрозадачи точно успели отработать.
check('File System Access API в этом окружении нет', w.eval('hasFS()') === false);
w.eval(`window.__sf='ждём';saveFile('x.json','json','{}').then(r=>{window.__sf=r.ok;},e=>{window.__sf='исключение: '+e;});
 window.__of='ждём';openFile('json').then(r=>{window.__of=r.ok;},e=>{window.__of='исключение: '+e;});`);
check('кнопка «Сохранить» заблокирована, пока файл не открыт',
  d.getElementById('bSaveCfgNow').disabled === true);
check('кнопки обмена конфигурацией на месте',
  ['bSaveCfgNow', 'bSaveCfg', 'bLoadCfg', 'bCopyCfg'].every(id => !!d.getElementById(id)));

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

console.log('Логистика: подъезд к позициям');
const routeCheck = () => w.eval(`(()=>{const D=DD,LY=D.LY,pal=D.pal,hw=LY.veh.w/2+100,F=LY.F,all=LY.robots.flatMap(r=>r.slots);
 const obs=all.map(s=>({id:s.id,x:s.cx,y:s.cy,ang:s.ang,hx:pal.W/2,hy:pal.L/2}))
  .concat(LY.robots.map(r=>({id:'R'+r.i,x:r.base.x,y:r.base.y,rad:400})))
  .concat(LY.convs.map((cv,k)=>({id:'CV'+k,x:(cv.x0+cv.x1)/2,y:cv.y,ang:0,hx:cv.len/2,hy:cv.w/2})));
 const bad=[];
 all.forEach(s=>{const c0={x:s.cx,y:s.cy},pts=[c0].concat(s.route);
  const dx=pts[1].x-c0.x,dy=pts[1].y-c0.y,L=Math.hypot(dx,dy)||1,off=pal.L/2+150;
  const chk=off<L?[{x:c0.x+dx/L*off,y:c0.y+dy/L*off}].concat(pts.slice(1)):pts.slice(1);
  for(let k=1;k<chk.length;k++)for(const o of obs){if(o.id===s.id)continue;
   if(o.rad!==undefined?segCircle(chk[k-1],chk[k],o,hw):segBox(chk[k-1],chk[k],o,hw))bad.push(s.id+'↔'+o.id);}
  const p=s.park;if(p.x>F.x0-50&&p.x<F.x1+50&&p.y>F.y0-50&&p.y<F.y1+50)bad.push(s.id+': парковка внутри');});
 return{bad:[...new Set(bad)],blocked:LY.blocked};})()`);
let cfgN = 0; const cfgBad = [], cfgBlocked = [];
for (const robots of [1, 2]) for (const stations of [1, 2, 3, 4]) for (const out of ['jack', 'forklift', 'amr', 'conveyor']) {
  if (robots * stations > 6) continue;
  w.eval(`CFG=JSON.parse(JSON.stringify(DEF));CFG.robot='pl130';CFG.robots=${robots};CFG.stations=${stations};CFG.exch.out='${out}';`
    + `while(CFG.conveyors.length<${robots})CFG.conveyors.push(JSON.parse(JSON.stringify(CFG.conveyors[0])));DD=derive(CFG);`);
  const r = routeCheck(); cfgN++;
  if (r.bad.length) cfgBad.push(`${robots}р${stations}ст ${out}: ${r.bad.join(',')}`);
  if (r.blocked.length) cfgBlocked.push(`${robots}р${stations}ст ${out}: ${r.blocked.join(',')}`);
}
check('маршруты подъезда свободны во всех компоновках', cfgBad.length === 0, `${cfgN} компоновок; ` + cfgBad.slice(0, 2).join('; '));
check('запертых позиций нет', cfgBlocked.length === 0, cfgBlocked.slice(0, 2).join('; '));

w.eval(`CFG=JSON.parse(JSON.stringify(DEF));CFG.robot='pl130';CFG.robots=2;CFG.stations=2;CFG.conveyors.push(JSON.parse(JSON.stringify(CFG.conveyors[0])));CFG.conveyors.forEach(x=>{x.feed='rate';x.rate=40;});CFG.exch.reaction=4;CFG.boxes[0].layers=1;renderCfg();buildSim();renderArch();`);
click('#bReset'); run(2); click('#bStart'); run(1);
const duo = w.eval(`(()=>{const pal=DD.pal,hits={};let at=0;
 for(let i=0;i<3000;i++){tick(0.05);
  S.agents.forEach(a=>{at++;const t=o=>{let ins;
   if(o.rad!==undefined)ins=Math.hypot(a.x-o.x,a.y-o.y)<o.rad;
   else{const th=-(o.ang||0)*Math.PI/180,dx=a.x-o.x,dy=a.y-o.y;
    const lx=dx*Math.cos(th)-dy*Math.sin(th),ly=dx*Math.sin(th)+dy*Math.cos(th);
    ins=Math.abs(lx)<o.hx&&Math.abs(ly)<o.hy;}
   if(ins)hits[a.target.id+'↔'+o.t]=1;};
   DD.LY.robots.forEach(r=>{t({t:'робот'+(r.i+1),x:r.base.x,y:r.base.y,rad:400});
    r.slots.forEach(sl=>{if(sl.id!==a.target.id)t({t:sl.id,x:sl.cx,y:sl.cy,ang:sl.ang,hx:pal.W/2,hy:pal.L/2});});});});}
 return{keys:Object.keys(hits),at,exch:S.stats.exch};})()`);
check('две ячейки: тележка не идёт сквозь оборудование', duo.keys.length === 0, duo.keys.join(', '));
check('в двухроботной ячейке обмен паллет идёт', duo.exch > 0 && duo.at > 100, `обменов ${duo.exch}, тактов с тележками ${duo.at}`);

w.eval(`CFG=JSON.parse(JSON.stringify(DEF));renderCfg();buildSim();renderArch();`);

console.log('Отчёт и обмен конфигурацией');
w.eval(`CFG=JSON.parse(JSON.stringify(DEF));CFG.name='Тестовая ячейка';CFG.robot='pl130';CFG.robots=2;CFG.stations=2;CFG.grip.pick=4;CFG.grip.pitch='adj';CFG.motion.vPlace=120;CFG.boxes[0].l=450;CFG.conveyors.push(JSON.parse(JSON.stringify(CFG.conveyors[0])));renderCfg();buildSim();renderArch();`);
const round = w.eval(`(()=>{const txt=cfgJSON();const back=cfgFromJSON(txt);
 const keep=['robots','stations','robot','pallet','maxStack','patternMode','speedPct','name'];
 const diff=keep.filter(k=>String(back[k])!==String(CFG[k]));
 const deep2=[['grip.pick',back.grip.pick,CFG.grip.pick],['grip.pitch',back.grip.pitch,CFG.grip.pitch],
  ['motion.vPlace',back.motion.vPlace,CFG.motion.vPlace],['boxes0.l',back.boxes[0].l,CFG.boxes[0].l],
  ['conveyors',back.conveyors.length,CFG.conveyors.length]].filter(x=>String(x[1])!==String(x[2])).map(x=>x[0]);
 const o=JSON.parse(txt);
 return{bytes:txt.length,fmt:o.format,name:o.name,diff:diff.concat(deep2)};})()`);
check('конфигурация выгружается в json', round.bytes > 400 && round.fmt === 'palletizer-sim/config@1' && round.name === 'Тестовая ячейка', `${round.bytes} байт, format=${round.fmt}`);
check('выгрузка и загрузка не теряют параметров', round.diff.length === 0, 'разошлись: ' + round.diff.join(', '));

const bad = w.eval(`(()=>{const r=[];
 [['{"нет":1}','мусор'],['{"cfg":{"boxes":[]}}','без conveyors'],['не json','битый текст']].forEach(([t,n])=>{
  try{cfgFromJSON(t);r.push(n+': принят');}catch(e){}});
 return r;})()`);
check('битый файл конфигурации отвергается', bad.length === 0, bad.join('; '));

const applied = w.eval(`(()=>{const txt=cfgJSON();CFG=JSON.parse(JSON.stringify(DEF));renderCfg();buildSim();
 CFG=cfgFromJSON(txt);renderCfg();buildSim();renderArch();
 return{robots:CFG.robots,pick:CFG.grip.pick,name:CFG.name,stations:DD.stations.length,placed:S.stats.placed};})()`);
check('загруженная конфигурация применяется к симуляции', applied.robots === 2 && applied.pick === 4 && applied.stations === 4, JSON.stringify(applied));

const rep = w.eval(`(()=>{const c=normalize(CFG),D=derive(c);const h=reportHTML(c,D,'');
 const svg=planSVG(c,D,1000);
 const need=['Коротко','Робот и движения','Захват','Тара и схемы укладки','Паллеты, станции и обмен','Конвейеры подачи','Безопасность и АСУ ТП','Схема участка с габаритами','Спецификация','Список сигналов','Замечания расчёта'];
 const miss=need.filter(x=>h.indexOf(x)<0);
 const std=reportStandalone(c,D,'');
 return{len:h.length,miss,svgLen:svg.length,dims:(svg.match(/class="dimt"/g)||[]).length,
  marker:svg.indexOf('marker-end')>=0,std:std.length,stdHead:std.slice(0,15),
  note3d:h.indexOf('3D-вид недоступен')>=0};})()`);
check('отчёт собирается со всеми разделами', rep.miss.length === 0 && rep.len > 4000, `${rep.len} символов; нет: ${rep.miss.join(', ')}`);
check('в отчёте схема участка с размерными линиями', rep.svgLen > 2000 && rep.dims >= 4 && rep.marker, `${rep.dims} размеров, ${rep.svgLen} символов`);
check('без three.js отчёт честно пишет, что 3D нет', rep.note3d);
check('отдельный файл отчёта — валидный html', rep.stdHead.indexOf('<!doctype html>') === 0 && rep.std > rep.len, `${rep.std} байт`);

w.eval(`CFG=JSON.parse(JSON.stringify(DEF));renderCfg();buildSim();renderArch();`);

console.log('Тара произвольной формы и подбор захвата (п. 11)');
const fit = (shape, mat, type) => w.eval(`gripFit({name:'x',l:300,w:300,h:200,m:10,shape:'${shape}',mat:'${mat}'},'${type}').s`);
check('решётчатый верх вакуумом не взять', fit('crate', 'plastic', 'cups') === 'bad' && fit('crate', 'plastic', 'foam') === 'bad');
check('термоусадка вакуумом — с оговоркой', fit('shrink', 'film', 'cups') === 'warn');
check('магнит только по стали', fit('box', 'metal', 'mag') === 'ok' && fit('box', 'carton', 'mag') === 'bad' && fit('box', 'alu', 'mag') === 'bad');
check('лист с боков не зажать', fit('plate', 'metal', 'clamp') === 'bad');
check('подбор предлагает годный захват', w.eval(`(()=>{const b={name:'x',l:600,w:400,h:300,m:12,shape:'crate',mat:'plastic'};
 const best=gripBest(b);return best.length>0&&best.every(t=>gripFit(b,t).s==='ok');})()`));
check('цилиндр описывается квадратом со стороной диаметра', w.eval(`(()=>{CFG=JSON.parse(JSON.stringify(DEF));
 CFG.boxes[0]=Object.assign(CFG.boxes[0],{l:320,w:180,h:120,shape:'cyl',mat:'metal'});normalize(CFG);return CFG.boxes[0].w===320;})()`));
const mag = w.eval(`(()=>{CFG=JSON.parse(JSON.stringify(DEF));CFG.robot='pl130';
 CFG.boxes[0]={name:'Лист',l:600,w:400,h:4,m:7.5,rate:0,layers:0,shape:'plate',mat:'metal'};
 CFG.grip.type='mag';renderCfg();DD=derive(CFG);
 const t=DD.grip;CFG.boxes[0].h=10;normalize(CFG);const t2=gripCalc(CFG,robotOf(CFG),CFG.boxes[0]);
 return{status:t.status,F:t.Fcap,Fth:t.Fth,p1:t.pMag,p2:t2.pMag};})()`);
check('магнитный захват считается по толщине металла', mag.p2 > mag.p1 && mag.F > 0 && mag.Fth > 0, `${mag.p1} → ${mag.p2} Н/мм²`);

console.log('Направляющие, центрирование и зрение (п. 10 и 12)');
const base = (infeed, align, vision, extra) => w.eval(`(()=>{CFG=JSON.parse(JSON.stringify(DEF));CFG.robot='pl130';
 ${extra || ''}CFG.conveyors[0].infeed='${infeed}';CFG.conveyors[0].align='${align}';CFG.vision.mode='${vision}';
 renderCfg();DD=derive(CFG);const x=DD.base[0];
 return{gx:x.gx,ga:x.ga,dx:x.dx,da:x.da,tol:x.tol,ok:x.ok,need:x.need,visOK:DD.visOK,tVis:DD.tVision,model:DD.tCycleModel};})()`);
const b1 = base('oriented', 'stop', 'none');
check('ориентированная подача с упором укладывается в допуск', b1.ok && b1.need === 'none', `±${b1.gx} мм при допуске ±${b1.tol.dx.toFixed(0)}`);
const b2 = base('random', 'none', 'none');
check('без направляющих разброс выходит за допуск', !b2.ok && b2.need === '2d', `need=${b2.need}`);
check('и это видно как невыполненное требование к зрению', b2.visOK === false);
const b3 = base('random', 'none', '2d');
check('2D-камера доводит позу до допуска', b3.ok && b3.visOK, `±${b3.dx} мм`);
check('кадр камеры входит в такт', b3.tVis > 0 && b3.model > b2.model, `${b2.model.toFixed(2)} → ${b3.model.toFixed(2)} с`);
const b4 = base('multi', 'guides', 'none');
check('переменная высота требует 3D', b4.need === '3d', b4.need);
const b5 = base('random', 'none', 'none', `CFG.boxes[0].mat='glass';`);
check('прозрачная тара требует структурированного света', b5.need === 'struct', b5.need);
const b6 = base('random', 'guides', 'none', `CFG.boxes[0]=Object.assign(CFG.boxes[0],{shape:'cyl',mat:'metal',l:300,w:300});`);
check('для круглой тары угол не ограничивает', b6.ga === 0 && b6.da === 0);

const miss = w.eval(`(()=>{CFG=JSON.parse(JSON.stringify(DEF));CFG.robot='pl130';
 CFG.conveyors[0].infeed='random';CFG.conveyors[0].align='none';CFG.vision.mode='none';
 CFG.conveyors[0].feed='rate';CFG.conveyors[0].rate=40;renderCfg();buildSim();
 document.getElementById('bReset').click();for(let i=0;i<40;i++)tick(0.05);
 document.getElementById('bStart').click();for(let i=0;i<4000;i++)tick(0.05);
 const bad=S.stats.missed;
 CFG.conveyors[0].align='center';renderCfg();buildSim();
 document.getElementById('bReset').click();for(let i=0;i<40;i++)tick(0.05);
 document.getElementById('bStart').click();for(let i=0;i<4000;i++)tick(0.05);
 return{bad,good:S.stats.missed,placed:S.stats.placed};})()`);
check('без центрирования робот промахивается', miss.bad > 0, `промахов ${miss.bad}`);
check('с центрированием промахов нет', miss.good === 0 && miss.placed > 10, `промахов ${miss.good}, уложено ${miss.placed}`);

console.log('Performance Level по ISO 13849-1 (п. 2)');
// формулы стандарта проверяем точечно, по таблицам
const g = expr => w.eval(expr);
check('граф рисков: S1F1P1 → a, S2F2P2 → e', g("plRequired(1,1,1)") === 'a' && g("plRequired(2,2,2)") === 'e');
check('граф рисков: S2F2P1 → d (типовая паллетизация)', g("plRequired(2,2,1)") === 'd');
check('рис. 5: кат. B с диагностикой не даёт PL', g("plFromBar('B','high','med')") === null);
check('рис. 5: кат. 1 даёт PL c только при высоком MTTFd', g("plFromBar('1','high','none')") === 'c' && g("plFromBar('1','med','none')") === null);
check('рис. 5: кат. 3 со средними DC и высоким MTTFd → PL d', g("plFromBar('3','high','med')") === 'd');
check('рис. 5: PL e только у кат. 4 при высоких MTTFd и DC', g("plFromBar('4','high','high')") === 'e' && g("plFromBar('3','high','high')") === null);
check('рис. 5: MTTFd ниже 3 лет не даёт PL ни при какой категории',
  ['B','1','2','3','4'].every(c => g(`plFromBar('${c}','bad','high')`) === null));
check('таблица 11: три подсистемы PL d дают PL d, четыре — PL c',
  g("plSeries(['d','d','d'])") === 'd' && g("plSeries(['d','d','d','d'])") === 'c');
check('таблица 11: три подсистемы PL c дают PL b', g("plSeries(['c','c','c'])") === 'b');
check('таблица 11: неопределённая подсистема обнуляет функцию', g("plSeries(['d',null,'e'])") === null);
check('симметризация приложения D на одинаковых каналах возвращает канал',
  Math.abs(g("mttfdSym(30,30)") - 30) < 1e-9, String(g("mttfdSym(30,30)")));
check('B10d → MTTFd: вдвое больше срабатываний — вдвое меньше MTTFd',
  Math.abs(g("compMTTFd({b10d:1e5,ops:10},{dop:240,hop:16})") / g("compMTTFd({b10d:1e5,ops:20},{dop:240,hop:16})") - 2) < 1e-9);
check('CCF: полный набор мер — 100 баллов, порог 65',
  g("ccfScore(CCF_ITEMS.map(x=>x[0]))") === 100 && g("CCF_NEED") === 65);

const pl = extra => w.eval(`(()=>{CFG=JSON.parse(JSON.stringify(DEF));${extra || ''}normalize(CFG);
 const D=derive(CFG,true),P=D.pl;
 return{plr:P.plr,worst:P.worst,ok:P.ok,ccf:P.ccf,ccfOK:P.ccfOK,n:P.sf.length,
  ids:P.sf.map(f=>f.id+':'+f.pl).join(' '),issues:P.sf.some(f=>f.res.some(r=>r.issues.length)),
  warn:D.warnings.filter(x=>/PL |общей причине|EDM|канальн/.test(x)).length};})()`);

const p0 = pl();
check('типовая ячейка: требуется PL d и он достигается', p0.plr === 'd' && p0.worst === 'd' && p0.ok, `${p0.worst} / ${p0.plr}`);
check('функций безопасности с ограждением — четыре', p0.n === 4, p0.ids);
check('замечаний по PL при типовой конфигурации нет', p0.warn === 0);
const p1 = pl(`CFG.pl.arch='catB';`);
check('категория B не даёт требуемого PL d', !pl(`CFG.pl.arch='catB';`).ok);
check('и это попадает в замечания', p1.warn > 0, `замечаний ${p1.warn}`);
const p2 = pl(`CFG.pl.ccf=['well','train'];`);
check('без мер против отказов по общей причине расчёт недействителен',
  p2.ccfOK === false && p2.worst === null && p2.issues, `${p2.ccf} баллов`);
const p3 = pl(`CFG.pl.edm=false;`);
check('выключенный EDM снижает диагностику и поднимает замечание', p3.warn > 0, `замечаний ${p3.warn}`);
const p4 = pl(`CFG.pl.opsES=200;CFG.pl.opsLC=400;CFG.pl.opsDoor=200;`);
check('частые срабатывания роняют MTTFd и уровень', !p4.ok || p4.worst !== 'd', `${p4.worst}`);
const p5 = pl(`CFG.pl.S=1;CFG.pl.F=1;CFG.pl.P=1;`);
check('лёгкий риск требует всего PL a', p5.plr === 'a' && p5.ok);
const p6 = pl(`CFG.robot='cb20';CFG.safety='cobot';`);
check('у кобота свой набор функций: поле сканера и снижение скорости',
  p6.n === 3 && /SF4/.test(p6.ids), p6.ids);
check('вкладка PL отрисовывается', (() => { w.eval('showTab("pl")');
  return d.getElementById('plSF').innerHTML.length > 500 && d.getElementById('plBar').innerHTML.length > 500; })());
check('раздел PL попадает в отчёт', w.eval(`reportHTML(CFG,derive(CFG),null)`).indexOf('Performance Level') > 0);
w.eval('showTab("sim")');

console.log('Экономика: стоимость и окупаемость (п. 8)');
const eco = extra => w.eval(`(()=>{CFG=JSON.parse(JSON.stringify(DEF));${extra || ''}normalize(CFG);
 const D=derive(CFG),E=D.eco;
 return{cap:E.cap.total,equip:E.cap.equip,lines:E.cap.lines.map(l=>({n:l.n,q:l.q,sum:l.sum})),
  kW:E.pw.kW,pw:E.pw.lines.map(l=>l.n),cell:E.cellYear,man:E.manYear,people:E.people,perShift:E.perShift,
  save:E.save,pay:E.pay,payD:E.payD,npv:E.npv,irr:E.irr,years:E.years,hours:E.hours,shifts:E.shifts,
  flow:E.flow.map(f=>f.cum),sens:E.sens.map(x=>x.base),unit:E.unitCost,warn:E.warn,
  wAll:D.warnings.filter(x=>/^Экономика/.test(x)).length};})()`);

const E0 = eco();
check('капитальные затраты складываются из статей',
  Math.abs(E0.cap - E0.lines.reduce((a, l) => a + l.sum, 0)) < 1e-6 && E0.cap > E0.equip);
check('количества берутся из конфигурации, а не вводятся', (() => {
  const one = eco(`CFG.robots=1;CFG.conveyors=[CFG.conveyors[0]];`);
  const two = eco(`CFG.robots=2;CFG.conveyors.push(JSON.parse(JSON.stringify(CFG.conveyors[0])));`);
  const r1 = one.lines.find(l => /Кобот|Паллетайзер|Промышленный/.test(l.n));
  const r2 = two.lines.find(l => /Кобот|Паллетайзер|Промышленный/.test(l.n));
  return r1.q === 1 && r2.q === 2 && two.cap > one.cap; })());
check('цена робота масштабируется коэффициентом каталога', (() => {
  const a = eco(`CFG.robot='cb5';`), b = eco(`CFG.robot='pl185';`);
  const ra = a.lines.find(l => /Кобот 5/.test(l.n)), rb = b.lines.find(l => /Паллетайзер 185/.test(l.n));
  return Math.abs(rb.sum / ra.sum - 5.0 / 1.0) < 1e-6; })());
check('длина конвейеров идёт в смету метрами',
  Math.abs(E0.lines.find(l => /Конвейеры подачи/.test(l.n)).q -
    w.eval('CFG.conveyors.reduce((s,x)=>s+x.len,0)')) < 1e-9);
check('периметр ограждения берётся из компоновки', (() => {
  const l = E0.lines.find(x => /Ограждение/.test(x.n));
  return Math.abs(l.q - w.eval('derive(CFG).fencePerim') / 1000) < 1e-6; })());
check('у кобота без ограждения в смете сканеры, а не завесы', (() => {
  const k = eco(`CFG.robot='cb20';CFG.safety='cobot';`);
  return k.lines.some(l => /сканер/i.test(l.n)) && !k.lines.some(l => /ограждение|завеса/i.test(l.n)); })());
check('работы считаются процентом от оборудования', (() => {
  const l = E0.lines.filter(x => /Проектирование|Монтаж/.test(x.n));
  return Math.abs(l[0].sum - E0.equip * w.eval('CFG.eco.engPct') / 100) < 1e-6 &&
    Math.abs(l[1].sum - E0.equip * w.eval('CFG.eco.instPct') / 100) < 1e-6; })());

check('мощность складывается из роботов, приводов, воздуха и шкафа',
  E0.kW > 0 && E0.pw.length >= 3 && Math.abs(E0.kW - w.eval('derive(CFG).eco.pw.lines.reduce((s,x)=>s+x.kW,0)')) < 1e-9);
check('второй робот поднимает потребление', eco(`CFG.robots=2;CFG.conveyors.push(JSON.parse(JSON.stringify(CFG.conveyors[0])));`).kW > E0.kW);
check('режим работы берётся с вкладки безопасности, а не дублируется',
  E0.hours === w.eval('CFG.pl.dop') * w.eval('CFG.pl.hop'));

check('людей на ручной укладке считается от потока и нормы', (() => {
  const a = eco(`CFG.eco.manRate=10000;`), b = eco(`CFG.eco.manRate=50;`);
  return a.perShift === 1 && b.perShift > a.perShift && b.man > a.man; })());
check('экономия — это разница текущих затрат', Math.abs(E0.save - (E0.man - E0.cell)) < 1e-9);
check('простой срок окупаемости — вложения делить на экономию',
  E0.save > 0 ? Math.abs(E0.pay - E0.cap / E0.save) < 1e-9 : E0.pay === null);
check('дорогая ручная укладка ускоряет окупаемость',
  eco(`CFG.eco.manSalary=3000;`).pay < E0.pay);
check('при нулевой экономии срок не считается, а появляется замечание', (() => {
  const z = eco(`CFG.eco.manSalary=0;`);
  return z.pay === null && z.save <= 0 && /Экономии нет/.test(z.warn.join(' ')); })());

check('накопленный поток начинается с минус вложений и растёт',
  Math.abs(E0.flow[0] + E0.cap) < 1e-6 && E0.flow.every((v, i) => i === 0 || v > E0.flow[i - 1]));
check('NPV равен последнему накопленному значению',
  Math.abs(E0.npv - E0.flow[E0.flow.length - 1]) < 1e-6);
check('при нулевой ставке дисконтированный срок совпадает с простым', (() => {
  const z = eco(`CFG.eco.rate=0;CFG.eco.years=25;`);
  return z.payD !== null && Math.abs(z.payD - z.pay) < 0.02; })());
check('IRR обращает NPV в ноль', (() => {
  const z = eco(`CFG.eco.manSalary=3000;CFG.eco.years=10;`);
  if (z.irr === null) return false;
  const v = w.eval(`npv(${z.irr},${-z.cap},${z.save},10)`);
  return Math.abs(v) < Math.max(1, z.cap * 1e-4); })());
check('ставка выше IRR даёт отрицательный NPV', (() => {
  const z = eco(`CFG.eco.manSalary=3000;CFG.eco.years=10;`);
  const hi = eco(`CFG.eco.manSalary=3000;CFG.eco.years=10;CFG.eco.rate=${Math.round(z.irr * 100) + 15};`);
  return hi.npv < 0 && z.npv > 0; })());
check('окупаемость по простому сроку при отрицательном NPV даёт замечание',
  E0.pay > 0 && E0.npv < 0 ? /всегда льстит проекту/.test(E0.warn.join(' ')) : true);
check('замечания экономики попадают в общий список', E0.wAll === E0.warn.length && E0.wAll > 0);

check('чувствительность: дороже оборудование — дольше окупаемость', (() => {
  const s = w.eval(`derive(CFG).eco.sens`);
  const cap = s.find(x => /Капитальные/.test(x.n));
  return cap.low < cap.base && cap.high > cap.base; })());
check('себестоимость укладки считается на коробку и на паллету',
  E0.unit.cellBox > 0 && E0.unit.manBox > E0.unit.cellBox && E0.unit.cellPal > E0.unit.cellBox);

check('значения экономики нормализуются', w.eval(`(()=>{CFG=JSON.parse(JSON.stringify(DEF));
  CFG.eco.years=99;CFG.eco.rate=-5;CFG.eco.manRate='мусор';CFG.eco.pRobot=-100;normalize(CFG);
  return CFG.eco.years===25&&CFG.eco.rate===0&&CFG.eco.manRate===DEF.eco.manRate&&CFG.eco.pRobot===0;})()`));
check('цены переживают выгрузку и загрузку конфигурации', w.eval(`(()=>{
  CFG=JSON.parse(JSON.stringify(DEF));CFG.eco.pRobot=4242;CFG.eco.years=9;normalize(CFG);
  const t=cfgFromJSON(cfgJSON());return t.eco.pRobot===4242&&t.eco.years===9;})()`));

w.eval(`CFG=JSON.parse(JSON.stringify(DEF));normalize(CFG);renderCfg();buildSim();showTab('eco');`);
check('вкладка экономики отрисовывается',
  d.getElementById('ecoCap').querySelectorAll('tr').length > 5 &&
  d.getElementById('ecoFlow').innerHTML.indexOf('<svg') === 0 &&
  d.getElementById('ecoText').innerHTML.length > 800);
check('график денежного потока рисует точку на каждый год',
  (d.getElementById('ecoFlow').innerHTML.match(/<circle/g) || []).length === w.eval('CFG.eco.years') + 1);
check('под графиком есть таблица с теми же числами',
  d.getElementById('ecoFlowT').querySelectorAll('tr').length === w.eval('CFG.eco.years') + 2);
{ const inp = d.querySelector('#ecoIn1 input[data-k="eco.pRobot"]');
  const was = w.eval('derive(CFG).eco.cap.total');
  inp.value = String(+inp.value * 2); inp.dispatchEvent(new w.Event('input', { bubbles: true }));
  check('правка цены в конфигураторе пересчитывает смету', w.eval('derive(CFG).eco.cap.total') > was); }
check('экономика выгружается в CSV', w.eval(`csvBuild('eco').text`).indexOf('Капитальные затраты') > 0);
check('экономика попадает в отчёт', w.eval(`reportHTML(CFG,derive(CFG),null)`).indexOf('Экономика: стоимость варианта') > 0);
w.eval(`CFG=JSON.parse(JSON.stringify(DEF));renderCfg();buildSim();renderArch();showTab('sim');`);

console.log('Смешанная паллета: рецепт укладки (п. 6)');
const MIXCFG = `CFG=JSON.parse(JSON.stringify(DEF));CFG.robot='pl130';
 CFG.boxes.push({name:'Ящик малый',l:300,w:200,h:150,m:4,rate:0,layers:0,shape:'box',mat:'carton'});
 CFG.boxes.push({name:'Тяжёлый',l:400,w:300,h:200,m:18,rate:0,layers:0,shape:'box',mat:'carton'});
 CFG.conveyors.push(JSON.parse(JSON.stringify(CFG.conveyors[0])));CFG.conveyors[1].box=1;
 CFG.conveyors.forEach(x=>{x.feed='rate';x.rate=25;});CFG.exch.reaction=4;`;
const mix = (rows, extra) => w.eval(`(()=>{${MIXCFG}${extra || ''}
 CFG.mix.on=true;CFG.mix.rows=${JSON.stringify(rows)};normalize(CFG);
 const D=derive(CFG,true),M=D.mix;
 return{ok:M.ok,layers:M.layers,total:M.total,mass:M.mass,height:M.height,sheets:M.sheets,groups:M.groups,
  arts:M.arts,rows:M.rows.map(r=>({bi:r.bi,n:r.n,inLayer:r.pat.n,fill:r.pat.fill,sheet:r.sheet})),
  rec:M.rec.map(r=>r.bi),recSheet:M.rec.map(r=>!!r.sheet),warn:M.warn,
  wAll:D.warnings.filter(x=>/Рецепт|Смешанная/.test(x)).length,cyc:D.cyclesPerPallet};})()`);

const M = mix([{ box: 0, layers: 2, sheet: false }, { box: 1, layers: 2, sheet: true }]);
check('рецепт разворачивается в слои снизу вверх',
  M.layers === 4 && M.rec.join(',') === '0,0,1,1', M.rec.join(','));
check('лист ложится под первым слоем своего яруса',
  M.recSheet.join(',') === 'false,false,true,false' && M.sheets === 1, M.recSheet.join(','));
check('итоги считаются по ярусам, а не по одной схеме',
  M.total === M.rows.reduce((a, r) => a + r.n * r.inLayer, 0) && M.total > 0, `${M.total} шт.`);
check('высота — сумма высот слоёв плюс листы',
  Math.abs(M.height - (w.eval('DD.pal.h') + 2 * 250 + 2 * 150 + 4)) < 1e-6, `${M.height} мм`);
check('масса — сумма по слоям плюс паллета',
  Math.abs(M.mass - (M.rows[0].n * M.rows[0].inLayer * 8 + M.rows[1].n * M.rows[1].inLayer * 4 + w.eval('DD.pal.m'))) < 1e-6);
check('в рецепте видны оба артикула', M.arts.length === 2 && M.arts.indexOf(0) >= 0 && M.arts.indexOf(1) >= 0);
check('циклов на паллету считается по ходам всех слоёв', M.cyc >= M.groups, `${M.cyc} против ${M.groups} ходов`);
check('исправный рецепт не даёт замечаний по ярусам', M.warn.length === 0, M.warn.join(' | '));

check('тяжёлый артикул сверху лёгкого — замечание',
  /тяжелее яруса под ним/.test(mix([{ box: 1, layers: 2, sheet: false }, { box: 2, layers: 1, sheet: true }],
    `CFG.conveyors[1].box=2;`).warn.join(' ')));
check('артикул без конвейера — замечание',
  /нет ни на одном конвейере/.test(mix([{ box: 0, layers: 2, sheet: false }, { box: 2, layers: 1, sheet: false }]).warn.join(' ')));
check('стопа выше лимита — замечание',
  /выше лимита/.test(mix([{ box: 0, layers: 8, sheet: false }, { box: 1, layers: 8, sheet: true }], `CFG.maxStack=900;`).warn.join(' ')));
check('один ярус — это не смешанная паллета',
  /один артикул/.test(mix([{ box: 0, layers: 3, sheet: false }]).warn.join(' ')));
check('замечания рецепта попадают в общий список', mix([{ box: 0, layers: 2, sheet: false }, { box: 2, layers: 1, sheet: false }]).wAll > 0);

// нормализация и обмен конфигурацией
check('битые ярусы чинятся при нормализации', w.eval(`(()=>{CFG=JSON.parse(JSON.stringify(DEF));
  CFG.mix.on=true;CFG.mix.rows=[null,{box:99,layers:-3,sheet:'да'},{box:'0',layers:'2'}];normalize(CFG);
  return CFG.mix.rows.length===2&&CFG.mix.rows[0].box===CFG.boxes.length-1&&CFG.mix.rows[0].layers===1&&CFG.mix.rows[0].sheet===true;})()`));
check('пустой рецепт выключает режим',
  w.eval(`(()=>{CFG=JSON.parse(JSON.stringify(DEF));CFG.mix.on=true;CFG.mix.rows=[];normalize(CFG);return CFG.mix.on===false&&CFG.mix.rows.length===1;})()`));
check('рецепт переживает выгрузку и загрузку', w.eval(`(()=>{${MIXCFG}
  CFG.mix.on=true;CFG.mix.name='Заказ №17';CFG.mix.rows=[{box:0,layers:2,sheet:false},{box:1,layers:3,sheet:true}];
  normalize(CFG);const t=cfgFromJSON(cfgJSON());
  return t.mix.on&&t.mix.name==='Заказ №17'&&t.mix.rows.length===2&&t.mix.rows[1].layers===3&&t.mix.rows[1].sheet===true;})()`));

// исполнение
const runMix = (rows, sec) => { w.eval(`${MIXCFG}CFG.mix.on=true;CFG.mix.rows=${JSON.stringify(rows)};
  normalize(CFG);renderCfg();buildSim();`);
  click('#bReset'); run(2); click('#bStart'); run(sec);
  return { placed: w.eval('S.stats.placed'), sheets: w.eval('S.stats.sheets'), pallets: w.eval('S.stats.pallets'),
    layer: w.eval('S.st[0].layer'), layers: w.eval('S.st[0].layers'), state: w.eval('S.packml'),
    bi: w.eval('biOf(S.st[0])'), conv: w.eval('convOf(S.st[0])'), mixOn: w.eval('S.st[0].mix') }; };

const mixRun = runMix([{ box: 0, layers: 1, sheet: false }, { box: 1, layers: 1, sheet: true }], 420);
check('станция знает, что собирает смешанную паллету', mixRun.mixOn === true && mixRun.layers === 2);
check('смешанная паллета собирается целиком', mixRun.pallets > 0, `паллет ${mixRun.pallets}, уложено ${mixRun.placed}`);
check('разделительный лист между артикулами уложен', mixRun.sheets > 0, `листов ${mixRun.sheets}`);
check('робот берёт тару с конвейера нужного артикула',
  w.eval(`S.st.every(s=>convOf(s)===CFG.conveyors.findIndex(x=>x.box===biOf(s)))`));

// моно-паллета не сломалась
w.eval(`CFG=JSON.parse(JSON.stringify(DEF));CFG.conveyors[0].feed='rate';CFG.conveyors[0].rate=25;
 CFG.exch.reaction=4;normalize(CFG);renderCfg();buildSim();`);
click('#bReset'); run(2); click('#bStart'); run(150);
check('моно-паллета работает как раньше: рецепт из одинаковых слоёв',
  w.eval('S.st[0].mix') === false && w.eval('S.st[0].layers') === w.eval('S.st[0].pat.layers') &&
  w.eval('S.st[0].rec.every(r=>r.bi===S.st[0].bi)') && w.eval('S.stats.placed') > 5);

// вкладки и выгрузка
w.eval(`${MIXCFG}CFG.mix.on=true;CFG.mix.rows=[{box:0,layers:2,sheet:false},{box:1,layers:2,sheet:true}];
 normalize(CFG);renderCfg();buildSim();`);
check('панель рецепта появляется в конфигураторе',
  d.querySelectorAll('#cfgMix .row.mix').length - 1 === w.eval('CFG.mix.rows.length'));
{ const sel = d.querySelector('#cfgMix select[data-k="mix.rows.1.box"]');
  sel.value = '2'; sel.dispatchEvent(new w.Event('input', { bubbles: true }));
  check('смена артикула яруса через конфигуратор пересчитывает рецепт',
    w.eval('CFG.mix.rows[1].box') === 2 && w.eval('derive(CFG,true).mix.warn.length') > 0);
  sel.value = '1'; sel.dispatchEvent(new w.Event('input', { bubbles: true })); }
{ const n = w.eval('CFG.mix.rows.length');
  d.querySelector('#cfgMix button[data-act="addMixRow"]').click();
  check('ярус добавляется', w.eval('CFG.mix.rows.length') === n + 1);
  d.querySelectorAll('#cfgMix button[data-act="delMixRow"]')[n].click();
  check('ярус удаляется', w.eval('CFG.mix.rows.length') === n); }
check('рецепт выгружается в CSV', w.eval(`csvBuild('mix').text`).indexOf('Ярус снизу') >= 0);
check('рецепт попадает в отчёт', w.eval(`reportHTML(CFG,derive(CFG),null)`).indexOf('Смешанная паллета: рецепт') > 0);
check('без рецепта выгрузка сообщает, что режим выключен',
  w.eval(`(()=>{CFG=JSON.parse(JSON.stringify(DEF));normalize(CFG);buildSim();
   return csvBuild('mix').text.indexOf('выключена')>0;})()`));
w.eval(`CFG=JSON.parse(JSON.stringify(DEF));renderCfg();buildSim();renderArch();`);

console.log('Редактор логики ПЛК — GRAFCET (п. 4)');
const gc = extra => w.eval(`(()=>{CFG=JSON.parse(JSON.stringify(DEF));${extra || ''}normalize(CFG);
 const P=grafProg(CFG);return{g1:P.g1.length,g2:P.g2.length,mode:CFG.plc.mode,
  warn:grafCheck(P,CFG),diff:grafDiff(P,grafRef(CFG)).map(x=>x.t),
  acts:P.g1.concat(P.g2).reduce((a,s)=>a.concat(s.act||[]),[])};})()`);

const R = gc();
check('по умолчанию исполняется эталонная программа', R.mode === 'ref' && R.g1 >= 4 && R.g2 === 2);
check('эталон проходит собственную проверку без замечаний', R.warn.length === 0, R.warn.join(' | '));
check('эталон не отличается сам от себя', R.diff.length === 0);
check('в эталоне есть все нужные разрешения',
  ['feed', 'job', 'jobSheet', 'call', 'lamp'].every(a => R.acts.indexOf(a) >= 0), R.acts.join(','));
check('подача паллет роботом добавляет задание на паллету',
  gc(`CFG.exch.in='robot';`).acts.indexOf('jobPallet') >= 0 &&
  gc(`CFG.exch.in='vehicle';`).acts.indexOf('jobPallet') < 0);

// интерпретатор
check('интерпретатор проходит цепочку истинных переходов за один такт', w.eval(`(()=>{
  const st=[{id:'A',n:'',act:[],tr:[{c:'always',to:'B'}]},{id:'B',n:'',act:[],tr:[{c:'always',to:'C'}]},
   {id:'C',n:'',act:[],tr:[{c:'run',to:'A'}]}];
  return grafRun(st,'A',{})==='C';})()`));
check('кольцо безусловных переходов не подвешивает интерпретатор', w.eval(`(()=>{
  const st=[{id:'A',n:'',act:[],tr:[{c:'always',to:'B'}]},{id:'B',n:'',act:[],tr:[{c:'always',to:'A'}]}];
  return ['A','B'].indexOf(grafRun(st,'A',{}))>=0;})()`));
check('переход в несуществующий шаг не двигает программу',
  w.eval(`grafRun([{id:'A',n:'',act:[],tr:[{c:'always',to:'X'}]}],'A',{})`) === 'A');

// проверка программы ловит ошибки структуры
const gcBad = extra => gc(`CFG.plc.mode='user';${extra}`).warn.join(' | ');
check('тупиковый шаг виден проверке',
  /нет ни одного перехода/.test(gcBad(`CFG.plc.g1=[{id:'S0',n:'Тупик',act:['job','feed','jobSheet','call'],tr:[]}];CFG.plc.g2=[{id:'T0',n:'x',act:['call'],tr:[{c:'always',to:'T0'}]}];`)));
check('недостижимый шаг виден проверке',
  /недостижим/.test(gcBad(`CFG.plc.g1=[{id:'S0',n:'a',act:['job','feed','jobSheet'],tr:[{c:'run',to:'S0'}]},{id:'S9',n:'b',act:[],tr:[{c:'always',to:'S0'}]}];CFG.plc.g2=[{id:'T0',n:'x',act:['call'],tr:[{c:'always',to:'T0'}]}];`)));
check('переход в несуществующий шаг виден проверке',
  /несуществующий шаг/.test(gcBad(`CFG.plc.g1=[{id:'S0',n:'a',act:['job','feed','jobSheet'],tr:[{c:'always',to:'S7'}]}];CFG.plc.g2=[{id:'T0',n:'x',act:['call'],tr:[{c:'always',to:'T0'}]}];`)));
check('мьютинг вместе с заданием роботу — отдельное замечание о безопасности',
  /мьютинг/i.test(gcBad(`CFG.plc.g1=[{id:'S0',n:'a',act:['job','feed','jobSheet','mute'],tr:[{c:'run',to:'S0'}]}];CFG.plc.g2=[{id:'T0',n:'x',act:['call'],tr:[{c:'always',to:'T0'}]}];`)));
check('программа без задания роботу отвергается проверкой',
  /нет задания роботу/.test(gcBad(`CFG.plc.g1=[{id:'S0',n:'a',act:['feed'],tr:[{c:'run',to:'S0'}]}];CFG.plc.g2=[{id:'T0',n:'x',act:['call'],tr:[{c:'always',to:'T0'}]}];`)));
check('программа без вызова обмена отвергается проверкой',
  /вызова обмена/.test(gcBad(`CFG.plc.g1=[{id:'S0',n:'a',act:['feed','job','jobSheet'],tr:[{c:'run',to:'S0'}]}];CFG.plc.g2=[{id:'T0',n:'x',act:[],tr:[{c:'always',to:'T0'}]}];`)));

// нормализация и обмен конфигурацией
check('битые шаги и неизвестные действия отбрасываются при нормализации', w.eval(`(()=>{
  CFG=JSON.parse(JSON.stringify(DEF));CFG.plc.mode='user';
  CFG.plc.g1=[null,{id:'S0',n:'a',act:['job','нетТакого'],tr:[{c:'always',to:'S0'},{c:'нетТакого',to:'S0'}]}];
  normalize(CFG);return CFG.plc.g1.length===1&&CFG.plc.g1[0].act.length===1&&CFG.plc.g1[0].tr.length===1;})()`));
check('пустая пользовательская программа откатывает режим на эталон',
  w.eval(`(()=>{CFG=JSON.parse(JSON.stringify(DEF));CFG.plc.mode='user';CFG.plc.g1=[];normalize(CFG);return CFG.plc.mode==='ref';})()`));
check('программа переживает выгрузку и загрузку конфигурации', w.eval(`(()=>{
  CFG=JSON.parse(JSON.stringify(DEF));const R=grafRef(CFG);CFG.plc.g1=JSON.parse(JSON.stringify(R.g1));
  CFG.plc.g2=JSON.parse(JSON.stringify(R.g2));CFG.plc.mode='user';CFG.plc.g1[0].n='Мой шаг';
  const t=cfgFromJSON(cfgJSON());return t.plc.mode==='user'&&t.plc.g1[0].n==='Мой шаг';})()`));

// исполнение: эталон работает как раньше, кривая программа ломает ячейку
const runProg = (extra, sec) => {
  w.eval(`CFG=JSON.parse(JSON.stringify(DEF));CFG.conveyors[0].feed='rate';CFG.conveyors[0].rate=25;
   CFG.exch.reaction=4;${extra || ''}normalize(CFG);renderCfg();buildSim();`);
  click('#bReset'); run(2); click('#bStart'); run(sec);
  return { placed: w.eval('S.stats.placed'), sheets: w.eval('S.stats.sheets'),
    state: w.eval('S.packml'), why: w.eval('S.why'), boxes: w.eval('S.conv[0].boxes.length'),
    step: w.eval('S.plc.g1[0].cur'), acts: w.eval('[...S.plc.actR[0]]') }; };

const ref = runProg('', 150);
check('на эталонной программе ячейка укладывает и кладёт прокладки',
  ref.placed > 8 && ref.sheets > 0 && ref.state === 'Execute', `${ref.placed} коробок, ${ref.sheets} листов`);
check('активный шаг и его разрешения видны в состоянии',
  !!ref.step && ref.acts.indexOf('feed') >= 0);

const noJob = runProg(`CFG.plc.mode='user';
  CFG.plc.g1=[{id:'S0',n:'Только подача',act:['feed'],tr:[{c:'run',to:'S0'}]}];
  CFG.plc.g2=[{id:'T0',n:'Ждём',act:['call','lamp'],tr:[{c:'always',to:'T0'}]}];`, 60);
check('без задания роботу ячейка не укладывает ничего', noJob.placed === 0, `уложено ${noJob.placed}`);
check('и уходит в Suspended с внятной причиной',
  noJob.state === 'Suspended' && /разрешения нет|не выдала/.test(noJob.why), noJob.why);
check('подача при этом работает — разрешение в программе есть', noJob.boxes > 0, `${noJob.boxes} коробок на конвейере`);

const noFeed = runProg(`CFG.plc.mode='user';const R=grafRef(CFG);
  CFG.plc.g1=JSON.parse(JSON.stringify(R.g1));CFG.plc.g2=JSON.parse(JSON.stringify(R.g2));
  CFG.plc.g1.forEach(s=>{s.act=s.act.filter(a=>a!=='feed');});`, 60);
check('без разрешения подачи коробки на конвейер не приходят', noFeed.boxes === 0 && noFeed.placed === 0);

const noSheetJob = runProg(`CFG.plc.mode='user';const R=grafRef(CFG);
  CFG.plc.g1=JSON.parse(JSON.stringify(R.g1));CFG.plc.g2=JSON.parse(JSON.stringify(R.g2));
  CFG.plc.g1.forEach(s=>{s.act=s.act.filter(a=>a!=='jobSheet');});`, 150);
check('без задания на прокладку ячейка встаёт на первом же слое с листом',
  noSheetJob.sheets === 0 && noSheetJob.placed > 0 && noSheetJob.state === 'Suspended',
  `${noSheetJob.placed} коробок, состояние ${noSheetJob.state}`);

const noCall = runProg(`CFG.stations=1;CFG.boxes[0].layers=1;CFG.plc.mode='user';const R=grafRef(CFG);
  CFG.plc.g1=JSON.parse(JSON.stringify(R.g1));
  CFG.plc.g2=[{id:'T0',n:'Обмен не вызывается',act:['lamp'],tr:[{c:'always',to:'T0'}]}];`, 200);
check('без вызова обмена готовая паллета так и стоит', w.eval('S.stats.exch') === 0);

// вкладка
w.eval(`CFG=JSON.parse(JSON.stringify(DEF));normalize(CFG);renderCfg();buildSim();showTab('plc');`);
check('вкладка логики ПЛК отрисовывается',
  d.getElementById('gcG1').innerHTML.length > 500 && d.getElementById('gcCheck').innerHTML.length > 100 &&
  d.getElementById('gcText').innerHTML.length > 500);
check('эталон не редактируется, пока не скопирован', d.querySelectorAll('#gcT1 input[type=checkbox]').length === 0);
d.getElementById('bGcCopy').click();
check('кнопка копирует эталон в свою программу и включает её',
  w.eval('CFG.plc.mode') === 'user' && w.eval('CFG.plc.g1.length') > 0 &&
  w.eval('grafDiff(grafProg(CFG),grafRef(CFG)).length') === 0);
check('после копирования появляется таблица шагов',
  d.querySelectorAll('#gcT1 tr').length - 1 === w.eval('CFG.plc.g1.length') &&
  d.querySelectorAll('#gcT1 input[type=checkbox]').length > 10);
{ const cb = d.querySelector('#gcT1 input[data-a="jobSheet"]');
  const was = w.eval(`CFG.plc.g1.filter(s=>s.act.indexOf('jobSheet')>=0).length`);
  cb.checked = !cb.checked; cb.dispatchEvent(new w.Event('input', { bubbles: true }));
  check('галочка действия правит программу и отличие видно против эталона',
    w.eval(`CFG.plc.g1.filter(s=>s.act.indexOf('jobSheet')>=0).length`) !== was &&
    w.eval('grafDiff(grafProg(CFG),grafRef(CFG)).length') > 0); }
{ const n = w.eval('CFG.plc.g1.length');
  d.querySelector('#gcT1 button[data-act="addStep"]').click();
  check('кнопка добавляет шаг с переходом', w.eval('CFG.plc.g1.length') === n + 1 &&
    w.eval('CFG.plc.g1[CFG.plc.g1.length-1].tr.length') === 1);
  d.querySelectorAll('#gcT1 button[data-act="delStep"]')[n].click();
  check('кнопка удаляет шаг и чистит переходы на него', w.eval('CFG.plc.g1.length') === n &&
    w.eval(`CFG.plc.g1.every(s=>s.tr.every(t=>CFG.plc.g1.some(x=>x.id===t.to)))`)); }
d.getElementById('bGcReset').click();
check('кнопка очистки возвращает эталон', w.eval('CFG.plc.mode') === 'ref' && w.eval('CFG.plc.g1.length') === 0);
check('программа выгружается в CSV', w.eval(`csvBuild('plc').text`).indexOf('G1') > 0);
check('программа попадает в отчёт', w.eval(`reportHTML(CFG,derive(CFG),null)`).indexOf('Логика ПЛК') > 0);
w.eval(`CFG=JSON.parse(JSON.stringify(DEF));renderCfg();buildSim();renderArch();showTab('sim');`);

console.log('Смена, простои и OEE (п. 7)');
// прогон смены: оператор реагирует на остановки сбросом и пуском
const shift = (scen, sec, extra) => {
  w.eval(`CFG=JSON.parse(JSON.stringify(DEF));CFG.conveyors[0].feed='rate';CFG.conveyors[0].rate=25;
   CFG.exch.reaction=4;${extra || ''}renderCfg();buildSim();`);
  d.getElementById('scenSel').value = scen;
  d.getElementById('scenSel').dispatchEvent(new w.Event('change'));
  d.getElementById('bShift').click();
  click('#bReset'); run(2); click('#bStart');
  for (let k = 0; k < sec / 10; k++) { run(10);
    const st = w.eval('S.packml');
    if (['Held', 'Aborted', 'Stopped'].includes(st)) {
      if (w.eval('S.door') === 'open') click('#tab-sim [data-b="door"]');
      click('#bReset'); run(4);
      if (w.eval('S.packml') === 'Idle') click('#bStart'); } }
  return w.eval('oeeCalc(S.oee,S.stats,DD)'); };

check('до пуска учёт смены не идёт', w.eval(`(()=>{buildSim();return S.oee.on===false&&S.oee.obs===0;})()`));
const K0 = shift('none', 240);
check('после прогона наблюдаемое время накоплено', K0.obs > 200, `${K0.obs.toFixed(0)} с`);
check('сумма категорий равна наблюдаемому времени',
  Math.abs(w.eval(`DT_ORDER.reduce((a,k)=>a+S.oee.by[k],0)`) - K0.obs) < 1e-6);
check('без сценария почти всё время — работа', K0.A > 0.9 && K0.oee > 0.5, `A=${(K0.A * 100).toFixed(0)} %`);
check('все три множителя в пределах от нуля до единицы',
  [K0.A, K0.P, K0.Q].every(v => v >= 0 && v <= 1) && Math.abs(K0.oee - K0.A * K0.P * K0.Q) < 1e-9);
check('производительность не превышает единицу даже при быстрой подаче',
  shift('none', 120, `CFG.conveyors[0].rate=60;`).P <= 1);
check('качество считает уронённое и промахи',
  w.eval(`(()=>{const st={placed:90,dropped:5,missed:5},K=oeeCalc({obs:100,by:{run:100}},st,DD);
   return Math.abs(K.Q-0.9)<1e-9&&K.total===100;})()`));

const KH = shift('hard', 300);
check('сценарий разыгрывает ровно те события, чьё время наступило',
  w.eval('S.scen.i') > 1 && w.eval('S.scen.i') === w.eval(`SCEN.hard.ev.filter(e=>e.t<=S.scen.t).length`),
  `${w.eval('S.scen.i')} из ${w.eval('SCEN.hard.ev.length')} к ${w.eval('S.scen.t').toFixed(0)} с`);
check('отказы попадают в свою категорию времени', w.eval('S.oee.by.fault') > 0, `${w.eval('S.oee.by.fault').toFixed(1)} с`);
check('отказы роняют готовность против смены без сценария', KH.A < K0.A, `${(K0.A * 100).toFixed(0)} % → ${(KH.A * 100).toFixed(0)} %`);
check('и роняют OEE', KH.oee < K0.oee, `${(K0.oee * 100).toFixed(1)} → ${(KH.oee * 100).toFixed(1)}`);
{ const P = w.eval('dtPareto(S.oee)');
  check('Парето отсортирован по убыванию и накопленная доля доходит до 100 %',
    P.rows.length > 1 && P.rows.every((r, i) => i === 0 || r.t <= P.rows[i - 1].t) &&
    Math.abs(P.rows[P.rows.length - 1].cum - 1) < 1e-9);
  check('в Парето нет строки «работа»', P.rows.every(r => r.cat !== 'run'));
  check('причина простоя — это текст состояния, а не код', P.rows[0].why.length > 5, P.rows[0].why.slice(0, 50)); }
check('журнал простоев не содержит рабочих интервалов',
  w.eval(`shiftRows().filter(x=>x.cat!=='run').length`) > 0 &&
  w.eval(`shiftRows().every(x=>x.dur>0)`));
check('состояния разнесены по категориям по PackML',
  w.eval(`dtCat('Execute')`) === 'run' && w.eval(`dtCat('Held')`) === 'fault' &&
  w.eval(`dtCat('Suspended')`) === 'starve' && w.eval(`dtCat('Stopping')`) === 'chg' &&
  w.eval(`dtCat('Stopped')`) === 'idle');

check('«спокойная смена» стоит времени, но не отказов', (() => {
  const K = shift('calm', 300);
  return w.eval('S.oee.by.fault') === 0 && K.A < 1; })(), `A=${(shift('calm', 120).A * 100).toFixed(0)} %`);

// проекция и настройки смены
{ const K = shift('none', 200), SH = w.eval(`shiftProj(oeeCalc(S.oee,S.stats,DD),CFG.shift,DD)`);
  check('проекция на смену вычитает плановые остановки',
    Math.abs(SH.plan - (w.eval('CFG.shift.len') * 3600 - w.eval('CFG.shift.breaks') * 60)) < 1e-9);
  check('проекция не обгоняет потолок без потерь', SH.boxes <= SH.ideal + 1e-6 && SH.boxes > 0);
  check('паллеты в проекции согласованы с коробками',
    Math.abs(SH.pallets * w.eval('DD.stations[0].pat.total') - SH.boxes) < 1e-6); }
w.eval(`CFG.shift.len=12;CFG.shift.breaks=60;normalize(CFG);`);
check('длительность смены нормализуется', w.eval(`(()=>{CFG.shift.len=99;CFG.shift.breaks=-5;normalize(CFG);
  return CFG.shift.len===24&&CFG.shift.breaks===0;})()`));

// вкладка и выгрузка
w.eval('showTab("oee")');
check('вкладка смены отрисовывается',
  d.getElementById('oeeCards').innerHTML.length > 200 && d.getElementById('oeeBar').innerHTML.length > 100 &&
  d.getElementById('oeeLog').innerHTML.length > 100 && d.getElementById('oeeText').innerHTML.length > 500);
check('смена выгружается в CSV со сводкой, категориями и журналом', (() => {
  const t = w.eval(`csvBuild('oee').text`);
  return t.indexOf('OEE') > 0 && t.indexOf('Категории времени') > 0 && t.indexOf('Журнал простоев') > 0; })());
check('кнопка «начать смену» обнуляет счётчики',
  (() => { d.getElementById('bShift').click();
    return w.eval('S.oee.obs') === 0 && w.eval('S.stats.placed') === 0 && w.eval('S.scen.i') === 0; })());
check('до начала смены выгрузка не падает, а говорит об этом',
  w.eval(`csvBuild('oee').text`).indexOf('не запускалась') > 0);
w.eval(`CFG=JSON.parse(JSON.stringify(DEF));renderCfg();buildSim();renderArch();showTab('sim');`);

console.log('Оценка риска по ISO 12100 (п. 5)');
const PL_ORD = ['a', 'b', 'c', 'd', 'e'];
const rk = extra => w.eval(`(()=>{CFG=JSON.parse(JSON.stringify(DEF));${extra || ''}normalize(CFG);
 const D=derive(CFG,true),R=D.risk;
 return{n:R.rows.length,zones:R.rows.map(x=>x.zone),ids:R.rows.map(x=>x.id),
  bad:R.bad.map(x=>x.id),plr:R.plr,worst:R.worst,ok:R.ok,
  rows:R.rows.map(x=>({id:x.id,s:x.s,f:x.f,o:x.o,a:x.a,res:x.res,cls0:x.cls0,cls:x.cls,ok:x.ok,
   sf:x.sf,plr:x.plr,floor:x.plFloor,m1:x.m1.length,m2:x.m2.length,m3:x.m3.length,todo:x.todo.length})),
  warn:D.warnings.filter(x=>/Оценка риска|Реестр опас/.test(x)).length,plGraph:D.pl.plr};})()`);
const has = (r, z) => r.zones.some(x => x.indexOf(z) >= 0);

// матрица и шкала
check('вероятность вреда складывается из F, O и A', w.eval('pClass(1,1,1)') === 1 && w.eval('pClass(3,3,3)') === 4);
check('матрица: лёгкий вред при любой вероятности не выше среднего класса',
  [1, 2, 3, 4].every(p => w.eval(`riskClass(1,${p === 4 ? 3 : 1},${p >= 3 ? 3 : 1},${p >= 2 ? 3 : 1})`) <= 2));
check('матрица: смертельная опасность даже при минимальной вероятности остаётся средним классом',
  w.eval('riskClass(4,1,1,1)') === 2, String(w.eval('riskClass(4,1,1,1)')));
check('матрица: тяжёлая опасность при высокой вероятности — очень высокий класс', w.eval('riskClass(4,3,3,3)') === 4);
check('порог приемлемости — класс 2', w.eval('RISK_OK') === 2);

const r0 = rk();
check('реестр не пустой и опасности пронумерованы подряд',
  r0.n > 8 && r0.ids.every((id, i) => id === 'H' + (i + 1)), `${r0.n} опасностей`);
check('в реестре есть робот, конвейер, электрика и обмен паллет',
  has(r0, 'досягаемости робота') && has(r0, 'Конвейер подачи') && has(r0, 'Шкаф управления') && has(r0, 'Проезд'));
check('меры снижают риск: остаточный класс не выше исходного',
  r0.rows.every(x => x.cls <= x.cls0) && r0.rows.some(x => x.cls < x.cls0));
check('тяжесть не растёт и не падает сама по себе', r0.rows.every(x => x.res.s <= x.s));
check('ни один элемент риска не уходит ниже единицы',
  r0.rows.every(x => x.res.s >= 1 && x.res.f >= 1 && x.res.o >= 1 && x.res.a >= 1));

// реестр следует за конфигурацией
check('без прокладок магазин из реестра уходит', !has(rk(`CFG.sheet.mode='none';`), 'Магазин прокладок'));
check('со стопкой паллет появляется своя опасность', has(rk(`CFG.exch.in='robot';`), 'Стопка пустых паллет'));
check('конвейер паллет заменяет опасность проезда техники',
  has(rk(`CFG.exch.out='conveyor';`), 'Конвейер паллет') && !has(rk(`CFG.exch.out='conveyor';`), 'Проезд'));
check('стеклянная тара добавляет осколки', rk(`CFG.boxes[0].mat='glass';`).n === r0.n + 1);
check('у кобота удар манипулятором оценён легче, но воздействие чаще', (() => {
  const a = r0.rows[0], b = rk(`CFG.robot='cb20';CFG.safety='cobot';`).rows[0];
  return b.s < a.s && b.f > a.f; })());

// связь с ISO 13849-1
check('требуемый PL берётся только от опасностей с функцией безопасности',
  r0.rows.filter(x => x.sf).length > 0 && r0.plr === r0.rows.filter(x => x.sf)
    .reduce((p, x) => PL_ORD.indexOf(x.plr) > PL_ORD.indexOf(p) ? x.plr : p, 'a'));
check('для функций, останавливающих робота, нижняя граница PL d по ISO 10218-2',
  r0.rows.filter(x => x.sf).every(x => PL_ORD.indexOf(x.plr) >= PL_ORD.indexOf('d')));
check('типовая ячейка: реестр и граф рисков сходятся на PL d',
  r0.plr === 'd' && r0.plGraph === 'd');
check('заниженный граф рисков даёт замечание', rk(`CFG.pl.S=1;CFG.pl.F=1;CFG.pl.P=1;`).warn > 0);

// организационные меры и правка оценок
const noOrg = rk(`CFG.risk.org=[];`);
check('снятые организационные меры поднимают остаточный риск',
  noOrg.bad.length > r0.bad.length, `${r0.bad.length} → ${noOrg.bad.length}`);
check('ручная загрузка не закрывается одной инструкцией: нужна механизация', (() => {
  const x = r0.rows[r0.zones.findIndex(z => z.indexOf('Загрузка конвейера') >= 0)];
  return x && !x.ok && x.todo > 0 && x.m1 === 0; })());
check('неприемлемый остаточный риск попадает в замечания', r0.warn > 0 && r0.bad.length > 0);
{ const i = r0.zones.findIndex(z => z.indexOf('Станция готовой паллеты') >= 0), id = r0.ids[i];
  const up = rk(`CFG.risk.est={${id}:{o:3}};`);
  check('правка оценки в таблице меняет класс риска',
    up.rows[i].cls0 > r0.rows[i].cls0 && up.rows[i].cls >= r0.rows[i].cls,
    `${r0.rows[i].cls0} → ${up.rows[i].cls0}`); }
check('правка сохраняется в конфигурации и переживает выгрузку-загрузку',
  w.eval(`(()=>{CFG=JSON.parse(JSON.stringify(DEF));CFG.risk.est={H1:{f:3}};CFG.risk.org=['ppe'];
   const t=cfgFromJSON(cfgJSON());return t.risk.est.H1.f===3&&t.risk.org.length===1;})()`));
check('битые оценки отбрасываются при нормализации',
  w.eval(`(()=>{CFG=JSON.parse(JSON.stringify(DEF));CFG.risk.est={H1:'мусор',H2:{s:99}};CFG.risk.org=['нет-такой'];
   normalize(CFG);return CFG.risk.est.H1===undefined&&CFG.risk.est.H2.s===4&&CFG.risk.org.length===0;})()`));

// вкладка, выгрузка и отчёт
w.eval(`CFG=JSON.parse(JSON.stringify(DEF));renderCfg();buildSim();showTab('risk');`);
check('вкладка оценки риска отрисовывается',
  d.getElementById('rkTable').querySelectorAll('tr').length === w.eval('DD.risk.rows.length') + 1 &&
  d.getElementById('rkText').innerHTML.length > 500);
check('оценки правятся прямо в таблице', d.querySelectorAll('#rkTable select[data-e]').length === w.eval('DD.risk.rows.length') * 4);
{ const sel = d.querySelector('#rkTable select[data-e="H1.o"]'); sel.value = '1';
  sel.dispatchEvent(new w.Event('input', { bubbles: true }));
  check('селект в таблице пишет оценку в конфигурацию', w.eval('CFG.risk.est.H1.o') === 1);
  d.getElementById('bRkReset').click();
  check('кнопка сброса очищает правки', Object.keys(w.eval('CFG.risk.est')).length === 0); }
{ const cb = d.querySelector('#rkOrg input[data-org="rotate"]'); cb.checked = true;
  cb.dispatchEvent(new w.Event('input', { bubbles: true }));
  check('галочка организационной меры попадает в конфигурацию', w.eval(`CFG.risk.org.indexOf('rotate')`) >= 0); }
check('реестр выгружается в CSV', (() => { const t = w.eval(`csvBuild('risk')`);
  return t.text.split('\r\n').filter(x => x.length).length === w.eval('DD.risk.rows.length') + 1; })());
check('оценка риска попадает в отчёт', w.eval(`reportHTML(CFG,derive(CFG),null)`).indexOf('Оценка риска по ISO 12100') > 0);
w.eval(`CFG=JSON.parse(JSON.stringify(DEF));renderCfg();buildSim();renderArch();showTab('sim');`);

console.log('Выгрузка таблиц в CSV (п. 3)');
// разбор CSV обратно в строки — так проверяем и кавычки, и целость строк
const csvParse = (txt, sep) => {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < txt.length; i++) { const ch = txt[i];
    if (q) { if (ch === '"') { if (txt[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; }
    else if (ch === '"') q = true;
    else if (ch === sep) { row.push(cell); cell = ''; }
    else if (ch === '\r') { }
    else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += ch; }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows; };
const csvOf = key => { const r = w.eval(`csvBuild('${key}')`);
  return { file: r.file, bom: r.text.charCodeAt(0) === 0xFEFF, rows: csvParse(r.text.slice(1), w.eval('csvSep()')) }; };

w.eval(`CFG=JSON.parse(JSON.stringify(DEF));CFG.name='Тестовая ячейка';CFG.robot='pl130';CFG.grip.pick=4;
 CFG.boxes.push({name:'Бутылки; в плёнке',l:280,w:190,h:330,m:9.5,rate:400,layers:0,shape:'shrink',mat:'film'});
 CFG.boxes[0].rate=600;CFG.conveyors.push(JSON.parse(JSON.stringify(CFG.conveyors[0])));CFG.conveyors[1].box=1;
 renderCfg();buildSim();renderArch();$('csvSep').value=';';`);

const keys = w.eval('CSV_ORDER');
check('таблиц на выгрузку — двенадцать', keys.length === 12, keys.join(','));
let ragged = 0, noBom = 0, empty = 0;
keys.forEach(k => { const t = csvOf(k), n = t.rows[0].length;
  if (!t.bom) noBom++;
  if (t.rows.length < 2) empty++;
  if (t.rows.some(r => r.length !== n)) ragged++; });
check('все таблицы идут с BOM — Excel не портит кириллицу', noBom === 0);
check('во всех таблицах колонок поровну в каждой строке', ragged === 0);
check('ни одна таблица не пустая', empty === 0);

const bom = csvOf('bom'), sig = csvOf('sig');
check('строк спецификации столько же, сколько позиций', bom.rows.length === w.eval('DD.bom.length') + 1,
  `${bom.rows.length - 1} против ${w.eval('DD.bom.length')}`);
check('строк сигналов столько же, сколько сигналов', sig.rows.length === w.eval('DD.sig.length') + 1);
check('имя файла берётся из названия ячейки', /Тестовая-ячейка_спецификация_/.test(bom.file), bom.file);
check('тип сигнала расшифрован словами', sig.rows.slice(1).every(r => r[2].length > 5) &&
  sig.rows.some(r => r[1] === 'SI' && /безопасн/i.test(r[2])));

// точка с запятой внутри ячейки не должна рвать строку
const sku = csvOf('sku');
check('точка с запятой в названии тары не рвёт строку',
  sku.rows.some(r => r[0] === 'Бутылки; в плёнке') && sku.rows.every(r => r.length === sku.rows[0].length));
check('в артикулах строка на каждую тару', sku.rows.length === w.eval('CFG.boxes.length') + 1);

const num = (rows, name) => (rows.find(r => r[1] === name) || [])[2];
const pRu = csvOf('params');
check('с разделителем «;» дробные числа идут с запятой', /^\d+,\d+$/.test(num(pRu.rows, 'Такт робота')), num(pRu.rows, 'Такт робота'));
check('разрядов в числах нет — Excel прочтёт их как числа',
  pRu.rows.slice(1).every(r => !/ | /.test(r[2])));
w.eval(`$('csvSep').value=','`);
const pEn = csvParse(w.eval(`csvBuild('params')`).text.slice(1), ',');
check('с разделителем «,» дробные числа идут с точкой', /^\d+\.\d+$/.test(num(pEn, 'Такт робота')), num(pEn, 'Такт робота'));
w.eval(`$('csvSep').value=';'`);

const plT = csvOf('pl');
check('в таблице PL строка на каждую подсистему',
  plT.rows.length === w.eval('DD.pl.sf.reduce((a,f)=>a+f.res.length,0)') + 1);
check('требуемый и достигнутый PL попали в выгрузку',
  plT.rows[1][2] === w.eval('DD.pl.plr') && plT.rows[1][3] === w.eval('DD.pl.sf[0].pl'));

const all = w.eval('csvBuildAll()');
check('все таблицы одним файлом: каждая со своим заголовком',
  keys.every(k => all.text.indexOf(w.eval(`CSV_TABLES['${k}'].name`)) > 0), all.file);
check('сводный файл длиннее любой отдельной таблицы', all.text.length > w.eval(`csvBuild('sig').text`).length);

// Кнопки: в jsdom скачивание недоступно, значит должен сработать запасной путь с текстом.
// Сохранение асинхронное, поэтому нажимаем здесь, а результат проверяем в конце прогона.
w.eval(`csvShow('');$('csvText').hidden=true;`);
d.querySelector('#csvBtns button[data-csv="sig"]').click();

w.eval(`CFG=JSON.parse(JSON.stringify(DEF));renderCfg();buildSim();renderArch();`);

// Хвост прогона — отдельной задачей event loop: весь тест выше идёт одним синхронным
// куском, и промисы внутри страницы до этого момента просто не успевают разрешиться.
setTimeout(() => {
  console.log('Асинхронное: сохранение файлов');
  const sf = w.eval('window.__sf'), of = w.eval('window.__of');
  check('saveFile без пикера уходит в скачивание или в запасной путь',
    sf === 'download' || sf === 'fail', `вернул «${sf}»`);
  check('openFile без пикера просит открыть через <input type=file>', of === 'picker', `вернул «${of}»`);
  check('кнопка таблицы работает и при запрете скачивания показывает текст',
    !d.getElementById('csvText').hidden && d.getElementById('csvText').value.indexOf('Тег') > 0);
  check('после кнопки сообщение объясняет, что делать', d.getElementById('csvMsg').textContent.length > 20);

  check('нет ошибок выполнения', errs.length === 0, errs.join('; '));
  console.log(failed ? `\nПровалено проверок: ${failed}` : '\nВсе проверки пройдены');
  process.exit(failed ? 1 : 0);
}, 0);
