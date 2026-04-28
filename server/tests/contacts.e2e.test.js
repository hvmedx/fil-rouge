import request from 'supertest';
import { createApp } from '../src/app.js';
import { connect, disconnect } from '../src/config/db.js';

let app;
let token;
let otherToken;

beforeAll(async () => {
	await connect();
	app = createApp();
	const email = `e2e${Date.now()}@example.com`;
	await request(app).post('/auth/register').send({ email, password: 'Password123' });
	const res = await request(app).post('/auth/login').send({ email, password: 'Password123' });
	token = res.body.token;

	const otherEmail = `other${Date.now()}@example.com`;
	await request(app).post('/auth/register').send({ email: otherEmail, password: 'Password123' });
	const r2 = await request(app).post('/auth/login').send({ email: otherEmail, password: 'Password123' });
	otherToken = r2.body.token;
});

afterAll(async () => {
	await disconnect();
});

const auth = (req, t = token) => req.set('Authorization', `Bearer ${t}`);

describe('contacts CRUD e2e', () => {
	test('GET /contacts unauthenticated returns 401', async () => {
		const res = await request(app).get('/contacts');
		expect(res.status).toBe(401);
	});

	test('POST validates body (missing fields → 400)', async () => {
		const res = await auth(request(app).post('/contacts')).send({ firstName: 'X' });
		expect(res.status).toBe(400);
	});

	test('full lifecycle: create → patch → delete → 404', async () => {
		const created = await auth(request(app).post('/contacts')).send({
			firstName: 'Lifecycle',
			lastName: 'Test',
			phone: '0611111111'
		});
		expect(created.status).toBe(201);
		const id = created.body._id;

		const patched = await auth(request(app).patch(`/contacts/${id}`)).send({ notes: 'updated' });
		expect(patched.status).toBe(200);
		expect(patched.body.notes).toBe('updated');

		const deleted = await auth(request(app).delete(`/contacts/${id}`));
		expect(deleted.status).toBe(204);

		const after = await auth(request(app).delete(`/contacts/${id}`));
		expect(after.status).toBe(404);
	});

	test('cross-tenant isolation: user B cannot see user A contacts', async () => {
		await auth(request(app).post('/contacts')).send({
			firstName: 'Private',
			lastName: 'A',
			phone: '0622222222'
		});
		const listB = await auth(request(app).get('/contacts'), otherToken);
		expect(listB.status).toBe(200);
		const phones = listB.body.map((c) => c.phone);
		expect(phones).not.toContain('0622222222');
	});

	test('cross-tenant isolation: user B cannot patch user A contact', async () => {
		const created = await auth(request(app).post('/contacts')).send({
			firstName: 'OnlyMine',
			lastName: 'A',
			phone: '0633333333'
		});
		const id = created.body._id;
		const patch = await auth(request(app).patch(`/contacts/${id}`), otherToken).send({
			firstName: 'Hacked'
		});
		expect(patch.status).toBe(404);
	});
});
