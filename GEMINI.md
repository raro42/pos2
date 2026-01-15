# Gemini Context: POS System

## Project Overview
This is a modern, full-stack Point of Sale (POS) system designed for scalability and ease of use. It features a microservice architecture for real-time updates and follows strict separation of concerns.

## Tech Stack & Versions

### Backend (`/back`)
- **Language:** Python 3.12 (Slim Docker Image)
- **Framework:** FastAPI >= 0.110
- **Server:** Uvicorn [standard] >= 0.27
- **ORM:** SQLModel >= 0.0.22 (Pydantic + SQLAlchemy)
- **Database Driver:** Psycopg 3.1 (Binary)
- **Authentication:** OAuth2 with Password Flow (Bcrypt, JWT)
- **Payment Processing:** Stripe >= 8.0
- **Image Processing:** Pillow >= 10.0.0
- **Key Libraries:** `python-multipart`, `python-jose`, `redis`

### Frontend (`/front`)
- **Framework:** Angular 21
- **Runtime:** Node.js 20 (Alpine)
- **UI Grid:** Ag-Grid Community 35
- **Styling:** SCSS, Prettier (Single Quote, Print Width 100)
- **Server-Side Rendering (SSR):** Enabled in production, disabled in dev for speed (`angular-ssr`, `express`).
- **Key Libraries:** `angularx-qrcode`, `rxjs`, `zone.js`

### Database & Storage
- **Primary DB:** PostgreSQL 18 (Alpine 3.23)
- **Cache/PubSub:** Redis 7 (Alpine)

### Microservices
- **WS Bridge (`/ws-bridge`):** 
  - Python/FastAPI WebSocket service.
  - Subscribes to Redis channels (`orders:{tenant_id}`) to broadcast real-time updates to frontend clients.

## Architecture & Infrastructure

### Service Map
| Service | Internal Port | Host Port | Description |
| :--- | :--- | :--- | :--- |
| **back** | 8020 | 8020 | Main REST API (FastAPI) |
| **front** | 4200 | 4200 | Angular Client (Dev: `ng serve`, Prod: Nginx/Node) |
| **db** | 5432 | 5433 | PostgreSQL Database |
| **redis** | 6379 | 6379 | Redis Cache & Message Broker |
| **ws-bridge** | 8021 | 8021 | WebSocket Real-time Bridge |

### Directory Structure
```
/
├── back/                   # FastAPI Backend
│   ├── app/                # Application Source
│   │   ├── main.py         # Entry Point
│   │   ├── models.py       # SQLModel Definitions
│   │   ├── db.py           # Database Connection
│   │   └── ...
│   ├── migrations/         # SQL Migration Files (Timestamped)
│   ├── uploads/            # User Uploaded Content
│   └── create_migration.sh # Helper script for migrations
├── front/                  # Angular Frontend
│   ├── src/                # Source Code
│   └── ...
├── ws-bridge/              # WebSocket Microservice
│   ├── main.py
│   └── ...
├── run.sh                  # Main Orchestration Script
├── config.env              # Environment Variables (Git-ignored)
├── docker-compose.yml      # Base Compose Config (Dev)
└── docker-compose.prod.yml # Production Overrides
```

## Development Workflow

### Startup & Management (`run.sh`)
The `run.sh` script is the central controller for the environment.

*   **Development Mode (Hot Reload):**
    ```bash
    ./run.sh -dev
    ```
    - `front`: Runs `ng serve` (host 0.0.0.0).
    - `back`: Runs `uvicorn --reload`.
    - `ws-bridge`: Runs standard startup.
    
*   **Production Mode:**
    ```bash
    ./run.sh
    ```
    - `front`: Builds and serves static/SSR.
    - `back`: Standard execution.
    
*   **Cleanup:**
    ```bash
    ./run.sh --clean
    ```
    - Stops containers, removes volumes, cleans up orphaned resources.

### Database Migrations
Migrations are raw SQL files located in `back/migrations/`. They are applied automatically on backend startup (`app.migrate`).

*   **Format:** `{YYYYMMDDHHMMSS}_{description}.sql` (Timestamp-based to prevent conflicts).
*   **Create Migration:**
    ```bash
    ./back/create_migration.sh <description_snake_case>
    ```
    *Example:* `./back/create_migration.sh add_user_preferences`

### Configuration
Configuration is loaded from environment variables.
*   **Source:** `config.env` (copy from `config.env.example`).
*   **Backend Access:** via `pydantic-settings` or `os.getenv`.
*   **Frontend Access:** Build-time injection or `environment.ts` files.

### Key Environment Variables
| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `POSTGRES_DB` | pos | Database Name |
| `API_URL` | http://localhost:8020 | Backend API URL for Front |
| `WS_URL` | ws://localhost:8021 | WebSocket URL for Front |
| `STRIPE_PUBLISHABLE_KEY` | - | Stripe Key for Front |
| `STRIPE_SECRET_KEY` | - | Stripe Key for Back |

## Code Conventions

### Frontend (Angular)
-   **Style:** Strict Prettier enforcement (`singleQuote: true`, `printWidth: 100`).
-   **Structure:** Feature-based modules (though migrating to standalone components where appropriate).
-   **State:** Service-based state management with RxJS.

### Backend (Python)
-   **Style:** PEP 8 compliance.
-   **Models:** All database models in `back/app/models.py`.
-   **Imports:** Explicit imports in `back/app/main.py` to ensure SQLModel registry is populated.

## Common Commands
*   **Backend Logs:** `docker compose logs -f back`
*   **Frontend Logs:** `docker compose logs -f front`
*   **Manual DB Connect:** `docker compose exec db psql -U pos -d pos`
*   **Restart Backend Only:** `docker compose restart back`