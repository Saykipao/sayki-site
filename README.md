# sayki.studio

Site de Sayki Studio : `public/index.html` et `public/assets/` (vignettes et boucles vidéo).
Les films complets sont hébergés sur Bunny Stream.

Mise en ligne : Cloudflare (Workers, contenu statique), configuré dans `wrangler.jsonc`.
Chaque envoi sur la branche `main` remet le site en ligne automatiquement.
Les modifications passent par Claude.

## Pages clients protégées

`public/clients/<client>/<AAMMJJ>/index.html` : pages réservées à un client, protégées par mot de passe.
Le dépôt étant public, on n'y dépose jamais la page en clair : elle est chiffrée avec
`node outils/proteger-page.mjs <page.html> public/clients/<client>/<AAMMJJ>/index.html "<mot de passe>"`.
Le mot de passe n'est écrit nulle part dans le dépôt.
