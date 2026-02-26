#!/usr/bin/env node
/**
 * Migrate individual oil & gas term pages from /term to /oil-and-gas-terms/term
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pagesDir = path.join(__dirname, '../src/pages');
const termsDir = path.join(pagesDir, 'oil-and-gas-terms');

// Get all term slugs from hierarchy (parent: '/oil-and-gas-terms')
const hierarchyPath = path.join(__dirname, '../src/data/hierarchy.ts');
const hierarchyContent = fs.readFileSync(hierarchyPath, 'utf8');
const termSlugs = [];
const regex = /'(\/[^']+)':\s*\{[^}]*parent:\s*'\/oil-and-gas-terms'/g;
let m;
while ((m = regex.exec(hierarchyContent)) !== null) {
  const fullPath = m[1];
  if (fullPath.startsWith('/oil-and-gas-terms/') || fullPath === '/oil-and-gas-abbreviations') continue; // abbreviations stays at root
  termSlugs.push(fullPath.replace(/^\//, ''));
}

console.log(`Found ${termSlugs.length} term pages to migrate`);

let moved = 0;
let skipped = 0;

for (const slug of termSlugs) {
  const srcFile = path.join(pagesDir, `${slug}.astro`);
  const destFile = path.join(termsDir, `${slug}.astro`);

  if (!fs.existsSync(srcFile)) {
    skipped++;
    continue;
  }

  let content = fs.readFileSync(srcFile, 'utf8');

  // Update imports: ../ -> ../../
  content = content.replace(/from '\.\.\//g, "from '../../");
  content = content.replace(/from "\.\.\//g, 'from "../../');

  // Update path="/slug" to path="/oil-and-gas-terms/slug"
  content = content.replace(/path="\/[^"]+"/g, (match) => {
    const p = match.match(/path="([^"]+)"/)[1];
    if (p.startsWith('/oil-and-gas-terms/')) return match;
    return `path="/oil-and-gas-terms${p}"`;
  });

  // Update prevTerm/nextTerm hrefs: "/slug" -> "/oil-and-gas-terms/slug"
  content = content.replace(/href: "(\/[^"]+)"/g, (match, href) => {
    if (href.startsWith('/oil-and-gas-terms') || href.startsWith('#')) return match;
    return `href: "/oil-and-gas-terms${href}"`;
  });

  fs.writeFileSync(destFile, content);
  fs.unlinkSync(srcFile);
  moved++;
}

console.log(`Moved ${moved} files, skipped ${skipped} (not found)`);
