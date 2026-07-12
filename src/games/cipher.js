// src/games/cipher.js — Cipher Duel

import { showVictory, showHotseat } from '../utils.js';

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const SYMBOLS = ['◆', '▲', '●', '★', '⬡'];
const SYMBOL_NAMES = { '◆': 'Parity', '▲': 'Difference', '●': 'Containment', '★': 'Exact Value', '⬡': 'Aggregate' };

function randomCode() {
  return Array.from({ length: 4 }, () => rand(1, 9));
}

function generateSpecificConstraint(symbol, code, row, col) {
  const targetIdx = row < 4 ? row : (col % 4);
  const targetDigit = code[targetIdx];

  if (symbol === '◆') {
    return { text: `Digit ${targetIdx + 1} is ${targetDigit % 2 === 0 ? 'Even' : 'Odd'}.`, reveals: null };
  } else if (symbol === '▲') {
    let otherIdx = col % 4;
    if (otherIdx === targetIdx) otherIdx = (otherIdx + 1) % 4;
    const diff = Math.abs(targetDigit - code[otherIdx]);
    return { text: `|Digit ${targetIdx + 1} − Digit ${otherIdx + 1}| = ${diff}`, reveals: null };
  } else if (symbol === '●') {
    const checkVal = (col * 2 + targetIdx) % 9 + 1;
    const contains = code.includes(checkVal);
    return { text: `The number ${checkVal} ${contains ? 'IS' : 'is NOT'} in the code.`, reveals: null };
  } else if (symbol === '★') {
    return { text: `Digit ${targetIdx + 1} = ${targetDigit}`, reveals: { position: targetIdx, value: targetDigit } };
  } else if (symbol === '⬡') {
    if (col % 2 === 0) {
      const sum = code.reduce((a,b) => a+b, 0);
      return { text: `The sum of all digits is ${sum}.`, reveals: null };
    } else {
      const uniqueCount = new Set(code).size;
      return { text: `The code contains ${uniqueCount} unique number(s).`, reveals: null };
    }
  }
}

export class CipherGame {
  constructor() {
    this.currentPlayer = 1;
    this.codes = { 1: null, 2: null };
    this.knownDigits = { 1: [null,null,null,null], 2: [null,null,null,null] };
    this.constraints = { 1: [], 2: [] }; // Array of constraint text strings to detect duplicates
    this.grid = [];
    this.burnedCells = new Set();
    this.setupStep = 1; // 1 = P1 setup, 2 = P2 setup, 3 = play
    this.hasInspectedThisTurn = false;

    this.initDom();
  }

  initDom() {
    this.setupContainer = document.getElementById('cipher-setup');
    this.gameContainer  = document.getElementById('cipher-game');

    this.turnEl     = document.getElementById('cipher-turn');
    this.boardEl    = document.getElementById('cipher-board');
    this.legendEl   = document.getElementById('cipher-legend');
    this.p1Slots    = document.getElementById('cipher-p1-slots');
    this.p2Slots    = document.getElementById('cipher-p2-slots');
    this.constraintList = document.getElementById('cipher-constraint-list');
    this.crackModal = document.getElementById('cipher-crack-modal');
    this.crackPrompt = document.getElementById('cipher-crack-prompt');
    this.crackInputs = document.getElementById('cipher-crack-inputs');
    this.setupTitle = document.getElementById('cipher-setup-title');
    this.setupInputs = document.getElementById('cipher-setup-inputs');
    this.endTurnBtn = document.getElementById('cipher-end-turn');
    this.crackBtn   = document.getElementById('cipher-crack');

    document.getElementById('cipher-new-game').addEventListener('click', () => {
      this.gameContainer.style.display = 'none';
      this.setupContainer.style.display = 'block';
      this.startSetup();
    });
    
    this.crackBtn.addEventListener('click', () => this.openCrackModal());
    document.getElementById('cipher-confirm-crack').addEventListener('click', () => this.confirmCrack());
    document.getElementById('cipher-cancel-crack').addEventListener('click', () => { this.crackModal.style.display = 'none'; });
    document.getElementById('cipher-confirm-setup').addEventListener('click', () => this.confirmSetup());
    this.endTurnBtn.addEventListener('click', () => this.endTurn());
    
    this.startSetup();
  }

  startSetup() {
    this.codes = { 1: null, 2: null };
    this.knownDigits = { 1: [null,null,null,null], 2: [null,null,null,null] };
    this.constraints = { 1: [], 2: [] };
    this.burnedCells = new Set();
    this.setupStep = 1;
    this.currentPlayer = 1;
    this.hasInspectedThisTurn = false;

    // Generate 5x5 grid
    this.grid = Array.from({ length: 5 }, () =>
      Array.from({ length: 5 }, () => {
        if (Math.random() < 0.08) return '★'; // Only 8% chance for a star
        const commonSymbols = ['◆', '▲', '●', '⬡'];
        return commonSymbols[Math.floor(Math.random() * commonSymbols.length)];
      })
    );

    this.openSetupUI(1);
  }

  openSetupUI(player) {
    this.setupTitle.textContent = `Player ${player}: Set Your Secret Code`;
    this.setupInputs.innerHTML = '';
    for (let i = 0; i < 4; i++) {
      const input = document.createElement('input');
      input.type = 'number';
      input.min = 1;
      input.max = 9;
      input.maxLength = 1;
      input.className = 'crack-input';
      input.id = `setup-digit-${i}`;
      input.placeholder = '-';
      input.addEventListener('input', () => {
        if (input.value.length > 1) input.value = input.value.slice(-1);
        if (parseInt(input.value) > 9) input.value = '9';
        if (parseInt(input.value) < 1 && input.value !== '') input.value = '1';
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
      alert('Please enter exactly 4 digits (1–9).');
      return;
    }
    
    this.codes[this.setupStep] = digits;

    if (this.setupStep === 1) {
      showHotseat('Player 1 code saved! Pass device to Player 2.', () => {
        this.setupStep = 2;
        this.openSetupUI(2);
      });
    } else {
      this.setupContainer.style.display = 'none';
      this.gameContainer.style.display = 'grid';
      this.setupStep = 3;
      this.currentPlayer = 1;
      this.hasInspectedThisTurn = false;
      this.renderBoard();
      this.renderLegend();
      this.renderSlots();
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
        
        cell.dataset.coord = r < 4 ? `R${r+1}(D${r+1})` : `R5(Gbl)`;

        const symEl = document.createElement('div');
        symEl.className = 'symbol-display';
        symEl.textContent = sym;
        cell.appendChild(symEl);

        if (this.burnedCells.has(key)) {
          cell.classList.add('cipher-inspected');
        }

        cell.addEventListener('click', () => this.handleCellClick(r, c));
        this.boardEl.appendChild(cell);
      }
    }
  }

  handleCellClick(r, c) {
    if (this.setupStep !== 3) return;
    if (this.hasInspectedThisTurn) return; // Only 1 inspection per turn
    
    const key = `${r},${c}`;
    if (this.burnedCells.has(key)) return;

    const sym = this.grid[r][c];
    this.burnedCells.add(key);
    this.hasInspectedThisTurn = true;

    const opponentCode = this.codes[this.currentPlayer === 1 ? 2 : 1];
    const constraint = generateSpecificConstraint(sym, opponentCode, r, c);

    // Check for duplicate clues for this player
    const isDuplicate = this.constraints[this.currentPlayer].includes(constraint.text);
    
    if (isDuplicate) {
      this.addConstraintChip(`(Burned Tile) No new clue found here.`);
    } else {
      this.constraints[this.currentPlayer].push(constraint.text);
      if (constraint.reveals) {
        const { position, value } = constraint.reveals;
        this.knownDigits[this.currentPlayer][position] = value;
        this.renderSlots();
      }
      this.addConstraintChip(`${sym} (R${r+1},C${c+1}): ${constraint.text}`);
    }

    this.renderBoard();
    this.updateUI(); // Enable End Turn button
  }

  addConstraintChip(text) {
    const chip = document.createElement('div');
    chip.className = 'log-entry';
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
      item.innerHTML = `<strong>${sym}</strong> ${SYMBOL_NAMES[sym]}`;
      this.legendEl.appendChild(item);
    });
  }

  updateUI() {
    this.turnEl.textContent = `Player ${this.currentPlayer}'s Turn`;
    
    if (this.hasInspectedThisTurn) {
      this.endTurnBtn.style.display = 'block';
    } else {
      this.endTurnBtn.style.display = 'none';
    }
  }

  endTurn() {
    this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
    this.hasInspectedThisTurn = false;
    this.updateUI();
    
    // Re-render constraints for the new player
    this.constraintList.innerHTML = '';
    this.constraints[this.currentPlayer].forEach(text => {
      this.addConstraintChip(text);
    });
    this.renderSlots();
  }

  openCrackModal() {
    if (this.setupStep !== 3) return;
    const opponent = this.currentPlayer === 1 ? 2 : 1;
    this.crackPrompt.textContent = `Enter Player ${opponent}'s 4-digit code:`;
    this.crackModal.style.display = 'flex';
    this.crackInputs.innerHTML = '';
    for (let i = 0; i < 4; i++) {
      const input = document.createElement('input');
      input.type = 'number';
      input.min = 1; input.max = 9;
      input.className = 'crack-input';
      input.id = `crack-digit-${i}`;
      input.placeholder = '-';
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
      showVictory(`Player ${this.currentPlayer} Wins!`, `Code Cracked: ${actual.join('-')}`, () => {
        this.gameContainer.style.display = 'none';
        this.setupContainer.style.display = 'block';
        this.startSetup();
      });
    } else {
      showVictory(`Player ${opponent} Wins!`, `Player ${this.currentPlayer} triggered the alarm by entering: ${attempt.join('-')}`, () => {
        this.gameContainer.style.display = 'none';
        this.setupContainer.style.display = 'block';
        this.startSetup();
      });
    }
  }
}
