import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge conditional class names, letting later Tailwind utilities win. */
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const initials = (first?: string | null, last?: string | null) =>
  `${first?.trim()[0] ?? ''}${last?.trim()[0] ?? ''}`.toUpperCase() || '?';

/** Small, stable string hash (FNV-1a) — used to give categories/avatars a consistent colour. */
export function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export const toDateInput = (iso?: string | null) => (iso ? iso.slice(0, 10) : '');

/** Only http(s) links and our own uploads may become `href`s (defence in depth against `javascript:` URLs). */
export const isSafeUrl = (url: string) => /^https?:\/\//i.test(url) || url.startsWith('/uploads/');

/** "2.4 MB" / "2,4 Mo" — localized file size. */
export function formatBytes(bytes: number, locale: string) {
  const units = ['byte', 'kilobyte', 'megabyte', 'gigabyte'] as const;
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return new Intl.NumberFormat(locale, { style: 'unit', unit: units[i], unitDisplay: 'short', maximumFractionDigits: i < 2 ? 0 : 1 }).format(value);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const isEmail = (v: string) => EMAIL_RE.test(v.trim());

/** Convert a video page URL into something we are willing to embed (YouTube/Vimeo) or play natively. */
export function parseVideo(url: string): { kind: 'youtube' | 'vimeo' | 'file' | 'link'; src: string } {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      const id = u.searchParams.get('v') ?? (u.pathname.startsWith('/embed/') ? u.pathname.split('/')[2] : null);
      if (id && /^[\w-]{6,20}$/.test(id)) return { kind: 'youtube', src: `https://www.youtube-nocookie.com/embed/${id}` };
    }
    if (host === 'youtu.be') {
      const id = u.pathname.slice(1);
      if (/^[\w-]{6,20}$/.test(id)) return { kind: 'youtube', src: `https://www.youtube-nocookie.com/embed/${id}` };
    }
    if (host === 'vimeo.com' || host === 'player.vimeo.com') {
      const id = u.pathname.split('/').filter(Boolean).pop();
      if (id && /^\d+$/.test(id)) return { kind: 'vimeo', src: `https://player.vimeo.com/video/${id}` };
    }
    if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(u.pathname)) return { kind: 'file', src: url };
  } catch {
    /* fall through */
  }
  return { kind: 'link', src: url };
}
