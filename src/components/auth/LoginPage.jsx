import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import Logo from '@/components/ui/Logo';
import { X } from 'lucide-react';

const NILE_EMAIL_RE = /^[^\s@]+@([a-z0-9-]+\.)*nileuniversity\.edu\.ng$/i;

function TermsSheet({ onClose }) {
  return (
    <div
      className="fixed inset-x-0 top-0 bg-black/80 z-50 flex items-end justify-center p-4"
      style={{ height: '100dvh' }}
      onClick={onClose}
    >
      <div
        className="bg-surface-900 border border-white/[0.08] rounded-2xl w-full max-w-lg flex flex-col"
        style={{ maxHeight: '85dvh' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-white/[0.08]">
          <div>
            <h2 className="text-base font-bold text-white">Terms & Conditions</h2>
            <p className="text-xs text-gray-400 mt-0.5">CampusRun — Nile University</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/[0.06] text-gray-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 text-sm text-gray-400 space-y-4">
          <p>Welcome to <strong className="text-white">CampusRun</strong>. By creating an account you agree to the following terms:</p>

          <h3 className="font-semibold text-gray-200">1. Eligibility</h3>
          <p>CampusRun is exclusively for Nile University students and staff. You must use your institutional email address to register.</p>

          <h3 className="font-semibold text-gray-200">2. Orders & Payments</h3>
          <p>All payments are processed through Paystack or your CampusRun wallet. Delivery fees and service charges apply as displayed at checkout. Food costs for purchase orders are reimbursed to your courier upon successful delivery.</p>

          <h3 className="font-semibold text-gray-200">3. Couriers</h3>
          <p>Couriers are independent service providers. CampusRun does not guarantee courier availability. Once an order is accepted, the courier assumes responsibility for timely delivery.</p>

          <h3 className="font-semibold text-gray-200">4. Cancellations</h3>
          <p>Orders may be cancelled before courier acceptance at no charge. After acceptance, a grace period applies. CampusRun reserves the right to charge cancellation fees for late cancellations.</p>

          <h3 className="font-semibold text-gray-200">5. Prohibited Conduct</h3>
          <p>Abuse, fraud, and manipulation of the platform are strictly prohibited. Accounts engaging in such activities will be permanently suspended.</p>

          <h3 className="font-semibold text-gray-200">6. Wallet & Withdrawals</h3>
          <p>Courier earnings are held in your CampusRun wallet. Withdrawals are processed within 24–48 hours and are subject to admin review.</p>

          <h3 className="font-semibold text-gray-200">7. Privacy</h3>
          <p>Your data is used solely to operate the platform. We do not sell personal information. Location data is used only during active deliveries.</p>

          <h3 className="font-semibold text-gray-200">8. Changes</h3>
          <p>CampusRun may update these terms at any time. Continued use constitutes acceptance of the updated terms.</p>
        </div>

        <div className="p-5 border-t border-white/[0.08]">
          <button
            onClick={onClose}
            className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-3 rounded-2xl text-sm transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const { signIn, signUp } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login'); // 'login' | 'signup' | 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleForgotPassword(e) {
    e.preventDefault();
    if (!email) { setError('Enter your email address.'); return; }
    setLoading(true); setError('');
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://reset.campusrun.online',
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setSuccess('Reset link sent! Check your email (and spam folder).');
  }

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
      if (!termsAccepted) {
        setError('You must accept the Terms & Conditions to sign up.');
        setLoading(false);
        return;
      }
      const { error } = await signUp(email, password, fullName, referralCode.trim().toUpperCase());
      if (error) {
        setError(error.message);
      } else {
        setSuccess('Account created! Check your email to confirm your account.');
        setMode('login');
        setTermsAccepted(false);
      }
    } else {
      const { error } = await signIn(email, password);
      if (error) setError(error.message);
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center p-4">
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
        {mode !== 'forgot' && (
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
        )}

        {/* Card */}
        <div className="bg-surface-900 rounded-2xl border border-white/[0.08] p-6 space-y-4">

          {/* Forgot password form */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <p className="text-base font-bold text-white mb-1">Reset Password</p>
                <p className="text-xs text-gray-500 mb-4">Enter your email and we'll send a reset link.</p>
                <label htmlFor="forgot-email" className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
                <input
                  id="forgot-email"
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full bg-surface-800 border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                />
              </div>
              {error && <div role="alert" className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3">{error}</div>}
              {success && <div role="status" className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-xl px-4 py-3">{success}</div>}
              <button type="submit" disabled={loading} className="w-full bg-gradient-to-br from-brand-500 to-indigo-600 disabled:opacity-40 text-white font-bold py-3.5 rounded-xl text-sm">
                {loading ? 'Sending…' : 'Send Reset Link'}
              </button>
              <button type="button" onClick={() => { setMode('login'); setError(''); setSuccess(''); }} className="w-full text-sm text-gray-500 hover:text-gray-300 py-1">
                Back to Log In
              </button>
            </form>
          )}

          {mode !== 'forgot' && (
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

            {mode === 'signup' && (
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
            )}

            {mode === 'signup' && (
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative mt-0.5 shrink-0">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={termsAccepted}
                    onChange={e => setTermsAccepted(e.target.checked)}
                  />
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                    termsAccepted ? 'bg-brand-500 border-brand-500' : 'border-white/20 bg-surface-800'
                  }`}>
                    {termsAccepted && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-sm text-gray-400 leading-snug">
                  I have read and agree to the{' '}
                  <button
                    type="button"
                    onClick={() => setShowTerms(true)}
                    className="text-brand-400 underline underline-offset-2 hover:text-brand-300"
                  >
                    Terms & Conditions
                  </button>
                </span>
              </label>
            )}

            {error && (
              <div id="login-error" role="alert" className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3">
                {error}
              </div>
            )}
            {success && (
              <div role="status" className="bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3 space-y-1">
                <p className="text-green-400 text-sm font-medium">{success}</p>
                <p className="text-green-600 text-xs">Can't find it? Check your Junk or Spam folder and mark us as safe.</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (mode === 'signup' && !termsAccepted)}
              className="w-full bg-gradient-to-br from-brand-500 to-indigo-600 hover:from-brand-600 hover:to-indigo-700 disabled:opacity-40 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-brand-500/25 text-sm"
            >
              {loading ? 'Please wait…' : mode === 'login' ? 'Log In' : 'Create Account'}
            </button>

            {mode === 'login' && (
              <button type="button" onClick={() => { setMode('forgot'); setError(''); setSuccess(''); }} className="w-full text-sm text-gray-500 hover:text-gray-300 text-center py-1">
                Forgot password?
              </button>
            )}
          </form>
          )}

          {mode === 'signup' && (
            <p className="text-xs text-gray-500 text-center">
              Only Nile University email addresses are allowed.
            </p>
          )}

          <p className="text-xs text-gray-600 text-center">
            <button onClick={() => navigate('/privacy')} className="underline underline-offset-2 hover:text-gray-400">
              Privacy Policy
            </button>
          </p>
        </div>
      </div>

      {showTerms && <TermsSheet onClose={() => setShowTerms(false)} />}
    </div>
  );
}
