import mongoose from 'mongoose';

let memoryServer = null;

export async function connect() {
	let mongoUri = process.env.MONGODB_URI;
	mongoose.set('strictQuery', true);
	if (!mongoUri) {
		const { MongoMemoryServer } = await import('mongodb-memory-server');
		memoryServer = await MongoMemoryServer.create();
		mongoUri = memoryServer.getUri();
		console.log('Using in-memory MongoDB instance');
	}
	await mongoose.connect(mongoUri, { autoIndex: true });
	console.log('Connected to MongoDB');
}

export async function disconnect() {
	await mongoose.disconnect();
	if (memoryServer) {
		await memoryServer.stop();
		memoryServer = null;
	}
}
