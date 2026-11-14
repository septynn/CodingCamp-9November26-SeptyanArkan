# Requirements Document

## Introduction

Budget Quest is a gamified, client-side web application for tracking personal expenses and visualizing spending. The app adopts a light RPG theme: users are "Budget Heroes" who gain XP by staying under a spending limit, build daily streaks by logging transactions, and unlock badges for key milestones. All data is stored in browser Local Storage; the app is a single-page, static site deployable on GitHub Pages.

The tech stack is constrained to HTML, CSS, and vanilla JavaScript with Chart.js (CDN) for the pie chart. No backend, no frameworks, no build tools.

## Glossary

- **App**: The Budget Quest single-page web application running in the browser.
- **Transaction**: A single expense entry consisting of an item name, a monetary amount, and a category.
- **Category**: A label grouping transactions (default: Food, Transport, Fun; user may add custom categories).
- **Balance**: The running total of all transaction amounts stored in the current session.
- **Spending_Limit**: An optional monetary threshold set by the user; exceeding it triggers a warning state.
- **XP**: Experience points awarded to the player for budget-friendly behavior.
- **Level**: The player's Budget Hero rank, derived from accumulated XP.
- **Streak**: A counter tracking the number of consecutive calendar days on which the user logged at least one transaction.
- **Badge**: A visual achievement token unlocked when a milestone condition is first met.
- **LocalStorage**: The browser's `localStorage` API used as the sole persistence layer.
- **Chart**: The Chart.js pie chart displaying spending breakdown by category.
- **XP_Bar**: A visual progress bar representing the player's XP toward the next level.
- **Dark_Mode**: An alternative color scheme activated by the user and persisted in LocalStorage.
- **XP_Threshold(n)**: The total cumulative XP required to reach Level n, defined as 50 × n × (n − 1) / 2 (Level 1 = 0 XP, Level 2 = 50 XP, Level 3 = 150 XP, Level 4 = 300 XP, …; each level requires 50 more XP than the previous one).

---

## Requirements

### Requirement 1: Transaction Input Form

**User Story:** As a player, I want to fill out a form to log an expense, so that I can track where my money goes.

#### Acceptance Criteria

1. THE App SHALL render an input form containing an item name text field, a numeric amount field, and a category selector.
2. WHEN the user submits the form with all fields filled and the amount greater than zero, THE App SHALL add the transaction to the transaction list and persist it to LocalStorage.
3. IF the user submits the form with any field empty or with an amount of zero or less, THEN THE App SHALL display an inline validation error message and SHALL NOT add the transaction.
4. WHEN a transaction is successfully added, THE App SHALL clear all form fields and return focus to the item name field.
5. THE App SHALL populate the category selector with at least the default categories: Food, Transport, and Fun, plus any user-defined custom categories stored in LocalStorage.

---

### Requirement 2: Transaction List

**User Story:** As a player, I want to see all my logged transactions in a scrollable list, so that I can review my spending history.

#### Acceptance Criteria

1. THE App SHALL render a scrollable transaction list that displays each transaction's item name, amount, and category.
2. WHEN the transaction list contains more items than the visible area, THE App SHALL enable vertical scrolling within the list container without affecting the rest of the page layout.
3. WHEN the user clicks the delete button on a transaction, THE App SHALL remove that transaction from the list, remove it from LocalStorage, and immediately update the balance and Chart.
4. WHEN the App loads, THE App SHALL restore all transactions previously saved in LocalStorage and render them in the transaction list.

---

### Requirement 3: Total Balance Display

**User Story:** As a player, I want to see my total spending at a glance, so that I always know how much I have spent.

#### Acceptance Criteria

1. THE App SHALL display a balance card at the top of the page showing the sum of all transaction amounts.
2. WHEN a transaction is added or deleted, THE App SHALL recalculate and re-render the balance within the same user interaction (no page reload required).
3. WHILE the total balance exceeds the Spending_Limit set by the user, THE App SHALL apply a danger highlight style to the balance card.
4. WHEN the total balance is at or below the Spending_Limit, THE App SHALL display the balance card in its normal style.

---

### Requirement 4: Spending Pie Chart

**User Story:** As a player, I want a visual breakdown of my spending by category, so that I can see where most of my money goes.

#### Acceptance Criteria

1. THE App SHALL render a pie chart using Chart.js that displays one slice per category with recorded transactions.
2. WHEN a transaction is added or deleted, THE App SHALL update the Chart to reflect the new category totals without requiring a page reload.
3. THE App SHALL assign a visually distinct color to each category slice; default categories SHALL use fixed brand colors, and each custom category SHALL receive an automatically generated distinct color.
4. WHEN all transactions are deleted and no data remains, THE App SHALL display the Chart in an empty or placeholder state.

---

### Requirement 5: Custom Categories

**User Story:** As a player, I want to create my own spending categories, so that I can track expense types beyond the defaults.

#### Acceptance Criteria

1. THE App SHALL provide a UI control that allows the user to enter and submit a new category name.
2. WHEN the user submits a non-empty, non-duplicate category name, THE App SHALL add it to the category selector and persist the custom category list to LocalStorage.
3. IF the user submits an empty string or a name that already exists (case-insensitive), THEN THE App SHALL display an error message and SHALL NOT add the duplicate.
4. WHEN the App loads, THE App SHALL restore all custom categories from LocalStorage and include them in the category selector.
5. WHEN a custom category is in use by one or more transactions, THE App SHALL assign it a distinct auto-generated color in the Chart.

---

### Requirement 6: Spending Limit and Boss Battle Warning

**User Story:** As a player, I want to set a spending limit and be warned when I exceed it, so that I stay on budget like a hero facing a boss.

#### Acceptance Criteria

1. THE App SHALL provide an input field that allows the user to set a numeric Spending_Limit.
2. WHEN the user saves a valid Spending_Limit (greater than zero), THE App SHALL persist it to LocalStorage and apply limit-checking logic immediately.
3. WHILE the total balance exceeds the Spending_Limit, THE App SHALL display a "Boss Battle" warning banner with a distinct danger style.
4. WHEN the total balance returns to or below the Spending_Limit, THE App SHALL remove the "Boss Battle" warning banner.
5. IF the user sets a Spending_Limit of zero or a negative value, THEN THE App SHALL display a validation error and SHALL NOT update the stored limit.

---

### Requirement 7: Dark / Light Mode Toggle

**User Story:** As a player, I want to switch between dark and light visual themes, so that I can use the app comfortably in any lighting condition.

#### Acceptance Criteria

1. THE App SHALL provide a toggle control that switches the visual theme between light mode and dark mode.
2. WHEN the user activates dark mode, THE App SHALL apply a dark color scheme across all UI components and persist the preference (`"dark"`) to LocalStorage.
3. WHEN the user activates light mode, THE App SHALL apply the default light color scheme and persist the preference (`"light"`) to LocalStorage.
4. WHEN the App loads, THE App SHALL read the saved theme preference from LocalStorage and apply it before rendering any visible content to prevent a flash of unstyled content.

---

### Requirement 8: Budget Hero Level and XP System

**User Story:** As a player, I want to earn XP and level up my Budget Hero, so that responsible budgeting feels rewarding.

#### Acceptance Criteria

1. THE App SHALL display the player's current Level and XP toward the next level in a hero stats panel.
2. THE App SHALL render a visual XP_Bar showing progress from the current Level's XP floor to the next Level's XP threshold.
3. WHEN the user adds a transaction and the total balance remains at or below the Spending_Limit, THE App SHALL award 10 XP to the player.
4. WHEN accumulated XP reaches the threshold for the next Level, THE App SHALL increment the Level, reset XP progress accordingly, and display a level-up notification to the user.
5. THE App SHALL persist the player's Level and XP to LocalStorage so progress is retained across sessions.
6. IF no Spending_Limit is set, THEN THE App SHALL award XP for every transaction added regardless of balance.
7. THE App SHALL use the XP threshold formula XP_Threshold(n) = 50 × n × (n − 1) / 2 to determine level boundaries, where Level 1 starts at 0 cumulative XP, Level 2 requires 50 XP, Level 3 requires 150 XP, Level 4 requires 300 XP, and each subsequent level requires 50 more XP than the previous level interval.

---

### Requirement 9: Daily Streak Counter

**User Story:** As a player, I want a streak counter that tracks consecutive days of logging transactions, so that I stay motivated to track daily.

#### Acceptance Criteria

1. THE App SHALL display a streak counter indicating the number of consecutive calendar days on which the user logged at least one transaction.
2. WHEN the user logs a transaction on the current calendar day for the first time that day, THE App SHALL increment the streak counter by one and persist the new streak value and the current date to LocalStorage.
3. WHEN the user logs a transaction and the last-logged date is two or more calendar days before the current date, THE App SHALL reset the streak counter to 1.
4. WHEN the user logs a transaction on a day already counted in the streak, THE App SHALL keep the streak counter unchanged.
5. THE App SHALL persist the streak counter and the last-logged date to LocalStorage so the streak survives page reloads.

---

### Requirement 10: Badges and Achievements

**User Story:** As a player, I want to unlock badges for reaching milestones, so that I feel a sense of accomplishment as I use the app.

#### Acceptance Criteria

1. THE App SHALL display a badge section showing all unlocked badges with their icon and name.
2. WHEN the user adds their first transaction, THE App SHALL unlock the "First Transaction" badge if it has not already been unlocked.
3. WHEN the user's streak counter reaches 7 or more consecutive days, THE App SHALL unlock the "7-Day Streak" badge if it has not already been unlocked.
4. WHEN the user adds a transaction, a Spending_Limit greater than zero is set, and the total balance is at or below the Spending_Limit, THE App SHALL unlock the "Under Budget" badge if it has not already been unlocked. IF no Spending_Limit is set, THE App SHALL NOT unlock the "Under Budget" badge.
5. WHEN a badge is unlocked for the first time, THE App SHALL display a brief on-screen notification to the player.
6. THE App SHALL persist the set of unlocked badges to LocalStorage so earned badges are not lost on page reload.

---

### Requirement 11: Data Persistence and Session Restore

**User Story:** As a player, I want all my data to be saved automatically, so that I never lose my progress when I close or refresh the browser.

#### Acceptance Criteria

1. THE App SHALL save all application state — transactions, custom categories, Spending_Limit, theme preference, Level, XP, streak, last-logged date, and badges — to LocalStorage after every mutating operation.
2. WHEN the App loads, THE App SHALL read all state from LocalStorage and fully restore the UI to match the saved state before the user can interact with it.
3. IF LocalStorage data is absent or malformed for any key, THEN THE App SHALL initialize that key to its default value and continue loading without errors.

---

### Requirement 12: Responsive and Accessible Layout

**User Story:** As a player, I want the app to work well on both desktop and mobile devices, so that I can track expenses on any screen size.

#### Acceptance Criteria

1. THE App SHALL use a responsive layout that adapts to viewport widths from 320 px to 2560 px without horizontal scrolling.
2. WHEN the viewport width is below 768 px, THE App SHALL stack the form, transaction list, and chart into a single-column layout.
3. THE App SHALL use font sizes, tap targets, and spacing that remain legible and usable on mobile screens (minimum tap target size: 44 × 44 px).
4. THE App SHALL load and render fully on Chrome, Firefox, Edge, and Safari in their latest stable versions.
5. THE App SHALL load all assets — including Chart.js via CDN — and reach an interactive state within 3 seconds on a standard broadband connection.

---

### Requirement 13: Project File Structure

**User Story:** As a developer, I want the project to follow a defined file structure, so that it can be deployed on GitHub Pages without any build step.

#### Acceptance Criteria

1. THE App SHALL be delivered as static files only, with index.html at the repository root.
2. THE App SHALL contain exactly one CSS file located at css/style.css.
3. THE App SHALL contain exactly one JavaScript file located at js/script.js.
4. THE App SHALL load Chart.js via CDN (no local copy) so no build or bundling step is required.
5. THE App SHALL be deployable on GitHub Pages by serving the repository root directly.

---

### Requirement 14: Currency Formatting

**User Story:** As a player in Indonesia, I want all monetary values displayed in Indonesian Rupiah format, so that amounts are immediately recognizable.

#### Acceptance Criteria

1. THE App SHALL format all displayed monetary values as Indonesian Rupiah using the pattern "Rp " followed by the integer amount with a period as the thousands separator (e.g. Rp 25.000, Rp 1.250.000).
2. THE App SHALL apply this formatting to the balance display, each transaction amount in the list, and the Spending_Limit display.
3. WHEN the user enters an amount in the input form, THE App SHALL accept a plain integer or decimal number and format it on display only; the stored value SHALL remain a plain number.
4. IF the amount entered has decimal places, THE App SHALL round to the nearest whole Rupiah before storing and displaying.
