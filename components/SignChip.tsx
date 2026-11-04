import { SIGN_STYLES, signChip } from "@/lib/signs";
import type { SignKind } from "@/lib/types";

/** 상태 칩. 색 + 글자, 확인 중은 점선 (design-system.md §2) */
export function SignChip({ sign, atTime = null, className = "" }: { sign: SignKind; atTime?: string | null; className?: string }) {
  const s = SIGN_STYLES[sign];
  return (
    <span
      className={`inline-block shrink-0 rounded-xl border-2 px-2.5 py-1 text-sm font-bold whitespace-nowrap ${className}`}
      style={{ background: s.bg, color: s.fg, borderColor: s.border, borderStyle: sign === "checking" ? "dashed" : "solid" }}
    >
      {signChip(sign, atTime)}
    </span>
  );
}
