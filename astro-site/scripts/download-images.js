#!/usr/bin/env node

/**
 * Image Download Script
 * Extracts and downloads all images from scraped HTML files
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import http from 'http';
import { createHash } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCRAPED_DIR = path.join(__dirname, '../../scraped');
const IMAGES_DIR = path.join(__dirname, '../public/images');
const IMAGE_MAP_FILE = path.join(__dirname, '../src/data/image-map.json');

// Ensure images directory exists
if (!fs.existsSync(IMAGES_DIR)) {
	fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

// Set to track unique image URLs
const imageUrls = new Set();
const imageMap = {};

/**
 * Extract image URLs from HTML content
 */
function extractImageUrls(htmlContent) {
	const urls = new Set();

	// Extract from <img src="...">
	const imgSrcRegex = /<img[^>]+src=["']([^"']+)["']/gi;
	let match;
	while ((match = imgSrcRegex.exec(htmlContent)) !== null) {
		const url = match[1];
		if (url.startsWith('http')) {
			urls.add(url);
		}
	}

	// Extract from <picture><source srcset="...">
	const srcsetRegex = /srcset=["']([^"']+)["']/gi;
	while ((match = srcsetRegex.exec(htmlContent)) !== null) {
		const srcset = match[1];
		// srcset can contain multiple URLs with descriptors
		const srcsetUrls = srcset.split(',').map(s => s.trim().split(/\s+/)[0]);
		srcsetUrls.forEach(url => {
			if (url.startsWith('http')) {
				urls.add(url);
			}
		});
	}

	// Extract from background-image in inline styles
	const bgImageRegex = /background-image:\s*url\(["']?([^"')]+)["']?\)/gi;
	while ((match = bgImageRegex.exec(htmlContent)) !== null) {
		const url = match[1];
		if (url.startsWith('http')) {
			urls.add(url);
		}
	}

	return urls;
}

/**
 * Download an image from URL
 */
function downloadImage(url) {
	return new Promise((resolve, reject) => {
		// Decode URL entities and clean
		let cleanUrl = url
			.replace(/&amp;/g, '&')
			.replace(/&lt;/g, '<')
			.replace(/&gt;/g, '>')
			.replace(/&quot;/g, '"');
		
		// Remove query parameters and size modifiers for cleaner filenames
		// But keep the original URL for downloading
		const downloadUrl = cleanUrl;
		const urlForFilename = cleanUrl.split('?')[0];
		
		// Generate filename from URL hash or use last part of path
		let urlObj;
		try {
			urlObj = new URL(urlForFilename);
		} catch (e) {
			// If URL parsing fails, use hash
			const hash = createHash('md5').update(downloadUrl).digest('hex');
			const filename = `${hash}.jpg`;
			const filepath = path.join(IMAGES_DIR, filename);
			if (fs.existsSync(filepath)) {
				resolve({ url: downloadUrl, localPath: `/images/${filename}` });
				return;
			}
			// Continue with download using original URL
			urlObj = new URL(downloadUrl);
		}
		
		const pathParts = urlObj.pathname.split('/');
		let filename = pathParts[pathParts.length - 1];
		
		// Decode filename
		try {
			filename = decodeURIComponent(filename);
		} catch (e) {
			// If decoding fails, use as-is
		}
		
		// If filename is empty or doesn't have extension, use hash
		if (!filename || !filename.includes('.')) {
			const hash = createHash('md5').update(downloadUrl).digest('hex');
			const ext = path.extname(urlObj.pathname) || '.jpg';
			filename = `${hash}${ext}`;
		}

		// Sanitize filename
		filename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
		const filepath = path.join(IMAGES_DIR, filename);

		// Skip if already downloaded
		if (fs.existsSync(filepath)) {
			console.log(`✓ Already exists: ${filename}`);
			resolve({ url: cleanUrl, localPath: `/images/${filename}` });
			return;
		}

		const protocol = downloadUrl.startsWith('https') ? https : http;
		
		protocol.get(downloadUrl, (response) => {
			if (response.statusCode === 200) {
				const fileStream = fs.createWriteStream(filepath);
				response.pipe(fileStream);
				fileStream.on('finish', () => {
					fileStream.close();
					console.log(`✓ Downloaded: ${filename}`);
					resolve({ url: cleanUrl, localPath: `/images/${filename}` });
				});
			} else if (response.statusCode === 301 || response.statusCode === 302) {
				// Handle redirects
				const redirectUrl = response.headers.location;
				if (redirectUrl) {
					downloadImage(redirectUrl).then(resolve).catch(reject);
				} else {
					reject(new Error(`Redirect without location: ${downloadUrl}`));
				}
			} else {
				reject(new Error(`Failed to download ${downloadUrl}: ${response.statusCode}`));
			}
		}).on('error', (err) => {
			console.error(`✗ Error downloading ${downloadUrl}:`, err.message);
			reject(err);
		});
	});
}

/**
 * Process all HTML files
 */
async function processHtmlFiles() {
	const files = fs.readdirSync(SCRAPED_DIR).filter(f => f.endsWith('.html'));
	
	console.log(`Processing ${files.length} HTML files...`);

	for (const file of files) {
		const filePath = path.join(SCRAPED_DIR, file);
		const content = fs.readFileSync(filePath, 'utf-8');
		const urls = extractImageUrls(content);
		
		urls.forEach(url => imageUrls.add(url));
	}

	console.log(`Found ${imageUrls.size} unique image URLs`);
}

/**
 * Download all images
 */
async function downloadAllImages() {
	const urls = Array.from(imageUrls);
	console.log(`\nDownloading ${urls.length} images...\n`);

	let successCount = 0;
	let failCount = 0;

	for (const url of urls) {
		try {
			const result = await downloadImage(url);
			// Store both original URL and cleaned URL in map
			imageMap[url] = result.localPath;
			imageMap[result.url] = result.localPath;
			successCount++;
			
			// Add small delay to avoid overwhelming the server
			await new Promise(resolve => setTimeout(resolve, 100));
		} catch (error) {
			console.error(`Failed to download ${url}`);
			failCount++;
		}
	}

	console.log(`\n✓ Successfully downloaded: ${successCount}`);
	console.log(`✗ Failed: ${failCount}`);
}

/**
 * Save image map
 */
function saveImageMap() {
	fs.writeFileSync(
		IMAGE_MAP_FILE,
		JSON.stringify(imageMap, null, 2),
		'utf-8'
	);
	console.log(`\n✓ Image map saved to ${IMAGE_MAP_FILE}`);
}

/**
 * Main execution
 */
async function main() {
	try {
		await processHtmlFiles();
		await downloadAllImages();
		saveImageMap();
		console.log('\n✓ Image download complete!');
	} catch (error) {
		console.error('Error:', error);
		process.exit(1);
	}
}

main();
