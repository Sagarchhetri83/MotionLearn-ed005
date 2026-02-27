// --- Dashboard Interaction Logic ---

// Get all the subject book buttons
const subjectButtons = document.querySelectorAll('.subject-button');

// Add a click event listener to each book (select only; navigation handled by Start button)
subjectButtons.forEach(button => {
  button.addEventListener('click', () => {
    // Toggle visual selection indicator
    subjectButtons.forEach(b => b.classList.remove('selected'));
    button.classList.add('selected');

    // Save the subject selection
    const selectedSubject = button.dataset.subject;
    try { localStorage.setItem('selectedModule', selectedSubject); } catch (_) {}
  });
});

// Note: The "Start" button functionality can be added here.
// For now, it's assumed that clicking a subject is the main action.
// Avatar Data
const avatarImages = [
  'images/user-logo-1.png',
  'images/user-logo-2.png',
  'images/user-logo-3.png', 
  'images/user-logo-4.png',
  'images/user-logo-5.png'
];

// Settings Dropdown Functionality
const settingsBtn = document.getElementById('settings-btn');
const settingsMenu = document.getElementById('settings-menu');
const logoutBtn = document.getElementById('logout-btn');
const avatarSettingsBtn = document.getElementById('avatar-settings-btn');
const avatarSelection = document.getElementById('avatar-selection');
const currentAvatar = document.getElementById('current-avatar');
const prevAvatarBtn = document.getElementById('prev-avatar');
const nextAvatarBtn = document.getElementById('next-avatar');
const avatarCounter = document.getElementById('avatar-counter');

// Initialize avatar settings
let currentAvatarIndex = 0;
updateAvatarDisplay();

// Avatar Functions
function updateAvatarDisplay() {
  if (currentAvatar && avatarCounter) {
    currentAvatar.src = avatarImages[currentAvatarIndex];
    avatarCounter.textContent = `${currentAvatarIndex + 1}/${avatarImages.length}`;
    
    // Update main profile avatar too
    const mainProfileAvatar = document.querySelector('.profile-avatar');
    if (mainProfileAvatar) {
      mainProfileAvatar.src = avatarImages[currentAvatarIndex];
    }
    
    // Save avatar selection to localStorage
    try {
      localStorage.setItem('selectedAvatar', currentAvatarIndex.toString());
    } catch (_) {}
  }
}

function nextAvatar() {
  currentAvatarIndex = (currentAvatarIndex + 1) % avatarImages.length;
  updateAvatarDisplay();
}

function prevAvatar() {
  currentAvatarIndex = currentAvatarIndex === 0 ? avatarImages.length - 1 : currentAvatarIndex - 1;
  updateAvatarDisplay();
}

// Load saved avatar on page load
try {
  const savedAvatar = localStorage.getItem('selectedAvatar');
  if (savedAvatar) {
    currentAvatarIndex = parseInt(savedAvatar);
    updateAvatarDisplay();
  }
} catch (_) {}

// Toggle settings menu
if (settingsBtn && settingsMenu) {
  settingsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    settingsMenu.classList.toggle('show');
  });

  // Close menu when clicking outside
  document.addEventListener('click', () => {
    settingsMenu.classList.remove('show');
  });

  // Prevent menu from closing when clicking inside it
  settingsMenu.addEventListener('click', (e) => {
    e.stopPropagation();
  });
}

// Avatar Settings Functionality
if (avatarSettingsBtn) {
  avatarSettingsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    avatarSelection.classList.toggle('show');
  });
}

// Avatar Navigation
if (prevAvatarBtn) {
  prevAvatarBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    prevAvatar();
  });
}

if (nextAvatarBtn) {
  nextAvatarBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    nextAvatar();
  });
}

// Note: Logout functionality is now handled in dashboard.html with Firebase auth

const startButton = document.querySelector('.start-button');
if (startButton) {
  startButton.addEventListener('click', () => {
    try {
      const selected = localStorage.getItem('selectedModule');
      if (!selected) {
        alert('Please select a subject book first!');
        return;
      }
      // Go to the main book (30 levels). Inner 10-levels will unlock next outer level upon completion.
      window.location.href = 'level-select.html';
    } catch (_) {
      alert('Please select a subject book first!');
    }
  });
}

// Progress helpers: show progress per-subject, defaulting to average badges if no saved data
function getSelectedSubject() {
  try {
    return localStorage.getItem('selectedModule') || 'english';
  } catch (_) {
    return 'english';
  }
}

function getSubjectProgress(subject) {
  const candidates = [];
  // 1) Outer 30-level book progress from level-select state
  try {
    const key = `levelProgress_${subject}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      const progress = JSON.parse(saved);
      const outerCompleted = Array.isArray(progress.completed) ? progress.completed.length : 0;
      const pctOuter = Math.round((outerCompleted / 30) * 100);
      if (!isNaN(pctOuter)) candidates.push(pctOuter);
    }
  } catch (_) {}

  // 2) Inner 10-level (in-game) progress from game screen state
  try {
    const list = localStorage.getItem(`gameCompletedLevels_${subject}`);
    const innerCompleted = list ? JSON.parse(list).length : 0;
    const innerTotal = 10; // assume 10 inner levels per book page
    const pctInner = Math.round((innerCompleted / innerTotal) * 100);
    if (!isNaN(pctInner)) candidates.push(pctInner);
  } catch (_) {}

  // 3) Optional manual override subjectProgress_subject
  try {
    const raw = localStorage.getItem(`subjectProgress_${subject}`);
    const val = raw == null ? NaN : parseFloat(raw);
    if (!isNaN(val)) candidates.push(Math.max(0, Math.min(100, Math.round(val))));
  } catch (_) {}

  if (candidates.length) {
    // Use the maximum to reflect the most advanced indicator
    return Math.max(...candidates);
  }

  // 4) Fallback: derive from visible achievement cards if nothing saved
  const cards = document.querySelectorAll('.achievement-item');
  if (!cards.length) return 0;
  let sum = 0;
  cards.forEach((c) => {
    const style = getComputedStyle(c);
    const progressVar = style.getPropertyValue('--progress').trim();
    const pct = progressVar.endsWith('%') ? parseFloat(progressVar) : 0;
    sum += isNaN(pct) ? 0 : pct;
  });
  return Math.round(sum / cards.length);
}

function updateBeakerProgress() {
  const currentSubject = getSelectedSubject();
  const percent = getSubjectProgress(currentSubject);
  // Update circle progress UI
  const circle = document.querySelector('.circle-fill');
  const pctLabel = document.getElementById('progress-pct');
  if (circle && pctLabel) {
    const circumference = 2 * Math.PI * 54; // r = 54
    const offset = circumference * (1 - percent / 100);
    circle.style.strokeDashoffset = `${offset}`;
    pctLabel.textContent = `${percent}%`;
  }
}

// Initialize and observe changes
updateBeakerProgress();
const observer = new MutationObserver(updateBeakerProgress);
document.querySelectorAll('.achievement-item').forEach((el) => {
  observer.observe(el, { attributes: true, attributeFilter: ['style', 'class'] });
});

// Sidebar subject switcher (left/right arrows)
const subjects = ['english', 'science', 'maths'];
let sidebarSubjectIndex = 0;
const sidebarLabel = document.getElementById('sidebar-subject-label');
const leftArrow = document.querySelector('.subject-switcher .left');
const rightArrow = document.querySelector('.subject-switcher .right');

function updateSidebarSubjectLabel() {
  if (sidebarLabel) {
    const name = subjects[sidebarSubjectIndex];
    sidebarLabel.textContent = name.charAt(0).toUpperCase() + name.slice(1);
  }
  try { localStorage.setItem('selectedModule', subjects[sidebarSubjectIndex]); } catch (_) {}
}

if (leftArrow && rightArrow && sidebarLabel) {
  leftArrow.addEventListener('click', () => {
    sidebarSubjectIndex = (sidebarSubjectIndex - 1 + subjects.length) % subjects.length;
    try { localStorage.setItem('selectedModule', subjects[sidebarSubjectIndex]); } catch (_) {}
    updateSidebarSubjectLabel();
    updateBeakerProgress();
  });
  rightArrow.addEventListener('click', () => {
    sidebarSubjectIndex = (sidebarSubjectIndex + 1) % subjects.length;
    try { localStorage.setItem('selectedModule', subjects[sidebarSubjectIndex]); } catch (_) {}
    updateSidebarSubjectLabel();
    updateBeakerProgress();
  });
  // Make label itself advance to next subject on click (for easier tapping)
  sidebarLabel.addEventListener('click', () => {
    sidebarSubjectIndex = (sidebarSubjectIndex + 1) % subjects.length;
    try { localStorage.setItem('selectedModule', subjects[sidebarSubjectIndex]); } catch (_) {}
    updateSidebarSubjectLabel();
    updateBeakerProgress();
  });
  // initialize label from localStorage if available
  try {
    const saved = localStorage.getItem('selectedModule');
    const idx = subjects.indexOf(saved || 'english');
    sidebarSubjectIndex = idx >= 0 ? idx : 0;
  } catch (_) {}
  updateSidebarSubjectLabel();
  updateBeakerProgress();
}


