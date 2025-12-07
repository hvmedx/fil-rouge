import { Contact } from '../models/Contact.js';

function normalizePhone(phone) {
	return String(phone).replace(/\D+/g, '');
}

export async function listContacts(ownerId) {
	return Contact.find({ ownerId }).sort({ createdAt: -1 });
}

export async function createContact(ownerId, data) {
	return Contact.create({ ...data, ownerId, phoneNormalized: normalizePhone(data.phone) });
}

export async function updateContact(ownerId, id, data) {
	const update = { ...data };
	if (data.phone) update.phoneNormalized = normalizePhone(data.phone);
	return Contact.findOneAndUpdate({ _id: id, ownerId }, { $set: update }, { new: true, runValidators: true });
}

export async function deleteContact(ownerId, id) {
	return Contact.findOneAndDelete({ _id: id, ownerId });
}
