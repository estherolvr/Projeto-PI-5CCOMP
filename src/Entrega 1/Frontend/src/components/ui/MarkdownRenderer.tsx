import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '../../lib/utils';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  isUserMessage?: boolean;
}

export default function MarkdownRenderer({ content, className, isUserMessage = false }: MarkdownRendererProps) {
  return (
    <div
      className={cn(
        "text-sm leading-relaxed",
        isUserMessage ? "text-white" : "text-gray-800 dark:text-slate-100",
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => (
            <p className="mb-2.5 last:mb-0 leading-relaxed">{children}</p>
          ),
          h1: ({ children }) => (
            <h1 className="text-base font-bold mb-2 mt-3 first:mt-0">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-sm font-bold mb-1.5 mt-2.5 first:mt-0">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xs font-bold uppercase tracking-wider mb-1.5 mt-2 first:mt-0">{children}</h3>
          ),
          strong: ({ children }) => (
            <strong className={cn("font-bold", isUserMessage ? "text-white" : "text-gray-900 dark:text-white")}>
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="italic">{children}</em>
          ),
          ul: ({ children }) => (
            <ul className="list-disc pl-5 my-2 space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 my-2 space-y-1">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed">{children}</li>
          ),
          hr: () => (
            <hr className={cn("my-3 border-t", isUserMessage ? "border-white/20" : "border-gray-200 dark:border-slate-700/80")} />
          ),
          code: ({ children, className }) => (
            <code className={cn("px-1.5 py-0.5 rounded text-xs font-mono", isUserMessage ? "bg-white/20 text-white" : "bg-gray-100 dark:bg-slate-700 text-brand-700 dark:text-brand-300")}>
              {children}
            </code>
          ),
          blockquote: ({ children }) => (
            <blockquote className={cn("border-l-4 pl-3 py-1 my-2 italic", isUserMessage ? "border-white/40 bg-white/10" : "border-brand-500 bg-brand-50/50 dark:bg-brand-900/20 text-gray-700 dark:text-slate-200")}>
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-3">
              <table className="min-w-full text-xs border border-gray-200 dark:border-slate-700 rounded-lg">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 bg-gray-100 dark:bg-slate-800 font-semibold border-b border-gray-200 dark:border-slate-700 text-left">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-1.5 border-b border-gray-100 dark:border-slate-800 text-left">
              {children}
            </td>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={cn("underline font-medium hover:opacity-80", isUserMessage ? "text-white" : "text-brand-600 dark:text-brand-400")}
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
