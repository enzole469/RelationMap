// Les données de l'app et les actions qui les modifient.

// Les 4 cercles de proximité. Le niveau 1 est le plus proche du centre ("moi").
const CERCLES = [
  { niveau: 1, nom: "Intime",       couleur: "#e76f51" },
  { niveau: 2, nom: "Proche",       couleur: "#f4a261" },
  { niveau: 3, nom: "Ami",          couleur: "#2a9d8f" },
  { niveau: 4, nom: "Connaissance", couleur: "#577590" },
];

// Les types de liens entre deux relations, et leur apparence sur la carte.
// epaisseur : largeur du trait ; pointilles : longueur trait/espace (null = plein).
const TYPES_DE_LIEN = [
  { type: "couple",       nom: "En couple",      couleur: "#2b2d42", epaisseur: 5,   pointilles: null },
  { type: "ami",          nom: "Amis",           couleur: "#2b2d42", epaisseur: 2.5, pointilles: null },
  { type: "connaissance", nom: "Se connaissent", couleur: "#2b2d42", epaisseur: 1.5, pointilles: "3 5" },
  { type: "conflit",      nom: "Se détestent",   couleur: "#c0392b", epaisseur: 2.5, pointilles: "10 6" },
];

const typeDeLien = (type) => TYPES_DE_LIEN.find((t) => t.type === type);

// Relations fictives, uniquement pour tester l'affichage.
// Règle du projet : jamais de vrais noms dans le code.
const RELATIONS_EXEMPLE = [
  { id: "r1",  nom: "Alice",   cercle: 1 },
  { id: "r2",  nom: "Bruno",   cercle: 1 },
  { id: "r3",  nom: "Chloé",   cercle: 2 },
  { id: "r4",  nom: "David",   cercle: 2 },
  { id: "r5",  nom: "Emma",    cercle: 2 },
  { id: "r6",  nom: "Farid",   cercle: 3 },
  { id: "r7",  nom: "Gaëlle",  cercle: 3 },
  { id: "r8",  nom: "Hugo",    cercle: 3 },
  { id: "r9",  nom: "Inès",    cercle: 3 },
  { id: "r10", nom: "Jules",   cercle: 4 },
  { id: "r11", nom: "Karima",  cercle: 4 },
  { id: "r12", nom: "Léo",     cercle: 4 },
  { id: "r13", nom: "Manon",   cercle: 4 },
  { id: "r14", nom: "Nathan",  cercle: 4 },
];

// Liens fictifs entre les relations d'exemple.
// "de" et "vers" sont les identifiants des deux relations reliées.
const LIENS_EXEMPLE = [
  { id: "l1", de: "r1", vers: "r2",  type: "couple" },
  { id: "l2", de: "r3", vers: "r6",  type: "ami" },
  { id: "l3", de: "r4", vers: "r5",  type: "connaissance" },
  { id: "l4", de: "r8", vers: "r10", type: "conflit" },
];

// Les listes affichées sur la carte.
// Pour l'instant rien n'est sauvegardé : tout repart des exemples
// au rechargement de la page (la sauvegarde arrive à l'étape 4).
const relations = RELATIONS_EXEMPLE.map((r) => ({ ...r }));
const liens = LIENS_EXEMPLE.map((l) => ({ ...l }));

// Crée un identifiant unique ("r..." pour une relation, "l..." pour un lien).
function nouvelIdentifiant(prefixe) {
  return prefixe + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function trouverRelation(id) {
  return relations.find((r) => r.id === id);
}

function ajouterRelation(nom, cercle) {
  const relation = { id: nouvelIdentifiant("r"), nom, cercle };
  relations.push(relation);
  return relation;
}

function modifierRelation(id, nom, cercle) {
  const relation = trouverRelation(id);
  relation.nom = nom;
  relation.cercle = cercle;
}

// Supprime une relation et tous les liens qui la concernent.
function supprimerRelation(id) {
  const position = relations.findIndex((r) => r.id === id);
  if (position !== -1) relations.splice(position, 1);
  for (const lien of liens.filter((l) => l.de === id || l.vers === id)) {
    supprimerLien(lien.id);
  }
}

// --- Les liens ------------------------------------------------------------

// Le lien entre deux relations, dans un sens ou dans l'autre (ou undefined).
function trouverLien(idA, idB) {
  return liens.find(
    (l) => (l.de === idA && l.vers === idB) || (l.de === idB && l.vers === idA)
  );
}

function ajouterLien(idA, idB, type) {
  const lien = { id: nouvelIdentifiant("l"), de: idA, vers: idB, type };
  liens.push(lien);
  return lien;
}

function modifierLien(id, type) {
  liens.find((l) => l.id === id).type = type;
}

function supprimerLien(id) {
  const position = liens.findIndex((l) => l.id === id);
  if (position !== -1) liens.splice(position, 1);
}
