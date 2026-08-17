/*
  Service worker de Recettes du Lux.

  Écrit à la main plutôt que généré : les besoins tiennent en trois stratégies,
  et l'intégration @vite-pwa/astro ne déclare pas encore Astro 7.

  Stratégies
  ----------
  · Navigation   réseau d'abord, puis cache, puis page hors ligne.
                 Une recette déjà consultée reste donc lisible sans réseau,
                 et la version en ligne reste prioritaire quand elle existe.
  · Ressources   cache d'abord pour /_astro/ et /icones/ : leurs noms portent
    figées       une empreinte, leur contenu ne change jamais.
  · Le reste     réseau d'abord, avec repli sur le cache.

  Pour invalider tous les caches, incrémenter VERSION.
*/

const VERSION = 'v1';
const CACHE = `recettes-du-lux-${VERSION}`;
const PAGE_HORS_LIGNE = '/hors-ligne/';

/** Le strict minimum pour que l'application s'ouvre hors ligne. */
const SOCLE = ['/', PAGE_HORS_LIGNE, '/manifest.webmanifest', '/icones/icone-192.png'];

self.addEventListener('install', (evenement) => {
  evenement.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // addAll échouerait en bloc sur une seule ressource manquante.
      await Promise.allSettled(SOCLE.map((url) => cache.add(url)));
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (evenement) => {
  evenement.waitUntil(
    (async () => {
      const noms = await caches.keys();
      await Promise.all(noms.filter((nom) => nom !== CACHE).map((nom) => caches.delete(nom)));
      await self.clients.claim();
    })()
  );
});

/** Les ressources à empreinte ne changent jamais : le cache fait autorité. */
function estFigee(url) {
  return url.pathname.startsWith('/_astro/') || url.pathname.startsWith('/icones/');
}

async function depuisLeCacheDabord(requete) {
  const cache = await caches.open(CACHE);
  const enCache = await cache.match(requete);
  if (enCache) return enCache;

  const reponse = await fetch(requete);
  if (reponse.ok) cache.put(requete, reponse.clone());
  return reponse;
}

async function depuisLeReseauDabord(requete, repli) {
  const cache = await caches.open(CACHE);

  try {
    const reponse = await fetch(requete);
    // On ne met en cache que les réponses complètes de notre propre origine.
    if (reponse.ok && reponse.type === 'basic') cache.put(requete, reponse.clone());
    return reponse;
  } catch (erreur) {
    const enCache = await cache.match(requete);
    if (enCache) return enCache;
    if (repli) {
      const page = await cache.match(repli);
      if (page) return page;
    }
    throw erreur;
  }
}

self.addEventListener('fetch', (evenement) => {
  const requete = evenement.request;

  // On ne touche ni aux autres origines, ni aux requêtes non GET.
  if (requete.method !== 'GET') return;

  const url = new URL(requete.url);
  if (url.origin !== self.location.origin) return;

  if (requete.mode === 'navigate') {
    evenement.respondWith(depuisLeReseauDabord(requete, PAGE_HORS_LIGNE));
    return;
  }

  if (estFigee(url)) {
    evenement.respondWith(depuisLeCacheDabord(requete));
    return;
  }

  evenement.respondWith(depuisLeReseauDabord(requete));
});
