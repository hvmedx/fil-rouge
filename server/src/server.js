import 'dotenv/config';
import { createApp } from './app.js';
import { connect } from './config/db.js';

const PORT = process.env.PORT || 4000;

async function start() {
	await connect();
	const app = createApp();
	app.listen(PORT, () => {
		console.log(`API listening on http://localhost:${PORT}`);
		console.log(`Swagger docs at http://localhost:${PORT}/docs`);
	});
}

start().catch((err) => {
	console.error('Failed to start server', err);
	process.exit(1);
});
