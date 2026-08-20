import axios from 'axios';
import https from 'https';
import * as cheerio from 'cheerio';

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

async function testScrape(symbol) {
  const url = `https://www.dsebd.org/displayCompany.php?name=${symbol}`;
  const res = await axios.get(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    httpsAgent,
    timeout: 15000
  });

  const $ = cheerio.load(res.data);
  $('table').each((idx, tbl) => {
    const text = $(tbl).text().replace(/\s+/g, ' ').trim();
    if (text.includes('Financial Performance') || text.includes('Audited')) {
      console.log(`--- Table ${idx} ---`);
      $(tbl).find('tr').slice(0, 10).each((_, tr) => {
        const row = [];
        $(tr).find('td, th').each((_, c) => row.push($(c).text().replace(/\s+/g, ' ').trim()));
        console.log(row);
      });
    }
  });
}

testScrape('BRACBANK');

