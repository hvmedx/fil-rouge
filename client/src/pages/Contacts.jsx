import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api.js';
import Card from '../components/ui/Card.jsx';
import Input from '../components/ui/Input.jsx';
import Button from '../components/ui/Button.jsx';
import { useToast } from '../components/ui/Toast.jsx';

export default function Contacts() {
	const [contacts, setContacts] = useState([]);
	const [form, setForm] = useState({ firstName: '', lastName: '', phone: '' });
	const [error, setError] = useState('');
	const [query, setQuery] = useState('');
	const [editing, setEditing] = useState({});
	const { pushToast } = useToast();

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
			pushToast({ title: 'Contact added' });
		} catch (err) {
			const msg = err.response?.data?.error || 'Create failed';
			setError(msg);
			pushToast({ title: 'Create failed', description: msg, type: 'error' });
		}
	}

	async function updateContact(id, payload) {
		try {
			await api.patch(`/contacts/${id}`, payload);
			await load();
			pushToast({ title: 'Contact updated' });
		} catch (err) {
			const msg = err.response?.data?.error || 'Update failed';
			setError(msg);
			pushToast({ title: 'Update failed', description: msg, type: 'error' });
		}
	}

	async function deleteContact(id) {
		try {
			await api.delete(`/contacts/${id}`);
			await load();
			pushToast({ title: 'Contact deleted' });
		} catch (err) {
			const msg = err.response?.data?.error || 'Delete failed';
			setError(msg);
			pushToast({ title: 'Delete failed', description: msg, type: 'error' });
		}
	}

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return contacts;
		return contacts.filter((c) =>
			[c.firstName, c.lastName, c.phone].join(' ').toLowerCase().includes(q)
		);
	}, [contacts, query]);

	return (
		<div className="grid">
			<Card>
				<div className="grid">
					<div>
						<h2>My Contacts <span className="badge">{contacts.length}</span></h2>
						<div className="helper">Manage your personal address book.</div>
					</div>
					<div className="row">
						<Input placeholder="Search" value={query} onChange={(e) => setQuery(e.target.value)} />
					</div>
					<div className="separator" />
					<form onSubmit={createContact} className="form-grid">
						<Input placeholder="First name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
						<Input placeholder="Last name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
						<Input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
						<Button variant="primary" type="submit">Add</Button>
					</form>
					{error && <div style={{ color: 'var(--danger)' }}>{error}</div>}
				</div>
			</Card>
			{filtered.length === 0 ? (
				<Card>
					<div className="helper">No contacts found. Add one using the form above.</div>
				</Card>
			) : (
				<ul className="list list-grid">
					{filtered.map((c) => (
						<li key={c._id} className="item">
							<div style={{ flex: 1 }}>
								<div style={{ fontWeight: 600 }}>{c.firstName} {c.lastName}</div>
								<div className="row">
									<Input
										style={{ maxWidth: 220 }}
										value={editing[c._id]?.phone ?? c.phone}
										onChange={(e) => setEditing({ ...editing, [c._id]: { phone: e.target.value } })}
									/>
									<Button size="sm" onClick={() => updateContact(c._id, { phone: editing[c._id]?.phone ?? c.phone })}>Save</Button>
									<Button size="sm" variant="ghost" onClick={() => deleteContact(c._id)}>Delete</Button>
								</div>
							</div>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
