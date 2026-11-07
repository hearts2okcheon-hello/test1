import Link from "next/link";
import { Osori } from "./Osori";

/** 사장님 코드 입력 화면 오른쪽 위, 신문 읽는 오소리. 누르면 관리자 로그인으로 간다 */
export function AdminDoor({ href }: { href: string }) {
  return (
    <Link
      href={href}
      aria-label="옥천신문 관리자 로그인"
      className="relative flex size-14 items-center justify-center rounded-2xl border-2 border-line bg-card"
    >
      <Osori mood="basic" size={46} />
      <svg aria-hidden viewBox="0 0 34 24" className="absolute bottom-1 left-1/2 w-[34px] -translate-x-1/2 -rotate-3">
        <path d="M2 3 L17 5 L32 3 L32 21 L17 23 L2 21 Z" fill="#FFFFFF" stroke="var(--color-ink)" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M17 5 V23" stroke="var(--color-ink)" strokeWidth="1.2" />
        <path d="M5.5 8.5 L14 9.5 M5.5 12.5 L14 13.5 M5.5 16.5 L14 17.5 M20 9.5 L28.5 8.5 M20 13.5 L28.5 12.5 M20 17.5 L28.5 16.5" stroke="var(--color-muted)" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    </Link>
  );
}
