import { describe, expect, test, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider, useToast } from './Toast.jsx';

function Trigger({ opts }) {
	const { pushToast } = useToast();
	return <button onClick={() => pushToast(opts)}>fire</button>;
}

describe('Toast', () => {
	test('useToast outside provider throws', () => {
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
		expect(() => render(<Trigger opts={{ title: 'x' }} />)).toThrow(/ToastProvider/);
		spy.mockRestore();
	});

	test('pushToast renders toast with title and description', async () => {
		render(
			<ToastProvider>
				<Trigger opts={{ title: 'Saved', description: 'All good', timeout: 0 }} />
			</ToastProvider>
		);
		await userEvent.click(screen.getByText('fire'));
		expect(screen.getByText('Saved')).toBeInTheDocument();
		expect(screen.getByText('All good')).toBeInTheDocument();
	});

	test('toast auto-dismisses after timeout', async () => {
		render(
			<ToastProvider>
				<Trigger opts={{ title: 'Hi', timeout: 50 }} />
			</ToastProvider>
		);
		await userEvent.click(screen.getByText('fire'));
		expect(screen.getByText('Hi')).toBeInTheDocument();
		await new Promise((r) => setTimeout(r, 120));
		expect(screen.queryByText('Hi')).not.toBeInTheDocument();
	});
});
