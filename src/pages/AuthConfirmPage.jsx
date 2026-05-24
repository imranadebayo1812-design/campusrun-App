import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { XCircle } from 'lucide-react';
import Logo from '@/components/ui/Logo';

export default function AuthConfirmPage() {
  const navigate = useNavigate();
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
      if (session) {
        setStatus('success');
      } else {
        setStatus('error');
        setMessage('Could not verify your email. Please try logging in manually.');
      }
    }

    confirm();
  }, []);

  if (status === 'verifying') {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-brand-500/30 border-t-brand-500 animate-spin" />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-surface-950 flex flex-col items-center justify-center px-6 text-center gap-5">
        <div className="w-16 h-16 bg-red-500/15 rounded-full flex items-center justify-center">
          <XCircle className="w-8 h-8 text-red-400" />
        </div>
        <div>
          <p className="text-xl font-bold text-white">Link expired</p>
          <p className="text-sm text-gray-400 mt-2">{message}</p>
        </div>
        <button
          onClick={() => navigate('/', { replace: true })}
          className="bg-brand-500 hover:bg-brand-600 text-white font-bold px-8 py-3 rounded-2xl text-sm"
        >
          Go to Login
        </button>
        <a href="mailto:support@campusrun.online" className="text-xs text-brand-400 hover:underline">
          support@campusrun.online
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Top accent */}
      <div className="h-1.5 w-full bg-gradient-to-r from-brand-500 to-indigo-500" />

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        {/* Logo */}
        <Logo size={64} className="rounded-2xl shadow-lg mb-6" />

        {/* Confetti-style label */}
        <p className="text-xs font-bold tracking-[0.2em] uppercase text-brand-500 mb-4">
          Thanks for joining
        </p>

        {/* Headline */}
        <h1 className="text-4xl font-black text-gray-900 leading-tight mb-4">
          Your account is<br />confirmed. 🎉
        </h1>

        <p className="text-gray-500 text-base max-w-xs leading-relaxed mb-10">
          Welcome to CampusRun — the fastest way to get deliveries done at Nile University, Abuja.
        </p>

        {/* How it works */}
        <div className="w-full max-w-xs bg-gray-50 rounded-2xl p-5 mb-8 text-left space-y-3">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">How it works</p>
          {[
            { icon: '🏠', text: 'Browse vendors on the Home tab' },
            { icon: '📦', text: 'Place your order in seconds' },
            { icon: '📍', text: 'Track your runner in real-time' },
            { icon: '💸', text: 'Pay with card or wallet balance' },
          ].map(({ icon, text }) => (
            <div key={text} className="flex items-center gap-3">
              <span className="text-lg">{icon}</span>
              <p className="text-sm text-gray-600">{text}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={() => navigate('/', { replace: true })}
          className="w-full max-w-xs bg-gradient-to-br from-brand-500 to-indigo-600 hover:from-brand-600 hover:to-indigo-700 text-white font-black text-base py-4 rounded-2xl shadow-lg shadow-brand-500/30 transition-all"
        >
          Start Ordering →
        </button>

        <p className="text-xs text-gray-400 mt-6">
          Questions? <a href="mailto:support@campusrun.online" className="text-brand-500 hover:underline">support@campusrun.online</a>
        </p>
      </div>

      {/* Footer */}
      <div className="py-5 text-center border-t border-gray-100">
        <p className="text-xs text-gray-400">© {new Date().getFullYear()} CampusRun · Nile University, Abuja</p>
      </div>
    </div>
  );
}
