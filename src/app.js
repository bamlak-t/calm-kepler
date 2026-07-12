// src/app.js — Main application orchestrator

import { SleuthsGame } from './games/sleuths.js';
import { CipherGame } from './games/cipher.js';

// ---------- Theme Toggle ----------
const themeBtn = document.getElementById('theme-toggle');
themeBtn.addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');
  const isDark = document.body.classList.contains('dark-mode');
  themeBtn.textContent = isDark ? 'Light Mode' : 'Dark Mode';
});

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
    const active = p.id === `panel-${gameName}`;
    p.classList.toggle('active', active);
  });
}

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    if (!tab.disabled) switchTab(tab.dataset.game);
  });
});

// ---------- Rules Modal ----------
const rulesModal = document.getElementById('rules-modal');
document.getElementById('rules-trigger').addEventListener('click', () => {
  rulesModal.style.display = 'flex';
});
document.getElementById('rules-close').addEventListener('click', () => {
  rulesModal.style.display = 'none';
});

const rulesTabs = document.querySelectorAll('.rules-tab-btn');
const rulesPanels = document.querySelectorAll('.rules-panel');
rulesTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const target = tab.dataset.rulesTab;
    rulesTabs.forEach(t => t.classList.toggle('active', t === tab));
    rulesPanels.forEach(p => p.classList.toggle('active', p.id === target));
  });
});

// ---------- Init Games ----------
new SleuthsGame();
new CipherGame();
