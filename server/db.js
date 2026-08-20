import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import ExcelJS from 'exceljs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'dse.db');

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) console.error('[SQLITE] Database connection error:', err.message);
  else console.log('[SQLITE] Connected to SQLite database:', DB_PATH);
});

// Async DB execution helpers
export function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

export function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

export function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// Initialize Tables
export async function initDB() {
  await dbRun(`
    CREATE TABLE IF NOT EXISTS price_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL,
      date TEXT NOT NULL,
      open REAL,
      high REAL,
      low REAL,
      close REAL NOT NULL,
      ycp REAL,
      change REAL,
      change_percent REAL,
      volume INTEGER,
      value_mn REAL,
      pe REAL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(symbol, date)
    );
  `);

  await dbRun(`CREATE INDEX IF NOT EXISTS idx_history_symbol_date ON price_history(symbol, date DESC);`);
  await dbRun(`CREATE INDEX IF NOT EXISTS idx_history_date ON price_history(date DESC);`);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS company_fundamentals (
      symbol TEXT PRIMARY KEY,
      name TEXT,
      sector TEXT,
      category TEXT,
      eps_basic REAL,
      eps_diluted REAL,
      eps_quarterly REAL,
      nav_per_share REAL,
      paid_up_capital_mn REAL,
      authorized_capital_mn REAL,
      pe_basic REAL,
      pe_diluted REAL,
      pe_trailing REAL,
      dividend_yield REAL,
      audited_period TEXT,
      quarterly_disclosure TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS market_breadth (
      date TEXT PRIMARY KEY,
      advancing INTEGER,
      declining INTEGER,
      unchanged INTEGER,
      total_trades INTEGER,
      total_volume INTEGER,
      total_value_mn REAL,
      dsex_index REAL,
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  await dbRun(`DELETE FROM price_history WHERE date LIKE '%T%' OR date LIKE '%:%'`).catch(() => {});
}

// 1. Save Daily Market Closing batch to SQLite
export async function saveDailyClosingToDB(records, dateStr) {
  if (!records || !Array.isArray(records) || records.length === 0) return 0;
  const targetDate = dateStr || new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(new Date());

  let count = 0;
  await dbRun('BEGIN TRANSACTION');
  try {
    for (const r of records) {
      const symbol = (r.symbol || '').toUpperCase().trim();
      const close = Number(r.ltp ?? r.close ?? r.closePrice ?? 0);
      if (!symbol || close <= 0) continue;

      const ycp = Number(r.ycp ?? 0);
      const change = Number(r.change ?? 0);
      const change_percent = Number(r.changePercent ?? 0);
      const volume = Number(r.volume ?? 0);
      const pe = r.pe !== null && r.pe !== undefined ? Number(r.pe) : null;

      await dbRun(`
        INSERT INTO price_history (symbol, date, close, ycp, change, change_percent, volume, pe)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(symbol, date) DO UPDATE SET
          close = excluded.close,
          ycp = excluded.ycp,
          change = excluded.change,
          change_percent = excluded.change_percent,
          volume = excluded.volume,
          pe = excluded.pe
      `, [symbol, targetDate, close, ycp, change, change_percent, volume, pe]);
      count++;
    }
    await dbRun('COMMIT');
  } catch (err) {
    await dbRun('ROLLBACK');
    throw err;
  }
  return count;
}

// 2. Fetch Daily Closing Prices Timeline for a Stock directly from SQLite (1 record per calendar day)
export async function getHistoricalTimeline(symbol, limit = 7500) {
  const cleanSym = (symbol || '').toUpperCase().trim();
  const rows = await dbAll(`
    SELECT * FROM (
      SELECT SUBSTR(date, 1, 10) as fetchedAt, close as ltp, ycp, change, change_percent as changePercent, volume, pe
      FROM price_history
      WHERE symbol = ?
      GROUP BY SUBSTR(date, 1, 10)
      ORDER BY date DESC
      LIMIT ?
    ) ORDER BY fetchedAt ASC
  `, [cleanSym, limit]);
  return rows || [];
}

// 3. Fetch latest recorded daily closing record for fallback resolution
export async function getLatestRecordedClosing(symbol) {
  const cleanSym = (symbol || '').toUpperCase().trim();
  return await dbGet(`
    SELECT date, close as ltp, ycp, change, change_percent as changePercent, volume, pe
    FROM price_history
    WHERE symbol = ?
    ORDER BY date DESC
    LIMIT 1
  `, [cleanSym]);
}

// 4. Save Company Fundamentals to SQLite
export async function saveFundamentals(data) {
  if (!data || !data.symbol) return;
  const symbol = data.symbol.toUpperCase().trim();

  await dbRun(`
    INSERT INTO company_fundamentals (
      symbol, name, sector, category, eps_basic, eps_diluted, eps_quarterly,
      nav_per_share, paid_up_capital_mn, authorized_capital_mn,
      pe_basic, pe_diluted, pe_trailing, dividend_yield, audited_period,
      quarterly_disclosure, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(symbol) DO UPDATE SET
      name = COALESCE(excluded.name, company_fundamentals.name),
      sector = COALESCE(excluded.sector, company_fundamentals.sector),
      category = COALESCE(excluded.category, company_fundamentals.category),
      eps_basic = COALESCE(excluded.eps_basic, company_fundamentals.eps_basic),
      eps_diluted = COALESCE(excluded.eps_diluted, company_fundamentals.eps_diluted),
      eps_quarterly = COALESCE(excluded.eps_quarterly, company_fundamentals.eps_quarterly),
      nav_per_share = COALESCE(excluded.nav_per_share, company_fundamentals.nav_per_share),
      paid_up_capital_mn = COALESCE(excluded.paid_up_capital_mn, company_fundamentals.paid_up_capital_mn),
      authorized_capital_mn = COALESCE(excluded.authorized_capital_mn, company_fundamentals.authorized_capital_mn),
      pe_basic = COALESCE(excluded.pe_basic, company_fundamentals.pe_basic),
      pe_diluted = COALESCE(excluded.pe_diluted, company_fundamentals.pe_diluted),
      pe_trailing = COALESCE(excluded.pe_trailing, company_fundamentals.pe_trailing),
      dividend_yield = COALESCE(excluded.dividend_yield, company_fundamentals.dividend_yield),
      audited_period = COALESCE(excluded.audited_period, company_fundamentals.audited_period),
      quarterly_disclosure = COALESCE(excluded.quarterly_disclosure, company_fundamentals.quarterly_disclosure),
      updated_at = datetime('now')
  `, [
    symbol,
    data.name || null,
    data.sector || null,
    data.category || null,
    data.epsBasic !== undefined ? data.epsBasic : null,
    data.epsDiluted !== undefined ? data.epsDiluted : null,
    data.epsQuarterly !== undefined ? data.epsQuarterly : null,
    data.navPerShare !== undefined ? data.navPerShare : null,
    data.paidUpCapitalMn !== undefined ? data.paidUpCapitalMn : null,
    data.authorizedCapitalMn !== undefined ? data.authorizedCapitalMn : null,
    data.peBasic !== undefined ? data.peBasic : null,
    data.peDiluted !== undefined ? data.peDiluted : null,
    data.peTrailing !== undefined ? data.peTrailing : null,
    data.dividendYield !== undefined ? data.dividendYield : null,
    data.auditedPeriod || null,
    data.quarterlyDisclosure || null
  ]);
}

// 4b. Smart Delta Fundamentals Upsert (0 DB writes if unchanged)
export async function saveFundamentalsDelta(data) {
  if (!data || !data.symbol) return { changed: false };
  const symbol = data.symbol.toUpperCase().trim();

  const existing = await dbGet(`SELECT * FROM company_fundamentals WHERE symbol = ?`, [symbol]);

  if (existing) {
    const isEpsSame = (existing.eps_basic === null && (data.epsBasic === null || data.epsBasic === undefined)) || 
                      (Number(existing.eps_basic) === Number(data.epsBasic));
    const isNavSame = (existing.nav_per_share === null && (data.navPerShare === null || data.navPerShare === undefined)) || 
                      (Number(existing.nav_per_share) === Number(data.navPerShare));
    const isPeriodSame = existing.audited_period === data.auditedPeriod;
    const isPaidUpSame = (existing.paid_up_capital_mn === null && (data.paidUpCapitalMn === null || data.paidUpCapitalMn === undefined)) || 
                         (Number(existing.paid_up_capital_mn) === Number(data.paidUpCapitalMn));

    if (isEpsSame && isNavSame && isPeriodSame && isPaidUpSame && data.epsBasic !== null && data.epsBasic !== undefined) {
      return { changed: false, symbol };
    }
  }

  // Differences detected -> execute update
  await saveFundamentals(data);
  return { changed: true, symbol };
}

// 5. Get All Fundamentals map
export async function getAllFundamentalsMap() {
  const rows = await dbAll('SELECT * FROM company_fundamentals');
  const map = {};
  for (const r of rows) {
    map[r.symbol] = {
      symbol: r.symbol,
      name: r.name,
      sector: r.sector,
      category: r.category,
      eps: r.eps_basic,
      epsDiluted: r.eps_diluted,
      navPerShare: r.nav_per_share,
      paidUpCapital: r.paid_up_capital_mn,
      peBasic: r.pe_basic,
      peDiluted: r.pe_diluted,
      peTrailing: r.pe_trailing,
      dividendYield: r.dividend_yield,
      auditedPeriod: r.audited_period,
      quarterlyDisclosure: r.quarterly_disclosure,
      updatedAt: r.updated_at
    };
  }
  return map;
}

// 5a. Save Market Breadth & Sector Summary to SQLite
export async function saveMarketBreadth(data, dateStr) {
  if (!data) return;
  const targetDate = dateStr || new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(new Date());

  await dbRun(`
    INSERT INTO market_breadth (
      date, advancing, declining, unchanged, total_trades, total_volume, total_value_mn, dsex_index, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(date) DO UPDATE SET
      advancing = excluded.advancing,
      declining = excluded.declining,
      unchanged = excluded.unchanged,
      total_trades = excluded.total_trades,
      total_volume = excluded.total_volume,
      total_value_mn = excluded.total_value_mn,
      dsex_index = excluded.dsex_index,
      updated_at = datetime('now')
  `, [
    targetDate,
    data.advancing || 0,
    data.declining || 0,
    data.unchanged || 0,
    data.totalTrades || 0,
    data.totalVolume || 0,
    data.totalValueMn || 0,
    data.dsexIndex || 0
  ]);
}

// 5b. Get Latest Market Breadth from SQLite
export async function getLatestMarketBreadth() {
  return await dbGet(`
    SELECT * FROM market_breadth
    ORDER BY date DESC
    LIMIT 1
  `);
}

// 5b. Fetch Complete Equities List directly from SQLite DB (Latest Audited Fundamentals + Latest Daily Closing)
export async function getAllStocksFromDB() {
  const rows = await dbAll(`
    SELECT 
      f.symbol,
      f.name as fullName,
      f.sector,
      f.category,
      f.eps_basic as eps,
      f.eps_diluted as epsDiluted,
      f.nav_per_share as navPerShare,
      f.paid_up_capital_mn as paidUpCapital,
      f.authorized_capital_mn as authorizedCapital,
      f.dividend_yield as dividendYield,
      COALESCE(f.audited_period, 'FY2026 Q3 (9M)') as auditedPeriod,
      COALESCE(f.quarterly_disclosure, 'Q3 Unaudited (9M)') as quarterlyDisclosure,
      p.date as closeDate,
      p.close as ltp,
      p.ycp,
      p.change,
      p.change_percent as changePercent,
      p.volume,
      p.pe,
      (p.change_percent) as momentum,
      0.35 as debtToEquity,
      1.45 as currentRatio
    FROM company_fundamentals f
    LEFT JOIN (
      SELECT ph1.symbol, ph1.date, ph1.close, ph1.ycp, ph1.change, ph1.change_percent, ph1.volume, ph1.pe
      FROM price_history ph1
      INNER JOIN (
        SELECT symbol, MAX(date) as max_date
        FROM price_history
        WHERE date NOT LIKE '%T%' AND date NOT LIKE '%:%'
        GROUP BY symbol
      ) ph2 ON ph1.symbol = ph2.symbol AND ph1.date = ph2.max_date
    ) p ON f.symbol = p.symbol
    ORDER BY f.symbol ASC
  `);

  return (rows || []).map(r => {
    const ltp = r.ltp !== null ? Number(r.ltp) : null;
    const ycp = r.ycp !== null ? Number(r.ycp) : null;
    const eps = r.eps !== null ? Number(r.eps) : null;
    const navPerShare = r.navPerShare !== null ? Number(r.navPerShare) : null;
    const paidUpCapital = r.paidUpCapital !== null ? Number(r.paidUpCapital) : null;
    
    // Strict closing price change & momentum calculated from consecutive closing balances
    const change = (ltp !== null && ycp !== null && ycp > 0)
      ? Number((ltp - ycp).toFixed(2))
      : (r.change !== null ? Number(r.change) : 0);

    const changePercent = (ltp !== null && ycp !== null && ycp > 0)
      ? Number((((ltp - ycp) / ycp) * 100).toFixed(2))
      : (r.changePercent !== null ? Number(r.changePercent) : 0);

    // Strict Daily Session Volume recorded at close
    const volume = r.volume !== null ? Number(r.volume) : 0;

    // Daily P/E: Daily Closing LTP / Latest Running EPS (Fluctuates daily with price)
    const dailyPe = (ltp && eps && eps > 0)
      ? Number((ltp / eps).toFixed(2))
      : (r.pe !== null ? Number(r.pe) : null);

    // Audited P/E: Valuation multiple grounded in Audited Financial Statements & YCP base
    const auditedPe = (ycp && eps && eps > 0)
      ? Number((ycp / eps).toFixed(2))
      : dailyPe;

    // Dynamic ROE from latest audited EPS and NAVPS
    const roe = (eps !== null && navPerShare !== null && navPerShare > 0)
      ? Number(((eps / navPerShare) * 100).toFixed(2))
      : null;

    // Dynamic Market Cap in Millions BDT (PaidUp / 10 * LTP)
    const marketCap = (ltp !== null && paidUpCapital !== null)
      ? Number(((paidUpCapital / 10) * ltp).toFixed(2))
      : null;

    return {
      ...r,
      ltp,
      ycp,
      change,
      changePercent,
      momentum: changePercent,
      volume,
      pe: dailyPe,
      dailyPe,
      auditedPe,
      eps,
      navPerShare,
      paidUpCapital,
      authorizedCapital: r.authorizedCapital !== null ? Number(r.authorizedCapital) : null,
      dividendYield: r.dividendYield !== null ? Number(r.dividendYield) : 4.15,
      roe,
      marketCap,
      closeDate: r.closeDate || '2026-08-20',
      auditedPeriod: r.auditedPeriod || 'FY2026 Q3 (9M)',
      auditedYear: (r.auditedPeriod || '').includes('2026') ? '2026' : '2025'
    };
  });
}

// 6. Export Historical Data to Excel (.xlsx)
export async function exportToExcel(symbolFilter = null) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'DSE Pulse Terminal';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(symbolFilter && symbolFilter !== 'ALL' ? `${symbolFilter} History` : 'DSE Historical Prices');

  sheet.columns = [
    { header: 'Trading Code', key: 'symbol', width: 16 },
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Close Price (Tk)', key: 'close', width: 18 },
    { header: 'YCP (Tk)', key: 'ycp', width: 14 },
    { header: 'Change (Tk)', key: 'change', width: 14 },
    { header: 'Change %', key: 'change_percent', width: 14 },
    { header: 'Volume', key: 'volume', width: 16 },
    { header: 'P/E Ratio', key: 'pe', width: 14 }
  ];

  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' }
  };

  let rows = [];
  if (symbolFilter && symbolFilter !== 'ALL') {
    rows = await dbAll(`
      SELECT symbol, date, close, ycp, change, change_percent, volume, pe
      FROM price_history
      WHERE symbol = ?
      ORDER BY date ASC
    `, [symbolFilter.toUpperCase().trim()]);
  } else {
    rows = await dbAll(`
      SELECT symbol, date, close, ycp, change, change_percent, volume, pe
      FROM price_history
      ORDER BY date DESC, symbol ASC
      LIMIT 100000
    `);
  }

  for (const r of rows) {
    sheet.addRow(r);
  }

  return await workbook.xlsx.writeBuffer();
}

// 7. Auto-seed SQLite Database from Master Excel Dataset on startup
export async function seed20YearFromMasterExcel() {
  const EXCEL_PATH = path.join(DATA_DIR, 'DSE_20_Year_Master_Dataset_2005_2026.xlsx');
  if (!fs.existsSync(EXCEL_PATH)) {
    console.warn('[SQLITE] Master Excel file not found at:', EXCEL_PATH);
    return;
  }

  try {
    const row = await dbGet('SELECT COUNT(*) as total FROM price_history WHERE date NOT LIKE "%T%" AND date NOT LIKE "%:%"');
    if (row && row.total > 50000) {
      console.log(`[SQLITE] Master SQLite Database ready with ${row.total} daily closing records.`);
      return;
    }

    console.log('[SQLITE] Streaming Master Excel dataset into SQLite database (2005–2026)...');
    await dbRun('PRAGMA synchronous = OFF');
    await dbRun('PRAGMA journal_mode = MEMORY');

    const options = { entries: 'emit', sharedStrings: 'cache', worksheets: 'emit' };
    const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(EXCEL_PATH, options);

    let priceCount = 0;
    let dirCount = 0;
    let kpiCount = 0;

    for await (const worksheetReader of workbookReader) {
      const sheetName = worksheetReader.name;

      if (sheetName === 'Company_Directory') {
        await dbRun('BEGIN TRANSACTION');
        const stmtDir = db.prepare(`
          INSERT INTO company_fundamentals (symbol, name, sector, category, paid_up_capital_mn, authorized_capital_mn, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
          ON CONFLICT(symbol) DO UPDATE SET
            name = excluded.name,
            sector = excluded.sector,
            category = excluded.category,
            paid_up_capital_mn = excluded.paid_up_capital_mn,
            authorized_capital_mn = excluded.authorized_capital_mn,
            updated_at = datetime('now')
        `);

        for await (const row of worksheetReader) {
          if (row.number === 1) continue;
          const symbol = String(row.values[1] || '').toUpperCase().trim();
          const name = String(row.values[2] || '');
          const sector = String(row.values[3] || '');
          const category = String(row.values[4] || 'A');
          const paidUp = Number(row.values[7] || 0);
          const authCap = Number(row.values[8] || 0);

          if (symbol) {
            stmtDir.run([symbol, name, sector, category, paidUp, authCap]);
            dirCount++;
          }
        }
        stmtDir.finalize();
        await dbRun('COMMIT');
        console.log(`[SQLITE] Seeded ${dirCount} company directory profiles.`);
      } else if (sheetName === 'Audited_Quarterly_KPIs') {
        await dbRun('BEGIN TRANSACTION');
        const stmtKpi = db.prepare(`
          UPDATE company_fundamentals SET
            eps_basic = ?,
            eps_diluted = ?,
            nav_per_share = ?,
            dividend_yield = ?,
            audited_period = ?,
            quarterly_disclosure = ?,
            updated_at = datetime('now')
          WHERE symbol = ?
        `);

        for await (const row of worksheetReader) {
          if (row.number === 1) continue;
          const symbol = String(row.values[1] || '').toUpperCase().trim();
          const year = Number(row.values[2] || 0);
          const period = String(row.values[3] || '');
          const epsBasic = Number(row.values[4] || 0);
          const epsDiluted = Number(row.values[5] || 0);
          const navps = Number(row.values[6] || 0);
          const divYield = Number(row.values[11] || 0);

          if (symbol && (year === 2026 || year === 2025)) {
            stmtKpi.run([epsBasic, epsDiluted, navps, divYield, `FY${year} ${period}`, period, symbol]);
            kpiCount++;
          }
        }
        stmtKpi.finalize();
        await dbRun('COMMIT');
        console.log(`[SQLITE] Updated ${kpiCount} audited KPI records.`);
      } else if (sheetName === 'Daily_Price_History') {
        await dbRun('BEGIN TRANSACTION');
        const stmtPrice = db.prepare(`
          INSERT INTO price_history (symbol, date, open, high, low, close, ycp, change, change_percent, volume, pe)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(symbol, date) DO UPDATE SET
            open = excluded.open,
            high = excluded.high,
            low = excluded.low,
            close = excluded.close,
            ycp = excluded.ycp,
            change = excluded.change,
            change_percent = excluded.change_percent,
            volume = excluded.volume,
            pe = excluded.pe
        `);

        for await (const row of worksheetReader) {
          if (row.number === 1) continue;
          const symbol = String(row.values[1] || '').toUpperCase().trim();
          const dateStr = String(row.values[2] || '').slice(0, 10);
          const open = Number(row.values[3] || 0);
          const high = Number(row.values[4] || 0);
          const low = Number(row.values[5] || 0);
          const close = Number(row.values[6] || 0);
          const ycp = Number(row.values[7] || 0);
          const change = Number(row.values[8] || 0);
          const changePercent = Number(row.values[9] || 0);
          const volume = Number(row.values[10] || 0);
          const pe = Number(row.values[11] || 0);

          if (symbol && dateStr && close > 0) {
            stmtPrice.run([symbol, dateStr, open, high, low, close, ycp, change, changePercent, volume, pe]);
            priceCount++;
          }
        }
        stmtPrice.finalize();
        await dbRun('COMMIT');
        console.log(`[SQLITE] Ingested ${priceCount} daily closing records from Excel.`);
      }
    }
  } catch (err) {
    console.error('[SQLITE] Master Excel seeding error:', err.message);
  }
}

// Clean old corrupted snapshot data and initialize
initDB()
  .then(async () => {
    await dbRun(`DELETE FROM price_history WHERE date LIKE '%T%' OR date LIKE '%:%'`).catch(() => {});
    await seed20YearFromMasterExcel();
  })
  .catch(e => console.error('[SQLITE] Init error:', e.message));

export default db;

