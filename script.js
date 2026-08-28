const canvas = document.getElementById("jeu");
const ctx = canvas.getContext("2d");
const boutonRejouer = document.getElementById("boutonRejouer");

const gravite = 0.8;
const sol = 360;

let joueur, obstacles, score, jeuTermine, compteur, etoiles;

function initEtoiles() {
  etoiles = [];
  for (let i = 0; i < 80; i++) {
    etoiles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      taille: Math.random() * 2 + 1
    });
  }
}

function resetJeu() {
  boutonRejouer.style.display = "none";
  joueur = { x: 50, y: 300, largeur: 40, hauteur: 40, vitesseY: 0, surLeSol: false };
  obstacles = [];
  score = 0;
  jeuTermine = false;
  compteur = 0;
  initEtoiles();
  boucle();
}

function dessinerFond() {
  ctx.fillStyle = "#05010d";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "white";
  etoiles.forEach(e => {
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.taille, 0, Math.PI * 2);
    ctx.fill();
  });
}

function dessinerSol() {
  ctx.fillStyle = "#4a4a5a";
  ctx.fillRect(0, sol + 40, canvas.width, 20);
}

function dessinerJoueur() {
  ctx.fillStyle = "#00e5ff";
  ctx.fillRect(joueur.x, joueur.y + 10, 30, 20);
  ctx.beginPath();
  ctx.moveTo(joueur.x + 30, joueur.y + 10);
  ctx.lineTo(joueur.x + 40, joueur.y + 20);
  ctx.lineTo(joueur.x + 30, joueur.y + 30);
  ctx.closePath();
  ctx.fill();
}

function creerObstacle() {
  obstacles.push({ x: canvas.width, y: sol + 5, rayon: 18 });
}

function dessinerObstacles() {
  ctx.fillStyle = "#8a8a8a";
  obstacles.forEach(o => {
    ctx.beginPath();
    ctx.arc(o.x, o.y, o.rayon, 0, Math.PI * 2);
    ctx.fill();
  });
}

function deplacerObstacles() {
  obstacles.forEach(o => o.x -= 6);
  obstacles = obstacles.filter(o => o.x + o.rayon > 0);
}

function verifierCollision() {
  obstacles.forEach(o => {
    const centreJoueurX = joueur.x + joueur.largeur / 2;
    const centreJoueurY = joueur.y + joueur.hauteur / 2;
    const dist = Math.hypot(centreJoueurX - o.x, centreJoueurY - o.y);
    if (dist < o.rayon + 18) {
      jeuTermine = true;
    }
  });
}

function dessinerScore() {
  ctx.fillStyle = "white";
  ctx.font = "20px Arial";
  ctx.fillText("Score: " + Math.floor(score / 10), 20, 30);
}

function dessinerGameOver() {
  ctx.fillStyle = "white";
  ctx.font = "30px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Game Over - Score: " + Math.floor(score / 10), canvas.width / 2, 180);
  ctx.textAlign = "left";
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
  if (compteur % 90 === 0) creerObstacle();

  deplacerObstacles();
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
    boutonRejouer.style.display = "block";
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
