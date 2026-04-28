# Infrastructure — MyContacts (Fil Rouge CICD)

End-to-end CI/CD setup: GitHub → Jenkins → Azure VMs (one frontend, one backend).

## Topology

```
                      ┌─────────────────────┐
                      │   GitHub (main)     │
                      └─────────┬───────────┘
                                │ pollSCM (H/5 * * * *)
                                ▼
                      ┌─────────────────────┐
                      │  Jenkins controller │  (separate VM or local)
                      │  + 1 build agent    │
                      └────┬────────────┬───┘
                           │            │
                  scp+ssh  │            │  scp+ssh
                           ▼            ▼
                ┌────────────────┐  ┌────────────────┐
                │  Backend VM    │  │  Frontend VM   │
                │  Ubuntu 22.04  │  │  Ubuntu 22.04  │
                │  Node 20 + PM2 │  │  nginx         │
                │  systemd unit  │  │  static files  │
                │  → MongoDB     │  └────────────────┘
                │   (Atlas or    │
                │    same VM)    │
                └────────────────┘
```

## 1 · Azure VMs

### Sizes / images
- **Backend VM**: `Standard_B1s`, Ubuntu 22.04 LTS, 30 GB premium SSD.
- **Frontend VM**: `Standard_B1s`, Ubuntu 22.04 LTS, 30 GB standard SSD.
- Region: `francecentral` (latency from Paris). Both share one resource group `rg-fil-rouge`.

### Provisioning (CLI)

```bash
# Variables
RG=rg-fil-rouge
LOC=francecentral
VNET=vnet-fil-rouge
SUBNET=subnet-app
SSH_KEY=~/.ssh/id_ed25519.pub

az group create -n $RG -l $LOC

az network vnet create -g $RG -n $VNET --address-prefix 10.0.0.0/16 \
  --subnet-name $SUBNET --subnet-prefix 10.0.1.0/24

# Backend VM
az vm create -g $RG -n vm-mycontacts-api \
  --image Ubuntu2204 --size Standard_B1s \
  --admin-username azureuser --ssh-key-values $SSH_KEY \
  --vnet-name $VNET --subnet $SUBNET --public-ip-sku Standard
az vm open-port -g $RG -n vm-mycontacts-api --port 80 --priority 1001
az vm open-port -g $RG -n vm-mycontacts-api --port 443 --priority 1002
az vm open-port -g $RG -n vm-mycontacts-api --port 22 --priority 1000

# Frontend VM
az vm create -g $RG -n vm-mycontacts-web \
  --image Ubuntu2204 --size Standard_B1s \
  --admin-username azureuser --ssh-key-values $SSH_KEY \
  --vnet-name $VNET --subnet $SUBNET --public-ip-sku Standard
az vm open-port -g $RG -n vm-mycontacts-web --port 80 --priority 1001
az vm open-port -g $RG -n vm-mycontacts-web --port 443 --priority 1002
az vm open-port -g $RG -n vm-mycontacts-web --port 22 --priority 1000
```

### NSG hardening
- **22/tcp** restrict source to Jenkins public IP (and your bastion / dev IP).
- **80/443/tcp** open to Internet on both VMs.
- **27017/tcp** never open externally — use private subnet or Atlas VPC peering.
- Enable Azure Defender for Servers (Plan 1) on the resource group if the budget allows.

## 2 · Backend VM bootstrap

```bash
sudo apt-get update
sudo apt-get install -y curl ca-certificates git ufw

# Node 20 LTS (NodeSource)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Optional MongoDB on the same VM (otherwise use Atlas)
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-7.0.gpg --dearmor
echo "deb [signed-by=/usr/share/keyrings/mongodb-7.0.gpg] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" \
    | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update && sudo apt-get install -y mongodb-org
sudo systemctl enable --now mongod

sudo mkdir -p /srv/mycontacts-api/releases
sudo chown -R azureuser:azureuser /srv/mycontacts-api

# nginx as reverse proxy in front of Node
sudo apt-get install -y nginx
sudo cp deploy/backend/nginx.conf /etc/nginx/sites-available/mycontacts-api
sudo ln -s /etc/nginx/sites-available/mycontacts-api /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# systemd unit (drops privileges, restarts on failure)
sudo cp deploy/backend/mycontacts-api.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable mycontacts-api

# Environment file (read by the unit)
sudo install -m 600 -o azureuser -g azureuser /dev/null /etc/mycontacts-api.env
sudo tee /etc/mycontacts-api.env >/dev/null <<EOF
NODE_ENV=production
PORT=4000
MONGODB_URI=mongodb://localhost:27017/mycontacts
JWT_SECRET=$(openssl rand -hex 48)
EOF
```

## 3 · Frontend VM bootstrap

```bash
sudo apt-get update
sudo apt-get install -y nginx
sudo mkdir -p /var/www/mycontacts-web/releases
sudo chown -R azureuser:azureuser /var/www/mycontacts-web
sudo cp deploy/frontend/nginx.conf /etc/nginx/sites-available/mycontacts-web
sudo ln -s /etc/nginx/sites-available/mycontacts-web /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

## 4 · Jenkins setup

### Plugins
- **Pipeline**, **Pipeline: Stage View**
- **Git**, **GitHub Branch Source**
- **SSH Agent** (for `sshagent` step)
- **Credentials Binding**, **AnsiColor**, **Timestamper**
- **Workspace Cleanup** (`cleanWs`)
- **JUnit**

### Credentials (Manage Jenkins → Credentials → System → Global)
| ID                  | Type         | Value                                      |
| ------------------- | ------------ | ------------------------------------------ |
| `backend-vm-host`   | Secret text  | Public IP / FQDN of backend VM             |
| `frontend-vm-host`  | Secret text  | Public IP / FQDN of frontend VM            |
| `backend-vm-ssh`    | SSH username | `azureuser` + matching private key         |
| `frontend-vm-ssh`   | SSH username | `azureuser` + matching private key         |
| `vite-api-url`      | Secret text  | `http://api.mycontacts.example` or VM FQDN |

### Jobs
Two **Multibranch Pipeline** jobs, one per app:
- `mycontacts-api` → repo, script path `server/Jenkinsfile`
- `mycontacts-web` → same repo, script path `client/Jenkinsfile`

Each polls `main` every 5 min (`pollSCM` in the Jenkinsfile). Switch to a webhook for instant builds when a public Jenkins URL is available.

### Jenkins user → SSH to VMs
On both Azure VMs, append the Jenkins SSH **public** key to `/home/azureuser/.ssh/authorized_keys`. Jenkins's private key lives in the SSH credential. The `sshagent` block in each Jenkinsfile loads it for the lifetime of the deploy step.

### Sudoers (passwordless restart only)
On each VM, allow `azureuser` to restart only the relevant services:

```sudoers
# /etc/sudoers.d/mycontacts (visudo -f)
azureuser ALL=(root) NOPASSWD: /bin/systemctl restart mycontacts-api, /bin/systemctl is-active mycontacts-api, /usr/sbin/nginx -t, /bin/systemctl reload nginx, /bin/tar, /bin/ln, /bin/mkdir, /usr/bin/find, /bin/rm
```

## 5 · Pipeline contract

Both pipelines share the same shape:

```
Checkout → Tooling → Install → Lint → Test → (Audit|Build) → Package → Deploy → Smoke
```

- `Test` runs `npm test`. Failure stops the pipeline before any deploy.
- `Deploy` only runs on `main` (`when { branch 'main' }`).
- Releases land under `releases/<BUILD_NUMBER>/`; `current` symlink swap is the cutover (≈atomic).
- Last 5 releases kept on disk → instant rollback via `ln -sfn .../releases/<N> .../current`.

### Manual rollback

```bash
# Backend
ssh azureuser@$BACKEND_HOST "sudo ln -sfn /srv/mycontacts-api/releases/<N> /srv/mycontacts-api/current && sudo systemctl restart mycontacts-api"
# Frontend
ssh azureuser@$FRONTEND_HOST "sudo ln -sfn /var/www/mycontacts-web/releases/<N> /var/www/mycontacts-web/current && sudo systemctl reload nginx"
```

## 6 · Observability

- **App logs (backend)**: `journalctl -u mycontacts-api -f`
- **Access/error logs (nginx)**: `/var/log/nginx/{access,error}.log`
- **Build logs**: Jenkins per-build console output
- **Health check**: `GET /health` → `{ "status": "ok" }` (consumed by the smoke test stage)

## 7 · Disaster recovery

- **MongoDB**: nightly `mongodump` to Azure Blob storage (cron on the backend VM). Tested restore quarterly.
- **VMs**: re-runnable from this doc — VM state is disposable, releases come from Jenkins.
- **Jenkins**: `/var/lib/jenkins` snapshotted weekly to Azure managed disk snapshot.

## 8 · TODO / next iteration

- [ ] Replace `pollSCM` with GitHub webhook once Jenkins has a public URL.
- [ ] TLS via Let's Encrypt (`certbot --nginx`) on both VMs.
- [ ] Move secrets from Jenkins credentials to Azure Key Vault (with `azure-credentials` plugin).
- [ ] Replace local Mongo with Atlas + private endpoint.
- [ ] Add Azure Monitor agent + custom metrics dashboard.
