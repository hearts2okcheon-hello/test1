"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { TimeAgo } from "@/components/TimeAgo";
import { useToast } from "@/components/Toast";
import { askDelete } from "@/lib/confirm";
import { errorMessage } from "@/lib/errors";
import { createClient } from "@/lib/supabase/client";
import type { AdminContent } from "@/lib/types";

/** 옥천신문: 소식·댓글 살펴보고 문제 있는 글 지우기 */
export function ContentPanel({ content }: { content: AdminContent }) {
  const router = useRouter();
  const { node, show } = useToast();
  const [busy, setBusy] = useState(false);

  async function remove(rpc: "delete_store_post" | "delete_store_comment", id: string) {
    if (!(await askDelete({ detail: "이 글은 되돌릴 수 없어요." }))) return;
    setBusy(true);
    const { error } = await (rpc === "delete_store_post"
      ? createClient().rpc(rpc, { p_post_id: id })
      : createClient().rpc(rpc, { p_comment_id: id }));
    setBusy(false);
    if (error) return show(errorMessage(error), "think");
    show("지웠어요.", "proud");
    router.refresh();
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h2 className="font-display text-[22px] font-normal">사장님 소식 {content.posts.length}개</h2>
        {content.posts.length === 0 && <Empty text="아직 올라온 소식이 없어요." />}
        {content.posts.map((p) => (
          <Row key={p.id} store={p.store_name} storeId={p.store_id} at={p.created_at} body={p.body} image={p.image_url} busy={busy} onDelete={() => remove("delete_store_post", p.id)} tag={p.kind === "notice" ? "공지" : "소식"} />
        ))}
      </div>
      <div className="flex flex-col gap-2">
        <h2 className="font-display text-[22px] font-normal">주민 댓글 {content.comments.length}개</h2>
        {content.comments.length === 0 && <Empty text="아직 달린 댓글이 없어요." />}
        {content.comments.map((c) => (
          <Row key={c.id} store={c.store_name} storeId={c.store_id} at={c.created_at} body={c.body} busy={busy} onDelete={() => remove("delete_store_comment", c.id)} />
        ))}
      </div>
      {node}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-[20px] border-2 border-dashed border-line px-4 py-3 text-sm text-muted">{text}</p>;
}

function Row({ store, storeId, at, body, image, tag, busy, onDelete }: { store: string; storeId: string; at: string; body: string; image?: string | null; tag?: string; busy: boolean; onDelete: () => void }) {
  return (
    <article className="flex gap-2.5 rounded-[20px] border-2 border-line bg-card px-3.5 py-3">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-xs text-muted">
          <Link href={`/stores/${storeId}`} className="font-bold underline">{store}</Link>
          {tag ? ` · ${tag}` : ""} · <TimeAgo iso={at} />
        </span>
        <p className="text-[15px] leading-normal whitespace-pre-wrap">{body}</p>
        <button type="button" disabled={busy} onClick={onDelete} className="min-h-10 self-start rounded-xl border-2 border-line bg-white px-3 text-sm font-bold text-[#A4423F]">
          지우기
        </button>
      </div>
      {image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" loading="lazy" className="size-20 shrink-0 rounded-xl object-cover" />
      )}
    </article>
  );
}
