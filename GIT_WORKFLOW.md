# 🚀 Git Workflow Guide for TRE CRM

## ✅ CURRENT WORKING STATE
**Commit:** `a10a3cd` - "WORKING STATE: All pages functional, map with markers, navigation working"  
**Tag:** `working-map-v1` - Stable working state  
**Status:** All pages working, map with 50 markers, navigation functional

## 🔄 ESSENTIAL GIT COMMANDS

### Before Making Changes
```bash
# See what's changed
git status

# See recent commits
git log --oneline -5
```

### If Something Breaks (EMERGENCY RESTORE)
```bash
# Restore to last working commit
git checkout a10a3cd

# Or restore to tagged version
git checkout working-map-v1

# Or restore just specific files
git checkout a10a3cd -- script.js
```

### After Making Changes
```bash
# See what changed
git diff

# Add changes
git add script.js index.html styles.css

# Commit with message
git commit -m "Description of what you changed"

# Push to GitHub
git push origin main
```

### Create New Working Checkpoint
```bash
# After testing that everything works
git tag -a "working-v2" -m "New stable state: [describe what works]"
```

## 🎯 WORKFLOW BEST PRACTICES

1. **Always test before committing** - Make sure everything works
2. **Use descriptive commit messages** - Explain what you changed
3. **Create tags for stable versions** - Easy to revert to
4. **Commit frequently** - Small, logical changes
5. **Push to GitHub regularly** - Backup your work

## 🚨 EMERGENCY COMMANDS

**"Everything is broken!"**
```bash
git checkout working-map-v1
```

**"I want to see what changed"**
```bash
git diff HEAD~1
```

**"I want to undo my last commit"**
```bash
git reset --hard HEAD~1
```

**"I want to see all my commits"**
```bash
git log --oneline
```

## 📋 QUICK REFERENCE

- `git status` - What's changed?
- `git log --oneline` - Recent commits
- `git diff` - What changed?
- `git checkout <commit>` - Go back in time
- `git tag` - List all tags
- `git checkout <tag>` - Go to tagged version

## 🎉 BENEFITS OF GIT

✅ **Instant Reverts** - Back to any working state in seconds  
✅ **Change Tracking** - See exactly what changed  
✅ **Safe Experimentation** - Try things without fear  
✅ **Backup** - GitHub keeps your work safe  
✅ **History** - See how your project evolved
