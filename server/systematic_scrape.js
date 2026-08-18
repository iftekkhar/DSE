import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';

const SYMBOLS = JSON.parse(await fs.readFile(new URL('./symbols.json', import.meta.url), 'utf8'));
const DATA_DIR = path.join(new URL('.', import.meta.url).pathname, '..', 'data');
await fs.mkdir(path.join(DATA_DIR, 'debug'), { recursive: true });

function extractNumberFromText(text){
  if (!text) return null;
  const cleaned = text.replace(/[\u00A0,]/g,'').match(/-?\d+(?:\.\d+)?/);
  return cleaned ? Number(cleaned[0]) : null;
}

async function scrapeSymbol(symbol, page){
  const result = { symbol, ltp: null, change: null, changePercent: null, pe: null, roe: null, eps: null, debtToEquity: null, currentRatio: null, volume: null };
  // Visit latest-share-price
  try{
    await page.goto('https://www.amarstock.com/latest-share-price', { waitUntil: 'networkidle2', timeout: 30000 }).catch(()=>{});
    await page.waitForTimeout(1000).catch(()=>{});
    const rows = await page.$$eval('tr', (trs, sym)=>{
      return trs.map(t=>({text:t.innerText, html:t.innerHTML})).filter(r=>r.text && r.text.toLowerCase().includes(sym.toLowerCase()));
    }, symbol);
    if (rows && rows.length){
      // parse first matching row
      const rowHtml = rows[0].html;
      // extract numeric tokens from row text
      const rowText = rows[0].text;
      const nums = (rowText.match(/-?\d+(?:\.\d+)?/g) || []).map(n=>Number(n.replace(/,/g,'')));
      // heuristics: first number could be LTP, followed by change, %change, volume later
      if (nums.length){ result.ltp = nums[0]; }
      if (nums.length>=2) result.change = nums[1];
      // percent may have % sign; find percent using regex
      const pctMatch = rowText.match(/(-?\d+(?:\.\d+)?)\s*%/);
      if (pctMatch) result.changePercent = Number(pctMatch[1]);
      // volume assume last large int
      if (nums.length) result.volume = Math.round(nums[nums.length-1]);
      // try to find anchor link in the row by querying page
      const link = await page.$$eval('tr', (trs, sym)=>{
        for (const t of trs){ if (t.innerText.toLowerCase().includes(sym.toLowerCase())){ const a=t.querySelector('a[href]'); if (a) return a.href; }}
        return null;
      }, symbol);
      if (link){
        // visit company page and extract ratios
        await page.goto(link, { waitUntil: 'networkidle2', timeout: 20000 }).catch(()=>{});
        await page.waitForTimeout(1000).catch(()=>{});
        const bodyText = await page.evaluate(()=>document.body.innerText);
        // heuristics for ratios
        const tryDirect = (labels)=>{
          for (const lab of labels){
            const idx = bodyText.toLowerCase().indexOf(lab.toLowerCase());
            if (idx===-1) continue;
            const slice = bodyText.slice(Math.max(0, idx-120), idx+120);
            const m = slice.match(/-?\d+(?:\.\d+)?/);
            if (m) return Number(m[0].replace(/,/g,''));
          }
          return null;
        };
        result.pe = tryDirect(['p/e','pe ratio','pe']);
        result.eps = tryDirect(['eps','earnings per share']);
        result.roe = tryDirect(['roe','return on equity']);
        result.debtToEquity = tryDirect(['debt/equity','debt to equity']);
        result.currentRatio = tryDirect(['current ratio']);
      }
    } else {
      // no row found: try site search
      const searchUrl = `https://www.amarstock.com/?s=${encodeURIComponent(symbol)}`;
      await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 20000 }).catch(()=>{});
      await page.waitForTimeout(1000).catch(()=>{});
      const bodyText = await page.evaluate(()=>document.body.innerText);
      // attempt basic extraction from search page
      const tryDirect = (labels)=>{
        for (const lab of labels){
          const idx = bodyText.toLowerCase().indexOf(lab.toLowerCase());
          if (idx===-1) continue;
          const slice = bodyText.slice(Math.max(0, idx-120), idx+120);
          const m = slice.match(/-?\d+(?:\.\d+)?/);
          if (m) return Number(m[0].replace(/,/g,''));
        }
        return null;
      };
      result.ltp = tryDirect(['ltp','last price','price']);
      result.pe = tryDirect(['p/e','pe ratio']);
      result.eps = tryDirect(['eps','earnings per share']);
      result.roe = tryDirect(['roe','return on equity']);
    }
  } catch (e){
    // ignore
  }
  return result;
}

(async ()=>{
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  const results = [];
  for (const s of SYMBOLS){
    console.log('Scraping', s);
    const r = await scrapeSymbol(s, page);
    results.push(r);
    // save per-symbol debug
    const ts = new Date().toISOString().replace(/[:.]/g,'-');
    await fs.writeFile(path.join(DATA_DIR,'debug',`${s}-${ts}.json`), JSON.stringify(r,null,2),'utf8');
    console.log('Result', r);
  }
  await browser.close();
  const outPath = path.join(DATA_DIR,'latest-systematic.json');
  await fs.writeFile(outPath, JSON.stringify({fetchedAt:new Date().toISOString(), data: results}, null, 2),'utf8');
  console.log('Saved', outPath);
})();
