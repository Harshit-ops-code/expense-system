# Tech Stack

This document lists the main technologies and versions used in the Expense Management MVP.

- Backend
  - Language: Python 3.11
  - Framework: Flask
  - ORM: SQLAlchemy (via Flask-SQLAlchemy)
  - Web server (production): Gunicorn
  - CORS: Flask-CORS
  - DB drivers: `psycopg2-binary` (Postgres), `pymysql` (MySQL)

- Frontend
  - Framework: React 18
  - Bundler / dev server: Vite
  - Styling: Tailwind CSS
  - Build: `npm run build` (Vite)

- Containerization & Orchestration
  - Docker (recommended)
  - Local composition: Docker Compose (v2)

- CI / CD
  - GitHub Actions (workflow included to build & push images to GHCR)

- Recommended environment
  - Node.js 18+ for frontend development
  - Docker Desktop for local container testing
  - For production DB: Postgres 14+ (or managed Postgres like AWS RDS / GCP Cloud SQL)

- Notes
  - The backend will fallback to SQLite when `DATABASE_URL` is not set, but use Postgres in production.
  - See `README.md` for run and deployment instructions.
