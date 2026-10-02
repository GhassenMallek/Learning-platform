import { Router, type Response } from 'express';
import { SESSION_COOKIE, env } from '../config/env';
import { Student, User } from '../db';
import { AppError, unauthorized } from '../lib/errors';
import { parse, send } from '../lib/http';
import { DUMMY_HASH_PROMISE, hashPassword, signSession, verifyPassword } from '../lib/security';
import { authenticate, buildAuthContext, type AuthContext } from '../middleware/auth';
import type { buildLimiters } from '../middleware/http';
import { changePasswordSchema, loginSchema } from '../schemas/people';

const cookieBase = { httpOnly: true, sameSite: 'lax', secure: env.COOKIE_SECURE, path: '/' } as const;

function startSession(res: Response, user: { id: string; role: 'ADMIN' | 'STUDENT'; tokenVersion: number }) {
  const { token, maxAgeMs } = signSession(user);
  res.cookie(SESSION_COOKIE, token, { ...cookieBase, maxAge: maxAgeMs });
}

async function accountDto(ctx: AuthContext) {
  const photo = ctx.role === 'STUDENT' ? (await Student.findById(ctx.profileId).select('profilePhotoUrl'))?.profilePhotoUrl ?? null : null;
  return {
    id: ctx.userId,
    profileId: ctx.profileId,
    email: ctx.email,
    role: ctx.role,
    firstName: ctx.firstName,
    lastName: ctx.lastName,
    mustChangePassword: ctx.mustChangePassword,
    profilePhotoUrl: photo,
  };
}

export function authRouter(limiters: ReturnType<typeof buildLimiters>) {
  const r = Router();

  r.post('/login', limiters.login, async (req, res) => {
    const { email, password, portal } = parse(loginSchema, req.body);
    const user = await User.findOne({ email }).select('+passwordHash');
    // Always run a hash comparison — even for unknown e-mails — so response time does not reveal which accounts exist.
    const valid = await verifyPassword(user?.passwordHash ?? (await DUMMY_HASH_PROMISE), password);
    const portalMismatch = !!portal && !!user && (portal === 'admin') !== (user.role === 'ADMIN');
    if (!user || !valid || portalMismatch) throw new AppError(401, 'INVALID_CREDENTIALS', 'Incorrect e-mail or password');

    // Only after the password is proven do we reveal that a student account is deactivated.
    const ctx = await buildAuthContext(user);
    if (!ctx) throw new AppError(401, 'INVALID_CREDENTIALS', 'Incorrect e-mail or password');
    await User.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });
    startSession(res, { id: user.id, role: user.role, tokenVersion: user.tokenVersion });
    send(res, await accountDto(ctx));
  });

  r.post('/logout', (_req, res) => {
    res.clearCookie(SESSION_COOKIE, cookieBase);
    res.status(204).end();
  });

  r.get('/me', authenticate, async (req, res) => send(res, await accountDto(req.auth!)));

  r.post('/change-password', authenticate, async (req, res) => {
    const { currentPassword, newPassword } = parse(changePasswordSchema, req.body);
    const user = await User.findById(req.auth!.userId).select('+passwordHash');
    if (!user) throw unauthorized();
    if (!(await verifyPassword(user.passwordHash, currentPassword))) {
      throw new AppError(400, 'VALIDATION_ERROR', 'The request is invalid', [{ field: 'currentPassword', code: 'wrong_password' }]);
    }
    user.passwordHash = await hashPassword(newPassword);
    user.mustChangePassword = false;
    user.tokenVersion += 1; // revokes every other session of this account
    await user.save();
    startSession(res, { id: user.id, role: user.role, tokenVersion: user.tokenVersion });
    send(res, { changed: true });
  });

  return r;
}
