import { useState } from 'react';
import { X, Lock } from 'lucide-react';

export default function DeliveryCodeVerify({ delivery, onSuccess, onClose }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function verify() {
    if (code.length !== 4) { setError('Enter the 4-digit code'); return; }
    if (code !== delivery.delivery_code) {
      setError('Incorrect code. Ask the buyer for the correct 4-digit code.');
      return;
    }
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    setLoading(false);
    onSuccess();
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}>
      <div className="w-full max-w-sm rounded-2xl p-5 space-y-4 border border-white/10" style={{ backgroundColor: '#1a1a2e' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-brand-400" />
            <p className="font-semibold text-white">Enter Delivery Code</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <p className="text-sm text-gray-400">Ask the buyer for their 4-digit code to confirm delivery.</p>

        <input
          type="number"
          inputMode="numeric"
          maxLength={4}
          value={code}
          onChange={e => { setCode(e.target.value.slice(0, 4)); setError(''); }}
          placeholder="0000"
          className="w-full text-center text-4xl font-bold tracking-[0.5em] bg-surface-800 border-2 border-white/[0.08] text-white rounded-xl py-4 focus:outline-none focus:border-brand-500"
        />

        {error && <p className="text-sm text-red-400 text-center">{error}</p>}

        <button
          onClick={verify}
          disabled={code.length !== 4 || loading}
          className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors"
        >
          {loading ? 'Verifying…' : 'Confirm Delivery'}
        </button>
      </div>
    </div>
  );
}
