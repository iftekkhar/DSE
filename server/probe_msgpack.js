import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import { decode as msgpackDecode } from '@msgpack/msgpack';

const DATA_DIR = path.join(process.cwd(), 'data');
const DEBUG_DIR = path.join(DATA_DIR, 'debug');
const OUT_ENDPOINTS = path.join(process.cwd(), 'server', 'msgpack_endpoints.json');
const OUT_SAMPLE = path.join(DEBUG_DIR, 'msgpack-sample.json');

const domain = 'https://www.amarstock.com';

const candidates = [
  `${domain}/info/Stocks`,
  `${domain}/Info/Stocks`,
  `${domain}/api/info/stocks`,
  `${domain}/data/info/stocks`,
  `${domain}/info/Stock`,
  `${domain}/stock/info`,
  `${domain}/data/Stocks`,
  `${domain}/latest-share-price`,
  `${domain}/Home/MostActiveBlockEx`,
  `https://staticv2.amarstock.com/bundles/js/latestprice-onRealTime_v_ABt_tFLLmHyyTKd0gg5SCUXTpkHazwuUr390VsyuZ-k1.txt`
];

async function discoverFromNetworkCaptures() {
  try {
    const files = await fs.readdir(DEBUG_DIR);
    for (const f of files) {
      if (!f.toLowerCase().startsWith('network-capture')) continue;
      const p = path.join(DEBUG_DIR, f);
      try {
        const txt = await fs.readFile(p, 'utf8');
        const obj = JSON.parse(txt);
        if (Array.isArray(obj.items)) {
          for (const it of obj.items) {
            if (it && it.request && it.request.url) {
              const u = it.request.url;
              if (!candidates.includes(u)) candidates.push(u);
            }
            if (it && it.response && it.response.url) {
              const u = it.response.url;
              if (!candidates.includes(u)) candidates.push(u);
            }
          }
        }
      } catch (e) {
        // ignore
      }
    }
  } catch (e) {
    // ignore
  }
}

async function probe() {
  await fs.mkdir(DEBUG_DIR, { recursive: true });
  await discoverFromNetworkCaptures();
  const found = [];
  for (const url of candidates) {
    try {
      console.log('Trying', url);
      const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 10000, headers: { 'User-Agent': 'node/probe' } });
      if (!res || !res.data) { console.log('  no data'); continue; }
      const buf = new Uint8Array(res.data);
      // Heuristics: check first bytes for msgpack magic? msgpack has no fixed magic; we'll attempt decode
      try {
        const dec = msgpackDecode(buf);
        // Basic validation: must be object with aa array or array of arrays
        if (dec && (dec.aa || Array.isArray(dec))) {
          console.log('  decoded OK from', url);
          found.push({ url, decodedSample: dec });
          // write sample to debug
          await fs.writeFile(OUT_SAMPLE, JSON.stringify({ url, decodedAt: new Date().toISOString(), sample: dec }, null, 2), 'utf8');
          // store endpoints
          await fs.writeFile(OUT_ENDPOINTS, JSON.stringify(found.map(f => f.url), null, 2), 'utf8');
          // continue probing others
        } else {
          console.log('  decode did not yield expected shape');
        }
      } catch (de) {
        // not msgpack or decode failed
        // try to interpret as UTF-8 JSON
        try {
          const text = Buffer.from(buf).toString('utf8');
          const j = JSON.parse(text);
          if (j && (j.aa || Array.isArray(j))) {
            console.log('  JSON payload found at', url);
            found.push({ url, decodedSample: j });
            await fs.writeFile(OUT_SAMPLE, JSON.stringify({ url, decodedAt: new Date().toISOString(), sample: j }, null, 2), 'utf8');
            await fs.writeFile(OUT_ENDPOINTS, JSON.stringify(found.map(f => f.url), null, 2), 'utf8');
          }
        } catch (je) {
          // ignore
          console.log('  not msgpack nor JSON');
        }
      }
    } catch (err) {
      console.log('  error', err.message);
    }
  }
  console.log('Probe finished. found', found.length, 'candidates. Wrote', OUT_ENDPOINTS, 'and', OUT_SAMPLE);
}

probe().catch(err => { console.error('Probe failed', err); process.exit(1); });
