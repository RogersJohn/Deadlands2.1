# Railway Environment Variables - CRITICAL SETUP

## URGENT: CORS Configuration Missing

### Problem
Frontend at `https://deadlands-frontend-production.up.railway.app` cannot access backend because `CORS_ORIGINS` is not set.

### Solution
Set the following environment variable in Railway Dashboard for the **backend service**:

## Required Environment Variables for Backend Service

### 1. CORS_ORIGINS (CRITICAL - Currently Missing)
```
CORS_ORIGINS=https://deadlands-frontend-production.up.railway.app
```

**What it does:** Allows the frontend to make API requests to the backend

**Without this:** Frontend gets CORS errors and cannot login or fetch data

### How to Set in Railway Dashboard

1. Go to: https://railway.app/dashboard
2. Select project: `deadlands-campaign-manager` (or similar)
3. Select service: `backend` (Java/Spring Boot service)
4. Click on **Variables** tab
5. Click **+ New Variable**
6. Add:
   - Name: `CORS_ORIGINS`
   - Value: `https://deadlands-frontend-production.up.railway.app`
7. Click **Add**
8. Railway will automatically redeploy the backend

### Other Required Variables (Should Already Exist)

These should already be set, but verify:

- `DATABASE_URL` - PostgreSQL connection string (Railway sets this automatically)
- `JWT_SECRET` - Secret for JWT token signing
- `ANTHROPIC_API_KEY` - For AI Gamemaster features (optional)

### After Setting CORS_ORIGINS

Within 2-3 minutes after adding the variable:
1. Railway will redeploy the backend
2. CORS errors will disappear
3. Login will work
4. You can access your old sessions

### Verify It Works

Run this test after setting the variable:
```bash
node verify-gamemaster-access.js
```

This will test login and session access.

## Current Status

- ❌ CORS_ORIGINS - NOT SET (causing login failures)
- ✅ Database migrations - Applied (V4 resets gamemaster password)
- ✅ Sessions data - Intact in database
- ✅ Gamemaster password - Reset to Test123!

## Next Steps

1. **Set CORS_ORIGINS in Railway Dashboard** (see above)
2. Wait for automatic redeploy (2-3 minutes)
3. Test login at: https://deadlands-frontend-production.up.railway.app
4. Use credentials:
   - Username: `gamemaster`
   - Password: `Test123!`
5. Access your 3 old sessions (Sess1, Sess1, Sess3)
