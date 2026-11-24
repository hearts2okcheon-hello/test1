import Link from "next/link";
import { BANNERS, type Banner } from "@/lib/banners";
import { Carousel } from "./Carousel";
import { Osori } from "./Osori";

const TONE: Record<Banner["tone"], string> = { sage: "bg-sage-soft", yellow: "bg-yellow-soft", cream: "bg-cream" };

/**
 * 소통광장 맨 위의 광고 배너 (ADR-023). 옆으로 밀거나 아래 점을 눌러 넘긴다.
 * 아래의 글이 너무 밀려 내려가지 않게 높이를 104px 로 묶어 둔다. 배너 내용은 lib/banners.ts
 */
export function BannerCarousel({ banners = BANNERS }: { banners?: Banner[] }) {
  if (banners.length === 0) return null;
  return (
    <Carousel label="광고와 안내">
      {banners.map((b) => (
        <BannerSlide key={b.id} banner={b} />
      ))}
    </Carousel>
  );
}

function BannerSlide({ banner: b }: { banner: Banner }) {
  const cls = `ok-sticker mx-0.5 flex h-[104px] items-center gap-3 overflow-hidden rounded-[22px] border-2 border-line ${b.image ? "bg-card" : `${TONE[b.tone]} pr-3 pl-[18px]`}`;
  const inner = b.image ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={b.image} alt={b.title} className="size-full object-cover" />
  ) : (
    <>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="line-clamp-1 font-display text-[18px] leading-snug">{b.title}</span>
        <span className="line-clamp-2 text-[13px] leading-snug text-muted break-keep">{b.body}</span>
      </span>
      <Osori mood={b.mood} size={68} />
    </>
  );
  // 앱 안으로 가는 배너는 그대로 옮겨 가고, 바깥으로 가는 배너는 새 창으로 연다
  return b.href.startsWith("/") ? (
    <Link href={b.href} className={cls}>
      {inner}
    </Link>
  ) : (
    <a href={b.href} target="_blank" rel="noopener noreferrer" className={cls}>
      {inner}
    </a>
  );
}
