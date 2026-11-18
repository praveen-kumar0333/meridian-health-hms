import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { AlertTriangle, MessageSquare, RefreshCw, Send } from 'lucide-react';
import api from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { formatDateTime, getErrorMessage } from '../../utils/formatters.js';

export default function PatientMessages() {
  const { showToast } = useToast();
  const outletContext = useOutletContext() || {};
  const refreshChatUnreadCount = outletContext.refreshChatUnreadCount;

  const [loading, setLoading] = useState(true);
  const [assigned, setAssigned] = useState(false);
  const [doctor, setDoctor] = useState(null);
  const [unassignedMessage, setUnassignedMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const listEndRef = useRef(null);
  const prevCountRef = useRef(0);

  const loadThread = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);
      try {
        const convRes = await api.get('/chat/conversations');
        const isAssigned = Boolean(convRes.data?.assigned);
        setAssigned(isAssigned);
        setDoctor(convRes.data?.doctor || null);
        setUnassignedMessage(convRes.data?.message || '');

        if (isAssigned) {
          const msgRes = await api.get('/chat/conversations/assigned/messages');
          setMessages(msgRes.data?.messages || []);
          if (typeof refreshChatUnreadCount === 'function') {
            refreshChatUnreadCount();
          }
        } else {
          setMessages([]);
        }
      } catch (err) {
        if (!silent) {
          showToast(getErrorMessage(err, 'Unable to load private messages.'), 'error');
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [refreshChatUnreadCount, showToast]
  );

  useEffect(() => {
    loadThread();
  }, [loadThread]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadThread({ silent: true });
    }, 6000);
    return () => clearInterval(interval);
  }, [loadThread]);

  useEffect(() => {
    if (messages.length > prevCountRef.current) {
      listEndRef.current?.scrollIntoView({ behavior: prevCountRef.current === 0 ? 'auto' : 'smooth' });
    }
    prevCountRef.current = messages.length;
  }, [messages.length]);

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    const content = draft.trim();
    if (!content || sending) return;

    setSending(true);
    try {
      const res = await api.post('/chat/messages', { content });
      const created = res.data?.message;
      if (created) {
        setMessages((prev) => [...prev, created]);
      } else {
        await loadThread({ silent: true });
      }
      setDraft('');
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to send message.'), 'error');
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
          <h1>Private Doctor Messaging</h1>
          <p>Direct communication channel with your currently assigned primary physician.</p>
        </div>
        <div className="page-header-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => loadThread()}
            disabled={loading}
          >
            <RefreshCw size={15} />
            Refresh
          </button>
        </div>
      </div>

      <div className="alert-banner alert-banner--warning" role="note" style={{ marginBottom: '16px' }}>
        <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
        <span>
          This messaging channel is for non-urgent clinical questions and is checked periodically
          (updates every 6 seconds). For urgent or life-threatening situations, submit an{' '}
          <Link to="/patient/emergency" style={{ fontWeight: 700, textDecoration: 'underline' }}>
            Emergency Assistance Request
          </Link>{' '}
          or contact local emergency services immediately.
        </span>
      </div>

      {loading ? (
        <LoadingSpinner label="Loading your care conversation..." />
      ) : !assigned || !doctor ? (
        <div className="surface-card">
          <EmptyState
            icon={MessageSquare}
            title="No Assigned Primary Doctor"
            message={
              unassignedMessage ||
              'Private messaging is only available once an authorized physician is assigned to your care.'
            }
            action={
              <Link to="/patient/book-appointment" className="btn btn-primary btn-sm">
                Book an Appointment
              </Link>
            }
          />
        </div>
      ) : (
        <div className="chat-shell chat-shell--single">
          <div className="chat-pane">
            <div className="chat-pane-header">
              <div>
                <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>
                  Dr. {doctor.user?.name || 'Assigned Physician'}
                </div>
                <div className="meta-line">
                  <span>{doctor.department}</span>
                  <span aria-hidden="true">·</span>
                  <span>{doctor.specialization}</span>
                  {doctor.doctorCode && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="mono-text">{doctor.doctorCode}</span>
                    </>
                  )}
                </div>
              </div>
              <span className="status-badge status-badge--success">Assigned Physician</span>
            </div>

            <div className="chat-messages">
              {messages.length === 0 ? (
                <EmptyState
                  icon={MessageSquare}
                  title="Start a private conversation"
                  message={`Send a message to Dr. ${doctor.user?.name || 'your physician'} regarding follow-up care, symptoms, or test results.`}
                />
              ) : (
                messages.map((msg) => {
                  const isMine = msg.senderRole === 'patient';
                  return (
                    <div
                      key={msg._id}
                      className={`chat-bubble-row ${isMine ? 'chat-bubble-row--mine' : 'chat-bubble-row--theirs'}`}
                    >
                      <div className={`chat-bubble ${isMine ? 'chat-bubble--mine' : 'chat-bubble--theirs'}`}>
                        {msg.content}
                      </div>
                      <div className="chat-bubble-meta tabular-nums">
                        {isMine ? 'You' : `Dr. ${doctor.user?.name || 'Physician'}`} ·{' '}
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
                placeholder={`Write a private message to Dr. ${doctor.user?.name || 'your physician'}...`}
                maxLength={2000}
                rows={2}
                aria-label="Message content"
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
          </div>
        </div>
      )}
    </div>
  );
}
