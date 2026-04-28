import { jest } from '@jest/globals';
import { errorHandler } from '../../src/middlewares/error.middleware.js';

function mockRes(headersSent = false) {
	const res = { headersSent };
	res.status = jest.fn().mockReturnValue(res);
	res.json = jest.fn().mockReturnValue(res);
	return res;
}

describe('error.middleware.errorHandler', () => {
	const origError = console.error;
	beforeAll(() => {
		console.error = jest.fn();
	});
	afterAll(() => {
		console.error = origError;
	});

	test('returns 500 with generic error body', () => {
		const res = mockRes();
		const next = jest.fn();
		errorHandler(new Error('boom'), {}, res, next);
		expect(res.status).toHaveBeenCalledWith(500);
		expect(res.json).toHaveBeenCalledWith({ error: 'Internal error' });
		expect(next).not.toHaveBeenCalled();
	});

	test('does not leak internal error message to client', () => {
		const res = mockRes();
		errorHandler(new Error('SECRET INTERNAL DETAIL'), {}, res, jest.fn());
		const body = res.json.mock.calls[0][0];
		expect(JSON.stringify(body)).not.toContain('SECRET INTERNAL DETAIL');
	});

	test('delegates to next when headers already sent', () => {
		const res = mockRes(true);
		const next = jest.fn();
		const err = new Error('late');
		errorHandler(err, {}, res, next);
		expect(next).toHaveBeenCalledWith(err);
		expect(res.status).not.toHaveBeenCalled();
	});
});
