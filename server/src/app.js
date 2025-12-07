import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { corsOptions } from './config/cors.js';
import routes from './routes/index.js';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import { swaggerOptions } from './config/swagger.js';
import { errorHandler } from './middlewares/error.middleware.js';

export function createApp() {
	const app = express();
	app.use(cors(corsOptions));
	app.use(express.json());
	app.use(morgan('dev'));

	app.get('/health', (req, res) => res.json({ status: 'ok' }));

	app.use('/', routes);

	const specs = swaggerJsdoc(swaggerOptions);
	app.use('/docs', swaggerUi.serve, swaggerUi.setup(specs));

	app.use(errorHandler);
	return app;
}
