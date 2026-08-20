import axios from 'axios';
import https from 'https';
import * as cheerio from 'cheerio';
import { dbAll, saveFundamentalsDelta } from '../db.js';

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

/**
 * Dedicated Audited EPS & Financial Statements Parser for DSE
 * Crawls official company disclosure page and extracts verified audited financials.
 */
export async function scrapeCompanyAuditedFinancials(symbol) {
  const cleanSym = String(symbol || '').toUpperCase().trim();
  if (!cleanSym) return null;

  const url = `https://www.dsebd.org/displayCompany.php?name=${encodeURIComponent(cleanSym)}`;
  
  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      httpsAgent,
      timeout: 20000
    });

    if (!res.data || res.status !== 200) return null;

    const $ = cheerio.load(res.data);
    const data = {
      symbol: cleanSym,
      name: '',
      sector: '',
      category: 'A',
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

    // 1. Extract Sector, Category, Authorized & Paid-Up Capital
    $('table tr').each((_, tr) => {
      const cols = [];
      $(tr).find('td, th').each((_, el) => {
        cols.push($(el).text().replace(/\s+/g, ' ').trim());
      });

      for (let i = 0; i < cols.length; i++) {
        const col = cols[i];
        if (col.includes('Authorized Capital (mn)') && cols[i + 1]) {
          const num = parseFloat(cols[i + 1].replace(/,/g, ''));
          if (!isNaN(num) && num > 0) data.authorizedCapitalMn = num;
        }
        if (col.includes('Paid-up Capital (mn)') && cols[i + 1]) {
          const num = parseFloat(cols[i + 1].replace(/,/g, ''));
          if (!isNaN(num) && num > 0) data.paidUpCapitalMn = num;
        }
        if (col.includes('Sector') && cols[i + 1]) {
          data.sector = cols[i + 1];
        }
        if (col.includes('Category') && cols[i + 1]) {
          data.category = cols[i + 1].toUpperCase();
        }
      }
    });

    // 2. Identify Table 1: Financial Performance (EPS, NAVPS) & Table 2: Valuation (Dividend Yield, P/E)
    let latestYear = 0;
    let latestEps = null;
    let latestNav = null;
    let latestDivYield = null;
    let latestPe = null;

    $('table').each((_, tbl) => {
      const tblText = $(tbl).text();
      const isPerfTable = tblText.includes('Financial Performance') || (tblText.includes('NAV Per Share') && tblText.includes('Earnings per share'));
      const isValTable = tblText.includes('Dividend Yield in %') || tblText.includes('Price Earnings (P/E) ratio');

      if (isPerfTable) {
        $(tbl).find('tr').each((_, tr) => {
          const cols = [];
          $(tr).find('td, th').each((_, c) => cols.push($(c).text().replace(/\s+/g, ' ').trim()));

          if (cols.length >= 4 && cols[0].match(/^(19|20)\d{2}$/)) {
            const yr = parseInt(cols[0], 10);
            // Collect numbers from row
            const nums = cols.slice(1).map(c => {
              const cleaned = c.replace(/,/g, '');
              const val = parseFloat(cleaned);
              return isNaN(val) ? null : val;
            }).filter(n => n !== null);

            if (yr >= latestYear && nums.length >= 2) {
              latestYear = yr;
              // On DSE table: first number is EPS, second is NAVPS
              latestEps = nums[0];
              latestNav = nums[1];
            }
          }
        });
      }

      if (isValTable) {
        $(tbl).find('tr').each((_, tr) => {
          const cols = [];
          $(tr).find('td, th').each((_, c) => cols.push($(c).text().replace(/\s+/g, ' ').trim()));

          if (cols.length >= 4 && cols[0].match(/^(19|20)\d{2}$/)) {
            const yr = parseInt(cols[0], 10);
            if (yr === latestYear) {
              const nums = cols.slice(1).map(c => {
                const cleaned = c.replace(/,/g, '');
                const val = parseFloat(cleaned);
                return isNaN(val) ? null : val;
              }).filter(n => n !== null);

              // In valuation table: first is P/E, last is Dividend Yield
              if (nums.length >= 1 && latestPe === null) latestPe = nums[0];
              if (nums.length >= 2 && latestDivYield === null) latestDivYield = nums[nums.length - 1];
            }
          }
        });
      }
    });

    if (latestYear > 0 && latestEps !== null) {
      data.auditedPeriod = `FY${latestYear} Audited`;
      data.quarterlyDisclosure = `FY${latestYear} Audited`;
      data.epsBasic = latestEps;
      if (latestNav !== null) data.navPerShare = latestNav;
      if (latestDivYield !== null) data.dividendYield = latestDivYield;
      if (latestPe !== null) data.peTrailing = latestPe;
    }

    return data;
  } catch (err) {
    return null;
  }
}

/**
 * Runs the Weekly Master Audited EPS Scraper over all listed symbols.
 * Performs smart delta checks - only writes to SQLite when a value has genuinely changed.
 */
export async function runAuditedEPSWeeklyScraper(concurrency = 4) {
  const startTime = Date.now();
  console.log('\n======================================================');
  console.log('  🔍 Starting Weekly Audited EPS & Fundamentals Crawler');
  console.log('======================================================');

  const rows = await dbAll(`SELECT symbol FROM company_fundamentals ORDER BY symbol ASC`);
  const symbols = rows.map(r => r.symbol);

  console.log(`[AUDITED SCRAPER] Target pool: ${symbols.length} listed equities in SQLite DB`);

  let updatedCount = 0;
  let unchangedCount = 0;
  let failedCount = 0;
  const updatedSymbols = [];

  // Batch execution with concurrency control
  for (let i = 0; i < symbols.length; i += concurrency) {
    const batch = symbols.slice(i, i + concurrency);
    
    await Promise.all(batch.map(async (sym) => {
      try {
        const scraped = await scrapeCompanyAuditedFinancials(sym);
        if (!scraped || scraped.epsBasic === null) {
          unchangedCount++;
          return;
        }

        const delta = await saveFundamentalsDelta(scraped);
        if (delta && delta.changed) {
          updatedCount++;
          updatedSymbols.push(sym);
          console.log(`[AUDITED SCRAPER] ✅ Updated ${sym}: EPS = ৳${scraped.epsBasic}, NAVPS = ৳${scraped.navPerShare} (${scraped.auditedPeriod || 'Audited'})`);
        } else {
          unchangedCount++;
        }
      } catch (err) {
        failedCount++;
      }
    }));

    // Polite delay between batches to respect DSE servers
    await new Promise(r => setTimeout(r, 350));
  }

  const durationSeconds = Number(((Date.now() - startTime) / 1000).toFixed(2));
  console.log('======================================================');
  console.log(`[AUDITED SCRAPER] Completed in ${durationSeconds}s`);
  console.log(`[AUDITED SCRAPER] Checked: ${symbols.length} | Updated: ${updatedCount} | Unchanged: ${unchangedCount} | Errors: ${failedCount}`);
  console.log('======================================================\n');

  return {
    success: true,
    totalChecked: symbols.length,
    updated: updatedCount,
    unchanged: unchangedCount,
    failed: failedCount,
    durationSeconds,
    updatedSymbols
  };
}
