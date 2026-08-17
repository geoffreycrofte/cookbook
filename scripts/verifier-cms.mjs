/**
 * Valide public/admin/config.yml contre le schéma officiel de Sveltia CMS.
 *
 *   npm run cms:verifier
 *
 * À lancer après toute modification de la configuration. Sans ce contrôle, une
 * clé mal orthographiée ne se découvre qu'en ouvrant /admin, souvent bien plus
 * tard. Le script n'est pas branché sur `npm run build` : il a besoin du réseau
 * pour récupérer le schéma, et le build doit pouvoir s'en passer.
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import { parse as parseYaml } from 'yaml';

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fichierConfig = path.join(racine, 'public/admin/config.yml');
const pageAdmin = path.join(racine, 'public/admin/index.html');

/** La version épinglée dans la page fait foi : on valide contre ce schéma-là. */
async function versionEpinglee() {
  const html = await readFile(pageAdmin, 'utf-8');
  const trouve = html.match(/@sveltia\/cms@([\d.]+)\//);
  if (!trouve) throw new Error('Version de Sveltia introuvable dans public/admin/index.html.');
  return trouve[1];
}

const version = await versionEpinglee();
const urlSchema = `https://unpkg.com/@sveltia/cms@${version}/schema/sveltia-cms.json`;

console.log(`\nVersion épinglée : ${version}`);

let schema;
try {
  const reponse = await fetch(urlSchema);
  if (!reponse.ok) throw new Error(`réponse ${reponse.status}`);
  schema = await reponse.json();
} catch (erreur) {
  console.error(`\nSchéma inaccessible (${erreur.message}). Contrôle ignoré, sans échec.\n`);
  process.exit(0);
}

const config = parseYaml(await readFile(fichierConfig, 'utf-8'));

// `strict: false` : le schéma publié utilise des formats qu'Ajv ne connaît pas
// (« regex », « uri »), sans conséquence sur la validation qui nous intéresse.
const ajv = new Ajv({ strict: false, allErrors: true, allowUnionTypes: true, logger: false });
const valider = ajv.compile(schema);

/**
 * Le schéma officiel accepte n'importe quel nom de widget, pour laisser la
 * porte ouverte aux widgets personnalisés. Une faute de frappe comme
 * « chaine » au lieu de « string » y passe donc sans bruit. On la rattrape ici.
 */
const WIDGETS_CONNUS = new Set([
  'boolean',
  'code',
  'color',
  'compute',
  'datetime',
  'file',
  'hidden',
  'image',
  'keyvalue',
  'list',
  'map',
  'markdown',
  'number',
  'object',
  'relation',
  'richtext',
  'select',
  'string',
  'text',
  'uuid',
]);

const widgetsInconnus = [];

function parcourirChamps(champs, chemin) {
  for (const champ of champs ?? []) {
    const ici = `${chemin}.${champ.name ?? '?'}`;
    if (champ.widget && !WIDGETS_CONNUS.has(champ.widget)) {
      widgetsInconnus.push(`${ici} → widget « ${champ.widget} »`);
    }
    parcourirChamps(champ.fields, ici);
    for (const type of champ.types ?? []) parcourirChamps(type.fields, ici);
  }
}

for (const collection of config.collections ?? []) {
  parcourirChamps(collection.fields, collection.name ?? '?');
}

if (valider(config) && widgetsInconnus.length === 0) {
  const nombre = config.collections?.length ?? 0;
  const champs = config.collections?.[0]?.fields?.length ?? 0;
  console.log(`Configuration valide : ${nombre} collection(s), ${champs} champs.\n`);
  process.exit(0);
}

if (widgetsInconnus.length > 0) {
  console.error('\nWidgets inconnus (faute de frappe ?) :\n');
  for (const ligne of widgetsInconnus) console.error(`  · ${ligne}`);
  if (valider(config)) {
    console.error('');
    process.exit(1);
  }
}

console.error('\nLa configuration du CMS est invalide :\n');

const vus = new Set();
for (const erreur of valider.errors ?? []) {
  const chemin = erreur.instancePath || '(racine)';
  const ligne = `${chemin} ${erreur.message}`;
  if (vus.has(ligne)) continue;
  vus.add(ligne);
  console.error(`  · ${ligne}`);
  if (vus.size >= 20) {
    console.error('  · … (autres erreurs masquées)');
    break;
  }
}

console.error('');
process.exit(1);
