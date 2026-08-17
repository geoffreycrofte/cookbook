/**
 * Génère les icônes de la PWA depuis une source vectorielle unique.
 *
 *   node scripts/generer-icones.mjs
 *
 * À relancer si la palette ou le motif change. Les fichiers produits sont
 * versionnés : le build ne dépend donc pas de ce script.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const destination = path.join(racine, 'public/icones');

const BRAISE = '#c3401f';
const PAPIER = '#faf4e8';
const ENCRE = '#211812';

/**
 * Une assiette vue de dessus sur fond braise : lisible à 32 pixels, sans
 * texte, donc sans dépendance à une police au moment du rendu.
 *
 * @param {number} taille  côté de l'image
 * @param {number} marge   part du côté laissée libre autour du motif
 * @param {boolean} rond   true pour un fond circulaire (icône Apple)
 */
function motif(taille, marge, rond = false) {
  const c = taille / 2;
  const rayonAssiette = (taille / 2) * (1 - marge);
  const rayonAile = rayonAssiette * 0.72;
  const rayonFond = rond ? taille / 2 : taille * 0.22;

  // Trois traits en éventail : la chaleur qui monte au-dessus de l'assiette.
  const trait = taille * 0.026;
  const hautVapeur = c - rayonAssiette * 0.38;
  const basVapeur = c + rayonAssiette * 0.02;
  const ecart = rayonAssiette * 0.3;

  const vapeur = [-1, 0, 1]
    .map((i) => {
      const x = c + i * ecart;
      const courbe = rayonAssiette * 0.13 * (i === 0 ? 1 : -1);
      return `<path d="M ${x} ${basVapeur} C ${x + courbe} ${basVapeur - (basVapeur - hautVapeur) * 0.45}, ${x - courbe} ${hautVapeur + (basVapeur - hautVapeur) * 0.3}, ${x} ${hautVapeur}" fill="none" stroke="${ENCRE}" stroke-width="${trait}" stroke-linecap="round"/>`;
    })
    .join('\n  ');

  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${taille}" height="${taille}" viewBox="0 0 ${taille} ${taille}">
  <rect width="${taille}" height="${taille}" rx="${rayonFond}" fill="${BRAISE}"/>
  <circle cx="${c}" cy="${c}" r="${rayonAssiette}" fill="${PAPIER}"/>
  <circle cx="${c}" cy="${c}" r="${rayonAile}" fill="none" stroke="${BRAISE}" stroke-width="${taille * 0.016}" opacity="0.35"/>
  ${vapeur}
</svg>`);
}

const fichiers = [
  // Marge 0,22 : le motif tient dans la zone sûre des icônes masquables.
  { nom: 'icone-192.png', taille: 192, marge: 0.16 },
  { nom: 'icone-512.png', taille: 512, marge: 0.16 },
  { nom: 'icone-masquable-512.png', taille: 512, marge: 0.28 },
  { nom: 'icone-apple-180.png', taille: 180, marge: 0.16, rond: false },
];

await mkdir(destination, { recursive: true });

for (const { nom, taille, marge, rond } of fichiers) {
  const png = await sharp(motif(taille, marge, rond)).png({ compressionLevel: 9 }).toBuffer();
  await writeFile(path.join(destination, nom), png);
  console.log(`  ${nom.padEnd(26)} ${taille}×${taille}  ${Math.round(png.length / 1024)} ko`);
}

// Favicon vectoriel : net à toutes les tailles, quelques centaines d'octets.
await writeFile(path.join(destination, 'favicon.svg'), motif(64, 0.16));
console.log('  favicon.svg');

console.log('\nIcônes générées dans public/icones/.\n');
