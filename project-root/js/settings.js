 const soundToggle = document.getElementById('soundToggle');
const volumeSlider = document.getElementById('volumeSlider');
const backBtn = document.getElementById('backBtn');
 let soundOn = localStorage.getItem('soundOn') === 'true'; 
 let volume = localStorage.getItem('volume') || 50; 
 soundToggle.textContent = soundOn ? '🔊' : '🔇';
 volumeSlider.value = volume;
 soundToggle.addEventListener('click', () => {
  soundOn = !soundOn;
   soundToggle.textContent = soundOn ? '🔊' : '🔇';
  localStorage.setItem('soundOn', soundOn); 
 });
 volumeSlider.addEventListener('input', () => {
  localStorage.setItem('volume', volumeSlider.value); 
 });

 backBtn.addEventListener('click', () => {
  window.location.href = 'index.html'; 
});
