import { createContext, useContext, useState } from 'react';
import { MOCK_USER, MOCK_PROFILE, MOCK_TRANSACTIONS } from '@/lib/mockData';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [profile, setProfile] = useState(MOCK_PROFILE);
  const [walletTransactions, setWalletTransactions] = useState([...MOCK_TRANSACTIONS]);

  const session = { user: MOCK_USER };

  function updateProfileLocally(updates) {
    setProfile(prev => prev ? { ...prev, ...updates } : updates);
  }

  function addWalletTransaction(tx) {
    setWalletTransactions(prev => [tx, ...prev]);
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
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
