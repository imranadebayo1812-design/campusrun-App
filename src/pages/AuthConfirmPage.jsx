import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { CheckCircle, XCircle, Loader } from 'lucide-react';

export default function AuthConfirmPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // verifying | success | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function confirm() {
      const params = new URLSearchParams(window.location.search);
      const tokenHash = params.get('token_hash');
      const type      = params.get('type');

      if (tokenHash && type) {
        // PKCE flow — verify the token
        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
        if (error) {
          setStatus('error');
          setMessage(error.message || 'Confirmation link is invalid or has expired.');
          return;
        }
      }

      // Either PKCE succeeded or implicit flow already handled by the SDK
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setStatus('success');
        setTimeout(() => navigate('/', { replace: true }), 2500);
      } else {
        setStatus('error');
        setMessage('Could not sign you in. Please try logging in manually.');
      }
    }

    confirm();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-surface-950 flex flex-col items-center justify-center px-6 text-center gap-6">
      {/* Logo */}
      <div className="flex flex-col items-center gap-1 mb-2">
        <span className="text-3xl font-black text-white tracking-tight">🏃 CampusRun</span>
        <span className="text-xs text-gray-500">Campus deliveries at Nile University</span>
      </div>

      {status === 'verifying' && (
        <>
          <div className="w-16 h-16 bg-brand-500/15 rounded-full flex items-center justify-center">
            <Loader className="w-8 h-8 text-brand-400 animate-spin" />
          </div>
          <div>
            <p className="text-lg font-bold text-white">Confirming your email…</p>
            <p className="text-sm text-gray-400 mt-1">Just a moment</p>
          </div>
        </>
      )}

      {status === 'success' && (
        <>
          <div className="w-16 h-16 bg-green-500/15 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
          <div>
            <p className="text-lg font-bold text-white">Email confirmed!</p>
            <p className="text-sm text-gray-400 mt-1">Taking you to the app…</p>
          </div>
        </>
      )}

      {status === 'error' && (
        <>
          <div className="w-16 h-16 bg-red-500/15 rounded-full flex items-center justify-center">
            <XCircle className="w-8 h-8 text-red-400" />
          </div>
          <div>
            <p className="text-lg font-bold text-white">Confirmation failed</p>
            <p className="text-sm text-gray-400 mt-1">{message}</p>
          </div>
          <button
            onClick={() => navigate('/', { replace: true })}
            className="bg-brand-500 hover:bg-brand-600 text-white font-bold px-8 py-3 rounded-2xl text-sm"
          >
            Go to Login
          </button>
        </>
      )}
    </div>
  );
}
