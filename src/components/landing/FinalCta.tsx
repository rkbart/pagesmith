import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export function FinalCta() {
  return (
    <section className="container px-4 sm:px-6 lg:px-8 py-16 text-center lg:py-24">
      <div className="mx-auto max-w-2xl">
        <h2 className="display">Ready to set your book in type?</h2>
        <p className="body-lg text-muted-foreground mt-4">
          Drop in a manuscript and walk out with an EPUB — free, private, and
          finished in minutes.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/convert" className={buttonVariants({ variant: "brass", size: "lg" })}>
            Start binding <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
          <Link href="/editor" className={buttonVariants({ variant: "outline", size: "lg" })}>
            Open the studio
          </Link>
        </div>
      </div>
    </section>
  );
}
