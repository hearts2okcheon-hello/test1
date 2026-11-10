import { LoadingGauge } from "@/components/LoadingGauge";

/** 서버에서 소식을 불러오는 동안 */
export default function Loading() {
  return (
    <main role="status" aria-live="polite" className="flex flex-1 flex-col items-center justify-center px-8">
      <span className="sr-only">오늘 소식을 모으고 있어요</span>
      <LoadingGauge />
    </main>
  );
}
