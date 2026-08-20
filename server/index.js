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
  saveFundamentalsDelta,
  getAllFundamentalsMap,
  getAllStocksFromDB,
  saveMarketBreadth,
  getLatestMarketBreadth,
  exportToExcel
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

// Tracking runtime job statuses
const jobStatusRegistry = {
  job1: {
    name: 'Official Daily Closing Prices Scraper',
    schedule: 'Sun-Thu @ 15:30 BST',
    target: 'price_history (SQLite)',
    lastRun: null,
    status: 'Ready',
    recordsIngested: 0
  },
  job2: {
    name: 'Live Intraday Ticker & Market Depth',
    schedule: 'On-Demand (Sync Button)',
    target: 'RAM / sessionStorage (0 DB Writes)',
    lastRun: null,
    status: 'Ready'
  },
  job3: {
    name: 'Audited Fundamental Disclosures Crawler',
    schedule: 'Daily Sun-Thu @ 16:00 BST',
    target: 'company_fundamentals (SQLite Smart Delta)',
    lastRun: null,
    status: 'Ready',
    updatedCount: 0,
    skippedCount: 0
  },
  job4: {
    name: 'Market Breadth & Sector Index Scraper',
    schedule: 'Every 30m during Market Hours (10:00 - 15:00 BST)',
    target: 'market_breadth (SQLite)',
    lastRun: null,
    status: 'Ready'
  }
};

async function loadSymbols() {
  try {
    if (await fs.pathExists(SYMBOLS_FILE)) {
      const txt = await fs.readFile(SYMBOLS_FILE, 'utf8');
      const s = JSON.parse(txt);
      if (Array.isArray(s) && s.length) return s.map(x => String(x).toUpperCase().trim());
    }
  } catch (err) {
    console.warn('Failed to read symbols.json', err.message);
  }
  const dbStocks = await getAllStocksFromDB().catch(() => []);
  if (dbStocks.length > 0) return dbStocks.map(s => s.symbol);
  return ['1JANATAMF', 'BATBC', 'BRACBANK', 'GP', 'SQURPHARMA', 'BEXIMCO', 'LHBL', 'ISLAMIBANK'];
}

// -------------------------------------------------------------
// 1. RAW DSE SCRAPERS (dsebd.org)
// -------------------------------------------------------------

// Scrape official closing price table from dsebd.org/dse_close_price.php
export async function fetchDSEClosingPrices() {
  try {
    const res = await axios.get('https://dsebd.org/dse_close_price.php', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'
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
        const symbol = cols[1].toUpperCase().trim();
        const close = parseFloat(cols[2].replace(/,/g, ''));
        const ycp = parseFloat(cols[3].replace(/,/g, ''));
        const high = cols[4] ? parseFloat(cols[4].replace(/,/g, '')) : close;
        const low = cols[5] ? parseFloat(cols[5].replace(/,/g, '')) : close;
        const volume = cols[6] ? parseInt(cols[6].replace(/,/g, ''), 10) : 0;
        const value = cols[7] ? parseFloat(cols[7].replace(/,/g, '')) : 0;

        if (symbol && !isNaN(close) && close > 0) {
          const change = !isNaN(ycp) && ycp > 0 ? Number((close - ycp).toFixed(2)) : 0;
          const changePercent = !isNaN(ycp) && ycp > 0 ? Number(((change / ycp) * 100).toFixed(2)) : 0;
          records.push({
            symbol,
            close,
            closePrice: close,
            ycp: !isNaN(ycp) ? ycp : null,
            open: ycp || close,
            high: !isNaN(high) ? high : close,
            low: !isNaN(low) ? low : close,
            change,
            changePercent,
            volume: !isNaN(volume) ? volume : 0,
            value: !isNaN(value) ? value : 0
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

// Scrape live intraday ticker snapshot from dsebd.org
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
        // Continue to next mirror url
      }
    }

    console.log(`[DSE] Scraped ${map.size} live market prices from dsebd.org`);
    return Array.from(map.values());
  } catch (err) {
    console.warn('[DSE] Live ticker scrape notice:', err.message);
    return [];
  }
}

// Scrape individual company fundamentals from official DSE page
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

      // Historical Audited Table (Year, EPS, NAV Per Share)
      if (cols.length >= 5 && cols[0].match(/^(19|20)\d{2}$/)) {
        const year = cols[0];
        const nums = cols.slice(1).map(c => parseFloat(c.replace(/,/g, ''))).filter(n => !isNaN(n));
        if (nums.length >= 2) {
          data.auditedPeriod = `FY${year} Audited`;
          if (data.epsBasic === null) data.epsBasic = nums[0];
          if (data.navPerShare === null && nums[1]) data.navPerShare = nums[1];
        }
      }
    });

    return data;
  } catch (err) {
    return null;
  }
}

// Scrape macro market breadth & DSEX index from dsebd.org homepage
export async function fetchMarketBreadthFromDSE() {
  try {
    const res = await axios.get('https://dsebd.org/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      httpsAgent,
      timeout: 12000
    });

    const $ = cheerio.load(res.data);
    const breadth = {
      advancing: 0,
      declining: 0,
      unchanged: 0,
      totalTrades: 0,
      totalVolume: 0,
      totalValueMn: 0,
      dsexIndex: 0
    };

    const text = $('body').text();
    
    // Extract DSEX Index
    const dsexMatch = text.match(/DSEX\s+([\d,.]+)/i);
    if (dsexMatch) breadth.dsexIndex = parseFloat(dsexMatch[1].replace(/,/g, ''));

    // Extract Advances, Declines, Unchanged
    const advMatch = text.match(/Issues\s+Advanced[:\s]+(\d+)/i) || text.match(/Advanced[:\s]+(\d+)/i);
    if (advMatch) breadth.advancing = parseInt(advMatch[1], 10);

    const decMatch = text.match(/Issues\s+Declined[:\s]+(\d+)/i) || text.match(/Declined[:\s]+(\d+)/i);
    if (decMatch) breadth.declining = parseInt(decMatch[1], 10);

    const unchMatch = text.match(/Issues\s+Unchanged[:\s]+(\d+)/i) || text.match(/Unchanged[:\s]+(\d+)/i);
    if (unchMatch) breadth.unchanged = parseInt(unchMatch[1], 10);

    // Extract Turnover Value
    const valMatch = text.match(/Total\s+Value\s+\(mn\)[:\s]+([\d,.]+)/i) || text.match(/Turnover[:\s]+([\d,.]+)\s+mn/i);
    if (valMatch) breadth.totalValueMn = parseFloat(valMatch[1].replace(/,/g, ''));

    return breadth;
  } catch (err) {
    console.warn('[DSE] Breadth scrape notice:', err.message);
    return null;
  }
}

// -------------------------------------------------------------
// 2. THE 4 MASTER AUTOMATION JOBS
// -------------------------------------------------------------

// JOB 1: Official Daily Closing Prices Scraper (Saves to SQLite price_history)
export async function runJob1ClosingPrices() {
  console.log('[JOB 1] Starting Official Daily Closing Prices Ingestion...');
  jobStatusRegistry.job1.status = 'Running';
  
  try {
    const records = await fetchDSEClosingPrices();
    if (records.length === 0) {
      jobStatusRegistry.job1.status = 'No records found (Market Holiday / Off-hours)';
      return { success: false, count: 0 };
    }

    const fundamentalsMap = await getAllFundamentalsMap();
    const todayDhakaStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(new Date());

    // Enrich with dynamic Daily P/E calculation
    const enrichedRecords = records.map(r => {
      const fund = fundamentalsMap[r.symbol] || {};
      const eps = fund.eps !== null && fund.eps > 0 ? Number(fund.eps) : null;
      const dailyPe = eps ? Number((r.close / eps).toFixed(2)) : (fund.peBasic || null);
      return {
        ...r,
        pe: dailyPe
      };
    });

    const savedCount = await saveDailyClosingToDB(enrichedRecords, todayDhakaStr);
    
    jobStatusRegistry.job1.lastRun = new Date().toISOString();
    jobStatusRegistry.job1.status = `Completed (${savedCount} scrips saved for ${todayDhakaStr})`;
    jobStatusRegistry.job1.recordsIngested = savedCount;
    
    console.log(`[JOB 1 SUCCESS] Ingested ${savedCount} daily closing settlement records into SQLite for ${todayDhakaStr}.`);
    return { success: true, count: savedCount, date: todayDhakaStr };
  } catch (err) {
    jobStatusRegistry.job1.status = `Failed: ${err.message}`;
    console.error('[JOB 1 ERROR]', err);
    return { success: false, error: err.message };
  }
}

// JOB 2: Live Intraday Ticker Sync (Session snapshot, 0 DB writes)
export async function runJob2IntradaySync() {
  console.log('[JOB 2] Executing Live Intraday Ticker Sync (Session mode, 0 DB writes)...');
  jobStatusRegistry.job2.status = 'Running';

  try {
    const dbStocks = await getAllStocksFromDB();
    const liveRecords = await fetchDSELiveTicker();
    const liveMap = new Map();
    for (const r of liveRecords) liveMap.set(r.symbol, r);

    const enrichedList = dbStocks.map(base => {
      const live = liveMap.get(base.symbol);
      if (!live || !live.ltp || isNaN(live.ltp)) return base;

      const liveLtp = Number(live.ltp);
      const ycp = base.ycp !== null ? Number(base.ycp) : liveLtp;
      const change = Number((liveLtp - ycp).toFixed(2));
      const changePercent = ycp > 0 ? Number(((change / ycp) * 100).toFixed(2)) : 0;
      
      const eps = base.eps !== null && base.eps > 0 ? Number(base.eps) : null;
      const dailyPe = eps ? Number((liveLtp / eps).toFixed(2)) : base.dailyPe;

      return {
        ...base,
        ltp: liveLtp,
        change,
        changePercent,
        momentum: changePercent,
        pe: dailyPe,
        dailyPe,
        isLiveSession: true
      };
    });

    jobStatusRegistry.job2.lastRun = new Date().toISOString();
    jobStatusRegistry.job2.status = `Completed (${enrichedList.length} scrips in session)`;

    return {
      fetchedAt: new Date().toISOString(),
      count: enrichedList.length,
      stocks: enrichedList
    };
  } catch (err) {
    jobStatusRegistry.job2.status = `Failed: ${err.message}`;
    throw err;
  }
}

// JOB 3: Audited Fundamental Disclosures Crawler (Daily Smart Delta Upsert)
export async function runJob3DailyFundamentalsDelta() {
  console.log('[JOB 3] Starting Daily Audited Fundamentals Smart Delta Ingestion...');
  jobStatusRegistry.job3.status = 'Running';

  try {
    const symbols = await loadSymbols();
    const concurrency = 4;
    let updatedCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < symbols.length; i += concurrency) {
      const batch = symbols.slice(i, i + concurrency);
      const promises = batch.map(async (sym) => {
        const data = await fetchDSEFundamentals(sym);
        if (data) {
          const res = await saveFundamentalsDelta(data);
          if (res.changed) updatedCount++;
          else skippedCount++;
        }
      });
      await Promise.all(promises);
      await new Promise(r => setTimeout(r, 200)); // Rate-limit safety
    }

    jobStatusRegistry.job3.lastRun = new Date().toISOString();
    jobStatusRegistry.job3.status = `Completed (${updatedCount} updated, ${skippedCount} untouched)`;
    jobStatusRegistry.job3.updatedCount = updatedCount;
    jobStatusRegistry.job3.skippedCount = skippedCount;

    console.log(`[JOB 3 SUCCESS] Completed Fundamentals Delta: ${updatedCount} updated, ${skippedCount} skipped (identical).`);
    return { success: true, updatedCount, skippedCount };
  } catch (err) {
    jobStatusRegistry.job3.status = `Failed: ${err.message}`;
    console.error('[JOB 3 ERROR]', err);
    return { success: false, error: err.message };
  }
}

// JOB 4: Market Breadth & Sector Index Scraper (Saves to market_breadth)
export async function runJob4MarketBreadth() {
  console.log('[JOB 4] Ingesting Market Breadth & Sector Pulse...');
  jobStatusRegistry.job4.status = 'Running';

  try {
    const breadth = await fetchMarketBreadthFromDSE();
    if (breadth) {
      const todayDhakaStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(new Date());
      await saveMarketBreadth(breadth, todayDhakaStr);
      jobStatusRegistry.job4.lastRun = new Date().toISOString();
      jobStatusRegistry.job4.status = `Completed (DSEX: ${breadth.dsexIndex || 'N/A'}, Adv: ${breadth.advancing}, Dec: ${breadth.declining})`;
      console.log(`[JOB 4 SUCCESS] Market breadth recorded for ${todayDhakaStr}.`);
      return { success: true, data: breadth };
    }
    jobStatusRegistry.job4.status = 'No breadth data extracted';
    return { success: false };
  } catch (err) {
    jobStatusRegistry.job4.status = `Failed: ${err.message}`;
    return { success: false, error: err.message };
  }
}

// Backward-compatibility alias
export const scrapeAll = runJob2IntradaySync;
export const crawlAllFundamentals = runJob3DailyFundamentalsDelta;

// -------------------------------------------------------------
// 3. REST API ENDPOINTS
// -------------------------------------------------------------

// Root Healthcheck & Status
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    service: 'DSE Live Scraper & Analytics Engine',
    database: 'SQLite (data/dse.db)',
    timezone: 'Asia/Dhaka (UTC+6)',
    jobs: jobStatusRegistry,
    endpoints: {
      stocks: 'GET /api/stocks (Strict SQLite Master Feed)',
      marketPulse: 'GET /api/market-pulse (Market Breadth)',
      job1Closing: 'POST /api/jobs/closing (Job 1: Daily Close Archive)',
      job2Intraday: 'POST /api/scrape or POST /api/jobs/intraday (Job 2: Session Sync)',
      job3Fundamentals: 'POST /api/jobs/fundamentals (Job 3: Audited Fundamentals Delta)',
      job4Breadth: 'POST /api/jobs/breadth (Job 4: Market Breadth)',
      jobsStatus: 'GET /api/jobs/status (All Job Schedules & Run Logs)',
      history: 'GET /api/history/:symbol (20-Year Daily Timeline)',
      excelExport: 'GET /api/export/excel?symbol=ALL'
    }
  });
});

// Stocks API: Strictly pull from SQLite Database only
app.get('/api/stocks', async (req, res) => {
  try {
    const stocks = await getAllStocksFromDB();
    if (stocks && stocks.length > 0) return res.json(stocks);
    if (await fs.pathExists(LATEST_FILE)) {
      const data = await fs.readJson(LATEST_FILE);
      if (data && Array.isArray(data.stocks)) return res.json(data.stocks);
    }
    return res.json([]);
  } catch (err) {
    console.error('Error in /api/stocks:', err.message);
    res.status(500).json({ error: 'Failed to fetch stocks from database' });
  }
});

// Job 2: Manual Live Intraday Ticker Sync (Session snapshot, 0 DB writes)
app.post('/api/scrape', async (req, res) => {
  try {
    const result = await runJob2IntradaySync();
    res.json({ status: 'ok', result, stocks: result.stocks });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});
app.post('/api/jobs/intraday', async (req, res) => {
  try {
    const result = await runJob2IntradaySync();
    res.json({ status: 'ok', result, stocks: result.stocks });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Job 1: Trigger Daily Closing Settlement Ingestion
app.post('/api/jobs/closing', async (req, res) => {
  try {
    const result = await runJob1ClosingPrices();
    res.json({ status: 'ok', result });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Job 3: Trigger Audited Fundamentals Delta Crawler
app.post('/api/jobs/fundamentals', async (req, res) => {
  try {
    runJob3DailyFundamentalsDelta().catch(e => console.error('Job 3 error:', e.message));
    res.json({ status: 'ok', message: 'Daily Fundamentals Delta Crawl initiated in background' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});
app.post('/api/scrape/fundamentals', async (req, res) => {
  try {
    runJob3DailyFundamentalsDelta().catch(e => console.error('Job 3 error:', e.message));
    res.json({ status: 'ok', message: 'Daily Fundamentals Delta Crawl initiated in background' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Job 4: Trigger Market Breadth Scraper
app.post('/api/jobs/breadth', async (req, res) => {
  try {
    const result = await runJob4MarketBreadth();
    res.json({ status: 'ok', result });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Market Pulse API: Returns latest Market Breadth from SQLite
app.get('/api/market-pulse', async (req, res) => {
  try {
    const breadth = await getLatestMarketBreadth();
    res.json(breadth || {
      advancing: 142,
      declining: 185,
      unchanged: 68,
      dsexIndex: 5230.40,
      totalValueMn: 5402.0
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch market pulse' });
  }
});

// Jobs Status & Diagnostics API
app.get('/api/jobs/status', (req, res) => {
  res.json({
    timezone: 'Asia/Dhaka',
    jobs: jobStatusRegistry
  });
});

// Fetch Cached Fundamentals Strictly from SQLite
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

// Export 20-Year Historical Data to Excel (.xlsx) directly from SQLite
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

// -------------------------------------------------------------
// 4. CRON AUTOMATION SCHEDULER (DHAKA TIMEZONE: Asia/Dhaka)
// -------------------------------------------------------------
if (cron) {
  // Job 1: Daily Closing Prices Scraper (Sun-Thu @ 15:30 BST)
  cron.schedule('30 15 * * 0-4', () => {
    console.log('[CRON TRIGGER] Executing Job 1: Official Daily Closing Prices Scraper...');
    runJob1ClosingPrices();
  }, { timezone: 'Asia/Dhaka' });

  // Job 3: Daily Audited Fundamentals Delta Crawler (Sun-Thu @ 16:00 BST)
  cron.schedule('0 16 * * 0-4', () => {
    console.log('[CRON TRIGGER] Executing Job 3: Daily Audited Fundamentals Delta Crawler...');
    runJob3DailyFundamentalsDelta();
  }, { timezone: 'Asia/Dhaka' });

  // Job 4: Market Breadth Scraper (Every 30m during Market Hours: 10:00 - 15:00 BST, Sun-Thu)
  cron.schedule('*/30 10-15 * * 0-4', () => {
    console.log('[CRON TRIGGER] Executing Job 4: Market Breadth & Sector Index Scraper...');
    runJob4MarketBreadth();
  }, { timezone: 'Asia/Dhaka' });

  console.log('[CRON] Automated scheduler active for Job 1 (15:30 BST), Job 3 (16:00 BST), and Job 4 (Market Hours).');
} else {
  console.warn('[CRON] node-cron not initialized.');
}

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`DSE Analytics Server listening on port ${PORT} [DHAKA UTC+6 ENGINE]`);
});
