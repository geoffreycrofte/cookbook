# Recettes du Lux

Le code de [recettes.crofte.fr](https://recettes.crofte.fr) : notre carnet de recettes, en site statique.

Construit avec [Astro](https://astro.build), publié sur GitHub Pages à chaque push sur `main`.

## Démarrer en local

```bash
npm install
npm run dev         # http://localhost:4321
npm run build       # types, construction, puis vérification du rendu
npm run preview     # sert dist/ comme en production
npm run verifier    # vérifie que dist/ contient bien les recettes
npm run verifier:tags # hygiène des tags (régimes, quasi-doublons) ; n'échoue jamais
npm run contrastes  # vérifie les contrastes de la palette (WCAG AA)
npm run icones      # régénère les icônes de la PWA
```

Le service worker ne s'enregistre qu'en production : en développement il servirait des pages périmées. Pour l'éprouver, utilisez `npm run build` puis `npm run preview`.

> **Après toute modification de `src/content.config.ts`, redémarrez le serveur de dev.**
> Le magasin de contenu d'Astro ne se reconstruit pas toujours à chaud lors d'un
> changement de schéma : le site continue de tourner, mais avec zéro recette.
> `npm run build` détecte le cas, le serveur de dev non.

Node 22 ou plus récent (voir `.nvmrc`).

## Ajouter une recette

Une recette est un dossier dans `src/content/recettes/`, nommé d'après son URL :

```
src/content/recettes/
  ailes-de-poulet-paprika-fume/
    index.md          ← la recette
    plat-fini.jpg     ← la photo principale
```

Le fichier `index.md` commence par un bloc de données (le frontmatter), suivi du texte libre pour les notes et variantes. Le plus simple est de copier une recette existante et de la modifier.

Les champs sont validés au build : s'il en manque un ou si une valeur est incohérente, le build échoue avec un message explicite et rien n'est mis en ligne. La liste complète des champs est décrite dans `src/content.config.ts`.

Points à retenir :

- `image` pointe vers un fichier du dossier de la recette, en chemin relatif (`./plat-fini.jpg`).
- `imageAlt` est obligatoire, c'est une exigence d'accessibilité.
- `airfryer: true` marque une cuisson à l'airfryer : macaron sur la carte, mention sur la fiche, et comptage sur l'accueil. Une telle recette doit obligatoirement indiquer sa `temperature`, sans quoi le build échoue.
- `temperature` est en degrés Celsius et reste facultative pour les cuissons qui n'en ont pas. Tous les temps sont en minutes.
- `regime` n'accepte qu'une liste fermée de valeurs (`vegetarien`, `vegan`, `sans-gluten`, `sans-lactose`, `sans-porc`, `sans-fruits-a-coque`). Une valeur inconnue fait échouer le build en listant les valeurs acceptées. La liste s'étend dans `src/content.config.ts`.
- `tags` est libre, mais ramené en minuscules pour éviter que la casse ne dédouble les filtres. Un régime ne va **jamais** dans `tags` : il a son champ `regime`. Seule exception, les options de régime (« ce plat peut être rendu végétarien ») : un tag d'une liste fermée, `option-vegetarien`, `option-vegan`, `option-sans-gluten`, `option-sans-lactose`, `option-sans-porc`, `option-sans-fruits-a-coque`. `npm run verifier:tags` signale les dérives et les quasi-doublons, sans jamais bloquer le build.
- `flemme: true` fait entrer la recette dans le tirage « J'ai la flemme ».

### Décrire un ingrédient

Un ingrédient a un `nom`, une `quantite` et une `unite` facultatives (absentes pour « sel, à votre goût »), et deux drapeaux :

- `ajustable: false` pour ce qui ne se multiplie pas avec les portions (sel, levure, épices d'assaisonnement). `true` par défaut.
- `optionnel: true` pour un ingrédient qu'on peut omettre. La liste affiche alors d'elle-même un petit « optionnel » au-dessus du nom : on n'écrit jamais « (optionnel) » à la main. Les ingrédients optionnels se placent en dernier dans leur liste.

Le champ `precision` est la ligne discrète sous le nom. Quand il porte plusieurs informations, elles vont dans cet ordre, séparées par ` ; ` :

1. équivalence de quantité : « environ 36 g », « environ 3 cuillères à soupe » ;
2. remplacement : « remplaçable par… », toujours cette formule, jamais « ou » ;
3. notes libres : « écrasées », « pour la déco », « pour délayer ».

« ou » sert uniquement à lister plusieurs choix également valables pour un même ingrédient (« vermicelles de riz fins ou nouilles plates »).

Un remplacement porte sa quantité dès qu'elle change (« remplaçable par 250 g de protéines de soja texturées »). Pour signaler qu'un remplacement rend la recette compatible avec un régime, on ajoute le suffixe « pour une version <régime> » (« remplaçable par 250 g de protéines de soja texturées pour une version vegan »). Cette mention reste du texte : elle n'ajoute pas le régime au champ `regime`. Au niveau de la recette, l'option se déclare par le tag `option-<régime>` correspondant, et chaque ingrédient qui bloque ce régime doit porter sa mention « pour une version… », sinon l'option n'est pas réelle.

### Illustrer une étape

Une étape peut porter sa propre photo, pour montrer un geste, une texture ou un résultat intermédiaire. C'est facultatif, étape par étape : la plupart n'en ont pas besoin.

```yaml
etapes:
  - texte: "Replier la pâte en trois, comme une lettre."
    image: ./pliage.jpg
    imageAlt: "La pâte repliée en trois sur le plan de travail fariné."
```

Le fichier vit dans le dossier de la recette, à côté de `plat-fini.jpg`, et `image` y renvoie en chemin relatif. `imageAlt` devient obligatoire dès qu'une photo est là : sans lui, le build échoue. La photo est optimisée et redimensionnée automatiquement, et elle rejoint le balisage schema.org de l'étape.

### Une recette en plusieurs préparations

Un plat qui demande plusieurs préparations distinctes (le plat, une sauce, un pain) remplace `ingredients` et `etapes` par `parties`. Chaque partie devient une section titrée sur la fiche, avec ses propres ingrédients et ses propres étapes.

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

Une recette utilise soit `ingredients` et `etapes`, soit `parties`, jamais les deux. Le build refuse les deux autres cas avec un message explicite. Le champ `note` est facultatif et sert aux indications d'enchaînement.
- `brouillon: true` garde la recette hors du site publié.

## Ajouter du matériel de cuisine

La page [`/materiel/`](https://recettes.crofte.fr/materiel/) liste le matériel
de cuisson, les ustensiles et les ingrédients difficiles à trouver. Un élément
est un dossier dans `src/content/materiel/`, nommé d'après son ancre :

```
src/content/materiel/
  airfryer/
    index.md      ← la fiche
    photo.png     ← la photo, carrée
```

Points à retenir :

- Le nom du dossier est l'ancre de l'élément sur la page : `airfryer` devient
  `/materiel/#airfryer`. Une recette y renvoie depuis son corps markdown, et la
  page met la fiche en avant à l'arrivée. Renommer un dossier casse ces liens.
- `rubrique` vaut `cuisson`, `ustensile` ou `ingredient`. La liste s'étend dans
  `src/content.config.ts` et `src/lib/format.ts`.
- La photo doit être carrée. Le build ne peut pas le vérifier, la page recadre
  au centre : une photo qui ne l'est pas se fait rogner.
- `lien` est facultatif et doit être en HTTPS. `lienMarchand` donne le libellé
  (« Voir sur Amazon ») et `lienAffilie: true` affiche la mention de
  transparence sur la page ainsi qu'un marqueur sur le lien.
- `ordre` trie à l'intérieur de la rubrique, du plus petit au plus grand.
- `brouillon: true` garde l'élément hors du site publié.

Le détail de la page et ses tests de validation sont dans
[`docs/PAGE-MATERIEL.md`](docs/PAGE-MATERIEL.md).

## Éditer depuis une interface (/admin)

Le site expose une interface d'édition sur [recettes.crofte.fr/admin/](https://recettes.crofte.fr/admin/), propulsée par [Sveltia CMS](https://sveltiacms.app/). Elle écrit des fichiers `.md` dans ce dépôt : le markdown reste la source de vérité, l'interface n'est qu'un confort.

### Se connecter, une fois

La connexion se fait par jeton personnel GitHub. Aucun service d'authentification à déployer, aucun compte tiers.

1. Sur GitHub : **Settings** → **Developer settings** → **Personal access tokens** → **Fine-grained tokens** → **Generate new token**.
2. **Repository access** : *Only select repositories*, puis ce dépôt uniquement.
3. **Permissions** → *Repository permissions* → **Contents** : *Read and write*. C'est la seule permission nécessaire.
4. Choisir une expiration (90 jours est un bon compromis) et générer le jeton.
5. Ouvrir `/admin/`, cliquer **Se connecter avec un jeton d'accès**, coller le jeton.

Le jeton est conservé dans le stockage local du navigateur, sur cet appareil seulement. Il faudra le refaire à l'expiration, et sur chaque appareil.

**En cas de perte de l'appareil**, révoquez le jeton depuis GitHub : sa portée se limite à ce dépôt, mais elle inclut l'écriture.

### Modifier la configuration de l'interface

Elle vit dans `public/admin/config.yml` et doit rester le miroir de `src/content.config.ts`. Après toute modification :

```bash
npm run cms:verifier
```

Le script valide le fichier contre le schéma officiel de Sveltia et signale les widgets inconnus. Sans lui, une clé mal orthographiée ne se découvre qu'en ouvrant `/admin`.

En cas de divergence entre les deux fichiers, c'est le schéma Astro qui tranche : il fait échouer le build, là où le CMS se contenterait d'écrire un fichier invalide.

### Mettre à jour Sveltia

La version est épinglée et vérifiée par empreinte SRI dans `public/admin/index.html`, parce que ce script détient un jeton ayant droit d'écriture sur le dépôt.

```bash
npm run cms:maj            # dernière version publiée
npm run cms:maj -- 0.192.0 # une version précise
```

Le script réécrit l'URL et recalcule l'empreinte. Relancez `npm run cms:verifier` ensuite, le schéma pouvant avoir évolué.

## Déploiement

Le workflow `.github/workflows/deploy.yml` construit et publie sur GitHub Pages à chaque push sur `main`. Le domaine personnalisé est déclaré dans `public/CNAME`.

## Pages de contenu

Deux pages éditoriales complètent les recettes :

- `/materiel/` : le matériel de cuisine, alimenté par la collection `materiel`
  (voir plus haut).
- `/conditions-d-utilisation/` : conditions d'utilisation, mentions légales et
  politique de données, en une seule page. Elle est écrite en dur dans
  `src/pages/conditions-d-utilisation.astro`, et les données d'identité
  (éditeur, hébergeur, seuil de reversement, adresse de contact) viennent de
  `src/lib/site.ts`.

Le site parle au pluriel : il est tenu par Stéphanie et Geoffrey. Les nouvelles
pages suivent cette voix, « nous » et « on », jamais « je ».

## Documentation

Le plan de projet, les phases et les tests de validation sont dans [`docs/PLAN-PROJET.md`](docs/PLAN-PROJET.md).
