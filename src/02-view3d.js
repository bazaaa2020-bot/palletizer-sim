// ======================= 3D-ВИД =======================
const V3={ok:false,orbit:{theta:-0.9,phi:0.95,r:9,tx:0,ty:0.5,tz:1},follow:false,cache:{},pools:{},agents:{}};
const COL3={box:[0xC9A66B,0x8DB3A0,0xB39DDB,0xE0A0A0],sheet:0x8FA3B5,robot:0xE0762C,fence:0x7B8794,pallet:0xB08D57,conv:0x9AA3AB,floor:0xD9DEE3,agent:0x3A6EA5,fork:0xF5B400,amr:0xF2F4F6,red:0xD33B2F,off:0xB8C0C8,green:0x2A9D5C,yellow:0xF5B400,post:0x6E7883,mesh:0x8A949E,joint:0x2A2E33};
const FENCE_H=2.0,FENCE_GAP=0.15,PANEL_W=1.5;   // ISO 14120: панель 2 м, просвет снизу 150 мм
function mat(col,o){return new THREE.MeshLambertMaterial(Object.assign({color:col},o||{}));}
function box3(w,h,d,col,o){return new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(col,o));}
function label3(text,size){const cv=document.createElement('canvas');cv.width=128;cv.height=64;const ctx=cv.getContext('2d');ctx.font='bold 40px sans-serif';ctx.fillStyle='#1E2730';ctx.textAlign='center';ctx.fillText(text,64,46);const t=new THREE.CanvasTexture(cv);const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:t,depthTest:false}));sp.scale.set((size||0.6),(size||0.6)/2,1);return sp;}
function lines3(pts,col,op){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));
 return new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:col,transparent:true,opacity:op}));}
// Цилиндрическое звено: axis 'x' — вдоль звена, 'z' — ось поворота сустава, иначе вертикально.
function tube(r1,r2,len,col,axis){const m=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,len,20),mat(col));
 if(axis==='x')m.rotation.z=Math.PI/2;else if(axis==='z')m.rotation.x=Math.PI/2;return m;}
// Сетчатая панель ограждения в раме (ISO 14120).
function fencePanel(w){const g=new THREE.Group(),h=FENCE_H-FENCE_GAP,y0=FENCE_GAP,fr=0.028;
 const pl=new THREE.Mesh(new THREE.PlaneGeometry(w,h),mat(COL3.fence,{transparent:true,opacity:0.10,side:THREE.DoubleSide}));
 pl.position.y=y0+h/2;g.add(pl);
 [y0,y0+h].forEach(y=>{const b=box3(w,fr,fr,COL3.post);b.position.set(0,y,0);g.add(b);});
 [-w/2,w/2].forEach(x=>{const b=box3(fr,h,fr,COL3.post);b.position.set(x,y0+h/2,0);g.add(b);});
 const pts=[],st=0.1;
 for(let x=-w/2+st;x<w/2-1e-6;x+=st)pts.push(x,y0,0,x,y0+h,0);
 for(let y=y0+st;y<y0+h-1e-6;y+=st)pts.push(-w/2,y,0,w/2,y,0);
 g.add(lines3(pts,COL3.mesh,0.5));return g;}
function fencePost(){const g=new THREE.Group();const p=box3(0.06,FENCE_H,0.06,COL3.post);p.position.y=FENCE_H/2;g.add(p);
 const b=box3(0.15,0.014,0.15,COL3.post);b.position.y=0.007;g.add(b);return g;}
// Световая завеса: излучатель и приёмник по краям проёма, между ними плоскость лучей.
function curtain3(w,h,y0){const g=new THREE.Group(),caps=[];
 // Излучатель и приёмник — тонкие профили, привинченные к стойкам ограждения по краям
 // проёма, поэтому они стоят внутри проёма и чуть впереди стойки, а не дублируют её.
 const dx=Math.max(0.05,w/2-0.055),zo=0.04;
 [-dx,dx].forEach(x=>{const c=box3(0.035,h+0.05,0.05,COL3.joint);c.position.set(x,y0+h/2,zo);g.add(c);
  const cap=box3(0.04,0.028,0.055,COL3.red);cap.position.set(x,y0+h+0.04,zo);g.add(cap);caps.push(cap);});
 const bw=2*dx;
 const pl=new THREE.Mesh(new THREE.PlaneGeometry(bw,h),mat(COL3.red,{transparent:true,opacity:0.10,side:THREE.DoubleSide}));
 pl.position.set(0,y0+h/2,zo);g.add(pl);
 const pts=[];for(let y=y0+0.06;y<y0+h;y+=0.12)pts.push(-dx,y,zo,dx,y,zo);
 const beams=lines3(pts,COL3.red,0.35);g.add(beams);
 g.userData={plane:pl,beams,caps};return g;}
// Напольная разметка сектора обмена — для коллаборативной ячейки без ограждения.
function sector3(w){const g=new THREE.Group();
 const pl=new THREE.Mesh(new THREE.PlaneGeometry(w,0.5),mat(COL3.red,{transparent:true,opacity:0.35,side:THREE.DoubleSide}));
 pl.rotation.x=-Math.PI/2;pl.position.y=0.006;g.add(pl);g.userData={plane:pl,caps:[]};return g;}
function setCurtain(g,hex){if(!g||!g.userData)return;const u=g.userData;
 if(u.plane)u.plane.material.color.setHex(hex);if(u.beams)u.beams.material.color.setHex(hex);
 if(u.caps)u.caps.forEach(c=>c.material.color.setHex(hex));}
// Точка выхода луча из центра позиции наружу на линию ограждения и стена, в которую он упёрся.
// Точка на стене w по расстоянию s от её начала.
function wallPoint(F,w,s){return w===0?{x:F.x0+s,y:F.y0}:w===1?{x:F.x1,y:F.y0+s}:w===2?{x:F.x1-s,y:F.y1}:{x:F.x0,y:F.y1-s};}
function fenceHit(F,cx,cy,dx,dy){let t=Infinity;
 if(dx>1e-6)t=Math.min(t,(F.x1-cx)/dx);if(dx<-1e-6)t=Math.min(t,(F.x0-cx)/dx);
 if(dy>1e-6)t=Math.min(t,(F.y1-cy)/dy);if(dy<-1e-6)t=Math.min(t,(F.y0-cy)/dy);
 if(!isFinite(t))return null;const x=cx+dx*t,y=cy+dy*t,e=6;
 if(Math.abs(y-F.y0)<e)return{w:0,s:x-F.x0,x,y,ang:0};
 if(Math.abs(x-F.x1)<e)return{w:1,s:y-F.y0,x,y,ang:-Math.PI/2};
 if(Math.abs(y-F.y1)<e)return{w:2,s:F.x1-x,x,y,ang:0};
 if(Math.abs(x-F.x0)<e)return{w:3,s:F.y1-y,x,y,ang:-Math.PI/2};return null;}
// Стена ограждения между двумя точками с пропусками под проёмы (метры).
function fenceWall(R,x0,z0,x1,z1,gaps){const len=Math.hypot(x1-x0,z1-z0);if(len<0.05)return;
 const ux=(x1-x0)/len,uz=(z1-z0)/len,ang=-Math.atan2(z1-z0,x1-x0);
 let t=0;const segs=[];
 gaps.slice().sort((a,b)=>a.s-b.s).forEach(g=>{const a=Math.max(0,g.s-g.w/2),b=Math.min(len,g.s+g.w/2);if(a>t)segs.push([t,a]);t=Math.max(t,b);});
 if(t<len-0.05)segs.push([t,len]);
 segs.forEach(([a,b])=>{const L=b-a;if(L<0.08)return;const n=Math.max(1,Math.round(L/PANEL_W));
  for(let i=0;i<n;i++){const mid=a+L*(i+0.5)/n,pn=fencePanel(L/n-0.07);
   pn.position.set(x0+ux*mid,0,z0+uz*mid);pn.rotation.y=ang;R.add(pn);}
  for(let i=0;i<=n;i++){const sPos=a+L*i/n,po=fencePost();
   po.position.set(x0+ux*sPos,0,z0+uz*sPos);po.rotation.y=ang;R.add(po);}});}
function init3D(){
 const wrap=$('v3wrap');if(typeof THREE==='undefined'){$('v3msg').textContent='Библиотека three.js не загрузилась — 3D-вид недоступен без доступа к cdnjs.cloudflare.com.';return;}
 let ren;try{ren=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});}catch(e){$('v3msg').textContent='WebGL недоступен в этом браузере — 3D-вид отключён.';return;}
 ren.setPixelRatio(Math.min(2,window.devicePixelRatio||1));wrap.appendChild(ren.domElement);
 const scene=new THREE.Scene(),cam=new THREE.PerspectiveCamera(45,1.6,0.05,300);
 scene.add(new THREE.HemisphereLight(0xffffff,0x8a97a5,0.95));const dl=new THREE.DirectionalLight(0xffffff,0.65);dl.position.set(4,9,3);scene.add(dl);
 Object.assign(V3,{ok:true,ren,scene,cam,wrap,root:new THREE.Group(),dyn:new THREE.Group()});scene.add(V3.root);scene.add(V3.dyn);
 let drag=null;wrap.addEventListener('contextmenu',e=>e.preventDefault());
 wrap.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,b:e.button,shift:e.shiftKey};wrap.setPointerCapture(e.pointerId);});
 wrap.addEventListener('pointerup',()=>{drag=null;});wrap.addEventListener('pointercancel',()=>{drag=null;});
 wrap.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.x=e.clientX;drag.y=e.clientY;const o=V3.orbit;
  if(drag.b===2||drag.shift){const s=o.r*0.0014;o.tx-=(dx*Math.sin(o.theta)-dy*Math.cos(o.theta))*s;o.tz-=(-dx*Math.cos(o.theta)-dy*Math.sin(o.theta))*s;V3.follow=false;}
  else{o.theta+=dx*0.006;o.phi=clamp(o.phi-dy*0.006,0.05,1.52);}});
 wrap.addEventListener('wheel',e=>{e.preventDefault();V3.orbit.r=clamp(V3.orbit.r*Math.exp(e.deltaY*0.0012),1.5,80);},{passive:false});
 document.querySelectorAll('[data-v3]').forEach(b=>b.addEventListener('click',()=>{const o=V3.orbit,v=b.dataset.v3;V3.follow=false;
  if(v==='iso'){o.theta=-0.9;o.phi=0.95;home3D();}else if(v==='top'){o.theta=-Math.PI/2;o.phi=0.03;home3D();}else if(v==='op'){o.theta=Math.PI;o.phi=1.25;o.r=7;const cv=DD.LY.convs[0];o.tx=(cv.x0-1500)/1000;o.tz=cv.y/1000;o.ty=0.8;}else if(v==='follow'){V3.follow=true;o.r=Math.min(o.r,5);}}));
 window.addEventListener('resize',resize3D);resize3D();}
function home3D(){const o=V3.orbit,G=GG;o.tx=(G.xMin+G.xMax)/2000;o.tz=(G.yMin+G.yMax)/2000;o.ty=0.5;o.r=Math.max(G.xMax-G.xMin,G.yMax-G.yMin)/1000*0.85;}
function resize3D(){if(!V3.ok)return;const w=V3.wrap.clientWidth||900,h=V3.wrap.clientHeight||600;V3.ren.setSize(w,h,false);V3.cam.aspect=w/h;V3.cam.updateProjectionMatrix();}
function clear3(g){while(g.children.length){const ch=g.children.pop();g.remove(ch);}}
function build3D(){
 if(!V3.ok)return;const c=CFG,D=DD,LY=D.LY,pal=D.pal,G=GG,mm=1/1000;clear3(V3.root);clear3(V3.dyn);V3.cache={};V3.pools={};V3.agents={};V3.robots=[];V3.gates={};V3.stations={};V3.mags={};V3.stacks={};V3.curtains=[];
 const R=V3.root;const W=(G.xMax-G.xMin)*mm+4,H=(G.yMax-G.yMin)*mm+4,cx=(G.xMin+G.xMax)/2*mm,cz=(G.yMin+G.yMax)/2*mm;
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(W,H),mat(COL3.floor));floor.rotation.x=-Math.PI/2;floor.position.set(cx,-0.002,cz);R.add(floor);
 const grid=new THREE.GridHelper(Math.max(W,H),Math.round(Math.max(W,H)),0xb8c0c8,0xcdd3d9);grid.position.set(cx,0,cz);R.add(grid);
 // Проёмы в ограждении: под каждый конвейер и под обмен на каждой позиции вокруг робота.
 const F=D.F,ops=[[],[],[],[]],slotOp={},CH=FENCE_H-FENCE_GAP;
 // Проёмы, попавшие на одну стену рядом, объединяем: иначе у общего проезда встают две
 // завесы в одной точке и стойки задваиваются.
 const addOp=(hit,w)=>{if(!hit)return null;const arr=ops[hit.w];
  const ex=arr.find(o=>Math.abs(o.s-hit.s)<(o.w+w)/2);
  if(ex){const s0=Math.min(ex.s-ex.w/2,hit.s-w/2),s1=Math.max(ex.s+ex.w/2,hit.s+w/2);
   ex.s=(s0+s1)/2;ex.w=s1-s0;const p=wallPoint(F,hit.w,ex.s);ex.x=p.x;ex.y=p.y;return ex;}
  const o={s:hit.s,w,x:hit.x,y:hit.y,ang:hit.ang,wall:hit.w};arr.push(o);return o;};
 const convOp=LY.convs.map(cv=>addOp(fenceHit(F,cv.x1,cv.y,-1,0),cv.w+150));
 const veh=c.exch.out!=='conveyor';
 const opW=sl=>sl.kind==='mg'?pal.L+300:(veh?Math.max(pal.L+300,2100):pal.L+300);
 LY.robots.forEach(r=>r.slots.forEach(sl=>{const o=addOp(fenceHit(F,sl.gate.x-sl.acc.x*10,sl.gate.y-sl.acc.y*10,sl.acc.x,sl.acc.y),opW(sl));if(o){o.kind=sl.kind;slotOp[sl.id]=o;}}));
 if(D.safety==='fence'){
  const doorOp=addOp(fenceHit(F,F.x1-700,F.y1-1,0,1),1000);
  [[F.x0,F.y0,F.x1,F.y0],[F.x1,F.y0,F.x1,F.y1],[F.x1,F.y1,F.x0,F.y1],[F.x0,F.y1,F.x0,F.y0]]
   .forEach((w,i)=>fenceWall(R,w[0]*mm,w[1]*mm,w[2]*mm,w[3]*mm,ops[i].map(o=>({s:o.s*mm,w:o.w*mm}))));
  // световые завесы в проёмах конвейеров + датчики мьютинга по обе стороны
  LY.convs.forEach((cv,i)=>{const o=convOp[i];if(!o)return;
   const g=curtain3((cv.w+150)*mm,CH,FENCE_GAP);g.position.set(o.x*mm,0,o.y*mm);g.rotation.y=o.ang;R.add(g);V3.curtains.push(g);
   [-1,1].forEach(sx=>[-1,1].forEach(sz=>{const m=box3(0.05,0.07,0.05,COL3.joint);
    m.position.set((o.x+sx*250)*mm,c.convH*mm+0.12,(o.y+sz*(cv.w/2+90))*mm);R.add(m);}));});
  // завесы в проёмах обмена — на линии ограждения, а не над паллетой
  const built=new Map();
  Object.keys(slotOp).forEach(id=>{const o=slotOp[id];let g=built.get(o);
   if(!g){g=curtain3(o.w*mm,CH,FENCE_GAP);g.position.set(o.x*mm,0,o.y*mm);g.rotation.y=o.ang;R.add(g);built.set(o,g);}
   V3.gates[id]=g;});
  // дверь на петле с замком
  if(doorOp){const dg=new THREE.Group();dg.position.set(doorOp.x*mm,0,doorOp.y*mm);dg.rotation.y=doorOp.ang;R.add(dg);
   const leaf=new THREE.Group();leaf.position.x=-0.5;dg.add(leaf);const dp=fencePanel(0.95);dp.position.x=0.5;leaf.add(dp);
   const lock=box3(0.07,0.13,0.06,COL3.green);lock.position.set(0.5,1.05,0.05);dg.add(lock);
   V3.door=leaf;V3.lock=lock;}}
 else LY.robots.forEach(r=>{[[D.rStop,COL3.red],[Math.min(D.rSlow,3000),COL3.yellow]].forEach(([rad,col])=>{const ring=new THREE.Mesh(new THREE.RingGeometry(rad*mm-0.04,rad*mm,64),mat(col,{transparent:true,opacity:0.5,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.set(r.base.x*mm,0.004,r.base.y*mm);R.add(ring);});});
 LY.convs.forEach((cv,i)=>{const len=cv.len*mm,w=cv.w*mm,h=c.convH*mm,xc=(cv.x0+cv.x1)/2*mm,zc=cv.y*mm;const frame=box3(len,0.08,w,COL3.conv);frame.position.set(xc,h-0.04,zc);R.add(frame);
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([sx,sz])=>{const leg=box3(0.05,h,0.05,COL3.fence);leg.position.set(xc+sx*(len/2-0.15),h/2,zc+sz*(w/2-0.05));R.add(leg);});
  const rg=new THREE.CylinderGeometry(0.03,0.03,w-0.1,10),rm=mat(0xc5ccd3);for(let x=cv.x0+75;x<cv.x1;x+=150){const roll=new THREE.Mesh(rg,rm);roll.rotation.x=Math.PI/2;roll.position.set(x*mm,h,zc);R.add(roll);}
  const stop=box3(0.03,0.25,w,0x1e2730);stop.position.set(cv.x1*mm,h+0.1,zc);R.add(stop);});
 // Шестиосевой кобот: тёмные корпуса суставов J1…J6, оранжевые трубчатые звенья.
 // J1 — поворот колонны, J2 и J3 — плечо и локоть (плоская задача, решается в render3D),
 // J4+J5 держат фланец вертикально, J6 — доворот инструмента (carry.rotation.y).
 const reach=D.rob.reach*mm,L=reach/2,RJ=Math.max(0.055,reach*0.045),RA=RJ*0.78;
 LY.robots.forEach(r=>{const bx=r.base.x*mm,bz=r.base.y*mm,bh=c.baseH*mm;
  if(bh>0){const col=box3(0.26,bh,0.26,COL3.post);col.position.set(bx,bh/2,bz);R.add(col);
   const bp=box3(0.5,0.022,0.5,COL3.joint);bp.position.set(bx,0.011,bz);R.add(bp);}
  const b0=tube(RJ*1.2,RJ*1.3,0.10,COL3.joint);b0.position.set(bx,bh+0.05,bz);R.add(b0);
  const g0=new THREE.Group();g0.position.set(bx,bh+0.15,bz);R.add(g0);
  const j1=tube(RJ,RJ,0.20,COL3.robot);j1.position.y=0.10;g0.add(j1);
  const g1=new THREE.Group();g1.position.set(0,0.2,0);g0.add(g1);
  const j2=tube(RJ,RJ,RJ*2.3,COL3.joint,'z');g1.add(j2);
  const ua=tube(RA,RA,L,COL3.robot,'x');ua.position.x=L/2;g1.add(ua);
  const g2=new THREE.Group();g2.position.set(L,0,0);g1.add(g2);
  const j3=tube(RJ*0.88,RJ*0.88,RJ*2.0,COL3.joint,'z');g2.add(j3);
  const fa=tube(RA*0.85,RA*0.85,L,COL3.robot,'x');fa.position.x=L/2;g2.add(fa);
  const j4=tube(RA*0.8,RA*0.8,RJ*1.7,COL3.robot,'x');j4.position.x=L-RJ*0.9;g2.add(j4);
  const gw=new THREE.Group();gw.position.set(L,0,0);g2.add(gw);
  const j5=tube(RJ*0.72,RJ*0.72,RJ*1.7,COL3.joint,'z');gw.add(j5);
  const wl=Math.max(0.05,c.gripH*mm-RJ*0.5-0.045);
  const wr=tube(RA*0.72,RA*0.72,wl,COL3.robot);wr.position.y=-(RJ*0.5+wl/2);gw.add(wr);
  const j6=tube(RJ*0.62,RJ*0.62,0.035,COL3.joint);j6.position.y=-c.gripH*mm+0.018;gw.add(j6);
  const hb=D.heaviest,pw=c.grip.pick*hb.l*mm-0.01,pd=hb.w*mm-0.01;
  const carry=new THREE.Group();carry.position.y=-c.gripH*mm;gw.add(carry);
  const plate=box3(pw,0.05,pd,0x4a525b);plate.position.y=0.025;carry.add(plate);
  const cb=new THREE.Group();for(let j=0;j<c.grip.pick;j++){const b=taraMesh(hb,COL3.box[0],0);b.position.set((j-(c.grip.pick-1)/2)*hb.l*mm,-hb.h*mm/2,0);cb.add(b);}cb.visible=false;carry.add(cb);
  const cs=box3(pal.W*mm,0.01,pal.L*mm,COL3.sheet);cs.position.y=-0.005;cs.visible=false;carry.add(cs);const cp=palletMesh(pal);cp.position.y=-pal.h*mm;cp.visible=false;carry.add(cp);
  V3.robots.push({r,g0,g1,g2,gw,carry,plate,cb,cs,cp,L,pw,pd,hb});});
 LY.robots.forEach(r=>r.slots.forEach(sl=>{const g=new THREE.Group();g.position.set(sl.cx*mm,0,sl.cy*mm);g.rotation.y=-sl.ang*Math.PI/180;R.add(g);
  const outline=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(pal.W*mm,pal.L*mm)),new THREE.LineBasicMaterial({color:COL3.fence}));outline.rotation.x=-Math.PI/2;outline.position.y=0.005;g.add(outline);
  const lb=label3(sl.id,0.5);lb.position.set(0,0.35,0);g.add(lb);
  if(D.safety!=='fence'){const sec=sector3(pal.L*mm+0.3);sec.position.set((pal.W/2+350)*mm,0,0);sec.rotation.y=Math.PI/2;g.add(sec);V3.gates[sl.id]=sec;}
  if(sl.kind==='mg'){const rack=new THREE.Group();g.add(rack);[[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([sx,sz])=>{const p=box3(0.04,0.9,0.04,COL3.fence);p.position.set(sx*pal.W*mm/2,0.45,sz*pal.L*mm/2);rack.add(p);});const base=box3(pal.W*mm,pal.h*mm,pal.L*mm,COL3.pallet);base.position.y=pal.h*mm/2;g.add(base);const stack=box3(pal.W*mm-0.05,1,pal.L*mm-0.05,COL3.sheet);g.add(stack);V3.mags[sl.id]=stack;}
  if(sl.kind==='ps'){const st=new THREE.Group();g.add(st);V3.stacks[sl.id]={g:st,pal};}
  if(sl.kind==='st'){const st=new THREE.Group();g.add(st);V3.stations[sl.id]={g:st,outer:g,sl};}
  if(sl.kind!=='ps'&&!(sl.kind==='st'&&c.exch.out==='conveyor')){const pad=new THREE.Mesh(new THREE.PlaneGeometry(1.6,1.6),mat(0xc5ccd3,{transparent:true,opacity:0.5}));pad.rotation.x=-Math.PI/2;pad.position.set(sl.park.x*mm,0.003,sl.park.y*mm);R.add(pad);}}));
 V3.gridSig='';home3D();}
// Геометрия единицы тары: круглая — цилиндром, остальное — параллелепипедом.
function taraGeom(b,rot){const mm=1/1000;
 if(SHAPES[b.shape||'box'].round)return new THREE.CylinderGeometry(b.l*mm/2-0.006,b.l*mm/2-0.006,b.h*mm-0.004,18);
 return new THREE.BoxGeometry((rot?b.w:b.l)*mm-0.008,b.h*mm-0.004,(rot?b.l:b.w)*mm-0.008);}
function taraMesh(b,col,rot){return new THREE.Mesh(taraGeom(b,rot),mat(col));}
function palletMesh(pal){const g=new THREE.Group(),mm=1/1000,W=pal.W*mm,Lz=pal.L*mm,h=pal.h*mm;const m=mat(COL3.pallet);
 [-1,0,1].forEach(k=>{const b=new THREE.Mesh(new THREE.BoxGeometry(W,h*0.3,0.1),m);b.position.set(0,h*0.15,k*(Lz/2-0.06));g.add(b);});
 const top=new THREE.Mesh(new THREE.BoxGeometry(W,h*0.2,Lz),m);top.position.y=h*0.9;g.add(top);
 [-1,0,1].forEach(k=>{const b=new THREE.Mesh(new THREE.BoxGeometry(0.1,h*0.5,Lz),m);b.position.set(k*(W/2-0.06),h*0.55,0);g.add(b);});return g;}
function buildStation3(s){const c=CFG,pal=DD.pal,mm=1/1000,b=boxOf(c,s.bi),col=COL3.box[s.bi%4],g=V3.stations[s.id].g;clear3(g);if(!s.present)return;
 g.add(palletMesh(pal));const geo={0:taraGeom(b,0),1:taraGeom(b,1)},m=mat(col);
 const sheetsBelow=j=>s.sheetLayers.filter(x=>x<=j).length*4;
 const addLayer=(cells,idx,j)=>{const y=(pal.h+j*b.h+sheetsBelow(j))*mm;idx.forEach(i=>{const cl=cells[i];const mesh=new THREE.Mesh(geo[cl.rot],m);mesh.position.set(cl.x*mm,y+b.h*mm/2,cl.y*mm);g.add(mesh);});};
 for(let j=0;j<s.layer;j++){const cells=(s.pat.interlock&&j%2)?s.pat.cellsB:s.pat.cells;addLayer(cells,cells.map((x,i)=>i),j);}
 if(s.placed.length)addLayer(curCells(s),s.placed,s.layer);
 s.sheetLayers.forEach(l=>{const y=(pal.h+l*b.h+s.sheetLayers.filter(x=>x<l).length*4)*mm;const sh=box3(pal.W*mm-0.02,0.004,pal.L*mm-0.02,COL3.sheet);sh.position.y=y+0.002;g.add(sh);});}
function agentMesh(a){const c=CFG,pal=DD.pal,mm=1/1000,g=new THREE.Group();
 if(a.kind==='person'||a.kind==='jack'){const body=new THREE.Mesh(new THREE.CylinderGeometry(0.18,0.2,1.3,14),mat(COL3.agent));body.position.set(0,0.65,0);const head=new THREE.Mesh(new THREE.SphereGeometry(0.13,14,12),mat(0xE8C39E));head.position.set(0,1.5,0);const person=new THREE.Group();person.add(body,head);
  if(a.kind==='jack'){person.position.x=0.9;const forks=box3(1.2,0.06,0.55,COL3.agent);forks.position.set(0,0.06,0);const handle=box3(0.05,1.1,0.05,COL3.agent);handle.position.set(0.65,0.6,0);g.add(forks,handle);}g.add(person);}
 else if(a.kind==='forklift'){const x0=1.15;   // паллета в начале координат, машина — наружу
  [-1,1].forEach(sz=>{const t=box3(1.05,0.04,0.12,COL3.fence);t.position.set(0.5,0.075,sz*0.19);g.add(t);});
  const carr=box3(0.06,0.32,0.68,COL3.fence);carr.position.set(x0-0.05,0.28,0);g.add(carr);
  [-1,1].forEach(sz=>{const up=box3(0.07,1.85,0.09,COL3.fence);up.position.set(x0,0.93,sz*0.32);g.add(up);});
  const tie=box3(0.07,0.08,0.73,COL3.fence);tie.position.set(x0,1.85,0);g.add(tie);
  const body=box3(1.2,0.6,1.0,COL3.fork);body.position.set(x0+0.75,0.44,0);
  const cw=box3(0.28,0.48,0.92,0xB08A16);cw.position.set(x0+1.45,0.38,0);
  [[x0+0.45,-1],[x0+0.45,1],[x0+1.3,-1],[x0+1.3,1]].forEach(([x,sz])=>{const wh=new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.16,0.13,14),mat(0x2f3740));wh.rotation.x=Math.PI/2;wh.position.set(x,0.16,sz*0.45);g.add(wh);});
  const roof=box3(0.92,0.05,0.92,0x2f3740);roof.position.set(x0+0.75,1.82,0);g.add(roof);
  [-1,1].forEach(sx=>[-1,1].forEach(sz=>{const po=box3(0.05,1.28,0.05,0x2f3740);po.position.set(x0+0.75+sx*0.4,1.18,sz*0.4);g.add(po);}));
  const seat=box3(0.38,0.38,0.4,0x2f3740);seat.position.set(x0+0.98,0.93,0);g.add(seat);
  g.add(body,cw);}
 else{const body=box3(1.3,0.35,0.95,COL3.amr);body.position.set(0,0.18,0);const lamp=new THREE.Mesh(new THREE.SphereGeometry(0.05,10,8),mat(COL3.green));lamp.position.set(-0.6,0.4,0.4);g.add(body,lamp);}
 const carry=new THREE.Group();carry.position.set(0,a.kind==='amr'?0.36:a.kind==='forklift'?0.1:0.09,0);g.add(carry);const pm=palletMesh(pal);carry.add(pm);
 const lh=Math.max(0.15,(a.target&&a.target.pat?a.target.pat.layers*boxOf(c,a.target.bi).h:500)*mm);
 const load=box3(pal.W*mm-0.05,lh,pal.L*mm-0.05,COL3.box[0]);load.position.y=pal.h*mm+lh/2;carry.add(load);const sheets=box3(pal.W*mm-0.05,0.12,pal.L*mm-0.05,COL3.sheet);sheets.position.y=pal.h*mm+0.06;carry.add(sheets);
 const hand=box3(0.5,0.06,0.4,COL3.sheet);hand.position.set(a.kind==='jack'?1.2:0.45,1.0,0);hand.visible=false;g.add(hand);
 g.userData={carry,pm,load,sheets,hand};V3.dyn.add(g);return g;}
function render3D(){
 if(!V3.ok||!S||!DD)return;const c=CFG,D=DD,pal=D.pal,mm=1/1000,dyn=V3.dyn;
 V3.robots.forEach(R=>{const r=S.robots[R.r.i];const dx=r.x-r.base.x,dz=r.y-r.base.y,yaw=Math.atan2(dz,dx);let d=Math.hypot(dx,dz)*mm;const hS=(c.baseH+350)*mm;let h=(r.z+c.gripH)*mm-hS;let Dd=Math.hypot(d,h);const L=R.L;if(Dd>2*L-0.01){const k=(2*L-0.01)/Dd;d*=k;h*=k;Dd=2*L-0.01;}if(d<0.005){d=0.005;Dd=Math.hypot(d,h);}
  const a1=Math.atan2(h,d)+Math.acos(clamp(Dd/(2*L),-1,1)),phi=Math.acos(clamp((2*L*L-Dd*Dd)/(2*L*L),-1,1)),a2=phi-Math.PI;
  R.g0.rotation.y=-yaw;R.g1.rotation.z=a1;R.g2.rotation.z=a2;R.gw.rotation.z=-(a1+a2);R.gw.rotation.y=0;
  R.carry.rotation.y=yaw-(r.yaw||0)*Math.PI/180;   // кисть довёрнута по стороне паллеты
  R.cb.visible=r.carryKind==='box';R.cs.visible=r.carryKind==='sheet';R.cp.visible=r.carryKind==='pallet';
  if(r.carryKind==='box'){const col=COL3.box[r.carryBi%4],hb=R.hb;
   // после перестроения зоны стоят блоком nc×nr, до него — рядом, как коробки пришли с конвейера
   const g=r.job&&r.job.group,blk=['toPlace','downPlace','place'].includes(r.step)&&g&&g.nr>1;
   const nc=Math.max(1,blk?g.nc:r.carry),nr=Math.max(1,blk?g.nr:1);
   R.cb.children.forEach((m,j)=>{m.visible=j<r.carry;m.material.color.setHex(col);
    if(j<r.carry)m.position.set((j%nc-(nc-1)/2)*hb.l*mm,-hb.h*mm/2,(Math.floor(j/nc)-(nr-1)/2)*hb.w*mm);});
   R.plate.scale.set((nc*hb.l*mm-0.01)/R.pw,1,(nr*hb.w*mm-0.01)/R.pd);}
  else R.plate.scale.set(1,1,1);});
 D.LY.convs.forEach((cv,i)=>{const key='cv'+i;if(!V3.pools[key])V3.pools[key]=[];const pool=V3.pools[key],b=cv.b,col=COL3.box[cv.bi%4];S.conv[i].boxes.forEach((bx,j)=>{if(!pool[j]){pool[j]=taraMesh(b,col,0);dyn.add(pool[j]);}const m=pool[j];m.visible=true;m.position.set((cv.x0+b.l/2+bx.p*(cv.len-b.l))*mm,(c.convH+b.h/2)*mm,cv.y*mm);});for(let j=S.conv[i].boxes.length;j<pool.length;j++)pool[j].visible=false;});
 V3.gw=new Map();
 S.st.forEach(s=>{const st=V3.stations[s.id];if(!st)return;const sig=`${s.present}|${s.layer}|${s.placed.length}|${s.parity}|${s.sheetLayers.length}|${s.complete}`;if(V3.cache[s.id]!==sig){V3.cache[s.id]=sig;buildStation3(s);}
  const off=s.phase==='out'?s.out*(pal.W+600):0;st.outer.position.set((s.slot.cx+s.slot.cos*off)*mm,0,(s.slot.cy+s.slot.sin*off)*mm);
  const gg=V3.gates[s.id];if(gg)V3.gw.set(gg,(V3.gw.get(gg)||false)||s.phase==='out'||(released(s)&&c.exch.out!=='conveyor'));});
 S.mags.forEach(m=>{const st=V3.mags[m.id];if(!st)return;const hh=Math.max(0.004,m.sheets*0.004);st.scale.y=hh;st.position.y=pal.h*mm+hh/2;const gg=V3.gates[m.id];if(gg)V3.gw.set(gg,(V3.gw.get(gg)||false)||m.loading);});
 V3.gw.forEach((off,g)=>setCurtain(g,off?COL3.off:COL3.red));
 S.stacks.forEach(p=>{const st=V3.stacks[p.id];if(!st)return;const sig='ps'+p.n;if(V3.cache[p.id]!==sig){V3.cache[p.id]=sig;clear3(st.g);for(let i=0;i<p.n;i++){const pm=palletMesh(pal);pm.position.y=i*pal.h*mm;st.g.add(pm);}}});
 const seen=new Set();S.agents.forEach(a=>{seen.add(a.id);let g=V3.agents[a.id];if(!g){g=agentMesh(a);V3.agents[a.id]=g;}g.position.set(a.x*mm,0,a.y*mm);g.rotation.y=-a.target.slot.ang*Math.PI/180;const u=g.userData;const byHand=a.carry==='sheets'&&a.kind!=='amr';u.carry.visible=!!a.carry&&!byHand;u.hand.visible=byHand;u.load.visible=a.carry==='full';u.sheets.visible=a.carry==='sheets';if(a.carry==='full')u.load.material.color.setHex(COL3.box[(a.target.bi||0)%4]);});
 Object.keys(V3.agents).forEach(id=>{if(!seen.has(+id)){dyn.remove(V3.agents[id]);delete V3.agents[id];}});
 if(D.safety==='cobot'){if(!V3.person){V3.person=agentMesh({kind:'person'});V3.person.rotation.y=Math.PI;V3.person.userData.carry.visible=false;}const rad=S.person==='away'?GG.rDraw+200:S.person==='slow'?Math.min(D.rSlow,GG.rDraw)-250:D.rStop-200;V3.person.position.set(rad*0.6*mm,0,rad*0.8*mm);V3.person.visible=true;}
 if(D.safety==='fence'){V3.curtains.forEach(g=>setCurtain(g,S.lc.broken?COL3.yellow:S.lc.muted?COL3.off:COL3.red));
  if(V3.door)V3.door.rotation.y=S.door==='open'?-1.2:0;if(V3.lock)V3.lock.material.color.setHex(S.lock?COL3.green:COL3.red);}
 const o=V3.orbit;if(V3.follow){const r=S.robots[0];o.tx+=(r.x*mm-o.tx)*0.1;o.tz+=(r.y*mm-o.tz)*0.1;o.ty+=(r.z*mm*0.6-o.ty)*0.1;}
 const cam=V3.cam;cam.position.set(o.tx+o.r*Math.sin(o.phi)*Math.cos(o.theta),o.ty+o.r*Math.cos(o.phi),o.tz+o.r*Math.sin(o.phi)*Math.sin(o.theta));cam.lookAt(o.tx,o.ty,o.tz);
 V3.ren.render(V3.scene,cam);}
