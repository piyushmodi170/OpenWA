import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Users, Send, BarChart2, Upload, Wand2, ChevronDown, ChevronUp, Play, Pause } from 'lucide-react';
import { apiRequest } from '../services/api';
import './AiCampaigns.css';

interface Campaign { id: string; name: string; goal: string; sessionId: string; status: string; messageTemplate: string; useAiPersonalization: boolean; aiProvider: string; aiModel: string; totalLeads: number; sent: number; delivered: number; replied: number; failed: number; delayBetweenMessages: number; stopOnReply: boolean; createdAt: string; }
interface Lead { id: string; phone: string; name: string; personalizedMessage: string; status: string; createdAt: string; }
interface Analytics { total: number; sent: number; delivered: number; replied: number; failed: number; pending: number; ready: number; deliveryRate: number; replyRate: number; }

const STATUS_COLORS: Record<string, string> = { draft: '#94a3b8', scheduled: '#3b82f6', running: '#22c55e', paused: '#f59e0b', completed: '#8b5cf6', failed: '#ef4444' };
const LEAD_STATUS_COLORS: Record<string, string> = { pending: '#94a3b8', personalizing: '#3b82f6', ready: '#8b5cf6', sent: '#06b6d4', delivered: '#22c55e', read: '#22c55e', replied: '#10b981', failed: '#ef4444', skipped: '#f59e0b' };

export function AiCampaigns() {
  const qc = useQueryClient();
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showLeads, setShowLeads] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [csvInput, setCsvInput] = useState('');
  const [showImport, setShowImport] = useState(false);

  const [form, setForm] = useState({
    name: '', goal: '', sessionId: '*', messageTemplate: '',
    useAiPersonalization: true, aiProvider: 'openai', aiModel: 'gpt-4o-mini',
    delayBetweenMessages: 3000, stopOnReply: true, followUpSequence: '[]',
  });

  const { data: campaigns = [], isLoading } = useQuery<Campaign[]>({ queryKey: ['ai-campaigns'], queryFn: () => apiRequest('/ai-campaigns') });
  const { data: sessions = [] } = useQuery<{ id: string }[]>({ queryKey: ['sessions'], queryFn: () => apiRequest('/sessions') });
  const { data: leads = [] } = useQuery<Lead[]>({ queryKey: ['campaign-leads', selectedCampaign?.id], queryFn: () => apiRequest(`/ai-campaigns/${selectedCampaign!.id}/leads`), enabled: !!selectedCampaign && showLeads });
  const { data: analytics } = useQuery<Analytics>({ queryKey: ['campaign-analytics', selectedCampaign?.id], queryFn: () => apiRequest(`/ai-campaigns/${selectedCampaign!.id}/analytics`), enabled: !!selectedCampaign && showAnalytics });

  const createMut = useMutation({ mutationFn: (d: typeof form) => apiRequest('/ai-campaigns', { method: 'POST', body: JSON.stringify(d) }), onSuccess: () => { void qc.invalidateQueries({ queryKey: ['ai-campaigns'] }); setShowCreateForm(false); setForm({ name: '', goal: '', sessionId: '*', messageTemplate: '', useAiPersonalization: true, aiProvider: 'openai', aiModel: 'gpt-4o-mini', delayBetweenMessages: 3000, stopOnReply: true, followUpSequence: '[]' }); } });
  const deleteMut = useMutation({ mutationFn: (id: string) => apiRequest(`/ai-campaigns/${id}`, { method: 'DELETE' }), onSuccess: () => { void qc.invalidateQueries({ queryKey: ['ai-campaigns'] }); if (selectedCampaign) setSelectedCampaign(null); } });
  const importMut = useMutation({
    mutationFn: ({ id, leads }: { id: string; leads: { phone: string; name: string }[] }) =>
      apiRequest(`/ai-campaigns/${id}/leads/import`, { method: 'POST', body: JSON.stringify({ leads }) }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['ai-campaigns'] }); void qc.invalidateQueries({ queryKey: ['campaign-leads'] }); setCsvInput(''); setShowImport(false); },
  });
  const personalizeMut = useMutation({ mutationFn: (id: string) => apiRequest(`/ai-campaigns/${id}/personalize`, { method: 'POST', body: '{}' }), onSuccess: () => { void qc.invalidateQueries({ queryKey: ['campaign-leads'] }); void qc.invalidateQueries({ queryKey: ['campaign-analytics'] }); } });
  const deleteLead = useMutation({ mutationFn: ({ cid, lid }: { cid: string; lid: string }) => apiRequest(`/ai-campaigns/${cid}/leads/${lid}`, { method: 'DELETE' }), onSuccess: () => { void qc.invalidateQueries({ queryKey: ['campaign-leads'] }); void qc.invalidateQueries({ queryKey: ['ai-campaigns'] }); } });

  const parseCSV = () => {
    return csvInput.split('\n').map(line => {
      const [phone, name] = line.split(',').map(s => s.trim());
      return { phone: phone || '', name: name || '' };
    }).filter(l => l.phone);
  };

  return (
    <div className="campaigns-page">
      <div className="page-header-row">
        <div>
          <h1 className="page-title"><Send size={24} /> AI Campaigns</h1>
          <p className="page-subtitle">Send AI-personalized bulk campaigns with smart follow-up sequences</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreateForm(!showCreateForm)}><Plus size={16} /> New Campaign</button>
      </div>

      {showCreateForm && (
        <div className="campaign-form-card">
          <h3>Create Campaign</h3>
          <div className="form-grid">
            <div className="form-group"><label>Campaign Name *</label><input className="form-input" placeholder="e.g. January Outreach" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="form-group"><label>Goal</label><input className="form-input" placeholder="e.g. Book a demo call" value={form.goal} onChange={e => setForm(f => ({ ...f, goal: e.target.value }))} /></div>
            <div className="form-group"><label>Session (WhatsApp number)</label><select className="form-select" value={form.sessionId} onChange={e => setForm(f => ({ ...f, sessionId: e.target.value }))}><option value="*">* Any available</option>{(sessions as { id: string }[]).map(s => <option key={s.id} value={s.id}>{s.id}</option>)}</select></div>
            <div className="form-group"><label>AI Provider</label><select className="form-select" value={form.aiProvider} onChange={e => setForm(f => ({ ...f, aiProvider: e.target.value }))}><option value="openai">OpenAI</option><option value="gemini">Gemini</option></select></div>
            <div className="form-group full-width"><label>Message Template *<span className="hint-text"> Use {'{{name}}'} for lead name</span></label><textarea className="form-textarea" rows={4} placeholder="Hi {{name}}, I wanted to reach out about..." value={form.messageTemplate} onChange={e => setForm(f => ({ ...f, messageTemplate: e.target.value }))} /></div>
            <div className="form-group"><label className="checkbox-label"><input type="checkbox" checked={form.useAiPersonalization} onChange={e => setForm(f => ({ ...f, useAiPersonalization: e.target.checked }))} /> Use AI to personalize each message</label></div>
            <div className="form-group"><label className="checkbox-label"><input type="checkbox" checked={form.stopOnReply} onChange={e => setForm(f => ({ ...f, stopOnReply: e.target.checked }))} /> Stop follow-ups when lead replies</label></div>
            <div className="form-group"><label>Delay Between Messages (ms): {form.delayBetweenMessages}</label><input type="range" min={1000} max={30000} step={500} value={form.delayBetweenMessages} onChange={e => setForm(f => ({ ...f, delayBetweenMessages: parseInt(e.target.value) }))} /></div>
          </div>
          <div className="form-actions">
            <button className="btn-secondary" onClick={() => setShowCreateForm(false)}>Cancel</button>
            <button className="btn-primary" onClick={() => createMut.mutate(form)} disabled={createMut.isPending || !form.name || !form.messageTemplate}>{createMut.isPending ? 'Creating...' : 'Create Campaign'}</button>
          </div>
        </div>
      )}

      {isLoading ? <div className="loading-state">Loading campaigns...</div> : campaigns.length === 0 ? (
        <div className="empty-state"><Send size={48} /><h3>No Campaigns Yet</h3><p>Create your first AI-powered campaign to reach your leads</p><button className="btn-primary" onClick={() => setShowCreateForm(true)}><Plus size={16} /> Create Campaign</button></div>
      ) : (
        <div className="campaigns-list">
          {campaigns.map(campaign => (
            <div key={campaign.id} className={`campaign-card ${selectedCampaign?.id === campaign.id ? 'selected' : ''}`}>
              <div className="camp-header">
                <div className="camp-info">
                  <h3>{campaign.name}</h3>
                  {campaign.goal && <p className="camp-goal">{campaign.goal}</p>}
                  <div className="camp-meta">
                    <span className="status-badge" style={{ background: STATUS_COLORS[campaign.status] }}>{campaign.status}</span>
                    <span><Users size={12} /> {campaign.totalLeads} leads</span>
                    <span>{campaign.aiProvider} · {campaign.aiModel}</span>
                    {campaign.useAiPersonalization && <span className="ai-badge"><Wand2 size={12} /> AI Personalized</span>}
                  </div>
                </div>
                <div className="camp-actions">
                  <button className="btn-secondary btn-sm" onClick={() => { setSelectedCampaign(campaign); setShowLeads(!showLeads || selectedCampaign?.id !== campaign.id); setShowAnalytics(false); }}><Users size={14} /> Leads</button>
                  <button className="btn-secondary btn-sm" onClick={() => { setSelectedCampaign(campaign); setShowAnalytics(!showAnalytics || selectedCampaign?.id !== campaign.id); setShowLeads(false); }}><BarChart2 size={14} /> Analytics</button>
                  <button className="icon-btn danger" onClick={() => { if (confirm('Delete this campaign?')) deleteMut.mutate(campaign.id); }}><Trash2 size={16} /></button>
                </div>
              </div>

              <div className="camp-progress-row">
                <div className="camp-stat"><Send size={12} /> Sent: {campaign.sent}</div>
                <div className="camp-stat" style={{ color: '#22c55e' }}>✓ Delivered: {campaign.delivered}</div>
                <div className="camp-stat" style={{ color: '#8b5cf6' }}>💬 Replied: {campaign.replied}</div>
                <div className="camp-stat" style={{ color: '#ef4444' }}>✗ Failed: {campaign.failed}</div>
              </div>

              {selectedCampaign?.id === campaign.id && showLeads && (
                <div className="leads-section">
                  <div className="leads-toolbar">
                    <h4><Users size={14} /> Leads ({leads.length})</h4>
                    <button className="btn-secondary btn-sm" onClick={() => setShowImport(!showImport)}><Upload size={14} /> Import CSV</button>
                    {leads.some(l => l.status === 'pending') && (
                      <button className="btn-primary btn-sm" onClick={() => personalizeMut.mutate(campaign.id)} disabled={personalizeMut.isPending}>
                        <Wand2 size={14} /> {personalizeMut.isPending ? 'Personalizing...' : 'AI Personalize All'}
                      </button>
                    )}
                  </div>
                  {showImport && (
                    <div className="import-section">
                      <p className="import-hint">Paste CSV data: <code>phone,name</code> (one per line)</p>
                      <textarea className="form-textarea" rows={5} placeholder="919876543210,John Doe&#10;919123456789,Jane Smith" value={csvInput} onChange={e => setCsvInput(e.target.value)} />
                      <div className="form-actions">
                        <button className="btn-secondary" onClick={() => setShowImport(false)}>Cancel</button>
                        <button className="btn-primary" onClick={() => importMut.mutate({ id: campaign.id, leads: parseCSV() })} disabled={importMut.isPending || !csvInput.trim()}>
                          <Upload size={14} /> {importMut.isPending ? 'Importing...' : `Import ${parseCSV().length} Leads`}
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="leads-table">
                    {leads.length === 0 ? <div className="empty-tab">No leads yet. Import some to get started.</div> : leads.map(lead => (
                      <div key={lead.id} className="lead-row">
                        <div className="lead-info">
                          <strong>{lead.name || lead.phone}</strong>
                          {lead.name && <span className="lead-phone">{lead.phone}</span>}
                        </div>
                        <span className="lead-status" style={{ color: LEAD_STATUS_COLORS[lead.status] }}>{lead.status}</span>
                        {lead.personalizedMessage && <span className="lead-msg-preview">{lead.personalizedMessage.slice(0, 60)}...</span>}
                        <button className="icon-btn danger" onClick={() => deleteLead.mutate({ cid: campaign.id, lid: lead.id })}><Trash2 size={12} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedCampaign?.id === campaign.id && showAnalytics && analytics && (
                <div className="analytics-section">
                  <h4><BarChart2 size={14} /> Campaign Analytics</h4>
                  <div className="analytics-grid">
                    <div className="an-card"><div className="an-val">{analytics.total}</div><div className="an-label">Total Leads</div></div>
                    <div className="an-card"><div className="an-val">{analytics.ready}</div><div className="an-label">Ready to Send</div></div>
                    <div className="an-card"><div className="an-val">{analytics.sent}</div><div className="an-label">Sent</div></div>
                    <div className="an-card" style={{ '--card-color': '#22c55e' } as React.CSSProperties}><div className="an-val" style={{ color: '#22c55e' }}>{analytics.deliveryRate}%</div><div className="an-label">Delivery Rate</div></div>
                    <div className="an-card" style={{ '--card-color': '#8b5cf6' } as React.CSSProperties}><div className="an-val" style={{ color: '#8b5cf6' }}>{analytics.replyRate}%</div><div className="an-label">Reply Rate</div></div>
                    <div className="an-card"><div className="an-val" style={{ color: '#ef4444' }}>{analytics.failed}</div><div className="an-label">Failed</div></div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
