# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Workflow, styling, copywriting and tone rules live in [`.claude/CLAUDE.md`](.claude/CLAUDE.md) and also apply. This file covers commands and architecture.

## What this is

"Recettes du Lux" (`recettes.crofte.fr`): a personal cookbook as a static Astro 7 site. Content is French. Built and published to GitHub Pages on every push to `main` (`.github/workflows/deploy.yml`); custom domain in `public/CNAME`.

## Commands

```bash
npm run dev          # astro dev on http://localhost:4321
npm run build        # astro check && astro build && npm run elaguer && npm run verifier && npm run verifier:tags
npm run preview      # serve dist/ as in production
npm run verifier     # assert dist/ actually contains the recipes
npm run verifier:tags # tag hygiene (diets, near-duplicates); warns only, never fails
npm run contrastes   # check palette contrasts against WCAG AA
npm run icones       # regenerate PWA icons
npm run cms:verifier # validate public/admin/config.yml against the Sveltia schema (needs network)
npm run cms:maj [x]  # bump the pinned Sveltia CMS version and its SRI hash
```

Node 22 (`.nvmrc`). There is no test runner: "tests" are the `scripts/verifier-*.mjs` checks plus build-time schema validation. `astro check` does the type checking.

`astro build` reports success as soon as it writes a file, even an empty one, so `verifier-rendu.mjs` reads `dist/` back and checks a visitor would see real content. `elaguer-originaux.mjs` deletes the source JPEG/PNG originals Astro drops in `dist/_astro/` that no page references.

### Gotcha: content schema changes

After editing `src/content.config.ts`, restart the dev server. Astro's content store does not always rebuild the schema on a hot change: the site keeps running but with zero recipes. `npm run build` catches this, the dev server does not.

### Gotcha: service worker

The service worker only registers in production (in dev it would serve stale pages). To exercise it, run `npm run build` then `npm run preview`. `src/pages/hors-ligne.astro` is the offline fallback.

## Architecture

### Content model

One recipe is a folder `src/content/recettes/<slug>/` holding `index.md` and its photos. The slug is the folder name (`generateId` strips `/index.md`). Loaded with a glob loader.

`src/content.config.ts` is the schema, written with `astro/zod` (Astro 7 dropped the `z` re-export from `astro:content`). It validates hard, with explicit French error messages via `.refine()`. Key rules:

- `airfryer: true` requires `temperature`.
- A recipe uses either `ingredients` + `etapes`, or `parties` (min 2), never both.
- `imageAlt` is mandatory everywhere an image appears (accessibility). An illustrated step must set its own `imageAlt`.
- `regime` is a closed enum; `tags` are lowercased; `brouillon: true` keeps the recipe out of the build.
- `facultatif()` tolerates `null` (the CMS writes `null` for empty fields).
- Frontmatter strings pass through `typographieFr()` at load via `texteFr()`.

The schema's final `.transform()` adds a canonical `sections` array: every recipe becomes a list of sections (a simple recipe is one unnamed section), so the rest of the site only ever handles `sections`.

### French typography

`src/lib/typographie.ts` (`typographieFr`) inserts non-breaking and thin spaces before high punctuation. It runs on frontmatter strings through the schema, and on the markdown body through the remark plugin `plugins/typographie-fr-markdown.mjs`. The plugin logic is deliberately duplicated because `astro.config.mjs` loads outside the project's TypeScript pipeline.

### Routing and generated files

- `src/pages/index.astro`: home. Builds the search index inline and serializes it into the page HTML.
- `src/pages/recettes/[...slug].astro`: recipe pages. `getStaticPaths` reads the collection and filters out `brouillon`.
- Also generated: `rss.xml.ts`, `sitemap.xml.ts`, `llms.txt.ts`, `plan-du-site.astro`.

### `src/lib/`

- `format.ts`: durations, ingredient formatting, French quantity and plural-unit agreement, label maps.
- `recherche.ts`: build-time search index (Fuse.js), accent-normalized, ingredients and tags kept as lists so Fuse scores each entry.
- `seo.ts`: schema.org JSON-LD (`Recipe` with `HowToSection`/`HowToStep`, `BreadcrumbList`). Step image URLs are only known at render, so the page computes them and passes them in.
- `theme.ts`: light/dark constants shared between the inline `<head>` script (applies the theme before first paint) and the header toggle.

### Layout and styling

`src/layouts/Base.astro` is the only layout: fonts (Fraunces + Karla via `@fontsource-variable`, latin subset preloaded), `theme-color`, Open Graph tags. Components in `src/components/`. Styling is one hand-written `src/styles/global.css`, no CSS framework; theming through custom properties (`--papier` etc.), dark mode via `prefers-color-scheme` plus an explicit choice in `localStorage`.

### CMS

Sveltia CMS at `/admin` writes `.md` files to this repo; markdown stays the source of truth. `public/admin/config.yml` must mirror `src/content.config.ts`, and the Astro schema wins any disagreement (it fails the build, the CMS would just write an invalid file). The Sveltia version is pinned with an SRI hash in `public/admin/index.html` because that script holds a repo-write token.

## Docs

`docs/PLAN-PROJET.md` holds the project plan, phases and validation tests. Per `.claude/CLAUDE.md`, long multi-phase work is documented under `docs/`.
