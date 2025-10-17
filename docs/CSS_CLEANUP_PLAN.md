# CSS Cleanup Plan for TRE CRM

## Current Issues Found:
1. ✅ **FIXED**: `min-width: 700px` on `#listingsTable` - was preventing column width changes
2. ✅ **FIXED**: Duplicate column width rules for listings table
3. 🔍 **TO CHECK**: Other duplicate rules throughout the file

## Cleanup Strategy:

### Phase 1: Identify Duplicates
- Search for duplicate selectors
- Look for conflicting rules
- Check for unused CSS

### Phase 2: Organize by Sections
- Group related styles together
- Add clear section comments
- Order by specificity (general → specific)

### Phase 3: Test After Each Change
- Test locally after each cleanup
- Use browser dev tools to verify
- Commit working states frequently

## Safe Cleanup Process:
1. Create backup checkpoint
2. Make small, focused changes
3. Test immediately
4. Commit working state
5. Repeat

## Tools to Use:
- Browser DevTools (Inspect Element)
- Manual search for duplicates
- Git for version control
- Comments for organization
