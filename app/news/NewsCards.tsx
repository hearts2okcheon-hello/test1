"use client";

import { useEffect, useRef, useState } from "react";
import { ArticleLink } from "@/components/ArticleLink";
import { useToast } from "@/components/Toast";
import { errorMessage } from "@/lib/errors";
import type { NewsItem } from "@/lib/okinews";
import { createClient, ensureSession } from "@/lib/supabase/client";

export type NewsStat = { article_id: string; views: number; likes: number; liked_by_me: boolean };
type Stat = { likes: number; on: boolean };

/** 처음에는 이만큼만 보여 주고, "기사 더 보기"를 누를 때마다 이만큼씩 더 보여 준다 */
const PAGE = 10;
// 기사를 보고 돌아와도 "더 보기"로 펼쳐 둔 만큼은 그대로 둔다
let shownCount = PAGE;

function toMap(stats: NewsStat[]): Record<string, Stat> {
  return Object.fromEntries(stats.map((s) => [s.article_id, { likes: s.likes, on: s.liked_by_me }]));
}

function shortDate(at: string | null) {
  const m = at?.match(/^\d{4}-(\d{2})-(\d{2})/);
  return m ? `${Number(m[1])}월 ${Number(m[2])}일` : null;
}

const HEART = "M12 20s-7.5-4.6-9.3-9.2C1.5 7.5 3.6 4.5 6.8 4.5c2.2 0 3.9 1.2 5.2 3 1.3-1.8 3-3 5.2-3 3.2 0 5.3 3 4.1 6.3C19.5 15.4 12 20 12 20z";
const BUBBLE = "M4 5.5h16v11H10l-4.5 3.5V16.5H4z";

function Icon({ d, filled = false }: { d: string; filled?: boolean }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden fill={filled ? "#D9706F" : "none"} stroke={filled ? "#D9706F" : "currentColor"} strokeWidth="2.3" strokeLinejoin="round" strokeLinecap="round">
      <path d={d} />
    </svg>
  );
}

/** 기사 사진 (정사각형). 사진이 없는 기사는 신문 그림을 대신 놓는다 */
function Thumb({ src }: { src: string | null }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" className="block size-[92px] rounded-2xl border border-line object-cover" />;
  }
  return (
    <span className="flex size-[92px] items-center justify-center rounded-2xl border border-line bg-sand text-sand-ink">
      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M4 5.5h13v13H6a2 2 0 0 1-2-2z" />
        <path d="M17 9h3v7.5a2 2 0 0 1-2 2" />
        <path d="M7.5 9.5h6" />
        <path d="M7.5 13h6" />
      </svg>
    </span>
  );
}

/**
 * 옥천신문 최근 기사 (ADR-018, ADR-023). 기사마다 카드 한 장: 왼쪽에 정사각형 사진, 오른쪽에 글.
 * 제목은 두 줄까지, 줄거리는 한 줄까지 보여 주고 넘치면 줄인다. 카드를 누르면 옥천신문 원문이 열린다(ArticleLink).
 * 공감은 옥!소리에서 센 숫자, 댓글은 옥천신문 기사에 달린 수. 본 횟수는 세지 않는다 (트래킹은 지금 범위 밖)
 */
export function NewsCards({ news, stats, loaded, days }: { news: NewsItem[]; stats: NewsStat[]; loaded: boolean; days: number }) {
  const { node, show } = useToast();
  const [stat, setStat] = useState<Record<string, Stat>>(() => toMap(stats));
  const [count, setCount] = useState(() => shownCount);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  useEffect(() => setStat(toMap(stats)), [stats]);

  if (news.length === 0) {
    return (
      <p className="rounded-[22px] border-2 border-dashed border-line px-4 py-3 text-sm text-muted">
        {loaded ? `최근 ${days}일 동안 올라온 기사가 없어요.` : "뉴스를 불러오지 못했어요. 잠시 뒤 다시 봐 주세요."}
      </p>
    );
  }

  const get = (id: string): Stat => stat[id] ?? { likes: 0, on: false };

  // 누르는 즉시 바꾸고, 저장은 뒤에서 차례로. 실패하면 되돌린다
  function like(id: string) {
    const cur = get(id);
    const next = { on: !cur.on, likes: Math.max(0, cur.likes + (cur.on ? -1 : 1)) };
    setStat((m) => ({ ...m, [id]: next }));
    queue.current = queue.current.then(async () => {
      try {
        const supabase = createClient();
        await ensureSession(supabase);
        const { error } = await supabase.rpc("toggle_news_like", { p_article_id: id, p_on: next.on });
        if (error) throw error;
      } catch (e) {
        setStat((m) => ({ ...m, [id]: cur }));
        show(errorMessage(e), "think");
      }
    });
  }

  function more() {
    shownCount = count + PAGE;
    setCount(shownCount);
  }

  const rest = news.length - count;

  return (
    <div className="flex flex-col gap-3">
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(320px,100%),1fr))] items-start gap-3">
        {news.slice(0, count).map((n) => {
          const date = shortDate(n.publishedAt);
          const s = get(n.id);
          return (
            <li key={n.id} className="flex gap-3 rounded-[22px] border-2 border-line bg-card p-3">
              {/* 사진도 눌리지만, 같은 곳으로 가는 링크가 두 번 읽히지 않게 글 쪽 링크만 알린다 */}
              <ArticleLink articleId={n.id} tabIndex={-1} aria-hidden className="shrink-0 self-start">
                <Thumb src={n.image} />
              </ArticleLink>
              <div className="flex min-w-0 flex-1 flex-col">
                <ArticleLink articleId={n.id} className="flex flex-col gap-0.5">
                  <span className="flex items-center justify-between gap-2 text-[12px] text-muted">
                    <span className="font-bold text-sage-deep">옥천신문</span>
                    {date && <span className="shrink-0">{date}</span>}
                  </span>
                  <span className="line-clamp-2 text-[16px] leading-[1.4] font-bold tracking-[-0.01em] break-keep">{n.title}</span>
                  {n.summary && <span className="truncate text-[14px] leading-normal text-muted">{n.summary}</span>}
                </ArticleLink>
                <span className="mt-auto flex items-center gap-4 text-[13px] text-muted">
                  <button type="button" aria-pressed={s.on} onClick={() => like(n.id)} className="-ml-1 flex min-h-10 items-center gap-1 px-1 font-bold active:scale-95">
                    <Icon d={HEART} filled={s.on} />
                    공감 {s.likes}
                  </button>
                  {typeof n.comments === "number" && (
                    <ArticleLink articleId={n.id} hash="comment" title="옥천신문 기사에 달린 댓글" className="flex min-h-10 items-center gap-1 px-1 font-bold">
                      <Icon d={BUBBLE} />
                      댓글 {n.comments}
                    </ArticleLink>
                  )}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
      {rest > 0 && (
        <button type="button" onClick={more} className="min-h-12 rounded-full border-2 border-line bg-card font-display text-base">
          기사 더 보기 <span className="font-sans text-sm text-muted">({rest}개 남음)</span>
        </button>
      )}
      <p className="px-1 text-[11px] leading-normal text-muted">
        최근 {days}일 동안 올라온 옥천신문 기사예요. 생활 소식을 먼저 보여 줘요. 공감은 옥!소리에서 센 숫자, 댓글은 옥천신문 기사에 달린 수예요.
      </p>
      {node}
    </div>
  );
}
