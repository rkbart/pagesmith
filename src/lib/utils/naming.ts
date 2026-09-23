/**
 * Duplicate-name guardrails (pure functions, no React).
 *
 * Books and collections share one rule: names are unique case-insensitively,
 * and collisions resolve with a ` (1)`, ` (2)`, … suffix — the same
 * convention file managers and browsers use for duplicate downloads.
 */

/** "Dune (2)" → "Dune"; "Dune" → "Dune". Lets re-imports collapse cleanly. */
export function stripNumberSuffix(name: string): string {
  const stripped = name.replace(/\s*\(\d+\)\s*$/, "").trim();
  return stripped || name.trim();
}

/**
 * Return `base` if free, else the first `base (n)` that isn't. Comparison is
 * case-insensitive on trimmed names. `taken` is the set of names already on
 * the shelf (or collection list).
 */
export function uniqueName(base: string, taken: Iterable<string>): string {
  const cleanBase = stripNumberSuffix(base.trim()) || "Untitled";
  const lowered = new Set(
    Array.from(taken, (name) => name.trim().toLowerCase())
  );
  if (!lowered.has(cleanBase.toLowerCase())) return cleanBase;
  let i = 1;
  while (lowered.has(`${cleanBase} (${i})`.toLowerCase())) i += 1;
  return `${cleanBase} (${i})`;
}
