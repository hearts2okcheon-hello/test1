import { notFound } from "next/navigation";
import { BackButton } from "@/components/BackButton";
import { CommunityView } from "@/components/CommunityView";
import { PageView } from "@/components/PageView";
import { createClient } from "@/lib/supabase/server";
import type { CommunityPost } from "../NewsList";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 동네 이야기 하나를 전체 화면으로 보고 공감·댓글을 남긴다 */
export default async function CommunityPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const supabase = await createClient();
  const [postRes, auth, admin] = await Promise.all([supabase.rpc("get_community_post", { p_post_id: id }), supabase.auth.getUser(), supabase.rpc("okc_is_admin")]);
  const post = ((postRes.data ?? []) as CommunityPost[])[0];
  if (!post) notFound();
  const signedIn = !!auth.data.user && !auth.data.user.is_anonymous;

  return (
    <>
      <header className="flex items-center gap-2.5 px-5 pt-4 pb-2">
        <BackButton />
        <h1 className="font-display text-[21px] font-normal">동네 이야기</h1>
      </header>
      <main className="flex flex-1 flex-col gap-[18px] px-5 pt-1 pb-4">
        <CommunityView post={post} signedIn={signedIn} isAdmin={!!admin.data && signedIn} />
      </main>
      <PageView />
    </>
  );
}
