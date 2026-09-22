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
        set((state) => ({
          project,
          projects: [...state.projects.filter((p) => p.id !== project.id), project],
          activeChapterId: null,
          isDirty: true,
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
      },

      save: () => {
        set({ isDirty: false });
      },
    }),
    {
      name: "pagesmith-projects",
      storage: createJSONStorage(() => idbStorage),
      partialize: (state) => ({
        projects: state.projects,
        project: state.project,
        activeChapterId: state.activeChapterId,
      }),
    }
  )
);
