import { useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/api/supabaseClient';
import { User, Phone, BookOpen, Home, LogOut, Bike, Trash2, Shield, Star, Gift, Mail, PhoneCall, ChevronRight, Camera } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function DeleteAccountModal({ onClose }) {
  const [confirm, setConfirm] = useState('');
  const [submitted, setSubmitted] = useState(false);

  function handleDelete() {
    if (confirm !== 'DELETE') return;
    setSubmitted(true);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Delete account"
      className="fixed inset-0 z-[200] flex items-end justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
    >
      <div className="w-full max-w-md bg-surface-900 border border-white/[0.08] rounded-t-3xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="font-bold text-white text-base">Delete your account?</p>
          <button onClick={onClose} aria-label="Close" className="text-gray-400 text-xl font-bold leading-none">×</button>
        </div>

        {submitted ? (
          <div className="text-center py-6">
            <p className="text-green-400 font-semibold">Request submitted.</p>
            <p className="text-gray-400 text-sm mt-1">Your account will be permanently deleted within 24 hours.</p>
            <button onClick={onClose} className="mt-4 bg-brand-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold">Done</button>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-400">
              This will permanently delete all your orders, wallet balance, and profile data.{' '}
              <strong className="text-white">This cannot be undone.</strong>
            </p>
            <div>
              <label htmlFor="delete-confirm" className="text-xs font-medium text-gray-400 block mb-1">
                Type <strong className="text-white">DELETE</strong> to confirm
              </label>
              <input
                id="delete-confirm"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="DELETE"
                className="w-full bg-surface-800 border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500/50"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={onClose} className="flex-1 bg-surface-800 border border-white/[0.08] text-gray-400 font-medium py-3 rounded-xl text-sm">Cancel</button>
              <button
                onClick={handleDelete}
                disabled={confirm !== 'DELETE'}
                className="flex-1 bg-red-500 disabled:opacity-40 text-white font-semibold py-3 rounded-xl text-sm"
              >
                Delete Account
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { profile, session, updateProfileLocally, signOut } = useAuth();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ full_name: profile?.full_name || '', phone_number: profile?.phone_number || '', course: profile?.course || '', hostel: profile?.hostel || '' });
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);

  async function saveProfile() {
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update(form)
      .eq('id', session.user.id);
    if (!error) {
      updateProfileLocally(form);
      setEditing(false);
    }
    setSaving(false);
  }

  async function handleSignOut() {
    await signOut();
  }

  async function handlePhotoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    const ext = file.name.split('.').pop();
    const path = `${session.user.id}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (!uploadError) {
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', session.user.id);
      updateProfileLocally({ avatar_url: publicUrl });
    }
    setUploadingPhoto(false);
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
          <div className="relative w-14 h-14 shrink-0">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Profile" className="w-14 h-14 rounded-full object-cover relative z-10" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold text-white relative z-10">
                {initial}
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            <button
              aria-label="Change profile photo"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="absolute -bottom-0.5 -right-0.5 w-6 h-6 bg-brand-500 rounded-full flex items-center justify-center border-2 border-[#1a0a2e] z-20 disabled:opacity-50"
            >
              <Camera className="w-3 h-3 text-white" aria-hidden="true" />
            </button>
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
            onClick={async () => {
              const next = !isCourier;
              updateProfileLocally({ is_courier: next });
              await supabase.from('profiles').update({ is_courier: next }).eq('id', session.user.id);
            }}
            aria-checked={!!isCourier}
            role="switch"
            className={`relative w-12 h-6 rounded-full transition-colors duration-200 shrink-0 ${
              isCourier ? 'bg-brand-500' : 'bg-surface-700 border border-white/[0.1]'
            }`}
          >
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-200 ${
              isCourier ? 'left-[26px]' : 'left-0.5'
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

      {/* Campus Run Pro card */}
      <div className="mx-4 mb-4">
        <div
          className="rounded-2xl p-4 relative overflow-hidden flex items-center gap-3"
          style={{ background: 'linear-gradient(135deg, #6d28d9 0%, #4338ca 100%)' }}
        >
          <div className="absolute -right-3 -bottom-3 w-20 h-20 rounded-full bg-white/10" />
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <Star className="w-5 h-5 text-yellow-300" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-white">Campus Run Pro</p>
              <span className="text-xs bg-white/20 text-white/80 px-2 py-0.5 rounded-full font-medium">INACTIVE</span>
            </div>
            <p className="text-xs text-white/60 mt-0.5">50% off service fee on every order</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-xs text-white/60 font-medium">Coming Soon</span>
            <ChevronRight className="w-4 h-4 text-white/40" aria-hidden="true" />
          </div>
        </div>
      </div>

      {/* Referral Programme */}
      <div className="mx-4 mb-4 bg-surface-900 border border-white/[0.08] rounded-2xl overflow-hidden">
        <button
          onClick={() => navigate('/referral')}
          className="w-full flex items-center gap-3 px-4 py-4"
        >
          <div className="w-9 h-9 rounded-xl bg-brand-500/15 flex items-center justify-center shrink-0">
            <Gift className="w-4 h-4 text-brand-400" aria-hidden="true" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-medium text-white">Referral Programme</p>
            <p className="text-xs text-gray-500 mt-0.5">Earn ₦100 per friend who joins</p>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-500 shrink-0" aria-hidden="true" />
        </button>
      </div>

      {/* Sign out */}
      <div className="mx-4 mb-3">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 font-semibold py-3 rounded-2xl text-sm"
        >
          <LogOut className="w-4 h-4" aria-hidden="true" />
          Sign Out
        </button>
      </div>

      {/* Contact Support */}
      <div className="mx-4 mb-3 bg-surface-900 border border-white/[0.08] rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.05]">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact Support</p>
        </div>
        <a
          href="mailto:support@campusrun.online"
          className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.05]"
        >
          <Mail className="w-4 h-4 text-gray-500 shrink-0" aria-hidden="true" />
          <span className="text-sm font-medium text-white flex-1">support@campusrun.online</span>
          <ChevronRight className="w-4 h-4 text-gray-600 shrink-0" aria-hidden="true" />
        </a>
        <a
          href="tel:08144009370"
          className="flex items-center gap-3 px-4 py-3.5"
        >
          <PhoneCall className="w-4 h-4 text-gray-500 shrink-0" aria-hidden="true" />
          <span className="text-sm font-medium text-white flex-1">08144009370</span>
          <ChevronRight className="w-4 h-4 text-gray-600 shrink-0" aria-hidden="true" />
        </a>
      </div>

      {/* Legal */}
      <div className="mx-4 mb-3 flex flex-col gap-2">
        <button
          onClick={() => navigate('/privacy')}
          className="w-full flex items-center justify-center gap-2 bg-surface-900 border border-white/[0.08] text-gray-500 font-medium py-3 rounded-2xl text-sm"
        >
          <Shield className="w-4 h-4" aria-hidden="true" />
          Privacy Policy
        </button>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="w-full flex items-center justify-center gap-2 bg-surface-900 border border-white/[0.08] text-gray-600 font-medium py-3 rounded-2xl text-sm"
        >
          <Trash2 className="w-4 h-4" aria-hidden="true" />
          Delete Account
        </button>
      </div>

      <div className="h-4" />

      {showDeleteModal && <DeleteAccountModal onClose={() => setShowDeleteModal(false)} />}
    </div>
  );
}
