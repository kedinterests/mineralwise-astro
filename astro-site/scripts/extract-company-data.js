import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

// We'll need to read hierarchy.ts differently since it's TypeScript
// Let's just read the file and parse it manually

// Get all companies from hierarchy
const companies = Object.entries(pageHierarchy)
  .filter(([path, node]) => node.parent === '/oil-and-gas-operators')
  .map(([path, node]) => ({
    path,
    name: node.label,
    slug: path.replace(/^\//, '')
  }));

// Extract logo paths from company pages
const pagesDir = path.join(__dirname, '../src/pages');
const companyData = [];

for (const company of companies) {
  const filePath = path.join(pagesDir, `${company.slug}.astro`);
  
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  Page not found: ${filePath}`);
    continue;
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const logoMatch = content.match(/logoPath="([^"]+)"/);
  
  if (logoMatch) {
    companyData.push({
      path: company.path,
      name: company.name,
      logoPath: logoMatch[1]
    });
  } else {
    console.warn(`⚠️  No logo found for: ${company.name}`);
  }
}

// Sort alphabetically by name
companyData.sort((a, b) => a.name.localeCompare(b.name));

console.log(`Found ${companyData.length} companies with logos`);
console.log(JSON.stringify(companyData, null, 2));
