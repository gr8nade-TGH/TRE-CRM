/**
 * Email Dashboard Tab Management
 * Handles tab switching for the mission-control email dashboard
 */

/**
 * Initialize email dashboard tabs
 */
export function initializeEmailTabs() {
    console.log('🔀 Initializing email dashboard tabs...');
    
    const tabs = document.querySelectorAll('.email-tab');
    const tabContents = document.querySelectorAll('.email-tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            
            // Remove active class from all tabs and contents
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(tc => tc.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding content
            tab.classList.add('active');
            const content = document.querySelector(`[data-tab-content="${tabName}"]`);
            if (content) {
                content.classList.add('active');
            }
            
            console.log(`📑 Switched to tab: ${tabName}`);
        });
    });
    
    console.log('✅ Email tabs initialized');
}

