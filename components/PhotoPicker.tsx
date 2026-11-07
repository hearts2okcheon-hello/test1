"use client";

/** 사진 한 장 고르기 (메뉴·소식) */
export function PhotoPicker({ preview, label, onPick, size = 96 }: { preview: string | null; label: string; onPick: (file: File) => void; size?: number }) {
  return (
    <label
      className="flex shrink-0 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-line-strong bg-cream text-center text-sm font-bold"
      style={{ width: size, height: size }}
    >
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt={label} className="size-full object-cover" />
      ) : (
        <>
          <span aria-hidden className="text-2xl leading-none">+</span>
          사진
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
