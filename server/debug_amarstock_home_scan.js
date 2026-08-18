import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';

(async () => {
  const DEBUG_DIR = path.join(new URL('.', import.meta.url).pathname, '..', 'data', 'debug');
  await fs.mkdir(DEBUG_DIR, { recursive: true });
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  try {
    await page.goto('https://www.amarstock.com/', { waitUntil: 'networkidle2', timeout: 20000 });
    const content = await page.content();
    const timestamp = new Date().toISOString().replace(/[:.]/g,'-');
    const htmlPath = path.join(DEBUG_DIR, `amarstock-home-${timestamp}.html`);
    await fs.writeFile(htmlPath, content, 'utf8');
    // extract anchors with share/quote/company
    const anchors = await page.$$eval('a[href]', els => els.map(e => e.getAttribute('href')));
    const cand = anchors.filter(h => h && (/share|quote|company|companydetails|displaycompany/i).test(h)).slice(0,50);
    const out = { htmlPath, candidates: cand };
    const outPath = path.join(DEBUG_DIR, `amarstock-home-candidates-${timestamp}.json`);
    await fs.writeFile(outPath, JSON.stringify(out, null, 2), 'utf8');
    console.log('Saved', htmlPath, outPath);
  } catch (e) {
    console.error('Error', e);
  } finally {
    await browser.close();
  }
})();
