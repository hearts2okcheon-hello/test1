"use client";

import { useEffect } from "react";
import { staleAfterSignOut } from "@/lib/signout";
import { createClient } from "@/lib/supabase/client";

/**
 * 로그아웃한 뒤에는 로그인했을 때 그린 화면이 남아 있으면 안 된다 (ADR-027).
 * 로그아웃한 탭은 화면을 통째로 새로 받지만, 뒤로 가기로 되살아난 화면이나 다른 탭에 남아 있던 화면은 그대로다.
 * 그런 화면이 다시 보일 때, 그릴 때는 로그인해 있었는데 지금은 아니면 새로 받는다 (서버가 비로그인 화면을 준다).
 * 로그인 정보는 이 기기에 있는 것을 읽을 뿐이라 서버에 묻지 않는다
 */
export function SessionGuard() {
  useEffect(() => {
    const supabase = createClient();
    const signedIn = async () => {
      const { data, error } = await supabase.auth.getSession();
      // 읽지 못한 것(연결이 끊겨 로그인 정보를 새로 받지 못함 등)은 로그아웃이 아니다
      if (error) throw error;
      return !!data.session && !data.session.user.is_anonymous;
    };
    // 이 화면을 그릴 때 로그인해 있었는가 (익명 세션은 로그인으로 치지 않는다)
    let was = false;
    signedIn().then(
      (v) => (was = v),
      () => {},
    );

    async function check() {
      // 연결이 끊겨 있으면 새로 받을 수도 없으니 그대로 둔다
      if (!was || navigator.onLine === false) return;
      try {
        if (staleAfterSignOut(was, await signedIn())) window.location.reload();
      } catch {
        // 확인하지 못하면 그대로 둔다. 다음에 화면을 옮길 때 서버가 다시 확인한다
      }
    }
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) check();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    window.addEventListener("pageshow", onShow);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("pageshow", onShow);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
