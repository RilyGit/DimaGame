// Инициализация Canvas
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Конфигурация игры
const config = {
  gravity: 0.6,
  groundLevel: 60,
  playerScale: 2,
  moveSpeed: 8, // Максимальная скорость
  jumpForce: 16,
  // !!! ВАЖНО: Подбери это значение так, чтобы оно соответствовало
  // реальной длительности анимации в файле __Attack.gif (в миллисекундах)
  attackDuration: 100, // Попробуй увеличить (500, 600, 700...), если анимация обрывается
  acceleration: 0.7, // Ускорение при движении
  friction: 0.85    // Трение (ближе к 1 = меньше трения)
};

// Объект персонажа
const knight = {
  x: 100,
  y: 400,
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

// Ресурсы игры (Image объекты)
const assets = {
  idle: null,
  run: null,
  jump: null,
  attack: null
};
// Пути к файлам
const assetPaths = {
  idle: 'images/__Idle.gif',
  run: 'images/__Run.gif',
  jump: 'images/__Jump.gif',
  attack: 'images/__Attack.gif'
};

// Состояние управления
const keys = {
  KeyA: false, // Используем коды клавиш (не зависят от раскладки)
  KeyD: false,
  Space: false
};

// Системные переменные
let attackCooldown = false;
let debugInfo = true;

// Настройка Canvas
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  if (knight) {
      knight.y = canvas.height - config.groundLevel - knight.height * knight.scale;
  }
}
window.addEventListener('resize', resizeCanvas);

// Загрузка изображений
function preloadImages() {
  const promises = Object.entries(assetPaths).map(([key, src]) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        assets[key] = img;
        if (key === 'idle' && !knight.currentImage) { // Устанавливаем Idle только если еще не установлено
          knight.currentImage = img;
        }
        resolve(img);
      };
      img.onerror = () => {
        console.error(`Ошибка загрузки: ${src}`);
        reject(new Error(`Failed to load image: ${src}`));
      };
    });
  });
  return Promise.all(promises);
}

// Обработчики ввода
function setupInput() {
  window.addEventListener('keydown', (e) => {
    // Используем e.code для независимости от раскладки
    const code = e.code;
    // console.log("Keydown code:", code); // Для отладки кодов клавиш

    switch(code) {
      case 'KeyA': keys.KeyA = true; break;
      case 'KeyD': keys.KeyD = true; break;
      case 'Space':
        if (!keys.Space && knight.onGround) {
          keys.Space = true;
          e.preventDefault();
        }
        break;
      case 'KeyF': // Используем KeyF для полноэкранного режима
        const fullscreenBtn = document.getElementById('fullscreenBtn');
        if(fullscreenBtn) fullscreenBtn.click();
        break;
    }
  });

  window.addEventListener('keyup', (e) => {
    // Используем e.code для независимости от раскладки
    const code = e.code;
    switch(code) {
      case 'KeyA': keys.KeyA = false; break;
      case 'KeyD': keys.KeyD = false; break;
      case 'Space': keys.Space = false; break;
    }
  });

  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0 && !attackCooldown && knight.onGround) {
        handleAttack();
    }
  });

  const fullscreenBtn = document.getElementById('fullscreenBtn');
  if (fullscreenBtn) {
      fullscreenBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
          canvas.requestFullscreen().catch(err => {
              console.error(`Ошибка входа в полноэкранный режим: ${err.message} (${err.name})`);
          });
        } else {
          document.exitFullscreen();
        }
      });
  }
}

// Логика атаки
function handleAttack() {
  if (knight.isAttacking || attackCooldown) return;

  knight.isAttacking = true;
  attackCooldown = true;
  knight.currentImage = assets.attack;

  // Сброс состояния атаки ПОСЛЕ завершения ее длительности
  setTimeout(() => {
    knight.isAttacking = false;
    // Сброс перезарядки (можно сделать отдельный таймаут для перезарядки, если она дольше анимации)
    attackCooldown = false;
    // НЕ вызываем updateAnimation здесь! Основной цикл сам подхватит изменение isAttacking.
  }, config.attackDuration); // Используем настроенную длительность
}

// Обновление анимации
function updateAnimation() {
  // --- Плавность анимации ---
  // Плавность текущих анимаций зависит от качества исходных GIF-файлов.
  // Для большей плавности и контроля обычно используют спрайт-листы вместо GIF.

  // Атака имеет наивысший приоритет
  if (knight.isAttacking) {
    // Убедимся, что установлена анимация атаки (на случай, если атака началась только что)
    if (knight.currentImage !== assets.attack) {
         knight.currentImage = assets.attack;
    }
    return; // Если атакуем, другие анимации не проверяем
  }

  // Прыжок (если не на земле)
  if (!knight.onGround) {
    knight.currentImage = assets.jump;
  }
  // На земле:
  else {
    // Бег (если нажаты KeyA или KeyD)
    if (keys.KeyA || keys.KeyD) {
      knight.currentImage = assets.run;
    }
    // Покой (если не нажаты клавиши движения)
    else {
      knight.currentImage = assets.idle;
    }
  }
}

// Игровая логика
function update() {
  // ---- Движение (только если не атакуем) ----
  if (!knight.isAttacking) {
      // Используем коды клавиш для проверки
      if (keys.KeyA) {
        knight.vx = Math.max(-config.moveSpeed, knight.vx - config.acceleration);
        knight.facingRight = false;
      }
      if (keys.KeyD) {
        knight.vx = Math.min(config.moveSpeed, knight.vx + config.acceleration);
        knight.facingRight = true;
      }

      // Трение (если не нажаты KeyA/KeyD)
      if (!keys.KeyA && !keys.KeyD) {
        knight.vx *= config.friction;
        if (Math.abs(knight.vx) < 0.2) {
            knight.vx = 0;
        }
      }
  } else {
      // Легкое замедление во время атаки (опционально)
       knight.vx *= config.friction * 0.9; // Усиленное трение во время атаки
        if (Math.abs(knight.vx) < 0.2) {
            knight.vx = 0;
        }
  }

  // Прыжок (только если на земле, нажат пробел и не атакуем)
  // Используем код клавиши Space
  if (keys.Space && knight.onGround && !knight.isAttacking) {
    knight.vy = -config.jumpForce;
    knight.onGround = false;
  }

  // ---- Физика ----
  knight.vy += config.gravity;
  knight.x += knight.vx;
  knight.y += knight.vy;

  // ---- Коллизии и Границы ----
  knight.x = Math.max(0, Math.min(canvas.width - knight.width * knight.scale, knight.x));

  const groundCollisionLevel = canvas.height - config.groundLevel;
  if (knight.y + knight.height * knight.scale >= groundCollisionLevel) {
    if (knight.vy >= 0) {
        knight.y = groundCollisionLevel - knight.height * knight.scale;
        knight.vy = 0;
        if (!knight.onGround) {
            knight.onGround = true;
        }
    }
  } else {
      knight.onGround = false;
  }

  // ---- Анимация ----
  updateAnimation();
}

// Отрисовка
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Земля
  ctx.fillStyle = '#4a3a3a';
  ctx.fillRect(0, canvas.height - config.groundLevel, canvas.width, config.groundLevel);

  // Персонаж
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

  // Отладочная информация
  if (debugInfo) {
    ctx.fillStyle = '#fff';
    ctx.font = '14px Arial';
    ctx.textBaseline = 'top';
    let yOffset = 10;
    const lineHeight = 20;
    ctx.fillText(`X: ${knight.x.toFixed(1)}  Y: ${knight.y.toFixed(1)}`, 10, yOffset); yOffset += lineHeight;
    ctx.fillText(`VX: ${knight.vx.toFixed(1)} VY: ${knight.vy.toFixed(1)}`, 10, yOffset); yOffset += lineHeight;
    ctx.fillText(`OnGround: ${knight.onGround}`, 10, yOffset); yOffset += lineHeight;
    let animName = 'loading...';
    if (knight.currentImage && knight.currentImage.src) {
        animName = knight.currentImage.src.split('/').pop(); // Показываем имя файла
    }
    ctx.fillText(`Anim: ${animName}`, 10, yOffset); yOffset += lineHeight;
    ctx.fillText(`Attacking: ${knight.isAttacking} (Duration: ${config.attackDuration}ms)`, 10, yOffset); yOffset += lineHeight;
    ctx.fillText(`Cooldown: ${attackCooldown}`, 10, yOffset); yOffset += lineHeight;
    // Показываем состояние клавиш по их кодам
    ctx.fillText(`Keys: A:${keys.KeyA} D:${keys.KeyD} Space:${keys.Space}`, 10, yOffset); yOffset += lineHeight;
  }
}

// Игровой цикл
function gameLoop(timestamp) {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Инициализация
async function init() {
  console.log("Initializing game...");
  try {
    resizeCanvas();
    setupInput();
    console.log("Loading images...");
    await preloadImages();
    console.log("Images loaded.");
    resizeCanvas(); // Обновляем позицию Y после загрузки
    console.log("Starting game loop...");
    requestAnimationFrame(gameLoop);
  } catch (err) {
    console.error('Ошибка инициализации:', err);
    ctx.fillStyle = 'red';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Ошибка загрузки игры. Смотрите консоль (F12).', canvas.width / 2, canvas.height / 2);
  }
}

// Запуск
window.addEventListener('load', init);