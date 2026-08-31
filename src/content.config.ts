import { defineCollection, type SchemaContext } from 'astro:content';
import { glob } from 'astro/loaders';
// Astro 7 déprécie le ré-export `z` depuis 'astro:content'.
import { z } from 'astro/zod';
import { typographieFr } from './lib/typographie';

/** Chaîne de texte français, corrigée typographiquement dès le chargement. */
const texteFr = (min = 1) => z.string().min(min).transform(typographieFr);

/**
 * Champ facultatif tolérant au `null` et à la chaîne vide.
 *
 * Sveltia CMS n'omet jamais une clé : un widget nombre laissé vide écrit
 * `null`, un widget texte ou image laissé vide écrit `''`. La main, elle,
 * écrit simplement une ligne en moins. Sans cette double tolérance, une
 * recette éditée depuis l'interface ferait échouer le build pour rien.
 */
const facultatif = <T extends z.ZodType>(schema: T) =>
  z
    .preprocess((valeur) => (valeur === '' ? undefined : valeur), schema.nullish())
    .transform((valeur) => valeur ?? undefined);

/**
 * Liste facultative tolérante au tableau vide.
 *
 * Le widget « liste » de Sveltia CMS laissé vide écrit `champ: []` plutôt que
 * d'omettre la clé. Une recette en `parties` reçoit ainsi des `ingredients`/
 * `etapes` racine vides à chaque sauvegarde CMS (et inversement une recette
 * simple reçoit `parties: []`) : sans cette tolérance, ces tableaux vides
 * entrent en conflit avec l'exigence « l'un ou l'autre, jamais les deux ».
 */
const listeFacultative = <T extends z.ZodType>(schema: T) =>
  z.preprocess(
    (valeur) => (Array.isArray(valeur) && valeur.length === 0 ? undefined : valeur),
    schema.optional()
  );

/**
 * Une recette = un dossier dans src/content/recettes/<slug>/
 * contenant index.md et ses photos.
 *
 * Les données structurées vivent dans le frontmatter (elles alimentent la
 * recherche, l'ajustement des portions et le balisage schema.org).
 * Le corps markdown accueille l'introduction, les astuces et les variantes.
 */

const CATEGORIES = ['entree', 'plat', 'dessert', 'snack', 'accompagnement'] as const;
const DIFFICULTES = ['facile', 'moyen', 'technique'] as const;
const SAISONS = ['printemps', 'ete', 'automne', 'hiver'] as const;

/**
 * Les régimes servent de filtre : les laisser en texte libre laisserait
 * « sans gluten » et « sans-gluten » créer deux facettes pour une seule réalité.
 * La liste s'étend ici quand un vrai besoin apparaît.
 */
const REGIMES = [
  'vegetarien',
  'vegan',
  'sans-gluten',
  'sans-lactose',
  'sans-porc',
  'sans-fruits-a-coque',
] as const;

const ingredient = z.object({
  /** Absent pour les ingrédients non mesurés ("sel, à votre goût"). */
  quantite: facultatif(z.number().positive()),
  /** "g", "ml", "cuillère à soupe", "pièce", "pincée"… */
  unite: facultatif(z.string()),
  nom: z.string().min(1),
  /** Précision affichée telle quelle : "coupé en dés", "à température ambiante". */
  precision: facultatif(z.string()),
  /** false pour ce qui ne se multiplie pas avec les portions (sel, épices d'assaisonnement). */
  ajustable: z.boolean().default(true),
  /** true pour un ingrédient qu'on peut omettre : la liste l'affiche comme « optionnel ». */
  optionnel: z.boolean().default(false),
});

/**
 * Une étape. Prend le contexte du schéma pour pouvoir déclarer une photo :
 * `image()` n'existe que là, c'est lui qui résout le fichier posé à côté de
 * l'index.md et en donne les dimensions.
 */
const etape = ({ image }: SchemaContext) =>
  z
    .object({
      texte: texteFr(),
      /** Température de l'airfryer pour cette étape, en °C. */
      temperature: facultatif(z.number().int().min(40).max(250)),
      /** Durée de l'étape, en minutes. */
      duree: facultatif(z.number().positive()),

      /**
       * Illustration facultative : un geste, une texture, un résultat
       * intermédiaire. Le fichier vit dans le dossier de la recette, comme la
       * photo du plat fini.
       */
      image: facultatif(image()),
      /** Alternative textuelle, exigée dès qu'une photo est là. */
      imageAlt: facultatif(texteFr()),
    })
    .refine((e) => e.image === undefined || e.imageAlt !== undefined, {
      message: 'Une étape illustrée doit décrire sa photo dans « imageAlt ».',
      path: ['imageAlt'],
    });

/**
 * Une partie : un bloc de préparation nommé, avec ses propres ingrédients et
 * ses propres étapes. Un curry se déclare ainsi en trois parties : le plat, la
 * sauce et les nans.
 *
 * Ces parties vivent dans la recette et ne renvoient pas vers d'autres fiches.
 * C'est un choix assumé : la séparation à l'écran sans la mécanique de
 * références, dont la réutilisation entre plats resterait de toute façon rare.
 */
const partie = (contexte: SchemaContext) =>
  z.object({
    nom: texteFr(),
    /** Ligne d'avertissement affichée sous le nom : « à préparer la veille ». */
    note: facultatif(texteFr()),
    ingredients: z.array(ingredient).min(1),
    etapes: z.array(etape(contexte)).min(1),
  });

const recettes = defineCollection({
  loader: glob({
    pattern: '**/index.md',
    base: './src/content/recettes',
    // Le slug vient du nom du dossier, pas de "mon-dossier/index".
    generateId: ({ entry }) => entry.replace(/\/index\.md$/, ''),
  }),

  schema: (contexte) =>
    z.object({
      titre: texteFr(),
      description: z.string().min(1).max(200).transform(typographieFr),

      image: contexte.image(),
      /** Alternative textuelle. Obligatoire : c'est une exigence d'accessibilité. */
      imageAlt: texteFr(),
      /** Crédit photo, quand elle n'est pas de nous. */
      credit: facultatif(z.string()),

      // Temps et rendement
      preparation: z.number().int().nonnegative(),
      cuisson: z.number().int().nonnegative(),
      repos: z.number().int().nonnegative().default(0),
      portions: z.number().int().positive(),

      /**
       * Cuisson à l'airfryer. Les champs qui suivent n'ont de sens que dans ce
       * cas ; une recette au four ou à la poêle les laisse simplement de côté.
       */
      airfryer: z.boolean().default(false),
      temperature: facultatif(z.number().int().min(40).max(250)),
      prechauffage: facultatif(z.boolean()),
      secouerAMiCuisson: z.boolean().default(false),

      // Classement
      categorie: z.enum(CATEGORIES),
      difficulte: z.enum(DIFFICULTES).default('facile'),
      saison: z.array(z.enum(SAISONS)).default([]),
      regime: z.array(z.enum(REGIMES)).default([]),
      /** Texte libre, mais ramené en minuscules pour que la casse ne dédouble pas les facettes. */
      tags: z
        .array(z.string().transform((t) => t.trim().toLowerCase()))
        .default([]),
      /** Tirage « J'ai la flemme ». Drapeau manuel, c'est notre jugement qui décide. */
      flemme: z.boolean().default(false),

      /**
       * Recette simple : ingrédients et étapes au premier niveau.
       * Recette en plusieurs préparations : `parties` à la place.
       * Jamais les deux. Le rendu, lui, ne voit que `sections` (voir plus bas).
       */
      ingredients: listeFacultative(z.array(ingredient).min(1)),
      etapes: listeFacultative(z.array(etape(contexte)).min(1)),
      parties: listeFacultative(z.array(partie(contexte)).min(2)),

      miseAJour: z.coerce.date(),
      /** Exclue du site publié tant que true. */
      brouillon: z.boolean().default(false),
    })
      // Une recette annoncée à l'airfryer sans température est une recette
      // inutilisable : autant le voir au build plutôt qu'en cuisine.
      .refine((r) => !r.airfryer || r.temperature !== undefined, {
        message: 'Une recette avec « airfryer: true » doit indiquer sa « temperature ».',
        path: ['temperature'],
      })
      .refine((r) => r.airfryer || !r.secouerAMiCuisson, {
        message: '« secouerAMiCuisson » ne s’applique qu’aux recettes à l’airfryer.',
        path: ['secouerAMiCuisson'],
      })
      // Une recette décrit ses préparations d'une manière ou de l'autre.
      // Deux contrôles distincts, pour que le message colle à l'erreur commise.
      .refine((r) => !(r.parties !== undefined && r.ingredients !== undefined), {
        message:
          'Une recette utilise « ingredients » et « etapes », ou bien « parties », jamais les deux à la fois.',
        path: ['parties'],
      })
      .refine(
        (r) => r.parties !== undefined || (r.ingredients !== undefined && r.etapes !== undefined),
        {
          message:
            'Une recette doit décrire ses préparations : soit « ingredients » et « etapes », soit « parties ».',
          path: ['etapes'],
        }
      )
      /**
       * Forme canonique pour le rendu : toute recette devient une liste de
       * sections. Une recette simple en compte une, sans nom. Le reste du site
       * n'a donc qu'un seul cas à traiter.
       */
      .transform((r) => ({
        ...r,
        sections:
          r.parties ??
          [
            {
              nom: undefined as string | undefined,
              note: undefined as string | undefined,
              ingredients: r.ingredients ?? [],
              etapes: r.etapes ?? [],
            },
          ],
      })),
});

/**
 * Une pièce de matériel = un dossier dans src/content/materiel/<slug>/
 * contenant index.md et sa photo carrée.
 *
 * Le slug sert d'ancre sur la page /materiel/ : une recette renvoie vers
 * `/materiel/#airfryer` et la page met l'élément en avant. Renommer un dossier
 * casse donc les liens des recettes, autant le choisir une fois pour toutes.
 */

const RUBRIQUES = ['cuisson', 'ustensile', 'ingredient'] as const;

/*
 * Note : la forme carrée de la photo ne peut pas être vérifiée par le schéma.
 * Le chargeur de contenu ne résout les dimensions qu'au rendu de la page ; ici,
 * `image()` ne voit encore qu'un chemin. La page recadre donc au centre en 1/1,
 * et l'interface d'édition rappelle d'y déposer un carré.
 */

const materiel = defineCollection({
  loader: glob({
    pattern: '**/index.md',
    base: './src/content/materiel',
    generateId: ({ entry }) => entry.replace(/\/index\.md$/, ''),
  }),

  schema: (contexte) =>
    z.object({
      nom: texteFr(),
      description: z.string().min(1).max(400).transform(typographieFr),

      image: contexte.image(),
      /** Alternative textuelle. Obligatoire : c'est une exigence d'accessibilité. */
      imageAlt: texteFr(),

      rubrique: z.enum(RUBRIQUES),

      /**
       * Lien vers le produit, souvent affilié. Facultatif : un ustensile peut
       * n'avoir aucun lien digne de confiance.
       */
      lien: facultatif(z.string().url().startsWith('https://', 'Le lien doit être en HTTPS.')),
      /** Nom du marchand, affiché dans le libellé du lien : « Voir sur Amazon ». */
      lienMarchand: facultatif(z.string().min(1)),
      /** true quand le lien rapporte une commission : la page l'annonce alors. */
      lienAffilie: z.boolean().default(false),

      /** Tri manuel à l'intérieur de la rubrique, du plus petit au plus grand. */
      ordre: z.number().int().default(100),

      miseAJour: z.coerce.date(),
      /** Exclu du site publié tant que true. */
      brouillon: z.boolean().default(false),
    }).refine((m) => m.lien !== undefined || m.lienMarchand === undefined, {
      message: 'Un marchand sans lien n’a rien à afficher : indiquez le lien, ou retirez le marchand.',
      path: ['lienMarchand'],
    }).refine((m) => m.lien !== undefined || !m.lienAffilie, {
      message: '« lienAffilie » ne s’applique qu’à un élément qui a un lien.',
      path: ['lienAffilie'],
    }),
});

export const collections = { recettes, materiel };
