# Code Examples - Customer View Improvements

## 📚 Reference Guide for New Features

---

## 1. Using Toast Notifications

### Basic Usage:
```javascript
// Success toast (green)
window.showToast('Preferences saved successfully!', 'success');

// Error toast (red)
window.showToast('Failed to load lead details', 'error');

// Info toast (blue)
window.showToast('Recalculating match scores...', 'info');

// Warning toast (orange)
window.showToast('Customer data not found', 'warning');
```

### With Custom Duration:
```javascript
// Show for 5 seconds instead of default 3
window.showToast('This message stays longer', 'info', 5000);

// Show for 1 second (quick notification)
window.showToast('Quick update!', 'success', 1000);
```

### Function Signature:
```javascript
/**
 * Shows a toast notification message
 * @param {string} message - The message to display
 * @param {string} type - Type of toast: 'success', 'error', 'info', 'warning'
 * @param {number} duration - Duration in milliseconds (default: 3000)
 */
window.showToast(message, type = 'info', duration = 3000)
```

---

## 2. Input Validation

### Validation Function:
```javascript
/**
 * Validates input values for lead preferences
 * @param {Object} values - Object containing all input values
 * @returns {Object} - { isValid: boolean, errors: string[] }
 */
function validatePreferences(values) {
    const errors = [];

    // Validate bedrooms (must be a positive whole number if provided)
    if (values.bedrooms) {
        const bedroomsNum = parseFloat(values.bedrooms);
        if (isNaN(bedroomsNum)) {
            errors.push('Bedrooms must be a valid number');
        } else if (bedroomsNum < 0) {
            errors.push('Bedrooms cannot be negative');
        } else if (bedroomsNum > 10) {
            errors.push('Bedrooms cannot exceed 10');
        } else if (!Number.isInteger(bedroomsNum)) {
            errors.push('Bedrooms must be a whole number');
        }
    }

    // Validate bathrooms (must be in 0.5 increments)
    if (values.bathrooms) {
        const bathroomsNum = parseFloat(values.bathrooms);
        if (isNaN(bathroomsNum)) {
            errors.push('Bathrooms must be a valid number');
        } else if (bathroomsNum < 0) {
            errors.push('Bathrooms cannot be negative');
        } else if (bathroomsNum > 10) {
            errors.push('Bathrooms cannot exceed 10');
        } else if (bathroomsNum % 0.5 !== 0) {
            errors.push('Bathrooms must be in 0.5 increments (e.g., 1, 1.5, 2)');
        }
    }

    // Validate budget format
    if (values.budget) {
        const budgetStr = values.budget.trim();
        const budgetPattern = /^\$?\d+(\s*-\s*\$?\d+)?$/;
        if (!budgetPattern.test(budgetStr)) {
            errors.push('Budget must be a number or range (e.g., $1500 or $1200-$1800)');
        }
    }

    return {
        isValid: errors.length === 0,
        errors: errors
    };
}
```

### Usage Example:
```javascript
const validation = validatePreferences({
    bedrooms: '2',
    bathrooms: '1.5',
    budget: '$1500-$2000',
    moveInDate: '2024-12-01'
});

if (!validation.isValid) {
    showValidationErrors(validation.errors);
    return;
}

// Proceed with save...
```

---

## 3. Showing Validation Errors

### Error Display Function:
```javascript
/**
 * Shows validation errors on input fields
 * @param {string[]} errors - Array of error messages
 */
function showValidationErrors(errors) {
    // Create or update error message container
    let errorContainer = document.getElementById('preferencesErrorContainer');
    if (!errorContainer) {
        errorContainer = document.createElement('div');
        errorContainer.id = 'preferencesErrorContainer';
        errorContainer.style.cssText = 'background: #fee; border: 1px solid #fcc; color: #c33; padding: 12px; border-radius: 6px; margin-bottom: 16px; font-size: 14px;';
        
        const content = document.getElementById('leadDetailsContent');
        if (content) {
            content.insertBefore(errorContainer, content.firstChild);
        }
    }

    errorContainer.innerHTML = `
        <strong>⚠️ Please fix the following errors:</strong>
        <ul style="margin: 8px 0 0 20px; padding: 0;">
            ${errors.map(err => `<li>${err}</li>`).join('')}
        </ul>
    `;
    errorContainer.style.display = 'block';

    // Scroll to top to show errors
    const modal = document.querySelector('#leadDetailsModal .modal-body');
    if (modal) {
        modal.scrollTop = 0;
    }
}
```

---

## 4. Button State Management

### Save Button States:
```javascript
async function saveLeadPreferences(leadId, lead, options) {
    const saveBtn = document.getElementById('saveLeadPreferences');
    if (!saveBtn) return;

    // 1. LOADING STATE
    const originalText = saveBtn.textContent;
    saveBtn.disabled = true;
    saveBtn.textContent = '💾 Saving...';
    saveBtn.style.opacity = '0.6';
    saveBtn.style.cursor = 'not-allowed';

    try {
        // ... validation and save logic ...

        // 2. SUCCESS STATE
        saveBtn.textContent = '✓ Saved!';
        saveBtn.style.background = '#10b981';
        saveBtn.style.opacity = '1';
        saveBtn.style.transform = 'scale(1.05)';
        saveBtn.style.transition = 'all 0.2s ease';

        // Show toast
        if (window.showToast) {
            window.showToast('Preferences saved successfully!', 'success');
        }

        // 3. RESET STATE (after 2 seconds)
        setTimeout(() => {
            saveBtn.textContent = originalText;
            saveBtn.style.background = '';
            saveBtn.style.transform = 'scale(1)';
            saveBtn.disabled = false;
            saveBtn.style.cursor = 'pointer';
        }, 2000);

    } catch (error) {
        // 4. ERROR STATE
        console.error('❌ Error saving:', error);
        
        saveBtn.disabled = false;
        saveBtn.textContent = originalText;
        saveBtn.style.opacity = '1';
        saveBtn.style.cursor = 'pointer';
        saveBtn.style.background = '#ef4444'; // Red
        
        // Reset error styling after 3 seconds
        setTimeout(() => {
            saveBtn.style.background = '';
        }, 3000);
    }
}
```

---

## 5. Refreshing Missing Data Warning

### Function:
```javascript
/**
 * Refresh the missing data warning for the currently selected customer
 * Called after preferences are updated to check if warning should be hidden
 * @returns {Promise<void>}
 */
export async function refreshMissingDataWarning() {
    if (!state.customerView?.isActive || !state.customerView?.selectedCustomerId) {
        return;
    }

    const customerId = state.customerView.selectedCustomerId;
    
    try {
        const SupabaseAPI = await import('../api/supabase-api.js');
        const lead = await SupabaseAPI.getLead(customerId);
        
        if (!lead) {
            console.warn('⚠️ Could not fetch updated lead data');
            return;
        }

        // Update state with fresh data
        state.customerView.selectedCustomer = lead;

        // Check for missing preferences
        const missingFields = checkMissingPreferences(lead.preferences);

        const missingDataWarning = document.getElementById('missingDataWarning');

        if (missingFields.length > 0) {
            // Still have missing fields - update the warning
            // ... update warning HTML ...
        } else {
            // All fields filled - hide the warning with animation
            if (missingDataWarning) {
                missingDataWarning.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                missingDataWarning.style.opacity = '0';
                missingDataWarning.style.transform = 'translateY(-10px)';
                
                setTimeout(() => {
                    missingDataWarning.style.display = 'none';
                    missingDataWarning.style.opacity = '1';
                    missingDataWarning.style.transform = 'translateY(0)';
                }, 300);

                // Show success toast
                if (window.showToast) {
                    window.showToast('All required preferences are now complete!', 'success');
                }
            }
        }
    } catch (error) {
        console.error('❌ Error refreshing missing data warning:', error);
    }
}
```

### Usage:
```javascript
// After saving preferences in Customer View
if (state.customerView?.isActive) {
    const CustomerView = await import('../listings/customer-view.js');
    if (CustomerView.refreshMissingDataWarning) {
        await CustomerView.refreshMissingDataWarning();
    }
}
```

---

## 6. Defensive Coding Patterns

### Null Checks:
```javascript
// Check if element exists before using it
const saveBtn = document.getElementById('saveLeadPreferences');
if (!saveBtn) {
    console.error('❌ Save button not found');
    return;
}

// Check if function exists before calling it
if (window.showToast) {
    window.showToast('Message', 'success');
} else {
    console.warn('⚠️ showToast not available');
}

// Check if parameter is provided
if (!leadId) {
    console.error('❌ leadId is required');
    return;
}
```

### Try-Catch Blocks:
```javascript
export async function openLeadDetailsModal(leadId, options) {
    // Validate inputs first
    if (!leadId || !options?.api) {
        console.error('❌ Invalid parameters');
        return;
    }

    try {
        const lead = await api.getLead(leadId);
        
        if (!lead) {
            console.error('❌ Lead not found');
            if (window.showToast) {
                window.showToast('Lead not found', 'error');
            }
            return;
        }

        // ... rest of logic ...

    } catch (error) {
        console.error('❌ Error in openLeadDetailsModal:', error);
        if (window.showToast) {
            window.showToast('Failed to open lead details', 'error');
        }
    }
}
```

---

## 7. CSS Styling Examples

### Input Focus States:
```css
/* Normal focus */
#leadDetailsContent .input:focus,
#leadDetailsContent .select:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* Invalid state */
#leadDetailsContent .input:invalid {
    border-color: #ef4444;
}

/* Invalid + focused */
#leadDetailsContent .input:invalid:focus {
    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}
```

### Button Animations:
```css
#saveLeadPreferences {
    transition: all 0.2s ease;
}

#saveLeadPreferences:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

#saveLeadPreferences:active:not(:disabled) {
    transform: translateY(0);
}

#saveLeadPreferences:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}
```

---

## 8. Complete Save Workflow

```javascript
async function saveLeadPreferences(leadId, lead, options) {
    const { api, state } = options;
    const saveBtn = document.getElementById('saveLeadPreferences');
    
    if (!saveBtn) return;

    // 1. Set loading state
    const originalText = saveBtn.textContent;
    saveBtn.disabled = true;
    saveBtn.textContent = '💾 Saving...';
    saveBtn.style.opacity = '0.6';

    try {
        // 2. Get input values
        const bedrooms = document.getElementById('editBedrooms')?.value || '';
        const bathrooms = document.getElementById('editBathrooms')?.value || '';
        // ... other fields ...

        // 3. Validate inputs
        const validation = validatePreferences({ bedrooms, bathrooms });
        if (!validation.isValid) {
            showValidationErrors(validation.errors);
            // Reset button
            saveBtn.disabled = false;
            saveBtn.textContent = originalText;
            saveBtn.style.opacity = '1';
            return;
        }

        // 4. Hide previous errors
        hideValidationErrors();

        // 5. Build update object
        const updatedPreferences = {
            bedrooms,
            bathrooms,
            // ... other fields ...
        };

        // 6. Save to database
        const SupabaseAPI = await import('../api/supabase-api.js');
        await SupabaseAPI.updateLead(leadId, {
            preferences: updatedPreferences,
            updated_at: new Date().toISOString()
        });

        // 7. Show success state
        saveBtn.textContent = '✓ Saved!';
        saveBtn.style.background = '#10b981';
        saveBtn.style.transform = 'scale(1.05)';
        
        if (window.showToast) {
            window.showToast('Preferences saved successfully!', 'success');
        }

        // 8. If in Customer View, refresh warning and recalculate scores
        if (state.customerView?.isActive) {
            const CustomerView = await import('../listings/customer-view.js');
            await CustomerView.refreshMissingDataWarning();
            
            if (window.renderListings) {
                setTimeout(() => window.renderListings(), 500);
            }
        }

        // 9. Reset button after delay
        setTimeout(() => {
            saveBtn.textContent = originalText;
            saveBtn.style.background = '';
            saveBtn.style.transform = 'scale(1)';
            saveBtn.disabled = false;
        }, 2000);

    } catch (error) {
        // 10. Handle errors
        console.error('❌ Error saving:', error);
        
        showValidationErrors([
            'Failed to save preferences. Please check your connection and try again.',
            `Error details: ${error.message || 'Unknown error'}`
        ]);

        saveBtn.disabled = false;
        saveBtn.textContent = originalText;
        saveBtn.style.opacity = '1';
        saveBtn.style.background = '#ef4444';
        
        setTimeout(() => {
            saveBtn.style.background = '';
        }, 3000);
    }
}
```

---

## 🎯 Key Takeaways

1. **Always validate inputs** before saving
2. **Show specific error messages** (not generic ones)
3. **Use loading states** to prevent double-clicks
4. **Provide visual feedback** (toasts, animations)
5. **Add null checks** before accessing DOM elements
6. **Wrap async operations** in try-catch blocks
7. **Use toast notifications** instead of alerts
8. **Auto-refresh UI** after data changes

---

**All code is in the `feature/page-functions` branch!** 🚀

