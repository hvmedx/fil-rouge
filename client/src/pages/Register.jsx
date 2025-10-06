import { useState } from 'react';
import { api } from '../lib/api.js';
import { useNavigate } from 'react-router-dom';

export default function Register() {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');
	const navigate = useNavigate();

	async function onSubmit(e) {
		e.preventDefault();
		setError('');
		try {
			await api.post('/auth/register', { email, password });
			navigate('/login');
		} catch (err) {
			setError(err.response?.data?.error || 'Registration failed');
		}
	}

	return (
		<form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
			<h2>Register</h2>
			<input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
			<input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
			<button type="submit">Create account</button>
			{error && <div style={{ color: 'red' }}>{error}</div>}
		</form>
	);
}
