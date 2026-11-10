"use client";

import { errorMessage } from "@/lib/errors";
import { toggleFavorite, useFavorites } from "@/lib/favorites";
import { useToast } from "./Toast";

/** 가게 오른쪽 위 별. 누르면 즐겨찾기에 넣고 빼며, 홈 "즐겨찾는 가게"에 모인다 */
export function FavoriteStar({ storeId, storeName, size = 26, className = "", initialOn = false }: { storeId: string; storeName: string; size?: number; className?: string; initialOn?: boolean }) {
  const favs = useFavorites();
  const on = favs.ready ? favs.ids.has(storeId) : initialOn;
  const { node, show } = useToast();

  async function click(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const r = await toggleFavorite(storeId);
    if (r.error) show(errorMessage(r.error), "think");
    else show(r.on ? "즐겨찾기에 넣었어요. 홈에서 바로 보여요!" : "즐겨찾기에서 뺐어요.", r.on ? "proud" : "smile");
  }

  return (
    <>
      <button
        type="button"
        aria-pressed={on}
        aria-label={on ? `${storeName} 즐겨찾기 빼기` : `${storeName} 즐겨찾기`}
        onClick={click}
        className={`flex size-11 shrink-0 items-center justify-center rounded-full active:scale-90 ${className}`}
      >
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden fill={on ? "#F5C96A" : "none"} stroke={on ? "#D9A43A" : "var(--color-line-strong)"} strokeWidth="2" strokeLinejoin="round">
          <path d="M12 3.2l2.7 5.5 6 .9-4.35 4.25 1 6L12 17l-5.35 2.85 1-6L3.3 9.6l6-.9z" />
        </svg>
      </button>
      {node}
    </>
  );
}
