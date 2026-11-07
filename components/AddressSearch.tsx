"use client";

import { useEffect, useRef, useState } from "react";

// 카카오 우편번호 서비스. 앱 키 없이 쓴다
const SCRIPT_URL = "https://t1.kakaocdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";

type PostcodeResult = { roadAddress: string; jibunAddress: string; address: string };
type PostcodeApi = { new (o: { oncomplete: (d: PostcodeResult) => void; width: string; height: string }): { embed: (el: HTMLElement, o?: { q?: string; autoClose?: boolean }) => void } };
declare global {
  interface Window {
    kakao?: { Postcode?: PostcodeApi };
    daum?: { Postcode?: PostcodeApi };
  }
}

let loading: Promise<PostcodeApi> | null = null;
function loadPostcode(): Promise<PostcodeApi> {
  const ready = () => window.kakao?.Postcode ?? window.daum?.Postcode;
  const now = ready();
  if (now) return Promise.resolve(now);
  loading ??= new Promise<PostcodeApi>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SCRIPT_URL;
    s.onload = () => {
      const api = ready();
      if (api) resolve(api);
      else reject(new Error("postcode"));
    };
    s.onerror = () => {
      loading = null;
      reject(new Error("postcode"));
    };
    document.head.appendChild(s);
  });
  return loading;
}

/** 주소·건물 이름으로 찾아 누르면 주소를 가져온다 */
export function AddressSearch({ onPick }: { onPick: (address: string) => void }) {
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const pick = useRef(onPick);
  pick.current = onPick;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    loadPostcode()
      .then((Postcode) => {
        if (cancelled || !box.current) return;
        new Postcode({
          width: "100%",
          height: "100%",
          oncomplete: (d) => {
            pick.current(d.roadAddress || d.jibunAddress || d.address);
            setOpen(false);
          },
        }).embed(box.current, { q: "옥천군 ", autoClose: false });
      })
      .catch(() => {
        if (cancelled) return;
        setOpen(false);
        setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setFailed(false);
          setOpen(true);
        }}
        className="min-h-14 rounded-2xl border-2 border-yellow-deep bg-yellow text-lg font-bold"
      >
        카카오에서 주소 찾기
      </button>
      {failed && <p role="alert" className="text-base font-bold text-[#A4423F]">주소 찾기를 열지 못했어요. 위 칸에 직접 적어 주세요.</p>}
      {open && (
        <div role="dialog" aria-modal="true" aria-label="카카오에서 주소 찾기" className="fixed inset-0 z-[120] mx-auto flex max-w-[480px] flex-col bg-paper">
          <div className="flex items-center gap-2 border-b-2 border-line px-[18px] py-2">
            <span className="flex-1 font-display text-xl">주소·건물 이름으로 찾기</span>
            <button type="button" onClick={() => setOpen(false)} className="min-h-12 rounded-2xl border-2 border-line bg-card px-4 text-base font-bold">
              닫기
            </button>
          </div>
          <div ref={box} className="min-h-0 flex-1" />
        </div>
      )}
    </>
  );
}
