import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/router';
import { NavigationSidebar } from '@/components/layout/NavigationSidebar';
import { RichTextEditor } from '@/components/editor/RichTextEditor';
import { SmartGrid } from '@/components/table/SmartGrid';
import { CanvasEngine } from '@/components/canvas/CanvasEngine';
import { DashboardView } from '@/components/dashboard/DashboardView';
import { 
  FileText, Table, Layout, Search, Plus, AlertCircle, 
  RefreshCw, Zap, Bell, ChevronRight 
} from 'lucide-react';

interface PageItem {
  id: string;
  title: string;
  type: 'document' | 'table' | 'canvas';
  workspace_id: string;
}

export default function WorkspaceHub() {
  const { t } = useTranslation();
  const router = useRouter();
  const [pages, setPages] = useState<PageItem[]>([]);
  const [activePageId, setActivePageId] = useState<string>('');
  const [activePageDetails, setActivePageDetails] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [error, setError] = useState<string>('');
  
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentWorkspace, setCurrentWorkspace] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>('overview');

  const apiHost = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

  // 1. Fetch pages list
  const fetchPages = async (userId: string, selectFirst = false) => {
    if (!userId) return;
    try {
      setLoading(true);
      const token = localStorage.getItem('omnidesk_token');
      const res = await fetch(`${apiHost}/pages`, {
        headers: {
          'user_id': userId,
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setPages(data.pages);
        if (data.pages.length > 0 && selectFirst) {
          setActivePageId(data.pages[0].id);
        }
      } else {
        setError(data.error || 'Failed to load workspace pages.');
      }
    } catch (err: any) {
      console.error('Error fetching pages:', err);
      setError('Could not connect to API server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('omnidesk_user');
      const storedWS = localStorage.getItem('omnidesk_workspace');
      const storedToken = localStorage.getItem('omnidesk_token');
      if (!storedUser || !storedWS || !storedToken) {
        router.push('/login');
      } else {
        const u = JSON.parse(storedUser);
        const w = JSON.parse(storedWS);
        setCurrentUser(u);
        setCurrentWorkspace(w);
        fetchPages(u.id, false); // Default landing is Dashboard (no page selected)
      }
    }
  }, []);

  // 2. Fetch details for active page
  useEffect(() => {
    if (!activePageId || !currentUser) {
      setActivePageDetails(null);
      return;
    }

    const fetchDetails = async () => {
      try {
        setLoadingDetails(true);
        const token = localStorage.getItem('omnidesk_token');
        const res = await fetch(`${apiHost}/pages/${activePageId}`, {
          headers: {
            'user_id': currentUser.id,
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await res.json();
        if (data.success) {
          setActivePageDetails(data.page);
        } else {
          console.error('Failed to load page details:', data.error);
        }
      } catch (err) {
        console.error('Error fetching page details:', err);
      } finally {
        setLoadingDetails(false);
      }
    };

    fetchDetails();
  }, [activePageId, currentUser]);

  // 3. Create a page
  const handleCreatePage = async (type: 'document' | 'table' | 'canvas') => {
    if (!currentUser) return;
    try {
      const titles = {
        document: 'New Collaborative Doc',
        table: 'New Smart Grid Database',
        canvas: 'New Custom Dashboard'
      };

      const token = localStorage.getItem('omnidesk_token');
      const res = await fetch(`${apiHost}/pages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user_id': currentUser.id,
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: titles[type],
          type
        })
      });

      const data = await res.json();
      if (data.success) {
        setPages(prev => [...prev, data.page]);
        setActivePageId(data.page.id);
      } else {
        alert('Error creating page: ' + data.error);
      }
    } catch (err) {
      console.error('Error creating page:', err);
    }
  };

  // Filtered pages based on search query
  const filteredPages = pages.filter(page =>
    page.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getPageIcon = (type: string) => {
    switch (type) {
      case 'document':
        return <FileText className="h-5 w-5 text-indigo-500" />;
      case 'table':
        return <Table className="h-5 w-5 text-emerald-500" />;
      case 'canvas':
        return <Layout className="h-5 w-5 text-blue-500" />;
      default:
        return <FileText className="h-5 w-5 text-slate-500" />;
    }
  };

  const getPageTypeLabel = (type: string) => {
    switch (type) {
      case 'document':
        return 'Collaborative Document';
      case 'table':
        return 'Smart Grid Table';
      case 'canvas':
        return 'Workspace Dashboard';
      default:
        return 'Unknown';
    }
  };

  const parseCanvasLayout = (contentString: string) => {
    if (!contentString) return [];
    try {
      const parsed = JSON.parse(contentString);
      return parsed.layout || [];
    } catch (e) {
      console.error('Error parsing canvas layout from page content:', e);
      return [];
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('omnidesk_user');
    localStorage.removeItem('omnidesk_workspace');
    localStorage.removeItem('omnidesk_token');
    router.push('/login');
  };

  const handleSelectTab = (tab: string) => {
    setActivePageId('');
    setActiveTab(tab);
  };

  const handleSelectPage = (id: string) => {
    setActivePageId(id);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans">
      {/* Notion-style Left Sidebar */}
      <NavigationSidebar
        pages={filteredPages}
        activePageId={activePageId}
        onSelectPage={handleSelectPage}
        onCreatePage={handleCreatePage}
        user={currentUser}
        workspace={currentWorkspace}
        onSignOut={handleSignOut}
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
      />

      {/* Main Workspace Frame */}
      <main className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden relative">
        {/* Glow Effects for Premium Aesthetics */}
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none z-0"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-500/5 rounded-full blur-[120px] pointer-events-none z-0"></div>

        {/* Top Control Bar */}
        <header className="h-16 border-b border-slate-200 bg-white px-6 flex items-center justify-between z-10 select-none shrink-0">
          <div className="flex items-center space-x-3">
            {activePageDetails ? (
              <>
                {getPageIcon(activePageDetails.type)}
                <div>
                  <h1 className="text-sm font-bold text-slate-900 tracking-wide">
                    {activePageDetails.title}
                  </h1>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                    {getPageTypeLabel(activePageDetails.type)}
                  </span>
                </div>
              </>
            ) : (
              <>
                <Zap className="h-5 w-5 text-indigo-500" />
                <div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    <span>Workspace</span>
                    <ChevronRight className="w-3 h-3" />
                    <span className="text-slate-650 font-medium">Dashboard</span>
                  </div>
                  <h1 className="text-sm font-bold text-slate-900 tracking-wide">
                    {currentWorkspace?.name || 'My Workspace'}
                  </h1>
                </div>
              </>
            )}
          </div>

          {/* Search & Actions Header items */}
          <div className="flex items-center space-x-4">
            <div className="relative w-64">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </span>
              <input
                type="text"
                data-testid="dashboard-search"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search workspaces, documents, people..."
                className="w-full bg-slate-50 border border-slate-200 hover:border-slate-350 text-xs text-slate-800 pl-10 pr-4 py-2 rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium"
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400 bg-white border border-slate-200 rounded px-1.5 py-0.5">⌘K</kbd>
            </div>
            
            <button 
              data-testid="dashboard-new-button"
              onClick={() => handleCreatePage('document')}
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-primary/90 h-9 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              New
            </button>

            <button 
              data-testid="dashboard-notifications"
              className="relative p-2 hover:bg-slate-100 rounded-lg text-slate-600"
            >
              <Bell className="w-5 h-5 text-slate-650" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white"></span>
            </button>

            <button 
              data-testid="dashboard-back-to-workspace"
              onClick={() => {
                if (pages.length > 0) setActivePageId(pages[0].id);
              }}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 text-sm font-medium px-3"
            >
              Back to Workspace
            </button>

            <button 
              onClick={() => fetchPages(currentUser?.id)}
              className="p-2 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-400 hover:text-slate-700 rounded-lg transition-colors"
              title="Refresh Workspace"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </header>

        {/* Dynamic Inner Workspace View */}
        {error && (
          <div className="max-w-xl mx-auto mt-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-700 text-xs rounded-xl flex items-center space-x-3">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center flex-1 space-y-3">
            <div className="h-8 w-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin"></div>
            <p className="text-xs font-semibold text-slate-400 tracking-wider">Syncing Omnidesk Environment...</p>
          </div>
        ) : !activePageId ? (
          <DashboardView
            activeTab={activeTab}
            user={currentUser}
            workspace={currentWorkspace}
            token={typeof window !== 'undefined' ? localStorage.getItem('omnidesk_token') || '' : ''}
            pages={pages}
            onSelectPage={handleSelectPage}
            onCreatePage={handleCreatePage}
          />
        ) : (
          <div className="flex-1 overflow-y-auto p-8 relative z-10">
            {loadingDetails ? (
              <div className="flex flex-col items-center justify-center h-full space-y-3">
                <div className="h-6 w-6 rounded-full border-2 border-slate-350 border-t-slate-600 animate-spin"></div>
                <p className="text-xs font-semibold text-slate-500">Hydrating page container...</p>
              </div>
            ) : activePageDetails ? (
              <div className="w-full h-full animate-in fade-in slide-in-from-bottom-2 duration-300">
                {activePageDetails.type === 'document' && (
                  <RichTextEditor
                    pageId={activePageDetails.id}
                    initialTitle={activePageDetails.title}
                  />
                )}

                {activePageDetails.type === 'table' && (
                  <div className="max-w-6xl mx-auto">
                    <div className="mb-4">
                      <h2 className="text-base font-bold text-slate-900 tracking-wide">{activePageDetails.title}</h2>
                      <p className="text-xs text-slate-500">Virtualized relational grid database. Aggregates compile locally.</p>
                    </div>
                    <SmartGrid tableId={activePageDetails.id} />
                  </div>
                )}

                {activePageDetails.type === 'canvas' && (
                  <CanvasEngine
                    pageId={activePageDetails.id}
                    initialLayout={parseCanvasLayout(activePageDetails.content)}
                  />
                )}
              </div>
            ) : null}
          </div>
        )}
      </main>
    </div>
  );
}

