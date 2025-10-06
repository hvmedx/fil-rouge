# Server – MyContacts API
 
## Dev notes
- If `MONGODB_URI` is not set, the API will automatically start an in-memory MongoDB instance (mongodb-memory-server) for local development.
- For production, set `MONGODB_URI` and a strong `JWT_SECRET`. 