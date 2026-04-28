import { jest } from '@jest/globals';
import { signToken } from '../../src/services/token.service.js';
import { requireAuth } from '../../src/middlewares/auth.middleware.js';

function mockRes() {
	const res = {};
	res.status = jest.fn().mockReturnValue(res);
	res.json = jest.fn().mockReturnValue(res);
	return res;
}

describe('auth.middleware.requireAuth', () => {
	test('401 when Authorization header missing', () => {
		const req = { headers: {} };
		const res = mockRes();
		const next = jest.fn();
		requireAuth(req, res, next);
		expect(res.status).toHaveBeenCalledWith(401);
		expect(next).not.toHaveBeenCalled();
	});

	test('401 when scheme is not Bearer', () => {
		const req = { headers: { authorization: 'Basic abc' } };
		const res = mockRes();
		const next = jest.fn();
		requireAuth(req, res, next);
		expect(res.status).toHaveBeenCalledWith(401);
	});

	test('401 when token invalid', () => {
		const req = { headers: { authorization: 'Bearer not.a.jwt' } };
		const res = mockRes();
		const next = jest.fn();
		requireAuth(req, res, next);
		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
	});

	test('next() called and req.user populated on valid token', () => {
		const token = signToken('user-42');
		const req = { headers: { authorization: `Bearer ${token}` } };
		const res = mockRes();
		const next = jest.fn();
		requireAuth(req, res, next);
		expect(next).toHaveBeenCalledTimes(1);
		expect(req.user).toEqual({ userId: 'user-42' });
	});
});
