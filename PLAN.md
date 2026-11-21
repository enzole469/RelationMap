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
- Quand deux bulles de groupe se recouvrent, leurs noms peuvent se
  chevaucher.
- Quand tous les groupes sont ouverts (onglet Groupes), leurs halos se
  chevauchent : à revoir avec une organisation plus claire de la carte
  (« arborescence » évoquée par l'utilisateur).
- Groupes : régler la finesse de la détection si les groupes trouvés sont
  trop gros ou trop petits sur les vraies données. Sur téléphone, en vue
  d'ensemble, le nom d'un groupe d'intimes peut toucher « Moi ».
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
- 2026-11-22 : groupes. Détection automatique (méthode de Louvain, poids :
  couple 3, amis 2, se connaissent 1, se détestent 0) : un simple pont ne
  fusionne pas deux groupes. Un groupe = au moins 3 personnes. Nom
  automatique (« Groupe de … », personne la plus connectée), renommable ;
  une personne peut être placée à la main dans un groupe ou hors groupe
  (fiche). Un groupe est replié par défaut en une grosse bulle (nombre de
  membres, liens vers l'extérieur regroupés en un trait gris), placée à la
  distance moyenne de ses membres ; un clic l'ouvre (membres dans un halo à
  son nom) et affiche son panneau (renommer, replier, membres).
- 2026-11-22 : bouton « Ranger » (parts de gâteau proportionnelles à la
  taille des groupes, groupes liés côte à côte, « Annuler » possible).
- 2026-11-22 : mode Liens : un trait suit le pointeur (la bulle ne bouge
  plus) et la carte reste immobile pendant l'édition des liens. Hors mode
  Liens, glisser une bulle ne fige plus les autres.
- Format des données version 2 (groupes) ; les fichiers version 1 restent
  acceptés à l'import.
- 2026-11-22 : mode édition, onglet « Groupes » : choisir un groupe, le créer
  (+ Nouveau), le renommer, le supprimer (ses membres passent « hors
  groupe », sinon la détection le recréerait) ; toucher une personne l'ajoute
  au groupe choisi ou l'en retire. Tous les groupes s'ouvrent dans cet
  onglet et se replient en sortant ; la carte y reste immobile. Un groupe
  nommé par l'utilisateur s'affiche dès 2 membres (3 pour un groupe détecté).
- 2026-11-22 : stabilité. La poussée de répartition est partagée entre les
  bulles d'un paquet et la rotation d'ensemble est annulée (la carte ne
  tourne plus comme un manège) ; animation raccourcie (~20 s).
- 2026-11-22 : les groupes peuvent se chevaucher (une personne dans
  plusieurs groupes ; remplace l'idée de sous-groupes). Détection : un
  groupe principal (Louvain), plus les autres groupes dont la personne
  connaît au moins 30 % des membres et vers lesquels va au moins 30 % du
  poids de ses liens. Corrections manuelles par personne et par groupe
  (`choixGroupes`), cases à cocher dans la fiche, « Rétablir les groupes
  automatiques ». Supprimer un groupe le garde comme « refusé » (pas
  recréé, les membres gardent leurs autres groupes). Format des données
  version 3 (les versions 1 et 2 sont converties).
- 2026-11-22 : affichage des groupes qui se chevauchent (remplace l'idée de
  laisser les personnes communes visibles hors des bulles, jugée mauvaise).
  Une personne commune est cachée tant que tous ses groupes sont repliés
  (représentée par son groupe principal pour ses liens). Les bulles de
  groupes avec des membres en commun se pénètrent (d'autant plus qu'elles
  partagent), visent la même distance au centre et sont rangées ensemble.
  À l'ouverture d'un groupe, ses membres partagés sont visibles et les
  bulles de leurs autres groupes s'y superposent en transparence.
- 2026-11-22 : lasso dans l'onglet Groupes : glisser sur le fond entoure
  plusieurs personnes ; elles sont toutes ajoutées au groupe choisi (ou
  toutes retirées si elles en faisaient déjà toutes partie), avec
  « Annuler ».
- 2026-11-22 : le lasso s'active avec un bouton « ◌ Lasso » dans l'onglet
  Groupes (bloquer le déplacement de la carte dans tout l'onglet était
  gênant). Lasso désactivé : glisser déplace la carte ; activé : glisser
  trace le lasso. Il se désactive en sortant de l'onglet.
- 2026-11-22 : sous-groupes. Un groupe dont tous les membres sont dans un
  groupe plus grand en est un sous-groupe : il disparaît quand le grand
  groupe est replié (pas de bulle ni de chevauchement), apparaît replié
  dans le halo du grand groupe quand celui-ci est ouvert, puis s'ouvre à
  son tour (halo imbriqué). La recherche ouvre tous les niveaux. Correction
  du moteur : un paquet détecté ne reprend l'identité d'un groupe connu que
  s'il a au moins un vrai membre en commun avec lui (une personne seule
  était rattachée à tort à un groupe créé à la main).
