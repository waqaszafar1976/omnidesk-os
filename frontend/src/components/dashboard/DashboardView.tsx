import React, { useEffect, useState } from 'react';
import { 
  FileText, Table, Layout, Calendar, Users, Activity, TrendingUp, BarChart2,
  Plus, CheckSquare, Clock, ArrowRight, UserPlus, FilePlus, BrainCircuit,
  ChevronRight, Circle, ShieldCheck
} from 'lucide-react';

interface PageItem {
  id: string;
  title: string;
  type: 'document' | 'table' | 'canvas';
  workspace_id: string;
}

interface DashboardViewProps {
  activeTab: string;
  user: any;
  workspace: any;
  token: string;
  pages: PageItem[];
  onSelectPage: (id: string) => void;
  onCreatePage: (type: 'document' | 'table' | 'canvas') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  activeTab,
  user,
  workspace,
  token,
  pages,
  onSelectPage,
  onCreatePage
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [kpis, setKpis] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [taskFilter, setTaskFilter] = useState<string>('active'); // active | all | done
  const [viewMode, setViewMode] = useState<string>('user'); // user | admin
  
  // Analytics tab specific states
  const [trendData, setTrendData] = useState<any>(null);
  const [distributionData, setDistributionData] = useState<any>(null);
  const [topWorkspaces, setTopWorkspaces] = useState<any[]>([]);

  const apiHost = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
  const authHeaders = { 'Authorization': `Bearer ${token}` };

  const loadData = async () => {
    if (!token || !workspace?.id) return;
    try {
      setLoading(true);
      
      // 1. Fetch KPIs
      const kpisRes = await fetch(`${apiHost}/analytics/kpis?view=${viewMode}`, { headers: authHeaders });
      const kpisData = await kpisRes.json();
      if (kpisData.success) setKpis(kpisData.data);

      // 2. Fetch Tasks
      const tasksRes = await fetch(`${apiHost}/tasks?status=${taskFilter}`, { headers: authHeaders });
      const tasksData = await tasksRes.json();
      if (tasksData.success) setTasks(tasksData.data);

      // 3. Fetch Events
      const eventsRes = await fetch(`${apiHost}/events?range=week`, { headers: authHeaders });
      const eventsData = await eventsRes.json();
      if (eventsData.success) setEvents(eventsData.data);

      // 4. Fetch Workspace Members
      const membersRes = await fetch(`${apiHost}/workspaces/${workspace.id}/members`, { headers: authHeaders });
      const membersData = await membersRes.json();
      if (membersData.success) setMembers(membersData.data);

      // 5. Fetch Recent Activities
      const actRes = await fetch(`${apiHost}/analytics/recent-activity?limit=10`, { headers: authHeaders });
      const actData = await actRes.json();
      if (actData.success) setActivities(actData.data);

      // If active tab is analytics, fetch additional metrics
      if (activeTab === 'analytics') {
        const trendRes = await fetch(`${apiHost}/analytics/usage-trend?range=7d`, { headers: authHeaders });
        const trend = await trendRes.json();
        if (trend.success) setTrendData(trend.data);

        const distRes = await fetch(`${apiHost}/analytics/workspace-distribution`, { headers: authHeaders });
        const dist = await distRes.json();
        if (dist.success) setDistributionData(dist.data);

        const topRes = await fetch(`${apiHost}/analytics/top-workspaces?limit=4`, { headers: authHeaders });
        const top = await topRes.json();
        if (top.success) setTopWorkspaces(top.data);
      }

    } catch (e) {
      console.error('Error fetching dashboard data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab, taskFilter, workspace?.id, token, viewMode]);

  if (loading && !kpis) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-semibold text-slate-500">Syncing dashboard telemetry...</span>
        </div>
      </div>
    );
  }

  const getPageIcon = (type: string) => {
    switch (type) {
      case 'document':
        return <FileText className="h-4 w-4 text-indigo-500" />;
      case 'table':
        return <Table className="h-4 w-4 text-emerald-500" />;
      case 'canvas':
        return <Layout className="h-4 w-4 text-purple-500" />;
      default:
        return <FileText className="h-4 w-4 text-slate-500" />;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50/70 p-8">
      {/* 1. HEADER SECTION */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
            Workspace Dashboard
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {viewMode === 'admin' ? 'Admin Dashboard' : 'My Dashboard'}
          </h1>
        </div>

        {/* View Switcher: User View / Admin View */}
        <div className="flex bg-slate-200/60 p-1 rounded-xl">
          <button 
            onClick={() => setViewMode('user')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'user' 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            User View
          </button>
          <button 
            onClick={() => setViewMode('admin')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'admin' 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Admin View
          </button>
        </div>
      </div>

      {/* 2. TAB RENDERER */}

      {/* TAB A: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Greeting banner */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-8 shadow-lg text-white">
            <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <span className="text-[10px] font-bold tracking-widest uppercase text-indigo-400">Welcome Back</span>
                <h2 className="text-xl font-bold tracking-tight mt-1">Good morning, {user?.name || 'Demo User'}</h2>
                <p className="text-xs text-slate-350 mt-1 font-medium">
                  You have <span className="text-indigo-300 font-semibold">{tasks.filter(t => t.status !== 'done').length} tasks</span> pending and workspace operations are fully operational.
                </p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => onCreatePage('document')}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-indigo-600/15 transition-all"
                >
                  <FilePlus className="w-3.5 h-3.5" />
                  New Document
                </button>
                <button 
                  onClick={() => onCreatePage('canvas')}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-800 text-slate-200 border border-slate-700/80 rounded-xl text-xs font-bold shadow-sm transition-all"
                >
                  <BrainCircuit className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                  Ask AI
                </button>
              </div>
            </div>
          </div>

          {/* KPIs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {viewMode === 'admin' ? (
              <>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Users</div>
                  <div className="flex items-baseline justify-between mt-2">
                    <div className="text-2xl font-black text-slate-900">12,847</div>
                    <div className="text-[10px] font-bold text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded-md">+18.2%</div>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Documents</div>
                  <div className="flex items-baseline justify-between mt-2">
                    <div className="text-2xl font-black text-slate-900">48,392</div>
                    <div className="text-[10px] font-bold text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded-md">+12.4%</div>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Smart Tables</div>
                  <div className="flex items-baseline justify-between mt-2">
                    <div className="text-2xl font-black text-slate-900">9,210</div>
                    <div className="text-[10px] font-bold text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded-md">+24.1%</div>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Storage Used</div>
                  <div className="flex items-baseline justify-between mt-2">
                    <div className="text-2xl font-black text-slate-900">847 GB</div>
                    <div className="text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded-md">-3.8%</div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">My Documents</div>
                  <div className="flex items-baseline justify-between mt-2">
                    <div className="text-2xl font-black text-slate-900">{kpis?.myDocuments?.value || 0}</div>
                    <div className="text-[10px] font-bold text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded-md">+{kpis?.myDocuments?.delta || 3}%</div>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Open Tasks</div>
                  <div className="flex items-baseline justify-between mt-2">
                    <div className="text-2xl font-black text-slate-900">{kpis?.openTasks?.value || 0}</div>
                    <div className="text-[10px] font-bold text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded-md">-{kpis?.openTasks?.delta || 5}%</div>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Team Activity</div>
                  <div className="flex items-baseline justify-between mt-2">
                    <div className="text-2xl font-black text-slate-900">{kpis?.teamActivity?.value || 0}</div>
                    <div className="text-[10px] font-bold text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded-md">+{kpis?.teamActivity?.delta || 32}%</div>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">AI Credits Used</div>
                  <div className="flex items-baseline justify-between mt-2">
                    <div className="text-2xl font-black text-slate-900">
                      {kpis?.aiCredits?.value ? `${(kpis.aiCredits.value / 1000).toFixed(1)}K` : '0K'}
                    </div>
                    <div className="text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded-md">-{kpis?.aiCredits?.delta || -8}%</div>
                  </div>
                </div>
              </>
            )}
          </div>

          {viewMode === 'admin' ? (
            /* Admin view charts */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* Platform Activity line chart card (col-span-2) */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Platform Activity</h3>
                      <span className="text-[10px] text-slate-400 font-medium">Weekly user interactions and API transaction volume</span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded-md">+18.2% vs last week</span>
                  </div>
                  
                  {/* SVG Chart */}
                  <div className="h-64 relative w-full pt-4">
                    <svg viewBox="0 0 500 200" className="w-full h-full overflow-visible">
                      <defs>
                        <linearGradient id="chart-glow" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="rgb(99, 102, 241)" stopOpacity="0.25"/>
                          <stop offset="100%" stopColor="rgb(99, 102, 241)" stopOpacity="0"/>
                        </linearGradient>
                      </defs>
                      
                      {/* Grid Lines */}
                      <line x1="30" y1="40" x2="480" y2="40" stroke="#f1f5f9" strokeDasharray="4 4" />
                      <line x1="30" y1="80" x2="480" y2="80" stroke="#f1f5f9" strokeDasharray="4 4" />
                      <line x1="30" y1="120" x2="480" y2="120" stroke="#f1f5f9" strokeDasharray="4 4" />
                      <line x1="30" y1="160" x2="480" y2="160" stroke="#e2e8f0" />
                      
                      {/* Area Fill */}
                      <path 
                        d="M 30,103 C 67.5,93.6 67.5,84 105,84 C 142.5,84 142.5,64.8 180,64.8 C 217.5,64.8 217.5,77.6 255,77.6 C 292.5,77.6 292.5,39.2 330,39.2 C 367.5,39.2 367.5,90.4 405,90.4 C 442.5,90.4 442.5,58.4 480,58.4 L 480,160 L 30,160 Z" 
                        fill="url(#chart-glow)" 
                      />
                      
                      {/* Smooth Bezier Line */}
                      <path 
                        d="M 30,103 C 67.5,93.6 67.5,84 105,84 C 142.5,84 142.5,64.8 180,64.8 C 217.5,64.8 217.5,77.6 255,77.6 C 292.5,77.6 292.5,39.2 330,39.2 C 367.5,39.2 367.5,90.4 405,90.4 C 442.5,90.4 442.5,58.4 480,58.4" 
                        fill="none" 
                        stroke="rgb(99, 102, 241)" 
                        strokeWidth="3" 
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      
                      {/* Dots and Tooltips */}
                      <g className="cursor-pointer">
                        {[
                          { x: 30, y: 103, label: 'Mon', val: '12.8K' },
                          { x: 105, y: 84, label: 'Tue', val: '15.4K' },
                          { x: 180, y: 64.8, label: 'Wed', val: '18.1K' },
                          { x: 255, y: 77.6, label: 'Thu', val: '16.9K' },
                          { x: 330, y: 39.2, label: 'Fri', val: '22.8K' },
                          { x: 405, y: 90.4, label: 'Sat', val: '14.2K' },
                          { x: 480, y: 58.4, label: 'Sun', val: '19.5K' }
                        ].map((pt, i) => (
                          <g key={i} className="group/dot">
                            <circle cx={pt.x} cy={pt.y} r="5" fill="white" stroke="rgb(99, 102, 241)" strokeWidth="3" />
                            <circle cx={pt.x} cy={pt.y} r="8" fill="rgb(99, 102, 241)" opacity="0" className="group-hover/dot:opacity-20 transition-opacity" />
                            
                            {/* Simple inline tooltip on hover */}
                            <g className="opacity-0 group-hover/dot:opacity-100 transition-opacity duration-200 pointer-events-none">
                              <rect x={pt.x - 24} y={pt.y - 32} width="48" height="20" rx="4" fill="rgb(15, 23, 42)" />
                              <text x={pt.x} y={pt.y - 19} textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">{pt.val}</text>
                            </g>
                          </g>
                        ))}
                      </g>
                      
                      {/* X Axis Labels */}
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => (
                        <text key={idx} x={30 + idx * 75} y="180" textAnchor="middle" className="text-[10px] fill-slate-400 font-bold tracking-wider">{day}</text>
                      ))}
                      
                      {/* Y Axis Labels */}
                      <text x="15" y="45" textAnchor="end" className="text-[9px] fill-slate-400 font-bold">25K</text>
                      <text x="15" y="85" textAnchor="end" className="text-[9px] fill-slate-400 font-bold">15K</text>
                      <text x="15" y="125" textAnchor="end" className="text-[9px] fill-slate-400 font-bold">5K</text>
                      <text x="15" y="165" textAnchor="end" className="text-[9px] fill-slate-400 font-bold">0</text>
                    </svg>
                  </div>
                </div>
                
                {/* Legend */}
                <div className="flex gap-4 mt-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 bg-indigo-500 rounded-sm"></span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Operation Volume</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 border border-indigo-500 bg-white rounded-sm"></span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Active Users (Mocked Scale)</span>
                  </div>
                </div>
              </div>

              {/* Workspace Mix Chart (col-span-1) */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Workspace Mix</h3>
                      <span className="text-[10px] text-slate-400 font-medium">Tenant segmentation</span>
                    </div>
                  </div>

                  {/* SVG Donut Chart */}
                  <div className="h-64 relative w-full flex items-center justify-center">
                    <svg viewBox="0 0 200 200" className="w-48 h-48">
                      {/* Background Circle */}
                      <circle cx="100" cy="100" r="50" fill="transparent" stroke="#f1f5f9" strokeWidth="16" />
                      
                      {/* Segment 1: Corporate Enterprise (45% -> 141.37 stroke length, 0 offset) */}
                      <circle 
                        cx="100" 
                        cy="100" 
                        r="50" 
                        fill="transparent" 
                        stroke="rgb(99, 102, 241)" 
                        strokeWidth="16" 
                        strokeDasharray="141.37 172.79" 
                        strokeDashoffset="0"
                        transform="rotate(-90 100 100)"
                        className="transition-all duration-500 cursor-pointer hover:stroke-[18px]"
                      />
                      
                      {/* Segment 2: Industrial Power (25% -> 78.54 stroke length, -141.37 offset) */}
                      <circle 
                        cx="100" 
                        cy="100" 
                        r="50" 
                        fill="transparent" 
                        stroke="rgb(168, 85, 247)" 
                        strokeWidth="16" 
                        strokeDasharray="78.54 235.62" 
                        strokeDashoffset="-141.37"
                        transform="rotate(-90 100 100)"
                        className="transition-all duration-500 cursor-pointer hover:stroke-[18px]"
                      />
                      
                      {/* Segment 3: Student Space (20% -> 62.83 stroke length, -219.91 offset) */}
                      <circle 
                        cx="100" 
                        cy="100" 
                        r="50" 
                        fill="transparent" 
                        stroke="rgb(16, 185, 129)" 
                        strokeWidth="16" 
                        strokeDasharray="62.83 251.33" 
                        strokeDashoffset="-219.91"
                        transform="rotate(-90 100 100)"
                        className="transition-all duration-500 cursor-pointer hover:stroke-[18px]"
                      />
                      
                      {/* Segment 4: Free Tier (10% -> 31.42 stroke length, -282.74 offset) */}
                      <circle 
                        cx="100" 
                        cy="100" 
                        r="50" 
                        fill="transparent" 
                        stroke="rgb(245, 158, 11)" 
                        strokeWidth="16" 
                        strokeDasharray="31.42 282.74" 
                        strokeDashoffset="-282.74"
                        transform="rotate(-90 100 100)"
                        className="transition-all duration-500 cursor-pointer hover:stroke-[18px]"
                      />
                      
                      {/* Center label */}
                      <text x="100" y="96" textAnchor="middle" className="text-[12px] font-black fill-slate-900 font-sans">48K+</text>
                      <text x="100" y="112" textAnchor="middle" className="text-[8px] font-bold fill-slate-400 uppercase tracking-widest">Tenants</text>
                    </svg>
                  </div>
                </div>

                {/* Legend list */}
                <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-100 text-[10px] font-bold text-slate-555">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full"></span>
                    <span>Corporate (45%)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-purple-500 rounded-full"></span>
                    <span>Industrial (25%)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></span>
                    <span>Student (20%)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-amber-500 rounded-full"></span>
                    <span>Free Tier (10%)</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left Columns (Col Span 2) */}
              <div className="lg:col-span-2 space-y-8">
                
                {/* Recent Documents */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Recent Documents</h3>
                    <span className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer flex items-center gap-0.5">
                      View All <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {pages.slice(0, 4).map(p => (
                      <div 
                        key={p.id} 
                        onClick={() => onSelectPage(p.id)}
                        className="flex items-center justify-between py-3.5 hover:bg-slate-55/40 cursor-pointer rounded-xl px-2 transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-slate-100 rounded-xl group-hover:bg-white border border-transparent group-hover:border-slate-200 transition-all">
                            {getPageIcon(p.type)}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                              {p.title}
                            </div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                              {p.type}
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-350 opacity-0 group-hover:opacity-100 transition-all" />
                      </div>
                    ))}
                    {pages.length === 0 && (
                      <div className="py-6 text-center text-xs text-slate-400">
                        No documents created yet.
                      </div>
                    )}
                  </div>
                </div>

                {/* My Tasks */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">My Tasks</h3>
                      <span className="text-[10px] text-slate-400 font-medium">In-progress and todo items</span>
                    </div>
                    <div className="flex bg-slate-100 p-0.5 rounded-lg">
                      {['all', 'active', 'done'].map((filter) => (
                        <button
                          key={filter}
                          onClick={() => setTaskFilter(filter)}
                          className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${
                            taskFilter === filter
                              ? 'bg-white text-slate-900 shadow-sm'
                              : 'text-slate-500 hover:text-slate-950'
                          }`}
                        >
                          {filter}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3.5">
                    {tasks.map(t => (
                      <div key={t.id} className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-all">
                        <div className="flex items-center gap-3">
                          <CheckSquare className={`w-4 h-4 ${t.status === 'done' ? 'text-emerald-500' : 'text-slate-400'}`} />
                          <div>
                            <div className={`text-xs font-bold ${t.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                              {t.title}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-[9px] font-extrabold uppercase tracking-widest px-1.5 py-0.5 rounded-md ${
                                t.priority === 'high' ? 'bg-red-50 text-red-500' : t.priority === 'medium' ? 'bg-amber-50 text-amber-500' : 'bg-slate-100 text-slate-500'
                              }`}>
                                {t.priority}
                              </span>
                              <span className="text-[10px] text-slate-400 font-semibold">{t.assignee_name || 'Unassigned'}</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Progress bar */}
                        <div className="flex items-center gap-3">
                          <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden hidden sm:block">
                            <div className="h-full bg-indigo-600" style={{ width: `${t.progress}%` }}></div>
                          </div>
                          <span className="text-[10px] font-bold text-slate-500">{t.progress}%</span>
                        </div>
                      </div>
                    ))}
                    {tasks.length === 0 && (
                      <div className="py-6 text-center text-xs text-slate-400">
                        No tasks found for this workspace.
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Right Column (Col Span 1) */}
              <div className="space-y-8">
                
                {/* Upcoming Events */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Upcoming</h3>
                      <span className="text-[10px] text-slate-400 font-medium">This week's schedule</span>
                    </div>
                    <Calendar className="w-4 h-4 text-slate-400" />
                  </div>
                  
                  <div className="space-y-4">
                    {events.map(e => {
                      const eDate = new Date(e.event_time);
                      const isToday = eDate.toDateString() === new Date().toDateString();
                      return (
                        <div key={e.id} className="flex gap-3.5 group">
                          <div className="flex flex-col items-center">
                            <div className={`w-2.5 h-2.5 rounded-full mt-1.5 border-2 ${
                              e.priority === 'high' ? 'bg-red-500 border-red-200' : e.priority === 'medium' ? 'bg-amber-500 border-amber-200' : 'bg-slate-400 border-slate-200'
                            }`}></div>
                            <div className="w-0.5 flex-1 bg-slate-100 group-last:hidden"></div>
                          </div>
                          <div className="pb-4 border-b border-slate-100 group-last:border-none flex-1">
                            <div className="text-xs font-bold text-slate-800">{e.title}</div>
                            <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
                              {isToday ? 'Today' : eDate.toLocaleDateString('en-US', { weekday: 'short' })}, {eDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {events.length === 0 && (
                      <div className="py-6 text-center text-xs text-slate-400">
                        No upcoming events scheduled.
                      </div>
                    )}
                  </div>
                </div>

                {/* Team Members List */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Team Members</h3>
                      <span className="text-[10px] text-slate-400 font-medium">{members.filter(m => m.status === 'online').length} online</span>
                    </div>
                    <Users className="w-4 h-4 text-slate-400" />
                  </div>

                  <div className="space-y-3.5">
                    {members.map(m => {
                      const initials = m.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2);
                      return (
                        <div key={m.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-[11px] font-bold">
                                {initials}
                              </span>
                              <span className={`absolute -right-0.5 -bottom-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${
                                m.status === 'online' ? 'bg-emerald-500' : m.status === 'away' ? 'bg-amber-400' : 'bg-slate-300'
                              }`}></span>
                            </div>
                            <div>
                              <div className="text-xs font-bold text-slate-800">{m.name}</div>
                              <div className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 mt-0.5">{m.role}</div>
                            </div>
                          </div>
                          <span className="text-[9px] font-bold text-slate-400 bg-slate-50 border border-slate-200/80 px-2 py-0.5 rounded-md uppercase tracking-wider">
                            {m.role === 'owner' ? 'Owner' : 'Member'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

            </div>
          )}

        </div>
      )}

      {/* TAB B: ANALYTICS */}
      {activeTab === 'analytics' && (
        <div className="space-y-8">
          
          {/* Usage Trend graph mockup utilizing CSS visualization */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Operations Trend</h3>
                <span className="text-[10px] text-slate-400 font-medium">Daily telemetry logs</span>
              </div>
              <TrendingUp className="w-4 h-4 text-indigo-500" />
            </div>

            {/* Custom Telemetry Chart using pure React elements (No bundle dependency) */}
            <div className="h-64 flex items-end justify-between gap-3 pt-6 border-b border-slate-100 pb-1 px-4">
              {trendData?.labels?.map((label: string, index: number) => {
                const activeVal = trendData.datasets[0].data[index];
                const opVal = trendData.datasets[1].data[index];
                // Max ops scale is 65
                const heightPercentage = Math.min(100, (opVal / 65) * 100);
                return (
                  <div key={label} className="flex-1 flex flex-col items-center h-full group relative">
                    {/* Tooltip on hover */}
                    <div className="absolute bottom-full mb-2 bg-slate-900 text-white text-[9px] font-bold rounded-lg p-2 opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-10 w-24 text-center shadow-lg border border-slate-800">
                      <div>Active Users: {activeVal}</div>
                      <div className="text-indigo-400">Operations: {opVal}</div>
                    </div>
                    {/* Bar visualization */}
                    <div className="w-full flex-1 flex items-end justify-center gap-1">
                      <div className="w-3 rounded-t-sm bg-indigo-500/80 group-hover:bg-indigo-600 transition-all" style={{ height: `${heightPercentage}%` }}></div>
                      <div className="w-3 rounded-t-sm bg-purple-400/80 group-hover:bg-purple-500 transition-all" style={{ height: `${(activeVal / 6) * 100}%` }}></div>
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase mt-2">{label}</span>
                  </div>
                );
              })}
            </div>
            
            {/* Chart Legend */}
            <div className="flex gap-4 mt-4 px-4">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 bg-indigo-500 rounded-sm"></span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Operations Conducted</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 bg-purple-400 rounded-sm"></span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Active Users</span>
              </div>
            </div>
          </div>

          {/* Distribution + Top Workspaces split grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Distribution */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Workspace Pricing Tier Distribution</h3>
                  <span className="text-[10px] text-slate-400 font-medium">Tenant segmentation</span>
                </div>
                <BarChart2 className="w-4 h-4 text-emerald-500" />
              </div>

              <div className="space-y-4">
                {distributionData?.labels?.map((label: string, idx: number) => {
                  const count = distributionData.data[idx];
                  const total = distributionData.data.reduce((a: number, b: number) => a + b, 0);
                  const percentage = ((count / total) * 100).toFixed(0);
                  return (
                    <div key={label}>
                      <div className="flex justify-between text-[11px] font-bold text-slate-650 mb-1.5">
                        <span>{label}</span>
                        <span className="text-slate-400">{count} workspaces ({percentage}%)</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: `${percentage}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top Workspaces */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Top Active Workspaces</h3>
                  <span className="text-[10px] text-slate-400 font-medium">Ranked by document activity</span>
                </div>
                <ShieldCheck className="w-4 h-4 text-purple-500" />
              </div>

              <div className="divide-y divide-slate-100">
                {topWorkspaces.map((ws, index) => (
                  <div key={ws.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-extrabold text-slate-400">#{index + 1}</span>
                      <div>
                        <div className="text-xs font-bold text-slate-800">{ws.name}</div>
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{ws.tier} tier</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-indigo-600">{ws.activityCount} actions</div>
                      <div className="text-[9px] font-semibold text-slate-400">{ws.documentCount} pages</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* TAB C: TEAM */}
      {activeTab === 'team' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Workspace Directory</h3>
              <span className="text-[10px] text-slate-400 font-medium">All authenticated accounts linked to workspace</span>
            </div>
            <button className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all">
              <UserPlus className="w-3.5 h-3.5" />
              Add Member
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {members.map(m => {
              const initials = m.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2);
              return (
                <div key={m.id} className="border border-slate-150 rounded-2xl p-5 hover:border-slate-300 hover:shadow-sm transition-all bg-slate-50/20">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xs font-bold">
                          {initials}
                        </span>
                        <span className={`absolute -right-0.5 -bottom-0.5 w-3 h-3 rounded-full border-2 border-white ${
                          m.status === 'online' ? 'bg-emerald-500' : m.status === 'away' ? 'bg-amber-400' : 'bg-slate-350'
                        }`}></span>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{m.name}</h4>
                        <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 mt-0.5">{m.role}</p>
                      </div>
                    </div>
                    <span className={`text-[9px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-md ${
                      m.role === 'owner' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {m.role === 'owner' ? 'Owner' : 'Member'}
                    </span>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-1.5 text-[10px] text-slate-450 font-semibold">
                    <div>Email: <span className="text-slate-700 font-medium">{m.email}</span></div>
                    <div>Status: <span className={`font-medium ${m.status === 'online' ? 'text-emerald-500' : 'text-slate-500'}`}>{m.status}</span></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB D: DOCUMENTS */}
      {activeTab === 'documents' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Document Explorer</h3>
              <span className="text-[10px] text-slate-400 font-medium">All active pages inside workspace</span>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => onCreatePage('document')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all border border-slate-200"
              >
                + Document
              </button>
              <button 
                onClick={() => onCreatePage('table')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all border border-slate-200"
              >
                + Smart Grid
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pages.map(p => (
              <div 
                key={p.id}
                onClick={() => onSelectPage(p.id)}
                className="border border-slate-200 hover:border-slate-350 rounded-2xl p-5 hover:shadow-md cursor-pointer transition-all bg-white flex flex-col justify-between h-36 group"
              >
                <div className="flex items-start justify-between">
                  <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl group-hover:bg-indigo-50 group-hover:border-indigo-100 transition-all">
                    {getPageIcon(p.type)}
                  </div>
                  <span className="text-[9px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200/80 text-slate-500">
                    {p.type}
                  </span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition-colors truncate">
                    {p.title}
                  </h4>
                  <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1.5">
                    <Clock className="w-3 h-3" />
                    <span>Workspace Node</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB E: ACTIVITY */}
      {activeTab === 'activity' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="mb-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Audit Ledger Logs</h3>
            <span className="text-[10px] text-slate-400 font-medium">Live transaction logs capturing RLS ledger</span>
          </div>

          <div className="relative border-l-2 border-slate-100 pl-4 ml-2 space-y-6">
            {activities.map(log => (
              <div key={log.id} className="relative group">
                <span className="absolute -left-[23px] top-1 w-2.5 h-2.5 rounded-full bg-indigo-500 border-2 border-white group-hover:bg-indigo-600 transition-colors"></span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">{log.action}</span>
                    <span className="text-[9px] font-bold text-slate-400 bg-slate-150 px-1.5 py-0.5 rounded-md">{log.resource}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium mt-1">
                    Conducted by <span className="font-semibold text-slate-700">{log.user_name || 'System'}</span> ({log.user_email || 'system@omnidesk.os'})
                  </div>
                  <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                    {new Date(log.created_at).toLocaleString()}
                  </div>
                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <pre className="mt-2 text-[9px] font-mono bg-slate-950 text-slate-400 p-2.5 rounded-lg border border-slate-900 max-w-lg overflow-x-auto">
                      {JSON.stringify(log.metadata, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            ))}
            {activities.length === 0 && (
              <div className="py-6 text-center text-xs text-slate-400">
                No activity logs recorded yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB F: CALENDAR */}
      {activeTab === 'calendar' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Calendar Schedule</h3>
              <span className="text-[10px] text-slate-400 font-medium">Workspace events list</span>
            </div>
            <button className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all">
              <Plus className="w-3.5 h-3.5" />
              Add Event
            </button>
          </div>

          <div className="space-y-4">
            {events.map(e => {
              const eDate = new Date(e.event_time);
              return (
                <div key={e.id} className="flex items-center justify-between p-4 border border-slate-100 rounded-xl hover:border-slate-200 bg-slate-50/20 hover:bg-slate-50 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">{e.title}</h4>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                        {eDate.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <span className={`text-[9px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-md ${
                    e.priority === 'high' ? 'bg-red-50 text-red-500' : e.priority === 'medium' ? 'bg-amber-50 text-amber-500' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {e.priority || 'low'} priority
                  </span>
                </div>
              );
            })}
            {events.length === 0 && (
              <div className="py-6 text-center text-xs text-slate-400">
                No events found on the schedule.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. FOOTER SIGNATURE */}
      <div className="mt-12 pt-6 border-t border-slate-200 text-center text-[11px] text-slate-400 font-semibold select-none">
        Omnidesk OS &middot; Dashboard preview &middot; static mockup
      </div>

    </div>
  );
};
