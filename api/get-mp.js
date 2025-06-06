import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import fetch from 'node-fetch';

let mpList = [];

// Load and parse the CSV exactly once on cold start
const csvPath = path.join(process.cwd(), 'Data/csv/mp_list.csv');
fs.createReadStream(csvPath)
  .pipe(csv())
  .on('data', row => {
    // normalize riding name to lower for easy matching
    mpList.push({
      riding:   row.riding_name.trim().toLowerCase(),
      mp_name:  row.mp_name.trim(),
      mp_email: row.mp_email.trim()
    });
  })
  .on('end', () => {
    console.log(`Loaded ${mpList.length} MPs from CSV`);
  });

export default async function handler(req, res) {
  // Enable CORS so Webflow can fetch
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const postal = (req.query.postal || '').toUpperCase().replace(/\s+/g, '');
  if (!postal.match(/^[A-Z]\d[A-Z]\d[A-Z]\d$/)) {
    return res.status(400).json({ error: 'Invalid postal code format' });
  }

  try {
    // 1) Fetch riding from OpenNorth
    const onRes = await fetch(`https://represent.opennorth.ca/postcodes/${postal}/`);
    if (!onRes.ok) {
      throw new Error(`OpenNorth error ${onRes.status}`);
    }
    const onData = await onRes.json();

    // 2) Find the MP rep
    const rep = onData.representatives_centroid
      .find(r => r.elected_office === 'MP');
    if (!rep || !rep.electoral_district?.name) {
      return res.status(404).json({ error: 'No MP found for that postal' });
    }
    const ridingName = rep.electoral_district.name.trim();
    const ridingKey  = ridingName.toLowerCase();

    // 3) Lookup in your CSV
    const match = mpList.find(r => r.riding === ridingKey);

    // 4) Build response
    const mp_name  = match ? match.mp_name  : rep.name;
    const mp_email = match ? match.mp_email : rep.email;

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