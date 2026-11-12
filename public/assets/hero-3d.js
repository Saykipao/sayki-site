// Hero · un vrai film en isométrie ; sous lui ses quatre temps, qui montent au rythme de la lecture.
// On peut faire glisser la tête de lecture ; chaque temps s'explique en deux puces.
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

const root=document.documentElement, hero=document.querySelector('.hero'), cv=hero&&hero.querySelector('.hx-cv'), fig=hero&&hero.querySelector('.hx-f'), note=hero&&hero.querySelector('.hx-note');
if(!cv||!fig) throw new Error('hero');
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const C={ink:0x150A26,vio:0x9E37FF,lav:0xEFE7FC,mid:0xD6C1F8,white:0xffffff};
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x)), seg=(t,a,b)=>clamp((t-a)/(b-a)), nz=x=>Math.max(.001,x);
const eo=t=>1-Math.pow(1-t,3), back=t=>{ const c1=1.25,c3=c1+1; return 1+c3*Math.pow(t-1,3)+c1*Math.pow(t-1,2); };
const GREY='#77727F', VIO='#8A2BE8';
const mm=s=>Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0');
/* les quatre temps du film (en secondes) et ce qu'ils font */
const DUR=90.6;
const ACTS=[
  {a:0,b:14,n:'accroche',h:.14,c:C.vio,t:'La question qui fait lever la tête.',l:['Quelques secondes, avant qu’on décroche.','Une question que votre client se pose déjà.']},
  {a:14,b:35,n:'problème',h:.24,c:C.lav,t:'Le quotidien de votre client, tel quel.',l:['Il s’y reconnaît, alors il reste.','On parle de lui avant de parler de vous.']},
  {a:35,b:72,n:'solution',h:.36,c:C.mid,t:'Votre service entre en scène.',l:['Ce que vous faites, montré, pas récité.','Une étape à la fois, sans jargon.']},
  {a:72,b:DUR,n:'expertise',h:.5,c:C.white,t:'Pourquoi vous, et pas un autre.',l:['Vos preuves : années, clients, méthode.','Et la suite : on vous appelle.']}];

try{ await document.fonts.load('500 40px "Geist Mono"'); }catch(e){}
let R; try{ R=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true}); }catch(e){ root.classList.add('no-hero-gl'); throw e; }
R.setClearColor(0,0); R.outputColorSpace=THREE.SRGBColorSpace; R.shadowMap.enabled=true; R.shadowMap.type=THREE.PCFSoftShadowMap;

const scene=new THREE.Scene(), cam=new THREE.OrthographicCamera(-1,1,1,-1,.1,100);
scene.add(new THREE.HemisphereLight(0xffffff,0xE6E3EA,2.1));
const sun=new THREE.DirectionalLight(0xffffff,1.5); sun.position.set(-3.5,10,-1.2); sun.castShadow=true; sun.shadow.mapSize.set(1024,1024);
Object.assign(sun.shadow.camera,{left:-4,right:4,top:4,bottom:-4,near:1,far:30}); sun.shadow.bias=-.0005; sun.shadow.normalBias=.02; sun.shadow.radius=5;


const box=(w,h,d,color,o={})=>{ const m=new THREE.Mesh(new RoundedBoxGeometry(w,h,d,3,Math.min(.03,h/2.4,w/2.4,d/2.4)),new THREE.MeshStandardMaterial({color,roughness:.5,...o})); m.castShadow=m.receiveShadow=true; return m; };
function textTex(txt,{size=96,color='#150A26'}={}){
  const c=document.createElement('canvas'), g=c.getContext('2d'), t=txt.toUpperCase(), f=`500 ${size}px "Geist Mono", ui-monospace, monospace`;
  g.font=f; g.letterSpacing=Math.round(size*.06)+'px'; const h=Math.ceil(size*1.3), w=Math.ceil(g.measureText(t).width)+24;
  c.width=w; c.height=h; g.font=f; g.letterSpacing=Math.round(size*.06)+'px'; g.fillStyle=color; g.textBaseline='middle'; g.fillText(t,12,h/2+size*.04);
  const tx=new THREE.CanvasTexture(c); tx.colorSpace=THREE.SRGBColorSpace; tx.anisotropy=4; return {tx,asp:w/h}; }
function label(txt,h,o={}){ const {tx,asp}=textTex(txt,o), w=h*asp, g=new THREE.PlaneGeometry(w,h); g.translate(w/2,0,0);
  const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({map:tx,transparent:true,depthWrite:false})); m.renderOrder=3; m.rotation.x=-Math.PI/2; return m; }
const PT=(()=>{ const c=document.createElement('canvas'); c.width=c.height=128; const g=c.getContext('2d'), r=g.createRadialGradient(64,64,0,64,64,64);
  r.addColorStop(0,'rgba(255,255,255,1)'); r.addColorStop(.4,'rgba(255,255,255,.42)'); r.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=r; g.fillRect(0,0,128,128); return new THREE.CanvasTexture(c); })();
const pool=(sx,sz,col=0xA45BFF,op=0)=>{ const m=new THREE.Mesh(new THREE.PlaneGeometry(sx,sz),new THREE.MeshBasicMaterial({map:PT,color:col,transparent:true,opacity:op,depthWrite:false})); m.rotation.x=-Math.PI/2; m.position.y=.003; m.renderOrder=1; return m; };
function check(s){ const c=document.createElement('canvas'); c.width=c.height=128; const g=c.getContext('2d'); g.fillStyle='#9E37FF'; g.fillRect(0,0,128,128);
  g.strokeStyle='#fff'; g.lineWidth=12; g.lineCap=g.lineJoin='round'; g.beginPath(); g.moveTo(36,66); g.lineTo(56,86); g.lineTo(94,44); g.stroke(); const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace;
  const gr=new THREE.Group(), b=box(s,s*.42,s,C.vio,{emissive:C.vio,emissiveIntensity:.3}); b.castShadow=false; gr.add(b); const top=new THREE.Mesh(new THREE.PlaneGeometry(s*.84,s*.84),new THREE.MeshBasicMaterial({map:t})); top.rotation.x=-Math.PI/2; top.position.y=s*.21+.002; gr.add(top); return gr; }

/* ---------- la scène ---------- */
const vid=document.createElement('video'); Object.assign(vid,{muted:true,loop:true,playsInline:true,preload:'auto'}); vid.setAttribute('muted',''); vid.src=innerWidth<900?'/assets/hero-nikita.mp4':'/assets/hero-nikita-hd.mp4';
const VT=new THREE.VideoTexture(vid); VT.colorSpace=THREE.SRGBColorSpace;
const L=3.6, x0=-L/2, X=s=>x0+L*s/DUR, SW=6.2, SH=SW*274/640, SZ=-3.2, SY=.42+SH/2, TY=.07;
/* la frise : posée devant le bas de l'écran, côté droit, à l'écart du texte */
const TS=.82, tl=new THREE.Group(); tl.scale.setScalar(TS); scene.add(tl); tl.add(sun,sun.target);   // la lumière suit la frise
const YF=SY+SH/2+.6;   // la frise flotte devant l'écran (en iso, rien ne le trahit)
const track=box(L+.3,TY,1.3,C.white); track.position.y=TY/2; tl.add(track);
/* le cinéma : un écran 21:9 courbe, net ; sa lumière se diffuse autour de lui (halo flou de l'image) */
const poster=new THREE.TextureLoader().load('/assets/hero-nikita.jpg'); poster.colorSpace=THREE.SRGBColorSpace;
const CR=7.5, ARC=SW/CR;   // rayon de courbure
const bend=(g,r)=>{ const p=g.attributes.position; for(let i=0;i<p.count;i++){ const x=p.getX(i), a=x/r; p.setX(i,r*Math.sin(a)); p.setZ(i,r*(1-Math.cos(a))); } p.needsUpdate=true; g.computeVertexNormals(); return g; };
const NOI=`float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
  float fbm(vec2 p){float v=0.,a=.5;for(int k=0;k<4;k++){v+=a*n(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}`;
const VS='varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
const scrMat=new THREE.ShaderMaterial({uniforms:{map:{value:poster},bg:{value:new THREE.Color(0xF6F5F4)}},vertexShader:VS,
  fragmentShader:`uniform sampler2D map;uniform vec3 bg;varying vec2 vUv;
    void main(){ vec3 c=texture2D(map,vUv).rgb;
      /* un voile clair, plus fort à gauche, là où passe le titre */
      float w=.1+.38*(1.-smoothstep(.0,.45,vUv.x));
      c=mix(c,bg,w);
      gl_FragColor=vec4(c,1.);
      #include <colorspace_fragment>
    }`});
const scr=new THREE.Mesh(bend(new THREE.PlaneGeometry(SW,SH,64,1),CR),scrMat); scr.position.set(0,SY,SZ); scene.add(scr);
const rim=new THREE.Mesh(bend(new THREE.PlaneGeometry(SW+.05,SH+.05,64,1),CR),new THREE.MeshBasicMaterial({color:0xffffff})); rim.position.set(0,SY,SZ-.012); scene.add(rim);
/* halo : l'image, très floue, déborde et se diffuse dans la page */
const HX=1.45, HY=1.9;
const haloMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{map:{value:poster},t:{value:0}},vertexShader:VS,
  fragmentShader:`uniform sampler2D map;uniform float t;varying vec2 vUv;${NOI}
    void main(){ vec2 vu=(vUv-.5)*vec2(${HX.toFixed(2)},${HY.toFixed(2)})+.5;
      float w=fbm(vUv*vec2(3.,2.)+vec2(t*.05,-t*.04));
      vec2 cu=clamp(vu,.01,.99); float r=.05;
      vec3 c=vec3(0.); for(int i=0;i<12;i++){ float a=float(i)*.5236; c+=texture2D(map,clamp(cu+vec2(cos(a),sin(a)*1.8)*r,.0,1.)).rgb; } c/=12.;
      float d=length(max(abs(vu-.5)-.5,0.)*vec2(1.,.8));
      float a=(1.-smoothstep(.0,.16+.14*w,d))*.75;
      gl_FragColor=vec4(mix(c,vec3(1.),.08),a);
      #include <colorspace_fragment>
    }`});
const halo=new THREE.Mesh(bend(new THREE.PlaneGeometry(SW*HX,SH*HY,64,1),CR*HX),haloMat); halo.position.set(0,SY,SZ-.2); halo.renderOrder=-1; scene.add(halo);
const PX=1, PY=1;
const tcSet=()=>{};
/* les quatre temps */
const blocks=ACTS.map((A,i)=>{ const w=X(A.b)-X(A.a)-.04, m=box(w,A.h,.5,A.c,A.c===C.vio?{emissive:C.vio,emissiveIntensity:.25}:{});
  m.userData={i,x:(X(A.a)+X(A.b))/2,st:X(A.a),h:A.h,base:A.c===C.vio?.25:0}; m.position.set(m.userData.x,0,.1); tl.add(m);
  const l=label(A.n,.12,{color:i===0?VIO:GREY}); l.position.set(X(A.a)+.02,TY+.002,.43); tl.add(l);
  const n=label('0'+(i+1)+' · '+mm(A.a),.075,{color:GREY}); n.position.set(X(A.a)+.02,TY+.002,.56); tl.add(n); return m; });
/* tête de lecture */
const sh=new THREE.Group();
const veil=new THREE.Mesh(new THREE.PlaneGeometry(.72,1),new THREE.MeshBasicMaterial({color:0xB47CFF,transparent:true,opacity:.16,side:THREE.DoubleSide,depthWrite:false}));
veil.rotation.y=Math.PI/2; veil.geometry.translate(0,.5,0); veil.position.z=.1; sh.add(veil);
const edge=box(.024,.024,.74,C.vio,{emissive:C.vio,emissiveIntensity:1.3}); edge.castShadow=false; edge.position.z=.1; sh.add(edge);
const foot=box(.028,.016,1.24,C.vio,{emissive:C.vio,emissiveIntensity:1.3}); foot.castShadow=false; sh.add(foot);
const knob=box(.12,.05,.12,C.vio,{emissive:C.vio,emissiveIntensity:.6}); knob.castShadow=false; knob.position.set(0,.03,.62); sh.add(knob);   // la poignée à attraper
tl.add(sh); const pl=pool(1.3,1.4); tl.add(pl);
const ok=check(.24); tl.add(ok);

/* ---------- la note : ce que fait chaque temps ---------- */
let cur=-1;
const setNote=i=>{ if(i===cur||!note) return; cur=i; const A=ACTS[i]; note.classList.remove('on');
  setTimeout(()=>{ if(cur!==i) return; note.innerHTML=`<p class="mono hx-k">0${i+1} · ${A.n} · ${mm(A.a)}–${mm(A.b)}</p><p class="hx-t">${A.t}</p><ul>${A.l.map(x=>`<li>${x}</li>`).join('')}</ul>`; note.classList.add('on'); },180); };

/* ---------- cadrage : l'illustration part du cadre de l'ancienne vidéo, et peut déborder ---------- */
const EXT=[[-CR*Math.sin(ARC/2),SY+SH/2,SZ+CR*(1-Math.cos(ARC/2))],[CR*Math.sin(ARC/2),SY+SH/2,SZ+CR*(1-Math.cos(ARC/2))],[-CR*Math.sin(ARC/2),SY-SH/2,SZ+CR*(1-Math.cos(ARC/2))],[CR*Math.sin(ARC/2),SY-SH/2,SZ+CR*(1-Math.cos(ARC/2))],[0,SY,SZ]].map(a=>new THREE.Vector3(...a));
const TG=new THREE.Vector3(0,.95,-.1), ISO=new THREE.Vector3(10,10,10), UP=new THREE.Vector3(0,1,0), off=new THREE.Vector3(), V3=new THREE.Vector3();
let mxT=0,myT=0,mx=0,my=0;
addEventListener('pointermove',e=>{ mxT=e.clientX/innerWidth-.5; myT=e.clientY/innerHeight-.5; },{passive:true});

/* ---------- glisser sur la frise pour voyager dans le film ---------- */
const ray2=new THREE.Raycaster(), pv2=new THREE.Vector2(), hit2=new THREE.Vector3(), FLOOR=new THREE.Plane(new THREE.Vector3(0,1,0),-YF);
const ray=new THREE.Raycaster(), pv=new THREE.Vector2(), PL=new THREE.Plane(new THREE.Vector3(0,1,0),-TY*TS), hit=new THREE.Vector3();
let drag=false, dragS=null, hov=false;
const aim=e=>{ const r=cv.getBoundingClientRect(); pv.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1); ray.setFromCamera(pv,cam); };
const onTrack=e=>{ aim(e); if(ray.intersectObjects([track,knob,...blocks],false).length) return true; if(!ray.ray.intersectPlane(PL,hit)) return false; tl.worldToLocal(hit); return Math.abs(hit.x)<L/2+.2&&Math.abs(hit.z)<.75; };
const timeAt=e=>{ aim(e); if(!ray.ray.intersectPlane(PL,hit)) return null; tl.worldToLocal(hit); return clamp((hit.x-x0)/L)*DUR; };
const busy=e=>e.target.closest('a,button,input,label,.facts,.hero-sub,h1,.hero-k');
hero.addEventListener('pointerdown',e=>{ if(busy(e)||!onTrack(e)) return; drag=true; hero.classList.add('hx-drag'); try{ hero.setPointerCapture(e.pointerId); }catch(er){}
  const s=timeAt(e); if(s!==null){ dragS=s; vid.currentTime=s; } vid.pause(); e.preventDefault(); });
hero.addEventListener('pointermove',e=>{ if(drag){ const s=timeAt(e); if(s!==null){ dragS=s; if(!vid.seeking) vid.currentTime=s; } return; }
  hov=!busy(e)&&onTrack(e); hero.style.cursor=hov?'grab':''; },{passive:true});
const end=()=>{ if(!drag) return; drag=false; hero.classList.remove('hx-drag'); if(dragS!==null) vid.currentTime=dragS; dragS=null; if(!RM) vid.play().catch(()=>{}); };
hero.addEventListener('pointerup',end); hero.addEventListener('pointercancel',end);

let vis=true, raf=0, started=false; const FT=new URLSearchParams(location.search).get('t3d');
new IntersectionObserver(es=>{ vis=es[0].isIntersecting; if(vis){ if(!RM&&!drag) vid.play().catch(()=>{}); if(!raf) raf=requestAnimationFrame(frameFn); } else vid.pause(); }).observe(hero);
let onVid=false; const useVid=()=>{ if(!onVid&&vid.readyState>=2){ onVid=true; scrMat.uniforms.map.value=VT; haloMat.uniforms.map.value=VT; } };
vid.addEventListener('playing',useVid); vid.addEventListener('seeked',useVid);
function frameFn(now){
  raf=0; if(!vis) return;
  const r0=hero.getBoundingClientRect(), rc=cv.getBoundingClientRect(), rf=fig.getBoundingClientRect(), dpr=Math.min(1.5,devicePixelRatio||1), mob=r0.width<900;
  const W=Math.round(rc.width), H=Math.round(rc.height); if(cv.width!==Math.round(W*dpr)||cv.height!==Math.round(H*dpr)){ R.setPixelRatio(dpr); R.setSize(W,H,false); }
  /* échelle : l'illustration est plus grande que le cadre, elle déborde vers le haut */
  mx+=(mxT-mx)*.05; my+=(myT-my)*.05;
  off.copy(ISO).applyAxisAngle(UP,mx*.1); off.y+=my*-1; cam.position.copy(TG).add(off); cam.lookAt(TG); cam.updateMatrixWorld();
  /* cadrage : l'écran couvre une grande partie du haut de page et peut en sortir */
  let xl=1e9,xr=-1e9,yt=-1e9,yb=1e9; EXT.forEach(p=>{ V3.copy(p).applyMatrix4(cam.matrixWorldInverse); xl=Math.min(xl,V3.x); xr=Math.max(xr,V3.x); yt=Math.max(yt,V3.y); yb=Math.min(yb,V3.y); });
  /* l'écran entier reste visible, grand, à droite du texte */
  const k=mob?.9*W/(xr-xl):Math.min(.5*W/(xr-xl),.8*r0.height/(yt-yb)), cxp=mob?W*.5:W*.7, cyp=mob?rf.top-rc.top+rf.height*.42:84+.4*r0.height-30;
  const left=(xl+xr)/2-cxp/k, top=(yt+yb)/2+cyp/k;
  Object.assign(cam,{left,right:left+W/k,top,bottom:top-H/k}); cam.updateProjectionMatrix();
  /* la frise se pose sous le texte, au premier plan devant l'écran */
  const TSc=(mob?.62:.26)*W/(L*.72*k); tl.scale.setScalar(TSc); PL.constant=-(YF+TY*TSc);
  pv2.set((mob?.52:.7)*2-1,-((mob?(rf.bottom-rc.top-rf.height*.12)/H:.8))*2+1); ray2.setFromCamera(pv2,cam); if(ray2.ray.intersectPlane(FLOOR,hit2)) tl.position.copy(hit2);
  tl.updateMatrixWorld(true);
  /* état de lecture */
  const s=FT!==null?+FT:dragS!==null?dragS:RM?DUR*.6:(vid.currentTime||0), xs=X(s), ap=eo(seg(now/1000,.2,1.2));
  haloMat.uniforms.t.value=now/1000;
  let ci=0; ACTS.forEach((A,i)=>{ if(s>=A.a) ci=i; });
  blocks.forEach((m,i)=>{ const u=m.userData, kk=back(clamp((xs-u.st)/.25)), sy=nz(kk*ap); m.scale.set(1,sy,1); m.position.y=TY+u.h*sy/2;
    const on=i===ci; m.material.emissive.setHex(on||u.base?C.vio:0); m.material.emissiveIntensity=u.base?u.base:on?.12:0; });
  const vh=blocks[ci].userData.h+.3; sh.position.set(xs,TY,0); veil.scale.y=vh; edge.position.y=vh; pl.position.set(xs,TY+.004,0); pl.material.opacity=drag?.65:.45;
  knob.scale.setScalar(drag?1.25:hov?1.12:1);
  const e=back(seg(s,DUR-11,DUR-10)), b3=blocks[3].userData; ok.scale.setScalar(nz(e)); ok.position.set(b3.x,TY+b3.h+.2+Math.sin(now/500)*.025,.1); ok.visible=e>.01;
  R.render(scene,cam);
  /* note : posée à droite de l'écran (ordinateur), sous la frise (mobile) */
  if(note){ setNote(ci); let nx,ny; const nw=note.offsetWidth, nh=note.offsetHeight;
    nx=rf.left-r0.left; ny=rf.bottom-r0.top-nh-(mob?0:44);
    note.style.transform=`translate3d(${Math.max(0,nx).toFixed(1)}px,${ny.toFixed(1)}px,0)`; }
  if(!started){ started=true; root.classList.add('hero-gl'); root.classList.remove('no-hero-gl'); const rv=document.getElementById('reel'); if(rv) rv.pause(); }
  if(!RM) raf=requestAnimationFrame(frameFn);
}
if(!RM) vid.play().catch(()=>{}); raf=requestAnimationFrame(frameFn);
