// Le panneau latéral : ajouter, modifier et supprimer relations et liens.

const panneau = document.getElementById("panneau");
const vueRelation = document.getElementById("vue-relation");
const vueLien = document.getElementById("vue-lien");

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

function ouvrirPourAjouter() {
  relationOuverte = null;
  titreRelation.textContent = "Nouvelle relation";
  validerRelation.textContent = "Ajouter";
  champNom.value = "";
  choisirNiveau(3);
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
    ajouterRelation(nom, niveau);
    dessinerCarte();
    // On laisse le panneau ouvert, vide, pour enchaîner les ajouts.
    champNom.value = "";
    champNom.focus();
  } else {
    modifierRelation(relationOuverte.id, nom, niveau);
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
  panneau.hidden = false;
  // Les anneaux ne sont visibles que pendant l'édition d'une personne
  // (ou en mode édition des disques).
  carte.classList.toggle("anneaux-visibles", vue === vueRelation || modeEdition === "disques");
}

function fermerPanneau() {
  basculerMenu(false);
  panneau.hidden = true;
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
  afficherBarreEdition();
}

boutonEdition.addEventListener("click", () =>
  choisirModeEdition(modeEdition === null ? "liens" : null));
document.getElementById("onglet-disques").addEventListener("click", () => choisirModeEdition("disques"));
document.getElementById("onglet-liens").addEventListener("click", () => choisirModeEdition("liens"));
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

// Une bulle lâchée dans un autre disque change de niveau.
quandOnChangeDeDisque = (relation, niveau) => {
  modifierRelation(relation.id, relation.nom, niveau);
  dessinerCarte();
  const nomNiveau = CERCLES.find((c) => c.niveau === niveau).nom.toLowerCase();
  afficherToast(`${relation.nom} : ${nomNiveau}.`);
};

// Petit message qui s'efface tout seul après quelques secondes.
let minuterieToast = null;
function afficherToast(texte) {
  toast.textContent = texte;
  toast.hidden = false;
  clearTimeout(minuterieToast);
  minuterieToast = setTimeout(() => { toast.hidden = true; }, 2500);
}

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
