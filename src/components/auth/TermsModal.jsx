import { useRef, useState } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/context/AuthContext';

export default function TermsModal() {
  const { session, updateProfileLocally } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const savingRef = useRef(false);

  async function acceptTerms() {
    if (savingRef.current) return;
    savingRef.current = true;
    setLoading(true);
    setError('');

    updateProfileLocally({ terms_accepted: true, terms_accepted_at: new Date().toISOString() });

    try { await supabase.auth.updateUser({ data: { terms_accepted: true } }); } catch {}
    try {
      const now = new Date().toISOString();
      await supabase.from('profiles').update({ terms_accepted: true, terms_accepted_at: now }).eq('id', session.user.id);
    } catch {}
    try { await supabase.rpc('accept_terms'); } catch {}

    savingRef.current = false;
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center p-4">
      <div className="bg-surface-900 border border-white/[0.08] rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="p-5 border-b border-white/[0.08]">
          <h2 className="text-lg font-bold text-white">Terms & Conditions</h2>
          <p className="text-sm text-gray-400 mt-0.5">Please read and accept before continuing</p>
        </div>

        <div className="overflow-y-auto flex-1 p-5 text-sm text-gray-400 space-y-4">
          <p>Welcome to <strong className="text-white">CampusRun</strong>. By using this platform you agree to the following terms:</p>

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

        {error && (
          <div className="mx-5 mb-2 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-3 py-2">
            {error}
          </div>
        )}

        <div className="p-5 border-t border-white/[0.08]">
          <button
            onClick={acceptTerms}
            disabled={loading}
            className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-bold py-3.5 rounded-2xl transition-colors shadow-lg shadow-brand-500/20"
          >
            {loading ? 'Saving…' : 'I Accept — Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
