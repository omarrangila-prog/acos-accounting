# ACOS Accounting — Deploy & Verify (Railway)

## Deploy
1. Push branch `acos-web-postgres` to GitHub.
2. Railway → New Project → Deploy from GitHub → select repo + branch.
3. Service **Settings → Root Directory** = `acos-web`.
4. Add a **PostgreSQL** plugin to the project.
5. Service **Variables** → add `DATABASE_URL=${{Postgres.DATABASE_URL}}`.
6. Build command (default from package.json): `prisma generate && prisma db push && next build`
   Start command: `next start` (uses `$PORT`).
7. Deploy. `prisma db push` creates all tables on first deploy.

Notes:
- Build no longer uses `--accept-data-loss`; a destructive schema change will
  block the deploy instead of silently dropping data. Existing rows survive
  redeploys and restarts because they live in the Postgres plugin volume.

## Post-deploy verification checklist
Run these in the live app; each must persist across a hard refresh:
1. Customers → Add Customer → refresh → customer still listed.
2. Open a customer → statement shows **Opening Balance** as first row.
3. Add a debit and a credit transaction → running **Balance** column updates row-by-row; Net Balance + status correct.
4. Expenses → Add Expense → appears immediately in the table (no manual refresh).
5. Leave Expenses open 5 min → table silently auto-refreshes once (no flicker loop).
6. PDC → add a Receivable and a Payable → each shows under the correct tab.
7. Invoices → create / edit / delete → list updates; delete asks for confirm.
8. All Records → shows invoices + expenses + PDC together.
9. Dashboard totals reflect the data entered above.
10. Analytics charts populate from the same data.
11. Reports → pick a type + date range → Run → result table; Excel + PDF/Print work.
12. Excel button on each page downloads an .xlsx with ALL records.
13. PDF/Print opens the branded statement/report (allow popups).
14. Resize to tablet/mobile widths → sidebar collapses to hamburger; tables scroll.
