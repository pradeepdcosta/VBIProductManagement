import { Router } from 'express';
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

// POST /api/requests
router.post('/', async (req, res, next) => {
  try {
    const request = await prisma.featureRequest.create({ data: req.body });
    res.status(201).json(request);
  } catch (err) {
    next(err);
  }
});

// PUT /api/requests/:id
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
