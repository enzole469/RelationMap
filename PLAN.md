# Plan et suivi du projet

Ce fichier est le carnet de bord du projet. Il est lu au début de chaque
session et mis à jour à la fin.

## Où on en est

**Dernière session :** 2026-11-21. Étapes 1 à 5 terminées. L'app est en
ligne sur https://enzole469.github.io/RelationMap/, installée et testée avec
succès par l'utilisateur sur ordinateur et sur Android (tactile, liens,
hors connexion, import des données).

**Prochaine action :** au choix de l'utilisateur : étape 6 (informations
supplémentaires sur les personnes) ou une des questions en suspens.

## Étapes

### Étape 0 : préparation
- [x] Définir le projet et les choix techniques (`CLAUDE.md`)
- [x] Créer ce plan
- [x] Initialiser Git et créer le `.gitignore`

### Étape 1 : afficher la carte
- [x] Page de base qui s'ouvre dans le navigateur
- [x] Cercles concentriques de proximité, avec « moi » au centre
- [x] Bulles de relations fictives placées sur leur cercle
- [x] Déplacement et zoom sur la carte

### Étape 2 : gérer les relations
- [x] Ajouter une relation (nom + cercle de proximité)
- [x] Changer le nom ou le cercle d'une relation (clic sur la bulle)
- [x] Supprimer une relation (avec confirmation)

### Étape 3 : gérer les liens
- [x] Créer un lien en glissant une bulle sur une autre
- [x] Afficher les liens entre bulles (4 types : couple, amis, se
  connaissent, se détestent)
- [x] Modifier le type ou supprimer un lien (clic sur le trait)

### Étape 4 : sauvegarder les données
- [x] Enregistrement automatique sur l'appareil (avec la position des bulles)
- [x] Exporter les données dans un fichier
- [x] Importer un fichier de sauvegarde (vérifié, avec confirmation)
- [x] Rappel si aucun export depuis plus de 2 semaines
- [x] Message clair si les données enregistrées sont illisibles

### Étape 5 : PWA et téléphone
- [x] Rendre l'app installable et utilisable hors ligne (manifest, icônes,
  service worker ; testé avec un serveur local et une coupure réseau)
- [x] Adapter l'affichage et le tactile au téléphone (bandeau compact avec
  menu ☰, panneau en bas d'écran, bulles et zones tactiles de taille
  minimale, noms lointains cachés tant qu'on n'a pas zoomé)
- [x] Mettre en ligne sur GitHub Pages (avec mon accord) :
  https://enzole469.github.io/RelationMap/
- [x] Installer et tester sur Android (validé par l'utilisateur)

### Étape 6 : plus tard
- [ ] Informations supplémentaires (lieu géographique, etc.)
- [ ] À définir

## Questions en suspens

- Afficher la liste des liens d'une personne dans sa fiche ?
- À l'étape 5 : les données saisies en local (`index.html` ouvert par
  double-clic) ne seront pas visibles sur la version en ligne. Il faudra
  exporter puis importer une fois lors du passage à la version en ligne.

## Décisions prises

- 2026-11-21 : PWA en HTML/CSS/JavaScript simples avec D3.js, données
  uniquement sur l'appareil, transfert par export/import de fichier.
- 2026-11-21 : 4 cercles de proximité : Intime, Proche, Ami, Connaissance.
- 2026-11-21 : chaque niveau est un disque (anneau coloré) et non une ligne :
  les bulles sont libres à l'intérieur de leur disque et y reviennent si on
  les lâche en dehors.
- 2026-11-21 : pas de nom écrit sur les disques, la couleur et la légende
  suffisent.
- 2026-11-21 : 4 types de liens, distingués par le trait : en couple (épais),
  amis (moyen), se connaissent (fin pointillé), se détestent (rouge en
  tirets). Une bulle lâchée sur une autre reprend sa place.
- 2026-11-21 : pendant qu'on fait glisser une bulle, toutes les autres sont
  figées (sinon la bulle visée était repoussée et fuyait, ce qui empêchait
  de créer des liens).
- 2026-11-21 : les bulles reliées s'attirent selon le type de lien (couple
  fort, amis moyen, se connaissent léger, se détestent aucun), sans jamais
  sortir de leur disque. Réglages `attraction` / `distance` dans
  `TYPES_DE_LIEN` (`js/donnees.js`).
- 2026-11-21 : les groupes (personnes reliées directement ou indirectement,
  hors « se détestent » ; une personne seule = un groupe) se répartissent
  uniformément autour du centre, comme des convives autour d'une table
  ronde. Mouvement lent qui ralentit progressivement (~40 s). Réglages
  `ECARTEMENT_GROUPES`, `VITESSE_MAX_GROUPES` et `alphaDecay` dans
  `js/carte.js`.
- 2026-11-21 : les anneaux de proximité sont cachés au repos et
  n'apparaissent (en fondu, très transparents) que lorsque le panneau
  d'ajout / modification d'une personne est ouvert. L'anneau du niveau
  choisi ressort davantage.
- 2026-11-21 : sauvegarde dans `localStorage` (plus simple qu'IndexedDB,
  suffisant pour ce volume). Les exemples fictifs sont retirés de l'app et
  déplacés dans `tests/exemples.js`. Panneau « Sauvegarde » pour exporter /
  importer.
- 2026-11-21 : lisibilité. Disques plus larges et de plus en plus larges vers
  l'extérieur (140/170/200/230), bulles plus petites avec l'éloignement
  (22/18/15/12), noms gardant une taille minimale lisible à l'écran quel que
  soit le zoom. Réglages `LARGEUR_DISQUE`, `TAILLE_BULLE`, `TAILLE_TEXTE`
  dans `js/carte.js`.
- 2026-11-21 : le disque « Connaissance » n'a plus de bord extérieur : les
  connaissances peuvent s'éloigner autant qu'on veut (anneau en dégradé qui
  s'efface). Les nouvelles apparaissent près du bord intérieur.
- 2026-11-21 : mode focus (une personne sélectionnée : elle, ses liens et
  ses relations restent nets, le reste s'estompe ; panneau d'un lien : les
  deux personnes et leur lien). Place réservée autour de chaque bulle pour
  son nom (fonction `rayonAvecNom`), pour éviter les chevauchements.
- 2026-11-21 : recherche par nom (sans tenir compte des accents ni des
  majuscules ; Entrée centre sur la personne et ouvre sa fiche), bouton
  « Recentrer » (vue d'ensemble incluant les connaissances lointaines),
  types de liens de la légende cliquables pour les masquer / réafficher
  (affichage seulement, non mémorisé au rechargement).
- 2026-11-21 : clic sur une bulle : si « moi », la personne ou une de ses
  relations n'est pas visible (panneau compris), la carte glisse pour
  centrer l'ensemble, sans changer le zoom ; sinon rien ne bouge
  (`cadrerPersonne` dans `js/carte.js`).
- 2026-11-21 : téléphone. Sur écran étroit, le bandeau ne garde que la
  recherche, ☰ (légende, filtres, sauvegarde) et + ; le panneau monte du bas.
  La place réservée aux noms est calculée pour un écran de référence
  (`AGRANDISSEMENT_REFERENCE`) afin que la disposition soit identique sur
  tous les appareils. Service worker « réseau d'abord » : les mises à jour
  arrivent seules, sans numéro de version à gérer.
- 2026-11-21 : mise en ligne sur GitHub Pages (dépôt enzole469/RelationMap,
  branche `main`, racine). Publier une mise à jour = `git push` ; le service
  worker « réseau d'abord » la fait arriver toute seule sur les appareils.
- 2026-11-21 : mode édition (bouton ✎ Édition). Onglet « Disques » :
  glisser une bulle dans un autre disque change son niveau. Onglet « Liens » :
  on choisit un outil (un type de lien ou Effacer), puis glisser une bulle
  sur une autre ou toucher un trait applique l'outil, sans panneau. Hors mode
  édition, glisser une bulle la déplace seulement (plus de lien créé par
  accident) ; toucher une bulle ou un trait ouvre toujours son panneau.
  Validé par l'utilisateur sur ordinateur et sur Android.
