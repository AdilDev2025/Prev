# NEURO-FORCE Backend API

A Node.js backend API with JWT authentication, Prisma ORM, and integrated Facial Recognition system.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    NEURO-FORCE                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────┐       ┌─────────────────────────┐  │
│  │   Node.js API   │       │   Python FastAPI        │  │
│  │   Port: 3000    │──────▶│   Port: 8000            │  │
│  │                 │ proxy │   (Facial Recognition)  │  │
│  └─────────────────┘       └─────────────────────────┘  │
│         │                            │                  │
│         │                            │                  │
│         ▼                            ▼                  │
│  ┌─────────────────┐       ┌─────────────────────────┐  │
│  │     MySQL       │       │       Qdrant            │  │
│  │   (Prisma ORM)  │       │   (Vector Database)    │  │
│  └─────────────────┘       └─────────────────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.9+
- MySQL database
- Qdrant (for facial recognition vectors)

### Installation

```bash
# Install Node.js dependencies
npm install

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate
```

### Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="mysql://user:password@localhost:3306/neurodb"

# JWT
JWT_SECRET=your-secret-key

# Server Ports
PORT=3000
FACIAL_API_PORT=8000
FACIAL_API_URL=http://localhost:8000
```

### Starting Services

**Start Node.js backend only:**
```bash
npm start
# or for development with hot reload
npm run dev
```

**Start all services (Node.js + Python Facial API):**
```bash
npm run start:all
```

## 📡 API Endpoints

### Health Check
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Server status and service info |

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | User login |

### User Dashboard
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/dashboard` | ✓ | Get user dashboard |

### Workspace Management
| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | `/api/workspace` | ✓ | - | List workspaces |
| POST | `/api/workspace` | ✓ | - | Create workspace |
| PATCH | `/api/workspace/:id` | ✓ | admin | Update workspace |
| DELETE | `/api/workspace/:id` | ✓ | admin | Delete workspace |
| GET | `/api/workspace/:id/members` | ✓ | admin | List members |
| PATCH | `/api/workspace/:id/members` | ✓ | admin | Update member role |

### Workspace Dashboard
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/workspace-dashboard/:workspaceId` | ✓ | Get workspace dashboard |
| POST | `/api/workspace-dashboard/:workspaceId/attendance/register-face` | ✓ | Register face for attendance |
| POST | `/api/workspace-dashboard/:workspaceId/attendance/mark-attendance` | ✓ | Mark attendance via face recognition |

### Invitations
| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| POST | `/api/workspace/:id/invite` | ✓ | admin | Send workspace invite |
| POST | `/api/workspace/invite/:inviteId/accept` | ✓ | - | Accept invitation |

### Facial Recognition (Proxied to Python API)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/facial/` | Facial API status |
| GET | `/api/facial/health` | Facial API health check |
| POST | `/api/facial/enroll-face` | Enroll a face |
| POST | `/api/facial/attendance-recognition` | Recognize face |

## 📁 Project Structure

```
NEURO-FORCE/
├── index.js                 # Main entry point
├── package.json             # Node.js dependencies
├── .env                     # Environment variables
├── controllers/
│   ├── auth.js              # Authentication logic
│   ├── dashboard/
│   │   ├── controller_dashboard.js
│   │   └── attendance_WM_controller.js
│   └── workspace/
│       ├── workspace_controller.js
│       ├── workspace_invite_controller.js
│       └── workspace_Accept_controller.js
├── routers/
│   ├── main_route.js        # Main router
│   ├── authenticationroute.js
│   ├── dashboard_routers/
│   └── workspace_routers/
├── Middlewares/
│   ├── auth_middleware.js   # JWT verification
│   └── role_middleware.js   # RBAC middleware
├── prisma/
│   └── schema.prisma        # Database schema
├── lib/
│   └── prisma.js            # Prisma client
├── facial-attendance/       # Python facial recognition
│   ├── app.py               # FastAPI application
│   ├── facial_api.py        # CLI for facial ops
│   ├── requirements.txt
│   └── src/
│       ├── face_recognition.py
│       └── vector_db.py
└── scripts/
    └── start-services.sh    # Start all services
```

## 🔒 Authentication

All protected routes require a JWT token in the Authorization header:

```
Authorization: Bearer <your_token>
```

### Getting a Token

1. Register a user:
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "John Doe", "email": "john@example.com", "password": "password123"}'
```

2. Login to get token:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "john@example.com", "password": "password123"}'
```

3. Use the token:
```bash
curl http://localhost:3000/api/dashboard \
  -H "Authorization: Bearer <your_token>"
```

## 🔧 Development

### Running in Development Mode
```bash
npm run dev
```

### Database Commands
```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Open Prisma Studio
npx prisma studio
```

## 📄 License

ISC License - Ammar Khan

