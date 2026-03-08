# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Life Canvas OS is an Electron desktop application for personal life management based on an "eight-dimensional life balance model". It combines:

- **Frontend**: Electron + React 19 + TypeScript + Vite + TailwindCSS + shadcn/ui
- **Backend**: Python 3.12 + FastAPI + SQLAlchemy + SQLite
- **Build Tool**: PyInstaller (required for building Python backend)
- **Communication**: Dual-mode Python backend (IPC for production, HTTP for development)
- **Package Manager**: pnpm (required, version 10.30.3)

## Architecture

### Dual-Mode Python Backend

The Python backend (`backend/main.py`) runs in two modes:

1. **Development Mode** (`python backend/main.py --dev`): FastAPI HTTP server on port 8000 with CORS enabled, auto-reload, and API docs at `/docs`
2. **Production Mode** (`python backend/main.py`): IPC communication via stdin/stdout using length-prefixed JSON protocol

The Electron main process (`src/main/python/manager.ts`) manages the Python process, handles the length-prefixed protocol, and provides auto-restart on crashes.

**Mode Detection**: Development mode is determined by `NODE_ENV=development` environment variable.

### Backend Structure

```
backend/
├── api/              # FastAPI route handlers (auth, users, journals, insights, systems, data, diet, timeline)
├── core/             # Core utilities (config, exceptions, logging, middleware)
├── db/               # Database (session management, base models, initialization)
├── models/           # SQLAlchemy ORM models (user, diary, insight, dimension)
├── schemas/          # Pydantic schemas for request/response validation
├── services/         # Business logic layer (auth, user, journal, insight, system, diet, data, timeline)
└── main.py           # Dual-mode entry point
```

### Frontend Structure

```
src/
├── main/             # Electron main process (Python process manager, window management)
├── preload/          # Preload scripts (IPC bridge to renderer)
├── renderer/         # React application (components, pages, routes)
│   ├── components/   # UI components (GlassCard, PinLockScreen, shadcn/ui)
│   ├── hooks/        # Custom hooks (useUserApi, useAiApi, useDataApi, usePinStatus, useJournalApi)
│   ├── pages/        # Page components (dashboard, settings, journal, timeline, systems, insight)
│   └── lib/          # Utilities (constants, cacheUtils, insightUtils, dateUtils, pin, toast)
├── shared/           # Shared types and utilities
└── lib/electron-app/ # Electron utilities
```

### IPC Communication

In production mode, the renderer communicates with Python backend via IPC:

- **Preload API**: `window.App.request(action, params)` - Main entry point for API calls
- **Action Format**: `<method>_<path>` maps to HTTP method and API endpoint
  - `get_api_user_profile` → `GET /api/user/profile`
  - `post_api_journals` → `POST /api/journals`
  - `delete_api_journals_123` → `DELETE /api/journals/123`
- **Method Aliases**: `create` → `POST`, `update` → `PUT`
- **Protocol**: Length-prefixed JSON: `<length>\n<json_bytes>`

### Key Patterns

- **Unified API Response Format**: All API endpoints return `{code, message, data, timestamp}` using `success_response()` and `error_response()` from `backend/schemas/common.py`
- **Service Layer Pattern**: Business logic is in `services/`, routes in `api/` delegate to services
- **Auto-Initialization**: Database automatically initializes on first run (`backend/db/init_db.py`)
- **Path Aliases**: Use `~/` alias for all imports (resolves to `src/`). Never use relative imports like `../../`
- **Database Session**: Use `Depends(get_db)` for API endpoints, `get_db_context()` for background tasks
- **State Management Strategy**:
  - **Server State**: Must use TanStack Query (never useState for API data)
  - **Global Business State**: Use Zustand for high-frequency updates (e.g., 8-dimension scores, lock state)
  - **Global Config State**: Use React Context for low-frequency updates (e.g., theme, language, auth)
  - **Local State**: Use useState/useReducer
  - **Form State**: Use react-hook-form + zod

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

# Run with custom data directory (database storage location)
python backend/main.py --data-dir /path/to/data
```

**Note**: On Windows, use `python` or `python3` depending on your PATH configuration.

### Building

```bash
# Build Electron app
pnpm build

# Build Python backend with PyInstaller (requires: pip install pyinstaller)
pnpm build:python

# Build both
pnpm build:all
```

### Python Environment

```bash
# Create virtual environment
python3 -m venv venv

# Activate virtual environment (macOS/Linux)
source venv/bin/activate

# Activate virtual environment (Windows)
# cmd.exe
venv\Scripts\activate.bat
# PowerShell
venv\Scripts\Activate.ps1

# Install Python dependencies (requires PyInstaller for building)
pip install -r backend/requirements.txt
pip install pyinstaller
```

## Code Style & Quality Standards

### Code Formatting (Biome)

Project uses Biome for consistent code formatting:
- **Indentation**: 2 spaces
- **Line Width**: 80 characters
- **Quotes**: Single quotes for JS/TS, double quotes for JSX
- **Semicolons**: As-needed (no trailing semicolons)
- **Import Sorting**: Disabled (use manual organization)

Run `pnpm lint:fix` before committing.

### Code Complexity Limits

- **File length**: Max 300 lines (split if exceeded)
- **Function length**: Max 50 lines for business logic, 100 lines for components
- **Nesting depth**: Max 3 levels (use guard clauses)
- **Function parameters**: Max 3 (use object/Pydantic model for more)

### Naming Conventions

**Frontend (TypeScript/React)**:
- Components: `PascalCase` (e.g., `UserProfile.tsx`, `GlassCard.tsx`)
- Non-component files: `kebab-case` (e.g., `use-auth.ts`, `api-service.ts`)
- Hooks: `camelCase` with `use` prefix (e.g., `useAuth`, `useTheme`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `MAX_RETRY_COUNT`)
- Props: `{ComponentName}Props` (e.g., `UserCardProps`)

**Backend (Python)**:
- Files/modules: `snake_case` (e.g., `user_profile.py`, `auth_service.py`)
- Classes: `PascalCase` (e.g., `UserProfile`, `UserService`)
- Functions/variables: `snake_case` (e.g., `get_user_by_id`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `DEFAULT_PAGE_SIZE`)
- Private members: `_` prefix (e.g., `_internal_helper`)

### Type Safety Requirements

- **No implicit `any`**: All functions must have explicit type hints
- **Import types**: Use `import type { ... }` for type-only imports
- **Props interfaces**: All component props must have defined interfaces
- **Pydantic schemas**: All API endpoints must use Pydantic models for validation

## Important Notes

### Unified Response Format

All API endpoints must use the standardized response format:

```python
from backend.schemas.common import success_response, error_response

# Success response
return success_response(data=result, message="Operation successful", code=200)

# Error response (raise HTTPException for API errors)
raise HTTPException(status_code=404, detail=error_response(message="Not found", code=404))
```

### Eight-Dimensional System Types

Defined in `backend/models/dimension.py`:

- `FUEL` - Diet system (饮食系统)
- `PHYSICAL` - Exercise system (运动系统)
- `INTELLECTUAL` - Learning system (读书系统)
- `OUTPUT` - Work system (工作系统)
- `DREAM` - Dreams system (梦想系统)
- `ASSET` - Finance system (财务系统)
- `CONNECTION` - Social system (社交系统)
- `ENVIRONMENT` - Environment system (环境系统)

### Database Models

- Base model: `backend/db/base.py`
- User models: `backend/models/user.py`
- Dimension models: `backend/models/dimension.py`
- Diary models: `backend/models/diary.py`
- Insight models: `backend/models/insight.py`

### Authentication

- PIN-based authentication (6-digit numeric code)
- Auth service: `backend/services/auth_service.py`
- Auth routes: `backend/api/auth.py`

### Pydantic v2 Notes

When defining Pydantic models with fields that may conflict with protected namespaces (e.g., `model_name`):

```python
from pydantic import BaseModel, ConfigDict

class MyModel(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    model_name: str  # Avoids UserWarning
```

Use `model_config` instead of deprecated `class Config`.

## Critical File Locations

### Backend

- **Entry point**: `backend/main.py` - Dual-mode server (HTTP/IPC)
- **Response helpers**: `backend/schemas/common.py` - `success_response()`, `error_response()`
- **Database config**: `backend/db/session.py` - Session management
- **Database init**: `backend/db/init_db.py` - Auto-initialization
- **System types**: `backend/models/dimension.py` - Eight-dimensional enums

### Frontend

- **Main entry**: `src/main/index.ts` - Electron main process
- **Python manager**: `src/main/python/manager.ts` - Process lifecycle
- **Preload bridge**: `src/preload/index.ts` - IPC exposure to renderer
- **Renderer entry**: `src/renderer/index.html` - React app root
- **Path aliases**: Configured in `tsconfig.json` - `~/` → `src/`

### Configuration

- **Biome config**: `biome.json` - Code formatting rules
- **Electron config**: `electron.vite.config.ts` - Build configuration
- **Python deps**: `backend/requirements.txt` - Python dependencies

### Documentation

- **API docs**: `docs/API.md` - Complete API reference
- **Backend rules**: `docs/BACKEND_AI_RULES.md` - Python coding standards
- **Frontend rules**: `docs/FRONTEND_AI_RULES.md` - React/TypeScript standards
- **Development roadmap**: `docs/DEVELOPMENT_ROADMAP.md` - Phase-by-phase plan
