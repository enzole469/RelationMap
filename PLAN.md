# Plan et suivi du projet

Ce fichier est le carnet de bord du projet. Il est lu au début de chaque
session et mis à jour à la fin.

## Où on en est

**Dernière session :** 2026-11-21. Étapes 1 à 4 terminées : carte en disques
de proximité, relations et liens (ajout, modification, suppression),
attraction des liés et répartition des groupes, sauvegarde automatique,
export / import de fichier. L'app démarre maintenant sur une carte vide :
l'utilisateur peut commencer à saisir ses vraies relations.

**Prochaine action :** étape 5, PWA (installable, hors ligne), adaptation au
téléphone, puis mise en ligne (avec accord) et test sur Android.

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
- [ ] Rendre l'app installable et utilisable hors ligne
- [ ] Adapter l'affichage et le tactile au téléphone
- [ ] Mettre en ligne sur GitHub Pages (avec mon accord)
- [ ] Installer et tester sur Android

### Étape 6 : plus tard
- [ ] Informations supplémentaires (lieu géographique, etc.)
- [ ] À définir

## Questions en suspens

- Changer le niveau d'une relation en faisant glisser sa bulle dans un autre
  disque ? (aujourd'hui elle revient dans le sien ; on change le niveau dans
  sa fiche)
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
