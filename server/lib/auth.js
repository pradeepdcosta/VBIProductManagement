import crypto from 'crypto';
import { promisify } from 'util';
import prisma from './prisma.js';

const scrypt = promisify(crypto.scrypt);

export const SESSION_COOKIE = 'vbi_session';
const SESSION_HOURS = 12;
export const MIN_PASSWORD_LENGTH = 8;

export const normaliseEmail = (email) => String(email || '').trim().toLowerCase();
export const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// ─── Passwords (scrypt, salted; stored as "scrypt$salt$hash") ─────────────────

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export async function verifyPassword(password, stored) {
  const [scheme, saltHex, hashHex] = String(stored || '').split('$');
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = await scrypt(password, Buffer.from(saltHex, 'hex'), expected.length);
  return crypto.timingSafeEqual(expected, actual);
}

// ─── Sessions (random token in an HttpOnly cookie; only its hash is stored) ──

export const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

export async function createSession(userId) {
  const token = crypto.randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_HOURS * 3600 * 1000);
  await prisma.session.create({ data: { tokenHash: hashToken(token), userId, expiresAt } });
  return { token, expiresAt };
}

export async function destroySession(token) {
  if (token) await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
}

export function readSessionToken(req) {
  const header = req.headers.cookie || '';
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === SESSION_COOKIE) return decodeURIComponent(v.join('='));
  }
  return null;
}

export function setSessionCookie(res, token, expiresAt) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    // https-only in production; COOKIE_SECURE=false allows a plain-http office install
    secure: process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'false',
    expires: expiresAt,
    path: '/',
  });
}

export function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE, { path: '/' });
}

// Returns the signed-in, active user for this request, or null
export async function getSessionUser(req) {
  const token = readSessionToken(req);
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { select: { id: true, email: true, name: true, active: true } } },
  });
  if (!session || session.expiresAt < new Date() || !session.user.active) return null;
  return session.user;
}

// ─── Access guard ─────────────────────────────────────────────────────────────

// API calls the public pages make without signing in (raise-request form,
// requester magic link, product-team review link)
const PUBLIC_API = [
  { method: 'GET', path: /^\/products\/(categories|families|lines)$/ },
  { method: 'POST', path: /^\/requests$/ },
  { method: 'GET', path: /^\/requests\/by-token\/[^/]+$/ },
  { method: 'PUT', path: /^\/requests\/by-token\/[^/]+$/ },
];

// Mounted on /api — everything except the public calls needs a signed-in user
export async function requireAuth(req, res, next) {
  try {
    if (PUBLIC_API.some((r) => r.method === req.method && r.path.test(req.path))) return next();
    const user = await getSessionUser(req);
    if (!user) return res.status(401).json({ error: 'Please sign in' });
    req.user = user;
    next();
  } catch (err) { next(err); }
}

// ─── First account ────────────────────────────────────────────────────────────

// When there are no users yet, create the first one from INITIAL_ADMIN_EMAIL /
// INITIAL_ADMIN_PASSWORD (set in .env locally, environment variables on Railway).
export async function ensureInitialUser() {
  if ((await prisma.user.count()) > 0) return;
  const email = normaliseEmail(process.env.INITIAL_ADMIN_EMAIL);
  const password = process.env.INITIAL_ADMIN_PASSWORD;
  if (!isValidEmail(email) || !password || password.length < MIN_PASSWORD_LENGTH) {
    console.warn('No portal users exist. Set INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD (min 8 chars) to create the first login.');
    return;
  }
  await prisma.user.create({ data: { email, passwordHash: await hashPassword(password) } });
  console.log(`Created first portal login for ${email}`);
}

// Remove expired sessions (called at startup)
export async function pruneSessions() {
  await prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
}
