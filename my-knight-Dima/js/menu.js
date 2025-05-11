// Загружаем звук кнопки
const blipSound = new Audio('assets/sounds/blip.mp3');

// Учитываем настройки звука из localStorage
function playBlip() {
  const soundOn = localStorage.getItem('soundOn') === 'true';
  const volume = parseFloat(localStorage.getItem('volume') || 50) / 100;

  if (soundOn) {
    blipSound.volume = volume;
    blipSound.currentTime = 0; // Чтобы можно было быстро повторно нажимать
    blipSound.play().catch(err => {
      console.warn('Не удалось воспроизвести звук:', err);
    });
  }
}

// Навешиваем события на кнопки
document.getElementById('playBtn').addEventListener('click', () => {
  playBlip();
  setTimeout(() => {
    window.location.href = 'game.html';
  }, 150);
});

document.getElementById('settingsBtn').addEventListener('click', () => {
  playBlip();
  setTimeout(() => {
    window.location.href = 'settings.html';
  }, 150);
});

document.getElementById('exitBtn').addEventListener('click', () => {
  playBlip();
  setTimeout(() => {
    window.open('https://google.com', '_self'); // Или window.close()
  }, 150);
});
