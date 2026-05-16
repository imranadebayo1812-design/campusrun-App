import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { User, Phone, BookOpen, Home, LogOut, Bike } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ProfilePage() {
  const { profile, session, updateProfileLocally } = useAuth();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ full_name: profile?.full_name || '', phone_number: profile?.phone_number || '', course: profile?.course || '', hostel: profile?.hostel || '' });
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
          className="rounded-2xl p-5 relative overflow-hidden flex items-center gap-4 shadow-lg shadow-black/30"
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
          <p className="text-sm font-semibold text-white">Your Details</p>
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
          { icon: Home, label: 'Hostel / Room', field: 'hostel' },
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
              {profile?.campus_status || '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Settings */}
      <div className="mx-4 mb-4 bg-surface-900 border border-white/[0.08] rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.08]">
          <p className="text-sm font-semibold text-white">Settings</p>
        </div>
        <div className="px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isCourier ? 'bg-brand-500/15' : 'bg-surface-800'}`}>
              <Bike className={`w-4 h-4 ${isCourier ? 'text-brand-400' : 'text-gray-500'}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Courier Mode</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {isCourier ? 'Enabled — you can accept deliveries' : 'Off — buyer mode only'}
              </p>
            </div>
          </div>
          <button
            onClick={() => updateProfileLocally({ is_courier: !isCourier })}
            className={`relative w-12 h-6 rounded-full transition-colors duration-200 shrink-0 ${
              isCourier ? 'bg-brand-500' : 'bg-surface-700 border border-white/[0.1]'
            }`}
          >
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
              isCourier ? 'translate-x-6' : 'translate-x-0.5'
            }`} />
          </button>
        </div>
      </div>

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
