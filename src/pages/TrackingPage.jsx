import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { ChevronLeft, Package, Clock, CheckCircle, MapPin, Phone, MessageCircle, AlertCircle, Star } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import ChatModal from '@/components/buyer/ChatModal';
import TipModal from '@/components/buyer/TipModal';
import FeedbackModal from '@/components/buyer/FeedbackModal';

const STATUS_STEPS = [
  { key: 'placed', label: 'Order placed', icon: Package },
  { key: 'bought', label: 'Items bought', icon: CheckCircle },
  { key: 'on_the_way', label: 'On the way', icon: MapPin },
  { key: 'arrived', label: 'Arrived', icon: MapPin },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle },
];

function StatusStep({ step, currentStatus, index }) {
  const statuses = STATUS_STEPS.map(s => s.key);
  const currentIndex = statuses.indexOf(currentStatus);
  const stepIndex = statuses.indexOf(step.key);
  const done = stepIndex <= currentIndex;
  const active = stepIndex === currentIndex;
  const Icon = step.icon;

  return (
    <div className="flex items-start gap-3">
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
        done ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-400'
      } ${active ? 'ring-4 ring-brand-100' : ''}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 pt-1">
        <p className={`text-sm font-medium ${done ? 'text-gray-900' : 'text-gray-400'}`}>{step.label}</p>
      </div>
      {index < STATUS_STEPS.length - 1 && (
        <div className={`absolute left-4 mt-8 w-0.5 h-6 ${done ? 'bg-brand-300' : 'bg-gray-200'}`} style={{ marginLeft: '-1px' }} />
      )}
    </div>
  );
}

export default function TrackingPage() {
  const { deliveryId } = useParams();
  const navigate = useNavigate();
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [showChat, setShowChat] = useState(false);
  const [showTip, setShowTip] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const { data: delivery, isLoading } = useQuery({
    queryKey: ['delivery', deliveryId],
    queryFn: async () => {
      const { data } = await supabase
        .from('deliveries')
        .select('*, profiles!courier_id(full_name, phone_number, avatar_url)')
        .eq('id', deliveryId)
        .single();
      return data;
    },
    refetchInterval: (data) => {
      if (!data || ['delivered', 'cancelled'].includes(data?.status)) return false;
      return 10_000;
    },
  });

  const canCancel = delivery && !['delivered', 'cancelled'].includes(delivery.status) && !delivery.courier_accepted;

  async function cancelOrder() {
    if (!window.confirm('Cancel this order?')) return;
    setCancelling(true);
    await supabase
      .from('deliveries')
      .update({ status: 'cancelled', cancelled_by: 'buyer', cancellation_reason: 'Cancelled by buyer' })
      .eq('id', deliveryId);
    queryClient.invalidateQueries(['delivery', deliveryId]);
    setCancelling(false);
  }

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" /></div>;
  }

  if (!delivery) {
    return <div className="p-4 text-center text-gray-500">Order not found.</div>;
  }

  const isCancelled = delivery.status === 'cancelled';
  const isDelivered = delivery.status === 'delivered';

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/orders')} className="p-2 -ml-2 text-gray-600">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold text-gray-900">Track Order</h1>
        <span className={`ml-auto text-xs font-semibold px-2 py-1 rounded-full ${
          isCancelled ? 'bg-red-100 text-red-700' :
          isDelivered ? 'bg-green-100 text-green-700' :
          'bg-brand-100 text-brand-700'
        }`}>
          {isCancelled ? 'Cancelled' : isDelivered ? 'Delivered' : 'Active'}
        </span>
      </div>

      {/* Route */}
      <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 text-brand-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-gray-500">Pickup</p>
            <p className="text-sm font-medium text-gray-900">{delivery.pickup_location}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-gray-500">Dropoff</p>
            <p className="text-sm font-medium text-gray-900">{delivery.dropoff_location}</p>
          </div>
        </div>
      </div>

      {/* Delivery code */}
      {!isDelivered && !isCancelled && (
        <div className="bg-brand-50 border border-brand-100 rounded-2xl p-4 text-center">
          <p className="text-xs text-brand-600 font-medium mb-1">Delivery Code</p>
          <p className="text-4xl font-bold tracking-[0.3em] text-brand-700">{delivery.delivery_code}</p>
          <p className="text-xs text-brand-500 mt-1">Share this with your courier when they arrive</p>
        </div>
      )}

      {/* Courier info */}
      {delivery.courier_accepted && delivery.profiles && (
        <div className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-sm">
            {delivery.profiles.full_name?.[0] || 'C'}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900">{delivery.profiles.full_name}</p>
            <p className="text-xs text-gray-500">Your courier</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowChat(true)}
              className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center"
            >
              <MessageCircle className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>
      )}

      {!delivery.courier_accepted && !isCancelled && (
        <div className="flex items-center gap-2 text-amber-700 bg-amber-50 rounded-xl p-3">
          <Clock className="w-4 h-4 animate-pulse" />
          <p className="text-sm">Finding a courier for you…</p>
        </div>
      )}

      {/* Status timeline */}
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-3">Order Status</p>
        <div className="relative space-y-4 pl-4">
          {STATUS_STEPS.map((step, i) => (
            <StatusStep key={step.key} step={step} currentStatus={delivery.status} index={i} />
          ))}
        </div>
      </div>

      {/* Price edit alert */}
      {delivery.price_edit_flag && !delivery.price_edit_buyer_response && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            <p className="text-sm font-semibold text-amber-800">Price Update</p>
          </div>
          <p className="text-sm text-amber-700">Your courier found different prices at the vendor. Please review in your order details.</p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={async () => {
                await supabase.from('deliveries').update({ price_edit_buyer_response: 'accepted', price_edit_flag: false }).eq('id', deliveryId);
                queryClient.invalidateQueries(['delivery', deliveryId]);
              }}
              className="flex-1 bg-green-600 text-white text-sm font-semibold py-2 rounded-xl"
            >
              Accept
            </button>
            <button
              onClick={async () => {
                await supabase.from('deliveries').update({ price_edit_buyer_response: 'rejected', status: 'cancelled' }).eq('id', deliveryId);
                queryClient.invalidateQueries(['delivery', deliveryId]);
              }}
              className="flex-1 border border-red-300 text-red-600 text-sm font-semibold py-2 rounded-xl"
            >
              Reject
            </button>
          </div>
        </div>
      )}

      {/* Post-delivery actions */}
      {isDelivered && (
        <div className="space-y-3">
          <button
            onClick={() => setShowTip(true)}
            className="w-full bg-brand-50 border border-brand-200 text-brand-700 font-semibold py-3 rounded-xl text-sm"
          >
            Add a tip for your courier
          </button>
          <button
            onClick={() => setShowFeedback(true)}
            className="w-full flex items-center justify-center gap-2 border border-gray-200 text-gray-700 font-semibold py-3 rounded-xl text-sm"
          >
            <Star className="w-4 h-4" /> Leave feedback
          </button>
        </div>
      )}

      {/* Cancel */}
      {canCancel && (
        <button
          onClick={cancelOrder}
          disabled={cancelling}
          className="w-full border border-red-200 text-red-600 font-medium py-3 rounded-xl text-sm"
        >
          {cancelling ? 'Cancelling…' : 'Cancel Order'}
        </button>
      )}

      {showChat && <ChatModal deliveryId={deliveryId} onClose={() => setShowChat(false)} />}
      {showTip && <TipModal delivery={delivery} onClose={() => setShowTip(false)} />}
      {showFeedback && <FeedbackModal delivery={delivery} onClose={() => setShowFeedback(false)} />}
    </div>
  );
}
