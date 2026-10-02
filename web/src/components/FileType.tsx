import { FileSpreadsheet, FileText, Link2, Presentation, type LucideIcon } from 'lucide-react';
import type { DocumentType } from '@/lib/types';
import { cn } from '@/lib/utils';

const icons: Record<DocumentType, LucideIcon> = {
  pdf: FileText,
  doc: FileText,
  docx: FileText,
  ppt: Presentation,
  pptx: Presentation,
  pps: Presentation,
  ppsx: Presentation,
  xls: FileSpreadsheet,
  xlsx: FileSpreadsheet,
};

// Tints follow the apps people associate with each format (Acrobat red, PowerPoint orange, Word blue, Excel green).
const tones: Record<DocumentType, string> = {
  pdf: 'bg-rose-50 text-rose-600',
  doc: 'bg-sky-50 text-sky-600',
  docx: 'bg-sky-50 text-sky-600',
  ppt: 'bg-orange-50 text-orange-600',
  pptx: 'bg-orange-50 text-orange-600',
  pps: 'bg-orange-50 text-orange-600',
  ppsx: 'bg-orange-50 text-orange-600',
  xls: 'bg-emerald-50 text-emerald-600',
  xlsx: 'bg-emerald-50 text-emerald-600',
};

/** Square badge for a lesson resource: a format icon for uploaded documents, a link icon otherwise. */
export function FileTypeIcon({ type, className }: { type: DocumentType | null; className?: string }) {
  const Icon = type ? icons[type] : Link2;
  return (
    <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', type ? tones[type] : 'bg-brand-50 text-brand-600', className)}>
      <Icon className="h-5 w-5" aria-hidden />
    </span>
  );
}
