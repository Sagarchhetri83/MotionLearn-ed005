# MotionLearn Backend

Express.js backend server with Supabase integration for tracking student gameplay, managing parental dashboard data, and handling authentication.

## Setup

```bash
cd Backend
npm install
```

## Configuration

Create a `.env` file (already created) with your Supabase credentials:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_role_key
PORT=3001
```

## Run

```bash
npm run dev     # Development (auto-restart on changes)
npm start       # Production
```

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Create new parent account + child profile |
| POST | `/api/auth/signin` | Sign in with email + password |
| POST | `/api/auth/signout` | Sign out |

### Children
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/children` | Get all children for logged-in parent |
| POST | `/api/children` | Add a new child profile |

### Game Sessions
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/sessions/start` | Start a new game session |
| POST | `/api/sessions/:id/end` | End a session with score data |
| GET | `/api/sessions/:childId` | Get recent sessions for a child |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/:childId` | Full dashboard data (performance, skills, activity, badges) |
| PUT | `/api/controls/:childId` | Save parental control settings |
| GET | `/api/achievements/:childId` | Get earned badges |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Server health check |
