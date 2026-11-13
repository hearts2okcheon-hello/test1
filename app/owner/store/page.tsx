import { redirect } from "next/navigation";
import { BottomNav } from "@/components/BottomNav";
import { createClient } from "@/lib/supabase/server";
import type { OwnerHome, StoreDetail } from "@/lib/types";
import { OwnerPanel } from "../OwnerPanel";

export const dynamic = "force-dynamic";

/** 내 가게 (사장님 화면). 내 정보의 가게 표시를 눌러 들어온다 */
export default async function MyStorePage() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_owner_home");
  const home = (data ?? { state: "no_store", is_admin: false }) as OwnerHome;
  if (home.state !== "owner") redirect("/owner");

  const { data: d } = await supabase.rpc("get_store_detail", { p_store_id: home.store.store_id });
  const detail = d as StoreDetail | null;

  return (
    <>
      <main className="flex flex-1 flex-col gap-4 px-[18px] pt-4 pb-5">
        <OwnerPanel home={home} posts={detail?.posts ?? []} closures={detail?.closures ?? []} plans={detail?.plans ?? []} />
        <p className="mt-auto pt-2 text-sm leading-normal text-muted">앱이 어려우시면 옥천신문이 전화로 대신 올려드려요.</p>
      </main>
      <BottomNav />
    </>
  );
}
