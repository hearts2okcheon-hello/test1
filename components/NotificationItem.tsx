"use client";

import type { AlertKind } from "@/lib/alerts";
import { TimeAgo } from "./TimeAgo";

/**
 * 알림 종류마다의 아이콘. 동그란 바탕의 크기(40px)와 아이콘 크기(22px)·자리는 모두 같고, 그림과 색만 다르다.
 * name 은 화면을 읽어 주는 기기에 알려 주는 종류 이름
 */
const LOOK: Record<AlertKind, { name: string; tone: string; paths: string[] }> = {
  // 별: 즐겨찾는 가게 소식
  favorite: { name: "즐겨찾는 가게 소식", tone: "bg-yellow-soft text-olive", paths: ["M12 3.2l2.7 5.5 6 .9-4.35 4.25 1 6L12 17l-5.35 2.85 1-6L3.3 9.6l6-.9z"] },
  // 시계: 영업 상태 확인 요청 (평소 여는 시간이 지났어요)
  open_check: { name: "영업 상태 확인", tone: "bg-sage-soft text-sage-deep", paths: ["M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17z", "M12 7.5V12l3 2"] },
  // 확성기: 이웃 제보가 왔어요
  report: { name: "이웃 제보", tone: "bg-blue-soft text-blue", paths: ["M4 10v4h3.5l6.5 4V6L7.5 10z", "M17.5 9.5a3.5 3.5 0 0 1 0 5"] },
  // 말풍선: 제보에 답이 왔어요
  reply: { name: "제보 답장", tone: "bg-sand text-sand-ink", paths: ["M5 5.5h14v10h-8L6.5 19v-3.5H5z"] },
  other: { name: "알림", tone: "bg-sand text-sand-ink", paths: ["M6 10.5a6 6 0 0 1 12 0v3.7l1.6 2.6H4.4L6 14.2z", "M10 19.5a2 2 0 0 0 4 0"] },
};

/**
 * 알림 한 줄 (ADR-030). 알림 화면의 모든 알림이 이것 하나로 그려진다.
 * kind 종류(아이콘) · title 제목 · body 본문 · at 온 시각 · read 읽었는지 · action 아래에 보일 "누를 곳"의 글(없으면 보이지 않는다).
 * 제목과 온 시각이 한 줄에 놓이고 시각은 오른쪽 위에 붙는다. 제목이 길면 아래로 줄이 바뀌고 시각을 밀어내지 않는다.
 * 안 읽은 알림은 옅은 바탕 + 굵은 제목(+ 읽어 주는 기기에는 "안 읽음"), 읽은 알림은 바탕 없이 덜 굵은 제목.
 * 줄 어디를 눌러도 onOpen (누를 곳은 따로 누르는 단추가 아니라 같은 줄의 일부다)
 */
export function NotificationItem({
  kind,
  title,
  body,
  at,
  read,
  action = null,
  onOpen,
}: {
  kind: AlertKind;
  title: string;
  body: string;
  at: string;
  read: boolean;
  action?: string | null;
  onOpen: () => void;
}) {
  const look = LOOK[kind];
  return (
    <li>
      <button type="button" onClick={onOpen} className={`flex w-full items-start gap-3 rounded-2xl px-2 py-2 text-left active:!transform-none ${read ? "" : "bg-cream"}`}>
        <span aria-hidden className={`flex size-10 shrink-0 items-center justify-center rounded-full ${look.tone}`}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {look.paths.map((d) => <path key={d} d={d} />)}
          </svg>
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex items-baseline gap-2">
            <span className={`min-w-0 flex-1 text-base leading-snug break-keep wrap-anywhere ${read ? "font-medium" : "font-bold"}`}>
              <span className="sr-only">
                {read ? "" : "안 읽음. "}
                {look.name}.{" "}
              </span>
              {title}
            </span>
            <span className="shrink-0 text-[13px] leading-snug whitespace-nowrap text-muted">
              <TimeAgo iso={at} />
            </span>
          </span>
          <span className="text-[15px] leading-snug break-keep wrap-anywhere text-muted">{body}</span>
          {action && (
            <span className="mt-1 flex items-center gap-0.5 text-[15px] font-bold text-sage-deep">
              {action}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0">
                <path d="M9 5l7 7-7 7" />
              </svg>
            </span>
          )}
        </span>
      </button>
    </li>
  );
}
