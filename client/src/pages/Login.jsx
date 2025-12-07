import { useState } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import Card from '../components/ui/Card.jsx';
import Input from '../components/ui/Input.jsx';
import Button from '../components/ui/Button.jsx';
import { useToast } from '../components/ui/Toast.jsx';

export default function Login() {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');
	const { login } = useAuth();
	const { pushToast } = useToast();

	async function onSubmit(e) {
		e.preventDefault();
		setError('');
		try {
			const res = await api.post('/auth/login', { email, password });
			login(res.data.token);
			pushToast({ title: 'Logged in' });
		} catch (err) {
			const msg = err.response?.data?.error || 'Login failed';
			setError(msg);
			pushToast({ title: 'Login failed', description: msg, type: 'error' });
		}
	}

	return (
		<Card>
			<form onSubmit={onSubmit} className="grid">
				<h2>Welcome back</h2>
				<label>Email</label>
				<Input placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
				<label>Password</label>
				<Input placeholder="••••••••" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
				<Button variant="primary" type="submit">Login</Button>
				{error && <div style={{ color: 'var(--danger)' }}>{error}</div>}
				<div className="helper">Use the register page if you don’t have an account yet.</div>
			</form>
		</Card>
	);
}
