/**
 * Photo Gallery Module
 * Handles displaying property photos and floor plan images in a modal gallery
 *
 * @module listings/photo-gallery
 */

import { invalidateCache } from './listings-cache.js';

let currentGalleryProperty = null;
let currentGalleryOptions = {};

/**
 * Open the photo gallery modal for a property
 * @param {Object} property - The property object containing photos and floor plans
 * @param {Object} options - Options including state, SupabaseAPI, toast
 */
export async function openPhotoGalleryModal(property, options = {}) {
	const modal = document.getElementById('photoGalleryModal');
	const titleEl = document.getElementById('photoGalleryTitle');
	const contentEl = document.getElementById('photoGalleryContent');
	const closeBtn = document.getElementById('closePhotoGallery');

	if (!modal || !titleEl || !contentEl) {
		console.error('Photo gallery modal elements not found');
		return;
	}

	currentGalleryProperty = property;
	currentGalleryOptions = options;

	// Check if user can delete photos (manager in Agent View)
	const canDelete = options.state?.role === 'manager' && !options.state?.customerView?.isActive;

	const propertyName = property.community_name || property.name;
	titleEl.textContent = `📷 ${propertyName} - Photos`;

	// Collect all images
	const propertyPhotos = property.photos || [];
	const floorPlans = property.floorPlans || [];

	// Get floor plan images
	const floorPlanImages = floorPlans
		.filter(fp => fp.image_url)
		.map(fp => ({
			url: fp.image_url,
			label: fp.name || `${fp.beds}bd/${fp.baths}ba`,
			type: 'floorplan'
		}));

	// Property photos
	const exteriorPhotos = propertyPhotos.map((url, i) => ({
		url,
		label: `Photo ${i + 1}`,
		type: 'exterior'
	}));

	const allImages = [...exteriorPhotos, ...floorPlanImages];

	if (allImages.length === 0) {
		contentEl.innerHTML = `
			<div class="photo-gallery-empty">
				<div class="empty-icon">📷</div>
				<h4>No Photos Available</h4>
				<p>Run AI Enrichment to search for property photos and floor plan images.</p>
			</div>
		`;
	} else {
		// Group by type
		const hasExterior = exteriorPhotos.length > 0;
		const hasFloorPlans = floorPlanImages.length > 0;

		contentEl.innerHTML = `
			${hasExterior ? `
				<div class="gallery-section">
					<h4 class="gallery-section-title">🏢 Property Photos</h4>
					<div class="gallery-grid">
						${exteriorPhotos.map((img, i) => `
							<div class="gallery-item" data-index="${i}" data-type="exterior" data-url="${encodeURIComponent(img.url)}">
								<img src="${img.url}" alt="${img.label}"
									loading="lazy"
									onerror="this.parentElement.classList.add('load-error'); this.style.display='none';">
								<div class="gallery-item-label">${img.label}</div>
								${canDelete ? `<button class="gallery-delete-btn" data-url="${encodeURIComponent(img.url)}" data-type="exterior" title="Delete photo">×</button>` : ''}
							</div>
						`).join('')}
					</div>
				</div>
			` : ''}
			${hasFloorPlans ? `
				<div class="gallery-section">
					<h4 class="gallery-section-title">📐 Floor Plans</h4>
					<div class="gallery-grid floor-plans">
						${floorPlanImages.map((img, i) => `
							<div class="gallery-item floor-plan" data-index="${exteriorPhotos.length + i}" data-type="floorplan" data-floorplan-id="${floorPlans[i]?.id || ''}">
								<img src="${img.url}" alt="${img.label}"
									loading="lazy"
									onerror="this.parentElement.classList.add('load-error'); this.style.display='none';">
								<div class="gallery-item-label">${img.label}</div>
								${canDelete ? `<button class="gallery-delete-btn" data-floorplan-id="${floorPlans[i]?.id || ''}" data-type="floorplan" title="Delete floor plan image">×</button>` : ''}
							</div>
						`).join('')}
					</div>
				</div>
			` : ''}
		`;

		// Add click handlers to open full-size images
		contentEl.querySelectorAll('.gallery-item').forEach(item => {
			item.addEventListener('click', (e) => {
				// Don't open viewer if clicking delete button
				if (e.target.classList.contains('gallery-delete-btn')) return;
				const img = item.querySelector('img');
				if (img && img.src) {
					openFullSizeViewer(img.src, allImages, parseInt(item.dataset.index), canDelete);
				}
			});
		});

		// Add delete button handlers
		if (canDelete) {
			setupDeleteHandlers(contentEl, property, options);
		}
	}

	// Show modal
	modal.classList.remove('hidden');

	// Close handlers
	const closeModal = () => {
		modal.classList.add('hidden');
	};

	closeBtn.onclick = closeModal;
	modal.onclick = (e) => {
		if (e.target === modal) closeModal();
	};

	// ESC key to close
	const escHandler = (e) => {
		if (e.key === 'Escape') {
			closeModal();
			document.removeEventListener('keydown', escHandler);
		}
	};
	document.addEventListener('keydown', escHandler);
}

/**
 * Open full-size image viewer with navigation
 */
function openFullSizeViewer(initialSrc, allImages, startIndex) {
	// Create overlay
	const overlay = document.createElement('div');
	overlay.className = 'fullsize-viewer-overlay';
	overlay.innerHTML = `
		<div class="fullsize-viewer">
			<button class="viewer-close" title="Close (Esc)">×</button>
			<button class="viewer-nav viewer-prev" title="Previous (←)">❮</button>
			<div class="viewer-image-container">
				<img src="${initialSrc}" alt="Full size">
				<div class="viewer-caption"></div>
			</div>
			<button class="viewer-nav viewer-next" title="Next (→)">❯</button>
			<div class="viewer-counter"></div>
		</div>
	`;

	document.body.appendChild(overlay);

	let currentIndex = startIndex;
	const imgEl = overlay.querySelector('.viewer-image-container img');
	const captionEl = overlay.querySelector('.viewer-caption');
	const counterEl = overlay.querySelector('.viewer-counter');

	const updateImage = () => {
		const img = allImages[currentIndex];
		imgEl.src = img.url;
		captionEl.textContent = img.label;
		counterEl.textContent = `${currentIndex + 1} / ${allImages.length}`;
	};

	updateImage();

	// Navigation
	overlay.querySelector('.viewer-prev').onclick = () => {
		currentIndex = (currentIndex - 1 + allImages.length) % allImages.length;
		updateImage();
	};

	overlay.querySelector('.viewer-next').onclick = () => {
		currentIndex = (currentIndex + 1) % allImages.length;
		updateImage();
	};

	// Close
	const closeViewer = () => {
		overlay.remove();
	};

	overlay.querySelector('.viewer-close').onclick = closeViewer;
	overlay.onclick = (e) => {
		if (e.target === overlay) closeViewer();
	};

	// Keyboard nav
	const keyHandler = (e) => {
		if (e.key === 'Escape') closeViewer();
		if (e.key === 'ArrowLeft') {
			currentIndex = (currentIndex - 1 + allImages.length) % allImages.length;
			updateImage();
		}
		if (e.key === 'ArrowRight') {
			currentIndex = (currentIndex + 1) % allImages.length;
			updateImage();
		}
	};
	document.addEventListener('keydown', keyHandler);

	// Cleanup on close
	const observer = new MutationObserver(() => {
		if (!document.body.contains(overlay)) {
			document.removeEventListener('keydown', keyHandler);
			observer.disconnect();
		}
	});
	observer.observe(document.body, { childList: true });
}

/**
 * Setup delete handlers for gallery items
 */
function setupDeleteHandlers(contentEl, property, options) {
	const deleteButtons = contentEl.querySelectorAll('.gallery-delete-btn');
	deleteButtons.forEach(btn => {
		btn.addEventListener('click', async (e) => {
			e.stopPropagation();
			const type = btn.dataset.type;

			if (type === 'exterior') {
				const photoUrl = decodeURIComponent(btn.dataset.url);
				await handlePhotoDelete(photoUrl, property, options);
			} else if (type === 'floorplan') {
				const floorplanId = btn.dataset.floorplanId;
				await handleFloorPlanImageDelete(floorplanId, property, options);
			}
		});
	});
}

/**
 * Handle photo deletion
 */
async function handlePhotoDelete(photoUrl, property, options) {
	const { SupabaseAPI, toast } = options;

	const confirmed = confirm('Are you sure you want to delete this photo?\n\nThis action cannot be undone.');
	if (!confirmed) return;

	try {
		const photos = property.photos || [];
		const thumbnail = property.thumbnail;

		// Remove photo from array
		const updatedPhotos = photos.filter(p => p !== photoUrl);
		const updatedThumbnail = thumbnail === photoUrl ? (updatedPhotos[0] || null) : thumbnail;

		if (SupabaseAPI) {
			await SupabaseAPI.updateProperty(property.id, {
				photos: updatedPhotos,
				thumbnail: updatedThumbnail
			});

			// Update local property and refresh gallery
			property.photos = updatedPhotos;
			property.thumbnail = updatedThumbnail;

			// Invalidate listings cache
			invalidateCache();

			// Re-render gallery
			await openPhotoGalleryModal(property, options);
			toast?.('Photo deleted successfully', 'success');
		}
	} catch (error) {
		console.error('Error deleting photo:', error);
		toast?.('Failed to delete photo', 'error');
	}
}

/**
 * Handle floor plan image deletion
 */
async function handleFloorPlanImageDelete(floorplanId, property, options) {
	const { SupabaseAPI, toast } = options;

	if (!floorplanId) {
		toast?.('Cannot delete: floor plan ID not found', 'error');
		return;
	}

	const confirmed = confirm('Are you sure you want to delete this floor plan image?\n\nThis will remove the image from the floor plan record.');
	if (!confirmed) return;

	try {
		if (SupabaseAPI) {
			// Update floor plan to remove image_url
			await SupabaseAPI.updateFloorPlan(floorplanId, { image_url: null });

			// Refresh floor plans and re-render gallery
			const floorPlans = await SupabaseAPI.getFloorPlans(property.id) || [];
			property.floorPlans = floorPlans;

			await openPhotoGalleryModal(property, options);
			toast?.('Floor plan image deleted successfully', 'success');
		}
	} catch (error) {
		console.error('Error deleting floor plan image:', error);
		toast?.('Failed to delete floor plan image', 'error');
	}
}
