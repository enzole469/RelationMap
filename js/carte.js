// Dessin de la carte interactive avec la bibliothèque D3.

// Réglages de taille
const ECART_CERCLES = 110; // distance entre deux cercles de proximité
const RAYON_BULLE = 22;    // taille d'une bulle de relation
const RAYON_MOI = 34;      // taille de la bulle centrale

// Rayon du cercle d'un niveau donné (niveau 1 = 110, niveau 2 = 220, ...)
const rayonDuCercle = (niveau) => niveau * ECART_CERCLES;
const couleurDuCercle = (niveau) => CERCLES.find((c) => c.niveau === niveau).couleur;

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

// --- Les cercles de proximité ---------------------------------------------

const calqueAnneaux = monde.append("g");

calqueAnneaux.selectAll("circle")
  .data(CERCLES)
  .join("circle")
  .attr("class", "anneau")
  .attr("r", (c) => rayonDuCercle(c.niveau))
  .attr("stroke", (c) => c.couleur);

calqueAnneaux.selectAll("text")
  .data(CERCLES)
  .join("text")
  .attr("class", "nom-anneau")
  .attr("y", (c) => -rayonDuCercle(c.niveau) - 8)
  .text((c) => c.nom);

// --- Moi, au centre -------------------------------------------------------

const moi = monde.append("g").attr("class", "moi");
moi.append("circle").attr("r", RAYON_MOI);
moi.append("text").text("Moi");

// --- Les bulles de relations ----------------------------------------------

// Copie des données, car D3 va y ajouter les positions (x, y).
const relations = RELATIONS_EXEMPLE.map((r) => ({ ...r }));

// Position de départ : chaque relation est répartie autour de son cercle.
for (const cercle of CERCLES) {
  const membres = relations.filter((r) => r.cercle === cercle.niveau);
  membres.forEach((r, i) => {
    const angle = (i / membres.length) * 2 * Math.PI + cercle.niveau;
    r.x = Math.cos(angle) * rayonDuCercle(cercle.niveau);
    r.y = Math.sin(angle) * rayonDuCercle(cercle.niveau);
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

// --- La "physique" qui place les bulles -----------------------------------

// Deux règles : chaque bulle est attirée vers son cercle,
// et les bulles se repoussent pour ne pas se chevaucher.
const simulation = d3.forceSimulation(relations)
  .force("anneau", d3.forceRadial((r) => rayonDuCercle(r.cercle), 0, 0).strength(0.8))
  .force("ecart", d3.forceCollide(RAYON_BULLE + 14))
  .on("tick", () => {
    bulles.attr("transform", (r) => `translate(${r.x},${r.y})`);
  });

// --- Déplacer une bulle à la souris ou au doigt ---------------------------

// Quand on lâche la bulle, elle revient se placer sur son cercle.
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
