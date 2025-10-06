# Backend Setup for TRE CRM

## Step 1: Create Backend Directory
```bash
mkdir tre-crm-backend
cd tre-crm-backend
```

## Step 2: Initialize Node.js Project
```bash
npm init -y
```

## Step 3: Install Dependencies
```bash
npm install express prisma @prisma/client cors multer dotenv
npm install -D nodemon
```

## Step 4: Create Environment File
Create `.env` file with your Supabase connection string:
```env
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxxx.supabase.co:5432/postgres"
JWT_SECRET="your-super-secret-jwt-key-here"
PORT=3001
```

## Step 5: Initialize Prisma
```bash
npx prisma init
```

## Step 6: Copy Database Schema
Replace the contents of `prisma/schema.prisma` with the schema from the backend-example folder.

## Step 7: Run Database Migration
```bash
npx prisma migrate dev --name init
npx prisma generate
```

## Step 8: Seed Database with Sample Data
```bash
node prisma/seed.js
```

## Step 9: Start Development Server
```bash
npm run dev
```

Your backend will be running at http://localhost:3001
