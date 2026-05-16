import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { User, Phone, BookOpen, Home } from 'lucide-react';
import Logo from '@/components/ui/Logo';

const HOSTELS = [
  'Nile Hall A', 'Nile Hall B', 'Nile Hall C', 'Nile Hall D',
  'Victoria Falls', 'Most Heaven', 'Other',
];

export default function OnboardingForm() {
  const { session, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [data, setData] = useState({
    full_name: '', phone_number: '', course: '', campus_status: '', hostel: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function update(field, value) {
    setData(prev => ({ ...prev, [field]: value }));
  }

  async function finish() {
    setLoading(true);
    setError('');
    const { error: err } = await supabase.from('profiles').upsert({
      id: session.user.id,
      email: session.user.email,
      ...data,
      onboarding_complete: true,
    });
    if (err) {
      setError(err.message || 'Could not save. Please try again.');
      setLoading(false);
      return;
    }
    await refreshProfile();
    navigate('/welcome', { replace: true, state: { name: data.full_name } });
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
                <label htmlFor="ob-fullname" className="block text-sm font-medium text-gray-300 mb-1.5 flex items-center gap-1">
                  <User className="w-4 h-4" aria-hidden="true" /> Full Name
                </label>
                <input
                  id="ob-fullname"
                  type="text"
                  value={data.full_name}
                  onChange={e => update('full_name', e.target.value)}
                  placeholder="Your full name"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="ob-phone" className="block text-sm font-medium text-gray-300 mb-1.5 flex items-center gap-1">
                  <Phone className="w-4 h-4" aria-hidden="true" /> Phone Number
                </label>
                <input
                  id="ob-phone"
                  type="tel"
                  value={data.phone_number}
                  onChange={e => update('phone_number', e.target.value)}
                  placeholder="08012345678"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="ob-course" className="block text-sm font-medium text-gray-300 mb-1.5 flex items-center gap-1">
                  <BookOpen className="w-4 h-4" aria-hidden="true" /> Course
                </label>
                <input
                  id="ob-course"
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
                className="w-full bg-gradient-to-br from-brand-500 to-indigo-600 hover:from-brand-600 hover:to-indigo-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl mt-2 shadow-lg shadow-brand-500/20"
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
                  {[
                    { value: 'resident', label: 'Residential' },
                    { value: 'day_student', label: 'Commuter' },
                  ].map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => update('campus_status', value)}
                      className={`py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                        data.campus_status === value
                          ? 'border-brand-500 bg-brand-500/10 text-white'
                          : 'border-white/[0.08] text-gray-400 bg-surface-800'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {data.campus_status === 'resident' && (
                <div>
                  <label htmlFor="ob-hostel" className="block text-sm font-medium text-gray-300 mb-1.5 flex items-center gap-1">
                    <Home className="w-4 h-4" aria-hidden="true" /> Hostel
                  </label>
                  <select
                    id="ob-hostel"
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
                  className="flex-1 bg-gradient-to-br from-brand-500 to-indigo-600 hover:from-brand-600 hover:to-indigo-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl shadow-lg shadow-brand-500/20"
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
