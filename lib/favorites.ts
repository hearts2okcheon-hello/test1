"use client";

import { useSyncExternalStore } from "react";
import { createClient, ensureSession } from "./supabase/client";

// 즐겨찾기 가게 id 를 한 곳에 두고, 별을 누르면 모든 화면이 함께 바뀐다
// 주의: 서버에서는 이 값을 쓰지 않는다 (요청끼리 섞이지 않게 서버 스냅샷은 항상 비어 있음)
type State = { ids: Set<string>; ready: boolean };
let ids = new Set<string>();
let loaded = false;
let loading: Promise<void> | null = null;
let state: State = { ids, ready: false };
const listeners = new Set<() => void>();
const SERVER: State = { ids: new Set<string>(), ready: false };

function emit() {
  ids = new Set(ids);
  state = { ids, ready: loaded };
  listeners.forEach((l) => l());
}

/** 서버에서 이미 읽어 온 목록이 있으면 그것으로 시작한다 */
export function seedFavorites(list: string[]) {
  if (loaded) return;
  loaded = true;
  ids = new Set(list);
  emit();
}

async function loadOnce() {
  if (loaded) return;
  loading ??= (async () => {
    const supabase = createClient();
    const { data: s } = await supabase.auth.getSession();
    // 세션이 없으면 아직 즐겨찾기가 없다. 별을 처음 누를 때 익명 세션을 만든다
    if (s.session) {
      const { data } = await supabase.rpc("get_my_favorites");
      if (!loaded) ids = new Set((data ?? []) as string[]);
    }
    loaded = true;
    emit();
  })();
  await loading;
}

/** ready 가 false 면 아직 모른다 (첫 화면은 서버가 준 목록을 쓴다) */
export function useFavorites(): State {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      loadOnce();
      return () => listeners.delete(l);
    },
    () => state,
    () => SERVER,
  );
}

/** 누르는 즉시 바꾸고, 저장에 실패하면 되돌린다 */
export async function toggleFavorite(storeId: string): Promise<{ on: boolean; error?: unknown }> {
  const on = !ids.has(storeId);
  if (on) ids.add(storeId);
  else ids.delete(storeId);
  emit();
  try {
    const supabase = createClient();
    await ensureSession(supabase);
    const { error } = await supabase.rpc("toggle_favorite", { p_store_id: storeId, p_on: on });
    if (error) throw error;
    return { on };
  } catch (error) {
    if (on) ids.delete(storeId);
    else ids.add(storeId);
    emit();
    return { on: !on, error };
  }
}
