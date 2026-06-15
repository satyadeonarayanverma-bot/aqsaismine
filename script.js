// Retro Arcade Puzzle Game Engine - Usability Optimizations

const gameState = {
  gridSize: 3,             // Fixed 3x3 grid
  soundEnabled: true,
  imageSrc: 'WhatsApp Image 2026-06-14 at 15.26.03.jpeg',
  isGameActive: false,
  timerInterval: null,
  elapsedTime: 0,
  winCelebrated: false,
  boardWidth: 0,
  boardHeight: 0,
  rotation: 90            // Starts at 90 deg clockwise to align original vertical photo upright
};

// State arrays
let boardState = Array(9).fill(null); // boardState[cellIndex] = { origIndex } or null
let trayPieces = [];                  // Array of { origIndex } currently in the bottom tray

// Offscreen canvas for rotational rendering
const originalImage = new Image();
const rotatedCanvas = document.createElement('canvas');
const rotatedCtx = rotatedCanvas.getContext('2d');

// Retro 8-Bit Web Audio Synthesizer
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

const SoundEffects = {
  playSelect() {
    if (!gameState.soundEnabled) return;
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.type = 'square';
      osc.frequency.setValueAtTime(600, audioCtx.currentTime);
      osc.frequency.setValueAtTime(800, audioCtx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.1);
    } catch (e) {}
  },

  playSnap() {
    if (!gameState.soundEnabled) return;
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(400, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1000, audioCtx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.08);
    } catch (e) {}
  },

  playScramble() {
    if (!gameState.soundEnabled) return;
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, audioCtx.currentTime);
      osc.frequency.linearRampToValueAtTime(500, audioCtx.currentTime + 0.25);

      gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.25);
    } catch (e) {}
  },

  playWin() {
    if (!gameState.soundEnabled) return;
    try {
      const winAudio = document.getElementById('win-audio');
      if (winAudio) {
        winAudio.currentTime = 0; // restart if already played
        winAudio.play().catch(err => {
          console.warn("MP3 preloaded playback deferred, playing synth fallback:", err);
          this.playWinSynthFallback();
        });
      } else {
        this.playWinSynthFallback();
      }
    } catch (e) {
      console.warn("Audio tag error, playing synth fallback:", e);
      this.playWinSynthFallback();
    }
  },

  playWinSynthFallback() {
    try {
      const time = audioCtx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, index) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, time + (index * 0.12));
        
        gain.gain.setValueAtTime(0.08, time + (index * 0.12));
        gain.gain.exponentialRampToValueAtTime(0.01, time + (index * 0.12) + 0.35);
        
        osc.start(time + (index * 0.12));
        osc.stop(time + (index * 0.12) + 0.35);
      });
    } catch (e) {}
  }
};

// Initialize Application UI
document.addEventListener('DOMContentLoaded', () => {
  // Lock Screen Logic
  const lockScreen = document.getElementById('lock-screen');
  const lockInput = document.getElementById('lock-input');
  const lockSubmit = document.getElementById('lock-submit-btn');
  const lockError = document.getElementById('lock-error');
  const lockPanel = lockScreen.querySelector('.lock-panel');

  const attemptUnlock = () => {
    const accessKey = lockInput.value.trim().toLowerCase();
    if (accessKey === 'aqsakissesadiyay') {
      SoundEffects.playSelect();
      lockScreen.classList.add('hide');
      document.activeElement.blur();
    } else {
      SoundEffects.playScramble(); // Error bleep sound
      lockError.textContent = "ACCESS DENIED";
      lockError.classList.add('show');
      
      // Shake animation
      lockPanel.classList.add('lock-shake');
      setTimeout(() => {
        lockPanel.classList.remove('lock-shake');
      }, 300);
      
      // Clear input
      lockInput.value = '';
      lockInput.focus();
    }
  };

  lockSubmit.addEventListener('click', attemptUnlock);
  lockInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      attemptUnlock();
    }
  });

  // Automatically focus on the password input field when loading
  setTimeout(() => lockInput.focus(), 100);

  const scrambleBtn = document.getElementById('scramble-btn');
  const soundBtn = document.getElementById('toggle-sound');
  const rotateBtn = document.getElementById('rotate-btn');
  const hintBtn = document.getElementById('hint-btn');
  const modalReplayBtn = document.getElementById('modal-replay-btn');

  // Load target default image
  originalImage.src = gameState.imageSrc;
  originalImage.onload = () => {
    processRotatedCanvas();
    initializeBoardState(true); // solved preview initially
  };
  originalImage.onerror = () => {
    alert("Error loading default image file.");
  };

  // Scramble grid action
  scrambleBtn.addEventListener('click', () => {
    audioCtx.resume();
    SoundEffects.playScramble();
    scrambleGrid();
  });

  // Sound toggle bleep
  soundBtn.addEventListener('click', () => {
    gameState.soundEnabled = !gameState.soundEnabled;
    const soundOnSvg = document.getElementById('sound-on-svg');
    const soundOffSvg = document.getElementById('sound-off-svg');
    if (gameState.soundEnabled) {
      soundOnSvg.style.display = 'block';
      soundOffSvg.style.display = 'none';
      soundBtn.classList.remove('active');
    } else {
      soundOnSvg.style.display = 'none';
      soundOffSvg.style.display = 'block';
      soundBtn.classList.add('active');
    }
  });

  // Manual rotation button
  rotateBtn.addEventListener('click', () => {
    audioCtx.resume();
    gameState.rotation = (gameState.rotation + 90) % 360;
    processRotatedCanvas();
    
    // Refresh dimensions and layout
    calculateBoardSize();
    
    // Adjust overlay size
    const hintOverlay = document.getElementById('hint-overlay');
    hintOverlay.style.width = `${gameState.boardWidth}px`;
    hintOverlay.style.height = `${gameState.boardHeight}px`;

    renderGameUI();
  });

  // Hint peek handlers (hold to see template solution)
  const showHint = () => {
    const hintOverlay = document.getElementById('hint-overlay');
    hintOverlay.style.width = `${gameState.boardWidth}px`;
    hintOverlay.style.height = `${gameState.boardHeight}px`;
    hintOverlay.style.backgroundImage = `url(${rotatedCanvas.toDataURL()})`;
    hintOverlay.classList.add('show');
  };
  
  const hideHint = () => {
    document.getElementById('hint-overlay').classList.remove('show');
  };

  hintBtn.addEventListener('mousedown', showHint);
  hintBtn.addEventListener('mouseup', hideHint);
  hintBtn.addEventListener('mouseleave', hideHint);

  hintBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    showHint();
  });
  hintBtn.addEventListener('touchend', hideHint);

  // Victory replay action
  modalReplayBtn.addEventListener('click', () => {
    hideVictoryOverlay();
    scrambleGrid();
  });

  // Resize listener
  window.addEventListener('resize', handleResize);
});

// Rotate canvas image drawing
function processRotatedCanvas() {
  if (!originalImage.complete) return;

  const w = originalImage.naturalWidth;
  const h = originalImage.naturalHeight;
  
  if (gameState.rotation === 0) {
    rotatedCanvas.width = w;
    rotatedCanvas.height = h;
    rotatedCtx.drawImage(originalImage, 0, 0);
  } else if (gameState.rotation === 90) {
    rotatedCanvas.width = h;
    rotatedCanvas.height = w;
    rotatedCtx.translate(h, 0);
    rotatedCtx.rotate((90 * Math.PI) / 180);
    rotatedCtx.drawImage(originalImage, 0, 0);
  } else if (gameState.rotation === 180) {
    rotatedCanvas.width = w;
    rotatedCanvas.height = h;
    rotatedCtx.translate(w, h);
    rotatedCtx.rotate((180 * Math.PI) / 180);
    rotatedCtx.drawImage(originalImage, 0, 0);
  } else if (gameState.rotation === 270) {
    rotatedCanvas.width = h;
    rotatedCanvas.height = w;
    rotatedCtx.translate(0, w);
    rotatedCtx.rotate((270 * Math.PI) / 180);
    rotatedCtx.drawImage(originalImage, 0, 0);
  }
}

// Window resizing adjustments
let resizeTimeout;
function handleResize() {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    if (originalImage.complete) {
      calculateBoardSize();
      renderGameUI();
    }
  }, 100);
}

// Calculate responsive board container bounds
function calculateBoardSize() {
  const container = document.getElementById('board-container');
  const maxW = container.clientWidth - 32; 
  
  // Calculate available height dynamically:
  // Viewport height minus header, HUD, tray, buttons, paddings
  // Allocate roughly 235px for other UI elements on mobile, 340px on desktop
  const UIHeightBudget = window.innerHeight < 700 ? 235 : 340;
  const maxH = Math.max(window.innerHeight - UIHeightBudget, 120); // Ensure at least 120px height

  const imgW = rotatedCanvas.width;
  const imgH = rotatedCanvas.height;

  const imageRatio = imgW / imgH;
  const containerRatio = maxW / maxH;

  if (imageRatio > containerRatio) {
    gameState.boardWidth = maxW;
    gameState.boardHeight = maxW / imageRatio;
  } else {
    gameState.boardHeight = maxH;
    gameState.boardWidth = maxH * imageRatio;
  }
}

// Initialize structural parameters
function initializeBoardState(solvedPreview = false) {
  calculateBoardSize();
  
  if (solvedPreview) {
    // Fill the grid cells with solved indices
    for (let i = 0; i < 9; i++) {
      boardState[i] = { origIndex: i };
    }
    trayPieces = [];
    document.getElementById('puzzle-board').classList.add('solved');
  } else {
    boardState.fill(null);
    trayPieces = [];
    for (let i = 0; i < 9; i++) {
      trayPieces.push({ origIndex: i });
    }
    document.getElementById('puzzle-board').classList.remove('solved');
  }

  renderGameUI();
}

// Scramble board configuration
function scrambleGrid() {
  stopTimer();
  gameState.elapsedTime = 0;
  gameState.isGameActive = true;
  gameState.winCelebrated = false;

  document.getElementById('timer-display').textContent = "00:00";
  document.getElementById('puzzle-board').classList.remove('solved');

  // Empty cells on board
  boardState.fill(null);

  // Setup 9 pieces in tray
  trayPieces = [];
  for (let i = 0; i < 9; i++) {
    trayPieces.push({ origIndex: i });
  }

  // Shuffle tray pieces (Durstenfeld Shuffle)
  for (let i = trayPieces.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = trayPieces[i];
    trayPieces[i] = trayPieces[j];
    trayPieces[j] = temp;
  }

  renderGameUI();
  startTimer();
}

// Main UI layout rendering
function renderGameUI() {
  const board = document.getElementById('puzzle-board');
  const size = gameState.gridSize;

  board.style.width = `${gameState.boardWidth}px`;
  board.style.height = `${gameState.boardHeight}px`;
  board.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
  board.style.gridTemplateRows = `repeat(${size}, 1fr)`;

  board.innerHTML = '';

  const tileW = gameState.boardWidth / size;
  const tileH = gameState.boardHeight / size;
  const dataUrl = rotatedCanvas.toDataURL();

  // 1. Draw 9 grid snapping placeholder target cells
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const idx = row * size + col;
      const target = document.createElement('div');
      target.className = 'snap-target';
      target.style.width = `${tileW}px`;
      target.style.height = `${tileH}px`;
      target.style.left = `${col * tileW}px`;
      target.style.top = `${row * tileH}px`;
      target.dataset.gridIndex = idx;
      board.appendChild(target);
    }
  }

  // 2. Draw snapped pieces on the board
  boardState.forEach((piece, cellIndex) => {
    if (piece !== null) {
      const row = Math.floor(cellIndex / size);
      const col = cellIndex % size;
      
      const div = createPieceDOM(piece.origIndex, tileW, tileH, dataUrl);
      div.className = 'puzzle-tile';
      div.style.left = `${col * tileW}px`;
      div.style.top = `${row * tileH}px`;
      div.dataset.sourceCell = cellIndex;
      div.dataset.origIndex = piece.origIndex;

      // Make placed tiles draggable off the board or between cells
      div.addEventListener('pointerdown', (e) => startDragging(e, piece.origIndex, div, 'board', cellIndex, tileW, tileH, dataUrl));
      
      board.appendChild(div);
    }
  });

  // 3. Draw tray pieces below the board
  renderTrayUI(tileW, tileH, dataUrl);
}

// Generate piece element
function createPieceDOM(origIndex, w, h, dataUrl) {
  const size = gameState.gridSize;
  const origRow = Math.floor(origIndex / size);
  const origCol = origIndex % size;

  const div = document.createElement('div');
  div.style.width = `${w}px`;
  div.style.height = `${h}px`;
  div.style.backgroundImage = `url(${dataUrl})`;
  div.style.backgroundSize = `${gameState.boardWidth}px ${gameState.boardHeight}px`;
  div.style.backgroundPosition = `-${origCol * w}px -${origRow * h}px`;

  return div;
}

// Populate Tray list
function renderTrayUI(tileW, tileH, dataUrl) {
  const tray = document.getElementById('drag-tray');
  tray.innerHTML = '';

  // Larger pieces scale factor for easy visibility & touch targets
  const scale = 88 / Math.max(tileW, tileH);
  const trayW = tileW * scale;
  const trayH = tileH * scale;

  trayPieces.forEach((piece, index) => {
    const pieceEl = document.createElement('div');
    pieceEl.className = 'tray-piece';
    pieceEl.style.width = `${trayW}px`;
    pieceEl.style.height = `${trayH}px`;
    pieceEl.style.backgroundImage = `url(${dataUrl})`;
    pieceEl.style.backgroundSize = `${gameState.boardWidth * scale}px ${gameState.boardHeight * scale}px`;

    const size = gameState.gridSize;
    const origRow = Math.floor(piece.origIndex / size);
    const origCol = piece.origIndex % size;
    pieceEl.style.backgroundPosition = `-${origCol * trayW}px -${origRow * trayH}px`;
    
    pieceEl.dataset.origIndex = piece.origIndex;
    pieceEl.dataset.trayIndex = index;

    // Draggable from tray
    pieceEl.addEventListener('pointerdown', (e) => startDragging(e, piece.origIndex, pieceEl, 'tray', index, tileW, tileH, dataUrl));

    tray.appendChild(pieceEl);
  });

  if (trayPieces.length === 0 && gameState.isGameActive) {
    tray.innerHTML = '';
  }
}

// Drag & Snap state processor
function startDragging(e, origIndex, element, source, sourceId, tileW, tileH, dataUrl) {
  if (!gameState.isGameActive) return;
  e.preventDefault();
  audioCtx.resume();
  SoundEffects.playSelect();

  element.classList.add('dragging');

  // Create absolute floating element aligned directly under cursor
  const dragHolder = document.createElement('div');
  dragHolder.className = 'drag-holder';
  dragHolder.style.width = `${tileW}px`;
  dragHolder.style.height = `${tileH}px`;
  dragHolder.style.backgroundImage = `url(${dataUrl})`;
  dragHolder.style.backgroundSize = `${gameState.boardWidth}px ${gameState.boardHeight}px`;

  const size = gameState.gridSize;
  const origRow = Math.floor(origIndex / size);
  const origCol = origIndex % size;
  dragHolder.style.backgroundPosition = `-${origCol * tileW}px -${origRow * tileH}px`;

  // Center exactly on mouse coordinate
  let pageX = e.pageX;
  let pageY = e.pageY;
  dragHolder.style.left = `${pageX - tileW / 2}px`;
  dragHolder.style.top = `${pageY - tileH / 2}px`;

  document.body.appendChild(dragHolder);

  // If source was board, temporarily remove it from cell rendering to avoid duplicates
  if (source === 'board') {
    boardState[sourceId] = null;
    renderGameUI(); // refresh board layout without this piece while dragging
  }

  const onPointerMove = (moveEvent) => {
    pageX = moveEvent.pageX;
    pageY = moveEvent.pageY;
    dragHolder.style.left = `${pageX - tileW / 2}px`;
    dragHolder.style.top = `${pageY - tileH / 2}px`;

    // Highlight target slot overlays
    evaluateHighlight(pageX, pageY, tileW, tileH);
  };

  const onPointerUp = () => {
    element.classList.remove('dragging');
    dragHolder.remove();

    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);

    clearGridHighlights();

    // Check release drop target cell index
    const targetCellIdx = getHoveredCellIndex(pageX, pageY, tileW, tileH);
    
    if (targetCellIdx !== null) {
      // Piece dropped on board cell
      const occupiedPiece = boardState[targetCellIdx];

      if (occupiedPiece === null) {
        // 1. Drop cell is empty -> Snap here
        boardState[targetCellIdx] = { origIndex: origIndex };
        
        // Remove from source tray if it came from tray
        if (source === 'tray') {
          trayPieces = trayPieces.filter(p => p.origIndex !== origIndex);
        }
        SoundEffects.playSnap();
      } else {
        // 2. Drop cell is occupied
        if (source === 'board') {
          // Came from another board cell -> Swap them!
          boardState[sourceId] = occupiedPiece;
          boardState[targetCellIdx] = { origIndex: origIndex };
          SoundEffects.playSnap();
        } else {
          // Came from tray -> Bump occupied piece back to tray, snap new piece on cell
          trayPieces = trayPieces.filter(p => p.origIndex !== origIndex); // remove dragged piece from tray
          trayPieces.push(occupiedPiece); // put old board piece back to tray
          boardState[targetCellIdx] = { origIndex: origIndex }; // place dragged piece on board
          SoundEffects.playSnap();
        }
      }
    } else {
      // Piece dropped outside board -> Return to tray
      if (source === 'board') {
        // Came from board -> return to tray
        trayPieces.push({ origIndex: origIndex });
        // It was already set to null in boardState at drag start
      } else {
        // Came from tray -> just leave in tray (do nothing)
      }
      SoundEffects.playSelect();
    }

    renderGameUI();
    checkVictory();
  };

  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
}

// Find hovered cell index (0 to 8) based on absolute screen coordinates
function getHoveredCellIndex(x, y, tileW, tileH) {
  const board = document.getElementById('puzzle-board');
  const rect = board.getBoundingClientRect();

  const boardX = rect.left + window.scrollX;
  const boardY = rect.top + window.scrollY;

  const relX = x - boardX;
  const relY = y - boardY;

  const size = gameState.gridSize;
  const col = Math.floor(relX / tileW);
  const row = Math.floor(relY / tileH);

  if (col >= 0 && col < size && row >= 0 && row < size) {
    return row * size + col;
  }
  return null;
}

// Render dynamic overlays during drags
function evaluateHighlight(x, y, tileW, tileH) {
  clearGridHighlights();

  const targetCellIdx = getHoveredCellIndex(x, y, tileW, tileH);
  if (targetCellIdx !== null) {
    const board = document.getElementById('puzzle-board');
    const snapCell = board.querySelector(`[data-grid-index="${targetCellIdx}"]`);
    if (snapCell) {
      snapCell.classList.add('highlight');
    }
  }
}

function clearGridHighlights() {
  document.querySelectorAll('.snap-target').forEach(el => el.classList.remove('highlight'));
}

// Victory Condition checker
function checkVictory() {
  // Win condition:
  // 1. All cells on board filled (no nulls)
  // 2. Every cell index contains the piece with matching origIndex
  const hasEmptyCells = boardState.some(p => p === null);
  if (hasEmptyCells) return;

  const isAligned = boardState.every((piece, index) => piece.origIndex === index);
  
  if (isAligned && gameState.isGameActive && !gameState.winCelebrated) {
    gameState.winCelebrated = true;
    gameState.isGameActive = false;
    stopTimer();

    // Mark board as solved to trigger seamless borderless styling overrides
    document.getElementById('puzzle-board').classList.add('solved');

    SoundEffects.playWin();
    showVictoryOverlay(formatTime(gameState.elapsedTime));
  }
}

// HUD stopwatch timer
function startTimer() {
  const startTime = Date.now();
  gameState.timerInterval = setInterval(() => {
    gameState.elapsedTime = Math.floor((Date.now() - startTime) / 1000);
    document.getElementById('timer-display').textContent = formatTime(gameState.elapsedTime);
  }, 1000);
}

function stopTimer() {
  if (gameState.timerInterval) {
    clearInterval(gameState.timerInterval);
    gameState.timerInterval = null;
  }
}

function formatTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// Victory popup overlays
function showVictoryOverlay(timeStr) {
  const overlay = document.getElementById('victory-modal');
  document.getElementById('victory-time').textContent = timeStr;
  overlay.classList.add('show');
}

function hideVictoryOverlay() {
  const overlay = document.getElementById('victory-modal');
  overlay.classList.remove('show');
  
  // Pause and reset the victory music loops
  const winAudio = document.getElementById('win-audio');
  if (winAudio) {
    winAudio.pause();
    winAudio.currentTime = 0;
  }
}
