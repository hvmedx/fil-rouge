import express from 'express';
import { getContacts, patchContact, postContact, removeContact } from '../controllers/contact.controller.js';

const router = express.Router();

router.get('/', getContacts);
router.post('/', postContact);
router.patch('/:id', patchContact);
router.delete('/:id', removeContact);

export default router;