import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import Joi from 'joi';
import { User } from '../models/User.js';

const router = express.Router();

const registerSchema = Joi.object({
	email: Joi.string().email().required(),
	password: Joi.string().min(6).max(128).required()
});

const loginSchema = Joi.object({
	email: Joi.string().email().required(),
	password: Joi.string().required()
});

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       201:
 *         description: User created
 *       400:
 *         description: Validation error
 *       409:
 *         description: Email already in use
 */
router.post('/register', async (req, res) => {
	const { error, value } = registerSchema.validate(req.body);
	if (error) return res.status(400).json({ error: error.message });

	const { email, password } = value;
	const existing = await User.findOne({ email });
	if (existing) return res.status(409).json({ error: 'Email already in use' });

	const passwordHash = await bcrypt.hash(password, 10);
	const user = await User.create({ email, passwordHash });
	return res.status(201).json({ id: user._id, email: user.email, createdAt: user.createdAt });
});

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Login and receive a JWT
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: JWT token returned
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', async (req, res) => {
	const { error, value } = loginSchema.validate(req.body);
	if (error) return res.status(400).json({ error: error.message });

	const { email, password } = value;
	const user = await User.findOne({ email });
	if (!user) return res.status(401).json({ error: 'Invalid credentials' });

	const valid = await bcrypt.compare(password, user.passwordHash);
	if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

	const token = jwt.sign({}, process.env.JWT_SECRET, { subject: String(user._id), expiresIn: '7d' });
	return res.json({ token });
});

export default router; 