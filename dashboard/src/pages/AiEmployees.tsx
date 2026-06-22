import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Users, Bot, Target, ToggleLeft, ToggleRight, ChevronDown, ChevronUp } from 'lucide-react';
import { apiRequest } from '../services/api';
import './AiEmployees.css';

const ROLE_LABELS: Record<string, string> = {
  sales_rep: '💼 Sales Representative',
  support_agent: '🎧 Support Agent',
  appointment_setter: '📅 Appointment Setter',
  follow_up_manager: '🔁 Follow-up Manager',
  marketing_assistant: '📣 Marketing Assistant',
  research_assistant: '🔍 Research Assistant',
  custom: '⚙️ Custom',
};

const TONE_OPTIONS = ['friendly', 'professional', 'formal', 'casual', 'empathetic'];
const PROVIDER_OPTIONS = ['openai', 'gemini'];
const MODEL_OPTIONS: Record<string, string[]> = {
  openai: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  gemini: ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'],
};

const AVATARS = ['🤖', '👩‍💼', '👨‍💼', '🧑‍💻', '👩‍🔬', '👨‍🎓', '🦾', '🧠', '⚡', '🎯', '🌟', '💡'];

interface Employee {
  id: string;
  name: string;
  avatar: string;
  role: string;
  roleDescription: string;
  goals: string;
  personality: string;
  tone: string;
  responseLanguage: string;
  aiProvider: string;
  model: string;
  maxTokens: number;
  allowedTopics: string;
  blockedTopics: string;
  kpis: string;
  sessionId: string;
  enabled: boolean;
  totalConversations: number;
  totalMessages: number;
  createdAt: string;
}

const defaultForm = {
  name: '', avatar: '🤖', role: 'support_agent', roleDescription: '',
  goals: '[]', personality: '', tone: 'friendly', responseLanguage: 'auto',
  systemPrompt: '', aiProvider: 'openai', model: 'gpt-4o-mini',
  maxTokens: 600, allowedTopics: '[]', blockedTopics: '[]', kpis: '[]',
  sessionId: '*', enabled: true,
};

export function AiEmployees() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...defaultForm });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [goalsInput, setGoalsInput] = useState('');
  const [kpisInput, setKpisInput] = useState('');
  const [allowedInput, setAllowedInput] = useState('');
  const [blockedInput, setBlockedInput] = useState('');

  const { data: employees = [], isLoading } = useQuery<Employee[]>({
    queryKey: ['ai-employees'],
    queryFn: () => apiRequest('/ai-employees'),
  });

  const createMut = useMutation({
    mutationFn: (data: typeof defaultForm) => apiRequest('/ai-employees', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['ai-employees'] }); resetForm(); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<typeof defaultForm> }) =>
      apiRequest(`/ai-employees/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['ai-employees'] }); resetForm(); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiRequest(`/ai-employees/${id}`, { method: 'DELETE' }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['ai-employees'] }),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      apiRequest(`/ai-employees/${id}`, { method: 'PUT', body: JSON.stringify({ enabled }) }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['ai-employees'] }),
  });

  const resetForm = () => {
    setForm({ ...defaultForm });
    setEditId(null);
    setShowForm(false);
    setGoalsInput('');
    setKpisInput('');
    setAllowedInput('');
    setBlockedInput('');
  };

  const startEdit = (emp: Employee) => {
    setForm({
      name: emp.name, avatar: emp.avatar, role: emp.role,
      roleDescription: emp.roleDescription, goals: emp.goals,
      personality: emp.personality, tone: emp.tone,
      responseLanguage: emp.responseLanguage, systemPrompt: '',
      aiProvider: emp.aiProvider, model: emp.model,
      maxTokens: emp.maxTokens, allowedTopics: emp.allowedTopics,
      blockedTopics: emp.blockedTopics, kpis: emp.kpis,
      sessionId: emp.sessionId, enabled: emp.enabled,
    });
    setGoalsInput(parseList(emp.goals).join(', '));
    setKpisInput(parseList(emp.kpis).join(', '));
    setAllowedInput(parseList(emp.allowedTopics).join(', '));
    setBlockedInput(parseList(emp.blockedTopics).join(', '));
    setEditId(emp.id);
    setShowForm(true);
  };

  const parseList = (s: string) => { try { return JSON.parse(s) as string[]; } catch { return []; } };
  const toJsonList = (s: string) => JSON.stringify(s.split(',').map(x => x.trim()).filter(Boolean));

  const handleSubmit = () => {
    const payload = {
      ...form,
      goals: toJsonList(goalsInput),
      kpis: toJsonList(kpisInput),
      allowedTopics: toJsonList(allowedInput),
      blockedTopics: toJsonList(blockedInput),
    };
    if (editId) {
      updateMut.mutate({ id: editId, data: payload });
    } else {
      createMut.mutate(payload);
    }
  };

  const isBusy = createMut.isPending || updateMut.isPending;

  return (
    <div className="ai-employees-page">
      <div className="page-header-row">
        <div>
          <h1 className="page-title"><Users size={24} /> AI Employees</h1>
          <p className="page-subtitle">Create named AI agents with roles, goals, and specialized knowledge</p>
        </div>
        <button className="btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus size={16} /> New Employee
        </button>
      </div>

      {showForm && (
        <div className="emp-form-card">
          <h3>{editId ? 'Edit AI Employee' : 'Create AI Employee'}</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Avatar</label>
              <div className="avatar-picker">
                {AVATARS.map(a => (
                  <button key={a} className={`avatar-btn ${form.avatar === a ? 'selected' : ''}`}
                    onClick={() => setForm(f => ({ ...f, avatar: a }))}>{a}</button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label>Name *</label>
              <input className="form-input" placeholder="e.g. Sarah — Sales Rep"
                value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Role</label>
              <select className="form-select" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                {Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Role Description</label>
              <input className="form-input" placeholder="Brief description of what this employee does"
                value={form.roleDescription} onChange={e => setForm(f => ({ ...f, roleDescription: e.target.value }))} />
            </div>
            <div className="form-group full-width">
              <label>Goals (comma-separated)</label>
              <input className="form-input" placeholder="Qualify leads, Schedule demos, Close deals"
                value={goalsInput} onChange={e => setGoalsInput(e.target.value)} />
            </div>
            <div className="form-group full-width">
              <label>Personality</label>
              <textarea className="form-textarea" rows={2} placeholder="Describe the personality traits..."
                value={form.personality} onChange={e => setForm(f => ({ ...f, personality: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Tone</label>
              <select className="form-select" value={form.tone} onChange={e => setForm(f => ({ ...f, tone: e.target.value }))}>
                {TONE_OPTIONS.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Language</label>
              <input className="form-input" placeholder="auto, English, Hindi, Hinglish..."
                value={form.responseLanguage} onChange={e => setForm(f => ({ ...f, responseLanguage: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>AI Provider</label>
              <select className="form-select" value={form.aiProvider}
                onChange={e => setForm(f => ({ ...f, aiProvider: e.target.value, model: MODEL_OPTIONS[e.target.value]?.[0] || 'gpt-4o-mini' }))}>
                {PROVIDER_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Model</label>
              <select className="form-select" value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))}>
                {(MODEL_OPTIONS[form.aiProvider] || []).map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Allowed Topics (comma-separated)</label>
              <input className="form-input" placeholder="pricing, demos, support..."
                value={allowedInput} onChange={e => setAllowedInput(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Blocked Topics (comma-separated)</label>
              <input className="form-input" placeholder="competitors, refunds..."
                value={blockedInput} onChange={e => setBlockedInput(e.target.value)} />
            </div>
            <div className="form-group full-width">
              <label>KPIs (comma-separated)</label>
              <input className="form-input" placeholder="Response rate, Conversion rate, CSAT score"
                value={kpisInput} onChange={e => setKpisInput(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Session ID</label>
              <input className="form-input" placeholder="* for all sessions"
                value={form.sessionId} onChange={e => setForm(f => ({ ...f, sessionId: e.target.value }))} />
            </div>
          </div>
          <div className="form-actions">
            <button className="btn-secondary" onClick={resetForm}>Cancel</button>
            <button className="btn-primary" onClick={handleSubmit} disabled={isBusy || !form.name}>
              {isBusy ? 'Saving...' : editId ? 'Update Employee' : 'Create Employee'}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="loading-state">Loading AI employees...</div>
      ) : employees.length === 0 ? (
        <div className="empty-state">
          <Bot size={48} />
          <h3>No AI Employees Yet</h3>
          <p>Create your first AI employee to get started</p>
          <button className="btn-primary" onClick={() => setShowForm(true)}><Plus size={16} /> Create Employee</button>
        </div>
      ) : (
        <div className="employees-grid">
          {employees.map(emp => (
            <div key={emp.id} className={`employee-card ${!emp.enabled ? 'disabled' : ''}`}>
              <div className="emp-header">
                <div className="emp-avatar">{emp.avatar}</div>
                <div className="emp-info">
                  <h3>{emp.name}</h3>
                  <span className="emp-role-badge">{ROLE_LABELS[emp.role] || emp.role}</span>
                </div>
                <div className="emp-actions">
                  <button className="icon-btn" title={emp.enabled ? 'Disable' : 'Enable'}
                    onClick={() => toggleMut.mutate({ id: emp.id, enabled: !emp.enabled })}>
                    {emp.enabled ? <ToggleRight size={20} className="toggle-on" /> : <ToggleLeft size={20} />}
                  </button>
                  <button className="icon-btn" onClick={() => startEdit(emp)}><Pencil size={16} /></button>
                  <button className="icon-btn danger" onClick={() => { if (confirm('Delete this employee?')) deleteMut.mutate(emp.id); }}><Trash2 size={16} /></button>
                </div>
              </div>
              {emp.roleDescription && <p className="emp-description">{emp.roleDescription}</p>}
              <div className="emp-stats">
                <span><Bot size={12} /> {emp.totalMessages} msgs</span>
                <span><Target size={12} /> {emp.totalConversations} chats</span>
                <span className="emp-provider">{emp.aiProvider} · {emp.model}</span>
              </div>
              {parseList(emp.goals).length > 0 && (
                <div className="emp-goals">
                  {parseList(emp.goals).slice(0, 2).map((g, i) => <span key={i} className="goal-tag">{g}</span>)}
                  {parseList(emp.goals).length > 2 && <span className="goal-tag more">+{parseList(emp.goals).length - 2}</span>}
                </div>
              )}
              <button className="expand-btn" onClick={() => setExpandedId(expandedId === emp.id ? null : emp.id)}>
                {expandedId === emp.id ? <><ChevronUp size={14} /> Less</> : <><ChevronDown size={14} /> Details</>}
              </button>
              {expandedId === emp.id && (
                <div className="emp-details">
                  <div><strong>Tone:</strong> {emp.tone}</div>
                  <div><strong>Language:</strong> {emp.responseLanguage}</div>
                  <div><strong>Session:</strong> {emp.sessionId}</div>
                  {parseList(emp.allowedTopics).length > 0 && <div><strong>Allowed:</strong> {parseList(emp.allowedTopics).join(', ')}</div>}
                  {parseList(emp.blockedTopics).length > 0 && <div><strong>Blocked:</strong> {parseList(emp.blockedTopics).join(', ')}</div>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
