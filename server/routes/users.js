import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { hashPassword, hashToken, readSessionToken, normaliseEmail, isValidEmail, MIN_PASSWORD_LENGTH } from '../lib/auth.js';

// Portal logins, managed from Admin → Users. Every user has the same access.
const router = Router();

const USER_SELECT = { id: true, email: true, name: true, active: true, createdAt: true, lastLoginAt: true };

function passwordError(password) {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  return null;
}

// Someone must always be able to sign in
async function wouldLeaveNoActiveUser(id) {
  return (await prisma.user.count({ where: { active: true, id: { not: id } } })) === 0;
}

// GET /api/users
router.get('/', async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({ select: USER_SELECT, orderBy: { email: 'asc' } });
    res.json(users.map((u) => ({ ...u, isYou: u.id === req.user.id })));
  } catch (err) { next(err); }
});

// POST /api/users { email, password, name? }
router.post('/', async (req, res, next) => {
  try {
    const email = normaliseEmail(req.body.email);
    if (!isValidEmail(email)) return res.status(400).json({ error: 'Enter a valid email address' });
    const pwError = passwordError(req.body.password);
    if (pwError) return res.status(400).json({ error: pwError });
    if (await prisma.user.findUnique({ where: { email } })) return res.status(409).json({ error: 'A user with that email already exists' });

    const user = await prisma.user.create({
      data: { email, name: String(req.body.name || '').trim() || null, passwordHash: await hashPassword(req.body.password) },
      select: USER_SELECT,
    });
    res.status(201).json({ ...user, isYou: false });
  } catch (err) { next(err); }
});

// PUT /api/users/:id { name?, active?, password? } — password resets also sign the user out everywhere
router.put('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    if (!(await prisma.user.findUnique({ where: { id } }))) return res.status(404).json({ error: 'User not found' });

    const data = {};
    if (req.body.name !== undefined) data.name = String(req.body.name || '').trim() || null;
    if (req.body.active !== undefined) {
      if (typeof req.body.active !== 'boolean') return res.status(400).json({ error: 'active must be true or false' });
      if (!req.body.active && id === req.user.id) return res.status(400).json({ error: "You can't deactivate your own login" });
      if (!req.body.active && (await wouldLeaveNoActiveUser(id))) return res.status(400).json({ error: 'At least one active user is required' });
      data.active = req.body.active;
    }
    if (req.body.password !== undefined) {
      const pwError = passwordError(req.body.password);
      if (pwError) return res.status(400).json({ error: pwError });
      data.passwordHash = await hashPassword(req.body.password);
    }

    const user = await prisma.user.update({ where: { id }, data, select: USER_SELECT });
    // A new password or deactivation signs that user out everywhere
    // (except the session making the change, when you reset your own password)
    if (data.passwordHash || data.active === false) {
      const keep = id === req.user.id ? hashToken(readSessionToken(req)) : null;
      await prisma.session.deleteMany({ where: { userId: id, ...(keep ? { tokenHash: { not: keep } } : {}) } });
    }
    res.json({ ...user, isYou: id === req.user.id });
  } catch (err) { next(err); }
});

// DELETE /api/users/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    if (id === req.user.id) return res.status(400).json({ error: "You can't remove your own login" });
    if (await wouldLeaveNoActiveUser(id)) return res.status(400).json({ error: 'At least one active user is required' });
    await prisma.user.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'User not found' });
    next(err);
  }
});

export default router;
