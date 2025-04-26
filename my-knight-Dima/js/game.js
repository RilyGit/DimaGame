const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

canvas.width = window.innerWidth;
 canvas.height = window.innerHeight;

const idleImage = new Image();
idleImage.src = './assets/images/Idle.png';
const runImage = new Image();
 runImage.src = './assets/images/Run.png';
const attackImage1 = new Image();
  attackImage1.src = './assets/images/Attack.png';
const attackImage2 = new Image();
attackImage2.src = './assets/images/Attack2.png';
 const jumpImage = new Image();
jumpImage.src = './assets/images/Jump.png';
const dirtImage = new Image();
 dirtImage.src = './assets/images/dirt.png';

const keys = {
    right: false,
    left: false,
    attack: false,
    jump: false,
};

let lastAttackTime = 0;
let attackCooldown = 1000; // кдшка пока что нормик 
let attackToggle = false;

const player = {
    x: canvas.width / 2,
    y: canvas.height - 250, 
    width: 200,
    height: 250,
    speed: 5,
    velocityY: 0,
    gravity: 0.8,
    isJumping: false,
    currentFrame: 0,
    frameTimer: 0,
    frameInterval: 100,
    action: 'idle', 
    direction: 'right',
};

const camera = {
    x: 0,
    y: 0,
};

function updatePlayer(deltaTime) {
    if (keys.right) {
        player.x += player.speed;
        player.direction = 'right';
  if (!player.isJumping && !keys.attack) player.action = 'run';
 } else if (keys.left) {
  player.x -= player.speed;
      player.direction = 'left';
     if (!player.isJumping && !keys.attack) player.action = 'run';
    } else if (!player.isJumping && !keys.attack) {
     player.action = 'idle';
 }

if (keys.jump && !player.isJumping) {
     player.velocityY = -18;  // сила прыжка
 player.isJumping = true;
    player.action = 'jump';
    }

    player.y += player.velocityY;
    player.velocityY += player.gravity;

    if (player.y + player.height >= canvas.height - 60) {
        player.y = canvas.height - 60 - player.height;
        player.velocityY = 0;
        player.isJumping = false;
        if (player.action === 'jump') player.action = 'idle';
    }

    if (keys.attack) {
        const now = Date.now();
        if (now - lastAttackTime > attackCooldown) {
            attackToggle = !attackToggle; 
            player.action = attackToggle ? 'attack2' : 'attack1';
            lastAttackTime = now;
        }
    }

    player.frameTimer += deltaTime;
    if (player.frameTimer > player.frameInterval) {
        player.currentFrame++;
        player.frameTimer = 0;
        if (player.currentFrame > 3) player.currentFrame = 0;
    }
    camera.x = player.x - canvas.width / 2 + player.width / 2;
}

function drawPlayer() {
    let sprite;
    if (player.action === 'idle') sprite = idleImage;
    else if (player.action === 'run') sprite = runImage;
    else if (player.action === 'attack1') sprite = attackImage1;
    else if (player.action === 'attack2') sprite = attackImage2;
    else if (player.action === 'jump') sprite = jumpImage;

    ctx.save();
    if (player.direction === 'left') {
        ctx.scale(-1, 1);
        ctx.drawImage(
        sprite,
  player.currentFrame * 120, 0, 120, 80,
     -(player.x - camera.x) - player.width, player.y - camera.y, player.width, player.height
      );
 } else {
     ctx.drawImage(
          sprite,
     player.currentFrame * 120, 0, 120, 80,
 player.x - camera.x, player.y - camera.y, player.width, player.height
    );
    }
ctx.restore();
}

function drawGround() {
   for (let i = -1; i < canvas.width / 64 + 2; i++) {
      ctx.drawImage(dirtImage, i * 64 - camera.x % 64, canvas.height - 60, 64, 64);
    }
}

let lastTime = 0;
function gameLoop(timeStamp) {
    const deltaTime = timeStamp - lastTime;
    lastTime = timeStamp;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#87ceeb';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawGround();
    updatePlayer(deltaTime);
    drawPlayer();
    requestAnimationFrame(gameLoop);
}

window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (key === 'd' || key === 'в') keys.right = true;
    if (key === 'a' || key === 'ф') keys.left = true;
    if (key === ' ') keys.jump = true;
});

window.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    if (key === 'd' || key === 'в') keys.right = false;
    if (key === 'a' || key === 'ф') keys.left = false;
    if (key === ' ') keys.jump = false;
});

window.addEventListener('mousedown', (e) => {
    if (e.button === 0) { 
        keys.attack = true;
    }
});

window.addEventListener('mouseup', (e) => {
    if (e.button === 0) {
        keys.attack = false;
    }
});
gameLoop(0);