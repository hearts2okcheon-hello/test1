"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { errorMessage } from "@/lib/errors";
import { formatPhone, kakaoMapUrl } from "@/lib/hours";
import { uploadStoreImage } from "@/lib/images";
import { PHOTO_CATEGORIES, STORE_CATEGORIES } from "@/lib/signs";
import { createClient } from "@/lib/supabase/client";
import type { PhotoCategory, RegularHours, StoreMenu, StorePhoto, Weekday } from "@/lib/types";
import { Osori } from "./Osori";
import { PhotoPicker } from "./PhotoPicker";
import { useToast } from "./Toast";

const DAYS: [Weekday, string][] = [
  ["mon", "월"], ["tue", "화"], ["wed", "수"], ["thu", "목"], ["fri", "금"], ["sat", "토"], ["sun", "일"],
];

type DayRow = { open: boolean; from: string; to: string };
type MenuRow = { key: string; name: string; price: string; photo_url: string | null; file: File | null; preview: string | null };
type PhotoRow = { key: string; category: PhotoCategory; url: string | null; file: File | null; preview: string };

export type StoreEditorValues = {
  storeId: string | null;
  name: string;
  phone: string;
  category: string | null;
  neighborhood: string | null;
  intro: string | null;
  address: string | null;
  hours: RegularHours | null;
  menus: StoreMenu[];
  photos: StorePhoto[];
};

function initialDays(hours: RegularHours | null): Record<Weekday, DayRow> {
  const out = {} as Record<Weekday, DayRow>;
  for (const [d] of DAYS) {
    if (!hours) {
      // 처음 등록: 월~토 09~20시, 일요일 휴무로 채워 두고 고치게 한다
      out[d] = { open: d !== "sun", from: "09:00", to: "20:00" };
    } else {
      const r = hours[d]?.[0];
      out[d] = r ? { open: true, from: r[0], to: r[1] } : { open: false, from: "09:00", to: "20:00" };
    }
  }
  return out;
}

const INPUT = "min-h-14 w-full min-w-0 rounded-2xl border-2 border-line bg-white px-3.5 text-lg";

/** 가게 등록·수정 화면 하나로 쓴다. 번호는 가게 페이지 순서와 같다 */
export function StoreEditor({ initial, code }: { initial: StoreEditorValues; code?: string }) {
  const router = useRouter();
  const { node, show } = useToast();
  const [storeId, setStoreId] = useState(initial.storeId);
  const registering = initial.storeId === null;
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState(initial.name);
  const [phone, setPhone] = useState(formatPhone(initial.phone));
  const [category, setCategory] = useState(initial.category ?? "");
  const [neighborhood, setNeighborhood] = useState(initial.neighborhood ?? "");
  const [firstPost, setFirstPost] = useState("");
  const [intro, setIntro] = useState(initial.intro ?? "");
  const [address, setAddress] = useState(initial.address ?? "");
  const [days, setDays] = useState(() => initialDays(initial.hours));
  const [menus, setMenus] = useState<MenuRow[]>(() =>
    initial.menus.map((m) => ({ key: m.id, name: m.name, price: m.price === null ? "" : String(m.price), photo_url: m.photo_url, file: null, preview: m.photo_url })),
  );
  const [photos, setPhotos] = useState<PhotoRow[]>(() =>
    initial.photos.map((p) => ({ key: p.id, category: p.category, url: p.url, file: null, preview: p.url })),
  );
  const [galleryTab, setGalleryTab] = useState<PhotoCategory>("store");
  const keyRef = useRef(0);
  const nextKey = () => `new-${keyRef.current++}`;

  function setDay(d: Weekday, patch: Partial<DayRow>) {
    setDays((cur) => ({ ...cur, [d]: { ...cur[d], ...patch } }));
  }

  function copyMonday() {
    setDays((cur) => {
      const next = { ...cur };
      for (const [d] of DAYS) if (next[d].open) next[d] = { ...next[d], from: cur.mon.from, to: cur.mon.to };
      return next;
    });
  }

  function setMenu(key: string, patch: Partial<MenuRow>) {
    setMenus((cur) => cur.map((m) => (m.key === key ? { ...m, ...patch } : m)));
  }

  async function submit() {
    if (!name.trim()) return show("가게 이름을 써 주세요.", "think");
    if (phone.replace(/\D/g, "").length < 9) return show("전화번호를 다시 확인해 주세요.", "think");
    if (!DAYS.some(([d]) => days[d].open)) return show("영업하는 요일을 하루 이상 넣어 주세요.", "think");
    if (menus.some((m) => !m.name.trim())) return show("메뉴 이름을 써 주세요. 필요 없는 칸은 지워 주세요.", "think");

    const hours: RegularHours = {};
    for (const [d] of DAYS) hours[d] = days[d].open ? [[days[d].from, days[d].to]] : null;

    const fields = {
      p_name: name.trim(),
      p_phone: phone,
      p_regular_hours: hours,
      p_category: category || null,
      p_neighborhood: neighborhood.trim() || null,
      p_intro: intro.trim() || null,
      p_address: address.trim() || null,
    };

    setBusy(true);
    try {
      const supabase = createClient();
      let id = storeId;
      if (id) {
        const { error } = await supabase.rpc("update_store_profile", { p_store_id: id, ...fields });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.rpc("register_store", fields);
        if (error) throw error;
        id = data as string;
        // 사진에서 실패해도 다시 누르면 새 가게가 아니라 수정이 된다
        setStoreId(id);
      }
      const targetId = id;

      const savedMenus = await Promise.all(
        menus.map(async (m) => ({
          name: m.name.trim(),
          price: m.price === "" ? null : Number(m.price),
          photo_url: m.file ? await uploadStoreImage(supabase, targetId, m.file) : m.photo_url,
        })),
      );
      const savedPhotos = await Promise.all(
        photos.map(async (p) => ({
          category: p.category,
          url: p.file ? await uploadStoreImage(supabase, targetId, p.file) : p.url,
        })),
      );
      const { error: mediaError } = await supabase.rpc("save_store_media", { p_store_id: targetId, p_menus: savedMenus, p_photos: savedPhotos });
      if (mediaError) throw mediaError;

      if (registering && firstPost.trim()) {
        const { error } = await supabase.rpc("save_store_post", { p_store_id: targetId, p_body: firstPost.trim() });
        if (error) throw error;
      }

      show(registering ? "가게를 등록했어요! 이제 마을방송에 나와요." : "가게 정보를 고쳤어요.", "proud");
      router.push(registering ? "/owner" : `/stores/${targetId}`);
      router.refresh();
    } catch (e) {
      show(errorMessage(e), "think");
    } finally {
      setBusy(false);
    }
  }

  const tabPhotos = photos.filter((p) => p.category === galleryTab);

  return (
    <form
      className="flex flex-col gap-3.5"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <header className="flex items-center gap-2.5">
        <Osori mood={registering ? "proud" : "work"} size={76} />
        <div className="flex flex-1 flex-col gap-0.5">
          <h1 className="font-display text-[26px] leading-tight font-normal">{registering ? "우리 가게 등록하기" : "가게 정보 고치기"}</h1>
          <p className="text-base text-muted">{registering ? `${code ?? ""} 코드로 들어왔어요.` : "언제든 다시 고칠 수 있어요."}</p>
        </div>
      </header>

      <Section n={1} title="가게 이름 · 카테고리 · 동네 태그">
        <Field label="가게 이름" required>
          <input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="예: 대박 맛집 카페" className={INPUT} />
        </Field>
        <Field label="카테고리">
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={INPUT}>
            <option value="">골라 주세요</option>
            {[...new Set([...STORE_CATEGORIES, ...(initial.category ? [initial.category] : [])])].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="동네 태그">
          <input value={neighborhood} maxLength={30} onChange={(e) => setNeighborhood(e.target.value)} placeholder="예: 구읍 사랑방" className={INPUT} />
        </Field>
        <Field label="전화번호" required hint="가게 페이지에 보이고, 손님이 누르면 전화가 걸려요.">
          <input type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} placeholder="010-0000-0000" className={INPUT} />
        </Field>
      </Section>

      {registering && (
        <Section n={2} title="실시간 사장님 소식 & 공지" optional>
          <p className="text-base text-muted">손님께 전할 첫 소식이 있으면 써 주세요. 사진은 등록한 뒤에 소식을 올릴 때 넣을 수 있어요.</p>
          <textarea value={firstPost} maxLength={500} rows={3} onChange={(e) => setFirstPost(e.target.value)} placeholder="예: 오늘 갓 만든 떡볶이 나왔어요!" className={`${INPUT} py-3`} />
        </Section>
      )}

      <Section n={3} title="소개글" optional>
        <p className="text-base text-muted">주민 댓글은 가게 페이지에서 소개글 아래에 달려요.</p>
        <textarea value={intro} maxLength={500} rows={3} onChange={(e) => setIntro(e.target.value)} placeholder="예: 이웃들과 소소한 정을 나누는 분식집입니다." className={`${INPUT} py-3`} />
      </Section>

      <Section n={4} title="대표 메뉴 & 가격" optional>
        {menus.map((m) => (
          <div key={m.key} className="flex items-start gap-2.5 rounded-[18px] border-2 border-line bg-white p-2.5">
            <PhotoPicker
              preview={m.preview}
              label="메뉴 사진"
              onPick={(file) => setMenu(m.key, { file, preview: URL.createObjectURL(file) })}
            />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <input aria-label="메뉴 이름" value={m.name} maxLength={40} onChange={(e) => setMenu(m.key, { name: e.target.value })} placeholder="메뉴 이름" className="min-h-12 w-full rounded-xl border-2 border-line px-3 text-lg" />
              <span className="flex items-center gap-1.5">
                <input aria-label="가격" inputMode="numeric" value={m.price} onChange={(e) => setMenu(m.key, { price: e.target.value.replace(/\D/g, "").slice(0, 7) })} placeholder="가격" className="min-h-12 w-full min-w-0 rounded-xl border-2 border-line px-3 text-lg" />
                <span className="text-lg">원</span>
              </span>
              <button type="button" onClick={() => setMenus((cur) => cur.filter((x) => x.key !== m.key))} className="min-h-11 self-end rounded-xl px-2 text-base font-bold text-[#A4423F]">
                이 메뉴 지우기
              </button>
            </div>
          </div>
        ))}
        <AddButton onClick={() => setMenus((cur) => [...cur, { key: nextKey(), name: "", price: "", photo_url: null, file: null, preview: null }])}>메뉴 더하기</AddButton>
      </Section>

      <Section n={5} title="위치 & 바로 연결" optional>
        <Field label="도로명 주소" hint="손님이 지도를 누르면 카카오맵에서 이 주소를 찾아 줘요.">
          <input value={address} maxLength={100} onChange={(e) => setAddress(e.target.value)} placeholder="예: 충북 옥천군 옥천읍 중앙로 1" className={INPUT} />
        </Field>
        {address.trim() && (
          <a href={kakaoMapUrl(address)} target="_blank" rel="noopener noreferrer" className="flex min-h-12 items-center justify-center rounded-2xl border-2 border-line bg-white text-base font-bold">
            카카오맵에서 위치 확인하기
          </a>
        )}
      </Section>

      <Section n={6} title="운영 날짜 & 영업시간" required>
        <p className="text-base text-muted">쉬는 요일은 눌러서 &ldquo;휴무&rdquo;로 바꿔 주세요. 영업중·영업종료·정기휴일은 이 시간으로 자동 표시돼요.</p>
        {DAYS.map(([d, label]) => (
          <div key={d} className="flex flex-wrap items-center gap-2">
            <span className="w-6 text-lg font-bold">{label}</span>
            <button
              type="button"
              aria-pressed={days[d].open}
              onClick={() => setDay(d, { open: !days[d].open })}
              className={`min-h-12 w-[68px] rounded-xl border-2 text-base font-bold ${days[d].open ? "border-sage-deep bg-sage-soft" : "border-yellow-deep bg-yellow-soft"}`}
            >
              {days[d].open ? "영업" : "휴무"}
            </button>
            {days[d].open && (
              <span className="flex w-full items-center gap-1 pb-1">
                <input aria-label={`${label}요일 여는 시간`} type="time" value={days[d].from} onChange={(e) => setDay(d, { from: e.target.value })} className="min-h-12 w-full min-w-0 rounded-xl border-2 border-line bg-white px-1 text-base" />
                <span aria-hidden>~</span>
                <input aria-label={`${label}요일 닫는 시간`} type="time" value={days[d].to} onChange={(e) => setDay(d, { to: e.target.value })} className="min-h-12 w-full min-w-0 rounded-xl border-2 border-line bg-white px-1 text-base" />
              </span>
            )}
          </div>
        ))}
        {days.mon.open && (
          <button type="button" onClick={copyMonday} className="min-h-12 rounded-2xl border-2 border-line bg-white text-base font-bold">
            월요일 시간을 다른 요일에도 넣기
          </button>
        )}
      </Section>

      <Section n={7} title="사진 갤러리" optional>
        <div role="tablist" aria-label="사진 종류" className="flex gap-1.5">
          {PHOTO_CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={galleryTab === c.id}
              onClick={() => setGalleryTab(c.id)}
              className={`min-h-12 flex-1 rounded-2xl border-2 text-base font-bold ${galleryTab === c.id ? "border-ink bg-yellow" : "border-line bg-white"}`}
            >
              {c.label} {photos.filter((p) => p.category === c.id).length}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {tabPhotos.map((p) => (
            <div key={p.key} className="relative aspect-square overflow-hidden rounded-xl border-2 border-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.preview} alt="" className="size-full object-cover" />
              <button
                type="button"
                aria-label="이 사진 지우기"
                onClick={() => setPhotos((cur) => cur.filter((x) => x.key !== p.key))}
                className="absolute top-1 right-1 flex size-9 items-center justify-center rounded-full border-2 border-line bg-card text-lg font-bold"
              >
                ×
              </button>
            </div>
          ))}
          <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl border-2 border-dashed border-line-strong bg-cream text-center text-sm font-bold">
            <span aria-hidden className="text-3xl leading-none">+</span>
            사진 더하기
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                setPhotos((cur) => [...cur, ...files.map((file) => ({ key: nextKey(), category: galleryTab, url: null, file, preview: URL.createObjectURL(file) }))]);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </Section>

      <div className="sticky bottom-0 -mx-[18px] flex gap-2 bg-paper px-[18px] pt-2 pb-[max(14px,env(safe-area-inset-bottom))]">
        {!registering && (
          <button type="button" onClick={() => router.back()} className="min-h-16 shrink-0 rounded-[22px] border-2 border-line bg-card px-4 text-lg font-bold">
            취소
          </button>
        )}
        <button type="submit" disabled={busy} className="min-h-16 flex-1 rounded-[22px] border-2 border-sage-deep bg-sage font-display text-[21px] text-white disabled:opacity-60">
          {busy ? "저장하는 중…" : registering ? "등록하고 마을방송에 올리기" : "고친 내용 저장"}
        </button>
      </div>
      {node}
    </form>
  );
}

function Section({ n, title, optional, required, children }: { n: number; title: string; optional?: boolean; required?: boolean; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-[22px] border-2 border-line bg-card px-3.5 py-4">
      <h2 className="font-display text-[21px] leading-snug font-normal">
        {n}. {title}
        {optional && <span className="ml-1.5 font-sans text-sm text-muted">(선택)</span>}
        {required && <span className="ml-1.5 font-sans text-sm font-bold text-[#A4423F]">(필수)</span>}
      </h2>
      {children}
    </section>
  );
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-lg font-bold">
        {label}
        {required && <span className="ml-1 text-sm text-[#A4423F]">필수</span>}
      </span>
      {children}
      {hint && <span className="text-sm leading-normal text-muted">{hint}</span>}
    </label>
  );
}

function AddButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="min-h-14 rounded-2xl border-2 border-dashed border-line-strong bg-cream text-lg font-bold">
      + {children}
    </button>
  );
}
