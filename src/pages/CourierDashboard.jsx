import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/api/supabaseClient';
import { haversineDistance as _haversine, CAMPUS_CENTER, CAMPUS_GEOFENCE_RADIUS_M } from '@/lib/venueCoords';
import { VF_ESTATE, MH_ESTATE } from '@/lib/hostelEstates';
import { calculateDeliveryFee } from '@/lib/deliveryPricing';
import {
  Bike, MapPin, Lock, CheckCircle, Wallet, TrendingUp,
  Star, Power, Clock, AlertCircle, AlertTriangle,
  Pencil, ShieldAlert, MessageSquare, Send,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

/* ── Delivery code modal ────────────────────────────────────────── */
function DeliveryCodeModal({ delivery, onSuccess, onClose }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  function verify() {
    if (code.length !== 4) { setError('Enter the 4-digit code'); return; }
    if (code !== delivery.delivery_code) {
      setError('Incorrect code. Ask the buyer for the correct 4-digit code.');
      return;
    }
    onSuccess();
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}>
      <div className="w-full max-w-sm bg-surface-900 border border-white/[0.08] rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-brand-400" aria-hidden="true" />
            <p className="font-semibold text-white">Enter Delivery Code</p>
          </div>
          <button onClick={onClose} className="text-gray-400 text-lg font-bold">×</button>
        </div>
        <p className="text-sm text-gray-400">Ask the buyer for their 4-digit code to confirm delivery.</p>
        <input
          type="number" inputMode="numeric" maxLength={4}
          value={code}
          onChange={e => { setCode(e.target.value.slice(0, 4)); setError(''); }}
          placeholder="0000"
          className="w-full text-center text-4xl font-bold tracking-[0.5em] bg-surface-800 border-2 border-white/[0.08] text-white rounded-xl py-4 focus:outline-none focus:border-brand-500"
        />
        {error && <p className="text-sm text-red-400 text-center">{error}</p>}
        <button
          onClick={verify}
          disabled={code.length !== 4}
          className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl"
        >
          Confirm Delivery
        </button>
      </div>
    </div>
  );
}

/* ── Fraud warning modal ────────────────────────────────────────── */
function FraudWarningModal({ itemName, onAccept, onClose }) {
  return (
    <div className="fixed inset-x-0 top-0 z-[200] flex items-end justify-center" style={{ height: '100dvh', backgroundColor: 'rgba(0,0,0,0.8)' }}>
      <div className="w-full max-w-md bg-surface-900 border border-white/[0.08] rounded-t-3xl p-5 space-y-4"
        style={{ maxHeight: '90dvh', overflowY: 'auto', paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-400" aria-hidden="true" />
            <p className="font-bold text-white">Before You Edit Prices</p>
          </div>
          <button onClick={onClose} className="text-gray-400 text-xl font-bold leading-none">×</button>
        </div>

        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <p className="text-sm font-bold text-red-400 mb-2">Anti-Fraud Notice</p>
          <p className="text-sm text-red-400/80 leading-relaxed">
            Unauthorized price inflation may lead to <strong className="text-red-400">account suspension or permanent ban</strong>. All price edits are logged and reviewed by our team.
          </p>
        </div>

        <p className="text-xs text-gray-500 leading-relaxed">
          Only edit prices if the vendor's actual price differs from what was listed. The buyer will be notified and must approve before you can continue. False edits are detectable and will be penalized.
        </p>

        {itemName && (
          <div className="bg-surface-800 border border-white/[0.06] rounded-xl px-4 py-2.5">
            <p className="text-xs text-gray-500">Editing price for: <span className="text-white font-semibold">{itemName}</span></p>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 bg-surface-800 border border-white/[0.08] text-gray-400 font-medium py-3 rounded-xl text-sm">Cancel</button>
          <button onClick={onAccept} className="flex-1 bg-brand-500 text-white font-semibold py-3 rounded-xl text-sm">I Understand</button>
        </div>
      </div>
    </div>
  );
}

/* ── Item price edit modal ──────────────────────────────────────── */
function ItemPriceEditModal({ target, onSubmit, onClose }) {
  const { item } = target;
  const [newPriceStr, setNewPriceStr] = useState('');

  const originalPrice = parseFloat(item.original_price ?? item.price);
  const newPrice = parseFloat(newPriceStr) || 0;
  const diff = newPrice > 0 ? newPrice - originalPrice : 0;
  const isIncrease = diff > 0;
  const qty = item.qty || 1;

  function submit() {
    if (!newPrice || newPrice <= 0 || newPrice === originalPrice) return;
    onSubmit({
      orderId: target.orderId,
      itemIndex: target.itemIndex,
      itemName: item.name,
      originalPrice,
      newPrice,
      diff,
      qty,
    });
  }

  return (
    <div className="fixed inset-x-0 top-0 z-[200] flex items-end justify-center" style={{ height: '100dvh', backgroundColor: 'rgba(0,0,0,0.75)' }}>
      <div className="w-full max-w-md bg-surface-900 border border-white/[0.08] rounded-t-3xl p-5 space-y-4"
        style={{ maxHeight: '90dvh', overflowY: 'auto', paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Pencil className="w-4 h-4 text-brand-400" aria-hidden="true" />
            <p className="font-bold text-white text-base">Edit Item Price</p>
          </div>
          <button onClick={onClose} className="text-gray-400 text-xl font-bold leading-none">×</button>
        </div>

        <div className="bg-surface-800 border border-white/[0.06] rounded-xl px-4 py-3 flex justify-between items-center">
          <div>
            <p className="text-xs text-gray-500">Item</p>
            <p className="text-sm font-semibold text-white">{item.name}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Original price</p>
            <p className="text-sm font-bold text-white">₦{(originalPrice * qty).toLocaleString()}</p>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-400 block mb-1">
            New price per unit (₦)
          </label>
          <input
            type="number"
            value={newPriceStr}
            onChange={e => setNewPriceStr(e.target.value)}
            placeholder={`Was ₦${originalPrice.toLocaleString()}`}
            className="w-full bg-surface-800 border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
          />
        </div>

        {/* Breakdown */}
        {newPrice > 0 && newPrice !== originalPrice && (
          <div className="bg-surface-800 border border-white/[0.08] rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Original ({qty}×)</span>
              <span className="text-white">₦{(originalPrice * qty).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">New price ({qty}×)</span>
              <span className="text-white">₦{(newPrice * qty).toLocaleString()}</span>
            </div>
            <div className="border-t border-white/[0.08] pt-2 flex justify-between text-sm font-semibold">
              <span className="text-gray-300">Difference</span>
              <span className={isIncrease ? 'text-red-400' : 'text-green-400'}>
                {isIncrease ? '+' : ''}₦{(diff * qty).toLocaleString()}
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 bg-surface-800/50 rounded-xl px-3 py-2">
          <AlertTriangle className="w-3.5 h-3.5 text-gray-600 shrink-0" aria-hidden="true" />
          <p className="text-[11px] text-gray-600">Price changes are monitored for fraud prevention.</p>
        </div>

        {newPrice > 0 && newPrice === originalPrice && (
          <p className="text-xs text-gray-500 text-center">Price is unchanged — nothing to submit.</p>
        )}

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 bg-surface-800 border border-white/[0.08] text-gray-400 font-medium py-3 rounded-xl text-sm">Cancel</button>
          <button
            onClick={submit}
            disabled={!newPrice || newPrice <= 0 || newPrice === originalPrice}
            className="flex-1 bg-brand-500 disabled:opacity-40 text-white font-semibold py-3 rounded-xl text-sm"
          >
            Submit Price Change
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Courier chat panel ─────────────────────────────────────────── */
function CourierChatPanel({ deliveryId, buyerId, session }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef(null);

  useEffect(() => {
    function loadChat() {
      supabase.from('chat_messages').select('*')
        .eq('delivery_id', deliveryId)
        .order('created_at', { ascending: true })
        .then(({ data }) => {
          const msgs = data || [];
          if (msgs.length) setMessages(msgs);
          setUnread(msgs.filter(m => m.sender_role !== 'courier' && !m.seen).length);
        });
    }

    loadChat();
    const pollId = setInterval(loadChat, 5000);

    const channel = supabase.channel(`courier-chat:${deliveryId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'chat_messages',
        filter: `delivery_id=eq.${deliveryId}`,
      }, payload => {
        setMessages(prev => {
          const withoutOptimistic = prev.filter(m =>
            !(String(m.id).startsWith('temp-') &&
              m.message === payload.new.message &&
              m.sender_id === payload.new.sender_id)
          );
          return withoutOptimistic.some(m => m.id === payload.new.id)
            ? withoutOptimistic : [...withoutOptimistic, payload.new];
        });
        if (payload.new.sender_role !== 'courier') setUnread(u => u + 1);
      })
      .subscribe();

    return () => {
      clearInterval(pollId);
      supabase.removeChannel(channel);
    };
  }, [deliveryId]);

  useEffect(() => {
    if (open) {
      setUnread(0);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      // Mark all buyer messages as seen in DB
      supabase.from('chat_messages')
        .update({ seen: true })
        .eq('delivery_id', deliveryId)
        .eq('sender_role', 'buyer')
        .eq('seen', false)
        .then(() => {});
    }
  }, [open, messages.length, deliveryId]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput('');
    setMessages(prev => [...prev, {
      id: `temp-${Date.now()}`, delivery_id: deliveryId,
      sender_id: session.user.id, sender_role: 'courier',
      message: text, created_at: new Date().toISOString(),
    }]);
    await supabase.from('chat_messages').insert({
      delivery_id: deliveryId,
      sender_id:   session.user.id,
      sender_role: 'courier',
      message:     text,
    });
    // Notify buyer via push (DB insert triggers send-push webhook)
    if (buyerId) {
      supabase.from('notifications').insert({
        user_id: buyerId,
        type:    'chat',
        title:   'New message from your runner',
        body:    text.length > 80 ? text.slice(0, 80) + '…' : text,
        read:    false,
      }).then(() => {});
    }
    setSending(false);
  }

  return (
    <div className="border-t border-white/[0.06] mt-3 pt-3">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center justify-between w-full"
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-brand-400" aria-hidden="true" />
          <p className="text-sm font-medium text-gray-300">Chat with buyer</p>
          {unread > 0 && !open && (
            <span className="min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
              {unread}
            </span>
          )}
        </div>
        <span className="text-xs text-gray-500">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="mt-3">
          <div className="max-h-48 overflow-y-auto space-y-2 mb-2">
            {messages.length === 0 && (
              <p className="text-center text-xs text-gray-500 py-4">No messages yet. Start the conversation!</p>
            )}
            {messages.map(msg => {
              const isMine = msg.sender_role === 'courier';
              return (
                <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                    isMine
                      ? 'bg-brand-500 text-white rounded-br-sm'
                      : 'bg-surface-800 text-gray-200 rounded-bl-sm'
                  }`}>
                    <p>{msg.message}</p>
                    <p className={`text-xs mt-0.5 ${isMine ? 'text-white/60' : 'text-gray-500'}`}>
                      {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
          <div className="flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Reply to buyer…"
              disabled={sending}
              className="flex-1 bg-surface-800 border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 disabled:opacity-60"
            />
            <button
              onClick={send}
              disabled={!input.trim() || sending}
              aria-label="Send message"
              className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center shrink-0 disabled:opacity-50"
            >
              <Send className="w-4 h-4 text-white" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Helpers ────────────────────────────────────────────────────── */
function fmt(secs) {
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
}

function graceLeft(order) {
  if (!order.accepted_at) return 0;
  return Math.max(0, 60 - Math.floor((Date.now() - new Date(order.accepted_at).getTime()) / 1000));
}

function getEta(order) {
  try {
    const { distance_m } = calculateDeliveryFee(order.pickup_location, order.dropoff_location);
    if (distance_m) return `~${Math.max(2, Math.round(distance_m / 80))} min`;
  } catch {}
  return null;
}

const STATUS_NEXT = {
  placed:     { label: 'Mark as Bought',       next: 'bought',     color: 'from-blue-600 to-blue-700' },
  bought:     { label: 'Mark On The Way',      next: 'on_the_way', color: 'from-brand-500 to-indigo-600' },
  on_the_way: { label: 'Mark as Arrived',      next: 'arrived',    color: 'from-sky-500 to-sky-700' },
  arrived:    { label: 'Verify Delivery Code', next: 'delivered',  color: 'from-green-500 to-green-700', requiresCode: true },
};

const STATUS_BADGE = {
  placed:     'text-yellow-400 bg-yellow-400/10',
  bought:     'text-blue-400 bg-blue-400/10',
  on_the_way: 'text-brand-400 bg-brand-500/10',
  arrived:    'text-sky-400 bg-sky-400/10',
};

const STATUS_LABEL = {
  placed: 'Order Placed', bought: 'Bought', on_the_way: 'On The Way', arrived: 'Arrived',
};

/* ── Main component ─────────────────────────────────────────────── */
export default function CourierDashboard() {
  const { profile, session, updateProfileLocally } = useAuth();
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(false);
  const [onlineInitialized, setOnlineInitialized] = useState(false);
  const [tick, setTick] = useState(0);
  const [activeOrders, setActiveOrders] = useState([]);
  const [available, setAvailable] = useState([]);
  const [verifyDelivery, setVerifyDelivery] = useState(null);
  const [updating, setUpdating] = useState(null);
  const [fraudWarningTarget, setFraudWarningTarget] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [acceptError, setAcceptError] = useState('');
  const [etaByOrder, setEtaByOrder] = useState({});
  const [earningsSummary, setEarningsSummary] = useState({ earned: 0, reimbursed: 0, totalDeliveries: 0 });
  const [courierCoords, setCourierCoords] = useState(null);
  const [locationStatus, setLocationStatus] = useState('pending'); // pending | ok | denied | offcampus
  const [isOnCampus, setIsOnCampus] = useState(false);

  // Matching constants
  const PROXIMITY_RADIUS_M  = 800;  // metres — nearby courier
  const BROADCAST_TIMEOUT_S = 120;  // seconds before order opens to all on-campus couriers
  const MIN_RATING_PRIORITY = 4.0;  // rating threshold for instant access

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Restore is_online from DB on first profile load — persists across app restarts
  useEffect(() => {
    if (profile && !onlineInitialized) {
      setIsOnline(profile.is_online ?? false);
      setOnlineInitialized(true);
    }
  }, [profile, onlineInitialized]);

  async function toggleOnline() {
    const newVal = !isOnline;
    // Prevent going offline while an active delivery is in progress
    if (!newVal) {
      const hasActiveDelivery = activeOrders.some(o =>
        ['placed', 'bought', 'on_the_way', 'arrived'].includes(o.status)
      );
      if (hasActiveDelivery) {
        setAcceptError('Complete your active delivery before going offline.');
        return;
      }
    }
    setIsOnline(newVal);
    await supabase.from('profiles').update({ is_online: newVal }).eq('id', session.user.id);
    updateProfileLocally({ is_online: newVal });
  }

  // Get GPS when going online; save to profile for admin dispatch visibility
  useEffect(() => {
    if (!isOnline || !session?.user?.id) return;
    setLocationStatus('pending');

    function applyPosition(lat, lng) {
      const coords = { lat, lng };
      setCourierCoords(coords);
      const d = _haversine(coords, CAMPUS_CENTER);
      const onCampus = d <= CAMPUS_GEOFENCE_RADIUS_M;
      setIsOnCampus(onCampus);
      setLocationStatus(onCampus ? 'ok' : 'offcampus');
      supabase.from('profiles').update({ courier_lat: lat, courier_lng: lng }).eq('id', session.user.id);
    }

    (async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (Capacitor.isNativePlatform()) {
          // Use native Geolocation plugin on Android — triggers proper OS permission dialog
          const { Geolocation } = await import('@capacitor/geolocation');
          const perm = await Geolocation.requestPermissions();
          if (perm.location !== 'granted' && perm.coarseLocation !== 'granted') {
            setLocationStatus('denied'); setIsOnCampus(false); return;
          }
          const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
          applyPosition(pos.coords.latitude, pos.coords.longitude);
        } else {
          if (!navigator.geolocation) { setLocationStatus('denied'); return; }
          navigator.geolocation.getCurrentPosition(
            pos => applyPosition(pos.coords.latitude, pos.coords.longitude),
            () => { setLocationStatus('denied'); setIsOnCampus(false); },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 30_000 },
          );
        }
      } catch {
        setLocationStatus('denied');
        setIsOnCampus(false);
      }
    })();
  }, [isOnline, session?.user?.id]);

  // Returns visibility info for an available order based on matching rules + hostel access
  function getOrderVisibility(order) {
    if (order.buyer_id === session?.user?.id) return { visible: false };
    if (!isOnCampus) return { visible: false, offCampus: true };

    const courierGender     = profile?.gender;           // 'male' | 'female'
    const isResidential     = profile?.campus_status === 'residential';
    const pickup            = order.pickup_location;
    const dropoff           = order.dropoff_location;
    const involvesVF        = VF_ESTATE.has(pickup) || VF_ESTATE.has(dropoff);
    const involvesMH        = MH_ESTATE.has(pickup) || MH_ESTATE.has(dropoff);

    if (involvesVF) {
      if (courierGender !== 'female') return { visible: false };
      if (!order.allow_offcampus && !isResidential) return { visible: false };
      if (order.allow_offcampus && !isResidential)
        return { visible: true, hostelNote: 'victoria_falls' };
    }

    if (involvesMH) {
      if (courierGender !== 'male') return { visible: false };
      if (!order.allow_offcampus && !isResidential) return { visible: false };
      if (order.allow_offcampus && !isResidential)
        return { visible: true, hostelNote: 'moat_heaven' };
    }

    const ageS = (Date.now() - new Date(order.created_at)) / 1000;
    if (ageS >= BROADCAST_TIMEOUT_S) return { visible: true, reason: 'broadcast' };
    if ((profile?.avg_rating || 0) >= MIN_RATING_PRIORITY)
      return { visible: true, reason: 'priority' };
    if (courierCoords && order.pickup_coords) {
      const dist = _haversine(courierCoords, order.pickup_coords);
      if (dist <= PROXIMITY_RADIUS_M) return { visible: true, reason: 'nearby', dist };
    }
    return { visible: false, opensIn: Math.ceil(BROADCAST_TIMEOUT_S - ageS) };
  }

  // Load orders from DB + realtime subscriptions
  useEffect(() => {
    if (!session?.user?.id || !profile?.is_courier) return;
    const userId = session.user.id;
    let activeCh, availCh;

    async function loadOrders() {
      const [{ data: active }, { data: avail }] = await Promise.all([
        supabase.from('deliveries').select('*')
          .eq('courier_id', userId)
          .not('status', 'in', '("delivered","cancelled")')
          .order('accepted_at', { ascending: false }),
        supabase.from('deliveries').select('*')
          .is('courier_id', null)
          .eq('status', 'placed')
          .eq('payment_verified', true)
          .neq('buyer_id', userId)
          .order('created_at', { ascending: false }),
      ]);
      setActiveOrders(active || []);
      setAvailable(avail || []);
    }
    loadOrders();

    // Realtime: courier's own active orders updated
    activeCh = supabase.channel(`courier-active:${userId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'deliveries',
        filter: `courier_id=eq.${userId}`,
      }, payload => {
        const updated = payload.new;
        if (updated.status === 'delivered' || updated.status === 'cancelled') {
          setActiveOrders(prev => prev.filter(o => o.id !== updated.id));
        } else {
          setActiveOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
        }
      })
      .subscribe();

    // Realtime: new available orders appear
    availCh = supabase.channel('available-orders')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'deliveries',
      }, payload => {
        const o = payload.new;
        if (!o.courier_id && o.status === 'placed' && o.payment_verified) {
          setAvailable(prev => [o, ...prev]);
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'deliveries',
      }, payload => {
        const o = payload.new;
        if (o.courier_id || o.status !== 'placed') {
          setAvailable(prev => prev.filter(a => a.id !== o.id));
        } else if (!o.courier_id && o.status === 'placed' && o.payment_verified && o.buyer_id !== userId) {
          // Payment just confirmed — add to available if not already present
          setAvailable(prev => prev.some(a => a.id === o.id) ? prev : [o, ...prev]);
        }
      })
      .subscribe();

    return () => {
      if (activeCh) supabase.removeChannel(activeCh);
      if (availCh) supabase.removeChannel(availCh);
    };
  }, [session?.user?.id, profile?.is_courier]);

  // Load real earnings summary from courier_earnings
  useEffect(() => {
    if (!session?.user?.id) return;
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    supabase
      .from('courier_earnings')
      .select('type, amount, created_at')
      .eq('courier_id', session.user.id)
      .then(({ data }) => {
        if (!data) return;
        const weekEarned = data
          .filter(e => ['delivery_fee', 'tip'].includes(e.type) && e.created_at >= weekAgo)
          .reduce((s, e) => s + e.amount, 0);
        const reimbursed = data
          .filter(e => e.type === 'reimbursement')
          .reduce((s, e) => s + e.amount, 0);
        const deliveryIds = new Set(data.map(e => e.delivery_id).filter(Boolean));
        setEarningsSummary({ earned: weekEarned, reimbursed, totalDeliveries: deliveryIds.size });
      });
  }, [session?.user?.id]);

  if (!profile?.is_courier) {
    return (
      <div className="bg-surface-950 min-h-full p-4 text-center py-20">
        <div className="w-16 h-16 bg-surface-900 rounded-full flex items-center justify-center mx-auto mb-4">
          <Bike className="w-8 h-8 text-gray-600" />
        </div>
        <p className="font-semibold text-white text-lg">Courier mode not active</p>
        <p className="text-sm text-gray-500 mt-1">Enable courier mode in your profile to start earning.</p>
        <button onClick={() => navigate('/profile')} className="mt-5 bg-brand-500 text-white px-6 py-3 rounded-xl text-sm font-semibold">
          Go to Profile
        </button>
      </div>
    );
  }

  async function acceptOrder(order) {
    setAcceptError('');
    const eta = etaByOrder[order.id];
    if (!eta) { setAcceptError('Please select an estimated delivery time first.'); return; }
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('deliveries')
      .update({ courier_id: session.user.id, courier_accepted: true, accepted_at: now, estimated_delivery_minutes: eta })
      .eq('id', order.id)
      .is('courier_id', null)
      .select()
      .maybeSingle();
    if (error) {
      setAcceptError('Could not accept order. ' + error.message);
      return;
    }
    if (!data) {
      setAcceptError('Order already taken by another courier.');
      return;
    }
    setAvailable(prev => prev.filter(o => o.id !== order.id));
    setActiveOrders(prev => [...prev, data]);
  }

  async function updateStatus(delivery, nextStatus) {
    if (STATUS_NEXT[delivery.status]?.requiresCode) { setVerifyDelivery(delivery); return; }
    const gl = graceLeft(delivery);
    if (delivery.status === 'placed' && gl > 0) return;
    if (delivery.price_edit_flag) return;
    setUpdating(delivery.id);
    const updates = { status: nextStatus };
    if (nextStatus === 'delivered') updates.delivered_at = new Date().toISOString();
    await supabase.from('deliveries').update(updates).eq('id', delivery.id);
    setActiveOrders(prev => prev.map(o => o.id === delivery.id ? { ...o, ...updates } : o));
    setUpdating(null);
  }

  function handleItemEditClick(orderId, itemIndex, item) {
    setFraudWarningTarget({ orderId, itemIndex, item });
  }

  function handleFraudAccept() {
    setEditingItem(fraudWarningTarget);
    setFraudWarningTarget(null);
  }

  async function handleItemPriceSubmit({ orderId, itemIndex, itemName, originalPrice, newPrice }) {
    const order = activeOrders.find(o => o.id === orderId);
    if (!order) return;

    const updatedItems = order.items.map((item, i) => {
      if (i !== itemIndex) return item;
      return {
        ...item,
        original_price: String(item.original_price ?? item.price),
        price: String(newPrice),
      };
    });

    const { error: updateErr } = await supabase
      .from('deliveries')
      .update({ items: updatedItems, price_edit_flag: true })
      .eq('id', orderId);

    if (!updateErr) {
      // Audit log
      supabase.from('price_edit_logs').insert({
        delivery_id: orderId,
        courier_id: session.user.id,
        item_name: itemName,
        original_price: originalPrice,
        new_price: newPrice,
      });

      // Notify buyer
      if (order.buyer_id) {
        supabase.from('notifications').insert({
          user_id: order.buyer_id,
          type: 'price_edit',
          title: 'Price Updated by Runner',
          body: `"${itemName}" changed from ₦${Math.round(originalPrice).toLocaleString()} → ₦${Math.round(newPrice).toLocaleString()}. Open your order to accept or cancel.`,
        });
      }

      setActiveOrders(prev => prev.map(o =>
        o.id === orderId ? { ...o, items: updatedItems, price_edit_flag: true } : o
      ));
    }

    setEditingItem(null);
  }

  const inProgress = activeOrders.filter(o => o.status !== 'delivered');
  const done = activeOrders.filter(o => o.status === 'delivered');
  const openCount = available.length;
  const activeCount = inProgress.filter(o => ['bought', 'on_the_way'].includes(o.status)).length;
  const doneCount = done.length;

  // No longer reading global priceEditState — each delivery has its own price_edit_flag

  const stats = [
    { label: 'Total Deliveries', value: earningsSummary.totalDeliveries, sub: `${doneCount} today`, icon: CheckCircle, iconColor: 'text-green-400', iconBg: 'bg-green-500/15' },
    { label: 'Earned This Week', value: `₦${earningsSummary.earned.toLocaleString()}`, sub: 'fees + tips', icon: Wallet, iconColor: 'text-brand-400', iconBg: 'bg-brand-500/15' },
    { label: 'Daily Average', value: `₦${Math.round(earningsSummary.earned / 7).toLocaleString()}`, sub: 'per day this week', icon: TrendingUp, iconColor: 'text-blue-400', iconBg: 'bg-blue-500/15' },
    { label: 'Reimbursement', value: `₦${earningsSummary.reimbursed.toLocaleString()}`, sub: 'pending payout', icon: Star, iconColor: 'text-yellow-400', iconBg: 'bg-yellow-500/15' },
  ];

  return (
    <div className="bg-surface-950 min-h-full">
      {/* Header */}
      <div className="px-4 pt-5 pb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Courier Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">You're on duty. Campus is counting on you.</p>
        </div>
        <button
          onClick={toggleOnline}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold shrink-0 transition-all ${
            isOnline ? 'bg-green-500/15 text-green-400 border border-green-500/30' : 'bg-surface-900 text-gray-400 border border-white/[0.08]'
          }`}
        >
          <Power className="w-4 h-4" aria-hidden="true" />
          {isOnline ? 'Online' : 'Offline'}
        </button>
      </div>

      {/* Stats */}
      <div className="px-4 mb-4 grid grid-cols-2 gap-3">
        {stats.map(({ label, value, sub, icon: Icon, iconColor, iconBg }) => (
          <div key={label} className="bg-surface-900 border border-white/[0.08] rounded-2xl p-4">
            <div className={`w-9 h-9 ${iconBg} rounded-xl flex items-center justify-center mb-3`}>
              <Icon className={`w-5 h-5 ${iconColor}`} aria-hidden="true" />
            </div>
            <p className={`text-2xl font-bold ${iconColor}`}>{value}</p>
            <p className="text-sm text-gray-300 mt-0.5 font-medium">{label}</p>
            <p className="text-xs text-gray-500 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* OPEN / ACTIVE / DONE */}
      <div className="px-4 mb-4">
        <div className="bg-surface-900 border border-white/[0.08] rounded-2xl p-3 grid grid-cols-3 divide-x divide-white/[0.08]">
          {[
            { label: 'OPEN',   count: openCount,   color: 'text-white' },
            { label: 'ACTIVE', count: activeCount,  color: 'text-brand-400' },
            { label: 'DONE',   count: doneCount,    color: 'text-green-400' },
          ].map(({ label, count, color }) => (
            <div key={label} className="text-center px-2 py-1">
              <p className={`text-2xl font-bold ${color}`}>{count}</p>
              <p className="text-gray-500 text-xs font-semibold tracking-wider mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Offline */}
      {!isOnline && (
        <div className="px-4 mb-4">
          <div className="bg-surface-900 border border-white/[0.08] rounded-2xl p-8 flex flex-col items-center text-center">
            <div className="w-14 h-14 bg-surface-800 rounded-full flex items-center justify-center mb-4">
              <Power className="w-7 h-7 text-gray-500" aria-hidden="true" />
            </div>
            <p className="text-white font-semibold text-base">You're off duty</p>
            <p className="text-gray-500 text-sm mt-1.5">Toggle online above to start receiving delivery requests.</p>
            <button
              onClick={toggleOnline}
              className="mt-5 bg-gradient-to-br from-brand-500 to-indigo-600 text-white font-semibold px-6 py-2.5 rounded-xl text-sm shadow-lg shadow-brand-500/20"
            >
              Start Accepting Deliveries
            </button>
          </div>
        </div>
      )}

      {/* Active Deliveries */}
      {isOnline && inProgress.length > 0 && (
        <div className="px-4 mb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">My Active Deliveries</p>
          <div className="space-y-3">
            {inProgress.map(delivery => {
              const action = STATUS_NEXT[delivery.status];
              const gl = graceLeft(delivery);
              const gracePeriodActive = gl > 0 && delivery.status === 'placed';
              const eta = getEta(delivery);
              const isBlocked = delivery.status === 'placed' && gl > 0;
              // Per-order flag — only blocks THIS delivery, not others
              const priceEditPending = !!delivery.price_edit_flag;
              const canEditPrices = delivery.status === 'placed' && !isBlocked && !priceEditPending && delivery.order_type === 'purchase';
              void tick;

              return (
                <div key={delivery.id} className="bg-surface-900 border border-white/[0.08] rounded-2xl overflow-hidden">
                  {/* Grace period banner */}
                  {gracePeriodActive && (
                    <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-amber-400">Grace period: {fmt(gl)}</p>
                        <p className="text-xs text-amber-400/70">Both sides can cancel freely</p>
                      </div>
                      <button
                        onClick={async () => {
                          // During grace period, re-queue the order instead of cancelling it.
                          // The buyer keeps their paid order — another courier can accept it.
                          const { error } = await supabase.from('deliveries')
                            .update({
                              courier_id: null,
                              courier_accepted: false,
                              accepted_at: null,
                            })
                            .eq('id', delivery.id)
                            .eq('status', 'placed'); // safety: only requeue if not yet bought
                          if (error) {
                            // Order progressed past placed — do full cancel as fallback
                            await supabase.rpc('cancel_delivery', {
                              p_delivery_id: delivery.id,
                              p_cancelled_by: 'courier',
                            });
                          }
                          setActiveOrders(prev => prev.filter(o => o.id !== delivery.id));
                        }}
                        className="text-xs font-semibold bg-amber-500/20 border border-amber-500/30 text-amber-400 px-3 py-1.5 rounded-lg"
                      >
                        Release Order
                      </button>
                    </div>
                  )}

                  {/* Awaiting buyer price approval banner */}
                  {priceEditPending && (
                    <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-3 flex items-start gap-3">
                      <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 animate-pulse" aria-hidden="true" />
                      <div>
                        <p className="text-sm font-bold text-amber-400">Awaiting buyer approval</p>
                        <p className="text-xs text-amber-400/70 mt-0.5">
                          Price update sent. Buyer must accept or cancel before you can continue.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_BADGE[delivery.status] || ''}`}>
                        {STATUS_LABEL[delivery.status] || delivery.status}
                      </span>
                      <p className="text-lg font-bold text-green-400">₦{delivery.delivery_fee?.toLocaleString()}</p>
                    </div>

                    {/* Locations */}
                    <div className="space-y-2 mb-3">
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
                    </div>

                    {/* ETA */}
                    {delivery.status !== 'placed' && eta && (
                      <div className="flex items-center gap-2 mb-3">
                        <Clock className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                        <p className="text-xs text-amber-400 font-medium">Estimated delivery: {eta}</p>
                      </div>
                    )}

                    {/* Items with per-item price editing */}
                    {delivery.order_type === 'purchase' && delivery.items?.length > 0 && (
                      <div className="bg-surface-800 border border-white/[0.06] rounded-xl p-3 mb-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-semibold text-gray-400">Items to buy</p>
                          {canEditPrices && (
                            <span className="text-[10px] text-gray-600 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                              Price changes are monitored
                            </span>
                          )}
                        </div>
                        <div className="space-y-2">
                          {delivery.items.map((item, i) => {
                            const originalPrice = item.original_price != null ? parseFloat(item.original_price) : null;
                            const currentPrice = parseFloat(item.price);
                            const wasEdited = originalPrice != null && originalPrice !== currentPrice;
                            const diffAmt = wasEdited ? (currentPrice - originalPrice) * (item.qty || 1) : 0;

                            return (
                              <div key={i} className="flex items-start justify-between gap-2">
                                <span className="text-xs text-gray-300 flex-1 leading-relaxed">{item.qty}× {item.name}</span>
                                <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                                  {wasEdited && (
                                    <span className="text-xs line-through text-gray-600">
                                      ₦{(originalPrice * item.qty).toLocaleString()}
                                    </span>
                                  )}
                                  <span className={`text-xs font-semibold ${wasEdited ? 'text-amber-400' : 'text-gray-300'}`}>
                                    ₦{(currentPrice * item.qty).toLocaleString()}
                                  </span>
                                  {wasEdited && (
                                    <span className="text-[10px] font-bold bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded">
                                      +₦{diffAmt.toLocaleString()}
                                    </span>
                                  )}
                                  {canEditPrices && (
                                    <button
                                      onClick={() => handleItemEditClick(delivery.id, i, item)}
                                      className="flex items-center gap-0.5 text-[10px] font-semibold text-brand-400 bg-brand-500/10 border border-brand-500/20 px-1.5 py-0.5 rounded"
                                    >
                                      <Pencil className="w-2.5 h-2.5" aria-hidden="true" />
                                      Edit
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="border-t border-white/[0.08] mt-2 pt-2 flex justify-between text-xs font-semibold">
                          <span className="text-gray-400">Food cost (reimburse)</span>
                          <span className="text-green-400">+₦{delivery.food_cost?.toLocaleString()}</span>
                        </div>
                      </div>
                    )}

                    {/* Grace period note */}
                    {isBlocked && (
                      <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 mb-3">
                        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
                        <p className="text-xs text-amber-400">Do not buy items until the grace period expires.</p>
                      </div>
                    )}

                    {delivery.special_instructions && (
                      <p className="text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-xl p-2.5 mb-3">
                        📝 {delivery.special_instructions}
                      </p>
                    )}

                    {/* Chat with buyer */}
                    <CourierChatPanel deliveryId={delivery.id} buyerId={delivery.buyer_id} session={session} />

                    {/* Action button */}
                    {action && <div className="mt-3" />}
                    {action && (
                      <button
                        onClick={() => updateStatus(delivery, action.next)}
                        disabled={updating === delivery.id || isBlocked || priceEditPending}
                        className={`w-full bg-gradient-to-br ${action.color} text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-40 transition-opacity`}
                      >
                        {action.requiresCode && <Lock className="w-4 h-4" aria-hidden="true" />}
                        {updating === delivery.id ? 'Updating…' :
                         priceEditPending ? 'Waiting for buyer approval…' :
                         isBlocked ? `Waiting for grace period (${fmt(gl)})` :
                         action.label}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isOnline && inProgress.length === 0 && (
        <div className="px-4 mb-4">
          <div className="bg-surface-900 border border-white/[0.08] rounded-2xl p-8 flex flex-col items-center text-center">
            <div className="w-14 h-14 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
              <Bike className="w-7 h-7 text-green-400" aria-hidden="true" />
            </div>
            <p className="text-white font-semibold">Looking for orders…</p>
            <p className="text-gray-500 text-sm mt-1.5">New delivery requests will appear below</p>
          </div>
        </div>
      )}

      {/* Available Orders */}
      {acceptError && (
        <div className="mx-4 mb-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          <p className="text-xs text-red-400">{acceptError}</p>
        </div>
      )}
      {isOnline && available.length > 0 && (
        <div className="px-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Available Orders</p>
            <div className="flex items-center gap-2">
              {profile?.avg_rating >= MIN_RATING_PRIORITY && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-2 py-0.5 rounded-full">
                  <Star className="w-2.5 h-2.5" /> Priority Access
                </span>
              )}
              <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${
                locationStatus === 'ok' ? 'text-green-400 bg-green-400/10 border-green-400/20' :
                locationStatus === 'offcampus' ? 'text-red-400 bg-red-400/10 border-red-400/20' :
                locationStatus === 'denied' ? 'text-gray-500 bg-white/[0.04] border-white/[0.08]' :
                'text-amber-400 bg-amber-400/10 border-amber-400/20'
              }`}>
                <MapPin className="w-2.5 h-2.5" />
                {locationStatus === 'ok' ? 'On Campus' :
                 locationStatus === 'offcampus' ? 'Off Campus' :
                 locationStatus === 'denied' ? 'No GPS' : 'Locating…'}
              </span>
            </div>
          </div>
          {locationStatus === 'offcampus' && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 flex items-start gap-2 mb-2">
              <MapPin className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-400">You are off campus</p>
                <p className="text-xs text-red-400/70 mt-0.5">You must be physically on Nile University campus to accept orders.</p>
              </div>
            </div>
          )}
          <div className="space-y-3">
            {available.map(order => {
              // eslint-disable-next-line react-hooks/rules-of-hooks -- tick is stable
              const vis = getOrderVisibility(order);
              const locked = !vis.visible;
              return (
                <div key={order.id} className={`bg-surface-900 border rounded-2xl p-4 transition-opacity ${locked ? 'opacity-60 border-white/[0.05]' : 'border-white/[0.08]'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-500 uppercase">{order.order_type}</span>
                      {!locked && vis.reason === 'nearby' && (
                        <span className="text-[10px] text-brand-400 bg-brand-400/10 border border-brand-400/20 px-1.5 py-0.5 rounded-full">Nearby</span>
                      )}
                      {!locked && vis.reason === 'priority' && (
                        <span className="text-[10px] text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-1.5 py-0.5 rounded-full">Priority</span>
                      )}
                      {!locked && vis.reason === 'broadcast' && (
                        <span className="text-[10px] text-green-400 bg-green-400/10 border border-green-400/20 px-1.5 py-0.5 rounded-full">Open</span>
                      )}
                    </div>
                    <span className="text-sm font-bold text-green-400">₦{order.delivery_fee?.toLocaleString()}</span>
                  </div>
                  <div className="space-y-2 mb-3">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-brand-400 mt-0.5 shrink-0" aria-hidden="true" />
                      <p className="text-sm text-white">{order.pickup_location}</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-green-400 mt-0.5 shrink-0" aria-hidden="true" />
                      <p className="text-sm text-white">{order.dropoff_location}</p>
                    </div>
                  </div>
                  {order.order_type === 'purchase' && order.food_cost > 0 && (
                    <p className="text-xs text-gray-500 mb-3">
                      Food cost to reimburse: <span className="text-green-400 font-semibold">₦{order.food_cost.toLocaleString()}</span>
                    </p>
                  )}
                  {order.order_type === 'errand' && order.item_description && (
                    <p className="text-xs text-gray-400 bg-surface-800 rounded-lg px-3 py-2 mb-3">{order.item_description}</p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-gray-600 mb-3">
                    <Clock className="w-3 h-3" aria-hidden="true" />
                    {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                  </div>
                  {!locked && vis.hostelNote && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2 mb-3 flex items-start gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" aria-hidden="true" />
                      <p className="text-xs text-amber-400 leading-relaxed">
                        {vis.hostelNote === 'victoria_falls'
                          ? 'You cannot enter Victoria Falls estate. The buyer will meet you outside the gate.'
                          : 'You cannot enter Moat Heaven estate. The buyer will meet you outside the gate.'}
                      </p>
                    </div>
                  )}
                  {!locked && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-400 mb-2 font-medium">How long will delivery take?</p>
                      <div className="flex flex-wrap gap-1.5">
                        {[5, 10, 15, 20, 30, 45].map(mins => (
                          <button
                            key={mins}
                            onClick={() => setEtaByOrder(p => ({ ...p, [order.id]: mins }))}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                              etaByOrder[order.id] === mins
                                ? 'bg-brand-500 border-brand-500 text-white'
                                : 'bg-surface-800 border-white/[0.08] text-gray-400 hover:border-brand-500/50'
                            }`}
                          >
                            {mins} min
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {locked ? (
                    <div className="w-full bg-surface-800 border border-white/[0.06] rounded-xl py-2.5 flex items-center justify-center gap-2 text-sm text-gray-500">
                      <Lock className="w-3.5 h-3.5" />
                      Opens in {vis.opensIn}s
                    </div>
                  ) : (
                    <button
                      onClick={() => acceptOrder(order)}
                      disabled={!etaByOrder[order.id]}
                      className="w-full bg-gradient-to-br from-brand-500 to-indigo-600 hover:from-brand-600 hover:to-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl text-sm shadow-lg shadow-brand-500/20"
                    >
                      {etaByOrder[order.id] ? `Accept — ~${etaByOrder[order.id]} min` : 'Select a time estimate first'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="h-6" />

      {/* Modals */}
      {verifyDelivery && (
        <DeliveryCodeModal
          delivery={verifyDelivery}
          onSuccess={async () => {
            const now = new Date().toISOString();
            await supabase.from('deliveries')
              .update({ status: 'delivered', delivered_at: now })
              .eq('id', verifyDelivery.id);
            setActiveOrders(prev => prev.filter(o => o.id !== verifyDelivery.id));
            setVerifyDelivery(null);
          }}
          onClose={() => setVerifyDelivery(null)}
        />
      )}

      {fraudWarningTarget && (
        <FraudWarningModal
          itemName={fraudWarningTarget.item.name}
          onAccept={handleFraudAccept}
          onClose={() => setFraudWarningTarget(null)}
        />
      )}

      {editingItem && (
        <ItemPriceEditModal
          target={editingItem}
          onSubmit={handleItemPriceSubmit}
          onClose={() => setEditingItem(null)}
        />
      )}
    </div>
  );
}
