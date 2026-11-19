import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** 임시휴무는 가게 캘린더로 옮겼다 (ADR-015). 예전 주소로 들어오면 캘린더로 보낸다 */
export default async function ClosurePage({ searchParams }: { searchParams: Promise<{ store?: string }> }) {
  const { store } = await searchParams;
  redirect(store ? `/owner/calendar?store=${encodeURIComponent(store)}` : "/owner/calendar");
}
