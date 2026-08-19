/* eslint-disable no-unused-vars, no-empty, no-undef */
import express from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';
import https from 'https';
import cors from 'cors';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import db, {
  saveDailyClosingToDB,
  getHistoricalTimeline,
  getLatestRecordedClosing,
  saveFundamentals,
  getAllFundamentalsMap,
  exportToExcel,
  seedFromHistoryJson
} from './db.js';

let cron;
try {
  cron = await import('node-cron');
  cron = cron.default;
} catch (e) {
  cron = null;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const DATA_DIR = path.join(__dirname, '..', 'data');
fs.ensureDirSync(DATA_DIR);
const LATEST_FILE = path.join(DATA_DIR, 'latest.json');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');
const FUNDAMENTALS_FILE = path.join(DATA_DIR, 'fundamentals.json');
const SYMBOLS_FILE = path.join(__dirname, 'symbols.json');

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

async function loadSymbols() {
  try {
    if (await fs.pathExists(SYMBOLS_FILE)) {
      const txt = await fs.readFile(SYMBOLS_FILE, 'utf8');
      const s = JSON.parse(txt);
      if (Array.isArray(s) && s.length) return s.map(x => String(x).toUpperCase());
    }
  } catch (err) {
    console.warn('Failed to read symbols.json', err.message);
  }
  return ['1JANATAMF', 'BATBC', 'BRACBANK', 'GP', 'SQURPHARMA', 'BEXIMCO', 'LHBL', 'ISLAMIBANK'];
}

// -------------------------------------------------------------
// 1. OFFICIAL DSE SCRAPERS (dsebd.org)
// -------------------------------------------------------------

// Fetch official DSE Daily Closing Prices from dsebd.org/dse_close_price.php
export async function fetchDSEClosingPrices() {
  try {
    const res = await axios.get('https://dsebd.org/dse_close_price.php', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      httpsAgent,
      timeout: 15000
    });

    const $ = cheerio.load(res.data);
    const records = [];
    const rows = $('table.table-bordered tr, table tr');

    rows.each((i, tr) => {
      const cols = $(tr).find('td').map((_, c) => $(c).text().replace(/\s+/g, ' ').trim()).get();
      if (cols.length >= 4) {
        // Typically cols: [ "#", "TRADING CODE", "CLOSEP*", "YCP*" ]
        const symbol = cols[1].toUpperCase().trim();
        const close = parseFloat(cols[2].replace(/,/g, ''));
        const ycp = parseFloat(cols[3].replace(/,/g, ''));
        if (symbol && !isNaN(close) && close > 0) {
          const change = !isNaN(ycp) && ycp > 0 ? Number((close - ycp).toFixed(2)) : 0;
          const changePercent = !isNaN(ycp) && ycp > 0 ? Number(((change / ycp) * 100).toFixed(2)) : 0;
          records.push({
            symbol,
            ltp: close,
            closePrice: close,
            ycp: !isNaN(ycp) ? ycp : null,
            change,
            changePercent
          });
        }
      }
    });

    console.log(`[DSE] Scraped ${records.length} official closing prices from dsebd.org`);
    return records;
  } catch (err) {
    console.warn('[DSE] Error fetching closing prices from dsebd.org:', err.message);
    return [];
  }
}

// Fetch official DSE Live Ticker / Index from dsebd.org
export async function fetchDSELiveTicker() {
  try {
    const urls = [
      'https://dsebd.org/dseX_share.php',
      'https://dsebd.org/mkt_depth_3.php'
    ];
    const map = new Map();

    for (const url of urls) {
      try {
        const res = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          httpsAgent,
          timeout: 12000
        });
        const $ = cheerio.load(res.data);
        $('tr').each((_, tr) => {
          const text = $(tr).text().replace(/\s+/g, ' ').trim();
          const match = text.match(/([A-Z0-9_-]{2,16})\s+([\d.]+)\s+([+-]?[\d.]+)\s+([+-]?[\d.]+)%/);
          if (match) {
            const symbol = match[1].toUpperCase().trim();
            const ltp = parseFloat(match[2]);
            const change = parseFloat(match[3]);
            const changePercent = parseFloat(match[4]);
            if (symbol && !isNaN(ltp) && ltp > 0 && !map.has(symbol)) {
              map.set(symbol, { symbol, ltp, change, changePercent });
            }
          }
        });
        if (map.size > 50) break;
      } catch (e) {
        // Try next URL
      }
    }

    console.log(`[DSE] Scraped ${map.size} live market prices from dsebd.org`);
    return Array.from(map.values());
  } catch (err) {
    console.warn('[DSE] Live ticker scrape notice:', err.message);
    return [];
  }
}

// Fetch Company Fundamentals from official DSE page (https://dsebd.org/displayCompany.php?name=SYMBOL)
export async function fetchDSEFundamentals(symbol) {
  const cleanSym = (symbol || '').toUpperCase().trim();
  if (!cleanSym) return null;

  try {
    const url = `https://dsebd.org/displayCompany.php?name=${encodeURIComponent(cleanSym)}`;
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      httpsAgent,
      timeout: 15000
    });

    const $ = cheerio.load(res.data);
    const data = {
      symbol: cleanSym,
      name: '',
      sector: '',
      category: '',
      epsBasic: null,
      epsDiluted: null,
      epsQuarterly: null,
      navPerShare: null,
      paidUpCapitalMn: null,
      authorizedCapitalMn: null,
      peBasic: null,
      peDiluted: null,
      peTrailing: null,
      dividendYield: null,
      auditedPeriod: null,
      quarterlyDisclosure: null
    };

    $('table tr').each((_, tr) => {
      const text = $(tr).text().replace(/\s+/g, ' ').trim();
      const cols = $(tr).find('td, th').map((_, c) => $(c).text().replace(/\s+/g, ' ').trim()).get();

      // Authorized & Paid-up Capital, Sector
      for (let i = 0; i < cols.length; i++) {
        const col = cols[i];
        if (col.includes('Authorized Capital (mn)') && cols[i + 1]) {
          const num = parseFloat(cols[i + 1].replace(/,/g, ''));
          if (!isNaN(num)) data.authorizedCapitalMn = num;
        }
        if (col.includes('Paid-up Capital (mn)') && cols[i + 1]) {
          const num = parseFloat(cols[i + 1].replace(/,/g, ''));
          if (!isNaN(num)) data.paidUpCapitalMn = num;
        }
        if (col.includes('Sector') && cols[i + 1]) {
          data.sector = cols[i + 1];
        }
      }

      // P/E Basic and Trailing
      if (text.includes('Basic EPS') && text.includes('P/E')) {
        const nums = text.match(/[-+]?\d*\.?\d+/g);
        if (nums && nums.length > 0) {
          const val = parseFloat(nums[0]);
          if (!isNaN(val) && data.peBasic === null) data.peBasic = val;
        }
      }

      if (text.includes('Trailing P/E Ratio')) {
        const nums = text.match(/[-+]?\d*\.?\d+/g);
        if (nums && nums.length > 0) {
          const val = parseFloat(nums[0]);
          if (!isNaN(val)) data.peTrailing = val;
        }
      }

      // Historical Audited Table (Year, EPS, NAV Per Share, Profit)
      if (cols.length >= 5 && cols[0].match(/^(19|20)\d{2}$/)) {
        const year = cols[0];
        const nums = cols.slice(1).map(c => parseFloat(c.replace(/,/g, ''))).filter(n => !isNaN(n));
        if (nums.length >= 2) {
          data.auditedPeriod = year;
          if (data.epsBasic === null) data.epsBasic = nums[0];
          if (data.navPerShare === null && nums[1]) data.navPerShare = nums[1];
        }
      }
    });

    // Save to SQLite
    await saveFundamentals(data);
    return data;
  } catch (err) {
    return null;
  }
}

// Background Crawler: Crawl fundamentals for all listed symbols in batches
export async function crawlAllFundamentals() {
  console.log('[FUNDAMENTALS] Starting background fundamentals crawl for all listed symbols...');
  const symbols = await loadSymbols();
  const concurrency = 5;
  let successCount = 0;

  for (let i = 0; i < symbols.length; i += concurrency) {
    const batch = symbols.slice(i, i + concurrency);
    const promises = batch.map(sym => fetchDSEFundamentals(sym));
    const results = await Promise.all(promises);
    successCount += results.filter(Boolean).length;
    await new Promise(r => setTimeout(r, 250)); // 250ms rate-limit pause
  }

  // Update fundamentals.json cache
  const allFund = await getAllFundamentalsMap();
  await fs.writeJson(FUNDAMENTALS_FILE, allFund, { spaces: 2 });
  console.log(`[FUNDAMENTALS] Completed fundamentals crawl: ${successCount} companies updated.`);
  return allFund;
}

// -------------------------------------------------------------
// 2. MASTER SCRAPE & PERSISTENCE ENGINE
// -------------------------------------------------------------
export async function scrapeAll() {
  console.log('[SCRAPER] Initiating DSE market data scrape...');
  const symbols = await loadSymbols();

  // 1. Fetch live prices & closing prices from official DSE
  const [closingRecords, liveRecords] = await Promise.all([
    fetchDSEClosingPrices(),
    fetchDSELiveTicker()
  ]);

  const liveMap = new Map();
  for (const r of closingRecords) liveMap.set(r.symbol, r);
  for (const r of liveRecords) {
    if (!liveMap.has(r.symbol)) liveMap.set(r.symbol, r);
    else Object.assign(liveMap.get(r.symbol), r);
  }

  // 2. Fetch Cached Fundamentals from SQLite
  const fundamentalsMap = await getAllFundamentalsMap();

  // 3. Assemble Enriched Stock Records with strict fallback
  const enrichedList = [];
  const nowDhakaStr = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Dhaka',
    month: 'short',
    day: 'numeric'
  }).format(new Date());

  for (const symbol of symbols) {
    const live = liveMap.get(symbol) || {};
    const fund = fundamentalsMap[symbol] || {};
    const recordedClose = await getLatestRecordedClosing(symbol);

    let ltp = live.ltp ?? recordedClose?.ltp ?? null;
    let changePercent = live.changePercent ?? recordedClose?.changePercent ?? null;
    let change = live.change ?? recordedClose?.change ?? null;
    let volume = live.volume ?? recordedClose?.volume ?? null;
    let pe = live.pe ?? fund.peBasic ?? fund.peTrailing ?? recordedClose?.pe ?? null;

    let eps = fund.eps ?? null;
    let roe = fund.navPerShare && eps ? Number(((eps / fund.navPerShare) * 100).toFixed(2)) : null;

    const _historyFallback = {};
    if (live.ltp === undefined || live.ltp === null) {
      if (recordedClose?.ltp) _historyFallback.ltp = { source: 'database', date: recordedClose.date };
    }
    if (fund.auditedPeriod) {
      _historyFallback.eps = { source: 'fundamentals', year: fund.auditedPeriod };
      _historyFallback.roe = { source: 'fundamentals', year: fund.auditedPeriod };
    }

    enrichedList.push({
      symbol,
      name: fund.name || symbol,
      sector: fund.sector || 'General',
      category: fund.category || 'A',
      ltp,
      change,
      changePercent,
      pe,
      eps,
      roe,
      debtToEquity: null,
      currentRatio: null,
      volume,
      navPerShare: fund.navPerShare || null,
      paidUpCapital: fund.paidUpCapital || null,
      _historyFallback
    });
  }

  // 4. Save to latest.json and record daily close into SQLite
  const payload = {
    fetchedAt: new Date().toISOString(),
    count: enrichedList.length,
    stocks: enrichedList
  };

  await fs.writeJson(LATEST_FILE, payload, { spaces: 2 });

  if (closingRecords.length > 0) {
    const savedCount = await saveDailyClosingToDB(closingRecords);
    console.log(`[SQLITE] Saved ${savedCount} daily closing records to SQLite database.`);
  }

  return payload;
}

// -------------------------------------------------------------
// 3. REST API ENDPOINTS
// -------------------------------------------------------------

// Root Healthcheck & Status
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    service: 'DSE Live Scraper & Analytics API',
    database: 'SQLite (data/dse.db)',
    timezone: 'Asia/Dhaka',
    schedule: 'Market Hours (Sun-Thu 10:00 AM - 3:00 PM BST)',
    closingSchedule: 'Daily Close (Sun-Thu 3:30 PM BST)',
    fundamentalsSchedule: 'Weekly Crawl (Saturdays 12:00 PM BST)',
    endpoints: {
      stocks: 'GET /api/stocks',
      scrape: 'POST /api/scrape',
      fundamentalsCrawl: 'POST /api/scrape/fundamentals',
      fundamentals: 'GET /api/fundamentals',
      history: 'GET /api/history/:symbol',
      excelExport: 'GET /api/export/excel?symbol=ALL',
      report: 'GET /api/report'
    }
  });
});

// Stocks API with strict fallback tagging
app.get('/api/stocks', async (req, res) => {
  try {
    if (await fs.pathExists(LATEST_FILE)) {
      const data = await fs.readJson(LATEST_FILE);
      if (data && Array.isArray(data.stocks)) return res.json(data.stocks);
    }
    const fresh = await scrapeAll();
    return res.json(fresh.stocks || []);
  } catch (err) {
    console.error('Error in /api/stocks:', err.message);
    res.status(500).json({ error: 'Failed to fetch stocks' });
  }
});

// Trigger Instant Scrape & Sync
app.post('/api/scrape', async (req, res) => {
  try {
    const result = await scrapeAll();
    res.json({ status: 'ok', result });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Trigger Background Fundamentals Crawl
app.post('/api/scrape/fundamentals', async (req, res) => {
  try {
    crawlAllFundamentals().catch(e => console.error('Background crawl error:', e.message));
    res.json({ status: 'ok', message: 'Fundamentals background crawl started' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Fetch Cached Fundamentals
app.get('/api/fundamentals', async (req, res) => {
  try {
    const data = await getAllFundamentalsMap();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch fundamentals' });
  }
});

// Fetch Historical Timeline Strictly from SQLite
app.get('/api/history/:symbol', async (req, res) => {
  const sym = req.params.symbol;
  const limit = parseInt(req.query.limit || '7500', 10);
  try {
    const rows = await getHistoricalTimeline(sym, limit);
    res.json({ symbol: sym, history: rows });
  } catch (err) {
    res.json({ symbol: sym, history: [] });
  }
});

// Export 20-Year Historical Data to Excel (.xlsx)
app.get('/api/export/excel', async (req, res) => {
  const symbol = req.query.symbol || 'ALL';
  try {
    const buffer = await exportToExcel(symbol);
    const filename = symbol === 'ALL' ? 'DSE_20_Year_Historical_Data.xlsx' : `${symbol}_Historical_Data.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    console.error('Error generating Excel export:', err.message);
    res.status(500).json({ error: 'Failed to generate Excel export' });
  }
});

app.get('/api/report', async (req, res) => {
  if (await fs.pathExists(REPORT_FILE)) return res.sendFile(REPORT_FILE);
  return res.json({ missingReport: [] });
});

// -------------------------------------------------------------
// 4. CRON SCHEDULING (DSE Market Hours Only)
// -------------------------------------------------------------

// 1. Hourly Scraper during DSE Market Hours (Sunday to Thursday, 10:00 AM to 3:00 PM BST)
if (cron) {
  cron.schedule('0 10-15 * * 0-4', async () => {
    const nowDhaka = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Dhaka',
      dateStyle: 'medium',
      timeStyle: 'medium'
    }).format(new Date());
    console.log(`[CRON] Market Hours Auto-scrape triggered at ${nowDhaka} (BST)`);
    try {
      await scrapeAll();
      console.log(`[CRON] Market Hours Auto-scrape completed successfully.`);
    } catch (err) {
      console.error('[CRON] Scrape error:', err.message);
    }
  }, { timezone: 'Asia/Dhaka' });

  // 2. Daily Market Closing Archive (Sunday to Thursday at 3:30 PM BST)
  cron.schedule('30 15 * * 0-4', async () => {
    console.log('[CRON] Daily Market Close Archive triggered (3:30 PM BST)');
    try {
      const records = await fetchDSEClosingPrices();
      if (records.length > 0) {
        await saveDailyClosingToDB(records);
        console.log(`[CRON] Daily close archive committed ${records.length} records to SQLite.`);
      }
    } catch (err) {
      console.error('[CRON] Daily close archive error:', err.message);
    }
  }, { timezone: 'Asia/Dhaka' });

  // 3. Weekly Fundamentals Crawl (Every Saturday at 12:00 PM BST)
  cron.schedule('0 12 * * 6', async () => {
    console.log('[CRON] Weekly Fundamentals Crawl triggered (Saturday 12:00 PM BST)');
    try {
      await crawlAllFundamentals();
    } catch (err) {
      console.error('[CRON] Weekly fundamentals error:', err.message);
    }
  }, { timezone: 'Asia/Dhaka' });

  console.log('[CRON] Registered DSE Market Hours Schedule (Sun-Thu 10am-3pm BST, Daily Close 3:30pm BST, Weekly Sat 12pm BST).');
}

// Initial warm-up scrape if latest.json missing
(async () => {
  if (!fs.existsSync(LATEST_FILE)) {
    console.log('Running initial warm-up scrape...');
    try {
      await scrapeAll();
    } catch (e) {
      console.warn('Initial warm-up notice:', e.message);
    }
  }
})();

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`DSE Analytics Server listening on port ${PORT}`);
});
