import { Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import LoginPage from './pages/Login.jsx';
import RegisterPage from './pages/Register.jsx';
import ContactsPage from './pages/Contacts.jsx';

function isAuthenticated() {
	return Boolean(localStorage.getItem('token'));
}

function PrivateRoute({ children }) {
	return isAuthenticated() ? children : <Navigate to="/login" replace />;
}

function AuthRedirect({ children }) {
	return isAuthenticated() ? <Navigate to="/" replace /> : children;
}

export default function App() {
	const navigate = useNavigate();
	const authed = isAuthenticated();

	function logout() {
		localStorage.removeItem('token');
		navigate('/login');
	}

	return (
		<div style={{ maxWidth: 720, margin: '0 auto', padding: 16 }}>
			<nav style={{ display: 'flex', gap: 12, marginBottom: 24, alignItems: 'center' }}>
				<Link to="/">Contacts</Link>
				{!authed && <Link to="/login">Login</Link>}
				{!authed && <Link to="/register">Register</Link>}
				{authed && (
					<button onClick={logout} style={{ marginLeft: 'auto' }}>Logout</button>
				)}
			</nav>
			<Routes>
				<Route path="/" element={<PrivateRoute><ContactsPage /></PrivateRoute>} />
				<Route path="/login" element={<AuthRedirect><LoginPage /></AuthRedirect>} />
				<Route path="/register" element={<AuthRedirect><RegisterPage /></AuthRedirect>} />
			</Routes>
		</div>
	);
}
