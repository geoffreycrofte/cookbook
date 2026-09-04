/**
 * Compresse les photos de recette trop lourdes.
 *
 *   node scripts/comprimer-images.mjs              # tout src/content/recettes/
 *   node scripts/comprimer-images.mjs chemin1 chemin2 ...   # fichiers précis
 *
 * Une image (JPEG ou PNG) au-dessus de SEUIL_OCTETS est recompressée en place :
 * redimensionnée si elle dépasse LARGEUR_MAX, puis réencodée à une qualité qui
 * reste indiscernable à l'écran. Le fichier n'est réécrit que si le résultat
 * est réellement plus léger, jamais si la compression l'alourdit.
 *
 * Sert de garde-fou pour ne jamais committer une photo brute de smartphone à
 * plusieurs Mo : appelé par le hook `.githooks/pre-commit` sur les fichiers
 * indexés, et disponible en manuel via `npm run comprimer-images`.
 */

import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dossierRecettes = path.join(racine, 'src/content/recettes');

const SEUIL_OCTETS = 800 * 1024;
const LARGEUR_MAX = 2400;
const QUALITE_JPEG = 82;

const EXTENSIONS = new Set(['.jpg', '.jpeg', '.png']);

async function parcourir(dossier) {
  const entrees = await readdir(dossier, { withFileTypes: true });
  const fichiers = [];

  for (const entree of entrees) {
    const chemin = path.join(dossier, entree.name);
    if (entree.isDirectory()) fichiers.push(...(await parcourir(chemin)));
    else if (EXTENSIONS.has(path.extname(entree.name).toLowerCase())) fichiers.push(chemin);
  }

  return fichiers;
}

async function compresser(chemin) {
  const avant = (await stat(chemin)).size;
  if (avant <= SEUIL_OCTETS) return null;

  const extension = path.extname(chemin).toLowerCase();
  const image = sharp(chemin).rotate(); // rotate() applique l'orientation EXIF puis la retire.
  const metadonnees = await image.metadata();

  if (metadonnees.width && metadonnees.width > LARGEUR_MAX) {
    image.resize({ width: LARGEUR_MAX });
  }

  const tampon =
    extension === '.png'
      ? await image.png({ compressionLevel: 9, quality: 90 }).toBuffer()
      : await image.jpeg({ quality: QUALITE_JPEG, mozjpeg: true }).toBuffer();

  if (tampon.length >= avant) return null; // Jamais alourdir un fichier.

  const { writeFile } = await import('node:fs/promises');
  await writeFile(chemin, tampon);
  return { avant, apres: tampon.length };
}

const argv = process.argv.slice(2);
const cibles = argv.length > 0
  ? argv
      .map((f) => path.resolve(racine, f))
      .filter((f) => EXTENSIONS.has(path.extname(f).toLowerCase()))
  : await parcourir(dossierRecettes);

let compresses = 0;
let liberes = 0;

for (const chemin of cibles) {
  let resultat;
  try {
    resultat = await compresser(chemin);
  } catch (erreur) {
    console.warn(`  ignoré (${erreur.message})  ${path.relative(racine, chemin)}`);
    continue;
  }
  if (!resultat) continue;

  compresses += 1;
  liberes += resultat.avant - resultat.apres;
  console.log(
    `  compressé  ${path.relative(racine, chemin)}  ${Math.round(resultat.avant / 1024)} ko → ${Math.round(resultat.apres / 1024)} ko`
  );
}

if (compresses === 0) {
  console.log(`Aucune image au-dessus de ${Math.round(SEUIL_OCTETS / 1024)} ko à compresser.`);
} else {
  console.log(`\n${compresses} image(s) compressée(s), ${Math.round(liberes / 1024)} ko libérés.`);
}
