import Link from "next/link";
import { redirect } from "next/navigation";
import { BottomNav } from "@/components/BottomNav";
import { Osori } from "@/components/Osori";
import { SignOutButton } from "@/components/SignOutButton";
import { createClient } from "@/lib/supabase/server";
import type { OwnerHome } from "@/lib/types";
import { OwnerPanel } from "./OwnerPanel";

export const dynamic = "force-dynamic";

export default async function OwnerPage() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_owner_home");
  const home = (data ?? { state: "signed_out" }) as OwnerHome;

  if (home.state === "signed_out") redirect("/owner/login");

  return (
    <>
      <main className="flex flex-1 flex-col gap-4 px-[18px] pt-4 pb-5">
        {home.state === "owner" ? (
          <OwnerPanel home={home} />
        ) : (
          <section className="flex flex-col items-center gap-3 rounded-[22px] border-2 border-line bg-card px-5 py-6 text-center">
            <Osori mood={home.state === "claim_pending" ? "think" : "find"} size={110} />
            {home.state === "claim_pending" ? (
              <>
                <h1 className="font-display text-2xl font-normal">{home.claim_store_name} 인증을 확인하고 있어요</h1>
                <p className="text-base leading-relaxed text-muted">옥천신문이 전화로 사장님이 맞는지 여쭤볼게요. 확인이 끝나면 여기서 바로 소식을 올릴 수 있어요.</p>
              </>
            ) : (
              <>
                <h1 className="font-display text-2xl font-normal">내 가게를 연결해 주세요</h1>
                <p className="text-base leading-relaxed text-muted">가게를 고르면 옥천신문이 확인한 뒤 연결해 드려요.</p>
                <Link
                  href="/owner/claim"
                  className="flex min-h-14 w-full items-center justify-center rounded-[22px] border-2 border-sage-deep bg-sage font-display text-xl text-white"
                >
                  내 가게 찾기
                </Link>
              </>
            )}
          </section>
        )}

        <div className="mt-auto flex items-center gap-2 pt-2">
          <p className="flex-1 text-sm leading-normal text-muted">앱이 어려우시면 옥천신문이 전화로 대신 올려드려요.</p>
          {home.is_admin && (
            <Link href="/admin" className="min-h-11 rounded-2xl border-2 border-line bg-card px-3.5 py-2.5 text-sm font-bold">
              관리자
            </Link>
          )}
          <SignOutButton />
        </div>
      </main>
      <BottomNav />
    </>
  );
}
