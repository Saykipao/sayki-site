// Hero · un vrai film en isométrie ; sous lui ses quatre temps, qui montent au rythme de la lecture.
// On peut faire glisser la tête de lecture ; chaque temps s'explique en deux puces.
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {RectAreaLightUniformsLib} from 'three/addons/lights/RectAreaLightUniformsLib.js';

const root=document.documentElement, hero=document.querySelector('.hero'), cv=hero&&hero.querySelector('.hx-cv'), fig=hero&&hero.querySelector('.hx-f'), note=hero&&hero.querySelector('.hx-note');
if(!cv||!fig) throw new Error('hero');
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const C={ink:0x150A26,vio:0x9E37FF,lav:0xEFE7FC,mid:0xD6C1F8,white:0xffffff};
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x)), seg=(t,a,b)=>clamp((t-a)/(b-a)), nz=x=>Math.max(.001,x);
const eo=t=>1-Math.pow(1-t,3), back=t=>{ const c1=1.25,c3=c1+1; return 1+c3*Math.pow(t-1,3)+c1*Math.pow(t-1,2); };
const GREY='#B8AEC9', VIO='#B266FF';
const mm=s=>Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0');
/* les quatre temps du film (en secondes) et ce qu'ils font */
const DUR=90.6;
const ACTS=[
  {a:0,b:10,d:'10 s',n:'hook',h:.14,c:C.vio,t:'La question qui fait lever la tête.',l:['Quelques secondes, avant qu’on décroche.','Une question que votre client se pose déjà.']},
  {a:10,b:40,d:'30 s',n:'problème',h:.24,c:C.lav,t:'Le quotidien de votre client, tel quel.',l:['Il s’y reconnaît, alors il reste.','On parle de lui avant de parler de vous.']},
  {a:40,b:80,d:'40 s',n:'solution',h:.36,c:C.mid,t:'Votre service entre en scène.',l:['Ce que vous faites, montré, pas récité.','Une étape à la fois, sans jargon.']},
  {a:80,b:DUR,d:'10 s',n:'expertise',h:.5,c:C.white,t:'Pourquoi vous, et pas un autre.',l:['Vos preuves : années, clients, méthode.','Et la suite : on vous appelle.']}];

try{ await document.fonts.load('500 40px "Geist Mono"'); }catch(e){}
let R; try{ R=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true}); }catch(e){ root.classList.add('no-hero-gl'); throw e; }
R.setClearColor(0,0); R.outputColorSpace=THREE.SRGBColorSpace; R.shadowMap.enabled=true; R.shadowMap.type=THREE.PCFSoftShadowMap;

const scene=new THREE.Scene(), cam=new THREE.OrthographicCamera(-1,1,1,-1,.1,100);
RectAreaLightUniformsLib.init();
scene.add(new THREE.HemisphereLight(0xA77BFF,0x1A0D2E,.7));
const sun=new THREE.DirectionalLight(0xffffff,0); sun.position.set(-3.5,10,-1.2); sun.castShadow=false; sun.shadow.mapSize.set(1024,1024);
Object.assign(sun.shadow.camera,{left:-7,right:7,top:7,bottom:-7,near:1,far:40}); sun.shadow.bias=-.0005; sun.shadow.normalBias=.02; sun.shadow.radius=6; sun.shadow.mapSize.set(2048,2048); sun.position.set(-4,12,4); scene.add(sun);
const FA=(()=>{ const c=document.createElement('canvas'); c.width=c.height=256; const g=c.getContext('2d'), r=g.createRadialGradient(128,128,0,128,128,128);
  r.addColorStop(0,'#fff'); r.addColorStop(.45,'#bbb'); r.addColorStop(1,'#000'); g.fillStyle=r; g.fillRect(0,0,256,256); return new THREE.CanvasTexture(c); })();
const floor=new THREE.Mesh(new THREE.PlaneGeometry(16,12),new THREE.MeshStandardMaterial({color:0x2A1846,roughness:.85,transparent:true,alphaMap:FA,depthWrite:false}));
floor.rotation.x=-Math.PI/2; floor.receiveShadow=true; floor.renderOrder=-2; scene.add(floor);


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

/* ---------- profondeur de champ : ce qui sort de la table et de l'écran se floute doucement (passe en deux temps) ---------- */
const HF=R.extensions.has('EXT_color_buffer_float')||R.extensions.has('EXT_color_buffer_half_float');
const rtA=new THREE.WebGLRenderTarget(2,2,{type:HF?THREE.HalfFloatType:THREE.UnsignedByteType,samples:4}), rtB=new THREE.WebGLRenderTarget(2,2,{type:HF?THREE.HalfFloatType:THREE.UnsignedByteType});
const pScene=new THREE.Scene(), pCam=new THREE.OrthographicCamera(-1,1,1,-1,0,1), quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2)); quad.frustumCulled=false; pScene.add(quad);
const blurMat=last=>new THREE.ShaderMaterial({depthTest:false,depthWrite:false,blending:THREE.NoBlending,
  uniforms:{tex:{value:null},dir:{value:new THREE.Vector2()},c:{value:new THREE.Vector2(.5,.5)},r:{value:new THREE.Vector2(.3,.3)},mx:{value:6},aoT:{value:null},aoK:{value:0},blT:{value:null},blK:{value:0}},
  vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
  fragmentShader:`uniform sampler2D tex,aoT,blT;uniform vec2 dir,c,r;uniform float mx,aoK,blK;varying vec2 vUv;
    void main(){ float b=smoothstep(1.,1.75,length((vUv-c)/r))*mx; vec4 acc=vec4(0.); float ws=0.;
      for(int i=-4;i<=4;i++){ float w=exp(-float(i*i)/8.); acc+=texture2D(tex,vUv+dir*float(i)*b*.25)*w; ws+=w; } acc/=ws;
      ${last?'acc.rgb+=texture2D(blT,vUv).rgb*blK; acc.a=max(acc.a,min(1.,dot(texture2D(blT,vUv).rgb,vec3(.33))*blK));':''}
      ${last?'vec3 col=acc.a>.0001?acc.rgb/acc.a:vec3(0.); vec4 o=linearToOutputTexel(vec4(col,1.)); gl_FragColor=vec4(o.rgb*acc.a,acc.a);':'gl_FragColor=acc;'} }`});
const bH=blurMat(false), bV=blurMat(true);
/* bloom : on extrait ce qui brille (l'écran), on le floute large à 1/4 de la taille, on le rajoute à la fin */
const rtQ1=new THREE.WebGLRenderTarget(2,2,{type:HF?THREE.HalfFloatType:THREE.UnsignedByteType}), rtQ2=rtQ1.clone();
const brMat=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,blending:THREE.NoBlending,uniforms:{tex:{value:null},thr:{value:.82}},
  vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
  fragmentShader:`uniform sampler2D tex;uniform float thr;varying vec2 vUv; void main(){ vec4 t=texture2D(tex,vUv); float l=dot(t.rgb,vec3(.2126,.7152,.0722)); gl_FragColor=vec4(t.rgb*smoothstep(thr,thr+.45,l),1.); }`});
const gbMat=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,blending:THREE.NoBlending,uniforms:{tex:{value:null},dir:{value:new THREE.Vector2()}},
  vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
  fragmentShader:`uniform sampler2D tex;uniform vec2 dir;varying vec2 vUv; void main(){ vec3 a=vec3(0.); float ws=0.; for(int i=-7;i<=7;i++){ float w=exp(-float(i*i)/24.); a+=texture2D(tex,vUv+dir*float(i)*1.6).rgb*w; ws+=w; } gl_FragColor=vec4(a/ws,1.); }`});
let gtao=null, fx=true, slowN=0, lastT=0;

/* ---------- la scène ---------- */
const vid=document.createElement('video'); Object.assign(vid,{muted:true,loop:true,playsInline:true,preload:'auto'}); vid.setAttribute('muted',''); vid.setAttribute('playsinline',''); vid.setAttribute('aria-hidden','true');
Object.assign(vid.style,{position:'fixed',left:'0',bottom:'0',width:'4px',height:'2px',opacity:'.01',pointerEvents:'none',zIndex:'-1'}); document.body.appendChild(vid); vid.src=innerWidth<900?'/assets/hero-nikita.mp4':'/assets/hero-nikita-hd.mp4';
const VC=document.createElement('canvas'); VC.width=innerWidth<900?640:1280; VC.height=Math.round(VC.width*274/640); const VX=VC.getContext('2d'); const VT=new THREE.CanvasTexture(VC); VT.colorSpace=THREE.SRGBColorSpace; VT.generateMipmaps=false; VT.minFilter=THREE.LinearFilter; let vLast=-1, vOn=false;
const L=3.6, x0=-L/2, X=s=>x0+L*s/DUR, SW=6.2, SH=SW*274/640, SZ=-3.2, SY=1.05+SH/2, TY=.07;
/* la frise : posée devant le bas de l'écran, côté droit, à l'écart du texte */
const TS=.82, tl=new THREE.Group(); tl.scale.setScalar(TS); scene.add(tl);
const YF=SY+SH/2+.6;   // la frise flotte devant l'écran (en iso, rien ne le trahit)
const track=box(L+.3,TY,1.3,C.white); track.position.y=TY/2; track.material.visible=false; track.castShadow=track.receiveShadow=false; tl.add(track);   // invisible : sert seulement à attraper la frise
/* le cinéma : un écran 21:9 courbe, net ; sa lumière se diffuse autour de lui (halo flou de l'image) */
const poster=new THREE.TextureLoader().load('/assets/hero-nikita.jpg'); poster.colorSpace=THREE.SRGBColorSpace;
const CR=7.5, ARC=SW/CR;   // rayon de courbure
const bend=(g,r)=>{ const p=g.attributes.position; for(let i=0;i<p.count;i++){ const x=p.getX(i), a=x/r; p.setX(i,r*Math.sin(a)); p.setZ(i,r*(1-Math.cos(a))); } p.needsUpdate=true; g.computeVertexNormals(); return g; };
const NOI=`float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
  float fbm(vec2 p){float v=0.,a=.5;for(int k=0;k<4;k++){v+=a*n(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}`;
const VS='varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
const scrMat=new THREE.ShaderMaterial({uniforms:{map:{value:poster},bg:{value:new THREE.Color(0x0B0810)}},vertexShader:VS,
  fragmentShader:`uniform sampler2D map;uniform vec3 bg;varying vec2 vUv;
    void main(){ vec3 c=texture2D(map,vUv).rgb;
      /* un voile clair, plus fort à gauche, là où passe le titre */
      float w=.45*(1.-smoothstep(.0,.25,vUv.x));
      c=mix(c,bg,w);
      gl_FragColor=vec4(c,1.);
      #include <colorspace_fragment>
    }`});
const scr=new THREE.Mesh(bend(new THREE.PlaneGeometry(SW,SH,64,1),CR),scrMat); scr.position.set(0,SY,SZ); scene.add(scr);

/* halo : l'image, très floue, déborde et se diffuse dans la page */
const HX=1.3, HY=1.65;
const haloMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{map:{value:poster},t:{value:0}},vertexShader:VS,
  fragmentShader:`uniform sampler2D map;uniform float t;varying vec2 vUv;${NOI}
    void main(){ vec2 vu=(vUv-.5)*vec2(${HX.toFixed(2)},${HY.toFixed(2)})+.5;
      float w=fbm(vUv*vec2(3.,2.)+vec2(t*.05,-t*.04));
      vec2 cu=clamp(vu,.01,.99); float r=.05;
      vec3 c=vec3(0.); for(int i=0;i<12;i++){ float a=float(i)*.5236; c+=texture2D(map,clamp(cu+vec2(cos(a),sin(a)*1.8)*r,.0,1.)).rgb; } c/=12.;
      float d=length(max(abs(vu-.5)-.5,0.)*vec2(1.,.8));
      float a=(1.-smoothstep(.0,.1+.08*w,d))*.55;
      float l=dot(c,vec3(.299,.587,.114)); c=mix(vec3(l),c,1.3);
      gl_FragColor=vec4(c*.75,a);
      #include <colorspace_fragment>
    }`});
const halo=new THREE.Mesh(bend(new THREE.PlaneGeometry(SW*HX,SH*HY,64,1),CR*HX),haloMat); halo.position.set(0,SY,SZ-.2); halo.renderOrder=-1; scene.add(halo);
const PX=1, PY=1;
const tcSet=()=>{};
/* les quatre temps */
const blocks=ACTS.map((A,i)=>{ const w=X(A.b)-X(A.a)-.04, m=box(w,A.h,.5,A.c,A.c===C.vio?{emissive:C.vio,emissiveIntensity:.25}:{});
  m.userData={i,x:(X(A.a)+X(A.b))/2,st:X(A.a),h:A.h,base:A.c===C.vio?.25:0}; m.position.set(m.userData.x,0,.1); tl.add(m);
  const l=label(A.n,.12,{color:i===0?VIO:GREY}); l.position.set(X(A.a)+.02,TY+.002,.43); tl.add(l);
  const n=label(A.d,.085,{color:i===0?VIO:GREY}); n.position.set(X(A.a)+.02,TY+.002,.56); tl.add(n); return m; });
/* tête de lecture */
const sh=new THREE.Group();
const veil=new THREE.Mesh(new THREE.PlaneGeometry(.72,1),new THREE.MeshBasicMaterial({color:0xB47CFF,transparent:true,opacity:.16,side:THREE.DoubleSide,depthWrite:false}));
veil.rotation.y=Math.PI/2; veil.geometry.translate(0,.5,0); veil.position.z=.1; sh.add(veil);
const edge=box(.024,.024,.74,C.vio,{emissive:C.vio,emissiveIntensity:1.3}); edge.castShadow=false; edge.position.z=.1; sh.add(edge);
const foot=box(.028,.016,1.24,C.vio,{emissive:C.vio,emissiveIntensity:1.3}); foot.castShadow=false; sh.add(foot);
const knob=box(.12,.05,.12,C.vio,{emissive:C.vio,emissiveIntensity:.6}); knob.castShadow=false; knob.position.set(0,.03,.62); sh.add(knob);   // la poignée à attraper
tl.add(sh); const pl=pool(1.3,1.4); tl.add(pl);
const ok=check(.24); tl.add(ok);

/* ---------- la salle de réunion : une table, des chaises, un café ; même matière que le reste ---------- */
const TSc=SW*.78/L, TZ=2.1, TH=.74, RW=L*TSc+.7, RD=1.3*TSc+.5;
const room=new THREE.Group(); room.position.set(0,0,SZ+TZ); scene.add(room);
const CLAY=0x3A2858, CLAY2=0x2E1F48;
const top=box(RW,.07,RD,0xffffff); top.position.y=TH-.035; room.add(top);
[[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a,b])=>{ const l=box(.07,TH-.07,.07,CLAY2); l.position.set(a*(RW/2-.3),(TH-.07)/2,b*(RD/2-.25)); room.add(l); });
function chair(){ const g=new THREE.Group(); const seat=box(.5,.07,.48,CLAY); seat.position.y=.46; g.add(seat);
  const back=box(.5,.46,.06,CLAY); back.position.set(0,.74,-.22); back.rotation.x=-.08; g.add(back);
  const leg=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,.42,12),new THREE.MeshStandardMaterial({color:CLAY2,roughness:.5})); leg.position.y=.22; leg.castShadow=true; g.add(leg);
  const foot=new THREE.Mesh(new THREE.CylinderGeometry(.22,.24,.03,24),new THREE.MeshStandardMaterial({color:CLAY2,roughness:.5})); foot.position.y=.015; foot.castShadow=foot.receiveShadow=true; g.add(foot); return g; }
[-1.9,0,1.9].forEach(x=>{ const c=chair(); c.position.set(x*TSc*.62,0,-RD/2-.32); room.add(c); });          // côté écran, face à la table
[-1,1].forEach(a=>{ const c=chair(); c.position.set(a*(RW/2+.42),0,0); c.rotation.y=-a*Math.PI/2; room.add(c); }); // les deux bouts
/* un café et un carnet, aux coins de la table */
const mug=new THREE.Group(); const mb=new THREE.Mesh(new THREE.CylinderGeometry(.07,.065,.15,20),new THREE.MeshStandardMaterial({color:0xffffff,roughness:.35})); mb.position.y=.075; mb.castShadow=true; mug.add(mb);
const mh=new THREE.Mesh(new THREE.TorusGeometry(.04,.012,8,16,Math.PI),new THREE.MeshStandardMaterial({color:0xffffff,roughness:.35})); mh.position.set(.075,.08,0); mh.rotation.z=-Math.PI/2; mug.add(mh);
const cof=new THREE.Mesh(new THREE.CircleGeometry(.06,20),new THREE.MeshBasicMaterial({color:0x6B4A3A})); cof.rotation.x=-Math.PI/2; cof.position.y=.14; mug.add(cof);
mug.position.set(-RW/2+.32,TH,RD/2-.22); room.add(mug);
const nb=box(.42,.025,.3,0xffffff); nb.position.set(RW/2-.42,TH+.012,RD/2-.24); nb.rotation.y=.18; room.add(nb);
const pen=box(.26,.014,.014,C.vio,{emissive:C.vio,emissiveIntensity:.3}); pen.position.set(RW/2-.4,TH+.032,RD/2-.2); pen.rotation.y=.5; room.add(pen);
/* une plante, côté gauche */
const plant=new THREE.Group(); const pot=new THREE.Mesh(new THREE.CylinderGeometry(.2,.16,.42,24),new THREE.MeshStandardMaterial({color:CLAY,roughness:.6})); pot.position.y=.21; pot.castShadow=true; plant.add(pot);
[[0,.62,0,.2],[.1,.82,.05,.15],[-.09,.74,-.04,.16],[.03,.95,-.05,.12]].forEach(([x,y,z,r])=>{ const f=new THREE.Mesh(new THREE.IcosahedronGeometry(r,1),new THREE.MeshStandardMaterial({color:0xD9CCF2,roughness:.7,flatShading:true})); f.position.set(x,y,z); f.castShadow=true; plant.add(f); });
plant.position.set(RW/2+1.05,0,-RD/2-.7); room.add(plant);
/* le sol de la salle : une tache claire, très douce */
const rug=new THREE.Object3D();
room.traverse(o=>{ if(o.isMesh&&o!==rug){ o.castShadow=true; o.receiveShadow=true; } });
const tvA=new THREE.RectAreaLight(0xffffff,2.2,SW*.95,SH*.95); tvA.position.set(0,SY,SZ+.25); tvA.lookAt(0,SY,SZ+5); scene.add(tvA);
const tvS=new THREE.SpotLight(0xffffff,17,26,1.25,.75,1.3); tvS.position.set(0,SY+.2,SZ+.35); tvS.target.position.set(0,0,SZ+TZ+.5); tvS.castShadow=true; floor.position.set(0,0,SZ+TZ+.6);
tvS.shadow.mapSize.set(2048,2048); tvS.shadow.bias=-.002; tvS.shadow.normalBias=.04; tvS.shadow.radius=6; scene.add(tvS,tvS.target);
const AV=document.createElement('canvas'); AV.width=8; AV.height=4; const AX=AV.getContext('2d',{willReadFrequently:true}); const tvC=new THREE.Color(0xB8A8E0), tvT=new THREE.Color(); let avN=0;
const tvLight=()=>{ if(!vOn||(avN++%6)) return; try{ AX.drawImage(VC,0,0,8,4); const d=AX.getImageData(0,0,8,4).data; let r=0,g=0,b=0; for(let i=0;i<d.length;i+=4){ r+=d[i]; g+=d[i+1]; b+=d[i+2]; } const n=d.length/4;
  tvT.setRGB(r/n/255,g/n/255,b/n/255,THREE.SRGBColorSpace); tvT.lerp(new THREE.Color(1,1,1),.35); }catch(e){} };
/* reflet : la table est laquée, l'écran s'y reflète, flou et qui s'efface vers nous */
const SPILL=[];
const reflMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{map:{value:poster},sx:{value:RW/SW}},vertexShader:VS,
  fragmentShader:`uniform sampler2D map;uniform float sx;varying vec2 vUv;
    void main(){ float d=1.-vUv.y; vec2 u=vec2(.5+(vUv.x-.5)*sx,clamp(d*.85,.0,1.)); float r=.004+d*.035;
      vec3 c=vec3(0.); for(int i=0;i<10;i++){ float a=float(i)*.628; c+=texture2D(map,clamp(u+vec2(cos(a),sin(a))*r,.0,1.)).rgb; } c/=10.;
      float a=.26*pow(1.-d,1.3)*(1.-pow(abs(vUv.x-.5)*2.,4.));
      gl_FragColor=vec4(c,a);
      #include <colorspace_fragment>
    }`}); SPILL.push(reflMat);
const refl=new THREE.Mesh(new THREE.PlaneGeometry(RW-.06,RD-.06),reflMat); refl.rotation.x=-Math.PI/2; refl.position.y=TH+.003; refl.renderOrder=2; room.add(refl);
top.material.roughness=.45; top.material.metalness=0; top.material.color.set(0x3B2A5A);

/* ---------- la note : ce que fait chaque temps ---------- */
let cur=-1;
const setNote=i=>{ if(i===cur||!note) return; cur=i; const A=ACTS[i]; note.classList.remove('on');
  setTimeout(()=>{ if(cur!==i) return; note.innerHTML=`<p class="mono hx-k">0${i+1} · ${A.n} · ${mm(A.a)}–${mm(A.b)}</p><p class="hx-t">${A.t}</p><ul>${A.l.map(x=>`<li>${x}</li>`).join('')}</ul>`; note.classList.add('on'); },180); };

/* ---------- cadrage : l'illustration part du cadre de l'ancienne vidéo, et peut déborder ---------- */
const RV=new THREE.Vector3();
const EXT=[[-CR*Math.sin(ARC/2),SY+SH/2,SZ+CR*(1-Math.cos(ARC/2))],[CR*Math.sin(ARC/2),SY+SH/2,SZ+CR*(1-Math.cos(ARC/2))],[-CR*Math.sin(ARC/2),SY-SH/2,SZ+CR*(1-Math.cos(ARC/2))],[CR*Math.sin(ARC/2),SY-SH/2,SZ+CR*(1-Math.cos(ARC/2))],[0,SY,SZ],[-RW/2-.9,0,SZ+TZ+RD/2+.2],[RW/2+.9,0,SZ+TZ+RD/2+.2]].map(a=>new THREE.Vector3(...a));
const TG=new THREE.Vector3(0,.95,-.1), ISO=new THREE.Vector3(5.5,7.5,12), UP=new THREE.Vector3(0,1,0), off=new THREE.Vector3(), V3=new THREE.Vector3();
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
/* chaque image du film est copiée dans un canvas : marche en lecture, en pause et pendant le glisser */
const grab=()=>{ if(vid.readyState<2||vid.seeking) return; const t=vid.currentTime; if(t===vLast&&vOn) return; vLast=t;
  try{ VX.drawImage(vid,0,0,VC.width,VC.height); VT.needsUpdate=true; if(!vOn){ vOn=true; SPILL.forEach(m=>m.uniforms.map.value=VT); scrMat.uniforms.map.value=VT; haloMat.uniforms.map.value=VT; } }catch(e){} };
if('requestVideoFrameCallback' in vid){ const vf=()=>{ vLast=-1; grab(); vid.requestVideoFrameCallback(vf); }; vid.requestVideoFrameCallback(vf); }
vid.addEventListener('seeked',()=>{ if(dragS!==null&&Math.abs(vid.currentTime-dragS)>.08) vid.currentTime=dragS; vLast=-1; grab(); });
function frameFn(now){
  raf=0; if(!vis) return;
  const r0=hero.getBoundingClientRect(), rc=cv.getBoundingClientRect(), rf=fig.getBoundingClientRect(), mob=r0.width<900, dpr=Math.min(mob?1.5:1.75,devicePixelRatio||1);
  const W=Math.round(rc.width), H=Math.round(rc.height); if(cv.width!==Math.round(W*dpr)||cv.height!==Math.round(H*dpr)){ R.setPixelRatio(dpr); R.setSize(W,H,false); rtA.setSize(cv.width,cv.height); rtB.setSize(cv.width,cv.height); rtQ1.setSize(cv.width>>2,cv.height>>2); rtQ2.setSize(cv.width>>2,cv.height>>2); }
  /* échelle : l'illustration est plus grande que le cadre, elle déborde vers le haut */
  mx+=(mxT-mx)*.05; my+=(myT-my)*.05;
  off.copy(ISO).applyAxisAngle(UP,mx*.1); off.y+=my*-1; cam.position.copy(TG).add(off); cam.lookAt(TG); cam.updateMatrixWorld();
  /* scène : la frise posée au sol, pile devant le centre de l'écran (même axe x) ; la caméra cadre l'ensemble */
  tl.scale.set(TSc,TSc*.62,TSc); tl.position.set(0,TH-TY*TSc*.62+.004,SZ+TZ); PL.constant=-TH; tl.updateMatrixWorld(true);
  let xl=1e9,xr=-1e9,yt=-1e9,yb=1e9; EXT.forEach(p=>{ V3.copy(p).applyMatrix4(cam.matrixWorldInverse); xl=Math.min(xl,V3.x); xr=Math.max(xr,V3.x); yt=Math.max(yt,V3.y); yb=Math.min(yb,V3.y); });
  const k=mob?1.05*W/(xr-xl):Math.min(.68*W/(xr-xl),.98*(r0.height-60)/(yt-yb));
  const cxp=mob?W*.55:W*.7, by=mob?rf.bottom-rc.top-6:r0.height-30;
  const left=(xl+xr)/2-cxp/k, top=yb+by/k;
  Object.assign(cam,{left,right:left+W/k,top,bottom:top-H/k}); cam.updateProjectionMatrix();
  /* état de lecture */
  const s=FT!==null?+FT:dragS!==null?dragS:RM?DUR*.6:(vid.currentTime||0), xs=X(s), ap=eo(seg(now/1000,.2,1.2));
  haloMat.uniforms.t.value=now/1000; grab(); tvLight(); tvC.lerp(tvT.r+tvT.g+tvT.b>0?tvT:tvC,.06); tvA.color.copy(tvC); tvS.color.copy(tvC);
  let ci=0; ACTS.forEach((A,i)=>{ if(s>=A.a) ci=i; });
  blocks.forEach((m,i)=>{ const u=m.userData, kk=back(clamp((xs-u.st)/.25)), sy=nz(kk*ap); m.scale.set(1,sy,1); m.position.y=TY+u.h*sy/2;
    const on=i===ci; m.material.emissive.setHex(on||u.base?C.vio:0); m.material.emissiveIntensity=u.base?u.base:on?.12:0; });
  const vh=blocks[ci].userData.h+.3; sh.position.set(xs,TY,0); veil.scale.y=vh; edge.position.y=vh; pl.position.set(xs,TY+.004,0); pl.material.opacity=drag?.65:.45;
  knob.scale.setScalar(drag?1.25:hov?1.12:1);
  const e=back(seg(s,DUR-11,DUR-10)), b3=blocks[3].userData; ok.scale.setScalar(nz(e)); ok.position.set(b3.x,TY+b3.h+.2+Math.sin(now/500)*.025,.1); ok.visible=e>.01;
  if(mob){ R.render(scene,cam); }
  else{
    /* zone nette : de la table au haut de l'écran ; au-delà, le flou monte doucement */
    const pj=(x,y,z)=>{ V3.set(x,y,z).project(cam); return [(V3.x+1)/2,(V3.y+1)/2]; };
    const cA=pj(0,(TH+SY)/2,SZ+TZ*.45), eX=pj(RW*.5,TH,SZ+TZ), eY=pj(0,SY+SH*.5,SZ);
    [bH,bV].forEach(m=>{ m.uniforms.c.value.set(cA[0],cA[1]); m.uniforms.r.value.set(Math.abs(eX[0]-cA[0])+.02,Math.abs(eY[1]-cA[1])); m.uniforms.mx.value=5.5*dpr; });
    if(lastT){ const dt=now-lastT; slowN=dt>30?slowN+1:Math.max(0,slowN-1); if(slowN>45&&fx){ fx=false; } } lastT=now;
    R.setRenderTarget(rtA); R.clear(); R.render(scene,cam);
    let aoK=0;

    bH.uniforms.aoK.value=0;
    let blK=0; if(fx){ quad.material=brMat; brMat.uniforms.tex.value=rtA.texture; R.setRenderTarget(rtQ1); R.render(pScene,pCam);
      quad.material=gbMat; gbMat.uniforms.tex.value=rtQ1.texture; gbMat.uniforms.dir.value.set(1/rtQ1.width,0); R.setRenderTarget(rtQ2); R.render(pScene,pCam);
      gbMat.uniforms.tex.value=rtQ2.texture; gbMat.uniforms.dir.value.set(0,1/rtQ1.height); R.setRenderTarget(rtQ1); R.render(pScene,pCam); blK=.5; }
    bV.uniforms.blT.value=rtQ1.texture; bV.uniforms.blK.value=blK;
    quad.material=bH; bH.uniforms.tex.value=rtA.texture; bH.uniforms.dir.value.set(1/cv.width,0); R.setRenderTarget(rtB); R.clear(); R.render(pScene,pCam);
    quad.material=bV; bV.uniforms.tex.value=rtB.texture; bV.uniforms.dir.value.set(0,1/cv.height); R.setRenderTarget(null); R.clear(); R.render(pScene,pCam);
  }
  /* note : posée à droite de l'écran (ordinateur), sous la frise (mobile) */
  if(note){ setNote(ci); let nx,ny; const nw=note.offsetWidth, nh=note.offsetHeight;
    nx=rf.left-r0.left; ny=rf.bottom-r0.top-nh-(mob?0:44);
    note.style.transform=`translate3d(${Math.max(0,nx).toFixed(1)}px,${ny.toFixed(1)}px,0)`; }
  if(!started){ started=true; root.classList.add('hero-gl'); root.classList.remove('no-hero-gl'); const rv=document.getElementById('reel'); if(rv) rv.pause(); }
  if(!RM) raf=requestAnimationFrame(frameFn);
}
if(!RM) vid.play().catch(()=>{}); raf=requestAnimationFrame(frameFn);
