# GitHub Setup Guide

## Backend Repository (Already Configured)

The backend is already connected to: `git@github.com:darshan2121/drenterprisefrontend.git`

### Push Backend Changes

```bash
cd /Users/darshanpatel/Desktop/drenterprisefrontend/server
git push origin darshan-befor-live-branch
```

## Frontend Repository Setup

### Step 1: Create a New GitHub Repository

1. Go to https://github.com/new
2. Repository name: `nd-enterprise-app` (or your preferred name)
3. Description: "ND Enterprise Frontend Application"
4. Choose Public or Private
5. **DO NOT** initialize with README, .gitignore, or license (we already have these)
6. Click "Create repository"

### Step 2: Add Remote and Push

After creating the repository, GitHub will show you commands. Use these:

```bash
cd /Users/darshanpatel/nd-enterprise-app

# Add the remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin git@github.com:YOUR_USERNAME/nd-enterprise-app.git

# Or if using HTTPS:
# git remote add origin https://github.com/YOUR_USERNAME/nd-enterprise-app.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### Alternative: Add Frontend to Existing Repository

If you want to add the frontend to the same repository as the backend:

```bash
cd /Users/darshanpatel/nd-enterprise-app
git remote add origin git@github.com:darshan2121/drenterprisefrontend.git
git branch -M main
git push -u origin main
```

**Note:** This will create a separate branch or you may need to merge it into the existing structure.

## Quick Push Commands

### Backend
```bash
cd /Users/darshanpatel/Desktop/drenterprisefrontend/server
git push origin darshan-befor-live-branch
```

### Frontend (after setting up remote)
```bash
cd /Users/darshanpatel/nd-enterprise-app
git push origin main
```

## Important Notes

- ✅ `.env` files are already in `.gitignore` - they won't be committed
- ✅ `node_modules` are excluded
- ✅ Upload directories are excluded
- ⚠️ Make sure to create `.env` files on your server/deployment with the actual values

