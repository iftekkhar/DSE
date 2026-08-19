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

  await seedFromHistoryJson();
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

// 2. Fetch Historical Timeline for a Stock directly from SQLite
export async function getHistoricalTimeline(symbol, limit = 365) {
  const cleanSym = (symbol || '').toUpperCase().trim();
  const rows = await dbAll(`
    SELECT date as fetchedAt, close as ltp, ycp, change, change_percent as changePercent, volume, pe
    FROM price_history
    WHERE symbol = ?
    ORDER BY date ASC
    LIMIT ?
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

// 7. Auto-migration from existing data/history.json on startup
export async function seedFromHistoryJson() {
  const historyFile = path.join(DATA_DIR, 'history.json');
  if (!fs.existsSync(historyFile)) return;
  try {
    const raw = fs.readFileSync(historyFile, 'utf-8');
    const historyData = JSON.parse(raw);
    const rows = [];

    if (Array.isArray(historyData)) {
      for (const snap of historyData) {
        if (!snap) continue;
        const dateStr = snap.fetchedAt ? snap.fetchedAt.slice(0, 10) : new Date().toISOString().slice(0, 10);
        const list = snap.data || snap.stocks || [];
        for (const s of list) {
          if (!s || !s.symbol || s.ltp === null || s.ltp === undefined || s.ltp === 0) continue;
          rows.push({
            symbol: s.symbol.toUpperCase().trim(),
            date: dateStr,
            close: Number(s.ltp),
            ycp: Number(s.ycp || (s.ltp - (s.change || 0))),
            change: Number(s.change || 0),
            change_percent: Number(s.changePercent || 0),
            volume: Number(s.volume || 0),
            pe: s.pe !== null && s.pe !== undefined ? Number(s.pe) : null
          });
        }
      }
    } else if (typeof historyData === 'object') {
      for (const [symbol, snapshots] of Object.entries(historyData)) {
        if (!Array.isArray(snapshots)) continue;
        for (const s of snapshots) {
          if (!s || s.ltp === null || s.ltp === undefined) continue;
          const dateStr = s.fetchedAt ? s.fetchedAt.slice(0, 10) : new Date().toISOString().slice(0, 10);
          rows.push({
            symbol: symbol.toUpperCase().trim(),
            date: dateStr,
            close: Number(s.ltp),
            ycp: Number(s.ycp || 0),
            change: Number(s.change || 0),
            change_percent: Number(s.changePercent || 0),
            volume: Number(s.volume || 0),
            pe: s.pe !== null && s.pe !== undefined ? Number(s.pe) : null
          });
        }
      }
    }

    if (rows.length > 0) {
      const seeded = await saveDailyClosingToDB(rows);
      console.log(`[SQLITE] Seeded ${seeded} historical records into SQLite database.`);
    }
  } catch (err) {
    console.warn('[SQLITE] Seed notice:', err.message);
  }
}

// Initialize tables immediately
initDB().catch(e => console.error('[SQLITE] Init error:', e.message));

export default db;
