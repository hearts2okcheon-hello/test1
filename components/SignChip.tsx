import { SIGN_STYLES, signChip } from "@/lib/signs";
import type { SignKind } from "@/lib/types";

/** 나무 팻말처럼 살짝 기울인 상태 표시. 색 + 글자, 확인 중은 점선 */
export function SignChip({ sign, atTime = null, className = "" }: { sign: SignKind; atTime?: string | null; className?: string }) {
  const s = SIGN_STYLES[sign];
  return (
    <span
      className={`ok-sign ${className}`}
      style={{ background: s.bg, color: s.fg, borderColor: s.border, boxShadow: `0 2px 0 ${s.border}`, borderStyle: sign === "checking" ? "dashed" : "solid" }}
    >
      <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: s.dot }} />
      {signChip(sign, atTime)}
    </span>
  );
}
