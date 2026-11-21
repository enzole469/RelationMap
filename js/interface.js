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
  vueRelation.hidden = vue !== vueRelation;
  vueLien.hidden = vue !== vueLien;
  vueSauvegarde.hidden = vue !== vueSauvegarde;
  panneau.hidden = false;
  // Les anneaux ne sont visibles que pendant l'édition d'une personne.
  carte.classList.toggle("anneaux-visibles", vue === vueRelation);
}

function fermerPanneau() {
  panneau.hidden = true;
  carte.classList.remove("anneaux-visibles");
  relationOuverte = null;
  paireOuverte = null;
  lienOuvert = null;
  selectionner();
}

document.getElementById("bouton-ajouter").addEventListener("click", ouvrirPourAjouter);
document.getElementById("bouton-sauvegarde").addEventListener("click", ouvrirSauvegarde);
document.getElementById("bouton-fermer").addEventListener("click", fermerPanneau);

// Les actions sur la carte
quandOnCliqueUneBulle = ouvrirPourModifier;
quandOnRelieDeuxBulles = ouvrirLien;
quandOnCliqueUnLien = (lien) =>
  ouvrirLien(trouverRelation(lien.de), trouverRelation(lien.vers));

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

// Un clic sur le fond de la carte ou la touche Échap ferment le panneau.
carte.addEventListener("click", fermerPanneau);
document.addEventListener("keydown", (evenement) => {
  if (evenement.key === "Escape") fermerPanneau();
});
