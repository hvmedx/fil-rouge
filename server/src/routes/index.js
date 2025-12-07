import express from 'express';
import authRouter from './auth.routes.js';
import contactsRouter from './contacts.routes.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.use('/auth', authRouter);
router.use('/contacts', requireAuth, contactsRouter);

export default router;
