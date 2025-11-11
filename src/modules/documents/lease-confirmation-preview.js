/**
 * Lease Confirmation Preview Module
 * Creates a styled preview of the lease confirmation form that matches the original design
 * 
 * @module documents/lease-confirmation-preview
 */

/**
 * Create the lease confirmation preview HTML
 * @param {Object} formData - Form data from the lease confirmation form
 * @param {Object} lead - Lead object
 * @param {Object} property - Property object
 * @returns {string} HTML string for the preview
 */
export function createLeaseConfirmationPreview(formData, lead, property) {
	return `
		<div class="lease-confirmation-preview">
			<!-- Header with Logo -->
			<div class="preview-header">
				<div class="logo-section">
					<div class="logo-placeholder">
						<span class="logo-text">⛵</span>
						<span class="company-name">TEXAS RELOCATION EXPERTS</span>
					</div>
				</div>
				<div class="title-section">
					<h2>LEASE CONFIRMATION</h2>
					<p class="subtitle">Please complete & return within<br/>48 hours after move-in</p>
					<p class="fax-info">Fax: 210.348.8493</p>
					<p class="office-info">SA Huebner Office</p>
				</div>
				<div class="accounting-box">
					<h4>--- ACCOUNTING USE ---</h4>
					<div class="accounting-row">
						<span>Invoice Number: ${formData.invoiceNumber || '_______'}</span>
					</div>
					<div class="accounting-row">
						<span>Invoice Method: 
							${formData.invoiceMethod ? (Array.isArray(formData.invoiceMethod) ? formData.invoiceMethod.join(', ') : formData.invoiceMethod) : '☐ F ☐ MP ☐ MC ☐ E'}
						</span>
					</div>
					<div class="accounting-row">
						<span>Pay Status: 
							${formData.payStatus ? (Array.isArray(formData.payStatus) ? formData.payStatus.join(', ') : formData.payStatus) : '☐ HMM ☐ SP'}
						</span>
					</div>
					<div class="accounting-row">
						<span>Received: ${formData.received || '_______'}</span>
					</div>
					<div class="accounting-row">
						<span>Invoiced: ${formData.invoiced || '_______'}</span>
					</div>
					<div class="accounting-row">
						<span>Notes: ${formData.notes || '_______'}</span>
					</div>
					<div class="accounting-row">
						<span>DB Ref #: ${formData.dbRefNumber || '55087552'}</span>
					</div>
				</div>
			</div>

			<!-- Main Content -->
			<div class="preview-content">
				<div class="info-row">
					<span class="label">Date:</span>
					<span class="value">${formData.date || new Date().toLocaleDateString()}</span>
				</div>

				<div class="info-row">
					<span class="label">ATN:</span>
					<span class="value">${formData.atn || ''}</span>
					<span class="label">Locator:</span>
					<span class="value">${formData.locator || ''}</span>
				</div>

				<div class="info-row">
					<span class="label">Property:</span>
					<span class="value">${formData.property || ''}</span>
					<span class="label">Locator Contact:</span>
					<span class="value">${formData.locatorContact || ''}</span>
				</div>

				<div class="info-row">
					<span class="label">Phone:</span>
					<span class="value">${formData.phone || ''}</span>
					<span class="label">Split Cut:</span>
					<span class="value">${formData.splitCut || '☐ 50/50 ☐ 75/25'}</span>
				</div>

				<div class="info-row">
					<span class="label">Fax/Email:</span>
					<span class="value">${formData.faxEmail || ''}</span>
					<span class="label">Split Agent:</span>
					<span class="value">${formData.splitAgent || ''}</span>
				</div>

				<!-- Tenant Section -->
				<div class="section-divider">
					<h3>Tenant(s): ${formData.tenantName || ''}</h3>
				</div>

				<div class="info-row">
					<span class="label">Phone:</span>
					<span class="value">${formData.tenantPhone || ''}</span>
					<span class="label">Tentative move-in date:</span>
					<span class="value">${formData.tentativeMoveIn || ''}</span>
					<span class="label">Expected Unit (if known):</span>
					<span class="value">${formData.expectedUnit || ''}</span>
				</div>

				<!-- Property Personnel Section -->
				<div class="section-divider property-personnel-section">
					<h3>⭐ --- PROPERTY PERSONNEL --- ⭐</h3>
					<p class="section-note">Please provide the following information for tenant(s) referenced above, sign/date, and return via fax.</p>
				</div>

				<div class="info-row">
					<span class="label">Above tenants correct?</span>
					<span class="value">${formData.tenantsCorrect === 'yes' ? '☑ Yes ☐ No' : '☐ Yes ☑ No'}</span>
				</div>

				<div class="info-row">
					<span class="label">If no, please list corrections:</span>
					<span class="value">${formData.corrections || '_______'}</span>
				</div>

				<div class="info-row">
					<span class="label">Apartment/Unit Number:</span>
					<span class="value">${formData.apartmentUnit || '_______'}</span>
				</div>

				<div class="info-row">
					<span class="label">Rent amount: $</span>
					<span class="value">${formData.rentAmount || '_______'} per month.</span>
					<span class="label">Rent amount w/concessions: $</span>
					<span class="value">${formData.rentWithConcessions || '_______'}</span>
				</div>

				<div class="info-row">
					<span class="label">Commission:</span>
					<span class="value">
						${formData.commission ? 
							(Array.isArray(formData.commission) ? 
								formData.commission.map(c => `☑ ${c}%`).join(' ') : 
								`☑ ${formData.commission}%`) : 
							'☐ 25% ☐ 50% ☐ 75% ☐ 100%'}
					</span>
				</div>

				<div class="info-row">
					<span class="label"></span>
					<span class="value">
						${formData.commissionOther ? '☑' : '☐'} Other ${formData.commissionOtherPercent || '_____'}%
						${formData.flatFee ? '☑' : '☐'} Flat Fee $${formData.flatFeeAmount || '_____'}
					</span>
				</div>

				<div class="info-row">
					<span class="label">Term of Lease (months):</span>
					<span class="value">${formData.termOfLease || '_______'}</span>
					<span class="label">PO# for invoice (if app):</span>
					<span class="value">${formData.poNumber || '_______'}</span>
				</div>

				<div class="info-row">
					<span class="label">Date tenant actually moved-in:</span>
					<span class="value">${formData.dateMovedIn || '_______'}</span>
				</div>

				<div class="info-row">
					<span class="label">Name of Locator on Application:</span>
					<span class="value">${formData.locatorOnApp || '_______'}</span>
					<span class="label">Escorted?</span>
					<span class="value">${formData.escorted === 'yes' ? '☑ Yes ☐ No' : '☐ Yes ☑ No'}</span>
				</div>

				<!-- Signature Section -->
				<div class="signature-section">
					<div class="signature-row">
						<div class="signature-field">
							<span class="label">Printed Name of Authorized Representative</span>
							<span class="value signature-line">${formData.printedName || ''}</span>
						</div>
						<div class="signature-field">
							<span class="label">Date</span>
							<span class="value signature-line">${formData.signatureDate || ''}</span>
						</div>
					</div>
					<div class="signature-row">
						<div class="signature-field full-width">
							<span class="label">Signature of Authorized Representative</span>
							<span class="value signature-line signature-text">${formData.signature || ''}</span>
						</div>
					</div>
				</div>

				<!-- Footer -->
				<div class="preview-footer">
					<p class="footer-note">
						<strong>Note to Management:</strong> This is not an invoice. An invoice will be generated after move-in confirmed. 
						By signature above, Management Company confirms Texas Relocation Experts is listed on application. 
						TX Relocation Experts will reimburse commission within 90 days of move-in on full term leases. 
						TX Relocation Experts is guaranteed commission if tenant stays 290 from move-in date.
					</p>
					<p class="footer-instruction">
						<strong>Please return via fax to 210.348.8493 within 48 hours after move-in.</strong>
					</p>
					<p class="footer-thanks">
						<strong>⭐ --- THANK YOU FOR YOUR ASSISTANCE! --- ⭐</strong>
					</p>
					<p class="footer-contact">
						Texas Relocation Experts | 11255 Huebner Rd, Ste 112, San Antonio TX 78230 | Office: 210.348.5739
					</p>
				</div>
			</div>

			<!-- Action Buttons -->
			<div class="preview-actions">
				<button class="btn btn-secondary" id="backToForm">Back to Form</button>
				<button class="btn btn-primary" id="sendLeaseConfirmation">Send to Property</button>
			</div>
		</div>
	`;
}

