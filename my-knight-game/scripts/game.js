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
  attackDuration: 400, // Длительность атаки в мс
  acceleration: 0.8, // Ускорение при движении
  friction: 0.85    // Трение (ближе к 1 = меньше трения)
};

// Объект персонажа
const knight = {
  x: 100,
  y: 400, // Начальная Y позиция (будет скорректирована в resizeCanvas)
  width: 64, // Ширина исходного спрайта
  height: 64, // Высота исходного спрайта
  vx: 0,  // Горизонтальная скорость
  vy: 0,  // Вертикальная скорость
  onGround: false,
  currentImage: null, // Будет установлено после загрузки Idle
  scale: config.playerScale,
  isAttacking: false,
  facingRight: true
};

// Ресурсы игры (здесь будут храниться загруженные Image объекты)
const assets = {
  idle: null,
  run: null,
  jump: null,
  attack: null
};
// Пути к файлам для загрузки
const assetPaths = {
  idle: 'images/__Idle.gif',
  run: 'images/__Run.gif',
  jump: 'images/__Jump.gif',
  attack: 'images/__Attack.gif'
};

// Состояние управления
const keys = {
  a: false,
  d: false,
  space: false
};

// Системные переменные
let attackCooldown = false; // Флаг перезарядки атаки
let debugInfo = true;      // Показывать ли отладочную информацию

// Настройка Canvas
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  // Пересчитываем позицию Y после изменения размера окна, чтобы персонаж стоял на земле
  // Делаем это только если игра уже инициализирована (knight не null)
  if (knight) {
      knight.y = canvas.height - config.groundLevel - knight.height * knight.scale;
  }
}
window.addEventListener('resize', resizeCanvas);

// Загрузка изображений
function preloadImages() {
  // Создаем массив промисов для каждой картинки
  const promises = Object.entries(assetPaths).map(([key, src]) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        assets[key] = img; // Сохраняем загруженный Image объект в assets
        // Устанавливаем Idle как стартовую картинку после ее загрузки
        if (key === 'idle') {
          knight.currentImage = img;
        }
        // console.log(`Image loaded: ${src}`); // Для отладки загрузки
        resolve(img);
      };
      img.onerror = () => {
        console.error(`Ошибка загрузки: ${src}`);
        reject(new Error(`Failed to load image: ${src}`));
      };
    });
  });
  // Promise.all ждет завершения всех промисов в массиве
  return Promise.all(promises);
}

// Обработчики ввода
function setupInput() {
  // Клавиатура
  window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    switch(key) {
      case 'a': keys.a = true; break;
      case 'd': keys.d = true; break;
      case ' ':
        // Разрешаем прыжок только если на земле и пробел еще не зажат
        if (!keys.space && knight.onGround) {
          keys.space = true; // Флаг нажатия пробела (сам прыжок в update)
          e.preventDefault(); // Предотвращаем прокрутку страницы
        }
        break;
      case 'f':
        const fullscreenBtn = document.getElementById('fullscreenBtn');
        if(fullscreenBtn) fullscreenBtn.click(); // Имитируем клик по кнопке
        break;
    }
  });

  window.addEventListener('keyup', (e) => {
     const key = e.key.toLowerCase();
    switch(key) {
      case 'a': keys.a = false; break;
      case 'd': keys.d = false; break;
      case ' ': keys.space = false; break; // Сбрасываем флаг при отпускании
    }
  });

  // Мышь
  canvas.addEventListener('mousedown', (e) => {
    // Атака левой кнопкой мыши (button 0), если нет перезарядки
    if (e.button === 0 && !attackCooldown && knight.onGround) { // Атаковать можно только на земле? (опционально)
        handleAttack();
    }
  });

  // Полноэкранный режим (кнопка должна быть в HTML)
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
  } else {
      // console.warn("Кнопка с ID 'fullscreenBtn' не найдена.");
  }
}

// Логика атаки
function handleAttack() {
  // Если уже атакуем или перезарядка, ничего не делаем
  if (knight.isAttacking || attackCooldown) return;

  knight.isAttacking = true;
  attackCooldown = true; // Ставим перезарядку сразу
  knight.currentImage = assets.attack; // Назначаем анимацию атаки

  // Сбрасываем флаг атаки и перезарядки через заданное время
  // **НЕ вызываем здесь updateAnimation()**
  setTimeout(() => {
    knight.isAttacking = false;
    // Перезарядку можно сбрасывать чуть позже самой анимации, если нужно
    attackCooldown = false;
  }, config.attackDuration);
}

// Обновление анимации (вызывается из update)
function updateAnimation() {
  // Если персонаж атакует, анимация атаки имеет приоритет
  if (knight.isAttacking) {
    // Убедимся, что текущая анимация - атака. Это нужно, если атака началась в этом кадре.
    if (knight.currentImage !== assets.attack) {
        knight.currentImage = assets.attack;
    }
    return; // Выходим, чтобы не переключить на другую анимацию
  }

  // Если не на земле - анимация прыжка
  if (!knight.onGround) {
    knight.currentImage = assets.jump;
  }
  // Иначе (если на земле):
  // Если нажаты A или D - анимация бега
  else if (keys.a || keys.d) {
    knight.currentImage = assets.run;
  }
  // Иначе (на земле, не атакует, не бежит) - анимация покоя
  else {
    knight.currentImage = assets.idle;
  }
}

// Игровая логика (обновление состояния)
function update() {
  // ---- Обработка ввода и движения ----

  // Горизонтальное движение (только если не атакуем)
  if (!knight.isAttacking) {
      if (keys.a) {
        knight.vx = Math.max(-config.moveSpeed, knight.vx - config.acceleration);
        knight.facingRight = false;
      }
      if (keys.d) {
        knight.vx = Math.min(config.moveSpeed, knight.vx + config.acceleration);
        knight.facingRight = true;
      }

      // Трение (только если не нажаты A/D и не атакуем)
      if (!keys.a && !keys.d) {
        knight.vx *= config.friction;
        if (Math.abs(knight.vx) < 0.2) {
            knight.vx = 0;
        }
      }
  } else {
      // Можно добавить легкое замедление во время атаки, если нужно
       knight.vx *= config.friction;
        if (Math.abs(knight.vx) < 0.2) {
            knight.vx = 0;
        }
  }

  // Прыжок (только если на земле, нажат пробел и не атакуем)
  if (keys.space && knight.onGround && !knight.isAttacking) {
    knight.vy = -config.jumpForce;
    knight.onGround = false;
    // Не сбрасываем keys.space здесь, используем keyup для этого
  }

  // ---- Физика ----
  knight.vy += config.gravity; // Применяем гравитацию
  knight.x += knight.vx;     // Обновляем позицию по X
  knight.y += knight.vy;     // Обновляем позицию по Y

  // ---- Коллизии и Границы ----

  // Границы экрана по горизонтали
  knight.x = Math.max(0, Math.min(canvas.width - knight.width * knight.scale, knight.x));

  // Столкновение с землей
  const groundCollisionLevel = canvas.height - config.groundLevel;
  if (knight.y + knight.height * knight.scale >= groundCollisionLevel) {
    // Если персонаж ниже или на уровне земли
    if (knight.vy >= 0) { // Проверяем, что он падает или стоит, а не пролетает снизу вверх
        knight.y = groundCollisionLevel - knight.height * knight.scale; // Ставим точно на землю
        knight.vy = 0; // Обнуляем вертикальную скорость
        if (!knight.onGround) { // Если только что приземлились
            knight.onGround = true;
        }
    }
  } else {
      // Если персонаж в воздухе
      knight.onGround = false;
  }

  // ---- Анимация ----
  updateAnimation(); // Выбираем нужную анимацию на основе текущего состояния
}

// Отрисовка
function draw() {
  // Очистка холста
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Фон (опционально)
  // ctx.fillStyle = '#87CEEB';
  // ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Земля
  ctx.fillStyle = '#4a3a3a';
  ctx.fillRect(0, canvas.height - config.groundLevel, canvas.width, config.groundLevel);

  // Персонаж
  if (knight.currentImage) { // Рисуем, только если есть текущая картинка
      ctx.save(); // Сохраняем состояние контекста

      // Рассчитываем позицию для отрисовки с учетом поворота
      let drawX = knight.x;
      if (!knight.facingRight) {
        ctx.scale(-1, 1); // Отражаем по горизонтали
        drawX = -knight.x - knight.width * knight.scale; // Корректируем X
      }

      // Отрисовка текущего кадра анимации
      ctx.drawImage(
        knight.currentImage,
        drawX,
        knight.y,
        knight.width * knight.scale,
        knight.height * knight.scale
      );

      ctx.restore(); // Восстанавливаем контекст
  } else {
      // Можно нарисовать что-то, если картинка еще не загружена
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
        animName = knight.currentImage.src.split('/').pop().split('.')[0]; // Получаем имя файла без пути и расширения
    }
    ctx.fillText(`Anim: ${animName}`, 10, yOffset); yOffset += lineHeight;
    ctx.fillText(`Attacking: ${knight.isAttacking}`, 10, yOffset); yOffset += lineHeight;
    ctx.fillText(`Cooldown: ${attackCooldown}`, 10, yOffset); yOffset += lineHeight;
    ctx.fillText(`Keys: A:${keys.a} D:${keys.d} Space:${keys.space}`, 10, yOffset); yOffset += lineHeight;
  }
}

// Игровой цикл
let lastTime = 0;
function gameLoop(timestamp) {
    // Можно добавить расчет delta time для более плавной физики, но пока оставим так
    // const deltaTime = timestamp - lastTime;
    // lastTime = timestamp;
    // update(deltaTime); // Передаем deltaTime в update

    update(); // Обновление логики
    draw();   // Отрисовка кадра

    requestAnimationFrame(gameLoop); // Запрос следующего кадра
}

// Инициализация
async function init() {
  console.log("Initializing game...");
  try {
    resizeCanvas(); // Устанавливаем размер холста
    setupInput();   // Настраиваем ввод
    console.log("Loading images...");
    await preloadImages(); // Ждем загрузки всех изображений
    console.log("Images loaded.");
    resizeCanvas(); // Устанавливаем размер и позицию Y еще раз после загрузки
    console.log("Starting game loop...");
    requestAnimationFrame(gameLoop); // Запускаем игровой цикл
  } catch (err) {
    console.error('Ошибка инициализации:', err);
    // Вывод ошибки на холст
    ctx.fillStyle = 'red';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Ошибка загрузки игры. Смотрите консоль (F12).', canvas.width / 2, canvas.height / 2);
  }
}

// Запуск после полной загрузки страницы
window.addEventListener('load', init);