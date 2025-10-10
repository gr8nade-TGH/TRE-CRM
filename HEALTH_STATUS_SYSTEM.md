# TRE CRM Health Status System

## Overview
Automated health status system that tracks lead engagement and provides real-time status updates based on time-based triggers and event tracking. **UPDATED: Now properly integrated with Documents page progress tracker.**

## Health Status Types
- 🟢 **Green**: Healthy/Active (80-100 points)
- 🟡 **Yellow**: Warm/Needs Attention (50-79 points)  
- 🔴 **Red**: At Risk/Urgent (20-49 points)
- ✅ **Closed**: Successfully completed
- ❌ **Lost**: Lead lost/abandoned (0-19 points)

## Document Step Integration

### Proper Step Names (Matches Documents Page)
- **New Lead**: No document status yet
- **Lease Agreement Sent**: First step in document process
- **Signed By Lead**: Lead has signed the lease
- **Signed By Property Owner**: Property owner has signed
- **Finalized by Agent**: Agent has finalized the lease
- **Payment Step**: Payment processing
- **Completed**: All steps finished

### Step Detection Logic
```javascript
function getProperCurrentStep(lead) {
    const docStatus = mockDocumentStatuses[lead.id];
    if (!docStatus) return 'New Lead';
    
    // Find the current step (in_progress or first pending)
    const currentStep = docStatus.steps.find(step => step.status === 'in_progress');
    if (currentStep) {
        return currentStep.name;
    }
    
    // If no in_progress step, find first pending
    const firstPending = docStatus.steps.find(step => step.status === 'pending');
    if (firstPending) {
        return firstPending.name;
    }
    
    // If all steps completed
    const allCompleted = docStatus.steps.every(step => step.status === 'completed');
    if (allCompleted) {
        return 'Completed';
    }
    
    return 'New Lead';
}
```

## Time-Based Triggers

### Initial Contact Triggers
```javascript
INITIAL_CONTACT: {
  threshold: 24, // hours
  action: 'send_showcase',
  escalation: 'yellow',
  message: 'Lead created 24+ hours ago - showcase not sent'
}
```

### Showcase Response Triggers
```javascript
SHOWCASE_RESPONSE: {
  threshold: 72, // hours
  action: 'follow_up',
  escalation: 'yellow',
  message: 'Showcase sent 72+ hours ago - no response'
}
```

### Document Progress Triggers
```javascript
LEASE_SIGNATURE_PENDING: {
  threshold: 48, // hours
  action: 'remind_signature',
  escalation: 'red',
  message: 'Lease pending signature for 48+ hours'
}
```

### Tour Scheduling Triggers
```javascript
TOUR_SCHEDULING: {
  threshold: 120, // hours (5 days)
  action: 'schedule_tour',
  escalation: 'yellow',
  message: 'No tour scheduled after 5 days'
}
```

### Engagement Loss Triggers
```javascript
ENGAGEMENT_LOSS: {
  threshold: 168, // hours (7 days)
  action: 're_engagement',
  escalation: 'red',
  message: 'No activity for 7+ days'
}
```

### **NEW: 3-Day Step Rule**
```javascript
STEP_TIMING_RULE: {
  threshold_1_day: 24, // hours
  threshold_2_days: 48, // hours  
  threshold_3_days: 72, // hours
  deduction_1_day: -5, // points
  deduction_2_days: -15, // points
  deduction_3_days: -25, // points
  message: 'On [Step Name] for X days - needs action'
}
```

## Event-Based Triggers

### Positive Events (Improve Health)
```javascript
POSITIVE_EVENTS: {
  SHOWCASE_OPENED: { impact: '+1', cooldown: 24 },
  SHOWCASE_CLICKED: { impact: '+2', cooldown: 12 },
  TOUR_SCHEDULED: { impact: '+3', cooldown: 0 },
  LEASE_SIGNED: { impact: '+5', cooldown: 0 },
  PAYMENT_RECEIVED: { impact: '+10', cooldown: 0 }
}
```

### Negative Events (Degrade Health)
```javascript
NEGATIVE_EVENTS: {
  EMAIL_BOUNCED: { impact: '-2', cooldown: 0 },
  NO_SHOW_TOUR: { impact: '-3', cooldown: 0 },
  LEASE_DECLINED: { impact: '-5', cooldown: 0 },
  COMPETITOR_CHOSEN: { impact: '-8', cooldown: 0 }
}
```

## Health Score Calculation

### Base Score: 100 points

### Time-Based Deductions
- No showcase sent in 24h: -20 points
- No response to showcase in 72h: -30 points
- Lease pending signature for 48h: -40 points
- No tour scheduled in 5 days: -25 points
- No activity for 7 days: -50 points

### **NEW: Document Step Timing Deductions (3-Day Rule)**
- On any step for 1+ days: -5 points
- On any step for 2+ days: -15 points
- On any step for 3+ days: -25 points
- Only applies to actual document steps (not "New Lead" or "Completed")

### Event-Based Adjustments
- Apply positive/negative event impacts
- Respect cooldown periods
- Document progress bonus: +0.2 points per % complete

### Final Status Determination
- 80-100 points: Green
- 50-79 points: Yellow
- 20-49 points: Red
- 0-19 points: Lost

## Dynamic Hover Messages

### Green Status Messages
```javascript
green: (lead) => [
  `✅ Lead is actively engaged`,
  `📄 Current step: ${currentStep}`,
  `⏰ Time on current step: ${timeOnCurrentStep}`,
  `📅 Last activity: ${formatTimeAgo(lead.last_activity_at)}`
]
```

### Yellow Status Messages
```javascript
yellow: (lead) => [
  `⚠️ Needs attention`,
  `📄 Current step: ${currentStep}`,
  `⏰ Time on current step: ${timeOnCurrentStep}`,
  `⏰ On ${currentStep} for ${days}d ${hours}h - needs action`, // NEW: 3-day warning
  `🎯 Recommended action: ${getRecommendedAction(lead)}`
]
```

### Red Status Messages
```javascript
red: (lead) => [
  `🚨 Urgent action required`,
  `📄 Current step: ${currentStep}`,
  `⏰ Time on current step: ${timeOnCurrentStep}`,
  `🚨 On ${currentStep} for ${days}d ${hours}h - URGENT`, // NEW: Urgent warning
  `🔥 Immediate action: ${getUrgentAction(lead)}`
]
```

## Action Recommendations

### **UPDATED: Step-Specific Recommendations**
```javascript
const STEP_RECOMMENDATIONS = {
  'New Lead': 'Send initial showcase',
  'Lease Agreement Sent': 'Follow up on lease agreement',
  'Signed By Lead': 'Send to property owner for signature',
  'Signed By Property Owner': 'Finalize lease agreement',
  'Finalized by Agent': 'Process payment step',
  'Payment Step': 'Complete payment processing',
  'Completed': 'Lead successfully closed'
};
```

### Recommended Actions
- Send showcase immediately (if 24h+ old, no showcase)
- Follow up with phone call (if 72h+ since showcase, no response)
- Reschedule tour (if 5+ days since tour scheduled)
- Send lease reminder (if 48h+ since lease sent)
- Continue normal follow-up (default)

### **UPDATED: Step-Specific Urgent Actions**
```javascript
const URGENT_ACTIONS = {
  'Lease Agreement Sent': 'Call lead immediately about lease',
  'Signed By Lead': 'Urgent: Send to property owner now',
  'Signed By Property Owner': 'Urgent: Finalize lease immediately',
  'Finalized by Agent': 'Urgent: Process payment now'
};
```

## Database Schema Extensions

### Lead Table Additions
```sql
ALTER TABLE leads ADD COLUMN:
- showcase_sent_at TIMESTAMP
- showcase_response_at TIMESTAMP  
- last_activity_at TIMESTAMP
- last_contact_at TIMESTAMP
- lease_sent_at TIMESTAMP
- lease_signed_at TIMESTAMP
- tour_scheduled_at TIMESTAMP
- tour_completed_at TIMESTAMP
- health_score INTEGER DEFAULT 100
- health_updated_at TIMESTAMP
- loss_reason TEXT
- follow_up_date DATE
```

### Events Table
```sql
CREATE TABLE lead_events (
  id SERIAL PRIMARY KEY,
  lead_id VARCHAR REFERENCES leads(id),
  event_type VARCHAR NOT NULL,
  event_data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Implementation Functions

### **UPDATED: Core Health Calculation**
```javascript
function calculateHealthStatus(lead) {
  const now = new Date();
  const leadAge = now - new Date(lead.submitted_at);
  let healthScore = 100;
  
  // Get proper current step info
  const currentStep = getProperCurrentStep(lead);
  const stepHours = getStepHours(lead, currentStep);
  
  // Time-based deductions
  if (leadAge > 24 * 60 * 60 * 1000 && !lead.showcase_sent_at) {
    healthScore -= 20;
  }
  
  if (lead.showcase_sent_at && leadAge > 72 * 60 * 60 * 1000 && !lead.showcase_response_at) {
    healthScore -= 30;
  }
  
  if (lead.lease_sent_at && leadAge > 48 * 60 * 60 * 1000 && !lead.lease_signed_at) {
    healthScore -= 40;
  }
  
  if (leadAge > 120 * 60 * 60 * 1000 && !lead.tour_scheduled_at) {
    healthScore -= 25;
  }
  
  if (leadAge > 168 * 60 * 60 * 1000 && !lead.last_activity_at) {
    healthScore -= 50;
  }
  
  // NEW: Document step timing deductions (3-day rule)
  if (currentStep !== 'New Lead' && currentStep !== 'Completed') {
    if (stepHours > 72) { // 3 days
      healthScore -= 25; // Major deduction for being stuck on step
    } else if (stepHours > 48) { // 2 days
      healthScore -= 15; // Moderate deduction
    } else if (stepHours > 24) { // 1 day
      healthScore -= 5; // Minor deduction
    }
  }
  
  // Event-based adjustments
  lead.events?.forEach(event => {
    const eventImpacts = {
      'SHOWCASE_OPENED': 1,
      'SHOWCASE_CLICKED': 2,
      'TOUR_SCHEDULED': 3,
      'LEASE_SIGNED': 5,
      'PAYMENT_RECEIVED': 10,
      'EMAIL_BOUNCED': -2,
      'NO_SHOW_TOUR': -3,
      'LEASE_DECLINED': -5,
      'COMPETITOR_CHOSEN': -8
    };
    
    if (eventImpacts[event.type]) {
      healthScore += eventImpacts[event.type];
    }
  });
  
  // Document progress bonus
  const docProgress = getDocumentProgress(lead.id);
  healthScore += (docProgress * 0.2); // Up to 20 points for full progress
  
  // Ensure score stays within bounds
  healthScore = Math.max(0, Math.min(100, healthScore));
  
  // Determine final status
  if (healthScore >= 80) return 'green';
  if (healthScore >= 50) return 'yellow';
  if (healthScore >= 20) return 'red';
  return 'lost';
}
```

### **NEW: Step Timing Helper Functions**
```javascript
// Get time on current step
function getTimeOnCurrentStep(lead) {
  const docStatus = mockDocumentStatuses[lead.id];
  if (!docStatus) return 'Never';
  
  // Find the current step
  const currentStep = docStatus.steps.find(step => step.status === 'in_progress');
  if (currentStep && currentStep.updated_at) {
    return formatTimeAgo(currentStep.updated_at);
  }
  
  // If no in_progress step, use last completed step
  const lastCompleted = docStatus.steps
    .filter(step => step.status === 'completed')
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))[0];
  
  if (lastCompleted && lastCompleted.updated_at) {
    return formatTimeAgo(lastCompleted.updated_at);
  }
  
  return 'Never';
}

// Helper function to get hours on current step
function getStepHours(lead, stepName) {
  const docStatus = mockDocumentStatuses[lead.id];
  if (!docStatus) return 0;
  
  const step = docStatus.steps.find(s => s.name === stepName);
  if (!step || !step.updated_at) return 0;
  
  const now = new Date();
  const stepTime = new Date(step.updated_at);
  return Math.floor((now - stepTime) / (60 * 60 * 1000));
}
```

### Health Monitoring Class
```javascript
class HealthMonitor {
  constructor() {
    this.checkInterval = 5 * 60 * 1000; // 5 minutes
    this.startMonitoring();
  }
  
  startMonitoring() {
    setInterval(() => {
      this.updateAllLeadHealth();
    }, this.checkInterval);
  }
  
  updateAllLeadHealth() {
    mockLeads.forEach(lead => {
      const newHealth = calculateHealthStatus(lead);
      if (lead.health_status !== newHealth) {
        lead.health_status = newHealth;
        lead.health_updated_at = new Date().toISOString();
        this.handleHealthChange(lead, newHealth);
      }
    });
    
    if (state.currentView === 'leads') {
      renderLeads();
    }
  }
  
  handleHealthChange(lead, newHealth) {
    if (newHealth === 'red') {
      this.sendUrgentNotification(lead);
    }
    if (newHealth === 'lost') {
      this.sendLossNotification(lead);
    }
  }
}
```

## Implementation Priority

### Phase 1: Basic Time-Based Triggers ✅ COMPLETED
1. ✅ Implement `calculateHealthStatus()` function
2. ✅ Add time-based health deductions
3. ✅ Update hover messages with dynamic content
4. ✅ Test with existing mock data
5. ✅ **NEW**: Integrate with Documents page step names
6. ✅ **NEW**: Add 3-day step timing rule
7. ✅ **NEW**: Step-specific action recommendations

### Phase 2: Event Tracking
1. Create lead events system
2. Implement positive/negative event impacts
3. Add event logging to key actions
4. Update health calculation with events

### Phase 3: Real-Time Monitoring
1. Implement HealthMonitor class
2. Add automatic health updates
3. Create notification system
4. Add health change alerts

### Phase 4: Advanced Features
1. Predictive health scoring
2. Automated action recommendations
3. Health trend analytics
4. Performance dashboards

## Usage Examples

### Manual Health Check
```javascript
const lead = mockLeads[0];
const healthStatus = calculateHealthStatus(lead);
console.log(`Lead ${lead.name} health: ${healthStatus}`);
```

### Event Logging
```javascript
function logLeadEvent(leadId, eventType, eventData) {
  const event = {
    lead_id: leadId,
    event_type: eventType,
    event_data: eventData,
    created_at: new Date().toISOString()
  };
  
  // Add to lead's events array
  const lead = mockLeads.find(l => l.id === leadId);
  if (lead) {
    lead.events = lead.events || [];
    lead.events.push(event);
  }
}
```

### Health Status Update
```javascript
function updateLeadHealth(leadId) {
  const lead = mockLeads.find(l => l.id === leadId);
  if (lead) {
    const newHealth = calculateHealthStatus(lead);
    lead.health_status = newHealth;
    lead.health_updated_at = new Date().toISOString();
    
    // Re-render if on leads page
    if (state.currentView === 'leads') {
      renderLeads();
    }
  }
}
```

## **RECENT CHANGES LOG**

### ✅ COMPLETED: Document Step Integration (Latest Update)
- **Fixed**: Health status now uses proper document step names that match Documents page
- **Added**: 3-day rule for step timing (1d: -5pts, 2d: -15pts, 3d+: -25pts)
- **Enhanced**: Step-specific action recommendations
- **Improved**: Accurate step timing calculation using `updated_at` timestamps
- **Updated**: Hover messages show step-specific warnings for leads stuck on steps

### ✅ COMPLETED: Dynamic Health Messages
- **Removed**: Redundant health score from green status bullet points
- **Added**: Current step and time on current step to all status types
- **Enhanced**: Step-specific urgent warnings for leads stuck 3+ days
- **Improved**: Action recommendations based on actual document progress

### ✅ COMPLETED: Mock Data Enhancement
- **Added**: Health tracking timestamps to mock lead data
- **Added**: Events array for future event tracking
- **Added**: Realistic data distribution across leads
- **Added**: Automatic health status initialization on page load

## Future Enhancements

### AI/ML Integration
- Predictive lead scoring
- Automated follow-up timing
- Churn prediction
- Optimal contact frequency

### Advanced Analytics
- Health trend analysis
- Agent performance metrics
- Conversion rate optimization
- Lead source effectiveness

### Automation Features
- Automated email sequences
- Smart scheduling
- Dynamic pricing recommendations
- Competitive analysis alerts

## **NEXT STEPS FOR PRODUCTION**

### 1. Event Tracking Implementation
- Add event logging to showcase sending
- Track email opens/clicks
- Monitor tour scheduling/completion
- Log lease signature events

### 2. Real-Time Triggers
- Implement HealthMonitor class
- Add automatic health updates every 5 minutes
- Create notification system for status changes
- Add dashboard alerts for urgent leads

### 3. Database Integration
- Add health tracking fields to leads table
- Create lead_events table
- Implement server-side health calculations
- Add health status caching for performance

### 4. Notification System
- Email alerts for urgent leads
- Dashboard notifications
- Mobile push notifications
- Slack/Teams integration