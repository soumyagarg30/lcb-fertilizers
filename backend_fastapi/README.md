# Agriflow FastAPI backend

This is a FastAPI reimplementation scaffold for the Agriflow backend. It includes core models, JWT auth, and inventory endpoints ported from the existing Node code so the frontend can interact with a Python backend.

Quick start (using pip):

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/agriflow
export SECRET_KEY=change-me
uvicorn app.main:app --reload --port 8000
```

Using Docker Compose:

```bash
docker compose -f backend_fastapi/docker-compose.yml up --build
```

API docs will be available at `http://localhost:8000/docs`.

Open http://localhost:8000/docs for the OpenAPI UI.
