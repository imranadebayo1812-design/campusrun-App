import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Trash2, Mail } from 'lucide-react';
import Logo from '@/components/ui/Logo';

export default function DeleteAccountPage() {
  const navigate = useNavigate();

  function goBack() {
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate('/');
  }

  return (
    <div className="min-h-screen bg-surface-950">
      <div className="max-w-md mx-auto">
        <div className="sticky top-0 bg-surface-950/95 backdrop-blur z-10 px-4 pt-4 pb-3 border-b border-white/[0.06] flex items-center gap-3">
          <button onClick={goBack} aria-label="Go back" className="w-9 h-9 rounded-xl bg-surface-800 flex items-center justify-center shrink-0">
            <ChevronLeft className="w-5 h-5 text-gray-400" aria-hidden="true" />
          </button>
          <div className="flex items-center gap-2.5">
            <Logo size={28} />
            <p className="text-sm font-bold text-white">Delete Your Account</p>
          </div>
        </div>

        <div className="px-4 pt-6 pb-10 space-y-4">
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex gap-3">
            <Trash2 className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-gray-300 leading-relaxed">
              Deleting your account will permanently remove your profile, order history, wallet balance, and all associated personal data within <strong className="text-white">30 days</strong>. This cannot be undone.
            </p>
          </div>

          <div className="bg-surface-900 border border-white/[0.07] rounded-2xl p-4 space-y-3">
            <p className="text-sm font-semibold text-white">How to delete your account</p>
            <div className="space-y-3">
              <div className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-brand-500/20 text-brand-400 text-xs font-bold flex items-center justify-center shrink-0">1</span>
                <p className="text-sm text-gray-400">Open the CampusRun app and sign in to your account.</p>
              </div>
              <div className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-brand-500/20 text-brand-400 text-xs font-bold flex items-center justify-center shrink-0">2</span>
                <p className="text-sm text-gray-400">Tap the <strong className="text-white">Profile</strong> tab at the bottom of the screen.</p>
              </div>
              <div className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-brand-500/20 text-brand-400 text-xs font-bold flex items-center justify-center shrink-0">3</span>
                <p className="text-sm text-gray-400">Scroll to the bottom and tap <strong className="text-white">Delete Account</strong>.</p>
              </div>
              <div className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-brand-500/20 text-brand-400 text-xs font-bold flex items-center justify-center shrink-0">4</span>
                <p className="text-sm text-gray-400">Type <strong className="text-white">DELETE</strong> to confirm. Your account will be permanently deleted within 30 days.</p>
              </div>
            </div>
          </div>

          <div className="bg-surface-900 border border-white/[0.07] rounded-2xl p-4 space-y-2">
            <p className="text-sm font-semibold text-white">Can't access the app?</p>
            <p className="text-sm text-gray-400">Email us directly and we will delete your account and all associated data within 30 days.</p>
            <a
              href="mailto:support@campusrun.online?subject=Delete%20My%20Account"
              className="flex items-center gap-2 mt-2 text-brand-400 text-sm font-medium"
            >
              <Mail className="w-4 h-4" aria-hidden="true" />
              support@campusrun.online
            </a>
          </div>

          <p className="text-xs text-gray-500 text-center px-2">
            To cancel a pending deletion request, email us within 30 days of submitting the request.
          </p>
        </div>
      </div>
    </div>
  );
}
