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

// Showcase endpoints
app.post('/api/showcases', async (req, res) => {
  try {
    const { lead_id, agent_id, listing_ids, message, showcase_id, landing_url } = req.body;
    
    const showcase = await prisma.showcase.create({
      data: {
        lead_id,
        agent_id,
        listing_ids,
        message,
        public_slug: showcase_id,
        landing_url,
        status: 'created'
      },
      include: {
        lead: true,
        agent: true
      }
    });

    res.json(showcase);
  } catch (error) {
    console.error('Error creating showcase:', error);
    res.status(500).json({ error: 'Failed to create showcase' });
  }
});

app.get('/api/showcases/:id', async (req, res) => {
  try {
    const showcase = await prisma.showcase.findUnique({
      where: { id: req.params.id },
      include: {
        lead: true,
        agent: true,
        listings: {
          include: {
            property: true
          }
        },
        interactions: {
          orderBy: { created_at: 'desc' }
        }
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

app.post('/api/showcases/:id/track', async (req, res) => {
  try {
    const { action, property_id, metadata } = req.body;
    
    const interaction = await prisma.showcaseInteraction.create({
      data: {
        showcase_id: req.params.id,
        action,
        property_id,
        metadata
      }
    });

    // Update showcase status based on action
    if (action === 'page_view') {
      await prisma.showcase.update({
        where: { id: req.params.id },
        data: { status: 'opened' }
      });
    } else if (action === 'property_click') {
      await prisma.showcase.update({
        where: { id: req.params.id },
        data: { status: 'clicked' }
      });
    }

    res.json(interaction);
  } catch (error) {
    console.error('Error tracking interaction:', error);
    res.status(500).json({ error: 'Failed to track interaction' });
  }
});

// Lead interest endpoints
app.post('/api/lead-interests', async (req, res) => {
  try {
    const { lead_id, property_id, agent_id, interest_type, status, notes } = req.body;
    
    const interest = await prisma.leadInterest.upsert({
      where: {
        lead_id_property_id: {
          lead_id,
          property_id
        }
      },
      update: {
        status,
        notes,
        updated_at: new Date()
      },
      create: {
        lead_id,
        property_id,
        agent_id,
        interest_type,
        status,
        notes
      },
      include: {
        lead: true,
        property: true,
        agent: true
      }
    });

    res.json(interest);
  } catch (error) {
    console.error('Error creating/updating lead interest:', error);
    res.status(500).json({ error: 'Failed to create/update lead interest' });
  }
});

app.get('/api/properties/:id/interests', async (req, res) => {
  try {
    const interests = await prisma.leadInterest.findMany({
      where: { property_id: req.params.id },
      include: {
        lead: true,
        agent: true
      },
      orderBy: { created_at: 'desc' }
    });

    res.json(interests);
  } catch (error) {
    console.error('Error fetching property interests:', error);
    res.status(500).json({ error: 'Failed to fetch property interests' });
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

// ===== USER MANAGEMENT API =====

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        creator: {
          select: { name: true }
        },
        suspender: {
          select: { name: true }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get single user
app.get('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        creator: {
          select: { name: true }
        },
        suspender: {
          select: { name: true }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Create new user
app.post('/api/users', async (req, res) => {
  try {
    const { name, email, role, password, sendInvitation, createdBy } = req.body;

    // Basic validation
    if (!name || !email || !role) {
      return res.status(400).json({ error: 'Name, email, and role are required' });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Hash password (in production, use bcrypt)
    const passwordHash = password ? `hashed_${password}` : null;

    // Create user
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        role: role.toUpperCase(),
        password_hash: passwordHash,
        status: sendInvitation ? 'INVITED' : 'ACTIVE',
        created_by: createdBy,
        invited_at: sendInvitation ? new Date() : null,
        active: true
      },
      include: {
        creator: {
          select: { name: true }
        }
      }
    });

    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        action: 'user_created',
        user_id: newUser.id,
        user_name: newUser.name,
        user_email: newUser.email,
        performed_by: createdBy || 'system',
        performed_by_name: 'System', // In production, get from JWT token
        details: `User created with ${role} role${sendInvitation ? ' and invitation sent' : ''}`
      }
    });

    res.status(201).json(newUser);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user
app.put('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, status, updatedBy } = req.body;

    const existingUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if email is being changed and if it's already taken
    if (email && email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email }
      });
      if (emailExists) {
        return res.status(400).json({ error: 'Email already in use' });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(role && { role: role.toUpperCase() }),
        ...(status && { status: status.toUpperCase() }),
        updated_at: new Date()
      },
      include: {
        creator: {
          select: { name: true }
        },
        suspender: {
          select: { name: true }
        }
      }
    });

    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        action: 'user_updated',
        user_id: id,
        user_name: updatedUser.name,
        user_email: updatedUser.email,
        performed_by: updatedBy || 'system',
        performed_by_name: 'System', // In production, get from JWT token
        details: `User updated: ${name ? 'name changed' : ''} ${email ? 'email changed' : ''} ${role ? 'role changed' : ''} ${status ? 'status changed' : ''}`
      }
    });

    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user
app.delete('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { deletedBy } = req.body;

    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Create audit log entry before deletion
    await prisma.auditLog.create({
      data: {
        action: 'user_deleted',
        user_id: id,
        user_name: user.name,
        user_email: user.email,
        performed_by: deletedBy || 'system',
        performed_by_name: 'System', // In production, get from JWT token
        details: `User ${user.name} deleted`
      }
    });

    // Delete user
    await prisma.user.delete({
      where: { id }
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Change user password
app.put('/api/users/:id/password', async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword, updatedBy } = req.body;

    if (!newPassword) {
      return res.status(400).json({ error: 'New password is required' });
    }

    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Hash password (in production, use bcrypt)
    const passwordHash = `hashed_${newPassword}`;

    await prisma.user.update({
      where: { id },
      data: {
        password_hash: passwordHash,
        updated_at: new Date()
      }
    });

    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        action: 'password_changed',
        user_id: id,
        user_name: user.name,
        user_email: user.email,
        performed_by: updatedBy || 'system',
        performed_by_name: 'System', // In production, get from JWT token
        details: 'Password updated'
      }
    });

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

// Suspend user
app.put('/api/users/:id/suspend', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, suspendedBy } = req.body;

    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        status: 'SUSPENDED',
        suspended_at: new Date(),
        suspended_by: suspendedBy,
        suspension_reason: reason,
        access_revoked: true,
        updated_at: new Date()
      }
    });

    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        action: 'user_suspended',
        user_id: id,
        user_name: user.name,
        user_email: user.email,
        performed_by: suspendedBy || 'system',
        performed_by_name: 'System', // In production, get from JWT token
        details: `User suspended${reason ? `: ${reason}` : ''}`
      }
    });

    res.json(updatedUser);
  } catch (error) {
    console.error('Error suspending user:', error);
    res.status(500).json({ error: 'Failed to suspend user' });
  }
});

// Get audit log
app.get('/api/audit-log', async (req, res) => {
  try {
    const { action, limit = 50 } = req.query;
    
    const where = action && action !== 'all' ? { action } : {};
    
    const auditLogs = await prisma.auditLog.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: parseInt(limit)
    });

    res.json(auditLogs);
  } catch (error) {
    console.error('Error fetching audit log:', error);
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
});

// ===== BUG TRACKER API ROUTES =====

// Get all bugs with filters
app.get('/api/bugs', async (req, res) => {
  try {
    const { 
      status, 
      priority, 
      page = 1, 
      pageSize = 10,
      search 
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const take = parseInt(pageSize);

    // Build where clause
    const where = {};
    if (status) where.status = status.toUpperCase();
    if (priority) where.priority = priority.toUpperCase();
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { reported_by_name: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [bugs, total] = await Promise.all([
      prisma.bug.findMany({
        where,
        skip,
        take,
        orderBy: { created_at: 'desc' },
        include: {
          reporter: {
            select: { id: true, name: true, email: true }
          },
          assignee: {
            select: { id: true, name: true, email: true }
          }
        }
      }),
      prisma.bug.count({ where })
    ]);

    res.json({ items: bugs, total });
  } catch (error) {
    console.error('Error fetching bugs:', error);
    res.status(500).json({ error: 'Failed to fetch bugs' });
  }
});

// Get single bug by ID
app.get('/api/bugs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const bug = await prisma.bug.findUnique({
      where: { id },
      include: {
        reporter: {
          select: { id: true, name: true, email: true }
        },
        assignee: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    if (!bug) {
      return res.status(404).json({ error: 'Bug not found' });
    }

    res.json(bug);
  } catch (error) {
    console.error('Error fetching bug:', error);
    res.status(500).json({ error: 'Failed to fetch bug' });
  }
});

// Create new bug report
app.post('/api/bugs', upload.single('screenshot'), async (req, res) => {
  try {
    const {
      title,
      description,
      expected,
      steps,
      priority = 'MEDIUM',
      category = 'OTHER',
      page,
      page_url,
      reported_by,
      reported_by_name,
      technical_context
    } = req.body;

    // Handle screenshot upload
    let screenshot_url = null;
    if (req.file) {
      screenshot_url = `/uploads/${req.file.filename}`;
    }

    // Parse technical context if it's a string
    let parsedTechnicalContext = technical_context;
    if (typeof technical_context === 'string') {
      try {
        parsedTechnicalContext = JSON.parse(technical_context);
      } catch (e) {
        parsedTechnicalContext = { raw: technical_context };
      }
    }

    const bug = await prisma.bug.create({
      data: {
        title,
        description,
        expected: expected || null,
        steps: steps || null,
        priority: priority.toUpperCase(),
        category: category.toUpperCase(),
        page,
        page_url,
        reported_by,
        reported_by_name,
        screenshot_url,
        technical_context: parsedTechnicalContext
      },
      include: {
        reporter: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    res.status(201).json(bug);
  } catch (error) {
    console.error('Error creating bug:', error);
    res.status(500).json({ error: 'Failed to create bug' });
  }
});

// Update bug
app.put('/api/bugs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      status,
      priority,
      assigned_to,
      assigned_to_name,
      resolution_notes
    } = req.body;

    const updateData = {};
    if (status) updateData.status = status.toUpperCase();
    if (priority) updateData.priority = priority.toUpperCase();
    if (assigned_to !== undefined) updateData.assigned_to = assigned_to;
    if (assigned_to_name !== undefined) updateData.assigned_to_name = assigned_to_name;
    if (resolution_notes !== undefined) updateData.resolution_notes = resolution_notes;

    const bug = await prisma.bug.update({
      where: { id },
      data: updateData,
      include: {
        reporter: {
          select: { id: true, name: true, email: true }
        },
        assignee: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    res.json(bug);
  } catch (error) {
    console.error('Error updating bug:', error);
    res.status(500).json({ error: 'Failed to update bug' });
  }
});

// Delete bug
app.delete('/api/bugs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Delete associated screenshot file if it exists
    const bug = await prisma.bug.findUnique({
      where: { id },
      select: { screenshot_url: true }
    });

    if (bug && bug.screenshot_url) {
      const filePath = path.join(__dirname, bug.screenshot_url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await prisma.bug.delete({
      where: { id }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting bug:', error);
    res.status(500).json({ error: 'Failed to delete bug' });
  }
});

// Upload screenshot for existing bug
app.post('/api/bugs/:id/screenshot', upload.single('screenshot'), async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No screenshot file provided' });
    }

    // Delete old screenshot if it exists
    const existingBug = await prisma.bug.findUnique({
      where: { id },
      select: { screenshot_url: true }
    });

    if (existingBug && existingBug.screenshot_url) {
      const oldFilePath = path.join(__dirname, existingBug.screenshot_url);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    }

    // Update bug with new screenshot URL
    const screenshot_url = `/uploads/${req.file.filename}`;
    const bug = await prisma.bug.update({
      where: { id },
      data: { screenshot_url },
      include: {
        reporter: {
          select: { id: true, name: true, email: true }
        },
        assignee: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    res.json(bug);
  } catch (error) {
    console.error('Error uploading screenshot:', error);
    res.status(500).json({ error: 'Failed to upload screenshot' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 API endpoints available at http://localhost:${PORT}/api`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});