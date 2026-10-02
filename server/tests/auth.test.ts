import jwt from 'jsonwebtoken';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { app, client, loginAs, makeAdmin, makeStudent, PASSWORD, useTestDatabase } from './helpers';

describe('authentication', () => {
  useTestDatabase();

  it('logs an admin in with an httpOnly cookie and exposes the session on /auth/me', async () => {
    await makeAdmin();
    const agent = client();
    const res = await agent.post('/api/auth/login').send({ email: 'admin@test.dev', password: PASSWORD, portal: 'admin' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ role: 'ADMIN', email: 'admin@test.dev' });
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|argon2/);
    const cookie = String(res.headers['set-cookie']);
    expect(cookie).toMatch(/lc_session=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect((await agent.get('/api/auth/me')).body.data.email).toBe('admin@test.dev');
  });

  it('gives the same generic error for a wrong password and an unknown e-mail', async () => {
    await makeAdmin();
    const wrong = await client().post('/api/auth/login').send({ email: 'admin@test.dev', password: 'nope-nope-nope' });
    const unknown = await client().post('/api/auth/login').send({ email: 'ghost@test.dev', password: 'nope-nope-nope' });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body).toEqual(unknown.body);
    expect(wrong.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('does not accept student credentials on the admin portal (and vice versa)', async () => {
    await makeStudent();
    await makeAdmin();
    const asAdmin = await client().post('/api/auth/login').send({ email: 'student@test.dev', password: PASSWORD, portal: 'admin' });
    const asStudent = await client().post('/api/auth/login').send({ email: 'admin@test.dev', password: PASSWORD, portal: 'student' });
    expect(asAdmin.status).toBe(401);
    expect(asStudent.status).toBe(401);
  });

  it('rejects NoSQL operator payloads instead of treating them as queries', async () => {
    await makeAdmin();
    const res = await client().post('/api/auth/login').send({ email: { $gt: '' }, password: { $gt: '' } });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('refuses state-changing requests that lack the CSRF header', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'a@b.co', password: 'x' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CSRF');
  });

  it('rejects forged, foreign-secret and unsigned ("alg: none") tokens', async () => {
    const admin = await makeAdmin();
    const claims = { role: 'ADMIN', tv: 0 };
    const forged = jwt.sign(claims, 'x'.repeat(40), { subject: String(admin.user), expiresIn: 60 });
    const unsigned = `${Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url')}.${Buffer.from(JSON.stringify({ ...claims, sub: String(admin.user) })).toString('base64url')}.`;
    for (const token of [forged, unsigned, 'garbage']) {
      const res = await request(app).get('/api/stats/overview').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(401);
    }
  });

  it('blocks a deactivated student at login and on an already-open session', async () => {
    const student = await makeStudent();
    const agent = await loginAs('student@test.dev', 'student');
    expect((await agent.get('/api/me/courses')).status).toBe(200);

    student.status = 'INACTIVE';
    await student.save();

    expect((await agent.get('/api/me/courses')).status).toBe(403);
    const login = await client().post('/api/auth/login').send({ email: 'student@test.dev', password: PASSWORD });
    expect(login.status).toBe(403);
    expect(login.body.error.code).toBe('ACCOUNT_INACTIVE');
  });

  it('revokes every other session when the password changes', async () => {
    await makeStudent();
    const first = await loginAs('student@test.dev');
    const second = await loginAs('student@test.dev');

    const bad = await first.post('/api/auth/change-password').send({ currentPassword: 'wrong-password', newPassword: 'BrandNew#Pass1' });
    expect(bad.status).toBe(400);
    expect(bad.body.error.details[0]).toMatchObject({ field: 'currentPassword', code: 'wrong_password' });

    expect((await first.post('/api/auth/change-password').send({ currentPassword: PASSWORD, newPassword: 'BrandNew#Pass1' })).status).toBe(200);
    expect((await first.get('/api/auth/me')).status).toBe(200); // the current session is re-issued
    expect((await second.get('/api/auth/me')).status).toBe(401); // the other one is dead
    expect((await client().post('/api/auth/login').send({ email: 'student@test.dev', password: 'BrandNew#Pass1' })).status).toBe(200);
  });

  it('logout clears the session', async () => {
    await makeAdmin();
    const agent = await loginAs('admin@test.dev');
    expect((await agent.post('/api/auth/logout')).status).toBe(204);
    expect((await agent.get('/api/auth/me')).status).toBe(401);
  });

  it('rate-limits repeated login attempts', async () => {
    const limited = createApp({ rateLimit: { login: 3 } });
    const statuses: number[] = [];
    for (let i = 0; i < 5; i++) {
      statuses.push((await client(limited).post('/api/auth/login').send({ email: 'x@test.dev', password: 'wrong-password' })).status);
    }
    expect(statuses).toEqual([401, 401, 401, 429, 429]);
  });
});
