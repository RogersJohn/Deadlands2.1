# Architectural Decisions

## 2025-11-10: Production Database Migration Strategy

**Context**: Needed to migrate data from old Railway project (illustrious-solace) to new project (cozy-fulfillment)

**Decision**:
- Use direct PostgreSQL client-to-client migration scripts
- Preserve original BCrypt password hashes instead of resetting passwords
- Migrate in dependency order: users → characters → character data → reference tables

**Rationale**:
- Direct migration avoids data transformation errors
- Preserving password hashes maintains user access without notification overhead
- Dependency order prevents foreign key constraint violations

**Consequences**:
- Migration scripts contain hardcoded connection strings (security debt)
- One-time scripts remain in repository for audit trail
- BCrypt compatibility confirmed between old and new environments ($2a$10$ format)

**Migrated Data**:
- 11 users (with original passwords)
- 9 characters (8 from old prod, 1 from local)
- 180 skills
- 128 equipment items
- 44 edges
- 16 arcane powers
- 13 hindrances
- 63 skill references
- 79 edge references
- 54 hindrance references
- 53 equipment references
- 17 arcane power references
- 9 wiki entries

**Files Created**:
- `migrate-characters.js` - Initial local to prod migration
- `migrate-from-old-prod.js` - Failed attempt (missing users)
- `migrate-all-from-old-prod.js` - Second attempt (password reset bug)
- `migrate-complete.js` - Final working version with password preservation
