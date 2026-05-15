import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { MOCK_ORDERS } from '@/lib/mockData';
import { calculateDeliveryFee, DEFAULT_SERVICE_FEE } from '@/lib/deliveryPricing';
import { ChevronLeft, Plus, Minus, Trash2, MapPin, ShoppingBag, Package } from 'lucide-react';

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

function LocationInput({ label, value, onChange, placeholder, iconColor }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1.5 flex items-center gap-1.5">
        <MapPin className={`w-4 h-4 ${iconColor}`} /> {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        list="campus-zones"
        className="w-full bg-surface-800 border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
      />
    </div>
  );
}

export default function CreateDeliveryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();

  const initType = location.state?.type || 'purchase';
  const initVendor = location.state?.vendor || '';

  const [orderType, setOrderType] = useState(initType);
  const [pickupLocation, setPickupLocation] = useState(initVendor || '');
  const [dropoffLocation, setDropoffLocation] = useState('');
  const [items, setItems] = useState([{ name: '', qty: 1, price: '' }]);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [packageValue, setPackageValue] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  const { delivery_fee: deliveryFee = 500 } = (() => {
    if (!pickupLocation || !dropoffLocation) return { delivery_fee: 500 };
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

    await new Promise(r => setTimeout(r, 500));

    const { delivery_fee: fee } = calculateDeliveryFee(pickupLocation, dropoffLocation);
    const deliveryCode = generateDeliveryCode();
    const newOrder = {
      id: `order-${Date.now()}`,
      buyer_id: 'user-1',
      order_type: orderType,
      pickup_location: pickupLocation,
      dropoff_location: dropoffLocation,
      items: orderType === 'purchase' ? items : [],
      item_description: orderType === 'errand' ? itemDescription : '',
      package_value: orderType === 'errand' ? parseFloat(packageValue) || 0 : null,
      special_instructions: specialInstructions,
      food_cost: orderType === 'purchase' ? foodCost : 0,
      delivery_fee: fee || deliveryFee,
      service_fee: serviceFee,
      total_amount: (orderType === 'purchase' ? foodCost : 0) + (fee || deliveryFee) + serviceFee,
      delivery_code: deliveryCode,
      status: 'placed',
      courier_accepted: false,
      courier_name: null,
      created_at: new Date().toISOString(),
    };

    MOCK_ORDERS.unshift(newOrder);
    setLoading(false);
    navigate(`/payment/${newOrder.id}`, { state: { delivery: newOrder } });
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
              <p className="text-xs text-gray-500 mt-0.5">Food & vendors</p>
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
          <datalist id="campus-zones">
            {CAMPUS_ZONES.map(z => <option key={z} value={z} />)}
          </datalist>
          <div className="space-y-3">
            <LocationInput
              label={orderType === 'purchase' ? 'Pickup (Vendor / Location)' : 'Pickup Location'}
              value={pickupLocation}
              onChange={setPickupLocation}
              placeholder="e.g. Food Court"
              iconColor="text-brand-400"
            />
            <LocationInput
              label="Dropoff Location"
              value={dropoffLocation}
              onChange={setDropoffLocation}
              placeholder="e.g. Nile Hall A"
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
