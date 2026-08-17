/**
 * Typographie française.
 *
 * Règle de l'Imprimerie nationale : espace insécable avant les deux-points,
 * espace fine insécable avant le point-virgule, le point d'exclamation et le
 * point d'interrogation, et à l'intérieur des guillemets français.
 *
 * Appliqué automatiquement au corps markdown (via le greffon remark) et aux
 * chaînes du frontmatter, pour n'avoir jamais à y penser en écrivant.
 */

const INSECABLE = ' '; // espace insécable
const FINE = ' '; // espace fine insécable

export function typographieFr(texte: string): string {
  return (
    texte
      // Espace éventuelle, normale ou déjà insécable, avant la ponctuation haute.
      .replace(/[   ]*:/g, `${INSECABLE}:`)
      .replace(/[   ]*([;!?])/g, `${FINE}$1`)
      // Guillemets français : fine à l'intérieur.
      .replace(/«[   ]*/g, `«${FINE}`)
      .replace(/[   ]*»/g, `${FINE}»`)
      // Une URL ne doit pas voir son "https://" disloqué.
      .replace(new RegExp(`(https?)${INSECABLE}:`, 'g'), '$1:')
  );
}

/**
 * Accorde l'unité au pluriel. Les symboles normalisés (g, kg, ml, cl, l, cm)
 * restent invariables, comme le veut la règle.
 */
const UNITES_INVARIABLES = new Set([
  'g',
  'kg',
  'mg',
  'ml',
  'cl',
  'dl',
  'l',
  'cm',
  'mm',
  '°c',
  'min',
  'h',
]);

export function accorderUnite(unite: string, quantite: number): string {
  if (quantite < 2) return unite;
  if (UNITES_INVARIABLES.has(unite.toLowerCase())) return unite;

  // Seul le premier mot porte la marque : "cuillères à soupe", "gousses d'ail".
  const [premier, ...reste] = unite.split(' ');
  if (!premier) return unite;

  const pluriel = /[sxz]$/i.test(premier) ? premier : `${premier}s`;
  return [pluriel, ...reste].join(' ');
}
