import { useState } from 'react';
import { MOCK_RUNNERS } from '@/lib/mockData';
import { Bike, Star } from 'lucide-react';

export default function AdminRunners() {
  const [runners, setRunners] = useState(MOCK_RUNNERS);

  function toggleActive(id) {
    setRunners(prev => prev.map(r => r.id === id ? { ...r, is_active: !r.is_active } : r));
  }

  return (
    <div className="space-y-3">
      {runners.map(runner => (
        <div
          key={runner.id}
          className={`bg-surface-900 border rounded-xl p-4 ${!runner.is_active ? 'border-white/[0.04] opacity-60' : 'border-white/[0.08]'}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${runner.status === 'online' ? 'bg-green-500/15' : 'bg-surface-800'}`}>
                <Bike className={`w-5 h-5 ${runner.status === 'online' ? 'text-green-400' : 'text-gray-500'}`} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-white">{runner.full_name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${runner.status === 'online' ? 'bg-green-500/15 text-green-400' : 'bg-surface-800 text-gray-500'}`}>
                    {runner.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{runner.phone}</p>
                <div className="flex gap-3 mt-2 text-xs text-gray-400 flex-wrap">
                  <span>Orders today: <strong className="text-white">{runner.orders_today}</strong></span>
                  <span>Earned: <strong className="text-white">₦{runner.earnings_today.toLocaleString()}</strong></span>
                  <span className="flex items-center gap-0.5">
                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                    <strong className="text-white">{runner.rating}</strong>
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => toggleActive(runner.id)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors shrink-0 ${
                runner.is_active
                  ? 'bg-red-500/15 text-red-400 hover:bg-red-500/25'
                  : 'bg-green-500/15 text-green-400 hover:bg-green-500/25'
              }`}
            >
              {runner.is_active ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
