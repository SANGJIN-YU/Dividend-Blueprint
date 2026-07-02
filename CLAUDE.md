# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Dividend Blueprint is a FastAPI backend for simulating long-term dividend-reinvestment
growth on ETFs (e.g. SCHD, VOO, VYM, JEPI). The repo currently contains only the
`backend/` service — there is no frontend yet.

Code comments and docstrings are mixed Korean/English; match the existing style when
editing a file rather than converting it.

## Commands

All commands are run from the `backend/` directory. There is currently no
`requirements.txt`/`pyproject.toml` in the repo — dependencies (`fastapi`, `uvicorn`,
`sqlalchemy`) must be installed manually before running anything:

```bash
pip install fastapi uvicorn "sqlalchemy>=2.0"
```

Because the app uses absolute imports rooted at `app.*`, run everything from `backend/`
with `PYTHONPATH=.` (or install the package) — otherwise `ModuleNotFoundError: app` is raised.

```bash
cd backend

# Create the SQLite DB from current SQLAlchemy metadata
PYTHONPATH=. python -c "from app.database.base import init_db; init_db()"

# Seed the 4 default ETFs (ticker-based upsert, idempotent)
PYTHONPATH=. python scripts/seed_etfs.py

# Run the dev server
PYTHONPATH=. uvicorn app.main:app --reload
```

Health check: `GET /health`. There is no test suite, linter, or CI configuration in the
repo at present — don't assume `pytest`/`ruff`/etc. exist unless you add them.

## Architecture

- **`app/main.py`** — FastAPI app factory. Routers are imported from `app/api/*` and
  mounted under the `/api/v1` prefix. Add new routers here.
- **`app/api/`** — one module per resource (`etf.py`, `simulation.py`), each exporting an
  `APIRouter`. These currently return hardcoded placeholder data (`{"items": []}`) and are
  **not yet wired to the database or the services layer** — connecting them is the natural
  next step when extending a resource.
- **`app/database/base.py`** — defines the SQLAlchemy `Base` (DeclarativeBase), `engine`,
  and `SessionLocal`. `DATABASE_URL` is read from the environment, defaulting to
  `sqlite:///./dividend_blueprint.db`. `init_db()` imports `app.database.models` (so its
  classes register on `Base.metadata`) and calls `create_all()`.
- **`app/database/models.py`** — the SQLAlchemy ORM models: `ETF`, `DividendHistory`, and
  `Simulation`, related via foreign keys (`etf_id`) with `cascade="all, delete-orphan"`.
  This is the single source of truth for persistence models.
- **`app/models/`** — legacy/empty package, explicitly superseded by `app.database.models`
  (see its docstring). Don't add new model code here.
- **`app/services/simulation_service.py`** — pure calculation logic, decoupled from
  FastAPI/DB. `simulate_dividend_growth()` runs a year-by-year projection:
  1. add `monthly_contribution * 12` to the asset at the start of the year,
  2. grow the asset by a fixed 7% (`asset *= 1.07`),
  3. compute the dividend as `asset * current_dividend_yield` and reinvest it,
  4. if `dividend_policy == "growing"`, increase the yield by 5% for next year.
  `SimulationService.run()` is a thin static wrapper around the function. When wiring
  this into the API layer, build the `SimulationInput` dataclass from the request and
  persist results via the `Simulation` model rather than duplicating this logic in the router.
- **`app/schemas/`** — empty; intended home for Pydantic request/response schemas once
  the API routes are implemented for real.
- **`scripts/seed_etfs.py`** — standalone seeding script; upserts `DEFAULT_ETFS` by
  `ticker` so it is safe to re-run.

## Conventions

- New DB models go in `app/database/models.py` and inherit from `app.database.base.Base`.
- New business logic belongs in `app/services/`, kept independent of FastAPI so it can be
  unit-tested and reused across routers/scripts.
- API routers stay thin: parse/validate input (via `app/schemas`), call a service, return
  the result — no calculation logic inline in `app/api/*.py`.
