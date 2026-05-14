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
      if (session) loadProfile(session.user.id, session.user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        loadProfile(session.user.id, session.user);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadProfile(userId, authUser) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (data) {
      // Merge auth metadata into profile so terms_accepted from metadata works
      const meta = authUser?.user_metadata || {};
      setProfile({
        ...data,
        terms_accepted: data.terms_accepted || meta.terms_accepted || false,
      });
    } else {
      setProfile(data);
    }
  }

  async function refreshProfile() {
    if (session) {
      const { data: { user } } = await supabase.auth.getUser();
      await loadProfile(session.user.id, user);
    }
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
    <AuthContext.Provider value={{ session, profile, loading, signUp, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
