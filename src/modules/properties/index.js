// Properties Module - Barrel Export
// Combines properties, specials, and bug tracker functionality

import * as PropertiesRendering from './properties-rendering.js';
import * as SpecialsRendering from './specials-rendering.js';
import * as SpecialsActions from './specials-actions.js';
import * as BugsRendering from './bugs-rendering.js';

export {
	PropertiesRendering,
	SpecialsRendering,
	SpecialsActions,
	BugsRendering
};

// Re-export individual functions for convenience
export {
	renderProperties,
	renderPropertyContacts,
	populatePropertyDropdown,
	savePropertyContact,
	editPropertyContact
} from './properties-rendering.js';

export {
	renderSpecials
} from './specials-rendering.js';

export {
	saveNewSpecial,
	deleteSpecial,
	createSpecialAPI,
	deleteSpecialAPI
} from './specials-actions.js';

export {
	renderBugs,
	showBugReportModal,
	submitBugReport,
	getBrowserInfo,
	getOSInfo,
	addBugFlags,
	updateBugFlagVisibility,
	showBugDetails
} from './bugs-rendering.js';

