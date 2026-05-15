import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MOCK_VENDORS } from '@/lib/mockData';
import { Map, List } from 'lucide-react';

const CATEGORIES = [
  { key: 'all', label: '🗺️ All' },
  { key: 'food', label: '🍽️ Food' },
  { key: 'shopping', label: '🛒 Grocery' },
  { key: 'drinks', label: '☕ Drinks' },
  { key: 'snacks', label: '🍟 Snacks' },
];

export default function CampusMapPage() {
  const navigate = useNavigate();
  const [view, setView] = useState('map');
  const [category, setCategory] = useState('all');

  const filteredVendors = MOCK_VENDORS.filter(v =>
    category === 'all' || v.category === category
  );

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
            <Map className="w-3.5 h-3.5" /> Map
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
            <iframe
              title="Campus Map"
              width="100%"
              height="100%"
              frameBorder="0"
              scrolling="no"
              src="https://www.openstreetmap.org/export/embed.html?bbox=7.3930%2C9.0100%2C7.4020%2C9.0220&layer=mapnik&marker=9.0158%2C7.3972"
              style={{ display: 'block' }}
            />
          </div>
          <p className="text-xs text-gray-600 text-center mt-2">
            Nile University of Nigeria · Abuja
          </p>
        </div>
      )}

      {/* List view */}
      {view === 'list' && (
        <div className="px-4 space-y-2 flex-1">
          {filteredVendors.length === 0 ? (
            <p className="text-center text-gray-500 py-12 text-sm">No vendors in this category</p>
          ) : (
            filteredVendors.map(vendor => (
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
                <div className="text-right shrink-0">
                  <p className="text-xs text-gray-400">{vendor.items[0].name}</p>
                  <p className="text-xs text-brand-400 font-semibold mt-0.5">from ₦{vendor.items[0].price.toLocaleString()}</p>
                </div>
              </button>
            ))
          )}
        </div>
      )}

      <div className="h-6" />
    </div>
  );
}
