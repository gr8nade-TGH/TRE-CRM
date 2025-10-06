const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Ensure uploads directory exists
const uploadsDir = 'uploads';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Routes

// Get all leads with filters
app.get('/api/leads', async (req, res) => {
  try {
    const { 
      role, 
      agentId, 
      search, 
      sortKey = 'submitted_at', 
      sortDir = 'desc', 
      page = 1, 
      pageSize = 10,
      status,
      fromDate,
      toDate 
    } = req.query;

    let where = {};
    
    // Filter by agent if role is 'agent'
    if (role === 'agent' && agentId) {
      where.assigned_agent_id = agentId;
    }

    // Search filter
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Status filter
    if (status && status !== 'all') {
      // Convert lowercase status to uppercase enum value
      const statusMap = {
        'green': 'GREEN',
        'yellow': 'YELLOW', 
        'red': 'RED',
        'closed': 'CLOSED',
        'lost': 'LOST'
      };
      where.health_status = statusMap[status] || status.toUpperCase();
    }

    // Date range filter
    if (fromDate || toDate) {
      where.submitted_at = {};
      if (fromDate) where.submitted_at.gte = new Date(fromDate);
      if (toDate) where.submitted_at.lte = new Date(toDate);
    }

    const leads = await prisma.lead.findMany({
      where,
      include: {
        assigned_agent: true,
        found_by_agent: true,
        document_status: {
          include: {
            steps: {
              include: {
                attachments: true
              }
            }
          }
        }
      },
      orderBy: {
        [sortKey]: sortDir
      },
      skip: (parseInt(page) - 1) * parseInt(pageSize),
      take: parseInt(pageSize)
    });

    const total = await prisma.lead.count({ where });

    res.json({
      items: leads,
      total,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    });
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// Get single lead
app.get('/api/leads/:id', async (req, res) => {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: req.params.id },
      include: {
        assigned_agent: true,
        found_by_agent: true,
        document_status: {
          include: {
            steps: {
              include: {
                attachments: true
              }
            }
          }
        }
      }
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    res.json(lead);
  } catch (error) {
    console.error('Error fetching lead:', error);
    res.status(500).json({ error: 'Failed to fetch lead' });
  }
});

// Assign lead to agent
app.put('/api/leads/:id/assign', async (req, res) => {
  try {
    const { agent_id } = req.body;
    
    const lead = await prisma.lead.update({
      where: { id: req.params.id },
      data: { assigned_agent_id: agent_id },
      include: {
        assigned_agent: true
      }
    });

    res.json({ success: true, lead });
  } catch (error) {
    console.error('Error assigning lead:', error);
    res.status(500).json({ error: 'Failed to assign lead' });
  }
});

// Get all agents
app.get('/api/agents', async (req, res) => {
  try {
    const agents = await prisma.user.findMany({
      where: { role: 'agent' },
      include: {
        _count: {
          select: {
            assigned_leads: true
          }
        }
      }
    });

    res.json(agents);
  } catch (error) {
    console.error('Error fetching agents:', error);
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
});

// Get all properties with filters
app.get('/api/properties', async (req, res) => {
  try {
    const { 
      search, 
      market, 
      minPrice, 
      maxPrice, 
      beds, 
      commission, 
      amenities 
    } = req.query;

    let where = {};

    // Search filter
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
        { amenities: { has: search } }
      ];
    }

    // Market filter
    if (market && market !== 'all') {
      where.market = market;
    }

    // Price range filter
    if (minPrice) where.rent_min = { gte: parseInt(minPrice) };
    if (maxPrice) where.rent_max = { lte: parseInt(maxPrice) };

    // Beds filter
    if (beds && beds !== 'any') {
      where.beds_min = { gte: parseInt(beds) };
    }

    // Commission filter
    if (commission && commission !== '0') {
      where.OR = [
        { escort_pct: { gte: parseFloat(commission) } },
        { send_pct: { gte: parseFloat(commission) } }
      ];
    }

    // Amenities filter
    if (amenities && amenities !== 'any') {
      where.amenities = { has: amenities };
    }

    const properties = await prisma.property.findMany({
      where,
      orderBy: { pricing_last_updated: 'desc' }
    });

    res.json(properties);
  } catch (error) {
    console.error('Error fetching properties:', error);
    res.status(500).json({ error: 'Failed to fetch properties' });
  }
});

// Get lead document status
app.get('/api/documents/leads/:leadId', async (req, res) => {
  try {
    const documentStatus = await prisma.documentStatus.findUnique({
      where: { lead_id: req.params.leadId },
      include: {
        steps: {
          include: {
            attachments: true
          },
          orderBy: { step_number: 'asc' }
        }
      }
    });

    if (!documentStatus) {
      return res.status(404).json({ error: 'Document status not found' });
    }

    res.json(documentStatus);
  } catch (error) {
    console.error('Error fetching document status:', error);
    res.status(500).json({ error: 'Failed to fetch document status' });
  }
});

// Update document step
app.put('/api/documents/leads/:leadId/steps/:stepId', async (req, res) => {
  try {
    const { status, attachments } = req.body;
    
    const step = await prisma.documentStep.update({
      where: { 
        id: req.params.stepId,
        document_status: { lead_id: req.params.leadId }
      },
      data: { 
        status,
        attachments: {
          create: attachments?.map(file => ({
            filename: file.filename,
            original_name: file.originalname,
            file_path: file.path,
            file_size: file.size
          })) || []
        }
      },
      include: {
        attachments: true
      }
    });

    res.json(step);
  } catch (error) {
    console.error('Error updating document step:', error);
    res.status(500).json({ error: 'Failed to update document step' });
  }
});

// Upload attachment
app.post('/api/documents/leads/:leadId/attachments', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const attachment = await prisma.attachment.create({
      data: {
        filename: req.file.filename,
        original_name: req.file.originalname,
        file_path: req.file.path,
        file_size: req.file.size,
        document_step_id: req.body.stepId
      }
    });

    res.json(attachment);
  } catch (error) {
    console.error('Error uploading attachment:', error);
    res.status(500).json({ error: 'Failed to upload attachment' });
  }
});

// Get closed leads history
app.get('/api/documents/history', async (req, res) => {
  try {
    const closedLeads = await prisma.lead.findMany({
      where: { 
        health_status: 'closed',
        document_status: {
          steps: {
            some: {
              status: 'completed'
            }
          }
        }
      },
      include: {
        assigned_agent: true,
        document_status: {
          include: {
            steps: {
              include: {
                attachments: true
              },
              orderBy: { step_number: 'asc' }
            }
          }
        }
      },
      orderBy: { updated_at: 'desc' }
    });

    res.json(closedLeads);
  } catch (error) {
    console.error('Error fetching closed leads:', error);
    res.status(500).json({ error: 'Failed to fetch closed leads' });
  }
});

// Create showcase
app.post('/api/showcases', async (req, res) => {
  try {
    const { lead_id, agent_id, listing_ids, message } = req.body;
    
    const showcase = await prisma.showcase.create({
      data: {
        lead_id,
        agent_id,
        listing_ids,
        message,
        public_slug: `sc_${Math.random().toString(36).slice(2, 8)}`
      },
      include: {
        lead: true,
        agent: true,
        listings: true
      }
    });

    res.json(showcase);
  } catch (error) {
    console.error('Error creating showcase:', error);
    res.status(500).json({ error: 'Failed to create showcase' });
  }
});

// Get public showcase
app.get('/api/showcases/:slug', async (req, res) => {
  try {
    const showcase = await prisma.showcase.findUnique({
      where: { public_slug: req.params.slug },
      include: {
        lead: true,
        agent: true,
        listings: true
      }
    });

    if (!showcase) {
      return res.status(404).json({ error: 'Showcase not found' });
    }

    res.json(showcase);
  } catch (error) {
    console.error('Error fetching showcase:', error);
    res.status(500).json({ error: 'Failed to fetch showcase' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 API endpoints available at http://localhost:${PORT}/api`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
