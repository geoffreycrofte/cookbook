/**
 * Vérifie les contrastes de la palette contre le seuil WCAG AA, dans les deux
 * thèmes. À relancer après toute retouche de couleur dans src/styles/global.css.
 *
 *   npm run contrastes
 *
 * Sort en code 1 si une paire échoue, pour pouvoir être branché sur la CI.
 */

const luminanceCanal = (canal) => {
  const c = canal / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

const luminance = (hex) => {
  const [r, g, b] = hex.match(/\w\w/g).map((paire) => parseInt(paire, 16));
  return 0.2126 * luminanceCanal(r) + 0.7152 * luminanceCanal(g) + 0.0722 * luminanceCanal(b);
};

const contraste = (a, b) => {
  const [clair, sombre] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (clair + 0.05) / (sombre + 0.05);
};

// Les valeurs doivent rester alignées sur les jetons de src/styles/global.css.
const THEME_CLAIR = {
  papier: '#faf4e8',
  creux: '#f2e8d6',
  carte: '#fffcf6',
  encre: '#211812',
  doux: '#6b5647',
  braise: '#c3401f',
  braiseTexte: '#a93317',
  surBraise: '#fff8f2',
  olive: '#4e5a34',
};

const THEME_SOMBRE = {
  papier: '#14100d',
  creux: '#1c1713',
  carte: '#1e1813',
  encre: '#f5ede1',
  doux: '#b6a392',
  braise: '#e0603a',
  braiseTexte: '#f0906b',
  surBraise: '#1a0d07',
  olive: '#a7b881',
};

/** Seuil 4,5 pour le texte courant, 3 pour les éléments non textuels. */
const paires = (t) => [
  ['Texte courant', t.encre, t.papier, 4.5],
  ['Texte courant sur carte', t.encre, t.carte, 4.5],
  ['Texte secondaire', t.doux, t.papier, 4.5],
  ['Texte secondaire sur fond creux', t.doux, t.creux, 4.5],
  ['Lien et accent textuel', t.braiseTexte, t.papier, 4.5],
  ['Lien sur carte', t.braiseTexte, t.carte, 4.5],
  ['Données de cuisson', t.olive, t.papier, 4.5],
  ['Texte sur aplat braise', t.surBraise, t.braise, 4.5],
  ['Fanion inversé', t.papier, t.encre, 4.5],
  ['Contour de focus', t.braise, t.papier, 3],
  ['Numéral ajouré des étapes', t.braise, t.papier, 3],
];

let echecs = 0;

for (const [nom, theme] of [
  ['Thème clair', THEME_CLAIR],
  ['Thème sombre', THEME_SOMBRE],
]) {
  console.log(`\n${nom}`);
  console.log('-'.repeat(nom.length));

  for (const [libelle, premier, second, seuil] of paires(theme)) {
    const rapport = contraste(premier, second);
    const conforme = rapport >= seuil;
    if (!conforme) echecs += 1;
    const marque = conforme ? '  OK ' : 'ÉCHEC';
    console.log(`${marque} ${rapport.toFixed(2).padStart(6)}  (seuil ${seuil})  ${libelle}`);
  }
}

console.log(
  echecs === 0
    ? '\nToutes les paires atteignent le niveau AA.\n'
    : `\n${echecs} paire(s) sous le seuil AA.\n`
);

process.exit(echecs === 0 ? 0 : 1);
