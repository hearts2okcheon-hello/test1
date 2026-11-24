import { notFound, redirect } from "next/navigation";
import { BackButton } from "@/components/BackButton";
import { storyHref } from "@/lib/posts";
import { createClient } from "@/lib/supabase/server";
import { CommunityComposer } from "../../Community";
import type { CommunityPost } from "../../NewsList";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * 동네 이야기 하나를 고치는 화면 (ADR-025). 글의 점 세 개 메뉴 → 수정에서 온다.
 * 글쓴이 본인만 들어온다. 아니면 글 화면으로 돌려보낸다 (마지막 권한 검사는 update_community_post 가 다시 한다)
 */
export default async function StoryEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const supabase = await createClient();
  const { data } = await supabase.rpc("get_community_post", { p_post_id: id });
  const post = ((data ?? []) as CommunityPost[])[0];
  if (!post) notFound();
  if (!post.is_mine) redirect(storyHref(id));

  return (
    <main className="flex flex-1 flex-col gap-4 px-5 pt-5 pb-8">
      <header className="flex items-center gap-2.5">
        <BackButton fallback={storyHref(id)} />
        <h1 className="font-display text-[23px] font-normal">동네 이야기 고치기</h1>
      </header>
      <CommunityComposer signedIn post={{ id: post.id, body: post.body }} />
    </main>
  );
}
