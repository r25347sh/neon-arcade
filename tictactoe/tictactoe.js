(() => {
  // State
  let mode = null; // 'local' | 'ai' | 'online'
  let board = Array(9).fill(null);
  let currentPlayer = 'X';
  let mySymbol = 'X';
  let gameActive = false;
  let isHost = false;
  let peer = null;
  let conn = null;
  let peerId = null;

  // DOM
  const modeSelect = document.getElementById('mode-select');
  const onlinePanel = document.getElementById('online-panel');
  const gameArea = document.getElementById('game-area');
  const boardEl = document.getElementById('ttt-board');
  const turnIndicator = document.getElementById('turn-indicator');
  const playerSymbolEl = document.getElementById('player-symbol');
  const opponentSymbolEl = document.getElementById('opponent-symbol');
  const connStatus = document.getElementById('conn-status');
  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlay-title');
  const overlayMessage = document.getElementById('overlay-message');

  // Mode selection
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      mode = btn.dataset.mode;
      if (mode === 'online') {
        modeSelect.classList.add('hidden');
        onlinePanel.classList.remove('hidden');
      } else {
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
    if (mode === 'online' && conn && conn.open) {
      conn.send({ type: 'restart' });
    }
    resetBoard();
  });
  document.getElementById('leave-btn').addEventListener('click', leaveGame);
  document.getElementById('overlay-restart').addEventListener('click', () => {
    overlay.classList.remove('visible');
    if (mode === 'online' && conn && conn.open) {
      conn.send({ type: 'restart' });
    }
    resetBoard();
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
    mySymbol = 'X';

    peer = new Peer('ttt-' + roomCode, {
      debug: 1
    });

    peer.on('open', (id) => {
      peerId = id;
      showStatus(`ルーム作成完了！ コード: ${roomCode}  — 相手の参加を待っています...`, 'waiting');
      
      // Show code prominently
      const codeDiv = document.createElement('div');
      codeDiv.className = 'room-code-display';
      codeDiv.id = 'room-code-show';
      codeDiv.textContent = roomCode;
      if (!document.getElementById('room-code-show')) {
        connStatus.parentNode.insertBefore(codeDiv, connStatus);
      }
    });

    peer.on('connection', (connection) => {
      conn = connection;
      setupConnection();
    });

    peer.on('error', (err) => {
      console.error(err);
      if (err.type === 'unavailable-id') {
        // Retry with new code
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
    mySymbol = 'O';

    peer = new Peer({ debug: 1 });

    peer.on('open', () => {
      showStatus('接続中...', 'waiting');
      conn = peer.connect('ttt-' + code, { reliable: true });
      setupConnection();
    });

    peer.on('error', (err) => {
      console.error(err);
      showStatus('接続エラー: ルームが見つからないか、既に満員です', 'error');
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
        makeMove(data.index, data.symbol, false);
      } else if (data.type === 'restart') {
        resetBoard();
        overlay.classList.remove('visible');
      }
    });

    conn.on('close', () => {
      showStatus('相手が切断しました', 'error');
      gameActive = false;
    });

    conn.on('error', (err) => {
      console.error(err);
      showStatus('接続エラー', 'error');
    });
  }

  function cleanupPeer() {
    if (conn) { conn.close(); conn = null; }
    if (peer) { peer.destroy(); peer = null; }
    const codeShow = document.getElementById('room-code-show');
    if (codeShow) codeShow.remove();
    connStatus.className = 'connection-status';
  }

  function startGame() {
    modeSelect.classList.add('hidden');
    onlinePanel.classList.add('hidden');
    gameArea.classList.remove('hidden');
    
    playerSymbolEl.textContent = mySymbol;
    opponentSymbolEl.textContent = mySymbol === 'X' ? 'O' : 'X';
    
    resetBoard();
  }

  function resetBoard() {
    board = Array(9).fill(null);
    currentPlayer = 'X';
    gameActive = true;
    overlay.classList.remove('visible');
    renderBoard();
    updateTurn();
  }

  function renderBoard() {
    boardEl.innerHTML = '';
    for (let i = 0; i < 9; i++) {
      const cell = document.createElement('div');
      cell.className = 'ttt-cell';
      if (board[i]) {
        cell.classList.add('filled', board[i].toLowerCase());
        cell.textContent = board[i];
      }
      cell.addEventListener('click', () => handleCellClick(i));
      boardEl.appendChild(cell);
    }
  }

  function handleCellClick(index) {
    if (!gameActive || board[index]) return;

    if (mode === 'online') {
      if (currentPlayer !== mySymbol) return; // Not my turn
      makeMove(index, mySymbol, true);
    } else if (mode === 'local') {
      makeMove(index, currentPlayer, false);
    } else if (mode === 'ai') {
      if (currentPlayer !== 'X') return; // Player is always X
      makeMove(index, 'X', false);
      if (gameActive) {
        setTimeout(aiMove, 400);
      }
    }
  }

  function makeMove(index, symbol, sendToPeer) {
    if (board[index] || !gameActive) return;
    
    board[index] = symbol;
    renderBoard();

    if (sendToPeer && conn && conn.open) {
      conn.send({ type: 'move', index, symbol });
    }

    const winner = checkWinner();
    if (winner) {
      gameActive = false;
      highlightWinning(winner.line);
      setTimeout(() => showResult(winner.player), 500);
      return;
    }

    if (board.every(c => c !== null)) {
      gameActive = false;
      setTimeout(() => showResult(null), 300);
      return;
    }

    currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
    updateTurn();
  }

  function aiMove() {
    // Simple minimax-ish: win > block > center > corner > random
    const empty = board.map((v, i) => v === null ? i : null).filter(v => v !== null);
    
    // Check for winning move
    for (const i of empty) {
      board[i] = 'O';
      if (checkWinner()?.player === 'O') {
        board[i] = null;
        makeMove(i, 'O', false);
        return;
      }
      board[i] = null;
    }
    
    // Block player
    for (const i of empty) {
      board[i] = 'X';
      if (checkWinner()?.player === 'X') {
        board[i] = null;
        makeMove(i, 'O', false);
        return;
      }
      board[i] = null;
    }
    
    // Center
    if (board[4] === null) {
      makeMove(4, 'O', false);
      return;
    }
    
    // Corners
    const corners = [0, 2, 6, 8].filter(i => board[i] === null);
    if (corners.length) {
      makeMove(corners[Math.floor(Math.random() * corners.length)], 'O', false);
      return;
    }
    
    // Random
    if (empty.length) {
      makeMove(empty[Math.floor(Math.random() * empty.length)], 'O', false);
    }
  }

  function checkWinner() {
    const lines = [
      [0,1,2],[3,4,5],[6,7,8],
      [0,3,6],[1,4,7],[2,5,8],
      [0,4,8],[2,4,6]
    ];
    for (const line of lines) {
      const [a,b,c] = line;
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return { player: board[a], line };
      }
    }
    return null;
  }

  function highlightWinning(line) {
    const cells = boardEl.querySelectorAll('.ttt-cell');
    line.forEach(i => cells[i].classList.add('winning'));
  }

  function updateTurn() {
    turnIndicator.textContent = currentPlayer;
    turnIndicator.style.color = currentPlayer === 'X' ? 'var(--neon-cyan)' : 'var(--neon-magenta)';
  }

  function showResult(winner) {
    if (winner === null) {
      overlayTitle.textContent = '引き分け';
      overlayTitle.className = 'overlay-title draw';
      overlayMessage.textContent = 'いい勝負でした！';
    } else if (mode === 'online') {
      const isWin = winner === mySymbol;
      overlayTitle.textContent = isWin ? '勝ち！' : '負け...';
      overlayTitle.className = 'overlay-title ' + (isWin ? 'win' : 'lose');
      overlayMessage.textContent = isWin ? 'おめでとうございます！' : 'また挑戦してみよう';
    } else if (mode === 'ai') {
      const isWin = winner === 'X';
      overlayTitle.textContent = isWin ? '勝ち！' : 'AIの勝ち';
      overlayTitle.className = 'overlay-title ' + (isWin ? 'win' : 'lose');
      overlayMessage.textContent = isWin ? 'AIに勝利！' : 'AIに負けました...';
    } else {
      overlayTitle.textContent = winner + ' の勝ち！';
      overlayTitle.className = 'overlay-title win';
      overlayMessage.textContent = 'プレイヤー ' + winner + ' の勝利です';
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
