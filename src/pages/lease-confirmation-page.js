import { SupabaseAPI } from '../modules/supabase-api.js';

export class LeaseConfirmationPage {
	constructor() {
		this.leadId = null;
		this.leadData = null;
		this.propertyData = null;
	}

	async init() {
		console.log('Initializing Lease Confirmation Page');
		this.render();
		this.attachEventListeners();

		// Auto-populate today's date
		const today = new Date().toISOString().split('T')[0];
		document.getElementById('leaseDate').value = today;
	}

	render() {
		const app = document.getElementById('app');
		app.innerHTML = `
			<div class="lease-confirmation-container">
				<div class="lease-confirmation-form">
					<!-- Header -->
					<div class="lease-header">
						<div class="lease-logo">
							<h2>TEXAS RELOCATION EXPERTS</h2>
						</div>
						<div class="lease-title">
							<h1>LEASE CONFIRMATION</h1>
							<p class="lease-subtitle">Please complete & return within<br>48 hours after move-in</p>
							<p class="lease-fax">Fax: 210.348.8493</p>
							<p class="lease-office">SA Huebner Office</p>
						</div>
						<div class="accounting-box">
							<h4>- - - ACCOUNTING USE - - -</h4>
							<div class="accounting-fields">
								<div class="acc-row">
									<label>Invoice Number:</label>
									<input type="text" id="invoiceNumber" readonly>
								</div>
								<div class="acc-row">
									<label>Invoice Method:</label>
									<div class="method-checkboxes">
										<label><input type="checkbox" id="methodF"> F</label>
										<label><input type="checkbox" id="methodMP"> MP</label>
										<label><input type="checkbox" id="methodMC"> MC</label>
										<label><input type="checkbox" id="methodE"> E</label>
									</div>
								</div>
								<div class="acc-row">
									<label>Pay Status:</label>
									<input type="text" id="payStatus" placeholder="PUMI / SP">
								</div>
								<div class="acc-row">
									<label>Received:</label>
									<input type="text" id="received">
								</div>
								<div class="acc-row">
									<label>Invoiced:</label>
									<input type="text" id="invoiced">
								</div>
								<div class="acc-row">
									<label>Notes:</label>
									<input type="text" id="accountingNotes">
								</div>
								<div class="acc-row">
									<label>DB Ref #:</label>
									<input type="text" id="dbRefNumber">
								</div>
							</div>
						</div>
					</div>

					<!-- Main Form -->
					<form id="leaseConfirmationForm">
						<!-- Date and Basic Info -->
						<div class="form-section">
							<div class="form-row">
								<div class="form-group" style="flex: 1;">
									<label>Date:</label>
									<input type="date" id="leaseDate" required>
								</div>
							</div>

							<div class="form-row">
								<div class="form-group" style="flex: 1;">
									<label>ATTN:</label>
									<input type="text" id="attn" placeholder="Attention">
								</div>
								<div class="form-group" style="flex: 1;">
									<label>Locator:</label>
									<input type="text" id="locator" placeholder="Locator Name">
								</div>
							</div>

							<div class="form-row">
								<div class="form-group" style="flex: 1;">
									<label>Property:</label>
									<input type="text" id="propertyName" placeholder="Property Name">
								</div>
								<div class="form-group" style="flex: 1;">
									<label>Locator Contact:</label>
									<input type="text" id="locatorContact" placeholder="Phone, Email">
								</div>
							</div>

							<div class="form-row">
								<div class="form-group" style="flex: 1;">
									<label>Phone:</label>
									<input type="tel" id="propertyPhone" placeholder="(210) 555-1234">
								</div>
								<div class="form-group split-cut-group">
									<label>Split Cut:</label>
									<div class="split-options">
										<label class="checkbox-option">
											<input type="checkbox" id="split5050" name="splitCut" value="50/50">
											<span>50/50</span>
										</label>
										<label class="checkbox-option">
											<input type="checkbox" id="split7525" name="splitCut" value="75/25">
											<span>75/25</span>
										</label>
									</div>
								</div>
							</div>

							<div class="form-row">
								<div class="form-group" style="flex: 1;">
									<label>Fax/Email:</label>
									<input type="text" id="faxEmail" placeholder="Fax or Email">
								</div>
								<div class="form-group" style="flex: 1;">
									<label>Split Agent:</label>
									<input type="text" id="splitAgent" placeholder="Agent Name">
								</div>
							</div>
						</div>

						<!-- Tenant Information -->
						<div class="form-section tenant-section">
							<h3>Tenant(s):</h3>
							<input type="text" id="tenantNames" placeholder="Tenant Name(s)" class="full-width">

							<div class="form-row" style="margin-top: 12px;">
								<div class="form-group">
									<label>Phone:</label>
									<input type="tel" id="tenantPhone" placeholder="(313) 697-9493">
								</div>
								<div class="form-group">
									<label>Tentative move-in date:</label>
									<input type="date" id="moveInDate">
								</div>
								<div class="form-group">
									<label>Expected Unit (if known):</label>
									<input type="text" id="expectedUnit" placeholder="Unit #">
								</div>
							</div>
						</div>

						<!-- Property Personnel Section -->
						<div class="form-section property-personnel">
							<div class="section-header-stars">
								<span class="star">★</span>
								<h3>PROPERTY PERSONNEL</h3>
								<span class="star">★</span>
							</div>
							<p class="personnel-instructions">Please provide the following information for tenant(s) referenced above, sign/date, and return via fax.</p>

							<div class="form-row">
								<div class="form-group">
									<label>Above tenants correct?</label>
									<div class="yes-no-options">
										<label><input type="radio" name="tenantsCorrect" value="yes"> Yes</label>
										<label><input type="radio" name="tenantsCorrect" value="no"> No</label>
									</div>
								</div>
							</div>

							<div class="form-group">
								<label>If no, please list corrections:</label>
								<input type="text" id="tenantCorrections" class="full-width">
							</div>

							<div class="form-row">
								<div class="form-group" style="flex: 1;">
									<label>Apartment/Unit Number:</label>
									<input type="text" id="unitNumber">
								</div>
							</div>

							<div class="form-row">
								<div class="form-group">
									<label>Rent amount: $</label>
									<input type="number" id="rentAmount" step="0.01" placeholder="0.00">
									<span style="margin: 0 8px;">per month.</span>
								</div>
								<div class="form-group">
									<label>Rent amount w/concessions: $</label>
									<input type="number" id="rentWithConcessions" step="0.01" placeholder="0.00">
								</div>
							</div>

							<div class="commission-section">
								<label class="commission-label">Commission:</label>
								<div class="commission-options">
									<label><input type="checkbox" id="comm25" name="commission" value="25"> 25%</label>
									<label><input type="checkbox" id="comm50" name="commission" value="50"> 50%</label>
									<label><input type="checkbox" id="comm75" name="commission" value="75"> 75%</label>
									<label><input type="checkbox" id="comm100" name="commission" value="100"> 100%</label>
								</div>
								<div class="commission-other">
									<label><input type="checkbox" id="commOther" name="commission" value="other"> Other</label>
									<input type="number" id="commOtherPercent" placeholder="%" style="width: 60px;">
									<span>%</span>
									<label style="margin-left: 16px;"><input type="checkbox" id="commFlatFee" name="commission" value="flat"> Flat Fee $</label>
									<input type="number" id="commFlatAmount" step="0.01" placeholder="0.00" style="width: 100px;">
								</div>
							</div>

							<div class="form-row">
								<div class="form-group">
									<label>Term of Lease (months):</label>
									<input type="number" id="leaseTerm" placeholder="12">
								</div>
								<div class="form-group">
									<label>PO# for invoice (if app):</label>
									<input type="text" id="poNumber">
								</div>
							</div>

							<div class="form-row">
								<div class="form-group" style="flex: 1;">
									<label>Date tenant actually moved-in:</label>
									<input type="date" id="actualMoveInDate">
								</div>
							</div>

							<div class="form-row">
								<div class="form-group" style="flex: 2;">
									<label>Name of Locator on Application:</label>
									<input type="text" id="locatorOnApp" class="full-width">
								</div>
								<div class="form-group escorted-group">
									<label>Escorted?</label>
									<div class="yes-no-options">
										<label><input type="radio" name="escorted" value="yes"> Yes</label>
										<label><input type="radio" name="escorted" value="no"> No</label>
									</div>
								</div>
							</div>
						</div>

						<!-- Signature Section -->
						<div class="form-section signature-section">
							<div class="signature-row">
								<div class="signature-field">
									<label>Printed Name of Authorized Representative</label>
									<input type="text" id="printedName" class="full-width">
								</div>
								<div class="signature-field date-field">
									<label>Date</label>
									<input type="date" id="signatureDate">
								</div>
								<div class="signature-field">
									<label>Signature of Authorized Representative</label>
									<div class="signature-placeholder">
										<p>[E-Signature Placeholder - Docusign Integration]</p>
									</div>
								</div>
							</div>
						</div>

						<!-- Footer Notes -->
						<div class="form-section footer-notes">
							<p class="note-text">
								<strong>Note to Management:</strong> This is not an invoice. An invoice will be generated after move-in confirmed.
								By signature above, Management Company confirms Texas Relocation Experts is listed on application. TX Relocation Experts
								will reimburse commission if tenant vacates within 90 days of move-in on full term leases. TX Relocation Experts is
								guaranteed commission if tenant stays ≥90 from move-in date.
							</p>
							<p class="return-instruction">
								<strong>Please return via fax to 210.348.8493 within 48 hours after move-in.</strong>
							</p>
						</div>

						<!-- Thank You Banner -->
						<div class="thank-you-banner">
							<span class="star">★</span>
							<h2>THANK YOU FOR YOUR ASSISTANCE!</h2>
							<span class="star">★</span>
						</div>

						<div class="company-footer">
							<p>Texas Relocation Experts | 11255 Huebner Rd, Ste 112, San Antonio TX 78230 | Office: 210.348.5739</p>
						</div>

						<!-- Form Actions -->
						<div class="form-actions">
							<button type="button" id="cancelLeaseForm" class="btn btn-secondary">Cancel</button>
							<button type="button" id="saveLeaseForm" class="btn btn-primary">Save Draft</button>
							<button type="submit" class="btn btn-success">Submit to Property</button>
						</div>
					</form>
				</div>
			</div>
		`;
	}

	attachEventListeners() {
		// Form submission
		document.getElementById('leaseConfirmationForm').addEventListener('submit', (e) => {
			e.preventDefault();
			this.submitForm();
		});

		// Cancel button
		document.getElementById('cancelLeaseForm').addEventListener('click', () => {
			if (confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
				window.location.hash = '#documents';
			}
		});

		// Save draft button
		document.getElementById('saveLeaseForm').addEventListener('click', () => {
			this.saveDraft();
		});

		// Commission checkbox exclusivity
		const commissionCheckboxes = document.querySelectorAll('input[name="commission"]');
		commissionCheckboxes.forEach(checkbox => {
			checkbox.addEventListener('change', (e) => {
				if (e.target.checked) {
					commissionCheckboxes.forEach(cb => {
						if (cb !== e.target) cb.checked = false;
					});
				}
			});
		});

		// Split cut checkbox exclusivity
		const splitCheckboxes = document.querySelectorAll('input[name="splitCut"]');
		splitCheckboxes.forEach(checkbox => {
			checkbox.addEventListener('change', (e) => {
				if (e.target.checked) {
					splitCheckboxes.forEach(cb => {
						if (cb !== e.target) cb.checked = false;
					});
				}
			});
		});
	}

	async submitForm() {
		console.log('Submitting lease confirmation form...');
		const formData = this.collectFormData();

		// TODO: Save to database and send to property
		console.log('Form data:', formData);

		alert('Lease confirmation submitted successfully!');
		window.location.hash = '#documents';
	}

	async saveDraft() {
		console.log('Saving draft...');
		const formData = this.collectFormData();

		// TODO: Save draft to database
		console.log('Draft data:', formData);

		alert('Draft saved successfully!');
	}

	collectFormData() {
		return {
			// Header info
			date: document.getElementById('leaseDate').value,
			attn: document.getElementById('attn').value,
			locator: document.getElementById('locator').value,
			propertyName: document.getElementById('propertyName').value,
			locatorContact: document.getElementById('locatorContact').value,
			propertyPhone: document.getElementById('propertyPhone').value,
			faxEmail: document.getElementById('faxEmail').value,
			splitAgent: document.getElementById('splitAgent').value,
			splitCut: document.querySelector('input[name="splitCut"]:checked')?.value,

			// Tenant info
			tenantNames: document.getElementById('tenantNames').value,
			tenantPhone: document.getElementById('tenantPhone').value,
			moveInDate: document.getElementById('moveInDate').value,
			expectedUnit: document.getElementById('expectedUnit').value,

			// Property personnel
			tenantsCorrect: document.querySelector('input[name="tenantsCorrect"]:checked')?.value,
			tenantCorrections: document.getElementById('tenantCorrections').value,
			unitNumber: document.getElementById('unitNumber').value,
			rentAmount: document.getElementById('rentAmount').value,
			rentWithConcessions: document.getElementById('rentWithConcessions').value,
			commission: document.querySelector('input[name="commission"]:checked')?.value,
			commissionOtherPercent: document.getElementById('commOtherPercent').value,
			commissionFlatAmount: document.getElementById('commFlatAmount').value,
			leaseTerm: document.getElementById('leaseTerm').value,
			poNumber: document.getElementById('poNumber').value,
			actualMoveInDate: document.getElementById('actualMoveInDate').value,
			locatorOnApp: document.getElementById('locatorOnApp').value,
			escorted: document.querySelector('input[name="escorted"]:checked')?.value,

			// Signature
			printedName: document.getElementById('printedName').value,
			signatureDate: document.getElementById('signatureDate').value,

			// Accounting (internal use)
			invoiceNumber: document.getElementById('invoiceNumber').value,
			payStatus: document.getElementById('payStatus').value,
			dbRefNumber: document.getElementById('dbRefNumber').value
		};
	}
}



