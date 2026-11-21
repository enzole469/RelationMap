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
// Les groupes peuvent se chevaucher (une personne dans plusieurs groupes).
// L'utilisateur peut nommer, créer, supprimer un groupe, et corriger les
// appartenances : ces choix sont gardés dans les données.

const POIDS_GROUPE = { couple: 3, ami: 2, connaissance: 1, conflit: 0 };
const TAILLE_MIN_GROUPE = 3; // en dessous, pas de grosse bulle de groupe...
const TAILLE_MIN_GROUPE_NOMME = 2; // ... sauf pour un groupe nommé par l'utilisateur
const tailleMin = (connu) => (connu && connu.nomChoisi ? TAILLE_MIN_GROUPE_NOMME : TAILLE_MIN_GROUPE);

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
//
// Les groupes peuvent se chevaucher : une personne peut appartenir à
// plusieurs groupes.
// - La détection ci-dessus donne à chacun un groupe "principal".
// - Une personne entre aussi dans un autre groupe si une bonne part de ses
//   liens y mène (APPARTENANCE_SECONDAIRE).
// - L'utilisateur peut corriger, personne par personne et groupe par groupe :
//   relation.choixGroupes = { idGroupe: true (ajoutée) | false (retirée) }.
// - Un groupe supprimé par l'utilisateur est gardé comme "refusé" (supprime:
//   true) : la détection ne le recrée pas.
//
// Résultat du dernier calcul :
// - groupesActuels : les groupes affichés, [{ id, nom, nomChoisi, membres: [relations] }]
// - unites : les paquets pour répartir la carte (groupes, paires, personnes
//   seules) : [[relations]]

// Une personne entre aussi dans un autre groupe si :
// - elle connaît au moins 30 % de ses membres (couverture),
// - au moins 30 % du poids de ses liens y mène (part),
// - et au moins l'équivalent d'un lien "amis" (poidsMin).
// Connaître une ou deux personnes d'un grand groupe ne suffit donc pas.
const APPARTENANCE_SECONDAIRE = { couverture: 0.3, part: 0.3, poidsMin: 2 };

let groupesActuels = [];
let unites = [];

const groupesDePersonne = new Map(); // id de relation -> [groupes]
const principalDe = new Map();       // id de relation -> id de son groupe principal (détection)
const appartenanceAuto = new Map();  // id de relation -> Set(id de groupe), avant corrections

// Les groupes d'une personne (liste, éventuellement vide).
const groupesDe = (idRelation) => groupesDePersonne.get(idRelation) || [];

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

// Choix manuel d'une personne pour un groupe : true, false ou undefined.
const choixPour = (r, idGroupe) => (r.choixGroupes ? r.choixGroupes[idGroupe] : undefined);

function calculerGroupes() {
  const parId = new Map(relations.map((r) => [r.id, r]));

  // 1. Détection : un groupe principal par personne (sauf celles que
  //    l'utilisateur a sorties du calcul automatique).
  const idsAuto = relations.filter((r) => !r.horsGroupesAuto).map((r) => r.id).sort();
  const aretes = liens.map((l) => ({ a: l.de, b: l.vers, poids: poidsLien(l) }));
  const communautes = detecterCommunautes(idsAuto, aretes);

  // 2. Chaque paquet assez grand devient un groupe : il reprend l'identité
  //    (nom, ou refus) du groupe connu qui lui ressemble le plus.
  const disponibles = groupesConnus.slice();
  const trouves = []; // { connu, ids }
  const parTaille = communautes.slice().sort((a, b) => b.length - a.length || a[0].localeCompare(b[0]));
  const refuses = [];
  for (const ids of parTaille) {
    let meilleur = null, meilleureRessemblance = 0.34;
    for (const g of disponibles) {
      // les personnes ajoutées à la main comptent pour le reconnaître
      const ajoutees = relations.filter((r) => choixPour(r, g.id) === true).map((r) => r.id);
      const r = ressemblance([...new Set(ids.concat(ajoutees))], g.membres);
      if (r > meilleureRessemblance) { meilleur = g; meilleureRessemblance = r; }
    }
    if (meilleur && meilleur.supprime) {
      // groupe refusé par l'utilisateur : on ne l'affiche pas, mais on suit
      // son évolution pour continuer à le reconnaître
      disponibles.splice(disponibles.indexOf(meilleur), 1);
      refuses.push({ ...meilleur, membres: ids });
      continue;
    }
    if (ids.length < TAILLE_MIN_GROUPE && !(meilleur && meilleur.nomChoisi)) continue;
    if (meilleur) disponibles.splice(disponibles.indexOf(meilleur), 1);
    trouves.push({ connu: meilleur, ids });
  }
  // les groupes créés ou nommés par l'utilisateur, pas retrouvés par la détection
  for (const g of disponibles) {
    if (g.supprime) refuses.push(g);
    else if (g.nomChoisi) trouves.push({ connu: g, ids: [] });
  }

  // 3. Membres : principaux, puis secondaires (une bonne part des liens va
  //    vers le groupe), puis corrections de l'utilisateur.
  const groupes = trouves.map(({ connu, ids }) => ({
    id: connu ? connu.id : nouvelIdentifiant("g"),
    nomChoisi: Boolean(connu && connu.nomChoisi),
    nomConnu: connu ? connu.nom : null,
    principaux: new Set(ids),
    membresIds: new Set(ids),
  }));
  const poidsTotal = new Map();
  for (const l of liens) {
    const p = poidsLien(l);
    poidsTotal.set(l.de, (poidsTotal.get(l.de) || 0) + p);
    poidsTotal.set(l.vers, (poidsTotal.get(l.vers) || 0) + p);
  }
  for (const g of groupes) {
    if (g.principaux.size < TAILLE_MIN_GROUPE) continue; // seulement vers les vrais groupes
    const versGroupe = new Map(); // personne extérieure -> poids de ses liens vers le groupe
    const connus = new Map();     // personne extérieure -> membres du groupe qu'elle connaît
    const noter = (exterieur, membre, p) => {
      versGroupe.set(exterieur, (versGroupe.get(exterieur) || 0) + p);
      if (p > 0) {
        if (!connus.has(exterieur)) connus.set(exterieur, new Set());
        connus.get(exterieur).add(membre);
      }
    };
    for (const l of liens) {
      const p = poidsLien(l);
      if (g.principaux.has(l.de) && !g.principaux.has(l.vers)) noter(l.vers, l.de, p);
      if (g.principaux.has(l.vers) && !g.principaux.has(l.de)) noter(l.de, l.vers, p);
    }
    for (const [id, w] of versGroupe) {
      const r = parId.get(id);
      if (!r || r.horsGroupesAuto) continue;
      const couverture = (connus.get(id) || new Set()).size / g.principaux.size;
      if (w >= APPARTENANCE_SECONDAIRE.poidsMin &&
          w >= APPARTENANCE_SECONDAIRE.part * poidsTotal.get(id) &&
          couverture >= APPARTENANCE_SECONDAIRE.couverture) {
        g.membresIds.add(id);
      }
    }
  }
  appartenanceAuto.clear();
  for (const g of groupes) {
    for (const id of g.membresIds) {
      if (!appartenanceAuto.has(id)) appartenanceAuto.set(id, new Set());
      appartenanceAuto.get(id).add(g.id);
    }
  }
  const parIdGroupe = new Map(groupes.map((g) => [g.id, g]));
  for (const r of relations) {
    for (const [idGroupe, valeur] of Object.entries(r.choixGroupes || {})) {
      const g = parIdGroupe.get(idGroupe);
      if (!g) continue; // groupe disparu ou refusé : choix ignoré
      if (valeur) g.membresIds.add(r.id);
      else g.membresIds.delete(r.id);
    }
  }

  // 4. Les groupes affichés (assez de membres), et la liste des groupes
  //    connus à enregistrer (y compris les groupes nommés trop petits et les
  //    groupes refusés).
  groupesActuels = [];
  groupesDePersonne.clear();
  principalDe.clear();
  for (const g of groupes) for (const id of g.principaux) principalDe.set(id, g.id);
  const nouveauxConnus = [];
  for (const g of groupes) {
    const membres = [...g.membresIds].map((id) => parId.get(id)).filter(Boolean);
    const affichable = membres.length >= (g.nomChoisi ? TAILLE_MIN_GROUPE_NOMME : TAILLE_MIN_GROUPE);
    const nom = g.nomChoisi ? g.nomConnu
      : membres.length ? nomAutomatique(personneCentrale(membres).nom) : g.nomConnu || "Groupe";
    nouveauxConnus.push({ id: g.id, nom, nomChoisi: g.nomChoisi, membres: membres.map((r) => r.id) });
    if (!affichable) continue;
    const groupe = { id: g.id, nom, nomChoisi: g.nomChoisi, membres };
    groupesActuels.push(groupe);
    for (const r of membres) {
      if (!groupesDePersonne.has(r.id)) groupesDePersonne.set(r.id, []);
      groupesDePersonne.get(r.id).push(groupe);
    }
  }
  for (const g of refuses) nouveauxConnus.push({ id: g.id, nom: g.nom, nomChoisi: g.nomChoisi, supprime: true, membres: g.membres });
  groupesConnus.splice(0, groupesConnus.length, ...nouveauxConnus);

  // 5. Les "unités" pour répartir la carte : chaque groupe, puis chaque petit
  //    paquet restant (paire, personne seule).
  unites = groupesActuels.map((g) => g.membres);
  const dansUnGroupe = (id) => groupesDePersonne.has(id);
  for (const ids of communautes) {
    const reste = ids.filter((i) => !dansUnGroupe(i)).map((i) => parId.get(i));
    if (reste.length) unites.push(reste);
  }
  for (const r of relations) {
    if (r.horsGroupesAuto && !dansUnGroupe(r.id)) unites.push([r]);
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

// Fait entrer (true) ou sortir (false) une personne d'un groupe. Si c'est ce
// que la détection automatique ferait d'elle-même, on n'enregistre pas de
// correction.
function definirAppartenance(idRelation, idGroupe, dedans) {
  const r = trouverRelation(idRelation);
  const auto = (appartenanceAuto.get(idRelation) || new Set()).has(idGroupe) && !r.horsGroupesAuto;
  r.choixGroupes = r.choixGroupes || {};
  if (dedans === auto) delete r.choixGroupes[idGroupe];
  else r.choixGroupes[idGroupe] = dedans;
  if (!Object.keys(r.choixGroupes).length) delete r.choixGroupes;
}

// Rend une personne entièrement au calcul automatique (oublie ses corrections).
function retablirGroupesAutomatiques(idRelation) {
  const r = trouverRelation(idRelation);
  delete r.choixGroupes;
  delete r.horsGroupesAuto;
}

// La personne a-t-elle des corrections manuelles de ses groupes ?
const aDesChoixDeGroupes = (r) => Boolean(r.choixGroupes || r.horsGroupesAuto);

// --- Créer, modifier, supprimer un groupe (mode édition « Groupes ») -----------

// Crée un groupe vide, à ce nom. Il s'affiche dès qu'il a 2 membres.
function creerGroupe(nom) {
  const g = { id: nouvelIdentifiant("g"), nom, nomChoisi: true, membres: [] };
  groupesConnus.push(g);
  return g;
}

// Les membres d'un groupe : ceux du dernier calcul, et ceux qu'on y a ajoutés
// à la main (même si le groupe est encore trop petit pour s'afficher).
function membresDuGroupe(id) {
  return relations.filter((r) =>
    choixPour(r, id) === true || (choixPour(r, id) !== false && groupesDe(r.id).some((g) => g.id === id)));
}

// Ajoute une personne au groupe, ou l'en retire si elle en fait déjà partie.
// Ses autres groupes ne changent pas. Renvoie true si elle a été ajoutée.
function basculerMembre(idRelation, idGroupe) {
  const dedans = membresDuGroupe(idGroupe).some((r) => r.id === idRelation);
  definirAppartenance(idRelation, idGroupe, !dedans);
  return !dedans;
}

// Supprime un groupe : il est gardé comme "refusé" pour que la détection ne
// le recrée pas. Ses membres gardent leurs autres groupes.
function supprimerGroupe(id) {
  const g = groupesConnus.find((x) => x.id === id);
  if (g) g.supprime = true;
  for (const r of relations) {
    if (r.choixGroupes) {
      delete r.choixGroupes[id];
      if (!Object.keys(r.choixGroupes).length) delete r.choixGroupes;
    }
  }
}

// Tous les groupes qu'on peut modifier : ceux affichés, puis les groupes
// nommés encore trop petits pour s'afficher.
function groupesModifiables() {
  return groupesActuels.concat(groupesConnus.filter((g) =>
    g.nomChoisi && !g.supprime && !groupesActuels.some((a) => a.id === g.id)));
}
