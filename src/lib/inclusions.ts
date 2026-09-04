import { getEntry, type CollectionEntry } from 'astro:content';

/**
 * Résolution des parties incluses.
 *
 * Une partie de plat peut pointer vers une recette autonome (`inclut`). La
 * référence ne peut pas être suivie dans le `.transform()` du schéma, qui est
 * synchrone : c'est fait ici, au build, avant le rendu. Le résultat a la même
 * forme qu'une section écrite à la main, plus `source` quand elle vient d'une
 * autre fiche.
 */

type Section = CollectionEntry<'recettes'>['data']['sections'][number];
type Ingredient = Section['ingredients'][number];

export interface SectionResolue {
  nom?: string;
  note?: string;
  ingredients: Ingredient[];
  etapes: Section['etapes'];
  /** Présent si la section est tirée d'une autre recette. */
  source?: { slug: string; titre: string };
}

/** Multiplie les quantités ajustables par le facteur de portions. */
function mettreALEchelle(ingredient: Ingredient, facteur: number): Ingredient {
  if (facteur === 1 || ingredient.ajustable === false || ingredient.quantite == null) {
    return ingredient;
  }
  return { ...ingredient, quantite: ingredient.quantite * facteur };
}

/**
 * Recherche inverse : les recettes (non brouillon) qui incluent `id` dans
 * l'une de leurs parties. Sert le bloc « Utilisée dans » sur la fiche d'une
 * recette autonome, rendu avec les mêmes cartes que l'accueil : on renvoie
 * les entrées complètes, pas juste slug/titre.
 */
export function recettesQuiIncluent(
  id: string,
  toutes: CollectionEntry<'recettes'>[]
): CollectionEntry<'recettes'>[] {
  return toutes.filter(
    (r) => r.id !== id && r.data.sections.some((s) => s.inclut?.id === id)
  );
}

export async function resoudreSections(
  recette: CollectionEntry<'recettes'>
): Promise<SectionResolue[]> {
  const resolues: SectionResolue[] = [];

  for (const section of recette.data.sections) {
    if (!section.inclut) {
      resolues.push({
        nom: section.nom,
        note: section.note,
        ingredients: section.ingredients,
        etapes: section.etapes,
      });
      continue;
    }

    const incluse = await getEntry(section.inclut);
    if (!incluse) {
      throw new Error(
        `« ${recette.id} » inclut « ${section.inclut.id} », qui n'existe pas.`
      );
    }
    if (incluse.data.sections.some((s) => s.inclut)) {
      throw new Error(
        `« ${recette.id} » inclut « ${incluse.id} », qui inclut elle-même une autre ` +
          `recette. L'inclusion d'inclusion n'est pas permise.`
      );
    }

    const cible = section.portions ?? recette.data.portions;
    const facteur = cible / incluse.data.portions;
    const source = { slug: incluse.id, titre: incluse.data.titre };
    const blocs = incluse.data.sections;

    blocs.forEach((base, i) => {
      resolues.push({
        // Le titre de la partie est celui de la recette incluse. Si elle a
        // plusieurs blocs, chacun le suffixe de son propre nom.
        nom:
          blocs.length === 1 ? incluse.data.titre : `${incluse.data.titre} — ${base.nom}`,
        note: i === 0 ? section.note : base.note,
        ingredients: base.ingredients.map((ing) => mettreALEchelle(ing, facteur)),
        etapes: base.etapes,
        source,
      });
    });
  }

  return resolues;
}
