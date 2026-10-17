import { Router } from 'express';
import prisma from '../lib/prisma.js';
import {
  normaliseEmail, verifyPassword, createSession, destroySession,
  readSessionToken, setSessionCookie, clearSessionCookie, getSessionUser,
} from '../lib/auth.js';

const router = Router();

// Simple in-memory throttle: 10 failed attempts per email+IP per 15 minutes
const FAIL_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS = 10;
const failures = new Map();

function tooManyFailures(key) {
  const entry = failures.get(key);
  if (!entry || Date.now() - entry.first > FAIL_WINDOW_MS) return false;
  return entry.count >= MAX_FAILS;
}

function recordFailure(key) {
  const entry = failures.get(key);
  if (!entry || Date.now() - entry.first > FAIL_WINDOW_MS) failures.set(key, { first: Date.now(), count: 1 });
  else entry.count++;
}

// POST /api/auth/login { email, password }
router.post('/login', async (req, res, next) => {
  try {
    const email = normaliseEmail(req.body?.email);
    const password = String(req.body?.password || '');
    const key = `${email}|${req.ip}`;
    if (tooManyFailures(key)) {
      return res.status(429).json({ error: 'Too many failed attempts. Try again in 15 minutes.' });
    }

    const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
    const ok = user && user.active && password && (await verifyPassword(password, user.passwordHash));
    if (!ok) {
      recordFailure(key);
      return res.status(401).json({ error: 'Email or password is incorrect' });
    }

    failures.delete(key);
    const { token, expiresAt } = await createSession(user.id);
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    setSessionCookie(res, token, expiresAt);
    res.json({ id: user.id, email: user.email, name: user.name });
  } catch (err) { next(err); }
});

// POST /api/auth/logout
router.post('/logout', async (req, res, next) => {
  try {
    await destroySession(readSessionToken(req));
    clearSessionCookie(res);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// GET /api/auth/me — the signed-in user, or 401
router.get('/me', async (req, res, next) => {
  try {
    const user = await getSessionUser(req);
    if (!user) return res.status(401).json({ error: 'Not signed in' });
    res.json({ id: user.id, email: user.email, name: user.name });
  } catch (err) { next(err); }
});

export default router;
