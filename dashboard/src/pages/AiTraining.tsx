import { useState, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, ZoomIn, ZoomOut, Maximize, ChevronLeft,
  FileText, MessageSquare, ShieldAlert, Brain, X,
  Edit2, Trash2, Link, Upload, ToggleLeft, ToggleRight,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import { apiRequest } from '../services/api';
import './AiTraining.css';

interface KnowledgeDoc {
  id: string; title: string; content: string; type: string;
  source: string; wordCount: number; qualityScore: number;
  enabled: boolean; createdAt: string;
}
interface TrainingExample {
  id: string; trigger: string; response: string;
  category: string; priority: number; enabled: boolean;
}
interface TrainingRule { id: string; rule: string; type: string; enabled: boolean; }
interface TrainingStats {
  documentCount: number; wordCount: number; averageQualityScore: number;
  exampleCount: number; ruleCount: number; overallScore: number;
}

const DOC_TYPES = ['text','faq','chat_history','sop','product_catalog','sales_script','policy','custom'];
const RULE_TYPES = ['never','always','conditional'];

type NodeKind = 'doc' | 'example' | 'rule';
interface MapNode {
  id: string; kind: NodeKind;
  label: string; size: number;
  x: number; y: number;
  quality?: 'green' | 'amber' | 'red';
  rawId: string;
}

function layoutNodes(docs: KnowledgeDoc[], examples: TrainingExample[], rules: TrainingRule[]): MapNode[] {
  const nodes: MapNode[] = [];
  const cx = 50; const cy = 50;

  docs.forEach((d, i) => {
    const angle = (i / Math.max(docs.length, 1)) * 2 * Math.PI - Math.PI / 2;
    const r = 33;
    nodes.push({
      id: `doc-${d.id}`, kind: 'doc', rawId: d.id,
      label: d.title.length > 18 ? d.title.slice(0, 16) + '…' : d.title,
      size: 46,
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
      quality: d.qualityScore >= 80 ? 'green' : d.qualityScore >= 50 ? 'amber' : 'red',
    });
  });

  examples.forEach((e, i) => {
    const angle = (i / Math.max(examples.length, 1)) * 2 * Math.PI + Math.PI / 5;
    const r = 20;
    nodes.push({
      id: `ex-${e.id}`, kind: 'example', rawId: e.id,
      label: e.trigger.length > 18 ? e.trigger.slice(0, 16) + '…' : e.trigger,
      size: 28,
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    });
  });

  rules.forEach((rule, i) => {
    const angle = (i / Math.max(rules.length, 1)) * 2 * Math.PI + Math.PI;
    const r = 26;
    nodes.push({
      id: `rule-${rule.id}`, kind: 'rule', rawId: rule.id,
      label: rule.rule.length > 22 ? rule.rule.slice(0, 20) + '…' : rule.rule,
      size: 22,
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    });
  });

  return nodes;
}

type AddMode = 'text' | 'url' | 'file' | 'example' | 'rule';

export function AiTraining() {
  const qc = useQueryClient();
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [addMode, setAddMode] = useState<AddMode>('text');
  const [expandedContent, setExpandedContent] = useState(false);

  const [docForm, setDocForm] = useState({ title: '', content: '', type: 'text', source: '' });
  const [urlForm, setUrlForm] = useState({ url: '', title: '' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [exForm, setExForm] = useState({ trigger: '', response: '', category: 'general', priority: 5 });
  const [ruleForm, setRuleForm] = useState({ rule: '', type: 'never' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const eid = employeeFilter || undefined;

  const { data: docs = [] } = useQuery<KnowledgeDoc[]>({
    queryKey: ['training-docs', eid],
    queryFn: () => apiRequest(`/ai-training/documents${eid ? `?employeeId=${eid}` : ''}`),
  });
  const { data: examples = [] } = useQuery<TrainingExample[]>({
    queryKey: ['training-examples', eid],
    queryFn: () => apiRequest(`/ai-training/examples${eid ? `?employeeId=${eid}` : ''}`),
  });
  const { data: rules = [] } = useQuery<TrainingRule[]>({
    queryKey: ['training-rules', eid],
    queryFn: () => apiRequest(`/ai-training/rules${eid ? `?employeeId=${eid}` : ''}`),
  });
  const { data: stats } = useQuery<TrainingStats>({
    queryKey: ['training-stats', eid],
    queryFn: () => apiRequest(`/ai-training/stats${eid ? `?employeeId=${eid}` : ''}`),
  });
  const { data: employees = [] } = useQuery<{ id: string; name: string; avatar: string }[]>({
    queryKey: ['ai-employees'],
    queryFn: () => apiRequest('/ai-employees'),
  });

  const nodes = useMemo(() => layoutNodes(docs, examples, rules), [docs, examples, rules]);

  const selectedNode = nodes.find(n => n.id === selectedId);
  const selectedDoc = selectedNode?.kind === 'doc' ? docs.find(d => d.id === selectedNode.rawId) : null;
  const selectedEx = selectedNode?.kind === 'example' ? examples.find(e => e.id === selectedNode.rawId) : null;
  const selectedRule = selectedNode?.kind === 'rule' ? rules.find(r => r.id === selectedNode.rawId) : null;

  const score = stats?.overallScore ?? 0;
  const scoreColor = (s: number) => s >= 80 ? '#4ade80' : s >= 50 ? '#fbbf24' : '#f87171';

  const createDoc = useMutation({
    mutationFn: (d: typeof docForm) => apiRequest('/ai-training/documents', { method: 'POST', body: JSON.stringify({ ...d, employeeId: eid || null }) }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['training-docs'] }); void qc.invalidateQueries({ queryKey: ['training-stats'] }); setDocForm({ title: '', content: '', type: 'text', source: '' }); setShowModal(false); },
  });
  const fetchUrlMut = useMutation({
    mutationFn: (d: { url: string; title?: string; employeeId?: string }) => apiRequest('/ai-training/documents/fetch-url', { method: 'POST', body: JSON.stringify(d) }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['training-docs'] }); void qc.invalidateQueries({ queryKey: ['training-stats'] }); setUrlForm({ url: '', title: '' }); setShowModal(false); },
  });
  const uploadFileMut = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData(); form.append('file', file);
      const token = sessionStorage.getItem('openwa_api_key') || '';
      const res = await fetch(`/api/ai-training/documents/upload${eid ? `?employeeId=${eid}` : ''}`, { method: 'POST', headers: { 'X-API-Key': token }, body: form });
      if (!res.ok) { const err = await res.json().catch(() => ({ message: res.statusText })) as { message?: string }; throw new Error(err.message || 'Upload failed'); }
      return res.json();
    },
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['training-docs'] }); void qc.invalidateQueries({ queryKey: ['training-stats'] }); setSelectedFile(null); setShowModal(false); },
  });
  const deleteDoc = useMutation({
    mutationFn: (id: string) => apiRequest(`/ai-training/documents/${id}`, { method: 'DELETE' }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['training-docs'] }); void qc.invalidateQueries({ queryKey: ['training-stats'] }); setSelectedId(null); },
  });
  const toggleDoc = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => apiRequest(`/ai-training/documents/${id}`, { method: 'PUT', body: JSON.stringify({ enabled }) }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['training-docs'] }),
  });

  const createEx = useMutation({
    mutationFn: (d: typeof exForm) => apiRequest('/ai-training/examples', { method: 'POST', body: JSON.stringify({ ...d, employeeId: eid || null }) }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['training-examples'] }); void qc.invalidateQueries({ queryKey: ['training-stats'] }); setExForm({ trigger: '', response: '', category: 'general', priority: 5 }); setShowModal(false); },
  });
  const deleteEx = useMutation({
    mutationFn: (id: string) => apiRequest(`/ai-training/examples/${id}`, { method: 'DELETE' }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['training-examples'] }); setSelectedId(null); },
  });

  const createRule = useMutation({
    mutationFn: (d: typeof ruleForm) => apiRequest('/ai-training/rules', { method: 'POST', body: JSON.stringify({ ...d, employeeId: eid || null }) }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['training-rules'] }); void qc.invalidateQueries({ queryKey: ['training-stats'] }); setRuleForm({ rule: '', type: 'never' }); setShowModal(false); },
  });
  const deleteRule = useMutation({
    mutationFn: (id: string) => apiRequest(`/ai-training/rules/${id}`, { method: 'DELETE' }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['training-rules'] }); setSelectedId(null); },
  });

  const openModal = (mode: AddMode) => { setAddMode(mode); setShowModal(true); };

  const renderConnections = () => (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
      {nodes.filter(n => n.kind === 'doc').map(node => (
        <line
          key={`core-${node.id}`}
          x1="50%" y1="50%"
          x2={`${node.x}%`} y2={`${node.y}%`}
          className={`connection-line ${selectedId === node.id ? 'active' : ''}`}
          strokeDasharray="4 4" opacity="0.5"
        />
      ))}
    </svg>
  );

  const renderNode = (node: MapNode) => {
    const isSelected = selectedId === node.id;
    let cls = 'absolute rounded-full cursor-pointer flex items-center justify-center group ';
    if (node.kind === 'doc') cls += 'node-doc ';
    if (node.kind === 'example') cls += 'node-example ';
    if (node.kind === 'rule') cls += 'node-rule ';

    let ring = '';
    if (node.kind === 'doc') {
      if (node.quality === 'green') ring = 'ring-2 ring-green-400 ring-offset-2 ring-offset-[#050505] ';
      if (node.quality === 'amber') ring = 'ring-2 ring-amber-400 ring-offset-2 ring-offset-[#050505] ';
      if (node.quality === 'red')   ring = 'ring-2 ring-red-400 ring-offset-2 ring-offset-[#050505] ';
    }
    if (isSelected) ring += 'ring-4 ring-white ring-offset-4 ring-offset-[#050505]';

    const Icon = node.kind === 'doc' ? FileText : node.kind === 'example' ? MessageSquare : ShieldAlert;

    return (
      <div
        key={node.id}
        className={cls + ring}
        style={{ width: node.size, height: node.size, left: `calc(${node.x}% - ${node.size / 2}px)`, top: `calc(${node.y}% - ${node.size / 2}px)`, zIndex: isSelected ? 50 : 10 }}
        onClick={e => { e.stopPropagation(); setSelectedId(node.id); setExpandedContent(false); }}
      >
        <Icon size={node.size * 0.4} className="text-white opacity-80" />
        <div className="absolute top-full mt-2 text-center pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity" style={{ width: 128, left: '50%', transform: 'translateX(-50%)' }}>
          <span className="text-xs font-medium bg-black/50 px-2 py-1 rounded backdrop-blur-sm border border-white/10 text-white/80 whitespace-nowrap">
            {node.label}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="brain-map-container relative flex overflow-hidden text-sm" style={{ height: '100vh' }}>
      {/* Left Sidebar */}
      <div className={`bm-sidebar flex flex-col bg-[#0a0a0a]/90 backdrop-blur-xl border-r border-white/10 transition-all duration-300 ease-in-out z-20 overflow-y-auto flex-shrink-0 ${sidebarOpen ? 'w-64' : 'w-0 opacity-0 pointer-events-none'}`}>
        <div className="p-4 border-b border-white/10 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <Brain className="text-purple-400" size={18} />
            <span className="font-display font-semibold text-white text-sm">Brain Index</span>
          </div>
          <button className="p-1 hover:bg-white/10 rounded text-white/60 hover:text-white" onClick={() => setSidebarOpen(false)}>
            <ChevronLeft size={16} />
          </button>
        </div>

        <div className="p-3 border-b border-white/10 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={13} />
            <input type="text" placeholder="Search knowledge..." className="bm-input pl-8 py-1.5 text-xs" />
          </div>
        </div>

        <div className="p-3 border-b border-white/10 flex-shrink-0">
          <select
            className="bm-select w-full text-xs"
            value={employeeFilter}
            onChange={e => setEmployeeFilter(e.target.value)}
          >
            <option value="">🌐 Global (all employees)</option>
            {(employees as { id: string; name: string; avatar: string }[]).map(e => (
              <option key={e.id} value={e.id}>{e.avatar} {e.name}</option>
            ))}
          </select>
        </div>

        <div className="flex-1 p-3 space-y-5 overflow-y-auto">
          <div>
            <h3 className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-2">Documents</h3>
            <div className="space-y-0.5">
              {docs.map(doc => (
                <button
                  key={doc.id}
                  onClick={() => { setSelectedId(`doc-${doc.id}`); setExpandedContent(false); }}
                  className={`w-full text-left px-2 py-1.5 rounded flex items-center gap-2 transition-colors text-xs ${selectedId === `doc-${doc.id}` ? 'bg-blue-500/20 text-blue-300' : 'text-white/60 hover:bg-white/5 hover:text-white/80'}`}
                >
                  <FileText size={12} className={selectedId === `doc-${doc.id}` ? 'text-blue-400 flex-shrink-0' : 'text-white/40 flex-shrink-0'} />
                  <span className="truncate">{doc.title}</span>
                </button>
              ))}
              {docs.length === 0 && <div className="text-xs text-white/30 px-2 py-1">No documents yet</div>}
            </div>
          </div>
          <div>
            <h3 className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-2">Examples</h3>
            <div className="space-y-0.5">
              {examples.map(ex => (
                <button
                  key={ex.id}
                  onClick={() => { setSelectedId(`ex-${ex.id}`); setExpandedContent(false); }}
                  className={`w-full text-left px-2 py-1.5 rounded flex items-center gap-2 transition-colors text-xs ${selectedId === `ex-${ex.id}` ? 'bg-amber-500/20 text-amber-300' : 'text-white/60 hover:bg-white/5 hover:text-white/80'}`}
                >
                  <MessageSquare size={12} className={selectedId === `ex-${ex.id}` ? 'text-amber-400 flex-shrink-0' : 'text-white/40 flex-shrink-0'} />
                  <span className="truncate">{ex.trigger}</span>
                </button>
              ))}
              {examples.length === 0 && <div className="text-xs text-white/30 px-2 py-1">No examples yet</div>}
            </div>
          </div>
          <div>
            <h3 className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-2">Rules</h3>
            <div className="space-y-0.5">
              {rules.map(rule => (
                <button
                  key={rule.id}
                  onClick={() => { setSelectedId(`rule-${rule.id}`); setExpandedContent(false); }}
                  className={`w-full text-left px-2 py-1.5 rounded flex items-center gap-2 transition-colors text-xs ${selectedId === `rule-${rule.id}` ? 'bg-red-500/20 text-red-300' : 'text-white/60 hover:bg-white/5 hover:text-white/80'}`}
                >
                  <ShieldAlert size={12} className={selectedId === `rule-${rule.id}` ? 'text-red-400 flex-shrink-0' : 'text-white/40 flex-shrink-0'} />
                  <span className="truncate">{rule.rule}</span>
                </button>
              ))}
              {rules.length === 0 && <div className="text-xs text-white/30 px-2 py-1">No rules yet</div>}
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar toggle when closed */}
      {!sidebarOpen && (
        <button
          className="absolute left-4 top-4 z-30 p-2 bg-[#111] border border-white/10 rounded-md hover:bg-white/10 text-white shadow-lg"
          onClick={() => setSidebarOpen(true)}
        >
          <Brain size={16} />
        </button>
      )}

      {/* Main canvas */}
      <div className="flex-1 relative overflow-hidden" onClick={() => setSelectedId(null)}>
        {/* Top bar */}
        <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-2">
          <button
            className="bg-purple-600 hover:bg-purple-500 text-white font-medium px-4 py-2 rounded-lg shadow-[0_0_15px_rgba(147,51,234,0.4)] flex items-center gap-2 transition-all hover:scale-105 text-sm font-display"
            onClick={e => { e.stopPropagation(); openModal('text'); }}
          >
            <Plus size={16} />
            Add Knowledge
          </button>
          <div className="flex items-center bg-[#111]/80 backdrop-blur-md border border-white/10 rounded-md overflow-hidden">
            <button className="p-2 hover:bg-white/10 text-white/70 hover:text-white transition-colors" onClick={e => { e.stopPropagation(); setZoom(z => Math.min(z + 0.2, 2)); }}><ZoomIn size={16} /></button>
            <div className="w-px h-4 bg-white/10" />
            <button className="p-2 hover:bg-white/10 text-white/70 hover:text-white transition-colors" onClick={e => { e.stopPropagation(); setZoom(1); }}><Maximize size={16} /></button>
            <div className="w-px h-4 bg-white/10" />
            <button className="p-2 hover:bg-white/10 text-white/70 hover:text-white transition-colors" onClick={e => { e.stopPropagation(); setZoom(z => Math.max(z - 0.2, 0.4)); }}><ZoomOut size={16} /></button>
          </div>
        </div>

        {/* Node graph */}
        <div
          className="absolute inset-0 origin-center transition-transform duration-300 ease-out"
          style={{ transform: `scale(${zoom})` }}
        >
          <div className="relative w-full h-full">
            {renderConnections()}
            {nodes.map(renderNode)}

            {/* Central core orb */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
              <div
                className="core-node rounded-full w-36 h-36 flex items-center justify-center relative cursor-pointer"
                onClick={e => { e.stopPropagation(); setSelectedId(null); }}
              >
                <div className="ring-spin absolute inset-0 rounded-full border border-purple-400/30" style={{ borderTopColor: 'transparent', borderBottomColor: 'transparent' }} />
                <div className="ring-spin-reverse absolute inset-2 rounded-full border border-purple-500/20" style={{ borderLeftColor: 'transparent', borderRightColor: 'transparent' }} />
                <div className="text-center z-10 font-display">
                  <div className="text-3xl font-bold text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]" style={{ color: scoreColor(score) }}>{score}%</div>
                  <div className="text-[10px] text-purple-200 uppercase tracking-widest mt-1 opacity-80">Core Health</div>
                </div>
              </div>

              <div className="absolute top-full mt-6 flex gap-3 text-center">
                <div className="bg-white/5 border border-white/10 px-3 py-1.5 rounded backdrop-blur-sm">
                  <div className="text-base font-bold text-white font-display">{stats?.documentCount ?? 0}</div>
                  <div className="text-[10px] text-white/50 uppercase">Docs</div>
                </div>
                <div className="bg-white/5 border border-white/10 px-3 py-1.5 rounded backdrop-blur-sm">
                  <div className="text-base font-bold text-white font-display">{stats?.exampleCount ?? 0}</div>
                  <div className="text-[10px] text-white/50 uppercase">Examples</div>
                </div>
                <div className="bg-white/5 border border-white/10 px-3 py-1.5 rounded backdrop-blur-sm">
                  <div className="text-base font-bold text-white font-display">{stats?.ruleCount ?? 0}</div>
                  <div className="text-[10px] text-white/50 uppercase">Rules</div>
                </div>
              </div>
            </div>

            {/* Empty state hint */}
            {nodes.length === 0 && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 mt-28 text-center pointer-events-none">
                <p className="text-white/30 text-sm">Click "Add Knowledge" to start training your AI</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right detail panel */}
      <div className={`absolute top-4 bottom-4 right-4 w-80 bg-[#111]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl transition-transform duration-300 ease-out z-40 flex flex-col ${selectedId ? 'translate-x-0' : 'translate-x-[calc(100%+16px)]'}`}>
        {selectedDoc && (
          <>
            <div className="p-4 border-b border-white/10 flex justify-between items-start flex-shrink-0">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-blue-500/20 text-blue-400">Document</span>
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${selectedDoc.qualityScore >= 80 ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]' : selectedDoc.qualityScore >= 50 ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]' : 'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.6)]'}`} />
                </div>
                <h2 className="text-base font-display font-semibold text-white leading-tight">{selectedDoc.title}</h2>
                <div className="text-xs text-white/40 mt-1">{selectedDoc.wordCount.toLocaleString()} words · Quality: <span style={{ color: scoreColor(selectedDoc.qualityScore) }}>{selectedDoc.qualityScore}%</span></div>
              </div>
              <button className="text-white/40 hover:text-white flex-shrink-0" onClick={() => setSelectedId(null)}><X size={18} /></button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto space-y-4 text-xs">
              <div className="flex items-center gap-2">
                <span className="bg-white/10 text-white/70 px-2 py-0.5 rounded text-[10px] uppercase">{selectedDoc.type.replace(/_/g,' ')}</span>
                {selectedDoc.source?.startsWith('http') && (
                  <a href={selectedDoc.source} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-white/40 hover:text-blue-400 transition-colors">
                    <Link size={11} />{new URL(selectedDoc.source).hostname}
                  </a>
                )}
              </div>

              <div>
                <button
                  className="w-full text-left flex items-center justify-between text-white/50 hover:text-white/80 transition-colors py-1"
                  onClick={() => setExpandedContent(v => !v)}
                >
                  <span className="text-[10px] uppercase font-semibold tracking-wider">Content</span>
                  {expandedContent ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {expandedContent && (
                  <div className="bg-white/5 border border-white/5 p-3 rounded text-white/70 leading-relaxed font-mono max-h-48 overflow-y-auto mt-1" style={{ fontSize: '0.72rem' }}>
                    {selectedDoc.content}
                  </div>
                )}
              </div>
            </div>

            <div className="p-3 border-t border-white/10 flex gap-2 flex-shrink-0">
              <button
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-colors bg-white/10 hover:bg-white/20 text-white"
                onClick={() => toggleDoc.mutate({ id: selectedDoc.id, enabled: !selectedDoc.enabled })}
              >
                {selectedDoc.enabled ? <ToggleRight size={14} className="text-green-400" /> : <ToggleLeft size={14} className="text-white/40" />}
                {selectedDoc.enabled ? 'Enabled' : 'Disabled'}
              </button>
              <button
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors bg-red-500/10 hover:bg-red-500/20 text-red-400"
                onClick={() => { if (confirm('Delete this document?')) deleteDoc.mutate(selectedDoc.id); }}
              >
                <Trash2 size={13} />
              </button>
            </div>
          </>
        )}

        {selectedEx && (
          <>
            <div className="p-4 border-b border-white/10 flex justify-between items-start flex-shrink-0">
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-amber-500/20 text-amber-400 inline-block mb-1.5">Example</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-white/40 bg-white/10 px-2 py-0.5 rounded">{selectedEx.category}</span>
                  <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">P{selectedEx.priority}</span>
                </div>
              </div>
              <button className="text-white/40 hover:text-white flex-shrink-0" onClick={() => setSelectedId(null)}><X size={18} /></button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto space-y-3 text-xs">
              <div>
                <div className="text-[10px] uppercase font-semibold text-white/40 tracking-wider mb-1">When user says</div>
                <div className="bg-white/5 border border-white/5 p-3 rounded text-white/80 leading-relaxed">{selectedEx.trigger}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-semibold text-white/40 tracking-wider mb-1">AI replies</div>
                <div className="bg-amber-500/5 border border-amber-500/20 p-3 rounded text-white/80 leading-relaxed border-l-2 border-l-amber-500">{selectedEx.response}</div>
              </div>
            </div>

            <div className="p-3 border-t border-white/10 flex-shrink-0">
              <button
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-colors bg-red-500/10 hover:bg-red-500/20 text-red-400"
                onClick={() => deleteEx.mutate(selectedEx.id)}
              >
                <Trash2 size={13} /> Delete Example
              </button>
            </div>
          </>
        )}

        {selectedRule && (
          <>
            <div className="p-4 border-b border-white/10 flex justify-between items-start flex-shrink-0">
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-red-500/20 text-red-400 inline-block mb-1.5">Rule</span>
                <span className={`ml-2 px-2 py-0.5 rounded text-[10px] font-bold inline-block ${selectedRule.type === 'never' ? 'bg-red-500/20 text-red-400' : selectedRule.type === 'always' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                  {selectedRule.type.toUpperCase()}
                </span>
              </div>
              <button className="text-white/40 hover:text-white flex-shrink-0" onClick={() => setSelectedId(null)}><X size={18} /></button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto text-xs">
              <div className="bg-white/5 border border-white/5 p-3 rounded text-white/80 leading-relaxed">{selectedRule.rule}</div>
            </div>

            <div className="p-3 border-t border-white/10 flex-shrink-0">
              <button
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-colors bg-red-500/10 hover:bg-red-500/20 text-red-400"
                onClick={() => deleteRule.mutate(selectedRule.id)}
              >
                <Trash2 size={13} /> Delete Rule
              </button>
            </div>
          </>
        )}
      </div>

      {/* Add Knowledge modal */}
      {showModal && (
        <div className="bm-overlay" onClick={() => setShowModal(false)}>
          <div className="bm-modal" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display font-semibold text-white text-lg">Add Knowledge</h2>
              <button className="text-white/40 hover:text-white" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>

            {/* Mode tabs */}
            <div className="bm-tab-row mb-5">
              {(['text','url','file','example','rule'] as AddMode[]).map(m => (
                <button key={m} className={`bm-tab ${addMode === m ? 'active' : ''}`} onClick={() => setAddMode(m)}>
                  {m === 'text' && <><FileText size={13} /> Text</>}
                  {m === 'url'  && <><Link size={13} /> URL</>}
                  {m === 'file' && <><Upload size={13} /> File</>}
                  {m === 'example' && <><MessageSquare size={13} /> Example</>}
                  {m === 'rule' && <><ShieldAlert size={13} /> Rule</>}
                </button>
              ))}
            </div>

            {addMode === 'text' && (
              <div className="space-y-3">
                <input className="bm-input" placeholder="Title" value={docForm.title} onChange={e => setDocForm(f => ({ ...f, title: e.target.value }))} />
                <div className="flex gap-3">
                  <select className="bm-select flex-1" value={docForm.type} onChange={e => setDocForm(f => ({ ...f, type: e.target.value }))}>
                    {DOC_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
                  </select>
                  <input className="bm-input flex-1" placeholder="Source (optional)" value={docForm.source} onChange={e => setDocForm(f => ({ ...f, source: e.target.value }))} />
                </div>
                <textarea className="bm-textarea" rows={6} placeholder="Paste your knowledge content here — FAQs, product info, company policies..." value={docForm.content} onChange={e => setDocForm(f => ({ ...f, content: e.target.value }))} />
                <div className="flex justify-end gap-3 pt-2">
                  <button className="bm-btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                  <button className="bm-btn-primary" disabled={createDoc.isPending || !docForm.title || !docForm.content} onClick={() => createDoc.mutate(docForm)}>
                    {createDoc.isPending ? 'Saving…' : 'Save Document'}
                  </button>
                </div>
              </div>
            )}

            {addMode === 'url' && (
              <div className="space-y-3">
                <div className="bm-hint"><Link size={14} /> Enter any webpage URL — content will be extracted automatically.</div>
                <input className="bm-input" placeholder="https://yourwebsite.com/about" value={urlForm.url} onChange={e => setUrlForm(f => ({ ...f, url: e.target.value }))} />
                <input className="bm-input" placeholder="Title (optional — auto-detected from page)" value={urlForm.title} onChange={e => setUrlForm(f => ({ ...f, title: e.target.value }))} />
                {fetchUrlMut.isError && <div className="bm-error">❌ {(fetchUrlMut.error as Error).message || 'Failed to fetch URL'}</div>}
                <div className="flex justify-end gap-3 pt-2">
                  <button className="bm-btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                  <button className="bm-btn-primary" disabled={fetchUrlMut.isPending || !urlForm.url.trim()} onClick={() => fetchUrlMut.mutate({ url: urlForm.url.trim(), title: urlForm.title || undefined, employeeId: eid })}>
                    <Link size={14} />{fetchUrlMut.isPending ? 'Fetching page…' : 'Fetch & Save'}
                  </button>
                </div>
              </div>
            )}

            {addMode === 'file' && (
              <div className="space-y-3">
                <div className="bm-hint"><Upload size={14} /> Upload a PDF, Word document (.docx/.doc), or plain text file.</div>
                <div
                  className={`bm-file-drop ${selectedFile ? 'has-file' : ''}`}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) setSelectedFile(f); }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.txt" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) setSelectedFile(f); }} />
                  {selectedFile ? (
                    <div className="flex items-center justify-center gap-3">
                      <FileText size={24} className="text-purple-400" />
                      <div>
                        <div className="font-semibold text-white text-sm">{selectedFile.name}</div>
                        <div className="text-xs text-white/40">{(selectedFile.size / 1024).toFixed(1)} KB</div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-white/40">
                      <Upload size={28} />
                      <div className="text-sm">Drop a file here or click to browse</div>
                      <div className="text-xs">PDF · DOCX · DOC · TXT · Max 10 MB</div>
                    </div>
                  )}
                </div>
                {uploadFileMut.isError && <div className="bm-error">❌ {(uploadFileMut.error as Error).message || 'Upload failed'}</div>}
                <div className="flex justify-end gap-3 pt-2">
                  <button className="bm-btn-ghost" onClick={() => { setShowModal(false); setSelectedFile(null); }}>Cancel</button>
                  <button className="bm-btn-primary" disabled={uploadFileMut.isPending || !selectedFile} onClick={() => selectedFile && uploadFileMut.mutate(selectedFile)}>
                    <Upload size={14} />{uploadFileMut.isPending ? 'Uploading…' : 'Upload & Extract'}
                  </button>
                </div>
              </div>
            )}

            {addMode === 'example' && (
              <div className="space-y-3">
                <div className="text-xs font-semibold text-white/50">💡 When a user says something like this…</div>
                <textarea className="bm-textarea" rows={2} placeholder='e.g. "What is your pricing?"' value={exForm.trigger} onChange={e => setExForm(f => ({ ...f, trigger: e.target.value }))} />
                <div className="text-xs font-semibold text-white/50">💬 The AI should reply like this…</div>
                <textarea className="bm-textarea" rows={3} placeholder='e.g. "Our plans start at $29/month…"' value={exForm.response} onChange={e => setExForm(f => ({ ...f, response: e.target.value }))} />
                <div className="flex gap-3">
                  <input className="bm-input flex-1" placeholder="Category (general, sales, support…)" value={exForm.category} onChange={e => setExForm(f => ({ ...f, category: e.target.value }))} />
                  <div className="flex items-center gap-2 text-xs text-white/60 flex-shrink-0">
                    <span>Priority: {exForm.priority}</span>
                    <input type="range" min={1} max={10} value={exForm.priority} onChange={e => setExForm(f => ({ ...f, priority: parseInt(e.target.value) }))} className="w-20" />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button className="bm-btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                  <button className="bm-btn-primary" disabled={createEx.isPending || !exForm.trigger || !exForm.response} onClick={() => createEx.mutate(exForm)}>
                    {createEx.isPending ? 'Saving…' : 'Save Example'}
                  </button>
                </div>
              </div>
            )}

            {addMode === 'rule' && (
              <div className="space-y-3">
                <div className="bm-type-row">
                  {RULE_TYPES.map(t => (
                    <button key={t} className={`bm-type-chip ${ruleForm.type === t ? 'active' : ''}`} onClick={() => setRuleForm(f => ({ ...f, type: t }))}>
                      {t === 'never' ? '🚫 NEVER' : t === 'always' ? '✅ ALWAYS' : '⚡ CONDITIONAL'}
                    </button>
                  ))}
                </div>
                <input
                  className="bm-input"
                  placeholder={ruleForm.type === 'never' ? 'e.g. mention competitor names' : ruleForm.type === 'always' ? 'e.g. end with a question' : 'e.g. if user asks about refunds, escalate to human'}
                  value={ruleForm.rule}
                  onChange={e => setRuleForm(f => ({ ...f, rule: e.target.value }))}
                />
                <div className="flex justify-end gap-3 pt-2">
                  <button className="bm-btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                  <button className="bm-btn-primary" disabled={createRule.isPending || !ruleForm.rule} onClick={() => createRule.mutate(ruleForm)}>
                    {createRule.isPending ? 'Saving…' : 'Save Rule'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

