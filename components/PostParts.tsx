import { postParts } from "@/lib/signs";
import type { StorePost } from "@/lib/types";
import { SourceLine } from "./SourceLine";

// 글 한 칸을 이루는 작은 조각들: 사장님 소식의 머리·종류 표시·본문, 동네 이야기와 옥천신문 기사의 공감 버튼·댓글 그림

/** 누가 언제 알렸는지를 글 맨 위에 둔다. 공지인지 소식인지도 함께 보여 준다 */
export function PostHead({ post }: { post: Pick<StorePost, "kind" | "source" | "created_at" | "updated_at"> }) {
  return (
    <span className="flex flex-wrap items-center gap-2 text-[13px] text-muted">
      <PostKindTag kind={post.kind} />
      <span>
        <SourceLine source={post.source} at={post.created_at} />
        {post.updated_at ? " · 수정됨" : ""}
      </span>
    </span>
  );
}

/** 글의 종류 표시: 공지는 노랑, 소식은 연초록 (홈의 실시간 가게소식과 같은 색) */
export function PostKindTag({ kind }: { kind: StorePost["kind"] }) {
  return kind === "notice" ? (
    <span className="rounded-[10px] bg-yellow px-2 py-0.5 font-display text-[13px] text-ink">공지</span>
  ) : (
    <span className="rounded-[10px] bg-sage-soft px-2 py-0.5 font-display text-[13px] text-sage-deep">소식</span>
  );
}

/** 첫 줄은 제목처럼, 나머지는 본문 크기로. clamp 면 목록에서 세 줄까지만 (사진은 오른쪽에 작게) */
export function PostBody({ post, clamp = false }: { post: Pick<StorePost, "body" | "image_url">; clamp?: boolean }) {
  const { title, rest } = postParts(post.body);
  return (
    <span className="flex gap-3">
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className={`text-[17px] leading-snug font-bold break-words whitespace-pre-wrap ${clamp ? "line-clamp-2" : ""}`}>{title}</span>
        {rest && <span className={`text-[15px] leading-relaxed break-words whitespace-pre-wrap ${clamp ? "line-clamp-3" : ""}`}>{rest}</span>}
      </span>
      {post.image_url &&
        (clamp ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.image_url} alt="" loading="lazy" className="size-[88px] shrink-0 rounded-2xl object-cover" />
        ) : null)}
    </span>
  );
}

export function LikeButton({ on, count, onClick }: { on: boolean; count: number; onClick: () => void }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} className="flex min-h-11 items-center gap-1.5 text-[15px] font-bold active:scale-95">
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden fill={on ? "#D9706F" : "none"} stroke={on ? "#D9706F" : "currentColor"} strokeWidth="2.2" strokeLinejoin="round">
        <path d="M12 20s-7.5-4.6-9.3-9.2C1.5 7.5 3.6 4.5 6.8 4.5c2.2 0 3.9 1.2 5.2 3 1.3-1.8 3-3 5.2-3 3.2 0 5.3 3 4.1 6.3C19.5 15.4 12 20 12 20z" />
      </svg>
      공감 {count}
    </button>
  );
}

export function CommentIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round">
      <path d="M4 5.5h16v11H10l-4.5 3.5V16.5H4z" />
    </svg>
  );
}
