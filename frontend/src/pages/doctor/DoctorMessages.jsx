import { useState, useEffect, useCallback, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { AlertTriangle, MessageSquare, RefreshCw, Send } from 'lucide-react';
import api from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import SearchBar from '../../components/SearchBar.jsx';
import { formatDateTime, getErrorMessage } from '../../utils/formatters.js';

export default function DoctorMessages() {
  const { showToast } = useToast();
  const outletContext = useOutletContext() || {};
  const refreshChatUnreadCount = outletContext.refreshChatUnreadCount;

  const [loading, setLoading] = useState(true);
  const [threads, setThreads] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const listEndRef = useRef(null);
  const prevCountRef = useRef(0);

  const loadThreads = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);
      try {
        const res = await api.get('/chat/conversations');
        const nextThreads = res.data?.threads || [];
        setThreads(nextThreads);
        setSelectedPatientId((prev) => {
          if (prev && nextThreads.some((t) => String(t.patient?._id) === String(prev))) {
            return prev;
          }
          return nextThreads[0]?.patient?._id || '';
        });
        if (typeof refreshChatUnreadCount === 'function') {
          refreshChatUnreadCount();
        }
      } catch (err) {
        if (!silent) {
          showToast(getErrorMessage(err, 'Unable to load assigned patient conversations.'), 'error');
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [refreshChatUnreadCount, showToast]
  );

  const loadMessages = useCallback(
    async (patientId, { silent = false } = {}) => {
      if (!patientId) {
        setMessages([]);
        return;
      }
      if (!silent) setMessagesLoading(true);
      try {
        const res = await api.get('/chat/conversations/by-patient/messages', {
          params: { patientId },
        });
        setMessages(res.data?.messages || []);
        setThreads((prev) =>
          prev.map((t) =>
            String(t.patient?._id) === String(patientId) ? { ...t, unreadCount: 0 } : t
          )
        );
        if (typeof refreshChatUnreadCount === 'function') {
          refreshChatUnreadCount();
        }
      } catch (err) {
        if (!silent) {
          showToast(getErrorMessage(err, 'Unable to load conversation messages.'), 'error');
        }
      } finally {
        if (!silent) setMessagesLoading(false);
      }
    },
    [refreshChatUnreadCount, showToast]
  );

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    if (selectedPatientId) {
      prevCountRef.current = 0;
      loadMessages(selectedPatientId);
    }
  }, [selectedPatientId, loadMessages]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadThreads({ silent: true });
      if (selectedPatientId) {
        loadMessages(selectedPatientId, { silent: true });
      }
    }, 6000);
    return () => clearInterval(interval);
  }, [loadThreads, loadMessages, selectedPatientId]);

  useEffect(() => {
    if (messages.length > prevCountRef.current) {
      listEndRef.current?.scrollIntoView({ behavior: prevCountRef.current === 0 ? 'auto' : 'smooth' });
    }
    prevCountRef.current = messages.length;
  }, [messages.length]);

  const filteredThreads = threads.filter((t) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      t.patient?.user?.name?.toLowerCase().includes(q) ||
      t.patient?.patientCode?.toLowerCase().includes(q) ||
      t.patient?.user?.email?.toLowerCase().includes(q)
    );
  });

  const activeThread = threads.find(
    (t) => String(t.patient?._id) === String(selectedPatientId)
  );
  const activePatient = activeThread?.patient || null;

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    const content = draft.trim();
    if (!content || !selectedPatientId || sending) return;

    setSending(true);
    try {
      const res = await api.post('/chat/messages', {
        patientId: selectedPatientId,
        content,
      });
      const created = res.data?.message;
      if (created) {
        setMessages((prev) => [...prev, created]);
      }
      setDraft('');
      await loadThreads({ silent: true });
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to send reply.'), 'error');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Assigned Patient Messages</h1>
          <p>Private clinical messaging restricted to patients currently under your care.</p>
        </div>
        <div className="page-header-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              loadThreads();
              if (selectedPatientId) loadMessages(selectedPatientId);
            }}
            disabled={loading}
          >
            <RefreshCw size={15} />
            Refresh
          </button>
        </div>
      </div>

      <div className="alert-banner alert-banner--info" role="note" style={{ marginBottom: '16px' }}>
        <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
        <span>
          Messages refresh automatically every 6 seconds and are visible only to you and the
          assigned patient. For urgent emergency triage, direct patients to Hospital Emergency
          Assistance.
        </span>
      </div>

      {loading ? (
        <LoadingSpinner label="Loading assigned patient conversations..." />
      ) : threads.length === 0 ? (
        <div className="surface-card">
          <EmptyState
            icon={MessageSquare}
            title="No assigned patients"
            message="Conversations will appear here once patients are assigned to your care."
          />
        </div>
      ) : (
        <div className="chat-shell">
          <div className="chat-thread-list">
            <div className="chat-thread-header">
              <div style={{ marginBottom: '10px' }}>Assigned Patients ({threads.length})</div>
              <SearchBar
                value={search}
                onChange={setSearch}
                placeholder="Search patient name or ID..."
              />
            </div>

            {filteredThreads.length === 0 ? (
              <div style={{ padding: '20px', fontSize: '13px', color: 'var(--text-muted)' }}>
                No assigned patients match your search.
              </div>
            ) : (
              filteredThreads.map((thread) => {
                const pat = thread.patient;
                const isActive = String(pat?._id) === String(selectedPatientId);
                return (
                  <button
                    key={pat?._id}
                    type="button"
                    className={`chat-thread-item ${isActive ? 'is-active' : ''}`}
                    onClick={() => setSelectedPatientId(pat?._id)}
                  >
                    <div className="chat-thread-top">
                      <span className="chat-thread-name">{pat?.user?.name || 'Patient'}</span>
                      {thread.unreadCount > 0 && (
                        <span className="chat-unread-badge">{thread.unreadCount}</span>
                      )}
                    </div>
                    <div className="meta-line" style={{ fontSize: '11.5px' }}>
                      <span className="mono-text">{pat?.patientCode || 'PAT'}</span>
                      {thread.lastMessageAt && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="tabular-nums">{formatDateTime(thread.lastMessageAt)}</span>
                        </>
                      )}
                    </div>
                    <div className="chat-thread-preview">
                      {thread.lastMessageText
                        ? `${thread.lastSenderRole === 'doctor' ? 'You: ' : ''}${thread.lastMessageText}`
                        : 'No messages yet — click to begin.'}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="chat-pane">
            {!activePatient ? (
              <EmptyState
                icon={MessageSquare}
                title="Select a patient thread"
                message="Choose an assigned patient from the list to review or send messages."
              />
            ) : (
              <>
                <div className="chat-pane-header">
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>
                      {activePatient.user?.name}
                    </div>
                    <div className="meta-line">
                      <span className="mono-text">{activePatient.patientCode || 'Patient'}</span>
                      <span aria-hidden="true">·</span>
                      <span>Blood Group: {activePatient.bloodGroup || 'Unknown'}</span>
                      {activePatient.user?.phone && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{activePatient.user.phone}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <span className="status-badge status-badge--info">Assigned Care</span>
                </div>

                <div className="chat-messages">
                  {messagesLoading ? (
                    <LoadingSpinner label="Loading messages..." />
                  ) : messages.length === 0 ? (
                    <EmptyState
                      icon={MessageSquare}
                      title="No messages in this thread"
                      message={`Send a clinical note or follow-up message to ${activePatient.user?.name}.`}
                    />
                  ) : (
                    messages.map((msg) => {
                      const isMine = msg.senderRole === 'doctor';
                      return (
                        <div
                          key={msg._id}
                          className={`chat-bubble-row ${isMine ? 'chat-bubble-row--mine' : 'chat-bubble-row--theirs'}`}
                        >
                          <div className={`chat-bubble ${isMine ? 'chat-bubble--mine' : 'chat-bubble--theirs'}`}>
                            {msg.content}
                          </div>
                          <div className="chat-bubble-meta tabular-nums">
                            {isMine ? 'You' : activePatient.user?.name} ·{' '}
                            {formatDateTime(msg.createdAt)}
                            {isMine ? ` · ${msg.isRead ? 'Read' : 'Sent'}` : ''}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={listEndRef} />
                </div>

                <form className="chat-composer" onSubmit={handleSend}>
                  <textarea
                    className="form-control"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Reply to ${activePatient.user?.name}...`}
                    maxLength={2000}
                    rows={2}
                    aria-label="Reply message"
                  />
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={sending || !draft.trim()}
                  >
                    <Send size={15} />
                    {sending ? 'Sending...' : 'Send'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
