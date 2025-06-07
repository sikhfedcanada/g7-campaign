// api/get-mp.js
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point } from '@turf/helpers';

export default async function handler(req, res) {
  // ── 1) CORS ──────────────────────────────────────────────────────────────
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── 2) Normalize & validate postal ───────────────────────────────────────
  const raw    = (req.query.postal||'').toString().trim().toUpperCase();
  const postal = raw.replace(/\s+/g,'');
  if (!/^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(postal)) {
    return res.status(400).json({ error: 'Invalid postal code format' });
  }

  try {
    // ── 3) Geocode that postal to get lat/lon ───────────────────────────────
    const geoUrl = `https://represent.opennorth.ca/postcodes/${postal}`;
    console.log('Fetching geocode:', geoUrl);
    const geoRes = await fetch(geoUrl);
    if (!geoRes.ok) {
      throw new Error(`Geocode error: ${geoRes.status}`);
    }
    const geo = await geoRes.json();
    const coords = geo.centroid?.coordinates;
    if (!coords || coords.length !== 2) {
      throw new Error('No centroid returned');
    }
    const [lon, lat] = coords;
    const pt = point([lon, lat]);

    // ── 4) Load your GeoJSON boundaries ─────────────────────────────────────
    const districtsPath = path.join(process.cwd(), 'data', 'geojson', 'fed_districts.geojson');
    const districtsRaw  = fs.readFileSync(districtsPath, 'utf8');
    const districts     = JSON.parse(districtsRaw);

    // ── 5) Find which riding polygon contains that point ────────────────────
    const feat = districts.features.find(f => booleanPointInPolygon(pt, f));
    if (!feat) {
      return res.status(404).json({ error: 'No riding found at that location.' });
    }
    const ridingName = feat.properties.ED_NAMEE.trim();
    const ridingKey  = ridingName.toLowerCase();

    // ── 6) Load & parse your CSV of up-to-date MPs ──────────────────────────
    const csvFile = path.join(process.cwd(), 'data', 'csv', 'mp_list.csv');
    const mpList  = await new Promise((resolve, reject) => {
      const out = [];
      fs.createReadStream(csvFile)
        .pipe(csv())
        .on('data', row => {
          if (row.riding_name && row.mp_name && row.mp_email) {
            out.push({
              riding:   row.riding_name.trim().toLowerCase(),
              mp_name:  row.mp_name.trim(),
              mp_email: row.mp_email.trim(),
            });
          }
        })
        .on('end', () => resolve(out))
        .on('error', reject);
    });

    // ── 7) Find your MP or fall back to “Unknown” ───────────────────────────
    const match    = mpList.find(r => r.riding === ridingKey);
    const mp_name  = match ? match.mp_name  : 'Unknown MP';
    const mp_email = match ? match.mp_email : '';

    // ── 8) Return the response ──────────────────────────────────────────────
    return res.status(200).json({ riding_name: ridingName, mp_name, mp_email });
  }
  catch (err) {
    console.error('get-mp error:', err);
    return res.status(500).json({ error: err.message });
  }
}