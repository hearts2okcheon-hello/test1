import { articleDate, articleUrl } from "@/lib/storeArticles";
import type { StoreArticle } from "@/lib/types";

/**
 * 가게에 붙인 옥천신문 기사 줄들 (ADR-020). 제목은 두 줄까지, 그 아래 날짜, 사진이 있으면 오른쪽에 4:3 으로.
 * 누르면 옥천신문 기사가 새 창에서 열린다. 가게 칸(StoreArticles)과 가게 상세 화면이 같이 쓴다
 */
export function ArticleRows({ list, className = "" }: { list: StoreArticle[]; className?: string }) {
  return (
    <ul className={`flex flex-col ${className}`}>
      {list.map((a, i) => {
        const date = articleDate(a.published_at);
        return (
          <li key={a.article_id} className={i > 0 ? "border-t-2 border-line" : ""}>
            <a href={articleUrl(a.article_id)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 py-3">
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="line-clamp-2 text-[15px] leading-snug font-bold break-keep">{a.title}</span>
                <span className="text-[12px] text-muted">옥천신문{date ? ` · ${date}` : ""}</span>
              </span>
              {a.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.image_url} alt="" loading="lazy" referrerPolicy="no-referrer" className="aspect-[4/3] w-20 shrink-0 rounded-xl border border-line object-cover" />
              )}
            </a>
          </li>
        );
      })}
    </ul>
  );
}

/** 가게 상세 화면의 "옥천신문 기사" 칸. 붙인 기사가 없으면 그리지 않는다 */
export function StoreArticleSection({ articles }: { articles: StoreArticle[] }) {
  if (articles.length === 0) return null;
  return (
    <section aria-labelledby="articles-title" className="flex flex-col rounded-[22px] border-2 border-line bg-card px-4 pt-4 pb-1">
      <h2 id="articles-title" className="font-display text-[19px] font-normal">옥천신문 기사</h2>
      <ArticleRows list={articles} />
    </section>
  );
}
