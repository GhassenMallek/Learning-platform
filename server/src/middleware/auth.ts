import type { NextFunction, Request, Response } from 'express';
import type { HydratedDocument } from 'mongoose';
import { SESSION_COOKIE } from '../config/env';
import { Admin, Student, User, type IUser, type Role } from '../db';
import { AppError, forbidden, unauthorized } from '../lib/errors';
import { verifySession } from '../lib/security';

export interface AuthContext {
  userId: string;
  role: Role;
  email: string;
  /** Admin._id or Student._id depending on the role. */
  profileId: string;
  firstName: string;
  lastName: string;
  mustChangePassword: boolean;
}

declare module 'express-serve-static-core' {
  interface Request {
    auth?: AuthContext;
  }
}

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7).trim() || null;
  const cookie = req.cookies?.[SESSION_COOKIE];
  return typeof cookie === 'string' && cookie ? cookie : null;
}

/**
 * Loads the profile that belongs to a login identity. Shared by the login route and the per-request
 * check so both apply the same rules: an admin needs an Admin profile, a student needs an ACTIVE Student profile.
 */
export async function buildAuthContext(user: HydratedDocument<IUser>): Promise<AuthContext | null> {
  if (user.role === 'ADMIN') {
    const admin = await Admin.findOne({ user: user._id });
    if (!admin) return null;
    return {
      userId: user.id,
      role: 'ADMIN',
      email: user.email,
      profileId: admin.id,
      firstName: admin.firstName,
      lastName: admin.lastName,
      mustChangePassword: user.mustChangePassword,
    };
  }

  const student = await Student.findOne({ user: user._id });
  if (!student) return null;
  if (student.status !== 'ACTIVE') throw new AppError(403, 'ACCOUNT_INACTIVE', 'This account has been deactivated');
  return {
    userId: user.id,
    role: 'STUDENT',
    email: user.email,
    profileId: student.id,
    firstName: student.firstName,
    lastName: student.lastName,
    mustChangePassword: user.mustChangePassword,
  };
}

/**
 * Validates the session against the database on every request (not just the JWT signature):
 * the user must still exist, the tokenVersion must match (password changes revoke sessions),
 * and a student must still be ACTIVE. Returns null when there is no/invalid credential.
 */
async function resolveAuth(req: Request): Promise<AuthContext | null> {
  const token = extractToken(req);
  if (!token) return null;
  const claims = verifySession(token);
  if (!claims) return null;
  const user = await User.findById(claims.sub);
  if (!user || user.tokenVersion !== claims.tv || user.role !== claims.role) return null;
  return buildAuthContext(user);
}

/** Requires a valid session. */
export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  const ctx = await resolveAuth(req);
  if (!ctx) throw unauthorized();
  req.auth = ctx;
  next();
}

/** Attaches `req.auth` when a valid session exists but never rejects (public endpoints that behave differently for admins). */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const ctx = await resolveAuth(req);
    if (ctx) req.auth = ctx;
  } catch (err) {
    if (!(err instanceof AppError)) throw err;
  }
  next();
}

/** Role gate — always mounted *after* `authenticate`. */
export const requireRole =
  (...roles: Role[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) throw unauthorized();
    if (!roles.includes(req.auth.role)) throw forbidden();
    next();
  };

export const adminOnly = [authenticate, requireRole('ADMIN')];
export const studentOnly = [authenticate, requireRole('STUDENT')];
