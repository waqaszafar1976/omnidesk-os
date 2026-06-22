import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, FileText, Database, HardDrive, TrendingUp, TrendingDown,
  Activity, Bell, Search, Plus, Calendar as CalendarIcon, ArrowUpRight, ArrowDownRight,
  CheckCircle2, Clock, AlertCircle, Sparkles, Settings, LogOut, ChevronRight,
  Zap, Star, MessageSquare, FolderOpen, BarChart3, PieChart as PieChartIcon,
  Filter, Download, MoreHorizontal, Loader2, X
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import {
  login as apiLogin, logout as apiLogout, getToken, BASE_URL, createDoc,
  fetchKpis, fetchUsageTrend, fetchWorkspaceDistribution, fetchTopWorkspaces,
  fetchRecentActivity, fetchWorkspaceMembers, fetchEvents, fetchTasks, fetchRecentDocs,
  normalizeKpisAdmin, normalizeKpisUser, normalizeActivity, normalizeMembers,
  normalizeEvents, normalizeTasks, normalizeRecentDocs, normalizeTopWorkspaces
} from '../lib/omnidesk-api';

/* =========================================================================
   STATIC MOCK DATA
   ========================================================================= */

const KPI_CARDS_ADMIN = [
  { id: 'k1', label: 'Active Users', value: '12,847', delta: 18.2, trend: 'up', color: 'from-blue-500 to-blue-600', icon: Users },
  { id: 'k2', label: 'Total Documents', value: '48,392', delta: 12.4, trend: 'up', color: 'from-purple-500 to-purple-600', icon: FileText },
  { id: 'k3', label: 'Smart Tables', value: '9,210', delta: 24.1, trend: 'up', color: 'from-orange-500 to-pink-500', icon: Database },
  { id: 'k4', label: 'Storage Used', value: '847 GB', delta: -3.8, trend: 'down', color: 'from-emerald-500 to-teal-600', icon: HardDrive },
];

const KPI_CARDS_USER = [
  { id: 'u1', label: 'My Documents', value: '47', delta: 12, trend: 'up', color: 'from-blue-500 to-indigo-600', icon: FileText },
  { id: 'u2', label: 'Open Tasks', value: '23', delta: -5, trend: 'down', color: 'from-amber-500 to-orange-600', icon: CheckCircle2 },
  { id: 'u3', label: 'Team Activity', value: '156', delta: 32, trend: 'up', color: 'from-pink-500 to-rose-600', icon: Activity },
  { id: 'u4', label: 'AI Credits', value: '8.4K', delta: 8, trend: 'up', color: 'from-violet-500 to-purple-600', icon: Sparkles },
];

const USAGE_TREND = [
  { day: 'Mon', users: 4200, docs: 2400, tables: 1800 },
  { day: 'Tue', users: 4800, docs: 2900, tables: 2100 },
  { day: 'Wed', users: 5400, docs: 3200, tables: 2400 },
  { day: 'Thu', users: 5100, docs: 3000, tables: 2300 },
  { day: 'Fri', users: 6200, docs: 3800, tables: 2900 },
  { day: 'Sat', users: 3800, docs: 1900, tables: 1500 },
  { day: 'Sun', users: 3200, docs: 1600, tables: 1200 },
];

const WORKSPACE_DISTRIBUTION = [
  { name: 'Corporate', value: 4200, color: '#3b82f6' },
  { name: 'Personal', value: 3100, color: '#8b5cf6' },
  { name: 'Student', value: 2400, color: '#ec4899' },
  { name: 'Industrial', value: 1800, color: '#f59e0b' },
];

const REVENUE_DATA = [
  { month: 'Jan', revenue: 24000, target: 22000 },
  { month: 'Feb', revenue: 28500, target: 25000 },
  { month: 'Mar', revenue: 32100, target: 28000 },
  { month: 'Apr', revenue: 29800, target: 30000 },
  { month: 'May', revenue: 38400, target: 32000 },
  { month: 'Jun', revenue: 42700, target: 35000 },
];

const RECENT_ACTIVITY = [
  { id: 1, user: 'Sarah Chen', action: 'created', target: 'Q4 Roadmap', type: 'document', time: '2m ago', avatar: 'SC', color: 'bg-blue-500' },
  { id: 2, user: 'Marcus Webb', action: 'updated', target: 'Customer Pipeline', type: 'table', time: '12m ago', avatar: 'MW', color: 'bg-purple-500' },
  { id: 3, user: 'Aisha Patel', action: 'shared', target: 'Sales Dashboard', type: 'canvas', time: '34m ago', avatar: 'AP', color: 'bg-pink-500' },
  { id: 4, user: 'Diego Lopez', action: 'commented on', target: 'Budget Review', type: 'document', time: '1h ago', avatar: 'DL', color: 'bg-orange-500' },
  { id: 5, user: 'Yuki Tanaka', action: 'completed', target: 'Onboarding Flow', type: 'task', time: '2h ago', avatar: 'YT', color: 'bg-emerald-500' },
  { id: 6, user: 'Eva Schmidt', action: 'created', target: 'Marketing Plan', type: 'document', time: '3h ago', avatar: 'ES', color: 'bg-indigo-500' },
];

const TEAM_MEMBERS = [
  { id: 1, name: 'Sarah Chen', role: 'Product Lead', status: 'online', avatar: 'SC', color: 'bg-blue-500' },
  { id: 2, name: 'Marcus Webb', role: 'Engineer', status: 'online', avatar: 'MW', color: 'bg-purple-500' },
  { id: 3, name: 'Aisha Patel', role: 'Designer', status: 'away', avatar: 'AP', color: 'bg-pink-500' },
  { id: 4, name: 'Diego Lopez', role: 'PM', status: 'online', avatar: 'DL', color: 'bg-orange-500' },
  { id: 5, name: 'Yuki Tanaka', role: 'Analyst', status: 'offline', avatar: 'YT', color: 'bg-emerald-500' },
];

const UPCOMING_EVENTS = [
  { id: 1, title: 'Product Review', time: 'Today, 2:00 PM', priority: 'high', color: 'bg-red-100 text-red-700 border-red-200' },
  { id: 2, title: 'Sprint Planning', time: 'Tomorrow, 10:00 AM', priority: 'medium', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { id: 3, title: 'Design Sync', time: 'Wed, 3:30 PM', priority: 'low', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { id: 4, title: 'Q4 Strategy', time: 'Fri, 11:00 AM', priority: 'high', color: 'bg-red-100 text-red-700 border-red-200' },
];

const TOP_WORKSPACES = [
  { name: 'Acme Corp', members: 142, docs: 1240, growth: 34, color: 'from-blue-400 to-blue-600' },
  { name: 'Stellar Labs', members: 98, docs: 890, growth: 28, color: 'from-purple-400 to-pink-500' },
  { name: 'NorthWind Inc', members: 76, docs: 712, growth: 22, color: 'from-orange-400 to-red-500' },
  { name: 'Vertex Studios', members: 54, docs: 543, growth: 18, color: 'from-emerald-400 to-teal-500' },
];

const RECENT_DOCS = [
  { id: 1, title: 'Q4 Product Roadmap', type: 'document', icon: FileText, color: 'text-blue-600 bg-blue-50', updated: '2 min ago', stars: 3 },
  { id: 2, title: 'Customer Pipeline', type: 'table', icon: Database, color: 'text-purple-600 bg-purple-50', updated: '12 min ago', stars: 5 },
  { id: 3, title: 'Sales Dashboard', type: 'canvas', icon: BarChart3, color: 'text-pink-600 bg-pink-50', updated: '34 min ago', stars: 4 },
  { id: 4, title: 'Engineering Sprint', type: 'document', icon: FileText, color: 'text-blue-600 bg-blue-50', updated: '1 hour ago', stars: 2 },
  { id: 5, title: 'Budget 2026', type: 'table', icon: Database, color: 'text-purple-600 bg-purple-50', updated: '3 hours ago', stars: 5 },
];

const TASK_LIST = [
  { id: 1, title: 'Review Q4 budget proposal', priority: 'high', status: 'in-progress', progress: 65 },
  { id: 2, title: 'Onboard new team members', priority: 'medium', status: 'in-progress', progress: 40 },
  { id: 3, title: 'Update product documentation', priority: 'low', status: 'todo', progress: 15 },
  { id: 4, title: 'Design system audit', priority: 'medium', status: 'in-progress', progress: 80 },
];

/* =========================================================================
   SMALL UI BUILDING BLOCKS
   ========================================================================= */

const SectionCard = ({ children, className = '', testId }) => (
  <div
    data-testid={testId}
    className={`bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow ${className}`}
  >
    {children}
  </div>
);

const SectionHeader = ({ title, subtitle, action }) => (
  <div className="flex items-start justify-between p-5 border-b border-slate-100">
    <div>
      <h3 className="text-base font-bold text-slate-900">{title}</h3>
      {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
    </div>
    {action}
  </div>
);

const KPICard = ({ kpi, onClick }) => {
  const Icon = kpi.icon;
  const isUp = kpi.trend === 'up';
  return (
    <div
      data-testid={`kpi-card-${kpi.id}`}
      onClick={onClick}
      className="relative overflow-hidden bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
    >
      <div className={`absolute -top-8 -right-8 w-32 h-32 rounded-full bg-gradient-to-br ${kpi.color} opacity-10`} />
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${kpi.color} flex items-center justify-center shadow-md`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${isUp ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
            {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(kpi.delta)}%
          </div>
        </div>
        <div className="text-2xl font-bold text-slate-900 tracking-tight">{kpi.value}</div>
        <div className="text-sm text-slate-500 mt-1">{kpi.label}</div>
      </div>
    </div>
  );
};

const StatusDot = ({ status }) => {
  const colors = {
    online: 'bg-emerald-500',
    away: 'bg-amber-500',
    offline: 'bg-slate-300',
  };
  return <span className={`inline-block w-2 h-2 rounded-full ${colors[status]}`} />;
};

/* =========================================================================
   SIDEBAR
   ========================================================================= */

const Sidebar = ({ activeView, setActiveView, onClose }) => {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'team', label: 'Team', icon: Users },
    { id: 'documents', label: 'Documents', icon: FolderOpen },
    { id: 'activity', label: 'Activity', icon: Activity },
    { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col" data-testid="dashboard-sidebar">
      <div className="p-5 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-md">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-slate-900 leading-tight">Omnidesk</div>
            <div className="text-[10px] uppercase tracking-widest text-slate-400">Workspace OS</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-widest text-slate-400 font-semibold">Workspace</div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              data-testid={`sidebar-nav-${item.id}`}
              onClick={() => setActiveView(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : ''}`} />
              <span>{item.label}</span>
              {isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto text-indigo-500" />}
            </button>
          );
        })}

        <div className="px-3 pt-6 pb-1 text-[10px] uppercase tracking-widest text-slate-400 font-semibold">Pinned</div>
        {['Q4 Roadmap', 'Sales Pipeline', 'Team OKRs'].map((label, i) => (
          <button
            key={label}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          >
            <span className={`w-2 h-2 rounded-full ${['bg-blue-500', 'bg-purple-500', 'bg-pink-500'][i]}`} />
            <span className="truncate">{label}</span>
          </button>
        ))}
      </nav>

      <div className="p-3 border-t border-slate-200">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 hover:from-indigo-50 hover:to-purple-50 cursor-pointer transition-all">
          <Avatar className="w-9 h-9">
            <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-sm font-semibold">DU</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-slate-900 truncate">Demo User</div>
            <div className="text-xs text-slate-500 truncate">demo@omnidesk.com</div>
          </div>
          <Settings className="w-4 h-4 text-slate-400" />
        </div>
      </div>
    </aside>
  );
};

/* =========================================================================
   TOP BAR
   ========================================================================= */

const TopBar = ({ onBack, onLogout, authed, onNewClick }) => (
  <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
    <div className="flex items-center gap-4 flex-1 max-w-2xl">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          data-testid="dashboard-search"
          placeholder="Search workspaces, documents, people..."
          className="pl-10 bg-slate-50 border-slate-200 focus-visible:ring-indigo-500"
        />
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400 bg-white border border-slate-200 rounded px-1.5 py-0.5">⌘K</kbd>
      </div>
    </div>

    <div className="flex items-center gap-2">
      <Button
        data-testid="dashboard-new-button"
        onClick={onNewClick}
        className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md"
      >
        <Plus className="w-4 h-4 mr-1.5" /> New
      </Button>
      <button className="relative p-2 hover:bg-slate-100 rounded-lg" data-testid="dashboard-notifications">
        <Bell className="w-5 h-5 text-slate-600" />
        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white" />
      </button>
      {authed && (
        <button
          data-testid="dashboard-logout"
          onClick={onLogout}
          className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 text-sm font-medium px-3 flex items-center gap-1.5"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      )}
      <button
        data-testid="dashboard-back-to-workspace"
        onClick={onBack}
        className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 text-sm font-medium px-3"
      >
        Back to Workspace
      </button>
    </div>
  </div>
);

/* =========================================================================
   ADMIN VIEW
   ========================================================================= */

const AdminView = ({ data, onKpiClick }) => {
  const arr = (v, fb) => (Array.isArray(v) && v.length > 0 ? v : fb);
  const kpis = arr(data?.kpis, KPI_CARDS_ADMIN);
  const usageTrend = arr(data?.usageTrend, USAGE_TREND);
  const workspaceDist = arr(data?.workspaceDist, WORKSPACE_DISTRIBUTION);
  const topWorkspaces = arr(data?.topWorkspaces, TOP_WORKSPACES);
  const recentActivity = arr(data?.recentActivity, RECENT_ACTIVITY);
  return (
  <div className="space-y-6">
    {/* KPI ROW */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi) => <KPICard key={kpi.id} kpi={kpi} onClick={() => onKpiClick(kpi.id)} />)}
    </div>

    {/* CHARTS ROW */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <SectionCard className="lg:col-span-2" testId="usage-trend-card">
        <SectionHeader
          title="Platform Activity"
          subtitle="Daily users, documents, tables created"
          action={
            <div className="flex gap-1 text-xs">
              {['7D', '30D', '90D'].map((p, i) => (
                <button
                  key={p}
                  className={`px-2.5 py-1 rounded-md font-medium ${i === 0 ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-slate-100'}`}
                >{p}</button>
              ))}
            </div>
          }
        />
        <div className="p-5 pt-3 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={usageTrend}>
              <defs>
                <linearGradient id="gUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gDocs" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ec4899" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#ec4899" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gTables" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
              />
              <Area type="monotone" dataKey="users" stroke="#6366f1" strokeWidth={2.5} fill="url(#gUsers)" />
              <Area type="monotone" dataKey="docs" stroke="#ec4899" strokeWidth={2.5} fill="url(#gDocs)" />
              <Area type="monotone" dataKey="tables" stroke="#f59e0b" strokeWidth={2.5} fill="url(#gTables)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      <SectionCard testId="workspace-pie-card">
        <SectionHeader title="Workspace Mix" subtitle="By workspace type" />
        <div className="p-5 pt-3 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={workspaceDist} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3}>
                {workspaceDist.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="px-5 pb-5 space-y-2">
          {workspaceDist.map((w) => (
            <div key={w.name} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: w.color }} />
                <span className="text-slate-600">{w.name}</span>
              </div>
              <span className="font-semibold text-slate-900">{w.value.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>

    {/* REVENUE + TOP WORKSPACES */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <SectionCard className="lg:col-span-2" testId="revenue-card">
        <SectionHeader
          title="Revenue vs Target"
          subtitle="Monthly performance"
          action={<Button variant="outline" size="sm" className="text-xs"><Download className="w-3.5 h-3.5 mr-1" />Export</Button>}
        />
        <div className="p-5 pt-3 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={REVENUE_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px' }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="target" fill="#e2e8f0" radius={[6, 6, 0, 0]} />
              <Bar dataKey="revenue" fill="url(#gBar)" radius={[6, 6, 0, 0]} />
              <defs>
                <linearGradient id="gBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#6366f1" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      <SectionCard testId="top-workspaces-card">
        <SectionHeader title="Top Workspaces" subtitle="Highest growth this month" />
        <div className="p-3 space-y-2">
          {topWorkspaces.map((ws, i) => (
            <div key={ws.name} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${ws.color} flex items-center justify-center text-white font-bold text-sm shadow-sm`}>
                {ws.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-900 truncate">{ws.name}</div>
                <div className="text-xs text-slate-500">{ws.members} members · {ws.docs} docs</div>
              </div>
              <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                <TrendingUp className="w-3 h-3" /> +{ws.growth}%
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>

    {/* ACTIVITY TABLE */}
    <SectionCard testId="recent-activity-card">
      <SectionHeader
        title="Recent Activity"
        subtitle="Latest actions across all workspaces"
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="text-xs"><Filter className="w-3.5 h-3.5 mr-1" />Filter</Button>
            <Button variant="outline" size="sm" className="text-xs">View All</Button>
          </div>
        }
      />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
              <th className="font-semibold p-4">User</th>
              <th className="font-semibold p-4">Action</th>
              <th className="font-semibold p-4">Item</th>
              <th className="font-semibold p-4">Type</th>
              <th className="font-semibold p-4">Time</th>
              <th className="font-semibold p-4"></th>
            </tr>
          </thead>
          <tbody>
            {recentActivity.map((a) => (
              <tr key={a.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                <td className="p-4">
                  <div className="flex items-center gap-2.5">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className={`${a.color} text-white text-xs font-semibold`}>{a.avatar}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-slate-900">{a.user}</span>
                  </div>
                </td>
                <td className="p-4 text-slate-600">{a.action}</td>
                <td className="p-4 font-medium text-slate-900">{a.target}</td>
                <td className="p-4">
                  <Badge variant="secondary" className="font-medium capitalize">{a.type}</Badge>
                </td>
                <td className="p-4 text-slate-500">{a.time}</td>
                <td className="p-4 text-right"><MoreHorizontal className="w-4 h-4 text-slate-400" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  </div>
  );
};

/* =========================================================================
   USER VIEW
   ========================================================================= */

const UserView = ({ data, user, onKpiClick }) => {
  const arr = (v, fb) => (Array.isArray(v) && v.length > 0 ? v : fb);
  const kpis = arr(data?.kpis, KPI_CARDS_USER);
  const recentDocs = arr(data?.recentDocs, RECENT_DOCS);
  const upcomingEvents = arr(data?.events, UPCOMING_EVENTS);
  const tasks = arr(data?.tasks, TASK_LIST);
  const team = arr(data?.team, TEAM_MEMBERS);
  const userName = user?.name || 'Demo User';
  return (
  <div className="space-y-6">
    {/* WELCOME BANNER */}
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-7 text-white">
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-12" />
      <div className="relative flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="text-xs uppercase tracking-widest opacity-80 mb-1">Welcome back</div>
          <h2 className="text-2xl font-bold mb-1">Good morning, {userName}</h2>
          <p className="text-white/80 text-sm">You have <strong>3 tasks</strong> due today and <strong>5 unread comments</strong>.</p>
        </div>
        <div className="flex gap-2">
          <Button className="bg-white/15 hover:bg-white/25 text-white border border-white/20 backdrop-blur-sm">
            <Plus className="w-4 h-4 mr-1.5" /> New Document
          </Button>
          <Button className="bg-white text-indigo-700 hover:bg-white/90 font-semibold">
            <Sparkles className="w-4 h-4 mr-1.5" /> Ask AI
          </Button>
        </div>
      </div>
    </div>

    {/* KPIs */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi) => <KPICard key={kpi.id} kpi={kpi} onClick={() => onKpiClick(kpi.id)} />)}
    </div>

    {/* MIDDLE GRID */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Recent Docs */}
      <SectionCard className="lg:col-span-2" testId="recent-docs-card">
        <SectionHeader
          title="Recent Documents"
          subtitle="Continue where you left off"
          action={<Button variant="outline" size="sm" className="text-xs">View All</Button>}
        />
        <div className="p-3 space-y-1.5">
          {recentDocs.map((doc) => {
            const Icon = doc.icon || (doc.type === 'table' ? Database : doc.type === 'canvas' ? BarChart3 : FileText);
            return (
              <div
                key={doc.id}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 cursor-pointer group transition-colors"
              >
                <div className={`w-10 h-10 rounded-xl ${doc.color} flex items-center justify-center`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-900 truncate">{doc.title}</div>
                  <div className="text-xs text-slate-500 capitalize">{doc.type} · {doc.updated}</div>
                </div>
                <div className="flex items-center gap-1 text-amber-500">
                  {Array.from({ length: doc.stars || 0 }).map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-current" />
                  ))}
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* Calendar / Upcoming */}
      <SectionCard testId="upcoming-events-card">
        <SectionHeader
          title="Upcoming"
          subtitle="Today & this week"
          action={<CalendarIcon className="w-4 h-4 text-slate-400" />}
        />
        <div className="p-3 space-y-2">
          {upcomingEvents.map((event) => (
            <div
              key={event.id}
              className={`p-3 rounded-xl border ${event.color} cursor-pointer hover:scale-[1.02] transition-transform`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{event.title}</div>
                  <div className="text-xs opacity-80 mt-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {event.time}
                  </div>
                </div>
                {event.priority === 'high' && (
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                )}
              </div>
            </div>
          ))}
          <button className="w-full mt-2 text-xs text-indigo-600 hover:text-indigo-700 font-semibold py-2">
            + Add Event
          </button>
        </div>
      </SectionCard>
    </div>

    {/* BOTTOM GRID */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Tasks */}
      <div id="tasks-card-container" className="lg:col-span-2">
        <SectionCard testId="tasks-card">
        <SectionHeader
          title="My Tasks"
          subtitle="In-progress and todo items"
          action={
            <div className="flex gap-1">
              {['All', 'Active', 'Done'].map((t, i) => (
                <button
                  key={t}
                  className={`px-2.5 py-1 text-xs rounded-md font-medium ${i === 0 ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-slate-100'}`}
                >{t}</button>
              ))}
            </div>
          }
        />
        <div className="p-5 space-y-4">
          {tasks.map((task) => {
            const priorityColors = {
              high: 'text-rose-600 bg-rose-50',
              medium: 'text-amber-600 bg-amber-50',
              low: 'text-blue-600 bg-blue-50',
            };
            return (
              <div key={task.id} className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-2 h-2 rounded-full ${task.status === 'in-progress' ? 'bg-indigo-500' : 'bg-slate-300'}`} />
                    <span className="text-sm font-medium text-slate-900 truncate">{task.title}</span>
                  </div>
                  <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded ${priorityColors[task.priority]}`}>
                    {task.priority}
                  </span>
                  <span className="text-xs font-mono text-slate-500 w-10 text-right">{task.progress}%</span>
                </div>
                <Progress value={task.progress} className="h-1.5" />
              </div>
            );
          })}
        </div>
      </SectionCard>
    </div>

      {/* Team */}
      <SectionCard testId="team-members-card">
        <SectionHeader title="Team" subtitle={`${team.length} members`} />
        <div className="p-3 space-y-1">
          {team.map((m) => (
            <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors">
              <div className="relative">
                <Avatar className="w-9 h-9">
                  <AvatarFallback className={`${m.color} text-white text-xs font-semibold`}>{m.avatar}</AvatarFallback>
                </Avatar>
                <span className="absolute -bottom-0.5 -right-0.5 ring-2 ring-white rounded-full">
                  <StatusDot status={m.status} />
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-900 truncate">{m.name}</div>
                <div className="text-xs text-slate-500">{m.role}</div>
              </div>
              <button className="p-1.5 rounded-lg hover:bg-slate-100">
                <MessageSquare className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  </div>
  );
};

/* =========================================================================
   ROOT
   ========================================================================= */

/* =========================================================================
   SECONDARY VIEWS (sidebar nav targets)
   ========================================================================= */

const PageHeader = ({ title, subtitle, breadcrumb }) => (
  <div className="mb-6">
    <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
      <span>Workspace</span>
      <ChevronRight className="w-3 h-3" />
      <span className="text-slate-700 font-medium">{breadcrumb || title}</span>
    </div>
    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
    {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
  </div>
);

const AnalyticsView = ({ data }) => {
  const arr = (v, fb) => (Array.isArray(v) && v.length > 0 ? v : fb);
  const usageTrend = arr(data?.usageTrend, USAGE_TREND);
  const workspaceDist = arr(data?.workspaceDist, WORKSPACE_DISTRIBUTION);

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" subtitle="Deep dive into platform metrics" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard testId="analytics-usage-card">
          <SectionHeader title="Usage Trend" subtitle="Last 7 days across all activity" />
          <div className="p-5 pt-3 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={usageTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px' }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="users" stroke="#6366f1" strokeWidth={2.5} fillOpacity={0.2} fill="#6366f1" />
                <Area type="monotone" dataKey="docs" stroke="#ec4899" strokeWidth={2.5} fillOpacity={0.2} fill="#ec4899" />
                <Area type="monotone" dataKey="tables" stroke="#f59e0b" strokeWidth={2.5} fillOpacity={0.2} fill="#f59e0b" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
        <SectionCard testId="analytics-revenue-card">
          <SectionHeader title="Revenue Performance" subtitle="Monthly revenue vs target" />
          <div className="p-5 pt-3 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={REVENUE_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px' }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="target" fill="#e2e8f0" radius={[6, 6, 0, 0]} />
                <Bar dataKey="revenue" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>
      <SectionCard testId="analytics-distribution-card">
        <SectionHeader title="Workspace Distribution" subtitle="By workspace type" />
        <div className="p-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {workspaceDist.map((w, i) => (
              <div key={w.name || i} className="p-4 rounded-xl border border-slate-200 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background: w.color || '#6366f1' }} />
                  <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">{w.name}</span>
                </div>
                <div className="text-2xl font-bold text-slate-900">{(w.value || 0).toLocaleString()}</div>
                <div className="text-xs text-slate-500 mt-1">workspaces</div>
              </div>
            ))}
          </div>
        </div>
      </SectionCard>
    </div>
  );
};

const TeamView = ({ data }) => {
  const team = (Array.isArray(data?.team) && data.team.length > 0) ? data.team : TEAM_MEMBERS;
  return (
    <div className="space-y-6">
      <PageHeader title="Team" subtitle={`${team.length} members in this workspace`} />
      <SectionCard testId="team-grid-card">
        <SectionHeader title="All Members" subtitle="Active across all workspaces" action={
          <Button className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white" size="sm"><Plus className="w-3.5 h-3.5 mr-1" />Invite</Button>
        }/>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {team.map((m, i) => (
            <div key={m.id || i} className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 hover:shadow-md hover:border-indigo-200 transition-all">
              <div className="relative">
                <Avatar className="w-12 h-12">
                  <AvatarFallback className={`${m.color} text-white font-semibold`}>{m.avatar}</AvatarFallback>
                </Avatar>
                <span className="absolute -bottom-0.5 -right-0.5 ring-2 ring-white rounded-full">
                  <StatusDot status={m.status} />
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-900 truncate">{m.name}</div>
                <div className="text-xs text-slate-500 mb-1">{m.role}</div>
                <Badge variant="secondary" className="text-[10px] capitalize">{m.status}</Badge>
              </div>
              <button className="p-2 rounded-lg hover:bg-slate-100">
                <MessageSquare className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
};

const DocumentsView = ({ data }) => {
  const docs = (Array.isArray(data?.recentDocs) && data.recentDocs.length > 0) ? data.recentDocs : RECENT_DOCS;
  return (
    <div className="space-y-6">
      <PageHeader title="Documents" subtitle="All your documents, tables, and canvases" />
      <SectionCard testId="documents-list-card">
        <SectionHeader title="All Documents" subtitle={`${docs.length} items`} action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="text-xs"><Filter className="w-3.5 h-3.5 mr-1" />Filter</Button>
            <Button className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white" size="sm"><Plus className="w-3.5 h-3.5 mr-1" />New</Button>
          </div>
        }/>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {docs.map((doc, i) => {
            const Icon = doc.icon || (doc.type === 'table' ? Database : doc.type === 'canvas' ? BarChart3 : FileText);
            return (
              <div key={doc.id || i} className="p-4 rounded-xl border border-slate-200 hover:shadow-md hover:border-indigo-200 cursor-pointer transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-xl ${doc.color || 'text-blue-600 bg-blue-50'} flex items-center justify-center`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <Badge variant="secondary" className="text-[10px] capitalize">{doc.type}</Badge>
                </div>
                <div className="font-semibold text-slate-900 truncate mb-1">{doc.title}</div>
                <div className="text-xs text-slate-500">Updated {doc.updated}</div>
              </div>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
};

const ActivityView = ({ data }) => {
  const activity = (Array.isArray(data?.recentActivity) && data.recentActivity.length > 0) ? data.recentActivity : RECENT_ACTIVITY;
  return (
    <div className="space-y-6">
      <PageHeader title="Activity" subtitle="All actions across your workspaces" />
      <SectionCard testId="activity-feed-card">
        <SectionHeader title="Activity Feed" subtitle="Real-time updates" />
        <div className="p-5 space-y-1">
          {activity.map((a, i) => (
            <div key={a.id || i} className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50">
              <Avatar className="w-9 h-9 flex-shrink-0">
                <AvatarFallback className={`${a.color} text-white text-xs font-semibold`}>{a.avatar}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-slate-900">
                  <span className="font-semibold">{a.user}</span>{' '}
                  <span className="text-slate-500">{a.action}</span>{' '}
                  <span className="font-medium">{a.target}</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-[10px] capitalize">{a.type}</Badge>
                  <span className="text-xs text-slate-400">{a.time}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
};

const CalendarView = ({ data }) => {
  const events = (Array.isArray(data?.events) && data.events.length > 0) ? data.events : UPCOMING_EVENTS;
  return (
    <div className="space-y-6">
      <PageHeader title="Calendar" subtitle="Your upcoming events and deadlines" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SectionCard className="lg:col-span-2" testId="calendar-month-card">
          <SectionHeader title={new Date().toLocaleString('default', { month: 'long', year: 'numeric' })} subtitle="Month view" />
          <div className="p-5">
            <div className="grid grid-cols-7 gap-1 text-center mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="text-[10px] uppercase tracking-wider font-bold text-slate-400 py-2">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 35 }, (_, i) => {
                const day = i - 2;
                const isToday = day === new Date().getDate();
                const hasEvent = [3, 7, 12, 18, 22].includes(day);
                return (
                  <div
                    key={i}
                    className={`aspect-square flex flex-col items-center justify-center text-sm rounded-lg cursor-pointer transition-colors
                      ${day < 1 || day > 31 ? 'text-slate-300' : 'text-slate-700 hover:bg-slate-100'}
                      ${isToday ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white font-bold hover:from-indigo-700 hover:to-purple-700' : ''}
                    `}
                  >
                    <span>{day >= 1 && day <= 31 ? day : ''}</span>
                    {hasEvent && day >= 1 && day <= 31 && !isToday && <span className="w-1 h-1 bg-indigo-500 rounded-full mt-0.5" />}
                  </div>
                );
              })}
            </div>
          </div>
        </SectionCard>

        <SectionCard testId="calendar-events-card">
          <SectionHeader title="Upcoming Events" subtitle="Next 7 days" />
          <div className="p-3 space-y-2">
            {events.map((event, i) => (
              <div key={event.id || i} className={`p-3 rounded-xl border ${event.color} cursor-pointer hover:scale-[1.02] transition-transform`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{event.title}</div>
                    <div className="text-xs opacity-80 mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {event.time}
                    </div>
                  </div>
                  {event.priority === 'high' && <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
};

/* =========================================================================
   LOGIN MODAL
   ========================================================================= */

const LoginModal = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('admin@omnidesk.com');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await apiLogin(email, password);
      onLoginSuccess(result.user);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Login failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden" data-testid="login-modal">
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-6 text-white">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-lg leading-tight">Omnidesk OS</div>
              <div className="text-[10px] uppercase tracking-widest opacity-80">Sign in to dashboard</div>
            </div>
          </div>
          <p className="text-white/80 text-sm">Connect to your Antigravity backend</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs uppercase tracking-widest font-semibold text-slate-500 mb-1.5 block">Email</label>
            <Input
              data-testid="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="border-slate-200 focus-visible:ring-indigo-500"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest font-semibold text-slate-500 mb-1.5 block">Password</label>
            <Input
              data-testid="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="border-slate-200 focus-visible:ring-indigo-500"
            />
          </div>
          {error && (
            <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3" data-testid="login-error">
              {error}
            </div>
          )}
          <Button
            type="submit"
            disabled={loading}
            data-testid="login-submit"
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md"
          >
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing in...</> : 'Sign In'}
          </Button>
          <p className="text-xs text-center text-slate-400">
            Backend: <code className="font-mono text-slate-500">{BASE_URL}</code>
          </p>
        </form>
      </div>
    </div>
  );
};

/* =========================================================================
   ROOT
   ========================================================================= */

const DashboardPage = () => {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState('overview');
  const [activeTab, setActiveTab] = useState('user');
  const [authed, setAuthed] = useState(!!getToken());
  const [user, setUser] = useState(null);
  const [loadingData, setLoadingData] = useState(false);
  const [adminData, setAdminData] = useState({});
  const [userData, setUserData] = useState({});
  const [apiError, setApiError] = useState('');

  // Interactive UI Modal states
  const [selectedInfoModal, setSelectedInfoModal] = useState(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState('document');
  const [newTaskPriority, setNewTaskPriority] = useState('medium');
  const [newLoading, setNewLoading] = useState(false);
  const [newError, setNewError] = useState('');

  const handleKpiClick = (id) => {
    switch (id) {
      case 'k1': // Active Users (Admin)
        setActiveView('team');
        break;
      case 'k2': // Total Documents (Admin)
      case 'k3': // Smart Tables (Admin)
      case 'u1': // My Documents (User)
        setActiveView('documents');
        break;
      case 'k4': // Storage Used (Admin)
        setSelectedInfoModal({
          title: 'Storage Capacity Details',
          content: 'You are currently using 847 GB of your 1 TB enterprise storage plan (84.7% capacity). Active document indexes account for 312 GB, historical database snapshots account for 415 GB, and files/attachments account for 120 GB.',
          details: [
            { label: 'Document Files', value: '312 GB' },
            { label: 'Database Logs', value: '415 GB' },
            { label: 'Uploaded Media', value: '120 GB' },
            { label: 'Remaining Space', value: '177 GB' }
          ]
        });
        break;
      case 'u2': // Open Tasks (User)
        // Switch to overview tab if not there
        setActiveView('overview');
        // Scroll to tasks card
        setTimeout(() => {
          const tasksCard = document.getElementById('tasks-card-container');
          if (tasksCard) {
            tasksCard.scrollIntoView({ behavior: 'smooth' });
          } else {
            setActiveView('calendar');
          }
        }, 100);
        break;
      case 'u3': // Team Activity (User)
        setActiveView('activity');
        break;
      case 'u4': // AI Credits (User)
        setSelectedInfoModal({
          title: 'AI Token Credits Breakdown',
          content: 'Your account has 8.4K AI Credits remaining out of 10.0K monthly tokens allocated. These credits are consumed when generating summaries, formulas, or utilizing autonomous code edits.',
          details: [
            { label: 'Monthly Quota', value: '10.0K credits' },
            { label: 'Consumed this Month', value: '1.6K credits' },
            { label: 'Remaining Tokens', value: '8.4K credits' },
            { label: 'Auto-Renewal Date', value: 'July 1, 2026' }
          ]
        });
        break;
      default:
        break;
    }
  };

  const handleCreateResource = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setNewError('Please enter a title');
      return;
    }
    setNewLoading(true);
    setNewError('');

    try {
      if (newType === 'document' || newType === 'table' || newType === 'canvas') {
        const result = await createDoc(newTitle, newType);
        if (result && (result.success || result.id)) {
          // Success! Reload data to refresh document list
          await loadData();
          setShowNewModal(false);
          setNewTitle('');
        } else {
          throw new Error('Failed to create page on the backend');
        }
      } else if (newType === 'task') {
        const newTask = {
          id: 'temp-task-' + Date.now(),
          title: newTitle,
          priority: newTaskPriority,
          status: 'todo',
          progress: 0
        };
        setUserData(prev => ({
          ...prev,
          tasks: [newTask, ...(prev.tasks || [])]
        }));
        setShowNewModal(false);
        setNewTitle('');
      } else if (newType === 'event') {
        const newEvent = {
          id: 'temp-event-' + Date.now(),
          title: newTitle,
          time: 'Today, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          priority: newTaskPriority,
          color: newTaskPriority === 'high' ? 'bg-red-100 text-red-700 border-red-200' : newTaskPriority === 'medium' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-blue-100 text-blue-700 border-blue-200'
        };
        setUserData(prev => ({
          ...prev,
          events: [newEvent, ...(prev.events || [])]
        }));
        setShowNewModal(false);
        setNewTitle('');
      }
    } catch (err) {
      setNewError(err.message || 'Error creating resource');
    } finally {
      setNewLoading(false);
    }
  };

  const loadData = useCallback(async () => {
    setLoadingData(true);
    setApiError('');
    try {
      const [
        adminKpisRaw, userKpisRaw, trendRaw, distRaw, topRaw,
        activityRaw, docsRaw, eventsRaw, tasksRaw, membersRaw
      ] = await Promise.all([
        fetchKpis('admin'),
        fetchKpis('user'),
        fetchUsageTrend('7d'),
        fetchWorkspaceDistribution(),
        fetchTopWorkspaces(4),
        fetchRecentActivity(10),
        fetchRecentDocs(5),
        fetchEvents('week'),
        fetchTasks('all'),
        fetchWorkspaceMembers('default'),
      ]);

      setAdminData({
        kpis: normalizeKpisAdmin(adminKpisRaw),
        usageTrend: trendRaw?.data || trendRaw,
        workspaceDist: distRaw?.data || distRaw,
        topWorkspaces: normalizeTopWorkspaces(topRaw?.data || topRaw),
        recentActivity: normalizeActivity(activityRaw?.data || activityRaw),
      });
      setUserData({
        kpis: normalizeKpisUser(userKpisRaw),
        recentDocs: normalizeRecentDocs(docsRaw),
        events: normalizeEvents(eventsRaw?.data || eventsRaw),
        tasks: normalizeTasks(tasksRaw?.data || tasksRaw),
        team: normalizeMembers(membersRaw?.data || membersRaw),
      });
    } catch (e) {
      setApiError(e.message || 'Failed to load some dashboard data');
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (authed) loadData();
  }, [authed, loadData]);

  const handleLoginSuccess = (u) => {
    setUser(u);
    setAuthed(true);
  };

  const handleLogout = () => {
    apiLogout();
    setAuthed(false);
    setAdminData({});
    setUserData({});
  };

  return (
    <div className="flex h-screen bg-slate-50" data-testid="dashboard-root">
      {!authed && <LoginModal onLoginSuccess={handleLoginSuccess} />}

      <Sidebar activeView={activeView} setActiveView={setActiveView} onClose={() => navigate('/workspace')} />

      <main className="flex-1 flex flex-col overflow-hidden">
        <TopBar onBack={() => navigate('/workspace')} onLogout={handleLogout} authed={authed} onNewClick={() => setShowNewModal(true)} />

        <div className="flex-1 overflow-y-auto">
          <div className="p-6 max-w-[1600px] mx-auto">
            {apiError && (
              <div className="mb-4 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                Some endpoints unavailable — showing fallback data where missing. ({apiError})
              </div>
            )}

            {activeView === 'overview' && (
              <>
                {/* PAGE HEADER */}
                <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                      <span>Workspace</span>
                      <ChevronRight className="w-3 h-3" />
                      <span className="text-slate-700 font-medium">Dashboard</span>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                      {activeTab === 'admin' ? 'Admin Dashboard' : 'My Dashboard'}
                    </h1>
                  </div>

                  <div className="flex items-center gap-3">
                    {loadingData && (
                      <div className="flex items-center gap-2 text-xs text-slate-500" data-testid="loading-indicator">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading...
                      </div>
                    )}
                    <Tabs value={activeTab} onValueChange={setActiveTab} data-testid="dashboard-view-tabs">
                      <TabsList className="bg-white border border-slate-200 shadow-sm">
                        <TabsTrigger value="user" data-testid="tab-user" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-purple-600 data-[state=active]:text-white">
                          <Users className="w-3.5 h-3.5 mr-1.5" /> User View
                        </TabsTrigger>
                        <TabsTrigger value="admin" data-testid="tab-admin" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-purple-600 data-[state=active]:text-white">
                          <Settings className="w-3.5 h-3.5 mr-1.5" /> Admin View
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                </div>

                {activeTab === 'admin' ? (
                  <AdminView data={adminData} onKpiClick={handleKpiClick} />
                ) : (
                  <UserView data={userData} user={user} onKpiClick={handleKpiClick} />
                )}
              </>
            )}

            {activeView === 'analytics' && <AnalyticsView data={adminData} />}
            {activeView === 'team'      && <TeamView      data={userData} />}
            {activeView === 'documents' && <DocumentsView data={userData} />}
            {activeView === 'activity'  && <ActivityView  data={adminData} />}
            {activeView === 'calendar'  && <CalendarView  data={userData} />}

            <div className="text-center text-xs text-slate-400 py-8">
              Omnidesk OS · Connected to <code className="font-mono">{BASE_URL}</code>
            </div>
          </div>
        </div>
      </main>

      {/* Selected Info / Capacity details Modal */}
      {selectedInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-5 text-white flex items-center justify-between">
              <h3 className="font-bold text-lg">{selectedInfoModal.title}</h3>
              <button onClick={() => setSelectedInfoModal(null)} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600 leading-relaxed">{selectedInfoModal.content}</p>
              {selectedInfoModal.details && (
                <div className="border border-slate-150 rounded-xl overflow-hidden text-sm">
                  {selectedInfoModal.details.map((d, idx) => (
                    <div key={idx} className={`flex justify-between p-3 ${idx % 2 === 0 ? 'bg-slate-50' : 'bg-white'} border-b border-slate-100 last:border-b-0`}>
                      <span className="font-medium text-slate-500">{d.label}</span>
                      <span className="font-bold text-slate-800">{d.value}</span>
                    </div>
                  ))}
                </div>
              )}
              <Button onClick={() => setSelectedInfoModal(null)} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold mt-4">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create New Resource Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-5 text-white flex items-center justify-between">
              <h3 className="font-bold text-lg flex items-center gap-1.5"><Plus className="w-5 h-5" /> Create New Resource</h3>
              <button onClick={() => { setShowNewModal(false); setNewTitle(''); setNewError(''); }} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateResource} className="p-6 space-y-4">
              <div>
                <label className="text-xs uppercase tracking-widest font-semibold text-slate-500 mb-1.5 block">Resource Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: 'document', label: 'Document' },
                    { val: 'table', label: 'Smart Table' },
                    { val: 'canvas', label: 'Canvas' },
                    { val: 'task', label: 'Task' },
                    { val: 'event', label: 'Event' }
                  ].map((t) => (
                    <button
                      key={t.val}
                      type="button"
                      onClick={() => setNewType(t.val)}
                      className={`p-2.5 text-xs rounded-xl border font-semibold transition-all ${
                        newType === t.val
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs uppercase tracking-widest font-semibold text-slate-500 mb-1.5 block">Title / Name</label>
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Q4 Strategy Review"
                  required
                  className="border-slate-200 focus-visible:ring-indigo-500"
                />
              </div>

              {(newType === 'task' || newType === 'event') && (
                <div>
                  <label className="text-xs uppercase tracking-widest font-semibold text-slate-500 mb-1.5 block">Priority</label>
                  <div className="flex gap-2">
                    {['low', 'medium', 'high'].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setNewTaskPriority(p)}
                        className={`flex-1 p-2 text-xs rounded-lg border font-semibold capitalize transition-all ${
                          newTaskPriority === p
                            ? p === 'high' ? 'border-rose-500 bg-rose-50 text-rose-700' : p === 'medium' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {newError && (
                <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3">
                  {newError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setShowNewModal(false); setNewTitle(''); setNewError(''); }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={newLoading}
                  className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md"
                >
                  {newLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
