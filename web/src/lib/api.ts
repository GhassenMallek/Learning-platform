export interface FieldIssue {
  field: string;
  code: string;
  min?: number;
  max?: number;
}

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  counts?: Record<string, number>;
}

/** Error thrown for every failed API call. `code` is stable and translated by the UI. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
  get fieldIssues(): FieldIssue[] {
    return Array.isArray(this.details) ? (this.details as FieldIssue[]) : [];
  }
}

type Query = Record<string, string | number | boolean | null | undefined>;

interface Options {
  query?: Query;
  body?: unknown;
  form?: FormData;
  signal?: AbortSignal;
}

function withQuery(path: string, query?: Query) {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

async function request<T>(method: string, path: string, opts: Options = {}): Promise<{ data: T; meta?: PageMeta }> {
  // The custom header is our CSRF defence for cookie sessions (see server/src/middleware/http.ts).
  const headers: Record<string, string> = { 'X-Requested-With': 'learning-center', Accept: 'application/json' };
  let body: BodyInit | undefined;
  if (opts.form) body = opts.form;
  else if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(opts.body);
  }

  let res: Response;
  try {
    res = await fetch(`/api${withQuery(path, opts.query)}`, { method, headers, body, credentials: 'same-origin', signal: opts.signal });
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    throw new ApiError(0, 'NETWORK_ERROR', 'Network error');
  }

  if (res.status === 204) return { data: undefined as T };
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith('/auth/')) window.dispatchEvent(new Event('lc:unauthenticated'));
    const error = json?.error;
    throw new ApiError(res.status, error?.code ?? 'UNKNOWN', error?.message ?? res.statusText, error?.details);
  }
  return { data: json.data as T, meta: json.meta };
}

export const api = {
  get: async <T>(path: string, query?: Query, signal?: AbortSignal) => (await request<T>('GET', path, { query, signal })).data,
  /** Paginated list: returns the rows and the page metadata. */
  list: async <T>(path: string, query?: Query, signal?: AbortSignal) => {
    const { data, meta } = await request<T[]>('GET', path, { query, signal });
    return { items: data, meta: meta as PageMeta };
  },
  post: async <T>(path: string, body?: unknown) => (await request<T>('POST', path, { body: body ?? {} })).data,
  put: async <T>(path: string, body?: unknown) => (await request<T>('PUT', path, { body: body ?? {} })).data,
  patch: async <T>(path: string, body?: unknown) => (await request<T>('PATCH', path, { body: body ?? {} })).data,
  del: async (path: string) => {
    await request<void>('DELETE', path);
  },
  upload: async <T>(path: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return (await request<T>('POST', path, { form })).data;
  },
};
