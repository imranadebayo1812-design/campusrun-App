import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MOCK_ORDERS } from '@/lib/mockData';
import { ChevronLeft, Package, Clock, CheckCircle, MapPin, Star } from 'lucide-react';

const STATUS_STEPS = [
  { key: 'placed', label: 'Order placed', icon: Package },
  { key: 'bought', label: 'Items bought', icon: CheckCircle },
  { key: 'on_the_way', label: 'On the way', icon: MapPin },
  { key: 'arrived', label: 'Arrived', icon: MapPin },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle },
];

function StatusStep({ step, currentStatus }) {
  const statuses = STATUS_STEPS.map(s => s.key);
  const currentIndex = statuses.indexOf(currentStatus);
  const stepIndex = statuses.indexOf(step.key);
  const done = stepIndex <= currentIndex;
  const active = stepIndex === currentIndex;
  const Icon = step.icon;

  return (
    <div className="flex items-center gap-3">
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
        done ? 'bg-brand-500 text-white' : 'bg-surface-800 text-gray-600'
      } ${active ? 'ring-4 ring-brand-500/20' : ''}`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className={`text-sm font-medium ${done ? 'text-white' : 'text-gray-500'}`}>{step.label}</p>
    </div>
  );
}

export default function TrackingPage() {
  const { deliveryId } = useParams();
  const navigate = useNavigate();
  const [cancelling, setCancelling] = useState(false);
  const [localStatus, setLocalStatus] = useState(null);

  const orderIndex = MOCK_ORDERS.findIndex(o => o.id === deliveryId);
  const baseOrder = MOCK_ORDERS[orderIndex];

  if (!baseOrder) {
    return <div className="p-4 text-center text-gray-500 pt-20">Order not found.</div>;
  }

  const delivery = localStatus ? { ...baseOrder, status: localStatus } : baseOrder;

  const isCancelled = delivery.status === 'cancelled';
  const isDelivered = delivery.status === 'delivered';
  const canCancel = !isCancelled && !isDelivered && !delivery.courier_accepted;

  function cancelOrder() {
    setCancelling(true);
    setTimeout(() => {
      if (orderIndex !== -1) MOCK_ORDERS[orderIndex].status = 'cancelled';
      setLocalStatus('cancelled');
      setCancelling(false);
    }, 800);
  }

  return (
    <div className="bg-surface-950 min-h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-4">
        <button
          onClick={() => navigate('/orders')}
          className="w-9 h-9 bg-surface-900 border border-white/[0.08] rounded-xl flex items-center justify-center"
        >
          <ChevronLeft className="w-5 h-5 text-gray-400" />
        </button>
        <h1 className="text-lg font-bold text-white">Track Order</h1>
        <span className={`ml-auto text-xs font-semibold px-3 py-1 rounded-full ${
          isCancelled ? 'bg-red-500/15 text-red-400' :
          isDelivered ? 'bg-green-500/15 text-green-400' :
          'bg-brand-500/15 text-brand-400'
        }`}>
          {isCancelled ? 'Cancelled' : isDelivered ? 'Delivered' : 'Active'}
        </span>
      </div>

      <div className="px-4 space-y-4 pb-6">
        {/* Route */}
        <div className="bg-surface-900 border border-white/[0.08] rounded-2xl p-4 space-y-3">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-brand-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Pickup</p>
              <p className="text-sm font-medium text-white">{delivery.pickup_location}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Dropoff</p>
              <p className="text-sm font-medium text-white">{delivery.dropoff_location}</p>
            </div>
          </div>
        </div>

        {/* Delivery code */}
        {!isDelivered && !isCancelled && (
          <div className="bg-brand-500/10 border border-brand-500/20 rounded-2xl p-4 text-center">
            <p className="text-xs text-brand-400 font-medium mb-2">Delivery Code</p>
            <p className="text-5xl font-bold tracking-[0.3em] text-white">{delivery.delivery_code}</p>
            <p className="text-xs text-gray-500 mt-2">Share this with your courier when they arrive</p>
          </div>
        )}

        {/* Courier info */}
        {delivery.courier_accepted && delivery.courier_name && (
          <div className="bg-surface-900 border border-white/[0.08] rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 font-bold text-sm">
              {delivery.courier_name[0]}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">{delivery.courier_name}</p>
              <p className="text-xs text-gray-500">Your courier</p>
            </div>
          </div>
        )}

        {!delivery.courier_accepted && !isCancelled && (
          <div className="flex items-center gap-2 text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-xl p-3">
            <Clock className="w-4 h-4 animate-pulse" />
            <p className="text-sm">Finding a courier for you…</p>
          </div>
        )}

        {/* Items */}
        {delivery.order_type === 'purchase' && delivery.items?.length > 0 && (
          <div className="bg-surface-900 border border-white/[0.08] rounded-2xl p-4">
            <p className="text-xs font-semibold text-gray-400 mb-2">Order Items</p>
            {delivery.items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm text-gray-300 py-0.5">
                <span>{item.qty}× {item.name}</span>
                <span>₦{(parseFloat(item.price) * item.qty).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}

        {/* Status timeline */}
        <div className="bg-surface-900 border border-white/[0.08] rounded-2xl p-4">
          <p className="text-sm font-semibold text-white mb-4">Order Status</p>
          <div className="space-y-4">
            {STATUS_STEPS.map(step => (
              <StatusStep key={step.key} step={step} currentStatus={delivery.status} />
            ))}
          </div>
        </div>

        {/* Post-delivery actions */}
        {isDelivered && (
          <div className="space-y-2">
            <button className="w-full bg-brand-500/10 border border-brand-500/20 text-brand-400 font-semibold py-3 rounded-xl text-sm">
              Add a tip for your courier
            </button>
            <button className="w-full flex items-center justify-center gap-2 bg-surface-900 border border-white/[0.08] text-gray-300 font-semibold py-3 rounded-xl text-sm">
              <Star className="w-4 h-4" /> Leave feedback
            </button>
          </div>
        )}

        {/* Cancel */}
        {canCancel && (
          <button
            onClick={cancelOrder}
            disabled={cancelling}
            className="w-full bg-red-500/10 border border-red-500/30 text-red-400 font-medium py-3 rounded-xl text-sm"
          >
            {cancelling ? 'Cancelling…' : 'Cancel Order'}
          </button>
        )}
      </div>
    </div>
  );
}
