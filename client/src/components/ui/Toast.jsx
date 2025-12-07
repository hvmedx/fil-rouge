import { createContext, useContext, useMemo, useState } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
	const [toasts, setToasts] = useState([]);

	function pushToast({ title, description, type = 'info', timeout = 3000 }) {
		const id = Math.random().toString(36).slice(2);
		setToasts((t) => [...t, { id, title, description, type }]);
		if (timeout) setTimeout(() => dismissToast(id), timeout);
	}
	function dismissToast(id) {
		setToasts((t) => t.filter((x) => x.id !== id));
	}

	const value = useMemo(() => ({ pushToast, dismissToast }), []);

	return (
		<ToastContext.Provider value={value}>
			{children}
			<div style={{ position: 'fixed', right: 16, bottom: 16, display: 'grid', gap: 8, zIndex: 50 }}>
				{toasts.map((t) => (
					<div key={t.id} className="card" style={{ borderColor: t.type === 'error' ? 'var(--danger)' : 'var(--muted)' }}>
						<div className="card-body">
							<div style={{ fontWeight: 600 }}>{t.title}</div>
							{t.description && <div className="helper">{t.description}</div>}
						</div>
					</div>
				))}
			</div>
		</ToastContext.Provider>
	);
}

export function useToast() {
	const ctx = useContext(ToastContext);
	if (!ctx) throw new Error('useToast must be used within ToastProvider');
	return ctx;
}
