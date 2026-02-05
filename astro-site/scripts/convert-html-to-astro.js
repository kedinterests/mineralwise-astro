#!/usr/bin/env node

/**
 * HTML to Astro Conversion Script
 * Converts scraped HTML files to Astro page components
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCRAPED_DIR = path.join(__dirname, '../../scraped');
const PAGES_DIR = path.join(__dirname, '../src/pages');
const IMAGE_MAP_FILE = path.join(__dirname, '../src/data/image-map.json');

// Load image map if it exists
let imageMap = {};
if (fs.existsSync(IMAGE_MAP_FILE)) {
	imageMap = JSON.parse(fs.readFileSync(IMAGE_MAP_FILE, 'utf-8'));
}

/**
 * Clean HTML content - remove Brizy-specific markup and scripts
 */
function cleanHtml(html) {
	// Remove scripts
	html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
	
	// Remove style tags with Brizy classes
	html = html.replace(/<style[^>]*class=["']brz-style["'][^>]*>[\s\S]*?<\/style>/gi, '');
	
	// Remove Brizy-specific classes
	html = html.replace(/\s+class=["'][^"']*brz[^"']*["']/gi, '');
	html = html.replace(/\s+data-brz-custom-id=["'][^"']*["']/gi, '');
	html = html.replace(/\s+data-mmenu-[^=]*=["'][^"']*["']/gi, '');
	
	// Remove inline styles (keep for now, can be cleaned later)
	// html = html.replace(/\s+style=["'][^"']*["']/gi, '');
	
	// Clean up empty divs and spans
	html = html.replace(/<div[^>]*>\s*<\/div>/gi, '');
	html = html.replace(/<span[^>]*>\s*<\/span>/gi, '');
	
	// Remove comments
	html = html.replace(/<!--[\s\S]*?-->/g, '');
	
	return html;
}

/**
 * Extract title from HTML
 */
function extractTitle(html) {
	const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
	return titleMatch ? titleMatch[1].trim() : 'MineralWise';
}

/**
 * Extract meta description from HTML
 */
function extractDescription(html) {
	const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
	return descMatch ? descMatch[1].trim() : 'MineralWise - Leading Mineral Rights Education';
}

/**
 * Extract main content from HTML using regex
 */
function extractContent(html) {
	// Remove head section
	html = html.replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '');
	
	// Remove header section (first section usually)
	html = html.replace(/<section[^>]*class="[^"]*sectionheader[^"]*"[^>]*>[\s\S]*?<\/section>/gi, '');
	
	// Remove scripts and styles
	html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
	html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
	
	// Extract body content
	const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
	if (bodyMatch) {
		html = bodyMatch[1];
	}
	
	// Remove nav elements (we have our own navigation)
	html = html.replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '');
	
	// Remove footer if present
	html = html.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '');
	
	return html.trim();
}

/**
 * Replace image URLs with local paths
 */
function replaceImageUrls(html) {
	let processedHtml = html;
	
	// Replace img src attributes
	processedHtml = processedHtml.replace(
		/<img([^>]+)src=["']([^"']+)["']/gi,
		(match, attrs, src) => {
			const localPath = imageMap[src] || imageMap[src.replace(/&amp;/g, '&')];
			if (localPath) {
				return `<img${attrs}src="${localPath}"`;
			}
			return match;
		}
	);
	
	// Replace picture source srcset
	processedHtml = processedHtml.replace(
		/srcset=["']([^"']+)["']/gi,
		(match, srcset) => {
			const urls = srcset.split(',').map(s => s.trim().split(/\s+/)[0]);
			const newSrcset = urls.map(url => {
				const localPath = imageMap[url] || imageMap[url.replace(/&amp;/g, '&')];
				return localPath ? `${localPath} ${url.split(/\s+/)[1] || ''}`.trim() : url;
			}).join(', ');
			return `srcset="${newSrcset}"`;
		}
	);
	
	return processedHtml;
}

/**
 * Convert internal links to Astro routes
 */
function convertLinks(html) {
	let processedHtml = html;
	
	// Convert relative links
	processedHtml = processedHtml.replace(
		/href=["']([^"']+)["']/gi,
		(match, href) => {
			// Skip external links and anchors
			if (href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto:')) {
				return match;
			}
			
			// Remove .html extension
			if (href.endsWith('.html')) {
				href = href.replace(/\.html$/, '');
			}
			
			// Ensure leading slash
			if (!href.startsWith('/')) {
				href = '/' + href;
			}
			
			return `href="${href}"`;
		}
	);
	
	return processedHtml;
}

/**
 * Generate Astro page from HTML file
 */
function convertHtmlToAstro(htmlFilePath, layoutImport) {
	const htmlContent = fs.readFileSync(htmlFilePath, 'utf-8');
	
	// Extract metadata
	const title = extractTitle(htmlContent);
	const description = extractDescription(htmlContent);
	
	// Extract and clean content
	let content = extractContent(htmlContent);
	content = cleanHtml(content);
	content = replaceImageUrls(content);
	content = convertLinks(content);
	
	// Generate Astro page
	const astroContent = `---
import BaseLayout from '${layoutImport}';
import { Fragment } from 'astro/jsx-runtime';

const title = ${JSON.stringify(title)};
const description = ${JSON.stringify(description)};

const content = ${JSON.stringify(content)};
---

<BaseLayout title={title} description={description}>
	<article class="content-wrapper">
		<div class="content-section">
			<Fragment set:html={content} />
		</div>
	</article>
</BaseLayout>
`;
	
	return astroContent;
}

/**
 * Get output path for Astro page
 */
function getOutputPath(htmlFilePath) {
	const fileName = path.basename(htmlFilePath, '.html');
	
	// Handle index.html -> index.astro
	if (fileName === 'index') {
		return { 
			path: path.join(PAGES_DIR, 'index.astro'),
			layoutImport: '../layouts/BaseLayout.astro'
		};
	}
	
	// Handle special pages
	const specialPages = {
		'about': 'about.astro',
		'contact-us': 'contact-us.astro',
		'advertising': 'advertising.astro',
		'privacy-policy': 'privacy-policy.astro',
		'terms-and-conditions': 'terms-and-conditions.astro',
	};
	
	if (specialPages[fileName]) {
		return { 
			path: path.join(PAGES_DIR, specialPages[fileName]),
			layoutImport: '../layouts/BaseLayout.astro'
		};
	}
	
	// Handle oil-and-gas-terms pages
	if (fileName.startsWith('oil-and-gas-terms-')) {
		const letter = fileName.replace('oil-and-gas-terms-', '');
		const termsDir = path.join(PAGES_DIR, 'oil-and-gas-terms');
		if (!fs.existsSync(termsDir)) {
			fs.mkdirSync(termsDir, { recursive: true });
		}
		return { 
			path: path.join(termsDir, `${letter}.astro`),
			layoutImport: '../../layouts/BaseLayout.astro'
		};
	}
	
	// Default: create in pages root
	return { 
		path: path.join(PAGES_DIR, `${fileName}.astro`),
		layoutImport: '../layouts/BaseLayout.astro'
	};
}

/**
 * Process all HTML files
 */
async function processAllFiles() {
	const files = fs.readdirSync(SCRAPED_DIR).filter(f => f.endsWith('.html'));
	
	console.log(`Converting ${files.length} HTML files to Astro pages...\n`);
	
	let successCount = 0;
	let failCount = 0;
	
	for (const file of files) {
		try {
			const htmlPath = path.join(SCRAPED_DIR, file);
			const outputInfo = getOutputPath(htmlPath);
			const outputPath = typeof outputInfo === 'string' 
				? outputInfo 
				: outputInfo.path;
			const layoutImport = typeof outputInfo === 'string'
				? '../layouts/BaseLayout.astro'
				: outputInfo.layoutImport;
			
			const astroContent = convertHtmlToAstro(htmlPath, layoutImport);
			
			// Ensure directory exists
			const outputDir = path.dirname(outputPath);
			if (!fs.existsSync(outputDir)) {
				fs.mkdirSync(outputDir, { recursive: true });
			}
			
			fs.writeFileSync(outputPath, astroContent, 'utf-8');
			console.log(`✓ Converted: ${file} -> ${path.relative(PAGES_DIR, outputPath)}`);
			successCount++;
		} catch (error) {
			console.error(`✗ Failed to convert ${file}:`, error.message);
			failCount++;
		}
	}
	
	console.log(`\n✓ Successfully converted: ${successCount}`);
	console.log(`✗ Failed: ${failCount}`);
}

/**
 * Main execution
 */
async function main() {
	try {
		// Ensure pages directory exists
		if (!fs.existsSync(PAGES_DIR)) {
			fs.mkdirSync(PAGES_DIR, { recursive: true });
		}
		
		await processAllFiles();
		console.log('\n✓ HTML to Astro conversion complete!');
	} catch (error) {
		console.error('Error:', error);
		process.exit(1);
	}
}

main();
