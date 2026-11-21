// Les données de l'app, les actions qui les modifient, et leur sauvegarde.

// Les 4 cercles de proximité. Le niveau 1 est le plus proche du centre ("moi").
const CERCLES = [
  { niveau: 1, nom: "Intime",       couleur: "#e76f51" },
  { niveau: 2, nom: "Proche",       couleur: "#f4a261" },
  { niveau: 3, nom: "Ami",          couleur: "#2a9d8f" },
  { niveau: 4, nom: "Connaissance", couleur: "#577590" },
];

// Les types de liens entre deux relations, et leur apparence sur la carte.
// epaisseur : largeur du trait ; pointilles : longueur trait/espace (null = plein).
// attraction : force avec laquelle les deux bulles se rapprochent (0 = aucune,
// 1 = très forte) ; distance : écart visé entre leurs centres.
const TYPES_DE_LIEN = [
  { type: "couple",       nom: "En couple",      couleur: "#2b2d42", epaisseur: 5,   pointilles: null,   attraction: 0.7,  distance: 75 },
  { type: "ami",          nom: "Amis",           couleur: "#2b2d42", epaisseur: 2.5, pointilles: null,   attraction: 0.4,  distance: 90 },
  { type: "connaissance", nom: "Se connaissent", couleur: "#2b2d42", epaisseur: 1.5, pointilles: "3 5",  attraction: 0.15, distance: 110 },
  { type: "conflit",      nom: "Se détestent",   couleur: "#c0392b", epaisseur: 2.5, pointilles: "10 6", attraction: 0,    distance: 0 },
];

const typeDeLien = (type) => TYPES_DE_LIEN.find((t) => t.type === type);

const LONGUEUR_MAX_NOM = 40;

// Les listes affichées sur la carte. Elles sont remplies au démarrage avec
// les données sauvegardées sur l'appareil (voir plus bas).
const relations = [];
const liens = [];
// Les groupes connus (noms choisis, membres au dernier calcul) : voir groupes.js.
const groupesConnus = [];

// Crée un identifiant unique ("r..." relation, "l..." lien, "g..." groupe).
function nouvelIdentifiant(prefixe) {
  return prefixe + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// --- Les relations ----------------------------------------------------------

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

// --- Les liens --------------------------------------------------------------

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

// ============================================================================
// Sauvegarde
// ============================================================================

// Les données sont gardées dans le "localStorage" du navigateur : un petit
// espace de stockage propre à l'app, sur cet appareil uniquement.
// Rien n'est envoyé sur Internet.
const CLE_DONNEES = "relationmap-donnees";
const CLE_DERNIER_EXPORT = "relationmap-dernier-export";
const VERSION_FORMAT = 3; // 2 : ajout des groupes ; 3 : groupes qui se chevauchent

// État de la sauvegarde automatique, affiché dans le panneau "Sauvegarde".
const etatSauvegarde = { fonctionne: true, derniereFois: null, donneesAbimees: false };

// Les données dans le format enregistré (le même que le fichier d'export).
// Les positions sont arrondies : inutile de garder 15 chiffres après la virgule.
function donneesASauvegarder() {
  return {
    app: "RelationMap",
    version: VERSION_FORMAT,
    date: new Date().toISOString(),
    relations: relations.map((r) => ({
      id: r.id,
      nom: r.nom,
      cercle: r.cercle,
      choixGroupes: r.choixGroupes,
      horsGroupesAuto: r.horsGroupesAuto || undefined,
      x: r.x === undefined ? undefined : Math.round(r.x),
      y: r.y === undefined ? undefined : Math.round(r.y),
    })),
    liens: liens.map((l) => ({ id: l.id, de: l.de, vers: l.vers, type: l.type })),
    groupes: groupesConnus.map((g) => ({ id: g.id, nom: g.nom, nomChoisi: g.nomChoisi,
      supprime: g.supprime || undefined, membres: g.membres })),
  };
}

// Enregistre tout sur l'appareil. Appelée après chaque changement.
function sauvegarder() {
  try {
    localStorage.setItem(CLE_DONNEES, JSON.stringify(donneesASauvegarder()));
    etatSauvegarde.fonctionne = true;
    etatSauvegarde.derniereFois = new Date();
  } catch (erreur) {
    etatSauvegarde.fonctionne = false;
    console.error("Sauvegarde impossible :", erreur);
  }
}

// Vérifie que des données (venant de l'appareil ou d'un fichier importé) sont
// correctes, et renvoie une version propre. En cas de problème, déclenche une
// erreur avec un message compréhensible, et rien n'est modifié.
function verifierDonnees(donnees) {
  if (!donnees || donnees.app !== "RelationMap") {
    throw new Error("Ce fichier ne vient pas de RelationMap.");
  }
  if (donnees.version > VERSION_FORMAT) {
    throw new Error("Ce fichier vient d'une version plus récente de l'app.");
  }
  if (!Array.isArray(donnees.relations) || !Array.isArray(donnees.liens)) {
    throw new Error("Le fichier est incomplet.");
  }

  const niveaux = CERCLES.map((c) => c.niveau);
  const ids = new Set();
  const relationsPropres = donnees.relations.map((r, i) => {
    const nom = typeof r.nom === "string" ? r.nom.trim() : "";
    if (typeof r.id !== "string" || ids.has(r.id) || nom === "" ||
        nom.length > LONGUEUR_MAX_NOM || !niveaux.includes(r.cercle)) {
      throw new Error(`La personne n°${i + 1} du fichier est invalide.`);
    }
    ids.add(r.id);
    const propre = { id: r.id, nom, cercle: r.cercle };
    // corrections manuelles des groupes : { idGroupe: true | false }
    if (r.choixGroupes && typeof r.choixGroupes === "object" && !Array.isArray(r.choixGroupes)) {
      const choix = {};
      for (const [id, valeur] of Object.entries(r.choixGroupes)) {
        if (id.length <= 40 && typeof valeur === "boolean") choix[id] = valeur;
      }
      if (Object.keys(choix).length) propre.choixGroupes = choix;
    }
    if (r.horsGroupesAuto === true) propre.horsGroupesAuto = true;
    // ancien format (version 2) : un seul groupe choisi à la main, ou "aucun"
    if (typeof r.groupe === "string" && r.groupe.length <= 40) {
      propre.horsGroupesAuto = true;
      if (r.groupe !== "aucun") propre.choixGroupes = { [r.groupe]: true };
    }
    if (Number.isFinite(r.x) && Number.isFinite(r.y)) {
      propre.x = r.x;
      propre.y = r.y;
    }
    return propre;
  });

  const liensPropres = donnees.liens.map((l, i) => {
    if (typeof l.id !== "string" || !ids.has(l.de) || !ids.has(l.vers) ||
        l.de === l.vers || !typeDeLien(l.type)) {
      throw new Error(`Le lien n°${i + 1} du fichier est invalide.`);
    }
    return { id: l.id, de: l.de, vers: l.vers, type: l.type };
  });

  // Les groupes (absents des fichiers de la version 1)
  const groupes = Array.isArray(donnees.groupes) ? donnees.groupes : [];
  const groupesPropres = groupes.map((g, i) => {
    const nom = typeof g.nom === "string" ? g.nom.trim() : "";
    if (typeof g.id !== "string" || nom === "" || nom.length > LONGUEUR_MAX_NOM || !Array.isArray(g.membres)) {
      throw new Error(`Le groupe n°${i + 1} du fichier est invalide.`);
    }
    const propre = { id: g.id, nom, nomChoisi: g.nomChoisi === true,
                     membres: g.membres.filter((m) => typeof m === "string" && ids.has(m)) };
    if (g.supprime === true) propre.supprime = true;
    return propre;
  });

  return { relations: relationsPropres, liens: liensPropres, groupes: groupesPropres };
}

// Vrai juste après un chargement ou un import : les groupes s'affichent alors
// repliés. Ensuite, un groupe qui apparaît suite à une modification
// s'affiche ouvert (voir carte.js).
let donneesNeuves = true;

// Remplace toutes les données actuelles par des données vérifiées.
function remplacerDonnees(donneesVerifiees) {
  donneesNeuves = true;
  relations.splice(0, relations.length, ...donneesVerifiees.relations);
  liens.splice(0, liens.length, ...donneesVerifiees.liens);
  groupesConnus.splice(0, groupesConnus.length, ...(donneesVerifiees.groupes || []));
}

// Au démarrage : récupère les données enregistrées sur l'appareil.
function chargerDepuisAppareil() {
  let texte = null;
  try {
    texte = localStorage.getItem(CLE_DONNEES);
  } catch (erreur) {
    etatSauvegarde.fonctionne = false;
    console.error("Lecture impossible :", erreur);
    return;
  }
  if (texte === null) return; // première utilisation : carte vide

  try {
    remplacerDonnees(verifierDonnees(JSON.parse(texte)));
  } catch (erreur) {
    // Données abîmées : on les met de côté au lieu de les écraser,
    // pour pouvoir les récupérer plus tard si besoin.
    console.error("Données enregistrées illisibles :", erreur);
    etatSauvegarde.donneesAbimees = true;
    try {
      localStorage.setItem(CLE_DONNEES + "-abimees-" + Date.now(), texte);
    } catch (e) { /* rien de plus à faire */ }
  }
}

// --- Export et import d'un fichier --------------------------------------------

// Télécharge toutes les données dans un fichier .json.
// Le nom contient "sauvegarde" pour être ignoré par Git (voir .gitignore).
function exporterFichier() {
  const contenu = JSON.stringify(donneesASauvegarder(), null, 2);
  const fichier = new Blob([contenu], { type: "application/json" });
  const lien = document.createElement("a");
  lien.href = URL.createObjectURL(fichier);
  lien.download = `relationmap-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(lien);
  lien.click();
  lien.remove();
  setTimeout(() => URL.revokeObjectURL(lien.href), 1000);
  try {
    localStorage.setItem(CLE_DERNIER_EXPORT, new Date().toISOString());
  } catch (e) { /* pas grave */ }
}

function dateDernierExport() {
  try {
    const texte = localStorage.getItem(CLE_DERNIER_EXPORT);
    return texte ? new Date(texte) : null;
  } catch (e) {
    return null;
  }
}

// Lit un fichier choisi par l'utilisateur et renvoie ses données vérifiées
// (sans encore remplacer quoi que ce soit).
async function lireFichier(fichier) {
  let donnees;
  try {
    donnees = JSON.parse(await fichier.text());
  } catch (erreur) {
    throw new Error("Ce fichier est illisible ou abîmé.");
  }
  return verifierDonnees(donnees);
}

// Demande au navigateur de ne pas effacer nos données s'il manque de place.
if (navigator.storage && navigator.storage.persist) {
  navigator.storage.persist().catch(() => {});
}

chargerDepuisAppareil();
