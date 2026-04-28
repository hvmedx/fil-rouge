import mongoose from 'mongoose';
import { connect, disconnect } from '../../src/config/db.js';
import { Contact } from '../../src/models/Contact.js';
import { createContact, deleteContact, listContacts, updateContact } from '../../src/services/contact.service.js';

beforeAll(async () => {
	await connect();
});

afterAll(async () => {
	await disconnect();
});

afterEach(async () => {
	await Contact.deleteMany({});
});

const ownerA = new mongoose.Types.ObjectId();
const ownerB = new mongoose.Types.ObjectId();

describe('contact.service (unit)', () => {
	test('createContact normalizes phone (strips non-digits)', async () => {
		const c = await createContact(ownerA, { firstName: 'A', lastName: 'B', phone: '(06) 00-11.22 33' });
		expect(c.phoneNormalized).toBe('0600112233');
	});

	test('listContacts is scoped to owner', async () => {
		await createContact(ownerA, { firstName: 'A', lastName: 'A', phone: '0600000001' });
		await createContact(ownerB, { firstName: 'B', lastName: 'B', phone: '0600000002' });
		const a = await listContacts(ownerA);
		expect(a).toHaveLength(1);
		expect(a[0].firstName).toBe('A');
	});

	test('listContacts returns newest first', async () => {
		const first = await createContact(ownerA, { firstName: 'First', lastName: 'X', phone: '0600000001' });
		await new Promise((r) => setTimeout(r, 5));
		const second = await createContact(ownerA, { firstName: 'Second', lastName: 'X', phone: '0600000002' });
		const list = await listContacts(ownerA);
		expect(list[0]._id.toString()).toBe(second._id.toString());
		expect(list[1]._id.toString()).toBe(first._id.toString());
	});

	test('updateContact re-normalizes phone when phone changes', async () => {
		const c = await createContact(ownerA, { firstName: 'A', lastName: 'B', phone: '0600000000' });
		const updated = await updateContact(ownerA, c._id, { phone: '07-11-22-33-44' });
		expect(updated.phoneNormalized).toBe('0711223344');
	});

	test('updateContact returns null for other owner (no cross-tenant write)', async () => {
		const c = await createContact(ownerA, { firstName: 'A', lastName: 'B', phone: '0600000000' });
		const res = await updateContact(ownerB, c._id, { firstName: 'Hacked' });
		expect(res).toBeNull();
	});

	test('deleteContact returns null for other owner', async () => {
		const c = await createContact(ownerA, { firstName: 'A', lastName: 'B', phone: '0600000000' });
		const res = await deleteContact(ownerB, c._id);
		expect(res).toBeNull();
		const stillThere = await listContacts(ownerA);
		expect(stillThere).toHaveLength(1);
	});

	test('duplicate phone for same owner rejected by unique index', async () => {
		await createContact(ownerA, { firstName: 'A', lastName: 'A', phone: '0600000000' });
		await expect(
			createContact(ownerA, { firstName: 'B', lastName: 'B', phone: '06 00 00 00 00' })
		).rejects.toMatchObject({ code: 11000 });
	});
});
