const canvas = document.getElementById("jeu");
const ctx = canvas.getContext("2d");

// Le personnage
const joueur = {
  x: 50,
  y: 300,
  largeur: 40,
  hauteur: 40,
  vitesseY: 0,
  surLeSol: false
};

const gravite = 0.8;
const sol = 360; // position du sol (hauteur du canvas - hauteur du perso)

// Le sol
function dessinerSol() {
  ctx.fillStyle = "#654321";
  ctx.fillRect(0, sol + 40, canvas.width, 20);
}

function dessinerJoueur() {
  ctx.fillStyle = "red";
  ctx.fillRect(joueur.x, joueur.y, joueur.largeur, joueur.hauteur);
}

function maj() {
  // Gravité
  joueur.vitesseY += gravite;
  joueur.y += joueur.vitesseY;

  // Empêcher de traverser le sol
  if (joueur.y >= sol) {
    joueur.y = sol;
    joueur.vitesseY = 0;
    joueur.surLeSol = true;
  } else {
    joueur.surLeSol = false;
  }
}

function boucle() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  maj();
  dessinerSol();
  dessinerJoueur();
  requestAnimationFrame(boucle);
}

// Saut avec la barre espace ou tap écran
function sauter() {
  if (joueur.surLeSol) {
    joueur.vitesseY = -15;
  }
}

document.addEventListener("keydown", (e) => {
  if (e.code === "Space") sauter();
});

canvas.addEventListener("touchstart", sauter);

boucle();
