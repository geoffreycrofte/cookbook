/**
 * Vérifie que le site construit contient réellement les recettes.
 *
 *   npm run verifier   (lancé automatiquement par npm run build)
 *
 * `astro check` ne fait que du typage et `astro build` se déclare satisfait
 * dès qu'il a écrit un fichier, même vide de contenu. Ce script lit la sortie
 * et vérifie ce que verra un visiteur.
 */

import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dossierRecettes = path.join(racine, 'src/content/recettes');
const dossierMateriel = path.join(racine, 'src/content/materiel');
const dist = path.join(racine, 'dist');

const echecs = [];
const constate = (condition, message) => {
  if (!condition) echecs.push(message);
};

/** Slugs attendus : un dossier de recette non marqué brouillon. */
async function recettesAttendues() {
  const dossiers = await readdir(dossierRecettes, { withFileTypes: true });
  const attendues = [];

  for (const dossier of dossiers) {
    if (!dossier.isDirectory()) continue;

    const fichier = path.join(dossierRecettes, dossier.name, 'index.md');
    if (!existsSync(fichier)) {
      echecs.push(`Le dossier « ${dossier.name} » ne contient pas d'index.md.`);
      continue;
    }

    const source = await readFile(fichier, 'utf-8');
    const brouillon = /^brouillon:\s*true\s*$/m.test(source);
    const titre = source.match(/^titre:\s*"?(.+?)"?\s*$/m)?.[1];

    if (!titre) {
      echecs.push(`La recette « ${dossier.name} » n'a pas de titre exploitable.`);
      continue;
    }

    if (!brouillon) attendues.push({ slug: dossier.name, titre });
  }

  return attendues;
}

/** Slugs attendus sur la page matériel : un dossier non marqué brouillon. */
async function materielAttendu() {
  if (!existsSync(dossierMateriel)) return [];

  const dossiers = await readdir(dossierMateriel, { withFileTypes: true });
  const attendus = [];

  for (const dossier of dossiers) {
    if (!dossier.isDirectory()) continue;

    const fichier = path.join(dossierMateriel, dossier.name, 'index.md');
    if (!existsSync(fichier)) {
      echecs.push(`Le dossier de matériel « ${dossier.name} » ne contient pas d'index.md.`);
      continue;
    }

    const source = await readFile(fichier, 'utf-8');
    if (/^brouillon:\s*true\s*$/m.test(source)) continue;

    const nom = source.match(/^nom:\s*"?(.+?)"?\s*$/m)?.[1];
    if (!nom) {
      echecs.push(`L'élément de matériel « ${dossier.name} » n'a pas de nom exploitable.`);
      continue;
    }

    attendus.push({ slug: dossier.name, nom });
  }

  return attendus;
}

if (!existsSync(dist)) {
  console.error('\nAucun dossier dist/. Lancez d’abord « npx astro build ».\n');
  process.exit(1);
}

const attendues = await recettesAttendues();
const accueil = await readFile(path.join(dist, 'index.html'), 'utf-8');

constate(attendues.length > 0, 'Aucune recette publiable trouvée dans src/content/recettes/.');

// Le piège qui nous a échappé : une page d'accueil construite, mais vide.
constate(
  !accueil.includes('Aucune recette pour le moment'),
  'La page d’accueil affiche l’état vide alors que des recettes existent.',
);

for (const { slug, titre } of attendues) {
  const page = path.join(dist, 'recettes', slug, 'index.html');

  if (!existsSync(page)) {
    echecs.push(`La recette « ${slug} » n’a pas de page générée.`);
    continue;
  }

  const contenu = await readFile(page, 'utf-8');
  constate(contenu.includes('<h1'), `La page de « ${slug} » n’a pas de titre de niveau 1.`);
  constate(
    contenu.includes('Ingrédients') && contenu.includes('Préparation'),
    `La page de « ${slug} » n’affiche pas ses ingrédients ou ses étapes.`,
  );
  constate(
    accueil.includes(`/recettes/${slug}/`),
    `La page d’accueil ne renvoie pas vers « ${slug} ».`,
  );
  constate(
    accueil.includes(titre),
    `Le titre « ${titre} » n’apparaît pas sur la page d’accueil.`,
  );
}

/**
 * La page matériel. Ses ancres sont un contrat avec les recettes, qui y
 * renvoient sous la forme /materiel/#airfryer : une ancre disparue est un lien
 * mort, sans erreur visible au build.
 */
const materiel = await materielAttendu();
const pageMateriel = path.join(dist, 'materiel', 'index.html');

if (materiel.length > 0) {
  if (!existsSync(pageMateriel)) {
    echecs.push('La page /materiel/ n’a pas été générée.');
  } else {
    const contenu = await readFile(pageMateriel, 'utf-8');
    constate(contenu.includes('<h1'), 'La page /materiel/ n’a pas de titre de niveau 1.');

    for (const { slug, nom } of materiel) {
      constate(
        contenu.includes(`id="${slug}"`),
        `L’ancre « #${slug} » est absente de la page /materiel/.`,
      );
      constate(contenu.includes(nom), `Le nom « ${nom} » n’apparaît pas sur la page /materiel/.`);
    }
  }
}

if (echecs.length > 0) {
  console.error('\nLe site construit ne rend pas ce qu’il devrait :\n');
  for (const echec of echecs) console.error(`  · ${echec}`);
  console.error('');
  process.exit(1);
}

console.log(
  `\n${attendues.length} recette(s) publiée(s) et référencée(s) sur la page d’accueil.` +
    `\n${materiel.length} élément(s) de matériel publié(s) avec leur ancre.\n`,
);
