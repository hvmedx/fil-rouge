# MyContacts – Monorepo

## Structure
- `server/`: API Node/Express + MongoDB
- `client/`: Frontend React (Vite)

## Prérequis
- Node 18+
- Un cluster MongoDB Atlas (optionnel en dev, fallback mémoire)

## Backend
Créez `server/.env` depuis `server/.env.example` et lancez:
```
cd server
npm install
npm run dev
```
- API: `http://localhost:4000`
- Docs Swagger: `http://localhost:4000/docs`

## Frontend
Créez `client/.env` depuis `client/.env.example` (ou laissez le défaut):
```
VITE_API_URL=http://localhost:4000
```
Lancez:
```
cd client
npm install
npm run dev
```
- UI: `http://localhost:5173`

## Endpoints Auth
- POST `/auth/register`
- POST `/auth/login` -> `{ token }`

## Contacts (JWT requis)
- GET `/contacts`
- POST `/contacts`
- PATCH `/contacts/:id`
- DELETE `/contacts/:id` 