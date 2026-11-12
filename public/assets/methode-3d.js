// Méthode · six scènes isométriques en WebGL (Three.js), un seul moteur partagé.
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

const C={ink:0x150A26,vio:0x9E37FF,pink:0xDE50D2,lav:0xEFE7FC,mid:0xD6C1F8,soft:0xF4F0FA,white:0xffffff};
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const seg=(t,a,b)=>clamp((t-a)/(b-a));
const io3=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
const eo=t=>1-Math.pow(1-t,3);
const back=t=>{ const c1=1.25,c3=c1+1; return 1+c3*Math.pow(t-1,3)+c1*Math.pow(t-1,2); };
const nz=x=>Math.max(.001,x);
const ISO=new THREE.Vector3(10,10,10);
const GREY='#7C7489', VIO='#8A2BE8';

try{ await Promise.all([document.fonts.load('500 40px "Geist Mono"'),document.fonts.load('400 40px "Nohemi"')]); }catch(e){}

let R;
try{ R=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'}); }
catch(e){ document.documentElement.classList.add('no-gl'); throw e; }
R.setPixelRatio(1); R.setClearColor(0x000000,0); R.outputColorSpace=THREE.SRGBColorSpace;
R.shadowMap.enabled=true; R.shadowMap.type=THREE.PCFSoftShadowMap;

const TL=new THREE.TextureLoader();
const tex=src=>{ const t=TL.load(src); t.colorSpace=THREE.SRGBColorSpace; t.anisotropy=8; return t; };

/* ---------- briques ---------- */
function base(view,target){
  const scene=new THREE.Scene(), cam=new THREE.OrthographicCamera(-1,1,1,-1,.1,100);
  scene.add(new THREE.HemisphereLight(0xffffff,0xDCCDF6,2.05));
  const d=new THREE.DirectionalLight(0xffffff,1.65); d.position.set(-3.5,10,-1.2); d.castShadow=true;
  d.shadow.mapSize.set(1024,1024); Object.assign(d.shadow.camera,{left:-6,right:6,top:6,bottom:-6,near:1,far:30}); d.shadow.bias=-.0004; d.shadow.normalBias=.02; d.shadow.radius=4;
  scene.add(d);
  const fl=new THREE.Mesh(new THREE.PlaneGeometry(40,40),new THREE.ShadowMaterial({opacity:.12,color:0x3A1670}));
  fl.rotation.x=-Math.PI/2; fl.receiveShadow=true; scene.add(fl);
  return {scene,cam,view,target:target||new THREE.Vector3(),labs:[]};
}
function box(w,h,d,color,o={}){
  const m=new THREE.Mesh(new RoundedBoxGeometry(w,h,d,4,Math.min(.04,h/2.4,w/2.4,d/2.4)),new THREE.MeshStandardMaterial({color,roughness:.5,metalness:0,...o}));
  m.castShadow=true; m.receiveShadow=true; return m;
}
function textTex(txt,{size=96,color='#150A26',font='"Geist Mono", ui-monospace, monospace',weight=500,upper=true,pad=12}={}){
  const c=document.createElement('canvas'), g=c.getContext('2d'), t=upper?txt.toUpperCase():txt, f=`${weight} ${size}px ${font}`;
  const ls=upper?Math.round(size*.06)+'px':'0px'; g.font=f; g.letterSpacing=ls; const w=Math.ceil(g.measureText(t).width)+pad*2, h=Math.ceil(size*1.3);
  c.width=w; c.height=h; g.font=f; g.letterSpacing=ls; g.fillStyle=color; g.textBaseline='middle'; g.fillText(t,pad,h/2+size*.04);
  const tx=new THREE.CanvasTexture(c); tx.colorSpace=THREE.SRGBColorSpace; tx.anisotropy=8; return {tx,asp:w/h};
}
/* étiquette posée à plat, ancrée à gauche (o.c = centrée) */
function label(B,txt,h,o={}){
  const {tx,asp}=textTex(txt,o), w=h*asp, g=new THREE.PlaneGeometry(w,h); if(!o.c) g.translate(w/2,0,0);
  const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({map:tx,transparent:true,depthWrite:false}));
  m.rotation.x=-Math.PI/2; m.userData.w=w; m.renderOrder=3; if(B&&!o.fix) B.labs.push(m); return m;
}
/* flaque de lumière posée au sol */
const PT=(()=>{ const c=document.createElement('canvas'); c.width=c.height=256; const g=c.getContext('2d'), r=g.createRadialGradient(128,128,0,128,128,128);
  r.addColorStop(0,'rgba(255,255,255,1)'); r.addColorStop(.4,'rgba(255,255,255,.42)'); r.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=r; g.fillRect(0,0,256,256);
  return new THREE.CanvasTexture(c); })();
function pool(color,sx,sz=sx){ const m=new THREE.Mesh(new THREE.PlaneGeometry(sx,sz),new THREE.MeshBasicMaterial({map:PT,color,transparent:true,opacity:0,depthWrite:false}));
  m.rotation.x=-Math.PI/2; m.position.y=.003; m.renderOrder=1; return m; }
function checkTex(){ const c=document.createElement('canvas'); c.width=c.height=128; const g=c.getContext('2d');
  g.fillStyle='#9E37FF'; g.fillRect(0,0,128,128); g.strokeStyle='#fff'; g.lineWidth=12; g.lineCap='round'; g.lineJoin='round';
  g.beginPath(); g.moveTo(36,66); g.lineTo(56,86); g.lineTo(94,44); g.stroke(); const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; t.anisotropy=8; return t; }
const CHK=checkTex();
function check(s=.34){ const g=new THREE.Group(); const b=box(s,s*.42,s,C.vio,{emissive:C.vio,emissiveIntensity:.3,roughness:.35}); g.add(b);
  const top=new THREE.Mesh(new THREE.PlaneGeometry(s*.84,s*.84),new THREE.MeshBasicMaterial({map:CHK})); top.rotation.x=-Math.PI/2; top.position.y=s*.21+.002; g.add(top); return g; }
/* image : désaturation (sat) ; avec gate, « photo brute » avant la porte (x monde), image de référence après */
function imgMat(map){
  return new THREE.ShaderMaterial({uniforms:{map:{value:map},sat:{value:1},gate:{value:-99},t:{value:0},fade:{value:1}},transparent:true,
    vertexShader:'varying vec2 vUv;varying vec3 vW;void main(){vUv=uv;vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
    fragmentShader:`uniform sampler2D map;uniform float sat;uniform float gate;uniform float t;uniform float fade;varying vec2 vUv;varying vec3 vW;
      float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
      void main(){ vec3 c=texture2D(map,vUv).rgb; float l=dot(c,vec3(.299,.587,.114));
        vec3 g=mix(vec3(l),c,sat);
        if(gate>-90.){ vec2 o=vec2(.006,0.); vec3 b=(texture2D(map,vUv+o).rgb+texture2D(map,vUv-o).rgb+texture2D(map,vUv+o.yx).rgb+texture2D(map,vUv-o.yx).rgb)*.25;
          float bl=dot(b,vec3(.299,.587,.114)); vec3 ph=mix(vec3(bl),b,.12)*vec3(.95,.97,1.02)*.92+.05+(h(floor(vUv*420.)+floor(t*12.))-.5)*.07;
          float k=smoothstep(gate-.02,gate+.02,vW.x); g=mix(ph,c*1.04,k);
          float e=1.-smoothstep(0.,.06,abs(vW.x-gate)); g=mix(g,vec3(.78,.45,1.),e*.85); }
        gl_FragColor=vec4(g,fade);
        #include <colorspace_fragment>
      }`});
}
function screen(map,w,h){ return new THREE.Mesh(new THREE.PlaneGeometry(w,h),imgMat(map)); }
/* pastille de version, retexturée à la volée */
function chip(){
  const c=document.createElement('canvas'); c.width=176; c.height=96; const g=c.getContext('2d'), tx=new THREE.CanvasTexture(c); tx.colorSpace=THREE.SRGBColorSpace; tx.anisotropy=8;
  let cur=''; const set=(s,on)=>{ const k=s+on; if(k===cur) return; cur=k; g.clearRect(0,0,176,96); g.fillStyle=on?'#9E37FF':'#150A26'; g.fillRect(0,0,176,96);
    g.fillStyle='#fff'; g.font='500 54px "Geist Mono", ui-monospace, monospace'; g.textAlign='center'; g.textBaseline='middle'; g.fillText(s,88,52); tx.needsUpdate=true; };
  set('V1',false); return {tx,set};
}

/* ---------- 1 · le call : trois sujets qui s'empilent en un seul angle ---------- */
function s1(){
  const B=base(2.55,new THREE.Vector3(0,.35,0)); B.dur=8.4;
  const names=['votre offre','vos clients','ce qui coince'], cols=[C.white,C.lav,C.mid];
  const W=2.05,D=1.02, step=1.04;
  const slabs=names.map((n,i)=>{ const m=box(W,.2,D,cols[i]); const l=label(B,n,.19); l.position.set(-W/2+.15,.102,D/2-.2); m.add(l); B.scene.add(m); return m; });
  const out=box(W,.46,D,C.vio,{emissive:C.vio,emissiveIntensity:.18,roughness:.3});
  const ol=label(B,'le bon angle',.21,{color:'#ffffff'}); ol.position.set(-W/2+.15,.232,D/2-.22); out.add(ol); B.scene.add(out);
  const pl=pool(0xA45BFF,4.6,3.4); B.scene.add(pl);
  B.update=t=>{
    const fo=1-seg(t,7.7,8.25);
    slabs.forEach((m,i)=>{ const a=eo(seg(t,.15*i,.95+.15*i)), mv=io3(seg(t,1.6+.45*i,2.7+.45*i)), mg=seg(t,4.3,4.7), o=(i-1)*step;
      m.position.set(o*(1-mv),.12+(i*.215)*mv+(1-a)*-.5+Math.sin(t*1.4+i*1.6)*.04*(1-mv),-o*(1-mv));
      m.scale.setScalar(nz(a*(1-mg)*fo)); });
    const o=back(seg(t,4.45,5.25))*fo; out.position.set(0,.23+.04*Math.sin(t*1.3)*clamp(o),0); out.scale.setScalar(nz(o));
    pl.material.opacity=.42*clamp(o)*(.9+.1*Math.sin(t*2.2));
  };
  return B;
}

/* ---------- 2 · le concept : quatre temps qui montent, jusqu'au « compris » ---------- */
function s2(){
  const B=base(1.95,new THREE.Vector3(.15,.33,0)); B.dur=9;
  const L=5.1, x0=-L/2;
  const track=box(L+.36,.07,1.3,C.white); track.position.set(0,.035,0); B.scene.add(track);
  const segs=[[0,5,.32,C.vio,''],[5,30,.55,C.lav,'problème'],[30,75,.95,C.mid,'solution'],[75,90,1.35,C.white,'expertise']];
  const blocks=segs.map(([a,b,h,c,n])=>{ const w=L*(b-a)/90-.05, m=box(w,h,.6,c,c===C.vio?{emissive:C.vio,emissiveIntensity:.25}:{});
    m.userData={x:x0+L*(a+b)/180,h,st:x0+L*a/90}; m.position.set(m.userData.x,0,-.2); B.scene.add(m);
    if(n){ const l=label(B,n,.17,{color:GREY}); l.position.set(m.userData.st+.03,.072,.39); B.scene.add(l); }
    return m; });
  /* tête de lecture : un voile de lumière qui balaie la piste */
  const sh=new THREE.Group();
  const veil=new THREE.Mesh(new THREE.PlaneGeometry(1.1,1),new THREE.MeshBasicMaterial({color:0xB47CFF,transparent:true,opacity:.16,side:THREE.DoubleSide,depthWrite:false}));
  veil.rotation.y=Math.PI/2; veil.geometry.translate(0,.5,0); sh.add(veil);
  const edge=box(.03,.03,1.12,C.vio,{emissive:C.vio,emissiveIntensity:1.3}); edge.castShadow=false; sh.add(edge);
  const foot=box(.035,.02,1.24,C.vio,{emissive:C.vio,emissiveIntensity:1.3}); foot.castShadow=false; foot.position.y=.08; sh.add(foot);
  B.scene.add(sh); const pl=pool(0xA45BFF,1.6,1.9); B.scene.add(pl);
  const ok=check(.34); B.scene.add(ok);
  B.update=t=>{
    const fo=1-seg(t,8.3,8.85), on=seg(t,.3,.7)*(1-seg(t,6,6.4)), p=io3(seg(t,.7,5.8)), x=x0+L*p;
    let hh=.3; blocks.forEach((m,i)=>{ const k=back(clamp((x-m.userData.st)/.4))*fo, sy=nz(k);
      m.scale.set(1,sy,1); m.position.y=.07+m.userData.h*sy/2; if(x>=m.userData.st) hh=m.userData.h; });
    const vh=(hh+.42)*on; sh.position.set(x,.07,-.05); sh.visible=on>.01; veil.scale.y=nz(vh); edge.position.y=vh; veil.material.opacity=.16*on;
    pl.position.set(x,.075,-.05); pl.material.opacity=.5*on;
    const o=back(seg(t,6.2,6.8))*fo, b3=blocks[3].userData; ok.scale.setScalar(nz(o)); ok.position.set(b3.x,.07+b3.h+.3+Math.sin(t*2)*.035,-.2); ok.rotation.y=(1-o)*1.2;
  };
  return B;
}

/* ---------- 3 · le storyboard : six plans, chacun validé ---------- */
function s3(){
  const B=base(1.82,new THREE.Vector3(0,0,0)); B.dur=10;
  const imgs=[1,2,3,4,6,8], cards=[];
  imgs.forEach((n,i)=>{ const g=new THREE.Group(); const b=box(1.62,.06,.94,C.white); g.add(b);
    const s=screen(tex(`/assets/mx-${n}.jpg`),1.52,.855); s.rotation.x=-Math.PI/2; s.position.y=.031; g.add(s);
    const ck=check(.22); ck.position.set(.62,.06,-.33); g.add(ck);
    g.userData={x:-1.82+(i%3)*1.82,z:-.68+Math.floor(i/3)*1.36,s,ck}; B.scene.add(g); cards.push(g); });
  const pl=pool(0xA45BFF,2.6,1.8); B.scene.add(pl);
  B.update=t=>{
    const fo=1-seg(t,9.2,9.75);
    let px=0,pz=0,pw=0;
    cards.forEach((g,i)=>{ const u=g.userData, a=eo(seg(t,.12*i,.9+.12*i)), v=1.6+i*.8, lift=Math.sin(Math.PI*seg(t,v-.3,v+.45));
      g.position.set(u.x,.03+(1-a)*-.4+lift*.3,u.z); g.rotation.z=lift*.06; g.scale.setScalar(nz(a*fo));
      if(lift>pw){ pw=lift; px=u.x; pz=u.z; }
      u.s.material.uniforms.sat.value=io3(seg(t,v,v+.55)); const c=back(seg(t,v+.15,v+.55)); u.ck.scale.setScalar(nz(c)); });
    pl.position.set(px,.004,pz); pl.material.opacity=.45*pw*fo;
  };
  return B;
}

/* ---------- 4 · le shooting : une photo, transformée par l'IA en image de référence ---------- */
function s4(){
  const B=base(2.05,new THREE.Vector3(0,.42,0)); B.dur=8.5;
  const gate=new THREE.Group(), gm={emissive:C.vio,emissiveIntensity:.85,roughness:.3}, GZ=.58, GH=1.18;
  const p1=box(.06,GH,.06,C.vio,gm), p2=p1.clone(), top=box(.06,.06,GZ*2+.06,C.vio,gm);
  p1.position.set(0,GH/2,-GZ); p2.position.set(0,GH/2,GZ); top.position.set(0,GH,0); gate.add(p1,p2,top);
  const film=new THREE.Mesh(new THREE.PlaneGeometry(GZ*2,GH),new THREE.MeshBasicMaterial({color:0xB57CFF,transparent:true,opacity:.1,side:THREE.DoubleSide,depthWrite:false}));
  film.rotation.y=Math.PI/2; film.position.y=GH/2; gate.add(film);
  B.scene.add(gate); const pl=pool(0xA45BFF,2.2,2.2); B.scene.add(pl);
  const ia=label(B,'IA',.2,{color:VIO}); ia.position.set(.12,.002,GZ+.12); B.scene.add(ia);
  const CW=1.32,CD=.75, X0=-1.7, X1=1.7;
  const card=new THREE.Group(), cb=box(CW+.08,.05,CD+.08,C.white); card.add(cb);
  const img=screen(tex('/assets/mx-6.jpg'),CW,CD); img.rotation.x=-Math.PI/2; img.position.y=.027; card.add(img);
  img.material.uniforms.gate.value=0; B.scene.add(card);
  const lp=label(B,'photo',.17,{color:GREY}); lp.position.set(X0-CW/2,.002,CD/2+.3); B.scene.add(lp);
  const lr=label(B,'image de référence',.17,{color:VIO}); lr.position.set(X1-CW/2-.25,.002,CD/2+.3); B.scene.add(lr);
  B.update=t=>{
    const fo=1-seg(t,7.6,8.2), a=eo(seg(t,0,.7)), p=io3(seg(t,1.1,4.8)), x=X0+(X1-X0)*p;
    card.position.set(x,.42+Math.sin(t*1.6)*.03+(1-a)*-.3,0); card.scale.setScalar(nz(a*fo));
    img.material.uniforms.t.value=t;
    const pass=1-Math.min(1,Math.abs(x)/(CW*.6)); film.material.opacity=.07+.2*pass; pl.material.opacity=(.22+.45*pass)*fo*a;
    gate.scale.setScalar(nz(eo(seg(t,0,.6))*fo));
    lp.material.opacity=fo*(.35+.65*(1-p)); lr.material.opacity=fo*(.35+.65*seg(t,4.2,4.9)); ia.material.opacity=fo;
  };
  return B;
}

/* ---------- 5 · la production : trois calques qui se posent en une image ---------- */
function s5(video){
  const B=base(2.15,new THREE.Vector3(0,.72,0)); B.dur=10.4;
  const W=2.6,H=1.4625, mk=[];
  const l0=box(W,.05,H,C.white); l0.receiveShadow=false; const bars=[];
  for(let i=0;i<22;i++){ const b=box(.034,.02,.24,C.vio,{emissive:C.vio,emissiveIntensity:.35}); b.castShadow=false; b.position.set(-W/2+.3+i*.095,.03,.1); l0.add(b); bars.push(b); }
  const l1=box(W,.05,H,C.white); l1.receiveShadow=false; const im=new THREE.Mesh(new THREE.PlaneGeometry(W-.08,H-.08),new THREE.MeshBasicMaterial({map:tex('/assets/mx-7.jpg')})); im.rotation.x=-Math.PI/2; im.position.y=.027; l1.add(im);
  const vm=new THREE.Mesh(new THREE.PlaneGeometry(W-.08,H-.08),new THREE.MeshBasicMaterial({map:video,transparent:true,opacity:0})); vm.rotation.x=-Math.PI/2; vm.position.y=.029; l1.add(vm);
  const l2=box(W,.03,H,C.mid,{transparent:true,opacity:.3,roughness:.15}); l2.castShadow=false;
  const tt=label(null,'Une agence ? Pour quoi faire.',.24,{font:'"Nohemi", sans-serif',weight:400,upper:false,color:'#150A26',size:96,fix:1}); tt.position.set(-W/2+.16,.02,H/2-.3); l2.add(tt);
  const labs=[['voix · son',l0],['image',l1],['motion design',l2]].map(([n,l])=>{ const m=label(B,n,.15,{color:GREY}); m.position.set(-W/2+.12,.035,-H/2+.17); l.add(m); return m; });
  [l0,l1,l2].forEach(l=>{ B.scene.add(l); mk.push(l); });
  const sweep=box(.04,.04,H+.08,C.vio,{emissive:C.vio,emissiveIntensity:1.3}); sweep.castShadow=false; B.scene.add(sweep);
  const pl=pool(0xA45BFF,3.6,2.6); B.scene.add(pl);
  const ok=check(.3); B.scene.add(ok);
  B.update=t=>{
    const fo=1-seg(t,9.6,10.2), col=io3(seg(t,3.8,4.9)), gap=.74*(1-col)+.04*col;
    mk.forEach((l,i)=>{ const a=eo(seg(t,.2+.35*i,1.2+.35*i)); l.position.y=.05+i*gap+(1-a)*1.2+Math.sin(t*1.2+i)*.03*(1-col); l.scale.setScalar(nz(a*fo)); });
    bars.forEach((b,i)=>{ b.scale.y=nz((1+5*Math.abs(Math.sin(t*3+i*.7)*Math.cos(t*1.3+i*.31)))*(1-col)); });
    labs.forEach(m=>m.material.opacity=1-col);
    tt.material.opacity=1-seg(t,5.2,5.7);
    l2.material.opacity=.3*(1-seg(t,5,5.6));
    const sw=seg(t,5,6.1); sweep.visible=sw>0&&sw<1; sweep.position.set(-W/2+W*io3(sw),.05+2*.04+.05,0);
    pl.position.set(-W/2+W*io3(sw),.004,0); pl.material.opacity=.4*Math.sin(Math.PI*sw);
    vm.material.opacity=seg(t,5.6,6.6);
    const o=back(seg(t,6.6,7.2))*fo; ok.scale.setScalar(nz(o)); ok.position.set(W/2-.08,.32+.03*Math.sin(t*2),-H/2+.08);
  };
  return B;
}

/* ---------- 6 · la livraison : v1, v2, v3 validée, puis tous les formats ---------- */
function s6(video){
  const B=base(1.98,new THREE.Vector3(.38,.8,.1)); B.dur=10.4;
  const dev=(w,h,x,z)=>{ const g=new THREE.Group(); const b=box(w,h,.08,C.white); b.position.y=h/2; g.add(b);
    const s=screen(video,w-.08,h-.08); s.position.set(0,h/2,.041); g.add(s); g.position.set(x,0,z); B.scene.add(g); return {g,s}; };
  const mon=dev(2.4,1.35,-.75,0), sq=dev(.95,.95,1.15,.42), ph=dev(.56,1,2.05,.78);
  const cp=chip(); const vb=new THREE.Mesh(new THREE.PlaneGeometry(.33,.18),new THREE.MeshBasicMaterial({map:cp.tx})); vb.position.set(-1.2+.24,1.35-.16,.043); mon.g.add(vb);
  const fl=[['16:9',mon,-1.2],['1:1',sq,-.475],['9:16',ph,-.28]].map(([n,d,x])=>{ const l=label(B,n,.15,{color:GREY}); l.position.set(x,.002,.22); d.g.add(l); return l; });
  const ok=check(.32); B.scene.add(ok); const pl=pool(0xA45BFF,3.4,1.6); pl.position.set(-.75,.004,.35); B.scene.add(pl);
  B.update=t=>{
    const fo=1-seg(t,9.6,10.2);
    const grow=(d,a)=>{ const k=back(seg(t,a,a+.7))*fo; d.g.scale.set(1,nz(k),1); d.g.visible=k>.02; return clamp(k); };
    grow(mon,.1); const k1=grow(sq,5), k2=grow(ph,5.35);
    const v=t<2.1?0:t<3.5?1:2; cp.set('V'+(v+1),v===2);
    mon.s.material.uniforms.sat.value=v===0?0:v===1?.4:io3(seg(t,3.5,4));
    sq.s.material.uniforms.sat.value=ph.s.material.uniforms.sat.value=1;
    fl[0].material.opacity=seg(t,4.6,5); fl[1].material.opacity=k1; fl[2].material.opacity=k2;
    const o=back(seg(t,3.8,4.4))*fo; ok.scale.setScalar(nz(o)); ok.position.set(-.75+.95,1.35+.26+Math.sin(t*2)*.035,0);
    pl.material.opacity=.35*seg(t,3.6,4.2)*fo;
  };
  return B;
}

/* ---------- moteur : une scène par carte, rendue seulement à l'écran ---------- */
const vid=document.createElement('video'); Object.assign(vid,{muted:true,loop:true,playsInline:true,crossOrigin:'anonymous',preload:'auto'}); vid.src='/assets/fe-histoire.mp4';
const VT=new THREE.VideoTexture(vid); VT.colorSpace=THREE.SRGBColorSpace;
const MAKE=[null,s1,s2,s3,s4,()=>s5(VT),()=>s6(VT)];
const items=[]; const v2=new THREE.Vector2(), off=new THREE.Vector3(), UP=new THREE.Vector3(0,1,0); const FT=new URLSearchParams(location.search).get('t3d');
const ob=new IntersectionObserver(es=>es.forEach(e=>{ const it=items.find(i=>i.el===e.target); if(!it) return; it.vis=e.isIntersecting; if(it.vis){ it.t0=0; it.done=false; }
  const needV=items.some(i=>i.vis&&i.video); if(needV) vid.play().catch(()=>{}); else vid.pause(); }),{rootMargin:'80px 0px'});
document.querySelectorAll('.g3').forEach(el=>{ const n=+el.dataset.s, S=MAKE[n](); Object.assign(S,{el,cv:el.querySelector('canvas'),vis:false,t0:0,video:n>=5});
  S.ctx=S.cv.getContext('2d'); items.push(S); ob.observe(el); el.classList.add('ready'); });
function frame(now){
  requestAnimationFrame(frame);
  const vis=items.filter(i=>i.vis&&!i.done); if(!vis.length) return;
  const dpr=Math.min(2,devicePixelRatio||1); let MW=1,MH=1;
  vis.forEach(i=>{ const r=i.el.getBoundingClientRect(); i.cw=r.width; i.w=Math.max(1,Math.round(r.width*dpr)); i.h=Math.max(1,Math.round(r.height*dpr)); MW=Math.max(MW,i.w); MH=Math.max(MH,i.h);
    if(i.cv.width!==i.w||i.cv.height!==i.h){ i.cv.width=i.w; i.cv.height=i.h; } });
  R.getSize(v2); if(v2.x<MW||v2.y<MH) R.setSize(Math.max(v2.x,MW),Math.max(v2.y,MH),false); R.getSize(v2);
  vis.forEach(i=>{ if(!i.t0) i.t0=now; const t=FT!==null?+FT:RM?i.dur*.62:((now-i.t0)/1000)%i.dur; i.update(t);
    const k=clamp(560/i.cw,1,1.22); i.labs.forEach(m=>m.scale.setScalar(k));
    const a=i.w/i.h, v=i.view; Object.assign(i.cam,{left:-v*a,right:v*a,top:v,bottom:-v}); i.cam.updateProjectionMatrix();
    off.copy(ISO).applyAxisAngle(UP,Math.sin(t*.5)*.035); i.cam.position.copy(i.target).add(off); i.cam.lookAt(i.target);
    R.setViewport(0,v2.y-i.h,i.w,i.h); R.setScissor(0,v2.y-i.h,i.w,i.h); R.setScissorTest(true); R.clear(); R.render(i.scene,i.cam);
    i.ctx.clearRect(0,0,i.w,i.h); i.ctx.drawImage(R.domElement,0,0,i.w,i.h,0,0,i.w,i.h); if(RM) i.done=true; });
}
requestAnimationFrame(frame);
