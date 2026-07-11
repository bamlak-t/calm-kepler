// src/games/cipher.js — Cipher Duel: Code-breaking with randomized symbol constraints

import { showVictory, showHotseat } from '../app.js';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const SYMBOLS = ['◆', '▲', '●', '★', '⬡'];
const SYMBOL_NAMES = { '◆': 'Diamond', '▲': 'Triangle', '●': 'Circle', '★': 'Star', '⬡': 'Hex' };
const SYMBOL_COLORS = {
  '◆': '#00e5ff', '▲': '#b040ff', '●': '#ffa726', '★': '#00e676', '⬡': '#ff3d57'
};

// Generates a random 4-digit code where each digit is 1-9
function randomCode() {
  return Array.from({ length: 4 }, () => rand(1, 9));
}

// Given a symbol and the codes, generate a constraint hint
function generateConstraint(symbol, code) {
  const idx = Math.floor(Math.random() * 4);
  const digit = code[idx];
  const constraints = [
    () => ({ text: `Digit ${idx+1} is ${digit % 2 === 0 ? 'even' : 'odd'}.`, reveals: null }),
    () => {
      const sum = code.reduce((a,b) => a+b, 0);
      return { text: `Sum of all 4 digits is ${sum}.`, reveals: null };
    },
    () => {
      const max = Math.max(...code);
      return { text: `Largest digit in the code is ${max}.`, reveals: null };
    },
    () => ({ text: `Digit ${idx+1} = ${digit}.`, reveals: { position: idx, value: digit } }),
    () => {
      const sorted = [...code].sort((a,b) => a-b);
      return { text: `Digits in ascending order: ${sorted.join(', ')}.`, reveals: null };
    },
    () => {
      const i = Math.floor(Math.random() * 3);
      const diff = Math.abs(code[i] - code[i+1]);
      return { text: `|Digit ${i+1} − Digit ${i+2}| = ${diff}.`, reveals: null };
    },
  ];
  return constraints[Math.floor(Math.random() * constraints.length)]();
}

export class CipherGame {
  constructor() {
    this.currentPlayer = 1;
    this.codes = { 1: null, 2: null };
    this.knownDigits = { 1: [null,null,null,null], 2: [null,null,null,null] };
    this.constraints = { 1: [], 2: [] };
    this.grid = [];
    this.inspectedCells = new Set();
    this.setupPhase = true;
    this.setupStep = 1; // 1 = P1 sets code, 2 = P2 sets code, 3 = play

    this.initDom();
    this.startGame();
  }

  initDom() {
    this.turnEl     = document.getElementById('cipher-turn');
    this.phaseEl    = document.getElementById('cipher-phase');
    this.boardEl    = document.getElementById('cipher-board');
    this.legendEl   = document.getElementById('cipher-legend');
    this.p1Slots    = document.getElementById('cipher-p1-slots');
    this.p2Slots    = document.getElementById('cipher-p2-slots');
    this.constraintList = document.getElementById('cipher-constraint-list');
    this.crackModal = document.getElementById('cipher-crack-modal');
    this.crackPrompt = document.getElementById('cipher-crack-prompt');
    this.crackInputs = document.getElementById('cipher-crack-inputs');
    this.setupModal = document.getElementById('cipher-setup-modal');
    this.setupTitle = document.getElementById('cipher-setup-title');
    this.setupInputs = document.getElementById('cipher-setup-inputs');

    document.getElementById('cipher-new-game').addEventListener('click', () => this.startGame());
    document.getElementById('cipher-crack').addEventListener('click', () => this.openCrackModal());
    document.getElementById('cipher-confirm-crack').addEventListener('click', () => this.confirmCrack());
    document.getElementById('cipher-cancel-crack').addEventListener('click', () => { this.crackModal.style.display = 'none'; });
    document.getElementById('cipher-confirm-setup').addEventListener('click', () => this.confirmSetup());
  }

  startGame() {
    this.codes = { 1: null, 2: null };
    this.knownDigits = { 1: [null,null,null,null], 2: [null,null,null,null] };
    this.constraints = { 1: [], 2: [] };
    this.inspectedCells = new Set();
    this.setupStep = 1;
    this.currentPlayer = 1;

    // Generate 5x5 grid of random symbols
    this.grid = Array.from({ length: 5 }, () =>
      Array.from({ length: 5 }, () => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)])
    );

    this.renderBoard();
    this.renderLegend();
    this.renderSlots();
    this.constraintList.innerHTML = '';
    this.updateUI();
    this.openSetupModal(1);
  }

  openSetupModal(player) {
    this.setupTitle.textContent = `Player ${player}: Set Your Secret Code`;
    this.setupModal.style.display = 'flex';
    this.setupInputs.innerHTML = '';
    for (let i = 0; i < 4; i++) {
      const input = document.createElement('input');
      input.type = 'number';
      input.min = 1;
      input.max = 9;
      input.maxLength = 1;
      input.className = 'crack-input';
      input.id = `setup-digit-${i}`;
      input.placeholder = '?';
      input.addEventListener('input', () => {
        if (input.value.length > 1) input.value = input.value.slice(-1);
        if (parseInt(input.value) > 9) input.value = '9';
        if (parseInt(input.value) < 1 && input.value !== '') input.value = '1';
        // Auto advance
        if (input.value && i < 3) document.getElementById(`setup-digit-${i+1}`).focus();
      });
      this.setupInputs.appendChild(input);
    }
    setTimeout(() => document.getElementById('setup-digit-0').focus(), 100);
  }

  confirmSetup() {
    const digits = Array.from({ length: 4 }, (_, i) => {
      const val = parseInt(document.getElementById(`setup-digit-${i}`).value);
      return isNaN(val) ? null : val;
    });
    if (digits.some(d => d === null || d < 1 || d > 9)) {
      alert('Please enter 4 digits (1–9) for your secret code.');
      return;
    }
    this.codes[this.setupStep] = digits;
    this.setupModal.style.display = 'none';

    if (this.setupStep === 1) {
      // Pass to P2
      showHotseat(
        'Player 1 code saved! Pass device to Player 2 to set their code.',
        () => {
          this.setupStep = 2;
          this.openSetupModal(2);
        }
      );
    } else {
      // Both codes set — start play
      this.setupStep = 3;
      this.currentPlayer = 1;
      this.updateUI();
    }
  }

  renderBoard() {
    this.boardEl.innerHTML = '';
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const cell = document.createElement('div');
        cell.className = 'board-cell';
        const sym = this.grid[r][c];
        const key = `${r},${c}`;
        cell.dataset.coord = `${r},${c}`;

        const symEl = document.createElement('div');
        symEl.className = 'symbol-display';
        symEl.textContent = sym;
        symEl.style.color = SYMBOL_COLORS[sym];
        symEl.style.textShadow = `0 0 12px ${SYMBOL_COLORS[sym]}`;
        cell.appendChild(symEl);

        if (this.inspectedCells.has(key)) {
          cell.classList.add('cipher-inspected');
        }

        cell.addEventListener('click', () => this.handleCellClick(r, c));
        this.boardEl.appendChild(cell);
      }
    }
  }

  handleCellClick(r, c) {
    if (this.setupStep !== 3) return;
    const key = `${r},${c}`;
    if (this.inspectedCells.has(key)) return; // already inspected

    const sym = this.grid[r][c];
    this.inspectedCells.add(key);

    // Inspect symbol → get constraint about opponent's code
    const opponentCode = this.codes[this.currentPlayer === 1 ? 2 : 1];
    const constraint = generateConstraint(sym, opponentCode);

    this.constraints[this.currentPlayer].push({
      symbol: sym,
      text: constraint.text,
    });

    // If constraint reveals a specific digit
    if (constraint.reveals) {
      const { position, value } = constraint.reveals;
      this.knownDigits[this.currentPlayer][position] = value;
      this.renderSlots();
    }

    this.addConstraintChip(`${SYMBOL_NAMES[sym]}: ${constraint.text}`);
    this.renderBoard();

    // End turn after inspection
    const next = this.currentPlayer === 1 ? 2 : 1;
    showHotseat(
      `Player ${next}'s turn. Pass the device, then press Ready.`,
      () => {
        this.currentPlayer = next;
        this.updateUI();
        // Re-render constraints for the other player
        this.constraintList.innerHTML = '';
        this.constraints[next].forEach(c2 => this.addConstraintChip(`${SYMBOL_NAMES[c2.symbol]}: ${c2.text}`));
        this.renderSlots();
      }
    );
  }

  addConstraintChip(text) {
    const chip = document.createElement('div');
    chip.className = 'constraint-chip';
    chip.textContent = text;
    this.constraintList.prepend(chip);
  }

  renderSlots() {
    const renderRow = (slotsEl, digits) => {
      slotsEl.innerHTML = '';
      digits.forEach(d => {
        const slot = document.createElement('div');
        slot.className = `code-slot${d !== null ? ' revealed' : ''}`;
        slot.textContent = d !== null ? d : '?';
        slotsEl.appendChild(slot);
      });
    };
    renderRow(this.p1Slots, this.knownDigits[1]);
    renderRow(this.p2Slots, this.knownDigits[2]);
  }

  renderLegend() {
    this.legendEl.innerHTML = '';
    SYMBOLS.forEach(sym => {
      const item = document.createElement('div');
      item.className = 'legend-item';
      item.style.color = SYMBOL_COLORS[sym];
      item.innerHTML = `<span>${sym}</span> ${SYMBOL_NAMES[sym]}`;
      this.legendEl.appendChild(item);
    });
  }

  updateUI() {
    this.turnEl.textContent = `Player ${this.currentPlayer}'s Turn`;
    this.turnEl.style.borderLeftColor = this.currentPlayer === 1 ? 'var(--cyan)' : 'var(--amber)';
    this.phaseEl.textContent = this.setupStep !== 3
      ? 'Setting up secret codes...'
      : 'Click a symbol tile to inspect it';
  }

  openCrackModal() {
    if (this.setupStep !== 3) return;
    const opponent = this.currentPlayer === 1 ? 2 : 1;
    this.crackPrompt.textContent = `Enter what you think Player ${opponent}'s 4-digit code is:`;
    this.crackModal.style.display = 'flex';
    this.crackInputs.innerHTML = '';
    for (let i = 0; i < 4; i++) {
      const input = document.createElement('input');
      input.type = 'number';
      input.min = 1; input.max = 9;
      input.className = 'crack-input';
      input.id = `crack-digit-${i}`;
      input.placeholder = '?';
      input.addEventListener('input', () => {
        if (input.value.length > 1) input.value = input.value.slice(-1);
        if (i < 3 && input.value) document.getElementById(`crack-digit-${i+1}`).focus();
      });
      this.crackInputs.appendChild(input);
    }
    setTimeout(() => document.getElementById('crack-digit-0').focus(), 100);
  }

  confirmCrack() {
    const attempt = Array.from({ length: 4 }, (_, i) =>
      parseInt(document.getElementById(`crack-digit-${i}`).value)
    );
    if (attempt.some(isNaN)) { alert('Please enter all 4 digits.'); return; }

    const opponent = this.currentPlayer === 1 ? 2 : 1;
    const actual = this.codes[opponent];
    this.crackModal.style.display = 'none';

    if (actual.every((d, i) => d === attempt[i])) {
      showVictory(`Player ${this.currentPlayer}`, `Cracked the code: ${actual.join('-')}!`, () => this.startGame());
    } else {
      alert(`Wrong! The code was not ${attempt.join('-')}. Keep investigating...`);
    }
  }
}
