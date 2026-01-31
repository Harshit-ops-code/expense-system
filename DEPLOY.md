# Deploy (local docker)

Quick instructions to run the project locally via Docker.

Prerequisites:

- Docker and Docker Compose installed.

Build and run:

```bash
docker compose build
docker compose up
```

- Backend API will be available at http://localhost:5000
- Frontend will be available at http://localhost:8000

Notes:

- The backend uses SQLite by default and mounts `./backend/expense_manager.db` for persistence.
- To use a production database, set the `DATABASE_URL` environment variable before `docker compose up`.

Optional: CI/CD

- Add a GitHub Actions workflow or container registry push as needed.
