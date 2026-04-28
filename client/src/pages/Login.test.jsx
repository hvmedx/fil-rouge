import { describe, expect, test, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext.jsx';
import { ToastProvider } from '../components/ui/Toast.jsx';
import Login from './Login.jsx';
import { api } from '../lib/api.js';

vi.mock('../lib/api.js', () => ({
	api: { post: vi.fn() }
}));

function setup() {
	return render(
		<MemoryRouter>
			<AuthProvider>
				<ToastProvider>
					<Login />
				</ToastProvider>
			</AuthProvider>
		</MemoryRouter>
	);
}

beforeEach(() => {
	api.post.mockReset();
	localStorage.clear();
});

describe('<Login />', () => {
	test('submits credentials and stores token on success', async () => {
		api.post.mockResolvedValueOnce({ data: { token: 'jwt.token.here' } });
		setup();
		await userEvent.type(screen.getByPlaceholderText('you@example.com'), 'a@b.com');
		await userEvent.type(screen.getByPlaceholderText('••••••••'), 'Password123');
		await userEvent.click(screen.getByRole('button', { name: 'Login' }));
		await waitFor(() => {
			expect(api.post).toHaveBeenCalledWith('/auth/login', {
				email: 'a@b.com',
				password: 'Password123'
			});
		});
		await waitFor(() => expect(localStorage.getItem('token')).toBe('jwt.token.here'));
	});

	test('shows server error message on 401', async () => {
		api.post.mockRejectedValueOnce({ response: { status: 401, data: { error: 'Invalid credentials' } } });
		setup();
		await userEvent.type(screen.getByPlaceholderText('you@example.com'), 'a@b.com');
		await userEvent.type(screen.getByPlaceholderText('••••••••'), 'wrong');
		await userEvent.click(screen.getByRole('button', { name: 'Login' }));
		const matches = await screen.findAllByText('Invalid credentials');
		expect(matches.length).toBeGreaterThan(0);
		expect(localStorage.getItem('token')).toBeNull();
	});

	test('falls back to generic message when server provides none', async () => {
		api.post.mockRejectedValueOnce({ response: { status: 500 } });
		setup();
		await userEvent.type(screen.getByPlaceholderText('you@example.com'), 'a@b.com');
		await userEvent.type(screen.getByPlaceholderText('••••••••'), 'x');
		await userEvent.click(screen.getByRole('button', { name: 'Login' }));
		const matches = await screen.findAllByText('Login failed');
		expect(matches.length).toBeGreaterThan(0);
	});
});
