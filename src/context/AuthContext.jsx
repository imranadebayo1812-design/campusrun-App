import { createContext, useContext, useState } from 'react';
import { MOCK_USER, MOCK_PROFILE } from '@/lib/mockData';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [profile, setProfile] = useState(MOCK_PROFILE);

  const session = { user: MOCK_USER };

  function updateProfileLocally(updates) {
    setProfile(prev => prev ? { ...prev, ...updates } : updates);
  }

  function signOut() {}
  function signUp() { return Promise.resolve({ error: null }); }
  function signIn() { return Promise.resolve({ error: null }); }
  function refreshProfile() {}

  return (
    <AuthContext.Provider value={{
      session, profile, loading: false, authError: false,
      signUp, signIn, signOut, refreshProfile, updateProfileLocally,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
