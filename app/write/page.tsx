import { BackButton } from "@/components/BackButton";
import { BottomNav } from "@/components/BottomNav";
import { createClient } from "@/lib/supabase/server";
import type { StoreSign } from "@/lib/types";
import { WriteChoices } from "./WriteChoices";

export const dynamic = "force-dynamic";

export default async function WritePage() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_store_signs");
  const stores = ((data ?? []) as StoreSign[]).map((s) => ({ store_id: s.store_id, name: s.name }));

  return (
    <>
      <main className="flex flex-1 flex-col gap-4 px-5 pt-5 pb-8">
        <header className="flex items-center gap-2.5">
          <BackButton />
          <h1 className="font-display text-[26px] font-normal">소식 쓰기</h1>
        </header>
        <WriteChoices stores={stores} />
      </main>
      <BottomNav />
    </>
  );
}
