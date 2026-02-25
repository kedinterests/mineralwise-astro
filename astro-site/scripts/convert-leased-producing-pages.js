import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pagesDir = path.join(__dirname, '../src/pages');

// Pages to convert - extracted from leased-and-producing.astro
const pagesToConvert = [
	{
		slug: 'oil-gas-measurement',
		title: 'Accurate Oil and Gas Measurement: Benefits, Methods, and Industry Standards',
		description: 'Learn how crude oil and natural gas are measured, the importance of accurate measurement for royalties, and the advanced systems like LACT units and orifice meters used in the oil and gas industry.'
	},
	{
		slug: 'oil-and-gas-royalty-statement',
		title: 'How to Read and Understand Your Oil and Gas Royalty Statement – A Complete Guide',
		description: 'Learn how to read your oil and gas royalty statement with this comprehensive guide. Understand key elements like producing property identification, product codes, royalty interest types, taxes, and deductions to manage your mineral rights effectively.'
	},
	{
		slug: 'surface-rights-vs-mineral-rights-in-oil-gas-leasing',
		title: 'Surface Rights vs Mineral Rights in Oil & Gas Leasing',
		description: 'Learn the basic differences between surface and mineral rights.'
	},
	{
		slug: 'oil-and-gas-production-volume-verification',
		title: 'Oil and Gas Production Volume Verification',
		description: 'Short article explaining how oil and gas royalty owners can verify their oil and gas production. Includes links to free state verification'
	},
	{
		slug: 'what-is-fracking',
		title: 'What is Fracking?',
		description: 'Hydraulic Fracturing defined through the eyes of a mineral owner.'
	},
	{
		slug: 'royalty-taxes',
		title: 'Comprehensive Guide to Royalty Taxes for Mineral Rights Owners',
		description: 'Learn about oil and gas royalty taxes such as severance tax, ad valorem tax, federal income tax, and strategies like the depletion allowance and 1031 exchange to maximize your earnings while navigating mineral rights taxation.'
	},
	{
		slug: 'oil-severance-tax',
		title: 'Oil Severance Tax',
		description: 'A detailed explanation of the oil severance tax.'
	},
	{
		slug: 'gas-severance-tax',
		title: 'Gas Severance Tax',
		description: 'A detailed explanation of the gas severance tax.'
	},
	{
		slug: 'ad-valorem-taxes',
		title: 'County Ad Valorem Tax',
		description: 'Learn what it is and how/when it applies.'
	},
	{
		slug: 'depletion-allowance-2',
		title: 'Depletion Allowance',
		description: 'Learn about this royalty tax saving strategy.'
	},
	{
		slug: 'oil-gas-mineral-and-royalty-income-taxes',
		title: 'Oil & Gas Mineral and Royalty Income Taxes',
		description: 'Basic guidance for navigating your federal income taxes.'
	},
	{
		slug: '1031-exchange-for-mineral-rights',
		title: '1031 Exchange for Mineral Rights',
		description: 'Learn what qualifies, how it works, and the benefits of Like-Kind Exchanges which can defer taxes.'
	}
];

function extractContent(htmlContent) {
	let content = htmlContent;
	
	// Extract h1
	const h1Match = content.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
	const h1 = h1Match ? h1Match[1].replace(/<[^>]+>/g, '').trim() : '';
	
	// Get content between h1 and footer section
	const mainContentMatch = content.match(/<h1[^>]*>[\s\S]*?<\/h1>([\s\S]*?)<section id="5476867bb5c0d4e2e43a4df2533e422b/);
	if (!mainContentMatch) return { h1, elements: [], images: [], additionalReading: [] };
	
	const mainContent = mainContentMatch[1];
	
	// Extract paragraphs and headings
	const paraMatches = mainContent.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g);
	const headingMatches = mainContent.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g);
	
	// Combine and sort by position
	const elements = [];
	for (const match of paraMatches) {
		const text = match[1].replace(/<[^>]+>/g, '').trim();
		if (text && text.length > 10) {
			elements.push({ type: 'p', text, pos: match.index });
		}
	}
	for (const match of headingMatches) {
		const text = match[1].replace(/<[^>]+>/g, '').trim();
		if (text) {
			elements.push({ type: 'h2', text, pos: match.index });
		}
	}
	
	// Sort by position
	elements.sort((a, b) => a.pos - b.pos);
	
	// Extract images
	const imgMatches = mainContent.matchAll(/<img[^>]+src="([^"]+)"[^>]*>/g);
	const images = [];
	for (const match of imgMatches) {
		images.push(match[1]);
	}
	
	// Extract additional reading links
	const additionalReading = [];
	const readingMatch = mainContent.match(/<strong[^>]*>Additional Reading<\/strong>[\s\S]*?<ul>([\s\S]*?)<\/ul>/);
	if (readingMatch) {
		const linkMatches = readingMatch[1].matchAll(/<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/g);
		for (const match of linkMatches) {
			let href = match[1];
			href = href.replace(/https?:\/\/www\.mineralwise\.com/, '');
			if (!href.startsWith('/')) href = '/' + href;
			additionalReading.push({
				text: match[2].trim(),
				href
			});
		}
	}
	
	return { h1, elements, images, additionalReading };
}

for (const page of pagesToConvert) {
	const filePath = path.join(pagesDir, `${page.slug}.astro`);
	
	if (!fs.existsSync(filePath)) {
		console.log(`⚠️  Skipping ${page.slug} - file not found`);
		continue;
	}

	const content = fs.readFileSync(filePath, 'utf-8');
	
	// Extract HTML content
	const htmlMatch = content.match(/const content = "([\s\S]*?)";/);
	if (!htmlMatch) {
		console.log(`⚠️  Skipping ${page.slug} - no content found`);
		continue;
	}
	
	const htmlContent = htmlMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
	const extracted = extractContent(htmlContent);
	
	// Build the new content
	let newContent = `---
import BaseLayout from '../layouts/BaseLayout.astro';
import PageShell from '../components/PageShell.astro';
import ArticleContent from '../components/ArticleContent.astro';
import { getBreadcrumbs } from '../data/hierarchy';

const title = "${page.title}";
const description = "${page.description}";
---

<BaseLayout title={title} description={description}>
	<PageShell breadcrumbs={getBreadcrumbs('/${page.slug}')}>
		<ArticleContent>
			<div class="content-page">
				<h1>${extracted.h1 || page.title}</h1>
				
				<div class="content-body">\n`;
	
	// Add images if any
	if (extracted.images.length > 0) {
		newContent += `					<img src="${extracted.images[0]}" alt="" class="content-image" />\n`;
	}
	
	// Add content elements
	for (const elem of extracted.elements) {
		if (elem.type === 'h2') {
			newContent += `					<h2>${elem.text}</h2>\n`;
		} else if (elem.type === 'p') {
			// Clean up the text - remove HTML entities and fix formatting
			let cleanText = elem.text
				.replace(/&amp;/g, '&')
				.replace(/&nbsp;/g, ' ')
				.replace(/\[ad name="[^"]+"\]/g, '')
				.trim();
			
			// Check if it starts with strong (bold)
			const strongMatch = elem.text.match(/<strong[^>]*>([^<]+)<\/strong>\s*-\s*(.+)/);
			if (strongMatch) {
				newContent += `					<p><strong>${strongMatch[1]}</strong> - ${strongMatch[2].replace(/<[^>]+>/g, '').trim()}</p>\n`;
			} else {
				// Check for lists
				if (cleanText.includes('<li>')) {
					const listMatch = elem.text.match(/<ul>([\s\S]*?)<\/ul>/);
					if (listMatch) {
						const items = listMatch[1].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g);
						newContent += `					<ul>\n`;
						for (const item of items) {
							const itemText = item[1].replace(/<[^>]+>/g, '').trim();
							if (itemText) {
								newContent += `						<li>${itemText}</li>\n`;
							}
						}
						newContent += `					</ul>\n`;
						continue;
					}
				}
				newContent += `					<p>${cleanText}</p>\n`;
			}
		}
	}
	
	newContent += `				</div>\n`;
	
	// Add additional reading if exists
	if (extracted.additionalReading.length > 0) {
		newContent += `				<div class="additional-reading">
					<h2>Additional Reading</h2>
					<ul>\n`;
		for (const link of extracted.additionalReading) {
			newContent += `						<li><a href="${link.href}">${link.text}</a></li>\n`;
		}
		newContent += `					</ul>
				</div>\n`;
	}
	
	newContent += `			</div>
		</ArticleContent>
	</PageShell>
</BaseLayout>

<style>
	.content-page {
		background: white;
		border-radius: 15px;
		padding: 2.5rem;
		box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1);
	}

	.content-page h1 {
		font-size: 2.5rem;
		font-weight: 700;
		margin-bottom: 1.5rem;
		color: #1a1a1a;
	}

	.content-body {
		font-size: 1.0625rem;
		line-height: 1.8;
		color: #374151;
	}

	.content-body h2 {
		font-size: 1.75rem;
		font-weight: 700;
		margin-top: 2.5rem;
		margin-bottom: 1rem;
		color: #1a1a1a;
	}

	.content-body h2:first-of-type {
		margin-top: 0;
	}

	.content-body p {
		margin-bottom: 1.25rem;
	}

	.content-body p:last-child {
		margin-bottom: 0;
	}

	.content-body ul {
		margin: 1.25rem 0;
		padding-left: 1.5rem;
	}

	.content-body li {
		margin-bottom: 0.75rem;
	}

	.content-body strong {
		color: #1a1a1a;
		font-weight: 600;
	}

	.content-image {
		width: 100%;
		height: 400px;
		object-fit: cover;
		object-position: center;
		border-radius: 8px;
		margin: 1.5rem 0 2rem 0;
	}

	.additional-reading {
		margin-top: 3rem;
		padding-top: 2rem;
		border-top: 2px solid #e5e7eb;
	}

	.additional-reading h2 {
		font-size: 1.5rem;
		font-weight: 700;
		margin-bottom: 1rem;
		color: #1a1a1a;
	}

	.additional-reading ul {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.additional-reading li {
		font-size: 1.0625rem;
		line-height: 1.7;
		color: #374151;
		margin-bottom: 0.5rem;
	}

	.additional-reading a {
		color: #0ea5e9;
		text-decoration: none;
		transition: color 0.2s ease;
	}

	.additional-reading a:hover {
		color: #0284c7;
		text-decoration: underline;
	}

	@media (max-width: 640px) {
		.content-page {
			padding: 1.5rem;
		}

		.content-page h1 {
			font-size: 2rem;
		}

		.content-body h2 {
			font-size: 1.5rem;
		}

		.content-image {
			height: 250px;
		}
	}
</style>
`;
	
	fs.writeFileSync(filePath, newContent, 'utf-8');
	console.log(`✅ Converted ${page.slug}`);
}

console.log('\n✅ All pages converted!');
