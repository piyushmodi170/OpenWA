import React, { useState } from 'react';
import { 
  FileText, 
  MessageSquare, 
  ShieldAlert, 
  Plus, 
  TrendingUp,
  Award,
  BookOpen,
  Filter,
  Users,
  Search,
  X,
  CheckCircle2,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  ResponsiveContainer, 
  Tooltip 
} from 'recharts';

// --- MOCK DATA ---
const scoreData = [
  { day: 'Jun 1', score: 10 },
  { day: 'Jun 8', score: 32 },
  { day: 'Jun 15', score: 50 },
  { day: 'Jun 22', score: 65 },
  { day: 'Jun 28', score: 73 },
];

const timelineData = [
  { id: 1, type: 'milestone', date: 'June 28', title: 'Training Score reached 73', icon: Award, color: 'text-yellow-600', bg: 'bg-yellow-100' },
  { id: 2, type: 'document', date: 'June 28', title: 'Return Policy', desc: 'Added 1,200 words covering standard 30-day returns and exceptions.', author: 'Maria (Support)' },
  { id: 3, type: 'example', date: 'June 25', title: 'Refund Requests', desc: 'Added 3 example conversations handling angry customers asking for refunds.', author: 'Maria (Support)' },
  { id: 4, type: 'document', date: 'June 22', title: 'Onboarding Guide', desc: 'Internal guide for new employees, adapted for AI context.', author: 'Global' },
  { id: 5, type: 'rule', date: 'June 20', title: 'NEVER share internal pricing', desc: 'Strict rule added to prevent accidental margin leaks.', author: 'Alex (Sales)' },
  { id: 6, type: 'document', date: 'June 18', title: 'Pricing Guide', desc: 'Public retail pricing sheets and volume discount tiers.', author: 'Alex (Sales)' },
  { id: 7, type: 'milestone', date: 'June 15', title: 'Bot reached 50% Quality', icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-100' },
  { id: 8, type: 'document', date: 'June 15', title: 'Support SOP', desc: 'Standard operating procedures for technical troubleshooting.', author: 'Maria (Support)' },
  { id: 9, type: 'document', date: 'June 12', title: 'Sales Script', desc: 'Inbound lead qualification script and objection handling.', author: 'Alex (Sales)' },
  { id: 10, type: 'rule', date: 'June 10', title: 'ALWAYS use friendly tone', desc: 'Tone guideline applied to all outbound messages.', author: 'Global' },
  { id: 11, type: 'rule', date: 'June 10', title: 'CONDITIONAL escalate to human if angry', desc: 'Sentiment analysis trigger for handoff.', author: 'Maria (Support)' },
  { id: 12, type: 'document', date: 'June 8', title: 'Company Policy', desc: 'General company information, hours, and values.', author: 'Global' },
  { id: 13, type: 'example', date: 'June 5', title: 'Payment Methods & Hours', desc: 'Added 5 examples for common logistical questions.', author: 'Global' },
  { id: 14, type: 'document', date: 'June 3', title: 'FAQ', desc: 'Scraped from the main website FAQ page.', author: 'Global' },
  { id: 15, type: 'rule', date: 'June 2', title: 'ALWAYS end with a question', desc: 'Engagement tactic to keep users replying.', author: 'Alex (Sales)' },
  { id: 16, type: 'rule', date: 'June 2', title: 'NEVER mention competitors', desc: 'Brand safety rule.', author: 'Global' },
  { id: 17, type: 'document', date: 'June 1', title: 'Product Catalog', desc: 'Initial sync of 150 products with descriptions.', author: 'Global' },
  { id: 18, type: 'milestone', date: 'June 1', title: 'Training Started', icon: Sparkles, color: 'text-blue-600', bg: 'bg-blue-100' },
];

export function TrainingTimeline() {
  const [filter, setFilter] = useState('all');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const filteredTimeline = timelineData.filter(item => {
    if (filter === 'all') return true;
    if (item.type === 'milestone') return true; // always show milestones
    return item.type === filter;
  });

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#1C1C1C] font-sans selection:bg-amber-200">
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600&display=swap');
        .font-editorial { font-family: 'Instrument Serif', serif; }
        .font-sans { font-family: 'Inter', sans-serif; }
        
        .timeline-line::before {
          content: '';
          position: absolute;
          left: 15px;
          top: 32px;
          bottom: -32px;
          width: 2px;
          background-color: #E5E5E5;
          z-index: 0;
        }
        .timeline-item:last-child .timeline-line::before {
          display: none;
        }
        
        .drawer-overlay {
          backdrop-filter: blur(4px);
        }
      `}} />

      <div className="flex flex-col md:flex-row max-w-7xl mx-auto">
        
        {/* Main Content Area */}
        <main className="flex-1 p-6 md:p-12 lg:p-16 max-w-4xl relative">
          
          {/* Header */}
          <header className="mb-12">
            <h1 className="font-editorial text-5xl md:text-6xl text-[#1C1C1C] mb-4">Training Journal</h1>
            <p className="text-lg text-neutral-600 max-w-xl">
              The story of how your AI is learning. Review its curriculum, add new knowledge, and track its growing capability.
            </p>
          </header>

          {/* Hero Stats & Chart */}
          <section className="bg-white rounded-2xl p-8 shadow-sm border border-neutral-200/60 mb-16 flex flex-col md:flex-row gap-8 items-center relative overflow-hidden">
            <div className="flex-shrink-0 z-10">
              <div className="text-sm font-medium text-neutral-500 uppercase tracking-wider mb-2">Current Score</div>
              <div className="flex items-baseline gap-2">
                <span className="font-editorial text-7xl md:text-8xl text-[#1C1C1C]">73</span>
                <span className="text-xl text-neutral-400">/ 100</span>
              </div>
              <div className="flex items-center gap-2 mt-4">
                <Badge variant="green">Good Quality</Badge>
                <span className="text-sm text-neutral-500">+8 pts this week</span>
              </div>
            </div>
            
            <div className="flex-1 h-40 w-full z-10">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={scoreData}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1C1C1C" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#1C1C1C" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    itemStyle={{ color: '#1C1C1C', fontWeight: 500 }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#1C1C1C" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorScore)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Timeline */}
          <section className="relative">
            <div className="flex items-center justify-between mb-8">
              <h2 className="font-editorial text-3xl">Curriculum History</h2>
              
              {/* Mobile Filter Dropdown placeholder */}
              <div className="md:hidden flex gap-2 overflow-x-auto pb-2">
                <FilterPill active={filter === 'all'} onClick={() => setFilter('all')}>All</FilterPill>
                <FilterPill active={filter === 'document'} onClick={() => setFilter('document')}>Docs</FilterPill>
                <FilterPill active={filter === 'example'} onClick={() => setFilter('example')}>Examples</FilterPill>
                <FilterPill active={filter === 'rule'} onClick={() => setFilter('rule')}>Rules</FilterPill>
              </div>
            </div>

            <div className="space-y-0">
              {filteredTimeline.map((item, index) => (
                <div key={item.id} className="timeline-item relative pl-12 py-6 group">
                  <div className="timeline-line" />
                  
                  {item.type === 'milestone' ? (
                    <div className="relative z-10 flex items-center gap-4">
                      <div className={`absolute -left-[48px] w-8 h-8 rounded-full ${item.bg} ${item.color} flex items-center justify-center border-4 border-[#FAF9F6] shadow-sm`}>
                        <item.icon className="w-4 h-4" />
                      </div>
                      <div className="bg-white px-4 py-2 rounded-full shadow-sm border border-neutral-200 text-sm font-medium flex items-center gap-2">
                        <span className="text-neutral-500">{item.date}</span>
                        <span className="text-neutral-300">•</span>
                        <span>{item.title}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="relative z-10 bg-white rounded-xl p-5 shadow-sm border border-neutral-200/80 transition-all hover:shadow-md hover:border-neutral-300">
                      
                      {/* Timeline Dot */}
                      <div className={`absolute -left-[44px] w-6 h-6 rounded-full border-4 border-[#FAF9F6] shadow-sm flex items-center justify-center
                        ${item.type === 'document' ? 'bg-blue-500' : 
                          item.type === 'example' ? 'bg-amber-500' : 'bg-red-500'}
                      `}>
                        <div className="w-1.5 h-1.5 bg-white rounded-full" />
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">{item.date}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-md font-medium
                              ${item.type === 'document' ? 'bg-blue-50 text-blue-700' : 
                                item.type === 'example' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}
                            `}>
                              {item.type === 'document' ? 'Knowledge' : 
                               item.type === 'example' ? 'Example' : 'Rule'}
                            </span>
                          </div>
                          <h3 className="text-lg font-semibold text-[#1C1C1C] mb-1">{item.title}</h3>
                          <p className="text-neutral-600 text-sm max-w-lg leading-relaxed">{item.desc}</p>
                        </div>
                        
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="w-6 h-6 rounded-full bg-neutral-100 flex items-center justify-center text-xs font-medium text-neutral-500">
                            {item.author.charAt(0)}
                          </div>
                          <span className="text-xs text-neutral-500">{item.author}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <div className="mt-8 py-8 border-t border-dashed border-neutral-300 text-center">
              <p className="text-neutral-400 italic">End of journal</p>
            </div>
          </section>

        </main>

        {/* Right Sidebar (Desktop) */}
        <aside className="w-80 p-8 hidden md:block border-l border-neutral-200/60 sticky top-0 h-screen overflow-y-auto">
          <div className="mb-10">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-400 mb-4">View By Type</h3>
            <div className="space-y-2">
              <SidebarFilter active={filter === 'all'} onClick={() => setFilter('all')} icon={BookOpen} label="Everything" count={timelineData.length} />
              <SidebarFilter active={filter === 'document'} onClick={() => setFilter('document')} icon={FileText} label="Knowledge" color="text-blue-600" bg="bg-blue-50" count={8} />
              <SidebarFilter active={filter === 'example'} onClick={() => setFilter('example')} icon={MessageSquare} label="Examples" color="text-amber-600" bg="bg-amber-50" count={12} />
              <SidebarFilter active={filter === 'rule'} onClick={() => setFilter('rule')} icon={ShieldAlert} label="Rules" color="text-red-600" bg="bg-red-50" count={5} />
            </div>
          </div>

          <div className="mb-10">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-400 mb-4">Contributors</h3>
            <div className="space-y-3">
              <Contributor name="Global" role="System Default" />
              <Contributor name="Alex" role="Sales" />
              <Contributor name="Maria" role="Support" />
            </div>
          </div>

          <div className="bg-[#1C1C1C] rounded-xl p-5 text-white shadow-xl relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-xl" />
            <h3 className="font-editorial text-2xl mb-2 relative z-10">Need a boost?</h3>
            <p className="text-sm text-neutral-300 mb-4 relative z-10 leading-relaxed">
              Bots with over 15 targeted examples perform 40% better on complex queries.
            </p>
            <button 
              onClick={() => setDrawerOpen(true)}
              className="w-full bg-white text-[#1C1C1C] font-medium py-2 rounded-lg text-sm hover:bg-neutral-100 transition-colors"
            >
              Add Examples
            </button>
          </div>
        </aside>

      </div>

      {/* Floating Action Button */}
      <button 
        onClick={() => setDrawerOpen(true)}
        className="fixed bottom-8 right-8 z-40 bg-[#1C1C1C] hover:bg-[#2A2A2A] text-white rounded-full px-6 py-4 shadow-xl flex items-center gap-3 transition-transform hover:scale-105 active:scale-95"
      >
        <Plus className="w-5 h-5" />
        <span className="font-medium">Teach something new</span>
      </button>

      {/* Drawer Overlay */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div 
            className="absolute inset-0 bg-black/20 drawer-overlay transition-opacity" 
            onClick={() => setDrawerOpen(false)}
          />
          <div className="w-full max-w-md bg-white h-full shadow-2xl relative z-10 flex flex-col animate-in slide-in-from-right duration-300">
            <div className="px-6 py-5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
              <h2 className="font-editorial text-3xl">New Lesson</h2>
              <button 
                onClick={() => setDrawerOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-neutral-200 flex items-center justify-center text-neutral-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <p className="text-neutral-500 mb-6">What would you like to teach your AI today?</p>
              
              <div className="space-y-4">
                <LessonTypeCard 
                  title="Upload Knowledge" 
                  desc="PDFs, text files, or website links for factual grounding."
                  icon={FileText}
                  color="text-blue-600"
                  bg="bg-blue-50"
                  borderColor="border-blue-200"
                />
                <LessonTypeCard 
                  title="Provide Examples" 
                  desc="Simulated Q&A pairs to teach tone and formatting."
                  icon={MessageSquare}
                  color="text-amber-600"
                  bg="bg-amber-50"
                  borderColor="border-amber-200"
                />
                <LessonTypeCard 
                  title="Establish Rules" 
                  desc="Strict constraints and behaviors it must always follow."
                  icon={ShieldAlert}
                  color="text-red-600"
                  bg="bg-red-50"
                  borderColor="border-red-200"
                />
              </div>
            </div>
            
            <div className="p-6 border-t border-neutral-100 bg-neutral-50">
              <button className="w-full bg-[#1C1C1C] text-white py-3 rounded-xl font-medium shadow-sm opacity-50 cursor-not-allowed">
                Select a lesson type
              </button>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}

// --- SUBCOMPONENTS ---

function Badge({ children, variant = 'gray' }: { children: React.ReactNode, variant?: 'gray' | 'green' }) {
  const variants = {
    gray: 'bg-neutral-100 text-neutral-600',
    green: 'bg-green-100 text-green-700'
  };
  return (
    <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  );
}

function FilterPill({ children, active, onClick }: { children: React.ReactNode, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors border
        ${active 
          ? 'bg-[#1C1C1C] text-white border-[#1C1C1C]' 
          : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'}
      `}
    >
      {children}
    </button>
  );
}

function SidebarFilter({ active, onClick, icon: Icon, label, color = 'text-neutral-600', bg = 'bg-neutral-100', count }: any) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center justify-between p-3 rounded-xl transition-all group
        ${active ? 'bg-white shadow-sm border border-neutral-200' : 'hover:bg-neutral-100/50 border border-transparent'}
      `}
    >
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${active ? bg : 'bg-transparent group-hover:bg-white'} transition-colors`}>
          <Icon className={`w-4 h-4 ${active ? color : 'text-neutral-500'}`} />
        </div>
        <span className={`font-medium text-sm ${active ? 'text-[#1C1C1C]' : 'text-neutral-600'}`}>{label}</span>
      </div>
      {count !== undefined && (
        <span className={`text-xs font-medium ${active ? 'text-neutral-500' : 'text-neutral-400'}`}>{count}</span>
      )}
    </button>
  );
}

function Contributor({ name, role }: { name: string, role: string }) {
  return (
    <div className="flex items-center justify-between group cursor-pointer">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center text-sm font-medium text-neutral-600">
          {name.charAt(0)}
        </div>
        <div>
          <div className="text-sm font-medium text-[#1C1C1C] group-hover:text-amber-600 transition-colors">{name}</div>
          <div className="text-xs text-neutral-400">{role}</div>
        </div>
      </div>
      <div className="w-5 h-5 rounded-full border border-neutral-200 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <CheckCircle2 className="w-3 h-3 text-neutral-300" />
      </div>
    </div>
  );
}

function LessonTypeCard({ title, desc, icon: Icon, color, bg, borderColor }: any) {
  return (
    <button className={`w-full text-left p-5 rounded-2xl border bg-white hover:shadow-md transition-all group flex items-start gap-4 hover:border-neutral-300`}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${bg} ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-[#1C1C1C] text-lg mb-1 group-hover:text-amber-600 transition-colors">{title}</h3>
        <p className="text-sm text-neutral-500 leading-relaxed">{desc}</p>
      </div>
      <ChevronRight className="w-5 h-5 text-neutral-300 shrink-0 mt-3 group-hover:translate-x-1 transition-transform" />
    </button>
  );
}
