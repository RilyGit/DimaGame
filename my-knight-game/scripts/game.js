const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let knight = {
  x: 100,
  y: 400,
  width: 32,
  height: 32,
  vx: 0,
  vy: 0,
  onGround: false,
  sprite: new Image()
};

knight.sprite.src = "assets/sprites/knight.png";

let gravity = 0.5;
let keys = {};

window.addEventListener("keydown", (e) => keys[e.key] = true);
window.addEventListener("keyup", (e) => keys[e.key] = false);

function update() {
  // управление
  knight.vx = 0;
  if (keys["ArrowLeft"]) knight.vx = -3;
  if (keys["ArrowRight"]) knight.vx = 3;
  if (keys[" "] && knight.onGround) {
    knight.vy = -10;
    knight.onGround = false;
  }

  knight.vy += gravity;
  knight.x += knight.vx;
  knight.y += knight.vy;

  // примитивная проверка "земли"
  if (knight.y + knight.height >= canvas.height - 50) {
    knight.y = canvas.height - 50 - knight.height;
    knight.vy = 0;
    knight.onGround = true;
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#3c2f2f";
  ctx.fillRect(0, canvas.height - 50, canvas.width, 50); // земля

  ctx.drawImage(knight.sprite, knight.x, knight.y, knight.width, knight.height);
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

gameLoop();
