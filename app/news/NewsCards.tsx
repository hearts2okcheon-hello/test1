"use client";

import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/Toast";
import { errorMessage } from "@/lib/errors";
import type { NewsItem } from "@/lib/okinews";
import { createClient, ensureSession } from "@/lib/supabase/client";

export type NewsStat = { article_id: string; views: number; likes: number; liked_by_me: boolean };
type Stat = { views: number; likes: number; on: boolean };

/** 처음에는 이만큼만 보여 주고, "기사 더 보기"를 누를 때마다 이만큼씩 더 보여 준다 */
const PAGE = 10;

function toMap(stats: NewsStat[]): Record<string, Stat> {
  return Object.fromEntries(stats.map((s) => [s.article_id, { views: s.views, likes: s.likes, on: s.liked_by_me }]));
}

function shortDate(at: string | null) {
  const m = at?.match(/^\d{4}-(\d{2})-(\d{2})/);
  return m ? `${Number(m[1])}월 ${Number(m[2])}일` : null;
}

/** 같은 기기에서는 한 기사를 하루 한 번만 센다 */
function firstViewToday(id: string): boolean {
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
  try {
    const key = `ok-news-view-${id}`;
    if (window.localStorage.getItem(key) === today) return false;
    window.localStorage.setItem(key, today);
  } catch {}
  return true;
}

function Icon({ d, filled = false }: { d: string; filled?: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden fill={filled ? "#D9706F" : "none"} stroke={filled ? "#D9706F" : "currentColor"} strokeWidth="2.3" strokeLinejoin="round" strokeLinecap="round">
      <path d={d} />
    </svg>
  );
}
const EYE = "M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12zM12 9.2a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6z";
const HEART = "M12 20s-7.5-4.6-9.3-9.2C1.5 7.5 3.6 4.5 6.8 4.5c2.2 0 3.9 1.2 5.2 3 1.3-1.8 3-3 5.2-3 3.2 0 5.3 3 4.1 6.3C19.5 15.4 12 20 12 20z";
const BUBBLE = "M4 5.5h16v11H10l-4.5 3.5V16.5H4z";

/**
 * 옥천신문 최근 기사 (ADR-018). 포털 뉴스처럼 글자만: 굵은 제목, 그 아래 흐린 줄거리, 작은 출처.
 * 제목과 줄거리는 두 줄을 넘으면 줄인다. 누르면 옥천신문으로 간다.
 * 조회·공감은 옥!소리에서 센 숫자, 댓글은 옥천신문 기사에 달린 수
 */
export function NewsCards({ news, stats, loaded, days }: { news: NewsItem[]; stats: NewsStat[]; loaded: boolean; days: number }) {
  const { node, show } = useToast();
  const [stat, setStat] = useState<Record<string, Stat>>(() => toMap(stats));
  const [count, setCount] = useState(PAGE);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  useEffect(() => setStat(toMap(stats)), [stats]);

  if (news.length === 0) {
    return (
      <p className="rounded-[22px] border-2 border-dashed border-line px-4 py-3 text-sm text-muted">
        {loaded ? `최근 ${days}일 동안 올라온 기사가 없어요.` : "뉴스를 불러오지 못했어요. 잠시 뒤 다시 봐 주세요."}
      </p>
    );
  }

  const get = (id: string): Stat => stat[id] ?? { views: 0, likes: 0, on: false };

  function view(id: string) {
    if (!firstViewToday(id)) return;
    setStat((m) => ({ ...m, [id]: { ...get(id), views: get(id).views + 1 } }));
    createClient().rpc("record_news_view", { p_article_id: id }).then(() => {}, () => {});
  }

  // 누르는 즉시 바꾸고, 저장은 뒤에서 차례로. 실패하면 되돌린다
  function like(id: string) {
    const cur = get(id);
    const next = { ...cur, on: !cur.on, likes: Math.max(0, cur.likes + (cur.on ? -1 : 1)) };
    setStat((m) => ({ ...m, [id]: next }));
    queue.current = queue.current.then(async () => {
      try {
        const supabase = createClient();
        await ensureSession(supabase);
        const { error } = await supabase.rpc("toggle_news_like", { p_article_id: id, p_on: next.on });
        if (error) throw error;
      } catch (e) {
        setStat((m) => ({ ...m, [id]: { ...(m[id] ?? next), on: cur.on, likes: cur.likes } }));
        show(errorMessage(e), "think");
      }
    });
  }

  const rest = news.length - count;

  return (
    <div className="flex flex-col gap-2.5">
      <ul className="ok-sticker divide-y divide-line overflow-hidden rounded-[22px] border-2 border-line bg-card px-4">
        {news.slice(0, count).map((n) => {
          const date = shortDate(n.publishedAt);
          const s = get(n.id);
          return (
            <li key={n.id} className="flex flex-col gap-1.5 py-4">
              <a href={n.url} target="_blank" rel="noopener noreferrer" onClick={() => view(n.id)} className="flex flex-col gap-1.5">
                <span className="line-clamp-2 text-[17px] leading-[1.45] font-bold tracking-[-0.01em] break-keep text-ink">{n.title}</span>
                {n.summary && <span className="line-clamp-2 text-[14px] leading-[1.55] break-keep text-muted">{n.summary}</span>}
              </a>
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted">
                <span>옥천신문{date ? ` · ${date}` : ""}</span>
                <span className="ml-auto flex items-center gap-3">
                  <span className="flex items-center gap-1" title="옥!소리에서 본 수">
                    <Icon d={EYE} />
                    조회 {s.views}
                  </span>
                  <button type="button" aria-pressed={s.on} onClick={() => like(n.id)} className="-my-2 flex min-h-10 items-center gap-1 px-1 font-bold active:scale-95">
                    <Icon d={HEART} filled={s.on} />
                    공감 {s.likes}
                  </button>
                  {typeof n.comments === "number" && (
                    <a href={`${n.url}#comment`} target="_blank" rel="noopener noreferrer" onClick={() => view(n.id)} className="flex items-center gap-1" title="옥천신문 기사에 달린 댓글">
                      <Icon d={BUBBLE} />
                      댓글 {n.comments}
                    </a>
                  )}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
      {rest > 0 && (
        <button type="button" onClick={() => setCount((c) => c + PAGE)} className="min-h-12 rounded-full border-2 border-line bg-card font-display text-base">
          기사 더 보기 <span className="font-sans text-sm text-muted">({rest}개 남음)</span>
        </button>
      )}
      <p className="px-1 text-[11px] leading-normal text-muted">최근 {days}일 동안 올라온 옥천신문 기사예요. 조회·공감은 옥!소리에서 센 숫자, 댓글은 옥천신문 기사에 달린 수예요.</p>
      {node}
    </div>
  );
}
