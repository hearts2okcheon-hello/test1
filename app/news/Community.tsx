"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/Toast";
import { errorMessage } from "@/lib/errors";
import { goBackRefreshed } from "@/lib/nav";
import { storyHref } from "@/lib/posts";
import { createClient } from "@/lib/supabase/client";

const BODY_MAX = 500;

/**
 * 동네 이야기 쓰기·고치기. 카카오 로그인한 사람만 쓴다 (ADR-012).
 * post 가 있으면 그 글을 고친다 (글쓴이 본인만, ADR-025). 저장하면 들어온 화면으로 돌아간다
 */
export function CommunityComposer({ signedIn, post = null }: { signedIn: boolean; post?: { id: string; body: string } | null }) {
  const router = useRouter();
  const { node, show } = useToast();
  const [body, setBody] = useState(post?.body ?? "");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!body.trim()) return show("내용을 써 주세요.", "think");
    setBusy(true);
    const supabase = createClient();
    const { error } = post
      ? await supabase.rpc("update_community_post", { p_post_id: post.id, p_body: body.trim() })
      : await supabase.rpc("post_community", { p_body: body.trim() });
    if (error) {
      setBusy(false);
      return show(errorMessage(error), "think");
    }
    if (post) return goBackRefreshed(router, storyHref(post.id));
    setBusy(false);
    setBody("");
    show("동네 이야기를 올렸어요!", "proud");
    router.replace("/news?tab=community");
    router.refresh();
  }

  if (!signedIn) {
    return (
      <a href="/auth/kakao?next=/write/story" className="flex min-h-14 items-center justify-center gap-2 rounded-[22px] bg-[#FEE500] text-lg font-bold text-black/85">
        카카오로 로그인하고 글쓰기
      </a>
    );
  }

  return (
    <form
      className="flex flex-col gap-2 rounded-[22px] border-2 border-line bg-card p-3.5"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <label htmlFor="community-body" className="sr-only">동네 이야기</label>
      <textarea id="community-body" value={body} maxLength={BODY_MAX} rows={7} autoFocus onChange={(e) => setBody(e.target.value)} placeholder="우리 동네 이야기를 나눠 보세요" className="w-full rounded-2xl border-2 border-line bg-white p-3 text-base leading-relaxed" />
      <p className="text-xs leading-normal text-muted">화면에는 익명으로 보여요. 문제가 있는 글은 옥천신문이 작성 계정을 확인할 수 있어요.</p>
      <button type="submit" disabled={busy || !body.trim()} className="min-h-12 rounded-2xl border-2 border-sage-deep bg-sage font-display text-lg text-white disabled:opacity-50">
        {busy ? (post ? "저장하는 중…" : "올리는 중…") : post ? "고친 내용 저장" : "올리기"}
      </button>
      {node}
    </form>
  );
}
