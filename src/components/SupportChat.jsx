import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';

const WELCOME = "Hi! I'm CampusRun Support. How can I help you today?";

export default function SupportChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([{ role: 'assistant', content: WELCOME }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, messages]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: 'user', content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('support-chat', {
        body: {
          messages: next
            .filter(m => m.role !== 'assistant' || m.content !== WELCOME)
            .map(m => ({ role: m.role, content: m.content })),
        },
      });

      if (error) throw error;

      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I couldn\'t connect. Please try again or email support@campusrun.online.' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open support chat"
          className="fixed bottom-[76px] right-4 z-[150] w-12 h-12 bg-gradient-to-br from-brand-500 to-indigo-600 rounded-full shadow-lg shadow-brand-500/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        >
          <MessageCircle className="w-5 h-5 text-white" aria-hidden="true" />
        </button>
      )}

      {/* Chat modal */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="CampusRun Support Chat"
          className="fixed bottom-[76px] right-3 left-3 z-[150] max-w-sm mx-auto bg-surface-900 border border-white/[0.08] rounded-2xl shadow-2xl flex flex-col"
          style={{ maxHeight: 'calc(100dvh - 120px)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08] shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-gradient-to-br from-brand-500 to-indigo-600 rounded-full flex items-center justify-center shrink-0">
                <MessageCircle className="w-3.5 h-3.5 text-white" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white leading-none">Support</p>
                <p className="text-[10px] text-green-400 mt-0.5">AI-powered · Online</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close support chat"
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/5"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 min-h-0">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-brand-500 text-white rounded-br-sm'
                      : 'bg-surface-800 text-gray-200 rounded-bl-sm'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-surface-800 px-3 py-2 rounded-2xl rounded-bl-sm flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin" aria-hidden="true" />
                  <span className="text-xs text-gray-400">Typing…</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex items-end gap-2 px-3 py-3 border-t border-white/[0.08] shrink-0">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Type a message…"
              rows={1}
              className="flex-1 bg-surface-800 border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 resize-none focus:outline-none focus:border-brand-500/50 max-h-24 overflow-y-auto"
              style={{ lineHeight: '1.4' }}
              disabled={loading}
              aria-label="Chat message input"
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              aria-label="Send message"
              className="w-9 h-9 flex items-center justify-center bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-colors shrink-0"
            >
              <Send className="w-4 h-4 text-white" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
