# TRE CRM Backend Setup Guide

## 🎯 Overview
This guide will help you set up a functional backend for your TRE CRM application with real database connectivity.

## 🛠️ Tech Stack Recommendation
- **Backend**: Node.js + Express.js
- **Database**: PostgreSQL
- **ORM**: Prisma (type-safe, modern)
- **Authentication**: JWT tokens
- **File Upload**: Multer for document attachments

## 📁 Project Structure
```
tre-crm-backend/
├── src/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   ├── services/
│   └── utils/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── uploads/
├── package.json
├── .env
└── server.js
```

## 🗄️ Database Schema Design

### Core Tables:
1. **users** - Agents and Managers
2. **leads** - Lead information
3. **properties** - Property listings
4. **document_steps** - Document workflow steps
5. **lead_documents** - Lead document status
6. **attachments** - File attachments
7. **showcases** - Property showcases

## 🚀 Quick Start Commands

### 1. Initialize Backend Project
```bash
mkdir tre-crm-backend
cd tre-crm-backend
npm init -y
```

### 2. Install Dependencies
```bash
npm install express prisma @prisma/client bcryptjs jsonwebtoken multer cors dotenv
npm install -D nodemon
```

### 3. Database Setup
```bash
npx prisma init
npx prisma migrate dev --name init
npx prisma generate
```

## 🔧 Environment Variables (.env)
```env
DATABASE_URL="postgresql://username:password@localhost:5432/tre_crm"
JWT_SECRET="your-super-secret-jwt-key"
PORT=3001
UPLOAD_DIR="./uploads"
```

## 📊 API Endpoints Structure

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user

### Leads
- `GET /api/leads` - Get all leads (with filters)
- `GET /api/leads/:id` - Get single lead
- `POST /api/leads` - Create new lead
- `PUT /api/leads/:id` - Update lead
- `DELETE /api/leads/:id` - Delete lead
- `PUT /api/leads/:id/assign` - Assign lead to agent

### Properties
- `GET /api/properties` - Get all properties (with filters)
- `GET /api/properties/:id` - Get single property
- `POST /api/properties` - Create new property
- `PUT /api/properties/:id` - Update property

### Documents
- `GET /api/documents/leads/:leadId` - Get lead document status
- `PUT /api/documents/leads/:leadId/steps/:stepId` - Update document step
- `POST /api/documents/leads/:leadId/attachments` - Upload attachment
- `GET /api/documents/history` - Get closed leads history

### Showcases
- `POST /api/showcases` - Create showcase
- `GET /api/showcases/:slug` - Get public showcase
- `POST /api/showcases/:id/send` - Send showcase email

## 🔄 Frontend Integration

### 1. Replace Mock API
Replace the `api` object in `script.js` with real HTTP calls:

```javascript
const API_BASE = 'http://localhost:3001/api';

const api = {
  async getLeads(params) {
    const response = await fetch(`${API_BASE}/leads?${new URLSearchParams(params)}`);
    return await response.json();
  },
  // ... other methods
};
```

### 2. Add Authentication
```javascript
// Add to localStorage or sessionStorage
localStorage.setItem('authToken', 'your-jwt-token');

// Add to all API calls
const headers = {
  'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
  'Content-Type': 'application/json'
};
```

## 🚀 Deployment Options

### Option 1: Vercel + Supabase (Easiest)
- Frontend: Deploy to Vercel
- Database: Supabase (PostgreSQL)
- Backend: Vercel Serverless Functions

### Option 2: Railway + Render
- Backend: Deploy to Railway
- Database: Railway PostgreSQL
- Frontend: Deploy to Render

### Option 3: AWS/GCP/Azure
- Full cloud deployment with managed databases

## 📝 Next Steps

1. **Choose your database provider** (PostgreSQL recommended)
2. **Set up the backend project** using the commands above
3. **Design your database schema** based on your current mock data
4. **Implement the API endpoints** one by one
5. **Update your frontend** to use real API calls
6. **Add authentication** and user management
7. **Deploy** to your chosen platform

## 🔧 Development Workflow

1. Start with the database schema
2. Create basic CRUD operations
3. Add authentication
4. Implement file uploads
5. Add real-time features (optional)
6. Deploy and test

Would you like me to help you implement any specific part of this setup?
