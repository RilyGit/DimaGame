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
    maxFrameWalk: 4,
    maxFrameAttack: 7,
    frameTimer: 0,
    frameInterval: 100,
    attackRange: 80,
    attackCooldown: 1000,
    lastAttackTime: 0,
    hp: 50,
    isAlive: true,
    takeHit: false,
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

const idleImage     = loadImage('./assets/images/Idle.png');
const runImage      = loadImage('./assets/images/Run.png');
const attackImage1  = loadImage('./assets/images/Attack.png');
const attackImage2  = loadImage('./assets/images/Attack2.png');
const jumpImage     = loadImage('./assets/images/Jump.png');
const dirtImage     = loadImage('./assets/images/dirt.png');

const skeletonImages = {
    walk     : loadImage('./assets/images/Skeleton_Walk.png'),
    attack   : loadImage('./assets/images/Skeleton_Attack.png'),
    death    : loadImage('./assets/images/Skeleton_Death.png'),
    hit      : loadImage('./assets/images/Skeleton_Take_Hit.png'),
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

// === Обновления игрока ===
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
        if (playerHitsSkeleton()) skeleton.takeHit = true;
    }

    player.frameTimer += deltaTime;
    if (player.frameTimer > player.frameInterval) {
        player.currentFrame = (player.currentFrame + 1) % 4;
        player.frameTimer = 0;
    }

    camera.x = player.x - canvas.width / 2 + player.width / 2;
}

// === Обновления скелета ===
function updateSkeleton(deltaTime) {
    if (!skeleton.isAlive) return;

    skeleton.y += skeleton.velocityY;
    skeleton.velocityY += skeleton.gravity;
    if (skeleton.y + skeleton.height - skeletonVisualOffset >= groundLevel) {
        skeleton.y = groundLevel - skeleton.height + skeletonVisualOffset;
        skeleton.velocityY = 0;
    }

    if (skeleton.takeHit) {
        skeleton.hp -= 20;
        skeleton.takeHit = false;
        if (skeleton.hp <= 0) {
            skeleton.isAlive = false;
            return;
        }
    }

    const dist = Math.abs(
        (skeleton.x + skeleton.width / 2) - (player.x + player.width / 2)
    );
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

    skeleton.frameTimer += deltaTime;
    if (skeleton.frameTimer > skeleton.frameInterval) {
        skeleton.frameTimer = 0;
        skeleton.frameX++;
        if (skeleton.state === 'walk' && skeleton.frameX > skeleton.maxFrameWalk) {
            skeleton.frameX = 0;
        }
        if (skeleton.state === 'attack' && skeleton.frameX > skeleton.maxFrameAttack) {
            skeleton.frameX = 0;
        }
    }
}

function playerHitsSkeleton() {
    return skeleton.isAlive &&
        Math.abs(
            (skeleton.x + skeleton.width / 2) - (player.x + player.width / 2)
        ) < 100;
}

function drawPlayer() {
    if (!player.isAlive) return;

    let sprite = idleImage;
    switch (player.action) {
        case 'run':    sprite = runImage;    break;
        case 'attack1': sprite = attackImage1; break;
        case 'attack2': sprite = attackImage2; break;
        case 'jump':   sprite = jumpImage;   break;
    }

    ctx.save();
    if (player.direction === 'left') {
        ctx.scale(-1, 1);
        ctx.drawImage(
            sprite,
            player.currentFrame * 120, 0, 120, 80,
            -(player.x - camera.x) - player.width, player.y,
            player.width, player.height
        );
    } else {
        ctx.drawImage(
            sprite,
            player.currentFrame * 120, 0, 120, 80,
            player.x - camera.x, player.y,
            player.width, player.height
        );
    }
    ctx.restore();
}

function drawSkeleton() {
    if (!skeleton.isAlive) return;

    const img = skeleton.state === 'walk'
        ? skeletonImages.walk
        : skeletonImages.attack;

    ctx.save();
    if (skeleton.direction === 'left') {
        ctx.scale(-1, 1);
        ctx.drawImage(
            img,
            skeleton.frameX * 150, 0, 150, 150,
            -(skeleton.x - camera.x) - skeleton.width,
            skeleton.y + skeletonVisualOffset,
            skeleton.width, skeleton.height
        );
    } else {
        ctx.drawImage(
            img,
            skeleton.frameX * 150, 0, 150, 150,
            skeleton.x - camera.x,
            skeleton.y + skeletonVisualOffset,
            skeleton.width, skeleton.height
        );
    }
    ctx.restore();
}

function drawGround() {
    for (let i = -1; i < canvas.width / 64 + 2; i++) {
        ctx.drawImage(
            dirtImage,
            i * 64 - camera.x % 64,
            groundLevel,
            64, 64
        );
    }
}

// === Игровой цикл ===
let lastTime = 0;
function gameLoop(timestamp) {
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#87ceeb';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawGround();
    updatePlayer(deltaTime);
    drawPlayer();
    updateSkeleton(deltaTime);
    drawSkeleton();

    requestAnimationFrame(gameLoop);
}

// === Управление событиями ===
window.addEventListener('keydown', e => {
    const key = e.key.toLowerCase();
    if (key === 'd' || key === 'в') keys.right = true;
    if (key === 'a' || key === 'ф') keys.left = true;
    if (key === ' ') keys.jump = true;
});
window.addEventListener('keyup', e => {
    const key = e.key.toLowerCase();
    if (key === 'd' || key === 'в') keys.right = false;
    if (key === 'a' || key === 'ф') keys.left = false;
    if (key === ' ') keys.jump = false;
});
window.addEventListener('mousedown', e => {
    if (e.button === 0) keys.attack = true;
});
window.addEventListener('mouseup', e => {
    if (e.button === 0) keys.attack = false;
});

// === Старт ===
window.onload = () => {
    resizeCanvas();
    gameLoop(0);
};
