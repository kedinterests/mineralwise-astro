import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pagesDir = path.join(__dirname, '../src/pages');

function stripSectionByIdPrefix(html, idPrefix) {
	const sectionStart = `<section id=\"${idPrefix}`;
	let start = html.indexOf(sectionStart);

	while (start !== -1) {
		const nextSection = html.indexOf('<section', start + sectionStart.length);
		if (nextSection === -1) {
			html = html.slice(0, start);
			break;
		}
		html = html.slice(0, start) + html.slice(nextSection);
		start = html.indexOf(sectionStart);
	}

	return html;
}

function cleanLegacyContent(content) {
	let html = content;

	// Remove duplicate footer section injected from legacy export
	html = stripSectionByIdPrefix(html, '5476867bb5c0d4e2e43a4df2533e422b');

	// Remove close-menu artifact
	html = html.replace(/<div><a href=\"#mm-0\"><span>Close menu<\/span><\/a><\/div>/gi, '');

	// Remove nested legacy menu/ad injection blocks that can appear mid-content
	let nestedStart = html.indexOf('<div id="mm-0">', 1);
	while (nestedStart !== -1) {
		const recaptchaEnd = html.indexOf('</iframe>', nestedStart);
		if (recaptchaEnd === -1) break;
		html = html.slice(0, nestedStart) + html.slice(recaptchaEnd + '</iframe>'.length);
		nestedStart = html.indexOf('<div id="mm-0">', 1);
	}

	// Remove ads/recaptcha cruft
	html = html.replace(/<ins class=\"adsbygoogle[\s\S]*?<\/ins>/gi, '');
	html = html.replace(/<iframe[^>]*recaptcha[^>]*><\/iframe>/gi, '');

	// Remove common Brizy attributes
	html = html.replace(/\sdata-brz-translate-text=\"[^\"]*\"/gi, '');
	html = html.replace(/\sdata-generated-css=\"brz-css-[^\"]*\"/gi, '');
	html = html.replace(/\sdata-uniq-id=\"[^\"]*\"/gi, '');
	html = html.replace(/\sdata-brz-link-type=\"[^\"]*\"/gi, '');

	// Remove Brizy color styles specifically
	html = html.replace(/\sstyle=\"[^\"]*var\(--brz-global-color[^\"]*\"/gi, '');

	// Remove empty ids and legacy root id
	html = html.replace(/\sid=\"\"/gi, '');
	html = html.replace(/<div id=\"mm-0\">/gi, '<div>');

	// Repair known numeric glitches caused by legacy ad/embed fragments
	html = html.replace(/\$5\s*-\s*0\s*per acre/gi, '$5 - $10 per acre');
	html = html.replace(/from\s*00\s*-\s*\$5000/gi, 'from $100 - $5000');
	html = html.replace(/payment of\s*0,000/gi, 'payment of $10,000');

	// Collapse known recursive mid-sentence legacy injections
	html = html.replace(
		/in return for a lump sum payment of[\s\S]*?0,000\.&nbsp;When and if the well does produce/gi,
		'in return for a lump sum payment of $10,000.&nbsp;When and if the well does produce'
	);
	html = html.replace(
		/Bonus amounts were often \$5\s*-\s*[\s\S]*?0 per acre per year/gi,
		'Bonus amounts were often $5 - $10 per acre per year'
	);
	html = html.replace(
		/range anywhere from[\s\S]*?00\s*-\s*\$5000 per acre/gi,
		'range anywhere from $100 - $5000 per acre'
	);

	// Tidy obvious empty wrappers/spacing
	html = html.replace(/<p><br><\/p>/gi, '');
	html = html.replace(/\n\s*\n\s*\n/g, '\n\n');

	return html.trim();
}

function processAstroFile(filePath) {
	const source = fs.readFileSync(filePath, 'utf-8');
	const contentPattern = /const content = "((?:\\.|[^"\\])*)";/s;
	const match = source.match(contentPattern);
	if (!match) return false;

	let content;
	try {
		content = JSON.parse(`"${match[1]}"`);
	} catch {
		return false;
	}

	const cleaned = cleanLegacyContent(content);
	if (cleaned === content) return false;

	const replacement = `const content = ${JSON.stringify(cleaned)};`;
	const updated = source.replace(contentPattern, () => replacement);
	fs.writeFileSync(filePath, updated, 'utf-8');
	return true;
}

function walk(dir) {
	const entries = fs.readdirSync(dir, { withFileTypes: true });
	let files = [];
	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			files = files.concat(walk(fullPath));
		} else if (entry.isFile() && fullPath.endsWith('.astro')) {
			files.push(fullPath);
		}
	}
	return files;
}

const allAstroFiles = walk(pagesDir);
let changed = 0;

for (const filePath of allAstroFiles) {
	if (processAstroFile(filePath)) {
		changed += 1;
		console.log(`Updated ${path.relative(pagesDir, filePath)}`);
	}
}

console.log(`\nDone. Updated ${changed} page files.`);
