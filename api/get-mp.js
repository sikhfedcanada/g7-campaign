import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';

export default async function handler(req, res) {
  // ── 1) CORS ──────────────────────────────────────────────────────────────
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── 2) Sanitize & validate postal ────────────────────────────────────────
  const raw   = (req.query.postal||'').toString().trim().toUpperCase();
  const postal = raw.replace(/\s+/g,'');
  if (!/^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(postal)) {
    return res.status(400).json({ error: 'Invalid postal code format' });
  }

  try {
    // ── 3) Hit OpenNorth with the “federal‐electoral‐districts” set ─────────
    const url = 
      `https://represent.opennorth.ca/representatives/postcodes/` +
      `${encodeURIComponent(postal)}/?sets=federal-electoral-districts`;
    console.log('▶️ OpenNorth URL:', url);

    const onRes = await fetch(url);
    if (!onRes.ok) throw new Error(`OpenNorth returned HTTP ${onRes.status}`);
    const onData = await onRes.json();
    console.log('📥 OpenNorth payload:', JSON.stringify(onData,null,2));

    // ── 4) Find the MP in whichever array they put it in ─────────────────────
    const reps = 
      onData.representatives_centroid ||
      onData.representatives_concordance ||
      [];
    const mp = reps.find(r => r.elected_office === 'MP');

    if (!mp || !mp.electoral_district?.name) {
      console.warn('⚠️ no mp or district:', reps);
      return res.status(404).json({ error: 'No MP found for that postal code' });
    }

    const ridingName = mp.electoral_district.name.trim();
    const ridingKey  = ridingName.toLowerCase();

    // ── 5) Load your CSV of up-to-date MPs ───────────────────────────────────
    const csvFile = path.join(process.cwd(), 'data', 'csv', 'mp_list.csv');
    const mpList = await new Promise((resolve, reject) => {
      const out = [];
      fs.createReadStream(csvFile)
        .pipe(csv())
        .on('data', row => {
          if (row.riding_name && row.mp_name && row.mp_email) {
            out.push({
              riding:   row.riding_name.trim().toLowerCase(),
              mp_name:  row.mp_name.trim(),
              mp_email: row.mp_email.trim()
            });
          }
        })
        .on('end', () => resolve(out))
        .on('error', reject);
    });

    // ── 6) Match or fall back to OpenNorth’s data ────────────────────────────
    const found = mpList.find(r => r.riding === ridingKey);
    const mp_name  = found ? found.mp_name  : mp.name;
    const mp_email = found ? found.mp_email : (mp.email||'');

    // ── 7) Send the JSON ────────────────────────────────────────────────────
    return res.status(200).json({
      riding_name: ridingName,
      mp_name,
      mp_email
    });

  } catch (err) {
    console.error('🔥 get-mp error:', err);
    return res.status(500).json({ error: err.message });
  }
}