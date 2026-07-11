// src/games/evidence.js — Rules of Evidence: Procedural logic deduction race

import { showVictory, showHotseat } from '../app.js';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const SUSPECTS  = ['Aldric', 'Beatrix', 'Cato'];
const WEAPONS   = ['Poison', 'Blade', 'Garrote'];
const ROOMS     = ['Library', 'Garden', 'Vault'];
const MOTIVES   = ['Greed', 'Revenge', 'Silence'];

// Generate a unique random solution
function generateSolution() {
  const wOrder = shuffle([0, 1, 2]);
  const rOrder = shuffle([0, 1, 2]);
  const mOrder = shuffle([0, 1, 2]);
  // solution[i] = { suspect: SUSPECTS[i], weapon: WEAPONS[wOrder[i]], room: ROOMS[rOrder[i]], motive: MOTIVES[mOrder[i]] }
  return SUSPECTS.map((s, i) => ({
    suspect: s,
    weapon:  WEAPONS[wOrder[i]],
    room:    ROOMS[rOrder[i]],
    motive:  MOTIVES[mOrder[i]],
  }));
}

// Generate pool of clue statements from a solution
function generateCluePool(solution) {
  const pool = [];
  solution.forEach(row => {
    pool.push({ text: `${row.suspect} used the ${row.weapon}.`,        rel: [row.suspect, row.weapon]  });
    pool.push({ text: `${row.suspect} was in the ${row.room}.`,        rel: [row.suspect, row.room]    });
    pool.push({ text: `${row.suspect} had a motive of ${row.motive}.`, rel: [row.suspect, row.motive]  });
    pool.push({ text: `The ${row.weapon} was found in the ${row.room}.`, rel: [row.weapon, row.room]   });
  });
  // Add some negative clues
  solution.forEach(row => {
    const otherSuspects = SUSPECTS.filter(s => s !== row.suspect);
    otherSuspects.forEach(other => {
      pool.push({ text: `${other} did NOT use the ${row.weapon}.`,        rel: [other, row.weapon], negative: true });
      pool.push({ text: `${other} was NOT in the ${row.room}.`,           rel: [other, row.room], negative: true });
    });
  });
  return shuffle(pool);
}

export class EvidenceGame {
  constructor() {
    this.currentPlayer = 1;
    this.points = { 1: 5, 2: 5 };
    this.solution = null;
    this.cluePool = [];
    this.revealedClues = [];
    this.queryCost = 1;

    this.initDom();
    this.startGame();
  }

  initDom() {
    this.turnEl     = document.getElementById('evidence-turn');
    this.p1PointsEl = document.getElementById('evidence-p1-points');
    this.p2PointsEl = document.getElementById('evidence-p2-points');
    this.logEntries = document.getElementById('evidence-log-entries');
    this.matrixArea = document.getElementById('evidence-matrix-area');
    this.queryArea  = document.getElementById('evidence-query-area');
    this.solveModal = document.getElementById('evidence-solve-modal');
    this.solveForm  = document.getElementById('evidence-solve-form');

    document.getElementById('evidence-new-game').addEventListener('click', () => this.startGame());
    document.getElementById('evidence-solve').addEventListener('click', () => this.openSolveModal());
    document.getElementById('evidence-confirm-solve').addEventListener('click', () => this.confirmSolve());
    document.getElementById('evidence-cancel-solve').addEventListener('click', () => {
      this.solveModal.style.display = 'none';
    });
  }

  startGame() {
    this.currentPlayer = 1;
    this.points = { 1: 5, 2: 5 };
    this.solution = generateSolution();
    this.cluePool = generateCluePool(this.solution);
    this.revealedClues = [];

    // Player matrices for tracking
    this.playerMatrix = {
      1: this.makeBlankMatrix(),
      2: this.makeBlankMatrix(),
    };

    this.renderMatrix();
    this.renderQueryButtons();
    this.clearLog();
    this.updateUI();
  }

  makeBlankMatrix() {
    // matrix[suspect][category] = null | 'yes' | 'no'
    const m = {};
    SUSPECTS.forEach(s => {
      m[s] = {};
      [...WEAPONS, ...ROOMS, ...MOTIVES].forEach(c => { m[s][c] = null; });
    });
    return m;
  }

  clearLog() {
    this.logEntries.innerHTML = '<p class="log-empty">Query relationships to gather evidence clues.</p>';
  }

  addLog(text, player) {
    const empty = this.logEntries.querySelector('.log-empty');
    if (empty) empty.remove();
    const el = document.createElement('div');
    el.className = `log-entry${player === 2 ? ' p2-entry' : ''}`;
    el.textContent = `P${player}: ${text}`;
    this.logEntries.prepend(el);
  }

  updateUI() {
    this.turnEl.textContent = `Player ${this.currentPlayer}'s Turn`;
    this.turnEl.style.borderLeftColor = this.currentPlayer === 1 ? 'var(--cyan)' : 'var(--amber)';
    this.p1PointsEl.textContent = this.points[1];
    this.p2PointsEl.textContent = this.points[2];
  }

  renderMatrix() {
    const categories = [...WEAPONS, ...ROOMS, ...MOTIVES];
    const matrix = this.playerMatrix[this.currentPlayer];

    const div = document.createElement('div');
    div.className = 'evidence-matrix';
    const table = document.createElement('table');
    table.className = 'matrix-table';

    // Header row
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headerRow.appendChild(Object.assign(document.createElement('th'), { textContent: 'Suspect' }));
    categories.forEach(cat => {
      const th = document.createElement('th');
      th.textContent = cat;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Body rows
    const tbody = document.createElement('tbody');
    SUSPECTS.forEach(suspect => {
      const tr = document.createElement('tr');
      const th = document.createElement('th');
      th.className = 'row-header';
      th.textContent = suspect;
      tr.appendChild(th);

      categories.forEach(cat => {
        const td = document.createElement('td');
        const val = matrix[suspect]?.[cat];
        if (val === 'yes') { td.className = 'cell-yes'; td.textContent = '✓'; }
        else if (val === 'no') { td.className = 'cell-no'; td.textContent = '✗'; }
        else { td.className = 'cell-maybe'; td.textContent = '?'; }

        td.addEventListener('click', () => {
          // Toggle manually
          const current = matrix[suspect][cat];
          const next = current === null ? 'yes' : current === 'yes' ? 'no' : null;
          matrix[suspect][cat] = next;
          this.renderMatrix();
        });
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    div.appendChild(table);

    this.matrixArea.innerHTML = '';
    this.matrixArea.appendChild(div);
  }

  renderQueryButtons() {
    this.queryArea.innerHTML = '';
    const title = document.createElement('h3');
    title.textContent = '🔍 Spend 1 point to query a relationship';
    this.queryArea.appendChild(title);

    const grid = document.createElement('div');
    grid.className = 'query-grid';

    // Generate query pairings
    const categories = [...WEAPONS, ...ROOMS, ...MOTIVES];
    const queries = [];
    SUSPECTS.forEach(s => {
      categories.forEach(c => {
        queries.push({ label: `${s} + ${c}?`, suspect: s, category: c });
      });
    });

    shuffle(queries).slice(0, 12).forEach(q => {
      const btn = document.createElement('button');
      btn.className = 'query-btn';
      btn.textContent = q.label;
      btn.disabled = this.points[this.currentPlayer] < this.queryCost;
      btn.addEventListener('click', () => this.executeQuery(q.suspect, q.category));
      grid.appendChild(btn);
    });

    // Refresh queries button
    const refresh = document.createElement('button');
    refresh.className = 'query-btn';
    refresh.style.borderColor = 'var(--muted)';
    refresh.style.color = 'var(--muted)';
    refresh.textContent = '↺ Refresh queries (free)';
    refresh.addEventListener('click', () => this.renderQueryButtons());
    grid.appendChild(refresh);

    // End turn button
    const endTurn = document.createElement('button');
    endTurn.className = 'query-btn';
    endTurn.style.borderColor = 'var(--emerald)';
    endTurn.style.color = 'var(--emerald)';
    endTurn.textContent = '✓ End Turn (pass device)';
    endTurn.addEventListener('click', () => this.endTurn());
    grid.appendChild(endTurn);

    this.queryArea.appendChild(grid);
  }

  executeQuery(suspect, category) {
    if (this.points[this.currentPlayer] < this.queryCost) return;
    this.points[this.currentPlayer] -= this.queryCost;

    // Look up in solution
    const row = this.solution.find(r => r.suspect === suspect);
    const isYes = row && (row.weapon === category || row.room === category || row.motive === category);
    const answer = isYes ? '✓ YES' : '✗ NO';
    const clueText = `${suspect} — ${category}: ${answer}`;

    // Auto-fill matrix
    this.playerMatrix[this.currentPlayer][suspect][category] = isYes ? 'yes' : 'no';

    this.addLog(clueText, this.currentPlayer);
    this.renderMatrix();
    this.renderQueryButtons();
    this.updateUI();

    // Give points back every 3 turns to keep game flowing
    if (this.points[this.currentPlayer] === 0) {
      this.points[this.currentPlayer] = 3;
      this.addLog('🎁 Refilled 3 inquiry points!', this.currentPlayer);
      this.updateUI();
      this.renderQueryButtons();
    }
  }

  endTurn() {
    const next = this.currentPlayer === 1 ? 2 : 1;
    showHotseat(
      `Player ${next}'s turn. Pass the device then press Ready.`,
      () => {
        this.currentPlayer = next;
        this.renderMatrix();
        this.renderQueryButtons();
        this.updateUI();
      }
    );
  }

  openSolveModal() {
    this.solveModal.style.display = 'flex';
    this.solveForm.innerHTML = '';
    SUSPECTS.forEach(suspect => {
      const row = document.createElement('div');
      row.className = 'solve-row';

      const label = document.createElement('label');
      label.textContent = suspect;

      const makeSelect = (options, placeholder) => {
        const sel = document.createElement('select');
        sel.className = 'solve-select';
        sel.dataset.suspect = suspect;
        sel.dataset.type = placeholder;
        const opt0 = document.createElement('option');
        opt0.value = '';
        opt0.textContent = `— ${placeholder} —`;
        sel.appendChild(opt0);
        options.forEach(o => {
          const opt = document.createElement('option');
          opt.value = o;
          opt.textContent = o;
          sel.appendChild(opt);
        });
        return sel;
      };

      row.appendChild(label);
      row.appendChild(makeSelect(WEAPONS, 'Weapon'));
      row.appendChild(makeSelect(ROOMS, 'Room'));
      row.appendChild(makeSelect(MOTIVES, 'Motive'));
      this.solveForm.appendChild(row);
    });
  }

  confirmSolve() {
    const rows = this.solveForm.querySelectorAll('.solve-row');
    let allCorrect = true;
    let allFilled = true;

    rows.forEach(row => {
      const suspect = row.querySelector('[data-type="Weapon"]').dataset.suspect;
      const weapon  = row.querySelector('[data-type="Weapon"]').value;
      const room    = row.querySelector('[data-type="Room"]').value;
      const motive  = row.querySelector('[data-type="Motive"]').value;
      if (!weapon || !room || !motive) { allFilled = false; return; }

      const correct = this.solution.find(s =>
        s.suspect === suspect && s.weapon === weapon && s.room === room && s.motive === motive
      );
      if (!correct) allCorrect = false;
    });

    if (!allFilled) { alert('Please fill in all selections before submitting.'); return; }

    this.solveModal.style.display = 'none';
    if (allCorrect) {
      showVictory(`Player ${this.currentPlayer}`, 'All suspects matched perfectly — case cracked!', () => this.startGame());
    } else {
      this.addLog('❌ Wrong solution! Opponent wins by default.', this.currentPlayer);
      const other = this.currentPlayer === 1 ? 2 : 1;
      showVictory(`Player ${other}`, `P${this.currentPlayer} submitted a wrong solution!`, () => this.startGame());
    }
  }
}
