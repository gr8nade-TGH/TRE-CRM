const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create users (agents and managers)
  const users = await Promise.all([
    prisma.user.create({
      data: {
        id: 'agent_1',
        name: 'Alex Agent',
        email: 'alex@example.com',
        phone: '555-0101',
        role: 'AGENT',
        active: true,
        hire_date: new Date('2023-01-15'),
        license_number: 'TR123456',
        specialties: ['Residential', 'Luxury'],
        notes: 'Top performer, excellent with first-time buyers'
      }
    }),
    prisma.user.create({
      data: {
        id: 'agent_2',
        name: 'Bailey Broker',
        email: 'bailey@example.com',
        phone: '555-0102',
        role: 'AGENT',
        active: true,
        hire_date: new Date('2022-08-22'),
        license_number: 'TR789012',
        specialties: ['Commercial', 'Investment'],
        notes: 'Strong commercial background, great with investors'
      }
    }),
    prisma.user.create({
      data: {
        id: 'agent_3',
        name: 'Casey Consultant',
        email: 'casey@example.com',
        phone: '555-0103',
        role: 'AGENT',
        active: true,
        hire_date: new Date('2023-03-10'),
        license_number: 'TR345678',
        specialties: ['Rental', 'Student Housing'],
        notes: 'New but promising, great with rental properties'
      }
    }),
    prisma.user.create({
      data: {
        id: 'manager_1',
        name: 'Manager Mike',
        email: 'mike@example.com',
        phone: '555-0000',
        role: 'MANAGER',
        active: true,
        hire_date: new Date('2021-01-01'),
        license_number: 'TR000001',
        specialties: ['Management'],
        notes: 'Office manager'
      }
    })
  ]);

  console.log('✅ Created users');

  // Create properties
  const properties = [];
  for (let i = 1; i <= 30; i++) {
    const market = ['Austin', 'Dallas', 'Houston'][i % 3];
    const rentMin = 1000 + (i % 6) * 150;
    const rentMax = rentMin + 400 + (i % 3) * 100;
    const escort_pct = [0.0, 1.5, 2.0, 2.5, 3.0][i % 5];
    const send_pct = [1.0, 2.0, 2.5, 3.5, 4.0][(i + 2) % 5];
    
    const property = await prisma.property.create({
      data: {
        id: `prop_${i}`,
        name: `Community ${i}`,
        market,
        neighborhoods: ['Downtown', 'Uptown', 'Midtown'].slice(0, (i % 3) + 1),
        beds_min: 1,
        beds_max: 3,
        baths_min: 1,
        baths_max: 2,
        rent_min: rentMin,
        rent_max: rentMax,
        sqft_min: 600,
        sqft_max: 1300,
        amenities: ['Pool', 'Gym', 'In-Unit W/D', 'Parking'].slice(0, (i % 4) + 1),
        escort_pct,
        send_pct,
        bonus_text: i % 4 === 0 ? '$300 bonus' : null,
        specials_text: i % 3 === 0 ? '1 month free' : null,
        website: 'https://example.com',
        address: `${100 + i} Example St`,
        phone: '555-111-2222',
        pricing_last_updated: new Date(Date.now() - Math.random() * 15 * 24 * 60 * 60 * 1000),
        lat: 29.48 + (Math.random() - 0.5) * 0.2,
        lng: -98.50 + (Math.random() - 0.5) * 0.2
      }
    });
    properties.push(property);
  }

  console.log('✅ Created properties');

  // Create leads
  const leads = [];
  for (let i = 1; i <= 37; i++) {
    const assigned = i % 2 === 0 ? 'agent_1' : (i % 3 === 0 ? 'agent_2' : null);
    const foundBy = i % 4 === 0 ? 'agent_2' : 'agent_3';
    const healthStatuses = ['GREEN', 'YELLOW', 'RED', 'CLOSED', 'LOST'];
    const healthStatus = healthStatuses[i % healthStatuses.length];

    const lead = await prisma.lead.create({
      data: {
        id: `lead_${i}`,
        name: `Lead ${i}`,
        email: `lead${i}@example.com`,
        phone: `555-000-${String(1000 + i)}`,
        submitted_at: new Date(Date.now() - Math.random() * 45 * 24 * 60 * 60 * 1000),
        found_by_agent_id: foundBy,
        assigned_agent_id: assigned,
        health_status: healthStatus,
        prefs: {
          market: ['Austin', 'Dallas', 'Houston'][i % 3],
          neighborhoods: ['Downtown', 'Uptown', 'Midtown'].slice(0, (i % 3) + 1),
          budget_min: 1000 + (i % 5) * 100,
          budget_max: 1800 + (i % 5) * 150,
          beds: (i % 3) + 1,
          baths: (i % 2) + 1,
          move_in: '30-60 days',
          pets: i % 2 === 0 ? 'Yes' : 'No',
          parking: i % 3 === 0 ? 'Required' : 'Optional',
          sqft_min: 650,
          sqft_max: 1100,
          amenities: ['Pool', 'Gym', 'In-Unit W/D'].slice(0, (i % 3) + 1),
          credit_tier: ['A', 'B', 'C'][i % 3],
          background: ['None', 'Eviction'][i % 2],
          notes: 'Initial intake notes here.'
        }
      }
    });
    leads.push(lead);
  }

  console.log('✅ Created leads');

  // Create document statuses for some leads
  const documentSteps = [
    { name: 'Lease Agreement Sent', step_number: 1 },
    { name: 'Signed By Lead', step_number: 2 },
    { name: 'Signed By Property Owner', step_number: 3 },
    { name: 'Finalized by Agent', step_number: 4 },
    { name: 'Payment Step', step_number: 5 }
  ];

  for (let i = 1; i <= 5; i++) {
    const leadId = `lead_${i}`;
    const currentStep = i;
    
    // Create document status
    const documentStatus = await prisma.documentStatus.create({
      data: {
        lead_id: leadId,
        current_step: currentStep
      }
    });

    // Create document steps
    for (const step of documentSteps) {
      const stepStatus = step.step_number < currentStep ? 'COMPLETED' : 
                        step.step_number === currentStep ? 'IN_PROGRESS' : 'PENDING';
      
      const documentStep = await prisma.documentStep.create({
        data: {
          document_status_id: documentStatus.id,
          step_number: step.step_number,
          name: step.name,
          status: stepStatus
        }
      });

      // Add some sample attachments for completed steps
      if (stepStatus === 'COMPLETED') {
        await prisma.attachment.create({
          data: {
            document_step_id: documentStep.id,
            filename: `sample_${step.step_number}_${i}.pdf`,
            original_name: `${step.name.replace(/\s+/g, '_').toLowerCase()}_${i}.pdf`,
            file_path: `uploads/sample_${step.step_number}_${i}.pdf`,
            file_size: 1024 * 100, // 100KB
            mime_type: 'application/pdf'
          }
        });
      }
    }
  }

  console.log('✅ Created document statuses and steps');

  console.log('🎉 Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });