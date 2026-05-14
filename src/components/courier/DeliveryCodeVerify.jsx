import { useState } from 'react';
import { supabase } from '@/api/supabaseClient';
import { X, Lock } from 'lucide-react';

export default function DeliveryCodeVerify({ delivery, onSuccess, onClose }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function verify() {
    if (code.length !== 4) {
      setError('Enter the 4-digit code');
      return;
    }
    if (code !== delivery.delivery_code) {
      setError('Incorrect code. Ask the buyer for the correct 4-digit code.');
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase
      .from('deliveries')
      .update({ status: 'delivered', delivered_at: new Date().toISOString() })
      .eq('id', delivery.id);

    if (updateError) {
      setError('Failed to mark as delivered. Try again.');
      setLoading(false);
      return;
    }

    // Credit courier earnings via backend
    try {
      await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/api/complete-delivery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deliveryId: delivery.id }),
      });
    } catch {}

    onSuccess();
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-brand-600" />
            <p className="font-semibold text-gray-900">Enter Delivery Code</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <p className="text-sm text-gray-600">Ask the buyer for their 4-digit code to confirm delivery.</p>

        <input
          type="number"
          inputMode="numeric"
          maxLength={4}
          value={code}
          onChange={e => {
            const v = e.target.value.slice(0, 4);
            setCode(v);
            setError('');
          }}
          placeholder="0000"
          className="w-full text-center text-4xl font-bold tracking-[0.5em] border-2 border-gray-300 rounded-xl py-4 focus:outline-none focus:border-brand-500"
        />

        {error && <p className="text-sm text-red-600 text-center">{error}</p>}

        <button
          onClick={verify}
          disabled={code.length !== 4 || loading}
          className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl"
        >
          {loading ? 'Verifying…' : 'Confirm Delivery'}
        </button>
      </div>
    </div>
  );
}
