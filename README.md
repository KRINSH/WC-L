# Minecraft Server Website Starter

A minimal FastAPI + SQLAlchemy + SQLite starter for a Minecraft server website.

## Quick start

```powershell
uv venv .venv
uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --reload
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
uv venv .venv
uv sync
```

## Run the app

```powershell
uv run alembic upgrade head
uv run uvicorn app.main:app --reload
```

Then open:

- `http://127.0.0.1:8000/`
- `http://127.0.0.1:8000/api/v1/health`
- `http://127.0.0.1:8000/docs`
- Auth routes are available in the main Swagger docs at `http://127.0.0.1:8000/docs`

The backend now serves the frontend from `frontend/`:

- `/` returns `frontend/index.html`
- `/static/*` serves files from `frontend/static/*`

## Environment config

- Copy `.env.example` to `.env`
- Set a long random `SECRET_KEY` (at least 32 chars)
- Use `DEBUG=true` only for local development; keep `DEBUG=false` in production
- If frontend runs on another origin (Live Server/Vite), set `CORS_ALLOW_ORIGINS` accordingly
- Keep `.env` local (it is ignored by `.gitignore`)
- For password reset links, set `PASSWORD_RESET_URL_BASE` to your frontend route (for example, `https://your-site/reset-password`)
- Enable SMTP delivery only when ready: `PASSWORD_RESET_EMAIL_ENABLED=true`
- Set `SMTP_SECURITY`: `ssl` for port `465`, `starttls` for port `587`, `none` for local debug SMTP

```powershell
Copy-Item .env.example .env
```

Generate a strong secret key:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Example CORS list for local frontend dev:

```dotenv
CORS_ALLOW_ORIGINS=["http://127.0.0.1:5500","http://localhost:5500","http://127.0.0.1:5501","http://localhost:5501","http://127.0.0.1:5173","http://localhost:5173","http://127.0.0.1:3000","http://localhost:3000"]
```

Mail.ru SMTP example (SSL):

```dotenv
PASSWORD_RESET_EMAIL_ENABLED=true
SMTP_HOST=smtp.mail.ru
SMTP_PORT=465
SMTP_USER=project@wc-legend.ru
SMTP_PASSWORD=your_mail_password_or_app_password
SMTP_FROM_EMAIL=project@wc-legend.ru
SMTP_SECURITY=ssl
```

## Database migrations

Alembic is used to manage schema changes.

Useful commands:

```powershell
uv run alembic revision --autogenerate -m "describe change"
uv run alembic upgrade head
uv run alembic downgrade -1
```

The app no longer creates tables at runtime, so run `uv run alembic upgrade head` before starting the server.

## Test

```powershell
uv run pytest
```

## Create first admin (real DB)

Tests seed an admin automatically, but real environments do not.
Use the bootstrap script after migrations:

```powershell
uv run python scripts/create_admin.py --email admin@example.com
```

You can also pass all fields directly:

```powershell
uv run python scripts/create_admin.py --username admin --email admin@example.com --password AdminPass123
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
- `POST /api/v1/auth/password-reset/request`
- `POST /api/v1/auth/password-reset/confirm`


## Admin endpoints (MVP)

- `GET /api/v1/admin/users`
- `GET /api/v1/admin/users/{user_id}`
- `PATCH /api/v1/admin/users/{user_id}/ban`
- `PATCH /api/v1/admin/users/{user_id}/admin`

Admin access in MVP is based on the user flag `is_admin` in the database.

## Pre-commit checklist

- Run tests: `uv run pytest`
- Ensure migration head applies: `uv run alembic upgrade head`
- Keep temp files out of commit (`__pycache__`, `*.pyc`, `*.db`, `.env`, `.venv`)
- Confirm `.env` secrets are not tracked
- Verify README commands still match current project behavior

