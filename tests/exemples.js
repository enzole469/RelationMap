// Données fictives pour les tests automatiques. Jamais chargé par l'app.
// Règle du projet : jamais de vrais noms ici.
// Utilisation dans une page de test, après les scripts de l'app :
//   chargerExemples();

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

const LIENS_EXEMPLE = [
  { id: "l1", de: "r1", vers: "r2",  type: "couple" },
  { id: "l2", de: "r3", vers: "r6",  type: "ami" },
  { id: "l3", de: "r4", vers: "r5",  type: "connaissance" },
  { id: "l4", de: "r8", vers: "r10", type: "conflit" },
];

function chargerExemples() {
  remplacerDonnees({
    relations: RELATIONS_EXEMPLE.map((r) => ({ ...r })),
    liens: LIENS_EXEMPLE.map((l) => ({ ...l })),
  });
  dessinerCarte();
}
