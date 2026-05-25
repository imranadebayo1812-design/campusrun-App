import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Copy, Check, Users, Banknote, Clock, Wallet } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/api/supabaseClient';

export default function ReferralPage() {
  const navigate = useNavigate();
  const { profile, session } = useAuth();
  const [copied, setCopied] = useState(false);
  const [earnedCount, setEarnedCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);

  const code = profile?.referral_code || '—';

  useEffect(() => {
    if (!session?.user?.id) return;
    const userId = session.user.id;

    async function fetchStats() {
      const [{ data: earned }, { data: allReferred }] = await Promise.all([
        supabase.from('referrals').select('id').eq('referrer_id', userId).eq('earned', true),
        supabase.from('profiles').select('id').eq('referred_by', userId),
      ]);

      const ec = earned?.length || 0;
      const total = allReferred?.length || 0;
      setEarnedCount(ec);
      setPendingCount(Math.max(0, total - ec));
      setTotalEarned(ec * 100);
      setLoadingStats(false);
    }

    fetchStats();
  }, [session?.user?.id]);

  function copyCode() {
    const msg = `Use my referral code *${code}* when signing up on CampusRun (enter it in the Referral Code field during sign-up). Download the app on Google Play: CampusRun`;
    navigator.clipboard.writeText(msg).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  const canWithdraw = totalEarned >= 1000;
  const needed = Math.max(0, 1000 - totalEarned);

  return (
    <div className="bg-surface-950 min-h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-4">
        <button onClick={() => navigate(-1)} aria-label="Go back" className="w-8 h-8 flex items-center justify-center rounded-xl bg-surface-800 border border-white/[0.08]">
          <ChevronLeft className="w-4 h-4 text-gray-400" aria-hidden="true" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">Referral Programme</h1>
          <p className="text-xs text-gray-500 mt-0.5">Share your code — earn ₦100 per invite</p>
        </div>
      </div>

      {/* Hero card */}
      <div className="mx-4 mb-5">
        <div
          className="rounded-2xl p-5 relative overflow-hidden"
          style={{ background: '#ffffff' }}
        >
          <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-black/5" />
          <div className="absolute -left-4 -bottom-8 w-28 h-28 rounded-full bg-black/[0.03]" />
          <p className="text-xs font-bold text-black/50 uppercase tracking-wider mb-3 relative z-10">Your Referral Code</p>
          <div className="flex items-center gap-3 mb-3 relative z-10">
            <p className="text-4xl font-black text-black tracking-widest">{code}</p>
            <button
              onClick={copyCode}
              aria-label="Copy referral code"
              className="flex items-center gap-1.5 bg-black/10 hover:bg-black/20 text-black text-xs font-semibold px-3 py-2 rounded-xl transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <p className="text-xs text-black/40 relative z-10">
            Tell your friend to enter this code in the <span className="text-black/70 font-semibold">Referral Code</span> field when signing up
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="mx-4 mb-5 grid grid-cols-3 gap-3">
        {[
          { icon: Users,    label: 'Earned',   value: loadingStats ? '…' : String(earnedCount),                    color: 'text-brand-400' },
          { icon: Clock,    label: 'Pending',  value: loadingStats ? '…' : String(pendingCount),                   color: 'text-yellow-400' },
          { icon: Banknote, label: 'Earned ₦', value: loadingStats ? '…' : `₦${totalEarned.toLocaleString()}`,    color: 'text-green-400' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-surface-900 border border-white/[0.08] rounded-2xl p-3.5 flex flex-col items-center text-center">
            <Icon className={`w-5 h-5 ${color} mb-2`} aria-hidden="true" />
            <p className={`text-lg font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Withdrawal CTA or progress */}
      {canWithdraw ? (
        <div className="mx-4 mb-5 bg-green-500/10 border border-green-500/20 rounded-2xl px-4 py-4">
          <p className="text-sm font-bold text-green-400 mb-1">₦{totalEarned.toLocaleString()} in your wallet 🎉</p>
          <p className="text-xs text-green-400/70 mb-3">Your referral earnings are already in your wallet balance.</p>
          <button
            onClick={() => navigate('/wallet')}
            className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
          >
            <Wallet className="w-4 h-4" aria-hidden="true" />
            Go to Wallet
          </button>
        </div>
      ) : (
        <div className="mx-4 mb-5 bg-amber-500/10 border border-amber-500/20 rounded-2xl px-4 py-3.5">
          <p className="text-xs font-semibold text-amber-400">₦{needed.toLocaleString()} more to unlock withdrawal</p>
          <p className="text-xs text-amber-400/70 mt-0.5">Refer {Math.ceil(needed / 100)} more friend{needed > 100 ? 's' : ''} to reach ₦1,000. Earnings go straight to your wallet.</p>
        </div>
      )}

      {/* How it works */}
      <div className="mx-4 mb-5 bg-surface-900 border border-white/[0.08] rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.05]">
          <p className="text-sm font-semibold text-white">How it works</p>
        </div>
        {[
          { step: '1', text: 'Copy your code and share it with a friend' },
          { step: '2', text: 'They download CampusRun and enter your code in the Referral Code field during sign-up' },
          { step: '3', text: 'Once they place their first order, ₦100 is instantly added to your wallet' },
        ].map(({ step, text }) => (
          <div key={step} className="flex items-start gap-3 px-4 py-3 border-b border-white/[0.05] last:border-0">
            <div className="w-6 h-6 rounded-full bg-brand-500/20 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-xs font-bold text-brand-400">{step}</span>
            </div>
            <p className="text-sm text-gray-300">{text}</p>
          </div>
        ))}
      </div>

      {/* Pending note */}
      {!loadingStats && pendingCount > 0 && (
        <div className="mx-4 mb-4 bg-surface-900 border border-white/[0.08] rounded-2xl px-4 py-3.5">
          <p className="text-xs font-semibold text-yellow-400">{pendingCount} friend{pendingCount > 1 ? 's' : ''} signed up — waiting on first order</p>
          <p className="text-xs text-gray-500 mt-0.5">You'll earn ₦100 once they place their first order.</p>
        </div>
      )}

      {/* Empty state */}
      {!loadingStats && earnedCount === 0 && pendingCount === 0 && (
        <div className="mx-4 mb-4 text-center py-6">
          <div className="w-14 h-14 bg-surface-900 border border-white/[0.08] rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Users className="w-7 h-7 text-gray-600" aria-hidden="true" />
          </div>
          <p className="text-sm font-medium text-gray-400">No referrals yet</p>
          <p className="text-xs text-gray-600 mt-1">Copy your code and share it with friends!</p>
        </div>
      )}

      <div className="h-6" />
    </div>
  );
}
