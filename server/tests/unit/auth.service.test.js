import { connect, disconnect } from '../../src/config/db.js';
import { User } from '../../src/models/User.js';
import { loginUser, registerUser } from '../../src/services/auth.service.js';

beforeAll(async () => {
	await connect();
});

afterAll(async () => {
	await disconnect();
});

afterEach(async () => {
	await User.deleteMany({});
});

describe('auth.service (unit)', () => {
	test('registerUser stores hashed password (never plaintext)', async () => {
		const { user } = await registerUser('a@b.com', 'Password123');
		expect(user.passwordHash).toBeDefined();
		expect(user.passwordHash).not.toBe('Password123');
		expect(user.passwordHash.startsWith('$2')).toBe(true);
	});

	test('registerUser rejects duplicate email', async () => {
		await registerUser('dup@b.com', 'Password123');
		const second = await registerUser('dup@b.com', 'Password123');
		expect(second.error).toBe('Email already in use');
	});

	test('loginUser returns token on valid credentials', async () => {
		await registerUser('ok@b.com', 'Password123');
		const { token } = await loginUser('ok@b.com', 'Password123');
		expect(typeof token).toBe('string');
		expect(token.split('.').length).toBe(3);
	});

	test('loginUser rejects unknown email', async () => {
		const res = await loginUser('nope@b.com', 'Password123');
		expect(res.error).toBe('Invalid credentials');
	});

	test('loginUser rejects wrong password', async () => {
		await registerUser('x@b.com', 'Password123');
		const res = await loginUser('x@b.com', 'WrongPass1');
		expect(res.error).toBe('Invalid credentials');
	});
});
