import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Map company page slugs to their actual logo filenames
const logoMap = {
	'aera-energy-llc': 'aera.png',
	'anadarko-petroleum': 'anadarko.png',
	'anschutz-exploration-corp': 'Anschutz.jpg',
	'apache-corporation': 'apache.png',
	'atlas-energy-resources': 'atlas-energy-resources.jpg',
	'berry-petroleum-company': 'berry-petroleum-company.gif',
	'bill-barrett-corporation': 'bill-barrett-corporation.jpg',
	'bp': 'BP.jpg',
	'breitburn-energy-partners': 'Breitburn-energy-partners.jpg',
	'cabot-oil-and-gas-corporation': 'cabot-oil-gas.jpg',
	'callon-petroleum-company': 'callon-petroleum-company.jpg',
	'carrizo-oil-and-gas': 'carriso-oil.jpg',
	'chesapeake-energy': 'chesaoeake-energy.png',
	'chief-oil-and-gas': 'chief-oil-gas.jpg',
	'cimarex-energy': 'cimarex-energy.jpg',
	'citation-oil-and-gas-corp': 'citation-oil-and-gas.jpg',
	'clayton-williams-energy-inc': 'clayton-williams.jpg',
	'cnx-gas-corp': 'cnx-gas.jpg',
	'common-resources-llc': 'common-resources.png',
	'comstock-resources': 'comstock.jpg',
	'concho-resources-inc': 'concho.png',
	'conocophillips': 'conoco.png',
	'continental-resources': 'continental.jpg',
	'crimson-resource-management': 'crimson.png',
	'crown-energy-company': 'crown-energy.png',
	'cubic-energy': 'cubic-energy.png',
	'denbury-resources': 'denbury-resources.png',
	'devon-energy': 'devon-energy.png',
	'dominion-resources-inc': 'dominion.png',
	'east-resources': 'east-resources.png',
	'el-paso-exploration-and-production': 'el-paso.png',
	'encana-corporation': 'encana.png',
	'energen-corp': 'energen.jpg',
	'energulf-resources-inc': 'energulf.jpg',
	'enervest': 'ev.png',
	'eog-resources-inc': 'eog.png',
	'eqt-corporation': 'eqt.jpg',
	'hess-corporation': 'hess.png',
	'hilcorp-energy-co': 'hilcorp.jpg',
	'hunt-oil': 'hunt-oil.png',
	'j-w-operating-co-cohort-energy': 'j-w-operating-co.png',
	'jm-huber-corp': 'jm-huber-corp.jpg',
	'kinder-morgan': 'kinder-morgan.jpg',
	'kodiak-oil-and-gas-corp': 'kodiak.jpg',
	'marathon-oil-company': 'marathon-oil-.png',
	'mariner-energy-inc': 'mariner.jpg',
	'merit-energy': 'merit-energy.png',
	'milagro-exploration': 'milagro.png',
	'murex-petroleum': 'murex.png',
	'murphy-oil-corp': 'murphy.png',
	'newfield-exploration-company': 'newfield-exploration.png',
	'noble-energy': 'noble-energy.png',
	'occidental-petroleum-corporation': 'occidental-petroleum.jpg',
	'penn-virginia': 'penn-virginia.png',
	'petro-hunt-llc': 'petro-hunt.jpg',
	'petrohawk-energy-corporation': 'petrohawk.png',
	'petroleum-development-corp': 'petroleum.jpg',
	'petroquest-energy': 'petroquest.jpg',
	'pioneer-natural-resources': 'pioneer-natural.png',
	'plains-exploration-and-production-co': 'plains-exploration.png',
	'questar-corporation': 'questar.png',
	'quicksilver-resources': 'quicksilver.jpg',
	'range-resources': 'range-resources.jpg',
	'rex-energy-corporation': 'rex-energy.png',
	'rosetta-resources-inc': 'rosetta-resources.png',
	'sandridge-energy-inc': 'sandridge.png',
	'shell-oil-company': 'shell-oil-.png',
	'slawson-exploration': 'slawson.png',
	'sm-energy-company': 'sm-energy.png',
	'southwestern-energy': 'southwestern-energy.jpg',
	'statoilhydro': 'statoilhydro.png',
	'stone-energy': 'stone-energy.jpg',
	'swift-energy-operating-llc': 'swift-energy.jpg',
	'talisman-energy': 'talisman.png',
	'txco-resources': 'txco.png',
	'ultra-petroleum': 'ultra-petroleum.jpg',
	'unit-corp': 'unit-corp.jpg',
	'vaquero-energy-inc': 'vaquero-energy-inc.jpg',
	'whiting-petroleum': 'whiting-petroleum.png',
	'williams-energy': 'williams-energy.png',
	'xto-energy': 'xto-energy.png',
	'yates-petroleum-corp': 'yates-petroleum-corp.jpg',
	'yuma-exploration-and-production-co-inc': 'yuma.png',
	'chevron': 'chevron.jpg'
};

const pagesDir = path.join(__dirname, '../src/pages');

// Get all company page files
const companyFiles = fs.readdirSync(pagesDir)
	.filter(file => file.endsWith('.astro'))
	.filter(file => {
		const slug = file.replace('.astro', '');
		return logoMap[slug] !== undefined;
	});

console.log(`Found ${companyFiles.length} company pages to fix\n`);

let fixed = 0;
let errors = [];

for (const file of companyFiles) {
	const filePath = path.join(pagesDir, file);
	const slug = file.replace('.astro', '');
	const logoFilename = logoMap[slug];
	const logoPath = `/images/${logoFilename}`;
	
	try {
		let content = fs.readFileSync(filePath, 'utf-8');
		
		// Find the logoPath line and replace it
		const logoPathRegex = /logoPath="([^"]+)"/;
		const match = content.match(logoPathRegex);
		
		if (match) {
			const oldPath = match[1];
			if (oldPath !== logoPath) {
				content = content.replace(logoPathRegex, `logoPath="${logoPath}"`);
				fs.writeFileSync(filePath, content, 'utf-8');
				console.log(`✓ Fixed ${slug}: ${oldPath} → ${logoPath}`);
				fixed++;
			} else {
				console.log(`- ${slug}: already correct`);
			}
		} else {
			console.log(`⚠ ${slug}: logoPath not found`);
			errors.push(slug);
		}
	} catch (error) {
		console.error(`✗ Error fixing ${slug}:`, error.message);
		errors.push(slug);
	}
}

console.log(`\n✅ Fixed ${fixed} logo paths`);
if (errors.length > 0) {
	console.log(`⚠ ${errors.length} files had issues:`, errors.join(', '));
}
