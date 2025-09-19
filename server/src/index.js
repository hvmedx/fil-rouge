import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { connect } from './utils/mongo.js';
import authRouter from './routes/auth.routes.js';
import contactsRouter from './routes/contacts.routes.js';
import { requireAuth } from './middleware/requireAuth.js';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import { swaggerOptions } from './utils/swagger.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (req, res) => {
	return res.json({ status: 'ok' });
});

app.use('/auth', authRouter);
app.use('/contacts', requireAuth, contactsRouter);

const specs = swaggerJsdoc(swaggerOptions);
app.use('/docs', swaggerUi.serve, swaggerUi.setup(specs));

const PORT = process.env.PORT || 4000;

async function start() {
	await connect();
	app.listen(PORT, () => {
		console.log(`API listening on http://localhost:${PORT}`);
		console.log(`Swagger docs at http://localhost:${PORT}/docs`);
	});
}

start().catch((error) => {
	console.error('Failed to start server', error);
	process.exit(1);
}); 