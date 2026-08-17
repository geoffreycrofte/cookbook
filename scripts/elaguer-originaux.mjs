/**
 * Supprime de dist/ les images sources qu'Astro y dépose sans que rien ne les
 * référence.
 *
 * Astro émet la photo d'origine dans dist/_astro/ à côté des variantes WebP
 * qu'il a générées. Ces originaux ne sont cités par aucune page : ils gonflent
 * l'artefact déployé de plusieurs centaines de kilo-octets par recette.
 *
 * Prudence : seuls les JPEG et PNG de dist/_astro/ sont candidats, et un
 * fichier n'est supprimé que si aucun fichier texte de dist/ ne cite son nom.
 * En cas de doute, on garde.
 */

import { readdir, readFile, stat, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(racine, 'dist');
const assets = path.join(dist, '_astro');

const EXTENSIONS_CANDIDATES = new Set(['.jpg', '.jpeg', '.png']);
const EXTENSIONS_TEXTE = new Set([
  '.html',
  '.css',
  '.js',
  '.json',
  '.webmanifest',
  '.xml',
  '.txt',
  '.svg',
]);

if (!existsSync(assets)) {
  console.log('Rien à élaguer : dist/_astro/ est absent.');
  process.exit(0);
}

/** Tous les fichiers de dist/, à plat. */
async function parcourir(dossier) {
  const entrees = await readdir(dossier, { withFileTypes: true });
  const fichiers = [];

  for (const entree of entrees) {
    const chemin = path.join(dossier, entree.name);
    if (entree.isDirectory()) fichiers.push(...(await parcourir(chemin)));
    else fichiers.push(chemin);
  }

  return fichiers;
}

const tous = await parcourir(dist);

// Un seul passage de lecture : on concatène tout le texte du site une fois.
const textes = await Promise.all(
  tous
    .filter((f) => EXTENSIONS_TEXTE.has(path.extname(f).toLowerCase()))
    .map((f) => readFile(f, 'utf-8'))
);
const corpus = textes.join('\n');

const candidats = tous.filter(
  (f) =>
    path.dirname(f) === assets && EXTENSIONS_CANDIDATES.has(path.extname(f).toLowerCase())
);

let liberes = 0;
const supprimes = [];

for (const candidat of candidats) {
  const nom = path.basename(candidat);
  if (corpus.includes(nom)) continue;

  const { size } = await stat(candidat);
  await unlink(candidat);
  liberes += size;
  supprimes.push(nom);
}

if (supprimes.length === 0) {
  console.log('Aucune image source orpheline dans dist/_astro/.');
} else {
  for (const nom of supprimes) console.log(`  retiré  ${nom}`);
  console.log(
    `\n${supprimes.length} image(s) source non référencée(s) retirée(s), ${Math.round(liberes / 1024)} ko libérés.`
  );
}
