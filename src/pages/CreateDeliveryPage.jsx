import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { calculateDeliveryFee, DEFAULT_SERVICE_FEE } from '@/lib/deliveryPricing';
import { ChevronLeft, Plus, Minus, Trash2, MapPin, ShoppingBag, Package, Search } from 'lucide-react';

const CAMPUS_ZONES = [
  'Food Court', 'Car Park', 'Moat Heaven', 'Victoria Falls',
  'Female Shopping Complex', 'Student Center', 'Library', 'Main Gate',
  'Back Gate', 'Nile Hall A', 'Nile Hall B', 'Nile Hall C', 'Nile Hall D',
  'Sports Complex', 'Admin Block', 'Faculty of Engineering',
  'Faculty of Sciences', 'Faculty of Law', 'Faculty of Social Sciences',
  'Medical Center', 'Chapel', 'Mosque',
];

function generateDeliveryCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function LocationPickerButton({ label, value, onOpen, placeholder, icon: Icon, iconColor }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1.5 flex items-center gap-1.5">
        <Icon className={`w-4 h-4 ${iconColor}`} /> {label}
      </label>
      <button
        type="button"
        onClick={onOpen}
        className="w-full bg-surface-800 border border-white/[0.08] rounded-xl px-4 py-3 text-left text-sm flex items-center justify-between"
      >
        <span className={value ? 'text-white' : 'text-gray-500'}>{value || placeholder}</span>
        <ChevronLeft className="w-4 h-4 text-gray-500 rotate-[-90deg]" />
      </button>
    </div>
  );
}

function LocationPickerModal({ title, currentValue, onSelect, onClose }) {
  const [search, setSearch] = useState('');
  const filtered = CAMPUS_ZONES.filter(z =>
    z.toLowerCase().includes(search.toLowerCase())
  );

  return createPortal(
    <>
      {/* backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          backgroundColor: 'rgba(0,0,0,0.75)',
        }}
      />
      {/* bottom sheet */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
          backgroundColor: '#1a1a2e',
          borderTopLeftRadius: 16, borderTopRightRadius: 16,
          maxHeight: '70vh',
          display: 'flex', flexDirection: 'column',
        }}
      >
        <div className="p-4 border-b border-white/[0.08]">
          <p className="text-white font-semibold text-center mb-3">{title}</p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search location…"
              className="w-full bg-surface-800 border border-white/[0.08] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
            />
          </div>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {filtered.map(zone => (
            <button
              key={zone}
              type="button"
              onClick={() => onSelect(zone)}
              className={`w-full px-4 py-3.5 text-left text-sm border-b border-white/[0.05] flex items-center gap-3 ${
                currentValue === zone ? 'text-brand-400 bg-brand-500/10' : 'text-white'
              }`}
            >
              <MapPin className={`w-4 h-4 shrink-0 ${currentValue === zone ? 'text-brand-400' : 'text-gray-500'}`} />
              {zone}
            </button>
          ))}
        </div>
        <div className="p-4 border-t border-white/[0.08]">
          <button
            type="button"
            onClick={onClose}
            className="w-full bg-surface-800 text-gray-400 font-semibold py-3 rounded-xl text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}

export default function CreateDeliveryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, profile } = useAuth();

  const initType = location.state?.type || 'purchase';
  const initVendor = location.state?.vendor || '';

  const [orderType, setOrderType] = useState(initType);
  const [pickupLocation, setPickupLocation] = useState(initVendor || '');
  const [dropoffLocation, setDropoffLocation] = useState('');
  const [activePicker, setActivePicker] = useState(null);
  const [items, setItems] = useState([{ name: '', qty: 1, price: '' }]);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [packageValue, setPackageValue] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { data: menuItems = [] } = useQuery({
    queryKey: ['menu-items', pickupLocation],
    queryFn: async () => {
      if (!pickupLocation) return [];
      const { data } = await supabase
        .from('menu_items')
        .select('*')
        .eq('vendor_name', pickupLocation)
        .eq('is_available', true);
      return data || [];
    },
    enabled: !!pickupLocation && orderType === 'purchase',
  });

  function addItem() {
    setItems(prev => [...prev, { name: '', qty: 1, price: '' }]);
  }
  function removeItem(i) {
    setItems(prev => prev.filter((_, idx) => idx !== i));
  }
  function updateItem(i, field, value) {
    setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item));
  }

  const foodCost = items.reduce((sum, it) => sum + (parseFloat(it.price) || 0) * (it.qty || 1), 0);

  const { fee: deliveryFee } = (() => {
    if (!pickupLocation || !dropoffLocation) return { fee: 500 };
    return calculateDeliveryFee(pickupLocation, dropoffLocation);
  })();

  const serviceFee = profile?.pro_subscriber ? 50 : DEFAULT_SERVICE_FEE;
  const totalAmount = (orderType === 'purchase' ? foodCost : 0) + deliveryFee + serviceFee;

  async function submitOrder() {
    if (!pickupLocation || !dropoffLocation) {
      setError('Please select pickup and dropoff locations.');
      return;
    }
    if (orderType === 'purchase' && items.some(i => !i.name || !i.price)) {
      setError('Please fill in all item names and prices.');
      return;
    }

    setLoading(true);
    setError('');

    const { fee, isResidential } = calculateDeliveryFee(pickupLocation, dropoffLocation);
    const deliveryCode = generateDeliveryCode();

    const { data, error: insertError } = await supabase
      .from('deliveries')
      .insert({
        buyer_id: session.user.id,
        order_type: orderType,
        pickup_location: pickupLocation,
        dropoff_location: dropoffLocation,
        is_residential: isResidential,
        items: orderType === 'purchase' ? items : [],
        item_description: orderType === 'errand' ? itemDescription : '',
        package_value: orderType === 'errand' ? parseFloat(packageValue) || 0 : null,
        special_instructions: specialInstructions,
        food_cost: orderType === 'purchase' ? foodCost : 0,
        delivery_fee: fee,
        service_fee: serviceFee,
        total_amount: (orderType === 'purchase' ? foodCost : 0) + fee + serviceFee,
        delivery_code: deliveryCode,
        status: 'placed',
      })
      .select()
      .single();

    setLoading(false);

    if (insertError) {
      setError('Failed to create order. Please try again.');
      return;
    }

    navigate(`/payment/${data.id}`, { state: { delivery: data } });
  }

  const inputClass = "w-full bg-surface-800 border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50";

  return (
    <div className="bg-surface-950 min-h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-4">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 bg-surface-900 border border-white/[0.08] rounded-xl flex items-center justify-center"
        >
          <ChevronLeft className="w-5 h-5 text-gray-400" />
        </button>
        <h1 className="text-lg font-bold text-white">New Delivery</h1>
      </div>

      <div className="px-4 space-y-5 pb-6">
        {/* Order type */}
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-3">What do you need?</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setOrderType('purchase')}
              className={`p-4 rounded-2xl border-2 text-left transition-all ${
                orderType === 'purchase'
                  ? 'border-brand-500 bg-brand-500/10'
                  : 'border-white/[0.08] bg-surface-900'
              }`}
            >
              <ShoppingBag className={`w-6 h-6 mb-2 ${orderType === 'purchase' ? 'text-brand-400' : 'text-gray-500'}`} />
              <p className={`font-semibold text-sm ${orderType === 'purchase' ? 'text-white' : 'text-gray-400'}`}>Item Purchase</p>
              <p className="text-xs text-gray-500 mt-0.5">Food &amp; vendors</p>
            </button>
            <button
              onClick={() => setOrderType('errand')}
              className={`p-4 rounded-2xl border-2 text-left transition-all ${
                orderType === 'errand'
                  ? 'border-brand-500 bg-brand-500/10'
                  : 'border-white/[0.08] bg-surface-900'
              }`}
            >
              <Package className={`w-6 h-6 mb-2 ${orderType === 'errand' ? 'text-brand-400' : 'text-gray-500'}`} />
              <p className={`font-semibold text-sm ${orderType === 'errand' ? 'text-white' : 'text-gray-400'}`}>Package / Errand</p>
              <p className="text-xs text-gray-500 mt-0.5">Send items</p>
            </button>
          </div>
        </div>

        {/* Location Details */}
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-3">Location Details</p>
          <div className="space-y-3">
            <LocationPickerButton
              label={orderType === 'purchase' ? 'Pickup (Vendor / Location)' : 'Pickup Location'}
              value={pickupLocation}
              onOpen={() => setActivePicker('pickup')}
              placeholder="Select pickup location…"
              icon={MapPin}
              iconColor="text-brand-400"
            />
            <LocationPickerButton
              label="Dropoff Location"
              value={dropoffLocation}
              onOpen={() => setActivePicker('dropoff')}
              placeholder="Select dropoff location…"
              icon={MapPin}
              iconColor="text-green-400"
            />
          </div>
        </div>

        {/* Items (purchase) */}
        {orderType === 'purchase' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Item Details</p>
              <button onClick={addItem} className="text-brand-400 text-xs font-semibold flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add item
              </button>
            </div>

            {menuItems.length > 0 && (
              <div className="mb-3 p-3 bg-surface-900 border border-white/[0.08] rounded-xl">
                <p className="text-xs font-semibold text-gray-400 mb-2">Quick add from menu:</p>
                <div className="flex flex-wrap gap-1.5">
                  {menuItems.slice(0, 6).map(m => (
                    <button
                      key={m.id}
                      onClick={() => setItems(prev => [...prev, { name: m.name, qty: 1, price: m.price }])}
                      className="text-xs bg-surface-800 border border-white/[0.08] rounded-lg px-2.5 py-1 text-gray-300"
                    >
                      {m.name} — ₦{m.price}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="flex items-center gap-2 bg-surface-900 border border-white/[0.08] rounded-xl p-3">
                  <input
                    type="text"
                    value={item.name}
                    onChange={e => updateItem(i, 'name', e.target.value)}
                    placeholder="Item name"
                    className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 border-none outline-none"
                  />
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => updateItem(i, 'qty', Math.max(1, item.qty - 1))}
                      className="w-6 h-6 rounded-full bg-surface-800 border border-white/[0.08] flex items-center justify-center"
                    >
                      <Minus className="w-3 h-3 text-gray-400" />
                    </button>
                    <span className="w-5 text-center text-sm font-medium text-white">{item.qty}</span>
                    <button
                      onClick={() => updateItem(i, 'qty', item.qty + 1)}
                      className="w-6 h-6 rounded-full bg-surface-800 border border-white/[0.08] flex items-center justify-center"
                    >
                      <Plus className="w-3 h-3 text-gray-400" />
                    </button>
                  </div>
                  <input
                    type="number"
                    value={item.price}
                    onChange={e => updateItem(i, 'price', e.target.value)}
                    placeholder="₦"
                    className="w-16 bg-transparent text-sm text-white border-b border-white/20 outline-none text-right placeholder-gray-600"
                  />
                  {items.length > 1 && (
                    <button onClick={() => removeItem(i)} className="text-red-400 ml-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Package info (errand) */}
        {orderType === 'errand' && (
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-3">Package Details</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Description</label>
                <input
                  type="text"
                  value={itemDescription}
                  onChange={e => setItemDescription(e.target.value)}
                  placeholder="e.g. Books, laptop bag"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Value (max ₦10,000)</label>
                <input
                  type="number"
                  value={packageValue}
                  onChange={e => setPackageValue(Math.min(10000, e.target.value))}
                  placeholder="0"
                  max={10000}
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        )}

        {/* Special instructions */}
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

        {/* Cost Breakdown */}
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-3">Cost Breakdown</p>
          <div className="bg-surface-900 border border-white/[0.08] rounded-2xl p-4 space-y-3">
            {orderType === 'purchase' && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Item Cost</span>
                <span className="text-white font-medium">₦{foodCost.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Delivery Fee</span>
              <span className="text-white font-medium">₦{deliveryFee.toLocaleString()}</span>
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

        {activePicker && (
          <LocationPickerModal
            title={activePicker === 'pickup' ? (orderType === 'purchase' ? 'Pickup (Vendor / Location)' : 'Pickup Location') : 'Dropoff Location'}
            currentValue={activePicker === 'pickup' ? pickupLocation : dropoffLocation}
            onSelect={zone => {
              if (activePicker === 'pickup') setPickupLocation(zone);
              else setDropoffLocation(zone);
              setActivePicker(null);
            }}
            onClose={() => setActivePicker(null)}
          />
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        <button
          onClick={submitOrder}
          disabled={loading}
          className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-bold py-4 rounded-2xl text-base shadow-lg shadow-brand-500/20"
        >
          {loading ? 'Creating order…' : `Proceed to Payment — ₦${totalAmount.toLocaleString()}`}
        </button>
      </div>
    </div>
  );
}
