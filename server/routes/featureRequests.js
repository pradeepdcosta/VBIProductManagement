import { Router } from 'express';
import { randomUUID } from 'crypto';
import prisma from '../lib/prisma.js';

const router = Router();

// GET /api/requests
router.get('/', async (req, res, next) => {
  try {
    const requests = await prisma.featureRequest.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(requests);
  } catch (err) {
    next(err);
  }
});

// GET /api/requests/by-token/:token  (public — no auth, for magic link page)
router.get('/by-token/:token', async (req, res, next) => {
  try {
    const request = await prisma.featureRequest.findUnique({
      where: { token: req.params.token },
    });
    if (!request) return res.status(404).json({ error: 'Not found' });
    res.json(request);
  } catch (err) {
    next(err);
  }
});

// PUT /api/requests/by-token/:token  (public — submitter can update their own)
router.put('/by-token/:token', async (req, res, next) => {
  try {
    const allowed = ['description', 'justification', 'dealAccount', 'submitterName', 'submitterEmail', 'priority', 'vbiFeedback', 'category', 'productFamily', 'productLine', 'productName'];
    const data = Object.fromEntries(
      Object.entries(req.body).filter(([k]) => allowed.includes(k))
    );
    const request = await prisma.featureRequest.update({
      where: { token: req.params.token },
      data,
    });
    res.json(request);
  } catch (err) {
    next(err);
  }
});

// POST /api/requests
router.post('/', async (req, res, next) => {
  try {
    const request = await prisma.featureRequest.create({
      data: { ...req.body, token: randomUUID() },
    });
    res.status(201).json(request);
  } catch (err) {
    next(err);
  }
});

// PUT /api/requests/:id  (admin — full update)
router.put('/:id', async (req, res, next) => {
  try {
    const request = await prisma.featureRequest.update({
      where: { id: parseInt(req.params.id) },
      data: req.body,
    });
    res.json(request);
  } catch (err) {
    next(err);
  }
});

export default router;
