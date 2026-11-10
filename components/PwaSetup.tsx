"use client";

import { useEffect } from "react";
import { registerServiceWorker, resyncPush } from "@/lib/push";

type InstallPrompt = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }> };

// 안드로이드 크롬이 주는 "홈 화면에 추가" 기회를 잡아 두었다가, 설치 버튼을 누를 때 쓴다
let deferred: InstallPrompt | null = null;
const listeners = new Set<() => void>();

export function canInstallApp(): boolean {
  return deferred !== null;
}

export function onInstallChange(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export async function installApp(): Promise<boolean> {
  if (!deferred) return false;
  await deferred.prompt();
  const { outcome } = await deferred.userChoice;
  deferred = null;
  listeners.forEach((l) => l());
  return outcome === "accepted";
}

/** 서비스 워커를 등록해 홈 화면 앱·알림을 쓸 수 있게 한다 */
export function PwaSetup() {
  useEffect(() => {
    registerServiceWorker().then(() => resyncPush().catch(() => {}));
    function onPrompt(e: Event) {
      e.preventDefault();
      deferred = e as InstallPrompt;
      listeners.forEach((l) => l());
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);
  return null;
}
