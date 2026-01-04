# 🏠 Setting Up Local MongoDB for Testing

## ⚠️ Current Situation

You're currently connected to **PRODUCTION database** (MongoDB Atlas).  
The test scripts will now **block** running on production for safety.

## ✅ Solution: Use Local MongoDB

### Option 1: Install MongoDB Locally (Recommended)

#### macOS (using Homebrew):
```bash
# Install MongoDB
brew tap mongodb/brew
brew install mongodb-community

# Start MongoDB
brew services start mongodb-community

# Verify it's running
brew services list | grep mongodb
```

#### Linux (Ubuntu/Debian):
```bash
# Install MongoDB
sudo apt-get update
sudo apt-get install -y mongodb

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Check status
sudo systemctl status mongod
```

#### Windows:
1. Download MongoDB from: https://www.mongodb.com/try/download/community
2. Install MongoDB Community Edition
3. Start MongoDB service from Services panel

### Option 2: Use Docker (Easy Alternative)

```bash
# Run MongoDB in Docker
docker run -d \
  --name mongodb-local \
  -p 27017:27017 \
  -v mongodb-data:/data/db \
  mongo:latest

# Verify it's running
docker ps | grep mongodb
```

### Step 2: Update .env File

Edit `server/.env`:

```env
# Change from production:
# MONGODB_URI=mongodb+srv://...

# To local:
MONGODB_URI=mongodb://localhost:27017/labor-management
```

### Step 3: Verify Local Connection

```bash
cd server
npm run check:db
```

**Should show:**
```
📊 Database Type: 💻 LOCAL
✅ Safe - Local database detected
```

### Step 4: Import Production Data (Optional)

If you want to test with real data structure:

```bash
# Export from production (if needed)
mongodump --uri="mongodb+srv://..." --out=./backup

# Import to local
mongorestore --uri="mongodb://localhost:27017/labor-management" ./backup/labor-management
```

## 🧪 Now You Can Test Safely

```bash
# Check database
npm run check:db

# Prepare test data (safe on local)
npm run prepare:test

# Run tests
npm run test:stepin:morning
```

## 🔄 Switching Between Local and Production

### For Development/Testing:
```env
MONGODB_URI=mongodb://localhost:27017/labor-management
```

### For Production Server:
```env
MONGODB_URI=mongodb+srv://your-production-uri
```

**Tip:** Use different `.env` files:
- `.env.local` - for local development
- `.env.production` - for production server

## ✅ Verification Checklist

- [ ] MongoDB installed and running locally
- [ ] `.env` file updated with local URI
- [ ] `npm run check:db` shows "LOCAL"
- [ ] Can connect successfully
- [ ] Ready to run tests safely

## 🆘 Troubleshooting

### "Cannot connect to MongoDB"
- Check if MongoDB is running: `brew services list` (macOS) or `sudo systemctl status mongod` (Linux)
- Verify port 27017 is not blocked
- Check MongoDB logs for errors

### "Still showing production"
- Make sure `.env` file is in `server/` directory
- Restart your terminal/IDE to reload environment variables
- Run `npm run check:db` to verify

### "Want to use production data structure"
- Export schema from production
- Import to local MongoDB
- Test with realistic data structure



