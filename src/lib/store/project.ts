import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { idbStorage } from "./idb-storage";
import type { Project, Chapter, BookMetadata, BookCover, TOCEntry } from "@/types/project";

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
  activeChapterId: string | null;
  isDirty: boolean;

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
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      project: null,
      projects: [],
      activeChapterId: null,
      isDirty: false,

      createProject: (name) => {
        const now = Date.now();
        const project: Project = {
          id: generateId(),
          name,
          metadata: {
            title: name,
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
    }),
    {
      name: "pagesmith-projects",
      storage: createJSONStorage(() => idbStorage),
      partialize: (state) => ({
        // Only shelved books are persisted. The open `project` is deliberately
        // excluded: it may be an empty draft (never shelved), and persisting it
        // would resurrect ghost books on reload. Shelved books re-sync via
        // `shelveProject` on every edit, and the editor/read pages re-open the
        // most recent shelved book when `project` is null.
        projects: state.projects,
        activeChapterId: state.activeChapterId,
      }),
    }
  )
);
