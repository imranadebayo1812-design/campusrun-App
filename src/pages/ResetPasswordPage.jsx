import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import Logo from '@/components/ui/Logo';
import { CheckCircle } from 'lucide-react';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase fires PASSWORD_RECOVERY when the reset link is followed
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true); setError('');
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setDone(true);
    setTimeout(() => navigate('/', { replace: true }), 2500);
  }

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center p-4">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 bg-brand-600/30 rounded-full blur-3xl pointer-events-none" />
      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-3">
            <Logo size={120} className="rounded-2xl shadow-xl shadow-brand-500/20" />
          </div>
        </div>

        <div className="bg-surface-900 rounded-2xl border border-white/[0.08] p-6 space-y-4">
          {done ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <CheckCircle className="w-10 h-10 text-green-400" />
              <p className="text-white font-bold">Password updated!</p>
              <p className="text-sm text-gray-400">Taking you to the app…</p>
            </div>
          ) : !ready ? (
            <div className="text-center py-4 space-y-2">
              <p className="text-white font-bold">Checking reset link…</p>
              <p className="text-sm text-gray-400">If nothing happens, the link may have expired. Request a new one from the login page.</p>
              <button onClick={() => navigate('/', { replace: true })} className="text-sm text-brand-400 underline">Back to Log In</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <p className="text-base font-bold text-white mb-1">Set New Password</p>
                <p className="text-xs text-gray-500 mb-4">Choose a strong password of at least 6 characters.</p>
              </div>
              <div>
                <label htmlFor="rp-password" className="block text-sm font-medium text-gray-300 mb-1.5">New Password</label>
                <input
                  id="rp-password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-surface-800 border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                />
              </div>
              <div>
                <label htmlFor="rp-confirm" className="block text-sm font-medium text-gray-300 mb-1.5">Confirm Password</label>
                <input
                  id="rp-confirm"
                  type="password"
                  required
                  minLength={6}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-surface-800 border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                />
              </div>
              {error && <div role="alert" className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3">{error}</div>}
              <button type="submit" disabled={loading} className="w-full bg-gradient-to-br from-brand-500 to-indigo-600 disabled:opacity-40 text-white font-bold py-3.5 rounded-xl text-sm">
                {loading ? 'Saving…' : 'Update Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
