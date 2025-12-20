# Railway Service Rebuild Guide

**Date**: 2025-11-16
**Reason**: Railway deployment stuck with wrong/non-existent commit SHAs

## Pre-Rebuild Checklist

- [x] Environment variables documented
- [ ] PostgreSQL service identified (DO NOT DELETE)
- [ ] Frontend service identified (DO NOT DELETE)

## Step 1: Delete Old Backend Service

**CRITICAL**: Only delete the `deadlands-campaign-manager` service, NOT:
- ❌ Postgres service
- ❌ deadlands-frontend service
- ❌ postgres-volume

### How to Delete:

1. In Railway dashboard, click on `deadlands-campaign-manager` service card
2. Go to **Settings** tab (far right)
3. Scroll to the very bottom
4. Click **"Delete Service from All Environments"** (red button)
5. Type the service name to confirm: `deadlands-campaign-manager`
6. Click confirm

**CHECKPOINT**: After deletion, you should see:
- ✅ PostgreSQL service still exists
- ✅ deadlands-frontend service still exists
- ❌ deadlands-campaign-manager service is gone

---

## Step 2: Create New Backend Service

1. In Railway dashboard, in your `cozy-fulfillment` project
2. Click **"+ New"** button
3. Select **"GitHub Repo"**
4. Find and select: `RogersJohn/deadlands-campaign-manager`
5. Railway will ask: **"Which directory?"**
   - Select: `backend` (the backend folder)
6. Railway will auto-detect the Dockerfile

**CHECKPOINT**: Service created and initial build started

---

## Step 3: Configure Root Directory (IMPORTANT!)

Before deployment completes:

1. Click on the new service card
2. Go to **Settings** tab
3. Find **"Build"** section
4. Set **Root Directory**: `backend`
5. Set **Dockerfile Path**: `backend/Dockerfile`

**CHECKPOINT**: Settings saved

---

## Step 4: Set Environment Variables

Go to **Variables** tab and add these (based on your saved list):

**Required Variables:**
```
DATABASE_URL = <from Postgres service - use reference variable>
CORS_ALLOWED_ORIGINS = https://deadlands-frontend-production.up.railway.app
SPRING_PROFILES_ACTIVE = production
JWT_SECRET = <your JWT secret>
ANTHROPIC_API_KEY = <your Anthropic key>
```

**How to set DATABASE_URL:**
1. In Variables tab, click **"+ New Variable"**
2. For DATABASE_URL, click **"Add Reference"**
3. Select: `Postgres` → `DATABASE_URL`
4. This creates a live reference: `${{Postgres.DATABASE_URL}}`

**CHECKPOINT**: All environment variables set

---

## Step 5: Trigger Deployment

1. The service should auto-deploy after variables are set
2. If not, go to **Deployments** tab
3. Click **"Deploy"** button

**Expected behavior:**
- Build starts (Maven will download dependencies - takes 2-3 minutes)
- Build completes successfully
- Container starts
- Status shows "Active"

**CHECKPOINT**: Deployment shows "Active" status

---

## Step 6: Verify Deployment

### Check Commit SHA:
1. Go to **Deployments** tab
2. Click on the Active deployment
3. Verify commit SHA matches latest from GitHub (29473d7)

### Check Deploy Logs:
1. Click **Deploy Logs** tab
2. Look for this unique message:
   ```
   ===========================================
   🚀 DEPLOYMENT VERIFICATION - Commit 368ad2b
   📝 SecurityConfig: /sessions/** → permitAll()
   ===========================================
   ```

### Test Endpoints:
Run verification script:
```bash
node verify-deployment.js
```

**Expected result:**
```
✅ /api/ai-gm/health → 200
✅ /api/sessions → 200  (should be 200 with permitAll)
✅ /api/sessions/3 → 200
```

**CHECKPOINT**: All endpoints return 200

---

## Step 7: Update Frontend Environment Variable

The new backend service will have a new URL!

1. Go to **deadlands-frontend** service
2. Go to **Settings** → **Networking**
3. Copy the new public URL (e.g., `deadlands-campaign-manager-production-abc123.up.railway.app`)
4. Go to **Variables** tab
5. Update `VITE_API_URL` to: `https://<new-backend-url>/api`

**CHECKPOINT**: Frontend redeployed with new backend URL

---

## Step 8: Restore Proper Authentication

Once everything works with `permitAll()`, we'll restore proper security:

1. Remove `permitAll()` from `/sessions/**`
2. Replace with `.authenticated()`
3. Test with proper JWT token
4. Verify authentication works correctly

---

## Rollback Plan (If Needed)

If rebuild fails:
1. Keep the new service
2. Check build logs for errors
3. Verify Dockerfile path is correct
4. Verify environment variables are set
5. Don't panic - the database is safe and untouched

---

## Success Criteria

- ✅ New backend service created
- ✅ Deploying from correct GitHub repo
- ✅ Deploying latest commit (29473d7 or newer)
- ✅ All environment variables set correctly
- ✅ Endpoints returning 200 (with permitAll)
- ✅ Frontend connected to new backend
- ✅ Database connection working
