# System Architecture

## Overview

The Deadlands Campaign Manager is a full-stack web application built with a modern architecture separating concerns between frontend, backend, and database layers.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    User Browser                          │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │  React Frontend (TypeScript)                    │    │
│  │  - Material-UI Components                       │    │
│  │  - React Query (Data Fetching)                  │    │
│  │  - Zustand (State Management)                   │    │
│  │  - React Router (Navigation)                    │    │
│  └─────────────────┬────────────────────────────────┘    │
└────────────────────┼─────────────────────────────────────┘
                     │ HTTP/HTTPS
                     │ REST API + JWT
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Spring Boot Backend (Java)                  │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │  Security Layer                                 │    │
│  │  - JWT Authentication                           │    │
│  │  - Role-based Authorization                     │    │
│  │  - CORS Configuration                           │    │
│  └─────────────────┬────────────────────────────────┘    │
│                    │                                     │
│  ┌─────────────────┼────────────────────────────────┐    │
│  │  Controller Layer                               │    │
│  │  - AuthController                               │    │
│  │  - CharacterController                          │    │
│  │  - WikiController (future)                      │    │
│  └─────────────────┬────────────────────────────────┘    │
│                    │                                     │
│  ┌─────────────────┼────────────────────────────────┐    │
│  │  Service Layer                                   │    │
│  │  - Business Logic                                │    │
│  │  - Data Validation                               │    │
│  │  - Generator Logic (NPCs, Locations)            │    │
│  └─────────────────┬────────────────────────────────┘    │
│                    │                                     │
│  ┌─────────────────┼────────────────────────────────┐    │
│  │  Repository Layer (JPA)                          │    │
│  │  - UserRepository                                │    │
│  │  - CharacterRepository                           │    │
│  │  - WikiRepository (future)                       │    │
│  └─────────────────┬────────────────────────────────┘    │
└────────────────────┼─────────────────────────────────────┘
                     │ JDBC
                     ▼
┌─────────────────────────────────────────────────────────┐
│              PostgreSQL Database                         │
│                                                          │
│  Tables:                                                 │
│  - users                                                 │
│  - characters                                            │
│  - skills                                                │
│  - edges                                                 │
│  - hindrances                                            │
│  - equipment                                             │
│  - arcane_powers                                         │
│  - wounds                                                │
│  - wiki_pages (future)                                   │
│  - wiki_permissions (future)                             │
└─────────────────────────────────────────────────────────┘
```

## Technology Stack Details

### Frontend (React + TypeScript)

**Core Libraries:**
- **React 18** - UI framework with hooks
- **TypeScript** - Type safety
- **Vite** - Fast build tool and dev server
- **React Router** - Client-side routing

**State & Data:**
- **Zustand** - Lightweight state management for auth
- **React Query** - Server state management, caching, auto-refetch
- **Axios** - HTTP client with interceptors

**UI Framework:**
- **Material-UI v5** - Component library
- **Emotion** - CSS-in-JS styling
- **React Hook Form** - Form validation
- **Zod** - Schema validation

### Backend (Spring Boot)

**Core Framework:**
- **Spring Boot 3.2.1** - Application framework
- **Spring MVC** - REST API controllers
- **Spring Data JPA** - Database abstraction
- **Hibernate** - ORM implementation

**Security:**
- **Spring Security** - Authentication & authorization
- **JWT (jjwt)** - Token-based auth
- **BCrypt** - Password hashing

**Database:**
- **PostgreSQL** - Production database
- **H2** - In-memory database for testing

### Database Schema

**Core Entities:**

```sql
users
├── id (PK)
├── username (unique)
├── email (unique)
├── password (hashed)
├── role (PLAYER/GAME_MASTER)
├── active (boolean)
└── timestamps

characters
├── id (PK)
├── player_id (FK → users)
├── name
├── occupation
├── attributes (8 dice values)
├── derived_stats (pace, size, wind, grit)
├── is_npc (boolean)
└── timestamps

skills (one-to-many with characters)
├── id (PK)
├── character_id (FK)
├── name
├── die_value
├── category
└── notes

edges (one-to-many with characters)
├── id (PK)
├── character_id (FK)
├── name
├── description
└── type

hindrances (one-to-many with characters)
├── id (PK)
├── character_id (FK)
├── name
├── description
└── severity

equipment (one-to-many with characters)
├── id (PK)
├── character_id (FK)
├── name
├── type
├── weapon stats (damage, range, etc.)
└── is_equipped

arcane_powers (one-to-many with characters)
├── id (PK)
├── character_id (FK)
├── name
├── type
├── stats (speed, duration, range)
└── notes

wounds (one-to-many with characters)
├── id (PK)
├── character_id (FK)
├── location (HEAD, ARMS, GUTS, LEGS)
├── severity
└── is_healed
```

## Security Architecture

### Authentication Flow

1. User submits credentials to `/auth/login`
2. Backend validates username/password
3. If valid, generates JWT token with user info
4. Frontend stores token in localStorage (via Zustand persist)
5. All subsequent requests include token in `Authorization: Bearer <token>` header
6. JWT filter validates token on each request
7. Spring Security loads user details and grants access

### Authorization

**Role Hierarchy:**
- **PLAYER** - Can view/edit own characters, access unlocked wiki
- **GAME_MASTER** - Full access to all characters, NPCs, wiki management

**Endpoint Security:**
```java
/auth/**              → Public
/api/characters/**    → PLAYER, GAME_MASTER
/api/wiki/**          → PLAYER, GAME_MASTER (filtered by permissions)
/api/admin/**         → GAME_MASTER only
```

## Data Flow

### Character Retrieval Example

```
User clicks "View Character"
        ↓
React Router → /character/:id
        ↓
Component loads → useQuery(['character', id])
        ↓
React Query checks cache
        ↓
If stale/missing → axios.get('/api/characters/:id')
        ↓
Request interceptor adds JWT token
        ↓
Spring Security validates token
        ↓
CharacterController.getCharacterById()
        ↓
Checks user permission (owner or GM)
        ↓
CharacterRepository.findById()
        ↓
JPA/Hibernate executes SQL
        ↓
PostgreSQL returns data
        ↓
Entity mapped to JSON
        ↓
Response sent to frontend
        ↓
React Query caches result
        ↓
Component renders character sheet
```

## Deployment Architecture

### Development
```
Frontend: Vite dev server (localhost:3000)
Backend: Spring Boot embedded Tomcat (localhost:8080)
Database: Local PostgreSQL (localhost:5432)
```

### Production (Railway/Render)
```
Frontend: Static files on CDN/nginx
Backend: Java container
Database: Managed PostgreSQL
```

### Docker Compose
```
All three services in containers
Connected via Docker network
Persistent volume for database
```

## Future Enhancements

### Planned Features

1. **Wiki System**
   - Markdown editor
   - Permission-based unlocking
   - Categories and tags
   - Search functionality

2. **Generators**
   - NPC generator using Deadlands tables
   - Location generator
   - Random encounter tables
   - Loot generator

3. **Real-time Features**
   - WebSocket for live updates
   - Initiative tracker
   - Shared combat log

4. **File Management**
   - Character portrait uploads
   - Session notes as PDFs
   - Export character sheets

## Performance Considerations

- **Frontend**: Code splitting, lazy loading, React Query caching
- **Backend**: JPA lazy loading, connection pooling, query optimization
- **Database**: Indexes on foreign keys, materialized views for complex queries
- **Caching**: Redis for session data (future)

## Security Considerations

- HTTPS only in production
- CORS restricted to frontend domain
- JWT tokens with short expiration
- Input validation on all endpoints
- SQL injection prevention via JPA
- XSS prevention via React's built-in escaping
- Password strength requirements
- Rate limiting (future)
