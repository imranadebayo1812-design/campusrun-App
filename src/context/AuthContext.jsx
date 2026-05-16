import { createContext, useContext, useState } from 'react';
import { MOCK_USER, MOCK_PROFILE, MOCK_TRANSACTIONS, MOCK_NOTIFICATIONS } from '@/lib/mockData';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [profile, setProfile] = useState(MOCK_PROFILE);
  const [walletTransactions, setWalletTransactions] = useState([...MOCK_TRANSACTIONS]);
  const [notifications, setNotifications] = useState([...MOCK_NOTIFICATIONS]);

  function addNotification(notif) {
    setNotifications(prev => [{ ...notif, id: `notif-${Date.now()}`, read: false, created_at: new Date().toISOString() }, ...prev]);
  }

  function markAllRead() {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }

  function markRead(id) {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }

  // Price edit state shared between CourierDashboard and TrackingPage
  const [priceEditState, setPriceEditState] = useState({
    pendingApproval: false,
    edits: [],                      // [{orderId, itemIndex, itemName, originalPrice, newPrice, diff, qty}]
    pendingVerificationAmount: 0,   // accumulated approved price diffs (shown in earnings)
    adminQueue: [],                 // full edit history for admin panel
    rejectedOrderId: null,          // set when buyer cancels → signals CourierDashboard
  });

  const session = { user: MOCK_USER };

  function updateProfileLocally(updates) {
    setProfile(prev => prev ? { ...prev, ...updates } : updates);
  }

  function addWalletTransaction(tx) {
    setWalletTransactions(prev => [tx, ...prev]);
  }

  // Called by CourierDashboard when courier submits a price edit
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

  // Called by TrackingPage (buyer) when they accept the price change
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

  // Called by TrackingPage (buyer) when they cancel due to price change
  function buyerRejectsPriceEdit(orderId) {
    setPriceEditState(prev => ({
      ...prev,
      pendingApproval: false,
      edits: [],
      rejectedOrderId: orderId,
    }));
  }

  // Called by CourierDashboard after it handles the rejection
  function clearRejectedOrder() {
    setPriceEditState(prev => ({ ...prev, rejectedOrderId: null }));
  }

  function signOut() {}
  function signUp() { return Promise.resolve({ error: null }); }
  function signIn() { return Promise.resolve({ error: null }); }
  function refreshProfile() {}

  return (
    <AuthContext.Provider value={{
      session, profile, loading: false, authError: false,
      signUp, signIn, signOut, refreshProfile,
      updateProfileLocally,
      walletTransactions, addWalletTransaction,
      priceEditState,
      submitPriceEdits, buyerAcceptsPriceEdit, buyerRejectsPriceEdit, clearRejectedOrder,
      notifications, addNotification, markAllRead, markRead,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
