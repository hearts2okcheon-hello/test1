"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { alertGroup, markAlertRead, showBadge, type AlertItem } from "@/lib/alerts";
import { errorMessage } from "@/lib/errors";
import { pushWithLoading } from "@/lib/nav";
import { disablePush, enablePush, getPushState, type PushState } from "@/lib/push";
import { createClient } from "@/lib/supabase/client";
import { Bell } from "./AlertButton";
import { TimeAgo } from "./TimeAgo";
import { useToast } from "./Toast";

const GROUPS = ["오늘", "이번 주", "이전"] as const;

/** 받은 알림 목록. 안 읽은 알림은 앞에 파란 점, 누르면 읽음으로 바뀌고 그 화면으로 간다 */
export function AlertList({ alerts }: { alerts: AlertItem[] }) {
  const router = useRouter();
  const { node, show } = useToast();
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const [read, setRead] = useState<Set<number>>(new Set());
  const isRead = (a: AlertItem) => a.is_read || read.has(a.id);
  const unread = alerts.filter((a) => !isRead(a)).length;

  useEffect(() => {
    getPushState().then(setState);
  }, []);
  useEffect(() => setRead(new Set()), [alerts]);

  async function toggle() {
    setBusy(true);
    try {
      if (state === "on") {
        setState(await disablePush());
        show("알림을 껐어요.", "smile");
      } else {
        const s = await enablePush();
        setState(s);
        if (s === "on") show("알림을 켰어요! 소식이 생기면 휴대폰으로 알려 드릴게요.", "proud");
      }
    } catch (e) {
      show(errorMessage(e), "think");
    } finally {
      setBusy(false);
    }
  }

  function open(a: AlertItem) {
    if (!isRead(a)) {
      setRead((s) => new Set(s).add(a.id));
      markAlertRead(a.id).catch(() => {});
    }
    pushWithLoading(router, a.url || "/");
  }

  async function readAll() {
    setRead(new Set(alerts.map((a) => a.id)));
    showBadge(0);
    const { error } = await createClient().rpc("mark_all_alerts_read");
    if (error) show(errorMessage(error), "think");
    router.refresh();
  }

  const on = state === "on";
  const canToggle = state === "on" || state === "off";

  return (
    <>
      {/* 알림 켜기 · 끄기 */}
      {state !== null && (
        <section className={`flex items-center gap-3 rounded-[22px] border-[2.5px] bg-card px-4 py-3.5 ${on ? "border-sage" : "border-coral"}`}>
          <span className={`flex size-11 shrink-0 items-center justify-center rounded-full ${on ? "bg-yellow-soft text-olive" : "bg-coral-soft text-danger"}`}>
            <Bell off={!on} size={26} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="font-display text-lg leading-snug">{on ? "알림이 켜져 있어요" : state === "denied" ? "알림이 막혀 있어요" : "알림이 꺼져 있어요"}</span>
            <span className="text-[13px] leading-normal text-muted">
              {on
                ? "즐겨찾는 가게 소식, 제보 답장, 사장님 알림이 와요."
                : state === "denied"
                  ? "휴대폰 설정 → 앱 → 옥!소리 → 알림에서 허용해 주세요."
                  : state === "off"
                    ? "켜면 즐겨찾는 가게 소식을 휴대폰으로 알려 드려요."
                    : "홈 화면에 앱을 추가하면 휴대폰 알림을 받을 수 있어요."}
            </span>
          </span>
          {canToggle && (
            <button type="button" disabled={busy} onClick={toggle} className={`min-h-11 shrink-0 rounded-2xl border-2 px-3.5 text-[15px] font-bold disabled:opacity-60 ${on ? "border-line bg-white" : "border-yellow-deep bg-yellow"}`}>
              {busy ? "…" : on ? "끄기" : "켜기"}
            </button>
          )}
        </section>
      )}

      {alerts.length === 0 ? (
        <p className="rounded-[20px] border-2 border-dashed border-line px-4 py-6 text-center text-[15px] leading-relaxed text-muted">
          아직 받은 알림이 없어요.
          <br />
          가게에 ☆를 눌러 즐겨찾으면 소식이 여기에 쌓여요.
        </p>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted">
              안 읽은 알림 <b className="text-ink">{unread}</b>개
            </span>
            {unread > 0 && (
              <button type="button" onClick={readAll} className="min-h-11 rounded-full border-2 border-line bg-card px-3.5 text-sm font-bold">
                모두 읽음
              </button>
            )}
          </div>
          {GROUPS.map((g) => {
            const rows = alerts.filter((a) => alertGroup(a.created_at) === g);
            if (rows.length === 0) return null;
            return (
              <section key={g} aria-label={g} className="flex flex-col gap-1.5">
                <h2 className="px-1 text-sm font-bold text-muted">{g}</h2>
                <ul className="ok-sticker flex flex-col rounded-[22px] border-2 border-line bg-card px-3">
                  {rows.map((a, i) => (
                    <li key={a.id} className={i > 0 ? "border-t-2 border-line" : ""}>
                      <button type="button" onClick={() => open(a)} className="flex w-full items-start gap-2.5 py-3 text-left active:!transform-none">
                        <span aria-hidden className={`mt-[9px] size-2 shrink-0 rounded-full ${isRead(a) ? "bg-transparent" : "bg-blue"}`} />
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className={`text-base leading-snug ${isRead(a) ? "text-muted" : "font-bold"}`}>
                            {!isRead(a) && <span className="sr-only">안 읽음. </span>}
                            {a.title}
                          </span>
                          <span className={`text-[15px] leading-snug ${isRead(a) ? "text-muted" : ""}`}>{a.body}</span>
                          <span className="text-[13px] text-muted">
                            <TimeAgo iso={a.created_at} />
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </>
      )}
      {node}
    </>
  );
}
