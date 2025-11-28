# 🚀 MAARGA Production Setup Guide (MongoDB)

## Quick Production Setup (3 Minutes)

### 1. Setup MongoDB Atlas Database (Free Forever):

#### 🍃 **MongoDB Atlas** (Recommended - Easiest & Free)
```bash
# 1. Go to: https://cloud.mongodb.com
# 2. Sign up with Google/GitHub account
# 3. Create new project: "MAARGA Production"
# 4. Build Database → Choose "Free" tier (M0 Sandbox)
# 5. Pick region closest to your users
# 6. Cluster name: Leave default or "maarga-cluster"
```

#### 📊 **Database User & Network Setup**
```bash
# 1. Create Database User:
#    - Username: maarga-admin
#    - Password: Generate secure password (save it!)
# 2. Network Access: Add IP 0.0.0.0/0 (allow from anywhere)
# 3. Get Connection String: Connect → "Connect your application"
#    - Copy the mongodb+srv:// URL
```

### 2. Configure Environment
```bash
# Copy environment template (already done)
# Edit .env with your MongoDB connection string:
MONGODB_URI=mongodb+srv://maarga-admin:YOUR-PASSWORD@cluster0.xxxxx.mongodb.net/maarga-production?retryWrites=true&w=majority
JWT_SECRET=your-32-character-random-string
NODE_ENV=production
```

### 3. Install Dependencies & Test
```bash
# Install MongoDB dependencies (if not done)
npm install mongoose

# No database setup needed - MongoDB creates collections automatically!
```

### 4. Test Locally
```bash
# Start production server locally
npm start

# Test at: http://localhost:3000
```

### 5. Deploy to Vercel
```bash
# Option A: Use Vercel website
# 1. Push code to GitHub
# 2. Import project at vercel.com
# 3. Add environment variables in dashboard
# 4. Deploy!

# Option B: Use CLI
vercel --prod
# Then add environment variables in Vercel dashboard
```

## 🎯 Environment Variables for Vercel:

Add these in your Vercel dashboard → Project Settings → Environment Variables:

```
MONGODB_URI → mongodb+srv://maarga-admin:YOUR-PASSWORD@cluster0.xxxxx.mongodb.net/maarga-production?retryWrites=true&w=majority
JWT_SECRET → random-32-char-string
NODE_ENV → production
```

## ✅ Production Checklist:

- [ ] MongoDB Atlas database created (free tier)
- [ ] Database user and network access configured
- [ ] `.env` file updated with MONGODB_URI
- [ ] `npm install mongoose` completed
- [ ] Local testing works (`npm start`)
- [ ] Code pushed to GitHub
- [ ] Environment variables added to Vercel
- [ ] Deployment successful
- [ ] Multi-device testing completed

## 🚨 Quick Troubleshooting:

**Database Connection Error?**
- Check MONGODB_URI in .env (ensure password is correct)
- Verify network access allows 0.0.0.0/0 in MongoDB Atlas
- Ensure database user has read/write permissions

**Deployment Failed?**
- Check MONGODB_URI is set in Vercel environment variables
- Ensure server-mongo.js is the main file in package.json
- Check Vercel function logs for MongoDB connection errors

**Collections Not Created?**
- MongoDB creates collections automatically on first write
- Check MongoDB Atlas dashboard → Browse Collections

## 💡 MongoDB Benefits:

- ✅ **512MB Free Forever** - No time limit
- ✅ **No SQL Setup** - Collections created automatically  
- ✅ **Global Deployment** - Works from anywhere
- ✅ **Built-in Security** - Automatic backups & encryption
- ✅ **Easy Scaling** - Upgrade when you need more storage

Your production MAARGA app will be live with persistent MongoDB data! 🎉