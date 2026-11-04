"use client";

import { useEffect } from "react";
import { createClient, visitorId } from "@/lib/supabase/client";

/** 재방문율 측정 (design §7). 실패해도 화면에는 영향 없음 */
export function PageView({ name = "page_view", storeId }: { name?: "page_view" | "store_view"; storeId?: string }) {
  useEffect(() => {
    const id = visitorId();
    if (!id) return;
    try {
      createClient()
        .rpc("log_event", { p_name: name, p_anon_id: id, p_store_id: storeId ?? null })
        .then(() => undefined, () => undefined);
    } catch {
      // 설정이 없을 때도 화면은 그대로 둔다
    }
  }, [name, storeId]);
  return null;
}
