// api/get-mp.js
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point } from '@turf/helpers';
import districts from '../data/geojson/fed_districts.geojson';

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
    // ── 3) Geocode via OpenNorth to get centroid ───────────────────────────
    const geoRes = await fetch(
      `https://represent.opennorth.ca/postcodes/${postal}/`
    );
    if (!geoRes.ok) {
      throw new Error(`Geocode error: ${geoRes.status}`);
    }
    const geo = await geoRes.json();
    if (!geo.centroid?.coordinates) {
      throw new Error('No centroid returned for that postal code');
    }
    const [lon, lat] = geo.centroid.coordinates;
    const pt = point([lon, lat]);

    // ── 4) Find which riding polygon contains that point ───────────────────
    const feature = districts.features.find(f =>
      booleanPointInPolygon(pt, f)
    );
    if (!feature) {
      return res.status(404).json({ error: 'No riding found at that location.' });
    }
    // ED_NAMEE is the English riding name in your shapefile properties
    const ridingName = feature.properties.ED_NAMEE.trim();
    const ridingKey  = ridingName.toLowerCase();

    // ── 5) Load & parse your CSV of up-to-date MPs ──────────────────────────
    const csvPath = path.join(process.cwd(), 'data', 'csv', 'mp_list.csv');
    const mpList = await new Promise((resolve, reject) => {
      const out = [];
      fs.createReadStream(csvPath)
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
        .on('end', ()  => resolve(out))
        .on('error', err => reject(err));
    });

    // ── 6) Match the riding in your CSV, or fallback to “unknown” ───────────
    const match    = mpList.find(r => r.riding === ridingKey);
    const mp_name  = match ? match.mp_name  : 'Unknown MP';
    const mp_email = match ? match.mp_email : '';

    // ── 7) Return the result ────────────────────────────────────────────────
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