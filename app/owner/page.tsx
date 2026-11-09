import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminDoor } from "@/components/AdminDoor";
import { BottomNav } from "@/components/BottomNav";
import { SignOutButton } from "@/components/SignOutButton";
import { createClient } from "@/lib/supabase/server";
import type { OwnerHome, StoreDetail } from "@/lib/types";
import { KakaoLogin } from "./KakaoLogin";
import { OwnerPanel } from "./OwnerPanel";

export const dynamic = "force-dynamic";

export default async function OwnerPage({ searchParams }: { searchParams: Promise<{ login?: string }> }) {
  const { login } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_owner_home");
  const home = (data ?? { state: "no_store", is_admin: false }) as OwnerHome;

  // 카카오로 로그인했는데 가게가 아직 없다
  if (home.state === "needs_store") redirect("/owner/register");

  let detail: StoreDetail | null = null;
  if (home.state === "owner") {
    const { data: d } = await supabase.rpc("get_store_detail", { p_store_id: home.store.store_id });
    detail = d as StoreDetail | null;
  }

  return (
    <>
      <main className="flex flex-1 flex-col gap-4 px-[18px] pt-4 pb-5">
        {home.state !== "owner" && (
          <div className="flex justify-end">
            <AdminDoor href={home.is_admin ? "/admin" : "/admin/login"} />
          </div>
        )}
        {home.state === "owner" ? (
          <OwnerPanel home={home} posts={detail?.posts ?? []} closures={detail?.closures ?? []} />
        ) : (
          <KakaoLogin failed={login === "failed"} />
        )}

        <div className="mt-auto flex items-center gap-2 pt-2">
          <p className="flex-1 text-sm leading-normal text-muted">
            {home.state === "owner" ? "앱이 어려우시면 옥천신문이 전화로 대신 올려드려요." : ""}
          </p>
          {home.is_admin && (
            <Link href="/admin" className="min-h-11 rounded-2xl border-2 border-line bg-card px-3.5 py-2.5 text-sm font-bold">
              관리자
            </Link>
          )}
          {home.state === "owner" && <SignOutButton label="로그아웃" />}
        </div>
      </main>
      <BottomNav />
    </>
  );
}
