import Image from "next/image";
import Link from "next/link";
import { BottomNav } from "@/components/BottomNav";
import { Osori } from "@/components/Osori";
import { PageView } from "@/components/PageView";
import { SignChip } from "@/components/SignChip";
import { SourceLine } from "@/components/SourceLine";
import { TimeAgo } from "@/components/TimeAgo";
import { feedLine } from "@/lib/signs";
import { createClient } from "@/lib/supabase/server";
import type { FeedItem, NoticeKind } from "@/lib/types";

export const dynamic = "force-dynamic";

const BROADCAST_CARDS = 8;
const CARD = "w-[74%] max-w-[300px] shrink-0 snap-start scroll-ml-[18px] rounded-[22px] border-2 border-line bg-card px-4 py-3";

export default async function HomePage() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_today_feed", { p_limit: 20 });
  const feed = (data ?? []) as FeedItem[];
  const broadcasts = feed.filter((f) => f.is_current).slice(0, BROADCAST_CARDS);
  const today = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric", weekday: "short" }).format(new Date());

  return (
    <>
      <header className="flex items-center gap-2.5 px-[18px] pt-3.5 pb-1">
        <Image unoptimized src="/logo.webp" alt="OK!소리" width={118} height={74} priority />
      </header>

      <main className="flex flex-1 flex-col gap-5 pt-1.5 pb-5">
        {/* 오늘의 마을방송: 옆으로 넘겨 본다 */}
        <section aria-labelledby="broadcast-title" className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 px-[18px]">
            <Osori mood="talk" size={40} />
            <h2 id="broadcast-title" className="flex-1 font-display text-[20px] font-normal">오늘의 마을방송</h2>
            <span className="text-[13px] text-muted">{today}</span>
          </div>
          <div className="ok-scroll-x flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-[18px] pb-1">
            {broadcasts.length === 0 ? (
              <p className={`${CARD} font-display text-[17px] leading-snug`}>아직 오늘 방송이 없어요. 사장님들 소식을 기다리는 중!</p>
            ) : (
              broadcasts.map((f) => (
                <Link key={`${f.item_type}-${f.item_id}`} href={`/stores/${f.store_id}`} className={`${CARD} flex min-h-[116px] flex-col gap-1`}>
                  <span className="truncate font-display text-[18px]">{f.store_name}</span>
                  <span className="line-clamp-2 flex-1 text-[15px] leading-snug">{feedLine(f)}</span>
                  <span className="text-[13px] text-muted">
                    {f.source === "owner" ? "사장님" : "옥천신문"} · <TimeAgo iso={f.created_at} />
                  </span>
                </Link>
              ))
            )}
          </div>
        </section>

        {/* 오늘 소식 */}
        <section className="flex flex-col gap-2.5 px-[18px]">
          <h2 className="font-display text-[22px] font-normal">오늘 들어온 소식</h2>
          {feed.length === 0 ? (
            <div className="flex items-center gap-2.5 rounded-[18px] border-2 border-dashed border-line px-3.5 py-2.5 text-sm text-muted">
              <Osori mood="think" size={40} />
              아직 오늘 소식이 없어요
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {feed.map((f) => (
                <li key={`${f.item_type}-${f.item_id}`}>
                  <Link
                    href={`/stores/${f.store_id}`}
                    className={`flex gap-2.5 rounded-[20px] border-2 border-line bg-card px-3.5 py-3 ${f.is_current ? "" : "opacity-60"}`}
                  >
                    <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <span className="flex items-center gap-2">
                        <span className="flex-1 truncate text-base font-bold">{f.store_name}</span>
                        <FeedChip item={f} />
                      </span>
                      <span className="line-clamp-3 text-[15px]">{feedLine(f)}</span>
                      <span className="text-[13px] text-muted">
                        <SourceLine source={f.source} at={f.created_at} />
                      </span>
                    </span>
                    {f.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={f.image_url} alt="" loading="lazy" className="size-[72px] shrink-0 self-center rounded-xl object-cover" />
                    )}
                  </Link>
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

function FeedChip({ item }: { item: FeedItem }) {
  if (item.item_type === "post") {
    return <span className="shrink-0 rounded-xl border-2 border-yellow-line bg-yellow-soft px-2.5 py-1 text-sm font-bold text-[#7E5810]">{item.kind === "notice" ? "공지" : "소식"}</span>;
  }
  if (item.item_type === "closure") return <SignChip sign="temp_closed" />;
  return item.is_current ? <SignChip sign={item.kind as NoticeKind} atTime={item.at_time} /> : <span className="text-xs font-bold text-muted">지난 소식</span>;
}
