import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-do-not-use-in-prod';

export function signToken(subject, options = {}) {
	return jwt.sign({}, JWT_SECRET, { subject: String(subject), expiresIn: '7d', ...options });
}

export function verifyToken(token) {
	return jwt.verify(token, JWT_SECRET);
}
