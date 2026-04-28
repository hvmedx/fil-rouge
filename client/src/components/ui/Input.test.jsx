import { describe, expect, test } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Input from './Input.jsx';

describe('<Input />', () => {
	test('applies input class', () => {
		render(<Input placeholder="x" />);
		expect(screen.getByPlaceholderText('x')).toHaveClass('input');
	});

	test('forwards arbitrary props (type, value)', () => {
		render(<Input type="password" defaultValue="secret" placeholder="p" />);
		const el = screen.getByPlaceholderText('p');
		expect(el).toHaveAttribute('type', 'password');
		expect(el).toHaveValue('secret');
	});

	test('typing fires onChange', async () => {
		function Wrapper() {
			const [v, setV] = useState('');
			return <Input placeholder="p" value={v} onChange={(e) => setV(e.target.value)} />;
		}
		render(<Wrapper />);
		await userEvent.type(screen.getByPlaceholderText('p'), 'abc');
		expect(screen.getByPlaceholderText('p')).toHaveValue('abc');
	});
});
