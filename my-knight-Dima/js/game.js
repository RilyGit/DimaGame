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

// Скриншот скелета
const skeletonImages = {
  walk: new Image(),
  attack: new Image(),
};

skeletonImages.walk.src = './assets/images/Skeleton_Walk.png';
skeletonImages.attack.src = './assets/images/Skeleton_Attack.png';

// Объект скелета
const skeleton = {
  x: player.x + 600, // появляется правее игрока
  y: canvas.height - 210,
  width: 100,
  height: 150,
  speed: 1.5,
  state: 'walk', // 'walk' или 'attack'
  frameX: 0,
  maxFrameWalk: 4,   // 5 кадров ходьбы
  maxFrameAttack: 7, // 8 кадров атаки
  frameTimer: 0,
  frameInterval: 100, // скорость анимации (мс)
  direction: 'left',
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

function updateSkeleton(deltaTime) {

// Гравитация скелета
skeleton.y += skeleton.velocityY || 0; 
skeleton.velocityY = (skeleton.velocityY || 0) + 0.8;

if (skeleton.y + player.height >= canvas.height - 60) {
    skeleton.y = canvas.height - 60 - player.height;
    skeleton.velocityY = 0;
}

if (skeleton.state === 'walk') {
  if (skeleton.x > player.x + player.width / 2) {
      skeleton.x -= skeleton.speed;
      skeleton.direction = 'left';
  } else if (skeleton.x + skeleton.width < player.x + player.width / 2) {
      skeleton.x += skeleton.speed;
      skeleton.direction = 'right';
  } else {
      skeleton.state = 'attack';
      skeleton.frameX = 0;
  }
}



  skeleton.frameTimer += deltaTime;
  if (skeleton.frameTimer > skeleton.frameInterval) {
      skeleton.frameX++;
      skeleton.frameTimer = 0;

      if (skeleton.state === 'walk' && skeleton.frameX > skeleton.maxFrameWalk) {
          skeleton.frameX = 0;
      }
      if (skeleton.state === 'attack' && skeleton.frameX > skeleton.maxFrameAttack) {
          skeleton.frameX = 0;
      }
  }
}

function attackPlayer() {
  if (skeleton.state === 'attack') {
      if (skeleton.frameX === 4) { // в момент удара
          console.log('Скелет атакует!');
          // Тут можешь уменьшать HP игрока, если хочешь
      }
  }
}

function drawSkeleton() {
  let img = skeleton.state === 'walk' ? skeletonImages.walk : skeletonImages.attack;
  let frameWidth = 150;

  ctx.save();
  if (skeleton.direction === 'left') {
      ctx.scale(-1, 1);
      ctx.drawImage(
          img,
          skeleton.frameX * frameWidth,
          0,
          frameWidth,
          150,
          -(skeleton.x - camera.x) - skeleton.width,
          skeleton.y - camera.y,
          skeleton.width,
          player.height // подогнали под рыцаря
      );
  } else {
      ctx.drawImage(
          img,
          skeleton.frameX * frameWidth,
          0,
          frameWidth,
          150,
          skeleton.x - camera.x,
          skeleton.y - camera.y,
          skeleton.width,
          player.height
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

    // Фон
    ctx.fillStyle = '#87ceeb';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Земля
    drawGround();

    // Обновление и отрисовка игрока
    updatePlayer(deltaTime);
    drawPlayer();

    // Обновление и отрисовка скелета
    updateSkeleton(deltaTime);
    attackPlayer();
    drawSkeleton();

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
