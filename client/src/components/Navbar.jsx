import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Button from './ui/Button.jsx';

export default function Navbar() {
	const { isAuthenticated, logout } = useAuth();
	return (
		<div className="navbar">
			<div className="container navbar-inner">
				<div className="brand">MyContacts</div>
				<Link to="/">Contacts</Link>
				<div className="nav-spacer" />
				{!isAuthenticated && <Link to="/login">Login</Link>}
				{!isAuthenticated && <Link to="/register">Register</Link>}
				{isAuthenticated && <Button onClick={logout}>Logout</Button>}
			</div>
		</div>
	);
}
