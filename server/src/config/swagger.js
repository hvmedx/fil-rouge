export const swaggerOptions = {
	definition: {
		openapi: '3.0.0',
		info: {
			title: 'MyContacts API',
			version: '1.0.0',
			description: 'Authentication and Contacts API documentation'
		},
		servers: [
			{ url: process.env.SWAGGER_SERVER_URL || 'http://localhost:4000' }
		],
		components: {
			securitySchemes: {
				bearerAuth: {
					type: 'http',
					scheme: 'bearer',
					bearerFormat: 'JWT'
				}
			}
		},
		security: [{ bearerAuth: [] }]
	},
	apis: ['src/routes/*.js']
};
