import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Check, Copy, CheckSquare, Square } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  return (
    <div className={`prose prose-invert max-w-none text-slate-300 text-xs leading-relaxed ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // --- Заголовки ---
          h1({ children }) {
            return (
              <h1 className="text-lg font-bold text-slate-100 mt-5 mb-2 pb-1 border-b border-slate-800/80">
                {children}
              </h1>
            );
          },
          h2({ children }) {
            return (
              <h2 className="text-base font-semibold text-slate-100 mt-4 mb-2">
                {children}
              </h2>
            );
          },
          h3({ children }) {
            return (
              <h3 className="text-sm font-semibold text-slate-200 mt-3 mb-1.5">
                {children}
              </h3>
            );
          },
          h4({ children }) {
            return (
              <h4 className="text-xs font-semibold text-slate-300 mt-2 mb-1 uppercase tracking-wider">
                {children}
              </h4>
            );
          },
          h5({ children }) {
            return (
              <h5 className="text-xs font-medium text-slate-400 mt-2 mb-1">
                {children}
              </h5>
            );
          },
          h6({ children }) {
            return (
              <h6 className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mt-2 mb-1">
                {children}
              </h6>
            );
          },

          // --- Абзацы ---
          p({ children }) {
            return <p className="mb-2.5 last:mb-0 leading-relaxed">{children}</p>;
          },

          // --- Чекбоксы в списковых задачах (- [ ] / - [x]) ---
          input({ checked, type, ...props }: any) {
            if (type === 'checkbox') {
              return checked ? (
                <CheckSquare className="w-3.5 h-3.5 inline-block text-indigo-400 mr-1.5 align-text-bottom shrink-0" />
              ) : (
                <Square className="w-3.5 h-3.5 inline-block text-slate-500 mr-1.5 align-text-bottom shrink-0" />
              );
            }
            return <input type={type} {...props} />;
          },

          // --- Блоки кода и инлайн-код ---
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            const codeString = String(children).replace(/\n$/, '');

            if (!inline && (match || codeString.includes('\n'))) {
              return <CodeBlock language={language || 'text'} value={codeString} />;
            }

            return (
              <code
                className="bg-slate-800/90 text-indigo-300 font-mono px-1.5 py-0.5 rounded text-[11px] border border-slate-700/60"
                {...props}
              >
                {children}
              </code>
            );
          },

          // --- Цитаты ---
          blockquote({ children }) {
            return (
              <blockquote className="border-l-4 border-indigo-500/80 bg-slate-950/60 pl-4 pr-3 py-2 my-3 text-slate-300 rounded-r-lg italic shadow-inner border-y border-r border-slate-800/40">
                {children}
              </blockquote>
            );
          },

          // --- Таблицы ---
          table({ children }) {
            return (
              <div className="overflow-x-auto my-3 rounded-lg border border-slate-800">
                <table className="w-full text-left border-collapse bg-slate-950/40 text-xs">
                  {children}
                </table>
              </div>
            );
          },
          thead({ children }) {
            return <thead className="bg-slate-900/80 text-slate-200 border-b border-slate-800">{children}</thead>;
          },
          th({ children }) {
            return <th className="px-3 py-2 font-semibold border-r border-slate-800/60 last:border-r-0">{children}</th>;
          },
          td({ children }) {
            return <td className="px-3 py-2 border-t border-slate-800/40 border-r border-slate-800/60 last:border-r-0">{children}</td>;
          },

          // --- Списки ---
          ul({ children }) {
            return <ul className="list-disc list-inside space-y-1 my-2 pl-1">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="list-decimal list-inside space-y-1 my-2 pl-1">{children}</ol>;
          },

          // --- Ссылки ---
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal-400 hover:text-teal-300 underline underline-offset-2 transition-colors"
              >
                {children}
              </a>
            );
          },

          // --- Разделитель ---
          hr() {
            return <hr className="border-slate-800 my-4" />;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

const CodeBlock: React.FC<{ language: string; value: string }> = ({ language, value }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 rounded-xl border border-slate-800 overflow-hidden bg-slate-950 font-mono shadow-md">
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/90 border-b border-slate-800/80 text-[11px] text-slate-400">
        <span className="font-sans text-xs font-medium text-slate-300 uppercase tracking-wider">{language}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 text-slate-400 hover:text-slate-100 transition-colors p-1 rounded hover:bg-slate-800"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied!' : 'Copy'}</span>
        </button>
      </div>
      <SyntaxHighlighter
        language={language}
        style={vscDarkPlus}
        customStyle={{
          margin: 0,
          padding: '0.85rem 1rem',
          fontSize: '0.75rem',
          lineHeight: '1.4',
          background: 'transparent',
        }}
        codeTagProps={{
          style: {
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          },
        }}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
};