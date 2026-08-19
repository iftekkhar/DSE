# DSE Data Scrapers & Ingestion Inventory (PAUSED)

> **Status:** All scrapers and automated cron jobs are currently **PAUSED / DISABLED**.  
> The system operates in **STRICT DATABASE-ONLY MODE**, pulling 100% of data (440 equities, 641,343 price records) directly from the SQLite Database (`data/dse.db`).

---

## 📋 Comprehensive Scraper Catalog (To Review One by One)

### 🔹 1. DSE Official Daily Closing Prices Scraper
- **Function Name:** `fetchDSEClosingPrices()`
- **Target URL:** `https://dsebd.org/dse_close_price.php`
- **Original Schedule:** Sunday to Thursday at 3:30 PM BST (Market close)
- **Data Scraped:**
  - `TRADING CODE` (Symbol)
  - `CLOSEP*` (Official Settlement Closing Price)
  - `YCP*` (Yesterday's Closing Price)
  - Calculated `Change` and `Change %`
- **Target Table:** `price_history` (SQLite)
- **Potential Issues/Considerations:** Table markup structure on DSE website; weekend/holiday empty responses; anti-scraping Cloudflare/TLS blocks.

---

### 🔹 2. DSE Live Intraday Ticker & Market Depth Scraper
- **Function Name:** `fetchDSELiveTicker()`
- **Target URLs:**
  - `https://dsebd.org/dseX_share.php`
  - `https://dsebd.org/mkt_depth_3.php`
- **Original Schedule:** Every hour from 10:00 AM to 3:00 PM BST (Trading hours)
- **Data Scraped:**
  - Real-time Last Traded Price (LTP)
  - High, Low, Open Prices
  - Trading Volume & Value (MN BDT)
  - Number of Trades
- **Target Table:** In-memory cache + `market_breadth`
- **Potential Issues/Considerations:** Rapid changes during market hours; server latency; rate limiting.

---

### 🔹 3. DSE In-Depth Fundamental & Financial Disclosure Crawler
- **Function Name:** `crawlCompanyFundamentals(symbol)` / `crawlAllFundamentals()`
- **Target URL:** `https://dsebd.org/displayCompany.php?name=[SYMBOL]`
- **Original Schedule:** Weekly on Saturdays at 12:00 PM BST
- **Data Scraped:**
  - Basic & Diluted EPS (Continuing Operations)
  - Net Asset Value per Share (NAVPS)
  - Authorized & Paid-Up Capital (MN BDT)
  - Trailing P/E, Basic P/E, Diluted P/E
  - Cash Dividend Yield (%)
  - Listing Category (A / B / G / N / Z) & Sector Classification
  - Quarterly Audited Financial Disclosures (Q1, Q2, Q3, Annual)
- **Target Table:** `company_fundamentals` (SQLite)
- **Potential Issues/Considerations:** HTML structure varies between Banks, Insurance, Mutual Funds, and Manufacturing scrips. Requires rate limiting (200ms delay between requests) to prevent IP throttling across 440 scrips.

---

### 🔹 4. DSE Sectoral Index & Market Breadth Scraper
- **Function Name:** `fetchMarketPulse()` / `scrapeAll()`
- **Target URL:** `https://dsebd.org/` (Homepage summary tables)
- **Original Schedule:** Real-time on demand
- **Data Scraped:**
  - Total Issues Advanced, Declined, Unchanged
  - Total Market Turnover (Crores BDT)
  - Benchmark Index (DSEX, DS30, DSES)
- **Target Table:** `market_breadth` (SQLite)
- **Potential Issues/Considerations:** DSE homepage redesigns; table index changes.

---

## 🎯 Review Workflow Plan
When we are ready to re-evaluate each scraper:
1. **Review Endpoint & Structure**: Verify the exact URL and HTML structure.
2. **Review Data Schema & Validation**: Ensure data sanitization (handling nulls, zero division, negative EPS).
3. **Review Ingestion Frequency**: Determine if cron should be daily, weekly, or strictly on-demand manual sync.
4. **Approve or Reject**: Only enable after explicit user approval.
