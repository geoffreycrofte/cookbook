---
name: ajouter-recette
description: >-
  Transformer une recette donnée en vrac (texte à l'arrache, notes, photo)
  en un dossier src/content/recettes/<slug>/index.md valide et conforme aux
  règles du projet. À utiliser dès que l'utilisateur fournit une recette à
  intégrer, même incomplète.
---

# Ajouter une recette

Objectif : produire `src/content/recettes/<slug>/index.md` qui passe `npx astro check`
du premier coup et respecte **strictement** les règles ci-dessous. Ne jamais
inventer une donnée manquante en silence : lister à la fin les trous à combler.

## 1. Dossier et slug

- Un dossier par recette : `src/content/recettes/<slug>/index.md` + ses photos.
- Le `<slug>` est le nom du dossier et l'URL. En minuscules, sans accents,
  mots séparés par des tirets, dérivé du titre. Ex : « Soupe de nouilles
  froides au saumon mariné » → `soupe-nouilles-froides-saumon-marine`.
- Si on renomme un dossier existant, utiliser `git mv`, déplacer les photos
  avec, et vérifier qu'aucun autre fichier ne référence l'ancien slug
  (`grep -rn "<ancien-slug>" src public docs`).

## 2. Frontmatter (voir `src/content.config.ts`, il fait foi)

- `titre` : phrase complète, typographie française.
- `description` : 1 phrase, 200 caractères max. Dit ce qu'est le plat et son
  intérêt (saison, matériel clé, mode de cuisson).
- `image` : chemin relatif vers une photo du dossier (`./plat-fini.jpg`).
- `imageAlt` : **obligatoire**, description réelle de la photo. Idem pour
  chaque étape illustrée. Si la photo n'est pas encore fournie, mettre un
  `imageAlt` provisoire `"À compléter"` et le signaler à la fin.
- `credit` : facultatif, auteur de la photo.
- `preparation`, `cuisson`, `repos` : entiers, en minutes. `repos` = marinade,
  réfrigération, pousse.
- `portions` : entier.
- `airfryer: true` ⇒ `temperature` (°C) **obligatoire**, sinon le build casse.
  `secouerAMiCuisson: true` seulement si `airfryer: true`.
- `categorie` : `entree` | `plat` | `dessert` | `snack` | `accompagnement`.
- `difficulte` : `facile` | `moyen` | `technique`.
- `saison` : sous-ensemble de `printemps` `ete` `automne` `hiver` (sans accent).
- `regime` : liste fermée (`vegetarien` `vegan` `sans-gluten` `sans-lactose`
  `sans-porc` `sans-fruits-a-coque`). Ne le poser que si la recette **entière**
  le respecte, ingrédients de remplacement compris (voir §5).
- `tags` : libres, ramenés en minuscules.
- `flemme: true` seulement sur demande explicite.
- `brouillon: true` garde la recette hors build.
- `miseAJour` : date du jour au format `AAAA-MM-JJ`.

## 3. Structure : simple ou en parties

- Recette simple : `ingredients` + `etapes` au premier niveau.
- Recette à préparations multiples : `parties` (minimum 2), chacune avec `nom`,
  `ingredients`, `etapes`, et `note` facultative (enchaînement : « à préparer
  en premier », « pendant la cuisson… »).
- **Jamais** `ingredients`/`etapes` **et** `parties` ensemble.

## 4. Ingrédients — règles strictes

Champs : `quantite` (nombre, facultatif), `unite` (string, facultatif, au
singulier — l'accord pluriel est automatique), `nom`, `precision`, `ajustable`,
`optionnel`.

- `quantite`/`unite` absents = ingrédient non mesuré (« sel, à votre goût »).
- `ajustable: false` = ne se multiplie pas avec les portions (sel, levure,
  épices d'assaisonnement, eau de délayage).
- **Optionnel** : `optionnel: true` sur l'ingrédient. La liste affiche
  elle-même un « optionnel » au-dessus du nom.
  - Ne **jamais** écrire « (optionnel) » / « optionel » dans `nom` ou `precision`.
  - Les ingrédients optionnels se placent **en dernier** dans leur liste.
- **`precision`** : la ligne discrète sous le nom. Quand elle porte plusieurs
  informations, ordre imposé, blocs séparés par ` ; ` (espace insécable avant
  le `;`), éléments d'un même bloc séparés par `, ` :
  1. **équivalence de quantité** : « environ 36 g », « environ 3 cuillères à soupe » ;
  2. **remplacement** : « remplaçable par… » — toujours cette formule ;
  3. **notes libres** : « écrasées », « pour la déco », « pour délayer ».
- « ou » ne sert **jamais** à introduire un remplacement. Uniquement pour
  lister plusieurs choix également valables (« vermicelles de riz fins ou
  nouilles plates »).
- Une équivalence dans une autre unité du **même** ingrédient s'écrit aussi
  « environ… » (« environ 3 cuillères à soupe »), pas « soit » ni « ou ».

## 5. Cohérence « sans gluten »

Si la recette est marquée `sans-gluten`, aligner tout le contenu :
- sauce soja → « sauce soja sans gluten » (sans parenthèses) ;
- sauce d'huître, sauce hoisin, pâte de curry, gochujang, miso… → préciser
  « sans gluten » dans le `nom` ou proposer le substitut en `precision`
  (« remplaçable par de la sauce soja sans gluten ») ;
- pâtes : soba de blé → nouilles de riz ou soba 100 % sarrasin ;
- répercuter dans le texte des étapes et la section « Variantes ».

## 6. Copie française

- Espace **insécable** avant `:` `;` `?` `!` (et non une espace simple).
- « je », jamais « nous ».
- Pas de tiret cadratin `—` ni de `--` `–` comme séparateur de phrase.
- Formulations simples.
- Le titre et les chaînes du frontmatter passent par la typographie automatique,
  mais écrire déjà propre.

## 7. Corps markdown

Après le frontmatter : un paragraphe d'introduction, puis `## Astuces` et
`## Variantes` si pertinent. Les remplacements généraux (type de nouilles,
adaptation d'un régime) vont dans « Variantes ».

## 8. Avant de rendre la main

1. `npx astro check` doit renvoyer 0 erreur. Si le schéma vient de changer,
   c'est `astro check` (ou `npm run build`) qui tranche, pas le dev server.
2. Relire la liste d'ingrédients : optionnels en dernier, `precision` dans
   l'ordre, aucun « (optionnel) » textuel.
3. Lister explicitement à l'utilisateur : les champs devinés, les `imageAlt`
   provisoires, les quantités approximées, les photos manquantes.
