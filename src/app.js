// src/app.js — Main application orchestrator
import { SleuthsGame } from './games/sleuths.js';
import { EvidenceGame } from './games/evidence.js';
import { CipherGame } from './games/cipher.js';
import { WhispersGame } from './games/whispers.js';

// ---------- Tab Navigation ----------
const tabs = document.querySelectorAll('.nav-tab');
const panels = document.querySelectorAll('.game-panel');

function switchTab(gameName) {
  tabs.forEach(t => {
    const active = t.dataset.game === gameName;
    t.classList.toggle('active', active);
    t.setAttribute('aria-selected', active);
  });
  panels.forEach(p => {
    p.classList.toggle('active', p.id === `panel-${gameName}`);
  });
}

tabs.forEach(tab => {
  tab.addEventListener('click', () => switchTab(tab.dataset.game));
});

// ---------- Rules Modal ----------
const rulesTrigger = document.getElementById('rules-trigger');
const rulesModal = document.getElementById('rules-modal');
const rulesClose = document.getElementById('rules-close');
const rulesTabBtns = document.querySelectorAll('.rules-tab-btn');
const rulesPanels = document.querySelectorAll('.rules-panel');

rulesTrigger.addEventListener('click', () => {
  rulesModal.style.display = 'flex';
});

rulesClose.addEventListener('click', () => {
  rulesModal.style.display = 'none';
});

rulesTabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    rulesTabBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const targetTabId = btn.dataset.rulesTab;
    rulesPanels.forEach(panel => {
      panel.classList.toggle('active', panel.id === targetTabId);
    });
  });
});

// ---------- Shared Utilities ----------
export function showVictory(playerName, subMsg, onPlayAgain) {
  const overlay = document.getElementById('victory-screen');
  document.getElementById('victory-title').textContent = `${playerName} Wins!`;
  document.getElementById('victory-sub').textContent = subMsg || 'The case is closed.';
  overlay.style.display = 'flex';
  spawnParticles();

  const btn = document.getElementById('victory-play-again');
  const handler = () => {
    overlay.style.display = 'none';
    btn.removeEventListener('click', handler);
    onPlayAgain?.();
  };
  btn.addEventListener('click', handler);
}

export function showHotseat(msg, onReady) {
  const overlay = document.getElementById('hotseat-screen');
  document.getElementById('hotseat-msg').textContent = msg;
  overlay.style.display = 'flex';

  const btn = document.getElementById('hotseat-ready');
  const handler = () => {
    overlay.style.display = 'none';
    btn.removeEventListener('click', handler);
    onReady?.();
  };
  btn.addEventListener('click', handler);
}

function spawnParticles() {
  const container = document.getElementById('victory-particles');
  container.innerHTML = '';
  const colors = ['#00e5ff', '#b040ff', '#ffa726', '#00e676', '#ff3d57'];
  for (let i = 0; i < 60; i++) {
    const p = document.createElement('div');
    const color = colors[Math.floor(Math.random() * colors.length)];
    const size = 6 + Math.random() * 8;
    p.style.cssText = `
      position:absolute;
      width:${size}px; height:${size}px;
      border-radius:50%;
      background:${color};
      left:${Math.random()*100}%;
      top:${Math.random()*100}%;
      animation: particle-drift ${0.8+Math.random()*1.5}s ease-out forwards;
      opacity: 0.9;
      box-shadow: 0 0 6px ${color};
    `;
    container.appendChild(p);
  }
  const style = document.getElementById('particle-style') || document.createElement('style');
  style.id = 'particle-style';
  style.textContent = `
    @keyframes particle-drift {
      from { transform: translateY(0) rotate(0deg); opacity:0.9; }
      to   { transform: translateY(-80px) rotate(360deg); opacity:0; }
    }
  `;
  document.head.appendChild(style);
}

// ---------- Init Games ----------
new SleuthsGame();
new EvidenceGame();
new CipherGame();
new WhispersGame();
