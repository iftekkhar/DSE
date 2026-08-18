import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';

const SYMBOL = process.env.SYMBOL || '1JANATAMF';
const DATA_DIR = path.join(new URL('.', import.meta.url).pathname, '..', 'data');
const DEBUG_DIR = path.join(DATA_DIR, 'debug');
await fs.mkdir(DEBUG_DIR, { recursive: true });

const URL_PATTERNS = [
  (s) => `https://www.amarstock.com/Share/Details/${s}`,
  (s) => `https://www.amarstock.com/Share/${s}`,
  (s) => `https://www.amarstock.com/Quote/${s}`,
  (s) => `https://www.amarstock.com/quote/${s}`,
  (s) => `https://www.amarstock.com/Company/${s}`,
  (s) => `https://www.amarstock.com/Search?searchText=${s}`,
  (s) => `https://www.amarstock.com/?s=${s}`
];

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(30000);

  let finalHtml = null;
  let usedUrl = null;
  for (const p of URL_PATTERNS) {
    const url = p(SYMBOL);
    try {
      console.log('Trying', url);
      const resp = await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 }).catch(e => null);
      if (resp && resp.status && resp.status() === 200) {
        usedUrl = url;
        finalHtml = await page.content();
        console.log('Loaded', url, 'status', resp.status());
        break;
      }
    } catch (err) {
      console.warn('Error loading', url, String(err));
    }
  }

  if (!finalHtml) {
    // try searching from home
    try {
      console.log('Visiting amarstock home for search fallback');
      await page.goto('https://www.amarstock.com/', { waitUntil: 'networkidle2' });
      const searchBox = await page.$('input[name="s"], input[type="search"], input#search');
      if (searchBox) {
        await searchBox.click({ clickCount: 3 });
        await searchBox.type(SYMBOL, { delay: 50 });
        await page.keyboard.press('Enter');
        await page.waitForTimeout(3000);
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});
        finalHtml = await page.content();
        usedUrl = 'amarstock home search';
      } else {
        console.warn('No search box found on home');
        finalHtml = await page.content();
        usedUrl = 'amarstock home (no-search)';
      }
    } catch (e) {
      console.error('Home search fallback failed', String(e));
    }
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const htmlPath = path.join(DEBUG_DIR, `${SYMBOL}-${timestamp}.html`);
  const pngPath = path.join(DEBUG_DIR, `${SYMBOL}-${timestamp}.png`);

  if (finalHtml) {
    await fs.writeFile(htmlPath, finalHtml, 'utf8');
    await page.screenshot({ path: pngPath, fullPage: true });
    console.log('Saved HTML to', htmlPath);
    console.log('Saved screenshot to', pngPath);
    console.log('Used URL:', usedUrl);
  } else {
    console.error('Failed to capture page for', SYMBOL);
  }

  await browser.close();
})();
