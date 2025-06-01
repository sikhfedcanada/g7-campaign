// File: api/get-mp.js

import fs from 'fs';
import path from 'path';
import csvParser from 'csv-parser';
import * as turf from '@turf/turf';
import fetch from 'node-fetch';

// 1) Load the up-to-date GeoJSON of 45th Parliament federal ridings (WGS84)
const geojsonPath = path.join(process.cwd(), 'data', 'geojson', 'fed_districts.geojson');
let ridingPolygons = { type: 'FeatureCollection', features: [] };

try {
  const rawGeo = fs.readFileSync(geojsonPath, 'utf8');
  ridingPolygons = JSON.parse(rawGeo);
} catch (e) {
  console.error('Error loading fed_districts.geojson:', e);
}

// 2) Load & cache the MP list CSV into memory
const csvPath = path.join(process.cwd(), 'data', 'csv', 'mp_list.csv');
let mpList = [];

function loadMpCsv() {
  return new Promise((resolve, reject) => {
    const rows = [];
    fs.createReadStream(csvPath)
      .pipe(csvParser())
      .on('data', (row) => {
        // Handle potential BOM in header keys
        const ridingNameRaw = row['Riding'] || '';
        const mpNameRaw     = row['Name'] || row['\uFEFFName'] || '';
        const mpEmailRaw    = row['Email'] || '';
        if (ridingNameRaw.trim() && mpNameRaw.trim() && mpEmailRaw.trim()) {
          rows.push({
            riding_name: ridingNameRaw.trim(),
            mp_name:     mpNameRaw.trim(),
            mp_email:    mpEmailRaw.trim(),
          });
        }
      })
      .on('end', () => resolve(rows))
      .on('error', (err) => reject(err));
  });
}

const mpCsvPromise = loadMpCsv()
  .then((arr) => {
    mpList = arr;
    console.log(`Loaded ${arr.length} MP rows from CSV`);
  })
  .catch((err) => {
    console.error('Error loading MP CSV:', err);
  });

// 3) Helper to geocode a postal code via OpenNorth to get lat/lon
async function geocodePostal(postal) {
  const cleaned = postal.toUpperCase().replace(/\s+/g, '');
  const url = `https://represent.opennorth.ca/postcodes/${encodeURIComponent(cleaned)}/`;
  const resp = await fetch(url);
  if (!resp.ok) {
    if (resp.status === 404) {
      throw new Error('Postal code not found in OpenNorth');
    }
    throw new Error(`OpenNorth responded ${resp.status}`);
  }
  const json = await resp.json();
  if (!json.centroid || !Array.isArray(json.centroid.coordinates)) {
    throw new Error('No centroid in OpenNorth response');
  }
  const [lon, lat] = json.centroid.coordinates;
  return { lat, lon };
}

// 4) The serverless API handler
export default async function handler(req, res) {
  // Wait for CSV to load
  try {
    await mpCsvPromise;
  } catch {
    return res.status(500).json({ error: 'Failed to load MP CSV.' });
  }

  // Accept GET with ?postal= or POST with JSON body { postal }
  let postal;
  if (req.method === 'GET') {
    postal = req.query.postal;
  } else if (req.method === 'POST') {
    postal = req.body.postal;
  } else {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!postal || typeof postal !== 'string' || !postal.trim()) {
    return res.status(400).json({ error: 'Missing or invalid `postal`. Try e.g. L6R 0S4' });
  }

  // 1) Geocode to get lat/lon
  let latLng;
  try {
    latLng = await geocodePostal(postal);
  } catch (e) {
    return res.status(400).json({ error: `Geocode error: ${e.message}` });
  }

  // 2) Create a Turf point
  const pt = turf.point([latLng.lon, latLng.lat]);

  // 3) Find the matching riding polygon
  let matchedFeature = null;
  for (const feature of ridingPolygons.features) {
    if (turf.booleanPointInPolygon(pt, feature)) {
      matchedFeature = feature;
      break;
    }
  }
  if (!matchedFeature) {
    return res.status(404).json({ error: 'No riding found at that location.' });
  }

  // 4) Extract the riding name (ED_NAMEE property)
  let geoRidingName = matchedFeature.properties.ED_NAMEE;
  if (!geoRidingName) {
    return res.status(500).json({ error: 'Could not read riding name from GeoJSON.' });
  }
  geoRidingName = geoRidingName.trim();

  // 5) Look up the MP by riding_name (case-insensitive compare)
  const mpRecord = mpList.find(
    (r) => r.riding_name.trim().toLowerCase() === geoRidingName.toLowerCase()
  );

  if (!mpRecord) {
    return res.status(404).json({
      error: `No MP found in CSV for riding "${geoRidingName}".`,
    });
  }

  // 6) Return the JSON response
  return res.status(200).json({
    riding_name: geoRidingName,
    mp_name:     mpRecord.mp_name,
    mp_email:    mpRecord.mp_email,
  });
}