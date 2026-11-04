import Link from "next/link";
import { Osori } from "@/components/Osori";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <Osori mood="curious" size={120} />
      <h1 className="font-display text-2xl font-normal">찾는 곳이 없어요</h1>
      <Link href="/" className="min-h-12 rounded-2xl border-2 border-line bg-card px-5 py-3 font-bold">
        마을방송으로 가기
      </Link>
    </main>
  );
}
