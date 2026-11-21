// Détection automatique des groupes de personnes.
//
// Un groupe, c'est un "paquet" de personnes plus liées entre elles qu'avec le
// reste. Un simple pont (une personne qui en connaît une autre) ne suffit pas
// à fusionner deux paquets. On utilise une méthode classique appelée
// "Louvain" : chaque personne rejoint le paquet de ses voisins tant que cela
// rend les paquets plus "serrés", puis on recommence avec les paquets eux-mêmes.
//
// Les liens comptent selon leur type (POIDS_GROUPE) ; "se détestent" ne
// rapproche pas. Le calcul donne toujours le même résultat pour les mêmes
// données : les groupes ne changent pas tout seuls d'une ouverture à l'autre.
//
// L'utilisateur peut nommer un groupe et forcer une personne dans un groupe
// (ou hors de tout groupe) : ces choix sont gardés dans les données.

const POIDS_GROUPE = { couple: 3, ami: 2, connaissance: 1, conflit: 0 };
const TAILLE_MIN_GROUPE = 3; // en dessous, pas de grosse bulle de groupe

// --- La méthode de Louvain -----------------------------------------------------

// noeuds : liste d'identifiants ; aretes : [{ a, b, poids }].
// Renvoie une liste de communautés (listes d'identifiants).
function detecterCommunautes(noeuds, aretes) {
  // Au départ, chaque personne est seule dans sa communauté.
  let membresDe = noeuds.map((id) => [id]);  // membres de chaque "super-noeud"
  let voisins = noeuds.map(() => new Map()); // poids vers les autres super-noeuds
  const indice = new Map(noeuds.map((id, i) => [id, i]));
  for (const { a, b, poids } of aretes) {
    const i = indice.get(a), j = indice.get(b);
    if (i === undefined || j === undefined || i === j || poids <= 0) continue;
    voisins[i].set(j, (voisins[i].get(j) || 0) + poids);
    voisins[j].set(i, (voisins[j].get(i) || 0) + poids);
  }

  while (true) {
    const n = voisins.length;
    // degré de chaque noeud (une boucle sur soi-même compte double)
    const degre = voisins.map((v, i) =>
      [...v].reduce((s, [j, p]) => s + (i === j ? 2 * p : p), 0));
    const total2m = d3.sum(degre);
    if (total2m === 0) break;

    const communaute = d3.range(n);
    const totalCommunaute = degre.slice();
    let amelioration = false;
    let encore = true;
    while (encore) {
      encore = false;
      for (let i = 0; i < n; i++) {
        const actuelle = communaute[i];
        // poids de i vers chaque communauté voisine
        const versCommunaute = new Map();
        for (const [j, p] of voisins[i]) {
          if (j === i) continue;
          versCommunaute.set(communaute[j], (versCommunaute.get(communaute[j]) || 0) + p);
        }
        totalCommunaute[actuelle] -= degre[i];
        // gain si i rejoint la communauté c
        const gain = (c) => (versCommunaute.get(c) || 0) - totalCommunaute[c] * degre[i] / total2m;
        let meilleure = actuelle, meilleurGain = gain(actuelle);
        for (const c of [...versCommunaute.keys()].sort((x, y) => x - y)) {
          const g = gain(c);
          if (g > meilleurGain + 1e-12) { meilleure = c; meilleurGain = g; }
        }
        totalCommunaute[meilleure] += degre[i];
        if (meilleure !== actuelle) {
          communaute[i] = meilleure;
          encore = true;
          amelioration = true;
        }
      }
    }
    if (!amelioration) break;

    // On regroupe chaque communauté en un seul super-noeud et on recommence.
    const nouveauxNumeros = new Map();
    for (const c of communaute) if (!nouveauxNumeros.has(c)) nouveauxNumeros.set(c, nouveauxNumeros.size);
    const nouveauxMembres = [...nouveauxNumeros.keys()].map(() => []);
    const nouveauxVoisins = [...nouveauxNumeros.keys()].map(() => new Map());
    communaute.forEach((c, i) => nouveauxMembres[nouveauxNumeros.get(c)].push(...membresDe[i]));
    voisins.forEach((v, i) => {
      const ci = nouveauxNumeros.get(communaute[i]);
      for (const [j, p] of v) {
        const cj = nouveauxNumeros.get(communaute[j]);
        // chaque lien est vu deux fois (de i et de j), sauf les boucles
        const part = i === j ? p : p / 2;
        nouveauxVoisins[ci].set(cj, (nouveauxVoisins[ci].get(cj) || 0) + (ci === cj ? part : p));
      }
    });
    // les liens entre deux super-noeuds différents ont été comptés de chaque côté
    membresDe = nouveauxMembres;
    voisins = nouveauxVoisins;
  }
  return membresDe;
}

// --- Les groupes de RelationMap ---------------------------------------------

// Résultat du dernier calcul :
// - groupesActuels : les groupes d'au moins TAILLE_MIN_GROUPE personnes,
//   [{ id, nom, nomChoisi, membres: [relations] }]
// - unites : TOUS les paquets (groupes, paires, personnes seules), utilisés
//   pour répartir la carte : [[relations]]
let groupesActuels = [];
let unites = [];

const groupeDePersonne = new Map(); // id de relation -> groupe (ou absent)

function poidsLien(l) {
  return POIDS_GROUPE[l.type] || 0;
}

// Ressemblance entre deux listes d'identifiants (0 = rien en commun, 1 = identiques).
function ressemblance(a, b) {
  const sa = new Set(a);
  const communs = b.filter((x) => sa.has(x)).length;
  return communs / (a.length + b.length - communs || 1);
}

// La personne la plus connectée d'un groupe (pour le nommer automatiquement).
function personneCentrale(membres) {
  const ids = new Set(membres.map((r) => r.id));
  const score = (r) => d3.sum(liens, (l) =>
    (l.de === r.id && ids.has(l.vers)) || (l.vers === r.id && ids.has(l.de)) ? poidsLien(l) : 0);
  return membres.slice().sort((a, b) => score(b) - score(a) || a.nom.localeCompare(b.nom))[0];
}

// "Groupe de Bruno", "Groupe d'Alice" (élision devant une voyelle ou un h).
function nomAutomatique(prenom) {
  return /^[aeiouyhàâäéèêëîïôöûüœ]/i.test(prenom) ? "Groupe d'" + prenom : "Groupe de " + prenom;
}

function calculerGroupes() {
  // 1. Détection automatique, sans les personnes placées à la main.
  const placees = relations.filter((r) => r.groupe);
  const libres = relations.filter((r) => !r.groupe);
  const idsLibres = libres.map((r) => r.id).sort();
  const aretes = liens.map((l) => ({ a: l.de, b: l.vers, poids: poidsLien(l) }));
  const communautes = detecterCommunautes(idsLibres, aretes);

  // 2. Chaque paquet assez grand devient un groupe : il reprend l'identité
  //    (et le nom) du groupe connu qui lui ressemble le plus.
  const disponibles = groupesConnus.slice();
  const trouves = [];
  const parTaille = communautes.slice().sort((a, b) => b.length - a.length || a[0].localeCompare(b[0]));
  for (const ids of parTaille) {
    // les personnes placées à la main dans un groupe comptent pour le reconnaître
    const idsAvecPlacees = (g) => ids.concat(placees.filter((r) => r.groupe === g.id).map((r) => r.id));
    let meilleur = null, meilleureRessemblance = 0.34;
    for (const g of disponibles) {
      const r = ressemblance(idsAvecPlacees(g), g.membres);
      if (r > meilleureRessemblance) { meilleur = g; meilleureRessemblance = r; }
    }
    const total = ids.length + (meilleur ? placees.filter((r) => r.groupe === meilleur.id).length : 0);
    if (total < TAILLE_MIN_GROUPE && !(meilleur && meilleur.nomChoisi)) continue;
    if (meilleur) disponibles.splice(disponibles.indexOf(meilleur), 1);
    trouves.push({ connu: meilleur, ids });
  }

  // 3. On construit la liste des groupes (en gardant les groupes nommés par
  //    l'utilisateur même s'ils sont vides, pour qu'ils puissent revenir).
  const parId = new Map(relations.map((r) => [r.id, r]));
  const nouveauxConnus = [];
  groupesActuels = [];
  groupeDePersonne.clear();
  for (const { connu, ids } of trouves) {
    const id = connu ? connu.id : nouvelIdentifiant("g");
    const membres = ids.map((i) => parId.get(i))
      .concat(placees.filter((r) => r.groupe === id));
    if (membres.length < TAILLE_MIN_GROUPE) {
      // trop petit pour être affiché, mais on garde son nom
      if (connu) nouveauxConnus.push({ ...connu, membres: membres.map((r) => r.id) });
      continue;
    }
    const nomChoisi = Boolean(connu && connu.nomChoisi);
    const nom = nomChoisi ? connu.nom : nomAutomatique(personneCentrale(membres).nom);
    const groupe = { id, nom, nomChoisi, membres };
    groupesActuels.push(groupe);
    nouveauxConnus.push({ id, nom, nomChoisi, membres: membres.map((r) => r.id) });
    for (const r of membres) groupeDePersonne.set(r.id, groupe);
  }
  // groupes nommés par l'utilisateur qui n'ont pas été retrouvés
  for (const g of disponibles) {
    if (!g.nomChoisi) continue;
    const membres = placees.filter((r) => r.groupe === g.id);
    if (membres.length >= TAILLE_MIN_GROUPE) {
      const groupe = { id: g.id, nom: g.nom, nomChoisi: true, membres };
      groupesActuels.push(groupe);
      for (const r of membres) groupeDePersonne.set(r.id, groupe);
    }
    nouveauxConnus.push({ ...g, membres: membres.map((r) => r.id) });
  }
  groupesConnus.splice(0, groupesConnus.length, ...nouveauxConnus);

  // 4. Les "unités" pour répartir la carte : chaque groupe, puis chaque petit
  //    paquet restant (paire, personne seule).
  unites = groupesActuels.map((g) => g.membres);
  for (const ids of communautes) {
    const reste = ids.filter((i) => !groupeDePersonne.has(i)).map((i) => parId.get(i));
    if (reste.length) unites.push(reste);
  }
  for (const r of placees) {
    if (!groupeDePersonne.has(r.id)) unites.push([r]); // placée "hors groupe" ou groupe disparu
  }
}

// --- Actions de l'utilisateur sur les groupes -------------------------------------

function trouverGroupe(id) {
  return groupesActuels.find((g) => g.id === id) || groupesConnus.find((g) => g.id === id);
}

function renommerGroupe(id, nom) {
  for (const liste of [groupesActuels, groupesConnus]) {
    const g = liste.find((x) => x.id === id);
    if (g) { g.nom = nom; g.nomChoisi = true; }
  }
}

// Place une personne dans un groupe (id), hors de tout groupe ("aucun"), ou
// la rend au calcul automatique (null).
function placerDansGroupe(idRelation, idGroupe) {
  const r = trouverRelation(idRelation);
  if (idGroupe) r.groupe = idGroupe;
  else delete r.groupe;
}
