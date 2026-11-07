import { redirect } from "next/navigation";
import { ClosureWizard } from "@/components/ClosureWizard";
import { manageableStore } from "@/lib/owner";

export const dynamic = "force-dynamic";

/** 임시휴무: 1) 달력에서 기간 고르기 2) 사유 쓰기 */
export default async function ClosurePage({ searchParams }: { searchParams: Promise<{ store?: string }> }) {
  const { store } = await searchParams;
  const detail = await manageableStore(store);
  if (!detail) redirect("/owner");

  return (
    <main className="flex flex-1 flex-col gap-4 px-[18px] pt-4 pb-6">
      <ClosureWizard storeId={detail.store.store_id} storeName={detail.store.name} />
    </main>
  );
}
