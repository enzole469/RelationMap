# Plan et suivi du projet

Ce fichier est le carnet de bord du projet. Il est lu au début de chaque
session et mis à jour à la fin.

## Où on en est

**Dernière session :** 2026-11-21. Git installé, étape 1 terminée : la carte
s'affiche avec 4 cercles et des relations fictives, on peut zoomer, déplacer
la carte et faire glisser les bulles.

**Prochaine action :** étape 2, ajouter et supprimer des relations.

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
- [ ] Ajouter une relation (nom + cercle de proximité)
- [ ] Changer le cercle d'une relation
- [ ] Supprimer une relation (avec confirmation)

### Étape 3 : gérer les liens
- [ ] Créer un lien en glissant une bulle sur une autre
- [ ] Afficher les liens entre bulles
- [ ] Supprimer un lien

### Étape 4 : sauvegarder les données
- [ ] Enregistrement automatique sur l'appareil
- [ ] Exporter les données dans un fichier
- [ ] Importer un fichier de sauvegarde

### Étape 5 : PWA et téléphone
- [ ] Rendre l'app installable et utilisable hors ligne
- [ ] Adapter l'affichage et le tactile au téléphone
- [ ] Mettre en ligne sur GitHub Pages (avec mon accord)
- [ ] Installer et tester sur Android

### Étape 6 : plus tard
- [ ] Informations supplémentaires (lieu géographique, etc.)
- [ ] À définir

## Questions en suspens

- Étape 2 : permettre de changer le niveau d'une relation en faisant glisser
  sa bulle dans un autre disque ? (aujourd'hui elle revient dans le sien)

## Décisions prises

- 2026-11-21 : PWA en HTML/CSS/JavaScript simples avec D3.js, données
  uniquement sur l'appareil, transfert par export/import de fichier.
- 2026-11-21 : 4 cercles de proximité : Intime, Proche, Ami, Connaissance.
- 2026-11-21 : chaque niveau est un disque (anneau coloré) et non une ligne :
  les bulles sont libres à l'intérieur de leur disque et y reviennent si on
  les lâche en dehors.
