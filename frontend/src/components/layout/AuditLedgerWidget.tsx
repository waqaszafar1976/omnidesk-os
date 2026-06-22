import React, { useEffect, useState } from 'react';
import { 
  Terminal, ShieldCheck, Cpu, HardDrive, Webhook, 
  Key, Copy, Check, RefreshCw, ChevronDown, ChevronUp 
} from 'lucide-react';

interface AuditLog {
  id: string;
  action: string;
  resource: string;
  metadata: any;
  createdAt: string;
}

interface BillingMetrics {
  tier: string;
  workspaceName: string;
  creditLimit: number;
  creditsUsed: number;
  metrics: {
    ai_tokens: number;
    file_storage_bytes: number;
    webhook_executions: number;
  };
  auditLogs: AuditLog[];
}

export const AuditLedgerWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<BillingMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [devToken, setDevToken] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  const apiHost = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

  const fetchMetrics = async () => {
    try {
      const storedUser = localStorage.getItem('omnidesk_user');
      if (!storedUser) return;
      const user = JSON.parse(storedUser);
      const token = localStorage.getItem('omnidesk_token');

      setLoading(true);
      const res = await fetch(`${apiHost}/billing/metrics`, {
        headers: {
          'user_id': user.id,
          'Authorization': `Bearer ${token}`
        }
      });
      const resData = await res.json();
      if (resData.success) {
        setData(resData);
      }
    } catch (err) {
      console.error('Error fetching billing metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    // Refresh telemetry every 10 seconds when open
    const interval = setInterval(() => {
      if (isOpen) {
        fetchMetrics();
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [isOpen]);

  const handleGenerateToken = async () => {
    try {
      const storedUser = localStorage.getItem('omnidesk_user');
      if (!storedUser) return;
      const user = JSON.parse(storedUser);
      const token = localStorage.getItem('omnidesk_token');

      setGenerating(true);
      const res = await fetch(`${apiHost}/auth/tokens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user_id': user.id,
          'Authorization': `Bearer ${token}`
        }
      });
      const resData = await res.json();
      if (resData.success) {
        setDevToken(resData.token);
        // Re-fetch to log the action in the audit trail
        fetchMetrics();
      }
    } catch (err) {
      console.error('Error generating token:', err);
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (!devToken) return;
    navigator.clipboard.writeText(devToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'GENERATE_API_TOKEN':
        return <Key className="h-3 w-3 text-amber-400" />;
      case 'CREATE_PAGE':
        return <ShieldCheck className="h-3 w-3 text-indigo-400" />;
      case 'API_GET_PAGES':
      case 'API_CREATE_PAGE':
        return <Terminal className="h-3 w-3 text-cyan-400" />;
      default:
        return <ShieldCheck className="h-3 w-3 text-slate-400" />;
    }
  };

  const formatStorage = (bytes: number) => {
    if (!bytes) return '0 Bytes';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <div className="border-t border-slate-800 bg-slate-950/60 backdrop-blur-sm">
      {/* Header button toggle */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 text-xs font-bold text-slate-400 hover:text-white transition-colors"
      >
        <div className="flex items-center space-x-2">
          <Terminal className="h-3.5 w-3.5 text-blue-500" />
          <span className="uppercase tracking-wider">Audit Trail & Telemetry</span>
        </div>
        {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
      </button>

      {isOpen && (
        <div className="px-4 pb-4 space-y-4 text-[11px] border-t border-slate-850 animate-in slide-in-from-bottom-1 duration-200">
          {/* Credit limit gauge */}
          {data && (
            <div className="pt-3 space-y-1.5">
              <div className="flex justify-between font-semibold text-slate-400">
                <span>Credit Bounds:</span>
                <span className="text-white">
                  {data.creditsUsed.toLocaleString()} / {data.creditLimit.toLocaleString()} credits
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    data.creditsUsed / data.creditLimit > 0.8 ? 'bg-amber-500' : 'bg-blue-600'
                  }`}
                  style={{ width: `${Math.min(100, (data.creditsUsed / data.creditLimit) * 100)}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Metrics grids */}
          {data && (
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2 bg-slate-900 border border-slate-800 rounded-lg flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1 text-slate-500">
                  <span>AI Tokens</span>
                  <Cpu className="h-3 w-3" />
                </div>
                <span className="font-bold text-slate-300">{data.metrics.ai_tokens.toLocaleString()}</span>
              </div>
              <div className="p-2 bg-slate-900 border border-slate-800 rounded-lg flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1 text-slate-500">
                  <span>Storage</span>
                  <HardDrive className="h-3 w-3" />
                </div>
                <span className="font-bold text-slate-300">{formatStorage(data.metrics.file_storage_bytes)}</span>
              </div>
              <div className="p-2 bg-slate-900 border border-slate-800 rounded-lg flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1 text-slate-500">
                  <span>Webhooks</span>
                  <Webhook className="h-3 w-3" />
                </div>
                <span className="font-bold text-slate-300">{data.metrics.webhook_executions.toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* Dev Token Section */}
          <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl space-y-2">
            <div className="flex justify-between items-center font-bold text-slate-400 uppercase tracking-wider">
              <span>Developer API Key</span>
              <Key className="h-3 w-3 text-slate-500" />
            </div>

            {devToken ? (
              <div className="flex items-center space-x-1">
                <input 
                  type="text" 
                  readOnly 
                  value={devToken} 
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[10px] text-emerald-400 font-mono outline-none"
                />
                <button 
                  onClick={copyToClipboard}
                  className="p-1 border border-slate-800 hover:border-slate-700 bg-slate-950 rounded-lg text-slate-400 hover:text-white"
                  title="Copy to clipboard"
                >
                  {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                </button>
                <button 
                  onClick={handleGenerateToken}
                  disabled={generating}
                  className="p-1 border border-slate-800 hover:border-slate-700 bg-slate-950 rounded-lg text-slate-400 hover:text-white"
                  title="Rotate Token"
                >
                  <RefreshCw className={`h-3 w-3 ${generating ? 'animate-spin' : ''}`} />
                </button>
              </div>
            ) : (
              <button
                onClick={handleGenerateToken}
                disabled={generating}
                className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 hover:bg-slate-900 text-slate-400 hover:text-white py-1.5 rounded-lg flex items-center justify-center space-x-1.5 transition-colors font-semibold"
              >
                <Key className="h-3 w-3" />
                <span>{generating ? 'Issuing Credentials...' : 'Generate API token'}</span>
              </button>
            )}
          </div>

          {/* Live Ledger Logs */}
          <div className="space-y-2">
            <div className="flex justify-between items-center font-bold text-slate-400 uppercase tracking-wider">
              <span>Ledger Logs (Tamper-Proof)</span>
              <button 
                onClick={fetchMetrics}
                disabled={loading}
                className="text-slate-500 hover:text-white transition-colors"
              >
                <RefreshCw className={`h-2.5 w-2.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 font-mono text-[9px] border border-slate-900 p-2 rounded-lg bg-slate-950/80">
              {data && data.auditLogs.length > 0 ? (
                data.auditLogs.map((log) => (
                  <div key={log.id} className="flex items-start space-x-1.5 py-0.5 border-b border-slate-900/50 last:border-0">
                    <span className="mt-0.5 shrink-0">{getActionIcon(log.action)}</span>
                    <div className="flex-1 text-slate-400 truncate">
                      <span className="text-white font-bold mr-1">[{log.action}]</span>
                      <span>{log.resource}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-slate-600 text-center py-2">No transaction hashes verified yet.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
