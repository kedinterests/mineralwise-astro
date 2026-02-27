#!/usr/bin/env node
/**
 * Optimize hero image: generate WebP at responsive sizes for Lighthouse/performance.
 * Run: node scripts/optimize-hero.js
 */
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '../public/images');
const srcPath = path.join(publicDir, 'hero.png');

if (!fs.existsSync(srcPath)) {
	console.error('hero.png not found in public/images/');
	process.exit(1);
}

const sizes = [
	{ width: 480, suffix: '-480', quality: 80 },
	{ width: 768, suffix: '-768', quality: 82 },
	{ width: 1200, suffix: '-1200', quality: 85 },
	{ width: 1536, suffix: '', quality: 85 },
];

async function optimize() {
	for (const { width, suffix, quality } of sizes) {
		const outPath = path.join(publicDir, `hero${suffix}.webp`);
		await sharp(srcPath)
			.resize(width, null, { withoutEnlargement: true })
			.webp({ quality })
			.toFile(outPath);
		const stats = fs.statSync(outPath);
		console.log(`Created hero${suffix}.webp (${width}px) - ${(stats.size / 1024).toFixed(1)} KB`);
	}
	console.log('Done.');
}

optimize().catch((err) => {
	console.error(err);
	process.exit(1);
});
