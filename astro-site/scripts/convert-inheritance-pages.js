import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pagesDir = path.join(__dirname, '../src/pages');
const pagesToConvert = [
	'mineral-rights-inheritance.astro',
	'unclaimed-oil-and-gas-royalty.astro',
	'division-order-2.astro'
];

function extractContent(html) {
	const content = {
		h1: null,
		image: null,
		paragraphs: [],
		headings: [],
		lists: [],
		additionalReading: []
	};

	// Extract H1
	const h1Match = html.match(/<h1[^>]*>.*?<span[^>]*>(.*?)<\/span><\/h1>/s);
	if (h1Match) {
		content.h1 = h1Match[1].trim();
	}

	// Extract image
	const imgMatch = html.match(/<img[^>]*src=["']([^"']+)["'][^>]*>/);
	if (imgMatch) {
		content.image = imgMatch[1];
	}

	// Extract paragraphs (skip those that are headings)
	const pMatches = [...html.matchAll(/<p[^>]*>(.*?)<\/p>/gs)];
	for (const match of pMatches) {
		const pText = match[1].replace(/<[^>]+>/g, '').trim();
		if (pText && !pText.match(/^(Mineral Rights Fragmentation|Do I Own Mineral Rights|Landman|I've Just Received|Additional Reading)$/i)) {
			// Check if it's a heading-style paragraph
			if (pText.length < 100 && !pText.includes('.') && pText.match(/^[A-Z][a-z]+/)) {
				content.headings.push(pText);
			} else {
				content.paragraphs.push(pText);
			}
		}
	}

	// Extract headings that are in paragraphs
	const headingPatterns = [
		/Mineral Rights Fragmentation/,
		/Do I Own Mineral Rights on Inherited Property\?/,
		/Landman – Who's That\?/,
		/I've Just Received a Lease in the Mail/
	];

	for (const pattern of headingPatterns) {
		const match = html.match(new RegExp(`<p[^>]*>.*?<span[^>]*>(${pattern.source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})</span>`, 's'));
		if (match) {
			content.headings.push(match[1].trim());
		}
	}

	// Extract lists
	const ulMatches = [...html.matchAll(/<ul>(.*?)<\/ul>/gs)];
	for (const match of ulMatches) {
		const listItems = [];
		const liMatches = [...match[1].matchAll(/<li[^>]*>(.*?)<\/li>/gs)];
		for (const liMatch of liMatches) {
			const liText = liMatch[1].replace(/<[^>]+>/g, '').trim();
			if (liText) {
				listItems.push(liText);
			}
		}
		if (listItems.length > 0) {
			content.lists.push(listItems);
		}
	}

	// Extract additional reading links
	const additionalReadingMatch = html.match(/Additional Reading.*?<ul>(.*?)<\/ul>/s);
	if (additionalReadingMatch) {
		const linkMatches = [...additionalReadingMatch[1].matchAll(/<a[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gs)];
		for (const linkMatch of linkMatches) {
			const href = linkMatch[1].replace(/^\/+/, '/');
			const text = linkMatch[2].replace(/<[^>]+>/g, '').trim();
			const descMatch = linkMatch[0].match(/<span[^>]*>(.*?)<\/span>/);
			const description = descMatch ? descMatch[1].trim() : '';
			content.additionalReading.push({ href, text, description });
		}
	}

	return content;
}

function generateAstroFile(pageName, content) {
	const pagePath = pageName.replace('.astro', '');
	const title = content.h1 || pageName.replace('.astro', '').replace(/-/g, ' ');
	const description = content.paragraphs[0]?.substring(0, 160) || `Learn about ${title}`;

	return `---
import BaseLayout from '../layouts/BaseLayout.astro';
import PageShell from '../components/PageShell.astro';
import ArticleContent from '../components/ArticleContent.astro';
import { getBreadcrumbs } from '../data/hierarchy';

const title = "${title}";
const description = "${description.replace(/"/g, '&quot;')}";
---

<BaseLayout title={title} description={description}>
	<PageShell breadcrumbs={getBreadcrumbs('${pagePath}')}>
		<ArticleContent>
			<div class="content-page">
				<h1>${content.h1 || title}</h1>
				
				<div class="content-body">
					${content.image ? `<img src="${content.image}" alt="" class="content-image" />` : ''}
					${content.paragraphs.map(p => `<p>${p}</p>`).join('\n\t\t\t\t\t')}
					${content.headings.map((h, i) => {
						const headingIndex = content.paragraphs.findIndex((p, idx) => {
							// Find the paragraph that comes after this heading in the original content
							return idx > 0 && content.paragraphs[idx - 1]?.includes(h.substring(0, 20));
						});
						return `<h2>${h}</h2>`;
					}).join('\n\t\t\t\t\t')}
					${content.lists.map(list => 
						`<ul>\n\t\t\t\t\t\t${list.map(item => `<li>${item}</li>`).join('\n\t\t\t\t\t\t')}\n\t\t\t\t\t</ul>`
					).join('\n\t\t\t\t\t')}
				</div>
				${content.additionalReading.length > 0 ? `
				<div class="additional-reading">
					<h2>Additional Reading</h2>
					<ul>
						${content.additionalReading.map(link => 
							`<li><a href="${link.href}">${link.text}</a>${link.description ? ` - ${link.description}` : ''}</li>`
						).join('\n\t\t\t\t\t\t')}
					</ul>
				</div>
				` : ''}
			</div>
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
}

// Convert each page
for (const pageName of pagesToConvert) {
	const filePath = path.join(pagesDir, pageName);
	
	if (!fs.existsSync(filePath)) {
		console.log(`Skipping ${pageName} - file not found`);
		continue;
	}

	const fileContent = fs.readFileSync(filePath, 'utf-8');
	
	// Extract content from Fragment set:html
	const contentMatch = fileContent.match(/const content = "([^"]+)"/s);
	if (!contentMatch) {
		console.log(`Skipping ${pageName} - no content found`);
		continue;
	}

	const htmlContent = contentMatch[1].replace(/\\n/g, '\n');
	const content = extractContent(htmlContent);
	
	const newContent = generateAstroFile(pageName, content);
	
	fs.writeFileSync(filePath, newContent, 'utf-8');
	console.log(`Converted ${pageName}`);
}

console.log('Done!');
