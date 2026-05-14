import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/api/supabaseClient';

const AuthContext = createContext(null);

const ADMIN_EMAILS = ['imranadebayo1812@gmail.com', 'okekejohnk8012@gmail.com'];

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) loadProfile(session.user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        loadProfile(session.user);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadProfile(authUser) {
    if (!authUser) return;
    const meta = authUser.user_metadata || {};

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();

    if (data) {
      setProfile({
        ...data,
        terms_accepted: data.terms_accepted || meta.terms_accepted || false,
      });
    } else {
      // Profile missing — create it now
      const newProfile = {
        id: authUser.id,
        email: authUser.email,
        full_name: meta.full_name || '',
        terms_accepted: meta.terms_accepted || false,
        onboarding_complete: false,
        is_admin: ADMIN_EMAILS.includes(authUser.email),
        is_courier: false,
        is_blacklisted: false,
        wallet_balance: 0,
        total_earnings: 0,
        fraud_score: 0,
      };
      // Try to insert — may fail due to RLS but we still use local state
      await supabase.from('profiles').upsert(newProfile, { onConflict: 'id' });
      setProfile(newProfile);
    }
  }

  async function refreshProfile() {
    if (session) {
      const { data: { user } } = await supabase.auth.getUser();
      await loadProfile(user || session.user);
    }
  }

  function updateProfileLocally(updates) {
    setProfile(prev => prev ? { ...prev, ...updates } : updates);
  }

  async function signUp(email, password, fullName) {
    const domain = email.split('@')[1];
    const isAllowed = domain === 'nileuniversity.edu.ng' || ADMIN_EMAILS.includes(email);
    if (!isAllowed) {
      return { error: { message: 'Only Nile University email addresses are allowed to register.' } };
    }
    return supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
  }

  async function signIn(email, password) {
    return supabase.auth.signInWithPassword({ email, password });
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  const loading = session === undefined;

  return (
    <AuthContext.Provider value={{ session, profile, loading, signUp, signIn, signOut, refreshProfile, updateProfileLocally }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
