import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  LayoutDashboard, BarChart2, Users, FolderOpen, Activity, 
  Calendar, Settings, LogOut, ChevronRight, Zap
} from 'lucide-react';
import { LanguageSelector } from '../ui/LanguageSelector';
import { AuditLedgerWidget } from './AuditLedgerWidget';

interface PageItem {
  id: string;
  title: string;
  type: 'document' | 'table' | 'canvas';
}

interface UserProfile {
  id: string;
  email: string;
  name: string;
}

interface WorkspaceDetails {
  id: string;
  name: string;
  tier: string;
}

interface NavigationSidebarProps {
  pages: PageItem[];
  activePageId: string;
  onSelectPage: (id: string) => void;
  onCreatePage: (type: 'document' | 'table' | 'canvas') => void;
  user?: UserProfile | null;
  workspace?: WorkspaceDetails | null;
  onSignOut?: () => void;
  activeTab: string;
  onSelectTab: (tab: string) => void;
}

export const NavigationSidebar: React.FC<NavigationSidebarProps> = ({
  pages,
  activePageId,
  onSelectPage,
  onCreatePage,
  user,
  workspace,
  onSignOut,
  activeTab,
  onSelectTab
}) => {
  const { t } = useTranslation();

  const menuItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, testId: 'sidebar-nav-overview' },
    { id: 'analytics', label: 'Analytics', icon: BarChart2, testId: 'sidebar-nav-analytics' },
    { id: 'team', label: 'Team', icon: Users, testId: 'sidebar-nav-team' },
    { id: 'documents', label: 'Documents', icon: FolderOpen, testId: 'sidebar-nav-documents' },
    { id: 'activity', label: 'Activity', icon: Activity, testId: 'sidebar-nav-activity' },
    { id: 'calendar', label: 'Calendar', icon: Calendar, testId: 'sidebar-nav-calendar' }
  ];

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen select-none z-10 shrink-0" data-testid="dashboard-sidebar">
      {/* Brand Header & Workspace Selector */}
      <div className="p-5 border-b border-slate-200 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-md">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div className="overflow-hidden">
            <div className="font-bold text-slate-900 leading-tight truncate max-w-[120px]" title={workspace?.name || 'Omnidesk'}>
              {workspace?.name || 'Omnidesk'}
            </div>
            <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
              {workspace?.tier ? `${workspace.tier} tier` : 'Workspace OS'}
            </div>
          </div>
        </div>
        <LanguageSelector />
      </div>

      {/* Pages & Tabs Navigation Tree */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-widest text-slate-400 font-semibold">
          Workspace
        </div>

        {menuItems.map(item => {
          const isActive = !activePageId && activeTab === item.id;
          const Icon = item.icon;
          
          return (
            <button
              key={item.id}
              data-testid={item.testId}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive 
                  ? 'bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-500'}`} />
              <span>{item.label}</span>
              {isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto text-indigo-500" />}
            </button>
          );
        })}

        {/* Pinned Section / Database Pages */}
        <div className="px-3 pt-6 pb-1 text-[10px] uppercase tracking-widest text-slate-400 font-semibold">
          Pinned Pages
        </div>

        <div className="space-y-0.5">
          {pages.map(page => {
            const isActive = page.id === activePageId;
            const dotColor = page.type === 'document' ? 'bg-blue-500' : page.type === 'table' ? 'bg-purple-500' : 'bg-pink-500';
            
            return (
              <button
                key={page.id}
                onClick={() => onSelectPage(page.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all text-left ${
                  isActive 
                    ? 'bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-750 font-semibold shadow-sm' 
                    : 'text-slate-650 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${dotColor} shrink-0`}></span>
                <span className="truncate flex-1">{page.title}</span>
              </button>
            );
          })}

          {pages.length === 0 && (
            <>
              <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900">
                <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></span>
                <span className="truncate">Q4 Roadmap</span>
              </button>
              <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900">
                <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0"></span>
                <span className="truncate">Sales Pipeline</span>
              </button>
              <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900">
                <span className="w-2 h-2 rounded-full bg-pink-500 shrink-0"></span>
                <span className="truncate">Team OKRs</span>
              </button>
            </>
          )}
        </div>

        {/* Audit ledger collapsible panel */}
        <div className="pt-4 border-t border-slate-100 mt-4">
          <AuditLedgerWidget />
        </div>
      </div>

      {/* Sidebar Footer */}
      <div className="p-3 border-t border-slate-200 shrink-0">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 hover:from-indigo-50 hover:to-purple-50 cursor-pointer transition-all relative group">
          <span className="relative flex shrink-0 overflow-hidden rounded-full w-9 h-9">
            <span className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-sm font-semibold">
              {getInitials(user?.name || 'DU')}
            </span>
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-slate-900 truncate">
              {user?.name || 'Demo User'}
            </div>
            <div className="text-xs text-slate-500 truncate">
              {user?.email || 'demo@omnidesk.com'}
            </div>
          </div>
          {onSignOut && (
            <button 
              onClick={onSignOut}
              className="p-1.5 hover:bg-slate-200 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer shrink-0"
              title="Log Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};

