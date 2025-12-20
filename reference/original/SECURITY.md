# Security Policy

**Last Updated:** 2025-11-23

---

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please email the project maintainer. Do not create a public GitHub issue for security vulnerabilities.

---

## Security Fixes

### 2025-11-23: Migration Script Credentials Removed

**Issue:** Migration scripts (`migrate-*.js`) contained hardcoded database credentials.

**Fix:**
- All migration scripts moved to `archive/migration-scripts/` folder
- `archive/` folder added to `.gitignore`
- Migration scripts already excluded from git tracking via `.gitignore` (line 71)

**Impact:** No credentials were committed to git history. Files were only present locally.

**Verification:**
```bash
# Confirm files are not tracked
git ls-files migrate-*.js
# (Should return empty)

# Confirm archive folder is ignored
git check-ignore archive/
# (Should return: archive/)
```

---

## Security Best Practices

### 1. Credentials Management

✅ **DO:**
- Use environment variables for all credentials
- Store sensitive values in `.env` files (excluded from git)
- Use Railway environment variables for production
- Document required environment variables in README

❌ **DON'T:**
- Hardcode credentials in source files
- Commit `.env` files to git
- Share credentials in code comments
- Store production credentials in local files

### 2. Authentication

**Current Implementation:**
- JWT bearer tokens for API authentication
- Spring Security with role-based access control (RBAC)
- Password hashing with BCrypt
- Token expiration: 24 hours

**Security Features:**
- `@PreAuthorize` annotations on sensitive endpoints
- CSRF protection enabled
- CORS configured for frontend origin only
- WebSocket authentication via JWT headers

### 3. API Security

**Protected Endpoints:**
- `/api/game/*` - Requires authentication
- `/api/game/reset` - Requires `GAME_MASTER` role
- `/api/game/map/change` - Requires `GAME_MASTER` role
- `/api/game/turn/advance` - Requires `GAME_MASTER` role

**Public Endpoints:**
- `/api/auth/login`
- `/api/auth/register`

### 4. Database Security

**Configuration:**
- Production database uses Railway-managed PostgreSQL
- Connection strings stored in environment variables
- No direct database access from frontend
- Prepared statements prevent SQL injection

### 5. Frontend Security

**Implemented:**
- XSS protection via React's automatic escaping
- No `dangerouslySetInnerHTML` usage
- Content Security Policy headers
- Token storage in memory (Zustand store, not localStorage)

---

## Sensitive Files (Excluded from Git)

The following files/folders are excluded via `.gitignore`:

```
### Credentials & Environment
.env
.env.local
.env.production
frontend/.env
frontend/.env.local

### Database Scripts
migrate-*.js
archive/
list-users.js
test-login.js
update-all-passwords.js
update-password.js

### Production Configuration
backend/src/main/resources/application-proddb.yml
backend/run-with-prod-db.bat
Variables*.txt

### Deployment Scripts
monitor-deployment.js
verify-deployment.js
verify-new-deployment.js
```

---

## Environment Variables Required

### Backend (Production)
```bash
SPRING_DATASOURCE_URL=postgresql://...
SPRING_DATASOURCE_USERNAME=...
SPRING_DATASOURCE_PASSWORD=...
JWT_SECRET=...
ANTHROPIC_API_KEY=... (optional, for AI features)
```

### Frontend (Production)
```bash
VITE_API_URL=https://api.example.com
VITE_WS_URL=wss://api.example.com
```

---

## Security Checklist

When deploying or modifying the application, verify:

- [ ] No hardcoded credentials in source files
- [ ] All sensitive values in environment variables
- [ ] `.gitignore` excludes all sensitive files
- [ ] Production database uses strong passwords
- [ ] JWT secret is cryptographically secure
- [ ] CORS configured for production domain only
- [ ] HTTPS enforced in production
- [ ] Database connection uses SSL/TLS
- [ ] All dependencies up to date (no known vulnerabilities)
- [ ] Authentication required for all game endpoints
- [ ] Role-based access control enforced for GM actions

---

## Dependency Security

Run regular security audits:

```bash
# Backend (Maven)
cd backend
./mvnw dependency-check:check

# Frontend (npm)
cd frontend
npm audit
npm audit fix  # Apply automatic fixes
```

---

## Contact

For security concerns, contact the project maintainer.

**DO NOT** create public GitHub issues for security vulnerabilities.
