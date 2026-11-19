"use client";

/** 사진 한 장 고르기 (메뉴·소식). hint 는 빈칸일 때 보이는 글자, camera 면 + 대신 사진기 그림 */
export function PhotoPicker({
  preview,
  label,
  onPick,
  size = 96,
  hint = "사진",
  camera = false,
}: {
  preview: string | null;
  label: string;
  onPick: (file: File) => void;
  size?: number;
  hint?: string;
  camera?: boolean;
}) {
  return (
    <label
      className="flex shrink-0 cursor-pointer flex-col items-center justify-center gap-1 overflow-hidden rounded-xl border-2 border-dashed border-line-strong bg-cream text-center text-sm font-bold has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-sage-deep"
      style={{ width: size, height: size }}
    >
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt={label} className="size-full object-cover" />
      ) : (
        <>
          {camera ? (
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M4 8.5h3.2l1.5-2.3h6.6l1.5 2.3H20V19H4z" />
              <circle cx="12" cy="13.5" r="3.2" />
            </svg>
          ) : (
            <span aria-hidden className="text-2xl leading-none">+</span>
          )}
          {hint}
          <span className="sr-only">{label} 고르기</span>
        </>
      )}
      <input
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onPick(file);
          e.target.value = "";
        }}
      />
    </label>
  );
}
