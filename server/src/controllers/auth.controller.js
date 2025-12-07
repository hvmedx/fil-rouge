import Joi from 'joi';
import { loginUser, registerUser } from '../services/auth.service.js';

export const registerSchema = Joi.object({
	email: Joi.string().email().required(),
	password: Joi.string().min(6).max(128).required()
});

export async function register(req, res) {
	const { error, value } = registerSchema.validate(req.body);
	if (error) return res.status(400).json({ error: error.message });
	const result = await registerUser(value.email, value.password);
	if (result.error) return res.status(409).json({ error: result.error });
	const { user } = result;
	return res.status(201).json({ id: user._id, email: user.email, createdAt: user.createdAt });
}

export const loginSchema = Joi.object({
	email: Joi.string().email().required(),
	password: Joi.string().required()
});

export async function login(req, res) {
	const { error, value } = loginSchema.validate(req.body);
	if (error) return res.status(400).json({ error: error.message });
	const result = await loginUser(value.email, value.password);
	if (result.error) return res.status(401).json({ error: result.error });
	return res.json({ token: result.token });
}
