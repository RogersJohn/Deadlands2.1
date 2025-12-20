# Deadlands Autonomous Refactor Setup

This package contains everything needed to run an autonomous Claude Code refactor of the Deadlands Campaign Manager.

## Files Included

```
├── CLAUDE_CODE_PROMPT.md          # The main prompt to give Claude Code
├── run-autonomous.sh              # Script to run Claude Code in a loop
├── railway.json                   # Railway deployment config
└── .github/
    └── workflows/
        ├── ci.yml                 # Test/lint on PRs
        ├── auto-merge.yml         # Auto-merge PRs with passing checks
        ├── deploy-preview.yml     # Deploy PR previews
        ├── deploy-production.yml  # Deploy main to production
        └── autonomous-continue.yml # Trigger next task after merge
```

## Prerequisites

1. **Claude Code CLI**
   ```bash
   npm install -g @anthropic-ai/claude-code
   claude login
   ```

2. **GitHub CLI**
   ```bash
   # macOS
   brew install gh
   
   # Windows
   winget install GitHub.cli
   
   # Then authenticate
   gh auth login
   ```

3. **Railway Account** (for deployment)
   - Sign up at https://railway.app
   - Get API token from Settings > Tokens
   
## Setup Steps

### 1. Create New GitHub Repository

```bash
# Create and clone new repo
gh repo create deadlands-v2 --public --clone
cd deadlands-v2
```

### 2. Copy Workflow Files

```bash
# Copy the .github folder from this package
cp -r /path/to/deadlands-autonomous-setup/.github .
cp /path/to/deadlands-autonomous-setup/railway.json .
cp /path/to/deadlands-autonomous-setup/run-autonomous.sh .
chmod +x run-autonomous.sh
```

### 3. Configure GitHub Secrets

Go to your repo Settings > Secrets and variables > Actions, add:

- `RAILWAY_TOKEN`: Your Railway API token

### 4. Configure Branch Protection (Optional but Recommended)

Settings > Branches > Add rule for `main`:
- Require status checks to pass before merging
- Require branches to be up to date before merging
- Select required checks: `backend-test`, `frontend-test`, `build-check`

### 5. Start Claude Code with the Prompt

```bash
# Option A: Interactive start, then go autonomous
claude

# Paste the contents of CLAUDE_CODE_PROMPT.md
# Let it complete initial setup
# Then run the autonomous script

# Option B: Direct autonomous run
./run-autonomous.sh 30  # Run up to 30 iterations
```

### 6. Run Overnight

```bash
# Run in background, immune to terminal disconnect
nohup ./run-autonomous.sh 50 > autonomous.log 2>&1 &

# Or use screen/tmux
screen -S deadlands
./run-autonomous.sh 50
# Ctrl+A, D to detach
# screen -r deadlands to reattach
```

## Monitoring Progress

### While Running
```bash
# Watch the log
tail -f autonomous-*.log

# Check open PRs
gh pr list

# Check task queue status
cat .claude/task-queue.md | grep -E "\[.\]"
```

### After Running
```bash
# Review progress
cat .claude/PROGRESS.md

# Check stuck tasks
cat .claude/STUCK.md

# Review and merge PRs
gh pr list
gh pr view <number>
gh pr merge <number>
```

## Stopping the Autonomous Run

```bash
# Graceful stop (finishes current task)
touch .claude/STOP

# Hard stop
pkill -f "run-autonomous"
```

## Manual Intervention

If tasks get stuck:

1. Check `.claude/STUCK.md` for details
2. Fix the issue manually or provide guidance
3. Remove `[STUCK]` marker from task-queue.md
4. Restart autonomous run

## Deployment URLs

After Railway is configured:
- **Production**: Deploys automatically on merge to main
- **Preview**: Each PR gets a unique preview URL (posted as PR comment)

## Troubleshooting

### Claude Code session disconnects
The `run-autonomous.sh` script handles this by starting fresh iterations. Each iteration is independent.

### PR merge conflicts
Auto-merge will fail. Manually resolve conflicts:
```bash
gh pr checkout <number>
git merge main
# resolve conflicts
git push
```

### Railway deployment fails
Check Railway dashboard for logs. Common issues:
- Missing environment variables
- Build timeout (increase in Railway settings)
- Health check path not responding

### Tests fail but code is correct
Review the test, fix if needed, push update. Auto-merge will retry.
