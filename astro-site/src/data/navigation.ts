// Navigation data structure for MineralWise site
// Extracted from scraped HTML files

export interface NavItem {
	title: string;
	href: string;
	external?: boolean;
	children?: NavItem[];
}

export const navigation: NavItem[] = [
	{
		title: 'Home',
		href: '/',
	},
	{
		title: "Owner's Guide",
		href: '/owners-guide',
		children: [
			{
				title: 'Oil & Gas 101',
				href: '/oil-and-gas-basics-for-mineral-owners',
			},
			{
				title: 'Leased & Producing',
				href: '/leased-and-producing',
			},
			{
				title: 'Unleased Mineral Owner',
				href: '/unleased-mineral-owner',
			},
			{
				title: 'Leased But Not Producing',
				href: '/leased-but-not-producing',
			},
			{
				title: 'Lease Proposals',
				href: '/lease-proposals',
			},
			{
				title: 'Opportunities',
				href: '/opportunities-for-all',
			},
			{
				title: 'Prefer Cash Payment',
				href: '/cash-payment-for-oil-and-gas-royalty',
			},
		],
	},
	{
		title: 'Resources',
		href: '#',
		children: [
			{
				title: 'Mineral Rights by State',
				href: '/mineral-rights-by-state',
			},
			{
				title: 'Shale Plays',
				href: '/shale-plays',
			},
			{
				title: 'Oil & Gas Operators',
				href: '/oil-gas-operators',
			},
			{
				title: 'Oil & Gas Terms',
				href: '/all-oil-and-gas-terms',
			},
			{
				title: 'Oil & Gas Abbreviations',
				href: '/oil-and-gas-abbreviations',
			},
		],
	},
	{
		title: 'About',
		href: '/about',
	},
	{
		title: 'Contact',
		href: '/contact-us',
	},
	{
		title: 'Advertising',
		href: '/advertising',
	},
	{
		title: 'Forum',
		href: 'https://mineralrightsforum.com',
		external: true,
	},
];
