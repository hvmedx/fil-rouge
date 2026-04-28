import { describe, expect, test, vi, beforeEach } from 'vitest';
import { api, configureAuth } from './api.js';

describe('api request interceptor', () => {
	beforeEach(() => {
		configureAuth({ getTokenFn: () => null, onUnauthorizedFn: null });
	});

	test('attaches Bearer token when getToken returns one', async () => {
		configureAuth({ getTokenFn: () => 'TKN' });
		const cfg = await api.interceptors.request.handlers[0].fulfilled({ headers: {} });
		expect(cfg.headers.Authorization).toBe('Bearer TKN');
	});

	test('omits Authorization header when no token', async () => {
		configureAuth({ getTokenFn: () => null });
		const cfg = await api.interceptors.request.handlers[0].fulfilled({ headers: {} });
		expect(cfg.headers.Authorization).toBeUndefined();
	});
});

describe('api response interceptor', () => {
	test('calls onUnauthorized on 401', async () => {
		const onUnauthorized = vi.fn();
		configureAuth({ onUnauthorizedFn: onUnauthorized });
		const handler = api.interceptors.response.handlers[0].rejected;
		await expect(handler({ response: { status: 401 } })).rejects.toBeDefined();
		expect(onUnauthorized).toHaveBeenCalledTimes(1);
	});

	test('does not invoke onUnauthorized on 500', async () => {
		const onUnauthorized = vi.fn();
		configureAuth({ onUnauthorizedFn: onUnauthorized });
		const handler = api.interceptors.response.handlers[0].rejected;
		await expect(handler({ response: { status: 500 } })).rejects.toBeDefined();
		expect(onUnauthorized).not.toHaveBeenCalled();
	});
});
