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

function extractStats(description, geology, counties) {
	const stats = [];
	const allText = (description + ' ' + geology).toLowerCase();
	
	// Extract area coverage
	const areaMatch = allText.match(/(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:million\s*)?(?:acres|square\s*miles?|sq\s*mi)/i);
	if (areaMatch) {
		const value = areaMatch[1].replace(/,/g, '');
		const unit = allText.includes('million acres') ? 'million acres' : 
		             allText.includes('square miles') || allText.includes('sq mi') ? 'sq mi' : 'acres';
		stats.push({
			label: 'Area Coverage',
			value: `${parseFloat(value).toLocaleString()} ${unit === 'million acres' ? 'M acres' : unit}`
		});
	}
	
	// Extract depth range
	const depthMatch = allText.match(/(?:between|from|at|located)\s+(\d+(?:,\d+)*)\s*(?:and|-|to)\s*(\d+(?:,\d+)*)\s*feet/i);
	if (depthMatch) {
		const minDepth = parseInt(depthMatch[1].replace(/,/g, ''));
		const maxDepth = parseInt(depthMatch[2].replace(/,/g, ''));
		stats.push({
			label: 'Depth Range',
			value: `${minDepth.toLocaleString()}-${maxDepth.toLocaleString()} ft`
		});
	} else {
		// Try single depth
		const singleDepthMatch = allText.match(/(?:approximately|about|at)\s+(\d+(?:,\d+)*)\s*feet/i);
		if (singleDepthMatch) {
			const depth = parseInt(singleDepthMatch[1].replace(/,/g, ''));
			stats.push({
				label: 'Depth',
				value: `${depth.toLocaleString()} ft`
			});
		}
	}
	
	// Extract thickness
	const thicknessMatch = allText.match(/(?:thick|thickness).*?(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:to|-|and)\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*feet/i);
	if (thicknessMatch) {
		const minThick = parseFloat(thicknessMatch[1].replace(/,/g, ''));
		const maxThick = parseFloat(thicknessMatch[2].replace(/,/g, ''));
		stats.push({
			label: 'Thickness',
			value: `${minThick.toLocaleString()}-${maxThick.toLocaleString()} ft`
		});
	} else {
		const singleThickMatch = allText.match(/(?:up\s*to|about|approximately)\s+(\d+(?:,\d+)*(?:\.\d+)?)\s*feet\s*(?:thick|in\s*thickness)/i);
		if (singleThickMatch) {
			const thick = parseFloat(singleThickMatch[1].replace(/,/g, ''));
			stats.push({
				label: 'Thickness',
				value: `Up to ${thick.toLocaleString()} ft`
			});
		}
	}
	
	// Extract estimated reserves
	const reservesMatch = allText.match(/(\d+(?:\.\d+)?)\s*(?:billion|b|million|m|trillion|t)\s*(?:barrels?|bbl|bcf|tcf)/i);
	if (reservesMatch) {
		const value = parseFloat(reservesMatch[1]);
		const unit = allText.includes('billion') || allText.includes(' b ') ? 'B' :
		             allText.includes('trillion') || allText.includes(' t ') ? 'T' : 'M';
		const type = allText.includes('barrel') || allText.includes('bbl') ? 'barrels' : 'BCF';
		stats.push({
			label: 'Estimated Reserves',
			value: `${value}${unit} ${type}`
		});
	}
	
	// Extract basin name
	const basinMatch = allText.match(/(\w+\s+basin)/i);
	if (basinMatch && !basinMatch[1].includes('appalachian')) {
		const basin = basinMatch[1].split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
		stats.push({
			label: 'Basin',
			value: basin
		});
	}
	
	// Extract geological age
	const ageMatch = allText.match(/(devonian|mississippian|ordovician|silurian|cambrian|permian|pennsylvanian|cretaceous|jurassic|triassic)(?:\s+(?:age|aged|age\s+formation))?/i);
	if (ageMatch) {
		const age = ageMatch[1].charAt(0).toUpperCase() + ageMatch[1].slice(1);
		stats.push({
			label: 'Geological Age',
			value: age
		});
	}
	
	// Add county count if available
	if (counties && counties.length > 0) {
		stats.push({
			label: 'Counties',
			value: `${counties.length}`
		});
	}
	
	return stats;
}

for (const slug of shalePages) {
	const filePath = path.join(pagesDir, `${slug}.astro`);
	
	if (!fs.existsSync(filePath)) {
		console.log(`⚠️  Skipping ${slug} - file not found`);
		continue;
	}

	let content = fs.readFileSync(filePath, 'utf-8');
	
	// Extract description and geology
	const descMatch = content.match(/const description = "([^"]+)"/);
	const geologyMatch = content.match(/const geology = (?:""|"([^"]+)")/);
	const countiesMatch = content.match(/const counties = \[([\s\S]*?)\];/);
	
	if (!descMatch) {
		console.log(`⚠️  Skipping ${slug} - no description found`);
		continue;
	}
	
	const description = descMatch[1].replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ');
	const geology = geologyMatch && geologyMatch[1] ? geologyMatch[1].replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ') : '';
	
	// Extract counties array
	let counties = [];
	if (countiesMatch) {
		const countiesStr = countiesMatch[1];
		const countyMatches = countiesStr.matchAll(/"([^"]+)"/g);
		for (const match of countyMatches) {
			counties.push(match[1]);
		}
	}
	
	// Extract stats
	const stats = extractStats(description, geology, counties);
	
	// Replace stats array
	if (stats.length > 0) {
		const statsJson = JSON.stringify(stats, null, '\t');
		content = content.replace(/const stats = \[[\s\S]*?\];/, `const stats = ${statsJson};`);
		fs.writeFileSync(filePath, content, 'utf-8');
		console.log(`✅ Added ${stats.length} stats to ${slug}`);
	} else {
		console.log(`⚠️  No stats found for ${slug}`);
	}
}

console.log('\n✅ Stats extraction complete!');
