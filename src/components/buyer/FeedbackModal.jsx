import { useState } from 'react';
import { X, Star } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/context/AuthContext';

export default function FeedbackModal({ delivery, onClose }) {
  const { session } = useAuth();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    if (!rating) return;
    setLoading(true);
    await supabase.from('delivery_feedback').insert({
      delivery_id: delivery.id,
      buyer_id: session.user.id,
      courier_id: delivery.courier_id,
      rating,
      comment,
    });
    setDone(true);
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Rate your delivery"
        className="bg-surface-900 border border-white/[0.08] rounded-t-2xl w-full max-w-md mx-auto p-5 space-y-4"
      >
        <div className="flex items-center justify-between">
          <p className="font-semibold text-white">Rate your delivery</p>
          <button onClick={onClose} aria-label="Close"><X className="w-5 h-5 text-gray-400" aria-hidden="true" /></button>
        </div>

        {done ? (
          <div className="text-center py-6">
            <p className="text-2xl mb-2">⭐</p>
            <p className="font-semibold text-white">Thanks for your feedback!</p>
            <button onClick={onClose} className="mt-4 bg-gradient-to-br from-brand-500 to-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold">Close</button>
          </div>
        ) : (
          <>
            <div className="flex justify-center gap-2" role="group" aria-label="Rating">
              {[1, 2, 3, 4, 5].map(s => (
                <button key={s} onClick={() => setRating(s)} aria-label={`${s} star${s !== 1 ? 's' : ''}`} aria-pressed={s <= rating}>
                  <Star className={`w-8 h-8 transition-colors ${s <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`} aria-hidden="true" />
                </button>
              ))}
            </div>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Any comments? (optional)"
              rows={3}
              className="w-full bg-surface-800 border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 resize-none"
            />
            <button
              onClick={submit}
              disabled={!rating || loading}
              className="w-full bg-gradient-to-br from-brand-500 to-indigo-600 hover:from-brand-600 hover:to-indigo-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl shadow-lg shadow-brand-500/20"
            >
              {loading ? 'Submitting…' : 'Submit Feedback'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
