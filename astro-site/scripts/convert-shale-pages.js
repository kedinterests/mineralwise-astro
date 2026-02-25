import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pagesDir = path.join(__dirname, '../src/pages');

// Map of shale page slugs to their data
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

function parseShaleContent(content, title, description) {
	// Extract description (first paragraph after h1)
	const descMatch = content.match(/<h1[^>]*>([^<]+)<\/h1>[\s\S]*?<p>([^<]+)<\/p>/);
	let descriptionText = '';
	if (descMatch && descMatch[2]) {
		descriptionText = descMatch[2].trim();
	}

	// Extract companies
	const companiesSection = content.match(/<h2><strong>([^<]+)Companies<\/strong><\/h2>[\s\S]*?<ul>([\s\S]*?)<\/ul>/);
	const companies = [];
	if (companiesSection) {
		const companyMatches = companiesSection[2].matchAll(/<li>([^<]+)<\/li>/g);
		for (const match of companyMatches) {
			const company = match[1].trim().replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ');
			if (company && !company.match(/^<br>$/)) {
				companies.push(company);
			}
		}
	}

	// Extract geology - get everything between Geology h2 and Location h2
	let geology = '';
	const geologyStart = content.indexOf('<h2><strong>');
	if (geologyStart >= 0) {
		const geologySection = content.substring(geologyStart);
		const geologyH2Match = geologySection.match(/<h2><strong>([^<]*Geology[^<]*)<\/strong><\/h2>/);
		if (geologyH2Match) {
			const afterGeologyH2 = geologySection.substring(geologySection.indexOf('</h2>') + 5);
			const locationH2Index = afterGeologyH2.indexOf('<h2><strong>');
			const geologyContent = locationH2Index > 0 ? afterGeologyH2.substring(0, locationH2Index) : afterGeologyH2;
			
			// Extract all paragraphs
			const paraMatches = geologyContent.matchAll(/<p>([\s\S]*?)<\/p>/g);
			const paragraphs = [];
			for (const match of paraMatches) {
				let para = match[1]
					.trim()
					.replace(/&amp;/g, '&')
					.replace(/&nbsp;/g, ' ')
					.replace(/<br>/g, '')
					.replace(/<br\/>/g, '')
					.replace(/<a[^>]*>([^<]*)<\/a>/g, '$1');
				if (para && para.length > 10 && !para.match(/^<br>$/)) {
					paragraphs.push(para);
				}
			}
			geology = paragraphs.join('\n\n');
		}
	}

	// Extract counties
	const locationSection = content.match(/<h2><strong>([^<]+)Location<\/strong><\/h2>[\s\S]*?<ul>([\s\S]*?)<\/ul>/);
	const counties = [];
	if (locationSection) {
		const countyMatches = locationSection[2].matchAll(/<li>([^<]+)<\/li>/g);
		for (const match of countyMatches) {
			const county = match[1].trim().replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ');
			if (county && !county.match(/^<br>$/)) {
				counties.push(county);
			}
		}
	}

	// Extract additional reading
	const readingSection = content.match(/<strong>Additional Reading<\/strong>[\s\S]*?<ul>([\s\S]*?)<\/ul>/);
	const additionalReading = [];
	if (readingSection) {
		const linkMatches = readingSection[1].matchAll(/<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/g);
		for (const match of linkMatches) {
			let href = match[1];
			// Clean up href - remove fragments and fix paths
			href = href.replace(/#.*$/, '').replace(/https?:\/\/www\.mineralwise\.com/, '');
			if (href.includes('/directory/shale-plays/')) {
				href = href.replace('/directory/shale-plays/', '/');
			}
			if (href.includes('/owners-guide/')) {
				href = href.replace('/owners-guide/', '/');
			}
			// Fix common paths
			if (href.includes('oil-and-gas-basics-for-mineral-owners')) {
				href = '/oil-and-gas-basics-for-mineral-owners';
			}
			if (!href.startsWith('/') && !href.startsWith('http')) {
				href = '/' + href;
			}
			const text = match[2].trim().replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ');
			if (text && href) {
				additionalReading.push({
					text,
					href,
					external: href.startsWith('http')
				});
			}
		}
	}

	return {
		description: descriptionText || description.split('.')[0] + '.',
		companies,
		geology,
		counties,
		additionalReading
	};
}

function extractShaleNameAndState(slug) {
	// Patterns: "bakken-shale-montana", "marcellus-shale-pennsylvania", "utica-shale"
	const parts = slug.split('-');
	
	if (parts.length >= 3 && parts[parts.length - 2] === 'shale') {
		// Format: "name-shale-state"
		const state = parts.slice(-1)[0];
		const shaleName = parts.slice(0, -1).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
		return { shaleName, state };
	} else if (parts.length >= 2 && parts[parts.length - 1] === 'shale') {
		// Format: "name-shale"
		const shaleName = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
		return { shaleName, state: null };
	} else {
		// Try to extract state from end
		const stateMap = {
			'texas': 'Texas', 'montana': 'Montana', 'north-dakota': 'North Dakota',
			'pennsylvania': 'Pennsylvania', 'ohio': 'Ohio', 'new-york': 'New York',
			'new-jersey': 'New Jersey', 'maryland': 'Maryland', 'west-virginia': 'West Virginia',
			'arkansas': 'Arkansas', 'louisiana': 'Louisiana', 'oklahoma': 'Oklahoma',
			'colorado-and-wyoming': 'Colorado and Wyoming'
		};
		
		for (const [key, value] of Object.entries(stateMap)) {
			if (slug.endsWith(key)) {
				const shalePart = slug.replace(`-${key}`, '').replace(/-shale$/, '');
				const shaleName = shalePart.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ') + ' Shale';
				return { shaleName, state: value };
			}
		}
		
		// Fallback
		const shaleName = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
		return { shaleName, state: null };
	}
}

// Process each shale page
for (const slug of shalePages) {
	const filePath = path.join(pagesDir, `${slug}.astro`);
	
	if (!fs.existsSync(filePath)) {
		console.log(`⚠️  Skipping ${slug} - file not found`);
		continue;
	}

	const content = fs.readFileSync(filePath, 'utf-8');
	
	// Extract title and description from frontmatter
	const titleMatch = content.match(/const title = "([^"]+)"/);
	const descMatch = content.match(/const description = "([^"]+)"/);
	
	if (!titleMatch) {
		console.log(`⚠️  Skipping ${slug} - no title found`);
		continue;
	}

	const title = titleMatch[1];
	const description = descMatch ? descMatch[1] : '';

	// Extract HTML content
	const htmlMatch = content.match(/const content = "([\s\S]*?)";/);
	if (!htmlMatch) {
		console.log(`⚠️  Skipping ${slug} - no content found`);
		continue;
	}

	const htmlContent = htmlMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
	const parsed = parseShaleContent(htmlContent, title, description);
	const { shaleName, state: rawState } = extractShaleNameAndState(slug);
	// Capitalize state properly
	const state = rawState ? rawState.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') : null;

	// Generate stats if we can extract them
	const stats = [];
	if (parsed.geology.includes('200,000 square miles')) {
		stats.push({ label: 'Area Coverage', value: '200,000 sq mi' });
	}
	if (parsed.geology.includes('4.3 billion')) {
		stats.push({ label: 'Estimated Reserves', value: '4.3B barrels' });
	}

	// Write the new file
	const newContent = `---
import BaseLayout from '../layouts/BaseLayout.astro';
import PageShell from '../components/PageShell.astro';
import ArticleContent from '../components/ArticleContent.astro';
import ShalePlayPage from '../components/ShalePlayPage.astro';
import { getBreadcrumbs } from '../data/hierarchy';

const title = "${title}";
const description = "${description}";

const shaleName = "${shaleName}";
const state = ${state ? `"${state}"` : 'undefined'};
const descriptionText = ${JSON.stringify(parsed.description)};

const companies = ${JSON.stringify(parsed.companies, null, '\t')};

const geology = ${JSON.stringify(parsed.geology)};

const counties = ${JSON.stringify(parsed.counties, null, '\t')};

const stats = ${JSON.stringify(stats, null, '\t')};

const additionalReading = ${JSON.stringify(parsed.additionalReading, null, '\t')};
---

<BaseLayout title={title} description={description}>
	<PageShell breadcrumbs={getBreadcrumbs('/${slug}')}>
		<ArticleContent>
			<ShalePlayPage
				shaleName={shaleName}
				state={state}
				description={descriptionText}
				companies={companies}
				geology={geology}
				counties={counties}
				stats={stats}
				additionalReading={additionalReading}
			/>
		</ArticleContent>
	</PageShell>
</BaseLayout>
`;

	fs.writeFileSync(filePath, newContent, 'utf-8');
	console.log(`✅ Converted ${slug}`);
}

console.log('\n✅ All shale pages converted!');
