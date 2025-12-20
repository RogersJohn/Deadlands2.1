# Deployment Guide - Deadlands Campaign Manager

This guide will help you deploy the Deadlands Campaign Manager to Railway.app for private use by your gaming group.

## Pre-Deployment Checklist

Before deploying, ensure you've completed these security steps:

- [ ] Generated secure JWT secret (already done in `.env.production`)
- [ ] Changed all default passwords (update in Railway dashboard after deployment)
- [ ] Reviewed `.env.production.example` and understand all variables
- [ ] Committed latest code to GitHub
- [ ] Rate limiting is enabled (already implemented)
- [ ] Password change functionality is working

## Option 1: Deploy to Railway.app (Recommended for Private Use)

Railway.app offers a free tier perfect for small gaming groups.

### Step 1: Create Railway Account

1. Go to [railway.app](https://railway.app)
2. Click "Login" and sign in with GitHub
3. Authorize Railway to access your repositories

### Step 2: Create New Project

1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose your `deadlands-campaign-manager` repository
4. Railway will detect the Docker Compose configuration

### Step 3: Add PostgreSQL Database

1. In your Railway project, click "+ New"
2. Select "Database" → "PostgreSQL"
3. Railway will provision a PostgreSQL database
4. Copy the connection details (you'll need these later)

### Step 4: Configure Environment Variables

Click on your backend service, go to "Variables" tab, and add:

```bash
# Database (Railway provides these automatically if you linked the database)
DATABASE_URL=jdbc:postgresql://<hostname>:<port>/<database>
DATABASE_USERNAME=<username>
DATABASE_PASSWORD=<password>

# JWT Secret (from .env.production)
JWT_SECRET=UMy/hBg+bJlRgKtugAeh4RGoUg5kIUkzgKFy3dNvXBJq7qS2Kz0gLrb8AKfcArDI0JkOZj44uI1PP1UGYkvNqg==
JWT_EXPIRATION=86400000

# CORS (update with your frontend URL after frontend is deployed)
CORS_ORIGINS=https://your-frontend-url.up.railway.app

# Application
SPRING_PROFILES_ACTIVE=production
LOG_LEVEL=INFO
```

### Step 5: Configure Frontend

Click on your frontend service, go to "Variables" tab, and add:

```bash
# API URL (update with your backend URL)
VITE_API_URL=https://your-backend-url.up.railway.app/api
```

### Step 6: Deploy

1. Railway will automatically deploy when you push to GitHub
2. Wait for both services to deploy (check the "Deployments" tab)
3. Once deployed, Railway will provide public URLs for both services

### Step 7: Update Environment Variables with Real URLs

1. Copy the backend URL from Railway
2. Update frontend's `VITE_API_URL` with the backend URL
3. Copy the frontend URL from Railway
4. Update backend's `CORS_ORIGINS` with the frontend URL
5. Railway will automatically redeploy with new variables

### Step 8: Initialize Database

The database tables will be created automatically on first run thanks to Hibernate's `ddl-auto: update`.

To import your characters:

1. Use Railway's PostgreSQL console or connect via `psql`:
   ```bash
   psql postgresql://<connection-string-from-railway>
   ```
2. Run your character import SQL or use the API endpoints

### Step 9: Force Password Changes

**CRITICAL:** All your users are still using `password123`. Force them to change passwords:

1. Share the app URL with your players
2. Have each player log in and immediately go to `/change-password`
3. Or manually reset passwords via database:
   ```sql
   -- Generate a temporary password hash
   -- Then update each user
   UPDATE users SET password = '<bcrypt-hash-here>' WHERE username = 'player1';
   ```

### Step 10: Test Everything

- [ ] Backend health check: `https://your-backend.railway.app/api/auth/login` (should return 405 or login page)
- [ ] Frontend loads: `https://your-frontend.railway.app`
- [ ] Login works with existing credentials
- [ ] Character sheets display correctly
- [ ] Password change functionality works
- [ ] Reference data tooltips work

---

## Option 2: Deploy to Render.com

Render is another excellent option with a free tier.

### Step 1: Create Render Account

1. Go to [render.com](https://render.com)
2. Sign up with GitHub

### Step 2: Create PostgreSQL Database

1. Click "New +" → "PostgreSQL"
2. Name: `deadlands-db`
3. Select "Free" tier
4. Click "Create Database"
5. Copy the "Internal Database URL" (starts with `postgres://`)

### Step 3: Create Backend Web Service

1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Configure:
   - **Name:** `deadlands-backend`
   - **Environment:** `Docker`
   - **Region:** Select closest to you
   - **Plan:** Free
   - **Dockerfile Path:** `backend/Dockerfile`
   - **Docker Context Directory:** `backend`

4. Add Environment Variables:
   ```
   DATABASE_URL=jdbc:postgresql://<from-step-2>
   DATABASE_USERNAME=<from-render-db>
   DATABASE_PASSWORD=<from-render-db>
   JWT_SECRET=<from-.env.production>
   CORS_ORIGINS=https://deadlands-frontend.onrender.com
   SPRING_PROFILES_ACTIVE=production
   LOG_LEVEL=INFO
   ```

5. Click "Create Web Service"

### Step 4: Create Frontend Web Service

1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Configure:
   - **Name:** `deadlands-frontend`
   - **Environment:** `Docker`
   - **Plan:** Free
   - **Dockerfile Path:** `frontend/Dockerfile`
   - **Docker Context Directory:** `frontend`

4. Add Environment Variables:
   ```
   VITE_API_URL=https://deadlands-backend.onrender.com/api
   ```

5. Click "Create Web Service"

### Step 5: Update CORS

Once both services are deployed:

1. Note the URLs Render assigned (e.g., `deadlands-frontend.onrender.com`)
2. Update backend's `CORS_ORIGINS` environment variable
3. Trigger a redeploy

---

## Option 3: Self-Hosted with Docker

If you want to host on your own server:

### Prerequisites

- Server with Docker and Docker Compose installed
- Domain name (optional but recommended)
- SSL certificate (use Let's Encrypt with Certbot)

### Step 1: Prepare Server

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt-get install docker-compose-plugin
```

### Step 2: Clone Repository

```bash
git clone https://github.com/your-username/deadlands-campaign-manager.git
cd deadlands-campaign-manager
```

### Step 3: Configure Environment

```bash
# Copy and edit production environment
cp .env.production.example .env.production
nano .env.production

# Update all placeholder values:
# - DATABASE_PASSWORD
# - CORS_ORIGINS (your domain)
# - VITE_API_URL (your domain)
```

### Step 4: Deploy

```bash
# Build and start services
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Check logs
docker-compose logs -f
```

### Step 5: Set Up Nginx Reverse Proxy (Optional)

```nginx
# /etc/nginx/sites-available/deadlands
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /api {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### Step 6: Set Up SSL with Let's Encrypt

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## Post-Deployment Security Steps

### 1. Force Password Changes

Create a database script or admin interface to mark all users as requiring password change:

```sql
ALTER TABLE users ADD COLUMN must_change_password BOOLEAN DEFAULT false;
UPDATE users SET must_change_password = true WHERE username != 'gamemaster';
```

### 2. Monitor Rate Limiting

Check logs for rate limiting events:

```bash
# Railway
railway logs

# Render
# View logs in dashboard

# Self-hosted
docker-compose logs backend | grep "Rate limit"
```

### 3. Set Up Monitoring

- Railway: Built-in monitoring in dashboard
- Render: Built-in monitoring in dashboard
- Self-hosted: Consider using Prometheus + Grafana

### 4. Backup Strategy

**Railway/Render:**
- Set up automatic database backups in dashboard
- Export character data weekly via API

**Self-hosted:**
```bash
# Automated backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker exec deadlands-db pg_dump -U deadlands deadlands > backup_$DATE.sql
```

### 5. Update CHANGELOG

Document your deployment in `CHANGELOG.md`:

```markdown
## [1.0.1] - YYYY-MM-DD

### Deployed
- Deployed to Railway/Render for private use
- Forced password changes for all users
- Rate limiting active at 100 req/min
```

---

## Troubleshooting

### Backend won't start

**Check logs:**
```bash
railway logs  # Railway
# Or check Render dashboard
# Or: docker-compose logs backend
```

**Common issues:**
- Database connection failed → Check `DATABASE_URL` format
- JWT secret too short → Must be at least 256 bits
- Port already in use → Change `SERVER_PORT`

### Frontend can't connect to backend

**Check:**
1. `VITE_API_URL` is correct (includes `/api` at the end)
2. `CORS_ORIGINS` in backend matches frontend URL
3. Both services are running

**Test backend:**
```bash
curl https://your-backend-url.com/api/auth/login
# Should return method not allowed or login error
```

### Database migrations needed

If you need to run migrations manually:

```bash
# Railway
railway connect postgres

# Render
# Use "Connect" button in PostgreSQL dashboard

# Self-hosted
docker exec -it deadlands-db psql -U deadlands -d deadlands
```

### Rate limiting too strict

Adjust in `RateLimitService.java`:

```java
// Change from 100 to 200 requests per minute
Bandwidth limit = Bandwidth.classic(200, Refill.intervally(200, Duration.ofMinutes(1)));
```

---

## Maintenance

### Update Application

**Railway/Render:**
1. Push to GitHub
2. Automatic deployment triggered
3. Monitor deployment logs

**Self-hosted:**
```bash
git pull origin main
docker-compose build
docker-compose up -d
```

### Scale Up

**Railway/Render:**
- Upgrade to paid tier for more resources
- Adjust database connection pool size in `application-production.yml`

**Self-hosted:**
- Update `docker-compose.prod.yml` memory limits
- Add read replicas for database

---

## Cost Estimates

### Railway (Free Tier)
- **Cost:** $0/month
- **Limits:** 500 hours/month, shared resources
- **Best for:** 2-10 players, casual use

### Railway (Hobby Plan)
- **Cost:** $5/month per service
- **Resources:** More CPU/memory
- **Best for:** Regular weekly games, 10+ players

### Render (Free Tier)
- **Cost:** $0/month
- **Limits:** Spins down after inactivity, shared resources
- **Best for:** Testing, very casual use

### Render (Starter Plan)
- **Cost:** $7/month per service
- **Resources:** Always-on, dedicated resources
- **Best for:** Regular games, better performance

### Self-Hosted
- **Cost:** VPS from $5-20/month (DigitalOcean, Linode, Vultr)
- **Resources:** Full control
- **Best for:** Technical users, cost-conscious, need full control

---

## Support

If you encounter issues:

1. Check this guide's troubleshooting section
2. Review Railway/Render documentation
3. Check application logs for errors
4. Review `SESSION_STATUS.md` for known issues

---

## Next Steps After Deployment

1. **Invite Your Players**
   - Share the frontend URL
   - Provide temporary login credentials
   - Have them change passwords immediately

2. **Import Remaining Characters**
   - Use the API or database console
   - Verify all character data displays correctly

3. **Set Up Backup Schedule**
   - Weekly database exports
   - Store backups securely

4. **Monitor Performance**
   - Check response times
   - Monitor rate limiting effectiveness
   - Review logs for errors

5. **Plan Feature Rollout**
   - Character creation wizard
   - Campaign wiki
   - Dice roller
   - See `SESSION_STATUS.md` for roadmap

---

**Congratulations!** Your Deadlands Campaign Manager is now deployed and ready for your gaming group!

Remember to keep your secrets secure and never commit `.env.production` to git.

Happy gaming in the Weird West! 🤠
