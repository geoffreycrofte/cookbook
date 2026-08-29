# Page « Notre matériel de cuisine »

## Objectif

Donner une page unique qui liste le matériel de cuisson, les ustensiles et les
quelques ingrédients difficiles à trouver qui reviennent dans les recettes.
Chaque élément a un nom, une photo carrée, une description et, en option, un
lien vers le produit (souvent affilié).

La page vit à l'adresse **`/materiel/`**. Chaque élément y porte son slug en
`id` : une recette peut donc renvoyer vers `/materiel/#airfryer`, et l'élément
visé est mis en avant par le sélecteur CSS `:target`.

Le contenu passe par le même CMS que les recettes : nouvelle collection
`materiel`, éditable depuis `/admin/`.

## Phases

### 1. Schéma de contenu — fait

- Collection `materiel` dans `src/content.config.ts`, sur le même modèle que les
  recettes : un dossier par élément, `index.md` et la photo à côté.
- Champs : `nom`, `description`, `image`, `imageAlt`, `rubrique`, `lien`,
  `lienMarchand`, `lienAffilie`, `ordre`, `miseAJour`, `brouillon`, plus le
  corps markdown facultatif.
- Deux contrôles refusent les états incohérents au build : un marchand sans
  lien, et un lien affilié sans lien.
- La forme carrée de la photo n'est **pas** vérifiée par le schéma : le
  chargeur de contenu ne résout les dimensions qu'au rendu de la page. La page
  recadre au centre en 1/1, et l'interface d'édition le rappelle.

### 2. La page — fait

- `src/pages/materiel.astro`, trois rubriques dans un ordre fixe : matériel de
  cuisson, ustensiles, ingrédients difficiles à trouver. Une rubrique vide ne
  s'affiche pas.
- À l'intérieur d'une rubrique, tri par `ordre` croissant, puis par ordre
  alphabétique français à égalité.
- Sommaire en haut, avec titre visible, seulement quand il y a plus d'une
  rubrique.
- Mention de transparence affichée seulement si au moins un lien est affilié,
  et chaque lien affilié porte en plus son propre marqueur visible.
- Les liens sortants portent `rel="nofollow noopener"`, complété par
  `sponsored` quand le lien est affilié.
- Balisage `ItemList` et fil d'Ariane en JSON-LD, réutilisant `jsonLdFilAriane`.

### 3. Mise en avant par l'ancre — fait

`.objet:target` épaissit le cadre, ajoute un liseré latéral et joue une brève
lueur. La mise en avant ne repose pas sur la seule couleur : le liseré et le
cadre restent visibles en monochrome. La lueur est désactivée sous
`prefers-reduced-motion: reduce`.

### 4. Raccordement au reste du site — fait

- Lien dans le pied de page (présent sur toutes les pages) et dans le plan du
  site.
- Entrée dans `sitemap.xml`, avec la date du dernier élément modifié.
- Section dédiée dans `llms.txt`, avec l'ancre de chaque élément.
- `scripts/verifier-rendu.mjs` vérifie après build que la page existe et que
  chaque ancre attendue s'y trouve : une ancre disparue casserait des liens de
  recettes sans erreur visible.

### 5. CMS — fait

Collection `materiel` ajoutée à `public/admin/config.yml`, miroir du schéma
Astro. `npm run cms:verifier` passe.

## Reste à faire

- **Remplacer les trois photos d'exemple.** `src/content/materiel/*/photo.png`
  sont des aplats géométriques générés, pas des photos. Leur `imageAlt`
  commence par « Photo à remplacer ».
- **Remplacer les liens d'exemple**, qui pointent tous vers `example.com`.
- Décider si d'autres éléments rejoignent la page, et dans quel ordre.
- Ajouter, dans les recettes concernées, les liens vers les ancres. Exemple
  dans le corps markdown d'une recette :
  `Cuit à [l'airfryer](/materiel/#airfryer), 200 °C.`

## Ajouter un élément

À la main, un dossier dans `src/content/materiel/` nommé d'après son ancre :

```
src/content/materiel/
  airfryer/
    index.md
    photo.png
```

Depuis `/admin/`, la collection « Matériel de cuisine » fait la même chose. Le
nom donne le slug, donc l'ancre : le renommer casse les liens des recettes qui
y renvoient déjà.

## Tests de validation

À faire tourner avant de fusionner la branche.

1. `npm run build` se termine sans erreur, et la vérification finale annonce
   « 3 élément(s) de matériel publié(s) avec leur ancre ».
2. `npm run cms:verifier` annonce « Configuration valide : 2 collection(s) ».
3. `npm run preview`, puis :
   - `/materiel/` s'affiche avec ses trois rubriques et ses trois éléments ;
   - le sommaire mène bien à chaque rubrique ;
   - `/materiel/#airfryer` ouvre la page **et** met la fiche de l'airfryer en
     avant : cadre orangé, liseré à gauche, brève lueur ;
   - `/materiel/#paprika-fume` et `/materiel/#thermometre-sonde` font de même ;
   - le lien « Notre matériel de cuisine » est présent dans le pied de page de
     l'accueil, d'une recette et du plan du site ;
   - `/sitemap.xml` contient `/materiel/` ;
   - `/llms.txt` contient la section « Matériel de cuisine » avec les ancres.
4. Au clavier seul : depuis le haut de la page, la tabulation atteint le
   sommaire, puis chaque lien produit, avec un contour de focus visible.
5. Avec un lecteur d'écran, le lien d'un produit s'annonce en entier :
   « Voir sur Amazon : Airfryer 6 litres à double panier ».
6. Système en mouvement réduit : ouvrir `/materiel/#airfryer`, la lueur ne se
   joue pas, mais le cadre et le liseré restent.
7. Thème sombre puis clair : la mise en avant reste lisible dans les deux.
8. Sur mobile (largeur ~360 px) : la photo et le texte s'empilent proprement,
   rien ne déborde horizontalement.
9. Dans `/admin/`, la collection « Matériel de cuisine » s'ouvre, permet de
   créer un élément, et enregistrer écrit bien
   `src/content/materiel/<slug>/index.md`.

---

# Suite de session : voix au pluriel et conditions d'utilisation

## Objectif

Deux demandes ajoutées après la page matériel :

1. Le site est tenu par Stéphanie et Geoffrey, pas par une seule personne. Tous
   les textes passent donc du singulier au pluriel.
2. Une page « Conditions d'utilisation » rassemble ce qu'on peut faire des
   recettes, le fonctionnement des liens affiliés, les mentions légales et la
   politique de données.

## Phase 6 : voix au pluriel — fait

Textes visibles repris dans `src/layouts/Base.astro` (accroche d'en-tête et
signature du pied de page), `src/pages/index.astro` (titre, chapeau et
description), `src/pages/materiel.astro`, `src/pages/recettes/[...slug].astro`
(« Nos notes »), `src/pages/rss.xml.ts`, `src/pages/llms.txt.ts`,
`public/manifest.webmanifest`, les hints du CMS et le corps des fiches de
contenu existantes.

Deux exceptions assumées :

- Le bouton « J'ai la flemme » reste au singulier : c'est la personne qui visite
  qui parle, pas nous.
- `docs/PLAN-PROJET.md` n'est pas retouché : c'est un journal de conception, pas
  un texte publié.

Le balisage schema.org des recettes crédite désormais deux personnes
(`author` devient un tableau de `Person`), via `AUTEURS` dans le nouveau
`src/lib/site.ts`.

## Phase 7 : page « Conditions d'utilisation » — fait

`src/pages/conditions-d-utilisation.astro`, à l'adresse
`/conditions-d-utilisation/`, avec sommaire et neuf sections ancrées :

- pourquoi le site existe (partager nos recettes avec nos amis et notre
  famille) ;
- d'où viennent les recettes (des mélanges de recettes trouvées sur internet,
  recuisinées et réécrites) ;
- réutilisation : textes de recettes libres de droits à condition de citer le
  site, dans l'esprit de CC BY 4.0. Les photographies en sont exclues, certaines
  venant de banques d'images sous leur propre licence ;
- liens affiliés : signalés un par un, aucun partenariat avec les marques, et
  gains versés dans un pot commun reversé à une association dès 200 € ;
- ce que nous ne garantissons pas (cuisine, allergènes, liens sortants) ;
- éditeur : Crofte Studio, immatriculation B310079, Luxembourg ;
- hébergement : OVH SAS, 2 rue Kellermann, 59100 Roubaix, France ;
- données personnelles : aucun cookie de traçage, aucune donnée traitée. Sont
  mentionnés, par honnêteté, le stockage local du choix de thème et le cache du
  service worker, qui ne quittent jamais l'appareil ;
- évolution des conditions, avec date de mise à jour.

Les données d'identité vivent dans `src/lib/site.ts` : éditeur, hébergeur,
auteurs, seuil de don, contact. La page est raccordée au pied de page, au plan
du site, au `sitemap.xml` et à `llms.txt`.

## Reste à faire

- **Renseigner `CONTACT` dans `src/lib/site.ts`.** Il est vide, donc la section
  « Nous écrire » ne s'affiche pas. Une page de conditions sans moyen de nous
  joindre reste incomplète, notamment pour une réclamation de droits.
- Vérifier la date de mise à jour (`MISE_A_JOUR` dans la page) au moment de la
  mise en ligne.
- Confirmer que « Crofte Studio (B310079) » est bien la mention exacte à
  publier, et compléter l'adresse du siège si elle doit y figurer.

## Tests de validation

1. `npm run build` passe, `npm run cms:verifier` aussi.
2. `/conditions-d-utilisation/` s'affiche, le sommaire mène à chacune des neuf
   sections, et chaque ancre positionne bien le titre visé.
3. Le lien « Conditions d'utilisation » est présent dans le pied de page de
   toutes les pages, et dans le plan du site.
4. `/sitemap.xml` contient `/conditions-d-utilisation/`, `/llms.txt` la cite
   dans ses ressources.
5. Aucun « je », « mon », « ma », « mes » ne subsiste dans les textes visibles.
   Contrôle rapide :
   `grep -rniE "\b(je|j.ai|mon|ma|mes|moi)\b" dist/*.html dist/*/index.html`
   ne doit ressortir que « J'ai la flemme ».
6. Lecture au clavier de la page : sommaire puis sections, focus toujours
   visible, aucun débordement horizontal à 360 px de large.
7. Thème clair et thème sombre : le bloc d'exemple de citation et la fiche de
   l'éditeur restent lisibles.

## Phase 8 : pied de page allégé — fait

- « Toutes les recettes » retiré : le nom du site, en haut, mène déjà à
  l'accueil.
- « Flux RSS » devient une icône. Son nom accessible vient d'un texte masqué
  (`.sr-uniquement`), le SVG étant décoratif et retiré de l'arbre
  d'accessibilité. La cible fait 32 px, au delà du minimum de 24 px.
- Le style de l'icône est écrit `.pied__nav .pied__flux` : une classe seule
  serait passée derrière `.pied__nav a`, plus spécifique.

Le plan du site garde, lui, un lien texte vers le flux : la page sert justement
à énumérer les adresses.

À tester : au clavier, le dernier élément du pied de page reçoit un contour de
focus visible et un lecteur d'écran annonce « Flux RSS, lien ».
