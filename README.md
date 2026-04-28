# MyContacts — Projet Fil Rouge CICD

Monorepo : API Node + frontend React + landing + stack DevOps locale (Jenkins + SonarQube).

## Démarrage rapide (tout en local, 100 % Docker)

```bash
# 1. Stack DevOps : Jenkins + SonarQube + Mongo
./scripts/devops-up.sh

# 2. Construire et lancer les 3 apps
./scripts/apps-up.sh
```

| Service        | URL                             |
| -------------- | ------------------------------- |
| Jenkins        | http://localhost:8090           |
| SonarQube      | http://localhost:9000           |
| Landing        | http://localhost:3002           |
| Web (SPA)      | http://localhost:3001           |
| API health     | http://localhost:4000/health    |
| API Swagger    | http://localhost:4000/docs      |

## Documentation

- **[DEVOPS-GUIDE.md](DEVOPS-GUIDE.md)** ← guide complet : concepts, topologie, configuration Jenkins/Sonar/DockerHub, webhook ngrok, mapping checklists, dépannage. **Lis-le en premier.**
- **[INFRA.md](INFRA.md)** : variante Azure VMs (alternative au local)
- **[SUPPLY-CHAIN.md](SUPPLY-CHAIN.md)** : checklist conteneurisation + DockerHub
- **[server/tests/README.md](server/tests/README.md)** : tests backend (Jest, 49 tests)
- **[client/TESTS.md](client/TESTS.md)** : tests frontend (Vitest + RTL, 32 tests)

## Structure

```
fil-rouge/
├── server/        # API Express + Mongo + tests Jest + Dockerfile + Jenkinsfile
├── client/        # SPA React + Vite + tests Vitest + Dockerfile + Jenkinsfile
├── landing/       # Page statique nginx + Dockerfile + Jenkinsfile
├── devops/        # Stack Jenkins + SonarQube (docker-compose)
│   ├── jenkins/   # Dockerfile Jenkins + plugins.txt + casc.yaml
│   ├── docker-compose.yml
│   └── Jenkinsfile.helloworld
├── scripts/       # devops-up/down.sh + apps-up/down.sh
├── deploy/        # Configs nginx / systemd pour déploiement VM (Azure)
├── docker-compose.yml          # stack apps (alternative à apps-up.sh)
├── DEVOPS-GUIDE.md             # guide pédagogique complet
├── INFRA.md
└── SUPPLY-CHAIN.md
```

## Tests

```bash
cd server && npm test          # 49 tests, 10 suites
cd client && npm test          # 32 tests, 8 suites
```

## Endpoints API

| Method | Route                  | Auth | Description           |
| ------ | ---------------------- | ---- | --------------------- |
| POST   | `/auth/register`       | -    | Crée un compte        |
| POST   | `/auth/login`          | -    | Retourne un JWT       |
| GET    | `/contacts`            | JWT  | Liste tes contacts    |
| POST   | `/contacts`            | JWT  | Ajoute un contact     |
| PATCH  | `/contacts/:id`        | JWT  | Met à jour            |
| DELETE | `/contacts/:id`        | JWT  | Supprime              |
| GET    | `/health`              | -    | `{"status":"ok"}`     |
| GET    | `/docs`                | -    | Swagger UI            |
