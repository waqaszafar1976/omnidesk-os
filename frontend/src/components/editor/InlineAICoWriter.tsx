import React, { useState } from 'react';
import { Editor } from '@tiptap/react';
import { Sparkles, Play, Square, RefreshCw } from 'lucide-react';

interface InlineAICoWriterProps {
  editor: Editor;
}

export const InlineAICoWriter: React.FC<InlineAICoWriterProps> = ({ editor }) => {
  const [prompt, setPrompt] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    setError('');

    try {
      const apiHost = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
      
      // Clear selection and place cursor at the end of content or current location
      editor.commands.focus();

      const token = localStorage.getItem('omnidesk_token');
      const response = await fetch(`${apiHost}/ai/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ prompt })
      });

      if (!response.ok) {
        throw new Error('Server responded with an error');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Unable to read streaming text body.');
      }

      // Read chunk streams
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunkStr = decoder.decode(value);
        const lines = chunkStr.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') {
              break;
            }
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.text) {
                // Insert incrementally at cursor
                editor.commands.insertContent(parsed.text);
              }
            } catch (err) {
              // Ignore formatting line gaps
            }
          }
        }
      }
    } catch (err: any) {
      console.error('AI streaming error:', err);
      setError(err.message || 'Failed to communicate with AI engine.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full bg-slate-50 border-b border-slate-200 px-4 py-3 flex flex-col space-y-2">
      <div className="flex justify-between items-center">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${
            isOpen 
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white' 
              : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Sparkles className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-white' : 'text-indigo-500'}`} />
          <span>{isOpen ? 'Close AI Panel' : 'AI Co-Writer Assistant'}</span>
        </button>
        {loading && (
          <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider animate-pulse flex items-center space-x-1">
            <RefreshCw className="h-3 w-3 animate-spin" />
            <span>AI is streaming content...</span>
          </span>
        )}
      </div>

      {isOpen && (
        <form onSubmit={handleGenerate} className="space-y-3 pt-2.5 border-t border-slate-200/60 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex space-x-2">
            <input
              type="text"
              required
              disabled={loading}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Write a recovery email template for overdue distributors..."
              className="flex-1 px-3.5 py-2 border border-slate-200 bg-white text-slate-800 text-xs rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 font-medium"
            />
            <button
              type="submit"
              disabled={loading || !prompt.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 disabled:opacity-50 transition-all shadow-sm shrink-0 cursor-pointer"
            >
              <Play className="h-3 w-3 fill-current" />
              <span>Generate</span>
            </button>
          </div>
          {error && (
            <p className="text-[10px] text-rose-600 font-bold bg-rose-50 border border-rose-100 p-2 rounded-lg">{error}</p>
          )}
        </form>
      )}
    </div>
  );
};
