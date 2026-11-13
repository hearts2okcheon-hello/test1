import Link from "next/link";
import { Osori } from "./Osori";

/** 내 정보 오른쪽 위, 신문을 펼쳐 든 오소리. 누르면 관리자 로그인으로 간다 */
export function AdminDoor({ href }: { href: string }) {
  return (
    <Link href={href} aria-label="옥천신문 관리자 로그인" className="ok-sticker relative block size-14 overflow-hidden rounded-full border-2 border-line bg-yellow-soft">
      {/* 얼굴만 신문 위로 나오게 몸을 아래로 내린다 */}
      <Osori mood="basic" size={50} className="absolute -bottom-[8px] left-1/2 -translate-x-1/2" />
      <svg aria-hidden viewBox="0 0 56 56" className="absolute inset-0 size-full">
        {/* 양쪽으로 펼친 신문 */}
        <path d="M9 35l18 3v15l-18-3z" fill="#FFFFFF" stroke="#5B4636" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M47 35l-18 3v15l18-3z" fill="#FFFFFF" stroke="#5B4636" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M27 38h2v15h-2z" fill="#E8DAB8" />
        <path d="M13 40l10 1.6M13 44l10 1.6M33 41.6l10-1.6M33 45.6l10-1.6" stroke="#A8987F" strokeWidth="1.5" strokeLinecap="round" />
        {/* 신문 양끝을 쥔 앞발 */}
        <ellipse cx="9.5" cy="41" rx="3.8" ry="4.6" fill="#6B5548" stroke="#4A3B35" strokeWidth="1.2" />
        <ellipse cx="46.5" cy="41" rx="3.8" ry="4.6" fill="#6B5548" stroke="#4A3B35" strokeWidth="1.2" />
      </svg>
    </Link>
  );
}
