'use client';

import { useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Panel, Group, Separator } from 'react-resizable-panels';
import { marked } from 'marked';

const DEFAULT_MARKDOWN = `# Welcome to the Live Editor
Start typing on the left, and see the formatting on the right!

## Features
* **No hacky code:** Clean client-side PDF generation.
* **Live rendering:** Updates as you type.
* **Instant Download:** Direct to your machine.

| Column 1 | Column 2 |
| -------- | -------- |
| Table    | Support  |
`;

export default function MarkdownEditorPage() {
  const [markdown, setMarkdown] = useState(DEFAULT_MARKDOWN);

  const handleExportPDF = async () => {
    // 1. Dynamically import html2pdf ONLY on the client to avoid Next.js SSR errors
    const html2pdf = (await import('html2pdf.js')).default;

    // 2. Convert Markdown to raw HTML
    const rawHtml = await marked.parse(markdown);

    // 3. Create a temporary, invisible DOM element
    const element = document.createElement('div');
    element.innerHTML = rawHtml;
    
    // 4. Apply SAFE, standard CSS (No Tailwind lab() colors here!)
    // This ensures your PDF looks clean and standard without crashing the canvas engine
    element.style.padding = '20px';
    element.style.fontFamily = 'Helvetica, Arial, sans-serif';
    element.style.lineHeight = '1.6';
    element.style.color = '#000000'; // Safe hex color

    // Basic styling for tables in the PDF
    const styles = document.createElement('style');
    styles.innerHTML = `
      h1, h2, h3 { margin-bottom: 10px; font-weight: bold; }
      h1 { font-size: 24px; }
      h2 { font-size: 20px; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
      table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
      th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
      th { background-color: #f2f2f2; }
      code { background-color: #f4f4f4; padding: 2px 4px; border-radius: 4px; font-family: monospace; }
    `;
    element.appendChild(styles);

    // 5. Configure and download the PDF instantly
   const opt = {
      margin:       0.5,
      filename:     'markdown-export.pdf',
      image:        { type: 'jpeg' as const, quality: 0.98 }, 
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'in' as const, format: 'letter', orientation: 'portrait' as const } 
    };

    html2pdf().set(opt).from(element).save();
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
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors"
        >
          Export to PDF
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