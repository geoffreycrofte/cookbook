/**
 * Les données d'identité du site, rassemblées ici parce qu'elles servent à
 * plusieurs endroits : le balisage schema.org des recettes, le pied de page,
 * et la page des conditions d'utilisation. Une seule source pour éviter que
 * l'une d'elles ne se périme dans son coin.
 */

/** Les deux personnes derrière les recettes. */
export const AUTEURS = ['Stéphanie', 'Geoffrey'] as const;

/** Formulé pour une phrase : « Stéphanie et Geoffrey Crofte ». */
export const AUTEURS_TEXTE = 'Stéphanie et Geoffrey';

export const EDITEUR = {
  nom: 'Crofte Studio',
  immatriculation: 'B310079',
  pays: 'Luxembourg',
} as const;

export const HEBERGEUR = {
  nom: 'OVH',
  raisonSociale: 'OVH SAS',
  adresse: '2 rue Kellermann, 59100 Roubaix, France',
  site: 'https://www.ovhcloud.com/',
} as const;

/**
 * Adresse de contact affichée dans les conditions d'utilisation. Laissée vide,
 * la section « Nous écrire » ne s'affiche pas : mieux vaut pas d'adresse qu'une
 * adresse qui ne relève personne.
 */
export const CONTACT = '';

/**
 * Plancher de reversement des gains d'affiliation, en euros. Tant que la
 * cagnotte ne l'atteint pas, elle attend : un don plus petit coûterait plus
 * cher en frais qu'il ne rapporterait.
 */
export const SEUIL_DON = 200;
