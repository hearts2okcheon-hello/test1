import Link from "next/link";
import { notFound } from "next/navigation";
import { StoreArticleSection } from "@/components/ArticleRows";
import { BackButton } from "@/components/BackButton";
import { FavoriteStar } from "@/components/FavoriteStar";
import { HoursPanel } from "@/components/HoursPanel";
import { StoreCalendarButton } from "@/components/StoreCalendarButton";
import { KakaoMap } from "@/components/KakaoMap";
import { PageView } from "@/components/PageView";
import { StorePhotos } from "@/components/StorePhotos";
import { StorePosts } from "@/components/StorePosts";
import { StoreStatus } from "@/components/StoreStatus";
import { formatPhone, formatWon } from "@/lib/hours";
import { createClient } from "@/lib/supabase/server";
import type { StoreArticle, StoreDetail } from "@/lib/types";
import { StoreClient } from "./StoreClient";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * 가게 화면 (ADR-025). 위에서부터: 사진(옆으로 넘겨 봄) → 운영 날짜 & 영업시간(오늘 상태 한 줄 포함) → 전화번호
 * → 사장님 소식 & 공지(있을 때만) → 소개글(있을 때만) → 대표 메뉴 → 위치 → 옥천신문 기사 → 오늘 이웃들의 제보.
 * 큰 팻말 화면, "소식이 없어요" 같은 빈 칸, 공감·주민 댓글은 두지 않는다
 */
export default async function StorePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ reported?: string }>;
}) {
  const { id } = await params;
  const { reported } = await searchParams;
  if (!UUID.test(id)) notFound();

  const supabase = await createClient();
  // 가게 정보와, 옥천신문이 이 가게에 붙인 기사 (ADR-020)
  const [{ data }, articlesRes] = await Promise.all([supabase.rpc("get_store_detail", { p_store_id: id }), supabase.rpc("get_store_articles").eq("store_id", id)]);
  if (!data) notFound();
  const articles = (articlesRes.data ?? []) as StoreArticle[];
  const detail = data as StoreDetail;
  const { store, profile, menus, photos, closures } = detail;
  const plans = detail.plans ?? [];
  // 공개한 번호만 온다. 가게 번호가 있으면 그것을 먼저
  const phones = [
    { label: "가게", number: profile.store_phone },
    { label: "사장님", number: profile.phone },
  ]
    .filter((p): p is { label: string; number: string } => !!p.number)
    // 두 번호가 같으면 한 번만 보여 준다
    .filter((p, i, all) => all.findIndex((q) => q.number.replace(/\D/g, "") === p.number.replace(/\D/g, "")) === i);
  const tags = [store.category, store.neighborhood].filter(Boolean).join(" · ");
  const editQuery = `?store=${store.store_id}`;

  return (
    <>
      {/* 가게 이름 · 카테고리 · 동네 태그 */}
      <header className="flex items-center gap-2.5 px-5 pt-4 pb-2">
        <BackButton />
        <div className="flex min-w-0 flex-1 flex-col">
          <h1 className="truncate font-display text-[23px] leading-tight font-normal">{store.name}</h1>
          {tags && <span className="truncate text-[13px] text-muted">{tags}</span>}
        </div>
        <StoreCalendarButton storeId={store.store_id} storeName={store.name} hours={store.regular_hours} closures={closures} plans={plans} canManage={detail.can_manage} />
        <FavoriteStar storeId={store.store_id} storeName={store.name} size={30} />
        {detail.can_manage && (
          <Link href={`/owner/edit${editQuery}`} className="flex min-h-11 shrink-0 items-center rounded-2xl border-2 border-line bg-card px-3 text-sm font-bold">
            고치기
          </Link>
        )}
      </header>

      <main className="flex flex-1 flex-col gap-[18px] px-5 pt-1 pb-4">
        {/* 1. 사진: 맨 위에서 옆으로 넘겨 본다. 가게를 고칠 수 있는 사람에게는 "사진 고치기"가 보인다 */}
        <StorePhotos photos={photos} editHref={detail.can_manage ? `/owner/edit${editQuery}#photos` : undefined} />

        {/* 2. 운영 날짜 & 영업시간. 맨 위 줄이 오늘의 상태다 (큰 팻말 대신) */}
        <section aria-labelledby="hours-title" className="flex flex-col gap-2.5 rounded-[22px] border-2 border-line bg-card px-4 py-4">
          <h2 id="hours-title" className="font-display text-[19px] font-normal">운영 날짜 & 영업시간</h2>
          <StoreStatus store={store} />
          <HoursPanel hours={store.regular_hours} closures={closures} plans={plans} />
        </section>

        {/* 3. 전화번호 */}
        {phones.length > 0 && (
          <section aria-label="전화번호" className="flex flex-col rounded-2xl border-2 border-line bg-card px-4">
            {phones.map((p, i) => (
              <a key={p.label} href={`tel:${p.number}`} className={`flex min-h-12 items-center justify-center gap-2 text-base font-bold ${i > 0 ? "border-t-2 border-line" : ""}`}>
                <PhoneIcon />
                {phones.length > 1 && <span className="text-sm font-normal text-muted">{p.label}</span>}
                {formatPhone(p.number)}
              </a>
            ))}
          </section>
        )}

        {/* 4. 사장님 소식 & 공지 (올린 글이 있을 때만) */}
        <StorePosts storeId={store.store_id} posts={detail.posts} />

        {/* 5. 소개글 (사장님이 써 둔 가게만) */}
        {profile.intro && (
          <section aria-labelledby="intro-title" className="flex flex-col gap-2 rounded-[22px] border-2 border-line bg-card px-4 py-4">
            <h2 id="intro-title" className="font-display text-[19px] font-normal">소개글</h2>
            <p className="text-[15px] leading-relaxed break-words whitespace-pre-wrap">{profile.intro}</p>
          </section>
        )}

        {/* 6. 대표 메뉴 & 가격 */}
        {menus.length > 0 && (
          <section aria-labelledby="menu-title" className="flex flex-col gap-2.5 rounded-[22px] border-2 border-line bg-card px-4 py-4">
            <h2 id="menu-title" className="font-display text-[19px] font-normal">대표 메뉴 & 가격</h2>
            <ul className="flex flex-col gap-2.5">
              {menus.map((m) => (
                <li key={m.id} className="flex items-center gap-3">
                  {m.photo_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.photo_url} alt="" loading="lazy" className="h-[76px] w-[104px] shrink-0 rounded-2xl object-cover" />
                  )}
                  <span className="flex min-w-0 flex-col">
                    <span className="text-base font-bold">{m.name}</span>
                    {m.price !== null && <span className="text-[15px] text-muted">{formatWon(m.price)}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* 7. 위치 & 바로 연결 */}
        {(store.address || phones.length > 0) && (
          <section aria-labelledby="place-title" className="flex flex-col gap-2.5 rounded-[22px] border-2 border-line bg-card px-4 py-4">
            <h2 id="place-title" className="font-display text-[19px] font-normal">위치 & 바로 연결</h2>
            {store.address && (
              <>
                <KakaoMap address={store.address} name={store.name} />
                <p className="text-center text-[15px] font-bold">{store.address}</p>
              </>
            )}
            {phones[0] && (
              <a href={`tel:${phones[0].number}`} className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-ink font-display text-lg text-white">
                전화하기
              </a>
            )}
          </section>
        )}

        {/* 8. 옥천신문 기사 (옥천신문이 붙인 가게만) */}
        <StoreArticleSection articles={articles} />

        <StoreClient detail={detail} reported={reported} />
      </main>

      <PageView name="store_view" storeId={id} />
    </>
  );
}

function PhoneIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
    </svg>
  );
}
