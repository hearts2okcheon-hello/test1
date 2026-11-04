import { Osori } from "@/components/Osori";

/** 서버에서 소식을 불러오는 동안 */
export default function Loading() {
  return (
    <main role="status" aria-live="polite" className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <Osori mood="move" size={110} className="ok-bob" />
      <p className="font-display text-xl">오늘 소식을 모으는 중이에요…</p>
    </main>
  );
}
