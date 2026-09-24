import type { ValidationResult } from "@/types/epub";

/**
 * In-memory proof cache for the Proof Desk (`/check`).
 *
 * Deliberately NOT sessionStorage/localStorage: the proof survives
 * client-side navigation (e.g. Studio -> back to Proof Desk) because the
 * module stays loaded, but a full page refresh drops it — which is the
 * desired "clear on refresh" behaviour. A refreshed page can't re-read the
 * original on-disk file anyway, so a restored proof would be unverifiable.
 */
export interface CachedProof {
  result: ValidationResult;
  fileName: string;
  /** Library project id shelved from this drop, if the import succeeded. */
  projectId: string | null;
  timestamp: number;
  /**
   * The exact bytes that were proofed. The Studio rebuild normalizes a
   * book (stored-first mimetype, complete manifest, repaired XHTML), so
   * re-validating a rebuild can never reproduce the original file's
   * faults. While the book is unedited, re-proof against these bytes.
   */
  originalFile: File | null;
}

let cached: CachedProof | null = null;

export function setCachedProof(proof: CachedProof): void {
  cached = proof;
}

export function getCachedProof(): CachedProof | null {
  return cached;
}

export function clearCachedProof(): void {
  cached = null;
}

/**
 * One-shot handoff for "send this book to the Proof Desk" from the Studio.
 * Carries the EPUB bytes plus the shelved project they belong to, so the
 * Proof Desk proofs without re-shelving a duplicate. In-memory, so a
 * refresh clears it like everything else here.
 */
interface PendingCheck {
  file: File;
  /** Shelved project the bytes belong to — null for plain disk drops. */
  sourceProjectId: string | null;
}

let pending: PendingCheck | null = null;

export function setPendingCheckFile(file: File, sourceProjectId: string | null = null): void {
  pending = { file, sourceProjectId };
}

export function takePendingCheckFile(): PendingCheck | null {
  const next = pending;
  pending = null;
  return next;
}

/**
 * The bytes to proof for a book: the original dropped file while the book
 * is unedited since shelving, otherwise a fresh in-memory build. Returns
 * the File to validate, or null when no original is cached (fall back to
 * building).
 */
export function originalFileIfUnedited(projectId: string, updatedAt: number): File | null {
  const proof = cached;
  if (!proof || proof.projectId !== projectId || !proof.originalFile) return null;
  // Any Studio edit bumps updatedAt past the proof timestamp.
  if (updatedAt > proof.timestamp) return null;
  return proof.originalFile;
}

/**
 * Per-book persistent proof slot (sessionStorage, keyed by project id).
 *
 * This is what keeps the Studio banner alive across a refresh: the
 * in-memory cache above is gone after reload, but the tab session still
 * holds the findings for each proofed book. Dismissing the banner clears
 * the slot, so it never comes back uninvited. The Proof Desk itself never
 * reads these — a refreshed Proof Desk starts empty by design.
 */
const slotKey = (projectId: string) => `pagesmith-proof-book:${projectId}`;

export interface StoredProof {
  result: ValidationResult;
  fileName: string;
  timestamp: number;
}

export function saveProofForProject(
  projectId: string,
  result: ValidationResult,
  fileName: string,
): void {
  try {
    const payload: StoredProof = { result, fileName, timestamp: Date.now() };
    sessionStorage.setItem(slotKey(projectId), JSON.stringify(payload));
  } catch {
    /* storage full or unavailable */
  }
}

export function loadProofForProject(projectId: string): StoredProof | null {
  try {
    const raw = sessionStorage.getItem(slotKey(projectId));
    return raw ? (JSON.parse(raw) as StoredProof) : null;
  } catch {
    return null;
  }
}

export function clearProofForProject(projectId: string): void {
  try {
    sessionStorage.removeItem(slotKey(projectId));
  } catch {
    /* unavailable */
  }
}
