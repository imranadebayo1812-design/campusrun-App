import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLocation } from 'react-router-dom';
import Logo from '@/components/ui/Logo';

const NILE_EMAIL_RE = /^[^\s@]+@([a-z0-9-]+\.)*nileuniversity\.edu\.ng$/i;

export default function LoginPage() {
  const { signIn, signUp } = useAuth();
  const location = useLocation();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Pre-fill referral code from ?ref= URL param and switch to signup mode
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const ref = params.get('ref');
    if (ref) {
      setReferralCode(ref.toUpperCase());
      setMode('signup');
    }
  }, [location.search]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (mode === 'signup') {
      if (!NILE_EMAIL_RE.test(email)) {
        setError('Only @nileuniversity.edu.ng email addresses can sign up.');
        setLoading(false);
        return;
      }
      const { error } = await signUp(email, password, fullName, referralCode.trim().toUpperCase());
      if (error) {
        setError(error.message);
      } else {
        setSuccess('Account created! You can now log in.');
        setMode('login');
      }
    } else {
      const { error } = await signIn(email, password);
      if (error) setError(error.message);
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center p-4">
      {/* Purple glow blob */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 bg-brand-600/30 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-3">
            <Logo size={120} className="rounded-2xl shadow-xl shadow-brand-500/20" />
          </div>
          <p className="text-gray-400 mt-2 text-sm tracking-wide uppercase font-medium">We Deliver. You Relax.</p>
        </div>

        {/* Mode toggle */}
        <div className="flex bg-surface-900 rounded-2xl p-1 mb-6 border border-white/[0.08]">
          <button
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              mode === 'login' ? 'bg-brand-500 text-white shadow-lg' : 'text-gray-400'
            }`}
            onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
          >
            Log In
          </button>
          <button
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              mode === 'signup' ? 'bg-brand-500 text-white shadow-lg' : 'text-gray-400'
            }`}
            onClick={() => { setMode('signup'); setError(''); setSuccess(''); }}
          >
            Sign Up
          </button>
        </div>

        {/* Card */}
        <div className="bg-surface-900 rounded-2xl border border-white/[0.08] p-6 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label htmlFor="login-fullname" className="block text-sm font-medium text-gray-300 mb-1.5">Full Name</label>
                <input
                  id="login-fullname"
                  type="text"
                  required
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full bg-surface-800 border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50"
                />
              </div>
            )}

            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@nileuniversity.edu.ng"
                aria-describedby={error ? 'login-error' : undefined}
                className="w-full bg-surface-800 border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50"
              />
            </div>

            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
              <input
                id="login-password"
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                minLength={6}
                aria-describedby={error ? 'login-error' : undefined}
                className="w-full bg-surface-800 border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50"
              />
            </div>

            {error && (
              <div id="login-error" role="alert" className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3">
                {error}
              </div>
            )}
            {success && (
              <div role="status" className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-xl px-4 py-3">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-br from-brand-500 to-indigo-600 hover:from-brand-600 hover:to-indigo-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-brand-500/25 text-sm"
            >
              {loading ? 'Please wait…' : mode === 'login' ? 'Log In' : 'Create Account'}
            </button>
          </form>

          {mode === 'signup' && (
            <>
              <div>
                <label htmlFor="login-referral" className="block text-sm font-medium text-gray-300 mb-1.5">
                  Referral Code <span className="text-gray-600 font-normal">(optional)</span>
                </label>
                <input
                  id="login-referral"
                  type="text"
                  value={referralCode}
                  onChange={e => setReferralCode(e.target.value.toUpperCase())}
                  placeholder="e.g. ABC12345"
                  maxLength={12}
                  className="w-full bg-surface-800 border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50 uppercase tracking-widest"
                />
              </div>
              <p className="text-xs text-gray-500 text-center">
                Only Nile University email addresses are allowed.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
