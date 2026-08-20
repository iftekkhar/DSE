import axios from 'axios';
import https from 'https';
import * as cheerio from 'cheerio';

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

async function inspect(symbol) {
  const url = `https://www.dsebd.org/displayCompany.php?name=${symbol}`;
  const res = await axios.get(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    httpsAgent,
    timeout: 15000
  });

  const $ = cheerio.load(res.data);
  $('table').each((i, tbl) => {
    const rows = [];
    $(tbl).find('tr').each((_, tr) => {
      const row = [];
      $(tr).find('td, th').each((_, c) => row.push($(c).text().replace(/\s+/g, ' ').trim()));
      if (row.length > 0) rows.push(row);
    });
    const hasYear = rows.some(r => r[0] && r[0].match(/^(19|20)\d{2}$/));
    if (hasYear) {
      console.log(`\n=== Table Index ${i} for ${symbol} ===`);
      console.log('Header Row 0:', rows[0]);
      if (rows[1]) console.log('Header Row 1:', rows[1]);
      console.log('Sample Data Row:', rows.find(r => r[0] && r[0].match(/^(19|20)\d{2}$/)));
    }
  });
}

inspect('BRACBANK');
