import React, { useState, useMemo } from 'react';
import { 
  Plus, Search, Filter, ZoomIn, ZoomOut, Maximize, 
  ChevronLeft, ChevronRight, FileText, MessageSquare, 
  ShieldAlert, Settings, Brain, ArrowRight, X, Play, Edit2
} from 'lucide-react';
import './brain-map.css';

// Mock Data
const stats = { score: 73, docs: 8, words: 24891, examples: 12, rules: 5 };

const employees = ["Global", "Alex (Sales)", "Maria (Support)"];

type NodeType = 'doc' | 'example' | 'rule' | 'ghost';

interface NodeData {
  id: string;
  type: NodeType;
  label: string;
  quality?: 'green' | 'amber' | 'red';
  x: number;
  y: number;
  connections: string[];
  content?: string;
  size: number;
}

const initialNodes: NodeData[] = [
  // Documents (Large, Blue)
  { id: 'd1', type: 'doc', label: 'Product Catalog', quality: 'green', x: 30, y: 25, size: 48, connections: ['e1', 'e2'], content: 'Contains specs and pricing for 200+ products.' },
  { id: 'd2', type: 'doc', label: 'FAQ', quality: 'amber', x: 70, y: 20, size: 42, connections: ['e4'], content: 'Frequently asked questions about shipping and returns.' },
  { id: 'd3', type: 'doc', label: 'Company Policy', quality: 'green', x: 20, y: 55, size: 54, connections: ['r1', 'r4'], content: 'Internal guidelines and public facing policies.' },
  { id: 'd4', type: 'doc', label: 'Sales Script', quality: 'amber', x: 80, y: 60, size: 40, connections: ['e3', 'r2'], content: 'Playbooks for handling objections and closing deals.' },
  { id: 'd5', type: 'doc', label: 'Support SOP', quality: 'red', x: 45, y: 80, size: 38, connections: ['r3'], content: 'Standard operating procedures for customer complaints.' },
  
  // Examples (Medium, Amber)
  { id: 'e1', type: 'example', label: 'Pricing Inquiry', x: 25, y: 15, size: 28, connections: [], content: 'User: How much is X? AI: Pricing starts at $99...' },
  { id: 'e2', type: 'example', label: 'Demo Booking', x: 40, y: 12, size: 28, connections: [], content: 'User: I want a demo. AI: Great! Here is our calendar link.' },
  { id: 'e3', type: 'example', label: 'Refund Request', x: 85, y: 45, size: 28, connections: [], content: 'User: I need a refund. AI: I understand, let me pull up your order.' },
  { id: 'e4', type: 'example', label: 'Hours/Location', x: 85, y: 25, size: 28, connections: [], content: 'User: When are you open? AI: We are open 9am-5pm EST.' },
  
  // Rules (Small, Red)
  { id: 'r1', type: 'rule', label: 'Never mention competitors', x: 15, y: 70, size: 20, connections: [], content: 'If asked about competitors, pivot back to our unique value props.' },
  { id: 'r2', type: 'rule', label: 'Always ask a question', x: 75, y: 75, size: 20, connections: [], content: 'End every sales response with a qualifying question.' },
  { id: 'r3', type: 'rule', label: 'Escalate if angry', x: 55, y: 85, size: 20, connections: [], content: 'If sentiment is highly negative, tag a human agent immediately.' },
  { id: 'r4', type: 'rule', label: 'Friendly tone', x: 30, y: 75, size: 20, connections: [], content: 'Use emojis occasionally and maintain an upbeat voice.' },

  // Ghost Nodes (Gaps)
  { id: 'g1', type: 'ghost', label: 'Gap: Integrations', x: 65, y: 40, size: 30, connections: [], content: 'Add documentation about supported integrations.' }
];

export function BrainMap() {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [activeEmployee, setActiveEmployee] = useState(employees[0]);

  const selectedNode = initialNodes.find(n => n.id === selectedNodeId);

  // Helper to render node based on type
  const renderNode = (node: NodeData) => {
    const isSelected = selectedNodeId === node.id;
    let className = `absolute rounded-full cursor-pointer flex items-center justify-center group `;
    if (node.type === 'doc') className += 'node-doc ';
    if (node.type === 'example') className += 'node-example ';
    if (node.type === 'rule') className += 'node-rule ';
    if (node.type === 'ghost') className += 'node-ghost ';

    let borderClass = '';
    if (node.type === 'doc') {
      if (node.quality === 'green') borderClass = 'ring-2 ring-green-400 ring-offset-2 ring-offset-[#050505]';
      if (node.quality === 'amber') borderClass = 'ring-2 ring-amber-400 ring-offset-2 ring-offset-[#050505]';
      if (node.quality === 'red') borderClass = 'ring-2 ring-red-400 ring-offset-2 ring-offset-[#050505]';
    }

    if (isSelected) {
      borderClass += ' ring-4 ring-white ring-offset-4 ring-offset-[#050505]';
    }

    const Icon = node.type === 'doc' ? FileText : node.type === 'example' ? MessageSquare : node.type === 'rule' ? ShieldAlert : HelpCircle;

    return (
      <div 
        key={node.id}
        className={className + borderClass}
        style={{
          width: node.size,
          height: node.size,
          left: `calc(${node.x}% - ${node.size/2}px)`,
          top: `calc(${node.y}% - ${node.size/2}px)`,
          zIndex: isSelected ? 50 : 10
        }}
        onClick={() => setSelectedNodeId(node.id)}
      >
        {node.type !== 'ghost' && <Icon size={node.size * 0.4} className="text-white opacity-80" />}
        {node.type === 'ghost' && <span className="text-xs text-white/50">?</span>}
        
        <div className="absolute top-full mt-2 text-center w-32 left-1/2 -translate-x-1/2 pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity">
          <span className="text-xs font-medium bg-black/50 px-2 py-1 rounded backdrop-blur-sm border border-white/10 text-white/80">
            {node.label}
          </span>
        </div>
      </div>
    );
  };

  // SVG lines for connections
  const renderConnections = () => {
    return (
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
        {initialNodes.flatMap(source => 
          source.connections.map(targetId => {
            const target = initialNodes.find(n => n.id === targetId);
            if (!target) return null;
            
            const isActive = selectedNodeId === source.id || selectedNodeId === target.id;
            
            return (
              <line
                key={`${source.id}-${target.id}`}
                x1={`${source.x}%`}
                y1={`${source.y}%`}
                x2={`${target.x}%`}
                y2={`${target.y}%`}
                className={`connection-line ${isActive ? 'active' : ''}`}
              />
            );
          })
        )}
        
        {/* Lines to center core for docs */}
        {initialNodes.filter(n => n.type === 'doc').map(node => (
          <line
            key={`core-${node.id}`}
            x1="50%"
            y1="50%"
            x2={`${node.x}%`}
            y2={`${node.y}%`}
            className={`connection-line ${selectedNodeId === node.id ? 'active' : ''}`}
            strokeDasharray="4 4"
            opacity="0.5"
          />
        ))}
      </svg>
    );
  };

  return (
    <div className="brain-map-container relative min-h-screen w-full flex overflow-hidden text-sm">
      {/* Left Sidebar */}
      <div className={`flex flex-col bg-[#0a0a0a]/80 backdrop-blur-xl border-r border-white/10 transition-all duration-300 ease-in-out z-20 ${sidebarOpen ? 'w-72' : 'w-0 opacity-0'}`}>
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="text-purple-400" size={20} />
            <span className="font-display font-semibold text-white">Brain Index</span>
          </div>
          <button className="p-1 hover:bg-white/10 rounded" onClick={() => setSidebarOpen(false)}>
            <ChevronLeft size={16} />
          </button>
        </div>
        
        <div className="p-4 border-b border-white/10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={14} />
            <input 
              type="text" 
              placeholder="Search knowledge..." 
              className="w-full bg-white/5 border border-white/10 rounded-md py-1.5 pl-8 pr-3 text-white/80 text-sm focus:outline-none focus:border-purple-500/50 transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div>
            <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Documents</h3>
            <div className="space-y-1">
              {initialNodes.filter(n => n.type === 'doc').map(node => (
                <button 
                  key={node.id}
                  onClick={() => setSelectedNodeId(node.id)}
                  className={`w-full text-left px-2 py-1.5 rounded flex items-center gap-2 transition-colors ${selectedNodeId === node.id ? 'bg-blue-500/20 text-blue-300' : 'text-white/60 hover:bg-white/5 hover:text-white/80'}`}
                >
                  <FileText size={14} className={selectedNodeId === node.id ? 'text-blue-400' : 'text-white/40'} />
                  <span className="truncate">{node.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Examples</h3>
            <div className="space-y-1">
              {initialNodes.filter(n => n.type === 'example').map(node => (
                <button 
                  key={node.id}
                  onClick={() => setSelectedNodeId(node.id)}
                  className={`w-full text-left px-2 py-1.5 rounded flex items-center gap-2 transition-colors ${selectedNodeId === node.id ? 'bg-amber-500/20 text-amber-300' : 'text-white/60 hover:bg-white/5 hover:text-white/80'}`}
                >
                  <MessageSquare size={14} className={selectedNodeId === node.id ? 'text-amber-400' : 'text-white/40'} />
                  <span className="truncate">{node.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Rules</h3>
            <div className="space-y-1">
              {initialNodes.filter(n => n.type === 'rule').map(node => (
                <button 
                  key={node.id}
                  onClick={() => setSelectedNodeId(node.id)}
                  className={`w-full text-left px-2 py-1.5 rounded flex items-center gap-2 transition-colors ${selectedNodeId === node.id ? 'bg-red-500/20 text-red-300' : 'text-white/60 hover:bg-white/5 hover:text-white/80'}`}
                >
                  <ShieldAlert size={14} className={selectedNodeId === node.id ? 'text-red-400' : 'text-white/40'} />
                  <span className="truncate">{node.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Toggle Sidebar Button (when closed) */}
      {!sidebarOpen && (
        <button 
          className="absolute left-4 top-4 z-30 p-2 bg-[#111] border border-white/10 rounded-md hover:bg-white/10 text-white shadow-lg"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu size={16} />
        </button>
      )}

      {/* Main Canvas Area */}
      <div className="flex-1 relative flex flex-col h-screen overflow-hidden" onClick={(e) => { if (e.target === e.currentTarget) setSelectedNodeId(null); }}>
        
        {/* Top Bar */}
        <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-start pointer-events-none">
          <div className="flex gap-2 ml-12 pointer-events-auto">
            <select 
              className="bg-[#111]/80 backdrop-blur-md border border-white/10 text-white text-sm rounded-md px-3 py-2 outline-none cursor-pointer focus:border-purple-500/50"
              value={activeEmployee}
              onChange={e => setActiveEmployee(e.target.value)}
            >
              {employees.map(emp => <option key={emp} value={emp}>{emp}</option>)}
            </select>
          </div>

          <div className="flex flex-col items-end gap-2 pointer-events-auto">
            <button className="bg-purple-600 hover:bg-purple-500 text-white font-medium px-4 py-2 rounded-md shadow-[0_0_15px_rgba(147,51,234,0.4)] flex items-center gap-2 transition-all hover:scale-105">
              <Plus size={16} />
              Add Knowledge
            </button>
            <div className="flex items-center bg-[#111]/80 backdrop-blur-md border border-white/10 rounded-md overflow-hidden">
              <button className="p-2 hover:bg-white/10" onClick={() => setZoom(z => Math.min(z + 0.2, 2))}><ZoomIn size={16} /></button>
              <div className="w-px h-4 bg-white/10"></div>
              <button className="p-2 hover:bg-white/10" onClick={() => setZoom(1)}><Maximize size={16} /></button>
              <div className="w-px h-4 bg-white/10"></div>
              <button className="p-2 hover:bg-white/10" onClick={() => setZoom(z => Math.max(z - 0.2, 0.5))}><ZoomOut size={16} /></button>
            </div>
          </div>
        </div>

        {/* Node Graph Surface */}
        <div 
          className="absolute inset-0 origin-center transition-transform duration-300 ease-out flex items-center justify-center cursor-move"
          style={{ transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)` }}
        >
          <div className="relative w-[1200px] h-[800px]">
            {renderConnections()}
            {initialNodes.map(renderNode)}

            {/* Central Core Orb */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center">
              <div className="core-node rounded-full w-40 h-40 flex items-center justify-center relative cursor-pointer" onClick={() => setSelectedNodeId(null)}>
                <div className="absolute inset-0 rounded-full border border-purple-400/30 animate-[spin_10s_linear_infinite]" style={{ borderTopColor: 'transparent', borderBottomColor: 'transparent' }}></div>
                <div className="absolute inset-2 rounded-full border border-purple-500/20 animate-[spin_15s_linear_infinite_reverse]" style={{ borderLeftColor: 'transparent', borderRightColor: 'transparent' }}></div>
                
                <div className="text-center z-10 font-display">
                  <div className="text-4xl font-bold text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]">{stats.score}%</div>
                  <div className="text-xs text-purple-200 uppercase tracking-widest mt-1 opacity-80">Core Health</div>
                </div>
              </div>
              <div className="absolute top-full mt-6 flex gap-4 text-center">
                <div className="bg-white/5 border border-white/10 px-3 py-1 rounded backdrop-blur-sm">
                  <div className="text-lg font-bold text-white">{stats.docs}</div>
                  <div className="text-[10px] text-white/50 uppercase">Docs</div>
                </div>
                <div className="bg-white/5 border border-white/10 px-3 py-1 rounded backdrop-blur-sm">
                  <div className="text-lg font-bold text-white">{stats.examples}</div>
                  <div className="text-[10px] text-white/50 uppercase">Examples</div>
                </div>
                <div className="bg-white/5 border border-white/10 px-3 py-1 rounded backdrop-blur-sm">
                  <div className="text-lg font-bold text-white">{stats.rules}</div>
                  <div className="text-[10px] text-white/50 uppercase">Rules</div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Right Detail Panel */}
      <div 
        className={`absolute top-4 bottom-4 right-4 w-80 bg-[#111]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl transition-transform duration-300 ease-out z-40 flex flex-col ${selectedNodeId ? 'translate-x-0' : 'translate-x-[120%]'}`}
      >
        {selectedNode && (
          <>
            <div className="p-5 border-b border-white/10 flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider 
                    ${selectedNode.type === 'doc' ? 'bg-blue-500/20 text-blue-400' : 
                      selectedNode.type === 'example' ? 'bg-amber-500/20 text-amber-400' : 
                      selectedNode.type === 'rule' ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white/60'}`}
                  >
                    {selectedNode.type}
                  </span>
                  {selectedNode.quality && (
                    <span className={`w-2 h-2 rounded-full ${
                      selectedNode.quality === 'green' ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]' :
                      selectedNode.quality === 'amber' ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]' :
                      'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.6)]'
                    }`} />
                  )}
                </div>
                <h2 className="text-lg font-display font-semibold text-white leading-tight">{selectedNode.label}</h2>
              </div>
              <button className="text-white/40 hover:text-white" onClick={() => setSelectedNodeId(null)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="p-5 flex-1 overflow-y-auto">
              <div className="mb-6">
                <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Content Snippet</h3>
                <div className="bg-white/5 border border-white/5 p-3 rounded text-sm text-white/80 leading-relaxed font-mono">
                  {selectedNode.content}
                </div>
              </div>

              {selectedNode.connections.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Connected Nodes ({selectedNode.connections.length})</h3>
                  <div className="space-y-2">
                    {selectedNode.connections.map(cId => {
                      const cNode = initialNodes.find(n => n.id === cId);
                      if (!cNode) return null;
                      return (
                        <button key={cId} className="w-full text-left bg-white/5 hover:bg-white/10 p-2 rounded flex items-center gap-2 border border-white/5 transition-colors" onClick={() => setSelectedNodeId(cId)}>
                          {cNode.type === 'example' ? <MessageSquare size={12} className="text-amber-400" /> : <ShieldAlert size={12} className="text-red-400" />}
                          <span className="text-sm text-white/70">{cNode.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-white/10 flex gap-2">
              <button className="flex-1 bg-white/10 hover:bg-white/20 text-white py-2 rounded-md transition-colors flex justify-center items-center gap-2 text-sm font-medium">
                <Edit2 size={14} /> Edit
              </button>
              {selectedNode.type === 'doc' && (
                <button className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-md transition-colors flex justify-center items-center gap-2 text-sm font-medium">
                  <Play size={14} /> Retrain
                </button>
              )}
            </div>
          </>
        )}
      </div>

    </div>
  );
}

// Fallback icons
const HelpCircle = ({ size, className }: any) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10"></circle>
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
    <line x1="12" y1="17" x2="12.01" y2="17"></line>
  </svg>
);

const Menu = ({ size, className }: any) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="3" y1="12" x2="21" y2="12"></line>
    <line x1="3" y1="6" x2="21" y2="6"></line>
    <line x1="3" y1="18" x2="21" y2="18"></line>
  </svg>
);
