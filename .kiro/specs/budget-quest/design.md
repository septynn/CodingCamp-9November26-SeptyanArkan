# Design Document

## Overview

Budget Quest is a fully client-side, single-page web application for personal expense tracking with a light RPG skin. There is no backend, no build step, and no framework. The entire application ships as three static files (`index.html`, `css/style.css`, `js/script.js`) that are served directly from GitHub Pages.

The app adopts a **pixel/retro RPG aesthetic**: bold pixel-style fonts, card components with hard-shadow borders, accent colors drawn from classic RPG palettes, and game-like notifications. All interactivity is handled by vanilla JavaScript, and all persistence is handled via the browser `localStorage` API.

The key runtime loop is:

1. User performs an action (add transaction, delete, change limit, toggle theme, add category).
2. JavaScript mutates the in-memory state object.
3. The state object is serialized and written to `localStorage`.
4. All affected UI components re-render from the state.

This uni-directional flow keeps the UI and storage always in sync.

---

## Architecture

### Deployment Architecture

```
GitHub Pages (static hosting)
└── repository root
    ├── index.html          ← single HTML shell
    ├── css/
    │   └── style.css       ← all styles, CSS custom properties, responsive rules
    └── js/
        └── script.js       ← all application logic
```

No build step, no package manager, no bundler. `index.html` loads Chart.js from CDN and then `script.js`.

### Runtime Architecture

```
Browser
├── DOM  (index.html provides the static shell)
│   ├── Header / Balance Card
│   ├── Hero Stats Panel  (Level, XP bar)
│   ├── Boss Battle Banner  (conditional)
│   ├── Transaction Form
│   ├── Spending Limit Input
│   ├── Custom Category Control
│   ├── Transaction List
│   ├── Pie Chart (Chart.js canvas)
│   └── Badge Section
│
├── script.js
│   ├── State Module       (in-memory state, load/save to localStorage)
│   ├── Transactions Module (CRUD, XP award, streak update, badge check)
│   ├── Categories Module  (add custom categories, color generation)
│   ├── Gamification Module (XP/Level logic, streak logic, badge logic)
│   ├── Chart Module       (Chart.js wrapper, update/destroy/empty-state)
│   ├── UI Module          (render functions for every component)
│   ├── Theme Module       (dark/light toggle, applied pre-render)
│   └── Formatter Module   (currency, date helpers)
│
└── localStorage
    └── budgetQuest_v1  (single JSON key, see Data Models)
```

### Script Organisation (script.js internal structure)

`script.js` is a single file organized into self-contained sections using IIFE-style function groupings. No ES modules are used (GitHub Pages serves static files; module loading works without a server but adds complexity for a single-file design). The execution order is:

```
1. CONSTANTS & CONFIG
2. STATE (load / save / default)
3. FORMATTER (currency, date)
4. THEME (apply before first render)
5. GAMIFICATION (XP/Level, streak, badges)
6. CATEGORIES (add, color generation)
7. TRANSACTIONS (add, delete)
8. CHART (init, update, destroy)
9. UI / RENDER (render all components)
10. EVENT LISTENERS (wire DOM events to logic)
11. INIT (bootstrap on DOMContentLoaded)
```

Each section exposes only functions called by later sections; there is no global variable pollution beyond the single `state` object and the `chartInstance` handle.

---

## Components and Interfaces

### Component Hierarchy

```
<body data-theme="light|dark">
├── <header>
│   ├── .app-title          "⚔️ Budget Quest"
│   └── .theme-toggle       button  ← toggleTheme()
│
├── #balance-card           ← renderBalanceCard()
│   ├── .balance-label      "Total Spending"
│   ├── .balance-amount     Rp X.XXX
│   └── .spending-limit-display
│
├── #boss-banner            ← renderBossBanner()  [hidden when not over limit]
│
├── #hero-panel             ← renderHeroPanel()
│   ├── .hero-level         "Level N"
│   ├── .xp-bar-container
│   │   └── .xp-bar-fill    width %
│   └── .xp-label           "X / Y XP"
│
├── #streak-panel           ← renderStreakPanel()
│   └── .streak-count       "🔥 N day streak"
│
├── .controls-grid
│   ├── #transaction-form   ← renderForm() / handleFormSubmit()
│   │   ├── #item-input
│   │   ├── #amount-input
│   │   ├── #category-select
│   │   ├── .form-error     [hidden by default]
│   │   └── button[type=submit]
│   │
│   ├── #limit-form         ← handleLimitSubmit()
│   │   ├── #limit-input
│   │   ├── .limit-error    [hidden by default]
│   │   └── button[type=submit]
│   │
│   └── #category-form      ← handleCategorySubmit()
│       ├── #category-input
│       ├── .category-error [hidden by default]
│       └── button[type=submit]
│
├── #transaction-list       ← renderTransactionList()
│   └── .transaction-item × N
│       ├── .item-name
│       ├── .item-amount
│       ├── .item-category
│       └── .delete-btn     ← deleteTransaction(id)
│
├── #chart-container        ← renderChart()
│   └── <canvas id="spending-chart">
│
├── #badge-section          ← renderBadges()
│   └── .badge-item × N     (locked badges shown as greyed-out)
│
└── #notification-container ← showNotification(msg)
    └── .notification       (auto-dismissed after 3 s)
```

### Key Function Interfaces

```javascript
// State
function loadState()       // reads localStorage, returns parsed state or defaults
function saveState()       // serializes state and writes to localStorage
function getDefaultState() // returns a fresh state object

// Formatter
function formatRupiah(amount)      // number → "Rp X.XXX"
function getTodayString()          // → "YYYY-MM-DD"

// Theme
function applyTheme(theme)         // sets data-theme on <body>
function toggleTheme()             // flips and persists theme

// Gamification
function awardXP(amount)           // mutates state.xp, checks level-up
function xpThreshold(n)            // returns 50 * n * (n-1) / 2
function xpForCurrentLevel()       // XP floor of state.level
function xpForNextLevel()          // XP floor of state.level + 1
function checkLevelUp()            // promotes level if XP >= threshold, loops
function updateStreak()            // calendar-day streak logic
function checkBadges()             // evaluates all badge conditions

// Categories
function generateCategoryColor(index) // → HSL color string
function addCategory(name)            // validates, adds, persists

// Transactions
function addTransaction(item, amount, category) // validates, adds, awards XP, updates streak, checks badges
function deleteTransaction(id)                  // removes, recalculates, re-renders

// Chart
function initChart()   // creates Chart.js instance
function updateChart() // feeds new data to existing instance
function destroyChart() // teardown before re-init

// Render
function renderAll()               // calls every render sub-function
function renderBalanceCard()
function renderBossBanner()
function renderHeroPanel()
function renderStreakPanel()
function renderTransactionList()
function renderCategorySelect()
function renderBadges()
function renderLimitDisplay()

// Notifications
function showNotification(message, type) // type: "info"|"success"|"warning"
```

---

## Data Models

### LocalStorage Schema

All state is stored under a **single key**: `budgetQuest_v1`.  
Value: a UTF-8 JSON string representing the following object.

```json
{
  "transactions": [
    {
      "id": "string (UUID v4 or Date.now() + Math.random())",
      "item": "string",
      "amount": "number (integer, rounded Rupiah)",
      "category": "string",
      "date": "string (YYYY-MM-DD)"
    }
  ],
  "categories": ["Food", "Transport", "Fun"],
  "customCategories": ["string"],
  "spendingLimit": "number | null",
  "theme": "\"light\" | \"dark\"",
  "level": "number (integer ≥ 1)",
  "xp": "number (integer ≥ 0, cumulative total XP earned)",
  "streak": "number (integer ≥ 0)",
  "lastLoggedDate": "string (YYYY-MM-DD) | null",
  "badges": {
    "firstTransaction": "boolean",
    "sevenDayStreak": "boolean",
    "underBudget": "boolean"
  }
}
```

**Default state** (applied when key is absent or any field is missing/malformed):

| Field | Default |
|---|---|
| `transactions` | `[]` |
| `categories` | `["Food", "Transport", "Fun"]` |
| `customCategories` | `[]` |
| `spendingLimit` | `null` |
| `theme` | `"light"` |
| `level` | `1` |
| `xp` | `0` |
| `streak` | `0` |
| `lastLoggedDate` | `null` |
| `badges` | `{ firstTransaction: false, sevenDayStreak: false, underBudget: false }` |

**Malformed-data handling**: When `JSON.parse` throws or when any top-level field fails a type check (`typeof` / `Array.isArray`), that field is silently replaced with its default. The app never surfaces a JSON parse error to the user.

### Computed Values (derived at runtime, never stored)

| Computed | Derivation |
|---|---|
| `balance` | `transactions.reduce((s, t) => s + t.amount, 0)` |
| `categoryTotals` | `Map<category, sum>` built from transactions |
| `isOverLimit` | `spendingLimit !== null && balance > spendingLimit` |
| `xpToNextLevel` | `xpForNextLevel() - xpForCurrentLevel()` |
| `xpProgress` | `xp - xpForCurrentLevel()` |

### Transaction ID Generation

```javascript
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
```

Collision probability is negligible for a client-side single-user app.

---

## XP / Level System

### Threshold Formula

```
XP_Threshold(n) = 50 × n × (n − 1) / 2
```

| Level | Cumulative XP required |
|---|---|
| 1 | 0 |
| 2 | 50 |
| 3 | 150 |
| 4 | 300 |
| 5 | 500 |

Each subsequent level requires 50 more XP than the previous interval.

### Implementation

```javascript
function xpThreshold(n) {
  return 50 * n * (n - 1) / 2;
}

function xpForCurrentLevel() {
  return xpThreshold(state.level);
}

function xpForNextLevel() {
  return xpThreshold(state.level + 1);
}

function awardXP(points) {
  state.xp += points;
  checkLevelUp();
}

function checkLevelUp() {
  while (state.xp >= xpThreshold(state.level + 1)) {
    state.level += 1;
    showNotification(`⬆️ Level Up! You are now Level ${state.level}!`, 'success');
  }
}
```

**XP Award Rule**: 10 XP is awarded when a transaction is added AND either `spendingLimit` is `null` OR `balance <= spendingLimit` **after** adding the transaction. The balance is recalculated before the XP check.

### XP Bar Rendering

```javascript
const progressXP  = state.xp - xpForCurrentLevel();
const intervalXP  = xpForNextLevel() - xpForCurrentLevel();
const percentage  = Math.min(100, Math.round((progressXP / intervalXP) * 100));
xpBarFill.style.width = percentage + '%';
```

---

## Streak Logic

Streaks track **calendar days** using ISO date strings (`YYYY-MM-DD`). Time zones are handled by using `new Date().toLocaleDateString('sv')` which returns `YYYY-MM-DD` in the user's local time zone.

```javascript
function getTodayString() {
  return new Date().toLocaleDateString('sv'); // "YYYY-MM-DD" in local TZ
}

function daysBetween(dateStrA, dateStrB) {
  const a = new Date(dateStrA);
  const b = new Date(dateStrB);
  return Math.round((b - a) / 86400000);
}

function updateStreak() {
  const today = getTodayString();
  if (state.lastLoggedDate === null) {
    state.streak = 1;
    state.lastLoggedDate = today;
    return;
  }
  const diff = daysBetween(state.lastLoggedDate, today);
  if (diff === 0) {
    // Already logged today — streak unchanged
    return;
  } else if (diff === 1) {
    // Consecutive day
    state.streak += 1;
    state.lastLoggedDate = today;
  } else {
    // Gap of 2+ days — reset
    state.streak = 1;
    state.lastLoggedDate = today;
  }
}
```

---

## Currency Formatting

All monetary values are displayed as Indonesian Rupiah with period thousands separators and no decimal places.

```javascript
function formatRupiah(amount) {
  const rounded = Math.round(amount);
  return 'Rp ' + rounded.toLocaleString('id-ID');
}
```

`'id-ID'` locale uses a period as the thousands separator and a comma as the decimal separator, matching the required `Rp 25.000` format. If `toLocaleString` with `'id-ID'` is unavailable (edge case in older Safari), a manual fallback is used:

```javascript
function formatRupiahFallback(amount) {
  const rounded = Math.round(amount);
  return 'Rp ' + rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
```

**Input handling**: The amount field accepts any numeric input. On form submit, the value is parsed with `parseFloat`, then passed through `Math.round` before storage.

---

## Color Generation for Custom Categories

Default categories have fixed brand colors:

| Category | Color |
|---|---|
| Food | `#FF6B6B` (warm red) |
| Transport | `#4ECDC4` (teal) |
| Fun | `#45B7D1` (sky blue) |

Custom categories receive auto-generated HSL colors distributed evenly around the hue wheel, offset from the default category hues:

```javascript
const DEFAULT_CATEGORY_COLORS = {
  Food: '#FF6B6B',
  Transport: '#4ECDC4',
  Fun: '#45B7D1'
};

function generateCategoryColor(customIndex) {
  // Start at hue 30 (orange), step 60° per custom category
  // This avoids the 0°/120°/180° region occupied by defaults
  const hue = (30 + customIndex * 60) % 360;
  return `hsl(${hue}, 70%, 60%)`;
}
```

The `customIndex` is the 0-based position of the category in `state.customCategories`. Colors are recalculated from the index each render; they do not need to be stored.

Chart.js receives an array of color strings built by mapping over `state.categories` and `state.customCategories`:

```javascript
function buildColorArray(allCategories) {
  return allCategories.map((cat, i) => {
    if (DEFAULT_CATEGORY_COLORS[cat]) return DEFAULT_CATEGORY_COLORS[cat];
    const customIdx = i - 3; // first 3 slots are defaults
    return generateCategoryColor(customIdx);
  });
}
```

---

## Chart.js Integration

### Loading

Chart.js is loaded from CDN in `index.html` before `script.js`:

```html
<script src="https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js"></script>
<script src="js/script.js"></script>
```

### Chart Instance Management

A single `chartInstance` variable holds the active `Chart` object. On every data change the chart data is mutated in place and `chartInstance.update()` is called — avoiding full destroy/re-init on every transaction.

```javascript
let chartInstance = null;

function initChart() {
  const ctx = document.getElementById('spending-chart').getContext('2d');
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

function updateChart() {
  const totals = getCategoryTotals(); // Map<category, sum>
  if (totals.size === 0) {
    // Empty state: show placeholder data
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
```

**Empty state**: A single grey slice labelled "No transactions" is shown when `totals.size === 0`, satisfying Requirement 4.4.

---

## Dark / Light Mode

### Strategy

Theme is implemented with **CSS custom properties** on the `:root` element and a `data-theme` attribute on `<body>`. Swapping the attribute is the only DOM change needed to switch the entire color scheme.

```css
:root {
  --bg-primary:    #f0e6d3;
  --bg-card:       #fff9f0;
  --text-primary:  #2d1b00;
  --text-secondary:#5a3e28;
  --accent:        #c0392b;
  --border:        #2d1b00;
  --shadow:        4px 4px 0 #2d1b00;
  --danger-bg:     #ffcccc;
  --danger-text:   #8b0000;
}

[data-theme="dark"] {
  --bg-primary:    #1a1a2e;
  --bg-card:       #16213e;
  --text-primary:  #e0d5c5;
  --text-secondary:#b0a090;
  --accent:        #e74c3c;
  --border:        #e0d5c5;
  --shadow:        4px 4px 0 #e0d5c5;
  --danger-bg:     #4a0000;
  --danger-text:   #ff9999;
}
```

### Flash Prevention

The theme is applied **before** any visible rendering. In `script.js`, the very first executable statement reads the stored theme and sets `data-theme`:

```javascript
// IIFE at top of script.js — runs synchronously before DOMContentLoaded
(function applyStoredTheme() {
  try {
    const saved = JSON.parse(localStorage.getItem('budgetQuest_v1') || '{}');
    if (saved.theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  } catch (_) {}
})();
```

`data-theme` is set on `<html>` (not `<body>`) in this early IIFE so that the CSS cascade applies immediately. The full state load in `INIT` later syncs `<body>` as well.

### Toggle

```javascript
function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  applyTheme(state.theme);
  saveState();
}

function applyTheme(theme) {
  document.body.setAttribute('data-theme', theme);
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('theme-toggle');
  btn.textContent = theme === 'dark' ? '☀️ Light' : '🌙 Dark';
}
```

---

## Responsive Layout Strategy

### Approach

CSS Grid and Flexbox are used together. The layout is **mobile-first**: the base styles define the single-column stacked layout, and a `min-width: 768px` media query applies the two-column desktop grid.

### Grid Structure

```css
/* Mobile (default) */
.app-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
  padding: 1rem;
  max-width: 1200px;
  margin: 0 auto;
}

/* Desktop */
@media (min-width: 768px) {
  .app-grid {
    grid-template-columns: 1fr 1fr;
  }
  .full-width {
    grid-column: 1 / -1;
  }
}
```

**Grid placement:**

| Component | Mobile | Desktop |
|---|---|---|
| Balance Card | full width | full width (col 1–2) |
| Boss Banner | full width | full width |
| Hero Panel + Streak | full width | col 1 |
| Pie Chart | full width | col 2 |
| Transaction Form | full width | col 1 |
| Limit + Category Forms | full width | col 2 |
| Transaction List | full width | full width |
| Badge Section | full width | full width |

### Touch Targets

All buttons and interactive elements have `min-width: 44px; min-height: 44px` applied. The delete button on transaction items uses padding rather than a fixed size to maintain proportion on larger screens.

### Typography

- **Primary font**: `'Press Start 2P'` (Google Fonts) — pixel style, used for headings, level, and badge names.
- **Body font**: `'VT323'` (Google Fonts) — retro monospace, legible at 18 px+ for body text.
- **Fallback**: `monospace` for both.
- Minimum body font size: 16 px on mobile. `Press Start 2P` is used at reduced sizes (10–12 px) only for decorative labels.

---

## Pixel / Retro Design

### Visual Language

- **Hard box shadows**: `4px 4px 0 var(--border)` on cards (no blur, solid offset — classic pixel look).
- **Sharp borders**: `2px solid var(--border)` — no border-radius on primary cards (or `2px` radius max).
- **Accent colors**: Warm earthy tones in light mode; deep navy + red in dark mode.
- **Boss Banner**: Red background, animated `pulse` keyframe (`opacity 0.8 ↔ 1.0`), ⚔️ emoji decoration.
- **Notifications**: Slide-in from bottom-right, auto-dismiss after 3 seconds with fade-out transition.
- **XP Bar**: Pixel-chunked appearance via `background: repeating-linear-gradient(...)` with a solid fill color.

---

## Badge Unlock Logic

Three badges are defined. Each has a `key` matching the `state.badges` object.

| Badge | Key | Condition |
|---|---|---|
| First Transaction | `firstTransaction` | `state.transactions.length >= 1` |
| 7-Day Streak | `sevenDayStreak` | `state.streak >= 7` |
| Under Budget | `underBudget` | `state.spendingLimit > 0 && balance <= state.spendingLimit` |

```javascript
const BADGE_DEFINITIONS = [
  {
    key: 'firstTransaction',
    name: 'First Transaction',
    icon: '🏆',
    check: (s, balance) => s.transactions.length >= 1
  },
  {
    key: 'sevenDayStreak',
    name: '7-Day Streak',
    icon: '🔥',
    check: (s, balance) => s.streak >= 7
  },
  {
    key: 'underBudget',
    name: 'Under Budget',
    icon: '🛡️',
    check: (s, balance) => s.spendingLimit !== null && s.spendingLimit > 0 && balance <= s.spendingLimit
  }
];

function checkBadges() {
  const balance = getBalance();
  BADGE_DEFINITIONS.forEach(def => {
    if (!state.badges[def.key] && def.check(state, balance)) {
      state.badges[def.key] = true;
      showNotification(`${def.icon} Badge Unlocked: ${def.name}!`, 'success');
    }
  });
}
```

`checkBadges()` is called after every `addTransaction()`. Badges are **one-way** — once unlocked, they cannot be re-locked (the `!state.badges[def.key]` guard ensures the notification fires only once).

### Badge Rendering

Unlocked badges render as bright, full-opacity cards. Locked badges render as grey, low-opacity cards with a lock icon overlay, so the player can see what milestones exist.

---

## Error Handling

| Scenario | Handling |
|---|---|
| `localStorage.getItem` returns `null` | `JSON.parse('{}')` returns `{}`, all fields default |
| `JSON.parse` throws | `try/catch` → use `getDefaultState()` |
| Any field has wrong type | Per-field `typeof` / `Array.isArray` check → replace with default |
| `localStorage.setItem` throws (quota exceeded) | `try/catch` in `saveState()` → show warning notification, continue in-memory |
| Chart.js CDN fails to load | `typeof Chart === 'undefined'` check in `initChart()` → show static fallback text in canvas container |
| Form submit with invalid data | Inline error message shown beneath field; transaction not added |
| Spending limit set to 0 or negative | Inline error shown; stored limit unchanged |
| Custom category duplicate / empty | Inline error shown; category not added |

---

## Testing Strategy

### Unit Tests

Unit tests verify specific examples, edge cases, and formula correctness. They target pure functions that have no DOM or localStorage dependency. A simple test harness (custom `assert` functions or a lightweight library like [Jest](https://jestjs.io/) if added later as a dev dependency) is sufficient.

Priority test targets:

- `formatRupiah`: various amounts, rounding, zero, large numbers.
- `xpThreshold(n)`: formula spot-checks for n = 1–6.
- `checkLevelUp`: boundary conditions (XP exactly at threshold, one below, one above).
- `updateStreak`: same day, consecutive day, two-day gap, null `lastLoggedDate`.
- `generateCategoryColor`: uniqueness across first 10 custom categories.
- `loadState` malformed-data recovery: missing keys, wrong types, corrupt JSON.
- `addTransaction` validation: empty item, zero amount, negative amount.
- `addCategory` validation: empty string, duplicate (case-insensitive).

### Integration Tests

Manual smoke tests on Chrome, Firefox, Edge, and Safari:

- Full add → persist → reload → restore cycle.
- Delete transaction → balance and chart update.
- Level-up notification fires at correct XP threshold.
- Dark mode applied before flash on cold load.
- Responsive layout at 320 px, 768 px, 1280 px.

### Property-Based Tests

Property-based testing is applicable to this feature because the core logic (XP formula, streak calculation, currency formatting, state serialization, category color generation, badge idempotence) consists of pure functions with well-defined input/output behavior and large input spaces where random variation meaningfully exercises edge cases.

**Library**: [fast-check](https://fast-check.dev/) (JavaScript, browser-compatible, no build step required for running tests in a Node.js test harness against the extracted pure functions).

**Configuration**: Each property test must run a minimum of **100 iterations**. Tag each test with a comment referencing the design property:

```
// Feature: budget-quest, Property 4: XP threshold formula produces correct level intervals
```

Each property in the Correctness Properties section below maps to exactly one property-based test. Pure logic functions (`xpThreshold`, `checkLevelUp`, `updateStreak`, `formatRupiah`, `generateCategoryColor`, `addCategory`, `checkBadges`, `loadState`) should be extracted or importable from `script.js` to allow unit testing without a browser DOM.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: State serialization round-trip

*For any* valid application state object (with arbitrary transactions, categories, spending limit, theme, level, XP, streak, last-logged date, and badges), serializing it to JSON via `saveState` and immediately deserializing it via `loadState` should produce an object that is deep-equal to the original state.

**Validates: Requirements 11.1, 11.2, 5.4, 8.5, 9.5, 10.5**

---

### Property 2: Balance is the sum of all transaction amounts

*For any* list of transactions with arbitrary item names, positive amounts, and categories, the computed balance should equal the arithmetic sum of all transaction amounts, both before and after any add or delete operation.

**Validates: Requirements 3.1, 3.2, 2.3**

---

### Property 3: Invalid transactions are always rejected

*For any* transaction submission where the item name is composed entirely of whitespace characters, or where the amount is zero or negative, the transaction list should remain unchanged (same length, same content) and no XP should be awarded.

**Validates: Requirements 1.3**

---

### Property 4: XP threshold formula produces correct level intervals

*For any* level n ≥ 1, the difference `xpThreshold(n + 1) − xpThreshold(n)` should equal exactly `50 × n`, meaning each level requires 50 more XP than the previous level interval.

**Validates: Requirements 8.7**

---

### Property 5: Level is always consistent with cumulative XP

*For any* sequence of XP awards of arbitrary size and ordering, after each award and call to `checkLevelUp`, the player's level should be the unique integer n such that `xpThreshold(n) ≤ state.xp < xpThreshold(n + 1)`.

**Validates: Requirements 8.4, 8.7**

---

### Property 6: Streak logic is correct for all day-gap scenarios

*For any* combination of current streak value n, `lastLoggedDate`, and today's date, `updateStreak` should: (a) increment streak to n + 1 when the gap is exactly 1 calendar day; (b) reset streak to 1 when the gap is 2 or more calendar days; (c) leave streak unchanged at n when the gap is 0 days (same calendar day).

**Validates: Requirements 9.2, 9.3, 9.4**

---

### Property 7: Currency formatting correctness

*For any* non-negative number input, `formatRupiah` should produce a string that starts with `"Rp "`, uses a period as the thousands separator, contains no decimal point, and whose numeric portion (with periods removed) equals `Math.round(input)`.

**Validates: Requirements 14.1, 14.3, 14.4**

---

### Property 8: Custom category colors are mutually distinct

*For any* N custom categories where 1 ≤ N ≤ 20, `generateCategoryColor` should produce N color strings with all-distinct hue values so that no two custom categories share the same visual color.

**Validates: Requirements 4.3, 5.5**

---

### Property 9: Badge unlock is idempotent

*For any* application state in which one or more badges are already unlocked (their flag is `true`), calling `checkBadges` again should not change any badge flag and should not trigger a second unlock notification for already-unlocked badges.

**Validates: Requirements 10.2, 10.3, 10.4, 10.5**

---

### Property 10: Invalid categories are always rejected

*For any* existing category list and a submitted category name that is either empty, whitespace-only, or case-insensitively equal to any name already in the list (combining default and custom categories), `addCategory` should leave the category list unchanged.

**Validates: Requirements 5.3**

---

### Property 11: XP is awarded if and only if the transaction is valid and budget conditions are met

*For any* valid transaction (non-empty item, positive amount) added when `spendingLimit` is `null`, or when the resulting balance does not exceed `spendingLimit`, the player's XP should increase by exactly 10. Conversely, for any valid transaction where the resulting balance exceeds a set `spendingLimit`, XP should not be awarded.

**Validates: Requirements 8.3, 8.6**
