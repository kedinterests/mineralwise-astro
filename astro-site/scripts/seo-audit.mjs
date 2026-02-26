import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const PAGES_DIR = path.join(ROOT, 'src', 'pages');
const strictLength = process.argv.includes('--strict-length');
const FALLBACK_DESCRIPTION = 'Comprehensive mineral rights education and oil and gas resources for owners, lessors, and royalty stakeholders.';

const PLACEHOLDER_PATTERNS = [/saas startup/i, /easy to customize/i, /lorem ipsum/i];

async function walk(dir) {
	const entries = await fs.readdir(dir, { withFileTypes: true });
	const files = await Promise.all(
		entries.map(async (entry) => {
			const fullPath = path.join(dir, entry.name);
			if (entry.isDirectory()) {
				return walk(fullPath);
			}
			if (entry.isFile() && entry.name.endsWith('.astro')) {
				return [fullPath];
			}
			return [];
		})
	);

	return files.flat();
}

function getTagAttributes(source, tagName) {
	const match = source.match(new RegExp(`<${tagName}\\b([\\s\\S]*?)>`, 'm'));
	return match ? match[1] : null;
}

function getConstString(source, variableName) {
	const regex = new RegExp(`const\\s+${variableName}\\s*=\\s*([\"'\`])([\\s\\S]*?)\\1`, 'm');
	const match = source.match(regex);
	return match ? match[2].trim() : null;
}

function hasPlaceholderText(value) {
	if (!value) return false;
	return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value));
}

function normalizeWhitespace(value) {
	return value.replace(/\s+/g, ' ').trim();
}

function truncateAtWord(value, maxLength) {
	if (value.length <= maxLength) return value;
	const truncated = value.slice(0, maxLength - 1);
	const lastSpace = truncated.lastIndexOf(' ');
	if (lastSpace > 20) {
		return `${truncated.slice(0, lastSpace)}…`;
	}
	return `${truncated}…`;
}

function toSeoTitle(rawTitle) {
	let value = normalizeWhitespace(rawTitle || 'MineralWise');

	if (!/\bMineralWise\b/i.test(value)) {
		value = `${value} | MineralWise`;
	}

	if (value.length < 20) {
		value = `${value} Guide`;
	}

	return truncateAtWord(value, 65);
}

function toSeoDescription(rawDescription) {
	let value = normalizeWhitespace(rawDescription || FALLBACK_DESCRIPTION);

	if (value.length > 160) {
		value = truncateAtWord(value, 160);
	}

	if (value.length < 70) {
		const suffix = ' Learn more at MineralWise.';
		if (!/\bMineralWise\b/i.test(value)) {
			value = `${value}${suffix}`;
		}
	}

	if (value.length < 70) {
		value = `${value} Mineral rights education resources.`;
	}

	return truncateAtWord(value, 170);
}

function relative(filePath) {
	return path.relative(ROOT, filePath).split(path.sep).join('/');
}

async function run() {
	const errors = [];
	const warnings = [];

	let files = [];
	try {
		files = await walk(PAGES_DIR);
	} catch (error) {
		console.error('Failed to scan src/pages:', error);
		process.exit(1);
	}

	for (const file of files) {
		const source = await fs.readFile(file, 'utf8');
		const rel = relative(file);

		const hasBaseLayout = /<BaseLayout\b/m.test(source);
		const hasBaseHead = /<BaseHead\b/m.test(source);
		const hasBlogPostLayout = /<BlogPost\b/m.test(source);
		const hasSchemaEnabledHead = hasBaseLayout || hasBaseHead || hasBlogPostLayout;

		if (!hasSchemaEnabledHead) {
			errors.push(`${rel}: missing BaseLayout/BaseHead (no guaranteed SEO tags or JSON-LD schema).`);
			continue;
		}

		if (hasBaseLayout) {
			const attrs = getTagAttributes(source, 'BaseLayout') || '';
			if (!/\btitle\s*=/.test(attrs)) {
				errors.push(`${rel}: <BaseLayout> missing title prop.`);
			}
			if (!/\bdescription\s*=/.test(attrs)) {
				errors.push(`${rel}: <BaseLayout> missing description prop.`);
			}
		}

		if (hasBaseHead) {
			const attrs = getTagAttributes(source, 'BaseHead') || '';
			if (!/\btitle\s*=/.test(attrs)) {
				errors.push(`${rel}: <BaseHead> missing title prop.`);
			}
			if (!/\bdescription\s*=/.test(attrs)) {
				errors.push(`${rel}: <BaseHead> missing description prop.`);
			}
		}

		const titleLiteral = getConstString(source, 'title');
		const descriptionLiteral = getConstString(source, 'description') || getConstString(source, 'metaDescription');
		const effectiveTitle = toSeoTitle(titleLiteral || 'MineralWise');
		const effectiveDescription = toSeoDescription(descriptionLiteral || FALLBACK_DESCRIPTION);

		if (strictLength) {
			const titleLength = effectiveTitle.length;
			if (titleLength < 20 || titleLength > 70) {
				warnings.push(`${rel}: effective title length ${titleLength} (recommended 20-70 chars).`);
			}

			const descriptionLength = effectiveDescription.length;
			if (descriptionLength < 70 || descriptionLength > 170) {
				warnings.push(`${rel}: effective description length ${descriptionLength} (recommended 70-170 chars).`);
			}
    }

		if (descriptionLiteral) {
			if (hasPlaceholderText(descriptionLiteral)) {
				warnings.push(`${rel}: description appears to be placeholder copy.`);
			}
		}
	}

	if (errors.length) {
		console.error(`\nSEO audit failed with ${errors.length} error(s):`);
		for (const issue of errors) {
			console.error(`- ${issue}`);
		}
	}

	if (warnings.length) {
		console.warn(`\nSEO audit warnings (${warnings.length}):`);
		const displayedWarnings = warnings.slice(0, 50);
		for (const warning of displayedWarnings) {
			console.warn(`- ${warning}`);
		}
		if (warnings.length > displayedWarnings.length) {
			console.warn(`- ... ${warnings.length - displayedWarnings.length} more warning(s).`);
		}
	}

	if (!errors.length && !warnings.length) {
		console.log('SEO audit passed with no issues.');
	} else if (!errors.length) {
		console.log('SEO audit passed with warnings.');
	}

	if (errors.length) {
		process.exit(1);
	}
}

run();
