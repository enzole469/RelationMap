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

// --- Légende en haut de la page -------------------------------------------

d3.select("#legende")
  .selectAll("li")
  .data(CERCLES)
  .join("li")
  .html((c) => `<span class="pastille" style="background:${c.couleur}"></span>${c.nom}`);

// --- Mise en place de la zone de dessin -----------------------------------

// Le point (0, 0) est au centre de la carte : c'est "moi".
const tailleVue = (rayonDuCercle(CERCLES.length) + 60) * 2;
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

monde.append("g")
  .selectAll("path")
  .data(CERCLES)
  .join("path")
  .attr("class", "anneau")
  .attr("d", formeAnneau)
  .attr("fill", (c) => c.couleur)
  .attr("stroke", (c) => c.couleur);

// --- Moi, au centre -------------------------------------------------------

const moi = monde.append("g").attr("class", "moi");
moi.append("circle").attr("r", RAYON_MOI);
moi.append("text").text("Moi");

// --- Les bulles de relations ----------------------------------------------

// Copie des données, car D3 va y ajouter les positions (x, y).
const relations = RELATIONS_EXEMPLE.map((r) => ({ ...r }));

// Position de départ : chaque relation est répartie dans son disque.
for (const cercle of CERCLES) {
  const membres = relations.filter((r) => r.cercle === cercle.niveau);
  const { min, max } = limitesDuDisque(cercle.niveau);
  membres.forEach((r, i) => {
    const angle = (i / membres.length) * 2 * Math.PI + cercle.niveau;
    const distance = min + Math.random() * (max - min);
    r.x = Math.cos(angle) * distance;
    r.y = Math.sin(angle) * distance;
  });
}

const bulles = monde.append("g")
  .selectAll("g")
  .data(relations, (r) => r.id)
  .join("g")
  .attr("class", "bulle");

bulles.append("circle")
  .attr("r", RAYON_BULLE)
  .attr("fill", (r) => couleurDuCercle(r.cercle));

bulles.append("text")
  .attr("y", RAYON_BULLE + 16)
  .text((r) => r.nom);

// --- Les noms des disques, au-dessus des bulles pour rester lisibles -------

monde.append("g")
  .selectAll("text")
  .data(CERCLES)
  .join("text")
  .attr("class", "nom-anneau")
  .attr("y", (c) => -rayonDuCercle(c.niveau) + 18)
  .text((c) => c.nom);

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

// Deux règles : chaque bulle reste dans son disque,
// et les bulles se repoussent pour ne pas se chevaucher.
const simulation = d3.forceSimulation(relations)
  .force("disque", forceDisque)
  .force("ecart", d3.forceCollide(RAYON_BULLE + 14))
  .on("tick", () => {
    bulles.attr("transform", (r) => `translate(${r.x},${r.y})`);
  });

// --- Déplacer une bulle à la souris ou au doigt ---------------------------

// Quand on lâche la bulle, elle reste où on l'a posée,
// sauf si elle est hors de son disque : elle y revient alors.
bulles.call(
  d3.drag()
    .on("start", (evenement, r) => {
      if (!evenement.active) simulation.alphaTarget(0.3).restart();
      r.fx = r.x;
      r.fy = r.y;
    })
    .on("drag", (evenement, r) => {
      r.fx = evenement.x;
      r.fy = evenement.y;
    })
    .on("end", (evenement, r) => {
      if (!evenement.active) simulation.alphaTarget(0);
      r.fx = null;
      r.fy = null;
    })
);
