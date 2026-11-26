"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { alertAction, alertGroup, alertKind, alertTitle, markAlertRead, showBadge, type AlertItem } from "@/lib/alerts";
import { errorMessage } from "@/lib/errors";
import { pushWithLoading } from "@/lib/nav";
import { disablePush, enablePush, getPushState, type PushState } from "@/lib/push";
import { createClient } from "@/lib/supabase/client";
import { Bell } from "./AlertButton";
import { NotificationItem } from "./NotificationItem";
import { useToast } from "./Toast";

const GROUPS = ["오늘", "이번 주", "이전"] as const;

/**
 * 알림 켜기 · 끄기 카드. 높이는 정해 두지 않고 안의 글에 맞춘다 (안내 글을 줄인 만큼 안쪽 여백과 줄 사이도 줄였다).
 * 켜고 끌 수 있을 때(on · off)만 오른쪽에 버튼이 있다
 */
export function PushSwitchCard({ state, busy, onToggle }: { state: PushState; busy: boolean; onToggle: () => void }) {
  const on = state === "on";
  const canToggle = state === "on" || state === "off";
  return (
    <section className={`flex items-center gap-3 rounded-[22px] border-2 bg-card px-3.5 py-2.5 ${on ? "border-sage" : "border-coral"}`}>
      <span className={`flex size-11 shrink-0 items-center justify-center rounded-full ${on ? "bg-yellow-soft text-olive" : "bg-coral-soft text-danger"}`}>
        <Bell off={!on} size={26} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-display text-lg leading-tight">{on ? "알림이 켜져 있어요" : state === "denied" ? "알림이 막혀 있어요" : "알림이 꺼져 있어요"}</span>
        <span className="text-[13px] leading-snug text-balance break-keep text-muted">
          {on
            ? "가게 소식, 제보 답장, 사장님 알림을 받아요."
            : state === "denied"
              ? "휴대폰 설정 → 앱 → 옥!소리 → 알림에서 허용해 주세요."
              : state === "off"
                ? "켜면 즐겨찾는 가게 소식을 휴대폰으로 알려 드려요."
                : "홈 화면에 앱을 추가하면 휴대폰 알림을 받을 수 있어요."}
        </span>
      </span>
      {canToggle && (
        <button type="button" disabled={busy} onClick={onToggle} className={`min-h-11 shrink-0 rounded-2xl border-2 px-3.5 text-[15px] font-bold disabled:opacity-60 ${on ? "border-line bg-white" : "border-yellow-deep bg-yellow"}`}>
          {busy ? "…" : on ? "끄기" : "켜기"}
        </button>
      )}
    </section>
  );
}

/**
 * 받은 알림 목록 (ADR-030). 위에 알림 켜기·끄기, 그 아래 안 읽은 수와 "모두 읽음", 그리고 오늘 · 이번 주 · 이전으로 묶은 알림.
 * 알림 한 줄은 components/NotificationItem 하나로 그린다. 누르면 읽음으로 바뀌고 그 알림의 화면으로 간다.
 * 할 일이 남은 오픈 시간 확인에는 "영업 상태 설정"이 보인다 (남았는지는 DB 가 정해서 준다)
 */
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

  return (
    <>
      {state !== null && <PushSwitchCard state={state} busy={busy} onToggle={toggle} />}

      {alerts.length === 0 ? (
        <p className="rounded-[20px] border-2 border-dashed border-line px-4 py-6 text-center text-[15px] leading-relaxed text-muted">
          아직 받은 알림이 없어요.
          <br />
          가게에 ☆를 눌러 즐겨찾으면 소식이 여기에 쌓여요.
        </p>
      ) : (
        <>
          {/* 왼쪽에 안 읽은 수, 오른쪽에 모두 읽음 (안 읽은 알림이 있을 때만). 버튼이 없어져도 줄 높이는 그대로 */}
          <div className="flex min-h-11 items-center justify-between gap-3">
            <span className="text-sm text-muted">
              안 읽은 알림 <b className="text-ink">{unread}</b>개
            </span>
            {unread > 0 && (
              <button type="button" onClick={readAll} className="min-h-11 shrink-0 rounded-full border-2 border-line bg-card px-3.5 text-sm font-bold">
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
                {/* 알림 사이에는 선을 긋지 않고 20px 띄운다 (줄마다 위아래 8px + 사이 4px) */}
                <ul className="flex flex-col gap-1 rounded-[22px] border-2 border-line bg-card p-1.5">
                  {rows.map((a) => (
                    <NotificationItem
                      key={a.id}
                      kind={alertKind(a.kind)}
                      title={alertTitle(a.title)}
                      body={a.body}
                      at={a.created_at}
                      read={isRead(a)}
                      action={alertAction(a)?.label ?? null}
                      onOpen={() => open(a)}
                    />
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
