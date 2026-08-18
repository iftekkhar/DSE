import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEBUG_DIR = path.join(__dirname, '..', 'data', 'debug');

function extractNumberFromText(text) {
  if (!text) return null;
  const cleaned = text.replace(/[,\u00A0]/g, '').match(/-?\d+(?:\.\d+)?/);
  return cleaned ? Number(cleaned[0]) : null;
}

async function findLatestDebugHtml() {
  const files = await fs.readdir(DEBUG_DIR).catch(() => []);
  const htmlFiles = files.filter(f => f.endsWith('.html'));
  if (!htmlFiles.length) return null;
  const stats = await Promise.all(htmlFiles.map(async f => ({ f, s: await fs.stat(path.join(DEBUG_DIR, f)) })));
  stats.sort((a,b) => b.s.mtimeMs - a.s.mtimeMs);
  return path.join(DEBUG_DIR, stats[0].f);
}

function candidateHref(href) {
  if (!href) return false;
  const low = href.toLowerCase();
  if (low.includes('amarstock.com') && (low.includes('/share') || low.includes('/quote') || low.includes('/company') || low.includes('displaycompany') || low.includes('companydetails'))) return true;
  if (low.startsWith('/share') || low.startsWith('/quote') || low.startsWith('/company') || low.startsWith('/share/details')) return true;
  return false;
}

async function run() {
  const latest = await findLatestDebugHtml();
  if (!latest) {
    console.error('No debug HTML files found in', DEBUG_DIR);
    process.exit(1);
  }
  console.log('Using debug file:', latest);
  const html = await fs.readFile(latest, 'utf8');
  const $ = cheerio.load(html);

  const anchors = [];
  $('a[href]').each((i, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    if (candidateHref(href)) anchors.push(href);
  });

  // normalize and dedupe
  const urls = Array.from(new Set(anchors.map(h => {
    if (h.startsWith('http')) return h;
    try { return new URL(h, 'https://www.amarstock.com').toString(); } catch (e) { return h; }
  })));

  console.log('Found candidate URLs:', urls.slice(0,10));

  if (!urls.length) {
    console.error('No amarstock candidate links found in debug HTML');
    process.exit(1);
  }

  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();

  const kpis = {};
  for (const u of urls) {
    console.log('Visiting', u);
    try {
      const resp = await page.goto(u, { waitUntil: 'networkidle2', timeout: 20000 }).catch(() => null);
      if (!resp) continue;
      const st = resp.status();
      console.log('Status', st);
      const content = await page.content();
      const $$ = cheerio.load(content);
      const bodyText = $$.text();
      // quick heuristic: look for 'P/E' or 'PE' label near a number
      const labels = { pe: ['p/e', 'pe ratio', 'pe'], roe: ['roe', 'return on equity'], eps: ['eps', 'earnings per share'], debtToEquity: ['debt/equity', 'debt to equity'], currentRatio: ['current ratio'], volume: ['volume', 'traded volume'], ltp: ['ltp', 'last price', 'last'] };
      const found = {};
      for (const [key, labs] of Object.entries(labels)) {
        let val = null;
        for (const lab of labs) {
          const idx = bodyText.toLowerCase().indexOf(lab.toLowerCase());
          if (idx === -1) continue;
          const slice = bodyText.slice(Math.max(0, idx-120), idx+120);
          const num = extractNumberFromText(slice);
          if (num !== null) { val = num; break; }
        }
        found[key] = val;
      }
      // if we got any KPIs, save and break
      const any = Object.values(found).some(v => v !== null);
      if (any) {
        kpis[u] = found;
        console.log('Extracted KPIs from', u, found);
        // stop after first successful company-like page
        break;
      }
    } catch (err) {
      console.warn('Error visiting', u, String(err));
    }
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outPath = path.join(DEBUG_DIR, `company-candidates-${timestamp}.json`);
  await fs.writeFile(outPath, JSON.stringify({ source: latest, candidates: urls.slice(0,20), kpis }, null, 2), 'utf8');
  console.log('Saved candidate report to', outPath);
  await browser.close();
}

run().catch(err => { console.error(err); process.exit(1); });
