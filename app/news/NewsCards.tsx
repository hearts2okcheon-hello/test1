import { Osori } from "@/components/Osori";
import type { NewsItem } from "@/lib/okinews";

function shortDate(at: string | null) {
  const m = at?.match(/^\d{4}-(\d{2})-(\d{2})/);
  return m ? `${Number(m[1])}월 ${Number(m[2])}일` : null;
}

/** 왼쪽 기사 사진, 오른쪽 제목·요약. 첫 기사는 크게. 누르면 옥천신문으로 간다 */
export function NewsCards({ news }: { news: NewsItem[] }) {
  if (news.length === 0) {
    return <p className="rounded-[22px] border-2 border-dashed border-line px-4 py-3 text-sm text-muted">뉴스를 불러오지 못했어요. 잠시 뒤 다시 봐 주세요.</p>;
  }
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] gap-3">
      {news.map((n, i) => {
        const top = i === 0;
        const date = shortDate(n.publishedAt);
        return (
          <a key={n.id} href={n.url} target="_blank" rel="noopener noreferrer" className={`ok-sticker flex items-stretch gap-3.5 rounded-[22px] border-2 border-line bg-card p-3 ${top ? "bg-yellow-soft" : ""}`}>
            <span className={`flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-cream ${top ? "w-[128px] min-h-[128px]" : "size-[92px]"}`}>
              {n.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={n.image} alt="" loading="lazy" referrerPolicy="no-referrer" className="size-full object-cover" />
              ) : (
                <Osori mood="work" size={72} />
              )}
            </span>
            <span className="flex min-w-0 flex-1 flex-col justify-center gap-1">
              {top && <span className="self-start rounded-full bg-yellow px-2.5 py-0.5 font-display text-xs">오늘의 주요 뉴스</span>}
              <span className={`font-display leading-snug ${top ? "line-clamp-3 text-[19px]" : "line-clamp-2 text-[17px]"}`}>{n.title}</span>
              {n.summary && <span className={`text-[13px] leading-snug text-muted ${top ? "line-clamp-2" : "line-clamp-1"}`}>{n.summary}</span>}
              <span className="text-xs text-muted">옥천신문{date ? ` · ${date}` : ""}</span>
            </span>
          </a>
        );
      })}
    </div>
  );
}
