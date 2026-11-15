#!/usr/bin/env node
// Protège une page HTML autonome par mot de passe (chiffrement AES-256-GCM, clé dérivée par PBKDF2).
// Le dépôt est public : on ne publie JAMAIS la page en clair, seulement sa version chiffrée.
//
//   node outils/proteger-page.mjs <page.html> <public/clients/client/AAMMJJ/index.html> "<mot de passe>"
//
// La page d'origine doit tenir en un seul fichier (styles, scripts et images intégrés).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { webcrypto as crypto } from 'node:crypto';

const [src, dest, motDePasse] = process.argv.slice(2);
if (!src || !dest || !motDePasse) {
  console.error('Usage : node outils/proteger-page.mjs <page.html> <destination/index.html> "<mot de passe>"');
  process.exit(1);
}
const ITER = 600000;
const ici = dirname(fileURLToPath(import.meta.url));
const clair = readFileSync(src);
const logo = readFileSync(join(ici, 'logo.svg'), 'utf8');

const sel = crypto.getRandomValues(new Uint8Array(16));
const iv = crypto.getRandomValues(new Uint8Array(12));
const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(motDePasse.trim()), 'PBKDF2', false, ['deriveKey']);
const cle = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: sel, iterations: ITER, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
const chiffre = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cle, clair));
const paquet = Buffer.concat([sel, iv, chiffre]).toString('base64');

const page = `<!doctype html>
<html lang="fr-BE">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow,noarchive">
<meta name="referrer" content="no-referrer">
<title>Espace client · Sayki Studio</title>
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@300..700&family=Geist+Mono:wght@400;500&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet">
<style>
:root{--nuit:#150A26;--nuit-2:#21113B;--ecran:#F3EEF9;--cendre:#A99DC0;--violet:#9E37FF;--violet-clair:#C08BFF;--trait:rgba(243,238,249,.13);color-scheme:dark}
*{box-sizing:border-box}
html,body{height:100%;margin:0}
body{background:radial-gradient(120% 90% at 50% 0%,var(--nuit-2),var(--nuit) 62%);color:var(--ecran);font:400 16px/1.5 "Geist",system-ui,-apple-system,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased;display:grid;grid-template-rows:auto 1fr auto;min-height:100%}
header,footer{padding:clamp(20px,3.2vw,40px)}
header a{display:inline-block;color:var(--ecran)}
header svg{display:block;height:44px;width:auto}
main{display:grid;place-items:center;padding:0 clamp(20px,3.2vw,40px)}
form{width:min(100%,440px)}
.sur{margin:0 0 18px;font:500 12px/1 "Geist Mono",ui-monospace,Menlo,monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--violet-clair)}
h1{margin:0 0 14px;font:400 clamp(44px,7vw,68px)/1 "Instrument Serif","Times New Roman",serif;letter-spacing:-.01em}
p{margin:0 0 30px;color:var(--cendre)}
label{display:block;margin:0 0 8px;font-size:14px}
.rang{display:flex;gap:10px}
input{flex:1;min-width:0;height:54px;padding:0 16px;border-radius:10px;border:1px solid var(--trait);background:rgba(243,238,249,.05);color:var(--ecran);font:400 17px "Geist Mono",ui-monospace,Menlo,monospace}
input:focus-visible,button:focus-visible{outline:2px solid var(--violet-clair);outline-offset:2px}
button{height:54px;padding:0 24px;border:0;border-radius:10px;background:var(--violet);color:#fff;font:500 16px "Geist",system-ui,sans-serif;cursor:pointer;transition:background .2s}
button:hover{background:#8a22ee}
button[disabled]{opacity:.6;cursor:progress}
#msg{min-height:24px;margin:14px 0 0;font-size:14px;color:#FF9DB0}
footer{font-size:13px;color:var(--cendre)}
footer a{color:inherit}
@media (max-width:460px){.rang{flex-direction:column}}
</style>
</head>
<body>
<header><a href="https://sayki.studio/" aria-label="Sayki Studio, accueil">${logo}</a></header>
<main>
<form id="f" autocomplete="off">
  <p class="sur">Espace client</p>
  <h1>Page réservée.</h1>
  <p>Ce contenu est confidentiel. Entrez le mot de passe que je vous ai transmis pour y accéder.</p>
  <label for="mdp">Mot de passe</label>
  <div class="rang">
    <input id="mdp" type="password" autocomplete="current-password" autocapitalize="off" autocorrect="off" spellcheck="false" required autofocus>
    <button id="ok" type="submit">Ouvrir</button>
  </div>
  <div id="msg" role="alert"></div>
</form>
</main>
<footer>Un souci d'accès ? <a href="mailto:ludovic@sayki.be">ludovic@sayki.be</a></footer>
<script id="paquet" type="application/octet-stream">${paquet}</script>
<script>
(function(){
  var ITER=${ITER}, CLE='sayki-acces:'+location.pathname;
  var f=document.getElementById('f'), champ=document.getElementById('mdp'), ok=document.getElementById('ok'), msg=document.getElementById('msg');
  function octets(b64){ var s=atob(b64), a=new Uint8Array(s.length); for(var i=0;i<s.length;i++) a[i]=s.charCodeAt(i); return a; }
  function b64(a){ var s=''; for(var i=0;i<a.length;i++) s+=String.fromCharCode(a[i]); return btoa(s); }
  var d=octets(document.getElementById('paquet').textContent.trim());
  var sel=d.subarray(0,16), iv=d.subarray(16,28), corps=d.subarray(28);
  /* on attend la fin du chargement : sinon document.write s'ajoute à la page au lieu de la remplacer */
  function afficher(buf){
    var html=new TextDecoder().decode(buf);
    var go=function(){ document.open(); document.write(html); document.close(); };
    if(document.readyState==='complete') go(); else window.addEventListener('load',go);
  }
  function dechiffrer(cle){ return crypto.subtle.decrypt({name:'AES-GCM',iv:iv},cle,corps); }
  function depuisMdp(mdp){
    return crypto.subtle.importKey('raw',new TextEncoder().encode(mdp.trim()),'PBKDF2',false,['deriveBits'])
      .then(function(k){ return crypto.subtle.deriveBits({name:'PBKDF2',salt:sel,iterations:ITER,hash:'SHA-256'},k,256); })
      .then(function(bits){ return crypto.subtle.importKey('raw',bits,'AES-GCM',false,['decrypt']).then(function(cle){ return dechiffrer(cle).then(function(buf){ try{sessionStorage.setItem(CLE,b64(new Uint8Array(bits)));}catch(e){} return buf; }); }); });
  }
  function essayer(mdp,silencieux){
    ok.disabled=true; msg.textContent='';
    depuisMdp(mdp).then(afficher).catch(function(){ ok.disabled=false; if(!silencieux){ msg.textContent='Mot de passe incorrect.'; champ.select(); } });
  }
  if(!window.crypto||!crypto.subtle){ msg.textContent='Ce navigateur est trop ancien pour ouvrir cette page.'; ok.disabled=true; return; }
  f.addEventListener('submit',function(e){ e.preventDefault(); essayer(champ.value); });
  /* déjà ouvert dans cet onglet : on ne redemande pas le mot de passe au rechargement */
  var memo=null; try{memo=sessionStorage.getItem(CLE);}catch(e){}
  if(memo){
    var corpsPage=document.body; corpsPage.style.visibility='hidden';
    crypto.subtle.importKey('raw',octets(memo),'AES-GCM',false,['decrypt']).then(dechiffrer).then(afficher).catch(function(){ try{sessionStorage.removeItem(CLE);}catch(e){} corpsPage.style.visibility=''; });
    return;
  }
  /* lien direct : .../index.html#motdepasse ouvre la page sans rien taper */
  if(location.hash.length>1){ var h=decodeURIComponent(location.hash.slice(1)); try{history.replaceState(null,'',location.pathname+location.search);}catch(e){} essayer(h,true); }
})();
</script>
</body>
</html>
`;
mkdirSync(dirname(dest), { recursive: true });
writeFileSync(dest, page);
console.log('Page protégée écrite : ' + dest + ' (' + Math.round(page.length / 1024) + ' Ko)');
