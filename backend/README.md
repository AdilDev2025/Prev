# ⚡ NEURO-FORCE

Workforce management platform with facial recognition attendance, workspace collaboration, and AI-driven productivity scoring.

## Architecture

```
NEURO-FORCE/
├── backend/                        # Node.js Express API (port 3000)
│   ├── index.js                    # Entry point + proxy config
│   ├── Middlewares/
│   │   ├── auth_middleware.js      # JWT verification
│   │   └── role_middleware.js      # RBAC (admin/user)
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── auth.js             # Register + Login
│   │   │   ├── dashboard/
│   │   │   │   ├── controller_dashboard.js      # User & workspace dashboards
│   │   │   │   ├── attendance_WM_controller.js  # Face registration & attendance
│   │   │   │   └── productivity_controller.js   # Productivity snapshots
│   │   │   └── workspace/
│   │   │       ├── workspace_controller.js      # CRUD + member management
│   │   │       ├── workspace_invite_controller.js
│   │   │       └── workspace_Accept_controller.js
│   │   ├── routers/
│   │   │   ├── main_route.js       # Route aggregator
│   │   │   ├── authenticationroute.js
│   │   │   ├── dashboard_routers/
│   │   │   └── workspace_routers/
│   │   ├── services/
│   │   │   └── productivity_services.js  # Scoring engine
│   │   ├── utils/
│   │   │   └── scoring.utils.js    # Attendance/reliability/final score
│   │   └── lib/
│   │       └── prisma.js           # Prisma client singleton
│   ├── prisma/
│   │   └── schema.prisma           # MySQL schema (Users, Workspaces, Attendance, etc.)
│   ├── facial-attendance/          # Python FastAPI service (port 8000)
│   │   ├── app.py                  # FastAPI endpoints
│   │   ├── requirements.txt        # Python dependencies
│   │   ├── src/
│   │   │   ├── face_recognition.py # DLIB face embedding extraction
│   │   │   ├── vector_db.py        # Qdrant vector storage
│   │   │   └── data_augmentation.py
│   │   └── scripts/                # Training & evaluation scripts
│   └── api-tester.html             # Interactive API testing UI
└── frontend/
    └── index.html
```

### Service Communication

```
┌──────────────────┐       ┌───────────────────────┐
│  Node.js API     │       │  Python FastAPI        │
│  Port: 3000      │──────▶│  Port: 8000            │
│  (Express)       │ proxy │  (Facial Recognition)  │
└────────┬─────────┘       └──────────┬────────────┘
         │                            │
         ▼                            ▼
┌──────────────────┐       ┌───────────────────────┐
│  MySQL           │       │  Qdrant                │
│  (Prisma ORM)    │       │  (Vector Database)     │
└──────────────────┘       └───────────────────────┘
```

## Quick Start

### Prerequisites

- **Node.js** 18+
- **Python** 3.9+
- **MySQL** running locally
- **Qdrant** (for facial recognition vectors)

### 1. Setup Backend

```bash
cd backend

# Install dependencies
npm install

# Create .env file (copy and edit as needed)
cat .env
# DATABASE_URL="mysql://root:1234@localhost:3306/neurodb"
# JWT_SECRET="your-secret-key"
# PORT=3000
# FACIAL_API_URL=http://localhost:8000

# Generate Prisma client & run migrations
npx prisma generate
npx prisma migrate dev

# Start server
npm run dev
```

### 2. Setup Facial Recognition (Optional)

```bash
cd backend/facial-attendance

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start Qdrant
./start_qdrant.sh

# Start FastAPI
python app.py
```

### 3. Start Everything

```bash
cd backend
npm run start:all    # Starts both Node.js + Python services
```

## API Endpoints

### Health
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/health` | ✗ | Server status |

### Authentication
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/register` | ✗ | Register user (`name`, `email`, `password`) |
| `POST` | `/api/auth/login` | ✗ | Login → returns JWT token |

### Dashboard
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/dashboard` | ✓ | User dashboard (auto-detects admin/employee) |
| `GET` | `/api/workspace-dashboard/:workspaceId` | ✓ | Workspace dashboard with attendance stats |

### Workspaces
| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| `GET` | `/api/workspace` | ✓ | any | List owned workspaces |
| `POST` | `/api/workspace` | ✓ | any | Create workspace |
| `PATCH` | `/api/workspace/:id` | ✓ | admin | Update workspace |
| `DELETE` | `/api/workspace/:id` | ✓ | admin | Delete workspace |
| `GET` | `/api/workspace/:id/members` | ✓ | admin | List members |
| `PATCH` | `/api/workspace/:id/members` | ✓ | admin | Update member role |

### Invitations
| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| `POST` | `/api/workspace/:id/invite` | ✓ | admin | Send invite (`email`, `role`) |
| `POST` | `/api/workspace/invite/:inviteId/accept` | ✓ | any | Accept invite |

### Attendance (Facial Recognition)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/workspace-dashboard/:id/attendance/register-face` | ✓ | Register face (multipart: `face` image) |
| `POST` | `/api/workspace-dashboard/:id/attendance/mark-attendance` | ✓ | Mark attendance (multipart: `face` image) |

### Productivity
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/productivity/snapshot` | ✗ | Generate snapshot (`userId`, `workspaceId`, `startDate`, `endDate`) |
| `GET` | `/api/productivity/snapshots/:userId/:workspaceId` | ✗ | Get snapshot history |
| `GET` | `/api/productivity/snapshot/latest/:userId/:workspaceId` | ✗ | Get latest snapshot |
| `POST` | `/api/productivity/workspace/:workspaceId/generate-all` | ✗ | Generate for all members |

### Facial API (Proxied → Python)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/facial/health` | Facial service health |
| `GET` | `/api/facial/enrolled-users` | List enrolled faces |
| `POST` | `/api/facial/enroll-face` | Enroll face directly |
| `POST` | `/api/facial/attendance-recognition` | Recognize face directly |

## Authentication

All protected routes require a JWT token:

```
Authorization: Bearer <token>
```

**Get a token:**
```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John","email":"john@test.com","password":"pass123"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@test.com","password":"pass123"}'

# Use token
curl http://localhost:3000/api/dashboard \
  -H "Authorization: Bearer <token>"
```

## Productivity Scoring

Scores are calculated from facial attendance data:

| Score | Weight | Formula |
|-------|--------|---------|
| **Attendance** (0-1) | 70% | `(avgConfidence × 0.6) + (hoursWorked/160 × 0.4)` |
| **Reliability** (0-1) | 30% | `avgConfidence - consistencyPenalty - anomalyPenalty - driftPenalty` |
| **Final** (0-100) | — | `(attendance × 0.7 + reliability × 0.3 + afterHoursBonus) × 100` |

## API Testing UI

Open `backend/api-tester.html` in a browser for an interactive endpoint testing interface with:
- Auto-saved JWT tokens
- File upload support for face endpoints
- Syntax-highlighted JSON responses
- All 22 endpoints pre-configured

## Database Schema

Key models: `users`, `Workspace`, `WorkspaceMember`, `Invite`, `Attendance`, `FaceEmbedding`, `ProductivitySnapshot`

```bash
# View schema
cat backend/prisma/schema.prisma

# Open visual editor
cd backend && npx prisma studio
```

## Development

```bash
cd backend

npm run dev              # Start with hot reload
npm run prisma:generate  # Regenerate Prisma client
npm run prisma:migrate   # Run migrations
npx prisma studio        # Visual DB browser
```

## License

ISC — Ammar Khan
