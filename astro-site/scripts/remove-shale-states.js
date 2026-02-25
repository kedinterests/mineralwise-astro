import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pagesDir = path.join(__dirname, '../src/pages');

const shalePages = [
	'bakken-shale-north-dakota',
	'bakken-shale-montana',
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

for (const slug of shalePages) {
	const filePath = path.join(pagesDir, `${slug}.astro`);
	
	if (!fs.existsSync(filePath)) {
		console.log(`⚠️  Skipping ${slug} - file not found`);
		continue;
	}

	let content = fs.readFileSync(filePath, 'utf-8');
	
	// Remove state line - replace with undefined
	content = content.replace(/const state = (?:undefined|"[^"]+");/, 'const state = undefined;');
	
	fs.writeFileSync(filePath, content, 'utf-8');
	console.log(`✅ Removed state from ${slug}`);
}

console.log('\n✅ All states removed from shale pages!');
