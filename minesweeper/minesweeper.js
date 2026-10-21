(() => {
  const DIFFICULTIES = {
    easy:   { rows: 9,  cols: 9,  mines: 10 },
    medium: { rows: 16, cols: 16, mines: 40 },
    hard:   { rows: 16, cols: 30, mines: 99 }
  };

  let config = DIFFICULTIES.easy;
  let board = [];
  let revealed = [];
  let flagged = [];
  let gameOver = false;
  let won = false;
  let started = false;
  let timerInterval = null;
  let seconds = 0;
  let minesLeft = 0;

  const boardEl = document.getElementById('board');
  const mineCountEl = document.getElementById('mine-count');
  const timerEl = document.getElementById('timer');
  const faceBtn = document.getElementById('face-btn');
  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlay-title');
  const overlayMessage = document.getElementById('overlay-message');
  const overlayRestart = document.getElementById('overlay-restart');

  // Difficulty buttons
  document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      config = DIFFICULTIES[btn.dataset.diff];
      resetGame();
    });
  });

  faceBtn.addEventListener('click', resetGame);
  overlayRestart.addEventListener('click', () => {
    overlay.classList.remove('visible');
    resetGame();
  });

  function resetGame() {
    gameOver = false;
    won = false;
    started = false;
    seconds = 0;
    clearInterval(timerInterval);
    timerEl.textContent = '000';
    minesLeft = config.mines;
    updateMineCount();
    faceBtn.textContent = '😊';
    overlay.classList.remove('visible');

    // Init arrays
    board = Array(config.rows).fill(null).map(() => Array(config.cols).fill(0));
    revealed = Array(config.rows).fill(null).map(() => Array(config.cols).fill(false));
    flagged = Array(config.rows).fill(null).map(() => Array(config.cols).fill(false));

    renderBoard();
  }

  function placeMines(firstRow, firstCol) {
    let placed = 0;
    while (placed < config.mines) {
      const r = Math.floor(Math.random() * config.rows);
      const c = Math.floor(Math.random() * config.cols);
      // Don't place on first click or already mined
      if (board[r][c] === -1) continue;
      if (Math.abs(r - firstRow) <= 1 && Math.abs(c - firstCol) <= 1) continue;
      board[r][c] = -1;
      placed++;
    }

    // Calculate numbers
    for (let r = 0; r < config.rows; r++) {
      for (let c = 0; c < config.cols; c++) {
        if (board[r][c] === -1) continue;
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < config.rows && nc >= 0 && nc < config.cols && board[nr][nc] === -1) {
              count++;
            }
          }
        }
        board[r][c] = count;
      }
    }
  }

  function startTimer() {
    if (timerInterval) return;
    timerInterval = setInterval(() => {
      seconds++;
      timerEl.textContent = String(seconds).padStart(3, '0');
    }, 1000);
  }

  function updateMineCount() {
    mineCountEl.textContent = String(Math.max(0, minesLeft)).padStart(3, '0');
  }

  function renderBoard() {
    boardEl.style.gridTemplateColumns = `repeat(${config.cols}, 1fr)`;
    boardEl.innerHTML = '';

    for (let r = 0; r < config.rows; r++) {
      for (let c = 0; c < config.cols; c++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.row = r;
        cell.dataset.col = c;

        if (flagged[r][c]) {
          cell.classList.add('hidden', 'flagged');
        } else if (revealed[r][c]) {
          cell.classList.add('revealed');
          if (board[r][c] === -1) {
            cell.classList.add('mine');
          } else if (board[r][c] > 0) {
            cell.textContent = board[r][c];
            cell.dataset.num = board[r][c];
          }
        } else {
          cell.classList.add('hidden');
        }

        // Events
        cell.addEventListener('click', (e) => handleClick(r, c));
        cell.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          handleRightClick(r, c);
        });

        // Mobile long press for flag
        let pressTimer;
        cell.addEventListener('touchstart', (e) => {
          pressTimer = setTimeout(() => {
            handleRightClick(r, c);
          }, 500);
        }, { passive: true });
        cell.addEventListener('touchend', () => clearTimeout(pressTimer));
        cell.addEventListener('touchmove', () => clearTimeout(pressTimer));

        boardEl.appendChild(cell);
      }
    }
  }

  function handleClick(r, c) {
    if (gameOver || flagged[r][c] || revealed[r][c]) return;

    if (!started) {
      started = true;
      placeMines(r, c);
      startTimer();
    }

    if (board[r][c] === -1) {
      // Hit mine
      revealed[r][c] = true;
      gameOver = true;
      clearInterval(timerInterval);
      faceBtn.textContent = '😵';
      revealAllMines(r, c);
      showOverlay(false);
      return;
    }

    reveal(r, c);
    checkWin();
  }

  function handleRightClick(r, c) {
    if (gameOver || revealed[r][c]) return;
    flagged[r][c] = !flagged[r][c];
    minesLeft += flagged[r][c] ? -1 : 1;
    updateMineCount();
    renderBoard();
  }

  function reveal(r, c) {
    if (r < 0 || r >= config.rows || c < 0 || c >= config.cols) return;
    if (revealed[r][c] || flagged[r][c]) return;

    revealed[r][c] = true;

    if (board[r][c] === 0) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          reveal(r + dr, c + dc);
        }
      }
    }
    renderBoard();
  }

  function revealAllMines(explodedR, explodedC) {
    for (let r = 0; r < config.rows; r++) {
      for (let c = 0; c < config.cols; c++) {
        if (board[r][c] === -1) {
          revealed[r][c] = true;
        }
      }
    }
    renderBoard();
    // Mark exploded
    const cells = boardEl.querySelectorAll('.cell');
    cells.forEach(cell => {
      const r = +cell.dataset.row;
      const c = +cell.dataset.col;
      if (r === explodedR && c === explodedC) {
        cell.classList.add('exploded');
      }
    });
  }

  function checkWin() {
    let unrevealed = 0;
    for (let r = 0; r < config.rows; r++) {
      for (let c = 0; c < config.cols; c++) {
        if (!revealed[r][c] && board[r][c] !== -1) unrevealed++;
      }
    }
    if (unrevealed === 0) {
      gameOver = true;
      won = true;
      clearInterval(timerInterval);
      faceBtn.textContent = '😎';
      // Auto flag remaining mines
      for (let r = 0; r < config.rows; r++) {
        for (let c = 0; c < config.cols; c++) {
          if (board[r][c] === -1) flagged[r][c] = true;
        }
      }
      minesLeft = 0;
      updateMineCount();
      renderBoard();
      showOverlay(true);
    }
  }

  function showOverlay(isWin) {
    overlayTitle.textContent = isWin ? 'クリア！' : 'ゲームオーバー';
    overlayTitle.className = 'overlay-title ' + (isWin ? 'win' : 'lose');
    overlayMessage.textContent = isWin
      ? `おめでとうございます！ タイム: ${seconds}秒`
      : '地雷を踏んでしまいました...';
    setTimeout(() => overlay.classList.add('visible'), 400);
  }

  // Init
  resetGame();
})();
