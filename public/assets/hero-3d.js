// Hero · un vrai film en isométrie, et sous lui ses quatre temps qui montent au rythme de la lecture.
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

const root=document.documentElement, hero=document.querySelector('.hero'), cv=hero&&hero.querySelector('.hx-cv'), fig=hero&&hero.querySelector('.hx-f');
if(!cv||!fig) throw new Error('hero');
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const C={ink:0x150A26,vio:0x9E37FF,lav:0xEFE7FC,mid:0xD6C1F8,white:0xffffff};
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x)), seg=(t,a,b)=>clamp((t-a)/(b-a)), nz=x=>Math.max(.001,x);
const eo=t=>1-Math.pow(1-t,3), back=t=>{ const c1=1.25,c3=c1+1; return 1+c3*Math.pow(t-1,3)+c1*Math.pow(t-1,2); };
const GREY='#77727F', VIO='#8A2BE8';
/* les quatre temps du film (en secondes) */
const DUR=90.6, ACTS=[[0,14,'accroche',.12,C.vio],[14,35,'problème',.2,C.lav],[35,72,'solution',.32,C.mid],[72,DUR,'expertise',.46,C.white]];

try{ await document.fonts.load('500 40px "Geist Mono"'); }catch(e){}
let R; try{ R=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true}); }catch(e){ root.classList.add('no-hero-gl'); throw e; }
R.setClearColor(0,0); R.outputColorSpace=THREE.SRGBColorSpace; R.shadowMap.enabled=true; R.shadowMap.type=THREE.PCFSoftShadowMap;

const scene=new THREE.Scene(), cam=new THREE.OrthographicCamera(-1,1,1,-1,.1,100);
scene.add(new THREE.HemisphereLight(0xffffff,0xE6E3EA,2.05));
const sun=new THREE.DirectionalLight(0xffffff,1.6); sun.position.set(-3.5,10,-1.2); sun.castShadow=true; sun.shadow.mapSize.set(1024,1024);
Object.assign(sun.shadow.camera,{left:-4,right:4,top:4,bottom:-4,near:1,far:30}); sun.shadow.bias=-.0005; sun.shadow.normalBias=.02; sun.shadow.radius=4; scene.add(sun);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(40,40),new THREE.ShadowMaterial({opacity:.09,color:0x24212C})); floor.rotation.x=-Math.PI/2; floor.receiveShadow=true; scene.add(floor);

const box=(w,h,d,color,o={})=>{ const m=new THREE.Mesh(new RoundedBoxGeometry(w,h,d,3,Math.min(.03,h/2.4,w/2.4,d/2.4)),new THREE.MeshStandardMaterial({color,roughness:.5,...o})); m.castShadow=m.receiveShadow=true; return m; };
function textTex(txt,{size=96,color='#150A26',align='left',upper=true}={}){
  const c=document.createElement('canvas'), g=c.getContext('2d'), lines=(upper?txt.toUpperCase():txt).split('\n'), f=`500 ${size}px "Geist Mono", ui-monospace, monospace`;
  g.font=f; g.letterSpacing=Math.round(size*.06)+'px'; const lh=Math.ceil(size*1.3), w=Math.ceil(Math.max(...lines.map(l=>g.measureText(l).width)))+24, h=lh*lines.length;
  c.width=w; c.height=h; g.font=f; g.letterSpacing=Math.round(size*.06)+'px'; g.fillStyle=color; g.textBaseline='middle'; g.textAlign=align;
  lines.forEach((l,i)=>g.fillText(l,align==='center'?w/2:12,lh*i+lh/2+size*.04));
  const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; t.anisotropy=4; return {t,asp:w/h,n:lines.length}; }
function label(txt,h,o={}){ const {t,asp,n}=textTex(txt,o), hh=h*n, w=hh*asp, g=new THREE.PlaneGeometry(w,hh); g.translate(o.bb?w/2-(o.left||0):w/2,0,0);
  const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({map:t,transparent:true,depthWrite:false})); m.renderOrder=3; if(o.bb){ m.material.depthTest=false; m.renderOrder=5; } else m.rotation.x=-Math.PI/2; return m; }
const PT=(()=>{ const c=document.createElement('canvas'); c.width=c.height=128; const g=c.getContext('2d'), r=g.createRadialGradient(64,64,0,64,64,64);
  r.addColorStop(0,'rgba(255,255,255,1)'); r.addColorStop(.4,'rgba(255,255,255,.42)'); r.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=r; g.fillRect(0,0,128,128); return new THREE.CanvasTexture(c); })();
const pool=(sx,sz)=>{ const m=new THREE.Mesh(new THREE.PlaneGeometry(sx,sz),new THREE.MeshBasicMaterial({map:PT,color:0xA45BFF,transparent:true,opacity:0,depthWrite:false})); m.rotation.x=-Math.PI/2; m.position.y=.003; m.renderOrder=1; return m; };
function check(s){ const c=document.createElement('canvas'); c.width=c.height=128; const g=c.getContext('2d'); g.fillStyle='#9E37FF'; g.fillRect(0,0,128,128);
  g.strokeStyle='#fff'; g.lineWidth=12; g.lineCap=g.lineJoin='round'; g.beginPath(); g.moveTo(36,66); g.lineTo(56,86); g.lineTo(94,44); g.stroke(); const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace;
  const gr=new THREE.Group(), b=box(s,s*.42,s,C.vio,{emissive:C.vio,emissiveIntensity:.3}); b.castShadow=false; gr.add(b); const top=new THREE.Mesh(new THREE.PlaneGeometry(s*.84,s*.84),new THREE.MeshBasicMaterial({map:t})); top.rotation.x=-Math.PI/2; top.position.y=s*.21+.002; gr.add(top); return gr; }

/* le film */
const vid=document.createElement('video'); Object.assign(vid,{muted:true,loop:true,playsInline:true,preload:'auto'}); vid.setAttribute('muted',''); vid.src='/assets/hero-nikita.mp4';
const VT=new THREE.VideoTexture(vid); VT.colorSpace=THREE.SRGBColorSpace;
const L=2.9, x0=-L/2, X=s=>x0+L*s/DUR, SW=2.5, SH=SW*274/640, SZ=-.47;
const track=box(L+.3,.06,1.25,C.white); track.position.y=.03; scene.add(track);
const frame=box(SW+.08,SH+.08,.06,C.white); frame.position.set(0,.58+SH/2,SZ); scene.add(frame);
const poster=new THREE.TextureLoader().load('/assets/hero-nikita.jpg'); poster.colorSpace=THREE.SRGBColorSpace;
const scr=new THREE.Mesh(new THREE.PlaneGeometry(SW,SH),new THREE.MeshBasicMaterial({map:poster})); scr.position.set(0,frame.position.y,SZ+.032); scene.add(scr);
/* timecode sur l'écran */
const tc=document.createElement('canvas'); tc.width=300; tc.height=64; const tg=tc.getContext('2d'), tt=new THREE.CanvasTexture(tc); tt.colorSpace=THREE.SRGBColorSpace; tt.anisotropy=4; let tk=-1;
const mm=s=>Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0');
const tcSet=s=>{ const k=Math.floor(s); if(k===tk) return; tk=k; tg.fillStyle='#150A26'; tg.fillRect(0,0,300,64); tg.fillStyle='#fff'; tg.font='500 30px "Geist Mono", ui-monospace, monospace'; tg.textBaseline='middle'; tg.fillText(mm(s)+' / '+mm(DUR),18,34); tt.needsUpdate=true; };
tcSet(0); const tcm=new THREE.Mesh(new THREE.PlaneGeometry(.47,.1),new THREE.MeshBasicMaterial({map:tt})); tcm.position.set(-SW/2+.27,frame.position.y+SH/2-.08,SZ+.034); scene.add(tcm);
/* les quatre temps */
const blocks=ACTS.map(([a,b,n,h,c])=>{ const w=X(b)-X(a)-.04, m=box(w,h,.42,c,c===C.vio?{emissive:C.vio,emissiveIntensity:.25}:{});
  m.userData={a,h,x:(X(a)+X(b))/2,st:X(a),base:c===C.vio?.25:0}; m.position.set(m.userData.x,0,.12); scene.add(m);
  const l=label(n,.1,{color:n==='accroche'?VIO:GREY}); l.position.set(X(a)+.02,.062,.47); scene.add(l); return m; });
const l0=label('0:00',.085,{color:GREY}); l0.position.set(x0+.02,.062,.6); scene.add(l0);
const l1=label(mm(DUR),.085,{color:GREY}); l1.position.set(x0+L-.36,.062,.6); scene.add(l1);
/* tête de lecture */
const sh=new THREE.Group();
const veil=new THREE.Mesh(new THREE.PlaneGeometry(.62,1),new THREE.MeshBasicMaterial({color:0xB47CFF,transparent:true,opacity:.16,side:THREE.DoubleSide,depthWrite:false}));
veil.rotation.y=Math.PI/2; veil.geometry.translate(0,.5,0); veil.position.z=.12; sh.add(veil);
const edge=box(.022,.022,.64,C.vio,{emissive:C.vio,emissiveIntensity:1.3}); edge.castShadow=false; edge.position.z=.12; sh.add(edge);
const foot=box(.025,.016,1.2,C.vio,{emissive:C.vio,emissiveIntensity:1.3}); foot.castShadow=false; sh.add(foot);
scene.add(sh); const pl=pool(1.2,1.3); scene.add(pl);
const bar=new THREE.Mesh((()=>{ const g=new THREE.PlaneGeometry(SW,.022); g.translate(SW/2,0,0); return g; })(),new THREE.MeshBasicMaterial({color:C.vio})); bar.position.set(-SW/2,frame.position.y-SH/2-.011,SZ+.034); scene.add(bar);
const ok=check(.22); scene.add(ok);
const cap=label('compréhension par votre client',.085,{color:VIO}); cap.position.set(X(50),.002,.8); scene.add(cap);

/* cadrage : la scène se place dans le rectangle de l'ancienne vidéo */
const TG=new THREE.Vector3(0,.72,-.12), ISO=new THREE.Vector3(10,10,10), UP=new THREE.Vector3(0,1,0), off=new THREE.Vector3(), VIEW=1.62;
let mxT=0,myT=0,mx=0,my=0;
addEventListener('pointermove',e=>{ mxT=e.clientX/innerWidth-.5; myT=e.clientY/innerHeight-.5; },{passive:true});
/* survol et clic sur un temps : on saute dans le film */
const ray=new THREE.Raycaster(), pv=new THREE.Vector2(); let hov=-1;
const pick=e=>{ const r=cv.getBoundingClientRect(); pv.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1); ray.setFromCamera(pv,cam); const h=ray.intersectObjects(blocks,false)[0]; return h?blocks.indexOf(h.object):-1; };
hero.addEventListener('pointermove',e=>{ if(e.target.closest('a,button,input,label,dd')) { hov=-1; } else hov=pick(e); hero.style.cursor=hov>=0?'pointer':''; },{passive:true});
hero.addEventListener('click',e=>{ if(e.target.closest('a,button,input,label,dd')) return; const k=pick(e); if(k>=0){ vid.currentTime=ACTS[k][0]+.05; vid.play().catch(()=>{}); } });

let vis=true, raf=0, started=false; const FT=new URLSearchParams(location.search).get('t3d');
new IntersectionObserver(es=>{ vis=es[0].isIntersecting; if(vis){ if(!RM) vid.play().catch(()=>{}); if(!raf) raf=requestAnimationFrame(frameFn); } else vid.pause(); }).observe(hero);
vid.addEventListener('playing',()=>{ if(scr.material.map!==VT){ scr.material.map=VT; scr.material.needsUpdate=true; } },{once:true});
function frameFn(now){
  raf=0; if(!vis) return;
  const r0=hero.getBoundingClientRect(), rf=fig.getBoundingClientRect(), dpr=Math.min(1.5,devicePixelRatio||1);
  const W=Math.round(r0.width), H=Math.round(r0.height); if(cv.width!==Math.round(W*dpr)||cv.height!==Math.round(H*dpr)){ R.setPixelRatio(dpr); R.setSize(W,H,false); }
  const k=rf.height/(2*VIEW), cx=rf.left-r0.left+rf.width/2, cy=rf.top-r0.top+rf.height/2;
  Object.assign(cam,{left:-cx/k,right:(W-cx)/k,top:cy/k,bottom:-(H-cy)/k}); cam.updateProjectionMatrix();
  mx+=(mxT-mx)*.05; my+=(myT-my)*.05;
  off.copy(ISO).applyAxisAngle(UP,mx*.12); off.y+=my*-1.2; cam.position.copy(TG).add(off); cam.lookAt(TG);
  /* état de lecture */
  const s=FT!==null?+FT:RM?DUR*.97:(vid.currentTime||0), xs=X(s), ap=eo(seg(now/1000,.2,1.2));
  tcSet(s); bar.scale.x=nz(s/DUR);
  blocks.forEach((m,i)=>{ const u=m.userData, kk=back(clamp((xs-u.st)/.25)), sy=nz(kk*ap); m.scale.set(1,sy,1); m.position.y=.06+u.h*sy/2;
    m.material.emissive.setHex(i===hov?C.vio:(u.base?C.vio:0)); m.material.emissiveIntensity=i===hov?.18:u.base; });
  let hh=.15; blocks.forEach(m=>{ if(xs>=m.userData.st) hh=m.userData.h; });
  const vh=hh+.28; sh.position.set(xs,.06,0); veil.scale.y=vh; edge.position.y=vh; pl.position.set(xs,.064,0); pl.material.opacity=.45;
  const e=back(seg(s,DUR-11,DUR-10)), b3=blocks[3].userData, y3=.06+b3.h+.2+Math.sin(now/500)*.025;
  ok.scale.setScalar(nz(e)); ok.position.set(b3.x,y3,.12); ok.visible=e>.01;
  cap.material.opacity=eo(seg(s,DUR-10,DUR-9));
  R.render(scene,cam);
  if(!started){ started=true; root.classList.add('hero-gl'); root.classList.remove('no-hero-gl'); const rv=document.getElementById('reel'); if(rv) rv.pause(); }
  if(!RM) raf=requestAnimationFrame(frameFn);
}
if(!RM) vid.play().catch(()=>{}); raf=requestAnimationFrame(frameFn);
