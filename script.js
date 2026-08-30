const canvas = document.getElementById("jeu");
const ctx = canvas.getContext("2d");
const boutonRejouer = document.getElementById("boutonRejouer");
const musiqueJeu = document.getElementById("musiqueJeu");

const GRAVITE_BASE = 0.8;
const SAUT_BASE = -15;
const POINTS_VICTOIRE = 5000;
const VITESSE_BASE = 6;
const ESPACEMENT_MIN = 55;
const HAUTEUR_REFERENCE = 700; // sert de base pour garder les proportions verticales identiques

let SOL_Y = 340;
let echelleV = 1;
let gravite = GRAVITE_BASE;
let sautForce = SAUT_BASE;

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
let dragons;
let prochainPalierDragon = 400;
let montagnes;
let debris = [];
let echelleGeant = 1;

let joueurGeant = false;
let joueurGeantFin = 0;
let joueurInvincible = false;
let clignoteFin = 0;

// ---------- PLEIN ÉCRAN RESPONSIVE, proportions verticales fixes ----------
function redimensionner() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  SOL_Y = Math.round(canvas.height * 0.72);
  echelleV = canvas.height / HAUTEUR_REFERENCE;
  gravite = GRAVITE_BASE * echelleV;
  sautForce = SAUT_BASE * echelleV;
}

window.addEventListener("resize", redimensionner);

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

function jouerSonFeu() {
  initAudio();

  const bufferSize = audioCtx.sampleRate * 0.7;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    const enveloppe = Math.sin((i / bufferSize) * Math.PI);
    data[i] = (Math.random() * 2 - 1) * enveloppe;
  }
  const bruit = audioCtx.createBufferSource();
  bruit.buffer = buffer;
  const filtre = audioCtx.createBiquadFilter();
  filtre.type = "lowpass";
  filtre.frequency.setValueAtTime(1800, audioCtx.currentTime);
  filtre.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 0.7);
  const gainBruit = audioCtx.createGain();
  gainBruit.gain.setValueAtTime(0.22, audioCtx.currentTime);
  bruit.connect(filtre);
  filtre.connect(gainBruit);
  gainBruit.connect(audioCtx.destination);
  bruit.start();

  const rugissement = audioCtx.createOscillator();
  const gainRugissement = audioCtx.createGain();
  rugissement.type = "sawtooth";
  rugissement.frequency.setValueAtTime(90, audioCtx.currentTime);
  rugissement.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.5);
  gainRugissement.gain.setValueAtTime(0.14, audioCtx.currentTime);
  gainRugissement.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);
  rugissement.connect(gainRugissement);
  gainRugissement.connect(audioCtx.destination);
  rugissement.start();
  rugissement.stop(audioCtx.currentTime + 0.6);
}

function jouerSonPalier() {
  initAudio();
  jouerNote(880, 0.15, "sine", 0.1);
  setTimeout(() => jouerNote(1174.66, 0.2, "sine", 0.1), 100);
}

function jouerSonPouvoir() {
  initAudio();
  const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51];
  notes.forEach((f, i) => {
    setTimeout(() => jouerNote(f, 0.15, "triangle", 0.12), i * 80);
  });
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
  for (let i = 0; i < 5; i++) {
    nuages.push({
      x: Math.random() * canvas.width,
      y: 30 + Math.random() * (canvas.height * 0.22),
      taille: 0.7 + Math.random() * 0.9,
      vitesse: 0.2 + Math.random() * 0.4
    });
  }
  montagnes = [];
  for (let i = 0; i < 6; i++) {
    montagnes.push({
      x: i * (canvas.width / 3) + Math.random() * 100,
      largeur: 180 + Math.random() * 200,
      hauteur: 70 + Math.random() * 150,
      teinteClaire: Math.random() > 0.5
    });
  }
  etoiles = [];
  for (let i = 0; i < 80; i++) {
    etoiles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * (SOL_Y - 20),
      taille: Math.random() * 1.5 + 0.5
    });
  }
  gouttesPluie = [];
  for (let i = 0; i < 160; i++) {
    gouttesPluie.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vitesse: 6 + Math.random() * 6
    });
  }
}

function deplacerNuages() {
  nuages.forEach(n => {
    n.x -= n.vitesse;
    if (n.x < -80) n.x = canvas.width + 80;
  });
}

function deplacerMontagnes() {
  montagnes.forEach(m => {
    m.x -= 0.18;
    if (m.x < -m.largeur) {
      m.x = canvas.width + Math.random() * 150;
      m.largeur = 180 + Math.random() * 200;
      m.hauteur = 70 + Math.random() * 150;
      m.teinteClaire = Math.random() > 0.5;
    }
  });
}

function calculerLuminosite(points) {
  return (1 + Math.cos((2 * Math.PI * points) / 1000)) / 2;
}

// Soleil et lune au même endroit, fondu naturel via l'opacité de la luminosité
function dessinerAstres(points) {
  const cyclePos = (((points % 1000) + 1000) % 1000) / 1000;
  const estJour = cyclePos < 0.5;
  const local = estJour ? cyclePos / 0.5 : (cyclePos - 0.5) / 0.5;
  const x = 60 + local * (canvas.width - 120);
  const y = canvas.height * 0.18 - Math.sin(local * Math.PI) * (canvas.height * 0.12);

  const alphaSoleil = luminositeGlobale;
  const alphaLune = 1 - luminositeGlobale;

  if (alphaSoleil > 0.02) {
    ctx.save();
    ctx.globalAlpha = alphaSoleil;
    const glow = ctx.createRadialGradient(x, y, 5, x, y, 55);
    glow.addColorStop(0, "rgba(255,235,150,0.55)");
    glow.addColorStop(1, "rgba(255,235,150,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, 55, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffe066";
    ctx.beginPath();
    ctx.arc(x, y, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  if (alphaLune > 0.02) {
    ctx.save();
    ctx.globalAlpha = alphaLune;
    ctx.fillStyle = "#e8e8f0";
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#c9c9d6";
    ctx.beginPath();
    ctx.arc(x - 7, y - 4, 4, 0, Math.PI * 2);
    ctx.arc(x + 5, y + 6, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function dessinerMontagnes() {
  montagnes.forEach(m => {
    const base1 = m.teinteClaire ? "#8a9bb0" : "#6d7f96";
    const base2 = m.teinteClaire ? "#5c6d82" : "#465468";
    const grad = ctx.createLinearGradient(0, SOL_Y - m.hauteur, 0, SOL_Y);
    grad.addColorStop(0, base1);
    grad.addColorStop(1, base2);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(m.x, SOL_Y);
    ctx.lineTo(m.x + m.largeur * 0.35, SOL_Y - m.hauteur * 0.7);
    ctx.lineTo(m.x + m.largeur * 0.5, SOL_Y - m.hauteur);
    ctx.lineTo(m.x + m.largeur * 0.65, SOL_Y - m.hauteur * 0.75);
    ctx.lineTo(m.x + m.largeur, SOL_Y);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.beginPath();
    ctx.moveTo(m.x + m.largeur * 0.5, SOL_Y - m.hauteur);
    ctx.lineTo(m.x + m.largeur * 0.42, SOL_Y - m.hauteur * 0.82);
    ctx.lineTo(m.x + m.largeur * 0.5, SOL_Y - m.hauteur * 0.86);
    ctx.lineTo(m.x + m.largeur * 0.58, SOL_Y - m.hauteur * 0.82);
    ctx.closePath();
    ctx.fill();
  });
}

function dessinerNuageRealiste(n) {
  ctx.save();
  ctx.translate(n.x, n.y);
  ctx.scale(n.taille, n.taille);
  const blobs = [
    [0, 0, 24], [22, -8, 20], [42, 0, 22], [-20, -4, 18], [12, 8, 20], [30, 8, 16]
  ];
  blobs.forEach(([dx, dy, r]) => {
    const grad = ctx.createRadialGradient(dx, dy, 2, dx, dy, r);
    grad.addColorStop(0, "rgba(255,255,255,0.95)");
    grad.addColorStop(0.7, "rgba(255,255,255,0.8)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(dx, dy, r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = "rgba(150,160,180,0.25)";
  ctx.beginPath();
  ctx.ellipse(15, 10, 30, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function dessinerFond(points) {
  const luminosite = calculerLuminosite(points);
  luminositeGlobale = luminosite;

  const degrade = ctx.createLinearGradient(0, 0, 0, canvas.height);
  degrade.addColorStop(0, "#6fb8e6");
  degrade.addColorStop(0.6, "#a9dcef");
  degrade.addColorStop(1, "#e0f7fa");
  ctx.fillStyle = degrade;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  dessinerAstres(points);
  dessinerMontagnes();

  const w = canvas.width;
  const gradColline = ctx.createLinearGradient(0, SOL_Y - 70, 0, SOL_Y);
  gradColline.addColorStop(0, "#8fc26e");
  gradColline.addColorStop(1, "#6b9e4a");
  ctx.fillStyle = gradColline;
  ctx.beginPath();
  ctx.moveTo(0, SOL_Y);
  ctx.quadraticCurveTo(w * 0.19, SOL_Y - 60, w * 0.375, SOL_Y);
  ctx.quadraticCurveTo(w * 0.5625, SOL_Y - 40, w * 0.75, SOL_Y);
  ctx.quadraticCurveTo(w * 0.9, SOL_Y - 70, w, SOL_Y);
  ctx.lineTo(w, SOL_Y);
  ctx.closePath();
  ctx.fill();

  nuages.forEach(dessinerNuageRealiste);

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
  const gradSol = ctx.createLinearGradient(0, SOL_Y, 0, canvas.height);
  gradSol.addColorStop(0, "#7cb342");
  gradSol.addColorStop(1, "#3f5c1a");
  ctx.fillStyle = gradSol;
  ctx.fillRect(0, SOL_Y, canvas.width, canvas.height - SOL_Y);

  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 1;
  for (let y = SOL_Y + 10; y < canvas.height; y += 14) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  ctx.strokeStyle = "#4f7a25";
  ctx.lineWidth = 2;
  for (let x = -((compteur * (vitesseDefilement || 1)) % 10); x < canvas.width; x += 9) {
    const h = 5 + Math.abs(Math.sin(x * 0.5 + compteur * 0.05)) * 5;
    ctx.beginPath();
    ctx.moveTo(x, SOL_Y);
    ctx.lineTo(x - 2, SOL_Y - h);
    ctx.moveTo(x, SOL_Y);
    ctx.lineTo(x, SOL_Y - h * 1.1);
    ctx.moveTo(x, SOL_Y);
    ctx.lineTo(x + 2, SOL_Y - h * 0.8);
    ctx.stroke();
  }

  ctx.fillStyle = "#365214";
  ctx.fillRect(0, SOL_Y, canvas.width, 3);
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

// ---------- PERSONNAGES (vue de profil, en train de courir) ----------
function dessinerPersonnage(x, pieds, echelle, couleurShirt) {
  const h = 44 * echelle;
  const y = pieds - h;
  const enAir = !joueur.surLeSol;
  const swing = Math.sin(compteur / 5.5);

  let legFrontSwing, legBackSwing, armSwing;
  if (enAir) {
    legFrontSwing = 7 * echelle;
    legBackSwing = -5 * echelle;
    armSwing = 6 * echelle;
  } else {
    legFrontSwing = swing * 12 * echelle;
    legBackSwing = -swing * 12 * echelle;
    armSwing = -swing * 9 * echelle;
  }

  ctx.lineCap = "round";

  // Sac à dos bleu (dans le dos, côté gauche puisque le personnage regarde vers la droite)
  ctx.fillStyle = "#2563eb";
  ctx.fillRect(x + 1 * echelle, y + 16 * echelle, 9 * echelle, 15 * echelle);
  ctx.fillStyle = "#1d4ed8";
  ctx.fillRect(x + 1 * echelle, y + 16 * echelle, 9 * echelle, 3 * echelle);

  // Jambe arrière
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 4 * echelle;
  ctx.beginPath();
  ctx.moveTo(x + 11 * echelle, y + 31 * echelle);
  ctx.lineTo(x + 11 * echelle + legBackSwing, y + 43 * echelle);
  ctx.stroke();
  ctx.fillStyle = "#3b2f2f";
  ctx.beginPath();
  ctx.arc(x + 11 * echelle + legBackSwing, y + 44 * echelle, 2.5 * echelle, 0, Math.PI * 2);
  ctx.fill();

  // Bras arrière
  ctx.strokeStyle = couleurShirt;
  ctx.lineWidth = 3 * echelle;
  ctx.beginPath();
  ctx.moveTo(x + 13 * echelle, y + 19 * echelle);
  ctx.lineTo(x + 13 * echelle - armSwing, y + 29 * echelle);
  ctx.stroke();

  // Torse
  ctx.fillStyle = couleurShirt;
  ctx.beginPath();
  ctx.moveTo(x + 6 * echelle, y + 17 * echelle);
  ctx.lineTo(x + 21 * echelle, y + 15 * echelle);
  ctx.lineTo(x + 20 * echelle, y + 29 * echelle);
  ctx.lineTo(x + 7 * echelle, y + 30 * echelle);
  ctx.closePath();
  ctx.fill();

  // Short noir
  ctx.fillStyle = "#161616";
  ctx.beginPath();
  ctx.moveTo(x + 7 * echelle, y + 28 * echelle);
  ctx.lineTo(x + 20 * echelle, y + 27 * echelle);
  ctx.lineTo(x + 19 * echelle, y + 34 * echelle);
  ctx.lineTo(x + 8 * echelle, y + 34 * echelle);
  ctx.closePath();
  ctx.fill();

  // Jambe avant
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 4 * echelle;
  ctx.beginPath();
  ctx.moveTo(x + 15 * echelle, y + 33 * echelle);
  ctx.lineTo(x + 15 * echelle + legFrontSwing, y + 44 * echelle);
  ctx.stroke();
  ctx.fillStyle = "#3b2f2f";
  ctx.beginPath();
  ctx.arc(x + 15 * echelle + legFrontSwing, y + 44 * echelle, 2.5 * echelle, 0, Math.PI * 2);
  ctx.fill();

  // Bras avant
  ctx.strokeStyle = couleurShirt;
  ctx.lineWidth = 3 * echelle;
  ctx.beginPath();
  ctx.moveTo(x + 18 * echelle, y + 18 * echelle);
  ctx.lineTo(x + 18 * echelle + armSwing, y + 28 * echelle);
  ctx.stroke();

  // Cou
  ctx.strokeStyle = "#f1c27d";
  ctx.lineWidth = 4 * echelle;
  ctx.beginPath();
  ctx.moveTo(x + 18 * echelle, y + 14 * echelle);
  ctx.lineTo(x + 18 * echelle, y + 17 * echelle);
  ctx.stroke();

  // Tête (profil, regarde vers la droite)
  ctx.fillStyle = "#f1c27d";
  ctx.beginPath();
  ctx.arc(x + 17 * echelle, y + 8 * echelle, 8 * echelle, 0, Math.PI * 2);
  ctx.fill();

  // Nez
  ctx.beginPath();
  ctx.moveTo(x + 24 * echelle, y + 7 * echelle);
  ctx.lineTo(x + 28 * echelle, y + 8.5 * echelle);
  ctx.lineTo(x + 24 * echelle, y + 10 * echelle);
  ctx.closePath();
  ctx.fill();

  // Touffe de cheveux
  ctx.fillStyle = "#3b2f2f";
  ctx.beginPath();
  ctx.moveTo(x + 9 * echelle, y + 2 * echelle);
  ctx.quadraticCurveTo(x + 13 * echelle, y - 8 * echelle, x + 18 * echelle, y - 1 * echelle);
  ctx.quadraticCurveTo(x + 20 * echelle, y - 6 * echelle, x + 23 * echelle, y + 1 * echelle);
  ctx.quadraticCurveTo(x + 19 * echelle, y + 2.5 * echelle, x + 9 * echelle, y + 2 * echelle);
  ctx.closePath();
  ctx.fill();

  // Œil (profil, un seul visible)
  ctx.fillStyle = "#222";
  ctx.beginPath();
  ctx.arc(x + 21 * echelle, y + 7 * echelle, 1.3 * echelle, 0, Math.PI * 2);
  ctx.fill();
}

function creerDebris(x, y, taille, couleur) {
  debris.push({
    x, y,
    vx: (Math.random() * 6 - 3) + 3,
    vy: -7 - Math.random() * 5,
    rotation: 0,
    vitesseRotation: (Math.random() * 0.35 + 0.15) * (Math.random() < 0.5 ? -1 : 1),
    taille,
    couleur,
    vie: 55
  });
}

function majEtDessinerDebris() {
  debris.forEach(d => {
    d.x += d.vx;
    d.y += d.vy;
    d.vy += 0.25;
    d.rotation += d.vitesseRotation;
    d.vie--;

    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.rotate(d.rotation);
    ctx.globalAlpha = Math.max(0, d.vie / 55);
    ctx.fillStyle = d.couleur;
    ctx.fillRect(-d.taille / 2, -d.taille / 2, d.taille, d.taille);
    ctx.strokeStyle = "rgba(0,0,0,0.3)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-d.taille / 2, -d.taille / 2, d.taille, d.taille);
    ctx.restore();
    ctx.globalAlpha = 1;
  });
  debris = debris.filter(d => d.vie > 0);
}

function couleurObstacle(type) {
  if (type === "rocher") return "#8a7a68";
  if (type === "zombie") return "#6b9457";
  if (type === "zombieGeant") return "#3d5a35";
  return "#8b5a2b";
}

function multiplicateurGeant() { return echelleGeant; }
function largeurTotaleDuo() { return (26 + 42 * 1.4) * multiplicateurGeant() * echelleV; }
function hauteurMaxDuo() { return (44 * 1.4) * multiplicateurGeant() * echelleV; }

function dessinerJoueur() {
  const pieds = joueur.y + joueur.hauteur;
  const mult = multiplicateurGeant() * echelleV;

  const enScintillement = compteur < scintillementFin;
  if (enScintillement && Math.floor(compteur / 4) % 2 === 0) {
    return;
  }

  if (joueurGeant) {
    const cx = joueur.x + 40 * mult;
    const cy = pieds - 40 * mult;
    const halo = ctx.createRadialGradient(cx, cy, 5, cx, cy, 95 * mult / 2);
    halo.addColorStop(0, "rgba(255,225,120,0.55)");
    halo.addColorStop(1, "rgba(255,225,120,0)");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(cx, cy, 95 * mult / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  const enClignote = joueurGeant && compteur < clignoteFin;
  if (enClignote && Math.floor(compteur / 4) % 2 === 0) {
    return;
  }

  dessinerPersonnage(joueur.x, pieds, 1 * mult, "#3b82f6");
  dessinerPersonnage(joueur.x + 26 * mult, pieds, 1.4 * mult, "#ef4444");
}

// ---------- OBSTACLES ----------
function planifierProchainObstacle() {
  prochainObstacle = compteur + 60 + Math.random() * 180;
}

function typeAleatoireObstacle() {
  const r = Math.random();
  if (r < 0.24) return "zombieGeant";
  if (r < 0.47) return "zombie";
  if (r < 0.74) return "rocher";
  return "caisse";
}

function creerObstacle() {
  const type = typeAleatoireObstacle();
  let taille;
  if (type === "zombieGeant") taille = (130 + Math.random() * 30) * echelleV;
  else if (type === "zombie") taille = (36 + Math.random() * 8) * echelleV;
  else taille = (25 + Math.random() * 15) * echelleV;
  obstacles.push({ x: canvas.width, type, taille, decalage: Math.random() * 100 });
}

function dessinerZombie(x, taille, decalage, geant) {
  const balancement = Math.sin((compteur + decalage) / 8) * (geant ? 6 : 3);
  const hautZ = SOL_Y - taille;

  dessinerHalo(x, hautZ + taille * 0.5, taille * (geant ? 1.1 : 0.9));

  const couleurPeauClaire = geant ? "#5a7a48" : "#84a86c";
  const couleurPeauFoncee = geant ? "#2c3d24" : "#4c6b3a";
  const couleurVetement = geant ? "#1c1c1c" : "#3d3d3d";

  const gradPeau = ctx.createLinearGradient(x - taille / 3, hautZ, x + taille / 3, hautZ + taille);
  gradPeau.addColorStop(0, couleurPeauClaire);
  gradPeau.addColorStop(1, couleurPeauFoncee);

  ctx.strokeStyle = "#1a1a1a";
  ctx.lineWidth = taille * 0.15;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x - taille / 5, hautZ + taille * 0.85);
  ctx.lineTo(x - taille / 5, SOL_Y);
  ctx.moveTo(x + taille / 5, hautZ + taille * 0.85);
  ctx.lineTo(x + taille / 5, SOL_Y);
  ctx.stroke();

  ctx.fillStyle = couleurVetement;
  ctx.fillRect(x - taille / 3, hautZ + taille * 0.32, taille / 1.5, taille * 0.55);
  ctx.fillStyle = gradPeau;
  ctx.beginPath();
  ctx.moveTo(x - taille * 0.15, hautZ + taille * 0.5);
  ctx.lineTo(x - taille * 0.05, hautZ + taille * 0.62);
  ctx.lineTo(x - taille * 0.2, hautZ + taille * 0.7);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + taille * 0.05, hautZ + taille * 0.5);
  ctx.lineTo(x + taille * 0.18, hautZ + taille * 0.65);
  ctx.lineTo(x + taille * 0.02, hautZ + taille * 0.72);
  ctx.closePath();
  ctx.fill();

  if (geant) {
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(x - taille * 0.12, hautZ + taille * (0.4 + i * 0.06));
      ctx.lineTo(x + taille * 0.1, hautZ + taille * (0.4 + i * 0.06));
      ctx.stroke();
    }
  }

  ctx.strokeStyle = gradPeau;
  ctx.lineWidth = taille * (geant ? 0.13 : 0.1);
  ctx.beginPath();
  ctx.moveTo(x - taille / 3, hautZ + taille * 0.42);
  ctx.lineTo(x - taille / 2 - balancement, hautZ + taille * 0.25);
  ctx.moveTo(x + taille / 3, hautZ + taille * 0.42);
  ctx.lineTo(x + taille / 2 + balancement, hautZ + taille * 0.25);
  ctx.stroke();
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 2;
  [-1, 1].forEach(sens => {
    const bx = sens < 0 ? x - taille / 2 - balancement : x + taille / 2 + balancement;
    const by = hautZ + taille * 0.25;
    for (let g = -1; g <= 1; g++) {
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + g * 3, by - 7);
      ctx.stroke();
    }
  });

  ctx.fillStyle = gradPeau;
  ctx.beginPath();
  ctx.arc(x, hautZ + taille * 0.16, taille * 0.19, 0, Math.PI * 2);
  ctx.fill();

  const halov = ctx.createRadialGradient(x, hautZ + taille * 0.15, 1, x, hautZ + taille * 0.15, taille * 0.12);
  halov.addColorStop(0, "rgba(255,60,40,0.8)");
  halov.addColorStop(1, "rgba(255,60,40,0)");
  ctx.fillStyle = halov;
  ctx.beginPath();
  ctx.arc(x, hautZ + taille * 0.15, taille * 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ff3b30";
  ctx.beginPath();
  ctx.arc(x - taille * 0.06, hautZ + taille * 0.13, taille * 0.04, 0, Math.PI * 2);
  ctx.arc(x + taille * 0.08, hautZ + taille * 0.18, taille * 0.04, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#0a0a0a";
  ctx.lineWidth = taille * 0.02;
  ctx.beginPath();
  ctx.arc(x + taille * 0.01, hautZ + taille * 0.22, taille * 0.06, 0.1, Math.PI - 0.1);
  ctx.stroke();
  if (geant) {
    ctx.fillStyle = "#e8e8d8";
    for (let d = -1; d <= 1; d += 2) {
      ctx.beginPath();
      ctx.moveTo(x + d * taille * 0.04, hautZ + taille * 0.24);
      ctx.lineTo(x + d * taille * 0.055, hautZ + taille * 0.3);
      ctx.lineTo(x + d * taille * 0.02, hautZ + taille * 0.24);
      ctx.closePath();
      ctx.fill();
    }
  }

  if (geant) {
    ctx.fillStyle = "#111";
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

function dessinerRocher(o) {
  dessinerHalo(o.x, SOL_Y - o.taille / 2, o.taille);
  const cy = SOL_Y - o.taille / 2;
  const grad = ctx.createRadialGradient(o.x - o.taille * 0.15, cy - o.taille * 0.15, 2, o.x, cy, o.taille * 0.6);
  grad.addColorStop(0, "#9c8b76");
  grad.addColorStop(1, "#5c4f3f");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(o.x, cy, o.taille / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(o.x - o.taille * 0.15, cy - o.taille * 0.1);
  ctx.lineTo(o.x + o.taille * 0.05, cy + o.taille * 0.15);
  ctx.moveTo(o.x + o.taille * 0.1, cy - o.taille * 0.2);
  ctx.lineTo(o.x + o.taille * 0.15, cy);
  ctx.stroke();
}

function dessinerCaisse(o) {
  dessinerHalo(o.x, SOL_Y - o.taille / 2, o.taille);
  const gx = o.x - o.taille / 2;
  const gy = SOL_Y - o.taille;
  const grad = ctx.createLinearGradient(gx, gy, gx, SOL_Y);
  grad.addColorStop(0, "#a9743f");
  grad.addColorStop(1, "#6b4423");
  ctx.fillStyle = grad;
  ctx.fillRect(gx, gy, o.taille, o.taille);
  ctx.strokeStyle = "#4a2e14";
  ctx.lineWidth = 2;
  ctx.strokeRect(gx + 2, gy + 2, o.taille - 4, o.taille - 4);
  ctx.beginPath();
  ctx.moveTo(gx, gy);
  ctx.lineTo(gx + o.taille, gy + o.taille);
  ctx.moveTo(gx + o.taille, gy);
  ctx.lineTo(gx, gy + o.taille);
  ctx.stroke();
  ctx.fillStyle = "#c9c9c9";
  const c = o.taille * 0.14;
  [[gx, gy], [gx + o.taille - c, gy], [gx, gy + o.taille - c], [gx + o.taille - c, gy + o.taille - c]].forEach(([px, py]) => {
    ctx.fillRect(px, py, c, c);
  });
}

function dessinerObstacles() {
  obstacles.forEach(o => {
    if (o.type === "rocher") {
      dessinerRocher(o);
    } else if (o.type === "zombie") {
      dessinerZombie(o.x, o.taille, o.decalage, false);
    } else if (o.type === "zombieGeant") {
      dessinerZombie(o.x, o.taille, o.decalage, true);
    } else {
      dessinerCaisse(o);
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

  for (let i = obstacles.length - 1; i >= 0; i--) {
    const o = obstacles[i];
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
      if (joueurGeant) {
        creerDebris(o.x, SOL_Y - o.taille / 2, Math.min(o.taille * 0.6, 30), couleurObstacle(o.type));
        obstacles.splice(i, 1);
      } else if (!joueurInvincible) {
        jeuTermine = true;
        victoire = false;
        terminerJeu();
      }
    }
  }
}

// ---------- OISEAUX ----------
function planifierProchainOiseau() {
  prochainOiseau = compteur + 110 + Math.random() * 220;
}

function creerOiseau() {
  const geant = Math.random() < 0.4;
  const hauteurVol = (100 + Math.random() * 140) * echelleV;
  oiseaux.push({
    x: canvas.width,
    y: SOL_Y - hauteurVol,
    envergure: (geant ? 85 + Math.random() * 25 : 40 + Math.random() * 16) * echelleV,
    decalage: Math.random() * 100,
    geant
  });
}

function dessinerOiseaux() {
  oiseaux.forEach(o => {
    dessinerHalo(o.x, o.y, o.envergure * 0.9);

    const battement = Math.sin((compteur + o.decalage) / (o.geant ? 8 : 5)) * (o.geant ? 16 : 10);
    const couleurClaire = o.geant ? "#a05a30" : "#6c85a0";
    const couleurFoncee = o.geant ? "#5c2c15" : "#2c3a47";

    const gradCorps = ctx.createLinearGradient(o.x, o.y - o.envergure * 0.16, o.x, o.y + o.envergure * 0.16);
    gradCorps.addColorStop(0, couleurClaire);
    gradCorps.addColorStop(1, couleurFoncee);

    ctx.fillStyle = couleurFoncee;
    ctx.beginPath();
    ctx.moveTo(o.x - o.envergure * 0.05, o.y);
    ctx.quadraticCurveTo(o.x - o.envergure * 0.3, o.y - o.envergure * 0.3 + battement * 0.5, o.x - o.envergure * 0.5, o.y + battement);
    ctx.quadraticCurveTo(o.x - o.envergure * 0.25, o.y + o.envergure * 0.08, o.x - o.envergure * 0.05, o.y + o.envergure * 0.05);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = gradCorps;
    ctx.beginPath();
    ctx.ellipse(o.x, o.y, o.envergure * 0.28, o.envergure * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(0,0,0,0.2)";
    ctx.lineWidth = 1;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(o.x - o.envergure * 0.1, o.y + i * o.envergure * 0.05);
      ctx.lineTo(o.x + o.envergure * 0.15, o.y + i * o.envergure * 0.05);
      ctx.stroke();
    }

    ctx.fillStyle = couleurClaire;
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

    ctx.strokeStyle = couleurFoncee;
    ctx.lineWidth = o.geant ? 5 : 3.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(o.x - o.envergure / 2, o.y + battement);
    ctx.quadraticCurveTo(o.x - o.envergure * 0.15, o.y - battement * 0.6, o.x, o.y - 3);
    ctx.stroke();
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

      if (joueurGeant) {
        creerDebris(o.x, o.y, o.envergure * 0.35, o.geant ? "#7a3b1f" : "#4a5b6e");
        oiseaux.splice(i, 1);
      } else if (estRebond) {
        oiseaux.splice(i, 1);
        joueur.vitesseY = sautForce * 0.93;
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

// ---------- OISEAU DU HAUT DU CADRE ----------
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
    envergure: 42 * echelleV,
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

  for (let i = passagesOiseaux.length - 1; i >= 0; i--) {
    const o = passagesOiseaux[i];
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
      if (joueurGeant) {
        creerDebris(o.x, o.y, o.envergure * 0.4, "#2c2c2c");
        passagesOiseaux.splice(i, 1);
      } else if (!joueurInvincible) {
        jeuTermine = true;
        victoire = false;
        terminerJeu();
      }
    }
  }
}

// ---------- DRAGONS GÉANTS CRACHEURS DE FEU ----------
function creerDragon() {
  const hauteurVol = (260 + Math.random() * 100) * echelleV;
  dragons.push({
    x: canvas.width + 100,
    y: SOL_Y - hauteurVol,
    envergure: 260 * echelleV,
    decalage: Math.random() * 100,
    prochainSon: 0,
    flammes: []
  });
}

function dessinerDragon(d) {
  dessinerHalo(d.x, d.y, d.envergure * 0.7);

  const battement = Math.sin((compteur + d.decalage) / 10) * 22;
  const e = d.envergure;

  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.beginPath();
  ctx.ellipse(d.x, SOL_Y + 4, e * 0.18, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#4a1010";
  ctx.beginPath();
  ctx.moveTo(d.x + e * 0.05, d.y - e * 0.02);
  ctx.quadraticCurveTo(d.x + e * 0.35, d.y - e * 0.35 + battement * 0.5, d.x + e * 0.55, d.y + battement * 0.8);
  ctx.quadraticCurveTo(d.x + e * 0.3, d.y + e * 0.05, d.x + e * 0.1, d.y + e * 0.05);
  ctx.closePath();
  ctx.fill();

  const degradeCorps = ctx.createLinearGradient(d.x - e * 0.25, d.y - e * 0.15, d.x + e * 0.25, d.y + e * 0.15);
  degradeCorps.addColorStop(0, "#8f2424");
  degradeCorps.addColorStop(1, "#5a1414");
  ctx.fillStyle = degradeCorps;
  ctx.beginPath();
  ctx.ellipse(d.x, d.y, e * 0.24, e * 0.15, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#3a0d0d";
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(d.x + i * e * 0.06, d.y - e * 0.13);
    ctx.lineTo(d.x + i * e * 0.06 - 4, d.y - e * 0.05);
    ctx.lineTo(d.x + i * e * 0.06 + 4, d.y - e * 0.05);
    ctx.closePath();
    ctx.fill();
  }

  ctx.fillStyle = "#c96b3f";
  ctx.beginPath();
  ctx.ellipse(d.x, d.y + e * 0.08, e * 0.18, e * 0.06, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#7a1f1f";
  ctx.beginPath();
  ctx.moveTo(d.x - e * 0.05, d.y - e * 0.02);
  ctx.quadraticCurveTo(d.x - e * 0.4, d.y - e * 0.4 + battement * 0.5, d.x - e * 0.6, d.y + battement);
  ctx.quadraticCurveTo(d.x - e * 0.35, d.y + e * 0.08, d.x - e * 0.1, d.y + e * 0.05);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a0d0d";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(d.x - e * 0.05, d.y - e * 0.02);
  ctx.lineTo(d.x - e * 0.45, d.y + battement * 0.7);
  ctx.moveTo(d.x - e * 0.05, d.y - e * 0.02);
  ctx.lineTo(d.x - e * 0.55, d.y + battement * 0.95);
  ctx.stroke();

  ctx.fillStyle = "#7a1f1f";
  ctx.beginPath();
  ctx.moveTo(d.x - e * 0.22, d.y - e * 0.06);
  ctx.quadraticCurveTo(d.x - e * 0.34, d.y - e * 0.12, d.x - e * 0.4, d.y - e * 0.04);
  ctx.quadraticCurveTo(d.x - e * 0.3, d.y + e * 0.02, d.x - e * 0.2, d.y + e * 0.04);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#8f2424";
  ctx.beginPath();
  ctx.ellipse(d.x - e * 0.42, d.y - e * 0.03, e * 0.15, e * 0.09, -0.15, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#5a1414";
  ctx.beginPath();
  ctx.moveTo(d.x - e * 0.5, d.y);
  ctx.lineTo(d.x - e * 0.62, d.y + e * 0.02);
  ctx.lineTo(d.x - e * 0.48, d.y + e * 0.05);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#2a0808";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(d.x - e * 0.47, d.y - e * 0.1);
  ctx.lineTo(d.x - e * 0.55, d.y - e * 0.24);
  ctx.moveTo(d.x - e * 0.41, d.y - e * 0.1);
  ctx.lineTo(d.x - e * 0.46, d.y - e * 0.26);
  ctx.stroke();

  ctx.fillStyle = "#ffcc00";
  ctx.beginPath();
  ctx.arc(d.x - e * 0.45, d.y - e * 0.05, e * 0.02, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1a1a1a";
  ctx.beginPath();
  ctx.arc(d.x - e * 0.45, d.y - e * 0.05, e * 0.008, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#7a1f1f";
  ctx.lineWidth = e * 0.05;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(d.x + e * 0.2, d.y + e * 0.02);
  ctx.quadraticCurveTo(d.x + e * 0.4, d.y + battement * 0.4, d.x + e * 0.5, d.y - e * 0.08);
  ctx.stroke();
  ctx.fillStyle = "#3a0d0d";
  ctx.beginPath();
  ctx.moveTo(d.x + e * 0.5, d.y - e * 0.08);
  ctx.lineTo(d.x + e * 0.56, d.y - e * 0.16);
  ctx.lineTo(d.x + e * 0.5, d.y - e * 0.14);
  ctx.closePath();
  ctx.fill();

  // Flammes agrandies
  d.flammes.forEach(f => {
    const grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.taille);
    grad.addColorStop(0, "rgba(255,255,180,0.95)");
    grad.addColorStop(0.45, "rgba(255,140,0,0.85)");
    grad.addColorStop(1, "rgba(200,30,0,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.taille, 0, Math.PI * 2);
    ctx.fill();
  });
}

function majDragon(d) {
  d.x -= vitesseDefilement * 0.9;

  d.prochainSon--;
  if (d.prochainSon <= 0) {
    jouerSonFeu();
    d.prochainSon = 95;
  }

  const origineX = d.x - d.envergure * 0.6;
  const origineY = d.y;

  for (let i = 0; i < 4; i++) {
    d.flammes.push({
      x: origineX + (Math.random() * 12 - 6),
      y: origineY,
      vx: -(1 + Math.random() * 1.5),
      vy: 2 + Math.random() * 1.5,
      taille: (17 + Math.random() * 16) * echelleV,
      vie: 75
    });
  }
  d.flammes.forEach(f => {
    f.x += f.vx;
    f.y += f.vy;
    f.vy += 0.35;
    if (f.y >= SOL_Y) f.y = SOL_Y;
    f.vie--;
    f.taille *= 0.99;
  });
  d.flammes = d.flammes.filter(f => f.vie > 0);
}

function deplacerEtDessinerDragons() {
  dragons.forEach(d => {
    majDragon(d);
    dessinerDragon(d);
  });
  dragons = dragons.filter(d => d.x + d.envergure > -150);
}

function activerPouvoirDragon() {
  joueurGeant = true;
  joueurGeantFin = compteur + 600;
  joueurInvincible = true;
  clignoteFin = compteur + 120;
  joueur.vitesseY = sautForce * 1.067;
  sautsRestants = 2;
  jouerSonPouvoir();
}

function verifierCollisionDragons() {
  const margeJ = 5;
  const gaucheJ = joueur.x + margeJ;
  const droiteJ = joueur.x + largeurTotaleDuo() - margeJ;
  const piedsJ = joueur.y + joueur.hauteur - 2;
  const hautJ = piedsJ - hauteurMaxDuo() + 8;

  dragons.forEach(d => {
    const margeD = 14;
    const gaucheD = d.x - d.envergure / 2 + margeD;
    const droiteD = d.x + d.envergure / 2 - margeD;
    const hautD = d.y - d.envergure * 0.18;
    const basD = d.y + d.envergure * 0.18;

    const chevaucheX = gaucheJ < droiteD && droiteJ > gaucheD;
    const chevaucheY = hautJ < basD && piedsJ > hautD;

    if (!jeuTermine && chevaucheX && chevaucheY) {
      const surLeDos = joueur.vitesseY > 0 && (piedsJ - hautD) < 35 * echelleV;
      if (surLeDos && !joueurGeant) {
        activerPouvoirDragon();
      } else if (!joueurInvincible) {
        jeuTermine = true;
        victoire = false;
        terminerJeu();
      }
    }

    if (!joueurInvincible) {
      d.flammes.forEach(f => {
        if (
          !jeuTermine &&
          gaucheJ < f.x + f.taille &&
          droiteJ > f.x - f.taille &&
          hautJ < f.y + f.taille &&
          piedsJ > f.y - f.taille
        ) {
          jeuTermine = true;
          victoire = false;
          terminerJeu();
        }
      });
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
  ctx.fillText("Game Over - Score: " + pointsActuels(), canvas.width / 2, canvas.height * 0.4);
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
    if (navigator.vibrate) {
      navigator.vibrate(200);
    }
    jouerSonExplosion();
    const cx = joueur.x + 40;
    const cy = joueur.y + joueur.hauteur - 20;
    creerExplosion(cx, cy);
    animerExplosion();
  }
}

function creerFeuArtifice() {
  const cx = canvas.width * 0.25 + Math.random() * canvas.width * 0.5;
  const cy = canvas.height * 0.15 + Math.random() * canvas.height * 0.3;
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
  ctx.fillText("Victoire ! Score: " + pointsActuels(), canvas.width / 2, canvas.height * 0.12);
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

  if (joueurGeant) {
    const secRestantes = Math.max(0, Math.ceil((joueurGeantFin - compteur) / 60));
    ctx.fillStyle = "#b8860b";
    ctx.font = "16px Arial";
    ctx.fillText("Pouvoir dragon: " + secRestantes + "s", 20, 74);
  }
}

// ---------- BOUCLE PRINCIPALE ----------
function resetJeu() {
  redimensionner();
  boutonRejouer.style.display = "none";
  joueur = {
    x: 50,
    y: SOL_Y - 44 * echelleV,
    largeur: 30 * echelleV,
    hauteur: 44 * echelleV,
    vitesseY: 0,
    surLeSol: false
  };
  obstacles = [];
  oiseaux = [];
  passagesOiseaux = [];
  dragons = [];
  prochainPalierDragon = 400;
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
  joueurGeant = false;
  joueurGeantFin = 0;
  joueurInvincible = false;
  clignoteFin = 0;
  debris = [];
  echelleGeant = 1;
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

  if (joueurGeant && compteur >= joueurGeantFin) {
    joueurGeant = false;
    joueurInvincible = false;
  }

  const cibleEchelle = joueurGeant ? 2.6 : 1;
  echelleGeant += (cibleEchelle - echelleGeant) * 0.08;
  if (Math.abs(cibleEchelle - echelleGeant) < 0.01) echelleGeant = cibleEchelle;

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
  if (pointsActuels() >= prochainPalierDragon) {
    creerDragon();
    prochainPalierDragon += 400;
  }

  deplacerObstacles();
  deplacerOiseaux();
  deplacerNuages();
  deplacerMontagnes();
  verifierCollision();
  verifierCollisionOiseaux();
  verifierCollisionPassages();
  verifierCollisionDragons();

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
  deplacerEtDessinerDragons();
  majEtDessinerDebris();
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
  joueur.vitesseY = sautForce;
}

document.addEventListener("keydown", (e) => {
  if (e.code === "Space") sauter();
});

canvas.addEventListener("touchstart", sauter);
canvas.addEventListener("click", sauter);
boutonRejouer.addEventListener("click", resetJeu);

resetJeu();