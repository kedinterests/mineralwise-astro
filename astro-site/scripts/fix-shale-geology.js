import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pagesDir = path.join(__dirname, '../src/pages');

const shalePages = [
	'bakken-shale-north-dakota',
	'barnett-shale-texas',
	'bossier-shale-texas',
	'eagle-ford-shale-texas',
	'fayetteville-shale-arkansas',
	'haynesville-shale-louisiana',
	'haynesville-shale-texas',
	'huron-shale',
	'marcellus-shale-maryland',
	'marcellus-shale-new-jersey',
	'marcellus-shale-new-york',
	'marcellus-shale-ohio',
	'marcellus-shale-pennsylvania',
	'marcellus-shale-west-virginia',
	'niobrara-shale-colorado-and-wyoming',
	'tuscaloosa-marine-shale-louisiana',
	'utica-shale',
	'utica-shale-new-york',
	'utica-shale-ohio',
	'woodford-shale-oklahoma'
];

function extractGeologyFromDescription(description) {
	// Look for "Geology" section in description
	const geologyMatch = description.match(/Geology([^L]*?)(?:Location|$)/i);
	if (geologyMatch) {
		let geology = geologyMatch[1]
			.replace(/&amp;/g, '&')
			.replace(/&nbsp;/g, ' ')
			.trim();
		
		// Clean up common patterns
		geology = geology.replace(/^The\s+/, '');
		
		return geology || '';
	}
	return '';
}

function capitalizeState(state) {
	if (!state || state === 'undefined') return undefined;
	return state.split(' ').map(w => {
		if (w.toLowerCase() === 'and') return 'and';
		return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
	}).join(' ');
}

for (const slug of shalePages) {
	const filePath = path.join(pagesDir, `${slug}.astro`);
	
	if (!fs.existsSync(filePath)) {
		console.log(`⚠️  Skipping ${slug} - file not found`);
		continue;
	}

	let content = fs.readFileSync(filePath, 'utf-8');
	
	// Extract description
	const descMatch = content.match(/const description = "([^"]+)"/);
	if (!descMatch) continue;
	
	const description = descMatch[1];
	
	// Extract geology from description
	const geology = extractGeologyFromDescription(description);
	
	// Fix state capitalization
	const stateMatch = content.match(/const state = (?:undefined|"([^"]+)")/);
	if (stateMatch) {
		const oldState = stateMatch[1] || undefined;
		const newState = capitalizeState(oldState);
		
		// Replace state
		if (oldState !== newState) {
			const stateReplacement = newState ? `"${newState}"` : 'undefined';
			content = content.replace(/const state = (?:undefined|"[^"]+")/, `const state = ${stateReplacement}`);
		}
	}
	
	// Replace empty geology
	if (geology && content.includes('const geology = ""')) {
		content = content.replace(/const geology = ""/, `const geology = ${JSON.stringify(geology)}`);
	}
	
	fs.writeFileSync(filePath, content, 'utf-8');
	console.log(`✅ Fixed ${slug}`);
}

console.log('\n✅ All shale pages fixed!');
