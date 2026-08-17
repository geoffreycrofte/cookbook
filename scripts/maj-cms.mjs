/**
 * Met à jour la version épinglée de Sveltia CMS dans public/admin/index.html,
 * et recalcule son empreinte SRI.
 *
 *   npm run cms:maj             # dernière version publiée
 *   npm run cms:maj -- 0.192.0  # une version précise
 *
 * L'empreinte est ce qui protège le jeton GitHub stocké par l'interface : sans
 * elle, un fichier altéré côté CDN s'exécuterait sans que rien ne le signale.
 */

import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const page = path.join(racine, 'public/admin/index.html');

const demandee = process.argv[2];

async function derniereVersion() {
  const reponse = await fetch('https://registry.npmjs.org/@sveltia/cms/latest');
  if (!reponse.ok) throw new Error(`Registre npm injoignable (${reponse.status}).`);
  const { version } = await reponse.json();
  return version;
}

const version = demandee ?? (await derniereVersion());
const url = `https://unpkg.com/@sveltia/cms@${version}/dist/sveltia-cms.js`;

console.log(`\nVersion visée : ${version}`);
console.log(`Téléchargement de ${url}`);

const reponse = await fetch(url);
if (!reponse.ok) {
  console.error(`\nTéléchargement impossible (${reponse.status}). Version inexistante ?\n`);
  process.exit(1);
}

const octets = Buffer.from(await reponse.arrayBuffer());
const empreinte = `sha384-${createHash('sha384').update(octets).digest('base64')}`;

console.log(`Taille        : ${Math.round(octets.length / 1024)} ko`);
console.log(`Empreinte     : ${empreinte}`);

const avant = await readFile(page, 'utf-8');
const apres = avant
  .replace(/@sveltia\/cms@[\d.]+\/dist\/sveltia-cms\.js/, `@sveltia/cms@${version}/dist/sveltia-cms.js`)
  .replace(/integrity="sha384-[^"]+"/, `integrity="${empreinte}"`);

if (apres === avant) {
  console.log('\nRien à changer : la page est déjà à jour.\n');
  process.exit(0);
}

await writeFile(page, apres);
console.log('\npublic/admin/index.html mis à jour. Vérifiez /admin/ avant de pousser.\n');
