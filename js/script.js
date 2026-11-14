// js/script.js â€” Budget Quest application logic

// =============================================================================
// SECTION 1: CONSTANTS & CONFIG
// =============================================================================

const STORAGE_KEY = 'budgetQuest_v1';

// =============================================================================
// SECTION 2: STATE â€” load / save / default
// =============================================================================

/**
 * Returns a fresh default state object.
 * @returns {Object}
 */
function getDefaultState() {
  return {
    transactions: [],
    categories: ['Food', 'Transport', 'Fun'],
    customCategories: [],
    spendingLimit: null,
    theme: 'light',
    level: 1,
    xp: 0,
    streak: 0,
    lastLoggedDate: null,
    badges: {
      firstTransaction: false,
      sevenDayStreak: false,
      underBudget: false
    }
  };
}

/**
 * Reads state from localStorage, merges any missing or malformed fields
 * with defaults, and returns the resulting state object.
 * Never throws â€” corrupt or absent data always falls back gracefully.
 * @returns {Object}
 */
function loadState() {
  const defaults = getDefaultState();
  let parsed = {};

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    parsed = JSON.parse(raw || '{}');
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      parsed = {};
    }
  } catch (_) {
    parsed = {};
  }

  // Per-field type-safe merge: replace any missing or wrong-typed value with its default.
  const state = {};

  state.transactions    = Array.isArray(parsed.transactions)    ? parsed.transactions    : defaults.transactions;
  state.categories      = Array.isArray(parsed.categories)      ? parsed.categories      : defaults.categories;
  state.customCategories= Array.isArray(parsed.customCategories)? parsed.customCategories: defaults.customCategories;
  state.spendingLimit   = (parsed.spendingLimit === null || typeof parsed.spendingLimit === 'number')
                            ? parsed.spendingLimit
                            : defaults.spendingLimit;
  state.theme           = (parsed.theme === 'light' || parsed.theme === 'dark')
                            ? parsed.theme
                            : defaults.theme;
  state.level           = (typeof parsed.level === 'number' && Number.isFinite(parsed.level))
                            ? parsed.level
                            : defaults.level;
  state.xp              = (typeof parsed.xp === 'number' && Number.isFinite(parsed.xp))
                            ? parsed.xp
                            : defaults.xp;
  state.streak          = (typeof parsed.streak === 'number' && Number.isFinite(parsed.streak))
                            ? parsed.streak
                            : defaults.streak;
  state.lastLoggedDate  = (parsed.lastLoggedDate === null || typeof parsed.lastLoggedDate === 'string')
                            ? parsed.lastLoggedDate
                            : defaults.lastLoggedDate;

  // Badges: must be an object; each sub-key must be boolean.
  if (typeof parsed.badges === 'object' && parsed.badges !== null && !Array.isArray(parsed.badges)) {
    state.badges = {
      firstTransaction: typeof parsed.badges.firstTransaction === 'boolean'
                          ? parsed.badges.firstTransaction
                          : defaults.badges.firstTransaction,
      sevenDayStreak:   typeof parsed.badges.sevenDayStreak === 'boolean'
                          ? parsed.badges.sevenDayStreak
                          : defaults.badges.sevenDayStreak,
      underBudget:      typeof parsed.badges.underBudget === 'boolean'
                          ? parsed.badges.underBudget
                          : defaults.badges.underBudget
    };
  } else {
    state.badges = { ...defaults.badges };
  }

  return state;
}

/**
 * Serializes the in-memory state object and writes it to localStorage.
 * On QuotaExceededError, shows a warning notification and continues in-memory.
 */
function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    if (err instanceof DOMException && (
      err.name === 'QuotaExceededError' ||
      err.name === 'NS_ERROR_DOM_QUOTA_REACHED'
    )) {
      showNotification('\u26A0\uFE0F Storage full \u2014 changes saved in memory only.', 'warning');
    }
    // Any other error is silently swallowed; the app continues with in-memory state.
  }
}

// Module-level state â€” the single source of truth for all application data.
let state = getDefaultState();

// =============================================================================
// SECTION 3: FORMATTERS
// =============================================================================

/**
 * Formats a numeric amount as Indonesian Rupiah using the browser's
 * Intl / toLocaleString API.
 * Requirement 14.1 â€” primary formatter using 'id-ID' locale.
 * @param {number} amount
 * @returns {string}  e.g. "Rp 1.500.000"
 */
function formatRupiah(amount) {
  return 'Rp ' + Math.round(amount).toLocaleString('id-ID');
}

/**
 * Fallback formatter for environments (older Safari) that do not support
 * the 'id-ID' locale argument in toLocaleString.
 * Requirement 14.2 â€” regex-based thousands separator using '.'.
 * @param {number} amount
 * @returns {string}  e.g. "Rp 1.500.000"
 */
function formatRupiahFallback(amount) {
  const rounded = Math.round(amount);
  return 'Rp ' + rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Returns today's date as a YYYY-MM-DD string in the user's local time zone.
 * Uses the 'sv' (Swedish) locale because its default date format is ISO 8601.
 * Requirement 14.3, 14.4 â€” local-time date string with no UTC offset shift.
 * @returns {string}  e.g. "2024-11-26"
 */
function getTodayString() {
  return new Date().toLocaleDateString('sv');
}

// =============================================================================
// SECTION 4: THEME â€” apply before first render, toggle and persist
// =============================================================================

// Early IIFE: runs synchronously before DOMContentLoaded to prevent flash of
// wrong theme. Sets data-theme on <html> so the CSS cascade applies immediately.
(function applyStoredTheme() {
  try {
    const saved = JSON.parse(localStorage.getItem('budgetQuest_v1') || '{}');
    if (saved.theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  } catch (_) {}
})();

/**
 * Applies the given theme to both <html> and <body>, and updates the
 * #theme-toggle button label to reflect the current mode.
 * @param {'light'|'dark'} theme
 */
function applyTheme(theme) {
  document.body.setAttribute('data-theme', theme);
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('theme-toggle');
  if (btn) {
    btn.textContent = theme === 'dark' ? '\u2600\uFE0F Light' : '\uD83C\uDF19 Dark';
  }
}

/**
 * Flips state.theme between 'light' and 'dark', applies the new theme,
 * and persists the updated state to localStorage.
 */
function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  applyTheme(state.theme);
  saveState();
}

// =============================================================================
// SECTION 5: NOTIFICATIONS
// =============================================================================

/**
 * Displays a toast notification that auto-dismisses after 3 seconds.
 *
 * Creates a `.notification` element with a `data-type` attribute, appends it
 * to `#notification-container`, then:
 *   1. After 3000 ms adds the `fade-out` CSS class (triggers CSS transition).
 *   2. After the transition ends (~400 ms) removes the element from the DOM.
 *
 * Requirements: 8.4, 10.5
 *
 * @param {string} message  â€” Text to display inside the notification.
 * @param {'info'|'success'|'warning'} type  â€” Visual style variant.
 */
function showNotification(message, type) {
  const container = document.getElementById('notification-container');
  if (!container) return; // Guard: container not yet in DOM (e.g. during tests)

  const el = document.createElement('div');
  el.classList.add('notification');
  el.setAttribute('data-type', type || 'info');
  el.textContent = message;

  container.appendChild(el);

  // After 3 s, start the fade-out CSS transition.
  setTimeout(() => {
    el.classList.add('fade-out');

    // Remove from DOM once the transition finishes (~400 ms).
    // Use transitionend for precision; fall back to a plain timeout in
    // environments where CSS transitions are disabled (e.g. prefers-reduced-motion).
    let removed = false;
    const cleanup = () => {
      if (removed) return;
      removed = true;
      el.removeEventListener('transitionend', cleanup);
      if (el.parentNode) el.parentNode.removeChild(el);
    };

    el.addEventListener('transitionend', cleanup);
    setTimeout(cleanup, 400); // Fallback: remove after 400 ms regardless
  }, 3000);
}

// =============================================================================
// SECTION 7: GAMIFICATION â€” XP & LEVELS
// =============================================================================

/**
 * Returns the total cumulative XP required to reach level n.
 * Uses a triangular-number formula so each successive level costs more XP.
 * Requirement 8.1
 * @param {number} n  â€” Target level number (1-based).
 * @returns {number}  â€” Total XP threshold for level n.
 */
function xpThreshold(n) {
  return 50 * n * (n - 1) / 2;
}

/**
 * Returns the total XP required to have reached the player's current level.
 * Requirement 8.2
 * @returns {number}
 */
function xpForCurrentLevel() {
  return xpThreshold(state.level);
}

/**
 * Returns the total XP required to reach the next level.
 * Requirement 8.3
 * @returns {number}
 */
function xpForNextLevel() {
  return xpThreshold(state.level + 1);
}

/**
 * Adds `points` XP to the player's current total and then checks whether a
 * level-up should occur.
 * Requirement 8.4
 * @param {number} points  â€” Non-negative XP to award.
 */
function awardXP(points) {
  state.xp += points;
  checkLevelUp();
}

/**
 * Checks whether the player has accumulated enough XP to advance one or more
 * levels. Increments `state.level` for every threshold crossed and shows a
 * toast notification for each level gained.
 * Requirement 8.5, 8.6, 8.7
 */
function checkLevelUp() {
  while (state.xp >= xpThreshold(state.level + 1)) {
    state.level++;
    showNotification('\u2B06\uFE0F Level Up! You are now Level ' + state.level + '!', 'success');
  }
}

// =============================================================================
// SECTION 8: GAMIFICATION â€” STREAK
// =============================================================================

/**
 * Returns the absolute number of whole days between two ISO date strings.
 * Requirements: 9.1, 9.2
 *
 * @param {string} dateStrA  â€” Earlier date, e.g. "2024-11-25"
 * @param {string} dateStrB  â€” Later date,   e.g. "2024-11-26"
 * @returns {number}  Whole days between the two dates (rounded).
 */
function daysBetween(dateStrA, dateStrB) {
  return Math.round((new Date(dateStrB) - new Date(dateStrA)) / 86400000);
}

/**
 * Updates state.streak and state.lastLoggedDate based on when the user last
 * logged a transaction relative to today.
 *
 * Rules:
 *   - First log ever (lastLoggedDate === null) â†’ streak = 1, record today.
 *   - Already logged today (diff === 0)        â†’ no change.
 *   - Logged yesterday (diff === 1)            â†’ streak += 1, record today.
 *   - Gap of 2+ days (diff >= 2)               â†’ streak reset to 1, record today.
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */
function updateStreak() {
  if (state.lastLoggedDate === null) {
    state.streak = 1;
    state.lastLoggedDate = getTodayString();
    return;
  }

  const diff = daysBetween(state.lastLoggedDate, getTodayString());

  if (diff === 0) {
    // Already logged today â€” nothing to do.
    return;
  } else if (diff === 1) {
    // Consecutive day â€” extend the streak.
    state.streak += 1;
    state.lastLoggedDate = getTodayString();
  } else {
    // Missed one or more days â€” reset the streak.
    state.streak = 1;
    state.lastLoggedDate = getTodayString();
  }
}

// =============================================================================
// SECTION 6: CATEGORIES
// =============================================================================

/**
 * Fixed brand colors for the three default categories.
 * Requirement 4.3 â€” default categories SHALL use fixed brand colors.
 */
const DEFAULT_CATEGORY_COLORS = {
  Food:      '#FF6B6B',
  Transport: '#4ECDC4',
  Fun:       '#45B7D1'
};

/**
 * Generates a visually distinct HSL color for a custom category based on its
 * index among all custom categories.
 *
 * The hue starts at 30Â° and advances by 60Â° per slot, cycling through 360Â°.
 * Saturation (70 %) and lightness (60 %) are fixed to keep colors vibrant and
 * readable on both light and dark backgrounds.
 *
 * Requirement 5.5, 4.3 â€” each custom category SHALL receive an automatically
 * generated distinct color.
 *
 * @param {number} customIndex  â€” zero-based index of the custom category.
 * @returns {string}  e.g. "hsl(30, 70%, 60%)"
 */
function generateCategoryColor(customIndex) {
  const hue = (30 + customIndex * 60) % 360;
  return `hsl(${hue}, 70%, 60%)`;
}

/**
 * Builds a parallel array of colors for the given category labels.
 *
 * - Default categories (Food, Transport, Fun) always receive their fixed brand
 *   colors from `DEFAULT_CATEGORY_COLORS`.
 * - Custom categories are looked up in `state.customCategories` to obtain a
 *   stable index, then mapped to `generateCategoryColor`.  When a category is
 *   not found in `state.customCategories` (e.g. the caller passes only the
 *   labels that appear as chart slices), the loop falls back to the array index
 *   `i` so a color is always returned.
 *
 * Requirements: 4.3, 5.5
 *
 * @param {string[]} allCategories  â€” ordered list of category names to colorize.
 * @returns {string[]}  Parallel array of CSS color strings.
 */
function buildColorArray(allCategories) {
  return allCategories.map((cat, i) => {
    if (DEFAULT_CATEGORY_COLORS[cat]) return DEFAULT_CATEGORY_COLORS[cat];
    const customIdx = state.customCategories.indexOf(cat);
    return generateCategoryColor(customIdx >= 0 ? customIdx : i);
  });
}

/**
 * Validates and adds a new custom category.
 *
 * Validation rules (Requirements 5.2, 5.3):
 *   1. Trimmed name must not be empty â†’ show `.category-error`.
 *   2. Name must not match any default or existing custom category
 *      (case-insensitive) â†’ show `.category-error`.
 *
 * On success (Requirement 5.2, 5.4):
 *   - Appends trimmed name to `state.customCategories`.
 *   - Persists via `saveState()`.
 *   - Re-renders the category `<select>` if `renderCategorySelect` exists.
 *   - Refreshes the pie chart if `updateChart` exists.
 *
 * @param {string} name  â€” Raw value from the category input field.
 */
function addCategory(name) {
  const trimmed = (name || '').trim();
  const errorEl = document.querySelector('.category-error');

  // Helper: show an error message in the .category-error element.
  function showCategoryError(msg) {
    if (errorEl) {
      errorEl.textContent = msg;
      errorEl.style.display = 'block';
    }
  }

  // Helper: hide the .category-error element.
  function hideCategoryError() {
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.style.display = 'none';
    }
  }

  // Rule 1 â€” empty input.
  if (trimmed === '') {
    showCategoryError('Category name cannot be empty.');
    return;
  }

  // Rule 2 â€” case-insensitive duplicate check across defaults AND custom list.
  const allExisting = [
    ...Object.keys(DEFAULT_CATEGORY_COLORS),
    ...state.customCategories
  ];
  const lowerTrimmed = trimmed.toLowerCase();
  const isDuplicate = allExisting.some(c => c.toLowerCase() === lowerTrimmed);

  if (isDuplicate) {
    showCategoryError('Category already exists.');
    return;
  }

  // Input is valid â€” clear any previous error.
  hideCategoryError();

  // Persist the new category.
  state.customCategories.push(trimmed);
  saveState();

  // Re-render dependents if the functions are available (they may not be
  // defined yet during the scaffolding phase).
  if (typeof renderCategorySelect === 'function') {
    renderCategorySelect();
  }
  if (typeof updateChart === 'function') {
    updateChart();
  }
}

// =============================================================================
// SECTION 9: BADGES
// =============================================================================

/**
 * Defines all badge criteria.
 *
 * Each entry has:
 *   key   â€” matches the boolean flag in state.badges.
 *   name  â€” human-readable label shown in the notification.
 *   icon  â€” emoji prefix for the notification toast.
 *   check â€” pure function (state, balance) â†’ boolean; returns true when the
 *           badge condition is currently met.
 *
 * Requirements: 10.1, 10.2, 10.3, 10.4
 */
const BADGE_DEFINITIONS = [
  {
    key: 'firstTransaction',
    name: 'First Transaction',
    icon: '\uD83C\uDFC6',
    check: (s, balance) => s.transactions.length >= 1
  },
  {
    key: 'sevenDayStreak',
    name: '7-Day Streak',
    icon: '\uD83D\uDD25',
    check: (s, balance) => s.streak >= 7
  },
  {
    key: 'underBudget',
    name: 'Under Budget',
    icon: '\uD83D\uDEE1\uFE0F',
    check: (s, balance) => s.spendingLimit !== null && s.spendingLimit > 0 && balance <= s.spendingLimit
  }
];

/**
 * Iterates over every badge definition and awards any badge whose condition is
 * now met and has not already been unlocked.
 *
 * For each newly unlocked badge:
 *   - Sets state.badges[key] = true.
 *   - Shows a toast notification: "<icon> Badge Unlocked: <name>!".
 *
 * Requirements: 10.5, 10.6
 *
 * Should be called after any state mutation that could satisfy a badge
 * condition (e.g. after adding a transaction, after updating the streak,
 * after changing the spending limit).
 */
function checkBadges() {
  const balance = getBalance();
  BADGE_DEFINITIONS.forEach(def => {
    if (!state.badges[def.key] && def.check(state, balance)) {
      state.badges[def.key] = true;
      showNotification(`${def.icon} Badge Unlocked: ${def.name}!`, 'success');
    }
  });
}

// =============================================================================
// SECTION 11: SPENDING LIMIT
// =============================================================================

/**
 * Sets the spending limit from a user-supplied value.
 *
 * Validation rules (Requirements 6.1, 6.2, 6.3):
 *   - Parses the input with parseFloat.
 *   - Rejects values that are NaN or <= 0: shows `.limit-error` with
 *     "Spending limit must be greater than zero."
 *
 * On valid input (Requirements 6.4, 6.5):
 *   - Stores Math.round(value) in state.spendingLimit.
 *   - Clears any displayed `.limit-error`.
 *   - Persists via saveState().
 *   - Calls renderAll() if defined (guards with typeof check).
 *
 * @param {number|string} value  â€” Raw input (from a form field or test caller).
 */
function setSpendingLimit(value) {
  const parsed = parseFloat(value);
  const errorEl = document.querySelector('.limit-error');

  if (isNaN(parsed) || parsed <= 0) {
    // Show validation error.
    if (errorEl) {
      errorEl.textContent = 'Spending limit must be greater than zero.';
      errorEl.style.display = 'block';
    }
    return;
  }

  // Input is valid â€” clear any previous error.
  if (errorEl) {
    errorEl.textContent = '';
    errorEl.style.display = 'none';
  }

  state.spendingLimit = Math.round(parsed);
  saveState();

  // Re-render if the render function is available (defined in a later section).
  if (typeof renderAll === 'function') {
    renderAll();
  }
}

/**
 * Returns true when the user's current balance exceeds the configured
 * spending limit.
 *
 * Requirements: 3.3, 3.4
 *   - Returns false when no limit has been set (state.spendingLimit === null).
 *   - Returns true when state.spendingLimit is set AND getBalance() exceeds it.
 *
 * NOTE: getBalance() is defined in the transactions section and will be
 * available at runtime before this function is ever called.
 *
 * @returns {boolean}
 */
function isOverLimit() {
  return state.spendingLimit !== null && getBalance() > state.spendingLimit;
}

// =============================================================================
// SECTION 10: TRANSACTIONS
// =============================================================================

/**
 * Generates a collision-resistant unique ID string.
 * Combines a base-36 timestamp with a random base-36 suffix.
 * Requirements: 1.2
 * @returns {string}  e.g. "lf2k3g1qz4m7"
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

/**
 * Returns the current account balance â€” the sum of all transaction amounts.
 * Income transactions carry positive amounts; expense transactions carry
 * negative amounts, so a simple reduce produces the net balance.
 * Requirements: 2.3, 2.4
 * @returns {number}
 */
function getBalance() {
  return state.transactions.reduce((s, t) => s + t.amount, 0);
}

/**
 * Validates inputs, builds a transaction object, persists it, and triggers
 * all downstream updates (streak, XP, badges, render).
 *
 * Validation rules (Requirements 1.3, 1.4):
 *   - `item.trim()` must be non-empty â†’ show `.form-error` and return.
 *   - `amount` must be strictly greater than 0 â†’ show `.form-error` and return.
 *
 * On success (Requirements 1.2, 3.1, 3.2, 8.3, 8.6):
 *   1. Builds `{ id, item, amount, category, date }` and pushes it to
 *      `state.transactions`.
 *   2. Calls `updateStreak()` to maintain the daily-logging streak.
 *   3. Calls `saveState()` to persist the new transaction.
 *   4. Awards 10 XP if the spending limit is not set OR the balance stays
 *      within the limit (Requirements 8.3, 8.6).
 *   5. Calls `checkBadges()` to evaluate any newly met badge conditions.
 *   6. Calls `renderAll()` to refresh the UI.
 *   7. Hides `.form-error` on success.
 *
 * @param {string} item      â€” Raw description string from the form input.
 * @param {number} amount    â€” Numeric amount (positive = income, negative = expense).
 * @param {string} category  â€” Category label (e.g. "Food", "Transport").
 */
function addTransaction(item, amount, category) {
  const errorEl = document.querySelector('.form-error');

  // Helper: show validation message.
  function showFormError(msg) {
    if (errorEl) {
      errorEl.textContent = msg;
      errorEl.style.display = 'block';
    }
  }

  // Helper: hide validation message.
  function hideFormError() {
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.style.display = 'none';
    }
  }

  // Validation â€” Requirement 1.3: item must not be blank.
  if (!item || item.trim() === '') {
    showFormError('Item description cannot be empty.');
    return;
  }

  // Validation â€” Requirement 1.4: amount must be positive.
  if (!(amount > 0)) {
    showFormError('Amount must be greater than 0.');
    return;
  }

  // Build the transaction object â€” Requirement 1.2.
  const transaction = {
    id:       generateId(),
    item:     item.trim(),
    amount:   Math.round(amount),
    category: category,
    date:     getTodayString()
  };

  state.transactions.push(transaction);

  // Update streak before saving so lastLoggedDate reflects today.
  updateStreak();

  saveState();

  // Award XP â€” Requirement 8.3, 8.6:
  // Grant 10 XP only when there is no spending limit OR the balance is within it.
  if (state.spendingLimit === null || getBalance() <= state.spendingLimit) {
    awardXP(10);
  }

  // Evaluate badges â€” guard in case checkBadges is not yet defined.
  if (typeof checkBadges === 'function') {
    checkBadges();
  }

  // Re-render the UI â€” guard in case renderAll is not yet defined.
  if (typeof renderAll === 'function') {
    renderAll();
  }

  // Clear any lingering validation message on success.
  hideFormError();
}

/**
 * Removes the transaction with the given ID from state and triggers a
 * full UI refresh.
 * Requirements: 3.1, 3.2
 *
 * @param {string} id  â€” The `id` property of the transaction to delete.
 */
function deleteTransaction(id) {
  state.transactions = state.transactions.filter(t => t.id !== id);
  saveState();

  if (typeof renderAll === 'function') {
    renderAll();
  }
}

// =============================================================================
// SECTION 12: CHART
// =============================================================================

let chartInstance = null;

/**
 * Builds a Map of category â†’ total amount from all current transactions.
 * Requirements: 4.1, 4.2
 * @returns {Map<string, number>}
 */
function getCategoryTotals() {
  const totals = new Map();
  state.transactions.forEach(t => {
    totals.set(t.category, (totals.get(t.category) || 0) + t.amount);
  });
  return totals;
}

/**
 * Initialises the Chart.js pie chart on the #spending-chart canvas.
 *
 * - If the canvas element is absent, returns silently.
 * - If Chart.js is not loaded (CDN unavailable), shows a static fallback
 *   message in #chart-container instead of crashing.
 * - Otherwise creates a pie chart instance with:
 *     responsive: true, legend at bottom, Rupiah tooltip callback.
 *
 * Requirements: 4.1, 4.3, 4.4, 5.5
 */
function initChart() {
  const canvas = document.getElementById('spending-chart');
  if (!canvas) return;
  if (typeof Chart === 'undefined') {
    const container = document.getElementById('chart-container');
    if (container) {
      container.textContent = 'Chart unavailable â€” please check your internet connection.';
    }
    return;
  }
  const ctx = canvas.getContext('2d');
  chartInstance = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: [],
      datasets: [{ data: [], backgroundColor: [] }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.label}: ${formatRupiah(ctx.parsed)}`
          }
        }
      }
    }
  });
}

/**
 * Feeds the latest category totals into the existing chart instance and
 * redraws it.
 *
 * - No-ops when chartInstance is null (initChart was not yet called or failed).
 * - Shows a single grey "No transactions" slice when there are no transactions.
 * - Otherwise maps category labels â†’ amounts â†’ colours via buildColorArray.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 5.5
 */
function updateChart() {
  if (!chartInstance) return;
  const totals = getCategoryTotals();
  if (totals.size === 0) {
    chartInstance.data.labels = ['No transactions'];
    chartInstance.data.datasets[0].data = [1];
    chartInstance.data.datasets[0].backgroundColor = ['#cccccc'];
  } else {
    const labels = [...totals.keys()];
    chartInstance.data.labels = labels;
    chartInstance.data.datasets[0].data = labels.map(l => totals.get(l));
    chartInstance.data.datasets[0].backgroundColor = buildColorArray(labels);
  }
  chartInstance.update();
}

// =============================================================================
// SECTION 13: UI / RENDER
// =============================================================================

/**
 * Renders the balance card with the current balance, over-limit styling,
 * and spending limit display text.
 * Requirements: 2.1, 2.2, 3.3, 3.4, 6.3, 6.4
 */
function renderBalanceCard() {
  const card = document.getElementById('balance-card');
  if (!card) return;

  // Update balance amount display.
  const balanceEl = card.querySelector('.balance-amount');
  if (balanceEl) {
    balanceEl.textContent = formatRupiah(getBalance());
  }

  // Toggle over-limit styling.
  if (isOverLimit()) {
    card.classList.add('over-limit');
  } else {
    card.classList.remove('over-limit');
  }

  // Update spending limit display text.
  const limitDisplay = card.querySelector('.spending-limit-display');
  if (limitDisplay) {
    limitDisplay.textContent = state.spendingLimit
      ? 'Limit: ' + formatRupiah(state.spendingLimit)
      : 'Spending Limit: Not set';
  }
}

/**
 * Shows or hides the boss banner based on whether the user is over the limit.
 * Requirements: 3.3, 3.4
 */
function renderBossBanner() {
  const banner = document.getElementById('boss-banner');
  if (!banner) return;

  if (isOverLimit()) {
    banner.removeAttribute('hidden');
  } else {
    banner.setAttribute('hidden', '');
  }
}

/**
 * Renders the hero panel: level label, XP progress bar width and aria value,
 * and XP label text.
 * Requirements: 8.1, 8.2
 */
function renderHeroPanel() {
  const panel = document.getElementById('hero-panel');
  if (!panel) return;

  // Level label.
  const levelEl = panel.querySelector('.hero-level');
  if (levelEl) {
    levelEl.textContent = 'Level ' + state.level;
  }

  // XP progress calculations.
  const progressXP  = state.xp - xpForCurrentLevel();
  const intervalXP  = xpForNextLevel() - xpForCurrentLevel();
  const percentage  = Math.min(100, Math.round((progressXP / intervalXP) * 100));

  // Progress bar fill width.
  const fill = panel.querySelector('.xp-bar-fill');
  if (fill) {
    fill.style.width = percentage + '%';
  }

  // ARIA value for the progress bar container.
  const container = panel.querySelector('.xp-bar-container');
  if (container) {
    container.setAttribute('aria-valuenow', percentage);
  }

  // XP label text.
  const xpLabel = panel.querySelector('.xp-label');
  if (xpLabel) {
    xpLabel.textContent =
      (state.xp - xpForCurrentLevel()) + ' / ' +
      (xpForNextLevel() - xpForCurrentLevel()) + ' XP';
  }
}

/**
 * Renders the streak panel with the current streak count.
 * Requirements: 9.1
 */
function renderStreakPanel() {
  const countEl = document.querySelector('#streak-panel .streak-count');
  if (!countEl) return;
  countEl.textContent = '\uD83D\uDD25 ' + state.streak + ' day streak';
}

/**
 * Renders the transaction list.
 * Shows an empty-state message when there are no transactions;
 * otherwise builds and injects the full list HTML.
 * Requirements: 1.5, 2.1, 2.2, 3.1
 */
function renderTransactionList() {
  const listEl = document.getElementById('transaction-list');
  if (!listEl) return;

  if (state.transactions.length === 0) {
    listEl.innerHTML =
      '<p class="empty-state">No transactions yet. Add your first expense!</p>';
    return;
  }

  listEl.innerHTML = state.transactions.map(t =>
    '<div class="transaction-item">' +
      '<span class="item-name">'     + t.item                     + '</span>' +
      '<span class="item-amount">'   + formatRupiah(t.amount)     + '</span>' +
      '<span class="item-category">' + t.category                 + '</span>' +
      '<button class="delete-btn" data-id="' + t.id + '" aria-label="Delete transaction">\u00d7</button>' +
    '</div>'
  ).join('');
}

/**
 * Renders the category <select> options from the combined default + custom
 * categories list.
 * Requirements: 4.2
 */
function renderCategorySelect() {
  const select = document.getElementById('category-select');
  if (!select) return;

  select.innerHTML = state.categories.concat(state.customCategories).map(cat =>
    '<option value="' + cat + '">' + cat + '</option>'
  ).join('');
}

/**
 * Renders all badge items in the badge section, marking each as locked or
 * unlocked based on the current state.
 * Requirements: 10.1
 */
function renderBadges() {
  const section = document.getElementById('badge-section');
  if (!section) return;

  section.innerHTML = BADGE_DEFINITIONS.map(def => {
    const status = state.badges[def.key] ? 'unlocked' : 'locked';
    return '<div class="badge-item ' + status + '">' +
             '<span class="badge-icon">' + def.icon + '</span>' +
             '<span class="badge-name">' + def.name + '</span>' +
           '</div>';
  }).join('');
}

/**
 * Calls every individual render function in order to fully refresh the UI.
 * Also updates the chart.
 * Requirements: 1.5, 2.1, 2.2, 3.1, 3.3, 3.4, 4.2, 6.3, 6.4, 8.1, 8.2, 9.1, 10.1
 */
function renderAll() {
  renderBalanceCard();
  renderBossBanner();
  renderHeroPanel();
  renderStreakPanel();
  renderTransactionList();
  renderCategorySelect();
  renderBadges();
  updateChart();
}

// =============================================================================
// SECTION 14: EVENT LISTENERS
// =============================================================================

/**
 * Wires all DOM event listeners to their corresponding logic functions.
 * Called once from initApp() after the DOM is ready.
 * Requirements: 1.2, 1.3, 1.4, 5.1, 5.2, 5.3, 6.1, 6.5, 7.1
 */
function initEventListeners() {
  // ---------------------------------------------------------------------------
  // Transaction form â€” add a new transaction
  // Requirements: 1.2, 1.3, 1.4
  // ---------------------------------------------------------------------------
  const transactionForm = document.getElementById('transaction-form');
  if (transactionForm) {
    transactionForm.addEventListener('submit', function (event) {
      event.preventDefault();

      const item     = document.getElementById('item-input').value;
      const amount   = parseFloat(document.getElementById('amount-input').value);
      const category = document.getElementById('category-select').value;

      addTransaction(item, amount, category);

      // addTransaction sets the form-error element on failure.
      // If it is empty after the call, the transaction was added successfully.
      const formError = document.querySelector('.form-error');
      if (!formError || formError.textContent.trim() === '') {
        // Clear fields and return focus to the item input for quick entry
        document.getElementById('item-input').value    = '';
        document.getElementById('amount-input').value  = '';
        const itemInput = document.getElementById('item-input');
        if (itemInput) itemInput.focus();
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Spending-limit form â€” set / update the spending limit
  // Requirements: 5.1, 5.2, 5.3
  // ---------------------------------------------------------------------------
  const limitForm = document.getElementById('limit-form');
  if (limitForm) {
    limitForm.addEventListener('submit', function (event) {
      event.preventDefault();

      const limitValue = parseFloat(document.getElementById('limit-input').value);
      setSpendingLimit(limitValue);
    });
  }

  // ---------------------------------------------------------------------------
  // Category form â€” add a custom category
  // Requirements: 6.1, 6.5
  // ---------------------------------------------------------------------------
  const categoryForm = document.getElementById('category-form');
  if (categoryForm) {
    categoryForm.addEventListener('submit', function (event) {
      event.preventDefault();

      const categoryInput = document.getElementById('category-input');
      const name = categoryInput ? categoryInput.value : '';

      addCategory(name);

      // Clear the input on success. addCategory renders the updated list when
      // successful, so an empty input field is the success signal here.
      if (categoryInput) categoryInput.value = '';
    });
  }

  // ---------------------------------------------------------------------------
  // Theme toggle button
  // Requirements: 7.1
  // ---------------------------------------------------------------------------
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', function () {
      toggleTheme();
    });
  }

  // ---------------------------------------------------------------------------
  // Transaction list â€” delegated delete button handler
  // Requirements: 1.4
  // ---------------------------------------------------------------------------
  const transactionList = document.getElementById('transaction-list');
  if (transactionList) {
    transactionList.addEventListener('click', function (event) {
      const btn = event.target.closest('.delete-btn');
      if (!btn) return;

      const id = btn.dataset.id;
      if (id) {
        deleteTransaction(id);
      }
    });
  }
}

// ============================================================
// SECTION 15: INIT
// ============================================================

document.addEventListener('DOMContentLoaded', function () {
  state = loadState();          // 1. Populate in-memory state from localStorage
  applyTheme(state.theme);      // 2. Sync full theme on both html and body elements
  initEventListeners();         // 3. Wire all DOM events
  initChart();                  // 4. Create the Chart.js instance
  renderAll();                  // 5. Render the full UI
});

