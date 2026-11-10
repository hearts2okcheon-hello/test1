import type { NewsItem } from "@/lib/okinews";

function shortDate(at: string | null) {
  const m = at?.match(/^\d{4}-(\d{2})-(\d{2})/);
  return m ? `${Number(m[1])}월 ${Number(m[2])}일` : null;
}

/** 포털 뉴스처럼 글자만: 굵은 제목, 흐린 요약, 작은 출처. 첫 기사만 조금 크게. 누르면 옥천신문으로 간다 */
export function NewsCards({ news }: { news: NewsItem[] }) {
  if (news.length === 0) {
    return <p className="rounded-[22px] border-2 border-dashed border-line px-4 py-3 text-sm text-muted">뉴스를 불러오지 못했어요. 잠시 뒤 다시 봐 주세요.</p>;
  }
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-[22px] border-2 border-line bg-card px-4 ok-sticker">
      {news.map((n, i) => {
        const top = i === 0;
        const date = shortDate(n.publishedAt);
        return (
          <li key={n.id}>
            <a href={n.url} target="_blank" rel="noopener noreferrer" className="flex flex-col gap-1.5 py-4">
              {top && <span className="self-start rounded-full bg-yellow-soft px-2 py-0.5 text-xs font-bold text-[#7E5810]">주요 뉴스</span>}
              <span className={`font-bold tracking-[-0.01em] break-keep text-ink ${top ? "line-clamp-2 text-[19px] leading-[1.4]" : "line-clamp-2 text-[17px] leading-[1.45]"}`}>{n.title}</span>
              {n.summary && <span className={`text-[14px] leading-[1.55] break-keep text-muted ${top ? "line-clamp-3" : "line-clamp-2"}`}>{n.summary}</span>}
              <span className="flex items-center gap-1 text-[12px] text-muted/80">
                옥천신문{date ? ` · ${date}` : ""}
                {typeof n.comments === "number" && (
                  <>
                    {" · "}
                    <svg width="13" height="13" viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round">
                      <path d="M4 5.5h16v11H10l-4.5 3.5V16.5H4z" />
                    </svg>
                    <span>댓글 {n.comments}</span>
                  </>
                )}
              </span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
