import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env';
import type { DocumentType } from '../db/enums';

export interface StoredFile {
  /** Provider-specific identifier (relative path for local storage). */
  key: string;
  /** URL the browser can load. */
  url: string;
  size: number;
  contentType: string;
}

/**
 * Storage abstraction. The app only talks to this interface, so moving from local disk to
 * S3 / Cloudinary means adding one class and one `case` in `createStorage` — nothing else changes.
 */
export interface StorageProvider {
  readonly driver: string;
  save(input: { buffer: Buffer; folder: string; extension: string; contentType: string }): Promise<StoredFile>;
  /** Best-effort delete by public URL; silently ignores URLs this provider does not own. */
  remove(url: string): Promise<void>;
}

const PUBLIC_PREFIX = '/uploads/';

class LocalStorageProvider implements StorageProvider {
  readonly driver = 'local';

  constructor(private readonly root: string) {}

  async save({ buffer, folder, extension, contentType }: Parameters<StorageProvider['save']>[0]): Promise<StoredFile> {
    const safeFolder = folder.replace(/[^a-z0-9-]/gi, '');
    const name = `${crypto.randomBytes(16).toString('hex')}.${extension.replace(/[^a-z0-9]/gi, '')}`;
    const dir = path.join(this.root, safeFolder);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, name), buffer, { flag: 'wx' });
    return { key: `${safeFolder}/${name}`, url: `${PUBLIC_PREFIX}${safeFolder}/${name}`, size: buffer.length, contentType };
  }

  async remove(url: string): Promise<void> {
    if (!url.startsWith(PUBLIC_PREFIX)) return;
    const target = path.resolve(this.root, url.slice(PUBLIC_PREFIX.length));
    // Path-traversal guard: never delete outside the upload root.
    if (!target.startsWith(this.root + path.sep)) return;
    await fs.rm(target, { force: true });
  }
}

function createStorage(): StorageProvider {
  switch (env.STORAGE_DRIVER) {
    case 'local':
      return new LocalStorageProvider(env.uploadDir);
    // case 's3': return new S3StorageProvider(...)          ← plug future drivers in here
    // case 'cloudinary': return new CloudinaryProvider(...)
  }
}

export const storage: StorageProvider = createStorage();

/** Identify an image by its magic bytes (the client-declared MIME type / extension is never trusted). No SVG on purpose. */
export function detectImage(buf: Buffer): { extension: string; contentType: string } | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { extension: 'jpg', contentType: 'image/jpeg' };
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { extension: 'png', contentType: 'image/png' };
  const head = buf.subarray(0, 6).toString('ascii');
  if (head === 'GIF87a' || head === 'GIF89a') return { extension: 'gif', contentType: 'image/gif' };
  if (buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') {
    return { extension: 'webp', contentType: 'image/webp' };
  }
  return null;
}

const DOCUMENT_MIME: Record<DocumentType, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  pps: 'application/vnd.ms-powerpoint',
  ppsx: 'application/vnd.openxmlformats-officedocument.presentationml.slideshow',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

const OLE2 = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
const ZIP = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

/**
 * Identify a course document (PDF, Word, PowerPoint, Excel) by its bytes. The client file name is only used to
 * tell apart formats that share a container (legacy Office files are all OLE2; pptx vs ppsx are both OOXML presentations).
 */
export function detectDocument(buf: Buffer, fileName: string): { extension: DocumentType; contentType: string } | null {
  if (buf.length < 8) return null;
  const ext = path.extname(fileName).slice(1).toLowerCase();
  const pick = (allowed: DocumentType[], fallback: DocumentType) => {
    const extension = (allowed as string[]).includes(ext) ? (ext as DocumentType) : fallback;
    return { extension, contentType: DOCUMENT_MIME[extension] };
  };

  if (buf.subarray(0, 5).toString('ascii') === '%PDF-') return pick(['pdf'], 'pdf');
  if (buf.subarray(0, 8).equals(OLE2)) {
    // An OLE2 container is only accepted with a matching legacy Office extension (it could be anything otherwise).
    return ['doc', 'ppt', 'pps', 'xls'].includes(ext) ? pick(['doc', 'ppt', 'pps', 'xls'], 'doc') : null;
  }
  if (buf.subarray(0, 4).equals(ZIP)) {
    // OOXML: the part names are stored uncompressed in the zip headers.
    if (!buf.includes('[Content_Types].xml')) return null;
    if (buf.includes('word/')) return pick(['docx'], 'docx');
    if (buf.includes('ppt/')) return pick(['pptx', 'ppsx'], 'pptx');
    if (buf.includes('xl/')) return pick(['xlsx'], 'xlsx');
  }
  return null;
}

/** Remove uploaded files that a lesson no longer references (external links are ignored by the provider). */
export async function removeFiles(urls: Iterable<string>): Promise<void> {
  await Promise.all([...urls].map((url) => storage.remove(url).catch(() => undefined)));
}
