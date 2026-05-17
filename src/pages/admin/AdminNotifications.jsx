import { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { formatDistanceToNow } from 'date-fns';
import {
  Bell, Send, Users, Bike, User,
  RefreshCw, CheckCircle, AlertCircle, Megaphone,
} from 'lucide-react';

const AUDIENCE_OPTIONS = [
  { key: 'all',     label: 'Everyone',    icon: Users,     desc: 'All app users' },
  { key: 'buyers',  label: 'Buyers Only', icon: User,      desc: 'Non-courier users' },
  { key: 'couriers',label: 'Couriers Only',icon: Bike,     desc: 'Registered runners' },
];

const TEMPLATE_MESSAGES = [
  { title: 'New Feature!', body: 'We\'ve added exciting new features to CampusRun. Update your app to see what\'s new.' },
  { title: 'Maintenance Notice', body: 'CampusRun will undergo brief maintenance tonight at 2am. Service will resume by 3am.' },
  { title: 'Special Offer 🎉', body: 'Get free delivery on your next 3 orders this weekend! Use code WEEKEND24.' },
  { title: 'Courier Needed!', body: 'There are pending orders waiting for runners. Open the app to accept deliveries.' },
];

export default function AdminNotifications() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState('all');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  async function loadHistory() {
    setHistoryLoading(true);
    const { data } = await supabase
      .from('notifications')
      .select('id, title, body, created_at, read')
      .is('user_id', null)  // broadcast notifications have no user_id
      .order('created_at', { ascending: false })
      .limit(20);
    // fallback: get recent notifications (any) and show them
    if (!data || data.length === 0) {
      const { data: recent } = await supabase
        .from('notifications')
        .select('id, title, body, created_at, user_id')
        .order('created_at', { ascending: false })
        .limit(20);
      setHistory(recent || []);
    } else {
      setHistory(data);
    }
    setHistoryLoading(false);
  }

  useEffect(() => { loadHistory(); }, []);

  async function send() {
    if (!title.trim() || !body.trim()) return;
    setSending(true);
    setResult(null);

    try {
      // Fetch target user IDs
      let q = supabase.from('profiles').select('id');
      if (audience === 'couriers') q = q.eq('is_courier', true);
      else if (audience === 'buyers') q = q.eq('is_courier', false);

      const { data: users, error: usersError } = await q;
      if (usersError) throw usersError;

      const userIds = (users || []).map(u => u.id);
      if (userIds.length === 0) {
        setResult({ type: 'error', message: 'No users found for the selected audience.' });
        setSending(false);
        return;
      }

      // Insert a notification row for each user (batch insert)
      const rows = userIds.map(uid => ({
        user_id: uid,
        title: title.trim(),
        body: body.trim(),
        type: 'admin_broadcast',
        read: false,
      }));

      // Insert in chunks of 500 to avoid payload limits
      const CHUNK = 500;
      for (let i = 0; i < rows.length; i += CHUNK) {
        const { error } = await supabase.from('notifications').insert(rows.slice(i, i + CHUNK));
        if (error) throw error;
      }

      setResult({ type: 'success', message: `Notification sent to ${userIds.length} user${userIds.length !== 1 ? 's' : ''}.` });
      setTitle('');
      setBody('');
      loadHistory();
    } catch (err) {
      setResult({ type: 'error', message: err.message || 'Failed to send notification.' });
    }
    setSending(false);
  }

  function useTemplate(t) {
    setTitle(t.title);
    setBody(t.body);
    setResult(null);
  }

  const charCount = body.length;
  const MAX_BODY = 200;

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white">Notifications</h1>
        <p className="text-sm text-gray-500 mt-0.5">Send broadcast messages to all users or specific groups</p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Compose panel */}
        <div className="lg:col-span-3 space-y-5">
          <div className="bg-surface-900 border border-white/[0.06] rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Megaphone className="w-4.5 h-4.5 text-brand-400" />
              <p className="text-sm font-semibold text-white">Compose Message</p>
            </div>

            {/* Audience */}
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">SEND TO</p>
              <div className="grid grid-cols-3 gap-2">
                {AUDIENCE_OPTIONS.map(opt => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.key}
                      onClick={() => setAudience(opt.key)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all text-center ${
                        audience === opt.key
                          ? 'border-brand-500 bg-brand-500/10 text-brand-300'
                          : 'border-white/[0.08] bg-white/[0.02] text-gray-500 hover:border-white/[0.15]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-xs font-medium">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1.5">TITLE</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. New Feature!"
                maxLength={80}
                className="w-full bg-surface-800 border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              />
            </div>

            {/* Body */}
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1.5">MESSAGE</label>
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="Write your message here…"
                maxLength={MAX_BODY}
                rows={4}
                className="w-full bg-surface-800 border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 resize-none"
              />
              <p className={`text-[10px] mt-1 text-right ${charCount > MAX_BODY * 0.9 ? 'text-yellow-400' : 'text-gray-600'}`}>
                {charCount}/{MAX_BODY}
              </p>
            </div>

            {result && (
              <div className={`flex items-start gap-2.5 px-4 py-3 rounded-xl border ${
                result.type === 'success'
                  ? 'bg-green-500/10 border-green-500/20 text-green-400'
                  : 'bg-red-500/10 border-red-500/20 text-red-400'
              }`}>
                {result.type === 'success'
                  ? <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
                <p className="text-sm">{result.message}</p>
              </div>
            )}

            <button
              onClick={send}
              disabled={sending || !title.trim() || !body.trim()}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-br from-brand-500 to-indigo-600 hover:from-brand-600 hover:to-indigo-700 disabled:opacity-40 text-white font-bold py-3.5 rounded-xl text-sm shadow-lg shadow-brand-500/20 transition-all"
            >
              <Send className="w-4 h-4" />
              {sending ? 'Sending…' : 'Send Notification'}
            </button>
          </div>
        </div>

        {/* Templates + history */}
        <div className="lg:col-span-2 space-y-5">
          {/* Templates */}
          <div className="bg-surface-900 border border-white/[0.06] rounded-2xl p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Quick Templates</p>
            <div className="space-y-2">
              {TEMPLATE_MESSAGES.map((t, i) => (
                <button
                  key={i}
                  onClick={() => useTemplate(t)}
                  className="w-full text-left bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] hover:border-white/[0.10] rounded-xl p-3 transition-all"
                >
                  <p className="text-xs font-semibold text-white">{t.title}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">{t.body}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Recent history */}
          <div className="bg-surface-900 border border-white/[0.06] rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.05]">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Recent Sent</p>
              <button onClick={loadHistory} className="text-gray-600 hover:text-gray-400 transition-colors">
                <RefreshCw className={`w-3.5 h-3.5 ${historyLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <div className="divide-y divide-white/[0.04] max-h-64 overflow-y-auto">
              {historyLoading ? (
                Array(3).fill(0).map((_, i) => (
                  <div key={i} className="px-5 py-3 space-y-1.5">
                    <div className="h-3 bg-white/[0.06] rounded animate-pulse w-24" />
                    <div className="h-2.5 bg-white/[0.04] rounded animate-pulse w-36" />
                  </div>
                ))
              ) : history.length === 0 ? (
                <p className="px-5 py-6 text-center text-xs text-gray-600">No notifications sent yet</p>
              ) : history.map(n => (
                <div key={n.id} className="px-5 py-3">
                  <p className="text-xs font-medium text-white line-clamp-1">{n.title}</p>
                  <p className="text-[10px] text-gray-500 line-clamp-1 mt-0.5">{n.body}</p>
                  <p className="text-[10px] text-gray-700 mt-1">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
