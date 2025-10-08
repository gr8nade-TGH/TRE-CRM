const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function migrateBugs() {
  try {
    console.log('🔄 Running database migration for bugs table...');
    
    // This will create the bugs table and related enums
    await prisma.$executeRaw`
      CREATE TYPE "BugStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');
    `;
    
    await prisma.$executeRaw`
      CREATE TYPE "BugPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
    `;
    
    await prisma.$executeRaw`
      CREATE TYPE "BugCategory" AS ENUM ('UI', 'FUNCTIONALITY', 'PERFORMANCE', 'DATA', 'NAVIGATION', 'OTHER');
    `;
    
    await prisma.$executeRaw`
      CREATE TABLE "bugs" (
        "id" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "description" TEXT NOT NULL,
        "expected" TEXT,
        "steps" TEXT,
        "status" "BugStatus" NOT NULL DEFAULT 'PENDING',
        "priority" "BugPriority" NOT NULL DEFAULT 'MEDIUM',
        "category" "BugCategory" NOT NULL DEFAULT 'OTHER',
        "page" TEXT NOT NULL,
        "page_url" TEXT NOT NULL,
        "reported_by" TEXT NOT NULL,
        "reported_by_name" TEXT NOT NULL,
        "assigned_to" TEXT,
        "assigned_to_name" TEXT,
        "resolution_notes" TEXT,
        "screenshot_url" TEXT,
        "technical_context" JSONB NOT NULL,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL,
        
        CONSTRAINT "bugs_pkey" PRIMARY KEY ("id")
      );
    `;
    
    await prisma.$executeRaw`
      ALTER TABLE "bugs" ADD CONSTRAINT "bugs_reported_by_fkey" 
      FOREIGN KEY ("reported_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    `;
    
    await prisma.$executeRaw`
      ALTER TABLE "bugs" ADD CONSTRAINT "bugs_assigned_to_fkey" 
      FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    `;
    
    console.log('✅ Bugs table migration completed successfully!');
    
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('ℹ️  Bugs table already exists, skipping migration.');
    } else {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrateBugs()
    .then(() => {
      console.log('🎉 Migration completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateBugs };
