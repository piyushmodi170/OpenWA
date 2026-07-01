import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Brain, TrendingUp, Heart, ShoppingCart, Users, Zap, Trash2, RefreshCw } from 'lucide-react';
import { apiRequest } from '../services/api';
import './ConversationIntelligence.css';

interface Analysis {
  id: string;
  sessionId: string;
  chatId: string;
  contactName: string;
  sentiment: string;
  sentimentScore: number;
  interestLevel: number;
  purchaseIntent: number;
  relationshipScore: number;
  keyInfo: string;
  suggestedActions: string;
  summary: string;
  stage: string;
  messageCount: number;
  updatedAt: string;
}

const SENTIMENT_COLORS: Record<string, string> = { positive: '#22c55e', neutral: '#94a3b8', negative: '#ef4444' };
const SENTIMENT_EMOJI: Record<string, string> = { positive: '😊', neutral: '😐', negative: '😟' };
const STAGE_COLORS: Record<string, string> = {
  new_lead: '#3b82f6', interested: '#8b5cf6', negotiating: '#f59e0b',
  converted: '#22c55e', lost: '#ef4444', support: '#06b6d4', active: '#94a3b8',
};
const STAGE_LABELS: Record<string, string> = {
  new_lead: 'New Lead', interested: 'Interested', negotiating: 'Negotiating',
  converted: '✅ Converted', lost: '❌ Lost', support: '🎧 Support', active: 'Active',
};

function ScoreBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="score-bar-track">
      <div className="score-bar-fill" style={{ width: `${value * 10}%`, background: color }} />
    </div>
  );
}

export function ConversationIntelligence() {
  const qc = useQueryClient();
  const [filterSession, setFilterSession] = useState('');
  const [analyzeForm, setAnalyzeForm] = useState({ sessionId: '', chatId: '', contactName: '', conversationText: '', aiProvider: 'openai', model: 'gpt-4o-mini' });
  const [showAnalyzeForm, setShowAnalyzeForm] = useState(false);

  const { data: analyses = [], isLoading } = useQuery<Analysis[]>({
    queryKey: ['conv-intelligence', filterSession],
    queryFn: () => apiRequest(`/conversation-intelligence${filterSession ? `?sessionId=${filterSession}` : ''}`),
  });

  const { data: sessions = [] } = useQuery<{ id: string }[]>({ queryKey: ['sessions'], queryFn: () => apiRequest('/sessions') });

  const analyzeMut = useMutation({
    mutationFn: (data: typeof analyzeForm) => apiRequest('/conversation-intelligence/analyze', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['conv-intelligence'] }); setShowAnalyzeForm(false); setAnalyzeForm({ sessionId: '', chatId: '', contactName: '', conversationText: '', aiProvider: 'openai', model: 'gpt-4o-mini' }); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiRequest(`/conversation-intelligence/${id}`, { method: 'DELETE' }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['conv-intelligence'] }),
  });

  const parseList = (s: string): string[] => { try { return JSON.parse(s) as string[]; } catch { return []; } };

  const avgIntent = analyses.length > 0 ? Math.round(analyses.reduce((s, a) => s + a.purchaseIntent, 0) / analyses.length) : 0;
  const avgInterest = analyses.length > 0 ? Math.round(analyses.reduce((s, a) => s + a.interestLevel, 0) / analyses.length) : 0;
  const positiveCount = analyses.filter(a => a.sentiment === 'positive').length;

  return (
    <div className="ci-page">
      <div className="page-header-row">
        <div>
          <h1 className="page-title"><Brain size={24} /> Conversation Intelligence</h1>
          <p className="page-subtitle">AI-powered analysis of every conversation — sentiment, intent, and smart suggestions</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAnalyzeForm(!showAnalyzeForm)}>
          <Zap size={16} /> Analyze Conversation
        </button>
      </div>

      {analyses.length > 0 && (
        <div className="ci-overview-bar">
          <div className="ov-card"><div className="ov-val">{analyses.length}</div><div className="ov-label">Tracked Contacts</div></div>
          <div className="ov-card"><div className="ov-val" style={{ color: '#22c55e' }}>{positiveCount}</div><div className="ov-label">Positive Sentiment</div></div>
          <div className="ov-card"><div className="ov-val" style={{ color: '#8b5cf6' }}>{avgInterest}/10</div><div className="ov-label">Avg Interest</div></div>
          <div className="ov-card"><div className="ov-val" style={{ color: '#f59e0b' }}>{avgIntent}/10</div><div className="ov-label">Avg Purchase Intent</div></div>
          <div className="ov-card"><div className="ov-val" style={{ color: '#22c55e' }}>{analyses.filter(a => a.stage === 'converted').length}</div><div className="ov-label">Converted</div></div>
        </div>
      )}

      {showAnalyzeForm && (
        <div className="ci-analyze-form">
          <h3><Zap size={16} /> Analyze a Conversation</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Session ID</label>
              <select className="form-select" value={analyzeForm.sessionId} onChange={e => setAnalyzeForm(f => ({ ...f, sessionId: e.target.value }))}>
                <option value="">Select session...</option>
                {(sessions as { id: string }[]).map(s => <option key={s.id} value={s.id}>{s.id}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Chat ID (phone number)</label>
              <input className="form-input" placeholder="e.g. 919876543210@c.us" value={analyzeForm.chatId} onChange={e => setAnalyzeForm(f => ({ ...f, chatId: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Contact Name</label>
              <input className="form-input" placeholder="Optional" value={analyzeForm.contactName} onChange={e => setAnalyzeForm(f => ({ ...f, contactName: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>AI Provider</label>
              <select className="form-select" value={analyzeForm.aiProvider} onChange={e => setAnalyzeForm(f => ({ ...f, aiProvider: e.target.value, model: e.target.value === 'gemini' ? 'gemini-2.0-flash' : 'gpt-4o-mini' }))}>
                <option value="openai">OpenAI</option>
                <option value="gemini">Gemini</option>
              </select>
            </div>
            <div className="form-group">
              <label>Model</label>
              <select className="form-select" value={analyzeForm.model} onChange={e => setAnalyzeForm(f => ({ ...f, model: e.target.value }))}>
                {analyzeForm.aiProvider === 'gemini' ? (
                  <>
                    <option value="gemini-2.5-pro">Gemini 2.5 Pro — most capable</option>
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash — fast & smart</option>
                    <option value="gemini-2.0-flash">Gemini 2.0 Flash — latest, fast</option>
                    <option value="gemini-2.0-flash-lite">Gemini 2.0 Flash Lite — cheap</option>
                    <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                    <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                  </>
                ) : (
                  <>
                    <option value="gpt-4o-mini">GPT-4o Mini — fast, cheap</option>
                    <option value="gpt-4o">GPT-4o — multimodal flagship</option>
                    <option value="gpt-4.1">GPT-4.1 — latest generation</option>
                    <option value="gpt-4.1-mini">GPT-4.1 Mini — fast & affordable</option>
                    <option value="gpt-4-turbo">GPT-4 Turbo</option>
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo — legacy</option>
                    <option value="o1-mini">o1 Mini — reasoning</option>
                    <option value="o3-mini">o3 Mini — fast reasoning</option>
                  </>
                )}
              </select>
            </div>
            <div className="form-group full-width">
              <label>Conversation Text</label>
              <textarea className="form-textarea" rows={8} placeholder="Paste the conversation here (most recent messages work best)..." value={analyzeForm.conversationText} onChange={e => setAnalyzeForm(f => ({ ...f, conversationText: e.target.value }))} />
            </div>
          </div>
          <div className="form-actions">
            <button className="btn-secondary" onClick={() => setShowAnalyzeForm(false)}>Cancel</button>
            <button className="btn-primary" onClick={() => analyzeMut.mutate(analyzeForm)} disabled={analyzeMut.isPending || !analyzeForm.sessionId || !analyzeForm.chatId || !analyzeForm.conversationText}>
              {analyzeMut.isPending ? <><RefreshCw size={14} className="animate-spin" /> Analyzing...</> : <><Zap size={14} /> Analyze</>}
            </button>
          </div>
        </div>
      )}

      <div className="ci-filters">
        <select className="form-select" value={filterSession} onChange={e => setFilterSession(e.target.value)}>
          <option value="">All Sessions</option>
          {(sessions as { id: string }[]).map(s => <option key={s.id} value={s.id}>{s.id}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="loading-state">Loading analyses...</div>
      ) : analyses.length === 0 ? (
        <div className="empty-state">
          <Brain size={48} />
          <h3>No Conversation Analyses Yet</h3>
          <p>Analyze conversations to unlock sentiment tracking, purchase intent, and smart suggestions</p>
          <button className="btn-primary" onClick={() => setShowAnalyzeForm(true)}><Zap size={16} /> Analyze First Conversation</button>
        </div>
      ) : (
        <div className="ci-grid">
          {analyses.map(a => (
            <div key={a.id} className="ci-card">
              <div className="ci-card-header">
                <div>
                  <div className="ci-contact-name">{a.contactName || a.chatId}</div>
                  <div className="ci-chat-id">{a.chatId} · {a.sessionId}</div>
                </div>
                <div className="ci-header-right">
                  <span className="stage-badge" style={{ background: STAGE_COLORS[a.stage] || '#94a3b8' }}>{STAGE_LABELS[a.stage] || a.stage}</span>
                  <button className="icon-btn danger" onClick={() => { if (confirm('Delete this analysis?')) deleteMut.mutate(a.id); }}><Trash2 size={14} /></button>
                </div>
              </div>

              <div className="ci-sentiment-row">
                <span className="sentiment-emoji">{SENTIMENT_EMOJI[a.sentiment] || '😐'}</span>
                <span className="sentiment-label" style={{ color: SENTIMENT_COLORS[a.sentiment] }}>{a.sentiment}</span>
                <span className="sentiment-score">({a.sentimentScore > 0 ? '+' : ''}{a.sentimentScore.toFixed(2)})</span>
              </div>

              {a.summary && <p className="ci-summary">{a.summary}</p>}

              <div className="ci-scores">
                <div className="score-row">
                  <span className="score-label"><TrendingUp size={12} /> Interest</span>
                  <ScoreBar value={a.interestLevel} color="#8b5cf6" />
                  <span className="score-num">{a.interestLevel}/10</span>
                </div>
                <div className="score-row">
                  <span className="score-label"><ShoppingCart size={12} /> Purchase Intent</span>
                  <ScoreBar value={a.purchaseIntent} color="#f59e0b" />
                  <span className="score-num">{a.purchaseIntent}/10</span>
                </div>
                <div className="score-row">
                  <span className="score-label"><Heart size={12} /> Relationship</span>
                  <ScoreBar value={a.relationshipScore} color="#ec4899" />
                  <span className="score-num">{a.relationshipScore}/10</span>
                </div>
              </div>

              {parseList(a.keyInfo).length > 0 && (
                <div className="ci-key-info">
                  <strong>Key Info:</strong>
                  <ul>{parseList(a.keyInfo).map((info, i) => <li key={i}>{info}</li>)}</ul>
                </div>
              )}

              {parseList(a.suggestedActions).length > 0 && (
                <div className="ci-actions-section">
                  <strong><Zap size={12} /> Suggested Actions:</strong>
                  <div className="suggested-actions">
                    {parseList(a.suggestedActions).map((action, i) => <span key={i} className="action-chip">{action}</span>)}
                  </div>
                </div>
              )}

              <div className="ci-footer">
                <span><Users size={12} /> {a.messageCount} messages</span>
                <span>{new Date(a.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
