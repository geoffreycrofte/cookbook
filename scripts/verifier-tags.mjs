/**
 * Hygiène des tags des recettes. Ne fait jamais échouer le build : il signale,
 * un humain tranche.
 *
 *   npm run verifier:tags   (lancé aussi par npm run build)
 *
 * But : empêcher les tags de régime de se disperser (un « végétarien » en tag
 * alors que le champ `regime` existe pour ça) et repérer les quasi-doublons
 * avant qu'ils ne s'installent. Volontairement souple : les listes ci-dessous
 * s'étendent quand un nouveau régime apparaît.
 */

import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dossierRecettes = path.join(racine, 'src/content/recettes');

// Doit refléter l'enum REGIMES de src/content.config.ts.
const REGIMES = [
  'vegetarien',
  'vegan',
  'pescatarien',
  'sans-gluten',
  'sans-lactose',
  'sans-porc',
  'sans-fruits-a-coque',
];

// Tags « option de régime » reconnus : le plat n'est pas de ce régime mais peut
// l'être via les substitutions des ingrédients. À étendre avec l'enum REGIMES.
const OPTIONS_REGIME = REGIMES.map((r) => `option-${r}`);

// Indices qu'un tag parle de régime alimentaire. Testés sans accent. Large
// volontairement : mieux vaut un faux positif à confirmer qu'un tag qui passe.
const INDICES_REGIME = [
  /vega?n/,
  /vegetar|veggie|sans[-\s]?viande/,
  /gluten/,
  /lactose|sans[-\s]?lait|laitier/,
  /sans[-\s]?porc|sans[-\s]?cochon|halal|casher|kasher/,
  /fruits?[-\s]?a[-\s]?coque|sans[-\s]?noix|oleagin|nut[-\s]?free/,
  /sans[-\s]?oeufs?/,
  /sans[-\s]?sucre|allege|healthy|keto|ceto|paleo/,
];

const sansAccent = (s) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae');

/** Forme rapprochée pour comparer deux tags : sans accent, sans pluriel simple. */
const canon = (t) =>
  sansAccent(t)
    .replace(/s\b/g, '')
    .replace(/[-\s]+/g, ' ')
    .trim();

/** Distance de Levenshtein, pour repérer les variantes d'orthographe. */
function distance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const c = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
    }
  }
  return d[a.length][b.length];
}

const avertissements = [];
const prevenir = (msg) => avertissements.push(msg);

// --- Lecture des recettes -------------------------------------------------

const dossiers = await readdir(dossierRecettes, { withFileTypes: true });
const recettes = [];

for (const dossier of dossiers) {
  if (!dossier.isDirectory()) continue;
  const fichier = path.join(dossierRecettes, dossier.name, 'index.md');
  if (!existsSync(fichier)) continue;

  const source = await readFile(fichier, 'utf-8');
  const bloc = source.split(/^---\s*$/m)[1];
  if (!bloc) continue;

  let donnees;
  try {
    donnees = parseYaml(bloc) ?? {};
  } catch (erreur) {
    prevenir(`« ${dossier.name} » : frontmatter illisible (${erreur.message}).`);
    continue;
  }

  const tags = (Array.isArray(donnees.tags) ? donnees.tags : []).map((t) =>
    String(t).trim().toLowerCase(),
  );
  const regime = (Array.isArray(donnees.regime) ? donnees.regime : []).map((r) =>
    String(r).trim().toLowerCase(),
  );

  recettes.push({ slug: dossier.name, tags, regime, source });
}

// --- Contrôles par recette ---------------------------------------------

for (const { slug, tags, regime, source } of recettes) {
  const vus = new Set();
  for (const t of tags) {
    if (vus.has(t)) prevenir(`« ${slug} » : le tag « ${t} » est répété dans la liste.`);
    vus.add(t);
  }

  for (const t of new Set(tags)) {
    if (REGIMES.includes(t)) {
      prevenir(`« ${slug} » : « ${t} » est un régime. À mettre dans « regime », pas dans « tags ».`);
      continue;
    }

    if (OPTIONS_REGIME.includes(t)) {
      const base = t.slice('option-'.length);
      if (regime.includes(base)) {
        prevenir(`« ${slug} » : « ${t} » est redondant, « regime » contient déjà « ${base} ».`);
      }
      if (!/pour une version /i.test(source)) {
        prevenir(
          `« ${slug} » : tag « ${t} » mais aucune substitution « … pour une version … » ` +
            `dans les ingrédients.`,
        );
      }
      continue;
    }

    if (INDICES_REGIME.some((re) => re.test(sansAccent(t)))) {
      const proche = [...REGIMES, ...OPTIONS_REGIME].find(
        (connu) => distance(canon(t), canon(connu)) <= 2,
      );
      if (proche) {
        prevenir(
          `« ${slug} » : tag « ${t} » très proche de « ${proche} ». Uniformiser sur « ${proche} ».`,
        );
      } else {
        prevenir(
          `« ${slug} » : tag « ${t} » ressemble à un régime non géré. Si c'est un nouveau ` +
            `régime, l'ajouter à l'enum REGIMES (src/content.config.ts) et à ce script ; ` +
            `sinon le retirer. À confirmer avec l'auteur.`,
        );
      }
    }
  }
}

// --- Quasi-doublons dans tout le corpus ------------------------------

const tousLesTags = [...new Set(recettes.flatMap((r) => r.tags))]
  .filter((t) => !REGIMES.includes(t) && !OPTIONS_REGIME.includes(t))
  .sort();

const dejaVu = new Set();
for (let i = 0; i < tousLesTags.length; i++) {
  for (let j = i + 1; j < tousLesTags.length; j++) {
    const a = tousLesTags[i];
    const b = tousLesTags[j];
    const memeCanon = canon(a) === canon(b);
    const proches = Math.min(a.length, b.length) >= 5 && distance(canon(a), canon(b)) <= 2;
    if (!memeCanon && !proches) continue;

    const cle = `${a}|${b}`;
    if (dejaVu.has(cle)) continue;
    dejaVu.add(cle);
    prevenir(
      `Tags proches dans le corpus : « ${a} » et « ${b} ». Choisir une forme unique ` +
        `et me demander d'uniformiser.`,
    );
  }
}

// --- Rapport ---------------------------------------------------------

if (avertissements.length === 0) {
  console.log(
    `\nTags : rien à signaler (${tousLesTags.length} tag(s) distinct(s) sur ` +
      `${recettes.length} recette(s)).\n`,
  );
  process.exit(0);
}

console.warn(`\nTags — ${avertissements.length} point(s) à regarder :\n`);
for (const a of avertissements) console.warn(`  · ${a}`);
console.warn(`\nAucun n'empêche le build. À toi de trancher : corriger, ou étendre les listes.\n`);
process.exit(0);
