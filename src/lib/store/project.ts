import { create } from "zustand";
import { idbStorage } from "./idb-storage";
import {
  formatBytes,
  perfEnabled,
  perfLog,
  perfMeasure,
} from "@/lib/utils/perf";
import type { Project, Chapter, BookMetadata, BookCover, Collection, TOCEntry } from "@/types/project";
import { uniqueName } from "@/lib/utils/naming";

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

function buildToc(chapters: Chapter[]): TOCEntry[] {
  return chapters.map((ch) => ({
    chapterId: ch.id,
    label: ch.title,
    level: ch.level,
  }));
}

interface ProjectState {
  project: Project | null;
  projects: Project[];
  collections: Collection[];
  activeChapterId: string | null;
  isDirty: boolean;
  /** True once the shelf has been restored from IndexedDB (see below). */
  hydrated: boolean;

  createProject: (name: string) => void;
  /** Drop an unsaved draft from memory (a book already on the shelf is kept). */
  discardDraft: () => void;
  /** Put the open book onto the shelf (persisted via the `projects` array). */
  shelveProject: () => void;
  loadProject: (id: string) => void;
  deleteProject: (id: string) => void;
  setMetadata: (meta: Partial<BookMetadata>) => void;
  setCover: (cover: BookCover | undefined) => void;
  addChapter: (title?: string, content?: string, level?: number) => string;
  updateChapter: (id: string, updates: Partial<Chapter>) => void;
  removeChapter: (id: string) => void;
  reorderChapters: (fromIndex: number, toIndex: number) => void;
  setActiveChapter: (id: string | null) => void;
  importChapters: (chapters: Chapter[], metadata?: Partial<BookMetadata>, cover?: BookCover) => void;
  rebuildToc: () => void;
  save: () => void;
  /** Create a shelf collection (folder). Names dedupe like book titles. */
  createCollection: (name: string) => string;
  /** Rename a collection. Names dedupe against the other collections. */
  renameCollection: (id: string, name: string) => void;
  /** Delete a collection — its books are kept and become unsorted. */
  deleteCollection: (id: string) => void;
  /** File a book into a collection, or pass null to unsort it. */
  assignProject: (projectId: string, collectionId: string | null) => void;
}

export const useProjectStore = create<ProjectState>()(
  (set, get) => ({
      project: null,
      projects: [],
      collections: [],
      activeChapterId: null,
      isDirty: false,
      hydrated: false,

      createProject: (name) => {
        const now = Date.now();
        // Duplicate guardrail: importing "Dune" twice shelves "Dune" and
        // "Dune (1)" instead of two indistinguishable books. Compares against
        // display titles (metadata title wins on the shelf) and raw names.
        const taken: string[] = [];
        for (const p of get().projects) {
          taken.push(p.name);
          if (p.metadata.title) taken.push(p.metadata.title);
        }
        const unique = uniqueName(name, taken);
        const project: Project = {
          id: generateId(),
          name: unique,
          metadata: {
            title: unique,
            author: "",
            language: "en",
            description: "",
          },
          chapters: [],
          toc: [],
          createdAt: now,
          updatedAt: now,
        };
        set({
          project,
          activeChapterId: null,
          isDirty: true,
        });
      },

      discardDraft: () => {
        const { project } = get();
        if (!project) return;
        // Only an unsaved draft can be discarded — anything already on the
        // shelf is left alone.
        if (get().projects.some((p) => p.id === project.id)) return;
        set({ project: null, activeChapterId: null, isDirty: false });
      },

      shelveProject: () => {
        const { project } = get();
        if (!project) return;
        set((state) => ({
          projects: state.projects.some((p) => p.id === project.id)
            ? state.projects.map((p) => (p.id === project.id ? project : p))
            : [...state.projects, project],
        }));
      },

      loadProject: (id) => {
        const state = get();
        const found = state.projects.find((p) => p.id === id);
        if (found) {
          set({
            project: found,
            activeChapterId: found.chapters[0]?.id ?? null,
            isDirty: false,
          });
        }
      },

      deleteProject: (id) => {
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          project: state.project?.id === id ? null : state.project,
          isDirty: true,
        }));
      },

      setMetadata: (meta) => {
        set((state) => {
          if (!state.project) return state;
          const project = {
            ...state.project,
            metadata: { ...state.project.metadata, ...meta },
            updatedAt: Date.now(),
          };
          return {
            project,
            projects: state.projects.map((p) => (p.id === project.id ? project : p)),
            isDirty: true,
          };
        });
        get().shelveProject();
      },

      setCover: (cover) => {
        set((state) => {
          if (!state.project) return state;
          const project = { ...state.project, cover, updatedAt: Date.now() };
          return {
            project,
            projects: state.projects.map((p) => (p.id === project.id ? project : p)),
            isDirty: true,
          };
        });
        get().shelveProject();
      },

      addChapter: (title = "New Chapter", content = "", level = 1) => {
        const id = generateId();
        set((state) => {
          if (!state.project) return state;
          const chapter: Chapter = {
            id,
            title,
            content,
            order: state.project.chapters.length,
            level,
          };
          const chapters = [...state.project.chapters, chapter];
          const project = {
            ...state.project,
            chapters,
            toc: buildToc(chapters),
            updatedAt: Date.now(),
          };
          return {
            project,
            projects: state.projects.map((p) => (p.id === project.id ? project : p)),
            activeChapterId: id,
            isDirty: true,
          };
        });
        get().shelveProject();
        return id;
      },

      updateChapter: (id, updates) => {
        set((state) => {
          if (!state.project) return state;
          const chapters = state.project.chapters.map((ch) =>
            ch.id === id ? { ...ch, ...updates } : ch
          );
          const project = {
            ...state.project,
            chapters,
            toc: buildToc(chapters),
            updatedAt: Date.now(),
          };
          return {
            project,
            projects: state.projects.map((p) => (p.id === project.id ? project : p)),
            isDirty: true,
          };
        });
        get().shelveProject();
      },

      removeChapter: (id) => {
        set((state) => {
          if (!state.project) return state;
          const chapters = state.project.chapters
            .filter((ch) => ch.id !== id)
            .map((ch, i) => ({ ...ch, order: i }));
          const project = {
            ...state.project,
            chapters,
            toc: buildToc(chapters),
            updatedAt: Date.now(),
          };
          return {
            project,
            projects: state.projects.map((p) => (p.id === project.id ? project : p)),
            activeChapterId:
              state.activeChapterId === id ? chapters[0]?.id ?? null : state.activeChapterId,
            isDirty: true,
          };
        });
        get().shelveProject();
      },

      reorderChapters: (fromIndex, toIndex) => {
        set((state) => {
          if (!state.project) return state;
          const chapters = [...state.project.chapters];
          const [moved] = chapters.splice(fromIndex, 1);
          chapters.splice(toIndex, 0, moved);
          const reordered = chapters.map((ch, i) => ({ ...ch, order: i }));
          const project = {
            ...state.project,
            chapters: reordered,
            toc: buildToc(reordered),
            updatedAt: Date.now(),
          };
          return {
            project,
            projects: state.projects.map((p) => (p.id === project.id ? project : p)),
            isDirty: true,
          };
        });
        get().shelveProject();
      },

      setActiveChapter: (id) => set({ activeChapterId: id }),

      importChapters: (chapters, metadata, cover) => {
        set((state) => {
          if (!state.project) return state;
          const project: Project = {
            ...state.project,
            metadata: { ...state.project.metadata, ...metadata },
            cover: cover ?? state.project.cover,
            chapters,
            toc: buildToc(chapters),
            updatedAt: Date.now(),
          };
          return {
            project,
            projects: state.projects.map((p) => (p.id === project.id ? project : p)),
            activeChapterId: chapters[0]?.id ?? state.activeChapterId,
            isDirty: true,
          };
        });
        get().shelveProject();
      },

      rebuildToc: () => {
        set((state) => {
          if (!state.project) return state;
          const project = {
            ...state.project,
            toc: buildToc(state.project.chapters),
            updatedAt: Date.now(),
          };
          return {
            project,
            projects: state.projects.map((p) => (p.id === project.id ? project : p)),
            isDirty: true,
          };
        });
        get().shelveProject();
      },

      save: () => {
        set({ isDirty: false });
      },

      createCollection: (name) => {
        const id = generateId();
        const unique = uniqueName(
          name.trim() || "Untitled collection",
          get().collections.map((c) => c.name)
        );
        set((state) => ({
          collections: [
            ...state.collections,
            { id, name: unique, createdAt: Date.now() },
          ],
        }));
        return id;
      },

      renameCollection: (id, name) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        const unique = uniqueName(
          trimmed,
          get()
            .collections.filter((c) => c.id !== id)
            .map((c) => c.name)
        );
        set((state) => ({
          collections: state.collections.map((c) =>
            c.id === id ? { ...c, name: unique } : c
          ),
        }));
      },

      deleteCollection: (id) => {        set((state) => ({
          collections: state.collections.filter((c) => c.id !== id),
          // Books survive — they just become unsorted.
          projects: state.projects.map((p) =>
            p.collectionId === id ? { ...p, collectionId: null } : p
          ),
          project:
            state.project?.collectionId === id
              ? { ...state.project, collectionId: null }
              : state.project,
        }));
      },

      assignProject: (projectId, collectionId) => {
        if (collectionId && !get().collections.some((c) => c.id === collectionId)) {
          return;
        }
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? { ...p, collectionId, updatedAt: Date.now() }
              : p
          ),
          project:
            state.project?.id === projectId
              ? {
                  ...state.project,
                  collectionId,
                  updatedAt: Date.now(),
                }
              : state.project,
          isDirty: true,
        }));
      },
    })
);

/* ------------------------------------------------------------------ */
/* Manual persistence (replaces zustand's `persist` middleware).          */
/*                                                                       */
/* Why manual: persist serializes + writes on EVERY store change. With a  */
/* whole book (or shelf) of base64 images in state, each editor keystroke */
/* and every reader chapter turn blocked the main thread on a multi-MB    */
/* JSON.stringify. Saves are now debounced (trailing edge) and flushed   */
/* when the page hides, so interaction bursts collapse into one write.    */
/*                                                                       */
/* Only shelved books are persisted. The open `project` is deliberately   */
/* excluded: it may be an empty draft (never shelved), and persisting it  */
/* would resurrect ghost books on reload. Shelved books re-sync via       */
/* `shelveProject` on every edit, and the editor/read pages re-open the   */
/* most recent shelved book when `project` is null.                       */
/* ------------------------------------------------------------------ */

const PERSIST_KEY = "pagesmith-projects";
const PERSIST_VERSION = 0;
const SAVE_DEBOUNCE_MS = 1000;

function snapshot(state: ProjectState): {
  projects: Project[];
  collections: Collection[];
  activeChapterId: string | null;
} {
  return {
    projects: state.projects,
    collections: state.collections,
    activeChapterId: state.activeChapterId,
  };
}

function saveNow(): void {
  const state = useProjectStore.getState();
  // Never save before hydration finished — that would overwrite the shelf
  // with empty state.
  if (!state.hydrated) return;
  const t0 = performance.now();
  const payload = JSON.stringify({
    state: snapshot(state),
    version: PERSIST_VERSION,
  });
  if (perfEnabled()) {
    perfMeasure("store serialize", t0);
    perfLog("store serialize payload", { bytes: formatBytes(payload.length) });
  }
  void idbStorage.setItem(PERSIST_KEY, payload);
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleSave(): void {
  if (typeof window === "undefined") return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    saveNow();
  }, SAVE_DEBOUNCE_MS);
}

function flushSave(): void {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  saveNow();
}

async function hydrateFromStorage(): Promise<void> {
  try {
    const raw = await idbStorage.getItem(PERSIST_KEY);
    if (raw) {
      type PersistedShape = {
        projects?: Project[];
        collections?: Collection[];
        activeChapterId?: string | null;
      };
      const parsed = JSON.parse(raw) as { state?: PersistedShape } & PersistedShape;
      // Accept the persist-middleware envelope (`{state, version}`); fall
      // back to a bare snapshot shape for forward tolerance. Older payloads
      // have no `collections` — they simply start with an empty shelf folder
      // list, and books without `collectionId` read as unsorted.
      const saved: PersistedShape = parsed.state ?? parsed;
      useProjectStore.setState({
        projects: Array.isArray(saved?.projects) ? saved.projects : [],
        collections: Array.isArray(saved?.collections) ? saved.collections : [],
        activeChapterId: saved?.activeChapterId ?? null,
      });
    }
  } catch (err) {
    console.warn("[pagesmith] Failed to restore projects:", err);
  } finally {
    useProjectStore.setState({ hydrated: true });
  }
}

if (typeof window !== "undefined") {
  void hydrateFromStorage();

  // Every store write schedules a debounced save (guarded on `hydrated`
  // inside saveNow/flushSave so pre-hydration sets can't wipe the shelf).
  useProjectStore.subscribe(() => {
    if (useProjectStore.getState().hydrated) scheduleSave();
  });

  // Don't lose the trailing debounced write on tab close.
  window.addEventListener("pagehide", flushSave);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushSave();
  });
}
