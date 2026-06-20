import { useState, useRef, useEffect } from 'react';
import { Radio, Send, XCircle, CheckCircle, Loader2, AlertTriangle, Play, Square } from 'lucide-react';
import { messageApi, contactApi } from '../services/api';
import { useSessionsQuery } from '../hooks/queries';
import { useRole } from '../hooks/useRole';
import { PageHeader } from '../components/PageHeader';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import './Broadcast.css';

interface RecipientResult {
  phone: string;
  status: 'pending' | 'sending' | 'sent' | 'failed' | 'skipped';
  error?: string;
  messageId?: string;
}

export function Broadcast() {
  useDocumentTitle('Broadcast');
  const { canWrite } = useRole();
  const { data: allSessions = [], isLoading: loadingSessions } = useSessionsQuery();
  const sessions = allSessions.filter(s => s.status === 'ready');

  const [sessionId, setSessionId] = useState('');
  const [numbersRaw, setNumbersRaw] = useState('');
  const [message, setMessage] = useState('');
  const [delayMs, setDelayMs] = useState(2000);
  const [results, setResults] = useState<RecipientResult[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const cancelRef = useRef(false);
  const resultsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (sessions.length > 0 && !sessionId) {
      setSessionId(sessions[0].id);
    }
  }, [sessions, sessionId]);

  useEffect(() => {
    if (running) {
      resultsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [results, running]);

  const parseNumbers = (raw: string): string[] =>
    raw
      .split(/[\n,;]+/)
      .map(n => n.trim().replace(/[^0-9+]/g, ''))
      .filter(n => n.length >= 7);

  const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

  const handleStart = async () => {
    const phones = parseNumbers(numbersRaw);
    if (!sessionId || !message.trim() || phones.length === 0) return;

    cancelRef.current = false;
    setDone(false);
    setRunning(true);

    const initial: RecipientResult[] = phones.map(phone => ({ phone, status: 'pending' }));
    setResults(initial);

    for (let i = 0; i < phones.length; i++) {
      if (cancelRef.current) {
        setResults(prev =>
          prev.map((r, idx) => (idx >= i ? { ...r, status: 'skipped' } : r)),
        );
        break;
      }

      const phone = phones[i];

      setResults(prev =>
        prev.map((r, idx) => (idx === i ? { ...r, status: 'sending' } : r)),
      );

      try {
        const resolved = await contactApi.checkNumber(sessionId, phone.replace(/[^0-9]/g, ''));
        if (!resolved.exists || !resolved.whatsappId) {
          setResults(prev =>
            prev.map((r, idx) =>
              idx === i ? { ...r, status: 'failed', error: 'Not on WhatsApp' } : r,
            ),
          );
        } else {
          const res = await messageApi.sendText(sessionId, resolved.whatsappId, message);
          setResults(prev =>
            prev.map((r, idx) =>
              idx === i ? { ...r, status: 'sent', messageId: res.messageId } : r,
            ),
          );
        }
      } catch (err) {
        setResults(prev =>
          prev.map((r, idx) =>
            idx === i
              ? { ...r, status: 'failed', error: err instanceof Error ? err.message : 'Send failed' }
              : r,
          ),
        );
      }

      if (i < phones.length - 1 && !cancelRef.current) {
        await sleep(delayMs);
      }
    }

    setRunning(false);
    setDone(true);
  };

  const handleStop = () => {
    cancelRef.current = true;
  };

  const handleReset = () => {
    setResults([]);
    setDone(false);
    cancelRef.current = false;
  };

  const phones = parseNumbers(numbersRaw);
  const sentCount = results.filter(r => r.status === 'sent').length;
  const failedCount = results.filter(r => r.status === 'failed').length;
  const skippedCount = results.filter(r => r.status === 'skipped').length;
  const doneCount = sentCount + failedCount + skippedCount;
  const progress = results.length > 0 ? Math.round((doneCount / results.length) * 100) : 0;

  if (loadingSessions) {
    return (
      <div className="broadcast-page broadcast-loading">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  return (
    <div className="broadcast-page">
      <PageHeader
        title="Broadcast"
        subtitle="Send a message to multiple WhatsApp contacts from a single session"
      />

      <div className="broadcast-grid">
        <div className="broadcast-compose">
          <h2>Compose Broadcast</h2>

          <div className="form-group">
            <label>Session</label>
            <select
              value={sessionId}
              onChange={e => setSessionId(e.target.value)}
              disabled={running}
            >
              {sessions.length === 0 && <option value="">No ready sessions</option>}
              {sessions.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.phone ?? 'No phone'})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Recipients</label>
            <textarea
              value={numbersRaw}
              onChange={e => setNumbersRaw(e.target.value)}
              placeholder={`+6281234567890\n+628987654321\n+1415555555`}
              rows={6}
              disabled={running}
            />
            <span className="hint">
              One phone number per line (international format). Commas and semicolons also work.
              {phones.length > 0 && (
                <strong> {phones.length} recipient{phones.length !== 1 ? 's' : ''} detected.</strong>
              )}
            </span>
          </div>

          <div className="form-group">
            <label>Message</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Type your broadcast message here..."
              rows={5}
              disabled={running}
            />
            <span className="hint">{message.length} / 4096 characters</span>
          </div>

          <div className="form-group">
            <label>Delay between sends</label>
            <div className="delay-row">
              <input
                type="range"
                min={500}
                max={10000}
                step={500}
                value={delayMs}
                onChange={e => setDelayMs(Number(e.target.value))}
                disabled={running}
              />
              <span className="delay-value">{(delayMs / 1000).toFixed(1)}s</span>
            </div>
            <span className="hint">
              A delay between messages reduces the risk of being flagged by WhatsApp. Minimum 0.5s recommended.
            </span>
          </div>

          {!running && !done && (
            <button
              className="broadcast-btn start"
              onClick={handleStart}
              disabled={
                !canWrite ||
                !sessionId ||
                !message.trim() ||
                phones.length === 0 ||
                sessions.length === 0
              }
            >
              <Play size={18} />
              Start Broadcast ({phones.length} recipient{phones.length !== 1 ? 's' : ''})
            </button>
          )}

          {running && (
            <button className="broadcast-btn stop" onClick={handleStop}>
              <Square size={18} />
              Stop Broadcast
            </button>
          )}

          {done && !running && (
            <button className="broadcast-btn reset" onClick={handleReset}>
              <Radio size={18} />
              New Broadcast
            </button>
          )}

          {!canWrite && (
            <p className="no-permission">
              <AlertTriangle size={16} /> You have read-only access and cannot send messages.
            </p>
          )}
        </div>

        <div className="broadcast-results">
          <div className="results-header">
            <h2>Results</h2>
            {results.length > 0 && (
              <div className="results-summary">
                <span className="badge sent">{sentCount} sent</span>
                <span className="badge failed">{failedCount} failed</span>
                {skippedCount > 0 && <span className="badge skipped">{skippedCount} skipped</span>}
              </div>
            )}
          </div>

          {running && results.length > 0 && (
            <div className="progress-bar-wrap">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>
              <span className="progress-label">
                {doneCount} / {results.length} ({progress}%)
              </span>
            </div>
          )}

          {results.length === 0 ? (
            <div className="results-empty">
              <Radio size={40} className="empty-icon" />
              <p>Broadcast results will appear here once you start sending.</p>
            </div>
          ) : (
            <ul className="results-list">
              {results.map((r, i) => (
                <li key={i} className={`result-item status-${r.status}`}>
                  <span className="result-icon">
                    {r.status === 'sent' && <CheckCircle size={16} />}
                    {r.status === 'failed' && <XCircle size={16} />}
                    {r.status === 'skipped' && <Square size={16} />}
                    {r.status === 'sending' && <Loader2 size={16} className="animate-spin" />}
                    {r.status === 'pending' && <Send size={16} />}
                  </span>
                  <span className="result-phone">{r.phone}</span>
                  <span className="result-detail">
                    {r.status === 'sent' && 'Sent'}
                    {r.status === 'failed' && (r.error ?? 'Failed')}
                    {r.status === 'skipped' && 'Skipped'}
                    {r.status === 'sending' && 'Sending…'}
                    {r.status === 'pending' && 'Queued'}
                  </span>
                </li>
              ))}
              <div ref={resultsEndRef} />
            </ul>
          )}

          {done && results.length > 0 && (
            <div className="results-done">
              <CheckCircle size={18} />
              Broadcast complete — {sentCount} sent, {failedCount} failed
              {skippedCount > 0 ? `, ${skippedCount} skipped` : ''}.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
