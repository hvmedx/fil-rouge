export default function Button({ children, variant = 'default', size = 'md', className = '', ...props }) {
	const cls = ['btn'];
	if (variant === 'primary') cls.push('btn-primary');
	if (variant === 'danger') cls.push('btn-danger');
	if (variant === 'ghost') cls.push('btn-ghost');
	if (size === 'sm') cls.push('btn-sm');
	return (
		<button className={[...cls, className].join(' ')} {...props}>{children}</button>
	);
}
