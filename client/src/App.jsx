import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/Login.jsx';
import RegisterPage from './pages/Register.jsx';
import ContactsPage from './pages/Contacts.jsx';
import { useAuth } from './context/AuthContext.jsx';
import Navbar from './components/Navbar.jsx';

function PrivateRoute({ children }) {
	const { isAuthenticated } = useAuth();
	return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function AuthRedirect({ children }) {
	const { isAuthenticated } = useAuth();
	return isAuthenticated ? <Navigate to="/" replace /> : children;
}

export default function App() {
	return (
		<div>
			<Navbar />
			<div className="container">
				<Routes>
					<Route path="/" element={<PrivateRoute><ContactsPage /></PrivateRoute>} />
					<Route path="/login" element={<AuthRedirect><LoginPage /></AuthRedirect>} />
					<Route path="/register" element={<AuthRedirect><RegisterPage /></AuthRedirect>} />
				</Routes>
			</div>
		</div>
	);
}
