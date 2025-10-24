/**
 * Lease Confirmation Form Module
 * Handles the lease confirmation form creation, validation, and submission
 * 
 * @module documents/lease-confirmation-form
 */

/**
 * Create the lease confirmation form HTML
 * @param {Object} lead - Lead object with property and tenant information
 * @param {Object} property - Property object with contact information
 * @returns {string} HTML string for the form
 */
export function createLeaseConfirmationForm(lead, property) {
	const today = new Date().toISOString().split('T')[0];
	
	return `
		<div class="lease-confirmation-form-container">
			<!-- Property Contact Info Header -->
			<div class="form-header">
				<h3>Lease Confirmation</h3>
				<div class="property-contact-info">
					<div class="contact-row">
						<span class="label">Property:</span>
						<span class="value">${property.name || 'N/A'}</span>
					</div>
					<div class="contact-row">
						<span class="label">Contact Email:</span>
						<span class="value">${property.contact_email || 'N/A'}</span>
					</div>
				</div>
			</div>

			<!-- Form Fields -->
			<form id="leaseConfirmationForm" class="lease-form">
				<!-- Accounting Use Section -->
				<div class="form-section accounting-section">
					<h4>--- ACCOUNTING USE ---</h4>
					<div class="form-row">
						<div class="form-group">
							<label for="invoiceNumber">Invoice Number:</label>
							<input type="text" id="invoiceNumber" name="invoiceNumber" />
						</div>
						<div class="form-group">
							<label for="invoiceMethod">Invoice Method:</label>
							<div class="checkbox-group">
								<label><input type="checkbox" name="invoiceMethod" value="F" /> F</label>
								<label><input type="checkbox" name="invoiceMethod" value="MP" /> MP</label>
								<label><input type="checkbox" name="invoiceMethod" value="MC" /> MC</label>
								<label><input type="checkbox" name="invoiceMethod" value="E" /> E</label>
							</div>
						</div>
					</div>
					<div class="form-row">
						<div class="form-group">
							<label for="payStatus">Pay Status:</label>
							<div class="checkbox-group">
								<label><input type="checkbox" name="payStatus" value="HMM" /> HMM</label>
								<label><input type="checkbox" name="payStatus" value="SP" /> SP</label>
							</div>
						</div>
						<div class="form-group">
							<label for="received">Received:</label>
							<input type="text" id="received" name="received" />
						</div>
					</div>
					<div class="form-row">
						<div class="form-group">
							<label for="invoiced">Invoiced:</label>
							<input type="text" id="invoiced" name="invoiced" />
						</div>
						<div class="form-group">
							<label for="notes">Notes:</label>
							<input type="text" id="notes" name="notes" />
						</div>
					</div>
					<div class="form-row">
						<div class="form-group full-width">
							<label for="dbRefNumber">DB Ref #:</label>
							<input type="text" id="dbRefNumber" name="dbRefNumber" placeholder="55087552" />
						</div>
					</div>
				</div>

				<!-- Main Form Section -->
				<div class="form-section main-section">
					<div class="form-row">
						<div class="form-group">
							<label for="date">Date:</label>
							<input type="date" id="date" name="date" value="${today}" required />
						</div>
					</div>

					<div class="form-row">
						<div class="form-group">
							<label for="atn">ATN:</label>
							<input type="text" id="atn" name="atn" value="${lead.agentName || ''}" required />
						</div>
						<div class="form-group">
							<label for="locator">Locator:</label>
							<input type="text" id="locator" name="locator" value="${lead.agentName || ''}" required />
						</div>
					</div>

					<div class="form-row">
						<div class="form-group">
							<label for="property">Property:</label>
							<input type="text" id="property" name="property" value="${property.name || ''}" required />
						</div>
						<div class="form-group">
							<label for="locatorContact">Locator Contact:</label>
							<input type="email" id="locatorContact" name="locatorContact" value="${lead.agentEmail || ''}" required />
						</div>
					</div>

					<div class="form-row">
						<div class="form-group">
							<label for="phone">Phone:</label>
							<input type="tel" id="phone" name="phone" value="${property.phone || ''}" />
						</div>
						<div class="form-group">
							<label for="splitCut">Split Cut:</label>
							<div class="checkbox-group">
								<label><input type="radio" name="splitCut" value="50/50" checked /> 50/50</label>
								<label><input type="radio" name="splitCut" value="75/25" /> 75/25</label>
							</div>
						</div>
					</div>

					<div class="form-row">
						<div class="form-group">
							<label for="faxEmail">Fax/Email:</label>
							<input type="text" id="faxEmail" name="faxEmail" value="${property.contact_email || ''}" />
						</div>
						<div class="form-group">
							<label for="splitAgent">Split Agent:</label>
							<input type="text" id="splitAgent" name="splitAgent" />
						</div>
					</div>

					<!-- Tenant Section -->
					<div class="form-subsection">
						<h4>Tenant(s):</h4>
						<div class="form-row">
							<div class="form-group full-width">
								<label for="tenantName">Name:</label>
								<input type="text" id="tenantName" name="tenantName" value="${lead.leadName || ''}" required />
							</div>
						</div>
						<div class="form-row">
							<div class="form-group">
								<label for="tenantPhone">Phone:</label>
								<input type="tel" id="tenantPhone" name="tenantPhone" value="${lead.phone || ''}" />
							</div>
							<div class="form-group">
								<label for="tentativeMoveIn">Tentative move-in date:</label>
								<input type="date" id="tentativeMoveIn" name="tentativeMoveIn" />
							</div>
						</div>
						<div class="form-row">
							<div class="form-group full-width">
								<label for="expectedUnit">Expected Unit (if known):</label>
								<input type="text" id="expectedUnit" name="expectedUnit" value="${lead.lease?.apartment || ''}" />
							</div>
						</div>
					</div>

					<!-- Property Personnel Section -->
					<div class="form-subsection property-personnel">
						<h4>--- PROPERTY PERSONNEL ---</h4>
						<p class="section-note">Please provide the following information for tenant(s) referenced above, sign/date, and return via fax.</p>
						
						<div class="form-row">
							<div class="form-group">
								<label>Above tenants correct?</label>
								<div class="radio-group">
									<label><input type="radio" name="tenantsCorrect" value="yes" required /> Yes</label>
									<label><input type="radio" name="tenantsCorrect" value="no" /> No</label>
								</div>
							</div>
						</div>

						<div class="form-row">
							<div class="form-group full-width">
								<label for="corrections">If no, please list corrections:</label>
								<input type="text" id="corrections" name="corrections" />
							</div>
						</div>

						<div class="form-row">
							<div class="form-group full-width">
								<label for="apartmentUnit">Apartment/Unit Number:</label>
								<input type="text" id="apartmentUnit" name="apartmentUnit" />
							</div>
						</div>

						<div class="form-row">
							<div class="form-group">
								<label for="rentAmount">Rent amount: $</label>
								<input type="number" id="rentAmount" name="rentAmount" step="0.01" placeholder="per month" />
							</div>
							<div class="form-group">
								<label for="rentWithConcessions">Rent amount w/concessions: $</label>
								<input type="number" id="rentWithConcessions" name="rentWithConcessions" step="0.01" />
							</div>
						</div>

						<div class="form-row">
							<div class="form-group">
								<label>Commission:</label>
								<div class="checkbox-group">
									<label><input type="checkbox" name="commission" value="25" /> 25%</label>
									<label><input type="checkbox" name="commission" value="50" /> 50%</label>
									<label><input type="checkbox" name="commission" value="75" /> 75%</label>
									<label><input type="checkbox" name="commission" value="100" /> 100%</label>
								</div>
							</div>
						</div>

						<div class="form-row">
							<div class="form-group">
								<label><input type="checkbox" name="commissionOther" /> Other</label>
								<input type="number" id="commissionOtherPercent" name="commissionOtherPercent" placeholder="%" step="0.01" />
							</div>
							<div class="form-group">
								<label><input type="checkbox" name="flatFee" /> Flat Fee $</label>
								<input type="number" id="flatFeeAmount" name="flatFeeAmount" step="0.01" />
							</div>
						</div>

						<div class="form-row">
							<div class="form-group">
								<label for="termOfLease">Term of Lease (months):</label>
								<input type="number" id="termOfLease" name="termOfLease" />
							</div>
							<div class="form-group">
								<label for="poNumber">PO# for invoice (if app):</label>
								<input type="text" id="poNumber" name="poNumber" />
							</div>
						</div>

						<div class="form-row">
							<div class="form-group full-width">
								<label for="dateMovedIn">Date tenant actually moved-in:</label>
								<input type="date" id="dateMovedIn" name="dateMovedIn" />
							</div>
						</div>

						<div class="form-row">
							<div class="form-group">
								<label for="locatorOnApp">Name of Locator on Application:</label>
								<input type="text" id="locatorOnApp" name="locatorOnApp" value="${lead.agentName || ''}" />
							</div>
							<div class="form-group">
								<label>Escorted?</label>
								<div class="radio-group">
									<label><input type="radio" name="escorted" value="yes" /> Yes</label>
									<label><input type="radio" name="escorted" value="no" /> No</label>
								</div>
							</div>
						</div>
					</div>

					<!-- Signature Section -->
					<div class="form-subsection signature-section">
						<div class="form-row">
							<div class="form-group">
								<label for="printedName">Printed Name of Authorized Representative:</label>
								<input type="text" id="printedName" name="printedName" required />
							</div>
							<div class="form-group">
								<label for="signatureDate">Date:</label>
								<input type="date" id="signatureDate" name="signatureDate" value="${today}" required />
							</div>
						</div>
						<div class="form-row">
							<div class="form-group full-width">
								<label for="signature">Signature of Authorized Representative:</label>
								<input type="text" id="signature" name="signature" placeholder="Type name to sign" required />
							</div>
						</div>
					</div>

					<!-- Footer Note -->
					<div class="form-footer">
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
							<strong>--- THANK YOU FOR YOUR ASSISTANCE! ---</strong>
						</p>
						<p class="footer-contact">
							Texas Relocation Experts | 11255 Huebner Rd, Ste 112, San Antonio TX 78230 | Office: 210.348.5739
						</p>
					</div>
				</div>

				<!-- Form Actions -->
				<div class="form-actions">
					<button type="button" class="btn btn-secondary" id="cancelLeaseForm">Cancel</button>
					<button type="button" class="btn btn-primary" id="previewLeaseForm">Preview & Send</button>
				</div>
			</form>
		</div>
	`;
}

/**
 * Get form data from the lease confirmation form
 * @returns {Object} Form data object
 */
export function getLeaseFormData() {
	const form = document.getElementById('leaseConfirmationForm');
	if (!form) return null;

	const formData = new FormData(form);
	const data = {};

	// Convert FormData to object
	for (const [key, value] of formData.entries()) {
		if (data[key]) {
			// Handle multiple values (checkboxes)
			if (Array.isArray(data[key])) {
				data[key].push(value);
			} else {
				data[key] = [data[key], value];
			}
		} else {
			data[key] = value;
		}
	}

	return data;
}

/**
 * Validate the lease confirmation form
 * @returns {Object} Validation result with isValid and errors
 */
export function validateLeaseForm() {
	const form = document.getElementById('leaseConfirmationForm');
	if (!form) return { isValid: false, errors: ['Form not found'] };

	const errors = [];

	// Check required fields
	const requiredFields = [
		{ id: 'date', label: 'Date' },
		{ id: 'atn', label: 'ATN' },
		{ id: 'locator', label: 'Locator' },
		{ id: 'property', label: 'Property' },
		{ id: 'locatorContact', label: 'Locator Contact' },
		{ id: 'tenantName', label: 'Tenant Name' },
		{ id: 'printedName', label: 'Printed Name' },
		{ id: 'signatureDate', label: 'Signature Date' },
		{ id: 'signature', label: 'Signature' }
	];

	requiredFields.forEach(field => {
		const input = document.getElementById(field.id);
		if (!input || !input.value.trim()) {
			errors.push(`${field.label} is required`);
		}
	});

	// Check if tenants correct radio is selected
	const tenantsCorrect = document.querySelector('input[name="tenantsCorrect"]:checked');
	if (!tenantsCorrect) {
		errors.push('Please confirm if tenants are correct');
	}

	return {
		isValid: errors.length === 0,
		errors
	};
}

