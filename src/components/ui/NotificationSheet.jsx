import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import {
  Bell, Package, Wallet, AlertTriangle, CheckCircle,
  Bike, X, BellOff, XCircle,
} from 'lucide-react';

const TYPE_ICON = {
  order_accepted:      { Icon: Bike,          color: 'text-brand-400',  bg: 'bg-brand-500/15'  },
  status_update:       { Icon: Package,       color: 'text-blue-400',   bg: 'bg-blue-500/15'   },
  wallet:              { Icon: Wallet,        color: 'text-green-400',  bg: 'bg-green-500/15'  },
  withdrawal_update:   { Icon: Wallet,        color: 'text-green-400',  bg: 'bg-green-500/15'  },
  withdrawal_rejected: { Icon: XCircle,       color: 'text-red-400',    bg: 'bg-red-500/15'    },
  price_edit:          { Icon: AlertTriangle, color: 'text-amber-400',  bg: 'bg-amber-500/15'  },
  delivered:           { Icon: CheckCircle,   color: 'text-green-400',  bg: 'bg-green-500/15'  },
};

export default function NotificationSheet({ onClose }) {
  const navigate = useNavigate();
  const { notifications, markAllRead, markRead } = useAuth();
  const unread = notifications.filter(n => !n.read).length;

  function handleTap(notif) {
    markRead(notif.id);
    if (notif.action) navigate(notif.action);
    onClose();
  }

  return (
    <div
      role="dialog" aria-modal="true" aria-label="Notifications"
      className="fixed inset-0 z-[250] flex items-end justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-surface-900 border border-white/[0.08] rounded-t-3xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-brand-400" aria-hidden="true" />
            <p className="font-bold text-white text-base">Notifications</p>
            {unread > 0 && (
              <span className="text-xs bg-red-500 text-white font-bold px-2 py-0.5 rounded-full">{unread}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-brand-400 font-semibold">
                Mark all read
              </button>
            )}
            <button onClick={onClose} aria-label="Close" className="w-8 h-8 flex items-center justify-center rounded-xl bg-surface-800 border border-white/[0.06]">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="max-h-[70vh] overflow-y-auto scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center py-14">
              <div className="w-14 h-14 bg-surface-800 rounded-full flex items-center justify-center mb-3">
                <BellOff className="w-7 h-7 text-gray-600" />
              </div>
              <p className="text-gray-400 font-medium text-sm">No notifications yet</p>
            </div>
          ) : (
            notifications.map(notif => {
              const { Icon, color, bg } = TYPE_ICON[notif.type] || TYPE_ICON.status_update;
              return (
                <button
                  key={notif.id}
                  onClick={() => handleTap(notif)}
                  className={`w-full flex items-start gap-3 px-5 py-4 border-b border-white/[0.04] text-left transition-colors ${
                    notif.read ? '' : 'bg-brand-500/5'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0 mt-0.5`}>
                    <Icon className={`w-5 h-5 ${color}`} aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-semibold ${notif.read ? 'text-gray-300' : 'text-white'}`}>
                        {notif.title}
                      </p>
                      {!notif.read && (
                        <div className="w-2 h-2 bg-brand-400 rounded-full shrink-0 mt-1.5" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{notif.body}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="safe-bottom" />
      </div>
    </div>
  );
}
