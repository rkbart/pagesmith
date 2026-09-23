/**
 * Library search + pagination helpers (pure functions, no React).
 *
 * Search matches across title, display name, author, and chapter titles +
 * chapter text. Chapter bodies are HTML, so tags are stripped before
 * matching — otherwise `<p>query</p>` would never hit.
 */

import type { Project } from "@/types/project";

/** Strip HTML tags and collapse whitespace; cheap enough for a shelf scan. */
export function plainText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Does this book match a free-text query? Case-insensitive substring match
 * across title, display name, author, chapter titles, and chapter text.
 * An empty/blank query matches everything.
 */
export function matchesQuery(project: Project, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;

  const haystacks = [
    project.metadata.title,
    project.name,
    project.metadata.author,
    ...project.chapters.flatMap((chapter) => [
      chapter.title,
      plainText(chapter.content),
    ]),
  ];

  return haystacks.some((field) => field.toLowerCase().includes(needle));
}

/** 1-based slice of items plus the clamped page that produced it. */
export function paginate<T>(items: T[], page: number, perPage: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * perPage;
  return {
    items: items.slice(start, start + perPage),
    safePage,
    totalPages,
  };
}
