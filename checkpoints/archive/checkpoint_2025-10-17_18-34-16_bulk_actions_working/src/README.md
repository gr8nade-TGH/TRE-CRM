# TRE CRM - Modular Architecture

## 📁 Module Structure

This directory contains the modularized version of the TRE CRM application, broken down from the original monolithic `script.js` file.

### Current Status: Phase 1 - Utilities ✅

**Completed:**
- ✅ `utils/helpers.js` - Common utility functions
- ✅ `utils/validators.js` - Validation functions
- ✅ Test file created (`test-modules.html`)

**In Progress:**
- 🔄 State management modules
- 🔄 API layer modules
- 🔄 Feature modules

---

## 📦 Module Organization

```
src/
├── utils/              # Utility functions
│   ├── helpers.js      # Common helpers (formatDate, toast, etc.)
│   └── validators.js   # Validation functions
├── state/              # State management (planned)
│   ├── state.js        # Global state object
│   └── mockData.js     # Mock data arrays
├── api/                # API layer (planned)
│   ├── apiClient.js    # Base API configuration
│   ├── leadsAPI.js     # Leads API calls
│   ├── agentsAPI.js    # Agents API calls
│   ├── listingsAPI.js  # Listings API calls
│   └── specialsAPI.js  # Specials API calls
├── features/           # Feature modules (planned)
│   ├── leads/
│   │   ├── leadsManager.js
│   │   ├── leadsRenderer.js
│   │   └── healthStatus.js
│   ├── agents/
│   │   ├── agentsManager.js
│   │   └── agentsRenderer.js
│   ├── listings/
│   │   ├── listingsManager.js
│   │   ├── listingsRenderer.js
│   │   └── mapManager.js
│   └── ...
├── routing/            # Routing (planned)
│   └── router.js       # Route handling
└── main.js             # Entry point (planned)
```

---

## 🧪 Testing Modules

### Test the Utility Modules

1. Open `test-modules.html` in your browser
2. Click "Run Helper Tests" to test helper functions
3. Click "Run Validator Tests" to test validation functions
4. Click "Test Toast" to see toast notifications
5. Click "Test Modal" to test modal functions

All tests should pass (green checkmarks).

---

## 📚 Module Documentation

### utils/helpers.js

**Exported Functions:**
- `formatDate(iso)` - Format ISO date to localized string
- `showModal(modalId)` - Show a modal by ID
- `hideModal(modalId)` - Hide a modal by ID
- `toast(message, type, duration)` - Show toast notification
- `show(element)` - Show an element
- `hide(element)` - Hide an element
- `debounce(func, wait)` - Debounce function calls
- `throttle(func, limit)` - Throttle function calls
- `generateId(prefix)` - Generate unique ID
- `deepClone(obj)` - Deep clone object
- `isEmpty(value)` - Check if value is empty
- `formatCurrency(amount, currency)` - Format currency
- `formatPhone(phone)` - Format phone number
- `capitalize(str)` - Capitalize first letter
- `truncate(str, length, suffix)` - Truncate string
- `sleep(ms)` - Async sleep/delay
- `getQueryParam(param)` - Get URL query parameter
- `setQueryParam(param, value)` - Set URL query parameter

### utils/validators.js

**Exported Functions:**
- `isValidEmail(email)` - Validate email address
- `isValidPhone(phone)` - Validate phone number
- `isRequired(value)` - Check if required field is filled
- `minLength(value, minLength)` - Validate minimum length
- `maxLength(value, maxLength)` - Validate maximum length
- `inRange(value, min, max)` - Validate number range
- `isValidUrl(url)` - Validate URL
- `isValidDate(date)` - Validate date
- `isFutureDate(date)` - Check if date is in future
- `isPastDate(date)` - Check if date is in past
- `validatePassword(password)` - Validate password strength
- `validateForm(data, rules)` - Validate entire form
- `sanitizeHtml(html)` - Sanitize HTML to prevent XSS
- `isValidCreditCard(cardNumber)` - Validate credit card (Luhn)
- `isValidZip(zip)` - Validate ZIP code

---

## 🔄 Migration Strategy

### Phase 1: Utilities ✅ COMPLETE
- Extract helper functions
- Extract validation functions
- Create test file
- Verify all functions work

### Phase 2: State & Mock Data (Next)
- Extract state object
- Extract mock data arrays
- Create state management module
- Test state updates

### Phase 3: API Layer
- Extract API configuration
- Create API client modules
- Separate API calls by feature
- Test API integration

### Phase 4: Features
- Extract leads management
- Extract agents management
- Extract listings management
- Extract other features
- Test each feature module

### Phase 5: Integration
- Create main.js entry point
- Update index.html to use modules
- Remove old script.js
- Final testing

---

## 🚀 Usage

### Importing Modules

```javascript
// Import specific functions
import { formatDate, toast } from './src/utils/helpers.js';
import { isValidEmail, validateForm } from './src/utils/validators.js';

// Import all functions
import * as helpers from './src/utils/helpers.js';
import * as validators from './src/utils/validators.js';

// Use the functions
const formattedDate = formatDate(new Date().toISOString());
toast('Success!', 'success');

if (isValidEmail('test@example.com')) {
  console.log('Valid email');
}
```

### In HTML

```html
<script type="module">
  import { toast, showModal } from './src/utils/helpers.js';
  
  // Use the functions
  toast('Welcome!', 'info');
</script>
```

---

## ⚠️ Important Notes

1. **ES6 Modules Required** - All modules use ES6 import/export syntax
2. **Browser Support** - Requires modern browsers with module support
3. **CORS** - Must be served via HTTP/HTTPS (not file://)
4. **Backward Compatibility** - Original script.js remains untouched
5. **Testing** - Test each module before integration

---

## 🔧 Development Workflow

1. **Create Module** - Extract code from script.js
2. **Export Functions** - Use ES6 export syntax
3. **Test Module** - Add tests to test-modules.html
4. **Verify** - Ensure all tests pass
5. **Document** - Update this README
6. **Commit** - Commit working module

---

## 📝 Changelog

### 2025-10-17 - Phase 1 Complete
- ✅ Created `utils/helpers.js` with 20+ utility functions
- ✅ Created `utils/validators.js` with 15+ validation functions
- ✅ Created `test-modules.html` for testing
- ✅ All tests passing
- ✅ Documentation complete

---

## 🎯 Next Steps

1. Extract state management (state.js, mockData.js)
2. Test state module
3. Extract API layer
4. Begin feature extraction (leads first)
5. Continue incremental migration

---

## 🆘 Rollback

If anything breaks, restore from checkpoint:
```
Checkpoint ID: 2025-10-17_00-25-48
Location: checkpoints/CHECKPOINT_2025-10-17_00-25-48_MANIFEST.md
```

Tell the AI: "Restore checkpoint 2025-10-17_00-25-48"

