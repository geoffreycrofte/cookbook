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
- `regime` : liste fermée (`vegetarien` `vegan` `pescatarien` `sans-gluten`
  `sans-lactose` `sans-porc` `sans-fruits-a-coque`). Ne le poser que si la
  recette **entière** le respecte, ingrédients de remplacement compris (voir §5).
  Sens : `vegan` = aucun produit animal ; `vegetarien` = ni viande ni poisson,
  **œufs et laitages autorisés** ; `pescatarien` = pas de viande, poisson
  autorisé. L'accueil dérive un bouton « Sans viande » de
  `vegan ∪ vegetarien ∪ pescatarien` : ne pas chercher à le poser à la main.
- `tags` : libres, ramenés en minuscules. **Jamais de régime dans les tags**
  (ni `vegetarien`, ni `sans gluten`… : c'est le champ `regime`). `poisson`
  reste une étiquette normale, sans rapport avec `pescatarien`. Seule
  exception régime : les options, tag d'une liste fermée
  `option-vegetarien` `option-vegan` `option-pescatarien` `option-sans-gluten`
  `option-sans-lactose` `option-sans-porc` `option-sans-fruits-a-coque` (voir §5).
  `npm run verifier:tags` signale toute dérive et les quasi-doublons ; il
  n'échoue jamais, c'est un garde-fou à lire.
- `flemme: true` seulement sur demande explicite.
- `brouillon: true` garde la recette hors build.
- `miseAJour` : date du jour au format `AAAA-MM-JJ`.

## 3. Structure : simple ou en parties

- Recette simple : `ingredients` + `etapes` au premier niveau.
- Recette à préparations multiples : `parties` (minimum 2), chacune avec `nom`,
  `ingredients`, `etapes`, et `note` facultative (enchaînement : « à préparer
  en premier », « pendant la cuisson… »).
- **Jamais** `ingredients`/`etapes` **et** `parties` ensemble.

### Réutiliser une recette comme partie

Une préparation qui tient toute seule (un saumon, une soupe, une sauce)
s'écrit comme recette autonome, puis se réutilise dans un plat composé :

```yaml
parties:
  - inclut: saumon-au-miso   # slug d'une autre recette
    portions: 4              # facultatif (défaut : portions du plat)
  - nom: "Le montage"        # partie écrite, non réutilisée
    ingredients: [...]
    etapes: [...]
```

- Une partie est **soit** écrite (`nom` + `ingredients` + `etapes`), **soit**
  une inclusion (`inclut`), jamais les deux ni aucune.
- **Une recette destinée à être incluse reste simple** : `ingredients` +
  `etapes` au premier niveau, jamais de `parties`. Une partie incluse n'a pas
  de `nom` : le titre affiché est celui de la recette incluse.
- **Pas d'inclusion d'inclusion** : la recette incluse ne doit pas elle-même
  contenir de partie `inclut`.
- Quantités mises à l'échelle au build : `portions visées / portions de la
  recette incluse`, sans toucher aux ingrédients `ajustable: false`. Donner aux
  recettes destinées à l'inclusion des `portions` qui divisent proprement
  (2 ou 4).
- Ne pas dupliquer une préparation entre deux recettes : si elle sert deux
  fois, elle devient une recette autonome incluse des deux côtés.
- `regime` et `tags` du plat composé restent saisis à la main, cohérents avec
  ce que les recettes incluses apportent (viande, gluten, lactose…).

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
- Un remplacement porte **sa quantité** dès qu'elle diffère :
  « remplaçable par 250 g de protéines de soja texturées ».
- **Option de régime** portée par le remplacement : suffixe
  « pour une version <régime> », avec le nom exact d'un régime
  (`vegan`, `végétarien`, `sans gluten`, `sans lactose`…) :
  « remplaçable par 250 g de protéines de soja texturées pour une version vegan ».
  Cette mention n'ajoute **pas** le régime au champ `regime` de la recette
  (le plat reste décrit tel qu'écrit).
- « ou » ne sert **jamais** à introduire un remplacement. Uniquement pour
  lister plusieurs choix également valables (« vermicelles de riz fins ou
  nouilles plates »).
- Une équivalence dans une autre unité du **même** ingrédient s'écrit aussi
  « environ… » (« environ 3 cuillères à soupe »), pas « soit » ni « ou ».

## 5. Cohérence des régimes

Tout régime déclaré dans `regime` doit être tenu par **l'ensemble** des
ingrédients, y compris ceux proposés en remplacement dans `precision` ou dans
« Variantes ». Un ingrédient de substitution qui casserait le régime n'est pas
un substitut valable ici.

- `sans-gluten` :
  - sauce soja → « sauce soja sans gluten » (sans parenthèses) ;
  - sauce d'huître, sauce hoisin, pâte de curry, gochujang, miso… → préciser
    « sans gluten » dans le `nom`, ou proposer le substitut en `precision`
    (« remplaçable par de la sauce soja sans gluten ») ;
  - pâtes : soba de blé → nouilles de riz ou soba 100 % sarrasin ;
  - céréales de panure (corn flakes…) : « sans gluten », toutes les marques ne
    le sont pas.
- `sans-lactose` : beurre → matière grasse végétale ou beurre sans lactose ;
  crème → crème végétale ; fromage blanc / skyr → alternative végétale ou sans
  lactose. Le substitut cité en `precision` doit lui aussi être sans lactose.
- `vegetarien` : aucune chair animale (viande **et** poisson). Œufs et
  laitages autorisés. Un substitut en `precision` ne réintroduit ni viande ni
  poisson.
- `vegan` : en plus, ni œuf ni produit laitier ni miel.
- `pescatarien` : pas de viande ni volaille ; poisson et fruits de mer
  autorisés. Un substitut ne réintroduit pas de viande.
- Répercuter systématiquement dans le texte des étapes et la section
  « Variantes ».

**Option de régime** (le plat n'est pas de ce régime, mais peut l'être) :

- signal au niveau recette : le tag `option-<régime>` de la liste fermée (§2).
  Rien dans `regime`.
- « comment » au niveau ingrédient : chaque ingrédient qui bloque le régime visé
  porte « remplaçable par … pour une version <régime> » dans sa `precision`
  (§4). Sans ces mentions, l'option n'est pas réelle : ne pas poser le tag.
- `verifier:tags` prévient si le tag est là sans aucune mention
  « pour une version … » dans les ingrédients.

## 6. Copie française

- **Étapes rédigées à l'infinitif impersonnel** : « couper », « mélanger »,
  « cuire ». Jamais la 2e personne (« mettez », « vous pouvez », « selon que
  vous vouliez »). Les notes et le corps markdown suivent le même ton neutre.
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
