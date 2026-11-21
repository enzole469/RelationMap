// Le "service worker" : un petit programme que le navigateur garde à côté de
// l'app. Il conserve une copie des fichiers de l'app sur l'appareil pour
// qu'elle fonctionne sans connexion.
//
// Stratégie "le réseau d'abord" : si Internet est disponible, on prend la
// dernière version des fichiers (et on met la copie à jour) ; sinon, on
// utilise la copie. Les mises à jour de l'app arrivent donc toutes seules.
//
// Les données (les relations) ne passent jamais par ici : elles restent dans
// le stockage du navigateur, sur l'appareil.

const NOM_COPIE = "relationmap-fichiers";

const FICHIERS = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "css/style.css",
  "lib/d3.min.js",
  "js/donnees.js",
  "js/carte.js",
  "js/interface.js",
  "icones/icone-192.png",
  "icones/icone-512.png",
];

// Installation : on fait une première copie de tous les fichiers.
self.addEventListener("install", (evenement) => {
  evenement.waitUntil(
    caches.open(NOM_COPIE)
      .then((copie) => copie.addAll(FICHIERS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (evenement) => {
  evenement.waitUntil(self.clients.claim());
});

// Chaque fois que l'app demande un fichier.
self.addEventListener("fetch", (evenement) => {
  const requete = evenement.request;
  // On ne s'occupe que des fichiers de l'app elle-même.
  if (requete.method !== "GET" || new URL(requete.url).origin !== self.location.origin) return;

  evenement.respondWith(
    fetch(requete)
      .then((reponse) => {
        if (reponse.ok) {
          const doublon = reponse.clone();
          caches.open(NOM_COPIE).then((copie) => copie.put(requete, doublon));
        }
        return reponse;
      })
      .catch(() =>
        caches.match(requete, { ignoreSearch: true })
          .then((enCopie) => enCopie || caches.match("index.html"))
      )
  );
});
