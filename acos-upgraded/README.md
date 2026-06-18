# ACOS Accounting v2.0 — Production Upgrade

A complete, production-ready desktop accounting and business finance management system built with Electron, React, TypeScript, and SQLite.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm 9+

### Install & Run

```bash
# Install dependencies
npm install

# Run in development (opens Electron window)
npm run electron:dev

# Or run just the React frontend
npm run dev
```

### Build for Production

```bash
npm run electron:build
```

---

## 📦 What's Included

### Real Database (SQLite via better-sqlite3)
- All data stored locally in `~/AppData/Roaming/acos-accounting/acos.db` (Windows) or `~/Library/Application Support/acos-accounting/acos.db` (macOS)
- No mock data — every record is real and persisted
- Automatic overdue status updates on every load

### Modules
| Module | Features |
|--------|----------|
| **Dashboard** | Real-time stats, P&L charts, aging buckets, recent transactions |
| **Accounts Receivable** | Customers + Invoices, payment recording, partial payments, balance tracking |
| **Accounts Payable** | Suppliers + Bills, payment recording, balance tracking |
| **PDC Management** | Post-dated checks receivable & payable, status workflow |
| **Expenses** | Full CRUD, categories, recurring, pie/bar charts |
| **Analytics** | 6-month trends, profit analysis, AI insights |
| **Reports** | P&L, Receivable Aging, Expense Report, Cash Flow |
| **Settings** | Company info, currency, language, dark mode, DB backup |

### Tech Stack
- **Electron** — Desktop app shell
- **React 18 + TypeScript** — UI framework
- **better-sqlite3** — Real SQLite database (no Prisma needed at runtime)
- **Zustand** — State management
- **Recharts** — Charts
- **Tailwind CSS** — Styling
- **react-hot-toast** — Notifications

---

## 🏗 Architecture

```
electron/
  main.js          ← All IPC handlers + SQLite operations
  preload.js       ← Exposes api.* to renderer

src/
  lib/api.ts       ← Electron ↔ React bridge (graceful web fallback)
  lib/utils.ts     ← Formatting helpers
  store/index.ts   ← Zustand global state
  pages/           ← One file per module
  components/      ← Shared Sidebar, TopBar
```

---

## 💡 Key Design Decisions

1. **No Prisma at runtime** — Uses `better-sqlite3` directly in `electron/main.js` for simpler packaging and faster queries
2. **IPC-based data access** — All DB calls go through `window.api.*` (preload bridge), keeping renderer sandboxed
3. **Web fallback** — `src/lib/api.ts` returns empty stubs if not in Electron, so the app can be previewed in a browser
4. **Real-time balance updates** — Every invoice/bill/payment automatically adjusts customer/supplier `currentBalance`
5. **Auto overdue detection** — Runs on every page load to mark past-due invoices/bills

---

## 🔧 Customization

- Add your company logo: update `SettingsPage` to upload to userData folder
- Add more expense categories: edit `EXPENSE_CATEGORIES` in `src/lib/utils.ts`
- Add PDF export: use `pdfkit` (already in package.json) in `electron/main.js`
