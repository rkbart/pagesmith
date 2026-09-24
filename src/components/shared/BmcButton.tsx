import { BMC_BUTTON_HTML } from "@/components/shared/bmc-markup";

/**
 * Official Buy Me a Coffee button (yellow, Cookie font) linking to
 * buymeacoffee.com/rkbart. The vendor markup is rendered statically —
 * see bmc-markup.ts for why the vendor <script> can't be used directly.
 */
export function BmcButton() {
  return (
    <span
      className="inline-flex w-fit [&_.bmc-btn-container]:inline-flex"
      dangerouslySetInnerHTML={{ __html: BMC_BUTTON_HTML }}
    />
  );
}
