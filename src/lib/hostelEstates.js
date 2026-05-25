// Hostel estate venue sets — used for gender/residence-based order pairing
export const VF_ESTATE = new Set([
  'Victoria Falls', 'Mississippi', 'White Nile', 'Lake Tana', 'Shebelle',
  'Nile Delta', 'Lake Victoria', 'Victoria Falls Cafeteria',
]);

export const MH_ESTATE = new Set([
  'Moat Heaven', 'Zambezi', 'Moat Orange', 'Orange', 'Black Volta', 'Red Volta',
  'Blue Nile', 'Lake Chad', 'Moat Heaven Cafeteria',
]);

// Returns null | 'victoria_falls' | 'moat_heaven'
export function getEstateRestriction(pickup, dropoff) {
  if (VF_ESTATE.has(pickup) || VF_ESTATE.has(dropoff)) return 'victoria_falls';
  if (MH_ESTATE.has(pickup) || MH_ESTATE.has(dropoff)) return 'moat_heaven';
  return null;
}
