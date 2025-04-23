const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const config = {
    gravity: 0.6,
    groundLevel: 60,
    playerScale: 2,
    moveSpeed: 8,
    jumpForce: 16,
    attackDuration: 600,
    acceleration: 0.7,
    friction: 0.85
};

const knight = {
    x: 100,
    y: 0,
    width: 64,
    height: 64,
    vx: 0,
    vy: 0,
    onGround: false,
    currentImage: null,
    scale: config.playerScale,
    isAttacking: false,
    facingRight: true
};

const assets = {
    idle: null,
    run: null,
    jump: null,
    attack: null
};
const assetPaths = {
    idle: 'images/__Idle.gif',
    run: 'images/__Run.gif',
    jump: 'images/__Jump.gif',
    attack: 'images/__Attack.gif'
};

const keys = {
    KeyA: false,
    KeyD: false,
    Space: false
};

let attackCooldown = false;
let debugInfo = true;

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if (knight) {
        const groundCollisionLevel = canvas.height - config.groundLevel;
        if (knight.y + knight.height * knight.scale >= groundCollisionLevel) {
             knight.y = groundCollisionLevel - knight.height * knight.scale;
             knight.onGround = true;
        }
    }
}
window.addEventListener('resize', resizeCanvas);

function preloadImages() {
    const promises = Object.entries(assetPaths).map(([key, src]) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = src;
            img.onload = () => {
                assets[key] = img;
                if (key === 'idle' && !knight.currentImage) {
                    knight.currentImage = img;
                }
                resolve(img);
            };
            img.onerror = () => {
                console.error(`Failed to load: ${src}`);
                reject(new Error(`Failed to load image: ${src}`));
            };
        });
    });
    return Promise.all(promises);
}

function setupInput() {
    window.addEventListener('keydown', (e) => {
        const code = e.code;
        switch(code) {
            case 'KeyA': keys.KeyA = true; break;
            case 'KeyD': keys.KeyD = true; break;
            case 'Space':
                keys.Space = true;
                e.preventDefault();
                break;
            case 'KeyF':
                const fullscreenBtn = document.getElementById('fullscreenBtn');
                if(fullscreenBtn) fullscreenBtn.click();
                break;
            case 'KeyB': // Toggle debug info
                debugInfo = !debugInfo;
                break;
        }
    });

    window.addEventListener('keyup', (e) => {
        const code = e.code;
        switch(code) {
            case 'KeyA': keys.KeyA = false; break;
            case 'KeyD': keys.KeyD = false; break;
            case 'Space': keys.Space = false; break;
        }
    });

    canvas.addEventListener('mousedown', (e) => {
        if (e.button === 0) {
            handleAttack();
        }
    });

    const fullscreenBtn = document.getElementById('fullscreenBtn');
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                canvas.requestFullscreen().catch(err => {
                    console.error(`Fullscreen error: ${err.message} (${err.name})`);
                });
            } else {
                document.exitFullscreen();
            }
        });
    }
}

function handleAttack() {
    if (knight.isAttacking || attackCooldown) return;

    knight.isAttacking = true;
    attackCooldown = true;

    setTimeout(() => {
        knight.isAttacking = false;
        // Cooldown might be longer than animation if needed, but here they are linked
    }, config.attackDuration);

     // Separate timeout for cooldown if it needs to be longer than animation
     setTimeout(() => {
        attackCooldown = false;
     }, config.attackDuration); // Using same duration for simplicity
}


function updateAnimation() {
    if (knight.isAttacking) {
        knight.currentImage = assets.attack;
    } else if (!knight.onGround) {
        knight.currentImage = assets.jump;
    } else if (Math.abs(knight.vx) > 0.5) { // Use velocity threshold for run
        knight.currentImage = assets.run;
    } else {
        knight.currentImage = assets.idle;
    }
}

function update() {
    // Movement Input Processing (independent of attack state)
    if (keys.KeyA) {
        knight.vx = Math.max(-config.moveSpeed, knight.vx - config.acceleration);
        knight.facingRight = false;
    } else if (keys.KeyD) {
        knight.vx = Math.min(config.moveSpeed, knight.vx + config.acceleration);
        knight.facingRight = true;
    } else {
        // Apply friction only when no movement keys are pressed
        knight.vx *= config.friction;
    }

    // Stop horizontal movement if very slow
    if (Math.abs(knight.vx) < 0.1) {
        knight.vx = 0;
    }

    // Jump (only if on ground and Space is pressed)
    if (keys.Space && knight.onGround) {
        knight.vy = -config.jumpForce;
        knight.onGround = false;
    }

    // Physics
    knight.vy += config.gravity;
    knight.x += knight.vx;
    knight.y += knight.vy;

    // Ground Collision
    const groundCollisionLevel = canvas.height - config.groundLevel;
    if (knight.y + knight.height * knight.scale >= groundCollisionLevel) {
        if (knight.vy >= 0) { // Only reset if falling or still
            knight.y = groundCollisionLevel - knight.height * knight.scale;
            knight.vy = 0;
            knight.onGround = true;
        }
    } else {
        knight.onGround = false;
    }

    // Canvas Boundaries (Horizontal)
    knight.x = Math.max(0, Math.min(canvas.width - knight.width * knight.scale, knight.x));

    // Update Animation State based on current physics/action state
    updateAnimation();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#4a3a3a';
    ctx.fillRect(0, canvas.height - config.groundLevel, canvas.width, config.groundLevel);

    if (knight.currentImage) {
        ctx.save();
        let drawX = knight.x;
        if (!knight.facingRight) {
            ctx.scale(-1, 1);
            drawX = -knight.x - knight.width * knight.scale;
        }
        ctx.drawImage(
            knight.currentImage,
            drawX, knight.y,
            knight.width * knight.scale, knight.height * knight.scale
        );
        ctx.restore();
    } else {
        ctx.fillStyle = 'grey';
        ctx.fillRect(knight.x, knight.y, knight.width * knight.scale, knight.height * knight.scale);
    }

    if (debugInfo) {
        ctx.fillStyle = '#fff';
        ctx.font = '14px Arial';
        ctx.textBaseline = 'top';
        let yOffset = 10;
        const lineHeight = 20;
        ctx.fillText(`X: ${knight.x.toFixed(1)} Y: ${knight.y.toFixed(1)}`, 10, yOffset); yOffset += lineHeight;
        ctx.fillText(`VX: ${knight.vx.toFixed(1)} VY: ${knight.vy.toFixed(1)}`, 10, yOffset); yOffset += lineHeight;
        ctx.fillText(`OnGround: ${knight.onGround}`, 10, yOffset); yOffset += lineHeight;
        let animName = 'loading...';
        if (knight.currentImage && knight.currentImage.src) {
            animName = knight.currentImage.src.split('/').pop();
        }
        ctx.fillText(`Anim: ${animName}`, 10, yOffset); yOffset += lineHeight;
        ctx.fillText(`Attacking: ${knight.isAttacking} (Duration: ${config.attackDuration}ms)`, 10, yOffset); yOffset += lineHeight;
        ctx.fillText(`Cooldown: ${attackCooldown}`, 10, yOffset); yOffset += lineHeight;
        ctx.fillText(`Keys: A:${keys.KeyA} D:${keys.KeyD} Space:${keys.Space}`, 10, yOffset); yOffset += lineHeight;
        ctx.fillText(`Debug: KeyB to toggle`, 10, yOffset); yOffset += lineHeight;
    }
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

async function init() {
    console.log("Initializing game...");
    try {
        resizeCanvas();
        setupInput();
        console.log("Loading images...");
        await preloadImages();
        console.log("Images loaded.");
        resizeCanvas();
        console.log("Starting game loop...");
        requestAnimationFrame(gameLoop);
    } catch (err) {
        console.error('Initialization error:', err);
        ctx.fillStyle = 'red';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Game failed to load. Check console (F12).', canvas.width / 2, canvas.height / 2);
    }
}

window.addEventListener('load', init);