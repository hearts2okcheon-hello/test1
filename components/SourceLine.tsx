import { SOURCE_STYLES } from "@/lib/signs";
import type { Source } from "@/lib/types";
import { TimeAgo } from "./TimeAgo";

/** "사장님 · 12분 전 알림". 출처와 시각은 항상 함께 (cps 설계 원칙 3) */
export function SourceLine({ source, at, verb = "알림" }: { source: Source; at: string; verb?: string }) {
  const s = SOURCE_STYLES[source];
  return (
    <span>
      <b style={{ color: s.fg }}>{s.label}</b> · <TimeAgo iso={at} suffix={` ${verb}`} />
    </span>
  );
}
