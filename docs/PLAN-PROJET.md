# Recettes Airfryer — plan de projet

**Domaine cible** : recettes.crofte.fr
**Statut** : planification validée, développement non démarré
**Date** : 17 août 2026

---

## 1. Objectif

Créer un site web statique en français référençant mes recettes à l'airfryer, avec :

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
| Moteur | Astro 5 | HTML statique, zéro JS par défaut, gestion native du markdown et des images, compatible GitHub Pages |
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

**Le CMS a besoin d'un point d'authentification GitHub.** Sveltia fournit un worker Cloudflare prêt à l'emploi pour ça. C'est le même compte Cloudflare que celui de la fonction IA plus tard, donc un seul service tiers au total.

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

# Spécifique airfryer
temperature: 200         # °C
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
                                              Cloudflare Worker (auth GitHub)
                                                      │
                                              Cloudflare Worker (IA, phase 7)
                                                      └─→ API Claude
```

| Besoin | Solution | Note |
|---|---|---|
| Génération | Astro 5, content collections + Zod | Validation du frontmatter au build |
| Images | `astro:assets` | WebP/AVIF, tailles multiples, `loading="lazy"` automatique |
| Styles | CSS natif, variables CSS, `@layer` | Pas de Tailwind ici : site petit, design sur mesure, moins de dépendances |
| Recherche | Fuse.js sur un index JSON généré au build | Recherche floue titre + ingrédients + tags, fonctionne hors ligne |
| Flemme | Filtre sur `flemme: true` dans l'index, tirage côté client | Aucune requête réseau |
| PWA | `@vite-pwa/astro` (Workbox) | Précache de l'index et de la coquille, cache d'exécution pour pages et images |
| Confort cuisine | JS vanilla léger, îlots Astro | Wake Lock API, cases mémorisées en `localStorage`, recalcul des quantités |
| CMS | Sveltia CMS | Page `/admin`, login GitHub, écrit dans le dépôt |
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

### Phase 0 — Fondations et mise en ligne
Initialisation du dépôt, installation d'Astro, workflow GitHub Actions, fichier CNAME, enregistrement DNS chez OVH, page d'accueil provisoire.
**Résultat** : recettes.crofte.fr affiche une page en HTTPS. Le risque DNS est levé avant tout le reste.

### Phase 1 — Modèle de contenu
Collection Astro, schéma Zod, trois recettes réelles avec photos, page liste et page détail sans style élaboré, pipeline d'images.
**Résultat** : je peux ajouter une recette en créant un dossier, et elle apparaît en ligne.

### Phase 2 — Direction visuelle
Système de design (variables CSS, échelle typographique, composants), mise en forme de la liste et de la fiche, mode sombre, responsive.
**Résultat** : le site ressemble à quelque chose que j'ai envie d'ouvrir.

### Phase 3 — Recherche, filtres et flemme
Génération de l'index JSON au build, recherche Fuse.js, filtres par catégorie, tag et régime avec titres visibles, bouton « J'ai la flemme ».
**Résultat** : je retrouve une recette par ingrédient, et j'obtiens une suggestion au hasard.

### Phase 4 — PWA et confort cuisine
Manifest, icônes, service worker et stratégies de cache, page hors ligne, écran toujours allumé, ingrédients et étapes cochables, ajustement des portions.
**Résultat** : le site s'installe sur mon téléphone et reste utilisable sans réseau.

### Phase 5 — CMS d'édition
Déploiement du worker d'authentification Cloudflare, configuration Sveltia, page `/admin`, mise en correspondance de tous les champs.
**Résultat** : j'ajoute une recette depuis mon téléphone, photo comprise, sans toucher au markdown.

### Phase 6 — SEO, accessibilité et performance
JSON-LD `Recipe`, sitemap, RSS, métadonnées de partage, audit RAWeb AA, audit Lighthouse, fichier `llms.txt` pour la visibilité dans les moteurs génératifs.
**Résultat** : le site est trouvable, conforme et rapide.

### Phase 7 — Fonction IA (v2)
Cloudflare Worker exposant un endpoint protégé, appel à l'API Claude, contexte construit depuis l'index des recettes, interface de suggestion (« que faire avec ce qu'il me reste », « une variante de cette recette »).
**Résultat** : le site propose des idées fondées sur mon propre contenu.

L'accessibilité n'est pas réservée à la phase 6 : elle est appliquée dans chaque phase, la phase 6 n'étant qu'un audit de contrôle.

---

## 7. Points à confirmer avant de démarrer

1. Le nom exact du compte GitHub, pour la cible CNAME.
2. L'accord pour un dépôt public.
3. L'existence ou non d'un compte Cloudflare, nécessaire aux phases 5 et 7.
4. Une première recette réelle avec sa photo, qui servira de référence à la phase 1.

---

## 8. Travail effectué

- Cadrage du besoin et arbitrages techniques et visuels.
- Rédaction de ce plan.

## 9. Travail restant

Toutes les phases 0 à 7.

---

## 10. Tests de validation à ma charge

À faire au fil des phases, chacun devant être vert avant de passer à la suite.

### Après la phase 0
- [ ] Ouvrir https://recettes.crofte.fr et voir la page provisoire.
- [ ] Vérifier le cadenas HTTPS et l'absence d'avertissement de certificat.
- [ ] Pousser une modification de texte et constater sa mise en ligne automatique en quelques minutes.

### Après la phase 1
- [ ] Créer un dossier de recette avec `index.md` et une photo, pousser, et voir la recette apparaître.
- [ ] Introduire volontairement une faute dans le frontmatter et vérifier que le build échoue avec un message compréhensible.
- [ ] Vérifier que la photo principale s'affiche sur la fiche et en vignette dans la liste.

### Après la phase 2
- [ ] Consulter le site sur téléphone, tablette et ordinateur, sans débordement horizontal.
- [ ] Basculer le système en mode sombre et vérifier la lisibilité.
- [ ] Parcourir une fiche entière au clavier uniquement, avec un focus toujours visible.

### Après la phase 3
- [ ] Chercher un ingrédient présent dans une seule recette et la retrouver.
- [ ] Chercher avec une faute de frappe et vérifier que le résultat sort quand même.
- [ ] Combiner deux filtres et vérifier la cohérence des résultats.
- [ ] Cliquer « J'ai la flemme » dix fois et vérifier que plusieurs recettes différentes sortent, toutes marquées flemme.

### Après la phase 4
- [ ] Installer le site sur l'écran d'accueil du téléphone et vérifier l'icône et le nom.
- [ ] Consulter deux recettes, passer en mode avion, et vérifier qu'elles restent lisibles.
- [ ] Activer l'écran toujours allumé et vérifier que le téléphone ne s'éteint pas au bout de deux minutes.
- [ ] Cocher des ingrédients, quitter la page, revenir, et vérifier que les coches sont conservées.
- [ ] Passer une recette de 4 à 6 portions et vérifier chaque quantité recalculée.

### Après la phase 5
- [ ] Se connecter sur /admin avec le compte GitHub.
- [ ] Créer une recette complète depuis le téléphone, photo comprise, et vérifier le commit dans le dépôt.
- [ ] Modifier une recette existante depuis le CMS sans casser le build.

### Après la phase 6
- [ ] Passer une fiche recette dans l'outil de test des résultats enrichis de Google, sans erreur.
- [ ] Obtenir un score Lighthouse d'au moins 95 en performance et 100 en accessibilité sur une fiche.
- [ ] Vérifier l'aperçu de partage du lien dans une messagerie.

### Après la phase 7
- [ ] Demander une suggestion à partir de trois ingrédients et vérifier qu'elle s'appuie sur des recettes réellement présentes sur le site.
- [ ] Vérifier dans les outils de développement du navigateur qu'aucune clé API n'est exposée.
