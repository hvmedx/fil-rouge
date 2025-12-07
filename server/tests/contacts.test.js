import request from 'supertest';
import { createApp } from '../src/app.js';
import { connect, disconnect } from '../src/config/db.js';

let app;
let token;

beforeAll(async () => {
	await connect();
	app = createApp();
	const email = `contacts${Date.now()}@example.com`;
	await request(app).post('/auth/register').send({ email, password: 'Password123' });
	const res = await request(app).post('/auth/login').send({ email, password: 'Password123' });
	token = res.body.token;
});

afterAll(async () => {
	await disconnect();
});

function auth(req) {
	return req.set('Authorization', `Bearer ${token}`);
}

test('create and list contacts', async () => {
	const create = await auth(request(app).post('/contacts')).send({ firstName: 'John', lastName: 'Doe', phone: '0600000000' });
	expect(create.status).toBe(201);
	const list = await auth(request(app).get('/contacts'));
	expect(list.status).toBe(200);
	expect(Array.isArray(list.body)).toBe(true);
});

test('prevent duplicate phone per user', async () => {
	await auth(request(app).post('/contacts')).send({ firstName: 'Jane', lastName: 'D', phone: '(060) 00-00-000' });
	const dup = await auth(request(app).post('/contacts')).send({ firstName: 'X', lastName: 'Y', phone: '0600000000' });
	expect(dup.status).toBe(409);
});
