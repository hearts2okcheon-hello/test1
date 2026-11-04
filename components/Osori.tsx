import Image from "next/image";
import type { Mood } from "@/lib/signs";

/**
 * 오소리 표정 (design-system.md §7)
 * 이미 작은 투명 WebP 라서 Next 이미지 최적화를 끈다 — 최적화기가 JPEG로 바꾸며 투명 배경을 망가뜨린다
 */
export function Osori({ mood, size = 56, alt = "", className = "" }: { mood: Mood; size?: number; alt?: string; className?: string }) {
  return (
    <Image
      unoptimized
      src={`/osori/${mood}.webp`}
      alt={alt}
      width={size}
      height={size}
      className={`block shrink-0 object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
