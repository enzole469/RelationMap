// Les données de l'app et les actions qui les modifient.

// Les 4 cercles de proximité. Le niveau 1 est le plus proche du centre ("moi").
const CERCLES = [
  { niveau: 1, nom: "Intime",       couleur: "#e76f51" },
  { niveau: 2, nom: "Proche",       couleur: "#f4a261" },
  { niveau: 3, nom: "Ami",          couleur: "#2a9d8f" },
  { niveau: 4, nom: "Connaissance", couleur: "#577590" },
];

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

// La liste des relations affichées sur la carte.
// Pour l'instant rien n'est sauvegardé : tout repart des exemples
// au rechargement de la page (la sauvegarde arrive à l'étape 4).
const relations = RELATIONS_EXEMPLE.map((r) => ({ ...r }));

// Crée un identifiant unique pour chaque nouvelle relation.
function nouvelIdentifiant() {
  return "r" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function trouverRelation(id) {
  return relations.find((r) => r.id === id);
}

function ajouterRelation(nom, cercle) {
  const relation = { id: nouvelIdentifiant(), nom, cercle };
  relations.push(relation);
  return relation;
}

function modifierRelation(id, nom, cercle) {
  const relation = trouverRelation(id);
  relation.nom = nom;
  relation.cercle = cercle;
}

function supprimerRelation(id) {
  const position = relations.findIndex((r) => r.id === id);
  if (position !== -1) relations.splice(position, 1);
}
