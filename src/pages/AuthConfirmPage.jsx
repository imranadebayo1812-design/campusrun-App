import { useEffect, useState } from 'react';
import { supabase } from '@/api/supabaseClient';
import { CheckCircle, XCircle } from 'lucide-react';
import Logo from '@/components/ui/Logo';

export default function AuthConfirmPage() {
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function confirm() {
      const params    = new URLSearchParams(window.location.search);
      const tokenHash = params.get('token_hash');
      const type      = params.get('type');

      if (tokenHash && type) {
        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
        if (error) {
          setStatus('error');
          setMessage(error.message || 'Confirmation link is invalid or has expired.');
          return;
        }
      }

      const { data: { session } } = await supabase.auth.getSession();
      setStatus(session ? 'success' : 'error');
      if (!session) setMessage('Could not verify your email. Please try logging in manually.');
    }

    confirm();
  }, []);

  return (
    <div className="min-h-screen bg-surface-950 flex flex-col">
      {/* Top accent bar */}
      <div className="h-1 w-full bg-gradient-to-r from-brand-500 to-indigo-500" />

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center relative">
        {/* Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 bg-brand-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center w-full max-w-xs gap-6">
          {/* Logo */}
          <div className="flex flex-col items-center gap-1">
            <Logo size={72} className="rounded-2xl shadow-xl shadow-brand-500/20" />
            <p className="text-xs text-gray-500 mt-2 tracking-widest uppercase">CampusRun</p>
          </div>

          {status === 'verifying' && (
            <>
              <div className="w-12 h-12 rounded-full border-4 border-brand-500/30 border-t-brand-500 animate-spin" />
              <p className="text-white font-semibold">Confirming your email…</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-20 h-20 bg-green-500/15 rounded-full flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-400" />
              </div>

              <div>
                <p className="text-xs font-bold tracking-[0.2em] uppercase text-brand-400 mb-2">Thanks for joining</p>
                <h1 className="text-3xl font-black text-white leading-tight">Your account is<br />confirmed. 🎉</h1>
                <p className="text-gray-400 text-sm mt-3 leading-relaxed">
                  Welcome to CampusRun — the fastest way to get deliveries done at Nile University, Abuja.
                </p>
              </div>

              {/* How it works */}
              <div className="w-full bg-surface-900 border border-white/[0.08] rounded-2xl p-5 text-left space-y-3">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">How it works</p>
                {[
                  { icon: '🏠', text: 'Browse vendors on the Home tab' },
                  { icon: '📦', text: 'Place your order in seconds' },
                  { icon: '📍', text: 'Track your runner in real-time' },
                  { icon: '💸', text: 'Pay with card or wallet balance' },
                ].map(({ icon, text }) => (
                  <div key={text} className="flex items-center gap-3">
                    <span className="text-base">{icon}</span>
                    <p className="text-sm text-gray-300">{text}</p>
                  </div>
                ))}
              </div>

              <p className="text-sm text-gray-500 bg-surface-900 border border-white/[0.08] rounded-2xl px-5 py-4 w-full">
                Open the <span className="font-bold text-white">CampusRun app</span> on your phone to start ordering.
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-20 h-20 bg-red-500/15 rounded-full flex items-center justify-center">
                <XCircle className="w-10 h-10 text-red-400" />
              </div>
              <div>
                <p className="text-xl font-bold text-white">Link expired</p>
                <p className="text-sm text-gray-400 mt-2">{message}</p>
              </div>
            </>
          )}

          <a href="mailto:support@campusrun.online" className="text-xs text-gray-600 hover:text-brand-400 transition-colors">
            support@campusrun.online
          </a>
        </div>
      </div>

      {/* Footer */}
      <div className="py-4 text-center border-t border-white/[0.06]">
        <p className="text-xs text-gray-600">© {new Date().getFullYear()} CampusRun · Nile University, Abuja</p>
      </div>
    </div>
  );
}
