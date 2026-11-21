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
const simulation = d3.forceSimulation()
  .force("disque", forceDisque)
  .force("ecart", d3.forceCollide(RAYON_BULLE + 14))
  .on("tick", () => {
    bulles.attr("transform", (r) => `translate(${r.x},${r.y})`);
  });

// --- Déplacer une bulle à la souris ou au doigt ---------------------------

// Quand on lâche la bulle, elle reste où on l'a posée,
// sauf si elle est hors de son disque : elle y revient alors.
const glisser = d3.drag()
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
  });

// --- Les bulles de relations ----------------------------------------------

const calqueBulles = monde.append("g");
let bulles = calqueBulles.selectAll("g.bulle");
let idSelectionne = null;

// Fonction appelée quand on clique sur une bulle (définie dans interface.js).
let quandOnCliqueUneBulle = () => {};

// Une nouvelle bulle apparaît à un endroit au hasard dans son disque.
function placerDansSonDisque(r) {
  const { min, max } = limitesDuDisque(r.cercle);
  const angle = Math.random() * 2 * Math.PI;
  const distance = min + Math.random() * (max - min);
  r.x = Math.cos(angle) * distance;
  r.y = Math.sin(angle) * distance;
}

// Met la carte en accord avec la liste des relations :
// ajoute les nouvelles bulles, retire les supprimées, met à jour les autres.
function dessinerCarte() {
  for (const r of relations) {
    if (r.x === undefined) placerDansSonDisque(r);
  }

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
  bulles.classed("selectionnee", (r) => r.id === idSelectionne);

  simulation.nodes(relations);
  simulation.alpha(0.5).restart();
}

// Met en évidence une bulle (ou aucune si id vaut null).
function selectionnerBulle(id) {
  idSelectionne = id;
  bulles.classed("selectionnee", (r) => r.id === idSelectionne);
}

dessinerCarte();
