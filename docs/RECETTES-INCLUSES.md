# Recettes incluses (parties réutilisables)

Branche : `rework-recette-includes`.

## But

Écrire une préparation une seule fois — un saumon, une soupe, une sauce — comme
recette autonome avec sa propre URL, puis la réutiliser comme partie d'un plat
composé sans la réécrire.

- **Recette autonome** : pas d'inclusion. `ingredients` + `etapes`, ou
  `parties` écrites. URL `recettes/<slug>`. Trouvable seule.
- **Plat composé** : une recette avec `parties`, dont certaines sont écrites à
  la main et d'autres sont `inclut: <slug>` vers une recette autonome. Même
  forme d'URL.

## Modèle retenu

- Une seule collection `recettes`. Pas de collection séparée.
- Le schéma `partie` accepte deux formes, jamais les deux :
  - écrite : `nom` + `ingredients` + `etapes` ;
  - incluse : `inclut` (référence `recettes`), `portions` optionnel pour la
    mise à l'échelle. **Pas de `nom`** : le titre affiché est celui de la
    recette incluse. Convention : une recette destinée à être incluse reste
    **simple** (`ingredients` + `etapes`, jamais de `parties`) — c'est ce qui
    garde le titre de la partie strictement égal au titre de la recette.
- **Pas d'inclusion d'inclusion** : une recette incluse ne peut pas elle-même
  contenir une partie `inclut`. Le build échoue avec un message clair.
- La référence n'est pas résolue dans le `.transform()` du schéma (synchrone).
  `src/lib/inclusions.ts` → `resoudreSections(recette)` la suit au build.
  Trois consommateurs l'utilisent : la fiche, l'index de recherche, le
  balisage schema.org.

## Mise à l'échelle

`facteur = portions_visées / portions_de_la_recette_incluse`, où
`portions_visées = partie.portions ?? plat.portions`.

- Multiplie `quantite` de chaque ingrédient, **sauf** `ajustable: false` et les
  ingrédients sans quantité.
- Pas d'arrondi au moment du calcul : l'affichage arrondit déjà au quart
  (`formaterQuantite`), et le curseur de portions s'applique par-dessus.
- Règle d'écriture : donner aux recettes destinées à être incluses des
  `portions` qui divisent proprement (2 ou 4), pour éviter les `1,33 cuillère`.

## Affichage

- Sous le bandeau des chiffres : `Ce plat assemble : [Recette A], [Recette B].`
  Liens vers les fiches. Dédoublonné par slug.
- Dans l'en-tête de chaque partie incluse : lien « Voir la recette complète »
  avec une petite icône, juste sous le titre de la partie, avant la note. Le
  titre de la fiche est repris dans un texte lecteur d'écran
  (« Voir la recette complète : <titre> »).
- Le titre de la partie incluse est celui de la recette incluse (elle reste
  simple, sans blocs).
- Sur la fiche d'une recette autonome, en bas (avant le colophon) : **« Utilisée
  dans »**, la liste des plats qui l'incluent (recherche inverse sur
  `sections[].inclut`, `recettesQuiIncluent()` dans `inclusions.ts`). Rien ne
  s'affiche si la recette n'est incluse nulle part.

## Impact CMS (`public/admin/config.yml`)

- `parties` : `nom`, `ingredients`, `etapes` passent `required: false`.
- Trois champs ajoutés à chaque partie : `inclut` (widget `relation` vers
  `recettes`, `value_field: {{slug}}`), `portions` (number), rien d'autre.
- Pas de type discriminant : l'auteur remplit soit `inclut`, soit
  `ingredients` + `etapes`. Le `.refine` du schéma tranche au build.
- `npm run cms:verifier` (réseau requis) valide la config contre le schéma
  Sveltia.

## Fichiers touchés

- `src/content.config.ts` : `partie` (union + refine), `.transform()` porte
  `inclut` / `portions` dans `sections`.
- `src/lib/inclusions.ts` : **nouveau**, `resoudreSections()`.
- `src/pages/recettes/[...slug].astro` : rend les sections résolues, bloc
  « Ce plat assemble », lien par partie, CSS.
- `src/lib/seo.ts` : `jsonLdRecette` prend `sections` résolues en paramètre.
- `src/lib/recherche.ts` : `construireIndex` accepte une carte
  `slug → sections résolues`.
- `src/pages/index.astro` : construit cette carte.
- `public/admin/config.yml` : champs `inclut` / `portions`.

## Exemple livré

`soupe-nouilles-froides-saumon-marine` scindé :

- `saumon-au-miso/` : recette autonome, simple (marinade + airfryer).
- `soupe-nouilles-froides/` : recette autonome, simple (soupe + nouilles
  fondues en une seule liste d'ingrédients et un seul enchaînement d'étapes).
  Vegan, sans gluten.
- `soupe-nouilles-froides-saumon-marine/` : plat composé =
  `inclut: saumon-au-miso` + `inclut: soupe-nouilles-froides` + une partie
  « Le montage » écrite (concombre, edamames, beni shoga, furikake, poser le
  saumon).

Toutes en portions 2 → facteur 1, la mise à l'échelle n'est pas éprouvée par
cet exemple. À tester avec un plat en portions 4 incluant une recette en
portions 2.

## Tests de validation

1. `npm run build` passe (types, rendu, `verifier`, `verifier:tags`).
2. `/recettes/saumon-au-miso/` et `/recettes/soupe-nouilles-froides/` existent
   et se tiennent seules.
3. `/recettes/soupe-nouilles-froides-saumon-marine/` :
   - affiche « Ce plat assemble : Saumon au miso…, Soupe de nouilles froides ».
   - quatre parties : le saumon, la soupe, les nouilles, le montage.
   - chaque partie incluse a un lien « Recette complète : … » qui ouvre la fiche.
   - les ingrédients du saumon, de la soupe et des nouilles sont tous là.
4. Recherche « tofu » ou « edamames » sur l'accueil : le plat composé remonte
   (ingrédients tirés de la partie incluse).
5. `/recettes/soupe-nouilles-froides/` apparaît sous les filtres « Sans
   viande », « Végétarien », « Végan », « Sans gluten ».
6. Créer une recette qui `inclut` un plat composé : `npm run build` échoue avec
   « L'inclusion d'inclusion n'est pas permise ».
7. `/admin` : dans une partie, le champ « Recette incluse » propose les
   recettes existantes ; laisser vide permet d'écrire la partie normalement.
8. Voir le JSON-LD de la page du plat : `recipeIngredient` et
   `recipeInstructions` contiennent le contenu des recettes incluses.

## Reste à faire (hors exemple)

- Éprouver la mise à l'échelle avec des portions différentes.
- Décider si un plat composé peut aussi avoir `regime` / `tags` cohérents
  dérivés de ses inclusions, ou si ça reste manuel (pour l'instant : manuel).
- Nettoyer les images : `saumon-au-miso` et `soupe-nouilles-froides` utilisent
  une photo d'étape en visuel principal, faute de photo de plat dédiée.
