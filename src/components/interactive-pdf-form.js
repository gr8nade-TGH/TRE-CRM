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
                const { data: confirmations } = await SupabaseAPI.supabase
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
                commissionOther: this.existingConfirmation.commission_other,
                leaseTerm: this.existingConfirmation.lease_term,
                poNumber: this.existingConfirmation.po_number,
                actualMoveInDate: this.existingConfirmation.actual_move_in_date,
                locatorOnApp: this.existingConfirmation.locator_on_app,
                escorted: this.existingConfirmation.escorted,
                invoiceNumber: this.existingConfirmation.invoice_number,
                invoiceMethod: this.existingConfirmation.invoice_method,
                payStatus: this.existingConfirmation.pay_status,
                received: this.existingConfirmation.received,
                invoiced: this.existingConfirmation.invoiced,
                accountingNotes: this.existingConfirmation.accounting_notes,
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
            data.locatorContact = this.propertyData.contact_email || '';
        }

        // Get current user as locator
        const { data: { user } } = await SupabaseAPI.supabase.auth.getUser();
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
        const container = document.getElementById('app');
        if (!container) {
            console.error('App container not found');
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
     * Handle submit button
     */
    async handleSubmit() {
        try {
            this.showLoading('Submitting to property...');

            const savedData = await this.formState.submit();

            this.hideLoading();
            this.showSuccess('✅ Lease confirmation submitted successfully!');

            // Redirect to documents page after 2 seconds
            setTimeout(() => {
                window.location.hash = '#/documents';
            }, 2000);

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

