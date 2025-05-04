// === Настройки канваса ===
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

let groundLevel = 0;

// === Игрок и враг ===
const player = {
    x: 0,
    y: 0,
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
      hp: 100,
       isAlive: true,
};

const skeleton = {
    x: 0, 
    y: 0,
     width: 200,
      height: 250,
    speed: 1.5,
     velocityY: 0,
      gravity: 0.8,
    state: 'walk', 
    direction: 'left',
    frameX: 0,
     frameTimer: 0, 
     frameInterval: 100,
    attackRange: 60, 
    attackCooldown: 1000,
     lastAttackTime: 0,
    hp: 50, 
    isAlive: true, 
    takeHit: false,
    isDying: false,
     deathFinished: false,
    maxFrames: { walk: 3, attack: 3, hit: 3, death: 3 },
};

const skeletonVisualOffset = 42;

// === Управление ===
const keys = { right: false, left: false, attack: false, jump: false };
let lastAttackTime = 0;
let attackCooldown = 1000;
let attackToggle = false;

// === Камера ===
const camera = { x: 0, y: 0 };

// === Загрузка изображений ===
const loadImage = src => { const img = new Image(); img.src = src; return img; };

const idleImage = loadImage('./assets/images/Idle.png');
const runImage = loadImage('./assets/images/Run.png');
const attackImage1 = loadImage('./assets/images/Attack.png');
const attackImage2 = loadImage('./assets/images/Attack2.png');
const jumpImage = loadImage('./assets/images/Jump.png');
const dirtImage = loadImage('./assets/images/dirt.png');
const jumpSound = new Audio('assets/images/jump.mp3');
const hitSound = new Audio('assets/images/hit.mp3');
const skeletonHitSound = new Audio('assets/images/skeleton_hit.mp3');

const skeletonImages = {
    walk: loadImage('./assets/images/Skeleton_Walk.png'),
    attack: loadImage('./assets/images/Skeleton_Attack.png'),
    hit: loadImage('./assets/images/Skeleton_Take_Hit.png'),
    death: loadImage('./assets/images/Skeleton_Death.png'),
};

// === Resize ===
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    groundLevel = canvas.height - 60;

    player.x = canvas.width / 2;
    player.y = groundLevel - player.height;

    skeleton.x = player.x + 600;
    skeleton.y = groundLevel - skeleton.height + skeletonVisualOffset;
}
window.addEventListener('resize', resizeCanvas);

// === Игрок ===
function updatePlayer(deltaTime) {
    if (!player.isAlive) return;

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
        player.velocityY = -18;
        player.isJumping = true;
        player.action = 'jump';
    }

    player.y += player.velocityY;
    player.velocityY += player.gravity;

    if (player.y + player.height >= groundLevel) {
        player.y = groundLevel - player.height;
        player.velocityY = 0;
        player.isJumping = false;
        if (player.action === 'jump') player.action = 'idle';
    }

    if (keys.attack && Date.now() - lastAttackTime > attackCooldown) {
        attackToggle = !attackToggle;
        player.action = attackToggle ? 'attack2' : 'attack1';
        lastAttackTime = Date.now();
        hitSound.currentTime = 0; // сброс на начало
        hitSound.play();
        if (playerHitsSkeleton()) skeleton.takeHit = true;
    }

    player.frameTimer += deltaTime;
    if (player.frameTimer > player.frameInterval) {
        player.currentFrame = (player.currentFrame + 1) % 4;
        player.frameTimer = 0;
    }

    camera.x = player.x - canvas.width / 2 + player.width / 2;
}

function playerHitsSkeleton() {
    return skeleton.isAlive &&
        Math.abs((skeleton.x + skeleton.width/2) - (player.x + player.width/2)) < 100;
}

// === Скелет ===
function updateSkeleton(deltaTime) {
    if (!skeleton.isAlive) return;

    // гравитация
    skeleton.y += skeleton.velocityY;
    skeleton.velocityY += skeleton.gravity;
    if (skeleton.y + skeleton.height - skeletonVisualOffset >= groundLevel) {
        skeleton.y = groundLevel - skeleton.height + skeletonVisualOffset;
        skeleton.velocityY = 0;
    }

    // dying animation
    if (skeleton.isDying) {
        skeleton.frameTimer += deltaTime;
        if (skeleton.frameTimer > skeleton.frameInterval) {
            skeleton.frameTimer = 0;
            if (skeleton.frameX < skeleton.maxFrames.death) {
                skeleton.frameX++;
            } else {
                skeleton.deathFinished = true;
            }
        }
        return;
    }

    // take hit
    if (skeleton.takeHit) {
        skeleton.state = 'hit';
        skeleton.frameX = 0;
        skeleton.frameTimer = 0;
        skeleton.hp -= 20;
        skeleton.takeHit = false;
        if (skeleton.hp <= 0) {
            skeleton.isDying = true;
            skeleton.frameX = 0;
            skeleton.frameTimer = 0;
            return;
        }
    }

    // hit animation
    if (skeleton.state === 'hit') {
        skeleton.frameTimer += deltaTime;
        if (skeleton.frameTimer > skeleton.frameInterval) {
            skeleton.frameTimer = 0;
            skeleton.frameX++;
            if (skeleton.frameX > skeleton.maxFrames.hit) {
                skeleton.state = 'walk';
                skeleton.frameX = 0;
            }
        }
        return;
    }

    // walk or attack
    const dist = Math.abs((skeleton.x + skeleton.width/2) - (player.x + player.width/2));
    if (dist <= skeleton.attackRange) {
        skeleton.state = 'attack';
        if (Date.now() - skeleton.lastAttackTime > skeleton.attackCooldown) {
            skeleton.lastAttackTime = Date.now();
            if (player.isAlive) player.hp -= 10;
            if (player.hp <= 0) player.isAlive = false;
        }
    } else {
        skeleton.state = 'walk';
        if (skeleton.x > player.x) {
            skeleton.x -= skeleton.speed;
            skeleton.direction = 'left';
        } else {
            skeleton.x += skeleton.speed;
            skeleton.direction = 'right';
        }
    }

    // frame update
    skeleton.frameTimer += deltaTime;
    if (skeleton.frameTimer > skeleton.frameInterval) {
        skeleton.frameTimer = 0;
        skeleton.frameX = (skeleton.frameX + 1) % (skeleton.maxFrames[skeleton.state] + 1);
    }
}

// === Отрисовка ===
function drawPlayer() {
    if (!player.isAlive) return;
    let sprite = idleImage;
    switch (player.action) {
        case 'run': sprite = runImage; break;
        case 'attack1': sprite = attackImage1; break;
        case 'attack2': sprite = attackImage2; break;
        case 'jump': sprite = jumpImage; break;
    }

    const drawX = player.x - camera.x;
    const fw = 120, fh = 80;

    ctx.save();
    if (player.direction === 'left') {
        ctx.translate(drawX + player.width/2, 0);
        ctx.scale(-1,1);
        ctx.drawImage(sprite,
            player.currentFrame*fw, 0, fw, fh,
            -player.width/2, player.y, player.width, player.height
        );
    } else {
        ctx.drawImage(sprite,
            player.currentFrame*fw, 0, fw, fh,
            drawX, player.y, player.width, player.height
        );
    }
    ctx.restore();
}

function drawSkeleton() {
    if (!skeleton.isAlive && !skeleton.isDying) return;

    let img = skeletonImages.walk;
    if (skeleton.isDying) img = skeletonImages.death;
    else if (skeleton.state === 'attack') img = skeletonImages.attack;
    else if (skeleton.state === 'hit') img = skeletonImages.hit;

    const drawX = skeleton.x - camera.x;
    const fw = 150, fh = 150;

    ctx.save();
    if (skeleton.direction === 'left') {
        ctx.translate(drawX + skeleton.width/2, 0);
        ctx.scale(-1,1);
        ctx.drawImage(img,
            skeleton.frameX*fw, 0, fw, fh,
            -skeleton.width/2, skeleton.y + skeletonVisualOffset,
            skeleton.width, skeleton.height
        );
    } else {
        ctx.drawImage(img,
            skeleton.frameX*fw, 0, fw, fh,
            drawX, skeleton.y + skeletonVisualOffset,
            skeleton.width, skeleton.height
        );
    }
    ctx.restore();
}

function drawGround() {
    for (let i = -1; i < canvas.width/64 + 2; i++) {
        ctx.drawImage(dirtImage,
            i*64 - camera.x%64, groundLevel, 64, 64);
    }
}

// === Игровой цикл ===
let lastTime = 0;
function gameLoop(timestamp) {
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = '#87ceeb';
    ctx.fillRect(0,0,canvas.width,canvas.height);

    drawGround();
    updatePlayer(deltaTime);
    drawPlayer();
    updateSkeleton(deltaTime);
    drawSkeleton();

    requestAnimationFrame(gameLoop);
}

// === События ===
window.addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    if (k==='d'||k==='в') keys.right=true;
    if (k==='a'||k==='ф') keys.left=true;
    if (k===' ') keys.jump=true;
});
window.addEventListener('keyup', e => {
    const k = e.key.toLowerCase();
    if (k==='d'||k==='в') keys.right=false;
    if (k==='a'||k==='ф') keys.left=false;
    if (k===' ') keys.jump=false;
});
window.addEventListener('mousedown', e => {
    if (e.button===0) keys.attack=true;
});
window.addEventListener('mouseup', e => {
    if (e.button===0) keys.attack=false;
});

// === Старт ===
window.onload = () => {
    resizeCanvas();
    gameLoop(0);
};
