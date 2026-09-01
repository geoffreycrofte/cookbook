# Régime « pescatarien » et filtre parapluie « Sans viande »

## But

1. Pouvoir dire qu'une recette est **sans viande mais avec poisson**, sans la
   faire passer pour végétarienne ou vegan.
2. Offrir sur l'accueil, sous « Régimes », un bouton **« Sans viande »** qui
   rassemble en une case tous les plats sans viande : `vegan` + `vegetarien`
   + `pescatarien`.
3. Garder `poisson` comme simple étiquette (`tags`) pour la découverte, sans
   rapport avec le filtre régime.

## Modèle retenu

- Nouvelle valeur `pescatarien` dans l'enum `REGIMES` (`src/content.config.ts`).
  Sens : ni viande ni volaille, poisson et fruits de mer autorisés.
- Rappel des trois niveaux :
  - `vegan` : aucun produit animal.
  - `vegetarien` : ni viande ni poisson, **œufs et laitages autorisés**.
  - `pescatarien` : pas de viande, poisson autorisé.
  - viande présente : rien.
- Le champ `regime` reste précis et multi-valeurs
  (`["sans-gluten", "pescatarien"]`…).
- « Sans viande » n'est **pas** une valeur stockée : c'est une facette calculée,
  vraie si `regime` croise `{vegan, vegetarien, pescatarien}`.

## Décision d'affichage — retenue : option C

Boutons du groupe « Régimes » sur l'accueil, dans cet ordre, chacun affiché
seulement si au moins une recette le remplit :

1. **Sans viande** — valeur synthétique `sans-viande`, parapluie
   `vegan` + `vegetarien` + `pescatarien`.
2. **Végétarien** — valeur `vegetarien` seule (poisson exclu).
3. **Végan** — valeur `vegan` seule.
4. **Sans gluten**, **Sans lactose**, **Sans porc**, **Sans fruits à coque**.

`pescatarien` n'a **pas** de bouton propre : il n'alimente que « Sans viande ».
Le groupe « Régimes » n'est donc plus la liste brute des valeurs présentes mais
une liste ordonnée et filtrée.

## Phases

### Phase 1 — donnée ✅
- [x] `pescatarien` ajouté à `REGIMES` dans `src/content.config.ts`.
- [x] Miroir dans `public/admin/config.yml` (option `{ label: "Poisson, sans
      viande", value: pescatarien }`). Au passage `Vegan` → `Végan`.
- [x] `pescatarien` ajouté à la liste `REGIMES` de `scripts/verifier-tags.mjs`
      (active aussi `option-pescatarien`).
- [x] `LIBELLES_REGIME` dans `src/lib/format.ts` : `pescatarien` → « Poisson,
      sans viande », `sans-viande` → « Sans viande », `vegan` → « Végan ».

### Phase 2 — index et recherche ✅
- [x] `EntreeIndex` gagne `sansViande: boolean` ; constante exportée
      `REGIMES_SANS_VIANDE`.
- [x] `construireIndex` le calcule (`regime` ∩ `{vegan, vegetarien,
      pescatarien}`), et ajoute « sans viande » à `motsTags` quand vrai.

### Phase 3 — filtres accueil ✅
- [x] `RechercheRecettes.astro` : le groupe « Régimes » suit `ORDRE_REGIMES`,
      chaque bouton affiché seulement s'il concerne une recette. `sans-viande`
      injecté en tête si `index.some((e) => e.sansViande)`. `pescatarien` sans
      bouton.
- [x] `correspondAuxFiltres` : `sans-viande` teste `entree.sansViande` ; les
      autres valeurs testent `entree.regime.includes(...)`.
- [x] Rendu sans JavaScript inchangé (le bloc `recherche` reste `hidden`).

### Phase 4 — contenu et docs ✅
- [x] `regime: ["sans-gluten", "pescatarien"]` sur la soupe au saumon.
- [x] Skill `ajouter-recette` : valeur `pescatarien`, sens des trois régimes,
      `poisson` reste un tag, mention du parapluie.
- [x] `README.md` et `CLAUDE.md` : même mise à jour + la facette calculée.

Note : la fiche recette n'affiche pas les `regime` (comportement existant,
inchangé). Les régimes ne servent qu'au filtre et à la recherche de l'accueil.

## Tests de validation (à faire par l'utilisatrice)

1. `npm run build` passe (types + rendu + `verifier:tags` sans blocage).
2. `npm run dev`, page d'accueil : sous « Régimes », un bouton « Sans viande ».
3. Cocher « Sans viande » : la soupe au saumon **et** toute recette `vegetarien`
   / `vegan` apparaissent ; les plats avec viande disparaissent.
4. Cocher « Sans viande » + « Sans gluten » : intersection correcte.
5. Taper « sans viande » dans la recherche : mêmes recettes remontent.
6. Cocher « Sans gluten » seul : la soupe au saumon reste dans la liste
   (elle porte les deux régimes).
7. `/admin` : le sélecteur « Régimes » propose « Poisson, sans viande » et
   « Végan ».
8. Ajouter `pescatarien` en tag libre sur une recette : `npm run verifier:tags`
   le signale (« est un régime, à mettre dans regime »).
9. JavaScript désactivé : la liste complète des recettes reste visible, aucun
   filtre cassé.
