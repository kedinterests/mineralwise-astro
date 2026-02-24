import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const statesDir = path.join(__dirname, '../public/images/states');

// List of all states that need SVGs
const states = [
	'Alabama', 'Arkansas', 'California', 'Colorado', 'Florida', 'Indiana', 'Iowa',
	'Kansas', 'Kentucky', 'Louisiana', 'Michigan', 'Mississippi', 'Montana',
	'Nebraska', 'New Mexico', 'New York', 'North Dakota', 'Ohio', 'Oklahoma',
	'Pennsylvania', 'South Dakota', 'Texas', 'Utah', 'West Virginia', 'Wyoming'
];

function downloadSVG(stateName) {
	return new Promise((resolve, reject) => {
		const slug = stateName.toLowerCase().replace(/\s+/g, '-');
		const url = `https://mapsvg.com/maps/${slug}`;
		const filePath = path.join(statesDir, `${slug}.svg`);

		// Skip if already exists
		if (fs.existsSync(filePath)) {
			console.log(`✓ ${stateName} already exists`);
			resolve();
			return;
		}

		https.get(url, (res) => {
			if (res.statusCode === 302 || res.statusCode === 301) {
				// Follow redirect
				https.get(res.headers.location, (res2) => {
					if (res2.statusCode !== 200) {
						reject(new Error(`Failed to download ${stateName}: ${res2.statusCode}`));
						return;
					}
					const fileStream = fs.createWriteStream(filePath);
					res2.pipe(fileStream);
					fileStream.on('finish', () => {
						fileStream.close();
						console.log(`✓ Downloaded ${stateName}`);
						resolve();
					});
				}).on('error', reject);
			} else if (res.statusCode === 200) {
				const fileStream = fs.createWriteStream(filePath);
				res.pipe(fileStream);
				fileStream.on('finish', () => {
					fileStream.close();
					console.log(`✓ Downloaded ${stateName}`);
					resolve();
				});
			} else {
				reject(new Error(`Failed to download ${stateName}: ${res.statusCode}`));
			}
		}).on('error', reject);
	});
}

async function main() {
	// Ensure directory exists
	if (!fs.existsSync(statesDir)) {
		fs.mkdirSync(statesDir, { recursive: true });
	}

	console.log(`Downloading SVGs for ${states.length} states...\n`);

	for (const state of states) {
		try {
			await downloadSVG(state);
			// Small delay to avoid overwhelming the server
			await new Promise(resolve => setTimeout(resolve, 500));
		} catch (error) {
			console.error(`✗ Error downloading ${state}:`, error.message);
		}
	}

	console.log(`\n✓ Finished downloading state SVGs`);
}

main();
