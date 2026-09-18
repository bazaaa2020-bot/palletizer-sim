// ======================= 3D-ВИД =======================
const V3={ok:false,orbit:{theta:-0.9,phi:0.95,r:9,tx:0,ty:0.5,tz:1},follow:false,cache:{},pools:{},agents:{}};
const COL3={box:[0xC9A66B,0x8DB3A0,0xB39DDB,0xE0A0A0],sheet:0x8FA3B5,robot:0xE0762C,fence:0x7B8794,pallet:0xB08D57,conv:0x9AA3AB,floor:0xD9DEE3,agent:0x3A6EA5,fork:0xF5B400,amr:0xF2F4F6,red:0xD33B2F,off:0xB8C0C8,green:0x2A9D5C,yellow:0xF5B400};
function mat(col,o){return new THREE.MeshLambertMaterial(Object.assign({color:col},o||{}));}
function box3(w,h,d,col,o){return new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(col,o));}
function label3(text,size){const cv=document.createElement('canvas');cv.width=128;cv.height=64;const ctx=cv.getContext('2d');ctx.font='bold 40px sans-serif';ctx.fillStyle='#1E2730';ctx.textAlign='center';ctx.fillText(text,64,46);const t=new THREE.CanvasTexture(cv);const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:t,depthTest:false}));sp.scale.set((size||0.6),(size||0.6)/2,1);return sp;}
function init3D(){
 const wrap=$('v3wrap');if(typeof THREE==='undefined'){$('v3msg').textContent='Библиотека three.js не загрузилась — 3D-вид недоступен без доступа к cdnjs.cloudflare.com.';return;}
 let ren;try{ren=new THREE.WebGLRenderer({antialias:true,alpha:true});}catch(e){$('v3msg').textContent='WebGL недоступен в этом браузере — 3D-вид отключён.';return;}
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
 if(D.safety==='fence'){const F=D.F,fm=mat(COL3.fence,{transparent:true,opacity:0.22,side:THREE.DoubleSide});const wall=(x0,z0,x1,z1)=>{const len=Math.hypot(x1-x0,z1-z0);const m=new THREE.Mesh(new THREE.PlaneGeometry(len,2),fm);m.position.set((x0+x1)/2,1,(z0+z1)/2);m.rotation.y=-Math.atan2(z1-z0,x1-x0);R.add(m);for(let t=0;t<=len;t+=1.5){const p=box3(0.06,2,0.06,COL3.fence);p.position.set(x0+(x1-x0)*t/len,1,z0+(z1-z0)*t/len);R.add(p);}};
  const x0=F.x0*mm,x1=F.x1*mm,z0=F.y0*mm,z1=F.y1*mm;wall(x0,z0,x1,z0);wall(x1,z0,x1,z1);wall(x1,z1,x0,z1);wall(x0,z1,x0,z0);
  LY.convs.forEach((cv,i)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(cv.w*mm+0.24,1.2),mat(COL3.red,{transparent:true,opacity:0.35,side:THREE.DoubleSide}));m.position.set(x0,0.9,cv.y*mm);m.rotation.y=Math.PI/2;R.add(m);V3.curtains.push(m);});
  const door=box3(0.8,2,0.05,COL3.fence,{transparent:true,opacity:0.6});door.position.set(0.4,1,0);const dg=new THREE.Group();dg.position.set((F.x1-1100)*mm,0,F.y1*mm);dg.add(door);R.add(dg);V3.door=dg;}
 else LY.robots.forEach(r=>{[[D.rStop,COL3.red],[Math.min(D.rSlow,3000),COL3.yellow]].forEach(([rad,col])=>{const ring=new THREE.Mesh(new THREE.RingGeometry(rad*mm-0.04,rad*mm,64),mat(col,{transparent:true,opacity:0.5,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.set(r.base.x*mm,0.004,r.base.y*mm);R.add(ring);});});
 LY.convs.forEach((cv,i)=>{const len=cv.len*mm,w=cv.w*mm,h=c.convH*mm,xc=(cv.x0+cv.x1)/2*mm,zc=cv.y*mm;const frame=box3(len,0.08,w,COL3.conv);frame.position.set(xc,h-0.04,zc);R.add(frame);
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([sx,sz])=>{const leg=box3(0.05,h,0.05,COL3.fence);leg.position.set(xc+sx*(len/2-0.15),h/2,zc+sz*(w/2-0.05));R.add(leg);});
  const rg=new THREE.CylinderGeometry(0.03,0.03,w-0.1,10),rm=mat(0xc5ccd3);for(let x=cv.x0+75;x<cv.x1;x+=150){const roll=new THREE.Mesh(rg,rm);roll.rotation.x=Math.PI/2;roll.position.set(x*mm,h,zc);R.add(roll);}
  const stop=box3(0.03,0.25,w,0x1e2730);stop.position.set(cv.x1*mm,h+0.1,zc);R.add(stop);});
 const reach=D.rob.reach*mm,L=reach/2;
 LY.robots.forEach(r=>{const bx=r.base.x*mm,bz=r.base.y*mm,bh=c.baseH*mm;if(bh>0){const ped=new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.28,bh,24),mat(COL3.fence));ped.position.set(bx,bh/2,bz);R.add(ped);}
  const base=new THREE.Mesh(new THREE.CylinderGeometry(0.19,0.21,0.3,24),mat(0x2f3740));base.position.set(bx,bh+0.15,bz);R.add(base);
  const g0=new THREE.Group();g0.position.set(bx,bh+0.15,bz);R.add(g0);const sh=new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.16,0.3,20),mat(COL3.robot));sh.position.y=0.2;g0.add(sh);
  const g1=new THREE.Group();g1.position.set(0,0.2,0);g0.add(g1);const ua=box3(L,0.16,0.14,COL3.robot);ua.position.x=L/2;g1.add(ua);const j1=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.12,0.22,20),mat(0x2f3740));j1.rotation.x=Math.PI/2;g1.add(j1);
  const g2=new THREE.Group();g2.position.set(L,0,0);g1.add(g2);const fa=box3(L,0.13,0.12,COL3.robot);fa.position.x=L/2;g2.add(fa);const j2=new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.1,0.2,20),mat(0x2f3740));j2.rotation.x=Math.PI/2;g2.add(j2);
  const gw=new THREE.Group();gw.position.set(L,0,0);g2.add(gw);const fl=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,c.gripH*mm,16),mat(0x2f3740));fl.position.y=-c.gripH*mm/2;gw.add(fl);
  const hb=D.heaviest,pw=c.grip.pick*hb.l*mm+0.05,pd=hb.w*mm+0.05;const plate=box3(pw,0.06,pd,0x4a525b);plate.position.y=-c.gripH*mm+0.03;gw.add(plate);
  const carry=new THREE.Group();carry.position.y=-c.gripH*mm;gw.add(carry);
  const cb=new THREE.Group();for(let j=0;j<c.grip.pick;j++){const b=box3(hb.l*mm-0.01,hb.h*mm,hb.w*mm-0.01,COL3.box[0]);b.position.set((j-(c.grip.pick-1)/2)*hb.l*mm,-hb.h*mm/2,0);cb.add(b);}cb.visible=false;carry.add(cb);
  const cs=box3(pal.W*mm,0.01,pal.L*mm,COL3.sheet);cs.position.y=-0.005;cs.visible=false;carry.add(cs);const cp=palletMesh(pal);cp.position.y=-pal.h*mm;cp.visible=false;carry.add(cp);
  V3.robots.push({r,g0,g1,g2,gw,cb,cs,cp,L});});
 LY.robots.forEach(r=>r.slots.forEach(sl=>{const g=new THREE.Group();g.position.set(sl.cx*mm,0,sl.cy*mm);g.rotation.y=-sl.ang*Math.PI/180;R.add(g);
  const outline=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(pal.W*mm,pal.L*mm)),new THREE.LineBasicMaterial({color:COL3.fence}));outline.rotation.x=-Math.PI/2;outline.position.y=0.005;g.add(outline);
  const lb=label3(sl.id,0.5);lb.position.set(0,0.35,0);g.add(lb);
  const gate=new THREE.Mesh(new THREE.PlaneGeometry(pal.L*mm+0.3,1.0),mat(COL3.red,{transparent:true,opacity:0.35,side:THREE.DoubleSide}));gate.position.set((pal.W/2+350)*mm,0.8,0);gate.rotation.y=Math.PI/2;g.add(gate);V3.gates[sl.id]=gate;
  if(sl.kind==='mg'){const rack=new THREE.Group();g.add(rack);[[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([sx,sz])=>{const p=box3(0.04,0.9,0.04,COL3.fence);p.position.set(sx*pal.W*mm/2,0.45,sz*pal.L*mm/2);rack.add(p);});const base=box3(pal.W*mm,pal.h*mm,pal.L*mm,COL3.pallet);base.position.y=pal.h*mm/2;g.add(base);const stack=box3(pal.W*mm-0.05,1,pal.L*mm-0.05,COL3.sheet);g.add(stack);V3.mags[sl.id]=stack;}
  if(sl.kind==='ps'){const st=new THREE.Group();g.add(st);V3.stacks[sl.id]={g:st,pal};}
  if(sl.kind==='st'){const st=new THREE.Group();g.add(st);V3.stations[sl.id]={g:st,outer:g,sl};}
  if(sl.kind!=='ps'&&!(sl.kind==='st'&&c.exch.out==='conveyor')){const pad=new THREE.Mesh(new THREE.PlaneGeometry(1.6,1.6),mat(0xc5ccd3,{transparent:true,opacity:0.5}));pad.rotation.x=-Math.PI/2;pad.position.set(sl.park.x*mm,0.003,sl.park.y*mm);R.add(pad);}}));
 V3.gridSig='';home3D();}
function palletMesh(pal){const g=new THREE.Group(),mm=1/1000,W=pal.W*mm,Lz=pal.L*mm,h=pal.h*mm;const m=mat(COL3.pallet);
 [-1,0,1].forEach(k=>{const b=new THREE.Mesh(new THREE.BoxGeometry(W,h*0.3,0.1),m);b.position.set(0,h*0.15,k*(Lz/2-0.06));g.add(b);});
 const top=new THREE.Mesh(new THREE.BoxGeometry(W,h*0.2,Lz),m);top.position.y=h*0.9;g.add(top);
 [-1,0,1].forEach(k=>{const b=new THREE.Mesh(new THREE.BoxGeometry(0.1,h*0.5,Lz),m);b.position.set(k*(W/2-0.06),h*0.55,0);g.add(b);});return g;}
function buildStation3(s){const c=CFG,pal=DD.pal,mm=1/1000,b=boxOf(c,s.bi),col=COL3.box[s.bi%4],g=V3.stations[s.id].g;clear3(g);if(!s.present)return;
 g.add(palletMesh(pal));const geo={0:new THREE.BoxGeometry(b.l*mm-0.008,b.h*mm-0.004,b.w*mm-0.008),1:new THREE.BoxGeometry(b.w*mm-0.008,b.h*mm-0.004,b.l*mm-0.008)},m=mat(col);
 const sheetsBelow=j=>s.sheetLayers.filter(x=>x<=j).length*4;
 const addLayer=(cells,idx,j)=>{const y=(pal.h+j*b.h+sheetsBelow(j))*mm;idx.forEach(i=>{const cl=cells[i];const mesh=new THREE.Mesh(geo[cl.rot],m);mesh.position.set(cl.x*mm,y+b.h*mm/2,cl.y*mm);g.add(mesh);});};
 for(let j=0;j<s.layer;j++){const cells=(s.pat.interlock&&j%2)?s.pat.cellsB:s.pat.cells;addLayer(cells,cells.map((x,i)=>i),j);}
 if(s.placed.length)addLayer(curCells(s),s.placed,s.layer);
 s.sheetLayers.forEach(l=>{const y=(pal.h+l*b.h+s.sheetLayers.filter(x=>x<l).length*4)*mm;const sh=box3(pal.W*mm-0.02,0.004,pal.L*mm-0.02,COL3.sheet);sh.position.y=y+0.002;g.add(sh);});}
function agentMesh(a){const c=CFG,pal=DD.pal,mm=1/1000,g=new THREE.Group();
 if(a.kind==='person'||a.kind==='jack'){const body=new THREE.Mesh(new THREE.CylinderGeometry(0.18,0.2,1.3,14),mat(COL3.agent));body.position.set(0,0.65,0);const head=new THREE.Mesh(new THREE.SphereGeometry(0.13,14,12),mat(0xE8C39E));head.position.set(0,1.5,0);const person=new THREE.Group();person.add(body,head);
  if(a.kind==='jack'){person.position.x=0.9;const forks=box3(1.2,0.06,0.55,COL3.agent);forks.position.set(0,0.06,0);const handle=box3(0.05,1.1,0.05,COL3.agent);handle.position.set(0.65,0.6,0);g.add(forks,handle);}g.add(person);}
 else if(a.kind==='forklift'){const body=box3(1.4,0.9,1.1,COL3.fork);body.position.set(0.5,0.5,0);const mast=box3(0.1,2,1.0,COL3.fence);mast.position.set(-0.4,1,0);const forks=box3(1.2,0.05,0.5,COL3.fence);forks.position.set(-1.0,0.08,0);const cab=box3(0.9,0.9,0.9,0x2f3740,{transparent:true,opacity:0.35});cab.position.set(0.6,1.4,0);g.add(body,mast,forks,cab);}
 else{const body=box3(1.3,0.35,0.95,COL3.amr);body.position.set(0,0.18,0);const lamp=new THREE.Mesh(new THREE.SphereGeometry(0.05,10,8),mat(COL3.green));lamp.position.set(-0.6,0.4,0.4);g.add(body,lamp);}
 const carry=new THREE.Group();carry.position.set(a.kind==='forklift'?-1.0:0,a.kind==='amr'?0.36:a.kind==='forklift'?0.1:0.09,0);g.add(carry);const pm=palletMesh(pal);carry.add(pm);
 const load=box3(pal.W*mm-0.05,0.5,pal.L*mm-0.05,COL3.box[0]);load.position.y=pal.h*mm+0.25;carry.add(load);const sheets=box3(pal.W*mm-0.05,0.12,pal.L*mm-0.05,COL3.sheet);sheets.position.y=pal.h*mm+0.06;carry.add(sheets);
 const hand=box3(0.5,0.06,0.4,COL3.sheet);hand.position.set(a.kind==='jack'?1.2:0.3,1.0,0);hand.visible=false;g.add(hand);
 g.userData={carry,pm,load,sheets,hand};V3.dyn.add(g);return g;}
function render3D(){
 if(!V3.ok||!S||!DD)return;const c=CFG,D=DD,pal=D.pal,mm=1/1000,dyn=V3.dyn;
 V3.robots.forEach(R=>{const r=S.robots[R.r.i];const dx=r.x-r.base.x,dz=r.y-r.base.y,yaw=Math.atan2(dz,dx);let d=Math.hypot(dx,dz)*mm;const hS=(c.baseH+350)*mm;let h=(r.z+c.gripH)*mm-hS;let Dd=Math.hypot(d,h);const L=R.L;if(Dd>2*L-0.01){const k=(2*L-0.01)/Dd;d*=k;h*=k;Dd=2*L-0.01;}if(d<0.05){d=0.05;Dd=Math.hypot(d,h);}
  const a1=Math.atan2(h,d)+Math.acos(clamp(Dd/(2*L),-1,1)),phi=Math.acos(clamp((2*L*L-Dd*Dd)/(2*L*L),-1,1)),a2=phi-Math.PI;
  R.g0.rotation.y=-yaw;R.g1.rotation.z=a1;R.g2.rotation.z=a2;R.gw.rotation.z=-(a1+a2);R.gw.rotation.y=0;
  R.cb.visible=r.carryKind==='box';R.cs.visible=r.carryKind==='sheet';R.cp.visible=r.carryKind==='pallet';
  if(r.carryKind==='box'){const col=COL3.box[r.carryBi%4];R.cb.children.forEach((m,j)=>{m.visible=j<r.carry;m.material.color.setHex(col);});}});
 D.LY.convs.forEach((cv,i)=>{const key='cv'+i;if(!V3.pools[key])V3.pools[key]=[];const pool=V3.pools[key],b=cv.b,col=COL3.box[cv.bi%4];S.conv[i].boxes.forEach((bx,j)=>{if(!pool[j]){pool[j]=box3(b.l*mm-0.01,b.h*mm,b.w*mm-0.01,col);dyn.add(pool[j]);}const m=pool[j];m.visible=true;m.position.set((cv.x0+b.l/2+bx.p*(cv.len-b.l))*mm,(c.convH+b.h/2)*mm,cv.y*mm);});for(let j=S.conv[i].boxes.length;j<pool.length;j++)pool[j].visible=false;});
 S.st.forEach(s=>{const st=V3.stations[s.id];if(!st)return;const sig=`${s.present}|${s.layer}|${s.placed.length}|${s.parity}|${s.sheetLayers.length}|${s.complete}`;if(V3.cache[s.id]!==sig){V3.cache[s.id]=sig;buildStation3(s);}
  const off=s.phase==='out'?s.out*(pal.W+600):0;st.outer.position.set((s.slot.cx+s.slot.cos*off)*mm,0,(s.slot.cy+s.slot.sin*off)*mm);
  const g=V3.gates[s.id];if(g)g.material.color.setHex(s.phase==='out'||(released(s)&&c.exch.out!=='conveyor')?COL3.off:COL3.red);});
 S.mags.forEach(m=>{const st=V3.mags[m.id];if(!st)return;const hh=Math.max(0.004,m.sheets*0.004);st.scale.y=hh;st.position.y=pal.h*mm+hh/2;const g=V3.gates[m.id];if(g)g.material.color.setHex(m.loading?COL3.off:COL3.red);});
 S.stacks.forEach(p=>{const st=V3.stacks[p.id];if(!st)return;const sig='ps'+p.n;if(V3.cache[p.id]!==sig){V3.cache[p.id]=sig;clear3(st.g);for(let i=0;i<p.n;i++){const pm=palletMesh(pal);pm.position.y=i*pal.h*mm;st.g.add(pm);}}});
 const seen=new Set();S.agents.forEach(a=>{seen.add(a.id);let g=V3.agents[a.id];if(!g){g=agentMesh(a);V3.agents[a.id]=g;}g.position.set(a.x*mm,0,a.y*mm);g.rotation.y=-a.target.slot.ang*Math.PI/180+(a.kind==='forklift'?Math.PI:0);const u=g.userData;const byHand=a.carry==='sheets'&&a.kind!=='amr';u.carry.visible=!!a.carry&&!byHand;u.hand.visible=byHand;u.load.visible=a.carry==='full';u.sheets.visible=a.carry==='sheets';if(a.carry==='full')u.load.material.color.setHex(COL3.box[(a.target.bi||0)%4]);});
 Object.keys(V3.agents).forEach(id=>{if(!seen.has(+id)){dyn.remove(V3.agents[id]);delete V3.agents[id];}});
 if(D.safety==='cobot'){if(!V3.person){V3.person=agentMesh({kind:'person'});V3.person.rotation.y=Math.PI;V3.person.userData.carry.visible=false;}const rad=S.person==='away'?GG.rDraw+200:S.person==='slow'?Math.min(D.rSlow,GG.rDraw)-250:D.rStop-200;V3.person.position.set(rad*0.6*mm,0,rad*0.8*mm);V3.person.visible=true;}
 if(D.safety==='fence'){V3.curtains.forEach(m=>m.material.color.setHex(S.lc.broken?COL3.yellow:S.lc.muted?COL3.off:COL3.red));if(V3.door)V3.door.rotation.y=S.door==='open'?-1.2:0;}
 const o=V3.orbit;if(V3.follow){const r=S.robots[0];o.tx+=(r.x*mm-o.tx)*0.1;o.tz+=(r.y*mm-o.tz)*0.1;o.ty+=(r.z*mm*0.6-o.ty)*0.1;}
 const cam=V3.cam;cam.position.set(o.tx+o.r*Math.sin(o.phi)*Math.cos(o.theta),o.ty+o.r*Math.cos(o.phi),o.tz+o.r*Math.sin(o.phi)*Math.sin(o.theta));cam.lookAt(o.tx,o.ty,o.tz);
 V3.ren.render(V3.scene,cam);}
