'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Panel, Group, Separator } from 'react-resizable-panels';
import { marked } from 'marked';
import { DEFAULT_MARKDOWN } from '@/constants/constants';
import axiosInstance from '@/lib/axiosInstance';

type MarkdownDoc = {
  _id: string;
  title: string;
  content: string;
  updatedAt: string;
};
const AUTO_SAVE_DELAY = 1500;

export default function MarkdownEditorPage() {
  const [docs, setDocs] = useState<MarkdownDoc[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [markdown, setMarkdown] = useState(DEFAULT_MARKDOWN);
  const [isExporting, setIsExporting] = useState(false);
  const [showNewTabPulse, setShowNewTabPulse] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  // title editing states
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const titleInputRef = useRef<HTMLInputElement>(null);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchDocs = useCallback(async () => {
    try {
      const res = await axiosInstance.get('/api/markdown');
      const fetchedDocs: MarkdownDoc[] = res.data;
      
      if (fetchedDocs.length > 0) {
        setDocs(fetchedDocs);
        // activate the most recently updated doc first one if sorted by backend
        const latest = fetchedDocs[0];
        setActiveId(latest._id);
        setMarkdown(latest.content);
      } else {
        // first ever visit: create a starter doc via API
        await createNewDoc(true);
      }
    } catch (error) {
      console.error("Failed to fetch docs", error);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  useEffect(() => {
    fetchDocs();
  }, []);

  // focus title input when editing starts
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, [isEditingTitle]);

  // auto save debouce and write to db
  const persistChange = useCallback(
    async (newContent: string, newTitle?: string) => {
      if (!activeId) return;
      const docToUpdate = docs.find(d => d._id === activeId);
      if (!docToUpdate) return;
      const titleToSave = newTitle !== undefined ? newTitle : docToUpdate.title;
      // optimistic update
      setDocs((prev) => 
        prev.map((d) =>
          d._id === activeId
            ? { ...d, content: newContent, title: titleToSave, updatedAt: new Date().toISOString() }
            : d
        )
      );
      try {
        await axiosInstance.put('/api/markdown', {
          id: activeId,
          content: newContent,
          title: titleToSave
        });
      } catch (error) {
        console.error("Failed to auto-save doc", error);
      }
    },
    [activeId, docs]
  );

  const handleChange = (value: string) => {
    setMarkdown(value);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => persistChange(value), AUTO_SAVE_DELAY);
  };
  
  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (editedTitle.trim() === "") return;
    persistChange(markdown, editedTitle.trim());
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSubmit();
    } else if (e.key === 'Escape') {
      setIsEditingTitle(false);
    }
  };

  // tab actions
  const createNewDoc = async (isInitial = false) => {
    // save current doc first if it's not the initial creation
    if (!isInitial && activeId && saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      await persistChange(markdown);
    }
    // determine the next markdown title number
    let nextNum = 1;
    if (!isInitial) {
        const titleRegex = /^markdown-(\d+)$/i;
        const nums = docs.map(d => {
            const match = d.title.match(titleRegex);
            return match ? parseInt(match[1]) : 0;
        });
        if (nums.length > 0) {
           nextNum = Math.max(...nums) + 1;
        }
    }

    const title = `markdown-${nextNum}`;
    const content = isInitial ? DEFAULT_MARKDOWN : "";

    try {
      const res = await axiosInstance.post('/api/markdown', {
        title,
        content
      });
      const newDoc: MarkdownDoc = res.data;
      
      setDocs(prev => [newDoc, ...prev]);
      setActiveId(newDoc._id);
      setMarkdown(content);
      
      if (!isInitial) {
         // pulse animation for the new tab
         setShowNewTabPulse(true);
         setTimeout(() => setShowNewTabPulse(false), 600);
      }
    } catch (error) {
      console.error("Failed to create new doc", error);
    }
  };

  const switchTab = async (id: string) => {
    if (id === activeId) return;
    // save current before switching
    if (activeId && saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      await persistChange(markdown);
    }
    const target = docs.find((d) => d._id === id);
    if (target) {
      setActiveId(id);
      setMarkdown(target.content);
    }
  };

  const closeTab = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      await axiosInstance.delete(`/api/markdown?id=${id}`);
      
      const remaining = docs.filter((d) => d._id !== id);

      if (remaining.length === 0) {
        // closing the last tab = create a fresh one
        await createNewDoc(false);
        return;
      }

      setDocs(remaining);

      if (id === activeId) {
        // switch to the nearest tab first one
        const latest = remaining[0];
        setActiveId(latest._id);
        setMarkdown(latest.content);
      }
    } catch (error) {
      console.error("Failed to delete doc", error);
    }
  };

  // pdf export
  const handleExportPDF = async () => {
    try {
      setIsExporting(true);
      const { pdf, Document, Page, StyleSheet } = await import('@react-pdf/renderer');
      const { default: Html } = await import('react-pdf-html');
      const rawHtml = await marked.parse(markdown);
      const styles = StyleSheet.create({
        page: { padding: 40, fontFamily: 'Helvetica', fontSize: 12, color: '#333' },
      });
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
      const activeDoc = docs.find((d) => d._id === activeId);
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
  if (!isInitialized) return null;
  return (
    <div className="flex flex-col h-full bg-[#0e0e10]">
      {/* tab bar */}
      <div className="flex items-end gap-0 bg-[#0e0e10] px-2 pt-2 overflow-x-auto scrollbar-hide border-b border-white/5 shrink-0">
        {docs.map((doc) => {
          const isActive = doc._id === activeId;
          return (
            <button
              key={doc._id}
              onClick={() => switchTab(doc._id)}
              className={`
                group relative flex items-center gap-2 px-4 py-2.5 text-xs font-medium rounded-t-lg
                transition-all duration-200 max-w-[200px] min-w-[120px] shrink-0
                ${isActive
                  ? 'bg-[#1a1a1e] text-white border-t border-x border-white/10 -mb-px z-10'
                  : 'bg-transparent text-zinc-500 hover:text-zinc-300 hover:bg-white/5 border-t border-x border-transparent'
                }
              `}
            >
              {/* colored dot indicator */}
              <span className={`h-1.5 w-1.5 rounded-full shrink-0 transition-colors ${isActive ? 'bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.6)]' : 'bg-zinc-600 group-hover:bg-zinc-400'}`} />
              {/* title */}
              <span className="truncate">{doc.title || 'Untitled'}</span>
              {/* close button */}
              {docs.length > 1 && (
                <span
                  onClick={(e) => closeTab(doc._id, e)}
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
              )}
            </button>
          );
        })}
        {/* new tab button */}
        <button
          onClick={() => createNewDoc(false)}
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

      {/* toolbar */}
      <header className="flex justify-between items-center px-4 py-3 bg-[#1a1a1e] border-b border-white/5 shrink-0">
        <div className="flex items-center gap-3">
          {isEditingTitle ? (
             <input 
               ref={titleInputRef}
               className="bg-[#131316] text-white text-sm font-semibold tracking-tight border border-blue-500/50 rounded px-2 py-0.5 focus:outline-none w-[200px]"
               value={editedTitle}
               onChange={(e) => setEditedTitle(e.target.value)}
               onBlur={handleTitleSubmit}
               onKeyDown={handleTitleKeyDown}
             />
          ) : (
             <h1 
               onClick={() => {
                 setEditedTitle(docs.find((d) => d._id === activeId)?.title || 'Untitled');
                 setIsEditingTitle(true);
               }}
               className="text-sm font-semibold text-white tracking-tight cursor-pointer hover:bg-white/5 px-2 py-0.5 rounded -ml-2 transition-colors max-w-[200px] truncate"
               title="Click to edit title"
             >
               {docs.find((d) => d._id === activeId)?.title || 'Untitled'}
             </h1>
          )}
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

      {/* split plane */}
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