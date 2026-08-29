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

// Son de flatulence long et texturé (environ 1,3 seconde)
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

// Petit son aigu pour le scintillement de palier
function jouerSonPalier() {
  initAudio();
  jouerNote(880, 0.15, "sine", 0.1);
  setTimeout(() => jouerNote(1174.66, 0.2, "sine", 0.1), 100);
}

// Fanfare de victoire
function jouer