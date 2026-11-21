// Le panneau latéral : ajouter, modifier et supprimer relations et liens.

const panneau = document.getElementById("panneau");
const vueRelation = document.getElementById("vue-relation");
const vueLien = document.getElementById("vue-lien");
const vueGroupe = document.getElementById("vue-groupe");

// ===========================================================================
// Vue 1 : une relation
// ===========================================================================

const titreRelation = document.getElementById("titre-relation");
const formulaireRelation = document.getElementById("formulaire-relation");
const champNom = document.getElementById("champ-nom");
const validerRelation = document.getElementById("valider-relation");
const zoneSuppression = document.getElementById("zone-suppression");
const boutonSupprimer = document.getElementById("bouton-supprimer");
const confirmation = document.getElementById("confirmation");

// La relation en cours de modification (null quand on en ajoute une nouvelle).
let relationOuverte = null;

// Les 4 pastilles de choix du niveau, à la couleur de chaque cercle.
document.getElementById("choix-niveau").innerHTML = CERCLES.map((c) => `
  <label class="choix" style="--couleur:${c.couleur}">
    <input type="radio" name="niveau" value="${c.niveau}">
    <span>${c.nom}</span>
  </label>`).join("");

// Choisir un niveau fait ressortir l'anneau correspondant sur la carte.
function choisirNiveau(niveau) {
  formulaireRelation.elements.niveau.value = String(niveau);
  mettreEnAvantAnneau(niveau);
}

document.getElementById("choix-niveau").addEventListener("change", () => {
  mettreEnAvantAnneau(Number(formulaireRelation.elements.niveau.value));
});

// Les groupes de la personne, dans sa fiche : une case par groupe (une
// personne peut être dans plusieurs groupes). Les appartenances choisies à
// la main sont signalées ; on peut les oublier pour revenir à l'automatique.
const choixGroupes = document.getElementById("choix-groupes");
const boutonGroupesAuto = document.getElementById("groupes-auto");

function remplirChoixGroupe(relation) {
  const groupes = groupesModifiables();
  choixGroupes.innerHTML = "";
  if (!groupes.length) {
    const p = document.createElement("p");
    p.className = "vide";
    p.textContent = "Aucun groupe pour l'instant.";
    choixGroupes.append(p);
  }
  for (const g of groupes) {
    const label = document.createElement("label");
    const caseACocher = document.createElement("input");
    caseACocher.type = "checkbox";
    caseACocher.value = g.id;
    caseACocher.checked = Boolean(relation && membresDuGroupe(g.id).some((r) => r.id === relation.id));
    label.append(caseACocher, document.createTextNode(g.nom)); // texte simple, pas de code
    if (relation && relation.choixGroupes && g.id in relation.choixGroupes) {
      const manuel = document.createElement("span");
      manuel.className = "manuel";
      manuel.textContent = "✎ choisi à la main";
      label.append(manuel);
    }
    choixGroupes.append(label);
  }
  boutonGroupesAuto.hidden = !(relation && aDesChoixDeGroupes(relation));
}

// Enregistre les cases cochées / décochées pour une personne.
function enregistrerChoixGroupes(idRelation) {
  for (const caseACocher of choixGroupes.querySelectorAll("input[type=checkbox]")) {
    const dedans = membresDuGroupe(caseACocher.value).some((r) => r.id === idRelation);
    if (caseACocher.checked !== dedans) definirAppartenance(idRelation, caseACocher.value, caseACocher.checked);
  }
}

boutonGroupesAuto.addEventListener("click", () => {
  retablirGroupesAutomatiques(relationOuverte.id);
  dessinerCarte();
  ouvrirPourModifier(trouverRelation(relationOuverte.id));
  afficherToast("Groupes automatiques rétablis.");
});

function ouvrirPourAjouter() {
  relationOuverte = null;
  titreRelation.textContent = "Nouvelle relation";
  validerRelation.textContent = "Ajouter";
  champNom.value = "";
  choisirNiveau(3);
  remplirChoixGroupe(null);
  zoneSuppression.hidden = true;
  selectionner();
  afficherVue(vueRelation);
  champNom.focus();
}

function ouvrirPourModifier(relation) {
  relationOuverte = relation;
  titreRelation.textContent = relation.nom;
  validerRelation.textContent = "Enregistrer";
  champNom.value = relation.nom;
  choisirNiveau(relation.cercle);
  remplirChoixGroupe(relation);
  zoneSuppression.hidden = false;
  boutonSupprimer.hidden = false;
  confirmation.hidden = true;
  selectionner([relation.id]);
  afficherVue(vueRelation);
}

formulaireRelation.addEventListener("submit", (evenement) => {
  evenement.preventDefault(); // empêche la page de se recharger
  const nom = champNom.value.trim();
  const niveau = Number(formulaireRelation.elements.niveau.value);
  if (nom === "") {
    champNom.focus();
    return;
  }

  if (relationOuverte === null) {
    const nouvelle = ajouterRelation(nom, niveau);
    dessinerCarte(); // calcule ses groupes automatiques...
    enregistrerChoixGroupes(nouvelle.id); // ... puis applique les cases cochées
    dessinerCarte();
    // On laisse le panneau ouvert, vide, pour enchaîner les ajouts.
    champNom.value = "";
    champNom.focus();
  } else {
    modifierRelation(relationOuverte.id, nom, niveau);
    enregistrerChoixGroupes(relationOuverte.id);
    dessinerCarte();
    fermerPanneau();
  }
});

boutonSupprimer.addEventListener("click", () => {
  document.getElementById("nom-a-supprimer").textContent = relationOuverte.nom;
  boutonSupprimer.hidden = true;
  confirmation.hidden = false;
});

document.getElementById("annuler-suppression").addEventListener("click", () => {
  confirmation.hidden = true;
  boutonSupprimer.hidden = false;
});

document.getElementById("confirmer-suppression").addEventListener("click", () => {
  supprimerRelation(relationOuverte.id);
  fermerPanneau();
  dessinerCarte();
});

// ===========================================================================
// Vue 2 : un lien entre deux relations
// ===========================================================================

const titreLien = document.getElementById("titre-lien");
const formulaireLien = document.getElementById("formulaire-lien");
const validerLien = document.getElementById("valider-lien");
const zoneSuppressionLien = document.getElementById("zone-suppression-lien");

// Les deux relations concernées, et le lien existant entre elles (ou null).
let paireOuverte = null;
let lienOuvert = null;

// Les 4 choix de type de lien, chacun avec un petit exemple du trait.
document.getElementById("choix-type-lien").innerHTML = TYPES_DE_LIEN.map((t) => `
  <label class="choix choix-lien">
    <input type="radio" name="typeLien" value="${t.type}">
    <span>${exempleDeTrait(t)}${t.nom}</span>
  </label>`).join("");

// Ouvre la vue lien pour deux relations : création si elles ne sont pas
// encore reliées, sinon modification du lien existant.
function ouvrirLien(relationA, relationB) {
  paireOuverte = [relationA, relationB];
  lienOuvert = trouverLien(relationA.id, relationB.id) || null;

  titreLien.textContent = `${relationA.nom} et ${relationB.nom}`;
  formulaireLien.elements.typeLien.value = lienOuvert ? lienOuvert.type : "ami";
  validerLien.textContent = lienOuvert ? "Enregistrer" : "Créer le lien";
  zoneSuppressionLien.hidden = !lienOuvert;
  selectionner([relationA.id, relationB.id], lienOuvert ? lienOuvert.id : null);
  afficherVue(vueLien);
}

formulaireLien.addEventListener("submit", (evenement) => {
  evenement.preventDefault();
  const type = formulaireLien.elements.typeLien.value;
  if (lienOuvert) {
    modifierLien(lienOuvert.id, type);
  } else {
    ajouterLien(paireOuverte[0].id, paireOuverte[1].id, type);
  }
  dessinerCarte();
  fermerPanneau();
});

document.getElementById("supprimer-lien").addEventListener("click", () => {
  supprimerLien(lienOuvert.id);
  dessinerCarte();
  fermerPanneau();
});

// ===========================================================================
// Vue 3 : sauvegarde, export et import
// ===========================================================================

const vueSauvegarde = document.getElementById("vue-sauvegarde");
const choixFichier = document.getElementById("choix-fichier");
const confirmationImport = document.getElementById("confirmation-import");
const messageImport = document.getElementById("message-import");

// Les données lues dans le fichier, en attente de confirmation.
let donneesAImporter = null;

const formatDate = (date) =>
  date.toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" });

const pluriel = (nombre, mot) => `${nombre} ${mot}${nombre > 1 ? "s" : ""}`;

function ouvrirSauvegarde() {
  // État de la sauvegarde automatique
  const etat = document.getElementById("etat-sauvegarde");
  if (etatSauvegarde.fonctionne) {
    etat.textContent = `✓ ${pluriel(relations.length, "personne")} et ` +
      `${pluriel(liens.length, "lien")}, enregistrés automatiquement sur cet appareil.`;
    etat.classList.remove("alerte");
  } else {
    etat.textContent = "⚠ La sauvegarde automatique ne fonctionne pas dans ce " +
      "navigateur. Exportez un fichier pour ne pas perdre vos données.";
    etat.classList.add("alerte");
  }

  // Date du dernier export, avec un rappel s'il date de plus de 2 semaines
  const dernier = dateDernierExport();
  const texteExport = document.getElementById("dernier-export");
  const jours = dernier ? (Date.now() - dernier) / 86400000 : Infinity;
  texteExport.textContent = dernier
    ? `Dernier export : ${formatDate(dernier)}.`
    : "Aucun export pour l'instant.";
  texteExport.classList.toggle("alerte", jours > 14 && relations.length > 0);

  confirmationImport.hidden = true;
  messageImport.hidden = true;
  donneesAImporter = null;
  selectionner();
  afficherVue(vueSauvegarde);
}

document.getElementById("bouton-exporter").addEventListener("click", () => {
  exporterFichier();
  ouvrirSauvegarde(); // met à jour la date du dernier export
});

// Le bouton ouvre la fenêtre de choix de fichier du système.
document.getElementById("bouton-importer").addEventListener("click", () => {
  choixFichier.click();
});

choixFichier.addEventListener("change", async () => {
  const fichier = choixFichier.files[0];
  choixFichier.value = ""; // permet de re-choisir le même fichier plus tard
  if (!fichier) return;

  confirmationImport.hidden = true;
  messageImport.hidden = true;
  try {
    donneesAImporter = await lireFichier(fichier);
  } catch (erreur) {
    afficherMessageImport("⚠ " + erreur.message + " Rien n'a été modifié.", true);
    return;
  }

  document.getElementById("texte-confirmation-import").textContent =
    `Remplacer les données de cet appareil ` +
    `(${pluriel(relations.length, "personne")}, ${pluriel(liens.length, "lien")}) ` +
    `par celles du fichier ` +
    `(${pluriel(donneesAImporter.relations.length, "personne")}, ` +
    `${pluriel(donneesAImporter.liens.length, "lien")}) ? ` +
    `Les données actuelles seront perdues si vous ne les avez pas exportées.`;
  confirmationImport.hidden = false;
});

document.getElementById("confirmer-import").addEventListener("click", () => {
  if (!donneesAImporter) return; // sécurité : rien à importer
  remplacerDonnees(donneesAImporter);
  etatSauvegarde.donneesAbimees = false;
  donneesAImporter = null;
  confirmationImport.hidden = true;
  dessinerCarte();
  afficherMessageImport("✓ Données importées.", false);
});

document.getElementById("annuler-import").addEventListener("click", () => {
  donneesAImporter = null;
  confirmationImport.hidden = true;
});

function afficherMessageImport(texte, estUneErreur) {
  messageImport.textContent = texte;
  messageImport.classList.toggle("alerte", estUneErreur);
  messageImport.hidden = false;
}

// ===========================================================================
// Ouvrir et fermer le panneau
// ===========================================================================

const carte = document.getElementById("carte");

function afficherVue(vue) {
  basculerMenu(false); // sur téléphone, le menu se referme
  vueRelation.hidden = vue !== vueRelation;
  vueLien.hidden = vue !== vueLien;
  vueSauvegarde.hidden = vue !== vueSauvegarde;
  vueGroupe.hidden = vue !== vueGroupe;
  panneau.hidden = false;
  // Les anneaux ne sont visibles que pendant l'édition d'une personne
  // (ou en mode édition des disques).
  carte.classList.toggle("anneaux-visibles", vue === vueRelation || modeEdition === "disques");
}

function fermerPanneau() {
  basculerMenu(false);
  panneau.hidden = true;
  // en mode Groupes, les membres du groupe choisi restent mis en avant
  setTimeout(() => { if (modeEdition === "groupes") afficherOutilsGroupes(); });
  carte.classList.toggle("anneaux-visibles", modeEdition === "disques");
  mettreEnAvantAnneau(null);
  relationOuverte = null;
  paireOuverte = null;
  lienOuvert = null;
  selectionner();
}

document.getElementById("bouton-ajouter").addEventListener("click", ouvrirPourAjouter);
document.getElementById("bouton-sauvegarde").addEventListener("click", ouvrirSauvegarde);
document.getElementById("bouton-fermer").addEventListener("click", fermerPanneau);

// Les actions sur la carte
// Clic sur une bulle : on ouvre sa fiche, et la carte glisse si besoin pour
// montrer "moi", cette personne et ses relations (sans changer le zoom).
quandOnCliqueUneBulle = (relation) => {
  if (modeEdition === "groupes") return basculerDansGroupeEdite(relation);
  ouvrirPourModifier(relation);
  cadrerPersonne(relation, panneau.getBoundingClientRect());
};
// Clic sur un trait : en mode édition des liens, on lui applique l'outil
// choisi ; sinon on ouvre le panneau du lien.
quandOnCliqueUnLien = (lien) => {
  const a = trouverRelation(lien.de), b = trouverRelation(lien.vers);
  if (modeEdition === "liens") appliquerOutilLien(a, b);
  else ouvrirLien(a, b);
};

// ===========================================================================
// Vue 4 : un groupe
// ===========================================================================

const titreGroupe = document.getElementById("titre-groupe");
const champNomGroupe = document.getElementById("champ-nom-groupe");
const boutonPlierGroupe = document.getElementById("bouton-plier-groupe");
const membresGroupe = document.getElementById("membres-groupe");
let idGroupeOuvert = null;

// Clic sur un groupe replié : il s'ouvre (ses membres apparaissent) et son
// panneau s'affiche. Clic sur le halo d'un groupe ouvert : son panneau.
// En mode édition, le clic ouvre seulement le groupe, pour pouvoir
// modifier ses membres.
quandOnCliqueUnGroupe = (groupe) => {
  if (modeEdition === "groupes") {
    // toucher le halo d'un groupe le choisit dans la liste
    groupeEdite = groupe.id;
    afficherOutilsGroupes();
    return;
  }
  if (modeEdition) {
    ouvrirGroupe(groupe.id);
    return;
  }
  ouvrirGroupe(groupe.id);
  ouvrirPanneauGroupe(groupe.id);
};

function ouvrirPanneauGroupe(id) {
  const g = groupesActuels.find((x) => x.id === id);
  if (!g) return fermerPanneau();
  idGroupeOuvert = id;
  titreGroupe.textContent = g.nom;
  champNomGroupe.value = g.nom;
  document.getElementById("info-groupe").textContent =
    `${pluriel(g.membres.length, "personne")}. ` +
    (g.nomChoisi ? "" : "Nom donné automatiquement : vous pouvez le changer.");
  boutonPlierGroupe.textContent = groupesOuverts.has(id) ? "Replier le groupe" : "Ouvrir le groupe";
  // les membres, du plus proche au plus lointain ; un clic ouvre leur fiche
  membresGroupe.innerHTML = "";
  for (const r of g.membres.slice().sort((a, b) => a.cercle - b.cercle || a.nom.localeCompare(b.nom))) {
    const b = document.createElement("button");
    const pastille = document.createElement("span");
    pastille.className = "pastille";
    pastille.style.background = couleurDuCercle(r.cercle);
    b.append(pastille, document.createTextNode(r.nom));
    b.addEventListener("click", () => {
      rendreVisible(r.id);
      const personne = trouverRelation(r.id);
      ouvrirPourModifier(personne);
      cadrerPersonne(personne, panneau.getBoundingClientRect());
    });
    membresGroupe.append(b);
  }
  selectionner(g.membres.map((r) => r.id));
  afficherVue(vueGroupe);
}

document.getElementById("formulaire-groupe").addEventListener("submit", (evenement) => {
  evenement.preventDefault();
  const nom = champNomGroupe.value.trim();
  if (nom === "" || !idGroupeOuvert) return;
  renommerGroupe(idGroupeOuvert, nom);
  dessinerCarte();
  afficherToast(`Groupe renommé : ${nom}.`);
  ouvrirPanneauGroupe(idGroupeOuvert);
});

boutonPlierGroupe.addEventListener("click", () => {
  const id = idGroupeOuvert;
  if (groupesOuverts.has(id)) {
    replierGroupe(id);
    fermerPanneau();
  } else {
    ouvrirGroupe(id);
    ouvrirPanneauGroupe(id);
  }
});

// ===========================================================================
// Mode édition
// ===========================================================================

const boutonEdition = document.getElementById("bouton-edition");
const barreEdition = document.getElementById("barre-edition");
const outilsLiens = document.getElementById("outils-liens");
const consigneEdition = document.getElementById("consigne-edition");
const toast = document.getElementById("toast");

// L'outil de lien choisi : un type de lien, ou "effacer".
let outilLien = "ami";

const CONSIGNES = {
  disques: "Faites glisser une bulle dans un autre disque pour changer sa proximité.",
  liens: "Choisissez un outil, puis faites glisser une bulle sur une autre (ou touchez un trait).",
  groupes: "Choisissez un groupe, puis touchez une personne pour l'y ajouter ou l'en retirer. Activez « Lasso » pour en entourer plusieurs d'un coup.",
};

// Les outils de lien : un bouton par type, plus "Effacer".
outilsLiens.innerHTML =
  TYPES_DE_LIEN.map((t) =>
    `<button class="outil" data-outil="${t.type}">${exempleDeTrait(t)}${t.nom}</button>`).join("") +
  `<button class="outil outil-effacer" data-outil="effacer">✕ Effacer</button>`;

outilsLiens.addEventListener("click", (evenement) => {
  const bouton = evenement.target.closest("button.outil");
  if (!bouton) return;
  outilLien = bouton.dataset.outil;
  afficherBarreEdition();
});

function afficherBarreEdition() {
  barreEdition.hidden = modeEdition === null;
  boutonEdition.setAttribute("aria-pressed", String(modeEdition !== null));
  boutonEdition.classList.toggle("actif", modeEdition !== null);
  for (const onglet of barreEdition.querySelectorAll("[data-mode]")) {
    onglet.setAttribute("aria-selected", String(onglet.dataset.mode === modeEdition));
  }
  outilsLiens.hidden = modeEdition !== "liens";
  outilsGroupes.hidden = modeEdition !== "groupes";
  if (modeEdition === "groupes") afficherOutilsGroupes();
  for (const bouton of outilsLiens.querySelectorAll("button.outil")) {
    bouton.classList.toggle("choisi", bouton.dataset.outil === outilLien);
  }
  consigneEdition.textContent = CONSIGNES[modeEdition] || "";
  carte.classList.toggle("mode-edition", modeEdition !== null);
  carte.classList.toggle("anneaux-visibles", modeEdition === "disques" ||
    (!panneau.hidden && !vueRelation.hidden));
}

function choisirModeEdition(mode) {
  fermerPanneau();
  changerModeEdition(mode);
  if (mode !== "groupes") selectionner(); // plus de membres mis en avant
  formulaireGroupeEdition.hidden = true;
  confirmationSuppressionGroupe.hidden = true;
  afficherBarreEdition();
}

boutonEdition.addEventListener("click", () =>
  choisirModeEdition(modeEdition === null ? "liens" : null));
document.getElementById("onglet-disques").addEventListener("click", () => choisirModeEdition("disques"));
document.getElementById("onglet-liens").addEventListener("click", () => choisirModeEdition("liens"));
document.getElementById("onglet-groupes").addEventListener("click", () => choisirModeEdition("groupes"));
document.getElementById("terminer-edition").addEventListener("click", () => choisirModeEdition(null));

// Applique l'outil de lien choisi entre deux personnes.
function appliquerOutilLien(a, b) {
  const existant = trouverLien(a.id, b.id);
  const paire = `${a.nom} et ${b.nom}`;
  if (outilLien === "effacer") {
    if (!existant) return afficherToast(`${paire} n'étaient pas reliés.`);
    supprimerLien(existant.id);
    afficherToast(`${paire} : lien effacé.`);
  } else {
    const nomType = typeDeLien(outilLien).nom.toLowerCase();
    if (existant && existant.type === outilLien) return afficherToast(`${paire} : déjà « ${nomType} ».`);
    if (existant) modifierLien(existant.id, outilLien);
    else ajouterLien(a.id, b.id, outilLien);
    afficherToast(`${paire} : ${nomType}.`);
  }
  dessinerCarte();
}

quandOnRelieDeuxBulles = appliquerOutilLien;

// --- Onglet Groupes : créer, renommer, supprimer, ajouter / retirer -----------

const outilsGroupes = document.getElementById("outils-groupes");
const selectGroupeEdite = document.getElementById("groupe-edite");
const formulaireGroupeEdition = document.getElementById("formulaire-groupe-edition");
const champNomGroupeEdition = document.getElementById("nom-groupe-edition");
const confirmationSuppressionGroupe = document.getElementById("confirmation-suppression-groupe");
let groupeEdite = null;            // identifiant du groupe choisi
let actionFormulaireGroupe = null; // "creer" ou "renommer"

// Remplit la liste des groupes, et fait ressortir les membres du groupe choisi.
function afficherOutilsGroupes() {
  const groupes = groupesModifiables();
  if (!groupes.some((g) => g.id === groupeEdite)) groupeEdite = groupes.length ? groupes[0].id : null;
  selectGroupeEdite.innerHTML = "";
  for (const g of groupes) {
    const o = document.createElement("option");
    o.value = g.id;
    o.textContent = `${g.nom} (${membresDuGroupe(g.id).length})`;
    selectGroupeEdite.append(o);
  }
  if (!groupes.length) {
    const o = document.createElement("option");
    o.textContent = "Aucun groupe : créez-en un";
    selectGroupeEdite.append(o);
  }
  selectGroupeEdite.disabled = !groupes.length;
  if (groupeEdite) selectGroupeEdite.value = groupeEdite;
  document.getElementById("renommer-groupe").disabled = !groupeEdite;
  boutonLasso.classList.toggle("choisi", lassoActif);
  boutonLasso.setAttribute("aria-pressed", String(lassoActif));
  document.getElementById("supprimer-groupe").disabled = !groupeEdite;
  selectionner(groupeEdite ? membresDuGroupe(groupeEdite).map((r) => r.id) : []);
}

// Bouton « Lasso » : active / désactive le lasso (glisser sur le fond
// entoure des personnes au lieu de déplacer la carte).
const boutonLasso = document.getElementById("bouton-lasso");
boutonLasso.addEventListener("click", () => {
  activerLasso(!lassoActif);
  afficherOutilsGroupes();
  afficherToast(lassoActif
    ? "Lasso activé : glissez sur le fond pour entourer des personnes."
    : "Lasso désactivé : glisser déplace de nouveau la carte.");
});

selectGroupeEdite.addEventListener("change", () => {
  groupeEdite = selectGroupeEdite.value;
  afficherOutilsGroupes();
});

function ouvrirFormulaireGroupe(action) {
  actionFormulaireGroupe = action;
  confirmationSuppressionGroupe.hidden = true;
  formulaireGroupeEdition.hidden = false;
  champNomGroupeEdition.value = action === "renommer" ? trouverGroupe(groupeEdite).nom : "";
  champNomGroupeEdition.focus();
}

document.getElementById("nouveau-groupe").addEventListener("click", () => ouvrirFormulaireGroupe("creer"));
document.getElementById("renommer-groupe").addEventListener("click", () => ouvrirFormulaireGroupe("renommer"));
document.getElementById("annuler-groupe-edition").addEventListener("click", () => {
  formulaireGroupeEdition.hidden = true;
});

formulaireGroupeEdition.addEventListener("submit", (evenement) => {
  evenement.preventDefault();
  const nom = champNomGroupeEdition.value.trim();
  if (nom === "") return;
  if (actionFormulaireGroupe === "creer") {
    groupeEdite = creerGroupe(nom).id;
    afficherToast(`Groupe « ${nom} » créé : touchez des personnes pour l'y ajouter.`);
  } else {
    renommerGroupe(groupeEdite, nom);
    afficherToast(`Groupe renommé : ${nom}.`);
  }
  formulaireGroupeEdition.hidden = true;
  dessinerCarte();
  afficherOutilsGroupes();
});

document.getElementById("supprimer-groupe").addEventListener("click", () => {
  formulaireGroupeEdition.hidden = true;
  const g = trouverGroupe(groupeEdite);
  document.getElementById("texte-suppression-groupe").textContent =
    `Supprimer « ${g.nom} » ? Ses membres ne seront plus dans aucun groupe.`;
  confirmationSuppressionGroupe.hidden = false;
});

document.getElementById("non-supprimer-groupe").addEventListener("click", () => {
  confirmationSuppressionGroupe.hidden = true;
});

document.getElementById("oui-supprimer-groupe").addEventListener("click", () => {
  const nom = trouverGroupe(groupeEdite).nom;
  supprimerGroupe(groupeEdite);
  groupeEdite = null;
  confirmationSuppressionGroupe.hidden = true;
  dessinerCarte();
  afficherOutilsGroupes();
  afficherToast(`Groupe « ${nom} » supprimé.`);
});

// Toucher une personne en mode Groupes : elle entre dans le groupe choisi, ou
// en sort si elle en faisait partie.
function basculerDansGroupeEdite(relation) {
  if (!groupeEdite) return afficherToast("Créez d'abord un groupe avec « + Nouveau ».");
  const nomGroupe = trouverGroupe(groupeEdite).nom;
  const ajoutee = basculerMembre(relation.id, groupeEdite);
  dessinerCarte();
  afficherOutilsGroupes();
  afficherToast(ajoutee ? `${relation.nom} ajouté·e à « ${nomGroupe} ».` : `${relation.nom} retiré·e de « ${nomGroupe} ».`);
}

// Lasso en mode Groupes : les personnes entourées sont toutes ajoutées au
// groupe choisi ; si elles en faisaient déjà toutes partie, elles en sont
// toutes retirées. On peut annuler.
quandOnEntoure = (personnes) => {
  if (!groupeEdite) return afficherToast("Créez d'abord un groupe avec « + Nouveau ».");
  const idGroupe = groupeEdite;
  const nomGroupe = trouverGroupe(idGroupe).nom;
  const membres = new Set(membresDuGroupe(idGroupe).map((r) => r.id));
  const ajout = personnes.some((r) => !membres.has(r.id));
  const concernees = personnes.filter((r) => membres.has(r.id) !== ajout);
  // pour pouvoir annuler : l'état des corrections avant le lasso
  const avant = concernees.map((r) => ({
    r, choix: r.choixGroupes ? { ...r.choixGroupes } : undefined, hors: r.horsGroupesAuto,
  }));
  for (const r of concernees) definirAppartenance(r.id, idGroupe, ajout);
  dessinerCarte();
  afficherOutilsGroupes();
  const n = concernees.length;
  afficherToast(`${pluriel(n, "personne")} ${ajout ? "ajoutée" : "retirée"}${n > 1 ? "s" : ""} ${ajout ? "à" : "de"} « ${nomGroupe} ».`, {
    libelle: "Annuler",
    faire: () => {
      for (const { r, choix, hors } of avant) {
        if (choix) r.choixGroupes = choix; else delete r.choixGroupes;
        if (hors) r.horsGroupesAuto = hors; else delete r.horsGroupesAuto;
      }
      dessinerCarte();
      afficherOutilsGroupes();
    },
  });
};

// Une bulle lâchée dans un autre disque change de niveau.
quandOnChangeDeDisque = (relation, niveau) => {
  modifierRelation(relation.id, relation.nom, niveau);
  dessinerCarte();
  const nomNiveau = CERCLES.find((c) => c.niveau === niveau).nom.toLowerCase();
  afficherToast(`${relation.nom} : ${nomNiveau}.`);
};

// Petit message qui s'efface tout seul après quelques secondes, avec
// éventuellement un bouton d'action (par exemple « Annuler »).
let minuterieToast = null;
const toastTexte = document.getElementById("toast-texte");
const toastAction = document.getElementById("toast-action");
let actionToast = null;

function afficherToast(texte, action = null) {
  toastTexte.textContent = texte;
  actionToast = action;
  toastAction.hidden = !action;
  if (action) toastAction.textContent = action.libelle;
  toast.hidden = false;
  clearTimeout(minuterieToast);
  minuterieToast = setTimeout(() => { toast.hidden = true; actionToast = null; },
    action ? 6000 : 2500);
}

toastAction.addEventListener("click", () => {
  if (actionToast) actionToast.faire();
  actionToast = null;
  toast.hidden = true;
});

// Bouton « Ranger » : range la carte par groupes, avec possibilité d'annuler.
document.getElementById("bouton-ranger").addEventListener("click", () => {
  const anciennes = ranger();
  afficherToast("Carte rangée par groupes.", {
    libelle: "Annuler",
    faire: () => annulerRangement(anciennes),
  });
});

// Recherche : on surligne pendant la frappe ; Entrée centre la carte sur la
// première personne trouvée et ouvre sa fiche ; Échap efface la recherche.
const champRecherche = document.getElementById("recherche");

champRecherche.addEventListener("input", () => {
  const nombre = rechercher(champRecherche.value);
  champRecherche.classList.toggle("sans-resultat", champRecherche.value.trim() !== "" && nombre === 0);
});

champRecherche.addEventListener("keydown", (evenement) => {
  if (evenement.key === "Enter") {
    const trouvee = resultatsRecherche(champRecherche.value)[0];
    if (!trouvee) return;
    viderRecherche();
    champRecherche.blur();
    rendreVisible(trouvee.id); // ouvre le groupe, puis le sous-groupe...
    centrerSur(trouvee);
    ouvrirPourModifier(trouvee);
  } else if (evenement.key === "Escape") {
    evenement.stopPropagation();
    viderRecherche();
  }
});

function viderRecherche() {
  champRecherche.value = "";
  champRecherche.classList.remove("sans-resultat");
  rechercher("");
}

document.getElementById("bouton-recentrer").addEventListener("click", recentrer);

// Menu ☰ (téléphone) : affiche ou cache la légende et le bouton Sauvegarde.
const bandeau = document.querySelector("header");
const boutonMenu = document.getElementById("bouton-menu");

function basculerMenu(ouvrir) {
  bandeau.classList.toggle("menu-ouvert", ouvrir);
  boutonMenu.setAttribute("aria-expanded", String(ouvrir));
}

boutonMenu.addEventListener("click", () =>
  basculerMenu(!bandeau.classList.contains("menu-ouvert")));

// Un clic sur le fond de la carte ou la touche Échap ferment le panneau.
carte.addEventListener("click", fermerPanneau);
// Échap ferme le panneau ; si aucun panneau n'est ouvert, quitte le mode édition.
document.addEventListener("keydown", (evenement) => {
  if (evenement.key !== "Escape") return;
  if (panneau.hidden && modeEdition !== null) choisirModeEdition(null);
  else fermerPanneau();
});
