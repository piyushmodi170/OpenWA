import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  Terminal, 
  ShieldAlert, 
  Database, 
  MessageSquare, 
  Gauge, 
  User, 
  Settings2, 
  Send, 
  RotateCcw,
  Plus,
  Target,
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Info,
  SlidersHorizontal,
  Workflow,
  Zap,
  ThumbsUp,
  ThumbsDown,
  Wrench
} from 'lucide-react';
import { text } from 'stream/consumers';

export function TeachingCockpit() {
  const [mode, setMode] = useState<'flight' | 'teach'>('flight');
  const [employee, setEmployee] = useState('Alex (Sales)');
  const [inputText, setInputText] = useState('');
  const [chatHistory, setChatHistory] = useState([
    { role: 'user', content: 'What is your refund policy for annual plans?' },
    { role: 'ai', content: 'For annual plans, we offer a prorated refund within the first 30 days. After 30 days, we do not offer refunds, but you will retain access until the end of your billing cycle.' }
  ]);
  const [isTyping, setIsTyping] = useState(false);

  // Stats & Data
  const stats = {
    score: 73,
    documents: 8,
    words: 24891,
    examples: 12,
    rules: 5
  };

  const rules = [
    { text: 'NEVER mention competitors', type: 'strict', active: true },
    { text: 'ALWAYS end with a question', type: 'style', active: true },
    { text: 'CONDITIONAL escalate to human if angry', type: 'trigger', active: true }
  ];

  const documents = [
    { name: 'Product Catalog 2024', status: 'indexed', size: '1.2MB' },
    { name: 'FAQ Database', status: 'indexed', size: '450KB' },
    { name: 'Sales Script (Q3)', status: 'processing', size: '12KB' },
  ];

  const examples = [
    { trigger: 'Pricing inquiry', count: 4 },
    { trigger: 'Refund request', count: 3 },
    { trigger: 'Demo booking', count: 5 },
  ];

  const handleSend = () => {
    if (!inputText.trim()) return;
    setChatHistory([...chatHistory, { role: 'user', content: inputText }]);
    setInputText('');
    setIsTyping(true);
    
    setTimeout(() => {
      setIsTyping(false);
      setChatHistory(prev => [...prev, { 
        role: 'ai', 
        content: 'I can help with that. Based on my current training protocols, I would need to check the specific context of your request. Is there a particular product you are asking about?' 
      }]);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#0a0f18] text-slate-300 font-sans selection:bg-cyan-500/30 overflow-hidden flex flex-col" style={{ backgroundImage: 'radial-gradient(circle at 50% 0%, #1e293b 0%, #0a0f18 70%)' }}>
      <style dangerouslySetInnerHTML={{__html: \`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Inter:wght@300;400;500;600;700&display=swap');
        
        .font-mono { font-family: 'JetBrains Mono', monospace; }
        .font-sans { font-family: 'Inter', sans-serif; }
        
        .scanline {
          position: absolute;
          inset: 0;
          background: linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0) 50%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.1));
          background-size: 100% 4px;
          pointer-events: none;
          z-index: 50;
          opacity: 0.15;
        }

        .cockpit-panel {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(51, 65, 85, 0.5);
          box-shadow: inset 0 0 20px rgba(0,0,0,0.5), 0 4px 20px rgba(0,0,0,0.3);
          backdrop-filter: blur(10px);
        }

        .glow-cyan { text-shadow: 0 0 10px rgba(6, 182, 212, 0.7); }
        .glow-amber { text-shadow: 0 0 10px rgba(245, 158, 11, 0.7); }
        .glow-emerald { text-shadow: 0 0 10px rgba(16, 185, 129, 0.7); }

        .gauge-circle {
          stroke-dasharray: 283;
          stroke-dashoffset: calc(283 - (283 * 73) / 100);
          transition: stroke-dashoffset 1s ease-out;
        }

        @keyframes pulse-ring {
          0% { box-shadow: 0 0 0 0 rgba(6, 182, 212, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(6, 182, 212, 0); }
          100% { box-shadow: 0 0 0 0 rgba(6, 182, 212, 0); }
        }

        .ai-cursor::after {
          content: '▋';
          animation: blink 1s step-start infinite;
          color: #06b6d4;
          margin-left: 4px;
        }

        @keyframes blink { 50% { opacity: 0; } }
      \`}} />

      <div className="scanline"></div>

      {/* Header / Top Nav */}
      <header className="h-16 border-b border-slate-800 bg-[#0a0f18]/80 backdrop-blur-md flex items-center justify-between px-6 z-10">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-cyan-400">
            <Bot className="w-6 h-6" />
            <span className="font-mono font-bold tracking-wider text-lg glow-cyan">AI_SYS_CMD</span>
          </div>
          <div className="h-6 w-px bg-slate-700 mx-2"></div>
          <div className="flex items-center gap-2 bg-slate-800/50 rounded-md px-3 py-1.5 border border-slate-700 cursor-pointer hover:bg-slate-800 transition-colors">
            <User className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-200">{employee}</span>
            <ChevronDown className="w-4 h-4 text-slate-500" />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800">
            <button 
              onClick={() => setMode('flight')}
              className={\`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all \${mode === 'flight' ? 'bg-cyan-950/50 text-cyan-400 border border-cyan-800/50 shadow-[0_0_15px_rgba(6,182,212,0.15)]' : 'text-slate-500 hover:text-slate-300'}\`}
            >
              <Activity className="w-4 h-4" />
              TEST FLIGHT
            </button>
            <button 
              onClick={() => setMode('teach')}
              className={\`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all \${mode === 'teach' ? 'bg-amber-950/50 text-amber-400 border border-amber-800/50 shadow-[0_0_15px_rgba(245,158,11,0.15)]' : 'text-slate-500 hover:text-slate-300'}\`}
            >
              <Wrench className="w-4 h-4" />
              TEACHING MODE
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden z-10 p-6 gap-6">
        
        {/* Left Sidebar - Gauges & Inventory */}
        <div className="w-[360px] flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
          
          {/* Main Score Gauge */}
          <div className="cockpit-panel rounded-xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl group-hover:bg-cyan-500/10 transition-colors"></div>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xs font-mono text-slate-400 uppercase tracking-widest mb-1">System Integrity</h3>
                <div className="text-sm font-medium text-slate-200">Training Score</div>
              </div>
              <Target className="w-5 h-5 text-cyan-500" />
            </div>
            
            <div className="flex items-center gap-6">
              <div className="relative w-24 h-24 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle className="text-slate-800" strokeWidth="8" stroke="currentColor" fill="transparent" r="45" cx="50" cy="50" />
                  <circle className="text-cyan-500 gauge-circle" strokeWidth="8" strokeDasharray="283" strokeLinecap="round" stroke="currentColor" fill="transparent" r="45" cx="50" cy="50" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-mono font-bold text-cyan-400 glow-cyan">{stats.score}</span>
                </div>
              </div>
              <div className="flex-1 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-500">KNOWLEDGE</span>
                  <span className="text-emerald-400">OPTIMAL</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 w-[85%] shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                </div>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-500">BEHAVIOR</span>
                  <span className="text-amber-400">WARNING</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 w-[60%] shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Active Rules */}
          <div className="cockpit-panel rounded-xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs font-mono text-slate-300 uppercase tracking-widest">Active Directives</h3>
              </div>
              <span className="text-xs font-mono text-slate-500">{stats.rules} ACTIVE</span>
            </div>
            <div className="space-y-2">
              {rules.map((rule, idx) => (
                <div key={idx} className="flex items-start gap-3 p-2.5 rounded bg-slate-800/30 border border-slate-700/50 hover:bg-slate-800/50 transition-colors">
                  <div className={\`mt-0.5 w-2 h-2 rounded-full shadow-[0_0_5px_currentColor] \${
                    rule.type === 'strict' ? 'text-red-500 bg-red-500' : 
                    rule.type === 'style' ? 'text-cyan-500 bg-cyan-500' : 'text-amber-500 bg-amber-500'
                  }\`}></div>
                  <span className="text-sm text-slate-300 font-medium leading-tight">{rule.text}</span>
                </div>
              ))}
            </div>
            <button className="flex items-center justify-center gap-2 w-full py-2 border border-slate-700 border-dashed rounded text-xs font-mono text-slate-400 hover:text-slate-200 hover:border-slate-500 transition-colors mt-2">
              <Plus className="w-3 h-3" /> ADD DIRECTIVE
            </button>
          </div>

          {/* Knowledge Base */}
          <div className="cockpit-panel rounded-xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-500" />
                <h3 className="text-xs font-mono text-slate-300 uppercase tracking-widest">Data Banks</h3>
              </div>
              <span className="text-xs font-mono text-slate-500">{stats.words.toLocaleString()} WDS</span>
            </div>
            <div className="space-y-2">
              {documents.map((doc, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded bg-slate-800/30 border border-slate-700/50">
                  <div className="flex items-center gap-2 truncate pr-4">
                    {doc.status === 'indexed' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                    ) : (
                      <RotateCcw className="w-3.5 h-3.5 text-amber-500 animate-spin flex-shrink-0" />
                    )}
                    <span className="text-sm text-slate-300 truncate">{doc.name}</span>
                  </div>
                  <span className="text-xs font-mono text-slate-500 flex-shrink-0">{doc.size}</span>
                </div>
              ))}
            </div>
            <button className="flex items-center justify-center gap-2 w-full py-2 border border-slate-700 border-dashed rounded text-xs font-mono text-slate-400 hover:text-slate-200 hover:border-slate-500 transition-colors mt-2">
              <Plus className="w-3 h-3" /> UPLOAD DATA
            </button>
          </div>

        </div>

        {/* Right Main Area */}
        <div className="flex-1 flex flex-col gap-6">
          
          {mode === 'flight' ? (
            // FLIGHT MODE (Simulator)
            <div className="flex-1 flex flex-col cockpit-panel rounded-xl overflow-hidden border-cyan-900/30">
              {/* Simulator Header */}
              <div className="h-14 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-900/40">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Terminal className="w-5 h-5 text-cyan-500" />
                    <div className="absolute top-0 right-0 w-2 h-2 bg-cyan-400 rounded-full animate-[pulse-ring_2s_infinite]"></div>
                  </div>
                  <span className="font-mono text-sm font-medium tracking-wide text-cyan-500">LIVE_SIMULATOR</span>
                </div>
                <div className="flex gap-4 font-mono text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                    LATENCY: 42ms
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-500"></div>
                    TEMP: 0.7
                  </div>
                </div>
              </div>

              {/* Chat Area */}
              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8 custom-scrollbar">
                {chatHistory.map((msg, idx) => (
                  <div key={idx} className={\`flex flex-col max-w-[85%] \${msg.role === 'user' ? 'self-end items-end' : 'self-start items-start'}\`}>
                    <div className={\`text-xs font-mono mb-2 flex items-center gap-2 \${msg.role === 'user' ? 'text-slate-500' : 'text-cyan-500'}\`}>
                      {msg.role === 'user' ? (
                        <>USER_INPUT <User className="w-3 h-3" /></>
                      ) : (
                        <><Bot className="w-3 h-3" /> AI_RESPONSE</>
                      )}
                    </div>
                    <div className={\`px-5 py-4 rounded-xl text-sm leading-relaxed \${
                      msg.role === 'user' 
                        ? 'bg-slate-800 text-slate-200 rounded-tr-none border border-slate-700' 
                        : 'bg-cyan-950/20 text-slate-300 rounded-tl-none border border-cyan-900/50 shadow-[0_4px_20px_rgba(6,182,212,0.05)]'
                    }\`}>
                      {msg.content}
                    </div>
                    
                    {/* Action buttons under AI response to feed back into training */}
                    {msg.role === 'ai' && (
                      <div className="flex items-center gap-2 mt-3 pl-2 opacity-60 hover:opacity-100 transition-opacity">
                        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-emerald-900/50 hover:text-emerald-400 text-xs font-medium text-slate-400 transition-colors border border-slate-700 hover:border-emerald-800">
                          <ThumbsUp className="w-3.5 h-3.5" /> Good Response
                        </button>
                        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-amber-900/50 hover:text-amber-400 text-xs font-medium text-slate-400 transition-colors border border-slate-700 hover:border-amber-800" onClick={() => setMode('teach')}>
                          <Wrench className="w-3.5 h-3.5" /> Teach / Adjust
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {isTyping && (
                  <div className="self-start max-w-[85%] flex flex-col items-start">
                    <div className="text-xs font-mono text-cyan-500 mb-2 flex items-center gap-2">
                      <Bot className="w-3 h-3" /> AI_COMPUTING
                    </div>
                    <div className="px-5 py-4 rounded-xl bg-cyan-950/20 border border-cyan-900/50 rounded-tl-none font-mono text-cyan-400 text-sm">
                      Generating<span className="ai-cursor"></span>
                    </div>
                  </div>
                )}
              </div>

              {/* Input Area */}
              <div className="p-4 bg-slate-900/80 border-t border-slate-800">
                <div className="relative flex items-center">
                  <input 
                    type="text" 
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Type a message to test the AI..."
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-lg pl-4 pr-12 py-3.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-700 focus:ring-1 focus:ring-cyan-700 transition-all font-sans"
                  />
                  <button 
                    onClick={handleSend}
                    className="absolute right-2 p-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-md transition-colors shadow-[0_0_10px_rgba(6,182,212,0.3)] hover:shadow-[0_0_15px_rgba(6,182,212,0.5)]"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            // TEACHING MODE
            <div className="flex-1 flex flex-col cockpit-panel rounded-xl overflow-hidden border-amber-900/30">
              <div className="h-14 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-900/40">
                <div className="flex items-center gap-3">
                  <Wrench className="w-5 h-5 text-amber-500" />
                  <span className="font-mono text-sm font-medium tracking-wide text-amber-500">TRAINING_MODULE</span>
                </div>
                <button onClick={() => setMode('flight')} className="text-xs font-mono text-slate-500 hover:text-slate-300 flex items-center gap-1">
                  <RotateCcw className="w-3 h-3" /> RETURN TO FLIGHT
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <div className="max-w-2xl mx-auto space-y-8">
                  
                  <div>
                    <h2 className="text-xl font-semibold text-slate-200 mb-2">Teach a specific response</h2>
                    <p className="text-sm text-slate-400">Add an example of what the user says and exactly how the AI should respond. This directly influences its behavior.</p>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-mono text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        <User className="w-3 h-3" /> User Trigger
                      </label>
                      <textarea 
                        className="w-full bg-slate-800/50 border border-slate-700 rounded-lg p-4 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-700 focus:ring-1 focus:ring-amber-700 min-h-[80px]"
                        placeholder="e.g. Can I get a refund for my annual plan?"
                      ></textarea>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-mono text-amber-400 uppercase tracking-wider flex items-center gap-2">
                        <Bot className="w-3 h-3" /> Ideal AI Response
                      </label>
                      <div className="relative">
                        <textarea 
                          className="w-full bg-amber-950/10 border border-amber-900/50 rounded-lg p-4 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 min-h-[160px]"
                          placeholder="Type the exact response you want the AI to learn..."
                        ></textarea>
                        <div className="absolute bottom-3 right-3 flex items-center gap-2 text-xs font-mono text-slate-500">
                          <Zap className="w-3 h-3 text-amber-500" /> Auto-generate from Knowledge
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                      <button className="px-5 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors">
                        Cancel
                      </button>
                      <button className="px-5 py-2.5 rounded-lg text-sm font-medium bg-amber-600 hover:bg-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.2)] hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all flex items-center gap-2" onClick={() => setMode('flight')}>
                        <Database className="w-4 h-4" /> Save & Re-test
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
