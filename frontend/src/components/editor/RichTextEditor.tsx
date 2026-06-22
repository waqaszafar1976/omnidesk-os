import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import * as Y from 'yjs';
import { useTranslation } from 'react-i18next';
import { InlineAICoWriter } from './InlineAICoWriter';

interface RichTextEditorProps {
  pageId: string;
  initialTitle: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ pageId, initialTitle }) => {
  const { t } = useTranslation();
  const [activeUsers, setActiveUsers] = useState<number>(1);
  const [savingStatus, setSavingStatus] = useState<string>('Saved');
  const [ydoc, setYdoc] = useState<Y.Doc | null>(null);
  const [wsProvider, setWsProvider] = useState<any>(null);

  // Initialize Yjs and WebSocket provider client-side
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Dynamically import y-websocket to prevent server-side compilation issues in Next.js
    const importWS = async () => {
      const { WebsocketProvider } = await import('y-websocket');
      const doc = new Y.Doc();
      const wsUrl = process.env.NEXT_PUBLIC_WS_SERVER_URL || 'ws://localhost:5000/ws';
      const provider = new WebsocketProvider(wsUrl, pageId, doc);

      // Track active users online in the document room
      provider.on('status', (event: any) => {
        console.log('WS Connection status:', event.status);
      });

      // Simple mock collaborator tracking for MVP visual presence
      setActiveUsers(Math.floor(Math.random() * 3) + 2);

      setYdoc(doc);
      setWsProvider(provider);
    };

    importWS();

    return () => {
      if (wsProvider) {
        wsProvider.destroy();
      }
      if (ydoc) {
        ydoc.destroy();
      }
    };
  }, [pageId]);

  const editor = useEditor({
    extensions: ydoc
      ? [
          StarterKit.configure({
            history: false // Collaboration extension handles history internally
          }),
          Collaboration.configure({
            document: ydoc
          })
        ]
      : [StarterKit],
    onUpdate: () => {
      setSavingStatus('Typing...');
      // Simulate debounced database snapshot save after user stops typing
      const timeout = setTimeout(() => {
        setSavingStatus('Saved');
      }, 1500);
      return () => clearTimeout(timeout);
    }
  }, [ydoc]);

  if (!editor) {
    return <div className="p-4 text-slate-500">Loading Tiptap Editor Node...</div>;
  }

  return (
    <div className="w-full max-w-4xl mx-auto bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
      {/* Editor Status Bar */}
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex justify-between items-center text-xs text-slate-500">
        <div className="flex items-center space-x-3">
          <span className="font-semibold text-slate-700">{initialTitle}</span>
          <span className="h-4 w-px bg-slate-300"></span>
          <span className="flex items-center space-x-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{savingStatus === 'Saved' ? t('saved_status') : 'Syncing...'}</span>
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span>{t('active_users')}: {activeUsers}</span>
        </div>
      </div>

      {/* Editor Formatting Ribbon */}
      <div className="bg-white border-b border-slate-200 p-2 flex flex-wrap gap-1.5 items-center">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1.5 rounded hover:bg-slate-100 font-bold text-sm ${editor.isActive('bold') ? 'bg-slate-100 text-blue-600' : 'text-slate-600'}`}
        >
          B
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1.5 rounded hover:bg-slate-100 italic text-sm ${editor.isActive('italic') ? 'bg-slate-100 text-blue-600' : 'text-slate-600'}`}
        >
          I
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`p-1.5 rounded hover:bg-slate-100 text-xs font-black ${editor.isActive('heading', { level: 1 }) ? 'bg-slate-100 text-blue-600' : 'text-slate-600'}`}
        >
          H1
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-1.5 rounded hover:bg-slate-100 text-xs font-bold ${editor.isActive('heading', { level: 2 }) ? 'bg-slate-100 text-blue-600' : 'text-slate-600'}`}
        >
          H2
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-1.5 rounded hover:bg-slate-100 text-sm ${editor.isActive('bulletList') ? 'bg-slate-100 text-blue-600' : 'text-slate-600'}`}
        >
          • List
        </button>
      </div>

      <InlineAICoWriter editor={editor} />

      {/* Active Editor Workspace */}
      <div className="flex-1 p-6 min-h-[350px] prose prose-slate max-w-none focus:outline-none">
        <EditorContent editor={editor} className="outline-none" />
      </div>
    </div>
  );
};
