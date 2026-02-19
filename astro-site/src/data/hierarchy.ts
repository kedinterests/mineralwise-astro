/**
 * Page hierarchy: declares parent/child relationships for breadcrumbs and nav.
 * Add each page here with its parent (if any) and label.
 */

export interface PageNode {
	label: string;
	parent?: string; // URL path of parent, e.g. '/about'
}

export const pageHierarchy: Record<string, PageNode> = {
	'/': { label: 'Home' },
	'/about': { label: 'About', parent: '/' },
	'/about/team': { label: 'Our Team', parent: '/about' },
};

/**
 * Build breadcrumb trail for a page. Pass the current page path (e.g. '/about/team').
 */
export function getBreadcrumbs(path: string): { label: string; href?: string }[] {
	const trail: { label: string; href?: string }[] = [];
	let currentPath = path;

	while (currentPath) {
		const node = pageHierarchy[currentPath];
		if (!node) break;
		trail.unshift({
			label: node.label,
			href: currentPath === path ? undefined : currentPath,
		});
		currentPath = node.parent ?? '';
	}

	// Always start with Home
	if (trail[0]?.label !== 'Home') {
		trail.unshift({ label: 'Home', href: '/' });
	}

	return trail;
}
