import fs   from 'fs';
import path from 'path';
import csv  from 'csv-parser';

export default async function handler(req, res) {
  // ── 1) CORS ──────────────────────────────────────────────────────────────
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── 2) Validate postal code ──────────────────────────────────────────────
  const raw    = (req.query.postal || '').toString().trim().toUpperCase();
  const postal = raw.replace(/\s+/g, '');
  if (!/^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(postal)) {
    return res.status(400).json({ error: 'Invalid postal code format' });
  }

  try {
    // ── 3) Fetch via the /postcodes endpoint with the FED boundary set ─────
    const url = `https://represent.opennorth.ca/postcodes/${postal}/?sets=federal-electoral-districts`;
    console.log('Fetching OpenNorth:', url);
    const onRes = await fetch(url);
    if (!onRes.ok) throw new Error(`OpenNorth returned ${onRes.status}`);
    const onData = await onRes.json();

    // ── 4) Pull out the MP from representatives_centroid ────────────────────
    const reps = Array.isArray(onData.representatives_centroid)
      ? onData.representatives_centroid
      : [];
    const rep = reps.find(r => r.elected_office === 'MP');
    if (!rep || !rep.electoral_district?.name) {
      console.warn('No MP entry in response:', reps);
      return res.status(404).json({ error: 'No MP found for that postal code' });
    }

    const ridingName = rep.electoral_district.name.trim();
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

    // ── 6) Match riding → CSV, fallback to OpenNorth’s rep data ────────────
    const found    = mpList.find(r => r.riding === ridingKey);
    const mp_name  = found ? found.mp_name  : rep.name;
    const mp_email = found ? found.mp_email : (rep.email || '');

    // ── 7) Return the combined result ──────────────────────────────────────
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