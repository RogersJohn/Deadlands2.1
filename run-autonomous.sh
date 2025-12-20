#!/bin/bash
#
# Autonomous Claude Code Runner
# 
# This script runs Claude Code in a loop, allowing it to work through
# the task queue autonomously. Run before bed, check results in morning.
#
# Usage: ./run-autonomous.sh [max_iterations]
#
# Requirements:
# - Claude Code CLI installed and authenticated
# - GitHub CLI (gh) installed and authenticated
# - Repository cloned and configured
#

set -e

# Configuration
MAX_ITERATIONS=${1:-30}
SLEEP_BETWEEN=60
LOG_FILE="autonomous-$(date +%Y%m%d-%H%M%S).log"
REPO_DIR=$(pwd)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

check_prerequisites() {
    log "Checking prerequisites..."
    
    if ! command -v claude &> /dev/null; then
        log "${RED}Error: Claude Code CLI not found. Install with: npm install -g @anthropic-ai/claude-code${NC}"
        exit 1
    fi
    
    if ! command -v gh &> /dev/null; then
        log "${RED}Error: GitHub CLI not found. Install from: https://cli.github.com${NC}"
        exit 1
    fi
    
    if [ ! -f ".claude/task-queue.md" ]; then
        log "${RED}Error: task-queue.md not found. Run initial setup first.${NC}"
        exit 1
    fi
    
    log "${GREEN}Prerequisites OK${NC}"
}

get_next_task() {
    # Find first incomplete task that isn't stuck
    grep -n "\- \[ \] Incomplete" .claude/task-queue.md | head -1 | cut -d: -f1
}

count_remaining() {
    grep -c "\- \[ \] Incomplete" .claude/task-queue.md 2>/dev/null || echo "0"
}

count_stuck() {
    grep -c "\[STUCK\]" .claude/task-queue.md 2>/dev/null || echo "0"
}

run_iteration() {
    local iteration=$1
    
    log "=========================================="
    log "ITERATION $iteration of $MAX_ITERATIONS"
    log "=========================================="
    
    local remaining=$(count_remaining)
    local stuck=$(count_stuck)
    
    log "Tasks remaining: $remaining (stuck: $stuck)"
    
    if [ "$remaining" -eq 0 ] || [ "$remaining" -eq "$stuck" ]; then
        log "${GREEN}All available tasks completed!${NC}"
        return 1
    fi
    
    # Run Claude Code with the autonomous prompt
    log "Starting Claude Code..."
    
    claude --dangerously-skip-permissions --print "..."
You are in autonomous build mode. 

1. Read .claude/task-queue.md and find the next task marked '- [ ] Incomplete' that is NOT marked [STUCK]
2. Create a feature branch for that task
3. Implement the task according to its acceptance criteria
4. Run tests locally to verify
5. Commit your changes with a meaningful message
6. Create a PR with the label 'Auto-merge: true'
7. Update .claude/PROGRESS.md with what you completed
8. Mark the task as complete in task-queue.md: '- [x] Complete'

If you encounter an error you cannot resolve after 3 attempts:
1. Document it in .claude/STUCK.md
2. Mark the task as [STUCK] in task-queue.md
3. Move to the next task

Be thorough but efficient. Test your code before committing.
" 2>&1 | tee -a "$LOG_FILE"
    
    local exit_code=${PIPESTATUS[0]}
    
    if [ $exit_code -ne 0 ]; then
        log "${YELLOW}Claude Code exited with code $exit_code${NC}"
    fi
    
    # Check if any PRs were created
    local pr_count=$(gh pr list --state open --json number --jq 'length')
    log "Open PRs: $pr_count"
    
    return 0
}

main() {
    log "Starting Autonomous Claude Code Runner"
    log "Max iterations: $MAX_ITERATIONS"
    log "Log file: $LOG_FILE"
    log ""
    
    check_prerequisites
    
    cd "$REPO_DIR"
    
    for i in $(seq 1 $MAX_ITERATIONS); do
        if ! run_iteration $i; then
            break
        fi
        
        # Check if we should stop
        if [ -f ".claude/STOP" ]; then
            log "${YELLOW}Stop file detected, halting autonomous run${NC}"
            rm .claude/STOP
            break
        fi
        
        log "Sleeping $SLEEP_BETWEEN seconds before next iteration..."
        sleep $SLEEP_BETWEEN
    done
    
    log ""
    log "=========================================="
    log "AUTONOMOUS RUN COMPLETE"
    log "=========================================="
    log "Final status:"
    log "  Tasks remaining: $(count_remaining)"
    log "  Tasks stuck: $(count_stuck)"
    log "  Open PRs: $(gh pr list --state open --json number --jq 'length')"
    log ""
    log "Review:"
    log "  - Check PROGRESS.md for completed work"
    log "  - Check STUCK.md for issues needing attention"
    log "  - Review open PRs before merging"
    log ""
    log "Full log: $LOG_FILE"
}

# Handle Ctrl+C gracefully
trap 'log "${YELLOW}Interrupted by user${NC}"; exit 130' INT

main
