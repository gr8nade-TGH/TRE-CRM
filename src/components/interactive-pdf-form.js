/**
 * Interactive PDF Form Controller
 * Manages the interactive PDF-style lease confirmation form
 */

import { InteractivePDFTemplate } from './interactive-pdf-template.js';
import { LeaseFormState } from './lease-form-state.js';
import * as SupabaseAPI from '../api/supabase-api.js';

export class InteractivePDFForm {
    constructor(leadId, existingConfirmation = null) {
        this.leadId = leadId;
        this.existingConfirmation = existingConfirmation;
        this.formState = null;
        this.leadData = null;
        this.propertyData = null;
    }

    /**
     * Initialize the form
     */
    async init() {
        console.log('Initializing Interactive PDF Form', { leadId: this.leadId });

        // Load lead and property data
        await this.loadData();

        // Prepare form data
        const formData = await this.prepareFormData();

        // Render the form
        this.render(formData);

        // Initialize form state management
        this.formState = new LeaseFormState(this.leadId, this.existingConfirmation);

        // Attach event listeners
        this.attachEventListeners();

        // Enable auto-save
        this.formState.enableAutoSave();

        // Setup checkbox exclusivity
        this.setupCheckboxGroups();
    }

    /**
     * Load lead and property data
     */
    async loadData() {
        try {
            // Load lead data
            this.leadData = await SupabaseAPI.getLead(this.leadId);
            console.log('Lead data loaded:', this.leadData);

            // Load property data if available
            if (this.leadData?.property_id) {
                this.propertyData = await SupabaseAPI.getProperty(this.leadData.property_id);
                console.log('Property data loaded:', this.propertyData);
            }

            // Load existing confirmation if not provided
            if (!this.existingConfirmation) {
                const supabase = SupabaseAPI.getSupabase();
                const { data: confirmations } = await supabase
                    .from('lease_confirmations')
                    .select('*')
                    .eq('lead_id', this.leadId)
                    .order('created_at', { ascending: false })
                    .limit(1);

                if (confirmations && confirmations.length > 0) {
                    this.existingConfirmation = confirmations[0];
                    console.log('Existing confirmation loaded:', this.existingConfirmation);
                }
            }
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }

    /**
     * Prepare form data from lead, property, and existing confirmation
     */
    async prepareFormData() {
        const data = {};

        // If we have existing confirmation, use that data
        if (this.existingConfirmation) {
            return {
                date: this.existingConfirmation.date,
                attn: this.existingConfirmation.attn,
                locator: this.existingConfirmation.locator,
                propertyName: this.existingConfirmation.property_name,
                locatorContact: this.existingConfirmation.locator_contact,
                propertyPhone: this.existingConfirmation.property_phone,
                splitCut: this.existingConfirmation.split_cut,
                faxEmail: this.existingConfirmation.fax_email,
                splitAgent: this.existingConfirmation.split_agent,
                tenantNames: this.existingConfirmation.tenant_names,
                tenantPhone: this.existingConfirmation.tenant_phone,
                moveInDate: this.existingConfirmation.move_in_date,
                expectedUnit: this.existingConfirmation.expected_unit,
                tenantsCorrect: this.existingConfirmation.tenants_correct,
                tenantCorrections: this.existingConfirmation.tenant_corrections,
                unitNumber: this.existingConfirmation.unit_number,
                rentAmount: this.existingConfirmation.rent_amount,
                rentWithConcessions: this.existingConfirmation.rent_with_concessions,
                commission: this.existingConfirmation.commission,
                commissionOtherPercent: this.existingConfirmation.commission_other_percent,
                commissionFlatAmount: this.existingConfirmation.commission_flat_amount,
                leaseTerm: this.existingConfirmation.lease_term,
                poNumber: this.existingConfirmation.po_number,
                actualMoveInDate: this.existingConfirmation.actual_move_in_date,
                locatorOnApp: this.existingConfirmation.locator_on_app,
                escorted: this.existingConfirmation.escorted,
                invoiceNumber: this.existingConfirmation.invoice_number,
                payStatus: this.existingConfirmation.pay_status,
                dbRefNumber: this.existingConfirmation.db_ref_number,
            };
        }

        // Otherwise, auto-populate from lead and property data
        if (this.leadData) {
            data.tenantNames = this.leadData.name || '';
            data.tenantPhone = this.leadData.phone || '';
            data.moveInDate = this.leadData.move_in_date || '';
        }

        if (this.propertyData) {
            data.propertyName = this.propertyData.community_name || this.propertyData.name || '';
            data.propertyPhone = this.propertyData.phone || '';
            data.faxEmail = this.propertyData.contact_email || '';
            data.attn = this.propertyData.contact_name || '';
        }

        // Get current user as locator
        const supabase = SupabaseAPI.getSupabase();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            data.locator = user.user_metadata?.full_name || user.email || '';
            data.locatorContact = user.email || '';
        }

        // Set today's date
        data.date = new Date().toISOString().split('T')[0];

        return data;
    }

    /**
     * Render the form
     */
    render(formData) {
        // Try leaseConfirmationView first (for route-based rendering)
        let container = document.getElementById('leaseConfirmationView');

        // Fallback to app container (for standalone testing)
        if (!container) {
            container = document.getElementById('app');
        }

        if (!container) {
            console.error('Container not found (tried leaseConfirmationView and app)');
            return;
        }

        // Generate HTML
        const html = InteractivePDFTemplate.generate(formData);

        // Insert into DOM
        container.innerHTML = html;
    }

    /**
     * Attach event listeners to form elements
     */
    attachEventListeners() {
        // Cancel button
        const cancelBtn = document.getElementById('cancelBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.handleCancel());
        }

        // Save Draft button
        const saveDraftBtn = document.getElementById('saveDraftBtn');
        if (saveDraftBtn) {
            saveDraftBtn.addEventListener('click', () => this.handleSaveDraft());
        }

        // Preview PDF button
        const previewPdfBtn = document.getElementById('previewPdfBtn');
        if (previewPdfBtn) {
            previewPdfBtn.addEventListener('click', () => this.handlePreviewPDF());
        }

        // Submit button
        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) {
            submitBtn.addEventListener('click', () => this.handleSubmit());
        }
    }

    /**
     * Setup checkbox groups for exclusive selection
     */
    setupCheckboxGroups() {
        // Split Cut checkboxes (only one can be selected)
        this.setupExclusiveCheckboxes(['split5050', 'split7525']);

        // Commission checkboxes (only one can be selected)
        this.setupExclusiveCheckboxes(['comm25', 'comm50', 'comm75', 'comm100']);
    }

    /**
     * Make checkboxes mutually exclusive
     */
    setupExclusiveCheckboxes(ids) {
        ids.forEach(id => {
            const checkbox = document.getElementById(id);
            if (checkbox) {
                checkbox.addEventListener('change', (e) => {
                    if (e.target.checked) {
                        // Uncheck all others
                        ids.forEach(otherId => {
                            if (otherId !== id) {
                                const otherCheckbox = document.getElementById(otherId);
                                if (otherCheckbox) {
                                    otherCheckbox.checked = false;
                                }
                            }
                        });
                    }
                });
            }
        });
    }

    /**
     * Handle cancel button
     */
    handleCancel() {
        if (confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
            window.location.hash = '#/documents';
        }
    }

    /**
     * Handle save draft button
     */
    async handleSaveDraft() {
        try {
            this.showLoading('Saving draft...');

            const savedData = await this.formState.saveDraft();

            this.hideLoading();
            this.showSuccess('✅ Draft saved successfully!');

            // Update existing confirmation reference
            this.existingConfirmation = savedData;

        } catch (error) {
            this.hideLoading();
            this.showError('❌ Error saving draft: ' + error.message);
            console.error('Save draft error:', error);
        }
    }

    /**
     * Handle preview PDF button
     */
    handlePreviewPDF() {
        if (!this.existingConfirmation) {
            alert('⚠️ Please save the form as a draft first before previewing the PDF.');
            return;
        }

        const pdfUrl = `/api/pdf/generate-lease-confirmation?leaseConfirmationId=${this.existingConfirmation.id}&preview=true`;
        window.open(pdfUrl, '_blank');
    }

    /**
     * Handle submit button - Show confirmation modal first
     */
    async handleSubmit() {
        // Get property email from form
        const propertyEmail = document.getElementById('faxEmail')?.value || '';
        const propertyName = document.getElementById('propertyName')?.value || '';
        const tenantNames = document.getElementById('tenantNames')?.value || '';

        if (!propertyEmail) {
            this.showError('❌ Please enter a property contact email before submitting.');
            return;
        }

        // Show confirmation modal
        this.showSubmitConfirmationModal(propertyEmail, propertyName, tenantNames);
    }

    /**
     * Show confirmation modal before submitting
     */
    showSubmitConfirmationModal(propertyEmail, propertyName, tenantNames) {
        const modal = document.createElement('div');
        modal.id = 'submitConfirmModal';
        modal.style.cssText = `
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;

        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: white;
            padding: 30px;
            border-radius: 12px;
            max-width: 500px;
            width: 90%;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        `;

        modalContent.innerHTML = `
            <h2 style="margin: 0 0 20px 0; color: #2c5282; font-size: 24px;">
                📧 Send for Signature
            </h2>
            <p style="margin: 0 0 20px 0; color: #666; line-height: 1.6;">
                This will send the lease confirmation to the property contact for electronic signature via Documenso.
            </p>
            <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #2c5282;">
                <div style="margin-bottom: 12px;">
                    <strong style="color: #2c5282;">📋 Tenant:</strong><br>
                    <span style="color: #333;">${tenantNames || 'Not specified'}</span>
                </div>
                <div style="margin-bottom: 12px;">
                    <strong style="color: #2c5282;">🏢 Property:</strong><br>
                    <span style="color: #333;">${propertyName || 'Not specified'}</span>
                </div>
                <div>
                    <strong style="color: #2c5282;">✉️ Send to:</strong><br>
                    <input
                        type="email"
                        id="confirmEmailInput"
                        value="${propertyEmail}"
                        style="
                            width: 100%;
                            padding: 10px;
                            margin-top: 8px;
                            border: 2px solid #cbd5e0;
                            border-radius: 6px;
                            font-size: 14px;
                            box-sizing: border-box;
                        "
                        placeholder="property@example.com"
                    />
                </div>
            </div>
            <div style="display: flex; gap: 12px; justify-content: flex-end;">
                <button
                    id="cancelSubmitBtn"
                    style="
                        padding: 12px 24px;
                        background: #e2e8f0;
                        color: #2d3748;
                        border: none;
                        border-radius: 6px;
                        font-size: 14px;
                        font-weight: 600;
                        cursor: pointer;
                    "
                >
                    Cancel
                </button>
                <button
                    id="confirmSubmitBtn"
                    style="
                        padding: 12px 24px;
                        background: #2c5282;
                        color: white;
                        border: none;
                        border-radius: 6px;
                        font-size: 14px;
                        font-weight: 600;
                        cursor: pointer;
                    "
                >
                    ✅ Send for Signature
                </button>
            </div>
        `;

        modal.appendChild(modalContent);
        document.body.appendChild(modal);

        // Event listeners
        document.getElementById('cancelSubmitBtn').addEventListener('click', () => {
            modal.remove();
        });

        document.getElementById('confirmSubmitBtn').addEventListener('click', async () => {
            const confirmedEmail = document.getElementById('confirmEmailInput').value.trim();

            if (!confirmedEmail) {
                alert('Please enter an email address.');
                return;
            }

            // Update the form field with confirmed email
            const emailField = document.getElementById('faxEmail');
            if (emailField) {
                emailField.value = confirmedEmail;
            }

            modal.remove();
            await this.submitToProperty();
        });

        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    /**
     * Actually submit to property (called after confirmation)
     */
    async submitToProperty() {
        try {
            this.showLoading('Preparing lease confirmation...');

            // First, save as draft and update status to pending_signature
            const savedData = await this.formState.submit();

            this.showLoading('Sending for signature...');

            // Then, send to Documenso for signature
            const response = await fetch('/api/documenso/send-for-signature', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    leaseConfirmationId: savedData.id
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || result.error || 'Failed to send for signature');
            }

            this.hideLoading();
            this.showSuccess(`✅ Lease confirmation sent to ${result.data.recipientEmail} for signature!`);

            // Redirect to documents page after 3 seconds
            setTimeout(() => {
                window.location.hash = '#/documents';
            }, 3000);

        } catch (error) {
            this.hideLoading();
            this.showError('❌ Error submitting: ' + error.message);
            console.error('Submit error:', error);
        }
    }

    /**
     * Show loading overlay
     */
    showLoading(message) {
        const container = document.querySelector('.pdf-form-container');
        if (container) {
            container.classList.add('loading');
        }

        // Create loading overlay
        const overlay = document.createElement('div');
        overlay.id = 'loadingOverlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            flex-direction: column;
            gap: 15px;
        `;

        const spinner = document.createElement('div');
        spinner.style.cssText = `
            border: 4px solid #f3f3f3;
            border-top: 4px solid #2c5282;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            animation: spin 1s linear infinite;
        `;

        const text = document.createElement('div');
        text.textContent = message;
        text.style.cssText = `
            color: white;
            font-size: 16px;
            font-weight: 600;
        `;

        overlay.appendChild(spinner);
        overlay.appendChild(text);
        document.body.appendChild(overlay);
    }

    /**
     * Hide loading overlay
     */
    hideLoading() {
        const container = document.querySelector('.pdf-form-container');
        if (container) {
            container.classList.remove('loading');
        }

        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.remove();
        }
    }

    /**
     * Show success message
     */
    showSuccess(message) {
        alert(message);
    }

    /**
     * Show error message
     */
    showError(message) {
        alert(message);
    }

    /**
     * Cleanup
     */
    destroy() {
        if (this.formState) {
            this.formState.disableAutoSave();
        }
    }
}

