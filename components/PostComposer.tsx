"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { errorMessage } from "@/lib/errors";
import { uploadStoreImage } from "@/lib/images";
import { pushWithLoading } from "@/lib/nav";
import { createClient } from "@/lib/supabase/client";
import type { StorePost } from "@/lib/types";
import { Osori } from "./Osori";
import { PhotoPicker } from "./PhotoPicker";
import { useToast } from "./Toast";

const BODY_MAX = 500;

/** 소식·공지 쓰기·고치기. 올리면 오늘 들어온 소식에 바로 뜬다 */
export function PostComposer({ storeId, storeName, post }: { storeId: string; storeName: string; post: StorePost | null }) {
  const router = useRouter();
  const { node, show } = useToast();
  const [kind, setKind] = useState<"news" | "notice">(post?.kind ?? "news");
  const [body, setBody] = useState(post?.body ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(post?.image_url ?? null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!body.trim()) return show("내용을 써 주세요.", "think");
    setBusy(true);
    try {
      const supabase = createClient();
      const imageUrl = file ? await uploadStoreImage(supabase, storeId, file) : preview;
      const { error } = await supabase.rpc("save_store_post", {
        p_store_id: storeId,
        p_body: body.trim(),
        p_kind: kind,
        p_image_url: imageUrl,
        p_post_id: post?.id ?? null,
      });
      if (error) throw error;
      pushWithLoading(router, "/owner");
      router.refresh();
    } catch (e) {
      show(errorMessage(e), "think");
      setBusy(false);
    }
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <header className="flex items-center gap-2.5">
        <Osori mood="talk" size={76} />
        <div className="flex flex-1 flex-col gap-0.5">
          <span className="text-base text-muted">{storeName}</span>
          <h1 className="font-display text-[26px] leading-tight font-normal">{post ? "소식 고치기" : "소식·공지 올리기"}</h1>
        </div>
      </header>

      <div className="flex gap-2" role="radiogroup" aria-label="글 종류">
        {(["news", "notice"] as const).map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={kind === k}
            onClick={() => setKind(k)}
            className={`min-h-16 flex-1 rounded-[20px] border-2 font-display text-xl ${kind === k ? "border-yellow-deep bg-yellow" : "border-line bg-card"}`}
          >
            {k === "news" ? "가게 소식" : "공지"}
          </button>
        ))}
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-lg font-bold">무슨 소식인가요?</span>
        <textarea
          value={body}
          maxLength={BODY_MAX}
          rows={5}
          onChange={(e) => setBody(e.target.value)}
          placeholder="예: 오늘 갓 만든 떡볶이 나왔어요!"
          className="w-full rounded-2xl border-2 border-line bg-white p-3.5 text-lg leading-relaxed"
        />
        <span className="self-end text-sm text-muted">
          {body.length} / {BODY_MAX}
        </span>
      </label>

      <div className="flex items-center gap-3">
        <PhotoPicker
          preview={preview}
          label="소식 사진"
          size={110}
          onPick={(f) => {
            setFile(f);
            setPreview(URL.createObjectURL(f));
          }}
        />
        <div className="flex flex-col items-start gap-1">
          <span className="text-base text-muted">사진은 넣지 않아도 돼요.</span>
          {preview && (
            <button
              type="button"
              onClick={() => {
                setFile(null);
                setPreview(null);
              }}
              className="min-h-11 text-base font-bold text-[#A4423F]"
            >
              사진 빼기
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={() => pushWithLoading(router, "/owner")} className="min-h-16 shrink-0 rounded-[22px] border-2 border-line bg-card px-4 text-lg font-bold">
          취소
        </button>
        <button type="submit" disabled={busy} className="min-h-16 flex-1 rounded-[22px] border-2 border-sage-deep bg-sage font-display text-[21px] text-white disabled:opacity-60">
          {busy ? "올리는 중…" : post ? "고친 내용 저장" : "마을방송에 올리기"}
        </button>
      </div>
      {node}
    </form>
  );
}
