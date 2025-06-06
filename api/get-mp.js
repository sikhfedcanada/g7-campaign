import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import fetch from 'node-fetch';

export default async function handler(req, res) {
  // ── CORS ────────────────────────────────────────────────────────────────
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // ── Validate postal query ────────────────────────────────────────────────
  const raw = (req.query.postal || '').toString().trim().toUpperCase();
  const postal = raw.replace(/\s+/g, '');
  if (!postal.match(/^[A-Z]\d[A-Z]\d[A-Z]\d$/)) {
    return res.status(400).json({ error: 'Invalid postal code format' });
  }

  try {
    // ── 1) Call OpenNorth for riding info ─────────────────────────────────
    const onRes = await fetch(`https://represent.opennorth.ca/postcodes/${postal}/`);
    if (!onRes.ok) {
      throw new Error(`OpenNorth returned ${onRes.status}`);
    }
    const onData = await onRes.json();
    const rep = onData.representatives_centroid
      .find(r => r.elected_office === 'MP');
    if (!rep || !rep.electoral_district?.name) {
      return res.status(404).json({ error: 'No MP found for that postal' });
    }
    const ridingName = rep.electoral_district.name.trim();

    // ── 2) Load & parse your CSV on demand ─────────────────────────────────
    const csvPath = path.join(process.cwd(), 'Data', 'csv', 'mp_list.csv');
    const mpList = await new Promise((resolve, reject) => {
      const results = [];
      fs.createReadStream(csvPath)
        .pipe(csv())
        .on('data', row => {
          // normalize your CSV’s riding_name column:
          if (row.riding_name && row.mp_email && row.mp_name) {
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

    // ── 3) Match riding against CSV ────────────────────────────────────────
    const key = ridingName.toLowerCase();
    const match = mpList.find(r => r.riding === key);

    // ── 4) Build your response ─────────────────────────────────────────────
    const mp_name  = match ? match.mp_name  : rep.name;
    const mp_email = match ? match.mp_email : rep.email || '';
    return res.status(200).json({
      riding_name: ridingName,
      mp_name,
      mp_email
    });

  } catch (err) {
    console.error('get-mp error:', err);
    // If any step throws, return a safe 500 with the message
    return res.status(500).json({ error: err.message });
  }
}