import fs from 'fs';
import https from 'https';

async function run() {
  const req = https.request('https://unsplash.com/s/photos/pottery', { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
    let rawData = '';
    res.on('data', (chunk) => { rawData += chunk; });
    res.on('end', () => {
      const regex = /"id":"([a-zA-Z0-9_-]{10,12})"/g;
      let m;
      let ids = new Set();
      while ((m = regex.exec(rawData)) !== null) {
          if (m[1].length > 9) ids.add(m[1]);
      }
      console.log([...ids].slice(0, 20));
    });
  });
  req.end();
}
run();
