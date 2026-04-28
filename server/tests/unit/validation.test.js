import { loginSchema, registerSchema } from '../../src/controllers/auth.controller.js';
import { contactSchema } from '../../src/controllers/contact.controller.js';

describe('registerSchema', () => {
	test('rejects missing email', () => {
		const { error } = registerSchema.validate({ password: 'Password123' });
		expect(error).toBeDefined();
	});
	test('rejects malformed email', () => {
		const { error } = registerSchema.validate({ email: 'not-an-email', password: 'Password123' });
		expect(error).toBeDefined();
	});
	test('rejects password shorter than 6 chars', () => {
		const { error } = registerSchema.validate({ email: 'a@b.com', password: '12345' });
		expect(error).toBeDefined();
	});
	test('accepts valid input', () => {
		const { error } = registerSchema.validate({ email: 'a@b.com', password: 'Password123' });
		expect(error).toBeUndefined();
	});
});

describe('loginSchema', () => {
	test('rejects missing password', () => {
		const { error } = loginSchema.validate({ email: 'a@b.com' });
		expect(error).toBeDefined();
	});
	test('accepts any non-empty password (no min on login)', () => {
		const { error } = loginSchema.validate({ email: 'a@b.com', password: 'x' });
		expect(error).toBeUndefined();
	});
});

describe('contactSchema', () => {
	test('requires firstName, lastName, phone', () => {
		const { error } = contactSchema.validate({});
		expect(error).toBeDefined();
	});
	test('rejects phone shorter than 10 chars', () => {
		const { error } = contactSchema.validate({ firstName: 'A', lastName: 'B', phone: '123' });
		expect(error).toBeDefined();
	});
	test('rejects phone longer than 20 chars', () => {
		const { error } = contactSchema.validate({
			firstName: 'A',
			lastName: 'B',
			phone: '1'.repeat(21)
		});
		expect(error).toBeDefined();
	});
	test('rejects malformed optional email', () => {
		const { error } = contactSchema.validate({
			firstName: 'A',
			lastName: 'B',
			phone: '0600000000',
			email: 'bad'
		});
		expect(error).toBeDefined();
	});
	test('accepts minimal valid contact', () => {
		const { error } = contactSchema.validate({ firstName: 'A', lastName: 'B', phone: '0600000000' });
		expect(error).toBeUndefined();
	});
});
