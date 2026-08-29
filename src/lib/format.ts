import { typographieFr, accorderUnite } from './typographie';

/** Formate une durée en minutes vers un libellé lisible : 75 → "1 h 15". */
export function formaterDuree(minutes: number): string {
  if (minutes <= 0) return '0 min';
  if (minutes < 60) return `${minutes} min`;

  const heures = Math.floor(minutes / 60);
  const reste = minutes % 60;
  return reste === 0 ? `${heures} h` : `${heures} h ${String(reste).padStart(2, '0')}`;
}

/** Durée totale d'une recette, repos compris. */
export function dureeTotale(recette: {
  preparation: number;
  cuisson: number;
  repos: number;
}): number {
  return recette.preparation + recette.cuisson + recette.repos;
}

interface Ingredient {
  quantite?: number;
  unite?: string;
  nom: string;
  precision?: string;
}

/**
 * Sépare l'ingrédient en trois blocs, pour l'affichage en liste de menu :
 * le nom à gauche, la mesure à droite, reliés par des points de conduite,
 * et la précision sur une ligne discrète en dessous.
 * La mesure est vide pour les ingrédients non mesurés ("sel et poivre").
 */
export function decomposerIngredient(ingredient: Ingredient): {
  nom: string;
  mesure: string;
  precision: string;
} {
  const quantite = ingredient.quantite;
  const unite =
    ingredient.unite && quantite !== undefined
      ? accorderUnite(ingredient.unite, quantite)
      : (ingredient.unite ?? '');

  const mesure = [quantite !== undefined ? formaterQuantite(quantite) : '', unite]
    .filter(Boolean)
    .join(' ');

  return {
    nom: typographieFr(ingredient.nom),
    mesure,
    precision: ingredient.precision ? typographieFr(ingredient.precision) : '',
  };
}

/** Compose l'ingrédient sur une seule ligne : "2 cuillères à soupe d'huile d'olive". */
export function formaterIngredient(ingredient: Ingredient): string {
  const { nom, mesure, precision } = decomposerIngredient(ingredient);
  const base = mesure ? `${mesure} ${nom}` : nom;
  return precision ? `${base}, ${precision}` : base;
}

/**
 * Arrondit une quantité au quart le plus proche et l'écrit avec une virgule
 * décimale, comme il se doit en français. 0.75 → "0,75", 2 → "2".
 */
export function formaterQuantite(valeur: number): string {
  const arrondi = Math.round(valeur * 4) / 4;
  return arrondi.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
}

const LIBELLES_CATEGORIE: Record<string, string> = {
  entree: 'Entrée',
  plat: 'Plat',
  dessert: 'Dessert',
  snack: 'Snack',
  accompagnement: 'Accompagnement',
};

export function libelleCategorie(categorie: string): string {
  return LIBELLES_CATEGORIE[categorie] ?? categorie;
}

const LIBELLES_REGIME: Record<string, string> = {
  vegetarien: 'Végétarien',
  vegan: 'Vegan',
  'sans-gluten': 'Sans gluten',
  'sans-lactose': 'Sans lactose',
  'sans-porc': 'Sans porc',
  'sans-fruits-a-coque': 'Sans fruits à coque',
};

export function libelleRegime(regime: string): string {
  return LIBELLES_REGIME[regime] ?? regime;
}

/**
 * Rubriques de la page matériel. L'ordre du tableau est celui de la page :
 * on cuit d'abord, on manipule ensuite, on assaisonne à la fin.
 */
export const RUBRIQUES_MATERIEL = [
  {
    valeur: 'cuisson',
    libelle: 'Matériel de cuisson',
    resume: 'Ce qui chauffe, cuit et dore.',
  },
  {
    valeur: 'ustensile',
    libelle: 'Ustensiles',
    resume: 'Ce qui coupe, mesure et mélange.',
  },
  {
    valeur: 'ingredient',
    libelle: 'Ingrédients peu communs',
    resume: 'Ceux qui reviennent souvent et qui ne sont pas au coin de la rue pour tout le monde.',
  },
] as const;

export function libelleRubrique(rubrique: string): string {
  return RUBRIQUES_MATERIEL.find((r) => r.valeur === rubrique)?.libelle ?? rubrique;
}
