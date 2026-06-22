import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { Sparkles, Shield, Mail, ArrowRight, RefreshCw } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState<string>('demo@omnidesk.com');
  const [password, setPassword] = useState<string>('password123');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!password.trim()) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const apiHost = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
      const res = await fetch(`${apiHost}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (data.success) {
        // Save session items in localStorage
        localStorage.setItem('omnidesk_user', JSON.stringify(data.user));
        localStorage.setItem('omnidesk_workspace', JSON.stringify(data.workspace));
        localStorage.setItem('omnidesk_token', data.token);

        // Redirect to workspace hub
        router.push('/');
      } else {
        setError(data.message || data.error || 'Authentication failed.');
      }
    } catch (err) {
      console.error('SSO login error:', err);
      setError('Could not connect to authentication gateway.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-slate-950 flex items-center justify-center relative overflow-hidden font-sans select-none">
      {/* Background blobs for premium glassmorphism glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>

      <div className="w-full max-w-md p-8 bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl rounded-3xl shadow-2xl flex flex-col items-center relative z-10 animate-in fade-in zoom-in-95 duration-300">
        
        {/* Brand logo header */}
        <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-2xl shadow-inner mb-5 relative group">
          <div className="absolute inset-0 bg-blue-500/10 rounded-2xl blur-sm group-hover:blur-md transition-all"></div>
          <Sparkles className="h-7 w-7 text-blue-500 relative z-10 animate-pulse" />
        </div>

        <h1 className="text-lg font-black text-white uppercase tracking-wider mb-2">Omnidesk OS</h1>
        <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest text-center mb-8">
          Enterprise SSO Gate
        </p>

        <form onSubmit={handleLogin} className="w-full space-y-5">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Business Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Mail className="h-4 w-4 text-slate-500" />
              </span>
              <input
                type="email"
                required
                disabled={loading}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. admin@omnidesk.os"
                className="w-full bg-slate-950/60 border border-slate-800 hover:border-slate-700 text-xs text-slate-200 pl-10 pr-4 py-3 rounded-xl outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium disabled:opacity-50"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Shield className="h-4 w-4 text-slate-500" />
              </span>
              <input
                type="password"
                required
                disabled={loading}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950/60 border border-slate-800 hover:border-slate-700 text-xs text-slate-200 pl-10 pr-4 py-3 rounded-xl outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium disabled:opacity-50"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl text-center font-medium">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow-lg hover:shadow-blue-600/10 disabled:opacity-50 transition-all cursor-pointer shrink-0"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Redirecting to SSO...</span>
              </>
            ) : (
              <>
                <span>Sign In via SSO</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 border-t border-slate-800/80 pt-6 w-full text-center">
          <div className="inline-flex items-center space-x-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <Shield className="h-3 w-3 text-slate-650" />
            <span>Secured by Okta &amp; WorkOS</span>
          </div>
          
          <div className="mt-4 p-3 bg-slate-950/40 border border-slate-850 rounded-xl text-left text-[11px] text-slate-500 leading-relaxed">
            <span className="font-semibold text-slate-400 block mb-1">Seeded Mockup Accounts (Password: password123):</span>
            - <strong>demo@omnidesk.com</strong> (Demo User Profile)<br />
            - <strong>sarah@omnidesk.os</strong> (Sarah Chen - Product Lead)<br />
            - <strong>marcus@omnidesk.os</strong> (Marcus Webb - Engineer)<br />
            - <strong>aisha@omnidesk.os</strong> (Aisha Patel - Designer)
          </div>
        </div>

      </div>
    </div>
  );
}
