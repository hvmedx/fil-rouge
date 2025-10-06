import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-do-not-use-in-prod';

export function requireAuth(req, res, next) {
	const authHeader = req.headers.authorization || '';
	const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
	if (!token) {
		return res.status(401).json({ error: 'Unauthorized' });
	}
	try {
		const payload = jwt.verify(token, JWT_SECRET);
		req.user = { userId: payload.sub };
		return next();
	} catch (error) {
		return res.status(401).json({ error: 'Invalid token' });
	}
} 