import fs from 'fs/promises';
const p = 'data/debug/2026-08-18T01-37-50-176Z_https___www.amarstock.com_823af3f1ebdd.json';
const json = JSON.parse(await fs.readFile(p,'utf8'));
const symbols = ['1JANATAMF','BATBC','BRACBANK','SINGERBD'];
for (const s of symbols){
  const idx = json.aa.indexOf(s);
  console.log('\nSymbol', s, 'index', idx);
  if (idx === -1) continue;
  const keys = ['ea','ad','an','aj','ak','ap','aq','ar','ay','ba','bb','bc','ej','ei'];
  for (const k of keys){
    if (json[k]) console.log(`  ${k}:`, json[k][idx]);
  }
}
