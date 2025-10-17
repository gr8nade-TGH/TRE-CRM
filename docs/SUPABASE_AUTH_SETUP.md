# Supabase Authentication Setup Guide

## 🔐 **Step 1: Enable Authentication in Supabase Dashboard**

1. **Go to:** https://supabase.com/dashboard
2. **Select your project** (gr8nade-TGH's Project)
3. **Go to Authentication → Settings**
4. **Enable Email Authentication:**
   - Check "Enable email confirmations"
   - Set "Site URL" to your domain (or `http://localhost:3000` for local testing)
   - Set "Redirect URLs" to include your domain

## 🔐 **Step 2: Configure Email Templates**

1. **Go to Authentication → Email Templates**
2. **Customize templates** for:
   - Confirm signup
   - Reset password
   - Magic link
   - Change email

## 🔐 **Step 3: Add Authentication to Your App**

### **Update supabase-client.js:**
```javascript
// Add authentication functions
async function signUp(email, password, userData) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData // name, role, etc.
      }
    });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Sign up error:', error);
    throw error;
  }
}

async function signIn(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Sign in error:', error);
    throw error;
  }
}

async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error) {
    console.error('Sign out error:', error);
    throw error;
  }
}

async function getCurrentUser() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch (error) {
    console.error('Get user error:', error);
    return null;
  }
}

// Export auth functions
window.signUp = signUp;
window.signIn = signIn;
window.signOut = signOut;
window.getCurrentUser = getCurrentUser;
```

## 🔐 **Step 4: Create Login/Register UI**

### **Add to index.html:**
```html
<!-- Login Modal -->
<div id="loginModal" class="modal" style="display: none;">
  <div class="modal-card">
    <div class="modal-header">
      <h3>Login to TRE CRM</h3>
      <button class="close-btn" onclick="closeLoginModal()">×</button>
    </div>
    <div class="modal-body">
      <form id="loginForm">
        <div class="field">
          <label>Email</label>
          <input type="email" id="loginEmail" required>
        </div>
        <div class="field">
          <label>Password</label>
          <input type="password" id="loginPassword" required>
        </div>
        <div class="field">
          <button type="submit" class="btn primary">Login</button>
        </div>
      </form>
      <p>Don't have an account? <a href="#" onclick="showRegisterModal()">Register</a></p>
    </div>
  </div>
</div>

<!-- Register Modal -->
<div id="registerModal" class="modal" style="display: none;">
  <div class="modal-card">
    <div class="modal-header">
      <h3>Register for TRE CRM</h3>
      <button class="close-btn" onclick="closeRegisterModal()">×</button>
    </div>
    <div class="modal-body">
      <form id="registerForm">
        <div class="field">
          <label>Name</label>
          <input type="text" id="registerName" required>
        </div>
        <div class="field">
          <label>Email</label>
          <input type="email" id="registerEmail" required>
        </div>
        <div class="field">
          <label>Password</label>
          <input type="password" id="registerPassword" required>
        </div>
        <div class="field">
          <label>Role</label>
          <select id="registerRole" required>
            <option value="agent">Agent</option>
            <option value="manager">Manager</option>
          </select>
        </div>
        <div class="field">
          <button type="submit" class="btn primary">Register</button>
        </div>
      </form>
      <p>Already have an account? <a href="#" onclick="showLoginModal()">Login</a></p>
    </div>
  </div>
</div>
```

## 🔐 **Step 5: Add Authentication Logic**

### **Add to script.js:**
```javascript
// Authentication state
let currentUser = null;

// Check authentication on page load
async function checkAuth() {
  const user = await getCurrentUser();
  if (user) {
    currentUser = user;
    showMainApp();
  } else {
    showLoginModal();
  }
}

// Show main app
function showMainApp() {
  document.getElementById('loginModal').style.display = 'none';
  document.getElementById('registerModal').style.display = 'none';
  // Show your main app content
}

// Handle login
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  
  try {
    await signIn(email, password);
    await checkAuth();
  } catch (error) {
    alert('Login failed: ' + error.message);
  }
});

// Handle register
document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('registerName').value;
  const email = document.getElementById('registerEmail').value;
  const password = document.getElementById('registerPassword').value;
  const role = document.getElementById('registerRole').value;
  
  try {
    await signUp(email, password, { name, role });
    alert('Registration successful! Please check your email to confirm your account.');
    showLoginModal();
  } catch (error) {
    alert('Registration failed: ' + error.message);
  }
});

// Initialize auth check
document.addEventListener('DOMContentLoaded', checkAuth);
```

## 🔐 **Step 6: Create Initial Users**

### **Option A: Use Supabase Dashboard**
1. **Go to Authentication → Users**
2. **Click "Add User"**
3. **Create users manually**

### **Option B: Use Supabase CLI**
```bash
# Create a user via CLI
npx supabase auth users create --email agent1@example.com --password password123
npx supabase auth users create --email manager1@example.com --password password123
```

## 🔐 **Step 7: Update User Data**

After creating users, you'll need to add them to your `users` table with proper roles:

```sql
-- Insert user data into users table
INSERT INTO users (id, email, name, role, created_at)
VALUES 
  ('user-uuid-1', 'agent1@example.com', 'Agent One', 'agent', NOW()),
  ('user-uuid-2', 'manager1@example.com', 'Manager One', 'manager', NOW());
```

## 🎯 **Next Steps:**

1. **Enable Auth** in Supabase Dashboard
2. **Add the authentication code** to your app
3. **Create initial users**
4. **Test login/logout**

**Would you like me to help you implement any of these steps?**
