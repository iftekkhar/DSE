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

async function run() {
  const latest = await findLatestDebugHtml();
  if (!latest) {
    console.error('No debug HTML files found in', DEBUG_DIR);
    process.exit(1);
  }
  console.log('Using debug file:', latest);
  const html = await fs.readFile(latest, 'utf8');
  const $ = cheerio.load(html);

  // Find candidate company links
  const anchors = [];
  $('a[href]').each((i, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    const low = href.toLowerCase();
    if (low.includes('/share/') || low.includes('/quote/') || low.includes('/company/') || low.includes('displaycompany.php') || low.includes('/companydetails') || low.includes('/share/details')) {
      anchors.push(href);
    }
  });

  // fallback: look for first link pointing to amarstock domain
  if (!anchors.length) {
    $('a[href]').each((i, el) => {
      const href = $(el).attr('href');
      if (!href) return;
      if (href.includes('amarstock.com')) anchors.push(href);
    });
  }

  if (!anchors.length) {
    console.error('No candidate company links found in debug HTML');
    process.exit(1);
  }

  // prefer full paths
  let chosen = anchors.find(h => h.startsWith('http')) || anchors[0];
  if (!chosen.startsWith('http')) {
    chosen = new URL(chosen, 'https://www.amarstock.com').toString();
  }

  console.log('Following link:', chosen);

  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.goto(chosen, { waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
  // wait briefly for any client-side rendering (compatibility across puppeteer versions)
  if (typeof page.waitForTimeout === 'function') {
    await page.waitForTimeout(1500);
  } else {
    await new Promise(r => setTimeout(r, 1500));
  }
  const finalHtml = await page.content();

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const baseName = `company-follow-${timestamp}`;
  const htmlPath = path.join(DEBUG_DIR, `${baseName}.html`);
  const pngPath = path.join(DEBUG_DIR, `${baseName}.png`);
  const jsonPath = path.join(DEBUG_DIR, `${baseName}.json`);

  await fs.writeFile(htmlPath, finalHtml, 'utf8');
  await page.screenshot({ path: pngPath, fullPage: true });
  console.log('Saved company HTML to', htmlPath);
  console.log('Saved company screenshot to', pngPath);

  // Try to extract KPIs from company page
  const $$ = cheerio.load(finalHtml);
  const bodyText = $$.text();
  const kpiCandidates = {
    pe: ['p/e', 'p/e ratio', 'pe ratio', 'pe'],
    roe: ['roe', 'return on equity'],
    eps: ['eps', 'earnings per share'],
    debtToEquity: ['debt/equity', 'debt to equity', 'debt equity'],
    currentRatio: ['current ratio'],
    volume: ['volume'],
    ltp: ['last', 'ltp', 'last price', 'price']
  };

  const extracted = { url: chosen, path: htmlPath };
  for (const [key, labels] of Object.entries(kpiCandidates)) {
    let found = null;
    // search for labels and extract nearby numeric tokens
    for (const lbl of labels) {
      const idx = bodyText.toLowerCase().indexOf(lbl.toLowerCase());
      if (idx === -1) continue;
      const slice = bodyText.slice(Math.max(0, idx - 120), idx + 120);
      const num = extractNumberFromText(slice);
      if (num !== null) { found = num; break; }
    }
    extracted[key] = found === null ? null : found;
  }

  await fs.writeFile(jsonPath, JSON.stringify(extracted, null, 2), 'utf8');
  console.log('Saved KPI debug JSON to', jsonPath);

  await browser.close();
  console.log('Done');
}

run().catch(err => { console.error(err); process.exit(1); });
