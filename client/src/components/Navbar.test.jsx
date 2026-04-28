import { describe, expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext.jsx';
import Navbar from './Navbar.jsx';

function renderNavbar() {
	return render(
		<MemoryRouter>
			<AuthProvider>
				<Navbar />
			</AuthProvider>
		</MemoryRouter>
	);
}

describe('<Navbar />', () => {
	test('shows Login + Register links when unauthenticated', () => {
		renderNavbar();
		expect(screen.getByText('Login')).toBeInTheDocument();
		expect(screen.getByText('Register')).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Logout' })).not.toBeInTheDocument();
	});

	test('shows Logout when authenticated', () => {
		localStorage.setItem('token', 'tk');
		renderNavbar();
		expect(screen.getByRole('button', { name: 'Logout' })).toBeInTheDocument();
		expect(screen.queryByText('Login')).not.toBeInTheDocument();
	});

	test('clicking Logout clears token', async () => {
		localStorage.setItem('token', 'tk');
		renderNavbar();
		await userEvent.click(screen.getByRole('button', { name: 'Logout' }));
		expect(localStorage.getItem('token')).toBeNull();
	});
});
