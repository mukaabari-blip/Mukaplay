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

// Mélodie funky originale, ambiance décontractée façon jeu d'action open-world
const melodie = [
  [220.00, 0.15], [220.00, 0.15], [261.63, 0.15], [220.00, 0.15],
  [196.00, 0.15], [220.00, 0.15], [246.94, 0.3],
  [220.00, 0.15], [220.00, 0.15], [261.63, 0.15], [293.66, 0.15],
  [261.63, 0.15], [220.00, 0.15], [196.00, 0.3],
  [174.61, 0.15], [196.00, 0.15], [220.00, 0.15], [196.00, 0.15],
  [174.61, 0.15], [164.81, 0.15], [174.61, 0.3]
];

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

function jouerMelodie() {
  if (!musiqueActive) return;
  const [freq, duree] = melodie[indexNote];
  jouerNote(freq, duree, "sawtooth", 0.06);
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
    ctx.arc(
