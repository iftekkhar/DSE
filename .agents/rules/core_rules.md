# Mandatory Core Engineering Rules for DSE Project

> [!IMPORTANT]
> These rules are binding for all code generation, refactoring, algorithms, and modifications across the entire repository. Every agent and subagent MUST strictly adhere to these guidelines.

---

## 🔒 RULE 1: STRICT UI PRESERVATION (DO NOT CHANGE THE UI)
- **Do NOT change the UI:** Do NOT alter, redesign, reorganize, delete, or rewrite any user interface components, layout grids, modal sections, badges, typography, color schemes, or visual styling **UNLESS the USER explicitly asks to change the UI**.
- **Preserve Established Components:** All existing layouts and sections (`StockModal`, `Header`, `FilterBar`, `MarketPulse`, `StockTable`, `StockGrid`, `CompareDock`, `CompareModal`, and `ScoringModal`) must remain visually identical.
- **Backend & Algorithm Separation:** When modifying business logic, valuation algorithms, database queries, scrapers, or API endpoints, keep the front-end visual structures identical.

---

## 🚫 RULE 2: STRICT DATA INTEGRITY & ZERO HARDCODING (100% DB-DRIVEN)
- **Zero Hardcoded Values:** Do NOT hardcode any numbers, mock dates, fake years, placeholder figures, static fallback dictionaries, or synthetic generators (`Math.random()`, fake noise, dummy baselines).
- **100% Database Sourced:** Every single price, P/E, EPS, NAVPS, volume, capital, sector, and date MUST be fetched dynamically from the SQLite database (`data/dse.db`) or derived via authentic mathematical formulas.
- **Handle Missing Data Gracefully:** If a metric is unpublished or unavailable in the database, return `null` and display `'—'` or `'N/A'`. NEVER invent a fallback number.
- **Ask Clarifying Questions:** If an algorithm or computation requires unknown business parameters or assumptions, **ASK THE USER DIRECTLY** before writing code.

---

## 📑 RULE 3: AUDITED FINANCIAL DISCLOSURES (STRICTLY FROM DB)
- **Official Audited Disclosures:** All Audited Financial Disclosures (Audited P/E, Basic EPS, NAV Per Share, Paid-Up Capital, Authorized Capital, Dividend Yield, Audited Period, Quarterly Disclosure) MUST come strictly from verified `company_fundamentals` records in SQLite `data/dse.db`.
- **Zero Fallback Substitution:** If an audited figure is null/missing in the database record, display `'—'` and the audited settlement period as `'Audited'`. Never substitute synthetic values.

---

## 📊 RULE 4: 7-POINT FUNDAMENTAL MATRIX DATA ORIGIN RULES
- **From SQLite Database Records (`company_fundamentals` & `price_history`):**
  1. *Return on Equity (ROE):* Calculated strictly from DB `eps_basic` $\div$ `nav_per_share` $\times 100$.
  2. *Debt / Equity:* Sourced directly from DB `debt_to_equity`.
  3. *Current Ratio:* Sourced directly from DB `current_ratio`.
  4. *Basic EPS:* Sourced directly from DB `eps_basic`.
- **From Daily Exchange Closing Feed (`price_history`):**
  5. *Daily P/E:* Calculated dynamically as $\text{Daily LTP} \div \text{DB Audited EPS}$.
  6. *Closing Momentum:* Calculated from consecutive closing prices ($(\text{LTP} - \text{YCP}) \div \text{YCP} \times 100$).
  7. *Trading Volume:* Session volume recorded at market close.
