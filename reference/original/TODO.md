# Technical Debt & TODOs

## [HIGH] Security

- **Hardcoded database credentials in migration scripts**
  - Files: `migrate-*.js` (4 files)
  - Issue: Production database connection strings with passwords in plaintext
  - Action: Move scripts to `.gitignore`d directory OR remove after confirming migration success
  - Files affected:
    - `migrate-characters.js`
    - `migrate-from-old-prod.js`
    - `migrate-all-from-old-prod.js`
    - `migrate-complete.js`

## [MEDIUM] Cleanup

- **Migration scripts in root directory**
  - Should be moved to `scripts/migrations/` or deleted after verification
  - Keep only `migrate-complete.js` as reference, archive others

- **Old Railway project decommissioning**
  - Project: illustrious-solace
  - Connection: `centerbeam.proxy.rlwy.net:31016`
  - Action: Verify new production works, then decommission old project to save costs

## [MEDIUM] Verification Needed

- **Test production application with migrated data**
  - Verify users can log in with original passwords
  - Verify all 9 characters display correctly
  - Verify character skills/edges/hindrances/equipment load properly
  - Verify wiki entries are accessible
  - Check character images load (URLs may need updating)

- **Character portrait URLs**
  - Local character "frank" may have local file path in `character_image_url`
  - Need to verify all character portraits are accessible from production

## [LOW] Documentation

- **Add migration notes to README**
  - Document that production database is fully migrated from illustrious-solace
  - Note that passwords are preserved from old system

## [INFO] Database State

Current production database (cozy-fulfillment):
- Users: 11 (passwords preserved)
- Characters: 9
- Skills: 180
- Equipment: 128
- Edges: 44
- Arcane Powers: 16
- Hindrances: 13
- Wiki Entries: 9
- All reference tables populated
