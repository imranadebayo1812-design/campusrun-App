import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { MOCK_VENDORS } from '@/lib/mockData';
import { supabase } from '@/api/supabaseClient';
import { calculateDeliveryFee, DEFAULT_SERVICE_FEE, isResidentialZone, getZoneKey } from '@/lib/deliveryPricing';
import { isOrderingOpen } from '@/lib/restaurantHours';
import { getCoordsForVenue } from '@/lib/venueCoords';
import { ChevronLeft, ChevronRight, Plus, Minus, Trash2, MapPin, ShoppingBag, Package, Search, Navigation, Upload, Bookmark, FileText, Hash } from 'lucide-react';

const LOCATION_GROUPS = [
  {
    label: 'Food Court',
    subItems: [
      "B's Chops", 'Zulkys', 'JAJ Plate', 'Trayblazers',
      'Pizza 360', 'Cherries', 'Dot Cafe', 'Papa Rimz',
      'W Sauce', 'Freenys', 'Suya 17', 'Yammy',
    ],
  },
  { label: 'Nile House',              subItems: null },
  { label: 'Student Center',          subItems: null },
  { label: 'Congo',                   subItems: null },
  { label: 'Car Park',                subItems: null },
  { label: 'Ubangi',                  subItems: null },
  { label: 'Niger',                   subItems: null },
  { label: 'Limpopo',                 subItems: null },
  { label: 'Mosque',                  subItems: null },
  { label: 'Volta',                   subItems: null },
  {
    label: 'Victoria Falls',
    subItems: ['Mississippi', 'White Nile', 'Lake Tana', 'Shebelle', 'Nile Delta', 'Lake Victoria', 'Victoria Falls Cafeteria'],
  },
  { label: 'Nile Clinic',             subItems: null },
  { label: 'Nile Laboratory',         subItems: null },
  { label: 'OpenTech',                subItems: null },
  {
    label: 'Female Shopping Complex',
    subItems: ['Mini Mart', 'Delicias', 'Female Bridan', 'Hat Lab', 'Quick Fix'],
  },
  {
    label: 'Male Shopping Complex',
    subItems: ['Male Bridan', '11:29 Restaurant', 'Smoked Restaurant', 'Printing Press'],
  },
  { label: 'Turkish Restaurant',      subItems: null },
  {
    label: 'Moat Heaven',
    subItems: ['Zambezi', 'Moat Orange', 'Black Volta', 'Red Volta', 'Blue Nile', 'Lake Chad', 'Moat Heaven Cafeteria'],
  },
];

// Restricted pickup venues for Item Purchase orders
const PURCHASE_LOCATION_GROUPS = LOCATION_GROUPS.filter(g =>
  ['Food Court', 'Student Center', 'Male Shopping Complex', 'Female Shopping Complex', 'Turkish Restaurant'].includes(g.label)
);

function generateDeliveryCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function InlineLocationSelect({ label, value, onChange, icon: Icon, iconColor, savedAddresses = [], groups = LOCATION_GROUPS }) {
  const [query, setQuery] = useState('');
  // auto-expand the group that contains the current value on first render
  const [expanded, setExpanded] = useState(() => {
    for (const g of groups) {
      if (g.subItems?.includes(value)) return new Set([g.label]);
    }
    return new Set();
  });

  const pinnedSaved = savedAddresses.filter(a => !query || a.toLowerCase().includes(query.toLowerCase()));

  const visibleGroups = groups
    .map(group => {
      if (!query) return group;
      const q = query.toLowerCase();
      const headerMatches = group.label.toLowerCase().includes(q);
      if (!group.subItems) return headerMatches ? group : null;
      const matchedSubs = group.subItems.filter(s => s.toLowerCase().includes(q));
      if (headerMatches || matchedSubs.length > 0) {
        return { ...group, subItems: headerMatches ? group.subItems : matchedSubs };
      }
      return null;
    })
    .filter(Boolean);

  function toggleGroup(lbl) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(lbl) ? next.delete(lbl) : next.add(lbl);
      return next;
    });
  }

  // while searching, treat all groups as expanded so results are visible
  const isExpanded = lbl => query ? true : expanded.has(lbl);

  return (
    <div>
      <label className="flex items-center gap-2 text-sm font-semibold text-white mb-2">
        <Icon className={`w-4 h-4 ${iconColor}`} /> {label}
      </label>
      <div className="bg-surface-900 border border-white/[0.08] rounded-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
          <Search className="w-4 h-4 text-gray-500 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search location…"
            className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 outline-none"
          />
        </div>
        <div data-scroll className="max-h-52 overflow-y-auto">
          {pinnedSaved.length > 0 && (
            <>
              {pinnedSaved.map(addr => (
                <button
                  key={`saved-${addr}`}
                  type="button"
                  onClick={() => onChange(addr)}
                  className={`w-full text-left px-4 py-3 border-b border-white/[0.05] text-sm flex items-center gap-2 transition-colors ${
                    value === addr ? 'text-brand-400 bg-brand-500/10 font-medium' : 'text-gray-300 hover:bg-white/[0.04]'
                  }`}
                >
                  <Bookmark className="w-3.5 h-3.5 text-brand-400 shrink-0" />
                  {addr}
                </button>
              ))}
              {!query && (
                <div className="px-4 py-1.5 bg-surface-800/60">
                  <p className="text-xs text-gray-600 font-semibold uppercase tracking-wider">All Locations</p>
                </div>
              )}
            </>
          )}

          {visibleGroups.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-4">No match</p>
          ) : (
            visibleGroups.map((group, gi) => {
              const isLast = gi === visibleGroups.length - 1;
              return (
              <div key={group.label}>
                {group.subItems ? (
                  /* Expandable group header — tap to reveal sub-venues */
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.label)}
                    className={`w-full text-left px-4 py-3 text-sm font-semibold flex items-center gap-2 transition-colors hover:bg-white/[0.04] ${
                      !isLast || isExpanded(group.label) ? 'border-b border-white/[0.05]' : ''
                    } ${
                      group.subItems.includes(value) ? 'text-brand-400' : 'text-white'
                    }`}
                  >
                    {group.label}
                    <ChevronRight className={`w-4 h-4 text-gray-500 shrink-0 ml-auto transition-transform duration-200 ${
                      isExpanded(group.label) ? 'rotate-90' : ''
                    }`} />
                  </button>
                ) : (
                  /* Flat zone — tap to select */
                  <button
                    type="button"
                    onClick={() => onChange(group.label)}
                    className={`w-full text-left px-4 py-3 text-sm transition-colors flex items-center gap-2 ${
                      !isLast ? 'border-b border-white/[0.05]' : ''
                    } ${
                      value === group.label
                        ? 'text-brand-400 bg-brand-500/10 font-medium'
                        : 'text-gray-300 hover:bg-white/[0.04]'
                    }`}
                  >
                    {savedAddresses.includes(group.label) && (
                      <Bookmark className="w-3.5 h-3.5 text-brand-400 shrink-0" />
                    )}
                    {group.label}
                  </button>
                )}

                {/* Sub-items — only visible when expanded */}
                {group.subItems && isExpanded(group.label) && group.subItems.map((sub, idx) => (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => onChange(sub)}
                    className={`w-full text-left pl-8 pr-4 py-2.5 border-b border-white/[0.04] text-sm flex items-center gap-2 transition-colors ${
                      idx === group.subItems.length - 1 ? 'border-b-0' : ''
                    } ${
                      value === sub
                        ? 'text-brand-400 bg-brand-500/10 font-medium'
                        : 'text-gray-400 hover:bg-white/[0.04] hover:text-gray-200'
                    }`}
                  >
                    {savedAddresses.includes(sub) && (
                      <Bookmark className="w-3.5 h-3.5 text-brand-400 shrink-0" />
                    )}
                    {sub}
                  </button>
                ))}
              </div>
            );})
          )}
        </div>
      </div>
    </div>
  );
}

function ItemDetailSheet({ item, inCart, onAdd, onClose }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={item.name}
      className="fixed inset-0 z-[200] flex items-end justify-center kb-backdrop"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)', paddingBottom: 'var(--kb, 0px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-surface-900 border border-white/[0.08] rounded-t-3xl p-5 space-y-4"
        style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="font-bold text-white text-base leading-snug flex-1">{item.name}</p>
          <button onClick={onClose} aria-label="Close" className="text-gray-400 text-xl font-bold leading-none mt-0.5">×</button>
        </div>

        <div className="bg-surface-800 border border-white/[0.06] rounded-xl px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-gray-400">Price</span>
          <span className="text-lg font-bold text-white">₦{Number(item.price).toLocaleString()}</span>
        </div>

        {item.available === false ? (
          <>
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              <p className="text-sm text-red-400 font-medium">Currently unavailable</p>
            </div>
            <button onClick={onClose} className="w-full bg-surface-800 border border-white/[0.08] text-gray-400 font-medium py-3 rounded-xl text-sm">
              Close
            </button>
          </>
        ) : (
          <button
            onClick={() => { onAdd(item); onClose(); }}
            className="w-full bg-gradient-to-br from-brand-500 to-indigo-600 hover:from-brand-600 hover:to-indigo-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-brand-500/20"
          >
            {inCart ? 'Add One More' : 'Add to Order'}
          </button>
        )}
      </div>
    </div>
  );
}

export default function CreateDeliveryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, session } = useAuth();

  const initType = location.state?.type || 'purchase';
  const initVendor = location.state?.vendor || '';
  const initVendorId = location.state?.vendorId || null;
  const initVendorName = location.state?.vendorName || null;

  // Metadata lookup — falls back to a minimal object for DB-only vendors not in MOCK_VENDORS
  const vendorMeta = initVendorId
    ? (MOCK_VENDORS.find(v => v.id === initVendorId) ||
       (initVendorName ? { id: initVendorId, name: initVendorName, zone: initVendor || 'Campus', emoji: '🏪', color: 'bg-brand-500', items: [] } : null))
    : null;

  const [orderType, setOrderType] = useState(initType);
  const [pickupLocation, setPickupLocation] = useState(initVendor || '');
  const [dropoffLocation, setDropoffLocation] = useState('');
  const [items, setItems] = useState([]);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [packageValue, setPackageValue] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch vendor metadata from DB so new vendors appear in pickup/dropoff lists
  const { data: dbVendors = [] } = useQuery({
    queryKey: ['vendors'],
    queryFn: async () => {
      const { data } = await supabase.from('vendors').select('name, zone, emoji, lat, lng');
      return data || [];
    },
    staleTime: 10 * 60 * 1000,
  });

  // Vendor meta (emoji/zone) from MOCK_VENDORS or DB vendors table; items come from DB
  // NOTE: must come after dbVendors useQuery — pickerMeta references dbVendors
  const pickerMeta = !vendorMeta && pickupLocation
    ? (MOCK_VENDORS.find(v => v.name === pickupLocation) ?? dbVendors.find(v => v.name === pickupLocation) ?? null)
    : null;
  const activeVendorMeta = vendorMeta || pickerMeta;
  const activeVendorName = activeVendorMeta?.name || null;

  // Menu fetch — reads from prefetch cache if the user came from HomePage
  const { data: menuRaw, isLoading: menuLoading } = useQuery({
    queryKey: ['menu', activeVendorName],
    queryFn: async () => {
      const [{ data: cats }, { data: items }] = await Promise.all([
        supabase.from('menu_categories').select('id, name, display_order')
          .eq('vendor_name', activeVendorName).order('display_order'),
        supabase.from('menu_items').select('id, name, price, is_available, category_id')
          .eq('vendor_name', activeVendorName).order('name'),
      ]);
      return { cats: cats || [], items: items || [] };
    },
    enabled: !!activeVendorName,
    staleTime: 5 * 60 * 1000,
  });

  const dbMenu = useMemo(() => {
    if (!menuRaw?.items?.length) return null;
    const menuItems = menuRaw.items.map(i => ({ name: i.name, price: i.price, available: i.is_available !== false }));
    const menuGroups = (menuRaw.cats || []).map(cat => ({
      label: cat.name,
      names: menuRaw.items.filter(i => i.category_id === cat.id).map(i => i.name),
    })).filter(g => g.names.length > 0);
    return { items: menuItems, menuGroups: menuGroups.length > 0 ? menuGroups : undefined };
  }, [menuRaw]);

  // Merge DB menu data onto vendor metadata
  const activeVendor = activeVendorMeta
    ? { ...activeVendorMeta, ...(dbMenu || {}) }
    : null;

  // Location groups extended with DB vendors so new vendors appear in pickup/dropoff lists
  const allPickupGroups = useMemo(() => {
    const existing = new Set(PURCHASE_LOCATION_GROUPS.flatMap(g => g.subItems ?? [g.label]));
    const extra = dbVendors.filter(v => !existing.has(v.name));
    return extra.length ? [...PURCHASE_LOCATION_GROUPS, ...extra.map(v => ({ label: v.name, subItems: null }))] : PURCHASE_LOCATION_GROUPS;
  }, [dbVendors]);

  const allLocationGroups = useMemo(() => {
    const existing = new Set(LOCATION_GROUPS.flatMap(g => g.subItems ?? [g.label]));
    const extra = dbVendors.filter(v => !existing.has(v.name));
    return extra.length ? [...LOCATION_GROUPS, ...extra.map(v => ({ label: v.name, subItems: null }))] : LOCATION_GROUPS;
  }, [dbVendors]);

  // Coords: prefer DB vendor coords, fall back to static VENUE_COORDS
  function getCoords(name) {
    const dbV = dbVendors.find(v => v.name === name);
    if (dbV?.lat && dbV?.lng) return { lat: Number(dbV.lat), lng: Number(dbV.lng) };
    return getCoordsForVenue(name);
  }

  function handlePickupChange(loc) {
    setPickupLocation(loc);
    if (MOCK_VENDORS.find(v => v.name === loc) || dbVendors.find(v => v.name === loc)) setOrderType('purchase');
  }
  const [savedAddresses, setSavedAddresses] = useState(() => {
    try { return JSON.parse(localStorage.getItem('campusrun_saved_addresses') || '[]'); }
    catch { return []; }
  });
  const [roomNumber, setRoomNumber] = useState('');
  const [documentFile, setDocumentFile] = useState(null);
  const [expandedMenuGroups, setExpandedMenuGroups] = useState(new Set());
  const [selectedItem, setSelectedItem] = useState(null);

  function toggleMenuGroup(label) {
    setExpandedMenuGroups(prev => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  }

  const isDropoffHostel = Boolean(
    dropoffLocation &&
    isResidentialZone(getZoneKey(dropoffLocation)) &&
    !dropoffLocation.toLowerCase().includes('cafeteria')
  );
  const isPrintingPress = pickupLocation === 'Printing Press' || dropoffLocation === 'Printing Press';

  function saveAddressToHistory(location) {
    if (!location) return;
    setSavedAddresses(prev => {
      const filtered = prev.filter(a => a !== location);
      const updated = [location, ...filtered].slice(0, 3);
      localStorage.setItem('campusrun_saved_addresses', JSON.stringify(updated));
      return updated;
    });
  }

  function addItem() {
    setItems(prev => [...prev, { name: '', qty: 1, price: '' }]);
  }
  function removeItem(i) {
    setItems(prev => prev.filter((_, idx) => idx !== i));
  }
  function updateItem(i, field, value) {
    setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item));
  }

  function addMenuItemToCart(menuItem) {
    setItems(prev => {
      const existing = prev.findIndex(it => it.name === menuItem.name);
      if (existing >= 0) {
        return prev.map((it, i) => i === existing ? { ...it, qty: it.qty + 1 } : it);
      }
      const entry = { name: menuItem.name, qty: 1, price: String(menuItem.price), fromMenu: true };
      if (prev.length === 1 && !prev[0].name && !prev[0].price) {
        return [entry];
      }
      return [...prev, entry];
    });
  }

  const foodCost = items.reduce((sum, it) => sum + (parseFloat(it.price) || 0) * (it.qty || 1), 0);

  let deliveryFee = 500;
  try {
    if (pickupLocation && dropoffLocation) {
      const result = calculateDeliveryFee(pickupLocation, dropoffLocation);
      deliveryFee = result.delivery_fee || 500;
    }
  } catch {
    deliveryFee = 500;
  }

  const serviceFee = profile?.pro_subscriber ? 50 : DEFAULT_SERVICE_FEE;
  const totalAmount = (orderType === 'purchase' ? foodCost : 0) + deliveryFee + serviceFee;

  async function submitOrder() {
    if (!pickupLocation || !dropoffLocation) {
      setError('Please select pickup and dropoff locations.');
      return;
    }
    if (orderType === 'purchase' && !isOrderingOpen()) {
      setError('Campus vendors are closed after 9:30 PM. Orders open again at midnight.');
      return;
    }
    if (orderType === 'purchase' && items.length === 0) {
      setError('Please select at least one item from the menu.');
      return;
    }
    if (orderType === 'purchase' && items.some(i => !i.name || !i.price)) {
      setError('Please fill in all item names and prices.');
      return;
    }

    setLoading(true);
    setError('');

    const dropoff = roomNumber.trim()
      ? `${dropoffLocation} — Room ${roomNumber.trim()}`
      : dropoffLocation;

    const pickupName = vendorMeta ? vendorMeta.name : pickupLocation;
    const orderData = {
      buyer_id: session.user.id,
      order_type: orderType,
      pickup_location: pickupName,
      dropoff_location: dropoff,
      pickup_coords:  getCoords(pickupName),
      dropoff_coords: getCoords(dropoff),
      items: orderType === 'purchase'
        ? items.map(i => ({ name: i.name, qty: i.qty, price: String(i.price) }))
        : [],
      item_description: orderType === 'errand' ? itemDescription : null,
      special_instructions: specialInstructions || null,
      food_cost: orderType === 'purchase' ? foodCost : 0,
      delivery_fee: deliveryFee,
      service_fee: serviceFee,
      total_amount: totalAmount,
      delivery_code: generateDeliveryCode(),
      status: 'pending_payment',
      payment_verified: false,
      courier_accepted: false,
    };

    const { data, error: dbErr } = await supabase
      .from('deliveries')
      .insert(orderData)
      .select()
      .single();

    if (dbErr) {
      setError('Could not place order. Please try again.');
      setLoading(false);
      return;
    }

    saveAddressToHistory(dropoffLocation);
    setLoading(false);
    navigate(`/payment/${data.id}`, { state: { delivery: data } });
  }

  const inputClass = "w-full bg-surface-800 border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50";

  return (
    <div className="bg-surface-950 min-h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-4">
        <button
          onClick={() => navigate(-1)}
          className="w-11 h-11 bg-surface-900 border border-white/[0.08] rounded-xl flex items-center justify-center shrink-0"
        >
          <ChevronLeft className="w-5 h-5 text-gray-400" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-white leading-tight">
            {activeVendorMeta ? activeVendorMeta.name : 'New Delivery'}
          </h1>
          <p className="text-xs text-gray-500">
            {activeVendorMeta ? activeVendorMeta.zone : 'Where to & what do you need?'}
          </p>
        </div>
      </div>

      <div className="px-4 space-y-5 pb-6">
        {/* Order type — hidden when coming from a vendor */}
        {!vendorMeta && (
          <div className="bg-surface-900 border border-white/[0.08] rounded-2xl p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-4">What do you need?</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setOrderType('purchase')}
                className={`p-5 rounded-2xl border-2 text-center transition-all ${
                  orderType === 'purchase'
                    ? 'border-brand-500 bg-brand-500/10'
                    : 'border-white/[0.08] bg-surface-800'
                }`}
              >
                <ShoppingBag className={`w-8 h-8 mx-auto mb-3 ${orderType === 'purchase' ? 'text-brand-400' : 'text-gray-500'}`} />
                <p className={`font-semibold text-sm ${orderType === 'purchase' ? 'text-white' : 'text-gray-400'}`}>Item Purchase</p>
                <p className={`text-xs mt-1 leading-snug ${orderType === 'purchase' ? 'text-brand-300/70' : 'text-gray-600'}`}>
                  We pick it up and bring it to you
                </p>
              </button>
              <button
                type="button"
                onClick={() => setOrderType('errand')}
                className={`p-5 rounded-2xl border-2 text-center transition-all ${
                  orderType === 'errand'
                    ? 'border-brand-500 bg-brand-500/10'
                    : 'border-white/[0.08] bg-surface-800'
                }`}
              >
                <Package className={`w-8 h-8 mx-auto mb-3 ${orderType === 'errand' ? 'text-brand-400' : 'text-gray-500'}`} />
                <p className={`font-semibold text-sm ${orderType === 'errand' ? 'text-white' : 'text-gray-400'}`}>Package / Errand</p>
                <p className={`text-xs mt-1 leading-snug ${orderType === 'errand' ? 'text-brand-300/70' : 'text-gray-600'}`}>
                  Deliver anything, anywhere on campus
                </p>
              </button>
            </div>
          </div>
        )}

        {/* Location Details */}
        <div className="bg-surface-900 border border-white/[0.08] rounded-2xl p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-4">Location Details</p>
          <div className="space-y-4">
            {/* Pickup — locked chip if vendor pre-selected */}
            {vendorMeta ? (
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-white mb-2">
                  <MapPin className="w-4 h-4 text-green-400" /> Pickup Location
                </label>
                <div className="w-full bg-surface-800/60 border border-brand-500/30 rounded-xl px-4 py-3 text-sm text-brand-300 flex items-center gap-2">
                  <span>{vendorMeta.emoji}</span>
                  <span>{vendorMeta.name} — {vendorMeta.zone}</span>
                </div>
              </div>
            ) : (
              <InlineLocationSelect
                label="Pickup Location"
                value={pickupLocation}
                onChange={handlePickupChange}
                icon={MapPin}
                iconColor="text-green-400"
                savedAddresses={savedAddresses}
                groups={orderType === 'purchase' ? allPickupGroups : allLocationGroups}
              />
            )}
            <InlineLocationSelect
              label="Drop-off Location"
              value={dropoffLocation}
              onChange={loc => { setDropoffLocation(loc); setRoomNumber(''); }}
              icon={Navigation}
              iconColor="text-brand-400"
              savedAddresses={savedAddresses}
              groups={allLocationGroups}
            />

            {/* Room number — shown for hostel sub-venues */}
            {isDropoffHostel && (
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-white mb-2">
                  <Hash className="w-4 h-4 text-brand-400" /> Room Number
                  <span className="text-gray-500 font-normal text-xs">(optional)</span>
                </label>
                <input
                  type="text"
                  value={roomNumber}
                  onChange={e => setRoomNumber(e.target.value)}
                  placeholder="e.g. 204"
                  className="w-full bg-surface-800 border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                />
              </div>
            )}
          </div>
        </div>

        {/* Vendor menu quick-add */}
        {activeVendor && orderType === 'purchase' && (
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-3">
              {activeVendor.name} Menu — Tap to add
            </p>
            {menuLoading && (
              <div className="space-y-2">
                {[1,2,3].map(i => <div key={i} className="h-12 bg-surface-800 rounded-xl animate-pulse" />)}
              </div>
            )}
            {!menuLoading && activeVendor.menuGroups ? (
              <div className="space-y-2">
                {activeVendor.menuGroups.map(group => {
                  const groupItems = group.names.map(n => activeVendor.items.find(it => it.name === n)).filter(Boolean);
                  const isOpen = expandedMenuGroups.has(group.label);
                  return (
                    <div key={group.label} className="bg-surface-900 border border-white/[0.08] rounded-xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() => toggleMenuGroup(group.label)}
                        className="w-full flex items-center justify-between px-4 py-3 border-b border-white/[0.06] hover:bg-white/[0.03] transition-colors"
                      >
                        <span className="text-sm font-semibold text-white">{group.label}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-gray-500">{groupItems.length}</span>
                          <ChevronRight className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
                        </div>
                      </button>
                      {isOpen && groupItems.map((menuItem, idx) => {
                        const inCart = items.find(it => it.name === menuItem.name);
                        return (
                          <button
                            key={menuItem.name}
                            type="button"
                            onClick={() => setSelectedItem(menuItem)}
                            className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors hover:bg-white/[0.03] active:scale-[0.99] ${
                              idx < groupItems.length - 1 ? 'border-b border-white/[0.05]' : ''
                            }`}
                          >
                            <div>
                              <p className="text-sm font-medium text-white">{menuItem.name}</p>
                              <p className="text-xs text-gray-500">₦{menuItem.price.toLocaleString()}</p>
                            </div>
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                              inCart ? 'bg-brand-500 text-white' : 'bg-surface-800 border border-white/[0.08] text-gray-400'
                            }`}>
                              {inCart ? <span className="text-xs font-bold">{inCart.qty}</span> : <Plus className="w-3.5 h-3.5" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
                {(() => {
                  const unavail = activeVendor.items.filter(it => it.available === false);
                  if (!unavail.length) return null;
                  const isOpen = expandedMenuGroups.has('__unavailable__');
                  return (
                    <div className="bg-surface-900 border border-white/[0.08] rounded-xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() => toggleMenuGroup('__unavailable__')}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.03] transition-colors"
                      >
                        <span className="text-sm font-semibold text-gray-500">Currently Unavailable</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-gray-600">{unavail.length}</span>
                          <ChevronRight className={`w-4 h-4 text-gray-600 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
                        </div>
                      </button>
                      {isOpen && unavail.map((menuItem, idx) => (
                        <button
                          key={menuItem.name}
                          type="button"
                          onClick={() => setSelectedItem(menuItem)}
                          className={`w-full flex items-center justify-between px-4 py-3 opacity-50 text-left border-t border-white/[0.05] hover:opacity-70 transition-opacity ${
                            idx < unavail.length - 1 ? 'border-b border-white/[0.05]' : ''
                          }`}
                        >
                          <div>
                            <p className="text-sm font-medium text-gray-500">{menuItem.name}</p>
                            <p className="text-xs text-gray-600">₦{menuItem.price.toLocaleString()}</p>
                          </div>
                          <span className="text-xs text-gray-600 shrink-0">Unavailable</span>
                        </button>
                      ))}
                    </div>
                  );
                })()}
              </div>
            ) : !menuLoading ? (
              <div className="space-y-1.5">
                {(activeVendor.items || []).map(menuItem => {
                  const isAvailable = menuItem.available !== false;
                  const inCart = isAvailable ? items.find(it => it.name === menuItem.name) : null;
                  return (
                    <button
                      key={menuItem.name}
                      type="button"
                      onClick={() => setSelectedItem(menuItem)}
                      className={`w-full flex items-center justify-between bg-surface-900 border rounded-xl px-4 py-3 text-left transition-all ${
                        isAvailable
                          ? 'border-white/[0.08] active:scale-[0.98] hover:border-brand-500/30 cursor-pointer'
                          : 'border-white/[0.05] opacity-50'
                      }`}
                    >
                      <div>
                        <p className={`text-sm font-medium ${isAvailable ? 'text-white' : 'text-gray-500'}`}>{menuItem.name}</p>
                        <p className="text-xs text-gray-500">₦{menuItem.price.toLocaleString()}</p>
                      </div>
                      {isAvailable ? (
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                          inCart ? 'bg-brand-500 text-white' : 'bg-surface-800 border border-white/[0.08] text-gray-400'
                        }`}>
                          {inCart ? <span className="text-xs font-bold">{inCart.qty}</span> : <Plus className="w-3.5 h-3.5" />}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-600 shrink-0">Unavailable</span>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        )}

        {/* Items list — only shown when a vendor menu is active */}
        {orderType === 'purchase' && activeVendor && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Your Order</p>
            </div>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="flex items-center gap-2 bg-surface-900 border border-white/[0.08] rounded-xl p-3">
                  {item.fromMenu ? (
                    <p className="flex-1 text-sm text-white truncate">{item.name}</p>
                  ) : (
                    <input
                      type="text"
                      value={item.name}
                      onChange={e => updateItem(i, 'name', e.target.value)}
                      placeholder="Item name"
                      className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 border-none outline-none"
                    />
                  )}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => updateItem(i, 'qty', Math.max(1, item.qty - 1))}
                      className="w-6 h-6 rounded-full bg-surface-800 border border-white/[0.08] flex items-center justify-center"
                    >
                      <Minus className="w-3 h-3 text-gray-400" />
                    </button>
                    <span className="w-5 text-center text-sm font-medium text-white">{item.qty}</span>
                    <button
                      type="button"
                      onClick={() => updateItem(i, 'qty', item.qty + 1)}
                      className="w-6 h-6 rounded-full bg-surface-800 border border-white/[0.08] flex items-center justify-center"
                    >
                      <Plus className="w-3 h-3 text-gray-400" />
                    </button>
                  </div>
                  <div className="text-right shrink-0">
                    {item.fromMenu ? (
                      <p className="text-sm font-semibold text-white w-16 text-right">
                        ₦{((parseFloat(item.price) || 0) * item.qty).toLocaleString()}
                      </p>
                    ) : (
                      <input
                        type="number"
                        value={item.price}
                        onChange={e => updateItem(i, 'price', e.target.value)}
                        placeholder="₦"
                        className="w-16 bg-transparent text-sm text-white border-b border-white/20 outline-none text-right placeholder-gray-600"
                      />
                    )}
                    {item.fromMenu && item.qty > 1 && (
                      <p className="text-xs text-gray-600 mt-0.5">₦{parseFloat(item.price).toLocaleString()} each</p>
                    )}
                    {!item.fromMenu && item.price && item.qty > 1 && (
                      <p className="text-xs text-gray-600 mt-0.5">= ₦{((parseFloat(item.price) || 0) * item.qty).toLocaleString()}</p>
                    )}
                  </div>
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(i)} className="text-red-400 ml-1 shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Package details (errand) */}
        {orderType === 'errand' && (
          <div className="bg-surface-900 border border-white/[0.08] rounded-2xl p-4 space-y-4">
            <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Package Details</p>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-white mb-1.5">
                <Package className="w-4 h-4 text-gray-400" /> Package Description
              </label>
              <textarea
                value={itemDescription}
                onChange={e => setItemDescription(e.target.value)}
                placeholder="e.g. Blue backpack, sealed envelope, printed documents"
                rows={3}
                className={`${inputClass} resize-none`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-1.5">
                Declared Package Value (₦) <span className="text-gray-500 font-normal">— max ₦10,000</span>
              </label>
              <input
                type="number"
                value={packageValue}
                onChange={e => setPackageValue(Math.min(10000, e.target.value))}
                placeholder="e.g. 5000"
                max={10000}
                className={inputClass}
              />
            </div>

            {isPrintingPress ? (
              <div>
                <label className="block text-sm font-medium text-white mb-1.5">
                  Print Document <span className="text-gray-500 font-normal">(attach file to print)</span>
                </label>
                <label className="cursor-pointer block">
                  <input
                    type="file"
                    accept=".doc,.docx,.xls,.xlsx,.ppt,.pptx,.pdf"
                    className="hidden"
                    onChange={e => setDocumentFile(e.target.files?.[0] || null)}
                  />
                  {documentFile ? (
                    <div className="flex items-center gap-3 bg-surface-800 border border-brand-500/30 rounded-xl px-4 py-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-white text-xs font-bold ${
                        documentFile.name.match(/\.(xls|xlsx)$/i) ? 'bg-green-600' :
                        documentFile.name.match(/\.(ppt|pptx)$/i) ? 'bg-orange-600' :
                        documentFile.name.match(/\.pdf$/i) ? 'bg-red-600' : 'bg-blue-600'
                      }`}>
                        {documentFile.name.match(/\.(xls|xlsx)$/i) ? 'XLS' :
                         documentFile.name.match(/\.(ppt|pptx)$/i) ? 'PPT' :
                         documentFile.name.match(/\.pdf$/i) ? 'PDF' : 'DOC'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-medium truncate">{documentFile.name}</p>
                        <p className="text-xs text-gray-500">{(documentFile.size / 1024).toFixed(0)} KB</p>
                      </div>
                      <FileText className="w-4 h-4 text-brand-400 shrink-0" />
                    </div>
                  ) : (
                    <div className="h-28 border-2 border-dashed border-brand-500/30 rounded-xl flex flex-col items-center justify-center gap-2">
                      <div className="flex gap-2">
                        {[['DOC','bg-blue-600'],['XLS','bg-green-600'],['PPT','bg-orange-600'],['PDF','bg-red-600']].map(([t,c]) => (
                          <span key={t} className={`${c} text-white text-[10px] font-bold px-1.5 py-0.5 rounded`}>{t}</span>
                        ))}
                      </div>
                      <span className="text-xs text-gray-400 font-medium">Tap to attach document</span>
                      <span className="text-xs text-gray-600">.doc · .xls · .ppt · .pdf</span>
                    </div>
                  )}
                </label>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-white mb-1.5">
                  Package Photo <span className="text-gray-500 font-normal">(optional)</span>
                </label>
                <div className="h-24 border-2 border-dashed border-white/[0.12] rounded-xl flex flex-col items-center justify-center gap-1.5">
                  <Upload className="w-6 h-6 text-gray-500" />
                  <span className="text-xs text-gray-500">Tap to add package photo</span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-white mb-1.5">
                Courier Instructions <span className="text-gray-500 font-normal">(optional)</span>
              </label>
              <textarea
                value={specialInstructions}
                onChange={e => setSpecialInstructions(e.target.value)}
                placeholder="e.g. Please call when you arrive, handle with care"
                rows={2}
                className={`${inputClass} resize-none`}
              />
            </div>
          </div>
        )}

        {/* Special instructions — purchase only */}
        {orderType === 'purchase' && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Special Instructions (optional)</label>
            <textarea
              value={specialInstructions}
              onChange={e => setSpecialInstructions(e.target.value)}
              placeholder="Any special requests…"
              rows={2}
              className={`${inputClass} resize-none`}
            />
          </div>
        )}

        {/* Cost Breakdown */}
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-3">Cost Breakdown</p>
          <div className="bg-surface-900 border border-white/[0.08] rounded-2xl p-4 space-y-3">
            {orderType === 'errand' && (
              <div className="flex items-start gap-2 bg-brand-500/10 border border-brand-500/20 rounded-xl px-3 py-2.5">
                <Package className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
                <p className="text-xs text-brand-300 leading-snug">
                  Package/Errand: You only pay the delivery & service fee. No item purchase cost.
                </p>
              </div>
            )}
            {orderType === 'purchase' && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Item Cost</span>
                <span className="text-white font-medium">₦{foodCost.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Delivery Fee</span>
              <span className="text-white font-medium">
                {pickupLocation && dropoffLocation ? `₦${deliveryFee.toLocaleString()}` : '—'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Service Fee</span>
              <span className="text-white font-medium">₦{serviceFee.toLocaleString()}</span>
            </div>
            <div className="border-t border-white/[0.08] pt-3 flex justify-between font-bold">
              <span className="text-white">Total</span>
              <span className="text-brand-400 text-lg">₦{totalAmount.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={submitOrder}
          disabled={loading}
          className="w-full bg-gradient-to-br from-brand-500 to-indigo-600 hover:from-brand-600 hover:to-indigo-700 disabled:opacity-50 text-white font-bold py-4 rounded-2xl text-base shadow-lg shadow-brand-500/20"
        >
          {loading ? 'Creating order…' : `Continue to Payment — ₦${totalAmount.toLocaleString()}`}
        </button>
      </div>

      {selectedItem && (
        <ItemDetailSheet
          item={selectedItem}
          inCart={items.some(it => it.name === selectedItem.name)}
          onAdd={addMenuItemToCart}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
}
