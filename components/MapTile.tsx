import { kakaoMapUrl } from "@/lib/hours";

/** 지도 모양 네모. 누르면 카카오맵으로 간다. 실제 지도를 넣으려면 카카오 개발자 키가 필요해 일단 그림으로 둔다 */
export function MapTile({ address }: { address: string }) {
  return (
    <a
      href={kakaoMapUrl(address)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${address}, 카카오맵에서 보기`}
      className="relative block aspect-[2/1] w-full overflow-hidden rounded-2xl border-2 border-line bg-cream"
    >
      <svg viewBox="0 0 320 160" className="size-full" aria-hidden preserveAspectRatio="xMidYMid slice">
        <rect width="320" height="160" className="fill-[#F4EFE4]" />
        <path d="M225 0h95v85z" className="fill-sage-soft" />
        <path d="M-10 30 L170 175 M60 -10 L250 175 M330 20 L190 170" className="stroke-white" strokeWidth="6" fill="none" />
        <path d="M-10 110 L330 60 M110 -10 L60 175" className="stroke-yellow-line" strokeWidth="11" fill="none" />
        <path d="M250 -10 L130 175" className="stroke-yellow-line" strokeWidth="9" fill="none" />
        <path d="M160 34c-15 0-26 11-26 25 0 19 26 44 26 44s26-25 26-44c0-14-11-25-26-25z" className="fill-coral" />
        <circle cx="160" cy="59" r="9" className="fill-white" />
      </svg>
      <span className="absolute right-2 bottom-2 rounded-xl border-2 border-line bg-card px-2.5 py-1 text-sm font-bold">카카오맵 열기 ›</span>
    </a>
  );
}
