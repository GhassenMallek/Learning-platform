import crypto from 'node:crypto';
import { hash, verify } from '@node-rs/argon2';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import type { Role } from '../db/enums';

// ── Passwords (argon2id, library defaults follow the OWASP minimum profile) ──────────
export const hashPassword = (plain: string) => hash(plain);

/** Never throws: a malformed hash simply fails verification. */
export async function verifyPassword(passwordHash: string, plain: string): Promise<boolean> {
  try {
    return await verify(passwordHash, plain);
  } catch {
    return false;
  }
}

/** Hash of a random secret — compared against when the e-mail is unknown so timing does not reveal accounts. */
export const DUMMY_HASH_PROMISE = hash(crypto.randomBytes(16).toString('hex'));

/** Readable one-time password (no ambiguous characters) with upper, lower, digit and symbol. */
export function generateTemporaryPassword(): string {
  const pick = (chars: string, n: number) =>
    Array.from({ length: n }, () => chars[crypto.randomInt(chars.length)]).join('');
  const parts = [pick('ABCDEFGHJKLMNPQRSTUVWXYZ', 3), pick('abcdefghijkmnpqrstuvwxyz', 4), pick('23456789', 3), pick('#$%&*+?', 1)];
  return parts.join('');
}

// ── Sessions (HS256 JWT) ─────────────────────────────────────────────────────────────
export interface SessionClaims {
  sub: string;
  role: Role;
  tv: number;
}

export function signSession(user: { id: string; role: Role; tokenVersion: number }) {
  const seconds = user.role === 'ADMIN' ? env.ADMIN_SESSION_HOURS * 3600 : env.STUDENT_SESSION_DAYS * 86400;
  const token = jwt.sign({ role: user.role, tv: user.tokenVersion }, env.JWT_SECRET, {
    algorithm: 'HS256',
    subject: user.id,
    expiresIn: Math.round(seconds),
  });
  return { token, maxAgeMs: Math.round(seconds * 1000) };
}

/** Returns the claims for a valid, unexpired token signed by us — otherwise null. */
export function verifySession(token: string): SessionClaims | null {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
    if (typeof decoded === 'string') return null;
    const { sub, role, tv } = decoded as Record<string, unknown>;
    if (typeof sub !== 'string' || (role !== 'ADMIN' && role !== 'STUDENT') || typeof tv !== 'number') return null;
    return { sub, role, tv };
  } catch {
    return null;
  }
}
