import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';

export default async function handler(req, res) {
  // ── 1) CORS ──────────────────────────────────────────────────────────────
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // ── 2) Validate postal query ─────────────────────────────────────────────
  const raw = (req.query.postal || '').toString().trim().toUpperCase();
  const postal = raw.replace(/\s+/g, '');
  if (!/^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(postal)) {
    return res.status(400).json({ error: 'Invalid postal code format' });
  }

  try {
    // ── 3) Fetch riding info from OpenNorth ────────────────────────────────
    const onRes = await fetch(`https://represent.opennorth.ca/postcodes/${postal}/`);
    if (!onRes.ok) {
      throw new Error(`OpenNorth returned ${onRes.status}`);
    }
    const onData = await onRes.json();
    const rep = onData.representatives_centroid
      .find(r => r.elected_office === 'MP');
    if (!rep || !rep.electoral_district?.name) {
      return res.status(404).json({ error: 'No MP found for that postal code' });
    }
    const ridingName = rep.electoral_district.name.trim();
    const ridingKey  = ridingName.toLowerCase();

    // ── 4) Load & parse your CSV of up-to-date MPs ────────────────────────────
    const csvPath = path.join(process.cwd(), 'Data', 'csv', 'mp_list.csv');
    const mpList = await new Promise((resolve, reject) => {
      const results = [];
      fs.createReadStream(csvPath)
        .pipe(csv())
        .on('data', row => {
          if (row.riding_name && row.mp_name && row.mp_email) {
            results.push({
              riding:   row.riding_name.trim().toLowerCase(),
              mp_name:  row.mp_name.trim(),
              mp_email: row.mp_email.trim()
            });
          }
        })
        .on('end', () => resolve(results))
        .on('error', err => reject(err));
    });

    // ── 5) Lookup in your CSV (fall back to OpenNorth if missing) ────────────
    const match = mpList.find(r => r.riding === ridingKey);
    const mp_name  = match ? match.mp_name  : rep.name;
    const mp_email = match ? match.mp_email : (rep.email || '');

    // ── 6) Return JSON ──────────────────────────────────────────────────────
    return res.status(200).json({
      riding_name: ridingName,
      mp_name,
      mp_email
    });

  } catch (err) {
    console.error('get-mp error:', err);
    return res.status(500).json({ error: err.message });
  }
}