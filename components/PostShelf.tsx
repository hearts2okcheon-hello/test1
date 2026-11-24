"use client";

import { Fragment, useState, type ReactNode } from "react";
import { firstPage, splitPosts } from "@/lib/posts";
import { Carousel } from "./Carousel";

/**
 * 가게 소식을 놓는 순서 (ADR-024): 공지가 맨 위, 그 아래에 소식. 둘 다 새 글이 먼저다.
 * 공지는 옆으로 넘겨 가며 새 공지부터 지난 공지까지 본다. 세 개까지 보여 주고, 더 있으면 네 번째 장이 "공지 더 보기"다.
 * 소식도 세 개까지 보여 주고, 더 있으면 그 아래에 "소식 더 보기"를 둔다.
 * 글 한 칸의 모양은 쓰는 쪽이 정한다 (손님 화면은 공감·댓글, 사장님 화면은 고치기·지우기)
 */
export function PostShelf<T extends { id: string; kind: "news" | "notice"; created_at: string }>({
  posts,
  renderPost,
  moreClass = "min-h-12 text-base",
}: {
  posts: T[];
  renderPost: (post: T) => ReactNode;
  /** "더 보기" 버튼의 크기 (사장님 화면에서는 더 크게) */
  moreClass?: string;
}) {
  const { notices, news } = splitPosts(posts);
  const [allNotices, setAllNotices] = useState(false);
  const [allNews, setAllNews] = useState(false);
  const pinned = firstPage(notices, allNotices);
  const listed = firstPage(news, allNews);

  return (
    <>
      {notices.length > 0 && (
        <Carousel label="공지">
          {pinned.shown.map((p) => (
            // 옆 여백은 넘길 때 카드 테두리가 붙어 보이지 않게
            <div key={p.id} className="px-0.5">
              {renderPost(p)}
            </div>
          ))}
          {pinned.more > 0 && (
            <div className="flex h-full px-0.5">
              <button
                type="button"
                onClick={() => setAllNotices(true)}
                className="flex min-h-[112px] w-full flex-col items-center justify-center gap-1 rounded-[20px] border-2 border-dashed border-line-strong bg-cream font-display text-lg"
              >
                공지 더 보기
                <span className="font-sans text-sm text-muted">지난 공지 {pinned.more}개</span>
              </button>
            </div>
          )}
        </Carousel>
      )}

      {listed.shown.map((p) => (
        <Fragment key={p.id}>{renderPost(p)}</Fragment>
      ))}
      {listed.more > 0 && (
        <button type="button" onClick={() => setAllNews(true)} className={`rounded-full border-2 border-line bg-card font-display ${moreClass}`}>
          소식 더 보기 <span className="font-sans text-sm text-muted">({listed.more}개 남음)</span>
        </button>
      )}
    </>
  );
}
