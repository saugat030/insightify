'use client';

import { useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Panel, Group, Separator } from 'react-resizable-panels';
import { marked } from 'marked';
import { DEFAULT_MARKDOWN } from '@/constants/constants';

export default function MarkdownEditorPage() {
  const [markdown, setMarkdown] = useState(DEFAULT_MARKDOWN);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = async () => {
    try {
      setIsExporting(true);

      // 1. Dynamically import @react-pdf/renderer and react-pdf-html ONLY on the client
      const { pdf, Document, Page, StyleSheet } = await import('@react-pdf/renderer');
      const { default: Html } = await import('react-pdf-html');
      
      // 2. Convert Markdown to raw HTML
      const rawHtml = await marked.parse(markdown);

      // 3. Define PDF styling
      const styles = StyleSheet.create({
        page: { padding: 40, fontFamily: 'Helvetica', fontSize: 12, color: '#333' },
      });

      // 4. Create the Document structure
      const MyDocument = (
        <Document>
          <Page size="A4" style={styles.page}>
            <Html>{rawHtml}</Html>
          </Page>
        </Document>
      );

      // 5. Generate and download PDF
      const asPdf = pdf(MyDocument);
      const blob = await asPdf.toBlob();
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'markdown-export.pdf';
      link.click();
      
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      console.error("PDF Export failed:", error);
      alert("Failed to export PDF.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      
      {/* --- TOOLBAR --- */}
      <header className="flex justify-between items-center p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">
          Markdown Editor
        </h1>
        <button
          onClick={handleExportPDF}
          disabled={isExporting}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isExporting ? "Exporting..." : "Export to PDF"}
        </button>
      </header>

      {/* --- SPLIT PANE WORKSPACE --- */}
      <main className="flex-1 overflow-hidden">
        <Group orientation="horizontal">
          
          <Panel defaultSize="50%" minSize="20%">
            <div className="h-full p-4">
              <textarea
                className="w-full h-full p-4 resize-none border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-mono text-sm"
                value={markdown}
                onChange={(e) => setMarkdown(e.target.value)}
                placeholder="Type or paste your Markdown here..."
              />
            </div>
          </Panel>

          <Separator className="w-2 bg-gray-200 dark:bg-gray-700 hover:bg-blue-400 dark:hover:bg-blue-500 cursor-col-resize transition-colors flex flex-col justify-center items-center">
            <div className="w-1 h-8 bg-gray-400 dark:bg-gray-500 rounded-full" />
          </Separator>

          <Panel defaultSize="50%" minSize="20%">
            <div className="h-full overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900">
              <div className="bg-white dark:bg-gray-950 p-8 min-h-full shadow-sm rounded-md border border-gray-200 dark:border-gray-800">
                <article className="prose dark:prose-invert max-w-none">
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