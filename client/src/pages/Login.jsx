import { useState } from 'react';
import { api } from '../lib/api.js';
import { useNavigate } from 'react-router-dom';

export default function Login() {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');
	const navigate = useNavigate();

	async function onSubmit(e) {
		e.preventDefault();
		setError('');
		try {
			const res = await api.post('/auth/login', { email, password });
			localStorage.setItem('token', res.data.token);
			navigate('/');
		} catch (err) {
			setError(err.response?.data?.error || 'Login failed');
		}
	}

	return (
		<form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
			<h2>Login</h2>
			<input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
			<input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
			<button type="submit">Login</button>
			{error && <div style={{ color: 'red' }}>{error}</div>}
		</form>
	);
}
