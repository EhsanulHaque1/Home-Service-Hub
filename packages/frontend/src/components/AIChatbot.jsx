import { useEffect, useRef, useState } from 'react';
import {
  Sparkles,
  X,
  Send,
  Bot,
  RefreshCw,
} from 'lucide-react';
import { apiPost } from '@/lib/api';

const STORAGE_KEY = 'hsh_ai_chat';
const SESSION_KEY = 'hsh_ai_chat_session';

const suggestions = [
  'How do I book a service?',
  'What services are available?',
  'How do payments work?',
  'Can I cancel a booking?',
];

function getFallbackReply(text) {
  const t = text.toLowerCase();
  if (t.includes('book') || t.includes('hire') || t.includes('schedule')) {
    return "Booking is easy! Scroll to the 'Services' section, pick what you need, and tap 'Get started'. You'll choose a time slot and a worker will be assigned to you.";
  }
  if (t.includes('service') || t.includes('offer') || t.includes('available')) {
    return "We offer plumbing, electrical work, painting, cleaning, carpentry, and HVAC. Browse them all under the 'Services' section on the homepage.";
  }
  if (t.includes('pay') || t.includes('price') || t.includes('cost') || t.includes('charge')) {
    return "Payments are handled securely after the job is done. You can pay by card, Apple Pay, or bank transfer. You'll see the total price before confirming.";
  }
  if (t.includes('cancel') || t.includes('refund')) {
    return "You can cancel any booking up to 2 hours before the scheduled time with no charge. Go to your messages with the worker and tap 'Cancel task'.";
  }
  return "I'm here to help with HomeServiceHub! You can ask me about booking services, payments, cancellations, or finding the right worker. What would you like to know?";
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function AIChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fall through
      }
    }
    return [
      {
        id: 'welcome',
        from: 'bot',
        text: "Hi! I'm your HomeServiceHub assistant. Ask me anything about booking, services, or payments.",
        at: Date.now(),
      },
    ];
  });
  const [draft, setDraft] = useState('');
  const [typing, setTyping] = useState(false);
  const [unread, setUnread] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typing]);

  useEffect(() => {
    if (open) {
      setUnread(false);
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [open]);

  const send = async (textArg) => {
    const text = (textArg ?? draft).trim();
    if (!text) return;
    const userMsg = { id: crypto.randomUUID(), from: 'me', text, at: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setDraft('');
    setTyping(true);

    try {
      const sessionId = localStorage.getItem(SESSION_KEY) || crypto.randomUUID();
      localStorage.setItem(SESSION_KEY, sessionId);

      const res = await apiPost('/ai/chat', { message: text, session_id: sessionId });
      const replyText = (res?.answer && res.answer.trim()) || getFallbackReply(text);

      setTimeout(() => {
        const botMsg = {
          id: crypto.randomUUID(),
          from: 'bot',
          text: replyText,
          at: Date.now(),
          sources: Array.isArray(res?.sources) ? res.sources : undefined,
        };
        setMessages((prev) => [...prev, botMsg]);
        setTyping(false);
        if (!open) setUnread(true);
      }, 250);
    } catch (e) {
      setTimeout(() => {
        const botMsg = {
          id: crypto.randomUUID(),
          from: 'bot',
          text: getFallbackReply(text),
          at: Date.now(),
        };
        setMessages((prev) => [...prev, botMsg]);
        setTyping(false);
        if (!open) setUnread(true);
      }, 250);
    }
  };

  const reset = () => {
    setMessages([
      {
        id: 'welcome',
        from: 'bot',
        text: "Hi! I'm your HomeServiceHub assistant. Ask me anything about booking, services, or payments.",
        at: Date.now(),
      },
    ]);
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-50 grid h-14 w-14 place-items-center rounded-full bg-brand-500 text-ink-950 shadow-glow transition-all duration-300 hover:bg-brand-400 hover:-translate-y-0.5 active:translate-y-0 sm:bottom-6 sm:right-6"
        aria-label={open ? 'Close AI assistant' : 'Open AI assistant'}
      >
        {open ? (
          <X className="h-6 w-6" />
        ) : (
          <span className="relative">
            <Sparkles className="h-6 w-6" />
            {unread && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
                  1
                </span>
              </span>
            )}
          </span>
        )}
      </button>

      {/* Chat window */}
      {open && (
        <div className="fixed bottom-24 right-5 z-50 flex h-[min(560px,75vh)] w-[min(380px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-white/10 bg-ink-900/95 shadow-2xl backdrop-blur-xl sm:right-6 animate-slide-up">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 bg-ink-850/80 px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-ink-950">
                <Bot className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-display text-sm font-700 text-white">Hub Assistant</h3>
                <p className="flex items-center gap-1.5 text-xs text-slate-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  Online · AI powered
                </p>
              </div>
            </div>
            <button
              onClick={reset}
              className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
              aria-label="Reset conversation"
              title="Reset conversation"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((m) => {
              const mine = m.from === 'me';
              return (
                <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex max-w-[80%] flex-col ${mine ? 'items-end' : 'items-start'}`}>
<div
                    className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      mine
                        ? 'rounded-br-md bg-brand-500 text-ink-950'
                        : 'rounded-bl-md border border-white/10 bg-ink-850 text-slate-100'
                    }`}
                  >
                    {m.text}
                  </div>
                  {!mine && Array.isArray(m.sources) && m.sources.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {m.sources.map((s, i) => (
                        <span
                          key={i}
                          className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-slate-500"
                          title="Source chunk used by the assistant"
                        >
                          {s.source}
                        </span>
                      ))}
                    </div>
                  )}
                  <span className="mt-1 px-1 text-[10px] text-slate-500">{formatTime(m.at)}</span>
                  </div>
                </div>
              );
            })}

            {typing && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-white/10 bg-ink-850 px-4 py-3">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-slate-500 [animation-delay:0ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-slate-500 [animation-delay:150ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-slate-500 [animation-delay:300ms]" />
                </div>
              </div>
            )}
          </div>

          {/* Suggestions */}
          {messages.length <= 1 && (
            <div className="flex flex-wrap gap-2 px-4 pb-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:border-brand-400/40 hover:text-white"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Composer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex items-center gap-2 border-t border-white/10 bg-ink-850/80 px-3 py-3"
          >
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ask me anything…"
              className="flex-1 rounded-full border border-white/10 bg-ink-900 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-brand-400"
            />
            <button
              type="submit"
              disabled={!draft.trim()}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-500 text-ink-950 transition-all hover:bg-brand-400 disabled:opacity-40"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
