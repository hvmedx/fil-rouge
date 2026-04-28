# deploy/

VM-side configuration consumed by Jenkins deploys. Copied to the target VM during bootstrap (see `INFRA.md`), not by the pipeline itself.

```
deploy/
├── backend/
│   ├── nginx.conf               → /etc/nginx/sites-available/mycontacts-api
│   └── mycontacts-api.service   → /etc/systemd/system/mycontacts-api.service
└── frontend/
    └── nginx.conf               → /etc/nginx/sites-available/mycontacts-web
```

Re-apply on a fresh VM by following the **Backend VM bootstrap** / **Frontend VM bootstrap** sections of `INFRA.md`.
