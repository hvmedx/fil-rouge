import bcrypt from 'bcrypt';
import { User } from '../models/User.js';
import { signToken } from './token.service.js';

export async function registerUser(email, password) {
	const existing = await User.findOne({ email });
	if (existing) return { error: 'Email already in use' };
	const passwordHash = await bcrypt.hash(password, 10);
	const user = await User.create({ email, passwordHash });
	return { user };
}

export async function loginUser(email, password) {
	const user = await User.findOne({ email });
	if (!user) return { error: 'Invalid credentials' };
	const valid = await bcrypt.compare(password, user.passwordHash);
	if (!valid) return { error: 'Invalid credentials' };
	const token = signToken(user._id);
	return { token };
}
