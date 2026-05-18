// Approximate GPS coordinates for Nile University campus venues.
// Update these if the campus layout changes.
const CAMPUS_CENTER = { lat: 9.0752, lng: 7.3997 };

export const VENUE_COORDS = {
  'Food Court':                { lat: 9.0762, lng: 7.4002 },
  "B's Chops":                 { lat: 9.0763, lng: 7.4003 },
  'JAJ Plate':                 { lat: 9.0761, lng: 7.4001 },
  'Nile House':                { lat: 9.0758, lng: 7.3988 },
  'Student Center':            { lat: 9.0755, lng: 7.3995 },
  'Congo':                     { lat: 9.0748, lng: 7.3980 },
  'Car Park':                  { lat: 9.0740, lng: 7.3990 },
  'Ubangi':                    { lat: 9.0745, lng: 7.3975 },
  'Niger':                     { lat: 9.0750, lng: 7.3970 },
  'Limpopo':                   { lat: 9.0760, lng: 7.3972 },
  'Mosque':                    { lat: 9.0768, lng: 7.3990 },
  'Volta':                     { lat: 9.0765, lng: 7.3980 },
  'Victoria Falls':            { lat: 9.0770, lng: 7.4005 },
  'Nile Clinic':               { lat: 9.0742, lng: 7.4008 },
  'Nile Laboratory':           { lat: 9.0738, lng: 7.4000 },
  'OpenTech':                  { lat: 9.0735, lng: 7.3995 },
  'Female Shopping Complex':   { lat: 9.0758, lng: 7.4010 },
  'Male Shopping Complex':     { lat: 9.0753, lng: 7.4015 },
  'Turkish Restaurant':        { lat: 9.0760, lng: 7.4008 },
  'Moat Heaven':               { lat: 9.0755, lng: 7.4020 },
  'Admin Block':               { lat: 9.0745, lng: 7.4005 },
  'Main Gate':                 { lat: 9.0730, lng: 7.3985 },
  'Back Gate':                 { lat: 9.0775, lng: 7.4000 },
  'Sports Complex':            { lat: 9.0775, lng: 7.3975 },
  'Nile Hall A':               { lat: 9.0758, lng: 7.3988 },
  'Nile Hall B':               { lat: 9.0756, lng: 7.3985 },
  'Nile Hall C':               { lat: 9.0754, lng: 7.3982 },
};

export function getCoordsForVenue(name) {
  if (!name) return CAMPUS_CENTER;
  if (VENUE_COORDS[name]) return VENUE_COORDS[name];
  const key = Object.keys(VENUE_COORDS).find(k =>
    name.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(name.toLowerCase())
  );
  return key ? VENUE_COORDS[key] : CAMPUS_CENTER;
}

// Haversine distance in metres between two {lat, lng} points
export function haversineDistance(a, b) {
  if (!a || !b) return Infinity;
  const R = 6_371_000;
  const φ1 = a.lat * Math.PI / 180;
  const φ2 = b.lat * Math.PI / 180;
  const Δφ = (b.lat - a.lat) * Math.PI / 180;
  const Δλ = (b.lng - a.lng) * Math.PI / 180;
  const x = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
