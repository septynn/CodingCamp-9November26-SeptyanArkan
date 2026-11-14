# Implementation Plan: Budget Quest

## Overview

Build a fully client-side, single-page gamified expense tracker as three static files (`index.html`, `css/style.css`, `js/script.js`) deployable on GitHub Pages. The implementation follows the architecture defined in the design document: a uni-directional state → localStorage → UI render loop with vanilla JavaScript, Chart.js via CDN, and a pixel/retro RPG aesthetic.

## Tasks

- [x] 1. Project scaffolding and file structure
  - [x] 1.1 Create the repository file structure
    - Create `index.html` at the repository root
    - Create `css/` directory with an empty `css/style.css`
    - Create `js/` directory with an empty `js/script.js`
    - Add a `<link>` to `css/style.css` and `<script src="js/script.js" defer>` in `index.html`
    - Add the Chart.js CDN `<script>` tag **before** `js/script.js` in `index.html`
    - Add Google Fonts `<link>` for `Press Start 2P` and `VT323` in `<head>`
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [x] 2. HTML shell — semantic structure
  - [x] 2.1 Build the full HTML skeleton in `index.html`
    - `<header>` with `.app-title` ("⚔️ Budget Quest") and `#theme-toggle` button
    - `#balance-card` with `.balance-label`, `.balance-amount`, `.spending-limit-display`
    - `#boss-banner` (hidden by default via `hidden` attribute)
    - `#hero-panel` with `.hero-level`, `.xp-bar-container > .xp-bar-fill`, `.xp-label`
    - `#streak-panel` with `.streak-count`
    - `.controls-grid` containing `#transaction-form` (fields: `#item-input`, `#amount-input`, `#category-select`, `.form-error`), `#limit-form` (`#limit-input`, `.limit-error`), and `#category-form` (`#category-input`, `.category-error`)
    - `#transaction-list` container
    - `#chart-container` with `<canvas id="spending-chart">`
    - `#badge-section` container
    - `#notification-container`
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 6.1, 7.1, 8.1, 9.1, 10.1_

- [x] 3. CSS foundation — design tokens and layout
  - [x] 3.1 Define CSS custom properties and base styles in `css/style.css`
    - Declare `:root` variables: `--bg-primary`, `--bg-card`, `--text-primary`, `--text-secondary`, `--accent`, `--border`, `--shadow`, `--danger-bg`, `--danger-text`
    - Declare `[data-theme="dark"]` overrides for all variables
    - Apply `font-family: 'Press Start 2P', monospace` to headings, level, badge names; `font-family: 'VT323', monospace` to body text (min 18 px)
    - Set base `font-size: 16px` on `body`
    - _Requirements: 7.2, 7.3, 12.3_
  - [x] 3.2 Implement the pixel/retro visual language
    - Apply `box-shadow: var(--shadow)` (4 px 4 px 0, no blur) to all card components
    - Apply `border: 2px solid var(--border)` with `border-radius: 2px` or none on cards
    - Style `#boss-banner` with danger background color and `animation: pulse` keyframe (`opacity 0.8 ↔ 1.0`)
    - Style `.xp-bar-fill` with pixel-chunked `repeating-linear-gradient` and solid fill color
    - Style `.notification` with slide-in from bottom-right and fade-out transition
    - Style locked badges as grey with low opacity; unlocked badges full color
    - _Requirements: 7.2, 7.3, 8.2, 10.1_
  - [x] 3.3 Implement mobile-first responsive grid
    - `.app-grid` base: `display: grid; grid-template-columns: 1fr; gap: 1rem; max-width: 1200px; margin: 0 auto;`
    - `@media (min-width: 768px)`: `grid-template-columns: 1fr 1fr`; Hero/Streak → col 1, Chart → col 2; Transaction Form → col 1, Limit/Category Forms → col 2
    - `.full-width` class: `grid-column: 1 / -1` for Balance Card, Boss Banner, Transaction List, Badge Section
    - All buttons and interactive elements: `min-width: 44px; min-height: 44px`
    - _Requirements: 12.1, 12.2, 12.3_

- [x] 4. State module — load, save, defaults, and malformed-data recovery
  - [x] 4.1 Implement `getDefaultState`, `loadState`, and `saveState` in `js/script.js`
    - `getDefaultState()` returns: `{ transactions: [], categories: ['Food','Transport','Fun'], customCategories: [], spendingLimit: null, theme: 'light', level: 1, xp: 0, streak: 0, lastLoggedDate: null, badges: { firstTransaction: false, sevenDayStreak: false, underBudget: false } }`
    - `loadState()`: reads key `budgetQuest_v1` from `localStorage`, wraps `JSON.parse` in `try/catch`, replaces any missing or wrongly-typed field with its default using `typeof` / `Array.isArray` checks
    - `saveState()`: wraps `localStorage.setItem` in `try/catch`; on `QuotaExceededError` calls `showNotification` with a warning and continues in-memory
    - _Requirements: 11.1, 11.2, 11.3_
  - [ ]* 4.2 Write property test for state serialization round-trip (Property 1)
    - **Property 1: State serialization round-trip**
    - Use fast-check to generate arbitrary valid state objects; assert `loadState(saveState(s))` deep-equals the original state
    - **Validates: Requirements 11.1, 11.2, 5.4, 8.5, 9.5, 10.5**

- [x] 5. Formatter module — Rupiah currency formatting
  - [x] 5.1 Implement `formatRupiah` and `formatRupiahFallback` in `js/script.js`
    - Primary: `'Rp ' + Math.round(amount).toLocaleString('id-ID')`
    - Fallback (old Safari): `'Rp ' + Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')`
    - `getTodayString()`: `new Date().toLocaleDateString('sv')` returning `YYYY-MM-DD` in local time zone
    - _Requirements: 14.1, 14.2, 14.3, 14.4_
  - [ ]* 5.2 Write property test for currency formatting (Property 7)
    - **Property 7: Currency formatting correctness**
    - Use fast-check with arbitrary non-negative numbers; assert output starts with `"Rp "`, uses period thousands separator, has no decimal point, and numeric portion equals `Math.round(input)`
    - **Validates: Requirements 14.1, 14.3, 14.4**

- [x] 6. Theme module — dark/light toggle with flash prevention
  - [x] 6.1 Implement the early-IIFE theme application and `toggleTheme` / `applyTheme` in `js/script.js`
    - IIFE at top of `script.js` (before `DOMContentLoaded`): reads `budgetQuest_v1` from `localStorage`, sets `data-theme` on `<html>` if saved theme is `"dark"`
    - `applyTheme(theme)`: sets `data-theme` on both `document.body` and `document.documentElement`; updates `#theme-toggle` button text (`'☀️ Light'` / `'🌙 Dark'`)
    - `toggleTheme()`: flips `state.theme`, calls `applyTheme`, calls `saveState`
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 7. Categories module — defaults and custom category management
  - [x] 7.1 Implement category color helpers and `addCategory` in `js/script.js`
    - Define `DEFAULT_CATEGORY_COLORS`: `{ Food: '#FF6B6B', Transport: '#4ECDC4', Fun: '#45B7D1' }`
    - `generateCategoryColor(customIndex)`: `hsl((30 + customIndex * 60) % 360, 70%, 60%)`
    - `buildColorArray(allCategories)`: maps categories to fixed colors or `generateCategoryColor` for custom ones
    - `addCategory(name)`: trims input; rejects empty string or case-insensitive duplicate of any existing default or custom category; appends to `state.customCategories`; calls `saveState`; re-renders category select and chart
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 4.3_
  - [ ]* 7.2 Write property test for custom category color uniqueness (Property 8)
    - **Property 8: Custom category colors are mutually distinct**
    - Use fast-check with N in [1, 20]; assert all N hue values produced by `generateCategoryColor` are distinct
    - **Validates: Requirements 4.3, 5.5**
  - [ ]* 7.3 Write property test for invalid category rejection (Property 10)
    - **Property 10: Invalid categories are always rejected**
    - Use fast-check with arbitrary existing category lists and invalid inputs (empty, whitespace-only, case-insensitive duplicates); assert category list is unchanged after `addCategory`
    - **Validates: Requirements 5.3**

- [x] 8. Gamification module — XP, levels, streaks, and badges
  - [x] 8.1 Implement XP and level functions in `js/script.js`
    - `xpThreshold(n)`: `50 * n * (n - 1) / 2`
    - `xpForCurrentLevel()`: `xpThreshold(state.level)`
    - `xpForNextLevel()`: `xpThreshold(state.level + 1)`
    - `awardXP(points)`: increments `state.xp` by `points`, calls `checkLevelUp`
    - `checkLevelUp()`: `while (state.xp >= xpThreshold(state.level + 1))` → increment level, call `showNotification` with level-up message
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_
  - [ ]* 8.2 Write property test for XP threshold formula (Property 4)
    - **Property 4: XP threshold formula produces correct level intervals**
    - Use fast-check with arbitrary n ≥ 1; assert `xpThreshold(n+1) - xpThreshold(n) === 50 * n`
    - **Validates: Requirements 8.7**
  - [ ]* 8.3 Write property test for level/XP consistency (Property 5)
    - **Property 5: Level is always consistent with cumulative XP**
    - Use fast-check with arbitrary sequences of XP awards; assert after each award that level is the unique n where `xpThreshold(n) ≤ state.xp < xpThreshold(n+1)`
    - **Validates: Requirements 8.4, 8.7**
  - [x] 8.4 Implement `updateStreak` and `daysBetween` in `js/script.js`
    - `daysBetween(dateStrA, dateStrB)`: `Math.round((new Date(dateStrB) - new Date(dateStrA)) / 86400000)`
    - `updateStreak()`: if `lastLoggedDate` is null → set streak to 1 and date to today; diff 0 → no change; diff 1 → increment streak; diff ≥ 2 → reset streak to 1; always update `lastLoggedDate`
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_
  - [ ]* 8.5 Write property test for streak logic (Property 6)
    - **Property 6: Streak logic is correct for all day-gap scenarios**
    - Use fast-check with arbitrary (streak, lastLoggedDate, today) triples; assert all three cases (gap 0, 1, ≥2) produce correct streak values
    - **Validates: Requirements 9.2, 9.3, 9.4**
  - [x] 8.6 Implement `checkBadges` and `BADGE_DEFINITIONS` in `js/script.js`
    - Define `BADGE_DEFINITIONS` array with `firstTransaction`, `sevenDayStreak`, `underBudget` entries, each with `key`, `name`, `icon`, and `check(state, balance)` function
    - `checkBadges()`: computes current balance; for each badge definition where `!state.badges[def.key] && def.check(state, balance)` → set flag to `true`, call `showNotification`
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_
  - [ ]* 8.7 Write property test for badge idempotence (Property 9)
    - **Property 9: Badge unlock is idempotent**
    - Use fast-check with states where badges are already unlocked; assert calling `checkBadges` a second time leaves all badge flags unchanged
    - **Validates: Requirements 10.2, 10.3, 10.4, 10.5**

- [x] 9. Transaction module — CRUD with validation and XP integration
  - [x] 9.1 Implement `generateId`, `addTransaction`, `deleteTransaction`, and `getBalance` in `js/script.js`
    - `generateId()`: `Date.now().toString(36) + Math.random().toString(36).slice(2)`
    - `getBalance()`: `state.transactions.reduce((s, t) => s + t.amount, 0)`
    - `addTransaction(item, amount, category)`: validates non-empty trimmed item and `amount > 0`; builds transaction object with `generateId()`; pushes to `state.transactions`; calls `updateStreak`, `saveState`; awards 10 XP if `spendingLimit === null` or `getBalance() <= spendingLimit` **after** push; calls `checkBadges`, `renderAll`
    - `deleteTransaction(id)`: filters `state.transactions`, calls `saveState`, `renderAll`
    - _Requirements: 1.2, 1.3, 1.4, 2.3, 2.4, 3.1, 3.2, 8.3, 8.6_
  - [ ]* 9.2 Write property test for balance invariant (Property 2)
    - **Property 2: Balance is the sum of all transaction amounts**
    - Use fast-check with arbitrary transaction arrays; assert `getBalance()` equals `transactions.reduce((s,t) => s + t.amount, 0)` before and after add/delete operations
    - **Validates: Requirements 3.1, 3.2, 2.3**
  - [ ]* 9.3 Write property test for invalid transaction rejection (Property 3)
    - **Property 3: Invalid transactions are always rejected**
    - Use fast-check with whitespace-only item names and zero/negative amounts; assert `state.transactions` length and content are unchanged, and XP does not increase
    - **Validates: Requirements 1.3**
  - [ ]* 9.4 Write property test for XP award conditions (Property 11)
    - **Property 11: XP is awarded if and only if the transaction is valid and budget conditions are met**
    - Use fast-check with arbitrary valid transactions and spending limits; assert XP increases by exactly 10 when limit is null or balance ≤ limit, and does not change otherwise
    - **Validates: Requirements 8.3, 8.6**

- [x] 10. Spending limit module — validation, Boss Battle banner, balance highlight
  - [x] 10.1 Implement spending limit set/validate logic and computed helpers in `js/script.js`
    - `setSpendingLimit(value)`: parses numeric input; rejects if `value <= 0` (show `.limit-error`); sets `state.spendingLimit`, calls `saveState`, `renderAll`
    - `isOverLimit()`: `state.spendingLimit !== null && getBalance() > state.spendingLimit`
    - Use `isOverLimit()` in `renderBossBanner()` to show/hide `#boss-banner`
    - Use `isOverLimit()` in `renderBalanceCard()` to apply danger highlight CSS class
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 3.3, 3.4_

- [x] 11. Chart.js integration — pie chart with live updates
  - [x] 11.1 Implement `initChart`, `updateChart`, and `getCategoryTotals` in `js/script.js`
    - `getCategoryTotals()`: builds `Map<category, sum>` from `state.transactions`
    - `initChart()`: checks `typeof Chart === 'undefined'`; if unavailable shows static fallback text in `#chart-container`; otherwise creates Chart.js pie chart instance on `#spending-chart` canvas with `responsive: true`, legend at bottom, tooltip callback using `formatRupiah`
    - `updateChart()`: if `totals.size === 0` show empty state (single grey slice `['No transactions']`); otherwise feed labels, data, and `buildColorArray(labels)` into `chartInstance.data`, call `chartInstance.update()`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 5.5_

- [x] 12. UI render functions — full component rendering
  - [x] 12.1 Implement all individual render functions in `js/script.js`
    - `renderBalanceCard()`: shows `formatRupiah(getBalance())`, spending limit display, danger class when over limit
    - `renderBossBanner()`: toggles `hidden` attribute based on `isOverLimit()`
    - `renderHeroPanel()`: shows level number, computes `progressXP / intervalXP` percentage for XP bar fill width, shows `state.xp - xpForCurrentLevel()` / `xpForNextLevel() - xpForCurrentLevel()` XP label
    - `renderStreakPanel()`: shows `🔥 N day streak`
    - `renderTransactionList()`: maps `state.transactions` to `.transaction-item` elements (item name, `formatRupiah(amount)`, category, delete button with `data-id`)
    - `renderCategorySelect()`: rebuilds `<option>` elements in `#category-select` from `state.categories` + `state.customCategories`
    - `renderBadges()`: renders each badge in `BADGE_DEFINITIONS` as unlocked (full color) or locked (grey + lock icon) based on `state.badges[def.key]`
    - `renderLimitDisplay()`: shows current spending limit formatted with `formatRupiah` or "Not set"
    - `renderAll()`: calls all render sub-functions above, then `updateChart()`
    - _Requirements: 1.5, 2.1, 2.2, 3.1, 3.3, 3.4, 4.2, 6.3, 6.4, 8.1, 8.2, 9.1, 10.1_

- [x] 13. Event listeners and form handlers
  - [x] 13.1 Wire all DOM events to logic functions in `js/script.js`
    - `#transaction-form` `submit`: calls `addTransaction`; on validation failure shows `.form-error`; on success clears fields and focuses `#item-input`
    - `#limit-form` `submit`: calls `setSpendingLimit`; on validation failure shows `.limit-error`
    - `#category-form` `submit`: calls `addCategory`; on validation failure shows `.category-error`
    - `#theme-toggle` `click`: calls `toggleTheme`
    - `#transaction-list` delegated `click` on `.delete-btn`: extracts `data-id`, calls `deleteTransaction(id)`
    - _Requirements: 1.2, 1.3, 1.4, 5.1, 5.2, 5.3, 6.1, 6.5, 7.1_

- [x] 14. Notification system — slide-in toasts with auto-dismiss
  - [x] 14.1 Implement `showNotification` in `js/script.js`
    - `showNotification(message, type)`: creates a `.notification` element with `data-type` attribute (`"info"`, `"success"`, `"warning"`); appends to `#notification-container`; uses `setTimeout` to remove after 3000 ms with a fade-out CSS transition
    - _Requirements: 8.4, 10.5_

- [x] 15. INIT bootstrap — DOMContentLoaded wiring
  - [x] 15.1 Implement the `INIT` section at the bottom of `js/script.js`
    - On `DOMContentLoaded`: call `loadState()` to populate `state`; call `applyTheme(state.theme)` to sync full theme; call `initChart()`; call `renderAll()`
    - _Requirements: 7.4, 11.2_

- [x] 16. Checkpoint — core app integration
  - Ensure the full add → persist → reload → restore cycle works end-to-end. Ensure all tests pass, ask the user if questions arise.

- [x] 17. Property-based test harness setup
  - [x] 17.1 Set up fast-check test harness with a Node.js test runner
    - Create `tests/` directory at the repository root
    - Add `package.json` with `fast-check` and `jest` as `devDependencies` (pinned versions: `fast-check@^3.22.0`, `jest@^29.7.0`)
    - Configure Jest in `package.json` (`"testEnvironment": "node"`, `"testMatch": ["**/tests/**/*.test.js"]`)
    - Create `tests/helpers.js` that imports and re-exports pure functions from `js/script.js` (functions must be exported via `if (typeof module !== 'undefined') module.exports = { ... }` guard at the bottom of `script.js`)
    - _Requirements: (supports all property tests)_

- [ ] 18. Property-based tests — all 11 correctness properties
  - [~] 18.1 Create `tests/state.test.js` — Property 1: State serialization round-trip
    - Import `loadState`, `saveState`, `getDefaultState` from helpers
    - Use `fc.record(...)` to generate arbitrary valid state objects; assert round-trip deep equality
    - Run minimum 100 iterations
    - **Property 1 — Validates: Requirements 11.1, 11.2, 5.4, 8.5, 9.5, 10.5**
  - [~] 18.2 Create `tests/transactions.test.js` — Properties 2, 3, 11
    - Property 2: Use `fc.array(fc.record(...))` for arbitrary transaction arrays; assert `getBalance()` equals arithmetic sum
    - Property 3: Use `fc.oneof(fc.string().filter(s => s.trim() === ''), fc.integer({max: 0}))` for invalid inputs; assert transaction list unchanged
    - Property 11: Use arbitrary valid transactions + spending limits; assert XP delta is exactly 10 or 0 depending on budget condition
    - **Properties 2, 3, 11 — Validates: Requirements 3.1, 3.2, 2.3, 1.3, 8.3, 8.6**
  - [~] 18.3 Create `tests/gamification.test.js` — Properties 4, 5, 6, 9
    - Property 4: Use `fc.integer({min: 1, max: 50})`; assert `xpThreshold(n+1) - xpThreshold(n) === 50 * n`
    - Property 5: Use `fc.array(fc.nat())` for XP award sequences; assert level invariant after each award
    - Property 6: Use `fc.tuple(fc.nat(), fc.string(), fc.string())` for streak scenarios; assert all three gap cases
    - Property 9: Use states with pre-unlocked badges; assert second `checkBadges` call produces no changes
    - **Properties 4, 5, 6, 9 — Validates: Requirements 8.4, 8.7, 9.2, 9.3, 9.4, 10.2–10.5**
  - [~] 18.4 Create `tests/formatter.test.js` — Property 7
    - Use `fc.double({min: 0, max: 1e9, noNaN: true})` for arbitrary non-negative numbers
    - Assert output starts with `"Rp "`, period thousands separators, no decimal point, numeric value equals `Math.round(input)`
    - **Property 7 — Validates: Requirements 14.1, 14.3, 14.4**
  - [~] 18.5 Create `tests/categories.test.js` — Properties 8, 10
    - Property 8: Use `fc.integer({min: 1, max: 20})`; assert all N hue values from `generateCategoryColor` are distinct
    - Property 10: Generate arbitrary category lists + invalid inputs; assert `addCategory` leaves list unchanged
    - **Properties 8, 10 — Validates: Requirements 4.3, 5.3, 5.5**

- [~] 19. Final checkpoint — all tests pass and responsive layout verified
  - Ensure all 11 property-based tests pass with no counterexamples. Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- The property-based test tasks in section 18 consolidate what sections 4–9 start incrementally — both sets reference the same 11 properties
- `script.js` must guard module exports with `if (typeof module !== 'undefined') module.exports = { ... }` so the same functions run in both browser and Node.js test environments without a build step
- Chart.js and Google Fonts are loaded via CDN — no npm install required for the app itself; `package.json` is only for the test harness
- Each level requires exactly 50 more XP than the previous interval: Level 2 → 50 XP, Level 3 → 100 XP gap, Level 4 → 150 XP gap, etc.
- The XP award check uses the balance **after** the transaction is pushed, not before

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "3.1"] },
    { "id": 2, "tasks": ["3.2", "3.3", "4.1"] },
    { "id": 3, "tasks": ["4.2", "5.1", "6.1", "14.1"] },
    { "id": 4, "tasks": ["5.2", "7.1", "8.1", "8.4"] },
    { "id": 5, "tasks": ["7.2", "7.3", "8.2", "8.3", "8.5", "8.6", "9.1", "10.1"] },
    { "id": 6, "tasks": ["8.7", "9.2", "9.3", "9.4", "11.1"] },
    { "id": 7, "tasks": ["12.1"] },
    { "id": 8, "tasks": ["13.1"] },
    { "id": 9, "tasks": ["15.1"] },
    { "id": 10, "tasks": ["17.1"] },
    { "id": 11, "tasks": ["18.1", "18.2", "18.3", "18.4", "18.5"] }
  ]
}
```
