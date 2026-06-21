import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sessionApi } from '../services/api';
import {
  Bot,
  Plus,
  Trash2,
  Save,
  Send,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  Building2,
  Settings2,
  MessageCircle,
  Info,
  Key,
  Eye,
  EyeOff,
  Zap,
  Coffee,
} from 'lucide-react';
import { aiBotApi, type AiBotConfig, type AiProviderKey } from '../services/api';

const TONE_OPTIONS = [
  { value: 'friendly', label: 'Friendly', desc: 'Warm & approachable' },
  { value: 'professional', label: 'Professional', desc: 'Courteous & reliable' },
  { value: 'formal', label: 'Formal', desc: 'Precise & official' },
];

const OPENAI_MODELS = [
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini — fast, cheap' },
  { value: 'gpt-4o', label: 'GPT-4o — most capable' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo — legacy' },
];

const GEMINI_MODELS = [
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash — latest, fast' },
  { value: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite — fast, cheap' },
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro — most capable' },
];

function resolveModel(model: string | null | undefined, provider: string): string {
  const list = provider === 'gemini' ? GEMINI_MODELS : OPENAI_MODELS;
  if (model && list.find(m => m.value === model)) return model;
  return list[0].value;
}

const EMPTY_FORM: Partial<AiBotConfig> & { servicesArr: string[]; faqsArr: { q: string; a: string }[] } = {
  sessionId: '*',
  aiProvider: 'openai',
  apiKey: '',
  botType: 'company',
  companyName: '',
  companyDescription: '',
  servicesArr: [],
  faqsArr: [],
  tone: 'friendly',
  responseLanguage: 'auto',
  systemPrompt: '',
  model: 'gpt-4o-mini',
  maxTokens: 500,
  fallbackMessage: 'Sorry, I am unable to assist right now. Please try again later.',
  enabled: false,
};

function parseServices(raw: string): string[] {
  try { return JSON.parse(raw) as string[]; } catch { return []; }
}
function parseFaqs(raw: string): { q: string; a: string }[] {
  try { return JSON.parse(raw) as { q: string; a: string }[]; } catch { return []; }
}

export function AiBot() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<'company' | 'ai' | 'test'>('company');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [testMessage, setTestMessage] = useState('');
  const [testReply, setTestReply] = useState('');
  const [testError, setTestError] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [newService, setNewService] = useState('');
  const [newFaqQ, setNewFaqQ] = useState('');
  const [newFaqA, setNewFaqA] = useState('');
  const [saveError, setSaveError] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [dynamicModels, setDynamicModels] = useState<{ id: string; label: string }[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState('');
  const [pkForm, setPkForm] = useState<{ provider: 'openai' | 'gemini'; apiKey: string; label: string } | null>(null);
  const [pkSaving, setPkSaving] = useState(false);
  const [pkError, setPkError] = useState('');

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions'],
    queryFn: sessionApi.list,
  });

  const { data: status } = useQuery({
    queryKey: ['ai-bot-status'],
    queryFn: aiBotApi.getStatus,
  });

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ['ai-bot-configs'],
    queryFn: aiBotApi.listConfigs,
  });

  const { data: providerKeys = [] } = useQuery({
    queryKey: ['ai-bot-provider-keys'],
    queryFn: aiBotApi.listProviderKeys,
  });

  const deleteProviderKeyMutation = useMutation({
    mutationFn: (id: string) => aiBotApi.deleteProviderKey(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ai-bot-provider-keys'] }),
  });

  async function handleSaveProviderKey() {
    if (!pkForm?.apiKey.trim()) { setPkError('API key is required.'); return; }
    setPkSaving(true); setPkError('');
    try {
      await aiBotApi.saveProviderKey(pkForm.provider, pkForm.apiKey.trim(), pkForm.label.trim() || pkForm.provider);
      qc.invalidateQueries({ queryKey: ['ai-bot-provider-keys'] });
      setPkForm(null);
    } catch (e) {
      setPkError(e instanceof Error ? e.message : 'Failed to save key');
    } finally {
      setPkSaving(false);
    }
  }

  const createMutation = useMutation({
    mutationFn: (data: Partial<AiBotConfig>) => aiBotApi.createConfig(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ai-bot-configs'] }); qc.invalidateQueries({ queryKey: ['ai-bot-status'] }); resetForm(); },
    onError: (e: Error) => setSaveError(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AiBotConfig> }) => aiBotApi.updateConfig(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ai-bot-configs'] }); qc.invalidateQueries({ queryKey: ['ai-bot-status'] }); resetForm(); },
    onError: (e: Error) => setSaveError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: aiBotApi.deleteConfig,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ai-bot-configs'] }); qc.invalidateQueries({ queryKey: ['ai-bot-status'] }); },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => aiBotApi.updateConfig(id, { enabled }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ai-bot-configs'] }),
  });

  function resetForm() {
    setForm({ ...EMPTY_FORM, servicesArr: [], faqsArr: [] });
    setEditingId(null);
    setSaveError('');
    setActiveTab('company');
    setShowApiKey(false);
  }

  function startEdit(config: AiBotConfig) {
    setForm({
      sessionId: config.sessionId,
      aiProvider: config.aiProvider || 'openai',
      apiKey: '',
      botType: config.botType || 'company',
      companyName: config.companyName,
      companyDescription: config.companyDescription,
      servicesArr: parseServices(config.companyServices),
      faqsArr: parseFaqs(config.companyFaqs),
      tone: config.tone,
      responseLanguage: config.responseLanguage,
      systemPrompt: config.systemPrompt || '',
      model: resolveModel(config.model, config.aiProvider || 'openai'),
      maxTokens: config.maxTokens,
      fallbackMessage: config.fallbackMessage || '',
      enabled: config.enabled,
    });
    setEditingId(config.id);
    setSaveError('');
    setShowApiKey(false);
    setActiveTab('ai');
  }

  function buildPayload(): Partial<AiBotConfig> {
    const payload: Partial<AiBotConfig> = {
      sessionId: form.sessionId || '*',
      aiProvider: form.aiProvider || 'openai',
      botType: form.botType || 'company',
      companyName: form.companyName || '',
      companyDescription: form.companyDescription || '',
      companyServices: JSON.stringify(form.servicesArr || []),
      companyFaqs: JSON.stringify(form.faqsArr || []),
      tone: form.tone as AiBotConfig['tone'],
      responseLanguage: form.responseLanguage || 'auto',
      systemPrompt: form.systemPrompt?.trim() || null,
      model: form.model || (form.aiProvider === 'gemini' ? 'gemini-2.0-flash' : 'gpt-4o-mini'),
      maxTokens: form.maxTokens || 500,
      fallbackMessage: form.fallbackMessage || null,
      enabled: form.enabled ?? false,
    };
    if (form.apiKey?.trim()) {
      payload.apiKey = form.apiKey.trim();
    }
    return payload;
  }

  function handleSave() {
    setSaveError('');
    if (form.botType === 'company' && !form.companyName?.trim()) {
      setSaveError('Company name is required for company bots.');
      return;
    }
    const payload = buildPayload();
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  async function handleTest() {
    if (!testMessage.trim() || !editingId) return;
    setTestLoading(true);
    setTestReply('');
    setTestError('');
    try {
      const res = await aiBotApi.testConfig(editingId, testMessage);
      setTestReply(res.reply);
      if (res.isError && res.error) setTestError(res.error);
    } catch (e) {
      setTestError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setTestLoading(false);
    }
  }

  function addService() {
    if (!newService.trim()) return;
    setForm(f => ({ ...f, servicesArr: [...(f.servicesArr || []), newService.trim()] }));
    setNewService('');
  }
  function removeService(i: number) {
    setForm(f => ({ ...f, servicesArr: (f.servicesArr || []).filter((_, idx) => idx !== i) }));
  }
  function addFaq() {
    if (!newFaqQ.trim() || !newFaqA.trim()) return;
    setForm(f => ({ ...f, faqsArr: [...(f.faqsArr || []), { q: newFaqQ.trim(), a: newFaqA.trim() }] }));
    setNewFaqQ(''); setNewFaqA('');
  }
  function removeFaq(i: number) {
    setForm(f => ({ ...f, faqsArr: (f.faqsArr || []).filter((_, idx) => idx !== i) }));
  }

  function handleProviderChange(provider: 'openai' | 'gemini') {
    const defaultModel = provider === 'gemini' ? 'gemini-2.0-flash' : 'gpt-4o-mini';
    setForm(f => ({ ...f, aiProvider: provider, model: defaultModel }));
    setDynamicModels([]);
    setModelsError('');
  }

  async function handleLoadModels() {
    setModelsLoading(true);
    setModelsError('');
    try {
      let res: { models: { id: string; label: string }[] };
      const newKey = form.apiKey?.trim() || '';
      if (newKey) {
        // User entered a new key — use it directly
        res = await aiBotApi.listModels(form.aiProvider as string, newKey);
      } else if (editingId) {
        // Existing config — use the stored key on the server (no re-entry needed)
        res = await aiBotApi.listModelsForConfig(editingId);
        if (res.models.length === 0) {
          setModelsError('No API key saved for this config. Enter your key above first.');
          setModelsLoading(false);
          return;
        }
      } else {
        setModelsError('Enter your API key first, then click Load from API.');
        setModelsLoading(false);
        return;
      }
      if (res.models.length === 0) {
        setModelsError('No generateContent-capable models found for this key.');
      } else {
        setDynamicModels(res.models);
        if (!res.models.find(m => m.id === form.model)) {
          setForm(f => ({ ...f, model: res.models[0].id }));
        }
      }
    } catch (e) {
      setModelsError(e instanceof Error ? e.message : 'Failed to load models');
    } finally {
      setModelsLoading(false);
    }
  }

  const staticModelOptions = form.aiProvider === 'gemini' ? GEMINI_MODELS : OPENAI_MODELS;
  const modelOptions = dynamicModels.length > 0
    ? dynamicModels.map(m => ({ value: m.id, label: m.label }))
    : staticModelOptions;
  const isSaving = createMutation.isPending || updateMutation.isPending;
  const isCreating = !editingId;
  const isCasual = form.botType === 'casual';

  return (
    <div style={{ padding: '24px', maxWidth: '1100px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <Bot size={28} style={{ color: 'var(--primary)' }} />
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>AI Bot</h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Automatically respond to WhatsApp messages using OpenAI or Google Gemini
          </p>
        </div>
        {status && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {status.activeCount > 0 ? (
              <span style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '6px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600,
                background: 'var(--success-bg, #d1fae5)', color: 'var(--success-text, #065f46)',
              }}>
                <CheckCircle size={13} /> {status.activeCount} Active
              </span>
            ) : (
              <span style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '6px 12px', borderRadius: '20px', fontSize: '0.8rem',
                background: 'var(--muted, #f3f4f6)', color: 'var(--text-secondary)',
              }}>
                <Bot size={13} /> {status.configCount} Configs
              </span>
            )}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '24px', alignItems: 'start' }}>

        {/* Left: Provider Keys + configs list */}
        <div>

          {/* ── Provider Keys Panel ─────────────────────────────────────── */}
          <div style={{
            border: '1px solid var(--border)', borderRadius: '12px',
            background: 'var(--card-bg, var(--surface))', marginBottom: '20px', overflow: 'hidden',
          }}>
            <div style={{
              padding: '14px 18px', borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'var(--surface-alt, var(--surface))',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Key size={16} style={{ color: 'var(--primary)' }} />
                <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Provider API Keys</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  — stored once, shared by all bots
                </span>
              </div>
              {!pkForm && (
                <button
                  onClick={() => { setPkForm({ provider: 'gemini', apiKey: '', label: '' }); setPkError(''); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    padding: '5px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600,
                    background: 'var(--primary)', color: '#fff', border: 'none', cursor: 'pointer',
                  }}
                >
                  <Plus size={13} /> Add Key
                </button>
              )}
            </div>

            <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Existing saved keys */}
              {(['gemini', 'openai'] as const).map(provider => {
                const saved = providerKeys.find((k: AiProviderKey) => k.provider === provider);
                const providerColor = provider === 'gemini' ? '#1b5e20' : '#1d4ed8';
                const providerBg = provider === 'gemini' ? '#e8f5e9' : '#eff6ff';
                const providerName = provider === 'gemini' ? 'Google Gemini' : 'OpenAI';
                return (
                  <div key={provider} style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '10px 14px', borderRadius: '8px',
                    border: `1px solid ${saved ? 'var(--success-border, #a7f3d0)' : 'var(--border)'}`,
                    background: saved ? 'var(--success-bg, #f0fdf4)' : 'var(--surface-alt, var(--surface))',
                  }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: '8px', fontSize: '0.72rem', fontWeight: 700,
                      background: providerBg, color: providerColor, flexShrink: 0,
                    }}>{providerName}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {saved ? (
                        <>
                          <div style={{ fontSize: '0.85rem', fontWeight: 500, fontFamily: 'monospace' }}>
                            {saved.maskedKey}
                          </div>
                          {saved.label && saved.label !== provider && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{saved.label}</div>
                          )}
                        </>
                      ) : (
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>No key saved</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                      <button
                        onClick={() => { setPkForm({ provider, apiKey: '', label: '' }); setPkError(''); }}
                        style={{
                          padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600,
                          border: '1px solid var(--border)', background: 'transparent',
                          color: 'var(--text)', cursor: 'pointer',
                        }}
                      >
                        {saved ? 'Replace' : 'Connect'}
                      </button>
                      {saved && (
                        <button
                          onClick={() => deleteProviderKeyMutation.mutate(saved.id)}
                          style={{
                            padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem',
                            border: '1px solid var(--danger, #ef4444)', background: 'transparent',
                            color: 'var(--danger, #ef4444)', cursor: 'pointer',
                          }}
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Add / Replace form */}
              {pkForm && (
                <div style={{
                  border: '1px solid var(--primary)', borderRadius: '8px',
                  padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px',
                  background: 'var(--primary-subtle, #eff6ff)',
                }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--primary)' }}>
                    {pkForm.provider === 'gemini' ? 'Connect Google Gemini Key' : 'Connect OpenAI Key'}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Provider</label>
                      <select
                        value={pkForm.provider}
                        onChange={e => setPkForm(f => f ? { ...f, provider: e.target.value as 'openai' | 'gemini' } : f)}
                        style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '0.85rem' }}
                      >
                        <option value="gemini">Google Gemini</option>
                        <option value="openai">OpenAI</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Label (optional)</label>
                      <input
                        value={pkForm.label}
                        onChange={e => setPkForm(f => f ? { ...f, label: e.target.value } : f)}
                        placeholder="e.g. Production key"
                        style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '0.85rem', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                      API Key *
                    </label>
                    <input
                      type="password"
                      value={pkForm.apiKey}
                      onChange={e => setPkForm(f => f ? { ...f, apiKey: e.target.value } : f)}
                      placeholder={pkForm.provider === 'gemini' ? 'AIza...' : 'sk-...'}
                      style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '0.85rem', boxSizing: 'border-box' }}
                    />
                  </div>
                  {pkError && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--danger, #b91c1c)' }}>
                      <AlertCircle size={13} /> {pkError}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => { setPkForm(null); setPkError(''); }}
                      style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: '0.82rem' }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveProviderKey}
                      disabled={pkSaving}
                      style={{
                        padding: '6px 16px', borderRadius: '6px', border: 'none',
                        background: 'var(--primary)', color: '#fff', cursor: pkSaving ? 'not-allowed' : 'pointer',
                        fontWeight: 600, fontSize: '0.82rem', opacity: pkSaving ? 0.7 : 1,
                      }}
                    >
                      {pkSaving ? 'Saving…' : 'Save Key'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Bot Configurations ───────────────────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>
              Bot Configurations ({configs.length})
            </h2>
            {editingId && (
              <button onClick={resetForm} style={{
                padding: '6px 14px', borderRadius: '6px', border: '1px solid var(--border)',
                background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: '0.875rem',
              }}>
                + New Config
              </button>
            )}
          </div>

          {isLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading...</div>
          ) : configs.length === 0 ? (
            <div style={{
              padding: '48px 24px', textAlign: 'center', border: '2px dashed var(--border)',
              borderRadius: '12px', color: 'var(--text-secondary)',
            }}>
              <Bot size={40} style={{ marginBottom: '12px', opacity: 0.4 }} />
              <p style={{ margin: '0 0 4px', fontWeight: 500 }}>No AI bots yet</p>
              <p style={{ margin: 0, fontSize: '0.875rem' }}>Fill in the form on the right to create your first bot.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {configs.map(c => {
                const expanded = expandedId === c.id;
                const services = parseServices(c.companyServices);
                const faqs = parseFaqs(c.companyFaqs);
                const providerLabel = c.aiProvider === 'gemini' ? '✦ Gemini' : '⬡ OpenAI';
                const typeLabel = c.botType === 'casual' ? 'Casual' : 'Company';
                const hasOwnKey = !!c.apiKey;
                return (
                  <div key={c.id} style={{
                    border: `1px solid ${editingId === c.id ? 'var(--primary)' : 'var(--border)'}`,
                    borderRadius: '10px', background: 'var(--card-bg, var(--surface))',
                    overflow: 'hidden',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px' }}>
                      <Bot size={20} style={{ color: c.enabled ? 'var(--primary)' : 'var(--text-secondary)', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                          {c.botType === 'casual' ? 'Casual Bot' : (c.companyName || 'Unnamed Bot')}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{
                            padding: '1px 7px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 600,
                            background: c.aiProvider === 'gemini' ? '#e8f5e9' : '#eff6ff',
                            color: c.aiProvider === 'gemini' ? '#1b5e20' : '#1d4ed8',
                          }}>{providerLabel}</span>
                          <span style={{
                            padding: '1px 7px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 500,
                            background: 'var(--muted, #f3f4f6)', color: 'var(--text-secondary)',
                          }}>{typeLabel}</span>
                          <code style={{ fontSize: '0.7rem' }}>{c.sessionId}</code>
                          <span>· {c.model}</span>
                          {hasOwnKey && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '2px', color: 'var(--success-text, #065f46)' }}>
                              <Key size={10} /> own key
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        title={c.enabled ? 'Disable bot' : 'Enable bot'}
                        onClick={() => toggleMutation.mutate({ id: c.id, enabled: !c.enabled })}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: c.enabled ? 'var(--primary)' : 'var(--text-secondary)' }}
                      >
                        {c.enabled ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                      </button>

                      <span style={{
                        padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600,
                        background: c.enabled ? 'var(--success-bg, #d1fae5)' : 'var(--muted, #f3f4f6)',
                        color: c.enabled ? 'var(--success-text, #065f46)' : 'var(--text-secondary)',
                      }}>
                        {c.enabled ? 'Active' : 'Inactive'}
                      </span>

                      <button onClick={() => startEdit(c)} style={{
                        padding: '5px 12px', borderRadius: '6px', border: '1px solid var(--border)',
                        background: 'transparent', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text)',
                      }}>Edit</button>

                      <button onClick={() => deleteMutation.mutate(c.id)} style={{
                        background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger, #ef4444)', padding: '4px',
                      }}><Trash2 size={16} /></button>

                      <button onClick={() => setExpandedId(expanded ? null : c.id)} style={{
                        background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px',
                      }}>
                        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>

                    {expanded && (
                      <div style={{ padding: '0 16px 14px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                        {c.botType === 'casual' ? (
                          <p style={{ margin: '0 0 6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            Casual conversation bot · {c.tone} tone
                          </p>
                        ) : (
                          <>
                            <p style={{ margin: '0 0 8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                              {c.companyDescription || 'No description'}
                            </p>
                            {services.length > 0 && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                                {services.map((s, i) => (
                                  <span key={i} style={{
                                    padding: '2px 10px', borderRadius: '20px', fontSize: '0.75rem',
                                    background: 'var(--primary-subtle, #eff6ff)', color: 'var(--primary)',
                                  }}>{s}</span>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                        {faqs.length > 0 && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {faqs.length} FAQ{faqs.length !== 1 ? 's' : ''} · Tone: {c.tone} · Lang: {c.responseLanguage}
                          </div>
                        )}
                        {c.systemPrompt && (
                          <div style={{ marginTop: '8px', fontSize: '0.78rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                            Custom system prompt configured
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Config form */}
        <div style={{
          border: '1px solid var(--border)', borderRadius: '12px',
          background: 'var(--card-bg, var(--surface))', overflow: 'hidden', position: 'sticky', top: '24px',
        }}>
          {/* Form header */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface-alt, var(--surface))' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={18} style={{ color: 'var(--primary)' }} />
              <span style={{ fontWeight: 600 }}>{isCreating ? 'New AI Bot' : 'Edit AI Bot'}</span>
            </div>
          </div>

          {/* Tab bar */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
            {[
              { key: 'company', label: isCasual ? 'General' : 'Company', icon: Building2 },
              { key: 'ai', label: 'AI Settings', icon: Settings2 },
              { key: 'test', label: 'Test', icon: MessageCircle },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                disabled={tab.key === 'test' && !editingId}
                style={{
                  flex: 1, padding: '10px 6px', border: 'none', cursor: tab.key === 'test' && !editingId ? 'not-allowed' : 'pointer',
                  background: activeTab === tab.key ? 'var(--primary)' : 'transparent',
                  color: activeTab === tab.key ? '#fff' : 'var(--text-secondary)',
                  fontSize: '0.8rem', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                  opacity: tab.key === 'test' && !editingId ? 0.5 : 1,
                  transition: 'all 0.15s',
                }}
              >
                <tab.icon size={13} />
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ padding: '16px 20px' }}>

            {/* GENERAL / COMPANY TAB */}
            {activeTab === 'company' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                {/* Bot Type */}
                <div>
                  <label style={labelStyle}>Bot Type</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {[
                      { value: 'company', label: 'Company', desc: 'Customer service with company info', Icon: Building2 },
                      { value: 'casual', label: 'Casual', desc: 'General conversation assistant', Icon: Coffee },
                    ].map(t => (
                      <button
                        key={t.value}
                        onClick={() => setForm(f => ({ ...f, botType: t.value as 'company' | 'casual' }))}
                        style={{
                          padding: '10px 8px', borderRadius: '8px', cursor: 'pointer',
                          border: `2px solid ${form.botType === t.value ? 'var(--primary)' : 'var(--border)'}`,
                          background: form.botType === t.value ? 'var(--primary-subtle, #eff6ff)' : 'transparent',
                          color: form.botType === t.value ? 'var(--primary)' : 'var(--text)', textAlign: 'center',
                        }}
                      >
                        <t.Icon size={18} style={{ marginBottom: '4px' }} />
                        <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>{t.label}</div>
                        <div style={{ fontSize: '0.7rem', opacity: 0.7, marginTop: '2px', lineHeight: 1.3 }}>{t.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Session</label>
                  <select
                    value={form.sessionId || '*'}
                    onChange={e => setForm(f => ({ ...f, sessionId: e.target.value }))}
                    style={inputStyle}
                  >
                    <option value="*">* — All sessions</option>
                    {sessions.map(s => (
                      <option key={s.id} value={s.id}>{s.name || s.id}</option>
                    ))}
                  </select>
                  <div style={hintStyle}>
                    {sessions.length === 0
                      ? 'No sessions found. Connect a WhatsApp account in Sessions first.'
                      : 'Choose a specific session or "All sessions" to respond on every connected number.'}
                  </div>
                </div>

                {!isCasual && (
                  <>
                    <div>
                      <label style={labelStyle}>Company Name *</label>
                      <input
                        value={form.companyName || ''}
                        onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))}
                        placeholder="Acme Corp"
                        style={inputStyle}
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Company Description</label>
                      <textarea
                        value={form.companyDescription || ''}
                        onChange={e => setForm(f => ({ ...f, companyDescription: e.target.value }))}
                        placeholder="We are a company that provides..."
                        rows={3}
                        style={{ ...inputStyle, resize: 'vertical' }}
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Services / Products</label>
                      <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                        <input
                          value={newService}
                          onChange={e => setNewService(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addService())}
                          placeholder="Add a service..."
                          style={{ ...inputStyle, flex: 1, margin: 0 }}
                        />
                        <button onClick={addService} style={addBtnStyle}><Plus size={14} /></button>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {(form.servicesArr || []).map((s, i) => (
                          <span key={i} style={{
                            display: 'flex', alignItems: 'center', gap: '4px',
                            padding: '3px 10px', borderRadius: '20px', fontSize: '0.8rem',
                            background: 'var(--primary-subtle, #eff6ff)', color: 'var(--primary)',
                          }}>
                            {s}
                            <button onClick={() => removeService(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: '0', lineHeight: 1 }}>×</button>
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label style={labelStyle}>FAQs</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
                        <input value={newFaqQ} onChange={e => setNewFaqQ(e.target.value)} placeholder="Question" style={{ ...inputStyle, margin: 0 }} />
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <input value={newFaqA} onChange={e => setNewFaqA(e.target.value)} placeholder="Answer" style={{ ...inputStyle, flex: 1, margin: 0 }} />
                          <button onClick={addFaq} style={addBtnStyle}><Plus size={14} /></button>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {(form.faqsArr || []).map((f, i) => (
                          <div key={i} style={{
                            padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)',
                            fontSize: '0.8rem', position: 'relative',
                          }}>
                            <div style={{ fontWeight: 600, marginBottom: '2px' }}>Q: {f.q}</div>
                            <div style={{ color: 'var(--text-secondary)', paddingRight: '20px' }}>A: {f.a}</div>
                            <button onClick={() => removeFaq(i)} style={{
                              position: 'absolute', top: '6px', right: '8px',
                              background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger, #ef4444)',
                            }}><Trash2 size={12} /></button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

              </div>
            )}

            {/* AI SETTINGS TAB */}
            {activeTab === 'ai' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                {/* Provider */}
                <div>
                  <label style={labelStyle}>AI Provider</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {[
                      { value: 'openai', label: 'OpenAI', sublabel: 'GPT models', color: '#10a37f' },
                      { value: 'gemini', label: 'Google Gemini', sublabel: 'Gemini models', color: '#4285F4' },
                    ].map(p => (
                      <button
                        key={p.value}
                        onClick={() => handleProviderChange(p.value as 'openai' | 'gemini')}
                        style={{
                          padding: '10px 8px', borderRadius: '8px', cursor: 'pointer',
                          border: `2px solid ${form.aiProvider === p.value ? p.color : 'var(--border)'}`,
                          background: form.aiProvider === p.value ? `${p.color}15` : 'transparent',
                          color: form.aiProvider === p.value ? p.color : 'var(--text)', textAlign: 'center',
                        }}
                      >
                        <Zap size={16} style={{ marginBottom: '3px' }} />
                        <div style={{ fontWeight: 700, fontSize: '0.82rem' }}>{p.label}</div>
                        <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>{p.sublabel}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* API Key */}
                {(() => {
                  const savedProviderKey = providerKeys.find((k: AiProviderKey) => k.provider === form.aiProvider);
                  const hasSavedKey = !!savedProviderKey;
                  const hasOwnKey = !!form.apiKey || (editingId && configs.find(c => c.id === editingId)?.apiKey);
                  return (
                    <div>
                      <label style={labelStyle}>
                        <Key size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                        {form.aiProvider === 'gemini' ? 'API Key (override)' : 'API Key (override)'}
                      </label>

                      {hasSavedKey && !hasOwnKey && (
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: '8px',
                          padding: '8px 12px', borderRadius: '8px', marginBottom: '8px',
                          background: 'var(--success-bg, #f0fdf4)', border: '1px solid var(--success-border, #a7f3d0)',
                          fontSize: '0.8rem', color: 'var(--success-text, #065f46)',
                        }}>
                          <CheckCircle size={14} />
                          <span>Using saved <strong>{form.aiProvider === 'gemini' ? 'Google Gemini' : 'OpenAI'}</strong> key from Provider Keys</span>
                          <code style={{ marginLeft: 'auto', fontSize: '0.72rem', opacity: 0.7 }}>{savedProviderKey.maskedKey}</code>
                        </div>
                      )}

                      <div style={{ position: 'relative' }}>
                        <input
                          type={showApiKey ? 'text' : 'password'}
                          value={form.apiKey || ''}
                          onChange={e => setForm(f => ({ ...f, apiKey: e.target.value }))}
                          placeholder={
                            hasSavedKey
                              ? 'Leave blank to use saved Provider Key above'
                              : editingId
                                ? '••••••• (leave blank to keep existing)'
                                : form.aiProvider === 'gemini' ? 'AIza...' : 'sk-...'
                          }
                          style={{ ...inputStyle, paddingRight: '40px' }}
                        />
                        <button
                          onClick={() => setShowApiKey(v => !v)}
                          style={{
                            position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                            background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '2px',
                          }}
                        >
                          {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                      <div style={hintStyle}>
                        {hasSavedKey
                          ? 'Optional — only fill in if you want this bot to use a different key than the saved one.'
                          : <>No saved key for this provider yet. <span
                              onClick={() => { setPkForm({ provider: form.aiProvider as 'openai' | 'gemini', apiKey: '', label: '' }); setPkError(''); }}
                              style={{ color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline' }}
                            >Add one in Provider Keys</span> to avoid entering it here, or enter it below.</>
                        }
                      </div>
                    </div>
                  );
                })()}

                {/* Model */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label style={{ ...labelStyle, marginBottom: 0 }}>Model</label>
                    <button
                      onClick={handleLoadModels}
                      disabled={modelsLoading}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '4px',
                        padding: '3px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600,
                        border: '1px solid var(--primary)', background: 'transparent',
                        color: 'var(--primary)', cursor: modelsLoading ? 'not-allowed' : 'pointer',
                        opacity: modelsLoading ? 0.6 : 1,
                      }}
                    >
                      <Zap size={12} />
                      {modelsLoading ? 'Loading…' : dynamicModels.length > 0 ? 'Refresh' : 'Load from API'}
                    </button>
                  </div>
                  <select
                    value={form.model || (form.aiProvider === 'gemini' ? 'gemini-2.0-flash' : 'gpt-4o-mini')}
                    onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
                    style={inputStyle}
                  >
                    {modelOptions.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                  {modelsError && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginTop: '4px', fontSize: '0.75rem', color: 'var(--danger, #b91c1c)' }}>
                      <AlertCircle size={12} style={{ flexShrink: 0, marginTop: '1px' }} />
                      {modelsError}
                    </div>
                  )}
                  {dynamicModels.length > 0 && !modelsError && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--success-text, #065f46)', marginTop: '3px' }}>
                      ✓ {dynamicModels.length} models loaded from your API key
                    </div>
                  )}
                  {dynamicModels.length === 0 && !modelsError && (
                    <div style={hintStyle}>Showing defaults. Click "Load from API" to see all models available on your key.</div>
                  )}
                </div>

                {/* Tone */}
                <div>
                  <label style={labelStyle}>Tone</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {TONE_OPTIONS.map(t => (
                      <button
                        key={t.value}
                        onClick={() => setForm(f => ({ ...f, tone: t.value as AiBotConfig['tone'] }))}
                        style={{
                          flex: 1, padding: '8px 6px', borderRadius: '8px', cursor: 'pointer',
                          border: `2px solid ${form.tone === t.value ? 'var(--primary)' : 'var(--border)'}`,
                          background: form.tone === t.value ? 'var(--primary-subtle, #eff6ff)' : 'transparent',
                          color: form.tone === t.value ? 'var(--primary)' : 'var(--text)', textAlign: 'center',
                        }}
                      >
                        <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>{t.label}</div>
                        <div style={{ fontSize: '0.7rem', opacity: 0.7, marginTop: '2px' }}>{t.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Response Language */}
                <div>
                  <label style={labelStyle}>Response Language</label>
                  <input
                    value={form.responseLanguage || 'auto'}
                    onChange={e => setForm(f => ({ ...f, responseLanguage: e.target.value }))}
                    placeholder="auto (match user) or e.g. English, Spanish"
                    style={inputStyle}
                  />
                  <div style={hintStyle}><code>auto</code> = match the user's language automatically.</div>
                </div>

                {/* Max Tokens */}
                <div>
                  <label style={labelStyle}>Max Tokens ({form.maxTokens})</label>
                  <input
                    type="range" min={50} max={2000} step={50}
                    value={form.maxTokens || 500}
                    onChange={e => setForm(f => ({ ...f, maxTokens: parseInt(e.target.value) }))}
                    style={{ width: '100%' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    <span>50 (short)</span><span>2000 (detailed)</span>
                  </div>
                </div>

                {/* Fallback */}
                <div>
                  <label style={labelStyle}>Fallback Message</label>
                  <input
                    value={form.fallbackMessage || ''}
                    onChange={e => setForm(f => ({ ...f, fallbackMessage: e.target.value }))}
                    placeholder="Sorry, I cannot respond right now..."
                    style={inputStyle}
                  />
                  <div style={hintStyle}>Sent when AI fails or is unconfigured.</div>
                </div>

                {/* System Prompt */}
                <div>
                  <label style={labelStyle}>
                    System Prompt <span style={{ fontWeight: 400, color: 'var(--text-secondary)' }}>(optional override)</span>
                  </label>
                  <textarea
                    value={form.systemPrompt || ''}
                    onChange={e => setForm(f => ({ ...f, systemPrompt: e.target.value }))}
                    placeholder="Leave blank to auto-generate from settings above..."
                    rows={5}
                    style={{ ...inputStyle, resize: 'vertical', fontFamily: 'monospace', fontSize: '0.8rem' }}
                  />
                  <div style={{ ...hintStyle, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Info size={11} /> Overrides the auto-generated prompt entirely.
                  </div>
                </div>

                {/* Enable toggle */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Enable Bot</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Start responding to messages</div>
                  </div>
                  <button
                    onClick={() => setForm(f => ({ ...f, enabled: !f.enabled }))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: form.enabled ? 'var(--primary)' : 'var(--text-secondary)' }}
                  >
                    {form.enabled ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                  </button>
                </div>
              </div>
            )}

            {/* TEST TAB */}
            {activeTab === 'test' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'var(--surface-alt, var(--muted, #f9fafb))', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Test your AI bot with a sample message before enabling it in production.
                  {!editingId && ' (Save the config first to enable testing.)'}
                </div>

                <div>
                  <label style={labelStyle}>Test Message</label>
                  <textarea
                    value={testMessage}
                    onChange={e => setTestMessage(e.target.value)}
                    placeholder="Hi, what services do you offer?"
                    rows={3}
                    style={{ ...inputStyle, resize: 'vertical' }}
                    onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleTest(); }}
                  />
                  <div style={hintStyle}>Press Ctrl+Enter to send.</div>
                </div>

                <button
                  onClick={handleTest}
                  disabled={testLoading || !testMessage.trim()}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    padding: '10px', borderRadius: '8px', border: 'none',
                    background: testLoading || !testMessage.trim() ? 'var(--muted, #e5e7eb)' : 'var(--primary)',
                    color: testLoading || !testMessage.trim() ? 'var(--text-secondary)' : '#fff',
                    cursor: testLoading || !testMessage.trim() ? 'not-allowed' : 'pointer',
                    fontWeight: 600, fontSize: '0.875rem',
                  }}
                >
                  <Send size={16} />
                  {testLoading ? 'Thinking...' : 'Send to AI'}
                </button>

                {testError && (
                  <div style={{
                    display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '10px 12px',
                    borderRadius: '8px', background: 'var(--danger-bg, #fee2e2)', color: 'var(--danger, #b91c1c)',
                    fontSize: '0.82rem',
                  }}>
                    <AlertCircle size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <strong>API Error:</strong> {testError}
                      <div style={{ marginTop: '4px', opacity: 0.8 }}>
                        Check your API key in the AI Settings tab and make sure it has access to the selected model.
                      </div>
                    </div>
                  </div>
                )}

                {testReply && (
                  <div>
                    <label style={labelStyle}>AI Response</label>
                    <div style={{
                      padding: '12px', borderRadius: '8px',
                      background: testError ? 'var(--muted, #f3f4f6)' : 'var(--primary-subtle, #eff6ff)',
                      border: `1px solid ${testError ? 'var(--border)' : 'var(--primary-border, #bfdbfe)'}`,
                      fontSize: '0.875rem', whiteSpace: 'pre-wrap', lineHeight: 1.6,
                    }}>
                      <Bot size={14} style={{ color: testError ? 'var(--text-secondary)' : 'var(--primary)', marginRight: '6px', verticalAlign: 'middle' }} />
                      {testReply}
                      {testError && <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '8px' }}>(fallback)</span>}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Error */}
            {saveError && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px',
                borderRadius: '8px', background: 'var(--danger-bg, #fee2e2)', color: 'var(--danger, #b91c1c)',
                fontSize: '0.85rem', marginTop: '8px',
              }}>
                <AlertCircle size={14} />
                {saveError}
              </div>
            )}

            {/* Save / Cancel buttons */}
            {activeTab !== 'test' && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                {editingId && (
                  <button onClick={resetForm} style={{
                    flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--border)',
                    background: 'transparent', cursor: 'pointer', color: 'var(--text)', fontWeight: 500,
                  }}>Cancel</button>
                )}
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  style={{
                    flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    padding: '10px', borderRadius: '8px', border: 'none',
                    background: 'var(--primary)', color: '#fff',
                    cursor: isSaving ? 'not-allowed' : 'pointer', fontWeight: 600, opacity: isSaving ? 0.7 : 1,
                  }}
                >
                  <Save size={16} />
                  {isSaving ? 'Saving...' : isCreating ? 'Create Bot' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '0.85rem',
};
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: '7px',
  border: '1px solid var(--border)', background: 'var(--input-bg, var(--surface))',
  color: 'var(--text)', fontSize: '0.875rem', boxSizing: 'border-box', marginBottom: '2px',
};
const hintStyle: React.CSSProperties = {
  fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '3px',
};
const addBtnStyle: React.CSSProperties = {
  padding: '8px 10px', borderRadius: '7px', border: '1px solid var(--border)',
  background: 'var(--primary)', color: '#fff', cursor: 'pointer', flexShrink: 0,
  display: 'flex', alignItems: 'center',
};
