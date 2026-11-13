import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminDoor } from "@/components/AdminDoor";
import { AppAlertCard } from "@/components/AppAlertCard";
import { Avatar } from "@/components/Avatar";
import { BottomNav } from "@/components/BottomNav";
import { SignOutButton } from "@/components/SignOutButton";
import { StoreGate } from "@/components/StoreGate";
import { formatPhone } from "@/lib/hours";
import { kakaoEnv } from "@/lib/kakao";
import { createClient } from "@/lib/supabase/server";
import type { OwnerHome } from "@/lib/types";
import { KakaoLogin } from "./KakaoLogin";

export const dynamic = "force-dynamic";

/** 내 정보 탭 (ADR-014): 로그인 → 내 정보 등록 → 프로필과 가게 표시 */
export default async function MyInfoPage({ searchParams }: { searchParams: Promise<{ login?: string; back?: string }> }) {
  const { login, back } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_owner_home");
  const home = (data ?? { state: "no_store", is_admin: false }) as OwnerHome;
  const adminHref = home.is_admin ? "/admin" : "/admin/login";

  // 로그인은 했지만 내 정보를 아직 등록하지 않았다. 등록 화면에서 뒤로 오면(back) 로그인 화면을 보여 준다
  const unregistered = home.state === "needs_store" && !home.profile.registered;
  if (unregistered && !back) redirect("/owner/profile");

  if (home.state === "no_store" || unregistered) {
    return (
      <>
        <main className="flex flex-1 flex-col gap-4 px-[18px] pt-4 pb-5">
          <div className="flex items-center justify-between gap-2">
            <h1 className="font-display text-[26px] font-normal">내 정보</h1>
            <AdminDoor href={adminHref} />
          </div>
          <KakaoLogin ready={kakaoEnv() !== null} login={login} />
          {home.is_admin && (
            <Link href="/admin" className="mt-auto flex min-h-12 w-fit items-center self-end rounded-2xl border-2 border-line bg-card px-3.5 text-sm font-bold">
              관리자
            </Link>
          )}
        </main>
        <BottomNav />
      </>
    );
  }

  const { profile } = home;
  const store = home.state === "owner" ? home.store : null;

  return (
    <>
      <main className="flex flex-1 flex-col gap-4 px-[18px] pt-4 pb-5">
        <div className="flex items-center gap-2">
          <h1 className="flex-1 font-display text-[26px] font-normal">내 정보</h1>
          {profile.registered && (
            <Link href="/owner/profile" className="flex min-h-12 items-center rounded-2xl border-2 border-line bg-card px-3.5 text-base font-bold">
              고치기
            </Link>
          )}
          <AdminDoor href={adminHref} />
        </div>

        <section className="flex items-center gap-3 rounded-[22px] border-2 border-line bg-card px-3.5 py-4">
          <Avatar url={profile.avatar_url} size={84} />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            {profile.registered ? (
              <>
                <span className="truncate font-display text-[23px] leading-tight">{profile.name}</span>
                {profile.nickname && <span className="truncate text-base font-bold text-sage-deep">{profile.nickname}</span>}
                <span className="truncate text-base text-muted">{profile.area}</span>
                {profile.phone && <span className="text-base text-muted">{formatPhone(profile.phone)}</span>}
              </>
            ) : (
              <>
                <span className="font-display text-xl leading-snug">내 정보를 등록해 주세요</span>
                <Link href="/owner/profile" className="mt-1 flex min-h-12 w-fit items-center rounded-2xl border-2 border-yellow-deep bg-yellow px-3.5 text-base font-bold">
                  내 정보 등록하기
                </Link>
              </>
            )}
          </div>
          <StoreGate storeName={store?.name ?? null} acked={profile.store_ack} canRegister={profile.registered} />
        </section>

        <AppAlertCard who={store ? "owner" : "resident"} />

        <div className="mt-auto flex items-center gap-2 pt-2">
          <p className="flex-1 text-sm leading-normal text-muted">{store ? "앱이 어려우시면 옥천신문이 전화로 대신 올려드려요." : ""}</p>
          {home.is_admin && (
            <Link href="/admin" className="min-h-11 rounded-2xl border-2 border-line bg-card px-3.5 py-2.5 text-sm font-bold">
              관리자
            </Link>
          )}
          <SignOutButton label="로그아웃" />
        </div>
      </main>
      <BottomNav />
    </>
  );
}
