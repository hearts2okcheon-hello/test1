import { redirect } from "next/navigation";
import { OwnerCalendar } from "@/components/OwnerCalendar";
import { manageableStore } from "@/lib/owner";

export const dynamic = "force-dynamic";

/** 사장님 캘린더: 오늘부터 한 달, 날짜별 휴무·늦게 열기·일찍 닫기·외출 (ADR-014) */
export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ store?: string }> }) {
  const { store } = await searchParams;
  const detail = await manageableStore(store);
  if (!detail) redirect("/owner");

  return (
    <main className="flex flex-1 flex-col gap-4 px-[18px] pt-4 pb-6">
      <OwnerCalendar storeId={detail.store.store_id} storeName={detail.store.name} hours={detail.store.regular_hours} closures={detail.closures} plans={detail.plans} />
    </main>
  );
}
