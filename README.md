# ACOS Accounting Software (Web)

WAHHAJ SEAFOOD — Next.js + PostgreSQL accounting app. All data is stored permanently in PostgreSQL; nothing resets on refresh/redeploy.

## Stack
- Next.js 14 (App Router) — frontend + API routes
- Prisma + PostgreSQL — persistent storage
- Tailwind CSS — exact ACOS design tokens
- exceljs — Excel export on all main tables
- recharts — dashboard / analytics charts

## Local development
```bash
npm install
cp .env.example .env        # set DATABASE_URL to a Postgres instance
npx prisma db push          # create tables
npm run dev                 # http://localhost:3000
```

## Pages
Dashboard · Invoices · Customers/Ledger · PDC Cheques · Expenses · All Records · Analytics · Reports

## Excel export
Every main table (Customers, Expenses, PDC, Invoices, All Records, Reports) has an **Excel** button that
exports **all** database records (not just the visible/filtered rows), with a loading state while generating.

## Deploy to Railway
1. Create a new Railway project, add a **PostgreSQL** plugin.
2. Add this app as a service (Railway auto-injects `DATABASE_URL`).
3. Build runs `prisma generate && prisma db push && next build`, so tables are created on first deploy.
4. Start command: `npm run start`.
