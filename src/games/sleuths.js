// src/games/sleuths.js — Funny Sleuths

import { showVictory, showHotseat, showAlert } from '../app.js';

const MOVE_ICONS  = { Knight: '♞', Rook: '♜', Bishop: '♝', King: '♚', Queen: '♛' };
const MOVE_NAMES  = ['Knight', 'Rook', 'Bishop', 'King', 'Queen'];

const COLORS = ['red', 'blue', 'green'];
const SYMBOLS = ['▲', '■', '●'];
const PIECE_NAMES = ['Detective', 'Analyst', 'Scout', 'Inspector', 'Agent', 'Profiler', 'Chief', 'Officer', 'Rookie', 'Specialist'];
const CLASSIC_ICONS = { 'Knight': '♞', 'Rook': '♜', 'Bishop': '♝', 'King': '♚', 'Queen': '♛' };

// ... (keep shuffle and rand)
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function rand(n) { return Math.floor(Math.random() * n); }

function getMoveTargets(moveType, r, c, size) {
  const targets = [];
  const inBounds = (rr, cc) => rr >= 0 && rr < size && cc >= 0 && cc < size;

  if (moveType === 'Knight') {
    const deltas = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
    for (const [dr, dc] of deltas) {
      if (inBounds(r + dr, c + dc)) targets.push([r + dr, c + dc]);
    }
  } else if (moveType === 'Rook') {
    for (let i = Math.max(0, c - 3); i <= Math.min(size - 1, c + 3); i++) {
      if (i !== c) targets.push([r, i]);
    }
    for (let i = Math.max(0, r - 3); i <= Math.min(size - 1, r + 3); i++) {
      if (i !== r) targets.push([i, c]);
    }
  } else if (moveType === 'Bishop') {
    for (const [dr, dc] of [[-1,-1],[-1,1],[1,-1],[1,1]]) {
      let nr = r + dr, nc = c + dc, dist = 1;
      while (inBounds(nr, nc) && dist <= 3) { targets.push([nr, nc]); nr += dr; nc += dc; dist++; }
    }
  } else if (moveType === 'King') {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        if (inBounds(r + dr, c + dc)) targets.push([r + dr, c + dc]);
      }
    }
  } else if (moveType === 'Queen') {
    for (let i = Math.max(0, c - 3); i <= Math.min(size - 1, c + 3); i++) {
      if (i !== c) targets.push([r, i]);
    }
    for (let i = Math.max(0, r - 3); i <= Math.min(size - 1, r + 3); i++) {
      if (i !== r) targets.push([i, c]);
    }
    for (const [dr, dc] of [[-1,-1],[-1,1],[1,-1],[1,1]]) {
      let nr = r + dr, nc = c + dc, dist = 1;
      while (inBounds(nr, nc) && dist <= 3) { targets.push([nr, nc]); nr += dr; nc += dc; dist++; }
    }
  }
  return targets;
}

export class SleuthsGame {
  constructor() {
    this.size = 8;
    this.pieceCount = 8;
    this.camoMode = true;
    this.currentPlayer = 1;
    this.selectedPiece = null;
    this.validMoves = [];
    this.mastermindPos = null;
    this.investigated = new Set();
    this.clues = { 1: [], 2: [] };
    this.pieces = { 1: [], 2: [] };
    this.moveAssign = { 1: {}, 2: {} };
    this.boardData = [];
    this.phase = 'select'; // 'select' | 'move'
    
    this.initDom();
  }

  initDom() {
    this.setupContainer = document.getElementById('sleuths-setup');
    this.gameContainer  = document.getElementById('sleuths-game');
    
    this.board       = document.getElementById('sleuths-board');
    this.turnEl      = document.getElementById('sleuths-turn');
    this.phaseEl     = document.getElementById('sleuths-phase');
    this.logEntries  = document.getElementById('sleuths-log-entries');
    this.legendEl    = document.getElementById('sleuths-legend');

    document.getElementById('sleuths-start-btn').addEventListener('click', () => this.startFromSetup());
    document.getElementById('sleuths-new-game').addEventListener('click', () => {
      this.gameContainer.style.display = 'none';
      this.setupContainer.style.display = 'block';
    });
    
    const accuseBtn = document.getElementById('sleuths-accuse');
    accuseBtn.addEventListener('click', () => this.handleAccuseClick());
  }

  startFromSetup() {
    const sizeVal = parseInt(document.getElementById('sleuths-board-size').value);
    const countVal = document.getElementById('sleuths-piece-count').value;
    const camoVal = document.getElementById('sleuths-camo-mode').value;
    
    this.size = sizeVal;
    if (countVal === 'row') {
      this.pieceCount = this.size;
    } else {
      this.pieceCount = parseInt(countVal);
    }
    this.camoMode = camoVal === 'on';

    this.setupContainer.style.display = 'none';
    this.gameContainer.style.display = 'grid';
    this.initGame();
  }

  initGame() {
    this.currentPlayer = 1;
    this.selectedPiece = null;
    this.validMoves = [];
    this.investigated = new Set();
    this.clues = { 1: [], 2: [] };
    this.phase = 'select';
    this.boardData = [];
    this.pieces = { 1: [], 2: [] };
    this.moveAssign = { 1: {}, 2: {} };

    // Generate board
    for (let r = 0; r < this.size; r++) {
      let row = [];
      for (let c = 0; c < this.size; c++) {
        row.push({ color: COLORS[rand(COLORS.length)], symbol: SYMBOLS[rand(SYMBOLS.length)] });
      }
      this.boardData.push(row);
    }

    // Set Mastermind
    this.mastermindPos = [rand(this.size), rand(this.size)];

    // Assign Names and Moves
    let names1 = [];
    let names2 = [];
    
    if (this.camoMode) {
      names1 = shuffle(PIECE_NAMES).slice(0, this.pieceCount);
      names2 = shuffle(PIECE_NAMES).slice(0, this.pieceCount);
      for (let i = 0; i < this.pieceCount; i++) {
        this.moveAssign[1][names1[i]] = MOVE_NAMES[rand(MOVE_NAMES.length)];
        this.moveAssign[2][names2[i]] = MOVE_NAMES[rand(MOVE_NAMES.length)];
      }
    } else {
      for (let i = 0; i < this.pieceCount; i++) {
        const m1 = MOVE_NAMES[rand(MOVE_NAMES.length)];
        const m2 = MOVE_NAMES[rand(MOVE_NAMES.length)];
        // Add index to make names unique
        names1.push(`${m1} ${i+1}`);
        names2.push(`${m2} ${i+1}`);
        this.moveAssign[1][names1[i]] = m1;
        this.moveAssign[2][names2[i]] = m2;
      }
    }

    // Place Pieces
    for (let i = 0; i < this.pieceCount; i++) {
      const r1 = Math.floor(i / this.size);
      const c1 = i % this.size;
      this.pieces[1].push({ name: names1[i], r: r1, c: c1, player: 1 });

      const r2 = (this.size - 1) - Math.floor(i / this.size);
      const c2 = i % this.size;
      this.pieces[2].push({ name: names2[i], r: r2, c: c2, player: 2 });
    }

    this.renderBoard();
    this.renderLegend();
    this.clearLog();
    this.updateTurnUI();
  }

  clearLog() {
    this.logEntries.innerHTML = '<p class="log-empty">Move pieces onto tiles to gather clues.</p>';
  }

  addLog(text, player) {
    const empty = this.logEntries.querySelector('.log-empty');
    if (empty) empty.remove();
    const el = document.createElement('div');
    el.className = 'log-entry';
    el.innerHTML = `<strong>P${player}:</strong> ${text}`;
    this.logEntries.prepend(el);
  }

  updateTurnUI() {
    this.turnEl.textContent = `Player ${this.currentPlayer}'s Turn`;
    this.phaseEl.textContent = this.phase === 'select' ? 'Select a piece' : 'Select a destination or Accuse';
    
    const btn = document.getElementById('sleuths-accuse');
    if (this.selectedPiece) {
      btn.disabled = false;
      btn.textContent = `Accuse (${this.selectedPiece.r}, ${this.selectedPiece.c})`;
    } else {
      btn.disabled = true;
      btn.textContent = `Accuse Selection`;
    }

    // Handle Board Rotation Animation via CSS classes
    const wrapper = this.board.parentElement;
    if (this.currentPlayer === 1) {
      wrapper.classList.add('rotated-180');
    } else {
      wrapper.classList.remove('rotated-180');
    }
  }

  renderLegend() {
    this.legendEl.innerHTML = '<h4>Your Team</h4>';
    Object.entries(this.moveAssign[this.currentPlayer]).forEach(([piece, move]) => {
      const el = document.createElement('div');
      el.className = 'legend-item';
      let displayName = this.camoMode ? piece : piece.split(' ')[0];
      el.textContent = `${displayName}: ${MOVE_ICONS[move]} ${move}`;
      this.legendEl.appendChild(el);
    });
  }

  renderBoard() {
    this.board.innerHTML = '';
    this.board.style.gridTemplateColumns = `repeat(${this.size}, 1fr)`;

    const maxBoardWidth = 600;
    const cellSize = Math.floor(maxBoardWidth / this.size) - 4;

    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        const cellData = this.boardData[r][c];
        const cell = document.createElement('div');
        cell.className = `board-cell color-${cellData.color}`;
        cell.style.width = `${cellSize}px`;
        cell.style.height = `${cellSize}px`;
        cell.dataset.r = r;
        cell.dataset.c = c;
        cell.dataset.coord = `${r},${c}`;

        const key = `${r},${c}`;
        if (this.investigated.has(key)) cell.classList.add('investigated');

        const symbolEl = document.createElement('div');
        symbolEl.className = 'cell-symbol';
        symbolEl.textContent = cellData.symbol;
        cell.appendChild(symbolEl);

        let piece = null;
        for (const p of [1, 2]) {
          const found = this.pieces[p].find(pi => pi.r === r && pi.c === c);
          if (found) { piece = found; break; }
        }

        if (piece) {
          cell.classList.add(piece.player === 1 ? 'p1-piece' : 'p2-piece');
          const icon = document.createElement('div');
          icon.className = 'piece-icon';
          const moveType = this.moveAssign[piece.player][piece.name];
          icon.textContent = this.camoMode ? '♟' : CLASSIC_ICONS[moveType];
          
          const label = document.createElement('div');
          label.className = 'piece-label';
          label.style.pointerEvents = 'none';
          label.textContent = this.camoMode ? `${MOVE_ICONS[moveType]} ${moveType}` : piece.name.split(' ')[0];
          
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
      const piece = this.pieces[this.currentPlayer].find(p => p.r === r && p.c === c);
      if (piece) {
        if (this.selectedPiece === piece) {
          this.selectedPiece = null;
          this.validMoves = [];
        } else {
          this.selectedPiece = piece;
          const moveType = this.moveAssign[this.currentPlayer][piece.name];
          this.validMoves = this.getFilteredMoves(moveType, r, c);
          this.phase = 'move';
        }
        this.renderBoard();
        this.updateTurnUI();
      }
    } else if (this.phase === 'move') {
      if (this.validMoves.some(([vr, vc]) => vr === r && vc === c)) {
        this.movePiece(this.selectedPiece, r, c);
      } else {
        const piece = this.pieces[this.currentPlayer].find(p => p.r === r && p.c === c);
        if (piece) {
          this.selectedPiece = piece;
          const moveType = this.moveAssign[this.currentPlayer][piece.name];
          this.validMoves = this.getFilteredMoves(moveType, r, c);
          this.phase = 'move';
          this.renderBoard();
          this.updateTurnUI();
        } else {
          this.selectedPiece = null;
          this.validMoves = [];
          this.phase = 'select';
          this.renderBoard();
          this.updateTurnUI();
        }
      }
    }
  }

  getFilteredMoves(moveType, r, c) {
    const rawTargets = getMoveTargets(moveType, r, c, this.size);
    return rawTargets.filter(([tr, tc]) =>
      !this.pieces[this.currentPlayer].some(p => p.r === tr && p.c === tc)
    );
  }

  generateClue(targetR, targetC, fromR, fromC) {
    const targetCell = this.boardData[targetR][targetC];
    const fromCell = this.boardData[fromR][fromC];
    
    // ● Circle: Color/Shape clues
    if (fromCell.symbol === '●') {
      if (rand(2) === 0) {
        const wrongColors = COLORS.filter(c => c !== targetCell.color);
        return `The Mastermind is NOT on a ${wrongColors[rand(wrongColors.length)]} tile.`;
      } else {
        return targetCell.symbol === fromCell.symbol ? 
          `The Mastermind is on a Circle (●).` : 
          `The Mastermind is NOT on a Circle (●).`;
      }
    } 
    // ■ Square: Grid Positioning clues
    else if (fromCell.symbol === '■') {
      if (rand(2) === 0) {
        const isTargetRowEven = targetR % 2 === 0;
        return `The Mastermind is in an ${isTargetRowEven ? 'Even' : 'Odd'} row.`;
      } else {
        let wrongRow;
        do { wrongRow = rand(this.size); } while (wrongRow === targetR);
        return `The Mastermind is NOT in Row ${wrongRow + 1}.`;
      }
    }
    // ▲ Triangle: Adjacency/Distance clues
    else {
      const adjSymbols = new Set();
      for(let dr=-1; dr<=1; dr++){
        for(let dc=-1; dc<=1; dc++){
          if(dr===0 && dc===0) continue;
          let nr = targetR+dr, nc = targetC+dc;
          if(nr>=0 && nr<this.size && nc>=0 && nc<this.size) {
            adjSymbols.add(this.boardData[nr][nc].symbol);
          }
        }
      }
      const arrAdj = Array.from(adjSymbols);
      if (arrAdj.length > 0) {
        const randAdjSymbol = arrAdj[rand(arrAdj.length)];
        return `The Mastermind is adjacent to a ${randAdjSymbol} tile.`;
      }
      return `The Mastermind is far away.`; // fallback
    }
  }

  movePiece(piece, toR, toC) {
    const enemyPlayer = this.currentPlayer === 1 ? 2 : 1;
    const enemyPieceIdx = this.pieces[enemyPlayer].findIndex(p => p.r === toR && p.c === toC);
    if (enemyPieceIdx !== -1) {
      const enemyName = this.pieces[enemyPlayer][enemyPieceIdx].name;
      this.pieces[enemyPlayer].splice(enemyPieceIdx, 1);
      this.addLog(`Captured enemy ${enemyName}!`, this.currentPlayer);
    }

    piece.r = toR;
    piece.c = toC;
    const key = `${toR},${toC}`;
    const alreadyInvestigated = this.investigated.has(key);
    this.investigated.add(key);

    if (!alreadyInvestigated) {
      let clue = this.generateClue(this.mastermindPos[0], this.mastermindPos[1], toR, toC);
      let attempts = 0;
      while (this.clues[this.currentPlayer].includes(clue) && attempts < 10) {
         clue = this.generateClue(this.mastermindPos[0], this.mastermindPos[1], toR, toC);
         attempts++;
      }

      if (this.clues[this.currentPlayer].includes(clue)) {
         this.addLog(`[${this.boardData[toR][toC].symbol}] No new clue found here.`, this.currentPlayer);
      } else {
         this.clues[this.currentPlayer].push(clue);
         this.addLog(`[${this.boardData[toR][toC].symbol}] ${clue}`, this.currentPlayer);
      }
    } else {
      this.addLog(`This tile was already investigated.`, this.currentPlayer);
    }

    // Passive Abilities
    if (this.camoMode) {
      if (piece.name === 'Profiler' && this.boardData[toR][toC].color === this.boardData[this.mastermindPos[0]][this.mastermindPos[1]].color) {
        showAlert('Profiler Instinct', `The Profiler feels a strong presence... The Mastermind is on a ${this.boardData[toR][toC].color} tile!`);
        this.addLog(`Profiler detected the Mastermind's color!`, this.currentPlayer);
      }
      if (piece.name === 'Inspector') {
        for(let dr=-1; dr<=1; dr++){
          for(let dc=-1; dc<=1; dc++){
            if(dr===0 && dc===0) continue;
            let nr = toR+dr, nc = toC+dc;
            if(nr>=0 && nr<this.size && nc>=0 && nc<this.size) {
              this.investigated.add(`${nr},${nc}`);
            }
          }
        }
        this.addLog(`Inspector burned all adjacent tiles.`, this.currentPlayer);
      }
    }

    this.selectedPiece = null;
    this.validMoves = [];
    this.phase = 'select';
    this.renderBoard();

    const nextPlayer = this.currentPlayer === 1 ? 2 : 1;
    showHotseat(`Player ${nextPlayer}'s turn is next. Pass the device, then press Ready.`, () => {
      this.currentPlayer = nextPlayer;
      this.renderLegend();
      this.updateTurnUI();
    });
  }

  handleAccuseClick() {
    if (!this.selectedPiece) return;
    const r = this.selectedPiece.r;
    const c = this.selectedPiece.c;
    const [mr, mc] = this.mastermindPos;
    
    if (r === mr && c === mc) {
      showVictory(`Player ${this.currentPlayer}`, `The Mastermind was found at ${mr},${mc}. Case closed!`, () => {
        this.gameContainer.style.display = 'none';
        this.setupContainer.style.display = 'block';
      });
    } else {
      this.addLog(`❌ Wrong accusation! ${r},${c} is innocent.`, this.currentPlayer);
      
      const nextPlayer = this.currentPlayer === 1 ? 2 : 1;
      showVictory(`Player ${nextPlayer}`, `Player ${this.currentPlayer} accused the wrong tile and lost!`, () => {
        this.gameContainer.style.display = 'none';
        this.setupContainer.style.display = 'block';
      });
    }
  }
}
