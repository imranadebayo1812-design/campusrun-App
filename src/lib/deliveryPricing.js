/**
 * CampusRun — GPS-Distance-Based Delivery Pricing
 * Zone coords, haversine distance, fee tiers.
 * See docs/CAMPUS_ZONES.md for full documentation.
 */

const ZONE_COORDS = {
  food_court:             { lat: 9.015536922964838,  lng: 7.396716577036188  },
  student_center:         { lat: 9.01584359696767,   lng: 7.396116772255717  },
  congo:                  { lat: 9.015954574785841,  lng: 7.3945794810988525 },
  ubangi:                 { lat: 9.016131956311884,  lng: 7.395744504548524  },
  nile_house:             { lat: 9.015859060668914,  lng: 7.397644468340586  },
  niger:                  { lat: 9.014112307145439,  lng: 7.397342089292864  },
  limpopo:                { lat: 9.014636825222022,  lng: 7.395357254643089  },
  mosque:                 { lat: 9.014975907200785,  lng: 7.398393515185474  },
  volta:                  { lat: 9.013826125424105,  lng: 7.39613917931276   },
  car_park:               { lat: 9.01461852566404,   lng: 7.399012792066656  },
  nile_healthcare:        { lat: 9.012281318936747,  lng: 7.395577555463283  },
  nile_laboratory:        { lat: 9.011757450628213,  lng: 7.395362422266354  },
  opentech:               { lat: 9.012127155225496,  lng: 7.394694421194124  },
  female_shopping_complex:{ lat: 9.012656357522633,  lng: 7.396186328466161  },
  victoria_falls:         { lat: 9.013493797922477,  lng: 7.3948163303007775 },
  vf_mississippi:         { lat: 9.0138,             lng: 7.3950             },
  vf_white_nile:          { lat: 9.0135,             lng: 7.3948             },
  vf_lake_tana:           { lat: 9.0132,             lng: 7.3952             },
  vf_shebelle:            { lat: 9.0130,             lng: 7.3946             },
  vf_nile_delta:          { lat: 9.0137,             lng: 7.3944             },
  vf_lake_victoria:       { lat: 9.0133,             lng: 7.3942             },
  male_shopping_complex:  { lat: 9.019171571637726,  lng: 7.39754468924829   },
  turkish:                { lat: 9.019303882787675,  lng: 7.399958002472241  },
  moat_heaven:            { lat: 9.020038708853157,  lng: 7.397248961987882  },
  moat_zambezi:           { lat: 9.0198,             lng: 7.3970             },
  moat_orange:            { lat: 9.0201,             lng: 7.3973             },
  moat_black_volta:       { lat: 9.0204,             lng: 7.3975             },
  moat_red_volta:         { lat: 9.0196,             lng: 7.3968             },
};

export const DEFAULT_SERVICE_FEE = 100;
export const DEFAULT_DELIVERY_FEE = 500;

function haversineM(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function distanceToFee(metres) {
  if (metres < 100)  return 200;
  if (metres < 300)  return 300;
  if (metres < 450)  return 400;
  if (metres < 600)  return 500;
  if (metres < 750)  return 600;
  if (metres < 950)  return 700;
  if (metres < 1200) return 800;
  if (metres < 1500) return 900;
  return 1000;
}

export function getZoneKey(location) {
  if (!location) return null;
  const l = location.toLowerCase();
  if (l.includes('food court') || l.includes("b's chops") || l.includes('zulkys') || l.includes('jaj plate') ||
      l.includes('trayblazers') || l.includes('quintavi') || l.includes('cherries') ||
      l.includes('papa rims') || l.includes('w sauce') || l.includes('dot cafe') ||
      l.includes('freenys') || l.includes('pizza 360') || l.includes('street food nile') ||
      l.includes('suya 17') || l.includes('yammys')) return 'food_court';
  if (l.includes('zambezi') || l.includes('black volta') || l.includes('red volta') ||
      l.includes('lake chad') || l.startsWith('moat heaven') || l.includes('moat heaven')) return 'moat_heaven';
  if (l.includes('mississippi'))   return 'vf_mississippi';
  if (l.includes('white nile'))    return 'vf_white_nile';
  if (l.includes('lake tana'))     return 'vf_lake_tana';
  if (l.includes('shebelle'))      return 'vf_shebelle';
  if (l.includes('nile delta'))    return 'vf_nile_delta';
  if (l.includes('lake victoria')) return 'vf_lake_victoria';
  if (l.includes('victoria falls') || l.startsWith('victoria')) return 'victoria_falls';
  if (l.includes('student center')) return 'student_center';
  if (l.includes('nile house'))    return 'nile_house';
  if (l.includes('niger'))         return 'niger';
  if (l.includes('limpopo'))       return 'limpopo';
  if (l.includes('mosque'))        return 'mosque';
  if (l.includes('volta'))         return 'volta';
  if (l.includes('female shopping') || l.includes('hat lab') || l.includes('delicias') ||
      l.includes('mini mart') || l.includes('quick fix') || l.includes('female bridan')) return 'female_shopping_complex';
  if (l.includes('male shopping') || l.includes('bridan') || l.includes('printing press') ||
      l.includes('11:29') || l.includes('eleven') || l.includes('smoked restaurant')) return 'male_shopping_complex';
  if (l.includes('opentech'))      return 'opentech';
  if (l.includes('nile laboratory') || l.includes('nile lab')) return 'nile_laboratory';
  if (l.includes('nile health') || l.includes('healthcare') || l.includes('clinic')) return 'nile_healthcare';
  if (l.includes('turkish'))       return 'turkish';
  if (l.includes('congo'))         return 'congo';
  if (l.includes('ubangi'))        return 'ubangi';
  if (l.includes('car park'))      return 'car_park';
  return null;
}

export function isResidentialZone(zoneKey) {
  return ['victoria_falls','vf_mississippi','vf_white_nile','vf_lake_tana',
          'vf_shebelle','vf_nile_delta','vf_lake_victoria','moat_heaven'].includes(zoneKey);
}

export const ESTATE_GATES = {
  victoria_falls: 'Victoria Falls Gate', vf_mississippi: 'Victoria Falls Gate',
  vf_white_nile: 'Victoria Falls Gate', vf_lake_tana: 'Victoria Falls Gate',
  vf_shebelle: 'Victoria Falls Gate', vf_nile_delta: 'Victoria Falls Gate',
  vf_lake_victoria: 'Victoria Falls Gate', moat_heaven: 'Moat Heaven Gate',
};

export function calculateDeliveryFee(pickupLocation, dropoffLocation) {
  const zoneA = getZoneKey(pickupLocation);
  const zoneB = getZoneKey(dropoffLocation);
  let delivery_fee = DEFAULT_DELIVERY_FEE;
  let distance_m = null;
  if (zoneA && zoneB) {
    const coordA = ZONE_COORDS[zoneA];
    const coordB = ZONE_COORDS[zoneB];
    if (coordA && coordB) {
      distance_m = Math.round(haversineM(coordA.lat, coordA.lng, coordB.lat, coordB.lng));
      delivery_fee = distanceToFee(distance_m);
    }
  }
  return { delivery_fee, service_fee: DEFAULT_SERVICE_FEE, distance_m, is_dynamic: false };
}