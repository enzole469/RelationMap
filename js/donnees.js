// Les données de l'app.

// Les 4 cercles de proximité. Le niveau 1 est le plus proche du centre ("moi").
const CERCLES = [
  { niveau: 1, nom: "Intime",       couleur: "#e76f51" },
  { niveau: 2, nom: "Proche",       couleur: "#f4a261" },
  { niveau: 3, nom: "Ami",          couleur: "#2a9d8f" },
  { niveau: 4, nom: "Connaissance", couleur: "#577590" },
];

// Relations fictives, uniquement pour tester l'affichage.
// Règle du projet : jamais de vrais noms dans le code.
// Ces exemples seront remplacés par vos propres saisies à l'étape 2.
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
