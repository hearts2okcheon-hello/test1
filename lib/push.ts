"use client";

import { createClient, ensureSession } from "./supabase/client";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

export type PushState =
  | "unsupported" // 이 브라우저는 알림을 못 받음
  | "need-install" // 아이폰: 홈 화면에 추가해야 알림을 받음
  | "denied" // 알림을 막아 둠 (휴대폰 설정에서 풀어야 함)
  | "off"
  | "on";

export function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function isStandalone(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
}

function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch {
    return null;
  }
}

export async function getPushState(): Promise<PushState> {
  if (!VAPID_PUBLIC || !("serviceWorker" in navigator)) return "unsupported";
  if (!("PushManager" in window) || !("Notification" in window)) return isIos() && !isStandalone() ? "need-install" : "unsupported";
  if (Notification.permission === "denied") return "denied";
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return sub ? "on" : "off";
}

/** 알림 허용을 묻고, 이 기기를 옥!소리 알림 받는 기기로 저장한다 */
export async function enablePush(): Promise<PushState> {
  if (!VAPID_PUBLIC) return "unsupported";
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "denied" : "off";
  const reg = (await registerServiceWorker()) ?? (await navigator.serviceWorker.ready);
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64ToBytes(VAPID_PUBLIC) }));
  const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
  const supabase = createClient();
  await ensureSession(supabase);
  const { error } = await supabase.rpc("save_push_subscription", { p_endpoint: json.endpoint, p_p256dh: json.keys.p256dh, p_auth: json.keys.auth });
  if (error) throw error;
  return "on";
}

export async function disablePush(): Promise<PushState> {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await createClient().rpc("delete_push_subscription", { p_endpoint: sub.endpoint });
    await sub.unsubscribe();
  }
  return "off";
}

/** 로그인 계정이 바뀌어도(카카오 로그인 등) 알림이 새 계정으로 가도록 다시 저장한다 */
export async function resyncPush(): Promise<void> {
  if (!VAPID_PUBLIC || !("serviceWorker" in navigator) || Notification.permission !== "granted") return;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  if (!data.session) return;
  const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
  await supabase.rpc("save_push_subscription", { p_endpoint: json.endpoint, p_p256dh: json.keys.p256dh, p_auth: json.keys.auth });
}
