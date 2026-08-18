import fs from 'fs/promises';
const p = 'data/debug/2026-08-18T01-37-50-176Z_https___www.amarstock.com_823af3f1ebdd.json';
(async ()=>{
  const txt = await fs.readFile(p,'utf8');
  const obj = JSON.parse(txt);
  const keys = Object.keys(obj);
  for (const k of keys){
    const v = obj[k];
    console.log(k, Array.isArray(v)?('array len='+v.length):typeof v);
    if (Array.isArray(v)) console.log('  sample:', JSON.stringify(v.slice(0,6))); 
  }
})();
