const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

let groundLevel = 0;
const SKELETON_VISUAL_OFFSET_Y = 82;
const PLAYER_ATTACK_DAMAGE = 25;
const SKELETON_ATTACK_DAMAGE = 10;
const KNOCKBACK_FORCE = 10;

class ResourceManager {
    constructor() {
        this.images = new Map();
        this.sounds = new Map();
        this.promises = [];
        this.loadedSuccessfully = true; 
    
    }
    
    loadImage(name, src) {
        const img = new Image();
        img.src = src;
        const promise = new Promise((resolve) => { // We don't use reject so as not to break Promise.all!!!!!!!!!! -_-
            img.onload = () => {
                this.images.set(name, img);
                console.log(`Image ${name} loaded from ${src}`);
                resolve({name, status: 'loaded'});
            };
            img.onerror = () => {
                console.warn(`Failed to load image ${name} from ${src}. It will be unavailable.`);
                resolve({name, status: 'error'}); 
            };
        });
        this.promises.push(promise);
       
    }

    loadSound(name, src) {
        const audio = new Audio(); 
        const promise = new Promise((resolve) => {
            audio.oncanplaythrough = () => {
             this.sounds.set(name, audio);
              console.log(`Sound ${name} loaded from ${src}`);
              resolve({name, status: 'loaded'});
            };
            audio.onerror = () => {
                console.warn(`Failed to load sound ${name} from ${src}. It will be unavailable.`);
                resolve({name, status: 'error'});
            };
            audio.src = src; 
        });
        this.promises.push(promise);
    }

    getImage(name) {
        return this.images.get(name);
    }

    getSound(name) {
        return this.sounds.get(name);
    }

    async loadAll() {
        console.log("Starting resource loading...");
        this.loadImage('playerIdle', './assets/images/Idle.png');
        this.loadImage('playerRun', './assets/images/Run.png');
        this.loadImage('playerAttack1', './assets/images/Attack.png');
        this.loadImage('playerAttack2', './assets/images/Attack2.png');
        this.loadImage('playerJump', './assets/images/Jump.png');

        this.loadImage('skeletonWalk', './assets/images/Skeleton_Walk.png');
        this.loadImage('skeletonAttack', './assets/images/Skeleton_Attack.png');
        this.loadImage('skeletonHit', './assets/images/Skeleton_Take_Hit.png');
        this.loadImage('skeletonDeath', './assets/images/Skeleton_Death.png');

        this.loadImage('dirt', './assets/images/dirt.png');

        this.loadSound('jump', './assets/sounds/jump.mp3');
        this.loadSound('playerAttackSound', './assets/sounds/hit.mp3'); 
        this.loadSound('skeletonImpactSound', './assets/sounds/skeleton_hit.mp3'); 

        const results = await Promise.all(this.promises);
        results.forEach(result => {
            if (result.status === 'error') {
            }
        });

        if (this.images.size === 0 && this.sounds.size === 0 && this.promises.length > 0) {
             console.error("CRITICAL: No resources could be loaded. Check paths and server.");
             this.loadedSuccessfully = false;
        } else if (this.promises.length > 0 && (this.images.size > 0 || this.sounds.size > 0)) {
             console.log("Resource loading phase complete. Some resources might have failed (check warnings).");
        } else if (this.promises.length === 0) {
             console.log("No resources scheduled for loading.");
        }

        if (!this.getImage('playerIdle')) {
            console.error("CRITICAL: Player idle sprite not loaded. Game might not function correctly.");
            this.loadedSuccessfully = false;
        }
         if (!this.getImage('skeletonWalk')) {
            console.error("CRITICAL: Skeleton walk sprite not loaded. Game might not function correctly.");
            this.loadedSuccessfully = false;
        }

        return this.loadedSuccessfully;
    }

    playSound(name, volume = 0.8) {
        const sound = this.getSound(name);
        if (sound) {
            sound.currentTime = 0;
            sound.volume = volume;
            sound.play().catch(error => console.warn(`Error playing sound ${name}: ${error.message}. User interaction might be needed.`));
        } else {
            
        }
    }
}

const resources = new ResourceManager();

class Entity {
    constructor(x, y, width, height, speed, hp, visualOffsetY = 0) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.speed = speed;
        this.hp = hp;
        this.maxHp = hp;
        this.isAlive = true;

        this.velocityX = 0;
        this.velocityY = 0;
        this.gravity = 0.8;
        this.direction = 'left';

        this.currentFrame = 0;
        this.frameTimer = 0;
        this.frameInterval = 100;
        this.spriteInfo = { frameWidth: 120, frameHeight: 80 };

        this.action = 'idle';
        this.isTakingHit = false;
        this.hitTimer = 0;
        this.hitDuration = 300;

        this.isDying = false;
        this.deathAnimationFinished = false;
        this.visualOffsetY = visualOffsetY;
    }

    applyGravity() {
        this.y += this.velocityY;
        this.velocityY += this.gravity;

        const currentGroundLevel = groundLevel - this.height + this.visualOffsetY;
        if (this.y >= currentGroundLevel) {
            this.y = currentGroundLevel;
            this.velocityY = 0;
            if (this.action === 'jump') {
                 this.action = 'idle';
            }
        }
    }

    applyKnockback() {
        this.x += this.velocityX;
        this.velocityX *= 0.8;
        if (Math.abs(this.velocityX) < 0.1) {
            this.velocityX = 0;
        }
    }

    updateHitState(deltaTime) {
        if (this.isTakingHit) {
            this.hitTimer += deltaTime;
            if (this.hitTimer >= this.hitDuration) {
                this.isTakingHit = false;
                this.hitTimer = 0;
                if (this.isAlive) this.action = 'idle';
            }
        }
    }

    updateAnimation(deltaTime, maxFrames) {
        this.frameTimer += deltaTime;
        if (this.frameTimer >= this.frameInterval) {
            this.frameTimer = 0;
            this.currentFrame++;
            if (this.currentFrame >= maxFrames) {
            this.currentFrame = 0;
                if (this.isDying) {
                    this.deathAnimationFinished = true;
                    this.isAlive = false;
                } else if (this.action.includes('attack')) {
                     this.action = 'idle';
                }
                this.currentFrame = this.action === 'idle' || this.action === 'run' || this.action === 'walk' ? this.currentFrame % maxFrames : 0;
            }
        }
    }

    takeDamage(amount, attackerDirection) {
        if (!this.isAlive || this.isDying || this.isTakingHit) return;

        this.hp -= amount;
        this.isTakingHit = true;
        this.hitTimer = 0;

        if (this.hasHitAnimation && resources.getImage(this.spriteNames.hit)) {
             this.action = 'hit';
        }

        this.currentFrame = 0;
        this.frameTimer = 0;

        this.velocityX = attackerDirection === 'right' ? KNOCKBACK_FORCE : -KNOCKBACK_FORCE;
        if(this.y + this.height - this.visualOffsetY >= groundLevel) {
            this.velocityY = -3;
        }

        if (this.hp <= 0) {
            this.hp = 0;
            this.die();
        }
    }

    die() {
        if (!this.isDying) {
            this.isAlive = false;
            this.isDying = true;
            this.currentFrame = 0;
            this.frameTimer = 0;

            if (this.hasDeathAnimation && resources.getImage(this.spriteNames.death)) {
                this.action = 'death';
            } else {
                this.deathAnimationFinished = true;
            }
        }
    }

    getHitbox() {
        return {
            x: this.x,
            y: this.y - this.visualOffsetY,
            width: this.width,
            height: this.height
        };
    }

    getAttackRangeBox() {
        const attackWidth = 60;
        const attackX = this.direction === 'right'
            ? this.x + this.width - 20
            : this.x - attackWidth + 20;
        return {
            x: attackX,
            y: this.y - this.visualOffsetY + this.height / 4,
            width: attackWidth,
            height: this.height / 2
        };
    }

    drawHealthBar(camera) {
        const drawX = this.x - camera.x;
        const drawY = this.y;

        if (this.isAlive || this.isDying) {
            const hpBarWidth = this.width * 0.7;
            const hpBarHeight = 8;
            const hpBarX = drawX + (this.width - hpBarWidth) / 2;
            const barTopY = (this.visualOffsetY > 0) ? drawY - hpBarHeight - 5 : drawY - this.visualOffsetY - hpBarHeight - 5;

            ctx.fillStyle = 'rgba(200, 0, 0, 0.7)';
            ctx.fillRect(hpBarX, barTopY, hpBarWidth, hpBarHeight);
            ctx.fillStyle = 'rgba(0, 200, 0, 0.7)';
            ctx.fillRect(hpBarX, barTopY, hpBarWidth * Math.max(0, this.hp / this.maxHp), hpBarHeight);
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.strokeRect(hpBarX, barTopY, hpBarWidth, hpBarHeight);
        }
    }

    draw(camera, defaultSpriteName = 'playerIdle') {
        if (!this.isAlive && this.deathAnimationFinished) return;

        const spriteImage = resources.getImage(defaultSpriteName);
        const drawX = this.x - camera.x;
        const drawY = this.y;

        if (spriteImage) {
            ctx.save();
            if (this.direction === 'left') {
                ctx.translate(drawX + this.width / 2, 0);
                ctx.scale(-1, 1);
                ctx.drawImage(
                    spriteImage,
                    this.currentFrame * this.spriteInfo.frameWidth, 0, this.spriteInfo.frameWidth, this.spriteInfo.frameHeight,
                    -this.width / 2, drawY, this.width, this.height
                );
            } else {
                ctx.drawImage(
                    spriteImage,
                    this.currentFrame * this.spriteInfo.frameWidth, 0, this.spriteInfo.frameWidth, this.spriteInfo.frameHeight,
                    drawX, drawY, this.width, this.height
                );
            }
            ctx.restore();
        } else {
            ctx.fillStyle = this.constructor === Player ? 'blue' : 'red';
            ctx.fillRect(drawX, drawY - this.visualOffsetY, this.width, this.height);
        }
        this.drawHealthBar(camera);
    }
}

class Player extends Entity {
    constructor(x, y) {
        super(x, y, 200, 250, 7, 100);
        this.isJumping = false;
        this.attackToggle = false;
        this.lastAttackTime = 0;
        this.attackCooldown = 700;
        this.spriteInfo = { frameWidth: 120, frameHeight: 80 };
        this.action = 'idle';
        this.direction = 'right';

        this.spriteNames = {
            idle: 'playerIdle',
            run: 'playerRun',
            jump: 'playerJump',
            attack1: 'playerAttack1',
            attack2: 'playerAttack2',
        };
        this.hasHitAnimation = !!this.spriteNames.hit;
        this.hasDeathAnimation = !!this.spriteNames.death;
    }

    update(deltaTime, keys, game) {
        if (!this.isAlive && this.isDying) {
            this.applyGravity();
            this.applyKnockback();
            let maxFrames = 4;
            if (this.action === 'death' && resources.getImage(this.spriteNames.death)) {
            } else if (this.action === 'death') {
                 this.deathAnimationFinished = true;
            }
            this.updateAnimation(deltaTime, maxFrames);
            return;
        }
        if (!this.isAlive) return;

        this.updateHitState(deltaTime);

        const prevAction = this.action;

        if (!this.isTakingHit) {
            if (keys.right) {
                this.x += this.speed;
                this.direction = 'right';
                if (!this.isJumping && !this.action.includes('attack')) this.action = 'run';
            } else if (keys.left) {
                this.x -= this.speed;
                this.direction = 'left';
                if (!this.isJumping && !this.action.includes('attack')) this.action = 'run';
            } else if (!this.isJumping && !this.action.includes('attack')) {
                this.action = 'idle';
            }

            if (keys.jump && !this.isJumping && (this.y + this.height >= groundLevel) && !this.action.includes('attack')) {
                this.velocityY = -20;
                this.isJumping = true;
                this.action = 'jump';
                resources.playSound('jump');
            }

            if (keys.attack && Date.now() - this.lastAttackTime > this.attackCooldown && !this.isJumping) {
                this.attackToggle = !this.attackToggle;
                this.action = this.attackToggle ? 'attack2' : 'attack1';
                this.lastAttackTime = Date.now();
                this.currentFrame = 0;
                resources.playSound('playerAttackSound');

                const attackBox = this.getAttackRangeBox();
                game.enemies.forEach(enemy => {
                    if (enemy.isAlive && game.checkCollision(attackBox, enemy.getHitbox())) {
                        enemy.takeDamage(PLAYER_ATTACK_DAMAGE, this.direction);
                        resources.playSound('skeletonImpactSound');
                    }
                });
            }
        }

        this.applyGravity();
        this.applyKnockback();

        if (this.y + this.height >= groundLevel && this.isJumping) {
            this.isJumping = false;
            if (this.action === 'jump' && !this.isTakingHit) this.action = 'idle';
        }

        if (this.action !== prevAction || this.action === 'jump') {
            if( !(this.action.includes('attack') && prevAction.includes('attack')) ){
                this.currentFrame = 0;
            }
            this.frameTimer = 0;
        }

       let maxFrames = 4;
if (this.action === 'idle') maxFrames = 10;
else if (this.action === 'jump') maxFrames = 3;
else if (this.action === 'attack1') maxFrames = 4;
else if (this.action === 'attack2') maxFrames = 6;

        this.updateAnimation(deltaTime, maxFrames);
    }

    draw(camera) {
        if (!this.isAlive && this.deathAnimationFinished) return;

        let spriteNameKey = this.action;
        if (this.action === 'hit' && (!this.hasHitAnimation || !resources.getImage(this.spriteNames.hit))) {
            spriteNameKey = 'idle';
        }
        if (this.action === 'death' && (!this.hasDeathAnimation || !resources.getImage(this.spriteNames.death))) {
             if(!this.deathAnimationFinished) console.warn("Player in death action but no death sprite/animation defined or loaded.");
        }

        const currentSpriteName = this.spriteNames[spriteNameKey] || this.spriteNames.idle;
        const spriteImage = resources.getImage(currentSpriteName);

        const drawX = this.x - camera.x;
        const drawY = this.y;

        if (spriteImage) {
            ctx.save();
            if (this.direction === 'left') {
                ctx.translate(drawX + this.width / 2, 0);
                ctx.scale(-1, 1);
                ctx.drawImage(spriteImage,
                    this.currentFrame * this.spriteInfo.frameWidth, 0, this.spriteInfo.frameWidth, this.spriteInfo.frameHeight,
                    -this.width / 2, drawY, this.width, this.height
                );
            } else {
                ctx.drawImage(spriteImage,
                    this.currentFrame * this.spriteInfo.frameWidth, 0, this.spriteInfo.frameWidth, this.spriteInfo.frameHeight,
                    drawX, drawY, this.width, this.height
                );
            }
            ctx.restore();
        } else {
            ctx.fillStyle = 'blue';
            ctx.fillRect(drawX, drawY, this.width, this.height);
        }
        this.drawHealthBar(camera);
    }

    takeDamage(amount, attackerDirection) {
        if (!this.isAlive || this.isDying) return;
        super.takeDamage(amount, attackerDirection);
        if (this.isAlive) {
            resources.playSound('playerDamagedSound');
        }
    }
    die() {
        super.die();
        console.log("Player has died.");
    }
}

class Skeleton extends Entity {
    constructor(x, y) {
        super(x, y, 200, 250, 1.5, 50, SKELETON_VISUAL_OFFSET_Y);
        this.spriteInfo = { frameWidth: 150, frameHeight: 150 };
        this.attackRange = 80;
        this.attackCooldown = 1500;
        this.lastAttackTime = 0;

        this.spriteNames = {
            walk: 'skeletonWalk',
            attack: 'skeletonAttack',
            hit: 'skeletonHit',
            death: 'skeletonDeath'
        };
        this.hasHitAnimation = true;
        this.hasDeathAnimation = true;

        this.maxFramesPerAction = { walk: 3, attack: 7, hit: 3, death: 3 };
        this.action = 'walk';
    }

    update(deltaTime, player, game) {
        if (this.deathAnimationFinished) return;

        if (this.isDying || this.isTakingHit) {
            this.applyGravity();
            this.applyKnockback();
            let currentMaxFramesKey = this.action;
            if (!this.spriteNames[currentMaxFramesKey] || !resources.getImage(this.spriteNames[currentMaxFramesKey])) {
                 if (this.isDying) this.deathAnimationFinished = true;
                 if (this.isTakingHit) { /* isTakingHit сбросится по таймеру в updateHitState */ }
            } else {
                this.updateAnimation(deltaTime, (this.maxFramesPerAction[currentMaxFramesKey] || 0) + 1);
            }

            if(this.action === 'hit' && this.isTakingHit) {
                const hitAnimFinished = this.currentFrame >= this.maxFramesPerAction.hit;
                if(hitAnimFinished || !resources.getImage(this.spriteNames.hit)) { 
                    if (this.isAlive) this.action = 'walk';
                    this.currentFrame = 0;
                }
            }
            this.updateHitState(deltaTime);

            return;
        }

        this.applyGravity();
        this.applyKnockback();
        this.updateHitState(deltaTime); 

        if (!player.isAlive) {
            this.action = 'walk';
            if (resources.getImage(this.spriteNames.walk)) {
                this.updateAnimation(deltaTime, this.maxFramesPerAction.walk + 1);
            }
            return;
        }

        const distToPlayer = Math.abs((this.x + this.width / 2) - (player.x + player.width / 2));
        const dyPlayer = Math.abs((this.y + this.height / 2) - (player.y + player.height / 2));

        if (player.x < this.x) this.direction = 'left';
        else this.direction = 'right';

        const prevAction = this.action;

        if (!this.isTakingHit) { 
            if (distToPlayer <= this.attackRange && dyPlayer < this.height / 1.5) {
                if (Date.now() - this.lastAttackTime > this.attackCooldown) {
                    this.action = 'attack';
                    this.lastAttackTime = Date.now();
                } else if (this.action !== 'attack') {
                    this.action = 'walk';
                }
            } else {
                this.action = 'walk';
                if (this.direction === 'left') this.x -= this.speed;
                else this.x += this.speed;
            }
        }

        if (this.action === 'attack' && resources.getImage(this.spriteNames.attack) && this.currentFrame === Math.floor(this.maxFramesPerAction.attack / 2)) {
            const attackBox = this.getAttackRangeBox();
            if (game.checkCollision(attackBox, player.getHitbox()) && player.isAlive) {
                player.takeDamage(SKELETON_ATTACK_DAMAGE, this.direction);
            }
        }

        if (this.action !== prevAction) {
            this.currentFrame = 0;
            this.frameTimer = 0;
        }
        if (resources.getImage(this.spriteNames[this.action])) {
             this.updateAnimation(deltaTime, (this.maxFramesPerAction[this.action] || 0) + 1);
        } else if (this.action === 'walk' && resources.getImage(this.spriteNames.walk)) { 
            this.updateAnimation(deltaTime, (this.maxFramesPerAction.walk || 0) + 1);
        }
    }

    draw(camera) {
        if (!this.isAlive && this.deathAnimationFinished) return;

        let currentSpriteName = this.spriteNames[this.action] || this.spriteNames.walk;
        if ((this.action === 'hit' && !resources.getImage(this.spriteNames.hit)) ||
            (this.action === 'death' && !resources.getImage(this.spriteNames.death))) {
            currentSpriteName = this.spriteNames.walk;
        }
        const spriteImage = resources.getImage(currentSpriteName);

        const drawX = this.x - camera.x;
        const drawY = this.y;

        if (spriteImage) {
            ctx.save();
            if (this.direction === 'left') {
                ctx.translate(drawX + this.width / 2, 0);
                ctx.scale(-1, 1);
                ctx.drawImage(spriteImage, 
                    this.currentFrame * this.spriteInfo.frameWidth, 0, this.spriteInfo.frameWidth, this.spriteInfo.frameHeight,
                    -this.width / 2, drawY, this.width, this.height
                );
            } else {
                ctx.drawImage(spriteImage,
                    this.currentFrame * this.spriteInfo.frameWidth, 0, this.spriteInfo.frameWidth, this.spriteInfo.frameHeight,
                    drawX, drawY, this.width, this.height
                );
            }
            ctx.restore();
        } else {
            ctx.fillStyle = 'darkred';
            ctx.fillRect(drawX, drawY - this.visualOffsetY, this.width, this.height);
        }
        this.drawHealthBar(camera);
    }
    takeDamage(amount, attackerDirection) {
        super.takeDamage(amount, attackerDirection);
    }
    die() {
        super.die();
        resources.playSound('skeletonDeathSound');
    }
}

class Camera {
    constructor(x, y, canvasWidth, canvasHeight) {
        this.x = x;
        this.y = y;
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
    }

    follow(target) {
        this.x = target.x - this.canvasWidth / 2 + target.width / 2;
    }
}

const levels = [
    { enemies: [{ type: 'skeleton', x: 800 }], playerStart: { x: 100 } },
    { enemies: [{ type: 'skeleton', x: 700 }, { type: 'skeleton', x: 1000 }], playerStart: { x: 100 } },
    { enemies: [{ type: 'skeleton', x: 600 }, { type: 'skeleton', x: 850 }, { type: 'skeleton', x: 1100 }], playerStart: { x: 100 } }
];

class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = false;

        this.player = null;
        this.enemies = [];
        this.camera = new Camera(0, 0, this.canvas.width, this.canvas.height);
        this.keys = { right: false, left: false, attack: false, jump: false };

        this.lastTime = 0;
        this.currentLevelIndex = 0;
        this.gameState = 'loading';

        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        this.setupInputHandlers();
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        groundLevel = this.canvas.height - 60;
        if (this.camera) {
            this.camera.canvasWidth = this.canvas.width;
            this.camera.canvasHeight = this.canvas.height;
        }
        if (this.player) {
            this.player.y = groundLevel - this.player.height + this.player.visualOffsetY;
        }
        this.enemies.forEach(enemy => {
            enemy.y = groundLevel - enemy.height + enemy.visualOffsetY;
        });
    }

    setupInputHandlers() {
        window.addEventListener('keydown', e => {
            const k = e.key.toLowerCase();
            if (k === 'd' || k === 'в') this.keys.right = true;
            if (k === 'a' || k === 'ф') this.keys.left = true;
            if (k === ' ') { e.preventDefault(); this.keys.jump = true; }
            if (k === 'r' && (this.gameState === 'gameOver' || this.gameState === 'gameWon')) {
                this.restartGame();
            }
        });
        window.addEventListener('keyup', e => {
            const k = e.key.toLowerCase();
            if (k === 'd' || k === 'в') this.keys.right = false;
            if (k === 'a' || k === 'ф') this.keys.left = false;
            if (k === ' ') this.keys.jump = false;
        });
        this.canvas.addEventListener('mousedown', e => {
            if (e.button === 0 && this.gameState === 'playing') this.keys.attack = true;
        });
        this.canvas.addEventListener('mouseup', e => {
            if (e.button === 0) this.keys.attack = false;
        });
    }

    loadLevel(levelIndex) {
        if (levelIndex >= levels.length) {
            this.gameState = 'gameWon';
            return;
        }
        this.currentLevelIndex = levelIndex;
        const levelData = levels[levelIndex];

        const playerY = groundLevel - 250;
        this.player = new Player(levelData.playerStart.x, playerY);

        this.enemies = [];
        levelData.enemies.forEach(enemyData => {
            const enemyVisualHeight = 250;
            const enemyY = groundLevel - enemyVisualHeight + SKELETON_VISUAL_OFFSET_Y;

            if (enemyData.type === 'skeleton') {
                this.enemies.push(new Skeleton(enemyData.x, enemyY));
            }
        });
        this.gameState = 'playing';
        if (this.player) this.camera.follow(this.player);
    }

    update(deltaTime) {
        if (this.gameState !== 'playing' || !this.player) return;

        this.player.update(deltaTime, this.keys, this);
        this.enemies.forEach(enemy => {
             if (enemy.isAlive || enemy.isDying) {
                enemy.update(deltaTime, this.player, this);
            }
        });

        this.enemies = this.enemies.filter(enemy => enemy.isAlive || !enemy.deathAnimationFinished);

        this.camera.follow(this.player);

        if (!this.player.isAlive && this.player.deathAnimationFinished) {
            this.gameState = 'gameOver';
        } else if (this.enemies.every(enemy => !enemy.isAlive && enemy.deathAnimationFinished)) {
            this.gameState = 'levelComplete';
            setTimeout(() => {
                if (this.gameState === 'levelComplete') { // Доп. проверка, если состояние изменилось
                    this.loadLevel(this.currentLevelIndex + 1);
                }
            }, 2000);
        }
    }

    drawGround() {
        const dirtImage = resources.getImage('dirt');
        if (dirtImage) {
            for (let i = -1; i < this.canvas.width / 64 + 2; i++) {
                this.ctx.drawImage(dirtImage,
                    i * 64 - (this.camera.x % 64), groundLevel, 64, 64);
            }
        } else {
            this.ctx.fillStyle = '#553311';
            this.ctx.fillRect(0, groundLevel, this.canvas.width, this.canvas.height - groundLevel);
        }
    }

    drawUI() {
        this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
        this.ctx.fillRect(10,10,250,100);

        this.ctx.fillStyle = 'white';
        this.ctx.font = '20px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`Рівень: ${this.currentLevelIndex + 1}`, 20, 35);
        const playerHp = this.player ? this.player.hp : 0;
        const playerMaxHp = this.player ? this.player.maxHp : 100;
        this.ctx.fillText(`Гравець HP: ${playerHp} / ${playerMaxHp}`, 20, 60);

        const enemiesAlive = this.enemies.filter(e => e.isAlive).length;
        this.ctx.fillText(`Ворогів: ${enemiesAlive}`, 20, 85);

        let message = '';
        let subMessage = '';
        if (this.gameState === 'loading') {
            message = 'Завантаження ресурсів...';
        } else if (this.gameState === 'error') {
            message = 'Помилка завантаження!';
            subMessage = 'Перевірте консоль та шляхи до файлів.';
        } else if (this.gameState === 'levelComplete' && levels.length > 0 ) {
             if (this.currentLevelIndex + 1 < levels.length) {
                message = `Рівень ${this.currentLevelIndex + 1} пройдено!`;
                subMessage = 'Наступний рівень...';
            }
        } else if (this.gameState === 'gameOver') {
            message = 'ГРУ СКІНЧЕНО!';
            subMessage = "Натисніть 'R' для рестарту";
        } else if (this.gameState === 'gameWon') {
            message = 'ПЕРЕМОГА!';
            subMessage = "Ви пройшли всі рівні! 'R' для рестарту.";
        }

        if (message) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, this.canvas.height / 2 - 60, this.canvas.width, 120);
            this.ctx.fillStyle = this.gameState === 'gameOver' ? 'red' : 'white';
            this.ctx.font = '48px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(message, this.canvas.width / 2, this.canvas.height / 2);
            if (subMessage) {
                this.ctx.fillStyle = 'white';
                this.ctx.font = '24px Arial';
                this.ctx.fillText(subMessage, this.canvas.width / 2, this.canvas.height / 2 + 40);
            }
        }
    }

    draw() {
        this.ctx.fillStyle = '#87ceeb';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.drawGround();

        if (this.player) {
            this.player.draw(this.camera);
        }
        this.enemies.forEach(enemy => {
            enemy.draw(this.camera);
        });
    }

    checkCollision(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }

    gameLoop(timestamp) {
        const deltaTime = Math.min(timestamp - this.lastTime, 50);
        this.lastTime = timestamp;

        if (this.gameState === 'playing') {
            this.update(deltaTime || 0);
        }
        this.draw();
        this.drawUI();

        requestAnimationFrame(ts => this.gameLoop(ts));
    }

    async start() {
        this.gameState = 'loading';
        this.gameLoop(0);

        const loadedOk = await resources.loadAll();
        if (!loadedOk) {
            this.gameState = 'error';
            console.error("Game cannot start due to critical resource loading failure.");
            return;
        }
        this.loadLevel(0);
    }

    restartGame() {
        this.keys = { right: false, left: false, attack: false, jump: false };
        this.currentLevelIndex = 0;
        this.loadLevel(0);
    }
}

window.onload = () => {
    const game = new Game(canvas);
    game.start();
};