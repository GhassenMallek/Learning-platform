import type { ReactNode } from 'react';
import { useInView } from '@/lib/hooks';
import { cn } from '@/lib/utils';

/** Plain multi-paragraph text (course descriptions) — split on blank lines, no markup interpretation. */
export function Paragraphs({ text, className }: { text: string; className?: string }) {
  return (
    <div className={cn('space-y-4', className)}>
      {text.split(/\n{2,}/).filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}
    </div>
  );
}

/** Fades content up once it scrolls into view. */
export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div ref={ref} style={inView ? { animationDelay: `${delay}ms` } : undefined} className={cn(inView ? 'animate-fade-up' : 'opacity-0', className)}>
      {children}
    </div>
  );
}
