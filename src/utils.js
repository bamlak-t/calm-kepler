export function showVictory(title, message, onPlayAgain) {
  const modal = document.getElementById('victory-screen');
  document.getElementById('victory-title').textContent = title;
  document.getElementById('victory-sub').textContent = message;
  modal.style.display = 'flex';
  
  const btn = document.getElementById('victory-play-again');
  // clear old listeners
  const newBtn = btn.cloneNode(true);
  btn.replaceWith(newBtn);
  newBtn.addEventListener('click', () => {
    modal.style.display = 'none';
    if (onPlayAgain) onPlayAgain();
  });
}

export function showHotseat(message, onReady) {
  const modal = document.getElementById('hotseat-screen');
  document.getElementById('hotseat-msg').textContent = message;
  modal.style.display = 'flex';
  
  const btn = document.getElementById('hotseat-ready');
  const newBtn = btn.cloneNode(true);
  btn.replaceWith(newBtn);
  newBtn.addEventListener('click', () => {
    modal.style.display = 'none';
    if (onReady) onReady();
  });
}

export function showAlert(title, message) {
  const modal = document.getElementById('alert-modal');
  document.getElementById('alert-title').textContent = title;
  document.getElementById('alert-msg').innerHTML = message;
  modal.style.display = 'flex';
  
  const btn = document.getElementById('alert-close');
  const newBtn = btn.cloneNode(true);
  btn.replaceWith(newBtn);
  newBtn.addEventListener('click', () => {
    modal.style.display = 'none';
  });
}
