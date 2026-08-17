/**
 * Greffon Sätteri appliquant la typographie française au corps des recettes.
 *
 * Le visiteur ne reçoit que les nœuds de texte : le code, les URL et les
 * attributs restent intacts sans avoir à les écarter nous-mêmes.
 *
 * La logique est volontairement dupliquée depuis src/lib/typographie.ts :
 * la configuration Astro est chargée hors du pipeline TypeScript du projet.
 */

const INSECABLE = ' ';
const FINE = ' ';
const ESPACES = '[   ]*';

const AVANT_DEUX_POINTS = new RegExp(`${ESPACES}:`, 'g');
const AVANT_HAUTE = new RegExp(`${ESPACES}([;!?])`, 'g');
const APRES_GUILLEMET_OUVRANT = new RegExp(`«${ESPACES}`, 'g');
const AVANT_GUILLEMET_FERMANT = new RegExp(`${ESPACES}»`, 'g');
const PROTOCOLE = new RegExp(`(https?)${INSECABLE}:`, 'g');

export function typographier(texte) {
  return texte
    .replace(AVANT_DEUX_POINTS, `${INSECABLE}:`)
    .replace(AVANT_HAUTE, `${FINE}$1`)
    .replace(APRES_GUILLEMET_OUVRANT, `«${FINE}`)
    .replace(AVANT_GUILLEMET_FERMANT, `${FINE}»`)
    .replace(PROTOCOLE, '$1:');
}

/** @type {import('satteri').MdastPluginDefinition} */
export const typographieFrMarkdown = {
  name: 'typographie-fr',
  text(noeud, ctx) {
    const corrige = typographier(noeud.value);
    if (corrige !== noeud.value) {
      ctx.setProperty(noeud, 'value', corrige);
    }
  },
};
