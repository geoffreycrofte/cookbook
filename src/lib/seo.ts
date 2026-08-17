import type { CollectionEntry } from 'astro:content';
import { dureeTotale, formaterIngredient, libelleCategorie } from './format';

/**
 * Données structurées schema.org.
 *
 * L'objectif est double : l'éligibilité aux résultats enrichis de Google, et
 * la lisibilité par les moteurs génératifs, qui s'appuient largement sur ce
 * balisage pour citer une recette correctement.
 */

/** Minutes vers une durée ISO 8601 : 75 → "PT1H15M". */
export function dureeIso(minutes: number): string {
  if (minutes <= 0) return 'PT0M';
  const heures = Math.floor(minutes / 60);
  const reste = minutes % 60;
  return `PT${heures > 0 ? `${heures}H` : ''}${reste > 0 ? `${reste}M` : ''}`;
}

/**
 * Régimes reconnus par schema.org. Les valeurs sans équivalent normalisé
 * (sans porc, sans fruits à coque) sont volontairement omises : mieux vaut
 * un balisage incomplet qu'un balisage inventé.
 */
const REGIMES_SCHEMA: Record<string, string> = {
  vegetarien: 'https://schema.org/VegetarianDiet',
  vegan: 'https://schema.org/VeganDiet',
  'sans-gluten': 'https://schema.org/GlutenFreeDiet',
  'sans-lactose': 'https://schema.org/LowLactoseDiet',
};

interface Options {
  recette: CollectionEntry<'recettes'>;
  /** URL absolue de la page. */
  url: string;
  /** URL absolue de l'image principale. */
  image: string;
  auteur: string;
}

export function jsonLdRecette({ recette, url, image, auteur }: Options): Record<string, unknown> {
  const d = recette.data;
  const total = dureeTotale(d);
  const plusieursParties = d.sections.length > 1;

  /**
   * Une recette en plusieurs parties se balise en HowToSection, ce que Google
   * comprend. Une recette simple garde une liste plate de HowToStep.
   */
  const instructions = plusieursParties
    ? d.sections.map((section) => ({
        '@type': 'HowToSection',
        name: section.nom,
        itemListElement: section.etapes.map((etape, i) => ({
          '@type': 'HowToStep',
          position: i + 1,
          text: etape.texte,
        })),
      }))
    : d.sections[0]!.etapes.map((etape, i) => ({
        '@type': 'HowToStep',
        position: i + 1,
        text: etape.texte,
      }));

  const regimes = d.regime.map((r) => REGIMES_SCHEMA[r]).filter((r): r is string => Boolean(r));

  const donnees: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: d.titre,
    description: d.description,
    image: [image],
    author: { '@type': 'Person', name: auteur },
    datePublished: d.miseAJour.toISOString().slice(0, 10),
    dateModified: d.miseAJour.toISOString().slice(0, 10),
    inLanguage: 'fr-FR',
    url,
    prepTime: dureeIso(d.preparation),
    cookTime: dureeIso(d.cuisson),
    totalTime: dureeIso(total),
    recipeYield: `${d.portions} portions`,
    recipeCategory: libelleCategorie(d.categorie),
    // Les ingrédients de toutes les parties, sur une seule liste comme l'attend
    // schema.org, qui ne prévoit pas de sous-préparations côté ingrédients.
    recipeIngredient: d.sections.flatMap((s) => s.ingredients.map(formaterIngredient)),
    recipeInstructions: instructions,
  };

  if (d.tags.length > 0) donnees.keywords = d.tags.join(', ');
  if (regimes.length > 0) donnees.suitableForDiet = regimes;
  if (d.airfryer) donnees.cookingMethod = 'Airfryer';

  return donnees;
}

/** Fil d'Ariane balisé, pour que Google affiche le chemin plutôt que l'URL brute. */
export function jsonLdFilAriane(site: string, titre: string, url: string): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Recettes du Lux', item: site },
      { '@type': 'ListItem', position: 2, name: titre, item: url },
    ],
  };
}
