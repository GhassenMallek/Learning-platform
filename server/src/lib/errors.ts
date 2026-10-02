/**
 * Application error carrying an HTTP status and a stable machine-readable `code`.
 * The web app translates `code` into natural EN/FR messages — `message` is for logs and API clients.
 */
export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message?: string,
    public readonly details?: unknown,
  ) {
    super(message ?? code);
    this.name = 'AppError';
  }
}

export const badRequest = (code = 'BAD_REQUEST', message?: string, details?: unknown) =>
  new AppError(400, code, message, details);
export const unauthorized = (code = 'UNAUTHENTICATED', message = 'Authentication required') =>
  new AppError(401, code, message);
export const forbidden = (code = 'FORBIDDEN', message = 'You do not have access to this resource', details?: unknown) =>
  new AppError(403, code, message, details);
export const notFound = (what = 'Resource', code = 'NOT_FOUND') => new AppError(404, code, `${what} not found`);
export const conflict = (code: string, message?: string, details?: unknown) => new AppError(409, code, message, details);
export const unprocessable = (code: string, message?: string, details?: unknown) =>
  new AppError(422, code, message, details);
