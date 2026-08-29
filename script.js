const canvas = document.getElementById("jeu");
const ctx = canvas.getContext("2d");
const boutonRejouer = document.getElementById("boutonRejouer");
const musiqueJeu = document.getElementById("musiqueJeu");

const gravite = 0.8;
const SOL_Y = 340;
const POINTS_VICTOIRE = 5000;
const VITESSE_BASE = 6;
const ESPACEMENT_MIN = 55;

let joueur, obstacles, score, bonusPoints, jeuTermine, victoire, compteur, nuages, prochainObstacle;
let vitesseDefilement = VITESSE_BASE;
let scintillementFin = 0;
let feuxArtifice = [];
let zoomActuel = 1;
let gouttesPluie = [];
let etoiles = [];
let eclairAlpha = 0;
let prochainEclair = 0;
let sautsRestants = 2;
let oiseaux;
let prochainOiseau;
let dernierSpawnCompteur = -9999;
let luminositeGlobale = 1;
let passagesOiseaux;
let prochainPassage;
let particulesExplosion = [];
let flashExplosion = 0;

// ---------- AUDIO ----------
let audioCtx;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
}

function jouerNote(freq, duree, type = "square", volume = 0.08) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duree);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duree);
}

function demarrerMusique() {
  musiqueJeu.currentTime = 0;
  musiqueJeu.volume = 0.5;
  musiqueJeu.play().catch(() => {});
}

function arreterMusique() {
  musiqueJeu.pause();
  musiqueJeu.currentTime = 0;
}

function jouerSonExplosion() {
  initAudio();

  const boom = audioCtx.createOscillator();
  const gainBoom = audioCtx.createGain();
  boom.type = "sine";
  boom.frequency.setValueAtTime(120, audioCtx.currentTime);
  boom.frequency.exponentialRampToValueAtTime(25, audioCtx.currentTime + 0.6);
  gainBoom.gain.setValueAtTime(0.5, audioCtx.currentTime);
  gainBoom.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);
  boom.connect(gainBoom);
  gainBoom.connect(audioCtx.destination);
  boom.start();
  boom.stop(audioCtx.currentTime + 0.6);

  const crack = audioCtx.createOscillator();
  const gainCrack = audioCtx.createGain();
  crack.type = "sawtooth";
  crack.frequency.setValueAtTime(400, audioCtx.currentTime);
  crack.frequency.exponentialRampToValueAtTime(60, audioCtx.currentTime + 0.15);
  gainCrack.gain.setValueAtTime(0.3, audioCtx.currentTime);
  gainCrack.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
  crack.connect(gainCrack);
  gainCrack.connect(audioCtx.destination);
  crack.start();
  crack.stop(audioCtx.currentTime + 0.15);

  const bufferSize = audioCtx.sampleRate * 0.9;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  const bruit = audioCtx.createBufferSource();
  bruit.buffer = buffer;
  const gainBruit = audioCtx.createGain();
  gainBruit.gain.setValueAtTime(0.35, audioCtx.currentTime);
  bruit.connect(gainBruit);
  gainBruit.connect(audioCtx.destination);
  bruit.start();

  for (let i = 0; i < 6; i++) {
    setTimeout(() => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "square";
      osc.frequency.value = 100 + Math.random() * 200;
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.2);
    }, 300 + i * 90 + Math.random() * 40);
  }
}

function jouerSonPalier() {
  initAudio();
  jouerNote(880, 0.15, "sine", 0.1);
  setTimeout(() => jouerNote(1174.66, 0.2, "sine", 0.1), 100);
}

function jouerFanfareVictoire() {
  initAudio();
  const notes = [
    [523.25, 0.2], [659.25, 0.2], [783.99, 0.2], [1046.5, 0.5]
  ];
  let t = 0;
  notes.forEach(([freq, duree]) => {
    setTimeout(() => jouerNote(freq, duree, "square", 0.12), t * 1000);
    t += duree;
  });
}

function jouerSonBonus() {
  initAudio();
  const notesPieces = [1046.5, 1318.51, 1567.98];
  notesPieces.forEach((f, i) => {
    setTimeout(() => jouerNote(f, 0.12, "square", 0.1), i * 70);
  });
  for (let i = 0; i < 16; i++) {
    setTimeout(() => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "square";
      osc.frequency.value = 200 + Math.random() * 500;
      gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.05);
    }, 220 + i * 35 + Math.random() * 20);
  }
}

// ---------- DÉCOR ----------
function initDecor() {
  nuages = [];
  for (let i = 0; i < 4; i++) {
    nuages.push({ x: Math.random() * canvas.width, y: 30 + Math.random() * 80 });
  }
  etoiles = [];
  for (let i = 0; i < 60; i++) {
    etoiles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * (SOL_Y - 20),
      taille: Math.random() * 1.5 + 0.5
    });
  }
  gouttesPluie = [];
  for (let i = 0; i < 120; i++) {
    gouttesPluie.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vitesse: 6 + Math.random() * 6
    });
  }
}

function deplacerNuages() {
  nuages.forEach(n => {
    n.x -= 0.4;
    if (n.x < -50) n.x = canvas.width + 50;
  });
}

function calculerLuminosite(points) {
  return (1 + Math.cos((2 * Math.PI * points) / 1000)) / 2;
}

function dessinerAstres(points) {
  const cyclePos = (((points % 1000) + 1000) % 1000) / 1000;
  const estJour = cyclePos < 0.5;
  const local = estJour ? cyclePos / 0.5 : (cyclePos - 0.5) / 0.5;
  const x = 40 + local * 720;
  const y = 90 - Math.sin(local * Math.PI) * 55;

  if (estJour) {
    ctx.fillStyle = "#ffe066";
    ctx.beginPath();
    ctx.arc(x, y, 26, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = "#e8e8f0";
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#c9c9d6";
    ctx.beginPath();
    ctx.arc(x - 7, y - 4, 4, 0, Math.PI * 2);
    ctx.arc(x + 5, y + 6, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function dessinerFond(points) {
  const luminosite = calculerLuminosite(points);
  luminositeGlobale = luminosite;

  const degrade = ctx.createLinearGradient(0, 0, 0, canvas.height);
  degrade.addColorStop(0, "#87CEEB");
  degrade.addColorStop(1, "#e0f7fa");
  ctx.fillStyle = degrade;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  dessinerAstres(points);

  ctx.fillStyle = "#a3d9a5";
  ctx.beginPath();
  ctx.moveTo(0, SOL_Y);
  ctx.quadraticCurveTo(150, SOL_Y - 60, 300, SOL_Y);
  ctx.quadraticCurveTo(450, SOL_Y - 40, 600, SOL_Y);
  ctx.quadraticCurveTo(720, SOL_Y - 70, 800, SOL_Y);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.85)";
  nuages.forEach(n => {
    ctx.beginPath();
    ctx.arc(n.x, n.y, 15, 0, Math.PI * 2);
    ctx.arc(n.x + 15, n.y - 5, 18, 0, Math.PI * 2);
    ctx.arc(n.x + 30, n.y, 15, 0, Math.PI * 2);
    ctx.fill();
  });

  const nuit = 1 - luminosite;
  if (nuit > 0.02) {
    ctx.fillStyle = `rgba(5,5,35,${nuit * 0.65})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = `rgba(255,255,255,${nuit})`;
    etoiles.forEach(e => {
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.taille, 0, Math.PI * 2);
      ctx.fill();
    });
  }
}

function dessinerSol() {
  ctx.fillStyle = "#6b8e23";
  ctx.fillRect(0, SOL_Y, canvas.width, canvas.height - SOL_Y);
  ctx.fillStyle = "#4a6b1f";
  ctx.fillRect(0, SOL_Y, canvas.width, 6);
}

function dessinerHalo(x, y, rayon) {
  const intensite = Math.max(0, (0.45 - luminositeGlobale) / 0.45);
  if (intensite <= 0) return;
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, rayon);
  gradient.addColorStop(0, `rgba(255,240,180,${0.55 * intensite})`);
  gradient.addColorStop(1, "rgba(255,240,180,0)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, rayon, 0, Math.PI * 2);
  ctx.fill();
}

// ---------- MÉTÉO ----------
function deplacerEtDessinerPluie() {
  ctx.strokeStyle = "rgba(180,200,255,0.6)";
  ctx.lineWidth = 1.5;
  gouttesPluie.forEach(g => {
    ctx.beginPath();
    ctx.moveTo(g.x, g.y);
    ctx.lineTo(g.x - 3, g.y + 12);
    ctx.stroke();
    g.y += g.vitesse;
    g.x -= 2;
    if (g.y > canvas.height) {
      g.y = -10;
      g.x = Math.random() * canvas.width;
    }
  });
}

function gererEclairs(points) {
  if (points < 1500) return;

  if (compteur >= prochainEclair) {
    eclairAlpha = 0.7;
    prochainEclair = compteur + 150 + Math.random() * 250;
  }

  if (eclairAlpha > 0) {
    ctx.fillStyle = `rgba(255,255,255,${eclairAlpha})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    eclairAlpha -= 0.08;
    if (eclairAlpha < 0) eclairAlpha = 0;
  }
}

// ---------- PERSONNAGES ----------
function dessinerPersonnage(x, pieds, echelle, couleurShirt) {
  const anim = Math.floor(compteur / 6) % 2;
  const h = 44 * echelle;
  const y = pieds - h;

  ctx.strokeStyle = "#3b2f2f";
  ctx.lineWidth = 3 * echelle;
  ctx.lineCap = "round";

  ctx.fillStyle = "#f1c27d";
  ctx.beginPath();
  ctx.arc(x + 15 * echelle, y + 10 * echelle, 9 * echelle, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#3b2f2f";
  ctx.beginPath();
  ctx.moveTo(x + 10 * echelle, y + 3 * echelle);
  ctx.quadraticCurveTo(x + 12 * echelle, y - 8 * echelle, x + 16 * echelle, y - 2 * echelle);
  ctx.quadraticCurveTo(x + 18 * echelle, y - 9 * echelle, x + 21 * echelle, y - 1 * echelle);
  ctx.quadraticCurveTo(x + 20 * echelle, y + 3 * echelle, x + 15 * echelle, y + 2 * echelle);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#222";
  ctx.beginPath();
  ctx.arc(x + 12 * echelle, y + 9 * echelle, 1.3 * echelle, 0, Math.PI * 2);
  ctx.arc(x + 18 * echelle, y + 9 * echelle, 1.3 * echelle, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = couleurShirt;
  ctx.fillRect(x + 8 * echelle, y + 18 * echelle, 14 * echelle, 14 * echelle);

  ctx.strokeStyle = couleurShirt;
  ctx.beginPath();
  ctx.moveTo(x + 15 * echelle, y + 20 * echelle);
  ctx.lineTo(x + 4 * echelle, y + 28 * echelle);
  ctx.moveTo(x + 15 * echelle, y + 20 * echelle);
  ctx.lineTo(x + 26 * echelle, y + 28 * echelle);
  ctx.stroke();

  ctx.strokeStyle = "#3b2f2f";
  ctx.beginPath();
  ctx.moveTo(x + 15 * echelle, y + 19 * echelle);
  ctx.lineTo(x + 15 * echelle, y + 32 * echelle);
  ctx.stroke();

  ctx.strokeStyle = "#8b5a2b";
  ctx.lineWidth = 4 * echelle;
  ctx.beginPath();
  if (!joueur.surLeSol) {
    ctx.moveTo(x + 15 * echelle, y + 32 * echelle);
    ctx.lineTo(x + 8 * echelle, y + 42 * echelle);
    ctx.moveTo(x + 15 * echelle, y + 32 * echelle);
    ctx.lineTo(x + 22 * echelle, y + 42 * echelle);
  } else if (anim === 0) {
    ctx.moveTo(x + 15 * echelle, y + 32 * echelle);
    ctx.lineTo(x + 6 * echelle, y + 44 * echelle);
    ctx.moveTo(x + 15 * echelle, y + 32 * echelle);
    ctx.lineTo(x + 22 * echelle, y + 44 * echelle);
  } else {
    ctx.moveTo(x + 15 * echelle, y + 32 * echelle);
    ctx.lineTo(x + 8 * echelle, y + 44 * echelle);
    ctx.moveTo(x + 15 * echelle, y + 32 * echelle);
    ctx.lineTo(x + 24 * echelle, y + 44 * echelle);
  }
  ctx.stroke();
}

function largeurTotaleDuo() { return 26 + 42 * 1.4; }
function hauteurMaxDuo() { return 44 * 1.4; }

function dessinerJoueur() {
  const pieds = joueur.y + joueur.hauteur;

  const enScintillement = compteur < scintillementFin;
  if (enScintillement && Math.floor(compteur / 4) % 2 === 0) {
    return;
  }

  dessinerPersonnage(joueur.x, pieds, 1, "#3b82f6");
  dessinerPersonnage(joueur.x + 26, pieds, 1.4, "#ef4444");
}

// ---------- OBSTACLES ----------
function planifierProchainObstacle() {
  prochainObstacle = compteur + 60 + Math.random() * 180;
}

function typeAleatoireObstacle() {
  const r = Math.random();
  if (r < 0.20) return "zombieGeant";
  if (r < 0.38) return "zombie";
  if (r < 0.58) return "rocher";
  if (r < 0.80) return "pic";
  return "caisse";
}

function creerObstacle() {
  const type = typeAleatoireObstacle();
  let taille;
  if (type === "zombieGeant") taille = 130 + Math.random() * 30;
  else if (type === "zombie") taille = 36 + Math.random() * 8;
  else taille = 25 + Math.random() * 15;
  obstacles.push({ x: canvas.width, type, taille, decalage: Math.random() * 100 });
}

function dessinerZombie(x, taille, decalage, geant) {
  const balancement = Math.sin((compteur + decalage) / 8) * (geant ? 5 : 3);
  const hautZ = SOL_Y - taille;
  const couleurPeau = geant ? "#3d5a35" : "#6b9457";
  const couleurVetement = geant ? "#2b2b2b" : "#4a4a4a";

  dessinerHalo(x, hautZ + taille * 0.5, taille * 0.9);

  ctx.strokeStyle = "#2a2a2a";
  ctx.lineWidth = taille * 0.14;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x - taille / 5, hautZ + taille * 0.85);
  ctx.lineTo(x - taille / 5, SOL_Y);
  ctx.moveTo(x + taille / 5, hautZ + taille * 0.85);
  ctx.lineTo(x + taille / 5, SOL_Y);
  ctx.stroke();

  ctx.fillStyle = couleurVetement;
  ctx.fillRect(x - taille / 3, hautZ + taille * 0.32, taille / 1.5, taille * 0.55);
  ctx.fillStyle = couleurPeau;
  ctx.beginPath();
  ctx.moveTo(x - taille * 0.15, hautZ + taille * 0.5);
  ctx.lineTo(x - taille * 0.05, hautZ + taille * 0.62);
  ctx.lineTo(x - taille * 0.2, hautZ + taille * 0.7);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = couleurPeau;
  ctx.lineWidth = taille * 0.1;
  ctx.beginPath();
  ctx.moveTo(x - taille / 3, hautZ + taille * 0.42);
  ctx.lineTo(x - taille / 2 - balancement, hautZ + taille * 0.25);
  ctx.moveTo(x + taille / 3, hautZ + taille * 0.42);
  ctx.lineTo(x + taille / 2 + balancement, hautZ + taille * 0.25);
  ctx.stroke();

  ctx.fillStyle = couleurPeau;
  ctx.beginPath();
  ctx.arc(x, hautZ + taille * 0.16, taille * 0.19, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ff3b30";
  ctx.beginPath();
  ctx.arc(x - taille * 0.06, hautZ + taille * 0.13, taille * 0.035, 0, Math.PI * 2);
  ctx.arc(x + taille * 0.08, hautZ + taille * 0.18, taille * 0.035, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#1a1a1a";
  ctx.lineWidth = taille * 0.02;
  ctx.beginPath();
  ctx.arc(x + taille * 0.01, hautZ + taille * 0.22, taille * 0.05, 0, Math.PI);
  ctx.stroke();

  if (geant) {
    ctx.fillStyle = "#1a1a1a";
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(x + i * taille * 0.06, hautZ - taille * 0.02);
      ctx.lineTo(x + i * taille * 0.06 - 3, hautZ + taille * 0.08);
      ctx.lineTo(x + i * taille * 0.06 + 3, hautZ + taille * 0.08);
      ctx.closePath();
      ctx.fill();
    }
  }
}

function dessinerObstacles() {
  obstacles.forEach(o => {
    if (o.type === "rocher") {
      dessinerHalo(o.x, SOL_Y - o.taille / 2, o.taille);
      ctx.fillStyle = "#7a6a58";
      ctx.beginPath();
      ctx.arc(o.x, SOL_Y - o.taille / 2, o.taille / 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (o.type === "pic") {
      dessinerHalo(o.x, SOL_Y - o.taille / 2, o.taille);
      ctx.fillStyle = "#5a5a5a";
      ctx.beginPath();
      ctx.moveTo(o.x - o.taille / 2, SOL_Y);
      ctx.lineTo(o.x, SOL_Y - o.taille);
      ctx.lineTo(o.x + o.taille / 2, SOL_Y);
      ctx.closePath();
      ctx.fill();
    } else if (o.type === "zombie") {
      dessinerZombie(o.x, o.taille, o.decalage, false);
    } else if (o.type === "zombieGeant") {
      dessinerZombie(o.x, o.taille, o.decalage, true);
    } else {
      dessinerHalo(o.x, SOL_Y - o.taille / 2, o.taille);
      ctx.fillStyle = "#8b5a2b";
      ctx.fillRect(o.x - o.taille / 2, SOL_Y - o.taille, o.taille, o.taille);
    }
  });
}

function deplacerObstacles() {
  obstacles.forEach(o => o.x -= vitesseDefilement);
  obstacles = obstacles.filter(o => o.x + o.taille > 0);
}

function verifierCollision() {
  const margeJ = 5;
  const gaucheJ = joueur.x + margeJ;
  const droiteJ = joueur.x + largeurTotaleDuo() - margeJ;
  const piedsJ = joueur.y + joueur.hauteur - 2;
  const hautJ = piedsJ - hauteurMaxDuo() + 8;

  obstacles.forEach(o => {
    const margeO = o.type === "zombieGeant" ? 10 : 6;
    const oGauche = o.x - o.taille / 2 + margeO;
    const oDroite = o.x + o.taille / 2 - margeO;
    const oHaut = SOL_Y - o.taille + 4;

    if (
      !jeuTermine &&
      gaucheJ < oDroite &&
      droiteJ > oGauche &&
      hautJ < SOL_Y &&
      piedsJ > oHaut
    ) {
      jeuTermine = true;
      victoire = false;
      terminerJeu();
    }
  });
}

// ---------- OISEAUX (obstacles aériens, dont géants) ----------
function planifierProchainOiseau() {
  prochainOiseau = compteur + 110 + Math.random() * 220;
}

function creerOiseau() {
  const geant = Math.random() < 0.4;
  const hauteurVol = 100 + Math.random() * 140;
  oiseaux.push({
    x: canvas.width,
    y: SOL_Y - hauteurVol,
    envergure: geant ? 85 + Math.random() * 25 : 40 + Math.random() * 16,
    decalage: Math.random() * 100,
    geant
  });
}

function dessinerOiseaux() {
  oiseaux.forEach(o => {
    dessinerHalo(o.x, o.y, o.envergure * 0.9);

    const battement = Math.sin((compteur + o.decalage) / (o.geant ? 8 : 5)) * (o.geant ? 16 : 10);
    const couleurCorps = o.geant ? "#7a3b1f" : "#4a5b6e";
    const couleurAile = o.geant ? "#5c2c15" : "#2c3a47";

    ctx.fillStyle = couleurCorps;
    ctx.beginPath();
    ctx.ellipse(o.x, o.y, o.envergure * 0.28, o.envergure * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = couleurAile;
    ctx.lineWidth = o.geant ? 5 : 3.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(o.x - o.envergure / 2, o.y + battement);
    ctx.quadraticCurveTo(o.x - o.envergure * 0.15, o.y - battement * 0.6, o.x, o.y - 3);
    ctx.moveTo(o.x + o.envergure / 2, o.y + battement);
    ctx.quadraticCurveTo(o.x + o.envergure * 0.15, o.y - battement * 0.6, o.x, o.y - 3);
    ctx.stroke();

    ctx.fillStyle = couleurCorps;
    ctx.beginPath();
    ctx.arc(o.x + o.envergure * 0.22, o.y - o.envergure * 0.06, o.envergure * 0.13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f5a623";
    ctx.beginPath();
    ctx.moveTo(o.x + o.envergure * 0.32, o.y - o.envergure * 0.06);
    ctx.lineTo(o.x + o.envergure * 0.42, o.y - o.envergure * 0.02);
    ctx.lineTo(o.x + o.envergure * 0.32, o.y);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = o.geant ? "#ff3b30" : "#111";
    ctx.beginPath();
    ctx.arc(o.x + o.envergure * 0.24, o.y - o.envergure * 0.09, o.geant ? 3 : 1.6, 0, Math.PI * 2);
    ctx.fill();
  });
}

function deplacerOiseaux() {
  oiseaux.forEach(o => o.x -= vitesseDefilement * 1.15);
  oiseaux = oiseaux.filter(o => o.x + o.envergure > 0);
}

function verifierCollisionOiseaux() {
  const margeJ = 5;
  const gaucheJ = joueur.x + margeJ;
  const droiteJ = joueur.x + largeurTotaleDuo() - margeJ;
  const piedsJ = joueur.y + joueur.hauteur - 2;
  const hautJ = piedsJ - hauteurMaxDuo() + 8;

  for (let i = oiseaux.length - 1; i >= 0; i--) {
    const o = oiseaux[i];
    const margeO = 6;
    const gaucheO = o.x - o.envergure / 2 + margeO;
    const droiteO = o.x + o.envergure / 2 - margeO;
    const hautO = o.y - o.envergure * 0.22;
    const basO = o.y + o.envergure * 0.22;

    const chevaucheX = gaucheJ < droiteO && droiteJ > gaucheO;
    const chevaucheY = hautJ < basO && piedsJ > hautO;

    if (!jeuTermine && chevaucheX && chevaucheY) {
      const estRebond = joueur.vitesseY > 0 && (piedsJ - o.y) < o.envergure * 0.3;

      if (estRebond) {
        oiseaux.splice(i, 1);
        joueur.vitesseY = -14;
        sautsRestants = 2;
        bonusPoints += o.geant ? 400 : 300;
        jouerSonBonus();
      } else {
        jeuTermine = true;
        victoire = false;
        terminerJeu();
      }
    }
  }
}

// ---------- OISEAU DU HAUT DU CADRE (obstacle à part entière, un seul à la fois) ----------
function planifierProchainPassage() {
  prochainPassage = compteur + 200 + Math.random() * 300;
}

function creerPassageOiseaux() {
  const y = 20 + Math.random() * 25;
  const vitesse = 2.5 + Math.random() * 1.5;
  passagesOiseaux.push({
    x: canvas.width + 50,
    y,
    vitesse,
    envergure: 42,
    decalageAnim: Math.random() * 100
  });
}

function deplacerEtDessinerPassages() {
  ctx.strokeStyle = "#2c2c2c";
  ctx.lineWidth = 3.5;
  ctx.lineCap = "round";

  passagesOiseaux.forEach(o => {
    o.x -= o.vitesse;
    const battement = Math.sin((compteur + o.decalageAnim) / 6) * 9;
    ctx.beginPath();
    ctx.moveTo(o.x - o.envergure / 2, o.y + battement);
    ctx.lineTo(o.x, o.y - 5);
    ctx.lineTo(o.x + o.envergure / 2, o.y + battement);
    ctx.stroke();
  });

  passagesOiseaux = passagesOiseaux.filter(o => o.x > -50);
}

function verifierCollisionPassages() {
  const margeJ = 5;
  const gaucheJ = joueur.x + margeJ;
  const droiteJ = joueur.x + largeurTotaleDuo() - margeJ;
  const piedsJ = joueur.y + joueur.hauteur - 2;
  const hautJ = piedsJ - hauteurMaxDuo() + 8;

  passagesOiseaux.forEach(o => {
    const margeO = 4;
    const gaucheO = o.x - o.envergure / 2 + margeO;
    const droiteO = o.x + o.envergure / 2 - margeO;
    const hautO = o.y - o.envergure / 2;
    const basO = o.y + o.envergure / 2;

    if (
      !jeuTermine &&
      gaucheJ < droiteO &&
      droiteJ > gaucheO &&
      hautJ < basO &&
      piedsJ > hautO
    ) {
      jeuTermine = true;
      victoire = false;
      terminerJeu();
    }
  });
}

// ---------- SCORE, TEMPS ET PALIERS ----------
function pointsActuels() {
  return Math.floor(score / 10) + bonusPoints;
}

function pointsTemps() {
  return Math.floor(score / 10);
}

function gererVitesse(points) {
  const ratio = Math.min(points, POINTS_VICTOIRE) / POINTS_VICTOIRE;
  vitesseDefilement = VITESSE_BASE * (1 + 2 * ratio);
}

function gererPaliers() {
  const points = pointsActuels();

  gererVitesse(points);

  if (points > 0 && points % 1000 === 0 && points < POINTS_VICTOIRE) {
    if (scintillementFin < compteur) {
      scintillementFin = compteur + 180;
      jouerSonPalier();
    }
  }

  if (points >= POINTS_VICTOIRE && !jeuTermine) {
    jeuTermine = true;
    victoire = true;
    terminerJeu();
  }
}

// ---------- EXPLOSION DE DÉFAITE ----------
function creerExplosion(cx, cy) {
  particulesExplosion = [];
  const nb = 90;
  const couleurs = ["#ff4500", "#ff8c00", "#ffd700", "#ff0000", "#333333"];
  for (let i = 0; i < nb; i++) {
    const angle = Math.random() * Math.PI * 2;
    const vitesse = 3 + Math.random() * 10;
    particulesExplosion.push({
      x: cx, y: cy,
      vx: Math.cos(angle) * vitesse,
      vy: Math.sin(angle) * vitesse,
      taille: 3 + Math.random() * 6,
      couleur: couleurs[Math.floor(Math.random() * couleurs.length)],
      vie: 50 + Math.random() * 30
    });
  }
  flashExplosion = 1;
}

function animerExplosion() {
  dessinerFond(pointsTemps());
  dessinerSol();

  if (flashExplosion > 0) {
    ctx.fillStyle = `rgba(255,255,255,${flashExplosion})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    flashExplosion -= 0.06;
  }

  particulesExplosion.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.15;
    p.vx *= 0.98;
    p.vie--;
    ctx.globalAlpha = Math.max(0, p.vie / 60);
    ctx.fillStyle = p.couleur;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.taille, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  });
  particulesExplosion = particulesExplosion.filter(p => p.vie > 0);

  ctx.fillStyle = "#fff";
  ctx.font = "30px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Game Over - Score: " + pointsActuels(), canvas.width / 2, 180);
  ctx.textAlign = "left";

  if (particulesExplosion.length > 0) {
    requestAnimationFrame(animerExplosion);
  }
}

// ---------- FIN DE PARTIE ----------
function terminerJeu() {
  arreterMusique();
  boutonRejouer.style.display = "block";

  if (victoire) {
    zoomActuel = 1;
    feuxArtifice = [];
    jouerFanfareVictoire();
    animerVictoire();
  } else {
    jouerSonExplosion();
    const cx = joueur.x + 40;
    const cy = joueur.y + joueur.hauteur - 20;
    creerExplosion(cx, cy);
    animerExplosion();
  }
}

function creerFeuArtifice() {
  const cx = 200 + Math.random() * 400;
  const cy = 80 + Math.random() * 150;
  const couleurs = ["#ff595e", "#ffca3a", "#8ac926", "#1982c4", "#6a4c93"];
  const couleur = couleurs[Math.floor(Math.random() * couleurs.length)];
  const particules = [];
  const nb = 24;
  for (let i = 0; i < nb; i++) {
    const angle = (Math.PI * 2 * i) / nb;
    particules.push({
      x: cx, y: cy,
      vx: Math.cos(angle) * (2 + Math.random() * 2),
      vy: Math.sin(angle) * (2 + Math.random() * 2),
      vie: 60
    });
  }
  feuxArtifice.push({ particules, couleur });
}

function animerVictoire() {
  if (zoomActuel < 1.8) zoomActuel += 0.02;

  if (Math.random() < 0.05) creerFeuArtifice();

  dessinerFond(pointsTemps());

  feuxArtifice.forEach(f => {
    ctx.fillStyle = f.couleur;
    f.particules.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.03;
      p.vie--;
      if (p.vie > 0) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    f.particules = f.particules.filter(p => p.vie > 0);
  });
  feuxArtifice = feuxArtifice.filter(f => f.particules.length > 0);

  dessinerSol();

  const pieds = joueur.y + joueur.hauteur;
  const centreX = joueur.x + 40;
  const centreY = pieds - 40;

  ctx.save();
  ctx.translate(centreX, centreY);
  ctx.scale(zoomActuel, zoomActuel);
  ctx.translate(-centreX, -centreY);
  dessinerJoueur();
  ctx.restore();

  ctx.fillStyle = "#222";
  ctx.font = "32px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Victoire ! Score: " + pointsActuels(), canvas.width / 2, 50);
  ctx.textAlign = "left";

  requestAnimationFrame(animerVictoire);
}

// ---------- SCORE ET CHRONOMÈTRE ----------
function dessinerScore() {
  ctx.fillStyle = "#333";
  ctx.font = "20px Arial";
  ctx.fillText("Score: " + pointsActuels(), 20, 30);

  const secondesTotales = Math.floor(compteur / 60);
  const minutes = Math.floor(secondesTotales / 60);
  const secondes = secondesTotales % 60;
  const tempsFormate = minutes + ":" + (secondes < 10 ? "0" : "") + secondes;
  ctx.font = "16px Arial";
  ctx.fillText("Temps: " + tempsFormate, 20, 52);
}

// ---------- BOUCLE PRINCIPALE ----------
function resetJeu() {
  boutonRejouer.style.display = "none";
  joueur = { x: 50, y: SOL_Y - 44, largeur: 30, hauteur: 44, vitesseY: 0, surLeSol: false };
  obstacles = [];
  oiseaux = [];
  passagesOiseaux = [];
  score = 0;
  bonusPoints = 0;
  jeuTermine = false;
  victoire = false;
  compteur = 0;
  vitesseDefilement = VITESSE_BASE;
  scintillementFin = 0;
  feuxArtifice = [];
  zoomActuel = 1;
  eclairAlpha = 0;
  prochainEclair = 400 + Math.random() * 300;
  sautsRestants = 2;
  dernierSpawnCompteur = -9999;
  particulesExplosion = [];
  flashExplosion = 0;
  planifierProchainObstacle();
  planifierProchainOiseau();
  planifierProchainPassage();
  initDecor();
  demarrerMusique();
  boucle();
}

function maj() {
  joueur.vitesseY += gravite;
  joueur.y += joueur.vitesseY;

  const limiteHaute = 0 - (hauteurMaxDuo() - joueur.hauteur);
  if (joueur.y < limiteHaute) {
    joueur.y = limiteHaute;
    if (joueur.vitesseY < 0) joueur.vitesseY = 0;
  }

  if (joueur.y >= SOL_Y - joueur.hauteur) {
    joueur.y = SOL_Y - joueur.hauteur;
    joueur.vitesseY = 0;
    joueur.surLeSol = true;
    sautsRestants = 2;
  } else {
    joueur.surLeSol = false;
  }

  compteur++;

  if (compteur >= prochainObstacle) {
    if (compteur - dernierSpawnCompteur >= ESPACEMENT_MIN) {
      creerObstacle();
      dernierSpawnCompteur = compteur;
    }
    planifierProchainObstacle();
  }
  if (compteur >= prochainOiseau) {
    if (compteur - dernierSpawnCompteur >= ESPACEMENT_MIN) {
      creerOiseau();
      dernierSpawnCompteur = compteur;
    }
    planifierProchainOiseau();
  }
  if (compteur >= prochainPassage) {
    if (compteur - dernierSpawnCompteur >= ESPACEMENT_MIN) {
      creerPassageOiseaux();
      dernierSpawnCompteur = compteur;
    }
    planifierProchainPassage();
  }

  deplacerObstacles();
  deplacerOiseaux();
  deplacerNuages();
  verifierCollision();
  verifierCollisionOiseaux();
  verifierCollisionPassages();

  if (!jeuTermine) score++;

  gererPaliers();
}

function boucle() {
  if (jeuTermine) return;

  dessinerFond(pointsTemps());
  deplacerEtDessinerPassages();
  maj();

  if (jeuTermine) return;

  dessinerSol();
  dessinerObstacles();
  dessinerOiseaux();
  dessinerJoueur();

  if (pointsActuels() >= 700) {
    deplacerEtDessinerPluie();
  }

  gererEclairs(pointsActuels());

  dessinerScore();

  requestAnimationFrame(boucle);
}

function sauter() {
  initAudio();
  if (jeuTermine) return;
  if (joueur.surLeSol) {
    joueur.vitesseY = -15;
  } else {
    joueur.vitesseY = -7.5;
  }
}

document.addEventListener("keydown", (e) => {
  if (e.code === "Space") sauter();
});

canvas.addEventListener("touchstart", sauter);
canvas.addEventListener("click", sauter);
boutonRejouer.addEventListener("click", resetJeu);

resetJeu();