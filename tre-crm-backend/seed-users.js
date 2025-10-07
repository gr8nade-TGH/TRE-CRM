const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedUsers() {
  try {
    console.log('🌱 Seeding users...');

    // Create initial users
    const users = [
      {
        name: 'John Smith',
        email: 'john@trecrm.com',
        role: 'MANAGER',
        status: 'ACTIVE',
        password_hash: 'hashed_password123',
        created_by: null,
        active: true,
        hire_date: new Date('2024-01-01'),
        license_number: 'RE123456',
        specialties: ['Residential', 'Commercial'],
        notes: 'Lead manager and system administrator'
      },
      {
        name: 'Alex Agent',
        email: 'alex@trecrm.com',
        role: 'AGENT',
        status: 'ACTIVE',
        password_hash: 'hashed_password123',
        created_by: null,
        active: true,
        hire_date: new Date('2024-01-02'),
        license_number: 'RE234567',
        specialties: ['Residential'],
        notes: 'Top performing agent'
      },
      {
        name: 'Bailey Broker',
        email: 'bailey@trecrm.com',
        role: 'AGENT',
        status: 'ACTIVE',
        password_hash: 'hashed_password123',
        created_by: null,
        active: true,
        hire_date: new Date('2024-01-03'),
        license_number: 'RE345678',
        specialties: ['Commercial', 'Investment'],
        notes: 'Commercial specialist'
      },
      {
        name: 'Sarah Johnson',
        email: 'sarah@trecrm.com',
        role: 'AGENT',
        status: 'INVITED',
        password_hash: null,
        created_by: null,
        active: true,
        hire_date: new Date('2024-01-10'),
        license_number: 'RE456789',
        specialties: ['Residential'],
        notes: 'New agent - invitation pending',
        invited_at: new Date('2024-01-10')
      },
      {
        name: 'Mike Chen',
        email: 'mike@trecrm.com',
        role: 'SUPER_USER',
        status: 'ACTIVE',
        password_hash: 'hashed_password123',
        created_by: null,
        active: true,
        hire_date: new Date('2024-01-05'),
        license_number: 'RE567890',
        specialties: ['Residential', 'Commercial', 'Investment'],
        notes: 'System super user with full access'
      }
    ];

    // Create users
    for (const userData of users) {
      const user = await prisma.user.upsert({
        where: { email: userData.email },
        update: userData,
        create: userData
      });
      console.log(`✅ User created/updated: ${user.name} (${user.email})`);
    }

    // Get the first user to use as performer for audit logs
    const firstUser = await prisma.user.findFirst();
    
    // Create some audit log entries
    const auditEntries = [
      {
        action: 'user_created',
        user_id: firstUser?.id,
        user_name: 'System',
        user_email: 'system@trecrm.com',
        performed_by: firstUser?.id || 'system',
        performed_by_name: 'System',
        details: 'Initial system setup - users created'
      }
    ];

    for (const auditData of auditEntries) {
      await prisma.auditLog.create({
        data: auditData
      });
    }

    console.log('✅ Users seeded successfully!');
    console.log('📊 Created users:');
    const allUsers = await prisma.user.findMany();
    allUsers.forEach(user => {
      console.log(`  - ${user.name} (${user.email}) - ${user.role} - ${user.status}`);
    });

  } catch (error) {
    console.error('❌ Error seeding users:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedUsers();
