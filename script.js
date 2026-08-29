const canvas = document.getElementById("jeu");
const ctx = canvas.getContext("2d");
const boutonRejouer = document.getElementById("boutonRejouer");
const musiqueJeu = document.getElementById("musiqueJeu");

const gravite = 0.8;
const SOL_Y = 340;
const POINTS_VICTOIRE = 5000;

let joueur, obstacles, score, jeuTermine, victoire, compteur, nuages, prochainObstacle;
let vitesseDefilement = 6;
let dernierPalierVitesse = 0;
let scintillementFin = 0;
let feuxArtifice = [];
let zoomActuel = 1;

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

function jouerPet() {
  initAudio();
  const dureeTotale = 1.3;
  const nbSegments = 9;
  let t = 0;
  for (let i = 0; i < nbSegments; i++) {
    const dureeSegment = dureeTotale / nbSegments;
    const freqDepart = 140 - i * 8 + Math.random() * 20;
    const freqFin = freqDepart * 0.4;
    setTimeout(() => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freqDepart, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(Math.max(freqFin, 20), audioCtx.currentTime + dureeSegment);
      gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dureeSegment);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + dureeSegment);
    }, t * 1000);
    t += dureeSegment;
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

// ---------- DÉCOR ----------
function initNuages() {
  nuages = [];
  for (let i = 0; i < 4; i++) {
    nuages.push({ x: Math.random() * canvas.width, y: 30 + Math.random() * 80 });
  }
}

function deplacerNuages() {
  nuages.forEach(n => {
    n.x -= 0.4;
    if (n.x < -50) n.x = canvas.width + 50;
  });
}

function dessinerFond() {
  const degrade = ctx.createLinearGradient(0, 0, 0, canvas.height);
  degrade.addColorStop(0, "#87CEEB");
  degrade.addColorStop(1, "#e0f7fa");
  ctx.fillStyle = degrade;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#ffe066";
  ctx.beginPath();
  ctx.arc(700, 60, 30, 0, Math.PI * 2);
  ctx.fill();

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
}

function dessinerSol() {
  ctx.fillStyle = "#6b8e23";
  ctx.fillRect(0, SOL_Y, canvas.width, canvas.height - SOL_Y);
  ctx.fillStyle = "#4a6b1f";
  ctx.fillRect(0, SOL_Y, canvas.width, 6);
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
  prochainObstacle = compteur + 50 + Math.random() * 170;
}

function creerObstacle() {
  const types = ["rocher", "pic", "caisse"];
  const type = types[Math.floor(Math.random() * types.length)];
  const taille = 25 + Math.random() * 15;
  obstacles.push({ x: canvas.width, type, taille });
}

function dessinerObstacles() {
  obstacles.forEach(o => {
    if (o.type === "rocher") {
      ctx.fillStyle = "#7a6a58";
      ctx.beginPath();
      ctx.arc(o.x, SOL_Y - o.taille / 2, o.taille / 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (o.type === "pic") {
      ctx.fillStyle = "#5a5a5a";
      ctx.beginPath();
      ctx.moveTo(o.x - o.taille / 2, SOL_Y);
      ctx.lineTo(o.x, SOL_Y - o.taille);
      ctx.lineTo(o.x + o.taille / 2, SOL_Y);
      ctx.closePath();
      ctx.fill();
    } else {
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
  const largeurTotale = 26 + 42 * 1.4;
  const hauteurMax = 44 * 1.4;

  obstacles.forEach(o => {
    const oGauche = o.x - o.taille / 2;
    const oDroite = o.x + o.taille / 2;
    const oHaut = SOL_Y - o.taille;

    const pieds = joueur.y + joueur.hauteur;
    const hautDuo = pieds - hauteurMax;

    if (
      !jeuTermine &&
      joueur.x < oDroite &&
      joueur.x + largeurTotale > oGauche &&
      hautDuo < SOL_Y &&
      pieds > oHaut
    ) {
      jeuTermine = true;
      victoire = false;
      terminerJeu();
    }
  });
}

// ---------- PALIERS ET VITESSE ----------
function pointsActuels() {
  return Math.floor(score / 10);
}

function gererPaliers() {
  const points = pointsActuels();

  const palierVitesse = Math.floor(points / 500);
  if (palierVitesse > dernierPalierVitesse) {
    dernierPalierVitesse = palierVitesse;
    vitesseDefilement += 0.5;
  }

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
    jouerPet();
    dessinerEcranPerte();
  }
}

function dessinerEcranPerte() {
  dessinerFond();
  dessinerSol();
  dessinerObstacles();
  dessinerJoueur();
  ctx.fillStyle = "#222";
  ctx.font = "30px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Game Over - Score: " + pointsActuels(), canvas.width / 2, 180);
  ctx.textAlign = "left";
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

  dessinerFond();

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

// ---------- SCORE ----------
function dessinerScore() {
  ctx.fillStyle = "#333";
  ctx.font = "20px Arial";
  ctx.fillText("Score: " + pointsActuels(), 20, 30);
}

// ---------- BOUCLE PRINCIPALE ----------
function resetJeu() {
  boutonRejouer.style.display = "none";
  joueur = { x: 50, y: SOL_Y - 44, largeur: 30, hauteur: 44, vitesseY: 0, surLeSol: false };
  obstacles = [];
  score = 0;
  jeuTermine = false;
  victoire = false;
  compteur = 0;
  vitesseDefilement = 6;
  dernierPalierVitesse = 0;
  scintillementFin = 0;
  feuxArtifice = [];
  zoomActuel = 1;
  planifierProchainObstacle();
  initNuages();
  demarrerMusique();
  boucle();
}

function maj() {
  joueur.vitesseY += gravite;
  joueur.y += joueur.vitesseY;

  if (joueur.y >= SOL_Y - joueur.hauteur) {
    joueur.y = SOL_Y - joueur.hauteur;
    joueur.vitesseY = 0;
    joueur.surLeSol = true;
  } else {
    joueur.surLeSol = false;
  }

  compteur++;
  if (compteur >= prochainObstacle) {
    creerObstacle();
    planifierProchainObstacle();
  }

  deplacerObstacles();
  deplacerNuages();
  verifierCollision();

  if (!jeuTermine) score++;

  gererPaliers();
}

function boucle() {
  if (jeuTermine) return;

  dessinerFond();
  maj();

  if (jeuTermine) return;

  dessinerSol();
  dessinerObstacles();
  dessinerJoueur();
  dessinerScore();

  requestAnimationFrame(boucle);
}

function sauter() {
  initAudio();
  if (!jeuTermine && joueur.surLeSol) {
    joueur.vitesseY = -15;
  }
}

document.addEventListener("keydown", (e) => {
  if (e.code === "Space") sauter();
});

canvas.addEventListener("touchstart", sauter);
canvas.addEventListener("click", sauter);
boutonRejouer.addEventListener("click", resetJeu);

resetJeu();