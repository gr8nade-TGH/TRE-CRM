# TRE CRM Deployment Guide

## 🚀 Quick Deployment Options

### Option 1: Vercel + Supabase (Recommended for MVP)

#### Frontend (Vercel)
1. **Connect your GitHub repo to Vercel**
2. **Set environment variables:**
   ```env
   VITE_API_URL=https://your-backend.vercel.app/api
   ```

#### Backend (Vercel Serverless Functions)
1. **Create `api/` folder in your project root**
2. **Move your Express routes to individual serverless functions**
3. **Deploy to Vercel**

#### Database (Supabase)
1. **Sign up at supabase.com**
2. **Create new project**
3. **Get connection string from Settings > Database**
4. **Update your `.env` with Supabase URL**

### Option 2: Railway (Full Stack)

#### Backend + Database
1. **Sign up at railway.app**
2. **Connect GitHub repo**
3. **Add PostgreSQL service**
4. **Deploy backend with database**

#### Frontend
1. **Deploy to Vercel or Netlify**
2. **Update API URL to Railway backend**

### Option 3: AWS/GCP/Azure (Enterprise)

#### AWS Setup
- **Frontend**: S3 + CloudFront
- **Backend**: EC2 or Lambda
- **Database**: RDS PostgreSQL
- **Files**: S3 for attachments

## 📋 Step-by-Step Deployment

### 1. Prepare Your Code

#### Update Frontend
```javascript
// In your script.js, replace the mock API with:
const API_BASE = process.env.NODE_ENV === 'production' 
  ? 'https://your-api-domain.com/api' 
  : 'http://localhost:3001/api';
```

#### Environment Variables
Create `.env` files:

**Backend (.env):**
```env
DATABASE_URL="postgresql://username:password@host:5432/database"
JWT_SECRET="your-super-secret-jwt-key"
PORT=3001
NODE_ENV=production
```

**Frontend (.env):**
```env
VITE_API_URL=https://your-backend-domain.com/api
```

### 2. Database Setup

#### Using Supabase (Easiest)
1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Go to SQL Editor
4. Run your Prisma migrations
5. Copy connection string

#### Using Railway PostgreSQL
1. Add PostgreSQL service in Railway
2. Copy connection string
3. Update your backend `.env`

### 3. Deploy Backend

#### Using Railway
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

#### Using Vercel (Serverless)
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

### 4. Deploy Frontend

#### Using Vercel
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

#### Using Netlify
1. Connect GitHub repo
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Add environment variables

### 5. Configure Domain & SSL

#### Custom Domain
1. **Buy domain** (Namecheap, GoDaddy, etc.)
2. **Point DNS** to your hosting provider
3. **Enable SSL** (usually automatic)

#### Environment Variables for Production
```env
# Frontend
VITE_API_URL=https://api.yourdomain.com/api

# Backend
DATABASE_URL="postgresql://user:pass@host:5432/db"
JWT_SECRET="your-production-secret"
NODE_ENV=production
CORS_ORIGIN=https://yourdomain.com
```

## 🔧 Production Checklist

### Security
- [ ] Use strong JWT secrets
- [ ] Enable CORS properly
- [ ] Add rate limiting
- [ ] Use HTTPS everywhere
- [ ] Validate all inputs
- [ ] Sanitize file uploads

### Performance
- [ ] Enable gzip compression
- [ ] Add caching headers
- [ ] Optimize images
- [ ] Use CDN for static assets
- [ ] Database indexing

### Monitoring
- [ ] Add error tracking (Sentry)
- [ ] Set up uptime monitoring
- [ ] Database monitoring
- [ ] Log aggregation

### Backup
- [ ] Database backups
- [ ] File storage backups
- [ ] Code repository backups

## 🚨 Common Issues & Solutions

### CORS Errors
```javascript
// In your backend
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
```

### Database Connection Issues
```javascript
// Add connection pooling
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});
```

### File Upload Issues
```javascript
// Increase file size limits
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
```

## 📊 Monitoring & Analytics

### Error Tracking
```bash
npm install @sentry/node @sentry/browser
```

### Uptime Monitoring
- **UptimeRobot** (free)
- **Pingdom** (paid)
- **StatusCake** (free tier)

### Database Monitoring
- **Supabase Dashboard** (if using Supabase)
- **Railway Dashboard** (if using Railway)
- **AWS CloudWatch** (if using AWS)

## 🔄 CI/CD Pipeline

### GitHub Actions Example
```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

## 💰 Cost Estimates

### Vercel + Supabase
- **Frontend**: Free (hobby plan)
- **Backend**: $20/month (Pro plan)
- **Database**: Free (up to 500MB)
- **Total**: ~$20/month

### Railway
- **Backend + Database**: $5/month (hobby plan)
- **Frontend**: Free (Vercel)
- **Total**: ~$5/month

### AWS (Production)
- **EC2**: $10-50/month
- **RDS**: $15-100/month
- **S3**: $1-10/month
- **Total**: $25-160/month

## 🎯 Next Steps

1. **Choose your deployment platform**
2. **Set up your database**
3. **Deploy backend first**
4. **Update frontend API URLs**
5. **Deploy frontend**
6. **Test everything works**
7. **Set up monitoring**
8. **Go live! 🚀**

Need help with any specific step? Let me know!
