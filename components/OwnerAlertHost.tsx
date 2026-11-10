"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { errorMessage } from "@/lib/errors";
import { createClient } from "@/lib/supabase/client";
import type { OwnerHome, OwnerQuestion } from "@/lib/types";
import { ReportAlert } from "./ReportAlert";
import { useToast } from "./Toast";

const POLL_MS = 60_000;

/**
 * 사장님이 어느 탭에 있든 "이웃 제보가 왔어요" 띠를 맨 위에 띄운다.
 * 로그인한 사람만 확인하고, 관리자 화면·로그인 과정에서는 띄우지 않는다
 */
export function OwnerAlertHost() {
  const pathname = usePathname();
  const router = useRouter();
  const { node, show } = useToast();
  const [store, setStore] = useState<string | null>(null);
  const [questions, setQuestions] = useState<OwnerQuestion[]>([]);
  const [busy, setBusy] = useState(false);
  const hidden = pathname.startsWith("/admin") || pathname.startsWith("/auth");

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      setQuestions([]);
      return;
    }
    const { data } = await supabase.rpc("get_owner_home");
    const home = data as OwnerHome | null;
    if (home?.state === "owner") {
      setStore(home.store.store_id);
      setQuestions(home.questions);
    } else {
      setQuestions([]);
    }
  }, []);

  useEffect(() => {
    if (hidden) return;
    load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [hidden, load, pathname]);

  async function reply(open: boolean, memo: string) {
    if (!store) return false;
    setBusy(true);
    try {
      const { error } = await createClient().rpc("reply_reports", { p_store_id: store, p_open: open, p_memo: memo || null });
      if (error) throw error;
      show("이웃에게 알렸어요. 팻말을 바꿔 걸었어요!", "proud");
      setQuestions([]);
      router.refresh();
      return true;
    } catch (e) {
      show(errorMessage(e), "think");
      load();
      return false;
    } finally {
      setBusy(false);
    }
  }

  if (hidden) return null;
  return (
    <>
      <ReportAlert questions={questions} busy={busy} onReply={reply} className="mx-[18px] mt-3 -mb-1" />
      {node}
    </>
  );
}
