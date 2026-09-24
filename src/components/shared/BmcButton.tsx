import { BMC_BUTTON_HTML } from "@/components/shared/bmc-markup";

/**
 * Official Buy Me a Coffee button (yellow, Cookie font) linking to
 * buymeacoffee.com/rkbart. The vendor markup is rendered statically —
 * see bmc-markup.ts for why the vendor <script> can't be used directly.
 *
 * Scaled to ~62% so it sits comfortably beside text-sized footer rows
 * while keeping the official artwork pixel-perfect; the negative margin
 * reclaims the layout space the unscaled button would occupy.
 */
export function BmcButton() {
  return (
    <span className="inline-flex w-fit">
      <span
        className="inline-flex origin-left scale-[0.62] my-[-11px]"
        dangerouslySetInnerHTML={{ __html: BMC_BUTTON_HTML }}
      />
    </span>
  );
}
