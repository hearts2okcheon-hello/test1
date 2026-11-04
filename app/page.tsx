import Image from "next/image";
import { BottomNav } from "@/components/BottomNav";
import { Osori } from "@/components/Osori";
import { PageView } from "@/components/PageView";
import { SignChip } from "@/components/SignChip";
import { SourceLine } from "@/components/SourceLine";
import { StoreCard } from "@/components/StoreCard";
import { TimeAgo } from "@/components/TimeAgo";
import { castLine } from "@/lib/signs";
import { createClient } from "@/lib/supabase/server";
import type { FeedItem, StoreSign } from "@/lib/types";
import { HomeReport } from "./HomeReport";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();
  const [signsRes, feedRes] = await Promise.all([
    supabase.rpc("get_store_signs"),
    supabase.rpc("get_today_feed", { p_limit: 20 }),
  ]);
  const stores = (signsRes.data ?? []) as StoreSign[];
  const feed = (feedRes.data ?? []) as FeedItem[];
  const latest = feed[0];

  return (
    <>
      <header className="flex items-center gap-2.5 px-[18px] pt-3.5 pb-1">
        <Image unoptimized src="/logo.webp" alt="OK!소리" width={118} height={74} priority />
      </header>

      <main className="flex flex-1 flex-col gap-5 px-[18px] pt-1.5 pb-5">
        {/* 오늘의 마을방송 */}
        <section className="flex items-end gap-1">
          <Osori mood="talk" size={92} className="ok-bob" />
          <div className="relative mb-2.5 flex flex-1 flex-col gap-1.5 rounded-[22px] border-2 border-line bg-card px-4 py-3.5">
            <span className="absolute bottom-[22px] -left-[9px] size-3.5 rotate-45 border-b-2 border-l-2 border-line bg-card" aria-hidden />
            <span className="self-start rounded-[10px] bg-yellow px-2.5 py-0.5 font-display text-sm">오늘의 마을방송</span>
            {latest ? (
              <>
                <span className="text-[13px] text-muted">
                  {latest.store_name} {latest.source === "owner" ? "사장님" : "· 옥천신문"} · <TimeAgo iso={latest.created_at} />
                </span>
                <span className="font-display text-xl leading-snug">{castLine(latest.kind, latest.at_time, latest.memo)}</span>
              </>
            ) : (
              <span className="font-display text-xl leading-snug">아직 오늘 방송이 없어요. 사장님들 소식을 기다리는 중!</span>
            )}
          </div>
        </section>

        {/* 가게 팻말 */}
        <section className="flex flex-col gap-2.5">
          <div className="flex items-baseline gap-2">
            <h2 className="flex-1 font-display text-[22px] font-normal">오늘 우리 동네 가게</h2>
            <span className="text-[13px] text-muted">눌러서 자세히</span>
          </div>
          {signsRes.error ? (
            <p className="rounded-[22px] border-2 border-dashed border-line px-4 py-3 text-sm text-muted">
              가게 소식을 불러오지 못했어요. 잠시 뒤 새로고침 해 주세요.
            </p>
          ) : stores.length === 0 ? (
            <p className="rounded-[22px] border-2 border-dashed border-line px-4 py-3 text-sm text-muted">아직 등록된 가게가 없어요.</p>
          ) : (
            stores.map((s) => <StoreCard key={s.store_id} store={s} />)
          )}
        </section>

        <HomeReport stores={stores.map((s) => ({ store_id: s.store_id, name: s.name }))} />

        {/* 오늘 소식 */}
        <section className="flex flex-col gap-2.5">
          <h2 className="font-display text-[22px] font-normal">오늘 들어온 소식</h2>
          {feed.length === 0 ? (
            <div className="flex items-center gap-2.5 rounded-[18px] border-2 border-dashed border-line px-3.5 py-2.5 text-sm text-muted">
              <Osori mood="think" size={40} />
              아직 오늘 소식이 없어요
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {feed.map((f) => (
                <li
                  key={f.notice_id}
                  className={`flex flex-col gap-1.5 rounded-[20px] border-2 border-line bg-card px-3.5 py-3 ${f.is_current ? "" : "opacity-60"}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="flex-1 truncate text-base font-bold">{f.store_name}</span>
                    {f.is_current ? <SignChip sign={f.kind} atTime={f.at_time} /> : <span className="text-xs font-bold text-muted">지난 소식</span>}
                  </div>
                  <span className="text-[15px]">{castLine(f.kind, f.at_time, f.memo)}</span>
                  <span className="text-[13px] text-muted">
                    <SourceLine source={f.source} at={f.created_at} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <BottomNav />
      <PageView />
    </>
  );
}
