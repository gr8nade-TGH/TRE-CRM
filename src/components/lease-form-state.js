/**
 * Lease Form State Management
 * Handles form data collection, validation, and persistence
 */

import * as SupabaseAPI from '../api/supabase-api.js';

export class LeaseFormState {
    constructor(leadId, existingConfirmation = null) {
        this.leadId = leadId;
        this.existingConfirmation = existingConfirmation;
        this.isDirty = false;
        this.autoSaveInterval = null;
    }

    /**
     * Collect all form data from the interactive PDF form
     * @returns {Object} Form data object
     */
    collectFormData() {
        const data = {
            // Basic Information
            date: this.getFieldValue('leaseDate'),
            attn: this.getFieldValue('attn'),
            locator: this.getFieldValue('locator'),
            property_name: this.getFieldValue('propertyName'),
            locator_contact: this.getFieldValue('locatorContact'),
            property_phone: this.getFieldValue('propertyPhone'),
            split_cut: this.getCheckedValue(['split5050', 'split7525']),
            fax_email: this.getFieldValue('faxEmail'),
            split_agent: this.getFieldValue('splitAgent'),

            // Tenant Information
            tenant_names: this.getFieldValue('tenantNames'),
            tenant_phone: this.getFieldValue('tenantPhone'),
            move_in_date: this.getFieldValue('moveInDate'),
            expected_unit: this.getFieldValue('expectedUnit'),

            // Property Personnel
            tenants_correct: this.getRadioValue('tenantsCorrect'),
            tenant_corrections: this.getFieldValue('tenantCorrections'),
            unit_number: this.getFieldValue('unitNumber'),
            rent_amount: this.getFieldValue('rentAmount'),
            rent_with_concessions: this.getFieldValue('rentWithConcessions'),

            // Commission & Terms
            commission: this.getCheckedValue(['comm25', 'comm50', 'comm75', 'comm100']),
            commission_other: this.getFieldValue('commissionOther'),
            lease_term: this.getFieldValue('leaseTerm'),
            po_number: this.getFieldValue('poNumber'),
            actual_move_in_date: this.getFieldValue('actualMoveInDate'),
            locator_on_app: this.getFieldValue('locatorOnApp'),
            escorted: this.getRadioValue('escorted'),

            // Accounting
            invoice_number: this.getFieldValue('invoiceNumber'),
            invoice_method: this.getFieldValue('invoiceMethod'),
            pay_status: this.getFieldValue('payStatus'),
            received: this.getFieldValue('received'),
            invoiced: this.getFieldValue('invoiced'),
            accounting_notes: this.getFieldValue('accountingNotes'),
            db_ref_number: this.getFieldValue('dbRefNumber'),
        };

        return data;
    }

    /**
     * Get value from input field
     */
    getFieldValue(id) {
        const field = document.getElementById(id);
        return field ? field.value.trim() : '';
    }

    /**
     * Get checked value from a group of checkboxes (returns first checked)
     */
    getCheckedValue(ids) {
        for (const id of ids) {
            const checkbox = document.getElementById(id);
            if (checkbox && checkbox.checked) {
                // Extract value from checkbox (e.g., "50/50" from "split5050")
                if (id.startsWith('split')) {
                    return checkbox.nextElementSibling?.nextElementSibling?.textContent || '';
                }
                if (id.startsWith('comm')) {
                    return checkbox.nextElementSibling?.nextElementSibling?.textContent?.replace('%', '') || '';
                }
            }
        }
        return '';
    }

    /**
     * Get selected radio button value
     */
    getRadioValue(name) {
        const radio = document.querySelector(`input[name="${name}"]:checked`);
        return radio ? radio.value : '';
    }

    /**
     * Validate form data
     * @returns {Object} { isValid: boolean, errors: string[] }
     */
    validate() {
        const errors = [];
        const data = this.collectFormData();

        // Required fields
        if (!data.date) errors.push('Date is required');
        if (!data.tenant_names) errors.push('Tenant name(s) is required');
        if (!data.property_name) errors.push('Property name is required');

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Save form data as draft
     * @returns {Promise<Object>} Saved confirmation data
     */
    async saveDraft() {
        const formData = this.collectFormData();
        const validation = this.validate();

        if (!validation.isValid) {
            throw new Error(validation.errors.join(', '));
        }

        const dataToSave = {
            lead_id: this.leadId,
            status: 'draft',
            ...formData,
            updated_at: new Date().toISOString()
        };

        if (this.existingConfirmation) {
            // Update existing
            const { data, error } = await SupabaseAPI.supabase
                .from('lease_confirmations')
                .update(dataToSave)
                .eq('id', this.existingConfirmation.id)
                .select()
                .single();

            if (error) throw error;
            this.existingConfirmation = data;
            return data;
        } else {
            // Create new
            const { data, error } = await SupabaseAPI.supabase
                .from('lease_confirmations')
                .insert([dataToSave])
                .select()
                .single();

            if (error) throw error;
            this.existingConfirmation = data;
            return data;
        }
    }

    /**
     * Submit form to property (changes status to pending_signature)
     * @returns {Promise<Object>} Saved confirmation data
     */
    async submit() {
        // First save as draft
        const savedData = await this.saveDraft();

        // Then update status to pending_signature
        const { data, error } = await SupabaseAPI.supabase
            .from('lease_confirmations')
            .update({
                status: 'pending_signature',
                submitted_at: new Date().toISOString()
            })
            .eq('id', savedData.id)
            .select()
            .single();

        if (error) throw error;

        // Log activity
        await SupabaseAPI.supabase
            .from('lead_activities')
            .insert([{
                lead_id: this.leadId,
                activity_type: 'lease_prepared',
                description: 'Lease confirmation prepared and submitted'
            }]);

        this.existingConfirmation = data;
        return data;
    }

    /**
     * Enable auto-save (saves draft every 30 seconds if form is dirty)
     */
    enableAutoSave() {
        // Mark form as dirty on any input change
        document.addEventListener('input', () => {
            this.isDirty = true;
        });

        // Auto-save every 30 seconds
        this.autoSaveInterval = setInterval(async () => {
            if (this.isDirty) {
                try {
                    await this.saveDraft();
                    this.isDirty = false;
                    console.log('Auto-saved lease confirmation');
                } catch (error) {
                    console.error('Auto-save failed:', error);
                }
            }
        }, 30000); // 30 seconds
    }

    /**
     * Disable auto-save
     */
    disableAutoSave() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
        }
    }

    /**
     * Get property ID from lead data
     */
    async getPropertyId() {
        const { data: lead } = await SupabaseAPI.supabase
            .from('leads')
            .select('property_id')
            .eq('id', this.leadId)
            .single();

        return lead?.property_id || null;
    }
}

