import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { dureeTotale, formaterDuree } from '../lib/format';

/** Flux RSS, écrit à la main pour les mêmes raisons que le sitemap. */

const echapper = (texte: string) =>
  texte
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export const GET: APIRoute = async ({ site }) => {
  if (!site) throw new Error('`site` doit être défini dans astro.config.mjs.');

  const recettes = (
    await getCollection('recettes', ({ data }) => !data.brouillon && !data.interne)
  ).sort(
    (a, b) => b.data.miseAJour.getTime() - a.data.miseAJour.getTime()
  );

  const lienFlux = new URL('/rss.xml', site).href;

  const articles = recettes
    .map((recette) => {
      const d = recette.data;
      const lien = new URL(`/recettes/${recette.id}/`, site).href;
      const resume = `${d.description} (${formaterDuree(dureeTotale(d))}, ${d.portions} portions)`;

      return `    <item>
      <title>${echapper(d.titre)}</title>
      <link>${echapper(lien)}</link>
      <guid isPermaLink="true">${echapper(lien)}</guid>
      <description>${echapper(resume)}</description>
      <pubDate>${d.miseAJour.toUTCString()}</pubDate>
${d.tags.map((tag) => `      <category>${echapper(tag)}</category>`).join('\n')}
    </item>`;
    })
    .join('\n');

  const corps = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Recettes du Lux</title>
    <link>${echapper(new URL('/', site).href)}</link>
    <atom:link href="${echapper(lienFlux)}" rel="self" type="application/rss+xml" />
    <description>Nos recettes, testées dans notre cuisine.</description>
    <language>fr-FR</language>
${articles}
  </channel>
</rss>
`;

  return new Response(corps, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  });
};
