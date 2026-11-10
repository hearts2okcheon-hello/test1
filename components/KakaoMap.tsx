"use client";

import { useEffect, useRef, useState } from "react";
import { kakaoMapUrl } from "@/lib/hours";
import { MapTile } from "./MapTile";

// 카카오 지도 JavaScript 키 (공개용 키). 없으면 지금처럼 지도 그림을 보여 준다
const JS_KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;

type KakaoMaps = {
  load(cb: () => void): void;
  LatLng: new (lat: number, lng: number) => unknown;
  Map: new (el: HTMLElement, opts: Record<string, unknown>) => { relayout(): void; setCenter(p: unknown): void };
  Marker: new (opts: Record<string, unknown>) => unknown;
  services: { Geocoder: new () => { addressSearch(addr: string, cb: (r: { x: string; y: string }[], status: string) => void): void }; Status: { OK: string } };
};
// 우편번호 검색(AddressSearch)도 window.kakao 를 쓰므로 여기서는 따로 꺼내 본다
const kakaoMaps = () => (window as unknown as { kakao?: { maps?: KakaoMaps } }).kakao?.maps;

let sdk: Promise<KakaoMaps> | null = null;
function loadSdk(): Promise<KakaoMaps> {
  sdk ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${JS_KEY}&autoload=false&libraries=services`;
    s.async = true;
    s.onload = () => {
      const maps = kakaoMaps();
      if (maps) maps.load(() => resolve(maps));
      else reject(new Error("kakao"));
    };
    s.onerror = () => {
      sdk = null;
      reject(new Error("kakao"));
    };
    document.head.appendChild(s);
  });
  return sdk;
}

/** 위치 & 바로 연결: 카카오 지도에 가게 위치를 핀으로. 키가 없거나 주소를 못 찾으면 지도 그림 */
export function KakaoMap({ address, name }: { address: string; name: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(!JS_KEY);

  useEffect(() => {
    if (!JS_KEY || !box.current) return;
    let alive = true;
    loadSdk()
      .then((maps) => {
        new maps.services.Geocoder().addressSearch(address, (result, status) => {
          if (!alive || !box.current) return;
          if (status !== maps.services.Status.OK || !result[0]) return setFailed(true);
          const pos = new maps.LatLng(Number(result[0].y), Number(result[0].x));
          const map = new maps.Map(box.current, { center: pos, level: 3 });
          new maps.Marker({ map, position: pos, title: name });
        });
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [address, name]);

  if (failed) return <MapTile address={address} />;

  // isolate: 카카오 지도 안의 z-index 가 아래 고정 버튼 위로 새어 나오지 않게 가둔다
  return (
    <div className="relative isolate z-0" data-no-swipe>
      <div ref={box} role="img" aria-label={`${name} 위치 지도`} className="aspect-[2/1] w-full overflow-hidden rounded-2xl border-2 border-line bg-cream" />
      <a
        href={kakaoMapUrl(address)}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute right-2 bottom-2 z-10 rounded-xl border-2 border-line bg-card px-2.5 py-1 text-sm font-bold"
      >
        카카오맵 열기 ›
      </a>
    </div>
  );
}
