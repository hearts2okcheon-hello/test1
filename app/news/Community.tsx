"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SubmitButton, SubmitError, useSubmit } from "@/components/SubmitButton";
import { useToast } from "@/components/Toast";
import { goBackRefreshed } from "@/lib/nav";
import { storyHref } from "@/lib/posts";
import { afterPostHref } from "@/lib/submit";
import { createClient } from "@/lib/supabase/client";

const BODY_MAX = 500;

/**
 * 동네 이야기 쓰기·고치기. 카카오 로그인한 사람만 쓴다 (ADR-012).
 * 올리면 버튼에 "올렸어요!"가 잠깐 보인 뒤 소통광장의 동네 이야기 줄로 간다 (방금 올린 글이 맨 위에 있다. 따로 알림 창은 없다, ADR-028).
 * post 가 있으면 그 글을 고친다 (글쓴이 본인만, ADR-025). 저장하면 들어온 화면으로 돌아간다
 */
export function CommunityComposer({ signedIn, post = null }: { signedIn: boolean; post?: { id: string; body: string } | null }) {
  const router = useRouter();
  const { node, show } = useToast();
  const submit = useSubmit();
  const [body, setBody] = useState(post?.body ?? "");

  function send() {
    if (submit.locked) return;
    if (!body.trim()) return show("내용을 써 주세요.", "think");
    submit.run(
      async () => {
        const supabase = createClient();
        const { error } = post
          ? await supabase.rpc("update_community_post", { p_post_id: post.id, p_body: body.trim() })
          : await supabase.rpc("post_community", { p_body: body.trim() });
        if (error) throw error;
      },
      {
        then: () => {
          if (post) return goBackRefreshed(router, storyHref(post.id));
          router.replace(afterPostHref("story"));
          router.refresh();
        },
      },
    );
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
        send();
      }}
    >
      <label htmlFor="community-body" className="sr-only">동네 이야기</label>
      <textarea id="community-body" value={body} maxLength={BODY_MAX} rows={7} autoFocus onChange={(e) => setBody(e.target.value)} placeholder="우리 동네 이야기를 나눠 보세요" className="w-full rounded-2xl border-2 border-line bg-white p-3 text-base leading-relaxed" />
      <p className="text-xs leading-normal text-muted">화면에는 익명으로 보여요. 문제가 있는 글은 옥천신문이 작성 계정을 확인할 수 있어요.</p>
      <SubmitError message={submit.error} />
      <SubmitButton kind={post ? "save" : "post"} phase={submit.phase} disabled={!body.trim()} className="min-h-12 rounded-2xl font-display text-lg disabled:opacity-50" />
      {node}
    </form>
  );
}
