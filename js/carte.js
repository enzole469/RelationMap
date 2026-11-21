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
// Taille d'une bulle : selon le niveau pour une personne, selon le nombre
// de membres pour un groupe replié.
const RAYON_GROUPE = (nombre) => 24 + 7 * Math.sqrt(nombre);
const TAILLE_TEXTE_GROUPE = 13;
const estGroupe = (n) => n.type === "groupe";
const rayonBulle = (n) => (estGroupe(n) ? RAYON_GROUPE(n.groupe.membres.length) : TAILLE_BULLE[n.cercle - 1]);
const tailleTexte = (n) => (estGroupe(n) ? TAILLE_TEXTE_GROUPE : TAILLE_TEXTE[n.cercle - 1]);

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
  // Quand le lasso est activé (mode Groupes), glisser sur le fond trace un
  // lasso au lieu de déplacer la carte (le zoom à la molette ou en pinçant
  // reste possible).
  .filter((evenement) => {
    if (evenement.button || (evenement.ctrlKey && evenement.type !== "wheel")) return false;
    if (lassoActif && (evenement.type === "mousedown" ||
        (evenement.type === "touchstart" && evenement.touches.length === 1))) return false;
    return true;
  })
  .on("zoom", (evenement) => {
    monde.attr("transform", evenement.transform);
    ajusterAuZoom();
  });
svg.call(zoom);

// Vue d'ensemble : centrée sur "moi", assez large pour voir toutes les
// bulles, y compris les connaissances les plus lointaines.
function recentrer() {
  const plusLoin = d3.max(noeuds, (r) => Math.hypot(r.x, r.y)) || 0;
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
    .map((l) => noeudVisibleDe(l.de === r.id ? l.vers : l.de))
    .filter(Boolean);
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

const calqueHalos = monde.append("g");
const calqueLiens = monde.append("g");
const calqueBulles = monde.append("g");
const calqueLasso = monde.append("g");
let halos = calqueHalos.selectAll("g.halo");
let traits = calqueLiens.selectAll("g.lien");
let bulles = calqueBulles.selectAll("g.bulle");

// Pour retrouver vite une relation à partir de son identifiant.
let relationsParId = new Map();

// --- Ce qui est affiché : personnes et groupes repliés ------------------------
//
// Un groupe (voir groupes.js) est affiché soit "replié" (une grosse bulle à
// son nom), soit "ouvert" (ses membres, entourés d'un halo à son nom).
// Les "noeuds" sont tout ce qui est dessiné et bouge sur la carte : les
// personnes visibles et les bulles des groupes repliés.
const groupesOuverts = new Set();     // identifiants des groupes ouverts
const noeudsGroupes = new Map();      // id de groupe -> sa bulle (si replié)
let noeuds = [];                      // ce qui est affiché et animé
let noeudsParId = new Map();
let traitsVisibles = [];              // liens affichés (dont liens regroupés)
let unitesVisibles = [];              // paquets pour la répartition

// Le groupe replié qui cache une personne (ou null si elle est visible).
// Une personne n'est cachée que si elle appartient à un seul groupe, et
// qu'il est replié. Membre de plusieurs groupes, elle reste visible : elle
// fait le pont entre eux.
function groupeReplie(idRelation) {
  const groupes = groupesDe(idRelation);
  if (groupes.length !== 1) return null;
  return groupesOuverts.has(groupes[0].id) ? null : groupes[0];
}

// Ce qui représente une personne à l'écran : elle-même, ou la bulle de
// son groupe s'il est replié.
function noeudVisibleDe(idRelation) {
  const g = groupeReplie(idRelation);
  return g ? noeudsGroupes.get(g.id) : relationsParId.get(idRelation);
}

const centreDe = (liste) => ({ x: d3.mean(liste, (n) => n.x), y: d3.mean(liste, (n) => n.y) });

// Construit la liste de ce qui est affiché, à partir des groupes calculés.
function construireNoeuds() {
  // Les groupes disparus ne sont plus ouverts ni repliés.
  const existants = new Set(groupesActuels.map((g) => g.id));
  for (const id of [...groupesOuverts]) if (!existants.has(id)) groupesOuverts.delete(id);
  // En mode Groupes, tous les groupes restent ouverts (y compris ceux qui
  // apparaissent pendant l'édition).
  if (modeEdition === "groupes") {
    for (const g of groupesActuels) {
      if (!groupesOuverts.has(g.id)) {
        ouvertsParLeModeGroupes.add(g.id);
        groupesOuverts.add(g.id);
      }
    }
  }
  for (const id of [...noeudsGroupes.keys()]) {
    if (!existants.has(id) || groupesOuverts.has(id)) noeudsGroupes.delete(id);
  }

  // Une bulle par groupe replié, placée au centre de ses membres, à leur
  // distance moyenne de "moi".
  for (const g of groupesActuels) {
    if (groupesOuverts.has(g.id)) continue;
    let n = noeudsGroupes.get(g.id);
    if (!n) {
      n = { id: g.id, type: "groupe", ...centreDe(g.membres) };
      noeudsGroupes.set(g.id, n);
    }
    n.groupe = g;
    n.nom = g.nom;
    // (jamais par-dessus "moi", même pour un groupe d'intimes)
    n.distanceCible = Math.max(d3.mean(g.membres, (r) => Math.hypot(r.x, r.y)),
      RAYON_MOI + RAYON_GROUPE(g.membres.length) + 2 * MARGE);
    n.cercle = niveauALaDistance(n.distanceCible);
  }

  noeuds = relations.filter((r) => !groupeReplie(r.id)).concat([...noeudsGroupes.values()]);
  noeudsParId = new Map(noeuds.map((n) => [n.id, n]));

  // Les liens : ceux entre deux personnes visibles sont affichés tels quels ;
  // ceux qui touchent un groupe replié sont regroupés en un seul trait
  // (plus épais s'il y a beaucoup de liens).
  traitsVisibles = [];
  const regroupes = new Map();
  for (const l of liens) {
    const a = noeudVisibleDe(l.de), b = noeudVisibleDe(l.vers);
    if (!a || !b || a === b) continue; // lien interne à un groupe replié
    if (!estGroupe(a) && !estGroupe(b)) {
      traitsVisibles.push({ id: l.id, de: a.id, vers: b.id, type: l.type, lien: l });
      continue;
    }
    const [p, q] = [a.id, b.id].sort();
    const cle = "regroupe:" + p + "|" + q;
    if (!regroupes.has(cle)) regroupes.set(cle, { id: cle, de: p, vers: q, regroupe: true, nombre: 0, poids: 0 });
    const t = regroupes.get(cle);
    t.nombre += 1;
    t.poids += poidsLien(l);
  }
  // Une personne qui fait le pont entre plusieurs groupes est reliée à la
  // bulle de chacun de ses groupes repliés (trait d'appartenance).
  for (const r of noeuds) {
    if (estGroupe(r) || groupesDe(r.id).length < 2) continue;
    for (const g of groupesDe(r.id)) {
      const n = noeudsGroupes.get(g.id);
      if (!n) continue;
      const [p, q] = [r.id, n.id].sort();
      const cle = "regroupe:" + p + "|" + q;
      if (!regroupes.has(cle)) regroupes.set(cle, { id: cle, de: p, vers: q, regroupe: true, nombre: 0, poids: 0 });
      regroupes.get(cle).appartenance = true;
    }
  }
  traitsVisibles.push(...regroupes.values());

  // Les paquets pour la répartition autour du cercle (un groupe replié = sa
  // seule bulle, mais il garde le poids de tous ses membres).
  unitesVisibles = unites.map((u) => ({
    noeuds: [...new Set(u.map((r) => noeudVisibleDe(r.id)))],
    poids: u.length,
  }));
}

// Recale les membres d'un groupe replié sur sa bulle (qui a pu bouger), en
// gardant leur disposition : utile avant d'ouvrir le groupe ou d'enregistrer.
// (seulement les membres cachés dans la bulle : ceux qui font le pont avec
// un autre groupe sont visibles et bougent d'eux-mêmes)
function recalerMembres(n) {
  const caches = n.groupe.membres.filter((r) => groupeReplie(r.id) === n.groupe);
  if (!caches.length) return;
  const c = centreDe(caches);
  const dx = n.x - c.x, dy = n.y - c.y;
  for (const r of caches) { r.x += dx; r.y += dy; }
}

// Enregistre (en recalant d'abord les membres des groupes repliés).
function enregistrer() {
  for (const n of noeudsGroupes.values()) recalerMembres(n);
  sauvegarder();
}

function ouvrirGroupe(id) {
  if (groupesOuverts.has(id)) return;
  const n = noeudsGroupes.get(id);
  if (n) {
    recalerMembres(n);
    espacerMembres(n.groupe.membres);
  }
  groupesOuverts.add(id);
  dessinerCarte();
}

// À l'ouverture d'un groupe, ses membres trop serrés sont écartés autour de
// leur centre, pour que les noms soient lisibles tout de suite.
function espacerMembres(membres) {
  const c = centreDe(membres);
  const place = d3.sum(membres, (r) => 2 * rayonAvecNom(r));   // tour nécessaire
  const rayonVoulu = Math.max(1.4 * place / (2 * Math.PI), 50);
  const rayonActuel = d3.mean(membres, (r) => Math.hypot(r.x - c.x, r.y - c.y)) || 0;
  if (rayonActuel >= rayonVoulu * 0.8) return; // déjà assez espacés
  // on garde l'ordre autour du centre, et on les place sur un cercle
  membres.slice()
    .sort((a, b) => Math.atan2(a.y - c.y, a.x - c.x) - Math.atan2(b.y - c.y, b.x - c.x))
    .forEach((r, k) => {
      const a = (2 * Math.PI * k) / membres.length;
      r.x = c.x + Math.cos(a) * rayonVoulu;
      r.y = c.y + Math.sin(a) * rayonVoulu;
      r.vx = 0;
      r.vy = 0;
    });
}

function replierGroupe(id) {
  if (!groupesOuverts.has(id)) return;
  groupesOuverts.delete(id);
  dessinerCarte();
}

// Ce qui est mis en évidence (bulles et/ou lien dont le panneau est ouvert).
let bullesSelectionnees = [];
let lienSelectionne = null;

// Fonctions appelées lors des actions sur la carte (définies dans interface.js).
let quandOnCliqueUneBulle = () => {};
let quandOnCliqueUnLien = () => {};
let quandOnRelieDeuxBulles = () => {};
let quandOnCliqueUnGroupe = () => {};

// --- La "physique" qui place les bulles -----------------------------------

// Règle maison : une bulle sortie de son disque y est ramenée doucement.
// À l'intérieur du disque, elle reste libre là où on la pose.
// Les bulles de groupe sont ramenées vers la distance moyenne de leurs membres.
function forceDisque() {
  for (const r of noeuds) {
    if (estGroupe(r)) {
      const distance = Math.hypot(r.x, r.y) || 1;
      const traction = ((distance - r.distanceCible) / distance) * 0.05;
      r.vx -= r.x * traction;
      r.vy -= r.y * traction;
      continue;
    }
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
    .attr("x1", (l) => noeudsParId.get(l.de).x)
    .attr("y1", (l) => noeudsParId.get(l.de).y)
    .attr("x2", (l) => noeudsParId.get(l.vers).x)
    .attr("y2", (l) => noeudsParId.get(l.vers).y);
  // Halo autour des membres de chaque groupe ouvert
  halos.each(function (g) {
    const c = centreDe(g.membres);
    const rayon = d3.max(g.membres, (r) => Math.hypot(r.x - c.x, r.y - c.y) + rayonBulle(r)) + 18;
    d3.select(this).select("circle").attr("cx", c.x).attr("cy", c.y).attr("r", rayon);
    d3.select(this).select("text").attr("x", c.x).attr("y", c.y - rayon - 6);
  });
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
  if (unitesVisibles.length < 2) return;
  const total = d3.sum(unitesVisibles, (u) => u.poids);

  // Centre de chaque paquet (moyenne des positions de ses membres), sa
  // direction vue depuis "moi" (son angle) et sa part du tour.
  const centres = unitesVisibles.map((u) => {
    const { x, y } = centreDe(u.noeuds);
    return { x, y, angle: Math.atan2(y, x), distance: Math.hypot(x, y) || 1,
             part: (2 * Math.PI * u.poids) / total };
  });

  // On calcule d'abord la poussée de chaque paquet...
  const poussees = centres.map((centre, i) => {
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
    const poussee = ECARTEMENT_GROUPES * Math.sqrt(alpha) * somme;
    return Math.max(-VITESSE_MAX_GROUPES, Math.min(VITESSE_MAX_GROUPES, poussee));
  });

  // ... puis on retire la poussée moyenne : les paquets s'écartent les uns
  // des autres, mais la carte entière ne tourne pas comme un manège.
  const moyenne = d3.mean(poussees);

  centres.forEach((centre, i) => {
    const poussee = poussees[i] - moyenne;
    // On pousse le paquet le long du cercle (perpendiculairement à la
    // direction de "moi"), sans le rapprocher ni l'éloigner du centre.
    // La poussée est partagée entre ses bulles : un grand paquet ouvert ne
    // reçoit pas plus d'élan qu'une personne seule.
    const tx = -centre.y / centre.distance;
    const ty = centre.x / centre.distance;
    const part = poussee / unitesVisibles[i].noeuds.length;
    for (const r of unitesVisibles[i].noeuds) {
      r.vx += tx * part;
      r.vy += ty * part;
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
  const dejaPlacees = new Set(); // membre de plusieurs groupes : placé une seule fois
  for (const i of ordre) {
    const part = (2 * Math.PI * unites[i].length) / total;
    for (const c of CERCLES) {
      const membres = unites[i].filter((r) => r.cercle === c.niveau && !dejaPlacees.has(r.id))
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
        dejaPlacees.add(r.id);
      });
    }
    angle += part;
  }
  replacerBullesDeGroupes();
  mettreAJourPositions();
  relancerAnimation(0.4);
  sauvegarder();
  return anciennes;
}

// Place chaque bulle de groupe replié au centre de ses membres.
function replacerBullesDeGroupes() {
  for (const n of noeudsGroupes.values()) {
    Object.assign(n, centreDe(n.groupe.membres));
    n.vx = 0;
    n.vy = 0;
  }
}

// Remet les positions d'avant un rangement.
function annulerRangement(anciennes) {
  for (const p of anciennes) {
    const r = relationsParId.get(p.id);
    if (r) { r.x = p.x; r.y = p.y; r.vx = 0; r.vy = 0; }
  }
  replacerBullesDeGroupes();
  mettreAJourPositions();
  relancerAnimation(0.2);
  sauvegarder();
}

// --- Les liens ----------------------------------------------------------------

// Les bulles reliées s'attirent, plus ou moins selon le type de lien.
// Un trait regroupé (vers un groupe replié) attire doucement.
const forceLiens = d3.forceLink()
  .id((r) => r.id)
  .distance((l) => (l.regroupe ? rayonBulle(l.source) + rayonBulle(l.target) + (l.appartenance ? 40 : 70) : typeDeLien(l.type).distance))
  .strength((l) => (l.appartenance ? 0.25 : l.regroupe ? 0.08 : typeDeLien(l.type).attraction));

// Quatre règles : chaque bulle reste dans son disque (la plus forte),
// les bulles reliées se rapprochent, les groupes s'écartent les uns des
// autres, et les bulles se repoussent pour ne pas se chevaucher.
// alphaDecay règle la durée de l'animation : plus il est petit, plus le
// mouvement dure longtemps en ralentissant (ici environ 20 secondes).
const simulation = d3.forceSimulation()
  .alphaDecay(0.006)
  .force("disque", forceDisque)
  .force("liens", forceLiens)
  .force("groupes", forceGroupes)
  .force("ecart", d3.forceCollide(rayonAvecNom))
  .on("tick", mettreAJourPositions)
  .on("end", enregistrer); // les bulles se sont arrêtées : on garde leur place

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

// En modes Liens et Groupes, la carte reste immobile pour qu'on puisse
// enchaîner les modifications sans que les bulles bougent ; en sortant, elle
// reprend son mouvement.
const carteImmobile = (mode) => mode === "liens" || mode === "groupes";

// Groupes ouverts automatiquement en entrant dans le mode Groupes (ils sont
// repliés en sortant).
const ouvertsParLeModeGroupes = new Set();

function changerModeEdition(mode) {
  const avant = modeEdition;
  modeEdition = mode;
  if (mode !== "groupes") activerLasso(false);
  if (mode === "groupes" && avant !== "groupes") {
    // tous les groupes s'ouvrent, pour que chaque personne soit accessible
    for (const g of groupesActuels) {
      if (!groupesOuverts.has(g.id)) {
        ouvertsParLeModeGroupes.add(g.id);
        const n = noeudsGroupes.get(g.id);
        if (n) { recalerMembres(n); espacerMembres(g.membres); }
        groupesOuverts.add(g.id);
      }
    }
    dessinerCarte();
  }
  if (avant === "groupes" && mode !== "groupes") {
    for (const id of ouvertsParLeModeGroupes) groupesOuverts.delete(id);
    ouvertsParLeModeGroupes.clear();
    dessinerCarte();
  }
  if (carteImmobile(mode)) simulation.stop();
  else if (carteImmobile(avant)) simulation.alpha(0.5).restart();
}

// Relance l'animation, sauf dans les modes où la carte reste immobile.
function relancerAnimation(alpha) {
  if (carteImmobile(modeEdition)) return;
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
  return noeuds.find(
    (r) => !estGroupe(r) && r !== deplacee && Math.hypot(r.x - x, r.y - y) < tolerance(r)
  ) || null;
}

const glisser = d3.drag()
  // En mode édition, les bulles de groupe ne se déplacent pas (il faut
  // ouvrir le groupe pour modifier ses membres) ; en mode Groupes, on touche
  // les personnes sans les déplacer.
  .filter((evenement, n) => !evenement.ctrlKey && !evenement.button &&
    !(estGroupe(n) && modeEdition) && modeEdition !== "groupes")
  .on("start", (evenement, r) => {
    // L'animation est relancée pour que les autres bulles s'écartent
    // pendant qu'on déplace celle-ci (inutile en mode Liens : rien ne bouge).
    if (!evenement.active && !carteImmobile(modeEdition)) simulation.alphaTarget(0.3).restart();
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
    enregistrer();
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

// --- Le lasso (mode Groupes) --------------------------------------------------

// En mode Groupes, avec le bouton « Lasso » activé, glisser sur le fond de la
// carte trace un lasso ; au lâcher, les personnes entourées sont transmises
// à quandOnEntoure (interface.js). Sans le lasso, glisser déplace la carte.
let quandOnEntoure = () => {};
let lasso = null; // { idPointeur, points: [[x, y]...], trace }
let lassoActif = false;

function activerLasso(actif) {
  lassoActif = actif;
  svg.classed("lasso-actif", actif);
  if (!actif) annulerLasso();
}

svg.on("pointerdown.lasso", (evenement) => {
  if (lasso) { annulerLasso(); return; } // un deuxième doigt : on abandonne
  if (!lassoActif || modeEdition !== "groupes" || evenement.button) return;
  // seulement sur le fond (pas sur une bulle, un trait ou un halo)
  if (evenement.target.closest(".bulle, .lien, .halo")) return;
  lasso = {
    idPointeur: evenement.pointerId,
    points: [d3.pointer(evenement, monde.node())],
    trace: calqueLasso.append("path").attr("class", "lasso"),
  };
});

window.addEventListener("pointermove", (evenement) => {
  if (!lasso || evenement.pointerId !== lasso.idPointeur) return;
  lasso.points.push(d3.pointer(evenement, monde.node()));
  lasso.trace.attr("d", "M" + lasso.points.join("L") + "Z");
});

window.addEventListener("pointerup", (evenement) => {
  if (!lasso || evenement.pointerId !== lasso.idPointeur) return;
  const polygone = lasso.points;
  annulerLasso();
  if (polygone.length < 3 || Math.abs(d3.polygonArea(polygone)) < 100) return; // simple toucher
  const entourees = noeuds.filter((n) => !estGroupe(n) && d3.polygonContains(polygone, [n.x, n.y]));
  if (entourees.length) quandOnEntoure(entourees);
});

window.addEventListener("pointercancel", () => annulerLasso());

function annulerLasso() {
  if (lasso) lasso.trace.remove();
  lasso = null;
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
  calculerGroupes();
  construireNoeuds();

  // Les traits : une ligne large et invisible pour cliquer facilement,
  // et la ligne visible par-dessus. Un trait regroupé (vers un groupe
  // replié) est gris, plus épais s'il représente beaucoup de liens.
  traits = calqueLiens
    .selectAll("g.lien")
    .data(traitsVisibles, (l) => l.id)
    .join((entree) => {
      const nouveau = entree.append("g")
        .attr("class", "lien")
        .on("click", (evenement, l) => {
          evenement.stopPropagation();
          if (l.regroupe) {
            const n = [noeudsParId.get(l.de), noeudsParId.get(l.vers)].find(estGroupe);
            if (n) quandOnCliqueUnGroupe(n.groupe);
          } else {
            quandOnCliqueUnLien(l.lien);
          }
        });
      nouveau.append("line").attr("class", "lien-zone");
      nouveau.append("line").attr("class", "lien-trait");
      return nouveau;
    });

  traits.classed("lien-regroupe", (l) => Boolean(l.regroupe));
  traits.classed("lien-appartenance", (l) => Boolean(l.appartenance));
  traits.select(".lien-trait")
    .attr("stroke", (l) => (l.regroupe ? "#6c6f7f" : typeDeLien(l.type).couleur))
    .attr("stroke-width", (l) => (l.regroupe ? 1.5 + Math.log2(Math.max(l.nombre, 1)) : typeDeLien(l.type).epaisseur))
    .attr("stroke-dasharray", (l) => (l.appartenance ? "5 4" : l.regroupe ? null : typeDeLien(l.type).pointilles));

  // Les bulles : personnes visibles et groupes repliés
  bulles = calqueBulles
    .selectAll("g.bulle")
    .data(noeuds, (r) => r.id)
    .join((entree) => {
      const nouvelle = entree.append("g")
        .attr("class", "bulle")
        .call(glisser)
        .on("click", (evenement, r) => {
          evenement.stopPropagation();
          if (estGroupe(r)) quandOnCliqueUnGroupe(r.groupe);
          else quandOnCliqueUneBulle(r);
        });
      nouvelle.append("circle").attr("class", "disque");
      nouvelle.append("circle").attr("class", "zone-tactile");
      nouvelle.append("text").attr("class", "nom");
      nouvelle.append("text").attr("class", "compte");
      return nouvelle;
    });

  // Couleur et nom (qui peuvent avoir changé) ; les tailles dépendent aussi
  // du zoom, elles sont réglées par ajusterAuZoom().
  bulles.classed("bulle-groupe", estGroupe);
  bulles.select(".disque")
    .attr("fill", (r) => (estGroupe(r) ? "#ffffff" : couleurDuCercle(r.cercle)))
    .style("stroke", (r) => (estGroupe(r) ? couleurDuCercle(r.cercle) : null));
  bulles.select("text.nom").text((r) => r.nom);
  bulles.select("text.compte").text((r) => (estGroupe(r) ? r.groupe.membres.length : ""));

  // Un halo à son nom autour des membres de chaque groupe ouvert ; un clic
  // dessus ouvre le panneau du groupe.
  halos = calqueHalos
    .selectAll("g.halo")
    .data(groupesActuels.filter((g) => groupesOuverts.has(g.id)), (g) => g.id)
    .join((entree) => {
      const nouveau = entree.append("g")
        .attr("class", "halo")
        .on("click", (evenement, g) => {
          evenement.stopPropagation();
          quandOnCliqueUnGroupe(g);
        });
      nouveau.append("circle");
      nouveau.append("text");
      return nouveau;
    });
  halos.select("text").text((g) => g.nom);
  ajusterAuZoom();

  afficherSelection();
  afficherFiltres();
  afficherRecherche();
  mettreAJourPositions();
  simulation.nodes(noeuds);
  // D3 transforme les liens qu'on lui donne : on lui passe donc des copies,
  // sans les liens "se détestent" qui n'attirent pas.
  forceLiens.links(
    traitsVisibles
      .filter((l) => (l.regroupe ? l.poids > 0 || l.appartenance : typeDeLien(l.type).attraction > 0))
      .map((l) => ({ source: l.de, target: l.vers, type: l.type, regroupe: l.regroupe, appartenance: l.appartenance }))
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
  enregistrer();
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
  const tailleNom = (r) => tailleTexte(r) * agrandissement;

  bulles.select(".disque").attr("r", rayonAffiche);
  bulles.select(".zone-tactile").attr("r", (r) => Math.max(rayonAffiche(r), ZONE_TACTILE_ECRAN / echelle));
  bulles.select("text.nom")
    .style("font-size", (r) => tailleNom(r) + "px")
    .attr("y", (r) => rayonAffiche(r) + tailleNom(r) + 2);
  // le nombre de membres, au centre des bulles de groupe
  bulles.select("text.compte").style("font-size", 12 * agrandissement + "px");
  bulles.classed("nom-cache", (r) => !estGroupe(r) && r.cercle > 2 && agrandissement > SEUIL_NOMS_LOINTAINS);
  halos.select("text").style("font-size", 13 * agrandissement + "px");
  moi.select("text").style("font-size", 13 * agrandissement + "px");
  moi.select("circle").attr("r", Math.max(RAYON_MOI, 18 / echelle));
}

// Place réservée autour d'une bulle pour elle ET son nom (écrit dessous),
// afin que les bulles voisines ne viennent pas recouvrir le nom.
// La largeur du nom est estimée d'après son nombre de lettres.
// Calculée pour un écran de référence : la disposition est la même sur
// ordinateur et sur téléphone.
function rayonAvecNom(r) {
  const hauteurNom = tailleTexte(r) * AGRANDISSEMENT_REFERENCE;
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

  // (une personne cachée dans un groupe replié est représentée par sa bulle)
  const nettesVisibles = new Set([...nettes].map((id) => (noeudVisibleDe(id) || {}).id));
  bulles.classed("estompee", (r) => focus && !nettesVisibles.has(r.id));
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
  const trouvees = new Set(resultatsRecherche(texteRecherche).map((r) => (noeudVisibleDe(r.id) || r).id));
  bulles.classed("hors-recherche", (r) => active && !trouvees.has(r.id));
  traits.classed("hors-recherche", active);
  svg.classed("recherche", active);
}

// Quand on quitte la page ou qu'on change d'application (sur téléphone),
// on enregistre la position actuelle des bulles.
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") enregistrer();
});

// Au démarrage, si les bulles ont une place enregistrée, la carte reprend
// telle qu'on l'a laissée : l'animation repart très doucement.
const positionsConnues = relations.length > 0 && relations.every((r) => r.x !== undefined);
dessinerCarte();
if (positionsConnues) simulation.alpha(0.05);
