// Dessin de la carte interactive avec la bibliothèque D3.

// Réglages de taille, par niveau (Intime, Proche, Ami, Connaissance).
// Les disques s'élargissent vers l'extérieur, où il y a le plus de monde,
// et les bulles rapetissent avec l'éloignement.
// Le dernier disque (Connaissance) n'a pas de bord extérieur : ses bulles
// peuvent s'éloigner autant qu'on veut. Sa largeur sert seulement à placer
// les nouvelles connaissances et à cadrer la vue de départ.
const LARGEUR_DISQUE = [140, 170, 200, 230]; // largeur de chaque disque
const TAILLE_BULLE   = [22, 18, 15, 12];     // rayon des bulles de ce niveau
const TAILLE_TEXTE   = [13, 12, 11, 11];     // taille minimale du nom à l'écran
const RAYON_MOI = 34; // taille de la bulle centrale

// Réglages d'affichage à l'écran (en pixels), surtout utiles sur téléphone
// où la carte entière est très réduite.
const RAYON_MIN_BULLE_ECRAN = 6; // une bulle ne devient jamais plus petite
const ZONE_TACTILE_ECRAN = 22;   // rayon de la zone touchable au doigt
// Agrandissement des noms à partir duquel les noms des amis et
// connaissances sont cachés (trop serrés pour être lisibles).
const SEUIL_NOMS_LOINTAINS = 2.3;
// Agrandissement de référence des noms (écran d'ordinateur ordinaire),
// utilisé pour réserver leur place : identique sur tous les appareils, pour
// que la disposition des bulles soit la même partout.
const AGRANDISSEMENT_REFERENCE = 1.8;
const MARGE = 6;      // petit espace entre une bulle et le bord de son disque

// Bord extérieur du disque d'un niveau (somme des largeurs jusqu'à lui).
const rayonDuCercle = (niveau) => d3.sum(LARGEUR_DISQUE.slice(0, niveau));
const couleurDuCercle = (niveau) => CERCLES.find((c) => c.niveau === niveau).couleur;
const rayonBulle = (r) => TAILLE_BULLE[r.cercle - 1];

const estLeDernierNiveau = (niveau) => niveau === CERCLES.length;

// Distance au centre minimale et maximale pour le centre d'une bulle
// d'un niveau donné, pour qu'elle reste entièrement dans son disque.
// Pour le dernier niveau, pas de maximum (Infinity).
function limitesDuDisque(niveau) {
  const interieur = niveau === 1 ? RAYON_MOI + MARGE : rayonDuCercle(niveau - 1);
  const rayon = TAILLE_BULLE[niveau - 1];
  return {
    min: interieur + rayon + MARGE,
    max: estLeDernierNiveau(niveau) ? Infinity : rayonDuCercle(niveau) - rayon - MARGE,
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

// Les types de liens de la légende sont aussi des interrupteurs : un clic
// masque ou réaffiche ce type de lien sur la carte (affichage seulement,
// les bulles gardent leur place).
const typesMasques = new Set();

const legendeLiens = d3.select("#legende-liens")
  .selectAll("li")
  .data(TYPES_DE_LIEN)
  .join("li")
  .append("button")
  .attr("class", "filtre-lien")
  .attr("title", "Cliquer pour masquer ou afficher ce type de lien")
  .html((t) => exempleDeTrait(t) + t.nom)
  .on("click", (evenement, t) => {
    if (typesMasques.has(t.type)) typesMasques.delete(t.type);
    else typesMasques.add(t.type);
    afficherFiltres();
  });

function afficherFiltres() {
  legendeLiens
    .classed("masque", (t) => typesMasques.has(t.type))
    .attr("aria-pressed", (t) => String(!typesMasques.has(t.type)));
  traits.classed("filtre", (l) => typesMasques.has(l.type));
}

// --- Mise en place de la zone de dessin -----------------------------------

// Le point (0, 0) est au centre de la carte : c'est "moi".
const tailleVue = (rayonDuCercle(CERCLES.length) + 40) * 2;
const svg = d3.select("#carte")
  .attr("viewBox", [-tailleVue / 2, -tailleVue / 2, tailleVue, tailleVue]);

// "monde" contient tout ce qui se déplace et grossit avec le zoom.
const monde = svg.append("g");

const zoom = d3.zoom()
  .scaleExtent([0.15, 4]) // zoom minimum (pour voir les connaissances lointaines) et maximum
  .on("zoom", (evenement) => {
    monde.attr("transform", evenement.transform);
    ajusterAuZoom();
  });
svg.call(zoom);

// Vue d'ensemble : centrée sur "moi", assez large pour voir toutes les
// bulles, y compris les connaissances les plus lointaines.
function recentrer() {
  const plusLoin = d3.max(relations, (r) => Math.hypot(r.x, r.y)) || 0;
  const rayonAVoir = Math.max(rayonDuCercle(CERCLES.length), plusLoin + 60);
  const echelle = Math.min(1, (tailleVue / 2) / (rayonAVoir + 40));
  svg.transition().duration(600)
    .call(zoom.transform, d3.zoomIdentity.scale(echelle));
}

// Fait glisser la carte (sans changer le zoom) pour que "moi", une personne
// et les personnes qui lui sont reliées soient toutes visibles. Si c'est
// déjà le cas, rien ne bouge.
// obstacle : zone de l'écran cachée par le panneau (ou null).
function cadrerPersonne(r, obstacle = null) {
  const matrice = svg.node().getScreenCTM();
  if (!matrice) return;

  // Les points à voir : moi (0, 0), la personne, ses relations
  // (sauf les liens masqués par les filtres).
  const voisins = liens
    .filter((l) => !typesMasques.has(l.type) && (l.de === r.id || l.vers === r.id))
    .map((l) => relationsParId.get(l.de === r.id ? l.vers : l.de));
  const points = [{ x: 0, y: 0 }, r, ...voisins];

  // Zone visible de la carte à l'écran, sans la partie cachée par le
  // panneau (sauf s'il cache presque tout, comme sur un petit écran),
  // et avec une marge pour que les noms restent lisibles.
  const cadre = svg.node().getBoundingClientRect();
  let droite = cadre.right;
  let bas = cadre.bottom;
  if (obstacle && obstacle.width > 0) {
    // Panneau sur le côté droit (ordinateur)
    if (obstacle.left - cadre.left > cadre.width * 0.4) droite = Math.min(droite, obstacle.left);
    // Panneau en bas de l'écran (téléphone)
    else if (obstacle.top - cadre.top > cadre.height * 0.25) bas = Math.min(bas, obstacle.top);
  }
  const marge = Math.min(40, cadre.width / 10);
  const zone = {
    gauche: cadre.left + marge, droite: droite - marge,
    haut: cadre.top + marge, bas: bas - marge,
  };

  // Position à l'écran de chaque point, avec le zoom actuel.
  const t = d3.zoomTransform(svg.node());
  const surEcran = points.map((p) => ({
    x: matrice.a * t.applyX(p.x) + matrice.e,
    y: matrice.d * t.applyY(p.y) + matrice.f,
  }));
  const toutVisible = surEcran.every((p) =>
    p.x >= zone.gauche && p.x <= zone.droite && p.y >= zone.haut && p.y <= zone.bas);
  if (toutVisible) return;

  // Sinon : on fait glisser pour centrer l'ensemble dans la zone visible.
  const [minX, maxX] = d3.extent(surEcran, (p) => p.x);
  const [minY, maxY] = d3.extent(surEcran, (p) => p.y);
  const decalageX = (zone.gauche + zone.droite) / 2 - (minX + maxX) / 2;
  const decalageY = (zone.haut + zone.bas) / 2 - (minY + maxY) / 2;
  svg.transition().duration(500)
    .call(zoom.transform, d3.zoomIdentity
      .translate(t.x + decalageX / matrice.a, t.y + decalageY / matrice.d)
      .scale(t.k));
}

// Centre la carte sur une personne, en zoomant un peu si besoin.
function centrerSur(r) {
  const echelle = Math.max(d3.zoomTransform(svg.node()).k, 1.5);
  svg.transition().duration(600)
    .call(zoom.transform,
      d3.zoomIdentity.translate(-r.x * echelle, -r.y * echelle).scale(echelle));
}

// --- Les disques de proximité ---------------------------------------------

// Chaque niveau est un anneau coloré, entre le cercle précédent et le sien.
// Le dernier, sans bord extérieur, s'efface en dégradé vers l'extérieur.
const ETENDUE_DEGRADE = 900; // distance sur laquelle le dernier anneau s'efface
const bordInterieur = (niveau) => (niveau === 1 ? 0 : rayonDuCercle(niveau - 1));
const bordExterieurDessine = (niveau) =>
  estLeDernierNiveau(niveau) ? bordInterieur(niveau) + ETENDUE_DEGRADE : rayonDuCercle(niveau);

const formeAnneau = d3.arc()
  .innerRadius((c) => bordInterieur(c.niveau))
  .outerRadius((c) => bordExterieurDessine(c.niveau))
  .startAngle(0)
  .endAngle(2 * Math.PI);

// Le dégradé : pleine couleur au bord intérieur, transparent au loin.
const dernier = CERCLES[CERCLES.length - 1];
const degrade = svg.append("defs").append("radialGradient")
  .attr("id", "degrade-dernier-anneau")
  .attr("gradientUnits", "userSpaceOnUse")
  .attr("cx", 0).attr("cy", 0)
  .attr("r", bordExterieurDessine(dernier.niveau));
degrade.append("stop")
  .attr("offset", bordInterieur(dernier.niveau) / bordExterieurDessine(dernier.niveau))
  .attr("stop-color", dernier.couleur);
degrade.append("stop")
  .attr("offset", 1)
  .attr("stop-color", dernier.couleur)
  .attr("stop-opacity", 0);

const anneaux = monde.append("g")
  .selectAll("path")
  .data(CERCLES)
  .join("path")
  .attr("class", "anneau")
  .attr("d", formeAnneau)
  .attr("fill", (c) => (estLeDernierNiveau(c.niveau) ? "url(#degrade-dernier-anneau)" : c.couleur))
  .attr("stroke", (c) => (estLeDernierNiveau(c.niveau) ? "none" : c.couleur));

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

// --- La répartition des groupes ---------------------------------------------

// Les groupes eux-mêmes sont calculés dans groupes.js (calculerGroupes) :
// "unites" contient tous les paquets de personnes (groupes, paires,
// personnes seules).

// Force d'écartement entre paquets, "autour du cercle" : comme des convives
// autour d'une table ronde, chaque paquet s'éloigne de ses voisins jusqu'à
// ce que tous soient répartis sur le tour. Chaque paquet a droit à une part
// du tour proportionnelle à son nombre de personnes : un grand groupe prend
// plus de place qu'une personne seule.
// La poussée est forte entre paquets qui empiètent l'un sur l'autre et
// faible entre paquets éloignés : le mouvement ralentit à mesure que la
// répartition s'équilibre.
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
  if (unites.length < 2) return;
  const total = d3.sum(unites, (u) => u.length);

  // Centre de chaque paquet (moyenne des positions de ses membres), sa
  // direction vue depuis "moi" (son angle) et sa part du tour.
  const centres = unites.map((membres) => {
    const x = d3.mean(membres, (r) => r.x);
    const y = d3.mean(membres, (r) => r.y);
    return { x, y, angle: Math.atan2(y, x), distance: Math.hypot(x, y) || 1,
             part: (2 * Math.PI * membres.length) / total };
  });

  centres.forEach((centre, i) => {
    // Somme des poussées des autres paquets : chacun pousse d'autant plus
    // fort que l'espace libre entre les deux parts est petit.
    let somme = 0;
    centres.forEach((autre, j) => {
      if (i === j) return;
      const ecart = ecartAngle(centre.angle, autre.angle);
      const espaceLibre = Math.abs(ecart) - 0.9 * (centre.part + autre.part) / 2;
      somme += Math.sign(ecart) / Math.max(espaceLibre, 0.15);
    });

    // La racine carrée fait durer cette poussée plus longtemps que les
    // autres règles pendant que l'animation ralentit : les paquets ont le
    // temps de finir de se répartir.
    let poussee = ECARTEMENT_GROUPES * Math.sqrt(alpha) * somme;
    poussee = Math.max(-VITESSE_MAX_GROUPES, Math.min(VITESSE_MAX_GROUPES, poussee));

    // On pousse tout le paquet le long du cercle (perpendiculairement
    // à la direction de "moi"), sans le rapprocher ni l'éloigner du centre.
    const tx = -centre.y / centre.distance;
    const ty = centre.x / centre.distance;
    for (const r of unites[i]) {
      r.vx += tx * poussee;
      r.vy += ty * poussee;
    }
  });
}

// --- Ranger la carte ---------------------------------------------------------

// Range la carte "en parts de gâteau" : chaque paquet reçoit une part du
// tour proportionnelle à sa taille, et les paquets liés entre eux sont mis
// côte à côte. Dans sa part, chaque personne est placée dans son disque.
// Renvoie les anciennes positions (pour pouvoir annuler).
function ranger() {
  const anciennes = relations.map((r) => ({ id: r.id, x: r.x, y: r.y }));
  if (!unites.length) return anciennes;

  // Poids des liens entre paquets
  const uniteDe = new Map();
  unites.forEach((u, i) => u.forEach((r) => uniteDe.set(r.id, i)));
  const poidsEntre = (i, j) => d3.sum(liens, (l) => {
    const a = uniteDe.get(l.de), b = uniteDe.get(l.vers);
    return (a === i && b === j) || (a === j && b === i) ? poidsLien(l) : 0;
  });

  // Ordre autour du cercle : on part du plus grand paquet, puis on ajoute à
  // chaque fois celui qui est le plus lié au dernier placé.
  const restants = d3.range(unites.length).sort((a, b) => unites[b].length - unites[a].length);
  const ordre = [restants.shift()];
  while (restants.length) {
    const dernier = ordre[ordre.length - 1];
    restants.sort((a, b) => poidsEntre(dernier, b) - poidsEntre(dernier, a) ||
      d3.sum(ordre, (o) => poidsEntre(o, b)) - d3.sum(ordre, (o) => poidsEntre(o, a)) ||
      unites[b].length - unites[a].length);
    ordre.push(restants.shift());
  }

  // Placement dans les parts
  const total = d3.sum(unites, (u) => u.length);
  let angle = -Math.PI / 2; // on commence en haut
  // Dans chaque disque, les bulles successives alternent entre trois
  // "rangées" (en quinconce) pour ne pas se toucher.
  const rangees = [0.3, 0.6, 0.85];
  const compteurParDisque = CERCLES.map(() => 0);
  for (const i of ordre) {
    const part = (2 * Math.PI * unites[i].length) / total;
    for (const c of CERCLES) {
      const membres = unites[i].filter((r) => r.cercle === c.niveau)
        .sort((a, b) => a.nom.localeCompare(b.nom));
      const { min, max } = limitesDuDisque(c.niveau);
      const haut = Number.isFinite(max) ? max : min + LARGEUR_DISQUE[c.niveau - 1] * 0.6;
      membres.forEach((r, k) => {
        const a = angle + part * (k + 0.5) / membres.length;
        const rangee = rangees[compteurParDisque[c.niveau - 1]++ % rangees.length];
        const d = min + (haut - min) * rangee;
        r.x = Math.cos(a) * d;
        r.y = Math.sin(a) * d;
        r.vx = 0;
        r.vy = 0;
      });
    }
    angle += part;
  }
  mettreAJourPositions();
  simulation.alpha(0.4).restart();
  sauvegarder();
  return anciennes;
}

// Remet les positions d'avant un rangement.
function annulerRangement(anciennes) {
  for (const p of anciennes) {
    const r = relationsParId.get(p.id);
    if (r) { r.x = p.x; r.y = p.y; r.vx = 0; r.vy = 0; }
  }
  mettreAJourPositions();
  simulation.alpha(0.2).restart();
  sauvegarder();
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
  .force("ecart", d3.forceCollide(rayonAvecNom))
  .on("tick", mettreAJourPositions)
  .on("end", sauvegarder); // les bulles se sont arrêtées : on garde leur place

// --- Faire glisser une bulle ----------------------------------------------

// Ce que fait le glissement dépend du mode :
// - mode normal (null) : on déplace simplement la bulle (elle reste là, ou
//   revient dans son disque si on la lâche en dehors) ;
// - mode édition "liens" : lâchée sur une autre bulle, elle retourne à sa
//   place et on applique l'outil de lien choisi entre les deux ;
// - mode édition "disques" : lâchée dans un autre disque, elle change de
//   niveau de proximité.
let modeEdition = null;
let positionDeDepart = null;
let bulleVisee = null;
let niveauVise = null;

// Fonction appelée quand une bulle est lâchée dans un autre disque
// (définie dans interface.js).
let quandOnChangeDeDisque = () => {};

// En mode Liens, la carte reste immobile pour qu'on puisse enchaîner les
// liens sans que les bulles bougent ; en sortant de ce mode, elle reprend
// son mouvement (les personnes nouvellement liées se rapprochent).
function changerModeEdition(mode) {
  const avant = modeEdition;
  modeEdition = mode;
  if (mode === "liens") simulation.stop();
  else if (avant === "liens") simulation.alpha(0.5).restart();
}

// Relance l'animation, sauf en mode Liens où la carte reste immobile.
function relancerAnimation(alpha) {
  if (modeEdition === "liens") return;
  simulation.alpha(alpha).restart();
}

// Le niveau de proximité correspondant à une distance au centre.
function niveauALaDistance(distance) {
  for (const c of CERCLES) {
    if (estLeDernierNiveau(c.niveau) || distance < rayonDuCercle(c.niveau)) return c.niveau;
  }
}

// La bulle (autre que celle qu'on déplace) qui se trouve sous le pointeur.
// La zone de détection est un peu plus large que la bulle, pour qu'il
// suffise d'arriver à peu près dessus.
// Elle tient aussi compte de la taille à l'écran (au moins 28 pixels autour),
// pour viser facilement au doigt sur une carte très réduite.
function bulleSousLePointeur(x, y, deplacee) {
  const tolerance = (r) => Math.max(rayonBulle(r) * 1.8, 26, 28 / echelleEcran());
  return relations.find(
    (r) => r !== deplacee && Math.hypot(r.x - x, r.y - y) < tolerance(r)
  ) || null;
}

const glisser = d3.drag()
  .on("start", (evenement, r) => {
    // L'animation est relancée pour que les autres bulles s'écartent
    // pendant qu'on déplace celle-ci (inutile en mode Liens : rien ne bouge).
    if (!evenement.active && modeEdition !== "liens") simulation.alphaTarget(0.3).restart();
    positionDeDepart = { x: r.x, y: r.y };
    r.fx = r.x;
    r.fy = r.y;
    // En mode Liens, la bulle ne bouge pas : un trait part d'elle et suit
    // le pointeur, avec le style de l'outil choisi.
    if (modeEdition === "liens") commencerTraitProvisoire(r);
  })
  .on("drag", (evenement, r) => {
    if (modeEdition === "liens") {
      // la bulle reste fixe ; c'est le trait qui suit le pointeur
      bulleVisee = bulleSousLePointeur(evenement.x, evenement.y, r);
      bulles.classed("visee", (b) => b === bulleVisee);
      // le trait s'accroche au centre de la bulle visée
      const bout = bulleVisee || { x: evenement.x, y: evenement.y };
      traitProvisoire.attr("x2", bout.x).attr("y2", bout.y);
      return;
    }
    r.fx = evenement.x;
    r.fy = evenement.y;
    if (modeEdition === "disques") {
      // Le disque d'arrivée ressort pendant le glissement.
      niveauVise = niveauALaDistance(Math.hypot(evenement.x, evenement.y));
      mettreEnAvantAnneau(niveauVise);
    }
  })
  .on("end", (evenement, r) => {
    if (!evenement.active) simulation.alphaTarget(0);
    r.fx = null;
    r.fy = null;
    if (modeEdition === "liens") {
      traitProvisoire.remove();
      traitProvisoire = null;
      bulles.classed("visee", false);
      const cible = bulleVisee;
      bulleVisee = null;
      if (cible) quandOnRelieDeuxBulles(r, cible);
    } else if (modeEdition === "disques" && niveauVise !== null) {
      const niveau = niveauVise;
      niveauVise = null;
      mettreEnAvantAnneau(null);
      if (niveau !== r.cercle) quandOnChangeDeDisque(r, niveau);
    }
    sauvegarder();
  });

// Le trait provisoire qui suit le pointeur en mode Liens. Son style est
// celui de l'outil choisi (outilLien, dans interface.js) ; pour "Effacer",
// un pointillé rouge fin.
let traitProvisoire = null;

function commencerTraitProvisoire(r) {
  const outil = typeof outilLien === "string" ? outilLien : "ami";
  const type = typeDeLien(outil);
  traitProvisoire = calqueBulles.insert("line", ":first-child") // sous les bulles
    .attr("class", "trait-provisoire")
    .attr("x1", r.x).attr("y1", r.y)
    .attr("x2", r.x).attr("y2", r.y)
    .attr("stroke", type ? type.couleur : "#c0392b")
    .attr("stroke-width", type ? Math.max(type.epaisseur, 2) : 2)
    .attr("stroke-dasharray", type ? type.pointilles : "2 5");
}

// --- Mise à jour de la carte ----------------------------------------------

// Une nouvelle bulle apparaît à un endroit au hasard dans son disque
// (pour le dernier niveau, sans bord : près de son bord intérieur).
function placerDansSonDisque(r) {
  const { min, max } = limitesDuDisque(r.cercle);
  const maxPlacement = Number.isFinite(max) ? max : min + LARGEUR_DISQUE[r.cercle - 1] / 2;
  const angle = Math.random() * 2 * Math.PI;
  const distance = min + Math.random() * (maxPlacement - min);
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
      nouvelle.append("circle").attr("class", "disque");
      nouvelle.append("circle").attr("class", "zone-tactile");
      nouvelle.append("text");
      return nouvelle;
    });

  // Couleur et nom selon le niveau (qui peut avoir changé) ; les tailles
  // dépendent aussi du zoom, elles sont réglées par ajusterAuZoom().
  bulles.select(".disque").attr("fill", (r) => couleurDuCercle(r.cercle));
  bulles.select("text").text((r) => r.nom);
  ajusterAuZoom();

  afficherSelection();
  afficherFiltres();
  afficherRecherche();
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
  relancerAnimation(0.5);

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

// Les noms gardent une taille lisible à l'écran : quand la carte est réduite
// pour tenir dans la fenêtre (ou dézoomée), ils ne rapetissent pas avec
// elle ; quand on zoome, ils grossissent normalement.
// Nombre de pixels à l'écran pour une unité de la carte (zoom compris).
function echelleEcran() {
  const matrice = monde.node().getScreenCTM();
  return matrice ? matrice.a : 1;
}

// Adapte l'affichage au zoom et à la taille de l'écran :
// - les noms gardent une taille lisible (ils ne rapetissent pas avec la
//   carte, mais grossissent quand on zoome) ;
// - les bulles ne deviennent jamais minuscules, et ont une zone touchable
//   assez grande pour le doigt ;
// - si la carte est trop réduite, les noms des amis et connaissances sont
//   cachés (sauf ceux mis en avant par le focus ou la recherche).
function ajusterAuZoom() {
  const echelle = echelleEcran();
  const agrandissement = echelle < 1 ? 1 / echelle : 1;
  const rayonAffiche = (r) => Math.max(rayonBulle(r), RAYON_MIN_BULLE_ECRAN / echelle);
  const tailleNom = (r) => TAILLE_TEXTE[r.cercle - 1] * agrandissement;

  bulles.select(".disque").attr("r", rayonAffiche);
  bulles.select(".zone-tactile").attr("r", (r) => Math.max(rayonAffiche(r), ZONE_TACTILE_ECRAN / echelle));
  bulles.select("text")
    .style("font-size", (r) => tailleNom(r) + "px")
    .attr("y", (r) => rayonAffiche(r) + tailleNom(r) + 2);
  bulles.classed("nom-cache", (r) => r.cercle > 2 && agrandissement > SEUIL_NOMS_LOINTAINS);
  moi.select("text").style("font-size", 13 * agrandissement + "px");
  moi.select("circle").attr("r", Math.max(RAYON_MOI, 18 / echelle));
}

// Place réservée autour d'une bulle pour elle ET son nom (écrit dessous),
// afin que les bulles voisines ne viennent pas recouvrir le nom.
// La largeur du nom est estimée d'après son nombre de lettres.
// Calculée pour un écran de référence : la disposition est la même sur
// ordinateur et sur téléphone.
function rayonAvecNom(r) {
  const hauteurNom = TAILLE_TEXTE[r.cercle - 1] * AGRANDISSEMENT_REFERENCE;
  const largeurNom = r.nom.length * hauteurNom * 0.55;
  return Math.max(rayonBulle(r) + hauteurNom * 0.65 + 2, largeurNom / 2 + 3);
}

window.addEventListener("resize", ajusterAuZoom);

// Met en évidence des bulles et/ou un lien (listes vides / null = rien).
function selectionner(idsBulles = [], idLien = null) {
  bullesSelectionnees = idsBulles;
  lienSelectionne = idLien;
  afficherSelection();
}

// Mode focus : quand une personne est sélectionnée, elle, ses liens et les
// personnes reliées restent nets, tout le reste s'estompe. Quand deux
// personnes sont sélectionnées (panneau d'un lien), seules elles et le lien
// entre elles restent nets.
function afficherSelection() {
  bulles.classed("selectionnee", (r) => bullesSelectionnees.includes(r.id));
  traits.classed("selectionne", (l) => l.id === lienSelectionne);

  const focus = bullesSelectionnees.length > 0;
  const selection = new Set(bullesSelectionnees);
  const unePersonne = bullesSelectionnees.length === 1;

  // Liens qui restent nets
  const lienNet = (l) => unePersonne
    ? selection.has(l.de) || selection.has(l.vers)
    : selection.has(l.de) && selection.has(l.vers);

  // Personnes qui restent nettes : la sélection et, pour une seule
  // personne, celles qui lui sont reliées.
  const nettes = new Set(selection);
  if (unePersonne) {
    for (const l of liens) {
      if (lienNet(l)) { nettes.add(l.de); nettes.add(l.vers); }
    }
  }

  bulles.classed("estompee", (r) => focus && !nettes.has(r.id));
  traits.classed("estompe", (l) => focus && !lienNet(l));
  svg.classed("focus", focus);
}

// --- Recherche ----------------------------------------------------------------

// Texte recherché, sans accents ni majuscules ("" = pas de recherche).
let texteRecherche = "";

// "Chloé" -> "chloe" : pour comparer sans tenir compte des accents/majuscules.
const simplifier = (texte) =>
  texte.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

// Les personnes dont le nom contient le texte recherché ; celles dont le nom
// commence par ce texte sont placées en premier.
function resultatsRecherche(texte) {
  const cherche = simplifier(texte);
  if (cherche === "") return [];
  const trouvees = relations.filter((r) => simplifier(r.nom).includes(cherche));
  return trouvees.sort((a, b) =>
    Number(simplifier(b.nom).startsWith(cherche)) - Number(simplifier(a.nom).startsWith(cherche)));
}

// Pendant une recherche, les personnes trouvées restent nettes, le reste
// s'estompe. Renvoie le nombre de personnes trouvées.
function rechercher(texte) {
  texteRecherche = simplifier(texte);
  afficherRecherche();
  return resultatsRecherche(texte).length;
}

function afficherRecherche() {
  const active = texteRecherche !== "";
  const trouvees = new Set(resultatsRecherche(texteRecherche).map((r) => r.id));
  bulles.classed("hors-recherche", (r) => active && !trouvees.has(r.id));
  traits.classed("hors-recherche", active);
  svg.classed("recherche", active);
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
