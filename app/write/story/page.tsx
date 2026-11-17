import { BackButton } from "@/components/BackButton";
import { createClient } from "@/lib/supabase/server";
import { CommunityComposer } from "../../news/Community";

export const dynamic = "force-dynamic";

/** 동네 이야기 쓰기. 소통광장의 쓰기 버튼에서 들어온다 */
export default async function StoryWritePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const signedIn = !!data.user && !data.user.is_anonymous;

  return (
    <main className="flex flex-1 flex-col gap-4 px-5 pt-5 pb-8">
      <header className="flex items-center gap-2.5">
        <BackButton />
        <h1 className="font-display text-[23px] font-normal">동네 이야기 쓰기</h1>
      </header>
      <CommunityComposer signedIn={signedIn} />
    </main>
  );
}
