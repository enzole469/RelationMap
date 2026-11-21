// Le panneau pour ajouter, modifier et supprimer une relation.

const panneau = document.getElementById("panneau");
const titre = document.getElementById("panneau-titre");
const formulaire = document.getElementById("formulaire");
const champNom = document.getElementById("champ-nom");
const choixNiveau = document.getElementById("choix-niveau");
const boutonValider = document.getElementById("bouton-valider");
const zoneSuppression = document.getElementById("zone-suppression");
const boutonSupprimer = document.getElementById("bouton-supprimer");
const confirmation = document.getElementById("confirmation");

// La relation en cours de modification (null quand on en ajoute une nouvelle).
let relationOuverte = null;

// Les 4 boutons de choix du niveau, un par cercle, à la couleur du cercle.
choixNiveau.innerHTML = CERCLES.map((c) => `
  <label class="choix" style="--couleur:${c.couleur}">
    <input type="radio" name="niveau" value="${c.niveau}">
    <span>${c.nom}</span>
  </label>`).join("");

function niveauChoisi() {
  return Number(formulaire.elements.niveau.value);
}

function cocherNiveau(niveau) {
  formulaire.elements.niveau.value = String(niveau);
}

// --- Ouvrir et fermer le panneau ------------------------------------------

function ouvrirPourAjouter() {
  relationOuverte = null;
  titre.textContent = "Nouvelle relation";
  boutonValider.textContent = "Ajouter";
  champNom.value = "";
  cocherNiveau(3);
  zoneSuppression.hidden = true;
  selectionnerBulle(null);
  panneau.hidden = false;
  champNom.focus();
}

function ouvrirPourModifier(relation) {
  relationOuverte = relation;
  titre.textContent = relation.nom;
  boutonValider.textContent = "Enregistrer";
  champNom.value = relation.nom;
  cocherNiveau(relation.cercle);
  zoneSuppression.hidden = false;
  boutonSupprimer.hidden = false;
  confirmation.hidden = true;
  selectionnerBulle(relation.id);
  panneau.hidden = false;
}

function fermerPanneau() {
  panneau.hidden = true;
  relationOuverte = null;
  selectionnerBulle(null);
}

// --- Les actions ----------------------------------------------------------

formulaire.addEventListener("submit", (evenement) => {
  evenement.preventDefault(); // empêche la page de se recharger
  const nom = champNom.value.trim();
  if (nom === "") {
    champNom.focus();
    return;
  }

  if (relationOuverte === null) {
    ajouterRelation(nom, niveauChoisi());
    dessinerCarte();
    // On laisse le panneau ouvert, vide, pour enchaîner les ajouts.
    champNom.value = "";
    champNom.focus();
  } else {
    modifierRelation(relationOuverte.id, nom, niveauChoisi());
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

// --- Ce qui ouvre ou ferme le panneau -------------------------------------

document.getElementById("bouton-ajouter").addEventListener("click", ouvrirPourAjouter);
document.getElementById("bouton-fermer").addEventListener("click", fermerPanneau);
quandOnCliqueUneBulle = ouvrirPourModifier;

// Un clic sur le fond de la carte ou la touche Échap ferment le panneau.
document.getElementById("carte").addEventListener("click", fermerPanneau);
document.addEventListener("keydown", (evenement) => {
  if (evenement.key === "Escape") fermerPanneau();
});
