# Recettes du Lux — plan de projet

**Domaine cible** : recettes.crofte.fr
**Statut** : phases 0 à 6 et 8 terminées, phase 7 (IA) à faire
**Dernière mise à jour** : 17 août 2026

> Les sections 2 à 5 décrivent le plan initial. Les écarts assumés en cours de route sont consignés en section 8, qui fait foi.

---

## 1. Objectif

Créer un site web statique en français référençant mes recettes, avec :

> Périmètre élargi le 17 août 2026 : le site couvre désormais toutes mes recettes, et non plus seulement celles à l'airfryer. Voir la section 8.


- ajout et modification d'une recette par simple fichier markdown dans le dépôt GitHub ;
- illustration par images, dont une photo principale du plat fini ;
- hébergement GitHub Pages, avec un seul enregistrement DNS à poser chez OVH ;
- recherche par mot clé et par ingrédient ;
- fonction « J'ai la flemme » tirant au sort une recette marquée comme telle ;
- fonctionnement mobile en PWA installable et consultable hors ligne ;
- à terme, une fonction IA proposant des recettes à partir du contenu existant.

---

## 2. Décisions arrêtées

| Sujet | Choix | Raison |
|---|---|---|
| Moteur | Astro 5 (finalement Astro 7) | HTML statique, zéro JS par défaut, gestion native du markdown et des images, compatible GitHub Pages |
| Édition | Markdown + CMS visuel Sveltia | Le fichier `.md` reste la source de vérité ; le CMS n'est qu'une surcouche de confort |
| Images | Dans le dépôt, à côté du `.md` | Versionnées, gratuites, optimisées automatiquement au build |
| Direction visuelle | Éditorial chaleureux | Grandes photos, serif marqué en titres, fond crème, accent terracotta |
| Flemme | Drapeau manuel `flemme: true` | Mon jugement prime sur un calcul automatique |
| PWA | Installable + hors ligne complet | Usage réel en cuisine, réseau incertain |
| Confort cuisine | Écran toujours allumé, ingrédients cochables, ajustement des portions | Retenu ; le minuteur intégré est écarté de la v1 |

### Contraintes à connaître

**GitHub Pages ne sert que du statique.** La recherche et le tirage aléatoire tournent donc côté navigateur, sur un index JSON généré au build. C'est parfait jusqu'à plusieurs centaines de recettes.

**La fonction IA ne peut pas tenir en statique.** Une clé API dans le navigateur serait lisible par n'importe qui. Il faudra un petit endpoint externe. Je prévois un Cloudflare Worker (offre gratuite largement suffisante), et l'architecture v1 est conçue pour l'accueillir sans réécriture.

**Le dépôt doit être public.** Un domaine personnalisé sur GitHub Pages depuis un dépôt privé nécessite un compte payant. Un dépôt public de recettes ne pose aucun problème, mais il faut le savoir avant de commencer.

**Le CMS a besoin d'un point d'authentification GitHub.** ~~Sveltia fournit un worker Cloudflare prêt à l'emploi pour ça.~~ **Invalidé le 17 août 2026** : Sveltia propose une connexion par jeton personnel, qui supprime ce besoin. Cloudflare ne servira qu'à la phase 7.

---

## 3. Modèle de données

Une recette est un dossier. Cela garde les photos collées à leur recette et permet de tout déplacer ou supprimer d'un bloc.

```
src/content/recettes/
  poulet-croustillant-paprika/
    index.md
    plat-fini.jpg
    etape-marinade.jpg
  frites-de-patate-douce/
    index.md
    plat-fini.jpg
```

### Frontmatter

Les données structurées vivent dans le frontmatter, le corps markdown accueille l'histoire et les astuces. Ce découpage est ce qui rend possibles l'ajustement des portions, les données de cuisson exploitables et le balisage schema.org.

```yaml
---
titre: "Poulet croustillant au paprika"
description: "Une peau bien dorée en 25 minutes, sans un gramme de friture."
image: "./plat-fini.jpg"
imageAlt: "Cuisses de poulet dorées au paprika dans le panier de l'airfryer"

# Temps et rendement
preparation: 10          # minutes
cuisson: 25              # minutes
repos: 0                 # minutes, optionnel
portions: 4

# Cuisson (facultatif hors airfryer)
airfryer: true
temperature: 200         # °C, obligatoire si airfryer vaut true
prechauffage: true
secouerAMiCuisson: true

# Classement
categorie: "plat"        # entree | plat | dessert | snack | accompagnement
difficulte: "facile"     # facile | moyen | technique
saison: ["automne", "hiver"]
regime: ["sans-gluten"]
tags: ["poulet", "épicé", "familial"]
flemme: true

# Ingrédients structurés, pour le recalcul des portions
ingredients:
  - quantite: 4
    unite: "pièce"
    nom: "cuisses de poulet"
    ajustable: true
  - quantite: 2
    unite: "cuillère à soupe"
    nom: "paprika fumé"
    ajustable: true
  - quantite: 1
    unite: "pincée"
    nom: "sel"
    ajustable: false

# Étapes, avec données de cuisson exploitables
etapes:
  - texte: "Mélanger le paprika, le sel et l'huile, puis enrober le poulet."
  - texte: "Cuire peau vers le haut, puis secouer le panier."
    temperature: 200
    duree: 15
  - texte: "Poursuivre jusqu'à ce que la peau soit croustillante."
    temperature: 200
    duree: 10

miseAJour: 2026-08-17
---

Quelques mots d'introduction, puis mes notes personnelles.

## Astuces

Sécher la peau au papier absorbant change tout.

## Variantes

Fonctionne aussi avec des pilons, en réduisant de cinq minutes.
```

Ce frontmatter est validé par un schéma Zod dans Astro. Une faute de frappe ou un champ manquant fait échouer le build avec un message clair, avant toute mise en ligne. Le CMS Sveltia affichera exactement ces champs sous forme de formulaire, avec glisser-déposer pour les images.

---

## 4. Architecture technique

```
recettes.crofte.fr
        │
        ▼
GitHub Pages  ← GitHub Actions (build Astro)  ← dépôt GitHub (source de vérité)
                                                      ▲
                                                      │ écrit des .md
                                              Sveltia CMS (/admin)
                                                      │
                                              jeton personnel GitHub
                                              (aucun service à déployer)

Phase 7, à venir :
  navigateur → Cloudflare Worker → API Claude
               (clé côté serveur)
```

| Besoin | Solution | Note |
|---|---|---|
| Génération | Astro 7, content collections + Zod | Validation du frontmatter au build |
| Images | `astro:assets` | WebP/AVIF, tailles multiples, `loading="lazy"` automatique |
| Styles | CSS natif, variables CSS, `@layer` | Pas de Tailwind ici : site petit, design sur mesure, moins de dépendances |
| Recherche | Fuse.js sur un index JSON généré au build | Recherche floue titre + ingrédients + tags, fonctionne hors ligne |
| Flemme | Filtre sur `flemme: true` dans l'index, tirage côté client | Aucune requête réseau |
| PWA | Service worker écrit à la main | `@vite-pwa/astro` ne déclare pas Astro 7 ; trois stratégies suffisent |
| Confort cuisine | JS vanilla léger, îlots Astro | Wake Lock API, cases mémorisées en `localStorage`, recalcul des quantités |
| CMS | Sveltia CMS | Page `/admin`, connexion par jeton personnel GitHub, écrit dans le dépôt. Aucun worker requis |
| Déploiement | GitHub Actions → GitHub Pages | Build à chaque push sur `main` |
| SEO | JSON-LD `Recipe` par recette, sitemap, flux RSS | Éligibilité aux résultats enrichis Google |
| IA (v2) | Cloudflare Worker + API Claude | Clé côté serveur, jamais dans le navigateur |

### Configuration du domaine

Une seule action chez OVH, à faire une fois :

```
Type    Sous-domaine    Cible
CNAME   recettes        <compte-github>.github.io.
```

Côté dépôt : un fichier `public/CNAME` contenant `recettes.crofte.fr`, puis activation de « Enforce HTTPS » dans les réglages Pages. Le certificat Let's Encrypt est émis automatiquement, généralement en moins d'une heure.

---

## 5. Direction visuelle

Registre éditorial chaleureux, pensé pour être lu à bout de bras dans une cuisine.

- **Couleurs** : fond crème très clair, texte brun profond, accent terracotta pour les liens et le bouton « J'ai la flemme ». Un vert olive discret pour les données de cuisson. Contrastes vérifiés au niveau AA, mode sombre inclus dès le départ.
- **Typographie** : une serif à fort caractère pour les titres de recette, une sans-serif très lisible pour le corps et les listes. Polices auto-hébergées, deux fichiers variables maximum, aucun appel externe.
- **Photo** : elle porte le site. Image principale plein cadre en haut de la fiche recette, vignettes en ratio 4:3 dans les listes.
- **Fiche recette** : le titre, la photo, puis un bandeau de données chiffrées (température, durée totale, portions) immédiatement visible. Ingrédients et étapes en deux colonnes sur grand écran, empilés sur mobile, avec des cibles tactiles d'au moins 44 pixels.
- **Accessibilité** : cible RAWeb 1.1 niveau AA. HTML sémantique, navigation clavier complète, focus visible, libellés visibles sur tous les groupes de filtres, respect de `prefers-reduced-motion`.

Une passe de maquettage précédera le développement de cette phase.

---

## 6. Phases

### Phase 0 — Fondations et mise en ligne (terminée)
Initialisation du dépôt, installation d'Astro, workflow GitHub Actions, fichier CNAME, enregistrement DNS chez OVH, page d'accueil provisoire.
**Résultat** : recettes.crofte.fr affiche une page en HTTPS. Le risque DNS est levé avant tout le reste.

### Phase 1 — Modèle de contenu (terminée)
Collection Astro, schéma Zod, trois recettes réelles avec photos, page liste et page détail sans style élaboré, pipeline d'images.
**Résultat** : je peux ajouter une recette en créant un dossier, et elle apparaît en ligne.

### Phase 2 — Direction visuelle (terminée)
Système de design (variables CSS, échelle typographique, composants), mise en forme de la liste et de la fiche, mode sombre, responsive.
**Résultat** : le site ressemble à quelque chose que j'ai envie d'ouvrir.

### Phase 3 — Recherche, filtres et flemme (terminée)
Génération de l'index JSON au build, recherche Fuse.js, filtres par catégorie, tag et régime avec titres visibles, bouton « J'ai la flemme ».
**Résultat** : je retrouve une recette par ingrédient, et j'obtiens une suggestion au hasard.

### Phase 4 — PWA et confort cuisine (terminée)
Manifest, icônes, service worker et stratégies de cache, page hors ligne, écran toujours allumé, ingrédients et étapes cochables, ajustement des portions.
**Résultat** : le site s'installe sur mon téléphone et reste utilisable sans réseau.

### Phase 5 — CMS d'édition (terminée)
Configuration Sveltia, page `/admin`, mise en correspondance de tous les champs. Le worker d'authentification Cloudflare initialement prévu s'est révélé inutile.
**Résultat** : j'ajoute une recette depuis mon téléphone, photo comprise, sans toucher au markdown.

### Phase 6 — SEO, accessibilité et performance (terminée)
JSON-LD `Recipe`, sitemap, RSS, métadonnées de partage, audit RAWeb AA, audit Lighthouse, fichier `llms.txt` pour la visibilité dans les moteurs génératifs.
**Résultat** : le site est trouvable, conforme et rapide.

### Phase 7 — Fonction IA (à faire)
Cloudflare Worker exposant un endpoint protégé, appel à l'API Claude, contexte construit depuis l'index des recettes, interface de suggestion (« que faire avec ce qu'il me reste », « une variante de cette recette »).
**Résultat** : le site propose des idées fondées sur mon propre contenu.

### Phase 8 — Recettes en plusieurs préparations (ajoutée et terminée le 17 août 2026)
Un plat décrit en parties nommées, chacune avec ses ingrédients et ses étapes, présentées en sections séparées. Modèle et arbitrage détaillés en section 10.
**Résultat** : un curry affiche son plat, sa sauce et ses nans dans trois sections distinctes.

L'accessibilité n'est pas réservée à la phase 6 : elle est appliquée dans chaque phase, la phase 6 n'étant qu'un audit de contrôle.

**Ordre d'exécution retenu** : la phase 8 a précédé la phase 5, le CMS générant ses formulaires depuis le schéma. Le schéma est désormais stable, le CMS peut être construit dessus.

---

## 7. Paramètres confirmés

- Compte GitHub : `geoffreycrofte`, dépôt `cookbook`, public, branche `main`.
- Cible CNAME : `geoffreycrofte.github.io.`
- Compte Cloudflare : déjà existant, disponible pour les phases 5 et 7.
- Recette de référence : ailes de poulet au paprika fumé, texte original, photo sous licence Pexels. Elle sert d'exemple technique et pourra être remplacée.

### Écart par rapport au plan initial

Astro 5 a été écarté au moment de l'installation : cette branche traîne plusieurs failles XSS et une faille SSRF non corrigées. Le projet utilise **Astro 7.2.2**, sans vulnérabilité connue au moment du build.

---

## 8. Travail effectué

**Cadrage**
- Arbitrages techniques et visuels, rédaction de ce plan.

**Phase 0 — Fondations** (terminée côté code, action manuelle restante)
- Astro 7.2.2 installé, `npm audit` propre.
- `astro.config.mjs` : site canonique, URL en dossiers, préchargement au survol.
- TypeScript en mode strict, `.gitignore`, `.nvmrc` sur Node 22.
- `public/CNAME` contenant `recettes.crofte.fr`.
- `.github/workflows/deploy.yml` : build et publication Pages à chaque push sur `main`, droits minimaux, pas de déploiements concurrents.

**Phase 1 — Modèle de contenu** (terminée)
- `src/content.config.ts` : collection `recettes`, chargeur glob sur `**/index.md`, slug tiré du nom de dossier, schéma Zod complet (socle, données airfryer, classement, ingrédients structurés, étapes avec température et durée, notes, brouillon).
- Première recette réelle avec photo dans `src/content/recettes/ailes-de-poulet-paprika-fume/`.
- Gabarit `Base.astro` : `lang="fr"`, lien d'évitement, canonique, Open Graph, focus visible, respect de `prefers-reduced-motion`.
- Page liste `/` et fiche recette `/recettes/<slug>/`.
- `src/lib/format.ts` : durées, quantités à la française, libellés de catégorie.
- Pipeline d'images opérationnel : WebP responsive, la photo de 213 ko descend à 13 ko en vignette.
- `README.md` documentant l'ajout d'une recette.

**Phase 2 — Direction visuelle** (terminée)

Thèmes de thèmes Astro tout faits (Tastyyy, Flavour Fushion) écartés après examen du code : ce sont des starters BCMS dont le build tire le contenu d'une API hébergée, ce qui supprime le markdown dans le dépôt et empêche de construire sur GitHub Pages. Pile incompatible également (Astro 6, React 19, Tailwind 3 avec l'intégration dépréciée). Trois idées en ont été retenues : photo en bandeau large, métadonnées en pastilles, ingrédients sur deux colonnes.

Direction retenue : **papier et braise**. Un magazine de cuisine imprimé, où la température et la durée sont traitées comme des chiffres de titrage.

- Polices auto-hébergées, aucun appel externe : Fraunces Variable en titrage (axes SOFT et WONK pour la chaleur), Karla Variable en corps.
- Palette crème et braise, jetons CSS en couches `@layer`, mode sombre complet.
- Grain de papier en fond fixe, turbulence SVG en ligne, atténué en mode sombre.
- Signatures visuelles : disque de température débordant sous la photo des cartes, bandeau de chiffres pleine largeur sur la fiche, ingrédients en points de conduite façon carte de restaurant, numéros d'étape ajourés dans la marge.
- Ouverture asymétrique de la fiche : le texte tenu par la colonne, la photo filant jusqu'au bord droit.
- Une seule orchestration d'animation, en cascade au chargement, désactivée sous `prefers-reduced-motion`.

**Typographie française automatique**
- `src/lib/typographie.ts` et `plugins/typographie-fr-markdown.mjs` posent les espaces insécables avant `: ; ! ?` et dans les guillemets, dans le frontmatter comme dans le corps markdown. Rien à taper à la main.
- Les unités s'accordent au pluriel, les symboles normalisés restant invariables.

**Contrôles passés**
- `astro check` : 0 erreur sur 11 fichiers.
- `npm run contrastes` : 22 paires vérifiées dans les deux thèmes, 0 échec.
- Aucun débordement horizontal à 390 px de large.
- Photo de 213 ko servie en WebP, de 13 ko en vignette à 121 ko en pleine largeur.

**Élargissement du périmètre** (17 août 2026)

Le site ne se limite plus aux recettes à l'airfryer : il devient mon carnet de cuisine général, sous le nom **Recettes du Lux**. L'airfryer passe du statut d'identité du site à celui de caractéristique de recette.

- Nouveau champ `airfryer: true` dans le frontmatter. Il pilote le macaron sur la carte, la mention sur la fiche et le comptage sur l'accueil.
- `temperature`, `prechauffage` et `secouerAMiCuisson` deviennent facultatifs, les cuissons sans température étant désormais possibles.
- Deux garde-fous validés au build : une recette annoncée à l'airfryer doit indiquer sa température, et `secouerAMiCuisson` est refusé hors airfryer. Les deux échouent avec un message explicite plutôt que de produire une fiche bancale.
- Le disque de température sur les cartes est remplacé par un macaron « Air / fryer », la température n'étant pas un indice visuel utile au moment du choix. Le bandeau de la fiche la conserve, à sa place.
- Bandeau de chiffres et colonne de notes centrés à partir de 48 rem.

**Phase 3 — Recherche, filtres et flemme** (terminée)

- Index de recherche construit au build (`src/lib/recherche.ts`) et sérialisé dans la page d'accueil. Il sera disponible hors ligne sans effort quand la PWA arrivera.
- Recherche floue via Fuse.js sur le titre, la description, les ingrédients et les étiquettes, insensible aux accents et tolérante aux fautes de frappe.
- Ingrédients et étiquettes indexés en listes plutôt qu'en chaînes concaténées : une première version concaténée remontait quatre recettes sur « gouter » au lieu d'une seule.
- Filtres par catégorie, étiquette, régime et cuisson, chaque groupe portant un libellé visible et non un simple `aria-label`.
- Compteur de résultats en région `role="status"`, état vide explicite, bouton de réinitialisation, touche Échap pour vider le champ.
- L'ordre des cartes suit la pertinence pendant une recherche et revient à l'ordre d'origine dès qu'on la vide.
- « J'ai la flemme » est un vrai `<a href>` pointant vers une recette tirée au build. Le JavaScript ne fait qu'en changer la destination à chaque chargement et à chaque clic. Le lien reste donc fonctionnel sans JavaScript, s'ouvre dans un nouvel onglet et se laisse indexer.
- Amélioration progressive intégrale : sans JavaScript, le bloc de recherche reste masqué et la liste complète s'affiche, rendue côté serveur.
- 10 ko de JavaScript compressé au total, Fuse.js compris.

**Fiabilisation du champ `regime`**

Les filtres ont révélé que « sans gluten » et « sans-gluten » créaient deux facettes pour une même réalité. Un champ qui sert de filtre ne peut pas rester en texte libre : `regime` est désormais une énumération fermée, et un build sur une valeur inventée échoue en listant les valeurs acceptées. Les `tags` restent libres mais sont ramenés en minuscules, pour que la casse ne dédouble pas les facettes.

**Contrôles passés**

Recherche vérifiée sur un jeu temporaire de cinq recettes, retiré ensuite : mot clé exact, ingrédient, faute de frappe (« paprica » trouve « paprika »), accent (« gouter » trouve « goûter »), requête sans résultat, filtres seuls, intersections de filtres, intersection vide, tirage aléatoire réparti sur douze chargements, et rendu sans JavaScript.

**Phase 4 — PWA et confort cuisine** (terminée)

*Écart par rapport au plan* : `@vite-pwa/astro` ne déclare Astro que jusqu'à la version 5. Plutôt que de forcer une intégration hors support sur Astro 7, le service worker est écrit à la main dans `public/sw.js`. Il tient en trois stratégies et reste entièrement lisible.

- **Manifeste et icônes.** `public/manifest.webmanifest`, icônes 192, 512, masquable et Apple, plus un favicon vectoriel. Toutes générées par `scripts/generer-icones.mjs` depuis une source unique : une assiette crème sur fond braise, surmontée de trois volutes de vapeur. Aucun texte, donc aucune dépendance à une police au moment du rendu. Les fichiers produits sont versionnés, le build n'appelle pas le script.
- **Service worker.** Navigation en réseau d'abord avec repli sur le cache puis sur `/hors-ligne/`. Cache d'abord pour `/_astro/` et `/icones/`, dont les noms portent une empreinte. Réseau d'abord pour le reste. Enregistré en production seulement : en développement il servirait des pages périmées. Une constante `VERSION` invalide tous les caches.
- **Portions ajustables.** Compteur plus et moins, quantités recalculées en direct. Les ingrédients marqués `ajustable: false` et ceux sans quantité restent intacts. Le formatage réutilise les fonctions du site : virgule décimale française et accord des unités suivant la nouvelle quantité.
- **Ingrédients et étapes cochables.** Vraies cases à cocher sous une apparence sur mesure, mémorisées par recette dans `localStorage`, avec repli silencieux si le stockage est refusé. Une étape faite remplit son numéral ajouré. Bouton « Tout décocher ».
- **Écran toujours allumé.** Bascule `aria-pressed` appuyée sur l'API Wake Lock, reprise automatique au retour d'arrière-plan, bloc masqué si l'appareil ne gère pas l'API.
- **Amélioration progressive.** Sans JavaScript, la barre d'outils reste masquée et la fiche s'affiche intégralement.
- **Page `/hors-ligne/`** expliquant que seules les recettes déjà ouvertes sont consultables sans réseau.

**Contrôles passés**

- Portions de 4 à 8 puis à 3 : quantités justes, levure chimique non ajustable inchangée, pincée sans quantité inchangée, accords au pluriel corrects.
- Cases cochées, relues après rechargement depuis `localStorage`.
- Hors ligne éprouvé serveur réellement arrêté, et non par simple simulation réseau : recette déjà consultée entièrement lisible avec son image, page d'accueil fonctionnelle, page jamais visitée renvoyée sur `/hors-ligne/`.
- Aucun débordement horizontal à 390 px, et plus aucune cible tactile sous 24 px après correction du fil d'Ariane (WCAG 2.2, critère 2.5.8).

**Élagage de l'artefact déployé**

Astro dépose dans `dist/_astro/` la photo d'origine de chaque recette à côté des variantes WebP qu'il génère, sans qu'aucune page ne la référence. Sur une seule recette cela représentait déjà 214 ko, soit près d'un quart du poids total, et le gâchis aurait grandi avec chaque photo ajoutée.

`scripts/elaguer-originaux.mjs`, branché sur `npm run build`, retire ces fichiers. Il reste volontairement prudent : seuls les JPEG et PNG de `dist/_astro/` sont candidats, et un fichier n'est supprimé que si aucun fichier texte du site ne cite son nom. Poids de l'artefact ramené de 1 143 ko à 929 ko, sans aucune requête en échec.

**Phase 5 — CMS d'édition** (terminée)

*Écart notable par rapport au plan* : **aucun worker Cloudflare n'est nécessaire.** Sveltia CMS propose une connexion par jeton personnel GitHub, qui rend inutile le service d'authentification prévu. Le CMS ne dépend donc d'aucun service tiers à déployer. Cloudflare ne servira plus qu'à la phase 7.

- `public/admin/index.html` et `public/admin/config.yml`, servis sur `/admin/`.
- Configuration miroir du schéma Astro : 25 champs, y compris les listes imbriquées d'ingrédients et d'étapes à l'intérieur des parties.
- Collection configurée en dossier par recette (`path: '{{slug}}/index'`) avec `media_folder` et `public_folder` vides, pour que la photo se range à côté de son `index.md`, comme à la main.
- Libellés, aides et valeurs de listes rédigés en français, avec des rappels sur les pièges : unité au singulier, ingrédients non ajustables, exclusivité entre `ingredients` et `parties`.

**Deux protections ajoutées en chemin**

*Tolérance au `null`.* Un formulaire écrit `champ: null` quand on laisse une case vide, là où la main écrit une ligne en moins. Sans tolérance, la première recette créée depuis l'interface aurait fait échouer le build pour rien. Un utilitaire `facultatif()` traite désormais `null` comme une absence sur tous les champs concernés. Vérifié sur une recette écrite avec des `null` partout.

*Épinglage et empreinte SRI.* Le script du CMS détient un jeton ayant droit d'écriture sur le dépôt : le charger depuis un CDN en version flottante reviendrait à faire confiance d'avance à ce qui sera servi demain. La version est donc épinglée et vérifiée par empreinte, ce qui fait échouer le chargement si le fichier livré diffère d'un octet. `npm run cms:maj` réécrit l'URL et recalcule l'empreinte.

L'auto-hébergement du bundle a été écarté : 1,9 Mo ajoutés à l'historique Git à chaque montée de version, pour une protection que l'empreinte assure déjà.

**Contrôles passés**

- `npm run cms:verifier` valide la configuration contre le schéma officiel de Sveltia. Éprouvé en échec sur une clé racine inventée et sur des widgets mal orthographiés, y compris imbriqués dans `parties.ingredients`.
- Une clé `locale: fr` que j'avais ajoutée s'est révélée invalide : c'est précisément ce contrôle qui l'a signalée, avant toute ouverture de `/admin`.
- L'interface a été chargée dans un navigateur : elle démarre, s'affiche en français, lit la configuration et reconnaît le dépôt. L'empreinte SRI n'a bloqué aucune ressource.
- Astro accepte un chemin d'image relatif sans `./`, format que le CMS produit. Vérifié jusque dans le HTML généré, pas seulement au code de retour.

**Ce que je n'ai pas pu vérifier**

L'écriture réelle depuis l'interface demande un jeton GitHub, que je n'ai pas. La création d'une recette de bout en bout, le téléversement d'une photo et le commit résultant restent donc à éprouver. Les tests correspondants sont en section 11.

**Phase 6 — SEO, accessibilité et performance** (terminée)

**Référencement**

- **JSON-LD `Recipe`** sur chaque fiche : durées en ISO 8601, rendement, catégorie, ingrédients agrégés de toutes les parties, régimes traduits en URL schema.org, méthode de cuisson. Une recette en plusieurs parties est balisée en `HowToSection`, ce que Google comprend, plutôt qu'en liste plate. Les régimes sans équivalent normalisé (sans porc, sans fruits à coque) sont volontairement omis : mieux vaut un balisage incomplet qu'inventé.
- **JSON-LD `BreadcrumbList`**, pour que le chemin s'affiche plutôt que l'URL brute.
- **Image de partage.** Elle manquait complètement : un lien partagé n'affichait aucune vignette. Chaque page génère désormais une image 1200 × 630 depuis la photo de la recette, avec `og:image:alt`, `og:site_name` et une carte Twitter large.
- **`sitemap.xml`, `rss.xml`, `robots.txt` et `llms.txt`**, écrits à la main. `@astrojs/sitemap` et `@astrojs/rss` ne déclarent aucune compatibilité avec Astro 7 ; quarante lignes maîtrisées valent mieux qu'une dépendance dont on ignore si elle suivra. `robots.txt` exclut `/admin/` et `/hors-ligne/` de l'indexation.

**Accessibilité (RAWeb 1.1, niveau AA)**

Un manque réel a été trouvé et corrigé : **le critère 12.1 exige deux systèmes de navigation**, or le site n'avait que son moteur de recherche, présent uniquement sur la page d'accueil. Depuis une fiche recette, aucun moyen de naviguer autrement qu'en revenant en arrière.

Correctif : une page **`/plan-du-site/`** classant les recettes par catégorie, fonctionnant sans JavaScript, plus une navigation de pied de page présente sur toutes les pages. Le critère est satisfait par la combinaison moteur de recherche et plan du site.

Mesures relevées sur le site construit, pas sur le code :

| Contrôle | Résultat |
|---|---|
| `lang`, titre de page, identifiants uniques | conforme sur les quatre gabarits |
| Images sans alternative | 0 |
| Champs de formulaire sans nom accessible | 0 sur 19 |
| Groupes de champs sans légende visible | 0 (Catégories, Étiquettes, Régimes, Cuisson) |
| Liens et boutons sans nom accessible | 0 |
| Ordre des titres, sauts de niveau | aucun saut |
| `tabindex` positif | 0 |
| Focus visible | 12 éléments testés, 0 sans indicateur |
| Reflow à 320 px (10.11) | aucun débordement sur les quatre pages |
| Espacement du texte forcé (10.12) | aucun débordement |
| Contrastes (3.2, 3.3) | 22 paires, toutes AA, dans les deux thèmes |
| Cibles tactiles sous 24 px | 0 |
| Lisibilité sans CSS (10.2, 10.3) | contenu complet, ordre des rubriques correct |
| Régions de statut | présentes sur le compteur de résultats |

**Performance**

- 8 requêtes, 253 ko au total sur une fiche recette, aucun script bloquant.
- Les polices pesaient 150 de ces 253 ko et n'étaient découvertes qu'après l'analyse du CSS, soit un aller-retour de trop avant le premier texte. Elles sont désormais préchargées, sous-ensemble latin uniquement, et démarrent à 71 ms au lieu d'attendre le CSS.

**Ce qui reste à votre main**

Ces contrôles sont automatisables ; d'autres ne le sont pas. La pertinence des alternatives textuelles, la cohérence de l'ordre de tabulation à l'usage et le rendu réel au lecteur d'écran demandent un passage humain. De même, l'outil de test des résultats enrichis de Google et une mesure Lighthouse sur le site en ligne ne peuvent être lancés qu'une fois le domaine actif.

### Journal des incidents

**17 août 2026 — page d'accueil vide en développement**

Après le changement de schéma (ajout de `airfryer`, passage de `temperature` en facultatif), le serveur de développement, lancé depuis plus d'une heure, n'affichait plus aucune recette. Son magasin de contenu (`.astro/data-store.json`) s'était vidé de toutes ses entrées sans reconstruire, et écrasait au passage celui produit par le build.

Le code était correct : un serveur de développement neuf, lancé sur une copie isolée du même code, affichait bien la recette, et le `dist/` construit la contenait aussi.

Deux enseignements :

1. **Redémarrer le serveur de dev après toute modification de `src/content.config.ts`.** Noté dans le README.
2. **Les contrôles ne contrôlaient rien d'utile.** `astro check` ne fait que du typage, et `astro build` se déclare satisfait dès qu'il a écrit un fichier, fût-il vide. Annoncer « 0 erreur » sur cette base était trompeur.

Correctif : `scripts/verifier-rendu.mjs`, branché sur `npm run build`. Il lit le `dist/` produit et vérifie que chaque recette non brouillon possède sa page, que cette page contient un titre, ses ingrédients et ses étapes, que la page d'accueil renvoie vers elle et affiche son titre, et que l'état vide n'est jamais rendu alors que des recettes existent. Testé dans les deux sens : il passe sur un `dist/` sain et échoue en code 1 sur un `dist/` saboté.

---

## 9. Travail restant

### Reprendre le travail

1. Lire cette section 9, puis la section 11 pour les tests qui vous reviennent.
2. `npm install` puis `npm run dev`. **Après tout changement de `src/content.config.ts`, redémarrer le serveur** : son magasin de contenu ne se reconstruit pas à chaud et la page d'accueil se vide sans prévenir.
3. `npm run build` enchaîne types, construction, élagage et vérification du rendu. `npm run cms:verifier` et `npm run contrastes` se lancent à part.
4. Les commits restent votre main. Au 17 août 2026 au soir, le dernier est `v1.0 - Engine + CMS` ; le travail de la phase 6 (SEO, plan du site, préchargement des polices) est encore dans l'arbre de travail, non committé.


### Phases à faire

| Phase | Objet | Remarque |
|---|---|---|
| 7 | Fonction IA | Worker Cloudflare et API Claude, contexte bâti depuis l'index de recherche existant. Seule phase nécessitant encore un service tiers |

### Questions ouvertes

- **Mode de cuisson explicite.** Le drapeau `airfryer` est binaire. Si des recettes au four, à la poêle et à la casserole s'accumulent, un champ `cuisson` à valeurs multiples sera plus juste. À trancher sur des recettes réelles, pas à vide.
- **Préparations partagées entre plats.** Tranché : modèle par parties intégrées, sans références. À rouvrir seulement si des préparations identiques s'accumulent réellement. Voir la section 10.
- **Liste d'étiquettes.** Elle s'allongera vite. Au-delà d'une quinzaine, il faudra la replier derrière un bouton dans le bloc de recherche.

### Limites connues à ce jour

- Le site ne contient qu'une recette réelle. La grille, le sommaire chiffré et la pertinence de la recherche ne se jugeront qu'à partir de six ou sept fiches.
- L'installation sur écran d'accueil et le maintien de l'écran allumé n'ont été vérifiés qu'au navigateur de bureau. Le comportement réel sur téléphone reste à confirmer.
- La photo de la recette de référence est sous licence Pexels et créditée comme telle. À remplacer par la vôtre.
- L'écriture depuis le CMS n'a jamais été exercée : elle demande un jeton GitHub. Voir les tests de la phase 5.
- Le site n'a pas encore été vu en ligne sur le domaine. Les contrôles SEO qui dépendent d'une URL publique (résultats enrichis de Google, aperçu de partage, Lighthouse, indexation) restent à faire.

---

## 10. Recettes en plusieurs préparations

### Le besoin

Certains plats ne tiennent pas dans une recette linéaire. Un curry se compose d'un plat principal, d'une sauce au yaourt et de nans, chacun avec ses ingrédients et ses étapes. La fiche doit les présenter en sections clairement séparées, sans obliger à jongler entre trois onglets pendant la cuisson.

### Décision : le modèle simple, sans références

Deux modèles étaient possibles.

| | Par références | Par parties intégrées |
|---|---|---|
| Forme | `composants: [{recette: slug}]` renvoyant vers d'autres fiches | `parties: [{nom, ingredients, etapes}]` dans la recette |
| Réutilisation | La même sauce sert plusieurs plats | La sauce est retapée dans chaque plat |
| À prévoir | Facteurs de portions, cycles, agrégation d'index, composants non autonomes, sous-recettes orphelines | Rien de tout cela |
| Coût | Une phase pleine | Une demi-journée |

Le modèle par références a été écarté : la réutilisation d'une même préparation entre plusieurs plats resterait rare en pratique, et elle seule justifiait la mécanique. Autant ne pas entretenir un système de renvois pour un bénéfice qui n'arrivera pas.

Ce choix reste réversible. Si des préparations partagées finissent par s'accumuler, `parties` pourra accueillir un champ `recette` renvoyant vers une fiche existante, sans casser les recettes déjà écrites.

### Ce qui a été mis en œuvre (17 août 2026)

```yaml
parties:
  - nom: "Le curry"
    ingredients: [...]
    etapes: [...]
  - nom: "La sauce au yaourt"
    note: "À préparer pendant que le curry mijote."
    ingredients: [...]
    etapes: [...]
```

- **Une seule voie de rendu.** Le schéma normalise toute recette en une liste de `sections` : une recette simple en compte une, sans nom. Le reste du site n'a donc qu'un seul cas à traiter, et les recettes déjà écrites n'ont pas bougé d'une ligne.
- **Deux garde-fous au build.** Une recette qui déclarerait les deux formes échoue, une recette qui n'en déclarerait aucune aussi, chacune avec un message qui colle à l'erreur commise.
- **Hiérarchie de titres correcte.** Les noms de parties passent en `h2`, les rubriques « Ingrédients » et « Préparation » descendent en `h3`. Une recette simple garde ses rubriques en `h2`.
- **Cases à cocher préfixées** par le rang de la section : deux parties ne se cochent plus ensemble.
- **Recherche agrégée.** Chercher un ingrédient qui n'existe que dans la sauce remonte le plat entier.
- **Portions.** Le compteur pilote toutes les parties d'un coup, chacune gardant ses ingrédients non ajustables.
- **Champ `note`** par partie, pour les indications d'enchaînement (« à préparer pendant que le curry mijote »).

### Contrôles passés

Éprouvé sur un curry temporaire en trois parties, retiré depuis : hiérarchie des titres, identifiants de cases distincts d'une partie à l'autre, portions de 4 à 8 recalculant les trois parties, recherche remontant le plat sur « menthe », « yaourt » et « farine », et les deux garde-fous du schéma vérifiés en échec. La recette simple existante rend exactement comme avant.

### Ce qui reste ouvert

- Les identifiants de cases à cocher ont changé de forme (`ingredient-0` devient `s0-ingredient-0`). D'anciennes coches mémorisées dans un navigateur sont simplement ignorées. Sans conséquence tant que le site n'est pas en ligne.
- Le balisage schema.org de la phase 6 devra agréger les parties en une seule recette, le type `Recipe` ne prévoyant pas de sous-préparations. Le plus honnête sera de préfixer chaque étape par le nom de sa partie.
- Le bandeau de chiffres suppose toujours une température unique. Une recette dont les parties cuisent à des températures différentes devra les porter au niveau de ses étapes, ce que le modèle permet déjà.

---

## 11. Tests de validation à ma charge

À faire au fil des phases, chacun devant être vert avant de passer à la suite.

### Après la phase 0
- [ ] Ouvrir https://recettes.crofte.fr et voir la page provisoire.
- [ ] Vérifier le cadenas HTTPS et l'absence d'avertissement de certificat.
- [ ] Pousser une modification de texte et constater sa mise en ligne automatique en quelques minutes.

### Après la phase 1
- [ ] Créer un dossier de recette avec `index.md` et une photo, pousser, et voir la recette apparaître.
- [ ] Introduire volontairement une faute dans le frontmatter et vérifier que le build échoue avec un message compréhensible.
- [ ] Après un changement de `src/content.config.ts`, redémarrer le serveur de dev et vérifier que les recettes réapparaissent.
- [ ] Vérifier que la photo principale s'affiche sur la fiche et en vignette dans la liste.

### Après la phase 2
- [ ] Consulter le site sur téléphone, tablette et ordinateur, sans débordement horizontal.
- [ ] Basculer le système en mode sombre et vérifier la lisibilité.
- [ ] Parcourir une fiche entière au clavier uniquement, avec un focus toujours visible.
- [ ] Vérifier que la ponctuation française ne se retrouve jamais seule en début de ligne.
- [ ] Activer « Réduire les animations » dans le système et vérifier que la cascade d'ouverture disparaît.
- [ ] Lancer `npm run contrastes` après toute retouche de couleur.

### Après la phase 3
- [ ] Chercher un ingrédient présent dans une seule recette et la retrouver.
- [ ] Chercher avec une faute de frappe et vérifier que le résultat sort quand même.
- [ ] Combiner deux filtres et vérifier la cohérence des résultats.
- [ ] Cliquer « J'ai la flemme » dix fois et vérifier que plusieurs recettes différentes sortent, toutes marquées flemme.

### Après la phase 3 (complément)
- [ ] Vérifier qu'un régime inventé dans le frontmatter fait bien échouer le build.
- [ ] Désactiver JavaScript dans le navigateur et vérifier que la liste complète reste affichée et que « J'ai la flemme » mène toujours à une recette.
- [ ] Parcourir les filtres au clavier seul, en vérifiant que la barre d'espace coche bien chaque jeton.

### Après la phase 4
- [ ] Installer le site sur l'écran d'accueil du téléphone et vérifier l'icône et le nom.
- [ ] Consulter deux recettes, passer en mode avion, et vérifier qu'elles restent lisibles.
- [ ] Activer l'écran toujours allumé et vérifier que le téléphone ne s'éteint pas au bout de deux minutes.
- [ ] Cocher des ingrédients, quitter la page, revenir, et vérifier que les coches sont conservées.
- [ ] Passer une recette de 4 à 6 portions et vérifier chaque quantité recalculée.

### Après la phase 8 (recettes en plusieurs préparations)
- [ ] Écrire une vraie recette en trois parties et vérifier l'affichage en trois sections distinctes.
- [ ] Déclarer par erreur `ingredients` et `parties` ensemble, et vérifier que le build échoue avec un message clair.
- [ ] Changer le nombre de portions et vérifier que les trois parties se recalculent.
- [ ] Chercher un ingrédient qui n'existe que dans une seule partie et vérifier que le plat remonte dans les résultats.
- [ ] Cocher un ingrédient dans deux parties différentes et vérifier qu'elles ne se cochent pas ensemble.
- [ ] Vérifier au lecteur d'écran que les noms de parties s'annoncent bien comme des titres de niveau 2.

### Après la phase 5 (CMS)

Ces tests demandent un jeton GitHub et ne peuvent être faits que par vous.

- [ ] Créer un jeton fine-grained limité à ce dépôt, avec la seule permission *Contents : Read and write* (procédure dans le README).
- [ ] Se connecter sur /admin avec ce jeton et vérifier que la liste des recettes s'affiche.
- [ ] Créer une recette complète depuis le téléphone, photo comprise, puis vérifier dans le dépôt que la photo est bien rangée à côté de l'`index.md` et non dans un dossier séparé.
- [ ] Vérifier que le build déclenché par ce commit passe. En cas d'échec sur un champ laissé vide, me le signaler : c'est la tolérance au `null` qu'il faudra étendre.
- [ ] Créer une recette en plusieurs parties depuis l'interface et vérifier les listes imbriquées d'ingrédients et d'étapes.
- [ ] Modifier une recette existante depuis le CMS et vérifier que les champs non touchés ne sont pas réécrits n'importe comment.
- [ ] Vérifier que `/admin/` n'apparaît pas dans les résultats de recherche une fois le site indexé.

### Après la phase 6 (SEO et accessibilité)

Ces tests demandent le site en ligne ou un jugement humain, et ne peuvent pas être automatisés.

- [ ] Passer une fiche recette dans l'outil de test des résultats enrichis de Google, sans erreur.
- [ ] Obtenir un score Lighthouse d'au moins 95 en performance et 100 en accessibilité sur une fiche.
- [ ] Coller un lien de recette dans une messagerie et vérifier que la vignette, le titre et la description s'affichent.
- [ ] Vérifier que `sitemap.xml`, `rss.xml`, `robots.txt` et `llms.txt` répondent bien en ligne.
- [ ] S'abonner au flux RSS depuis un lecteur et vérifier qu'une nouvelle recette y apparaît.
- [ ] Parcourir une fiche complète au lecteur d'écran et juger si les alternatives textuelles décrivent réellement les photos.
- [ ] Naviguer au clavier seul de l'accueil à une recette puis au plan du site, et vérifier que l'ordre reste logique à l'usage.
- [ ] Vérifier dans la Search Console, une fois le site indexé, que `/admin/` n'y figure pas.

### Après la phase 7
- [ ] Demander une suggestion à partir de trois ingrédients et vérifier qu'elle s'appuie sur des recettes réellement présentes sur le site.
- [ ] Vérifier dans les outils de développement du navigateur qu'aucune clé API n'est exposée.
