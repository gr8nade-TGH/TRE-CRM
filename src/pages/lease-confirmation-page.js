import * as SupabaseAPI from '../api/supabase-api.js';

export class LeaseConfirmationPage {
	constructor() {
		this.leadId = null;
		this.leadData = null;
		this.propertyData = null;
	}

	async init(leadId = null) {
		console.log('Initializing Lease Confirmation Page', { leadId });

		// Extract leadId from URL if not provided
		if (!leadId) {
			const hash = window.location.hash;
			const urlParams = new URLSearchParams(hash.split('?')[1]);
			leadId = urlParams.get('leadId');
		}

		this.leadId = leadId;

		// Load lead and property data if leadId provided
		if (leadId) {
			await this.loadLeadData(leadId);
		}

		this.render();
		this.attachEventListeners();

		// Auto-populate fields
		await this.populateFields();
	}

	async loadLeadData(leadId) {
		try {
			console.log('Loading lead data for:', leadId);

			// Fetch lead data
			const leadData = await SupabaseAPI.getLead(leadId);
			console.log('Lead data loaded:', leadData);

			if (!leadData) {
				console.error('Lead not found:', leadId);
				return;
			}

			this.leadData = leadData;

			// Fetch property data if property_id exists
			if (leadData.property_id) {
				const propertyData = await SupabaseAPI.getProperty(leadData.property_id);
				console.log('Property data loaded:', propertyData);
				this.propertyData = propertyData;
			}

			// Check for existing lease confirmation
			const { data: existingConfirmations } = await SupabaseAPI.supabase
				.from('lease_confirmations')
				.select('*')
				.eq('lead_id', leadId)
				.order('created_at', { ascending: false })
				.limit(1);

			if (existingConfirmations && existingConfirmations.length > 0) {
				this.existingConfirmation = existingConfirmations[0];
				console.log('Existing confirmation found:', this.existingConfirmation);
			}
		} catch (error) {
			console.error('Error loading lead data:', error);
		}
	}

	async populateFields() {
		// Auto-populate today's date
		const today = new Date().toISOString().split('T')[0];
		const leaseDateField = document.getElementById('leaseDate');
		if (leaseDateField) leaseDateField.value = today;

		// If we have existing confirmation data, populate from that
		if (this.existingConfirmation) {
			this.populateFromExistingConfirmation();
			return;
		}

		// Otherwise, populate from lead and property data
		if (this.leadData) {
			const tenantNamesField = document.getElementById('tenantNames');
			const tenantPhoneField = document.getElementById('tenantPhone');
			const moveInDateField = document.getElementById('moveInDate');

			if (tenantNamesField) tenantNamesField.value = this.leadData.name || '';
			if (tenantPhoneField) tenantPhoneField.value = this.leadData.phone || '';
			if (moveInDateField && this.leadData.move_in_date) {
				moveInDateField.value = this.leadData.move_in_date;
			}
		}

		if (this.propertyData) {
			const propertyNameField = document.getElementById('propertyName');
			const propertyPhoneField = document.getElementById('propertyPhone');
			const faxEmailField = document.getElementById('faxEmail');
			const attnField = document.getElementById('attn');

			if (propertyNameField) propertyNameField.value = this.propertyData.community_name || this.propertyData.name || '';
			if (propertyPhoneField) propertyPhoneField.value = this.propertyData.contact_phone || '';
			if (faxEmailField) faxEmailField.value = this.propertyData.contact_email || '';
			if (attnField) attnField.value = this.propertyData.contact_name || '';
		}

		// Get current user for locator info
		try {
			const { data: { user } } = await SupabaseAPI.supabase.auth.getUser();
			if (user) {
				const locatorField = document.getElementById('locator');
				const locatorContactField = document.getElementById('locatorContact');

				// Fetch user profile for full name
				const { data: profile } = await SupabaseAPI.supabase
					.from('users')
					.select('name, email, phone')
					.eq('id', user.id)
					.single();

				if (profile) {
					if (locatorField) locatorField.value = profile.name || '';
					if (locatorContactField) locatorContactField.value = profile.phone || profile.email || '';
				}
			}
		} catch (error) {
			console.error('Error fetching user data:', error);
		}
	}

	populateFromExistingConfirmation() {
		const conf = this.existingConfirmation;

		// Helper function to safely set field value
		const setField = (id, value) => {
			const field = document.getElementById(id);
			if (field && value) field.value = value;
		};

		// Helper function to safely check checkbox
		const checkBox = (name, value) => {
			const checkbox = document.querySelector(`input[name="${name}"][value="${value}"]`);
			if (checkbox) checkbox.checked = true;
		};

		// Populate all fields from existing confirmation
		setField('leaseDate', conf.date);
		setField('attn', conf.attn);
		setField('locator', conf.locator);
		setField('propertyName', conf.property_name);
		setField('locatorContact', conf.locator_contact);
		setField('propertyPhone', conf.property_phone);
		setField('faxEmail', conf.fax_email);
		setField('splitAgent', conf.split_agent);

		if (conf.split_cut) checkBox('splitCut', conf.split_cut);

		setField('tenantNames', conf.tenant_names);
		setField('tenantPhone', conf.tenant_phone);
		setField('moveInDate', conf.move_in_date);
		setField('expectedUnit', conf.expected_unit);

		if (conf.tenants_correct) checkBox('tenantsCorrect', conf.tenants_correct);
		setField('tenantCorrections', conf.tenant_corrections);
		setField('unitNumber', conf.unit_number);
		setField('rentAmount', conf.rent_amount);
		setField('rentWithConcessions', conf.rent_with_concessions);

		if (conf.commission) checkBox('commission', conf.commission);
		setField('commOtherPercent', conf.commission_other_percent);
		setField('commFlatAmount', conf.commission_flat_amount);
		setField('leaseTerm', conf.lease_term);
		setField('poNumber', conf.po_number);
		setField('actualMoveInDate', conf.actual_move_in_date);
		setField('locatorOnApp', conf.locator_on_app);

		if (conf.escorted) checkBox('escorted', conf.escorted);

		setField('printedName', conf.printed_name);
		setField('signatureDate', conf.signature_date);
		setField('invoiceNumber', conf.invoice_number);
		setField('payStatus', conf.pay_status);
		setField('dbRefNumber', conf.db_ref_number);
	}

	render() {
		const container = document.getElementById('leaseConfirmationView');
		container.innerHTML = `
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

		if (!this.leadId) {
			alert('Error: No lead ID found. Please return to Documents page and try again.');
			return;
		}

		const formData = this.collectFormData();

		try {
			// Get current user
			const { data: { user } } = await SupabaseAPI.supabase.auth.getUser();

			// Prepare data for database
			const dbData = {
				lead_id: this.leadId,
				property_id: this.leadData?.property_id || null,
				date: formData.date || null,
				attn: formData.attn || null,
				locator: formData.locator || null,
				property_name: formData.propertyName || null,
				locator_contact: formData.locatorContact || null,
				property_phone: formData.propertyPhone || null,
				fax_email: formData.faxEmail || null,
				split_agent: formData.splitAgent || null,
				split_cut: formData.splitCut || null,
				tenant_names: formData.tenantNames || null,
				tenant_phone: formData.tenantPhone || null,
				move_in_date: formData.moveInDate || null,
				expected_unit: formData.expectedUnit || null,
				tenants_correct: formData.tenantsCorrect || null,
				tenant_corrections: formData.tenantCorrections || null,
				unit_number: formData.unitNumber || null,
				rent_amount: formData.rentAmount ? parseFloat(formData.rentAmount) : null,
				rent_with_concessions: formData.rentWithConcessions ? parseFloat(formData.rentWithConcessions) : null,
				commission: formData.commission || null,
				commission_other_percent: formData.commissionOtherPercent ? parseFloat(formData.commissionOtherPercent) : null,
				commission_flat_amount: formData.commissionFlatAmount ? parseFloat(formData.commissionFlatAmount) : null,
				lease_term: formData.leaseTerm ? parseInt(formData.leaseTerm) : null,
				po_number: formData.poNumber || null,
				actual_move_in_date: formData.actualMoveInDate || null,
				locator_on_app: formData.locatorOnApp || null,
				escorted: formData.escorted || null,
				printed_name: formData.printedName || null,
				signature_date: formData.signatureDate || null,
				invoice_number: formData.invoiceNumber || null,
				pay_status: formData.payStatus || null,
				db_ref_number: formData.dbRefNumber || null,
				status: 'pending_signature',
				submitted_at: new Date().toISOString(),
				created_by: user?.id || null
			};

			// Check if we're updating existing or creating new
			if (this.existingConfirmation) {
				// Update existing
				const { error } = await SupabaseAPI.supabase
					.from('lease_confirmations')
					.update(dbData)
					.eq('id', this.existingConfirmation.id);

				if (error) throw error;

				console.log('Lease confirmation updated successfully');
			} else {
				// Create new
				const { error } = await SupabaseAPI.supabase
					.from('lease_confirmations')
					.insert([dbData]);

				if (error) throw error;

				console.log('Lease confirmation created successfully');
			}

			// Log activity
			await SupabaseAPI.logLeadActivity({
				lead_id: this.leadId,
				activity_type: 'lease_prepared',
				description: 'Lease confirmation form prepared and ready to send',
				metadata: {
					property_id: this.leadData?.property_id,
					property_name: formData.propertyName,
					status: 'pending_signature'
				}
			});

			alert('✅ Lease confirmation submitted successfully!\n\nYou can now send it for signature from the Documents page.');
			window.location.hash = '#/documents';
		} catch (error) {
			console.error('Error submitting lease confirmation:', error);
			alert('❌ Error submitting lease confirmation. Please try again.\n\n' + error.message);
		}
	}

	async saveDraft() {
		console.log('Saving draft...');

		if (!this.leadId) {
			alert('Error: No lead ID found. Please return to Documents page and try again.');
			return;
		}

		const formData = this.collectFormData();

		try {
			// Get current user
			const { data: { user } } = await SupabaseAPI.supabase.auth.getUser();

			// Prepare data for database
			const dbData = {
				lead_id: this.leadId,
				property_id: this.leadData?.property_id || null,
				date: formData.date || null,
				attn: formData.attn || null,
				locator: formData.locator || null,
				property_name: formData.propertyName || null,
				locator_contact: formData.locatorContact || null,
				property_phone: formData.propertyPhone || null,
				fax_email: formData.faxEmail || null,
				split_agent: formData.splitAgent || null,
				split_cut: formData.splitCut || null,
				tenant_names: formData.tenantNames || null,
				tenant_phone: formData.tenantPhone || null,
				move_in_date: formData.moveInDate || null,
				expected_unit: formData.expectedUnit || null,
				tenants_correct: formData.tenantsCorrect || null,
				tenant_corrections: formData.tenantCorrections || null,
				unit_number: formData.unitNumber || null,
				rent_amount: formData.rentAmount ? parseFloat(formData.rentAmount) : null,
				rent_with_concessions: formData.rentWithConcessions ? parseFloat(formData.rentWithConcessions) : null,
				commission: formData.commission || null,
				commission_other_percent: formData.commissionOtherPercent ? parseFloat(formData.commissionOtherPercent) : null,
				commission_flat_amount: formData.commissionFlatAmount ? parseFloat(formData.commissionFlatAmount) : null,
				lease_term: formData.leaseTerm ? parseInt(formData.leaseTerm) : null,
				po_number: formData.poNumber || null,
				actual_move_in_date: formData.actualMoveInDate || null,
				locator_on_app: formData.locatorOnApp || null,
				escorted: formData.escorted || null,
				printed_name: formData.printedName || null,
				signature_date: formData.signatureDate || null,
				invoice_number: formData.invoiceNumber || null,
				pay_status: formData.payStatus || null,
				db_ref_number: formData.dbRefNumber || null,
				status: 'draft',
				created_by: user?.id || null
			};

			// Check if we're updating existing or creating new
			if (this.existingConfirmation) {
				// Update existing
				const { error } = await SupabaseAPI.supabase
					.from('lease_confirmations')
					.update(dbData)
					.eq('id', this.existingConfirmation.id);

				if (error) throw error;

				console.log('Draft updated successfully');
				alert('✅ Draft saved successfully!');
			} else {
				// Create new
				const { data, error } = await SupabaseAPI.supabase
					.from('lease_confirmations')
					.insert([dbData])
					.select()
					.single();

				if (error) throw error;

				// Store the new confirmation so subsequent saves update instead of create
				this.existingConfirmation = data;

				console.log('Draft created successfully');
				alert('✅ Draft saved successfully!');
			}
		} catch (error) {
			console.error('Error saving draft:', error);
			alert('❌ Error saving draft. Please try again.\n\n' + error.message);
		}
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



