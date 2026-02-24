import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pagesDir = path.join(__dirname, '../src/pages');
const statesDir = path.join(__dirname, '../public/images/states');

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

// Parse HTML content to extract data
function parseStatePage(content) {
	const data = {
		description: '',
		history: '',
		majorFields: [],
		companies: [],
		regulatoryLink: null,
		additionalReading: []
	};

	// Extract all text paragraphs (skip empty ones and links)
	const paragraphs = [];
	const pMatches = content.matchAll(/<p[^>]*>([^<]+)<\/p>/g);
	for (const match of pMatches) {
		const text = match[1].trim();
		if (text && !text.match(/^\s*$/) && !text.includes('http://') && !text.includes('https://') && !text.match(/^\d+$/)) {
			paragraphs.push(text);
		}
	}
	
	if (paragraphs.length > 0) {
		data.description = paragraphs[0];
		if (paragraphs.length > 1) {
			data.history = paragraphs.slice(1).join('\n\n');
		}
	}

	// Extract Major Fields (handle variations like "Top Gas Producing Formations", "Major Oil and Gas Fields", etc.)
	const fieldsPatterns = [
		/Major Oil and Gas Fields[^<]*<\/h2>[\s\S]*?<ul>([\s\S]*?)<\/ul>/,
		/Top Gas Producing Formations[^<]*<\/h2>[\s\S]*?<ul>([\s\S]*?)<\/ul>/,
		/Top Gas Producing Counties[^<]*<\/h2>[\s\S]*?<ul>([\s\S]*?)<\/ul>/,
		/Major Oil and Gas Producing Counties[^<]*<\/h2>[\s\S]*?<ul>([\s\S]*?)<\/ul>/
	];
	
	for (const pattern of fieldsPatterns) {
		const match = content.match(pattern);
		if (match) {
			const fieldsHtml = match[1];
			const fieldMatches = fieldsHtml.matchAll(/<li[^>]*>([^<]+)<\/li>/g);
			for (const fieldMatch of fieldMatches) {
				const field = fieldMatch[1].trim();
				if (field && !data.majorFields.includes(field)) {
					data.majorFields.push(field);
				}
			}
		}
	}

	// Extract Companies
	const companiesMatch = content.match(/Oil and Gas Companies Active[^<]*<\/h2>[\s\S]*?<ul>([\s\S]*?)<\/ul>/);
	if (companiesMatch) {
		const companiesHtml = companiesMatch[1];
		const companyMatches = companiesHtml.matchAll(/<li[^>]*>([^<]+)<\/li>/g);
		for (const match of companyMatches) {
			data.companies.push(match[1].trim());
		}
	}

	// Extract Regulatory Link (handle variations)
	const regPatterns = [
		/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*) Mineral Rights Links[\s\S]*?<a[^>]+href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/,
		/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*) Oil and Gas Board[\s\S]*?<a[^>]+href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/,
		/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*) Oil and Gas Commission[\s\S]*?<a[^>]+href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/
	];
	
	for (const pattern of regPatterns) {
		const match = content.match(pattern);
		if (match) {
			data.regulatoryLink = {
				text: match[3].trim(),
				href: match[2].trim(),
				external: true
			};
			break;
		}
	}

	// Extract Additional Reading
	const addReadingMatch = content.match(/Additional Reading[\s\S]*?<ul>([\s\S]*?)<\/ul>/);
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
	const content = fs.readFileSync(filePath, 'utf-8');
	
	// Extract title and description from frontmatter
	const titleMatch = content.match(/const title = "([^"]+)"/);
	const descMatch = content.match(/const description = "([^"]+)"/);
	
	const title = titleMatch ? titleMatch[1] : `${stateName} Mineral Rights | MineralWise`;
	let metaDescription = descMatch ? descMatch[1] : `Learn about ${stateName} mineral rights, oil and gas production, major fields, and active companies.`;
	
	// Clean up description (remove HTML entities and extra text)
	metaDescription = metaDescription
		.replace(/&amp;/g, '&')
		.replace(/&amp;amp;/g, '&')
		.substring(0, 160);
	
	// Parse content
	const parsed = parseStatePage(content);
	
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

const title = "${title}";
const metaDescription = ${JSON.stringify(metaDescription)};

const stateName = "${stateName}";
const stateAbbr = "${stateAbbr}";
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
	console.log(`✓ Converted ${stateName}`);
}

// Main execution
function main() {
	const files = fs.readdirSync(pagesDir)
		.filter(f => f.endsWith('-mineral-rights.astro') && f !== 'alabama-mineral-rights.astro');
	
	console.log(`Found ${files.length} state pages to convert\n`);
	
	for (const file of files) {
		const filePath = path.join(pagesDir, file);
		const stateName = getStateName(file);
		try {
			convertStatePage(filePath, stateName);
		} catch (error) {
			console.error(`✗ Error converting ${stateName}:`, error.message);
		}
	}
	
	console.log(`\n✓ Converted ${files.length} state pages`);
}

main();
