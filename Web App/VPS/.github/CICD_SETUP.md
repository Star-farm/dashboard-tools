# CI/CD Setup Guide — VPS Deployment (GitHub Actions via SSH)

This pipeline automatically **tests → deploys to your VPS** whenever changes in the `backend/` folder are pushed to `main` / `master`. Unlike a Cloud Run setup, there is no image registry or serverless platform involved — GitHub Actions connects to your VPS over SSH, pulls the latest code, and rebuilds the Docker container in place.

---

## 📐 Pipeline Architecture

```
push to main/master
        │
        ▼
┌───────────────┐     fail → pipeline stops
│  1. Run Tests │──────────────────────────►  ✗
│   (pytest)    │
└───────┬───────┘
        │ pass
        ▼
┌──────────────────────────┐
│  2. SSH into VPS         │  (private key auth)
│  3. git pull latest code │
│  4. docker compose build │  (rebuilds image — bakes in
│     & up -d --restart    │   ./backend/data/Simulation_Data.csv
└──────────────────────────┘   if it's checked into the repo)
```

> ⚠️ **Important — data-in-image caveat:** this project bakes `Simulation_Data.csv` directly into the Docker image at build time (see the main `README.md`). That means whatever CSV is present in the repository checkout on the VPS **at the moment of `docker compose build`** is what ends up in the running image. If the dataset is not committed to the repo, this pipeline alone cannot deploy it — you'd need to either commit the CSV to `backend/data/` or add a separate step that copies it onto the VPS before the build. If the dataset is sensitive, keeping it out of git and layering a manual/`scp` step in the deploy job is the safer choice — flag this in your own repo before relying on this pipeline as-is.

---

## 🔑 Required GitHub Secrets

Go to: **GitHub Repo → Settings → Secrets and variables → Actions → New repository secret**

| Secret | Required | Description | Example |
|---|---|---|---|
| `VPS_HOST` | ✅ | VPS IP address or domain | `203.0.113.10` |
| `VPS_USERNAME` | ✅ | SSH user used for deployment | `deploy` |
| `VPS_SSH_KEY` | ✅ | Private SSH key (PEM format) matching a public key already in the VPS user's `~/.ssh/authorized_keys` | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `VPS_PORT` | ☑️ optional | SSH port (default: `22`) | `22` |
| `VPS_DEPLOY_PATH` | ✅ | Absolute path to the project directory on the VPS (where `docker-compose.yml` lives) | `/home/deploy/star-farm-api` |

> [!CAUTION]
> Never commit the private key file to git. Generate a **dedicated** deploy key pair (don't reuse a personal SSH key) and restrict it, ideally with `command=` forced-command or a restricted shell if your threat model calls for it.

---

## 🛠️ Setup From Scratch

### Step 1 — Generate a dedicated deploy key pair

On your local machine (not the VPS):

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ./deploy_key -N ""
```

This creates `deploy_key` (private) and `deploy_key.pub` (public).

### Step 2 — Authorize the public key on the VPS

```bash
# Copy the public key content, then on the VPS:
ssh your_vps_user@your_vps_ip
mkdir -p ~/.ssh && chmod 700 ~/.ssh
echo "PASTE_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### Step 3 — Store the private key in GitHub Secrets

```bash
cat ./deploy_key
```

Copy the full output (including the `-----BEGIN...` / `-----END...` lines) into the **`VPS_SSH_KEY`** secret. Then delete `deploy_key` / `deploy_key.pub` from your local machine once saved.

### Step 4 — Clone the repository on the VPS once, manually

The pipeline only `git pull`s — it doesn't clone from scratch. Do the initial clone yourself:

```bash
ssh your_vps_user@your_vps_ip
git clone <your-repo-url> /home/deploy/star-farm-api
cd /home/deploy/star-farm-api
# create .env from _env.example_VPS and fill in real values — see main README.md
```

Set `VPS_DEPLOY_PATH` to this path in GitHub Secrets.

### Step 5 — Confirm Docker & Docker Compose are installed on the VPS

```bash
docker --version
docker compose version
```

Install them first if missing — this pipeline assumes both are already available and that the deploy user has permission to run `docker` (typically via membership in the `docker` group).

### Step 6 — Push to trigger the pipeline

The pipeline only runs on changes to:
- `backend/**`
- `.github/workflows/deploy.yml`

```bash
git add .
git commit -m "feat: trigger CI/CD deploy"
git push origin main
```

---

## 📋 Job Details

### Job 1: `test` — Run pytest

| Property | Value |
|---|---|
| Runner | `ubuntu-latest` |
| Python | `3.11` |
| Working dir | `./backend` |
| Test command | `python -m pytest tests/ -v` |

Environment variables injected during tests:

```yaml
API_KEYS: "test-key-123"
DEFAULT_CSV_PATH: "data/Simulation_Data.csv"
MODEL_CACHE_DIR: "./model_cache"
```

> [!NOTE]
> The `deploy` job only runs if `test` **passes**. If any test fails, the pipeline stops and nothing is deployed.

### Job 2: `deploy` — SSH & rebuild on the VPS

| Step | Description |
|---|---|
| SSH connect | Authenticates using `VPS_SSH_KEY` via `appleboy/ssh-action` |
| `git pull` | Fetches the latest `main`/`master` into `VPS_DEPLOY_PATH` on the VPS |
| `docker compose up -d --build` | Rebuilds the image in place (bakes in whatever `backend/data/Simulation_Data.csv` is present after the pull) and restarts the container |
| `docker image prune -f` | Removes dangling images left over from the previous build, to avoid filling up VPS disk over time |

Unlike Cloud Run, there is no separate registry push/pull step and no traffic-shifting between revisions — the build happens directly on the VPS, and there's a brief window of downtime while the old container is replaced (see the note on this in the main project docs). For low/medium traffic this is usually acceptable; for zero-downtime deploys you'd need a reverse proxy + blue-green setup, which is out of scope here.

---

## 🔁 Trigger Conditions

| Event | Branch | Path filter | Result |
|---|---|---|---|
| `push` | `main` or `master` | `backend/**` | ✅ Both jobs run |
| `push` | `main` or `master` | `.github/workflows/deploy.yml` | ✅ Both jobs run |
| `push` | other branch | any | ❌ Doesn't run |
| `pull_request` | any | any | ❌ Doesn't run |

---

## 🩺 Monitoring & Debugging

- Pipeline logs: **GitHub Repo → Actions tab**
- Live container status: `ssh` into the VPS and run `docker compose ps` / `docker compose logs -f`
- Disk usage from accumulated images: `docker system df`

### Common Issues

| Issue | Cause | Fix |
|---|---|---|
| `Permission denied (publickey)` | Public key not in `~/.ssh/authorized_keys` on the VPS, or wrong `VPS_USERNAME` | Re-check Step 2 |
| `docker: permission denied` | Deploy user isn't in the `docker` group | `sudo usermod -aG docker $USER` on the VPS, then re-login |
| Deploy step hangs / times out | Firewall blocking the SSH port from GitHub's runner IPs, or wrong `VPS_PORT` | Confirm the port is open (`ufw status` / cloud firewall rules) |
| App comes up with `NO_DATA_LOADED` after deploy | `Simulation_Data.csv` wasn't present in `backend/data/` at build time on the VPS | See the data-in-image caveat above — commit the CSV or add a manual copy step |
| Tests fail | Code error or missing dependency | Check the Actions tab logs |