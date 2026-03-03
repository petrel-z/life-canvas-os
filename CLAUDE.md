# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Life Canvas OS is an Electron desktop application for personal life management based on an "eight-dimensional life balance model". It combines:

- **Frontend**: Electron + React 19 + TypeScript + Vite + TailwindCSS + shadcn/ui
- **Backend**: Python 3.12 + FastAPI + SQLAlchemy + SQLite
- **Communication**: Dual-mode Python backend (IPC for production, HTTP for development)
- **Package Manager**: pnpm (required, version 10.0.0)

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
- **Path Aliases**: Use `~/` alias for all imports (resolves to `src/`). Never use relative imports like `../../`
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
# - Electron renderer server: http://localhost:4927
# - Python HTTP server: http://localhost:8000 (with /docs for API docs)
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

# Test database initialization (first startup scenario)
python backend/tests/test_first_startup.py
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

### Python Environment

```bash
# Create virtual environment (if not exists)
python3 -m venv venv

# Activate virtual environment
# macOS/Linux:
source venv/bin/activate
# Windows:
venv\Scripts\activate

# Install Python dependencies
pip install -r backend/requirements.txt
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

### Security Best Practices

- **No `nodeIntegration`**: Renderer process cannot access Node.js APIs directly
- **IPC communication**: Use exposed preload APIs via `window.electron`
- **No hardcoded secrets**: Use environment variables for API keys/tokens
- **Input validation**: All forms must use react-hook-form + zod
- **SQL safety**: Never concatenate SQL strings; use ORM/parameterized queries
- **No HTML injection**: Avoid `dangerouslySetInnerHTML`; sanitize if necessary

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
- AI insights (supports DeepSeek, OpenAI, 豆包/Doubao)
- Diet system (baseline and deviation tracking)
- Data export/import/backup
- Timeline/audit trail functionality
- API Key auto-verification

Backend API routes implemented:
- `/api/auth/*` - Authentication (PIN code)
- `/api/users/*` - User management and settings
- `/api/systems/*` - Eight-dimensional system data
- `/api/journals/*` - Diary/journal entries
- `/api/insights/*` - AI-generated insights (with daily limits)
- `/api/data/*` - Data export/import/backup
- `/api/timeline/*` - Timeline/audit trail

See [`README.md`](README.md) for detailed roadmap and feature list.

## Critical File Locations

### Backend

- **Entry point**: [`backend/main.py`](backend/main.py) - Dual-mode server (HTTP/IPC)
- **Response helpers**: [`backend/schemas/common.py`](backend/schemas/common.py) - `success_response()`, `error_response()`
- **Database config**: [`backend/db/session.py`](backend/db/session.py) - Session management
- **Database init**: [`backend/db/init_db.py`](backend/db/init_db.py) - Auto-initialization
- **System types**: [`backend/models/dimension.py`](backend/models/dimension.py) - Eight-dimensional enums

### Frontend

- **Main entry**: [`src/main/index.ts`](src/main/index.ts) - Electron main process
- **Python manager**: [`src/main/python/manager.ts`](src/main/python/manager.ts) - Process lifecycle
- **Preload bridge**: [`src/preload/index.ts`](src/preload/index.ts) - IPC exposure to renderer
- **Renderer entry**: [`src/renderer/index.html`](src/renderer/index.html) - React app root
- **Path aliases**: Configured in [`tsconfig.json`](tsconfig.json) - `~/` → `src/`

### Configuration

- **Biome config**: [`biome.json`](biome.json) - Code formatting rules
- **Electron config**: [`electron.vite.config.ts`](electron.vite.config.ts) - Build configuration
- **Python deps**: [`backend/requirements.txt`](backend/requirements.txt) - Python dependencies

### Documentation

- **API docs**: [`docs/API.md`](docs/API.md) - Complete API reference (v1.3.0)
- **Backend rules**: [`docs/BACKEND_AI_RULES.md`](docs/BACKEND_AI_RULES.md) - Python coding standards
- **Frontend rules**: [`docs/FRONTEND_AI_RULES.md`](docs/FRONTEND_AI_RULES.md) - React/TypeScript standards
- **Development roadmap**: [`docs/DEVELOPMENT_ROADMAP.md`](docs/DEVELOPMENT_ROADMAP.md) - Phase-by-phase plan
