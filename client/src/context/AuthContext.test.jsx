import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext.jsx';

function Probe() {
	const { isAuthenticated, login, logout, token } = useAuth();
	return (
		<div>
			<div data-testid="auth">{isAuthenticated ? 'yes' : 'no'}</div>
			<div data-testid="tok">{token}</div>
			<button onClick={() => login('abc.def.ghi')}>do-login</button>
			<button onClick={logout}>do-logout</button>
		</div>
	);
}

function renderWith(initial = '/') {
	return render(
		<MemoryRouter initialEntries={[initial]}>
			<AuthProvider>
				<Routes>
					<Route path="/" element={<Probe />} />
					<Route path="/login" element={<div>login-page</div>} />
				</Routes>
			</AuthProvider>
		</MemoryRouter>
	);
}

describe('AuthProvider', () => {
	test('hydrates from localStorage', () => {
		localStorage.setItem('token', 'pre-existing');
		renderWith();
		expect(screen.getByTestId('auth')).toHaveTextContent('yes');
		expect(screen.getByTestId('tok')).toHaveTextContent('pre-existing');
	});

	test('login writes token to localStorage and flips isAuthenticated', async () => {
		renderWith();
		expect(screen.getByTestId('auth')).toHaveTextContent('no');
		await userEvent.click(screen.getByText('do-login'));
		expect(screen.getByTestId('auth')).toHaveTextContent('yes');
		expect(localStorage.getItem('token')).toBe('abc.def.ghi');
	});

	test('logout clears token and navigates to /login', async () => {
		localStorage.setItem('token', 'tk');
		renderWith();
		await userEvent.click(screen.getByText('do-logout'));
		expect(localStorage.getItem('token')).toBeNull();
		expect(screen.getByText('login-page')).toBeInTheDocument();
	});

	test('useAuth outside provider throws', () => {
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
		expect(() => render(<Probe />)).toThrow(/AuthProvider/);
		spy.mockRestore();
	});
});
