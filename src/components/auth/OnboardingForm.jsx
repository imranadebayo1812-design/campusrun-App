import { useState } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { User, Phone, BookOpen, Home } from 'lucide-react';

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

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Set up your profile</h1>
          <p className="text-gray-500 text-sm mt-1">Step {step} of 2</p>
          <div className="flex gap-2 mt-3 justify-center">
            {[1,2].map(s => (
              <div key={s} className={`h-1.5 w-10 rounded-full transition-colors ${s <= step ? 'bg-brand-500' : 'bg-gray-200'}`} />
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow p-6 space-y-4">
          {step === 1 && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <User className="w-4 h-4" /> Full Name
                </label>
                <input
                  type="text"
                  value={data.full_name}
                  onChange={e => update('full_name', e.target.value)}
                  placeholder="Your full name"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <Phone className="w-4 h-4" /> Phone Number
                </label>
                <input
                  type="tel"
                  value={data.phone_number}
                  onChange={e => update('phone_number', e.target.value)}
                  placeholder="08012345678"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <BookOpen className="w-4 h-4" /> Course
                </label>
                <input
                  type="text"
                  value={data.course}
                  onChange={e => update('course', e.target.value)}
                  placeholder="e.g. Computer Science"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
              </div>

              <button
                disabled={!data.full_name || !data.phone_number || !data.course}
                onClick={() => setStep(2)}
                className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl mt-2"
              >
                Next
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Campus Status</label>
                <div className="grid grid-cols-2 gap-3">
                  {['residential', 'commuter'].map(status => (
                    <button
                      key={status}
                      onClick={() => update('campus_status', status)}
                      className={`py-3 rounded-xl border-2 text-sm font-medium capitalize transition-all ${
                        data.campus_status === status
                          ? 'border-brand-500 bg-brand-50 text-brand-700'
                          : 'border-gray-200 text-gray-600'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {data.campus_status === 'residential' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                    <Home className="w-4 h-4" /> Hostel
                  </label>
                  <select
                    value={data.hostel}
                    onChange={e => update('hostel', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                  >
                    <option value="">Select hostel…</option>
                    {HOSTELS.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              )}

              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 border border-gray-300 text-gray-700 font-medium py-3 rounded-xl"
                >
                  Back
                </button>
                <button
                  disabled={!data.campus_status || loading}
                  onClick={finish}
                  className="flex-1 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl"
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
