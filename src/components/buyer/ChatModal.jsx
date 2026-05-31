import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { X, Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function ChatModal({ deliveryId, onClose }) {
  const { session } = useAuth();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: messages = [] } = useQuery({
    queryKey: ['chat', deliveryId],
    queryFn: async () => {
      const { data } = await supabase
        .from('chat_messages')
        .select('*, profiles!sender_id(full_name)')
        .eq('delivery_id', deliveryId)
        .order('created_at', { ascending: true });
      return data || [];
    },
    refetchInterval: 5_000,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(e) {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    await supabase.from('chat_messages').insert({
      delivery_id: deliveryId,
      sender_id: session.user.id,
      sender_role: 'buyer',
      content: message.trim(),
    });
    setMessage('');
    queryClient.invalidateQueries({ queryKey: ['chat', deliveryId] });
    setSending(false);
  }

  return (
    <div className="fixed inset-x-0 top-0 bg-black/70 z-50 flex items-end" style={{ height: '100dvh' }}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Chat with courier"
        className="bg-surface-900 border border-white/[0.08] rounded-t-2xl w-full max-w-md mx-auto flex flex-col"
        style={{ height: '70dvh' }}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/[0.08]">
          <p className="font-semibold text-white">Chat with Courier</p>
          <button onClick={onClose} aria-label="Close chat"><X className="w-5 h-5 text-gray-400" aria-hidden="true" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map(msg => {
            const isMine = msg.sender_id === session.user.id;
            return (
              <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                  isMine ? 'bg-brand-500 text-white rounded-tr-sm' : 'bg-surface-800 text-gray-200 rounded-tl-sm'
                }`}>
                  <p>{msg.content}</p>
                  <p className={`text-xs mt-0.5 ${isMine ? 'text-brand-200/70' : 'text-gray-500'}`}>
                    {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            );
          })}
          {messages.length === 0 && (
            <p className="text-center text-sm text-gray-500 py-8">No messages yet. Say hello!</p>
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={sendMessage} className="p-4 border-t border-white/[0.08] flex gap-2">
          <input
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Message your courier…"
            className="flex-1 bg-surface-800 border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
          />
          <button
            type="submit"
            disabled={!message.trim() || sending}
            aria-label="Send message"
            className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center disabled:opacity-50"
          >
            <Send className="w-4 h-4 text-white" aria-hidden="true" />
          </button>
        </form>
      </div>
    </div>
  );
}
