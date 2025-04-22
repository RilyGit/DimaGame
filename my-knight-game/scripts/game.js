const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let knight = {
  x: 100,
  y: 400,
  width: 64,
  height: 64,
  vx: 0,
  vy: 0,
  onGround: false,
  currentImage: new Image(),
};

knight.currentImage.src = "assets/sprites/__Idle.gif";

let gravity = 0.5;
let keys = {};

window.addEventListener("keydown", (e) => keys[e.key] = true);
window.addEventListener("keyup", (e) => keys[e.key] = false);

function update() {
  knight.vx = 0;

  if (keys["a"]) {
    knight.vx = -3;
  }
  if (keys["d"]) {
    knight.vx = 3;
  }
  if (keys[" "] && knight.onGround) {
    knight.vy = -10;
    knight.onGround = false;
  }

  knight.vy += gravity;
  knight.x += knight.vx;
  knight.y += knight.vy;

  if (knight.y + knight.height >= canvas.height - 50) {
    knight.y = canvas.height - 50 - knight.height;
    knight.vy = 0;
    knight.onGround = true;
  }

  // Смена анимации (пока только idle по умолчанию)
  if (keys["Enter"]) {
    knight.currentImage.src = "assets/sprites/__Attack.gif";
  } else if (keys["a"] || keys["d"]) {
    knight.currentImage.src = "assets/sprites/__Run.gif";
  } else if (!knight.onGround) {
    knight.currentImage.src = "assets/sprites/__Jump.gif";
  } else {
    knight.currentImage.src = "assets/sprites/__Idle.gif";
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#3c2f2f";
  ctx.fillRect(0, canvas.height - 50, canvas.width, 50);

  ctx.drawImage(knight.currentImage, knight.x, knight.y, knight.width, knight.height);
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

gameLoop();
