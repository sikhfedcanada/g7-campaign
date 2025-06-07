import fs   from 'fs';
import path from 'path';
import csv  from 'csv-parser';

export default async function handler(req, res) {
  // ── CORS ────────────────────────────────────────────────────────────────
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── Validate postal ─────────────────────────────────────────────────────
  const raw    = (req.query.postal||'').toString().trim().toUpperCase();
  const postal = raw.replace(/\s+/g,'');
  if (!/^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(postal)) {
    return res.status(400).json({ error: 'Invalid postal code format' });
  }

  try {
    // ── Fetch from representatives endpoint ─────────────────────────────────
    const url = `https://represent.opennorth.ca/representatives/postcodes/${encodeURIComponent(postal)}/?sets=federal-electoral-districts`;
    console.log('▶️ Fetching OpenNorth:', url);
    const onRes = await fetch(url);
    if (!onRes.ok) throw new Error(`OpenNorth returned HTTP ${onRes.status}`);
    const onData = await onRes.json();
    console.log('📥 OpenNorth response:', JSON.stringify(onData, null, 2));

    // ── Grab the MP from whichever array is present ──────────────────────────
    const reps = Array.isArray(onData.representatives)
      ? onData.representatives
      : Array.isArray(onData.representatives_centroid)
        ? onData.representatives_centroid
        : [];
    const mpRecord = reps.find(r => r.elected_office === 'MP');
    if (!mpRecord || !mpRecord.electoral_district?.name) {
      console.warn('⚠️ No MP found in:', reps);
      return res.status(404).json({ error: 'No MP found for that postal code' });
    }

    const ridingName = mpRecord.electoral_district.name.trim();
    const ridingKey  = ridingName.toLowerCase();

    // ── Load your up-to-date CSV of MPs ──────────────────────────────────────
    const csvPath = path.join(process.cwd(), 'data', 'csv', 'mp_list.csv');
    const mpList = await new Promise((resolve, reject) => {
      const rows = [];
      fs.createReadStream(csvPath)
        .pipe(csv())
        .on('data', row => {
          if (row.riding_name && row.mp_name && row.mp_email) {
            rows.push({
              riding:   row.riding_name.trim().toLowerCase(),
              mp_name:  row.mp_name.trim(),
              mp_email: row.mp_email.trim()
            });
          }
        })
        .on('end', () => resolve(rows))
        .on('error', reject);
    });

    // ── Match riding in CSV or fallback to OpenNorth’s record ───────────────
    const found = mpList.find(r => r.riding === ridingKey);
    const mp_name  = found ? found.mp_name  : mpRecord.name;
    const mp_email = found ? found.mp_email : (mpRecord.email || '');

    // ── Return JSON ─────────────────────────────────────────────────────────
    return res.status(200).json({ riding_name: ridingName, mp_name, mp_email });

  } catch (err) {
    console.error('🔥 get-mp error:', err);
    return res.status(500).json({ error: err.message });
  }
}