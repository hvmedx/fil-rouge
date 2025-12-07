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

function uniqueEmail() {
	return `test${Date.now()}@example.com`;
}

test('register creates a user', async () => {
	const email = uniqueEmail();
	const res = await request(app).post('/auth/register').send({ email, password: 'Password123' });
	expect(res.status).toBe(201);
	expect(res.body.email).toBe(email.toLowerCase());
});

test('login returns a token', async () => {
	const email = uniqueEmail();
	await request(app).post('/auth/register').send({ email, password: 'Password123' });
	const res = await request(app).post('/auth/login').send({ email, password: 'Password123' });
	expect(res.status).toBe(200);
	expect(typeof res.body.token).toBe('string');
});
