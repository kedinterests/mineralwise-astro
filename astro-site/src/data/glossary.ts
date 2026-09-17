import { getCollection } from 'astro:content';
import { ANCHOR_RE, DIGIT_PAGE, compareTerms, letterFor, letterPath, termHref } from './glossary-rules.mjs';

export interface GlossaryTerm {
	/** Stable id used as the in-page anchor. It is the term's filename. */
	anchor: string;
	term: string;
	definition: string;
	/** 'a' to 'z', or '0-9' */
	letter: string;
	/** Site-relative link: letter page plus anchor. */
	href: string;
}

export interface GlossaryLetter {
	letter: string;
	/** 'A', or '0-9' */
	label: string;
	/** Site-relative link to the letter page, with trailing slash. */
	href: string;
	terms: GlossaryTerm[];
}

/** Every glossary term, sorted alphabetically. */
export async function getGlossaryTerms(): Promise<GlossaryTerm[]> {
	const entries = await getCollection('terms');
	const seen = new Set<string>();
	const terms = entries.map((entry) => {
		const anchor = entry.id;
		if (!ANCHOR_RE.test(anchor)) {
			throw new Error(`Glossary term file "${anchor}" must be named with lowercase letters, digits and hyphens only.`);
		}
		if (seen.has(anchor)) throw new Error(`Duplicate glossary anchor "${anchor}".`);
		seen.add(anchor);
		const letter = letterFor(entry.data.term);
		return {
			anchor,
			term: entry.data.term,
			definition: entry.data.definition,
			letter,
			href: termHref(letter, anchor),
		};
	});
	return terms.sort((a, b) => compareTerms(a.term, b.term) || compareTerms(a.anchor, b.anchor));
}

/** Only the letters that have at least one term. A letter with no terms gets no page. */
export async function getGlossaryLetters(): Promise<GlossaryLetter[]> {
	const byLetter = new Map<string, GlossaryTerm[]>();
	for (const term of await getGlossaryTerms()) {
		if (!byLetter.has(term.letter)) byLetter.set(term.letter, []);
		byLetter.get(term.letter)!.push(term);
	}
	const order = [DIGIT_PAGE, ...'abcdefghijklmnopqrstuvwxyz'];
	return order
		.filter((letter) => byLetter.has(letter))
		.map((letter) => ({
			letter,
			label: letter.toUpperCase(),
			href: letterPath(letter) + '/',
			terms: byLetter.get(letter)!,
		}));
}
