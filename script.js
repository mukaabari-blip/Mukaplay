const canvas = document.getElementById("jeu");
const ctx = canvas.getContext("2d");
const boutonRejouer = document.getElementById("boutonRejouer");

const gravite = 0.8;
const SOL_Y = 340;

let joueur, obstacles, score, jeuTermine, compteur, nuages, prochainObstacle;

// ---------- AUDIO ----------
let audioCtx;
let indexNote = 0;
let musiqueTimeoutId = null;
let musiqueActive = false;

const melodie = [
  [659.25, 0.2], [493.88, 0.1], [523.25, 0.1], [587.33, 0.2],
  [523.25, 0.1], [493.88, 0.1], [440.00, 0.2], [440.00, 0.1],
  [523.25, 0.1], [659.25, 0.2], [587.33, 0.1], [523.25, 0.1],
  [493.88, 0.3], [523.25, 0.1], [587.33, 0.2], [659.25, 0.2],
  [523.25, 0.2], [440.00, 0.2], [440.00, 0.4]
];

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
}

function jouerNote(freq, duree) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "square";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duree);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duree);
}

function jouerMelodie() {
  if (!musiqueActive) return;
  const [freq, duree] = melodie[indexNote];
  jouerNote(freq, duree);
  indexNote = (indexNote + 1) % melodie.length;
  musiqueTimeoutId = setTimeout(jouerMelodie, duree * 1000);
}

function demarrerMusique() {
  initAudio();
  musiqueActive = true;
  indexNote = 0;
  clearTimeout(musiqueTimeoutId);
  jouerMelodie();
}

function arreterMusique() {
  musiqueActive = false;
  clearTimeout(musiqueTimeoutId);
}

function jouerPet() {
  initAudio();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(150, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(35, audioCtx.currentTime + 0.5);
  gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.5);
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

// ---------- PERSONNAGE ----------
function dessinerJoueur() {
  const x = joueur.x;
  const y = joueur.y;
  const anim = Math.floor(compteur / 6) % 2;

  ctx.strokeStyle = "#3b2f2f";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";

  ctx.fillStyle = "#f1c27d";
  ctx.beginPath();
  ctx.arc(x + 15, y + 8, 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(x + 15, y + 16);
  ctx.lineTo(x + 15, y + 32);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x + 15, y + 20);
  ctx.lineTo(x + 5, y + 28);
  ctx.moveTo(x + 15, y + 20);
  ctx.lineTo(x + 25, y + 28);
  ctx.stroke();

  ctx.beginPath();
  if (!joueur.surLeSol) {
    ctx.moveTo(x + 15, y + 32);
    ctx.lineTo(x + 8, y + 42);
    ctx.moveTo(x + 15, y + 32);
    ctx.lineTo(x + 22, y + 42);
  } else if (anim === 0) {
    ctx.moveTo(x + 15, y + 32);
    ctx.lineTo(x + 6, y + 44);
    ctx.moveTo(x + 15, y + 32);
    ctx.lineTo(x + 22, y + 44);
  } else {
    ctx.moveTo(x + 15, y + 32);
    ctx.lineTo(x + 8, y + 44);
    ctx.moveTo(x + 15, y + 32);
    ctx.lineTo(x + 24, y + 44);
  }
  ctx.stroke();
}

// ---------- OBSTACLES ----------
function planifierProchainObstacle() {
  prochainObstacle = compteur + 60 + Math.random() * 90;
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
  obstacles.forEach(o => o.x -= 6);
  obstacles = obstacles.filter(o => o.x + o.taille > 0);
}

function verifierCollision() {
  obstacles.forEach(o => {
    const oGauche = o.x - o.taille / 2;
    const oDroite = o.x + o.taille / 2;
    const oHaut = SOL_Y - o.taille;
    if (
      !jeuTermine &&
      joueur.x < oDroite &&
      joueur.x + joueur.largeur > oGauche &&
      joueur.y < SOL_Y &&
      joueur.y + joueur.hauteur > oHaut
    ) {
      jeuTermine = true;
      terminerJeu();
    }
  });
}

function terminerJeu() {
  arreterMusique();
  jouerPet();
  boutonRejouer.style.display = "block";
}

// ---------- SCORE ----------
function dessinerScore() {
  ctx.fillStyle = "#333";
  ctx.font = "20px Arial";
  ctx.fillText("Score: " + Math.floor(score / 10), 20, 30);
}

function dessinerGameOver() {
  ctx.fillStyle = "#222";
  ctx.font = "30px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Game Over - Score: " + Math.floor(score / 10), canvas.width / 2, 180);
  ctx.textAlign = "left";
}

// ---------- BOUCLE PRINCIPALE ----------
function resetJeu() {
  boutonRejouer.style.display = "none";
  joueur = { x: 50, y: SOL_Y - 44, largeur: 30, hauteur: 44, vitesseY: 0, surLeSol: false };
  obstacles = [];
  score = 0;
  jeuTermine = false;
  compteur = 0;
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
}

function boucle() {
  dessinerFond();

  if (jeuTermine) {
    dessinerSol();
    dessinerObstacles();
    dessinerJoueur();
    dessinerGameOver();
    return;
  }

  maj();
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
