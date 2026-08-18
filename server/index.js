/* eslint-env node */
/* eslint-disable no-unused-vars, no-empty, no-undef */
import express from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { decode as msgpackDecode } from '@msgpack/msgpack';
// node-cron uses modern syntax — to avoid runtime compatibility issues, use a light-weight setInterval fallback scheduler if node-cron throws.
let cron;
try {
  cron = await import('node-cron');
  cron = cron.default;
} catch (e) {
  cron = null;
}
import cors from 'cors';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const DATA_DIR = path.join(__dirname, '..', 'data');
fs.ensureDirSync(DATA_DIR);
const LATEST_FILE = path.join(DATA_DIR, 'latest.json');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');
const REPORT_FILE = path.join(DATA_DIR, 'missing_report.json');

const SYMBOLS_FILE = path.join(__dirname, 'symbols.json');
// Do not cache symbols at startup — load them fresh prior to each scrape so updates to symbols.json take effect without restart.
const defaultSymbols = ['1JANATAMF','BATBC','BRACBANK','SINGERBD'];

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
  return defaultSymbols;
}

// Refresh symbols from AmarStock bulk endpoint or local debug JSON and overwrite server/symbols.json
async function refreshSymbolsFromBulk() {
  try {
    const bulk = await fetchAmarstockBulk().catch(() => null);
    if (bulk && Array.isArray(bulk.aa)) {
      const syms = bulk.aa.map(s => String(s).toUpperCase()).filter(Boolean);
      const uniq = Array.from(new Set(syms)).sort();
      await fs.writeFile(SYMBOLS_FILE, JSON.stringify(uniq, null, 2), 'utf8');
      console.log('Refreshed symbols.json with', uniq.length, 'symbols');
      return uniq;
    }
  } catch (e) {
    console.warn('Failed to refresh symbols from bulk', e.message);
  }
  return null;
}

// Helper: try possible URL patterns on AmarStock for a given symbol
const URL_PATTERNS = [
  (s) => `https://www.amarstock.com/Share/Details/${s}`,
  (s) => `https://www.amarstock.com/Share/${s}`,
  (s) => `https://www.amarstock.com/Quote/${s}`,
  (s) => `https://www.amarstock.com/quote/${s}`,
  (s) => `https://www.amarstock.com/Company/${s}`,
  (s) => `https://www.amarstock.com/Search?searchText=${s}`
];

// KPI keys to extract and human labels
const KPI_KEYS = {
  ltp: ['Last', 'LTP', 'Last Price', 'Price', 'Current Price'],
  change: ['Change', 'Chg'],
  changePercent: ['%'],
  pe: ['P/E', 'PE', 'P/E Ratio'],
  roe: ['ROE', 'Return on Equity'],
  eps: ['EPS', 'Earnings Per Share'],
  debtToEquity: ['Debt/Equity', 'Debt to Equity'],
  currentRatio: ['Current Ratio'],
  volume: ['Volume']
};

async function tryFetchUrl(url) {
  try {
    const res = await axios.get(url, { timeout: 15000, headers: { 'User-Agent': 'node/axios' } });
    if (res.status === 200 && res.data) return res.data;
  } catch (err) {
    return null;
  }
  return null;
}

function extractNumberFromText(text) {
  if (!text) return null;
  // remove commas and non-numeric trailing characters
  const cleaned = text.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
  return cleaned ? Number(cleaned[0]) : null;
}

function findLabelNearby($, labelRegex) {
  // find elements containing the label text then look for nearby numeric values
  const matches = [];
  $('*').each((i, el) => {
    const txt = $(el).text();
    if (labelRegex.test(txt)) {
      matches.push(el);
    }
  });
  for (const el of matches) {
    // try siblings and children
    const $el = $(el);
    const next = $el.next();
    if (next && next.text()) {
      const n = extractNumberFromText(next.text());
      if (n !== null) return n;
    }
    const parent = $el.parent();
    if (parent && parent.text()) {
      const n = extractNumberFromText(parent.text());
      if (n !== null) return n;
    }
    // check descendants
    const descText = $el.find('*').text();
    const nd = extractNumberFromText(descText);
    if (nd !== null) return nd;
  }
  return null;
}

// Try fetching AmarStock's compact JSON endpoint (discovered in debug captures).
// This payload contains parallel arrays (aa = symbols, ea = ltp, ad = volume, an = pct change, ba = pe, bb = roe, bc = debt/equity, ei = currentRatio, ar/aq = market caps, aj = previous/close)
async function fetchAmarstockBulk() {
  // Try known JSON candidates first
  const jsonCandidates = [
    'https://www.amarstock.com/823af3f1ebdd.json',
    'https://www.amarstock.com/stockdata.json',
    'https://www.amarstock.com/data/stock.json',
    'https://www.amarstock.com/pe-data-chart.json'
  ];
  for (const url of jsonCandidates) {
    try {
      const res = await axios.get(url, { timeout: 10000, headers: { 'User-Agent': 'node/axios' } });
      if (res && res.status === 200 && res.data && typeof res.data === 'object' && res.data.aa) {
        console.log('Using JSON bulk from', url);
        return res.data;
      }
    } catch (e) {
      // ignore
    }
  }

  // Try MessagePack endpoints read from server/msgpack_endpoints.json (persisted from probe) first
  try {
    const endpointsFile = path.join(__dirname, 'msgpack_endpoints.json');
    if (fs.existsSync(endpointsFile)) {
      const list = JSON.parse(await fs.readFile(endpointsFile, 'utf8'));
      if (Array.isArray(list) && list.length) {
        for (const url of list) {
          try {
            const res = await axios.get(url, { timeout: 10000, responseType: 'arraybuffer', headers: { 'User-Agent': 'node/axios' } });
            if (res && res.status === 200 && res.data && res.data.byteLength) {
              try {
                const decoded = msgpackDecode(new Uint8Array(res.data));
                // decoded may be array of objects or object with arrays — normalize to shape with aa when possible
                if (decoded) {
                  console.log('Using MessagePack bulk from persisted endpoint', url);
                  return decoded;
                }
              } catch (de) {
                // decode failed, continue
              }
            }
          } catch (e) {
            // ignore per-endpoint errors
          }
        }
      }
    }
  } catch (e) {
    // ignore
  }

  // Try known MessagePack endpoints (binary). Decode if possible.
  const msgpackCandidates = [
    'https://www.amarstock.com/info/Stocks',
    'https://www.amarstock.com/Info/Stocks',
    'https://www.amarstock.com/api/info/stocks',
    'https://www.amarstock.com/data/info/stocks'
  ];
  for (const url of msgpackCandidates) {
    try {
      const res = await axios.get(url, { timeout: 10000, responseType: 'arraybuffer', headers: { 'User-Agent': 'node/axios' } });
      if (res && res.status === 200 && res.data && res.data.byteLength) {
        try {
          const decoded = msgpackDecode(new Uint8Array(res.data));
          if (decoded) {
            console.log('Using MessagePack bulk from', url);
            return decoded;
          }
        } catch (de) {
          // decode failed, continue
        }
      }
    } catch (e) {
      // ignore
    }
  }

  // fallback: check local debug files directory for a matching JSON
  try {
    const debugDir = path.join(DATA_DIR, 'debug');
    if (fs.existsSync(debugDir)) {
      const files = await fs.readdir(debugDir);
      const jsonFiles = files.filter(f => f.toLowerCase().endsWith('.json'));
      for (const f of jsonFiles) {
        const p = path.join(debugDir, f);
        try {
          const txt = await fs.readFile(p, 'utf8');
          const obj = JSON.parse(txt);
          if (obj && obj.aa) {
            console.log('Using local debug JSON', f);
            return obj;
          }
        } catch (e) {}
      }
    }
  } catch (e) {}
  return null;
}

async function scrapeWithPuppeteer(symbol) {
  try {
    const puppeteer = await import('puppeteer');
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();

    // First try the latest-share-price listing (contains LTP, change, % and volume)
    try {
      await page.goto('https://www.amarstock.com/latest-share-price', { waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {});
      await page.waitForTimeout(1000).catch(() => {});
      const listHtml = await page.content();
      const { load } = cheerio;
      const $ = load(listHtml);

      // Search table rows for the symbol
      let foundRow = null;
      $('tr').each((i, el) => {
        const rowText = $(el).text() || '';
        if (rowText.toLowerCase().includes(symbol.toLowerCase())) {
          foundRow = $(el);
        }
      });

      if (foundRow) {
        const cells = foundRow.find('td').toArray().map(x => $(x).text().trim());
        // heuristic mapping: many listings use columns like [# , Symbol, LTP, Change, %Change, Volume]
        // try to extract numeric tokens from cells
        const numericCells = cells.map(c => extractNumberFromText(c));
        const result = { symbol, ltp: null, change: null, changePercent: null, pe: null, roe: null, eps: null, debtToEquity: null, currentRatio: null, volume: null };
        // try common positions
        if (numericCells.length) {
          // find first positive number as LTP candidate
          for (const n of numericCells) {
            if (n !== null) { result.ltp = n; break; }
          }
          if (numericCells.length >= 4) {
            result.change = numericCells[2] !== undefined ? numericCells[2] : result.change;
            result.changePercent = numericCells[3] !== undefined ? numericCells[3] : result.changePercent;
            result.volume = numericCells[numericCells.length-1] !== undefined ? Math.round(numericCells[numericCells.length-1]) : result.volume;
          }
        }
        // If we got some listing fields, try to follow symbol link in that row to company detail
        const link = foundRow.find('a[href]').first().attr('href');
        if (link) {
          const companyUrl = link.startsWith('http') ? link : new URL(link, 'https://www.amarstock.com').toString();
          try {
            await page.goto(companyUrl, { waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {});
            await page.waitForTimeout(1000).catch(() => {});
            const compHtml = await page.content();
            const $$ = load(compHtml);
            // try JSON-LD
            const ld = $$('script[type="application/ld+json"]').text();
            if (ld) {
              try {
                const obj = JSON.parse(ld);
                if (obj && obj.price && !result.ltp) result.ltp = Number(obj.price);
                if (obj && obj.offers && obj.offers.price && !result.ltp) result.ltp = Number(obj.offers.price);
              } catch (e) {}
            }
            // try label scans on company page
            for (const key of Object.keys(KPI_KEYS)) {
              if (result[key] !== null) continue;
              const labels = KPI_KEYS[key];
              for (const lbl of labels) {
                const re = new RegExp(lbl.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&'), 'i');
                const val = findLabelNearby($$, re);
                if (val !== null) { result[key] = val; break; }
              }
            }
            // try CSS fallbacks
            const cssFallbacks = {
              pe: ['.pe', '.pe-ratio'],
              eps: ['.eps'],
              roe: ['.roe'],
              debtToEquity: ['.debt-equity', '.debt-to-equity'],
              currentRatio: ['.current-ratio']
            };
            for (const [k, sels] of Object.entries(cssFallbacks)) {
              if (result[k] !== null) continue;
              for (const s of sels) {
                const el = $$(s).first();
                if (el && el.text()) {
                  const n = extractNumberFromText(el.text());
                  if (n !== null) { result[k] = n; break; }
                }
              }
            }

            // save debug snapshot for company page
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const debugName = `${symbol}-company-${timestamp}.html`;
            const debugPath = path.join(DATA_DIR, 'debug', debugName);
            try { await fs.writeFile(debugPath, compHtml, 'utf8'); } catch (e) {}
          } catch (e) {
            // ignore company page errors
          }
        }

        await browser.close();
        return result;
      }
    } catch (e) {
      // continue to other methods below
    }

    // If listing approach failed, fallback to search flow and candidate scanning
    try {
      await page.goto('https://www.amarstock.com/', { waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {});
      const searchSelectors = ['input[name="s"]', 'input[type="search"]', 'input#search', 'input.search-field', 'input[name="q"]'];
      let searchFound = null;
      for (const sel of searchSelectors) {
        try { const el = await page.$(sel); if (el) { searchFound = sel; break; } } catch (e) {}
      }
      if (searchFound) {
        try {
          await page.focus(searchFound);
          await page.click(searchFound, { clickCount: 3 });
          await page.keyboard.type(symbol, { delay: 30 });
          await page.keyboard.press('Enter');
          await page.waitForTimeout(1500);
          await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});
        } catch (e) {}
      } else {
        await page.goto(`https://www.amarstock.com/?s=${encodeURIComponent(symbol)}`, { waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});
      }

      const content = await page.content();
      const { load } = cheerio;
      const $ = load(content);
      const candidates = [];
      $('a[href]').each((i, el) => {
        const href = $(el).attr('href') || '';
        const low = href.toLowerCase();
        if (low.includes('amarstock.com') && (low.includes('/share/') || low.includes('/quote/') || low.includes('/company/') || low.includes('/share/details') || low.includes('/companydetails') || low.includes('/displaycompany'))) {
          candidates.push(href);
        }
        if (low.startsWith('/share') || low.startsWith('/quote') || low.startsWith('/company')) {
          try { candidates.push(new URL(href, 'https://www.amarstock.com').toString()); } catch (e) {}
        }
      });

      const uniqueCandidates = Array.from(new Set(candidates)).filter(Boolean);
      for (const url of uniqueCandidates) {
        try {
          await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {});
          await page.waitForTimeout(1000).catch(() => {});
          const pageHtml = await page.content();
          const $$ = load(pageHtml);
          const result = { symbol, ltp: null, change: null, changePercent: null, pe: null, roe: null, eps: null, debtToEquity: null, currentRatio: null, volume: null };
          // try label scans
          for (const key of Object.keys(KPI_KEYS)) {
            const labels = KPI_KEYS[key];
            for (const lbl of labels) {
              const re = new RegExp(lbl.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&'), 'i');
              const val = findLabelNearby($$, re);
              if (val !== null) { result[key] = val; break; }
            }
          }
          // body fallback
          const bodyText = $$('body').text();
          const tryDirect = (labelCandidates) => {
            for (const lab of labelCandidates) {
              const idx = bodyText.toLowerCase().indexOf(lab.toLowerCase());
              if (idx === -1) continue;
              const slice = bodyText.slice(Math.max(0, idx - 120), idx + 120);
              const num = extractNumberFromText(slice);
              if (num !== null) return num;
            }
            return null;
          };
          for (const key of Object.keys(KPI_KEYS)) {
            if (result[key] !== null) continue;
            const labels = KPI_KEYS[key];
            const v = tryDirect(labels);
            if (v !== null) result[key] = v;
          }
          if (Object.keys(result).some(k => k !== 'symbol' && result[k] !== null)) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const debugName = `${symbol}-company-${timestamp}.html`;
            const debugPath = path.join(DATA_DIR, 'debug', debugName);
            try { await fs.writeFile(debugPath, pageHtml, 'utf8'); } catch (e) {}
            await browser.close();
            return result;
          }
        } catch (e) {
          continue;
        }
      }
    } catch (e) {
      // ignore
    }

    await browser.close();
    return { symbol, ltp: null, change: null, changePercent: null, pe: null, roe: null, eps: null, debtToEquity: null, currentRatio: null, volume: null };
  } catch (err) {
    return null;
  }
}

async function scrapeSymbol(symbol) {
  // Prefer Puppeteer-based scrape (better for JS heavy pages)
  const withP = await scrapeWithPuppeteer(symbol).catch(() => null);
  if (withP && Object.keys(withP).some(k => k !== 'symbol' && withP[k] !== null)) return withP;

  // Fallback to existing cheerio approach
  // Try patterns until we get an HTML page
  let html = null;
  for (const p of URL_PATTERNS) {
    const url = p(symbol);
    html = await tryFetchUrl(url);
    if (html) break;
  }
  // Fallback: try search landing page
  if (!html) return null;

  // cheerio: use load from package if available
  const { load } = cheerio;
  const $ = load(html);
  const result = { symbol };

  // Try common selectors first
  const text = $('body').text();

  // For each KPI try to find value
  for (const key of Object.keys(KPI_KEYS)) {
    const labels = KPI_KEYS[key];
    let found = null;
    for (const lbl of labels) {
      const re = new RegExp(lbl.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&'), 'i');
      const val = findLabelNearby($, re);
      if (val !== null) { found = val; break; }
    }
    // store number or null
    result[key] = found !== null ? found : null;
  }

  // Also attempt to parse specific meta tags or JSON-LD if present
  const ld = $('script[type="application/ld+json"]').text();
  if (ld) {
    try {
      const obj = JSON.parse(ld);
      if (!result.ltp && obj && obj.price) result.ltp = Number(obj.price);
    } catch (e) {}
  }

  return result;
}

async function scrapeAll({ historicalOnce = false } = {}) {
  const start = new Date().toISOString();
  const results = [];
  const missingReport = [];

  // Load the current symbols list fresh from disk
  const symbols = await loadSymbols();

  // Try bulk endpoint first — faster and authoritative when available
  const bulk = await fetchAmarstockBulk().catch(() => null);
  const bulkMap = new Map();
  if (bulk && bulk.aa && Array.isArray(bulk.aa)) {
    // map arrays into records
    const getArr = (k) => (bulk[k] && Array.isArray(bulk[k]) ? bulk[k] : []);
    const aa = getArr('aa');
    const ea = getArr('ea'); // ltp
    const ad = getArr('ad'); // volume
    const an = getArr('an'); // pct change
    const aj = getArr('aj'); // previous/close
    const ba = getArr('ba'); // pe
    const bb = getArr('bb'); // roe
    const bc = getArr('bc'); // debt/equity
    const ei = getArr('ei'); // current ratio (best-effort)
    const ar = getArr('ar'); // market cap (raw)
    for (let i = 0; i < aa.length; i++) {
      const sym = aa[i];
      if (!sym) continue;
      const rec = {
        symbol: sym,
        ltp: typeof ea[i] === 'number' ? ea[i] : (ea[i] ? Number(ea[i]) : null),
        previousClose: typeof aj[i] === 'number' ? aj[i] : (aj[i] ? Number(aj[i]) : null),
        volume: typeof ad[i] === 'number' ? Math.round(ad[i]) : (ad[i] ? Math.round(Number(ad[i])) : null),
        changePercent: typeof an[i] === 'number' ? an[i] : (an[i] ? Number(an[i]) : null),
        pe: typeof ba[i] === 'number' ? ba[i] : (ba[i] ? Number(ba[i]) : null),
        roe: typeof bb[i] === 'number' ? bb[i] : (bb[i] ? Number(bb[i]) : null),
        debtToEquity: typeof bc[i] === 'number' ? bc[i] : (bc[i] ? Number(bc[i]) : null),
        currentRatio: typeof ei[i] === 'number' ? ei[i] : (ei[i] ? Number(ei[i]) : null),
        marketCap: typeof ar[i] === 'number' ? ar[i] : (ar[i] ? Number(ar[i]) : null)
      };
      bulkMap.set(sym.toUpperCase(), rec);
    }
  }

  for (const sym of symbols) {
    const upper = sym.toUpperCase();
    let record = null;
    if (bulkMap.has(upper)) {
      // map bulk record to our standard KPI set (keep nulls where missing)
      const b = bulkMap.get(upper);
      record = {
        symbol: b.symbol,
        ltp: b.ltp ?? null,
        change: (b.ltp != null && b.previousClose != null) ? (b.ltp - b.previousClose) : null,
        changePercent: b.changePercent ?? null,
        pe: b.pe ?? null,
        roe: b.roe ?? null,
        eps: null,
        debtToEquity: b.debtToEquity ?? null,
        currentRatio: b.currentRatio ?? null,
        volume: b.volume ?? null,
        marketCap: b.marketCap ?? null
      };
    } else {
      // fallback to per-symbol scrape
      const data = await scrapeSymbol(sym);
      record = data || { symbol: sym, ltp: null, change: null, changePercent: null, pe: null, roe: null, eps: null, debtToEquity: null, currentRatio: null, volume: null };
    }
    results.push(record);

    const missing = Object.keys(record).filter(k => k !== 'symbol' && (record[k] === null || record[k] === undefined));
    if (missing.length) missingReport.push({ symbol: sym, missing });
  }

  // write latest
  await fs.writeJson(LATEST_FILE, { fetchedAt: start, data: results }, { spaces: 2 });

  // write/append history
  if (!fs.existsSync(HISTORY_FILE) || historicalOnce) {
    await fs.writeJson(HISTORY_FILE, [{ fetchedAt: start, data: results }], { spaces: 2 });
  } else {
    const hist = await fs.readJson(HISTORY_FILE).catch(() => []);
    hist.push({ fetchedAt: start, data: results });
    await fs.writeJson(HISTORY_FILE, hist, { spaces: 2 });
  }

  // missing report
  await fs.writeJson(REPORT_FILE, { fetchedAt: start, missingReport }, { spaces: 2 });

  return { fetchedAt: start, count: results.length, missing: missingReport.length };
}

let isRunning = false;
app.post('/api/scrape', async (req, res) => {
  if (isRunning) return res.status(409).json({ status: 'running' });
  try {
    isRunning = true;
    // Optional: allow caller to request symbols refresh before scraping
    const body = req.body || {};
    if (body.refreshSymbols) {
      await refreshSymbolsFromBulk().catch(() => null);
    }
    const r = await scrapeAll({ historicalOnce: !fs.existsSync(HISTORY_FILE) });
    isRunning = false;
    return res.json({ status: 'ok', result: r });
  } catch (err) {
    isRunning = false;
    return res.status(500).json({ status: 'error', error: String(err) });
  }
});

app.get('/api/latest', async (req, res) => {
  if (fs.existsSync(LATEST_FILE)) return res.sendFile(LATEST_FILE);
  return res.json({ data: [] });
});

// Convenience endpoint for the frontend: return the array of stocks directly
app.get('/api/stocks', async (req, res) => {
  try {
    if (!fs.existsSync(LATEST_FILE)) return res.json([]);
    const j = await fs.readJson(LATEST_FILE);
    if (j && Array.isArray(j.data)) return res.json(j.data);
    if (j && j.data && Array.isArray(j.data)) return res.json(j.data);
    return res.json([]);
  } catch (e) {
    console.error('Error serving /api/stocks', e.message);
    return res.status(500).json([]);
  }
});

// Endpoint to refresh symbols.json from AmarStock bulk payload
app.post('/api/refresh-symbols', async (req, res) => {
  try {
    const newSymbols = await refreshSymbolsFromBulk();
    if (newSymbols) return res.json({ status: 'ok', count: newSymbols.length });
    return res.status(500).json({ status: 'error', error: 'Could not refresh symbols' });
  } catch (e) {
    return res.status(500).json({ status: 'error', error: String(e) });
  }
});

app.get('/api/history', async (req, res) => {
  if (fs.existsSync(HISTORY_FILE)) return res.sendFile(HISTORY_FILE);
  return res.json({ data: [] });
});

app.get('/api/report', async (req, res) => {
  if (fs.existsSync(REPORT_FILE)) return res.sendFile(REPORT_FILE);
  return res.json({ missing: [] });
});

// Schedule scrapes
// 1) Daily at 18:00 Asia/Dhaka (kept for backward compatibility)
// 2) Hourly full scrape to keep data fresh
if (cron) {
  // Daily 18:00
  cron.schedule('0 18 * * *', async () => {
    console.log('Scheduled daily scrape starting at', new Date().toISOString());
    try {
      await scrapeAll({ historicalOnce: !fs.existsSync(HISTORY_FILE) });
      console.log('Scheduled daily scrape finished');
    } catch (err) {
      console.error('Scheduled daily scrape failed', err);
    }
  }, { timezone: 'Asia/Dhaka' });

  // Hourly at top of hour
  cron.schedule('0 * * * *', async () => {
    console.log('Scheduled hourly scrape starting at', new Date().toISOString());
    try {
      await scrapeAll({ historicalOnce: false });
      console.log('Scheduled hourly scrape finished');
    } catch (err) {
      console.error('Scheduled hourly scrape failed', err);
    }
  }, { timezone: 'Asia/Dhaka' });
} else {
  console.warn('node-cron not available; using fallback hourly checker for scrapes');
  // Hourly checker: run scrape at the top of every hour
  setInterval(async () => {
    try {
      const now = new Date();
      if (now.getMinutes() === 0) {
        console.log('Fallback hourly scrape starting at', new Date().toISOString());
        await scrapeAll({ historicalOnce: false });
        console.log('Fallback hourly scrape finished');
      }
    } catch (err) {
      console.error('Fallback scheduled scraper error', err);
    }
  }, 1000 * 60);
}

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Scraper server listening on port ${PORT}`);
});
