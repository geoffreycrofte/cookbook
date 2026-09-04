import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { dureeTotale, formaterDuree, libelleCategorie } from '../lib/format';

/**
 * `llms.txt` : un résumé du site en markdown, à destination des moteurs
 * génératifs. Le format reste une convention et non un standard, mais il coûte
 * une page générée et évite qu'un modèle résume le site à partir du HTML.
 *
 * Il liste les recettes plutôt que d'en recopier le contenu : la fiche complète
 * reste la source, et le fichier ne se périme pas au premier changement.
 */

export const GET: APIRoute = async ({ site }) => {
  if (!site) throw new Error('`site` doit être défini dans astro.config.mjs.');

  const recettes = (
    await getCollection('recettes', ({ data }) => !data.brouillon && !data.interne)
  ).sort((a, b) =>
    a.data.titre.localeCompare(b.data.titre, 'fr')
  );

  const materiel = await getCollection('materiel', ({ data }) => !data.brouillon);

  const ligneMateriel = (element: (typeof materiel)[number]) => {
    const ancre = new URL(`/materiel/#${element.id}`, site).href;
    return `- [${element.data.nom}](${ancre}) : ${element.data.description}`;
  };

  const ligne = (recette: (typeof recettes)[number]) => {
    const d = recette.data;
    const lien = new URL(`/recettes/${recette.id}/`, site).href;
    const details = [
      libelleCategorie(d.categorie),
      formaterDuree(dureeTotale(d)),
      `${d.portions} portions`,
      d.airfryer ? 'airfryer' : null,
      d.flemme ? 'recette de la flemme' : null,
    ]
      .filter(Boolean)
      .join(', ');

    return `- [${d.titre}](${lien}) : ${d.description} (${details})`;
  };

  const corps = `# Recettes du Lux

> Carnet de recettes familial, en français, tenu par Stéphanie et Geoffrey.
> Chaque recette a été réellement cuisinée et indique sa température, ses durées et les
> détails qui changent le résultat.

Le site est statique et sans traceur. Les fiches indiquent, quand la cuisson s'y
prête, la température en degrés Celsius et la durée de chaque étape. Les
quantités sont ajustables au nombre de portions directement sur la page.

## Recettes (${recettes.length})

${recettes.map(ligne).join('\n')}

## Matériel de cuisine (${materiel.length})

Le matériel de cuisson, les ustensiles et les ingrédients difficiles à trouver
qui reviennent dans les recettes. Chaque élément a son ancre sur la page.

${materiel.map(ligneMateriel).join('\n')}

## Conventions

- Les recettes marquées « airfryer » sont cuites à l'air chaud pulsé, avec une température indiquée.
- Les recettes marquées « recette de la flemme » sont celles que nous faisons quand nous n'avons envie de rien.
- Certaines recettes se découpent en plusieurs préparations (un plat, une sauce, un pain), présentées en sections distinctes sur la même page.

## Ressources

- [Toutes les recettes](${new URL('/', site).href})
- [Notre matériel de cuisine](${new URL('/materiel/', site).href})
- [Conditions d'utilisation](${new URL('/conditions-d-utilisation/', site).href}) : réutilisation des recettes, liens affiliés, aucune donnée collectée
- [Flux RSS](${new URL('/rss.xml', site).href})
`;

  return new Response(corps, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
