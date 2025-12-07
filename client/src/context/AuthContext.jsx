import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
	const navigate = useNavigate();
	const [token, setToken] = useState(() => localStorage.getItem('token') || '');

	useEffect(() => {
		if (token) {
			localStorage.setItem('token', token);
		} else {
			localStorage.removeItem('token');
		}
	}, [token]);

	function login(newToken) {
		setToken(newToken);
		navigate('/');
	}

	function logout() {
		setToken('');
		navigate('/login');
	}

	const value = useMemo(() => ({ token, isAuthenticated: Boolean(token), login, logout }), [token]);
	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
	const ctx = useContext(AuthContext);
	if (!ctx) throw new Error('useAuth must be used within AuthProvider');
	return ctx;
}
