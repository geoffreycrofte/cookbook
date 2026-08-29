/**
 * Thème clair / sombre.
 *
 * Source unique des valeurs partagées entre le script en ligne du `<head>`
 * (qui applique le thème avant le premier rendu) et la bascule de l'en-tête.
 */

export type Theme = 'clair' | 'sombre';

/** Clé de stockage du choix explicite du visiteur. */
export const CLE_THEME = 'theme';

/**
 * Fond de page de chaque thème, recopié depuis `--papier` dans global.css.
 * Sert à la balise `theme-color`, qui n'accepte pas de variable CSS.
 */
export const COULEURS_THEME: Record<Theme, string> = {
  clair: '#fffbfc',
  sombre: '#121210',
};

/** Requête média consultée tant que le visiteur n'a rien choisi. */
export const REQUETE_SOMBRE = '(prefers-color-scheme: dark)';

/** Lit le choix stocké. `null` si rien n'a été choisi, ou si l'accès échoue. */
export function themeStocke(): Theme | null {
  try {
    const valeur = localStorage.getItem(CLE_THEME);
    return valeur === 'clair' || valeur === 'sombre' ? valeur : null;
  } catch {
    // Stockage refusé (navigation privée verrouillée, cookies bloqués) :
    // le site retombe simplement sur la préférence système.
    return null;
  }
}

/** Enregistre le choix. Silencieux si le stockage est refusé. */
export function memoriserTheme(theme: Theme): void {
  try {
    localStorage.setItem(CLE_THEME, theme);
  } catch {
    /* Le thème reste appliqué pour la session, sans être retenu. */
  }
}

/** Thème demandé par le système d'exploitation. */
export function themeSysteme(): Theme {
  return matchMedia(REQUETE_SOMBRE).matches ? 'sombre' : 'clair';
}
