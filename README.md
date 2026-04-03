# Minecraft Server Website Starter

A minimal FastAPI + SQLAlchemy + SQLite starter for a Minecraft server website.

## Quick start

```powershell
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

Open:

- `http://127.0.0.1:8000/`
- `http://127.0.0.1:8000/api/v1/health`
- `http://127.0.0.1:8000/docs`

## How the code is organized

- `app/main.py` starts the FastAPI app and mounts versioned routers.
- `app/api/router.py` combines the feature routers into one API tree.
- `app/api/routes/` contains the HTTP endpoints for auth and health checks.
- `app/api/deps.py` holds request dependencies like JWT user lookup.
- `app/core/` contains app settings and security helpers.
- `app/db/` contains the database engine, session factory, and base model.
- `app/models/` contains SQLAlchemy tables.
- `app/schemas/` contains Pydantic request/response models.
- `app/services/` contains the business logic.

## What is included

- FastAPI application
- SQLite database via SQLAlchemy 2.x
- Simple health-check endpoint
- Example `User` model
- JWT auth: register, login, and current user endpoints
- Basic project structure ready for expansion

## Project layout

```text
app/
  api/
    routes/
  core/
  db/
  models/
  main.py
tests/
```

## Setup

Create and activate a virtual environment, then install dependencies:

```powershell
pip install -r requirements.txt
```

## Run the app

```powershell
alembic upgrade head
uvicorn app.main:app --reload
```

Then open:

- `http://127.0.0.1:8000/`
- `http://127.0.0.1:8000/api/v1/health`
- `http://127.0.0.1:8000/docs`
- Auth routes are available in the main Swagger docs at `http://127.0.0.1:8000/docs`

## Environment config

- Copy `.env.example` to `.env`
- Fill in real values for `SECRET_KEY` and any environment-specific settings
- Keep `.env` local (it is ignored by `.gitignore`)

```powershell
Copy-Item .env.example .env
```

## Database migrations

Alembic is used to manage schema changes.

Useful commands:

```powershell
alembic revision --autogenerate -m "describe change"
alembic upgrade head
alembic downgrade -1
```

The app no longer creates tables at runtime, so run `alembic upgrade head` before starting the server.

## Test

```powershell
pytest
```

## Create first admin (real DB)

Tests seed an admin automatically, but real environments do not.
Use the bootstrap script after migrations:

```powershell
python scripts/create_admin.py --email admin@example.com
```

You can also pass all fields directly:

```powershell
python scripts/create_admin.py --username admin --email admin@example.com --password AdminPass123
```

The script creates a user if missing, or promotes/updates an existing one by username/email.

## Next steps

- Add auth with JWT
- Add news posts
- Add user profile pages
- Add support tickets and punishments

## Auth endpoints

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`

## Admin endpoints (MVP)

- `GET /api/v1/admin/users`
- `GET /api/v1/admin/users/{user_id}`
- `PATCH /api/v1/admin/users/{user_id}/ban`
- `PATCH /api/v1/admin/users/{user_id}/admin`

Admin access in MVP is based on the user flag `is_admin` in the database.

## Pre-commit checklist

- Run tests: `pytest`
- Ensure migration head applies: `alembic upgrade head`
- Keep temp files out of commit (`__pycache__`, `*.pyc`, `*.db`, `.env`, `.venv`)
- Confirm `.env` secrets are not tracked
- Verify README commands still match current project behavior



