import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, BookOpen, Lightbulb, Shield, TrendingUp, ChevronDown, ChevronUp, Link, FileText, Upload } from 'lucide-react';
import { apiRequest } from '../services/api';
import './AiTraining.css';

interface KnowledgeDoc { id: string; title: string; content: string; type: string; source: string; wordCount: number; qualityScore: number; enabled: boolean; createdAt: string; }
interface TrainingExample { id: string; trigger: string; response: string; category: string; priority: number; enabled: boolean; }
interface TrainingRule { id: string; rule: string; type: string; enabled: boolean; }
interface TrainingStats { documentCount: number; wordCount: number; averageQualityScore: number; exampleCount: number; ruleCount: number; overallScore: number; }

const DOC_TYPES = ['text', 'faq', 'chat_history', 'sop', 'product_catalog', 'sales_script', 'policy', 'custom'];
const RULE_TYPES = ['never', 'always', 'conditional'];

export function AiTraining() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<'knowledge' | 'examples' | 'rules'>('knowledge');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);

  // Knowledge form — three modes: text, url, file
  const [docMode, setDocMode] = useState<'text' | 'url' | 'file'>('text');
  const [docForm, setDocForm] = useState({ title: '', content: '', type: 'text', source: '' });
  const [urlForm, setUrlForm] = useState({ url: '', title: '' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [exForm, setExForm] = useState({ trigger: '', response: '', category: 'general', priority: 5 });
  const [ruleForm, setRuleForm] = useState({ rule: '', type: 'never' });
  const [showDocForm, setShowDocForm] = useState(false);
  const [showExForm, setShowExForm] = useState(false);
  const [showRuleForm, setShowRuleForm] = useState(false);

  const eid = employeeFilter || undefined;

  const { data: docs = [] } = useQuery<KnowledgeDoc[]>({ queryKey: ['training-docs', eid], queryFn: () => apiRequest(`/ai-training/documents${eid ? `?employeeId=${eid}` : ''}`) });
  const { data: examples = [] } = useQuery<TrainingExample[]>({ queryKey: ['training-examples', eid], queryFn: () => apiRequest(`/ai-training/examples${eid ? `?employeeId=${eid}` : ''}`) });
  const { data: rules = [] } = useQuery<TrainingRule[]>({ queryKey: ['training-rules', eid], queryFn: () => apiRequest(`/ai-training/rules${eid ? `?employeeId=${eid}` : ''}`) });
  const { data: stats } = useQuery<TrainingStats>({ queryKey: ['training-stats', eid], queryFn: () => apiRequest(`/ai-training/stats${eid ? `?employeeId=${eid}` : ''}`) });
  const { data: employees = [] } = useQuery<{ id: string; name: string; avatar: string }[]>({ queryKey: ['ai-employees'], queryFn: () => apiRequest('/ai-employees') });

  const createDoc = useMutation({
    mutationFn: (d: typeof docForm) => apiRequest('/ai-training/documents', { method: 'POST', body: JSON.stringify({ ...d, employeeId: eid || null }) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['training-docs'] });
      void qc.invalidateQueries({ queryKey: ['training-stats'] });
      setDocForm({ title: '', content: '', type: 'text', source: '' });
      setShowDocForm(false);
    },
  });

  const fetchUrlMut = useMutation({
    mutationFn: (d: { url: string; title?: string; employeeId?: string }) =>
      apiRequest('/ai-training/documents/fetch-url', { method: 'POST', body: JSON.stringify(d) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['training-docs'] });
      void qc.invalidateQueries({ queryKey: ['training-stats'] });
      setUrlForm({ url: '', title: '' });
      setShowDocForm(false);
    },
  });

  const uploadFileMut = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append('file', file);
      const url = `/api/ai-training/documents/upload${eid ? `?employeeId=${eid}` : ''}`;
      const token = localStorage.getItem('apiKey') || '';
      const res = await fetch(url, { method: 'POST', headers: { 'x-api-key': token }, body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText })) as { message?: string };
        throw new Error(err.message || 'Upload failed');
      }
      return res.json();
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['training-docs'] });
      void qc.invalidateQueries({ queryKey: ['training-stats'] });
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setShowDocForm(false);
    },
  });

  const deleteDoc = useMutation({ mutationFn: (id: string) => apiRequest(`/ai-training/documents/${id}`, { method: 'DELETE' }), onSuccess: () => { void qc.invalidateQueries({ queryKey: ['training-docs'] }); void qc.invalidateQueries({ queryKey: ['training-stats'] }); } });
  const toggleDoc = useMutation({ mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => apiRequest(`/ai-training/documents/${id}`, { method: 'PUT', body: JSON.stringify({ enabled }) }), onSuccess: () => void qc.invalidateQueries({ queryKey: ['training-docs'] }) });

  const createEx = useMutation({ mutationFn: (d: typeof exForm) => apiRequest('/ai-training/examples', { method: 'POST', body: JSON.stringify({ ...d, employeeId: eid || null }) }), onSuccess: () => { void qc.invalidateQueries({ queryKey: ['training-examples'] }); void qc.invalidateQueries({ queryKey: ['training-stats'] }); setExForm({ trigger: '', response: '', category: 'general', priority: 5 }); setShowExForm(false); } });
  const deleteEx = useMutation({ mutationFn: (id: string) => apiRequest(`/ai-training/examples/${id}`, { method: 'DELETE' }), onSuccess: () => void qc.invalidateQueries({ queryKey: ['training-examples'] }) });

  const createRule = useMutation({ mutationFn: (d: typeof ruleForm) => apiRequest('/ai-training/rules', { method: 'POST', body: JSON.stringify({ ...d, employeeId: eid || null }) }), onSuccess: () => { void qc.invalidateQueries({ queryKey: ['training-rules'] }); void qc.invalidateQueries({ queryKey: ['training-stats'] }); setRuleForm({ rule: '', type: 'never' }); setShowRuleForm(false); } });
  const deleteRule = useMutation({ mutationFn: (id: string) => apiRequest(`/ai-training/rules/${id}`, { method: 'DELETE' }), onSuccess: () => void qc.invalidateQueries({ queryKey: ['training-rules'] }) });

  const scoreColor = (s: number) => s >= 80 ? '#22c55e' : s >= 50 ? '#f59e0b' : '#ef4444';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setSelectedFile(f);
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) setSelectedFile(f);
  };

  return (
    <div className="ai-training-page">
      <div className="page-header-row">
        <div>
          <h1 className="page-title"><BookOpen size={24} /> AI Training Studio</h1>
          <p className="page-subtitle">Train your AI employees with knowledge, examples, and rules</p>
        </div>
        <select className="form-select emp-filter" value={employeeFilter} onChange={e => setEmployeeFilter(e.target.value)}>
          <option value="">🌐 Global (all employees)</option>
          {(employees as { id: string; name: string; avatar: string }[]).map(e => <option key={e.id} value={e.id}>{e.avatar} {e.name}</option>)}
        </select>
      </div>

      {stats && (
        <div className="training-stats-bar">
          <div className="stat-card">
            <div className="stat-score" style={{ color: scoreColor(stats.overallScore) }}>{stats.overallScore}</div>
            <div className="stat-label">Training Score</div>
          </div>
          <div className="stat-card">
            <div className="stat-val">{stats.documentCount}</div>
            <div className="stat-label">Documents</div>
          </div>
          <div className="stat-card">
            <div className="stat-val">{stats.wordCount.toLocaleString()}</div>
            <div className="stat-label">Words</div>
          </div>
          <div className="stat-card">
            <div className="stat-val">{stats.exampleCount}</div>
            <div className="stat-label">Examples</div>
          </div>
          <div className="stat-card">
            <div className="stat-val">{stats.ruleCount}</div>
            <div className="stat-label">Rules</div>
          </div>
          <div className="stat-progress-bar">
            <div className="stat-progress-label"><TrendingUp size={14} /> Knowledge Quality</div>
            <div className="progress-track"><div className="progress-fill" style={{ width: `${stats.overallScore}%`, background: scoreColor(stats.overallScore) }} /></div>
            <span>{stats.overallScore}%</span>
          </div>
        </div>
      )}

      <div className="tab-bar">
        <button className={`tab-btn ${activeTab === 'knowledge' ? 'active' : ''}`} onClick={() => setActiveTab('knowledge')}><BookOpen size={16} /> Knowledge Base ({docs.length})</button>
        <button className={`tab-btn ${activeTab === 'examples' ? 'active' : ''}`} onClick={() => setActiveTab('examples')}><Lightbulb size={16} /> Training Examples ({examples.length})</button>
        <button className={`tab-btn ${activeTab === 'rules' ? 'active' : ''}`} onClick={() => setActiveTab('rules')}><Shield size={16} /> Rules ({rules.length})</button>
      </div>

      {activeTab === 'knowledge' && (
        <div className="tab-content">
          <div className="tab-actions">
            <button className="btn-primary" onClick={() => { setShowDocForm(!showDocForm); setDocMode('text'); }}>
              <FileText size={16} /> Add Text
            </button>
            <button className="btn-secondary" onClick={() => { setShowDocForm(!showDocForm); setDocMode('url'); }}>
              <Link size={16} /> Add URL
            </button>
            <button className="btn-secondary" onClick={() => { setShowDocForm(!showDocForm); setDocMode('file'); }}>
              <Upload size={16} /> Upload File
            </button>
          </div>

          {showDocForm && (
            <div className="mini-form">
              <div className="doc-mode-toggle">
                <button className={`mode-tab ${docMode === 'text' ? 'active' : ''}`} onClick={() => setDocMode('text')}>
                  <FileText size={14} /> Paste Text
                </button>
                <button className={`mode-tab ${docMode === 'url' ? 'active' : ''}`} onClick={() => setDocMode('url')}>
                  <Link size={14} /> From URL
                </button>
                <button className={`mode-tab ${docMode === 'file' ? 'active' : ''}`} onClick={() => setDocMode('file')}>
                  <Upload size={14} /> Upload File
                </button>
              </div>

              {docMode === 'text' ? (
                <>
                  <input className="form-input" placeholder="Title" value={docForm.title} onChange={e => setDocForm(f => ({ ...f, title: e.target.value }))} />
                  <div className="form-row">
                    <select className="form-select" value={docForm.type} onChange={e => setDocForm(f => ({ ...f, type: e.target.value }))}>
                      {DOC_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                    </select>
                    <input className="form-input" placeholder="Source (optional)" value={docForm.source} onChange={e => setDocForm(f => ({ ...f, source: e.target.value }))} />
                  </div>
                  <textarea className="form-textarea" rows={6} placeholder="Paste your knowledge content here — FAQs, product info, company policies..." value={docForm.content} onChange={e => setDocForm(f => ({ ...f, content: e.target.value }))} />
                  <div className="form-actions">
                    <button className="btn-secondary" onClick={() => setShowDocForm(false)}>Cancel</button>
                    <button className="btn-primary" onClick={() => createDoc.mutate(docForm)} disabled={createDoc.isPending || !docForm.title || !docForm.content}>
                      {createDoc.isPending ? 'Saving...' : 'Save Document'}
                    </button>
                  </div>
                </>
              ) : docMode === 'url' ? (
                <>
                  <div className="url-fetch-hint">
                    <Link size={14} />
                    <span>Enter any webpage URL — the content will be automatically extracted and saved as a knowledge document.</span>
                  </div>
                  <input
                    className="form-input"
                    placeholder="https://yourwebsite.com/about"
                    value={urlForm.url}
                    onChange={e => setUrlForm(f => ({ ...f, url: e.target.value }))}
                  />
                  <input
                    className="form-input"
                    placeholder="Title (optional — auto-detected from page)"
                    value={urlForm.title}
                    onChange={e => setUrlForm(f => ({ ...f, title: e.target.value }))}
                  />
                  {fetchUrlMut.isError && (
                    <div className="fetch-error">
                      ❌ {(fetchUrlMut.error as Error).message || 'Failed to fetch URL'}
                    </div>
                  )}
                  <div className="form-actions">
                    <button className="btn-secondary" onClick={() => setShowDocForm(false)}>Cancel</button>
                    <button
                      className="btn-primary"
                      disabled={fetchUrlMut.isPending || !urlForm.url.trim()}
                      onClick={() => fetchUrlMut.mutate({ url: urlForm.url.trim(), title: urlForm.title || undefined, employeeId: eid })}
                    >
                      <Link size={14} />
                      {fetchUrlMut.isPending ? 'Fetching page...' : 'Fetch & Save'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="url-fetch-hint">
                    <Upload size={14} />
                    <span>Upload a PDF, Word document (.docx/.doc), or plain text file. Text will be extracted automatically.</span>
                  </div>
                  <div
                    className={`file-drop-zone ${selectedFile ? 'has-file' : ''}`}
                    onDragOver={e => e.preventDefault()}
                    onDrop={handleFileDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx,.txt"
                      style={{ display: 'none' }}
                      onChange={handleFileChange}
                    />
                    {selectedFile ? (
                      <div className="file-selected">
                        <FileText size={24} />
                        <div>
                          <div className="file-name">{selectedFile.name}</div>
                          <div className="file-size">{(selectedFile.size / 1024).toFixed(1)} KB</div>
                        </div>
                      </div>
                    ) : (
                      <div className="file-drop-hint">
                        <Upload size={28} />
                        <div>Drop a file here or click to browse</div>
                        <div className="file-types">PDF · DOCX · DOC · TXT · Max 10 MB</div>
                      </div>
                    )}
                  </div>
                  {uploadFileMut.isError && (
                    <div className="fetch-error">
                      ❌ {(uploadFileMut.error as Error).message || 'Upload failed'}
                    </div>
                  )}
                  <div className="form-actions">
                    <button className="btn-secondary" onClick={() => { setShowDocForm(false); setSelectedFile(null); }}>Cancel</button>
                    <button
                      className="btn-primary"
                      disabled={uploadFileMut.isPending || !selectedFile}
                      onClick={() => selectedFile && uploadFileMut.mutate(selectedFile)}
                    >
                      <Upload size={14} />
                      {uploadFileMut.isPending ? 'Uploading...' : 'Upload & Extract'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="docs-list">
            {docs.map(doc => (
              <div key={doc.id} className={`doc-card ${!doc.enabled ? 'disabled' : ''}`}>
                <div className="doc-header">
                  <div>
                    <span className="doc-type-badge">{doc.type.replace(/_/g, ' ')}</span>
                    {doc.source && doc.source.startsWith('http') && (
                      <a className="doc-source-link" href={doc.source} target="_blank" rel="noreferrer">
                        <Link size={11} /> {new URL(doc.source).hostname}
                      </a>
                    )}
                    {doc.source && doc.source.startsWith('file:') && (
                      <span className="doc-source-link"><Upload size={11} /> {doc.source.slice(5)}</span>
                    )}
                    <h4>{doc.title}</h4>
                    <span className="doc-meta">{doc.wordCount} words · Quality: <strong style={{ color: scoreColor(doc.qualityScore) }}>{doc.qualityScore}%</strong></span>
                  </div>
                  <div className="doc-actions">
                    <button className="icon-btn" onClick={() => toggleDoc.mutate({ id: doc.id, enabled: !doc.enabled })}>{doc.enabled ? '✅' : '⭕'}</button>
                    <button className="icon-btn" onClick={() => setExpandedDoc(expandedDoc === doc.id ? null : doc.id)}>{expandedDoc === doc.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>
                    <button className="icon-btn danger" onClick={() => { if (confirm('Delete this document?')) deleteDoc.mutate(doc.id); }}><Trash2 size={16} /></button>
                  </div>
                </div>
                {expandedDoc === doc.id && (
                  <div className="doc-content-preview">
                    {doc.source && doc.source.startsWith('http') && (
                      <div className="doc-source-info">
                        <Link size={12} /> Source: <a href={doc.source} target="_blank" rel="noreferrer">{doc.source}</a>
                      </div>
                    )}
                    {doc.content}
                  </div>
                )}
              </div>
            ))}
            {docs.length === 0 && <div className="empty-tab">No knowledge documents yet. Add text, paste a URL, or upload a PDF/DOCX to get started.</div>}
          </div>
        </div>
      )}

      {activeTab === 'examples' && (
        <div className="tab-content">
          <div className="tab-actions"><button className="btn-primary" onClick={() => setShowExForm(!showExForm)}><Plus size={16} /> Add Example</button></div>
          {showExForm && (
            <div className="mini-form">
              <div className="example-form-hint">💡 When a user says something like this...</div>
              <textarea className="form-textarea" rows={2} placeholder='e.g. "What is your pricing?"' value={exForm.trigger} onChange={e => setExForm(f => ({ ...f, trigger: e.target.value }))} />
              <div className="example-form-hint">💬 The AI should reply like this...</div>
              <textarea className="form-textarea" rows={3} placeholder='e.g. "Our plans start at $29/month..."' value={exForm.response} onChange={e => setExForm(f => ({ ...f, response: e.target.value }))} />
              <div className="form-row">
                <input className="form-input" placeholder="Category (general, sales, support...)" value={exForm.category} onChange={e => setExForm(f => ({ ...f, category: e.target.value }))} />
                <div className="priority-row">
                  <label>Priority: {exForm.priority}</label>
                  <input type="range" min={1} max={10} value={exForm.priority} onChange={e => setExForm(f => ({ ...f, priority: parseInt(e.target.value) }))} />
                </div>
              </div>
              <div className="form-actions">
                <button className="btn-secondary" onClick={() => setShowExForm(false)}>Cancel</button>
                <button className="btn-primary" onClick={() => createEx.mutate(exForm)} disabled={createEx.isPending || !exForm.trigger || !exForm.response}>{createEx.isPending ? 'Saving...' : 'Save Example'}</button>
              </div>
            </div>
          )}
          <div className="examples-list">
            {examples.map(ex => (
              <div key={ex.id} className="example-card">
                <div className="ex-trigger"><span className="ex-label">When user says:</span> {ex.trigger}</div>
                <div className="ex-response"><span className="ex-label">AI replies:</span> {ex.response}</div>
                <div className="ex-footer">
                  <span className="category-tag">{ex.category}</span>
                  <span className="priority-badge">P{ex.priority}</span>
                  <button className="icon-btn danger" onClick={() => deleteEx.mutate(ex.id)}><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
            {examples.length === 0 && <div className="empty-tab">No training examples yet. Add "When X → Reply Y" patterns.</div>}
          </div>
        </div>
      )}

      {activeTab === 'rules' && (
        <div className="tab-content">
          <div className="tab-actions"><button className="btn-primary" onClick={() => setShowRuleForm(!showRuleForm)}><Plus size={16} /> Add Rule</button></div>
          {showRuleForm && (
            <div className="mini-form">
              <select className="form-select" value={ruleForm.type} onChange={e => setRuleForm(f => ({ ...f, type: e.target.value }))}>
                {RULE_TYPES.map(t => <option key={t} value={t}>{t.toUpperCase()}: {t === 'never' ? 'Never do this' : t === 'always' ? 'Always do this' : 'Conditionally do this'}</option>)}
              </select>
              <input className="form-input" placeholder={ruleForm.type === 'never' ? 'e.g. mention competitor names' : ruleForm.type === 'always' ? 'e.g. end with a question' : 'e.g. if user asks about refunds, escalate to human'} value={ruleForm.rule} onChange={e => setRuleForm(f => ({ ...f, rule: e.target.value }))} />
              <div className="form-actions">
                <button className="btn-secondary" onClick={() => setShowRuleForm(false)}>Cancel</button>
                <button className="btn-primary" onClick={() => createRule.mutate(ruleForm)} disabled={createRule.isPending || !ruleForm.rule}>{createRule.isPending ? 'Saving...' : 'Save Rule'}</button>
              </div>
            </div>
          )}
          <div className="rules-list">
            {rules.map(rule => (
              <div key={rule.id} className="rule-card">
                <span className={`rule-type-badge ${rule.type}`}>{rule.type.toUpperCase()}</span>
                <span className="rule-text">{rule.rule}</span>
                <button className="icon-btn danger" onClick={() => deleteRule.mutate(rule.id)}><Trash2 size={14} /></button>
              </div>
            ))}
            {rules.length === 0 && <div className="empty-tab">No rules yet. Define what the AI should always or never do.</div>}
          </div>
        </div>
      )}
    </div>
  );
}
