const canvas = document.getElementById("jeu");
const ctx = canvas.getContext("2d");

const joueur = {
  x: 50,
  y: 300,
  largeur: 40,
  hauteur: 40,
  vitesseY: 0,
  surLeSol: false
};

const gravite = 0.8;
const sol = 360;

let obstacles = [];
let score = 0;
let jeuTermine = false;
let compteur = 0;

function dessinerSol() {
  ctx.fillStyle = "#654321";
  ctx.fillRect(0, sol + 40, canvas.width, 20);
}

function dessinerJoueur() {
  ctx.fillStyle = "red";
  ctx.fillRect(joueur.x, joueur.y, joueur.largeur, joueur.hauteur);
}

function creerObstacle() {
  obstacles.push({
    x: canvas.width,
    y: sol,
    largeur: 30,
    hauteur: 40
  });
}

function dessinerObstacles() {
  ctx.fillStyle = "green";
  obstacles.forEach(o => {
    ctx.fillRect(o.x, o.y, o.largeur, o.hauteur);
  });
}

function deplacerObstacles() {
  obstacles.forEach(o => o.x -= 6);
  obstacles = obstacles.filter(o => o.x + o.largeur > 0);
}

function verifierCollision() {
  obstacles.forEach(o => {
    if (
      joueur.x < o.x + o.largeur &&
      joueur.x + joueur.largeur > o.x &&
      joueur.y < o.y + o.hauteur &&
      joueur.y + joueur.hauteur > o.y
    ) {
      jeuTermine = true;
    }
  });
}

function dessinerScore() {
  ctx.fillStyle = "black";
  ctx.font = "20px Arial";
  ctx.fillText("Score: " + score, 20, 30);
}

function maj() {
  joueur.vitesseY += gravite;
  joueur.y += joueur.vitesseY;

  if (joueur.y >= sol) {
    joueur.y = sol;
    joueur.vitesseY = 0;
    joueur.surLeSol = true;
  } else {
    joueur.surLeSol = false;
  }

  compteur++;
  if (compteur % 90 === 0) {
    creerObstacle();
  }

  deplacerObstacles();
  verifierCollision();

  if (!jeuTermine) score++;
}

function boucle() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (jeuTermine) {
    ctx.fillStyle = "black";
    ctx.font = "30px Arial";
    ctx.fillText("Game Over - Score: " + Math.floor(score / 10), 250, 200);
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
  if (joueur.surLeSol) {
    joueur.vitesseY = -15;
  }
}

document.addEventListener("keydown", (e) => {
  if (e.code === "Space") sauter();
});

canvas.addEventListener("touchstart", sauter);

boucle();
