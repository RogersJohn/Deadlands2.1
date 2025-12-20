# Quick Setup Guide

## First Time Setup

### 1. Install Prerequisites

**Windows:**
- Install Java 17: Download from [Adoptium](https://adoptium.net/)
- Install PostgreSQL: Download from [postgresql.org](https://www.postgresql.org/download/windows/)
- Install Node.js: Download from [nodejs.org](https://nodejs.org/)
- Install Git: Download from [git-scm.com](https://git-scm.com/)

**Verify installations:**
```bash
java -version    # Should show 17 or higher
node -version    # Should show 18 or higher
psql --version   # Should show 14 or higher
git --version
```

### 2. Setup Database

Open psql or pgAdmin and run:

```sql
CREATE DATABASE deadlands;
CREATE USER deadlands WITH PASSWORD 'deadlands123';
GRANT ALL PRIVILEGES ON DATABASE deadlands TO deadlands;
```

### 3. Configure Backend

```bash
cd backend
```

Copy the example configuration:
```bash
copy src\main\resources\application-local.yml.example src\main\resources\application-local.yml
```

Edit `application-local.yml` and update:
- Database password if you changed it
- JWT secret (use a long random string)

### 4. Start Backend

```bash
mvn clean install
mvn spring-boot:run
```

Wait for "Started CampaignManagerApplication" message.

### 5. Configure Frontend

Open a new terminal:

```bash
cd frontend
npm install
```

Copy environment file:
```bash
copy .env.example .env
```

### 6. Start Frontend

```bash
npm run dev
```

Visit http://localhost:3000

## Creating Your First User

1. Navigate to http://localhost:3000
2. Click "Register"
3. Fill in:
   - Username: your_username
   - Email: your@email.com
   - Password: (minimum 6 characters)
4. Click "Register"
5. Login with your credentials

## Making Yourself a Game Master

Connect to your database and run:

```sql
UPDATE users SET role = 'GAME_MASTER' WHERE username = 'your_username';
```

## Troubleshooting

### Backend won't start
- Check if PostgreSQL is running: `sc query postgresql-x64-14`
- Verify database exists: `psql -U postgres -c "\l"`
- Check port 8080 is available: `netstat -ano | findstr :8080`

### Frontend won't start
- Delete node_modules and reinstall: `rm -rf node_modules && npm install`
- Check port 3000 is available: `netstat -ano | findstr :3000`

### Can't login
- Check browser console for errors (F12)
- Verify backend is running on http://localhost:8080
- Check backend logs for authentication errors

### Database connection error
- Verify PostgreSQL service is running
- Check credentials in application-local.yml
- Test connection: `psql -U deadlands -d deadlands`

## IntelliJ IDEA Setup

1. Open IntelliJ IDEA
2. File → Open → Select `deadlands-campaign` folder
3. Import as Maven project
4. Wait for dependencies to download
5. Set Project SDK to Java 17:
   - File → Project Structure → Project SDK
6. Run configurations:
   - Add new Spring Boot configuration
   - Main class: `com.deadlands.campaign.CampaignManagerApplication`
   - Module: `campaign-manager`

## Next Steps

- [ ] Import existing character sheets
- [ ] Create wiki pages
- [ ] Set up GitHub repository
- [ ] Choose hosting platform
- [ ] Configure production environment

## Need Help?

Check the full README.md for detailed information about:
- Project structure
- API documentation
- Deployment options
- Development roadmap
