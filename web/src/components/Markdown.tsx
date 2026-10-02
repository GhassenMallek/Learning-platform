import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn, isSafeUrl } from '@/lib/utils';

/**
 * Renders lesson Markdown safely: no raw HTML, only http(s)/upload links, external links open in a new tab safely.
 * Kept in its own module (the Markdown parser is large) so only the student area — which is lazy-loaded — pays for it.
 */
export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn('md', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children: label }) =>
            href && isSafeUrl(href) ? (
              <a href={href} target="_blank" rel="noopener noreferrer">{label}</a>
            ) : (
              <span>{label}</span>
            ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
