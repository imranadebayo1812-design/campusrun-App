import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';

const NILE_EMAIL_RE = /^[^\s@]+@([a-z0-9-]+\.)*nileuniversity\.edu\.ng$/i;

function isNileEmail(email) {
  return NILE_EMAIL_RE.test(email);
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession]     = useState(undefined); // undefined = initializing
  const [profile, setProfile]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [authError, setAuthError] = useState(false);

  const [walletTransactions, setWalletTransactions] = useState([]);
  const [notifications, setNotifications] = useState([]);

  // Price-edit flow shared between CourierDashboard ↔ TrackingPage
  const [priceEditState, setPriceEditState] = useState({
    pendingApproval: false,
    edits: [],
    pendingVerificationAmount: 0,
    adminQueue: [],
    rejectedOrderId: null,
  });

  // ── Bootstrap auth on mount ────────────────────────────────
  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (!mounted) return;
        if (error) { setAuthError(true); setLoading(false); return; }
        setSession(session ?? null);
        if (session) await loadProfile(session.user.id);
      } catch {
        if (mounted) setAuthError(true);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    bootstrap();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return;
      setSession(newSession ?? null);
      if (newSession) {
        loadProfile(newSession.user.id);
      } else {
        setProfile(null);
        setWalletTransactions([]);
        setNotifications([]);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // ── Load transactions & notifications when session is ready ─
  useEffect(() => {
    if (!session?.user?.id) return;
    const userId = session.user.id;
    let txChannel, notifChannel;

    async function loadUserData() {
      const [{ data: txs }, { data: notifs }] = await Promise.all([
        supabase
          .from('wallet_transactions')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        supabase
          .from('notifications')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(50),
      ]);
      setWalletTransactions(txs || []);
      setNotifications(notifs || []);

      txChannel = supabase.channel(`wallet-tx:${userId}`)
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'wallet_transactions',
          filter: `user_id=eq.${userId}`,
        }, payload =>
          setWalletTransactions(prev =>
            prev.some(t => t.id === payload.new.id) ? prev : [payload.new, ...prev]
          )
        )
        .subscribe();

      notifChannel = supabase.channel(`notifs:${userId}`)
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'notifications',
          filter: `user_id=eq.${userId}`,
        }, payload =>
          setNotifications(prev =>
            prev.some(n => n.id === payload.new.id) ? prev : [payload.new, ...prev]
          )
        )
        .subscribe();
    }

    loadUserData();
    return () => {
      if (txChannel) supabase.removeChannel(txChannel);
      if (notifChannel) supabase.removeChannel(notifChannel);
    };
  }, [session?.user?.id]);

  async function loadProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (!error && data) setProfile(data);
  }

  async function refreshProfile() {
    if (session?.user?.id) await loadProfile(session.user.id);
  }

  // ── Auth actions ───────────────────────────────────────────

  async function signUp(email, password, fullName, referralCode = '') {
    const metadata = { full_name: fullName };
    if (referralCode) metadata.referral_code = referralCode;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata },
    });
    return { error };
  }

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  // ── Profile helpers ────────────────────────────────────────

  function updateProfileLocally(updates) {
    setProfile(prev => prev ? { ...prev, ...updates } : updates);
  }

  // ── Wallet helpers (mock until Phase 2) ───────────────────

  function addWalletTransaction(tx) {
    setWalletTransactions(prev => [tx, ...prev]);
  }

  // ── Notification helpers ───────────────────────────────────

  function addNotification(notif) {
    setNotifications(prev => [
      { ...notif, id: `notif-${Date.now()}`, read: false, created_at: new Date().toISOString() },
      ...prev,
    ]);
  }

  async function markAllRead() {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    if (session?.user?.id) {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', session.user.id)
        .eq('read', false);
    }
  }

  async function markRead(id) {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    await supabase.from('notifications').update({ read: true }).eq('id', id);
  }

  // ── Price-edit flow ────────────────────────────────────────

  function submitPriceEdits(orderId, edits, courierName) {
    const auditEntries = edits.map((e, i) => ({
      id: `audit-${Date.now()}-${i}`,
      courier_name: courierName || 'Unknown',
      order_id: orderId,
      item_name: e.itemName,
      original_price: e.originalPrice,
      new_price: e.newPrice,
      difference: e.diff,
      qty: e.qty,
      timestamp: new Date().toISOString(),
      status: 'pending',
    }));
    setPriceEditState(prev => ({
      ...prev,
      pendingApproval: true,
      edits,
      adminQueue: [...prev.adminQueue, ...auditEntries],
    }));
  }

  function buyerAcceptsPriceEdit() {
    const extraAmount = priceEditState.edits.reduce(
      (sum, e) => sum + Math.max(0, e.diff) * (e.qty || 1),
      0
    );
    setPriceEditState(prev => ({
      ...prev,
      pendingApproval: false,
      edits: [],
      pendingVerificationAmount: prev.pendingVerificationAmount + extraAmount,
    }));
  }

  function buyerRejectsPriceEdit(orderId) {
    setPriceEditState(prev => ({
      ...prev,
      pendingApproval: false,
      edits: [],
      rejectedOrderId: orderId,
    }));
  }

  function clearRejectedOrder() {
    setPriceEditState(prev => ({ ...prev, rejectedOrderId: null }));
  }

  return (
    <AuthContext.Provider value={{
      session: session ?? null,
      profile,
      loading,
      authError,
      signUp,
      signIn,
      signOut,
      refreshProfile,
      updateProfileLocally,
      walletTransactions,
      addWalletTransaction,
      priceEditState,
      submitPriceEdits,
      buyerAcceptsPriceEdit,
      buyerRejectsPriceEdit,
      clearRejectedOrder,
      notifications,
      addNotification,
      markAllRead,
      markRead,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
