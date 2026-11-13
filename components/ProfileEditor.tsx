"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { errorMessage } from "@/lib/errors";
import { formatPhone } from "@/lib/hours";
import { uploadAvatar } from "@/lib/images";
import { pushWithLoading } from "@/lib/nav";
import { AREAS } from "@/lib/plans";
import { createClient } from "@/lib/supabase/client";
import type { MyProfile } from "@/lib/types";
import { Avatar } from "./Avatar";
import { useToast } from "./Toast";

const INPUT = "min-h-14 w-full min-w-0 rounded-2xl border-2 border-line bg-white px-3.5 text-lg";

/** 내 정보 등록·고치기: 프로필 사진(선택) · 이름 · 사는 곳 · 전화번호 */
export function ProfileEditor({ userId, initial }: { userId: string; initial: MyProfile }) {
  const router = useRouter();
  const { node, show } = useToast();
  const registered = initial.registered;
  const [name, setName] = useState(initial.name ?? "");
  const startsCustom = !!initial.area && !AREAS.includes(initial.area);
  const [area, setArea] = useState(initial.area ?? "");
  const [custom, setCustom] = useState(startsCustom);
  const [phone, setPhone] = useState(formatPhone(initial.phone ?? ""));
  const [avatarUrl, setAvatarUrl] = useState(initial.avatar_url);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!name.trim()) return show("이름을 써 주세요.", "think");
    if (!area.trim()) return show("사는 곳을 골라 주세요.", "think");
    if (phone.replace(/\D/g, "").length < 9) return show("전화번호를 다시 확인해 주세요.", "think");
    setBusy(true);
    try {
      const supabase = createClient();
      const url = file ? await uploadAvatar(supabase, userId, file) : avatarUrl;
      const { error } = await supabase.rpc("save_my_profile", { p_name: name.trim(), p_area: area.trim(), p_phone: phone, p_avatar_url: url });
      if (error) throw error;
      show(registered ? "내 정보를 고쳤어요." : "내 정보를 등록했어요!", "proud");
      pushWithLoading(router, "/owner");
      router.refresh();
    } catch (e) {
      show(errorMessage(e), "think");
      setBusy(false);
    }
  }

  return (
    <form
      className="flex flex-col gap-3.5"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      {/* 등록 전에 뒤로 가면 홈이 아니라 로그인 화면으로 */}
      <Link href={registered ? "/owner" : "/owner?back=1"} className="flex min-h-12 w-fit items-center gap-1.5 rounded-2xl border-2 border-line bg-card px-3.5 text-base font-bold">
        <span aria-hidden>‹</span> 뒤로
      </Link>

      <header className="flex flex-col gap-0.5">
        <h1 className="font-display text-[26px] leading-tight font-normal">{registered ? "내 정보 고치기" : "내 정보 등록하기"}</h1>
        <p className="text-base text-muted">{registered ? "언제든 다시 고칠 수 있어요." : "카카오 계정으로 들어왔어요. 세 가지만 알려 주세요."}</p>
      </header>

      <section className="flex flex-col items-center gap-2 rounded-[22px] border-2 border-line bg-card px-3.5 py-4">
        {/* 새로 고른 사진은 올리기 전에 미리 보여 준다 */}
        <Avatar url={preview ?? avatarUrl} size={110} />
        <div className="flex flex-wrap justify-center gap-2">
          <label className="flex min-h-12 cursor-pointer items-center rounded-2xl border-2 border-line bg-white px-4 text-base font-bold">
            프로필 사진 고르기
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setFile(f);
                  setPreview(URL.createObjectURL(f));
                }
                e.target.value = "";
              }}
            />
          </label>
          {(preview || avatarUrl) && (
            <button
              type="button"
              onClick={() => {
                setFile(null);
                setPreview(null);
                setAvatarUrl(null);
              }}
              className="min-h-12 rounded-2xl border-2 border-line bg-white px-4 text-base font-bold text-muted"
            >
              오소리로 되돌리기
            </button>
          )}
        </div>
        <p className="text-sm text-muted">사진을 안 올리면 오소리가 프로필이 돼요.</p>
      </section>

      <section className="flex flex-col gap-3 rounded-[22px] border-2 border-line bg-card px-3.5 py-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-lg font-bold">
            이름 <span className="ml-1 text-sm text-[#A4423F]">필수</span>
          </span>
          <input value={name} maxLength={20} onChange={(e) => setName(e.target.value)} placeholder="예: 김옥천" autoComplete="name" className={INPUT} />
        </label>

        <div className="flex flex-col gap-1.5">
          <span className="text-lg font-bold">
            사는 곳 <span className="ml-1 text-sm text-[#A4423F]">필수</span>
          </span>
          <div role="radiogroup" aria-label="사는 곳" className="grid grid-cols-3 gap-2">
            {AREAS.map((a) => {
              const on = !custom && area === a;
              return (
                <button
                  key={a}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => {
                    setCustom(false);
                    setArea(a);
                  }}
                  className={`min-h-14 rounded-2xl border-2 text-lg font-bold ${on ? "border-sage-deep bg-sage-soft text-sage-deep" : "border-line bg-white"}`}
                >
                  {a}
                </button>
              );
            })}
            <button
              type="button"
              role="radio"
              aria-checked={custom}
              onClick={() => {
                setCustom(true);
                setArea("");
              }}
              className={`col-span-3 min-h-14 rounded-2xl border-2 text-lg font-bold ${custom ? "border-sage-deep bg-sage-soft text-sage-deep" : "border-line bg-white"}`}
            >
              직접 입력
            </button>
          </div>
          {custom && <input aria-label="사는 곳 직접 입력" autoFocus value={area} maxLength={20} onChange={(e) => setArea(e.target.value)} placeholder="예: 대전 동구" className={INPUT} />}
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-lg font-bold">
            전화번호 <span className="ml-1 text-sm text-[#A4423F]">필수</span>
          </span>
          <input type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} placeholder="010-0000-0000" autoComplete="tel" className={INPUT} />
          <span className="text-sm leading-normal text-muted">다른 이웃에게는 보이지 않아요. 옥천신문이 연락할 때만 써요.</span>
        </label>
      </section>

      <div className="sticky bottom-0 -mx-[18px] bg-paper px-[18px] pt-2 pb-[max(14px,env(safe-area-inset-bottom))]">
        <button type="submit" disabled={busy} className="min-h-16 w-full rounded-[22px] border-2 border-sage-deep bg-sage font-display text-[21px] text-white disabled:opacity-60">
          {busy ? "저장하는 중…" : registered ? "고친 내용 저장" : "내 정보 등록하기"}
        </button>
      </div>
      {node}
    </form>
  );
}
