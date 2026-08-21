import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import {
  Send,
  Trash2,
  Pencil,
  Check,
  X,
  MessageSquare,
  ArrowLeft,
  Search,
  Phone,
  Info,
  PenSquare,
} from 'lucide-react';

const colors = [
  'from-brand-500 to-brand-700',
  'from-teal-500 to-teal-700',
  'from-sky-500 to-sky-700',
  'from-rose-500 to-rose-700',
  'from-amber-500 to-amber-700',
  'from-indigo-500 to-indigo-700',
  'from-emerald-500 to-emerald-700',
];

function colorForId(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return colors[hash % colors.length];
}

function initials(name) {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatPreviewTime(ts) {
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60000) return 'now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// Keep messages in chronological order by their timestamp, then by id (stable).
function sortMessages(list) {
  return [...list].sort((a, b) => {
    const ta = new Date(a.at).getTime();
    const tb = new Date(b.at).getTime();
    if (ta !== tb) return ta - tb;
    return a.id - b.id;
  });
}

export default function Chat({ onBack }) {
  const { user: authUser } = useAuth();
  const [searchParams] = useSearchParams();
  const withUserId = searchParams.get('with');

  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activeUser, setActiveUser] = useState(null);
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState('');
  const [search, setSearch] = useState('');
  const [mobileView, setMobileView] = useState('list');
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showPhone, setShowPhone] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  // Insert/refresh a conversation entry for a given user in the sidebar list.
  const upsertConversation = useCallback((u) => {
    if (!u?.id) return;
    setConversations((prev) => {
      const exists = prev.find((c) => c.id === u.id);
      if (exists) {
        return prev.map((c) => (c.id === u.id ? { ...c, name: u.name || c.name, role: u.role || c.role, phone: u.phone ?? c.phone } : c));
      }
      return [{ id: u.id, name: u.name || 'Unknown', role: u.role || '', phone: u.phone || '', lastMessage: '', lastMessageAt: null, online: false }, ...prev];
    });
  }, []);

  const myId = authUser?.id;

  useEffect(() => {
    if (!myId) {
      setLoadingConversations(false);
      setConversations([]);
      return;
    }
    setLoadingConversations(true);
    apiGet('/chat/conversations')
      .then((data) => {
        const list = (data.conversations || []).map((c) => ({
          id: c.user?.id,
          name: c.user?.name || 'Unknown',
          role: c.user?.role || '',
          lastMessage: c.last_message,
          lastMessageAt: c.last_message_at,
          online: false,
        }));
        setConversations(list);
        // No existing conversations? Load the people you can message.
        if (list.length === 0 && !withUserId) {
          setLoadingUsers(true);
          apiGet('/chat/users')
            .then((u) => setUsers(u.users || []))
            .catch(() => {})
            .finally(() => setLoadingUsers(false));
        }
      })
      .catch(() => {})
      .finally(() => setLoadingConversations(false));
  }, [myId, withUserId]);

  const openConversation = useCallback(async (userId) => {
    setShowNew(false);
    setActiveUser({ id: userId, name: '', role: '' });
    setMessages([]);
    setMobileView('thread');
    setLoadingMessages(true);
    try {
      const data = await apiGet(`/chat/messages/${userId}`);
      const mapped = (data.messages || []).map((m) => ({
        id: m.id,
        from: Number(m.from_user_id) === Number(myId) ? 'me' : 'them',
        text: m.conversation,
        at: m.created_at,
      }));
      setMessages(sortMessages(mapped));
      if (data.user) {
        setActiveUser((prev) => ({ ...prev, ...data.user }));
        upsertConversation(data.user);
      }
    } catch {
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  }, [myId, upsertConversation]);

  useEffect(() => {
    if (withUserId && myId && !activeUser) {
      openConversation(Number(withUserId));
    }
  }, [withUserId, myId, activeUser, openConversation]);

  // Real-time: poll the active conversation for new messages.
  useEffect(() => {
    if (!activeUser?.id || !myId || editingId) return;
    let cancelled = false;
    const lastSig = { current: '' };
    const tick = async () => {
      try {
        const data = await apiGet(`/chat/messages/${activeUser.id}`);
        if (cancelled) return;
        const mapped = (data.messages || []).map((m) => ({
          id: m.id,
          from: Number(m.from_user_id) === Number(myId) ? 'me' : 'them',
          text: m.conversation,
          at: m.created_at,
        }));
        const sig = mapped.map((m) => `${m.id}:${m.text}`).join('|');
        if (sig !== lastSig.current) {
          lastSig.current = sig;
          setMessages(sortMessages(mapped));
        }
        if (data.user) setActiveUser((prev) => ({ ...prev, ...data.user }));
      } catch {
        /* keep current messages on transient errors */
      }
    };
    tick();
    const id = setInterval(tick, 3000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [activeUser?.id, myId, editingId]);

  // Real-time: poll the conversation list for new/updated previews.
  useEffect(() => {
    if (!myId || withUserId) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const data = await apiGet('/chat/conversations');
        if (cancelled) return;
        const list = (data.conversations || []).map((c) => ({
          id: c.user?.id,
          name: c.user?.name || 'Unknown',
          role: c.user?.role || '',
          lastMessage: c.last_message,
          lastMessageAt: c.last_message_at,
          online: false,
        }));
        setConversations(list);
      } catch {
        /* ignore */
      }
    };
    const id = setInterval(tick, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [myId, withUserId]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, editingId]);

  const sendMessage = async (e) => {
    e?.preventDefault();
    const text = draft.trim();
    if (!text || !activeUser || sending) return;
    setSending(true);
    try {
      const res = await apiPost('/chat/messages', {
        to_user_id: activeUser.id,
        conversation: text,
      });
      const saved = res.data;
      setMessages((prev) => sortMessages([...prev, { id: saved.id, from: 'me', text: saved.conversation, at: saved.created_at }]));
      setConversations((prev) => {
        const exists = prev.find((c) => c.id === activeUser.id);
        if (exists) {
          return prev.map((c) =>
            c.id === activeUser.id ? { ...c, lastMessage: saved.conversation, lastMessageAt: saved.created_at } : c,
          );
        }
        return [
          {
            id: activeUser.id,
            name: activeUser.name || 'User',
            role: activeUser.role || '',
            lastMessage: saved.conversation,
            lastMessageAt: saved.created_at,
            online: false,
          },
          ...prev,
        ];
      });
      setDraft('');
    } catch {
      // ignore failed send for now
    } finally {
      setSending(false);
    }
  };

  const startEdit = (m) => {
    setEditingId(m.id);
    setEditDraft(m.text);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft('');
  };

  const saveEdit = async (msgId) => {
    const text = editDraft.trim();
    if (!text || !activeUser) return;
    const prevText = messages.find((m) => m.id === msgId)?.text;
    // Optimistic local update
    setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, text } : m)));
    setEditingId(null);
    setEditDraft('');
    try {
      await apiPut(`/chat/messages/${msgId}`, { conversation: text });
    } catch {
      // Roll back on failure
      setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, text: prevText } : m)));
    }
  };

  const deleteMessage = async (msgId) => {
    const snapshot = messages;
    // Optimistic local removal
    setMessages((prev) => prev.filter((m) => m.id !== msgId));
    try {
      await apiDelete(`/chat/messages/${msgId}`);
    } catch {
      // Roll back on failure
      setMessages(snapshot);
    }
  };

  const active = activeUser
    ? {
        id: activeUser.id,
        name: activeUser.name || 'User',
        role: activeUser.role || '',
        phone: activeUser.phone || '',
        messages,
        online: false,
        lastSeen: '',
      }
    : null;

  const filtered = conversations.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  if (!myId) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-ink-950 px-6 text-center">
        <MessageSquare className="h-12 w-12 text-ink-700" />
        <p className="text-slate-300">Please sign in to view your messages.</p>
        <Link to="/sign-in" className="btn-primary">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="relative flex h-screen overflow-hidden bg-ink-950">
      <aside
        className={`${
          mobileView === 'list' ? 'flex' : 'hidden'
        } w-full flex-col border-r border-white/10 bg-ink-900/60 backdrop-blur-xl md:flex md:w-80 lg:w-96`}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-5">
          <button
            onClick={onBack}
            className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition-colors hover:border-brand-400/50 hover:text-white"
            aria-label="Back to home"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="flex items-center gap-2 font-display text-base font-700 text-white">
            <MessageSquare className="h-5 w-5 text-brand-400" />
            Messages
          </h1>
          <button
            onClick={() => setShowNew((v) => !v)}
            className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition-colors hover:border-brand-400/50 hover:text-white"
            aria-label="New message"
            title="New message"
          >
            <PenSquare className="h-4 w-4" />
          </button>
        </div>

        {showNew && (
          <div className="border-b border-white/10 px-4 py-3 sm:px-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Start a conversation</p>
            {loadingUsers ? (
              <p className="text-sm text-slate-500">Loading people…</p>
            ) : users.length === 0 ? (
              <p className="text-sm text-slate-500">No one available to message.</p>
            ) : (
              <div className="flex max-h-56 flex-col gap-1 overflow-y-auto">
                {users.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => openConversation(u.id)}
                    className="flex items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-white/5"
                  >
                    <span
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br ${colorForId(
                        String(u.id),
                      )} text-xs font-bold text-ink-950`}
                    >
                      {initials(u.name)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-white">{u.name}</span>
                      <span className="block text-xs capitalize text-slate-400">{u.role}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-ink-850 px-3 py-2.5">
            <Search className="h-4 w-4 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations…"
              className="w-full bg-transparent text-sm text-white placeholder:text-slate-500 outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-4">
          {loadingConversations ? (
            <p className="px-3 py-8 text-center text-sm text-slate-500">Loading conversations…</p>
          ) : filtered.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-slate-500">No conversations found.</p>
          ) : (
            filtered.map((c) => {
              const isActive = active?.id === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => openConversation(c.id)}
                  className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors ${
                    isActive
                      ? 'border border-brand-400/30 bg-brand-500/10'
                      : 'border border-transparent hover:bg-white/5'
                  }`}
                >
                  <div className="relative shrink-0">
                    <span
                      className={`grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br ${colorForId(
                        String(c.id),
                      )} text-sm font-bold text-ink-950`}
                    >
                      {initials(c.name)}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-white">{c.name}</span>
                      {c.lastMessageAt && (
                        <span className="shrink-0 text-[11px] text-slate-500">
                          {formatPreviewTime(c.lastMessageAt)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-xs text-slate-400">
                        {c.lastMessage || c.role}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      <main
        className={`${
          mobileView === 'thread' ? 'flex' : 'hidden'
        } flex-1 flex-col md:flex`}
      >
        {active ? (
          <>
            <header className="flex items-center justify-between border-b border-white/10 bg-ink-900/60 px-4 py-3 backdrop-blur-xl sm:px-6">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setMobileView('list')}
                  className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition-colors hover:text-white md:hidden"
                  aria-label="Back to conversations"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="relative">
                  <span
                    className={`grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br ${colorForId(
                      String(active.id),
                    )} text-sm font-bold text-ink-950`}
                  >
                    {initials(active.name)}
                  </span>
                </div>
                <div>
                  <h2 className="font-display text-sm font-700 text-white">{active.name}</h2>
                  <p className="text-xs text-slate-400">{active.role}</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowPhone(true)}
                  className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
                  aria-label="View phone number"
                  title="View phone number"
                >
                  <Phone className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setShowInfo(true)}
                  className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
                  aria-label="View contact info"
                  title="View contact info"
                >
                  <Info className="h-4 w-4" />
                </button>
              </div>
            </header>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
              {loadingMessages ? (
                <div className="mt-20 text-center text-slate-400">Loading messages…</div>
              ) : messages.length === 0 ? (
                <div className="mt-20 text-center">
                  <MessageSquare className="mx-auto h-12 w-12 text-ink-700" />
                  <p className="mt-4 text-slate-400">
                    No messages yet. Say hello to {active.name}!
                  </p>
                </div>
              ) : (
                <div className="mx-auto flex max-w-3xl flex-col gap-3">
                  {messages.map((m, i) => {
                    const mine = m.from === 'me';
                    const prev = messages[i - 1];
                    const showAvatar = !prev || prev.from !== m.from;
                    return (
                      <div
                        key={m.id}
                        className={`group flex items-end gap-2 ${mine ? 'flex-row-reverse' : 'flex-row'}`}
                      >
                        <div className="w-8 shrink-0">
                          {showAvatar && !mine && (
                            <span
                              className={`grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br ${colorForId(
                                String(active.id),
                              )} text-[10px] font-bold text-ink-950`}
                            >
                              {initials(active.name)}
                            </span>
                          )}
                        </div>

                        <div className={`flex max-w-[72%] flex-col ${mine ? 'items-end' : 'items-start'}`}>
                          {editingId === m.id ? (
                            <div className="w-full min-w-[240px] rounded-2xl border border-brand-400/40 bg-ink-850 p-3">
                              <textarea
                                value={editDraft}
                                onChange={(e) => setEditDraft(e.target.value)}
                                rows={2}
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    saveEdit(m.id);
                                  }
                                  if (e.key === 'Escape') cancelEdit();
                                }}
                                className="w-full resize-none rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white outline-none focus:border-brand-400"
                              />
                              <div className="mt-2 flex justify-end gap-2">
                                <button
                                  onClick={cancelEdit}
                                  className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white"
                                >
                                  <X className="h-3.5 w-3.5" /> Cancel
                                </button>
                                <button
                                  onClick={() => saveEdit(m.id)}
                                  className="inline-flex items-center gap-1 rounded-full bg-brand-500 px-3 py-1.5 text-xs font-semibold text-ink-950 hover:bg-brand-400"
                                >
                                  <Check className="h-3.5 w-3.5" /> Save
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div
                              className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                                mine
                                  ? 'rounded-br-md bg-brand-500 text-ink-950'
                                  : 'rounded-bl-md border border-white/10 bg-ink-850 text-slate-100'
                              }`}
                            >
                              {m.text}
                            </div>
                          )}

                          {editingId !== m.id && (
                            <div
                              className={`mt-1 flex items-center gap-2 ${
                                mine ? 'flex-row-reverse' : 'flex-row'
                              }`}
                            >
                              <span className="text-[11px] text-slate-500">{formatTime(m.at)}</span>
                              {mine && (
                                <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                                  <button
                                    onClick={() => startEdit(m)}
                                    className="grid h-6 w-6 place-items-center rounded-full text-slate-500 hover:text-brand-300"
                                    aria-label="Edit message"
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </button>
                                  <button
                                    onClick={() => deleteMessage(m.id)}
                                    className="grid h-6 w-6 place-items-center rounded-full text-slate-500 hover:text-rose-400"
                                    aria-label="Delete message"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <footer className="border-t border-white/10 bg-ink-900/60 px-4 py-4 backdrop-blur-xl sm:px-6">
              <form onSubmit={sendMessage} className="mx-auto flex max-w-3xl items-end gap-3">
                <textarea
                  ref={inputRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  rows={1}
                  placeholder={`Message ${active.name}…`}
                  className="max-h-32 flex-1 resize-none rounded-2xl border border-white/10 bg-ink-850 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-brand-400"
                />
                <button
                  type="submit"
                  disabled={!draft.trim() || sending}
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-500 text-ink-950 shadow-glow transition-all hover:bg-brand-400 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
                  aria-label="Send message"
                >
                  {sending ? (
                    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </button>
              </form>
            </footer>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <PenSquare className="mx-auto h-12 w-12 text-ink-700" />
              <p className="mt-4 text-slate-400">Select a conversation to start chatting.</p>
            </div>
          </div>
        )}

        {showPhone && active && (
          <div
            className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setShowPhone(false)}
          >
            <div
              className="w-full max-w-xs rounded-2xl border border-white/10 bg-ink-900 p-6 text-center shadow-glow"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-lg font-bold text-ink-950">
                {initials(active.name)}
              </div>
              <h3 className="mt-3 font-display text-base font-700 text-white">{active.name}</h3>
              <p className="mt-1 text-xs uppercase tracking-wider text-slate-500">Phone number</p>
              <p className="mt-2 text-lg font-semibold text-white">
                {active.phone ? (
                  <a href={`tel:${active.phone}`} className="text-brand-300 hover:text-brand-200">
                    {active.phone}
                  </a>
                ) : (
                  <span className="text-slate-400">Not available</span>
                )}
              </p>
              <button
                onClick={() => setShowPhone(false)}
                className="mt-5 w-full rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-brand-400/40 hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {showInfo && active && (
          <div
            className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setShowInfo(false)}
          >
            <div
              className="w-full max-w-xs rounded-2xl border border-white/10 bg-ink-900 p-6 text-center shadow-glow"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-lg font-bold text-ink-950">
                {initials(active.name)}
              </div>
              <h3 className="mt-3 font-display text-base font-700 text-white">{active.name}</h3>
              <p className="mt-1 text-xs uppercase tracking-wider text-slate-500">Role</p>
              <p className="mt-2 text-lg font-semibold capitalize text-white">
                {active.role ? active.role : <span className="text-slate-400">Not available</span>}
              </p>
              <button
                onClick={() => setShowInfo(false)}
                className="mt-5 w-full rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-brand-400/40 hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
