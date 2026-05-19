import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '@/api/supabaseClient';
import { VENUE_COORDS } from '@/lib/venueCoords';
import { MOCK_VENDORS } from '@/lib/mockData';
import { List, MapPin } from 'lucide-react';

// Fix default marker icon paths broken by Vite bundling
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function makeIcon(emoji) {
  return L.divIcon({
    html: `<div style="font-size:20px;line-height:1;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.6))">${emoji}</div>`,
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });
}

const CAMPUS_CENTER = [9.0752, 7.3997];

const CATEGORIES = [
  { key: 'all',      label: 'All' },
  { key: 'food',     label: 'Food' },
  { key: 'snacks',   label: 'Snacks' },
  { key: 'drinks',   label: 'Drinks' },
  { key: 'shopping', label: 'Shopping' },
];

// Lookup table so DB vendor names resolve to map coords + display meta
const VENDOR_META = Object.fromEntries(
  MOCK_VENDORS.map(v => [v.name.toLowerCase(), v])
);

function RecenterMap({ center }) {
  const map = useMap();
  useEffect(() => { map.setView(center, map.getZoom()); }, [center]);
  return null;
}

export default function CampusMapPage() {
  const navigate = useNavigate();
  const [view, setView]         = useState('map');
  const [category, setCategory] = useState('all');
  const [vendors, setVendors]   = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    async function load() {
      // Fetch distinct vendor names from the live DB
      const { data } = await supabase
        .from('menu_categories')
        .select('vendor_name')
        .order('vendor_name');

      if (data && data.length > 0) {
        // Deduplicate and merge with mock meta for emoji/zone/category
        const seen = new Set();
        const merged = [];
        for (const row of data) {
          if (seen.has(row.vendor_name)) continue;
          seen.add(row.vendor_name);
          const meta = VENDOR_META[row.vendor_name.toLowerCase()];
          merged.push({
            name: row.vendor_name,
            zone: meta?.zone || 'Food Court',
            emoji: meta?.emoji || '🏪',
            color: meta?.color || 'bg-brand-500',
            category: meta?.category || 'food',
            id: meta?.id || row.vendor_name,
          });
        }
        setVendors(merged);
      } else {
        // Fall back to mock data if DB is empty
        setVendors(MOCK_VENDORS.map(v => ({
          name: v.name, zone: v.zone, emoji: v.emoji,
          color: v.color, category: v.category, id: v.id,
        })));
      }
      setLoading(false);
    }
    load();
  }, []);

  const filtered = vendors.filter(v =>
    category === 'all' || v.category === category
  );

  // Build map markers — group vendors by zone so one pin per location
  const zoneGroups = {};
  for (const v of filtered) {
    const coords = VENUE_COORDS[v.zone];
    if (!coords) continue;
    const key = v.zone;
    if (!zoneGroups[key]) zoneGroups[key] = { coords, vendors: [] };
    zoneGroups[key].vendors.push(v);
  }

  return (
    <div className="bg-surface-950 min-h-full flex flex-col">
      {/* Header */}
      <div className="px-4 pt-5 pb-3 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Campus Map</h1>
          <p className="text-sm text-gray-500 mt-0.5">Nile University, Abuja</p>
        </div>
        <div className="flex items-center bg-surface-800 border border-white/[0.08] rounded-xl p-0.5 gap-0.5 shrink-0">
          <button
            onClick={() => setView('map')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              view === 'map' ? 'bg-brand-500 text-white' : 'text-gray-400'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" /> Map
          </button>
          <button
            onClick={() => setView('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              view === 'list' ? 'bg-brand-500 text-white' : 'text-gray-400'
            }`}
          >
            <List className="w-3.5 h-3.5" /> List
          </button>
        </div>
      </div>

      {/* Category chips */}
      <div className="px-4 mb-3">
        <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
          {CATEGORIES.map(c => (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                category === c.key
                  ? 'bg-brand-500 text-white'
                  : 'bg-surface-900 text-gray-400 border border-white/[0.08]'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Map view */}
      {view === 'map' && (
        <div className="px-4 flex-1">
          <div className="rounded-2xl overflow-hidden border border-white/[0.08]" style={{ height: 420 }}>
            <MapContainer
              center={CAMPUS_CENTER}
              zoom={17}
              style={{ height: '100%', width: '100%' }}
              zoomControl={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <RecenterMap center={CAMPUS_CENTER} />
              {Object.entries(zoneGroups).map(([zone, { coords, vendors: zv }]) => (
                <Marker
                  key={zone}
                  position={[coords.lat, coords.lng]}
                  icon={makeIcon(zv[0].emoji)}
                >
                  <Popup>
                    <div style={{ minWidth: 140 }}>
                      <p style={{ fontWeight: 700, marginBottom: 4, fontSize: 13 }}>{zone}</p>
                      {zv.map(v => (
                        <button
                          key={v.id}
                          onClick={() => navigate('/create-order', { state: { type: 'purchase', vendor: v.zone, vendorId: v.id } })}
                          style={{ display: 'block', width: '100%', textAlign: 'left', padding: '3px 0', fontSize: 12, color: '#7c3aed', cursor: 'pointer', background: 'none', border: 'none' }}
                        >
                          {v.emoji} {v.name}
                        </button>
                      ))}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
          <p className="text-xs text-gray-600 text-center mt-2">
            Tap a pin to see vendors at that location
          </p>
        </div>
      )}

      {/* List view */}
      {view === 'list' && (
        <div className="px-4 space-y-2 flex-1">
          {loading ? (
            [1,2,3,4].map(i => <div key={i} className="h-16 bg-surface-800 rounded-2xl animate-pulse" />)
          ) : filtered.length === 0 ? (
            <p className="text-center text-gray-500 py-12 text-sm">No vendors in this category</p>
          ) : (
            filtered.map(vendor => (
              <button
                key={vendor.id}
                onClick={() => navigate('/create-order', { state: { type: 'purchase', vendor: vendor.zone, vendorId: vendor.id } })}
                className="w-full bg-surface-900 border border-white/[0.08] rounded-2xl p-4 text-left flex items-center gap-3 active:scale-[0.98] transition-transform"
              >
                <div className={`w-10 h-10 ${vendor.color} rounded-xl flex items-center justify-center shrink-0 text-lg`}>
                  {vendor.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{vendor.name}</p>
                  <p className="text-xs text-gray-500">{vendor.zone}</p>
                </div>
                <MapPin className="w-4 h-4 text-gray-600 shrink-0" />
              </button>
            ))
          )}
        </div>
      )}

      <div className="h-6" />
    </div>
  );
}
