# Palettes candidates

Objectif : remplacer la palette actuelle (« Papier & braise », crème + brun +
terracotta) jugée trop générique. Travail mené sur la branche `theme-couleurs`.

Trois palettes retenues pour essai. Les jeux de tokens prêts à coller sont
dans `src/styles/themes/` :

| Palette | Fichier | Identité | Source |
| --- | --- | --- | --- |
| Rumi | `src/styles/themes/rumi.css` | Violet profond + ambre | Figma + matrice |
| Soda Pop | `src/styles/themes/soda-pop.css` | Jaune fluo + magenta fraise | Figma + matrice |
| Tomate & basilic | `src/styles/themes/tomate-basilic.css` | Rouge tomate franc + vert basilic | Composée à la main, ratios calculés |

## Correspondance des tokens

`global.css` expose : `--papier` / `--papier-creux` / `--papier-carte`,
`--encre` / `--encre-doux` / `--regle`, `--braise` / `--braise-texte` /
`--sur-braise`, `--olive`, `--ombre-papier`.

Rôle par token :

- `--braise` : aplats et boutons. Une couleur de fond, pas de texte.
- `--braise-texte` : titres, chiffres de titrage, numéros d'étape, liens.
- `--sur-braise` : texte posé sur `--braise`.
- `--olive` : donnée de cuisson secondaire (température, durée).
- `--encre-doux` : texte atténué (chapô, notes, légendes).

## Contrastes (matrices Figma, AA visé partout)

### Rumi

| usage | clair | sombre |
| --- | --- | --- |
| corps | gray-100 / blanc, 12.97 AAA | blanc / gray-100, 12.97 AAA |
| titres, chiffres, liens | main-100 `#530068`, 13.39 AAA | main-30 `#ed9bf8`, 6.57 AA |
| aplats / boutons | blanc sur main-50 `#a052b7`, 4.78 AA | gray-100 sur main-30, 6.57 AA |
| donnée de cuisson | secondary-100 `#894403`, 7.26 AAA | secondary-30 `#ffc16b`, 8.09 AAA |
| texte atténué | gray-50 `#7d717f`, 4.62 AA | gray-30 `#d6d0d7`, 8.56 AAA |

### Soda Pop

| usage | clair | sombre |
| --- | --- | --- |
| corps | gray-100 `#391e34` / blanc, 14.9 AAA | blanc / gray-100, 14.9 AAA |
| titres, chiffres, liens | secondary-100 `#66004a`, 12.62 AAA | secondary-30 `#ed8cd0`, 6.57 AA |
| aplats / boutons | gray-100 sur main-50 `#fff838`, 13.29 AAA | idem, 13.29 AAA |
| donnée de cuisson | main-100 `#635700`, 7.25 AAA | main-30 `#fefcbf`, 14.1 AAA |
| texte atténué | gray-50 `#797277`, 4.68 AA | gray-30 `#dfdade`, 10.8 AAA |

Règle Soda Pop : le jaune fluo `main-50` ne sert jamais de couleur de texte
(1.18:1 sur blanc), uniquement en aplat.

### Tomate & basilic

Pas de matrice Figma : ratios calculés (WCAG 2.1), à confirmer avec
`npm run contrastes`.

| usage | clair | sombre |
| --- | --- | --- |
| fond de page | `--papier #fffbfc` (blanc à pointe de rose) | `--papier #121210` |
| corps | encre `#1b1b19` / papier, ~16 AAA | encre `#f2f1ec` / carte, ~15 AAA |
| titres, chiffres, liens | rouge `#b8302a`, ~5.5 AA | rouge `#f0897c`, ~7 AA |
| aplats / boutons | blanc sur rouge `#cf3a2e`, ~4.9 AA | `#1a0908` sur rouge `#e75b4c`, ~5.7 AA |
| donnée de cuisson | vert basilic `#3d6b3a`, ~5.7 AA | vert basilic `#6fae6a`, ~6.5 AA |
| texte atténué | gris `#57574f`, ~7 AAA | gris `#a8a89f`, ~7 AAA |

## Valeurs dérivées (hors matrice)

Chaque palette Figma s'arrête à un `gray-100` unique, insuffisant pour un fond
de page + une carte distincts en mode sombre. Valeurs ajoutées à la main :

- Rumi sombre : `--papier #2e262f`, `--papier-creux #271f28`.
- Soda Pop sombre : `--papier #2b1728`, `--papier-creux #241320`.
- Rumi / Soda Pop, mode clair : `--papier-creux` est un gris/rose très pâle
  pour les aplats calmes (emplacements photo).
- Tomate & basilic : toute la palette est composée à la main, aucun ratio
  n'est vérifié par une source externe.

## Pour brancher une palette

1. Reporter les valeurs du fichier `themes/<nom>.css` dans les trois blocs de
   `src/styles/global.css` : `:root`, `@media (prefers-color-scheme: dark)
   :root:not([data-theme='clair'])`, et `:root[data-theme='sombre']`.
2. Reporter la version sombre dans `THEME_SOMBRE` de
   `scripts/verifier-contrastes.mjs`.
3. `npm run contrastes` puis `npm run build`.
4. Mettre à jour `theme-color` dans `src/layouts/Base.astro`.

## Démos

Maquettes de la recette « croustillants de poulet » dans chaque palette
(Artifacts, hors dépôt) :

- Rumi : https://claude.ai/code/artifact/81db6232-75e3-4681-83d9-5a53222ecaf9
- Soda Pop : https://claude.ai/code/artifact/691cc226-f5e5-4d3d-810b-a5feca3f3054
- Tomate & basilic : https://claude.ai/code/artifact/950e8f2c-1626-4fc1-9226-1a67de069477

## Tests à faire par l'utilisateur

- [ ] Ouvrir les deux démos, comparer clair et sombre.
- [ ] Choisir une palette (ou demander d'autres pistes).
- [ ] Une fois branchée : `npm run contrastes` passe sans erreur.
- [ ] `npm run build` passe.
- [ ] Vérifier à l'œil les pages accueil, recette, plan du site en clair et
      sombre, et la bascule de thème de l'en-tête.
