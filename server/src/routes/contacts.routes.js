import express from 'express';
import Joi from 'joi';
import { Contact } from '../models/Contact.js';

const router = express.Router();

const contactSchema = Joi.object({
	firstName: Joi.string().trim().required(),
	lastName: Joi.string().trim().required(),
	phone: Joi.string().trim().min(10).max(20).required(),
	email: Joi.string().email().trim().optional(),
	notes: Joi.string().trim().optional()
});

/**
 * @openapi
 * components:
 *   schemas:
 *     Contact:
 *       type: object
 *       required: [firstName, lastName, phone]
 *       properties:
 *         firstName:
 *           type: string
 *         lastName:
 *           type: string
 *         phone:
 *           type: string
 *           minLength: 10
 *           maxLength: 20
 *         email:
 *           type: string
 *         notes:
 *           type: string
 */
/**
 * @openapi
 * /contacts:
 *   get:
 *     summary: Get my contacts
 *     responses:
 *       200:
 *         description: List of contacts
 */
router.get('/', async (req, res) => {
	const contacts = await Contact.find({ ownerId: req.user.userId }).sort({ createdAt: -1 });
	return res.json(contacts);
});

/**
 * @openapi
 * /contacts:
 *   post:
 *     summary: Create a contact
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Contact'
 *     responses:
 *       201:
 *         description: Created
 */
router.post('/', async (req, res) => {
	const { error, value } = contactSchema.validate(req.body);
	if (error) return res.status(400).json({ error: error.message });
	const contact = await Contact.create({ ...value, ownerId: req.user.userId });
	return res.status(201).json(contact);
});

/**
 * @openapi
 * /contacts/{id}:
 *   patch:
 *     summary: Update a contact partially
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Updated
 *       404:
 *         description: Not found
 */
router.patch('/:id', async (req, res) => {
	const updateSchema = contactSchema.fork(['firstName', 'lastName', 'phone'], (s) => s.optional());
	const { error, value } = updateSchema.validate(req.body);
	if (error) return res.status(400).json({ error: error.message });
	const contact = await Contact.findOneAndUpdate(
		{ _id: req.params.id, ownerId: req.user.userId },
		{ $set: value },
		{ new: true }
	);
	if (!contact) return res.status(404).json({ error: 'Not found' });
	return res.json(contact);
});

/**
 * @openapi
 * /contacts/{id}:
 *   delete:
 *     summary: Delete a contact
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Deleted
 *       404:
 *         description: Not found
 */
router.delete('/:id', async (req, res) => {
	const result = await Contact.findOneAndDelete({ _id: req.params.id, ownerId: req.user.userId });
	if (!result) return res.status(404).json({ error: 'Not found' });
	return res.status(204).send();
});

export default router; 