<img width="1915" height="958" alt="Gamified_Dashboard (2)" src="https://github.com/user-attachments/assets/48dabfa7-e82e-465b-b742-d52b9dc5d81b" /># MotionLearn

**An interactive gesture-based learning platform for children, powered by real-time hand tracking and AI.**

MotionLearn transforms education into an immersive, hands-free experience. Students learn Math, Science (Physics, Chemistry, Biology), and Coding by interacting with on-screen elements using hand gestures captured through their webcam. A full parental dashboard provides real-time analytics on their child's progress, achievements, and learning patterns.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Backend API](#backend-api)
- [Database Schema](#database-schema)
- [Modules Overview](#modules-overview)
- [Screenshots](#screenshots)
- [Team](#team)

---

## Features

### Student Experience
- **Hand-Tracking Gameplay** — MediaPipe Tasks Vision detects hand landmarks in real-time via webcam, allowing students to interact with falling letters, numbers, and molecules using their fingertips.
- **Multi-Subject Curriculum** — Structured 30-level progressions across Math (addition, subtraction, multiplication, division), Science (ionic compounds, acid-base reactions, combustion), and Coding (block-based pathfinding).
- **Adaptive Difficulty** — Five difficulty levels (Beginner to Expert) controlled by parents or auto-adjusted based on performance.
- **Achievements and Badges** — Earn badges like Champion, Speed Star, Genius, and Bullseye based on gameplay stats.

### Parental Dashboard
- **Real-Time Analytics** — Live performance overview showing time spent, levels completed, accuracy, and weekly progress trends.
- **Skill Mastery Visualization** — Circular progress indicators for Problem Solving, Logical Thinking, Speed, and Accuracy.
- **Learning Distribution** — Per-module time breakdown showing how much time the child spends on each subject.
- **Parental Controls** — Configurable daily playtime limits, difficulty levels, multiplayer toggles, and night mode restrictions.
- **Activity Timeline** — A 7-day bar chart showing daily engagement in minutes.

### Backend and Data
- **Supabase Integration** — PostgreSQL database with Row Level Security, real-time subscriptions, and built-in authentication.
- **Express API Server** — RESTful backend handling auth, session tracking, badge evaluation, and dashboard data aggregation.
- **Automatic Session Tracking** — Non-invasive DOM observer that records game sessions (scores, duration, questions solved) without modifying the core game logic.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML, CSS, JavaScript (Vanilla + Vite) |
| Hand Tracking | MediaPipe Tasks Vision (Hands Landmarker) |
| 3D Rendering | Three.js |
| Backend | Node.js, Express.js |
| Database | Supabase (PostgreSQL) |
| Authentication | Supabase Auth (Email/Password) |
| Deployment | Vite Dev Server + Node.js |

---

## Project Structure

```
MotionLearn/
|
|-- Frontend/
|   |-- index.html                    # Landing page
|   |-- vite.config.js                # Vite configuration
|   |-- package.json                  # Frontend dependencies
|   |
|   |-- public/
|       |-- dashboard.html            # Student dashboard (module selection)
|       |-- dashboard.css             # Dashboard styles
|       |-- dashboard.js              # Dashboard logic and routing
|       |-- parent-dashboard.html     # Parental analytics dashboard
|       |-- dashboard-data.js         # Live Supabase data loader for parent dashboard
|       |-- login.html                # Parent login / signup page
|       |-- supabaseClient.js         # Supabase client initialization (CDN)
|       |-- api.js                    # Frontend API helper (auth, sessions, badges)
|       |
|       |-- game-module/
|       |   |-- index.html            # Game interface (webcam + hand tracking)
|       |   |-- script.js             # Core game engine (3577 lines)
|       |   |-- style.css             # Game module styles
|       |   |-- tracking.js           # Non-invasive Supabase session tracker
|       |
|       |-- science/
|       |   |-- science-select.html   # Science module selection (Physics/Chemistry/Biology)
|       |   |-- physics.html          # Physics sandbox (velocity, gravity, projectiles)
|       |   |-- chemistry.html        # Chemistry module
|       |   |-- biology.html          # Biology module (3D organ viewer)
|       |   |-- models/
|       |       |-- brain.glb         # 3D brain model
|       |       |-- heart.glb         # 3D heart model
|       |       |-- skeleton.glb      # 3D skeleton model
|       |
|       |-- images/                   # All assets (posters, icons, backgrounds)
|
|-- Backend/
|   |-- server.js                     # Express API server (12 endpoints)
|   |-- supabase.js                   # Server-side Supabase client
|   |-- schema.sql                    # Database schema (7 tables + RLS + indexes)
|   |-- package.json                  # Backend dependencies
|   |-- .env                          # Environment variables (git-ignored)
|   |-- README.md                     # API documentation
|
|-- README.md                         # This file
```

---

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- A Supabase account ([supabase.com](https://supabase.com))
- A webcam (for hand-tracking gameplay)

### 1. Clone the Repository

```bash
git clone https://github.com/Sagarchhetri83/MotionLearn-ed005.git
cd MotionLearn-ed005
```

### 2. Set Up the Database

1. Create a new project on [Supabase](https://supabase.com)
2. Open the **SQL Editor** in your Supabase dashboard
3. Paste the contents of `Backend/schema.sql` and click **Run**
4. Go to **Authentication > Sign In / Providers** and disable **Confirm Email**

### 3. Configure Environment Variables

Create a `.env` file inside the `Backend/` directory:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_public_key
SUPABASE_SERVICE_KEY=your_service_role_key
PORT=3001
```

Update `Frontend/public/supabaseClient.js` with the same URL and anon key.

### 4. Install Dependencies

```bash
# Frontend
cd Frontend
npm install

# Backend
cd ../Backend
npm install
```

### 5. Run the Application

Open two terminals:

```bash
# Terminal 1 — Frontend (Vite dev server)
cd Frontend
npm run dev

# Terminal 2 — Backend (Express API)
cd Backend
npm run dev
```

The frontend will be available at `http://localhost:5173` and the backend API at `http://localhost:3001`.

---

## Backend API

All endpoints are prefixed with `/api`. Protected routes require a Bearer token in the Authorization header.

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/signup` | Create parent account with child profile |
| `POST` | `/api/auth/signin` | Sign in with email and password |
| `POST` | `/api/auth/signout` | Sign out (requires auth) |

### Game Sessions

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/sessions/start` | Start a new game session |
| `POST` | `/api/sessions/:id/end` | End session with score, duration, and question data |
| `GET` | `/api/sessions/:childId` | Get recent sessions for a child |

### Dashboard and Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/dashboard/:childId` | Full dashboard data (performance, skills, activity, badges) |
| `GET` | `/api/children` | List all children for the logged-in parent |
| `POST` | `/api/children` | Create a new child profile |
| `PUT` | `/api/controls/:childId` | Save parental control settings |
| `GET` | `/api/achievements/:childId` | Get earned badges for a child |

---

## Database Schema

The backend uses 7 PostgreSQL tables with Row Level Security:

| Table | Purpose |
|-------|---------|
| `parents` | Parent accounts (extends Supabase Auth) |
| `children` | Child profiles managed by parents |
| `game_sessions` | Individual gameplay records (module, level, score, duration, questions) |
| `daily_activity` | Aggregated daily stats for the activity chart |
| `skill_scores` | Per-child skill mastery (Problem Solving, Logical Thinking, Speed, Accuracy) |
| `achievements` | Earned badges and their criteria |
| `parental_controls` | Per-child settings (playtime limit, difficulty, toggles) |

All tables enforce Row Level Security so parents can only access their own children's data.

---

## Modules Overview

### Math Module
A 30-level curriculum covering:
- **Number Recognition** — Catch falling digits using hand gestures
- **Addition** — Single digit to five-digit problems (multiple choice with gesture selection)
- **Subtraction** — Progressive difficulty subtraction
- **Multiplication** — Times tables through multi-digit multiplication
- **Division** — Basic to advanced division problems

### Science Module
Three sub-modules with distinct gameplay:
- **Physics** — Interactive sandbox with velocity vectors, gravitational fields, and projectile motion simulation
- **Chemistry** — Drag atoms into a beaker to form compounds (NaCl, H2O, CO2, and more across 10 levels of increasing complexity)
- **Biology** — 3D organ viewer with interactive models (brain, heart, skeleton) rendered in Three.js/GLB

### Coding Module
Block-based programming challenges:
- Arrange directional blocks (Right, Down, Left, Up) to guide a character to a target on a grid
- Levels increase in path complexity and introduce distractor blocks

---

## Screenshots

> Screenshots will be added here showcasing the dashboard, game module, science selection, and parental analytics.
<img width="1900" height="895" alt="Landindpage" src="https://github.com/user-attachments/assets/d5a26c19-8286-4add-89e8-f734f5eb29a6" />
<img width="1915" height="958" alt="Gamified_Dashboard (2)" src="https://github.com/user-attachments/assets/e91183a9-857a-4e5c-b290-34b19b5fdbd8" />
<img width="1898" height="904" alt="Parental_Dashboard" src="https://github.com/user-attachments/assets/10d749f7-3f0d-4c76-8ae8-c2e9bef564e7" />
<img width="1918" height="904" alt="Maths_modules" src="https://github.com/user-attachments/assets/e1d9e11d-ec55-4f9d-9656-7d2766c1602c" />
<img width="1919" height="907" alt="Science_module" src="https://github.com/user-attachments/assets/b6fca3e7-0448-45f7-9676-a261099e8aec" />


---

## Team

Built by the Morpheus Builder team as an interactive learning platform that bridges the gap between play and education through gesture-based interaction.


---

## License

This project is developed for educational purposes.
