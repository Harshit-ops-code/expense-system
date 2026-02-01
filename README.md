# Expense Management MVP

Small expense management app with a Flask backend and a Vite + React frontend.

**Tech stack**

- Backend: Flask, Flask-CORS, Flask-SQLAlchemy, Gunicorn
- Database: SQLite (default), supports PostgreSQL / MySQL via `DATABASE_URL`
- Frontend: React, Vite, Tailwind CSS
- Containerization: Docker, Docker Compose
- CI/CD: GitHub Actions (builds and publishes images to GHCR)

## Local development

Prerequisites:

- Docker & Docker Compose
- Node.js + npm (if running frontend locally without Docker)

Run with Docker Compose (recommended):

```bash
docker compose build
docker compose up
```

- Backend API: http://localhost:5000
- Frontend: http://localhost:8000

To run backend locally without Docker:

```bash
python -m venv .venv
source .venv/Scripts/activate    # Windows: .venv\Scripts\activate
pip install -r backend/requirements.txt
cd backend
python app.py
```

To run frontend locally without Docker:

```bash
cd frontend
npm ci
npm run dev
```

## Docker images & GitHub Actions

- GitHub Actions workflow: `.github/workflows/docker-publish.yml` builds both images and pushes to GitHub Container Registry (GHCR) as:
  - `ghcr.io/<your-username>/expense-system-backend:latest`
  - `ghcr.io/<your-username>/expense-system-frontend:latest`

- No extra secrets are required to publish to GHCR from the same repository; the workflow uses `GITHUB_TOKEN` with `packages: write` permission.

### Release builds (tagged releases)

When you create and publish a GitHub Release (for example tag `v1.0.0`), the repository runs the `release-publish.yml` workflow which:

- Builds backend and frontend images using the release tag and also tags `latest`.
- Pushes images to GHCR at `ghcr.io/<your-org>/expense-system-backend:<tag>` and `ghcr.io/<your-org>/expense-system-frontend:<tag>`.
- Optionally mirrors images to Docker Hub if `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` repository secrets are set.

This creates an atomic, tagged image for every release and keeps `latest` updated for convenience.

## Production notes

- The backend reads `DATABASE_URL` env var. Set it to a Postgres or MySQL DSN for production.
- Replace `SECRET_KEY` with a strong secret in production and configure secure credentials.

## Repository layout

- `backend/` — Flask API and models
- `frontend/` — React + Vite app
- `docker-compose.yml` — local compose configuration

## Next steps (suggestions)

- Add automated tests and a test job in CI.
- Add environment-specific compose files for staging/production.
- Configure an image registry retention policy if using GHCR.

## Deployment options (detailed)

1. GitHub Container Registry (recommended with current workflow)

- The existing workflow `.github/workflows/docker-publish.yml` builds images and pushes to GHCR as:
  - `ghcr.io/<your-username>/expense-system-backend:latest`
  - `ghcr.io/<your-username>/expense-system-frontend:latest`

- No extra secrets required; `GITHUB_TOKEN` is used. To pull images from other repos or orgs, configure permissions or use a PAT.

2. Docker Hub

- To push to Docker Hub, create a repository for both images and add `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` secrets to GitHub, then modify the workflow to `docker login -u ${{ secrets.DOCKERHUB_USERNAME }} -p ${{ secrets.DOCKERHUB_TOKEN }}` and push `docker.io/<user>/image:tag`.

3. Heroku (container-based deploy)

- Heroku accepts container images. Build images and push to Heroku Container Registry or use the Heroku GitHub integration.
- You already have a `Procfile` in `backend/Procfile` (`web: gunicorn app:app`), so deploying the backend as a Heroku app via the Python buildpack is also possible (push to Heroku git remote and set `DATABASE_URL`).

4. Google Cloud Run / AWS ECS

- Build and push images to your registry (GCR / ECR / GHCR), then deploy to Cloud Run or ECS. Ensure env vars (like `DATABASE_URL`, `SECRET_KEY`) are set in service configuration.

## Files added for deployment convenience

- `.dockerignore` — reduces Docker build context size
- `.env.example` — example environment variables
- `.github/workflows/docker-publish.yml` — CI workflow to build & publish images

See also: `TECHSTACK.md` for detailed tech choices and recommended versions.

## Runbook: Quick checklist for production rollout

- Replace `SECRET_KEY` with a secure value in production env.
- Set `DATABASE_URL` to a managed database (Postgres recommended).
- Use HTTPS at the frontend; configure reverse proxy or CDN.
- Add monitoring, log aggregation, and backups for DB.

## Kubernetes quick start

1. Replace image placeholders in `k8s/*-deployment.yaml` with your image path (GHCR or Docker Hub).
2. Create a secret for `SECRET_KEY`:

```bash
kubectl create secret generic expense-secrets --from-literal=SECRET_KEY='replace-with-secret'
```

3. Apply manifests:

```bash
kubectl apply -f k8s/
```

4. Get the frontend external IP (may take a minute):

```bash
kubectl get svc expense-frontend
```

## Continuous deployment to Cloud Run (one-click when secrets are set)

I added a GitHub Actions workflow `.github/workflows/deploy-cloudrun.yml` that will build and push container images to Google Container Registry (GCR) and deploy them to Cloud Run when you push to `main`.

Required repository secrets (set these in GitHub Settings -> Secrets):

- `GCP_SA_KEY`: JSON service account key with roles `roles/run.admin`, `roles/storage.admin`, `roles/iam.serviceAccountUser` (base64 or raw JSON)
- `GCP_PROJECT`: your GCP project id
- `GCP_REGION`: Cloud Run region (e.g. `us-central1`)

After adding those secrets, pushing to `main` will automatically deploy both services to Cloud Run. Logs and status are available in the Actions tab.
