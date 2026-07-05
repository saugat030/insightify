'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Panel, Group, Separator } from 'react-resizable-panels';
import { marked } from 'marked';
import { DEFAULT_MARKDOWN } from '@/constants/constants';

// ── Types ──
type MarkdownDoc = {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
};

const STORAGE_KEY = 'insightify-md-docs';
const AUTO_SAVE_DELAY = 1500; // ms

// ── Helpers ──
function generateId() {
  return `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function extractTitle(md: string): string {
  // grab the first heading or the first non-empty line
  const headingMatch = md.match(/^#{1,3}\s+(.+)/m);
  if (headingMatch) return headingMatch[1].slice(0, 32);
  const firstLine = md.split('\n').find((l) => l.trim().length > 0);
  return firstLine ? firstLine.slice(0, 32) : 'Untitled';
}

function loadDocs(): MarkdownDoc[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveDocs(docs: MarkdownDoc[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
}

// ── Component ──
export default function MarkdownEditorPage() {
  const [docs, setDocs] = useState<MarkdownDoc[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [markdown, setMarkdown] = useState(DEFAULT_MARKDOWN);
  const [isExporting, setIsExporting] = useState(false);
  const [showNewTabPulse, setShowNewTabPulse] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitializedRef = useRef(false);

  // ── 1. Hydrate from localStorage on first mount ──
  useEffect(() => {
    const stored = loadDocs();
    if (stored.length > 0) {
      setDocs(stored);
      // activate the most recently updated doc
      const latest = stored.reduce((a, b) => (a.updatedAt > b.updatedAt ? a : b));
      setActiveId(latest.id);
      setMarkdown(latest.content);
    } else {
      // first-ever visit: create a starter doc
      const starter: MarkdownDoc = {
        id: generateId(),
        title: extractTitle(DEFAULT_MARKDOWN),
        content: DEFAULT_MARKDOWN,
        updatedAt: Date.now(),
      };
      setDocs([starter]);
      setActiveId(starter.id);
      setMarkdown(DEFAULT_MARKDOWN);
      saveDocs([starter]);
    }
    isInitializedRef.current = true;
  }, []);

  // ── 2. Auto-save: debounce writes to localStorage ──
  const persistChange = useCallback(
    (newContent: string) => {
      if (!activeId) return;
      setDocs((prev) => {
        const updated = prev.map((d) =>
          d.id === activeId
            ? { ...d, content: newContent, title: extractTitle(newContent), updatedAt: Date.now() }
            : d
        );
        saveDocs(updated);
        return updated;
      });
    },
    [activeId]
  );

  const handleChange = (value: string) => {
    setMarkdown(value);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => persistChange(value), AUTO_SAVE_DELAY);
  };

  // ── 3. Tab actions ──
  const createNewDoc = () => {
    // save current doc first
    if (activeId) persistChange(markdown);

    const newDoc: MarkdownDoc = {
      id: generateId(),
      title: 'Untitled',
      content: '',
      updatedAt: Date.now(),
    };
    const updated = [...docs, newDoc];
    setDocs(updated);
    saveDocs(updated);
    setActiveId(newDoc.id);
    setMarkdown('');

    // pulse animation for the new tab
    setShowNewTabPulse(true);
    setTimeout(() => setShowNewTabPulse(false), 600);
  };

  const switchTab = (id: string) => {
    if (id === activeId) return;
    // save current before switching
    if (activeId) persistChange(markdown);
    const target = docs.find((d) => d.id === id);
    if (target) {
      setActiveId(id);
      setMarkdown(target.content);
    }
  };

  const closeTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const remaining = docs.filter((d) => d.id !== id);

    if (remaining.length === 0) {
      // closing the last tab → create a fresh one
      const fresh: MarkdownDoc = {
        id: generateId(),
        title: extractTitle(DEFAULT_MARKDOWN),
        content: DEFAULT_MARKDOWN,
        updatedAt: Date.now(),
      };
      setDocs([fresh]);
      saveDocs([fresh]);
      setActiveId(fresh.id);
      setMarkdown(DEFAULT_MARKDOWN);
      return;
    }

    setDocs(remaining);
    saveDocs(remaining);

    if (id === activeId) {
      // switch to the nearest tab
      const latest = remaining.reduce((a, b) => (a.updatedAt > b.updatedAt ? a : b));
      setActiveId(latest.id);
      setMarkdown(latest.content);
    }
  };

  // ── 4. PDF Export (unchanged logic) ──
  const handleExportPDF = async () => {
    try {
      setIsExporting(true);
      const { pdf, Document, Page, StyleSheet } = await import('@react-pdf/renderer');
      const { default: Html } = await import('react-pdf-html');
      const rawHtml = await marked.parse(markdown);
      const styles = StyleSheet.create({
        page: { padding: 40, fontFamily: 'Helvetica', fontSize: 12, color: '#333' },
      });
      // need to change the stylesheet object if want better UI
      const MyDocument = (
        <Document>
          <Page size="A4" style={styles.page}>
            <Html>{rawHtml}</Html>
          </Page>
        </Document>
      );
      const blob = await pdf(MyDocument).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const activeDoc = docs.find((d) => d.id === activeId);
      link.download = `${activeDoc?.title || 'markdown-export'}.pdf`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      console.error('PDF Export failed:', error);
      alert('Failed to export PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  // Don't render until hydrated to avoid flash
  if (!isInitializedRef.current) return null;

  return (
    <div className="flex flex-col h-full bg-[#0e0e10]">
      
      {/* ── TAB BAR ── */}
      <div className="flex items-end gap-0 bg-[#0e0e10] px-2 pt-2 overflow-x-auto scrollbar-hide border-b border-white/5 shrink-0">
        {docs.map((doc) => {
          const isActive = doc.id === activeId;
          return (
            <button
              key={doc.id}
              onClick={() => switchTab(doc.id)}
              className={`
                group relative flex items-center gap-2 px-4 py-2.5 text-xs font-medium rounded-t-lg
                transition-all duration-200 max-w-[200px] min-w-[120px] shrink-0
                ${isActive
                  ? 'bg-[#1a1a1e] text-white border-t border-x border-white/10 -mb-px z-10'
                  : 'bg-transparent text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                }
              `}
            >
              {/* Colored dot indicator */}
              <span className={`h-1.5 w-1.5 rounded-full shrink-0 transition-colors ${isActive ? 'bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.6)]' : 'bg-zinc-600 group-hover:bg-zinc-400'}`} />
              
              {/* Title */}
              <span className="truncate">{doc.title || 'Untitled'}</span>
              
              {/* Close button */}
              <span
                onClick={(e) => closeTab(doc.id, e)}
                className={`
                  ml-auto shrink-0 h-4 w-4 rounded-sm flex items-center justify-center text-[10px]
                  transition-all duration-150
                  ${isActive
                    ? 'text-zinc-400 hover:text-white hover:bg-white/10'
                    : 'opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-white hover:bg-white/10'
                  }
                `}
              >
                ✕
              </span>
            </button>
          );
        })}

        {/* New Tab Button */}
        <button
          onClick={createNewDoc}
          title="New document"
          className={`
            shrink-0 h-8 w-8 ml-1 mb-0.5 rounded-md flex items-center justify-center
            text-zinc-500 hover:text-white hover:bg-white/10 transition-all duration-200 text-sm
            ${showNewTabPulse ? 'animate-pulse scale-110' : ''}
          `}
        >
          +
        </button>
      </div>

      {/* ── TOOLBAR ── */}
      <header className="flex justify-between items-center px-4 py-3 bg-[#1a1a1e] border-b border-white/5 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold text-white tracking-tight">
            {docs.find((d) => d.id === activeId)?.title || 'Untitled'}
          </h1>
          <span className="text-[10px] text-zinc-500 bg-white/5 px-2 py-0.5 rounded-full">
            auto-saved
          </span>
        </div>
        <button
          onClick={handleExportPDF}
          disabled={isExporting}
          className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isExporting ? 'Exporting...' : 'Export to PDF'}
        </button>
      </header>

      {/* ── SPLIT PANE WORKSPACE ── */}
      <main className="flex-1 overflow-hidden min-h-0">
        <Group orientation="horizontal">
          <Panel defaultSize={50} minSize={20}>
            <div className="h-full p-3">
              <textarea
                className="w-full h-full p-4 resize-none rounded-lg border border-white/5 focus:outline-none focus:ring-1 focus:ring-blue-500/50 bg-[#131316] text-zinc-200 font-mono text-sm leading-relaxed placeholder:text-zinc-600"
                value={markdown}
                onChange={(e) => handleChange(e.target.value)}
                placeholder="Type or paste your Markdown here..."
                spellCheck={false}
              />
            </div>
          </Panel>

          <Separator className="w-1.5 bg-[#1a1a1e] hover:bg-blue-500/30 cursor-col-resize transition-colors flex flex-col justify-center items-center">
            <div className="w-0.5 h-8 bg-zinc-700 rounded-full" />
          </Separator>

          <Panel defaultSize={50} minSize={20}>
            <div className="h-full overflow-y-auto p-3">
              <div className="bg-[#131316] p-6 min-h-full rounded-lg border border-white/5">
                <article className="prose prose-invert prose-sm max-w-none prose-headings:text-white prose-p:text-zinc-300 prose-a:text-blue-400 prose-strong:text-white prose-code:text-emerald-400 prose-code:bg-white/5 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-black/40 prose-pre:border prose-pre:border-white/5">
                  <Markdown remarkPlugins={[remarkGfm]}>
                    {markdown}
                  </Markdown>
                </article>
              </div>
            </div>
          </Panel>
        </Group>
      </main>
    </div>
  );
}