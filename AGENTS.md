# DSE Analytics & Buffett Value Terminal — Workspace Context & Directives

## 1. Project Overview & Commercial Grade Standard
This application is a **commercial-grade, production-ready institutional analytics dashboard for the Dhaka Stock Exchange (DSE)**.
- **Rule 1 (Authenticity & Accuracy):** Zero simulated/fake/made-up numbers. All prices, EPS, NAVPS, and fundamentals MUST originate strictly from the DSE exchange filings and SQLite master database.
- **Rule 2 (Audited Data Exclusivity):** Only officially published audited financial figures (Annual/Quarterly audited disclosures) are displayed. If a metric is unpublished or unavailable, show `"Not Available live"` / `null`.
- **Rule 3 (Smart Delta / 0-Write Scrapers):** Scrapers check existing DB values before writing. If identical, 0 database writes occur.
- **Rule 4 (P/E & ROE Math):**
  - $\text{Daily P/E} = \text{Daily Closing LTP} \div \text{Audited Basic EPS}$ (fluctuates daily with price).
  - $\text{Audited P/E} = \text{YCP Base} \div \text{Audited Basic EPS}$.
  - $\text{ROE} = (\text{Audited Basic EPS} \div \text{Audited NAVPS}) \times 100$.
  - If EPS is $\le 0$ or missing, P/E is strictly reported as `N/A`.

---

## 2. Architecture & Data Flow

```mermaid
graph TD
  DSE[Official DSE Website dsebd.org] -->|Job 1: 15:30 BST| DB[(SQLite: data/dse.db)]
  DSE -->|Weekly Saturday 10:00 BST| EPS[Audited EPS Scraper]
  EPS -->|Smart Delta| DB
  DSE -->|Job 4: Market Hours| MB[market_breadth table]
  MB --> DB
  Excel[DSE 20-Year Master Dataset] -->|Auto-Seed on boot| DB
  Snapshot[data/latest.json] -->|Auto-Seed on boot| DB
  DB --> API[Express Backend port 5001]
  API --> UI[React 19 + Vite Frontend port 5173]
```

### Key Modules:
- **`server/db.js`**: SQLite DB interface (`data/dse.db`). Handles tables `price_history`, `company_fundamentals`, `market_breadth`. Automatically seeds from `data/DSE_20_Year_Master_Dataset_2005_2026.xlsx` and `data/latest.json` on startup.
- **`server/index.js`**: Express backend, REST API (`/api/stocks`, `/api/history/:symbol`, `/api/market-pulse`, `/api/export/excel`, `/api/jobs/status`), and `node-cron` automation in Dhaka timezone (`Asia/Dhaka`).
- **`server/scrapers/audited_eps_scraper.js`**: Standalone weekly crawler parsing verified Audited Financial Statements from `displayCompany.php`.
- **`src/services/dseData.js`**: Buffett Value metrics (Graham Number, Moat, Margin of Safety, Dynamic Buffett Score).
- **`src/services/api.js`**: Dynamic routing between `localhost:5001` and Render cloud API with bundled zero-fail fallback snapshot.

---

## 3. Automation Cron Jobs (Dhaka Timezone: UTC+6)
1. **Job 1 (Closing Prices Archive):** Sun-Thu @ 15:30 BST (`30 15 * * 0-4`)
2. **Job 3 (Daily Fundamentals Delta):** Sun-Thu @ 16:00 BST (`0 16 * * 0-4`)
3. **Weekly Audited EPS Master Scraper:** Every Saturday @ 10:00 BST (`0 10 * * 6`)
4. **Job 4 (Market Breadth):** Every 30m during market hours (10:00–15:00 BST, Sun-Thu)

---

## 4. Commands Quick Reference
- `npm run dev`: Start frontend Vite server (`http://localhost:5173`)
- `npm start` / `npm run scraper-server`: Start Node backend server (`http://localhost:5001`)
- `npm run scrape:audited`: Run standalone Audited EPS crawler on all 440 companies
- `npm run build:all "commit message"`: Single-command validation, frontend compilation, git commit, and cloud deployment to Render & GitHub
