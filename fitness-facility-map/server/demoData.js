const fs = require('fs');
const path = require('path');

const DEMO_FILE = path.join(__dirname, '..', 'data', 'demoFacilities.json');
const { facilities } = JSON.parse(fs.readFileSync(DEMO_FILE, 'utf-8'));

function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function search({ query, lat, lng }) {
  const q = (query || '').trim();
  let results = facilities.map((f) => ({ ...f, source: 'demo' }));

  if (q) {
    results = results.filter(
      (f) => f.name.includes(q) || f.category.includes(q) || f.address.includes(q)
    );
  }

  if (lat && lng) {
    results = results
      .map((f) => ({ ...f, distanceMeters: Math.round(haversineMeters(Number(lat), Number(lng), f.lat, f.lng)) }))
      .sort((a, b) => a.distanceMeters - b.distanceMeters);
  }

  return results;
}

function findById(id) {
  return facilities.find((f) => f.id === id) || null;
}

module.exports = { search, findById };
