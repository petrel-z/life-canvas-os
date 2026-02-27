# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Life Canvas OS is an Electron desktop application for personal life management based on an "eight-dimensional life balance model". It combines:

- **Frontend**: Electron + React 19 + TypeScript + Vite + TailwindCSS + shadcn/ui
- **Backend**: Python 3.12 + FastAPI + SQLAlchemy + SQLite
- **Communication**: Dual-mode Python backend (IPC for production, HTTP for development)

## Architecture

### Dual-Mode Python Backend

The Python backend ([`backend/main.py`](backend/main.py)) runs in two modes:

1. **Development Mode** (`python backend/main.py --dev`): FastAPI HTTP server on port 8000 with CORS enabled, auto-reload, and API docs at `/docs`
2. **Production Mode** (`python backend/main.py`): IPC communication via stdin/stdout using length-prefixed JSON protocol

The Electron main process ([`src/main/python/manager.ts`](src/main/python/manager.ts)) manages the Python process, handles the length-prefixed protocol, and provides auto-restart on crashes.

### Backend Structure

```
backend/
├── api/              # FastAPI route handlers (auth, users, journals, insights, systems, data)
├── core/             # Core utilities (config, exceptions, logging, middleware)
├── db/               # Database (session management, base models, initialization)
├── models/           # SQLAlchemy ORM models (user, diary, insight, dimension)
├── schemas/          # Pydantic schemas for request/response validation
├── services/         # Business logic layer (auth, user, journal, insight, system)
└── main.py           # Dual-mode entry point
```

### Frontend Structure

```
src/
├── main/             # Electron main process (Python process manager, window management)
├── preload/          # Preload scripts (IPC bridge to renderer)
├── renderer/         # React application (components, pages, routes)
└── shared/           # Shared types and utilities
```

### Key Patterns

- **Unified API Response Format**: All API endpoints return `{code, message, data, timestamp}` using `success_response()` and `error_response()` from [`backend/schemas/common.py`](backend/schemas/common.py)
- **Service Layer Pattern**: Business logic is in `services/`, routes in `api/` delegate to services
- **Auto-Initialization**: Database automatically initializes on first run ([`backend/db/init_db.py`](backend/db/init_db.py))
- **Length-Prefixed Protocol**: IPC uses `\n<length>\n<json>` format for reliable message framing

## Common Commands

### Development

```bash
# Start development (Electron + Python HTTP mode)
pnpm dev

# Format code (Biome)
pnpm lint:fix

# Type check
pnpm typecheck
```

### Python Backend

```bash
# Run Python backend in development mode (HTTP on port 8000)
python backend/main.py --dev

# Run Python backend in production mode (IPC via stdin/stdout)
python backend/main.py
```

### Building

```bash
# Build Electron app
pnpm build

# Build Python backend with PyInstaller (requires backend.spec)
pnpm build:python

# Build both
pnpm build:all
```

## Important Notes

### Unified Response Format

All API endpoints must use the standardized response format defined in [`backend/schemas/common.py`](backend/schemas/common.py):

```python
from backend.schemas.common import success_response, error_response

# Success response
return success_response(data=result, message="Operation successful", code=200)

# Error response (raise HTTPException for API errors)
raise HTTPException(status_code=404, detail=error_response(message="Not found", code=404))
```

### System Types

The eight-dimensional system types are defined in [`backend/models/dimension.py`](backend/models/dimension.py):

- `FUEL` - Diet system (饮食系统)
- `PHYSICAL` - Exercise system (运动系统)
- `INTELLECTUAL` - Learning system (读书系统)
- `OUTPUT` - Work system (工作系统)
- `DREAM` - Dreams system (梦想系统)
- `ASSET` - Finance system (财务系统)
- `CONNECTION` - Social system (社交系统)
- `ENVIRONMENT` - Environment system (环境系统)

### Database Models

- Base model with auto-generated table names: [`backend/db/base.py`](backend/db/base.py)
- User models: [`backend/models/user.py`](backend/models/user.py)
- Dimension (8-system) models: [`backend/models/dimension.py`](backend/models/dimension.py)
- Diary models: [`backend/models/diary.py`](backend/models/diary.py)
- Insight models: [`backend/models/insight.py`](backend/models/insight.py)

### Authentication

- PIN-based authentication (6-digit numeric code)
- Auth service: [`backend/services/auth_service.py`](backend/services/auth_service.py)
- Auth routes: [`backend/api/auth.py`](backend/api/auth.py)

### Current Implementation Status

The project is in early development (~7% complete). Implemented features:
- Electron + React 19 foundation
- Python backend with FastAPI
- PIN authentication system
- User settings management
- Diary/journal CRUD
- AI insights (supports DeepSeek)
- Diet system (baseline and deviation tracking)
- Data export/import/backup

See [`README.md`](README.md) for detailed roadmap and feature list.
