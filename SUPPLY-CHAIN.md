# Conteneurisation & Supply-chain

Mapping checklist → livrables. Toutes les commandes `az` / `ssh` sont à exécuter par toi (besoin de ton login Azure & DockerHub).

## Checklist (image `supply-chain.png`)

| # | Tâche                                                          | Statut local | Action côté toi                                               |
| - | -------------------------------------------------------------- | ------------ | ------------------------------------------------------------- |
| 1 | Compte Azure for Student via mail Efrei                        | ✅ déjà fait  | —                                                             |
| 2 | VM `Standard_B1s` Ubuntu sur Azure                             | ⏭ scripté    | Lancer §1 ci-dessous                                          |
| 3 | Ouvrir port 80 de la VM                                        | ⏭ scripté    | Inclus dans §1                                                |
| 4 | Installer Docker sur la VM                                     | ⏭ scripté    | Lancer §2 ci-dessous                                          |
| 5 | Image Docker depuis repo landing page simple                   | ✅ `landing/` | `docker build` testé localement                               |
| 6 | Publier l'image sur DockerHub                                  | ⏭ pipeline   | Créer compte DockerHub + credentials Jenkins (§4)             |
| 7 | Déployer landing page avec Jenkins sur Azure                   | ✅ Jenkinsfile | Job multibranch `mycontacts-landing` (§5)                     |
| 8 | Étape build d'image dans pipeline Jenkins                      | ✅ stage      | `Build image` + `Push to DockerHub` dans tous les Jenkinsfile |
| 9 | Déployer avec la nouvelle étape                                | ✅ stage      | `Deploy to VM` via `docker pull` + `docker run`               |
| 10| Reproduire pour API Node.js                                    | ✅ `server/`  | Dockerfile multi-stage + Jenkinsfile mis à jour               |

---

## §1 · Provisionner la VM Azure

```bash
# Variables — à adapter
RG=rg-fil-rouge
LOC=francecentral
VM_NAME=vm-mycontacts-landing
ADMIN=azureuser
SSH_KEY=~/.ssh/id_ed25519.pub

az group create -n $RG -l $LOC

az vm create \
  --resource-group $RG \
  --name $VM_NAME \
  --image Ubuntu2204 \
  --size Standard_B1s \
  --admin-username $ADMIN \
  --ssh-key-values $SSH_KEY \
  --public-ip-sku Standard

# Ouvrir le port 80 (HTTP)
az vm open-port -g $RG -n $VM_NAME --port 80 --priority 1001
# Optionnel mais recommandé : 443 pour TLS plus tard
az vm open-port -g $RG -n $VM_NAME --port 443 --priority 1002

# Récupérer l'IP publique (à mettre dans Jenkins → credentials `landing-vm-host`)
az vm show -d -g $RG -n $VM_NAME --query publicIps -o tsv
```

> Pour l'API Node.js, refaire le même bloc avec `VM_NAME=vm-mycontacts-api` et ouvrir le port `4000` (ou laisser nginx en reverse proxy sur 80).

## §2 · Installer Docker sur la VM

```bash
ssh azureuser@<IP-VM>

# install Docker (méthode officielle)
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
    sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
    https://download.docker.com/linux/ubuntu jammy stable" | \
    sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Permettre à azureuser de lancer docker sans sudo
sudo usermod -aG docker azureuser
# se reconnecter pour que le groupe prenne effet, puis :
docker run --rm hello-world
```

## §3 · Construction d'images en local (sanity check)

```bash
# landing
docker build --build-arg BUILD_SHA=$(git rev-parse --short HEAD) \
    -t mycontacts-landing:dev landing/
docker run --rm -p 8081:80 mycontacts-landing:dev   # http://localhost:8081

# API
docker build --build-arg BUILD_SHA=$(git rev-parse --short HEAD) \
    -t mycontacts-api:dev server/

# Web (build statique)
docker build --build-arg VITE_API_URL=http://localhost:4000 \
    --build-arg BUILD_SHA=$(git rev-parse --short HEAD) \
    -t mycontacts-web:dev client/

# Stack complète :
docker compose up -d        # mongo + api(4000) + web(8080) + landing(8081)
docker compose down -v
```

## §4 · DockerHub — compte & credentials

1. Créer un compte sur https://hub.docker.com (login = `<DOCKERHUB_USER>`).
2. Créer un **Access Token** (Account Settings → Security → New Access Token, scope `Read & Write`).
3. Dans Jenkins, ajouter ces deux credentials globales :

| ID                | Type                  | Valeur                              |
| ----------------- | --------------------- | ----------------------------------- |
| `dockerhub-user`  | Secret text           | ton login DockerHub                 |
| `dockerhub-creds` | Username + password   | login + Access Token (pas le mdp)   |

Les Jenkinsfile poussent sous : `${DOCKERHUB_USER}/mycontacts-{landing,api,web}:<BUILD_NUMBER>` + tag `:latest`.

## §5 · Pipelines Jenkins — 3 jobs multibranch

| Job                     | Script path           | Crée image                       |
| ----------------------- | --------------------- | -------------------------------- |
| `mycontacts-landing`    | `landing/Jenkinsfile` | `mycontacts-landing:<build>`     |
| `mycontacts-api`        | `server/Jenkinsfile`  | `mycontacts-api:<build>`         |
| `mycontacts-web`        | `client/Jenkinsfile`  | `mycontacts-web:<build>`         |

Toutes les pipelines suivent le même squelette :

```
Checkout → Install → Lint → Test → Build image → Scan (Trivy) → Push DockerHub → Deploy VM → Smoke
```

**Stage `Deploy to VM`** : SSH vers la VM, `docker pull`, `docker rm -f` ancien conteneur, `docker run -d` nouveau. Pas de copie de fichiers — l'artefact = l'image, source unique de vérité.

### Credentials Jenkins requises (récap)

| ID                  | Type            | Usage                                    |
| ------------------- | --------------- | ---------------------------------------- |
| `dockerhub-user`    | Secret text     | Préfixe images                           |
| `dockerhub-creds`   | Username + pwd  | `docker login` push                      |
| `landing-vm-host`   | Secret text     | IP / FQDN VM landing                     |
| `landing-vm-ssh`    | SSH user+key    | Deploy stage landing                     |
| `backend-vm-host`   | Secret text     | IP / FQDN VM API                         |
| `backend-vm-ssh`    | SSH user+key    | Deploy stage API                         |
| `frontend-vm-host`  | Secret text     | IP / FQDN VM web                         |
| `frontend-vm-ssh`   | SSH user+key    | Deploy stage web                         |
| `vite-api-url`      | Secret text     | URL backend injectée au build du SPA     |

## §6 · Backend API — env file sur la VM

Avant le premier déploiement de l'image API, créer le fichier d'env consommé par `--env-file` :

```bash
ssh azureuser@<IP-VM-API> "sudo tee /etc/mycontacts-api.env > /dev/null" <<EOF
NODE_ENV=production
PORT=4000
MONGODB_URI=mongodb://mongo:27017/mycontacts
JWT_SECRET=$(openssl rand -hex 48)
EOF
sudo chmod 600 /etc/mycontacts-api.env
```

Pour MongoDB : soit lancer un conteneur `mongo:7` sur la même VM (réseau Docker partagé), soit pointer vers MongoDB Atlas. Si Atlas, remplacer `MONGODB_URI` ci-dessus par la chaîne Atlas.

Lancer Mongo en local sur la VM :
```bash
docker network create mycontacts || true
docker run -d --name mongo --network mycontacts \
    -v mongo-data:/data/db --restart unless-stopped mongo:7
# Puis ajouter --network mycontacts dans le Jenkinsfile API à la place de `-p 4000:4000` seul.
```

## §7 · Trace de supply-chain

Chaque pipeline produit un artefact traçable :

- **Image immutable** taggée `<DOCKERHUB_USER>/<image>:<BUILD_NUMBER>` (jamais réécrite).
- **`BUILD_SHA`** injecté à `docker build` → exposé par `/build.json` (landing) et lisible via `docker inspect`.
- **Scan Trivy** à chaque build → CVE HIGH/CRITICAL listées dans le log Jenkins (en mode `--exit-code 0` pour ne pas bloquer ; passer à `--exit-code 1` pour gate stricte).

## §8 · Rollback rapide

Le tag `:<BUILD_NUMBER>` est suffisant pour rollback :

```bash
ssh azureuser@<IP-VM> "
    docker pull <DOCKERHUB_USER>/mycontacts-landing:<N>
    docker rm -f mycontacts-landing
    docker run -d --name mycontacts-landing --restart unless-stopped \
        -p 80:80 <DOCKERHUB_USER>/mycontacts-landing:<N>
"
```

## §9 · Prochaines étapes (préparent la partie « vulnérabilités »)

- [ ] Activer Trivy en mode bloquant (`--exit-code 1`) une fois les CVE de base corrigées.
- [ ] `npm audit` JSON → publier comme artefact Jenkins.
- [ ] Signer les images (cosign) avant push DockerHub.
- [ ] Activer Dependabot / Renovate sur le repo.
- [ ] SBOM (`syft`) en sortie de pipeline → archivage build.
