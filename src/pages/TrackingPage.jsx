import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/api/supabaseClient';
import { ChevronLeft, Package, Clock, CheckCircle, MapPin, MessageCircle, AlertCircle, Star } from 'lucide-react';
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
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-brand-800 border-t-brand-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!delivery) {
    return <div className="p-4 text-center text-gray-500">Order not found.</div>;
  }

  const isCancelled = delivery.status === 'cancelled';
  const isDelivered = delivery.status === 'delivered';

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
        {delivery.courier_accepted && delivery.profiles && (
          <div className="bg-surface-900 border border-white/[0.08] rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 font-bold text-sm">
              {delivery.profiles.full_name?.[0] || 'C'}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">{delivery.profiles.full_name}</p>
              <p className="text-xs text-gray-500">Your courier</p>
            </div>
            <button
              onClick={() => setShowChat(true)}
              className="w-10 h-10 rounded-xl bg-surface-800 border border-white/[0.08] flex items-center justify-center"
            >
              <MessageCircle className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        )}

        {!delivery.courier_accepted && !isCancelled && (
          <div className="flex items-center gap-2 text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-xl p-3">
            <Clock className="w-4 h-4 animate-pulse" />
            <p className="text-sm">Finding a courier for you…</p>
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

        {/* Price edit alert */}
        {delivery.price_edit_flag && !delivery.price_edit_buyer_response && (
          <div className="bg-amber-400/10 border border-amber-400/20 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5 text-amber-400" />
              <p className="text-sm font-semibold text-amber-400">Price Update</p>
            </div>
            <p className="text-sm text-gray-400">Your courier found different prices at the vendor.</p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={async () => {
                  await supabase.from('deliveries').update({ price_edit_buyer_response: 'accepted', price_edit_flag: false }).eq('id', deliveryId);
                  queryClient.invalidateQueries(['delivery', deliveryId]);
                }}
                className="flex-1 bg-green-600 text-white text-sm font-semibold py-2.5 rounded-xl"
              >
                Accept
              </button>
              <button
                onClick={async () => {
                  await supabase.from('deliveries').update({ price_edit_buyer_response: 'rejected', status: 'cancelled' }).eq('id', deliveryId);
                  queryClient.invalidateQueries(['delivery', deliveryId]);
                }}
                className="flex-1 bg-red-500/15 border border-red-500/30 text-red-400 text-sm font-semibold py-2.5 rounded-xl"
              >
                Reject
              </button>
            </div>
          </div>
        )}

        {/* Post-delivery actions */}
        {isDelivered && (
          <div className="space-y-2">
            <button
              onClick={() => setShowTip(true)}
              className="w-full bg-brand-500/10 border border-brand-500/20 text-brand-400 font-semibold py-3 rounded-xl text-sm"
            >
              Add a tip for your courier
            </button>
            <button
              onClick={() => setShowFeedback(true)}
              className="w-full flex items-center justify-center gap-2 bg-surface-900 border border-white/[0.08] text-gray-300 font-semibold py-3 rounded-xl text-sm"
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
            className="w-full bg-red-500/10 border border-red-500/30 text-red-400 font-medium py-3 rounded-xl text-sm"
          >
            {cancelling ? 'Cancelling…' : 'Cancel Order'}
          </button>
        )}
      </div>

      {showChat && <ChatModal deliveryId={deliveryId} onClose={() => setShowChat(false)} />}
      {showTip && <TipModal delivery={delivery} onClose={() => setShowTip(false)} />}
      {showFeedback && <FeedbackModal delivery={delivery} onClose={() => setShowFeedback(false)} />}
    </div>
  );
}
