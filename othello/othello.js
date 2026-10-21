(() => {
  const SIZE = 8;
  const EMPTY = 0, BLACK = 1, WHITE = 2;
  const DIRS = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];

  let mode = null;
  let board = [];
  let current = BLACK;
  let myColor = BLACK;
  let gameActive = false;
  let isHost = false;
  let peer = null;
  let conn = null;

  // DOM
  const modeSelect = document.getElementById('mode-select');
  const onlinePanel = document.getElementById('online-panel');
  const gameArea = document.getElementById('game-area');
  const boardEl = document.getElementById('othello-board');
  const scoreBlack = document.getElementById('score-black');
  const scoreWhite = document.getElementById('score-white');
  const turnIndicator = document.getElementById('turn-indicator');
  const playerInfo = document.getElementById('player-info');
  const connStatus = document.getElementById('conn-status');
  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlay-title');
  const overlayMessage = document.getElementById('overlay-message');

  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      mode = btn.dataset.mode;
      if (mode === 'online') {
        modeSelect.classList.add('hidden');
        onlinePanel.classList.remove('hidden');
      } else {
        myColor = BLACK;
        startGame();
      }
    });
  });

  document.getElementById('back-to-mode').addEventListener('click', () => {
    onlinePanel.classList.add('hidden');
    modeSelect.classList.remove('hidden');
    cleanupPeer();
  });

  document.getElementById('create-room-btn').addEventListener('click', createRoom);
  document.getElementById('join-room-btn').addEventListener('click', joinRoom);
  document.getElementById('restart-btn').addEventListener('click', () => {
    if (mode === 'online' && conn?.open) conn.send({ type: 'restart' });
    initBoard();
    overlay.classList.remove('visible');
  });
  document.getElementById('leave-btn').addEventListener('click', leaveGame);
  document.getElementById('overlay-restart').addEventListener('click', () => {
    overlay.classList.remove('visible');
    if (mode === 'online' && conn?.open) conn.send({ type: 'restart' });
    initBoard();
  });

  function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  }

  function showStatus(msg, type) {
    connStatus.textContent = msg;
    connStatus.className = 'connection-status visible ' + type;
  }

  function createRoom() {
    const roomCode = generateRoomCode();
    isHost = true;
    myColor = BLACK;

    peer = new Peer('oth-' + roomCode, { debug: 1 });

    peer.on('open', () => {
      showStatus(`ルーム作成完了！ コード: ${roomCode} — 相手の参加を待っています...`, 'waiting');
      const codeDiv = document.createElement('div');
      codeDiv.className = 'room-code-display';
      codeDiv.id = 'room-code-show';
      codeDiv.textContent = roomCode;
      if (!document.getElementById('room-code-show')) {
        connStatus.parentNode.insertBefore(codeDiv, connStatus);
      }
    });

    peer.on('connection', (c) => {
      conn = c;
      setupConnection();
    });

    peer.on('error', (err) => {
      if (err.type === 'unavailable-id') {
        cleanupPeer();
        createRoom();
      } else {
        showStatus('エラー: ' + err.type, 'error');
      }
    });
  }

  function joinRoom() {
    const code = document.getElementById('room-input').value.trim().toUpperCase();
    if (code.length < 4) {
      showStatus('有効なルームコードを入力してください', 'error');
      return;
    }
    isHost = false;
    myColor = WHITE;

    peer = new Peer({ debug: 1 });
    peer.on('open', () => {
      showStatus('接続中...', 'waiting');
      conn = peer.connect('oth-' + code, { reliable: true });
      setupConnection();
    });
    peer.on('error', () => {
      showStatus('接続エラー: ルームが見つからないか満員です', 'error');
    });
  }

  function setupConnection() {
    conn.on('open', () => {
      showStatus('接続成功！ ゲーム開始', 'connected');
      setTimeout(() => {
        onlinePanel.classList.add('hidden');
        startGame();
      }, 800);
    });

    conn.on('data', (data) => {
      if (data.type === 'move') {
        placeDisc(data.row, data.col, data.color, false);
      } else if (data.type === 'restart') {
        initBoard();
        overlay.classList.remove('visible');
      } else if (data.type === 'pass') {
        // Opponent passed
        current = opponent(current);
        updateUI();
        checkGameEnd();
      }
    });

    conn.on('close', () => {
      showStatus('相手が切断しました', 'error');
      gameActive = false;
    });
  }

  function cleanupPeer() {
    if (conn) { conn.close(); conn = null; }
    if (peer) { peer.destroy(); peer = null; }
    const el = document.getElementById('room-code-show');
    if (el) el.remove();
    connStatus.className = 'connection-status';
  }

  function startGame() {
    modeSelect.classList.add('hidden');
    onlinePanel.classList.add('hidden');
    gameArea.classList.remove('hidden');
    
    if (mode === 'ai') {
      playerInfo.textContent = 'あなた: 黒 ●  |  AI: 白 ○';
    } else {
      playerInfo.textContent = myColor === BLACK ? 'あなた: 黒 ●' : 'あなた: 白 ○';
    }
    
    initBoard();
  }

  function initBoard() {
    board = Array(SIZE).fill(null).map(() => Array(SIZE).fill(EMPTY));
    // Starting position
    board[3][3] = WHITE;
    board[3][4] = BLACK;
    board[4][3] = BLACK;
    board[4][4] = WHITE;
    current = BLACK;
    gameActive = true;
    overlay.classList.remove('visible');
    renderBoard();
    updateUI();
  }

  function opponent(color) {
    return color === BLACK ? WHITE : BLACK;
  }

  function inBounds(r, c) {
    return r >= 0 && r < SIZE && c >= 0 && c < SIZE;
  }

  function getFlips(r, c, color) {
    if (board[r][c] !== EMPTY) return [];
    const flips = [];
    for (const [dr, dc] of DIRS) {
      const line = [];
      let nr = r + dr, nc = c + dc;
      while (inBounds(nr, nc) && board[nr][nc] === opponent(color)) {
        line.push([nr, nc]);
        nr += dr;
        nc += dc;
      }
      if (line.length && inBounds(nr, nc) && board[nr][nc] === color) {
        flips.push(...line);
      }
    }
    return flips;
  }

  function getValidMoves(color) {
    const moves = [];
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (getFlips(r, c, color).length > 0) {
          moves.push([r, c]);
        }
      }
    }
    return moves;
  }

  function placeDisc(r, c, color, sendToPeer) {
    const flips = getFlips(r, c, color);
    if (flips.length === 0) return false;

    board[r][c] = color;
    for (const [fr, fc] of flips) {
      board[fr][fc] = color;
    }

    if (sendToPeer && conn?.open) {
      conn.send({ type: 'move', row: r, col: c, color });
    }

    renderBoard(flips);
    current = opponent(color);
    
    // Check if next player has moves
    const nextMoves = getValidMoves(current);
    if (nextMoves.length === 0) {
      // Pass
      const myMoves = getValidMoves(opponent(current));
      if (myMoves.length === 0) {
        // Both can't move - game over
        gameActive = false;
        setTimeout(showResult, 600);
        updateUI();
        return true;
      }
      // Pass turn back
      current = opponent(current);
      
      // If AI mode and AI just got passed to or we passed to AI
      if (mode === 'ai' && current === WHITE) {
        updateUI();
        setTimeout(aiMove, 500);
        return true;
      }
    }

    updateUI();
    
    // AI turn
    if (mode === 'ai' && current === WHITE && gameActive) {
      setTimeout(aiMove, 500);
    }

    // Check end (board full)
    if (countDiscs(EMPTY) === 0) {
      gameActive = false;
      setTimeout(showResult, 600);
    }

    return true;
  }

  function aiMove() {
    if (!gameActive || current !== WHITE) return;
    const moves = getValidMoves(WHITE);
    if (moves.length === 0) {
      current = BLACK;
      updateUI();
      if (getValidMoves(BLACK).length === 0) {
        gameActive = false;
        showResult();
      }
      return;
    }

    // Simple evaluation: prioritize corners, then max flips, avoid near-corners
    const corners = [[0,0],[0,7],[7,0],[7,7]];
    const nearCorners = [[0,1],[1,0],[0,6],[1,7],[6,0],[7,1],[6,7],[7,6]];
    
    let best = null;
    let bestScore = -Infinity;

    for (const [r, c] of moves) {
      let score = getFlips(r, c, WHITE).length;
      
      if (corners.some(([cr, cc]) => cr === r && cc === c)) score += 50;
      if (nearCorners.some(([nr, nc]) => nr === r && nc === c)) score -= 20;
      
      // Edges
      if (r === 0 || r === 7 || c === 0 || c === 7) score += 5;
      
      // Mobility (opponent moves after)
      // Quick sim
      const saved = board.map(row => [...row]);
      const flips = getFlips(r, c, WHITE);
      board[r][c] = WHITE;
      flips.forEach(([fr, fc]) => board[fr][fc] = WHITE);
      const oppMoves = getValidMoves(BLACK).length;
      board = saved;
      score -= oppMoves * 1.5;

      if (score > bestScore) {
        bestScore = score;
        best = [r, c];
      }
    }

    if (best) {
      placeDisc(best[0], best[1], WHITE, false);
    }
  }

  function countDiscs(color) {
    let n = 0;
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++)
        if (board[r][c] === color) n++;
    return n;
  }

  function renderBoard(flipped = []) {
    const validMoves = gameActive ? getValidMoves(current) : [];
    const isMyTurn = mode !== 'online' || current === myColor;

    boardEl.innerHTML = '';
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const cell = document.createElement('div');
        cell.className = 'othello-cell';
        
        const isValid = validMoves.some(([vr, vc]) => vr === r && vc === c);
        if (isValid && isMyTurn) {
          cell.classList.add('valid');
          cell.addEventListener('click', () => {
            if (mode === 'online' && current !== myColor) return;
            placeDisc(r, c, current, mode === 'online');
          });
        }

        if (board[r][c] !== EMPTY) {
          const disc = document.createElement('div');
          disc.className = 'disc ' + (board[r][c] === BLACK ? 'black' : 'white');
          if (flipped.some(([fr, fc]) => fr === r && fc === c)) {
            disc.classList.add('flipping');
          }
          cell.appendChild(disc);
        }

        boardEl.appendChild(cell);
      }
    }
  }

  function updateUI() {
    const b = countDiscs(BLACK);
    const w = countDiscs(WHITE);
    scoreBlack.textContent = b;
    scoreWhite.textContent = w;
    turnIndicator.textContent = current === BLACK ? '黒' : '白';
    turnIndicator.style.color = current === BLACK ? '#a0a0c0' : '#f0f0ff';
    
    // Re-render to update valid markers
    renderBoard();
  }

  function checkGameEnd() {
    if (getValidMoves(BLACK).length === 0 && getValidMoves(WHITE).length === 0) {
      gameActive = false;
      showResult();
    }
  }

  function showResult() {
    const b = countDiscs(BLACK);
    const w = countDiscs(WHITE);
    
    if (b === w) {
      overlayTitle.textContent = '引き分け';
      overlayTitle.className = 'overlay-title draw';
      overlayMessage.textContent = `黒 ${b} - ${w} 白`;
    } else {
      const winnerIsBlack = b > w;
      let isWin;
      if (mode === 'ai') {
        isWin = winnerIsBlack; // Player is black
      } else {
        isWin = (winnerIsBlack && myColor === BLACK) || (!winnerIsBlack && myColor === WHITE);
      }
      
      overlayTitle.textContent = isWin ? '勝ち！' : '負け...';
      overlayTitle.className = 'overlay-title ' + (isWin ? 'win' : 'lose');
      overlayMessage.textContent = `黒 ${b} - ${w} 白`;
    }
    overlay.classList.add('visible');
  }

  function leaveGame() {
    cleanupPeer();
    gameArea.classList.add('hidden');
    modeSelect.classList.remove('hidden');
    mode = null;
    overlay.classList.remove('visible');
  }
})();
