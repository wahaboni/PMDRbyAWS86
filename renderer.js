// State management
let timer;
let timeLeft;
let isRunning = false;
let currentMode = 'work';
let sessionsCompleted = 0;
let sessionHistory = JSON.parse(localStorage.getItem('pomodoro-history')) || [];

// Default settings
let settings = JSON.parse(localStorage.getItem('pomodoro-settings')) || {
  work: 25,
  short: 5,
  long: 15,
  goal: 4,
  theme: 'theme-sunset',
  alwaysOnTop: false,
  sound: 'assets/notif.wav'
};

// DOM Elements
const timerDisplay = document.getElementById('timer');
const startPauseBtn = document.getElementById('start-pause-btn');
const playPauseIcon = document.getElementById('play-pause-icon');
const sessionCounter = document.getElementById('session-counter');
const modeBtns = document.querySelectorAll('.mode-btn');
const progressCircle = document.querySelector('.circle-progress');
const circleLength = 2 * Math.PI * 85;

// Panels
const settingsBtn = document.getElementById('settings-btn');
const historyBtn = document.getElementById('history-btn');
const settingsPanel = document.getElementById('settings-panel');
const historyPanel = document.getElementById('history-panel');
const alarmPanel = document.getElementById('alarm-panel');
const closeSettings = document.getElementById('close-settings');
const closeHistory = document.getElementById('close-history');
const stopAlarmBtn = document.getElementById('stop-alarm');
const historyList = document.getElementById('history-list');
const alarmMsg = document.getElementById('alarm-msg');
const miniModeBtn = document.getElementById('mini-mode-btn');
const appContainer = document.querySelector('.app-container');
let isMiniMode = false;

// Inputs
const workInput = document.getElementById('work-time');
const shortInput = document.getElementById('short-time');
const longInput = document.getElementById('long-time');
const goalInput = document.getElementById('sessions-limit');
const alwaysOnTopToggle = document.getElementById('always-on-top-toggle');
const soundSelect = document.getElementById('alarm-sound-select');
const testSoundBtn = document.getElementById('test-sound-btn');
const taskInput = document.getElementById('task-input');

// Initialize UI with settings
workInput.value = settings.work;
shortInput.value = settings.short;
longInput.value = settings.long;
goalInput.value = settings.goal;
alwaysOnTopToggle.checked = settings.alwaysOnTop;
soundSelect.value = settings.sound || 'assets/notif.wav';

function applyTheme(theme) {
  document.body.className = theme;
  document.querySelectorAll('.theme-swatch').forEach(swatch => {
    swatch.classList.toggle('active', swatch.dataset.theme === theme);
  });
  settings.theme = theme;
  localStorage.setItem('pomodoro-settings', JSON.stringify(settings));
}

applyTheme(settings.theme);
window.electronAPI.setAlwaysOnTop(settings.alwaysOnTop);

const getModes = () => ({
  work: settings.work * 60,
  short: settings.short * 60,
  long: settings.long * 60
});

let modes = getModes();
timeLeft = modes[currentMode];
updateDisplay();
updateCounter();
progressCircle.style.strokeDasharray = circleLength;
progressCircle.style.strokeDashoffset = 0;

function updateDisplay() {
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  timerDisplay.textContent = timeStr;
  document.getElementById('mini-timer-clone').textContent = timeStr;

  const offset = circleLength - (timeLeft / modes[currentMode]) * circleLength;
  progressCircle.style.strokeDashoffset = offset;
}

function updateCounter() {
  sessionCounter.innerHTML = '';
  const isLongBreak = currentMode === 'long';
  
  for (let i = 0; i < settings.goal; i++) {
    // Tomat
    const tomato = document.createElement('img');
    tomato.src = 'assets/tomat.png';
    tomato.className = 'session-icon tomato-icon';
    if (i < sessionsCompleted || isLongBreak) {
      tomato.classList.add('completed');
    } else if (i === sessionsCompleted && currentMode === 'work') {
      tomato.classList.add('current');
    }
    sessionCounter.appendChild(tomato);

    // Break Icon
    if (i < settings.goal - 1) {
      const breakIcon = document.createElement('img');
      breakIcon.src = 'assets/break.png';
      breakIcon.className = 'session-icon break-icon';

      if (isLongBreak || sessionsCompleted > i + 1 || (sessionsCompleted === i + 1 && currentMode === 'work')) {
        breakIcon.classList.add('completed');
      } else if (sessionsCompleted === i + 1 && currentMode === 'short') {
        breakIcon.classList.add('current');
      }
      sessionCounter.appendChild(breakIcon);
    } else {
      // Long Break (Double Break Icon)
      const longBreakContainer = document.createElement('div');
      longBreakContainer.className = 'session-icon long-break-container';
      
      const break1 = document.createElement('img');
      break1.src = 'assets/break.png';
      break1.className = 'break-icon';
      
      const break2 = document.createElement('img');
      break2.src = 'assets/break.png';
      break2.className = 'break-icon';

      longBreakContainer.appendChild(break1);
      longBreakContainer.appendChild(break2);

      if (isLongBreak) {
        longBreakContainer.classList.add('current');
      }
      sessionCounter.appendChild(longBreakContainer);
    }
  }
}

function startTimer() {
  if (isRunning) return;

  const [m, s] = timerDisplay.textContent.split(':').map(n => parseInt(n) || 0);
  timeLeft = (m * 60) + s;

  timerDisplay.contentEditable = "false";
  isRunning = true;
  playPauseIcon.className = 'fas fa-pause';
  document.getElementById('mini-play-icon').className = 'fas fa-pause';
  document.querySelector('.app-container').classList.add('timer-active');

  timer = setInterval(() => {
    timeLeft--;
    updateDisplay();

    if (timeLeft <= 0) {
      clearInterval(timer);
      onTimerEnd();
    }
  }, 1000);
}

let alarmAudio = new Audio(settings.sound || 'assets/notif.wav');
alarmAudio.loop = true;

function onTimerEnd() {
  isRunning = false;
  playPauseIcon.className = 'fas fa-play';
  document.getElementById('mini-play-icon').className = 'fas fa-play';
  timerDisplay.contentEditable = "true";
  document.querySelector('.app-container').classList.remove('timer-active');

  // If in mini mode, return to normal mode to show the alarm panel properly
  if (isMiniMode) {
    isMiniMode = false;
    appContainer.classList.remove('mini-mode');
    document.getElementById('mini-mode-btn').querySelector('i').className = 'fas fa-compress-alt';
    window.electronAPI.toggleMiniMode(false);
  }

  let notifTitle = 'Waktu Habis!';
  let notifBody = '';
  let alarmText = '';

  const currentTask = taskInput.value.trim();
  addToHistory(currentMode, currentTask);

  let alarmIconClass = 'fas fa-bell';

  if (currentMode === 'work') {
    sessionsCompleted++;
    if (sessionsCompleted >= settings.goal) {
      notifBody = 'Sesi kerja selesai. Mari Istirahat Panjang!';
      alarmText = 'Sesi kerja selesai. Mari Istirahat Panjang!';
      alarmIconClass = 'fas fa-bed'; // Long break icon
      switchMode('long');
      sessionsCompleted = 0;
    } else {
      notifBody = 'Sesi kerja selesai. Mari Istirahat Pendek!';
      alarmText = 'Sesi kerja selesai. Mari Istirahat Pendek!';
      alarmIconClass = 'fas fa-coffee'; // Short break icon
      switchMode('short');
    }
  } else {
    notifBody = 'Waktu istirahat habis. Mari Mulai Bekerja Lagi!';
    alarmText = 'Waktu istirahat habis. Mari Mulai Bekerja Lagi!';
    alarmIconClass = 'fas fa-laptop-code'; // Work icon
    switchMode('work');
  }

  document.getElementById('alarm-icon-img').className = alarmIconClass;

  window.electronAPI.sendNotification(notifTitle, notifBody);

  // Reload sound in case it changed in settings
  alarmAudio.src = settings.sound;
  alarmAudio.play().catch(e => console.log("Audio play failed:", e));

  alarmMsg.textContent = alarmText;
  alarmPanel.classList.add('open');

  updateCounter();
}

stopAlarmBtn.addEventListener('click', () => {
  alarmAudio.pause();
  alarmAudio.currentTime = 0;
  alarmPanel.classList.remove('open');
});

function pauseTimer() {
  clearInterval(timer);
  isRunning = false;
  playPauseIcon.className = 'fas fa-play';
  document.getElementById('mini-play-icon').className = 'fas fa-play';
  timerDisplay.contentEditable = "true";
  document.querySelector('.app-container').classList.remove('timer-active');
}

function switchMode(mode) {
  currentMode = mode;
  modeBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
  modes = getModes();
  timeLeft = modes[currentMode];
  updateDisplay();
}

function addToHistory(type, taskName) {
  const typeNames = {
    'work': 'Kerja',
    'short': 'Istirahat Pendek',
    'long': 'Istirahat Panjang'
  };
  const item = {
    type: typeNames[type] || type,
    rawType: type,
    duration: settings[type] || 0,
    task: taskName || null,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    date: new Date().toLocaleDateString()
  };
  sessionHistory.unshift(item);
  if (sessionHistory.length > 20) sessionHistory.pop();
  localStorage.setItem('pomodoro-history', JSON.stringify(sessionHistory));
  renderHistory();
}

function renderHistory() {
  if (sessionHistory.length === 0) {
    historyList.innerHTML = '<div style="text-align:center; padding: 20px; color: var(--text-muted);">Belum ada riwayat.</div>';
    return;
  }

  const groups = sessionHistory.reduce((acc, item) => {
    if (!acc[item.date]) acc[item.date] = [];
    acc[item.date].push(item);
    return acc;
  }, {});

  historyList.innerHTML = Object.entries(groups).map(([date, items]) => `
    <div class="history-date-group">
      <div class="history-date-header" onclick="this.parentElement.classList.toggle('collapsed')">
        <span>${date}</span>
        <i class="fas fa-chevron-down"></i>
      </div>
      <div class="history-items-container">
        ${items.map(item => {
          let rawType = item.rawType;
          if (!rawType) {
            if (item.type === 'Kerja' || item.type === 'Work') rawType = 'work';
            else if (item.type === 'Istirahat Pendek' || item.type === 'Short') rawType = 'short';
            else if (item.type === 'Istirahat Panjang' || item.type === 'Long') rawType = 'long';
          }
          
          let iconHtml = '';
          if (rawType === 'work') {
            iconHtml = '<img src="assets/tomat.png" class="history-icon">';
          } else if (rawType === 'short') {
            iconHtml = '<img src="assets/break.png" class="history-icon">';
          } else if (rawType === 'long') {
            iconHtml = '<div class="history-icon double-break"><img src="assets/break.png"><img src="assets/break.png"></div>';
          }

          return `
          <div class="history-item">
            <div class="type-container">
              ${iconHtml}
              <div class="type-info">
                <div class="type">
                  ${item.type} 
                  <span class="history-duration">${item.duration ? `(${item.duration} mnt)` : ''}</span>
                </div>
                ${item.task ? `<div class="task-name">${item.task}</div>` : ''}
              </div>
            </div>
            <div class="time">${item.time}</div>
          </div>
          `;
        }).join('')}
      </div>
    </div>
  `).join('');
}

// Event Listeners
document.getElementById('clear-history').addEventListener('click', () => {
  if (confirm('Hapus semua riwayat?')) {
    sessionHistory = [];
    localStorage.setItem('pomodoro-history', JSON.stringify(sessionHistory));
    renderHistory();
  }
});

document.getElementById('reset-session-btn').addEventListener('click', () => {
  if (confirm('Reset siklus sesi kembali ke 1?')) {
    sessionsCompleted = 0;
    pauseTimer();
    switchMode('work');
    // updateCounter is automatically called by switchMode -> updateDisplay -> updateCounter isn't called! Wait, I should make sure updateCounter is called.
    updateCounter();
  }
});

startPauseBtn.addEventListener('click', () => {
  if (isRunning) pauseTimer();
  else startTimer();
});

document.getElementById('mini-play-btn').addEventListener('click', () => {
  if (isRunning) pauseTimer();
  else startTimer();
});

modeBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    if (isRunning) return;
    switchMode(btn.dataset.mode);
    pauseTimer();
  });
});

const toggleSettings = () => {
  settingsPanel.classList.toggle('open');
  historyPanel.classList.remove('open');
};

const toggleHistory = () => {
  historyPanel.classList.toggle('open');
  settingsPanel.classList.remove('open');
  if (historyPanel.classList.contains('open')) renderHistory();
};

const closePanels = () => {
  settingsPanel.classList.remove('open');
  historyPanel.classList.remove('open');
  alarmPanel.classList.remove('open');
};

settingsBtn.addEventListener('click', toggleSettings);
historyBtn.addEventListener('click', toggleHistory);
closeSettings.addEventListener('click', closePanels);
closeHistory.addEventListener('click', closePanels);

// Theme Selection
document.querySelectorAll('.theme-swatch').forEach(swatch => {
  swatch.addEventListener('click', () => {
    applyTheme(swatch.dataset.theme);
  });
});

// Update settings on input
[workInput, shortInput, longInput, goalInput, soundSelect].forEach(input => {
  input.addEventListener('change', () => {
    settings = {
      ...settings,
      work: parseInt(workInput.value) || 25,
      short: parseInt(shortInput.value) || 5,
      long: parseInt(longInput.value) || 15,
      goal: parseInt(goalInput.value) || 4,
      sound: soundSelect.value
    };
    localStorage.setItem('pomodoro-settings', JSON.stringify(settings));
    modes = getModes();
    if (!isRunning) switchMode(currentMode);
    updateCounter();
  });
});

alwaysOnTopToggle.addEventListener('change', () => {
  settings.alwaysOnTop = alwaysOnTopToggle.checked;
  localStorage.setItem('pomodoro-settings', JSON.stringify(settings));
  window.electronAPI.setAlwaysOnTop(settings.alwaysOnTop);
});

// Test Sound functionality
let isTestingSound = false;
testSoundBtn.addEventListener('click', () => {
  if (isTestingSound) {
    alarmAudio.pause();
    alarmAudio.currentTime = 0;
    testSoundBtn.innerHTML = '<i class="fas fa-play"></i>';
    isTestingSound = false;
  } else {
    alarmAudio.src = soundSelect.value;
    alarmAudio.loop = false; // Don't loop during test
    alarmAudio.play();
    testSoundBtn.innerHTML = '<i class="fas fa-stop"></i>';
    isTestingSound = true;

    alarmAudio.onended = () => {
      testSoundBtn.innerHTML = '<i class="fas fa-play"></i>';
      isTestingSound = false;
      alarmAudio.loop = true; // Restore looping for real alarms
    };
  }
});

// Window controls
document.getElementById('close-btn').addEventListener('click', () => window.electronAPI.closeWindow());
document.getElementById('minimize-btn').addEventListener('click', () => window.electronAPI.minimizeWindow());

// Mini Mode duplicate controls
document.getElementById('close-btn-2').addEventListener('click', () => window.electronAPI.closeWindow());
document.getElementById('minimize-btn-2').addEventListener('click', () => window.electronAPI.minimizeWindow());
document.getElementById('mini-mode-btn-2').addEventListener('click', () => {
  isMiniMode = false;
  appContainer.classList.remove('mini-mode');
  document.getElementById('mini-mode-btn').querySelector('i').className = 'fas fa-compress-alt';
  window.electronAPI.toggleMiniMode(false);
});

miniModeBtn.addEventListener('click', () => {
  isMiniMode = !isMiniMode;
  appContainer.classList.toggle('mini-mode', isMiniMode);

  const icon = miniModeBtn.querySelector('i');
  if (isMiniMode) {
    icon.className = 'fas fa-expand-alt';
    // Sync current task to mini display
    const task = taskInput.value.trim();
    document.getElementById('mini-task-text').textContent = task || '—';
  } else {
    icon.className = 'fas fa-compress-alt';
  }

  window.electronAPI.toggleMiniMode(isMiniMode);
});

// Keyboard Shortcuts
document.addEventListener('keydown', (e) => {
  if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'SELECT' || document.activeElement.contentEditable === 'true') {
    if (e.key === 'Enter') {
      e.preventDefault();
      document.activeElement.blur();
    }
    return;
  }

  switch (e.key.toLowerCase()) {
    case ' ':
      e.preventDefault();
      if (isRunning) pauseTimer();
      else startTimer();
      break;
    case 'escape':
      closePanels();
      break;
    case 's':
      toggleSettings();
      break;
    case 'h':
      toggleHistory();
      break;
  }
});

timerDisplay.addEventListener('blur', () => {
  const [m, s] = timerDisplay.textContent.split(':').map(n => parseInt(n) || 0);
  timeLeft = (m * 60) + s;
  updateDisplay();
});

renderHistory();
