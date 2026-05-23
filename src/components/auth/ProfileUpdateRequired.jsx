import { useState } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { Home } from 'lucide-react';
import Logo from '@/components/ui/Logo';

const HOSTEL_BLOCKS = {
  female: {
    'Victoria Falls': ['Mississippi', 'White Nile', 'Lake Tana', 'Shebelle', 'Nile Delta', 'Lake Victoria', 'Victoria Falls Cafeteria'],
  },
  male: {
    'Moat Heaven': ['Zambezi', 'Moat Orange', 'Black Volta', 'Red Volta', 'Blue Nile', 'Lake Chad', 'Moat Heaven Cafeteria'],
  },
};

// Normalise old campus_status values saved before the fix
function normaliseCampusStatus(raw) {
  if (raw === 'resident')    return 'residential';
  if (raw === 'day_student') return 'commuter';
  if (raw === 'residential' || raw === 'commuter') return raw;
  return '';
}

export default function ProfileUpdateRequired() {
  const { session, profile, refreshProfile } = useAuth();

  const existingStatus = normaliseCampusStatus(profile?.campus_status ?? '');
  const needsStatus = !existingStatus;
  const needsHostel = existingStatus === 'residential' && !profile?.hostel;

  const [gender, setGender]             = useState('');
  const [campusStatus, setCampusStatus] = useState(existingStatus);
  const [hostel, setHostel]             = useState(profile?.hostel ?? '');
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');

  const hostelGroups = gender ? HOSTEL_BLOCKS[gender] ?? {} : {};

  async function save() {
    setError('');

    // Validate inline — button is never disabled so we always reach here
    if (!gender) { setError('Please select your gender.'); return; }
    const statusToSave = campusStatus || existingStatus;
    if (!statusToSave) { setError('Please select your campus status.'); return; }
    if (statusToSave === 'residential' && !hostel && !profile?.hostel) {
      setError('Please select your hostel block.'); return;
    }

    setLoading(true);

    const updates = { gender, campus_status: statusToSave };
    const hostelToSave = hostel || profile?.hostel;
    if (hostelToSave) updates.hostel = hostelToSave;

    const { error: err } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', session.user.id);

    if (err) {
      setError(err.message || 'Could not save. Please try again.');
      setLoading(false);
      return;
    }

    try {
      await refreshProfile();
    } catch (e) {
      setError('Saved! Please restart the app if nothing happens.');
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center p-4">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 bg-brand-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm relative z-10 space-y-5">
        <div className="text-center">
          <div className="inline-flex mb-3">
            <Logo size={56} className="rounded-xl" />
          </div>
          <h1 className="text-xl font-bold text-white">Quick update needed</h1>
          <p className="text-gray-400 text-sm mt-1 leading-relaxed">
            We added new features that need a couple more details. Takes 30 seconds.
          </p>
        </div>

        <div className="bg-surface-900 border border-white/[0.08] rounded-2xl p-5 space-y-4">

          {/* Gender — always required */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Gender <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'female', label: 'Female' },
                { value: 'male',   label: 'Male' },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => { setGender(value); setHostel(''); }}
                  className={`py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                    gender === value
                      ? 'border-brand-500 bg-brand-500/10 text-white'
                      : 'border-white/[0.08] text-gray-400 bg-surface-800'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Campus status — only if missing or old value */}
          {needsStatus && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Campus Status <span className="text-red-400">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'residential', label: 'On-Campus' },
                  { value: 'commuter',    label: 'Off-Campus' },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => { setCampusStatus(value); setHostel(''); }}
                    className={`py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                      campusStatus === value
                        ? 'border-brand-500 bg-brand-500/10 text-white'
                        : 'border-white/[0.08] text-gray-400 bg-surface-800'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Hostel — if residential and no hostel on record */}
          {(needsHostel || (needsStatus && campusStatus === 'residential')) && gender && (
            <div>
              <label htmlFor="pur-hostel" className="block text-sm font-medium text-gray-300 mb-1.5 flex items-center gap-1">
                <Home className="w-4 h-4" aria-hidden="true" /> Hostel Block <span className="text-red-400">*</span>
              </label>
              <select
                id="pur-hostel"
                value={hostel}
                onChange={e => setHostel(e.target.value)}
                className="w-full bg-surface-800 border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              >
                <option value="">Select your hostel block…</option>
                {Object.entries(hostelGroups).map(([estate, blocks]) => (
                  <optgroup key={estate} label={estate}>
                    {blocks.map(b => (
                      <option key={b} value={`${estate} — ${b}`}>{b}</option>
                    ))}
                  </optgroup>
                ))}
                <option value="Student Quarters">Student Quarters</option>
              </select>
            </div>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            onClick={save}
            disabled={loading}
            className="w-full bg-gradient-to-br from-brand-500 to-indigo-600 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-brand-500/20"
          >
            {loading ? 'Saving…' : 'Save & Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
