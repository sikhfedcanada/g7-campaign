// api/get-mp.js
import fs   from 'fs';
import path from 'path';
import csv  from 'csv-parser';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point } from '@turf/helpers';

export default async function handler(req, res) {
  // 1) CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // 2) sanitize & validate postal
  const raw    = (req.query.postal||'').toString().trim().toUpperCase();
  const postal = raw.replace(/\s+/g,'');
  if (!/^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(postal)) {
    return res.status(400).json({ error: 'Invalid postal code format' });
  }

  try {
    // 3) geocode — must NOT have trailing slash
    const geoUrl = `https://represent.opennorth.ca/postcodes/${postal}`;
    console.log('▶️ geocode URL:', geoUrl);
    const geoRes = await fetch(geoUrl);
    if (!geoRes.ok) {
      throw new Error(`Geocode error: HTTP ${geoRes.status}`);
    }
    const geo = await geoRes.json();
    if (!geo.centroid?.coordinates) {
      throw new Error('No centroid in geocode response');
    }
    const [lon, lat] = geo.centroid.coordinates;
    const pt = point([lon, lat]);

    // 4) load & parse your GeoJSON
    const districtsPath = path.join(
      process.cwd(), 'data','geojson','fed_districts.geojson'
    );
    const rawJson = fs.readFileSync(districtsPath, 'utf8');
    const districts = JSON.parse(rawJson);

    // 5) find containing riding polygon
    const feat = districts.features.find(f => 
      booleanPointInPolygon(pt, f)
    );
    if (!feat) {
      return res.status(404).json({ error: 'No riding found at that location.' });
    }
    const normalize = str => str.toLowerCase().replace(/[\u2013\u2014]/g, '-').trim();
    const ridingName = normalize(feat.properties.ED_NAME || feat.properties.ED_NAMEE || '');

    // 6) load & parse your CSV of updated MPs
    const csvPath = path.join(
      process.cwd(), 'data','csv','mp_list.csv'
    );
    const mpList = await new Promise((resolve, reject) => {
      const rows = [];
      fs.createReadStream(csvPath)
        .pipe(csv())
        .on('data', row => {
          console.log('CSV row:', row);
          if (row.riding && row.mp_name && row.mp_email) {
            const csvRiding = normalize(row.riding);
            console.log('Normalized CSV riding:', csvRiding, '| MP:', row.mp_name);
            rows.push({
              riding:   csvRiding,
              mp_name:  row.mp_name.trim(),
              mp_email: row.mp_email.trim()
            });
          }
        })
        .on('end', () => resolve(rows))
        .on('error', reject);
    });

    // Temporary debugging logs
    console.log('Point:', pt.geometry.coordinates);
    console.log('Matched feature:', feat?.properties);
    console.log('Normalized riding name:', ridingName);
    console.log('CSV entries:', mpList.map(r => r.riding));

    // 7) match or fallback
    const closeMatches = mpList.filter(r =>
      r.riding.includes(ridingName) || ridingName.includes(r.riding)
    );
    console.log('Possible close matches:', closeMatches);
    const match = mpList.find(r => {
      if (r.riding === ridingName) {
        console.log('✅ Exact match:', r.riding, '===', ridingName);
        return true;
      } else {
        console.log('❌ No match:', r.riding, '!==', ridingName);
        return false;
      }
    });
    console.log('Looking for match:', ridingName);
    console.log('Found match:', match);
    const mp_name  = match ? match.mp_name  : 'Unknown MP';
    const mp_email = match ? match.mp_email : '';

    // 8) done
    return res.status(200).json({
      riding_name: match ? match.riding : ridingName,
      mp_name,
      mp_email
    });

  } catch (err) {
    console.error('get-mp error:', err);
    return res.status(500).json({ error: err.message });
  }
}