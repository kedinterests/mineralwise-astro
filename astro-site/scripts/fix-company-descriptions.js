import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pagesDir = path.join(__dirname, '../src/pages');

// Get all company pages that use CompanyPage component
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.astro'));

let fixedCount = 0;

for (const file of files) {
  const filePath = path.join(pagesDir, file);
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Only process files that use CompanyPage
  if (!content.includes('import CompanyPage')) continue;
  
  // Extract company name and description
  const companyNameMatch = content.match(/companyName="([^"]+)"/);
  const descriptionMatch = content.match(/const companyDescription = `([\s\S]*?)`;/);
  
  if (!companyNameMatch || !descriptionMatch) continue;
  
  const companyName = companyNameMatch[1];
  let description = descriptionMatch[1];
  
  // Check if description starts with company name as a standalone line (duplicate)
  // Only remove if it's on its own line, not if it's part of a sentence
  const trimmedDesc = description.trim();
  let needsFix = false;
  
  // Pattern 1: Company name on its own line followed by \n\n (most common case)
  if (trimmedDesc.startsWith(companyName + '\n\n')) {
    description = description.substring(description.indexOf(companyName) + companyName.length + 2);
    needsFix = true;
  }
  // Pattern 2: Company name on its own line followed by \n (then another line)
  else if (trimmedDesc.startsWith(companyName + '\n') && trimmedDesc[companyName.length + 1] !== '\n') {
    // Check if next line doesn't start with the company name (to avoid removing part of a sentence)
    const afterName = trimmedDesc.substring(companyName.length + 1);
    if (!afterName.trim().toLowerCase().startsWith(companyName.toLowerCase().substring(0, Math.min(5, companyName.length)))) {
      description = description.substring(description.indexOf(companyName) + companyName.length + 1);
      needsFix = true;
    }
  }
  
  if (!needsFix) {
    continue; // No fix needed
  }
  
  fixedCount++;
  
  // Update the file
  const newContent = content.replace(
    /const companyDescription = `[\s\S]*?`;/,
    `const companyDescription = \`${description}\`;`
  );
  
  fs.writeFileSync(filePath, newContent, 'utf-8');
  console.log(`✓ Fixed ${file}`);
}

console.log(`\n✓ Fixed ${fixedCount} files with duplicate company names in descriptions.`);
