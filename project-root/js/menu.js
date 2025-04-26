// Переходи по кнопках
document.getElementById('playBtn').addEventListener('click', () => {
    window.location.href = 'game.html';
  });
  
  document.getElementById('settingsBtn').addEventListener('click', () => {
    window.location.href = 'settings.html';
  });
  
  document.getElementById('exitBtn').addEventListener('click', () => {
    window.open('https://google.com', '_self'); // Або можна закрити вкладку window.close()
  });
   