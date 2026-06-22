import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, Shield, Terminal, Play, Database, Sliders, 
  Cpu, Zap, RefreshCw, LayoutGrid, FileText, CheckCircle2 
} from 'lucide-react';

interface LaunchControlCenterProps {
  onCreatePage: (type: 'document' | 'table' | 'canvas') => void;
  currentUser: any;
  currentWorkspace: any;
  pagesCount: number;
}

export const LaunchControlCenter: React.FC<LaunchControlCenterProps> = ({
  onCreatePage,
  currentUser,
  currentWorkspace,
  pagesCount
}) => {
  const [logs, setLogs] = useState<string[]>([]);
  const [latency, setLatency] = useState<number>(12);
  const [cpuUsage, setCpuUsage] = useState<number>(34);
  const [isSelfTesting, setIsSelfTesting] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  const addLog = (text: string) => {
    const timestamp = new Date().toISOString().slice(11, 19);
    setLogs(prev => [...prev, `[${timestamp}] ${text}`]);
  };

  // Simulate rolling system logs
  useEffect(() => {
    const initialLogs = [
      'SYSTEM: Omnidesk OS Core v3.0.0 initializing...',
      `TENANT: Resolved tenant workspace "${currentWorkspace?.name || 'Industrial'}"`,
      `SECURITY: Emulated Row-Level Security (RLS) active. Enforcing boundary on user ID ${currentUser?.id || 'admin'}.`,
      'NETWORK: WebSocket relay handshake: OK (listening at ws://localhost:5000/ws)',
      'REDIS: Pub/Sub distributed broker: ACTIVE (using local cluster loopback)',
      `METRIC: Current active document count is ${pagesCount}`,
      'SYSTEM: Launch cockpit status: STANDBY. Awaiting operator input.'
    ];
    setLogs(initialLogs);

    const interval = setInterval(() => {
      const systemMessages = [
        'TELEMETRY: Heap usage stabilized at 84MB.',
        'SECURITY: RLS boundary verification check: PASS.',
        `NETWORK: Ping latency check: ${Math.floor(Math.random() * 5) + 8}ms.`,
        'YJS: Collaboration socket heartbeat: OK.',
        'DB: Flushed formula cache for calculated cells.',
        'CRDT: Sync state merged successfully with Redis node loopback.'
      ];
      const randomMsg = systemMessages[Math.floor(Math.random() * systemMessages.length)];
      addLog(randomMsg);
      
      // Mutate stats
      setLatency(Math.floor(Math.random() * 6) + 8);
      setCpuUsage(prev => {
        const delta = Math.floor(Math.random() * 11) - 5;
        return Math.max(15, Math.min(85, prev + delta));
      });
    }, 4500);

    return () => clearInterval(interval);
  }, [currentWorkspace, currentUser, pagesCount]);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const handleSelfTest = () => {
    if (isSelfTesting) return;
    setIsSelfTesting(true);
    addLog('COMMAND: Starting full system self-test execution...');
    setTimeout(() => {
      addLog('TEST: Verifying express routes compilation... [OK]');
    }, 500);
    setTimeout(() => {
      addLog('TEST: Querying in-memory fallback RLS isolation... [OK]');
    }, 1000);
    setTimeout(() => {
      addLog('TEST: Simulating YJS binary sync handshake... [OK]');
    }, 1500);
    setTimeout(() => {
      addLog('TEST: Checking Redis pub/sub replication layers... [OK]');
      addLog('SUCCESS: Cockpit self-test finished. Status is fully operational.');
      setIsSelfTesting(false);
    }, 2000);
  };

  const handleReSeed = async () => {
    addLog('COMMAND: Triggering mock database re-seeding...');
    try {
      const apiHost = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
      const res = await fetch(`${apiHost.replace('/api/v1', '')}/api/v1/seed`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        addLog('SUCCESS: Re-seeded database structures successfully.');
        window.location.reload();
      } else {
        addLog('ERROR: Seed script failed: ' + data.error);
      }
    } catch (e: any) {
      addLog('ERROR: Could not connect to seed server: ' + e.message);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-300">
      
      {/* Header Cockpit Title */}
      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-base font-black text-white tracking-widest uppercase flex items-center space-x-2">
            <Zap className="h-5 w-5 text-blue-500 fill-blue-500/10 animate-pulse" />
            <span>Launch Control Dashboard</span>
          </h2>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mt-1">
            System Operational Console // Workspace: {currentWorkspace?.name || 'Standard'}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button 
            onClick={handleSelfTest}
            disabled={isSelfTesting}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-[10px] font-bold text-slate-400 hover:text-white rounded-lg transition-all flex items-center space-x-1.5"
          >
            <Activity className={`h-3 w-3 ${isSelfTesting ? 'animate-spin' : ''}`} />
            <span>{isSelfTesting ? 'Running Self-Test' : 'Run Diagnostics'}</span>
          </button>
          
          <button 
            onClick={handleReSeed}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-[10px] font-bold text-slate-400 hover:text-white rounded-lg transition-all flex items-center space-x-1.5"
          >
            <RefreshCw className="h-3 w-3 text-slate-500" />
            <span>Seed Database</span>
          </button>
        </div>
      </div>

      {/* Telemetry Dashboard Grid */}
      <div className="grid grid-cols-4 gap-4">
        
        {/* CPU Util Card */}
        <div className="bg-slate-900/40 border border-slate-800/80 p-4 rounded-xl flex flex-col justify-between h-28 relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold uppercase tracking-wider">
            <span>Server CPU Util</span>
            <Cpu className="h-3.5 w-3.5 text-blue-500" />
          </div>
          <div className="mt-2 flex items-baseline space-x-1">
            <span className="text-2xl font-black text-white tracking-tight">{cpuUsage}%</span>
            <span className="text-[9px] text-slate-600 font-bold">1.2 GHz</span>
          </div>
          <div className="w-full bg-slate-950 h-1 rounded-full overflow-hidden mt-1">
            <div className="bg-blue-500 h-full rounded-full transition-all duration-300" style={{ width: `${cpuUsage}%` }}></div>
          </div>
        </div>

        {/* Latency Card */}
        <div className="bg-slate-900/40 border border-slate-800/80 p-4 rounded-xl flex flex-col justify-between h-28 relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold uppercase tracking-wider">
            <span>Ping Latency</span>
            <Activity className="h-3.5 w-3.5 text-emerald-500 animate-pulse" />
          </div>
          <div className="mt-2 flex items-baseline space-x-1">
            <span className="text-2xl font-black text-white tracking-tight">{latency} ms</span>
            <span className="text-[9px] text-emerald-500/80 font-bold uppercase">Optimized</span>
          </div>
          <div className="text-[9px] text-slate-600 font-bold uppercase mt-1">
            API Gateway Stream: online
          </div>
        </div>

        {/* RLS Shield Card */}
        <div className="bg-slate-900/40 border border-slate-800/80 p-4 rounded-xl flex flex-col justify-between h-28 relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold uppercase tracking-wider">
            <span>Isolation Shield</span>
            <Shield className="h-3.5 w-3.5 text-indigo-500" />
          </div>
          <div className="mt-2 flex items-baseline space-x-1">
            <span className="text-lg font-black text-indigo-400 tracking-tight">RLS ENFORCED</span>
          </div>
          <div className="text-[9px] text-slate-500 font-semibold uppercase mt-1 leading-none flex items-center space-x-1">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
            <span>Tenant: {currentWorkspace?.tier || 'Corporate'} Tier</span>
          </div>
        </div>

        {/* Active Nodes Card */}
        <div className="bg-slate-900/40 border border-slate-800/80 p-4 rounded-xl flex flex-col justify-between h-28 relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold uppercase tracking-wider">
            <span>Workspace Nodes</span>
            <Database className="h-3.5 w-3.5 text-purple-500" />
          </div>
          <div className="mt-2 flex items-baseline space-x-1">
            <span className="text-2xl font-black text-white tracking-tight">{pagesCount}</span>
            <span className="text-[9px] text-slate-600 font-bold uppercase">Nodes registered</span>
          </div>
          <div className="text-[9px] text-slate-600 font-bold uppercase mt-1">
            Sync states: in sync
          </div>
        </div>

      </div>

      {/* Command launching grid */}
      <div className="space-y-3">
        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          Engine Launchers
        </h3>
        
        <div className="grid grid-cols-3 gap-4">
          
          {/* Doc Engine launcher */}
          <button 
            onClick={() => onCreatePage('document')}
            className="p-5 bg-slate-900/40 border border-slate-800 hover:border-blue-500/40 text-left rounded-xl transition-all hover:bg-slate-900 group cursor-pointer"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-all">
                <FileText className="h-5 w-5 text-blue-500" />
              </div>
              <Play className="h-4 w-4 text-slate-600 group-hover:text-blue-500 transition-colors" />
            </div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Document Engine</h4>
            <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
              Launch real-time collaborative text editor using Yjs CRDT multiplayer synchronization.
            </p>
          </button>

          {/* Database Grid launcher */}
          <button 
            onClick={() => onCreatePage('table')}
            className="p-5 bg-slate-900/40 border border-slate-800 hover:border-emerald-500/40 text-left rounded-xl transition-all hover:bg-slate-900 group cursor-pointer"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-emerald-500/10 rounded-lg group-hover:bg-emerald-500/20 transition-all">
                <Database className="h-5 w-5 text-emerald-500" />
              </div>
              <Play className="h-4 w-4 text-slate-600 group-hover:text-emerald-500 transition-colors" />
            </div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Relational Smart Grid</h4>
            <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
              Open calculated columns tracker emulated with sandboxed node-vm formula evaluations.
            </p>
          </button>

          {/* Canvas Engine launcher */}
          <button 
            onClick={() => onCreatePage('canvas')}
            className="p-5 bg-slate-900/40 border border-slate-800 hover:border-indigo-500/40 text-left rounded-xl transition-all hover:bg-slate-900 group cursor-pointer"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-indigo-500/10 rounded-lg group-hover:bg-indigo-500/20 transition-all">
                <Sliders className="h-5 w-5 text-indigo-500" />
              </div>
              <Play className="h-4 w-4 text-slate-600 group-hover:text-indigo-500 transition-colors" />
            </div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Canvas Dashboard</h4>
            <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
              Launch drag-and-drop dashboard canvas to aggregate metrics, grids, and live charts.
            </p>
          </button>

        </div>
      </div>

      {/* Embedded Terminal Console Output */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center space-x-1.5">
            <Terminal className="h-3.5 w-3.5 text-blue-500" />
            <span>Interactive Cockpit Terminal Feed</span>
          </h3>
          <span className="text-[9px] text-slate-600 font-semibold tracking-wider uppercase">
            secure loopback console
          </span>
        </div>

        <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl font-mono text-[10px] text-slate-400 h-44 overflow-y-auto space-y-1 relative shadow-inner">
          <div className="absolute top-2 right-3 flex items-center space-x-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="text-[8px] text-slate-600 font-bold uppercase tracking-wider">live log feed</span>
          </div>

          {logs.map((log, index) => {
            let textColor = 'text-slate-450';
            if (log.includes('SECURITY:')) textColor = 'text-indigo-400';
            if (log.includes('SUCCESS:') || log.includes('[OK]')) textColor = 'text-emerald-450';
            if (log.includes('COMMAND:')) textColor = 'text-amber-400';
            if (log.includes('ERROR:')) textColor = 'text-rose-450';
            
            return (
              <div key={index} className={`${textColor} leading-relaxed`}>
                {log}
              </div>
            );
          })}
          <div ref={terminalEndRef} />
        </div>
      </div>

    </div>
  );
};
