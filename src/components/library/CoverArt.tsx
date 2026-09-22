import type { Project } from "@/types/project";

/**
 * A book's cover, or a bound-cloth placeholder when it has none.
 *
 * The placeholder deliberately shows a *monogram*, not the book title: the
 * shelf already prints the title beside the cover, and repeating it looked
 * like a rendering bug. An initial in serif with brass rules reads as a blank
 * cloth binding instead.
 */
export function CoverArt({
  project,
  variant = "cards",
}: {
  project: Project;
  variant?: "cards" | "list";
}) {
  const title = project.metadata.title || project.name;

  if (project.cover) {
    return (
      // Cover art is a user-supplied data URL: next/image adds nothing here.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={project.cover.data}
        alt=""
        className="h-full w-full object-cover"
      />
    );
  }

  const initial = title.trim().charAt(0).toUpperCase() || "\u2014";

  if (variant === "list") {
    return (
      <span className="flex h-full w-full items-center justify-center bg-linear-to-b from-paper to-secondary">
        <span
          aria-hidden="true"
          className="font-heading text-lg leading-none text-brass"
        >
          {initial}
        </span>
      </span>
    );
  }

  return (
    <span className="flex h-full w-full flex-col items-center justify-center gap-3 bg-linear-to-b from-paper to-secondary p-4 text-center">
      <span className="rule-brass" aria-hidden="true" />
      <span
        aria-hidden="true"
        className="font-heading text-4xl leading-none text-brass"
      >
        {initial}
      </span>
      <span className="rule-brass" aria-hidden="true" />
    </span>
  );
}
