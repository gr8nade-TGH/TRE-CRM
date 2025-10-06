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

    // Convert health_status from uppercase to lowercase for frontend compatibility
    const convertedLeads = leads.map(lead => ({
      ...lead,
      health_status: lead.health_status.toLowerCase()
    }));

    const total = await prisma.lead.count({ where });

    res.json({
      items: convertedLeads,
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

    // Convert health_status from uppercase to lowercase for frontend compatibility
    const convertedLead = {
      ...lead,
      health_status: lead.health_status.toLowerCase()
    };

    res.json(convertedLead);
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
      where: { role: 'AGENT' },
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