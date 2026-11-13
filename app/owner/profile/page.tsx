import { redirect } from "next/navigation";
import { ProfileEditor } from "@/components/ProfileEditor";
import { createClient } from "@/lib/supabase/server";
import type { OwnerHome } from "@/lib/types";

export const dynamic = "force-dynamic";

/** 내 정보 등록하기 · 고치기 (ADR-014). 카카오 로그인한 사람만 */
export default async function ProfilePage() {
  const supabase = await createClient();
  const [{ data }, { data: auth }] = await Promise.all([supabase.rpc("get_owner_home"), supabase.auth.getUser()]);
  const home = (data ?? { state: "no_store", is_admin: false }) as OwnerHome;
  if (home.state === "no_store" || !auth.user) redirect("/owner");

  return (
    <main className="flex flex-1 flex-col px-[18px] pt-4">
      <ProfileEditor userId={auth.user.id} initial={home.profile} />
    </main>
  );
}
