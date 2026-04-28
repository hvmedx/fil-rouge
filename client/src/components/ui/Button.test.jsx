import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Button from './Button.jsx';

describe('<Button />', () => {
	test('renders children', () => {
		render(<Button>Click me</Button>);
		expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
	});

	test('default variant has only btn class', () => {
		render(<Button>Hi</Button>);
		const btn = screen.getByRole('button');
		expect(btn).toHaveClass('btn');
		expect(btn).not.toHaveClass('btn-primary');
		expect(btn).not.toHaveClass('btn-danger');
	});

	test('primary variant adds btn-primary', () => {
		render(<Button variant="primary">P</Button>);
		expect(screen.getByRole('button')).toHaveClass('btn-primary');
	});

	test('size sm adds btn-sm', () => {
		render(<Button size="sm">S</Button>);
		expect(screen.getByRole('button')).toHaveClass('btn-sm');
	});

	test('forwards type prop (submit) to native button', () => {
		render(<Button type="submit">Go</Button>);
		expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
	});

	test('onClick handler fires', async () => {
		const onClick = vi.fn();
		render(<Button onClick={onClick}>Tap</Button>);
		await userEvent.click(screen.getByRole('button'));
		expect(onClick).toHaveBeenCalledTimes(1);
	});
});
