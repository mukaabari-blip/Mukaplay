const canvas = document.getElementById("jeu");
const ctx = canvas.getContext("2d");
const boutonRejouer = document.getElementById("boutonRejouer");
const musiqueJeu = document.getElementById("musiqueJeu");

const gravite = 0.8;
const SOL_Y = 340;

let joueur, obstacles, score, jeuTermine, compteur, nuages, prochainObstacle;

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

// Musique de fin dramatique, quelques notes graves et lentes
function jouerMusiqueFin() {
  initAudio();
  const notesFin = [
    [196.00, 0.5], [174.61, 0.5], [146.83, 0.9], [130.81, 1.4]
  ];
  let t = 0;
  notesFin.forEach(([freq, duree]) => {
    setTimeout(() => jouerNote(freq, duree, "triangle", 0.15), t * 1000);
    t += duree;
  });
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

// ---------- PERSONNAGE : petit garçon avec touffe ----------
function dessinerJoueur() {
  const x = joueur.x;
  const y = joueur.y;
  const anim = Math.floor(compteur / 6) % 2;

  ctx.strokeStyle = "#3b2f2f";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";

  // Tête
  ctx.fillStyle = "#f1c27d";
  ctx.beginPath();
  ctx.arc(x + 15, y + 10, 9, 0, Math.PI * 2);
  ctx.fill();

  // Touffe de cheveux
  ctx.fillStyle = "#3b2f2f";
  ctx.beginPath();
  ctx.moveTo(x + 10, y + 3);
  ctx.quadraticCurveTo(x + 12, y - 8, x + 16, y - 2);
  ctx.quadraticCurveTo(x + 18, y - 9, x + 21, y - 1);
  ctx.quadraticCurveTo(x + 20, y + 3, x + 15, y + 2);
  ctx.closePath();
  ctx.fill();

  // Yeux
  ctx.fillStyle = "#222";
  ctx.beginPath();
  ctx.arc(x + 12, y + 9, 1.3, 0, Math.PI * 2);
  ctx.arc(x + 18, y + 9, 1.3, 0, Math.PI * 2);
  ctx.fill();

  // T-shirt
  ctx.fillStyle = "#3b82f6";
  ctx.fillRect(x + 8, y + 18, 14, 14);

  // Bras
  ctx.strokeStyle = "#3b82f6";
  ctx.beginPath();
  ctx.moveTo(x + 15, y + 20);
  ctx.lineTo(x + 4, y + 28);
  ctx.moveTo(x + 15, y + 20);
  ctx.lineTo(x + 26, y + 28);
  ctx.stroke();

  // Cou
  ctx.strokeStyle = "#3b2f2f";
  ctx.beginPath();
  ctx.moveTo(x + 15, y + 19);
  ctx.lineTo(x + 15, y + 32);
  ctx.stroke();

  // Jambes
  ctx.strokeStyle = "#8b5a2b";
  ctx.lineWidth = 4;
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
  jouerMusiqueFin();
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
