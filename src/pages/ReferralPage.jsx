import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Copy, Check, Share2, Users, Banknote, Wallet } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/api/supabaseClient';

export default function ReferralPage() {
  const navigate = useNavigate();
  const { profile, session } = useAuth();
  const [copied, setCopied] = useState(false);
  const [referralsCount, setReferralsCount] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);

  const code = profile?.referral_code || '—';
  const shareUrl = `${window.location.origin}?ref=${code}`;

  useEffect(() => {
    if (!session?.user?.id) return;
    const userId = session.user.id;

    async function fetchStats() {
      const { data } = await supabase
        .from('referrals')
        .select('id')
        .eq('referrer_id', userId)
        .eq('earned', true);

      const count = data?.length || 0;
      setReferralsCount(count);
      setTotalEarned(count * 100);
      setLoadingStats(false);
    }

    fetchStats();
  }, [session?.user?.id]);

  function copyCode() {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function shareLink() {
    const text = `Join CampusRun with my referral code ${code} and get fast campus deliveries at Nile University!\n${shareUrl}`;
    if (navigator.share) {
      navigator.share({ title: 'CampusRun Referral', text, url: shareUrl }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text).catch(() => {});
    }
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
          style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 60%, #2563eb 100%)' }}
        >
          <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/10" />
          <div className="absolute -left-4 -bottom-8 w-28 h-28 rounded-full bg-white/5" />
          <p className="text-xs font-bold text-white/60 uppercase tracking-wider mb-3 relative z-10">Your Referral Code</p>
          <div className="flex items-center gap-3 mb-4 relative z-10">
            <p className="text-4xl font-black text-white tracking-widest">{code}</p>
            <button
              onClick={copyCode}
              aria-label="Copy referral code"
              className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <button
            onClick={shareLink}
            className="flex items-center gap-2 text-white/80 text-sm font-medium relative z-10"
          >
            <Share2 className="w-4 h-4" aria-hidden="true" />
            Share invite link
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="mx-4 mb-5 grid grid-cols-3 gap-3">
        {[
          { icon: Users, label: 'Referrals', value: loadingStats ? '…' : String(referralsCount), color: 'text-brand-400' },
          { icon: Banknote, label: 'Total Earned', value: loadingStats ? '…' : `₦${totalEarned.toLocaleString()}`, color: 'text-green-400' },
          { icon: Wallet, label: 'In Wallet', value: loadingStats ? '…' : `₦${totalEarned.toLocaleString()}`, color: 'text-yellow-400' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-surface-900 border border-white/[0.08] rounded-2xl p-3.5 flex flex-col items-center text-center">
            <Icon className={`w-5 h-5 ${color} mb-2`} aria-hidden="true" />
            <p className={`text-lg font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div className="mx-4 mb-5 bg-surface-900 border border-white/[0.08] rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.05]">
          <p className="text-sm font-semibold text-white">How it works</p>
        </div>
        {[
          { step: '1', text: 'Share your referral code with a friend' },
          { step: '2', text: 'They sign up using your code and complete onboarding' },
          { step: '3', text: 'You earn ₦100 instantly credited to your wallet' },
        ].map(({ step, text }) => (
          <div key={step} className="flex items-start gap-3 px-4 py-3 border-b border-white/[0.05] last:border-0">
            <div className="w-6 h-6 rounded-full bg-brand-500/20 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-xs font-bold text-brand-400">{step}</span>
            </div>
            <p className="text-sm text-gray-300">{text}</p>
          </div>
        ))}
      </div>

      {/* Withdrawal note */}
      {!canWithdraw && (
        <div className="mx-4 mb-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl px-4 py-3.5">
          <p className="text-xs font-semibold text-amber-400">₦{needed.toLocaleString()} more to unlock withdrawal</p>
          <p className="text-xs text-amber-400/70 mt-0.5">Earn ₦1,000 in referral bonuses to withdraw. Your earnings go straight to your wallet.</p>
        </div>
      )}

      {/* Empty state */}
      {!loadingStats && referralsCount === 0 && (
        <div className="mx-4 mb-4 text-center py-6">
          <div className="w-14 h-14 bg-surface-900 border border-white/[0.08] rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Users className="w-7 h-7 text-gray-600" aria-hidden="true" />
          </div>
          <p className="text-sm font-medium text-gray-400">No referrals yet</p>
          <p className="text-xs text-gray-600 mt-1">Share your code to start earning!</p>
          <button
            onClick={shareLink}
            className="mt-4 flex items-center gap-2 mx-auto bg-brand-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl"
          >
            <Share2 className="w-4 h-4" aria-hidden="true" />
            Share My Code
          </button>
        </div>
      )}

      <div className="h-6" />
    </div>
  );
}
