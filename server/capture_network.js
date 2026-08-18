import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEBUG_DIR = path.join(__dirname, '..', 'data', 'debug');
await fs.mkdir(DEBUG_DIR, { recursive: true });

const SYMBOLS = JSON.parse(await fs.readFile(new URL('./symbols.json', import.meta.url), 'utf8'));
const firstSymbol = SYMBOLS[0] || 'BRACBANK';

const captures = [];

function sanitizeFilename(s){
  return s.replace(/[^a-z0-9-_\.]/gi, '_').slice(0,200);
}

(async ()=>{
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(60000);

  page.on('response', async (res)=>{
    try{
      const req = res.request();
      const url = res.url();
      const type = req.resourceType();
      if (type !== 'xhr' && type !== 'fetch' && !/api|quote|share|latest|search|json/i.test(url)) return;
      const ct = res.headers()['content-type'] || '';
      let body = null;
      try{
        if (ct.includes('application/json') || /application\/.*json/i.test(ct)) {
          body = await res.json();
        } else {
          body = await res.text();
        }
      } catch(e){
        try{ body = await res.text(); } catch(e2){ body = null; }
      }
      const ts = new Date().toISOString().replace(/[:.]/g,'-');
      const prefix = `${ts}_${sanitizeFilename(url)}`;
      const meta = { url, type, status: res.status(), contentType: ct, timestamp: ts };
      if (body !== null) {
        const ext = (typeof body === 'object') ? 'json' : 'txt';
        const fname = path.join(DEBUG_DIR, `${prefix}.${ext}`);
        await fs.writeFile(fname, (typeof body === 'object') ? JSON.stringify(body, null, 2) : body, 'utf8');
        meta.saved = fname;
      }
      captures.push(meta);
    }catch(e){
      // ignore
    }
  });

  const pagesToVisit = [
    'https://www.amarstock.com/latest-share-price',
    `https://www.amarstock.com/?s=${encodeURIComponent(firstSymbol)}`
  ];

  for (const u of pagesToVisit){
    try{
      console.log('Visiting', u);
      await page.goto(u, { waitUntil: 'networkidle2', timeout: 30000 }).catch(()=>{});
      // wait a bit to allow XHRs
      await new Promise(r=>setTimeout(r,3000));
      // attempt interaction: if search page, try searching for symbol in input
      if (u.includes('?s=')) {
        // already search
      } else {
        try{
          const sel = await page.$('input[name="s"], input[type="search"], input#search, input.search-field');
          if (sel) {
            await sel.click({ clickCount: 3 });
            await sel.type(firstSymbol, { delay: 30 });
            await page.keyboard.press('Enter');
            await page.waitForTimeout(3000);
          }
        }catch(e){}
      }
    }catch(e){ console.warn('visit failed', u, String(e)); }
  }

  // also try visiting a likely company URL pattern for the symbol
  const candidates = [
    `https://www.amarstock.com/Share/Details/${firstSymbol}`,
    `https://www.amarstock.com/Share/${firstSymbol}`,
    `https://www.amarstock.com/Quote/${firstSymbol}`,
    `https://www.amarstock.com/Company/${firstSymbol}`
  ];
  for (const u of candidates){
    try{
      console.log('Visiting candidate', u);
      await page.goto(u, { waitUntil: 'networkidle2', timeout: 20000 }).catch(()=>{});
      await page.waitForTimeout(2000);
    }catch(e){}
  }

  const out = { capturedAt: new Date().toISOString(), symbol: firstSymbol, captures };
  const outPath = path.join(DEBUG_DIR, `network-capture-${firstSymbol}-${new Date().toISOString().replace(/[:.]/g,'-')}.json`);
  await fs.writeFile(outPath, JSON.stringify(out, null, 2), 'utf8');
  console.log('Saved capture summary to', outPath);

  await browser.close();
})();
