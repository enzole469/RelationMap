// Dessin de la carte interactive avec la bibliothèque D3.

// Réglages de taille
const ECART_CERCLES = 130; // largeur d'un disque de proximité
const RAYON_BULLE = 22;    // taille d'une bulle de relation
const RAYON_MOI = 34;      // taille de la bulle centrale
const MARGE = 6;           // petit espace entre une bulle et le bord de son disque

// Bord extérieur du disque d'un niveau (niveau 1 = 130, niveau 2 = 260, ...)
const rayonDuCercle = (niveau) => niveau * ECART_CERCLES;
const couleurDuCercle = (niveau) => CERCLES.find((c) => c.niveau === niveau).couleur;

// Distance au centre minimale et maximale pour le centre d'une bulle
// d'un niveau donné, pour qu'elle reste entièrement dans son disque.
function limitesDuDisque(niveau) {
  const interieur = niveau === 1 ? RAYON_MOI + MARGE : rayonDuCercle(niveau - 1);
  return {
    min: interieur + RAYON_BULLE + MARGE,
    max: rayonDuCercle(niveau) - RAYON_BULLE - MARGE,
  };
}

// Petit dessin d'un type de lien, utilisé dans la légende et le panneau.
function exempleDeTrait(t) {
  const pointilles = t.pointilles ? `stroke-dasharray="${t.pointilles}"` : "";
  return `<svg class="exemple-trait" width="32" height="10" aria-hidden="true">
    <line x1="2" y1="5" x2="30" y2="5" stroke="${t.couleur}"
      stroke-width="${t.epaisseur}" ${pointilles}/></svg>`;
}

// --- Légende en haut de la page -------------------------------------------

d3.select("#legende")
  .selectAll("li")
  .data(CERCLES)
  .join("li")
  .html((c) => `<span class="pastille" style="background:${c.couleur}"></span>${c.nom}`);

d3.select("#legende-liens")
  .selectAll("li")
  .data(TYPES_DE_LIEN)
  .join("li")
  .html((t) => exempleDeTrait(t) + t.nom);

// --- Mise en place de la zone de dessin -----------------------------------

// Le point (0, 0) est au centre de la carte : c'est "moi".
const tailleVue = (rayonDuCercle(CERCLES.length) + 40) * 2;
const svg = d3.select("#carte")
  .attr("viewBox", [-tailleVue / 2, -tailleVue / 2, tailleVue, tailleVue]);

// "monde" contient tout ce qui se déplace et grossit avec le zoom.
const monde = svg.append("g");

svg.call(
  d3.zoom()
    .scaleExtent([0.4, 4]) // zoom minimum et maximum
    .on("zoom", (evenement) => monde.attr("transform", evenement.transform))
);

// --- Les disques de proximité ---------------------------------------------

// Chaque niveau est un anneau coloré, entre le cercle précédent et le sien.
const formeAnneau = d3.arc()
  .innerRadius((c) => (c.niveau === 1 ? 0 : rayonDuCercle(c.niveau - 1)))
  .outerRadius((c) => rayonDuCercle(c.niveau))
  .startAngle(0)
  .endAngle(2 * Math.PI);

const anneaux = monde.append("g")
  .selectAll("path")
  .data(CERCLES)
  .join("path")
  .attr("class", "anneau")
  .attr("d", formeAnneau)
  .attr("fill", (c) => c.couleur)
  .attr("stroke", (c) => c.couleur);

// Fait ressortir l'anneau d'un niveau (null = aucun).
function mettreEnAvantAnneau(niveau) {
  anneaux.classed("choisi", (c) => c.niveau === niveau);
}

// --- Moi, au centre -------------------------------------------------------

const moi = monde.append("g").attr("class", "moi");
moi.append("circle").attr("r", RAYON_MOI);
moi.append("text").text("Moi");

// --- Les calques : les liens sont dessinés sous les bulles ----------------

const calqueLiens = monde.append("g");
const calqueBulles = monde.append("g");
let traits = calqueLiens.selectAll("g.lien");
let bulles = calqueBulles.selectAll("g.bulle");

// Pour retrouver vite une relation à partir de son identifiant.
let relationsParId = new Map();

// Ce qui est mis en évidence (bulles et/ou lien dont le panneau est ouvert).
let bullesSelectionnees = [];
let lienSelectionne = null;

// Fonctions appelées lors des actions sur la carte (définies dans interface.js).
let quandOnCliqueUneBulle = () => {};
let quandOnCliqueUnLien = () => {};
let quandOnRelieDeuxBulles = () => {};

// --- La "physique" qui place les bulles -----------------------------------

// Règle maison : une bulle sortie de son disque y est ramenée doucement.
// À l'intérieur du disque, elle reste libre là où on la pose.
function forceDisque() {
  for (const r of relations) {
    const { min, max } = limitesDuDisque(r.cercle);
    const distance = Math.hypot(r.x, r.y) || 1;
    let cible = null;
    if (distance < min) cible = min;
    if (distance > max) cible = max;
    if (cible !== null) {
      const traction = ((distance - cible) / distance) * 0.3;
      r.vx -= r.x * traction;
      r.vy -= r.y * traction;
    }
  }
}

// Déplace bulles et traits à leur nouvelle position (appelé en continu).
function mettreAJourPositions() {
  bulles.attr("transform", (r) => `translate(${r.x},${r.y})`);
  traits.selectAll("line")
    .attr("x1", (l) => relationsParId.get(l.de).x)
    .attr("y1", (l) => relationsParId.get(l.de).y)
    .attr("x2", (l) => relationsParId.get(l.vers).x)
    .attr("y2", (l) => relationsParId.get(l.vers).y);
}

// --- Les groupes ------------------------------------------------------------

// Un groupe = des personnes reliées entre elles, directement ou par
// l'intermédiaire d'autres. Une personne sans lien forme un groupe à elle
// seule. Les liens "se détestent" ne créent pas de groupe.
let groupes = [];

function calculerGroupes() {
  // Chaque personne pointe vers un "représentant" de son groupe.
  const representant = new Map(relations.map((r) => [r.id, r.id]));
  const trouverRepresentant = (id) =>
    representant.get(id) === id ? id : trouverRepresentant(representant.get(id));

  // Chaque lien fusionne les groupes de ses deux personnes.
  for (const l of liens) {
    if (typeDeLien(l.type).attraction > 0) {
      representant.set(trouverRepresentant(l.de), trouverRepresentant(l.vers));
    }
  }

  const parRepresentant = new Map();
  for (const r of relations) {
    const chef = trouverRepresentant(r.id);
    if (!parRepresentant.has(chef)) parRepresentant.set(chef, []);
    parRepresentant.get(chef).push(r);
  }
  groupes = [...parRepresentant.values()];
}

// Force d'écartement entre groupes, "autour du cercle" : comme des convives
// autour d'une table ronde, chaque groupe s'éloigne de ses voisins jusqu'à
// ce que tous soient répartis uniformément sur le tour.
// La poussée est forte entre groupes proches et faible entre groupes
// éloignés : le mouvement ralentit à mesure que la répartition s'équilibre.
const ECARTEMENT_GROUPES = 0.3;  // intensité de la poussée
const VITESSE_MAX_GROUPES = 0.4; // limite de vitesse, pour un mouvement lent

// Écart d'angle entre a et b, ramené entre -π et π.
function ecartAngle(a, b) {
  let ecart = a - b;
  while (ecart > Math.PI) ecart -= 2 * Math.PI;
  while (ecart < -Math.PI) ecart += 2 * Math.PI;
  return ecart;
}

function forceGroupes(alpha) {
  if (groupes.length < 2) return;

  // Centre de chaque groupe (moyenne des positions de ses membres)
  // et sa direction vue depuis "moi" (son angle).
  const centres = groupes.map((membres) => {
    const x = d3.mean(membres, (r) => r.x);
    const y = d3.mean(membres, (r) => r.y);
    return { x, y, angle: Math.atan2(y, x), distance: Math.hypot(x, y) || 1 };
  });

  centres.forEach((centre, i) => {
    // Somme des poussées des autres groupes : chacun pousse d'autant plus
    // fort qu'il est proche en angle (0.15 évite une poussée infinie).
    let somme = 0;
    centres.forEach((autre, j) => {
      if (i === j) return;
      const ecart = ecartAngle(centre.angle, autre.angle);
      somme += Math.sign(ecart) / Math.max(Math.abs(ecart), 0.15);
    });

    // La racine carrée fait durer cette poussée plus longtemps que les
    // autres règles pendant que l'animation ralentit : les groupes ont le
    // temps de finir de se répartir.
    let poussee = ECARTEMENT_GROUPES * Math.sqrt(alpha) * somme;
    poussee = Math.max(-VITESSE_MAX_GROUPES, Math.min(VITESSE_MAX_GROUPES, poussee));

    // On pousse tout le groupe le long du cercle (perpendiculairement
    // à la direction de "moi"), sans le rapprocher ni l'éloigner du centre.
    const tx = -centre.y / centre.distance;
    const ty = centre.x / centre.distance;
    for (const r of groupes[i]) {
      r.vx += tx * poussee;
      r.vy += ty * poussee;
    }
  });
}

// --- Les liens ----------------------------------------------------------------

// Les bulles reliées s'attirent, plus ou moins selon le type de lien.
const forceLiens = d3.forceLink()
  .id((r) => r.id)
  .distance((l) => typeDeLien(l.type).distance)
  .strength((l) => typeDeLien(l.type).attraction);

// Quatre règles : chaque bulle reste dans son disque (la plus forte),
// les bulles reliées se rapprochent, les groupes s'écartent les uns des
// autres, et les bulles se repoussent pour ne pas se chevaucher.
// alphaDecay règle la durée de l'animation : plus il est petit, plus le
// mouvement dure longtemps en ralentissant (ici environ 40 secondes).
const simulation = d3.forceSimulation()
  .alphaDecay(0.003)
  .force("disque", forceDisque)
  .force("liens", forceLiens)
  .force("groupes", forceGroupes)
  .force("ecart", d3.forceCollide(RAYON_BULLE + 14))
  .on("tick", mettreAJourPositions)
  .on("end", sauvegarder); // les bulles se sont arrêtées : on garde leur place

// --- Faire glisser une bulle ----------------------------------------------

// Lâchée dans le vide : la bulle reste là (ou revient dans son disque).
// Lâchée sur une autre bulle : on propose de créer un lien entre les deux,
// et la bulle déplacée retourne à sa place de départ.
let positionDeDepart = null;
let bulleVisee = null;

// La bulle (autre que celle qu'on déplace) qui se trouve sous le pointeur.
// La zone de détection est un peu plus large que la bulle, pour qu'il
// suffise d'arriver à peu près dessus.
function bulleSousLePointeur(x, y, deplacee) {
  return relations.find(
    (r) => r !== deplacee && Math.hypot(r.x - x, r.y - y) < RAYON_BULLE * 1.8
  ) || null;
}

const glisser = d3.drag()
  .on("start", (evenement, r) => {
    if (!evenement.active) simulation.alphaTarget(0.3).restart();
    positionDeDepart = { x: r.x, y: r.y };
    // Pendant le glissement, toutes les bulles sont figées sur place :
    // sinon la bulle visée serait repoussée et s'enfuirait.
    for (const autre of relations) {
      autre.fx = autre.x;
      autre.fy = autre.y;
    }
  })
  .on("drag", (evenement, r) => {
    r.fx = evenement.x;
    r.fy = evenement.y;
    bulleVisee = bulleSousLePointeur(evenement.x, evenement.y, r);
    bulles.classed("visee", (b) => b === bulleVisee);
  })
  .on("end", (evenement, r) => {
    if (!evenement.active) simulation.alphaTarget(0);
    // Toutes les bulles redeviennent libres.
    for (const autre of relations) {
      autre.fx = null;
      autre.fy = null;
    }
    if (bulleVisee) {
      const cible = bulleVisee;
      bulleVisee = null;
      bulles.classed("visee", false);
      r.x = positionDeDepart.x;
      r.y = positionDeDepart.y;
      r.vx = 0;
      r.vy = 0;
      quandOnRelieDeuxBulles(r, cible);
    }
    sauvegarder();
  });

// --- Mise à jour de la carte ----------------------------------------------

// Une nouvelle bulle apparaît à un endroit au hasard dans son disque.
function placerDansSonDisque(r) {
  const { min, max } = limitesDuDisque(r.cercle);
  const angle = Math.random() * 2 * Math.PI;
  const distance = min + Math.random() * (max - min);
  r.x = Math.cos(angle) * distance;
  r.y = Math.sin(angle) * distance;
}

// Met la carte en accord avec les listes de relations et de liens :
// ajoute ce qui est nouveau, retire ce qui est supprimé, met à jour le reste.
function dessinerCarte() {
  for (const r of relations) {
    if (r.x === undefined) placerDansSonDisque(r);
  }
  relationsParId = new Map(relations.map((r) => [r.id, r]));

  // Les traits : une ligne large et invisible pour cliquer facilement,
  // et la ligne visible par-dessus.
  traits = calqueLiens
    .selectAll("g.lien")
    .data(liens, (l) => l.id)
    .join((entree) => {
      const nouveau = entree.append("g")
        .attr("class", "lien")
        .on("click", (evenement, l) => {
          evenement.stopPropagation();
          quandOnCliqueUnLien(l);
        });
      nouveau.append("line").attr("class", "lien-zone");
      nouveau.append("line").attr("class", "lien-trait");
      return nouveau;
    });

  traits.select(".lien-trait")
    .attr("stroke", (l) => typeDeLien(l.type).couleur)
    .attr("stroke-width", (l) => typeDeLien(l.type).epaisseur)
    .attr("stroke-dasharray", (l) => typeDeLien(l.type).pointilles);

  // Les bulles
  bulles = calqueBulles
    .selectAll("g.bulle")
    .data(relations, (r) => r.id)
    .join((entree) => {
      const nouvelle = entree.append("g")
        .attr("class", "bulle")
        .call(glisser)
        .on("click", (evenement, r) => {
          evenement.stopPropagation();
          quandOnCliqueUneBulle(r);
        });
      nouvelle.append("circle").attr("r", RAYON_BULLE);
      nouvelle.append("text").attr("y", RAYON_BULLE + 16);
      return nouvelle;
    });

  bulles.select("circle").attr("fill", (r) => couleurDuCercle(r.cercle));
  bulles.select("text").text((r) => r.nom);

  afficherSelection();
  mettreAJourPositions();
  simulation.nodes(relations);
  calculerGroupes();
  // D3 transforme les liens qu'on lui donne : on lui passe donc des copies,
  // sans les liens "se détestent" qui n'attirent pas.
  forceLiens.links(
    liens
      .filter((l) => typeDeLien(l.type).attraction > 0)
      .map((l) => ({ source: l.de, target: l.vers, type: l.type }))
  );
  simulation.alpha(0.5).restart();

  // Message d'accueil quand la carte est vide (ou alerte si les données
  // enregistrées n'ont pas pu être lues au démarrage).
  const messageVide = document.getElementById("message-vide");
  messageVide.hidden = relations.length > 0;
  if (etatSauvegarde.donneesAbimees && relations.length === 0) {
    messageVide.classList.add("alerte");
    messageVide.innerHTML = "⚠ Vos données enregistrées n'ont pas pu être lues " +
      "(elles ont été mises de côté, pas effacées).<br>Ouvrez <strong>Sauvegarde</strong> " +
      "et importez votre dernier fichier exporté.";
  } else {
    messageVide.classList.remove("alerte");
  }

  // Chaque changement passe par ici : c'est donc ici qu'on sauvegarde.
  sauvegarder();
}

// Met en évidence des bulles et/ou un lien (listes vides / null = rien).
function selectionner(idsBulles = [], idLien = null) {
  bullesSelectionnees = idsBulles;
  lienSelectionne = idLien;
  afficherSelection();
}

function afficherSelection() {
  bulles.classed("selectionnee", (r) => bullesSelectionnees.includes(r.id));
  traits.classed("selectionne", (l) => l.id === lienSelectionne);
}

// Quand on quitte la page ou qu'on change d'application (sur téléphone),
// on enregistre la position actuelle des bulles.
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") sauvegarder();
});

// Au démarrage, si les bulles ont une place enregistrée, la carte reprend
// telle qu'on l'a laissée : l'animation repart très doucement.
const positionsConnues = relations.length > 0 && relations.every((r) => r.x !== undefined);
dessinerCarte();
if (positionsConnues) simulation.alpha(0.05);
