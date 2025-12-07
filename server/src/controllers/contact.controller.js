import Joi from 'joi';
import { createContact, deleteContact, listContacts, updateContact } from '../services/contact.service.js';

export const contactSchema = Joi.object({
	firstName: Joi.string().trim().required(),
	lastName: Joi.string().trim().required(),
	phone: Joi.string().trim().min(10).max(20).required(),
	email: Joi.string().email().trim().optional(),
	notes: Joi.string().trim().optional()
});

export async function getContacts(req, res) {
	const contacts = await listContacts(req.user.userId);
	return res.json(contacts);
}

export async function postContact(req, res) {
	const { error, value } = contactSchema.validate(req.body);
	if (error) return res.status(400).json({ error: error.message });
	try {
		const contact = await createContact(req.user.userId, value);
		return res.status(201).json(contact);
	} catch (err) {
		if (err?.code === 11000) return res.status(409).json({ error: 'Contact with same phone already exists' });
		return res.status(500).json({ error: 'Internal error' });
	}
}

export async function patchContact(req, res) {
	const updateSchema = contactSchema.fork(['firstName', 'lastName', 'phone'], (s) => s.optional());
	const { error, value } = updateSchema.validate(req.body);
	if (error) return res.status(400).json({ error: error.message });
	try {
		const contact = await updateContact(req.user.userId, req.params.id, value);
		if (!contact) return res.status(404).json({ error: 'Not found' });
		return res.json(contact);
	} catch (err) {
		if (err?.code === 11000) return res.status(409).json({ error: 'Contact with same phone already exists' });
		return res.status(500).json({ error: 'Internal error' });
	}
}

export async function removeContact(req, res) {
	const result = await deleteContact(req.user.userId, req.params.id);
	if (!result) return res.status(404).json({ error: 'Not found' });
	return res.status(204).send();
}
