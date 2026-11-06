/**
 * Neumorphic Calculator - Core Logic & Sensory Feedback
 */

(() => {
  // --- DOM Elements ---
  const calculatorShell = document.querySelector('.calculator-shell');
  const sizeToggle = document.getElementById('sizeToggle');
  const sizeExpandIcon = document.getElementById('sizeExpandIcon');
  const sizeShrinkIcon = document.getElementById('sizeShrinkIcon');
  const mainDisplay = document.getElementById('mainDisplay');
  const expressionDisplay = document.getElementById('expressionDisplay');
  const soundToggle = document.getElementById('soundToggle');
  const soundIconOn = document.getElementById('soundIconOn');
  const soundIconOff = document.getElementById('soundIconOff');
  const historyToggle = document.getElementById('historyToggle');
  const historyDrawer = document.getElementById('historyDrawer');
  const closeHistoryBtn = document.getElementById('closeHistoryBtn');
  const clearHistoryBtn = document.getElementById('clearHistoryBtn');
  const historyList = document.getElementById('historyList');
  const copyBtn = document.getElementById('copyBtn');
  const copyToast = document.getElementById('copyToast');

  // --- Calculator State ---
  let currentVal = '0';
  let prevVal = null;
  let currentOp = null;
  let resetNext = false;
  let history = JSON.parse(localStorage.getItem('calc_history') || '[]');
  let soundEnabled = localStorage.getItem('calc_sound') !== 'false';

  // --- Web Audio API (Organic Tactile Clicks) ---
  let audioCtx = null;

  function initAudio() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playTactileClick(type = 'default') {
    if (!soundEnabled) return;
    try {
      initAudio();
      if (!audioCtx) return;

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      const now = audioCtx.currentTime;
      osc.type = 'sine';

      if (type === 'equals') {
        // Slightly higher, warm tonal pop for equals
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(140, now + 0.07);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'clear') {
        // Subtle lower mechanical click
        osc.frequency.setValueAtTime(190, now);
        osc.frequency.exponentialRampToValueAtTime(90, now + 0.05);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.06);
      } else {
        // Crisp tactile mechanical tap
        osc.frequency.setValueAtTime(240, now);
        osc.frequency.exponentialRampToValueAtTime(120, now + 0.04);
        gain.gain.setValueAtTime(0.14, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.05);
      }

      // Haptic feedback on mobile if supported
      if ('vibrate' in navigator) {
        navigator.vibrate(10);
      }
    } catch {
      // Audio autoplay policy fallback
    }
  }

  // --- Formatting & Display ---
  function formatNumber(numStr) {
    if (numStr === 'Error' || numStr === 'Tak terhingga') return numStr;
    if (numStr.includes('e')) return numStr; // Exponential representation

    const parts = numStr.split('.');
    const integerPart = parts[0];
    const decimalPart = parts.length > 1 ? '.' + parts[1] : '';

    // Add thousands separators for readability
    const formattedInt = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return formattedInt + decimalPart;
  }

  function updateDisplay() {
    const rawVal = currentVal;
    mainDisplay.textContent = formatNumber(rawVal);

    // Dynamic font resizing for long numbers
    const len = rawVal.replace('.', '').replace('-', '').length;
    mainDisplay.classList.remove('text-dynamic-sm', 'text-dynamic-xs');
    if (len > 12) {
      mainDisplay.classList.add('text-dynamic-xs');
    } else if (len > 8) {
      mainDisplay.classList.add('text-dynamic-sm');
    }

    // Expression preview
    if (prevVal !== null && currentOp) {
      const opSymbol = currentOp === '*' ? '×' : currentOp === '/' ? '÷' : currentOp;
      expressionDisplay.textContent = `${formatNumber(prevVal)} ${opSymbol}`;
    } else {
      expressionDisplay.textContent = '';
    }
  }

  // --- Calculator Operations ---
  function appendNumber(num) {
    if (resetNext) {
      currentVal = num;
      resetNext = false;
    } else {
      if (currentVal === '0') {
        currentVal = num;
      } else if (currentVal.length < 16) {
        currentVal += num;
      }
    }
    updateDisplay();
  }

  function appendDecimal() {
    if (resetNext) {
      currentVal = '0.';
      resetNext = false;
      updateDisplay();
      return;
    }
    if (!currentVal.includes('.')) {
      currentVal += '.';
      updateDisplay();
    }
  }

  function handleOperator(op) {
    if (currentOp && !resetNext) {
      compute();
    }
    prevVal = currentVal;
    currentOp = op;
    resetNext = true;
    updateDisplay();
  }

  function compute() {
    if (currentOp === null || prevVal === null) return;

    const prev = parseFloat(prevVal);
    const curr = parseFloat(currentVal);
    let result = 0;

    switch (currentOp) {
      case '+':
        result = prev + curr;
        break;
      case '-':
        result = prev - curr;
        break;
      case '*':
        result = prev * curr;
        break;
      case '/':
        if (curr === 0) {
          currentVal = 'Tak terhingga';
          prevVal = null;
          currentOp = null;
          resetNext = true;
          updateDisplay();
          return;
        }
        result = prev / curr;
        break;
      default:
        return;
    }

    // Float rounding fix
    result = Math.round((result + Number.EPSILON) * 1e12) / 1e12;
    const finalResultStr = result.toString();

    // Save to history
    const opSymbol = currentOp === '*' ? '×' : currentOp === '/' ? '÷' : currentOp;
    saveHistory(`${formatNumber(prevVal)} ${opSymbol} ${formatNumber(currentVal)}`, finalResultStr);

    currentVal = finalResultStr;
    prevVal = null;
    currentOp = null;
    resetNext = true;
    updateDisplay();
  }

  function handlePercent() {
    const curr = parseFloat(currentVal);
    if (isNaN(curr)) return;

    if (prevVal !== null && (currentOp === '+' || currentOp === '-')) {
      // Percentage of previous value (e.g. 100 + 10% = 110)
      const prev = parseFloat(prevVal);
      const percentVal = (prev * curr) / 100;
      currentVal = (Math.round((percentVal + Number.EPSILON) * 1e12) / 1e12).toString();
    } else {
      // Direct percentage (e.g. 50% = 0.5)
      currentVal = (curr / 100).toString();
    }
    updateDisplay();
  }

  function handleClear() {
    currentVal = '0';
    prevVal = null;
    currentOp = null;
    resetNext = false;
    updateDisplay();
  }

  function handleDelete() {
    if (resetNext) {
      currentVal = '0';
      resetNext = false;
      updateDisplay();
      return;
    }
    if (currentVal.length > 1) {
      currentVal = currentVal.slice(0, -1);
      if (currentVal === '-' || currentVal === '-0') currentVal = '0';
    } else {
      currentVal = '0';
    }
    updateDisplay();
  }

  // --- History Management ---
  function saveHistory(expr, res) {
    history.unshift({ expr, res, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
    if (history.length > 25) history.pop();
    try {
      localStorage.setItem('calc_history', JSON.stringify(history));
    } catch {}
    renderHistory();
  }

  function renderHistory() {
    if (history.length === 0) {
      historyList.innerHTML = `<p class="text-slate-400 text-center py-8 text-xs font-sans">Belum ada riwayat kalkulasi.</p>`;
      return;
    }

    historyList.innerHTML = history.map((item, index) => `
      <div data-index="${index}" class="history-item p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 transition-all cursor-pointer border border-slate-100 flex flex-col items-end">
        <div class="flex items-center justify-between w-full text-slate-400 text-xs mb-0.5">
          <span>${item.time}</span>
          <span class="truncate ml-2">${item.expr}</span>
        </div>
        <div class="text-slate-700 font-semibold text-base">${formatNumber(item.res)}</div>
      </div>
    `).join('');

    // Click item to load back into display
    historyList.querySelectorAll('.history-item').forEach(el => {
      el.addEventListener('click', () => {
        const idx = el.getAttribute('data-index');
        const selected = history[idx];
        if (selected) {
          currentVal = selected.res;
          prevVal = null;
          currentOp = null;
          resetNext = true;
          updateDisplay();
          toggleHistory(false);
          playTactileClick('default');
        }
      });
    });
  }

  function toggleHistory(show) {
    if (show) {
      historyDrawer.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-4');
      historyDrawer.classList.add('opacity-100', 'pointer-events-auto', 'translate-y-0');
    } else {
      historyDrawer.classList.add('opacity-0', 'pointer-events-none', 'translate-y-4');
      historyDrawer.classList.remove('opacity-100', 'pointer-events-auto', 'translate-y-0');
    }
  }

  // --- Clipboard Copy ---
  function copyToClipboard() {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(currentVal).then(() => {
      copyToast.classList.remove('opacity-0');
      copyToast.classList.add('opacity-100');
      setTimeout(() => {
        copyToast.classList.remove('opacity-100');
        copyToast.classList.add('opacity-0');
      }, 1600);
      playTactileClick('default');
    }).catch(() => {});
  }

  // --- Sound Toggle ---
  function updateSoundIcon() {
    if (soundEnabled) {
      soundIconOn.classList.remove('hidden');
      soundIconOff.classList.add('hidden');
    } else {
      soundIconOn.classList.add('hidden');
      soundIconOff.classList.remove('hidden');
    }
  }

  // --- Event Listeners: Keypad Clicks ---
  document.querySelectorAll('button[data-action]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const action = btn.dataset.action;
      const val = btn.dataset.val;

      // Play matching tactile sound
      if (action === 'calculate') {
        playTactileClick('equals');
      } else if (action === 'clear' || action === 'delete') {
        playTactileClick('clear');
      } else {
        playTactileClick('default');
      }

      switch (action) {
        case 'number':
          appendNumber(val);
          break;
        case 'decimal':
          appendDecimal();
          break;
        case 'operator':
          handleOperator(val);
          break;
        case 'calculate':
          compute();
          break;
        case 'clear':
          handleClear();
          break;
        case 'delete':
          handleDelete();
          break;
        case 'percent':
          handlePercent();
          break;
      }
    });
  });

  // --- Event Listeners: Keyboard Navigation ---
  window.addEventListener('keydown', (e) => {
    let matchedBtn = null;

    if (e.key >= '0' && e.key <= '9') {
      matchedBtn = document.querySelector(`button[data-action="number"][data-val="${e.key}"]`);
      appendNumber(e.key);
      playTactileClick('default');
    } else if (e.key === '.' || e.key === ',') {
      matchedBtn = document.querySelector(`button[data-action="decimal"]`);
      appendDecimal();
      playTactileClick('default');
    } else if (e.key === '+' || e.key === '-' || e.key === '*' || e.key === '/') {
      matchedBtn = document.querySelector(`button[data-action="operator"][data-val="${e.key}"]`);
      handleOperator(e.key);
      playTactileClick('default');
    } else if (e.key === 'Enter' || e.key === '=') {
      e.preventDefault();
      matchedBtn = document.querySelector(`button[data-action="calculate"]`);
      compute();
      playTactileClick('equals');
    } else if (e.key === 'Backspace') {
      matchedBtn = document.querySelector(`button[data-action="delete"]`);
      handleDelete();
      playTactileClick('clear');
    } else if (e.key === 'Delete') {
      matchedBtn = document.querySelector(`button[data-action="delete"]`);
      handleDelete();
      playTactileClick('clear');
    } else if (e.key === 'Escape' || e.key.toLowerCase() === 'c') {
      matchedBtn = document.querySelector(`button[data-action="clear"]`);
      handleClear();
      playTactileClick('clear');
    } else if (e.key === '%') {
      matchedBtn = document.querySelector(`button[data-action="percent"]`);
      handlePercent();
      playTactileClick('default');
    }

    // Trigger visual button press feedback for keyboard
    if (matchedBtn) {
      matchedBtn.classList.add('is-pressed');
      setTimeout(() => matchedBtn.classList.remove('is-pressed'), 120);
    }
  });

  // --- UI Controls Listeners ---
  sizeToggle.addEventListener('click', () => {
    const isExpanded = calculatorShell.classList.toggle('max-w-[720px]');
    if (isExpanded) {
      calculatorShell.classList.remove('max-w-[540px]');
      sizeExpandIcon.classList.add('hidden');
      sizeShrinkIcon.classList.remove('hidden');
    } else {
      calculatorShell.classList.add('max-w-[540px]');
      sizeExpandIcon.classList.remove('hidden');
      sizeShrinkIcon.classList.add('hidden');
    }
    playTactileClick('default');
  });

  soundToggle.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    localStorage.setItem('calc_sound', soundEnabled);
    updateSoundIcon();
    playTactileClick('default');
  });

  historyToggle.addEventListener('click', () => {
    const isClosed = historyDrawer.classList.contains('pointer-events-none');
    toggleHistory(isClosed);
    playTactileClick('default');
  });

  closeHistoryBtn.addEventListener('click', () => {
    toggleHistory(false);
    playTactileClick('default');
  });

  clearHistoryBtn.addEventListener('click', () => {
    history = [];
    localStorage.removeItem('calc_history');
    renderHistory();
    playTactileClick('clear');
  });

  copyBtn.addEventListener('click', copyToClipboard);

  // --- Initial Setup ---
  updateSoundIcon();
  renderHistory();
  updateDisplay();
})();
