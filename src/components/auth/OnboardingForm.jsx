import { useState } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { User, Phone, BookOpen, Home } from 'lucide-react';
import Logo from '@/components/ui/Logo';

const HOSTELS = [
  'Nile Hall A', 'Nile Hall B', 'Nile Hall C', 'Nile Hall D',
  'Victoria Falls', 'Moat Heaven', 'Other',
];

export default function OnboardingForm() {
  const { session, refreshProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [data, setData] = useState({
    full_name: '',
    phone_number: '',
    course: '',
    campus_status: '',
    hostel: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function update(field, value) {
    setData(prev => ({ ...prev, [field]: value }));
  }

  async function finish() {
    setLoading(true);
    setError('');
    const { error } = await supabase
      .from('profiles')
      .update({ ...data, onboarding_complete: true })
      .eq('id', session.user.id);

    if (error) {
      setError('Could not save. Please try again.');
    } else {
      await refreshProfile();
    }
    setLoading(false);
  }

  const inputClass = "w-full bg-surface-800 border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50";

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center p-4">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 bg-brand-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-6">
          <div className="inline-flex mb-3">
            <Logo size={64} className="rounded-xl" />
          </div>
          <h1 className="text-2xl font-bold text-white">Set up your profile</h1>
          <p className="text-gray-400 text-sm mt-1">Step {step} of 2</p>
          <div className="flex gap-2 mt-3 justify-center">
            {[1, 2].map(s => (
              <div key={s} className={`h-1.5 w-10 rounded-full transition-colors ${s <= step ? 'bg-brand-500' : 'bg-surface-800'}`} />
            ))}
          </div>
        </div>

        <div className="bg-surface-900 border border-white/[0.08] rounded-2xl p-6 space-y-4">
          {step === 1 && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5 flex items-center gap-1">
                  <User className="w-4 h-4" /> Full Name
                </label>
                <input
                  type="text"
                  value={data.full_name}
                  onChange={e => update('full_name', e.target.value)}
                  placeholder="Your full name"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5 flex items-center gap-1">
                  <Phone className="w-4 h-4" /> Phone Number
                </label>
                <input
                  type="tel"
                  value={data.phone_number}
                  onChange={e => update('phone_number', e.target.value)}
                  placeholder="08012345678"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5 flex items-center gap-1">
                  <BookOpen className="w-4 h-4" /> Course
                </label>
                <input
                  type="text"
                  value={data.course}
                  onChange={e => update('course', e.target.value)}
                  placeholder="e.g. Computer Science"
                  className={inputClass}
                />
              </div>

              <button
                disabled={!data.full_name || !data.phone_number || !data.course}
                onClick={() => setStep(2)}
                className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl mt-2 transition-colors"
              >
                Next
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Campus Status</label>
                <div className="grid grid-cols-2 gap-3">
                  {['residential', 'commuter'].map(status => (
                    <button
                      key={status}
                      onClick={() => update('campus_status', status)}
                      className={`py-3 rounded-xl border-2 text-sm font-medium capitalize transition-all ${
                        data.campus_status === status
                          ? 'border-brand-500 bg-brand-500/10 text-white'
                          : 'border-white/[0.08] text-gray-400 bg-surface-800'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {data.campus_status === 'residential' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5 flex items-center gap-1">
                    <Home className="w-4 h-4" /> Hostel
                  </label>
                  <select
                    value={data.hostel}
                    onChange={e => update('hostel', e.target.value)}
                    className={`${inputClass} bg-surface-800`}
                  >
                    <option value="">Select hostel…</option>
                    {HOSTELS.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              )}

              {error && (
                <p className="text-sm text-red-400">{error}</p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 bg-surface-800 border border-white/[0.08] text-gray-400 font-medium py-3 rounded-xl"
                >
                  Back
                </button>
                <button
                  disabled={!data.campus_status || loading}
                  onClick={finish}
                  className="flex-1 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors"
                >
                  {loading ? 'Saving…' : 'Finish'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
