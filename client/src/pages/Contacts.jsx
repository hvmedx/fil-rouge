import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

export default function Contacts() {
	const [contacts, setContacts] = useState([]);
	const [form, setForm] = useState({ firstName: '', lastName: '', phone: '' });
	const [error, setError] = useState('');

	async function load() {
		const res = await api.get('/contacts');
		setContacts(res.data);
	}

	useEffect(() => {
		load().catch((e) => setError(e.response?.data?.error || 'Failed to load'));
	}, []);

	async function createContact(e) {
		e.preventDefault();
		setError('');
		try {
			await api.post('/contacts', form);
			setForm({ firstName: '', lastName: '', phone: '' });
			await load();
		} catch (err) {
			setError(err.response?.data?.error || 'Create failed');
		}
	}

	async function updateContact(id, payload) {
		try {
			await api.patch(`/contacts/${id}`, payload);
			await load();
		} catch (err) {
			setError(err.response?.data?.error || 'Update failed');
		}
	}

	async function deleteContact(id) {
		try {
			await api.delete(`/contacts/${id}`);
			await load();
		} catch (err) {
			setError(err.response?.data?.error || 'Delete failed');
		}
	}

	return (
		<div style={{ display: 'grid', gap: 16 }}>
			<h2>My Contacts</h2>
			<form onSubmit={createContact} style={{ display: 'flex', gap: 8 }}>
				<input placeholder="First name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
				<input placeholder="Last name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
				<input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
				<button type="submit">Add</button>
			</form>
			{error && <div style={{ color: 'red' }}>{error}</div>}
			<ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 8 }}>
				{contacts.map((c) => (
					<li key={c._id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
						<span style={{ flex: 1 }}>{c.firstName} {c.lastName} — {c.phone}</span>
						<button onClick={() => updateContact(c._id, { notes: 'Edited' })}>Edit</button>
						<button onClick={() => deleteContact(c._id)}>Delete</button>
					</li>
				))}
			</ul>
		</div>
	);
}
