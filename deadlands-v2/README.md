# Deadlands V2 - Campaign Manager

A complete rebuild of the Deadlands TTRPG campaign management system.

## Tech Stack

- **Backend:** Spring Boot 3.2, Java 17, PostgreSQL, Flyway
- **Frontend:** React 18, TypeScript (strict mode), Vite, React Query, Zustand
- **Deployment:** Docker, Railway

## Quick Start

### Prerequisites
- Java 17+
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 14+ (or use Docker)

### Local Development

1. **Start the database:**
   ```bash
   docker-compose up -d postgres
   ```

2. **Run the backend:**
   ```bash
   cd backend
   ./mvnw spring-boot:run
   ```

3. **Run the frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

### Using Docker Compose

```bash
docker-compose up
```

- Backend: http://localhost:8080
- Frontend: http://localhost:3000

## Project Structure

```
deadlands-v2/
├── .github/workflows/     # CI/CD pipelines
├── .claude/               # Claude Code task tracking
├── backend/               # Spring Boot application
├── frontend/              # React application
├── docker-compose.yml     # Local development setup
└── railway.json           # Railway deployment config
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [API Reference](docs/API.md)
- [Development Guide](docs/DEVELOPMENT.md)

## License

Private project - All rights reserved.
