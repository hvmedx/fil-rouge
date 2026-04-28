import request from 'supertest';
import { createApp } from '../src/app.js';
import { connect, disconnect } from '../src/config/db.js';

let app;

beforeAll(async () => {
	await connect();
	app = createApp();
});

afterAll(async () => {
	await disconnect();
});

describe('auth edge cases', () => {
	test('register with malformed email returns 400', async () => {
		const res = await request(app).post('/auth/register').send({ email: 'nope', password: 'Password123' });
		expect(res.status).toBe(400);
	});

	test('register with weak password returns 400', async () => {
		const res = await request(app).post('/auth/register').send({ email: 'a@b.com', password: '123' });
		expect(res.status).toBe(400);
	});

	test('duplicate registration returns 409', async () => {
		const email = `dup${Date.now()}@example.com`;
		await request(app).post('/auth/register').send({ email, password: 'Password123' });
		const res = await request(app).post('/auth/register').send({ email, password: 'Password123' });
		expect(res.status).toBe(409);
	});

	test('login with wrong password returns 401', async () => {
		const email = `wrong${Date.now()}@example.com`;
		await request(app).post('/auth/register').send({ email, password: 'Password123' });
		const res = await request(app).post('/auth/login').send({ email, password: 'Wrong1234' });
		expect(res.status).toBe(401);
	});

	test('login with unknown email returns 401', async () => {
		const res = await request(app).post('/auth/login').send({ email: 'ghost@b.com', password: 'Password123' });
		expect(res.status).toBe(401);
	});

	test('GET /health returns 200', async () => {
		const res = await request(app).get('/health');
		expect(res.status).toBe(200);
		expect(res.body.status).toBe('ok');
	});
});
