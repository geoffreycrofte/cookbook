import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

/**
 * Sitemap écrit à la main plutôt qu'avec `@astrojs/sitemap`.
 *
 * Le site compte une poignée de pages et l'intégration ne déclare aucune
 * compatibilité avec Astro 7. Vingt lignes maîtrisées valent mieux qu'une
 * dépendance dont on ignore si elle suivra.
 */

const echapper = (texte: string) =>
  texte.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const GET: APIRoute = async ({ site }) => {
  if (!site) throw new Error('`site` doit être défini dans astro.config.mjs.');

  const recettes = await getCollection('recettes', ({ data }) => !data.brouillon);

  const laPlusRecente = recettes.reduce<Date | undefined>((plus, recette) => {
    const date = recette.data.miseAJour;
    return !plus || date > plus ? date : plus;
  }, undefined);

  const pages = [
    {
      url: new URL('/', site).href,
      date: laPlusRecente,
      priorite: '1.0',
      frequence: 'weekly',
    },
    {
      url: new URL('/plan-du-site/', site).href,
      date: laPlusRecente,
      priorite: '0.3',
      frequence: 'weekly',
    },
    ...recettes.map((recette) => ({
      url: new URL(`/recettes/${recette.id}/`, site).href,
      date: recette.data.miseAJour,
      priorite: '0.8',
      frequence: 'monthly',
    })),
  ];

  // `/admin/` et `/hors-ligne/` sont volontairement absents : l'un est privé,
  // l'autre n'a aucun sens dans un résultat de recherche.
  const corps = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
  .map(
    (page) => `  <url>
    <loc>${echapper(page.url)}</loc>${
      page.date ? `\n    <lastmod>${page.date.toISOString().slice(0, 10)}</lastmod>` : ''
    }
    <changefreq>${page.frequence}</changefreq>
    <priority>${page.priorite}</priority>
  </url>`
  )
  .join('\n')}
</urlset>
`;

  return new Response(corps, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
