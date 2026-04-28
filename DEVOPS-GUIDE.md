# Projet Fil Rouge CICD — Guide DevOps complet

**Public** : toi qui découvres le DevOps. Aucune connaissance préalable supposée.
**Objectif** : tu lis ce doc, tu comprends *pourquoi* chaque pièce existe et *comment* elle parle aux autres, et tu peux reproduire ou modifier la stack sans magie noire.

---

## Table des matières

1. [Le problème que ça résout](#1-le-problème-que-ça-résout)
2. [Concepts fondamentaux](#2-concepts-fondamentaux)
3. [Vue d'ensemble de la stack](#3-vue-densemble-de-la-stack)
4. [Topologie des conteneurs](#4-topologie-des-conteneurs)
5. [Le flux complet (push → prod)](#5-le-flux-complet-push--prod)
6. [Démarrer la stack](#6-démarrer-la-stack)
7. [Configuration Jenkins post-install](#7-configuration-jenkins-post-install)
8. [Configuration SonarQube](#8-configuration-sonarqube)
9. [DockerHub : compte + credentials](#9-dockerhub--compte--credentials)
10. [Webhook GitLab/GitHub + ngrok](#10-webhook-gitlabgithub--ngrok)
11. [Anatomie d'un Jenkinsfile](#11-anatomie-dun-jenkinsfile)
12. [Mapping des checklists](#12-mapping-des-checklists)
13. [Réponses aux questions « A quoi sert X ? »](#13-réponses-aux-questions--a-quoi-sert-x-)
14. [Dépannage](#14-dépannage)
15. [Couper la stack proprement](#15-couper-la-stack-proprement)

---

## 1 · Le problème que ça résout

Sans CI/CD :
1. Tu modifies du code
2. Tu fais tourner les tests à la main (parfois)
3. Tu connectes en SSH au serveur
4. Tu fais `git pull`, `npm install`, redémarres le service
5. Trois jours plus tard tu te rends compte qu'un test était cassé en local et que prod est down

Avec CI/CD :
1. Tu fais `git push`
2. Une machine (Jenkins) reçoit l'événement, tourne **toujours les mêmes étapes** (install, lint, test, build, scan, deploy)
3. Si tout passe → l'image Docker est publiée + le conteneur est redéployé
4. Si quoi que ce soit casse → la pipeline s'arrête en rouge, prod n'est pas touchée

**CI** = *Continuous Integration* = vérifier en continu que le code reste intégrable (lint, test, scan).
**CD** = *Continuous Delivery* (livrer une image prête) ou *Continuous Deployment* (la déployer pour de vrai). On fait les deux.

---

## 2 · Concepts fondamentaux

### Docker
Docker permet de prendre une appli + ses dépendances + son OS minimal et d'en faire un **paquet figé** appelé une **image**. Quand tu lances cette image, ça produit un **conteneur** : un processus isolé du reste du système.

- **Image** = une recette gelée. Lecture seule. Identifiée par un nom + un tag (`mycontacts-api:42`).
- **Conteneur** = une instance qui tourne, fabriquée à partir d'une image.
- **Dockerfile** = la recette qui décrit comment construire l'image (`FROM`, `COPY`, `RUN`, `CMD`).
- **Registry** = un serveur qui stocke des images. **DockerHub** est le registry public le plus connu.

Une image Docker contient :
- Une base (`node:20-alpine`, `nginx:1.27-alpine`, `mongo:7`...)
- Tes fichiers source / artefacts
- Une commande de démarrage (`CMD`)
- Pas de noyau Linux : le conteneur partage celui de l'hôte. C'est pour ça qu'un conteneur démarre en quelques secondes là où une VM met une minute.

### Conteneur vs VM
- **VM** : émule une machine entière (CPU, mémoire, disque, OS, kernel). Lourde. Démarre en ~1 min.
- **Conteneur** : emballe un process. Démarre en ~1 s. Partage le kernel hôte.

Pour ce projet on remplace les VMs Azure par des conteneurs locaux : c'est plus rapide, gratuit, et la logique CI/CD reste identique.

### Docker network
Quand plusieurs conteneurs doivent se parler, on les met sur le **même réseau Docker**. Sur ce réseau, le **nom du conteneur** suffit comme nom DNS.

Exemple : sur le réseau `devops`, l'API se connecte à Mongo via `mongodb://mongo:27017` (pas de IP en dur, pas de port exposé sur l'hôte).

Quand un conteneur doit être joignable depuis ton navigateur, on **expose un port** : `-p 4000:4000` veut dire « le port 4000 du conteneur est mappé sur le port 4000 de l'hôte ».

### Jenkins
Jenkins est un automatiseur. Tu lui donnes une recette (un **Jenkinsfile** versionné dans Git) et il l'exécute à chaque événement (push, manuel, planifié).

Vocabulaire :
- **Pipeline** = un Jenkinsfile et son histoire d'exécutions.
- **Job** / **Item** = la définition côté UI Jenkins qui pointe vers un Jenkinsfile (URL repo + chemin du fichier).
- **Stage** = une étape (Checkout, Test, Build, Deploy…). Affichée dans la vue "Stage View".
- **Step** = une instruction dans un stage (`sh 'npm ci'`, `checkout scm`).
- **Agent** = la machine qui exécute la pipeline. Ici tout tourne sur l'agent intégré "any" du contrôleur, qui parle au daemon Docker de l'hôte.
- **Credential** = un secret stocké dans Jenkins, référencé par un ID (mot de passe DockerHub, token Sonar…). Ne **jamais** mettre un secret en clair dans un Jenkinsfile.

### SonarQube
Outil d'analyse statique. Il scanne ton code (sans le faire tourner) et trouve :
- Bugs probables
- Code smells
- Failles de sécurité (XSS, SQLi, auth faible…)
- Couverture de tests (à partir d'un rapport `lcov.info`)

Il rejoue ces analyses à chaque build et stocke l'historique → tu vois la dette qui monte/descend dans le temps.

### CI/CD
Une pipeline classique a la forme :
```
Checkout → Install → Lint → Test → Coverage → Sonar → Build image → Push registry → Deploy → Smoke
```
Si une étape échoue, tout s'arrête. Le but est qu'aucun code rouge n'arrive jamais en prod.

---

## 3 · Vue d'ensemble de la stack

Trois couches, toutes en local sur ta machine :

```
┌─────────────────────────────────────────────────────────────────┐
│  Couche 1 — Outils DevOps (devops/docker-compose.yml)           │
│  ┌─────────┐  ┌───────────┐  ┌─────────┐  ┌──────────┐          │
│  │ Jenkins │  │ SonarQube │  │ sonar-db│  │  Mongo   │          │
│  │  :8090  │  │   :9000   │  │  PG:16  │  │  :27017  │          │
│  └─────────┘  └───────────┘  └─────────┘  └──────────┘          │
├─────────────────────────────────────────────────────────────────┤
│  Couche 2 — Applications (déployées par les pipelines)          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────┐ │
│  │ mycontacts-api   │  │ mycontacts-web   │  │mycontacts-     │ │
│  │ Express :4000    │  │ React+nginx :3001│  │landing  :3002  │ │
│  └──────────────────┘  └──────────────────┘  └────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  Couche 3 — Réseau Docker "devops" (lie tout ensemble)          │
└─────────────────────────────────────────────────────────────────┘
```

**Particularité importante** : Jenkins déploie les applis **sur le même hôte** que lui, en parlant au daemon Docker de l'hôte (socket Unix `/var/run/docker.sock` monté dans le conteneur Jenkins). Pas de SSH, pas de Azure, pas de cloud.

---

## 4 · Topologie des conteneurs

Tous les conteneurs ci-dessous sont sur le réseau Docker `devops`.

| Conteneur            | Image                          | Rôle                                    | Port hôte | Port interne |
| -------------------- | ------------------------------ | --------------------------------------- | --------- | ------------ |
| `jenkins`            | `mycontacts/jenkins:lts` (custom) | Orchestrateur CI/CD                  | 8090      | 8080         |
| `sonarqube`          | `sonarqube:10-community`       | Analyse statique                        | 9000      | 9000         |
| `sonar-db`           | `postgres:16-alpine`           | Base de SonarQube                       | -         | 5432         |
| `mongo`              | `mongo:7`                      | Base de l'API                           | -         | 27017        |
| `mycontacts-api`     | `mycontacts-api:<build>`       | Backend Express                         | 4000      | 4000         |
| `mycontacts-web`     | `mycontacts-web:<build>`       | Frontend SPA (servi par nginx)          | 3001      | 80           |
| `mycontacts-landing` | `mycontacts-landing:<build>`   | Page de présentation statique           | 3002      | 80           |

**Pourquoi `mongo` n'a pas de port exposé sur l'hôte ?** Parce qu'aucun client extérieur n'a besoin de l'atteindre. L'API la trouve via `mongodb://mongo:27017` sur le réseau Docker. Moins de surface d'attaque.

**Pourquoi `web` est sur `3001` et pas `80` ?** Pour ne pas entrer en conflit avec `landing` (3002) et avec d'autres services que tu pourrais avoir sur la machine. En production tu mettrais un reverse proxy nginx en frontal et tu redirigerais `mycontacts.example/` vers le conteneur web.

---

## 5 · Le flux complet (push → prod)

Ce diagramme suit un changement de code de A à Z :

```
┌──────────────────┐    git push      ┌──────────────────┐
│   Ton laptop     │ ───────────────► │  Repo GitLab/GH  │
└──────────────────┘                  └────────┬─────────┘
                                               │ webhook (POST)
                                               ▼
                          ┌────────────────────────────────────────┐
                          │  Jenkins (http://localhost:8090)       │
                          │  ┌──────────────────────────────────┐  │
                          │  │ 1. Checkout (clone + branche)    │  │
                          │  │ 2. Install (npm ci)              │  │
                          │  │ 3. Lint                          │  │
                          │  │ 4. Test (Jest / Vitest)          │  │
                          │  │ 5. Coverage (lcov)               │  │
                          │  │ 6. SonarQube ─────────► Sonar    │  │
                          │  │ 7. Build image (docker build)    │  │
                          │  │ 8. Scan image (Trivy)            │  │
                          │  │ 9. Push DockerHub ─────► Hub     │  │
                          │  │ 10. docker rm + run sur 'devops' │  │
                          │  │ 11. Smoke test (curl /health)    │  │
                          │  └──────────────────────────────────┘  │
                          └─────────────────┬──────────────────────┘
                                            │ docker run --network devops
                                            ▼
                                  ┌────────────────────┐
                                  │  Conteneur applicatif│
                                  │  (api / web / landing)│
                                  └────────────────────┘
```

Étape par étape, ce que chaque numéro veut dire :

1. **Checkout** : Jenkins clone ton repo dans son workspace (`/var/jenkins_home/workspace/<job>/`).
2. **Install** : `npm ci` lit `package-lock.json` et installe les versions exactes — pas de surprise entre laptop et CI.
3. **Lint** : ESLint signale les erreurs syntaxiques / conventions. Pour l'instant en mode warning (`|| true`), à durcir.
4. **Test** : Jest (backend) ou Vitest (frontend). Si un test casse → la pipeline s'arrête.
5. **Coverage** : génère un fichier `coverage/lcov.info` qui dit ligne par ligne ce qui a été exécuté pendant les tests.
6. **SonarQube** : `sonar-scanner` envoie le code + le lcov à `http://sonarqube:9000`. Sonar calcule les bugs, smells, failles, couverture. Le bloc `withSonarQubeEnv('sonarqube')` injecte les variables `$SONAR_HOST_URL` et `$SONAR_AUTH_TOKEN`.
7. **Build image** : `docker build` lit le `Dockerfile`, fabrique l'image et la tague `<DOCKERHUB_USER>/mycontacts-api:42` + `:latest`. Comme Jenkins partage le socket Docker de l'hôte, l'image apparaît dans `docker images` sur ta machine immédiatement.
8. **Scan image** : Trivy lit l'image et liste les CVE par paquet OS et npm. En mode `--exit-code 0` pour ne pas bloquer ; passer à `1` quand la base est propre.
9. **Push DockerHub** : `docker login` puis `docker push`. C'est ce qui rend l'image **récupérable depuis n'importe où** — pour rollback, pour un autre dev, pour un futur déploiement Kubernetes.
10. **Deploy** : `docker rm -f` l'ancien conteneur, `docker run -d` le nouveau, sur le réseau `devops`. C'est la même commande que tu lancerais à la main.
11. **Smoke** : `curl /health` (ou `/`) plusieurs fois jusqu'à HTTP 200. Détecte les déploiements zombies.

---

## 6 · Démarrer la stack

Pré-requis : Docker installé et fonctionnel (`docker info` répond).

```bash
cd ~/fil-rouge

# 1. Démarrer Jenkins + SonarQube + sonar-db + Mongo (couche 1)
./scripts/devops-up.sh

# 2. (optionnel) Construire et lancer les apps directement (couche 2)
./scripts/apps-up.sh
```

À la fin tu dois voir :
- http://localhost:8090 — Jenkins
- http://localhost:9000 — SonarQube
- http://localhost:3001 — Web (SPA)
- http://localhost:3002 — Landing
- http://localhost:4000/health — API

`scripts/apps-up.sh` réplique manuellement ce que la pipeline Jenkins fera ensuite. Une fois que tu as vérifié que ça marche, tu peux laisser Jenkins gérer.

---

## 7 · Configuration Jenkins post-install

Quand tu ouvres http://localhost:8090 la première fois :

### 7.1 Login
Identifiants par défaut (définis dans `devops/docker-compose.yml`) :
- user : `admin`
- pass : `admin`

**Change le mot de passe immédiatement** : avatar haut-droit → Configure → Password.

### 7.2 Vérifier que la pipeline « hello world » marche

Item → New Item → name `hello-world` → "Pipeline" → OK.
Dans la définition :
- Definition : "Pipeline script from SCM"
- SCM : Git
- Repository URL : `https://gitlab.com/hamedbenarous00/fil-rouge.git`
- Branch : `*/main`
- Script Path : `devops/Jenkinsfile.helloworld`

Save → "Build Now". Tu dois voir 4 stages verts. Si oui, Jenkins parle bien à Docker.

### 7.3 Créer les jobs des apps

Pour chaque app (landing, api, web), même procédure que ci-dessus mais :

| Job                | Script Path           |
| ------------------ | --------------------- |
| `mycontacts-landing` | `landing/Jenkinsfile` |
| `mycontacts-api`     | `server/Jenkinsfile`  |
| `mycontacts-web`     | `client/Jenkinsfile`  |

Avant de "Build Now" sur un de ces jobs, il faut configurer les credentials (§9).

### 7.4 Multibranch (optionnel, plus pro)

Au lieu d'un Pipeline simple, choisir "Multibranch Pipeline" :
- Branch sources : Git → URL du repo
- Build Configuration → Script Path : `server/Jenkinsfile` (ou autre)

Avantage : Jenkins découvre automatiquement chaque branche/PR et tourne la pipeline dessus. Le `when { branch 'main' }` dans les Jenkinsfile devient utile.

---

## 8 · Configuration SonarQube

À la première ouverture de http://localhost:9000 :

1. Login `admin` / `admin` → Sonar te force à changer le mot de passe.
2. **Générer un token** :
   - Avatar haut-droit → My Account → Security
   - Generate Token → name `jenkins`, type "Global Analysis Token"
   - **Copie le token** (il ne sera plus jamais visible)
3. **Créer le credential côté Jenkins** :
   - Manage Jenkins → Credentials → System → Global → Add Credentials
   - Kind : Secret text
   - Secret : le token Sonar
   - ID : `sonar-token` (exactement)
   - OK

Le `casc.yaml` de Jenkins déclare déjà un serveur SonarQube nommé `sonarqube` qui pointe vers `http://sonarqube:9000`. Donc dès que le credential `sonar-token` existe, le bloc `withSonarQubeEnv('sonarqube')` dans les Jenkinsfile fonctionne.

### Voir les résultats

Après le premier build :
- http://localhost:9000/projects → tu vois `mycontacts-api` et `mycontacts-web`
- Clique → Issues, Coverage, Duplications, Security Hotspots…

---

## 9 · DockerHub : compte + credentials

### 9.1 Créer le compte
1. https://hub.docker.com → Sign Up
2. Note ton login (ex: `hbenarous00`)
3. Account Settings → Security → New Access Token
   - Description : `jenkins`
   - Permissions : Read, Write, Delete
   - **Copie le token** (visible une fois)

### 9.2 Côté Jenkins
Manage Jenkins → Credentials → System → Global → Add Credentials, deux fois :

| ID                | Type                  | Username       | Password / Secret    |
| ----------------- | --------------------- | -------------- | -------------------- |
| `dockerhub-user`  | Secret text           | -              | `<ton login>`        |
| `dockerhub-creds` | Username with password| `<ton login>`  | `<token DockerHub>`  |

Les Jenkinsfile lisent `DOCKERHUB_USER` (pour préfixer le tag de l'image) et `dockerhub-creds` (pour `docker login`).

### 9.3 Vérifier que ça marche

Build le job `mycontacts-landing`. Stage `Delivery: push DockerHub` → tu dois voir `Login Succeeded` puis l'image apparaît dans https://hub.docker.com/r/<ton-login>/mycontacts-landing/tags.

---

## 10 · Webhook GitLab/GitHub + ngrok

Sans webhook, Jenkins ne sait pas qu'un push a eu lieu. Solutions :
- **Polling** : Jenkins demande à GitLab toutes les N minutes (lent + bruyant)
- **Webhook** : GitLab pousse une notif HTTP à Jenkins quand un commit arrive (instantané)

Problème : ton Jenkins tourne sur `localhost:8090` → GitLab ne peut pas l'atteindre.
Solution : **ngrok** crée un tunnel HTTPS public vers ton Jenkins local.

### 10.1 Lancer ngrok

```bash
# Installer (une fois) :
sudo snap install ngrok                # ou via le binaire officiel
ngrok config add-authtoken <TON_TOKEN> # depuis ton compte ngrok

# Tunneler Jenkins :
ngrok http 8090
```

ngrok affiche une URL du genre `https://abcd-1234.ngrok-free.app`. Copie-la.

### 10.2 Côté GitLab (ou GitHub)

GitLab → Settings → Webhooks :
- URL : `https://abcd-1234.ngrok-free.app/gitlab-webhook/post` (chemin GitLab plugin)
  Pour GitHub : `https://abcd-1234.ngrok-free.app/github-webhook/`
- Secret token : laisse vide ou génère-en un
- Trigger : Push events
- Add webhook → Test → "Push events" doit retourner 200

### 10.3 Côté Jenkins

- Pour un job Multibranch Pipeline : rien à faire, le plugin Git scan automatiquement à chaque hit.
- Pour un job Pipeline simple : Configure → cocher "GitLab connection" / "GitHub hook trigger for GITScm polling".

À chaque `git push origin main`, le job se déclenche tout seul.

---

## 11 · Anatomie d'un Jenkinsfile

Prends `server/Jenkinsfile` comme exemple. Décortiquons :

```groovy
pipeline {                          // syntaxe "Declarative Pipeline"
    agent any                       // tourne sur n'importe quel agent dispo

    options {
        timestamps()                // préfixe chaque ligne de log par l'heure
        ansiColor('xterm')          // garde les couleurs des outputs (npm, docker)
        disableConcurrentBuilds()   // 1 seule build à la fois pour ce job
        timeout(time: 25, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '20')) // garde 20 builds, jette le reste
    }

    environment {
        IMAGE_NAME      = 'mycontacts-api'
        DOCKERHUB_USER  = credentials('dockerhub-user')
        // 'credentials()' ici injecte la valeur du secret comme variable d'env.
        // Pour les couples username/password on utilise plutôt withCredentials (cf. plus bas).
        ...
    }

    stages {
        stage('Checkout') { steps { checkout scm } }
        // 'scm' = la définition Git du job (URL + branche), pas besoin de répéter.

        stage('Install') {
            steps {
                dir('server') { sh 'npm ci' }
            }
            // dir() = se place dans un sous-dossier le temps du bloc.
            // sh = exécute un shell. Échec ⇒ stage rouge ⇒ pipeline rouge.
        }

        stage('Test') {
            steps {
                dir('server') {
                    sh 'npx --yes jest --runInBand --coverage'
                }
            }
        }

        stage('SonarQube') {
            steps {
                dir('server') {
                    withSonarQubeEnv('sonarqube') {
                        // injecte $SONAR_HOST_URL + $SONAR_AUTH_TOKEN
                        sh 'npx --yes sonar-scanner ...'
                    }
                }
            }
        }

        stage('Build image') {
            steps {
                dir('server') {
                    sh '''
                        docker build \
                            --build-arg BUILD_SHA=${GIT_COMMIT:-${BUILD_NUMBER}} \
                            -t ${IMAGE_FULL} \
                            -t ${IMAGE_LATEST} .
                    '''
                }
            }
        }

        stage('Delivery: push DockerHub') {
            when { branch 'main' }   // ne tourne QUE sur la branche main
            steps {
                withCredentials([usernamePassword(credentialsId: 'dockerhub-creds',
                                                  usernameVariable: 'DH_USER',
                                                  passwordVariable: 'DH_PASS')]) {
                    sh '''
                        echo "$DH_PASS" | docker login -u "$DH_USER" --password-stdin
                        docker push ${IMAGE_FULL}
                        docker push ${IMAGE_LATEST}
                        docker logout
                    '''
                }
            }
        }

        stage('Deploy: local docker run') {
            when { branch 'main' }
            steps {
                sh '''
                    docker rm -f ${CONTAINER_NAME} 2>/dev/null || true
                    docker run -d \
                        --name ${CONTAINER_NAME} \
                        --network ${DEVOPS_NETWORK} \
                        -e MONGODB_URI=mongodb://mongo:27017/mycontacts \
                        -p 4000:4000 \
                        ${IMAGE_FULL}
                '''
            }
        }

        stage('Smoke test') {
            when { branch 'main' }
            steps {
                sh '''
                    for i in 1 2 3 4 5; do
                        curl -fsS http://localhost:4000/health && exit 0
                        sleep 3
                    done
                    exit 1
                '''
            }
        }
    }

    post {
        always   { sh 'docker image prune -f || true'; cleanWs() }
        success  { echo "Build #${env.BUILD_NUMBER} OK" }
        failure  { echo "Build #${env.BUILD_NUMBER} FAILED" }
    }
}
```

### Pourquoi `withCredentials` plutôt que `environment { X = credentials(...) }` ?

Pour un secret simple (token, URL), `environment` suffit.
Pour un couple **username + password**, `withCredentials([usernamePassword(...)])` est obligatoire car il faut deux variables. Bonus : le bloc démasque les secrets dans les logs.

---

## 12 · Mapping des checklists

### `devops.png` — Mise en place de l'environnement DevOps

| Tâche                                      | Comment c'est couvert                              |
| ------------------------------------------ | -------------------------------------------------- |
| Installer VMWare                           | Optionnel — on remplace les VMs par Docker         |
| Créer une VM                               | `mycontacts/jenkins:lts` joue le rôle de VM CI     |
| Vérifier internet + IP                     | `docker exec jenkins curl https://hub.docker.com`  |
| Snapshot machine vierge                    | Volume Docker `jenkins_home` (rollback : `down -v`)|
| Installer Docker Engine                    | Hôte (déjà fait), CLI dans Jenkins via Dockerfile  |
| Créer réseau docker `devops`               | `docker network create devops` (script up)         |
| Déployer Jenkins                           | `devops/docker-compose.yml`                        |
| Finaliser install Jenkins                  | `casc.yaml` (admin auto, plugins, Sonar config)    |
| Pipeline `hello-world`                     | `devops/Jenkinsfile.helloworld`                    |
| Pipeline avec étape de CI                  | Stages `Install` → `Test` dans `server/Jenkinsfile`|
| Étape de déploiement continue              | Stages `Delivery` → `Deploy` (idem)                |
| Fork repo + ajouter Jenkinsfile            | Déjà : 4 Jenkinsfile commités                      |
| Connecter agent Jenkins                    | Agent intégré "any" suffit ici (option : agent JNLP via 50000) |
| Tunnel ngrok                               | §10                                                |
| Webhook GitLab/GH + Jenkins                | §10                                                |

### `fil-rouge2.png` — Conteneurisation + Sonar (semaine 2)

| Tâche                                      | Couverture                                         |
| ------------------------------------------ | -------------------------------------------------- |
| À quoi sert Docker ?                       | §13.1                                              |
| Différence Docker / DockerHub              | §13.2                                              |
| Conteneuriser frontend                     | `client/Dockerfile`                                |
| Conteneuriser backend                      | `server/Dockerfile`                                |
| Publier image frontend sur DockerHub       | Stage `Delivery` dans `client/Jenkinsfile`         |
| Publier image backend sur DockerHub        | Stage `Delivery` dans `server/Jenkinsfile`         |
| Étape delivery dans Jenkinsfile frontend   | Idem                                               |
| Étape delivery dans Jenkinsfile backend    | Idem                                               |
| Déployer SonarQube                         | `devops/docker-compose.yml`                        |
| Test Sonar frontend                        | Stage `SonarQube` dans `client/Jenkinsfile`        |
| Installer dépendance sonar                 | `npx sonar-scanner` (pas besoin de l'ajouter aux deps)|
| Test Sonar backend                         | Stage `SonarQube` dans `server/Jenkinsfile`        |
| Étape sonar dans pipeline frontend         | Idem                                               |
| Étape sonar dans pipeline backend          | Idem                                               |

### `projet-fil-rouge.png` — Semaine 1

Couvert : API NodeJS, frontend React, tests backend (`server/tests/`), tests frontend (`client/src/**/*.test.*`), Jenkinsfile back+front, doc infra (`INFRA.md` pour Azure, **ce guide** pour le local).

### `supply-chain.png` — Conteneurisation + DockerHub

Couvert : `landing/`, image landing, push DockerHub, pipeline landing, build stage, deploy, reproduit pour API. Voir aussi `SUPPLY-CHAIN.md`.

### `vul.png` — Identifier les vulnérabilités

| Tâche                              | Comment                                    |
| ---------------------------------- | ------------------------------------------ |
| Déployer le backend                | `apps-up.sh` ou pipeline `mycontacts-api`  |
| Déployer le frontend               | Idem `mycontacts-web`                      |
| Connecter frontend ↔ backend       | `VITE_API_URL=http://localhost:4000` dans le build du frontend ; le SPA appelle l'API depuis le navigateur |
| Documenter les failles             | À partir des sorties Trivy + Sonar (cf. §13.5) |

---

## 13 · Réponses aux questions « A quoi sert X ? »

### 13.1 À quoi sert Docker ?
À empaqueter une application avec son OS minimal et ses dépendances dans une **image** qui tourne identiquement partout : ton laptop, le serveur d'un collègue, un serveur de prod. Ça résout le « ça marche chez moi ». Trois bénéfices concrets :
1. **Reproductibilité** : pas de surprise entre dev et prod.
2. **Isolation** : un conteneur ne pollue pas l'OS hôte (pas de paquets globaux, pas de fichiers traînants).
3. **Portabilité** : la même image tourne sur Linux, Mac (via Docker Desktop), Windows, et tout cloud.

### 13.2 Différence Docker vs DockerHub ?
- **Docker** = le moteur (le **daemon** + la **CLI**) qui construit et fait tourner les images sur ta machine.
- **DockerHub** = un site web (un **registry**) qui stocke des images et te permet de les partager. C'est comme GitHub mais pour des images Docker au lieu de code.

Tu *construis* une image avec Docker (`docker build`), tu la *publies* sur DockerHub (`docker push`), un autre dev/serveur la *récupère* avec `docker pull`.

### 13.3 À quoi sert Jenkins ?
À automatiser tout ce que tu ferais à la main : tester, scanner, builder, publier, déployer. Avantage clé : **traçabilité**. Chaque build a un numéro, des logs, une durée, un statut succès/échec. Tu peux remonter dans le temps.

### 13.4 À quoi sert SonarQube ?
À donner une **note de santé** au code, suivie dans le temps. Il détecte des bugs probables sans exécuter le code (analyse statique). Très utile pour repérer des failles et de la dette tôt.

### 13.5 Comment on documente les failles ?
Trois sources qui se complètent :
- **Trivy** (stage `Scan image`) → CVE des paquets OS et npm dans l'image
- **SonarQube** (stage `SonarQube`) → bugs et vulnérabilités dans le code
- **`npm audit`** (stage `Audit` quand on l'ajoute) → CVE des deps dans `package-lock.json`

Pour chaque finding, le livrable doit indiquer :
- ID (CVE-YYYY-XXXX ou Sonar SXXXX)
- Sévérité
- Composant impacté
- Action prise (upgrade, ignore avec justification, fix code)

Voir `SECURITY.md` (à créer en fin de phase « vul »).

---

## 14 · Dépannage

### Jenkins ne démarre pas → port déjà pris
```
Error: Bind for 0.0.0.0:8090 failed: port is already allocated
```
Trouve le coupable : `ss -tlnp | grep 8090`. Soit tu coupes l'autre service, soit tu changes le port mappé dans `devops/docker-compose.yml`.

### Jenkins démarre mais ne peut pas lancer Docker
```
permission denied while trying to connect to the Docker daemon socket
```
Le GID du groupe `docker` dans le conteneur ne matche pas celui de l'hôte. Le script `devops-up.sh` détecte le GID automatiquement (`stat -c '%g' /var/run/docker.sock`) et le passe en build-arg. Si tu as construit l'image avant ce fix : `docker compose -f devops/docker-compose.yml build --no-cache jenkins && docker compose -f devops/docker-compose.yml up -d`.

### SonarQube reste sur "Starting"
SonarQube refuse de démarrer si `vm.max_map_count` est trop bas (limite Linux). Sur l'hôte :
```bash
sudo sysctl -w vm.max_map_count=262144
# Pour rendre persistant :
echo 'vm.max_map_count=262144' | sudo tee -a /etc/sysctl.conf
```

### Pipeline rouge sur `npm ci`
Cache Jenkins corrompu. Manage Jenkins → Workspace → Wipe Out, ou ajouter à un Jenkinsfile :
```groovy
stage('Reset') { steps { deleteDir() } }
```

### "no space left on device"
Trop d'images Docker accumulées :
```bash
docker system prune -af --volumes
```
(sup tout ce qui n'est pas utilisé. Coupe d'abord les apps que tu veux garder.)

### Conteneur API redémarre en boucle
```bash
docker logs --tail 50 mycontacts-api
```
Souvent : `MONGODB_URI` mauvaise, ou Mongo pas démarré sur le réseau `devops`.

---

## 15 · Couper la stack proprement

```bash
# Stop apps (volumes mongo gardés)
./scripts/apps-down.sh

# Stop devops (Jenkins, Sonar, sonar-db, mongo) — volumes gardés
./scripts/devops-down.sh

# Tout supprimer y compris les volumes (config Jenkins, projets Sonar, données Mongo)
./scripts/devops-down.sh --wipe
```

Le réseau `devops` reste — c'est voulu. Pour le supprimer :
```bash
docker network rm devops
```

---

## Annexe — Commandes que tu devrais connaître par cœur

```bash
# Voir tout ce qui tourne
docker ps

# Logs en streaming
docker logs -f mycontacts-api

# Entrer dans un conteneur (pour debug)
docker exec -it jenkins bash

# Voir les images locales
docker images

# Forcer un re-pull
docker pull <user>/mycontacts-api:latest

# Voir les ressources consommées
docker stats

# Inspecter un réseau
docker network inspect devops
```

---

**Tu lis ce doc en entier au moins une fois.** Tu peux toujours y revenir : il est versionné dans le repo, à côté du code et des Jenkinsfile.
