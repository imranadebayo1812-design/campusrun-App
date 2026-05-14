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
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-white rounded-t-2xl w-full max-w-md mx-auto p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-gray-900">Rate your delivery</p>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        {done ? (
          <div className="text-center py-6">
            <p className="text-2xl mb-2">⭐</p>
            <p className="font-semibold">Thanks for your feedback!</p>
            <button onClick={onClose} className="mt-4 bg-brand-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold">Close</button>
          </div>
        ) : (
          <>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map(s => (
                <button key={s} onClick={() => setRating(s)}>
                  <Star className={`w-8 h-8 transition-colors ${s <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                </button>
              ))}
            </div>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Any comments? (optional)"
              rows={3}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
            />
            <button
              onClick={submit}
              disabled={!rating || loading}
              className="w-full bg-brand-500 text-white font-semibold py-3 rounded-xl disabled:opacity-50"
            >
              {loading ? 'Submitting…' : 'Submit Feedback'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
