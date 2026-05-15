import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { User, Phone, BookOpen, Home, LogOut, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ProfilePage() {
  const { profile, session, updateProfileLocally } = useAuth();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ full_name: profile?.full_name || '', phone_number: profile?.phone_number || '', course: profile?.course || '' });
  const [saving, setSaving] = useState(false);

  async function saveProfile() {
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    updateProfileLocally(form);
    setSaving(false);
    setEditing(false);
  }

  function handleSignOut() {
    navigate('/');
  }

  const isCourier = profile?.is_courier;
  const initial = (profile?.full_name?.[0] || session?.user.email?.[0] || 'U').toUpperCase();

  return (
    <div className="bg-surface-950 min-h-full">
      {/* Header */}
      <div className="px-4 pt-5 pb-4">
        <h1 className="text-xl font-bold text-white">Profile</h1>
      </div>

      {/* Avatar card */}
      <div className="mx-4 mb-5">
        <div
          className="rounded-2xl p-5 relative overflow-hidden flex items-center gap-4"
          style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 60%, #2563eb 100%)' }}
        >
          <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/10" />
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold text-white relative z-10">
            {initial}
          </div>
          <div className="relative z-10">
            <p className="font-bold text-lg text-white">{profile?.full_name || 'Student'}</p>
            <p className="text-white/70 text-sm">{session?.user.email}</p>
            <div className="flex gap-2 mt-1.5">
              {profile?.is_admin && (
                <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">Admin</span>
              )}
              {isCourier && (
                <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">Courier</span>
              )}
              {profile?.pro_subscriber && (
                <span className="text-xs bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full font-semibold">Pro</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Personal info */}
      <div className="mx-4 mb-4 bg-surface-900 border border-white/[0.08] rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.08] flex items-center justify-between">
          <p className="text-sm font-semibold text-white">Personal Info</p>
          <button
            onClick={() => editing ? saveProfile() : setEditing(true)}
            className="text-xs font-semibold text-brand-400"
          >
            {saving ? 'Saving…' : editing ? 'Save' : 'Edit'}
          </button>
        </div>

        {[
          { icon: User, label: 'Full Name', field: 'full_name' },
          { icon: Phone, label: 'Phone', field: 'phone_number' },
          { icon: BookOpen, label: 'Course', field: 'course' },
        ].map(({ icon: Icon, label, field }) => (
          <div key={field} className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.05]">
            <Icon className="w-4 h-4 text-gray-500 shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-gray-500">{label}</p>
              {editing ? (
                <input
                  value={form[field]}
                  onChange={e => setForm(prev => ({ ...prev, [field]: e.target.value }))}
                  className="w-full text-sm font-medium text-white bg-transparent border-b border-brand-500/50 outline-none py-0.5"
                />
              ) : (
                <p className="text-sm font-medium text-white">{profile?.[field] || '—'}</p>
              )}
            </div>
          </div>
        ))}
        <div className="flex items-center gap-3 px-4 py-3">
          <Home className="w-4 h-4 text-gray-500 shrink-0" />
          <div>
            <p className="text-xs text-gray-500">Campus Status</p>
            <p className="text-sm font-medium text-white capitalize">
              {profile?.campus_status || '—'}{profile?.hostel ? ` — ${profile.hostel}` : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Become a courier */}
      {!isCourier && (
        <div className="mx-4 mb-4 bg-green-500/10 border border-green-500/20 rounded-2xl p-4">
          <p className="text-sm font-semibold text-green-400 mb-1">Earn as a Courier</p>
          <p className="text-xs text-gray-400 mb-3">Deliver for other students and earn money on your own schedule.</p>
          <button
            onClick={() => updateProfileLocally({ is_courier: true })}
            className="w-full bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
          >
            Activate Courier Mode
          </button>
        </div>
      )}

      {/* Admin shortcut */}
      {profile?.is_admin && (
        <div className="mx-4 mb-4">
          <button
            onClick={() => navigate('/admin')}
            className="w-full flex items-center gap-3 bg-surface-900 border border-white/[0.08] rounded-2xl p-4"
          >
            <Shield className="w-5 h-5 text-brand-400" />
            <span className="text-sm font-semibold text-white">Admin Portal</span>
          </button>
        </div>
      )}

      {/* Wallet balance */}
      <div className="mx-4 mb-4 bg-surface-900 border border-white/[0.08] rounded-2xl p-4 flex justify-between items-center">
        <div>
          <p className="text-xs text-gray-500">Wallet Balance</p>
          <p className="text-lg font-bold text-white">₦{(profile?.wallet_balance || 0).toLocaleString()}</p>
        </div>
        <button
          onClick={() => navigate('/wallet')}
          className="text-xs font-semibold text-brand-400 bg-brand-500/10 px-3 py-1.5 rounded-lg"
        >
          Top Up
        </button>
      </div>

      {/* Sign out */}
      <div className="mx-4 mb-4">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 font-semibold py-3 rounded-2xl text-sm"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>

      <div className="h-4" />
    </div>
  );
}
