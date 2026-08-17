// @ts-check
import { defineConfig } from 'astro/config';
import { satteri } from '@astrojs/markdown-satteri';
import { typographieFrMarkdown } from './plugins/typographie-fr-markdown.mjs';

// https://astro.build/config
export default defineConfig({
  // Domaine de production. Sert aux URL absolues (sitemap, JSON-LD, RSS).
  site: 'https://recettes.crofte.fr',

  // Le site est servi à la racine du domaine personnalisé, pas sous /cookbook,
  // donc pas de `base` à définir.

  build: {
    // URL en /recettes/ma-recette/ plutôt que /recettes/ma-recette.html
    format: 'directory',
  },

  markdown: {
    // Espaces insécables avant la ponctuation haute, sans y penser en écrivant.
    processor: satteri({ mdastPlugins: [typographieFrMarkdown] }),
  },

  image: {
    // Formats générés par astro:assets pour les photos de recettes.
    responsiveStyles: true,
  },

  prefetch: {
    // Précharge au survol, utile sur les listes de recettes.
    prefetchAll: true,
    defaultStrategy: 'hover',
  },
});
