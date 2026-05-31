import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/api/supabaseClient';
import { calculateDeliveryFee } from '@/lib/deliveryPricing';
import { getEstateRestriction } from '@/lib/hostelEstates';
import { formatDistanceToNow } from 'date-fns';
import {
  ChevronLeft, Package, Clock, CheckCircle, MapPin, Star,
  MessageSquare, Send, AlertTriangle, Phone, Lock, ShoppingBag, Truck,
} from 'lucide-react';

const STEPS = [
  { key: 'placed',     label: 'Order Placed',  desc: 'Your order has been confirmed',  Icon: Package },
  { key: 'bought',     label: 'Order Bought',  desc: 'Runner purchased your items',     Icon: ShoppingBag },
  { key: 'on_the_way', label: 'On the Way',    desc: 'Your order is en route',          Icon: Truck },
  { key: 'arrived',    label: 'Arrived',        desc: 'Runner is at your location',      Icon: MapPin },
  { key: 'delivered',  label: 'Delivered',      desc: 'Order completed successfully',    Icon: CheckCircle },
];
const STATUS_ORDER = STEPS.map(s => s.key);

function fmt(secs) {
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
}

/* ── Report Issue Modal ─────────────────────────────────────────── */
function ReportIssueModal({ onClose, deliveryId, courierId, reporterId }) {
  const [issueType, setIssueType] = useState('');
  const [callsMade, setCallsMade] = useState(0);
  const [details, setDetails] = useState('');
  const [calling, setCalling] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const ISSUES = [
    'Courier arrived at wrong location',
    'Courier is unresponsive',
    'Other',
  ];

  function handleCall() {
    if (callsMade >= 3 || calling) return;
    setCalling(true);
    setTimeout(() => { setCallsMade(n => Math.min(n + 1, 3)); setCalling(false); }, 1500);
  }

  async function handleSubmit() {
    if (callsMade < 3 || !issueType) return;
    setSubmitting(true);
    setError('');
    const { error: dbErr } = await supabase.from('reported_orders').insert({
      delivery_id:  deliveryId,
      reporter_id:  reporterId,
      courier_id:   courierId,
      issue_type:   issueType,
      details:      details.trim() || null,
      calls_made:   callsMade,
    });
    if (dbErr) {
      setError('Failed to submit report. Please try again.');
      setSubmitting(false);
      return;
    }
    setSubmitted(true);
    setSubmitting(false);
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Report an issue"
      className="fixed inset-x-0 top-0 z-[200] flex items-end justify-center"
      style={{ height: '100dvh', backgroundColor: 'rgba(0,0,0,0.75)' }}>
      <div data-scroll className="w-full max-w-md bg-surface-900 border border-white/[0.08] rounded-t-3xl p-5 space-y-4"
        style={{ maxHeight: '90dvh', overflowY: 'auto', paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}>
        <div className="flex items-center justify-between">
          <p className="font-bold text-white text-base">Report an Issue</p>
          <button onClick={onClose} aria-label="Close" className="text-gray-400 text-xl font-bold leading-none">×</button>
        </div>

        {submitted ? (
          <div className="text-center py-8">
            <p className="text-green-400 font-semibold text-base">Report submitted!</p>
            <p className="text-gray-400 text-sm mt-1">Our team will review and respond within 1 hour. The courier's earnings have been frozen pending review.</p>
            <button onClick={onClose} className="mt-4 bg-brand-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold">Done</button>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {ISSUES.map(issue => (
                <button
                  key={issue}
                  onClick={() => setIssueType(issue)}
                  className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                    issueType === issue
                      ? 'border-red-500/50 bg-red-500/10 text-red-400'
                      : 'border-white/[0.08] bg-surface-800 text-gray-300'
                  }`}
                >
                  {issue}
                </button>
              ))}
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5 space-y-3">
              <p className="text-xs text-amber-400 font-semibold">
                You must attempt to call the courier 3 times before submitting.
              </p>
              <div className="flex items-center gap-2">
                {[1, 2, 3].map(n => (
                  <div key={n} className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                    callsMade >= n
                      ? 'bg-green-500/20 border-green-500 text-green-400'
                      : 'bg-surface-800 border-white/[0.15] text-gray-500'
                  }`}>{n}</div>
                ))}
                <span className="text-xs text-gray-500 ml-1">{callsMade}/3 calls made</span>
              </div>
              <button
                onClick={handleCall}
                disabled={callsMade >= 3 || calling}
                className="w-full flex items-center justify-center gap-2 bg-amber-500/20 border border-amber-500/30 text-amber-400 font-semibold py-2.5 rounded-xl text-sm disabled:opacity-50"
              >
                <Phone className="w-4 h-4" aria-hidden="true" />
                {calling ? 'Calling…' : callsMade >= 3 ? 'All calls made ✓' : `Call Courier (Attempt ${callsMade + 1})`}
              </button>
            </div>

            <textarea
              value={details}
              onChange={e => setDetails(e.target.value)}
              placeholder="Add more details (optional)…"
              rows={2}
              className="w-full bg-surface-800 border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 resize-none"
            />

            {error && <p className="text-xs text-red-400">{error}</p>}
            {callsMade < 3 && (
              <p className="text-xs text-gray-500 text-center">Make all 3 call attempts to enable submission</p>
            )}
            <button
              onClick={handleSubmit}
              disabled={callsMade < 3 || !issueType || submitting}
              className="w-full bg-red-500 disabled:opacity-40 text-white font-semibold py-3 rounded-xl text-sm"
            >
              {submitting ? 'Submitting…' : 'Submit Report'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Rating Modal ───────────────────────────────────────────────── */
function RatingModal({ delivery, session, onClose, onSubmit }) {
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const labels = ['', 'Poor', 'Fair', 'Good', 'Great!', 'Excellent!'];

  async function submit() {
    if (!stars) return;
    setSaving(true);
    await supabase.from('delivery_feedback').insert({
      delivery_id: delivery.id,
      buyer_id:    session.user.id,
      courier_id:  delivery.courier_id,
      rating:      stars,
      comment:     comment || null,
    });
    setSubmitted(true);
    setTimeout(() => { onSubmit(stars, comment); onClose(); }, 900);
  }

  return (
    <div className="fixed inset-x-0 top-0 z-[200] flex items-end justify-center" style={{ height: '100dvh', backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-md bg-surface-900 border border-white/[0.08] rounded-t-3xl p-5 space-y-4"
        style={{ maxHeight: '90dvh', overflowY: 'auto', paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}>
        <div className="flex items-center justify-between">
          <p className="font-bold text-white text-base">Rate your courier</p>
          <button onClick={onClose} className="text-gray-400 text-xl font-bold leading-none">×</button>
        </div>
        {submitted ? (
          <div className="text-center py-8">
            <p className="text-4xl mb-3">🎉</p>
            <p className="text-green-400 font-semibold text-base">Thanks for your feedback!</p>
          </div>
        ) : (
          <>
            <div className="flex justify-center gap-2 py-2">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} onClick={() => setStars(n)} className="transition-transform active:scale-90">
                  <Star className={`w-11 h-11 transition-colors ${n <= stars ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`} />
                </button>
              ))}
            </div>
            <p className="text-center text-sm font-medium text-gray-400 -mt-1">{labels[stars] || 'Tap a star to rate'}</p>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Leave a comment (optional)…"
              rows={3}
              className="w-full bg-surface-800 border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 resize-none"
            />
            <button
              onClick={submit}
              disabled={!stars || saving}
              className="w-full bg-brand-500 disabled:opacity-40 text-white font-semibold py-3 rounded-xl text-sm"
            >
              {saving ? 'Saving…' : 'Submit Rating'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Main Page ──────────────────────────────────────────────────── */
export default function TrackingPage() {
  const { deliveryId } = useParams();
  const navigate = useNavigate();
  const { session, refreshProfile, addNotification } = useAuth();
  const [delivery, setDelivery] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const chatInputRef = useRef(null);
  const [graceLeft, setGraceLeft] = useState(0);
  const [accepting, setAccepting] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [priceEditError, setPriceEditError] = useState('');
  const [allowOffcampusLoading, setAllowOffcampusLoading] = useState(false);
  const [tick, setTick] = useState(0);

  // Load delivery from DB + subscribe to realtime updates
  useEffect(() => {
    if (!deliveryId) return;
    let channel;

    async function load() {
      const { data, error } = await supabase
        .from('deliveries').select('*').eq('id', deliveryId).single();
      if (error || !data) { setNotFound(true); return; }
      setDelivery(data);
    }
    load();

    channel = supabase.channel(`delivery:${deliveryId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'deliveries',
        filter: `id=eq.${deliveryId}`,
      }, payload => setDelivery(prev => ({ ...prev, ...payload.new })))
      .subscribe();

    return () => { if (channel) supabase.removeChannel(channel); };
  }, [deliveryId]);

  // Load chat messages + realtime subscription
  useEffect(() => {
    if (!deliveryId || !delivery?.courier_id) return;
    let chatChannel;

    function loadChat() {
      supabase.from('chat_messages').select('*')
        .eq('delivery_id', deliveryId)
        .order('created_at', { ascending: true })
        .then(({ data }) => {
          if (data?.length) setChatMessages(data);
          // Mark all courier messages as seen — buyer is viewing this page
          supabase.from('chat_messages')
            .update({ seen: true })
            .eq('delivery_id', deliveryId)
            .eq('sender_role', 'courier')
            .eq('seen', false)
            .then(() => {});
        });
    }

    loadChat();
    const pollId = setInterval(loadChat, 5000);

    chatChannel = supabase.channel(`chat:${deliveryId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'chat_messages',
        filter: `delivery_id=eq.${deliveryId}`,
      }, payload => {
        setChatMessages(prev => {
          // Replace matching optimistic entry, or append if genuinely new
          const withoutOptimistic = prev.filter(m =>
            !(String(m.id).startsWith('temp-') &&
              m.message === payload.new.message &&
              m.sender_id === payload.new.sender_id)
          );
          return withoutOptimistic.some(m => m.id === payload.new.id)
            ? withoutOptimistic
            : [...withoutOptimistic, payload.new];
        });
      })
      .subscribe();

    return () => {
      clearInterval(pollId);
      if (chatChannel) supabase.removeChannel(chatChannel);
    };
  }, [deliveryId, delivery?.courier_id]);

  // Auto-show rating modal when delivery is confirmed (buyer only)
  useEffect(() => {
    if (delivery?.status === 'delivered' && !ratingSubmitted && session?.user?.id === delivery?.buyer_id) {
      const t = setTimeout(() => setShowRatingModal(true), 1500);
      return () => clearTimeout(t);
    }
  }, [delivery?.status, ratingSubmitted, session?.user?.id, delivery?.buyer_id]);
  useEffect(() => {
    if (!delivery?.courier_accepted) return;
    const ref = delivery.accepted_at || delivery.created_at;
    const elapsed = Math.floor((Date.now() - new Date(ref).getTime()) / 1000);
    const initial = Math.max(0, 60 - elapsed);
    setGraceLeft(initial);
    if (initial <= 0) return;
    const id = setInterval(() => setGraceLeft(n => { if (n <= 1) { clearInterval(id); return 0; } return n - 1; }), 1000);
    return () => clearInterval(id);
  }, [delivery?.courier_accepted, delivery?.accepted_at, delivery?.created_at]);

  // Tick every 90s so hostel-fallback age threshold is re-evaluated reactively
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 90000);
    return () => clearInterval(id);
  }, []);

  // Remind buyer every 90s while they have a pending action (price edit or off-campus approval)
  useEffect(() => {
    if (!delivery) return;
    const orderAgeS = (Date.now() - new Date(delivery.created_at)) / 1000;
    const estate = getEstateRestriction(delivery.pickup_location, delivery.dropoff_location);
    const needsHostelFallback = estate &&
      delivery.status === 'placed' &&
      !delivery.courier_id && orderAgeS > 30 && !delivery.allow_offcampus &&
      session?.user?.id === delivery.buyer_id;

    const hasPending = delivery.price_edit_flag || needsHostelFallback;
    if (!hasPending) return;

    function fire() {
      const isPriceEdit = delivery?.price_edit_flag;
      const title = 'Action Required';
      const body = isPriceEdit
        ? 'Your runner updated item prices. Tap to review.'
        : 'No hostel runner found. Tap to allow an off-campus runner.';
      supabase.from('notifications').insert({
        user_id: session.user.id,
        type: isPriceEdit ? 'price_edit' : 'no_runner',
        title,
        body,
        read: false,
      }).then(() => {});
      addNotification({ title, body, type: 'warning' });
    }

    fire();
    const id = setInterval(fire, 90000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delivery?.price_edit_flag, delivery?.allow_offcampus, delivery?.courier_id, delivery?.status, tick]);

  if (notFound) {
    return <div className="p-4 text-center text-gray-500 pt-20">Order not found.</div>;
  }
  if (!delivery) {
    return (
      <div className="min-h-full bg-surface-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-800 border-t-brand-500 rounded-full animate-spin" />
      </div>
    );
  }
  const isPendingPayment = delivery.status === 'pending_payment';
  const currentIdx = STATUS_ORDER.indexOf(delivery.status);
  const isCancelled = delivery.status === 'cancelled';
  const isDelivered = delivery.status === 'delivered';
  const isArrived = delivery.status === 'arrived';
  const codeVisible = isArrived || isDelivered;
  const gracePeriodActive = graceLeft > 0 && delivery.courier_accepted && delivery.status === 'placed';

  if (isPendingPayment) {
    return (
      <div className="bg-surface-950 min-h-full">
        <div className="flex items-center gap-3 px-4 pt-5 pb-4">
          <button onClick={() => navigate(-1)} className="w-11 h-11 flex items-center justify-center rounded-xl bg-surface-800 border border-white/[0.06]">
            <ChevronLeft className="w-5 h-5 text-gray-400" />
          </button>
          <h1 className="font-bold text-white text-lg">Order Status</h1>
        </div>
        <div className="flex flex-col items-center justify-center px-6 pt-16 gap-5 text-center">
          <div className="w-16 h-16 bg-yellow-500/15 rounded-full flex items-center justify-center">
            <Clock className="w-8 h-8 text-yellow-400" />
          </div>
          <div>
            <p className="text-lg font-bold text-white">Awaiting Payment</p>
            <p className="text-sm text-gray-400 mt-1">Complete payment to confirm this order.</p>
          </div>
          <button
            onClick={() => navigate(`/payment/${delivery.id}`, { state: { delivery } })}
            className="w-full max-w-xs bg-gradient-to-br from-brand-500 to-indigo-600 text-white font-bold py-4 rounded-2xl"
          >
            Complete Payment
          </button>
        </div>
      </div>
    );
  }

  // Hostel estate fallback — buyer confirmation needed
  const estateRestriction = getEstateRestriction(delivery.pickup_location, delivery.dropoff_location);
  const orderAgeS = (Date.now() - new Date(delivery.created_at)) / 1000;
  const needsHostelFallback = !!(estateRestriction &&
    delivery.status === 'placed' &&
    !delivery.courier_id && orderAgeS > 30 && !delivery.allow_offcampus &&
    session?.user?.id === delivery.buyer_id);

  // Price-edit state derived from DB (no context dependency)
  const hasPendingPriceEdit = !!delivery.price_edit_flag && !isCancelled && !isDelivered;
  const priceEdits = hasPendingPriceEdit
    ? (delivery.items || [])
        .filter(i => i.original_price != null && String(i.original_price) !== String(i.price))
        .map(item => ({
          itemName: item.name,
          originalPrice: parseFloat(item.original_price),
          newPrice: parseFloat(item.price),
          diff: parseFloat(item.price) - parseFloat(item.original_price),
          qty: item.qty || 1,
        }))
    : [];

  async function acceptPriceEdit() {
    setAccepting(true);
    setPriceEditError('');
    const { error } = await supabase.rpc('accept_price_edit', { p_delivery_id: deliveryId });
    if (error) {
      setPriceEditError(error.message);
    } else {
      const updatedItems = (delivery.items || []).map(({ original_price, ...rest }) => rest);
      setDelivery(prev => ({ ...prev, items: updatedItems, price_edit_flag: false }));
    }
    setAccepting(false);
  }

  async function cancelOrder() {
    setCancelling(true);
    setCancelError(null);
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('cancel_delivery', {
        p_delivery_id: deliveryId,
        p_cancelled_by: 'buyer',
      });
      if (rpcError) {
        // RPC not deployed — fall back to direct status update (no refund)
        const { error: updateError } = await supabase
          .from('deliveries')
          .update({ status: 'cancelled' })
          .eq('id', deliveryId);
        if (updateError) {
          setCancelError(`Could not cancel: ${updateError.message}`);
          setCancelling(false);
          return;
        }
        setCancelError('Order cancelled. Wallet refund could not be processed automatically — contact support.');
      } else if (rpcData?.refund_error) {
        // RPC ran but refund step failed — show what went wrong
        setCancelError(`Order cancelled. Refund error: ${rpcData.refund_error}`);
      }
      setDelivery(prev => ({ ...prev, status: 'cancelled' }));
      refreshProfile();
    } catch (err) {
      setCancelError(`Unexpected error: ${err?.message || err}`);
    }
    setCancelling(false);
  }

  async function rejectPriceEdit() {
    setRejecting(true);
    setPriceEditError('');
    // Restore original prices before cancelling so cancel_delivery sees correct total
    const restoredItems = (delivery.items || []).map(item => {
      if (item.original_price == null) return item;
      const { original_price, ...rest } = item;
      return { ...rest, price: original_price };
    });
    await supabase.from('deliveries')
      .update({ items: restoredItems, price_edit_flag: false, price_edit_buyer_response: 'rejected' })
      .eq('id', deliveryId);

    const { data: rpcData, error: rpcErr } = await supabase.rpc('cancel_delivery', {
      p_delivery_id: deliveryId,
      p_cancelled_by: 'buyer',
    });
    if (rpcErr) {
      setPriceEditError('Order cancelled but refund failed — contact support.');
    } else if (rpcData?.refund_error) {
      setPriceEditError(`Order cancelled. Refund error: ${rpcData.refund_error}`);
    }
    setDelivery(prev => ({ ...prev, items: restoredItems, price_edit_flag: false, status: 'cancelled' }));
    refreshProfile();
    setRejecting(false);
  }

  let etaText = null;
  try {
    const { distance_m } = calculateDeliveryFee(delivery.pickup_location, delivery.dropoff_location);
    if (distance_m && !isDelivered && !isCancelled) {
      etaText = `~${Math.max(2, Math.round(distance_m / 80))} min`;
    }
  } catch {}

  async function sendChat() {
    const text = chatInput.trim();
    if (!text || chatSending) return;
    setChatSending(true);
    setChatInput('');
    // Optimistic update — message appears instantly before server confirms
    setChatMessages(prev => [...prev, {
      id:          `temp-${Date.now()}`,
      delivery_id: deliveryId,
      sender_id:   session.user.id,
      sender_role: 'buyer',
      message:     text,
      created_at:  new Date().toISOString(),
    }]);
    await supabase.from('chat_messages').insert({
      delivery_id: deliveryId,
      sender_id:   session.user.id,
      sender_role: 'buyer',
      message:     text,
    });
    // Notify courier via push (DB insert triggers send-push webhook)
    if (delivery?.courier_id) {
      supabase.from('notifications').insert({
        user_id: delivery.courier_id,
        type:    'chat',
        title:   'New message from buyer',
        body:    text.length > 80 ? text.slice(0, 80) + '…' : text,
        read:    false,
      }).then(() => {});
    }
    setChatSending(false);
  }

  return (
    <div className="bg-surface-950 min-h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-4">
        <button
          onClick={() => navigate('/orders')}
          aria-label="Go back"
          className="w-11 h-11 bg-surface-900 border border-white/[0.08] rounded-xl flex items-center justify-center"
        >
          <ChevronLeft className="w-5 h-5 text-gray-400" aria-hidden="true" />
        </button>
        <h1 className="text-lg font-bold text-white flex-1">Track Order</h1>
        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
          isCancelled ? 'bg-red-500/15 text-red-400' :
          isDelivered ? 'bg-green-500/15 text-green-400' :
          'bg-brand-500/15 text-brand-400'
        }`}>
          {isCancelled ? 'Cancelled' : isDelivered ? 'Delivered' : 'Active'}
        </span>
      </div>

      <div className="px-4 space-y-4 pb-8">
        {/* Route + ETA */}
        <div className="bg-surface-900 border border-white/[0.08] rounded-2xl p-4 space-y-3">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-brand-400 mt-0.5 shrink-0" aria-hidden="true" />
            <div>
              <p className="text-xs text-gray-500">Pickup</p>
              <p className="text-sm font-medium text-white">{delivery.pickup_location}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-green-400 mt-0.5 shrink-0" aria-hidden="true" />
            <div>
              <p className="text-xs text-gray-500">Dropoff</p>
              <p className="text-sm font-medium text-white">{delivery.dropoff_location}</p>
            </div>
          </div>
          {etaText && (
            <div className="flex items-center gap-2 pt-1 border-t border-white/[0.06]">
              <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" aria-hidden="true" />
              <p className="text-xs text-amber-400 font-medium">{etaText} estimated</p>
            </div>
          )}
        </div>

        {/* Grace period / cancellation window */}
        {delivery.courier_accepted && !isCancelled && !isDelivered && (
          gracePeriodActive ? (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-amber-400">Grace period: {fmt(graceLeft)}</p>
                  <p className="text-xs text-amber-400/70 mt-0.5">Both sides can cancel freely</p>
                </div>
                <button
                  onClick={cancelOrder}
                  disabled={cancelling}
                  className="shrink-0 text-xs font-semibold bg-amber-500/20 border border-amber-500/30 text-amber-400 px-3 py-1.5 rounded-lg disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
              {delivery.estimated_delivery_minutes && (
                <div className="flex items-center gap-2 pt-1 border-t border-amber-500/20">
                  <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" aria-hidden="true" />
                  <p className="text-xs text-amber-300 font-medium">
                    Runner estimates ~{delivery.estimated_delivery_minutes} min delivery
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-gray-500 text-xs font-medium px-1">
              <span className="w-4 h-4 rounded-full border border-gray-600 flex items-center justify-center text-gray-600 text-[10px]">⊗</span>
              Cancellation window closed
            </div>
          )
        )}

        {/* Hostel fallback — no on-campus runner after 2 min, buyer must confirm off-campus */}
        {needsHostelFallback && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" aria-hidden="true" />
              <p className="text-sm font-bold text-amber-400">No hostel runner available yet</p>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              {estateRestriction === 'victoria_falls'
                ? 'No female on-campus runner has accepted yet. You can allow an off-campus female runner — but she cannot enter Victoria Falls estate. You will need to come outside the gate to collect your order.'
                : 'No male on-campus runner has accepted yet. You can allow an off-campus male runner — but he cannot enter Moat Heaven estate. You will need to come outside the gate to collect your order.'}
            </p>
            <div className="flex gap-2">
              <button className="flex-1 bg-surface-800 border border-white/[0.08] text-gray-400 font-medium py-2.5 rounded-xl text-sm">
                Keep Waiting
              </button>
              <button
                disabled={allowOffcampusLoading}
                onClick={async () => {
                  setAllowOffcampusLoading(true);
                  await supabase.from('deliveries').update({ allow_offcampus: true }).eq('id', deliveryId);
                  setDelivery(prev => ({ ...prev, allow_offcampus: true }));
                  setAllowOffcampusLoading(false);
                }}
                className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm"
              >
                {allowOffcampusLoading ? 'Saving…' : 'Allow Off-Campus Runner'}
              </button>
            </div>
          </div>
        )}

        {/* Price approval card — shown when courier edits item prices */}
        {hasPendingPriceEdit && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" aria-hidden="true" />
              <p className="text-sm font-bold text-amber-400">Price Updated by Runner</p>
            </div>
            <p className="text-xs text-gray-400">
              Your runner updated item prices at the vendor. Review and accept to continue, or cancel the order.
            </p>

            {priceEdits.length > 0 && (
              <div className="bg-surface-900 border border-white/[0.08] rounded-xl p-3 space-y-2">
                {priceEdits.map((edit, i) => (
                  <div key={i} className="flex items-center justify-between gap-2">
                    <span className="text-sm text-white flex-1">{edit.itemName}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-sm line-through text-gray-500">
                        ₦{(edit.originalPrice * edit.qty).toLocaleString()}
                      </span>
                      <span className="text-sm font-bold text-white">
                        ₦{(edit.newPrice * edit.qty).toLocaleString()}
                      </span>
                      {edit.diff > 0 && (
                        <span className="text-[11px] font-bold bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded">
                          +₦{(edit.diff * edit.qty).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                <div className="border-t border-white/[0.08] pt-2 flex justify-between text-sm font-semibold">
                  <span className="text-gray-400">Total additional</span>
                  <span className="text-amber-400">
                    +₦{priceEdits.reduce((sum, e) => sum + Math.max(0, e.diff) * (e.qty || 1), 0).toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={rejectPriceEdit}
                disabled={rejecting}
                className="flex-1 bg-red-500/15 border border-red-500/30 text-red-400 font-semibold py-3 rounded-xl text-sm disabled:opacity-50"
              >
                {rejecting ? 'Cancelling…' : 'Reject & Cancel'}
              </button>
              <button
                onClick={acceptPriceEdit}
                disabled={accepting}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm"
              >
                {accepting ? 'Accepting…' : 'Accept & Continue'}
              </button>
            </div>
            {priceEditError && <p className="text-xs text-red-400 text-center">{priceEditError}</p>}
          </div>
        )}

        {/* Cancelled + refund card */}
        {isCancelled && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-red-500/20 rounded-xl flex items-center justify-center shrink-0">
                <Package className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-red-400">Order Cancelled</p>
                <p className="text-xs text-red-400/70">This order has been cancelled</p>
              </div>
            </div>
            <div className="bg-surface-900 border border-white/[0.06] rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Refund amount</span>
                <span className="text-white font-bold">₦{delivery.total_amount?.toLocaleString() ?? '—'}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Status</span>
                <span className="text-amber-400 font-semibold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" aria-hidden="true" /> Processing
                </span>
              </div>
              <p className="text-xs text-gray-600 pt-1 border-t border-white/[0.06]">Wallet refund typically processed within 5–10 minutes.</p>
            </div>
          </div>
        )}

        {/* Delivery code */}
        {!isCancelled && (
          codeVisible ? (
            <div className="bg-brand-500/10 border border-brand-500/20 rounded-2xl p-5 text-center">
              <p className="text-xs text-brand-400 font-semibold mb-3 uppercase tracking-wider">Your Delivery Code</p>
              <div className="flex justify-center gap-3">
                {String(delivery.delivery_code).split('').map((d, i) => (
                  <div key={i} className="w-14 h-16 bg-surface-800 border-2 border-brand-500/30 rounded-xl flex items-center justify-center text-3xl font-bold text-white">
                    {d}
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-3">Show this to your runner to confirm handoff</p>
            </div>
          ) : (
            <div className="bg-surface-900 border border-white/[0.08] rounded-2xl p-5 text-center">
              <Lock className="w-6 h-6 text-gray-600 mx-auto mb-2" aria-hidden="true" />
              <p className="text-sm font-semibold text-gray-400">Your Delivery Code</p>
              <p className="text-xs text-gray-600 mt-1">Available once your runner marks Arrived</p>
            </div>
          )
        )}

        {/* Courier info */}
        {delivery.courier_accepted && delivery.courier_name && (
          <div className="bg-surface-900 border border-white/[0.08] rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 font-bold text-sm">
              {delivery.courier_name[0]}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">{delivery.courier_name}</p>
              <p className="text-xs text-gray-500">Your runner</p>
            </div>
          </div>
        )}

        {!delivery.courier_accepted && !isCancelled && (
          <div className="flex items-center gap-2 text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-xl p-3">
            <Clock className="w-4 h-4 animate-pulse" aria-hidden="true" />
            <p className="text-sm">Finding a runner for you…</p>
          </div>
        )}

        {/* Delivery Progress stepper */}
        <div className="bg-surface-900 border border-white/[0.08] rounded-2xl p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-5">Delivery Progress</p>
          <div className="space-y-0">
            {STEPS.map((step, idx) => {
              const stepIdx = STATUS_ORDER.indexOf(step.key);
              const done = stepIdx < currentIdx;
              const active = stepIdx === currentIdx && !isCancelled;
              const future = stepIdx > currentIdx || isCancelled;
              const isLast = idx === STEPS.length - 1;
              const Icon = step.Icon;
              return (
                <div key={step.key} className="flex gap-4">
                  {/* Circle + connector */}
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all ${
                      done ? 'bg-brand-500 text-white' :
                      active ? 'bg-brand-500 text-white ring-4 ring-brand-500/20' :
                      'bg-surface-800 text-gray-600 border border-white/[0.08]'
                    }`}>
                      <Icon className="w-5 h-5" aria-hidden="true" />
                    </div>
                    {!isLast && (
                      <div className={`w-0.5 flex-1 my-1 min-h-[24px] ${done ? 'bg-brand-500' : 'bg-white/[0.08]'}`} />
                    )}
                  </div>
                  {/* Label */}
                  <div className="pb-6 pt-2 flex-1">
                    <p className={`text-sm font-semibold leading-tight ${future ? 'text-gray-500' : 'text-white'}`}>
                      {step.label}
                    </p>
                    <p className={`text-xs mt-0.5 ${future ? 'text-gray-600' : 'text-gray-400'}`}>{step.desc}</p>
                    {active && (
                      <span className="inline-block mt-1.5 text-[10px] font-semibold bg-brand-500/20 text-brand-400 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        In progress
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

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

        {/* In-app chat */}
        {delivery.courier_id && !isCancelled && (
          <div className="bg-surface-900 border border-white/[0.08] rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-brand-400" aria-hidden="true" />
                <p className="text-sm font-semibold text-white">Chat with Runner</p>
              </div>
              <span className="text-xs text-gray-500 bg-surface-800 px-2 py-0.5 rounded-full">Call (masked)</span>
            </div>
            <div className="p-4 space-y-3 max-h-52 overflow-y-auto">
              {chatMessages.length === 0 && (
                <p className="text-center text-sm text-gray-500 py-4">No messages yet. Start the conversation!</p>
              )}
              {chatMessages.map(msg => {
                const isMine = msg.sender_id === session?.user?.id;
                return (
                  <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                      isMine
                        ? 'bg-brand-500 text-white rounded-br-sm'
                        : 'bg-surface-800 text-gray-300 rounded-bl-sm'
                    }`}>
                      <p>{msg.message}</p>
                      <p className={`text-xs mt-0.5 ${isMine ? 'text-white/60' : 'text-gray-500'}`}>
                        {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="px-3 py-2 border-t border-white/[0.06] flex gap-2">
              <input
                ref={chatInputRef}
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendChat()}
                onFocus={() => setTimeout(() => chatInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300)}
                placeholder="Type a message…"
                disabled={chatSending}
                className="flex-1 bg-surface-800 border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 disabled:opacity-60"
              />
              <button
                onClick={sendChat}
                disabled={chatSending}
                aria-label="Send message"
                className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center shrink-0 active:scale-95 transition-transform disabled:opacity-50"
              >
                <Send className="w-4 h-4 text-white" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

        {/* Report Issue */}
        {delivery.courier_accepted && !isCancelled && !isDelivered && (
          <button
            onClick={() => setShowReportModal(true)}
            className="w-full flex items-center justify-center gap-2 bg-surface-900 border border-white/[0.08] text-gray-400 font-medium py-3 rounded-2xl text-sm"
          >
            <AlertTriangle className="w-4 h-4" aria-hidden="true" />
            Report an Issue
          </button>
        )}

        {/* Post-delivery actions */}
        {isDelivered && (
          <div className="space-y-2">
            {ratingSubmitted ? (
              <div className="w-full flex items-center justify-center gap-2 bg-green-500/10 border border-green-500/20 text-green-400 font-semibold py-3 rounded-xl text-sm">
                <Star className="w-4 h-4 fill-green-400" aria-hidden="true" /> Rating submitted — thanks!
              </div>
            ) : (
              <button
                onClick={() => setShowRatingModal(true)}
                className="w-full flex items-center justify-center gap-2 bg-surface-900 border border-white/[0.08] text-gray-300 font-semibold py-3 rounded-xl text-sm"
              >
                <Star className="w-4 h-4" aria-hidden="true" /> Rate your runner
              </button>
            )}
          </div>
        )}

        {/* Cancel error */}
        {cancelError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
            <p className="text-sm text-red-400">{cancelError}</p>
          </div>
        )}

        {/* Cancel (pre-grace, before courier accepts) */}
        {!delivery.courier_accepted && !isCancelled && !isDelivered && (
          <button
            onClick={cancelOrder}
            disabled={cancelling}
            className="w-full bg-red-500/10 border border-red-500/30 text-red-400 font-medium py-3 rounded-xl text-sm"
          >
            {cancelling ? 'Cancelling…' : 'Cancel Order'}
          </button>
        )}
      </div>

      {showRatingModal && (
        <RatingModal
          delivery={delivery}
          session={session}
          onClose={() => setShowRatingModal(false)}
          onSubmit={() => setRatingSubmitted(true)}
        />
      )}
      {showReportModal && (
        <ReportIssueModal
          onClose={() => setShowReportModal(false)}
          deliveryId={deliveryId}
          courierId={delivery?.courier_id}
          reporterId={session?.user?.id}
        />
      )}
    </div>
  );
}
