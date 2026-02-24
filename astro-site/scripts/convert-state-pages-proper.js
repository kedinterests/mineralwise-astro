import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pagesDir = path.join(__dirname, '../src/pages');

// State name to abbreviation mapping
const stateAbbrs = {
	'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
	'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
	'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
	'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
	'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO',
	'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
	'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
	'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
	'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
	'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY'
};

// Extract state name from filename
function getStateName(filename) {
	return filename
		.replace('-mineral-rights.astro', '')
		.split('-')
		.map(word => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');
}

// Parse HTML content to extract ALL data
function parseStatePage(content) {
	const data = {
		description: '',
		history: '',
		majorFields: [],
		companies: [],
		regulatoryLink: null,
		additionalReading: []
	};

	// Extract all paragraphs (skip empty ones and links)
	const paragraphs = [];
	const pMatches = content.matchAll(/<p[^>]*>([^<]+)<\/p>/g);
	for (const match of pMatches) {
		const text = match[1].trim();
		// Skip empty, URLs, and very short paragraphs
		if (text && 
			!text.match(/^\s*$/) && 
			!text.match(/^https?:\/\//) && 
			!text.match(/^\d+$/) &&
			text.length > 10) {
			paragraphs.push(text);
		}
	}
	
	if (paragraphs.length > 0) {
		data.description = paragraphs[0];
		if (paragraphs.length > 1) {
			data.history = paragraphs.slice(1).join('\n\n');
		}
	}

	// Extract Major Fields - try multiple patterns (handle <strong> tags in h2)
	const fieldsPatterns = [
		/<h2><strong>Major Oil and Gas Fields[^<]*<\/strong><\/h2>[\s\S]*?<ul>([\s\S]*?)<\/ul>/i,
		/<h2>Major Oil and Gas Fields[^<]*<\/h2>[\s\S]*?<ul>([\s\S]*?)<\/ul>/i,
		/<h2><strong>Top Gas Producing Formations[^<]*<\/strong><\/h2>[\s\S]*?<ul>([\s\S]*?)<\/ul>/i,
		/<h2>Top Gas Producing Formations[^<]*<\/h2>[\s\S]*?<ul>([\s\S]*?)<\/ul>/i,
		/<h2><strong>Top Gas Producing Counties[^<]*<\/strong><\/h2>[\s\S]*?<ul>([\s\S]*?)<\/ul>/i,
		/<h2>Top Gas Producing Counties[^<]*<\/h2>[\s\S]*?<ul>([\s\S]*?)<\/ul>/i,
		/<h2><strong>Major Oil and Gas Producing Counties[^<]*<\/strong><\/h2>[\s\S]*?<ul>([\s\S]*?)<\/ul>/i,
		/<h2>Major Oil and Gas Producing Counties[^<]*<\/h2>[\s\S]*?<ul>([\s\S]*?)<\/ul>/i
	];
	
		for (const pattern of fieldsPatterns) {
			const match = content.match(pattern);
			if (match) {
				const fieldsHtml = match[1];
				// Match list items, handling nested tags like <span> - extract text content
				const fieldMatches = fieldsHtml.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g);
				for (const fieldMatch of fieldMatches) {
					// Remove all HTML tags to get just the text
					const field = fieldMatch[1].replace(/<[^>]+>/g, '').trim();
					if (field && !data.majorFields.includes(field)) {
						data.majorFields.push(field);
					}
				}
				break; // Only use first match
			}
		}

	// Extract Companies (handle <strong> tags in h2 and nested tags like <span>)
	const companiesMatch = content.match(/<h2><strong>Oil and Gas Companies Active[^<]*<\/strong><\/h2>[\s\S]*?<ul>([\s\S]*?)<\/ul>/i) 
		|| content.match(/<h2>Oil and Gas Companies Active[^<]*<\/h2>[\s\S]*?<ul>([\s\S]*?)<\/ul>/i);
	if (companiesMatch) {
		const companiesHtml = companiesMatch[1];
		// Match list items, handling nested tags like <span> - extract text content
		const companyMatches = companiesHtml.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g);
		for (const match of companyMatches) {
			// Remove all HTML tags to get just the text
			const company = match[1].replace(/<[^>]+>/g, '').trim();
			if (company) {
				data.companies.push(company);
			}
		}
	}

	// Extract Regulatory Link - try multiple patterns
	const regPatterns = [
		/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*) Mineral Rights Links[\s\S]*?<p[^>]*>([^<]+):\s*<a[^>]+href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/,
		/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*) Mineral Rights Links[\s\S]*?<p[^>]*>([^<]+):\s*<span[^>]*>([^<]+)<\/span>/,
		/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*) Mineral Rights Links[\s\S]*?<a[^>]+href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/,
		/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*) Oil and Gas Board[\s\S]*?<a[^>]+href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/,
		/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*) Oil and Gas Commission[\s\S]*?<a[^>]+href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/,
		/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*) Oil and Gas Conservation Commission[\s\S]*?<p[^>]*>([^<]+):\s*<span[^>]*>([^<]+)<\/span>/
	];
	
	for (const pattern of regPatterns) {
		const match = content.match(pattern);
		if (match) {
			// Handle different match structures
			let href, text;
			if (match.length === 5 && match[3].match(/^https?:\/\//)) {
				// Pattern: State Links... <p>Label: <a href="url">text</a>
				href = match[3];
				text = match[4] || match[3];
			} else if (match.length === 5 && match[3].match(/^https?:\/\//)) {
				// Pattern: State Links... <p>Label: <span>url</span>
				href = match[3];
				text = match[3];
			} else if (match.length === 4) {
				// Pattern: State Links... <a href="url">text</a>
				href = match[2];
				text = match[3];
			} else {
				continue;
			}
			
			// Skip if it looks like an internal link (starts with /)
			if (href && href.startsWith('http')) {
				data.regulatoryLink = {
					text: text.trim(),
					href: href.trim(),
					external: true
				};
				break;
			}
		}
	}

	// Extract Additional Reading
	const addReadingMatch = content.match(/Additional Reading[\s\S]*?<ul>([\s\S]*?)<\/ul>/i);
	if (addReadingMatch) {
		const readingHtml = addReadingMatch[1];
		const linkMatches = readingHtml.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/g);
		for (const match of linkMatches) {
			const href = match[1].trim();
			const text = match[2].trim();
			if (href && text) {
				const cleanHref = href
					.replace('https://www.mineralwise.com', '')
					.replace('http://www.mineralwise.com', '')
					.replace('https://mineralwise.com', '')
					.replace('http://mineralwise.com', '');
				data.additionalReading.push({
					text: text,
					href: cleanHref,
					external: false
				});
			}
		}
	}

	return data;
}

// Convert state page to new format
function convertStatePage(filePath, stateName) {
	const fileContent = fs.readFileSync(filePath, 'utf-8');
	
	// Extract title and description from frontmatter
	const titleMatch = fileContent.match(/const title = "([^"]+)"/);
	const descMatch = fileContent.match(/const description = "([^"]+)"/);
	
	const title = titleMatch ? titleMatch[1] : `${stateName} Mineral Rights | MineralWise`;
	let metaDescription = descMatch ? descMatch[1] : `Learn about ${stateName} mineral rights, oil and gas production, major fields, and active companies.`;
	
	// Clean up description (remove HTML entities and extra text, limit length)
	metaDescription = metaDescription
		.replace(/&amp;/g, '&')
		.replace(/&amp;amp;/g, '&')
		.substring(0, 160);
	
	// Extract HTML content from const content = "..." (all on one line with escaped newlines)
	// Use eval to properly parse the JavaScript string (safe since we control the input)
	let htmlContent = '';
	
	// Find the line with const content
	const lines = fileContent.split('\n');
	const contentLineIdx = lines.findIndex(l => l.includes('const content ='));
	if (contentLineIdx >= 0) {
		const contentLine = lines[contentLineIdx];
		
		// Extract the string value using eval (safe here since we're parsing our own files)
		try {
			// Create a temporary variable assignment and eval it
			const evalLine = contentLine.replace('const content', 'const tempContent');
			eval(evalLine);
			htmlContent = eval('tempContent');
		} catch (e) {
			// Fallback: manual parsing
			const startIdx = contentLine.indexOf('const content = "') + 'const content = "'.length;
			if (startIdx >= 'const content = "'.length) {
				let endIdx = contentLine.length - 2; // Before the final ";
				let contentStr = '';
				let i = startIdx;
				while (i < endIdx) {
					if (contentLine[i] === '\\' && i + 1 < endIdx) {
						// Handle escape sequences
						if (contentLine[i + 1] === 'n') {
							contentStr += '\n';
							i += 2;
						} else if (contentLine[i + 1] === '"') {
							contentStr += '"';
							i += 2;
						} else if (contentLine[i + 1] === '\\') {
							contentStr += '\\';
							i += 2;
						} else {
							contentStr += contentLine[i];
							i++;
						}
					} else {
						contentStr += contentLine[i];
						i++;
					}
				}
				htmlContent = contentStr;
			}
		}
	}
	
	// Last resort: use whole file
	if (!htmlContent) {
		htmlContent = fileContent;
	}
	
	// Parse content from HTML
	const parsed = parseStatePage(htmlContent);
	
	const stateAbbr = stateAbbrs[stateName] || stateName.substring(0, 2).toUpperCase();
	const slug = stateName.toLowerCase().replace(/\s+/g, '-');
	
	// Build props string
	const props = [
		`stateName={stateName}`,
		`stateAbbr={stateAbbr}`,
		`description={description}`
	];
	
	if (parsed.history) props.push('history={history}');
	if (parsed.stats && parsed.stats.length > 0) props.push('stats={stats}');
	if (parsed.majorFields.length > 0) props.push('majorFields={majorFields}');
	if (parsed.companies.length > 0) props.push('companies={companies}');
	if (parsed.regulatoryLink) props.push('regulatoryLink={regulatoryLink}');
	if (parsed.additionalReading.length > 0) props.push('additionalReading={additionalReading}');
	
	// Build the new page
	const newContent = `---
import BaseLayout from '../layouts/BaseLayout.astro';
import PageShell from '../components/PageShell.astro';
import ArticleContent from '../components/ArticleContent.astro';
import StatePage from '../components/StatePage.astro';
import { getBreadcrumbs } from '../data/hierarchy';

const title = ${JSON.stringify(title)};
const metaDescription = ${JSON.stringify(metaDescription)};

const stateName = ${JSON.stringify(stateName)};
const stateAbbr = ${JSON.stringify(stateAbbr)};
const description = ${JSON.stringify(parsed.description || metaDescription)};
${parsed.history ? `const history = ${JSON.stringify(parsed.history)};` : ''}
${parsed.stats && parsed.stats.length > 0 ? `const stats = ${JSON.stringify(parsed.stats, null, '\t')};` : 'const stats = [];'}
const majorFields = ${JSON.stringify(parsed.majorFields, null, '\t')};
const companies = ${JSON.stringify(parsed.companies, null, '\t')};
${parsed.regulatoryLink ? `const regulatoryLink = ${JSON.stringify(parsed.regulatoryLink, null, '\t')};` : ''}
const additionalReading = ${JSON.stringify(parsed.additionalReading, null, '\t')};
---

<BaseLayout title={title} description={metaDescription}>
	<PageShell breadcrumbs={getBreadcrumbs('/${slug}-mineral-rights')}>
		<ArticleContent>
			<StatePage 
				${props.join('\n\t\t\t\t')}
			/>
		</ArticleContent>
	</PageShell>
</BaseLayout>
`;

	fs.writeFileSync(filePath, newContent, 'utf-8');
	console.log(`✓ Converted ${stateName} (${parsed.majorFields.length} fields, ${parsed.companies.length} companies)`);
}

// Main execution
function main() {
	const files = fs.readdirSync(pagesDir)
		.filter(f => f.endsWith('-mineral-rights.astro') && f !== 'alabama-mineral-rights.astro' && !f.includes('1031-exchange'));
	
	console.log(`Found ${files.length} state pages to convert\n`);
	
	for (const file of files) {
		const filePath = path.join(pagesDir, file);
		const stateName = getStateName(file);
		try {
			convertStatePage(filePath, stateName);
		} catch (error) {
			console.error(`✗ Error converting ${stateName}:`, error.message);
			console.error(error.stack);
		}
	}
	
	console.log(`\n✓ Converted ${files.length} state pages`);
}

main();
