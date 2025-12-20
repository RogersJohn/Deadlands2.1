# Quickstart Guide - Getting Your Campaign Running

This guide will get your Deadlands Campaign Manager running with all 7 characters imported in under 15 minutes.

## Prerequisites Check

Before starting, ensure you have:
- ✓ Java 17+ installed (`java -version`)
- ✓ PostgreSQL 14+ installed and running
- ✓ Node.js 18+ installed (`node -version`)
- ✓ Maven installed (`mvn -version`)

## Step-by-Step Setup

### 1. Create Database (2 minutes)

Open a terminal/command prompt and create the database:

**Windows (Command Prompt):**
```cmd
psql -U postgres
```

**Once in psql:**
```sql
CREATE DATABASE deadlands;
CREATE USER deadlands WITH PASSWORD 'deadlands123';
GRANT ALL PRIVILEGES ON DATABASE deadlands TO deadlands;
\q
```

### 2. Start the Backend (3 minutes)

Open a terminal in the project directory:

```bash
cd backend
mvn spring-boot:run
```

Wait for this message:
```
Started CampaignManagerApplication in X.XXX seconds
```

**This automatically:**
- Creates all database tables
- Imports all 7 characters
- Creates 6 user accounts
- Sets up authentication

Leave this terminal running.

### 3. Start the Frontend (2 minutes)

Open a **new terminal** in the project directory:

```bash
cd frontend
npm install
npm run dev
```

Wait for:
```
Local: http://localhost:3000
```

### 4. Login and View Characters (1 minute)

1. Open browser: http://localhost:3000
2. Login with:
   - Username: `gamemaster`
   - Password: `password123`
3. You should see the Dashboard with access to all characters

## What You Get

### 7 Imported Characters

✓ **Mexicali Bob** - Apprentice Shaman with martial arts
✓ **Cornelius Wilberforce III** - Wealthy scholar
✓ **Doc Emett Von Braun** - Mad scientist (1863)
✓ **John Henry Farraday** - Doctor/Hexslinger
✓ **Jack Horner** - Old prospector with limp
✓ **Lucas Turner** - Gunslinger/Marshal
✓ **George C Dobbs** - Basic template

### 6 User Accounts

- `gamemaster` - See and edit all characters (GAME_MASTER role)
- `player1` through `player6` - Players (PLAYER role)

All accounts use password: `password123` (change this!)

### Complete Character Data

Each character includes:
- All 8 attributes (Cognition, Deftness, etc.)
- Skills with die values
- Edges and Hindrances
- Equipment and weapons
- Arcane powers (for supernatural characters)
- Character notes

## Verify Import Success

### Check via Web Interface

1. Login as `gamemaster`
2. Dashboard should show 7 characters
3. Click on "Mexicali Bob" to view full character sheet
4. You should see all attributes, skills visible

### Check via Database

```bash
psql -U deadlands -d deadlands
```

```sql
-- Should show 7
SELECT COUNT(*) FROM characters;

-- Should show all character names
SELECT id, name, occupation FROM characters;

-- Should show lots of skills for Mexicali Bob
SELECT COUNT(*) FROM skills WHERE character_id = 1;

-- Exit
\q
```

## Quick Reference

### Start Development Environment

Terminal 1:
```bash
cd backend && mvn spring-boot:run
```

Terminal 2:
```bash
cd frontend && npm run dev
```

Browser: http://localhost:3000

### Default Logins

| User | Password | Access |
|------|----------|--------|
| gamemaster | password123 | All characters |
| player2 | password123 | Mexicali Bob, Lucas Turner |
| player3 | password123 | Cornelius, George Dobbs |
| player4 | password123 | Doc Von Braun |
| player5 | password123 | Doc Farraday |
| player6 | password123 | Jack Horner |

### Stopping the Application

- Press `Ctrl+C` in both terminal windows
- PostgreSQL keeps running (your data is safe)

### Restarting

Just run the commands in "Start Development Environment" again. Data persists in PostgreSQL.

## Next Steps

Now that everything is running:

1. **Change Passwords**: Update all default passwords
2. **Review Characters**: Check each character sheet for accuracy
3. **Assign to Players**: Link characters to your actual player accounts
4. **Upload Images**: Add character portraits (feature coming soon)
5. **Start Playing**: Begin using for your campaign!

## Common Issues

### Port 8080 already in use
Another application is using port 8080. Stop it or change the backend port in `application.yml`:
```yaml
server:
  port: 8081
```

### Port 3000 already in use
Change frontend port in `vite.config.ts` or stop the other application.

### Database connection failed
- Check PostgreSQL is running: `sc query postgresql-x64-14` (Windows)
- Verify credentials in `application.yml`
- Test connection: `psql -U deadlands -d deadlands`

### Characters not showing
Check backend logs for errors. Ensure `data.sql` ran successfully:
```sql
SELECT COUNT(*) FROM characters;
```
Should return 7.

### Login fails
- Ensure backend is running (check http://localhost:8080/api)
- Check browser console (F12) for errors
- Verify username is correct (case sensitive)

## Testing the API

You can test the API directly:

```bash
# Login
curl -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"gamemaster","password":"password123"}'

# Copy the token from response, then:
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  http://localhost:8080/api/characters
```

## Using with IntelliJ IDEA

1. Open the project folder in IntelliJ
2. Import as Maven project
3. Set JDK to 17
4. Right-click `CampaignManagerApplication.java` → Run
5. Frontend still needs terminal: `cd frontend && npm run dev`

## Development Workflow

### Making Changes to Characters

Currently via SQL:
```sql
UPDATE characters SET grit = 2 WHERE name = 'Mexicali Bob';
```

Soon: Web-based character editor (in development)

### Adding New Characters

Via SQL (see CHARACTER_IMPORT.md) or wait for web-based character creation form.

### Viewing Logs

Backend logs appear in the terminal running `mvn spring-boot:run`
Frontend logs appear in browser console (F12)

## Performance

First startup: ~30 seconds (downloads dependencies, creates tables, imports data)
Subsequent startups: ~10 seconds
Database queries: <100ms
Frontend load: <2 seconds

## Data Location

Your character data is stored in PostgreSQL database `deadlands`
Location varies by OS:
- Windows: `C:\Program Files\PostgreSQL\14\data`
- Mac: `/usr/local/var/postgres`
- Linux: `/var/lib/postgresql/14/main`

## Backing Up Your Data

```bash
pg_dump -U deadlands deadlands > backup.sql
```

Restore:
```bash
psql -U deadlands deadlands < backup.sql
```

## Need More Help?

- Full setup guide: See `SETUP.md`
- Character import details: See `CHARACTER_IMPORT.md`
- Technical architecture: See `ARCHITECTURE.md`
- Project overview: See `README.md`

## Success!

If you can see all 7 characters in the web interface, you're ready to run your campaign!

Happy gaming in the Weird West! 🤠
