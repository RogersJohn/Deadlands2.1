# Pre-Deployment Testing Checklist

Before deploying to production, run through these tests locally to ensure all security improvements are working correctly.

## Setup for Testing

### 1. Rebuild with Latest Changes

```bash
# Stop existing containers
docker-compose down

# Rebuild with new code
docker-compose build

# Start fresh
docker-compose up -d

# Watch logs
docker-compose logs -f
```

### 2. Wait for Services to Start

Check that all services are healthy:

```bash
docker-compose ps
```

All services should show "Up" status.

---

## Test Suite

### ✅ Test 1: Rate Limiting - General API

**Test:** Verify rate limiting works on general API endpoints

```bash
# Install apache bench if needed: sudo apt-get install apache2-utils (Linux) or brew install ab (Mac)

# Try to exceed rate limit (100 req/min)
# First, get a token by logging in
TOKEN="your-jwt-token-here"

# Windows PowerShell:
for ($i=1; $i -le 105; $i++) {
  Invoke-RestMethod -Uri "http://localhost:8080/api/characters" -Headers @{Authorization="Bearer $TOKEN"}
}

# Linux/Mac:
for i in {1..105}; do
  curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/characters
done
```

**Expected Result:** After ~100 requests, you should start seeing:
```
429 Too Many Requests
Rate limit exceeded. Please try again later.
```

**Status:** ⬜ Pass  ⬜ Fail

---

### ✅ Test 2: Rate Limiting - Login Attempts

**Test:** Verify stricter rate limiting on login endpoint

```bash
# Windows PowerShell:
for ($i=1; $i -le 12; $i++) {
  Invoke-RestMethod -Method POST -Uri "http://localhost:8080/api/auth/login" `
    -Headers @{"Content-Type"="application/json"} `
    -Body '{"username":"test","password":"wrong"}'
}

# Linux/Mac:
for i in {1..12}; do
  curl -X POST http://localhost:8080/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"test","password":"wrong"}'
done
```

**Expected Result:** After 10 attempts, you should see:
```
429 Too Many Requests
Too many login attempts. Please try again later.
```

**Status:** ⬜ Pass  ⬜ Fail

---

### ✅ Test 3: JWT Secret Configuration

**Test:** Verify JWT secret is being used from environment

```bash
# Check that JWT_SECRET environment variable is set
docker exec deadlands-backend printenv | grep JWT_SECRET
```

**Expected Result:** Should show your secure JWT secret (512-bit)

**Status:** ⬜ Pass  ⬜ Fail

---

### ✅ Test 4: Password Change - Backend Endpoint

**Test:** Verify password change endpoint works

```bash
# First, login to get a token
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"player1","password":"password123"}' \
  | jq -r '.token'

# Copy the token, then test password change
curl -X POST http://localhost:8080/api/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "currentPassword":"password123",
    "newPassword":"NewSecurePassword123!",
    "confirmPassword":"NewSecurePassword123!"
  }'
```

**Expected Result:**
```
Password changed successfully!
```

**Status:** ⬜ Pass  ⬜ Fail

---

### ✅ Test 5: Password Change - Frontend UI

**Test:** Verify password change UI works

1. Open browser: http://localhost:3000
2. Login with: `username: player1, password: password123` (or new password if you ran test 4)
3. Navigate to: http://localhost:3000/change-password
4. Fill out form:
   - Current Password: (your current password)
   - New Password: TestPassword123!
   - Confirm: TestPassword123!
5. Click "Change Password"

**Expected Result:**
- Success message appears
- Redirects to dashboard after 2 seconds
- Can log in with new password

**Status:** ⬜ Pass  ⬜ Fail

---

### ✅ Test 6: CORS Configuration

**Test:** Verify CORS is properly configured

```bash
# Test from allowed origin (should work)
curl -X OPTIONS http://localhost:8080/api/characters \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET" \
  -i

# Test from disallowed origin (should fail)
curl -X OPTIONS http://localhost:8080/api/characters \
  -H "Origin: http://evil-site.com" \
  -H "Access-Control-Request-Method: GET" \
  -i
```

**Expected Result:**
- First request: `Access-Control-Allow-Origin: http://localhost:3000`
- Second request: No CORS headers or error

**Status:** ⬜ Pass  ⬜ Fail

---

### ✅ Test 7: Environment Variables in Docker

**Test:** Verify all environment variables are being read

```bash
# Check backend environment
docker exec deadlands-backend printenv | grep -E "DATABASE|JWT|CORS|SPRING"
```

**Expected Result:** Should show:
- `DATABASE_URL`
- `DATABASE_USERNAME`
- `DATABASE_PASSWORD`
- `JWT_SECRET`
- `JWT_EXPIRATION`
- `CORS_ORIGINS`
- `SPRING_PROFILES_ACTIVE`

**Status:** ⬜ Pass  ⬜ Fail

---

### ✅ Test 8: Production Profile Settings

**Test:** Verify production settings work

```bash
# Start with production profile
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up backend -d

# Check logs for profile
docker-compose logs backend | grep "The following 1 profile is active: production"
```

**Expected Result:** Backend should start with production profile active

**Status:** ⬜ Pass  ⬜ Fail

---

### ✅ Test 9: Database Connection

**Test:** Verify database connection is secure and working

```bash
# Check database connection
docker exec deadlands-db psql -U deadlands -d deadlands -c "SELECT COUNT(*) FROM users;"
```

**Expected Result:** Should return count of users (6 default users)

**Status:** ⬜ Pass  ⬜ Fail

---

### ✅ Test 10: Reference Data API (Public)

**Test:** Verify reference endpoints are public

```bash
# Should work without authentication
curl http://localhost:8080/api/reference/skills | jq '.[0]'
curl http://localhost:8080/api/reference/edges | jq '.[0]'
```

**Expected Result:** Returns JSON data without requiring JWT token

**Status:** ⬜ Pass  ⬜ Fail

---

### ✅ Test 11: Protected Endpoints

**Test:** Verify protected endpoints require authentication

```bash
# Try to access without token (should fail)
curl http://localhost:8080/api/characters

# Try to access with token (should work)
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8080/api/characters
```

**Expected Result:**
- First request: 401 Unauthorized or 403 Forbidden
- Second request: JSON array of characters

**Status:** ⬜ Pass  ⬜ Fail

---

### ✅ Test 12: Frontend Build

**Test:** Verify frontend builds correctly with environment variables

```bash
# Build frontend
cd frontend
npm run build

# Check for API URL in build
cat dist/index.html | grep -i "VITE_API_URL"
```

**Expected Result:** Build completes successfully with no errors

**Status:** ⬜ Pass  ⬜ Fail

---

### ✅ Test 13: Character Sheet Tooltips

**Test:** Verify reference data tooltips still work

1. Open browser: http://localhost:3000
2. Login and view a character
3. Hover over skills, edges, hindrances
4. Tooltips should show descriptions from reference data

**Expected Result:** Tooltips display with full descriptions

**Status:** ⬜ Pass  ⬜ Fail

---

### ✅ Test 14: Backend Health Check

**Test:** Verify backend is healthy

```bash
# Basic health check
curl http://localhost:8080/api/actuator/health
```

**Expected Result:**
```json
{"status":"UP"}
```

**Status:** ⬜ Pass  ⬜ Fail

---

## Integration Tests

### ✅ Test 15: Full User Journey

**Test:** Complete user workflow

1. Register new user → http://localhost:3000/register
   - Username: `testplayer`
   - Email: `test@example.com`
   - Password: `TestPassword123!`

2. Login with new user → http://localhost:3000/login

3. View dashboard → http://localhost:3000/dashboard

4. View a character → Click on any character

5. Change password → http://localhost:3000/change-password
   - Current: `TestPassword123!`
   - New: `NewPassword456!`

6. Logout and login with new password

**Expected Result:** All steps complete successfully

**Status:** ⬜ Pass  ⬜ Fail

---

## Performance Tests

### ✅ Test 16: Load Time

**Test:** Verify reasonable load times

```bash
# Test backend response time
time curl http://localhost:8080/api/reference/skills > /dev/null

# Test frontend load time
curl -w "@-" -o /dev/null -s "http://localhost:3000" <<'EOF'
    time_namelookup:  %{time_namelookup}s\n
       time_connect:  %{time_connect}s\n
    time_appconnect:  %{time_appconnect}s\n
      time_redirect:  %{time_redirect}s\n
   time_pretransfer:  %{time_pretransfer}s\n
 time_starttransfer:  %{time_starttransfer}s\n
                    ----------\n
         time_total:  %{time_total}s\n
EOF
```

**Expected Result:**
- Backend API: < 200ms
- Frontend: < 2 seconds

**Status:** ⬜ Pass  ⬜ Fail

---

## Security Tests

### ✅ Test 17: SQL Injection Protection

**Test:** Verify JPA protects against SQL injection

```bash
TOKEN="your-jwt-token"

# Try SQL injection in login
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin\" OR \"1\"=\"1","password":"anything"}'
```

**Expected Result:** Login fails, no SQL injection

**Status:** ⬜ Pass  ⬜ Fail

---

### ✅ Test 18: XSS Protection

**Test:** Verify React protects against XSS

1. Try to register with malicious username:
   - Username: `<script>alert('XSS')</script>`
   - Email: `xss@test.com`
   - Password: `Password123!`

2. View user on dashboard

**Expected Result:** Script tags are escaped, no alert fires

**Status:** ⬜ Pass  ⬜ Fail

---

## Summary

**Total Tests:** 18
**Passed:** ___
**Failed:** ___

### Critical Issues Found:

(List any failures here)

---

### Notes:

(Add any observations or issues encountered during testing)

---

## After All Tests Pass

1. ✅ All tests passing
2. ✅ No critical errors in logs
3. ✅ Ready for deployment
4. ✅ Review `DEPLOYMENT.md` for next steps
5. ✅ Update `CHANGELOG.md` with security improvements

**Date Tested:** ________________
**Tested By:** ________________
**Ready for Deployment:** ⬜ Yes  ⬜ No (explain why below)

**Notes:**
