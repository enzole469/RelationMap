# RelationMap

Application personnelle qui affiche une carte interactive de mes relations :
des bulles (les personnes) reliées entre elles, placées sur des cercles
concentriques selon leur degré de proximité avec moi (au centre).

## Qui je suis / comment travailler avec moi

- Je débute complètement en programmation et en informatique.
- Je veux **apprendre en avançant** : explique-moi les grandes lignes de ce que
  tu fais et pourquoi, sans détailler chaque ligne de code.
- Utilise des mots simples. Quand un terme technique est inévitable, définis-le
  en une phrase.
- Avance par petites étapes que je peux tester moi-même, et dis-moi à chaque
  fois comment voir le résultat.
- Avant toute action difficile à annuler (supprimer des fichiers, publier en
  ligne, effacer des données), demande-moi d'abord.
- Réponds en français.

## Objectif et usage

- Usage **strictement personnel** (un seul utilisateur : moi).
- Sur **ordinateur** (Windows) et consultable sur **téléphone Android**.
- Format **PWA** (Progressive Web App) : un site web qui s'installe comme une
  application et fonctionne hors connexion.

## Fonctionnalités

### Version 1 (priorité)
- Ajouter une relation (au minimum : un nom).
- Supprimer une relation (avec confirmation).
- Afficher les relations sous forme de bulles sur une carte interactive
  (déplacement, zoom).
- Cercles concentriques = degré de proximité (ex. 1 = très proche, au centre ;
  plus le chiffre est grand, plus c'est loin). Changer le cercle d'une personne
  doit être simple.
- Créer un lien entre deux relations en **glissant une bulle sur une autre**.
- Supprimer un lien.
- Les données sont sauvegardées automatiquement sur l'appareil.
- Exporter / importer toutes les données dans un fichier (sauvegarde et
  transfert entre ordinateur et téléphone).

### Plus tard (à définir)
- Informations supplémentaires sur chaque personne (lieu géographique, etc.).
- Éventuellement une synchronisation automatique entre appareils.

## Choix techniques

- **HTML, CSS et JavaScript simples**, sans outil de compilation : le projet
  doit rester facile à comprendre et à ouvrir.
- Bibliothèque **D3.js** pour la carte (bulles, liens, cercles), copiée dans le
  projet (dossier `lib/`) plutôt que chargée depuis Internet, pour que l'app
  marche hors ligne et ne contacte aucun service extérieur.
- Données stockées **localement dans le navigateur** (`localStorage`, clé
  `relationmap-donnees`, au même format JSON que le fichier d'export). Pas de
  serveur, pas de compte, pas de base de données en ligne. Toute donnée lue
  (appareil ou fichier importé) passe par `verifierDonnees()` avant usage.
- Le stockage du navigateur est propre à chaque adresse : les données saisies
  en ouvrant `index.html` en local ne seront pas visibles sur la version en
  ligne (et inversement). On passe de l'une à l'autre par export / import.
- Hébergement envisagé : GitHub Pages (gratuit, en HTTPS, nécessaire pour
  installer une PWA sur Android). **Seul le code est publié, jamais les
  données.**
- Ajouter une dépendance externe uniquement si c'est vraiment utile, et me
  l'expliquer avant.

## Organisation des fichiers

- `index.html` : la page de l'app.
- `css/style.css` : l'apparence.
- `js/donnees.js` : cercles, types de liens, listes des relations et des
  liens, actions qui les modifient, sauvegarde automatique, export / import.
- `js/carte.js` : le dessin de la carte interactive et sa physique
  (`dessinerCarte()` la remet à jour et sauvegarde après chaque changement).
- `js/interface.js` : le panneau latéral (vues relation, lien et sauvegarde).
- `lib/d3.min.js` : la bibliothèque D3 (version 7.9.0), ne pas modifier.
- `manifest.webmanifest` : fiche d'identité de la PWA (nom, icônes, couleurs).
- `sw.js` : service worker (fonctionnement hors connexion, stratégie « le
  réseau d'abord, la copie sinon »). **Tout nouveau fichier de l'app doit
  être ajouté à la liste `FICHIERS` de `sw.js`.**
- `icones/` : icône de l'app (`icone.svg`, et ses versions PNG 192 et 512
  générées à partir du SVG avec Chrome sans fenêtre).
- `tests/exemples.js` : données fictives pour les tests (`chargerExemples()`),
  jamais chargé par l'app.

Pour voir l'app : double-cliquer sur `index.html`.

## Données et vie privée

Les données contiennent les noms de vraies personnes : elles restent privées.

- Aucune donnée personnelle dans le code, dans les fichiers d'exemple ni dans
  ce qui est publié en ligne. Pour les tests, utiliser des noms fictifs.
- Aucun envoi de données vers un service extérieur (pas de statistiques, pas
  de pisteur, pas de police ou de script chargé depuis un autre site).
- Les fichiers d'export ne doivent jamais être ajoutés à Git ni publiés. Leur
  nom contient toujours « sauvegarde » (ex. `relationmap-sauvegarde-2026-11-21.json`)
  pour être automatiquement exclus par `.gitignore`.
- L'identité Git du projet est neutre (« RelationMap ») : ne pas y mettre de
  vrai nom ni de vraie adresse e-mail, car les commits seront publics.
- On ne stocke pas d'adresse, de téléphone ni d'e-mail.

## Suivi entre les sessions

- Au début de chaque session, lire `PLAN.md` pour savoir où on en est.
- À la fin d'une session, ou quand une étape est terminée, mettre à jour
  `PLAN.md` : cocher ce qui est fait, noter la prochaine action, les questions
  en suspens et les décisions prises (avec la date).

## Bonnes pratiques du projet

- Le projet est suivi avec **Git** (historique des versions, possibilité de
  revenir en arrière). Faire un enregistrement (commit) après chaque étape qui
  fonctionne, avec un message clair en français.
- Code commenté en français, aux endroits utiles pour comprendre la logique.
- Tester sur ordinateur avant de penser au téléphone.
- Tests automatiques (pour Claude) : Chrome sans fenêtre
  (`--headless=new --allow-file-access-from-files`), avec une page de test
  dans le dossier temporaire qui charge les scripts du projet puis un script
  de scénario ; `--dump-dom` pour lire les résultats, `--screenshot` pour
  voir le rendu. Toujours utiliser un profil Chrome séparé
  (`--user-data-dir` dans le dossier temporaire) pour ne jamais toucher aux
  vraies données de l'utilisateur ; vider `localStorage` avant les scripts de
  l'app, puis appeler `chargerExemples()` (`tests/exemples.js`). Pièges :
  dans ce mode l'animation D3 ne tourne pas, donc appeler
  `simulation.tick(3000)` pour stabiliser ; un clic juste après un glissement
  est ignoré par D3 (le décaler) ; la lecture d'un fichier est asynchrone
  (attendre son résultat) ; ne pas réutiliser un nom de variable globale de
  l'app dans le script de test ; en quittant une page, l'app sauvegarde.
- Toujours regarder une capture d'écran en plus des chiffres : une mesure
  peut passer alors que le rendu est mauvais. Régénérer les pages de test
  depuis `index.html` après chaque modification de celui-ci.
- Affichage téléphone : sous Windows, Chrome impose une largeur de fenêtre
  minimale (~500 px) ; pour simuler un téléphone, afficher la page dans une
  `<iframe>` de 412 px de large.
- Service worker / hors connexion : il ne fonctionne pas en `file://`. Le
  tester avec un petit serveur Python local (dans le dossier temporaire) qui
  sert le projet, peut simuler une coupure réseau et reçoit les résultats de
  la page de test par POST (Chrome lancé en arrière-plan, `--dump-dom` est
  trop rapide). Ensuite, n'arrêter que ses propres processus de test
  (filtrer par ligne de commande), jamais tous les `python` ou `chrome`.
- Mettre à jour ce fichier quand une décision importante est prise.
