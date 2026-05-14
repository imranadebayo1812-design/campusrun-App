import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { calculateDeliveryFee, DEFAULT_SERVICE_FEE } from '@/lib/deliveryPricing';
import { ChevronLeft, Plus, Minus, Trash2, MapPin, ShoppingBag, Package } from 'lucide-react';

const CAMPUS_ZONES = [
  'Food Court', 'Student Center', 'Library', 'Main Gate', 'Back Gate',
  'Nile Hall A', 'Nile Hall B', 'Nile Hall C', 'Nile Hall D',
  'Victoria Falls', 'Moat Heaven', 'Sports Complex', 'Admin Block',
  'Faculty of Engineering', 'Faculty of Sciences', 'Faculty of Law',
  'Faculty of Social Sciences', 'Medical Center', 'Chapel', 'Mosque',
];

function generateDeliveryCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export default function CreateDeliveryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, profile } = useAuth();

  const initType = location.state?.type || 'purchase';
  const initVendor = location.state?.vendor || '';

  const [orderType, setOrderType] = useState(initType);
  const [pickupLocation, setPickupLocation] = useState(initVendor ? `${initVendor}` : '');
  const [dropoffLocation, setDropoffLocation] = useState('');
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

  const { fee: deliveryFee, isResidential } = (() => {
    if (!pickupLocation || !dropoffLocation) return { fee: 500, isResidential: false };
    return calculateDeliveryFee(pickupLocation, dropoffLocation);
  })();

  const serviceFee = profile?.pro_subscriber ? 50 : DEFAULT_SERVICE_FEE;
  const totalAmount = (orderType === 'purchase' ? foodCost : 0) + deliveryFee + serviceFee;

  async function submitOrder() {
    if (!pickupLocation || !dropoffLocation) {
      setError('Please fill in pickup and dropoff locations.');
      return;
    }
    if (orderType === 'purchase' && items.some(i => !i.name || !i.price)) {
      setError('Please fill in all item names and prices.');
      return;
    }

    setLoading(true);
    setError('');

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
        delivery_fee: deliveryFee,
        service_fee: serviceFee,
        total_amount: totalAmount,
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

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-600">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold text-gray-900">New Order</h1>
      </div>

      {/* Order type */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setOrderType('purchase')}
          className={`flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-all ${
            orderType === 'purchase' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-600'
          }`}
        >
          <ShoppingBag className="w-4 h-4" /> Food Order
        </button>
        <button
          onClick={() => setOrderType('errand')}
          className={`flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-all ${
            orderType === 'errand' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-600'
          }`}
        >
          <Package className="w-4 h-4" /> Send Package
        </button>
      </div>

      {/* Locations */}
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
            <MapPin className="w-4 h-4 text-brand-500" />
            {orderType === 'purchase' ? 'Pickup (Vendor)' : 'Pickup Location'}
          </label>
          {orderType === 'purchase' ? (
            <input
              type="text"
              value={pickupLocation}
              onChange={e => setPickupLocation(e.target.value)}
              placeholder="e.g. Food Court"
              list="zone-list"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          ) : (
            <select
              value={pickupLocation}
              onChange={e => setPickupLocation(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            >
              <option value="">Select pickup location…</option>
              {CAMPUS_ZONES.map(z => <option key={z} value={z}>{z}</option>)}
            </select>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
            <MapPin className="w-4 h-4 text-green-500" /> Dropoff Location
          </label>
          <select
            value={dropoffLocation}
            onChange={e => setDropoffLocation(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
          >
            <option value="">Select dropoff location…</option>
            {CAMPUS_ZONES.map(z => <option key={z} value={z}>{z}</option>)}
          </select>
        </div>
      </div>

      <datalist id="zone-list">
        {CAMPUS_ZONES.map(z => <option key={z} value={z} />)}
      </datalist>

      {/* Items (purchase) */}
      {orderType === 'purchase' && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">Items</label>
            <button onClick={addItem} className="text-brand-600 text-xs font-semibold flex items-center gap-1">
              <Plus className="w-3 h-3" /> Add item
            </button>
          </div>

          {menuItems.length > 0 && (
            <div className="mb-3 p-3 bg-gray-50 rounded-xl">
              <p className="text-xs font-semibold text-gray-600 mb-2">Quick add from menu:</p>
              <div className="flex flex-wrap gap-1.5">
                {menuItems.slice(0, 6).map(m => (
                  <button
                    key={m.id}
                    onClick={() => setItems(prev => [...prev, { name: m.name, qty: 1, price: m.price }])}
                    className="text-xs bg-white border border-gray-200 rounded-lg px-2 py-1 text-gray-700"
                  >
                    {m.name} — ₦{m.price}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            {items.map((item, i) => (
              <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-xl p-2">
                <input
                  type="text"
                  value={item.name}
                  onChange={e => updateItem(i, 'name', e.target.value)}
                  placeholder="Item name"
                  className="flex-1 bg-transparent text-sm border-none outline-none"
                />
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => updateItem(i, 'qty', Math.max(1, item.qty - 1))} className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-5 text-center text-sm font-medium">{item.qty}</span>
                  <button onClick={() => updateItem(i, 'qty', item.qty + 1)} className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <input
                  type="number"
                  value={item.price}
                  onChange={e => updateItem(i, 'price', e.target.value)}
                  placeholder="₦"
                  className="w-16 bg-transparent text-sm border-b border-gray-300 outline-none text-right"
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
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Package Description</label>
            <input
              type="text"
              value={itemDescription}
              onChange={e => setItemDescription(e.target.value)}
              placeholder="e.g. Books, laptop bag"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Package Value (max ₦10,000)</label>
            <input
              type="number"
              value={packageValue}
              onChange={e => setPackageValue(Math.min(10000, e.target.value))}
              placeholder="0"
              max={10000}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>
        </div>
      )}

      {/* Instructions */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Special Instructions (optional)</label>
        <textarea
          value={specialInstructions}
          onChange={e => setSpecialInstructions(e.target.value)}
          placeholder="Any special requests…"
          rows={2}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
        />
      </div>

      {/* Fee summary */}
      <div className="bg-gray-50 rounded-xl p-4 space-y-2">
        {orderType === 'purchase' && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Food cost</span>
            <span className="font-medium">₦{foodCost.toLocaleString()}</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Delivery fee</span>
          <span className="font-medium">₦{deliveryFee.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Service fee</span>
          <span className="font-medium">₦{serviceFee.toLocaleString()}</span>
        </div>
        <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-gray-900">
          <span>Total</span>
          <span className="text-brand-600">₦{totalAmount.toLocaleString()}</span>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <button
        onClick={submitOrder}
        disabled={loading}
        className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-bold py-4 rounded-2xl text-base shadow-lg"
      >
        {loading ? 'Creating order…' : `Proceed to Pay — ₦${totalAmount.toLocaleString()}`}
      </button>
    </div>
  );
}
