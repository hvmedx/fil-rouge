# MyContacts – Monorepo

## Structure
- `server/`: API Node/Express + MongoDB
- `client/`: Frontend React (à venir)

## Prérequis
- Node 18+
- Un cluster MongoDB Atlas

## Configuration
Créez un fichier `server/.env` à partir de `server/.env.example`:

```
PORT=4000
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/<db>?retryWrites=true&w=majority&appName=<app>
JWT_SECRET=supersecretchangeme
SWAGGER_SERVER_URL=http://localhost:4000
```

## Lancer l'API
```
cd server
npm install
npm run dev
```

- API: `http://localhost:4000`
- Docs Swagger: `http://localhost:4000/docs`
- Healthcheck: `http://localhost:4000/health`

## Endpoints Auth
- POST `/auth/register` { email, password }
- POST `/auth/login` { email, password } -> { token }

## Contacts (protégé JWT)
- GET `/contacts`
- POST `/contacts`
- PATCH `/contacts/:id`
- DELETE `/contacts/:id`

## TODO Frontend
- Pages: Login, Register, Contacts (liste + ajout + édition/suppression)
- Intégration avec l'API 