import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/api/supabaseClient';
import { User, Phone, BookOpen, Home, LogOut, Settings, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ProfilePage() {
  const { profile, session, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    full_name: profile?.full_name || '',
    phone_number: profile?.phone_number || '',
    course: profile?.course || '',
  });
  const [saving, setSaving] = useState(false);

  async function saveProfile() {
    setSaving(true);
    await supabase.from('profiles').update(form).eq('id', session.user.id);
    await refreshProfile();
    setSaving(false);
    setEditing(false);
  }

  async function handleSignOut() {
    await signOut();
    navigate('/');
  }

  const isCourier = profile?.is_courier;

  return (
    <div className="p-4 space-y-5">
      <h1 className="text-xl font-bold text-gray-900">Profile</h1>

      {/* Avatar card */}
      <div className="bg-gradient-to-br from-brand-500 to-brand-700 rounded-2xl p-5 text-white flex items-center gap-4 shadow-lg">
        <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">
          {profile?.full_name?.[0] || session?.user.email?.[0]?.toUpperCase() || 'U'}
        </div>
        <div>
          <p className="font-bold text-lg">{profile?.full_name || 'Student'}</p>
          <p className="text-brand-100 text-sm">{session?.user.email}</p>
          <div className="flex gap-2 mt-1">
            {profile?.is_admin && (
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Admin</span>
            )}
            {isCourier && (
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Courier</span>
            )}
            {profile?.pro_subscriber && (
              <span className="text-xs bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full font-semibold">Pro</span>
            )}
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-50 flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-700">Personal Info</p>
          <button
            onClick={() => editing ? saveProfile() : setEditing(true)}
            className="text-xs font-semibold text-brand-600"
          >
            {saving ? 'Saving…' : editing ? 'Save' : 'Edit'}
          </button>
        </div>

        {[
          { icon: User, label: 'Full Name', field: 'full_name' },
          { icon: Phone, label: 'Phone', field: 'phone_number' },
          { icon: BookOpen, label: 'Course', field: 'course' },
        ].map(({ icon: Icon, label, field }) => (
          <div key={field} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50">
            <Icon className="w-4 h-4 text-gray-400 shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-gray-400">{label}</p>
              {editing ? (
                <input
                  value={form[field]}
                  onChange={e => setForm(prev => ({ ...prev, [field]: e.target.value }))}
                  className="w-full text-sm font-medium text-gray-900 border-b border-brand-400 outline-none py-0.5"
                />
              ) : (
                <p className="text-sm font-medium text-gray-900">{profile?.[field] || '—'}</p>
              )}
            </div>
          </div>
        ))}

        <div className="flex items-center gap-3 px-4 py-3">
          <Home className="w-4 h-4 text-gray-400 shrink-0" />
          <div>
            <p className="text-xs text-gray-400">Campus Status</p>
            <p className="text-sm font-medium text-gray-900 capitalize">{profile?.campus_status || '—'}{profile?.hostel ? ` — ${profile.hostel}` : ''}</p>
          </div>
        </div>
      </div>

      {/* Become a courier */}
      {!isCourier && (
        <div className="bg-green-50 border border-green-100 rounded-2xl p-4">
          <p className="text-sm font-semibold text-green-800 mb-1">Earn as a Courier</p>
          <p className="text-xs text-green-700 mb-3">Deliver for other students and earn money on your own schedule.</p>
          <button
            onClick={async () => {
              await supabase.from('profiles').update({ is_courier: true }).eq('id', session.user.id);
              await refreshProfile();
            }}
            className="w-full bg-green-600 text-white text-sm font-semibold py-2.5 rounded-xl"
          >
            Activate Courier Mode
          </button>
        </div>
      )}

      {/* Admin shortcut */}
      {profile?.is_admin && (
        <button
          onClick={() => navigate('/admin')}
          className="w-full flex items-center gap-3 bg-white border border-gray-200 rounded-2xl p-4 shadow-sm"
        >
          <Shield className="w-5 h-5 text-brand-600" />
          <span className="text-sm font-semibold text-gray-900">Admin Portal</span>
        </button>
      )}

      {/* Sign out */}
      <button
        onClick={handleSignOut}
        className="w-full flex items-center justify-center gap-2 border border-red-200 text-red-600 font-semibold py-3 rounded-2xl text-sm"
      >
        <LogOut className="w-4 h-4" />
        Sign Out
      </button>
    </div>
  );
}
