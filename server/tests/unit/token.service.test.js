import { signToken, verifyToken } from '../../src/services/token.service.js';

describe('token.service (unit)', () => {
	test('sign + verify round-trip preserves subject', () => {
		const token = signToken('user-123');
		const payload = verifyToken(token);
		expect(payload.sub).toBe('user-123');
		expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
	});

	test('verify throws on tampered token', () => {
		const token = signToken('abc');
		expect(() => verifyToken(token + 'x')).toThrow();
	});

	test('verify throws on garbage input', () => {
		expect(() => verifyToken('not-a-jwt')).toThrow();
	});

	test('respects custom expiresIn option', () => {
		const token = signToken('u', { expiresIn: '1s' });
		const payload = verifyToken(token);
		expect(payload.exp - payload.iat).toBe(1);
	});
});
