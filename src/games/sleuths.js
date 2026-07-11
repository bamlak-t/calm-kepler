// src/games/sleuths.js — Funny Sleuths: Randomized moveset chess-style deduction game

import { showVictory, showHotseat } from '../app.js';

const PIECE_ICONS = { Detective: '🕵️', Analyst: '🔬', Scout: '🦅' };
const MOVE_ICONS  = { Knight: '♞', Rook: '♜', Bishop: '♝', King: '♚', Queen: '♛' };
const MOVE_NAMES  = ['Knight', 'Rook', 'Bishop', 'King'];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function rand(n) { return Math.floor(Math.random() * n); }

// Get all valid target squares for each move type from (r,c)
function getMoveTargets(moveType, r, c, size = 6) {
  const targets = [];
  const inBounds = (rr, cc) => rr >= 0 && rr < size && cc >= 0 && cc < size;

  if (moveType === 'Knight') {
    const deltas = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
    for (const [dr, dc] of deltas) {
      const nr = r + dr, nc = c + dc;
      if (inBounds(nr, nc)) targets.push([nr, nc]);
    }
  } else if (moveType === 'Rook') {
    for (let i = 0; i < size; i++) {
      if (i !== c) targets.push([r, i]);
      if (i !== r) targets.push([i, c]);
    }
  } else if (moveType === 'Bishop') {
    for (const [dr, dc] of [[-1,-1],[-1,1],[1,-1],[1,1]]) {
      let nr = r + dr, nc = c + dc;
      while (inBounds(nr, nc)) { targets.push([nr, nc]); nr += dr; nc += dc; }
    }
  } else if (moveType === 'King') {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr, nc = c + dc;
        if (inBounds(nr, nc)) targets.push([nr, nc]);
      }
    }
  }
  return targets;
}

function generateClue(targetR, targetC, fromR, fromC) {
  const clues = [
    () => `Target row is ${targetR % 2 === 0 ? 'even' : 'odd'} (rows: 0–5).`,
    () => `Target column is ${targetC % 2 === 0 ? 'even' : 'odd'} (cols: 0–5).`,
    () => {
      const manhattan = Math.abs(targetR - fromR) + Math.abs(targetC - fromC);
      return `Manhattan distance to target from here: ${manhattan}.`;
    },
    () => {
      const dr = targetR - fromR, dc = targetC - fromC;
      let direction = '';
      if (Math.abs(dr) > Math.abs(dc)) direction = dr > 0 ? 'South' : 'North';
      else if (Math.abs(dc) > Math.abs(dr)) direction = dc > 0 ? 'East' : 'West';
      else direction = `${dr > 0 ? 'South' : 'North'}-${dc > 0 ? 'East' : 'West'}`;
      return `Target is generally ${direction} of this tile.`;
    },
    () => `Target row is ${targetR < 3 ? 'in the top half' : 'in the bottom half'} of the board.`,
    () => `Target column is ${targetC < 3 ? 'in the left half' : 'in the right half'} of the board.`,
    () => `Target is on row ${targetR}.`,
  ];
  return clues[rand(clues.length)]();
}

export class SleuthsGame {
  constructor() {
    this.size = 6;
    this.currentPlayer = 1;
    this.selectedPiece = null;
    this.validMoves = [];
    this.mastermindPos = null;
    this.investigated = new Set();
    this.clues = [];
    this.pieces = { 1: [], 2: [] };
    this.moveAssign = { 1: {}, 2: {} };
    this.phase = 'select'; // 'select' | 'move'
    this.accuseSelectedCell = null;

    this.initDom();
    this.startGame();
  }

  initDom() {
    this.board       = document.getElementById('sleuths-board');
    this.turnEl      = document.getElementById('sleuths-turn');
    this.phaseEl     = document.getElementById('sleuths-phase');
    this.logEntries  = document.getElementById('sleuths-log-entries');
    this.legendEl    = document.getElementById('sleuths-legend');
    this.p1PiecesEl  = document.getElementById('sleuths-p1-pieces');
    this.p2PiecesEl  = document.getElementById('sleuths-p2-pieces');
    this.accuseModal = document.getElementById('sleuths-accuse-modal');
    this.accuseGrid  = document.getElementById('sleuths-accuse-grid');

    document.getElementById('sleuths-new-game').addEventListener('click', () => this.startGame());
    document.getElementById('sleuths-accuse').addEventListener('click', () => this.openAccuseModal());
    document.getElementById('sleuths-confirm-accuse').addEventListener('click', () => this.confirmAccuse());
    document.getElementById('sleuths-cancel-accuse').addEventListener('click', () => {
      this.accuseModal.style.display = 'none';
      this.accuseSelectedCell = null;
    });
  }

  startGame() {
    this.currentPlayer = 1;
    this.selectedPiece = null;
    this.validMoves = [];
    this.investigated = new Set();
    this.clues = [];
    this.phase = 'select';

    // Place mastermind randomly
    this.mastermindPos = [rand(this.size), rand(this.size)];

    // Assign random movesets to each player's pieces
    const pieceNames = ['Detective', 'Analyst', 'Scout'];
    const movePool1 = shuffle(MOVE_NAMES);
    const movePool2 = shuffle(MOVE_NAMES);
    this.moveAssign[1] = {};
    this.moveAssign[2] = {};
    pieceNames.forEach((name, i) => {
      this.moveAssign[1][name] = movePool1[i];
      this.moveAssign[2][name] = movePool2[i];
    });

    // Place pieces — P1 top rows, P2 bottom rows
    this.pieces[1] = [
      { name: 'Detective', r: 0, c: 0, player: 1 },
      { name: 'Analyst',   r: 0, c: 2, player: 1 },
      { name: 'Scout',     r: 0, c: 4, player: 1 },
    ];
    this.pieces[2] = [
      { name: 'Detective', r: 5, c: 5, player: 2 },
      { name: 'Analyst',   r: 5, c: 3, player: 2 },
      { name: 'Scout',     r: 5, c: 1, player: 2 },
    ];

    this.renderBoard();
    this.renderLegend();
    this.renderPiecesDisplay();
    this.clearLog();
    this.updateTurnUI();
  }

  clearLog() {
    this.logEntries.innerHTML = '<p class="log-empty">No clues gathered yet. Move investigators onto tiles to reveal clues.</p>';
  }

  addLog(text, player) {
    const empty = this.logEntries.querySelector('.log-empty');
    if (empty) empty.remove();
    const el = document.createElement('div');
    el.className = `log-entry${player === 2 ? ' p2-entry' : ''}`;
    el.textContent = `P${player}: ${text}`;
    this.logEntries.prepend(el);
  }

  updateTurnUI() {
    this.turnEl.textContent = `Player ${this.currentPlayer}'s Turn`;
    this.turnEl.style.borderLeftColor = this.currentPlayer === 1 ? 'var(--cyan)' : 'var(--amber)';
    this.phaseEl.textContent = this.phase === 'select' ? 'Select a piece to move' : 'Select a destination tile';
  }

  renderLegend() {
    this.legendEl.innerHTML = '';
    for (const player of [1, 2]) {
      Object.entries(this.moveAssign[player]).forEach(([piece, move]) => {
        const el = document.createElement('div');
        el.className = 'legend-item';
        el.textContent = '';
        el.innerHTML = `P${player} ${PIECE_ICONS[piece]} <span>${MOVE_ICONS[move]} ${move}</span>`;
        this.legendEl.appendChild(el);
      });
    }
  }

  renderPiecesDisplay() {
    const rows = { 1: this.p1PiecesEl, 2: this.p2PiecesEl };
    for (const player of [1, 2]) {
      const row = rows[player];
      // remove existing chips
      row.querySelectorAll('.piece-info-chip').forEach(e => e.remove());
      this.pieces[player].forEach(piece => {
        const chip = document.createElement('div');
        chip.className = 'piece-info-chip';
        chip.id = `sleuth-chip-p${player}-${piece.name}`;
        const move = this.moveAssign[player][piece.name];
        chip.innerHTML = `${PIECE_ICONS[piece.name]} ${piece.name} <span style="color:var(--muted)">${MOVE_ICONS[move]} ${move}</span>`;
        row.appendChild(chip);
      });
    }
  }

  renderBoard() {
    this.board.innerHTML = '';
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        const cell = document.createElement('div');
        cell.className = 'board-cell';
        cell.dataset.r = r;
        cell.dataset.c = c;
        cell.dataset.coord = `${r},${c}`;

        const key = `${r},${c}`;
        if (this.investigated.has(key)) cell.classList.add('investigated');

        // Find piece on this cell
        let piece = null;
        for (const p of [1, 2]) {
          const found = this.pieces[p].find(pi => pi.r === r && pi.c === c);
          if (found) { piece = found; break; }
        }

        if (piece) {
          cell.classList.add(piece.player === 1 ? 'p1-piece' : 'p2-piece');
          const icon = document.createElement('div');
          icon.className = 'piece-icon';
          icon.textContent = PIECE_ICONS[piece.name];
          const label = document.createElement('div');
          label.className = 'piece-label';
          label.textContent = `${MOVE_ICONS[this.moveAssign[piece.player][piece.name]]}`;
          cell.appendChild(icon);
          cell.appendChild(label);
        }

        if (this.selectedPiece && this.selectedPiece.r === r && this.selectedPiece.c === c) {
          cell.classList.add('selected');
        }

        if (this.validMoves.some(([vr, vc]) => vr === r && vc === c)) {
          cell.classList.add('valid-move');
        }

        cell.addEventListener('click', () => this.handleCellClick(r, c));
        this.board.appendChild(cell);
      }
    }
  }

  handleCellClick(r, c) {
    if (this.phase === 'select') {
      // Try selecting a piece belonging to current player
      const piece = this.pieces[this.currentPlayer].find(p => p.r === r && p.c === c);
      if (piece) {
        this.selectedPiece = piece;
        const moveType = this.moveAssign[this.currentPlayer][piece.name];
        this.validMoves = this.getFilteredMoves(moveType, r, c);
        this.phase = 'move';
        this.renderBoard();
        this.updateTurnUI();
      }
    } else if (this.phase === 'move') {
      // Check if clicking a valid move target
      if (this.validMoves.some(([vr, vc]) => vr === r && vc === c)) {
        this.movePiece(this.selectedPiece, r, c);
      } else {
        // Deselect
        this.selectedPiece = null;
        this.validMoves = [];
        this.phase = 'select';
        this.renderBoard();
        this.updateTurnUI();
      }
    }
  }

  getFilteredMoves(moveType, r, c) {
    const rawTargets = getMoveTargets(moveType, r, c, this.size);
    // Filter out squares occupied by own pieces
    return rawTargets.filter(([tr, tc]) =>
      !this.pieces[this.currentPlayer].some(p => p.r === tr && p.c === tc)
    );
  }

  movePiece(piece, toR, toC) {
    piece.r = toR;
    piece.c = toC;
    const key = `${toR},${toC}`;
    const alreadyInvestigated = this.investigated.has(key);
    this.investigated.add(key);

    if (!alreadyInvestigated) {
      const clue = generateClue(this.mastermindPos[0], this.mastermindPos[1], toR, toC);
      this.clues.push({ player: this.currentPlayer, text: clue });
      this.addLog(clue, this.currentPlayer);
    } else {
      this.addLog('This tile was already investigated — no new clues.', this.currentPlayer);
    }

    this.selectedPiece = null;
    this.validMoves = [];
    this.phase = 'select';
    this.renderBoard();
    this.renderPiecesDisplay();

    const nextPlayer = this.currentPlayer === 1 ? 2 : 1;
    const msg = `Player ${nextPlayer}'s turn is next. Pass the device, then press Ready.`;
    showHotseat(msg, () => {
      this.currentPlayer = nextPlayer;
      this.updateTurnUI();
    });
  }

  openAccuseModal() {
    this.accuseModal.style.display = 'flex';
    this.accuseSelectedCell = null;
    this.accuseGrid.innerHTML = '';
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        const cell = document.createElement('div');
        cell.className = 'accuse-cell';
        cell.textContent = `${r},${c}`;
        cell.dataset.r = r;
        cell.dataset.c = c;
        cell.addEventListener('click', () => {
          this.accuseGrid.querySelectorAll('.accuse-cell').forEach(el => el.classList.remove('selected-accuse'));
          cell.classList.add('selected-accuse');
          this.accuseSelectedCell = [r, c];
        });
        this.accuseGrid.appendChild(cell);
      }
    }
  }

  confirmAccuse() {
    if (!this.accuseSelectedCell) return;
    const [r, c] = this.accuseSelectedCell;
    const [mr, mc] = this.mastermindPos;
    this.accuseModal.style.display = 'none';
    if (r === mr && c === mc) {
      showVictory(`Player ${this.currentPlayer}`, `The Mastermind was at tile ${mr},${mc}. Case closed!`, () => this.startGame());
    } else {
      this.addLog(`❌ Wrong accusation: tile ${r},${c} is innocent!`, this.currentPlayer);
      // Reveal mastermind briefly
      this.addLog(`💡 The Mastermind was at ${mr},${mc}. Better luck next round!`, this.currentPlayer);
      const nextPlayer = this.currentPlayer === 1 ? 2 : 1;
      showVictory(`Player ${nextPlayer}`, `P${this.currentPlayer} made a wrong accusation!`, () => this.startGame());
    }
  }
}
