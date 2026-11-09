import { BottomNav } from "@/components/BottomNav";
import { PageView } from "@/components/PageView";
import { StoreCard } from "@/components/StoreCard";
import { createClient } from "@/lib/supabase/server";
import type { StoreSign } from "@/lib/types";
import { HomeReport } from "../HomeReport";

export const dynamic = "force-dynamic";

/** 동네 가게: 오늘 우리 동네 가게 목록과 이웃 제보 */
export default async function StoresPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_store_signs");
  const stores = (data ?? []) as StoreSign[];
  // 영업중이거나 오늘 소식이 있는 가게만 위에 띄운다. 나머지는 접어 두어 찾아갈 수는 있게 한다
  const listed = stores.filter((s) => s.listed);
  const others = stores.filter((s) => !s.listed);

  return (
    <>
      <main className="flex flex-1 flex-col gap-5 px-[18px] pt-5 pb-5">
        <section className="flex flex-col gap-2.5">
          <div className="flex items-baseline gap-2">
            <h1 className="flex-1 font-display text-[24px] font-normal">오늘 우리 동네 가게</h1>
            <span className="text-[13px] text-muted">눌러서 자세히</span>
          </div>
          {error ? (
            <p className="rounded-[22px] border-2 border-dashed border-line px-4 py-3 text-sm text-muted">
              가게 소식을 불러오지 못했어요. 잠시 뒤 새로고침 해 주세요.
            </p>
          ) : stores.length === 0 ? (
            <p className="rounded-[22px] border-2 border-dashed border-line px-4 py-3 text-sm text-muted">아직 등록된 가게가 없어요.</p>
          ) : (
            <>
              {listed.length === 0 && (
                <p className="rounded-[22px] border-2 border-dashed border-line px-4 py-3 text-sm text-muted">지금은 영업시간인 가게가 없어요.</p>
              )}
              {listed.map((s) => <StoreCard key={s.store_id} store={s} />)}
              {others.length > 0 && (
                <details className="group flex flex-col">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-center rounded-[18px] border-2 border-line bg-card text-sm font-bold text-muted">
                    <span className="group-open:hidden">지금 문 닫은 가게 {others.length}곳 보기</span>
                    <span className="hidden group-open:inline">문 닫은 가게 접기</span>
                  </summary>
                  <div className="mt-2.5 flex flex-col gap-2.5">
                    {others.map((s) => <StoreCard key={s.store_id} store={s} />)}
                  </div>
                </details>
              )}
            </>
          )}
        </section>

        <HomeReport stores={stores.map((s) => ({ store_id: s.store_id, name: s.name }))} />
      </main>

      <BottomNav />
      <PageView />
    </>
  );
}
