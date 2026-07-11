// src/games/whispers.js — Whispers in the Dark: Asymmetric node-based fugitive/detective game

import { showVictory, showHotseat } from '../app.js';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function rand(n) { return Math.floor(Math.random() * n); }

const NODE_DEFS = [
  { id: 'hideout',   label: 'Hideout',    icon: '🏚️', color: '#ff3d57' },
  { id: 'station',   label: 'Station',    icon: '🚉', color: '#00e5ff' },
  { id: 'bank',      label: 'Bank',       icon: '🏦', color: '#ffa726' },
  { id: 'park',      label: 'Park',       icon: '🌳', color: '#00e676' },
  { id: 'docks',     label: 'Docks',      icon: '⚓', color: '#b040ff' },
  { id: 'market',    label: 'Market',     icon: '🏪', color: '#e8ecf4' },
  { id: 'rooftop',   label: 'Rooftop',    icon: '🏙️', color: '#ff7043' },
  { id: 'warehouse', label: 'Warehouse',  icon: '🏭', color: '#78909c' },
];

// Generate random planar-ish positions for nodes
function generatePositions(nodes) {
  const positions = {};
  nodes.forEach((n, i) => {
    const angle = (i / nodes.length) * Math.PI * 2;
    const radius = 35 + rand(12);
    positions[n.id] = {
      x: 50 + radius * Math.cos(angle),
      y: 50 + radius * Math.sin(angle),
    };
  });
  return positions;
}

// Generate random edges (ensure connected)
function generateEdges(nodes) {
  const ids = nodes.map(n => n.id);
  const edges = new Set();
  const addEdge = (a, b) => {
    const key = [a, b].sort().join('-');
    edges.add(key);
  };
  // Span tree first (ensure connectivity)
  const shuffled = shuffle(ids);
  for (let i = 1; i < shuffled.length; i++) {
    addEdge(shuffled[i], shuffled[Math.floor(Math.random() * i)]);
  }
  // Extra random edges
  const extraEdges = 3 + rand(4);
  for (let e = 0; e < extraEdges; e++) {
    const a = ids[rand(ids.length)];
    const b = ids[rand(ids.length)];
    if (a !== b) addEdge(a, b);
  }
  return [...edges].map(key => key.split('-'));
}

function getNeighbors(nodeId, edges) {
  return edges
    .filter(([a, b]) => a === nodeId || b === nodeId)
    .map(([a, b]) => a === nodeId ? b : a);
}

export class WhispersGame {
  constructor() {
    this.fugitivePlayer = 1;
    this.detectivePlayer = 2;
    this.currentRole = 'fugitive'; // 'fugitive' or 'detective'
    this.nodes = [];
    this.edges = [];
    this.positions = {};
    this.fugitivePos = null;
    this.detectivePos = null;
    this.exitNode = null;
    this.noiseMap = {}; // nodeId -> noise level 0-100
    this.turnCount = 0;
    this.gameOver = false;

    this.initDom();
    this.startGame();
  }

  initDom() {
    this.turnEl      = document.getElementById('whispers-turn');
    this.logEntries  = document.getElementById('whispers-log-entries');
    this.networkEl   = document.getElementById('whispers-network');
    this.actionsEl   = document.getElementById('whispers-actions');
    this.noiseNodes  = document.getElementById('whispers-noise-nodes');
    this.fugBadge    = document.getElementById('whispers-fugitive-badge');
    this.detBadge    = document.getElementById('whispers-detective-badge');
    this.fugPlayer   = document.getElementById('whispers-fugitive-player');
    this.detPlayer   = document.getElementById('whispers-detective-player');

    document.getElementById('whispers-new-game').addEventListener('click', () => this.startGame());
  }

  startGame() {
    this.gameOver = false;
    this.turnCount = 0;
    this.currentRole = 'fugitive';
    this.nodes = [...NODE_DEFS];
    this.edges = generateEdges(this.nodes);
    this.positions = generatePositions(this.nodes);
    this.noiseMap = {};
    this.nodes.forEach(n => { this.noiseMap[n.id] = 0; });

    // Pick start positions
    const ids = this.nodes.map(n => n.id);
    const shuffledIds = shuffle(ids);
    this.fugitivePos  = shuffledIds[0];
    this.detectivePos = shuffledIds[1];
    // Pick exit node (not start positions)
    const remaining = shuffledIds.filter(id => id !== this.fugitivePos && id !== this.detectivePos);
    this.exitNode = remaining[rand(remaining.length)];

    // Lay noise on start
    this.noiseMap[this.fugitivePos] = 80;

    this.clearLog();
    this.addLog('🕵️ A new hunt begins! Fugitive moves first — Fugitive has 8 turns to reach the exit.', null);
    this.renderRoles();
    this.renderNetwork();
    this.renderActions();
    this.renderNoiseDisplay();
    this.updateTurnUI();
  }

  clearLog() {
    this.logEntries.innerHTML = '<p class="log-empty">Detective pings will appear here.</p>';
  }

  addLog(text, role) {
    const empty = this.logEntries.querySelector('.log-empty');
    if (empty) empty.remove();
    const el = document.createElement('div');
    el.className = `log-entry${role === 'detective' ? '' : ' p2-entry'}`;
    el.textContent = text;
    this.logEntries.prepend(el);
  }

  updateTurnUI() {
    const player = this.currentRole === 'fugitive' ? this.fugitivePlayer : this.detectivePlayer;
    this.turnEl.textContent = `${this.currentRole === 'fugitive' ? '🦹 Fugitive' : '🕵️ Detective'} — Player ${player}`;
    this.turnEl.style.borderLeftColor = this.currentRole === 'fugitive' ? 'var(--red)' : 'var(--cyan)';
  }

  renderRoles() {
    this.fugPlayer.textContent = `Player ${this.fugitivePlayer}`;
    this.detPlayer.textContent = `Player ${this.detectivePlayer}`;
  }

  renderNetwork() {
    this.networkEl.innerHTML = '';
    const bounds = this.networkEl.getBoundingClientRect();
    const W = bounds.width || 600;
    const H = bounds.height || 480;

    // Draw SVG edges
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.style.position = 'absolute';
    svg.style.inset = '0';
    svg.style.pointerEvents = 'none';

    this.edges.forEach(([a, b]) => {
      const pa = this.positions[a];
      const pb = this.positions[b];
      if (!pa || !pb) return;
      const x1 = pa.x / 100 * W;
      const y1 = pa.y / 100 * H;
      const x2 = pb.x / 100 * W;
      const y2 = pb.y / 100 * H;
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', x1);
      line.setAttribute('y1', y1);
      line.setAttribute('x2', x2);
      line.setAttribute('y2', y2);
      line.setAttribute('stroke', 'rgba(255,255,255,0.1)');
      line.setAttribute('stroke-width', '2');
      svg.appendChild(line);
    });
    this.networkEl.appendChild(svg);

    // Draw nodes
    this.nodes.forEach(node => {
      const pos = this.positions[node.id];
      if (!pos) return;

      const el = document.createElement('div');
      el.className = 'network-node';
      el.id = `whispers-node-${node.id}`;
      el.style.left = `${pos.x}%`;
      el.style.top  = `${pos.y}%`;

      const circle = document.createElement('div');
      circle.className = 'node-circle';

      // Apply state classes
      if (node.id === this.fugitivePos)  el.classList.add('fugitive-here');
      if (node.id === this.detectivePos) el.classList.add('detective-here');
      if (node.id === this.exitNode)     el.classList.add('exit-node');

      const noise = this.noiseMap[node.id] || 0;
      if (noise > 30) el.classList.add('noisy');

      const iconEl = document.createElement('div');
      iconEl.style.fontSize = '1.4rem';
      iconEl.textContent = node.id === this.exitNode ? '🚪' : node.icon;

      circle.appendChild(iconEl);

      // Noise bar inside circle
      const noiseBar = document.createElement('div');
      noiseBar.className = 'noise-bar';
      noiseBar.style.position = 'absolute';
      noiseBar.style.bottom = '6px';
      noiseBar.style.left = '8px';
      noiseBar.style.right = '8px';
      const noiseFill = document.createElement('div');
      noiseFill.className = 'noise-fill';
      noiseFill.style.width = `${noise}%`;
      noiseBar.appendChild(noiseFill);
      circle.appendChild(noiseBar);

      el.appendChild(circle);

      const labelEl = document.createElement('div');
      labelEl.className = 'node-label';
      labelEl.textContent = node.label;
      el.appendChild(labelEl);

      el.addEventListener('click', () => this.handleNodeClick(node.id));
      this.networkEl.appendChild(el);
    });
  }

  handleNodeClick(nodeId) {
    if (this.gameOver) return;
    if (this.currentRole === 'fugitive') {
      this.moveFugitive(nodeId);
    } else {
      this.moveDetective(nodeId);
    }
  }

  moveFugitive(nodeId) {
    const neighbors = getNeighbors(this.fugitivePos, this.edges);
    if (!neighbors.includes(nodeId) && nodeId !== this.fugitivePos) return;
    if (nodeId === this.fugitivePos) return;

    const prevPos = this.fugitivePos;
    this.fugitivePos = nodeId;
    this.turnCount++;

    // Lay noise trail
    this.noiseMap[nodeId] = Math.min(100, (this.noiseMap[nodeId] || 0) + 60);
    // Decay all noise
    this.nodes.forEach(n => {
      if (n.id !== nodeId) {
        this.noiseMap[n.id] = Math.max(0, (this.noiseMap[n.id] || 0) - 15);
      }
    });

    this.renderNetwork();
    this.renderNoiseDisplay();

    // Check win
    if (nodeId === this.exitNode) {
      this.gameOver = true;
      this.addLog(`🦹 Fugitive escaped through the ${this.getNode(nodeId).label}!`, 'fugitive');
      showVictory(`Player ${this.fugitivePlayer} (Fugitive)`, 'Freedom achieved — escaped through the exit!', () => this.startGame());
      return;
    }

    // Check capture
    if (nodeId === this.detectivePos) {
      this.gameOver = true;
      this.addLog(`🕵️ Fugitive walked into the Detective!`, 'detective');
      showVictory(`Player ${this.detectivePlayer} (Detective)`, 'Fugitive walked right into you!', () => this.startGame());
      return;
    }

    // Pass to detective
    const nextPlayer = this.detectivePlayer;
    showHotseat(`Detective (Player ${nextPlayer})'s turn. Pass the device, then press Ready.`, () => {
      this.currentRole = 'detective';
      this.updateTurnUI();
      this.renderActions();
    });
  }

  moveDetective(nodeId) {
    const neighbors = getNeighbors(this.detectivePos, this.edges);
    if (!neighbors.includes(nodeId) && nodeId !== this.detectivePos) return;
    if (nodeId === this.detectivePos) return;

    this.detectivePos = nodeId;

    this.renderNetwork();
    this.renderNoiseDisplay();

    // Check capture
    if (nodeId === this.fugitivePos) {
      this.gameOver = true;
      this.addLog(`🕵️ Detective found the Fugitive at the ${this.getNode(nodeId).label}!`, 'detective');
      showVictory(`Player ${this.detectivePlayer} (Detective)`, 'Fugitive caught red-handed!', () => this.startGame());
      return;
    }

    const noise = this.noiseMap[nodeId] || 0;
    const noiseLevel = noise > 60 ? 'Very Hot' : noise > 30 ? 'Warm' : noise > 10 ? 'Cool' : 'Cold';
    this.addLog(`📡 Noise at ${this.getNode(nodeId).label}: ${noiseLevel} (${Math.round(noise)}%)`, 'detective');

    // Pass back to fugitive
    const nextPlayer = this.fugitivePlayer;
    showHotseat(`Fugitive (Player ${nextPlayer})'s turn. Pass the device, then press Ready.`, () => {
      this.currentRole = 'fugitive';
      this.updateTurnUI();
      this.renderActions();
    });
  }

  renderActions() {
    this.actionsEl.innerHTML = '';

    if (this.currentRole === 'fugitive') {
      const neighbors = getNeighbors(this.fugitivePos, this.edges);
      const label = document.createElement('span');
      label.style.fontSize = '0.82rem';
      label.style.color = 'var(--muted)';
      label.textContent = '🦹 Move to a connected node:';
      this.actionsEl.appendChild(label);

      neighbors.forEach(nId => {
        const node = this.getNode(nId);
        if (!node) return;
        const btn = document.createElement('button');
        btn.className = 'action-btn';
        btn.textContent = `${node.icon} ${node.label}`;
        btn.addEventListener('click', () => this.moveFugitive(nId));
        this.actionsEl.appendChild(btn);
      });
    } else {
      const neighbors = getNeighbors(this.detectivePos, this.edges);
      const label = document.createElement('span');
      label.style.fontSize = '0.82rem';
      label.style.color = 'var(--muted)';
      label.textContent = '🕵️ Move to a connected node (noise levels shown in log):';
      this.actionsEl.appendChild(label);

      neighbors.forEach(nId => {
        const node = this.getNode(nId);
        if (!node) return;
        const noise = this.noiseMap[nId] || 0;
        const btn = document.createElement('button');
        btn.className = 'action-btn detective-action';
        btn.textContent = `${node.icon} ${node.label} (${Math.round(noise)}% noise)`;
        btn.addEventListener('click', () => this.moveDetective(nId));
        this.actionsEl.appendChild(btn);
      });
    }
  }

  renderNoiseDisplay() {
    this.noiseNodes.innerHTML = '';
    // Show top 5 noisiest nodes
    const sorted = this.nodes
      .map(n => ({ ...n, noise: this.noiseMap[n.id] || 0 }))
      .sort((a, b) => b.noise - a.noise)
      .slice(0, 5);

    sorted.forEach(n => {
      const item = document.createElement('div');
      item.className = 'noise-node-item';
      const name = document.createElement('span');
      name.className = 'noise-node-name';
      name.textContent = n.label;
      const barWrap = document.createElement('div');
      barWrap.className = 'noise-node-bar';
      const fill = document.createElement('div');
      fill.className = 'noise-node-fill';
      fill.style.width = `${n.noise}%`;
      barWrap.appendChild(fill);
      item.appendChild(name);
      item.appendChild(barWrap);
      this.noiseNodes.appendChild(item);
    });
  }

  getNode(id) {
    return this.nodes.find(n => n.id === id);
  }
}
