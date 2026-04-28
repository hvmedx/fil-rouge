import { describe, expect, test, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider } from '../components/ui/Toast.jsx';
import Contacts from './Contacts.jsx';
import { api } from '../lib/api.js';

vi.mock('../lib/api.js', () => ({
	api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() }
}));

const sampleContacts = [
	{ _id: '1', firstName: 'Alice', lastName: 'Doe', phone: '0600000001' },
	{ _id: '2', firstName: 'Bob', lastName: 'Smith', phone: '0600000002' }
];

function setup() {
	return render(
		<ToastProvider>
			<Contacts />
		</ToastProvider>
	);
}

beforeEach(() => {
	api.get.mockReset();
	api.post.mockReset();
	api.patch.mockReset();
	api.delete.mockReset();
});

describe('<Contacts />', () => {
	test('loads and renders contacts', async () => {
		api.get.mockResolvedValueOnce({ data: sampleContacts });
		setup();
		expect(await screen.findByText('Alice Doe')).toBeInTheDocument();
		expect(screen.getByText('Bob Smith')).toBeInTheDocument();
	});

	test('shows empty state when list is empty', async () => {
		api.get.mockResolvedValueOnce({ data: [] });
		setup();
		expect(await screen.findByText(/No contacts found/i)).toBeInTheDocument();
	});

	test('search filters by name', async () => {
		api.get.mockResolvedValueOnce({ data: sampleContacts });
		setup();
		await screen.findByText('Alice Doe');
		await userEvent.type(screen.getByPlaceholderText('Search'), 'bob');
		expect(screen.queryByText('Alice Doe')).not.toBeInTheDocument();
		expect(screen.getByText('Bob Smith')).toBeInTheDocument();
	});

	test('creates a contact and reloads list', async () => {
		api.get.mockResolvedValueOnce({ data: [] });
		api.post.mockResolvedValueOnce({ data: { _id: '9' } });
		api.get.mockResolvedValueOnce({
			data: [{ _id: '9', firstName: 'New', lastName: 'Guy', phone: '0600000099' }]
		});
		setup();
		await screen.findByText(/No contacts found/i);
		await userEvent.type(screen.getByPlaceholderText('First name'), 'New');
		await userEvent.type(screen.getByPlaceholderText('Last name'), 'Guy');
		await userEvent.type(screen.getByPlaceholderText('Phone'), '0600000099');
		await userEvent.click(screen.getByRole('button', { name: 'Add' }));
		await waitFor(() =>
			expect(api.post).toHaveBeenCalledWith('/contacts', {
				firstName: 'New',
				lastName: 'Guy',
				phone: '0600000099'
			})
		);
		expect(await screen.findByText('New Guy')).toBeInTheDocument();
	});

	test('delete sends DELETE and reloads', async () => {
		api.get.mockResolvedValueOnce({ data: sampleContacts });
		api.delete.mockResolvedValueOnce({});
		api.get.mockResolvedValueOnce({ data: [sampleContacts[1]] });
		setup();
		await screen.findByText('Alice Doe');
		const deleteBtns = screen.getAllByRole('button', { name: 'Delete' });
		await userEvent.click(deleteBtns[0]);
		await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/contacts/1'));
		await waitFor(() => expect(screen.queryByText('Alice Doe')).not.toBeInTheDocument());
	});

	test('surfaces error when create fails', async () => {
		api.get.mockResolvedValueOnce({ data: [] });
		api.post.mockRejectedValueOnce({
			response: { status: 409, data: { error: 'Contact with same phone already exists' } }
		});
		setup();
		await screen.findByText(/No contacts found/i);
		await userEvent.type(screen.getByPlaceholderText('First name'), 'Dup');
		await userEvent.type(screen.getByPlaceholderText('Last name'), 'X');
		await userEvent.type(screen.getByPlaceholderText('Phone'), '0600000001');
		await userEvent.click(screen.getByRole('button', { name: 'Add' }));
		const matches = await screen.findAllByText(/Contact with same phone already exists/i);
		expect(matches.length).toBeGreaterThan(0);
	});
});
