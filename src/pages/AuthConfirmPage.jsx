import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { CheckCircle, XCircle } from 'lucide-react';
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
        setTimeout(() => navigate('/', { replace: true }), 2500);
      } else {
        setStatus('error');
        setMessage('Could not verify your email. Please try logging in manually.');
      }
    }

    confirm();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-surface-950 flex flex-col items-center justify-center px-6 text-center">
      {/* Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 bg-brand-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center gap-6 w-full max-w-xs">
        {/* Logo */}
        <div className="flex flex-col items-center gap-1">
          <Logo size={72} className="rounded-2xl shadow-xl shadow-brand-500/20" />
          <p className="text-xs text-gray-500 mt-2 tracking-wide uppercase">Campus Deliveries · Nile University</p>
        </div>

        {status === 'verifying' && (
          <>
            <div className="w-16 h-16 rounded-full border-4 border-brand-500/30 border-t-brand-500 animate-spin" />
            <div>
              <p className="text-xl font-bold text-white">Confirming your email…</p>
              <p className="text-sm text-gray-400 mt-1">Just a moment</p>
            </div>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-20 h-20 bg-green-500/15 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-black text-white">You're in! 🎉</p>
              <p className="text-sm text-gray-400 mt-2 leading-relaxed">
                Your email is confirmed. Taking you to CampusRun now…
              </p>
            </div>
            <div className="w-full bg-surface-900 border border-white/[0.08] rounded-2xl px-5 py-4">
              <p className="text-xs text-gray-500 mb-2">What's next</p>
              <p className="text-sm text-gray-300">Set up your profile and place your first order. Deliveries are fast — most runners arrive within 20 minutes.</p>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-20 h-20 bg-red-500/15 rounded-full flex items-center justify-center">
              <XCircle className="w-10 h-10 text-red-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-white">Link expired</p>
              <p className="text-sm text-gray-400 mt-2 leading-relaxed">{message}</p>
            </div>
            <button
              onClick={() => navigate('/', { replace: true })}
              className="w-full bg-gradient-to-br from-brand-500 to-indigo-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-brand-500/20"
            >
              Go to Login
            </button>
            <p className="text-xs text-gray-600">
              Need help?{' '}
              <a href="mailto:support@campusrun.online" className="text-brand-400 hover:underline">
                support@campusrun.online
              </a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
