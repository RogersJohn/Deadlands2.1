# Game Arena v1.0 - Deployment Guide

## Overview
This guide covers the deployment process for Game Arena v1.0 to avoid issues encountered in previous deployments.

**Target Environment:** Production (Railway)
**Deployment Date:** Next Session
**Version:** 1.0.0

---

## Pre-Deployment Checklist

### 1. Code Quality
- [ ] All tests passing (`npm test` in frontend)
- [ ] No TypeScript errors (`npm run build` succeeds)
- [ ] No console errors in development
- [ ] Code reviewed and approved

### 2. Documentation
- [x] Feature documentation complete (GAME_ARENA_V1.md)
- [x] API documentation updated
- [x] Deployment guide created
- [x] Version changelog updated

### 3. Testing
- [ ] Unit tests passing (3 test files created)
- [ ] Manual testing complete
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] Mobile responsiveness verified
- [ ] Performance profiling complete

### 4. Database
- [ ] Migrations tested locally
- [ ] Backup created
- [ ] Production database credentials verified
- [ ] Data integrity checks passed

---

## Lessons Learned from Previous Deployments

### Issue 1: Environment Variables
**Problem:** Missing or incorrect environment variables caused runtime failures.

**Solution:**
1. Document all required environment variables
2. Verify variables in Railway dashboard before deployment
3. Use `.env.example` as template

**Required Variables:**
```bash
# Frontend (.env.production)
VITE_API_URL=https://your-backend-url.railway.app/api

# Backend (Railway environment variables)
DATABASE_URL=jdbc:postgresql://switchyard.proxy.rlwy.net:15935/railway
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=<from Railway>
CORS_ORIGINS=https://your-frontend-url.railway.app
SPRING_PROFILES_ACTIVE=proddb
```

### Issue 2: Build Process
**Problem:** Build failed due to dependency issues or TypeScript errors.

**Solution:**
1. Test build locally before deploying
2. Clear node_modules and reinstall
3. Verify all dependencies in package.json

**Build Commands:**
```bash
# Frontend
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run build
npm run preview  # Test production build locally

# Backend
cd backend
./mvnw clean package -DskipTests
java -jar target/deadlands-campaign-manager-1.3.2.jar  # Test JAR locally
```

### Issue 3: CORS Configuration
**Problem:** Frontend couldn't connect to backend due to CORS restrictions.

**Solution:**
1. Update CORS_ORIGINS with exact frontend URL
2. Include both HTTP and HTTPS if needed
3. No trailing slashes in URLs

**Configuration:**
```java
// backend/src/main/java/com/deadlands/config/SecurityConfig.java
@Value("${cors.origins}")
private String corsOrigins;

// Railway Environment Variable
CORS_ORIGINS=https://deadlands-frontend.railway.app
```

### Issue 4: Database Migrations
**Problem:** Schema changes not applied, causing runtime errors.

**Solution:**
1. Test migrations locally first
2. Create backup before deployment
3. Use Flyway for version control
4. Verify migration status after deployment

**Migration Checklist:**
```bash
# 1. Test locally
psql -U postgres -d deadlands_local < migrations/V1_0_0__initial.sql

# 2. Verify schema
psql -U postgres -d deadlands_local -c "\dt"

# 3. Check migration history
SELECT * FROM flyway_schema_history;
```

### Issue 5: Static Assets
**Problem:** Images and assets not loading in production.

**Solution:**
1. Use relative paths for assets
2. Verify build output includes assets
3. Check Content-Security-Policy headers

---

## Deployment Process

### Phase 1: Preparation (30 minutes)

#### 1.1 Version Bump
```bash
# Update version in package.json
cd frontend
npm version 1.0.0

# Update version in pom.xml
cd ../backend
# Edit pom.xml: <version>1.0.0</version>
```

#### 1.2 Run Tests
```bash
# Frontend tests
cd frontend
npm test

# Backend tests
cd backend
./mvnw test
```

#### 1.3 Build Verification
```bash
# Frontend build
cd frontend
npm run build
# Check dist/ folder created

# Backend build
cd backend
./mvnw clean package
# Check target/*.jar created
```

#### 1.4 Database Backup
```bash
# Backup production database
pg_dump -U postgres -h switchyard.proxy.rlwy.net -p 15935 railway > backup_pre_v1.0.sql

# Verify backup
ls -lh backup_pre_v1.0.sql
```

### Phase 2: Backend Deployment (15 minutes)

#### 2.1 Prepare Railway
1. Log into Railway dashboard
2. Select backend service
3. Navigate to Variables tab

#### 2.2 Verify Environment Variables
```
DATABASE_URL=jdbc:postgresql://switchyard.proxy.rlwy.net:15935/railway
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=wCwfSYwLvDslGeepWAiPYvxbEmEtzIhN
CORS_ORIGINS=https://deadlands-frontend.railway.app
SPRING_PROFILES_ACTIVE=proddb
PORT=8080
```

#### 2.3 Deploy
1. Push to main branch
2. Wait for automatic deployment
3. Monitor deployment logs
4. Verify health endpoint: `https://your-backend.railway.app/actuator/health`

#### 2.4 Verify Database
```bash
# Connect to production database
psql postgresql://postgres:wCwfSYwLvDslGeepWAiPYvxbEmEtzIhN@switchyard.proxy.rlwy.net:15935/railway

# Check tables exist
\dt

# Verify data
SELECT COUNT(*) FROM characters;
```

### Phase 3: Frontend Deployment (15 minutes)

#### 3.1 Update Environment
Create `frontend/.env.production`:
```bash
VITE_API_URL=https://your-backend.railway.app/api
```

#### 3.2 Build
```bash
cd frontend
npm run build
```

#### 3.3 Deploy to Railway
1. Push to main branch
2. Railway auto-detects and builds
3. Monitor deployment logs
4. Verify static assets loaded

#### 3.4 Test Endpoints
```bash
# Test API connection
curl https://your-backend.railway.app/api/characters

# Test frontend loads
curl -I https://your-frontend.railway.app
```

### Phase 4: Verification (30 minutes)

#### 4.1 Smoke Tests
- [ ] Frontend loads without errors
- [ ] Character list displays
- [ ] Can select character and start game
- [ ] Combat actions dropdown works
- [ ] Movement works
- [ ] Attack works
- [ ] Tooltips appear
- [ ] Range toggles work
- [ ] Movement budget displays
- [ ] Sprint action works
- [ ] End turn works

#### 4.2 Browser Testing
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge

#### 4.3 Performance Checks
- [ ] Page load < 2 seconds
- [ ] Game runs at 60 FPS
- [ ] No memory leaks
- [ ] API response < 500ms

#### 4.4 Error Monitoring
- [ ] No console errors
- [ ] No 404s for assets
- [ ] No CORS errors
- [ ] No database connection errors

---

## Rollback Plan

### If Deployment Fails

#### Option 1: Quick Rollback (Railway)
1. Go to Railway dashboard
2. Select service
3. Click "Deployments"
4. Click "Redeploy" on previous version

#### Option 2: Database Rollback
```bash
# Restore from backup
psql postgresql://postgres:PASSWORD@host:port/railway < backup_pre_v1.0.sql
```

#### Option 3: Code Revert
```bash
git revert <commit-hash>
git push origin main
# Railway will auto-deploy reverted version
```

---

## Post-Deployment

### Monitoring (First 24 hours)

#### Metrics to Watch
- [ ] Error rate (target: < 1%)
- [ ] Response time (target: < 500ms)
- [ ] Active users
- [ ] Database connections
- [ ] Memory usage
- [ ] CPU usage

#### Tools
- Railway metrics dashboard
- Browser console (for errors)
- Network tab (for failed requests)

### Communication
1. Announce deployment in project channels
2. Share release notes
3. Gather user feedback
4. Document issues and fixes

---

## Troubleshooting

### Common Issues

#### Issue: "Cannot connect to backend"
**Symptoms:** Frontend loads but no data

**Checks:**
1. Verify CORS_ORIGINS matches frontend URL
2. Check backend health endpoint
3. Verify environment variables
4. Check network tab for CORS errors

**Fix:**
```bash
# Update CORS_ORIGINS in Railway
CORS_ORIGINS=https://your-exact-frontend-url.railway.app
```

#### Issue: "Database connection failed"
**Symptoms:** Backend errors on startup

**Checks:**
1. Verify DATABASE_URL, USERNAME, PASSWORD
2. Check database is running
3. Verify network connectivity

**Fix:**
```bash
# Test connection
psql $DATABASE_URL

# Check Railway database status
railway status
```

#### Issue: "Assets not loading"
**Symptoms:** Broken images, missing styles

**Checks:**
1. Verify build includes assets
2. Check paths are relative
3. Check Content-Security-Policy

**Fix:**
```bash
# Rebuild frontend
cd frontend
npm run build

# Verify dist/ contains assets
ls -R dist/
```

#### Issue: "Game performance poor"
**Symptoms:** Low FPS, laggy

**Checks:**
1. Check browser console for errors
2. Verify WebGL support
3. Check memory usage

**Fix:**
```javascript
// Reduce grid size for testing
private readonly GRID_WIDTH = 100;
private readonly GRID_HEIGHT = 100;
```

---

## Emergency Contacts

### If All Else Fails
1. Check Railway status page
2. Review deployment logs
3. Test locally to isolate issue
4. Rollback to previous version
5. Fix issue in development
6. Re-deploy when ready

---

## Success Criteria

### Deployment is Successful When:
- [ ] All smoke tests pass
- [ ] No critical errors in logs
- [ ] Performance metrics meet targets
- [ ] Cross-browser compatibility confirmed
- [ ] User feedback is positive
- [ ] Monitoring shows healthy metrics

---

## Next Steps After Deployment
1. Monitor for 24 hours
2. Address any issues promptly
3. Gather user feedback
4. Plan v1.1 features
5. Update documentation with lessons learned

---

**Created:** 2025-11-10
**Last Updated:** 2025-11-10
**Status:** Ready for Use
