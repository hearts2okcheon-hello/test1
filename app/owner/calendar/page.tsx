import { redirect } from "next/navigation";
import { OwnerCalendar } from "@/components/OwnerCalendar";
import { manageableStore } from "@/lib/owner";

export const dynamic = "force-dynamic";

/** 가게 캘린더: 휴무·늦게 열기·일찍 닫기·외출을 기간으로 넣고, 고치고, 지운다 (ADR-015) */
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
