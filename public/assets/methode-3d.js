// Méthode · six scènes isométriques en WebGL (Three.js), un seul moteur partagé.
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

const C={ink:0x150A26,vio:0x9E37FF,pink:0xDE50D2,lav:0xEFE7FC,mid:0xD6C1F8,white:0xffffff,clay:0xECEBEF,clay2:0xD9D7DE};
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const seg=(t,a,b)=>clamp((t-a)/(b-a));
const lerp=(a,b,k)=>a+(b-a)*k;
const io3=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
const eo=t=>1-Math.pow(1-t,3);
const back=t=>{ const c1=1.25,c3=c1+1; return 1+c3*Math.pow(t-1,3)+c1*Math.pow(t-1,2); };
const nz=x=>Math.max(.001,x);
const ISO=new THREE.Vector3(10,10,10);
const GREY='#77727F', VIO='#8A2BE8';

try{ await Promise.all([document.fonts.load('500 40px "Geist Mono"'),document.fonts.load('400 40px "Nohemi"')]); }catch(e){}

let R;
try{ R=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'}); }
catch(e){ document.documentElement.classList.add('no-gl'); throw e; }
R.setPixelRatio(1); R.setClearColor(0x000000,0); R.outputColorSpace=THREE.SRGBColorSpace;
R.shadowMap.enabled=true; R.shadowMap.type=THREE.PCFSoftShadowMap;

const TL=new THREE.TextureLoader();
const tex=src=>{ const t=TL.load(src); t.colorSpace=THREE.SRGBColorSpace; t.anisotropy=4; return t; };

/* ---------- briques ---------- */
function lights(scene,sh=true){
  scene.add(new THREE.HemisphereLight(0xffffff,0xE4E3E9,2.05));
  const d=new THREE.DirectionalLight(0xffffff,1.6); d.position.set(-3.5,10,-1.2);
  if(sh){ d.castShadow=true; d.shadow.mapSize.set(512,512); Object.assign(d.shadow.camera,{left:-6,right:6,top:6,bottom:-6,near:1,far:30}); d.shadow.bias=-.0005; d.shadow.normalBias=.02; d.shadow.radius=4; }
  scene.add(d); return d;
}
function base(view,target){
  const scene=new THREE.Scene(), cam=new THREE.OrthographicCamera(-1,1,1,-1,.1,100); lights(scene);
  const fl=new THREE.Mesh(new THREE.PlaneGeometry(40,40),new THREE.ShadowMaterial({opacity:.1,color:0x24212C}));
  fl.rotation.x=-Math.PI/2; fl.receiveShadow=true; scene.add(fl);
  return {scene,cam,view,target:target||new THREE.Vector3(),labs:[],bbs:[]};
}
function box(w,h,d,color,o={}){
  const m=new THREE.Mesh(new RoundedBoxGeometry(w,h,d,3,Math.min(.04,h/2.4,w/2.4,d/2.4)),new THREE.MeshStandardMaterial({color,roughness:.5,metalness:0,...o}));
  m.castShadow=true; m.receiveShadow=true; return m;
}
const mat=(c,o={})=>new THREE.MeshStandardMaterial({color:c,roughness:.55,...o});
const shade=g=>{ g.traverse(o=>{ if(o.isMesh){ o.castShadow=true; o.receiveShadow=true; } }); return g; };
function textTex(txt,{size=96,color='#150A26',font='"Geist Mono", ui-monospace, monospace',weight=500,upper=true,pad=12,align='left'}={}){
  const c=document.createElement('canvas'), g=c.getContext('2d'), lines=(upper?txt.toUpperCase():txt).split('\n'), f=`${weight} ${size}px ${font}`;
  const ls=upper?Math.round(size*.06)+'px':'0px'; g.font=f; g.letterSpacing=ls; const lh=Math.ceil(size*1.3);
  const w=Math.ceil(Math.max(...lines.map(l=>g.measureText(l).width)))+pad*2, h=lh*lines.length;
  c.width=w; c.height=h; g.font=f; g.letterSpacing=ls; g.fillStyle=color; g.textBaseline='middle'; g.textAlign=align;
  lines.forEach((l,i)=>g.fillText(l,align==='center'?w/2:pad,lh*i+lh/2+size*.04));
  const tx=new THREE.CanvasTexture(c); tx.colorSpace=THREE.SRGBColorSpace; tx.anisotropy=4; return {tx,asp:w/h,n:lines.length};
}
/* étiquette posée à plat, ancrée à gauche (o.c = centrée) ; o.bb = face à la caméra */
function label(B,txt,h,o={}){
  const {tx,asp,n}=textTex(txt,o.bb&&o.left===undefined?{align:'center',...o}:o), hh=h*n, w=hh*asp, g=new THREE.PlaneGeometry(w,hh); if(!o.c&&!o.bb) g.translate(w/2,0,0); if(o.bb&&o.left!==undefined) g.translate(w/2-o.left,0,0);
  const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({map:tx,transparent:true,depthWrite:false}));
  m.userData.w=w; m.renderOrder=3;
  if(o.bb){ if(B) B.bbs.push(m); m.material.depthTest=false; m.renderOrder=5; } else m.rotation.x=-Math.PI/2;
  if(B&&!o.fix) B.labs.push(m); return m;
}
/* flaque de lumière posée au sol */
const PT=(()=>{ const c=document.createElement('canvas'); c.width=c.height=128; const g=c.getContext('2d'), r=g.createRadialGradient(64,64,0,64,64,64);
  r.addColorStop(0,'rgba(255,255,255,1)'); r.addColorStop(.4,'rgba(255,255,255,.42)'); r.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=r; g.fillRect(0,0,128,128);
  return new THREE.CanvasTexture(c); })();
function pool(color,sx,sz=sx){ const m=new THREE.Mesh(new THREE.PlaneGeometry(sx,sz),new THREE.MeshBasicMaterial({map:PT,color,transparent:true,opacity:0,depthWrite:false}));
  m.rotation.x=-Math.PI/2; m.position.y=.003; m.renderOrder=1; return m; }
function checkTex(){ const c=document.createElement('canvas'); c.width=c.height=128; const g=c.getContext('2d');
  g.fillStyle='#9E37FF'; g.fillRect(0,0,128,128); g.strokeStyle='#fff'; g.lineWidth=12; g.lineCap='round'; g.lineJoin='round';
  g.beginPath(); g.moveTo(36,66); g.lineTo(56,86); g.lineTo(94,44); g.stroke(); const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; t.anisotropy=4; return t; }
const CHK=checkTex();
function check(s=.34){ const g=new THREE.Group(); const b=box(s,s*.42,s,C.vio,{emissive:C.vio,emissiveIntensity:.3,roughness:.35}); g.add(b);
  const top=new THREE.Mesh(new THREE.PlaneGeometry(s*.84,s*.84),new THREE.MeshBasicMaterial({map:CHK})); top.rotation.x=-Math.PI/2; top.position.y=s*.21+.002; g.add(top); return g; }
/* image : désaturation (sat) ; photo = rendu « photo brute » (flou léger, grain, gris) */
function imgMat(map,photo=false){
  return new THREE.ShaderMaterial({uniforms:{map:{value:map},sat:{value:1},photo:{value:photo?1:0},t:{value:0}},
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`uniform sampler2D map;uniform float sat;uniform float photo;uniform float t;varying vec2 vUv;
      float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
      void main(){ vec3 c=texture2D(map,vUv).rgb; float l=dot(c,vec3(.299,.587,.114));
        vec3 g=mix(vec3(l),c,sat);
        if(photo>.5){ vec2 o=vec2(.008,0.); vec3 b=(texture2D(map,vUv+o).rgb+texture2D(map,vUv-o).rgb+texture2D(map,vUv+o.yx).rgb+texture2D(map,vUv-o.yx).rgb)*.25;
          float bl=dot(b,vec3(.299,.587,.114)); g=vec3(bl)*vec3(.95,.97,1.02)*.9+.06+(h(floor(vUv*300.)+floor(t*12.))-.5)*.08; }
        gl_FragColor=vec4(g,1.);
        #include <colorspace_fragment>
      }`});
}
function screen(map,w,h){ return new THREE.Mesh(new THREE.PlaneGeometry(w,h),imgMat(map)); }
/* trait lumineux qui se dessine (drawRange) */
function stroke(curve,r=.018,seg=48){ const g=new THREE.TubeGeometry(curve,seg,r,6,false); const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:C.vio}));
  m.userData.n=g.index.count; m.userData.set=k=>{ const n=Math.floor(m.userData.n*clamp(k)/6)*6; g.setDrawRange(0,n); m.visible=n>0; }; m.userData.set(0); return m; }
/* pastille de version, retexturée à la volée */
function chip(){
  const c=document.createElement('canvas'); c.width=176; c.height=96; const g=c.getContext('2d'), tx=new THREE.CanvasTexture(c); tx.colorSpace=THREE.SRGBColorSpace; tx.anisotropy=4;
  let cur=''; const set=(s,on)=>{ const k=s+on; if(k===cur) return; cur=k; g.clearRect(0,0,176,96); g.fillStyle=on?'#9E37FF':'#150A26'; g.fillRect(0,0,176,96);
    g.fillStyle='#fff'; g.font='500 54px "Geist Mono", ui-monospace, monospace'; g.textAlign='center'; g.textBaseline='middle'; g.fillText(s,88,52); tx.needsUpdate=true; };
  set('V1',false); return {tx,set};
}

/* ---------- 1 · le call : trois sujets → un seul angle (on dézoome pour voir le schéma) ---------- */
function s1(){
  const B=base(2.55,new THREE.Vector3(0,.35,0)); B.dur=10.6;
  const names=['votre offre','vos clients','ce qui coince'], cols=[C.white,C.lav,C.mid];
  const W=2.05,D=1.02, step=1.04, CX=-2.35, CZ=[-1.3,0,1.3], HUB=new THREE.Vector3(-.05,.02,0), OX=2.2;
  const slabs=names.map((n,i)=>{ const m=box(W,.2,D,cols[i]); const l=label(B,n,.19); l.position.set(-W/2+.15,.102,D/2-.2); m.add(l); B.scene.add(m); return m; });
  const lines=CZ.map(z=>{ const s=stroke(new THREE.CubicBezierCurve3(new THREE.Vector3(CX+W/2+.06,.02,z),new THREE.Vector3(-.75,.02,z),new THREE.Vector3(-.6,.02,0),HUB.clone().add(new THREE.Vector3(-.1,0,0))),.017); B.scene.add(s); return s; });
  const hub=new THREE.Mesh(new THREE.SphereGeometry(.11,24,16),mat(C.vio,{emissive:C.vio,emissiveIntensity:.6,roughness:.3})); hub.castShadow=true; B.scene.add(hub);
  const hp=pool(0xA45BFF,1.4); hp.position.set(HUB.x,.004,0); B.scene.add(hp);
  const arr=stroke(new THREE.LineCurve3(new THREE.Vector3(HUB.x+.16,.02,0),new THREE.Vector3(OX-1.15,.02,0)),.017,8); B.scene.add(arr);
  const head=new THREE.Mesh(new THREE.ConeGeometry(.075,.2,16),new THREE.MeshBasicMaterial({color:C.vio})); head.rotation.z=-Math.PI/2; head.position.set(OX-1.08,.02,0); B.scene.add(head);
  const out=box(1.85,.46,D,C.vio,{emissive:C.vio,emissiveIntensity:.18,roughness:.3});
  const ol=label(B,'le bon angle',.21,{color:'#ffffff'}); ol.position.set(-1.85/2+.15,.232,D/2-.22); out.add(ol); B.scene.add(out);
  const pl=pool(0xA45BFF,4,3); pl.position.set(OX,.004,0); B.scene.add(pl);
  const V=[2.55,2.4,3.3], T=[new THREE.Vector3(0,.35,0),new THREE.Vector3(-1.9,.3,.33),new THREE.Vector3(-.55,.3,.24)];
  B.update=t=>{
    const fo=1-seg(t,9.9,10.5), c1=io3(seg(t,1.5,3.1)), c2=io3(seg(t,4.6,6.2));
    B.view=lerp(lerp(V[0],V[1],c1),V[2],c2); B.target.copy(T[0]).lerp(T[1],c1).lerp(T[2],c2);
    slabs.forEach((m,i)=>{ const a=eo(seg(t,.15*i,.95+.15*i)), mv=io3(seg(t,1.5+.15*i,2.9+.15*i)), o=(i-1)*step;
      m.position.set(lerp(o,CX,mv),.12+(1-a)*-.5+Math.sin(t*1.4+i*1.6)*.035,lerp(-o,CZ[i],mv));
      m.scale.setScalar(nz(a*fo)); });
    lines.forEach((l,i)=>l.userData.set(io3(seg(t,3+.2*i,4+.2*i))*(fo>.5?1:0)));
    const h=back(seg(t,3.9,4.4))*fo; hub.scale.setScalar(nz(h)); hub.position.set(HUB.x,.13+.03*Math.sin(t*2.4),0); hp.material.opacity=.55*clamp(h)*(.8+.2*Math.sin(t*2.4));
    arr.userData.set(io3(seg(t,4.9,5.5))*(fo>.5?1:0)); head.visible=t>5.45&&fo>.5;
    const o=back(seg(t,5.5,6.3))*fo; out.position.set(OX,.23+.04*Math.sin(t*1.3)*clamp(o),0); out.scale.setScalar(nz(o));
    pl.material.opacity=.4*clamp(o)*(.9+.1*Math.sin(t*2.2));
  };
  return B;
}

/* ---------- 2 · le concept : quatre temps qui montent, jusqu'à la compréhension ---------- */
function s2(){
  const B=base(1.95,new THREE.Vector3(.15,.4,0)); B.dur=9.5;
  const L=5.1, x0=-L/2;
  const track=box(L+.36,.07,1.3,C.white); track.position.set(0,.035,0); B.scene.add(track);
  /* l'accroche dure 5 s, mais on lui laisse la place de son nom */
  const segs=[[0,15,.32,C.vio,'accroche'],[15,36,.55,C.lav,'problème'],[36,75,.95,C.mid,'solution'],[75,90,1.35,C.white,'expertise']];
  const blocks=segs.map(([a,b,h,c,n])=>{ const w=L*(b-a)/90-.05, m=box(w,h,.6,c,c===C.vio?{emissive:C.vio,emissiveIntensity:.25}:{});
    m.userData={x:x0+L*(a+b)/180,h,st:x0+L*a/90}; m.position.set(m.userData.x,0,-.2); B.scene.add(m);
    const l=label(B,n,.16,{color:n==='accroche'?VIO:GREY,fix:1}); l.position.set(m.userData.st+.03,.072,.39); B.scene.add(l);
    return m; });
  const sh=new THREE.Group();
  const veil=new THREE.Mesh(new THREE.PlaneGeometry(1.1,1),new THREE.MeshBasicMaterial({color:0xB47CFF,transparent:true,opacity:.16,side:THREE.DoubleSide,depthWrite:false}));
  veil.rotation.y=Math.PI/2; veil.geometry.translate(0,.5,0); sh.add(veil);
  const edge=box(.03,.03,1.12,C.vio,{emissive:C.vio,emissiveIntensity:1.3}); edge.castShadow=false; sh.add(edge);
  const foot=box(.035,.02,1.24,C.vio,{emissive:C.vio,emissiveIntensity:1.3}); foot.castShadow=false; foot.position.y=.08; sh.add(foot);
  B.scene.add(sh); const pl=pool(0xA45BFF,1.6,1.9); B.scene.add(pl);
  const ok=check(.34); ok.traverse(o=>o.castShadow=false); B.scene.add(ok);
  const cap=label(B,'compréhension\npar votre client',.15,{color:VIO,bb:1,left:.22}); B.scene.add(cap);
  B.update=t=>{
    const fo=1-seg(t,8.9,9.45), on=seg(t,.3,.7)*(1-seg(t,6,6.4)), p=io3(seg(t,.7,5.8)), x=x0+L*p;
    let hh=.3; blocks.forEach(m=>{ const k=back(clamp((x-m.userData.st)/.4))*fo, sy=nz(k);
      m.scale.set(1,sy,1); m.position.y=.07+m.userData.h*sy/2; if(x>=m.userData.st) hh=m.userData.h; });
    const vh=(hh+.42)*on; sh.position.set(x,.07,-.05); sh.visible=on>.01; veil.scale.y=nz(vh); edge.position.y=vh; veil.material.opacity=.16*on;
    pl.position.set(x,.075,-.05); pl.material.opacity=.5*on;
    const o=back(seg(t,6.2,6.8))*fo, b3=blocks[3].userData, cy=.07+b3.h+.3+Math.sin(t*2)*.035;
    ok.scale.setScalar(nz(o)); ok.position.set(b3.x,cy,-.2); ok.rotation.y=(1-o)*1.2;
    const c=eo(seg(t,6.6,7.2))*fo; cap.position.set(b3.x,cy+.62+(1-c)*.12,-.2); cap.material.opacity=c;
  };
  return B;
}

/* ---------- 3 · le storyboard : six dessins sur calques transparents, posés un à un ---------- */
function inkMat(map){
  return new THREE.ShaderMaterial({uniforms:{map:{value:map},op:{value:.4},blur:{value:1}},transparent:true,depthWrite:false,
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`uniform sampler2D map;uniform float op;uniform float blur;varying vec2 vUv;
      void main(){ vec2 d=vec2(.0045,.008)*blur; vec3 c=texture2D(map,vUv).rgb*.36;
        c+=(texture2D(map,vUv+vec2(d.x,0.)).rgb+texture2D(map,vUv-vec2(d.x,0.)).rgb+texture2D(map,vUv+vec2(0.,d.y)).rgb+texture2D(map,vUv-vec2(0.,d.y)).rgb)*.11;
        c+=(texture2D(map,vUv+d).rgb+texture2D(map,vUv-d).rgb+texture2D(map,vUv+vec2(d.x,-d.y)).rgb+texture2D(map,vUv+vec2(-d.x,d.y)).rgb)*.05;
        float l=pow(dot(c,vec3(.299,.587,.114)),1./2.2); float a=smoothstep(.07,.62,1.-l)*op;
        gl_FragColor=vec4(vec3(.16,.13,.22)*(.55+.45*l),a);
        #include <colorspace_fragment>
      }`});
}
function s3(){
  const B=base(1.82,new THREE.Vector3(0,.15,0)); B.dur=10;
  const cards=[];
  [1,2,3,4,5,6].forEach((n,i)=>{ const g=new THREE.Group(); const b=box(1.62,.06,.94,C.white); b.position.y=.03; g.add(b);
    const lay=new THREE.Group(); const plate=box(1.62,.018,.94,C.white,{transparent:true,opacity:.35,roughness:.12,depthWrite:false}); plate.castShadow=false; plate.receiveShadow=false; lay.add(plate);
    const d=new THREE.Mesh(new THREE.PlaneGeometry(1.53,.86),inkMat(tex(`/assets/sb3-${n}.jpg`))); d.rotation.x=-Math.PI/2; d.position.y=.011; d.renderOrder=2; lay.add(d); g.add(lay);
    const ck=check(.22); ck.position.set(.62,.07,-.33); g.add(ck);
    g.userData={x:-1.82+(i%3)*1.82,z:-.68+Math.floor(i/3)*1.36,lay,plate,d,ck}; B.scene.add(g); cards.push(g); });
  const pl=pool(0xA45BFF,2.4,1.7); B.scene.add(pl);
  B.update=t=>{
    const fo=1-seg(t,9.2,9.75);
    let px=0,pz=0,pw=0;
    cards.forEach((g,i)=>{ const u=g.userData, a=eo(seg(t,.12*i,.9+.12*i)), v=1.6+i*.8, dn=io3(seg(t,v-.45,v+.2)), sh=dn*(1-dn)*4;
      g.position.set(u.x,(1-a)*-.4,u.z); g.scale.setScalar(nz(a*fo));
      u.lay.position.y=lerp(.42+.035*Math.sin(t*1.3+i),.069,dn);
      u.d.material.uniforms.op.value=a; u.d.material.uniforms.blur.value=.6*(1-dn);
      u.plate.material.opacity=.35*(1-dn)*a; u.plate.visible=dn<.98;
      if(sh>pw){ pw=sh; px=u.x; pz=u.z; }
      const c=back(seg(t,v+.2,v+.6)); u.ck.scale.setScalar(nz(c)); });
    pl.position.set(px,.004,pz); pl.material.opacity=.45*pw*fo;
  };
  return B;
}

/* ---------- 4 · le shooting : on photographie, l'IA en tire des images de référence ---------- */
/* un humain aux proportions normales (≈ 7 têtes), lisse, sans détail */
function person(P){ const g=new THREE.Group();
  const lathe=(pts,c,x,y,z,sx=1,sz=1)=>{ const m=new THREE.Mesh(new THREE.LatheGeometry(pts.map(([a,b])=>new THREE.Vector2(a,b)),28),mat(c)); m.position.set(x,y,z); m.scale.set(sx,1,sz); g.add(m); return m; };
  const ball=(r,c,x,y,z,sx=1,sy=1,sz=1)=>{ const m=new THREE.Mesh(new THREE.SphereGeometry(r,24,16),mat(c)); m.position.set(x,y,z); m.scale.set(sx,sy,sz); g.add(m); return m; };
  [-1,1].forEach(k=>{
    ball(.034,P.shoe,.03,.025,k*.06,2,.75,1.05);
    lathe([[0,0],[.028,.005],[.03,.05],[.04,.17],[.036,.27],[.05,.38],[.062,.47],[.05,.52],[0,.53]],P.legs,0,.035,k*.06);
    const a=lathe([[0,0],[.024,.01],[.028,.12],[.032,.2],[.038,.3],[.042,.33],[0,.36]],P.top,0,.46,k*.165); a.rotation.x=-k*.06;
    ball(.026,P.skin,.005,.44,k*.168,1,1.5,.8);
  });
  ball(.105,P.legs,0,.56,0,.8,.5,1.3);
  lathe([[0,0],[.085,.0],[.08,.06],[.092,.15],[.1,.23],[.095,.27],[.06,.3],[0,.31]],P.top,0,.54,0,.95,1.55);
  lathe([[0,0],[.03,0],[.028,.05],[0,.06]],P.skin,0,.84,0);
  ball(.068,P.skin,.005,.95,0,.95,1.2,.9);
  return shade(g); }
const PERS={clay:{top:C.clay,legs:0xE2E0E6,skin:0xF6F5F8,shoe:C.clay2},ref:{top:C.vio,legs:0x2B2338,skin:0xF6E3DA,shoe:0xffffff}};
function pack(c,band,logo){ const cv=document.createElement('canvas'); cv.width=256; cv.height=340; const x=cv.getContext('2d');
  x.fillStyle=c; x.fillRect(0,0,256,340); x.fillStyle=band; x.fillRect(0,196,256,60); x.fillStyle=logo; x.beginPath(); x.arc(128,110,42,0,7); x.fill();
  x.fillStyle=band; x.fillRect(64,280,128,10); x.fillRect(88,302,80,8);
  const t=new THREE.CanvasTexture(cv); t.colorSpace=THREE.SRGBColorSpace; t.anisotropy=4;
  const f=new THREE.MeshStandardMaterial({map:t,roughness:.55}), pl=mat(c);
  const g=new THREE.Group(); const m=new THREE.Mesh(new THREE.BoxGeometry(.24,.56,.42),[f,pl,pl,pl,f,pl]); m.position.y=.28; g.add(m);
  const lid=new THREE.Mesh(new THREE.BoxGeometry(.25,.014,.43),mat(band)); lid.position.y=.567; g.add(lid); return shade(g); }
function building(cw,cf){ const c=document.createElement('canvas'); c.width=128; c.height=256; const x=c.getContext('2d'); x.fillStyle=cw; x.fillRect(0,0,128,256); x.fillStyle=cf;
  for(let r=0;r<6;r++) for(let k=0;k<3;k++) x.fillRect(18+k*34,22+r*38,22,24);
  x.fillRect(48,226,32,30); const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace;
  const side=new THREE.MeshStandardMaterial({map:t,roughness:.6}), top=mat(cw);
  const m=new THREE.Mesh(new THREE.BoxGeometry(.56,1.02,.56),[side,side,top,top,side,side]); m.position.y=.51; const g=new THREE.Group(); g.add(m); return shade(g); }
/* une image par objet, rendue une fois dans une texture */
function refShot(obj,y,hs=.5){
  const rt=new THREE.WebGLRenderTarget(320,240,{samples:4}); const sc=new THREE.Scene(); lights(sc,false);
  sc.background=new THREE.Color(0xF1EBFB); const fl=new THREE.Mesh(new THREE.PlaneGeometry(20,20),mat(0xEDE5FA)); fl.rotation.x=-Math.PI/2; sc.add(fl, obj);
  const cam=new THREE.OrthographicCamera(-hs*4/3,hs*4/3,hs,-hs,.1,50); cam.position.set(4,y+4,4); cam.lookAt(0,y,0);
  R.setRenderTarget(rt); R.render(sc,cam); R.setRenderTarget(null); return rt.texture;
}
function s4(){
  const B=base(2.6,new THREE.Vector3(.05,.45,.05)); B.dur=11;
  const OX=-2.05, Z=[-1,0,1], CAMX=-1.05, PX=.3, RX=1.85;
  const objs=[building('#ECEBEF','#C9C6D0'),person(PERS.clay),pack('#EEEDF1','#D3D0D9','#DCD9E1')];
  objs.forEach((o,i)=>{ o.position.set(OX,0,Z[i]); B.scene.add(o); });
  const refs=[refShot(building('#E3D3FA','#9E37FF'),.48,.6),refShot(person(PERS.ref),.55,.46),refShot(pack('#F3ECFD','#9E37FF','#DE50D2'),.3,.38)];
  /* le petit appareil photo */
  const cm=new THREE.Group(); const body=box(.2,.28,.44,C.ink,{roughness:.35}); cm.add(body);
  const lens=new THREE.Mesh(new THREE.CylinderGeometry(.09,.1,.13,24),mat(0x2B2338,{roughness:.3})); lens.rotation.z=Math.PI/2; lens.position.x=-.15; cm.add(lens);
  const glass=new THREE.Mesh(new THREE.CircleGeometry(.065,24),new THREE.MeshBasicMaterial({color:0xB57CFF})); glass.rotation.y=-Math.PI/2; glass.position.x=-.217; cm.add(glass);
  const btn=box(.07,.04,.08,C.vio,{emissive:C.vio,emissiveIntensity:.5}); btn.position.set(0,.16,.13); cm.add(btn);
  const fls=box(.06,.05,.11,C.white,{emissive:0xffffff,emissiveIntensity:0}); fls.position.set(0,.165,-.12); cm.add(fls);
  shade(cm); B.scene.add(cm);
  const ring=new THREE.Mesh(new THREE.RingGeometry(.4,.43,48),new THREE.MeshBasicMaterial({color:C.vio,transparent:true,opacity:0,depthWrite:false})); ring.rotation.x=-Math.PI/2; ring.position.y=.005; B.scene.add(ring);
  /* les trois photos qui partent vers l'IA */
  const photos=refs.map(r=>{ const g=new THREE.Group(); g.add(box(.52,.02,.4,C.white)); const s=new THREE.Mesh(new THREE.PlaneGeometry(.46,.345),imgMat(r,true)); s.rotation.x=-Math.PI/2; s.position.y=.011; g.add(s); g.userData.s=s; B.scene.add(g); return g; });
  /* l'interface IA : un écran simple, debout */
  const pc=document.createElement('canvas'); pc.width=512; pc.height=336; const pg=pc.getContext('2d'), ptx=new THREE.CanvasTexture(pc); ptx.colorSpace=THREE.SRGBColorSpace; ptx.anisotropy=4;
  let pk='';
  const drawP=(n,p)=>{ const k=n+'|'+Math.round(p*60); if(k===pk) return; pk=k; pg.fillStyle='#fff'; pg.fillRect(0,0,512,336);
    pg.fillStyle='#9E37FF'; pg.fillRect(36,34,74,48); pg.fillStyle='#fff'; pg.font='500 30px "Geist Mono", ui-monospace, monospace'; pg.textBaseline='middle'; pg.fillText('IA',52,59);
    pg.fillStyle='#77727F'; pg.font='500 22px "Geist Mono", ui-monospace, monospace'; pg.fillText(p>=1?'IMAGES DE RÉFÉRENCE':'GÉNÉRATION…',130,59);
    for(let i=0;i<3;i++){ pg.fillStyle=i<n?'#E7DAFB':'#F1F0F4'; pg.fillRect(36+i*150,118,134,100); if(i<n){ pg.fillStyle='#9E37FF'; pg.fillRect(36+i*150,206,134*clamp(p*3-i),12); } }
    pg.fillStyle='#F1F0F4'; pg.fillRect(36,262,440,10); pg.fillStyle='#9E37FF'; pg.fillRect(36,262,440*p,10); ptx.needsUpdate=true; };
  drawP(0,0);
  const panel=new THREE.Group(); const pb=box(.07,1,1.52,C.white); panel.add(pb);
  const face=new THREE.Mesh(new THREE.PlaneGeometry(1.44,.945),new THREE.MeshBasicMaterial({map:ptx})); face.rotation.y=Math.PI/2; face.position.x=.037; panel.add(face);
  panel.position.set(PX,.72,0); B.scene.add(panel); const ppl=pool(0xA45BFF,2.2); ppl.position.set(PX+.4,.004,0); B.scene.add(ppl);
  /* les images de référence */
  const RP=[[1,1.3],[2.12,1.3],[3.24,1.3]];
  const cards=refs.map(r=>{ const g=new THREE.Group(); const c=box(1,.76,.035,C.white); c.position.y=.38; g.add(c);
    const s=new THREE.Mesh(new THREE.PlaneGeometry(.92,.69),new THREE.MeshBasicMaterial({map:r})); s.position.set(0,.38,.019); g.add(s); B.scene.add(g); return g; });
  const lp=label(B,'photos',.16,{color:GREY}); lp.position.set(OX-.3,.002,1.55); B.scene.add(lp);
  const li=label(B,'IA',.16,{color:VIO}); li.position.set(PX+.25,.002,-1.05); B.scene.add(li);
  const lr=label(B,'images de référence',.16,{color:VIO}); lr.position.set(.5,.002,1.8); B.scene.add(lr);
  const SH=[1.9,3.0,4.1];
  B.update=t=>{
    const fo=1-seg(t,10.3,10.9);
    objs.forEach((o,i)=>{ const a=back(seg(t,.1*i,.8+.1*i))*fo; o.scale.set(1,nz(a),1); });
    /* l'appareil glisse d'un sujet à l'autre */
    const ca=eo(seg(t,.6,1.2))*fo; let cz=Z[0]; for(let k=1;k<3;k++) cz=lerp(cz,Z[k],io3(seg(t,SH[k-1]+.25,SH[k]-.15)));
    cm.position.set(CAMX,.42+.03*Math.sin(t*2),cz+(1-ca)*.8); cm.scale.setScalar(nz(ca)); if(t>SH[2]+.6) cm.scale.setScalar(nz(ca*(1-seg(t,SH[2]+.6,SH[2]+1.1))));
    let fl=0; SH.forEach((s,k)=>{ const f=seg(t,s,s+.08)*(1-seg(t,s+.08,s+.45)); if(f>fl){ fl=f; ring.position.set(OX,.005,Z[k]); } });
    fls.material.emissiveIntensity=2.5*fl; let rk=0; SH.forEach(s=>{ if(t>=s&&t<s+.8) rk=seg(t,s,s+.8); }); ring.scale.setScalar(.6+rk*.9); ring.material.opacity=(1-rk)*(rk>0?.8:0)*fo;
    /* photo : sort de l'appareil, file vers l'écran */
    let got=0; photos.forEach((g,k)=>{ const k0=SH[k]+.15, f=io3(seg(t,k0,k0+1.05)), up=Math.sin(Math.PI*f)*.55;
      if(t>k0+1.05) got=k+1; g.visible=t>k0&&t<k0+1.05&&fo>.5;
      g.position.set(lerp(CAMX,PX-.15,f),lerp(.65,.72,f)+up,lerp(Z[k],0,f)); g.scale.setScalar(nz(lerp(1,.5,f)*eo(seg(t,k0,k0+.25)))); g.rotation.z=-.5*f;
      g.userData.s.material.uniforms.t.value=t; });
    const pa=back(seg(t,.3,1))*fo; panel.scale.set(1,nz(pa),nz(pa)); const pr=seg(t,SH[0]+1.2,6);
    drawP(got,pr); ppl.material.opacity=(.25+.35*Math.sin(Math.PI*seg(t,2,6.4)))*fo*clamp(pa);
    /* les images de référence se posent, une à une */
    cards.forEach((g,k)=>{ const k0=6.1+k*.35, f=io3(seg(t,k0,k0+.9)); g.visible=t>k0&&fo>.02;
      g.position.set(lerp(PX+.3,RP[k][0],f),lerp(.4,.06,f)+Math.sin(Math.PI*f)*.35+.03*Math.sin(t*1.6+k),lerp(0,RP[k][1],f)); g.scale.setScalar(nz(lerp(.35,1,f)*fo)); });
    lp.material.opacity=fo*seg(t,.4,1); li.material.opacity=fo*seg(t,.8,1.4); lr.material.opacity=fo*seg(t,7,7.6);
  };
  return B;
}

/* ---------- 5 · la production : trois calques, un montage final ---------- */
function s5(){
  const B=base(2.15,new THREE.Vector3(0,.72,0)); B.dur=10.4;
  const W=2.6,H=1.4625, mk=[];
  /* 1. génération vidéo */
  const l0=box(W,.05,H,C.white); l0.receiveShadow=false;
  /* une interface simple : une image en cours de génération, sa barre de progression */
  const gc=document.createElement('canvas'); gc.width=640; gc.height=280; const gx=gc.getContext('2d');
  gx.fillStyle='#EFE7FC'; gx.fillRect(0,0,640,280); gx.fillStyle='#E2D3FA'; gx.beginPath(); gx.moveTo(0,280); gx.lineTo(210,120); gx.lineTo(330,210); gx.lineTo(450,100); gx.lineTo(640,250); gx.lineTo(640,280); gx.fill();
  const gt=new THREE.CanvasTexture(gc); gt.colorSpace=THREE.SRGBColorSpace; gt.anisotropy=4;
  const im=new THREE.Mesh(new THREE.PlaneGeometry(W-.08,H-.36),new THREE.MeshBasicMaterial({map:gt})); im.rotation.x=-Math.PI/2; im.position.set(0,.027,-.14); l0.add(im);
  /* lecture : n'arrive qu'au montage final */
  const flat=(geo,c,x,y,z)=>{ const m=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:c})); m.rotation.x=-Math.PI/2; m.position.set(x,y,z); return m; };
  const play=new THREE.Group(); play.position.set(0,.03,-.2); l0.add(play);
  play.add(flat(new THREE.CircleGeometry(.18,40),C.white,0,0,0));
  const tri=new THREE.Shape(); tri.moveTo(-.055,-.085); tri.lineTo(.09,0); tri.lineTo(-.055,.085); tri.closePath();
  const tm=flat(new THREE.ShapeGeometry(tri),C.vio,0,.002,0); tm.rotation.z=0; play.add(tm);
  const BL=W-.36, track=flat(new THREE.PlaneGeometry(BL,.04),C.white,0,.03,.26); l0.add(track);
  const fg=new THREE.PlaneGeometry(BL,.04); fg.translate(BL/2,0,0); const fill=flat(fg,C.vio,-BL/2,.032,.26); l0.add(fill);
  const ph=flat(new THREE.PlaneGeometry(.022,.1),C.vio,-BL/2,.034,.26); l0.add(ph);
  /* 2. motion design : quelques formes sur un verre */
  const l1=box(W,.03,H,C.mid,{transparent:true,opacity:.28,roughness:.15,depthWrite:false}); l1.castShadow=false;
  const fm=(geo,c,x,z)=>{ const m=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:c,transparent:true})); m.rotation.x=-Math.PI/2; m.position.set(x,.018,z); l1.add(m); return m; };
  const shapes=[fm(new THREE.CircleGeometry(.2,40),C.vio,.8,-.35),fm(new THREE.PlaneGeometry(1.05,.13),C.pink,-.68,-.5),fm(new THREE.PlaneGeometry(.7,.08),C.white,-.85,-.34)];
  /* 3. musique et sound design : une onde */
  const l2=box(W,.03,H,C.white,{transparent:true,opacity:.35,roughness:.15,depthWrite:false}); l2.castShadow=false; const bars=[];
  for(let i=0;i<22;i++){ const b=box(.034,.02,.24,C.vio,{emissive:C.vio,emissiveIntensity:.35}); b.castShadow=false; b.position.set(-W/2+.3+i*.095,.02,-.05); l2.add(b); bars.push(b); }
  const labs=[['génération vidéo',l0,.06],['motion design',l1,.03],['musique et sound design',l2,.03]].map(([n,l,y])=>{ const m=label(B,n,.15,{color:GREY}); m.position.set(-W/2+.12,y,H/2-.16); l.add(m); return m; });
  [l0,l1,l2].forEach(l=>{ B.scene.add(l); mk.push(l); });
  const sweep=box(.04,.04,H+.08,C.vio,{emissive:C.vio,emissiveIntensity:1.3}); sweep.castShadow=false; B.scene.add(sweep);
  const pl=pool(0xA45BFF,3.6,2.6); B.scene.add(pl);
  const fin=label(B,'montage final',.2,{color:VIO}); fin.position.set(-W/2,.002,H/2+.3); B.scene.add(fin);
  const ok=check(.3); B.scene.add(ok);
  B.update=t=>{
    const fo=1-seg(t,9.6,10.2), col=io3(seg(t,4.2,5.2)), gap=.74*(1-col)+.035*col;
    mk.forEach((l,i)=>{ const a=eo(seg(t,.3+1.1*i,1.2+1.1*i)); l.position.y=.05+i*gap+(1-a)*1.1+Math.sin(t*1.2+i)*.03*(1-col); l.scale.setScalar(nz(a*fo)); });
    bars.forEach((b,i)=>{ b.visible=col<.6; b.scale.y=nz((1+5*Math.abs(Math.sin(t*3+i*.7)*Math.cos(t*1.3+i*.31)))*(1-col)); });
    labs.forEach(m=>m.material.opacity=1-col);
    l1.material.opacity=.28*(1-col); l2.material.opacity=.35*(1-col);
    const sw=seg(t,5.3,6.3); sweep.visible=sw>0&&sw<1; sweep.position.set(-W/2+W*io3(sw),.05+2*.035+.05,0);
    pl.position.set(-W/2+W*io3(sw),.004,0); pl.material.opacity=.4*Math.sin(Math.PI*sw);
    fin.material.opacity=eo(seg(t,6.2,6.8))*fo;
    const pa=back(seg(t,6.3,6.9)); play.scale.setScalar(nz(pa)); play.visible=pa>.01;
    const tv=eo(seg(t,6.5,6.9)), pr=seg(t,6.9,9.5); track.visible=fill.visible=ph.visible=tv>.01; track.scale.set(nz(tv),1,1);
    fill.scale.set(nz(pr),1,1); ph.position.x=-BL/2+BL*pr;
    const o=back(seg(t,6.4,7))*fo; ok.scale.setScalar(nz(o)); ok.position.set(W/2-.08,.28+.03*Math.sin(t*2),-H/2+.08);
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
const vid=document.createElement('video'); Object.assign(vid,{muted:true,loop:true,playsInline:true,crossOrigin:'anonymous',preload:'none'});
const VT=new THREE.VideoTexture(vid); VT.colorSpace=THREE.SRGBColorSpace;
const MAKE=[null,s1,s2,s3,s4,s5,()=>s6(VT)];
const items=[]; const v2=new THREE.Vector2(), off=new THREE.Vector3(), UP=new THREE.Vector3(0,1,0); const FT=new URLSearchParams(location.search).get('t3d');
const ob=new IntersectionObserver(es=>es.forEach(e=>{ const it=items.find(i=>i.el===e.target); if(!it) return; it.vis=e.isIntersecting; if(it.vis){ it.t0=0; it.done=false; }
  const needV=items.some(i=>i.vis&&i.video); if(needV){ if(!vid.src) vid.src='/assets/fe-histoire.mp4'; vid.play().catch(()=>{}); } else vid.pause(); }),{rootMargin:'40px 0px'});
document.querySelectorAll('.g3').forEach(el=>{ const n=+el.dataset.s, S=MAKE[n](); Object.assign(S,{el,cv:el.querySelector('canvas'),vis:false,t0:0,video:n===6});
  S.ctx=S.cv.getContext('2d'); items.push(S); ob.observe(el); el.classList.add('ready'); });
/* qualité adaptative : on baisse la définition si les images tardent */
let Q=Math.min(1.5,devicePixelRatio||1), last=0, slow=0;
function frame(now){
  requestAnimationFrame(frame);
  const vis=items.filter(i=>i.vis&&!i.done); if(!vis.length){ last=0; return; }
  if(last){ const dt=now-last; slow=dt>26?slow+1:Math.max(0,slow-1); if(slow>20&&Q>.9){ Q=Math.max(.85,Q-.2); slow=0; } } last=now;
  let MW=1,MH=1;
  vis.forEach(i=>{ const r=i.el.getBoundingClientRect(); i.cw=r.width; i.w=Math.max(1,Math.round(r.width*Q)); i.h=Math.max(1,Math.round(r.height*Q)); MW=Math.max(MW,i.w); MH=Math.max(MH,i.h);
    if(i.cv.width!==i.w||i.cv.height!==i.h){ i.cv.width=i.w; i.cv.height=i.h; } });
  R.getSize(v2); if(v2.x<MW||v2.y<MH) R.setSize(Math.max(v2.x,MW),Math.max(v2.y,MH),false); R.getSize(v2);
  vis.forEach(i=>{ if(!i.t0) i.t0=now; const t=FT!==null?+FT:RM?i.dur*.66:((now-i.t0)/1000)%i.dur; i.update(t);
    const k=clamp(560/i.cw,1,1.22); i.labs.forEach(m=>m.scale.setScalar(k));
    const a=i.w/i.h, v=i.view; Object.assign(i.cam,{left:-v*a,right:v*a,top:v,bottom:-v}); i.cam.updateProjectionMatrix();
    off.copy(ISO).applyAxisAngle(UP,Math.sin(t*.5)*.035); i.cam.position.copy(i.target).add(off); i.cam.lookAt(i.target);
    i.bbs.forEach(m=>m.quaternion.copy(i.cam.quaternion));
    R.setViewport(0,v2.y-i.h,i.w,i.h); R.setScissor(0,v2.y-i.h,i.w,i.h); R.setScissorTest(true); R.clear(); R.render(i.scene,i.cam);
    i.ctx.clearRect(0,0,i.w,i.h); i.ctx.drawImage(R.domElement,0,0,i.w,i.h,0,0,i.w,i.h); if(RM) i.done=true; });
}
requestAnimationFrame(frame);
