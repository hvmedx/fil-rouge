import { useState } from 'react';
import { api } from '../lib/api.js';
import { Link, useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card.jsx';
import Input from '../components/ui/Input.jsx';
import Button from '../components/ui/Button.jsx';
import { useToast } from '../components/ui/Toast.jsx';

export default function Register() {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');
	const navigate = useNavigate();
	const { pushToast } = useToast();

	async function onSubmit(e) {
		e.preventDefault();
		setError('');
		try {
			await api.post('/auth/register', { email, password });
			pushToast({ title: 'Account created' });
			navigate('/login');
		} catch (err) {
			const msg = err.response?.data?.error || (err.response?.status === 409 ? 'Email already in use' : 'Registration failed');
			setError(msg);
			pushToast({ title: 'Registration failed', description: msg, type: 'error' });
		}
	}

	return (
		<Card>
			<form onSubmit={onSubmit} className="grid">
				<h2>Create your account</h2>
				<label>Email</label>
				<Input placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
				<label>Password</label>
				<Input placeholder="••••••••" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
				<Button variant="primary" type="submit">Register</Button>
				{error && <div style={{ color: 'var(--danger)' }}>{error}</div>}
				<div className="helper">Already have an account? <Link to="/login">Login</Link></div>
			</form>
		</Card>
	);
}
