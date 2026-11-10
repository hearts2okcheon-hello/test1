"use client";

import { useEffect, useState } from "react";
import { errorMessage } from "@/lib/errors";
import { disablePush, enablePush, getPushState, isIos, isStandalone, type PushState } from "@/lib/push";
import { useToast } from "./Toast";

const TEXT = {
  owner: { title: "휴대폰 알림 받기", desc: "이웃 제보가 오거나, 여는 시간이 지났는데 오늘 소식이 없으면 바로 알려 드려요." },
  resident: { title: "즐겨찾기 가게 알림", desc: "즐겨찾는 가게가 문을 열거나, 재료가 떨어지거나, 임시휴무를 걸면 알려 드려요." },
} as const;

/** 홈 화면 앱 설치 + 휴대폰 알림 켜기 (ADR-013) */
export function AppAlertCard({ who }: { who: keyof typeof TEXT }) {
  const [state, setState] = useState<PushState | null>(null);
  const [standalone, setStandalone] = useState(true);
  const [ios, setIos] = useState(false);
  const [busy, setBusy] = useState(false);
  const { node, show } = useToast();

  useEffect(() => {
    setStandalone(isStandalone());
    setIos(isIos());
    getPushState().then(setState);
  }, []);

  if (state === null || (state === "unsupported" && !(ios && !standalone))) return null;
  const t = TEXT[who];

  async function turnOn() {
    setBusy(true);
    try {
      const s = await enablePush();
      setState(s);
      if (s === "on") show("알림을 켰어요! 소식이 생기면 휴대폰으로 알려 드릴게요.", "proud");
      else if (s === "denied") show("알림이 막혀 있어요. 휴대폰 설정에서 허용해 주세요.", "think");
    } catch (e) {
      show(errorMessage(e), "think");
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    setBusy(true);
    try {
      setState(await disablePush());
      show("알림을 껐어요.", "smile");
    } catch (e) {
      show(errorMessage(e), "think");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-2.5 rounded-[22px] border-2 border-yellow-line bg-cream px-4 py-3.5">
      <div className="flex items-start gap-2.5">
        <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden className="mt-0.5 shrink-0 text-yellow-deep" fill="currentColor">
          <path d="M12 2.5a1.6 1.6 0 0 1 1.6 1.6v.6a6.4 6.4 0 0 1 4.8 6.2v3.6l1.7 2.6a.9.9 0 0 1-.8 1.4H4.7a.9.9 0 0 1-.8-1.4l1.7-2.6v-3.6a6.4 6.4 0 0 1 4.8-6.2v-.6A1.6 1.6 0 0 1 12 2.5zm-2.6 17h5.2a2.6 2.6 0 0 1-5.2 0z" />
        </svg>
        <span className="flex flex-col gap-0.5">
          <span className="font-display text-xl leading-snug">{t.title}</span>
          <span className="text-[15px] leading-normal text-muted">{t.desc}</span>
        </span>
      </div>

      {(state === "need-install" || (ios && !standalone)) && (
        <p className="rounded-2xl bg-card px-3.5 py-2.5 text-[15px] leading-relaxed">
          아이폰은 홈 화면 앱에서만 알림을 받을 수 있어요. 홈 오른쪽 위 <b>앱 설치</b>를 눌러 추가한 뒤, 홈 화면의 옥!소리로 들어와 알림을 켜 주세요.
        </p>
      )}

      {state === "off" && (
        <button type="button" disabled={busy} onClick={turnOn} className="min-h-16 rounded-[18px] border-2 border-yellow-deep bg-yellow font-display text-xl disabled:opacity-50">
          {busy ? "켜는 중…" : "🔔 알림 켜기"}
        </button>
      )}
      {state === "on" && (
        <div className="flex items-center gap-2">
          <span className="flex-1 text-lg font-bold text-sage-deep">✓ 이 휴대폰으로 알림을 받고 있어요</span>
          <button type="button" disabled={busy} onClick={turnOff} className="min-h-11 rounded-2xl border-2 border-line bg-white px-3 text-sm font-bold">
            끄기
          </button>
        </div>
      )}
      {state === "denied" && (
        <p className="text-[15px] leading-relaxed text-[#A4423F]">
          알림이 막혀 있어요. 휴대폰 <b>설정 → 알림</b>에서 옥!소리(또는 크롬)를 허용한 뒤 다시 들어와 주세요.
        </p>
      )}
      {node}
    </section>
  );
}
