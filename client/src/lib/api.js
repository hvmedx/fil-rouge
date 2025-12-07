import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

let getToken = () => localStorage.getItem('token');
let onUnauthorized = null;

export function configureAuth({ getTokenFn, onUnauthorizedFn }) {
	if (getTokenFn) getToken = getTokenFn;
	if (onUnauthorizedFn) onUnauthorized = onUnauthorizedFn;
}

export const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
	const token = getToken?.();
	if (token) {
		config.headers.Authorization = `Bearer ${token}`;
	}
	return config;
});

api.interceptors.response.use(
	(res) => res,
	(err) => {
		if (err?.response?.status === 401 && onUnauthorized) {
			onUnauthorized();
		}
		return Promise.reject(err);
	}
);
