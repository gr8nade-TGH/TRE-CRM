/**
 * Interactive PDF Template Builder
 * Generates HTML for the interactive PDF-style lease confirmation form
 */

export class InteractivePDFTemplate {
    /**
     * Generate the complete interactive PDF form HTML
     * @param {Object} data - Pre-populated data for the form
     * @returns {string} HTML string
     */
    static generate(data = {}) {
        return `
            <div class="pdf-form-container">
                ${this.generateHeader(data)}
                ${this.generateBasicInfo(data)}
                ${this.generateTenantInfo(data)}
                ${this.generatePropertyPersonnel(data)}
                ${this.generateCommissionTerms(data)}
                ${this.generateSignatureSection(data)}
                ${this.generateFooter()}
                ${this.generateActions()}
            </div>
        `;
    }

    /**
     * Generate header section with logo, title, and accounting box
     */
    static generateHeader(data) {
        return `
            <div class="pdf-header">
                <div class="pdf-logo-section">
                    <h2>TEXAS<br>RELOCATION<br>EXPERTS</h2>
                </div>
                <div class="pdf-title-section">
                    <h1>LEASE CONFIRMATION</h1>
                    <p class="pdf-subtitle">Please complete & return within</p>
                    <p class="pdf-subtitle">48 hours after move-in</p>
                    <p class="pdf-subtitle">Fax: 210.348.8493</p>
                    <p class="pdf-subtitle">SA Huebner Office</p>
                </div>
                <div class="pdf-accounting-box">
                    <h4>- - - ACCOUNTING USE - - -</h4>
                    <div class="pdf-acc-row">
                        <label>Invoice #:</label>
                        <input type="text" id="invoiceNumber" value="${data.invoiceNumber || ''}">
                    </div>
                    <div class="pdf-acc-row">
                        <label>Pay Status:</label>
                        <input type="text" id="payStatus" value="${data.payStatus || ''}" placeholder="PUMI/SP">
                    </div>
                    <div class="pdf-acc-row">
                        <label>DB Ref #:</label>
                        <input type="text" id="dbRefNumber" value="${data.dbRefNumber || ''}">
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Generate basic information section
     */
    static generateBasicInfo(data) {
        return `
            <div class="pdf-section">
                <div class="pdf-row">
                    <div class="pdf-field">
                        <label class="pdf-field-label">Date:</label>
                        <input type="date" class="pdf-field-input" id="leaseDate" 
                               value="${data.date || new Date().toISOString().split('T')[0]}" required>
                    </div>
                </div>

                <div class="pdf-row">
                    <div class="pdf-field">
                        <label class="pdf-field-label">ATTN:</label>
                        <input type="text" class="pdf-field-input" id="attn" 
                               value="${data.attn || ''}" placeholder="Attention">
                    </div>
                    <div class="pdf-field">
                        <label class="pdf-field-label">Locator:</label>
                        <input type="text" class="pdf-field-input" id="locator" 
                               value="${data.locator || ''}" placeholder="Locator Name">
                    </div>
                </div>

                <div class="pdf-row">
                    <div class="pdf-field">
                        <label class="pdf-field-label">Property:</label>
                        <input type="text" class="pdf-field-input" id="propertyName" 
                               value="${data.propertyName || ''}" placeholder="Property Name">
                    </div>
                    <div class="pdf-field">
                        <label class="pdf-field-label">Locator Contact:</label>
                        <input type="text" class="pdf-field-input" id="locatorContact" 
                               value="${data.locatorContact || ''}" placeholder="Phone, Email">
                    </div>
                </div>

                <div class="pdf-row">
                    <div class="pdf-field">
                        <label class="pdf-field-label">Phone:</label>
                        <input type="tel" class="pdf-field-input" id="propertyPhone" 
                               value="${data.propertyPhone || ''}" placeholder="(210) 555-1234">
                    </div>
                    <div class="pdf-field">
                        <label class="pdf-field-label">Split Cut:</label>
                        <div class="pdf-checkbox-group">
                            ${this.generateCheckbox('split5050', '50/50', data.splitCut === '50/50')}
                            ${this.generateCheckbox('split7525', '75/25', data.splitCut === '75/25')}
                        </div>
                    </div>
                </div>

                <div class="pdf-row">
                    <div class="pdf-field">
                        <label class="pdf-field-label">Fax/Email:</label>
                        <input type="text" class="pdf-field-input" id="faxEmail" 
                               value="${data.faxEmail || ''}" placeholder="Fax or Email">
                    </div>
                    <div class="pdf-field">
                        <label class="pdf-field-label">Split Agent:</label>
                        <input type="text" class="pdf-field-input" id="splitAgent" 
                               value="${data.splitAgent || ''}" placeholder="Agent Name">
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Generate tenant information section
     */
    static generateTenantInfo(data) {
        return `
            <div class="pdf-section">
                <div class="pdf-section-title">
                    <span>Tenant(s):</span>
                </div>

                <div class="pdf-row">
                    <div class="pdf-field" style="flex: 2;">
                        <input type="text" class="pdf-field-input" id="tenantNames"
                               value="${data.tenantNames || ''}"
                               placeholder="Tenant Name(s)"
                               style="font-weight: bold; font-size: 12pt;">
                    </div>
                </div>

                <div class="pdf-row">
                    <div class="pdf-field">
                        <label class="pdf-field-label">Phone:</label>
                        <input type="tel" class="pdf-field-input" id="tenantPhone"
                               value="${data.tenantPhone || ''}" placeholder="(210) 555-1234">
                    </div>
                    <div class="pdf-field">
                        <label class="pdf-field-label">Tentative move-in date:</label>
                        <input type="date" class="pdf-field-input" id="moveInDate"
                               value="${data.moveInDate || ''}">
                    </div>
                    <div class="pdf-field">
                        <label class="pdf-field-label">Expected Unit (if known):</label>
                        <input type="text" class="pdf-field-input" id="expectedUnit"
                               value="${data.expectedUnit || ''}" placeholder="Unit #">
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Generate property personnel section
     */
    static generatePropertyPersonnel(data) {
        return `
            <div class="pdf-section">
                <div class="pdf-section-title">
                    <span class="star">⭐</span>
                    <span>PROPERTY PERSONNEL</span>
                    <span class="star">⭐</span>
                </div>
                <p style="font-size: 9pt; margin-bottom: 15px; color: #666;">
                    Please provide the following information for tenant(s) referenced above, sign/date, and return via fax.
                </p>

                <div class="pdf-row">
                    <div class="pdf-field">
                        <label class="pdf-field-label">Above tenants correct?</label>
                        <div class="pdf-radio-group">
                            ${this.generateRadio('tenantsCorrect', 'yes', 'Yes', data.tenantsCorrect === 'yes')}
                            ${this.generateRadio('tenantsCorrect', 'no', 'No', data.tenantsCorrect === 'no')}
                        </div>
                    </div>
                </div>

                <div class="pdf-row">
                    <div class="pdf-field" style="flex: 2;">
                        <label class="pdf-field-label">If no, please list corrections:</label>
                        <input type="text" class="pdf-field-input" id="tenantCorrections"
                               value="${data.tenantCorrections || ''}"
                               placeholder="List any corrections needed">
                    </div>
                </div>

                <div class="pdf-row">
                    <div class="pdf-field">
                        <label class="pdf-field-label">Apartment/Unit Number:</label>
                        <input type="text" class="pdf-field-input" id="unitNumber"
                               value="${data.unitNumber || ''}" placeholder="Unit #">
                    </div>
                </div>

                <div class="pdf-row">
                    <div class="pdf-field">
                        <label class="pdf-field-label">Rent amount: $</label>
                        <input type="number" class="pdf-field-input" id="rentAmount"
                               value="${data.rentAmount || ''}"
                               placeholder="0.00" step="0.01" min="0">
                    </div>
                    <div class="pdf-field">
                        <label class="pdf-field-label">Rent amount w/concessions: $</label>
                        <input type="number" class="pdf-field-input" id="rentWithConcessions"
                               value="${data.rentWithConcessions || ''}"
                               placeholder="0.00" step="0.01" min="0">
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Generate commission and terms section
     */
    static generateCommissionTerms(data) {
        return `
            <div class="pdf-section">
                <div class="pdf-row">
                    <div class="pdf-field">
                        <label class="pdf-field-label">Commission:</label>
                        <div class="pdf-checkbox-group">
                            ${this.generateCheckbox('comm25', '25%', data.commission === '25')}
                            ${this.generateCheckbox('comm50', '50%', data.commission === '50')}
                            ${this.generateCheckbox('comm75', '75%', data.commission === '75')}
                            ${this.generateCheckbox('comm100', '100%', data.commission === '100')}
                            ${this.generateCheckbox('commOther', 'Other %', data.commission === 'other')}
                            ${this.generateCheckbox('commFlat', 'Flat Fee', data.commission === 'flat')}
                        </div>
                    </div>
                </div>

                <div class="pdf-row">
                    <div class="pdf-field">
                        <label class="pdf-field-label">Other %:</label>
                        <input type="number" class="pdf-field-input" id="commissionOtherPercent"
                               value="${data.commissionOtherPercent || ''}"
                               placeholder="0.00" step="0.01" min="0" max="100">
                    </div>
                    <div class="pdf-field">
                        <label class="pdf-field-label">Flat Fee $:</label>
                        <input type="number" class="pdf-field-input" id="commissionFlatAmount"
                               value="${data.commissionFlatAmount || ''}"
                               placeholder="0.00" step="0.01" min="0">
                    </div>
                </div>

                <div class="pdf-row">
                    <div class="pdf-field">
                        <label class="pdf-field-label">Term of Lease (months):</label>
                        <input type="number" class="pdf-field-input" id="leaseTerm"
                               value="${data.leaseTerm || ''}"
                               placeholder="12" min="1">
                    </div>
                    <div class="pdf-field">
                        <label class="pdf-field-label">PO# for invoice (if app):</label>
                        <input type="text" class="pdf-field-input" id="poNumber"
                               value="${data.poNumber || ''}"
                               placeholder="PO Number">
                    </div>
                </div>

                <div class="pdf-row">
                    <div class="pdf-field">
                        <label class="pdf-field-label">Date tenant actually moved-in:</label>
                        <input type="date" class="pdf-field-input" id="actualMoveInDate"
                               value="${data.actualMoveInDate || ''}">
                    </div>
                </div>

                <div class="pdf-row">
                    <div class="pdf-field">
                        <label class="pdf-field-label">Name of Locator on Application:</label>
                        <input type="text" class="pdf-field-input" id="locatorOnApp"
                               value="${data.locatorOnApp || ''}"
                               placeholder="Locator Name">
                    </div>
                    <div class="pdf-field">
                        <label class="pdf-field-label">Escorted?</label>
                        <div class="pdf-radio-group">
                            ${this.generateRadio('escorted', 'yes', 'Yes', data.escorted === 'yes')}
                            ${this.generateRadio('escorted', 'no', 'No', data.escorted === 'no')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Helper to generate checkbox HTML
     */
    static generateCheckbox(id, label, checked = false) {
        return `
            <label class="pdf-checkbox-item">
                <input type="checkbox" id="${id}" ${checked ? 'checked' : ''}>
                <span class="pdf-checkbox-visual"></span>
                <span>${label}</span>
            </label>
        `;
    }

    /**
     * Generate signature section
     */
    static generateSignatureSection(data) {
        return `
            <div class="pdf-signature-section">
                <div class="pdf-signature-row">
                    <div class="pdf-signature-field">
                        <div class="pdf-signature-line"></div>
                        <div class="pdf-signature-label">Printed Name of Authorized Representative</div>
                    </div>
                    <div class="pdf-signature-field">
                        <div class="pdf-signature-line"></div>
                        <div class="pdf-signature-label">Date</div>
                    </div>
                    <div class="pdf-signature-field">
                        <div class="pdf-signature-line"></div>
                        <div class="pdf-signature-label">Signature of Authorized Representative</div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Generate footer section
     */
    static generateFooter() {
        return `
            <div class="pdf-footer">
                <p class="pdf-footer-note">
                    Note to Management: This is not an invoice. An invoice will be generated after move-in confirmed.
                    By signature above, Management Company confirms Texas Relocation Experts is listed on application.
                    TX Relocation Experts is guaranteed commission if tenant stays ≥90 from move-in date.
                </p>
                <p class="pdf-footer-note" style="margin-top: 10px;">
                    Please return via fax to 210.348.8493 within 48 hours after move-in.
                </p>
                <div class="pdf-footer-thank-you">
                    <span class="star">⭐</span>
                    THANK YOU FOR YOUR ASSISTANCE!
                    <span class="star">⭐</span>
                </div>
                <p class="pdf-footer-contact">
                    Texas Relocation Experts | 11255 Huebner Rd, Ste 112, San Antonio TX 78230 | Office: 210.348.5739
                </p>
            </div>
        `;
    }

    /**
     * Generate action buttons
     */
    static generateActions() {
        return `
            <div class="pdf-actions">
                <button type="button" class="pdf-btn pdf-btn-secondary" id="cancelBtn">
                    Cancel
                </button>
                <button type="button" class="pdf-btn pdf-btn-secondary" id="saveDraftBtn">
                    💾 Save Draft
                </button>
                <button type="button" class="pdf-btn pdf-btn-primary" id="previewPdfBtn">
                    📄 Preview PDF
                </button>
                <button type="button" class="pdf-btn pdf-btn-success" id="submitBtn">
                    ✅ Submit to Property
                </button>
            </div>
        `;
    }

    /**
     * Helper to generate radio button HTML
     */
    static generateRadio(name, value, label, checked = false) {
        return `
            <label class="pdf-radio-item">
                <input type="radio" name="${name}" value="${value}" ${checked ? 'checked' : ''}>
                <span class="pdf-radio-visual"></span>
                <span>${label}</span>
            </label>
        `;
    }
}

