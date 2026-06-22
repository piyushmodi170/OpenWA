import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Trash2, Users, Send, BarChart2, Upload, Wand2,
  Play, Pause, CheckCircle, ArrowRight, ChevronDown, ChevronUp,
  AlertCircle, Bot, Link,
} from 'lucide-react';
import { apiRequest } from '../services/api';
import './AiCampaigns.css';

interface Campaign {
  id: string; name: string; goal: string; sessionId: string; status: string;
  messageTemplate: string; employeeId: string | null;
  useAiPersonalization: boolean; aiProvider: string;
  aiModel: string; totalLeads: number; sent: number; delivered: number;
  replied: number; failed: number; delayBetweenMessages: number;
  stopOnReply: boolean; createdAt: string;
}
interface Lead {
  id: string; phone: string; name: string; personalizedMessage: string;
  status: string; errorMessage: string;
}
interface Analytics {
  total: number; sent: number; delivered: number; replied: number;
  failed: number; pending: number; ready: number;
  deliveryRate: number; replyRate: number;
}
interface Employee { id: string; name: string; avatar: string; role: string; }

const STATUS_COLORS: Record<string, string> = {
  draft: '#94a3b8', scheduled: '#3b82f6', running: '#22c55e',
  paused: '#f59e0b', completed: '#8b5cf6', failed: '#ef4444',
};
const STATUS_ICONS: Record<string, string> = {
  draft: '📝', running: '🟢', paused: '⏸', completed: '✅', failed: '❌',
};
const LEAD_STATUS_COLORS: Record<string, string> = {
  pending: '#94a3b8', personalizing: '#3b82f6', ready: '#8b5cf6',
  sent: '#06b6d4', delivered: '#22c55e', read: '#22c55e',
  replied: '#10b981', failed: '#ef4444', skipped: '#f59e0b',
};

type Step = 1 | 2 | 3 | 4;
const STEPS = [
  { n: 1 as Step, label: 'Setup' },
  { n: 2 as Step, label: 'Leads' },
  { n: 3 as Step, label: 'Personalize' },
  { n: 4 as Step, label: 'Launch' },
];

export function AiCampaigns() {
  const qc = useQueryClient();
  const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null);
  const [wizardStep, setWizardStep] = useState<Step>(1);
  const [showWizard, setShowWizard] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [csvInput, setCsvInput] = useState('');
  const [launchResult, setLaunchResult] = useState<{ queued: number; message: string } | null>(null);

  const [form, setForm] = useState({
    name: '', goal: '', sessionId: '',
    employeeId: '',
    messageTemplate: '',
    delayBetweenMessages: 3000, stopOnReply: true,
  });

  const { data: campaigns = [], isLoading } = useQuery<Campaign[]>({
    queryKey: ['ai-campaigns'],
    queryFn: () => apiRequest('/ai-campaigns'),
    refetchInterval: activeCampaign?.status === 'running' ? 3000 : false,
  });
  const { data: sessions = [] } = useQuery<{ id: string }[]>({
    queryKey: ['sessions'], queryFn: () => apiRequest('/sessions'),
  });
  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['ai-employees'], queryFn: () => apiRequest('/ai-employees'),
  });
  const { data: leads = [], refetch: refetchLeads } = useQuery<Lead[]>({
    queryKey: ['campaign-leads', activeCampaign?.id],
    queryFn: () => apiRequest(`/ai-campaigns/${activeCampaign!.id}/leads`),
    enabled: !!activeCampaign,
    refetchInterval: activeCampaign?.status === 'running' ? 2000 : false,
  });
  const { data: analytics } = useQuery<Analytics>({
    queryKey: ['campaign-analytics', activeCampaign?.id],
    queryFn: () => apiRequest(`/ai-campaigns/${activeCampaign!.id}/analytics`),
    enabled: !!activeCampaign && expandedId === activeCampaign.id,
    refetchInterval: activeCampaign?.status === 'running' ? 3000 : false,
  });

  const createMut = useMutation({
    mutationFn: (d: typeof form) => apiRequest<Campaign>('/ai-campaigns', {
      method: 'POST',
      body: JSON.stringify({ ...d, useAiPersonalization: !!d.employeeId }),
    }),
    onSuccess: (created) => {
      void qc.invalidateQueries({ queryKey: ['ai-campaigns'] });
      setActiveCampaign(created);
      setWizardStep(2);
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiRequest(`/ai-campaigns/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['ai-campaigns'] });
      if (activeCampaign) { setActiveCampaign(null); setShowWizard(false); }
    },
  });

  const importMut = useMutation({
    mutationFn: ({ id, leads }: { id: string; leads: { phone: string; name: string }[] }) =>
      apiRequest(`/ai-campaigns/${id}/leads/import`, { method: 'POST', body: JSON.stringify({ leads }) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['ai-campaigns'] });
      void refetchLeads();
      setCsvInput('');
    },
  });

  const personalizeMut = useMutation({
    mutationFn: (id: string) => apiRequest(`/ai-campaigns/${id}/personalize`, { method: 'POST', body: '{}' }),
    onSuccess: () => { void refetchLeads(); void qc.invalidateQueries({ queryKey: ['campaign-analytics'] }); },
  });

  const launchMut = useMutation({
    mutationFn: (id: string) => apiRequest<{ queued: number; message: string; status: string }>(`/ai-campaigns/${id}/launch`, { method: 'POST' }),
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: ['ai-campaigns'] });
      setLaunchResult({ queued: res.queued, message: res.message });
    },
  });

  const pauseMut = useMutation({
    mutationFn: (id: string) => apiRequest(`/ai-campaigns/${id}/pause`, { method: 'POST' }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['ai-campaigns'] }),
  });

  const deleteLead = useMutation({
    mutationFn: ({ cid, lid }: { cid: string; lid: string }) =>
      apiRequest(`/ai-campaigns/${cid}/leads/${lid}`, { method: 'DELETE' }),
    onSuccess: () => { void refetchLeads(); void qc.invalidateQueries({ queryKey: ['ai-campaigns'] }); },
  });

  const parseCSV = () =>
    csvInput.split('\n')
      .map(line => { const [phone, name] = line.split(',').map(s => s.trim()); return { phone: phone || '', name: name || '' }; })
      .filter(l => l.phone);

  const openWizard = () => {
    setForm({ name: '', goal: '', sessionId: '', employeeId: '', messageTemplate: '', delayBetweenMessages: 3000, stopOnReply: true });
    setActiveCampaign(null);
    setWizardStep(1);
    setLaunchResult(null);
    setShowWizard(true);
  };

  const continueWizard = (campaign: Campaign) => {
    setActiveCampaign(campaign);
    setWizardStep(campaign.status === 'paused' ? 4 : 2);
    setLaunchResult(null);
    setShowWizard(true);
  };

  const selectedEmployee = (employees as Employee[]).find(e => e.id === form.employeeId);
  const readyCount = leads.filter(l => l.status === 'ready').length;
  const pendingCount = leads.filter(l => l.status === 'pending').length;
  const canCreate = form.name && form.sessionId && (form.employeeId || form.messageTemplate);

  return (
    <div className="campaigns-page">
      <div className="page-header-row">
        <div>
          <h1 className="page-title"><Send size={22} /> AI Campaigns</h1>
          <p className="page-subtitle">Let your AI employees send personalized WhatsApp campaigns</p>
        </div>
        <button className="btn-primary" onClick={openWizard}><Plus size={16} /> New Campaign</button>
      </div>

      {/* ── WIZARD ── */}
      {showWizard && (
        <div className="wizard-card">
          <div className="wizard-steps">
            {STEPS.map((s, i) => (
              <div key={s.n} className="wizard-step-wrap">
                <div className={`wizard-step ${wizardStep === s.n ? 'active' : wizardStep > s.n ? 'done' : ''}`}>
                  {wizardStep > s.n ? <CheckCircle size={13} /> : <span className="step-num">{s.n}</span>}
                  <span>{s.label}</span>
                </div>
                {i < STEPS.length - 1 && <ArrowRight size={13} className="step-arrow" />}
              </div>
            ))}
          </div>

          {/* ── Step 1: Setup ── */}
          {wizardStep === 1 && (
            <div className="wizard-body">
              <h3>Step 1 — Campaign Setup</h3>

              {/* AI Employee Picker */}
              <div className="section-label"><Bot size={14} /> AI Employee (writes the messages)</div>
              {(employees as Employee[]).length === 0 ? (
                <div className="no-employee-notice">
                  <AlertCircle size={16} />
                  <span>No AI employees found. <a href="/ai-employees">Create one first →</a></span>
                </div>
              ) : (
                <div className="employee-picker">
                  {(employees as Employee[]).map(emp => (
                    <button
                      key={emp.id}
                      className={`emp-pick-card ${form.employeeId === emp.id ? 'selected' : ''}`}
                      onClick={() => setForm(f => ({ ...f, employeeId: emp.id }))}
                    >
                      <span className="emp-avatar">{emp.avatar}</span>
                      <div>
                        <div className="emp-name">{emp.name}</div>
                        <div className="emp-role">{emp.role.replace(/_/g, ' ')}</div>
                      </div>
                      {form.employeeId === emp.id && <CheckCircle size={16} className="emp-check" />}
                    </button>
                  ))}
                </div>
              )}

              {/* Without employee — show template fallback */}
              {!form.employeeId && (
                <div className="template-fallback">
                  <div className="section-label" style={{ marginTop: 4 }}>Or use a message template</div>
                  <textarea className="form-textarea" rows={3}
                    placeholder="Hi {{name}}, I wanted to reach out about..."
                    value={form.messageTemplate} onChange={e => setForm(f => ({ ...f, messageTemplate: e.target.value }))} />
                </div>
              )}

              {selectedEmployee && (
                <div className="employee-selected-note">
                  <CheckCircle size={14} style={{ color: '#22c55e' }} />
                  <span><strong>{selectedEmployee.name}</strong> will write a unique personalized message for each lead using their knowledge base.</span>
                </div>
              )}

              <div className="form-grid" style={{ marginTop: 16 }}>
                <div className="form-group">
                  <label>Campaign Name *</label>
                  <input className="form-input" placeholder="e.g. January Sales Outreach"
                    value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Campaign Goal</label>
                  <input className="form-input" placeholder="e.g. Book a demo call"
                    value={form.goal} onChange={e => setForm(f => ({ ...f, goal: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>WhatsApp Session *</label>
                  <select className="form-select" value={form.sessionId} onChange={e => setForm(f => ({ ...f, sessionId: e.target.value }))}>
                    <option value="">— Select a session —</option>
                    {(sessions as { id: string }[]).map(s => <option key={s.id} value={s.id}>{s.id}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Delay between messages: <strong>{(form.delayBetweenMessages / 1000).toFixed(1)}s</strong></label>
                  <input type="range" min={1000} max={30000} step={500}
                    value={form.delayBetweenMessages} onChange={e => setForm(f => ({ ...f, delayBetweenMessages: parseInt(e.target.value) }))} />
                </div>
                <div className="form-group">
                  <label className="checkbox-label">
                    <input type="checkbox" checked={form.stopOnReply}
                      onChange={e => setForm(f => ({ ...f, stopOnReply: e.target.checked }))} />
                    Stop follow-ups when lead replies
                  </label>
                </div>
              </div>

              <div className="wizard-footer">
                <button className="btn-secondary" onClick={() => setShowWizard(false)}>Cancel</button>
                <button className="btn-primary" disabled={createMut.isPending || !canCreate}
                  onClick={() => createMut.mutate(form)}>
                  {createMut.isPending ? 'Creating...' : <>Next: Add Leads <ArrowRight size={14} /></>}
                </button>
              </div>
            </div>
          )}

          {/* ── Step 2: Import Leads ── */}
          {wizardStep === 2 && activeCampaign && (
            <div className="wizard-body">
              <h3>Step 2 — Import Leads <span className="step-count">{leads.length} loaded</span></h3>
              <div className="import-area">
                <p className="import-hint">Paste leads as CSV: <code>phone,name</code> — one per line (name optional)</p>
                <textarea className="form-textarea" rows={6}
                  placeholder={'919876543210,John Doe\n919123456789,Jane Smith\n911234567890'}
                  value={csvInput} onChange={e => setCsvInput(e.target.value)} />
                <button className="btn-primary" disabled={importMut.isPending || !csvInput.trim()}
                  onClick={() => importMut.mutate({ id: activeCampaign.id, leads: parseCSV() })}>
                  <Upload size={14} /> {importMut.isPending ? 'Importing...' : `Import ${parseCSV().length} Leads`}
                </button>
              </div>

              {leads.length > 0 && (
                <div className="leads-preview">
                  <div className="leads-preview-header">
                    <span><strong>{leads.length}</strong> leads</span>
                    <span style={{ color: '#22c55e' }}>{readyCount} ready</span>
                    <span style={{ color: '#94a3b8' }}>{pendingCount} pending</span>
                  </div>
                  <div className="leads-mini-list">
                    {leads.slice(0, 5).map(l => (
                      <div key={l.id} className="lead-mini-row">
                        <span>{l.name || l.phone}</span>
                        <span className="lead-status" style={{ color: LEAD_STATUS_COLORS[l.status] }}>{l.status}</span>
                        <button className="icon-btn danger" onClick={() => deleteLead.mutate({ cid: activeCampaign.id, lid: l.id })}><Trash2 size={12} /></button>
                      </div>
                    ))}
                    {leads.length > 5 && <div className="leads-more">+{leads.length - 5} more</div>}
                  </div>
                </div>
              )}

              <div className="wizard-footer">
                <button className="btn-secondary" onClick={() => setWizardStep(1)}>← Back</button>
                <button className="btn-primary" disabled={leads.length === 0} onClick={() => setWizardStep(3)}>
                  Next: Personalize <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Personalize ── */}
          {wizardStep === 3 && activeCampaign && (
            <div className="wizard-body">
              <h3>Step 3 — AI Personalization</h3>

              {activeCampaign.employeeId && (
                <div className="employee-context-badge">
                  <Bot size={14} />
                  <span>Using AI Employee knowledge base to craft messages</span>
                </div>
              )}

              <div className="personalize-section">
                <div className="personalize-status">
                  <div className="ps-stat"><div className="ps-val">{leads.length}</div><div className="ps-label">Total</div></div>
                  <div className="ps-stat"><div className="ps-val" style={{ color: '#94a3b8' }}>{pendingCount}</div><div className="ps-label">Pending</div></div>
                  <div className="ps-stat"><div className="ps-val" style={{ color: '#22c55e' }}>{readyCount}</div><div className="ps-label">Ready ✓</div></div>
                </div>

                {pendingCount > 0 ? (
                  <div className="personalize-action">
                    <p>
                      {activeCampaign.employeeId
                        ? 'The AI employee will write a unique message for each lead using their knowledge base, personality, and campaign goal.'
                        : 'AI will personalize your message template for each lead based on their name and info.'}
                    </p>
                    <button className="btn-primary btn-lg" disabled={personalizeMut.isPending}
                      onClick={() => personalizeMut.mutate(activeCampaign.id)}>
                      <Wand2 size={16} />
                      {personalizeMut.isPending ? `Writing ${pendingCount} messages...` : `Generate ${pendingCount} Messages`}
                    </button>
                  </div>
                ) : (
                  <div className="all-ready-badge">
                    <CheckCircle size={24} style={{ color: '#22c55e' }} />
                    <span>All {readyCount} messages are written and ready!</span>
                  </div>
                )}

                {readyCount > 0 && (
                  <div className="leads-preview">
                    <div className="leads-preview-header"><span>Message previews</span></div>
                    {leads.filter(l => l.status === 'ready' && l.personalizedMessage).slice(0, 3).map(l => (
                      <div key={l.id} className="message-preview-card">
                        <div className="mp-name">{l.name || l.phone}</div>
                        <div className="mp-msg">{l.personalizedMessage}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="wizard-footer">
                <button className="btn-secondary" onClick={() => setWizardStep(2)}>← Back</button>
                <button className="btn-primary" disabled={readyCount === 0} onClick={() => { setWizardStep(4); setLaunchResult(null); }}>
                  Next: Launch <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* ── Step 4: Launch ── */}
          {wizardStep === 4 && activeCampaign && (
            <div className="wizard-body">
              <h3>Step 4 — Launch Campaign</h3>

              {!launchResult ? (
                <div className="launch-section">
                  <div className="launch-summary">
                    <div className="ls-row"><span>Campaign</span><strong>{activeCampaign.name}</strong></div>
                    <div className="ls-row"><span>Session</span><strong>{activeCampaign.sessionId}</strong></div>
                    <div className="ls-row"><span>Ready to send</span><strong style={{ color: '#22c55e' }}>{readyCount}</strong></div>
                    <div className="ls-row"><span>Delay between msgs</span><strong>{(activeCampaign.delayBetweenMessages / 1000).toFixed(1)}s</strong></div>
                    <div className="ls-row">
                      <span>Message source</span>
                      <strong>
                        {activeCampaign.employeeId
                          ? `🤖 AI Employee`
                          : '📝 Template'}
                      </strong>
                    </div>
                  </div>

                  {readyCount === 0 && (
                    <div className="launch-warning">
                      <AlertCircle size={16} /> No messages ready. Go back to generate them first.
                    </div>
                  )}

                  <div className="wizard-footer">
                    <button className="btn-secondary" onClick={() => setWizardStep(3)}>← Back</button>
                    <button className="btn-launch" disabled={launchMut.isPending || readyCount === 0}
                      onClick={() => launchMut.mutate(activeCampaign.id)}>
                      <Play size={16} />
                      {launchMut.isPending ? 'Launching...' : `🚀 Launch — Send to ${readyCount} leads`}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="launch-result">
                  <CheckCircle size={48} style={{ color: '#22c55e' }} />
                  <h4>Campaign Launched! 🚀</h4>
                  <p>{launchResult.message}</p>
                  <p className="launch-queued">{launchResult.queued} messages sending</p>
                  <button className="btn-primary" onClick={() => setShowWizard(false)}>View All Campaigns</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── CAMPAIGNS LIST ── */}
      {isLoading ? (
        <div className="loading-state">Loading campaigns...</div>
      ) : campaigns.length === 0 && !showWizard ? (
        <div className="empty-state">
          <Send size={48} />
          <h3>No Campaigns Yet</h3>
          <p>Assign an AI employee, import leads, and launch your first campaign</p>
          <button className="btn-primary" onClick={openWizard}><Plus size={16} /> Create Campaign</button>
        </div>
      ) : (
        <div className="campaigns-list">
          {(campaigns as Campaign[]).map(campaign => {
            const isExpanded = expandedId === campaign.id;
            const isRunning = campaign.status === 'running';
            const emp = (employees as Employee[]).find(e => e.id === campaign.employeeId);
            return (
              <div key={campaign.id} className={`campaign-card ${isRunning ? 'running-pulse' : ''}`}>
                <div className="camp-header">
                  <div className="camp-info">
                    <div className="camp-name-row">
                      <span>{STATUS_ICONS[campaign.status] || '📋'}</span>
                      <h3>{campaign.name}</h3>
                      <span className="status-pill" style={{ background: STATUS_COLORS[campaign.status] }}>{campaign.status}</span>
                    </div>
                    {campaign.goal && <p className="camp-goal">{campaign.goal}</p>}
                    <div className="camp-meta">
                      {emp ? (
                        <span className="emp-badge"><span>{emp.avatar}</span>{emp.name}</span>
                      ) : (
                        <span>📝 Template</span>
                      )}
                      <span>·</span>
                      <span><Users size={11} /> {campaign.totalLeads} leads</span>
                      <span>·</span>
                      <span>Session: {campaign.sessionId}</span>
                    </div>
                  </div>
                  <div className="camp-actions">
                    {(campaign.status === 'draft' || campaign.status === 'paused') && (
                      <button className="btn-launch btn-sm" onClick={() => continueWizard(campaign)}>
                        <Play size={14} /> {campaign.status === 'draft' ? 'Setup & Launch' : 'Resume'}
                      </button>
                    )}
                    {campaign.status === 'running' && (
                      <button className="btn-pause btn-sm" disabled={pauseMut.isPending}
                        onClick={() => pauseMut.mutate(campaign.id)}>
                        <Pause size={14} /> Pause
                      </button>
                    )}
                    <button className="icon-btn" onClick={() => { setActiveCampaign(campaign); setExpandedId(isExpanded ? null : campaign.id); }}>
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    <button className="icon-btn danger" onClick={() => { if (confirm('Delete this campaign and all its leads?')) deleteMut.mutate(campaign.id); }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {campaign.totalLeads > 0 && (
                  <div className="camp-progress">
                    <div className="progress-track">
                      <div className="progress-fill sent"
                        style={{ width: `${(campaign.sent / campaign.totalLeads) * 100}%` }} />
                    </div>
                    <div className="camp-stats-row">
                      <span><Send size={11} /> {campaign.sent} sent</span>
                      <span style={{ color: '#22c55e' }}>✓ {campaign.delivered} delivered</span>
                      <span style={{ color: '#8b5cf6' }}>💬 {campaign.replied} replied</span>
                      <span style={{ color: '#ef4444' }}>✗ {campaign.failed} failed</span>
                    </div>
                  </div>
                )}

                {isExpanded && analytics && (
                  <div className="analytics-panel">
                    <div className="analytics-grid">
                      <div className="an-card"><div className="an-val">{analytics.total}</div><div className="an-label">Total</div></div>
                      <div className="an-card"><div className="an-val" style={{ color: '#8b5cf6' }}>{analytics.ready}</div><div className="an-label">Ready</div></div>
                      <div className="an-card"><div className="an-val" style={{ color: '#06b6d4' }}>{analytics.sent}</div><div className="an-label">Sent</div></div>
                      <div className="an-card"><div className="an-val" style={{ color: '#22c55e' }}>{analytics.deliveryRate}%</div><div className="an-label">Delivery</div></div>
                      <div className="an-card"><div className="an-val" style={{ color: '#8b5cf6' }}>{analytics.replyRate}%</div><div className="an-label">Reply Rate</div></div>
                      <div className="an-card"><div className="an-val" style={{ color: '#ef4444' }}>{analytics.failed}</div><div className="an-label">Failed</div></div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
