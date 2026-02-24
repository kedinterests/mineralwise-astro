#!/usr/bin/env node

/**
 * Script to convert all term pages to use the TermPage component
 * 
 * 1. Extracts all term links from all-oil-and-gas-terms.astro
 * 2. Parses each term page to extract: term name, definition, prev/next links
 * 3. Converts each page to use TermPage component
 * 4. Adds all terms to hierarchy.ts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PAGES_DIR = path.join(__dirname, '../src/pages');
const HIERARCHY_FILE = path.join(__dirname, '../src/data/hierarchy.ts');
const ALL_TERMS_FILE = path.join(PAGES_DIR, 'all-oil-and-gas-terms.astro');

/**
 * Extract all term links from all-oil-and-gas-terms.astro
 */
function extractTermLinks() {
	const content = fs.readFileSync(ALL_TERMS_FILE, 'utf-8');
	const termLinks = new Set();
	
	// Extract the content string (between quotes)
	const contentMatch = content.match(/const content = "([\s\S]*?)";/);
	if (!contentMatch) {
		console.error('Could not find content string');
		return [];
	}
	
	const htmlContent = contentMatch[1];
	
	// Match href=\"/term-slug\" patterns (escaped quotes in string literal)
	const linkRegex = /href=\\"\/([^\\"]+)\\"/g;
	let match;
	
	while ((match = linkRegex.exec(htmlContent)) !== null) {
		const href = match[1];
		// Skip non-term pages, anchors, and special pages
		if (
			href === 'all-oil-and-gas-terms' ||
			href === 'terms-and-conditions' ||
			href === 'privacy-policy' ||
			href.startsWith('terms-') ||
			href.startsWith('oil-and-gas-terms/') ||
			href.startsWith('#') ||
			href.includes('http') ||
			href === 'top' ||
			href === '' ||
			href.includes('images/')
		) {
			continue;
		}
		termLinks.add(href);
	}
	
	return Array.from(termLinks).sort();
}

/**
 * Extract term names and labels from all-oil-and-gas-terms page
 */
function extractTermNamesWithLabels() {
	const content = fs.readFileSync(ALL_TERMS_FILE, 'utf-8');
	const contentMatch = content.match(/const content = "([\s\S]*?)";/);
	if (!contentMatch) return new Map();
	
	const htmlContent = contentMatch[1];
	const termMap = new Map();
	
	// Match href=\"/term-slug\"...>Term Label</a> patterns
	const linkRegex = /href=\\"\/([^\\"]+)\\"[\s\S]*?>([^<]+)<\/a>/g;
	let match;
	
	while ((match = linkRegex.exec(htmlContent)) !== null) {
		const slug = match[1];
		const label = match[2].trim();
		
		// Skip non-term pages, anchors, and navigation links
		if (
			slug === 'all-oil-and-gas-terms' ||
			slug === 'terms-and-conditions' ||
			slug === 'privacy-policy' ||
			slug.startsWith('terms-') ||
			slug.startsWith('#') ||
			slug.includes('http') ||
			slug === 'top' ||
			slug === '' ||
			slug.includes('images/') ||
			label.toLowerCase().includes('back to top') ||
			label.includes('^') ||
			label.toLowerCase().includes('close menu')
		) {
			continue;
		}
		
		termMap.set(`/${slug}`, label);
	}
	
	return termMap;
}

/**
 * Parse a term page to extract term name, definition, and prev/next links
 */
function parseTermPage(filePath, termSlugs, termLabels) {
	const content = fs.readFileSync(filePath, 'utf-8');
	
	// Extract title and description from frontmatter
	const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
	if (!frontmatterMatch) return null;
	
	const frontmatter = frontmatterMatch[1];
	const titleMatch = frontmatter.match(/const title = "([^"]+)"/);
	const descMatch = frontmatter.match(/const description = "([^"]+)"/);
	
	if (!titleMatch || !descMatch) return null;
	
	const title = titleMatch[1].replace(' | MineralWise', '');
	const description = descMatch[1];
	
	// Extract path from filename
	const fileName = path.basename(filePath, '.astro');
	const pagePath = `/${fileName}`;
	
	// Check if already converted (has TermPage import)
	const isConverted = content.includes('TermPage');
	
	let termName, definition, prevTerm, nextTerm;
	
	if (isConverted) {
		// Extract from TermPage props
		const termMatch = content.match(/term="([^"]+)"/);
		const defMatch = content.match(/definition="([^"]+)"/);
		termName = termMatch ? termMatch[1] : title;
		definition = defMatch ? defMatch[1] : description;
	} else {
		// Extract from HTML content
		const contentMatch = content.match(/const content = "([\s\S]*?)";/);
		if (!contentMatch) return null;
		
		const htmlContent = contentMatch[1];
		
		// Extract term name - look for <p>Term Name</p> after "Oil & Gas Terms"
		const termNameMatch = htmlContent.match(/Oil &amp; Gas Terms[\s\S]*?<p>([^<]+)<\/p>/);
		termName = termNameMatch ? termNameMatch[1].trim() : title;
		
		// Extract definition - first paragraph after term name
		const defMatch = htmlContent.match(/<p><\/p><p>([^<]+)<\/p>/);
		definition = defMatch ? defMatch[1].trim() : description;
		
		// Clean up definition
		if (definition.includes('This glossary')) {
			definition = definition.split('This glossary')[0].trim();
		}
		if (definition.includes('If you would like to discuss')) {
			definition = definition.split('If you would like to discuss')[0].trim();
		}
		
		// Extract previous term from HTML
		const prevMatch = htmlContent.match(/Previous Term[\s\S]*?href=\\"\/([^\\"]+)\\"[\s\S]*?<p>([^<]+)<\/p>/);
		if (prevMatch) {
			prevTerm = {
				href: `/${prevMatch[1]}`,
				label: prevMatch[2].trim()
			};
		}
		
		// Extract next term from HTML
		const nextMatch = htmlContent.match(/Next Term[\s\S]*?href=\\"\/([^\\"]+)\\"[\s\S]*?<p>([^<]+)<\/p>/);
		if (nextMatch) {
			nextTerm = {
				href: `/${nextMatch[1]}`,
				label: nextMatch[2].trim()
			};
		}
	}
	
	// Helper function to get a valid label, falling back to generated label if invalid
	function getValidLabel(slug) {
		const label = termLabels.get(`/${slug}`);
		// Validate label - reject navigation links
		if (label && 
			!label.toLowerCase().includes('back to top') && 
			!label.includes('^') &&
			!label.toLowerCase().includes('close menu')) {
			return label;
		}
		// Fall back to generating label from slug
		return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
	}
	
	// If prev/next not found, build from term list order
	if (!prevTerm || !nextTerm) {
		const currentIndex = termSlugs.indexOf(fileName);
		if (currentIndex !== -1) {
			if (!prevTerm && currentIndex > 0) {
				const prevSlug = termSlugs[currentIndex - 1];
				prevTerm = {
					href: `/${prevSlug}`,
					label: getValidLabel(prevSlug)
				};
			}
			if (!nextTerm && currentIndex < termSlugs.length - 1) {
				const nextSlug = termSlugs[currentIndex + 1];
				nextTerm = {
					href: `/${nextSlug}`,
					label: getValidLabel(nextSlug)
				};
			}
		}
	}
	
	// Also validate labels extracted from HTML
	if (prevTerm && (prevTerm.label.toLowerCase().includes('back to top') || prevTerm.label.includes('^'))) {
		// Rebuild from term list
		const currentIndex = termSlugs.indexOf(fileName);
		if (currentIndex > 0) {
			const prevSlug = termSlugs[currentIndex - 1];
			prevTerm = {
				href: `/${prevSlug}`,
				label: getValidLabel(prevSlug)
			};
		} else {
			prevTerm = null;
		}
	}
	
	if (nextTerm && (nextTerm.label.toLowerCase().includes('back to top') || nextTerm.label.includes('^'))) {
		// Rebuild from term list
		const currentIndex = termSlugs.indexOf(fileName);
		if (currentIndex < termSlugs.length - 1) {
			const nextSlug = termSlugs[currentIndex + 1];
			nextTerm = {
				href: `/${nextSlug}`,
				label: getValidLabel(nextSlug)
			};
		} else {
			nextTerm = null;
		}
	}
	
	return {
		path: pagePath,
		term: termName,
		definition: definition || description,
		title: title,
		description: description,
		prevTerm,
		nextTerm
	};
}

/**
 * Convert a term page to use TermPage component
 */
function convertTermPage(filePath, termData) {
	const { term, definition, title, description, path: pagePath, prevTerm, nextTerm } = termData;
	
	const props = [
		`term="${term.replace(/"/g, '\\"')}"`,
		`definition="${definition.replace(/"/g, '\\"')}"`,
		`path="${pagePath}"`
	];
	
	if (prevTerm) {
		props.push(`prevTerm={{ href: "${prevTerm.href}", label: "${prevTerm.label.replace(/"/g, '\\"')}" }}`);
	}
	if (nextTerm) {
		props.push(`nextTerm={{ href: "${nextTerm.href}", label: "${nextTerm.label.replace(/"/g, '\\"')}" }}`);
	}
	
	const newContent = `---
import BaseLayout from '../layouts/BaseLayout.astro';
import TermPage from '../components/TermPage.astro';

const title = "${title}";
const description = "${description.replace(/"/g, '\\"')}";
---

<BaseLayout title={title} description={description}>
	<TermPage
		${props.join('\n\t\t')}
	/>
</BaseLayout>
`;
	
	fs.writeFileSync(filePath, newContent, 'utf-8');
	console.log(`✓ Converted ${path.basename(filePath)}`);
}

/**
 * Add all terms to hierarchy.ts
 */
function updateHierarchy(termPaths) {
	let hierarchyContent = fs.readFileSync(HIERARCHY_FILE, 'utf-8');
	
	// Extract existing hierarchy entries
	const hierarchyMatch = hierarchyContent.match(/export const pageHierarchy: Record<string, PageNode> = \{([\s\S]*?)\};/);
	if (!hierarchyMatch) {
		console.error('Could not find pageHierarchy in hierarchy.ts');
		return;
	}
	
	const existingEntries = hierarchyMatch[1];
	
	// Parse existing entries to avoid duplicates
	const existingPaths = new Set();
	const existingEntriesMatch = existingEntries.match(/'([^']+)':/g);
	if (existingEntriesMatch) {
		existingEntriesMatch.forEach(match => {
			const path = match.match(/'([^']+)'/)[1];
			existingPaths.add(path);
		});
	}
	
	// Generate term name from path
	function getTermLabel(path) {
		// Remove leading slash
		const slug = path.replace(/^\//, '');
		// Convert slug to title case
		return slug
			.split('-')
			.map(word => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');
	}
	
	// Build new entries for terms not already in hierarchy
	const newEntries = [];
	termPaths.forEach(termPath => {
		if (!existingPaths.has(termPath)) {
			const label = getTermLabel(termPath);
			newEntries.push(`\t'${termPath}': { label: '${label}', parent: '/all-oil-and-gas-terms' },`);
		}
	});
	
	if (newEntries.length === 0) {
		console.log('All terms already in hierarchy.ts');
		return;
	}
	
	// Insert new entries before the closing brace
	const newHierarchyContent = hierarchyContent.replace(
		/(export const pageHierarchy: Record<string, PageNode> = \{[\s\S]*?)(\n\};)/,
		`$1${newEntries.join('\n')}$2`
	);
	
	fs.writeFileSync(HIERARCHY_FILE, newHierarchyContent, 'utf-8');
	console.log(`✓ Added ${newEntries.length} terms to hierarchy.ts`);
}

/**
 * Main function
 */
function main() {
	console.log('Extracting term links from all-oil-and-gas-terms.astro...');
	const termSlugs = extractTermLinks();
	const termLabels = extractTermNamesWithLabels();
	console.log(`Found ${termSlugs.length} term pages\n`);
	
	const converted = [];
	const skipped = [];
	const errors = [];
	
	for (const slug of termSlugs) {
		const filePath = path.join(PAGES_DIR, `${slug}.astro`);
		
		if (!fs.existsSync(filePath)) {
			skipped.push(slug);
			console.log(`⚠ Skipped ${slug} (file not found)`);
			continue;
		}
		
		try {
			const termData = parseTermPage(filePath, termSlugs, termLabels);
			if (!termData) {
				skipped.push(slug);
				console.log(`⚠ Skipped ${slug} (could not parse)`);
				continue;
			}
			
			convertTermPage(filePath, termData);
			converted.push(termData.path);
		} catch (error) {
			errors.push({ slug, error: error.message });
			console.error(`✗ Error converting ${slug}: ${error.message}`);
		}
	}
	
	console.log(`\n✓ Converted ${converted.length} pages`);
	if (skipped.length > 0) {
		console.log(`⚠ Skipped ${skipped.length} pages`);
	}
	if (errors.length > 0) {
		console.log(`✗ Errors: ${errors.length}`);
	}
	
	// Update hierarchy.ts
	console.log('\nUpdating hierarchy.ts...');
	updateHierarchy(converted.map(p => p));
	
	console.log('\nDone!');
}

main();
