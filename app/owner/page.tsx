import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminDoor } from "@/components/AdminDoor";
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

/** 내 공간 탭 (ADR-014): 로그인 → 내 정보 등록 → 프로필과 그 아래 메뉴(내 정보·내 가게·알림) */
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
            <h1 className="font-display text-[26px] font-normal">내 공간</h1>
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
          <h1 className="flex-1 font-display text-[26px] font-normal">내 공간</h1>
          <AdminDoor href={adminHref} />
        </div>

        {/* 내 프로필 */}
        <section className="flex items-center gap-3.5 rounded-[22px] border-2 border-line bg-card px-4 py-4">
          <Avatar url={profile.avatar_url} size={76} />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            {profile.registered ? (
              <>
                <span className="truncate font-display text-[23px] leading-tight">{profile.name}</span>
                {profile.nickname && <span className="truncate text-base font-bold text-sage-deep">{profile.nickname}</span>}
                <span className="truncate text-base text-muted">
                  {[profile.area, profile.phone ? formatPhone(profile.phone) : null].filter(Boolean).join(" · ")}
                </span>
              </>
            ) : (
              <span className="font-display text-xl leading-snug">내 정보를 등록해 주세요</span>
            )}
          </div>
        </section>

        {/* 프로필 아래 메뉴: 누르면 그 화면에서 고친다 */}
        <nav aria-label="내 공간 메뉴" className="flex flex-col rounded-[22px] border-2 border-line bg-card px-4">
          <MenuRow href="/owner/profile" icon="person" title={profile.registered ? "내 정보" : "내 정보 등록하기"} desc="이름 · 닉네임 · 사는 곳 · 전화번호 · 사진" />
          <div className="border-t-2 border-line">
            <StoreGate storeName={store?.name ?? null} acked={profile.store_ack} canRegister={profile.registered} />
          </div>
          {store && (
            <>
              <MenuRow href="/owner/news" icon="pen" title="소식·공지 올리기" desc="오늘 들어온 소식에 바로 떠요" line />
              <MenuRow href="/owner/calendar" icon="calendar" title="가게 캘린더" desc="날짜별 휴무 · 늦게 열기 · 외출" line />
              <MenuRow href="/owner/edit" icon="gear" title="가게 정보 고치기" desc="메뉴 · 사진 · 영업시간 · 전화번호" line />
            </>
          )}
          <MenuRow href="/alerts" icon="bell" title="알림" desc="받은 알림 보기 · 알림 켜고 끄기" line />
        </nav>

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

const ICONS = {
  person: ["M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M4.5 20a7.5 7.5 0 0 1 15 0"],
  pen: ["M4 20h4L19 9l-4-4L4 16z", "M13.5 6.5l4 4"],
  calendar: ["M5 6h14v14H5z", "M5 10h14", "M9 3.5v4", "M15 3.5v4"],
  gear: ["M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z", "M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"],
  bell: ["M6 10.5a6 6 0 0 1 12 0v3.7l1.6 2.6H4.4L6 14.2z", "M10 19.5a2 2 0 0 0 4 0"],
} as const;

/** 내 공간 메뉴 한 줄: 아이콘 · 이름 · 설명 · › */
function MenuRow({ href, icon, title, desc, line = false }: { href: string; icon: keyof typeof ICONS; title: string; desc: string; line?: boolean }) {
  return (
    <Link href={href} className={`flex min-h-16 items-center gap-3 ${line ? "border-t-2 border-line" : ""}`}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0">
        {ICONS[icon].map((d) => <path key={d} d={d} />)}
      </svg>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-lg font-bold">{title}</span>
        <span className="truncate text-sm text-muted">{desc}</span>
      </span>
      <span aria-hidden className="text-2xl text-muted">›</span>
    </Link>
  );
}
