export const prerender = true;

export async function GET({ site }: { site: URL | undefined }) {
	const base = site?.toString().replace(/\/$/, '') || 'https://mineralwise.com';
	const body = `# MineralWise

> MineralWise is an educational brand focused on citizen oil and gas mineral owners in America. We provide comprehensive education, consulting, advice, and resources to help mineral rights owners understand leasing, royalties, property valuation, and maximize their bonus and royalty payments.

## Contact

- **Website:** ${base}
- **Contact form:** ${base}/contact-us
- **About:** ${base}/about

## Services

- [Owner's Guide](${base}/owners-guide) – Oil & gas basics, leasing, producing, and cash payment guidance for mineral owners
- [Mineral Rights by State](${base}/mineral-rights-by-state) – State-by-state mineral rights information
- [Shale Plays](${base}/shale-plays) – Major U.S. shale formations (Bakken, Eagle Ford, Marcellus, Utica, etc.)
- [Oil & Gas Operators](${base}/oil-and-gas-operators) – Directory of oil and gas companies
- [Oil & Gas Terms](${base}/oil-and-gas-terms) – Glossary of industry terminology
- [Oil & Gas Abbreviations](${base}/oil-and-gas-abbreviations) – Common acronyms and abbreviations

## Key Information

- [Mineral Rights Forum](https://mineralrightsforum.com) – Community discussion for mineral rights owners
- [Privacy Policy](${base}/privacy-policy)
- [Terms & Conditions](${base}/terms-and-conditions)

## What We Do Not Do

MineralWise provides education and consulting. We do not buy mineral rights directly, operate oil and gas wells, or provide legal or tax advice. For legal or tax matters, consult licensed professionals.
`;
	return new Response(body, {
		headers: { 'Content-Type': 'text/plain; charset=utf-8' },
	});
}
