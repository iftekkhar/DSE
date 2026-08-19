/* eslint-disable no-unused-vars, no-empty, no-undef */
import express from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';
import https from 'https';
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

// Fetch direct live prices from official Dhaka Stock Exchange scroll feed
async function fetchDSELiveScroll() {
  try {
    const httpsAgent = new https.Agent({ rejectUnauthorized: false });
    const res = await axios.get('https://www.dsebd.org/latest_share_price_scroll_l.php', {
      httpsAgent,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      timeout: 12000
    });
    if (res.status === 200 && res.data) {
      const $ = cheerio.load(res.data);
      const map = new Map();
      $('a[href*="displayCompany.php"]').each((i, a) => {
        const href = $(a).attr('href') || '';
        const matchSym = href.match(/name=([^&]+)/);
        if (!matchSym) return;
        const sym = decodeURIComponent(matchSym[1]).trim().toUpperCase();
        const parentTd = $(a).closest('td');
        const rowText = parentTd.text().replace(/\s+/g, ' ').trim();
        const tokens = rowText.split(' ').filter(Boolean);
        if (tokens.length >= 4) {
          const ltp = parseFloat(tokens[1].replace(/,/g, ''));
          const change = parseFloat(tokens[2].replace(/,/g, ''));
          const changePercent = parseFloat(tokens[3].replace(/[%]/g, '').replace(/,/g, ''));
          if (!isNaN(ltp)) {
            map.set(sym, {
              symbol: sym,
              ltp: isNaN(ltp) ? null : ltp,
              change: isNaN(change) ? null : change,
              changePercent: isNaN(changePercent) ? null : changePercent
            });
          }
        }
      });
      console.log(`Fetched ${map.size} live stocks from DSE live feed`);
      return map;
    }
  } catch (e) {
    console.warn('Failed to fetch from DSE live scroll:', e.message);
  }
  return new Map();
}

// Fetch live share prices from AmarStock latest share price table
async function fetchAmarstockTable() {
  try {
    const res = await axios.get('https://www.amarstock.com/latest-share-price', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      timeout: 10000
    });
    if (res.status === 200 && res.data) {
      const $ = cheerio.load(res.data);
      const map = new Map();
      $('table tbody tr, table tr').each((i, el) => {
        const tds = $(el).find('td').map((_, cell) => $(cell).text().trim()).get();
        if (tds.length >= 10) {
          const sym = tds[0].toUpperCase();
          const ltp = parseFloat(tds[1].replace(/,/g, ''));
          const changePercent = parseFloat(tds[2].replace(/,/g, ''));
          const change = parseFloat(tds[7].replace(/,/g, ''));
          const volume = tds[10] ? parseFloat(tds[10].replace(/,/g, '')) : null;
          if (sym && !isNaN(ltp)) {
            map.set(sym, {
              symbol: sym,
              ltp,
              change: isNaN(change) ? null : change,
              changePercent: isNaN(changePercent) ? null : changePercent,
              volume: isNaN(volume) ? null : volume
            });
          }
        }
      });
      console.log(`Fetched ${map.size} live stocks from Amarstock table`);
      return map;
    }
  } catch (e) {
    console.warn('Failed to fetch from Amarstock table:', e.message);
  }
  return new Map();
}

async function scrapeAll({ historicalOnce = false } = {}) {
  const start = new Date().toISOString();
  const results = [];
  const missingReport = [];

  // Load the current symbols list fresh from disk
  const diskSymbols = await loadSymbols();
  const symbolSet = new Set(diskSymbols);

  // Fetch from DSE live scroll and Amarstock sources
  const [dseMap, amarMap, bulk] = await Promise.all([
    fetchDSELiveScroll(),
    fetchAmarstockTable(),
    fetchAmarstockBulk().catch(() => null)
  ]);

  const bulkMap = new Map();
  if (bulk && bulk.aa && Array.isArray(bulk.aa)) {
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
      const upper = sym.toUpperCase();
      symbolSet.add(upper);
      const rec = {
        symbol: upper,
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
      bulkMap.set(upper, rec);
    }
  }

  // Also include any symbols from dseMap and amarMap
  for (const s of dseMap.keys()) symbolSet.add(s);
  for (const s of amarMap.keys()) symbolSet.add(s);

  // Update symbols.json if we discovered additional symbols
  const allSymbols = Array.from(symbolSet).sort();
  if (allSymbols.length > diskSymbols.length) {
    try {
      await fs.writeFile(SYMBOLS_FILE, JSON.stringify(allSymbols, null, 2), 'utf8');
      console.log(`Updated symbols.json with ${allSymbols.length} symbols`);
    } catch (e) {}
  }

  for (const sym of allSymbols) {
    const upper = sym.toUpperCase();
    const dseRecord = dseMap.get(upper);
    const amarRecord = amarMap.get(upper);
    const bulkRecord = bulkMap.get(upper);

    // Merge live feeds: DSE official scroll > Amarstock table > Bulk payload
    const ltp = dseRecord?.ltp ?? amarRecord?.ltp ?? bulkRecord?.ltp ?? null;
    const change = dseRecord?.change ?? amarRecord?.change ?? (bulkRecord?.ltp != null && bulkRecord?.previousClose != null ? bulkRecord.ltp - bulkRecord.previousClose : null);
    const changePercent = dseRecord?.changePercent ?? amarRecord?.changePercent ?? bulkRecord?.changePercent ?? null;
    const volume = amarRecord?.volume ?? bulkRecord?.volume ?? null;
    const pe = bulkRecord?.pe ?? null;
    const roe = bulkRecord?.roe ?? null;
    const eps = null;
    const debtToEquity = bulkRecord?.debtToEquity ?? null;
    const currentRatio = bulkRecord?.currentRatio ?? null;
    const marketCap = bulkRecord?.marketCap ?? null;

    const record = {
      symbol: upper,
      ltp,
      change,
      changePercent,
      pe,
      roe,
      eps,
      debtToEquity,
      currentRatio,
      volume,
      marketCap
    };

    results.push(record);

    const missing = Object.keys(record).filter(k => k !== 'symbol' && (record[k] === null || record[k] === undefined));
    if (missing.length) missingReport.push({ symbol: upper, missing });
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

// Convenience endpoint for the frontend: return the array of stocks with history fallback
app.get('/api/stocks', async (req, res) => {
  try {
    if (!fs.existsSync(LATEST_FILE)) return res.json([]);
    const latestJson = await fs.readJson(LATEST_FILE).catch(() => ({ data: [] }));
    const rawList = Array.isArray(latestJson.data) ? latestJson.data : [];
    
    // Load history to pull missing fields from the latest available historical record
    let historyList = [];
    if (fs.existsSync(HISTORY_FILE)) {
      historyList = await fs.readJson(HISTORY_FILE).catch(() => []);
    }

    // Build historical lookup map: symbol -> array of historical records sorted latest first
    const histMap = new Map();
    if (Array.isArray(historyList)) {
      // historyList is array of snapshots: [{ fetchedAt, data: [...] }]
      for (let i = historyList.length - 1; i >= 0; i--) {
        const snap = historyList[i];
        if (snap && Array.isArray(snap.data)) {
          for (const s of snap.data) {
            if (!s || !s.symbol) continue;
            const sym = s.symbol.toUpperCase();
            if (!histMap.has(sym)) histMap.set(sym, []);
            histMap.get(sym).push({ fetchedAt: snap.fetchedAt, ...s });
          }
        }
      }
    }

    const dailyFields = ['ltp', 'change', 'changePercent', 'volume', 'pe'];
    const annualFields = ['eps', 'roe', 'debtToEquity', 'currentRatio'];
    const fieldsToCheck = [...dailyFields, ...annualFields];

    const enriched = rawList.map((item) => {
      const sym = (item.symbol || '').toUpperCase();
      const histRecords = histMap.get(sym) || [];
      const stock = { ...item };
      const fallbackFlags = {};

      for (const field of fieldsToCheck) {
        if (stock[field] === null || stock[field] === undefined) {
          // Find most recent valid non-null value from history
          for (const h of histRecords) {
            if (h[field] !== null && h[field] !== undefined) {
              stock[field] = h[field];
              const dt = h.fetchedAt ? new Date(h.fetchedAt) : new Date();
              const dateStr = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              const yearStr = dt.getFullYear().toString();
              
              const isDaily = dailyFields.includes(field);
              const tag = isDaily ? `History (${dateStr})` : `History (${yearStr})`;

              fallbackFlags[field] = {
                source: 'history',
                type: isDaily ? 'daily' : 'annual',
                date: dateStr,
                year: yearStr,
                tag: tag
              };
              break;
            }
          }
        }
      }

      stock._historyFallback = fallbackFlags;
      return stock;
    });

    return res.json(enriched);
  } catch (e) {
    console.error('Error serving /api/stocks', e.message);
    return res.status(500).json([]);
  }
});

// Endpoint to get historical timeline for a specific symbol
app.get('/api/history/:symbol', async (req, res) => {
  try {
    const sym = (req.params.symbol || '').toUpperCase();
    if (!fs.existsSync(HISTORY_FILE)) return res.json({ symbol: sym, history: [] });

    const historyList = await fs.readJson(HISTORY_FILE).catch(() => []);
    const points = [];

    if (Array.isArray(historyList)) {
      for (const snap of historyList) {
        if (snap && Array.isArray(snap.data)) {
          const match = snap.data.find(s => s && String(s.symbol).toUpperCase() === sym);
          if (match && match.ltp !== null && match.ltp !== undefined) {
            points.push({
              fetchedAt: snap.fetchedAt,
              ltp: match.ltp,
              change: match.change,
              changePercent: match.changePercent,
              volume: match.volume,
              pe: match.pe,
              roe: match.roe,
              eps: match.eps
            });
          }
        }
      }
    }

    return res.json({ symbol: sym, history: points });
  } catch (e) {
    console.error('Error serving /api/history/:symbol', e.message);
    return res.status(500).json({ symbol: req.params.symbol, history: [] });
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
  return res.json([]);
});

app.get('/api/report', async (req, res) => {
  if (fs.existsSync(REPORT_FILE)) return res.sendFile(REPORT_FILE);
  return res.json({ missingReport: [] });
});

// Root Healthcheck & API Status
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    service: 'DSE Live Scraper & Analytics API',
    timezone: 'Asia/Dhaka',
    schedule: 'Auto-scrape every hour from 9:00 AM to 6:00 PM BST (0 9-18 * * *)',
    endpoints: {
      stocks: 'GET /api/stocks',
      scrape: 'POST /api/scrape',
      history: 'GET /api/history/:symbol',
      report: 'GET /api/report'
    }
  });
});

// Auto-Scrape Schedule: Every hour from 9:00 AM to 6:00 PM Bangladesh Standard Time (BST / Asia/Dhaka)
if (cron) {
  cron.schedule('0 9-18 * * *', async () => {
    const nowDhaka = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Dhaka',
      dateStyle: 'medium',
      timeStyle: 'medium'
    }).format(new Date());
    console.log(`[CRON] Auto-scrape triggered at ${nowDhaka} (BST)`);
    try {
      await scrapeAll({ historicalOnce: false });
      console.log(`[CRON] Auto-scrape completed successfully at ${nowDhaka}`);
    } catch (err) {
      console.error('[CRON] Auto-scrape encountered an error:', err.message);
    }
  }, { timezone: 'Asia/Dhaka' });
  console.log('Registered cron schedule: Every hour from 9:00 AM to 6:00 PM Bangladesh Time (Asia/Dhaka)');
} else {
  console.warn('node-cron not active; starting fallback interval scheduler for 9am-6pm BST');
  setInterval(async () => {
    try {
      const now = new Date();
      const dhakaHourStr = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Dhaka', hour: 'numeric', hour12: false }).format(now);
      const dhakaHour = parseInt(dhakaHourStr, 10);
      if (now.getMinutes() === 0 && dhakaHour >= 9 && dhakaHour <= 18) {
        console.log(`[FALLBACK CRON] Auto-scrape triggered for hour ${dhakaHour}:00 BST at ${now.toISOString()}`);
        await scrapeAll({ historicalOnce: false });
      }
    } catch (err) {
      console.error('Fallback scheduler error:', err.message);
    }
  }, 1000 * 60);
}

// Initial warm-up scrape if latest.json does not exist
(async () => {
  if (!fs.existsSync(LATEST_FILE)) {
    console.log('No latest.json found on startup. Running initial warm-up scrape...');
    try {
      await scrapeAll({ historicalOnce: !fs.existsSync(HISTORY_FILE) });
    } catch (e) {
      console.warn('Initial warm-up scrape notice:', e.message);
    }
  }
})();

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`DSE Analytics Server listening on port ${PORT}`);
});
