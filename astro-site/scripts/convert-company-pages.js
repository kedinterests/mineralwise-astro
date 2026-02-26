import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// List of already converted pages
const convertedPages = [
  'aera-energy-llc',
  'anadarko-petroleum',
  'berry-petroleum-company',
  'chesapeake-energy',
  'devon-energy',
  'marathon-oil-company',
  'shell-oil-company',
  'sm-energy-company'
];

// Company page files to convert (excluding already converted and non-company pages)
const companyPagePatterns = [
  'anschutz-exploration-corp',
  'apache-corporation',
  'atlas-energy-resources',
  'bill-barrett-corporation',
  'bp',
  'breitburn-energy-partners',
  'cabot-oil-and-gas-corporation',
  'callon-petroleum-company',
  'carrizo-oil-and-gas',
  'chevron',
  'chief-oil-and-gas',
  'cimarex-energy',
  'citation-oil-and-gas-corp',
  'clayton-williams-energy-inc',
  'cnx-gas-corp',
  'common-resources-llc',
  'comstock-resources',
  'concho-resources-inc',
  'conocophillips',
  'continental-resources',
  'crimson-resource-management',
  'crown-energy-company',
  'cubic-energy',
  'denbury-resources',
  'dominion-resources-inc',
  'east-resources',
  'el-paso-exploration-and-production',
  'encana-corporation',
  'energen-corp',
  'energulf-resources-inc',
  'enervest',
  'eog-resources-inc',
  'eqt-corporation',
  'hess-corporation',
  'hilcorp-energy-co',
  'hunt-oil',
  'j-w-operating-co-cohort-energy',
  'jm-huber-corp',
  'kodiak-oil-and-gas-corp',
  'mariner-energy-inc',
  'merit-energy',
  'milagro-exploration',
  'murex-petroleum',
  'murphy-oil-corp',
  'newfield-exploration-company',
  'noble-energy',
  'occidental-petroleum-corporation',
  'petro-hunt-llc',
  'petrohawk-energy-corporation',
  'petroleum-development-corp',
  'petroquest-energy',
  'pioneer-natural-resources',
  'plains-exploration-and-production-co',
  'questar-corporation',
  'quicksilver-resources',
  'range-resources',
  'rex-energy-corporation',
  'rosetta-resources-inc',
  'sandridge-energy-inc',
  'slawson-exploration',
  'southwestern-energy',
  'statoilhydro',
  'stone-energy',
  'swift-energy-operating-llc',
  'talisman-energy',
  'txco-resources',
  'ultra-petroleum',
  'unit-corp',
  'vaquero-energy-inc',
  'whiting-petroleum',
  'williams-energy',
  'xto-energy',
  'yates-petroleum-corp',
  'yuma-exploration-and-production-co-inc'
];

function extractCompanyInfo(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Extract title
  const titleMatch = content.match(/const title = "([^"]+)"/);
  if (!titleMatch) return null;
  const title = titleMatch[1];
  const companyName = title.replace(' | MineralWise', '').replace(/&amp;/g, '&').replace(/&amp;/g, '&');
  
  // Extract description from meta description
  const descMatch = content.match(/const description = "([^"]+)"/);
  const metaDescription = descMatch ? descMatch[1].replace(/&amp;/g, '&') : '';
  
  // Extract HTML content - handle multiline strings
  let htmlContent = '';
  const contentStart = content.indexOf('const content = "');
  if (contentStart !== -1) {
    let contentEnd = contentStart + 'const content = "'.length;
    let inString = true;
    let escaped = false;
    while (contentEnd < content.length && inString) {
      const char = content[contentEnd];
      if (escaped) {
        escaped = false;
        contentEnd++;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        contentEnd++;
        continue;
      }
      if (char === '"' && !escaped) {
        inString = false;
        break;
      }
      htmlContent += char;
      contentEnd++;
    }
  }
  
  if (!htmlContent) return null;
  
  // Decode HTML entities and normalize
  htmlContent = htmlContent.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  
  // Extract description paragraphs (between first <p> tags before first <h2>)
  const descriptionParagraphs = [];
  const h2Index = htmlContent.indexOf('<h2>');
  const contentBeforeH2 = h2Index !== -1 ? htmlContent.substring(0, h2Index) : htmlContent;
  
  // Match all <p> tags before first <h2>
  const pRegex = /<p>([\s\S]*?)<\/p>/g;
  let pMatch;
  while ((pMatch = pRegex.exec(contentBeforeH2)) !== null) {
    let text = pMatch[1]
      .replace(/<br\s*\/?>/gi, '')
      .replace(/<[^>]+>/g, '')
      .trim();
    
    // Clean up text
    text = text.replace(/\s+/g, ' ').trim();
    
    // Skip if it's just the company name or empty
    if (text && text.length > 10 && text.toLowerCase() !== companyName.toLowerCase()) {
      descriptionParagraphs.push(text);
    }
  }
  
  // If no paragraphs found, try to extract from meta description
  let description = descriptionParagraphs.join('\n\n');
  if (!description || description.length < 50) {
    description = metaDescription;
  }
  
  // Remove company name if it appears as first line
  if (description.startsWith(companyName + '\n\n')) {
    description = description.substring(companyName.length + 2);
  } else if (description.startsWith(companyName + '\n')) {
    description = description.substring(companyName.length + 1);
  }
  
  // Extract phone number (look for "Tel." pattern)
  let phone = null;
  const phonePatterns = [
    /Tel\.\s*([0-9\-\(\)\s]+)/i,
    /Tel:\s*([0-9\-\(\)\s]+)/i,
    /Contact.*Tel\.\s*([0-9\-\(\)\s]+)/i,
    /\(([0-9]{3})\)\s*([0-9]{3})-([0-9]{4})/,
    /([0-9]{3})-([0-9]{3})-([0-9]{4})/,
    /1-([0-9]{3})-([0-9]{3})-([0-9]{4})/
  ];
  
  for (const pattern of phonePatterns) {
    const match = htmlContent.match(pattern);
    if (match) {
      phone = match[1] ? match[0].replace(/Tel\.?\s*:?\s*/i, '').trim() : match[0];
      // Clean up phone number
      phone = phone.replace(/^Tel\.?\s*:?\s*/i, '').trim();
      break;
    }
  }
  
  // Extract logo path from img srcset or src
  let logoPath = null;
  const logoPatterns = [
    /<img[^>]+srcset=["']([^"']+\.(?:png|jpg|gif|jpeg))["']/i,
    /<img[^>]+src=["']([^"']+\.(?:png|jpg|gif|jpeg))["']/i,
    /srcset=["']([^"']+\.(?:png|jpg|gif|jpeg))["']/i,
    /src=["']([^"']+\.(?:png|jpg|gif|jpeg))["']/i
  ];
  
  for (const pattern of logoPatterns) {
    const match = htmlContent.match(pattern);
    if (match && !match[1].includes('MineralWise-Logo')) {
      logoPath = match[1].split(',')[0].trim(); // Take first srcset value if multiple
      break;
    }
  }
  
  // Check for "Cash Payment" section
  const hasCashPayment = /cash payment|selling.*mineral rights|lump sum cash payment/i.test(htmlContent);
  
  // Extract file path for hierarchy
  const fileName = path.basename(filePath, '.astro');
  const pagePath = `/oil-and-gas-operators/${fileName}`;
  
  // Default logo path if not found
  if (!logoPath) {
    logoPath = `/images/${fileName}.png`;
  }
  
  return {
    companyName,
    description: description || metaDescription,
    logoPath,
    phone,
    hasCashPayment,
    pagePath,
    fileName
  };
}

function convertPage(filePath, info) {
  const { companyName, description, logoPath, phone, hasCashPayment, fileName } = info;
  
  const phoneProp = phone ? `contactPhone="${phone}"` : '';
  const cashPaymentProp = hasCashPayment ? 'showCashPayment={true}' : '';
  
  const newContent = `---
import BaseLayout from '../../layouts/BaseLayout.astro';
import PageShell from '../../components/PageShell.astro';
import ArticleContent from '../../components/ArticleContent.astro';
import CompanyPage from '../../components/CompanyPage.astro';
import { getBreadcrumbs } from '../../data/hierarchy';

const title = "${companyName} | MineralWise";
const description = "${description.split('\n\n')[0].replace(/"/g, '\\"')}";

const companyDescription = \`${description.replace(/`/g, '\\`')}\`;
---

<BaseLayout title={title} description={description}>
	<PageShell breadcrumbs={getBreadcrumbs('${info.pagePath}')}>
		<ArticleContent>
			<CompanyPage
				companyName="${companyName.replace(/"/g, '\\"')}"
				description={companyDescription}
				logoPath="${logoPath}"
				${phoneProp}
				showProductionVerification={true}
				${cashPaymentProp}
			/>
		</ArticleContent>
	</PageShell>
</BaseLayout>
`;
  
  fs.writeFileSync(filePath, newContent, 'utf-8');
  console.log(`✓ Converted ${fileName}`);
}

function updateHierarchy(info) {
  const hierarchyPath = path.join(__dirname, '../src/data/hierarchy.ts');
  let hierarchyContent = fs.readFileSync(hierarchyPath, 'utf-8');
  
  // Extract company name for label (use the display name)
  const label = info.companyName;
  
  // Check if entry already exists
  const entryPattern = new RegExp(`'${info.pagePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}':\\s*\\{[^}]+\\}`, 'g');
  if (entryPattern.test(hierarchyContent)) {
    console.log(`  → Entry already exists in hierarchy.ts for ${info.fileName}`);
    return;
  }
  
  // Find the insertion point (after the last company entry or after /oil-and-gas-operators)
  const insertAfter = "'/oil-and-gas-operators/aera-energy-llc': { label: 'Aera Energy LLC', parent: '/oil-and-gas-operators' },";
  const insertPattern = new RegExp(`(${insertAfter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'g');
  
  if (insertPattern.test(hierarchyContent)) {
    const newEntry = `\t'${info.pagePath}': { label: '${label.replace(/'/g, "\\'")}', parent: '/oil-and-gas-operators' },\n`;
    hierarchyContent = hierarchyContent.replace(
      insertPattern,
      `$1\n${newEntry}`
    );
  } else {
    // Find a better insertion point - after /oil-and-gas-operators entry
    const oilGasOperatorsPattern = /('\/oil-and-gas-operators':\s*\{[^}]+\},)/;
    if (oilGasOperatorsPattern.test(hierarchyContent)) {
      const newEntry = `\t'${info.pagePath}': { label: '${label.replace(/'/g, "\\'")}', parent: '/oil-and-gas-operators' },\n`;
      hierarchyContent = hierarchyContent.replace(
        oilGasOperatorsPattern,
        `$1\n${newEntry}`
      );
    } else {
      // Just append before the closing brace
      const closingBracePattern = /(\t'\/all-oil-and-gas-terms':[^}]+\},)/;
      if (closingBracePattern.test(hierarchyContent)) {
        const newEntry = `\t'${info.pagePath}': { label: '${label.replace(/'/g, "\\'")}', parent: '/oil-and-gas-operators' },\n`;
        hierarchyContent = hierarchyContent.replace(
          closingBracePattern,
          `$1\n${newEntry}`
        );
      }
    }
  }
  
  fs.writeFileSync(hierarchyPath, hierarchyContent, 'utf-8');
  console.log(`  → Added to hierarchy.ts`);
}

// Main conversion process
const pagesDir = path.join(__dirname, '../src/pages');
const hierarchyUpdates = [];

console.log('Starting company page conversion...\n');

for (const fileName of companyPagePatterns) {
  const filePath = path.join(pagesDir, 'oil-and-gas-operators', `${fileName}.astro`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠ File not found: ${fileName}.astro`);
    continue;
  }
  
  // Skip if already converted (check if file imports CompanyPage)
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  if (fileContent.includes('import CompanyPage') || convertedPages.includes(fileName)) {
    console.log(`⊘ Skipping already converted: ${fileName}`);
    continue;
  }
  
  try {
    const info = extractCompanyInfo(filePath);
    if (!info) {
      console.log(`⚠ Could not extract info from: ${fileName}`);
      continue;
    }
    
    convertPage(filePath, info);
    hierarchyUpdates.push(info);
  } catch (error) {
    console.error(`✗ Error converting ${fileName}:`, error.message);
  }
}

// Update hierarchy.ts with all entries
console.log('\nUpdating hierarchy.ts...\n');
const hierarchyPath = path.join(__dirname, '../src/data/hierarchy.ts');
let hierarchyContent = fs.readFileSync(hierarchyPath, 'utf-8');

// Sort entries by company name for better organization
hierarchyUpdates.sort((a, b) => a.companyName.localeCompare(b.companyName));

// Collect all new entries first
const newEntries = [];
for (const info of hierarchyUpdates) {
  // Check if entry already exists
  const entryPattern = new RegExp(`'${info.pagePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}':\\s*\\{[^}]+\\}`, 'g');
  if (entryPattern.test(hierarchyContent)) {
    console.log(`⊘ Entry already exists: ${info.fileName}`);
    continue;
  }
  
  newEntries.push({
    path: info.pagePath,
    label: info.companyName.replace(/'/g, "\\'"),
    fileName: info.fileName
  });
}

// Insert all new entries after the last company entry
if (newEntries.length > 0) {
  // Find the last company entry (one with parent '/oil-and-gas-operators')
  const companyEntryPattern = /('\/oil-and-gas-operators\/[^']+':\s*\{[^}]+parent:\s*'\/oil-and-gas-operators'[^}]+\},)/g;
  const matches = [...hierarchyContent.matchAll(companyEntryPattern)];
  
  if (matches.length > 0) {
    const lastMatch = matches[matches.length - 1];
    const insertAfter = lastMatch[0];
    const insertIndex = lastMatch.index + insertAfter.length;
    
    // Build new entries string
    const entriesString = newEntries.map(e => 
      `\t'${e.path}': { label: '${e.label}', parent: '/oil-and-gas-operators' },`
    ).join('\n') + '\n';
    
    // Insert after last company entry
    hierarchyContent = hierarchyContent.slice(0, insertIndex) + '\n' + entriesString + hierarchyContent.slice(insertIndex);
    
    console.log(`✓ Added ${newEntries.length} entries to hierarchy.ts`);
    newEntries.forEach(e => console.log(`  → ${e.fileName}`));
  } else {
    console.log(`⚠ Could not find insertion point in hierarchy.ts`);
  }
  
  fs.writeFileSync(hierarchyPath, hierarchyContent, 'utf-8');
} else {
  console.log(`⊘ No new entries to add to hierarchy.ts`);
}

console.log('\n✓ Conversion complete!');
console.log(`Converted ${hierarchyUpdates.length} company pages.`);
