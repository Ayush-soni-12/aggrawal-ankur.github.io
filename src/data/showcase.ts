export interface ShowcaseItem {
	name: string;
	href: string;
	stack: string;
	startDate?: string;
	endDate?: string;
	badge?: string;
	desc: string;
}

/**
 * Format a project timeline from start and end date with days count in parentheses:
 * e.g., "August 10, 2026 - September 05, 2026 (27 days)"
 */
export function formatShowcaseTimeline(start: string | Date, end: string | Date): string {
	const startDate = new Date(start);
	const endDate = new Date(end);

	const formatter = new Intl.DateTimeFormat("en-US", {
		month: "long",
		day: "2-digit",
		year: "numeric",
		timeZone: "UTC",
	});

	const startStr = formatter.format(startDate);
	const endStr = formatter.format(endDate);

	// Calculate difference in calendar days inclusively
	const utcStart = Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate());
	const utcEnd = Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate());
	const diffDays = Math.round((utcEnd - utcStart) / (1000 * 60 * 60 * 24)) + 1;

	const daysLabel = diffDays === 1 ? "1 day" : `${diffDays} days`;

	return `${startStr} - ${endStr} (${daysLabel})`;
}

export const showcase: ShowcaseItem[] = [
	{
		name: "glibc-malloc-expedition",
		href: "https://github.com/aggrawal-ankur/glibc-malloc-expedition",
		stack: "C · GDB",
		startDate: "2026-05-5",
		endDate: "2026-09-05",
		badge: "DONE",
		desc: "A systems investigation of the virtual memory allocator in glibc-2.43, approached from first principles. Explored fundamental data structures and concepts including malloc_chunk, bins, malloc_state, and tcache. Followed a source → hypothesis → experiment → verification approach, producing annotated source code, in-depth design notes, and small reproducible experiments, along with a Docker-based environment."
	},

	// {
	// 	name: "Sample Project",
	// 	href: "https://github.com/example/sample",
	// 	stack: "TypeScript · CLI",
	// 	startDate: "2026-05-01",
	// 	endDate: "2026-05-20",
	// 	badge: "OSS",
	// 	desc: "A short, plain description of what the project does and why it's interesting. One or two sentences is plenty — keep the prose tight so the row stays scannable.",
	// },
];
