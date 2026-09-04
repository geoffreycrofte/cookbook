import type { CollectionEntry } from 'astro:content';
import { dureeTotale } from './format';
import type { SectionResolue } from './inclusions';

/**
 * Index de recherche, construit au build et sérialisé dans la page d'accueil.
 *
 * Il reste inséré dans le HTML plutôt que servi à part : à cette échelle il pèse
 * moins qu'une requête supplémentaire, et il sera disponible hors ligne sans
 * effort particulier quand la PWA arrivera.
 */
export interface EntreeIndex {
  slug: string;
  titre: string;
  description: string;
  /**
   * Champs normalisés (sans accents, en minuscules) sur lesquels on cherche.
   * Ingrédients et étiquettes restent des listes : Fuse note chaque élément
   * séparément, là où une longue chaîne concaténée produit des faux positifs.
   */
  motsTitre: string;
  motsIngredients: string[];
  motsTags: string[];
  categorie: string;
  tags: string[];
  regime: string[];
  /**
   * Facette calculée : vrai si la recette est sans viande, quelle qu'en soit
   * la raison (`vegan`, `vegetarien` ou `pescatarien`). Sert le bouton
   * parapluie « Sans viande » de l'accueil ; ce n'est pas une valeur de
   * `regime`.
   */
  sansViande: boolean;
  airfryer: boolean;
  flemme: boolean;
  duree: number;
}

/** Régimes qui impliquent l'absence de viande. */
export const REGIMES_SANS_VIANDE = ['vegan', 'vegetarien', 'pescatarien'];

/**
 * Retire les accents et passe en minuscules, pour qu'une recherche de
 * « creme » trouve « crème » et inversement.
 */
export function normaliser(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function construireIndex(
  recettes: CollectionEntry<'recettes'>[],
  /**
   * Sections résolues par slug (parties incluses tirées). Sans cette carte, une
   * recherche par ingrédient raterait ce qui n'existe que dans une partie
   * incluse. La page d'accueil la construit, le reste peut s'en passer.
   */
  sectionsParSlug?: Map<string, SectionResolue[]>
): EntreeIndex[] {
  return recettes.map((recette) => {
    const d = recette.data;
    const sections = sectionsParSlug?.get(recette.id) ?? d.sections;
    const sansViande = d.regime.some((r) => REGIMES_SANS_VIANDE.includes(r));

    return {
      slug: recette.id,
      titre: d.titre,
      description: d.description,
      motsTitre: normaliser(`${d.titre} ${d.description}`),
      // Les ingrédients de toutes les sections sont agrégés : chercher un
      // ingrédient qui n'existe que dans la sauce doit remonter le plat entier.
      motsIngredients: sections.flatMap((s) => s.ingredients.map((i) => normaliser(i.nom))),
      // « sans viande » rejoint les mots cherchables quand la recette qualifie.
      motsTags: [...d.tags, ...d.regime, d.categorie, ...(sansViande ? ['sans viande'] : [])].map(
        normaliser
      ),
      categorie: d.categorie,
      tags: d.tags,
      regime: d.regime,
      sansViande,
      airfryer: d.airfryer,
      flemme: d.flemme,
      duree: dureeTotale(d),
    };
  });
}

/** Recense les valeurs distinctes d'une facette, triées pour un affichage stable. */
export function recenser(
  recettes: CollectionEntry<'recettes'>[],
  champ: 'tags' | 'regime'
): string[] {
  const valeurs = new Set<string>();
  for (const recette of recettes) {
    for (const valeur of recette.data[champ]) valeurs.add(valeur);
  }
  return [...valeurs].sort((a, b) => a.localeCompare(b, 'fr'));
}

export function recenserCategories(recettes: CollectionEntry<'recettes'>[]): string[] {
  const valeurs = new Set<string>();
  for (const recette of recettes) valeurs.add(recette.data.categorie);
  return [...valeurs];
}
