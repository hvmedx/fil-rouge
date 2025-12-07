import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './index.css';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { configureAuth } from './lib/api.js';
import { ToastProvider } from './components/ui/Toast.jsx';

function ApiConfigurator({ children }) {
	const { token, logout } = useAuth();
	configureAuth({ getTokenFn: () => token, onUnauthorizedFn: logout });
	return children;
}

createRoot(document.getElementById('root')).render(
	<React.StrictMode>
		<BrowserRouter>
			<AuthProvider>
				<ApiConfigurator>
					<ToastProvider>
						<App />
					</ToastProvider>
				</ApiConfigurator>
			</AuthProvider>
		</BrowserRouter>
	</React.StrictMode>
);
